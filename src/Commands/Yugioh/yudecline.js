const { getUserKey } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yudecline',
  aliases: ['yureject'],
  exp: 0,
  cool: 4,
  react: '❌',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yudecline',
  description: 'Decline a Yu-Gi-Oh duel challenge',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Yu-Gi-Oh battles can only take place in groups.')

    const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
    if (!challenge) return M.reply('There is no active duel challenge in this group.')

    const userKey = getUserKey(client, M)
    if (challenge.target !== userKey && challenge.challenger !== userKey && !client.isStaff?.(M)) {
      return M.reply('Only the challenged player or staff can cancel a duel.')
    }

    await client.DB.delete(`yu-battle-${M.from}`)

    const mentions = [challenge.challengerJid, challenge.targetJid].filter(Boolean)
    return client.sendMessage(
      M.from,
      {
        text: `❌ *@${userKey}* declined the Yu-Gi-Oh duel challenge from *@${challenge.challenger}*.`,
        mentions
      },
      { quoted: M }
    )
  }
}
