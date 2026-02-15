# Development Guide

A comprehensive guide to develop, test, and release the Mermaid Slideshow extension.

## 1. Prerequisites & Setup

### Install Global Tools

Required for development and publishing:

```bash
# VS Code CLI for publishing to marketplace
npm install -g @vscode/vsce

# GitHub CLI for creating releases
brew install gh
```

### Authenticate with Services

You'll need authentication for publishing (not required for local development).

**Marketplace Authentication (vsce):**

1. Create a Personal Access Token at https://dev.azure.com/<org>/\_usersSettings/tokens
2. Required scope: `Marketplace > Manage`
3. Authenticate:
   ```bash
   vsce login KunalPathak
   ```
4. Verify: `vsce ls-publishers`

**GitHub Authentication (gh):**

```bash
gh auth login
gh auth status  # Verify
```

> **Note:** If your PAT expires, run `vsce login KunalPathak` again with a fresh token.

### Local Environment Setup

```bash
# Clone the repository
git clone https://github.com/kanad13/mermaid-slideshow-extension.git
cd mermaid-slideshow-extension

# Install dependencies from lock file (reproducible builds)
npm ci

# Verify setup
npm run lint
npm run package
```

> **Why `npm ci` instead of `npm install`?** Use `npm ci` for setup and reproducibility—it installs exact versions from `package-lock.json`. Only use `npm install` when intentionally adding/upgrading dependencies; then commit the updated lock file.

**Clean reinstall (if issues occur):**

```bash
rm -rf node_modules
npm ci
```

---

## 2. Feature Development Workflow

### Step 1: Create a Feature Branch

Always develop on feature branches. Never commit directly to `main`.

```bash
git checkout -b feat/your-feature-name
```

**Branch naming conventions:**

- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code refactoring

### Step 2: Implement Changes

1. **Edit Code:** Modify files (typically `src/extension.js`)
2. **Code Style Requirements:**
   - Tab indentation (enforced by ESLint)
   - Use `const`/`let` only (no `var`)
   - Keep functions simple with clear JSDoc comments
   - No console logs in production code (unless explicitly for debugging)

3. **JSDoc Standards:** All exported functions must document:
   - Purpose and behavior
   - Parameters with types
   - Return values
   - Side effects (state changes, file I/O, etc.)

   **Example:**

   ```javascript
   /**
    * Generates a cryptographic nonce for Content Security Policy.
    * Used to prevent XSS attacks by allowing only trusted scripts to execute.
    * @returns {string} A random 32-character hexadecimal nonce
    */
   function getNonce() {
   	let text = "";
   	const possible =
   		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   	for (let i = 0; i < 32; i++) {
   		text += possible.charAt(Math.floor(Math.random() * possible.length));
   	}
   	return text;
   }
   ```

4. **Dependencies:** Avoid adding new NPM dependencies—keep the extension lightweight. No runtime dependencies required (Mermaid loads via CDN). If absolutely necessary:
   - Justify the need
   - Check bundle size: `npm run package` and review `dist/`
   - Consider CDN alternatives
   - See [architecture.md](architecture.md) for security considerations

### Step 3: Test Locally

```bash
# Launch the extension in a dev host
# In VS Code, press F5
```

Test in the dev host:

- Open `examples/test.md` and run "Mermaid: Show Mermaid Slideshow" from Command Palette (`Ctrl+Shift+P`)
- Changes apply in real-time
- Verify diagrams render at correct size
- Test navigation (arrow keys, scroll, click arrows)
- Verify slide counter updates
- Test theme setting (Settings > search "Mermaid Slideshow" > change theme > verify re-render)
- Test edge cases: zero diagrams (message shown), single diagram (nav hidden), file switch
- Check Developer Tools for errors (`Help > Toggle Developer Tools`)

### Step 4: Lint & Build

```bash
# Check for code quality issues
npm run lint

# Build package to verify no errors
npm run package
```

### Step 5: Commit & Merge

```bash
# Stage your changes
git add src/extension.js

# Commit with descriptive message (explain _why_ the change was made)
git commit -m "feat: add descriptive title

- Bullet point details
- More details"
```

Keep commits atomic and logical.

**Merge to main:**

```bash
git checkout main
git pull origin main
git merge --no-ff feat/your-feature-name
git push origin main
```

After pushing, verify:

- GitHub Actions builds pass (check Actions tab)
- Build produces valid .vsix files
- No new warnings in CI logs

---

## 3. Release Management

**Only release from `main` branch after all features are merged and tested.**

### Pre-Release Verification

Before starting, ensure:

- All features merged to `main`
- GitHub Actions build passes
- `git status` shows no uncommitted changes
- `vsce login` authenticated: run `vsce ls-publishers`
- `gh auth status` authenticated

### Step 1: Update Version Numbers

Update BOTH files:

**package.json:**

```json
"version": "X.Y.Z"
```

**package-lock.json:**

```
"version": "X.Y.Z"
```

Verify both updated:

```bash
grep '"version": "X.Y.Z"' package.json package-lock.json | wc -l
# Should output: 2
```

### Step 2: Update CHANGELOG.md

Add entry at the **very top** (after header):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description (if any)

### Changed

- Enhancement description (if any)

### Fixed

- Bug fix description (if any)
```

**Important:**

- Use actual date (YYYY-MM-DD)
- Only include **user-facing changes**
- Exclude: dependency updates, internal refactoring, test improvements, build changes
- Only include sections with content

### Step 3: Clean Install & Verify

```bash
# Clean install from lock file
rm -rf node_modules
npm ci

