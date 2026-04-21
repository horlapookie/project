const cron = require('node-cron')
const { join } = require('path')

const buildAshenText = (prefix = '-') => {
  return [
    '🔥 *ASHEN SANCTUM* 🔥',
    '',
    '⚠️ *An extremely dangerous dungeon has appeared!*',
    'Set your party and use *enter* if you wish to enter.',
    'Only one trainer can enter at a time in this group.',
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
    `- ${prefix}ashen spawn (owner only)`,
    `- ${prefix}ashen enter`,
    `- ${prefix}ashen status`,
    `- ${prefix}ashen quit`
  ].join('\n')
}

const markAshenActive = async (client, jid) => {
  const key = `ashen-active-${jid}`
  const now = Date.now()
  const expiresAt = now + 40 * 60 * 1000
  await client.DB.set(key, { spawnedAt: now, expiresAt }).catch(() => null)
  await client.DB.set(`ashen-last-${jid}`, now).catch(() => null)
}

module.exports = async function DungeonHandler(client) {
  try {
    // prevent duplicate schedules if hot-reloading
    if (client._dungeonCronStarted) return
    client._dungeonCronStarted = true

    // Run hourly and only spawn at most ONCE PER DAY per group (UTC).
    cron.schedule('0 * * * *', async () => {
      try {
        const groups = (await client.DB.get('dungeon')) || []
        if (!groups.length) return

        const imagePath = join(process.cwd(), 'assets', 'Images', 'dungeon.jpg')
        const text = buildAshenText(client.prefix || '-')
        const today = new Date().toISOString().slice(0, 10)

        for (const jid of groups) {
          try {
            const lastDay = (await client.DB.get(`ashen-day-${jid}`).catch(() => null)) || ''
            if (lastDay === today) continue
            // Don't double-spawn if a manual one is already active.
            const active = await client.DB.get(`ashen-active-${jid}`).catch(() => null)
            if (active?.expiresAt && Date.now() <= Number(active.expiresAt)) continue

            await markAshenActive(client, jid)
            await client.DB.set(`ashen-day-${jid}`, today).catch(() => null)
            // Tag all participants without adding extra "tagall" text.
            const meta = await client.groupMetadata(jid).catch(() => null)
            const mentions = (meta?.participants || []).map((p) => p?.id).filter(Boolean)
            await client.sendMessage(
              jid,
              {
                image: { url: imagePath },
                caption: text,
                mentions
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
