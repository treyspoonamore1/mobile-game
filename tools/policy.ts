// A plausible player's choices, shared by tools/balance.ts and tools/pace.ts: what to buy, which relic to
// take, which Prayers to set, which talents to learn and when to claim Deeds.
import { claimDeed, readyDeeds } from '../src/meta/deeds.ts';
import { autoEquip, mergeAll } from '../src/meta/gear.ts';
import { learnTalent, unspentPoints } from '../src/meta/healer.ts';
import { canPilgrimage, devotionFor } from '../src/meta/pilgrimage.ts';
import type { Save } from '../src/meta/save.ts';
import { pickRelic } from '../src/meta/session.ts';
import {
  buyDevotionUpgrade, buyGoldUpgrade, buyHero, devotionUpgradeCost, goldUpgradeCost, goldUpgradeVisible, heroCost,
} from '../src/meta/shop.ts';
import { deedDef, type DeedId } from '../src/sim/data/deeds.ts';
import { HERO_IDS } from '../src/sim/data/heroes.ts';
import { PRAYERS, type PrayerId } from '../src/sim/data/prayers.ts';
import type { RelicId } from '../src/sim/data/relics.ts';
import type { TalentId } from '../src/sim/data/talents.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES, type DevotionUpgradeId } from '../src/sim/data/upgrades.ts';
import { noviceBot, type Bot } from '../src/sim/bots.ts';
import { DT } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';

/** A casual player: the novice bot, but they also tap a fallen hero's grey frame when they have the mana. */
export function casualBot(): Bot {
  const base = noviceBot();
  let cd = 0;
  return (s) => {
    cd -= DT;
    const down = s.heroes.findIndex((h) => !h.alive);
    if (s.phase === 'fight' && down >= 0 && cd <= 0 && s.mana >= T.reviveCost && s.heroes.some((h) => h.alive)) {
      cd = 1.5;
      return [{ kind: 'mend', hero: down }];
    }
    return base(s);
  };
}

const PRAYER_PRIORITY: PrayerId[] = ['mend_lowest', 'ward_telegraphed', 'top_up', 'ward_tank', 'cleanse', 'mend_all', 'revive', 'mend_tank'];

export function assignPrayers(save: Save): void {
  const unlocked = PRAYER_PRIORITY.filter((id) => save.bestFloor >= PRAYERS.find((p) => p.id === id)!.unlockFloor);
  const n = acolyteSlots(save.progress);
  for (let i = 0; i < n; i++) save.progress.acolytes[i] = unlocked[i % unlocked.length]!;
}

/** Relic preference, strongest first (measured with tools/probe.ts --relics); unknown ones go last. */
const RELIC_PREFERENCE: RelicId[] = [
  'thorn_amulet', 'star_gem', 'war_banner', 'crown', 'iron_vow', 'rosary', 'tithe_ring', 'candle', 'phoenix',
  'warding_orb', 'resonant_bell', 'tome_of_echoes', 'chalice', 'quill', 'hourglass', 'bell_of_dawn', 'sunstone', 'blood_totem',
];
const relicRank = (id: RelicId) => {
  const i = RELIC_PREFERENCE.indexOf(id);
  return i < 0 ? RELIC_PREFERENCE.length : i;
};

/** Take the best relic of each pending offer. Returns how many were picked. */
export function pickRelics(save: Save): number {
  let n = 0;
  while (save.relicOffers.length > 0) {
    const offer = save.relicOffers[0]!;
    pickRelic(save, [...offer].sort((a, b) => relicRank(a) - relicRank(b))[0]!);
    n++;
  }
  return n;
}

/** Greedy shopper: buy the cheapest useful thing until nothing is affordable. Returns the purchase count. */
export function shop(save: Save): number {
  let n = 0;
  for (let guard = 0; guard < 500; guard++) {
    const options: { cost: number; buy: () => void }[] = [];
    for (const id of HERO_IDS) options.push({ cost: heroCost(id, save.progress.heroLevels[id]) * 0.8, buy: () => buyHero(save, id, 1) });
    for (const u of GOLD_UPGRADES) {
      if (!goldUpgradeVisible(save, u.id)) continue;
      const c = goldUpgradeCost(save, u.id);
      if (c !== null) options.push({ cost: c * (u.id === 'aco_slot' ? 0.5 : 1), buy: () => buyGoldUpgrade(save, u.id) });
    }
    options.sort((a, b) => a.cost - b.cost);
    const best = options[0];
    if (!best) break;
    const goldBefore = save.gold;
    best.buy();
    if (save.gold === goldBefore) break;
    n++;
  }
  return n;
}

