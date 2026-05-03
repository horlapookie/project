module.exports = {
    name: 'clan-list',
    aliases: ['listclans', 'clans'],
    category: 'clans',
    exp: 5,
    cool: 5,
    react: '📜',
    usage: 'Use {prefix}clan-list',
    description: 'List all registered clans.',
    async execute(client, arg, M) {
        const clans = (await client.DB.get('clans')) || [];
        if (!clans.length) return M.reply('No clans registered yet.')

        let text = '🏰 *Registered Clans:*\n\n';
        clans.forEach((clan, index) => {
            text += `${index + 1}. **${clan.tag}** - Leader: @${clan.leader.split('@')[0]} - Members: ${clan.members.length}\n`;
        });

        client.sendMessage(M.from, { text, mentions: clans.flatMap(c => c.members) }, { quoted: M });
    }
};