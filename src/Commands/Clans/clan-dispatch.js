module.exports = {
    name: 'clan-dispatch',
    aliases: ['dispatch-clan'],
    category: 'clans',
    exp: 10,
    cool: 10,
    react: '📣',
    usage: 'Use {prefix}clan-dispatch <message>',
    description: 'Send a message to all members of your clan (leader only).',
    async execute(client, arg, M) {
        const message = String(arg || '').trim();
        if (!message) return M.reply('Please provide a message to dispatch to your clan.')

        const clans = (await client.DB.get('clans')) || [];
        const clan = clans.find((c) => c.leader === M.sender);
        if (!clan) return M.reply('You are not a clan leader.')

        const recipients = Array.from(new Set(clan.members.filter(Boolean)));
        if (!recipients.length) return M.reply('Your clan has no members to dispatch to.')

        const dispatchText = `📣 Clan Dispatch from ${M.pushName || 'your leader'}:

${message}`;
        let sentCount = 0;
        for (const member of recipients) {
            try {
                await client.sendMessage(member, { text: dispatchText });
                sentCount += 1;
            } catch (_) {
                // ignore failed deliveries
            }
        }

        M.reply(`Dispatch sent to ${sentCount}/${recipients.length} clan member(s).`)
    }
};
