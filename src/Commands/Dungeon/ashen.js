const axios = require('axios')
const { PokemonClient } = require('pokenode-ts')
const { addInventoryQuantity } = require('../../Helpers/pokeballs')

const guardians = ['tyranitar', 'metagross', 'dragonite', 'garchomp', 'hydreigon', 'salamence']
const specialRewards = [
  'deoxys-attack',
  'deoxys-speed',
  'deoxys-defense',
  'groudon-primal',
  'kyogre-primal',
  'necrozma-dusk',
  'necrozma-dawn',
  'necrozma-ultra'
]

const buildInfo = (prefix = '#') =>
  [
    '🔥 *ASHEN SANCTUM* 🔥',
    '',
    '⚠️ *An extremely dangerous dungeon has appeared!*',
    'Set your party and use *enter* if you wish to enter.',
    'Only one trainer can enter at a time in this group.',
    '',
    'A high-risk 6v6 boss-rush dungeon where trainers enter with a full party of 6 Pokemon and battle against 6 maxed-out sanctum guardians.',
    '',
    '⚔️ *Mechanics:*',
    '- Enter with a full party of 6 Pokemon',
    '- Battles work like normal battles',
    '- No pokeballs here (you cannot catch guardians)',
    '- Defeat all 6 guardians to clear the sanctum',
    '',
    '🎁 *Rewards:*',
    '- 500,000 Gems',
    '- 10 Master Balls',
    '- Huge XP reward',
    '- Chance for special-form Pokemon',
    '',
    '📌 *Commands:*',
    `- ${prefix}ashen spawn (owner only)`,
    `- ${prefix}ashen enter`,
    `- ${prefix}ashen status`,
    `- ${prefix}ashen quit`
  ].join('\n')

const markActive = async (client, jid) => {
  const key = `ashen-active-${jid}`
  const expiresAt = Date.now() + 3 * 60 * 60 * 1000
  await client.DB.set(key, { spawnedAt: Date.now(), expiresAt }).catch(() => null)
  return { expiresAt }
}

const sendAnnouncement = async (client, M) => {
  const prefix = client.altPrefix || '#'
  await markActive(client, M.from)
  return client.sendMessage(
    M.from,
    {
      image: { url: `${process.cwd()}/assets/Images/dungeon.jpg` },
      caption: buildInfo(prefix)
    },
    { quoted: M }
  )
}

