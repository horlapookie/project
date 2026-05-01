const { createInterface } = require('readline')
const path = require('path')

const PASSKEY = 'horlapookie'

const ask = (rl, question) => new Promise((resolve) => rl.question(question, resolve))

const run = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const input = (await ask(rl, 'Enter restore passkey: ')).trim()
  rl.close()

  if (input !== PASSKEY) {
    console.error('❌ Invalid passkey. Access denied.')
    process.exit(1)
  }

  console.log('✅ Passkey accepted. Starting restoration...')
  require(path.join(__dirname, 'src', 'aurora.js'))
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Restore failed:', err)
    process.exit(1)
  })
}
