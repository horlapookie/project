module.exports = {
    name: 'invite',
    aliases: ['invt', 'gclink', 'grouplink'],
    exp: 10,
    cool: 4,
    react: "✅",
    category: 'moderation',
    usage: 'Use :invite ',
    description: 'Get the group link',
    async execute(client, arg, M) {
        const code = await client.groupInviteCode(M.from);
        if (!code) {
            return M.reply('Failed to get the group invite link.');
        }        
 return M.reply('https://chat.whatsapp.com/' + code);

    }
};
