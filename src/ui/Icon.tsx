import { getFrames, getIcon, spriteSize } from '../render/art/index.ts';
import type { HeroId } from '../sim/data/heroes.ts';
import type { IconName } from '../sim/data/icons.ts';

const cache = new Map<string, string | null>();

/** A canvas as a data URL, or null if it is blank (art not drawn yet). Cached per key. */
function toUrl(key: string, make: () => HTMLCanvasElement | undefined): string | null {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url: string | null = null;
  try {
    const c = make();
    if (c && c.width > 0 && !blank(c)) url = c.toDataURL();
  } catch {
    url = null;
  }
  cache.set(key, url);
  return url;
}

function blank(c: HTMLCanvasElement): boolean {
  const ctx = c.getContext('2d');
  if (!ctx) return true;
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return false;
  return true;
}

interface IconProps {
  id: IconName;
  /** Integer scale: 12px art times this. */
  scale?: number;
  class?: string;
}

/** A 12x12 pixel icon, scaled up crisply. */
export function Icon({ id, scale = 2, class: cls }: IconProps) {
  const url = toUrl('i:' + id, () => (getIcon as (id: string) => HTMLCanvasElement)(id));
  const size = 12 * scale;
  if (!url) {
    return (
      <span class={`icon icon-fallback ${cls ?? ''}`} style={{ width: size, height: size, fontSize: size * 0.6 }}>
        {id[0]!.toUpperCase()}
      </span>
    );
  }
  return <img class={`icon ${cls ?? ''}`} src={url} width={size} height={size} alt="" draggable={false} />;
}

/** A sprite's first idle frame (heroes are 16x16), scaled up crisply. */
export function HeroSprite({ id, scale = 3, depth = 0 }: { id: HeroId | string; scale?: number; depth?: number }) {
  const url = toUrl(`h:${id}:${depth}`, () => getFrames(id, 'idle', depth)[0]);
  const { w, h } = spriteSize(id);
  if (!url) {
    return (
      <span class="icon icon-fallback" style={{ width: w * scale, height: h * scale, fontSize: h * scale * 0.5 }}>
        {id[0]!.toUpperCase()}
      </span>
    );
  }
  return <img class="icon" src={url} width={w * scale} height={h * scale} alt="" draggable={false} />;
}
