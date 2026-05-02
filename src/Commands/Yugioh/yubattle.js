const { getDeck, fetchById, normalizeCard } = require('../../Helpers/yugioh')
const { getUserKey, resolveTarget } = require('../../Helpers/yugiohCommand')

module.exports = {
  name: 'yubattle',
  aliases: ['yuduel'],
  exp: 0,
  cool: 10,
  react: '⚔️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yubattle @user <deckIndex>',
  description: 'Challenge another user to a Yu-Gi-Oh duel',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Yu-Gi-Oh battles can only take place in groups.')

    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const target = await resolveTarget(client, parts[0] || '', M)
    if (!target.number) return M.reply(`Tag or reply to the user you want to duel.\nUsage: *${client.prefix}yubattle @user <deckIndex>*`)

    const senderKey = getUserKey(client, M)
    if (target.number === senderKey) return M.reply('You cannot duel yourself.')

    const deckIndexRaw = parts.find(p => /^\d+$/.test(p))
    const deckIdx = deckIndexRaw ? parseInt(deckIndexRaw, 10) - 1 : 0

    const senderDeck = await getDeck(client, senderKey)
    if (!senderDeck.length) return M.reply(`Your Yu-Gi-Oh deck is empty. Add cards with *${client.prefix}yudeck*.`)

    const clampedIdx = Math.max(0, Math.min(deckIdx, senderDeck.length - 1))
    const challengerCard = senderDeck[clampedIdx]

    const existing = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
    if (existing && existing.expiresAt && Date.now() < Number(existing.expiresAt)) {
      return M.reply('There is already an active duel challenge in this group. Wait for it to expire or be accepted.')
    }

    const challenge = {
      challenger: senderKey,
      challengerJid: M.sender,
      target: target.number,
      targetJid: target.jid,
      challengerCard,
      groupJid: M.from,
      expiresAt: Date.now() + 5 * 60 * 1000
    }

    await client.DB.set(`yu-battle-${M.from}`, challenge)

    setTimeout(async () => {
      try {
        const latest = await client.DB.get(`yu-battle-${M.from}`)
        if (latest && latest.challenger === senderKey && latest.expiresAt && Date.now() > Number(latest.expiresAt)) {
          await client.DB.delete(`yu-battle-${M.from}`)
          await client.sendMessage(M.from, { text: `⚔️ The Yu-Gi-Oh duel challenge from *@${senderKey}* expired.`, mentions: [M.sender] })
        }
      } catch (_) { }
    }, 5 * 60 * 1000)

    const caption = [
      `⚔️ *Yu-Gi-Oh Duel Challenge!*`,
      ``,
      `*@${senderKey}* challenges *@${target.number}* to a duel!`,
      ``,
      `🃏 *Challenger's Card:*`,
      `🏮 Name: ${challengerCard.name}`,
      `📍 ATK: ${challengerCard.atk ?? 'N/A'}`,
      `🛡 DEF: ${challengerCard.def ?? 'N/A'}`,
      ``,
      `*@${target.number}*, use *${client.prefix}yuaccept <deckIndex>* to accept`,
      `or *${client.prefix}yudecline* to decline.`,
      `*(Challenge expires in 5 minutes)*`
    ].join('\n')

    const mentions = [M.sender, target.jid]

    if (challengerCard.image) {
      const buffer = await client.utils.getBuffer(challengerCard.image)
      return client.sendMessage(M.from, { image: buffer, caption, mentions }, { quoted: M })
    }
    return client.sendMessage(M.from, { text: caption, mentions }, { quoted: M })
  }
}
