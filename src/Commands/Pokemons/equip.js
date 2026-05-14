const { getMegaStoneBag, removeMegaStoneQuantity } = require('../../Helpers/megaStoneBag')
const { getMegaStoneByKey } = require('../../Helpers/megaItems')

module.exports = {
  name: 'equip',
  aliases: ['equip'],
  exp: 0,
  cool: 3,
  react: '💎',
  category: 'pokemon',
  usage: 'DISABLED - Stones now auto-apply in battle',
  description: 'DISABLED - Stones now automatically apply when your Pokémon enters battle',

  async execute(client, arg, M) {
    return M.reply('⚠️ Stone equipping has been disabled. Stones now automatically apply when your Pokémon enters battle!')
    const prefix  = client.prefix || '-'
    const userKey = (await client.resolveNumber?.(M)) || client.getUserNumber?.(M) || M.sender.split('@')[0]
    const bag     = await getMegaStoneBag(client, userKey)

    // ── List mode ─────────────────────────────────────────────────────────────
    if (!arg || !arg.trim()) {
      if (!bag.length) {
        return M.reply(
          `💎 *Equip Bag — No Mega Stones or GMax Balls*\n\n` +
          `Buy them from the mart:\n` +
          `• *${prefix}shop megastones* — view all stones\n` +
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
      lines.push(`Use *${prefix}equip #N* to equip an item.`)
      lines.push(`⚠️ Only *one* stone can be active per party. Boost activates when battle starts.`)
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

    // Check: only ONE stone equipped per party at a time
    const alreadyEquipped = party.find(p => p.stoneEquipped)
    if (alreadyEquipped) {
      return M.reply(
        `⚠️ *Only one Mega Boost per party!*\n\n` +
        `*${client.utils.capitalize(alreadyEquipped.name)}* already has *${alreadyEquipped.stoneEquipped}* equipped.\n` +
        `Use *${prefix}unequip* to remove it first.`
      )
    }

    // Find the target Pokémon in the party
    let target = null
    if (stone.key === GMAX_BALL.key) {
      target = party.find(p => /-(gmax|gigantamax)$/i.test(p.name) && !p.stoneEquipped)
      if (!target) {
        return M.reply(
          `❌ No GMax Pokémon found in your party.\n\n` +
          `GMax Pokémon have names ending in *-gmax* (e.g. charizard-gmax, lapras-gmax).`
        )
      }
    } else {
      target = party.find(p => p.name?.toLowerCase() === stone.pokemon.toLowerCase() && !p.stoneEquipped)
      if (!target) {
        return M.reply(
          `❌ *${client.utils.capitalize(stone.pokemon)}* not found in your party.\n\n` +
          `You need *${client.utils.capitalize(stone.pokemon)}* to use *${stone.name}*.`
        )
      }
    }

    // Mark as equipped — stats will be applied temporarily at battle start
    target.stoneEquipped = stone.key
    target.megaBoosted   = true

    await client.poke.set(`${M.sender}_Party`, party)

    // Consume stone from bag
    await removeMegaStoneQuantity(client, userKey, stone.key, 1)

    // Build boost preview (what will happen in battle)
    const profile = stone.profile
    const fmtLine = (label, val, mult) => {
      if (mult <= 1.0) return `   ${label} *${val}* _(no change)_`
      return `   ${label} *${val}* → *${Math.floor(val * mult)}* (×${mult.toFixed(1)})`
    }
    const previewLines = [
      fmtLine('❤️  HP: ', target.hp,      profile.hp),
      fmtLine('⚡ ATK: ', target.attack,  profile.atk),
      fmtLine('🛡 DEF: ', target.defense, profile.def),
    ]
    if (target.speed != null) previewLines.push(fmtLine('💨 SPD: ', target.speed, profile.spd))

    return M.reply(
      `${stone.emoji} *${stone.name}* equipped to *${client.utils.capitalize(target.name)}*!\n` +
      `_${stone.note}_\n\n` +
      `📊 *Boost preview (activates when battle starts):*\n` +
      previewLines.join('\n') +
      `\n\n✅ Use *${prefix}unequip* to remove it at any time.`
    )
  }
}
