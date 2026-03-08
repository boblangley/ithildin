# Ithildin

Ithildin is a CLI-first static site generator that turns one or more git repositories into a self-contained HTML documentation and source browser.

## Features

- Root SPA index that loads repository metadata from `manifest.json`
- File tree navigation with Alpine.js-powered expand/collapse behavior
- Syntax-highlighted source rendering via Shiki
- Markdown rendering via Remark + `remark-gfm` (tables, task lists, strikethrough, autolinks)
- Tailwind CSS compiled at build time (no runtime CSS framework)
- Bundled GitHub Action for build + artifact upload
- Generated `manifest.schema.json` to document the expected manifest shape
- Generated per-repository `metadata.json` files for manifest aggregation workflows

## Usage

```bash
npm install
npm run build
node ./bin/ithildin.js --repo . --out ./dist --description "Static site generator for browsing git repositories." --categories '["tools","documentation"]'
```

For this repository, `npm run build:dist` rebuilds `dist/` and writes `dist/manifest.json` automatically using metadata from `package.json`.

CLI options:

- `--repo <path>` (repeatable)
- `--out <path>`
- `--description <text>`
- `--categories <json-array-or-csv>`
- `--category <name>` (repeatable)

Example with multiple repos:

```bash
ithildin --repo ./repo-a --repo ./repo-b --out ./dist
```

The generated root `index.html` is a small client-side app. It attempts to fetch `manifest.json`, groups repositories by category when categories are present, and shows `No repositories found.` when the manifest is missing or invalid.

Each generated repository also includes `<slug>/metadata.json`, containing `slug`, `name`, `description`, and `categories`. This is intended as source material for whatever aggregation process users build to produce the shared `manifest.json`.

Ithildin writes `manifest.schema.json` into the output directory. Users can generate `manifest.json` however they want, as long as it matches the schema.

If you want a repository-local shortcut like this project uses, add an `ithildin` block to `package.json`:

```json
{
  "ithildin": {
    "description": "Optional override for metadata.json and dist/manifest.json",
    "categories": ["tools", "documentation"]
  }
}
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
          description: Static site generator for browsing git repositories.
          categories: '["tools","documentation"]'
          output: dist
```

Generated output is static and can be deployed to GitHub Pages or any static host.
