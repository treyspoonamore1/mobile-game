# Lifeline: balance notes

How the numbers were chosen, what the headless bots reach and when, and which values are feel calls that
need a playtest. All numbers live in `src/sim/tuning.ts`, `src/sim/data/*.ts` and (healer XP, Deed gold)
`src/meta/healer.ts` / `src/meta/deeds.ts`.

## Tools

```
node --experimental-strip-types tools/pace.ts --minutes 120 [--bot skilled|novice] [--seed 1] [--quiet]
      [--no-pilgrimage] [--set key=value,...]
node --experimental-strip-types tools/balance.ts --hours 40 --bot skilled|novice|idle [--quiet] [--seed 1]
      [--every 30] [--active 0.3] [--no-pilgrimage] [--dev might=3,...] [--set key=value,...] [--dump 60,120] [--deeds]
node --experimental-strip-types tools/probe.ts --need [--seg 1|5] --from 1 --to 100 --level 40 --acos 5
      [--upg mend_power=30,...] [--relics all|a,b] [--progress '<json from --dump>'] [--set key=value,...]
```

- `pace.ts`: the first N minutes. It reports floor durations per 10 floors (all, and at the *frontier*,
  within 5 floors of this run's deepest), boss durations, wipes and how long they took, purchases per minute,
  and every "new thing". New things are new enemies, relics, healer levels, Deed claims (with the payout in
  minutes of recent income), hero milestones, Acolyte and Pilgrimage unlocks, and Pilgrimages. It also lists
  every gap over 10 minutes.
- `balance.ts`: the whole game over many hours. Timeline of floors, Pilgrimages, healer levels, Deeds
  claimed and talents learned.
- `probe.ts --need`: the hero power multiplier a bot needs per segment. It is the difficulty curve, and the
  way to measure what skill, Acolytes, relics, talents or Deeds are worth.
- `tools/policy.ts`: the player both tools simulate (see below).

### The simulated player (`tools/policy.ts`)

- **Bots.** skilled: Perfect-Wards telegraphs, triages, chains, uses Sanctuary. novice (casual): taps the
  lowest hero under 60%, and taps a fallen hero's frame when it has the mana. idle: never touches the screen.
- **Shopping.** Greedy: the cheapest useful thing, hero levels slightly favoured. Prayers are set in a sensible
  order; relics are picked by a ranked preference.
- **Talents.** Points are spent as they come, in a fixed sensible order: Swift Hands and Battle Hymn first,
  then Thick Ward, Deep Breath, the Acolyte talents (Shepherd, Swift Prayers), Miracle, then Mercy and Aegis.
- **Deeds.** Every ready tier is claimed at once.
- **Activity.** Fully active until the best floor reaches 40, then active 30% of the time (Acolytes carry
  the routine).
- **Pilgrimage.** After 8+ minutes without a new floor, if the gain is at least 60% of all Devotion earned so
  far (30% after 20 minutes stuck, 15% after 45 minutes), and never short of the previous run's depth
  unless stuck for an hour. Always Cleric. Devotion goes to weighted-cheapest upgrades.

## Pass 2: pace (October 27)

### What was wrong
The designer found the game slow, and the lead's probe agreed:
- Normal floors took 28 s on floors 1-10, 42 s on 11-20, 77 s on 21-30 and 2 min on 31-40; bosses took
  1.5-2.7 min.
- Purchases dropped to about 1.3/min by 30-60 min.
- There was a 28-minute gap with nothing new.

Cause: healing is %-of-life and grows about 10× over the first 50 floors (Acolytes, upgrades, talents). So at
the frontier the party could almost always out-heal the damage, and the only thing that ended a hard fight
was the old 45 s linear enrage. Frontier fights therefore settled at the enrage length, and got longer as
heal capacity grew. Cutting enemy life alone just moved that point deeper.

### What changed
- **Damage, not life, gates the frontier.**
  - Enemy life base 140, normal-floor life budget 3 → 2 units, enemy attack base 10 → 122.
  - The attack ramps in over the first 40 floors (`atkRamp`: 10% of the curve on floor 1, full by floor 41),
    because the healer starts with one Mend and little mana.
  - A floor that's too hard now ends in a damage-gated wipe after 10-30 s, instead of a slog.
- **Exponential enrage.** After 25 s on a floor (45 s on a boss), enemy damage doubles every 4 s
  (`enrageDoubling`). This bounds every fight. For skilled play, bosses are damage races that end by
  45-60 s.
- **Bosses**: damage budget `bossThreat` 1.8 → 1.5 (casual players were stuck 30+ min at the F20 boss).
- **Hero milestones**: ×2 every 10 levels (was every 25), per-level growth 1.06 → 1.017. Effective growth is
  about the same (~9%/level), but a doubling pops every few floors.
- **Healer XP.** `healerXpBase` 60 → 420, `healerXpGrowth` 1.2 → 1.157. Acolyte healing counts 0.15 (was
  0.4). Mid-game XP no longer balloons as Acolytes multiply.
- **Deeds.**
  - Payouts now include your gold multiplier (Fortune, Crown, gold Deeds). Without it they fell to about
    0.2 min of income after the first Pilgrimage.
  - Tier thresholds are spread out: Perfectionist, Guardian Angel, Slayer, Bossbane, In the Zone, Full
    Circle, Lazarus and Sanctified.
  - `deedGoldKills` stays 15 (about 2 min of income).
- **Devotion.** `devotionBase` 8 → 6, `devotionGrowth` 1.045 → 1.04, Might ×1.2 → ×1.17. Deeds and talents
  add permanent power, and faster floors mean more Pilgrimages per hour.
- **Tools.** `tools/policy.ts` holds the shared player (talents, Deeds, Pilgrimage, casual bot). `pace.ts`
  now plays like `balance.ts`: it learns talents, claims Deeds and goes on Pilgrimage, and reports frontier
  floors, Deed payout sizes and >10 min gaps.

### Pace now (`tools/pace.ts --minutes 120`, seeds 1 and 2)

| | Skilled | Casual |
|---|---|---|
| Normal floor, F1-10 / 11-20 / 21-30 / 31-40 / 41-50 | 8 / 12-13 / 12-14 (frontier 13-16) / 17 / 26 s | 11-12 / 11-12 / 12 s |
| Boss | 21-22 / 40-48 / 38-44 / 55 s | 21-22 / 41-48 / 38-50 s |
| Wipes at a wall end after | 10-33 s (normal), ~50 s (boss) | 7-30 s |
| Purchases/min, 0-10 / 10-30 / 30-60 / 60-90 / 90-120 min | 12-14 / 3.0-3.3 / 7.5-9.2 / 11-12 / 5.3-8.1 | 8-10 / 3.8-4.7 / **1.5-2.1** / 7.7-9.1 / 9.8-10.5 |
| Longest gap without anything new | 7.0-8.6 min | 9.5-10.1 min |
| Deed payout (median) | 2.1-2.2 min of income | 2.0-2.2 min of income |

The casual player's 30-60 min window (the climb to the first Pilgrimage at F25) is the one spot under
2 purchases/min on one seed.

## Resulting timelines

40 hours each; skilled seeds 1/3/7, casual and idle seeds 1/3. "F11" means the first boss has fallen.

| Milestone | Skilled | Casual | Idle |
|---|---|---|---|
| First boss down (F11) | 3.8-4.5 min | 7.6-8.3 min (a few wipes) | 39-40 min (first wipe on F3) |
| F25 | **33-37 min** | 42-51 min | 112-115 min |
| First Pilgrimage | **43-48 min** (from F30-31) | 59-60 min | 120-123 min |
| Run 2 regains the old max | 14-17 min | 17-20 min | 34 min |
| F50 | **2.9-3.5 h** | 4.0-5.2 h | 6.4-7.0 h |
| F75 | 6.2-7.9 h | 10.2-10.4 h | 19.6-21.1 h |
| F100 | **13.7-18.4 h** | 24.3-26.7 h | 31.8-35.6 h |
| Best at 40 h | F137, still climbing (F125 at 22-27 h) | F120-126 | F100-101 (**73%** of skilled) |

No Pilgrimage gains more than 13-20 floors over the previous best.

**Healer levels** (skilled; casual similar):

| Level | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|
| Time | 7.5-9 min | 21-26 min | 49-57 min | 1.8-2.7 h | 7.6-8.5 h | 17-18 h |

L20 comes earlier than the 3-4 h target. XP per minute peaks during fully active mid-game play, then drops
when the player turns part-time, and a geometric XP curve can't follow both.

**Deeds** (55 tiers claimed by 40 h, skilled):

| Window | 0-10 min | 10-30 min | 30-60 min | 1-2 h | 2-5 h | 5-10 h | 10-20 h | 20-40 h |
|---|---|---|---|---|---|---|---|---|
| Tiers claimed | 11 | 7 | 4 | 8 | 6 | 6 | 7 | 6 |

The first 10 minutes double as onboarding.

**Talents and Deeds in power terms** (probe at F56-75 with and without them): talents ×1.3-1.45 for idle
play (about 2-3 floors), more for skilled; Deeds ×1.3-1.5. Meaningful, not dominant.

**Offline** (8 hours away, saves from 30 min to 24 h): 0.2-1.1× the gold of the same time played idle
online. It reaches 1× only with Vigil maxed (100% offline efficiency).

## Pass 1: progression (October 26)

Summary of the earlier pass, still in place:

- **Bot Pilgrimage policy fixed.** The old one re-Pilgrimaged every 8 minutes.
- **Flat floor budgets.** After region 1 every normal floor has the same life/attack/gold budget split
  across its enemies; attack is weighted by each enemy's real damage rate; a mild ramp inside each region.
- **Common boss damage budget**, with tamed boss outliers.
- **Equal enemy life and attack growth** (×1.125/floor).
- **Economy gap of about 6%/floor:** hero cost growth 1.18, gold growth 1.12.
- **Soft caps** on Deep Well, Wellspring and Litany; Fervor max 12.
- **Relics:** Tithe Ring pays half a basic kill per Save; Thorn Amulet reflects 10%.
- **Wipe fallback:** a wipe on a checkpoint floor sends you back one checkpoint, so you are never locked
  out of gold.
- **Exponential Devotion** (`floor(base × growth^(f − 25))`). Each Devotion upgrade is worth roughly 10
  floors per e-fold of Devotion. At this growth a run's gain feeds back at about 0.4 (runaway would need
  ≥ 1), so progress can't run away but deeper runs pay more.

