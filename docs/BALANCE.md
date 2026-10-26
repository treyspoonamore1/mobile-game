# Lifeline: balance notes

How the numbers were chosen, what the headless bots reach and when, and which values are feel calls that
need a playtest. All numbers live in `src/sim/tuning.ts` and `src/sim/data/*.ts`.

## Tools

```
node --experimental-strip-types tools/balance.ts --hours 40 --bot skilled|novice|idle [--quiet] [--seed 1]
      [--every 30] [--active 0.3] [--no-pilgrimage] [--dev might=3,...] [--set key=value,...] [--dump 60,120]
node --experimental-strip-types tools/probe.ts --need [--seg 1|5] --from 1 --to 100 --level 40 --acos 5
      [--upg mend_power=30,...] [--relics all|a,b] [--progress '<json from --dump>'] [--set key=value,...]
```

- `balance.ts` plays the whole game: fights, shops, picks relics, assigns Prayers and goes on Pilgrimages.
  `--set` overrides tuning values for experiments, `--dev` starts with Devotion upgrades (to measure what
  each is worth), `--dump` prints the save's progress for `probe.ts --progress`.
- `probe.ts --need` binary-searches the hero power multiplier a bot needs to clear each 5-floor
  checkpoint segment (or single floors with `--seg 1`). It shows the difficulty curve directly: walls,
  spikes and how much skill, Acolytes, relics and upgrades are worth in power.

### Bot behaviour (a plausible human)

- **skilled**: Perfect-Wards telegraphs, triages, chains, uses Sanctuary. **novice**: taps the lowest hero
  under 60% and taps a fallen hero's frame when it has the mana. **idle**: never touches the screen.
- Everyone shops greedily (cheapest useful thing, hero levels slightly favoured) and assigns Prayers in a
  sensible order. Relics are picked by a ranked preference (measured with `probe.ts --relics`).
- Fully active until the best floor reaches 40; after that only 30% of the time (`--active`), because
  Acolytes carry the routine.
- **Pilgrimage policy**: only when this run has stopped climbing for 8+ minutes, and only if the Devotion
  gain is worth it relative to all Devotion earned so far: at least 60% of it after 8 minutes stuck, 30% after
  20 minutes, 15% after 45 minutes. It doesn't reset short of the previous run's depth unless stuck for an
  hour. It always stays Cleric (the bots are written for Ward). It buys Devotion upgrades by weighted cost
  (Might and Fortune first, Vigil late because the bot never goes offline).

## What was wrong

Measured with the tools before changing anything:

1. **The bot's Pilgrimage policy** used the lifetime best floor to decide it was "stuck". After every
   reset it went on Pilgrimage again 8 minutes later for +9 Devotion. That alone was the 2.5-hour stall at
   floors 25-30.
2. **Floor composition sawtooth.** Enemy count went from 1-2 weak enemies at a region's start to 4 mixed
   ones at floor x9, about ×3 extra threat inside each region on top of the per-floor growth. Each
   x6-x10 segment needed ~3.5× the power of the one before, then the next region was a pushover, so
   progress came in bursts of 5-10 floors.
3. **Tithe Ring** paid 3 × the *average* enemy gold (bosses included) per Save. With Acolytes, Saves are
   constant: on floor 100 it paid 20× the gold from kills. This funded most of the floor 35→110 runaway.
4. **Healing outscaled depth.** Enemy attack grew 11.5%/floor and life 13%/floor. Hero power has to track
   life, so incoming damage as a share of hero life fell 1.3%/floor. Meanwhile Acolyte power, max mana and
   mana regen were linear upgrades with no cap (×10 by floor 100), and Fervor went to 4.6× cast speed. Normal
   floors became free and only boss bursts stopped the party.
5. **The economy was too flat.** Gold grew 13.5%/floor and the hero levels needed cost ~16%/floor more:
   a 2-3% gap, so ×2 gold or one Might level moved the stable depth by ~10 floors.
6. **Devotion compounded.** `((f-10)/4)^1.7` with uncapped Might at ×1.25 meant 45 Devotion took a run from
   floor 40 to 160.
7. **Thorn Amulet** (150% reflect) was worth ×2.7 (idle) to ×4.6 (skilled) power, so relic luck decided whole
   runs.
8. **Two dead ends found along the way.** A wipe on a checkpoint floor (1, 6, 11, ...) that you can't beat
   restarted you on that same floor with no way to earn gold (a casual bot was stuck 8 hours on floor 21).
   And a lone tank kept alive by Acolytes or taps could crawl through a floor for 5+ minutes.

## What changed and why

