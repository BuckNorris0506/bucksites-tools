# BuckParts — Cursor inbox (HQ↔Cursor relay)

## Purpose

Reduce Jared acting as the manual middleman between HQ chat and Cursor **without** pretending HQ and Cursor are fully automated or share live state. This file is a **repo-local, auditable checkpoint**: one place to park the current task, constraints, and the last agent reply so the next participant can continue from git history and explicit text.

## Hard rules

1. **Repo truth and command output beat inbox text.** If this file disagrees with a cited repo path, a named npm script’s stdout, or test output, **the repo/command output wins** and the inbox must be corrected or marked stale.
2. **Before trusting live numbers, run** `npm run buckparts:command-center` (and use `npm run buckparts:command-surface` when surface-level health matters). Do not treat inbox numbers as current without a fresh run.
3. **One task at a time.** Finish or explicitly supersede the current task before starting another in this file.
4. **Cursor must not mutate** the database, production config, or tracked files **unless** **ALLOWED ACTIONS** explicitly permits mutation for this task. Default is read-only.
5. **No secrets:** no API keys, tokens, passwords, or customer private data in this file. Use placeholders and env var *names* only if needed.
6. **Kill switch:** If maintaining this file becomes stale ceremony and **does not** reduce copy/paste friction versus pasting the handoff + command output, **delete this protocol or freeze it** (stop updating; archive intent in git history).

---

## Template (copy under the line, then fill in)

_Use exactly these section headings in order._

---

### 1. CURRENT HQ TASK

_(Single concrete task. One sentence + optional bullet constraints.)_

### 2. REQUIRED REPO FACTS

_(Paths, commands already run, or facts that must be re-verified—never substitute for running commands when live state matters.)_

### 3. ALLOWED ACTIONS

_(e.g. `READ_ONLY` only, or explicit: edit file X, run script Y. If empty or missing mutation permission, treat as read-only.)_

### 4. FORBIDDEN ACTIONS

_(e.g. no commit, no push, no DB writes, no staging evidence.)_

### 5. CURSOR OUTPUT

_(Filled by Cursor: summary, proven vs unknown, validation run, blockers.)_

### 6. NEXT PROMPT FOR HQ

_(One paste-ready prompt for the next HQ or Cursor turn.)_

---

## Active checkpoint

_Start below. Replace the placeholder when beginning a new relay._

### 1. CURRENT HQ TASK

_(None — initialize when HQ sets the next task.)_

### 2. REQUIRED REPO FACTS

_(None.)_

### 3. ALLOWED ACTIONS

`READ_ONLY` until HQ updates this section.

### 4. FORBIDDEN ACTIONS

Mutation, commits, pushes, and any DB/data writes unless **ALLOWED ACTIONS** explicitly allows them for this task.

### 5. CURSOR OUTPUT

_(None.)_

### 6. NEXT PROMPT FOR HQ

_(None.)_
