module.exports = {
    name: 'clan-members',
    aliases: ['members-clan', 'clanmembers', 'members'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '👥',
    usage: 'Use {prefix}clan-members <tag> or {prefix}clan-members',
    description: 'List clan members by tag or for the clan you belong to.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        if (!clans.length) return M.reply('No clans registered yet.');

        const tagInput = String(arg || '').trim();
        let clan;

        if (tagInput) {
            clan = clans.find((c) => String(c.tag).toLowerCase() === tagInput.toLowerCase());
            if (!clan) return M.reply('Clan not found. Please provide a valid clan tag.');
        } else {
            clan = clans.find((c) => Array.isArray(c.members) && c.members.includes(M.sender));
            if (!clan) return M.reply('You are not a member of any clan. Provide a clan tag to view members.');
        }

        const members = Array.isArray(clan.members) ? clan.members : [];
        if (!members.length) return M.reply(`Clan "${clan.tag}" has no members.`);

        const uniqueMembers = Array.from(new Set(members.map(String)));
        const mentionText = uniqueMembers
            .map((member, index) => `
${index + 1}. @${String(member).split('@')[0]}`)
            .join('');

        const text = `👥 Clan members for *${clan.tag}*:\n\n${mentionText}`;

        await client.sendMessage(M.from, { text, mentions: uniqueMembers }, { quoted: M });
    }
};
