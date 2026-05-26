#!/usr/bin/env bash
# Install the pre-commit secret-scan hook for local development.
# Run once after cloning or after .pre-commit-config.yaml changes.
#
# Note on --no-verify bypasses: git's --no-verify flag skips all hooks at the
# git level and cannot be intercepted by any hook. Bypass detection relies on
# the absence of a hook-run entry for a given commit in .git/secret-scan.log.
# Use SKIP=gitleaks for intentional per-commit bypasses of this hook only --
# those ARE logged in the pre-commit framework's own output.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if ! command -v pre-commit &>/dev/null; then
  echo "pre-commit not found. Installing via pip..."
  pip install pre-commit
fi

cd "$REPO_ROOT"

# pre-commit refuses to install when core.hooksPath is explicitly set, even if it points
# to the default .git/hooks location. Unset it so pre-commit can write its hook entry.
if git config core.hooksPath &>/dev/null; then
  echo "Unsetting core.hooksPath (pre-commit requires the default hooks directory)..."
  git config --unset-all core.hooksPath
fi

pre-commit install --install-hooks
echo "Secret-scan pre-commit hook installed."
