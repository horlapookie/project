module.exports = {
  name: "buycard",
  exp: 0,
  cool: 4,
  react: "✅",
  category: "card game",
  usage: 'buycard <saleID>',
  description: "Buys a card on sale",
  async execute(client, arg, M) {
    try {
      const saleData = await client.DB.get(`${M.from}.sell`);

      if (!saleData) {
        return M.reply("Sale with that ID does not exist or has expired.");
      }

      const shopID = parseInt(arg);
      if (isNaN(shopID) || shopID !== saleData.shopID) {
        return M.reply("Invalid sale ID. Please use a valid sale ID.");
      }

      const seller = saleData.seller;
      const price = Number(saleData.price || 0);
      const index = saleData.cardIndex;

      const buyer = M.sender;
      const sellerDeck = (await client.DB.get(`${seller}_Deck`)) || [];
      const buyerDeck = (await client.DB.get(`${buyer}_Deck`)) || [];

      if (sellerDeck.length <= index) {
        return M.reply("Seller's deck does not contain the specified card.");
      }

      const cardData = sellerDeck[index].split('-');
      const cardName = cardData[0];
      const cardTier = cardData[1];
      const buyerEco = await client.getEcon(buyer);
      const sellerEco = await client.getEcon(seller);
      const buyerWallet = Number(buyerEco?.gem || 0);

      if (!price || price <= 0) {
        return M.reply('Invalid sale price.');
      }
      if (buyerWallet < price) {
        return M.reply(`Not enough gems to make the purchase. Your balance: ${buyerWallet}`);
      }

      if (buyerEco) {
        buyerEco.gem = buyerWallet - price;
        await buyerEco.save();
      } else {
        await client.econ.create({ userId: buyer, gem: buyerWallet - price });
      }
      if (sellerEco) {
        sellerEco.gem = Number(sellerEco.gem || 0) + price;
        await sellerEco.save();
      } else {
        await client.econ.create({ userId: seller, gem: price });
      }

      buyerDeck.push(`${cardName}-${cardTier}`);

      if (buyerDeck.length === 12) {
        // Store buyer's deck in collection
        await client.DB.set(`${buyer}_Collection`, buyerDeck);
        await client.DB.delete(`${buyer}_Deck`);
      } else {
        await client.DB.set(`${buyer}_Deck`, buyerDeck);
      }

      sellerDeck.splice(index, 1);

      await client.DB.set(`${seller}_Deck`, sellerDeck);

      await client.DB.delete(`${M.from}.sell`);
      await client.DB.set(`${M.from}.sellInProgress`, false);

      M.reply(`Sale is done. *@${buyer.split('@')[0]}* paid *${price} gems* to *@${seller.split('@')[0]}* and bought the card.`);
    } catch (err) {
      console.error(err);
      await client.sendMessage(M.from, {
        image: { url: client.utils.errorChan() },
        caption: `${client.utils.greetings()} Mai Sakurajima\n\nError:\n${err}`,
      });
    }
  },
};
    
