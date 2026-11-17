#!/bin/zsh
# Renders README.md with GitHub's own Markdown API into preview-light.html and preview-dark.html
# (repo root, git-ignored). The stats images only show once the workflow has made them.
cd "$(dirname "$0")/.."
body=$(gh api markdown -f text="$(cat README.md)" -f mode=gfm -f context=nevcanuludas/nevcanuludas) || exit 1
for theme in light dark; do
  if [[ $theme == dark ]]; then bg='#0d1117'; bd='#30363d'; else bg='#ffffff'; bd='#d0d7de'; fi
  {
    print -r -- '<!doctype html><html><head><meta charset="utf-8">'
    print -r -- "<title>README preview ($theme)</title><meta name=\"color-scheme\" content=\"$theme\">"
    print -r -- "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.5.1/github-markdown-$theme.min.css\">"
    print -r -- "<style>:root{color-scheme:$theme}body{margin:0;padding:32px 16px;background:$bg}.markdown-body{box-sizing:border-box;max-width:1012px;margin:0 auto;padding:24px;border:1px solid $bd;border-radius:6px}</style>"
    print -r -- '</head><body><article class="markdown-body">'
    print -r -- "$body"
    print -r -- '</article></body></html>'
  } > preview-$theme.html
done
