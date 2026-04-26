const { getCollection, setCollection } = require('../../Helpers/yugioh')
const { resolveTarget, getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'giveyucard',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '🎁',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}giveyucard <index> @user',
  description: 'Give a Yu-Gi-Oh card to another user',
  async execute(client, arg, M) {
    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const idx = parseInt(parts[0], 10)
    if (!idx || idx < 1) return M.reply(`Use *${client.prefix}giveyucard 1 @user*`)

    const target = await resolveTarget(client, parts[1] || '', M)
    if (!target.number) return M.reply('Reply to a user, tag a user, or type a number.')

    const senderKey = getUserKey(client, M)
    const targetKey = target.number
    const senderCollection = await getCollection(client, senderKey)
    if (idx > senderCollection.length) return M.reply('Invalid collection index.')

    const [card] = senderCollection.splice(idx - 1, 1)
    const targetCollection = await getCollection(client, targetKey)
    targetCollection.push(card)

    await setCollection(client, senderKey, senderCollection)
    await setCollection(client, targetKey, targetCollection)

    const caption = `✅ *@${M.sender.split('@')[0]}* gave *${card.name}* to *@${target.number}*.`
    if (card.image) {
      const buffer = await client.utils.getBuffer(card.image)
      return client.sendMessage(M.from, { image: buffer, caption, mentions: [M.sender, target.jid] })
    }
    return client.sendMessage(M.from, { text: caption, mentions: [M.sender, target.jid] })
  }
}
