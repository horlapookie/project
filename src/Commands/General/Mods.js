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
    const mods = (client.mods || []).filter((n) => String(n) !== String(client.owner));
    const lines = [];

    for (let i = 0; i < mods.length; i++) {
      const number = mods[i];
      const jid = `${number}@s.whatsapp.net`;
      const contact = await client.contact.getContact(jid, client).catch(() => null);
      const savedName = await client.DB.get(`mod-name-${number}`).catch(() => null);
      const username = savedName && typeof savedName === 'string'
        ? savedName.trim()
        : contact?.username && typeof contact.username === 'string'
        ? contact.username.trim()
        : 'Unknown User';

      lines.push(
        `*${i + 1}.* ${username}`,
        `wa.me/${number}`
      );
    }

    const caption = [
      `*${client.name || 'Eternal'} moderators*`,
      '',
      `Total Mods: ${mods.length}`,
      '',
      lines.join('\n\n')
    ].join('\n').trim();

    await client.sendMessage(
      M.from,
      {
        image: { url: `${process.cwd()}/assets/Images/pokeball.png` },
        caption
      },
      { quoted: M }
    );
  }
};
