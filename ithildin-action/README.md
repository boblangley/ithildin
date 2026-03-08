# ithildin-action

Composite GitHub Action to build Ithildin static output and upload `dist` as a workflow artifact.

## Inputs

- `repository` (default `.`)
- `description`
- `categories` (`["category-a","category-b"]` or `category-a,category-b`)
- `output` (default `dist`)

## Usage

```yaml
- uses: ./ithildin-action
  with:
    repository: .
    description: Static site generator for browsing git repositories.
    categories: '["tools","documentation"]'
    output: dist
```

The action writes `<slug>/metadata.json` into the generated output so downstream workflows can aggregate those files into a shared root `manifest.json`.
