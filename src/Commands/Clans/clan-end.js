module.exports = {
    name: 'clan-end',
    aliases: ['endclan', 'close-clan'],
    category: 'clans',
    exp: 10,
    cool: 10,
    react: '🔚',
    usage: 'Use {prefix}clan-end <tag> --confirm',
    description: 'End/close a clan (leader only).',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        const input = String(arg || '').trim();
        if (!input) return M.reply('Please provide a clan tag to end.')

        const parts = input.split(/\s+/).filter(Boolean);
        const confirm = parts.includes('--confirm');
        const tagInput = parts.filter((part) => part !== '--confirm').join(' ').trim();

        if (!confirm) {
            if (!tagInput) return M.reply('Please provide a clan tag to end.')

            const clan = clans.find((c) => String(c.tag).toLowerCase() === tagInput.toLowerCase());
            if (!clan) return M.reply('Clan not found.')
            if (clan.leader !== M.sender) return M.reply('Only the clan leader can end this clan.')

            await client.DB.set(`clan-end-${M.sender}`, { tag: clan.tag, timestamp: Date.now() });
            return M.reply(`Are you sure you want to end clan "${clan.tag}"? Reply with ${client.prefix}clan-end ${clan.tag} --confirm to proceed.`)
        }

        const pending = await client.DB.get(`clan-end-${M.sender}`);
        if (!pending || !pending.tag) return M.reply('No pending clan end request. Use the command again with the clan tag.')

        const clan = clans.find((c) => String(c.tag).toLowerCase() === String(pending.tag).toLowerCase());
        if (!clan) return M.reply('Clan not found or already ended.')
        if (clan.leader !== M.sender) return M.reply('Only the clan leader can end this clan.')

        clan.ended = true;
        clan.endedAt = Date.now();
        clan.endedBy = M.sender;

        await client.DB.set('clans', clans);
        await client.DB.delete(`clan-end-${M.sender}`);

        M.reply(`Clan "${clan.tag}" has been ended. Members can no longer perform clan activities.`)
    }
};
