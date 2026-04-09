const { createCanvas, loadImage, registerFont } = require('canvas')
const { existsSync } = require('fs')
const { join } = require('path')

const fontPath = join(process.cwd(), 'assets', 'fonts', 'OMORI.ttf')
if (existsSync(fontPath)) {
    try {
        registerFont(fontPath, { family: 'Omori' })
    } catch (error) {
        // Font may already be registered in long-running sessions.
    }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

const roundedRect = (ctx, x, y, width, height, radius) => {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + width, y, x + width, y + height, r)
    ctx.arcTo(x + width, y + height, x, y + height, r)
    ctx.arcTo(x, y + height, x, y, r)
    ctx.arcTo(x, y, x + width, y, r)
    ctx.closePath()
}

const drawCircularImage = async (ctx, imageSource, x, y, size) => {
    const image = await loadImage(imageSource)
    ctx.save()
    ctx.beginPath()
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(image, x, y, size, size)
    ctx.restore()
}

const drawCoverImage = async (ctx, imageSource, x, y, size, radius) => {
    const image = await loadImage(imageSource)
    ctx.save()
    roundedRect(ctx, x, y, size, size, radius)
    ctx.clip()
    ctx.drawImage(image, x, y, size, size)
    ctx.restore()
}

const fitText = (ctx, text, maxWidth, startSize, family) => {
    let size = startSize
    while (size > 18) {
        ctx.font = `bold ${size}px ${family}`
        if (ctx.measureText(text).width <= maxWidth) return ctx.font
        size -= 2
    }
    return `bold 18px ${family}`
}

const wrapText = (ctx, text, maxWidth) => {
    const words = String(text || '').split(/\s+/)
    const lines = []
    let line = ''

    for (const word of words) {
        const testLine = line ? `${line} ${word}` : word
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line)
            line = word
        } else {
            line = testLine
        }
    }

    if (line) lines.push(line)
    return lines
}

const renderRankCard = async ({
    avatar,
    username,
    level,
    currentXP,
    requiredXP,
    rank,
    discriminator
}) => {
    const width = 934
    const height = 282
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#170f23')
    bg.addColorStop(0.5, '#2c1736')
    bg.addColorStop(1, '#4e1c20')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundedRect(ctx, 18, 18, width - 36, height - 36, 28)
    ctx.fill()

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    roundedRect(ctx, 24, 24, width - 48, height - 48, 24)
    ctx.fill()

    await drawCircularImage(ctx, avatar, 48, 51, 180)
    ctx.strokeStyle = '#f5d76e'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(138, 141, 94, 0, Math.PI * 2)
    ctx.stroke()

    const progress = requiredXP > 0 ? clamp(currentXP / requiredXP, 0, 1) : 0
    const barX = 276
    const barY = 186
    const barWidth = 596
    const barHeight = 34

    ctx.fillStyle = 'rgba(255,255,255,0.16)'
    roundedRect(ctx, barX, barY, barWidth, barHeight, 18)
    ctx.fill()

    const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY)
    progressGradient.addColorStop(0, '#ff875b')
    progressGradient.addColorStop(1, '#ffd166')
    ctx.fillStyle = progressGradient
    roundedRect(ctx, barX, barY, Math.max(barHeight, barWidth * progress), barHeight, 18)
    ctx.fill()

    ctx.fillStyle = '#fff7df'
    ctx.font = fitText(ctx, username, 430, 42, family)
    ctx.fillText(username, 276, 104)

    ctx.font = `bold 24px ${family}`
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.fillText(discriminator, 278, 134)

    ctx.font = `bold 22px ${family}`
    ctx.fillStyle = '#ffd166'
    ctx.fillText('RANK', 690, 78)
    ctx.fillText('LEVEL', 798, 78)

    ctx.font = `bold 38px ${family}`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(String(rank), 694, 116)
    ctx.fillText(String(level), 812, 116)

    ctx.font = `bold 22px ${family}`
    ctx.fillStyle = '#fff3c4'
    ctx.fillText(`${currentXP} / ${requiredXP} XP`, 278, 171)

    return canvas.toBuffer('image/png')
}

