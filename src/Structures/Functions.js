const axios = require('axios').default
const { tmpdir } = require('os')
const { promisify } = require('util')
const moment = require('moment-timezone')
const FormData = require('form-data')
const { load } = require('cheerio')
const { exec } = require('child_process')
const { createCanvas ,loadImage } = require('canvas')
const { sizeFormatter } = require('human-readable')
const { readFile, unlink, writeFile } = require('fs-extra')
const { removeBackgroundFromImageBase64 } = require('remove.bg')
const cheerio = require("cheerio");
const baseUrl = 'https://www.myinstants.com';
const searchUrl = 'https://www.myinstants.com/search/?name=';
const { MoveClient } = require('pokenode-ts')
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const maxLevel = 100; // Maximum level for a Pokémon
const path = require('path');


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
    await execute(`dwebp "${filename}.webp" -o "${filename}.png"`)
    const buffer = await readFile(`${filename}.png`)
    Promise.all([unlink(`${filename}.png`), unlink(`${filename}.webp`)])
    return buffer
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
    await execute(
        `ffmpeg -f gif -i ${filename}.gif -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" ${filename}.mp4`
    )
    if (write) return `${filename}.mp4`
    const buffer = await readFile(`${filename}.mp4`)
    Promise.all([unlink(`${filename}.gif`), unlink(`${filename}.mp4`)])
    return buffer
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
    await execute(`ffmpeg -i "${filename}.gif" -vframes 1 "${filename}.png"`);
    const buffer = await readFile(`${filename}.png`);
    await Promise.all([unlink(`${filename}.gif`), unlink(`${filename}.png`)]);
    return buffer;
};

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
        const typesData = JSON.parse(await readFile(typesDataPath, 'utf8'));
    
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
    
    /**
     * @param {string} pokemon - The name of the Pokémon.
     * @param {number} level - The level of the Pokémon.
     * @returns {Promise<object>} An object containing assigned moves and rejected moves.
     */
    const assignPokemonMoves = async (pokemon, level) => {
        let moves = shuffleArray(
            (await (await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)).data).moves.filter(
                (move) =>
                    move.version_group_details[0].move_learn_method.name === 'level-up' &&
                    move.version_group_details[0].level_learned_at <= level
            )
        );
    
        const client = new MoveClient();
        const result = [];
        const rejectedMoves = [];
    
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
            result.push({
                name: data.name,
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
                description: descriptions[0] ? descriptions[0].flavor_text : ''
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
const calculatePokeExp = (level) => {
    if (level <= 0 || level > maxLevel) {
        return Infinity; // or any other appropriate value to indicate an invalid level
    }

    return level <= 10 ? 100 + (level - 1) * 100 :
           level <= 50 ? 1000 + (level - 10) * 200 :
           9000 + (level - 50) * 300;
};

/**
 * Get the level by given experience.
 * @param {number} exp - The experience points.
 * @returns {number} The level corresponding to the given experience.
 */
const getLevelByExp = (exp) => {
    if (exp < 100) {
        return 0; // No level for experience below 100
    } else if (exp < 1000) {
        return Math.floor((exp - 100) / 100) + 1;
    } else if (exp < 9000) {
        return Math.floor((exp - 1000) / 200) + 10;
    } else {
        return Math.min(Math.floor((exp - 9000) / 300) + 50, maxLevel);
    }
};

/**
 * Get the experience needed for a given level.
 * @param {number} level - The level of the Pokémon.
 * @returns {number} The experience needed for the given level.
 */
const getExpByLevel = (level) => {
    return calculatePokeExp(level);
};

/**
 * Get the required experience to reach the next level from the current experience.
 * @param {number} currentExp - The current experience points.
 * @returns {number} The experience points needed to reach the next level.
 */
const getRequiredExp = (currentExp) => {
    const currentLevel = getLevelByExp(currentExp);
    const nextLevelExp = calculatePokeExp(currentLevel + 1);
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
    const { hp, speed, defense, attack } = await client.utils.getPokemonStats(pkmn.id, pkmn.level);
    pkmn.hp += hp - pkmn.maxHp;
    pkmn.speed += speed - pkmn.speed;
    pkmn.defense += defense - pkmn.defense;
    pkmn.attack += attack - pkmn.attack;
    pkmn.maxAttack = attack;
    pkmn.maxSpeed = speed;
    pkmn.maxHp = hp;
    pkmn.maxDefense = defense;
    party[i] = pkmn;
    await client.poke.set(`${M.sender}_Party`, party);
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
        await client.poke.set(`${M.sender}_Party`, party);
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
const handlePokemonEvolution = async (client, M, pkmn, inBattle, player, user) => {
    try {
        const evolutions = await client.utils.getPokemonEvolutionChain(pkmn.name);
        if (!evolutions || evolutions.length < 1) return;
 
        const response = await axios.get('https://aurora-api.vercel.app/poke/chains');
        const pokemonEvolutionChain = await response.data;
 
        if (!pokemonEvolutionChain || !Array.isArray(pokemonEvolutionChain)) {
            throw new Error("Invalid Pokemon evolution chain data");
        }
 
        const chain = pokemonEvolutionChain.filter((x) => evolutions.includes(x.species_name));
        if (chain.length < 1) return;
 
        const index = evolutions.findIndex((x) => x === pkmn.name) + 1;
        if (!evolutions[index]) return;
 
        const chainIndex = chain.findIndex((x) => x.species_name === evolutions[index]);
        if (chainIndex < 0) return;
 
        const pokemonToEvolve = chain[chainIndex];
        if (pokemonToEvolve.trigger_name !== 'level-up') return;
        if (pokemonToEvolve.min_level > pkmn.level) return;
        if (client.pokemonEvolutionResponse.has(`${pkmn.name}${user}`)) return;
 
        const text = `*@${user.split('@')[0]}*, your Pokemon *${client.utils.capitalize(
            pkmn.name
        )}* is evolving to *${client.utils.capitalize(evolutions[index])}*. Use *${
            client.prefix
        }cancel-evolution* to cancel this evolution (within 60s)`;
 
        let party = await client.poke.get(`${M.sender}_Party`) || [];
        const i = party.findIndex((x) => x.tag === pkmn.tag);
 
        await client.sendMessage(M.from, { text });
        client.pokemonEvolutionResponse.set(user, {
            group: M.from,
            pokemon: pkmn.name
        });
 
        setTimeout(async () => {
            if (!client.pokemonEvolutionResponse.has(user)) return;
            client.pokemonEvolutionResponse.delete(user);
 
            const pDataResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${evolutions[index]}`);
            const pData = pDataResponse.data;
 
            pkmn.id = pData.id;
            pkmn.image = pData.sprites.other['official-artwork'].front_default;
            pkmn.name = pData.name;
 
            const { hp, attack, defense, speed } = await client.utils.getPokemonStats(pkmn.id, pkmn.level);
            pkmn.hp += hp - pkmn.maxHp;
            pkmn.speed += speed - pkmn.speed;
            pkmn.defense += defense - pkmn.defense;
            pkmn.attack += attack - pkmn.attack;
            pkmn.maxAttack = attack;
            pkmn.maxSpeed = speed;
            pkmn.maxHp = hp;
            pkmn.maxDefense = defense;
 
            if (pkmn.tag === '0') await client.poke.set(`${M.sender}_Companion`, pData.name);
            party[i] = pkmn;
 
            if (inBattle) {
                const data = client.pokemonBattleResponse.get(M.from);
                if (data && data[player].activePokemon.tag === pkmn.tag) {
                    data[player].activePokemon = pkmn;
                    client.pokemonBattleResponse.set(M.from, data);
                }
            }
 
            await client.poke.set(`${M.sender}_Party`, party);
 
            const buffer = await client.utils.getBuffer(pkmn.image);
            await client.sendMessage(M.from, {
                image: buffer,
                jpegThumbnail: buffer.toString('base64'),
                caption: `Congrats! *@${user.split('@')[0]}*, your ${client.utils.capitalize(
                    evolutions[index - 1]
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
   
    const background = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'images', 'battle.png'))
    );
    const pokeball = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'images', 'pokeball.png'))
    );
    const greyPokeball = await Canvas.loadImage(
        await readFile(join(__dirname, '..', '..', 'assets', 'images', 'greyPokeball.png'))
    );
    const canvas = Canvas.createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(background, 0, 0);

    const pokemonSize = 128;
    const pokemonStyles = await getPokemonStyles(pokemonSize);
    const boxPadding = 12;

    for (let i = 0; i < 2; i++) {
        const style = pokemonStyles[`player${i + 1}`];
        const player = data[`player${i + 1}`];

        const pokemonPos = { x: 1, y: 1 };
        const pokemonImage = await Canvas.loadImage(
            i === 1
                ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data[`player${i + 1}`].activePokemon.id}.png`
                : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${data[`player${i + 1}`].activePokemon.id}.png`
        );
        const clipY = style.pokemon.clipY;
        const size = style.pokemon.size;

        if (player.activePokemon.hp > 0) {
            ctx.drawImage(
                pokemonImage,
                pokemonPos.x,
                pokemonPos.y,
                96,
                96 - clipY,
                style.pokemon.x,
                style.pokemon.y,
                size,
                size - clipY
            );
        }

        const boxCanvas = Canvas.createCanvas(150, 60);
        const boxCtx = boxCanvas.getContext('2d');
        boxCtx.fillStyle = 'rgb(24,24,24)';
        boxCtx.strokeStyle = 'rgb(36,36,36)';
        roundRect(boxCtx, 0, 0, boxCanvas.width, boxCanvas.height, 16);

        boxCtx.font = 'bold 12px Sans-Serif';
        boxCtx.fillStyle = '#ffffff';

        const namePos = { x: boxPadding, y: boxCanvas.height - boxPadding };
        boxCtx.textAlign = 'left';
        boxCtx.fillText(
            `${capitalize(player.activePokemon.name)}${player.activePokemon.name.length <= 6 ? '\t\t' : '\t'}Lv. ${player.activePokemon.level}`,
            namePos.x,
            namePos.y
        );

        const hpPos = { x: boxCanvas.width - boxPadding, y: boxPadding * 2 };
        boxCtx.textAlign = 'right';
        boxCtx.fillText(`HP: ${player.activePokemon.hp} / ${player.activePokemon.maxHp}`, hpPos.x, hpPos.y);

        const pokeballGap = 2;
        const pokeballSize = 7;
        const pokeballPos = { x: boxPadding, y: boxPadding };
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
     * @param {number} pokemonSize - The size of the Pokémon image.
     * @returns {Promise<Object>} - Promise resolving to an object containing styles for player Pokémon.
     */
const getPokemonStyles = async (pokemonSize) => ({
    player1: {
        pokemon: {
            x: 100 - pokemonSize / 2,
            y: 138,
            size: 128,
            showBack: true,
            clipY: 45
        },
        box: { x: 25, y: 60 },
        moves: { x: 0, y: 225 }
    },
    player2: {
        pokemon: {
            x: 300 - pokemonSize / 2,
            y: 60,
            size: 100,
            showBack: false,
            clipY: 0
        },
        box: { x: 230, y: 150 },
        moves: { x: 0, y: 5 }
    }
});

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
    getLevelByExp,
    getExpByLevel,
    getRequiredExp,
    handlePokemonStats,
    handlePokemonEvolution,
    drawPokemonBattle
}
