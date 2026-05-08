const axios = require('axios').default
const { isMegaOrGmax } = require('../Helpers/megaBoost')
const { tmpdir } = require('os')
const { promisify } = require('util')
const moment = require('moment-timezone')
const FormData = require('form-data')
const { load } = require('cheerio')
const { exec } = require('child_process')
const Canvas = require('canvas')
const { createCanvas ,loadImage } = require('canvas')
const gifFrames = require('gif-frames')
const sharp = require('sharp')
const { sizeFormatter } = require('human-readable')
const { readFile, unlink, writeFile } = require('fs-extra')
const { removeBackgroundFromImageBase64 } = require('remove.bg')
const cheerio = require("cheerio");
const baseUrl = 'https://www.myinstants.com';
const searchUrl = 'https://www.myinstants.com/search/?name=';
const { MoveClient } = require('pokenode-ts')
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const maxLevel = 100; // Maximum level for a Pokémon
const pokemonTierCache = new Map();
const TIER_MULTIPLIERS = {
    normal: 1,
    mega: 1.35,
    legendary: 1.6,
    mythical: 2.0
};
const TIER_XP_GAIN = {
    normal: 1,
    mega: 0.85,
    legendary: 0.7,
    mythical: 0.6
};
const path = require('path');
const { join } = require('path');
const TYPE_CHART_FALLBACK = {
    normal: { weakness: ['fighting'], strong: [] },
    fire: { weakness: ['water', 'ground', 'rock'], strong: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'] },
    water: { weakness: ['electric', 'grass'], strong: ['fire', 'water', 'ice', 'steel'] },
    electric: { weakness: ['ground'], strong: ['electric', 'flying', 'steel'] },
    grass: { weakness: ['fire', 'ice', 'poison', 'flying', 'bug'], strong: ['water', 'electric', 'grass', 'ground'] },
    ice: { weakness: ['fire', 'fighting', 'rock', 'steel'], strong: ['ice'] },
    fighting: { weakness: ['flying', 'psychic', 'fairy'], strong: ['bug', 'rock', 'dark'] },
    poison: { weakness: ['ground', 'psychic'], strong: ['grass', 'fighting', 'poison', 'bug', 'fairy'] },
    ground: { weakness: ['water', 'grass', 'ice'], strong: ['poison', 'rock'] },
    flying: { weakness: ['electric', 'ice', 'rock'], strong: ['grass', 'fighting', 'bug'] },
    psychic: { weakness: ['bug', 'ghost', 'dark'], strong: ['fighting', 'psychic'] },
    bug: { weakness: ['fire', 'flying', 'rock'], strong: ['grass', 'fighting', 'ground'] },
    rock: { weakness: ['water', 'grass', 'fighting', 'ground', 'steel'], strong: ['normal', 'fire', 'poison', 'flying'] },
    ghost: { weakness: ['ghost', 'dark'], strong: ['poison', 'bug'] },
    dragon: { weakness: ['ice', 'dragon', 'fairy'], strong: ['fire', 'water', 'electric', 'grass'] },
    dark: { weakness: ['fighting', 'bug', 'fairy'], strong: ['ghost', 'dark'] },
    steel: { weakness: ['fire', 'fighting', 'ground'], strong: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'] },
    fairy: { weakness: ['poison', 'steel'], strong: ['fighting', 'bug', 'dark'] }
};


/**
 * Draws a Hangman image based on the number of mistakes.
 * @param {number} mistakes - The number of mistakes (from 1 to 6).
 * @returns {Promise<Buffer>} A promise that resolves to a buffer containing the generated image.
 */
const drawHangMan = async (mistakes) => {
    // Define canvas size and context
    const canvasSize = 400;
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.fillStyle = '#ffffff'; // White background
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw basic elements
    ctx.strokeStyle = '#000000'; // Black color for lines
    ctx.lineWidth = 6;
    // Draw horizontal line in the left corner
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(120, 20);
    ctx.stroke();
    // Draw vertical line connected to the horizontal line
    ctx.beginPath();
    ctx.moveTo(120, 20);
    ctx.lineTo(120, 100);
    ctx.stroke();
    // Draw rope connected from the middle of the upper lines
    ctx.beginPath();
    ctx.moveTo(120, 20);
    ctx.lineTo(canvasSize / 2, 20);
    ctx.stroke();

    // Draw Hangman based on number of mistakes
    if (mistakes >= 1) {
        // Draw head
        ctx.beginPath();
        ctx.arc(canvasSize / 2, 120, 40, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (mistakes >= 2) {
        // Draw body
        ctx.beginPath();
        ctx.moveTo(canvasSize / 2, 160);
        ctx.lineTo(canvasSize / 2, 280);
        ctx.stroke();
    }
    if (mistakes >= 3) {
        // Draw left arm
        ctx.beginPath();
        ctx.moveTo(canvasSize / 2, 180);
        ctx.lineTo(canvasSize / 2 - 50, 240);
        ctx.stroke();
    }
    if (mistakes >= 4) {
        // Draw right arm
        ctx.beginPath();
        ctx.moveTo(canvasSize / 2, 180);
        ctx.lineTo(canvasSize / 2 + 50, 240);
        ctx.stroke();
    }
    if (mistakes >= 5) {
        // Draw left leg
        ctx.beginPath();
        ctx.moveTo(canvasSize / 2, 280);
        ctx.lineTo(canvasSize / 2 - 40, 360);
        ctx.stroke();
    }
    if (mistakes >= 6) {
        // Draw right leg
        ctx.beginPath();
        ctx.moveTo(canvasSize / 2, 280);
        ctx.lineTo(canvasSize / 2 + 40, 360);
        ctx.stroke();
    }

    // Return image as buffer
    return canvas.toBuffer();
};



/**
 * Draws a Tic Tac Toe (TTT) board with white background and colored grid lines.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer containing the generated image.
 */
const drawTTTBoard = () => {
    const canvasSize = 300;
    const cellSize = canvasSize / 3;

    // Create canvas
    const canvas = createCanvas(canvasSize, canvasSize);
    const ctx = canvas.getContext('2d');

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw grid lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;

    // Horizontal lines
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvasSize, i * cellSize);
        ctx.stroke();
    }

    // Vertical lines
    for (let j = 1; j < 3; j++) {
        ctx.beginPath();
        ctx.moveTo(j * cellSize, 0);
        ctx.lineTo(j * cellSize, canvasSize);
        ctx.stroke();
    }

    return canvas.toBuffer();
};


  /**
 * Formats the URL for an instant sound effect on Myinstants.com.
 * @param {string} url - The URL to format.
 * @returns {string} A formatted URL for the instant sound effect.
 */

  const getFormattedUrl = (url) => {
    return baseUrl.concat(url.split("'")[1]);
  };


/**
 * Searches for an instant sound effect on Myinstants.com.
 * @param {string} term - The search term to use for the query.
 * @returns {Promise<string|null>} A Promise that resolves to a formatted URL if the search is successful, or null if no results are found.
 */

const search = async (term) => {
    const html = await fetch(`${searchUrl}${encodeURI(term)}`);
    const $ = cheerio.load(html);
    const resultDiv = $('#instants_container');
    const attrs = resultDiv.find($('.instant')).first().find($('.small-button')).first().attr();
    if (!attrs) {
      return null;
    }
    return getFormattedUrl(attrs.onclick);
  };


/**
 * @param {string} url
 * @returns {Promise<Buffer>}
 */

const getBuffer = async (url) =>
    (
        await axios.get(url, {
            responseType: 'arraybuffer'
        })
    ).data

/**
 * @param {string} content
 * @param {boolean} all
 * @returns {string}
 */

const capitalize = (content, all = false) => {
    if (!all) return `${content.charAt(0).toUpperCase()}${content.slice(1)}`
    return `${content
        .split('')
        .map((text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`)
        .join('')}`
}

/**
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
const getRandomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  

/**
 * @param {Buffer} input
 * @returns {Promise<Buffer>}
 */

/**
 * Generates an image of a credit card with the given card name and expiry date.
 * @param {string} cardName - The name on the credit card.
 * @param {string} expiryDate - The expiry date of the credit card.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer containing the generated image.
 */
const generateCreditCardImage = async (cardName, expiryDate) => {
    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext('2d');
  
    // Draw card background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // Draw card number box
    ctx.fillStyle = '#eee';
    ctx.fillRect(60, 190, 680, 110);
  
    // Draw card number text
    ctx.fillStyle = '#000';
    ctx.font = '42px Arial, sans-serif';
    const cardNumber = '1234 5678 9012 3456';
    const cardNumberWidth = ctx.measureText(cardNumber).width;
    ctx.fillText(cardNumber, (canvas.width - cardNumberWidth) / 2, 250);
  
    // Draw card name box
    ctx.fillStyle = '#eee';
    ctx.fillRect(60, 320, 340, 70);
  
    // Draw card name text
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial, sans-serif';
    const cardNameLabel = 'Card Holder';
    const cardNameLabelWidth = ctx.measureText(cardNameLabel).width;
    ctx.fillText(cardNameLabel, 80, 360);
    ctx.font = '24px Arial, sans-serif';
    const cardNameWidth = ctx.measureText(cardName.toUpperCase()).width;
    ctx.fillText(cardName.toUpperCase(), 80 + cardNameLabelWidth + 10, 360);
  
    // Draw card expiration date box
    ctx.fillStyle = '#eee';
    ctx.fillRect(430, 320, 200, 70);
  
    // Draw card expiration date text
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial, sans-serif';
    const expDateLabel = 'Expires';
    const expDateLabelWidth = ctx.measureText(expDateLabel).width;
    ctx.fillText(expDateLabel, 450, 360);
    ctx.font = '24px Arial, sans-serif';
    const expDateWidth = ctx.measureText(expiryDate).width;
    ctx.fillText(expiryDate, 450 + expDateLabelWidth + 10, 360);
  
    // Draw card logo
    const cardLogo = await loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Visa.svg/1200px-Visa.svg.png');
    ctx.drawImage(cardLogo, canvas.width - 120, canvas.height - 80, 80, 50);
  
    // Add noise to make it look more realistic
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2})`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }
  
    return canvas.toBuffer();
  };
  

