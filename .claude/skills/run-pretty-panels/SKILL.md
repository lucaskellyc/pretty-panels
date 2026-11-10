---
name: run-pretty-panels
description: Run, start, and drive the pretty-panels demo/docs site in a headless browser. Use when asked to run pretty-panels, start its dev server, screenshot a component page, click through a component (Select, Slider, Menu...), confirm a UI change works in the real app, or typecheck/build it.
---

pretty-panels is a React component library; the thing you run is its demo/docs site
(`demo/`, served by Vite). Start the dev server, then drive it with
`.claude/skills/run-pretty-panels/driver.mjs`, a Playwright script that runs a list of steps
in headless Chrome and saves screenshots to `.claude/skills/run-pretty-panels/shots/`.

All paths are relative to the repo root. Verified on macOS (Darwin, Node 22, system Google Chrome).

## Setup (once)

```bash
npm install
# Playwright for the driver goes in a gitignored dir inside the skill, not in package.json
npm i --prefix .claude/skills/run-pretty-panels/.deps playwright
```

## Run (agent path)

Start the dev server in the background and wait for it:

```bash
(npm run dev -- --port 5199 --strictPort > /tmp/pp-dev.log 2>&1 &)
until curl -sf -o /dev/null http://localhost:5199/pretty-panels/; do sleep 0.5; done; echo up
```

Drive it. Each run opens a fresh page and runs the steps in order:

```bash
D=.claude/skills/run-pretty-panels/driver.mjs
node $D goto home ss home
node $D goto atoms/select value 0 open 0 ss select-open click Solid value 0 ss select-picked
node $D goto atoms/slider focus 'input[type=range]' eval "document.activeElement.value" key ArrowRight key ArrowRight eval "document.activeElement.value" ss slider
```

Steps (see the header of `driver.mjs`):

| step | does |
|---|---|
| `goto <group/slug>` | open `#/<group>/<slug>`, e.g. `atoms/select`, `molecules/tree`, `organisms/popover`; `home` = catalog |
| `click <text>` | click the first element with exactly this text, then wait 600ms |
| `open <n>` / `value <n>` | click / read the n-th `[aria-haspopup]` trigger (Select capsules); `open` prints the menu items |
| `focus <css>` / `key <Key>` | keyboard interaction |
| `hover <css>` | move the pointer over an element (copy chips' marching ants, hover states) |
| `eval <js>` | print a page expression's value |
| `ss <name>` | write `shots/<name>.png`. **Read the PNG** to check the result |
| `wait <ms>` | sleep |

Output prints one line per step. Lines starting `PAGEERROR`, `CONSOLE` or `HTTP` are app errors.
The exit code is 1 when a step fails (e.g. `FAILED locator.click: Timeout 5000ms exceeded.`) and 2
when Playwright isn't installed or the server is down (the message says which command fixes it).
Env: `PP_URL`, `PP_WIDTH`/`PP_HEIGHT` (default 1280×900), `PP_CHANNEL` (default `chrome`).

Stop the server: `pkill -f "vite --config vite.demo.config.ts"`

## Run (human path)

`npm run dev` and open the `Local:` URL it prints (it ends in `/pretty-panels/`).

## Checks (what CI runs)

There is no test suite. CI (`.github/workflows/`) runs:

```bash
npm run typecheck
npm run build:demo
```

## Gotchas

- **The site lives under `/pretty-panels/`**, not `/`. `http://localhost:5199/` returns a 302.
- **Every page load logs `CONSOLE Failed to load resource: 404 ... /favicon.ico`.** Chrome asks
  for the favicon at the server root, outside Vite's base. It's harmless, so ignore it. The
  driver's `HTTP` listener never sees it because the browser makes that request itself.
- **Routing only reads the last hash segment** (`App.tsx` `useHashSlug`), so a wrong group still
  opens the right page, though the breadcrumb comes from the catalog. Group ids: `atoms`,
  `molecules`, `organisms` (see `demo/catalog.ts`).
- **Menus blink before they act.** Choosing a Menu/Select item plays a ~300ms confirm blink before
  `onChange` fires and the menu closes. Read the value right after the click and you'll see the old
  one, so `click` waits 600ms.
- **Menu items use `role="menuitemcheckbox"`**, not `option` or `menuitem`. Match them with
  `[role^=menuitem]` or by text.
- **Sliders are native `<input type="range">`** with an implicit slider role and no `role`
  attribute, so `[role=slider]` finds nothing. Use `input[type=range]` (value lives in `.value`,
  formatted text in `aria-valuetext`).
- **`chromium.launch()` without a channel fails** with "Executable doesn't exist at
  .../chromium_headless_shell-NNNN" whenever the Playwright version and its cached browsers
  differ. The driver uses `channel: 'chrome'` (system Google Chrome) to skip
  `npx playwright install`. Without Google Chrome installed, this skill hasn't been tried.
- The home page header plays a looping animation. Screenshots of it differ from run to run.