const renderSpotifyCard = async ({ cover, title, artists, album, accent = '#1db954' }) => {
    const width = 800
    const height = 250
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#0b1014')
    bg.addColorStop(1, '#142a1f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    roundedRect(ctx, 18, 18, width - 36, height - 36, 24)
    ctx.fill()

    await drawCoverImage(ctx, cover, 36, 36, 178, 20)

    ctx.fillStyle = accent
    ctx.font = `bold 24px ${family}`
    ctx.fillText('SPOTIFY', 246, 58)

    ctx.fillStyle = '#ffffff'
    ctx.font = fitText(ctx, title, 500, 38, family)
    ctx.fillText(title, 246, 104)

    ctx.fillStyle = 'rgba(255,255,255,0.80)'
    ctx.font = `bold 24px ${family}`
    ctx.fillText(artists, 246, 144)

    ctx.fillStyle = 'rgba(255,255,255,0.62)'
    ctx.font = `bold 20px ${family}`
    ctx.fillText(album, 246, 176)

    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    roundedRect(ctx, 246, 198, 500, 10, 5)
    ctx.fill()

    ctx.fillStyle = accent
    roundedRect(ctx, 246, 198, 310, 10, 5)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(246 + 310, 203, 14, 0, Math.PI * 2)
    ctx.fill()

    return canvas.toBuffer('image/png')
}

const renderPartyOverviewCard = async ({ trainerName, party, prefix }) => {
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'
    const width = 1000
    const headerHeight = 130
    const cardHeight = 155
    const gap = 20
    const height = headerHeight + party.length * (cardHeight + gap) + 40
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#101722')
    bg.addColorStop(0.5, '#1d2434')
    bg.addColorStop(1, '#2f1737')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    roundedRect(ctx, 20, 20, width - 40, height - 40, 28)
    ctx.fill()

    ctx.fillStyle = '#ffe7a8'
    ctx.font = `bold 38px ${family}`
    ctx.fillText('POKEMON PARTY', 40, 68)

    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = `bold 24px ${family}`
    ctx.fillText(`Trainer: ${trainerName || 'Unknown Trainer'}`, 40, 102)
    ctx.fillText(`Use ${prefix}party <index_number> to inspect one Pokemon`, 420, 102)

    for (let i = 0; i < party.length; i++) {
        const pokemon = party[i]
        const y = headerHeight + i * (cardHeight + gap)

        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        roundedRect(ctx, 34, y, width - 68, cardHeight, 24)
        ctx.fill()

        try {
            await drawCoverImage(ctx, pokemon.image, 52, y + 18, 118, 18)
        } catch (error) {
            ctx.fillStyle = 'rgba(255,255,255,0.15)'
            roundedRect(ctx, 52, y + 18, 118, 118, 18)
            ctx.fill()
        }

        ctx.fillStyle = '#ffffff'
        ctx.font = fitText(ctx, `${i + 1}. ${pokemon.name}`, 340, 34, family)
        ctx.fillText(`${i + 1}. ${pokemon.name}`, 194, y + 48)

        ctx.font = `bold 20px ${family}`
        ctx.fillStyle = '#ffd166'
        ctx.fillText(`Level ${pokemon.level}`, 194, y + 80)

        ctx.fillStyle = 'rgba(255,255,255,0.82)'
        ctx.fillText(`HP ${pokemon.hp}/${pokemon.maxHp}`, 324, y + 80)
        ctx.fillText(`XP ${pokemon.displayExp}`, 494, y + 80)

        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(`Types: ${(pokemon.types || []).join(', ')}`, 194, y + 110)
        ctx.fillText(`Tag: ${pokemon.tag || '-'}`, 194, y + 136)

        const hpRatio = pokemon.maxHp > 0 ? clamp(pokemon.hp / pokemon.maxHp, 0, 1) : 0
        ctx.fillStyle = 'rgba(255,255,255,0.16)'
        roundedRect(ctx, 700, y + 56, 210, 18, 9)
        ctx.fill()

        const hpGradient = ctx.createLinearGradient(700, y + 56, 910, y + 56)
        hpGradient.addColorStop(0, '#5ee173')
        hpGradient.addColorStop(1, '#a4ff5c')
        ctx.fillStyle = hpGradient
        roundedRect(ctx, 700, y + 56, Math.max(18, 210 * hpRatio), 18, 9)
        ctx.fill()
    }

    return canvas.toBuffer('image/png')
}

const renderPokemonDetailCard = async ({ pokemon, requiredXp }) => {
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'
    const width = 980
    const height = 620
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#12131e')
    bg.addColorStop(0.5, '#20314c')
    bg.addColorStop(1, '#163329')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    roundedRect(ctx, 20, 20, width - 40, height - 40, 28)
    ctx.fill()

    try {
        await drawCoverImage(ctx, pokemon.image, 48, 60, 290, 28)
    } catch (error) {
        ctx.fillStyle = 'rgba(255,255,255,0.14)'
        roundedRect(ctx, 48, 60, 290, 290, 28)
        ctx.fill()
    }

    ctx.fillStyle = '#ffffff'
    ctx.font = fitText(ctx, `${pokemon.name} (${pokemon.tag || '-'})`, 540, 38, family)
    ctx.fillText(`${pokemon.name} (${pokemon.tag || '-'})`, 372, 92)

    ctx.fillStyle = '#ffd166'
    ctx.font = `bold 24px ${family}`
    ctx.fillText(`Level ${pokemon.level}`, 372, 130)
    ctx.fillText(`XP ${pokemon.displayExp}/${requiredXp}`, 520, 130)

    const lines = [
        `Gender: ${pokemon.female ? 'Female' : 'Male'}`,
        `Types: ${(pokemon.types || []).join(', ')}`,
        `State: ${pokemon.hp <= 0 ? 'Fainted' : pokemon.state?.status ? pokemon.state.status : 'Fine'}`,
        `HP: ${pokemon.hp}/${pokemon.maxHp}`,
        `Attack: ${pokemon.attack}/${pokemon.maxAttack}`,
        `Defense: ${pokemon.defense}/${pokemon.maxDefense}`,
        `Speed: ${pokemon.speed}/${pokemon.maxSpeed}`
    ]

    ctx.fillStyle = 'rgba(255,255,255,0.86)'
    ctx.font = `bold 24px ${family}`
    lines.forEach((line, index) => ctx.fillText(line, 372, 180 + index * 42))

    ctx.fillStyle = '#ffe7a8'
    ctx.font = `bold 24px ${family}`
    ctx.fillText('Moves', 48, 404)

    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    ctx.font = `bold 22px ${family}`
    ;(pokemon.moves || []).slice(0, 8).forEach((move, index) => {
        const y = 444 + index * 38
        ctx.fillText(
            `${index + 1}. ${move.name.split('-').join(' ')} | ${move.type} | PP ${move.pp}/${move.maxPp}`,
            48,
            y
        )
    })

    return canvas.toBuffer('image/png')
}

const renderPokemonMovesCard = async ({ pokemon }) => {
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'
    const width = 1000
    const rowHeight = 96
    const height = 120 + Math.max(1, (pokemon.moves || []).length) * rowHeight
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#151524')
    bg.addColorStop(1, '#382047')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold 34px ${family}`
    ctx.fillText(`Moves | ${pokemon.name}`, 34, 64)

    ;(pokemon.moves || []).forEach((move, index) => {
        const y = 92 + index * rowHeight
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        roundedRect(ctx, 24, y, width - 48, 80, 18)
        ctx.fill()

        ctx.fillStyle = '#ffd166'
        ctx.font = `bold 24px ${family}`
        ctx.fillText(`${index + 1}. ${move.name.split('-').join(' ')}`, 42, y + 34)

        ctx.fillStyle = 'rgba(255,255,255,0.82)'
        ctx.font = `bold 20px ${family}`
        ctx.fillText(`Type: ${move.type} | PP: ${move.pp}/${move.maxPp}`, 42, y + 60)

        const power = move.power == null ? '-' : move.power
        const accuracy = move.accuracy == null ? '-' : move.accuracy
        ctx.fillText(`Power: ${power} | Accuracy: ${accuracy}`, 420, y + 60)

        ctx.font = `bold 18px ${family}`
        const wrapped = wrapText(ctx, move.description || 'No description provided.', 900)
        ctx.fillStyle = 'rgba(255,255,255,0.72)'
        if (wrapped[0]) ctx.fillText(wrapped[0], 42, y + 84)
    })

    return canvas.toBuffer('image/png')
}

module.exports = {
    renderRankCard,
    renderSpotifyCard,
    renderPartyOverviewCard,
    renderPokemonDetailCard,
    renderPokemonMovesCard
}
