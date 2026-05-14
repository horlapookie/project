// ─── Mega / GMax stat boost helper ───────────────────────────────────────────

const isMegaOrGmax = (name = '') => {
  const n = String(name).toLowerCase().trim()
  return (
    /-mega(-x|-y)?$/.test(n) ||
    /-primal$/.test(n)       ||
    /-(gmax|gigantamax)$/.test(n)
  )
}

/**
 * Multiply hp and attack of a mega/gmax Pokémon by 2.
 * Guards against double-application via `poke.megaBoosted`.
 * Mutates the object in place and returns it.
 */
const applyMegaGmaxBoost = (poke) => {
  if (!poke || !isMegaOrGmax(poke.name) || poke.megaBoosted) return poke
  const M = 2
  poke.hp      = Math.floor((poke.hp      || 0) * M)
  poke.attack  = Math.floor((poke.attack  || 0) * M)
  if (poke.maxHp      != null) poke.maxHp      = Math.floor(poke.maxHp      * M)
  if (poke.maxAttack  != null) poke.maxAttack  = Math.floor(poke.maxAttack  * M)
  poke.megaBoosted = true
  return poke
}

/**
 * Apply a ×1.5 base boost to all NON-mega/gmax Pokémon.
 * Guarded by `poke.baseStatsBoosted` to prevent double-application.
 * Mutates in place and returns the poke object.
 */
const applyBaseBoost = (poke) => {
  if (!poke || isMegaOrGmax(poke.name) || poke.baseStatsBoosted) return poke
  const M = 1.5
  poke.hp      = Math.floor((poke.hp      || 0) * M)
  poke.attack  = Math.floor((poke.attack  || 0) * M)
  poke.defense = Math.floor((poke.defense || 0) * M)
  if (poke.speed      != null) poke.speed      = Math.floor(poke.speed      * M)
  if (poke.maxHp      != null) poke.maxHp      = Math.floor(poke.maxHp      * M)
  if (poke.maxAttack  != null) poke.maxAttack  = Math.floor(poke.maxAttack  * M)
  if (poke.maxDefense != null) poke.maxDefense = Math.floor(poke.maxDefense * M)
  if (poke.maxSpeed   != null) poke.maxSpeed   = Math.floor(poke.maxSpeed   * M)
  poke.baseStatsBoosted = true
  return poke
}

/**
 * List of Pokémon species that can perform Gigantamax.
 * Note: In actual gameplay, individuals must have the G-Max factor,
 * but we'll use random chance for implementation purposes.
 */
const GIGANTAMAX_CAPABLE_SPECIES = [
  'pikachu', 'charizard', 'butterfree', 'corviknight', 'orbeetle',
  'drednaw', 'melmetal', 'gengar', 'kingler', 'lapras',
  'eevee', 'grimmsnarl', 'alcremie', 'machamp', 'golem',
  'arcanine', 'lapras', 'gengar', 'kingler', 'centiskorch',
  'coalossal', 'flapple', 'appletun', 'sandaconda', 'toxtricity',
  'hatterene', 'grimmsnarl', 'copperajah', 'duraludon',
  'urshifu', 'rillaboom', 'cinderace', 'inteleon', 'dragapult',
  'snorlax', 'pikachu', 'bolthound', 'silicobra'
]

/**
 * Check if a Pokémon can perform Gigantamax.
 * In real Pokémon, only specific individuals with the G-Max factor can do it.
 * For implementation, we'll check if the species is in our list.
 */
const canGigantamax = (pokemonName = '') => {
  const baseName = String(pokemonName || '')
    .toLowerCase()
    .replace(/-(gmax|gigantamax)?$/i, '')
    .trim()
  return GIGANTAMAX_CAPABLE_SPECIES.includes(baseName)
}

/**
 * Activate Dynamax on a Pokémon.
 * - Doubles HP
 * - Stores original moves
 * - Converts moves to Max/G-Max moves based on type
 * - Sets dynamaxTurns to 3
 */
const activateDynamax = (poke, isGigantamax = false) => {
  if (!poke || !poke.state) return poke
  if (poke.state.dynamaxActive) return poke // Already active

  // Double HP
  poke.state.baseHp = poke.hp
  poke.hp = poke.maxHp ? Math.floor(poke.maxHp * 2) : Math.floor(poke.hp * 2)

  // Store original moves (in case revert needed)
  poke.state.baseMoves = [...(poke.moves || [])]

  // Activate state
  poke.state.dynamaxActive = true
  poke.state.dynamaxTurns = 3
  poke.isGigantamax = isGigantamax

  return poke
}

module.exports = {
  isMegaOrGmax,
  applyMegaGmaxBoost,
  applyBaseBoost,
  canGigantamax,
  activateDynamax,
  GIGANTAMAX_CAPABLE_SPECIES
}
