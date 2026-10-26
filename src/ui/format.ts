/** Short number format: 950, 1.2K, 3.4M, 5.6B, then 1.2e12. */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const neg = n < 0;
  const a = Math.abs(n);
  let s: string;
  if (a < 1000) s = a < 10 && a % 1 !== 0 ? trim(a.toFixed(1)) : String(Math.floor(a));
  else if (a < 1e12) {
    const units = ['K', 'M', 'B'];
    let i = Math.floor(Math.log10(a) / 3);
    let v = a / Math.pow(1000, i);
    // 999.96K must read 1.0M, not 1000.0K.
    if (Number(v.toFixed(v < 100 ? 1 : 0)) >= 1000) {
      i++;
      v /= 1000;
    }
    s = i - 1 < units.length ? trim(v.toFixed(v < 100 ? 1 : 0)) + units[i - 1] : sci(a);
  } else s = sci(a);
  return neg ? '-' + s : s;
}

function sci(a: number): string {
  const [m, e] = a.toExponential(1).split('e');
  return `${trim(m!)}e${Number(e)}`;
}

function trim(s: string): string {
  return s.includes('.') ? s.replace(/\.0$/, '') : s;
}

/** "45%" from 0.45; one decimal below 10%. */
export function pct(f: number): string {
  const v = f * 100;
  return (v < 10 && v % 1 !== 0 ? trim(v.toFixed(1)) : String(Math.round(v))) + '%';
}

/** "2h 15m", "14m", "45s". */
export function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** One decimal for small numbers (mana regen, seconds). */
export function dec(n: number): string {
  return n < 100 ? trim(n.toFixed(1)) : fmt(n);
}

export function roman(n: number): string {
  return ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] ?? String(n);
}
