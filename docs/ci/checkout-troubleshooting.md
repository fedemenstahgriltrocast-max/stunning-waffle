# GitHub Actions checkout troubleshooting
he GitHub Actions logs showed the following fatal error during the submodule
update step:
```
Error: fatal: No url found for submodule path 'apps/thorium-eter/ui/mitre_tags/mitreattack-python' in .gitmodules
```
This was triggered by a stale `.gitmodules` file that lived inside the
`apps/thorium-eter` subtree. Because the monorepo does not vendor the
`mitreattack-python` helper project anymore, Git could not find a matching entry
at the repository root and aborted the recursive submodule update.
Removing `apps/thorium-eter/.gitmodules` resolves the failure for fresh clones
and GitHub Actions checkouts that request submodules. No further action is
required once the removal lands on the default branch.
