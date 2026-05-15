const axios = require('axios')
const { PokemonClient, MoveClient } = require('pokenode-ts')
const { addInventoryQuantity } = require('../../Helpers/pokeballs')
const { isMegaOrGmax, applyMegaGmaxBoost } = require('../../Helpers/megaBoost')

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

const BOSS_AT_RANGES = {
  easy:   [18, 24],
  normal: [12, 18],
  hard:   [8, 14],
  boss:   [6, 10]
}

const CHALLENGE_LABEL = {
  easy:   'Easy Ruin',
  normal: 'Normal Ruin',
  hard:   'Hard Ruin',
  boss:   'Boss Rush Ruin'
}

// ─── Ruin tier progression (clears unlock harder tiers endlessly) ─────────────
// Base tiers 0–3, then boss rush tiers 4+ get progressively harder each clear
const BASE_RUIN_TIERS = [
  { name: 'easy',   difficulty: 'easy',   label: '🟢 Easy Ruin',     waveRange: [18, 24], statMult: 1.0, rewards: { gem: 5000,    ball: 0 } },
  { name: 'normal', difficulty: 'normal', label: '🟡 Normal Ruin',   waveRange: [12, 18], statMult: 1.2, rewards: { gem: 15000,   ball: 1 } },
  { name: 'hard',   difficulty: 'hard',   label: '🔴 Hard Ruin',     waveRange: [8,  14], statMult: 1.5, rewards: { gem: 40000,   ball: 2 } },
  { name: 'boss',   difficulty: 'boss',   label: '⚫ Boss Rush I',   waveRange: [6,  10], statMult: 2.0, rewards: { gem: 100000,  ball: 5 } }
]

const BOSS_RUSH_LABELS = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const getRuinTierInfo = (tierIndex) => {
  if (tierIndex < BASE_RUIN_TIERS.length) return { ...BASE_RUIN_TIERS[tierIndex], tierIndex }
  const extra     = tierIndex - (BASE_RUIN_TIERS.length - 1)   // 1, 2, 3, …
  const waveMin   = Math.max(3, 6 - Math.floor(extra / 2))
  const waveMax   = Math.max(5, 10 - Math.floor(extra / 2))
  const statMult  = 2.0 + extra * 0.5
  const gemReward = Math.floor(100000 * (1 + extra * 0.5))
  const label     = `🔥 Boss Rush ${BOSS_RUSH_LABELS[extra - 1] || `+${extra}`}`
  return {
    name: `boss-rush-${extra + 1}`,
    difficulty: 'boss',
    label,
    waveRange: [waveMin, waveMax],
    statMult,
    rewards: { gem: gemReward, ball: 5 + extra },
    tierIndex
  }
}

const getUserRuinTier = async (client, userJid) => {
  const t = await client.DB.get(`ruin-tier-${userJid}`).catch(() => null)
  return Math.max(0, Number(t || 0))
}

const incrementUserRuinTier = async (client, userJid) => {
  const current = await getUserRuinTier(client, userJid)
  const next = current + 1
  await client.DB.set(`ruin-tier-${userJid}`, next).catch(() => null)
  return next
}