# Run linting
npm run lint

# Verify no errors
echo $?  # Should output: 0
```

### Step 4: Build Package

```bash
npm run build

# Verify files updated
ls -lh dist/extension.js dist/extension.js.map
```

### Step 5: Commit Version Update

```bash
# Stage only version/changelog files
git add package.json package-lock.json CHANGELOG.md

# Verify staged
git status

# Commit
git commit -m "chore: bump version to X.Y.Z

- Update package.json version
- Update package-lock.json version
- Add CHANGELOG entry for vX.Y.Z"

# Verify commit
git log -1 --oneline
```

### Step 6: Create Git Tag

```bash
# Create annotated tag (required, not lightweight)
git tag -a vX.Y.Z -m "Release version X.Y.Z"

# Verify tag points to correct commit
git show vX.Y.Z --quiet
```

### Step 7: Push to GitHub

```bash
# Push main branch
git push origin main

# Push tag
git push origin vX.Y.Z

# Verify both pushed
git log -1 origin/main --oneline
git ls-remote origin refs/tags/vX.Y.Z
```

### Step 8: Create GitHub Release

```bash
# Create release with .vsix artifact attached
gh release create vX.Y.Z mermaid-slideshow-X.Y.Z.vsix --title "vX.Y.Z" --notes "Release notes here"
```

Verify at: https://github.com/kanad13/mermaid-slideshow-extension/releases

### Step 9: Publish to Marketplace

```bash
# Verify authentication
vsce ls-publishers

# If not logged in: vsce login KunalPathak

# Publish
npm run publish
```

Wait for confirmation: `DONE  Published KunalPathak.mermaid-slideshow vX.Y.Z.`

### Step 10: Verify Release Complete

```bash
# Check main branch updated
git log origin/main -3 --oneline

# Check tag exists
git ls-remote origin refs/tags/vX.Y.Z

# Check marketplace (may take 5-10 minutes)
# https://marketplace.visualstudio.com/items?itemName=KunalPathak.mermaid-slideshow
```

### Troubleshooting

**Version already exists on marketplace:**

- Verify `package.json` has NEW version (not old)
- If correct, marketplace cached old data; wait 10 minutes and refresh

**Tag already exists:**

```bash
git tag -d vX.Y.Z                      # Delete local
git push origin :refs/tags/vX.Y.Z      # Delete remote
git tag -a vX.Y.Z -m "Release vX.Y.Z"  # Recreate
git push origin vX.Y.Z                 # Push new
```

**Tag points to wrong commit:**

```bash
git show vX.Y.Z --quiet | head -3  # Check what tag points to
git log -1 --oneline               # Check current commit
# If different: follow "Tag already exists" steps above
```

**vsce PAT expired:**

```bash
# 1. Create new PAT at https://dev.azure.com/<org>/_usersSettings/tokens
# 2. Scope: Marketplace > Manage
vsce login KunalPathak
# Paste new token when prompted
```

**Publish fails with "authorization failed":**

```bash
vsce login KunalPathak  # Re-authenticate with fresh PAT
npm run publish         # Retry
```

**gh CLI not authenticated:**

```bash
gh auth login
gh auth status  # Verify
```

---

## 4. Master Checklist

Use this checklist before every commit and release.

### Before Development

- [ ] Switched to feature branch: `git checkout -b feat/...`
- [ ] `npm ci` clean install completed
- [ ] `npm run lint` passes with no errors

### Before Committing Code

- [ ] All exported functions have JSDoc comments
- [ ] Code passes linting: `npm run lint`
- [ ] Package builds: `npm run package`
- [ ] Manual testing in F5 dev host with `examples/test.md`
- [ ] No debug console logs in production code
- [ ] Documentation updated (README.md, architecture.md, if applicable)
- [ ] Security unchanged (CSP, nonce generation, state management)

### Before Merging to main

- [ ] Feature branch tested locally
- [ ] All commits are atomic and logical
- [ ] Commit messages explain _why_ changes were made
- [ ] Ready to merge: `git merge --no-ff feat/...`
- [ ] No uncommitted changes: `git status`

### Before Release

- [ ] All features merged to `main`
- [ ] GitHub Actions build passes
- [ ] No uncommitted changes: `git status`
- [ ] Decide version bump (MAJOR.MINOR.PATCH per semantic versioning)
- [ ] Identified all user-facing changes since last release
- [ ] Marketplace authenticated: `vsce ls-publishers`
- [ ] GitHub authenticated: `gh auth status`

### Release Steps (In Order)

- [ ] Update version in `package.json`
- [ ] Update version in `package-lock.json`
- [ ] Update `CHANGELOG.md` with user-facing changes only
- [ ] Clean install: `rm -rf node_modules && npm ci`
- [ ] Verify lint: `npm run lint`
- [ ] Build: `npm run build`
- [ ] Commit version update: `git commit -m "chore: bump version to X.Y.Z"`
- [ ] Create tag: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`
- [ ] Push main: `git push origin main`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Verify tag pushed: `git ls-remote origin refs/tags/vX.Y.Z`
- [ ] Create GitHub Release with .vsix: `gh release create vX.Y.Z mermaid-slideshow-X.Y.Z.vsix`
- [ ] Publish: `npm run publish`
- [ ] Verify marketplace shows new version (5-10 min delay)

---
