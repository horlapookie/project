module.exports = {
    name: 'ping',
    aliases: ['tagall'],
    exp: 18,
    cool: 5,
    react: "✅",
    category: 'moderation',
    usage: 'Use :ping',
    description: 'Tag all the users present in the group',
    async execute(client, arg, M) {
        const groupMetadata = await client.groupMetadata(M.from)
        const groupMembers = groupMetadata?.participants.map((x) => x.id) || []
        const groupAdmins = groupMetadata.participants.filter((x) => x.isAdmin).map((x) => x.id)

        let text = `${arg !== '' ? `🧧 *Message: ${arg}*\n\n` : ''}🍀 *Group:* ${
            groupMetadata.subject
        }\n🎈 *Members:* ${groupMetadata.participants.length}\n📣 *Tagger: @${M.sender.split('@')[0]}*\n`

        const admins = groupMembers.filter((jid) => groupAdmins.includes(jid))
        const members = groupMembers.filter((jid) => !groupAdmins.includes(jid))

        for (const admin of admins) text += `\n🌟 *@${admin.split('@')[0]}*`
        for (const member of members) text += `\n🎗 *@${member.split('@')[0]}*`

        await client.sendMessage(M.from, { text, mentions: groupMembers }, { quoted: M })
    }
}
