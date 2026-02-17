/* ===== Dots and Boxes Game Logic ===== */

let gc = new GameConnection('dotsandboxes');
let unsubRoomBrowser = null;

// --- State ---
// The board is a 9x9 grid: dots at even,even; h-lines at even,odd; v-lines at odd,even; boxes at odd,odd
let lines = {};       // "r,c" -> true
let boxes = {};       // "r,c" -> 1 or 2
let myPlayer = null;  // 1 (host) or 2 (guest)
let isMyTurn = false;
let gameActive = false;
let hostGoesFirst = true;

// --- DOM refs ---
const $lobby              = document.getElementById('lobby');
const $gameArea           = document.getElementById('game-area');
const $createBtn          = document.getElementById('create-btn');
const $joinBtn            = document.getElementById('join-btn');
const $codeInput          = document.getElementById('code-input');
const $roomDisplay        = document.getElementById('room-display');
const $roomCode           = document.getElementById('room-code');
const $copyBtn            = document.getElementById('copy-btn');
const $copyLinkBtn        = document.getElementById('copy-link-btn');
const $waitingText        = document.getElementById('waiting-text');
const $connStatus         = document.getElementById('conn-status');
const $board              = document.getElementById('board');
const $turnText           = document.getElementById('turn-text');
const $scoreText          = document.getElementById('score-text');
const $overlay            = document.getElementById('overlay');
const $resultTitle        = document.getElementById('result-title');
const $resultMsg          = document.getElementById('result-msg');
const $playAgainBtn       = document.getElementById('play-again-btn');
const $backMenuBtn        = document.getElementById('back-menu-btn');
const $roomBrowser        = document.getElementById('room-browser');
const $roomList           = document.getElementById('room-list');
const $joinRequestAlert   = document.getElementById('join-request-alert');
const $acceptJoinBtn      = document.getElementById('accept-join-btn');
const $rejectJoinBtn      = document.getElementById('reject-join-btn');
const $joinRequestPending = document.getElementById('join-request-pending');
const $cancelRequestBtn   = document.getElementById('cancel-request-btn');

// =====================
//  Connection Callbacks
// =====================

function wireCallbacks(conn) {
  conn.onConnected = () => {
    $connStatus.textContent = 'Connected!';
    $connStatus.className = 'connection-status connected';
    $lobby.classList.add('hidden');
    $gameArea.classList.remove('hidden');
    stopRoomBrowser();
    startNewRound();
  };

  conn.onData = (data) => {
    switch (data.type) {
      case 'move':
        handleOpponentMove(data.row, data.col);
        break;
      case 'play-again':
        if (!gameActive) {
          hostGoesFirst = data.hostGoesFirst;
          startNewRound();
        }
        break;
    }
  };

  conn.onDisconnected = () => {
    returnToLobby('Opponent has left the game');
  };

  conn.onError = (err) => {
    $connStatus.textContent = 'Connection error: ' + (err.type || err.message || err);
    $connStatus.className = 'connection-status error';
  };

  conn.onJoinRequest = () => {
    $joinRequestAlert.classList.remove('hidden');
  };
}

function returnToLobby(message) {
  gameActive = false;
  gc.destroy();
  gc = new GameConnection('dotsandboxes');
  wireCallbacks(gc);

  lines = {};
  boxes = {};
  myPlayer = null;
  hostGoesFirst = true;

  $gameArea.classList.add('hidden');
  $overlay.classList.add('hidden');
  $lobby.classList.remove('hidden');
  $roomDisplay.classList.add('hidden');
  $waitingText.classList.add('hidden');
  $joinRequestAlert.classList.add('hidden');
  $joinRequestPending.classList.add('hidden');
  $roomBrowser.classList.remove('hidden');
  $createBtn.disabled = false;
  $joinBtn.disabled = false;
  $codeInput.disabled = false;
  $codeInput.value = '';

  $connStatus.textContent = message;
  $connStatus.className = 'connection-status error';

  startRoomBrowser();
}

wireCallbacks(gc);

// =====================
//  Room Browser
// =====================

