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
