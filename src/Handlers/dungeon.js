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
    `- ${prefix}ashen spawn (owner/officer only)`,
    `- ${prefix}ashen enter`,
    `- ${prefix}ashen status`,
    `- ${prefix}ashen quit`
  ].join('\n')
}

const markAshenActive = async (client, jid) => {
  const key = `ashen-active-${jid}`
  const now = Date.now()
  const expiresAt = now + 60 * 60 * 1000  // 1 hour
  await client.DB.set(key, { spawnedAt: now, expiresAt }).catch(() => null)
  await client.DB.set(`ashen-last-${jid}`, now).catch(() => null)
}

// Returns how many times Ashen has spawned today for this group (auto only)
const getSpawnCount = async (client, jid) => {
  const today = new Date().toISOString().slice(0, 10)
  const key = `ashen-auto-count-${today}-${jid}`
  return (await client.DB.get(key).catch(() => null)) || 0
}

const incrementSpawnCount = async (client, jid) => {
  const today = new Date().toISOString().slice(0, 10)
  const key = `ashen-auto-count-${today}-${jid}`
  const cur = (await client.DB.get(key).catch(() => null)) || 0
  await client.DB.set(key, cur + 1).catch(() => null)
}

module.exports = async function DungeonHandler(client) {
  try {
    if (client._dungeonCronStarted) return
    client._dungeonCronStarted = true

    // Run every 30 minutes and spawn up to 3 times per day per group at random.
    // Groups are staggered with a random delay so they don't all spawn at the same time.
    cron.schedule('*/30 * * * *', async () => {
      try {
        const groups = (await client.DB.get('dungeon')) || []
        if (!groups.length) return

        const imagePath = join(process.cwd(), 'assets', 'Images', 'dungeon.jpg')
        const text = buildAshenText(client.prefix || '-')
        const MAX_SPAWNS_PER_DAY = 3

        // Shuffle group order for extra randomness
        const shuffled = [...groups].sort(() => Math.random() - 0.5)

        for (const jid of shuffled) {
          try {
            // Only spawn if under the daily cap
            const spawnCount = await getSpawnCount(client, jid)
            if (spawnCount >= MAX_SPAWNS_PER_DAY) continue

            // Don't double-spawn if one is already active
            const active = await client.DB.get(`ashen-active-${jid}`).catch(() => null)
            if (active?.expiresAt && Date.now() <= Number(active.expiresAt)) continue

            // Random chance per check so not every 30-min tick spawns it
            // With ~48 ticks/day and a max of 3 spawns, ~6% chance per tick is fair
            if (Math.random() > 0.08) continue

            // Stagger each group with a random delay (0–10 min)
            const delayMs = Math.floor(Math.random() * 10 * 60 * 1000)
            setTimeout(async () => {
              try {
                // Re-check after delay in case something changed
                const stillActive = await client.DB.get(`ashen-active-${jid}`).catch(() => null)
                if (stillActive?.expiresAt && Date.now() <= Number(stillActive.expiresAt)) return
                const countNow = await getSpawnCount(client, jid)
                if (countNow >= MAX_SPAWNS_PER_DAY) return

                await markAshenActive(client, jid)
                await incrementSpawnCount(client, jid)

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
              } catch (_) {}
            }, delayMs)
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
