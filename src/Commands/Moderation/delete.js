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
            // Use the full quoted key when available so Baileys can delete reliably in groups.
            const quotedKey = M.quoted?.key || null
            const quotedParticipant = M.quoted?.participant || quotedKey?.participant || null
            if (quotedKey && quotedParticipant && !quotedKey.participant) {
                quotedKey.participant = quotedParticipant
            }
            await client.deleteMessage(M.from, quotedKey || M.quoted.id, quotedParticipant)
            M.reply('Message deleted successfully!')
        } catch (error) {
            console.error('Error deleting message:', error)
            M.reply('Failed to delete message.')
        }
    }
}
