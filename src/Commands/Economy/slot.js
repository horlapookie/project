// Slot Command (75% win feel + animation + 3x/6x/9x/18x)

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

// 🎯 Controlled reels (win-rate tuned)
const spinReels = () => {
    const grid = [
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()]
    ];

    const roll = Math.random();

    if (roll < 0.45) {
        // 45% → force pair
        const sym = spinSymbol();
        grid[1][0] = sym;
        grid[1][1] = sym;
    } else if (roll < 0.60) {
        // 15% → triple (big win chance)
        const sym = spinSymbol();
        grid[1][0] = sym;
        grid[1][1] = sym;
        grid[1][2] = sym;
    }
    // remaining ~40% = natural RNG (loss or lucky)

    return grid;
};

const visualize = (grid) =>
    grid.map(row => row.join(' ┃ ')).join('\n──────────────\n');

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

module.exports = {
    name: 'slot',
    aliases: ['bet'],
    category: 'economy',
    exp: 5,
    cool: 15,
    react: '🤑',
    usage: 'Use: !slot <amount>',
    description: 'High win-rate slot with animation.',

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

        // 🎰 fake spinning animation
        const spinMsg = await M.reply('🎰 Spinning...');
        for (let i = 0; i < 3; i++) {
            const tempGrid = [
                [spinSymbol(), spinSymbol(), spinSymbol()],
                [spinSymbol(), spinSymbol(), spinSymbol()],
                [spinSymbol(), spinSymbol(), spinSymbol()]
            ];
            await sleep(500);
            await client.sendMessage(M.from, { text: visualize(tempGrid), edit: spinMsg.key });
        }

        const grid = spinReels();
        const middle = grid[1];

        const a = middle[0];
        const b = middle[1];
        const c = middle[2];

        let multiplier = 0;
        let outcomeText = '';

        // 🎯 triple
        if (a === b && b === c) {
            if (a === '💎') {
                multiplier = 18;
                outcomeText = '💎 MEGA JACKPOT! 18x!';
            } else if (a === '⭐') {
                multiplier = 9;
                outcomeText = '⭐ 9x WIN!';
            } else if (a === '🔔') {
                multiplier = 6;
                outcomeText = '🔔 6x WIN!';
            } else {
                multiplier = 3;
                outcomeText = '🎉 3x WIN!';
            }

        // 🎯 pair
        } else if (a === b || b === c || a === c) {
            multiplier = 2;
            outcomeText = '✨ 2x WIN!';

        // 🍀 lucky fallback (~15%)
        } else if (Math.random() < 0.15) {
            multiplier = 1.2;
            outcomeText = '🍀 Lucky 1.2x!';
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
            text += `📉 You lost *${amount.toLocaleString()}* credits.`;
        }

        text += `\n\n💰 Wallet: *${economy.gem.toLocaleString()}*`;

        // final edit (replace spinning)
        await client.sendMessage(M.from, { text, edit: spinMsg.key });
    }
};
