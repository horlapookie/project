const { execSync, spawnSync } = require('child_process')
const os = require('os')
const path = require('path')

if (os.platform() !== 'linux') {
  console.log('ℹ️  Non-Linux platform detected — skipping system dependency install.')
  process.exit(0)
}

// ─── System packages needed by node-canvas and skia-canvas ──────────────────

const DEPS_APT = [
  'build-essential', 'python3', 'pkg-config', 'curl',
  'libcairo2-dev', 'libpango1.0-dev', 'libjpeg-dev',
  'libgif-dev', 'librsvg2-dev', 'libpixman-1-dev'
]

const DEPS_YUM = [
  'gcc-c++', 'make', 'python3', 'curl',
  'cairo-devel', 'pango-devel', 'libjpeg-turbo-devel',
  'giflib-devel', 'librsvg2-devel', 'pixman-devel'
]

const DEPS_ALPINE = [
  'build-base', 'python3', 'pkgconf', 'curl',
  'cairo-dev', 'pango-dev', 'jpeg-dev',
  'giflib-dev', 'librsvg-dev', 'pixman-dev'
]

const hasCmd = (cmd) => spawnSync('which', [cmd], { stdio: 'pipe' }).status === 0

const tryExec = (cmd, opts = {}) => {
  try {
    execSync(cmd, { stdio: 'inherit', ...opts })
    return true
  } catch (_) {
    return false
  }
}

// ─── Step 1: System deps ─────────────────────────────────────────────────────

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  📦 Step 1/2 — Installing system libraries...')
console.log('  (Cairo, Pango, libjpeg — required by canvas packages)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

let sysDepsOk = false

if (hasCmd('apt-get')) {
  console.log('🐧 Detected: Debian / Ubuntu (apt-get)')
  tryExec('apt-get update -qq')
  sysDepsOk = tryExec(`apt-get install -y ${DEPS_APT.join(' ')}`)
} else if (hasCmd('apt')) {
  console.log('🐧 Detected: Debian / Ubuntu (apt)')
  tryExec('apt update -qq')
  sysDepsOk = tryExec(`apt install -y ${DEPS_APT.join(' ')}`)
} else if (hasCmd('apk')) {
  console.log('🐧 Detected: Alpine Linux')
  sysDepsOk = tryExec(`apk add --no-cache ${DEPS_ALPINE.join(' ')}`)
} else if (hasCmd('dnf')) {
  console.log('🐧 Detected: Fedora / RHEL / Rocky (dnf)')
  sysDepsOk = tryExec(`dnf install -y ${DEPS_YUM.join(' ')}`)
} else if (hasCmd('yum')) {
  console.log('🐧 Detected: CentOS / RHEL (yum)')
  sysDepsOk = tryExec(`yum install -y ${DEPS_YUM.join(' ')}`)
} else if (hasCmd('pacman')) {
  console.log('🐧 Detected: Arch Linux (pacman)')
  sysDepsOk = tryExec('pacman -Sy --noconfirm cairo pango libjpeg-turbo giflib librsvg pixman python base-devel curl')
} else {
  console.log('⚠️  Could not detect package manager. Install these manually if canvas fails:')
  console.log(`   apt-get install -y ${DEPS_APT.join(' ')}`)
}

console.log(sysDepsOk ? '\n✅ System libraries ready.\n' : '\n⚠️  Some system packages may have failed — continuing anyway.\n')

// ─── Step 2: Rust / Cargo (needed if skia-canvas must compile from source) ───
// skia-canvas v3 tries pre-built binaries first (no Rust needed for most servers).
// This installs Rust as a fallback for when pre-built download fails.

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  🦀 Step 2/2 — Checking Rust / Cargo...')
console.log('  (Required only if skia-canvas pre-built binary fails)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const cargoBin = path.join(os.homedir(), '.cargo', 'bin')
const cargoExe = path.join(cargoBin, 'cargo')

// Extend PATH for child processes spawned during this npm install session
if (!process.env.PATH.includes(cargoBin)) {
  process.env.PATH = `${cargoBin}:${process.env.PATH}`
}

const cargoAvailable = hasCmd('cargo') || spawnSync(cargoExe, ['--version'], { stdio: 'pipe' }).status === 0

if (cargoAvailable) {
  console.log('✅ Rust / Cargo already installed — skipping.\n')
} else {
  console.log('🔧 Rust not found. Installing via rustup...\n')

  const curlAvailable = hasCmd('curl')
  if (!curlAvailable) {
    console.log('⚠️  curl not found — cannot auto-install Rust.')
    console.log('   Install Rust manually: https://rustup.rs')
    console.log('   Then re-run: npm install\n')
  } else {
    const rustInstalled = tryExec(
      `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path`,
      { shell: '/bin/bash' }
    )

    if (rustInstalled) {
      // Make cargo available to the rest of this npm install
      process.env.PATH = `${cargoBin}:${process.env.PATH}`

      // Persist it for future shell sessions
      const profileLines = [
        '',
        '# Rust / Cargo (added by HELLRYZEN setup)',
        `export PATH="${cargoBin}:$PATH"`
      ].join('\n')

      const profileFiles = [
        path.join(os.homedir(), '.bashrc'),
        path.join(os.homedir(), '.profile')
      ]
      for (const f of profileFiles) {
        try {
          require('fs').appendFileSync(f, profileLines + '\n')
        } catch (_) {}
      }

      // System-wide so all users get it
      try {
        require('fs').writeFileSync(
          '/etc/profile.d/cargo.sh',
          `export PATH="${cargoBin}:$PATH"\n`
        )
      } catch (_) {}

      console.log('✅ Rust installed and PATH configured.\n')
    } else {
      console.log('⚠️  Rust install failed. If skia-canvas compilation fails, run:')
      console.log('   curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh')
      console.log('   source "$HOME/.cargo/env"')
      console.log('   npm install\n')
    }
  }
}

console.log('✅ Pre-install checks done. Running npm install...\n')
