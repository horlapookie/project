module.exports = {
    name: 'clan-tax',
    aliases: ['tax-clan', 'clantax'],
    category: 'clans',
    exp: 5,
    cool: 10,
    react: '💰',
    usage: 'Use {prefix}clan-tax weekly=10000 or daily=5000 or monthly=25000',
    description: 'Set a recurring clan tax that automatically deducts from clan members and adds to clan treasury.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || []
        if (!clans.length) return M.reply('No clans registered yet.')

        const clan = clans.find((c) => c.leader === M.sender)
        if (!clan) return M.reply('Only the clan leader can configure clan tax.')

        const rawArg = String(arg || '').trim()
        if (!rawArg) {
            const tax = clan.tax || {}
            return M.reply(`Current clan tax settings:\nFrequency: ${tax.frequency || 'None'}\nAmount: ${tax.amount || 0}\nNext run: ${tax.nextRun ? new Date(tax.nextRun).toLocaleString() : 'Not scheduled'}`)
        }

        const match = rawArg.match(/^(daily|weekly|monthly)=(\d+)$/i)
        if (!match) return M.reply('Invalid format. Example: clan-tax weekly=10000')

        const frequency = match[1].toLowerCase()
        const amount = Number(match[2])
        if (!amount || amount <= 0) return M.reply('Please provide a valid positive tax amount.')

        const intervalMs = frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : frequency === 'monthly' ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        clan.tax = {
            frequency,
            amount,
            nextRun: Date.now() + intervalMs
        }
        clan.taxDebt = clan.taxDebt || {}
        await client.DB.set('clans', clans)

        return M.reply(`Clan tax set to *${frequency}* with amount *${amount}* gems. Next run will occur in ${Math.round(intervalMs / 86400000)} day(s).`)
    }
}
