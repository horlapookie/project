// Slot Command
const { SlotMachine, SlotSymbol } = require('slot-machine');

module.exports = {
    name: 'slot',
    aliases: ['bet'],
    category: 'economy',
    exp: 5,
    cool: 8,
    react: "🤑",
    usage: 'Use: !slot <amount>',
    description: 'Bets the given amount of credits in a slot machine',
    async execute(client, arg, M) {
        const symbols = [
            new SlotSymbol('a', {
                display: '🍊',
                points: 0,
                weight: 3,
            }),
            new SlotSymbol('b', {
                display: '🍉',
                points: 1,
                weight: 5,
            }),
            new SlotSymbol('c', {
                display: '🥭',
                points: 0,
                weight: 10,
            }),
            new SlotSymbol('d', {
                display: '🍎',
                points: 0,
                weight: 6,
            }),
            new SlotSymbol('e', {
                display: '🍑',
                points: 1,
                weight: 8,
            }),
            new SlotSymbol('f', {
                display: '🍓',
                points: 1,
                weight: 6,
            }),
            new SlotSymbol('g', {
                display: '🍇',
                points: 0,
                weight: 4,
            }),
        ];
        
        if (!arg) return M.reply('Please provide the amount.');
        
        const amount = parseInt(arg);

        if (isNaN(amount) || amount <= 0) return M.reply('Please provide a valid positive amount.');
        
        if (arg.startsWith('-') || arg.startsWith('+')) return M.reply('Please provide a valid amount.');

        const userId = M.sender;
        const economy = await client.econ.findOne({ userId });

        const credits = economy.gem || 0;

        if (amount > credits) return M.reply("You don't have sufficient funds.");
        
        if (amount > 200000) return M.reply('You cannot bet more than 200000 credits in the slot machine.');
        
        if (amount < 300) return M.reply('You cannot bet less than 300 credits in the slot machine.');

        const machine = new SlotMachine(3, symbols).play();
        const points = machine.lines.reduce((total, line) => total + line.points, 0);

        let resultAmount = points <= 0 ? -amount : amount * points;

        const jackpotChance = Math.random();
        const isJackpotTriggered = jackpotChance < 0.05; // Define jackpot triggering probability

        if (isJackpotTriggered) {
            const jackpotWin = 200000; // Update jackpot win amount
            economy.gem += jackpotWin;
            await economy.save();
            return M.reply(`*☆::. 🎰𓊈 ꜱʟᴏᴛ ᴍᴀᴄʜɪɴᴇ 𓊉 🎰 .::.☆*\n🍓 🍓 🍓\n🍉 🍉 🍉\n🍑 🍑 🍑\nCongratulations! You hit the jackpot and won ${jackpotWin} credits!`);
        } else {
            let luck = 0; // Define luck variable
            if (economy.luckpotion) {
                luck = economy.luckpotion;
            }

            const luckFactor = 0.6 + (Math.random() * luck) / 10; // Reduce luck factor to 60%

            if (points > 0 || Math.random() < luckFactor) { // Introduce luck probability here
                resultAmount *= luckFactor; // Multiply result amount by luck factor
            }
            
            resultAmount = Math.round(resultAmount);
            if (resultAmount > 150000) resultAmount = 150000;

            economy.gem += resultAmount;
            await economy.save();

            let text = '*☆::. 🎰𓊈 ꜱʟᴏᴛ ᴍᴀᴄʜɪɴᴇ 𓊉 🎰 .::.☆*\n\n';
            text += machine.visualize();

            if (points <= 0 && luck > 0 && Math.random() < 0.5) { // Adjust the probability here
                resultAmount = 0;
                economy.luckpotion -= 1;
                await economy.save();
                text += '\n\nYou have been saved by your luck potion!🙂';
            } else {
                if (points <= 0) {
                    economy.gem -= amount;
                    await economy.save();
                }
                text += points <= 0 ? `\n\n📉 You lost ${amount} credits` : `\n\n📈 You won ${resultAmount} credits`;
            }

            M.reply(text);
        }
    },
};
