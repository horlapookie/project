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

const DIFFICULTY_MULTIPLIERS = { easy: 0.9, normal: 1.3, hard: 1.5, boss: 1.75 }
const DIFFICULTY_REWARD_SCALE = { easy: 0.5, normal: 1, hard: 2, boss: 4 }

const todayStr = () => new Date().toISOString().slice(0, 10)

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
    `- ${prefix}ashen spawn (owner / officer only — 1/day)`,
    `- ${prefix}ashen spawn --challenge=easy|normal|hard|boss`,
    `- ${prefix}ashen enter`,
    `- ${prefix}ashen status`,
    `- ${prefix}ashen quit`
  ].join('\n')

const markActive = async (client, jid, ownerSpawned = false) => {
  const key = `ashen-active-${jid}`
  const now = Date.now()
  const expiresAt = now + 60 * 60 * 1000  // 1 hour
  await client.DB.set(key, { spawnedAt: now, expiresAt, ownerSpawned }).catch(() => null)
  await client.DB.set(`ashen-last-${jid}`, now).catch(() => null)
  return { expiresAt }
}

const sendAnnouncement = async (client, M, ownerSpawned = false) => {
  const prefix = client.prefix || '-'
  await markActive(client, M.from, ownerSpawned)
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
  usage: 'Use {prefix}ashen <subcommand>\n\nSubcommands:\n  spawn — force-spawn the dungeon (owner: unlimited | officer: 1/day)\n  spawn --challenge=easy|normal|hard|boss — spawn a tuned challenge run\n  enter — enter the open Ashen Sanctum\n  status — check dungeon status & active battle\n  quit — abandon your current run',
  description: 'Ashen Sanctum dungeon (PvE boss rush)',
  async execute(client, arg, M) {
    const prefix = client.prefix || '-'
    const sub = String(arg || '').trim().toLowerCase()

    if (!M.isGroup) return M.reply('Use this in a group.')

    const enabled = ((await client.DB.get('dungeon')) || []).includes(M.from)
    const active = await client.DB.get(`ashen-active-${M.from}`).catch(() => null)
    const isActive = Boolean(active?.expiresAt && Date.now() <= Number(active.expiresAt))

    const MAX_AUTO_SPAWNS = 3
    const getAutoSpawnCount = async () => {
      const today = todayStr()
      const key = `ashen-auto-count-${today}-${M.from}`
      return (await client.DB.get(key).catch(() => null)) || 0
    }

    const nextAppearInMinutes = async () => {
      const spawnCount = await getAutoSpawnCount()
      if (spawnCount < MAX_AUTO_SPAWNS) return 0 // more spawns available today
      // All 3 used — next reset at midnight UTC
      const now = Date.now()
      const next = new Date()
      next.setUTCHours(0, 0, 0, 0)
      next.setUTCDate(next.getUTCDate() + 1)
      return Math.max(0, Math.ceil((next.getTime() - now) / 60000))
    }

    // If user just types `ashen`, show status and the available subcommands (no spam announcement).
    if (!sub) {
      const enableNote = enabled ? '' : `\n\n⚠️ Ashen Sanctum is *not enabled* here. Use *${prefix}set --dungeon=enable* to enable it.`
      return M.reply(
        `🔥 *ASHEN SANCTUM*\n\n` +
        `Available subcommands:\n` +
        `• *${prefix}ashen spawn* — force-spawn (owner: unlimited | officer: 1/day)\n` +
        `• *${prefix}ashen spawn --challenge=easy|normal|hard|boss* — spawn a challenge run\n` +
        `• *${prefix}ashen enter* — enter the open sanctum\n` +
        `• *${prefix}ashen status* — check current dungeon status\n` +
        `• *${prefix}ashen quit* — abandon your active run` +
        enableNote
      )
    }

    if (sub.startsWith('spawn') || sub.startsWith('appear') || sub.startsWith('announce')) {
      const isOwnerSpawning = client.isOwner(M)
      const isOfficerSpawning = client.isOfficer(M)

      if (!isOwnerSpawning && !isOfficerSpawning) {
        return M.reply('Only the owner or officers can force-spawn the Ashen Sanctum.')
      }

      const fullArg = String(arg || '').trim().toLowerCase()
      const isChallenge = /--ch(allenge)?(=|\b)/.test(fullArg)
      const today = todayStr()
      const senderNum = M.sender.split('@')[0]
      const dayKey = isChallenge ? `ashen-ch-day-${M.from}` : `ashen-day-${M.from}`
      const officerDayKey = `ashen-officer-${today}-${M.from}-${senderNum}`

      // Officers: dungeon must be enabled + 1 force spawn per day per officer
      if (!isOwnerSpawning) {
        if (!enabled) {
          return M.reply(`🔥 Ashen Sanctum is not enabled in this group. Enable it first with *${prefix}set --dungeon=enable*.`)
        }
        const alreadyUsed = await client.DB.get(officerDayKey).catch(() => null)
        if (alreadyUsed) {
          return M.reply('🔥 You have already used your daily force spawn. Officers can spawn once per day. Try again tomorrow.')
        }
      }
      // Owner: no daily limit, no enabled-check needed — they can spawn anywhere, any time.

      if (isActive) {
        return M.reply('🔥 An Ashen Sanctum is already open in this group.')
      }

      if (isChallenge) {
        const m = fullArg.match(/--ch(?:allenge)?=([a-z]+)/)
        if (!m) {
          return M.reply(
            `Pick a difficulty for this challenge:\n\n` +
            `- *${prefix}ashen spawn --ch=easy* — guardians weakened by 10%\n` +
            `- *${prefix}ashen spawn --ch=normal* — guardians +30%\n` +
            `- *${prefix}ashen spawn --ch=hard* — guardians +50%\n` +
            `- *${prefix}ashen spawn --ch=boss* — guardians +75%\n\n` +
            `Rewards scale with difficulty. (Challenge can only be spawned once per day.)`
          )
        }
        const diff = m[1]
        const mult = DIFFICULTY_MULTIPLIERS[diff]
        if (!mult) {
          return M.reply('Invalid difficulty. Use *easy*, *normal*, *hard*, or *boss*.')
        }

        await M.reply(`🔥 Forging the *${diff.toUpperCase()}* Ashen Challenge guardians... this may take a moment.`)

        // Build the team and apply difficulty multiplier to every stat.
        const teamNames = pickDungeonTeam(client)
        const teamPokemons = []
        for (const name of teamNames) {
          try {
            teamPokemons.push(await buildPokemonFromName(client, name, 100))
          } catch (e) {
            // skip on failure but try to keep going
          }
        }
        if (teamPokemons.length < 6) {
          return M.reply('Failed to forge the challenge guardians (PokeAPI error). Try again.')
        }

        const diffPctText =
          diff === 'easy' ? '-10%' : `+${Math.round((mult - 1) * 100)}%`

        let detail =
          `🔥 *ASHEN CHALLENGE — ${diff.toUpperCase()}* 🔥\n\n` +
          `⚔️ Difficulty modifier: *${diffPctText}* on every guardian stat.\n\n`

        teamPokemons.forEach((p, i) => {
          const oldHp = p.hp
          const oldAtk = p.attack
          const oldDef = p.defense
          const oldSpd = p.speed

          p.hp = Math.floor(oldHp * mult); p.maxHp = p.hp
          p.attack = Math.floor(oldAtk * mult); p.maxAttack = p.attack
          p.defense = Math.floor(oldDef * mult); p.maxDefense = p.defense
          p.speed = Math.floor(oldSpd * mult); p.maxSpeed = p.speed

          detail +=
            `*Guardian ${i + 1}/6 — ${client.utils.capitalize(p.name)}* (Lv. ${p.level})\n` +
            `  HP: ${oldHp} ➡️ ${p.hp}\n` +
            `  Attack: ${oldAtk} ➡️ ${p.attack}\n` +
            `  Defense: ${oldDef} ➡️ ${p.defense}\n` +
            `  Speed: ${oldSpd} ➡️ ${p.speed}\n\n`
        })

        const scale = DIFFICULTY_REWARD_SCALE[diff] || 1
        const rewardGems = Math.round(500000 * scale)
        const rewardBalls = Math.round(10 * scale)
        const rewardXp = Math.round(5000000 * scale)

        detail +=
          `🎁 *Clear rewards:*\n` +
          `- ${rewardGems.toLocaleString()} gems\n` +
          `- ${rewardBalls} master balls\n` +
          `- ${rewardXp.toLocaleString()} XP for the active Pokemon\n` +
          `- Bonus: chance for a special-form Pokemon\n\n` +
          `📌 Use *${prefix}ashen enter* to challenge them!`

        await client.DB
          .set(`ashen-prebuilt-${M.from}`, {
            team: teamPokemons,
            difficulty: diff,
            multiplier: mult,
            createdAt: Date.now()
          })
          .catch(() => null)
        if (!isOwnerSpawning) {
          await client.DB.set(dayKey, today).catch(() => null)
          await client.DB.set(officerDayKey, true).catch(() => null)
        }
        await markActive(client, M.from, isOwnerSpawning)

        const meta = await client.groupMetadata(M.from).catch(() => null)
        const mentions = (meta?.participants || []).map((p) => p?.id).filter(Boolean)
        return client.sendMessage(
          M.from,
          {
            image: { url: `${process.cwd()}/assets/Images/dungeon.jpg` },
            caption: detail,
            mentions
          },
          { quoted: M }
        )
      }

      // Normal spawn
      if (!isOwnerSpawning) {
        await client.DB.set(dayKey, today).catch(() => null)
        await client.DB.set(officerDayKey, true).catch(() => null)
      }
      return sendAnnouncement(client, M, isOwnerSpawning)
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

    if (!enabled && !active?.ownerSpawned) {
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

    // If a challenge was pre-spawned, use that team; otherwise build a fresh random team.
    const prebuilt = await client.DB.get(`ashen-prebuilt-${M.from}`).catch(() => null)
    let dungeonParty
    let dungeonDifficulty = null
    if (prebuilt && Array.isArray(prebuilt.team) && prebuilt.team.length === 6) {
      dungeonParty = prebuilt.team.map((p) => ({
        ...p,
        hp: p.maxHp ?? p.hp,
        tag: client.utils.generateRandomUniqueTag(10),
        state: { status: '', movesUsed: 0 }
      }))
      dungeonDifficulty = prebuilt.difficulty || null
      await client.DB.delete(`ashen-prebuilt-${M.from}`).catch(() => null)
    } else {
      const dungeonTeamNames = pickDungeonTeam(client)
      dungeonParty = []
      for (const name of dungeonTeamNames) {
        dungeonParty.push(await buildPokemonFromName(client, name, 100))
      }
    }
    await client.poke.set(`${wildUser}_Party`, dungeonParty)

    // Start as a "wild" battle (AI controlled), but no capturing.
    const battleObj = {
      mode: 'wild',
      isDungeon: true,
      dungeonId: 'ashen_sanctum',
      dungeonDifficulty,
      noCapture: true,
      wildUser,
      dungeonClosesAt: active?.expiresAt || (Date.now() + 60 * 60 * 1000),
      wildPokemon: { ...dungeonParty[0] },
      dungeonExpiresAt: active?.expiresAt || (Date.now() + 60 * 60 * 1000),
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
