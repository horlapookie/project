const { Sticker } = require('wa-sticker-formatter');

module.exports = {
    name: 'gamble',
    aliases: ['gb'],
    category: 'economy',
    exp: 5,
    cool: 15,
    react: "✅",
    usage: 'Use :gamble <amount> <direction>',
    description: 'Gambles your credits to increase or decrease',
    async execute(client, arg, M) {
        const directions = ['right', 'left'];
        const [amountStr, direction] = arg.split(' ');

        // Validate input
        if (!amountStr || !directions.includes(direction)) return M.reply('Please provide a valid amount and direction.');
        if (!(/^\d+$/).test(amountStr)) return M.reply('Please provide a valid amount.');
        
        const amount = parseInt(amountStr);
        const minBet = 500;
        const maxBet = 20000;

        // Check if the amount is within the allowed range
        if (amount < minBet || amount > maxBet) return M.reply(`You can only gamble between ${minBet} and ${maxBet} credits.`);
        
        const userId = M.sender;
        const economy = await client.econ.findOne({ userId });

        const wallet = economy.gem || 0;
        if (wallet < amount) return M.reply('You don\'t have enough credits to gamble that much.');

        const result = Math.random() < 0.5 ? 'left' : 'right';
        const won = result === direction;

        // Calculate the new wallet balance based on the result
        const newBalance = won ? wallet + amount : wallet - amount;
        economy.gem = newBalance;
        await economy.save();

        const sticker = new Sticker(
            result == 'right'
                ? 'https://i.ibb.co/SrtvnFH/ezgif-com-rotate.gif'
                : 'https://raw.githubusercontent.com/Dkhitman3/Hitman47/master/assets/gifs/left.gif',
            {
                pack: ' ', // The pack name
                author: ' ', // The author name
                quality: 90,
                type: 'full', // The quality of the output file
                background: '#0000ffff' // The sticker background color (only for full stickers)
            }
        )
        await client.sendMessage(
            M.from,
            {
                sticker: await sticker.build()
            },
            {
                quoted: M
            }
        )
        // Send the result message
        M.reply(won ? `🎉 Congratulations! You won ${amount} credits.` : `🥀 Better luck next time! You lost ${amount} credits.`);
    }
};
