# QUEUED - Zombie Survival Game - OneChain Edition

A first-person survival horror game where you must navigate through multiple floors of a zombie-infested facility. Complete objectives, survive waves of zombies, and earn NFT achievements on the OneChain blockchain.

---

## 🎮 Game Overview

You wake up in a mysterious medical facility with no memory of how you got there. Navigate through 6 increasingly difficult floors, each with unique objectives and challenges. Survive zombie attacks, collect weapons, find keycards, and ultimately escape the facility.

### Game Features

* **First-person shooter gameplay** with Three.js
* **6 unique floors** with different objectives:

  * Floor 0: Find and stay in CCTV view
  * Floor 1: Eliminate all crawler zombies
  * Floor 2: Survive for 90 seconds
  * Floor 3: Find the research keycard
  * Floor 4: Defeat the mutated boss
  * Floor 5: Escape before time runs out
* **Multiple weapons** — Fists and shotgun
* **Health system** with healing items
* **Dynamic zombie AI** with patrol, chase, and attack behaviors
* **Leaderboards** for global and per-floor rankings
* **Achievement system** with NFT rewards on OneChain

---

## 🚀 Quick Start

### Prerequisites

* Node.js 18+ and npm/pnpm
* OneWallet browser extension for blockchain features

### Installation

```bash
git clone <your-repo-url>
cd zombie-survival-game
```

```bash
pnpm install
# or
npm install
```

```bash
pnpm dev
# or
npm run dev
```

Open: http://localhost:5173

---

## 📦 Project Structure

```
├── public/
│   ├── AchievementTracker.js
│   ├── game.js
│   ├── LevelLoader.js
│   ├── ObjectiveManager.js
│   ├── MobileControls.js
│   ├── models/
│   ├── levels/
│   └── sounds/
├── src/
│   ├── components/
│   ├── contexts/
│   │   └── WalletContext.tsx
│   ├── hooks/
│   │   └── useSuiGame.ts
│   ├── pages/
│   │   └── GamePage.tsx
│   └── types/
├── contracts/
│   └── achievement_nft/
└── index.html
```

---

## 🎯 Gameplay Guide

### Controls

| Action         | Key   |
| -------------- | ----- |
| Move Forward   | W     |
| Move Backward  | S     |
| Strafe Left    | A     |
| Strafe Right   | D     |
| Jump           | Space |
| Sprint         | Shift |
| Crouch         | Ctrl  |
| Punch/Interact | E     |
| Switch Weapon  | Tab   |
| Pause          | P     |

---

## 🧩 Floors & Objectives

### Floor 0 — Medical Bay

* Find the CCTV camera
* Stay in its view for 10 seconds
* Escape before zombies wake up

### Floor 1 — Crawler Ward

* Eliminate all crawling zombies
* Avoid being cornered
* Use the environment

### Floor 2 — Survival Ward

* Survive for 90 seconds
* Zombie waves increase over time
* Find healing items

### Floor 3 — Research Wing

* Find the research keycard
* Navigate locked rooms
* Avoid patrol zombies

### Floor 4 — Boss Arena

* Defeat the mutated boss
* 500 HP boss
* Use shotgun for damage

### Floor 5 — Escape Route

* Reach the exit before time runs out
* 120-second timer
* Infinite zombie spawns

---

## ⛓️ Blockchain Integration

### Smart Contract Features

* Player stats tracking
* Achievement NFT minting
* Global and per-floor leaderboards
* Floor performance records

### Contract Addresses (Testnet)

```js
PACKAGE_ID=0x5474c317de64693216a661d4b48a883b38234ec9cee605ad6838eb615ed0db04
REGISTRY_ID=0x6ca7d6a850e5c07600eec12de6217a64697f504817a49442ebf2f655a29f3ab1
GLOBAL_LEADERBOARD_ID=0x27e6d4e89d7f58e4b1cc804c0b0227eee56a3763237d6c0ec53867c598da92b8
```

---

## 🏆 Achievements

| Achievement      | Requirement      | Rarity   |
| ---------------- | ---------------- | -------- |
| First Steps      | Complete Floor 0 | Common   |
| Crawler Killer   | Clear Floor 1    | Common   |
| Time Keeper      | Survive 90s      | Uncommon |
| Key Find         | Find keycard     | Uncommon |
| Mutation Stopped | Beat boss        | Rare     |
| Escaped          | Complete Floor 5 | Epic     |
| Untouched        | No damage run    | Uncommon |
| Exterminator     | Kill 50 zombies  | Uncommon |
| Plague Ender     | Kill 100 zombies | Rare     |
| On Camera        | CCTV for 10s     | Common   |

---

## 🛠️ Development

### Smart Contract

```bash
cd contracts
sui move build
sui move test
sui client publish --gas-budget 100000000
```

---

### Game Development

#### Add New Level

Create `public/levels/floorX.json`

```json
{
  "id": "floor6",
  "rooms": [],
  "walls": [],
  "floorTiles": {},
  "target": [0, 0, 0]
}
```

#### Add Zombie

* Add model → `/models`
* Add animations → `game.js`
* Update spawn logic

#### Add Achievement

* Edit `AchievementTracker.js`
* Add conditions + UI

---

## ⚙️ Environment Variables

```
VITE_NETWORK=testnet
VITE_PACKAGE_ID=0x...
VITE_REGISTRY_ID=0x...
```

---

## 📱 Mobile Support

* Left joystick → movement
* Right area → camera
* Buttons → jump, sprint, attack

---

## 🏆 Leaderboards

* Global leaderboard
* Per-floor ranking
* Wallet-linked stats
* Rank badges

---

## 🔧 Troubleshooting

### Game not starting

* Check `game.js` loaded
* Inspect console
* Verify assets

### Wallet issues

* Install OneWallet
* Switch to testnet
* Unlock wallet

### Transactions fail

* Check gas
* Retry

### Assets fail

* Check `/public` paths
* Fix 404 errors

---

## 📦 Commands

```bash
pnpm dev
pnpm build
pnpm preview
pnpm type-check
```

---

## 🎨 Credits

* 3D Models: Mixamo
* Textures: CC0 sources
* Sounds: Freesound.org
* Fonts: Custom

---

## 📄 License

MIT License

---

## 🤝 Contributing

1. Fork
2. Create branch
3. Commit
4. Push
5. Open PR

---

## 📞 Support

* GitHub Issues
* Discord
* OneChain Docs

---

## 🙏 Acknowledgments

* Three.js
* OneChain
* Mixamo
* Playtesters

---

Enjoy the game and good luck escaping the facility! 🧟‍♂️🏃‍♂️
