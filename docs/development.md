# Development Guide

## 1. What GitHub Actions Handles Automatically

| Trigger | Workflow | What it does |
|---------|----------|--------------|
| Push or PR to `main` | `ci.yml` | lint → build `.vsix` → verify artifact |
| Push tag `v*.*.*` | `release.yml` | build → verify tag matches `package.json` version → create GitHub Release with `.vsix` → publish to VS Code Marketplace |

**You never need to manually publish.** Pushing a version tag is the release trigger.

### One-time setup: VSCE_PAT secret

The release workflow publishes to the marketplace using a personal access token stored as a GitHub secret. Set it up once:

1. Create a PAT at `https://dev.azure.com/<org>/_usersSettings/tokens` with scope **Marketplace > Manage**
2. Go to the repo → Settings → Secrets and variables → Actions → **New repository secret**
3. Name: `VSCE_PAT`, value: your PAT
4. Verify: `vsce ls-publishers`

> If the PAT expires, create a new one and update the secret the same way.

---

## 2. Local Development Setup

```bash
# Install dependencies (exact versions from lock file)
npm ci

# Launch extension in dev host
# In VS Code, press F5
```

Test in the dev host with `examples/test.md`:
- Run `Markdown: Show Markdown Slideshow` from the Command Palette
- Verify slides render correctly, navigation works (arrow keys, scroll, click arrows)
- Verify slide counter updates
- Test theme setting: Settings → search "Markdown Slideshow" → change theme → verify re-render
- Test edge cases: zero diagrams (message shown), single diagram (nav hidden), file switch
- Check for errors: `Help > Toggle Developer Tools`

**Code style** (enforced by ESLint):
- Tabs, double quotes, semicolons, Unix line endings
- `const`/`let` only, no `var`
- JSDoc on all exported functions
- No console logs in production code

```bash
# Verify before committing
npm run lint
npm run package
```

---

## 3. Release Steps

> **Before starting:** ensure all features are merged and `ci.yml` passes on `main`.

The release workflow enforces that your tag version matches `package.json`. If they don't match, the workflow fails and nothing publishes. Always bump the version before tagging.

**The 6 steps:**

1. **Decide the version bump** — follow [semver](https://semver.org): MAJOR for breaking changes, MINOR for new features, PATCH for bug fixes

2. **Bump version** in both files:
   ```bash
   # package.json: "version": "X.Y.Z"
   # package-lock.json: "version": "X.Y.Z" (appears twice — root and packages[""])
   ```
   Verify:
   ```bash
   grep '"version": "X.Y.Z"' package.json package-lock.json | wc -l
   # should output: 3
   ```

3. **Write CHANGELOG entry** — add at the top of `CHANGELOG.md`:
   ```markdown
   ## [X.Y.Z] - YYYY-MM-DD

   ### Added
   - ...

   ### Fixed
   - ...
   ```
   User-facing changes only. Omit dependency updates and internal refactoring.

4. **Verify locally:**
   ```bash
   npm run lint
   ```

5. **Commit:**
   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore: bump version to X.Y.Z"
   ```

6. **Tag and push — this triggers the release workflow:**
   ```bash
   git tag -a vX.Y.Z -m "Release version X.Y.Z"
   git push origin main && git push origin vX.Y.Z
   ```

After pushing, the `release.yml` workflow runs automatically: builds the `.vsix`, creates the GitHub Release with the artifact attached, and publishes to the VS Code Marketplace.

Check progress in the **Actions** tab. Marketplace updates may take 5–10 minutes to appear.

---

## 4. Troubleshooting

**Version mismatch: workflow fails with "Tag does not match package.json version"**
The tag and `package.json` must be in sync. Fix:
```bash
git tag -d vX.Y.Z                      # delete local tag
git push origin :refs/tags/vX.Y.Z      # delete remote tag
# update package.json to match, commit
git tag -a vX.Y.Z -m "Release version X.Y.Z"
git push origin vX.Y.Z
```

**VSCE PAT expired: publish step fails with "authorization failed"**
1. Create a new PAT (Marketplace > Manage scope)
2. Update the `VSCE_PAT` secret in repo Settings → Secrets → Actions

**gh CLI not authenticated:**
```bash
gh auth login
gh auth status
```
