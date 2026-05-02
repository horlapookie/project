const { getDeck } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yudeck',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '📦',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yudeck [index]',
  description: 'View your Yu-Gi-Oh deck',
  async execute(client, arg, M) {
    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)
    if (!deck.length) return M.reply('Your Yu-Gi-Oh deck is empty.')

    const idx = parseInt(String(arg || '').trim(), 10)
    if (idx) {
      const card = deck[idx - 1]
      if (!card) return M.reply('Invalid index.')
      const caption = [
        `🎍 *ID:* ${card.id}`,
        `🏮 *Name:* ${card.name}`,
        `🎃 *Type:* ${card.type}`,
        `🎗 *Race:* ${card.race}`,
        `📍 *ATK:* ${card.atk ?? 'N/A'}`,
        `🛡 *DEF:* ${card.def ?? 'N/A'}`,
        `✨ *Level:* ${card.level ?? 'N/A'}`,
        `🧿 *Attribute:* ${card.attribute || 'N/A'}`,
        `💰 *Price:* ${card.price}`
      ].join('\n')
      if (card.image) {
        const buffer = await client.utils.getBuffer(card.image)
        return client.sendMessage(M.from, { image: buffer, caption }, { quoted: M })
      }
      return M.reply(caption)
    }

    let text = `🃏 *Yu-Gi-Oh Deck* (Total: ${deck.length})\n\n`
    deck.forEach((card, i) => {
      text += `*${i + 1}.* ${card.name} (ID: ${card.id})\n`
    })
    return M.reply(text.trim())
  }
}
