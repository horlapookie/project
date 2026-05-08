module.exports = {
    name: 'clan-stats',
    aliases: ['stats-clan', 'claninfo', 'clan-stat'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '📊',
    usage: 'Use {prefix}clan-stats <tag> or {prefix}clan-stats',
    description: 'Show clan statistics, leader, treasury and roles.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || []
        if (!clans.length) return M.reply('No clans registered yet.')

        const tagInput = String(arg || '').trim()
        let clan
        if (tagInput) {
            clan = clans.find((c) => String(c.tag).toLowerCase() === tagInput.toLowerCase())
            if (!clan) return M.reply('Clan not found. Please provide a valid clan tag.')
        } else {
            clan = clans.find((c) => Array.isArray(c.members) && c.members.includes(M.sender))
            if (!clan) return M.reply('You are not a member of any clan. Provide a clan tag.')
        }

        const members = Array.isArray(clan.members) ? clan.members : []
        const roles = clan.roles || {}
        const roleLines = Object.entries(roles)
            .filter(([jid]) => members.includes(jid))
            .map(([jid, role]) => `• @${String(jid).split('@')[0]} — ${role}`)
            .join('\n') || '- None'

        const treasury = Number(clan.treasury || 0)
        const tax = clan.tax || {}
        const nextTax = tax.nextRun ? new Date(tax.nextRun).toLocaleString() : 'Not scheduled'

        const text = [
            `🏰 Clan Stats for *${clan.tag}*`,
            `President: @${String(clan.leader).split('@')[0]}`,
            `Members: ${members.length}`,
            `Treasury: ${treasury}`,
            `Tax: ${tax.frequency || 'None'} ${tax.amount || ''}`.trim(),
            `Next tax run: ${nextTax}`,
            '',
            `*Roles:*`,
            roleLines
        ].join('\n')

        return client.sendMessage(M.from, { text, mentions: [clan.leader, ...(members || [])] }, { quoted: M })
    }
}
