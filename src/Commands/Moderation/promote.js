module.exports = {
    name: 'promote',
    aliases: ['promo'],
    exp: 10,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :promote @tag',
    description: 'Promotes the tagged user',
    async execute(client, arg, M) {
    
        if (!M.mentions.length) return M.reply('You must tag the user before using!')
        const groupMetadata = await client.groupMetadata(M.from)
        const groupMembers = groupMetadata?.participants || []
        const groupAdmins = groupMembers.filter((v) => v.isAdmin).map((v) => v.id)

        const usersToPromote = M.mentions.filter((user) => !groupAdmins.includes(user))
        if (usersToPromote.length === 0) {
            return M.reply('All tagged users are already admins.')
        }

        await client.groupParticipantsUpdate(M.from, usersToPromote, 'promote').then((res) => {
            M.reply(`Done! Promoting ${usersToPromote.length} users`)
        })
    }
}
