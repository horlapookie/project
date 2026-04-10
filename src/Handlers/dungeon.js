const cron = require('node-cron')
const { join } = require('path')

const buildAshenText = (prefix = '#') => {
  return [
    '🔥 *ASHEN SANCTUM* 🔥',
    '',
    'A high-risk 6v6 boss-rush dungeon where trainers enter with a full party of 6 Pokemon and battle against 6 maxed-out sanctum guardians.',
    '',
    '⚔️ *Mechanics:*',
    '- Player must enter with a full party of 6 Pokemon',
    '- Battles work like normal battles',
    '- Enemy side also has a full party of 6 super strong Pokemon',
    '- Defeat all guardians to clear the sanctum',
    '- Winning gives XP, gems, and special rewards',
    '',
    '👹 *Sanctum Guardians Example Team:*',
    '- Tyranitar',
    '- Metagross',
    '- Dragonite',
    '- Garchomp',
    '- Hydreigon',
    '- Salamence',
    '',
    '🎁 *Rewards:*',
    '- 500,000 Gems',
    '- 10 Master Balls',
    '- Huge XP reward',
    '- Chance to receive special-form Pokemon',
    '',
    '📌 *Suggested Commands:*',
    `- ${prefix}ashen`,
    `- ${prefix}ashen enter`,
    `- ${prefix}ashen status`,
    `- ${prefix}ashen quit`
  ].join('\n')
}

module.exports = async function DungeonHandler(client) {
  try {
    // prevent duplicate schedules if hot-reloading
    if (client._dungeonCronStarted) return
    client._dungeonCronStarted = true

    cron.schedule('0 */3 * * *', async () => {
      try {
        const groups = (await client.DB.get('dungeon')) || []
        if (!groups.length) return

        const imagePath = join(process.cwd(), 'assets', 'Images', 'dungeon.jpg')
        const text = buildAshenText(client.altPrefix || '#')

        for (const jid of groups) {
          try {
            await client.sendMessage(
              jid,
              {
                image: { url: imagePath },
                caption: text
              }
            )
          } catch (_) {
            // ignore per-group failures
          }
        }
      } catch (err) {
        console.error('dungeon cron error', err)
      }
    })
  } catch (err) {
    console.error('DungeonHandler init error', err)
  }
}