const greetings = () => {
    const now = new Date();
const hour = now.getHours();
let greetmsg = "";

if (hour >= 0 && hour < 12) {
    greetmsg = "🌅 Ohayou gozaimasu"; //good morning
} else if (hour >= 12 && hour < 18) {
    greetmsg = "🌞 Konnichiwa"; //good afternoon
} else {
    greetmsg = "🌇 Konbanwa"; //good evening
}
return greetmsg
}

const errorChan = () => {
    let chan = "https://i.ibb.co/Htdgs0w/c8f67a2f49ebc5f6d7293e7649bc5ebd.jpg"
    return chan
}

/**
 * @returns {string}
 */

const generateRandomHex = () => `#${(~~(Math.random() * (1 << 24))).toString(16)}`

/**
 * @param {string} content
 * @returns {number[]}
 */

const extractNumbers = (content) => {
    const search = content.match(/(-\d+|\d+)/g)
    if (search !== null) return search.map((string) => parseInt(string)) || []
    return []
}

/**
 * @param {string} url
 */

const extractUrls = (content) => linkify.find(content).map((url) => url.value)

const fetch = async (url) => (await axios.get(url)).data

/**
 * @param {Buffer} webp
 * @returns {Promise<Buffer>}
 */

const webpToPng = async (webp) => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    await writeFile(`${filename}.webp`, webp)
    try {
        await execute(`dwebp "${filename}.webp" -o "${filename}.png"`)
        const buffer = await readFile(`${filename}.png`)
        Promise.all([unlink(`${filename}.png`), unlink(`${filename}.webp`)])
        return buffer
    } catch (error) {
        // dwebp isn't always installed. Use sharp as a fallback.
        const buffer = await sharp(webp).png().toBuffer()
        Promise.all([unlink(`${filename}.webp`).catch(() => null), unlink(`${filename}.png`).catch(() => null)])
        return buffer
    }
}

/**
 * @param {Buffer} webp
 * @returns {Promise<Buffer>}
 */

const webpToMp4 = async (webp) => {
    const responseFile = async (form, buffer = '') => {
        return axios.post(buffer ? `https://ezgif.com/webp-to-mp4/${buffer}` : 'https://ezgif.com/webp-to-mp4', form, {
            headers: { 'Content-Type': `multipart/form-data; boundary=${form._boundary}` }
        })
    }
    return new Promise(async (resolve, reject) => {
        const form = new FormData()
        form.append('new-image-url', '')
        form.append('new-image', webp, { filename: 'blob' })
        responseFile(form)
            .then(({ data }) => {
                const datafrom = new FormData()
                const $ = load(data)
                const file = $('input[name="file"]').attr('value')
                datafrom.append('file', file)
                datafrom.append('convert', 'Convert WebP to MP4!')
                responseFile(datafrom, file)
                    .then(async ({ data }) => {
                        const $ = load(data)
                        const result = await getBuffer(
                            `https:${$('div#output > p.outfile > video > source').attr('src')}`
                        )
                        resolve(result)
                    })
                    .catch(reject)
            })
            .catch(reject)
    })
}

/**
 * @param {Buffer} gif
 * @param {boolean} write
 * @returns {Promise<Buffer | string>}
 */

