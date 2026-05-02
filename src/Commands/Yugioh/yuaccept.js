const { getDeck, recordYuResult } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')
const { renderYuBattleCard } = require('../../lib/CardRenderer')
const { isGold } = require('../../Helpers/premium')

const MAX_LP = 8000

module.exports = {
  name: 'yuaccept',
  aliases: ['yuac'],
  exp: 10,
  cool: 4,
  react: '✅',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuaccept <deckIndex>',
  description: 'Accept a Yu-Gi-Oh duel challenge',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Yu-Gi-Oh battles can only take place in groups.')

    const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
    if (!challenge) return M.reply('There is no active duel challenge in this group.')
    if (challenge.expiresAt && Date.now() > Number(challenge.expiresAt)) {
      await client.DB.delete(`yu-battle-${M.from}`)
      return M.reply('That duel challenge has already expired.')
    }

    const acceptorKey = getUserKey(client, M)
    if (challenge.target !== acceptorKey) {
      return M.reply('This duel challenge is not directed at you.')
    }

    const deckIndexRaw = String(arg || '').trim()
    const deckIdx = deckIndexRaw ? parseInt(deckIndexRaw, 10) - 1 : 0

    const acceptorDeck = await getDeck(client, acceptorKey)
    if (!acceptorDeck.length) return M.reply(`Your Yu-Gi-Oh deck is empty. You cannot accept a duel.`)

    const clampedIdx = Math.max(0, Math.min(deckIdx, acceptorDeck.length - 1))
    const acceptorCard = acceptorDeck[clampedIdx]

    await client.DB.delete(`yu-battle-${M.from}`)

    const challengerCard = challenge.challengerCard
    const challengerAtk = Number(challengerCard.atk || 0)
    const acceptorDef = Number(acceptorCard.def || 0)
    const acceptorAtk = Number(acceptorCard.atk || 0)
    const challengerDef = Number(challengerCard.def || 0)

    let winner = null
    let loser = null
    let resultMsg = ''

    if (challengerAtk > acceptorDef) {
      winner = { key: challenge.challenger, jid: challenge.challengerJid, card: challengerCard }
      loser = { key: acceptorKey, jid: M.sender, card: acceptorCard }
      resultMsg = `⚔️ *${challengerCard.name}* (ATK: ${challengerAtk}) overpowered *${acceptorCard.name}* (DEF: ${acceptorDef})!`
    } else if (acceptorAtk > challengerDef) {
      winner = { key: acceptorKey, jid: M.sender, card: acceptorCard }
      loser = { key: challenge.challenger, jid: challenge.challengerJid, card: challengerCard }
      resultMsg = `🛡 *${acceptorCard.name}* (ATK: ${acceptorAtk}) overpowered *${challengerCard.name}* (DEF: ${challengerDef})!`
    } else {
      resultMsg = `🤝 The duel ended in a *DRAW*! (ATK: ${challengerAtk} vs DEF: ${acceptorDef})`
    }

    const base = winner ? Math.max(500, Math.floor(Number(loser.card.price || 5000) * 0.2)) : 0
    let gemReward = base
    if (winner) {
      const gold = await isGold(client, winner.key)
      if (gold) gemReward = Math.round(base * 1.5)
    }

    if (winner) {
      try {
        const winnerEcon = await client.getEcon(winner.jid, { createIfMissing: true })
        if (winnerEcon) {
          winnerEcon.gem = (winnerEcon.gem || 0) + gemReward
          await winnerEcon.save()
        }
      } catch (_) { }
      await recordYuResult(client, winner.key, loser.key)
    }

    const p1IsWinner = winner && winner.key === challenge.challenger
    const p2IsWinner = winner && winner.key === acceptorKey
    const challengerLp = p1IsWinner ? MAX_LP : (winner ? Math.max(0, MAX_LP - Number(acceptorCard.atk || 0)) : MAX_LP)
    const acceptorLp = p2IsWinner ? MAX_LP : (winner ? Math.max(0, MAX_LP - Number(challengerCard.atk || 0)) : MAX_LP)

    try {
      const battleImg = await renderYuBattleCard({
        player1: {
          username: `@${challenge.challenger}`,
          card: challengerCard,
          lp: challengerLp
        },
        player2: {
          username: `@${acceptorKey}`,
          card: acceptorCard,
          lp: acceptorLp
        },
        result: {
          winner: winner ? (winner.key === challenge.challenger ? 1 : 2) : 0,
          message: resultMsg
        }
      })

      const mentions = [challenge.challengerJid, M.sender]

      const caption = [
        `⚔️ *Yu-Gi-Oh Duel Results!*`,
        ``,
        `🔴 *@${challenge.challenger}* — ${challengerCard.name}`,
        `   ATK: ${challengerCard.atk ?? 'N/A'} | DEF: ${challengerCard.def ?? 'N/A'}`,
        ``,
        `🔵 *@${acceptorKey}* — ${acceptorCard.name}`,
        `   ATK: ${acceptorCard.atk ?? 'N/A'} | DEF: ${acceptorCard.def ?? 'N/A'}`,
        ``,
        resultMsg,
        ``,
        winner
          ? `🏆 *Winner: @${winner.key}* (+${gemReward.toLocaleString()} gems)`
          : `🤝 *Draw — no gems awarded*`
      ].join('\n')

      return client.sendMessage(M.from, { image: battleImg, caption, mentions }, { quoted: M })
    } catch (err) {
      console.error('Yu battle render error:', err)
      const mentions = [challenge.challengerJid, M.sender]
      const caption = [
        `⚔️ *Yu-Gi-Oh Duel Results!*`,
        ``,
        resultMsg,
        winner ? `🏆 *Winner: @${winner.key}* (+${gemReward.toLocaleString()} gems)` : `🤝 *Draw*`
      ].join('\n')
      return client.sendMessage(M.from, { text: caption, mentions }, { quoted: M })
    }
  }
}
