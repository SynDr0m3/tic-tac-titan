// Game State
let gameMode = null;
let selectedAI = "zeus";
let gameActive = false;
let currentPlayer = "X";

// DOM Elements
const modeScreen = document.getElementById("mode-screen");
const pvpScreen = document.getElementById("pvp-screen");
const pvaScreen = document.getElementById("pva-screen");
const gameScreen = document.getElementById("game-screen");
const board = document.getElementById("board");
const cells = document.querySelectorAll(".cell");
const turnText = document.getElementById("turn-text");
const historyList = document.getElementById("history-list");
const moveCount = document.getElementById("move-count");
const winModal = document.getElementById("win-modal");

// Mode Selection - Navigate to setup screen
function selectMode(mode) {
  gameMode = mode;
  modeScreen.classList.remove("active");

  if (mode === "pvp") {
    pvpScreen.classList.add("active");
  } else {
    pvaScreen.classList.add("active");
  }
}

// Go back to mode selection
function goBackToMode() {
  pvpScreen.classList.remove("active");
  pvaScreen.classList.remove("active");
  modeScreen.classList.add("active");
}

// AI Selection
document.querySelectorAll(".ai-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".ai-btn")
      .forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedAI = btn.dataset.ai;
  });
});

// Cell Click Handler
cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    if (!gameActive) return;
    if (cell.classList.contains("taken")) return;

    const index = parseInt(cell.dataset.index);
    makeMove(index);
  });
});

// Start Game
async function startGame(mode) {
  console.log("startGame called with mode:", mode);
  gameMode = mode;

  let player1Name, player2Name, aiOpponent;

  if (mode === "pvp") {
    player1Name =
      document.getElementById("player1-name").value.trim() || "Player 1";
    player2Name =
      document.getElementById("player2-name").value.trim() || "Player 2";
  } else {
    player1Name =
      document.getElementById("player-name-ai").value.trim() || "Player";
    aiOpponent = selectedAI;
  }

  console.log("Sending request with:", {
    mode,
    player1Name,
    player2Name,
    aiOpponent,
  });

  try {
    const response = await fetch("/api/new-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode,
        player1_name: player1Name,
        player2_name: player2Name,
        ai_opponent: aiOpponent,
        reset_scores: true, // Reset scores when starting from menu
        delay_ai: true, // Enable AI delay
      }),
    });

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      console.log("Success! Switching screens...");
      gameActive = true;

      // Update UI
      document.getElementById("display-player1").textContent =
        data.player1_name;
      document.getElementById("display-player2").textContent =
        data.player2_name;
      document.getElementById("player1-score").textContent =
        data.scores.player1;
      document.getElementById("player2-score").textContent =
        data.scores.player2;
      document.getElementById("draws-count").textContent = data.scores.draws;

      // Player 1 is always X, Player 2 is always O
      updatePlayerSymbols();

      // Switch screens
      pvpScreen.classList.remove("active");
      pvaScreen.classList.remove("active");
      gameScreen.classList.add("active");
      console.log("Screens switched!");

      // Sync right section height with left section
      syncSectionHeights();

      // Render board
      renderBoard(data.board);
      resetHistory();

      // If AI needs to move first (with delay)
      if (data.ai_pending) {
        updateTurnIndicatorForAI(data.current_player);
        disableBoard();
        setTimeout(async () => {
          await makeAIMove();
        }, 2000);
      } else if (data.ai_move !== undefined) {
        // If AI already moved (old behavior fallback)
        renderBoard(data.board);
        renderHistory(data.moves_history, data.move_count);
        updateTurnIndicator(data.current_player);
      } else {
        updateTurnIndicator(data.current_player);
      }
    } else {
      console.error("Server returned success: false", data);
    }
  } catch (error) {
    console.error("Error starting game:", error);
  }
}