const gifToMp4 = async (gif, write = false) => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`
    await writeFile(`${filename}.gif`, gif)
    try {
        await execute(
            `ffmpeg -f gif -i ${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${filename}.mp4`
        )
        if (write) return `${filename}.mp4`
        const buffer = await readFile(`${filename}.mp4`)
        Promise.all([unlink(`${filename}.gif`), unlink(`${filename}.mp4`)])
        return buffer
    } catch (error) {
        await unlink(`${filename}.gif`).catch(() => null)
        await unlink(`${filename}.mp4`).catch(() => null)
        return gif
    }
}

const execute = promisify(exec)

const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)]

const calculatePing = (timestamp, now) => (now - timestamp) / 1000

const formatSize = sizeFormatter({
    std: 'JEDEC',
    decimalPlaces: '2',
    keepTrailingZeroes: false,
    render: (literal, symbol) => `${literal} ${symbol}B`
})

const term = (param) =>
    new Promise((resolve, reject) => {
        console.log('Run terminal =>', param)
        exec(param, (error, stdout, stderr) => {
            if (error) {
                console.log(error.message)
                resolve(error.message)
            }
            if (stderr) {
                console.log(stderr)
                resolve(stderr)
            }
            console.log(stdout)
            resolve(stdout)
        })
    })

const restart = () => {
    exec('pm2 start src/aurora.js', (err, stdout, stderr) => {
        if (err) {
            console.log(err)
            return
        }
        console.log(`stdout: ${stdout}`)
        console.log(`stderr: ${stderr}`)
    })
}
const convertMs = (ms, to = 'seconds') => {
    let seconds = parseInt(
        Math.floor(ms / 1000)
            .toString()
            .split('.')[0]
    )
    let minutes = parseInt(
        Math.floor(seconds / 60)
            .toString()
            .split('.')[0]
    )
    let hours = parseInt(
        Math.floor(minutes / 60)
            .toString()
            .split('.')[0]
    )
    let days = parseInt(
        Math.floor(hours / 24)
            .toString()
            .split('.')[0]
    )
    if (to === 'seconds') return seconds
    if (to === 'minutes') return minutes
    if (to === 'hours') return hours
    if (to === 'days') return days
    seconds = parseInt((seconds % 60).toString().split('.')[0])
    minutes = parseInt((minutes % 60).toString().split('.')[0])
    hours = parseInt((hours % 24).toString().split('.')[0])
    return {
        days,
        seconds,
        minutes,
        hours
    }
}

/**
 * Converts a GIF to PNG, with the first appearance of the GIF as an image.
 * @param {Buffer} gif - The GIF buffer to convert.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer containing the generated PNG.
 */
const gifToPng = async (gif) => {
    const filename = `${tmpdir()}/${Math.random().toString(36)}`;
    await writeFile(`${filename}.gif`, gif);
    try {
        await execute(`ffmpeg -i "${filename}.gif" -vframes 1 "${filename}.png"`);
        const buffer = await readFile(`${filename}.png`);
        await Promise.all([unlink(`${filename}.gif`), unlink(`${filename}.png`)]);
        return buffer;
    } catch (error) {
        // No ffmpeg available in some deploy targets. Fall back to a JS decoder.
        try {
            const frames = await gifFrames({
                url: `${filename}.gif`,
                frames: 0,
                outputType: 'png',
                cumulative: false
            })
            const stream = frames?.[0]?.getImage?.()
            if (!stream) throw new Error('gif-frames returned no image stream')

            const chunks = []
            await new Promise((resolve, reject) => {
                stream.on('data', (chunk) => chunks.push(chunk))
                stream.on('end', resolve)
                stream.on('error', reject)
            })

            const buffer = Buffer.concat(chunks)
            await Promise.all([unlink(`${filename}.gif`).catch(() => null), unlink(`${filename}.png`).catch(() => null)])
            return buffer
        } catch (_) {
            await Promise.all([unlink(`${filename}.gif`).catch(() => null), unlink(`${filename}.png`).catch(() => null)])
            // Last resort: 1x1 PNG so callers don't crash on undefined buffers.
            const canvas = createCanvas(1, 1)
            return canvas.toBuffer('image/png')
        }
    }
};

const isLikelyMp4 = (buffer) =>
    Buffer.isBuffer(buffer) &&
    buffer.length > 12 &&
    buffer.slice(4, 8).toString('ascii') === 'ftyp'

const isLikelyGif = (buffer) =>
    Buffer.isBuffer(buffer) &&
    buffer.length > 6 &&
    buffer.slice(0, 3).toString('ascii') === 'GIF'

  /**
     * @param {string | number} pokemon - The name or ID of the Pokémon.
     * @param {number} level - The level of the Pokémon.
     * @returns {Promise<object>} An object containing the stats of the Pokémon.
     */
    const getPokemonStats = async (pokemon, level) => {
        pokemon = typeof pokemon === 'string' ? pokemon.toLowerCase() : pokemon.toString().trim();
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        const pokemonData = await response.data;
    
        const wantedStatsNames = ['hp', 'attack', 'defense', 'speed'];
        const wantedStats = pokemonData.stats.filter((stat) => wantedStatsNames.includes(stat.stat.name));
    
        const pokemonStats = {
            hp: 0,
            attack: 0,
            defense: 0,
            speed: 0
        };
    
        wantedStats.forEach((stat) => {
            pokemonStats[stat.stat.name] = Math.floor(stat.base_stat + level * (stat.base_stat / 50));
        });
    
        return pokemonStats;
    };
    
    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @returns {Promise<string[]>} An array of Pokémon names in the evolution chain.
     */
    const getPokemonEvolutionChain = async (pokemon) => {
        const response1 = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemon}`);
        const data = await response1.data;
        const response2 = await axios.get(data.evolution_chain.url);
        const res = await response2.data;
        const { chain } = res;
    
        const line = [];
        const evolutions = [];
    
        line.push(chain.species.name);
    
        if (chain.evolves_to.length) {
            const second = [];
            chain.evolves_to.forEach((pkm) => second.push(pkm.species.name));
            if (second.length === 1) line.push(second[0]);
            else line.push(second);
            if (chain.evolves_to[0].evolves_to.length) {
                const third = [];
                chain.evolves_to[0].evolves_to.forEach((pkm) => third.push(pkm.species.name));
                if (third.length === 1) line.push(third[0]);
                else line.push(third);
            }
        }
    
        for (const pokemon of line) {
            if (Array.isArray(pokemon)) {
                pokemon.forEach((x) => evolutions.push(x));
                continue;
            }
            evolutions.push(pokemon);
        }
    
        return evolutions;
    };
    
    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @returns {Promise<object[]>} An array of objects containing move information.
     */
    const getStarterPokemonMoves = async (pokemon) => {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        const data = await response.data;
        const moves = data.moves.filter(
            (move) =>
                move.version_group_details[0].move_learn_method.name === 'level-up' &&
                move.version_group_details[0].level_learned_at <= 5
        );
    
        const result = [];
        const client = new MoveClient();
    
        for (const move of moves) {
            if (result.length >= 2) break;
            const moveData = await client.getMoveByName(move.move.name);
            const stat_change = moveData.stat_changes.map(({ change, stat }) => ({ target: stat.name, change }));
            const effect = moveData.meta && moveData.meta.ailment ? moveData.meta.ailment.name : '';
            const descriptions = moveData.flavor_text_entries.filter((x) => x.language.name === 'en');
    
            result.push({
                name: moveData.name,
                accuracy: moveData.accuracy || 0,
                pp: moveData.pp || 5,
                maxPp: moveData.pp || 5,
                id: moveData.id,
                power: moveData.power || 0,
                priority: moveData.priority,
                type: moveData.type.name,
                stat_change,
                effect,
                drain: moveData.meta ? moveData.meta.drain : 0,
                healing: moveData.meta ? moveData.meta.healing : 0,
                description: descriptions[0] ? descriptions[0].flavor_text : ''
            });
        }
    
        return result;
    };
    
    /**
     * @param {...string} types - A variable number of Pokémon types.
     * @returns {Promise<object>} An object containing arrays of strong and weak types.
     */
    const getPokemonWeaknessAndStrongTypes = async (...types) => {
        if (!types.length) {
            return {
                weakness: [],
                strong: []
            };
        }
    
        const strong = new Set();
        const weakness = new Set();
        const typesDataPath = path.join(__dirname, '..', '..', 'assets', 'json', 'types.json');
        let typesData = TYPE_CHART_FALLBACK;

        try {
            typesData = JSON.parse(await readFile(typesDataPath, 'utf8'));
        } catch (error) {
            typesData = TYPE_CHART_FALLBACK;
        }
    
        for (const type of types) {
            const typeData = typesData[type.toLowerCase()];
    
            if (typeData) {
                typeData.weakness.forEach((x) => weakness.add(x));
                typeData.strong.forEach((x) => strong.add(x));
            }
        }
    
        return {
            weakness: Array.from(weakness),
            strong: Array.from(strong)
        };
    };
    
    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @param {number} level - The level of the Pokémon.
     * @param {object[]} learntMoves - An array of learnt moves.
     * @param {string[]} [rejectedMoves=[]] - An array of rejected move names.
     * @returns {Promise<object|null>} An object containing move information or null.
     */
    const getPokemonLearnableMove = async (pokemon, level, learntMoves, rejectedMoves = []) => {
        const shouldDenyMoves = learntMoves.map((move) => move.name);
    
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        const data = await response.data;
    
        const moves = data.moves.filter((move) =>
            move.version_group_details[0].move_learn_method.name === 'level-up' &&
            move.version_group_details[0].level_learned_at <= level &&
            !rejectedMoves.includes(move.move.name) &&
            !shouldDenyMoves.includes(move.move.name)
        );
    
        if (!moves.length) return null;
    
        const client = new MoveClient();
        const moveData = await client.getMoveByName(moves[0].move.name);
        const stat_change = moveData.stat_changes.map(({ stat, change }) => ({ target: stat.name, change }));
        const effect = moveData.meta && moveData.meta.ailment ? moveData.meta.ailment.name : '';
        const descriptions = moveData.flavor_text_entries.filter((x) => x.language.name === 'en');
    
        return {
            name: moveData.name,
            accuracy: moveData.accuracy || 0,
            pp: moveData.pp || 5,
            maxPp: moveData.pp || 5,
            id: moveData.id,
            power: moveData.power || 0,
            priority: moveData.priority,
            type: moveData.type.name,
            stat_change,
            effect,
            drain: moveData.meta ? moveData.meta.drain : 0,
            healing: moveData.meta ? moveData.meta.healing : 0,
            description: descriptions[0] ? descriptions[0].flavor_text : ''
        };
    };
    
    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @param {string | number} move - The name or ID of the move.
     * @returns {Promise<boolean>} A boolean indicating if the move is learnable by the Pokémon.
     */
    const PokemonMoveIsLearnable = async (pokemon, move) => {
        const client = new MoveClient();
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`);
        const { name } = await response.data;
    
        try {
            const res = typeof move === 'string'
                ? await client.getMoveByName(move)
                : await client.getMoveById(move);
    
            const pokemons = res.learned_by_pokemon.map((pokemon) => pokemon.name);
            return pokemons.includes(name);
        } catch (error) {
            return false;
        }
    };
    
    /**
     * @param {Array} array - The array to shuffle.
     * @returns {Array} The shuffled array.
     */
    const shuffleArray = (array) => {
        let counter = array.length;
        while (counter > 0) {
            const index = Math.floor(Math.random() * counter);
            counter--;
            const temp = array[counter];
            array[counter] = array[index];
            array[index] = temp;
        }
        return array;
    };

    const isGmaxForm = (name = '') => /-(gmax|gigantamax)$/i.test(String(name).trim())
    const getGmaxSpeciesName = (name = '') => String(name || '').replace(/-(gmax|gigantamax)$/i, '').trim()

    const getMaxMoveName = (type = '') => {
        const lookup = {
            normal: 'max strike',
            fire: 'max flare',
            water: 'max geyser',
            electric: 'max lightning',
            grass: 'max overgrowth',
            ice: 'max hailstorm',
            fighting: 'max knuckle',
            flying: 'max airstream',
            poison: 'max ooze',
            ground: 'max quake',
            rock: 'max rockfall',
            bug: 'max flutterby',
            ghost: 'max phantasm',
            dark: 'max darkness',
            steel: 'max steelspike',
            dragon: 'max wyrmwind',
            fairy: 'max starfall'
        }
        return lookup[String(type).toLowerCase()] || 'max move'
    }

    const getGmaxMoveName = (species = '', type = '') => {
        const normalizedSpecies = String(species || '').toLowerCase()
        const special = {
            'charizard': { fire: 'g-max wildfire' },
            'corviknight': { flying: 'g-max wind rage' },
            'kingler': { water: 'g-max foam burst' },
            'coalossal': { rock: 'g-max volcalith' },
            'butterfree': { bug: 'g-max befuddle' },
            'alcremie': { fairy: 'g-max finale' },
            'rillaboom': { grass: 'g-max drum solo' },
            'inteleon': { water: 'g-max hydrosnipe' },
            'dragapult': { dragon: 'g-max sundancer' },
            'grimmsnarl': { fairy: 'g-max malodor' },
            'centiskorch': { fire: 'g-max volcanion' },
            'lapras': { water: 'g-max resonance' },
            'snorlax': { normal: 'g-max resonance' },
            'pikachu': { electric: 'g-max volt crash' },
            'urshifu': { fighting: 'g-max one blow' }
        }
        if (special[normalizedSpecies] && special[normalizedSpecies][type]) {
            return special[normalizedSpecies][type]
        }
        return getMaxMoveName(type)
    }

    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @param {number} level - The level of the Pokémon.
     * @returns {Promise<object>} An object containing assigned moves and rejected moves.
     */
    const assignPokemonMoves = async (pokemon, level) => {
        // Try the requested form first; if it has no level-up moves (common for gmax/special
        // forms in PokeAPI), fall back to the base species name so the Pokemon still has moves.
        const fetchMoves = async (name) => {
            try {
                const data = (await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`)).data;
                return data?.moves || [];
            } catch (_) {
                return [];
            }
        };

        const baseName = String(pokemon || '')
            .replace(/-(gmax|gigantamax|mega(-x|-y)?|primal|alola|galar|hisui|paldea|origin|crowned|eternamax|ultra|dawn|dusk|therian|incarnate|10|50|complete|black|white|attack|defense|speed)$/i, '')
            .trim() || pokemon;

        const getLevelUpMoves = (moves, maxLevel) => {
            return moves.filter((move) => {
                const details = Array.isArray(move.version_group_details)
                    ? move.version_group_details
                    : [];
                return details.some(
                    (detail) =>
                        detail.move_learn_method?.name === 'level-up' &&
                        (detail.level_learned_at ?? 999) <= maxLevel
                );
            });
        };

        let rawMoves = await fetchMoves(pokemon);
        let levelUpMoves = getLevelUpMoves(rawMoves, level);

        // Fallback 1: base species level-up moves
        if (levelUpMoves.length === 0 && baseName !== pokemon) {
            rawMoves = await fetchMoves(baseName);
            levelUpMoves = getLevelUpMoves(rawMoves, level);
        }

        // Fallback 2: any level-up moves regardless of level requirement
        if (levelUpMoves.length === 0 && rawMoves.length) {
            const anyLevelUp = (moves) =>
                moves.filter((move) =>
                    Array.isArray(move.version_group_details)
                        ? move.version_group_details.some(
                            (detail) => detail.move_learn_method?.name === 'level-up'
                        )
                        : false
                );
            levelUpMoves = anyLevelUp(rawMoves);
        }

        // Fallback 3: any move at all
        if (levelUpMoves.length === 0 && rawMoves.length) {
            levelUpMoves = rawMoves.slice(0, 8);
        }

        let moves = shuffleArray(levelUpMoves);
    
        const client = new MoveClient();
        const result = [];
        const rejectedMoves = [];
    
        const isGmax = isGmaxForm(pokemon)
        const gmaxSpecies = isGmax ? getGmaxSpeciesName(pokemon) : ''

        for (const { move } of moves) {
            if (result.length >= 4) {
                rejectedMoves.push(move.name);
                continue;
            }
            const data = await client.getMoveByName(move.name);
            const effect = data.meta && data.meta.ailment ? data.meta.ailment.name : '';
            const stat_change = [];
            const descriptions = data.flavor_text_entries.filter((x) => x.language.name === 'en');
            for (const change of data.stat_changes)
                stat_change.push({ target: change.stat.name, change: change.change });

            let moveName = data.name
            let description = descriptions[0] ? descriptions[0].flavor_text : ''
            if (isGmax) {
                const gmaxName = getGmaxMoveName(gmaxSpecies, data.type.name)
                moveName = gmaxName
                if (gmaxName !== data.name) {
                    const prettyName = gmaxName
                        .split('-')
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join(' ')
                    description = `${prettyName} — G-Max move derived from ${data.name}. ${description}`.trim()
                }
            }

            result.push({
                name: moveName,
                originalName: data.name,
                accuracy: data.accuracy || 0,
                pp: data.pp || 5,
                maxPp: data.pp || 5,
                id: data.id,
                power: data.power || 0,
                priority: data.priority,
                type: data.type.name,
                stat_change,
                effect,
                drain: data.meta ? data.meta.drain : 0,
                healing: data.meta ? data.meta.healing : 0,
                description
            });
        }
    
        return {
            moves: result,
            rejectedMoves
        };
    };

     /**
 * Generates a random unique tag with the specified number of digits.
 * 
 * @param {number} n - The number of digits for the unique tag.
 * @returns {string} The generated unique tag.
 */
