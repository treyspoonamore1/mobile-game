import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import type { Game } from '../app/game.ts';
import type { IconName } from '../sim/data/icons.ts';
import { fmt } from './format.ts';
import { Icon } from './Icon.tsx';

const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }, { transform: 'scale(1)' }];
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' },
  { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' },
];

export type BtnTone = 'gold' | 'blue' | 'purple' | 'plain' | 'red' | 'green';

interface BtnProps {
  game: Game;
  /** Return false when the press was refused (plays the "no" feedback). */
  onPress: () => boolean | void;
  tone?: BtnTone;
  /** Looks disabled but still takes presses, so a refused tap gets feedback. */
  dim?: boolean;
  /** Called instead of onPress when a dim button is pressed (e.g. to explain why). */
  onDim?: () => void;
  /** Fully disabled: no feedback, no press. */
  disabled?: boolean;
  big?: boolean;
  class?: string;
  label?: string;
  children: ComponentChildren;
}

/** The one button: chunky pixel bevel, press sinks, success pops, refusal shakes. */
export function Btn({ game, onPress, onDim, tone = 'gold', dim, disabled, big, class: cls, label, children }: BtnProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const press = () => {
    if (disabled) return;
    const ok = !dim && onPress() !== false;
    if (dim) onDim?.();
    game.uiTap(ok);
    ref.current?.animate?.(ok ? POP : SHAKE, { duration: ok ? 170 : 260, easing: 'ease-out' });
  };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      class={`btn btn-${tone} ${big ? 'btn-big' : ''} ${dim ? 'is-dim' : ''} ${cls ?? ''}`}
      disabled={disabled}
      onClick={press}
    >
      {children}
    </button>
  );
}

/** Price tag: coin (or Devotion) icon and short number. */
export function Cost({ amount, currency = 'gold' }: { amount: number; currency?: 'gold' | 'devotion' }) {
  return (
    <span class={`cost cost-${currency}`}>
      <Icon id={currency} scale={2} />
      {fmt(amount)}
    </span>
  );
}

export function Panel({ class: cls, children }: { class?: string; children: ComponentChildren }) {
  return <div class={`panel ${cls ?? ''}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: ComponentChildren }) {
  return <h3 class="section-title">{children}</h3>;
}

/** Square icon well used at the left of list cards. */
export function IconWell({ id, color, scale = 3 }: { id: IconName; color?: string; scale?: number }) {
  return (
    <div class="well" style={color ? { '--well': color } : undefined}>
      <Icon id={id} scale={scale} />
    </div>
  );
}

interface SegProps<T extends string | number> {
  game: Game;
  value: T;
  /** `dot` marks a segment with something waiting. */
  options: { value: T; label: string; dot?: boolean }[];
  onChange: (v: T) => void;
  class?: string;
}

/** Segmented toggle (e.g. x1 / x10 / Max). */
export function Seg<T extends string | number>({ game, value, options, onChange, class: cls }: SegProps<T>) {
  return (
    <div class={`seg ${cls ?? ''}`} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === value}
          class={`seg-btn ${o.value === value ? 'is-on' : ''}`}
          onClick={() => {
            game.uiTap(true);
            onChange(o.value);
          }}
        >
          {o.label}
          {o.dot && <span class="seg-dot" />}
        </button>
      ))}
    </div>
  );
}

/** A small "Lv 12" chip. */
export function Lv({ level, max }: { level: number; max?: number }) {
  return (
    <span class="lv">
      Lv {level}
      {max !== undefined && <span class="lv-max">/{max}</span>}
    </span>
  );
}

/** An on/off pixel switch. */
export function Toggle({ game, on, onChange, label }: { game: Game; on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      class={`toggle ${on ? 'is-on' : ''}`}
      onClick={() => {
        game.uiTap(true);
        onChange(!on);
      }}
    >
      <span class="toggle-knob" />
    </button>
  );
}

/**
 * Read the live save and subscribe this component to the game tick. Every component that reads the save
 * must call this: @preact/signals skips re-rendering children whose props are unchanged, so a parent
 * re-render alone does not reach them.
 */
export function useSave(game: Game) {
  game.version.value;
  return game.save;
}
