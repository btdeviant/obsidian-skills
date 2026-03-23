#!/usr/bin/env node

// Verify claims extracted from vault notes against the codebase. Output JSON.
// Usage: codebase-scanner.mjs <claims-file> [repo-path]
//
// Claims file: one per line, TYPE|NAME|SOURCE_NOTE

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const claimsFile = process.argv[2];
const repo = process.argv[3] || '.';

if (!claimsFile) {
  console.error(JSON.stringify({ error: 'Usage: codebase-scanner.mjs <claims-file> [repo-path]' }));
  process.exit(1);
}

const EXCLUDE_DIRS = ['.git', '.venv', 'node_modules', '.worktrees', '__pycache__', '.tox', 'dist', 'build'];

const CODE_GLOBS = ['*.py', '*.ts', '*.go', '*.js', '*.mjs'];
const CONFIG_GLOBS = ['*.py', '*.env.example', '*.toml', '*.yaml', '*.yml'];

const INCLUDE_BY_TYPE = {
  function: CODE_GLOBS, func: CODE_GLOBS,
  config: CONFIG_GLOBS, conf: CONFIG_GLOBS,
  component: CODE_GLOBS, comp: CODE_GLOBS,
};

function grep(name, type) {
  const grepArgs = ['-rn', '-F', name];
  for (const d of EXCLUDE_DIRS) grepArgs.push(`--exclude-dir=${d}`);
  for (const p of (INCLUDE_BY_TYPE[type] || [])) grepArgs.push(`--include=${p}`);

  try {
    return execFileSync('grep', grepArgs, {
      cwd: repo, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
    }).trim().split('\n')[0] || '';
  } catch {
    return '';
  }
}

let lines;
try {
  lines = readFileSync(claimsFile, 'utf-8').split('\n');
} catch (err) {
  console.error(JSON.stringify({ error: `Cannot read claims file: ${err.message}` }));
  process.exit(1);
}

const results = [];

for (const line of lines) {
  if (!line.trim() || line.startsWith('#')) continue;
  const [type, name, source] = line.split('|').map(s => s.trim());
  if (!type || !name) continue;

  const t = type.toLowerCase();

  if (t === 'file' || t === 'dir') {
    const exists = existsSync(join(repo, name));
    results.push({ type: t, name, source, status: exists ? 'EXISTS' : 'GONE' });
  } else if (INCLUDE_BY_TYPE[t]) {
    const loc = grep(name, t);
    results.push({ type: t, name, source, status: loc ? 'EXISTS' : 'GONE', location: loc || undefined });
  } else {
    results.push({ type: t, name, source, status: 'SKIP', reason: `unknown type: ${t}` });
  }
}

console.log(JSON.stringify({ results, count: results.length }));
