---
name: obsidian-audit
description: Use after a PR merges to main, or when the user asks to sync the Obsidian vault with current codebase state. Compares vault notes against code, git history, and branches to find stale, resolved, or missing entries.
---

# Obsidian Vault Audit

Cross-reference the Obsidian vault against the current codebase to find stale notes, resolved issues, and missing coverage.

Depends on `obsidian-read` for CLI and project structure.

## Scripts

All gathering is done via Node.js scripts (one invocation per phase):

- `node scripts/vault-reader.mjs <project>` — reads all vault notes, outputs JSON
- `node scripts/git-analyst.mjs [days-back] [repo-path]` — recent commits, branches, additions, removals (JSON)
- `node scripts/codebase-scanner.mjs <claims-file> [repo-path]` — verifies claims from vault notes (JSON)

All scripts output structured JSON to stdout. Errors go to stderr as JSON with non-zero exit codes.

## Process

### 1. Gather (parallel, then sequential)

**Phase A — run in parallel:**

**Vault Reader** — Run `node scripts/vault-reader.mjs <project>`. Parse output. Extract from each note: path, tags, date, key claims (file paths, function names, components, branches, config vars). Write claims to `/tmp/vault-claims.txt` (format: `TYPE|NAME|SOURCE_NOTE` per line).

**Git Analyst** — Run `node scripts/git-analyst.mjs <days> <repo>`. Identify major removals, additions, architectural changes, unmerged branches.

**Phase B — sequential (needs vault reader output):**

**Codebase Scanner** — Run `node scripts/codebase-scanner.mjs /tmp/vault-claims.txt <repo>`. Verifies every claim against the codebase.

### 2. Synthesize

Cross-reference results. Classify every note into one bucket:

| Bucket | Meaning | Action |
|--------|---------|--------|
| **Resolved** | Issue fixed by recent commits | Close (move to `Issues/Closed/`) |
| **Stale** | References deleted/renamed code or wrong details | Update with correct state + commit refs |
| **Missing** | Significant change with no vault coverage | Create new note with commit lineage |
| **Current** | Accurately reflects codebase | No action |
| **Duplicate** | Same topic in multiple notes | Merge |

### 3. Report

Concise table with commit lineage:

```
| Note | Status | Finding | Commit Evidence | Proposed Action |
|------|--------|---------|-----------------|-----------------|
| Issues/Open/Foo.md | Resolved | Fixed | abc1234 | Close |
| Architecture/Decisions/Bar.md | Stale | Component deleted | def5678 | Update |
| (missing) | Missing | New subsystem added | ghi9012, PR #5 | Create |
```

One-line summary: `X notes audited. Y stale, Z resolved, W missing.`

### 4. Act

Ask the user: **"Want me to execute these actions?"**

If yes: close resolved, update stale, create missing. Always include commit hashes and PR references in updated/new notes. Follow format conventions in the `obsidian-capture` skill.
