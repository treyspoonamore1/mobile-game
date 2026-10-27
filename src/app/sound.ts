import { haptic, playPerfect, playSfx } from '../audio/index.ts';
import type { SimEvent } from '../sim/state.ts';

/** Map one tick's sim events to sounds and haptics. */
export function soundEvents(events: readonly SimEvent[]): void {
  let chained = false;
  for (const e of events) {
    switch (e.type) {
      case 'judged':
        playSfx(e.passed ? 'perfect' : 'hit_hero_big', e.passed ? { vol: 0.5, pitch: 0.8 } : undefined);
        if (!e.passed) haptic('hit');
        break;
      case 'plague':
      case 'frostbite':
        playSfx('telegraph', { pitch: 0.8 });
        break;
      case 'plagueBurst':
        playSfx('poison');
        haptic('hit');
        break;
      case 'cure':
      case 'thaw':
        playSfx('cleanse');
        break;
      case 'siphon':
        playSfx('oom', { pitch: 0.7 });
        haptic('boss');
        break;
      case 'siphoned':
        playSfx('oom');
        haptic('hit');
        break;
      case 'stun':
        playSfx('crit', { pitch: 0.7, vol: 0.6 });
        break;
      case 'heal':
        if (e.kind === 'bloom') break;
        if (e.kind === 'chain') {
          if (!chained) playSfx('chain');
          chained = true;
        } else if (e.kind === 'rewind') playSfx('heal_big', { pitch: 0.8 });
        else if (e.by === 'acolyte' || e.kind === 'splash') playSfx('heal', { vol: 0.35, pitch: 1.25 });
        else playSfx(e.beat ? 'heal_big' : 'heal');
        break;
      case 'shield':
        playSfx('shield', e.by === 'acolyte' ? { vol: 0.35, pitch: 1.2 } : undefined);
        if (e.by === 'player') haptic('shield');
        break;
      case 'perfect':
        playPerfect(e.streak);
        haptic('perfect');
        break;
      case 'save':
        playSfx('save');
        haptic('save');
        break;
      case 'heroHit':
        if (e.poison) playSfx('poison', { vol: 0.4 });
        else if (e.big) {
          playSfx('hit_hero_big');
          haptic('hit');
        } else playSfx('hit_hero', { vol: 0.6 });
        break;
      case 'dodge':
        playSfx('dodge');
        break;
      case 'enemyHit':
        playSfx(e.crit ? 'crit' : 'hit_enemy', { vol: e.crit ? 0.7 : 0.4 });
        break;
      case 'enemyDie':
        playSfx('enemy_die');
        break;
      case 'gold':
        playSfx('gold', { vol: 0.5 });
        break;
      case 'heroDown':
        playSfx('hero_down');
        haptic('hit');
        break;
      case 'revive':
        playSfx('revive');
        break;
      case 'telegraph':
        playSfx('telegraph');
        break;
      case 'floorStart':
        if (e.boss) {
          playSfx('boss_appear');
          haptic('boss');
        }
        break;
      case 'floorClear':
        playSfx(e.boss ? 'boss_clear' : 'floor_clear');
        break;
      case 'wipe':
        playSfx('wipe');
        haptic('wipe');
        break;
      case 'oom':
        playSfx('oom');
        break;
      case 'sanctuary':
        playSfx('sanctuary');
        haptic('save');
        break;
      case 'encore':
        playSfx('save', { pitch: 1.3 });
        haptic('perfect');
        break;
      case 'anthem':
        playSfx('sanctuary', { pitch: 1.4, vol: 0.6 });
        break;
      case 'cleanse':
        playSfx('cleanse', { vol: 0.5 });
        break;
      default:
        break;
    }
  }
}