### Floors (`floors.ts`, `tuning.ts`)
- **Floor budgets**: after the first region every normal floor has the same total life, attack and gold
  (`packHpUnits` 3, `packAtkUnits` 2.6, `packGoldUnits` 3, in units of a basic enemy), split among its
  enemies. Attack is weighed by each enemy's real damage rate (`attackRate`: every attack's mult/interval,
  poison while it is up, party-wide hits ×2), so four Ember Imps aren't four brutes. There's a mild ramp inside
  each region (`packRampStart` 0.8 + `packRampPerFloor` 0.04/floor), a small breather after each boss.
- **Bosses**: every boss gets the same damage budget (`bossThreat` 1.8, spread over its own attacks), life
  `bossHpMult` 0.6 × `bossFloorMult` 0.75 of its table value. Boss floors now need ~1-2× the power of floor
  x9 (they needed 2-3.5×), so a boss is a check, not a cliff that banks a 10-floor surplus. Tweaks: Bone
  Knight life 10, slower basic attack but heavier telegraphs (rewards Perfect Wards on the first boss); Forge
  Tyrant life 14; Frost Breath 2×; Hammerfall 5×; Execute 6×.
- **Tutorial region**: keeps its hand-made ramp (1 rat on floor 1) with total budget capped at
  `tutorialUnits` 2.4 and enemy life ×`tutorialHpMult` 1.45, so floors 1-10 take a few minutes and the
  first boss is a skill check without slowing the rest of the game.
- **Equal growth**: enemy life and attack both ×1.125/floor (base 140 / 10). Damage relative to life no
  longer shrinks with depth.
- The difficulty curve is now smooth: about ×1.14/floor on average, with no jump at Depth boundaries.

### Economy
- Hero level cost growth 1.12 → **1.18**, gold growth 1.135 → **1.12**, gold base 3 → **10**. Each floor
  needs ~1.05 hero levels (the rest comes from relics and upgrades), so cost per floor grows ~1.19 against
  1.12 for gold: a ~6%/floor gap. A doubling of gold is now worth ~5 floors, not ~25.
- **Soft caps** on Deep Well (×2.5), Wellspring (×3) and Litany (Acolyte power ×3), the same `soft()` curve
  Mend and Ward already used; Fervor max 30 → 12. Shop texts no longer quote per-level %.
