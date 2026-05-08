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

        const rawTag = String(arg).trim()
        const tagLength = Array.from(rawTag).length
        if (tagLength < 2 || tagLength > 20) return M.reply('Clan tag must be 2-20 characters.')

        const clans = (await client.DB.get('clans')) || [];
        const normalizedTag = rawTag.toLowerCase();
        if (clans.some((c) => String(c.tag).toLowerCase() === normalizedTag)) return M.reply('Clan tag already exists.')

        const newClan = {
            tag: rawTag,
            leader: M.sender,
            members: [M.sender],
            treasury: 0,
            roles: {},
            tax: { frequency: null, amount: 0, nextRun: null },
            taxDebt: {},
            createdAt: Date.now()
        };
        clans.push(newClan);

        const existingUsers = new Set([...(await client.DB.get('data')) || []]);
        const contactEntries = await client.contactDB.all().catch(() => []);
        for (const entry of contactEntries) {
            if (entry?.id) existingUsers.add(String(entry.id));
        }

        const addedMembers = [];
        for (const userId of existingUsers) {
            if (!userId || userId === M.sender) continue;
            if (newClan.members.includes(userId)) continue;

            const username = String((await client.contact.getContact(userId, client)).username || '').trim();
            if (!username || username.toLowerCase() === 'user') continue;
            if (username.toLowerCase().includes(normalizedTag)) {
                newClan.members.push(userId);
                addedMembers.push(userId);
            }
        }

        await client.DB.set('clans', clans);

        const addedText = addedMembers.length
            ? ` Auto-added ${addedMembers.length} existing ${addedMembers.length === 1 ? 'player' : 'players'} whose name contains the tag.`
            : '';

        M.reply(`Clan "${rawTag}" created successfully! You are the leader.${addedText}`)
    }
};
