//Import Or Requiring Module 
const { shizobtn1, shizobtn1img, shizobtn1gif } = require('./shizofunc.js')
const cron = require("node-cron");
const axios = require('axios');
const path = require('path');
require("./Message");

module.exports = CardHandler = async (client, M) => {
  try {
    let cardgames = await client.DB.get('cards');
    const cardgame = cardgames || [];

    if (cardgame.length > 0) {
      const randomIndex = Math.floor(Math.random() * cardgame.length);
      const randomJid = cardgame[randomIndex];
      let jid = "120363313839059564@g.us"
      console.log(jid);

      if (cardgame.includes(jid)) {
        let count = 0;
        let sOr6Counter = 0;
        const sOr6Interval = 2;
        const sOr6Limit = 15;

        cron.schedule('*/20 * * * *', async () => {
          try {
            const filePath = path.join(__dirname, '../Helpers/card.json');
            const data = require(filePath);

            const index = Math.floor(Math.random() * data.length);
            let obj, price;

            obj = data[index];
            switch (obj.tier) {
              case "1":
                price = client.utils.getRandomInt(2000, 4000);
                break;
              case "2":
                price = client.utils.getRandomInt(4000, 5000);
                break;
              case "3":
                price = client.utils.getRandomInt(4000, 5000);
                break;
              case "4":
                price = client.utils.getRandomInt(8000, 10000);
                break;
              case "5":
                price = client.utils.getRandomInt(25000, 40000);
                break;
            }
            count++;
            sOr6Counter++;
            
            if (sOr6Counter === sOr6Interval && sOr6Counter <= (sOr6Interval * sOr6Limit)) {
              const filteredData = data.filter(card => card.tier === "S" || card.tier === "6");
              const index = Math.floor(Math.random() * filteredData.length);
              obj = filteredData[index];
              switch (obj.tier) {
                case "6":
                  price = client.utils.getRandomInt(70000, 90000);
                  break;
                case "S":
                  price = client.utils.getRandomInt(100000, 500000);
                  break;
              }
            }

            console.log(`Sended:${obj.tier + "  Name:" + obj.title + "  For " + price + " in " + jid}`);
      await client.cardMap.set(jid, {
	      card: `${obj.title}-${obj.tier}`,
	      price: price
      })
            if (obj.tier.includes('6') || obj.tier.includes('S')) {
              const giif = await client.utils.getBuffer(obj.url);
              const cgif = await client.utils.gifToMp4(giif);
        let shizoshona = `*┌─🄱🄾🅃────────❀̥˚─┈ ⳹*
*└──🄲🄰🅁🄳 🅂🄿🅆🄰🄽──┈ ⳹*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*│𓊈 ᴀ ʀᴀʀᴇ ᴄᴀʀᴅ ʜᴀꜱ ꜱᴘᴀᴡɴᴇᴅ 𓊉*
*│🏮 ɴᴀᴍᴇ: 𓆩 ${obj.title} 𓆪*
*│🔰 ᴛɪᴇʀ: 【 ${obj.tier} 】*
*│💰 Price: ░░ ${price} ░░*
*│░░░░░░░░░░░░░░░░░░░░*
*│📤 ɪɴғᴏ: ꜱʜᴏᴏʙ ᴄᴀʀᴅ'ꜱ  🎏*
*│░▒ ᴠᴇʀꜱɪᴏɴ 𝟐𝟎𝟐𝟒-𝟐𝟓 ▒░*
*│ᴄᴀʀᴅ.ᴊꜱᴏɴ ғɪʟᴇ ꜱᴜᴘᴘᴏʀᴛᴇᴅ 🎯*
*│░░░░░░░░░░░░░░░░░░░░*
*│🔮 ᴜꜱᴇ ᴄᴏʟʟᴇᴄᴛ ᴛᴏ ᴄʟᴀɪᴍ 📢*
*│🎋 ʏᴏᴜʀ ᴄᴀʀᴅ ᴡɪʟʟ ʙᴇ ꜱᴛᴏʀᴇᴅ*
*│ɪɴ ʏᴏᴜ ᴅᴇᴄᴋ... 💾📀*
*│- ᴏᴡɴᴇʀ: ʀᴇᴅᴢᴇᴏꭗ 彡*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*┌──🄲🄰🅁🄳 🅂🄿🅆🄰🄽──┈ ⳹*
*└❀̥˚───────────🄱🄾🅃─┈ ⳹*`
		return shizobtn1gif(client, jid, shizoshona, giif, ' Collect 🔖', `${client.prefix}collect`, '𒉢 ꜱᴀʏ.ꜱᴄ֟፝ᴏᴛᴄʜ ⚡𐇻')
            } else {
 let shizocutie = `*┌─🄱🄾🅃────────❀̥˚─┈ ⳹*
*└──🄲🄰🅁🄳 🅂🄿🅆🄰🄽──┈ ⳹*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*│𓊈 ᴀ ɴᴇᴡ ᴄᴀʀᴅ ʜᴀꜱ ꜱᴘᴀᴡɴᴇᴅ 𓊉*
*│🏮 ɴᴀᴍᴇ: 𓆩 ${obj.title} 𓆪*
*│🔰 ᴛɪᴇʀ: 【 ${obj.tier} 】*
*│💰 Price: ░░ ${price} ░░*
*│░░░░░░░░░░░░░░░░░░░░*
*│📤 ɪɴғᴏ: ꜱʜᴏᴏʙ ᴄᴀʀᴅ'ꜱ  🎏*
*│░▒ ᴠᴇʀꜱɪᴏɴ 𝟐𝟎𝟐𝟒-𝟐𝟓 ▒░*
*│ᴄᴀʀᴅ.ᴊꜱᴏɴ ғɪʟᴇ ꜱᴜᴘᴘᴏʀᴛᴇᴅ 🎯*
*│░░░░░░░░░░░░░░░░░░░░*
*│🔮 ᴜꜱᴇ ᴄᴏʟʟᴇᴄᴛ ᴛᴏ ᴄʟᴀɪᴍ 📢*
*│🎋 ʏᴏᴜʀ ᴄᴀʀᴅ ᴡɪʟʟ ʙᴇ ꜱᴛᴏʀᴇᴅ*
*│ɪɴ ʏᴏᴜ ᴅᴇᴄᴋ... 💾📀*
*│- ᴏᴡɴᴇʀ: ʀᴇᴅᴢᴇᴏꭗ 彡*
*│▱▱▱▱▱▱▱▱▱▱▱▱▱▱*
*┌──🄲🄰🅁🄳 🅂🄿🅆🄰🄽──┈ ⳹*
*└❀̥˚───────────🄱🄾🅃─┈ ⳹*`
              return shizobtn1img(client, jid, shizocutie, obj.url, ' Collect 🔖', `${client.prefix}collect`, '𒉢 ꜱᴀʏ.ꜱᴄ֟፝ᴏᴛᴄʜ ⚡𐇻')
            }

          } catch (err) {
            console.log(err);
            await client.sendMessage(jid , {image: {url: `${client.utils.errorChan()}`} , caption: `${client.utils.greetings()} Mai Sakurajima Dis\n\nCommand no error wa:\n${err}`});
          }

        cron.schedule('*/5 * * * *', async () => {
          await client.cards.delete(`${jid}.card`);
          await client.cards.delete(`${jid}.card_price`);
          console.log(`Card deleted after 5 minutes`);
        });
		        });
      }
    }
  } catch(error) {
    console.log(error);
  }
};


		  
