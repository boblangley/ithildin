# Ithildin

Ithildin is a CLI-first static site generator that turns one or more git repositories into a self-contained HTML documentation and source browser.

## Features

- Repository index page when generating multiple repositories
- File tree navigation with Alpine.js-powered expand/collapse behavior
- Syntax-highlighted source rendering via Shiki
- Markdown rendering via Remark + `remark-gfm` (tables, task lists, strikethrough, autolinks)
- Tailwind CSS compiled at build time (no runtime CSS framework)
- Bundled GitHub Action for build + artifact upload

## Usage

```bash
npm install
npm run build
node ./bin/ithildin.js --repo . --out ./dist
```

CLI options:

- `--repo <path>` (repeatable)
- `--out <path>`

Example with multiple repos:

```bash
ithildin --repo ./repo-a --repo ./repo-b --out ./dist
```

## Development

```bash
npm install
npm run build
npm test
```

## GitHub Action

A composite action is available — see the [action README](ithildin-action/README.md) for details.

Example workflow:

```yaml
name: Build docs site
on:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./ithildin-action
        with:
          repository: .
          output: dist
```

Generated output is static and can be deployed to GitHub Pages or any static host.
