# HELLRYZEN — Aurora WhatsApp Bot

A feature-rich WhatsApp bot built with Node.js and @whiskeysockets/baileys.

## Tech Stack
- **Runtime:** Node.js 20
- **WhatsApp:** @whiskeysockets/baileys (multi-device)
- **Database:** MongoDB (mongoose + quickmongo) with JSON fallback
- **Image:** canvas, sharp, wa-sticker-formatter
- **Economy/Cards:** Yu-Gi-Oh, Pokémon, anime card systems

## Architecture
- `src/aurora.js` — Main entry point: WhatsApp connection, DB setup, handler init
- `src/Handlers/` — Message, Events, Card, Pokemon, Dungeon, Yugioh handlers
- `src/Commands/` — Modular commands by category (General, Economy, Yugioh, Pokemons, etc.)
- `src/Helpers/` — Stats, yugioh API, pokeballs, yugiohCommand utilities
- `src/lib/` — CardRenderer (canvas), YT, Spotify helpers
- `src/Database/Models/` — Mongoose schemas (economy, session)

## Environment Variables (Secrets)
- `URL` — MongoDB connection URI (required)
- `openAI` — OpenAI API key (for AI chat features)

## Non-sensitive Env Vars (set via Replit env vars)
- `NAME` — Bot name (default: Aurora)
- `PREFIX` — Command prefix (default: -)
- `OWNER` — Owner's phone number (digits only, no +)
- `MODS` — Comma-separated mod phone numbers
- `PORT` — HTTP port (default: 3000)

## Key Storage Design
- **XP / Experience** — stored by phone number digits only (e.g. `2347049044897`)
- **Economy (gems/treasury)** — MongoDB via `economy` mongoose model
- **YuGiOh collection/deck** — MongoDB via `client.DB` (`yu-collection-<user>`, `yu-deck-<user>`)
- **Roles (owner/mods/officers)** — Local JSON (`client.roleDB` / quickdb.json)
- **Group toggles (wild/cards/yugioh/nsfw etc)** — MongoDB via `client.DB`

## Commands Summary

### General
- `-rank` / `-rk` — Show rank card (no XP reward to prevent farming)
- `-profile` / `-p` — Show full profile with XP, level, rank, gems
- `-leaderboard` / `-lb` — XP or gems leaderboard
- `-mods` — List all staff with @mentions

### Dev (Staff Only)
- `-disable <cmd> | <reason>` — Disable a command globally
- `-enable <cmd>` — Re-enable a disabled command
- `-roleslist` / `-roles` / `-staff` — List all roles with @mentions
- `-addmod @user` — Add moderator
- `-delmod @user` — Remove moderator
- `-addsudo @user` — Add officer
- `-delsudo @user` — Remove officer

### Moderation
- `-set --<feature>=enable|disable` — Toggle group features (mod, events, cards, wild, dungeon, yugioh, nsfw)

### Yu-Gi-Oh
- `-yugioh <name|id>` — Fetch card info
- `-yuget` / `-yuclaim` — Claim spawned card
- `-yucollection [index]` — View collection
- `-yudeck [index]` — View deck
- `-yubattle @user [deckIndex]` — Challenge user to a duel
- `-yuaccept [deckIndex]` — Accept a duel challenge (shows canvas battle image)
- `-yudecline` — Decline a duel
- `-yubattlestatus` / `-yubs` — Check pending challenge
- `-sale <index> <price>` — List card for sale
- `-purchase <listingId>` — Buy from market
- `-yutrade <yourIndex> <theirIndex> @user` — Trade cards
- `-giveyucard <index> @user` — Give a card
- `-discard <index> [--deck]` — Remove a card
- `-swapyu <idx1> <idx2>` — Swap deck cards

## Fixes Applied (Latest)
- `rank` no longer awards 100 XP per use (was farmable)
- `profile` XP now uses same key as rank/message handler (phone number digits)
- `disable`/`enable` commands fixed — proper array update + alias resolution
- `roleslist` now uses local `roleDB` for name lookup (was incorrectly using MongoDB)
- `roleslist` and `mods` now @mention all staff members
- YuGiOh battle system added with canvas battlefield image

## Running
The bot starts via `npm start` → `node src/aurora.js`.
On first run it prompts for WhatsApp auth (QR / pairing code / base64 session).
