module.exports = {
    name: 'transfer-clan',
    aliases: ['tclan'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '👑',
    usage: 'Use {prefix}transfer-clan @user or {prefix}tclan --confirm',
    description: 'Transfer clan leadership (leaders only).',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        const userClan = clans.find(c => c.leader === M.sender);
        if (!userClan) return M.reply('You are not a clan leader.')

        if (arg === '--confirm') {
            const pending = await client.DB.get(`clan-transfer-${M.sender}`);
            if (!pending) return M.reply('No pending transfer request.')

            const newLeader = pending.user;
            if (!userClan.members.includes(newLeader)) return M.reply('User is not in your clan.')

            userClan.leader = newLeader;
            await client.DB.set('clans', clans);
            await client.DB.delete(`clan-transfer-${M.sender}`);

            M.reply(`Clan leadership transferred to @${newLeader.split('@')[0]}.`)
            return;
        }

        const target = M.mentions?.[0];
        if (!target) return M.reply('Mention the user to transfer leadership to.')

        await client.DB.set(`clan-transfer-${M.sender}`, { user: target, timestamp: Date.now() });

        M.reply(`Are you sure? Reply with {prefix}tclan --confirm to transfer leadership to @${target.split('@')[0]}.`)
    }
};