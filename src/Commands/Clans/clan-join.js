module.exports = {
    name: 'clan-join',
    aliases: ['joinclan'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '🤝',
    usage: 'Use {prefix}clan-join <index> or {prefix}clan-join --confirm',
    description: 'Join a clan by index, then confirm with tag in username.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        if (!clans.length) return M.reply('No clans available.')

        if (arg === '--confirm') {
            const pending = await client.DB.get(`clan-join-${M.sender}`);
            if (!pending) return M.reply('No pending clan join request.')

            const clan = clans.find(c => c.tag === pending.tag);
            if (!clan) return M.reply('Clan not found.')

            const username = M.pushName || '';
            if (!username.toLowerCase().includes(pending.tag)) return M.reply(`Your username must contain "${pending.tag}" to join.`)

            if (clan.members.includes(M.sender)) return M.reply('You are already in this clan.')

            clan.members.push(M.sender);
            await client.DB.set('clans', clans);
            await client.DB.delete(`clan-join-${M.sender}`);

            M.reply(`Welcome to clan "${pending.tag}"! You are member #${clan.members.length}.`)
            return;
        }

        const index = parseInt(arg) - 1;
        if (isNaN(index) || index < 0 || index >= clans.length) return M.reply('Invalid clan index.')

        const clan = clans[index];
        await client.DB.set(`clan-join-${M.sender}`, { tag: clan.tag, timestamp: Date.now() });

        M.reply(`To join clan "${clan.tag}", add "${clan.tag}" to your WhatsApp username and reply with {prefix}clan-join --confirm`)
    }
};