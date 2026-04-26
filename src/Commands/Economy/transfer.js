// Transfer Command
module.exports = {
    name: 'transfer',
    aliases: ['give', 'pay'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "🖇️",
    usage: 'Use {prefix}transfer <amount> @taguser',
    description: 'Transfer gems to your friend',
    async execute(client, arg, M) {
        try {
            const recipient = M.mentions[0] || (M.quoted && M.quoted.participant);

            if (!recipient) return M.reply('You must mention someone to transfer credits to.');

            const amount = parseInt(arg.split(' ')[0]);
            if (isNaN(amount) || amount <= 0) return M.reply('Please provide a valid positive amount.');

            if (recipient === M.sender) return M.reply("You can't transfer gems to yourself.");

            // Use the bot's stable economy resolver (handles @lid -> phone mapping + auto-migration).
            const senderEconomy = await client.getEcon(M, { createIfMissing: true });
            if (!senderEconomy) return M.reply(`Use ${client.prefix}bonus to get started.`);

            const senderWallet = senderEconomy.gem || 0;
            if (senderWallet < amount) return M.reply("You don't have enough gems in your wallet.");

            const recipientEconomy = await client.getEcon(recipient, { createIfMissing: true });
            if (!recipientEconomy) return M.reply('Could not open the recipient wallet right now.');

            senderEconomy.gem -= amount;
            await senderEconomy.save();

            recipientEconomy.gem += amount;
            await recipientEconomy.save();

            const senderName = M.sender.split('@')[0];
            const recipientName = recipient.split('@')[0];

            const message = `*@${senderName}* transferred *${amount}* gems to *@${recipientName}*`;

            await client.sendMessage(M.from, { text: message, mentions: [M.sender, recipient] });
          
        } catch (err) {
            console.error(err);
            M.reply('An error occurred while processing the transfer.');
        }
    }
};
