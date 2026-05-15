const PREMIUM_KEY = (userKey) => `premium-${userKey}`

const getPremium = async (client, userKey) => {
  const data = await client.DB.get(PREMIUM_KEY(userKey)).catch(() => null)
  return data || {
    gold: false, goldExpiry: null,
    maxParty: false,
    casino: false,
    battle: false,
    ruin: false,
    cards: false,
    party8: false
  }
}

const isGold = async (client, userKey) => {
  const data = await getPremium(client, userKey)
  if (!data.gold) return false
  if (data.goldExpiry && Date.now() > Number(data.goldExpiry)) return false
  return true
}

const hasMaxParty = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.maxParty)
}

const hasPremiumCasino = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.casino)
}

const hasPremiumBattle = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.battle)
}

const hasPremiumRuin = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.ruin)
}

const hasPremiumCards = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.cards)
}

const hasPremiumParty8 = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return true
  const data = await getPremium(client, userKey)
  return Boolean(data.party8 || data.maxParty)
}

const setPremium = async (client, userKey, updates) => {
  const current = await getPremium(client, userKey)
  const updated = { ...current, ...updates }
  await client.DB.set(PREMIUM_KEY(userKey), updated)
  return updated
}

const MAX_DECK_SIZE = (gold) => gold ? 60 : 30
const MAX_PARTY_SIZE = (hasPremiumFlag) => hasPremiumFlag ? 12 : 6
const PARTY8_SIZE = 8

const getMaxPartySize = async (client, userKey) => {
  const gold = await isGold(client, userKey)
  if (gold) return 12
  const data = await getPremium(client, userKey)
  if (data.maxParty) return 12
  if (data.party8) return 8
  return 6
}

module.exports = {
  getPremium, isGold, hasMaxParty, setPremium,
  hasPremiumCasino, hasPremiumBattle, hasPremiumRuin, hasPremiumCards, hasPremiumParty8,
  MAX_DECK_SIZE, MAX_PARTY_SIZE, PARTY8_SIZE, getMaxPartySize
}
