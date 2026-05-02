const axios = require('axios')
const { PokemonClient } = require('pokenode-ts')
const { addInventoryQuantity } = require('../../Helpers/pokeballs')

// ─── Type → local battlefield background (under assets/Images/ruin/) ─────────
// Primary images (exact type matches)
const TYPE_BACKGROUNDS = {
  poison:   'ruin/poison.jpg',    // toxic pool, mushrooms, flytraps
  flying:   'ruin/flying.jpg',    // floating sky islands, birds
  dragon:   'ruin/dragon.jpg',    // dragons, ruins, magic circle
  psychic:  'ruin/psychic.jpg',   // aurora, crystals, glowing orbs
  ground:   'ruin/ground.jpg',    // desert, cacti, cracked earth
  ice:      'ruin/ice.jpg',       // snow, frozen ponds, aurora
  electric: 'ruin/electric.jpg',  // lightning, storm field
  fairy:    'ruin/fairy.jpg',     // flowers, hearts, cheerful meadow
  water:    'ruin/water.jpg',     // ocean, beach, coral
  fire:     'ruin/fire.jpg',      // volcanoes, lava
  // Thematic fallbacks for uncovered types:
  grass:    'ruin/fairy.jpg',     // lush meadow shares the fairy field
  bug:      'ruin/poison.jpg',    // insect hollow ~ toxic swamp
  rock:     'ruin/ground.jpg',    // stone/desert terrain
  fighting: 'ruin/ground.jpg',    // dusty arena
  dark:     'ruin/dragon.jpg',    // shadowy dragon lair
  ghost:    'ruin/psychic.jpg',   // eerie psychic realm
  steel:    'ruin/dragon.jpg',    // iron fortress ~ dragon ruins
  normal:   'ruin/fairy.jpg',     // plain cheerful meadow
}

// The 10 types that have actual battlefield images
const PRIMARY_FIELD_TYPES = ['poison','flying','dragon','psychic','ground','ice','electric','fairy','water','fire']

// Reverse-map background path → canonical field type
const BACKGROUND_FIELD_TYPE = {
  'ruin/poison.jpg':   'poison',
  'ruin/flying.jpg':   'flying',
  'ruin/dragon.jpg':   'dragon',
  'ruin/psychic.jpg':  'psychic',
  'ruin/ground.jpg':   'ground',
  'ruin/ice.jpg':      'ice',
  'ruin/electric.jpg': 'electric',
  'ruin/fairy.jpg':    'fairy',
  'ruin/water.jpg':    'water',
  'ruin/fire.jpg':     'fire',
}

const getBackgroundForTypes = (types = []) => {
  for (const type of types) {
    if (TYPE_BACKGROUNDS[type]) {
      const bg = TYPE_BACKGROUNDS[type]
      return { background: bg, fieldType: BACKGROUND_FIELD_TYPE[bg] || type }
    }
  }
  // No match → pick a random primary battlefield
  const randomType = PRIMARY_FIELD_TYPES[Math.floor(Math.random() * PRIMARY_FIELD_TYPES.length)]
  const bg = `ruin/${randomType}.jpg`
  return { background: bg, fieldType: randomType }
}

// ─── Scaling & difficulty ─────────────────────────────────────────────────────
const SCALING_PER_ENCOUNTER = 0.15

const getEncounterDifficulty = (encounterIndex, bossAt) => {
  if (encounterIndex >= bossAt) return 'boss'
  if (encounterIndex < 5)  return 'easy'
  if (encounterIndex < 10) return 'normal'
  return 'hard'
}

const DIFF_LABEL = { easy: '🟢 Easy', normal: '🟡 Normal', hard: '🔴 Hard', boss: '⚫ Boss' }

const REWARDS = {
  easy:   { gold: 5000,   balls: 0 },
  normal: { gold: 15000,  balls: 1 },
  hard:   { gold: 40000,  balls: 2 },
  boss:   { gold: 100000, balls: 5 },
}

