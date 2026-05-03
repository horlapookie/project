module.exports = {
    name: 'clan-create',
    aliases: ['clancreate', 'createclan'],
    category: 'clans',
    exp: 10,
    cool: 5,
    react: '🏰',
    usage: 'Use {prefix}clan-create <tag>',
    description: 'Create a new clan (officers only).',
    async execute(client, arg, M) {
        if (!client.isOfficer(M) && !client.isOwner(M)) return M.reply('Only officers can create clans.')

        if (!arg) return M.reply('Please provide a clan tag.')

        const tag = arg.trim().toLowerCase();
        if (tag.length < 2 || tag.length > 20) return M.reply('Clan tag must be 2-20 characters.')

        const clans = (await client.DB.get('clans')) || [];
        if (clans.some(c => c.tag === tag)) return M.reply('Clan tag already exists.')

        const newClan = {
            tag,
            leader: M.sender,
            members: [M.sender]
        };
        clans.push(newClan);
        await client.DB.set('clans', clans);

        M.reply(`Clan "${tag}" created successfully! You are the leader.`)
    }
};