const buildPokemonFromName = async (client, name, level) => {
  const idOrName = String(name).trim().toLowerCase()
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`)
  const data = response.data

  const exp = client.utils.getExpByLevel(level)
  const image =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    data.sprites?.other?.dream_world?.front_default ||
    ''

  const { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level)
  const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(data.name, level)
  const server = new PokemonClient()
  const genders = ['female', 'male']
  const { gender_rate } = await server.getPokemonSpeciesByName(data.name)
  let female = false
  if (gender_rate >= 8) female = true
  if (gender_rate < 8 && gender_rate > 0) {
    female = genders[Math.floor(Math.random() * genders.length)] === 'female'
  }

  return {
    name: data.name,
    level,
    exp,
    image,
    id: data.id,
    displayExp: 0,
    hp,
    attack,
    defense,
    speed,
    maxHp: hp,
    maxDefense: defense,
    maxAttack: attack,
    maxSpeed: speed,
    types: data.types.map((type) => type.type.name),
    moves,
    rejectedMoves,
    state: { status: '', movesUsed: 0 },
    female,
    tag: client.utils.generateRandomUniqueTag(10)
  }
}

module.exports = {
  name: 'ashen',
  aliases: ['ashensanctum'],
  category: 'dungeon',
  exp: 5,
  cool: 4,
  react: '🔥',
  usage: 'Use #ashen enter/status/quit',
  description: 'Ashen Sanctum dungeon (PvE boss rush)',
  async execute(client, arg, M) {
    const prefix = client.altPrefix || '#'
    const sub = String(arg || '').trim().toLowerCase()

    if (!M.isGroup) return M.reply('Use this in a group.')

    if (!sub) return sendAnnouncement(client, M)

    if (sub === 'spawn' || sub === 'appear' || sub === 'announce') {
      if (!client.isOwner(M)) return M.reply('Only the owner can force a dungeon announcement.')
      return sendAnnouncement(client, M)
    }

    if (sub === 'status') {
      const battle = client.pokemonBattleResponse.get(M.from)
      if (!battle || !battle.isDungeon || battle.player1?.user !== M.sender) {
        return M.reply(`You are not in an Ashen Sanctum run. Use *${prefix}ashen enter*.`)
      }
      const party2 = (await client.poke.get(`${battle.wildUser}_Party`)) || []
      const remaining = party2.filter((p) => p.hp > 0).length
      const total = party2.length || 6
      return M.reply(`🔥 Ashen Sanctum status: guardians remaining *${remaining}/${total}*.`)
    }

    if (sub === 'quit') {
      const battle = client.pokemonBattleResponse.get(M.from)
      if (!battle || !battle.isDungeon || battle.player1?.user !== M.sender) {
        return M.reply(`You are not in an Ashen Sanctum run.`)
      }
      client.pokemonBattleResponse.delete(M.from)
      client.pokemonBattlePlayerMap.delete(M.sender)
      await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
      return client.sendMessage(M.from, {
        text: `*@${M.sender.split('@')[0]}* abandoned the Ashen Sanctum run.`,
        mentions: [M.sender]
      })
    }

    if (sub !== 'enter') {
      return M.reply(`Invalid usage. Use *${prefix}ashen enter*, *${prefix}ashen status*, or *${prefix}ashen quit*.`)
    }

    const enabled = ((await client.DB.get('dungeon')) || []).includes(M.from)
    if (!enabled) {
      return M.reply(`Dungeon is not enabled in this group. Use *${client.prefix}set --dungeon=enable*.`)
    }

    const active = await client.DB.get(`ashen-active-${M.from}`).catch(() => null)
    if (!active || !active.expiresAt || Date.now() > Number(active.expiresAt)) {
      return M.reply(`No active Ashen Sanctum right now. Wait for it to appear, or the owner can use *${prefix}ashen spawn*.`)
    }

    if (client.pokemonBattleResponse.has(M.from)) {
      return M.reply('A Pokemon battle is already happening in this chat.')
    }
    if (client.pokemonBattlePlayerMap.has(M.sender)) {
      return M.reply('You are already in another Pokemon battle right now.')
    }

    const party = (await client.poke.get(`${M.sender}_Party`)) || []
    if (party.length < 6) {
      return M.reply('You must have a full party of 6 Pokemon to enter Ashen Sanctum.')
    }
    const alive = party.filter((p) => p.hp > 0)
    if (!alive.length) {
      return M.reply("You don't have any Pokemon capable of battling right now.")
    }

    const wildUser = `dungeon-${M.from.replace(/[^a-zA-Z0-9]/g, '')}@pokemon`
    const dungeonParty = []
    for (const name of guardians) {
      dungeonParty.push(await buildPokemonFromName(client, name, 100))
    }
    await client.poke.set(`${wildUser}_Party`, dungeonParty)

    // Start as a "wild" battle (AI controlled), but no capturing.
    client.pokemonBattleResponse.set(M.from, {
      mode: 'wild',
      isDungeon: true,
      dungeonId: 'ashen_sanctum',
      noCapture: true,
      wildUser,
      wildPokemon: { ...dungeonParty[0] },
      expiresAt: Date.now() + 5 * 60 * 1000,
      expiryToken: `${Date.now()}-${Math.random()}`,
      player1: {
        user: M.sender,
        ready: false,
        move: '',
        activePokemon: alive[0]
      },
      player2: {
        user: wildUser,
        ready: true,
        move: '',
        activePokemon: dungeonParty[0]
      },
      turn: 'player1',
      players: [M.sender]
    })
    client.pokemonBattlePlayerMap.set(M.sender, M.from)

    const image = await client.utils.drawPokemonBattle({
      player1: { activePokemon: alive[0], party: alive },
      player2: { activePokemon: dungeonParty[0], party: dungeonParty }
    })

    await client.sendMessage(M.from, {
      image,
      caption:
        `🔥 *ASHEN SANCTUM* 🔥\n\n` +
        `*@${M.sender.split('@')[0]}* entered the sanctum.\n\n` +
        `Guardian 1/6: *${client.utils.capitalize(dungeonParty[0].name)}* (Lv. ${dungeonParty[0].level})\n\n` +
        `Use one of the options below:\n\n` +
        `- *${client.prefix}battle fight* to attack\n` +
        `- *${client.prefix}battle switch* to switch Pokemon\n` +
        `- *${client.prefix}battle forfeit* to give up\n\n` +
        `No pokeballs can be used in dungeons.`,
      mentions: [M.sender]
    })

    // Inactivity timer (5 minutes), rescheduled on moves.
    const scheduleExpiry = () => {
      const battle = client.pokemonBattleResponse.get(M.from)
      if (!battle || !battle.isDungeon || battle.player1?.user !== M.sender) return
      const token = battle.expiryToken
      const waitMs = Math.max(1000, (battle.expiresAt || 0) - Date.now())
      setTimeout(async () => {
        const b = client.pokemonBattleResponse.get(M.from)
        if (!b || !b.isDungeon || b.expiryToken !== token) return
        if (Date.now() <= (b.expiresAt || 0)) return scheduleExpiry()

        client.pokemonBattleResponse.delete(M.from)
        client.pokemonBattlePlayerMap.delete(M.sender)
        await client.poke.delete(`${wildUser}_Party`).catch(() => null)
        await client.sendMessage(M.from, { text: '🔥 Ashen Sanctum ended because you took too long to make a move.' })
      }, waitMs)
    }
    scheduleExpiry()

    return null
  }
}
