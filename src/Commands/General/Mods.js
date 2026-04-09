module.exports = {
  name: 'mods',
  aliases: ['mod'],
  category: 'general',
  exp: 0,
  cool: 5,
  react: "📢",
  usage: 'Use :mods',
  description: 'Get information about moderators',
  async execute(client, arg, M) {
    let mods = client.mods;
    let mo = "*Moderator's 📡*\n";
    
    for (let i = 0; i < mods.length; i++) {
      const contact = await client.contact.getContact(mods[i], client);
      const pushname = contact.username?.whatsapp?.net.toString() || 'Unknown'; // Ensure pushname is always a string
      const tag = mods[i].split('@s.whatsapp.net')[0];
      mo += `\n#${i + 1}) ❄️ ${pushname}\n🎲  http://wa.me/+${mods[i]}\ntag: ${tag}`;
    }
    
    await client.sendMessage(
      M.from,
      {
        image: { url: "https://i.ibb.co/5xCzppV/images-6.jpg" },
          text: mo, // Use mo as the caption
        mentions: mods.map(mod => ({ tag: mod, id: mods.indexOf(mod) }))
      },
      { quoted: M }
    );
  }
};
