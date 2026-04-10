module.exports = {
  name: 'bid',
  aliases: ['auction-bid'],
  category: 'economy',
  exp: 5,
  cool: 5,
  react: "✅",
  usage: 'Use :bid <amount>',
  description: 'Bid an amount on an ongoing auction',
  async execute(client, arg, M) {
    try {
      const eco = await client.getEcon(M);
      if (!eco) {
        return M.reply('You do not have an economy account yet. Use :bonus to get started.');
      }
      const auctionInProgress = await client.DB.get(`${M.from}.auctionInProgress`);
      if (!auctionInProgress) {
        return M.reply("There is no ongoing auction at the moment.");
      } else if (!arg) {
        return M.reply('Please provide the amount you want to bid.');
      } else {
        const amount = parseInt(arg);
        if (isNaN(amount)) {
          return M.reply('Please provide a valid amount for your bid.');
        } else if (amount <= 0) {
          return M.reply('Please provide a positive amount for your bid.');
        }

        const currentBid = (await client.DB.get(`${M.from}.currentBid`)) || 0;
        const credits = eco.gem || 0;
        if (amount <= currentBid) {
          return M.reply("Your bid must be higher than the current highest bid.");
        } else if (amount > credits) {
          return M.reply('You do not have enough gems for this bid.');
        } else {
          await client.DB.set(`${M.from}.currentBid`, amount);
          await client.DB.set(`${M.from}.auctionWinner`, M.sender);
          const responseText = `You have successfully placed a bid of ${amount} gems.`;
          return M.reply(responseText);
        }
      }
    } catch (err) {
      console.log(err);
      await client.sendMessage(M.from, { image: { url: client.utils.errorChan() }, caption: `${client.utils.greetings()} Mai Sakurajima Dis\n\nError:\n${err}` });
    }
  }
};
