module.exports = {
  name: 'yubattlestatus',
  aliases: ['yubs'],
  exp: 0,
  cool: 4,
  react: '🔍',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yubattlestatus',
  description: 'Check if there is a pending Yu-Gi-Oh duel challenge in this group',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('This command only works in groups.')

    const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
    if (!challenge) return M.reply('No active duel challenge in this group.')

    if (challenge.expiresAt && Date.now() > Number(challenge.expiresAt)) {
      await client.DB.delete(`yu-battle-${M.from}`)
      return M.reply('The duel challenge has expired.')
    }

    const timeLeft = Math.max(0, Math.ceil((Number(challenge.expiresAt) - Date.now()) / 1000))
    const card = challenge.challengerCard

    const mentions = [challenge.challengerJid, challenge.targetJid].filter(Boolean)
    const text = [
      `⚔️ *Active Duel Challenge*`,
      ``,
      `🔴 Challenger: @${challenge.challenger}`,
      `🔵 Target: @${challenge.target}`,
      ``,
      `🃏 Challenger's Card: ${card.name}`,
      `📍 ATK: ${card.atk ?? 'N/A'} | 🛡 DEF: ${card.def ?? 'N/A'}`,
      ``,
      `⏳ Expires in: ${timeLeft}s`,
      ``,
      `*@${challenge.target}*, use *${client.prefix}yuaccept <deckIndex>* to accept or *${client.prefix}yudecline* to decline.`
    ].join('\n')

    return client.sendMessage(M.from, { text, mentions }, { quoted: M })
  }
}
