// Transfer Command
module.exports = {
    name: 'transfer',
    aliases: ['give', 'pay'],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "🖇️",
    usage: 'Use {prefix}transfer <amount> @taguser or {prefix}transfer --clan <amount>',
    description: 'Transfer gems to a friend or to your clan treasury.',
    async execute(client, arg, M) {
        try {
            const isClanTransfer = /--clan(?:=|\b)/i.test(arg);
            const cleaned = arg.replace(/--clan(?:=|\b)/gi, '').trim();
            const amountMatch = cleaned.match(/\d+/)
            const amount = amountMatch ? Number(amountMatch[0]) : NaN
            if (isNaN(amount) || amount <= 0) return M.reply('Please provide a valid positive amount.');

            const senderEconomy = await client.getEcon(M, { createIfMissing: true });
            if (!senderEconomy) return M.reply(`Use ${client.prefix}bonus to get started.`);
            const senderWallet = Number(senderEconomy.gem || 0);
            if (senderWallet < amount) return M.reply("You don't have enough gems in your wallet.");

            if (isClanTransfer) {
                const clans = (await client.DB.get('clans')) || [];
                const clan = clans.find((c) => Array.isArray(c.members) && c.members.includes(M.sender));
                if (!clan) return M.reply('You must be a member of a clan to send gems to clan treasury.');

                clan.treasury = Number(clan.treasury || 0) + amount;
                senderEconomy.gem = senderWallet - amount;
                await senderEconomy.save();
                await client.DB.set('clans', clans);

                return M.reply(`Transferred *${amount}* gems to clan *${clan.tag}* treasury. New clan treasury: *${clan.treasury}* gems.`);
            }

            const recipient = M.mentions[0] || (M.quoted && M.quoted.participant);
            if (!recipient) return M.reply('You must mention someone to transfer credits to.');
            if (recipient === M.sender) return M.reply("You can't transfer gems to yourself.");

            const recipientEconomy = await client.getEcon(recipient, { createIfMissing: true });
            if (!recipientEconomy) return M.reply('Could not open the recipient wallet right now.');

            senderEconomy.gem = senderWallet - amount;
            await senderEconomy.save();

            recipientEconomy.gem = Number(recipientEconomy.gem || 0) + amount;
            await recipientEconomy.save();

            const senderName = M.sender.split('@')[0];
            const recipientName = recipient.split('@')[0];
            await client.sendMessage(M.from, { text: `*@${senderName}* transferred *${amount}* gems to *@${recipientName}*`, mentions: [M.sender, recipient] });
        } catch (err) {
            console.error(err);
            M.reply('An error occurred while processing the transfer.');
        }
    }
};
