const path = require('path');

module.exports = {
  name: "auction",
  aliases: ["auction"],
  exp: 0,
  cool: 5,
  react: "✅",
  category: "card game",
  description: "Starts or ends a card auction",
  async execute(client, arg, M) {
    try {
      if (arg.startsWith('start')) {
        const auctionInProgress = await client.DB.get(`${M.from}.auctionInProgress`);
        if (auctionInProgress) {
          return M.reply("An auction is already in progress. You cannot start a new one.");
        }
        
        const splitArgs = arg.split('|');
        if (splitArgs.length !== 3) {
          return M.reply("Please provide both the card index and the starting price separated by '|' (e.g., start|1|100).");
        }

        const deck = await client.DB.get(`${M.sender}_Deck`) || [];
        if (deck.length === 0) {
          return M.reply("You do not have any cards in your deck to auction.");
        }

        const cardIndex = parseInt(splitArgs[1]) - 1;
        if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= deck.length) {
          return M.reply("Please provide a valid card index.");
        }

        const startingPrice = parseInt(splitArgs[2]);
        if (isNaN(startingPrice) || startingPrice <= 0) {
          return M.reply("Please provide a valid starting price.");
        }
        
        const cardToSell = deck[cardIndex].split('-');
        const filePath = path.join(__dirname, '../../Helpers/card.json');
        const cardDataJson = require(filePath);
        const cardsInTier = cardDataJson.filter((card) => card.tier === cardToSell[1]);
        const cardData = cardsInTier.find((card) => card.title === cardToSell[0]);
        if (!cardData) {
          return M.reply("The card data could not be found.");
        }

        const imageUrl = cardData.url;
        const text = `💎 *Card on Auction* 💎\n\n🌊 *Name:* ${cardData.title}\n\n🌟 *Tier:* ${cardData.tier}\n\n📝 *Starting Price:* ${startingPrice} gems\n\n🎉 *Highest bidder gets the card* 🎉\n\n🔰 Use :bid <amount> to bid`;

        const file = await client.utils.getBuffer(imageUrl);
        const isGif = imageUrl.endsWith('.gif');

        if (isGif) {
          const giffed = await client.utils.gifToMp4(file);
          if (client.utils.isLikelyMp4(giffed)) {
            await client.sendMessage(M.from, { video: giffed, gifPlayback: true, caption: text, quoted: M });
          } else {
            await client.sendMessage(M.from, { document: file, mimetype: 'image/gif', fileName: `${cardData.title}.gif`, caption: text, quoted: M });
          }
        } else {
          await client.sendMessage(M.from, { image: file, caption: text, quoted: M });
        }

        await client.DB.set(`${M.from}.auctionInProgress`, true);
        await client.DB.set(`${M.from}.currentBid`, startingPrice);
        await client.DB.delete(`${M.from}.auctionWinner`);
        await client.DB.set(`${M.from}.auctionCardIndex`, cardIndex);
        await client.DB.set(`${M.from}.auctionSeller`, M.sender);
        return;
      }

      if (arg === 'end') {
        const bid = Number((await client.DB.get(`${M.from}.currentBid`)) || 0);
        const winner = await client.DB.get(`${M.from}.auctionWinner`);
        const seller = await client.DB.get(`${M.from}.auctionSeller`);
        if (!winner) {
          return M.reply('No one bid, so the auction is won by mods.');
        } else {
          const cardIndex = await client.DB.get(`${M.from}.auctionCardIndex`);
          const deck = await client.DB.get(`${seller}_Deck`) || [];
          const cardToSell = deck?.[cardIndex]?.split('-');
          if (!cardToSell) {
            return M.reply('Auction card was not found in the seller deck anymore.');
          }
          const filePath = path.join(__dirname, '../../Helpers/card.json');
          const cardDataJson = require(filePath);
          const cardsInTier = cardDataJson.filter((card) => card.tier === cardToSell[1]);
          const cardData = cardsInTier.find((card) => card.title === cardToSell[0]);

          // Check if the winner has less than 12 cards in their deck
          const winnerDeck = await client.DB.get(`${winner}_Deck`) || [];
          if (winnerDeck.length < 12) {
            // Store the won card in the winner's deck
            await client.DB.push(`${winner}_Deck`, `${cardData.title}-${cardData.tier}`);
          } else {
            // Store the won card in the winner's collection
            await client.DB.push(`${winner}_Collection`, `${cardData.title}-${cardData.tier}`);
          }
          // Remove the card from the seller's deck
          deck.splice(cardIndex, 1)
          await client.DB.set(`${seller}_Deck`, deck)

          const winnerEco = await client.getEcon(winner);
          const sellerEco = await client.getEcon(seller);
          const winnerWallet = Number(winnerEco?.gem || 0);
          if (winnerWallet < bid) {
            return M.reply(`Auction winner does not have enough gems anymore to pay *${bid}*.`)
          }
          if (winnerEco) {
            winnerEco.gem = winnerWallet - bid;
            await winnerEco.save();
          } else {
            await client.econ.create({ userId: winner, gem: winnerWallet - bid });
          }
          if (sellerEco) {
            sellerEco.gem = Number(sellerEco.gem || 0) + bid;
            await sellerEco.save();
          } else {
            await client.econ.create({ userId: seller, gem: bid });
          }
          await client.DB.delete(`${M.from}.auctionWinner`);
          await client.DB.delete(`${M.from}.auctionInProgress`);
          await client.DB.delete(`${M.from}.auctionCardIndex`);
          await client.DB.delete(`${M.from}.auctionSeller`);
          await client.DB.delete(`${M.from}.currentBid`);

          M.reply(`*The auction for ${cardData.title} (Tier ${cardData.tier}) is won by @${winner.split('@')[0]} with a bid of ${bid} gems. It has been added to the winner's ${winnerDeck.length < 12 ? 'deck' : 'collection'}.*`);
        }
      }
    } catch (err) {
      console.log(err);
      await client.sendMessage(M.from, { image: { url: client.utils.errorChan() }, caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`, quoted: M });
    }
  }
};
