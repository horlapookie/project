const yuget = require('./yuget')

module.exports = {
  name: 'yuclaim',
  aliases: [],
  exp: 0,
  cool: 4,
  react: '✅',
  category: 'yu-gi-oh-cards',
  usage: 'Use :yuclaim',
  description: 'Claim the currently spawned Yu-Gi-Oh card',
  async execute(client, arg, M) {
    return yuget.execute(client, arg, M)
  }
}

