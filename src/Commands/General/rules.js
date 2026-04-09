module.exports = {
  name: 'rule',
  aliases: ['rules'],
  category: 'general',
  exp: 15,
  cool: 4,
  react: "✅",
  usage: 'Use :rule',
  description: 'Here you can get the rules of our bot which is made to be maintained and breaking rules have punishments.',
  async execute(client, arg, M) {

    const image = await client.utils.getBuffer('https://i.ibb.co/71dNXTc/mai-sakurajima-in-the-beach-bdasn7f5tld3d37z-1.webp');

    let text = ''; // Change const to let since it's being modified
    text += `👑Rules👑\n`;
    text += `1) *No spam in bot*\n`;
    text += `2) *Don't send unnecessary things to the bot*\n`;
    text += `3) *Don't fight or use slang in our official groups*\n`;
    text += `4) *Any rule breaking may result in a ban*\n`;
    text += `5) *In one auction one user can only win a single card*\n`;
    text += `6) *Don't use bot for searching any insulting, nudify, or controversial matter*\n`; // Corrected grammar
    text += `7) *Don't call the bot or send spam messages in the bot's DM*\n`; // Corrected grammar
    await client.sendMessage(M.from, { image: { url: image }, caption: text }, { quoted: M });
  }
}
