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
  'function': ['*.py', '*.ts', '*.go', '*.js', '*.mjs'],
  'func':     ['*.py', '*.ts', '*.go', '*.js', '*.mjs'],
  'config':   ['*.py', '*.env.example', '*.toml', '*.yaml', '*.yml'],
  'conf':     ['*.py', '*.env.example', '*.toml', '*.yaml', '*.yml'],
  'component':['*.py', '*.ts', '*.go', '*.js', '*.mjs'],
  'comp':     ['*.py', '*.ts', '*.go', '*.js', '*.mjs'],
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
