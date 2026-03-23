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
