module.exports = {
  name: "collect",
  aliases: ["c","claim","claimcard","collect"],
  exp: 0,
  cool: 4,
  react: "🎊",
  category: "card game",
  usage: 'Use :c',
  description: "Claim the card that is spawned",
  async execute(client, arg, M) {
    try {
      const card = await client.cardMap.get(M.from);
      if (!card) {
        return M.reply("🙅‍♀️ Sorry, there are currently no available cards to claim!");
      }

      const deck = await client.DB.get(`${M.sender}_Deck`) || [];
      const collection = await client.DB.get(`${M.sender}_Collection`) || [];
      const economy = await client.getEcon(M);

      let wallet = economy ? economy.gem : 0;
      
      if (wallet < card.price) {
        return M.reply(`You don't have enough in your wallet. Current balance: ${wallet}`);
      }

      // Deduct the card price from the user's wallet
      wallet -= card.price;
      
      

      let text = `🃏 card has been safely stored in your deck!`;

      if (card.pack && Array.isArray(card.pack)) {
        for (const item of card.pack) {
          if (deck.length < 12) {
            deck.push(item.card);
          } else {
            collection.push(item.card);
            text = `🃏card has been safely stored in your collection!`;
          }
        }
      } else if (deck.length < 12) {
        deck.push(card.card);
      } else {
        text = `🃏card has been safely stored in your collection!`;
        collection.push(card.card);
      }

      await client.DB.set(`${M.sender}_Deck`, deck);
      await client.DB.set(`${M.sender}_Collection`, collection);

      if (card.pack && Array.isArray(card.pack)) {
        const reveal = await client.utils.drawCardPackGallery(card.pack, { mode: 'front', title: 'PACK REVEAL' })
        await client.sendMessage(M.from, { image: reveal, caption: `🎉 You have successfully claimed the pack for *${card.price} gems*.` }, { quoted: M })
      } else {
        await M.reply(
          `🎉 You have successfully claimed the card for *${card.price} gems*. ${text}`
        );
      }

      await client.cardMap.delete(M.from);
      if (economy) {
        economy.gem = wallet;
        await economy.save();
      }
    } catch (err) {
      await client.sendMessage(M.from, {
        image: { url: `${client.utils.errorChan()}` },
        caption: `${client.utils.greetings()} Mai Sakurajima Dis\n\nError:\n${err}`
      });
    }
  },
};
