#!/usr/bin/env bash
# Verify existence of claims extracted from vault notes.
# Usage: codebase-scanner.sh <claims-file> [repo-path]
#
# Claims file format (one per line):
#   TYPE|NAME|SOURCE_NOTE
#
# TYPE: file, dir, function, func, config, conf, component, comp
# NAME: what to search for
# SOURCE_NOTE: vault note that made this claim

set -euo pipefail

CLAIMS_FILE="${1:?Usage: codebase-scanner.sh <claims-file> [repo-path]}"
REPO="${2:-.}"

cd "$REPO"

if [[ ! -f "$CLAIMS_FILE" ]]; then
  echo "ERROR: Claims file not found: $CLAIMS_FILE" >&2
  exit 1
fi

# Directories to exclude from grep searches
EXCLUDE="--exclude-dir=.git --exclude-dir=.venv --exclude-dir=node_modules --exclude-dir=.worktrees --exclude-dir=__pycache__ --exclude-dir=.tox --exclude-dir=dist --exclude-dir=build"

echo "=== CODEBASE SCAN ==="
echo ""

while IFS='|' read -r type name source; do
  [[ -z "$type" ]] && continue
  [[ "$type" == \#* ]] && continue

  # Trim whitespace
  type=$(echo "$type" | xargs)
  name=$(echo "$name" | xargs)
  source=$(echo "$source" | xargs)

  case "$type" in
    file|dir)
      if [[ -e "$name" ]]; then
        echo "EXISTS | $type | $name | ($source)"
      else
        echo "GONE   | $type | $name | ($source)"
      fi
      ;;
    function|func)
      # shellcheck disable=SC2086
      loc=$(grep -rn "$name" $EXCLUDE --include="*.py" --include="*.ts" --include="*.go" --include="*.js" 2>/dev/null | head -1)
      if [[ -n "$loc" ]]; then
        echo "EXISTS | func | $name | $loc"
      else
        echo "GONE   | func | $name | ($source)"
      fi
      ;;
    config|conf)
      # shellcheck disable=SC2086
      loc=$(grep -rn "$name" $EXCLUDE --include="*.py" --include="*.env.example" --include="*.toml" --include="*.yaml" --include="*.yml" 2>/dev/null | head -1)
      if [[ -n "$loc" ]]; then
        echo "EXISTS | conf | $name | $loc"
      else
        echo "GONE   | conf | $name | ($source)"
      fi
      ;;
    component|comp)
      # shellcheck disable=SC2086
      match=$(grep -rn "$name" $EXCLUDE --include="*.py" --include="*.ts" --include="*.go" --include="*.js" -l 2>/dev/null | head -3)
      if [[ -n "$match" ]]; then
        echo "EXISTS | comp | $name | found in: $match"
      else
        echo "GONE   | comp | $name | ($source)"
      fi
      ;;
    *)
      echo "SKIP   | unknown type: $type | $name | ($source)"
      ;;
  esac
done < "$CLAIMS_FILE"

echo ""
echo "=== DONE ==="