// Update player symbols display - Player 1 is ALWAYS X, Player 2 is ALWAYS O
function updatePlayerSymbols() {
  const player1Card = document.getElementById("player1-card");
  const player2Card = document.getElementById("player2-card");

  // Player 1 = X (always)
  player1Card.querySelector(".player-symbol").textContent = "X";
  player1Card.querySelector(".player-symbol").style.color = "var(--x-color)";
  // Player 2 = O (always)
  player2Card.querySelector(".player-symbol").textContent = "O";
  player2Card.querySelector(".player-symbol").style.color = "var(--o-color)";
}

// Make Move
async function makeMove(position) {
  try {
    const response = await fetch("/api/make-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ position: position, delay_ai: true }),
    });

    const data = await response.json();

    if (data.success) {
      renderBoard(data.board);
      renderHistory(data.moves_history, data.move_count);

      if (data.game_over) {
        gameActive = false;
        updateScores(data.scores);
        // Show game over banner instead of modal immediately
        showGameOverBanner(data.winner, data.winner_name);
      } else if (data.ai_pending) {
        // AI needs to move - show "AI is thinking" and delay
        updateTurnIndicatorForAI(data.current_player);
        // Disable board while AI is thinking
        disableBoard();
        // Wait 2 seconds then trigger AI move
        setTimeout(async () => {
          await makeAIMove();
        }, 2000);
      } else {
        updateTurnIndicator(data.current_player);
      }
    }
  } catch (error) {
    console.error("Error making move:", error);
  }
}

