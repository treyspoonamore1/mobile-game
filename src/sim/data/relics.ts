import type { IconName } from './icons.ts';

export type RelicId =
  | 'sunstone' | 'bell_of_dawn' | 'tithe_ring' | 'quill' | 'chalice' | 'hourglass' | 'war_banner'
  | 'candle' | 'tome_of_echoes' | 'thorn_amulet' | 'warding_orb' | 'crown' | 'blood_totem'
  | 'star_gem' | 'rosary' | 'phoenix' | 'resonant_bell' | 'iron_vow';

export interface RelicDef {
  id: RelicId;
  name: string;
  text: string;
  icon: IconName;
  color: string;
}

export const RELICS = [
  { id: 'sunstone', name: 'Sunstone', icon: 'gem', color: '#ffd966', text: 'Half of your overhealing becomes a Ward.' },
  { id: 'bell_of_dawn', name: 'Bell of Dawn', icon: 'bell', color: '#ffe599', text: 'Perfect Wards heal the whole party for 15%.' },
  { id: 'tithe_ring', name: 'Tithe Ring', icon: 'ring', color: '#f1c232', text: 'Every Save drops gold worth 3 kills.' },
  { id: 'quill', name: 'Saint\'s Quill', icon: 'feather', color: '#d9ead3', text: 'Mend costs 30% less mana.' },
  { id: 'chalice', name: 'Deep Chalice', icon: 'chalice', color: '#6fa8dc', text: '+50% max mana.' },
  { id: 'hourglass', name: 'Slow Hourglass', icon: 'hourglass', color: '#c9a66b', text: 'The Perfect window is 0.25 s longer.' },
  { id: 'war_banner', name: 'War Banner', icon: 'rune', color: '#e06666', text: 'Shielded heroes deal 40% more damage.' },
  { id: 'candle', name: 'Vigil Candle', icon: 'candle', color: '#ffe599', text: '+40% mana regeneration.' },
  { id: 'tome_of_echoes', name: 'Tome of Echoes', icon: 'tome', color: '#b4a7d6', text: 'Mend has a 25% chance to heal twice.' },
  { id: 'thorn_amulet', name: 'Thorn Amulet', icon: 'amulet', color: '#93c47d', text: 'Wards strike back for 150% of what they absorb.' },
  { id: 'warding_orb', name: 'Warding Orb', icon: 'orb', color: '#9fc5e8', text: 'Wards are 50% stronger.' },
  { id: 'crown', name: 'Miser\'s Crown', icon: 'crown', color: '#f1c232', text: '+50% gold.' },
  { id: 'blood_totem', name: 'Blood Totem', icon: 'rune', color: '#cc0000', text: 'Brann\'s rage is doubled.' },
  { id: 'star_gem', name: 'Star Gem', icon: 'gem', color: '#b48ce6', text: 'Ilse deals 60% more damage and has 30% more life.' },
  { id: 'rosary', name: 'Pilgrim\'s Rosary', icon: 'amulet', color: '#d5a6bd', text: 'Acolytes cast 30% faster.' },
  { id: 'phoenix', name: 'Phoenix Plume', icon: 'feather', color: '#f6b26b', text: 'Once per floor, a falling hero rises again at 30%.' },
  { id: 'resonant_bell', name: 'Resonant Bell', icon: 'bell', color: '#8e7cc3', text: '+60% Resonance from every source.' },
  { id: 'iron_vow', name: 'Iron Vow', icon: 'shield', color: '#a4c2f4', text: 'Tomas takes a further 25% less damage.' },
] as const satisfies readonly RelicDef[];

export function relicDef(id: RelicId): RelicDef {
  return RELICS.find((r) => r.id === id)!;
}
