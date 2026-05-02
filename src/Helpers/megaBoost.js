// ─── Mega / GMax stat boost helper ───────────────────────────────────────────
// Used in: catch.js, challenge.js, ashen.js, ruin.js, battle.js (switch)

const isMegaOrGmax = (name = '') => {
  const n = String(name).toLowerCase().trim()
  return (
    /-mega(-x|-y)?$/.test(n) ||
    /-primal$/.test(n)       ||
    /-(gmax|gigantamax)$/.test(n)
  )
}

/**
 * Multiply all stats of a mega/gmax Pokémon by 3.
 * Guards against double-application via `poke.megaBoosted`.
 * Mutates the object in place and returns it.
 */
const applyMegaGmaxBoost = (poke) => {
  if (!poke || !isMegaOrGmax(poke.name) || poke.megaBoosted) return poke
  const M = 3
  poke.hp      = Math.floor((poke.hp      || 0) * M)
  poke.attack  = Math.floor((poke.attack  || 0) * M)
  poke.defense = Math.floor((poke.defense || 0) * M)
  if (poke.speed      != null) poke.speed      = Math.floor(poke.speed      * M)
  if (poke.maxHp      != null) poke.maxHp      = Math.floor(poke.maxHp      * M)
  if (poke.maxAttack  != null) poke.maxAttack  = Math.floor(poke.maxAttack  * M)
  if (poke.maxDefense != null) poke.maxDefense = Math.floor(poke.maxDefense * M)
  if (poke.maxSpeed   != null) poke.maxSpeed   = Math.floor(poke.maxSpeed   * M)
  poke.megaBoosted = true
  return poke
}

module.exports = { isMegaOrGmax, applyMegaGmaxBoost }
