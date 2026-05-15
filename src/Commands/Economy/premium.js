const {
  getPremium, isGold, isGeneral, setPremium, parseDuration,
  hasPremiumCasino, hasPremiumBattle, hasPremiumRuin, hasPremiumCards, hasPremiumParty8,
  getRegistry
} = require('../../Helpers/premium')

const normalizeNumber = (v) => String(v || '').replace(/\D/g, '')

// ── Duration formatter ────────────────────────────────────────────────────────
const fmtExpiry = (expiry) => {
  if (!expiry) return 'No expiry'
  const rem = Number(expiry) - Date.now()
  if (rem <= 0) return '⚠️ Expired'
  const days  = Math.floor(rem / 86400000)
  const hours = Math.floor((rem % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

// ── Duration flag extractor ───────────────────────────────────────────────────
const getDuration = (args) => {
  const days = parseDuration(args)
  if (!days) return null
  return { days, expiry: Date.now() + days * 86400000, label: `${days} day(s)` }
}

module.exports = {
  name: 'premium',
  aliases: ['gold', 'vip', 'goldstatus', 'perks'],
  category: 'economy',
  exp: 0,
  cool: 5,
  react: '👑',
  usage: [
    '{prefix}premium                           — view your premium status',
    '{prefix}premium --gold @user [--days=30]  — grant Gold (all perks)',
    '{prefix}premium --general @user [--days=30] — grant General premium',
    '{prefix}premium --casino @user [--days=7] — grant Casino perk',
    '{prefix}premium --battle @user [--weeks=2] — grant Battle XP perk',
    '{prefix}premium --ruin @user [--months=1] — grant Ruin bonus perk',
    '{prefix}premium --cards @user [--days=14] — grant Cards perk',
    '{prefix}premium --party @user [--days=30] — grant Party-8 perk',
    '{prefix}premium --revoke @user            — revoke ALL premium',
    '{prefix}premium --list                    — show all premium users'
  ].join('\n'),
  description: 'Check or manage premium membership and perks',

  async execute(client, arg, M) {
    const args    = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const flag    = (args[0] || '').toLowerCase()
    const isOwner = client.isOwner(M)
    const isMod   = client.isStaff ? client.isStaff(M) : client.isMod(M)
    const isStaff = isOwner || isMod

    const target    = M.mentions?.[0] || M.quoted?.participant
    const targetKey = target ? normalizeNumber(target.split('@')[0]) : null

    const requiresStaff = () => {
      if (!isStaff)           return M.reply('Only the owner or moderators can manage premium.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user.')
      return null
    }

    // ── --gold ────────────────────────────────────────────────────────────────
    if (flag === '--gold' || flag === '--grant-gold') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      const updates = {
        gold: true, goldExpiry: dur ? dur.expiry : null,
        general: true, generalExpiry: dur ? dur.expiry : null,
        casino: true, casinoExpiry: dur ? dur.expiry : null,
        battle: true, battleExpiry: dur ? dur.expiry : null,
        ruin:   true, ruinExpiry:   dur ? dur.expiry : null,
        cards:  true, cardsExpiry:  dur ? dur.expiry : null,
        party8: true, party8Expiry: dur ? dur.expiry : null,
        maxParty: true
      }
      await setPremium(client, targetKey, updates)
      return client.sendMessage(M.from, {
        text: [
          `👑 *Gold Membership Granted!*`,
          ``,
          `*@${targetKey}* now has Gold${dur ? ` for *${dur.label}*` : ' (no expiry)'}.`,
          ``,
          `*All perks unlocked:*`,
          `• 🎰 Premium Casino (×36 slots, 85% win)`,
          `• ⚔️ Premium Battle (1.5× XP)`,
          `• 🏚️ Premium Ruin (+25% rewards)`,
          `• 🃏 Premium Cards (20 packs, +25% spawn)`,
          `• 🎯 Premium Party (12 Pokémon slots)`,
          `• 📖 Yu-Gi-Oh deck: up to 60 cards`,
          `• 💎 1.5× gem reward in duels`,
          `• 👑 Gold badge`
        ].join('\n'),
        mentions: [target]
      }, { quoted: M })
    }

    // ── --general ─────────────────────────────────────────────────────────────
    if (flag === '--general') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      const updates = {
        general: true, generalExpiry: dur ? dur.expiry : null,
        casino: true, casinoExpiry: dur ? dur.expiry : null,
        battle: true, battleExpiry: dur ? dur.expiry : null,
        ruin:   true, ruinExpiry:   dur ? dur.expiry : null,
        cards:  true, cardsExpiry:  dur ? dur.expiry : null,
        party8: true, party8Expiry: dur ? dur.expiry : null
      }
      await setPremium(client, targetKey, updates)
      return client.sendMessage(M.from, {
        text: [
          `⭐ *General Premium Granted!*`,
          ``,
          `*@${targetKey}* now has General Premium${dur ? ` for *${dur.label}*` : ' (no expiry)'}.`,
          ``,
          `*Perks unlocked:*`,
          `• 🎰 Premium Casino (×36 slots, 85% win)`,
          `• ⚔️ Premium Battle (1.5× XP)`,
          `• 🏚️ Premium Ruin (+25% rewards)`,
          `• 🃏 Premium Cards (20 packs, +25% spawn)`,
          `• 🎯 Premium Party (8 Pokémon slots)`,
          ``,
          `💡 Upgrade to *Gold* for 12-slot party, 60-card deck & more!`
        ].join('\n'),
        mentions: [target]
      }, { quoted: M })
    }

    // ── --casino ──────────────────────────────────────────────────────────────
    if (flag === '--casino') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      await setPremium(client, targetKey, { casino: true, casinoExpiry: dur ? dur.expiry : null })
      return client.sendMessage(M.from, {
        text: `🎰 *Premium Casino granted to @${targetKey}!*${dur ? `\n⏰ Duration: *${dur.label}*` : ''}\n\n• Slot machine up to ×36\n• 85% win chance in all casino games\n• Gamble limit: 100,000 gems`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --battle ──────────────────────────────────────────────────────────────
    if (flag === '--battle') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      await setPremium(client, targetKey, { battle: true, battleExpiry: dur ? dur.expiry : null })
      return client.sendMessage(M.from, {
        text: `⚔️ *Premium Battle granted to @${targetKey}!*${dur ? `\n⏰ Duration: *${dur.label}*` : ''}\n\nThey now earn *1.5× XP* from all battle types.`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --ruin ────────────────────────────────────────────────────────────────
    if (flag === '--ruin') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      await setPremium(client, targetKey, { ruin: true, ruinExpiry: dur ? dur.expiry : null })
      return client.sendMessage(M.from, {
        text: `🏚️ *Premium Ruin granted to @${targetKey}!*${dur ? `\n⏰ Duration: *${dur.label}*` : ''}\n\n• +25% gem rewards every Ruin encounter\n• Premium bonus on boss clear`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --cards ───────────────────────────────────────────────────────────────
    if (flag === '--cards') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      await setPremium(client, targetKey, { cards: true, cardsExpiry: dur ? dur.expiry : null })
      return client.sendMessage(M.from, {
        text: `🃏 *Premium Cards granted to @${targetKey}!*${dur ? `\n⏰ Duration: *${dur.label}*` : ''}\n\n• Claim up to 20 packs at once\n• +25% card spawn rate`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --party ───────────────────────────────────────────────────────────────
    if (flag === '--party' || flag === '--grant-party') {
      const err = requiresStaff(); if (err) return err
      const dur = getDuration(args)
      await setPremium(client, targetKey, { party8: true, party8Expiry: dur ? dur.expiry : null })
      return client.sendMessage(M.from, {
        text: `🎯 *Premium Party granted to @${targetKey}!*${dur ? `\n⏰ Duration: *${dur.label}*` : ''}\n\nThey can now hold up to *8 Pokémon* in their party.`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --revoke ──────────────────────────────────────────────────────────────
    if (flag === '--revoke') {
      if (!isOwner) return M.reply('Only the owner can revoke premium.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user.')
      await setPremium(client, targetKey, {
        gold: false, goldExpiry: null,
        general: false, generalExpiry: null,
        maxParty: false,
        casino: false, casinoExpiry: null,
        battle: false, battleExpiry: null,
        ruin:   false, ruinExpiry:   null,
        cards:  false, cardsExpiry:  null,
        party8: false, party8Expiry: null
      })
      return client.sendMessage(M.from, {
        text: `❌ All premium perks revoked for *@${targetKey}*.`,
        mentions: [target]
      }, { quoted: M })
    }

    // ── --list ────────────────────────────────────────────────────────────────
    if (flag === '--list' || flag === '--registry') {
      if (!isStaff) return M.reply('Only staff can view the premium list.')
      const registry = await getRegistry(client)
      if (!registry.length) return M.reply('📋 No premium users registered yet.')

      const lines = ['👑 *Premium Users Registry*', '']
      const mentions = []
      let count = 0

      for (const userKey of registry) {
        const prem = await getPremium(client, userKey)
        const gold    = prem.gold    && (!prem.goldExpiry    || Date.now() <= prem.goldExpiry)
        const general = prem.general && (!prem.generalExpiry || Date.now() <= prem.generalExpiry)
        const casino  = prem.casino  && (!prem.casinoExpiry  || Date.now() <= prem.casinoExpiry)
        const battle  = prem.battle  && (!prem.battleExpiry  || Date.now() <= prem.battleExpiry)
        const ruin    = prem.ruin    && (!prem.ruinExpiry    || Date.now() <= prem.ruinExpiry)
        const cards   = prem.cards   && (!prem.cardsExpiry   || Date.now() <= prem.cardsExpiry)
        const party8  = prem.party8  && (!prem.party8Expiry  || Date.now() <= prem.party8Expiry)

        const activePerks = []
        if (gold)    activePerks.push(`👑 Gold (${fmtExpiry(prem.goldExpiry)})`)
        else if (general) activePerks.push(`⭐ General (${fmtExpiry(prem.generalExpiry)})`)
        else {
          if (casino) activePerks.push(`🎰 Casino (${fmtExpiry(prem.casinoExpiry)})`)
          if (battle) activePerks.push(`⚔️ Battle (${fmtExpiry(prem.battleExpiry)})`)
          if (ruin)   activePerks.push(`🏚️ Ruin (${fmtExpiry(prem.ruinExpiry)})`)
          if (cards)  activePerks.push(`🃏 Cards (${fmtExpiry(prem.cardsExpiry)})`)
          if (party8) activePerks.push(`🎯 Party8 (${fmtExpiry(prem.party8Expiry)})`)
        }
        if (!activePerks.length) continue

        count++
        const jid = `${userKey}@s.whatsapp.net`
        mentions.push(jid)
        lines.push(`${count}. @${userKey}`)
        for (const p of activePerks) lines.push(`   • ${p}`)
        lines.push('')
      }

      if (count === 0) return M.reply('📋 No users with active premium perks.')
      lines.push(`━━━━━━━━━━━━━━━━━━━━`)
      lines.push(`Total: *${count}* premium user(s)`)

      return client.sendMessage(M.from, {
        text: lines.join('\n'),
        mentions
      }, { quoted: M })
    }

    // ── View status ───────────────────────────────────────────────────────────
    const checkTarget = target || M.sender
    const checkKey    = target ? targetKey : normalizeNumber(M.sender.split('@')[0])
    if (target && !isStaff) return M.reply("Only staff can check another user's premium status.")

    const prem   = await getPremium(client, checkKey)
    const gold   = await isGold(client, checkKey)
    const gen    = await isGeneral(client, checkKey)
    const casino = await hasPremiumCasino(client, checkKey)
    const battle = await hasPremiumBattle(client, checkKey)
    const ruin   = await hasPremiumRuin(client, checkKey)
    const cards  = await hasPremiumCards(client, checkKey)
    const party8 = await hasPremiumParty8(client, checkKey)

    const tick = (v) => v ? '✅' : '❌'
    const expiryLine = (v, expiry) => v && prem[expiry] ? `  ⏰ ${fmtExpiry(prem[expiry])}` : ''

    const lines = [
      `👑 *Premium Status — @${checkKey}*`,
      ``,
      `🥇 *Gold Membership:* ${tick(gold)}${expiryLine(gold, 'goldExpiry')}`,
      `⭐ *General Premium:* ${tick(gen && !gold)}${expiryLine(gen && !gold, 'generalExpiry')}`,
      `🎰 *Premium Casino:* ${tick(casino)}  _(×36 slots, 85% win)_`,
      casino && prem.casinoExpiry && !gold && !gen ? `   ⏰ ${fmtExpiry(prem.casinoExpiry)}` : null,
      `⚔️ *Premium Battle:* ${tick(battle)}  _(1.5× XP)_`,
      battle && prem.battleExpiry && !gold && !gen ? `   ⏰ ${fmtExpiry(prem.battleExpiry)}` : null,
      `🏚️ *Premium Ruin:* ${tick(ruin)}  _(+25% rewards)_`,
      ruin && prem.ruinExpiry && !gold && !gen ? `   ⏰ ${fmtExpiry(prem.ruinExpiry)}` : null,
      `🃏 *Premium Cards:* ${tick(cards)}  _(20 packs, +25% spawn)_`,
      cards && prem.cardsExpiry && !gold && !gen ? `   ⏰ ${fmtExpiry(prem.cardsExpiry)}` : null,
      `🎯 *Premium Party:* ${tick(party8)}  _(8 slots / 12 for Gold)_`,
      party8 && prem.party8Expiry && !gold && !gen ? `   ⏰ ${fmtExpiry(prem.party8Expiry)}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      gold
        ? `👑 *Gold* — All perks active! Party: 12 slots, Deck: 60 cards`
        : gen
          ? `⭐ *General Premium* — All core perks active! Party: 8 slots`
          : `Contact the bot owner/mods to purchase premium perks!`
    ].filter(l => l !== null)

    return client.sendMessage(M.from, {
      text: lines.join('\n'),
      mentions: [checkTarget]
    }, { quoted: M })
  }
}
