// Treasury Command
module.exports = {
    name: 'treasury',
    aliases: ['at'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use {prefix}treasury',
    description: 'Shows the treasury value',
    async execute(client, arg, M) {
        const economy = await client.getEcon(M);
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`)

        let treasury = economy.treasury || 0;

        // Ensure treasury value is an integer
        treasury = Math.round(treasury);

        const contact = await client.contact.getContact(M.sender, client);
        const username = contact.username || 'Unknown';
        const tag = `#${(client.getUserNumber(M) || '').slice(-5) || '00000'}`;
        const thumbnail = await client.utils.getBuffer('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQRBfcfZ3LyY8EzPbH5LbHYOxOW0p7Ki5aIenqTSFm5YQ&s.jpg');

        await client.sendMessage(M.from, {
            text: `🏦 Treasury for ${username} (${tag})\n\nTreasury: *${treasury}*`,
            contextInfo: {
                externalAdReply: {
                    title: `${username}: ${treasury}`,
                    mediaType: 2,
                    thumbnail: thumbnail,
                    sourceUrl: ''
                }
            }
        });
    }
};
