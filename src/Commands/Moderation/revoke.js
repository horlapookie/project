module.exports = {
    name: 'revoke',
    aliases: ['reset'],
    exp: 10,
    cool: 5,
    react: "✅",
    category: 'moderation',
    usage: 'Use {prefix}revoke',
    description: 'Resets the group link',
    async execute(client, arg, M) {
    
        await client.groupRevokeInvite(M.from).then((res) => {
            M.reply(`Done! Group link has been reset`)
        })
    }
}
