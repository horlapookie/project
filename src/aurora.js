require('dotenv').config()
const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    delay
} = require('@adiwajshing/baileys')
const { QuickDB } = require('quick.db')
const { MongoDriver } = require('quickmongo')
const { Collection } = require('discord.js')
const auth = require("./Structures/Auth")
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
const axios = require('axios')
const { Boom } = require('@hapi/boom')
const { join } = require('path')
const { readdirSync, writeFileSync, unlink } = require('fs-extra')
const port = process.env.PORT || 3000
const driver = new MongoDriver(process.env.URL)
const chalk = require('chalk')

const cardResponse = new Map();
const auctionResponse = new Map();
const pokemonMap = new Map();
const sellResponse = new Map();
const pokemonMoveLearningMap = new Map();
const evoMap = new Map();
const m1 = new Map();
const m2 = new Map();
const start = async () => {
    await mongoose.connect(process.env.URL);

    const { useAuthFromDatabase } = new auth(process.env.SESSION);

    const { saveState, state, clearState } = await useAuthFromDatabase(process.env.SESSION_BASE64);

    const client = Baileys({
        version: (await fetchLatestBaileysVersion()).version,
        auth: state,
        logger: P({ level: 'silent' }),
        browser: ['REDZEOX', 'silent', '4.0.0'],
        printQRInTerminal: true
    })

    //Config
    client.name = process.env.NAME || 'Mai_Sakurajima'
    client.prefix = process.env.PREFIX || '-'
    client.mods = ('919529426293', '233277114944', '917638889076').split(',')

    //Database
    client.DB = new QuickDB({
        driver
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
            client.log(`[${chalk.red('!')}]`, 'white')
            client.log(`Scan the QR code above | You can also authenicate in http://localhost:${port}`, 'blue')
            client.QR = imageSync(update.qr)
        }
        if (connection === 'close') {
            const { statusCode } = new Boom(lastDisconnect?.error).output
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('Connecting...')
                setTimeout(() => start(), 3000)
            } else {
                clearState()
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

    client.ev.on('messages.upsert', async (messages) => await MessageHandler(messages, client))

    client.ev.on('group-participants.update', async (event) => await EventsHandler(event, client))

    client.ev.on('contacts.update', async (update) => await contact.saveContacts(update, client))

    client.ev.on('creds.update', saveState)

    // Integrate CardHandler to set up card spawning functionality
    await CardHandler(client);

    await PokeHandler(client);

    return client
}

if (!process.env.URL) return console.error('You have not provided any MongoDB URL!!')
driver
    .connect()
    .then(() => {
        console.log(`Connected to the database!`)
        // Starts the script if gets a success in connecting with Database
        start()
    })
    .catch((err) => console.error(err))

app.listen(port, () => console.log(`Server started on PORT : ${port}`))

