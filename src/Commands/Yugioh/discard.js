const { getDeck, setDeck, getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'discard',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '🗑',
  category: 'yu-gi-oh-cards',
  usage: 'Use :discard <index> [--deck]',
  description: 'Discard a Yu-Gi-Oh card from your collection or deck',
  async execute(client, arg, M) {
    const raw = String(arg || '').trim()
    const useDeck = raw.includes('--deck')
    const idxStr = raw.replace('--deck', '').trim()
    const idx = parseInt(idxStr, 10)
    if (!idx || idx < 1) return M.reply(`Use *${client.prefix}discard 1* or *${client.prefix}discard 1 --deck*`)

    const userKey = getUserKey(client, M)
    if (useDeck) {
      const deck = await getDeck(client, userKey)
      if (idx > deck.length) return M.reply('Invalid deck index.')
      const [card] = deck.splice(idx - 1, 1)
      await setDeck(client, userKey, deck)
      return M.reply(`Discarded *${card.name}* from your deck.`)
    }

    const collection = await getCollection(client, userKey)
    if (idx > collection.length) return M.reply('Invalid collection index.')
    const [card] = collection.splice(idx - 1, 1)
    await setCollection(client, userKey, collection)
    return M.reply(`Discarded *${card.name}* from your collection.`)
  }
}