// ─── Flavor text per Pokémon type ────────────────────────────────────────────
const TYPE_FLAVOR = {
  ice:      'The air grows cold as you pass through the *Ice Valley*…',
  fire:     'A wave of scorching heat washes over you in the *Lava Grounds*…',
  electric: 'Thunder crackles overhead in the *Storm Field*…',
  grass:    'Ancient vines twist around you in the *Overgrown Ruins*…',
  water:    'The floor floods as you wade into the *Sunken Depths*…',
  psychic:  'Reality bends around you in the *Psychic Labyrinth*…',
  dragon:   "The ground trembles beneath massive wingbeats in the *Dragon's Lair*…",
  dark:     'Darkness swallows your torch in the *Shadow Abyss*…',
  ground:   'Dust rises around you as you cross the *Crumbled Badlands*…',
  poison:   'A toxic mist rolls through the *Toxic Swamp*…',
  flying:   'Gale-force winds greet you at the *Skyward Peaks*…',
  rock:     'Boulder-lined halls lead you through the *Stone Cavern*…',
  ghost:    'An eerie silence falls in the *Haunted Hall*…',
  steel:    'Metallic corridors echo your footsteps in the *Iron Fortress*…',
  fighting: 'The arena floor is scarred with battle marks in the *Combat Dojo*…',
  bug:      'Swarms fill the air in the *Insect Hollow*…',
  fairy:    'A shimmering light fills the *Fairy Glade*…',
  normal:   'You step deeper into the *Ancient Ruin*…',
}
const getTypeFlavor = (types = []) => {
  for (const t of types) { if (TYPE_FLAVOR[t]) return TYPE_FLAVOR[t] }
  return 'You step deeper into the *Ancient Ruin*…'
}

// ─── Pokémon pools ────────────────────────────────────────────────────────────
const BOSS_POOL = [
  'mewtwo','rayquaza','dialga','palkia','giratina-altered',
  'zekrom','reshiram','yveltal','xerneas','ho-oh','lugia',
  'groudon','kyogre','necrozma','zacian','zamazenta','eternatus',
  'kyurem','lunala','solgaleo','calyrex-shadow','calyrex-ice',
]

const pickEncounterName = (encounterIndex, bossAt) => {
  if (encounterIndex >= bossAt) {
    return { name: BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)], isBoss: true }
  }
  return { name: String(Math.floor(Math.random() * 898) + 1), isBoss: false }
}

// ─── Build a Pokémon object for ruin ─────────────────────────────────────────
const buildPokemonForRuin = async (client, nameOrId, level, encounterIndex) => {
  const scaleMult = 1 + encounterIndex * SCALING_PER_ENCOUNTER
  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
  const data = response.data

  const tier  = (await client.utils.getPokemonTier?.(data.name)) || 'normal'
  const exp   = client.utils.getExpByLevel(level, tier)
  const image = data.sprites?.other?.['official-artwork']?.front_default
    || data.sprites?.front_default || ''

  let { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level)

  hp      = Math.floor(hp      * scaleMult)
  attack  = Math.floor(attack  * scaleMult)
  defense = Math.floor(defense * scaleMult)
  speed   = Math.floor(speed   * scaleMult)

  const { moves, rejectedMoves } = await client.utils.assignPokemonMoves(data.name, level)

  const server = new PokemonClient()
  const speciesName = data?.species?.name
    || String(data?.name || '').replace(/-mega(-x|-y)?$/i, '').replace(/-primal$/i, '').trim()
  let gender_rate = 4
  try {
    const species = await server.getPokemonSpeciesByName(speciesName)
    gender_rate = Number(species?.gender_rate ?? 4)
  } catch (_) { gender_rate = 4 }
  const female = gender_rate >= 8 ? true : gender_rate > 0 ? Math.random() < 0.5 : false

  return {
    name: data.name, level, exp, image, id: data.id, displayExp: 0, tier,
    hp, attack, defense, speed,
    maxHp: hp, maxDefense: defense, maxAttack: attack, maxSpeed: speed,
    types: data.types.map(t => t.type.name),
    moves, rejectedMoves,
    state: { status: '', movesUsed: 0 },
    female,
    tag: client.utils.generateRandomUniqueTag(10)
  }
}

// ─── Wild-user tag for ruin battles ──────────────────────────────────────────
const ruinWildUser = (jid) => `ruin-${String(jid).replace(/[^a-zA-Z0-9]/g, '')}@pokemon`

