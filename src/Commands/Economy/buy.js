// Buy Command
const items = {
    luckpotion: 15000,
    pepperspray: 10000,
    pokeball: 12000,
};

module.exports = {
    name: 'buy',
    aliases: ['acquire'],
    category: 'economy',
    exp: 10,
    cool: 4,
    react: '✅',
    usage: 'Use :buy <item_name> <item_quantity>',
    description: 'Buy an item from the shop',
    async execute(client, arg, M) {
        if (!arg) return M.reply('Please specify an item name and quantity.');
        const [itemName, quantityStr] = arg.split(' ');
        const quantity = parseInt(quantityStr) || 1;

        if (!items[itemName]) return M.reply('Please provide a valid item name.');

        const totalPrice = items[itemName] * quantity;
        const userId = M.sender;

        const user = await client.econ.findOne({ userId });

        if (!user) return M.reply('You need to set up your economy first.');

        if (user.gem < totalPrice) {
            return M.reply(`You don't have enough credits to buy ${quantity} ${itemName}(s).`);
        }

        user.gem -= totalPrice;
        if (!user[itemName]) user[itemName] = 0;
        user[itemName] += quantity;

        await user.save();

        M.reply(`Thank you for your purchase! You now have ${quantity} ${itemName}(s).`);
    },
};
