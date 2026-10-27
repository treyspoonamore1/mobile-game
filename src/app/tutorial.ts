import { aliveHeroes } from '../sim/combat.ts';
import { orderDef } from '../sim/data/orders.ts';
import { isMech, MECH_INFO, type MechKind } from '../sim/data/mechanics.ts';
import { heroCost } from '../meta/shop.ts';
import { incomingOn, type FightState, type SimEvent } from '../sim/state.ts';
import { T } from '../sim/tuning.ts';
import type { Game, Hint } from './game.ts';

/** Contextual coaching for the first session. Returns a time scale (slow motion while teaching Wards). */
export class Coach {
  private mends = 0;
  private holdSeen = 0;
  private telegraphSlow = 0;
  /** A boss mechanic being taught right now. */
  private mechHint: { kind: MechKind; until: number; targets: number[] } | null = null;

  constructor(private game: Game) {}

  private done(id: string): boolean {
    return !!this.game.save.tutorial[id];
  }

  private finish(id: string): void {
    this.game.save.tutorial[id] = true;
    if (this.game.hint.value?.id === id) this.game.hint.value = null;
  }

  onEvents(s: FightState, events: readonly SimEvent[]): void {
    const hold = orderDef(s.loadout.order).hold;
    for (const e of events) {
      if (e.type === 'heal' && e.by === 'player' && e.kind === 'mend') {
        this.mends++;
        if (this.mends >= 3) this.finish('tap');
      }
      if (e.type === 'heal' && e.kind === 'chain') this.finish('swipe');
      if ((e.type === 'shield' && e.by === 'player') || e.type === 'anthem' || (e.type === 'heal' && e.kind === 'rewind')) {
        this.finish('hold');
        this.telegraphSlow = 0;
      }
      if (e.type === 'perfect' && !this.done('perfect')) {
        this.finish('perfect');
        this.game.toast(`Perfect ${hold}! Timing it at the last moment blocks the whole blow.`, 'gold');
      }
      if (e.type === 'revive' && e.by === 'player') this.finish('revive');
      if (e.type === 'sanctuary') this.finish('sanctuary');
      if (e.type === 'telegraph' && !this.done('hold') && this.done('tap')) {
        this.holdSeen++;
        if (this.holdSeen > 4) this.finish('hold');
        else this.telegraphSlow = 1;
      }
      if (e.type === 'floorClear') {
        this.finish('revive');
        if (this.game.hint.value?.id === 'revive') this.game.hint.value = null;
      }
      if (e.type === 'wipe') this.game.save.tutorial.wiped = true;
      if (e.type === 'telegraph') {
        const w = s.enemies[e.enemy]?.windup;
        if (w && isMech(w.attack) && !this.done(`mech_${w.attack.mech}`)) {
          this.game.save.tutorial[`mech_${w.attack.mech}`] = true;
          this.mechHint = { kind: w.attack.mech, until: s.t + w.total + 0.5, targets: w.targets };
        }
      }
      if (e.type === 'retreat') {
        this.game.toast(`Floor ${e.wall} is too tough for now. Level up in Party, or learn talents, to break through.`, 'info');
      }
    }
  }

  /** Pick the hint to show now. Returns the sim time scale. */
  update(s: FightState): number {
    const g = this.game;
    const save = g.save;
    const hold = orderDef(s.loadout.order).hold;
    let hint: Hint | null = null;
    let scale = 1;
    const lowest = aliveHeroes(s).reduce<number | null>(
      (a, b) => (a === null || s.heroes[b]!.hp / s.heroes[b]!.stats.maxHp < s.heroes[a]!.hp / s.heroes[a]!.stats.maxHp ? b : a), null);

    if (!this.done('hold') && this.telegraphSlow > 0) {
      const target = s.heroes.findIndex((_, i) => incomingOn(s, i));
      if (target >= 0) {
        hint = { id: 'hold', text: `Heavy blow incoming! Press and HOLD ${s.heroes[target]!.stats.def.name} to ${hold}.`, hero: target };
        scale = 0.3;
      } else {
        this.telegraphSlow = 0;
      }
    }
    if (!hint && this.mechHint) {
      if (s.t > this.mechHint.until || s.phase !== 'fight') this.mechHint = null;
      else {
        const info = MECH_INFO[this.mechHint.kind];
        hint = { id: `mech_${this.mechHint.kind}`, text: `${info.name}! ${info.hint}`, hero: this.mechHint.targets[0] };
        scale = 0.45;
      }
    }
    if (!hint && !this.done('tap') && s.phase === 'fight' && lowest !== null) {
      hint = { id: 'tap', text: 'Your heroes fight on their own. You keep them alive: TAP a hero to Mend them.', hero: lowest };
    }
    if (!hint && !this.done('revive') && s.heroes.some((h) => !h.alive) && s.phase === 'fight') {
      const i = s.heroes.findIndex((h) => !h.alive);
      hint = { id: 'revive', text: `Tap a fallen hero to Revive them (${T.reviveCost} mana). They also rise on the next floor.`, hero: i };
    }
    if (!hint && !this.done('sanctuary') && s.resonance >= T.resonanceMax) {
      hint = { id: 'sanctuary', text: 'Resonance is full! Tap SANCTUARY to heal everyone and blunt the damage.' };
    }
    if (!hint && !this.done('swipe') && this.done('tap') && s.phase === 'fight') {
      const hurt = aliveHeroes(s).filter((i) => s.heroes[i]!.hp / s.heroes[i]!.stats.maxHp < 0.6);
      if (hurt.length >= 2) hint = { id: 'swipe', text: 'Several heroes hurt? SWIPE across their frames to Chain Mend them all.', hero: hurt[0] };
    }
    if (!hint && !this.done('levelup') && (save.tutorial.wiped || save.floor >= 4)) {
      const cheapest = Math.min(...Object.entries(save.progress.heroLevels).map(([id, l]) => heroCost(id as 'tomas', l)));
      if (save.gold >= cheapest) hint = { id: 'levelup', text: 'You have gold! Open Party to level up your heroes.', tab: 'party' };
    }
    const cur = g.hint.value;
    if ((cur?.id ?? null) !== (hint?.id ?? null) || cur?.hero !== hint?.hero) g.hint.value = hint;
    return scale;
  }

  boughtHero(): void {
    this.finish('levelup');
  }
}
