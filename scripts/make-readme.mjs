// Builds README.md for github.com/nevcanuludas. Badges come from shields.io in the v6 colours
// (background #01050a, logo #6ff7e0). Run from anywhere; writes ../README.md.
// `node scripts/make-readme.mjs --check` also fetches every badge and reports broken ones.
import fs from 'node:fs';

// Every badge comes in two versions and follows the viewer's GitHub theme (<picture>):
// dark = the v6 colours, light = the same palette inverted, with a deeper teal that reads on white.
const THEMES = {
  dark: { bg: '01050a', accent: '6ff7e0', ink: 'eef2f5' },
  light: { bg: 'eef2f5', accent: '0a8a7a', ink: '01050a' },
};

const svgLogo = (svg) => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
// own logos are drawn per theme (shields' logoColor only recolours its built-in icons)
const LOGO_N = (t) =>
  svgLogo(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="310 250 260 270"><path d="M350 283 533 485V283" fill="none" stroke="#${t.ink}" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/><circle cx="353" cy="478" r="34" fill="#${t.accent}"/></svg>`,
  );
const LOGO_IN = (t) =>
  svgLogo(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${t.accent}"><circle cx="5" cy="4.5" r="2.4"/><rect x="3" y="8.5" width="4" height="12.5" rx=".6"/><path d="M9.5 8.5h3.8v1.8c.8-1.3 2.3-2.2 4.3-2.2 3.4 0 4.9 2.1 4.9 5.9V21h-4v-6.4c0-1.9-.6-3-2.1-3-1.6 0-2.7 1.2-2.7 3.1V21h-4.2z"/></svg>`,
  );

const LOGO_MAIL = (t) =>
  svgLogo(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#${t.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>`,
  );

// Metashape has no Simple Icons logo: a neutral wireframe cube (photos → 3D model) instead
const LOGO_MESH = (t) =>
  svgLogo(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#${t.accent}" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7z"/><path d="M3.5 7 12 11.5 20.5 7M12 11.5v10"/><path d="M7.8 4.8 16.2 9.3M16.2 4.8 7.8 9.3" stroke-width="1" opacity=".55"/></svg>`,
  );

const esc = (s) => encodeURIComponent(s.replace(/-/g, '--').replace(/_/g, '__'));
const url = (text, logo, style, t) => {
  const l = typeof logo === 'function' ? logo(t) : logo;
  return (
    `https://img.shields.io/badge/${esc(text)}-${t.bg}?style=${style}` +
    (l ? `&logo=${encodeURIComponent(l)}&logoColor=${t.accent}` : '')
  );
};
const badge = (text, logo, style) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="${url(text, logo, style, THEMES.dark)}">` +
  `<img alt="${text}" src="${url(text, logo, style, THEMES.light)}"></picture>`;

// ---- links: where to go next ----
const links = [
  ['dev.nevcan.com', LOGO_N, 'https://dev.nevcan.com'],
  ['dive.nevcan.com', LOGO_N, 'https://dive.nevcan.com'],
  ['LinkedIn', LOGO_IN, 'https://www.linkedin.com/in/nevcanuludas'],
  ['hello@nevcan.com', LOGO_MAIL, 'mailto:hello@nevcan.com'],
];

// ---- technologies & tools: dev.nevcan.com/skills/stack.md ----
const stack = [
  ['Languages', [['TypeScript', 'typescript'], ['JavaScript', 'javascript'], ['Python', 'python'], ['HTML', 'html5'], ['CSS', 'css']]],
  ['Web', [['React', 'react'], ['Next.js', 'nextdotjs'], ['Astro', 'astro'], ['Eleventy', 'eleventy'], ['Tailwind CSS', 'tailwindcss'], ['shadcn/ui', 'shadcnui'], ['Three.js', 'threedotjs']]],
  ['Mobile', [['React Native · Expo', 'expo'], ['Garmin Connect IQ', 'garmin']]],
  ['Back end & data', [['Node.js', 'nodedotjs'], ['Firebase', 'firebase'], ['Supabase', 'supabase'], ['FastAPI', 'fastapi'], ['SQLite', 'sqlite']]],
  ['AI', [['Claude API', 'claude'], ['Computer vision', 'opencv']]],
  ['3D & imaging', [['Metashape', LOGO_MESH], ['Sketchfab', 'sketchfab']]],
  ['Quality', [['Vitest', 'vitest'], ['Jest', 'jest'], ['Testing Library', 'testinglibrary'], ['ESLint', 'eslint'], ['Prettier', 'prettier'], ['Ruff', 'ruff']]],
  ['Delivery', [['Git', 'git'], ['GitHub Actions', 'githubactions'], ['GitHub Pages', 'githubpages'], ['Vercel', 'vercel']]],
];

const linkRow = links
  .map(([t, logo, href]) => `<a href="${href}">${badge(t, logo, 'for-the-badge')}</a>`)
  .join('\n  ');

const stackRows = stack
  .map(
    ([group, items]) =>
      `| **${group}** | ${items.map(([t, logo]) => badge(t, logo, 'flat-square')).join(' ')} |`,
  )
  .join('\n');

// stats images are made by .github/workflows/metrics.yml, one per theme
const themed = (base, alt) =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}.dark.svg"><img alt="${alt}" src="${base}.light.svg" width="100%"></picture>`;

const readme = `<p align="center">
  <a href="https://www.nevcan.com"><img src="./header.svg" alt="Nevcan Uludaş: CTPO at Dipnot, front-end architect, GUE instructor trainer" width="100%"></a>
</p>

<p align="center">
  ${linkRow}
</p>

I've been building for the web since 2006: e-commerce at D&R, products at Doğuş Teknoloji, enterprise
software at SabancıDx. Today I'm co-founder & CTPO of [Dipnot](https://dipnot.app), running its
technology end to end as a one-person engineering team with AI-assisted development.

Underwater is the other half: I'm the only GUE instructor trainer in Türkiye, and my master's
thesis at Akdeniz University classifies Mediterranean amphorae with computer vision.

I love open source.

### Technologies & tools

| | |
| --- | --- |
${stackRows}

### Stats & habits

<p align="center">
  ${themed('./metrics/stats', 'GitHub stats: activity, repositories, languages, contribution calendar and coding habits')}
</p>

<p align="center">
  ${themed('./metrics/snake', 'A snake eating the contribution graph of the last year')}
</p>

<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="https://komarev.com/ghpvc/?username=nevcanuludas&label=profile%20views&color=01050a&style=flat-square"><img alt="Profile views" src="https://komarev.com/ghpvc/?username=nevcanuludas&label=profile%20views&color=0a8a7a&style=flat-square"></picture>
</p>
`;

fs.writeFileSync(new URL('../README.md', import.meta.url), readme);
console.log(`README.md: ${readme.length} chars`);

if (process.argv.includes('--check')) {
  const urls = [...readme.matchAll(/(?:src|srcset)="(https:\/\/img\.shields\.io[^"]+)"/g)].map((m) => m[1]);
  const bad = [];
  await Promise.all(
    urls.map(async (u) => {
      const t = await (await fetch(u)).text();
      const name = decodeURIComponent(u.split('/badge/')[1].split('-')[0]);
      const wantsLogo = u.includes('&logo=');
      if (!t.includes('<svg') || (wantsLogo && !t.includes('<image'))) bad.push(name);
    }),
  );
  console.log(`${urls.length} badges checked; missing logo or broken: ${bad.length ? bad.join(', ') : 'none'}`);
}
