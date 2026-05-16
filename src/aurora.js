require('dotenv').config()
const { join } = require('path')
const { readdirSync, mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } = require('fs')
const { createInterface } = require('readline')
const chalk = require('chalk')
const { Boom } = require('@hapi/boom')
const {
    default: Baileys,
    makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    jidNormalizedUser
} = require('@whiskeysockets/baileys')
const { QuickDB, JSONDriver } = require('quick.db')
const { MongoDriver } = require('quickmongo')
const { Collection } = require('discord.js')
//handlers
const MessageHandler = require('./Handlers/Message')
const CardHandler = require('./Handlers/card')
const PokeHandler = require('./Handlers/pokemon')
const DungeonHandler = require('./Handlers/dungeon')
const YugiohHandler = require('./Handlers/yugioh')
const EventsHandler = require('./Handlers/Events')
const econ = require("./Database/Models/economy")
const cardMap = new Map()
const yuMap = new Map()
const contact = require('./Structures/Contact')
const utils = require('./Structures/Functions')
const YT = require('./lib/YT')
const express = require("express");
const app = express();
const { imageSync } = require('qr-image')
const mongoose = require('mongoose')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const { Readable } = require('stream')

const mongoUri = process.env.URL || process.env.MONGO_URI
const driver = mongoUri ? new MongoDriver(mongoUri) : null
const port = process.env.PORT || 3000
const sessionDir = process.env.SESSION_DIR || join(process.cwd(), 'session')
const logsDir = join(process.cwd(), 'logs')
const whatsappLogFile = join(logsDir, 'whatsapp.log')
const quickDbPath = join(__dirname, '..', 'quickdb.json')
const normalizeNumber = (value = '') => String(value).replace(/\D/g, '')
const OWNER_NUMBER = normalizeNumber(process.env.OWNER || '2347049044897')
const DEFAULT_MODS = Array.from(
    new Set(
        [OWNER_NUMBER, ...(process.env.MODS || '').split(',').map(normalizeNumber)].filter(Boolean)
    )
)

const cardResponse = new Map();
const auctionResponse = new Map();
const pokemonMap = new Map();
const sellResponse = new Map();
const pokemonMoveLearningMap = new Map();
const evoMap = new Map();
const m1 = new Map();
const m2 = new Map();

mkdirSync(sessionDir, { recursive: true })
mkdirSync(logsDir, { recursive: true })

// ─── Auth helpers ───────────────────────────────────────────────────────────

const ask = (rl, question) => new Promise(resolve => rl.question(question, resolve))

const writeBase64Session = (b64) => {
    try {
        const decoded = Buffer.from(b64.trim(), 'base64').toString('utf8')
        const files = JSON.parse(decoded)
        if (typeof files !== 'object' || Array.isArray(files)) throw new Error('Invalid session format')
        for (const [filename, content] of Object.entries(files)) {
            const dest = join(sessionDir, filename)
            writeFileSync(dest, typeof content === 'string' ? content : JSON.stringify(content), 'utf8')
        }
        return true
    } catch (e) {
        console.error('Could not decode session:', e.message)
        return false
    }
}

const readBase64Session = () => {
    try {
        const files = {}
        for (const file of readdirSync(sessionDir)) {
            files[file] = readFileSync(join(sessionDir, file), 'utf8')
        }
        return Buffer.from(JSON.stringify(files)).toString('base64')
    } catch (_) {
        return null
    }
}


const isSessionRegistered = () => {
    try {
        const credsPath = join(sessionDir, 'creds.json')
        if (!existsSync(credsPath)) return false
        const creds = JSON.parse(readFileSync(credsPath, 'utf8'))
        
        // A session is valid if creds exist and either:
        // - registered flag is true, OR
        // - me is set (device has been successfully paired before)
        const hasValidCreds = creds?.registered === true || (creds?.me?.id != null)
        if (!hasValidCreds) return false

        // Also ensure at least one key file exists alongside creds (any .json besides creds itself)
        const files = readdirSync(sessionDir).filter(f => f.endsWith('.json') && f !== 'creds.json')
        return files.length > 0
    } catch (_) {
        return false
    }
}

