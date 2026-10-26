export const FONT = "'Pixelify Sans', system-ui, sans-serif";

export interface TextOpts {
  size: number;
  color: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  outline?: string;
  outlineW?: number;
  weight?: number;
  alpha?: number;
}

/** Text with a hard outline, the pixel-game way. Coordinates in the context's current units. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TextOpts): void {
  ctx.save();
  ctx.font = `${o.weight ?? 600} ${o.size}px ${FONT}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'middle';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.outline) {
    ctx.strokeStyle = o.outline;
    ctx.lineWidth = o.outlineW ?? Math.max(2, o.size / 5);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = o.color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** 1234 → "1.2K". */
export function short(n: number): string {
  if (n < 1000) return Math.round(n).toString();
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  if (n >= 1000) return n.toExponential(1);
  return (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2)) + units[u];
}
