module.exports = {
    name: 'clan-delete',
    aliases: ['delete-clan'],
    category: 'clans',
    exp: 10,
    cool: 10,
    react: '🗑️',
    usage: 'Use {prefix}clan-delete <tag> --confirm',
    description: 'Delete a clan as the leader or as an officer.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        const input = String(arg || '').trim();
        if (!input) return M.reply('Please provide a clan tag to delete.')

        const parts = input.split(/\s+/).filter(Boolean);
        const confirm = parts.includes('--confirm');
        const tagInput = parts.filter((part) => part !== '--confirm').join(' ').trim();

        if (!confirm) {
            if (!tagInput) return M.reply('Please provide a clan tag to delete.')

            const clan = clans.find((c) => String(c.tag).toLowerCase() === tagInput.toLowerCase());
            if (!clan) return M.reply('Clan not found.')
            if (clan.leader !== M.sender && !client.isOfficer(M) && !client.isOwner(M)) return M.reply('Only the clan leader or an officer can delete this clan.')

            await client.DB.set(`clan-delete-${M.sender}`, { tag: clan.tag, timestamp: Date.now() });
            return M.reply(`Are you sure you want to delete clan "${clan.tag}"? Reply with ${client.prefix}clan-delete ${clan.tag} --confirm to proceed.`)
        }

        const pending = await client.DB.get(`clan-delete-${M.sender}`);
        if (!pending || !pending.tag) return M.reply('No pending clan delete request. Use the command again with the clan tag.')

        const clan = clans.find((c) => String(c.tag).toLowerCase() === String(pending.tag).toLowerCase());
        if (!clan) return M.reply('Clan not found or already deleted.')
        if (clan.leader !== M.sender && !client.isOfficer(M) && !client.isOwner(M)) return M.reply('Only the clan leader or an officer can delete this clan.')

        const remaining = clans.filter((c) => String(c.tag).toLowerCase() !== String(clan.tag).toLowerCase());
        await client.DB.set('clans', remaining);
        await client.DB.delete(`clan-delete-${M.sender}`);

        M.reply(`Clan "${clan.tag}" has been deleted.`)
    }
};
