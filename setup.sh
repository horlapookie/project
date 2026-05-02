#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HELLRYZEN — One-shot VPS setup script
# Run this ONCE on a fresh server instead of plain "npm install":
#   bash setup.sh
# After this, plain "npm install" and "npm start" will work normally.
# ─────────────────────────────────────────────────────────────────────────────

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BOLD}$1${NC}"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }

log "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "  HELLRYZEN — VPS Setup"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"

# ─── 1. Detect OS and install system libraries ────────────────────────────────
log "📦 Step 1/3 — System libraries (Cairo, Pango, libjpeg...)"

APT_DEPS="build-essential python3 pkg-config curl libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev libpixman-1-dev"
YUM_DEPS="gcc-c++ make python3 curl cairo-devel pango-devel libjpeg-turbo-devel giflib-devel librsvg2-devel pixman-devel"
ALPINE_DEPS="build-base python3 pkgconf curl cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev pixman-dev"

if command -v apt-get &>/dev/null; then
  echo "Distro: Debian / Ubuntu"
  apt-get update -qq
  apt-get install -y $APT_DEPS
elif command -v apt &>/dev/null; then
  echo "Distro: Debian / Ubuntu"
  apt update -qq
  apt install -y $APT_DEPS
elif command -v apk &>/dev/null; then
  echo "Distro: Alpine"
  apk add --no-cache $ALPINE_DEPS
elif command -v dnf &>/dev/null; then
  echo "Distro: Fedora / RHEL"
  dnf install -y $YUM_DEPS
elif command -v yum &>/dev/null; then
  echo "Distro: CentOS / RHEL"
  yum install -y $YUM_DEPS
elif command -v pacman &>/dev/null; then
  echo "Distro: Arch"
  pacman -Sy --noconfirm cairo pango libjpeg-turbo giflib librsvg pixman python base-devel curl
else
  warn "Cannot detect package manager. Install system libs manually if canvas fails."
fi

ok "System libraries done.\n"

# ─── 2. Rust / Cargo ──────────────────────────────────────────────────────────
log "🦀 Step 2/3 — Rust / Cargo"

if command -v cargo &>/dev/null || [ -f "$HOME/.cargo/bin/cargo" ]; then
  ok "Rust already installed."
  source "$HOME/.cargo/env" 2>/dev/null || export PATH="$HOME/.cargo/bin:$PATH"
else
  echo "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path

  # Load for this session
  source "$HOME/.cargo/env"

  # Persist for future sessions
  CARGO_PATH_LINE='export PATH="$HOME/.cargo/bin:$PATH"'
  for f in "$HOME/.bashrc" "$HOME/.profile" "$HOME/.zshrc"; do
    [ -f "$f" ] && grep -qF '.cargo/bin' "$f" || echo -e "\n# Rust\n$CARGO_PATH_LINE" >> "$f" 2>/dev/null || true
  done

  # System-wide
  echo "$CARGO_PATH_LINE" > /etc/profile.d/cargo.sh 2>/dev/null || true

  ok "Rust installed."
fi

echo ""

# ─── 3. npm install ───────────────────────────────────────────────────────────
log "📥 Step 3/3 — npm install"
echo ""

# Make sure cargo is in PATH for this npm install
export PATH="$HOME/.cargo/bin:$PATH"

npm install

echo ""
ok "Setup complete! Start the bot with: npm start"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
