# RescueBlade Recomp

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)
![Renderer](https://img.shields.io/badge/WebGL2-WebAudio-orange)

A static recompilation and browser-native runtime for the classic Adobe/Macromedia Shockwave Director helicopter rescue games **RescueBlade** (9 levels) and **RescueBlade: Bermuda Triangle** (4 levels), built with TypeScript, WebGL2, and WebAudio.

---

## What the Project Does

`rescueblade-recomp` replaces the legacy Shockwave Player runtime with a custom TypeScript engine ([`MovieRuntime`](web/src/engine/runtime/MovieRuntime.ts)) that executes Director Score timelines, sprite properties, and recompiled Lingo behaviors natively in modern browsers.

The repository includes:

- **Original & Decompiled Director Sources**: Shockwave `.dcr` / `.dir` files in [`dcr/`](dcr) and [`dir/`](dir), plus decompiled Lingo script dumps (`.ls` / `.lasm`) produced with [`projectorrays-0.2.0.exe`](tools/projectorrays-0.2.0.exe).
- **Asset Extraction Pipeline**: [`scripts/extract_dir_assets.py`](scripts/extract_dir_assets.py) parses RIFX `.dir` containers into PNG bitmaps, WAV audio, PFR1 fonts, level map texts, `manifest.json`, and `score.json` under [`extracted/`](extracted).
- **WebGL2 + WebAudio Game Engine**: Located in [`web/`](web), featuring a 512×330 Director stage renderer, multi-channel sound engine, unified keyboard/mouse/gamepad/touch input, and complete TypeScript behavior implementations for both games.

---

## Why the Project Is Useful

- **No Legacy Plugins Required**: Runs natively in any modern browser with WebGL2 and WebAudio support—no Shockwave plugin, VM, or emulator needed.
- **Two Complete Playable Campaigns**:
  - **RescueBlade** (`rescueblade`) — 9 levels of search-and-rescue missions.
  - **RescueBlade: Bermuda Triangle** (`bermuda`) — 4 levels featuring triangle-specific hazards, submarines, and boss encounters.
- **100% Behavior Registry Coverage**: Every `frameScript` and sprite behavior referenced in `score.json` for both games is implemented and verified by [`registry.test.ts`](web/src/games/__tests__/registry.test.ts).
- **Faithful WebGL2 Rendering + Optional HD HUD**:
  - Supports Director ink modes (`COPY`, `MATTE`, `MASK`, `ADD_PIN`, `ADD`, `BG_TRANSPARENT`, `TRANSPARENT`), `locZ` sorting, registration-point transforms, and projective 2.5D quad warping ([`quadMath.ts`](web/src/engine/render/quadMath.ts)).
  - Procedurally renders crisp high-DPI HUD elements and text ([`HdHudTextures.ts`](web/src/engine/render/HdHudTextures.ts)) with a live toggle between **HD** and **Original** modes.
- **Unified Multi-Device Input**: [`InputManager`](web/src/engine/InputManager.ts) blends keyboard/mouse, standard gamepads (with configurable radial deadzone), and virtual touch inputs, supporting both **Simplified** and **Pro** helicopter flight models.
- **Pre-Extracted Assets Included**: Ready to run immediately after `npm install` without needing to re-run asset extraction.

---

## How Users Can Get Started

### Prerequisites

- **Node.js** (v20+ recommended; tested with v24) and **npm**
- A modern browser with **WebGL2** and **WebAudio** enabled
- *(Optional, only if re-extracting assets from `.dir` files)* **Python 3** with **Pillow** (`pip install pillow`)

### Installation & Running Locally

1. Clone the repository and enter the web workspace:

   ```bash
   git clone https://github.com/AlessandroBerrone/rescueblade-recomp.git
   cd rescueblade-recomp/web
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open the local URL shown in your terminal (default `http://localhost:5173`) in your browser.

> **Note:** [`vite.config.ts`](web/vite.config.ts) includes a custom middleware plugin (`serveExtractedAssets`) that maps `/assets/rescueblade/*` and `/assets/bermuda/*` directly to [`extracted/`](extracted) during both `npm run dev` and `npm run preview`.

### Production Build & Tests

Run from the [`web/`](web) directory:

```bash
# Type-check with TypeScript
npm run typecheck

# Run the Vitest test suite (unit + headless gameplay smoke tests)
npm test

# Type-check and build the production bundle into web/dist/
npm run build

# Preview the production build locally (serves extracted assets)
npm run preview
```

`npm run build` copies `extracted/*/assets` into `web/dist/assets/`, so `web/dist` is a self-contained static site. To host it under a sub-path (as GitHub Pages does), set `BASE_PATH`, e.g. `BASE_PATH=/rescueblade-recomp/ npm run build`.

Asset extractor tests (needs Pillow), from the repository root:

```bash
python -m unittest discover -s scripts
```

### Continuous Integration & GitHub Pages

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs typecheck, tests (Vitest + extractor tests) and the build on every push and pull request. On pushes to `main` it also deploys `web/dist` to GitHub Pages. To enable it once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### Controls & Gameplay

The browser UI ([`GameShell.ts`](web/src/GameShell.ts)) provides a game switcher (`rescueblade` / `bermuda`), **Simplified / Pro** control mode toggle, **HD / Originale** HUD toggle, audio mute/volume controls, fullscreen mode, gamepad deadzone slider, and a live input monitor.

| Action | Keyboard | Gamepad |
| --- | --- | --- |
| **Fly / Pitch & Throttle** | `Arrow Keys` or `W A S D` | Left Stick or D-Pad |
| **Action** *(Winch / Water / Photo)* | `Space` | `A` / `X` / `RT` |
| **Confirm** *(Menus & Briefings)* | `Enter` or `Space` | `A` |
| **Pause** | `P` or `Esc` | `Start` |
| **Cancel / Back** | `Backspace` or `Esc` | `B` |
| **Unlock All Levels** *(MenuScreen)* | Hold `R` + `I` + `X` | Hold `LB` + `RB` + `Select` |

### Programmatic / Headless Runtime Example

You can also drive `MovieRuntime` headlessly in Node.js (as demonstrated in [`gameplaySmoke.test.ts`](web/src/games/__tests__/gameplaySmoke.test.ts)):

```ts
import { InputManager } from './engine/InputManager.ts';
import { SoundEngine } from './engine/audio/SoundEngine.ts';
import { MovieRuntime } from './engine/runtime/MovieRuntime.ts';
import { createBehaviorRegistry } from './games/registry.ts';

const input = new InputManager({ deadzone: 0.15, stageWidth: 512, stageHeight: 330 });
const sound = new SoundEngine();
const runtime = new MovieRuntime(
  bundle,
  input,
  sound,
  textCache,
  createBehaviorRegistry('rescueblade')
);

// Step one frame at 30 Hz with live or simulated input
input.keyboard.setKeyForTest('Enter', true);
runtime.stepTick(input.update());
const spritesToDraw = runtime.toRenderSprites();
```

### Re-Extracting Assets (Optional)

Pre-extracted assets already live in [`extracted/`](extracted). To regenerate `manifest.json`, `score.json`, bitmaps, sounds, and texts from the `.dir` sources in [`dir/`](dir):

```bash
pip install pillow
python scripts/extract_dir_assets.py
```

---

## Project Structure

```text
rescueblade-recomp/
├── .github/workflows/ci.yml   # CI (typecheck, tests, build) + GitHub Pages deploy
├── dcr/                       # Original compressed Shockwave (.dcr) movies
├── dir/                       # Uncompressed Director (.dir) movie sources
├── extracted/                 # Extracted PNGs, WAVs, texts, manifests, scores, and Lingo dumps
│   ├── rescueblade/
│   └── bermuda/
├── scripts/
│   ├── extract_dir_assets.py  # RIFX/.dir asset & score extractor (Python + Pillow)
│   └── test_extract_dir_assets.py
├── tools/
│   └── projectorrays-0.2.0.exe  # Shockwave/Director decompiler used for script dumps
└── web/                       # TypeScript + Vite + WebGL2 + WebAudio application
    ├── index.html
    ├── package.json
    ├── vite.config.ts         # Serves ../extracted/*/assets during dev & preview
    └── src/
        ├── main.ts            # Browser entry point and animation loop
        ├── GameShell.ts       # UI shell, game switcher, HUD/audio/input controls
        ├── debug/             # Input & 2.5D quad stage inspection views
        ├── engine/
        │   ├── InputManager.ts  # Unified Keyboard/Mouse, Gamepad, VirtualTouch input
        │   ├── assets/        # Manifest, score, map, and texture loader
        │   ├── audio/         # Multi-channel WebAudio SoundEngine
        │   ├── input/         # Device-specific input providers
        │   ├── render/        # WebGL2 renderer, projective quad math, HD HUD & text cache
        │   └── runtime/       # Director MovieRuntime, globals, and behavior interfaces
        └── games/
            ├── registry.ts    # Behavior registry wiring for both games
            ├── shared/        # Shared RescueBlade behaviors (copter, ocean, hazards, bosses)
            └── bermuda/       # Bermuda Triangle-specific behaviors and bosses
```

---

## Where Users Can Get Help

- **Code & Architecture References**:
  - Engine runtime & Director types: [`DirectorTypes.ts`](web/src/engine/runtime/DirectorTypes.ts) and [`MovieRuntime.ts`](web/src/engine/runtime/MovieRuntime.ts)
  - Headless test suites: [`web/src/games/__tests__/`](web/src/games/__tests__) and [`web/src/engine/__tests__/`](web/src/engine/__tests__)
  - Standalone debug views: [`InputDebugView.ts`](web/src/debug/InputDebugView.ts) and [`StageQuadDemoView.ts`](web/src/debug/StageQuadDemoView.ts)
- **Bug Reports & Questions**: Open an issue in the GitHub repository (`AlessandroBerrone/rescueblade-recomp`) with your browser, Node.js version, selected game (`rescueblade` or `bermuda`), and steps to reproduce.

---

## Who Maintains and Contributes

### Maintainer

- **Alessandro Berrone** (`@AlessandroBerrone`)

### Contributing

Contributions are welcome! To contribute:

1. Fork the repository and create a branch from `main`.
2. Make your changes in [`web/src/`](web/src) (or [`scripts/`](scripts) if updating the asset extractor).
3. Verify typechecking, tests, and production build before opening a pull request:

   ```bash
   cd web
   npm run typecheck
   npm test
   npm run build
   ```

4. If adding or updating game behaviors, confirm that [`registry.test.ts`](web/src/games/__tests__/registry.test.ts) and [`gameplaySmoke.test.ts`](web/src/games/__tests__/gameplaySmoke.test.ts) pass across all levels of both games.

### Licensing Note

No `LICENSE` file is currently included at the repository root. Original Shockwave game binaries and assets under [`dcr/`](dcr), [`dir/`](dir), and [`extracted/`](extracted) remain the intellectual property of their respective copyright holders.
