import './style.css';
import { GameShell } from './GameShell.ts';
import { InputManager } from './engine/InputManager.ts';
import type { GameId } from './engine/assets/AssetLoader.ts';
import { parseGameParam, showLaunchScreen } from './ui/LaunchScreen.ts';

const root = document.querySelector<HTMLElement>('#app')!;
const game = parseGameParam(window.location.search);
if (game) startGame(game);
else showLaunchScreen(root);

function startGame(gameId: GameId): void {
  const input = new InputManager({ deadzone: 0.15, stageWidth: 512, stageHeight: 330 });
  const shell = new GameShell(root, input, gameId);
  input.attachStageElement(shell.stageCanvas);

  let lastTime = performance.now();

  function frame(now: number): void {
    const dtSec = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    const state = input.update();
    shell.tick(dtSec, state);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
