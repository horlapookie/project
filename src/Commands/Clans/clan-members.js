module.exports = {
    name: 'clan-members',
    aliases: ['members-clan', 'clanmembers', 'members'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '👥',
    usage: 'Use {prefix}clan-members <tag> or {prefix}clan-members or {prefix}clan-members @user --setroles=role',
    description: 'List clan members or assign a role to a clan member.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        if (!clans.length) return M.reply('No clans registered yet.');

        const rawArg = String(arg || '').trim();
        const roleMatch = rawArg.match(/--setroles=([\s\S]+)/i);
        const roleValue = roleMatch ? roleMatch[1].trim() : null;
        const argWithoutRole = roleMatch ? rawArg.replace(roleMatch[0], '').trim() : rawArg;
        const tagInput = argWithoutRole;

        if (roleValue) {
            const clan = clans.find((c) => c.leader === M.sender);
            if (!clan) return M.reply('Only the clan leader can assign clan roles.');

            const target = M.mentions?.[0] || (M.quoted && M.quoted.participant);
            if (!target) return M.reply('Reply to a clan member or mention them to set a role.');

            if (!Array.isArray(clan.members) || !clan.members.includes(target)) {
                return M.reply('That user is not a member of your clan.');
            }

            clan.roles = clan.roles || {};
            clan.roles[target] = roleValue;
            await client.DB.set('clans', clans);

            return client.sendMessage(M.from, { text: `Set clan role for @${target.split('@')[0]} to *${roleValue}*.`, mentions: [target] }, { quoted: M });
        }

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
            .map((member, index) => {
                const role = clan.roles && clan.roles[member] ? ` — ${clan.roles[member]}` : member === clan.leader ? ' — President' : '';
                return `\n${index + 1}. @${String(member).split('@')[0]}${role}`;
            })
            .join('');

        const text = `👥 Clan members for *${clan.tag}*:\n\n${mentionText}`;

        await client.sendMessage(M.from, { text, mentions: uniqueMembers }, { quoted: M });
    }
};
