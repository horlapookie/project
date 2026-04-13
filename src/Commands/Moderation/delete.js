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
            const participant = M.quoted?.participant || quotedKey.participant
            const key = {
                remoteJid: M.from,
                id: String(quotedId),
                fromMe: Boolean(M.quoted?.fromMe || quotedKey.fromMe),
                ...(participant ? { participant } : {})
            }

            await client.deleteMessage(M.from, key, participant)
            return M.reply('Message deleted successfully!')
        } catch (error) {
            console.error('Error deleting message:', error)
            M.reply('Failed to delete message.')
        }
    }
}
