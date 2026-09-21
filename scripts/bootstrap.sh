#!/usr/bin/env bash
# Sets up a fresh clone: verifies prerequisites, installs the Compact
# compiler, installs npm deps, and seeds .env. Safe to re-run.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

log() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31merror:\033[0m %s\n' "$1" >&2; exit 1; }

log "Checking prerequisites"

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js not found. Install Node 22+: https://nodejs.org"
fi
NODE_MAJOR=$(node -v | sed 's/^v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 22 ]; then
  fail "Node 22+ required, found $(node -v)"
fi
echo "  node: $(node -v)"

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker not found. Install Docker Desktop / Engine."
fi
echo "  docker: $(docker --version)"

if ! docker compose version >/dev/null 2>&1; then
  fail "'docker compose' (v2 plugin) not found."
fi
echo "  $(docker compose version)"

log "Installing npm dependencies (npm ci)"
npm ci

log "Fetching the Compact compiler (@midnight-ntwrk/midnight-js-compact)"
export COMPACTC_VERSION="${COMPACTC_VERSION:-0.31.1}"
echo "  COMPACTC_VERSION=$COMPACTC_VERSION (see docs/DECISIONS.md for the pin)"
echo "  macOS/Linux x64/arm64: fetches a native compactc binary."
echo "  Other platforms (incl. Windows): falls back to Docker (COMPACT_DOCKER_IMAGE, default ghcr.io/midnight-ntwrk/compactc)."
npm run -w packages/contracts fetch-compactc

log "Seeding .env"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  created .env from .env.example — fill in real values before running services"
else
  echo "  .env already exists, leaving it untouched"
fi

log "Compiling contracts"
npm run compile:contracts

log "Bootstrap complete. Next steps:"
cat <<'EOF'
  1. Review and fill in .env (never commit it)
  2. npm run docker:up        # proof-server + server + client (dev)
  3. npm run deploy:contract  # deploy ballot.compact to the configured network
  4. See README.md for the full quickstart / demo script
EOF
