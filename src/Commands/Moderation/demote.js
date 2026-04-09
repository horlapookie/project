module.exports = {
    name: 'demote',
    aliases: ['demo'],
    exp: 5,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :demote @tag',
    description: 'Demotes the tagged user',
    async execute(client, arg, M) {
    
        if (!M.mentions.length) return M.reply('You must tag the user before using!')
        const groupMetadata = await client.groupMetadata(M.from)
        const groupMembers = groupMetadata?.participants || []
        const groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id)
        let nonAdminUsers = M.mentions.filter((user) => !groupAdmins.includes(user))
        await client.groupParticipantsUpdate(M.from, nonAdminUsers, 'demote').then((res) => {
            M.reply(`Done! Demoting ${nonAdminUsers.length} users`)
        })
    }
}
