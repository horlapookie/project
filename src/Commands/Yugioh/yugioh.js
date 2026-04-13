const { fetchById, fetchByName, normalizeCard } = require('../../Helpers/yugioh')

module.exports = {
  name: 'yugioh',
  aliases: ['yu', 'yucard'],
  exp: 0,
  cool: 4,
  react: '🃏',
  category: 'yu-gi-oh-cards',
  usage: 'Use :yugioh <name|id>',
  description: 'Fetch a Yu-Gi-Oh card by name or ID',
  async execute(client, arg, M) {
    const query = String(arg || '').trim()
    if (!query) return M.reply('Use *yugioh <name|id>* to search for a card.')

    try {
      const isId = /^\d+$/.test(query)
      const raw = isId ? await fetchById(query) : await fetchByName(query)
      if (!raw) {
        return M.reply('No card matching that name was found. Try a more specific name.')
      }
      const card = normalizeCard(raw)

      const captionLines = [
        `🎍 *ID:* ${card.id}`,
        `🏮 *Name:* ${card.name}`,
        `🎃 *Type:* ${card.type}`,
        `🎗 *Race:* ${card.race || 'Unknown'}`
      ]

      if (card.atk !== null && card.atk !== undefined) captionLines.push(`📍 *ATK:* ${card.atk}`)
      if (card.def !== null && card.def !== undefined) captionLines.push(`🛡 *DEF:* ${card.def}`)
      if (card.level !== null && card.level !== undefined) captionLines.push(`✨ *Level:* ${card.level}`)
      if (card.attribute && card.attribute !== 'N/A') captionLines.push(`🧿 *Attribute:* ${card.attribute}`)
      captionLines.push(`💰 *Price:* ${card.price}`)

      const caption = captionLines.join('\n')

      if (card.image) {
        const buffer = await client.utils.getBuffer(card.image)
        return client.sendMessage(M.from, { image: buffer, caption }, { quoted: M })
      }
      return M.reply(caption)
    } catch (err) {
      console.error(err)
      return M.reply('Failed to fetch Yu-Gi-Oh card.')
    }
  }
}
