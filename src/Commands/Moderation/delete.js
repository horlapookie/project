module.exports = {
    name: 'delete',
    aliases: ['del'],
    category: 'moderation',
    exp: 5,
    cool: 4,
    react: "✅",
    usage: 'Use :delete quoted to the mesaege you want to delete',
    description: 'Deletes the quoted message',
    async execute(client, arg, M) {
    
        if (!M.quoted) return M.reply('Quote the message that you want me to delete, Baka!')
        try {
            const quotedKey = M.quoted?.key || {}
            const quotedId = quotedKey.id || M.quoted?.id
            const participant = quotedKey.participant || M.quoted?.participant
            const key = {
                remoteJid: quotedKey.remoteJid || M.from,
                id: String(quotedId),
                fromMe: Boolean(quotedKey.fromMe || M.quoted?.fromMe),
                ...(participant ? { participant } : {})
            }

            await client.sendMessage(M.from, { delete: key })
            return M.reply('Message deleted successfully!')
        } catch (error) {
            console.error('Error deleting message:', error)
            M.reply('Failed to delete message.')
        }
    }
}
