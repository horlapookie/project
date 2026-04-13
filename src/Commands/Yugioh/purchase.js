const { getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'purchase',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '💰',
  category: 'yu-gi-oh-cards',
  usage: 'Use :purchase <listingId>',
  description: 'Purchase a Yu-Gi-Oh card from the market',
  async execute(client, arg, M) {
    const id = parseInt(String(arg || '').trim(), 10)
    if (!id) return M.reply(`Use *${client.prefix}purchase <listingId>*`)

    const market = (await client.DB.get('yu-market')) || []
    const idx = market.findIndex((x) => Number(x.id) === id)
    if (idx < 0) return M.reply('Listing not found.')

    const listing = market[idx]
    const buyerKey = getUserKey(client, M)

    if (String(listing.seller) === String(buyerKey)) {
      return M.reply('You cannot buy your own listing.')
    }

    const econ = await client.getEcon(M, { createIfMissing: true })
    const balance = econ ? (econ.gem || 0) : 0
    if (balance < listing.price) {
      return M.reply(`You need ${listing.price} gold to buy this card, but you only have ${balance}.`)
    }

    econ.gem = balance - listing.price
    await econ.save()

    const sellerEcon = await client.getEcon(listing.seller, { createIfMissing: true })
    sellerEcon.gem = (sellerEcon.gem || 0) + listing.price
    await sellerEcon.save()

    const collection = await getCollection(client, buyerKey)
    collection.push(listing.card)
    await setCollection(client, buyerKey, collection)

    market.splice(idx, 1)
    await client.DB.set('yu-market', market)

    return M.reply(`Purchased *${listing.card.name}* for *${listing.price} gold*.`)
  }
}

