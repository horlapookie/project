module.exports = {
    name: 'delete',
    aliases: ['del'],
    category: 'moderation',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use {prefix}delete (quote the message you want to delete)',
    description: 'Deletes the quoted message',
    async execute(client, arg, M) {
        if (!M.quoted) return M.reply('Quote the message that you want me to delete, Baka!')
        
        // Check if bot is admin in group
        if (M.isGroup) {
            const groupMetadata = await client.groupMetadata(M.from);
            const normalizeNumber = (value = '') => String(value).replace(/\D/g, '');
            const stripDevice = (jid = '') => String(jid || '').replace(/:\d+(?=@)/, '');
            const { areJidsSameUser } = require('@whiskeysockets/baileys');

            const botBase = normalizeNumber(String(client.user?.id || '').split('@')[0]);
            const botCandidates = Array.from(
                new Set(
                    [
                        client.user?.id,
                        stripDevice(client.user?.id),
                        client.meLid,
                        stripDevice(client.meLid),
                        client.user?.lid,
                        stripDevice(client.user?.lid),
                        botBase ? `${botBase}@s.whatsapp.net` : null,
                        botBase ? `${botBase}@lid` : null,
                        botBase || null
                    ].filter(Boolean)
                )
            );

            const findParticipant = (jid) =>
                groupMetadata.participants.find((p) => {
                    const pid = stripDevice(p?.id || p?.jid || '');
                    const candidate = stripDevice(jid);
                    return (
                        (pid && candidate && areJidsSameUser(pid, candidate)) ||
                        (pid && candidate && pid === candidate) ||
                        (pid && candidate && normalizeNumber(pid.split('@')[0]) === normalizeNumber(candidate.split('@')[0]))
                    );
                });

            const botParticipant = botCandidates.map(findParticipant).find(Boolean);
            const botIsAdmin = Boolean(botParticipant?.admin);
            if (!botIsAdmin) return M.reply('I need to be an admin in this group to delete messages.');
        }
        
        try {
            const quotedKey = M.quoted?.key || {}
            const quotedId = quotedKey.id || M.quoted?.id
            const remoteJid = quotedKey.remoteJid || M.from
            const fromMe = Boolean(quotedKey.fromMe || M.quoted?.fromMe)
            const participant = quotedKey.participant || M.quoted?.participant || M.quoted?.sender

            const key = {
                remoteJid,
                id: String(quotedId),
                fromMe,
                ...(participant ? { participant: String(participant) } : {})
            }

            // Use rawSendMessage to bypass the media-normalization wrapper
            const rawSend = client._rawSendMessage || client.sendMessage
            await rawSend(M.from, { delete: key })
            return M.reply('Message deleted successfully!')
        } catch (error) {
            console.error('Error deleting message:', error)
            return M.reply('Failed to delete message. Make sure I am an admin in this group.')
        }
    }
}
