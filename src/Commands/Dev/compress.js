const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

module.exports = {
    name: 'compress',
    aliases: ['compress-gems'],
    category: 'dev',
    exp: 0,
    cool: 5,
    react: '💎',
    usage: 'Use {prefix}compress <amount> @user or reply to user',
    description: 'Owner or co-owner can compress a user’s wallet and treasury to the specified amount.',
    async execute(client, arg, M) {
        if (!client.isOwner(M) && !client.isCoOwner(M)) return M.reply('Only the owner or a co-owner can use this command.')

        const rawArg = String(arg || '').trim()
        const amountMatch = rawArg.match(/\d+/)
        const amount = amountMatch ? Number(amountMatch[0]) : NaN
        if (isNaN(amount) || amount <= 0) return M.reply('Please provide a valid amount to compress.')

        const target = M.mentions?.[0] || (M.quoted && M.quoted.participant)
        if (!target) return M.reply('Reply to a user or mention them to compress their gems.')

        const economy = await client.getEcon(target, { createIfMissing: true })
        if (!economy) return M.reply('Unable to locate the target user economy account.')

        economy.gem = amount
        economy.treasury = amount
        await economy.save()

        return M.reply(`Compressed <@${target.split('@')[0]}> wallet and treasury to *${amount}* gems.`)
    }
}
