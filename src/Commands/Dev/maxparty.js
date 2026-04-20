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

  let moves = []
  let rejectedMoves = []
  try {
    const moveResult = await client.utils.assignPokemonMoves(data.name, level)
    moves = moveResult.moves || []
    rejectedMoves = moveResult.rejectedMoves || []
  } catch (_) {
    moves = []
    rejectedMoves = []
  }

  const maxPpMoves = moves.map((m) => ({ ...m, pp: m.maxPp || m.pp }))

  return {
    name: data.name,
    level,
    exp,
    image,
    id: data.id,
    displayExp: exp,
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
    moves: maxPpMoves,
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
  description: 'Maxes your party for testing (level 100, full HP, refreshed moves, full PP).',
  async execute(client, arg, M) {
    if (!client.isOwner(M)) return M.reply('Only the owner can use this command.')

    const target = M.mentions?.[0] || M.quoted?.participant || M.sender
    const level = 100

    const party = (await client.poke.get(`${target}_Party`)) || []
    if (!party.length) return M.reply("That user doesn't have any Pokemon in their party.")

    const updated = []
    const failed = []

    for (const p of party) {
      try {
        const fresh = await buildPokemon(client, p.name, level, p.tag)
        updated.push(fresh)
      } catch (err) {
        console.error(`maxparty: failed to rebuild ${p.name}:`, err?.message || err)
        const healed = {
          ...p,
          level,
          hp: p.maxHp || p.hp,
          attack: p.maxAttack || p.attack,
          defense: p.maxDefense || p.defense,
          speed: p.maxSpeed || p.speed,
          state: { status: '', movesUsed: 0 },
          moves: (p.moves || []).map((m) => ({ ...m, pp: m.maxPp || m.pp }))
        }
        updated.push(healed)
        failed.push(p.name)
      }
    }

    await client.poke.set(`${target}_Party`, updated)

    const failNote = failed.length ? `\n⚠️ Could not fully refresh: ${failed.join(', ')} (healed & PP restored instead).` : ''

    return client.sendMessage(
      M.from,
      {
        text:
          `✅ Party maxed for *@${target.split('@')[0]}*.\n\n` +
          `All Pokemon set to Level 100 with full HP, full PP, and refreshed moves.\n` +
          `Party size: ${updated.length}` +
          failNote,
        mentions: [target]
      },
      { quoted: M }
    )
  }
}
