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
