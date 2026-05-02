const { fetchById, normalizeCard, getDeck, setDeck, getCollection, setCollection, recordYuResult } = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')
const { isGold } = require('../../Helpers/premium')
const { renderYuBattleCard } = require('../../lib/CardRenderer')

const MAX_LP = 8000

module.exports = {
  name: 'yuget',
  aliases: ['yugrab', 'yucapture'],
  exp: 5,
  cool: 5,
  react: '⚔️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuget [deckIndex]',
  description: 'Battle the spawned wild card. Win = capture it! Lose = your deck card is removed.',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Use this in a group where a wild card has spawned.')

    const jid = M.from
    const cached = client.yuMap?.get(jid) || (await client.DB.get(`yu-spawn-${jid}`).catch(() => null))

    if (!cached || !cached.cardId) {
      return M.reply(
        `No wild Yu-Gi-Oh card is active here.\n` +
        `Wait for one to spawn, or ask a mod to use *${client.prefix}yuspawn*.`
      )
    }
    if (cached.expiresAt && Date.now() > Number(cached.expiresAt)) {
      await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
      client.yuMap?.delete(jid)
      return M.reply('That card already escaped! Wait for the next spawn.')
    }

    const userKey = getUserKey(client, M)
    const deck = await getDeck(client, userKey)

    if (!deck.length) {
      return M.reply(
        `Your battle deck is empty!\n` +
        `Use *${client.prefix}t2yudeck <index>* to move cards from your collection into your deck first.\n` +
        `Deck holds up to 6 cards (like a party).`
      )
    }

    const deckIdxRaw = String(arg || '').trim()
    const deckIdx = deckIdxRaw ? Math.max(0, parseInt(deckIdxRaw, 10) - 1) : 0
    const clampedIdx = Math.max(0, Math.min(deckIdx, deck.length - 1))
    const playerCard = deck[clampedIdx]

    let raw
    try { raw = await fetchById(cached.cardId) } catch (_) {}
    if (!raw) return M.reply('The wild card vanished before you could battle it!')

    const wildCard = normalizeCard(raw)
    wildCard.price = Number(cached.price || wildCard.price)

    await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
    client.yuMap?.delete(jid)

    const playerAtk = Number(playerCard.atk || 0)
    const wildDef = Number(wildCard.def || 0)
    const wildAtk = Number(wildCard.atk || 0)
    const playerDef = Number(playerCard.def || 0)

    let playerWins = false
    let draw = false
    let resultMsg = ''
    let playerLp = MAX_LP
    let wildLp = MAX_LP

    if (playerAtk > wildDef) {
      playerWins = true
      wildLp = Math.max(0, MAX_LP - playerAtk)
      resultMsg = `⚔️ ${playerCard.name} (ATK: ${playerAtk}) pierced ${wildCard.name} (DEF: ${wildDef})!`
    } else if (wildAtk > playerDef) {
      playerLp = Math.max(0, MAX_LP - wildAtk)
      resultMsg = `💀 ${wildCard.name} (ATK: ${wildAtk}) overpowered ${playerCard.name} (DEF: ${playerDef})!`
    } else {
      draw = true
      resultMsg = `🌀 Neither broke through — ${wildCard.name} escaped!`
    }

    let gemReward = 0
    if (playerWins) {
      const gold = await isGold(client, userKey)
      const base = Math.max(300, Math.floor(Number(wildCard.price || 3000) * 0.1))
      gemReward = gold ? Math.round(base * 1.5) : base

      const collection = await getCollection(client, userKey)
      collection.push({ ...wildCard, uid: `${wildCard.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}` })
      await setCollection(client, userKey, collection)

      try {
        const econDoc = await client.getEcon(M, { createIfMissing: true })
        if (econDoc) { econDoc.gem = (econDoc.gem || 0) + gemReward; await econDoc.save() }
      } catch (_) {}

      await recordYuResult(client, userKey, 'wild')
    } else if (!draw) {
      deck.splice(clampedIdx, 1)
      await setDeck(client, userKey, deck)
      await recordYuResult(client, 'wild', userKey)
    }

    const caption = [
      `⚔️ *Wild Card Battle!*`,
      ``,
      `🌑 *Wild:* ${wildCard.name}`,
      `   ⚔ ATK: ${wildCard.atk ?? 'N/A'} | 🛡 DEF: ${wildCard.def ?? 'N/A'}`,
      ``,
      `🔵 *@${userKey}* — Deck #${clampedIdx + 1}: ${playerCard.name}`,
      `   ⚔ ATK: ${playerCard.atk ?? 'N/A'} | 🛡 DEF: ${playerCard.def ?? 'N/A'}`,
      ``,
      resultMsg,
      ``,
      playerWins
        ? `🏆 *Captured ${wildCard.name}!* (+${gemReward.toLocaleString()} 💎)\nAdded to your collection.`
        : draw
        ? `🌀 Draw — no card gained or lost.`
        : `💀 *${playerCard.name}* was defeated and removed from your deck!`
    ].join('\n')

    try {
      const battleImg = await renderYuBattleCard({
        player1: { username: `🌑 WILD`, card: wildCard, lp: wildLp },
        player2: { username: `@${userKey}`, card: playerCard, lp: playerLp },
        result: { winner: playerWins ? 2 : draw ? 0 : 1, message: resultMsg }
      })
      return client.sendMessage(M.from, { image: battleImg, caption, mentions: [M.sender] }, { quoted: M })
    } catch (err) {
      console.error('yuget render error:', err)
      return client.sendMessage(M.from, { text: caption, mentions: [M.sender] }, { quoted: M })
    }
  }
}
