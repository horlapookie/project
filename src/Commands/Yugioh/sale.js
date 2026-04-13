const { getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'sale',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '🏷',
  category: 'yu-gi-oh-cards',
  usage: 'Use :sale <index> <price>',
  description: 'List a Yu-Gi-Oh card for sale',
  async execute(client, arg, M) {
    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return M.reply(`Use *${client.prefix}sale 1 5000*`)
    const idx = parseInt(parts[0], 10)
    const price = parseInt(parts[1], 10)
    if (!idx || idx < 1 || !price || price < 1) return M.reply('Invalid index or price.')

    const userKey = getUserKey(client, M)
    const collection = await getCollection(client, userKey)
    if (idx > collection.length) return M.reply('Invalid collection index.')

    const [card] = collection.splice(idx - 1, 1)
    await setCollection(client, userKey, collection)

    const listing = {
      id: Date.now(),
      seller: userKey,
      card,
      price
    }
    const market = (await client.DB.get('yu-market')) || []
    market.push(listing)
    await client.DB.set('yu-market', market)

    return M.reply(`Listed *${card.name}* for *${price} gold*.\nListing ID: ${listing.id}`)
  }
}

