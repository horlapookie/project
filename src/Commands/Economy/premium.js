const { getPremium, isGold, hasMaxParty, setPremium } = require('../../Helpers/premium')
const normalizeNumber = (v) => String(v || '').replace(/\D/g, '')

module.exports = {
  name: 'premium',
  aliases: ['gold', 'vip', 'goldstatus'],
  category: 'economy',
  exp: 0,
  cool: 5,
  react: '👑',
  usage: 'Use {prefix}premium | {prefix}premium --gold @user [days] | {prefix}premium --party @user | {prefix}premium --revoke @user',
  description: 'Check or manage premium membership (Gold & Max Party)',
  async execute(client, arg, M) {
    const args = String(arg || '').trim().split(/\s+/).filter(Boolean)
    const flag = args[0] || ''

    const target = M.mentions?.[0] || M.quoted?.participant
    const targetKey = target ? normalizeNumber(target.split('@')[0]) : null

    if (flag === '--gold' || flag === '--grant-gold') {
      if (!client.isOwner(M)) return M.reply('Only the owner can grant Gold membership.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user to grant Gold.')
      const days = parseInt(args.find(a => /^\d+$/.test(a)) || '30', 10)
      const expiry = Date.now() + days * 24 * 60 * 60 * 1000
      await setPremium(client, targetKey, { gold: true, goldExpiry: expiry })
      return client.sendMessage(M.from, {
        text: [
          `👑 *Gold Membership Granted!*`,
          ``,
          `*@${targetKey}* now has Gold for *${days} day(s)*.`,
          ``,
          `*Perks unlocked:*`,
          `• 🃏 Yu-Gi-Oh deck: up to 60 cards`,
          `• 🎯 Pokémon party: up to 12 slots`,
          `• 💎 1.5× gem reward in Yu-Gi-Oh duels`,
          `• 👑 Gold badge`
        ].join('\n'),
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--party' || flag === '--grant-party') {
      if (!client.isOwner(M)) return M.reply('Only the owner can grant Max Party.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user to grant Max Party.')
      await setPremium(client, targetKey, { maxParty: true })
      return client.sendMessage(M.from, {
        text: `🎯 *Max Party Granted!*\n\n*@${targetKey}* can now hold up to *12 Pokémon* in their party.`,
        mentions: [target]
      }, { quoted: M })
    }

    if (flag === '--revoke') {
      if (!client.isOwner(M)) return M.reply('Only the owner can revoke premium.')
      if (!target || !targetKey) return M.reply('Tag or reply to a user to revoke premium.')
      await setPremium(client, targetKey, { gold: false, goldExpiry: null, maxParty: false })
      return client.sendMessage(M.from, {
        text: `❌ All premium revoked for *@${targetKey}*.`,
        mentions: [target]
      }, { quoted: M })
    }

    const checkJid = target || M.sender
    const checkKey = target ? targetKey : normalizeNumber(M.sender.split('@')[0])

    if (target && !client.isOwner(M)) return M.reply("Only the owner can check another user's premium status.")

    const prem = await getPremium(client, checkKey)
    const gold = await isGold(client, checkKey)
    const maxParty = await hasMaxParty(client, checkKey)

    let expiryText = 'Never expires'
    if (prem.goldExpiry) {
      const remaining = Number(prem.goldExpiry) - Date.now()
      if (remaining <= 0) {
        expiryText = '⚠️ Expired'
      } else {
        const days = Math.ceil(remaining / (24 * 60 * 60 * 1000))
        expiryText = `${days} day(s) remaining`
      }
    }

    const lines = [
      `👑 *Premium Status*`,
      ``,
      `*User:* @${checkKey}`,
      ``,
      `🥇 *Gold Membership:* ${gold ? '✅ Active' : '❌ Inactive'}`,
      prem.gold ? `   ⏰ ${expiryText}` : '',
      `🎯 *Max Party:* ${maxParty ? '✅ Active' : '❌ Inactive'}`,
      ``,
      gold
        ? [`*Gold Perks Active:*`, `• 60-card Yu-Gi-Oh deck`, `• 12-slot Pokémon party`, `• 1.5× gem reward in duels`, `• Gold badge 👑`].join('\n')
        : `No active premium.\nContact @${normalizeNumber(process.env.OWNER || '')} to purchase Gold or Max Party!`
    ].filter(l => l !== '').join('\n')

    return client.sendMessage(M.from, { text: lines, mentions: [checkJid] }, { quoted: M })
  }
}
