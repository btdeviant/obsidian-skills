#!/usr/bin/env bash
# Analyze git history for significant changes.
# Usage: git-analyst.sh [days-back] [repo-path]
# Defaults: 30 days, current directory

set -euo pipefail

DAYS="${1:-30}"
REPO="${2:-.}"

cd "$REPO"

echo "=== GIT ANALYSIS (last ${DAYS} days) ==="
echo ""

echo "--- RECENT COMMITS ---"
git log --oneline --since="${DAYS} days ago" --no-merges 2>/dev/null || echo "(no commits)"
echo ""

echo "--- BRANCHES (local + remote) ---"
git branch -a 2>/dev/null || echo "(no branches)"
echo ""

echo "--- UNMERGED FEATURE BRANCHES ---"
main_branch="main"
if ! git rev-parse --verify main &>/dev/null; then
  main_branch="master"
fi
for branch in $(git branch -r --no-merged "$main_branch" 2>/dev/null | grep -v HEAD | sed 's/^ *//'); do
  count=$(git log "${main_branch}..${branch}" --oneline 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt 0 ]; then
    echo ""
    echo "BRANCH: $branch (${count} commits ahead)"
    git log "${main_branch}..${branch}" --oneline 2>/dev/null
  fi
done
echo ""

echo "--- MAJOR REMOVALS (deleted files, last ${DAYS} days) ---"
git log --since="${DAYS} days ago" --no-merges --diff-filter=D --name-only --pretty=format:"commit %h: %s" 2>/dev/null || echo "(none)"
echo ""

echo "--- MAJOR ADDITIONS (new files, last ${DAYS} days) ---"
git log --since="${DAYS} days ago" --no-merges --diff-filter=A --name-only --pretty=format:"commit %h: %s" 2>/dev/null || echo "(none)"
echo ""

echo "=== DONE ==="
