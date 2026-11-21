# Solmar Bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bmbngn/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bmbngn/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar Bay — 5 districts, 5 story missions, 4 stealable cars, 5-star wanted, traffic, police chases, minimap. An open-world crime game in a sun-soaked coastal city, playable in a desktop browser from static files with no network request.

Dana Reyes owes the Harbor Crew. Fixer Sal Marin hands out the jobs by phone card, crew boss Ilsa Kade rides along on the last one, and rival Vince Torro keeps tipping off the police. Five jobs: a pickup run, a stolen Falco GT and a respray, losing a three-star heat, a timed three-package getaway, and a four-star drive to the Marina boat. After the fifth job the debt is paid and free roam continues.

## How to play

- **Move:** WASD or arrows — walk on foot, drive in a car
- **Enter / exit a car:** Enter (stealing a car in sight raises your wanted level)
- **Punch / handbrake:** Space — punch on foot, drift while driving
- **Sprint:** Shift on foot
- **Pause:** P or Esc · **Mute:** M · **Retry mission:** R · **Menus:** Enter or click
- **Wanted:** stars rise when you steal a car in sight, hit a pedestrian, or hit the police. Stay out of sight and they decay; the safehouse halves the wait, and a respray at the paint shop clears them all for $100.
- **Busted / wasted:** lose 10% of your cash and wake up at the police station or the hospital.
- **Save:** the game saves on every completed mission. Your best score is kept in this browser.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080. Or serve `game/` with any static server.

## What is in here

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output and writes `dossier.json` (make.fun gta6-01)
- `game/index.html` — the page, one canvas
- `game/src/config.js` — every tuning number and colour, the five districts, the four vehicle types, the five mission scripts and the story
- `game/src/city.js` — the city: roads, blocks, buildings, parks, beach, pier, and the named places
- `game/src/world.js` — the rules: the player, vehicles, traffic, pedestrians, police, wanted level, missions, combat, economy and save
- `game/src/input.js` — keyboard and mouse input
- `game/src/audio.js` — synthesised WebAudio sounds and music (no audio files)
- `game/src/render.js` — the city, the cars, the HUD with WIN/LOSE lines, the minimap and every screen
- `game/src/shots.js` — the autopilot that stages the screenshots
- `game/src/main.js` — the game loop and the screens
- `screenshots/` — 1-finale, 2-chase, 3-pickup, 4-steal, real renders of the game

Everything is original: the idea, the city, the art, the sounds and the names. No copyrighted material, no network requests, no libraries.

---

<sub>Entered on [make.fun](https://make.fun/?ref=escmq3aq&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
