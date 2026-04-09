const moment = require('moment-timezone')
function wish () {
  const hour_now = moment.tz('Asia/Kolkata').
 format('HH')
 var wishWishes = 'Good Morning 🌅'
 if (hour_now >= '06' && hour_now <= '12') {
   wishWishes = 'Good Morning 🌅' }
   else if (hour_now >= '12' && hour_now <= '17') {
     wishWishes = 'Good Afternoon 🏜️' }
   else if (hour_now >= '17' && hour_now <= '19') {
     wishWishes = 'Good Evening 🌆' }
   else if (hour_now >= '19' && hour_now <= '23') {
     wishWishes = 'Good Night 🌃' }
   else if (hour_now >= '23' && hour_now <= '05') {
     wishWishes = 'Sweet Dreams 💖 Sleep Well' }
   else if (hour_now >= '05' &- hour_now <= '06') {
     wishWishes = 'Go and sleep 😴' }
   else { 
    wishWishes = 'Good Night.!!!' }
   return wishWishes }
module.exports = {
    name: 'hi',
    aliases: ['hello'],
    category: 'general',
    exp: 0,
    cool: 4, // Cooldown in seconds
    react: "🕘",
    usage: 'Use ( -hi ) to check bot',
    description: 'Says hi to the bot.',
    async execute(client, arg, M) { 
        try {
            const hello = ['konnichiwa', 'hello senpai', 'hi senpai', 'bonjour', 'hola', 'hallo', 'hey', 'yo', 'howdy', 'greetings'];
            const hi = hello[Math.floor(Math.random() * hello.length)];
            
            const contact = await client.contact.getContact(M.sender, client);
            const username = contact && contact.username ? contact.username : 'there';
            let { key } = await M.reply(`${wish()} ${username}`)
        
            setTimeout(async () => {
            await client.relayMessage(M.from, {
                protocolMessage: {
                    key,
                    type: 14,
                    editedMessage: {
                        conversation: `${hi} ${username}. How are you today?`
                    }
                }
            },{})

      if ( M.sender == "917980329866@s.whatsapp.net") {
            await client.relayMessage(M.from, {
                protocolMessage: {
                    key,
                    type: 14,
                    editedMessage: {
                        conversation: `${hi} Dear say.scotch , ${wish ()} How are you today ?`
                    }
                }
            },{})
      }
        }, 5000);
        } catch (error) {
            console.error('Error in executing hi command:', error);
            M.reply('An error occurred while executing the hi command.');
        }
    }
                  }
                      
