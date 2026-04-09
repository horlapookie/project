// Wallet Command
module.exports = {
    name: 'gem',
    aliases: ['ag', 'gems'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :wallet',
    description: 'Shows the wallet value',
    async execute(client, arg, M) {
        const userId = M.sender;
        const economy = await client.econ.findOne({ userId });

        let wallet = economy ? economy.gem : 0;

        // Ensure wallet value is an integer
        wallet = Math.round(wallet);

        if (economy && economy.gem !== wallet) {
            economy.gem = wallet;
            await economy.save();
        }

        const contact = await client.contact.getContact(M.sender, client);
        const username = contact.username || 'Unknown';
        const tag = `#${M.sender.substring(3, 7)}`;

        const thumbnail = await client.utils.getBuffer('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQq_uWYBUlowQjCzGGpph4KKF_mLSI2pMwBJA&usqp=CAU.jpg');
        
        await client.sendMessage(M.from, {
            text: "",
            contextInfo: {
                externalAdReply: {
                    title: `${username}: ${wallet}`,
                    mediaType: 2,
                    thumbnail: thumbnail,
                    sourceUrl: ''
                }
            }
        });
    }
};
