# Obsidian Skills

Claude Code plugin for local project management with [Obsidian](https://obsidian.md).

Two skills that work in tandem:

- **obsidian-capture** — proactively captures decisions, insights, issues, and ideas to your vault during coding sessions
- **obsidian-audit** — cross-references your vault against the codebase to find stale notes, resolved issues, and missing coverage

## Dependencies

- [Obsidian](https://obsidian.md)
- [Obsidian Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) (v3+) — exposes your vault over a local HTTP API. Install from Obsidian's Community Plugins, then enable it in Settings > Local REST API. This is what the skills use to read and write notes.
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)

## Setup

1. Install and enable the [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin in Obsidian
2. Copy your API key from Obsidian: Settings > Local REST API > API Key
3. Set `OBSIDIAN_API_KEY` in your environment

## Installation

```bash
claude plugin add /path/to/obsidian-skills
```

Or from GitHub:

```bash
claude plugin add btdeviant/obsidian-skills
```

## Vault Structure

Notes are organized by project. Each project folder matches the lowercase repo name.

```
vault/
└── my-project/
    ├── my-project_metadata.md          # project identity
    ├── Architecture/
    │   ├── my-project_overview.md      # high-level system map
    │   └── Decisions/                  # architectural decision records
    ├── Backlog/
    │   └── Issues/
    │       ├── Open/
    │       └── Closed/
    ├── Insights/                       # gotchas, learnings
    ├── RFCs/
    │   ├── 01 - Ideas/
    │   ├── 02 - Designs/
    │   ├── 03 - Active/
    │   ├── 04 - Complete/
    │   ├── 05 - Superseded/
    │   └── 06 - Deprecated/
    └── Sessions/
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OBSIDIAN_API_KEY` | **Yes** | — | API key from the Local REST API plugin |
| `OBSIDIAN_BASE_URL` | No | `http://127.0.0.1:27123` | Override if using a non-default port |

## CLAUDE.md Integration (Optional)

Paste this into Claude Code to have it add Obsidian tracking to your project:

> Add an "Obsidian Vault" section to CLAUDE.md instructing agents to use the obsidian-capture skill proactively when encountering decisions, bugs, insights, or ideas worth preserving. Obsidian tracks lineage and planning — what happened, why, and what's next. Auto-memory tracks preferences and behavioral context — how to work with this user and project. The skill defines note formats, project structure, and conventions — agents should follow it.

## License

MIT
