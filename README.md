# Lifeline

*You're the healer. They're the heroes. Without you, they die on floor 3.*

An incremental dungeon crawler for phones, held in portrait and played with one thumb. Four heroes
fight their way down an endless descent on their own. You never attack: you keep them alive. The
early game is frantic triage; the later game is about Acolytes, relics, upgrades and Pilgrimages.

## Play it on your phone

The game is an installable web app (PWA): it runs full-screen, works offline and saves on the phone.

1. Open the game's GitHub Pages URL (`https://treyspoonamore1.github.io/mobile-game/`) in Chrome on the phone.
2. Chrome menu (⋮) → **Add to Home screen** → **Install**.
3. Launch it from the home screen icon.

To publish it, the repository needs GitHub Pages turned on once: **Settings → Pages → Build and
deployment → Source: GitHub Actions**. After that every push to the branch deploys automatically
(`.github/workflows/pages.yml`).

## Controls

| Gesture on a hero's frame | Spell |
|---|---|
| Tap | **Mend**: heal them |
| Hold | **Ward**: a shield. Ward in the last moment before a heavy blow (gold "WARD" on the frame) for a **Perfect**: the blow is blocked entirely and the mana refunded |
| Swipe across several | **Chain Mend** |
| Tap a fallen hero | **Revive** |
| Sanctuary button (full Resonance) | Heal everyone and blunt all damage for 3 s |

## Development

```bash
npm install
npm run dev        # dev server on the LAN (open it on the phone too)
npm run check      # typecheck + unit tests
npm run build      # PWA build into dist/
npm run build:single  # one self-contained HTML file in dist-single/
npm run balance -- --hours 8 --bot skilled   # headless playthrough timeline
npm run shots      # Playwright screenshots (needs a running dev server)
```

- `src/sim/`: the pure, deterministic game (fight loop, spells, Acolytes, data, tuning). No DOM.
- `src/meta/`: saves, shop, relics, Pilgrimage, offline progress.
- `src/render/`: canvas renderer; `src/render/art/`: all pixel art, drawn from code.
- `src/ui/`: Preact menus and modals. `src/audio/`: synthesized sound effects, music and haptics.
- `src/app/`: bootstrap, game loop, touch gestures, tutorial.

Design notes: [`docs/DESIGN.md`](docs/DESIGN.md). Balance notes: [`docs/BALANCE.md`](docs/BALANCE.md).
