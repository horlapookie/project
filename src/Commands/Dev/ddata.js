module.exports = {
    name: 'ddata',
    aliases: ['isdownload', 'download-data'],
    hidden: true,
    category: 'dev',
    exp: 0,
    cool: 10,
    react: '📁',
    usage: 'Use {prefix}ddata or reply to a user with {prefix}ddata',
    description: 'Owner-only hidden command to download economy data.',
    async execute(client, arg, M) {
        if (!client.isOwner(M)) return M.reply('Only the bot owner can use this command.')

        const ownerJid = `${client.owner}@s.whatsapp.net`
        const target = M.mentions?.[0] || (M.quoted && M.quoted.participant)

        if (target) {
            const economy = await client.getEcon(target, { createIfMissing: false })
            const exp = await client.exp.get(client.getUserNumber(target)).catch(() => null)
            const result = {
                user: target,
                economy: economy ? { userId: economy.userId, gem: economy.gem, treasury: economy.treasury } : null,
                exp
            }
            const buffer = Buffer.from(JSON.stringify(result, null, 2), 'utf-8')
            const fileName = `user-data-${target.split('@')[0]}.json`

            await client.sendMessage(ownerJid, {
                document: buffer,
                fileName,
                mimetype: 'application/json',
                caption: `Downloaded data for @${target.split('@')[0]}`
            }, { quoted: M })

            if (target !== ownerJid) {
                await client.sendMessage(target, {
                    document: buffer,
                    fileName,
                    mimetype: 'application/json',
                    caption: 'Your requested data export from the bot owner.'
                })
            }

            return M.reply(`Data export sent to the owner${target !== ownerJid ? ' and the target user' : ''}.`)
        }

        const allData = await client.econ.find({}).catch(() => [])
        const buffer = Buffer.from(JSON.stringify(allData, null, 2), 'utf-8')
        const fileName = 'all-user-data.json'

        await client.sendMessage(ownerJid, {
            document: buffer,
            fileName,
            mimetype: 'application/json',
            caption: 'Downloaded all economy user data from MongoDB.'
        }, { quoted: M })

        return M.reply('All user economy data has been exported and sent to the owner.')
    }
}
