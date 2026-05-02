const { getWildSession, clearWildSession } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yuforfeit',
  aliases: ['yusurrender', 'yuquit'],
  exp: 0,
  cool: 4,
  react: '🏳️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuforfeit',
  description: 'Forfeit your active wild card battle (cards stay fainted until healed)',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('This command only works in groups.')

    const jid = M.from
    const userKey = getUserKey(client, M)
    const session = await getWildSession(client, jid)

    if (!session) return M.reply('No active wild card battle in this group.')

    if (session.challengerKey !== userKey && !client.isOwner(M) && !client.isMod(M)) {
      return M.reply('Only the duelist or a mod can forfeit this battle.')
    }

    const wildName = session.wildCard?.name || 'the wild card'
    await clearWildSession(client, jid)

    return M.reply([
      `🏳️ *Battle forfeited!*`,
      ``,
      `The wild *${wildName}* escapes.`,
      `No card loss — use *${client.prefix}yuheal* to restore any fainted cards.`
    ].join('\n'))
  }
}
