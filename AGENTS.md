# AGENTS.md — nomopro-gui

## What this is

A Scratch-GUI fork with Python IDE and microcontroller hardware support (Arduino, ESP32, MicroPython). Built with React 16 + Redux 3 + Webpack 4.

## Quick start

```bash
npm install
npm run start              # dev server on http://127.0.0.1:8601
npm run build              # production build (clean → webpack)
npm run test:lint          # eslint --fix
npm run test:integration   # jest --runInBand test[/]integration
npm run test:smoke         # jest --runInBand test[/]smoke
npm run test               # lint → unit → build → integration
```

`npm run test:unit` is an empty string — unit tests run via `jest` directly.
`NODE_OPTIONS=--max-old-space-size=4000` for production builds.

## Sibling projects

These live in `../prod/` NOT in this repo:

| Project | Path | Role |
|---|---|---|
| `openblock-vm` | `../openblock-vm/` | Core runtime engine — npm linked into this project |
| `nomopro-desktop` | `../nomopro-desktop/` | Electron desktop app — contains the Link server, IPC, serial I/O, bundled tools (esptool, arduino-cli) |

The VM is imported as `openblock-vm` in `package.json`. All hardware serial communication flows through `vm.writeToPeripheral()` / `vm.setPeripheralBaudrate()` in the browser, or `window.electronAPI.*` on desktop.

## Architecture

- **Library entrypoint**: `src/index.js` — exports `GUI` (default), `AppStateHOC`, reducers
- **Playground entrypoints**: `src/playground/index.jsx` → renders `render-gui.jsx`; others: `blocks-only.jsx`, `player.jsx`, `compatibility-testing.jsx`
- **Main container**: `src/containers/gui.jsx` — HOC composition wrapping `GUIComponent`
- **Python IDE**: `src/components/python-ide/python-ide.jsx` (presentational) + `src/containers/python-ide.jsx` (connected)
- **Python lib files** (flat in `src/lib/`, no `python/` subdir):

  | File | Purpose |
  |---|---|
  | `bridge.js` + `bridge-command-registry.js` | NDJSON bridge: Python → VM (48 registered commands) |
  | `pyodide-runner.js` | In-browser Python via Pyodide (WebWorker or main thread) |
  | `desktop-python-runner.js` | Native Python subprocess via Electron (`window.nomoproDesktopPython`) |
  | `micropython-repl.js` | Raw REPL protocol handler for MicroPython boards |
  | `micropython-runner.js` | `sendCode()` and `uploadMain()` to MicroPython device |
  | `micropython-flasher.js` | Wraps `window.electronAPI.micropython.flash()` (desktop only) |
  | `ndjson-command-parser.js` | NDJSON line-by-line command parser |
  | `modeState.js` | MODE_BLOCK / MODE_PYTHON constants |
  | `device.js` | DeviceType enum: `arduino`, `python`, `microPython`, `microbit` |

- **Device profiles**: `src/lib/libraries/devices/index.jsx` — 15+ devices with flags: `programMode`, `programLanguage`, `tags`, `serialportRequired`, `supportsMicroPython`
- **Desktop detection**: `src/shared/env.js` — checks `window.platformInfo.isDesktop` → sets `backend` to `'native'` or `'pyodide'`
- **MicroPython Upload Mode**: See `python-ide-upload-plan.md` for the full implementation plan (ESP32, Micro:bit V2, Pi Pico)

## Key patterns

- **HOC composition**: `src/containers/gui.jsx:576-588` — `compose()` from Redux chains 10+ HOCs around `ConnectedGUI`
- **CSS Modules**: enabled with `camelCase: true` in webpack. Import as `import styles from "./file.css"`, use `styles.className`
- **Redux state shape**: `state.scratchGui.{editorTab, inputMode, modals, pythonIde, device, ...}`, `state.locales.*`
- **Device communication**: custom events `python-ide-add-extension` / `python-ide-remove-extension` on `window` (`src/containers/gui.jsx:312-319`)
- **Tab system**: `src/reducers/editor-tab.js` — `BLOCKS_TAB_INDEX`, `COSTUMES_TAB_INDEX`, `SOUNDS_TAB_INDEX`, `PYTHON_TAB_INDEX`

## Desktop-only features

All `window.electronAPI.*` calls only work when running inside `nomopro-desktop` Electron app:

```javascript
// src/shared/env.js
export const isDesktop = Boolean(window.platformInfo?.isDesktop);
export const backend = isDesktop ? 'native' : 'pyodide';
```

MicroPython flashing (`micropython-flasher.js`) and desktop Python runner (`desktop-python-runner.js`) are desktop-only. Pyodide (`pyodide-runner.js`) runs in both web and desktop.

## MicroPython / Upload context

- Pyodide v0.26.4 loaded from CDN (`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`)
- MicroPython REPL + upload work through the VM's peripheral channel → Link WebSocket (port 20111) → serialport → board
- Firmware flashing (`esptool.py`, `.uf2` copy) is handled by `nomopro-desktop` main process via IPC
- Device `tags: ['microPython']` triggers MicroPython flash button in connection modal
- Device flag `supportsMicroPython: true` enables upload mode UI in Python IDE

## Dev config

- **Dev server**: `npm start` listens on `127.0.0.1:8601` (CLI `--host` overrides webpack devServer config)
- **Environment**: `.env.example` → only `API_URL=http://localhost:8000`. `dotenv-webpack` loads `.env.{NODE_ENV}` files
- **Monaco editor**: languages `c, cpp, python, lua, javascript`; `!gotoSymbol` feature excluded
- **Lint**: ESLint 5.x extending `scratch` + `scratch/node` configs; use `npm run test:lint` (includes `--fix`)
- **Babel**: preset-env + preset-react, dynamic-import, async-to-generator, object-rest-spread plugins
- **i18n**: react-intl, messages extracted to `./translations/messages/`

## Testing

- Jest 21.x, Enzyme (React 16 adapter), `raf/polyfill` setup in jest config
- Integration tests use real chromedriver + selenium-webdriver (requires Chrome installed)
- Test mocks: `test/__mocks__/` — `styleMock`, `fileMock`, `node-fs-proxy`, `node-path-proxy`, `editor-msgs-mock`
- Run unit tests: `jest` directly (not `npm run test:unit`)
- Run integration: `npm run test:integration`
- Configuration in `package.json` → `jest` key

## Important conventions

- Do NOT remove "pen" extension from core — protected in `clearAllExtensions` (`src/containers/gui.jsx`)
- Lock `scratch-*` and `openblock-*` dependency versions carefully; they're pre-release
- `openblock-vm` is npm linked from `../openblock-vm/` — changes there affect this project
- When modifying `src/containers/python-ide.jsx`, note the heavy HOC wrapping and numerous props
- Upload mode implementation must NOT touch VM, `arduino.js`, or case `"arduino"` in serialport session

## Build outputs

- **Playground**: `build/` — static site with multiple HTML entries (gui, blocks-only, player, compatibility-testing)
- **Library**: `dist/` — UMD bundle `openblock-gui.js` (only when `NODE_ENV=production` or `BUILD_MODE=dist`)
- **Static assets**: `build/static/` or `dist/static/` copied from `static/` directory