let _menuShown = false
const showAuthMenu = async () => {
    if (_menuShown) return null
    _menuShown = true

    // ── Auto-pairing via env var (no interactive prompt needed) ──────────────
    const envPhone = process.env.PAIRING_PHONE ? normalizeNumber(process.env.PAIRING_PHONE) : null
    if (envPhone) {
        console.log(`\n📱 Auto-pairing with number: +${envPhone}`)
        return { method: 'pairing', phone: envPhone }
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout })

    const botName = process.env.NAME || 'Aurora'
    console.log(`\n╔══════════════════════════════════╗`)
    console.log(`║    ${botName.padEnd(29)}║`)
    console.log(`╠══════════════════════════════════╣`)
    console.log(`║  Choose how to connect:          ║`)
    console.log(`║  1. QR Code (scan with phone)    ║`)
    console.log(`║  2. Pairing Code                 ║`)
    console.log(`║  3. Paste Base64 Session ID      ║`)
    console.log(`╚══════════════════════════════════╝`)

    const raw = (await ask(rl, '\nEnter choice (1 / 2 / 3): ')).trim()

    if (raw === '3') {
        let validSession = false
        let b64 = ''
        
        while (!validSession) {
            console.log('\nPaste your Base64-encoded session string below, then press Enter:')
            console.log('(This should be the full encoded session from a previous connection)')
            b64 = (await ask(rl, '> ')).trim()
            
            if (!b64) {
                console.log('❌ Session string cannot be empty. Try again.')
                continue
            }
            
            if (!isValidBase64(b64)) {
                console.log('❌ Invalid Base64 format. Make sure you copy the entire string correctly.')
                continue
            }
            
            validSession = true
        }
        
        rl.close()
        return { method: 'base64', data: b64 }
    }

    if (raw === '2') {
        console.log('\nEnter the phone number you want to link.')
        console.log('Include the country code, no + or spaces.')
        console.log('Example: 2347055517860')
        const phone = (await ask(rl, '> ')).trim()
        rl.close()
        return { method: 'pairing', phone: normalizeNumber(phone) }
    }

    rl.close()
    return { method: 'qr' }
}

// Helper to validate base64 format
const isValidBase64 = (str) => {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str
    } catch (_) {
        return false
    }
}

// Only write Baileys debug/info logs to the file; show only warn+ in the console
// so the interactive auth menu isn't drowned in protocol noise.
const waLogger = P(
    { level: 'silent' },    // suppress all pino output
    P.destination(whatsappLogFile) // full debug goes to the log file
)

const clearSessionFolder = () => {
    rmSync(sessionDir, { recursive: true, force: true })
    mkdirSync(sessionDir, { recursive: true })
}

