# GitHub Actions checkout troubleshooting

The GitHub Actions logs show the following fatal error during the submodule
update step:

```
Error: fatal: No url found for submodule path 'apps/thorium-eter/ui/mitre_tags/mitreattack-python' in .gitmodules
```

This is the same message that appeared before the repository stopped vendoring
the `mitreattack-python` helper project. The monorepo no longer tracks that
submodule (there is no gitlink entry under
`apps/thorium-eter/ui/mitre_tags/`, nor an entry inside `.gitmodules`), so the
checkout failure is just Git reacting to a stale submodule configuration on the
runner. No additional fixes are required at this time.
