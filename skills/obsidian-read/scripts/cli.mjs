#!/usr/bin/env node

// Thin CLI wrapper around ObsidianClient.
// Usage: cli.mjs <command> [args...]

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
        await client.writeFile(path, rest[1]);
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