function startRoomBrowser() {
  stopRoomBrowser();
  unsubRoomBrowser = GameConnection.listActiveRooms('dotsandboxes', (rooms) => {
    renderRoomList(rooms);
  });
}

function stopRoomBrowser() {
  if (unsubRoomBrowser) {
    unsubRoomBrowser();
    unsubRoomBrowser = null;
  }
}

function renderRoomList(rooms) {
  if (rooms.length === 0) {
    $roomList.innerHTML = '<p class="room-list-empty">No open rooms</p>';
    return;
  }

  $roomList.innerHTML = '';
  for (const room of rooms) {
    const item = document.createElement('div');
    item.className = 'room-list-item';
    item.innerHTML =
      '<span class="room-code-label">' + room.code + '</span>' +
      '<button class="btn btn-small btn-primary ask-join-btn" data-code="' + room.code + '">Ask to Join</button>';
    $roomList.appendChild(item);
  }
}

$roomList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.ask-join-btn');
  if (!btn) return;

  const code = btn.dataset.code;

  $createBtn.disabled = true;
  $joinBtn.disabled = true;
  $codeInput.disabled = true;
  $roomBrowser.classList.add('hidden');
  $joinRequestPending.classList.remove('hidden');
  $connStatus.textContent = 'Requesting to join...';
  $connStatus.className = 'connection-status';

  try {
    myPlayer = 2;
    await gc.requestToJoin(code);
  } catch (err) {
    $connStatus.textContent = err.message || 'Could not join. Try again.';
    $connStatus.className = 'connection-status error';
    myPlayer = null;
    $joinRequestPending.classList.add('hidden');
    $roomBrowser.classList.remove('hidden');
    $createBtn.disabled = false;
    $joinBtn.disabled = false;
    $codeInput.disabled = false;

    gc.destroy();
    gc = new GameConnection('dotsandboxes');
    wireCallbacks(gc);
  }
});

$acceptJoinBtn.addEventListener('click', () => {
  gc.acceptJoinRequest();
  $joinRequestAlert.classList.add('hidden');
});

$rejectJoinBtn.addEventListener('click', () => {
  gc.rejectJoinRequest();
  $joinRequestAlert.classList.add('hidden');
});

$cancelRequestBtn.addEventListener('click', () => {
  gc.destroy();
  gc = new GameConnection('dotsandboxes');
  wireCallbacks(gc);

  myPlayer = null;
  $joinRequestPending.classList.add('hidden');
  $roomBrowser.classList.remove('hidden');
  $createBtn.disabled = false;
  $joinBtn.disabled = false;
  $codeInput.disabled = false;
  $connStatus.textContent = '';
  $connStatus.className = 'connection-status';

  startRoomBrowser();
});

// =====================
//  Lobby Actions
// =====================

$createBtn.addEventListener('click', async () => {
  $createBtn.disabled = true;
  $joinBtn.disabled = true;
  $codeInput.disabled = true;
  $roomBrowser.classList.add('hidden');
  $connStatus.textContent = 'Creating game...';
  $connStatus.className = 'connection-status';
  stopRoomBrowser();

  try {
    const code = await gc.createGame();
    myPlayer = 1;
    $roomDisplay.classList.remove('hidden');
    $roomCode.textContent = code;
    $waitingText.classList.remove('hidden');
    $connStatus.textContent = 'Waiting for opponent...';
  } catch {
    $connStatus.textContent = 'Failed to create game. Try again.';
    $connStatus.className = 'connection-status error';
    $roomBrowser.classList.remove('hidden');
    $createBtn.disabled = false;
    $joinBtn.disabled = false;
    $codeInput.disabled = false;
    startRoomBrowser();
  }
});

$joinBtn.addEventListener('click', async () => {
  const code = $codeInput.value.trim();
  if (code.length < 4) {
    $connStatus.textContent = 'Enter a valid room code';
    $connStatus.className = 'connection-status error';
    return;
  }

  $createBtn.disabled = true;
  $joinBtn.disabled = true;
  $codeInput.disabled = true;
  $connStatus.textContent = 'Joining...';
  $connStatus.className = 'connection-status';
  stopRoomBrowser();

  try {
    myPlayer = 2;
    await gc.joinGame(code);
  } catch {
    $connStatus.textContent = 'Could not join. Check the code and try again.';
    $connStatus.className = 'connection-status error';
    $createBtn.disabled = false;
    $joinBtn.disabled = false;
    $codeInput.disabled = false;
    startRoomBrowser();
  }
});

$codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $joinBtn.click();
});

function getShareLink(code) {
  const url = new URL(window.location.href.split('?')[0]);
  url.searchParams.set('code', code);
  return url.toString();
}

$copyLinkBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(getShareLink($roomCode.textContent)).then(() => {
    $copyLinkBtn.textContent = 'Copied!';
    setTimeout(() => { $copyLinkBtn.textContent = 'Copy Link'; }, 1500);
  });
});

$copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText($roomCode.textContent).then(() => {
    $copyBtn.textContent = 'Copied!';
    setTimeout(() => { $copyBtn.textContent = 'Copy Code'; }, 1500);
  });
});

// =====================
//  Board Rendering
// =====================

function buildBoard() {
  $board.innerHTML = '';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const el = document.createElement('div');

      if (r % 2 === 0 && c % 2 === 0) {
        // Dot
        el.className = 'db-dot';
      } else if (r % 2 === 0 && c % 2 === 1) {
        // Horizontal line
        el.className = 'db-line-h';
        el.dataset.row = r;
        el.dataset.col = c;
      } else if (r % 2 === 1 && c % 2 === 0) {
        // Vertical line
        el.className = 'db-line-v';
        el.dataset.row = r;
        el.dataset.col = c;
      } else {
        // Box center
        el.className = 'db-box';
        el.dataset.row = r;
        el.dataset.col = c;
      }

      $board.appendChild(el);
    }
  }
}

function renderBoard() {
  const cells = $board.children;
  for (let i = 0; i < cells.length; i++) {
    const el = cells[i];
    const r = parseInt(el.dataset.row);
    const c = parseInt(el.dataset.col);

    if (el.classList.contains('db-line-h') || el.classList.contains('db-line-v')) {
      if (lines[r + ',' + c]) {
        el.classList.add('claimed');
      } else {
        el.classList.remove('claimed');
      }
    } else if (el.classList.contains('db-box')) {
      const owner = boxes[r + ',' + c];
      el.classList.remove('p1', 'p2');
      if (owner === 1) {
        el.classList.add('p1');
        el.textContent = 'P1';
      } else if (owner === 2) {
        el.classList.add('p2');
        el.textContent = 'P2';
      } else {
        el.textContent = '';
      }
    }
  }
}

// =====================
//  Game Logic
// =====================

function startNewRound() {
  lines = {};
  boxes = {};
  gameActive = true;
  isMyTurn = (myPlayer === 1) === hostGoesFirst;
  $overlay.classList.add('hidden');

  buildBoard();
  updateTurnIndicator();
  updateScoreDisplay();
}

function claimLine(r, c) {
  lines[r + ',' + c] = true;
}

// Check which boxes are completed by claiming a line at (r, c)
function checkBoxesForLine(r, c) {
  const completed = [];

  if (r % 2 === 0) {
    // Horizontal line — check box above (r-1, c) and below (r+1, c)
    if (r > 0) {
      const boxKey = (r - 1) + ',' + c;
      if (!boxes[boxKey] && isBoxComplete(r - 1, c)) {
        completed.push(boxKey);
      }
    }
    if (r < 8) {
      const boxKey = (r + 1) + ',' + c;
      if (!boxes[boxKey] && isBoxComplete(r + 1, c)) {
        completed.push(boxKey);
      }
    }
  } else {
    // Vertical line — check box left (r, c-1) and right (r, c+1)
    if (c > 0) {
      const boxKey = r + ',' + (c - 1);
      if (!boxes[boxKey] && isBoxComplete(r, c - 1)) {
        completed.push(boxKey);
      }
    }
    if (c < 8) {
      const boxKey = r + ',' + (c + 1);
      if (!boxes[boxKey] && isBoxComplete(r, c + 1)) {
        completed.push(boxKey);
      }
    }
  }

  return completed;
}

