module.exports = {
    name: 'remove',
    aliases: ['rem'],
    exp: 10,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :remove @tag',
    description: 'Removes the tagged user',
    async execute(client, arg, M) {
    
        if (!M.mentions.length) return M.reply('You must tag the user before using!')

        const groupMetadata = await client.groupMetadata(M.from)
        const groupMembers = groupMetadata?.participants || []
        const groupAdmins = groupMembers.filter((v) => v.isAdmin).map((v) => v.id)

        const usersToRemove = M.mentions.filter((user) => !groupAdmins.includes(user))
        if (usersToRemove.length === 0) {
            return M.reply('Cannot remove admin(s).')
        }

        await client.groupParticipantsUpdate(M.from, usersToRemove, 'remove').then((res) => {
            M.reply(`Done! Removing ${usersToRemove.length} users`)
        })
    }
}
