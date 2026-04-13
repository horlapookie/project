const { getDeck, setDeck } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'swapyu',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '🔁',
  category: 'yu-gi-oh-cards',
  usage: 'Use :swapyu <index1> <index2>',
  description: 'Swap two Yu-Gi-Oh cards in your deck',
  async execute(client, arg, M) {
    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return M.reply(`Use *${client.prefix}swapyu 1 2*`)

    const idx1 = parseInt(parts[0], 10) - 1
    const idx2 = parseInt(parts[1], 10) - 1

    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)
    if (idx1 < 0 || idx2 < 0 || idx1 >= deck.length || idx2 >= deck.length) {
      return M.reply('Invalid index for deck.')
    }
    if (idx1 === idx2) return M.reply('Indices must be different.')

    const temp = deck[idx1]
    deck[idx1] = deck[idx2]
    deck[idx2] = temp

    await setDeck(client, userKey, deck)
    return M.reply('Deck cards swapped.')
  }
}

