const { getCollection } = require('../../Helpers/yugioh')
const { resolveTarget, getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yutrade',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '🤝',
  category: 'yu-gi-oh-cards',
  usage: 'Use :yutrade <yourIndex> <theirIndex> @user',
  description: 'Request a Yu-Gi-Oh card trade',
  async execute(client, arg, M) {
    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    if (parts.length < 3) return M.reply(`Use *${client.prefix}yutrade 1 2 @user*`)

    const yourIndex = parseInt(parts[0], 10)
    const theirIndex = parseInt(parts[1], 10)
    if (!yourIndex || !theirIndex) return M.reply('Invalid indices.')

    const target = await resolveTarget(client, parts[2], M)
    if (!target.number) return M.reply('Reply to a user, tag a user, or type a number.')

    const senderKey = getUserKey(client, M)
    const targetKey = target.number

    const senderCollection = await getCollection(client, senderKey)
    const targetCollection = await getCollection(client, targetKey)
    if (yourIndex < 1 || yourIndex > senderCollection.length) return M.reply('Invalid your index.')
    if (theirIndex < 1 || theirIndex > targetCollection.length) return M.reply('Invalid target index.')

    const trade = {
      id: Date.now(),
      from: senderKey,
      to: targetKey,
      give: senderCollection[yourIndex - 1],
      want: targetCollection[theirIndex - 1],
      expiresAt: Date.now() + 10 * 60 * 1000
    }
    await client.DB.set(`yu-trade-${M.from}`, trade)
    setTimeout(async () => {
      try {
        const latest = await client.DB.get(`yu-trade-${M.from}`)
        if (!latest) return
        if (latest.expiresAt && Date.now() > Number(latest.expiresAt)) {
          await client.DB.delete(`yu-trade-${M.from}`)
          await client.sendMessage(M.from, {
            text: 'Yu-Gi-Oh trade expired due to inactivity.'
          })
        }
      } catch (_) {
        // ignore
      }
    }, 10 * 60 * 1000)

    const caption =
      `*@${M.sender.split('@')[0]}* wants to trade *${trade.give.name}* for *${trade.want.name}*.\n\n` +
      `*@${target.number}* use *${client.prefix}yutrade-confirm* to accept or *${client.prefix}yutrade-delete* to cancel.`

    if (trade.give?.image) {
      const buffer = await client.utils.getBuffer(trade.give.image)
      return client.sendMessage(M.from, { image: buffer, caption, mentions: [M.sender, target.jid] })
    }

    return client.sendMessage(M.from, { text: caption, mentions: [M.sender, target.jid] })
  }
}
