const { fetchRandomCard, normalizeCard, getDeck, getCollection, setCollection } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')
const { isGold } = require('../../Helpers/premium')
const { renderYuBattleCard } = require('../../lib/CardRenderer')

module.exports = {
  name: 'yusummon',
  aliases: ['summon', 'yuwild'],
  exp: 5,
  cool: 30,
  react: '🌀',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yusummon [deckIndex]',
  description: 'Battle a wild Yu-Gi-Oh card. Win to capture it into your collection!',
  async execute(client, arg, M) {
    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)

    if (!deck.length) {
      return M.reply(`Your Yu-Gi-Oh deck is empty! Add cards with *${client.prefix}t2yudeck* first.`)
    }

    await M.reply('🌀 Summoning a wild card from the shadow realm...')

    let wildRaw
    try {
      wildRaw = await fetchRandomCard()
    } catch (err) {
      return M.reply('Failed to summon a wild card. The shadow realm is unreachable right now, try again!')
    }

    if (!wildRaw) return M.reply('No wild card appeared. Try again!')

    const wildCard = normalizeCard(wildRaw)

    const deckIdxRaw = String(arg || '').trim()
    const deckIdx = deckIdxRaw ? Math.max(0, parseInt(deckIdxRaw, 10) - 1) : 0
    const clampedIdx = Math.max(0, Math.min(deckIdx, deck.length - 1))

    const playerCard = deck[clampedIdx]

    const playerAtk = Number(playerCard.atk || 0)
    const wildDef = Number(wildCard.def || 0)
    const wildAtk = Number(wildCard.atk || 0)
    const playerDef = Number(playerCard.def || 0)

    let playerWins = false
    let resultMsg = ''

    if (playerAtk > wildDef) {
      playerWins = true
      resultMsg = `⚔️ *${playerCard.name}* (ATK: ${playerAtk}) overpowered the wild *${wildCard.name}* (DEF: ${wildDef})!`
    } else if (wildAtk > playerDef) {
      playerWins = false
      resultMsg = `💀 The wild *${wildCard.name}* (ATK: ${wildAtk}) broke through *${playerCard.name}* (DEF: ${playerDef})!`
    } else {
      playerWins = false
      resultMsg = `🌀 *${wildCard.name}* escaped the duel! (ATK ${playerAtk} couldn't pierce DEF ${wildDef})`
    }

    let gemReward = 0
    if (playerWins) {
      const gold = await isGold(client, userKey)
      const base = Math.max(300, Math.floor(Number(wildCard.price || 3000) * 0.15))
      gemReward = gold ? Math.round(base * 1.5) : base

      const collection = await getCollection(client, userKey)
      collection.push({ ...wildCard, uid: `${wildCard.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}` })
      await setCollection(client, userKey, collection)

      try {
        const econDoc = await client.getEcon(M, { createIfMissing: true })
        if (econDoc) {
          econDoc.gem = (econDoc.gem || 0) + gemReward
          await econDoc.save()
        }
      } catch (_) {}
    }

    const caption = [
      `🌀 *Wild Card Encounter!*`,
      ``,
      `🌑 *Wild Card:* ${wildCard.name}`,
      `   ⚔ ATK: ${wildCard.atk ?? 'N/A'} | 🛡 DEF: ${wildCard.def ?? 'N/A'}`,
      `   Type: ${wildCard.type} | Race: ${wildCard.race}`,
      ``,
      `🔵 *Your Card (#${clampedIdx + 1}):* ${playerCard.name}`,
      `   ⚔ ATK: ${playerCard.atk ?? 'N/A'} | 🛡 DEF: ${playerCard.def ?? 'N/A'}`,
      ``,
      resultMsg,
      ``,
      playerWins
        ? `🏆 *You captured ${wildCard.name}!* (+${gemReward.toLocaleString()} 💎)\nCard added to your collection.`
        : `💨 The wild card escaped. Train harder and try again!`
    ].join('\n')

    try {
      const battleImg = await renderYuBattleCard({
        player1: {
          username: `🌑 WILD`,
          card: wildCard
        },
        player2: {
          username: `@${userKey}`,
          card: playerCard
        },
        result: {
          winner: playerWins ? 2 : 1,
          message: resultMsg
        }
      })
      return client.sendMessage(M.from, { image: battleImg, caption, mentions: [M.sender] }, { quoted: M })
    } catch (err) {
      console.error('yusummon render error:', err)
      return client.sendMessage(M.from, { text: caption, mentions: [M.sender] }, { quoted: M })
    }
  }
}
