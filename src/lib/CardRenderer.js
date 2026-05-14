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
        `Speed: ${pokemon.speed}/${pokemon.maxSpeed}`,
        ...(pokemon.hasGmaxFactor ? ['G-Max Factor: Yes'] : [])
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

const renderYuBattleCard = async ({ player1, player2, result }) => {
    const family = existsSync(fontPath) ? 'Omori' : 'Sans'
    const width = 1000
    const height = 660
    const MAX_LP = 8000

    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // ─── Background ──────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, width, height)
    bg.addColorStop(0, '#0a0015')
    bg.addColorStop(0.5, '#120a2a')
    bg.addColorStop(1, '#1a0510')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Arena grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 50) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke()
    }
    for (let y = 0; y < height; y += 50) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke()
    }

    // ─── LP Header panels (like Pokémon field) ──────────
    const panelW = 460

    ctx.fillStyle = 'rgba(255,60,60,0.18)'
    roundedRect(ctx, 16, 10, panelW, 92, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,80,80,0.6)'
    ctx.lineWidth = 1.5
    roundedRect(ctx, 16, 10, panelW, 92, 14)
    ctx.stroke()

    ctx.fillStyle = 'rgba(60,120,255,0.18)'
    roundedRect(ctx, 524, 10, panelW, 92, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,120,255,0.6)'
    ctx.lineWidth = 1.5
    roundedRect(ctx, 524, 10, panelW, 92, 14)
    ctx.stroke()

    // Player names
    ctx.fillStyle = '#ff9090'
    ctx.font = fitText(ctx, player1.username, 410, 22, family)
    ctx.fillText(player1.username, 30, 44)

    ctx.fillStyle = '#90b0ff'
    ctx.font = fitText(ctx, player2.username, 410, 22, family)
    ctx.fillText(player2.username, 538, 44)

    // LP bars
    const lp1 = Math.max(0, player1.lp ?? MAX_LP)
    const lp2 = Math.max(0, player2.lp ?? MAX_LP)
    const barW = 400

    const drawLpBar = (x, y, lp) => {
        const pct = clamp(lp / MAX_LP, 0, 1)
        const barColor = pct > 0.5 ? '#00e676' : pct > 0.25 ? '#ffea00' : '#ff1744'

        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = `bold 12px ${family}`
        ctx.textAlign = 'left'
        ctx.fillText('LP', x, y - 2)
        ctx.textAlign = 'right'
        ctx.fillText(`${lp.toLocaleString()} / ${MAX_LP.toLocaleString()}`, x + barW, y - 2)
        ctx.textAlign = 'left'

        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        roundedRect(ctx, x, y, barW, 16, 5)
        ctx.fill()

        const fillW = Math.max(pct > 0 ? 6 : 0, Math.round(barW * pct))
        if (fillW > 0) {
            const fillGrad = ctx.createLinearGradient(x, 0, x + fillW, 0)
            fillGrad.addColorStop(0, barColor + 'bb')
            fillGrad.addColorStop(1, barColor)
            ctx.fillStyle = fillGrad
            roundedRect(ctx, x, y, fillW, 16, 5)
            ctx.fill()
        }
    }

    drawLpBar(30, 60, lp1)
    drawLpBar(538, 60, lp2)

    // ─── Card area panels ────────────────────────────────
    ctx.fillStyle = 'rgba(255,60,60,0.06)'
    roundedRect(ctx, 16, 114, panelW, height - 202, 14)
    ctx.fill()

    ctx.fillStyle = 'rgba(60,120,255,0.06)'
    roundedRect(ctx, 524, 114, panelW, height - 202, 14)
    ctx.fill()

    // ─── Center divider glow ─────────────────────────────
    const divGrad = ctx.createLinearGradient(0, 0, 0, height)
    divGrad.addColorStop(0, 'rgba(255,215,0,0)')
    divGrad.addColorStop(0.35, 'rgba(255,215,0,0.85)')
    divGrad.addColorStop(0.65, 'rgba(255,215,0,0.85)')
    divGrad.addColorStop(1, 'rgba(255,215,0,0)')
    ctx.fillStyle = divGrad
    ctx.fillRect(490, 0, 20, height)

    // ─── Angled card drawing ─────────────────────────────
    const cardW = 195
    const cardH = 285
    const cardCy = 272

    const drawAngledCard = async (imageUrl, cx, cy, angle, borderColor) => {
        try {
            const img = await loadImage(imageUrl)
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(angle)
            roundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14)
            ctx.clip()
            ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH)
            ctx.restore()
        } catch (_) {
            ctx.save()
            ctx.translate(cx, cy)
            ctx.rotate(angle)
            ctx.fillStyle = borderColor + '30'
            roundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14)
            ctx.fill()
            ctx.fillStyle = 'rgba(255,255,255,0.6)'
            ctx.font = `bold 15px ${family}`
            ctx.textAlign = 'center'
            ctx.fillText('No Image', 0, 8)
            ctx.textAlign = 'left'
            ctx.restore()
        }
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angle)
        ctx.shadowColor = borderColor
        ctx.shadowBlur = 22
        ctx.strokeStyle = borderColor
        ctx.lineWidth = 3
        roundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14)
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.restore()
    }

    // Player 1 card angled right (+13°), player 2 angled left (-13°)
    await drawAngledCard(player1.card.image, 246, cardCy, 0.13, '#ff5050')
    await drawAngledCard(player2.card.image, 754, cardCy, -0.13, '#5080ff')

    // ─── VS text ─────────────────────────────────────────
    ctx.save()
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 28
    ctx.fillStyle = '#ffd700'
    ctx.font = `bold 58px ${family}`
    ctx.textAlign = 'center'
    ctx.fillText('VS', 500, 288)
    ctx.shadowBlur = 0
    ctx.textAlign = 'left'
    ctx.restore()

    // ─── Card names + stats ──────────────────────────────
    const statsY = 470

    ctx.fillStyle = '#ffffff'
    ctx.font = fitText(ctx, player1.card.name, 420, 20, family)
    ctx.fillText(player1.card.name, 30, statsY)

    ctx.fillStyle = '#ffffff'
    ctx.font = fitText(ctx, player2.card.name, 420, 20, family)
    ctx.fillText(player2.card.name, 538, statsY)

    ctx.fillStyle = '#ffd166'
    ctx.font = `bold 18px ${family}`
    ctx.fillText(`⚔ ATK: ${player1.card.atk ?? 'N/A'}`, 30, statsY + 28)
    ctx.fillText(`🛡 DEF: ${player1.card.def ?? 'N/A'}`, 30, statsY + 53)

    ctx.fillText(`⚔ ATK: ${player2.card.atk ?? 'N/A'}`, 538, statsY + 28)
    ctx.fillText(`🛡 DEF: ${player2.card.def ?? 'N/A'}`, 538, statsY + 53)

    // ─── Result banner ────────────────────────────────────
    const resultColor = result.winner === 1 ? '#ff5050' : result.winner === 2 ? '#5080ff' : '#ffd700'
    ctx.fillStyle = resultColor + '2a'
    roundedRect(ctx, 16, height - 88, width - 32, 72, 16)
    ctx.fill()
    ctx.strokeStyle = resultColor
    ctx.lineWidth = 2
    roundedRect(ctx, 16, height - 88, width - 32, 72, 16)
    ctx.stroke()

    const winText = result.winner === 1
        ? `🏆 WINNER: ${player1.username}`
        : result.winner === 2
        ? `🏆 WINNER: ${player2.username}`
        : `🤝 DRAW`

    ctx.fillStyle = '#ffffff'
    ctx.font = fitText(ctx, winText, width - 80, 28, family)
    ctx.textAlign = 'center'
    ctx.fillText(winText, width / 2, height - 54)

    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    ctx.font = `bold 17px ${family}`
    ctx.fillText(String(result.message || ''), width / 2, height - 24)
    ctx.textAlign = 'left'

    return canvas.toBuffer('image/png')
}

module.exports = {
    renderRankCard,
    renderSpotifyCard,
    renderPartyOverviewCard,
    renderPokemonDetailCard,
    renderPokemonMovesCard,
    renderYuBattleCard
}
