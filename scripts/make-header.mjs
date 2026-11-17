// Builds header.svg for the GitHub profile README: the NEV logo and roles on the left, the v6
// point-cloud portrait on the right. The dots fly in from scattered positions and settle into the
// face, then a few keep twinkling. No script: CSS animations only (GitHub shows it as an <img>).
// Usage (from the repo root; the source is v6's point-cloud image, see CLAUDE.md):
//   swift scripts/dump-rgba.swift ../v6.nevcan.com/public/media/nev-points.png points.rgba
//   node scripts/make-header.mjs points.rgba 400 header.svg
import fs from 'node:fs';

const [, , rgbaPath, sizeArg, out] = process.argv;
const S = Number(sizeArg);
const px = fs.readFileSync(rgbaPath);

// same tuning as v6's PointCloud.astro, thinned a little to keep the file small
const DENSITY = [0.01, 0.42];
const DENSITY_CURVE = 1.6;
const CONTRAST = [0.06, 0.95];
const ALPHA = [0.14, 1];
const STEPS = 6;

let seed = 1;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const W = 1200;
const H = 420;
const FACE = 560; // portrait size in px
const CX = 900; // portrait centre
const CY = 246;

const pts = [];
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    if (px[i + 3] < 128) continue;
    const raw = px[i] / px[i + 3]; // un-premultiply
    const lum = Math.min(1, Math.max(0, (raw - CONTRAST[0]) / (CONTRAST[1] - CONTRAST[0])));
    if (rand() > DENSITY[0] + (DENSITY[1] - DENSITY[0]) * lum ** DENSITY_CURVE) continue;
    const u = (x + rand()) / S;
    const v = (y + rand()) / S;
    const edge = Math.max(0, Math.min(1, (1 - v) / 0.28, u / 0.1, (1 - u) / 0.1));
    const a = (ALPHA[0] + (ALPHA[1] - ALPHA[0]) * lum) * edge;
    if (a < 0.05) continue;
    const hx = CX + (u - 0.5) * FACE;
    const hy = CY + (v - 0.5) * FACE;
    if (hy > H + 4 || hx > W + 4) continue;
    pts.push({ hx, hy, a });
  }
}

const f = (n) => Math.round(n * 10) / 10;
const buckets = Array.from({ length: STEPS }, () => []);
for (const p of pts) {
  // start: scattered around, mostly from the left (where the text is), like a swarm arriving
  const ang = rand() * Math.PI * 2;
  const dist = 120 + rand() * 380;
  const dx = f(Math.cos(ang) * dist - 160 * rand());
  const dy = f(Math.sin(ang) * dist * 0.6);
  const delay = f(rand() * 1.1 + ((p.hy - 0) / H) * 0.5);
  const tw = rand() < 0.08 ? ` class="t${1 + Math.floor(rand() * 3)}"` : '';
  const r = f(0.9 + p.a * 0.75);
  buckets[Math.min(STEPS - 1, Math.floor(p.a * STEPS))].push(
    `<circle cx="${f(p.hx)}" cy="${f(p.hy)}" r="${r}"${tw} style="--x:${dx}px;--y:${dy}px;--d:${delay}s"/>`,
  );
}

const groups = buckets
  .map((list, b) => `<g fill-opacity="${((b + 0.5) / STEPS).toFixed(2)}">${list.join('')}</g>`)
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Nevcan Uludaş: CTPO at Dipnot, front-end architect, GUE instructor trainer">
<style>
  .c circle { fill: #eef2f5; animation: in 2.4s cubic-bezier(.22,.8,.24,1) var(--d) both; }
  .c circle.t1 { animation: in 2.4s cubic-bezier(.22,.8,.24,1) var(--d) both, tw 3.1s ease-in-out 3.6s infinite; }
  .c circle.t2 { animation: in 2.4s cubic-bezier(.22,.8,.24,1) var(--d) both, tw 4.3s ease-in-out 4.2s infinite; }
  .c circle.t3 { animation: in 2.4s cubic-bezier(.22,.8,.24,1) var(--d) both, tw 5.2s ease-in-out 4.8s infinite; }
  @keyframes in { from { transform: translate(var(--x), var(--y)); opacity: 0; } 30% { opacity: 1; } to { transform: none; opacity: 1; } }
  @keyframes tw { 0%, 100% { opacity: 1; } 50% { opacity: .15; } }
  .txt { font-family: Inter, 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
  .fade { animation: fade 1.2s ease .2s both; }
  .fade2 { animation: fade 1.2s ease .6s both; }
  @keyframes fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .c circle, .fade, .fade2 { animation: none !important; } }
</style>
<defs>
  <radialGradient id="glow" cx="76%" cy="50%" r="55%">
    <stop offset="0" stop-color="#6ff7e0" stop-opacity="0.08"/>
    <stop offset="1" stop-color="#6ff7e0" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="24"/></clipPath>
</defs>
<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="#01050a"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <g class="c">
${groups}
  </g>
  <g class="fade">
    <svg x="72" y="92" width="300" height="102" viewBox="316 253 771 262">
      <path d="M350 283 533 485V283M624 283h159M624 384h159M624 485h159M874 283v202l183-202" fill="none" stroke="#eef2f5" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="353" cy="478" r="27" fill="#6ff7e0"/>
    </svg>
  </g>
  <g class="txt fade2">
    <text x="76" y="252" fill="#eef2f5" font-size="30" font-weight="600" letter-spacing="-0.3">Nevcan Uludaş</text>
    <text x="76" y="292" fill="#8b97a3" font-size="20">CTPO <tspan fill="#6ff7e0">@</tspan> Dipnot · Front-end architect</text>
    <text x="76" y="322" fill="#8b97a3" font-size="20">GUE Instructor Trainer</text>
    <text x="76" y="368" fill="#4c5763" font-size="15" letter-spacing="1.5">ISTANBUL · BUILDING FOR THE WEB SINCE 2006</text>
  </g>
</g>
</svg>
`;
fs.writeFileSync(out, svg);
console.log(`${pts.length} dots, ${(svg.length / 1024).toFixed(0)} KB`);