// ─── Exported helper (called by battle.js after an encounter is won) ──────────
const handleRuinEncounterComplete = async (client, M, battle, currentUser) => {
  try {
    const sessionKey = battle.ruinSessionKey
    const session    = await client.DB.get(sessionKey).catch(() => null)
    if (!session) {
      // Session gone — just clean up the battle silently
      await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
      if (client.unpersistBattleSync) client.unpersistBattleSync(M.from)
      else client.pokemonBattleResponse.delete(M.from)
      client.pokemonBattlePlayerMap.delete(currentUser.user)
      return null
    }

    const encounterIndex = Number(battle.ruinEncounterIndex || 0)
    const bossAt         = Number(battle.ruinBossAt || 12)
    const difficulty     = getEncounterDifficulty(encounterIndex, bossAt)
    const { gold, balls } = REWARDS[difficulty] || REWARDS.normal
    const prefix         = client.prefix || '-'

    // ── Give encounter rewards ────────────────────────────────────────────
    try {
      const econ = await client.getEcon(currentUser.user, { createIfMissing: true })
      if (econ) { econ.gem = (econ.gem || 0) + gold; await econ.save() }
    } catch (_) {}

    if (balls > 0) {
      try {
        const wk = client.getUserNumber(currentUser.user) || currentUser.user.split('@')[0]
        await addInventoryQuantity(client, wk, 'ultra_ball', balls)
      } catch (_) {}
    }

    // ── Update session ────────────────────────────────────────────────────
    session.encounterIndex    = encounterIndex + 1
    session.totalGoldEarned   = (session.totalGoldEarned  || 0) + gold
    session.totalBallsEarned  = (session.totalBallsEarned || 0) + balls
    session.defeatedNames     = [...(session.defeatedNames || []),
      client.utils.capitalize(battle.wildPokemon?.name || '')]
    await client.DB.set(sessionKey, session).catch(() => null)

    // ── Cleanup battle ────────────────────────────────────────────────────
    await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
    if (client.unpersistBattleSync) client.unpersistBattleSync(M.from)
    else client.pokemonBattleResponse.delete(M.from)
    client.pokemonBattlePlayerMap.delete(currentUser.user)

    const isBoss      = encounterIndex >= bossAt
    const nextScaling = session.encounterIndex * 15

    // ── Boss cleared → end ruin with big rewards ──────────────────────────
    if (isBoss) {
      const bonusGold  = 500000
      const bonusBalls = 10
      try {
        const econ = await client.getEcon(currentUser.user, { createIfMissing: true })
        if (econ) { econ.gem = (econ.gem || 0) + bonusGold; await econ.save() }
        const wk = client.getUserNumber(currentUser.user) || currentUser.user.split('@')[0]
        await addInventoryQuantity(client, wk, 'master_ball', bonusBalls)
      } catch (_) {}

      session.totalGoldEarned  += bonusGold
      session.totalBallsEarned += bonusBalls

      await client.DB.delete(sessionKey).catch(() => null)
      await client.DB.delete(`ruin-active-${M.from}`).catch(() => null)

      const clrKey   = `ruin-clears-${currentUser.user}`
      const prevClrs = Number((await client.DB.get(clrKey).catch(() => null)) || 0)
      await client.DB.set(clrKey, prevClrs + 1).catch(() => null)

      return client.sendMessage(M.from, {
        text:
          `🏚️🎉 *RUIN CLEARED!* 🎉🏚️\n\n` +
          `*@${currentUser.user.split('@')[0]}* defeated the Boss and emerged victorious!\n\n` +
          `📊 *Final Stats:*\n` +
          `⚔️ Encounters cleared: *${session.encounterIndex}*\n\n` +
          `🏆 *Total Rewards:*\n` +
          `💰 *${session.totalGoldEarned.toLocaleString()}* gems\n` +
          `🎯 *${session.totalBallsEarned}* Pokéballs\n\n` +
          `🌟 Total Ruin Clears: *${prevClrs + 1}*`,
        mentions: [currentUser.user]
      })
    }

    // ── Regular encounter cleared → prompt next ───────────────────────────
    return client.sendMessage(M.from, {
      text:
        `🏚️ *Encounter #${encounterIndex + 1} Defeated!*\n\n` +
        `🎉 *@${currentUser.user.split('@')[0]}* won!\n\n` +
        `🎁 *Rewards:*\n` +
        `💰 *+${gold.toLocaleString()}* gems\n` +
        (balls > 0 ? `🎯 *+${balls}* Ultra Ball${balls !== 1 ? 's' : ''}\n` : '') +
        `\n📈 Next encounter stat scaling: *+${nextScaling}%*\n\n` +
        `• *${prefix}ruin fight* — face the next encounter\n` +
        `• *${prefix}ruin quit* — leave with your rewards`,
      mentions: [currentUser.user]
    })
  } catch (err) {
    console.error('handleRuinEncounterComplete error:', err)
  }
}

