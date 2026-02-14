# Development Guide

A comprehensive guide to develop, test, and release the Mermaid Slideshow extension.

## 1. Local Setup & Verification

Get your environment running with these commands.

```bash
# Clone the repository
git clone https://github.com/kanad13/mermaid-slideshow.git
cd mermaid-slideshow

# Install dependencies (strictly from lock file)
npm ci

# Run linters to check for code quality
npm run lint

# Create a distributable .vsix file
npm run package
```

### Troubleshooting Setup

If you encounter issues, a clean reinstall from the lock file often helps.

```bash
rm -rf node_modules
npm ci
```

> **`npm ci` vs `npm install`:** Always use `npm ci` for setup and troubleshooting. It installs exact versions from `package-lock.json`, ensuring reproducible builds. Only use `npm install` when intentionally adding or upgrading a dependency - then commit the updated `package-lock.json`.

## 2. Feature Development Workflow

### Step 1: Create a Feature Branch

Always create a new branch for features. Never commit directly to `main`.

```bash
# Create and switch to a feature branch
git checkout -b feat/your-feature-name
```

Branch naming convention:
- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Step 2: Make Changes

1. **Edit Code:** Make changes to `src/extension.js` or other source files.
2. **Launch Dev Host:** Press `F5` in VS Code to open a dev window with the extension loaded.
3. **Test Locally:** Open `examples/test.md` and run `Mermaid: Show Mermaid Slideshow` from the Command Palette (`Ctrl+Shift+P`). Changes apply in real-time.
4. **Lint Before Committing:** Run `npm run lint` to catch style issues early.

### Step 3: Commit Changes

```bash
# Stage your changes
git add src/extension.js

# Commit with a descriptive message
git commit -m "feat: add descriptive title

- Bullet point details
- More details"
```

Keep commits atomic and logical. Write commit messages that explain _why_ the change was made.

### Code Style

- **Tab indentation** (enforced by ESLint - see `eslint.config.js`)
- `const`/`let` only (no `var`)
- Keep functions simple with clear JSDoc comments
- No console logs in production code (unless debugging is explicitly required)

### JSDoc Standards

All exported functions **must** have JSDoc comments describing:
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
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
```

### Dependencies

**Avoid adding new NPM dependencies.** This keeps the extension lightweight. No runtime dependencies - Mermaid is loaded via CDN in the webview. If a new dependency is absolutely necessary:
1. Justify the need
2. Check bundle size impact (`npm run package` and review dist/)
3. Consider using a CDN instead
4. See [architecture.md](architecture.md) for security considerations

### Step 4: Test Thoroughly

```bash
# Run linting
npm run lint

# Build package to verify no errors
npm run package
```

Open the dev host and verify:
- Mermaid diagrams render at correct size
- Navigation works (arrow keys, scroll, click arrows)
- Slide counter updates correctly
- Live updates work when editing the source file
- Theme setting works (Settings > search "Mermaid Slideshow" > change theme > verify re-render)
- Edge cases: zero diagrams (message shown), single diagram (nav hidden), file switch
- No errors in Developer Tools (`Help > Toggle Developer Tools`)

### Step 5: Merge to Main

```bash
# Switch to main branch
git checkout main

# Ensure main is up to date
git pull origin main

# Merge your feature branch (use --no-ff for clarity)
git merge --no-ff feat/your-feature-name

# Push to remote
git push origin main
```

After pushing, verify that:
1. GitHub Actions builds pass (check the Actions tab)
2. The build produces valid .vsix files
3. No new warnings or errors in the CI logs

## 3. Release to Marketplace

**Only release from `main` branch after all features are merged and tested.**

Follow these steps precisely in order. Each step is required and builds on the previous one. Replace `X.Y.Z` with your actual version number throughout.

### Prerequisites: vsce & GitHub CLI Authentication

Publishing requires authentication with both the VS Code Marketplace and GitHub.

**VS Code Marketplace (vsce):**

```bash
# Install vsce globally (or use npx)
npm install -g @vscode/vsce

# Login with your Personal Access Token (PAT)
# Create a PAT at https://dev.azure.com/<org>/_usersSettings/tokens
# Required scopes: Marketplace > Manage
vsce login KunalPathak

# Verify login
vsce ls-publishers
```

If your PAT expires, re-login with `vsce login KunalPathak` and provide a fresh token.

**GitHub CLI (gh):**

```bash
# Install (macOS)
brew install gh

# Authenticate
gh auth login

# Verify
gh auth status
```

The `gh` CLI is used for creating GitHub releases. Git push uses standard git credentials (HTTPS or SSH).

### Pre-Release Checklist

Before starting:

```
- [ ] All features merged to `main`
- [ ] GitHub Actions build passes
- [ ] `git status` shows no uncommitted changes
- [ ] Decide version bump (MAJOR.MINOR.PATCH per semantic versioning)
- [ ] Identify all user-facing changes since last release
- [ ] `vsce login` is authenticated (run `vsce ls-publishers` to verify)
```

### Step 1: Update Version Numbers

**Edit package.json** - update the version field only:

```json
"version": "X.Y.Z"
```

**Edit package-lock.json** - update ALL occurrences of version (use search & replace):

```
"version": "X.Y.Z"
```

Verify with:

```bash
grep '"version": "X.Y.Z"' package.json package-lock.json | wc -l
# Should output: 2 (one from each file)
```

### Step 2: Update CHANGELOG.md

Add entry at the **very top** (after the header) in this exact format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description (if any)

### Changed
- Enhancement description (if any)

### Fixed
- Bug fix description (if any)
```