const randomBossAt = (waveRange = [12, 18]) => {
  const [min, max] = waveRange
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const parseRuinSummonOptions = (rawArg = '', userTierIndex = 0) => {
  const tokens = String(rawArg || '').trim().toLowerCase().split(/\s+/).slice(1)
  // Default: use the user's progression tier
  const tierInfo = getRuinTierInfo(userTierIndex)
  const result   = { difficulty: tierInfo.difficulty, tierInfo, manualOverride: false }

  for (const token of tokens) {
    let override = null
    if (token.startsWith('--challenge=')) override = token.split('=')[1]
    if (BOSS_AT_RANGES[token])             override = token
    if (override && BOSS_AT_RANGES[override]) {
      // Find the tier that matches this difficulty (use the first match)
      const matchingTierIdx = BASE_RUIN_TIERS.findIndex(t => t.difficulty === override)
      result.difficulty     = override
      result.tierInfo       = matchingTierIdx >= 0
        ? { ...BASE_RUIN_TIERS[matchingTierIdx], tierIndex: matchingTierIdx }
        : getRuinTierInfo(userTierIndex)
      result.manualOverride = true
    }
  }

  return result
}

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

// 60% of non-boss encounters pull from this pool
// These are NORMAL forms - they will auto-evolve to Mega/GMax in battle if applicable
const MEGA_GMAX_POOL = [
  'charizard', 'mewtwo', 'gengar', 'lucario', 'gardevoir',
  'metagross', 'salamence', 'tyranitar', 'blaziken', 'kangaskhan',
  'banette', 'rayquaza', 'absol', 'alakazam', 'ampharos',
  'aerodactyl', 'beedrill', 'blastoise', 'gallade', 'garchomp',
  'gyarados', 'heracross', 'houndoom', 'latias', 'latios',
  'lopunny', 'manectric', 'mawile', 'medicham', 'pidgeot',
  'pinsir', 'sableye', 'scizor', 'sharpedo', 'slowbro',
  'steelix', 'swampert', 'venusaur', 'pikachu', 'machamp',
  'lapras', 'snorlax', 'grimmsnarl', 'drednaw', 'kingler',
  'coalossal', 'centiskorch', 'hatterene', 'alcremie', 'inteleon',
  'rillaboom', 'cinderace', 'urshifu', 'orbeetle', 'copperajah',
  'duraludon', 'toxtricity', 'bolthound', 'flapple', 'appletun',
  'sandaconda', 'silicobra'
]

const pickEncounterName = (encounterIndex, bossAt) => {
  if (encounterIndex >= bossAt) {
    return { name: BOSS_POOL[Math.floor(Math.random() * BOSS_POOL.length)], isBoss: true }
  }
  // 60% chance of mega/gmax encounter
  if (Math.random() < 0.6) {
    const name = MEGA_GMAX_POOL[Math.floor(Math.random() * MEGA_GMAX_POOL.length)]
    return { name, isBoss: false }
  }
  return { name: String(Math.floor(Math.random() * 898) + 1), isBoss: false }
}

// ─── Strong-move selector for ruin encounters ─────────────────────────────────
// Prioritises moves with power ≥ 90 and accuracy ≥ 90 (null accuracy = always hits).
const assignRuinMoves = async (pokemonName, level = 100) => {
  const mc = new MoveClient()

  const baseName = String(pokemonName)
    .replace(/-(gmax|gigantamax|mega(-x|-y)?|primal|galar|alola|hisui|paldea|origin|crowned|eternamax|ultra)$/i, '')
    .trim() || pokemonName

  const fetchRaw = async (name) => {
    try {
      return (await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`)).data?.moves || []
    } catch (_) { return [] }
  }

  const filterLevelUp = (moves, maxLv) =>
    moves.filter(m =>
      (m.version_group_details || []).some(d =>
        d.move_learn_method?.name === 'level-up' && (d.level_learned_at ?? 999) <= maxLv
      )
    )

  let raw = await fetchRaw(pokemonName)
  let levelUp = filterLevelUp(raw, level)
  if (!levelUp.length) { raw = await fetchRaw(baseName); levelUp = filterLevelUp(raw, level) }
  if (!levelUp.length) levelUp = raw.filter(m =>
    (m.version_group_details || []).some(d => d.move_learn_method?.name === 'level-up')
  )
  if (!levelUp.length) levelUp = raw.slice(0, 30)

  // Shuffle and cap candidates to avoid too many API calls
  const candidates = [...levelUp].sort(() => Math.random() - 0.5).slice(0, 30)

  const fetched = []
  for (const { move } of candidates) {
    if (fetched.length >= 20) break
    try {
      const d = await mc.getMoveByName(move.name)
      fetched.push({
        name: d.name,
        accuracy:    d.accuracy || 0,
        pp:          d.pp || 5,
        maxPp:       d.pp || 5,
        id:          d.id,
        power:       d.power || 0,
        priority:    d.priority,
        type:        d.type.name,
        stat_change: (d.stat_changes || []).map(c => ({ target: c.stat.name, change: c.change })),
        effect:      d.meta?.ailment?.name || '',
        drain:       d.meta?.drain || 0,
        healing:     d.meta?.healing || 0,
        description: (d.flavor_text_entries?.filter(x => x.language.name === 'en')[0] || {}).flavor_text || '',
        _rawAcc:     d.accuracy  // null = always hits
      })
    } catch (_) {}
  }

  const isStrong  = m => m.power >= 90 && (m._rawAcc === null || m._rawAcc >= 90)
  const isMedium  = m => m.power >= 70 && (m._rawAcc === null || m._rawAcc >= 85)

  const pick = (pool, needed, exclude = []) =>
    pool.filter(m => !exclude.find(e => e.id === m.id))
        .sort(() => Math.random() - 0.5)
        .slice(0, needed)

  let chosen = pick(fetched.filter(isStrong), 4)
  if (chosen.length < 4) chosen = [...chosen, ...pick(fetched.filter(isMedium), 4 - chosen.length, chosen)]
  if (chosen.length < 4) chosen = [...chosen, ...pick(fetched, 4 - chosen.length, chosen)]

  const result = chosen.map(({ _rawAcc, ...m }) => m)
  return {
    moves: result,
    rejectedMoves: fetched.filter(m => !result.find(r => r.id === m.id)).map(m => m.name)
  }
}

// ─── Build a Pokémon object for ruin (always Lv 100, always ×3 stats) ─────────
const buildPokemonForRuin = async (client, nameOrId, encounterIndex, extraStatMult = 1) => {
  const level     = 100
  const scaleMult = 1 + encounterIndex * SCALING_PER_ENCOUNTER

  const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`)
  const data = response.data

  const tier  = (await client.utils.getPokemonTier?.(data.name)) || 'normal'
  const exp   = client.utils.getExpByLevel(level, tier)
  const image = data.sprites?.other?.['official-artwork']?.front_default
    || data.sprites?.front_default || ''

  let { hp, attack, defense, speed } = await client.utils.getPokemonStats(data.id, level)

  // Scale by encounter depth, then ×3 base + tier multiplier (harder tiers = stronger Pokémon)
  const RUIN_MULT = 3 * extraStatMult
  hp      = Math.floor(hp      * scaleMult * RUIN_MULT)
  attack  = Math.floor(attack  * scaleMult * RUIN_MULT)
  defense = Math.floor(defense * scaleMult * RUIN_MULT)
  speed   = Math.floor(speed   * scaleMult * RUIN_MULT)

  // Mega/gmax get an additional ×3 on top (global rule)
  if (isMegaOrGmax(data.name)) {
    hp      *= 3; attack  *= 3; defense *= 3; speed *= 3
  }

  // Cap eternatus forms — their defense is impossibly high otherwise
  if (/eternatus/i.test(data.name)) {
    defense = Math.min(defense, 1000)
    if (/eternal/i.test(data.name)) {
      // eternamax form: also cap HP and attack to reasonable levels
      hp     = Math.min(hp,     12000)
      attack = Math.min(attack,  5000)
    }
  }

  const { moves, rejectedMoves } = await assignRuinMoves(data.name, level)

  const server = new PokemonClient()
  const speciesName = data?.species?.name
    || String(data?.name || '').replace(/-mega(-x|-y)?$/i, '').replace(/-(gmax|gigantamax|primal)$/i, '').trim()
  let gender_rate = 4
  try {
    const species = await server.getPokemonSpeciesByName(speciesName)
    gender_rate = Number(species?.gender_rate ?? 4)
  } catch (_) { gender_rate = 4 }
  const female = gender_rate >= 8 ? true : gender_rate > 0 ? Math.random() < 0.5 : false

  // Ensure dungeon spawns are base forms only
  const baseName = String(data.name || '')
    .replace(/-mega(-x|-y)?$/i, '')
    .replace(/-(gmax|gigantamax|primal)$/i, '')
    .trim()

  return {
    name: baseName, level, exp, image, id: data.id, displayExp: 0, tier,
    hp, attack, defense, speed,
    maxHp: hp, maxDefense: defense, maxAttack: attack, maxSpeed: speed,
    types: data.types.map(t => t.type.name),
    moves, rejectedMoves,
    state: { status: '', movesUsed: 0, dynamaxActive: false, dynamaxTurns: 0, baseHp: hp, baseMoves: [] },
    female,
    megaBoosted: isMegaOrGmax(data.name) ? true : undefined,
    tag: client.utils.generateRandomUniqueTag(10)
  }
}

// ─── Wild-user tag for ruin battles ──────────────────────────────────────────
const ruinWildUser = (jid) => `ruin-${String(jid).replace(/[^a-zA-Z0-9]/g, '')}@pokemon`

// ─── Exported helper (called by battle.js after an encounter is won) ──────────
const handleRuinEncounterComplete = async (client, M, battle, currentUser) => {
  // ── Step 1: Clean up the battle FIRST so the state is never stuck ─────
  await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
  if (client.unpersistBattleSync) client.unpersistBattleSync(M.from)
  else client.pokemonBattleResponse.delete(M.from)
  client.pokemonBattlePlayerMap.delete(currentUser.user)

  try {
    const sessionKey = battle.ruinSessionKey
    const session    = await client.DB.get(sessionKey).catch(() => null)
    if (!session) {
      // Session gone (already cleaned or timed out) — battle was already cleaned above
      return null
    }

    const encounterIndex = Number(battle.ruinEncounterIndex || 0)
    const bossAt         = Number(battle.ruinBossAt || session.bossAt || 12)
    const isBoss         = encounterIndex >= bossAt
    const difficulty     = getEncounterDifficulty(encounterIndex, bossAt)
    const prefix         = client.prefix || '-'

    // ── Check if user has premium ruin bonus ─────────────────────────────
    let premiumMult = 1
    try {
      const { hasPremiumRuin } = require('../../Helpers/premium')
      const userKey = client.getUserNumber(currentUser.user) || currentUser.user.split('@')[0]
      if (await hasPremiumRuin(client, userKey)) premiumMult = 1.25
    } catch (_) {}

    const baseRewards  = REWARDS[difficulty] || REWARDS.normal
    const gold         = Math.floor(baseRewards.gold * premiumMult)
    const balls        = baseRewards.balls

    // ── Step 2: Update session encounterIndex BEFORE rewards ─────────────
    const newEncounterIndex = encounterIndex + 1
    session.encounterIndex    = newEncounterIndex
    session.totalGoldEarned   = (session.totalGoldEarned  || 0) + gold
    session.totalBallsEarned  = (session.totalBallsEarned || 0) + balls
    session.defeatedNames     = [...(session.defeatedNames || []),
      client.utils.capitalize(battle.wildPokemon?.name || '')]

    if (!isBoss) {
      // Save the updated session so the next ruin fight uses the correct encounterIndex
      try {
        await client.DB.set(sessionKey, session)
      } catch (saveErr) {
        console.error('ruin session save error:', saveErr)
        // Retry once
        await client.DB.set(sessionKey, session).catch(() => null)
      }
    }

    // ── Step 3: Give encounter rewards ───────────────────────────────────
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

    const nextScaling = newEncounterIndex * 15

    // ── Boss cleared → end ruin with big rewards ──────────────────────────
    if (isBoss) {
      const bonusGold  = Math.floor(500000 * premiumMult)
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

      // ── Increment user's ruin tier (progression unlock) ───────────────────
      const currentTierIdx = Number(battle.ruinTierIndex ?? session.ruinTierIndex ?? 0)
      const newTierIndex   = await incrementUserRuinTier(client, currentUser.user).catch(() => currentTierIdx + 1)
      const unlockedTier   = getRuinTierInfo(newTierIndex)

      const premiumNote = premiumMult > 1 ? `\n👑 *Premium Bonus* applied — +25% rewards!` : ''
      return client.sendMessage(M.from, {
        text:
          `🏚️🎉 *RUIN CLEARED!* 🎉🏚️\n\n` +
          `*@${currentUser.user.split('@')[0]}* defeated the Boss and emerged victorious!\n\n` +
          `📊 *Final Stats:*\n` +
          `⚔️ Encounters cleared: *${newEncounterIndex}*\n\n` +
          `🏆 *Total Rewards:*\n` +
          `💰 *${session.totalGoldEarned.toLocaleString()}* gems\n` +
          `🎯 *${session.totalBallsEarned}* Pokéballs` +
          premiumNote +
          `\n\n🌟 Total Ruin Clears: *${prevClrs + 1}*\n\n` +
          `🔓 *NEW DIFFICULTY UNLOCKED!*\n` +
          `${unlockedTier.label} is now available!\n` +
          `_(Stat boost: ×${unlockedTier.statMult.toFixed(1)} | Boss at: ${unlockedTier.waveRange[0]}–${unlockedTier.waveRange[1]} encounters)_\n\n` +
          `Use *${client.prefix || '-'}ruin summon* to face your next challenge!`,
        mentions: [currentUser.user]
      })
    }

    // ── Regular encounter cleared → prompt next ───────────────────────────
    const premiumNote = premiumMult > 1 ? `\n👑 *Premium Ruin* — rewards boosted by 25%!` : ''
    return client.sendMessage(M.from, {
      text:
        `🏚️ *Encounter #${encounterIndex + 1} Defeated!*\n\n` +
        `🎉 *@${currentUser.user.split('@')[0]}* won!\n\n` +
        `🎁 *Rewards:*\n` +
        `💰 *+${gold.toLocaleString()}* gems\n` +
        (balls > 0 ? `🎯 *+${balls}* Ultra Ball${balls !== 1 ? 's' : ''}\n` : '') +
        premiumNote +
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
    if (sub.startsWith('summon')) {
      const existing = await getSession()
      if (existing?.active) {
        return M.reply('🏚️ A Ruin is already active here. Use *ruin enter* to enter or *ruin quit* to close it.')
      }

      // Read the summoner's progression tier for auto-difficulty
      const userTierIndex = await getUserRuinTier(client, M.sender)
      const { tierInfo, manualOverride } = parseRuinSummonOptions(sub, userTierIndex)
      const nextTierInfo  = getRuinTierInfo(userTierIndex + 1)

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

      const bossAt  = randomBossAt(tierInfo.waveRange)
      const session = {
        summoner: M.sender, summonedAt: Date.now(),
        active: true, entered: false, entrant: null,
        encounterIndex: 0, bossAt,
        ruinDifficulty: tierInfo.difficulty,
        ruinTierIndex:  tierInfo.tierIndex,
        ruinStatMult:   tierInfo.statMult,
        totalGoldEarned: 0, totalBallsEarned: 0,
        defeatedNames: []
      }
      await setSession(session)

      const meta     = await client.groupMetadata(M.from).catch(() => null)
      const mentions = (meta?.participants || []).map(p => p?.id).filter(Boolean)

      const tierEmojis = ['🟢','🟡','🔴','⚫','🔥','🔥','🔥','🔥','🔥','🔥']
      const tierEmoji  = tierEmojis[Math.min(tierInfo.tierIndex, tierEmojis.length - 1)]
      const gemReward  = tierInfo.rewards?.gem ?? 5000
      const ballReward = tierInfo.rewards?.ball ?? 0

      const progressNote = manualOverride
        ? `_(manual difficulty selected)_`
        : userTierIndex === 0
          ? `_(Your first Ruin — clear it to unlock Normal!)_`
          : `_(Tier ${userTierIndex + 1} — cleared ${userTierIndex} Ruin${userTierIndex !== 1 ? 's' : ''} so far!)_`

      return client.sendMessage(M.from, {
        image: { url: `${process.cwd()}/assets/Images/dungeon.jpg` },
        caption:
          `🏚️ *A RUIN HAS APPEARED!* 🏚️\n\n` +
          `*@${M.sender.split('@')[0]}* discovered an ancient Ruin.\n\n` +
          `${tierEmoji} *${tierInfo.label} activated!*\n` +
          progressNote + `\n` +
          `Each enemy is *+15% stronger* than the last.\n` +
          (tierInfo.statMult > 1 ? `⚡ *Tier stat boost: ×${tierInfo.statMult.toFixed(1)}*\n` : '') +
          `A *Boss Pokémon* lurks after *${bossAt}* encounters.\n\n` +
          `🎁 *Rewards per encounter:*\n` +
          `  💰 ${gemReward.toLocaleString()} gems` +
          (ballReward > 0 ? ` + ${ballReward} Ultra Ball${ballReward > 1 ? 's' : ''}` : '') + `\n` +
          `  🏆 Boss Bonus: *500,000 gems + 10 Master Balls*\n\n` +
          `🔓 *Clear this Ruin to unlock:* ${nextTierInfo.label}\n\n` +
          `📌 *Commands:*\n` +
          `• *${prefix}ruin enter* — enter with your full party\n` +
          `• *${prefix}ruin fight* — start the next encounter\n` +
          `• *${prefix}ruin status* — view progress\n` +
          `• *${prefix}ruin quit* — abandon the Ruin\n\n` +
          `💡 Override: *${prefix}ruin summon --challenge=easy|normal|hard|boss*`,
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
      // All party members must be level 100
      const underLevel = party.filter(p => (p.level || 0) < 100)
      if (underLevel.length) {
        const names = underLevel.map(p => `*${client.utils.capitalize(p.name)}* (Lv. ${p.level})`).join(', ')
        return M.reply(
          `⚠️ *Entry Denied — Max Level Required*\n\n` +
          `All 6 party Pokémon must be *Level 100* to enter the Ruin.\n\n` +
          `Under-levelled: ${names}`
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

      await M.reply(
        `🏚️ *Encounter #${encounterIndex + 1}*  ${DIFF_LABEL[difficulty]}\n` +
        (isBoss ? `⚫ ⚠️ *BOSS INCOMING…* ⚠️\n` : '') +
        `Summoning the next Pokémon… *(this may take a moment)*`
      )

      let wildPoke
      try {
        const statMult = Number(session.ruinStatMult || 1)
        wildPoke = await buildPokemonForRuin(client, encounterName, encounterIndex, statMult)
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
        `� Ruin mode: ${CHALLENGE_LABEL[session.ruinDifficulty] || CHALLENGE_LABEL.normal}\n` +
        `�🌍 *Field:* ${fieldLabel} terrain\n` +
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

    // ── PARTY ────────────────────────────────────────────────────────────────
    if (sub === 'party') {
      const session = await getSession()
      if (!session?.active) return M.reply(`🏚️ No active Ruin here. Summon one with *${prefix}ruin summon*.`)
      if (!session.entered)  return M.reply(`Use *${prefix}ruin enter* first to join the Ruin.`)
      if (session.entrant && session.entrant !== M.sender)
        return M.reply(`Only *@${(session.entrant || '').split('@')[0]}* can check the party here.`)

      const party = (await client.poke.get(`${M.sender}_Party`)) || []
      if (!party.length) return M.reply('Your party is empty.')

      // Try to get the current field type from an ongoing battle
      const battle   = client.pokemonBattleResponse.get(M.from)
      const curField = battle?.isRuin ? battle.fieldType : null

      const TYPE_EMOJI = {
        fire: '🔥', water: '💧', ice: '❄️', electric: '⚡', grass: '🌿',
        poison: '☠️', flying: '🌬️', dragon: '🐉', psychic: '🔮', ground: '🌍',
        fairy: '🌸', ghost: '👻', dark: '🌑', rock: '🪨', steel: '⚙️',
        fighting: '🥊', bug: '🐛', normal: '⬜'
      }

      let lines = [`🏚️ *RUIN PARTY*`]
      if (curField) {
        lines.push(`🌍 *Current Field:* ${client.utils.capitalize(curField)} terrain\n`)
        lines.push(`✨ = +5% boost  |  ⚠️ = -5% penalty  |  💤 = fainted\n`)
      } else {
        lines.push(`_(Use *${prefix}ruin fight* to enter a battle and see field effects)_\n`)
      }

      for (let i = 0; i < party.length; i++) {
        const p         = party[i]
        const isFainted = (p.hp || 0) <= 0
        const types     = (p.types || []).map(t => t.toLowerCase())
        const typeNames = types.map(t => client.utils.capitalize(t)).join('/')
        const typeIcons = types.map(t => TYPE_EMOJI[t] || '').join('')

        let fieldTag = ''
        if (!isFainted && curField) {
          fieldTag = types.includes(curField) ? ' ✨' : ' ⚠️'
        }
        if (isFainted) fieldTag = ' 💤'

        const hpBar = isFainted
          ? '░░░░░░░░░░'
          : (() => {
              const pct   = Math.max(0, Math.min(1, (p.hp || 0) / (p.maxHp || 1)))
              const filled = Math.round(pct * 10)
              return '█'.repeat(filled) + '░'.repeat(10 - filled)
            })()

        const isActive = !isFainted && i === party.findIndex(q => q.hp > 0)
        const marker   = isActive ? '▶ ' : `${i + 1}. `

        lines.push(
          `${marker}*${client.utils.capitalize(p.name)}*${fieldTag}\n` +
          `   ${typeIcons} ${typeNames}  |  Lv. ${p.level || '?'}\n` +
          `   ❤️ ${p.hp}/${p.maxHp}  [${hpBar}]\n` +
          `   ⚡ ATK ${p.attack}  🛡 DEF ${p.defense}`
        )
      }

      if (curField) {
        lines.push(
          `\n💡 *Tip:* Use *${prefix}battle switch* to put in a ` +
          `${client.utils.capitalize(curField)}-type Pokémon for a *+5%* field boost!`
        )
      }

      return M.reply(lines.join('\n'))
    }

    // ── STATUS ───────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const session = await getSession()
      if (!session?.active) return M.reply(`🏚️ No active Ruin here. Summon one with *${prefix}ruin summon*.`)

      const battle       = client.pokemonBattleResponse.get(M.from)
      const inBattle     = Boolean(battle?.isRuin)
      const encIdx       = session.encounterIndex || 0
      const bossAt       = session.bossAt || 12
      const untilBoss    = Math.max(0, bossAt - encIdx)
      const scaling      = encIdx * 15
      const difficulty   = getEncounterDifficulty(encIdx, bossAt)
      const diffLabel    = DIFF_LABEL[difficulty] || difficulty

      // Progress bar (10 cells, boss marker at end)
      const barLen    = 10
      const filled    = Math.min(barLen, Math.round((encIdx / bossAt) * barLen))
      const progBar   = '█'.repeat(filled) + '░'.repeat(barLen - filled) + ' 👹'

      // HP bar helper
      const hpBar = (cur, max) => {
        const pct = max > 0 ? Math.max(0, Math.min(1, cur / max)) : 0
        const f   = Math.round(pct * 8)
        const bar = '█'.repeat(f) + '░'.repeat(8 - f)
        const col = pct > 0.5 ? '🟩' : pct > 0.2 ? '🟨' : '🟥'
        return `${col} ${bar} ${Math.max(0, cur).toLocaleString()}/${(max || 0).toLocaleString()}`
      }

      // Load party for HP display
      const challId = session.entrant || session.summoner
      const party   = challId ? ((await client.poke.get(`${challId}_Party`)) || []) : []

      const partyLines = party.length
        ? party.map((p, i) => {
            const statusIcon = p.hp <= 0 ? '💀' : p.state?.status === 'poisoned' ? '☠️' : p.state?.status === 'sleeping' ? '💤' : p.state?.status === 'paralyzed' ? '⚡' : '✅'
            return (
              `  *#${i + 1}* ${statusIcon} *${client.utils.capitalize(p.name)}* Lv.${p.level}\n` +
              `        ❤️ ${hpBar(p.hp, p.maxHp)}`
            )
          }).join('\n')
        : '  _(No party data)_'

      // Active enemy if in battle
      const enemyLine = inBattle
        ? (
            `\n👾 *Current Enemy*\n` +
            `  *${client.utils.capitalize(battle.player2.activePokemon.name)}*\n` +
            `  ❤️ ${hpBar(battle.player2.activePokemon.hp, battle.player2.activePokemon.maxHp)}\n`
          )
        : ''

      const actionLine = inBattle
        ? `⚔️ Battle in progress → *${prefix}ruin fight* to attack`
        : session.entered
        ? `📌 Use *${prefix}ruin fight* to face the next encounter`
        : `📌 Use *${prefix}ruin enter* to begin`

      const caption =
        `🏚️ *RUIN STATUS*\n\n` +
        `👤 Challenger: *@${(challId || '?').split('@')[0]}*\n\n` +
        `━━━ Progress ━━━\n` +
        `⚔️  Defeated:    *${encIdx}* encounter${encIdx !== 1 ? 's' : ''}\n` +
        `👹  Boss at:     encounter *#${bossAt}*\n` +
        `📍  Until boss:  *${untilBoss}* left\n` +
        `📊  ${progBar}\n` +
        `📈  Scaling:     *+${scaling}%* stronger\n` +
        `🎮  Next diff:   *${diffLabel}*\n` +
        `🔧  Ruin mode:   *${CHALLENGE_LABEL[session.ruinDifficulty] || CHALLENGE_LABEL.normal}*\n\n` +
        `━━━ Rewards ━━━\n` +
        `💰  Gems:        *${(session.totalGoldEarned || 0).toLocaleString()}*\n` +
        `🎯  Pokéballs:   *${session.totalBallsEarned || 0}*\n` +
        enemyLine +
        `\n━━━ Your Party ━━━\n` +
        partyLines +
        `\n\n${actionLine}`

      const imagePath = `${process.cwd()}/assets/Images/dungeon.jpg`
      try {
        return await client.sendMessage(M.from, {
          image: { url: imagePath },
          caption,
          mentions: challId ? [challId] : []
        }, { quoted: M })
      } catch (_) {
        return client.sendMessage(M.from, { text: caption, mentions: challId ? [challId] : [] }, { quoted: M })
      }
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
      `• *${prefix}ruin summon --challenge=easy|normal|hard|boss* — choose your Ruin difficulty\n` +
      `• *${prefix}ruin enter* — enter with your party (requires 6 Pokémon)\n` +
      `• *${prefix}ruin fight* — face the next encounter\n` +
      `• *${prefix}ruin status* — view progress\n` +
      `• *${prefix}ruin quit* — leave with your rewards\n` +
      `• *${prefix}ruin leaderboard* — top ruin clearers\n\n` +
      `👹 A *Boss* awaits after 6–24 encounters, depending on the chosen difficulty!`
    )
  }
}
