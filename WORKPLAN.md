# Code Quality Audit - Work Plan

Branch: `refactor/code-quality-audit`

## File-Touch Matrix

Shows which files each phase modifies. Designed to minimize re-touching files across phases.

| File | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| `eslint.config.js` | EDIT | | | |
| `.gitignore` | EDIT | | | |
| `dist/` | UNTRACK | DELETE | | |
| `webpack.config.js` | | DELETE | | |
| `package.json` | | EDIT | | EDIT |
| `.vscodeignore` | | EDIT | | |
| `src/extension.js` | | | REWRITE | EDIT (minor) |
| `src/webview.html` | | | CREATE | |
| `test/extension.test.js` | | | | CREATE |

Notes:
- `webpack.config.js` has a duplicate `@ts-check` but is skipped in Phase 1 because it gets deleted in Phase 2
- `package.json` touched twice (Phase 2: build scripts, Phase 4: test scripts) - unavoidable, different concerns
- `src/extension.js` touched twice (Phase 3: overhaul, Phase 4: add one export) - minimal overlap

---

## Phase 1: Config & Git Hygiene

**Goal:** Fix linting config error, stop tracking build artifacts.
**Files:** `eslint.config.js`, `.gitignore`

- [ ] 1.1 Fix `sourceType: "module"` → `"commonjs"` in `eslint.config.js`
- [ ] 1.2 Add `dist/` to `.gitignore`
- [ ] 1.3 Remove `dist/` from git tracking (`git rm -r --cached dist/`)
- [ ] 1.4 Run `npm run lint` to verify
- [ ] 1.5 Commit, build `.vsix`, await testing

---

## Phase 2: Drop Webpack, Simplify Build

**Goal:** Remove unnecessary bundler. Single-file extension doesn't need it.
**Files:** `webpack.config.js` (delete), `package.json`, `.vscodeignore`

- [ ] 2.1 Change `main` in `package.json` from `./dist/extension.js` to `./src/extension.js`
- [ ] 2.2 Remove `webpack`, `webpack-cli` from `devDependencies`
- [ ] 2.3 Update `scripts.build` (remove or repurpose)
- [ ] 2.4 Update `scripts.package` and `scripts.publish` to drop the build step
- [ ] 2.5 Delete `webpack.config.js`
- [ ] 2.6 Update `.vscodeignore`: include `src/`, remove `src/` exclusion line
- [ ] 2.7 Delete `dist/` directory from disk
- [ ] 2.8 Run `npm run lint` to verify
- [ ] 2.9 Commit, build `.vsix`, await testing

---

## Phase 3: Extension Source Overhaul

**Goal:** Fix all code-level issues in a single pass through `src/extension.js`.
**Files:** `src/extension.js` (rewrite), `src/webview.html` (create)

- [ ] 3.1 Extract webview HTML/CSS/JS from `getWebviewContent()` into `src/webview.html` template
      - Use placeholder tokens: `{{NONCE}}`, `{{THEME}}`, `{{DIAGRAMS_JSON}}`, `{{SINGLE_SLIDE_CLASS}}`
      - `getWebviewContent()` becomes: read template, replace tokens, return
- [ ] 3.2 In the template: replace hardcoded colors with VS Code CSS variables
      - `background: #fff` → `var(--vscode-editor-background)`
      - `color: #666` → `var(--vscode-editor-foreground)`
      - Nav borders, counter, etc. → appropriate `--vscode-*` variables
- [ ] 3.3 Also create a minimal `src/empty.html` for the empty-state (or keep it inline since it's small)
- [ ] 3.4 Add debounce (300ms) to `onDidChangeTextDocument` handler
- [ ] 3.5 Remove `retainContextWhenHidden: true` from panel options
- [ ] 3.6 Fix panel reuse: when `reveal()` is called on existing panel, also check if theme changed and do full HTML replacement if needed
- [x] 3.7 Run `npm run lint` to verify
- [x] 3.8 Commit, build `.vsix`, await testing
- [ ] 3.9 Auto-detect VS Code color theme kind for Mermaid theme
      - Add `resolveTheme()` helper: if user setting is `"default"`, map dark/high-contrast VS Code themes to Mermaid `"dark"`
      - Listen for `onDidChangeActiveColorTheme` to re-render when VS Code theme switches
      - Update `mermaidSlideshow.theme` enum to add `"auto"` option or document `"default"` behavior
- [ ] 3.10 Run `npm run lint`, commit, build `.vsix`, await testing

---

## Phase 4: Test Infrastructure

**Goal:** Add automated unit tests for the pure extraction logic.
**Files:** `package.json` (test script), `src/extension.js` (export), `test/extension.test.js` (create)

- [ ] 4.1 Export `extractMermaidBlocks` from `src/extension.js` (in `module.exports`)
- [ ] 4.2 Create `test/extension.test.js` using Node.js built-in test runner (no new devDeps)
- [ ] 4.3 Test cases for `extractMermaidBlocks`:
      - Standard backtick blocks
      - Azure DevOps `:::` syntax
      - Mixed syntax in one file
      - Empty blocks (should be excluded)
      - No mermaid blocks (returns `[]`)
      - Non-mermaid code fences (should be ignored)
      - Nested/malformed fences
- [ ] 4.4 Update `package.json` `scripts.test` from lint alias to: `node --test test/ && npm run lint`
- [ ] 4.5 Update CI workflow to run `npm test` (already does, but now it actually runs tests)
- [ ] 4.6 Run `npm test` to verify
- [ ] 4.7 Commit, build `.vsix`, await testing

---

## Completion

- [ ] Delete this `WORKPLAN.md` file
- [ ] Final commit on branch
- [ ] PR to main
