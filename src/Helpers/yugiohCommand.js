const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')

const resolveTarget = async (client, arg, M) => {
  if (M.quoted?.participant) {
    const quotedJid = M.quoted.participant
    const number = client.resolveNumber ? await client.resolveNumber(quotedJid) : normalizeNumber(quotedJid.split('@')[0])
    return { number, jid: `${number}@s.whatsapp.net` }
  }
  if (M.mentions?.length) {
    const mention = M.mentions[0]
    const number = client.resolveNumber ? await client.resolveNumber(mention) : normalizeNumber(mention.split('@')[0])
    return { number, jid: `${number}@s.whatsapp.net` }
  }
  const number = normalizeNumber(arg)
  return number ? { number, jid: `${number}@s.whatsapp.net` } : { number: '', jid: '' }
}

const getUserKey = (client, userOrMessage) => {
  if (client.getUserNumber) return client.getUserNumber(userOrMessage)
  if (typeof userOrMessage === 'string') return normalizeNumber(userOrMessage.split('@')[0])
  return normalizeNumber(String(userOrMessage?.sender || ''))
}

module.exports = {
  resolveTarget,
  getUserKey
}

