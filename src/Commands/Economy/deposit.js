// Deposit Command
module.exports = {
    name: 'deposit',
    aliases: ["dt", "depo"],
    category: 'economy',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use {prefix}deposit <amount>',
    description: 'Deposits credits from your wallet to your treasury',
    async execute(client, arg, M) {
        if (!arg || isNaN(arg)) return M.reply('Please provide a valid amount.');

        const amount = parseInt(arg);
        if (amount <= 0) return M.reply('Please provide a positive amount.');

        const economy = await client.getEcon(M);
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`);

        const wallet = economy.gem || 0;
        if (wallet < amount) return M.reply('You don\'t have enough credits in your wallet.');

        economy.treasury += amount;
        economy.gem -= amount;

        await economy.save();

        M.reply(`You have successfully deposited ${amount} credits into your treasury.`);
    }
};
