# Development Guide

Setup, workflow, and release process for the Mermaid Slides Preview extension.

## Local Setup

```bash
git clone https://github.com/kanad13/mermaid-slides-preview.git
cd mermaid-slides-preview
npm ci
npm run lint
npm run package
```

If issues occur, clean reinstall: `rm -rf node_modules && npm ci`

## Development Workflow

### 1. Create a branch

```bash
git checkout -b feat/your-feature-name
```

Prefixes: `feat/`, `fix/`, `docs/`, `refactor/`

### 2. Make changes

Edit `src/extension.js`. Press **F5** to launch the dev host. Open `examples/test.md` and run `Mermaid: Show Mermaid Slides Preview` from the Command Palette.

### 3. Test

```bash
npm run lint
npm run package
```

Verify in the dev host:
- Diagrams render at correct size
- Navigation works (arrows, scroll, keyboard)
- Slide counter updates correctly
- Live updates work when editing the source file
- Edge cases: zero diagrams, single diagram, file switch

### 4. Commit and merge

```bash
git add src/extension.js
git commit -m "feat: descriptive message"
git checkout main && git merge --no-ff feat/your-feature-name
git push origin main
```

## Code Style

- **Tabs** for indentation (enforced by ESLint)
- **Double quotes**, **semicolons required**
- `const`/`let` only (no `var`)
- JSDoc on all exported functions
- No unnecessary console logs in production code

## Release Process

1. Update version in `package.json` and `package-lock.json`
2. Add entry to `CHANGELOG.md`
3. Commit: `git commit -m "chore: bump version to X.Y.Z"`
4. Tag: `git tag -a vX.Y.Z -m "Release version X.Y.Z"`
5. Push: `git push origin main && git push origin vX.Y.Z`
6. Publish: `npm run publish`

## Dependencies

No runtime dependencies. Mermaid is loaded via CDN in the webview. Keep it this way — avoid adding NPM packages unless absolutely necessary.

## Common Pitfalls

- **CSP changes** can create XSS vulnerabilities. Always use nonces.
- **Nonce reuse** defeats the security model. Generate fresh nonce per render.
- **Always check** `if (currentPanel)` before accessing the webview.
- **Dispose listeners** when the panel closes to prevent memory leaks.