- Per-enemy gold is a whole number (`Math.max(1, Math.round(...))`, at the lead's request). It only matters
  on floors 1-5 (drops of 2-5 gold).

### Combat rules (small structural levers)
- **Enrage** (`fight.ts`, `enrageMult`): after 45 s on a floor (90 s on a boss) enemy damage grows +5% per
  second. A fight always ends; a party that can't kill fast enough wipes and restarts whole from a
  checkpoint. `phaseT` now counts fight time during the fight phase (UI can show an enrage warning from it).
  No new event type.
- **Wipe fallback** (`floors.ts`, `wipeCheckpoint`): a wipe *on* a checkpoint floor sends you to the previous
  checkpoint, so a floor you can't beat never locks you out of gold. The `wipe` event's `checkpoint` is the
  real destination, so the "Back to floor N" banner stays correct.
  **Designer call**: this changes the "back to the last checkpoint" rule.

### Relics
- Tithe Ring: half a basic kill of the current floor per Save (`titheKills` 0.5), whole gold.
- Thorn Amulet: reflects 10% of what Wards absorb or Perfects block (`thornReflect`). Shields are up almost
  all the time (Cleric overheal, Acolyte Wards), so even this is ×1.12 (idle) / ×1.74 (skilled), on a par with
  Star Gem (×1.13 / ×1.41) and still the best relic for skilled play.

### Devotion (`pilgrimage.ts`, `tuning.ts`)
- `devotionFor(f) = floor(8 × 1.045^(f − 25))`: 8 at floor 25, 13 at 37, 24 at 50, 72 at 75, 217 at 100,
  ~2000 at 150.
  Why exponential: every Devotion upgrade buys a roughly fixed number of floors per e-fold of total Devotion
  (k ≈ 10 floors here). With growth b per floor, a run's gain feeds back by k·ln b ≈ 0.44. That is well
  below 1, so progress can never run away, but pushing a few floors deeper still pays clearly more.
  Late-game depth grows with the logarithm of the number of runs, i.e. it keeps slowing down.
- Might ×1.25 → **×1.2** per level; Grace +8% → +10%; Spirit +15% → +20% per level. All in `tuning.ts`.

## Resulting timelines

Skilled seeds 1/3/7; novice and idle seeds 1/3. Times are total play time (bots never go offline). "F11"
means the first boss has fallen.

| Milestone | Skilled | Novice (casual) | Idle (no input) |
|---|---|---|---|
| First wipe | F8-F13 | F9 | **F3** |
| Floor 10 boss beaten (F11) | **5.8-8.1 min** | 8.4-11.2 min (wipes on 9-10 first) | 68-72 min |
| F20 | 30-32 min | 39-53 min | 112-114 min |
| F25 | 53-69 min | 77-88 min | 115-125 min |
| First Pilgrimage | **63-93 min** (from F26-34, +8-11 Devotion) | 90-100 min (F30) | 127-134 min |
| Run 2 regains old max | 15-20 min (**21-23%** of run 1), then pushes to F40 | 16-20 min | 39-42 min |
| F50 | **4.0-4.4 h** | 3.9-4.7 h | 5.8-6.6 h |
| F75 | 7.8-10.1 h | 7.6-9.3 h | 12.1-16.5 h |
| F100 | **15.9-20.9 h** | 18.3-20.7 h | 22.8-24.9 h |
| Best floor at 40 h | F120-134 (still climbing) | F110-113 | F110-129 (**82-100%** of skilled) |

Progress per hour (skilled, seed 1): about 28 floors/h to F25, 8/h for F25-50, 7/h for F50-75, 2.5/h for
F75-100, under 1/h after F110. No run gains more than 14-20 floors over the previous best (before the
changes: +75 and +115 floors in one run).

Manual play matters early: by the first wall the skilled player is 2× faster than idle (F25 at ~1 h vs ~2 h),
and Acolytes take over from about floor 40-50 (late game idle ≈ skilled).

**Offline** (spot check from saves at 30 min, 2 h, 7 h, 15 h, 24 h): 8 hours away is capped at 4-8 h by Vigil
and earns 0.26-0.86× the gold of the same time played idle online. That buys ~13-28 hero levels each (the
high end right after a Pilgrimage, when levels are cheap), roughly an hour or two of active play at that
stage. Floors barely move offline (Acolytes only). Knobs: `offlineEfficiency` 0.5, `offlineCapHours` 4,
Vigil.

**Devotion upgrades** (single run of 3 h from a fresh save; idle best floor, and the casual player's time to
floor 20): none F28 / 53 min; Might 3 F39 / 12 min; Fortune 3 F36 / 23 min; Haste 2 F30 / 32 min (starts at
floor 11); Spirit 5 F28 / 34 min; Grace 5 F29 / 45 min; Choir 1 F28 / 51 min, but idle beats the first boss at
20 min instead of 72 (Acolytes from floor 1). Might and Fortune are the depth upgrades; Haste, Spirit, Grace
and Choir make the re-climb after each Pilgrimage faster, which is where they earn their price. (The skilled
bot hits F40 in 3 h with any of them, then drops to part-time play by design.) Healing in general buys ~3
floors per doubling at a wall, because damage per fight grows on two axes: damage relative to life and
fight length.

## Feel calls to playtest

- **Enrage** `enrageAfter` 45 s / `enrageAfterBoss` 90 s / `enrageRamp` 5%/s. Too short feels punishing for a
  healer; too long brings back the lone-tank crawl. The UI should probably show it (from `fight.phaseT`).
- **Wipe fallback** to the previous checkpoint: a rules change for the designer to accept or replace.
- **First boss** (Bone Knight: Cleave 6×, Bone Storm 2.5×, life 10) and `tutorialHpMult` 1.45: novice
  wipes a few times on 9-10, skilled beats it at ~6-8 min.
- **Boss checks** `bossThreat` 1.8, `bossHpMult` 0.6, `bossFloorMult` 0.75: bosses ~1-2× floor x9.
- **Region ramp** `packRampStart` 0.8 / `packRampPerFloor` 0.04: the breather after each boss.
- **Devotion** `devotionBase` 8 / `devotionGrowth` 1.045 and `mightPerLevel` 1.2: the first Pilgrimage pushes
  ~+6-14 floors (to the next boss wall at 40), at or slightly above the 5-10 target because walls sit at
  bosses. 1.04 gives F100 at ~19-23 h but late runs stall at a boss for many hours; 1.05 gives F100 at
  ~15-17 h. Late-game per-run gains shrink to a few floors (by design), so the very late game is mostly
  "one more Pilgrimage".
- **Relics**: most are worth ~×1.0 power at a wall (Sunstone, Blood Totem, Chalice, Quill, Hourglass, Bell
  of Dawn, Crown, Tithe help feel or gold, not depth). Star Gem (×1.1-1.4) and War Banner (×1.1) matter.
  A designer pass on relic effects would make Pilgrimage-to-Pilgrimage runs less samey.
- `--active 0.3` (late-game share of active play) shapes the skilled/idle gap; real players may differ.
