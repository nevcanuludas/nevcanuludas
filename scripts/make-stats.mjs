// Builds metrics/stats.{dark,light}.svg for the profile README from the GitHub API, private work
// included: a few numbers, the languages of the repositories Nev works in, and when he codes
// (hour of day and day of week, Istanbul time). Our own code, so the token never reaches a
// third-party action. No calendar: GitHub shows its own contribution graph on the profile.
//
// Usage: GH_TOKEN=… node scripts/make-stats.mjs        (locally: GH_TOKEN=$(gh auth token))
// The token needs repo and read:org (classic), so private and organisation repos count.
import fs from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) throw new Error('GH_TOKEN is not set');
const TZ = 'Europe/Istanbul';
const DAY = 24 * 60 * 60 * 1000;
const IGNORED_LANGUAGES = new Set(['Shell', 'Dockerfile', 'Makefile', 'Procfile', 'Batchfile', 'PowerShell']);

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ---- 1. who, and the last 12 months of contributions ----
const now = new Date();
const yearAgo = new Date(now.getTime() - 365 * DAY);
const { viewer } = await gql(
  `query($from: DateTime!, $to: DateTime!) { viewer {
    id login createdAt
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions restrictedContributionsCount
      totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }
    }
  } }`,
  { from: yearAgo.toISOString(), to: now.toISOString() },
);
const cc = viewer.contributionsCollection;
const days = cc.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
const activeDays = days.filter((d) => d.contributionCount > 0).length;
let streak = 0;
let best = 0;
for (const d of days) {
  streak = d.contributionCount > 0 ? streak + 1 : 0;
  best = Math.max(best, streak);
}

// ---- 2. every year since joining, for the all-time count ----
// The calendar total counts private work too, even in organisations whose private repos the token
// can't list ("restricted" contributions), so the numbers come from the calendar.
let allTime = 0;
for (let y = new Date(viewer.createdAt).getUTCFullYear(); y <= now.getUTCFullYear(); y++) {
  const from = new Date(Date.UTC(y, 0, 1));
  const to = new Date(Math.min(Date.UTC(y + 1, 0, 1) - 1, now.getTime()));
  const d = await gql(
    `query($from: DateTime!, $to: DateTime!) { viewer { contributionsCollection(from: $from, to: $to) {
      contributionCalendar { totalContributions } } } }`,
    { from: from.toISOString(), to: to.toISOString() },
  );
  allTime += d.viewer.contributionsCollection.contributionCalendar.totalContributions;
}

// ---- 3. repositories: languages, and commit times in those touched this year ----
const repos = [];
let after = null;
do {
  const d = await gql(
    `query($after: String) { viewer { repositories(first: 100, after: $after, isFork: false,
      ownerAffiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
      pageInfo { hasNextPage endCursor }
      nodes { nameWithOwner pushedAt
        languages(first: 12, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    } } }`,
    { after },
  );
  const r = d.viewer.repositories;
  repos.push(...r.nodes);
  after = r.pageInfo.hasNextPage ? r.pageInfo.endCursor : null;
} while (after);

// languages of what Nev works on now: repositories pushed in the last two years
const twoYearsAgo = new Date(now.getTime() - 2 * 365 * DAY);
const langBytes = new Map();
for (const r of repos.filter((r) => r.pushedAt && new Date(r.pushedAt) > twoYearsAgo))
  for (const e of r.languages.edges)
    if (!IGNORED_LANGUAGES.has(e.node.name)) langBytes.set(e.node.name, (langBytes.get(e.node.name) ?? 0) + e.size);
const langTotal = [...langBytes.values()].reduce((a, b) => a + b, 0);
const langs = [...langBytes.entries()].sort((a, b) => b[1] - a[1]);
const topLangs = langs.slice(0, 6).map(([name, b]) => ({ name, pct: (b / langTotal) * 100 }));
const otherPct = 100 - topLangs.reduce((a, l) => a + l.pct, 0);
if (otherPct >= 0.5) topLangs.push({ name: 'Other', pct: otherPct });

