# Rewrite Bash to Node.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all bash scripts with idiomatic Node.js ES modules. Zero production dependencies.

**Architecture:** Shared `lib/obsidian.mjs` module exporting `ObsidianClient` class and `createClient` factory. CLI and bootstrap under `obsidian-read/scripts/`. Audit scripts under `obsidian-audit/scripts/`. All `.mjs`, all `#!/usr/bin/env node`.

**Tech Stack:** Node.js 18+ (built-in `fetch`), ES modules, `child_process` for git/grep.

**Spec:** `docs/superpowers/specs/2026-03-22-rewrite-bash-to-node-design.md`

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitattributes`
- Create: `lib/obsidian.mjs` (empty placeholder)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "obsidian-skills",
  "version": "0.2.1",
  "type": "module"
}
```

- [ ] **Step 2: Create `.gitattributes`**

```
* text=auto eol=lf
*.sh text eol=lf
*.mjs text eol=lf
*.md text eol=lf
*.json text eol=lf
```

- [ ] **Step 3: Create empty `lib/obsidian.mjs` placeholder**

```js
// Core Obsidian vault client — shared by all scripts.
// Zero dependencies: Node built-in fetch only.
```

- [ ] **Step 4: Commit**

```bash
git add package.json .gitattributes lib/obsidian.mjs
git commit -m "chore: add package.json, .gitattributes, lib scaffold"
```

---

### Task 2: Core module — `lib/obsidian.mjs`

**Files:**
- Create: `lib/obsidian.mjs`

This is the foundation. Every other task depends on it.

- [ ] **Step 1: Implement `ObsidianClient` class**

```js
// lib/obsidian.mjs

class ObsidianClient {
  #baseUrl;
  #headers;

  constructor({ apiKey, baseUrl = 'http://127.0.0.1:27123' }) {
    if (!apiKey) throw new Error('apiKey is required');
    this.#baseUrl = baseUrl.replace(/\/+$/, '');
    this.#headers = { 'Authorization': `Bearer ${apiKey}` };
  }

  // Encode each path segment individually — raw encodeURIComponent
  // encodes '/' to '%2F' which breaks the Obsidian REST API.
  #encodePath(vaultPath) {
    return vaultPath.split('/').map(s => encodeURIComponent(s)).join('/');
  }

  async #request(path, options = {}) {
    const url = `${this.#baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.#headers, ...options.headers },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error(`Obsidian API ${res.status}: ${body}`);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  async read(vaultPath) {
    const res = await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      headers: { 'Accept': 'text/markdown' },
    });
    return res.text();
  }

  async write(vaultPath, content) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: content,
    });
  }

  async writeFile(vaultPath, filePath) {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(filePath, 'utf-8');
    await this.write(vaultPath, content);
  }

  async append(vaultPath, content) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'text/markdown', 'Operation': 'append' },
      body: content,
    });
  }

  async search(query) {
    const encoded = encodeURIComponent(query);
    const res = await this.#request(`/search/simple/?query=${encoded}`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async list(vaultPath = '') {
    const encoded = vaultPath ? this.#encodePath(vaultPath) : '';
    // The bash version uses no trailing slash and relies on Accept: application/json
    // to get directory listing instead of file content.
    const suffix = encoded ? `/${encoded}` : '';
    const res = await this.#request(`/vault${suffix}`, {
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async tags() {
    const res = await this.#request('/tags/', {
      headers: { 'Accept': 'application/json' },
    });
    return res.json();
  }

  async delete(vaultPath) {
    await this.#request(`/vault/${this.#encodePath(vaultPath)}`, {
      method: 'DELETE',
    });
  }

  async exists(vaultPath) {
    try {
      await this.read(vaultPath);
      return true;
    } catch (err) {
      if (err.status === 404) return false;
      throw err;
    }
  }
}

function createClient() {
  const apiKey = process.env.OBSIDIAN_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'OBSIDIAN_API_KEY not set' }));
    process.exit(1);
  }
  return new ObsidianClient({
    apiKey,
    baseUrl: process.env.OBSIDIAN_BASE_URL || undefined,
  });
}

