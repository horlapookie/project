module.exports = {
  name: 'mods',
  aliases: ['mod'],
  category: 'general',
  exp: 0,
  cool: 5,
  react: "📢",
  usage: 'Use {prefix}mods',
  description: 'Get information about moderators and officers',
  async execute(client, arg, M) {
    await client.refreshRoles?.();

    const normalizeNumber = (v = '') => String(v).replace(/\D/g, '');
    const owner = normalizeNumber(client.owner || '');
    const coOwners = (client.coOwners || []).map(normalizeNumber).filter(Boolean).filter(n => n !== owner);
    const officers = (client.officers || []).map(normalizeNumber).filter(Boolean);
    const mods = (client.mods || []).map(normalizeNumber).filter(Boolean).filter(n => n !== owner);
    const pureMods = mods.filter(n => !officers.includes(n) && !coOwners.includes(n));

    const mentions = [];
    const ownerLines = [];
    const coOwnerLines = [];
    const officerLines = [];
    const modLines = [];

    if (owner) mentions.push(`${owner}@s.whatsapp.net`);

    for (let i = 0; i < coOwners.length; i++) {
      const number = coOwners[i]
      const jid = `${number}@s.whatsapp.net`
      const savedName = await client.roleDB.get(`coowner-name-${number}`).catch(() => null)
      const contact = await client.contact.getContact(jid, client).catch(() => null)
      const username = savedName && typeof savedName === 'string'
        ? savedName.trim()
        : contact?.username && typeof contact.username === 'string'
        ? contact.username.trim()
        : 'Unknown User'
      mentions.push(jid)
      coOwnerLines.push(`*${i + 1}.* @${number} — ${username}`)
    }

    for (let i = 0; i < officers.length; i++) {
      const number = officers[i];
      const jid = `${number}@s.whatsapp.net`;
      const savedName = await client.roleDB.get(`sudo-name-${number}`).catch(() => null);
      const contact = await client.contact.getContact(jid, client).catch(() => null);
      const username = savedName && typeof savedName === 'string'
        ? savedName.trim()
        : contact?.username && typeof contact.username === 'string'
        ? contact.username.trim()
        : 'Unknown User';
      mentions.push(jid);
      officerLines.push(`*${i + 1}.* @${number} — ${username}`);
    }

    for (let i = 0; i < pureMods.length; i++) {
      const number = pureMods[i];
      const jid = `${number}@s.whatsapp.net`;
      const savedName = await client.roleDB.get(`mod-name-${number}`).catch(() => null);
      const contact = await client.contact.getContact(jid, client).catch(() => null);
      const username = savedName && typeof savedName === 'string'
        ? savedName.trim()
        : contact?.username && typeof contact.username === 'string'
        ? contact.username.trim()
        : 'Unknown User';
      mentions.push(jid);
      modLines.push(`*${i + 1}.* @${number} — ${username}`);
    }

    const caption = [
      `*${client.name || 'Eternal'} — Staff List*`,
      '',
      `👑 *Owner:* @${owner}`,
      '',
      `🤝 *Co-Owners* (${coOwners.length}):`,
      ...(coOwnerLines.length ? coOwnerLines : ['- None']),
      '',
      `🛡 *Officers* (${officers.length}):`,
      ...(officerLines.length ? officerLines : ['- None']),
      '',
      `⚔️ *Moderators* (${pureMods.length}):`,
      ...(modLines.length ? modLines : ['- None'])
    ].join('\n');

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