**Important notes:**
- Use the actual date (YYYY-MM-DD format)
- Only include **user-facing changes**
- Do NOT include: dependency updates (unless security fix), internal refactoring, test improvements, or build process changes
- Each section (Added/Changed/Fixed) is optional - only include sections with content

### Step 3: Verify Dependencies & Run Tests

```bash
# Clean install from lock file to ensure exact versions
rm -rf node_modules
npm ci

# Run linting
npm run lint

# Verify no errors
echo $?  # Should output: 0
```

### Step 4: Build Package

```bash
# Build the extension
npm run build

# Verify files updated
ls -lh dist/extension.js dist/extension.js.map

# Verify no errors in output
```

### Step 5: Commit Version Update + CHANGELOG

**Stage only these three files:**

```bash
git add package.json package-lock.json CHANGELOG.md
```

**Verify staged files:**

```bash
git status
```

**Commit with descriptive message:**

```bash
git commit -m "chore: bump version to X.Y.Z

- Update package.json version
- Update package-lock.json version
- Add CHANGELOG entry for vX.Y.Z"
```

**Verify commit:**

```bash
git log -1 --oneline  # Should show your commit
```

### Step 6: Create Git Tag

**Create annotated tag (required, not lightweight):**

```bash
git tag -a vX.Y.Z -m "Release version X.Y.Z"
```

**Verify tag points to correct commit:**

```bash
git show vX.Y.Z --quiet  # Should show your version bump commit
```

### Step 7: Push to GitHub

**Push main branch:**

```bash
git push origin main
```

**Push tag:**

```bash
git push origin vX.Y.Z
```

**Verify both pushed:**

```bash
git log -1 origin/main --oneline  # Should show your commit
git ls-remote origin refs/tags/vX.Y.Z  # Should return tag SHA
```

### Step 8: Publish to VS Code Marketplace

```bash
# Verify vsce is authenticated
vsce ls-publishers

# If not logged in:
vsce login KunalPathak

# Publish (builds and uploads in one step)
npm run publish
```

Wait for confirmation: `DONE  Published KunalPathak.mermaid-slideshow vX.Y.Z.`

**Common publish errors:**

- **"version already exists"** - `package.json` still has the old version. Update it.
- **"authorization failed"** - PAT expired. Create a new one at Azure DevOps and re-run `vsce login KunalPathak`.
- **"missing publisher"** - Run `vsce login KunalPathak` first.

### Step 9: Verify Release Complete

```bash
# Check GitHub main updated
git log origin/main -3 --oneline

# Check GitHub tag exists
git ls-remote origin refs/tags/vX.Y.Z

# Check marketplace (may take 5-10 minutes to appear)
# https://marketplace.visualstudio.com/items?itemName=KunalPathak.mermaid-slideshow
```

### Troubleshooting

**Tag already exists:**
```bash
git tag -d vX.Y.Z                      # Delete local
git push origin :refs/tags/vX.Y.Z      # Delete remote
git tag -a vX.Y.Z -m "Release vX.Y.Z"  # Recreate
git push origin vX.Y.Z                 # Push new
```

**Version already on marketplace:**
- Verify package.json has NEW version (not old)
- If correct, marketplace API cached old data; wait 10 minutes and refresh

**Tag points to wrong commit:**
```bash
git show vX.Y.Z --quiet | head -3  # Check what tag points to
git log -1 --oneline               # Check current commit
# If different: follow "Tag already exists" steps above
```

**vsce PAT expired:**
```bash
# 1. Go to https://dev.azure.com/<org>/_usersSettings/tokens
# 2. Create new token with Marketplace > Manage scope
# 3. Re-authenticate:
vsce login KunalPathak
# Paste new PAT when prompted
```

**gh CLI not authenticated:**
```bash
gh auth login
# Follow prompts to authenticate via browser or token
gh auth status  # Verify
```

## 4. Code Quality Checklist

Before committing any code, verify:

- [ ] **Linting passes:** `npm run lint` returns no errors
- [ ] **Build succeeds:** `npm run package` creates .vsix without errors
- [ ] **JSDoc complete:** All exported functions have comprehensive documentation
- [ ] **No security regressions:** CSP, nonce generation, and state management unchanged (unless intentional)
- [ ] **Manual testing:** Test in F5 dev host with `examples/test.md`
- [ ] **No console logs:** Remove debugging statements (unless required for production diagnostics)
- [ ] **Documentation updated:** If features or architecture changed, update relevant docs (README.md, architecture.md, CHANGELOG.md)

## 5. Release Checklist Summary

Use this before every release:

```
BEFORE RELEASE:
- [ ] Create feature branch for changes
- [ ] Test all features locally (F5 dev host)
- [ ] Clean install dependencies: `rm -rf node_modules && npm ci`
- [ ] Run `npm run lint` with no errors
- [ ] Run `npm run package` with no errors
- [ ] Merge to main via git merge
- [ ] Push to origin/main
- [ ] Wait for GitHub Actions to pass
- [ ] Verify no uncommitted changes
- [ ] Verify `vsce login` is authenticated (`vsce ls-publishers`)
- [ ] Verify `gh auth status` is authenticated

RELEASE:
- [ ] Increment version in package.json and package-lock.json
- [ ] Update CHANGELOG.md with new entry
- [ ] Commit version update
- [ ] Create git tag (vX.Y.Z)
- [ ] Push tag to GitHub
- [ ] Create GitHub Release
- [ ] Run `npm run publish`
- [ ] Verify marketplace shows new version
- [ ] Verify GitHub releases page shows new release

AFTER RELEASE:
- [ ] Announce release if applicable
- [ ] Monitor marketplace for issues
- [ ] Keep documentation up to date
```
