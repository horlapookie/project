const path = require('path');

module.exports = {
  name: "salecard",
  exp: 0,
  cool: 4,
  react: "✅",
  category: "card game",
  usage: 'salecard <index>|<price>',
  description: "Initiates a card sale",
  async execute(client, arg, M) {
    try {
      const selling = await client.DB.get(`${M.from}.sellInProgress`) || false;
      if (selling) return M.reply("Sale is already in progress.");

      const seller = M.sender; // Using M.sender as the seller ID
      const splitArgs = arg.split('|');
      if (splitArgs.length !== 2) {
        return M.reply("Please provide both index and price in the format 'index|price'.");
      }
      const cardIndex = parseInt(splitArgs[0]) - 1;
      const price = splitArgs[1];
      const deck = await client.DB.get(`${M.sender}_Deck`) || []; // Use M.sender for consistency
      if (!deck.length) {
        return M.reply("❗ You do not have any cards in your deck!");
      }
      const cardToSell = deck[cardIndex]?.split('-');
      if (!cardToSell) {
        return M.reply("❗ The card index you provided is invalid!");
      }
      const filePath = path.join(__dirname, '../../Helpers/card.json');
      const data = require(filePath);
      const cardsInTier = data.filter((cardData) => cardData.tier === cardToSell[1]);
      const cardData = cardsInTier.find((cardData) => cardData.title === cardToSell[0]);
      if (!cardData) {
        return M.reply("❗ Card data not found.");
      }
      const cardUrl = cardData.url;
      const cardName = cardData.title;
      const cardTier = cardData.tier;
      const shopID = client.utils.getRandomInt(10000, 99999);
      const imageUrl = cardUrl;
      const isGif = imageUrl.endsWith('.gif');
      const file = await client.utils.getBuffer(imageUrl);
      const text = `💎 Card on sale 💎\n\n🌊 Name: ${cardName}\n\n🌟 Tier: ${cardTier}\n\n📝 Price: ${price}\n\n🎉 ID: ${shopID}\n\n🔰 Use :buycard <saleID> to get the card`;

      if (isGif) {
        const giffed = await client.utils.gifToMp4(file);
        if (client.utils.isLikelyMp4(giffed)) {
          await client.sendMessage(M.from, {
            video: giffed,
            gifPlayback: true,
            caption: text
          }, { quoted: M });
        } else {
          await client.sendMessage(M.from, {
            document: file,
            mimetype: 'image/gif',
            fileName: `${cardName}.gif`,
            caption: text
          }, { quoted: M });
        }
      } else {
        await client.sendMessage(M.from, {
          image: file,
          caption: text
        }, { quoted: M });
      }

      await client.DB.set(`${M.from}.sell`, { shopID: shopID, seller: seller, cardIndex: cardIndex, price: price }); // Use M.sender for consistency
      await client.DB.set(`${M.from}.sellInProgress`, true);

      setTimeout(async () => {
        await client.DB.delete(`${M.from}.sell`); // Use M.sender for consistency
        await client.DB.set(`${M.from}.sellInProgress`, false);
        M.reply(`Sale with ID ${shopID} has expired and is now deleted.`);
      }, 600000);
    } catch (err) {
      console.error(err);
      await client.sendMessage(M.from, {
        image: { url: client.utils.errorChan() },
        caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`,
      });
    }
  },
};
