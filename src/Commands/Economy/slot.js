// Slot Command
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
    grid.map((row) => row.join(' ┃ ')).join('\n──────────────\n');

module.exports = {
    name: 'slot',
    aliases: ['bet'],
    category: 'economy',
    exp: 5,
    cool: 30,
    react: '🤑',
    usage: 'Use: !slot <amount>',
    description: 'Bets the given amount in the slot machine. 3-of-a-kind on the middle row pays out!',
    async execute(client, arg, M) {
        if (!arg) return M.reply('Please provide the amount.');

        const amount = parseInt(arg);
        if (isNaN(amount) || amount <= 0) return M.reply('Please provide a valid positive amount.');
        if (String(arg).startsWith('-') || String(arg).startsWith('+'))
            return M.reply('Please provide a valid amount.');

        const economy = await client.getEcon(M);
        if (!economy) return M.reply(`Use ${client.prefix}bonus to get started.`);

        const credits = economy.gem || 0;
        if (amount > credits) return M.reply("You don't have sufficient funds.");
        if (amount > 1000000) return M.reply('You cannot bet more than 1,000,000 credits in the slot machine.');
        if (amount < 300) return M.reply('You cannot bet less than 300 credits in the slot machine.');

        const grid = spinReels();
        const middle = grid[1];

        // Determine outcome based on middle row
        let multiplier = 0;
        let outcomeText = '';
        let isJackpot = false;

        const allSame = middle[0] === middle[1] && middle[1] === middle[2];
        const twoSame = middle[0] === middle[1] || middle[1] === middle[2] || middle[0] === middle[2];

        if (allSame) {
            // Jackpot for triple-diamond, otherwise scale by symbol rarity
            const sym = middle[0];
            if (sym === '💎') {
                isJackpot = true;
                multiplier = 25; // mega jackpot
                outcomeText = '💎 MEGA JACKPOT! Triple Diamonds! 💎';
            } else if (sym === '⭐') {
                isJackpot = true;
                multiplier = 15;
                outcomeText = '⭐ JACKPOT! Triple Stars! ⭐';
            } else if (sym === '🔔') {
                multiplier = 9;
                outcomeText = '🔔 Triple Bells! 9x payout!';
            } else {
                multiplier = 9;
                outcomeText = `Triple ${sym}! 9x payout!`;
            }
        } else if (twoSame) {
            // Decide between 6x or 3x based on which symbols matched
            // 6x for the two-of-a-kind being middle pair, 3x otherwise
            const pairIsCenter = middle[0] === middle[1] && middle[1] === middle[2];
            if (middle[0] === middle[2]) {
                multiplier = 6;
                outcomeText = `${middle[0]} ${middle[1]} ${middle[2]} - Matching outer pair! 6x payout!`;
            } else {
                multiplier = 3;
                outcomeText = `${middle[0]} ${middle[1]} ${middle[2]} - Matching pair! 3x payout!`;
            }
        } else {
            // No match — small chance for a jackpot anyway as a "bonus"
            if (Math.random() < 0.01) {
                isJackpot = true;
                multiplier = 20;
                outcomeText = '🎰 SURPRISE JACKPOT!';
            } else {
                multiplier = 0;
            }
        }

        let resultAmount;
        if (multiplier > 0) {
            resultAmount = amount * multiplier;
            // Cap obscene wins to keep economy stable
            if (!isJackpot && resultAmount > 1500000) resultAmount = 1500000;
            if (isJackpot && resultAmount > 5000000) resultAmount = 5000000;
            economy.gem = (economy.gem || 0) + resultAmount;
        } else {
            // Loss
            resultAmount = -amount;
            economy.gem = Math.max(0, (economy.gem || 0) - amount);
        }

        await economy.save();

        let text = '*☆::. 🎰 ꜱʟᴏᴛ ᴍᴀᴄʜɪɴᴇ 🎰 .::.☆*\n\n';
        text += visualize(grid);
        text += '\n\n';
        if (multiplier > 0) {
            text += `${outcomeText}\n📈 You won *${resultAmount.toLocaleString()}* credits!`;
        } else {
            text += `📉 No match. You lost *${amount.toLocaleString()}* credits.`;
        }
        text += `\n\n💰 Wallet: *${(economy.gem || 0).toLocaleString()}*`;

        return M.reply(text);
    }
};
