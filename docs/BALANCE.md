# Lifeline: balance notes

How the numbers were chosen, what the headless bots reach and when, and which values are feel calls that
need a playtest. All numbers live in `src/sim/tuning.ts`, `src/sim/data/*.ts` and (healer XP, Deed gold)
`src/meta/healer.ts` / `src/meta/deeds.ts`.

## Tools

```
node --experimental-strip-types tools/deaths.ts --minutes 240 [--bot skilled|novice] [--seed 1] [--set key=value,...]
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
- `deaths.ts`: how heroes die, per 10-floor band. It reports one-shots (dead from at least 70% life in one
  tick), the killing blow as a share of max life, heavy or not, and whether the fight was enraged; the same
  outside the enrage; typical hit sizes at the frontier; the share of frontier wipes that happened under
  enrage; and hero deaths per minute while pushing vs farming.
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

## Pass 3: healing decides the wall

### What was wrong
Playtest: "teammates get one-shot on higher floors unless you hit a milestone."
- **Before the lead's fix:** 93-95% of hero deaths after F20 were one-shots.
- **After the lead's hit caps, smooth hero life and auto-retreat:** nearly every remaining death happened
  under enrage. Nobody died until the timer, then everyone did.

Measured with `deaths.ts`:
- **Hit size at a wall is set by the healing, not by the attack numbers.** A frontier settles where the
  damage a hero takes per second first beats the healing and shielding it gets per second, so the typical
  hit there ≈ that mitigation ÷ the hits it takes per second.
- **Mitigation was huge.** Mend healed up to 70% of max life per tap, Wards absorbed up to 120%, a third
  of all overhealing became a Ward, Acolytes cast up to ~115% of life, and mana regen reached ×3. Enemies
  landed ~2-3 hits a second. So frontier hits were 40-100%+ of life, and the back line (Ilse at 55 life
  vs Tomas at 140 with 30% damage reduction) was deleted.
- **The soft cap made it worse late.** Past the cap, damage grows only as raw^softness (about 4%/floor,
  against 12.5%/floor for enemy life). Strong healers could push into floors where raw hits were several
  times a hero's life, until kill time ran out and the enrage decided.

### What changed
- **Many small hits instead of a few big ones.** Every instant enemy attack swings 4× as often at a quarter
  of the multiplier (Crypt Rat and Ember Imp, already fast, 2-3×). The floor and boss damage budgets
  normalize damage per second, so floor danger is unchanged while a hit is 4× smaller.
- **Heavies are heavy, not lethal.**
  - Single-target telegraphed blows hit 1.5-2× attack (were 4-7×); party-wide blows 0.6-1.2× (were
    1.2-3×). Poison attacks are unchanged.
  - Caps: heavy 0.85 → 0.45 of max life, party-wide 0.5 → 0.3, basic stays 0.3; softness 0.35 → 0.3.
- **Narrower life spread.** Brann 95 → 115, Ilse 55 → 95, Wren 70 → 95. Tomas 140 → 125 and takes 80% damage
  (was 70%; quirk text updated). Hits sized for the wall no longer delete the back line, and a lost fight
  ends soon after the damage dealers fall instead of the tank surviving alone until the enrage.
- **Heal capacity in proportion.** These keep healing and damage of the same order at every depth:
  - Mend cap 0.7 → 0.3 (Mend starts at 0.22), Mend cost 10 → 18.
  - Ward cap 1.2 → 0.6.
  - Mana regen cap ×3 → ×1.4, max mana cap ×2.5 → ×1.8.
  - Litany (Acolyte power) cap ×3 → ×1.2.
  - Cleric overheal to Ward 1/3 → 0.15 (Order text updated).
  - `mendCap`, `wardCap` and `clericOverhealShield` are now tunables.
- **Bosses:** damage budget 1.5 → 1.6, life ×0.6 → ×0.3. A boss is about a 30-50 s fight and fails by
  pressure, not the timer.
- **Enrage as backstop:** starts after 40 s (bosses 60 s) and doubles every 8 s (was 25/45 s, doubling every
  4 s).
- **World scale:** enemy life base 100 → 160, attack 122 → 195. That moves the walls back to the timeline
  targets without changing hit sizes. Tutorial region life ×0.6 and attack ramp start 0.06 keep floors 1-10
  as before.
- **Healer XP:** base 250, growth 1.2. There is more healing to earn XP from now.
- **Tools.** `deaths.ts` now reports hits, frontier wipes and deaths per minute. The Lifebloom test keeps
  the tank healthy (faster enemy swings killed him and muddied the measurement).

### Deaths: before and after (`deaths.ts --minutes 240`, floors > 10)

| | Skilled before | Skilled after (2 seeds) | Casual before | Casual after (2 seeds) |
|---|---|---|---|---|
| One-shots among non-enraged deaths | 89% | **3-4%** | 79% | **1%** |
| Median non-enraged killing blow | 110% of max life | **31-34%** | 133% | **24-28%** |
| Frontier hits, ordinary (median / p90) | 38% / 57% | **27-29% / 41-43%** | 39% / 56% | **17-18% / 31-32%** |
| Frontier hits, heavy (median / p90) | 68% / 109% | **47-49% / 67-76%** | 81% / 175% | **42-55% / 72-76%** |
| Frontier wipes under enrage | 100% (58 s fights) | **10-24%** (11 s) | 90% (54 s) | **0-1%** (5 s) |
| Hero deaths per minute, pushing / farming | 5.5 / 0.5 | **3.0-3.8 / 0.7-1.4** | 7.2 / 3.4 | 11-12 / 0.1-0.7 |

**By band (skilled):**
- F11-50: non-enraged one-shots 0-6%, median blow 20-39%.
- Deeper skilled bands (F51-90) have small samples. Non-enraged one-shots there are 0-50%, and most deep
  deaths come under enrage: very strong late healing still pushes into floors where the timer decides
  (see feel calls).

**Healing matters** (power each bot needs at the F36-40 segment; lower is easier):
- **Skill:** idle 8.4×, casual 4.8×, skilled 2.2×. Skilled play is worth about ×3.8 at the same gold
  (about 11 floors).
- **Acolytes:** removing them doubles what idle needs (×1.9) and raises skilled's need ×1.6.
- **Talents:** worth ×1.14 for idle and ×1.34 for casual.
- **Mend and Ward upgrades:** worth ×1.12 for idle and ×1.24 for casual.
- Skilled readings for talents and upgrades are within the probe's noise.

### Pace now (`pace.ts --minutes 120`, seeds 1 and 2)

| | Skilled | Casual |
|---|---|---|
| Normal floor, F1-10 / 11-20 / 21-30 / 31-40 / 41-50 | 9 / 10-11 / 13-14 / 18 / 20-24 s | 8 / 8 / 9 s |
| Boss, F10 / 20 / 30 / 40 | 7 / 25-30 / 28-42 / 43-50 s | 9-10 / 13-15 s |
| Purchases/min, 0-10 / 10-30 / 30-60 / 60-90 / 90-120 min | 13 / 3.7-3.8 / 7.1-8.1 / 7.9-8.3 / 12 | 9-11 / 3.1-4.3 / 2.0-2.5 / 5.7-7.8 / 5.5-7.2 |
| Longest gap without anything new | 3.9-5.7 min | 3.5-4.7 min |
| Deed payout (median) | 1.4-1.5 min of income | 1.3 min of income |

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

### Pace after pass 2 (superseded by pass 3)

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

## Resulting timelines (after pass 3)

40 hours each; skilled seeds 1/3, casual and idle seed 1. "F11" means the first boss has fallen.

| Milestone | Skilled | Casual | Idle |
|---|---|---|---|
| First boss down (F11) | 4.4-7.3 min | 9.5 min | 25 min (first wipe on F4) |
| F25 | **27-32 min** | 83 min | 158 min |
| First Pilgrimage | **44-47 min** (from F29-30) | 91 min | 166 min |
| F50 | **2.9 h** | 4.1 h | 8.3 h |
| F75 | 6.0-6.7 h | 8.6 h | 13.7 h |
| F100 | **12.7-15.2 h** | 20.9 h | 33.4 h |
| Best at 40 h | F140-144, still climbing | F134 | F115 (**80%** of skilled) |

No Pilgrimage gains more than 17-21 floors over the previous best.

**Healer levels** (skilled; casual about 30% slower early):

| Level | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|
| Time | 8-9 min | 21-22 min | 42-46 min | 1.9-2.2 h | 5.8-6 h | 12.4-13 h |

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

- **Enemy swing rate.** Instant attacks now come 4× as often for a quarter of the damage (every 0.2-0.5 s
  per enemy). That is what turns one-shots into pressure, but render and audio see many more `enemyAttack`
  and `heroHit` events. Batch or throttle hit sounds and floaters, or show damage as a stream.
- **Enrage** 40 s (bosses 60 s), doubling every 8 s. It is a backstop now: 10-24% of skilled frontier wipes,
  ~0% casual. On the deepest skilled floors it still decides more often (very strong late healing).
- **Casual collapse speed.** At a wall the casual party is worn down in ~5 s and logs ~11 hero deaths per
  pushing minute (it keeps re-trying; auto-retreat helps). Raise `retreatFarmClears`, or soften the casual
  wall, if that reads as too punishing. Skilled is ~3/min.
- **Heal numbers.** Mend now tops out at 30% of max life for 18 mana (talents, Quill and Deeds lower that).
  It reads as a "small, frequent" heal. If Mend should feel chunkier, raise `mendCap` together with enemy hit
  rate, not alone.
- **Hero roles.** Ilse and Wren are no longer glass (95 life); Tomas takes 80% damage. The roles now come
  from targeting, damage and quirks more than raw fragility.
- **Healer L20** at ~2 h (target 3-4 h): mid-game healing gives lots of XP. Raise `healerXpGrowth` to delay it.
- **Casual first Pilgrimage** at ~90 min (skilled ~45): the casual F11-25 climb is slow under real pressure.
- Still open from earlier passes: relic effects, the wipe fallback rule, and the bot's 30% late-game
  activity assumption.
