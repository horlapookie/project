const {
  getPremium, isGold, hasMaxParty, setPremium,
  hasPremiumCasino, hasPremiumBattle, hasPremiumRuin, hasPremiumCards, hasPremiumParty8
} = require('../../Helpers/premium')
const normalizeNumber = (v) => String(v || '').replace(/\D/g, '')

const PERK_DEFS = [
  {
    key: 'gold',
    flag: '--gold',
    label: '👑 Gold Membership',
    desc: 'ALL premium perks + 12-slot party + 60-card Yu-Gi-Oh deck + 1.5× duel gems + Gold badge',
    short: 'Includes every other perk below.',
    staffOnly: false
  },
  {
    key: 'casino',
    flag: '--casino',
    label: '🎰 Premium Casino',
    desc: 'Slot machine pays up to ×36 (vs ×18) and all casino games have 85% win chance (vs 75%)',
    short: 'Earn more in slots & gamble.',
    staffOnly: false
  },
  {
    key: 'battle',
    flag: '--battle',
    label: '⚔️ Premium Battle',
    desc: '1.5× XP from all battle types (wild, PvP, Ruin, Ashen)',
    short: 'Level up your Pokémon faster.',
    staffOnly: false
  },
  {
    key: 'ruin',
    flag: '--ruin',
    label: '🏚️ Premium Ruin',
    desc: '25% higher gem rewards each Ruin encounter + reduced field-type penalty',
    short: 'Better rewards & easier Ruin.',
    staffOnly: false
  },
  {
    key: 'cards',
    flag: '--cards',
    label: '🃏 Premium Cards',
    desc: 'Up to 20 card packs claimed at once + 25% higher Yu-Gi-Oh card spawn rate',
    short: 'More cards, faster.',
    staffOnly: false
  },
  {
    key: 'party8',
    flag: '--party',
    label: '🎯 Premium Party',
    desc: 'Hold up to 8 Pokémon in your party instead of 6',
    short: 'Bigger team.',
    staffOnly: false
  }
]

