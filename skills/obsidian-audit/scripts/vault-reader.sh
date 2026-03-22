#!/usr/bin/env bash
# Read all Obsidian vault notes for a project and output their full content.
# Usage: vault-reader.sh <project-name>
# Requires: OBSIDIAN_API_KEY in environment

set -euo pipefail

PROJECT="${1:?Usage: vault-reader.sh <project-name>}"

# Locate the obsidian CLI — search multiple layouts (repo, plugin cache, etc.)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OBSIDIAN=""

if [[ -n "${OBSIDIAN_CLI:-}" ]]; then
  OBSIDIAN="$OBSIDIAN_CLI"
else
  for candidate in \
    "${SCRIPT_DIR}/../../obsidian-capture/scripts/obsidian" \
    "${SCRIPT_DIR}/../../../obsidian-capture/scripts/obsidian" \
    "$(find "$(dirname "${SCRIPT_DIR}")" -path "*/obsidian-capture/scripts/obsidian" -type f 2>/dev/null | head -1)"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then
      OBSIDIAN="$candidate"
      break
    fi
  done
fi

if [[ -z "$OBSIDIAN" ]]; then
  echo "ERROR: Cannot find obsidian CLI." >&2
  echo "Set OBSIDIAN_CLI or install the obsidian-capture skill alongside this one." >&2
  exit 1
fi

# Get all note paths via search
all_paths=$("$OBSIDIAN" search "$PROJECT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for r in data:
    fn = r.get('filename', '')
    if fn:
        print(fn)
" | sort -u)

if [[ -z "$all_paths" ]]; then
  echo "No notes found for project: $PROJECT"
  exit 0
fi

echo "=== VAULT NOTES ==="
echo ""

count=0
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  echo "--- NOTE: ${path} ---"
  "$OBSIDIAN" read "$path" || echo "(read failed)"
  echo ""
  echo "--- END: ${path} ---"
  echo ""
  count=$((count + 1))
done <<< "$all_paths"

echo "=== DONE: ${count} notes read ==="
