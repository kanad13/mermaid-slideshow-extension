# PR Review Docs

This folder contains the full output of an adversarial review of the
`feat/render-markdown-on-slides` branch, plus the architectural plan for
implementing the feature correctly.

The source code in this repository has been **reset to the `main` branch
baseline**. These documents serve as the brief for the next AI coding agent
session that will implement the changes.

---

## Documents in This Folder

| File | Purpose |
|---|---|
| `findings.md` | Adversarial review findings: what the PR got wrong, what regressions it introduces, what it got right |
| `rationale.md` | Architecture decisions: why we made each key choice, with independent assessment of alternatives |
| `plan.md` | Sequenced, phased implementation plan ready for execution by an AI coding agent |
| `extracted-code.md` | Useful code salvaged from the discarded PR branch — functions, CSS, tests — annotated and ready to reuse |
| `agent-prompt.md` | **Start here if you are an AI agent.** A self-contained brief covering context, goals, constraints, and where to start |

---

## How to Use These Documents

### If you are a human reviewer / architect
1. Read `findings.md` to understand what was wrong with the PR and what was good
2. Read `rationale.md` to understand and challenge the architectural decisions
3. Read `plan.md` to review the implementation approach before authorising execution

### If you are an AI coding agent starting a new session
1. **Read `agent-prompt.md` first** — it is a complete, self-contained brief
2. Read `plan.md` for the phased implementation steps
3. Use `extracted-code.md` as a reference when implementing — do not copy blindly; read the annotations

### If you want to know why `---` was rejected as the slide delimiter
See `rationale.md` → "Slide Delimiter Choice".

### If you want to know why we started from `main` rather than reworking the PR
See `rationale.md` → "Branch Strategy".

### If you want to understand the two-mode architecture
See `rationale.md` → "Two-Mode Design" and `plan.md` → Phase 1.

---

## Current Repository State

- Active branch: `feat/render-markdown-on-slides`
- Source code: **reset to match `main`** (extension.js, webview.html, tests are all at main-branch state)
- This `pr_review_docs/` folder: new untracked content, not yet committed
- Next step: commit this folder, then start the implementation in a new session
