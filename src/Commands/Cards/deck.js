const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');
const { createDeflate } = require('zlib');

module.exports = {
  name: 'deck',
  aliases: ['deck'],
  exp: 0,
  cool: 4,
  react: "✅",
  category: 'card game',
  usage: 'Use :deck or :deck <index>',
  description: 'Claim the card',
  async execute(client, arg, M) {
    const deck = await client.DB.get(`${M.sender}_Deck`);
    if (!deck || deck.length === 0) {
      M.reply('No Deck Found');
      return;
    } 
    try {
      const maxCardsInDeck = 12;
      const cardsToMove = deck.slice(maxCardsInDeck);
      const cardsToKeep = deck.slice(0, maxCardsInDeck);
      const collection = await client.DB.get(`${M.sender}_Collection`) || [];
      await client.DB.set(`${M.sender}_Collection`, [...collection, ...cardsToMove]);
      await client.DB.set(`${M.sender}_Deck`, cardsToKeep);
      const bgPath = path.join(__dirname, '../../Helpers/bg.json');
      const bgData = require(bgPath);
      const backgroundTitle = await client.DB.get(`${M.sender}_BG`);

      let backgroundImageUrl = path.join(process.cwd(), 'assets/Images/battle.png');

      if (backgroundTitle) {
        const background = bgData.find(bg => bg.Name === backgroundTitle);
        if (background) {
          backgroundImageUrl = background.Url;
        }
      }

      if (arg) { 
        const index = parseInt(arg) - 1; // The index in the array is 0-based
        if (isNaN(index) || index < 0 || index >= deck.length) {
          M.reply(`Invalid card index. Your deck has ${deck.length} cards.`);
        } else {
          const card = deck[index].split('-');
          const filePath = path.join(__dirname, '../../Helpers/card.json');
          const data = require(filePath);
          const cardsInTier = data.filter((cardData) => cardData.tier === card[1]);
          const cardData = cardsInTier.find((cardData) => cardData.title === card[0]);
          const cardUrl = cardData.url;
          let text = `🃏 Total Deck Cards: ${deck.length}\n\n🏮 Username: ${(await client.contact.getContact(M.sender, client)).username} \n*#${index + 1}*\n🃏 *Name:* ${card[0]}\n🪄 *Tier:* ${card[1]} \n`;
          const file = await client.utils.getBuffer(cardUrl);
          if (cardUrl.endsWith('.gif')) {
            const giffed = await client.utils.gifToMp4(file);
            if (client.utils.isLikelyMp4(giffed)) {
              await client.sendMessage(M.from, {
                video: giffed,
                gifPlayback: true,
                caption: text
              });
            } else {
              await client.sendMessage(M.from, {
                document: file,
                mimetype: 'image/gif',
                fileName: `${card[0]}.gif`,
                caption: text
              });
            }
          } else {
            await client.sendMessage(M.from, {image: file, caption: text}, {quoted: M});
          }
        }
      } else {
        const images = [];
        let cardText = "";
        const cardSet = new Set();
        for (let i = 0; i < deck.length; i++) {
          const card = deck[i].split('-');
          const filePath = path.join(__dirname, '../../Helpers/card.json');
          const data = require(filePath);
          const cardsInTier = data.filter((cardData) => cardData.tier === card[1]);
          const cardData = cardsInTier.find((cardData) => cardData.title === card[0]);
          const cardKey = `${cardData.title}-${card[1]}-${cardData.url}-${i}`;
          let cardUrl = cardData.url;
          if (!cardSet.has(cardKey)) {
            cardSet.add(cardKey);
            if (cardUrl.endsWith('.gif')) {
              // Convert GIF to PNG
              const pngBuffer = await client.utils.gifToPng(await client.utils.getBuffer(cardUrl));
              const directory = require('os').tmpdir();
              const pngFilePath = path.join(directory, `card_${i}.png`);
              fs.writeFileSync(pngFilePath, pngBuffer);
              images.push(pngFilePath);
            } else {
              images.push(cardUrl);
            }
          }
          cardText += `🔰Card ${i+1}:\n🌟Tier: ${card[1]}\n💎Name ${card[0]}\n\n`;
        }
        
        const canvasWidth = 1050;
        const canvasHeight = 1800;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');
        let backgroundImage;
        try {
          backgroundImage = await loadImage(
            backgroundImageUrl.startsWith('http')
              ? await client.utils.getBuffer(backgroundImageUrl)
              : backgroundImageUrl
          );
        } catch (error) {
          backgroundImage = await loadImage(path.join(process.cwd(), 'assets/Images/battle.png'));
        }
        ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
        const imageWidth = 350;
        const imageHeight = 450;
        const imagePadding = 10;
        const imagesPerRow = 3;
        const rows = 4;
        const xStart = (canvasWidth - (imageWidth * imagesPerRow + imagePadding * (imagesPerRow - 1))) / 2;
        const yStart = (canvasHeight - (imageHeight * rows + imagePadding * (rows - 1))) / 2;
        
        for (let i = 0; i < images.length; i++) {
          const image = await loadImage(
            typeof images[i] === 'string' && images[i].startsWith('http')
              ? await client.utils.getBuffer(images[i])
              : images[i]
          );
          const x = xStart + (i % imagesPerRow) * (imageWidth + imagePadding);
          const y = yStart + Math.floor(i / imagesPerRow) * (imageHeight + imagePadding);
          ctx.drawImage(image, x, y, imageWidth, imageHeight);
        }
        
        const directory = require('os').tmpdir();
        const filePath = path.join(directory, 'collage.png');
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(filePath, buffer);
        const caption = `${(await client.contact.getContact(M.sender, client)).username} 's Deck\n\n Total Cards: ${deck.length}\n${cardText}`;
        client.sendMessage(M.from, {
          image: {url: filePath},
          caption: caption
        });
      } 
    } catch(err) {
      console.log(err);
      await client.sendMessage(M.from, {image: {url: `${client.utils.errorChan()}`}, caption: `${client.utils.greetings()} Error-Chan Dis\n\nError:\n${err}`});
    }
  },
};
                                            
