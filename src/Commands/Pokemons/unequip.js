const { addMegaStoneQuantity } = require('../../Helpers/megaStoneBag')
const { getMegaStoneByKey, GMAX_BALL } = require('../../Helpers/megaItems')

module.exports = {
  name: 'unequip',
  aliases: ['unequip'],
  exp: 0,
  cool: 3,
  react: '🔓',
  category: 'pokemon',
  usage: 'DISABLED - Stones now auto-apply in battle',
  description: 'DISABLED - Stones now automatically apply when your Pokémon enters battle',

  async execute(client, arg, M) {
    return M.reply('⚠️ Stone unequipping has been disabled. Stones now automatically apply when your Pokémon enters battle!')
    const prefix  = client.prefix || '-'
    const userKey = (await client.resolveNumber?.(M)) || client.getUserNumber?.(M) || M.sender.split('@')[0]
    const party   = (await client.poke.get(`${M.sender}_Party`)) || []

    const target = party.find(p => p.stoneEquipped)
    if (!target) {
      return M.reply(
        `❌ None of your Pokémon have a Mega Stone or GMax Ball equipped.\n\n` +
        `Use *${prefix}equip* to see your equippable items.`
      )
    }

    const stoneKey = target.stoneEquipped
    const stoneMeta = stoneKey === GMAX_BALL.key
      ? GMAX_BALL
      : getMegaStoneByKey(stoneKey)
    const stoneName = stoneMeta?.name || stoneKey

    // If the stone boost was applied mid-battle (has _stonePreBoost), restore stats
    if (target._stonePreBoost) {
      const pre = target._stonePreBoost
      if (target.hp > 0) {
        const hpRatio = (target.maxHp || 1) > 0 ? (target.hp / (target.maxHp || 1)) : 0
        target.hp = Math.max(1, Math.floor((pre.maxHp ?? pre.hp) * hpRatio))
      }
      target.attack  = pre.attack
      target.defense = pre.defense
      if (pre.speed      != null) target.speed      = pre.speed
      if (pre.maxHp      != null) target.maxHp      = pre.maxHp
      if (pre.maxAttack  != null) target.maxAttack  = pre.maxAttack
      if (pre.maxDefense != null) target.maxDefense = pre.maxDefense
      if (pre.maxSpeed   != null) target.maxSpeed   = pre.maxSpeed
      delete target._stonePreBoost
    }

    delete target.stoneEquipped
    delete target.megaBoosted

    await client.poke.set(`${M.sender}_Party`, party)

    // Return the stone to the bag
    await addMegaStoneQuantity(client, userKey, stoneKey, 1)

    return M.reply(
      `🔓 *${stoneName}* unequipped from *${client.utils.capitalize(target.name)}*.\n\n` +
      `Stone returned to your bag. Use *${prefix}equip* to re-equip it.`
    )
  }
}
