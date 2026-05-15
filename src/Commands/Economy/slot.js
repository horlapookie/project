// Slot Command — Normal: x18 max, 75% win | Premium: x36 max, 85% win

const { hasPremiumCasino } = require('../../Helpers/premium')

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

// winRate: 0.0–1.0 desired win probability
const spinReels = (winRate = 0.75) => {
    const grid = [
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()],
        [spinSymbol(), spinSymbol(), spinSymbol()]
    ];

    const roll = Math.random();

    if (roll < winRate * 0.6) {
        // Force triple (big win)
        const sym = spinSymbol();
        grid[1][0] = sym;
        grid[1][1] = sym;
        grid[1][2] = sym;
    } else if (roll < winRate) {
        // Force pair
        const sym = spinSymbol();
        grid[1][0] = sym;
        grid[1][1] = sym;
    }
    // else natural RNG (may still produce a win)

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
    usage: 'Use: {prefix}slot <amount>',
    description: 'Slot machine — Premium users earn up to ×36!',

    async execute(client, arg, M) {
        if (!arg) return M.reply('Please provide an amount.');

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

        // Check premium status
        const userKey = String(M.sender.split('@')[0])
        const premium = await hasPremiumCasino(client, userKey).catch(() => false)
        const winRate  = premium ? 0.85 : 0.75
        const jackpotMult = premium ? 36 : 18

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

        const grid   = spinReels(winRate);
        const middle = grid[1];
        const [a, b, c] = middle;

        let multiplier  = 0;
        let outcomeText = '';

        // Triple
        if (a === b && b === c) {
            if (a === '💎') {
                multiplier  = jackpotMult;
                outcomeText = premium
                    ? `💎👑 PREMIUM MEGA JACKPOT! ${jackpotMult}x!`
                    : `💎 MEGA JACKPOT! ${jackpotMult}x!`;
            } else if (a === '⭐') {
                multiplier  = premium ? 18 : 9;
                outcomeText = `⭐ ${multiplier}x WIN!`;
            } else if (a === '🔔') {
                multiplier  = premium ? 12 : 6;
                outcomeText = `🔔 ${multiplier}x WIN!`;
            } else {
                multiplier  = premium ? 6 : 3;
                outcomeText = `🎉 ${multiplier}x WIN!`;
            }
        // Pair
        } else if (a === b || b === c || a === c) {
            multiplier  = premium ? 3 : 2;
            outcomeText = `✨ ${multiplier}x WIN!`;
        // Lucky fallback
        } else if (Math.random() < (premium ? 0.30 : 0.15)) {
            multiplier  = 1.2;
            outcomeText = '🍀 Lucky 1.2x!';
        }

        if (multiplier > 0) {
            const resultAmount = Math.floor(amount * multiplier);
            economy.gem += (resultAmount - amount);
            let text = '*☆::. 🎰 SLOT MACHINE 🎰 .::.☆*\n\n'
            text += visualize(grid)
            text += `\n\n${outcomeText}\n📈 You won *${resultAmount.toLocaleString()}* credits!`
            text += `\n\n💰 Wallet: *${economy.gem.toLocaleString()}*`
            if (premium) text += `\n👑 _Premium Casino active_`
            await economy.save();
            return client.sendMessage(M.from, { text, edit: spinMsg.key });
        } else {
            economy.gem -= amount;
            let text = '*☆::. 🎰 SLOT MACHINE 🎰 .::.☆*\n\n'
            text += visualize(grid)
            text += `\n\n📉 You lost *${amount.toLocaleString()}* credits.`
            text += `\n\n💰 Wallet: *${economy.gem.toLocaleString()}*`
            await economy.save();
            return client.sendMessage(M.from, { text, edit: spinMsg.key });
        }
    }
};
