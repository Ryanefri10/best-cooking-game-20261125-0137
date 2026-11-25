// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by
// scripted actions (pick, cook, plate) through the same applyAction the player
// uses, so every frame is what a short game really looks like and the same seed
// always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Step the world `seconds` forward in fixed steps. */
function runFor(world, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP);
}

/** Step until `ready()` is true, or `seconds` pass. */
function waitUntil(world, seconds, ready) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (ready()) return true;
    world.step(STEP);
  }
  return ready();
}

function stationOf(item) {
  if (item === 'patty') return 'grill';
  if (item === 'pasta') return 'pot';
  if (item === 'lettuce' || item === 'tomato') return 'board';
  return null;
}

function rawOf(need) {
  if (need === 'patty-grilled') return 'patty';
  if (need === 'pasta-boiled') return 'pasta';
  if (need === 'lettuce-chopped') return 'lettuce';
  if (need === 'tomato-chopped') return 'tomato';
  return need;
}

function slotHas(world, stationId, raw) {
  return world.state.stations[stationId].findIndex((s) => s.item === raw);
}

function takeDone(world, stationId) {
  const slots = world.state.stations[stationId];
  for (let i = 0; i < slots.length; i += 1) {
    if (slots[i].item && slots[i].done && !slots[i].burnt) {
      return world.applyAction({ kind: 'station', station: stationId, slot: i });
    }
  }
  return false;
}

/** Cook one `need` and put it on the plate. */
function cookNeed(world, need) {
  const raw = rawOf(need);
  const station = stationOf(raw);
  if (!station) {
    world.applyAction({ kind: 'pick', item: raw });
    world.applyAction({ kind: 'plate' });
    return;
  }
  world.applyAction({ kind: 'pick', item: raw });
  const slot = world.state.stations[station].findIndex((s) => !s.item);
  world.applyAction({ kind: 'station', station, slot: Math.max(0, slot) });
  waitUntil(world, 20, () => {
    const s = world.state.stations[station][Math.max(0, slot)];
    return s.done;
  });
  takeDone(world, station);
  world.applyAction({ kind: 'plate' });
}

/** The first need of `order` that the plate does not already hold. */
function missingNeed(order, plate) {
  const rest = [...plate];
  for (const need of order.recipe.needs) {
    const index = rest.indexOf(need);
    if (index === -1) return need;
    rest.splice(index, 1);
  }
  return null;
}

/** One greedy decision for the end-of-shift autopilot. */
function autoDecide(world) {
  const state = world.state;
  if (state.over) return;
  if (world.findOrderForPlate()) {
    world.applyAction({ kind: 'serve' });
    return;
  }
  if (state.hand) {
    const prepped = ['patty-grilled', 'pasta-boiled', 'lettuce-chopped', 'tomato-chopped'];
    if (prepped.includes(state.hand) || ['bun', 'cheese', 'sauce'].includes(state.hand)) {
      if (!world.applyAction({ kind: 'plate' })) world.applyAction({ kind: 'trash' });
      return;
    }
    const station = stationOf(state.hand);
    const slot = state.stations[station].findIndex((s) => !s.item);
    if (slot !== -1) {
      world.applyAction({ kind: 'station', station, slot });
      return;
    }
    world.applyAction({ kind: 'trash' });
    return;
  }
  for (const stationId of Object.keys(state.stations)) {
    if (takeDone(world, stationId)) return;
  }
  const order = state.orders[0];
  if (!order) return;
  // A plate that no order can use gets cleared before it blocks the next dish.
  const usable = state.orders.some((o) => {
    const rest = [...o.recipe.needs];
    for (const item of state.plate) {
      const i = rest.indexOf(item);
      if (i === -1) return false;
      rest.splice(i, 1);
    }
    return true;
  });
  if (state.plate.length && !usable) {
    world.applyAction({ kind: 'clearPlate' });
    return;
  }
  const need = missingNeed(order, state.plate);
  if (!need) return;
  const raw = rawOf(need);
  const station = stationOf(raw);
  if (station && slotHas(world, station, raw) !== -1) return; // already cooking
  world.applyAction({ kind: 'pick', item: raw });
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    runFor(world, 5);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-assembly: burger on the plate missing its tomato, pasta on the boil.
    cookNeed(world, 'patty-grilled');
    world.applyAction({ kind: 'pick', item: 'bun' });
    world.applyAction({ kind: 'plate' });
    cookNeed(world, 'lettuce-chopped');
    world.applyAction({ kind: 'pick', item: 'pasta' });
    world.applyAction({ kind: 'station', station: 'pot', slot: 0 });
    runFor(world, 3);
    world.applyAction({ kind: 'pick', item: 'tomato' });
    world.applyAction({ kind: 'station', station: 'board', slot: 0 });
    runFor(world, 1);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'serve') {
    // A finished dish, exactly matching the first order, bell ready to ring.
    const order = world.state.orders[0];
    for (const need of order.recipe.needs) cookNeed(world, need);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // end: play the whole shift with the greedy autopilot.
  for (let i = 0; i < 150 / 0.25 && !world.state.over; i += 1) {
    autoDecide(world);
    runFor(world, 0.25);
  }
  while (!world.state.over) runFor(world, 0.5);
  return { screen: SCREEN_OVER, best: world.state.coins };
}