module.exports = {
  name: 'premium',
  aliases: ['gold', 'vip', 'goldstatus', 'perks'],
  category: 'economy',
  exp: 0,
  cool: 5,
  react: '👑',
  usage: 'Use {prefix}premium | {prefix}premium --gold @user [days] | {prefix}premium --casino @user | {prefix}premium --battle @user | {prefix}premium --ruin @user | {prefix}premium --cards @user | {prefix}premium --party @user | {prefix}premium --revoke @user',
  description: 'Check or manage premium membership and perks',
  async execute(client, arg, M) {
    const args = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const flag = (args[0] || '').toLowerCase()
    const isOwner = client.isOwner(M)
    const isMod = client.isStaff ? client.isStaff(M) : client.isMod(M)

    const target = M.mentions?.[0] || M.quoted?.participant
    const targetKey = target ? normalizeNumber(target.split('@')[0]) : null

    const requiresStaff = () => {
      if (!isMod && !isOwner) return M.reply('Only the owner or moderators can manage premium.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user.')
      return null
    }

    if (flag === '--gold' || flag === '--grant-gold') {
      const err = requiresStaff(); if (err) return err
      const days = parseInt(args.find(a => /^\d+$/.test(a)) || '30', 10)
      const expiry = Date.now() + days * 24 * 60 * 60 * 1000
      await setPremium(client, targetKey, {
        gold: true, goldExpiry: expiry,
        casino: true, battle: true, ruin: true, cards: true, party8: true, maxParty: true
      })
      return client.sendMessage(M.from, {
        text: [
          `👑 *Gold Membership Granted!*`,
          ``,
          `*@${targetKey}* now has Gold for *${days} day(s)*.`,
          ``,
          `*All perks unlocked:*`,
          `• 🎰 Premium Casino (×36 slots, 85% win)`,
          `• ⚔️ Premium Battle (1.5× XP)`,
          `• 🏚️ Premium Ruin (25% more rewards)`,
          `• 🃏 Premium Cards (20 packs, +25% spawn)`,
          `• 🎯 Premium Party (12 Pokémon slots)`,
          `• 📖 Yu-Gi-Oh deck: up to 60 cards`,
          `• 💎 1.5× gem reward in duels`,
          `• 👑 Gold badge`
        ].join('\n'),
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--casino') {
      const err = requiresStaff(); if (err) return err
      await setPremium(client, targetKey, { casino: true })
      return client.sendMessage(M.from, {
        text: `🎰 *Premium Casino granted to @${targetKey}!*\n\nThey now get:\n• Slot machine up to ×36\n• 85% win chance in all casino games`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--battle') {
      const err = requiresStaff(); if (err) return err
      await setPremium(client, targetKey, { battle: true })
      return client.sendMessage(M.from, {
        text: `⚔️ *Premium Battle granted to @${targetKey}!*\n\nThey now earn 1.5× XP from all battle types.`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--ruin') {
      const err = requiresStaff(); if (err) return err
      await setPremium(client, targetKey, { ruin: true })
      return client.sendMessage(M.from, {
        text: `🏚️ *Premium Ruin granted to @${targetKey}!*\n\nThey now get 25% higher gem rewards and reduced field penalties in the Ruin.`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--cards') {
      const err = requiresStaff(); if (err) return err
      await setPremium(client, targetKey, { cards: true })
      return client.sendMessage(M.from, {
        text: `🃏 *Premium Cards granted to @${targetKey}!*\n\nThey can now claim up to 20 packs at once and have +25% card spawn rate.`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--party' || flag === '--grant-party') {
      const err = requiresStaff(); if (err) return err
      await setPremium(client, targetKey, { party8: true })
      return client.sendMessage(M.from, {
        text: `🎯 *Premium Party granted to @${targetKey}!*\n\nThey can now hold up to *8 Pokémon* in their party.`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--revoke') {
      if (!isOwner) return M.reply('Only the owner can revoke premium.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user.')
      await setPremium(client, targetKey, {
        gold: false, goldExpiry: null,
        maxParty: false, casino: false, battle: false, ruin: false, cards: false, party8: false
      })
      return client.sendMessage(M.from, {
        text: `❌ All premium perks revoked for *@${targetKey}*.`,
        mentions: [target]
      }, { quoted: M })
    }

    const checkTarget = target || M.sender
    const checkKey = target ? targetKey : normalizeNumber(M.sender.split('@')[0])
    if (target && !isMod && !isOwner) return M.reply("Only staff can check another user's premium status.")

    const prem   = await getPremium(client, checkKey)
    const gold   = await isGold(client, checkKey)
    const casino = await hasPremiumCasino(client, checkKey)
    const battle = await hasPremiumBattle(client, checkKey)
    const ruin   = await hasPremiumRuin(client, checkKey)
    const cards  = await hasPremiumCards(client, checkKey)
    const party8 = await hasPremiumParty8(client, checkKey)

    let expiryText = 'No expiry'
    if (prem.goldExpiry) {
      const rem = Number(prem.goldExpiry) - Date.now()
      expiryText = rem <= 0 ? '⚠️ Expired' : `${Math.ceil(rem / 86400000)} day(s) remaining`
    }

    const tick = (v) => v ? '✅' : '❌'

    const lines = [
      `👑 *Premium Status — @${checkKey}*`,
      ``,
      `🥇 *Gold Membership:* ${tick(gold)}${gold && prem.goldExpiry ? `  ⏰ ${expiryText}` : ''}`,
      `🎰 *Premium Casino:* ${tick(casino)}  _(×36 slots, 85% win)_`,
      `⚔️ *Premium Battle:* ${tick(battle)}  _(1.5× XP)_`,
      `🏚️ *Premium Ruin:* ${tick(ruin)}  _(+25% rewards)_`,
      `🃏 *Premium Cards:* ${tick(cards)}  _(20 packs, +25% spawn)_`,
      `🎯 *Premium Party:* ${tick(party8)}  _(8 slots)_`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `📌 *Available Premium Perks:*`,
      ``,
      ...PERK_DEFS.map(p => `*${p.label}*\n   ${p.desc}`),
      ``,
      gold
        ? `👑 *Gold* — All perks active!`
        : `Contact the bot owner to get premium perks!`
    ]

    return client.sendMessage(M.from, {
      text: lines.join('\n'),
      mentions: [checkTarget]
    }, { quoted: M })
  }
}