const hours = Array(24).fill(0);
const weekdays = Array(7).fill(0); // Monday first
const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short' });
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
let commitsTimed = 0;
for (const r of repos.filter((r) => r.pushedAt && new Date(r.pushedAt) > yearAgo)) {
  const [owner, name] = r.nameWithOwner.split('/');
  let cursor = null;
  do {
    const d = await gql(
      `query($owner: String!, $name: String!, $since: GitTimestamp!, $author: ID!, $after: String) {
        repository(owner: $owner, name: $name) { defaultBranchRef { target { ... on Commit {
          history(first: 100, after: $after, since: $since, author: { id: $author }) {
            pageInfo { hasNextPage endCursor } nodes { authoredDate } } } } } } }`,
      { owner, name, since: yearAgo.toISOString(), author: viewer.id, after: cursor },
    );
    const h = d.repository?.defaultBranchRef?.target?.history;
    if (!h) break;
    for (const c of h.nodes) {
      const t = new Date(c.authoredDate);
      hours[Number(hourFmt.format(t))]++;
      weekdays[DAYS.indexOf(dayFmt.format(t))]++;
      commitsTimed++;
    }
    cursor = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
  } while (cursor);
}

const peakHour = hours.indexOf(Math.max(...hours));
const peakDay = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][
  weekdays.indexOf(Math.max(...weekdays))
];
const night = [22, 23, 0, 1, 2, 3, 4, 5].reduce((a, h) => a + hours[h], 0);
const weekend = weekdays[5] + weekdays[6];
const pct = (a) => Math.round((a / Math.max(1, commitsTimed)) * 100);

// ---- 4. draw ----
const THEMES = {
  dark: { bg: '#01050a', ink: '#eef2f5', muted: '#8b97a3', faint: '#4c5763', line: '#11161d', accent: '#6ff7e0' },
  light: { bg: '#f6f8fa', ink: '#01050a', muted: '#4c5763', faint: '#8b97a3', line: '#e3e8ed', accent: '#0a8a7a' },
};
const fmt = (n) => n.toLocaleString('en-US');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function svg(t) {
  const W = 1200;
  const H = 560;
  const P = 56; // padding
  const numbers = [
    [fmt(cc.contributionCalendar.totalContributions), 'contributions · last 12 months'],
    [fmt(allTime), `contributions since ${new Date(viewer.createdAt).getUTCFullYear()}`],
    [fmt(activeDays), 'active days · last 12 months'],
    [`${best} days`, 'longest streak · last 12 months'],
  ];
  const colW = (W - 2 * P) / numbers.length;
  const nums = numbers
    .map(
      ([v, l], i) => `<g class="up" style="--d:${(0.1 + i * 0.08).toFixed(2)}s">
      <text x="${P + i * colW}" y="128" class="num">${esc(v)}</text>
      <text x="${P + i * colW}" y="156" class="lbl">${esc(l)}</text></g>`,
    )
    .join('');

  // languages: one stacked bar and a legend, shades of the accent
  const LX = P;
  const LW = 470;
  let x = LX;
  const shade = (i) => (1 - i * 0.13).toFixed(2);
  const bar = topLangs
    .map((l, i) => {
      const w = (l.pct / 100) * LW;
      const r = `<rect x="${x.toFixed(1)}" y="262" width="${Math.max(0, w - 2).toFixed(1)}" height="14" rx="3" fill="${t.accent}" fill-opacity="${shade(i)}" class="grow" style="--d:${(0.3 + i * 0.06).toFixed(2)}s"/>`;
      x += w;
      return r;
    })
    .join('');
  const legend = topLangs
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = LX + col * 240;
      const ly = 318 + row * 34;
      return `<g class="up" style="--d:${(0.4 + i * 0.05).toFixed(2)}s"><circle cx="${lx + 5}" cy="${ly - 5}" r="5" fill="${t.accent}" fill-opacity="${shade(i)}"/>
      <text x="${lx + 20}" y="${ly}" class="item">${esc(l.name)}</text>
      <text x="${lx + 220}" y="${ly}" class="pct" text-anchor="end">${l.pct.toFixed(1)}%</text></g>`;
    })
    .join('');

  // when: 24 hour bars and 7 day bars (Istanbul time)
  const HX = 640;
  const HW = W - P - HX;
  const hMax = Math.max(...hours, 1);
  const bw = HW / 24;
  const hourBars = hours
    .map((v, h) => {
      const bh = Math.max(2, (v / hMax) * 110);
      return `<rect x="${(HX + h * bw + 2).toFixed(1)}" y="${(378 - bh).toFixed(1)}" width="${(bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${t.accent}" fill-opacity="${h === peakHour ? 1 : 0.45}" class="rise" style="--d:${(0.4 + h * 0.02).toFixed(2)}s"/>`;
    })
    .join('');
  const hourTicks = [0, 6, 12, 18, 23]
    .map((h) => `<text x="${(HX + h * bw + bw / 2).toFixed(1)}" y="400" class="tick" text-anchor="middle">${String(h).padStart(2, '0')}</text>`)
    .join('');
  const dMax = Math.max(...weekdays, 1);
  const dw = HW / 7;
  const dayBars = weekdays
    .map((v, i) => {
      const bw2 = Math.max(2, (v / dMax) * (dw - 30));
      const dx = HX + i * dw;
      return `<g><rect x="${dx.toFixed(1)}" y="440" width="${bw2.toFixed(1)}" height="10" rx="3" fill="${t.accent}" fill-opacity="${v === dMax ? 1 : 0.45}" class="grow" style="--d:${(0.6 + i * 0.04).toFixed(2)}s"/>
      <text x="${dx.toFixed(1)}" y="472" class="tick">${DAYS[i]}</text></g>`;
    })
    .join('');

  const fact = `Most commits on ${peakDay}, peak around ${String(peakHour).padStart(2, '0')}:00 · ${pct(night)}% after 22:00 · ${pct(weekend)}% at weekends`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats: ${esc(numbers.map((n) => n.join(' ')).join(', '))}. Languages: ${esc(topLangs.map((l) => `${l.name} ${l.pct.toFixed(0)}%`).join(', '))}. ${esc(fact)}.">
