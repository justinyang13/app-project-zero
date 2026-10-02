import { Game } from './game/Game.js';

// Create and start the game
const game = new Game();

// Expose debug hooks (SPEC §12)
declare global {
  interface Window {
    __game: {
      state: string;
      score: number;
      mult: number;
      bits: number;
      nearMisses: number;
      maxMult: number;
      dist: number;
      integrity: number;
      section: number;
      fps: number;
      finished: boolean;
      gameOver: boolean;
      quality: 'High' | 'Low';
      startRun: () => void;
      setBot: (on: boolean) => void;
      teleport: (distMeters: number) => void;
    };
  }
}

window.__game = {
  get state() { return game.getGameState(); },
  get score() { return Math.round(game.getScore()); },
  get mult() { return game.getMult(); },
  get bits() { return game.getBits(); },
  get nearMisses() { return game.getNearMisses(); },
  get maxMult() { return game.getMaxMult(); },
  get dist() { return game.getDist(); },
  get integrity() { return game.getPlayerState().integrity; },
  get section() { return game.getSection(); },
  get fps() { return game.getFps(); },
  get finished() { return game.getGameState() === 'victory'; },
  get gameOver() { return game.getGameState() === 'gameover'; },
  get quality() { return game.getQuality(); },
  startRun: () => { game.startRun(); },
  setBot: (on: boolean) => { game.setBot(on); },
  teleport: (distMeters: number) => { game.teleport(distMeters); },
};

// Set up global CSS for the app
const style = document.createElement('style');
style.textContent = `
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #000;
    font-family: 'Orbitron', 'Rajdhani', 'Eurostile', 'Segoe UI', sans-serif;
  }

  #app {
    width: 100vw;
    height: 100vh;
  }
`;

document.head.appendChild(style);
