const { fetchById, normalizeCard, getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yuget',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '✅',
  category: 'yu-gi-oh-cards',
  usage: 'Use :yuget',
  description: 'Get the currently spawned Yu-Gi-Oh card',
  async execute(client, arg, M) {
    const jid = M.from
    const cached = client.yuMap?.get(jid) || (await client.DB.get(`yu-spawn-${jid}`).catch(() => null))
    if (!cached || !cached.cardId) return M.reply('No Yu-Gi-Oh card is currently spawned here.')
    if (cached.expiresAt && Date.now() > Number(cached.expiresAt)) {
      await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
      client.yuMap?.delete(jid)
      return M.reply('That Yu-Gi-Oh card has expired.')
    }

    try {
      const raw = await fetchById(cached.cardId)
      if (!raw) return M.reply('Card not found.')
      const card = normalizeCard(raw)
      card.price = Number(cached.price || card.price)

      const econ = await client.getEcon(M, { createIfMissing: true })
      const balance = econ ? (econ.gem || 0) : 0
      if (balance < card.price) {
        return M.reply(`You need ${card.price} gold to get this card, but you only have ${balance}.`)
      }

      econ.gem = balance - card.price
      await econ.save()

      const userKey = getUserKey(client, M)
      const collection = await getCollection(client, userKey)
      collection.push(card)
      await setCollection(client, userKey, collection)

      await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
      client.yuMap?.delete(jid)

      return client.sendMessage(M.from, {
        text: `✅ *@${M.sender.split('@')[0]}* got *${card.name}* for *${card.price} gold*.`,
        mentions: [M.sender]
      })
    } catch (err) {
      console.error(err)
      return M.reply('Failed to claim this Yu-Gi-Oh card.')
    }
  }
}

