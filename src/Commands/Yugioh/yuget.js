const {
  fetchById, normalizeCard,
  getDeck, getCollection, setCollection,
  getDeckHp, setDeckHp, isCardFainted, calcCardHp,
  getWildSession, setWildSession, clearWildSession,
  recordYuResult
} = require('../../Helpers/yugioh')
const { getUserKey } = require('../../Helpers/yugiohCommand')
const { isGold } = require('../../Helpers/premium')
const { renderYuBattleCard } = require('../../lib/CardRenderer')

const MAX_LP = 8000
const SESSION_EXPIRE_MS = 10 * 60 * 1000

module.exports = {
  name: 'yuget',
  aliases: ['yugrab', 'yucapture'],
  exp: 5,
  cool: 5,
  react: '⚔️',
  category: 'yu-gi-oh-cards',
  usage: 'Use {prefix}yuget [deckIndex]',
  description: 'Battle the wild Yu-Gi-Oh card. Cards faint round by round — send your next card when one falls!',
  async execute(client, arg, M) {
    if (!M.isGroup) return M.reply('Use this in a group where a wild card has spawned.')

    const jid = M.from
    const userKey = getUserKey(client, M)

    // ─── Check / continue existing wild session ──────────
    let session = await getWildSession(client, jid)

    if (session) {
      // Expired? Clear it and fall through to check for spawn
      if (Date.now() > Number(session.expiresAt)) {
        await clearWildSession(client, jid)
        session = null
      } else if (session.challengerKey !== userKey) {
        return client.sendMessage(M.from, {
          text: `⚔️ *@${session.challengerKey}* is already battling the wild *${session.wildCard?.name || 'card'}*!\nWait for their battle to finish or expire.`,
          mentions: [session.challengerJid].filter(Boolean)
        }, { quoted: M })
      }
      // else: same user continuing their session — fall through to battle
    }

    // ─── No active session — start one from spawn ────────
    if (!session) {
      const spawn = client.yuMap?.get(jid) || (await client.DB.get(`yu-spawn-${jid}`).catch(() => null))

      if (!spawn || !spawn.cardId) {
        return M.reply(
          `No wild Yu-Gi-Oh card is active here.\n` +
          `Wait for one to spawn, or ask a mod to use *${client.prefix}yuspawn*.`
        )
      }
      if (spawn.expiresAt && Date.now() > Number(spawn.expiresAt)) {
        await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
        client.yuMap?.delete(jid)
        return M.reply('That card already escaped! Wait for the next spawn.')
      }

      let raw
      try { raw = await fetchById(spawn.cardId) } catch (_) {}
      if (!raw) return M.reply('The wild card vanished before you could reach it!')

      const wildCard = normalizeCard(raw)
      wildCard.price = Number(spawn.price || wildCard.price)

      // Lock the spawn so no one else can claim it
      await client.DB.delete(`yu-spawn-${jid}`).catch(() => null)
      client.yuMap?.delete(jid)

      session = {
        wildCard,
        challengerKey: userKey,
        challengerJid: M.sender,
        faintedUids: [],
        round: 1,
        expiresAt: Date.now() + SESSION_EXPIRE_MS
      }
      await setWildSession(client, jid, session)
    }

    // ─── Get player deck — filter out globally fainted and session-fainted ──
    const deck = await getDeck(client, userKey)
    const hpMap = await getDeckHp(client, userKey)

    if (!deck.length) {
      await clearWildSession(client, jid)
      return M.reply(`Your deck is empty! Use *${client.prefix}t2yudeck* to add cards.`)
    }

    const sessionFainted = new Set(session.faintedUids || [])
    const available = deck.filter(c => !sessionFainted.has(c.uid) && !isCardFainted(hpMap, c))

    if (!available.length) {
      await clearWildSession(client, jid)
      return M.reply([
        `💀 All your cards have already fainted!`,
        `Use *${client.prefix}yuheal* to restore them before battling again.`
      ].join('\n'))
    }

    // Pick card by index from available list
    const deckIdxRaw = String(arg || '').trim()
    const deckIdx = deckIdxRaw ? Math.max(0, parseInt(deckIdxRaw, 10) - 1) : 0
    const clampedIdx = Math.max(0, Math.min(deckIdx, available.length - 1))
    const playerCard = available[clampedIdx]

    const wildCard = session.wildCard
    const roundNum = session.round || 1

    // ─── Battle resolution ───────────────────────────────
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
      resultMsg = `🌀 Neither broke through — ${wildCard.name} holds its ground!`
    }

    // ─── Apply outcomes ──────────────────────────────────
    let gemReward = 0
    let outcomeText = ''

    if (playerWins) {
      const gold = await isGold(client, userKey)
      const base = Math.max(300, Math.floor(Number(wildCard.price || 3000) * 0.1))
      gemReward = gold ? Math.round(base * 1.5) : base

      const collection = await getCollection(client, userKey)
      collection.push({
        ...wildCard,
        uid: `${wildCard.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      })
      await setCollection(client, userKey, collection)

      try {
        const econDoc = await client.getEcon(M, { createIfMissing: true })
        if (econDoc) { econDoc.gem = (econDoc.gem || 0) + gemReward; await econDoc.save() }
      } catch (_) {}

      await recordYuResult(client, userKey, 'wild')
      await clearWildSession(client, jid)

      outcomeText = `🏆 *Captured ${wildCard.name}!* (+${gemReward.toLocaleString()} 💎)\nAdded to your collection.`

    } else if (draw) {
      await clearWildSession(client, jid)
      outcomeText = `🌀 The wild card escapes — no card gained or lost.`

    } else {
      // Card fainted this round — persistent HP damage
      hpMap[playerCard.uid] = 0
      await setDeckHp(client, userKey, hpMap)

      session.faintedUids = [...(session.faintedUids || []), playerCard.uid]
      session.round = (session.round || 1) + 1
      session.expiresAt = Date.now() + SESSION_EXPIRE_MS // refresh timer

      const remaining = available.filter(c => c.uid !== playerCard.uid)

      if (!remaining.length) {
        await clearWildSession(client, jid)
        await recordYuResult(client, 'wild', userKey)
        outcomeText = [
          `💀 *${playerCard.name}* fainted! All your cards were defeated.`,
          ``,
          `The wild *${wildCard.name}* escapes...`,
          ``,
          `No permanent card loss — your deck is intact.`,
          `Use *${client.prefix}yuheal* to restore fainted cards (500 💎 each).`
        ].join('\n')
      } else {
        await setWildSession(client, jid, session)
        const nextList = remaining.map((c, i) => `  *${i + 1}.* ${c.name} — ATK: ${c.atk ?? 'N/A'}`)
        outcomeText = [
          `💀 *${playerCard.name}* fainted!`,
          ``,
          `Wild *${wildCard.name}* is still standing!`,
          ``,
          `*Your remaining cards:*`,
          ...nextList,
          ``,
          `Use *${client.prefix}yuget <number>* to send your next card!`,
          `Or *${client.prefix}yuforfeit* to surrender.`
        ].join('\n')
      }
    }

    // ─── Send result ─────────────────────────────────────
    const caption = [
      `⚔️ *Wild Battle — Round ${roundNum}!*`,
      ``,
      `🌑 *Wild:* ${wildCard.name}`,
      `   ⚔ ATK: ${wildCard.atk ?? 'N/A'} | 🛡 DEF: ${wildCard.def ?? 'N/A'}`,
      ``,
      `🔵 *@${userKey}* — ${playerCard.name}`,
      `   ⚔ ATK: ${playerCard.atk ?? 'N/A'} | 🛡 DEF: ${playerCard.def ?? 'N/A'}`,
      ``,
      resultMsg,
      ``,
      outcomeText
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
