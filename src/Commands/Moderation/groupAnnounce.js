module.exports = {
    name: 'group',
    aliases: ['gc'],
    exp: 5,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :group close/open',
    description: 'Closes or opens the group',
    async execute(client, arg, M) {
    
        const group = ['open', 'close']
        if (!arg) return M.reply('Sorry, you did not specify any term!')
        if (!group.includes(arg)) return M.reply('Sorry, you did not specify a valid term!')
        const groupMetadata = await client.groupMetadata(M.from)
        switch (arg) {
            case 'open':
                if (!groupMetadata.announce) return M.reply('The group is already open!')
                await client.groupSettingUpdate(M.from, 'not_announcement')
                return M.reply('Group opened')
            case 'close':
                if (groupMetadata.announce) return M.reply('The group is already closed!')
                await client.groupSettingUpdate(M.from, 'announcement')
                return M.reply('Group closed')
        }
    }
}
