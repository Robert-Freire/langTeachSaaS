#!/bin/bash
# Worktree post-creation setup: copies env files and installs dependencies.
# Called by the PostToolUse hook after EnterWorktree.
#
# The CWD at invocation is the newly created worktree directory.

set -e

# Resolve the main repo root (first worktree listed is always the main one)
MAIN_REPO=$(git worktree list --porcelain | head -1 | sed 's/^worktree //')
WORKTREE_DIR=$(pwd)

if [ -z "$MAIN_REPO" ] || [ "$MAIN_REPO" = "$WORKTREE_DIR" ]; then
  echo "worktree-setup: not in a worktree, skipping"
  exit 0
fi

echo "worktree-setup: setting up worktree at $WORKTREE_DIR"

# --- Copy env files from main repo ---
copy_if_exists() {
  local src="$MAIN_REPO/$1"
  local dst="$WORKTREE_DIR/$1"
  if [ -f "$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
    echo "  copied $1"
  fi
}

copy_if_exists ".env"
copy_if_exists ".env.e2e"
copy_if_exists "frontend/.env.local"
copy_if_exists "frontend/.env.e2e"
copy_if_exists "e2e/.env"
copy_if_exists "infra/.env"

# --- Install frontend dependencies ---
if [ -f "$WORKTREE_DIR/frontend/package.json" ]; then
  echo "worktree-setup: installing frontend dependencies..."
  (cd "$WORKTREE_DIR/frontend" && npm ci --silent 2>&1) || echo "  WARNING: npm ci failed"
fi

# --- Install e2e dependencies (Playwright) ---
if [ -f "$WORKTREE_DIR/e2e/package.json" ]; then
  echo "worktree-setup: installing e2e dependencies..."
  (cd "$WORKTREE_DIR/e2e" && npm ci --silent 2>&1) || echo "  WARNING: e2e npm ci failed"
fi

# --- Restore backend dependencies ---
if [ -f "$WORKTREE_DIR/backend/LangTeach.sln" ]; then
  echo "worktree-setup: restoring backend dependencies..."
  (cd "$WORKTREE_DIR/backend" && dotnet restore --verbosity quiet 2>&1) || echo "  WARNING: dotnet restore failed"
fi

echo "worktree-setup: done"
