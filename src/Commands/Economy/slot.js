// Slot Command (UPDATED: 3x / 6x / 9x / 18x JACKPOT + 5s COOLDOWN)

const SYMBOLS = [
    { display: '🍒', weight: 14 },
    { display: '🍋', weight: 12 },
    { display: '🍊', weight: 11 },
    { display: '🍉', weight: 10 },
    { display: '🍇', weight: 9 },
    { display: '🔔', weight: 6 },
    { display: '⭐', weight: 4 },
    { display: '💎', weight: 2 }
];

const totalWeight = SYMBOLS.reduce((s, x) => s + x.weight, 0);

const spinSymbol = () => {
    let r = Math.floor(Math.random() * totalWeight);
    for (const sym of SYMBOLS) {
        r -= sym.weight;
        if (r < 0) return sym.display;
    }
    return SYMBOLS[0].display;
};

const spinReels = () => {
    return [
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()]
    ];
};

const visualize = (grid) =>
    grid.map(row => row.join(' ┃ ')).join('\n──────────────\n');

module.exports = {
    name: 'slot',
    aliases: ['bet'],
    category: 'economy',
    exp: 5,
    cool: 5, // ⚡ reduced cooldown to 5 seconds
    react: '🤑',
    usage: 'Use: !slot <amount>',
    description: 'Spin the slot machine and win up to 18x jackpot!',

    async execute(client, arg, M) {
        if (!arg) return M.reply('Please provide the amount.');

        const amount = parseInt(arg);
        if (isNaN(amount) || amount <= 0) return M.reply('Enter a valid amount.');
        if (String(arg).startsWith('-') || String(arg).startsWith('+'))
            return M.reply('Invalid amount.');

        const economy = await client.getEcon(M);
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`);

        const credits = economy.gem || 0;

        if (amount > credits) return M.reply("You don't have enough credits.");
        if (amount > 1000000) return M.reply('Max bet is 1,000,000.');
        if (amount < 300) return M.reply('Minimum bet is 300.');

        const grid = spinReels();
        const middle = grid[1];

        const a = middle[0];
        const b = middle[1];
        const c = middle[2];

        let multiplier = 0;
        let outcomeText = '';

        // 🎯 TRIPLE MATCH (JACKPOT TIERS)
        if (a === b && b === c) {

            if (a === '💎') {
                multiplier = 18;
                outcomeText = '💎 MEGA JACKPOT! 18x WIN!';
            } else if (a === '⭐') {
                multiplier = 9;
                outcomeText = '⭐ BIG WIN! 9x Payout!';
            } else if (a === '🔔') {
                multiplier = 6;
                outcomeText = '🔔 Triple Bells! 6x Payout!';
            } else {
                multiplier = 3;
                outcomeText = `🎉 Triple ${a}! 3x Payout!`;
            }

        // 🎯 TWO MATCH (small win)
        } else if (a === b || b === c || a === c) {
            multiplier = 2;
            outcomeText = '✨ Two match! Small win!';

        // ❌ LOSS
        } else {
            multiplier = 0;
        }

        let resultAmount;

        if (multiplier > 0) {
            resultAmount = Math.floor(amount * multiplier);

            economy.gem += (resultAmount - amount);
        } else {
            resultAmount = amount;
            economy.gem -= amount;
        }

        await economy.save();

        let text = '*☆::. 🎰 SLOT MACHINE 🎰 .::.☆*\n\n';
        text += visualize(grid);
        text += '\n\n';

        if (multiplier > 0) {
            text += `${outcomeText}\n📈 You won *${resultAmount.toLocaleString()}* credits!`;
        } else {
            text += `📉 No match. You lost *${amount.toLocaleString()}* credits.`;
        }

        text += `\n\n💰 Wallet: *${economy.gem.toLocaleString()}*`;

        return M.reply(text);
    }
};
