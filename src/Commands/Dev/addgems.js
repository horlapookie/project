module.exports = {
    name: 'addgems',
    aliases: ['givegems', 'grantgems'],
    category: 'dev',
    exp: 0,
    cool: 3,
    react: '💎',
    hidden: true,
    usage: 'Use {prefix}addgems <amount> @user',
    description: 'Add gems to a user account (owner only)',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('This command is only for the bot owner.')

        const recipient = M.mentions[0] || M.quoted?.participant || M.quoted?.sender
        const parts = String(arg || '').trim().split(' ')
        const amount = parseInt(parts[0])

        if (!recipient) return M.reply('Tag or quote the user you want to give gems to.')
        if (isNaN(amount) || amount <= 0) return M.reply('Provide a valid positive gem amount.\n\nUsage: addgems <amount> @user')

        let eco = await client.getEcon({ sender: recipient })
        if (!eco) {
            const uid = String(recipient).split('@')[0]
            eco = await client.econ.create({ userId: uid })
        }

        const before = Number(eco.gem) || 0
        eco.gem = before + amount
        await eco.save()

        return client.sendMessage(
            M.from,
            {
                text: `💎 Added *${amount.toLocaleString()}* gems to @${recipient.split('@')[0]}.\nNew balance: *${eco.gem.toLocaleString()} gems*`,
                mentions: [recipient]
            },
            { quoted: M }
        )
    }
}
