// ─── Mega Stone Bag helpers ────────────────────────────────────────────────────
const { MEGA_STONES, getMegaStoneByKey } = require('./megaItems')

const _bagKey = (userKey) => `megastonebag_${userKey}`

/** Returns raw object { charizardite_x: 2, gmax_ball: 1, ... } */
const getRawBag = async (client, userKey) =>
  (await client.DB.get(_bagKey(userKey)).catch(() => null)) || {}

/** Save raw bag */
const saveRawBag = (client, userKey, raw) =>
  client.DB.set(_bagKey(userKey), raw).catch(() => null)

/**
 * Returns an array of items with > 0 quantity, enriched with stone metadata.
 * Format: { key, name, emoji, quantity, id, price, note, pokemon, profile }
 */
const getMegaStoneBag = async (client, userKey) => {
  const raw  = await getRawBag(client, userKey)
  const all  = [...MEGA_STONES]
  const items = []
  for (const stone of all) {
    const qty = Number(raw[stone.key] || 0)
    if (qty > 0) items.push({ ...stone, quantity: qty })
  }
  return items
}

/** Add qty to a stone key */
const addMegaStoneQuantity = async (client, userKey, stoneKey, qty = 1) => {
  const raw = await getRawBag(client, userKey)
  raw[stoneKey] = Math.max(0, Number(raw[stoneKey] || 0) + qty)
  await saveRawBag(client, userKey, raw)
}

/** Remove qty from a stone key. Returns false if insufficient. */
const removeMegaStoneQuantity = async (client, userKey, stoneKey, qty = 1) => {
  const raw = await getRawBag(client, userKey)
  if ((raw[stoneKey] || 0) < qty) return false
  raw[stoneKey] = Number(raw[stoneKey]) - qty
  await saveRawBag(client, userKey, raw)
  return true
}

module.exports = { getMegaStoneBag, addMegaStoneQuantity, removeMegaStoneQuantity, getRawBag }
