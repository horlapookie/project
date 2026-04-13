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
  const cacheBust = Date.now()
  const resp = await axios.get(`${YU_API}?random=1&cachebust=${cacheBust}`, {
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache'
    }
  })
  const first = resp.data?.data?.[0] || null
  if (first) return first

  const offset = Math.floor(Math.random() * 9000)
  const fallback = await axios.get(`${YU_API}?num=1&offset=${offset}`)
  return fallback.data?.data?.[0] || null
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
  findByUid
}
