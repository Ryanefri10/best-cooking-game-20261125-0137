// Keyboard and pointer input. Held keys are read every frame; one-shot presses
// (start, serve, pause, restart, ingredient keys) are queued as actions and
// taken once by the loop, so a press between two frames is never lost or
// counted twice. Pointer clicks are queued with logical canvas coordinates.
import { INGREDIENTS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_RESTART = 8;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const SERVE = new Set(['KeyS']);

export function createInput(canvas, toLogical) {
  let actions = 0;
  const clicks = [];
  const keys = [];

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (/^Digit[1-7]$/.test(event.code) && !event.repeat) {
      const def = INGREDIENTS[Number(event.code.slice(5)) - 1];
      if (def) keys.push(def.id);
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    clicks.push(toLogical(event.clientX - rect.left, event.clientY - rect.top));
  });

  return {
    /** The one-shot action flags since the last call. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Ingredient ids queued by number keys since the last call. */
    takeKeys() {
      return keys.splice(0, keys.length);
    },
    /** Logical click points since the last call. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