const generateRandomUniqueTag = (n = 4) => {
    const maxDigits = 11;
    if (n > maxDigits) {
        return `${generateRandomUniqueTag(maxDigits)}${generateRandomUniqueTag(n - maxDigits)}`;
    }
    const max = Math.pow(10, n);
    const min = Math.pow(10, n - 1);
    return (Math.floor(Math.random() * (max - min)) + min).toString();
};

/**
 * Calculate the experience needed for a given level.
 * @param {number} level - The current level of the Pokémon.
 * @returns {number} The experience needed for the given level. Returns Infinity for invalid levels.
 */
const normalizeTier = (tier = 'normal') => {
    const t = String(tier || 'normal').toLowerCase();
    return TIER_MULTIPLIERS[t] ? t : 'normal';
};

const getTierMultiplier = (tier = 'normal') => TIER_MULTIPLIERS[normalizeTier(tier)] || 1;
const getTierXpGainMultiplier = (tier = 'normal') => TIER_XP_GAIN[normalizeTier(tier)] || 1;

const getPokemonTier = async (pokemon) => {
    const key = String(pokemon || '').trim().toLowerCase();
    if (!key) return 'normal';
    if (pokemonTierCache.has(key)) return pokemonTierCache.get(key);

    const isMega = /-mega(-x|-y)?$/.test(key) || /-primal$/.test(key);
    const speciesName = key
        .replace(/-mega(-x|-y)?$/i, '')
        .replace(/-primal$/i, '')
        .replace(/-ultra$/i, '')
        .trim();

    let tier = 'normal';
    try {
        const species = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
        const data = species.data || {};
        if (data.is_mythical) tier = 'mythical';
        else if (data.is_legendary) tier = 'legendary';
    } catch (_) {
        tier = 'normal';
    }
    if (isMega) tier = 'mega';
    pokemonTierCache.set(key, tier);
    return tier;
};

