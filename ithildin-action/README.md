# ithildin-action

Composite GitHub Action to build Ithildin static output and upload `dist` as a workflow artifact.

## Inputs

- `repository` (default `.`)
- `output` (default `dist`)

## Usage

```yaml
- uses: ./ithildin-action
  with:
    repository: .
    output: dist
```
