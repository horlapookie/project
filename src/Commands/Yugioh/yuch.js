const { getDeck, recordYuResult } = require('../../Helpers/yugioh')
const { getUserKey, resolveTarget } = require('../../Helpers/yugiohCommand')
const { isGold } = require('../../Helpers/premium')
const { renderYuBattleCard } = require('../../lib/CardRenderer')

const MAX_LP = 8000

const pickBestCard = (deck) =>
  deck.reduce((best, card) => (Number(card.atk || 0) > Number(best.atk || 0) ? card : best), deck[0])

module.exports = {
  name: 'yuch',
  aliases: ['yuchallenge', 'yqduel'],
  exp: 0,
  cool: 10,
  react: '⚔️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuch @user | {prefix}yuch --accept | {prefix}yuch --decline | {prefix}yuch --cancel',
  description: 'Quick Yu-Gi-Oh challenge — auto-picks your strongest card',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Yu-Gi-Oh challenges can only happen in groups.')

    const parts = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const flag = parts[0] || ''
    const senderKey = getUserKey(client, M)

    if (flag === '--accept' || flag === '--a') {
      const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
      if (!challenge) return M.reply('There is no active duel challenge in this group.')
      if (challenge.expiresAt && Date.now() > Number(challenge.expiresAt)) {
        await client.DB.delete(`yu-battle-${M.from}`)
        return M.reply('That duel challenge has already expired.')
      }
      if (challenge.target !== senderKey) return M.reply('This challenge is not directed at you.')

      const acceptorDeck = await getDeck(client, senderKey)
      if (!acceptorDeck.length) return M.reply('Your deck is empty. Cannot accept a duel.')

      const acceptorCard = pickBestCard(acceptorDeck)
      const challengerCard = challenge.challengerCard

      await client.DB.delete(`yu-battle-${M.from}`)

      const challengerAtk = Number(challengerCard.atk || 0)
      const acceptorDef = Number(acceptorCard.def || 0)
      const acceptorAtk = Number(acceptorCard.atk || 0)
      const challengerDef = Number(challengerCard.def || 0)

      let winner = null
      let loser = null
      let resultMsg = ''

      if (challengerAtk > acceptorDef) {
        winner = { key: challenge.challenger, jid: challenge.challengerJid, card: challengerCard }
        loser = { key: senderKey, jid: M.sender, card: acceptorCard }
        resultMsg = `⚔️ *${challengerCard.name}* (ATK: ${challengerAtk}) overpowered *${acceptorCard.name}* (DEF: ${acceptorDef})!`
      } else if (acceptorAtk > challengerDef) {
        winner = { key: senderKey, jid: M.sender, card: acceptorCard }
        loser = { key: challenge.challenger, jid: challenge.challengerJid, card: challengerCard }
        resultMsg = `🛡 *${acceptorCard.name}* (ATK: ${acceptorAtk}) overpowered *${challengerCard.name}* (DEF: ${challengerDef})!`
      } else {
        resultMsg = `🤝 The duel ended in a *DRAW*!`
      }

      const base = winner ? Math.max(500, Math.floor(Number(loser.card.price || 5000) * 0.2)) : 0
      let gemReward = base
      if (winner) {
        const gold = await isGold(client, winner.key)
        if (gold) gemReward = Math.round(base * 1.5)
        try {
          const winnerEcon = await client.getEcon(winner.jid, { createIfMissing: true })
          if (winnerEcon) { winnerEcon.gem = (winnerEcon.gem || 0) + gemReward; await winnerEcon.save() }
        } catch (_) {}
        await recordYuResult(client, winner.key, loser.key)
      }

      const p1Win = winner && winner.key === challenge.challenger
      const p2Win = winner && winner.key === senderKey
      const challengerLp = p1Win ? MAX_LP : (winner ? Math.max(0, MAX_LP - Number(acceptorCard.atk || 0)) : MAX_LP)
      const acceptorLp = p2Win ? MAX_LP : (winner ? Math.max(0, MAX_LP - Number(challengerCard.atk || 0)) : MAX_LP)

      const caption = [
        `⚔️ *Quick Duel Results!*`,
        ``,
        `🔴 *@${challenge.challenger}* — ${challengerCard.name}`,
        `   ATK: ${challengerCard.atk ?? 'N/A'} | DEF: ${challengerCard.def ?? 'N/A'}`,
        ``,
        `🔵 *@${senderKey}* — ${acceptorCard.name}`,
        `   ATK: ${acceptorCard.atk ?? 'N/A'} | DEF: ${acceptorCard.def ?? 'N/A'}`,
        ``,
        resultMsg,
        ``,
        winner
          ? `🏆 *Winner: @${winner.key}* (+${gemReward.toLocaleString()} 💎)`
          : `🤝 *Draw — no gems awarded*`
      ].join('\n')

      const mentions = [challenge.challengerJid, M.sender]

      try {
        const battleImg = await renderYuBattleCard({
          player1: { username: `@${challenge.challenger}`, card: challengerCard, lp: challengerLp },
          player2: { username: `@${senderKey}`, card: acceptorCard, lp: acceptorLp },
          result: { winner: winner ? (winner.key === challenge.challenger ? 1 : 2) : 0, message: resultMsg }
        })
        return client.sendMessage(M.from, { image: battleImg, caption, mentions }, { quoted: M })
      } catch (err) {
        console.error('yuch render error:', err)
        return client.sendMessage(M.from, { text: caption, mentions }, { quoted: M })
      }
    }

    if (flag === '--decline' || flag === '--d') {
      const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
      if (!challenge) return M.reply('No active duel challenge to decline.')
      if (challenge.target !== senderKey) return M.reply('This challenge is not directed at you.')
      await client.DB.delete(`yu-battle-${M.from}`)
      return client.sendMessage(M.from, {
        text: `🚫 *@${senderKey}* declined the duel challenge from *@${challenge.challenger}*.`,
        mentions: [M.sender, challenge.challengerJid]
      }, { quoted: M })
    }

    if (flag === '--cancel' || flag === '--c') {
      const challenge = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
      if (!challenge || challenge.challenger !== senderKey) return M.reply("You don't have a pending challenge to cancel.")
      await client.DB.delete(`yu-battle-${M.from}`)
      return M.reply('✅ Your duel challenge has been cancelled.')
    }

    const target = await resolveTarget(client, parts[0] || '', M)
    if (!target.number) {
      return M.reply(
        `Tag or reply to the user you want to duel.\n\n` +
        `*Usage:*\n` +
        `• *${client.prefix}ych @user* — challenge someone\n` +
        `• *${client.prefix}ych --accept* — accept a challenge\n` +
        `• *${client.prefix}ych --decline* — decline a challenge\n` +
        `• *${client.prefix}ych --cancel* — cancel your challenge`
      )
    }

    if (target.number === senderKey) return M.reply('You cannot duel yourself.')

    const senderDeck = await getDeck(client, senderKey)
    if (!senderDeck.length) return M.reply(`Your deck is empty. Add cards with *${client.prefix}t2yudeck*.`)

    const existing = await client.DB.get(`yu-battle-${M.from}`).catch(() => null)
    if (existing && existing.expiresAt && Date.now() < Number(existing.expiresAt)) {
      return M.reply('There is already an active duel challenge in this group. Wait for it to expire or be resolved.')
    }

    const challengerCard = pickBestCard(senderDeck)

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
        if (latest && latest.challenger === senderKey && Date.now() > Number(latest.expiresAt || 0)) {
          await client.DB.delete(`yu-battle-${M.from}`)
          await client.sendMessage(M.from, { text: `⚔️ The quick duel challenge from *@${senderKey}* expired.`, mentions: [M.sender] })
        }
      } catch (_) {}
    }, 5 * 60 * 1000)

    const caption = [
      `⚔️ *Quick Yu-Gi-Oh Challenge!*`,
      ``,
      `*@${senderKey}* challenges *@${target.number}* to a quick duel!`,
      `*(Best card auto-selected)*`,
      ``,
      `🃏 *Challenger's Card:*`,
      `🏮 Name: ${challengerCard.name}`,
      `📍 ATK: ${challengerCard.atk ?? 'N/A'}`,
      `🛡 DEF: ${challengerCard.def ?? 'N/A'}`,
      ``,
      `*@${target.number}*, use *${client.prefix}ych --accept* to accept`,
      `or *${client.prefix}ych --decline* to decline.`,
      `*(Expires in 5 minutes)*`
    ].join('\n')

    const mentions = [M.sender, target.jid]

    if (challengerCard.image) {
      const buffer = await client.utils.getBuffer(challengerCard.image)
      return client.sendMessage(M.from, { image: buffer, caption, mentions }, { quoted: M })
    }
    return client.sendMessage(M.from, { text: caption, mentions }, { quoted: M })
  }
}