<style>
  text { font-family: Inter, 'Inter Variable', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
  .eyebrow { font-size: 13px; letter-spacing: 1.6px; fill: ${t.faint}; }
  .num { font-size: 40px; font-weight: 600; fill: ${t.ink}; letter-spacing: -0.5px; }
  .lbl { font-size: 15px; fill: ${t.muted}; }
  .h { font-size: 17px; font-weight: 600; fill: ${t.ink}; }
  .item { font-size: 15px; fill: ${t.ink}; }
  .pct { font-size: 15px; fill: ${t.muted}; font-variant-numeric: tabular-nums; }
  .tick { font-size: 12px; fill: ${t.faint}; }
  .fact { font-size: 14px; fill: ${t.muted}; }
  .up { animation: up .9s cubic-bezier(.22,.8,.24,1) var(--d) both; }
  .grow { transform-box: fill-box; transform-origin: left; animation: grow 1.1s cubic-bezier(.22,.8,.24,1) var(--d) both; }
  .rise { transform-box: fill-box; transform-origin: bottom; animation: rise 1.1s cubic-bezier(.22,.8,.24,1) var(--d) both; }
  @keyframes up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes grow { from { transform: scaleX(0); } to { transform: none; } }
  @keyframes rise { from { transform: scaleY(0); } to { transform: none; } }
  @media (prefers-reduced-motion: reduce) { .up, .grow, .rise { animation: none; } }
</style>
<rect width="${W}" height="${H}" rx="24" fill="${t.bg}"/>
<text x="${P}" y="70" class="eyebrow">GITHUB · PRIVATE WORK INCLUDED</text>
${nums}
<line x1="${P}" y1="200" x2="${W - P}" y2="200" stroke="${t.line}"/>
<text x="${LX}" y="240" class="h">Languages</text>
${bar}
${legend}
<text x="${HX}" y="240" class="h">When I code <tspan class="tick" dx="6">Istanbul time, last 12 months</tspan></text>
${hourBars}
${hourTicks}
${dayBars}
<text x="${P}" y="${H - 40}" class="fact">${esc(fact)}</text>
</svg>
`;
}

fs.mkdirSync(new URL('../metrics/', import.meta.url), { recursive: true });
for (const [name, t] of Object.entries(THEMES)) fs.writeFileSync(new URL(`../metrics/stats.${name}.svg`, import.meta.url), svg(t));
console.log(
  `contributions 12m ${cc.contributionCalendar.totalContributions}, all-time ${allTime}, active days ${activeDays}, best streak ${best}; ` +
    `${repos.length} repos, ${commitsTimed} commits timed; peak ${peakDay} ${peakHour}:00; top: ${topLangs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(', ')}`,
);
