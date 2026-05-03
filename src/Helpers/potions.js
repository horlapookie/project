const Canvas = require('canvas')
const { join }    = require('path')
const { readFile } = require('fs/promises')

// ─── Potion definitions ───────────────────────────────────────────────────────
const POTIONS = [
    {
        id: 6,
        key: 'attack_potion',
        name: 'Attack Potion',
        emoji: '🔴',
        stat: 'attack',
        boost: 0.25,
        label: '+25% ATK',
        description: "Boosts your Pokémon's Attack by 25% for this battle.",
        price: 100000,
        hex: '#FF4455'
    },
    {
        id: 7,
        key: 'defense_potion',
        name: 'Defense Potion',
        emoji: '🔵',
        stat: 'defense',
        boost: 0.25,
        label: '+25% DEF',
        description: "Boosts your Pokémon's Defense by 25% for this battle.",
        price: 100000,
        hex: '#3399FF'
    },
    {
        id: 8,
        key: 'speed_potion',
        name: 'Speed Potion',
        emoji: '🟡',
        stat: 'speed',
        boost: 0.25,
        label: '+25% SPD',
        description: "Boosts your Pokémon's Speed by 25% for this battle.",
        price: 100000,
        hex: '#FFCC00'
    },
    {
        id: 9,
        key: 'iron_potion',
        name: 'Iron Potion',
        emoji: '⚫',
        stat: 'defense',
        boost: 0.40,
        label: '+40% DEF',
        description: "Greatly boosts your Pokémon's Defense by 40% for this battle.",
        price: 180000,
        hex: '#888899'
    },
    {
        id: 10,
        key: 'power_potion',
        name: 'Power Potion',
        emoji: '🟠',
        stat: 'attack',
        boost: 0.40,
        label: '+40% ATK',
        description: "Greatly boosts your Pokémon's Attack by 40% for this battle.",
        price: 180000,
        hex: '#FF7722'
    },
    {
        id: 11,
        key: 'x_speed',
        name: 'X Speed',
        emoji: '🟢',
        stat: 'speed',
        boost: 0.40,
        label: '+40% SPD',
        description: "Greatly boosts your Pokémon's Speed by 40% for this battle.",
        price: 180000,
        hex: '#22CC55'
    },
    {
        id: 12,
        key: 'elixir',
        name: 'Elixir',
        emoji: '⭐',
        stat: 'all',
        boost: 0.20,
        label: '+20% ALL',
        description: 'Boosts Attack, Defense, and Speed by 20% for this battle.',
        price: 350000,
        hex: '#BB44FF'
    }
]

const MAX_POTION_USES = 3

const getPotionById  = (id)  => POTIONS.find(p => p.id  === Number(id))
const getPotionByKey = (key) => POTIONS.find(p => p.key === String(key))

// ─── Bag storage ──────────────────────────────────────────────────────────────
const normalizeKey = (userId) => String(userId || '').replace(/\D/g, '') || String(userId || '')
const getPotionBagKey = (userId) => `${normalizeKey(userId)}_potion_bag`

const getPotionBag = async (client, userId) => {
    const bag = (await client.DB.get(getPotionBagKey(userId)).catch(() => null)) || {}
    return POTIONS.map(p => ({ ...p, quantity: Number(bag[p.key] || 0) }))
}

const setPotionQuantity = async (client, userId, key, quantity) => {
    const bagKey = getPotionBagKey(userId)
    const bag    = (await client.DB.get(bagKey).catch(() => null)) || {}
    bag[key] = Math.max(0, Number(quantity || 0))
    await client.DB.set(bagKey, bag)
    return bag[key]
}

const addPotionQuantity = async (client, userId, key, amount) => {
    const bag     = await getPotionBag(client, userId)
    const current = bag.find(p => p.key === key)?.quantity || 0
    return setPotionQuantity(client, userId, key, current + amount)
}