/** Devotion shopper: cheapest upgrade weighted by how much a player would value it. */
const DEVOTION_WEIGHT: Partial<Record<DevotionUpgradeId, number>> = {
  might: 0.5, fortune: 0.7, haste: 0.6, choir: 0.6, grace: 0.9, spirit: 1.2, vigil: 4, insight: 1.5, order_chrono: 1, order_bard: 3,
};
export function shopDevotion(save: Save): void {
  for (let guard = 0; guard < 400; guard++) {
    const opts = DEVOTION_UPGRADES.map((u) => ({ id: u.id, cost: devotionUpgradeCost(save, u.id) }))
      .filter((o): o is { id: DevotionUpgradeId; cost: number } => o.cost !== null && o.cost <= save.devotion)
      .sort((a, b) => a.cost * (DEVOTION_WEIGHT[a.id] ?? 1) - b.cost * (DEVOTION_WEIGHT[b.id] ?? 1));
    if (opts.length === 0) return;
    buyDevotionUpgrade(save, opts[0]!.id);
  }
}

/**
 * Talent order a sensible Cleric would follow: cheaper Mends and a little hero damage first, then Acolyte
 * support (the late game), then the Perfect and Mending trees. Each entry is one rank.
 */
const TALENT_ORDER: TalentId[] = [
  'swift_hands', 'battle_hymn', 'swift_hands', 'battle_hymn', 'thick_ward', 'battle_hymn', 'deep_breath',
  'battle_hymn', 'deep_breath', 'battle_hymn', 'resonant', 'shepherd', 'swift_prayers', 'shepherd', 'swift_prayers',
  'shepherd', 'swift_prayers', 'deep_breath', 'miracle', 'swift_hands', 'triage', 'second_touch', 'triage',
  'second_touch', 'swift_hands', 'overflow', 'thick_ward', 'thick_ward', 'wide_window', 'lingering', 'riposte',
  'resonant', 'overflow', 'triage', 'second_touch', 'lifebloom', 'thick_ward', 'wide_window', 'lingering',
  'riposte', 'bastion', 'resonant', 'deep_breath', 'swift_hands', 'wide_window', 'thick_ward',
];

/** Spend unspent talent points in TALENT_ORDER (skipping what can't be learned yet). Returns points spent. */
export function learnTalents(save: Save): number {
  let n = 0;
  for (let pass = 0; pass < 3 && unspentPoints(save) > 0; pass++) {
    for (const id of TALENT_ORDER) {
      if (unspentPoints(save) <= 0) break;
      const want = TALENT_ORDER.filter((x) => x === id).length;
      if ((save.progress.talents[id] ?? 0) >= want) continue;
      if (learnTalent(save, id)) n++;
    }
  }
  return n;
}

/** Claim every ready Deed tier. Returns what was claimed (for logs). */
export function claimDeeds(save: Save): { id: DeedId; name: string; tier: number; gold: number }[] {
  const out: { id: DeedId; name: string; tier: number; gold: number }[] = [];
  for (let guard = 0; guard < 50; guard++) {
    const ready = readyDeeds(save);
    if (ready.length === 0) break;
    for (const id of ready) {
      const gold = claimDeed(save, id);
      if (gold !== null) out.push({ id, name: deedDef(id).name, tier: save.progress.deeds[id] ?? 0, gold });
    }
  }
  return out;
}

/**
 * When to go on Pilgrimage: only when this run has stopped climbing for 8+ minutes, and the gain is worth it
 * relative to all the Devotion earned so far (`earned`). The longer the player is stuck, the smaller a gain
 * they accept. They don't reset short of the last run's depth unless stuck for an hour.
 */
export function wantsPilgrimage(save: Save, stuckFor: number, earned: number, prevRunMax: number): boolean {
  if (!canPilgrimage(save)) return false;
  const gain = devotionFor(save.progress.maxFloor);
  if (gain <= 0) return false;
  const min = stuckFor / 60;
  if (min < 8) return false;
  if (save.progress.maxFloor < prevRunMax && min < 60) return false;
  const need = min >= 45 ? 0.15 : min >= 20 ? 0.3 : 0.6;
  return gain >= need * earned;
}

/**
 * Gear like a tidy player: merge every set of three, wear the best items, and once every slot is filled
 * stop keeping Worn drops (and Fine ones once every slot holds Runed or better). Returns true if worn gear
 * changed (the fight's loadout needs a refresh).
 */
export function manageGear(save: Save): boolean {
  const before = JSON.stringify(save.progress.equipped);
  mergeAll(save);
  autoEquip(save);
  const worn = Object.values(save.progress.equipped).flatMap((slots) => Object.values(slots ?? {}));
  const full = worn.length >= 12;
  const minRarity = full ? Math.min(...worn.map((it) => it!.rarity)) : -1;
  save.autoSalvageBelow = !full ? 0 : minRarity >= 2 ? 2 : 1;
  return JSON.stringify(save.progress.equipped) !== before;
}
