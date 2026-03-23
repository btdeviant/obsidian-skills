---
name: obsidian-capture
description: Use proactively during any conversation to capture decisions, insights, discoveries, and ideas to an Obsidian vault. Triggers on architectural decisions, non-obvious learnings, gotchas, resolved debates, or creative output.
---

# Obsidian Capture

Proactively capture notes to an Obsidian vault during sessions. If something is worth remembering in 3 months, capture it.

Depends on `obsidian-read` for CLI, bootstrap, and project structure.

## When to Capture

- **Decisions** — "we chose X over Y because Z"
- **Insights** — non-obvious learnings, gotchas, "oh that's why"
- **Architecture** — design patterns, system interactions, tradeoffs
- **Discoveries** — bugs found, performance characteristics, library quirks
- **Ideas** — things worth exploring later
- **Issues** — bugs found, feature requests

Don't capture: routine code changes, obvious things, anything already in CLAUDE.md or git commits.

## Note Format

Every note gets YAML frontmatter + Zettelkasten wikilinks:

```markdown
---
tags:
  - decision
  - my-project
date: 2026-03-22
project: my-project
commits:
  - abc1234
  - def5678
refs:
  - "PR #42"
---

# Title as a Concept

Context paragraph — what problem we were solving.

## Content

Details, rationale, tradeoffs.

## Links

- Related to [[Another Note]]
- Supersedes [[Old Approach]]
```

**Lineage fields** — `commits` and `refs` tie notes to git history. Always include relevant commit hashes and PR references when they exist.

## Note Types & Paths

All paths relative to the project folder.

### Architectural Decision (`tags: [decision, ...]`)
Path: `{project}/Architecture/Decisions/{title}.md`
Must include: context, decision, alternatives, rationale, implementing commits.

### Insight (`tags: [insight, ...]`)
Path: `{project}/Insights/{title}.md`
Short atomic note. One idea per note. Include gotchas here.

### RFC (`tags: [rfc, ...]`)
Path: `{project}/RFCs/{phase}/{title}.md`
Starts in `01 - Ideas/`. Moves physically as it progresses through the lifecycle.

### Issue (`tags: [bug|feature, ...]`)
Path: `{project}/Backlog/Issues/Open/{title}.md`
Move to `Closed/` when resolved. Include the resolving commit hash.

### Session Note (`tags: [session, ...]`)
Path: `{project}/Sessions/{date} - {topic}.md`

```yaml
---
tags:
  - session
  - my-project
date: 2026-03-22
project: my-project
branch: feature/my-feature
worktree: worktree-my-feature
pr: https://github.com/org/repo/pull/42
spec: docs/specs/my-feature-design.md
plan: docs/plans/my-feature-plan.md
---
```

## Zettelkasten Rules

1. **Search before creating** — find related notes and the project folder first
2. **Atomic notes** — one idea per note (except session notes)
3. **Link aggressively** — use `[[Note Title]]` wikilinks
4. **Titles are concepts** — "Why We Chose X Over Y" not "2026-03-22 Notes"
5. **Tags from existing set first** — check `node scripts/cli.mjs tags` before inventing new ones
6. **Project tag** — always include the project name
7. **Backlink when updating** — if referencing an old note, append a backlink to it

## Tag Conventions

Lowercase, hyphenated. Layer them:
- **Type:** `decision`, `insight`, `rfc`, `idea`, `session`, `bug`, `feature`
- **Domain:** project-specific (e.g., `api`, `auth`, `infra`)
- **Meta:** `revisit`, `superseded`, `validated`

## Workflow

1. **Bootstrap first** — run `node scripts/bootstrap.mjs <project-name> [repo-url]` on first use. Idempotent.
2. Search vault for related notes: `node scripts/cli.mjs search "<terms>"`
3. Use the **Write tool** to create `/tmp/<descriptive-name>.md` with the note content
4. Run `node scripts/cli.mjs write <vault-path> -f /tmp/<descriptive-name>.md` via Bash (one-liner, no heredocs)
5. If linking to an existing note, append a backlink to it
6. Mention what you captured (one line, not a production)
