const { getCollection, setCollection, findByUid } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yutrade-confirm',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '✅',
  category: 'yu-gi-oh-cards',
  usage: 'Use :yutrade-confirm',
  description: 'Confirm a Yu-Gi-Oh trade',
  async execute(client, arg, M) {
    const trade = await client.DB.get(`yu-trade-${M.from}`)
    if (!trade) return M.reply('No pending trade in this chat.')
    if (trade.expiresAt && Date.now() > Number(trade.expiresAt)) {
      await client.DB.delete(`yu-trade-${M.from}`)
      return M.reply('That trade expired.')
    }

    const confirmer = getUserKey(client, M)
    if (String(confirmer) !== String(trade.to)) {
      return M.reply('Only the invited trader can confirm this trade.')
    }

    const fromCollection = await getCollection(client, trade.from)
    const toCollection = await getCollection(client, trade.to)
    const fromFind = findByUid(fromCollection, trade.give.uid)
    const toFind = findByUid(toCollection, trade.want.uid)

    if (!fromFind.card || !toFind.card) {
      await client.DB.delete(`yu-trade-${M.from}`)
      return M.reply('Trade failed: one of the cards is no longer available.')
    }

    fromCollection.splice(fromFind.index, 1, toFind.card)
    toCollection.splice(toFind.index, 1, fromFind.card)
    await setCollection(client, trade.from, fromCollection)
    await setCollection(client, trade.to, toCollection)
    await client.DB.delete(`yu-trade-${M.from}`)

    return M.reply(`Trade complete! *${trade.give.name}* ↔ *${trade.want.name}*`)
  }
}

