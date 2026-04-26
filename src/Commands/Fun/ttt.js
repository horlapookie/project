const ttt = new Map();
const ms = require('parse-ms');

const emojiNumbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

const displayBoard = (board) => {
  return `
${board[0]} | ${board[1]} | ${board[2]}
--------------
${board[3]} | ${board[4]} | ${board[5]}
--------------
${board[6]} | ${board[7]} | ${board[8]}
`;
};

const checkWin = (board, player) => {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  return winPatterns.some(pattern => 
    pattern.every(index => board[index] === player)
  );
};

const isBoardFull = (board) => {
  return board.every(cell => cell === '❌' || cell === '⭕');
};

module.exports = {
  name: "tictactoe",
  aliases: ["ttt"],
  exp: 5,
  cool: 5,
  react: "🥳",
  category: "games",
  description: "Play Tic-Tac-Toe: start, join, mark, forfeit, reject, guide",
  async execute(client, arg, M) {
    const args = arg.split(' ');
    const command = args[0];
    const challenger = M.sender;
    const challenged = M.mentions[0] || (M.quoted && M.quoted.participant);

    const isPlayerInGame = (player) => {
      for (const game of ttt.values()) {
        if (game.challenger === player || game.opponent === player) {
          return true;
        }
      }
      return false;
    };

    if (!command) {
      return M.reply(`⚠️ **No command provided. Use** \`${client.prefix}ttt guide\` **for instructions on how to play.**`);
    }

    if (command === 'guide') {
      return M.reply(`
        🎮 **Tic-Tac-Toe Game Guide** 🎮
        - \`${client.prefix}ttt start @tag\`: Challenge someone to a game of Tic-Tac-Toe. Entry fee is 5000 coins per player.
        - \`${client.prefix}ttt join\`: Accept a challenge.
        - \`${client.prefix}ttt mark (number)\`: Place your mark on the board.
        - \`${client.prefix}ttt forfeit\`: Forfeit the current game.
        - \`${client.prefix}ttt reject\`: Reject a pending challenge.
        
        **Game Details:**
        - Both players need to have at least 5000 coins to start the game.
        - The game board consists of 9 positions, numbered 1 to 9.
        - Players take turns to place their marks (❌ or ⭕) on the board.
        - The first player to get three marks in a row (horizontally, vertically, or diagonally) wins the game.
        - The winner receives a prize of 10000 coins.
        - If the board is full and no player has won, the game ends in a draw.
      `);
    } else if (command === 'start') {
      if (!challenged || challenged === challenger) {
        return M.reply('You must tag someone to challenge.');
      }

      if (isPlayerInGame(challenger) || isPlayerInGame(challenged)) {
        return M.reply('⚠️ One or both players are already in a game.');
      }

      const challengerEconomy = await client.econ.findOne({ userId: challenger });
      const challengedEconomy = await client.econ.findOne({ userId: challenged });

      if (challengerEconomy.coin < 5000 || challengedEconomy.coin < 5000) {
        return M.reply('⚠️ Both players need to have at least 5000 coins to start the game.');
      }

      challengerEconomy.coin -= 5000;
      challengedEconomy.coin -= 5000;
      await challengerEconomy.save();
      await challengedEconomy.save();

      ttt.set(challenged, {
        progress: false,
        challenger: challenger,
        board: [...emojiNumbers],
        currentPlayer: '❌',
        opponent: null
      });

      M.reply(`🎮 **Tic-Tac-Toe Challenge!** 🎮\n\n@${challenged.split('@')[0]}, you have been challenged by @${challenger.split('@')[0]} to a game of Tic-Tac-Toe. Use \`${client.prefix}ttt join\` to accept or \`${client.prefix}ttt reject\` to decline.\n\n💰 **Both players have given 5000 coins to join the game.**`);
    } else if (command === 'join') {
      const game = ttt.get(challenger);

      if (!game || game.progress) {
        return M.reply('⚠️ You have no pending challenges or are already in a game.');
      }

      if (isPlayerInGame(challenger)) {
        return M.reply('⚠️ You are already in a game.');
      }

      game.progress = true;
      game.opponent = challenger;
      ttt.set(game.challenger, game);
      ttt.set(game.opponent, game);

      M.reply(`🎮 **Game On!** 🎮\n\n@${game.challenger.split('@')[0]} is ❌ and @${game.opponent.split('@')[0]} is ⭕\n\n${displayBoard(game.board)}\n\n❌ **Player X's turn. Use \`${client.prefix}ttt mark (number)\` to place your mark.**`);
    } else if (command === 'mark') {
      const game = ttt.get(challenger) || ttt.get(challenged);
      if (!game || !game.progress) {
        return M.reply(`⚠️ You need to be in a game to make a move. Start a new game using \`${client.prefix}ttt start @tag\`.`);
      }

      // Check if it's the player's turn
      const player = game.challenger === M.sender ? '❌' : (game.opponent === M.sender ? '⭕' : null);
      if (player !== game.currentPlayer) {
        return M.reply('⚠️ It\'s not your turn to make a move.');
      }

      const position = parseInt(args[1]) - 1;
      if (isNaN(position) || position < 0 || position > 8) {
        return M.reply('❗ **Please choose a valid position (1-9).**');
      }

      if (game.board[position] === '❌' || game.board[position] === '⭕') {
        return M.reply('⚠️ **This position is already taken. Choose another one.**');
      }

      game.board[position] = game.currentPlayer;
      if (checkWin(game.board, game.currentPlayer)) {
        const prizeAmount = 10000; // Fixed prize amount
        const winnerId = game.currentPlayer === '❌' ? game.challenger : game.opponent;
        const winnerEconomy = await client.econ.findOne({ userId: winnerId });

        if (winnerEconomy) {
          winnerEconomy.coin += prizeAmount;
          await winnerEconomy.save();
        }

        M.reply(`🎉 **Player ${game.currentPlayer} wins!** 🎉\n\n${displayBoard(game.board)}\n\n💰 **Prize:** ${prizeAmount} coins!`);
        ttt.delete(game.challenger);
        ttt.delete(game.opponent);
      } else if (isBoardFull(game.board)) {
        M.reply(`🔷 **It's a draw!** 🔷\n\n${displayBoard(game.board)}`);
        ttt.delete(game.challenger);
        ttt.delete(game.opponent);
      } else {
        game.currentPlayer = game.currentPlayer === '❌' ? '⭕' : '❌';
        M.reply(`${displayBoard(game.board)}\n\n${game.currentPlayer === '❌' ? '❌' : '⭕'} **Player ${game.currentPlayer}'s turn. Use \`${client.prefix}ttt mark (number)\` to place your mark.**`);
        ttt.set(game.challenger, game);
        ttt.set(game.opponent, game);
      }
    } else if (command === 'reject') {
      const game = ttt.get(challenger);
      if (!game || game.progress) {
        return M.reply('⚠️ You have no pending challenges.');
      }

      const challengerEconomy = await client.econ.findOne({ userId: game.challenger });
      const challengedEconomy = await client.econ.findOne({ userId: challenger });

      challengerEconomy.coin += 5000;
      challengedEconomy.coin += 5000;
      await challengerEconomy.save();
      await challengedEconomy.save();

      ttt.delete(challenger);
      M.reply(`🏳️ **You have rejected the challenge from @${game.challenger.split('@')[0]}. Both players have been refunded their coins.**`);
    } else if (command === 'forfeit') {
      const game = ttt.get(challenger) || ttt.get(challenged);
      if (!game || !game.progress) {
        return M.reply('⚠️ You are not currently in a game.');
      }

      const forfeitingPlayer = challenger === game.challenger ? game.challenger : game.opponent;
      const winningPlayer = challenger === game.challenger ? game.opponent : game.challenger;
      ttt.delete(game.challenger);
      ttt.delete(game.opponent);

      const winnerEconomy = await client.econ.findOne({ userId: winningPlayer });
      winnerEconomy.coin += 10000;
      await winnerEconomy.save();

      M.reply(`🏳️ **Player @${forfeitingPlayer.split('@')[0]} has forfeited the game. @${winningPlayer.split('@')[0]} wins and receives 10000 coins!**`);
    } else {
      M.reply(`⚠️ **Invalid command. Use \`${client.prefix}ttt start @tag / join / mark (number) / forfeit / reject / guide\`.**`);
    }
  }
};
