# best-cooking-game-20261125-0137

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Ryanefri10/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Ryanefri10/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve — Food Truck Rush**, a complete cooking game for the make.fun "Make the best cooking game" bounty. You run a food truck kitchen through a 150-second dinner rush: orders land on the board, each with a patience bar and a tip that shrinks as it drains. Pick ingredients off the counter (click or keys 1–7), cook each one at its own station — patties on the grill, pasta in the pot, lettuce and tomato on the chopping board — build the dish on your plate, and ring the service bell before the customer walks out. Leave a patty on the grill too long and it burns.

- **4 original recipes** — Sunset Burger, Ember Pasta, Garden Stack and Double Sizzle, each a different route through the kitchen
- **Real cooking pressure** — cook timers, burn timers, shrinking patience, tips for fast service, combos for streaks
- **Full game flow** — title briefing, HUD with shift timer / coins / served / combo, pause, and a shift report with best-shift saving
- **Original art and sound** — procedural canvas drawing and WebAudio sizzle, dings and chimes only; no libraries, no network requests, no external assets

## Entry

- `main.ts` — Node 22 (stdlib only) entrypoint: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts`
- `game/` — the playable game: `index.html` plus ES modules under `game/src/` (`config.js`, `random.js`, `world.js`, `input.js`, `render.js`, `audio.js`, `shots.js`, `main.js`)
- `screenshots/` — 4 real renders of the game's own code (title, mid-assembly, plate ready to serve, shift report)
- `serve.ts` — tiny static server for local play-testing

## Run it

```sh
node serve.ts
# open http://localhost:8080 — click bins, stations, plate and tickets,
# or keys 1-7 to pick ingredients, SPACE to serve, P to pause, R to restart
```

Build the submission output:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see `LICENSE`.
