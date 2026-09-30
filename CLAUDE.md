# Project Zero

## Release workflow
- "Save and release" means: commit, push **directly to `main`**, which triggers CI then the GitHub Pages deploy (`.github/workflows/deploy.yml`). **No pull requests.**
- Stage only the files relevant to the change; the working tree has many unrelated modified files.
- SimCraft sync server runs on this Mac only: Tailscale IP `100.86.110.0`, port 4177.
