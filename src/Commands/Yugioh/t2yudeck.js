const { getDeck, setDeck, getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')
const { isGold, MAX_DECK_SIZE } = require('../../Helpers/premium')

module.exports = {
  name: 't2yudeck',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '📤',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}t2yudeck <index>',
  description: 'Transfer a Yu-Gi-Oh card from collection to deck',
  async execute(client, arg, M) {
    const idx = parseInt(String(arg || '').trim(), 10)
    if (!idx || idx < 1) return M.reply(`Use *${client.prefix}t2yudeck 1*`)

    const userKey = getUserKey(client, M)
    const collection = await getCollection(client, userKey)
    if (!collection.length) return M.reply('Your collection is empty.')
    if (idx > collection.length) return M.reply(`Invalid index. Your collection has ${collection.length} cards.`)

    const deck = await getDeck(client, userKey)
    const gold = await isGold(client, userKey)
    const deckLimit = MAX_DECK_SIZE(gold)
    if (deck.length >= deckLimit) {
      const upgradeMsg = !gold ? ` Upgrade to 👑 *Gold* to expand to 60 cards!` : ''
      return M.reply(`Your deck is full (${deckLimit} cards).${upgradeMsg}`)
    }

    const [card] = collection.splice(idx - 1, 1)
    deck.push(card)

    await setCollection(client, userKey, collection)
    await setDeck(client, userKey, deck)

    return M.reply(`Moved *${card.name}* to your deck.`)
  }
}

