// Withdraw Command
module.exports = {
    name: 'withdraw',
    aliases: ["wt", "with"],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :withdraw <amount>',
    description: 'Withdraws credits from your treasury to your wallet',
    async execute(client, arg, M) {
        if (!arg || isNaN(arg)) return M.reply('Please provide a valid amount.');
        
        const amount = parseInt(arg);
        if (amount <= 0) return M.reply('Please provide a positive amount.');

        const economy = await client.getEcon(M);
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`);

        const treasury = economy.treasury || 0;
        if (treasury < amount) return M.reply('You don\'t have enough credits in your treasury.');

        economy.gem += amount;
        economy.treasury -= amount;

        await economy.save();

        M.reply(`You have successfully withdrawn ${amount} credits from your treasury to your wallet.`);
    }
};