export { ObsidianClient, createClient };
```

- [ ] **Step 2: Smoke test against live vault**

Run: `OBSIDIAN_API_KEY=$OBSIDIAN_API_KEY node -e "import('./lib/obsidian.mjs').then(async ({createClient}) => { const c = createClient(); const t = await c.tags(); console.log(JSON.stringify(t)); })"`

Expected: JSON with tags array (same as current `obsidian tags` output).

- [ ] **Step 3: Test read, search, exists**

Run: `node -e "import('./lib/obsidian.mjs').then(async ({createClient}) => { const c = createClient(); console.log(await c.exists('obsidian-skills/obsidian-skills_metadata.md')); console.log(await c.exists('nonexistent/file.md')); const r = await c.search('obsidian-skills'); console.log(r.length, 'results'); })"`

Expected: `true`, `false`, `N results` (where N > 0).

- [ ] **Step 4: Commit**

```bash
git add lib/obsidian.mjs
git commit -m "feat: add ObsidianClient core module"
```

---

### Task 3: CLI — `skills/obsidian-read/scripts/cli.mjs`

**Files:**
- Create: `skills/obsidian-read/scripts/cli.mjs`

- [ ] **Step 1: Implement CLI**

```js
#!/usr/bin/env node

// Thin CLI wrapper around ObsidianClient.
// Usage: cli.mjs <command> [args...]

import { readFile } from 'node:fs/promises';
import { createClient } from '../../../lib/obsidian.mjs';

const client = createClient();
const [command, ...args] = process.argv.slice(2);

