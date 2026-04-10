module.exports = {
    name: 'wallet',
    aliases: ['wallet', 'gem', 'gems', 'ag', 'bal', 'balance'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :wallet',
    description: 'Shows your wallet gems balance',
    async execute(client, arg, M) {
        const economy = await client.getEcon(M);
        const gems = Math.round(Number(economy?.gem || 0));
        const treasury = Math.round(Number(economy?.treasury || 0));
        if (economy && (economy.gem !== gems || economy.treasury !== treasury)) {
            economy.gem = gems;
            economy.treasury = treasury;
            await economy.save().catch(() => null);
        }

        const contact = await client.contact.getContact(M.sender, client).catch(() => ({ username: 'Unknown' }));
        const username = contact.username || 'Unknown';
        const tag = `#${(client.getUserNumber(M) || '').slice(-5) || '00000'}`;

        const thumbnail = await client.utils.getBuffer('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQq_uWYBUlowQjCzGGpph4KKF_mLSI2pMwBJA&usqp=CAU.jpg');
        
        await client.sendMessage(M.from, {
            text: `💎 Wallet for ${username} (${tag})\n\nGems: *${gems}*\n\nUse *${client.prefix}treasury* to check your treasury.`,
            contextInfo: {
                externalAdReply: {
                    title: `${username}: ${gems}`,
                    mediaType: 2,
                    thumbnail: thumbnail,
                    sourceUrl: ''
                }
            }
        });
    }
};
