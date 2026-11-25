// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and game over. Clicks land on bins, stations, the plate, tickets, the
// bell and the trash through one hit-test, so mouse and keyboard play the same
// rules the screenshot scenes use.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, FIELD, INGREDIENTS, LAYOUT, STEP } from './config.js';
import { createRandom } from './random.js';
import { binRect, createWorld, EVENT_OVER, EVENT_SERVED, EVENT_WALKED_OUT, slotRect, stationRect, ticketRect } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_SERVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const mouse = { x: -100, y: -100 };

function toLogical(px, py) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (px / rect.width) * FIELD.width,
    y: (py / rect.height) * FIELD.height,
  };
}

canvas.addEventListener('pointermove', (event) => {
  const p = toLogical(event.clientX - canvas.getBoundingClientRect().left, event.clientY - canvas.getBoundingClientRect().top);
  mouse.x = p.x;
  mouse.y = p.y;
});

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function inside(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

/** Map one click to the world action it means, or null when it hits nothing. */
function actionForClick(point, state) {
  // Trash button, bottom-right of the plate panel.
  const p = LAYOUT.plate;
  if (inside(point, { x: p.x + p.w - 52, y: p.y + p.h - 40, w: 40, h: 28 })) {
    return { kind: 'trash' };
  }
  // The plate itself.
  if (inside(point, { x: p.x, y: p.y, w: p.w, h: p.h })) return { kind: 'plate' };
  // Ingredient bins.
  for (let i = 0; i < INGREDIENTS.length; i += 1) {
    if (inside(point, binRect(i))) return { kind: 'pick', item: INGREDIENTS[i].id };
  }
  // Station slots (take a done item out, or put the held raw one in).
  for (const stationId of Object.keys(state.stations)) {
    for (let i = 0; i < state.stations[stationId].length; i += 1) {
      if (inside(point, slotRect(stationId, i))) return { kind: 'station', station: stationId, slot: i };
    }
    if (inside(point, stationRect(stationId))) return null;
  }
  // Order tickets: serve that order when the plate matches it.
  for (let i = 0; i < state.orders.length; i += 1) {
    if (inside(point, ticketRect(i))) return { kind: 'serveOrder', orderId: state.orders[i].id };
  }
  // The service bell: serve the first order the plate matches.
  if (inside(point, LAYOUT.serve)) return { kind: 'serve' };
  return null;
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    const ready = world.findOrderForPlate();
    renderer.draw(world.state, scene.screen, scene.best, {
      serveReadyId: ready ? ready.id : null,
      mouse: null,
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, toLogical);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. Shift ${Math.floor(world.state.shiftLeft / 60)} minutes.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.coins > best) {
      best = world.state.coins;
      saveBest(best);
    }
    announce(`Shift over. Earned $${world.state.coins}. Served ${world.state.served}. Best $${best}.`);
  }

  function stepWorld() {
    const events = world.step(STEP);
    if (events & EVENT_SERVED) audio.served();
    else if (events & EVENT_WALKED_OUT) audio.walkout();
    if (events & EVENT_OVER) endGame();
    const cooking = Object.values(world.state.stations).some((slots) => slots.some((s) => s.item && !s.done));
    if (cooking) audio.sizzleStart();
    else audio.sizzleStop();
  }

  function handleClicks() {
    if (screen !== SCREEN_PLAY) return;
    for (const point of input.takeClicks()) {
      const action = actionForClick(point, world.state);
      if (!action) continue;
      audio.unlock();
      const before = world.state.hand;
      if (world.applyAction(action)) {
        if (action.kind === 'pick') audio.pickup();
        else if (action.kind === 'plate') audio.place();
        else if (action.kind === 'station' && before !== world.state.hand) audio.place();
        else audio.click();
      } else {
        audio.bad();
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    for (const item of input.takeKeys()) {
      if (screen === SCREEN_PLAY) world.applyAction({ kind: 'pick', item });
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.sizzleStop();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_SERVE && screen === SCREEN_PLAY) {
      if (world.applyAction({ kind: 'serve' })) audio.ding();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClicks();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        if (screen === SCREEN_TITLE) world.step(STEP);
        else stepWorld();
        accumulator -= STEP;
        if (world.state.over && screen === SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
    }
    const ready = screen === SCREEN_PLAY ? world.findOrderForPlate() : null;
    renderer.draw(world.state, screen, best, {
      serveReadyId: ready ? ready.id : null,
      mouse,
    });
  }

  // Leaving the tab pauses a running game rather than letting orders rot unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.sizzleStop();
      announce('Paused.');
    }
  });

  // A handle for play-testing from the console or a screenshot driver.
  window.__sizzle = {
    state: () => ({
      screen,
      time: world.state.time,
      shiftLeft: world.state.shiftLeft,
      coins: world.state.coins,
      served: world.state.served,
      hand: world.state.hand,
      plate: [...world.state.plate],
      orders: world.state.orders.map((o) => o.recipe.name),
      over: world.state.over,
    }),
    act: (action) => world.applyAction(action),
    start: () => startGame(),
  };

  announce('Sizzle and Serve. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
