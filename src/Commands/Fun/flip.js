module.exports = {
    name: 'flip',
    aliases: ['flip'],
    category: 'fun',
    react: "✅",
    exp: 12,
    cool: 4,
    usage: 'Use :flip dice/coin',
    description: 'Play a game of flip coin or roll a dice (1-6). Usage: !flip [coin/dice]',
    async execute(client, arg, M) { 
      const choices = ['heads', 'tails'];
      const diceRange = [1, 2, 3, 4, 5, 6];
  
      const userChoice = arg.toLowerCase();
  
      if (!userChoice) {
        return M.reply('Please provide your choice (coin or dice).');
      }
  
      if (userChoice === 'coin') {
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        M.reply(`You flipped ${botChoice}!`);
      } else if (userChoice === 'dice') {
        const botChoice = diceRange[Math.floor(Math.random() * diceRange.length)];
        M.reply(`You rolled a ${botChoice}!`);
      } else {
        return M.reply('Please provide a valid choice (coin or dice).');
      }
    }
  };
  