const start = async (authChoice = null) => {
    await mongoose.connect(process.env.URL);

    // Option 3: write the base64 session files before loading auth state
    if (authChoice?.method === 'base64') {
        const ok = writeBase64Session(authChoice.data)
        if (!ok) {
            console.log('❌ Invalid base64 session.')
            clearSessionFolder()
            _menuShown = false  // Reset menu flag to allow retry
            console.log('🔄 Deleted invalid session. Please try again...')
            setTimeout(async () => {
                const newChoice = await showAuthMenu()
                return start(newChoice)
            }, 1000)
            return
        } else {
            console.log('✅ Session decoded successfully — connecting...')
            authChoice = null // treat as already-registered from now on
        }
    }

    const useQR = authChoice?.method === 'qr'
    const usePairing = authChoice?.method === 'pairing'
    const pairingPhone = authChoice?.phone || ''

    const { saveCreds, state } = await useMultiFileAuthState(sessionDir)
    const { version } = await fetchLatestBaileysVersion()

    const client = makeWASocket({
        version,
        auth: { 
            creds: state.creds, 
            keys: makeCacheableSignalKeyStore(state.keys, waLogger)
        },
        logger: waLogger,
        browser: Browsers.macOS('Chrome'),
        printQRInTerminal: useQR,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
        maxRetries: 3
    })

    //Config
    client.name = process.env.NAME || 'Aurora'
    client.brand = process.env.BRAND || 'Eternal by VEN domain'
    client.prefix = process.env.PREFIX || '-'
    client.altPrefix = process.env.ALT_PREFIX || '#'
    client.meLid = state?.creds?.me?.lid || null
    client.mePn = state?.creds?.me?.id || null
    
    // Store auth choice in client for reconnection
    client._authChoice = { useQR, usePairing, pairingPhone }

    client.log = (text, color = 'green') =>
        color ? console.log(chalk.keyword(color)(text)) : console.log(chalk.green(text))
    client.sessionDir = sessionDir
    client.logFile = whatsappLogFile

    // Baileys media expects:
    // - Buffer (raw bytes)
    // - { url: 'https://...' | '/path/to/file' | 'data:...' }
    // - { stream: Readable }
    // Some commands in this repo accidentally pass `{ url: <Buffer> }` or a raw Readable.
    // Normalize those shapes before calling Baileys.
    const rawSendMessage = client.sendMessage.bind(client)
    client.sendMessage = async (jid, content, options) => {
        if (content && typeof content === 'object') {
            const fixed = { ...content }
            for (const key of ['image', 'video', 'audio', 'document', 'sticker']) {
                const value = fixed[key]
                if (!value) continue

                // If someone passed a raw Readable, wrap it.
                if (typeof value === 'object' && typeof value.pipe === 'function' && !Buffer.isBuffer(value)) {
                    fixed[key] = { stream: value }
                    continue
                }

                // If someone passed `{ url: <Buffer> }`, convert to a raw Buffer so Baileys treats it as bytes.
                if (typeof value === 'object' && 'url' in value && Buffer.isBuffer(value.url)) {
                    fixed[key] = value.url
                    continue
                }

                // If someone passed `{ url: <Readable> }`, wrap as `{ stream }`.
                if (typeof value === 'object' && 'url' in value && value.url && typeof value.url.pipe === 'function') {
                    fixed[key] = { stream: value.url }
                    continue
                }
            }
            return rawSendMessage(jid, fixed, options)
        }
        return rawSendMessage(jid, content, options)
    }

    // Expose the raw send so commands can bypass the media-normalization wrapper (e.g. delete).
    client._rawSendMessage = rawSendMessage

    // Small helper for moderation: delete a message by quoted key/id.
    // Baileys deletes via `sendMessage(jid, { delete: key })`.
    client.deleteMessage = async (jid, keyOrId, participant) => {
        if (!jid) throw new Error('Missing jid')
        if (!keyOrId) throw new Error('Missing message key/id')

        const key =
            typeof keyOrId === 'object'
                ? keyOrId
                : {
                      remoteJid: jid,
                      id: String(keyOrId),
                      fromMe: false,
                      ...(participant ? { participant } : {})
                  }
        return rawSendMessage(jid, { delete: key })
    }

    //Database
    const dbDriver = driver || new JSONDriver(quickDbPath)
    if (!driver) {
        console.warn('⚠️  No MongoDB URI found. Falling back to local JSON database storage. Set URL or MONGO_URI to use MongoDB.')
    }
    client.DB = new QuickDB({
        // Pin the DB storage driver so restarts (pm2/codespaces) don't silently create a new DB elsewhere.
        driver: dbDriver
    })
    client.roleDB = new QuickDB({
        // Keep role/state metadata local in JSON, while all user data persists to Mongo.
        driver: new JSONDriver(quickDbPath)
    })

    const migrateQuickDbToMongo = async () => {
        if (!driver) return
        const MIGRATION_FLAG = 'migration:quickdb-to-mongo'
        const alreadyMigrated = await client.DB.get(MIGRATION_FLAG).catch(() => null)
        if (alreadyMigrated) return

        const localEntries = await client.roleDB.all().catch(() => [])
        const skipPatterns = [/^owner$/, /^mods$/, /^sudo$/, /^coowner$/, /^mods-removed$/, /^mod-name-/, /^sudo-name-/, /^coowner-name-/]
        let migrated = 0

        if (Array.isArray(localEntries)) {
            for (const item of localEntries) {
                const key = String(item?.id || '')
                if (!key) continue
                if (skipPatterns.some((re) => re.test(key))) continue
                if (key === MIGRATION_FLAG) continue

                const value = item.value
                const exists = await client.DB.get(key).catch(() => undefined)
                const shouldUpdate = exists === undefined || exists === null || JSON.stringify(exists) !== JSON.stringify(value)
                if (shouldUpdate) {
                    await client.DB.set(key, value).catch(() => null)
                    migrated++
                }
            }
        }

        await client.DB.set(MIGRATION_FLAG, true).catch(() => null)
        if (migrated > 0) {
            client.log(`Migrated ${migrated} quickdb entries to MongoDB.`, 'yellow')
        }
    }

    await migrateQuickDbToMongo()

    //Tables
    client.contactDB = client.DB.table('contacts')

    //Contacts
    client.contact = contact
    client.cardMap = cardMap
    client.yuMap = yuMap
    //Experience
    client.exp = client.DB.table('experience')

    //Cards
    client.cards = client.DB.table('card')

    //ecnomy 
    client.econ = econ

    //backgroungs
    client.bg = client.DB.table('bg')

    //evets
    client.poke = client.DB.table('poke')

    //Commands
    client.cmd = new Collection()

    const storedOwner = normalizeNumber((await client.roleDB.get('owner')) || OWNER_NUMBER)
    const storedMods = ((await client.roleDB.get('mods')) || []).map(normalizeNumber).filter(Boolean)
    const storedOfficers = ((await client.roleDB.get('sudo')) || []).map(normalizeNumber).filter(Boolean)
    const storedCoOwners = ((await client.roleDB.get('coowner')) || []).map(normalizeNumber).filter(Boolean)
    const removedMods = new Set(((await client.roleDB.get('mods-removed')) || []).map(normalizeNumber).filter(Boolean))
    client.owner = storedOwner
    // `mods` remain the "mods" role. Officers are a separate role with limited privileges.
    // The owner is always a mod and cannot be removed; everyone else can be removed via delmod
    // (which adds them to the `mods-removed` deny-list so DEFAULT_MODS doesn't re-add them).
    const mergedMods = Array.from(new Set([client.owner, ...DEFAULT_MODS, ...storedMods]))
        .filter((n) => n === client.owner || !removedMods.has(n))
    client.mods = mergedMods
    client.officers = Array.from(new Set(storedOfficers.filter((x) => x && x !== client.owner)))
    client.coOwners = Array.from(new Set(storedCoOwners.filter((x) => x && x !== client.owner && !client.officers.includes(x))))
    await client.roleDB.set('owner', client.owner)
    await client.roleDB.set('mods', client.mods)
    await client.roleDB.set('sudo', client.officers)
    await client.roleDB.set('coowner', client.coOwners)
    client.normalizeNumber = normalizeNumber
    client.getIdentityNumbers = (value = '') => {
        const candidates = Array.isArray(value)
            ? value
            : value && typeof value === 'object'
                ? [value.sender, value.senderNumber, ...(value.senderAltIds || [])]
                : [value]

        return Array.from(
            new Set(
                candidates
                    .filter(Boolean)
                    .map((entry) => normalizeNumber(String(entry).split('@')[0]))
                    .filter(Boolean)
            )
        )
    }
    client.isOwner = (value = '') => client.getIdentityNumbers(value).includes(client.owner)
    client.isOfficer = (value = '') => {
        const identities = client.getIdentityNumbers(value)
        return identities.some((identity) => (client.officers || []).includes(identity))
    }
    client.isCoOwner = (value = '') => {
        const identities = client.getIdentityNumbers(value)
        return identities.some((identity) => (client.coOwners || []).includes(identity))
    }
    client.isMod = (value = '') => {
        const identities = client.getIdentityNumbers(value)
        return identities.some((identity) => client.mods.includes(identity))
    }
    client.isStaff = (value = '') => client.isOwner(value) || client.isMod(value) || client.isOfficer(value) || client.isCoOwner(value)
    client.getUserNumber = (value = '') => {
        if (value && typeof value === 'object') {
            const digits = normalizeNumber(value.senderNumber || value.sender || value.userId || '')
            return digits || normalizeNumber(String(value).split('@')[0])
        }
        return normalizeNumber(String(value).split('@')[0])
    }
    client.resolveNumber = async (value = '') => {
        const raw = value && typeof value === 'object' ? (value.sender || value.userId || '') : String(value || '')
        const jid = String(raw).trim()
        const digits = normalizeNumber(jid.split('@')[0])
        if (!digits) return ''
        if (jid.endsWith('@lid')) {
            const mapped = normalizeNumber((await client.DB.get(`lid-map-${digits}`)) || '')
            return mapped || digits
        }
        return digits
    }
    client.getEcon = async (value = '', { createIfMissing = false } = {}) => {
        const number = client.getUserNumber(value)
        const rawSender = value && typeof value === 'object' ? value.sender : value
        const rawSenderStr = String(rawSender || '')
        const isLid = rawSenderStr.endsWith('@lid')
        let mappedNumber = ''
        if (isLid) {
            const lidDigits = normalizeNumber(rawSenderStr.split('@')[0])
            mappedNumber = normalizeNumber((await client.DB.get(`lid-map-${lidDigits}`)) || '')
        }
        const candidates = Array.from(
            new Set(
                [
                    number,
                    number ? `${number}@s.whatsapp.net` : null,
                    number ? `${number}@lid` : null,
                    mappedNumber,
                    mappedNumber ? `${mappedNumber}@s.whatsapp.net` : null,
                    mappedNumber ? `${mappedNumber}@lid` : null,
                    rawSender
                ]
                    .filter(Boolean)
                    .map((x) => String(x))
            )
        )
        let doc = await client.econ.findOne({ userId: { $in: candidates } })
        if (!doc && createIfMissing) {
            doc = await client.econ.create({ userId: mappedNumber || number || String(rawSender || '') })
        }
        // Best-effort migrate to stable numeric id (prefer mapped phone number over LID digits).
        const stable = mappedNumber || number
        if (doc && stable && doc.userId !== stable) {
            doc.userId = stable
            await doc.save().catch(() => null)
        }
        return doc
    }

    // Pokemon storage naming:
    // Historically this repo used PSS keys with inconsistent casing (`_PSS` vs `_Pss`).
    // We standardize on `_PC` but still read/migrate old keys automatically.
    client.getPc = async (user) => {
        const u = String(user || '').trim()
        if (!u) return []
        const pc =
            (await client.poke.get(`${u}_PC`).catch(() => null)) ||
            (await client.poke.get(`${u}_PSS`).catch(() => null)) ||
            (await client.poke.get(`${u}_Pss`).catch(() => null)) ||
            []

        // Best-effort migrate to the canonical key.
        if (Array.isArray(pc)) {
            await client.poke.set(`${u}_PC`, pc).catch(() => null)
            await client.poke.set(`${u}_PSS`, pc).catch(() => null) // keep backwards compatibility
            if (await client.poke.get(`${u}_Pss`).catch(() => null)) {
                await client.poke.delete(`${u}_Pss`).catch(() => null)
            }
            return pc
        }
        return []
    }
    client.setPc = async (user, pc) => {
        const u = String(user || '').trim()
        if (!u) return
        const value = Array.isArray(pc) ? pc : []
        await client.poke.set(`${u}_PC`, value).catch(() => null)
        await client.poke.set(`${u}_PSS`, value).catch(() => null) // backwards compatibility
        await client.poke.delete(`${u}_Pss`).catch(() => null)
    }
    client.refreshRoles = async () => {
        const owner = normalizeNumber((await client.roleDB.get('owner')) || client.owner || OWNER_NUMBER)
        const mods = ((await client.roleDB.get('mods')) || []).map(normalizeNumber).filter(Boolean)
        const sudo = ((await client.roleDB.get('sudo')) || []).map(normalizeNumber).filter(Boolean)
        const coowner = ((await client.roleDB.get('coowner')) || []).map(normalizeNumber).filter(Boolean)
        const removed = new Set(((await client.roleDB.get('mods-removed')) || []).map(normalizeNumber).filter(Boolean))
        client.owner = owner
        client.mods = Array.from(new Set([owner, ...DEFAULT_MODS, ...mods]))
            .filter((n) => n === owner || !removed.has(n))
        client.officers = Array.from(new Set(sudo.filter((x) => x && x !== owner)))
        client.coOwners = Array.from(new Set(coowner.filter((x) => x && x !== owner && !client.officers.includes(x))))
        await client.roleDB.set('owner', client.owner)
        await client.roleDB.set('mods', client.mods)
        await client.roleDB.set('sudo', client.officers)
        await client.roleDB.set('coowner', client.coOwners)
        return { owner: client.owner, mods: client.mods, officers: client.officers, coOwners: client.coOwners }
    }

    //Utils
    client.utils = utils

    //YT gif
    client.YT = YT;

    //groups
    client.getAllGroups = async () => Object.keys(await client.groupFetchAllParticipating())
    client.cardMap = cardResponse;
    client.aucMap = auctionResponse;
    client.sellMap = sellResponse;
    client.pokemonResponse = pokemonMap;
    client.pokemonMoveLearningResponse = pokemonMoveLearningMap;
    client.pokemonEvolutionResponse = evoMap;
    client.pokemonBattleResponse = m1
    client.pokemonBattlePlayerMap = m2

    // Battle persistence + inactivity timeout.
    // Requirement: if the bot restarts mid-battle, it should continue; after 10 minutes of inactivity, cancel.
    client.BATTLE_TIMEOUT_MS = 10 * 60 * 1000
    const battleKey = (jid) => `battle:${jid}`
    const battleIndexKey = 'battle:index'

    const readBattleIndex = async () => {
        const list = (await client.DB.get(battleIndexKey)) || []
        return Array.isArray(list) ? list.filter(Boolean) : []
    }

    const writeBattleIndex = async (list) => client.DB.set(battleIndexKey, Array.from(new Set(list.filter(Boolean))))

    client.persistBattleSync = (jid, battle) => {
        try {
            if (!jid || !battle) return
            const now = Date.now()
            battle.lastActivityAt = now
            battle.expiresAt = now + client.BATTLE_TIMEOUT_MS

            client.pokemonBattleResponse.set(jid, battle)
            client.DB.set(battleKey(jid), battle).catch(() => null)
            readBattleIndex()
                .then((list) => writeBattleIndex([...list, jid]))
                .catch(() => null)
        } catch (_) {
            // ignore persistence errors
        }
    }

    client.unpersistBattleSync = (jid) => {
        try {
            if (!jid) return
            client.pokemonBattleResponse.delete(jid)
            client.DB.delete(battleKey(jid)).catch(() => null)
            readBattleIndex()
                .then((list) => writeBattleIndex(list.filter((x) => x !== jid)))
                .catch(() => null)
        } catch (_) {
            // ignore
        }
    }

    client.restoreBattles = async () => {
        const list = await readBattleIndex()
        const keep = []
        for (const jid of list) {
            const battle = await client.DB.get(battleKey(jid)).catch(() => null)
            if (!battle || typeof battle !== 'object') continue
            if (battle.expiresAt && Date.now() > Number(battle.expiresAt)) continue

            client.pokemonBattleResponse.set(jid, battle)
            // Restore player->group mapping to prevent users joining multiple battles.
            const players = Array.isArray(battle.players)
                ? battle.players
                : [battle.player1?.user, battle.player2?.user].filter(Boolean)
            for (const p of players) {
                if (!p || String(p).endsWith('@pokemon')) continue
                client.pokemonBattlePlayerMap.set(p, jid)
            }
            keep.push(jid)
        }
        await writeBattleIndex(keep).catch(() => null)
        return keep.length
    }

    client.cancelExpiredBattles = async () => {
        const list = await readBattleIndex()
        if (!list.length) return

        for (const jid of list) {
            const battle = client.pokemonBattleResponse.get(jid) || (await client.DB.get(battleKey(jid)).catch(() => null))
            if (!battle || typeof battle !== 'object') {
                client.unpersistBattleSync(jid)
                continue
            }
            if (battle.isDungeon && battle.dungeonExpiresAt && Date.now() > Number(battle.dungeonExpiresAt)) {
                const players = Array.isArray(battle.players)
                    ? battle.players
                    : [battle.player1?.user, battle.player2?.user].filter(Boolean)
                for (const p of players) {
                    if (!p || String(p).endsWith('@pokemon')) continue
                    client.pokemonBattlePlayerMap.delete(p)
                }
                if (battle.wildUser) {
                    await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
                }
                client.unpersistBattleSync(jid)
                await client.DB.delete(`ashen-active-${jid}`).catch(() => null)
                await client.DB.set(`ashen-last-${jid}`, Date.now()).catch(() => null)
                if (client.state === 'open') {
                    await client.sendMessage(jid, { text: '🔥 Ashen Sanctum closed after 40 minutes.' }).catch(() => null)
                }
                continue
            }
            if (battle.isDungeon && battle.dungeonClosesAt && Date.now() > Number(battle.dungeonClosesAt)) {
                const players = Array.isArray(battle.players)
                    ? battle.players
                    : [battle.player1?.user, battle.player2?.user].filter(Boolean)
                for (const p of players) {
                    if (!p || String(p).endsWith('@pokemon')) continue
                    client.pokemonBattlePlayerMap.delete(p)
                }
                if (battle.wildUser) {
                    await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
                }
                client.unpersistBattleSync(jid)
                if (client.state === 'open') {
                    await client.sendMessage(jid, { text: '🔥 Ashen Sanctum has closed due to the 40-minute time limit.' }).catch(() => null)
                }
                continue
            }

            if (battle.expiresAt && Date.now() <= Number(battle.expiresAt)) continue

            // Cleanup maps
            const players = Array.isArray(battle.players)
                ? battle.players
                : [battle.player1?.user, battle.player2?.user].filter(Boolean)
            for (const p of players) {
                if (!p || String(p).endsWith('@pokemon')) continue
                client.pokemonBattlePlayerMap.delete(p)
            }

            // Cleanup wild/dungeon party storage
            if (battle.wildUser) {
                await client.poke.delete(`${battle.wildUser}_Party`).catch(() => null)
            }

            client.unpersistBattleSync(jid)

            // Notify chat if we are connected
            if (client.state === 'open') {
                const msg = battle.isDungeon
                    ? '🔥 Ashen Sanctum ended because nobody made a move for 10 minutes.'
                    : battle.mode === 'wild'
                    ? `The wild *${client.utils.capitalize(battle.player2?.activePokemon?.name || 'Pokemon')}* fled because nobody made a move for 10 minutes.`
                    : 'This Pokemon battle was cancelled due to 10 minutes of inactivity.'
                await client.sendMessage(jid, { text: msg }).catch(() => null)
            }
        }
    }

    //user
    client.getAllUsers = async () => {
        const data = (await client.contactDB.all()).map((x) => x.id)
        const users = data.filter((element) => /^\d+@s$/.test(element)).map((element) => `${element}.whatsapp.net`)
        return users
    }

    //Command Loader
    const loadCommands = async () => {
        const readCommand = (rootDir) => {
            let dirs
            try { dirs = readdirSync(rootDir) } catch (_) { dirs = [] }
            for (const $dir of dirs) {
                let commandFiles
                try {
                    commandFiles = readdirSync(join(rootDir, $dir)).filter((file) => file.endsWith('.js'))
                } catch (_) {
                    // $dir is a file (e.g. README.md at root) — skip silently
                    continue
                }
                for (let file of commandFiles) {
                    try {
                        const command = require(join(rootDir, $dir, file))
                        if (command && command.name) {
                            client.cmd.set(command.name, command)
                        } else {
                            client.log(`⚠️ Command file ${file} has no exported name — skipping`, 'yellow')
                        }
                    } catch (err) {
                        client.log(`⚠️ Failed to load command ${file}: ${err.message} — ${err.stack?.split('\n')[1] || ''}`, 'red')
                    }
                }
            }
            client.log('Commands loaded!')
        }
        readCommand(join(__dirname, '.', 'Commands'))
    }

    //connection updates
    let _pairingCodeRequested = false
    let _pairingCodeTimeout = null
    let _reconnectAttempts = 0
    const PAIRING_TIMEOUT = 5 * 60 * 1000  // 5 minutes
    const MAX_RECONNECT_ATTEMPTS = 10
    
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, isNewLogin, qr } = update

        // Handle pairing code request when QR is generated and not yet registered
        if (qr && client._authChoice?.usePairing && client._authChoice?.pairingPhone && !_pairingCodeRequested) {
            _pairingCodeRequested = true
            
            try {
                // Wait before requesting to ensure socket is ready
                await delay(1500)
                
                // Check if already registered (from previous session)
                if (client.authState?.creds?.registered) {
                    console.log('✅ Already registered with existing credentials')
                    return
                }
                
                console.log('📱 Requesting pairing code...')
                const pairingCode = await client.requestPairingCode(client._authChoice.pairingPhone)
                
                if (!pairingCode) {
                    throw new Error('No code received from WhatsApp server')
                }
                
                const pretty = pairingCode?.match(/.{1,4}/g)?.join('-') || pairingCode
                const botName = process.env.NAME || 'Aurora'
                console.log(`\n╔══════════════════════════════════╗`)
                console.log(`║  ${botName} — Pairing Code`.padEnd(35) + '║')
                console.log(`╠══════════════════════════════════╣`)
                console.log(`║  Phone : +${client._authChoice.pairingPhone.padEnd(23)}║`)
                console.log(`║  Code  : ${pretty.padEnd(24)}║`)
                console.log(`╠══════════════════════════════════╣`)
                console.log(`║  Steps on your phone:            ║`)
                console.log(`║  1. Open WhatsApp                ║`)
                console.log(`║  2. Settings → Linked Devices    ║`)
                console.log(`║  3. Tap "Link a Device"          ║`)
                console.log(`║  4. "Link with phone number"     ║`)
                console.log(`║  5. Enter the code above         ║`)
                console.log(`╠══════════════════════════════════╣`)
                console.log(`║  ⚠ Code expires in ~60 seconds. ║`)
                console.log(`║  ⚠ Complete pairing on phone.    ║`)
                console.log(`╚══════════════════════════════════╝\n`)
                
                // Set timeout for pairing session
                _pairingCodeTimeout = setTimeout(async () => {
                    if (!client.authState?.creds?.registered) {
                        console.error('❌ Pairing timeout - took too long to complete')
                        clearSessionFolder()
                        _menuShown = false
                        const choice = await showAuthMenu()
                        start(choice)
                    }
                }, PAIRING_TIMEOUT)
                
            } catch (error) {
                console.error(`❌ Pairing code error: ${error?.message || error}`)
                if (!client.authState?.creds?.registered) {
                    clearSessionFolder()
                    _menuShown = false
                    _pairingCodeRequested = false
                    setTimeout(async () => {
                        const choice = await showAuthMenu()
                        start(choice)
                    }, 2000)
                }
            }
        } else if (qr && client._authChoice?.useQR) {
            // Show QR if that method was chosen
            qrcode.generate(qr, { small: true })
        }

        // Detect successful pairing
        if (isNewLogin) {
            console.log('🔐 Device paired successfully via pairing code!')
            if (_pairingCodeTimeout) {
                clearTimeout(_pairingCodeTimeout)
                _pairingCodeTimeout = null
            }
            _reconnectAttempts = 0 // Reset on successful connection
        }

        if (connection === 'close') {
            const { statusCode } = new Boom(lastDisconnect?.error).output
            
            if (statusCode === DisconnectReason.loggedOut) {
                // Session was logged out - ask to repair
                console.log('📱 Session was logged out from another device')
                console.log('🔧 Attempting to repair session...')
                
                clearSessionFolder()
                
                // Try to repair by showing pairing menu if we have a phone number
                const storedPhone = client._authChoice?.pairingPhone
                if (storedPhone) {
                    console.log(`📞 Attempting to repair with phone: +${storedPhone}`)
                    _menuShown = false
                    _pairingCodeRequested = false
                    const repairChoice = { method: 'pairing', phone: storedPhone }
                    setTimeout(async () => {
                        start(repairChoice)
                    }, 2000)
                } else {
                    // No stored phone, show full menu
                    _menuShown = false
                    _pairingCodeRequested = false
                    console.log('🔄 Session logged out. Please authenticate again...')
                    setTimeout(async () => {
                        const choice = await showAuthMenu()
                        start(choice)
                    }, 2000)
                }
            } else {
                // Other disconnection reason - could be invalid session or temporary issue
                _reconnectAttempts++
                
                if (_reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    // Only wipe the session if creds are not registered (truly invalid)
                    if (!isSessionRegistered()) {
                        console.log('❌ Session appears invalid after multiple connection attempts')
                        clearSessionFolder()
                        client.log('Session invalid. Please authenticate with a new session.', 'red')
                        _menuShown = false
                        _pairingCodeRequested = false
                        _reconnectAttempts = 0
                        console.log('🔄 Starting new authentication...')
                        setTimeout(async () => {
                            const choice = await showAuthMenu()
                            start(choice)
                        }, 2000)
                    } else {
                        // Session is still valid — keep retrying without wiping
                        console.log(`📡 Many reconnect attempts but session looks valid — continuing to retry...`)
                        _reconnectAttempts = 0
                        _pairingCodeRequested = false
                        setTimeout(() => start(), 5000)
                    }
                } else {
                    // Try reconnecting
                    console.log(`📡 Connection lost (attempt ${_reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) - Reconnecting in 3 seconds...`)
                    _pairingCodeRequested = false
                    setTimeout(() => start(), 3000)
                }
            }
        }
        
        if (connection === 'connecting') {
            client.state = 'connecting'
            console.log('⏳ Connecting to WhatsApp...')
        }
        
        if (connection === 'open') {
            client.state = 'open'
            _reconnectAttempts = 0 // Reset on successful connection
            loadCommands()
            console.log('✅ Connected to WhatsApp')
            client.log('Total Mods: ' + client.mods.length)

            // Print the base64 session so the user can save it for later
            const b64 = readBase64Session()
            if (b64) {
                console.log('\n━━━ Save your session (use option 3 next time) ━━━')
                console.log(b64)
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
            }

            // Restore battles and start the inactivity sweeper once per process.
            if (!client._battleSweeperStarted) {
                client._battleSweeperStarted = true
                try {
                    const restored = await client.restoreBattles()
                    if (restored) client.log(`Restored ${restored} active battle(s) from storage`, 'blue')
                } catch (_) {
                    // ignore restore errors
                }
                setInterval(() => {
                    client.cancelExpiredBattles().catch(() => null)
                }, 60 * 1000)
            }
        }
    })

    app.get('/', (req, res) => {
        res.status(200).setHeader('Content-Type', 'image/png').send(client.QR)
    })

    client.ev.on('messages.upsert', async (messages) => {
        try {
            await MessageHandler(messages, client)
        } catch (error) {
            console.error('❌ messages.upsert handler failed:', error?.message || error)
            // Bot continues despite message handler errors
        }
    })

    client.ev.on('group-participants.update', async (event) => {
        try {
            await EventsHandler(event, client)
        } catch (error) {
            console.error('❌ group-participants.update handler failed:', error?.message || error)
            // Bot continues despite event handler errors
        }
    })

    client.ev.on('contacts.update', async (update) => {
        try {
            await contact.saveContacts(update, client)
        } catch (error) {
            console.error('❌ contacts.update handler failed:', error?.message || error)
            // Bot continues despite contact update errors
        }
    })

    client.ev.on('creds.update', saveCreds)

    // Initialize handlers with error handling - failures don't stop the bot
    try {
        await CardHandler(client);
    } catch (error) {
        console.error('⚠️ CardHandler initialization failed:', error?.message || error)
    }

    try {
        await PokeHandler(client);
    } catch (error) {
        console.error('⚠️ PokeHandler initialization failed:', error?.message || error)
    }

    try {
        await DungeonHandler(client);
    } catch (error) {
        console.error('⚠️ DungeonHandler initialization failed:', error?.message || error)
    }

    try {
        await YugiohHandler(client);
    } catch (error) {
        console.error('⚠️ YugiohHandler initialization failed:', error?.message || error)
    }

    return client
}

const boot = async (dbOk = true) => {
    if (!dbOk) console.warn('⚠️ Starting without database — some features may not work.')
    console.log(`📁 WhatsApp auth files: ${sessionDir}`)
    console.log(`📝 WhatsApp debug log: ${whatsappLogFile}`)

    // Check if a valid session already exists
    let hasValidSession = isSessionRegistered()
    
    // Show the auth menu only if there is no valid session in the session folder
    const authChoice = hasValidSession ? null : await showAuthMenu()
    start(authChoice)
}

driver
    .connect()
    .then(() => {
        console.log(`Connected to the database!`)
        boot(true)
    })
    .catch((err) => {
        console.error('Database connection failed:', err)
        boot(false)
    })

app.listen(port, () => console.log(`Server started on PORT : ${port}`))

process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down gracefully...')
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log('\n⏹️  Shutting down gracefully...')
    process.exit(0)
})
