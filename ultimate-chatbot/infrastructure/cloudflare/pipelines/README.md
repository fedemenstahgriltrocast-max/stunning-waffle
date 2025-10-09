# Deployment Pipelines

Use GitHub Actions to validate and deploy each layer independently while sharing reusable workflows.

## Suggested Workflow Steps
1. `pnpm install` – install dependencies for Workers projects.
2. `pnpm run lint` – lint TypeScript sources.
3. `pnpm run test` – execute integration/unit tests.
4. `wrangler deploy --env layerX` – deploy the updated layer.

## Reusable Workflow Skeleton
```yaml
name: deploy-layer

on:
  workflow_call:
    inputs:
      layer:
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      - run: pnpm install
      - run: pnpm run lint --filter \"${{ inputs.layer }}\"
      - run: pnpm run test --filter \"${{ inputs.layer }}\"
      - run: npx wrangler deploy --env ${{ inputs.layer }}
        env:
          CF_API_TOKEN: ${{ secrets.CF_API_TOKEN }}
          CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}
```
