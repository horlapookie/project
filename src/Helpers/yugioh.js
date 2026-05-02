const axios = require('axios')

const YU_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'

const calcPrice = (card) => {
  const atk = Number(card.atk || 0)
  const def = Number(card.def || 0)
  const level = Number(card.level || 0)
  const base = atk + def + level * 1000 + 5000
  return Math.max(1000, Math.round(base * 20))
}

const normalizeCard = (card) => {
  if (!card) return null
  const image = card.card_images?.[0]?.image_url || ''
  return {
    id: Number(card.id),
    name: card.name,
    type: card.type,
    race: card.race || 'Unknown',
    atk: card.atk ?? null,
    def: card.def ?? null,
    level: card.level ?? null,
    attribute: card.attribute || 'N/A',
    image,
    price: calcPrice(card),
    uid: `${card.id}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
  }
}

const fetchRandomCard = async () => {
  // Use random offset instead of the API's random=1 to avoid cached repeats.
  const offset = Math.floor(Math.random() * 12000)
  const resp = await axios.get(`${YU_API}?num=1&offset=${offset}`, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  })
  return resp.data?.data?.[0] || null
}

const fetchById = async (id) => {
  try {
    const resp = await axios.get(`${YU_API}?id=${id}`)
    return resp.data?.data?.[0] || null
  } catch (err) {
    if (err?.response?.status === 400) return null
    throw err
  }
}

const fetchByName = async (name) => {
  // Use fname for partial matches to avoid 400 on non-exact name.
  try {
    const resp = await axios.get(`${YU_API}?fname=${encodeURIComponent(name)}`)
    return resp.data?.data?.[0] || null
  } catch (err) {
    if (err?.response?.status === 400) return null
    throw err
  }
}

const getCollection = async (client, user) =>
  (await client.DB.get(`yu-collection-${user}`)) || []

const setCollection = async (client, user, collection) =>
  client.DB.set(`yu-collection-${user}`, collection)

const getDeck = async (client, user) =>
  (await client.DB.get(`yu-deck-${user}`)) || []

const setDeck = async (client, user, deck) =>
  client.DB.set(`yu-deck-${user}`, deck)

const findByUid = (list, uid) => {
  const index = list.findIndex((c) => String(c.uid) === String(uid))
  return { index, card: index >= 0 ? list[index] : null }
}

const recordYuResult = async (client, winnerKey, loserKey) => {
  try {
    const realPlayers = [winnerKey, loserKey].filter(k => k && k !== 'wild')
    const existing = (await client.DB.get('yu-players').catch(() => null)) || []
    const players = Array.from(new Set([...existing, ...realPlayers]))
    await client.DB.set('yu-players', players)

    if (winnerKey && winnerKey !== 'wild') {
      const wins = Number((await client.DB.get(`yu-wins-${winnerKey}`).catch(() => null)) || 0)
      await client.DB.set(`yu-wins-${winnerKey}`, wins + 1)
    }
    if (loserKey && loserKey !== 'wild') {
      const losses = Number((await client.DB.get(`yu-losses-${loserKey}`).catch(() => null)) || 0)
      await client.DB.set(`yu-losses-${loserKey}`, losses + 1)
    }
  } catch (err) {
    console.error('recordYuResult error:', err)
  }
}

module.exports = {
  YU_API,
  calcPrice,
  normalizeCard,
  fetchRandomCard,
  fetchById,
  fetchByName,
  getCollection,
  setCollection,
  getDeck,
  setDeck,
  findByUid,
  recordYuResult
}