// ─── Apply a potion boost to an active Pokémon in a battle ───────────────────
// Returns { boostedStat, oldVal, newVal } or throws on error
const applyPotionToActivePokemon = (potion, pokemon) => {
    const results = []
    const statsToBoost = potion.stat === 'all'
        ? ['attack', 'defense', 'speed']
        : [potion.stat]

    for (const stat of statsToBoost) {
        const oldVal = Math.floor(pokemon[stat] || 0)
        const gain   = Math.max(1, Math.floor(oldVal * potion.boost))
        pokemon[stat] = oldVal + gain
        // Also boost max if it tracks it
        const maxKey = `max${stat.charAt(0).toUpperCase() + stat.slice(1)}`
        if (pokemon[maxKey] !== undefined) pokemon[maxKey] = pokemon[stat]
        results.push({ stat, oldVal, newVal: pokemon[stat], gain })
    }
    return results
}

// ─── Canvas catalog image ─────────────────────────────────────────────────────
const CARD_W = 640
const CARD_H = 120
const COLS   = 1
const PAD    = 20

const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

/**
 * Draw the potion catalog as a canvas image.
 * @param {Array} potionsWithQty  - POTIONS enriched with `.quantity`
 * @returns {Promise<Buffer>}
 */
const drawPotionCatalog = async (potionsWithQty = POTIONS) => {
    const totalH = PAD * 2 + potionsWithQty.length * (CARD_H + PAD) + 70  // 70 = title bar
    const canvas = Canvas.createCanvas(CARD_W + PAD * 2, totalH)
    const ctx    = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Sans-Serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚗️  BATTLE POTIONS  ⚗️', canvas.width / 2, 46)

    // Sub-title
    ctx.font = '15px Sans-Serif'
    ctx.fillStyle = '#aaaacc'
    ctx.fillText(`Max ${MAX_POTION_USES} uses per battle  ·  Buy with ${''}-mart-buy`, canvas.width / 2, 68)

    let y = 80

    for (const p of potionsWithQty) {
        // Card BG
        ctx.save()
        roundRect(ctx, PAD, y, CARD_W, CARD_H, 12)
        ctx.fillStyle = '#16213e'
        ctx.fill()
        // Left colour accent bar
        roundRect(ctx, PAD, y, 8, CARD_H, 6)
        ctx.fillStyle = p.hex || '#888'
        ctx.fill()
        ctx.restore()

        // ID badge
        ctx.save()
        ctx.fillStyle = p.hex || '#888'
        ctx.font = 'bold 14px Sans-Serif'
        ctx.textAlign = 'left'
        ctx.fillText(`#${p.id}`, PAD + 18, y + 22)
        ctx.restore()

        // Name
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 22px Sans-Serif'
        ctx.textAlign = 'left'
        ctx.fillText(`${p.emoji}  ${p.name}`, PAD + 18, y + 48)

        // Boost label pill
        ctx.save()
        const pillW = 110, pillH = 26
        const pillX = PAD + 18, pillY = y + 58
        roundRect(ctx, pillX, pillY, pillW, pillH, 13)
        ctx.fillStyle = p.hex + '44'
        ctx.fill()
        ctx.strokeStyle = p.hex
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = p.hex
        ctx.font = 'bold 13px Sans-Serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.label, pillX + pillW / 2, pillY + 17)
        ctx.restore()

        // Description
        ctx.fillStyle = '#9999bb'
        ctx.font = '13px Sans-Serif'
        ctx.textAlign = 'left'
        ctx.fillText(p.description, PAD + 140, y + 72)

        // Price (right side)
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 18px Sans-Serif'
        ctx.textAlign = 'right'
        ctx.fillText(`💎 ${p.price.toLocaleString()}`, PAD + CARD_W - 14, y + 42)

        // Quantity in bag (right side bottom)
        const qty = p.quantity ?? 0
        ctx.fillStyle = qty > 0 ? '#55ee88' : '#666688'
        ctx.font = '14px Sans-Serif'
        ctx.fillText(`Bag: ${qty}`, PAD + CARD_W - 14, y + 66)

        // Separator
        ctx.strokeStyle = '#2a2a4a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(PAD + 8, y + CARD_H)
        ctx.lineTo(PAD + CARD_W - 8, y + CARD_H)
        ctx.stroke()

        y += CARD_H + PAD
    }

    return canvas.toBuffer('image/jpeg', { quality: 92 })
}

module.exports = {
    POTIONS,
    MAX_POTION_USES,
    getPotionById,
    getPotionByKey,
    getPotionBag,
    setPotionQuantity,
    addPotionQuantity,
    applyPotionToActivePokemon,
    drawPotionCatalog
}