const calculatePokeExp = (level, tier = 'normal') => {
    if (level <= 0 || level > maxLevel) {
        return Infinity; // or any other appropriate value to indicate an invalid level
    }

    const base = Math.floor(8 * Math.pow(level, 3) + 100);
    return Math.floor(base * getTierMultiplier(tier));
};

/**
 * Get the level by given experience.
 * @param {number} exp - The experience points.
 * @returns {number} The level corresponding to the given experience.
 */
const getLevelByExp = (exp, tier = 'normal') => {
    const total = Math.max(0, Number(exp) || 0);
    let level = 1;
    while (level < maxLevel && total >= calculatePokeExp(level + 1, tier)) {
        level += 1;
    }
    return level;
};

/**
 * Get the experience needed for a given level.
 * @param {number} level - The level of the Pokémon.
 * @returns {number} The experience needed for the given level.
 */
const getExpByLevel = (level, tier = 'normal') => {
    return calculatePokeExp(level, tier);
};

/**
 * Get the required experience to reach the next level from the current experience.
 * @param {number} currentExp - The current experience points.
 * @returns {number} The experience points needed to reach the next level.
 */
const getRequiredExp = (currentExp, tier = 'normal') => {
    const currentLevel = getLevelByExp(currentExp, tier);
    const nextLevelExp = calculatePokeExp(currentLevel + 1, tier);
    return nextLevelExp - currentExp;
};

/**
 * Handles Pokemon stats upon leveling up, including move learning and evolution triggers.
 * @param {Object} M - Message object containing message details.
 * @param {Object} pkmn - Pokemon object containing details about the Pokemon.
 * @param {boolean} inBattle - Flag indicating if the Pokemon is currently in battle.
 * @param {string} player - ID of the player controlling the Pokemon.
 * @param {string} user - ID of the user interacting with the bot.
 * @returns {Promise<void>}
 */
const handlePokemonStats = async (client, M, pkmn, inBattle, player, user) => {
    const learnableMove = await getPokemonLearnableMove(
        pkmn.name,
        pkmn.level,
        pkmn.moves,
        pkmn.rejectedMoves
    );
    const jid = user;
    await client.sendMessage(M.from, {
        mentions: [jid],
        text: `*@${jid.split('@')[0]}*'s ${client.utils.capitalize(pkmn.name)} grew to Level ${pkmn.level}`
    });
    await delay(2500);
    if (!learnableMove) return await handlePokemonEvolution(client, M, pkmn, inBattle, player, user);
    const party = await client.poke.get(`${jid}_Party`) || [];
    const i = party.findIndex((x) => x.tag === pkmn.tag);
    let { hp, speed, defense, attack } = await client.utils.getPokemonStats(pkmn.id, pkmn.level);
    // Apply the ×1.5 base boost to level-up stats for non-mega Pokémon
    if (pkmn.baseStatsBoosted) {
        hp      = Math.floor(hp      * 1.5);
        attack  = Math.floor(attack  * 1.5);
        defense = Math.floor(defense * 1.5);
        speed   = Math.floor(speed   * 1.5);
    }
    pkmn.hp += hp - pkmn.maxHp;
    pkmn.speed += speed - pkmn.speed;
    pkmn.defense += defense - pkmn.defense;
    pkmn.attack += attack - pkmn.attack;
    pkmn.maxAttack = attack;
    pkmn.maxSpeed = speed;
    pkmn.maxHp = hp;
    pkmn.maxDefense = defense;
    party[i] = pkmn;
    await client.poke.set(`${jid}_Party`, party);
    if (inBattle) {
        const data = client.pokemonBattleResponse.get(M.from);
        if (data && data[player].activePokemon.tag === pkmn.tag) {
            data[player].activePokemon = pkmn;
            client.pokemonBattleResponse.set(M.from, data);
        }
    }
    const move = learnableMove.name
        .split('-')
        .map((move) => client.utils.capitalize(move))
        .join(' ');
    if (pkmn.moves.length < 4) {
        pkmn.moves.push(learnableMove);
        party[i] = pkmn;
        if (inBattle) {
            const data = client.pokemonBattleResponse.get(M.from);
            if (data && data[player].activePokemon.tag === pkmn.tag) {
                data[player].activePokemon = pkmn;
                client.pokemonBattleResponse.set(M.from, data);
            }
        }
        await client.poke.set(`${jid}_Party`, party);
        await client.sendMessage(M.from, {
            text: `*@${jid.split('@')[0]}*'s *${client.utils.capitalize(pkmn.name)}* learnt *${move}*`,
            mentions: [jid]
        });
        await delay(3000);
        return await handlePokemonEvolution(client, M, pkmn, inBattle, player, user);
    } else {
        let Text = `*Moves | ${client.utils.capitalize(pkmn.name)}*`;
        for (const move of pkmn.moves) {
            const i = pkmn.moves.findIndex((x) => x.name === move.name);
            Text += `\n\n*#${i + 1}*\n❓ *Move:*  ${move.name
                .split('-')
                .map((name) => client.utils.capitalize(name))
                .join(' ')}\n〽 *PP:* ${move.maxPp}\n🎗 *Type:* ${client.utils.capitalize(
                move.type || 'Normal'
            )}\n🎃 *Power:* ${move.power}\n🎐 *Accuracy:* ${move.accuracy}\n🧧 *Description:* ${
                move.description
            }\nUse *${client.prefix}learn --${move.name} to delete this move and learn the new one.`;
        }
        Text += `\n\nUse *${client.prefix}learn --cancel* if you don't want to learn ${move}.`;
        client.pokemonMoveLearningResponse.set(`${M.from}${jid}`, {
            move: learnableMove,
            data: pkmn
        });
        const text = `*@${jid.split('@')[0]}*, your Pokemon *${client.utils.capitalize(
            pkmn.name
        )}* is trying to learn *${move}*.\nBut a Pokemon can't learn more than 4 moves.\nDelete a move to learn this move.\n\n*[This will automatically be cancelled if you don't continue within 60 seconds]*`;
        await client.sendMessage(M.from, {
            text,
            mentions: [jid]
        });
        await delay(1500);
        await client.sendMessage(M.from, {
            text: `📝 *Move Details*\n\n❓ *Move:* ${move}\n〽 *PP:* ${
                learnableMove.maxPp
            }\n🎗 *Type:* ${client.utils.capitalize(learnableMove.type)}\n🎃 *Power:* ${
                learnableMove.power
            }\n🎐 *Accuracy:* ${learnableMove.accuracy}\n🧧 *Description:* ${learnableMove.description}`
        });
        await delay(1500);
        await client.sendMessage(M.from, {
            text: Text
        });
        setTimeout(async () => {
            if (client.pokemonMoveLearningResponse.has(`${M.from}${jid}`)) {
                client.pokemonMoveLearningResponse.delete(`${M.from}${jid}`);
                party[i].rejectedMoves.push(learnableMove.name);
                await client.poke.set(`${M.sender}_Party`, party);
                await client.sendMessage(M.from, {
                    text: `*@${jid.split('@')[0]}*'s *${client.utils.capitalize(
                        pkmn.name
                    )}* Cancelled learning *${move}*`,
                    mentions: [jid]
                });
            }
            return await handlePokemonEvolution(client, M, pkmn, inBattle, player, user);
        }, 60 * 1000);
    }
};

