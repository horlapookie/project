module.exports = {
    name: 'join',
    aliases: ['j'],
    category: 'dev',
    exp: 0,
    cool: 4,
    react: "✅",
    description: 'Join a group using the link. eg group join (gclink)',
    async execute(client, arg, M) {
        try {
            const quotedText = M.quoted?.text || M.quoted?.caption || '';
            const link = String(arg || quotedText || '').trim();

            const match = link.match(/https:\/\/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
            const joinCode = match ? match[1] : null;

            if (!joinCode) {
                return M.reply('🚫 Oops! The provided link is not a valid group link.');
            }

            client
            .groupAcceptInvite(joinCode) // Fix: Use 'joinCode' instead of 'JoinCode'
            .then((res) => M.reply('🟩 *Joined*'))
            .catch((err) => {
                console.error(err);
                M.reply('🟨 *Unable to join. The link may be invalid, expired, or the bot is already in the group.*');
            });
        } catch (err) {
            console.error(err);
            await client.sendMessage(M.from, {
                image: { url: `${client.utils.errorChan()}` },
                caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`
            });
        }
    }
};
