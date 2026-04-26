module.exports = {
  name: 'bot',
  aliases: ['Bot'],
  category: 'general',
  exp: 0,
  cool: 5,
  react: '🤖',
  usage: 'Use {prefix}bot',
  description: 'Shows bot identity',
  async execute(client, arg, M) {
    const brand = client.brand || `${client.name || 'Eternal'} ᵇʸ ᵛᵉⁿ ᵈᵒᵐᵃⁱⁿ`
    return client.sendMessage(
      M.from,
      {
        image: { url: `${process.cwd()}/assets/Images/help.jpeg` },
        caption: `Hello @${M.sender.split('@')[0]}, I am ${brand}`,
        mentions: [M.sender]
      },
      { quoted: M }
    )
  }
}

