const axios = require('axios');
const {
  proto,
  generateWAMessage,
  areJidsSameUser,
  generateWAMessageFromContent,
  prepareWAMessageMedia
} = require('@adiwajshing/baileys');

module.exports = {
  name: 'Latency',
  aliases: ['advice', 'adv'],
  category: 'fun',
  exp: 5,
  cool: 4,
  react: "📢",
  usage: 'Use :Advice',
  description: 'Sends random Advice',
  async execute(client, arg, M) {
    try {
      const puppeteer = require('puppeteer');

      (async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        // Open WhatsApp Web
        await page.goto('https://web.whatsapp.com');
        await page.waitForSelector('._3GlyB', { timeout: 60000 }); // Wait for QR scan

        console.log('Logged in! Monitoring for "ping"...');

        // Listen for new messages
        setInterval(async () => {
          // Get the latest message in the active chat
          const [lastMessage] = await page.$$eval('.message-in', (messages) => {
            return messages.slice(-1).map(msg => msg.innerText);
          });

          if (lastMessage?.toLowerCase().trim() === 'ping') {
            // Type and send "Latency"
            await page.type('div[title="Type a message"]', 'pong');
            await page.keyboard.press('Enter');
            console.log('Replied with "Latency"!');
          }
        }, 2000); // Check every 2 seconds
      })();
    }
           ],
  })
})
    }
  }
}, { })

await client.relayMessage(msg.key.remoteJid, msg.message, {
  messageId: msg.key.id
})
        } catch (err) {
  console.error('Error fetching Advice:', err);
  M.reply('Error fetching Advice. Please try again later.');
}
    }
};
