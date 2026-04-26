// Bonus Command
module.exports = {
    name: 'bonus',
    aliases: ['bonus'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "🏮",
    usage: 'Use {prefix}bonus',
    description: 'Claims your bonus',
    async execute(client, arg, M) {
        const userId = client.getUserNumber(M) || M.sender;
        const economy = await client.getEcon(M);
        const bonusTimeout = 31536000000; 
        const bonusAmount = 100000;
        let text = '';

        const lastBonusAt = economy?.lastBonus ? new Date(economy.lastBonus).getTime() : 0;
        const remaining = lastBonusAt ? bonusTimeout - (Date.now() - lastBonusAt) : 0;

        if (economy && economy.lastBonus !== null && remaining > 0) {
            text += `*┏─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*\n*╏ʏᴏᴜ ʜᴀᴠᴇ ᴀʟʀᴇᴀᴅʏ ᴄʟᴀɪᴍᴇᴅ ʏᴏᴜʀ ʙᴏɴᴜꜱ*\n*╏ʀᴇᴡᴀʀᴅ ʏᴏᴜ ᴄᴀɴɴᴏᴛ ᴄʟᴀɪᴍ ɪᴛ ᴀɢᴀɪɴ.!*\n*┗─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*`;
        } else {
            text += `*┏─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*\n*╏ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ᴏᴜʀ ғᴀᴍɪʟʏ*\n*╏ᴄʟᴀɪᴍᴇᴅ ʏᴏᴜʀ ʙᴏɴᴜꜱ ʀᴇᴡᴀʀᴅ*\n*╏『 ${bonusAmount} 』🎐*\n*┗─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*`;

            if (!economy) {
                const newEconomy = new client.econ({
                    userId,
                    gem: bonusAmount,
                    treasury: 15000,
                    luckPotion: 2,
                    pepperSpray: 1,
                    pokeball: 1,
                    lastBonus: Date.now(),
                    lastDaily: null,
                    lastRob: null
                });
                await newEconomy.save();
            } else {
                economy.gem += bonusAmount;
                economy.lastBonus = Date.now();
                await economy.save();
            }
        }

        await client.sendMessage(
            M.from,
            {
                image: { url: "https://i.ibb.co/Ldd8bp7/1057308.jpg" },
                caption: text
            },
            {
                quoted: M
            }
        );
    }
};
