# E2E Plan — Python Mode (Desktop + Web)

Objective: Verify run/stop flow, NDJSON command parity, output rendering, and file save/load across web (pyodide) and desktop (native) runtimes.

Environments

- Web: Chrome headless via Puppeteer/Playwright or Selenium + ChromeDriver.
- Desktop: Windows 10/11 VM and macOS Big Sur+ VM with installer built from `nomopro-desktop`.

Test cases

1. Run simple script
    - `print('hello')`
    - Expect output panel to show `hello`, no NDJSON raw lines visible, exitCode 0.
2. Emit bridge command
    - Script uses `emit('move', 10)` or `print(json.dumps({'cmd':'move','args':[10]}))`
    - Expect VM to receive `move` command and actor position changed (verify via VM state or simulated sprite property).
3. Long-running script + stop
    - Script loops `while True: time.sleep(1)` and periodically emits heartbeats.
    - Invoke `Stop` from UI; expect process to terminate and UI to show `Stop requested.`
4. Error handling
    - Script raises an exception; expect stderr displayed in error panel and app remains responsive.
5. File save/open (desktop)
    - Upload a `.py` file via UI; expect file saved under `Documents/OpenBlock` and reopen successful.
6. Pip install (desktop with bundled pip)
    - Install small pure-Python package (e.g., `requests` minimal test) into per-user venv; run script that imports and uses it.

Automation notes

- Use Playwright if possible (easier cross-platform), fallback to Selenium if necessary.
- ChromeDriver version must match Chrome on agent; use `chromedriver` npm package with matching major.
- Tests should be idempotent and clean up any created files.

Run commands (local dev)

```bash
# web-only tests using Playwright
npx playwright test test/integration/web-python.spec.js

# desktop manual staging
# build installer first
cd ../nomopro-desktop
npm ci
npm run build -- --win
# install on VM and run Playwright tests that target desktop app via instrumentation or via launching app and controlling with Playwright
```