// Make AI Move (separate call for delayed AI)
async function makeAIMove() {
  try {
    const response = await fetch("/api/ai-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json();

    if (data.success) {
      renderBoard(data.board);
      renderHistory(data.moves_history, data.move_count);
      enableBoard();

      if (data.game_over) {
        gameActive = false;
        updateScores(data.scores);
        showGameOverBanner(data.winner, data.winner_name);
      } else {
        updateTurnIndicator(data.current_player);
      }
    }
  } catch (error) {
    console.error("Error making AI move:", error);
    enableBoard();
  }
}

// Disable board during AI thinking
function disableBoard() {
  cells.forEach((cell) => {
    cell.style.pointerEvents = "none";
  });
}

// Enable board after AI move
function enableBoard() {
  cells.forEach((cell) => {
    if (!cell.classList.contains("taken")) {
      cell.style.pointerEvents = "auto";
    }
  });
}

// Sync right section height with left section
function syncSectionHeights() {
  setTimeout(() => {
    const leftSection = document.querySelector(".left-section");
    const rightSection = document.querySelector(".right-section");
    if (leftSection && rightSection) {
      const leftHeight = leftSection.offsetHeight;
      rightSection.style.height = leftHeight + "px";
      rightSection.style.maxHeight = leftHeight + "px";
    }
  }, 50); // Small delay to ensure DOM is rendered
}

// Render Board
function renderBoard(boardState) {
  cells.forEach((cell, index) => {
    cell.className = "cell";
    cell.textContent = "";
    cell.style.pointerEvents = "auto"; // Reset pointer events

    if (boardState[index] === 1) {
      cell.textContent = "X";
      cell.classList.add("x", "taken");
    } else if (boardState[index] === -1) {
      cell.textContent = "O";
      cell.classList.add("o", "taken");
    }
  });
}

// Update Turn Indicator
function updateTurnIndicator(player) {
  currentPlayer = player;

  // Player 1 = X, Player 2 = O (always)
  let playerName;
  if (player === "X") {
    playerName = document.getElementById("display-player1").textContent;
  } else {
    playerName = document.getElementById("display-player2").textContent;
  }

  const turnIndicator = document.getElementById("turn-indicator");
  const turnLabel = document.getElementById("turn-label");
  const thinkingDisplay = document.getElementById("thinking-display");

  // Reset the thinking display HTML structure (in case it was replaced by game over)
  thinkingDisplay.innerHTML = `
    <span class="thinking-spinner" id="thinking-spinner">⟳</span>
    <span class="thinking-text" id="thinking-text">${playerName} is thinking...</span>
  `;

  // Update turn label (small header) with styled symbol badge
  const symbolClass = player === "X" ? "x" : "o";
  turnLabel.innerHTML = `${playerName}'s Turn <span class="turn-symbol ${symbolClass}">${player}</span>`;

  // Update color class
  turnIndicator.classList.remove(
    "x-turn",
    "o-turn",
    "game-over",
    "human-turn",
    "ai-turn"
  );
  turnIndicator.classList.add(player === "X" ? "x-turn" : "o-turn");
  turnIndicator.classList.add("human-turn");

  // Update active card styling
  const player1Card = document.getElementById("player1-card");
  const player2Card = document.getElementById("player2-card");

  player1Card.classList.remove("active");
  player2Card.classList.remove("active");

  if (player === "X") {
    player1Card.classList.add("active");
  } else {
    player2Card.classList.add("active");
  }
}

// Update Turn Indicator specifically for AI (shows "calculating" instead of "thinking")
function updateTurnIndicatorForAI(player) {
  currentPlayer = player;

  // AI is always Player 2 = O
  let aiName = document.getElementById("display-player2").textContent;

  const turnIndicator = document.getElementById("turn-indicator");
  const turnLabel = document.getElementById("turn-label");
  const thinkingDisplay = document.getElementById("thinking-display");

  // Reset the thinking display HTML structure (in case it was replaced by game over)
  thinkingDisplay.innerHTML = `
    <span class="thinking-spinner" id="thinking-spinner">⟳</span>
    <span class="thinking-text" id="thinking-text">${aiName} is calculating...</span>
  `;

  // Update turn label (small header) with styled symbol badge
  const symbolClass = player === "X" ? "x" : "o";
  turnLabel.innerHTML = `${aiName}'s Turn <span class="turn-symbol ${symbolClass}">${player}</span>`;

  // Update color class
  turnIndicator.classList.remove(
    "x-turn",
    "o-turn",
    "game-over",
    "human-turn",
    "ai-turn"
  );
  turnIndicator.classList.add(player === "X" ? "x-turn" : "o-turn");
  turnIndicator.classList.add("ai-turn");

  // Update active card styling
  const player1Card = document.getElementById("player1-card");
  const player2Card = document.getElementById("player2-card");

  player1Card.classList.remove("active");
  player2Card.classList.remove("active");
  player2Card.classList.add("active");
}

// Render History
function renderHistory(history, count) {
  moveCount.textContent = `${count} move${count !== 1 ? "s" : ""}`;

  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No moves yet</div>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (move) => `
        <div class="history-item">
            <div class="history-number">${move.move_number}</div>
            <div class="history-symbol ${move.symbol.toLowerCase()}">${
        move.symbol
      }</div>
            <div class="history-details">
                <div class="history-player">${move.player}</div>
                <div class="history-position">Position ${move.position}</div>
            </div>
        </div>
    `
    )
    .join("");

  // Scroll to bottom
  historyList.scrollTop = historyList.scrollHeight;
}

// Reset History
function resetHistory() {
  historyList.innerHTML = '<div class="history-empty">No moves yet</div>';
  moveCount.textContent = "0 moves";
}

// Update Scores
function updateScores(scores) {
  document.getElementById("player1-score").textContent = scores.player1;
  document.getElementById("player2-score").textContent = scores.player2;
  document.getElementById("draws-count").textContent = scores.draws;
}

// Store game result for modal
let lastGameResult = { winner: null, winnerName: null };

