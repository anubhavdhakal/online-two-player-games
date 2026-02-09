# Online 2-Player Games

Play classic games with a friend — no sign-up, no server, just a room code.

**[Play Now → anubhavdhakal.github.io/online-two-player-games](https://anubhavdhakal.github.io/online-two-player-games/)**

## How It Works

1. Pick a game
2. Click **Create Game** — share the 6-character room code with your friend
3. Your friend clicks **Join Game** and enters the code
4. Play!

All connections are peer-to-peer via WebRTC (PeerJS). No backend server — game state is synced directly between browsers.

## Available Games

| Game | Status |
|------|--------|
| Tic-Tac-Toe | Live |
| Connect Four | Coming Soon |
| Battleship | Coming Soon |

## Tech Stack

- **Multiplayer:** PeerJS (WebRTC P2P) via CDN
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Hosting:** GitHub Pages
- **Style:** Dark theme with neon accents

## Project Structure

```
├── index.html              # Landing page with game selection
├── css/style.css           # Global dark neon theme
├── js/connection.js        # Reusable PeerJS connection manager
└── games/
    └── tictactoe/
        ├── index.html      # Game page (lobby + board)
        ├── style.css       # Game-specific styles
        └── game.js         # Game logic
```

## Adding a New Game

1. Create a folder under `games/` with `index.html`, `style.css`, and `game.js`
2. Use the `GameConnection` class from `js/connection.js` for multiplayer
3. Add a card to the landing page `index.html`
