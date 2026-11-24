import type { GameId } from '../engine/assets/AssetLoader.ts';

export interface LaunchEntry {
  id: GameId;
  title: string;
  subtitle: string;
  /** Art relative to the game's asset folder; without a background the foreground fills the card. */
  background?: string;
  foreground: string;
}

export const LAUNCH_ENTRIES: readonly LaunchEntry[] = [
  {
    id: 'rescueblade',
    title: 'RescueBlade',
    subtitle: '9 livelli',
    // The title-screen helicopter, on its own sky.
    foreground: 'bitmaps/3_087__COPTER_1.png',
  },
  {
    id: 'bermuda',
    title: 'RescueBlade: Bermuda Triangle',
    subtitle: '4 livelli',
    background: 'bitmaps/3_153__UNDERW_1.png',
    foreground: 'bitmaps/3_209__SU9A55_1.png',
  },
];

/** Reads `?game=` from a query string; anything other than a known game means "show the launch page". */
export function parseGameParam(search: string): GameId | null {
  const value = new URLSearchParams(search).get('game');
  return LAUNCH_ENTRIES.some((e) => e.id === value) ? (value as GameId) : null;
}

/** URL of a game (or of the launch page when `game` is null), keeping any other query params. */
export function gameUrl(game: GameId | null, location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const params = new URLSearchParams(location.search);
  if (game) params.set('game', game);
  else params.delete('game');
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
}

/**
 * Launch page: one card per game. Each card is a plain link to `?game=<id>`, so the
 * browser's back button returns here and a game can be linked directly. Arrow keys and a
 * gamepad (stick/d-pad + A) move between the cards.
 */
export function showLaunchScreen(root: HTMLElement): void {
  const base = import.meta.env.BASE_URL;
  document.body.classList.add('launch-mode');
  root.innerHTML = `
    <main class="launch">
      <header class="launch-head">
        <h1>RescueBlade Recomp</h1>
        <p>Scegli a quale gioco vuoi giocare</p>
      </header>
      <nav class="launch-cards" aria-label="Giochi">
        ${LAUNCH_ENTRIES.map((e) => `
          <a class="launch-card" href="${gameUrl(e.id, window.location)}" data-game="${e.id}">
            <span class="launch-art${e.background ? '' : ' full'}"${e.background ? ` style="background-image:url('${base}assets/${e.id}/${e.background}')"` : ''}>
              <img src="${base}assets/${e.id}/${e.foreground}" alt="" draggable="false" />
            </span>
            <span class="launch-text">
              <b>${e.title}</b>
              <small>${e.subtitle}</small>
            </span>
          </a>`).join('')}
      </nav>
      <p class="launch-hint">Tastiera: frecce e Invio &bull; Controller: stick e A</p>
    </main>
  `;

  const cards = Array.from(root.querySelectorAll<HTMLAnchorElement>('.launch-card'));
  cards[0]?.focus({ preventScroll: true });

  const move = (dir: -1 | 1) => {
    const i = cards.indexOf(document.activeElement as HTMLAnchorElement);
    const next = i < 0 ? 0 : (i + dir + cards.length) % cards.length;
    cards[next].focus();
  };

  window.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { move(1); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { move(-1); ev.preventDefault(); }
  });

  // Gamepad: edge-triggered so holding the stick moves one card at a time.
  let prevDir = 0;
  let prevA = true; // ignore an A still held from before the page loaded
  const poll = () => {
    const pad = navigator.getGamepads?.().find((p) => p && p.connected);
    if (pad) {
      const x = pad.axes[0] ?? 0;
      const y = pad.axes[1] ?? 0;
      const b = (i: number) => Boolean(pad.buttons[i]?.pressed);
      let dir = 0;
      if (x > 0.5 || y > 0.5 || b(15) || b(13)) dir = 1;
      else if (x < -0.5 || y < -0.5 || b(14) || b(12)) dir = -1;
      if (dir !== 0 && dir !== prevDir) move(dir as -1 | 1);
      prevDir = dir;
      const a = b(0) || b(9);
      if (a && !prevA) {
        const current = cards.includes(document.activeElement as HTMLAnchorElement)
          ? (document.activeElement as HTMLAnchorElement)
          : cards[0];
        current.click();
      }
      prevA = a;
    }
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);
}