async function main() {
  switch (command) {
    case 'read': {
      const [path] = args;
      if (!path) { console.error(JSON.stringify({ error: 'Usage: cli.mjs read <path>' })); process.exit(1); }
      process.stdout.write(await client.read(path));
      break;
    }
    case 'write': {
      const [path, ...rest] = args;
      if (!path) { console.error(JSON.stringify({ error: 'Usage: cli.mjs write <path> <content | -f file>' })); process.exit(1); }
      if (rest[0] === '-f') {
        const content = await readFile(rest[1], 'utf-8');
        await client.write(path, content);
      } else {
        await client.write(path, rest.join(' '));
      }
      break;
    }
    case 'append': {
      const [path, ...rest] = args;
      if (!path) { console.error(JSON.stringify({ error: 'Usage: cli.mjs append <path> <content>' })); process.exit(1); }
      await client.append(path, rest.join(' '));
      break;
    }
    case 'search': {
      const [query] = args;
      if (!query) { console.error(JSON.stringify({ error: 'Usage: cli.mjs search <query>' })); process.exit(1); }
      console.log(JSON.stringify(await client.search(query), null, 2));
      break;
    }
    case 'list': {
      console.log(JSON.stringify(await client.list(args[0]), null, 2));
      break;
    }
    case 'tags': {
      console.log(JSON.stringify(await client.tags(), null, 2));
      break;
    }
    case 'delete': {
      const [path] = args;
      if (!path) { console.error(JSON.stringify({ error: 'Usage: cli.mjs delete <path>' })); process.exit(1); }
      await client.delete(path);
      break;
    }
    default:
      console.error(JSON.stringify({ error: `Unknown command: ${command}`, usage: 'cli.mjs <read|write|append|search|list|tags|delete> [args]' }));
      process.exit(1);
  }
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
```

- [ ] **Step 2: Make executable**

```bash
chmod +x skills/obsidian-read/scripts/cli.mjs
```

- [ ] **Step 3: Test parity with bash CLI**

Run these and compare output to the bash equivalents:
```bash
node skills/obsidian-read/scripts/cli.mjs tags
node skills/obsidian-read/scripts/cli.mjs search "obsidian-skills"
node skills/obsidian-read/scripts/cli.mjs read "obsidian-skills/obsidian-skills_metadata.md"
```

Expected: Same data as `skills/obsidian-read/scripts/obsidian tags`, etc. JSON format may differ (pretty-printed vs compact) but content must match.

- [ ] **Step 4: Test write, read-back, and delete round-trip**

```bash
echo "test content" > /tmp/cli-test-note.md
node skills/obsidian-read/scripts/cli.mjs write "test-cli-roundtrip/note.md" -f /tmp/cli-test-note.md
node skills/obsidian-read/scripts/cli.mjs read "test-cli-roundtrip/note.md"
node skills/obsidian-read/scripts/cli.mjs delete "test-cli-roundtrip/note.md"
```

Expected: read returns "test content", delete succeeds silently.

- [ ] **Step 5: Commit**

```bash
git add skills/obsidian-read/scripts/cli.mjs
git commit -m "feat: add Node.js CLI for obsidian vault operations"
```

---

### Task 4: Bootstrap — `skills/obsidian-read/scripts/bootstrap.mjs`

**Files:**
- Create: `skills/obsidian-read/scripts/bootstrap.mjs`

- [ ] **Step 1: Implement bootstrap**

```js
#!/usr/bin/env node

// Bootstrap a project in the Obsidian vault.
// Creates full folder structure + metadata/overview/backlog stubs.
// Idempotent — safe to run on existing projects.
//
// Usage: bootstrap.mjs <project-name> [repo-url]

import { createClient } from '../../../lib/obsidian.mjs';

const project = process.argv[2];
const repoUrl = process.argv[3] || '';

if (!project) {
  console.error(JSON.stringify({ error: 'Usage: bootstrap.mjs <project-name> [repo-url]' }));
  process.exit(1);
}

const client = createClient();

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

async function main() {
  let created = 0;

  // Scaffold folders via .gitkeep placeholders
  for (const folder of FOLDERS) {
    const path = `${project}/${folder}/.gitkeep.md`;
    if (!await client.exists(path)) {
      await client.write(path, 'placeholder');
      created++;
    }
  }

  // Metadata
  const metaPath = `${project}/${project}_metadata.md`;
  if (!await client.exists(metaPath)) {
    let meta = `---\nproject: ${project}\n`;
    if (repoUrl) meta += `repo: ${repoUrl}\n`;
    meta += `---\n\n# ${project}\n`;
    await client.write(metaPath, meta);
    created++;
  }

  // Architecture overview stub
  const overviewPath = `${project}/Architecture/${project}_overview.md`;
  if (!await client.exists(overviewPath)) {
    const overview = `---\ntags:\n  - architecture\n  - ${project}\nproject: ${project}\n---\n\n# ${project} — Architecture Overview\n`;
    await client.write(overviewPath, overview);
    created++;
  }

  // Backlog stub
  const backlogPath = `${project}/Backlog/${project}_backlog.md`;
  if (!await client.exists(backlogPath)) {
    const backlog = `---\ntags:\n  - backlog\n  - ${project}\nproject: ${project}\n---\n\n# ${project} — Backlog\n`;
    await client.write(backlogPath, backlog);
    created++;
  }

  console.log(JSON.stringify({ project, created, skipped: FOLDERS.length + 3 - created }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
```

- [ ] **Step 2: Make executable**

```bash
chmod +x skills/obsidian-read/scripts/bootstrap.mjs
```

- [ ] **Step 3: Test idempotency on existing project**

```bash
node skills/obsidian-read/scripts/bootstrap.mjs obsidian-skills https://github.com/btdeviant/obsidian-skills
```

Expected: `{"project":"obsidian-skills","created":0,"skipped":14}` (all exist already).

- [ ] **Step 4: Test fresh project, then clean up**

```bash
node skills/obsidian-read/scripts/bootstrap.mjs test-node-bootstrap https://github.com/example/test
node skills/obsidian-read/scripts/cli.mjs search "test-node-bootstrap"
# Verify 3+ results, then clean up:
node skills/obsidian-read/scripts/cli.mjs delete "test-node-bootstrap/Architecture/Decisions/.gitkeep.md"
# ... delete all test notes
```

Expected: `{"project":"test-node-bootstrap","created":14,"skipped":0}` on first run.

- [ ] **Step 5: Commit**

```bash
git add skills/obsidian-read/scripts/bootstrap.mjs
git commit -m "feat: add Node.js bootstrap for vault project scaffolding"
```

---

### Task 5: Audit — `vault-reader.mjs`

**Files:**
- Create: `skills/obsidian-audit/scripts/vault-reader.mjs`

- [ ] **Step 1: Implement vault reader**

```js
#!/usr/bin/env node

// Read all vault notes for a project. Output JSON.
// Usage: vault-reader.mjs <project-name>

import { createClient } from '../../../lib/obsidian.mjs';

const project = process.argv[2];
if (!project) {
  console.error(JSON.stringify({ error: 'Usage: vault-reader.mjs <project-name>' }));
  process.exit(1);
}

const client = createClient();

async function main() {
  const results = await client.search(project);
  const filenames = [...new Set(
    results.map(r => r.filename).filter(Boolean)
  )].sort();

  if (filenames.length === 0) {
    console.log(JSON.stringify({ notes: [], count: 0 }));
    return;
  }

  const notes = [];
  for (const path of filenames) {
    try {
      const content = await client.read(path);
      notes.push({ path, content });
    } catch {
      notes.push({ path, content: null, error: 'read failed' });
    }
  }

  console.log(JSON.stringify({ notes, count: notes.length }));
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }));
  process.exit(1);
});
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x skills/obsidian-audit/scripts/vault-reader.mjs
node skills/obsidian-audit/scripts/vault-reader.mjs obsidian-skills
```

Expected: JSON with `notes` array containing paths and content for all obsidian-skills notes. `count` should match the number of notes in the vault for that project.

- [ ] **Step 3: Commit**

```bash
git add skills/obsidian-audit/scripts/vault-reader.mjs
git commit -m "feat: add Node.js vault reader for audit"
```

---

### Task 6: Audit — `git-analyst.mjs`

**Files:**
- Create: `skills/obsidian-audit/scripts/git-analyst.mjs`

- [ ] **Step 1: Implement git analyst**

```js
#!/usr/bin/env node

