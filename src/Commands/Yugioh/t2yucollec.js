const { getDeck, setDeck, getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 't2yucollec',
  aliases: ['t2yucoll'],
  exp: 0,
  cool: 4,
  react: '📥',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}t2yucollec <index>',
  description: 'Transfer a Yu-Gi-Oh card from deck to collection',
  async execute(client, arg, M) {
    const idx = parseInt(String(arg || '').trim(), 10)
    if (!idx || idx < 1) return M.reply(`Use *${client.prefix}t2yucollec 1*`)

    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)
    if (!deck.length) return M.reply('Your deck is empty.')
    if (idx > deck.length) return M.reply(`Invalid index. Your deck has ${deck.length} cards.`)

    const [card] = deck.splice(idx - 1, 1)
    const collection = await getCollection(client, userKey)
    collection.push(card)

    await setDeck(client, userKey, deck)
    await setCollection(client, userKey, collection)

    return M.reply(`Moved *${card.name}* to your collection.`)
  }
}

