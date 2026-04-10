require('dotenv').config()
const { join } = require('path')
const { readdirSync, mkdirSync, rmSync } = require('fs')
const chalk = require('chalk')
const { Boom } = require('@hapi/boom')
const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const { QuickDB, JSONDriver } = require('quick.db')
const { MongoDriver } = require('quickmongo')
const { Collection } = require('discord.js')
//handlers
const MessageHandler = require('./Handlers/Message')
const CardHandler = require('./Handlers/card')
const PokeHandler = require('./Handlers/pokemon')
const EventsHandler = require('./Handlers/Events')
const econ = require("./Database/Models/economy")
const cardMap = new Map()
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

const driver = new MongoDriver(process.env.URL)
const port = process.env.PORT || 3000
const sessionDir = process.env.SESSION_DIR || join(process.cwd(), 'session')
const logsDir = join(process.cwd(), 'logs')
const whatsappLogFile = join(logsDir, 'whatsapp.log')
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

const waLogger = P(
    { level: 'debug' },
    P.multistream([
        { stream: process.stdout },
        { stream: P.destination(whatsappLogFile) }
    ])
)

const clearSessionFolder = () => {
    rmSync(sessionDir, { recursive: true, force: true })
    mkdirSync(sessionDir, { recursive: true })
}

const start = async () => {
    await mongoose.connect(process.env.URL);

    const { saveCreds, state } = await useMultiFileAuthState(sessionDir)

    const client = Baileys({
        version: (await fetchLatestBaileysVersion()).version,
        auth: state,
        logger: waLogger,
        browser: ['Aurora', 'Chrome', '1.0.0']
    })

    //Config
    client.name = process.env.NAME || 'Mai_Sakurajima'
    client.prefix = process.env.PREFIX || '-'
    client.meLid = state?.creds?.me?.lid || null
    client.mePn = state?.creds?.me?.id || null

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

    //Database
    client.DB = new QuickDB({
        driver: new JSONDriver()
    })
    //Tables
    client.contactDB = client.DB.table('contacts')

    //Contacts
    client.contact = contact
    client.cardMap = cardMap
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

    const storedOwner = normalizeNumber((await client.DB.get('owner')) || OWNER_NUMBER)
    const storedMods = ((await client.DB.get('mods')) || []).map(normalizeNumber).filter(Boolean)
    client.owner = storedOwner
    client.mods = Array.from(new Set([client.owner, ...DEFAULT_MODS, ...storedMods]))
    await client.DB.set('owner', client.owner)
    await client.DB.set('mods', client.mods)
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
    client.isMod = (value = '') => {
        const identities = client.getIdentityNumbers(value)
        return identities.some((identity) => client.mods.includes(identity))
    }
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
        const candidates = Array.from(
            new Set(
                [number, `${number}@s.whatsapp.net`, `${number}@lid`, rawSender]
                    .filter(Boolean)
                    .map((x) => String(x))
            )
        )
        let doc = await client.econ.findOne({ userId: { $in: candidates } })
        if (!doc && createIfMissing) {
            doc = await client.econ.create({ userId: number || String(rawSender || '') })
        }
        // Best-effort migrate to stable numeric id.
        if (doc && number && doc.userId !== number) {
            doc.userId = number
            await doc.save().catch(() => null)
        }
        return doc
    }
    client.refreshMods = async () => {
        const owner = normalizeNumber((await client.DB.get('owner')) || client.owner || OWNER_NUMBER)
        const mods = ((await client.DB.get('mods')) || []).map(normalizeNumber).filter(Boolean)
        client.owner = owner
        client.mods = Array.from(new Set([owner, ...DEFAULT_MODS, ...mods]))
        return client.mods
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

    //user
    client.getAllUsers = async () => {
        const data = (await client.contactDB.all()).map((x) => x.id)
        const users = data.filter((element) => /^\d+@s$/.test(element)).map((element) => `${element}.whatsapp.net`)
        return users
    }

    //Colourful
    client.log = (text, color = 'green') =>
        color ? console.log(chalk.keyword(color)(text)) : console.log(chalk.green(text))
    client.sessionDir = sessionDir
    client.logFile = whatsappLogFile

    //Command Loader
    const loadCommands = async () => {
        const readCommand = (rootDir) => {
            readdirSync(rootDir).forEach(($dir) => {
                const commandFiles = readdirSync(join(rootDir, $dir)).filter((file) => file.endsWith('.js'))
                for (let file of commandFiles) {
                    const command = require(join(rootDir, $dir, file))
                    client.cmd.set(command.name, command)
                }
            })
            client.log('Commands loaded!')
        }
        readCommand(join(__dirname, '.', 'Commands'))
    }

    //connection updates
    client.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (update.qr) {
            client.log('[!]', 'red')
            qrcode.generate(update.qr, { small: true })
            client.log(`You can also authenticate at http://localhost:${port}`, 'blue')
            client.QR = imageSync(update.qr)
        }
        if (connection === 'close') {
            const { statusCode } = new Boom(lastDisconnect?.error).output
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('Connecting...')
                setTimeout(() => start(), 3000)
            } else {
                clearSessionFolder()
                client.log('Disconnected.', 'red')
                console.log('Starting...')
                setTimeout(() => start(), 3000)
            }
        }
        if (connection === 'connecting') {
            client.state = 'connecting'
            console.log('Connecting to WhatsApp...')
        }
        if (connection === 'open') {
            client.state = 'open'
            loadCommands()
            client.log('Connected to WhatsApp')
            client.log('Total Mods: ' + client.mods.length)
        }
    })

    app.get('/', (req, res) => {
        res.status(200).setHeader('Content-Type', 'image/png').send(client.QR)
    })

    client.ev.on('messages.upsert', async (messages) => {
        try {
            await MessageHandler(messages, client)
        } catch (error) {
            console.error('messages.upsert handler failed:', error)
        }
    })

    client.ev.on('group-participants.update', async (event) => await EventsHandler(event, client))

    client.ev.on('contacts.update', async (update) => await contact.saveContacts(update, client))

    client.ev.on('creds.update', saveCreds)

    // Integrate CardHandler to set up card spawning functionality
    await CardHandler(client);

    await PokeHandler(client);

    return client
}

// if (!process.env.URL) return console.error('You have not provided any MongoDB URL!!')
driver
    .connect()
    .then(() => {
        console.log(`Connected to the database!`)
        console.log(`WhatsApp auth files: ${sessionDir}`)
        console.log(`WhatsApp debug log: ${whatsappLogFile}`)
        // Starts the script if gets a success in connecting with Database
        start()
    })
    .catch((err) => {
        console.error('Database connection failed:', err)
        console.log(`WhatsApp auth files: ${sessionDir}`)
        console.log(`WhatsApp debug log: ${whatsappLogFile}`)
        // Start anyway without database
        start()
    })

app.listen(port, () => console.log(`Server started on PORT : ${port}`))
