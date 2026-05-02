const cron = require('node-cron')
const {
  normalizeCard,
  fetchRandomCard,
  fetchById
} = require('../Helpers/yugioh')

const formatSpawnText = (client, card) => {
  const lines = [
    'A YuGiOh Card Appeared!',
    '',
    `🎍 *ID:* ${card.id}`,
    `🏮 *Name:* ${card.name}`,
    `🎃 *Type:* ${card.type}`,
    `🎗 *Race:* ${card.race || 'Unknown'}`,
    `📍 *ATK:* ${card.atk ?? 'N/A'}`,
    `🛡 *DEF:* ${card.def ?? 'N/A'}`,
    '',
    `✨ *Level:* ${card.level ?? 'N/A'}`,
    `🧿 *Attribute:* ${card.attribute || 'N/A'}`
  ]

  lines.push(
    `💰 *Value:* ${card.price} gems`,
    '',
    `*⚔️ Use ${client.prefix}yuget [deckIndex] to battle this card!*`,
    `Win = capture it into your collection`,
    `Lose = your deck card is removed`
  )

  return lines.join('\n')
}

module.exports = async function YugiohHandler(client) {
  try {
    if (client._yuCronStarted) return
    client._yuCronStarted = true

    client.spawnYuCard = async (jid) => {
      const lastId = await client.DB.get(`yu-last-${jid}`).catch(() => null)
      let raw = await fetchRandomCard()
      if (raw && lastId && Number(raw.id) === Number(lastId)) {
        // Try a few extra times to avoid repeats per group.
        for (let i = 0; i < 3; i += 1) {
          const retry = await fetchRandomCard()
          if (retry && Number(retry.id) !== Number(lastId)) {
            raw = retry
            break
          }
        }
      }
      if (!raw) throw new Error('No Yugioh card returned')
      const card = normalizeCard(raw)
      const expiresAt = Date.now() + 15 * 60 * 1000
      const payload = { cardId: card.id, price: card.price, expiresAt }

      client.yuMap.set(jid, payload)
      await client.DB.set(`yu-spawn-${jid}`, payload).catch(() => null)
      await client.DB.set(`yu-last-${jid}`, card.id).catch(() => null)

      const image = card.image
      const caption = formatSpawnText(client, card)

      if (image) {
        const buffer = await client.utils.getBuffer(image)
        return client.sendMessage(jid, { image: buffer, caption })
      }
      return client.sendMessage(jid, { text: caption })
    }

    cron.schedule('*/20 * * * *', async () => {
      try {
        const groups = (await client.DB.get('yugioh')) || []
        if (!groups.length) return

        for (const jid of groups) {
          try {
            const active = (await client.DB.get(`yu-spawn-${jid}`)) || null
            if (active && active.expiresAt && Date.now() <= Number(active.expiresAt)) continue
            await client.spawnYuCard(jid)
          } catch (_) {
            // ignore per-group errors
          }
        }
      } catch (err) {
        console.error('yugioh cron error', err)
      }
    })
  } catch (err) {
    console.error('YugiohHandler init error', err)
  }
}
