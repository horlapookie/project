module.exports = {
     name: 'support',
     aliases: ['support'],
     category: 'general',
     exp: 5,
     cool: 4,
     react: "✅",
     usage: 'Use :support',
     description: 'Gives links of official gcs',
	     async execute(client, arg, M) {
	       try {
	         const botName = client.name || '𝚅𝙴𝙽 𝚍𝚘𝚖𝚊𝚒𝚗'
	         const final = `*${botName} Support Groups*\n\n1. https://chat.whatsapp.com/Lw7G2TE1rtyJo6fG3skbNl?mode=gi_t\n2. https://chat.whatsapp.com/IBpLw9pGu5X0fiIxY2zHJI?mode=gi_t\n3. https://chat.whatsapp.com/IPHkNCUD12TE4mppKZlJB0`
	         await client.sendMessage(M.from, { image: { url: 'https://i.ibb.co/jyfcX5S/wp4055471-mai-sakurajima-wallpapers.png' }, caption: final }, { quoted: M });
	       } catch (error) {
	         console.error('Error in support command:', error);
	         await client.sendMessage(M.from, { image: { url: `${client.utils.errorChan()}` }, caption: `${client.utils.greetings()} Error-Chan\n\nError:\n${error}` });
	       }
	     }
	   };
