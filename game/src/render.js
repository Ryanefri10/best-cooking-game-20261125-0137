// Everything the player sees: the kitchen, the order board, the stations, the
// plate, the ingredient counter, the HUD and the title / pause / shift-over
// screens. Pure canvas drawing from the world state; no game rules here.
import {
  FIELD,
  FONT,
  INGREDIENTS,
  LAYOUT,
  PALETTE,
  SHIFT_SECONDS,
  STATIONS,
} from './config.js';
import { binRect, itemColor, itemLabel, slotRect, stationRect, ticketRect } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** One little vector icon for an ingredient id, centred at (x, y), radius r. */
export function drawIngredient(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  const c = itemColor(id);
  if (id === 'bun') {
    ctx.fillStyle = '#e8b06a';
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d99a4e';
    ctx.fillRect(-r, r * 0.1, r * 2, r * 0.22);
    ctx.fillStyle = '#fff3d6';
    for (const [sx, sy] of [[-0.45, -0.35], [0, -0.55], [0.45, -0.35]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'patty' || id === 'patty-grilled') {
    ctx.fillStyle = id === 'patty-grilled' ? '#6e3f24' : '#a85f3f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    for (const off of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(off * r, -r * 0.4);
      ctx.lineTo(off * r, r * 0.4);
      ctx.stroke();
    }
  } else if (id === 'lettuce' || id === 'lettuce-chopped') {
    ctx.fillStyle = '#7bc96f';
    if (id === 'lettuce') {
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.arc(i * r * 0.55, 0, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#4e9b43';
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, 0);
      ctx.quadraticCurveTo(0, -r * 0.4, r * 0.8, 0);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#7bc96f';
      ctx.lineWidth = Math.max(2, r * 0.16);
      for (const [x1, y1, x2, y2] of [[-0.7, -0.4, 0.7, -0.2], [-0.7, 0.1, 0.6, 0.3], [-0.5, 0.55, 0.5, 0.5]]) {
        ctx.beginPath();
        ctx.moveTo(x1 * r, y1 * r);
        ctx.lineTo(x2 * r, y2 * r);
        ctx.stroke();
      }
    }
  } else if (id === 'tomato' || id === 'tomato-chopped') {
    ctx.fillStyle = '#e5534b';
    if (id === 'tomato') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7bc96f';
      ctx.beginPath();
      ctx.arc(0, -r * 0.75, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, -Math.PI / 3.2, Math.PI / 3.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(0, -r * 0.7);
    ctx.lineTo(r, r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9a92c';
    for (const [hx, hy] of [[-0.3, 0.15], [0.25, 0.3], [0, -0.25]]) {
      ctx.beginPath();
      ctx.arc(hx * r, hy * r, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'pasta' || id === 'pasta-boiled') {
    ctx.strokeStyle = '#f5e9c8';
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, (i - 1) * r * 0.45);
      ctx.bezierCurveTo(-r * 0.3, (i - 1) * r * 0.45 - r * 0.4, r * 0.3, (i - 1) * r * 0.45 + r * 0.4, r * 0.8, (i - 1) * r * 0.45);
      ctx.stroke();
    }
    if (id === 'pasta-boiled') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = Math.max(1.5, r * 0.08);
      for (const sx of [-0.4, 0.1, 0.5]) {
        ctx.beginPath();
        ctx.moveTo(sx * r, -r * 0.9);
        ctx.quadraticCurveTo(sx * r + r * 0.15, -r * 1.25, sx * r, -r * 1.5);
        ctx.stroke();
      }
    }
  } else if (id === 'sauce') {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.3);
    ctx.bezierCurveTo(-r * 0.5, -r * 0.8, r * 0.4, -r * 0.9, r * 0.9, -r * 0.1);
    ctx.bezierCurveTo(r * 0.5, r * 0.6, -r * 0.4, r * 0.8, -r * 0.9, r * 0.3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.25, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function progressRing(ctx, x, y, r, fraction, color) {
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, fraction));
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * DPR);
    canvas.height = Math.round(h * DPR);
    ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function panel(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawHud(state, screen, best) {
    const h = LAYOUT.hud;
    ctx.fillStyle = '#241812';
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = PALETTE.flame;
    ctx.fillRect(h.x, h.y + h.h - 3, h.w, 3);
    text(ctx, 'SIZZLE & SERVE', 16, 27, 24, PALETTE.gold, 'left', '800');
    text(ctx, 'food truck rush', 218, 30, 13, PALETTE.muted, 'left', '600');
    const low = state.shiftLeft <= 30 && screen === SCREEN_PLAY;
    text(ctx, formatTime(state.shiftLeft), 640, 28, 30, low ? PALETTE.red : PALETTE.text, 'center', '800');
    text(ctx, 'SHIFT LEFT', 640, 46, 10, PALETTE.muted, 'center', '600');
    text(ctx, `COINS $${state.coins}`, 880, 27, 22, PALETTE.gold, 'right', '800');
    text(ctx, `Served ${state.served}  ·  Combo x${state.combo}  ·  Best $${best}`, 1264, 27, 15, PALETTE.text, 'right', '600');
  }

  function drawBoard(state, serveReadyId) {
    const b = LAYOUT.board;
    panel(b.x, b.y, b.w, b.h, PALETTE.board, '#d9c48a');
    text(ctx, 'ORDER BOARD', b.x + 14, b.y + 18, 15, PALETTE.boardInk, 'left', '800');
    text(ctx, `${state.orders.length}/${3} tickets`, b.x + b.w - 14, b.y + 18, 11, '#8a7648', 'right', '600');
    if (!state.orders.length) {
      text(ctx, 'No orders — take a breath, chef.', b.x + b.w / 2, b.y + 110, 14, '#8a7648', 'center', '600');
      return;
    }
    state.orders.forEach((order, index) => {
      const r = ticketRect(index);
      const ready = serveReadyId === order.id;
      const frac = Math.max(0, order.patience / order.patienceMax);
      ctx.fillStyle = ready ? PALETTE.ticketHot : PALETTE.ticket;
      roundRect(ctx, r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      if (ready) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? PALETTE.orange : PALETTE.red;
      roundRect(ctx, r.x + 8, r.y + r.h - 10, (r.w - 16) * frac, 5, 2.5);
      ctx.fill();
      text(ctx, order.customer, r.x + 10, r.y + 14, 13, PALETTE.boardInk, 'left', '800');
      text(ctx, `$${order.recipe.price}`, r.x + r.w - 10, r.y + 14, 13, '#7a5c14', 'right', '800');
      text(ctx, order.recipe.name, r.x + 10, r.y + 32, 15, PALETTE.boardInk, 'left', '700');
      order.recipe.needs.forEach((need, i) => {
        drawIngredient(ctx, need, r.x + 24 + i * 30, r.y + 48, 9);
      });
      if (ready) text(ctx, 'READY ✓', r.x + r.w - 10, r.y + 48, 12, '#2e7d32', 'right', '800');
    });
  }

  function drawStations(state) {
    const s = LAYOUT.stations;
    panel(s.x, s.y, s.w, s.h, PALETTE.wall, PALETTE.wallTrim);
    text(ctx, 'KITCHEN', s.x + 14, s.y + 18, 15, PALETTE.text, 'left', '800');
    text(ctx, 'click a station to cook · click again to take it out', s.x + s.w - 14, s.y + 18, 11, PALETTE.muted, 'right', '600');
    for (const stationId of Object.keys(STATIONS)) {
      const r = stationRect(stationId);
      const def = STATIONS[stationId];
      panel(r.x, r.y, r.w, r.h, '#33241a', '#4a3423');
      text(ctx, def.label, r.x + 12, r.y + 16, 13, PALETTE.text, 'left', '800');
      if (stationId === 'grill') {
        // Flames under the grill slots.
        ctx.fillStyle = PALETTE.flame;
        for (let i = 0; i < 2; i += 1) {
          const sr = slotRect('grill', i);
          for (let f = 0; f < 3; f += 1) {
            ctx.beginPath();
            ctx.moveTo(sr.x + 14 + f * 22, sr.y + sr.h - 6);
            ctx.quadraticCurveTo(sr.x + 20 + f * 22, sr.y + sr.h - 26, sr.x + 26 + f * 22, sr.y + sr.h - 6);
            ctx.fill();
          }
        }
      }
      if (stationId === 'pot') {
        ctx.fillStyle = PALETTE.water;
        const sr = slotRect('pot', 0);
        roundRect(ctx, sr.x + 6, sr.y + sr.h - 26, sr.w - 12, 20, 8);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        for (const [bx, by] of [[0.3, 0.72], [0.55, 0.78], [0.75, 0.7]]) {
          ctx.beginPath();
          ctx.arc(sr.x + sr.w * bx, sr.y + sr.h * by, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      def.slots && state.stations[stationId].forEach((slot, slotIndex) => {
        const sr = slotRect(stationId, slotIndex);
        ctx.strokeStyle = slot.item ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.setLineDash(slot.item ? [] : [5, 5]);
        roundRect(ctx, sr.x, sr.y, sr.w, sr.h, 10);
        ctx.stroke();
        ctx.setLineDash([]);
        if (!slot.item) {
          text(ctx, stationId === 'grill' ? 'raw patty' : stationId === 'pot' ? 'dry pasta' : 'lettuce / tomato', sr.x + sr.w / 2, sr.y + sr.h / 2, 11, PALETTE.muted, 'center', '600');
          return;
        }
        drawIngredient(ctx, slot.item, sr.x + sr.w / 2, sr.y + sr.h / 2 - 6, Math.min(26, sr.w * 0.28));
        const frac = Math.min(1, slot.progress / def.cookSeconds);
        progressRing(ctx, sr.x + sr.w - 20, sr.y + 20, 11, frac, slot.burnt ? PALETTE.red : slot.done ? PALETTE.green : PALETTE.gold);
        text(ctx, slot.burnt ? 'BURNT!' : slot.done ? 'DONE ✓' : `${Math.ceil(def.cookSeconds - slot.progress)}s`, sr.x + sr.w / 2, sr.y + sr.h - 14, 12, slot.burnt ? PALETTE.red : slot.done ? PALETTE.green : PALETTE.text, 'center', '800');
      });
    }
  }

  function drawServe(state, serveReadyId) {
    const v = LAYOUT.serve;
    const flash = state.time < state.serveFlashUntil;
    panel(v.x, v.y, v.w, v.h, flash ? '#3d2c12' : PALETTE.wall, PALETTE.wallTrim);
    text(ctx, 'SERVICE WINDOW', v.x + 14, v.y + 18, 15, PALETTE.text, 'left', '800');
    // The bell.
    const bx = v.x + v.w / 2;
    const by = v.y + 92;
    ctx.fillStyle = serveReadyId ? PALETTE.gold : PALETTE.steel;
    ctx.beginPath();
    ctx.arc(bx, by, 34, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(bx - 38, by - 2, 76, 8);
    ctx.fillStyle = serveReadyId ? PALETTE.flameHot : PALETTE.steelDark;
    ctx.beginPath();
    ctx.arc(bx, by - 38, 7, 0, Math.PI * 2);
    ctx.fill();
    if (serveReadyId) {
      ctx.strokeStyle = 'rgba(242,201,76,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by - 6, 52, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, 'RING THE BELL!', bx, by + 58, 16, PALETTE.gold, 'center', '800');
      text(ctx, 'plate matches an order — click its ticket', bx, by + 80, 12, PALETTE.text, 'center', '600');
    } else {
      text(ctx, 'Serve a matching plate', bx, by + 58, 13, PALETTE.muted, 'center', '600');
      text(ctx, 'to ring the bell', bx, by + 78, 12, PALETTE.muted, 'center', '600');
    }
    text(ctx, `Walked out: ${state.walkedOut}`, v.x + 14, v.y + v.h - 16, 12, PALETTE.muted, 'left', '600');
    text(ctx, 'Tip = patience left', v.x + v.w - 14, v.y + v.h - 16, 12, PALETTE.muted, 'right', '600');
  }

  function drawPlate(state) {
    const p = LAYOUT.plate;
    const shake = state.time < state.shakeUntil ? Math.sin(state.time * 60) * 3 : 0;
    panel(p.x, p.y, p.w, p.h, PALETTE.counter, PALETTE.counterEdge);
    text(ctx, 'YOUR PLATE', p.x + 14, p.y + 18, 15, '#ffe9c4', 'left', '800');
    text(ctx, 'click to add · X to clear', p.x + p.w - 14, p.y + 18, 11, '#d9b98a', 'right', '600');
    // The plate itself.
    const cx = p.x + 150 + shake;
    const cy = p.y + 96;
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 105, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.plateRim;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e6e0cb';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 78, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!state.plate.length) {
      text(ctx, 'empty — build a dish here', cx, cy, 13, '#9a8f74', 'center', '600');
    } else {
      // Stack the plated items so the dish reads as one pile.
      state.plate.forEach((item, i) => {
        const y = cy - 26 + i * 13;
        drawIngredient(ctx, item, cx + (i % 2 === 0 ? -14 : 14), y, 20);
      });
      text(ctx, state.plate.map(itemLabel).join(' + '), cx, cy + 62, 11, '#ffe9c4', 'center', '600');
    }
    // Trash button: a little bin drawn from rectangles.
    const tx = p.x + p.w - 52;
    const ty = p.y + p.h - 40;
    ctx.fillStyle = '#5a2e22';
    roundRect(ctx, tx, ty, 40, 28, 7);
    ctx.fill();
    ctx.fillStyle = '#ffd9c4';
    ctx.fillRect(tx + 12, ty + 9, 16, 3);
    ctx.fillRect(tx + 13, ty + 13, 14, 11);
    ctx.fillRect(tx + 18, ty + 6, 6, 3);
    text(ctx, 'TRASH', p.x + p.w - 32, p.y + p.h - 12, 8, '#d9b98a', 'center', '600');
  }

  function drawCounter(state) {
    const c = LAYOUT.counter;
    panel(c.x, c.y, c.w, c.h, PALETTE.counter, PALETTE.counterEdge);
    text(ctx, 'INGREDIENT COUNTER', c.x + 14, c.y + 18, 15, '#ffe9c4', 'left', '800');
    text(ctx, 'click a bin or press 1–7 · hand holds one item', c.x + c.w - 14, c.y + 18, 11, '#d9b98a', 'right', '600');
    INGREDIENTS.forEach((def, index) => {
      const r = binRect(index);
      const held = state.hand === def.id;
      ctx.fillStyle = held ? '#a9713f' : '#6e4525';
      roundRect(ctx, r.x, r.y, r.w, r.h, 10);
      ctx.fill();
      if (held) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      drawIngredient(ctx, def.id, r.x + r.w / 2, r.y + 44, 26);
      text(ctx, def.label, r.x + r.w / 2, r.y + 88, 13, '#ffe9c4', 'center', '700');
      text(ctx, def.prep === 'ready' ? 'ready' : def.prep === 'grill' ? '→ grill' : def.prep === 'pot' ? '→ pot' : '→ chop', r.x + r.w / 2, r.y + 106, 10, '#d9b98a', 'center', '600');
      ctx.fillStyle = '#3a2413';
      ctx.beginPath();
      ctx.arc(r.x + r.w - 14, r.y + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, def.key, r.x + r.w - 14, r.y + 15, 11, '#ffe9c4', 'center', '800');
    });
  }

  function drawHand(state, mouse) {
    if (!state.hand || !mouse) return;
    ctx.save();
    ctx.globalAlpha = 0.95;
    drawIngredient(ctx, state.hand, mouse.x, mouse.y - 18, 18);
    ctx.restore();
    text(ctx, itemLabel(state.hand), mouse.x, mouse.y - 44, 12, PALETTE.text, 'center', '700');
  }

  function drawMessage(state) {
    if (!state.message || state.time > state.messageUntil) return;
    const msg = state.message;
    ctx.font = `700 15px ${FONT}`;
    const w = ctx.measureText(msg).width + 32;
    ctx.fillStyle = 'rgba(23,16,10,0.88)';
    roundRect(ctx, 640 - w / 2, 60, w, 34, 17);
    ctx.fill();
    text(ctx, msg, 640, 78, 15, PALETTE.text, 'center', '700');
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(23,16,10,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'SIZZLE & SERVE', 640, 120, 64, PALETTE.gold, 'center', '800');
    text(ctx, '— FOOD TRUCK RUSH —', 640, 168, 20, PALETTE.text, 'center', '700');
    text(ctx, 'Orders land on the board. Cook each ingredient at its station,', 640, 218, 17, PALETTE.text, 'center', '600');
    text(ctx, 'build the dish on your plate, and ring the bell before patience runs out.', 640, 244, 17, PALETTE.text, 'center', '600');
    text(ctx, '1–7 pick ingredients · click stations, plate & tickets · SPACE serves · P pauses', 640, 284, 15, PALETTE.muted, 'center', '600');
    text(ctx, `Shift: ${formatTime(SHIFT_SECONDS)}  ·  Tips grow with patience  ·  Burnt food goes in the bin`, 640, 312, 15, PALETTE.muted, 'center', '600');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
    ctx.globalAlpha = pulse;
    text(ctx, 'PRESS SPACE OR CLICK TO START', 640, 372, 22, PALETTE.gold, 'center', '800');
    ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `Best shift: $${best}`, 640, 408, 15, PALETTE.text, 'center', '700');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(23,16,10,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 640, 220, 48, PALETTE.text, 'center', '800');
    text(ctx, 'P or Esc to keep cooking · R to restart the shift', 640, 268, 16, PALETTE.muted, 'center', '600');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(23,16,10,0.82)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'SHIFT OVER!', 640, 108, 52, PALETTE.gold, 'center', '800');
    text(ctx, 'The truck is closed. Here is how the rush went:', 640, 152, 17, PALETTE.text, 'center', '600');
    const rows = [
      ['Coins earned', `$${state.coins}`],
      ['Dishes served', `${state.served}`],
      ['Customers walked out', `${state.walkedOut}`],
      ['Best combo', `x${state.bestCombo}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 200 + i * 36;
      text(ctx, label, 480, y, 18, PALETTE.text, 'left', '600');
      text(ctx, value, 800, y, 18, PALETTE.gold, 'right', '800');
    });
    if (state.coins > 0 && state.coins >= best) {
      text(ctx, '★ New best shift! ★', 640, 356, 20, PALETTE.gold, 'center', '800');
    } else if (best > 0) {
      text(ctx, `Best shift: $${best}`, 640, 356, 16, PALETTE.text, 'center', '700');
    }
    text(ctx, 'Press R for another shift', 640, 404, 16, PALETTE.muted, 'center', '600');
  }

  return {
    draw(state, screen, best, ui = {}) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      // Wall + floor.
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(0, 52, FIELD.width, 240);
      ctx.fillStyle = PALETTE.floor;
      ctx.fillRect(0, 292, FIELD.width, 188);
      const serveReady = ui.serveReadyId ?? null;
      drawHud(state, screen, best);
      drawBoard(state, serveReady);
      drawStations(state);
      drawServe(state, serveReady);
      drawPlate(state);
      drawCounter(state);
      if (screen === SCREEN_PLAY) drawMessage(state);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
      if (screen === SCREEN_PLAY) drawHand(state, ui.mouse);
    },
  };
}
