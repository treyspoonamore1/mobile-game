# Lifeline: design

*You're the healer. They're the heroes. Without you, they die on floor 3.*

An incremental dungeon crawler for phones, played in portrait with one thumb. A party of four
heroes fights down an endless descent on its own. The player never attacks: they keep the party
alive. The early game is frantic manual healing; the later game is upgrade and automation
management.

## Pillars

1. **Support is the skill.** Every input is a heal, a shield or a save. A Perfect Ward is the best
   moment in the game.
2. **From hands to engine.** Manual triage early; Acolytes with rules (Prayers) take over the
   routine later, and the player manages upgrades.
3. **Numbers climb.** Something is always getting bigger: gold, floors, Devotion.
4. **Readable on a phone.** Big frames, clear warning markers, chunky pixel art, haptics.
5. **Testable.** `src/sim` is pure and deterministic (seeded RNG, no DOM, no Date). Bots and the
   offline progress calculation use the same `step()` as the real game.

## Screen (portrait)

```
+---------------------------+
| Floor 7  Mossy Crypt  $1.2K|  top bar (DOM)
|                           |
|   [party]      [enemies]  |  fight scene (canvas, pixel art)
|        healer             |
+---------------------------+
| [Tomas  ███████░░  ⚠]     |
| [Brann  ████░░░░░     ]   |  party frames (canvas, touch)
| [Ilse   █████████     ]   |
| [Wren   ██████░░░     ]   |
| mana ██████░░   [SANCT]   |
+---------------------------+
| Fight Heroes Spells Acoly…|  nav (DOM); tabs open bottom sheets over the frames
+---------------------------+
```

## Controls (party frames)

| Gesture | Spell |
|---|---|
| Tap a frame | **Mend**: heal that hero for a % of their max life |
| Hold a frame (≥ 0.2 s) | **Ward**: a shield worth a % of max life for 6 s |
| Swipe across 2+ frames | **Chain Mend**: heal every frame touched (weaker each) |
| Tap a downed hero | **Revive** (expensive) |
| Tap the Sanctuary button at full Resonance | Heal everyone 50% and cut damage taken by 70% for 3 s |

**Perfect Ward**: a heavy or area attack is telegraphed with a warning marker on the target's
frame. A Ward applied in the last 0.5 s before it lands blocks it completely, refunds its mana and
gives Resonance, with slow motion, a haptic thunk and an in-key chime.

**Save**: a hero survives a hit that would have killed them without your recent heal or shield.

## Heroes

| Hero | Role | Quirk |
|---|---|---|
| Tomas | Tank | Taunts: basic attacks target him. Takes 30% less damage |
| Brann | Berserker | Up to +150% damage as his life drops. Keep him low, not full |
| Ilse | Mage | Glass cannon. Her bolts hit every enemy |
| Wren | Ranger | Dodges 20% of basic attacks, 20% crit chance |

Downed heroes come back at 25% life on the next floor. If the whole party falls, it's a **wipe**:
back to the last checkpoint (every 5 floors) with full life.

## Floors

Regions of 10 floors, floor 10 of each is a boss: Mossy Crypt, Fungal Hollow, Frost Depths, Ember
Forge, The Abyss. After floor 50 the regions repeat at a deeper Depth (tinted, still scaling).

## Progression

- **Gold** (from kills): hero levels, spell upgrades, Acolytes.
- **Relics**: each boss offers a pick of 1 of 3. Kept until the next Pilgrimage.
- **Acolytes**: from floor 10. Each automatically casts by a **Prayer** (rule), e.g. "Mend the
  lowest ally under 50%", "Ward whoever is targeted by a heavy attack", "Keep a Ward on the tank".
- **Pilgrimage** (prestige, from floor 25): reset gold, levels, upgrades and relics; gain
  **Devotion** for permanent upgrades and new Orders.
- **Orders** (healer classes, chosen at a Pilgrimage): Cleric (default), Chronomancer (hold =
  Rewind a hero's last 3 s of damage), Bard (taps on the beat heal more; hold = Anthem).
- **Offline**: the party keeps descending with your Acolytes while the app is closed.

All tunable numbers live in `src/sim/tuning.ts` and the data modules in `src/sim/data/`.
