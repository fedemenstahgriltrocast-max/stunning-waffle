# Deployment Pipelines

Use GitHub Actions to validate and deploy each layer independently while sharing reusable workflows.

## Suggested Workflow Steps
1. `npm install` – install dependencies for Workers projects.
2. `npm run lint` – type-check TypeScript sources (tsc --noEmit).
3. `npm run build` – perform a Wrangler dry-run to validate bundles.
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
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: ultimate-chatbot/infrastructure/edge-mesh/workers/package.json
      - run: npm install
        working-directory: ultimate-chatbot/infrastructure/edge-mesh/workers
      - run: npm run lint
        working-directory: ultimate-chatbot/infrastructure/edge-mesh/workers
      - run: npm run build -- --env ${{ inputs.layer }}
        working-directory: ultimate-chatbot/infrastructure/edge-mesh/workers
      - run: npx wrangler deploy --env ${{ inputs.layer }}
        env:
          EDGEMESH_API_TOKEN: ${{ secrets.EDGEMESH_API_TOKEN }}
          EDGEMESH_ACCOUNT_ID: ${{ secrets.EDGEMESH_ACCOUNT_ID }}
```
