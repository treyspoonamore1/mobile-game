import type { IconName } from './icons.ts';

export type TalentBranch = 'mercy' | 'aegis' | 'grace';

export type TalentId =
  | 'swift_hands' | 'second_touch' | 'triage' | 'overflow' | 'lifebloom'
  | 'thick_ward' | 'wide_window' | 'riposte' | 'lingering' | 'bastion'
  | 'deep_breath' | 'battle_hymn' | 'resonant' | 'shepherd' | 'swift_prayers' | 'miracle';

export interface TalentDef {
  id: TalentId;
  name: string;
  branch: TalentBranch;
  icon: IconName;
  /** Points needed in this branch before it can be learned. */
  requires: number;
  maxRank: number;
  /** Effect per rank (the meaning depends on the talent). */
  per: number;
  /** Shop text; `{v}` is replaced by the total at a rank. */
  text: string;
}

export const TALENT_BRANCHES: { id: TalentBranch; name: string; text: string; color: string }[] = [
  { id: 'mercy', name: 'Mercy', text: 'Mending', color: '#7ee07e' },
  { id: 'aegis', name: 'Aegis', text: 'Wards and Perfects', color: '#8fd3ff' },
  { id: 'grace', name: 'Grace', text: 'Mana, Resonance and the party', color: '#ffcf4a' },
];

/** Branch points needed for each tier. */
export const TALENT_TIERS = [0, 3, 6, 10];

export const TALENTS = [
  // Mercy
  { id: 'swift_hands', name: 'Swift Hands', branch: 'mercy', icon: 'mend', requires: 0, maxRank: 5, per: 0.05, text: 'Mend costs {v} less mana.' },
  { id: 'second_touch', name: 'Second Touch', branch: 'mercy', icon: 'chain', requires: 3, maxRank: 3, per: 0.12, text: 'Mend has a {v} chance to also heal the next most hurt hero for half.' },
  { id: 'triage', name: 'Triage', branch: 'mercy', icon: 'heart', requires: 3, maxRank: 3, per: 0.15, text: 'Mend heals {v} more on heroes under 30% life.' },
  { id: 'overflow', name: 'Overflow', branch: 'mercy', icon: 'chalice', requires: 6, maxRank: 2, per: 0.35, text: '{v} of your overhealing splashes onto the most hurt hero.' },
  { id: 'lifebloom', name: 'Lifebloom', branch: 'mercy', icon: 'star', requires: 10, maxRank: 1, per: 1, text: 'Chain Mend leaves a bloom that heals 30% more over 3 s.' },
  // Aegis
  { id: 'thick_ward', name: 'Thick Ward', branch: 'aegis', icon: 'ward', requires: 0, maxRank: 5, per: 0.08, text: 'Wards absorb {v} more.' },
  { id: 'wide_window', name: 'Steady Hands', branch: 'aegis', icon: 'clock', requires: 3, maxRank: 3, per: 0.06, text: 'The Perfect window is {s} longer.' },
  { id: 'lingering', name: 'Lingering Light', branch: 'aegis', icon: 'shield', requires: 3, maxRank: 2, per: 1.5, text: 'Wards last {s} longer.' },
  { id: 'riposte', name: 'Riposte', branch: 'aegis', icon: 'sword', requires: 6, maxRank: 2, per: 1, text: 'A Perfect stuns the attacker for {s}.' },
  { id: 'bastion', name: 'Bastion', branch: 'aegis', icon: 'sanctuary', requires: 10, maxRank: 1, per: 0.2, text: 'A Perfect Wards the whole party for 20% of their life.' },
  // Grace
  { id: 'deep_breath', name: 'Deep Breath', branch: 'grace', icon: 'mana', requires: 0, maxRank: 5, per: 0.06, text: '{v} more max mana and mana regeneration.' },
  { id: 'battle_hymn', name: 'Battle Hymn', branch: 'grace', icon: 'note', requires: 0, maxRank: 5, per: 0.05, text: 'Heroes deal {v} more damage.' },
  { id: 'resonant', name: 'Resonance', branch: 'grace', icon: 'bell', requires: 3, maxRank: 3, per: 0.12, text: '{v} more Resonance from every source.' },
  { id: 'shepherd', name: 'Shepherd', branch: 'grace', icon: 'acolyte', requires: 6, maxRank: 3, per: 0.1, text: 'Acolytes heal and Ward {v} more.' },
  { id: 'swift_prayers', name: 'Swift Prayers', branch: 'grace', icon: 'pilgrim', requires: 6, maxRank: 3, per: 0.06, text: 'Acolytes cast {v} faster.' },
  { id: 'miracle', name: 'Miracle', branch: 'grace', icon: 'revive', requires: 10, maxRank: 1, per: 0.3, text: 'Sanctuary also raises fallen heroes at 30% life.' },
] as const satisfies readonly TalentDef[];

export type Talents = Partial<Record<TalentId, number>>;

export function talentDef(id: TalentId): TalentDef {
  return TALENTS.find((t) => t.id === id)!;
}

export function rank(t: Talents, id: TalentId): number {
  return t[id] ?? 0;
}

/** Total effect of a talent: rank × per. */
export function talentValue(t: Talents, id: TalentId): number {
  return rank(t, id) * talentDef(id).per;
}

export function branchPoints(t: Talents, branch: TalentBranch): number {
  return TALENTS.filter((d) => d.branch === branch).reduce((a, d) => a + rank(t, d.id), 0);
}

export function spentPoints(t: Talents): number {
  return TALENTS.reduce((a, d) => a + rank(t, d.id), 0);
}

/** Shop text for a talent at a rank (at least 1, so locked talents still read sensibly). */
export function talentText(id: TalentId, r: number): string {
  const d = talentDef(id);
  const v = Math.max(1, r) * d.per;
  return d.text.replace('{v}', `${Math.round(v * 100)}%`).replace('{s}', `${+v.toFixed(2)} s`);
}

/** Can one more rank be learned with `points` unspent? */
export function canLearn(t: Talents, id: TalentId, unspent: number): boolean {
  const d = talentDef(id);
  return unspent > 0 && rank(t, id) < d.maxRank && branchPoints(t, d.branch) >= d.requires;
}
