# github.com/nevcanuludas profile

This repository is `nevcanuludas/nevcanuludas`; GitHub shows its `README.md` on Nev's profile
page. The local folder is named `github-profile` and sits beside the other nevcan.com projects.

## Don't edit README.md or header.svg by hand

Both are generated. Change the script, then run it again:

| File                     | Made by                                         | Source                                                      |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| `README.md`              | `node scripts/make-readme.mjs --check`          | links, stack and text inside the script                     |
| `header.svg`             | `scripts/dump-rgba.swift` + `make-header.mjs`   | `../v6.nevcan.com/public/media/nev-points.png` (see script) |
| `metrics/stats.*.svg`    | `.github/workflows/metrics.yml`, daily 06:00 TR | GitHub API (needs the `METRICS_TOKEN` secret)               |

- `--check` fetches every shields.io badge and names any that fail or lost their logo.
- `scripts/preview.sh` renders the README with GitHub's Markdown API into `preview-light.html` and
  `preview-dark.html` (git-ignored).

## Rules

- Colours are v6's: dark `#01050a` / `#6ff7e0`, light `#eef2f5` / `#0a8a7a`. Every badge and stats
  image has a dark and a light version, switched with `<picture>` and `prefers-color-scheme`.
- The header card stays dark in both themes on purpose.
- Badges with no Simple Icons logo (the N, LinkedIn, mail, Metashape) use small SVGs drawn in
  `make-readme.mjs`; don't copy another brand's logo.
- Facts come from dev.nevcan.com (`../dev.nevcan.com/src/fs/`); keep them in step.
- `METRICS_TOKEN` is a classic token (repo, read:user, read:org) that expires after a year; when
  the stats stop updating, renew it in the repository's Actions secrets.

- No contribution calendar or snake: GitHub shows its own contribution graph on the profile.
