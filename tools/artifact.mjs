// Turn the single-file build into page content for a claude.ai Artifact (which supplies its own
// <html>/<head>/<body> skeleton): keep the title, styles and inlined scripts, drop the wrappers.
//   npm run build:single && node tools/artifact.mjs <out.html>
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] ?? '';
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? '';
const keep = head
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '')
  .replace(/<link rel="(icon|apple-touch-icon)"[^>]*>/gi, '');
const out = `${keep.trim()}\n${body.trim()}\n`;
if (!out.includes('<title>')) throw new Error('no title');
writeFileSync(process.argv[2], out);
console.log(`wrote ${process.argv[2]} (${(out.length / 1024).toFixed(0)} KB)`);
