const { execSync, spawnSync } = require('child_process')
const os = require('os')

if (os.platform() !== 'linux') {
  console.log('ℹ️  Non-Linux platform detected — skipping system dependency install.')
  process.exit(0)
}

const DEPS_APT = [
  'build-essential',
  'python3',
  'pkg-config',
  'libcairo2-dev',
  'libpango1.0-dev',
  'libjpeg-dev',
  'libgif-dev',
  'librsvg2-dev',
  'libpixman-1-dev'
]

const DEPS_YUM = [
  'gcc-c++',
  'make',
  'python3',
  'cairo-devel',
  'pango-devel',
  'libjpeg-turbo-devel',
  'giflib-devel',
  'librsvg2-devel',
  'pixman-devel'
]

const DEPS_ALPINE = [
  'build-base',
  'python3',
  'pkgconf',
  'cairo-dev',
  'pango-dev',
  'jpeg-dev',
  'giflib-dev',
  'librsvg-dev',
  'pixman-dev'
]

const hasCmd = (cmd) => {
  const r = spawnSync('which', [cmd], { stdio: 'pipe' })
  return r.status === 0
}

const tryExec = (cmd) => {
  try {
    execSync(cmd, { stdio: 'inherit' })
    return true
  } catch (_) {
    return false
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('  📦 Installing system dependencies...')
console.log('  (Required for node-canvas to compile)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

let installed = false

if (hasCmd('apt-get')) {
  console.log('🐧 Detected: Debian / Ubuntu (apt-get)')
  tryExec('apt-get update -qq')
  installed = tryExec(`apt-get install -y ${DEPS_APT.join(' ')}`)
} else if (hasCmd('apt')) {
  console.log('🐧 Detected: Debian / Ubuntu (apt)')
  tryExec('apt update -qq')
  installed = tryExec(`apt install -y ${DEPS_APT.join(' ')}`)
} else if (hasCmd('apk')) {
  console.log('🐧 Detected: Alpine Linux')
  installed = tryExec(`apk add --no-cache ${DEPS_ALPINE.join(' ')}`)
} else if (hasCmd('dnf')) {
  console.log('🐧 Detected: Fedora / RHEL / Rocky (dnf)')
  installed = tryExec(`dnf install -y ${DEPS_YUM.join(' ')}`)
} else if (hasCmd('yum')) {
  console.log('🐧 Detected: CentOS / RHEL (yum)')
  installed = tryExec(`yum install -y ${DEPS_YUM.join(' ')}`)
} else if (hasCmd('pacman')) {
  console.log('🐧 Detected: Arch Linux (pacman)')
  installed = tryExec('pacman -Sy --noconfirm cairo pango libjpeg-turbo giflib librsvg pixman python base-devel')
} else {
  console.log('⚠️  Could not detect your package manager.')
  console.log('\n   Install these manually before running npm install:')
  console.log('   Ubuntu/Debian:')
  console.log(`   apt-get install -y ${DEPS_APT.join(' ')}`)
  console.log('\n   CentOS/RHEL/Fedora:')
  console.log(`   yum install -y ${DEPS_YUM.join(' ')}`)
  console.log('\n   Alpine:')
  console.log(`   apk add --no-cache ${DEPS_ALPINE.join(' ')}\n`)
  process.exit(0)
}

if (installed) {
  console.log('\n✅ System dependencies installed successfully!\n')
} else {
  console.log('\n⚠️  Some packages may have failed. If canvas errors occur, run:')
  console.log(`   apt-get install -y ${DEPS_APT.join(' ')}\n`)
}
