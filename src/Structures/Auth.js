const { initAuthCreds, BufferJSON, proto } = require('@adiwajshing/baileys')
const Database = require("./Database")

module.exports = class Authenication {
    /**
     * @param {string} sessionId
     */
    constructor(sessionId) {
        this.sessionId = sessionId
    }
    /**
     */
    useAuthFromDatabase = async (base64Session) => {
        let creds
        let keys = {}
        let storedCreds = null

        if (base64Session) {
            const parsedCreds = this.parseBase64Session(base64Session)
            if (parsedCreds) {
                creds = parsedCreds.creds
                keys = parsedCreds.keys
                await this.saveSessionToDatabase(creds, keys)
            }
        }

        if (!creds) {
            storedCreds = await this.DB.getSession(this.sessionId)
            if (storedCreds !== null && storedCreds.session) {
                const parsedCreds = JSON.parse(storedCreds.session, BufferJSON.reviver)
                creds = parsedCreds.creds
                keys = parsedCreds.keys
            }
        }

        if (!creds) {
            storedCreds = storedCreds || (await this.DB.getSession(this.sessionId))
            if (storedCreds === null)
                await new this.DB.session({
                    sessionId: this.sessionId
                }).save()
            creds = initAuthCreds()
        }

        const saveState = async () => {
            const session = JSON.stringify(
                {
                    creds,
                    keys
                },
                BufferJSON.replacer,
                2
            )
            await this.DB.session.updateOne({ sessionId: this.sessionId }, { $set: { session } }, { upsert: true })
        }

        const clearState = async () => {
            await this.DB.session.deleteOne({ sessionId: this.sessionId })
        }

        return {
            state: {
                creds,
                keys: {
                    get: (type, ids) => {
                        const key = this.KEY_MAP[type]
                        return ids.reduce((dict, id) => {
                            let value = keys[key]?.[id]
                            if (value) {
                                if (type === 'app-state-sync-key') {
                                    value = proto.AppStateSyncKeyData.fromObject(value)
                                }

                                dict[id] = value
                            }

                            return dict
                        }, {})
                    },
                    set: (data) => {
                        for (const _key in data) {
                            const key = this.KEY_MAP[_key]
                            keys[key] = keys[key] || {}
                            Object.assign(keys[key], data[_key])
                        }
                        saveState()
                    }
                }
            },
            saveState,
            clearState
        }
    }

    parseBase64Session = (base64Session) => {
        try {
            let raw = base64Session.trim()
            if (!raw.startsWith('{')) {
                raw = Buffer.from(raw, 'base64').toString('utf-8')
            }
            const parsed = JSON.parse(raw, BufferJSON.reviver)
            if (parsed && parsed.creds && parsed.keys) {
                return parsed
            }
        } catch (error) {
            // invalid base64 or JSON; ignore and fallback to DB auth
        }
        return null
    }

    saveSessionToDatabase = async (creds, keys) => {
        const session = JSON.stringify({ creds, keys }, BufferJSON.replacer, 2)
        await this.DB.session.updateOne({ sessionId: this.sessionId }, { $set: { session } }, { upsert: true })
    }

    /**@private */
    DB = new Database()

    /**@private */
    KEY_MAP = {
        'pre-key': 'preKeys',
        session: 'sessions',
        'sender-key': 'senderKeys',
        'app-state-sync-key': 'appStateSyncKeys',
        'app-state-sync-version': 'appStateVersions',
        'sender-key-memory': 'senderKeyMemory'
    }
}
