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
