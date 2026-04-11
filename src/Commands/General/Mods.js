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
    await client.refreshRoles?.();
    const owner = String(client.owner || '');
    const staff = Array.from(
      new Set([...(client.mods || []), ...(client.officers || [])].map((n) => String(n)).filter(Boolean))
    ).filter((n) => n !== owner);
    const lines = [];
    const mentions = [];

    for (let i = 0; i < staff.length; i++) {
      const number = staff[i];
      const jid = `${number}@s.whatsapp.net`;
      const contact = await client.contact.getContact(jid, client).catch(() => null);
      const savedName =
        (await client.DB.get(`sudo-name-${number}`).catch(() => null)) ||
        (await client.DB.get(`mod-name-${number}`).catch(() => null));
      const username = savedName && typeof savedName === 'string'
        ? savedName.trim()
        : contact?.username && typeof contact.username === 'string'
        ? contact.username.trim()
        : 'Unknown User';

      lines.push(
        `*${i + 1}.* ${username} (@${number})`,
        `wa.me/${number}`
      );
      mentions.push(jid);
    }

    const caption = [
      `*${client.name || 'Eternal'} moderators*`,
      '',
      `Total Staff: ${staff.length}`,
      '',
      lines.join('\n\n')
    ].join('\n').trim();

    await client.sendMessage(
      M.from,
      {
        image: { url: `${process.cwd()}/assets/Images/pokeball.png` },
        caption,
        mentions
      },
      { quoted: M }
    );
  }
};
