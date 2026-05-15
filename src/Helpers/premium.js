const PREMIUM_KEY      = (userKey) => `premium-${userKey}`
const REGISTRY_KEY     = 'premium-registry'

// ── Registry (track who has premium) ─────────────────────────────────────────
const addToRegistry = async (client, userKey) => {
  const list = await client.DB.get(REGISTRY_KEY).catch(() => null) || []
  if (!list.includes(userKey)) list.push(userKey)
  await client.DB.set(REGISTRY_KEY, list).catch(() => null)
}

const removeFromRegistry = async (client, userKey) => {
  const list = await client.DB.get(REGISTRY_KEY).catch(() => null) || []
  const updated = list.filter(k => k !== userKey)
  await client.DB.set(REGISTRY_KEY, updated).catch(() => null)
}

const getRegistry = async (client) => {
  return await client.DB.get(REGISTRY_KEY).catch(() => null) || []
}

// ── Duration parser ───────────────────────────────────────────────────────────
// Parses flags like --days=7, --weeks=2, --months=1, or a bare number (days)
const parseDuration = (args = []) => {
  let days = 0
  for (const arg of args) {
    const d = arg.match(/--?days?=(\d+)/i)
    const w = arg.match(/--?weeks?=(\d+)/i)
    const mo = arg.match(/--?months?=(\d+)/i)
    if (d)  days += parseInt(d[1])
    if (w)  days += parseInt(w[1]) * 7
    if (mo) days += parseInt(mo[1]) * 30
  }
  return days > 0 ? days : null  // null = no expiry
}

// ── Core data ─────────────────────────────────────────────────────────────────
const PERK_DEFAULTS = {
  gold: false, goldExpiry: null,
  general: false, generalExpiry: null,
  maxParty: false,
  casino: false,    casinoExpiry: null,
  battle: false,    battleExpiry: null,
  ruin:   false,    ruinExpiry:   null,
  cards:  false,    cardsExpiry:  null,
  party8: false,    party8Expiry: null
}

const getPremium = async (client, userKey) => {
  const data = await client.DB.get(PREMIUM_KEY(userKey)).catch(() => null)
  return data ? { ...PERK_DEFAULTS, ...data } : { ...PERK_DEFAULTS }
}

// ── Expiry check helpers ──────────────────────────────────────────────────────
const _notExpired = (expiry) => !expiry || Date.now() <= Number(expiry)

const isGold = async (client, userKey) => {
  const data = await getPremium(client, userKey)
  return Boolean(data.gold) && _notExpired(data.goldExpiry)
}

const isGeneral = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.general) && _notExpired(data.generalExpiry)
}

const hasMaxParty = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.maxParty)
}

const hasPremiumCasino = async (client, userKey) => {
  const gen = await isGeneral(client, userKey)
  if (gen) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.casino) && _notExpired(data.casinoExpiry)
}

const hasPremiumBattle = async (client, userKey) => {
  const gen = await isGeneral(client, userKey)
  if (gen) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.battle) && _notExpired(data.battleExpiry)
}

const hasPremiumRuin = async (client, userKey) => {
  const gen = await isGeneral(client, userKey)
  if (gen) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.ruin) && _notExpired(data.ruinExpiry)
}

const hasPremiumCards = async (client, userKey) => {
  const gen = await isGeneral(client, userKey)
  if (gen) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.cards) && _notExpired(data.cardsExpiry)
}

const hasPremiumParty8 = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const gen = await isGeneral(client, userKey)
  if (gen) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.party8 || data.maxParty) && _notExpired(data.party8Expiry)
}

const setPremium = async (client, userKey, updates) => {
  const current = await getPremium(client, userKey)
  const updated  = { ...current, ...updates }
  await client.DB.set(PREMIUM_KEY(userKey), updated)

  // Auto-register/deregister
  const hasAny = Object.keys(PERK_DEFAULTS)
    .filter(k => !k.endsWith('Expiry'))
    .some(k => Boolean(updated[k]))
  if (hasAny) await addToRegistry(client, userKey)
  else await removeFromRegistry(client, userKey)

  return updated
}

// ── Party-size helper ─────────────────────────────────────────────────────────
const getMaxPartySize = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return 12
  const data = await getPremium(client, userKey)
  if (data.maxParty) return 12
  const gen = await isGeneral(client, userKey)
  if (gen) return 8
  if (data.party8) return 8
  return 6
}

const MAX_DECK_SIZE  = (gold) => gold ? 60 : 30
const MAX_PARTY_SIZE = (hasPremiumFlag) => hasPremiumFlag ? 12 : 6
const PARTY8_SIZE    = 8

module.exports = {
  getPremium, isGold, isGeneral, hasMaxParty, setPremium,
  hasPremiumCasino, hasPremiumBattle, hasPremiumRuin, hasPremiumCards, hasPremiumParty8,
  getMaxPartySize, parseDuration, getRegistry,
  addToRegistry, removeFromRegistry,
  MAX_DECK_SIZE, MAX_PARTY_SIZE, PARTY8_SIZE
}
