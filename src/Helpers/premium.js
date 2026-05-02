const PREMIUM_KEY = (userKey) => `premium-${userKey}`

const getPremium = async (client, userKey) => {
  const data = await client.DB.get(PREMIUM_KEY(userKey)).catch(() => null)
  return data || { gold: false, goldExpiry: null, maxParty: false }
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

const setPremium = async (client, userKey, updates) => {
  const current = await getPremium(client, userKey)
  const updated = { ...current, ...updates }
  await client.DB.set(PREMIUM_KEY(userKey), updated)
  return updated
}

const MAX_DECK_SIZE = (gold) => gold ? 60 : 40
const MAX_PARTY_SIZE = (hasPremium) => hasPremium ? 12 : 6

module.exports = { getPremium, isGold, hasMaxParty, setPremium, MAX_DECK_SIZE, MAX_PARTY_SIZE }