/**
 * Handles Pokemon evolution trigger based on level up.
 * @param {Object} client - Client object.
 * @param {Object} M - Message object containing message details.
 * @param {Object} pkmn - Pokemon object containing details about the Pokemon.
 * @param {boolean} inBattle - Flag indicating if the Pokemon is currently in battle.
 * @param {string} player - ID of the player controlling the Pokemon.
 * @param {string} user - ID of the user interacting with the bot.
 * @returns {Promise<void>}
 */
// Strip form suffixes so PokeAPI species lookups never 404 on regional/form names.
const getBaseSpeciesName = (name) => {
    return String(name).toLowerCase().replace(
        /-(mega(-[xy])?|primal|gmax|gigantamax|alolan?|galarian?|hisuian?|paldean?|origin|therian|sky|pirouette|resolute|black|white|complete|ultra|crowned|dusk|midnight|dawn|ash|zen|eternamax|unbound|confined|single-strike|rapid-strike|ice|shadow|blood-moon|aqua|blaze|combat|wellspring|hearthflame|cornerstone)$/i,
        ''
    );
};

const handlePokemonEvolution = async (client, M, pkmn, inBattle, player, user) => {
    try {
        // Mega / GMax / Primal forms never level-evolve — skip to avoid PokeAPI 404.
        if (isMegaOrGmax(pkmn.name)) return;

        const previousName = pkmn.name;
        const speciesName = getBaseSpeciesName(pkmn.name);
        const speciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
        const speciesData = speciesResponse.data;
        const chainResponse = await axios.get(speciesData.evolution_chain.url);
        const evolutionChain = chainResponse.data;

        const flattenChain = (node, result = []) => {
            result.push({
                species_name: node.species.name,
                evolves_to: node.evolves_to
            });
            for (const child of node.evolves_to || []) {
                flattenChain(child, result);
            }
            return result;
        };

        const flat = flattenChain(evolutionChain.chain);
        const currentNode = flat.find((entry) => entry.species_name === pkmn.name);
        if (!currentNode || !currentNode.evolves_to || currentNode.evolves_to.length < 1) return;

        const nextEvolution = currentNode.evolves_to[0];
        const evolutionDetails = nextEvolution.evolution_details?.[0];
        if (!evolutionDetails || evolutionDetails.trigger?.name !== 'level-up') return;
        if (evolutionDetails.min_level && evolutionDetails.min_level > pkmn.level) return;
        if (client.pokemonEvolutionResponse.has(user)) return;
 
        const text = `*@${user.split('@')[0]}*, your Pokemon *${client.utils.capitalize(
            pkmn.name
        )}* is evolving to *${client.utils.capitalize(nextEvolution.species.name)}*. Use *${
            client.prefix
        }cancel-evolution* to cancel this evolution (within 60s)`;
 
        let party = await client.poke.get(`${user}_Party`) || [];
        const i = party.findIndex((x) => x.tag === pkmn.tag);
 
        await client.sendMessage(M.from, { text });
        client.pokemonEvolutionResponse.set(user, {
            group: M.from,
            pokemon: pkmn.name
        });
 
        setTimeout(async () => {
            if (!client.pokemonEvolutionResponse.has(user)) return;
            client.pokemonEvolutionResponse.delete(user);
 
            const pDataResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${nextEvolution.species.name}`);
            const pData = pDataResponse.data;
 
            pkmn.id = pData.id;
            pkmn.image = pData.sprites.other['official-artwork'].front_default;
            pkmn.name = pData.name;
 
            let { hp, attack, defense, speed } = await client.utils.getPokemonStats(pkmn.id, pkmn.level);
            // Carry forward the ×1.5 base boost through evolution
            if (pkmn.baseStatsBoosted) {
                hp      = Math.floor(hp      * 1.5);
                attack  = Math.floor(attack  * 1.5);
                defense = Math.floor(defense * 1.5);
                speed   = Math.floor(speed   * 1.5);
            }
            pkmn.hp += hp - pkmn.maxHp;
            pkmn.speed += speed - pkmn.speed;
            pkmn.defense += defense - pkmn.defense;
            pkmn.attack += attack - pkmn.attack;
            pkmn.maxAttack = attack;
            pkmn.maxSpeed = speed;
            pkmn.maxHp = hp;
            pkmn.maxDefense = defense;
 
            if (pkmn.tag === '0') await client.poke.set(`${user}_Companion`, pData.name);
            party[i] = pkmn;
 
            if (inBattle) {
                const data = client.pokemonBattleResponse.get(M.from);
                if (data && data[player].activePokemon.tag === pkmn.tag) {
                    data[player].activePokemon = pkmn;
                    client.pokemonBattleResponse.set(M.from, data);
                }
            }
 
            await client.poke.set(`${user}_Party`, party);
 
            const buffer = await client.utils.getBuffer(pkmn.image);
            await client.sendMessage(M.from, {
                image: buffer,
                jpegThumbnail: buffer.toString('base64'),
                caption: `Congrats! *@${user.split('@')[0]}*, your ${client.utils.capitalize(
                    previousName
                )} has evolved to ${client.utils.capitalize(pkmn.name)}`,
                mentions: [user]
            });
        }, 60 * 1000);
    } catch (error) {
        console.error(`Error in handlePokemonEvolution: ${error.message}`);
    }
 };
 

 /**
     * @param {Object} data - Object containing player information and their active Pokémon.
     * @param {Object} data.player1 - Player 1's information.
     * @param {Object} data.player1.activePokemon - Player 1's active Pokémon.
     * @param {Object[]} data.player1.party - Player 1's Pokémon party.
     * @param {Object} data.player2 - Player 2's information.
     * @param {Object} data.player2.activePokemon - Player 2's active Pokémon.
     * @param {Object[]} data.player2.party - Player 2's Pokémon party.
     * @returns {Promise<Buffer>} - Promise resolving to a Buffer containing the canvas image.
     */

const drawPokemonBattle = async (data) => {

    const backgroundPath = data.background || 'battle.png';
    let background;
    if (typeof backgroundPath === 'string' && (backgroundPath.startsWith('http://') || backgroundPath.startsWith('https://'))) {
        try {
            const resp = await axios.get(backgroundPath, { responseType: 'arraybuffer', timeout: 8000 });
            background = await Canvas.loadImage(Buffer.from(resp.data));
        } catch (_) {
            // fallback to default background
            background = await Canvas.loadImage(
                await readFile(join(__dirname, '..', '..', 'assets', 'Images', 'battle.png'))
            );
        }
    } else {
        background = await Canvas.loadImage(
            await readFile(join(__dirname, '..', '..', 'assets', 'Images', backgroundPath || 'battle.png'))
        );
    }
    const pokeball = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'Images', 'pokeball.png'))
    );
    const greyPokeball = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'Images', 'greyPokeball.png'))
    );
    const canvas = Canvas.createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0);

    // Scale the UI to the actual background size. The old coordinates were tuned for a much
    // smaller canvas; our battle background is now 1280x853, so we place things by percent.
    const W = background.width;
    const H = background.height;
    const base = Math.min(W, H);
    const boxPadding = Math.max(10, Math.round(base * 0.02));

    const pokemonStyles = await getPokemonStyles({ W, H, base });

    for (let i = 0; i < 2; i++) {
        const style = pokemonStyles[`player${i + 1}`];
        const player = data[`player${i + 1}`];
        const activePokemon = data[`player${i + 1}`].activePokemon;
        const showCaptureBall = i === 1 && data.captureBall;
        const spriteUrlPrimary = style.pokemon.showBack
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${activePokemon.id}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${activePokemon.id}.png`;
        const spriteUrlFallback = style.pokemon.showBack
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${activePokemon.id}.png`
            : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${activePokemon.id}.png`;
        let pokemonImage = null;
        try {
            pokemonImage = await Canvas.loadImage(spriteUrlPrimary);
        } catch (_) {
            try {
                pokemonImage = await Canvas.loadImage(spriteUrlFallback);
            } catch (_) {
                try {
                    // last resort: use the stored artwork url if present
                    if (activePokemon.image) pokemonImage = await Canvas.loadImage(activePokemon.image);
                } catch (_) {
                    pokemonImage = null;
                }
            }
        }
        // Clip in destination space (canvas) so low-res sprites don't get cropped to a 1px strip.
        const clipY = style.pokemon.clipY;
        const size = style.pokemon.size;

        if (player.activePokemon.hp > 0) {
            if (showCaptureBall) {
                ctx.drawImage(
                    pokeball,
                    style.pokemon.x + size / 4,
                    style.pokemon.y + size / 4,
                    size / 2,
                    size / 2
                );
            } else if (pokemonImage) {
                ctx.save();
                ctx.beginPath();
                // Draw the sprite but clip the lower part so it appears "in the grass".
                ctx.rect(style.pokemon.x, style.pokemon.y, size, Math.max(1, size - clipY));
                ctx.clip();
                ctx.drawImage(pokemonImage, style.pokemon.x, style.pokemon.y, size, size);
                ctx.restore();
            } else {
                // Fallback if sprite failed to load.
                ctx.fillStyle = 'rgba(0,0,0,0.28)';
                ctx.fillRect(style.pokemon.x, style.pokemon.y, size, Math.max(10, size - clipY));
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${Math.max(14, Math.round(size * 0.12))}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.fillText(capitalize(activePokemon.name), style.pokemon.x + size / 2, style.pokemon.y + (size - clipY) / 2);
            }
        }

        const boxCanvas = Canvas.createCanvas(style.box.w, style.box.h);
        const boxCtx = boxCanvas.getContext('2d');
        boxCtx.fillStyle = 'rgb(24,24,24)';
        boxCtx.strokeStyle = 'rgb(36,36,36)';
        roundRect(boxCtx, 0, 0, boxCanvas.width, boxCanvas.height, 16);

        boxCtx.font = `bold ${style.box.font}px Sans-Serif`;
        boxCtx.fillStyle = '#ffffff';

        // Layout: Name/Level on first line, HP below it.
        const line1Y = boxPadding + style.box.font;
        const line2Y = line1Y + style.box.font + Math.round(style.box.font * 0.25);
        const namePos = { x: boxPadding, y: line1Y };
        boxCtx.textAlign = 'left';
        boxCtx.fillText(
            `${capitalize(player.activePokemon.name)}${player.activePokemon.name.length <= 6 ? '\t\t' : '\t'}Lv. ${player.activePokemon.level}`,
            namePos.x,
            namePos.y
        );

        const hpPos = { x: boxPadding, y: line2Y };
        boxCtx.textAlign = 'left';
        boxCtx.fillText(`HP: ${player.activePokemon.hp} / ${player.activePokemon.maxHp}`, hpPos.x, hpPos.y);

        const pokeballGap = Math.max(2, Math.round(base * 0.004));
        const pokeballSize = Math.max(7, Math.round(base * 0.014));
        // Place the pokeball dots under the HP line to avoid overlapping the title.
        const pokeballY = Math.min(
            boxCanvas.height - pokeballSize - boxPadding,
            hpPos.y + Math.round(style.box.font * 0.55)
        );
        const pokeballPos = { x: boxPadding, y: pokeballY };
        const length = player.party.length <= 6 ? player.party.length : 6;

        for (let i = 0; i < length; i++) {
            const pokeballX = pokeballPos.x + (pokeballSize + pokeballGap) * i;
            boxCtx.drawImage(
                player.party[i].hp > 0 ? pokeball : greyPokeball,
                pokeballX,
                pokeballPos.y,
                pokeballSize,
                pokeballSize
            );
        }

        ctx.drawImage(boxCanvas, style.box.x, style.box.y);
    }

    return canvas.toBuffer();
};

/**
 * Render a simple 3x2 gallery of dungeon guardians.
 * @param {Object[]} dungeonParty
 * @param {Object} [options]
 * @param {string} [options.title]
 * @returns {Promise<Buffer>}
 */
const drawDungeonGallery = async (dungeonParty = [], options = {}) => {
    const title = options.title || 'ASHEN SANCTUM GUARDIANS'
    const background = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'Images', 'dungeon.jpg'))
    )
    const canvas = Canvas.createCanvas(background.width, background.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(background, 0, 0)

    // Darken slightly for readability.
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const W = canvas.width
    const H = canvas.height
    const cols = 3
    const rows = 2
    const pad = Math.round(Math.min(W, H) * 0.05)
    const cellW = Math.floor((W - pad * 2) / cols)
    const cellH = Math.floor((H - pad * 2) / rows)
    const spriteSize = Math.min(Math.round(cellW * 0.55), Math.round(cellH * 0.55))

    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${Math.max(22, Math.round(Math.min(W, H) * 0.04))}px Sans-Serif`
    ctx.fillText(title, W / 2, Math.max(40, Math.round(pad * 0.7)))

    ctx.font = `bold ${Math.max(16, Math.round(Math.min(W, H) * 0.028))}px Sans-Serif`
    for (let i = 0; i < Math.min(6, dungeonParty.length); i++) {
        const p = dungeonParty[i]
        const c = i % cols
        const r = Math.floor(i / cols)
        const cx = pad + c * cellW + cellW / 2
        const cy = pad + r * cellH + cellH * 0.46

        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
        try {
            const img = await Canvas.loadImage(spriteUrl)
            ctx.drawImage(img, cx - spriteSize / 2, cy - spriteSize / 2, spriteSize, spriteSize)
        } catch (_) {
            // ignore sprite failures
        }

        const name = capitalize(String(p.name || '').replace(/-/g, ' '))
        ctx.fillText(name, cx, cy + spriteSize / 2 + Math.round(spriteSize * 0.25))
    }

    // JPEG is smaller and more WhatsApp-friendly than PNG here.
    return canvas.toBuffer('image/jpeg', { quality: 0.82 })
}

/**
 * Render a simple 5x2 card pack gallery.
 * @param {Object[]} cards
 * @param {Object} [options]
 * @param {'back'|'front'} [options.mode]
 * @param {string} [options.title]
 * @returns {Promise<Buffer>}
 */
const drawCardPackGallery = async (cards = [], options = {}) => {
    const mode = options.mode || 'back'
    const title = options.title || (mode === 'back' ? 'CARD PACK' : 'PACK REVEAL')

    const W = 1600
    const H = 900
    const canvas = Canvas.createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#12141a')
    grad.addColorStop(1, '#1c2130')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 44px Sans-Serif'
    ctx.fillText(title, W / 2, 64)

    const cols = 5
    const rows = 2
    const pad = 50
    const gap = 18
    const cardW = Math.floor((W - pad * 2 - gap * (cols - 1)) / cols)
    const cardH = Math.floor((H - 140 - pad - gap * (rows - 1)) / rows)
    const startY = 120

    const drawCardBack = (x, y) => {
        const radius = 16
        ctx.fillStyle = '#21283a'
        ctx.strokeStyle = '#e4c887'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.arcTo(x + cardW, y, x + cardW, y + cardH, radius)
        ctx.arcTo(x + cardW, y + cardH, x, y + cardH, radius)
        ctx.arcTo(x, y + cardH, x, y, radius)
        ctx.arcTo(x, y, x + cardW, y, radius)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = '#f5e6b0'
        ctx.font = 'bold 28px Sans-Serif'
        ctx.fillText('VEN', x + cardW / 2, y + cardH / 2 - 8)
        ctx.font = '16px Sans-Serif'
        ctx.fillText('DOMAIN', x + cardW / 2, y + cardH / 2 + 18)
    }

    const loadCardImage = async (url = '') => {
        if (!url) return null
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' })
            let buffer = Buffer.from(res.data)
            if (String(url).toLowerCase().endsWith('.gif')) {
                buffer = await gifToPng(buffer)
            }
            return await loadImage(buffer)
        } catch (_) {
            return null
        }
    }

    for (let i = 0; i < cols * rows; i++) {
        const card = cards[i]
        const c = i % cols
        const r = Math.floor(i / cols)
        const x = pad + c * (cardW + gap)
        const y = startY + r * (cardH + gap)

        if (mode === 'front' && card && card.url) {
            const img = await loadCardImage(card.url)
            if (img) {
                ctx.drawImage(img, x, y, cardW, cardH)
                continue
            }
        }
        drawCardBack(x, y)
    }

    return canvas.toBuffer('image/jpeg', { quality: 0.82 })
}

/**
 * Render a two-card trade image with "TRADE" in the middle.
 * @param {Object} left
 * @param {Object} right
 * @param {Object} [options]
 * @param {number} [options.leftPrice]
 * @param {number} [options.rightPrice]
 * @returns {Promise<Buffer>}
 */
const drawYuTrade = async (left, right, options = {}) => {
    const W = 1200
    const H = 700
    const canvas = Canvas.createCanvas(W, H)
    const ctx = canvas.getContext('2d')

    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#101219')
    grad.addColorStop(1, '#1b2030')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 42px Sans-Serif'
    ctx.fillText('TRADE', W / 2, 70)

    const cardW = 360
    const cardH = 520
    const leftX = 120
    const rightX = W - 120 - cardW
    const topY = 120

    const drawSlot = (x, y, label) => {
        ctx.fillStyle = '#232a3c'
        ctx.strokeStyle = '#e4c887'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.roundRect(x, y, cardW, cardH, 18)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 18px Sans-Serif'
        ctx.fillText(label, x + cardW / 2, y + cardH + 28)
    }

    const loadCardImage = async (url = '') => {
        if (!url) return null
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer' })
            let buffer = Buffer.from(res.data)
            if (String(url).toLowerCase().endsWith('.gif')) {
                buffer = await gifToPng(buffer)
            }
            return await loadImage(buffer)
        } catch (_) {
            return null
        }
    }

    const leftImg = await loadCardImage(left?.image || left?.url || '')
    const rightImg = await loadCardImage(right?.image || right?.url || '')

    if (leftImg) ctx.drawImage(leftImg, leftX, topY, cardW, cardH)
    else drawSlot(leftX, topY, left?.name || 'Card A')

    if (rightImg) ctx.drawImage(rightImg, rightX, topY, cardW, cardH)
    else drawSlot(rightX, topY, right?.name || 'Card B')

    ctx.fillStyle = '#ffd86b'
    ctx.font = 'bold 22px Sans-Serif'
    const leftPrice = options.leftPrice != null ? `${options.leftPrice} gems` : ''
    const rightPrice = options.rightPrice != null ? `${options.rightPrice} gems` : ''
    if (leftPrice) ctx.fillText(leftPrice, leftX + cardW / 2, topY + cardH + 60)
    if (rightPrice) ctx.fillText(rightPrice, rightX + cardW / 2, topY + cardH + 60)

    return canvas.toBuffer('image/jpeg', { quality: 0.82 })
}

/**
     * @param {number} pokemonSize - The size of the Pokémon image.
     * @returns {Promise<Object>} - Promise resolving to an object containing styles for player Pokémon.
     */
const getPokemonStyles = async ({ W, H, base }) => {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    // Slightly larger sprites for better readability on the new battlefield.
    const p1Size = clamp(Math.round(base * 0.42), 240, 420);
    const p2Size = clamp(Math.round(base * 0.36), 210, 380);
    // Clip a bit less so the bottom sprite doesn't look "missing" on some Pokemon.
    const p1Clip = Math.round(p1Size * 0.28);

    const boxW = clamp(Math.round(base * 0.44), 300, 460);
    const boxH = clamp(Math.round(base * 0.18), 110, 170);
    const font = clamp(Math.round(boxH * 0.22), 12, 22);

    return {
        player1: {
            pokemon: {
                // bottom-left, facing away (back sprite)
                x: Math.round(W * 0.26 - p1Size / 2),
                // Tuned for the current battlefield image: keep the back sprite inside the left grass arena.
                // Raise a bit more so the sprite doesn't get cut off at the bottom.
                y: Math.round(H * 0.54),
                size: p1Size,
                showBack: true,
                clipY: p1Clip
            },
            // Player HP box bottom-right (keeps the field clear so the sprite is visible).
            box: { x: Math.round(W - boxW - W * 0.06), y: Math.round(H - boxH - H * 0.06), w: boxW, h: boxH, font },
            moves: { x: 0, y: 0 }
        },
        player2: {
            pokemon: {
                // upper-right, facing player (front sprite)
                x: Math.round(W * 0.76 - p2Size / 2),
                // Tuned for the current battlefield image: center on the right grass arena.
                // Raise slightly so it sits better in the top arena.
                y: Math.round(H * 0.26),
                size: p2Size,
                showBack: false,
                clipY: 0
            },
            // Opponent HP box top-left (keeps the top field clear for the sprite).
            box: { x: Math.round(W * 0.06), y: Math.round(H * 0.10), w: boxW, h: boxH, font },
            moves: { x: 0, y: 0 }
        }
    };
};

 /**
     * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
     * @param {number} x - The x-coordinate of the top-left corner of the rectangle.
     * @param {number} y - The y-coordinate of the top-left corner of the rectangle.
     * @param {number} width - The width of the rectangle.
     * @param {number} height - The height of the rectangle.
     * @param {number} [radius=5] - The radius of the rectangle's corners (default is 5).
     * @returns {Promise<void>} - Promise resolving when the rounded rectangle is drawn.
     */
const roundRect = async (
    ctx,
    x,
    y,
    width,
    height,
    radius = 5
) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
};

 
module.exports = {
    drawHangMan,
    drawTTTBoard,
    calculatePing,
    capitalize,
    execute,
    extractNumbers,
    fetch,
    formatSize,
    generateCreditCardImage,
    generateRandomHex,
    getBuffer,
    errorChan,
    getRandomItem,
    gifToMp4,
    restart,
    term,
    webpToMp4,
    webpToPng,
    greetings,
    getRandomInt,
    getFormattedUrl,
    search,
    convertMs,
    extractUrls,
    gifToPng,
    isLikelyMp4,
    isLikelyGif,
    getPokemonStats,
    getPokemonEvolutionChain,
    getStarterPokemonMoves,
    getPokemonWeaknessAndStrongTypes,
    getPokemonLearnableMove,
    PokemonMoveIsLearnable,
    shuffleArray,
    assignPokemonMoves,
    generateRandomUniqueTag,
    calculatePokeExp,
    getPokemonTier,
    getTierMultiplier,
    getTierXpGainMultiplier,
    getLevelByExp,
    getExpByLevel,
    getRequiredExp,
    handlePokemonStats,
    handlePokemonEvolution,
    drawPokemonBattle,
    drawDungeonGallery,
    drawCardPackGallery,
    drawYuTrade
}