// Analyze git history for significant changes. Output JSON.
// Usage: git-analyst.mjs [days-back] [repo-path]

import { execSync } from 'node:child_process';

const days = process.argv[2] || '30';
const repo = process.argv[3] || '.';

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: repo, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return '';
  }
}

function parseLog(raw) {
  if (!raw) return [];
  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, ...rest] = line.split(' ');
    return { hash, subject: rest.join(' ') };
  });
}

// Detect default branch
const defaultBranch = git('rev-parse --verify main') ? 'main' : 'master';

// Recent commits
const commits = parseLog(git(`log --oneline --since="${days} days ago" --no-merges`));

// Branches
const localRaw = git('branch --format="%(refname:short)"');
const remoteRaw = git('branch -r --format="%(refname:short)"');
const local = localRaw ? localRaw.split('\n').filter(Boolean) : [];
const remote = remoteRaw ? remoteRaw.split('\n').filter(Boolean) : [];

// Unmerged feature branches
const unmergedRaw = git(`branch -r --no-merged ${defaultBranch} --format="%(refname:short)"`);
const unmergedBranches = [];
if (unmergedRaw) {
  for (const branch of unmergedRaw.split('\n').filter(b => b && !b.includes('HEAD'))) {
    const logRaw = git(`log ${defaultBranch}..${branch} --oneline`);
    const branchCommits = parseLog(logRaw);
    if (branchCommits.length > 0) {
      unmergedBranches.push({ branch, commitsAhead: branchCommits.length, commits: branchCommits });
    }
  }
}

// File changes
function parseFileChanges(raw) {
  if (!raw) return [];
  const results = [];
  let currentCommit = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('commit ')) {
      currentCommit = line.replace('commit ', '');
    } else if (line.trim()) {
      results.push({ commit: currentCommit, file: line.trim() });
    }
  }
  return results;
}

const removals = parseFileChanges(git(`log --since="${days} days ago" --no-merges --diff-filter=D --name-only --pretty=format:"commit %h: %s"`));
const additions = parseFileChanges(git(`log --since="${days} days ago" --no-merges --diff-filter=A --name-only --pretty=format:"commit %h: %s"`));

console.log(JSON.stringify({
  defaultBranch,
  days: Number(days),
  commits,
  branches: { local, remote, unmerged: unmergedBranches },
  removals,
  additions,
}));
```

- [ ] **Step 2: Make executable and test**

```bash
chmod +x skills/obsidian-audit/scripts/git-analyst.mjs
node skills/obsidian-audit/scripts/git-analyst.mjs 30 .
```

Expected: JSON with commits, branches, removals, additions for this repo's last 30 days.

- [ ] **Step 3: Commit**

```bash
git add skills/obsidian-audit/scripts/git-analyst.mjs
git commit -m "feat: add Node.js git analyst for audit"
```

---

### Task 7: Audit — `codebase-scanner.mjs`

**Files:**
- Create: `skills/obsidian-audit/scripts/codebase-scanner.mjs`

- [ ] **Step 1: Implement codebase scanner**

```js
#!/usr/bin/env node

