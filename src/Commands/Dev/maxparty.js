const axios = require('axios')

const buildPokemon = async (client, name, level, tagOverride = null) => {
  const idOrName = String(name).trim().toLowerCase()
  const resp = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`)
  const data = resp.data

  const tier = (await client.utils.getPokemonTier?.(data.name)) || 'normal'
  const exp = client.utils.getExpByLevel(level, tier)
  const image =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    ''
  const { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level)
  const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(data.name, level)

  return {
    name: data.name,
    level,
    exp,
    image,
    id: data.id,
    displayExp: 0,
    tier,
    hp,
    attack,
    defense,
    speed,
    maxHp: hp,
    maxDefense: defense,
    maxAttack: attack,
    maxSpeed: speed,
    types: data.types.map((t) => t.type.name),
    moves,
    rejectedMoves,
    state: { status: '', movesUsed: 0 },
    female: false,
    tag: tagOverride || client.utils.generateRandomUniqueTag(10)
  }
}

module.exports = {
  name: 'maxparty',
  aliases: ['maxp', 'maxteam'],
  category: 'dev',
  exp: 0,
  cool: 4,
  react: '⚡',
  usage: 'Use :maxparty (owner only)',
  description: 'Maxes your party for testing (level 100, full HP, refreshed moves).',
  async execute(client, arg, M) {
    if (!client.isOwner(M)) return M.reply('Only the owner can use this command.')

    const target = M.mentions?.[0] || M.quoted?.participant || M.sender
    const level = 100

    const party = (await client.poke.get(`${target}_Party`)) || []
    if (!party.length) return M.reply("That user doesn't have any Pokemon in their party.")
    const updated = []

    for (const p of party) {
      const fresh = await buildPokemon(client, p.name, level, p.tag)
      updated.push(fresh)
    }
    // Keep the party size unchanged (only max what exists).
    const finalParty = updated
    await client.poke.set(`${target}_Party`, finalParty)

    return client.sendMessage(
      M.from,
      {
        text: `✅ Party maxed for *@${target.split('@')[0]}*.\n\nAll Pokemon set to Level 100 with full HP. Party size: ${finalParty.length}`,
        mentions: [target]
      },
      { quoted: M }
    )
  }
}
