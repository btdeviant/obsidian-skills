---
name: obsidian
description: Core Obsidian vault primitives — read, write, search, list, bootstrap. Use when any vault interaction is needed. Other obsidian skills (capture, audit) depend on this.
---

# Obsidian

Core primitives for interacting with an Obsidian vault via the Local REST API.

## Prerequisites

Requires the [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin (v3+).

Set `OBSIDIAN_API_KEY` in your environment. Find it in Obsidian: Settings > Local REST API > API Key.

## CLI

All vault operations go through the bundled CLI at `scripts/obsidian`:

```
obsidian read   <path>              # read a note (returns non-zero on 404)
obsidian write  <path> <content>    # create/overwrite a note
obsidian write  <path> -f <file>    # create/overwrite from file
obsidian append <path> <content>    # append to a note
obsidian search <query>             # fuzzy full-text search
obsidian list   [path]              # list vault files
obsidian tags                       # list all tags
obsidian delete <path>              # delete a note
```

**IMPORTANT: Never use heredocs or inline content in Bash for note writing.** Always use the Write tool to create `/tmp/<note>.md`, then a one-line Bash call: `obsidian write <path> -f /tmp/<note>.md`. This avoids security prompts from markdown headers in shell commands.

## Bootstrap

`scripts/bootstrap <project-name> [repo-url]` — scaffolds the full project folder structure on first use. Idempotent — safe to run repeatedly.

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

## If OBSIDIAN_API_KEY Is Not Set

The CLI will exit with a clear error message. Mention what you would have captured so the user can add it manually later.
