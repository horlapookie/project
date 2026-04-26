module.exports = {
    name: 'group',
    aliases: ['gc', 'opengroup', 'closegroup'],
    exp: 5,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :group open  OR  :group close  OR  :opengroup  /  :closegroup',
    description: 'Opens or closes the group (only admins can send messages when closed)',
    async execute(client, arg, M) {
        if (!M.isGroup) return M.reply('This command can only be used in groups.')
        if (!client.isOwner(M) && !client.isMod(M) && !client.isOfficer(M)) {
            return M.reply('Only the bot owner, mods, or officers can open/close the group.')
        }

        // Support calling as -opengroup / -closegroup with no arg
        const command = M.body.split(' ')[0].toLowerCase().slice(client.prefix.length).trim();
        let action = (arg || '').trim().toLowerCase();
        if (!action) {
            if (command === 'opengroup') action = 'open';
            else if (command === 'closegroup') action = 'close';
        }

        const valid = ['open', 'close'];
        if (!valid.includes(action)) {
            return M.reply(`Please specify *open* or *close*.\n\nUsage:\n- *${client.prefix}group open* — allow all members to send\n- *${client.prefix}group close* — only admins can send\n- *${client.prefix}opengroup*\n- *${client.prefix}closegroup*`);
        }

        const groupMetadata = await client.groupMetadata(M.from).catch(() => null);
        if (!groupMetadata) return M.reply('Could not fetch group info. Make sure I am a group admin.');

        switch (action) {
            case 'open':
                if (!groupMetadata.announce) return M.reply('The group is already open!')
                await client.groupSettingUpdate(M.from, 'not_announcement')
                return M.reply('✅ Group has been *opened*. All members can now send messages.')
            case 'close':
                if (groupMetadata.announce) return M.reply('The group is already closed!')
                await client.groupSettingUpdate(M.from, 'announcement')
                return M.reply('🔒 Group has been *closed*. Only admins can send messages.')
        }
    }
}
