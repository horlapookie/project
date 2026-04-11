const axios = require('axios')
const { PokemonClient } = require('pokenode-ts')
const { addInventoryQuantity } = require('../../Helpers/pokeballs')

// Randomized "strong Pokemon" pool for sanctum guardians.
// Keep these as PokeAPI names (lowercase, hyphenated).
const strongPool = [
  'tyranitar',
  'metagross',
  'dragonite',
  'garchomp',
  'hydreigon',
  'salamence',
  'goodra',
  'kommo-o',
  'dragapult',
  'baxcalibur',
  'iron-thorns',
  'iron-valiant',
  'roaring-moon',
  'walking-wake',
  'raging-bolt',
  'kingambit',
  'gholdengo',
  'volcarona',
  'togekiss',
  'excadrill',
  'aegislash-shield',
  'mimikyu',
  'greninja',
  'lucario',
  'gengar',
  'scizor',
  'magnezone',
  'gardevoir',
  'gallade',
  'haxorus',
  'chandelure',
  'conkeldurr',
  'snorlax',
  'dragalge',
  'krookodile',
  'weavile',
  'gliscor',
  'hippowdon',
  'rhyperior',
  'mamoswine',
  'milotic',
  'gyarados',
  'charizard',
  'blastoise',
  'venusaur',
  'infernape',
  'empoleon',
  'torterra',
  'alakazam',
  'machamp',
  'lapras',
  'porygon-z',
  'ninetales-alola',
  'zoroark-hisui',
  'samurott-hisui',
  'decidueye-hisui',
  'ursaluna',
  'annihilape',
  'basculegion-male',
  'kleavor',
  'ceruledge',
  'armarouge'
]
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

const buildInfo = (prefix = '-') =>
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
  const now = Date.now()
  const expiresAt = now + 40 * 60 * 1000
  await client.DB.set(key, { spawnedAt: now, expiresAt }).catch(() => null)
  await client.DB.set(`ashen-last-${jid}`, now).catch(() => null)
  return { expiresAt }
}

const sendAnnouncement = async (client, M) => {
  const prefix = client.prefix || '-'
  await markActive(client, M.from)
  // Tag all participants without adding extra "tagall" text.
  const meta = await client.groupMetadata(M.from).catch(() => null)
  const mentions = (meta?.participants || []).map((p) => p?.id).filter(Boolean)
  return client.sendMessage(
    M.from,
    {
      image: { url: `${process.cwd()}/assets/Images/dungeon.jpg` },
      caption: buildInfo(prefix),
      mentions
    },
    { quoted: M }
  )
}

// Dungeon composition:
// - 2 Mega Pokemon
// - 2 Legendary Pokemon
// - 1 very high HP "tank"
// - 1 poison/status style Pokemon
const megaPool = [
  'charizard-mega-x',
  'charizard-mega-y',
  'mewtwo-mega-x',
  'mewtwo-mega-y',
  'gengar-mega',
  'lucario-mega',
  'gardevoir-mega',
  'metagross-mega',
  'salamence-mega',
  'tyranitar-mega',
  'blaziken-mega',
  'kangaskhan-mega',
  'banette-mega',
  'rayquaza-mega'
]
const legendaryPool = [
  'mewtwo',
  'rayquaza',
  'dialga',
  'palkia',
  'giratina-altered',
  'zekrom',
  'reshiram',
  'kyurem',
  'xerneas',
  'yveltal',
  'lugia',
  'ho-oh',
  'groudon',
  'kyogre',
  'necrozma'
]
const tankPool = ['blissey', 'snorlax', 'chansey', 'toxapex', 'corviknight', 'hippowdon']
const poisonPool = ['toxapex', 'amoonguss', 'gliscor', 'crobat', 'tentacruel', 'gengar', 'dragalge', 'roserade']

