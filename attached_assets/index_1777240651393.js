import baileysPkg, {
  useMultiFileAuthState as _useMultiFileAuthState,
  DisconnectReason as _DisconnectReason,
  fetchLatestBaileysVersion as _fetchLatestBaileysVersion,
  Browsers as _Browsers,
  makeWASocket as _makeWASocket,
} from '@whiskeysockets/baileys';

const makeWASocket = _makeWASocket || baileysPkg?.makeWASocket || baileysPkg?.default || baileysPkg;
const useMultiFileAuthState = _useMultiFileAuthState || baileysPkg?.useMultiFileAuthState;
const DisconnectReason = _DisconnectReason || baileysPkg?.DisconnectReason;
const fetchLatestBaileysVersion = _fetchLatestBaileysVersion || baileysPkg?.fetchLatestBaileysVersion;
const Browsers = _Browsers || baileysPkg?.Browsers;
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { CONFIG } from './config.js';
import { routeMessage } from './router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, '../auth');
const logger = pino({ level: 'silent' });

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, a => { rl.close(); res(a.trim()); }));
}

async function start() {
  // If we're not yet registered, ensure auth folder is fresh so pairing succeeds
  const credsPath = path.join(AUTH_DIR, 'creds.json');
  if (fs.existsSync(credsPath)) {
    try {
      const c = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (!c.registered) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); }
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'), // most reliable for pairing-code login
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    markOnlineOnConnect: false,
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    let phone = (process.env.BOT_NUMBER || CONFIG.BOT_NUMBER || CONFIG.OWNER_NUMBER || '').replace(/\D/g, '');
    if (!phone) {
      phone = (await ask('📱 Enter the WhatsApp number to link (with country code, no +): '))
        .replace(/\D/g, '');
    }
    // Wait for socket to be ready, then request a custom 8-char alphanumeric pairing code
    setTimeout(async () => {
      try {
        const customCode = 'INFINIX1'; // exactly 8 chars, A-Z and digits only
        const code = await sock.requestPairingCode(phone, customCode);
        const pretty = code.match(/.{1,4}/g)?.join('-') || code;
        console.log('\n========================================');
        console.log(`  ${CONFIG.BOT_NAME} — WhatsApp Pairing`);
        console.log('========================================');
        console.log(`  Phone:  +${phone}`);
        console.log(`  Code :  ${pretty}`);
        console.log('========================================');
        console.log('  Steps on your phone:');
        console.log('   1. Open WhatsApp');
        console.log('   2. Settings → Linked Devices');
        console.log('   3. Tap "Link a Device"');
        console.log('   4. Tap "Link with phone number instead"');
        console.log('   5. Make sure the displayed number');
        console.log(`      matches +${phone}`);
        console.log('   6. Type the 8-character code above');
        console.log('========================================');
        console.log('  ⚠ The code expires in ~60 seconds.');
        console.log('  ⚠ Restart the bot to get a new one.\n');
      } catch (e) {
        console.error('Failed to request pairing code:', e?.message || e);
      }
    }, 4000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      console.log(`✅ ${CONFIG.BOT_NAME} connected as ${sock.user?.id}`);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut
        && code !== DisconnectReason.connectionReplaced;
      console.log(`❌ Connection closed (${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(start, 3000);
      else if (code === DisconnectReason.loggedOut) {
        console.log('   Logged out — clearing auth and re-pairing.');
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
        setTimeout(start, 3000);
      }
    }
  });

  // Greet the group when the bot is added.  Also greet *new joiners* in any
  // group that has opted in via `-welcome on`.
  const GREETING = `hi I'm ${CONFIG.BOT_NAME.toLowerCase()} by Deezbots use ${CONFIG.PREFIX}help to get started`;
  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const { db } = await import('./lib/storage.js');
      const me = (sock.user?.id || '').replace(/:.*$/, '').replace(/\D/g, '');
      const botJoined = (ev.participants || []).some(p => p.replace(/\D/g, '') === me);

      if (ev.action === 'add' && botJoined) {
        await sock.sendMessage(ev.id, { text: GREETING });
      }

      // Welcome new members (other than the bot) if this group opted in.
      if (ev.action === 'add' && (db.state.welcomeChats || []).includes(ev.id)) {
        const newcomers = (ev.participants || []).filter(p => p.replace(/\D/g, '') !== me);
        if (newcomers.length) {
          let groupName = '';
          try { const meta = await sock.groupMetadata(ev.id); groupName = meta?.subject || ''; }
          catch (_) { /* ignore */ }
          const tags = newcomers.map(p => `@${p.split('@')[0]}`).join(' ');
          const text = `👋 welcome ${tags} to *${groupName || 'the group'}* — I'm *${CONFIG.BOT_NAME}* by Deezbots`;
          await sock.sendMessage(ev.id, { text, mentions: newcomers });
        }
      }
    } catch (e) { console.error('group greeting err:', e.message); }
  });
  sock.ev.on('groups.upsert', async (groups) => {
    for (const g of groups || []) {
      try { await sock.sendMessage(g.id, { text: GREETING }); }
      catch (e) { console.error('group greeting (upsert) err:', e.message); }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        await routeMessage({ sock, msg });
      } catch (e) {
        console.error('route error:', e);
      }
    }
  });
}

start().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