// Verify claims extracted from vault notes against the codebase. Output JSON.
// Usage: codebase-scanner.mjs <claims-file> [repo-path]
//
// Claims file: one per line, TYPE|NAME|SOURCE_NOTE

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const claimsFile = process.argv[2];
const repo = process.argv[3] || '.';

if (!claimsFile) {
  console.error(JSON.stringify({ error: 'Usage: codebase-scanner.mjs <claims-file> [repo-path]' }));
  process.exit(1);
}
if (!existsSync(claimsFile)) {
  console.error(JSON.stringify({ error: `Claims file not found: ${claimsFile}` }));
  process.exit(1);
}

const EXCLUDE_DIRS = ['.git', '.venv', 'node_modules', '.worktrees', '__pycache__', '.tox', 'dist', 'build'];
const excludeFlags = EXCLUDE_DIRS.map(d => `--exclude-dir=${d}`).join(' ');

const INCLUDE_BY_TYPE = {
  'function': ['*.py', '*.ts', '*.go', '*.js'],
  'func':     ['*.py', '*.ts', '*.go', '*.js'],
  'config':   ['*.py', '*.env.example', '*.toml', '*.yaml', '*.yml'],
  'conf':     ['*.py', '*.env.example', '*.toml', '*.yaml', '*.yml'],
  'component':['*.py', '*.ts', '*.go', '*.js'],
  'comp':     ['*.py', '*.ts', '*.go', '*.js'],
};