// Show Game Over Banner (lets user review the board)
function showGameOverBanner(winner, winnerName) {
  lastGameResult = { winner, winnerName };

  const turnIndicator = document.getElementById("turn-indicator");
  const turnLabel = document.getElementById("turn-label");
  const thinkingDisplay = document.getElementById("thinking-display");
  const thinkingSpinner = document.getElementById("thinking-spinner");
  const thinkingText = document.getElementById("thinking-text");

  // Hide spinner, show result
  thinkingSpinner.style.display = "none";
  turnIndicator.classList.remove("x-turn", "o-turn");
  turnIndicator.classList.add("game-over");

  if (winner === "draw" || winner === null || winnerName === null) {
    thinkingDisplay.innerHTML = `
      <div class="winner-line">🤝 It's a Draw!</div>
      <div class="continue-line">Click to continue</div>
    `;
  } else {
    // Determine the winner's symbol
    const winnerSymbol = winner === "X" ? "X" : "O";
    const symbolClass = winner === "X" ? "x" : "o";
    thinkingDisplay.innerHTML = `
      <div class="winner-line"><span class="turn-symbol ${symbolClass}">${winnerSymbol}</span> ${winnerName} Wins! 🏆</div>
      <div class="continue-line">Click to continue</div>
    `;
  }

  turnIndicator.onclick = showResultModal;
}

// Show Result Modal (called when user clicks after reviewing)
function showResultModal() {
  const turnIndicator = document.getElementById("turn-indicator");
  turnIndicator.onclick = null;
  turnIndicator.classList.remove("game-over");

  showWinModal(lastGameResult.winner, lastGameResult.winnerName);
}

// Show Win Modal
function showWinModal(winner, winnerName) {
  const modalIcon = document.getElementById("modal-icon");
  const modalTitle = document.getElementById("modal-title");
  const modalMessage = document.getElementById("modal-message");

  if (winner === "draw" || winner === null || winnerName === null) {
    modalIcon.textContent = "🤝";
    modalTitle.textContent = "It's a Draw!";
    modalMessage.textContent = "Great game! Neither player won.";
  } else {
    const winnerSymbol = winner === "X" ? "X" : "O";
    const symbolClass = winner === "X" ? "x" : "o";
    modalIcon.textContent = "🏆";
    modalTitle.textContent = "Victory!";
    modalMessage.innerHTML = `<span class="turn-symbol ${symbolClass}">${winnerSymbol}</span> ${winnerName} wins the game!`;
  }

  winModal.classList.add("active");
}

// Play Again
async function playAgain() {
  winModal.classList.remove("active");

  let player1Name = document.getElementById("display-player1").textContent;
  let player2Name = document.getElementById("display-player2").textContent;

  try {
    const response = await fetch("/api/new-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: gameMode,
        player1_name: player1Name,
        player2_name: gameMode === "pvp" ? player2Name : undefined,
        ai_opponent: gameMode === "pva" ? selectedAI : undefined,
        delay_ai: true, // Enable AI delay
        // Don't reset scores on play again - keep the session going
      }),
    });

    const data = await response.json();

    if (data.success) {
      gameActive = true;

      // Player symbols stay the same (Player 1 = X, Player 2 = O)
      updatePlayerSymbols();

      // Render board
      renderBoard(data.board);
      resetHistory();
      updateScores(data.scores);

      // If AI needs to move first (with delay)
      if (data.ai_pending) {
        updateTurnIndicatorForAI(data.current_player);
        disableBoard();
        setTimeout(async () => {
          await makeAIMove();
        }, 2000);
      } else if (data.ai_move !== undefined) {
        // If AI already moved (old behavior fallback)
        renderBoard(data.board);
        renderHistory(data.moves_history, data.move_count);
        updateTurnIndicator(data.current_player);
      } else {
        updateTurnIndicator(data.current_player);
      }
    }
  } catch (error) {
    console.error("Error restarting game:", error);
  }
}

// Go to Setup (Mode Selection)
function goToSetup() {
  winModal.classList.remove("active");
  gameScreen.classList.remove("active");
  modeScreen.classList.add("active");
  gameActive = false;

  // Reset board
  cells.forEach((cell) => {
    cell.className = "cell";
    cell.textContent = "";
  });

  // Reset forms
  document.getElementById("player1-name").value = "";
  document.getElementById("player2-name").value = "";
  document.getElementById("player-name-ai").value = "";

  // Reset game mode
  gameMode = null;
}
