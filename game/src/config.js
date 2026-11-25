// Every tuning number, colour, recipe and layout rect in one place.
// The playfield is a fixed 1280x480 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 480 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** One shift lasts this long, in seconds. */
export const SHIFT_SECONDS = 150;

/** At most this many order tickets on the board at once. */
export const MAX_ORDERS = 3;

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift is kept between visits (this browser only). */
export const BEST_KEY = 'sizzle-and-serve.best';

export const PALETTE = {
  backdrop: '#17100a',
  wall: '#2b1d12',
  wallTrim: '#3a2a1a',
  floor: '#241812',
  counter: '#8a5a33',
  counterEdge: '#6e4525',
  steel: '#9aa5ad',
  steelDark: '#6b7680',
  board: '#f5e9c8',
  boardInk: '#3a2a1a',
  ticket: '#fff7dd',
  ticketHot: '#ffe9a8',
  plate: '#f4f1e6',
  plateRim: '#c9c2ab',
  text: '#f7ead0',
  muted: '#c9a878',
  ink: '#241812',
  gold: '#f2c94c',
  green: '#7bc96f',
  red: '#e5534b',
  orange: '#f08c2e',
  flame: '#ff9d2e',
  flameHot: '#ffd23e',
  water: '#7ec8e3',
  hand: '#ffd9a0',
};

// Ingredients: id, label, key, colour, what it needs before it can be plated.
export const INGREDIENTS = [
  { id: 'bun', label: 'Bun', key: '1', color: '#e8b06a', prep: 'ready' },
  { id: 'patty', label: 'Patty', key: '2', color: '#b06a4a', prep: 'grill' },
  { id: 'lettuce', label: 'Lettuce', key: '3', color: '#7bc96f', prep: 'chop' },
  { id: 'tomato', label: 'Tomato', key: '4', color: '#e5534b', prep: 'chop' },
  { id: 'cheese', label: 'Cheese', key: '5', color: '#f2c94c', prep: 'ready' },
  { id: 'pasta', label: 'Pasta', key: '6', color: '#f5e9c8', prep: 'pot' },
  { id: 'sauce', label: 'Sauce', key: '7', color: '#c0392b', prep: 'ready' },
];

// The cooked/chopped form an ingredient takes after its station.
export const PREPPED = {
  patty: 'patty-grilled',
  lettuce: 'lettuce-chopped',
  tomato: 'tomato-chopped',
  pasta: 'pasta-boiled',
};

// Display names for prepared items.
export const PREPPED_LABEL = {
  'patty-grilled': 'Grilled patty',
  'lettuce-chopped': 'Chopped lettuce',
  'tomato-chopped': 'Chopped tomato',
  'pasta-boiled': 'Boiled pasta',
};

// Stations: id, label, the ingredient prep it handles, cook seconds, burn seconds.
export const STATIONS = {
  grill: { label: 'GRILL', prep: 'grill', cookSeconds: 6, burnSeconds: 12, slots: 2 },
  pot: { label: 'POT', prep: 'pot', cookSeconds: 5, burnSeconds: 13, slots: 1 },
  board: { label: 'CHOP BOARD', prep: 'chop', cookSeconds: 2, burnSeconds: 999, slots: 2 },
};

// Recipes: the dish name, its price, and the prepared items it needs.
export const RECIPES = [
  {
    id: 'sunset-burger',
    name: 'Sunset Burger',
    price: 14,
    needs: ['bun', 'patty-grilled', 'lettuce-chopped', 'tomato-chopped'],
  },
  {
    id: 'ember-pasta',
    name: 'Ember Pasta',
    price: 16,
    needs: ['pasta-boiled', 'sauce', 'cheese'],
  },
  {
    id: 'garden-stack',
    name: 'Garden Stack',
    price: 12,
    needs: ['bun', 'lettuce-chopped', 'tomato-chopped', 'cheese'],
  },
  {
    id: 'double-sizzle',
    name: 'Double Sizzle',
    price: 20,
    needs: ['bun', 'patty-grilled', 'patty-grilled', 'cheese'],
  },
];

// Customers who order, in rotation.
export const CUSTOMERS = ['Maya', 'Theo', 'Priya', 'Jonas', 'Lulu', 'Omar', 'Nia', 'Felix'];

// Layout rectangles, in logical pixels.
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 52 },
  board: { x: 12, y: 60, w: 292, h: 232 },
  stations: { x: 316, y: 60, w: 648, h: 232 },
  serve: { x: 976, y: 60, w: 292, h: 232 },
  plate: { x: 12, y: 300, w: 360, h: 168 },
  counter: { x: 384, y: 300, w: 884, h: 168 },
};