function grep(name, type) {
  const includes = (INCLUDE_BY_TYPE[type] || []).map(p => `--include="${p}"`).join(' ');
  try {
    const escapedName = name.replace(/[\\'"]/g, '\\$&');
    return execSync(
      `grep -rn '${escapedName}' ${excludeFlags} ${includes}`,
      { cwd: repo, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim().split('\n')[0] || '';
  } catch {
    return '';
  }
}

const lines = readFileSync(claimsFile, 'utf-8').split('\n');
const results = [];

for (const line of lines) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [type, name, source] = line.split('|').map(s => s.trim());
  if (!type || !name) continue;

  const t = type.toLowerCase();

  if (t === 'file' || t === 'dir') {
    const exists = existsSync(`${repo}/${name}`);
    results.push({ type: t, name, source, status: exists ? 'EXISTS' : 'GONE' });
  } else if (INCLUDE_BY_TYPE[t]) {
    const loc = grep(name, t);
    results.push({ type: t, name, source, status: loc ? 'EXISTS' : 'GONE', location: loc || undefined });
  } else {
    results.push({ type: t, name, source, status: 'SKIP', reason: `unknown type: ${t}` });
  }
}

console.log(JSON.stringify({ results, count: results.length }));
```

- [ ] **Step 2: Make executable and test**

Create a test claims file and run:
```bash
chmod +x skills/obsidian-audit/scripts/codebase-scanner.mjs
echo "file|lib/obsidian.mjs|test" > /tmp/test-claims.txt
echo "file|nonexistent.py|test" >> /tmp/test-claims.txt
echo "function|createClient|test" >> /tmp/test-claims.txt
node skills/obsidian-audit/scripts/codebase-scanner.mjs /tmp/test-claims.txt .
```

Expected: JSON with `lib/obsidian.mjs` EXISTS, `nonexistent.py` GONE, `createClient` EXISTS with location.

- [ ] **Step 3: Commit**

```bash
git add skills/obsidian-audit/scripts/codebase-scanner.mjs
git commit -m "feat: add Node.js codebase scanner for audit"
```

---

### Task 8: Update SKILL.md files

**Files:**
- Modify: `skills/obsidian-read/SKILL.md`
- Modify: `skills/obsidian-capture/SKILL.md`
- Modify: `skills/obsidian-audit/SKILL.md`

- [ ] **Step 1: Update obsidian-read SKILL.md**

Replace bash CLI references with Node.js equivalents. Key changes:
- `scripts/obsidian` → `scripts/cli.mjs` (or `node scripts/cli.mjs`)
- `scripts/bootstrap` → `scripts/bootstrap.mjs` (or `node scripts/bootstrap.mjs`)
- Remove the "never use heredocs" warning (no longer relevant — agents use Write tool + cli.mjs, no bash heredoc issue)
- Update CLI command examples to use `node scripts/cli.mjs`

- [ ] **Step 2: Update obsidian-capture SKILL.md**

Update workflow step references:
- Step 1: `node scripts/bootstrap.mjs` instead of `scripts/bootstrap`
- Step 4: `node scripts/cli.mjs write` instead of `obsidian write`

- [ ] **Step 3: Update obsidian-audit SKILL.md**

Replace script references:
- `scripts/vault-reader.sh` → `scripts/vault-reader.mjs` (or `node scripts/vault-reader.mjs`)
- `scripts/git-analyst.sh` → `scripts/git-analyst.mjs` (or `node scripts/git-analyst.mjs`)
- `scripts/codebase-scanner.sh` → `scripts/codebase-scanner.mjs` (or `node scripts/codebase-scanner.mjs`)
- Remove "Scripts auto-locate the obsidian CLI" paragraph (no longer relevant)
- Remove "single-line Bash command" warning (no longer relevant)

- [ ] **Step 4: Commit**

```bash
git add skills/obsidian-read/SKILL.md skills/obsidian-capture/SKILL.md skills/obsidian-audit/SKILL.md
git commit -m "docs: update SKILL.md files for Node.js scripts"
```

---

### Task 9: Delete bash scripts and cleanup

**Files:**
- Delete: `skills/obsidian-read/scripts/obsidian`
- Delete: `skills/obsidian-read/scripts/bootstrap`
- Delete: `skills/obsidian-audit/scripts/vault-reader.sh`
- Delete: `skills/obsidian-audit/scripts/git-analyst.sh`
- Delete: `skills/obsidian-audit/scripts/codebase-scanner.sh`
- Modify: `README.md`

- [ ] **Step 1: Delete all bash scripts**

```bash
rm skills/obsidian-read/scripts/obsidian
rm skills/obsidian-read/scripts/bootstrap
rm skills/obsidian-audit/scripts/vault-reader.sh
rm skills/obsidian-audit/scripts/git-analyst.sh
rm skills/obsidian-audit/scripts/codebase-scanner.sh
```

- [ ] **Step 2: Update README.md**

Update the environment variables table — remove `OBSIDIAN_CLI` row (no longer needed). Update any references to bash scripts.

- [ ] **Step 3: Bump version to 0.3.0**

Update `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.

- [ ] **Step 4: Final security scan**

```bash
grep -rn "brandon\|ali\|secret\|password\|192\.168\|10\.0\." skills/ lib/ 2>/dev/null | grep -v OBSIDIAN_API_KEY
```

Expected: No matches (or only false positives like "validated" matching "ali").

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove bash scripts, bump to 0.3.0"
```

---

### Task 10: End-to-end verification

**Files:** None (read-only verification)

- [ ] **Step 1: Verify CLI parity**

Run every CLI command and compare output to what the old bash versions produced:
```bash
node skills/obsidian-read/scripts/cli.mjs read "obsidian-skills/obsidian-skills_metadata.md"
node skills/obsidian-read/scripts/cli.mjs search "obsidian-skills"
node skills/obsidian-read/scripts/cli.mjs list
node skills/obsidian-read/scripts/cli.mjs tags
```

- [ ] **Step 2: Verify bootstrap idempotency**

```bash
node skills/obsidian-read/scripts/bootstrap.mjs obsidian-skills
```

Expected: `{"project":"obsidian-skills","created":0,...}`

- [ ] **Step 3: Verify audit scripts**

```bash
node skills/obsidian-audit/scripts/vault-reader.mjs obsidian-skills
node skills/obsidian-audit/scripts/git-analyst.mjs 30 .
```

Expected: Structured JSON output from both.

- [ ] **Step 4: Verify no bash scripts remain**

```bash
find skills/ -name "*.sh" -o -name "obsidian" -not -path "*/cli.mjs" | head
```

Expected: No output.

- [ ] **Step 5: Push**

```bash
git push
```
