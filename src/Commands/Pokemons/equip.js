const { getMegaStoneBag, removeMegaStoneQuantity } = require('../../Helpers/megaStoneBag')
const { isMegaOrGmax } = require('../../Helpers/megaBoost')
const { GMAX_BALL } = require('../../Helpers/megaItems')

// Returns stat boost text lines for announcement
const buildStatLines = (poke, profile, cap) => {
  const lines = []
  const fmt = (label, base, mult) => {
    if (mult <= 1.0) return `   ${label}: *${base}*  _(no change)_`
    const boosted = Math.floor(base * mult)
    return `   ${label}: *${base}* → *${boosted}* (×${mult.toFixed(1)})`
  }
  lines.push(fmt('❤️  HP ',  poke.hp / (poke._preMult?.hp  || 1), profile.hp))
  lines.push(fmt('⚡ ATK',  poke.attack  / (poke._preMult?.atk || 1), profile.atk))
  lines.push(fmt('🛡 DEF',  poke.defense / (poke._preMult?.def || 1), profile.def))
  if (poke.speed != null)
    lines.push(fmt('💨 SPD',  poke.speed   / (poke._preMult?.spd || 1), profile.spd))
  return lines
}

module.exports = {
  name: 'equip',
  aliases: ['equip'],
  exp: 0,
  cool: 3,
  react: '💎',
  category: 'pokemon',
  usage: 'Use {prefix}equip  OR  {prefix}equip #N',
  description: 'Equip a Mega Stone or GMax Ball from your bag to boost a party Pokémon',

  async execute(client, arg, M) {
    const prefix = client.prefix || '-'
    const userKey = (await client.resolveNumber?.(M)) || client.getUserNumber?.(M) || M.sender.split('@')[0]

    const bag = await getMegaStoneBag(client, userKey)

    // ── List mode ─────────────────────────────────────────────────────────────
    if (!arg || !arg.trim()) {
      if (!bag.length) {
        return M.reply(
          `💎 *Equip Bag — No Mega Stones or GMax Balls*\n\n` +
          `Buy them from the mart:\n` +
          `• *${prefix}shop megastones* — view all Mega Stones\n` +
          `• *${prefix}mart-buy #ID* — purchase by ID`
        )
      }

      const lines = [`💎 *Your Equippable Items*\n`]
      bag.forEach((item, i) => {
        lines.push(
          `*#${i + 1}*  ${item.emoji} *${item.name}* (x${item.quantity})\n` +
          `   Pokémon: *${item.pokemon === 'gmax' ? 'Any GMax Pokémon' : client.utils.capitalize(item.pokemon)}*\n` +
          `   ${item.note}\n`
        )
      })
      lines.push(`Use *${prefix}equip #N* to equip an item to your matching party Pokémon.`)
      lines.push(`⚠️ Only *one* Mega Stone / GMax Ball can be active per party at a time.`)
      return M.reply(lines.join('\n'))
    }

    // ── Equip mode ────────────────────────────────────────────────────────────
    const numMatch = arg.trim().match(/^#?(\d+)$/)
    if (!numMatch) return M.reply(`Usage: *${prefix}equip #N* (e.g. ${prefix}equip #1)`)

    const idx = Number(numMatch[1]) - 1
    if (idx < 0 || idx >= bag.length) {
      return M.reply(`Item #${idx + 1} not found. Use *${prefix}equip* to see your bag.`)
    }

    const stone = bag[idx]
    const party = (await client.poke.get(`${M.sender}_Party`)) || []

    if (!party.length) return M.reply('Your party is empty.')

    // Check: only ONE mega stone / gmax ball active per party
    const alreadyBoosted = party.find(p => p.stoneEquipped)
    if (alreadyBoosted) {
      return M.reply(
        `⚠️ *Only one Mega Boost per party!*\n\n` +
        `*${client.utils.capitalize(alreadyBoosted.name)}* already has a stone equipped.\n` +
        `Remove or change your party before equipping another.`
      )
    }

    // Find the target Pokémon in the party
    let target = null
    if (stone.key === GMAX_BALL.key) {
      // GMax Ball: find any GMax Pokémon
      target = party.find(p => /-(gmax|gigantamax)$/i.test(p.name) && !p.stoneEquipped)
      if (!target) {
        return M.reply(
          `❌ No GMax Pokémon found in your party.\n\n` +
          `GMax Pokémon have names ending in *-gmax* (e.g. charizard-gmax, lapras-gmax).`
        )
      }
    } else {
      // Specific mega stone: find exact matching Pokémon
      target = party.find(p => p.name?.toLowerCase() === stone.pokemon.toLowerCase() && !p.stoneEquipped)
      if (!target) {
        return M.reply(
          `❌ *${client.utils.capitalize(stone.pokemon)}* not found in your party.\n\n` +
          `You need *${client.utils.capitalize(stone.pokemon)}* in your party to use the *${stone.name}*.`
        )
      }
    }

    // Apply the boost profile
    const profile = stone.profile
    const before  = { hp: target.hp, atk: target.attack, def: target.defense, spd: target.speed }

    target.hp      = Math.floor((target.hp      || 0) * profile.hp)
    target.attack  = Math.floor((target.attack  || 0) * profile.atk)
    target.defense = Math.floor((target.defense || 0) * profile.def)
    if (target.speed != null) target.speed = Math.floor(target.speed * profile.spd)

    if (target.maxHp      != null) target.maxHp      = Math.floor(target.maxHp      * profile.hp)
    if (target.maxAttack  != null) target.maxAttack  = Math.floor(target.maxAttack  * profile.atk)
    if (target.maxDefense != null) target.maxDefense = Math.floor(target.maxDefense * profile.def)
    if (target.maxSpeed   != null) target.maxSpeed   = Math.floor(target.maxSpeed   * profile.spd)

    target.stoneEquipped = stone.key
    target.megaBoosted   = true

    // Save updated party
    await client.poke.set(`${M.sender}_Party`, party)

    // Deduct stone from bag
    await removeMegaStoneQuantity(client, userKey, stone.key, 1)

    // Build announcement
    const statLines = []
    const fmtStat = (label, pre, post, mult) => {
      if (mult <= 1.0) return `   ${label} *${pre}* _(no change)_`
      return `   ${label} *${pre}* → *${post}* (×${mult.toFixed(1)})`
    }
    statLines.push(fmtStat('❤️  HP: ', before.hp,  target.hp,      profile.hp))
    statLines.push(fmtStat('⚡ ATK: ', before.atk, target.attack,  profile.atk))
    statLines.push(fmtStat('🛡 DEF: ', before.def, target.defense, profile.def))
    if (before.spd != null)
      statLines.push(fmtStat('💨 SPD: ', before.spd, target.speed, profile.spd))

    return M.reply(
      `${stone.emoji} *Mega Boost Activated!*\n\n` +
      `*${client.utils.capitalize(target.name)}* equipped *${stone.name}*!\n` +
      `_${stone.note}_\n\n` +
      `*📊 Stats upgraded to:*\n` +
      statLines.join('\n') +
      `\n\n✅ Stats permanently saved to your party.`
    )
  }
}
