// The kitchen's state and rules: orders, stations, the hand, the plate, the
// shift timer and the score. No drawing here; render.js paints this state.
// Every action the player (or the screenshot autopilot) can take goes through
// applyAction, so a click, a key and a staged scene all play by the same rules.

import {
  CUSTOMERS,
  INGREDIENTS,
  LAYOUT,
  MAX_ORDERS,
  PREPPED,
  PREPPED_LABEL,
  RECIPES,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { pick } from './random.js';

export const EVENT_SERVED = 1;
export const EVENT_WALKED_OUT = 2;
export const EVENT_OVER = 4;
export const EVENT_BURNT = 8;

/** Patience for a new order, in seconds; it shrinks as the shift goes on. */
function patienceFor(elapsed) {
  return Math.max(30, 46 - Math.floor(elapsed / 30) * 4);
}

/** Seconds until the next order spawns; it shrinks as the shift goes on. */
function spawnGapFor(elapsed) {
  return Math.max(6, 14 - Math.floor(elapsed / 30) * 2);
}

function stationSlots(stationId) {
  const slots = [];
  for (let i = 0; i < STATIONS[stationId].slots; i += 1) {
    slots.push({ item: null, progress: 0, done: false, burnt: false });
  }
  return slots;
}

export function createWorld(random) {
  const state = {
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    walkedOut: 0,
    combo: 0,
    bestCombo: 0,
    orders: [],
    hand: null,
    plate: [],
    stations: {
      grill: stationSlots('grill'),
      pot: stationSlots('pot'),
      board: stationSlots('board'),
    },
    nextSpawnIn: 0,
    customerIndex: 0,
    message: '',
    messageUntil: 0,
    shakeUntil: 0,
    serveFlashUntil: 0,
    over: false,
  };

  function spawnOrder() {
    // Early orders are the easy recipes; the double burger joins after a minute.
    const pool = state.time < 60 ? RECIPES.slice(0, 3) : RECIPES;
    const recipe = pick(random, pool);
    const customer = CUSTOMERS[state.customerIndex % CUSTOMERS.length];
    state.customerIndex += 1;
    state.orders.push({
      id: state.orders.length ? Math.max(...state.orders.map((o) => o.id)) + 1 : 1,
      customer,
      recipe,
      patience: patienceFor(state.time),
      patienceMax: patienceFor(state.time),
    });
  }

  function reset() {
    state.time = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.coins = 0;
    state.served = 0;
    state.walkedOut = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.orders = [];
    state.hand = null;
    state.plate = [];
    state.stations.grill = stationSlots('grill');
    state.stations.pot = stationSlots('pot');
    state.stations.board = stationSlots('board');
    state.nextSpawnIn = 0;
    state.customerIndex = 0;
    state.message = '';
    state.messageUntil = 0;
    state.shakeUntil = 0;
    state.serveFlashUntil = 0;
    state.over = false;
    spawnOrder();
    state.nextSpawnIn = 8;
  }

  function say(text, seconds = 2) {
    state.message = text;
    state.messageUntil = state.time + seconds;
  }

  function findOrderForPlate() {
    for (const order of state.orders) {
      if (plateMatches(order.recipe.needs, state.plate)) return order;
    }
    return null;
  }

  function serve(order) {
    const tip = Math.round((order.patience / order.patienceMax) * 6);
    const earned = order.recipe.price + tip;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.plate = [];
    state.orders = state.orders.filter((o) => o.id !== order.id);
    state.serveFlashUntil = state.time + 0.6;
    say(`Served ${order.recipe.name} to ${order.customer}! +$${earned} (tip $${tip})`, 2.5);
    return EVENT_SERVED;
  }

  /**
   * One player action. `action` is { kind: 'pick', item } (take from a bin),
   * { kind: 'station', station, slot } (put the held item in, or take a done one
   * out), { kind: 'plate' } (add the held item to the plate), { kind: 'serve' }
   * (serve the first order the plate matches), { kind: 'serveOrder', orderId },
   * { kind: 'trash' } (throw the held item, or clear the plate), or
   * { kind: 'clearPlate' }. Returns true when the action did something.
   */
  function applyAction(action) {
    if (state.over) return false;
    if (action.kind === 'pick') {
      const def = INGREDIENTS.find((i) => i.id === action.item);
      if (!def || state.hand) return false;
      state.hand = def.id;
      return true;
    }
    if (action.kind === 'station') {
      const slots = state.stations[action.station];
      if (!slots) return false;
      const slot = slots[action.slot ?? 0];
      if (!slot) return false;
      if (slot.item && slot.burnt) {
        // Burnt food goes straight in the bin when clicked.
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        slot.burnt = false;
        say('Burnt! Tossed it — watch the grill.', 1.8);
        return true;
      }
      if (slot.item && slot.done) {
        if (state.hand) return false;
        state.hand = PREPPED[slot.item];
        slot.item = null;
        slot.progress = 0;
        slot.done = false;
        slot.burnt = false;
        return true;
      }
      if (slot.item) return false; // still cooking
      if (!state.hand) return false;
      const def = INGREDIENTS.find((i) => i.id === state.hand);
      if (!def || def.prep !== STATIONS[action.station].prep) return false;
      slot.item = state.hand;
      slot.progress = 0;
      slot.done = false;
      slot.burnt = false;
      state.hand = null;
      return true;
    }
    if (action.kind === 'plate') {
      if (!state.hand) return false;
      const def = INGREDIENTS.find((i) => i.id === state.hand);
      if (def) {
        // A raw ingredient straight from a bin plates only if it needs no prep.
        if (def.prep !== 'ready') return false;
        state.plate.push(state.hand);
      } else if (PREPPED_LABEL[state.hand]) {
        // A prepared item, fresh out of its station.
        state.plate.push(state.hand);
      } else {
        return false;
      }
      state.hand = null;
      return true;
    }
    if (action.kind === 'serve') {
      const order = findOrderForPlate();
      if (!order) {
        state.shakeUntil = state.time + 0.4;
        say('The plate does not match any order yet.', 1.6);
        return false;
      }
      serve(order);
      return true;
    }
    if (action.kind === 'serveOrder') {
      const order = state.orders.find((o) => o.id === action.orderId);
      if (!order || !plateMatches(order.recipe.needs, state.plate)) {
        state.shakeUntil = state.time + 0.4;
        say('The plate does not match that order.', 1.6);
        return false;
      }
      serve(order);
      return true;
    }
    if (action.kind === 'trash') {
      if (state.hand) {
        state.hand = null;
        return true;
      }
      if (state.plate.length) {
        state.plate = [];
        say('Plate cleared.', 1.2);
        return true;
      }
      return false;
    }
    if (action.kind === 'clearPlate') {
      if (!state.plate.length) return false;
      state.plate = [];
      return true;
    }
    return false;
  }

  /** Advance the world by `step` seconds. Returns an event bitmask. */
  function step(stepSeconds) {
    if (state.over) return 0;
    let events = 0;
    state.time += stepSeconds;
    state.shiftLeft = Math.max(0, SHIFT_SECONDS - state.time);

    // Stations cook.
    for (const stationId of Object.keys(state.stations)) {
      const def = STATIONS[stationId];
      for (const slot of state.stations[stationId]) {
        if (!slot.item) continue;
        slot.progress += stepSeconds;
        if (slot.progress >= def.cookSeconds) slot.done = true;
        if (def.burnSeconds < 900 && slot.progress >= def.burnSeconds) slot.burnt = true;
      }
    }

    // Orders lose patience; an empty one walks out.
    for (const order of [...state.orders]) {
      order.patience -= stepSeconds;
      if (order.patience <= 0) {
        state.orders = state.orders.filter((o) => o.id !== order.id);
        state.walkedOut += 1;
        state.combo = 0;
        say(`${order.customer} walked out! The ${order.recipe.name} was too slow.`, 2.5);
        events |= EVENT_WALKED_OUT;
      }
    }

    // New orders arrive while the shift runs.
    if (state.shiftLeft > 0) {
      state.nextSpawnIn -= stepSeconds;
      if (state.nextSpawnIn <= 0 && state.orders.length < MAX_ORDERS) {
        spawnOrder();
        state.nextSpawnIn = spawnGapFor(state.time);
      }
    }

    if (state.shiftLeft <= 0 && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, applyAction, findOrderForPlate, say };
}

/** True when `plate` holds exactly the items `needs` asks for, any order. */
export function plateMatches(needs, plate) {
  if (needs.length !== plate.length) return false;
  const rest = [...plate];
  for (const need of needs) {
    const index = rest.indexOf(need);
    if (index === -1) return false;
    rest.splice(index, 1);
  }
  return true;
}

/** Human label for an item id, raw or prepared. */
export function itemLabel(id) {
  if (PREPPED_LABEL[id]) return PREPPED_LABEL[id];
  const def = INGREDIENTS.find((i) => i.id === id);
  return def ? def.label : id;
}

/** Colour for an item id, raw or prepared. */
export function itemColor(id) {
  const base = id.replace('-grilled', '').replace('-chopped', '').replace('-boiled', '');
  const def = INGREDIENTS.find((i) => i.id === base);
  if (!def) return '#cccccc';
  if (id === 'patty-grilled') return '#7a4a2e';
  if (id === 'pasta-boiled') return '#f7e9b8';
  return def.color;
}

/** Layout helpers the renderer and input share. */
export function binRect(index) {
  const c = LAYOUT.counter;
  const w = (c.w - 16 * (INGREDIENTS.length + 1)) / INGREDIENTS.length;
  return { x: c.x + 16 + index * (w + 16), y: c.y + 34, w, h: 122 };
}

export function stationRect(stationId) {
  const s = LAYOUT.stations;
  const widths = { grill: 250, pot: 170, board: 196 };
  const xs = { grill: s.x + 8, pot: s.x + 266, board: s.x + 444 };
  return { x: xs[stationId], y: s.y + 30, w: widths[stationId], h: s.h - 44 };
}

export function slotRect(stationId, slotIndex) {
  const r = stationRect(stationId);
  const slots = STATIONS[stationId].slots;
  const w = (r.w - 12 * (slots + 1)) / slots;
  return { x: r.x + 12 + slotIndex * (w + 12), y: r.y + 44, w, h: 118 };
}

export function ticketRect(index) {
  const b = LAYOUT.board;
  return { x: b.x + 10, y: b.y + 34 + index * 66, w: b.w - 20, h: 60 };
}