## Feel calls to playtest

- **Enrage**: 25 s (boss 45 s), doubling every 4 s. It now bounds every fight. The UI should show it (from
  `fight.phaseT`): a warning at the limit and a growing glow.
- **Damage-first enemies**: attack base 122 with the 40-floor ramp, life 140 × 2 units. The casual player now
  wipes fast (7-30 s) when a floor is too hard; skilled players meet damage races at bosses.
- **Hero milestones** ×2 every 10 levels, with only +1.7% per level in between: levels between milestones
  feel small. ×1.6 every 10 with +4%/level is the alternative if they feel empty.
- **Healer L20** at about 2-2.5 h vs the 3-4 h target. Raise `healerXpBase` (e.g. 500) if it should be later;
  that also pushes L10 to about 30 min and L30 to about 20 h.
- **Deeds**: `deedGoldKills` 15 (about 2 min of income); the tier lists in `src/sim/data/deeds.ts`.
- **Devotion** 6 × 1.04^(f − 25), Might ×1.17. The first Pilgrimage (F30, +7) lets run 2 reach F31-40.
- **Casual 30-60 min**: purchases dip to about 1.5/min on the way to the first Pilgrimage. Pilgrimage
  unlocking at F20 instead of F25 would fix it, but that is a design change.
- Relic effects, `--active 0.3` and the wipe fallback rule are still open from pass 1.