// Check if box at (br, bc) has all 4 sides claimed
// Box center is at odd,odd. Its 4 sides are:
//   top:    (br-1, bc)  — horizontal
//   bottom: (br+1, bc)  — horizontal
//   left:   (br, bc-1)  — vertical
//   right:  (br, bc+1)  — vertical
function isBoxComplete(br, bc) {
  return (
    lines[(br - 1) + ',' + bc] &&
    lines[(br + 1) + ',' + bc] &&
    lines[br + ',' + (bc - 1)] &&
    lines[br + ',' + (bc + 1)]
  );
}

function applyMove(r, c, player) {
  claimLine(r, c);
  const completed = checkBoxesForLine(r, c);
  for (const key of completed) {
    boxes[key] = player;
  }
  renderBoard();
  return completed.length;
}

function handleOpponentMove(r, c) {
  const opponent = myPlayer === 1 ? 2 : 1;
  const boxesClaimed = applyMove(r, c, opponent);

  // If opponent completed a box, they keep their turn
  if (boxesClaimed === 0) {
    isMyTurn = true;
  }

  updateTurnIndicator();
  updateScoreDisplay();
  checkGameOver();
}

function countBoxes() {
  let p1 = 0, p2 = 0;
  for (const key in boxes) {
    if (boxes[key] === 1) p1++;
    else if (boxes[key] === 2) p2++;
  }
  return { p1, p2 };
}

function checkGameOver() {
  const counts = countBoxes();
  if (counts.p1 + counts.p2 < 16) return;

  gameActive = false;

  if (counts.p1 > counts.p2) {
    const winner = myPlayer === 1 ? 'You Win!' : 'You Lose!';
    showOverlay(winner, 'P1: ' + counts.p1 + ' — P2: ' + counts.p2);
  } else if (counts.p2 > counts.p1) {
    const winner = myPlayer === 2 ? 'You Win!' : 'You Lose!';
    showOverlay(winner, 'P1: ' + counts.p1 + ' — P2: ' + counts.p2);
  } else {
    showOverlay('Draw!', 'P1: ' + counts.p1 + ' — P2: ' + counts.p2);
  }
}

// =====================
//  Board Click
// =====================

$board.addEventListener('click', (e) => {
  const el = e.target.closest('.db-line-h, .db-line-v');
  if (!el) return;

  const r = parseInt(el.dataset.row);
  const c = parseInt(el.dataset.col);
  const key = r + ',' + c;

  if (!gameActive || !isMyTurn || lines[key]) return;

  const boxesClaimed = applyMove(r, c, myPlayer);

  gc.send({ type: 'move', row: r, col: c });

  // Extra turn if a box was completed
  if (boxesClaimed === 0) {
    isMyTurn = false;
  }

  updateTurnIndicator();
  updateScoreDisplay();
  checkGameOver();
});

// =====================
//  UI Helpers
// =====================

function updateTurnIndicator() {
  if (!gameActive) return;
  $turnText.textContent = isMyTurn ? 'Your turn' : "Opponent's turn";
  $turnText.className = 'turn-indicator' + (isMyTurn ? ' my-turn' : '');
}

function updateScoreDisplay() {
  const counts = countBoxes();
  const myCount = myPlayer === 1 ? counts.p1 : counts.p2;
  const oppCount = myPlayer === 1 ? counts.p2 : counts.p1;
  $scoreText.textContent = 'You: ' + myCount + ' | Opp: ' + oppCount;
}

function showOverlay(title, msg) {
  $resultTitle.textContent = title;
  $resultMsg.textContent = msg;
  $overlay.classList.remove('hidden');
}

$playAgainBtn.addEventListener('click', () => {
  hostGoesFirst = !hostGoesFirst;
  gc.send({ type: 'play-again', hostGoesFirst });
  startNewRound();
});

$backMenuBtn.addEventListener('click', () => {
  stopRoomBrowser();
  gc.destroy();
  window.location.href = '../../index.html';
});

// =====================
//  Init + Auto-join
// =====================

(function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (code && code.trim().length >= 4) {
    $codeInput.value = code.trim().toUpperCase();
    $joinBtn.click();
  } else {
    startRoomBrowser();
  }
})();
