module.exports = {
    name: 'clan-treasury',
    aliases: ['treasury-clan', 'clantreasury'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '🏦',
    usage: 'Use {prefix}clan-treasury <tag> or {prefix}clan-treasury',
    description: 'Show your clan treasury with a clan-themed image.',
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

        const treasury = Number(clan.treasury || 0)
        const imageUrl = 'https://i.ibb.co/S4dXdCD0/file-00000000a6c8720a85a519fec160929e.png'
        const caption = `🏦 Clan Treasury for *${clan.tag}*\nPresident: @${String(clan.leader).split('@')[0]}\nTreasury: *${treasury}* gems`

        return client.sendMessage(M.from, { image: { url: imageUrl }, caption, mentions: [clan.leader] }, { quoted: M })
    }
}
