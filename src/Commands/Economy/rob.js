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
        const senderEconomy = await client.getEcon(M);
        if (!senderEconomy) {
            return M.reply(`You need an economy account first. Use ${client.prefix}bonus to get started.`)
        }
        const targetNumber = await client.resolveNumber(robTarget);
        const targetKey = targetNumber ? `${targetNumber}@s.whatsapp.net` : robTarget;
        const targetEconomy = await client.getEcon(targetKey);
        const lastRobTime = senderEconomy.lastRob || 0;
        const cooldown = 300000; // 5 minutes in milliseconds

        // Check if the user is on cooldown
        const cooldownRemaining = lastRobTime + cooldown - currentTime;
        if (cooldownRemaining > 0) {
            const remainingMinutes = Math.ceil(cooldownRemaining / (60 * 1000));
            return M.reply(`*You are on cooldown! You can attempt to rob again in ${remainingMinutes} minutes.*`);
        }

        // Minimum credits required to attempt a robbery
        const minimumCreditsRequired = 500;

        if ((senderEconomy.gem || 0) < minimumCreditsRequired) {
            return M.reply(`*You need to have ${minimumCreditsRequired} gems or more to attempt to rob someone*`);
        }
        if (!targetEconomy || (targetEconomy.gem || 0) < minimumCreditsRequired) {
            return M.reply('*The user does not have much money in their wallet*');
        }

        // Check if the user has pepper spray
        const hasPepperSpray = (targetEconomy.pepperSpray || 0) > 0;

        // Adjust success probability based on whether the user has pepper spray
        const successProbability = hasPepperSpray ? 0.3 : 0.1;
        const result = Math.random() < successProbability ? 'success' : 'caught';

        // Calculate the amount to be robbed
        let amountRobbed = Math.floor(Math.random() * ((targetEconomy.gem || 0) - minimumCreditsRequired) + minimumCreditsRequired);
        if ((targetEconomy.gem || 0) >= 10000) amountRobbed = Math.floor(Math.random() * 10000);

        let targetLost = Math.floor(Math.random() * ((senderEconomy.gem || 0) - minimumCreditsRequired) + minimumCreditsRequired);
        if ((senderEconomy.gem || 0) >= 10000) targetLost = Math.floor(Math.random() * 10000);

        // Update wallet balances based on the result
        senderEconomy.gem += result === 'success' ? amountRobbed : -targetLost;
        targetEconomy.gem += result === 'success' ? -amountRobbed : targetLost;
        senderEconomy.lastRob = currentTime;
        await senderEconomy.save();
        await targetEconomy.save();

        // Construct response text based on the result
        let text;
        const targetMentionDigits = (targetNumber || String(robTarget || '').split('@')[0]).replace(/\D/g, '');
        if (result === 'caught') {
            if (hasPepperSpray) {
                text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏You got caught!*\n*╏The target used pepper spray.\n*╏You paid ${targetLost} gems to* *@${targetMentionDigits}*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
            } else {
                text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏You got caught and paid*\n*╏${targetLost} gems to* *@${targetMentionDigits}*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
            }
        } else {
            text = `*┏─══─━══─| ʀᴏʙʙᴇʀʏ  |─══━─══─∘⦿ꕹ᛫*\n*╏@${M.sender.split('@')[0]}*\n*╏successfully robbed*\n*╏@${targetMentionDigits}*\n*╏and got away with*\n*╏${amountRobbed} gems!*\n*┗─══─━══─| ʀᴏʙʙᴇʀʏ |─══━─══─∘⦿ꕹ᛫*`;
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
