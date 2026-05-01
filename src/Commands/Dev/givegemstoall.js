const { setTimeout: sleep } = require('timers/promises')

module.exports = {
  name: 'givegemstoall',
  aliases: ['givegemsall', 'giftgemsall'],
  category: 'dev',
  exp: 0,
  cool: 10,
  react: '💎',
  hidden: true,
  usage: 'Use {prefix}givegemstoall <amount> | <reason>',
  description: 'Owner-only: give gems to every registered user and DM them one by one every minute.',

  async execute(client, arg, M) {
    if (!client.isOwner(M)) return M.reply('This command is only for the bot owner.')

    const parts = String(arg || '').split('|').map((item) => item.trim())
    const amount = Number(parts[0] || 0)
    const reason = parts[1] || 'No reason provided.'

    if (!amount || isNaN(amount) || amount <= 0) {
      return M.reply(
        `Provide a valid positive amount and optional reason.\nUsage: givegemstoall <amount> | <reason>`
      )
    }

    const users = await client.getAllUsers().catch(() => [])
    if (!Array.isArray(users) || users.length === 0) {
      return M.reply('No users were found to send gems to.')
    }

    await M.reply(
      `✅ Starting gift delivery to ${users.length} users.\nEach user will receive ${amount.toLocaleString()} gems every minute.`
    )

    for (let i = 0; i < users.length; i++) {
      const userJid = users[i]

      try {
        let eco = await client.getEcon(userJid, { createIfMissing: true })

        if (!eco) {
          const uid = String(userJid).split('@')[0]
          eco = await client.econ.create({ userId: uid })
        }

        const before = Number(eco.gem) || 0
        eco.gem = before + amount
        await eco.save()

        await client.sendMessage(userJid, {
          text: `💎 You have received *${amount.toLocaleString()}* gems from the bot owner.\nReason: ${reason}\nNew balance: *${eco.gem.toLocaleString()}* gems`,
        })

      } catch (error) {
        console.error(`givegemstoall: failed for ${users[i]}:`, error?.message || error)
      }

      if (i < users.length - 1) {
        await sleep(60000)
      }
    }

    return client.sendMessage(
      M.from,
      { text: `✅ Gift delivery completed for ${users.length} users.` },
      { quoted: M }
    )
  }
}
