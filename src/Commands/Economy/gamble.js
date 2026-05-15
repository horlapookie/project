const { Sticker } = require('wa-sticker-formatter');
const { hasPremiumCasino } = require('../../Helpers/premium')

module.exports = {
    name: 'gamble',
    aliases: ['gb'],
    category: 'economy',
    exp: 5,
    cool: 15,
    react: '✅',
    usage: 'Use {prefix}gamble <amount> <direction>  |  direction: left or right',
    description: 'Gamble your gems — Premium users have 85% win chance!',
    async execute(client, arg, M) {
        const directions = ['right', 'left'];
        const parts = String(arg || '').trim().split(/\s+/)
        const [amountStr, direction] = parts

        if (!amountStr || !directions.includes(direction))
            return M.reply(`Please provide a valid amount and direction.\nExample: *${client.prefix}gamble 1000 left*`)
        if (!(/^\d+$/).test(amountStr))
            return M.reply('Please provide a valid amount.');

        const amount = parseInt(amountStr);

        // Check premium status first for limit scaling
        const userKey = String(M.sender.split('@')[0])
        const premium = await hasPremiumCasino(client, userKey).catch(() => false)

        const minBet = 500;
        const maxBet = premium ? 100000 : 20000;

        if (amount < minBet || amount > maxBet)
            return M.reply(`You can gamble between *${minBet.toLocaleString()}* and *${maxBet.toLocaleString()}* gems.${premium ? '\n👑 _Premium Casino — higher limit active_' : ''}`)

        const economy = await client.econ.findOne({ userId: M.sender })
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`)

        const wallet = economy.gem || 0;
        if (wallet < amount) return M.reply("You don't have enough gems to gamble that much.");

        // Win probability: premium 85%, normal 75%
        const winChance = premium ? 0.85 : 0.75
        const result = Math.random() < 0.5 ? 'left' : 'right';
        const correctGuess = result === direction;

        // Apply win chance bias
        const won = Math.random() < winChance ? correctGuess : !correctGuess;

        const newBalance = won ? wallet + amount : wallet - amount;
        economy.gem = newBalance;
        await economy.save();

        try {
            const sticker = new Sticker(
                result === 'right'
                    ? 'https://i.ibb.co/SrtvnFH/ezgif-com-rotate.gif'
                    : 'https://raw.githubusercontent.com/Dkhitman3/Hitman47/master/assets/gifs/left.gif',
                {
                    pack: ' ',
                    author: ' ',
                    quality: 90,
                    type: 'full',
                    background: '#0000ffff'
                }
            )
            await client.sendMessage(M.from, { sticker: await sticker.build() }, { quoted: M })
        } catch (_) {}

        const resultMsg = won
            ? `🎉 *You won ${amount.toLocaleString()} gems!*`
            : `🥀 *You lost ${amount.toLocaleString()} gems.*`

        const premiumNote = premium ? `\n👑 _Premium Casino (${Math.round(winChance * 100)}% win chance)_` : ''

        return M.reply(
            `${resultMsg}\n💰 Wallet: *${economy.gem.toLocaleString()}*${premiumNote}`
        )
    }
};