const pickUnique = (client, pool, count, taken = new Set()) => {
  const available = pool.filter((n) => !taken.has(n))
  const picked = []
  while (picked.length < count && available.length) {
    const idx = client.utils.getRandomInt(0, available.length - 1)
    const choice = available.splice(idx, 1)[0]
    picked.push(choice)
    taken.add(choice)
  }
  return picked
}

const pickDungeonTeam = (client) => {
  const taken = new Set()
  const megas = pickUnique(client, megaPool, 2, taken)
  const legends = pickUnique(client, legendaryPool, 2, taken)
  const tanks = pickUnique(client, tankPool, 1, taken)
  const poisons = pickUnique(client, poisonPool, 1, taken)

  const team = [...megas, ...legends, ...tanks, ...poisons]
  // Fallback: if any pool ran out, fill from strongPool.
  while (team.length < 6) {
    const extra = pickUnique(client, strongPool, 1, taken)[0]
    if (!extra) break
    team.push(extra)
  }
  return team.slice(0, 6)
}

const buildPokemonFromName = async (client, name, level) => {
  const idOrName = String(name).trim().toLowerCase()
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${idOrName}`)
  const data = response.data

  const tier = (await client.utils.getPokemonTier?.(data.name)) || 'normal'
  const exp = client.utils.getExpByLevel(level, tier)
  const image =
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    data.sprites?.other?.dream_world?.front_default ||
    ''

  let { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level)
  const statBoost = tier === 'mythical' ? 1.35 : tier === 'legendary' ? 1.25 : tier === 'mega' ? 1.2 : 1
  hp = Math.floor(hp * statBoost)
  attack = Math.floor(attack * statBoost)
  defense = Math.floor(defense * statBoost)
  speed = Math.floor(speed * statBoost)
  const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(data.name, level)
  const server = new PokemonClient()
  const genders = ['female', 'male']
  // Mega/alt forms often don't exist as `pokemon-species/<form-name>`, but they do have a base species.
  const speciesName =
    data?.species?.name ||
    String(data?.name || '')
      .replace(/-mega(-x|-y)?$/i, '')
      .replace(/-primal$/i, '')
      .trim()
  let gender_rate = 4
  try {
    const species = await server.getPokemonSpeciesByName(speciesName)
    gender_rate = Number(species?.gender_rate ?? 4)
  } catch (_) {
    // If species lookup fails, keep a neutral default.
    gender_rate = 4
  }
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
    tier,
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
  usage: 'Use :ashen enter/status/quit',
  description: 'Ashen Sanctum dungeon (PvE boss rush)',
  async execute(client, arg, M) {
    const prefix = client.prefix || '-'
    const sub = String(arg || '').trim().toLowerCase()

    if (!M.isGroup) return M.reply('Use this in a group.')

    const enabled = ((await client.DB.get('dungeon')) || []).includes(M.from)
    const active = await client.DB.get(`ashen-active-${M.from}`).catch(() => null)
    const isActive = Boolean(active?.expiresAt && Date.now() <= Number(active.expiresAt))

    const nextAppearInMinutes = async () => {
      const now = Date.now()
      const last = Number((await client.DB.get(`ashen-last-${M.from}`).catch(() => null)) || 0)
      if (last) {
        const next = last + 3 * 60 * 60 * 1000
        if (now >= next) return 0
        return Math.max(0, Math.ceil((next - now) / 60000))
      }
      const d = new Date(now)
      const hour = d.getUTCHours()
      const rem = hour % 3
      let add = (3 - rem) % 3
      if (add === 0 && (d.getUTCMinutes() > 0 || d.getUTCSeconds() > 0)) add = 3
      d.setUTCHours(hour + add, 0, 0, 0)
      return Math.max(0, Math.ceil((d.getTime() - now) / 60000))
    }

    // If user just types `ashen`, show status and the available subcommands (no spam announcement).
    if (!sub) {
      if (!enabled) {
        return M.reply(`Ruins is closed for now.\n\nEnable Ashen Sanctum in this group with *${client.prefix}set --dungeon=enable*.\n\nSubcommands: spawn, enter, status, quit`)
      }
      if (isActive) {
        const minsLeft = Math.max(0, Math.ceil((Number(active.expiresAt) - Date.now()) / 60000))
        return M.reply(`Ruins is open now.\nRemaining: *${minsLeft} min*.\n\nSubcommands: spawn, enter, status, quit`)
      }
      const mins = await nextAppearInMinutes()
      return M.reply(`Ruins is closed for now.\nRuins will appear in *${mins} min* for this group.\n\nSubcommands: spawn, enter, status, quit`)
    }

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
      await client.DB.delete(`ashen-active-${M.from}`).catch(() => null)
      await client.DB.set(`ashen-last-${M.from}`, Date.now()).catch(() => null)
      const battle = client.pokemonBattleResponse.get(M.from)
      if (!battle || !battle.isDungeon || battle.player1?.user !== M.sender) {
        await client.sendMessage(M.from, { text: '🔥 Ashen Sanctum has closed.' })
        return null
      }
      if (client.unpersistBattleSync) client.unpersistBattleSync(M.from)
      else client.pokemonBattleResponse.delete(M.from)
      client.pokemonBattlePlayerMap.delete(M.sender)
      await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
      return client.sendMessage(M.from, {
        text: `🔥 Ashen Sanctum has closed. *@${M.sender.split('@')[0]}* abandoned the run.`,
        mentions: [M.sender]
      })
    }

    if (sub !== 'enter') {
      return M.reply(`Invalid usage. Use *${prefix}ashen enter*, *${prefix}ashen status*, or *${prefix}ashen quit*.`)
    }

    if (!enabled) {
      return M.reply(`Dungeon is not enabled in this group. Use *${client.prefix}set --dungeon=enable*.`)
    }

    if (!isActive) {
      const mins = await nextAppearInMinutes()
      return M.reply(`Ruins is closed for now.\nRuins will appear in *${mins} min* for this group.`)
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
    const dungeonTeamNames = pickDungeonTeam(client)
    const dungeonParty = []
    for (const name of dungeonTeamNames) {
      dungeonParty.push(await buildPokemonFromName(client, name, 100))
    }
    await client.poke.set(`${wildUser}_Party`, dungeonParty)

    // Start as a "wild" battle (AI controlled), but no capturing.
    const battleObj = {
      mode: 'wild',
      isDungeon: true,
      dungeonId: 'ashen_sanctum',
      noCapture: true,
      wildUser,
      dungeonClosesAt: active?.expiresAt || (Date.now() + 40 * 60 * 1000),
      wildPokemon: { ...dungeonParty[0] },
      dungeonExpiresAt: active?.expiresAt || (Date.now() + 40 * 60 * 1000),
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
    }
    if (client.persistBattleSync) client.persistBattleSync(M.from, battleObj)
    else client.pokemonBattleResponse.set(M.from, battleObj)
    client.pokemonBattlePlayerMap.set(M.sender, M.from)

    // Send a single gallery image showing the 6 guardians for this run.
    try {
      const gallery = await client.utils.drawDungeonGallery(dungeonParty, { title: 'ASHEN SANCTUM GUARDIANS' })
      await client.sendMessage(M.from, {
        image: gallery,
        caption:
          `🔥 *ASHEN SANCTUM* 🔥\n\n` +
          `Sanctum guardians have been revealed.\n` +
          `Defeat all 6 to clear the dungeon.`
      })
    } catch (_) {
      // ignore gallery errors
    }

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
        `- *${client.prefix}ashen quit* to give up\n\n` +
        `No pokeballs can be used in dungeons.`,
      mentions: [M.sender]
    })

    // Inactivity timeout is enforced centrally (10 minutes) and is persistent across restarts.

    return null
  }
}
