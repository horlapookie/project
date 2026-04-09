const ms = require('parse-ms');

module.exports = {
    name: 'daily',
    aliases: ['rewards'],
    category: 'economy',
    exp: 5,
    react: "⏳",
    description: 'Claims your daily rewards',
    async execute(client, arg, M) {
        const dailyTimeout = 86400000;
        const dailyAmount = 1000;
        const userId = M.sender;
        let message = '';

        const economy = await client.econ.findOne({ userId });
        if (!economy) {
            message = "*You haven't set up your economy yet.*";
        } else {
            const daily = economy.lastDaily;
            if (daily !== null && dailyTimeout - (Date.now() - daily) > 0) {
                const dailyTime = ms(dailyTimeout - (Date.now() - daily));
                message = `*┏─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*\n*╏🏮 ᴀʟʀᴇᴀᴅʏ ᴄʟᴀɪᴍᴇᴅ ʏᴏᴜʀ ʀᴇᴡᴀʀᴅ*\n*╏🕒 ʏᴏᴜ ʜᴀᴠᴇ ᴛᴏ ᴡᴀɪᴛ*\n*╏⏳ ᴛɪᴍᴇ ʟᴇғᴛ =『 ${dailyTime.hours} : ${dailyTime.minutes} 』*\n*┗─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*`;
            } else {
                message = `*┏─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*\n*╏🏮 ʏᴏᴜ ʜᴀᴠᴇ ᴄʟᴀɪᴍᴇᴅ ʏᴏᴜʀ ᴅᴀɪʟʏ*\n*╏ʀᴇᴡᴀʀᴅ!!*\n*╏🎊『 ${dailyAmount} 』*\n*┗─═─━══─| ʀᴇᴡᴀʀᴅ |─══━─═─∘⦿ꕹ᛫*`;
                economy.gem += dailyAmount;
                economy.lastDaily = Date.now();
                await economy.save();
            }
        }
       M.reply(message);
    },
};