module.exports = {
  name: 'ruin',
  aliases: ['ruins'],
  exp: 5,
  cool: 4,
  react: '🏚️',
  category: 'dungeon',
  usage: 'Use {prefix}ruin <summon|enter|fight|status|quit>',
  description: 'Enter a mysterious Ruin for endless scaled Pokémon battles',

  // Export helpers for battle.js to call back
  handleRuinEncounterComplete,
  getEncounterDifficulty,

  async execute(client, arg, M) {
    const prefix = client.prefix || '-'
    if (!M.isGroup) return M.reply('Use this in a group.')

    const sub        = String(arg || '').trim().toLowerCase()
    const sessionKey = `ruin-session-${M.from}`

    const getSession   = () => client.DB.get(sessionKey).catch(() => null)
    const setSession   = (s) => client.DB.set(sessionKey, s).catch(() => null)
    const clearSession = async () => {
      await client.DB.delete(sessionKey).catch(() => null)
      await client.DB.delete(`ruin-active-${M.from}`).catch(() => null)
    }

    // ── SUMMON ───────────────────────────────────────────────────────────────
    if (sub === 'summon') {
      const existing = await getSession()
      if (existing?.active) {
        return M.reply('🏚️ A Ruin is already active here. Use *ruin enter* to enter or *ruin quit* to close it.')
      }

      const econ = await client.getEcon(M, { createIfMissing: false })
      const COST = 400000
      if (!econ || (econ.gem || 0) < COST) {
        return M.reply(
          `🏚️ *Ruin Summon — Insufficient Funds*\n\n` +
          `Cost: *400,000 💎 gems*\n` +
          `You have: *${((econ?.gem) || 0).toLocaleString()} 💎*`
        )
      }

      econ.gem = (econ.gem || 0) - COST
      await econ.save().catch(() => null)

      const bossAt  = Math.floor(Math.random() * 13) + 12  // 12–24
      const session = {
        summoner: M.sender, summonedAt: Date.now(),
        active: true, entered: false, entrant: null,
        encounterIndex: 0, bossAt,
        totalGoldEarned: 0, totalBallsEarned: 0,
        defeatedNames: []
      }
      await setSession(session)

      const meta     = await client.groupMetadata(M.from).catch(() => null)
      const mentions = (meta?.participants || []).map(p => p?.id).filter(Boolean)

      return client.sendMessage(M.from, {
        image: { url: `${process.cwd()}/assets/Images/dungeon.jpg` },
        caption:
          `🏚️ *A RUIN HAS APPEARED!* 🏚️\n\n` +
          `*@${M.sender.split('@')[0]}* discovered an ancient Ruin.\n\n` +
          `⚔️ *Endless battles with scaling difficulty!*\n` +
          `Each enemy is *+15% stronger* than the last.\n` +
          `A *Boss Pokémon* lurks after *${bossAt}* encounters.\n\n` +
          `🎁 *Rewards per victory:*\n` +
          `  🟢 Easy → 5,000 gems\n` +
          `  🟡 Normal → 15,000 gems + 1 Ultra Ball\n` +
          `  🔴 Hard → 40,000 gems + 2 Ultra Balls\n` +
          `  ⚫ Boss → 100,000 gems + 5 Ultra Balls + *500k bonus!*\n\n` +
          `📌 *Commands:*\n` +
          `• *${prefix}ruin enter* — enter with your full party\n` +
          `• *${prefix}ruin fight* — start the next encounter\n` +
          `• *${prefix}ruin status* — view progress\n` +
          `• *${prefix}ruin quit* — abandon the Ruin`,
        mentions
      }, { quoted: M })
    }

    // ── ENTER ────────────────────────────────────────────────────────────────
    if (sub === 'enter') {
      const session = await getSession()
      if (!session?.active) return M.reply(`🏚️ No Ruin active here.\nSummon one with *${prefix}ruin summon* (400,000 💎).`)
      if (session.entered && session.entrant && session.entrant !== M.sender) {
        return M.reply(`🏚️ *@${(session.entrant || '').split('@')[0]}* is already inside. Only one challenger at a time.`)
      }
      if (client.pokemonBattleResponse.has(M.from)) return M.reply('A battle is already in progress here.')
      if (client.pokemonBattlePlayerMap.has(M.sender)) return M.reply('You are already in another battle.')

      const party = (await client.poke.get(`${M.sender}_Party`)) || []
      if (party.length < 6) {
        return M.reply(
          `⚠️ *Entry Denied*\n\nYou need *6 Pokémon* in your party.\n` +
          `You have *${party.length}/6*.`
        )
      }
      const alive = party.filter(p => p.hp > 0)
      if (!alive.length) return M.reply('❌ All your Pokémon have fainted! Heal them first.')

      session.entered = true
      session.entrant = M.sender
      await setSession(session)

      return M.reply(
        `🏚️ *You step into the Ruin…*\n\n` +
        `The ancient walls close behind you.\n` +
        `Your party braces for what lies ahead.\n\n` +
        `Use *${prefix}ruin fight* to face the first encounter!`
      )
    }

    // ── FIGHT ────────────────────────────────────────────────────────────────
    if (sub === 'fight') {
      const session = await getSession()
      if (!session?.active)   return M.reply(`🏚️ No active Ruin here. Use *${prefix}ruin summon*.`)
      if (!session.entered)   return M.reply(`Use *${prefix}ruin enter* first.`)
      if (session.entrant && session.entrant !== M.sender)
        return M.reply(`Only *@${(session.entrant || '').split('@')[0]}* can fight here.`)
      if (client.pokemonBattleResponse.has(M.from))
        return M.reply(`A battle is in progress. Use *${prefix}battle fight* to attack!`)
      if (client.pokemonBattlePlayerMap.has(M.sender))
        return M.reply('You are already in another battle.')

      const party = (await client.poke.get(`${M.sender}_Party`)) || []
      const alive  = party.filter(p => p.hp > 0)
      if (!alive.length) {
        await clearSession()
        return M.reply(
          `💀 *All your Pokémon fainted!* You were expelled from the Ruin.\n\n` +
          `Encounters defeated: *${session.encounterIndex || 0}*\n` +
          `Gems earned: *${(session.totalGoldEarned || 0).toLocaleString()}*\n` +
          `Pokéballs earned: *${session.totalBallsEarned || 0}*`
        )
      }

      const encounterIndex = session.encounterIndex || 0
      const bossAt         = session.bossAt || 12
      const { name: encounterName, isBoss } = pickEncounterName(encounterIndex, bossAt)
      const difficulty     = getEncounterDifficulty(encounterIndex, bossAt)
      const baseLevel      = isBoss ? 100 : Math.min(100, 20 + encounterIndex * 4)

      await M.reply(
        `🏚️ *Encounter #${encounterIndex + 1}*  ${DIFF_LABEL[difficulty]}\n` +
        (isBoss ? `⚫ ⚠️ *BOSS INCOMING…* ⚠️\n` : '') +
        `Summoning the next Pokémon…`
      )

      let wildPoke
      try {
        wildPoke = await buildPokemonForRuin(client, encounterName, baseLevel, encounterIndex)
        if (isBoss) {
          // Boss: additional ×3 multiplier
          const B = 3.0
          wildPoke.hp      = Math.floor(wildPoke.hp      * B); wildPoke.maxHp      = wildPoke.hp
          wildPoke.attack  = Math.floor(wildPoke.attack  * B); wildPoke.maxAttack  = wildPoke.attack
          wildPoke.defense = Math.floor(wildPoke.defense * B); wildPoke.maxDefense = wildPoke.defense
          wildPoke.speed   = Math.floor(wildPoke.speed   * B); wildPoke.maxSpeed   = wildPoke.speed
        }
      } catch (err) {
        console.error('ruin fight build error:', err)
        return M.reply('⚠️ Failed to summon the encounter Pokémon. Try again.')
      }

      const wildUser  = ruinWildUser(M.from)
      await client.poke.set(`${wildUser}_Party`, [wildPoke])

      const { background, fieldType } = getBackgroundForTypes(wildPoke.types)
      const flavor                    = getTypeFlavor(wildPoke.types)

      // ── Field-type penalty: player's active Pokémon pays -5% ATK/DEF/SPD
      //    if it shares no type with the battlefield ──────────────────────────
      const activePoke   = alive[0]
      const playerTypes  = (activePoke.types || []).map(t => t.toLowerCase())
      const fieldMatches = playerTypes.includes(fieldType)
      let penaltyLine    = ''

      if (!fieldMatches) {
        const penaltyPct = 5
        const applyPenalty = stat => Math.max(1, Math.floor(stat * (1 - penaltyPct / 100)))
        activePoke.attack  = applyPenalty(activePoke.attack)
        activePoke.defense = applyPenalty(activePoke.defense)
        activePoke.speed   = activePoke.speed != null ? applyPenalty(activePoke.speed) : activePoke.speed

        // Persist the penalty back to the party so battle reads the reduced stats
        alive[0] = activePoke
        await client.poke.set(`${M.sender}_Party`, party.map(p =>
          p.name === activePoke.name && p.hp === activePoke.hp ? activePoke : p
        ))

        penaltyLine =
          `\n⚠️ *Field Penalty!* Your *${client.utils.capitalize(activePoke.name)}* ` +
          `is not a *${client.utils.capitalize(fieldType)}*-type — its ATK/DEF/SPD are reduced by *5%* on this battlefield!\n`
      } else {
        const bonusPct = 5
        const applyBonus = stat => Math.floor(stat * (1 + bonusPct / 100))
        activePoke.attack  = applyBonus(activePoke.attack)
        activePoke.defense = applyBonus(activePoke.defense)
        activePoke.speed   = activePoke.speed != null ? applyBonus(activePoke.speed) : activePoke.speed

        // Persist the bonus back to the party
        alive[0] = activePoke
        await client.poke.set(`${M.sender}_Party`, party.map(p =>
          p.name === activePoke.name && p.hp === activePoke.hp ? activePoke : p
        ))

        penaltyLine =
          `\n✨ *Field Boost!* Your *${client.utils.capitalize(activePoke.name)}* ` +
          `is a *${client.utils.capitalize(fieldType)}*-type — its ATK/DEF/SPD are boosted by *5%* on this battlefield!\n`
      }

      const battleObj = {
        mode: 'wild',
        isDungeon: true,
        isRuin: true,
        noCapture: true,
        background,
        fieldType,
        wildUser,
        ruinUser: M.sender,
        ruinEncounterIndex: encounterIndex,
        ruinBossAt: bossAt,
        ruinSessionKey: sessionKey,
        expiresAt: Date.now() + 10 * 60 * 1000,
        lastActivityAt: Date.now(),
        wildPokemon: { ...wildPoke },
        player1: { user: M.sender, ready: false, move: '', activePokemon: activePoke },
        player2: { user: wildUser,  ready: true,  move: '', activePokemon: wildPoke },
        turn: 'player1',
        players: [M.sender]
      }

      if (client.persistBattleSync) client.persistBattleSync(M.from, battleObj)
      else client.pokemonBattleResponse.set(M.from, battleObj)
      client.pokemonBattlePlayerMap.set(M.sender, M.from)

      let image
      try {
        image = await client.utils.drawPokemonBattle({
          player1: { activePokemon: activePoke, party: alive },
          player2: { activePokemon: wildPoke,   party: [wildPoke] },
          background
        })
      } catch (err) {
        console.error('ruin drawPokemonBattle error:', err)
      }

      const scalingPct = (encounterIndex * 15)
      const fieldLabel  = client.utils.capitalize(fieldType)
      const caption =
        `🏚️ *RUIN — Encounter #${encounterIndex + 1}*  ${DIFF_LABEL[difficulty]}\n\n` +
        flavor + '\n\n' +
        (isBoss ? `⚫ *A mighty BOSS appears!*\n` : `A wild Pokémon blocks your path!\n`) +
        `*${client.utils.capitalize(wildPoke.name)}*\n` +
        `🔥 Type: ${wildPoke.types.map(t => client.utils.capitalize(t)).join(' / ')}\n` +
        `🌍 *Field:* ${fieldLabel} terrain\n` +
        `📊 Lv. ${wildPoke.level} | ❤️ HP: ${wildPoke.hp} | ⚡ ATK: ${wildPoke.attack} | 🛡 DEF: ${wildPoke.defense}\n` +
        `📈 Stat scaling: *+${scalingPct}%* from base\n` +
        penaltyLine +
        `\n• *${prefix}battle fight* — attack\n` +
        `• *${prefix}battle switch* — switch Pokémon\n` +
        `• *${prefix}ruin quit* — abandon the Ruin`

      if (image) {
        return client.sendMessage(M.from, { image, caption, mentions: [M.sender] }, { quoted: M })
      }
      return client.sendMessage(M.from, { text: caption, mentions: [M.sender] }, { quoted: M })
    }

    // ── STATUS ───────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const session = await getSession()
      if (!session?.active) return M.reply(`🏚️ No active Ruin here. Summon one with *${prefix}ruin summon*.`)
      const battle   = client.pokemonBattleResponse.get(M.from)
      const inBattle = Boolean(battle?.isRuin)
      return M.reply(
        `🏚️ *RUIN STATUS*\n\n` +
        `👤 Challenger: @${(session.entrant || session.summoner || '?').split('@')[0]}\n` +
        `⚔️ Encounters defeated: *${session.encounterIndex || 0}*\n` +
        `👹 Boss after: *${session.bossAt}* encounters\n` +
        `📈 Current scaling: *+${(session.encounterIndex || 0) * 15}%*\n` +
        `💰 Gems earned: *${(session.totalGoldEarned || 0).toLocaleString()}*\n` +
        `🎯 Pokéballs earned: *${session.totalBallsEarned || 0}*\n\n` +
        (inBattle
          ? `⚔️ Battle in progress → *${prefix}battle fight* to attack`
          : session.entered
          ? `📌 → *${prefix}ruin fight* for the next encounter`
          : `📌 → *${prefix}ruin enter* to begin`)
      )
    }

    // ── LEADERBOARD ──────────────────────────────────────────────────────────
    if (sub === 'leaderboard' || sub === 'lb') {
      const players    = (await client.DB.get('ruin-players').catch(() => null)) || []
      if (!players.length) return M.reply('No ruin clears recorded yet.')
      const entries = []
      for (const p of players.slice(0, 10)) {
        const clears = Number((await client.DB.get(`ruin-clears-${p}`).catch(() => null)) || 0)
        if (clears > 0) entries.push({ p, clears })
      }
      entries.sort((a, b) => b.clears - a.clears)
      const lines = entries.slice(0, 10).map((e, i) =>
        `${i + 1}. @${e.p.split('@')[0]} — *${e.clears}* clear${e.clears !== 1 ? 's' : ''}`
      )
      return client.sendMessage(M.from, {
        text: `🏚️ *RUIN LEADERBOARD*\n\n${lines.join('\n')}`,
        mentions: entries.map(e => e.p)
      })
    }

    // ── QUIT ─────────────────────────────────────────────────────────────────
    if (sub === 'quit') {
      const session = await getSession()
      if (!session) return M.reply('🏚️ No active Ruin to quit.')

      const battle = client.pokemonBattleResponse.get(M.from)
      if (battle?.isRuin) {
        if (client.unpersistBattleSync) client.unpersistBattleSync(M.from)
        else client.pokemonBattleResponse.delete(M.from)
        client.pokemonBattlePlayerMap.delete(M.sender)
        await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
      }

      await clearSession()
      return client.sendMessage(M.from, {
        text:
          `🏚️ *RUIN ABANDONED*\n\n` +
          `*@${M.sender.split('@')[0]}* left the Ruin after *${session.encounterIndex || 0}* encounter${(session.encounterIndex || 0) !== 1 ? 's' : ''}.\n\n` +
          `💰 Gems earned: *${(session.totalGoldEarned || 0).toLocaleString()}*\n` +
          `🎯 Pokéballs earned: *${session.totalBallsEarned || 0}*`,
        mentions: [M.sender]
      })
    }

    // ── DEFAULT HELP ─────────────────────────────────────────────────────────
    return M.reply(
      `🏚️ *RUINS*\n\n` +
      `Mysterious ancient ruins filled with endless Pokémon battles.\n` +
      `Each enemy is *15% stronger* than the last.\n\n` +
      `📌 *Commands:*\n` +
      `• *${prefix}ruin summon* — open a Ruin (costs 400,000 💎)\n` +
      `• *${prefix}ruin enter* — enter with your party (requires 6 Pokémon)\n` +
      `• *${prefix}ruin fight* — face the next encounter\n` +
      `• *${prefix}ruin status* — view progress\n` +
      `• *${prefix}ruin quit* — leave with your rewards\n` +
      `• *${prefix}ruin leaderboard* — top ruin clearers\n\n` +
      `👹 A *Boss* awaits after 12–24 encounters!`
    )
  }
}
