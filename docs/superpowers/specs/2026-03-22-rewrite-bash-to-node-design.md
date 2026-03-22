# Rewrite Bash Scripts to Node.js

Replace all bash scripts with idiomatic Node.js (ES modules). Zero production dependencies — Node built-ins only. No build step.

## Motivation

The current bash scripts have compounding problems:

- **Undeclared python3 dependency** for URL encoding (every CLI call) and JSON parsing (vault-reader)
- **curl wrapping** with inconsistent error handling — some commands swallow HTTP errors silently
- **Fragile path resolution** — vault-reader tries 3 relative paths + a `find` fallback to locate the CLI
- **Subprocess overhead** — vault-reader spawns one process per note read, bootstrap spawns ~14 for existence checks
- **No structured output** — scripts emit freeform text with marker delimiters that Claude parses from prose
- **Mixed languages** — bash + inline python3 + curl in the same files

Node.js is guaranteed present (Claude Code requires it). Using it eliminates every dependency except git and grep (which are used for what they're good at).

## File Structure

```
obsidian-skills/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json
├── .gitattributes
├── package.json
├── lib/
│   └── obsidian.mjs
├── skills/
│   ├── obsidian-read/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       ├── cli.mjs
│   │       └── bootstrap.mjs
│   ├── obsidian-capture/
│   │   └── SKILL.md
│   └── obsidian-audit/
│       ├── SKILL.md
│       └── scripts/
│           ├── vault-reader.mjs
│           ├── git-analyst.mjs
│           └── codebase-scanner.mjs
├── tests/
│   └── ...
├── docs/
│   └── ...
└── README.md
```

### Conventions (from superpowers)

- `package.json` is minimal: name, version, `"type": "module"`. No dependencies, no build scripts.
- `.gitattributes` enforces LF line endings: `* text=auto eol=lf`.
- All scripts are `#!/usr/bin/env node` with `.mjs` extension.
- Skill descriptions say WHEN to use, not WHAT it does.
- Scripts output structured JSON. Errors go to stderr as JSON with non-zero exit codes.

## Core Module: `lib/obsidian.mjs`

Shared library imported by all scripts. Zero dependencies — uses Node built-in `fetch` (Node 18+).

### ObsidianClient

```js
class ObsidianClient {
  constructor({ apiKey, baseUrl = 'http://127.0.0.1:27123' })

  async read(path)             // GET /vault/{path} → string, throws on 404
  async write(path, content)   // PUT /vault/{path} → void
  async writeFile(path, file)  // PUT /vault/{path} with file contents → void
  async append(path, content)  // PATCH /vault/{path} → void
  async search(query)          // POST /search/simple/ → [{ filename, matches }]
  async list(path?)            // GET /vault/{path}/ → { files: string[] }
  async tags()                 // GET /tags/ → { tags: [...] }
  async delete(path)           // DELETE /vault/{path} → void
  async exists(path)           // read() try/catch → boolean
}
```

Implementation details:

- URL encoding via built-in `encodeURIComponent`. No python3.
- HTTP errors throw with status code and response body. No silent swallowing.
- `exists()` wraps `read()` in try/catch — returns boolean, no subprocess.
- Content passed to `fetch` via request body, not command-line arguments (prevents `@`-prefix injection that curl has).

### Factory

```js
function createClient() {
  const apiKey = process.env.OBSIDIAN_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'OBSIDIAN_API_KEY not set' }));
    process.exit(1);
  }
  return new ObsidianClient({ apiKey, baseUrl: process.env.OBSIDIAN_BASE_URL });
}

export { ObsidianClient, createClient };
```

## CLI: `skills/obsidian-read/scripts/cli.mjs`

```
#!/usr/bin/env node
```

Thin wrapper. Parses `process.argv`, calls `createClient()`, dispatches to the right method. Output:

- `read` → raw content to stdout
- `search`, `list`, `tags` → JSON to stdout
- `write`, `append`, `delete` → silent on success, JSON error to stderr on failure
- All errors → JSON to stderr, non-zero exit code

Agents invoke via: `node cli.mjs read "path/to/note.md"`

## Bootstrap: `skills/obsidian-read/scripts/bootstrap.mjs`

```
#!/usr/bin/env node
```

Same logic as current bash version. Improvements:

- Imports `ObsidianClient` directly — one client instance, no subprocess per check.
- `client.exists()` for idempotency checks — single HTTP call, no exit code parsing.
- Template literals for YAML stubs instead of bash variable concatenation.
- JSON output: `{ "project": "my-project", "created": 14, "skipped": 0 }`.

Folder list:

```js
const FOLDERS = [
  'Architecture/Decisions',
  'Backlog/Issues/Open',
  'Backlog/Issues/Closed',
  'Insights',
  'RFCs/01 - Ideas',
  'RFCs/02 - Designs',
  'RFCs/03 - Active',
  'RFCs/04 - Complete',
  'RFCs/05 - Superseded',
  'RFCs/06 - Deprecated',
  'Sessions',
];
```

## Audit Scripts

### vault-reader.mjs

Biggest improvement. Currently spawns N subprocesses for N notes.

Rewrite:
1. `createClient()`
2. `client.search(project)` → array of filenames
3. Loop with `client.read()` for each → collect into structured output
4. Write claims file to `/tmp/vault-claims.txt` (TYPE|NAME|SOURCE_NOTE format)
5. Output JSON: `{ notes: [{ path, content, tags, date }], claimsFile: "/tmp/vault-claims.txt" }`

One process, one HTTP client, native JSON parsing.

### git-analyst.mjs

Uses `child_process.execSync` for git commands. Parses output into structured JSON:

```js
{
  commits: [{ hash, subject }],
  branches: { local: [...], remote: [...], unmerged: [...] },
  removals: [{ commit, file }],
  additions: [{ commit, file }]
}
```

### codebase-scanner.mjs

Reads claims file (pipe-delimited). Uses `child_process.execSync` for grep. Structured output:

```js
{
  results: [
    { type, name, source, status: "EXISTS"|"GONE", location? }
  ]
}
```

Improvements over bash version:
- File extension list as a JS array — easy to maintain.
- Single grep per claim (not double).
- Exclude dirs as an array, properly quoted.

## Agent Dispatch (Audit Workflow)

The audit SKILL.md instructs the orchestrating agent to:

1. **Phase A — parallel**: Dispatch two Agent tool calls in the same turn:
   - Vault Reader agent: runs `vault-reader.mjs`, returns JSON, writes claims file
   - Git Analyst agent: runs `git-analyst.mjs`, returns JSON
2. **Phase B — sequential**: After both return, dispatch one Agent tool call:
   - Codebase Scanner agent: runs `codebase-scanner.mjs` with the claims file
3. **Phase C — synthesize**: Orchestrator cross-references the three JSON results, classifies notes, presents the report table with commit lineage.

Each agent prompt includes:
- The exact script path and arguments
- `READ-ONLY — do not modify any files or vault notes`
- Instruction to return structured JSON, not narrative

## Skill Description Updates

Rewrite descriptions to say WHEN (from superpowers pattern):

- **obsidian-read**: "Use when you need to read, search, or list notes in an Obsidian vault. Load this before obsidian-capture or obsidian-audit."
- **obsidian-capture**: "Use proactively during any conversation to capture decisions, insights, discoveries, and ideas to an Obsidian vault. Triggers on architectural decisions, non-obvious learnings, gotchas, resolved debates, or creative output."
- **obsidian-audit**: "Use after a PR merges to main, or when the user asks to sync the Obsidian vault with current codebase state."

These are already close. The key is the description drives skill selection — it must describe the trigger, not the capability.

## Migration

1. Write all JS files alongside existing bash scripts.
2. Update SKILL.md files to reference `.mjs` scripts.
3. Delete bash scripts.
4. Update README.
5. Bump to 0.3.0.

## What's Out of Scope

- npm dependencies (zero allowed)
- Build step / transpilation
- Server (not needed — superpowers' server is for visual brainstorming only)
- Named agent definitions in `agents/` (nice-to-have, not required for v1)
- Parallel note reads with Promise.all (sequential is fine for typical vault sizes)
- Tests (separate effort)
