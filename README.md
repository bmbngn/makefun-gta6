# Solmar Bay

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/bmbngn/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/bmbngn/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for make.fun's GTA 6 bounty: **5 districts, 5 story missions, 4 stealable cars, 5-star wanted, traffic, police chases, minimap**.

Dana Reyes, an ex-courier driver, owes money to the Harbor Crew. Fixer Sal Marin hands out the jobs by phone card; crew boss Ilsa Kade wants the debt worked off job by job. Drive, steal, hide from the police, and finish all five jobs to clear the debt.

## How to play

Serve the game and open it in a desktop browser:

```
node serve.ts
```

Then open http://localhost:8080 and play with keyboard and mouse. No network, no build step — `game/` is plain static files.

| Key | Action |
| --- | ------ |
| WASD / Arrows | Move on foot, drive |
| E | Enter / exit a car, confirm |
| F | Punch |
| Shift | Sprint on foot |
| Space | Handbrake / drift |
| P / Esc | Pause |
| M | Mute |
| R | Restart mission |

## What is inside

- A 2560×1920 sun-soaked coastal city: Downtown, Old Town, the Docks, the Marina and Beach, and the Hills, with a central plaza, parks, a pier and docks cranes.
- Five story missions with phone-card briefings, objective markers, a 150-second getaway timer, and a 4-star finale drive with Ilsa Kade aboard.
- Four stealable cars (SunCab, Comet, Falco GT, Mule) plus police patrol cars, 14 traffic cars and 24 pedestrians.
- A 0–5 star wanted level with police chases, ramming patrol cars, foot officers, heat decay while unseen, a safehouse and a paint-shop respray.
- A dense HUD: health, cash, big score + best, wanted stars with WIN/LOSE lines, progress list, objective line, minimap, speed and a controls strip.
- Synthesised WebAudio only: engine hum, sirens, crash and punch sounds, pickup chimes, mission jingles and a bass-and-hats music loop.
- Save to local storage (cash, missions, best score) with Continue / New Game on the title screen.

## Files

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output directory and writes the dossier with the vendored make.fun library.
- `game/index.html` — one full-window canvas, one module script.
- `game/src/` — one clear job per file: `config.js` (tuning, districts, vehicles, missions), `city.js` (city generation), `world.js` (rules), `input.js`, `audio.js`, `render.js`, `shots.js` (screenshot autopilot), `main.js` (boot and loop), `random.js` (seeded generator).
- `screenshots/` — four renders of the game in headless Chrome at seed 1234.
- `tools/` — `browser-test.mjs` (headless playtest) and `shoot.mjs` (screenshot capture).

All city, character, vehicle, place and story names are invented for this game. Nothing comes from Rockstar Games or any other commercial game.
