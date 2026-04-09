// Rob Command
module.exports = {
    name: 'rob',
    aliases: ['rob'],
    category: 'economy',
    exp: 5,
    cool: 5, // Cooldown period in seconds (5 minutes)
    react: "💥",
    usage: 'Use rob @taguser',
    description: 'Attempt to rob the mentioned user',
    async execute(client, arg, M) {
        const robTarget = M.mentions[0] || (M.quoted && M.quoted.participant);

        if (!robTarget) return M.reply('*You must mention someone to attempt the robbery*');

        const currentTime = Date.now();
        const lastRobTime = await client.econ.findOne({ userId: M.sender }).lastRob || 0;
        const cooldown = 300000; // 5 minutes in milliseconds

        // Check if the user is on cooldown
        const cooldownRemaining = lastRobTime + cooldown - currentTime;
        if (cooldownRemaining > 0) {
            const remainingMinutes = Math.ceil(cooldownRemaining / (60 * 1000));
            return M.reply(`*You are on cooldown! You can attempt to rob again in ${remainingMinutes} minutes.*`);
        }

        const senderEconomy = await client.econ.findOne({ userId: M.sender });
        const targetEconomy = await client.econ.findOne({ userId: robTarget });

        // Minimum credits required to attempt a robbery
        const minimumCreditsRequired = 500;

        if (senderEconomy.gem < minimumCreditsRequired) return M.reply(`*You need to have ${minimumCreditsRequired} gold or more to attempt to rob someone*`);
        if (!targetEconomy || targetEconomy.gem < minimumCreditsRequired) return M.reply('*The user doesn\'t have much money in their wallet*');

        // Check if the user has pepper spray
        const hasPepperSpray = senderEconomy.pepperSpray > 0;

        // Adjust success probability based on whether the user has pepper spray
        const successProbability = hasPepperSpray ? 0.3 : 0.1;
        const result = Math.random() < successProbability ? 'success' : 'caught';

        // Calculate the amount to be robbed
        let amountRobbed = Math.floor(Math.random() * (senderEconomy.gem - minimumCreditsRequired) + minimumCreditsRequired);
        if (senderEconomy.gem >= 10000) amountRobbed = Math.floor(Math.random() * 10000);

        let targetLost = Math.floor(Math.random() * (targetEconomy.gem - minimumCreditsRequired) + minimumCreditsRequired);
        if (targetEconomy.gem >= 10000) targetLost = Math.floor(Math.random() * 10000);

        // Update wallet balances based on the result
        senderEconomy.gem += result === 'success' ? amountRobbed : -targetLost;
        targetEconomy.gem += result === 'success' ? -amountRobbed : targetLost;
        senderEconomy.lastRob = currentTime;
        await senderEconomy.save();
        await targetEconomy.save();

        // Construct response text based on the result
        let text;
        if (result === 'caught') {
            if (hasPepperSpray) {
                text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏ʏᴏᴜ ɢᴏᴛ ᴄᴀᴜɢʜᴛ, ʙᴜᴛ ᴛʜᴇ ᴜꜱᴇʀ*\n*╏ʏᴏᴜ ᴀᴛᴛᴇᴍᴘᴛᴇᴅ ᴛᴏ ʀᴏʙ ʜᴀᴅ ᴘᴇᴘᴘᴇʀ*\n*╏ꜱᴘʀᴀʏ ᴀɴᴅ ꜱᴘʀᴀʏᴇᴅ ɪᴛ ᴏɴ*\n*╏ʏᴏᴜʀ ᴇʏᴇꜱ! ʏᴏᴜ ᴘᴀɪᴅ*\n*╏${targetLost} ɢᴏʟᴅ* *ᴛᴏ* *@${robTarget.split('@')[0]}*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
            } else {
                text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏ʏᴏᴜ ɢᴏᴛ ᴄᴀᴜɢʜᴛ ᴀɴᴅ ᴘᴀɪᴅ*\n*╏${targetLost} ɢᴏʟᴅ* *ᴛᴏ* *@${robTarget.split('@')[0]}*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
            }
        } else {
            text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏@${M.sender.split('@')[0]}*\n*╏ꜱᴜᴄᴄᴇꜱꜱғᴜʟʟʏ ʀᴏʙʙᴇᴅ*\n*╏@${robTarget.split('@')[0]}*\n*╏ᴀɴᴅ ɢᴏᴛ ᴀᴡᴀʏ ᴡɪᴛʜ*\n*╏${amountRobbed} ᴄʀᴇᴅɪᴛꜱ!*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
        }
        
        await client.sendMessage(
          M.from,
          { 
            image: { url: "https://i.ibb.co/zmpvn2n/Picsart-24-05-21-11-48-41-829.jpg" },
            caption: text
          },
          {
            quoted: M
          }
        );
    }
}; 
