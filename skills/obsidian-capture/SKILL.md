---
name: obsidian-capture
description: Use proactively during any conversation to capture decisions, insights, discoveries, and ideas to an Obsidian vault via Local REST API. Triggers on architectural decisions, non-obvious learnings, gotchas, resolved debates, or creative output.
---

# Obsidian Capture

Proactively capture notes to an Obsidian vault during sessions. If something is worth remembering in 3 months, capture it.

## Prerequisites

Requires the [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin (v3+).

Set `OBSIDIAN_API_KEY` in your environment. Find it in Obsidian: Settings > Local REST API > API Key.

## CLI

All vault operations go through the bundled CLI at `scripts/obsidian`:

```
obsidian read   <path>              # read a note
obsidian write  <path> <content>    # create/overwrite a note
obsidian write  <path> -f <file>    # create/overwrite from temp file
obsidian append <path> <content>    # append to a note
obsidian search <query>             # fuzzy full-text search
obsidian list   [path]              # list vault files
obsidian tags                       # list all tags
obsidian delete <path>              # delete a note
```

For long notes, write to a temp file first, then `obsidian write <path> -f /tmp/note.md`.

## Project Structure

Every project gets its own folder. **The folder name is the lowercase repo name.**

```
vault/
├── my-project/
│   ├── my-project_metadata.md        # project identity (repo URL, description)
│   ├── Architecture/
│   │   ├── my-project_overview.md    # high-level system map (mermaid diagrams)
│   │   └── Decisions/                # ADRs (architectural decision records)
│   ├── Backlog/
│   │   ├── my-project_backlog.md     # prioritized work overview
│   │   └── Issues/
│   │       ├── Open/
│   │       └── Closed/
│   ├── Insights/                     # gotchas, learnings, non-obvious findings
│   ├── RFCs/
│   │   ├── 01 - Ideas/              # sparks, proposals
│   │   ├── 02 - Designs/            # fleshed out, has a plan
│   │   ├── 03 - Active/             # accepted, in progress
│   │   ├── 04 - Complete/           # done — triggers Architecture update
│   │   ├── 05 - Superseded/         # replaced by another RFC
│   │   └── 06 - Deprecated/         # no longer relevant
│   └── Sessions/                     # session journals with structured metadata
└── another-project/
    └── ...
```

**Rules:**
- All project notes go under the project folder. Never write to vault root for project content.
- **First time with a project?** Search the vault (`obsidian search "<project>"`) to discover existing structure. Don't guess.
- The `{project}_metadata.md` anchors project identity. Read it to find the repo.
- RFCs physically move between lifecycle folders as they progress.

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
5. **Tags from existing set first** — check `obsidian tags` before inventing new ones
6. **Project tag** — always include the project name
7. **Backlink when updating** — if referencing an old note, append a backlink to it

## Tag Conventions

Lowercase, hyphenated. Layer them:
- **Type:** `decision`, `insight`, `rfc`, `idea`, `session`, `bug`, `feature`
- **Domain:** project-specific (e.g., `api`, `auth`, `infra`)
- **Meta:** `revisit`, `superseded`, `validated`

## Workflow

1. Notice something capture-worthy
2. Search vault for related notes: `obsidian search "<terms>"`
3. Write note to temp file, then `obsidian write <path> -f /tmp/note.md`
4. If linking to an existing note, append a backlink to it
5. Mention what you captured (one line, not a production)

## If OBSIDIAN_API_KEY Is Not Set

The CLI will exit with a clear error message. Mention what you would have captured so the user can add it manually later.
