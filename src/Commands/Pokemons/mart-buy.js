const { addInventoryQuantity, getWeeklyPurchaseKey } = require('../../Helpers/pokeballs');
const { getMartItemById } = require('../../Helpers/martItems');

module.exports = {
    name: 'mart-buy',
    aliases: ['martbuy', 'mbuy'],
    exp: 0,
    cool: 3,
    react: '🛍️',
    category: 'pokemon',
    usage: 'Use :mart-buy #2 --quantity=1',
    description: 'Buy pokeballs from the Pokemon Mart',
    async execute(client, arg, M) {
        const idMatch = arg.match(/#?(\d+)/);
        const quantityMatch = arg.match(/--quantity=(\d+)/i);
        const item = getMartItemById(idMatch?.[1]);
        const quantity = Math.max(1, Number(quantityMatch?.[1] || 1));

        if (!item) {
            return M.reply('Please provide a valid item ID from the mart.')
        }

        const economy = await client.econ.findOne({ userId: M.sender });
        if (!economy) {
            return M.reply('You need an economy account first. Use :bonus to get started.')
        }

        const totalPrice = item.price * quantity;
        if ((economy.gem || 0) < totalPrice) {
            return M.reply(`You do not have enough gold to buy *${item.name} (x${quantity})*.`)
        }

        if (item.type === 'pokeball') {
            const weekKey = getWeeklyPurchaseKey(M.sender, item.id);
            const boughtThisWeek = Number((await client.DB.get(weekKey)) || 0);
            if (boughtThisWeek + quantity > 25) {
                return M.reply(`You can only buy 25 ${item.name}s per week. You have already bought ${boughtThisWeek} this week.`)
            }
            await addInventoryQuantity(client, M.sender, item.key, quantity);
            await client.DB.set(weekKey, boughtThisWeek + quantity);
        } else {
            economy[item.key] = Number(economy[item.key] || 0) + quantity;
        }

        economy.gem -= totalPrice;
        await economy.save();

        return M.reply(`You have bought *${item.name} (x${quantity})* for *${totalPrice}* gold. It has gone to your trainer's bag.`)
    }
};
