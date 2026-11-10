#!/usr/bin/env node
// Drive the pretty-panels demo site in headless Chrome.
// Usage: node .claude/skills/run-pretty-panels/driver.mjs <step> [args] <step> [args] ...
//   goto <slug>         open a component page, e.g. select ('' or 'home' = catalog)
//   click <text>        click the first element whose exact text matches
//   open <n>            click the n-th (0-based) [aria-haspopup] trigger on the page
//   value <n>           print the n-th [aria-haspopup] trigger's text
//   hover <css>         move the pointer over the first element matching a CSS selector
//   focus <css>         focus the first element matching a CSS selector
//   key <Key>           press a key (Escape, ArrowRight, Tab, ...)
//   wait <ms>           sleep
//   ss <name>           screenshot (viewport) to shots/<name>.png
//   eval <js>           evaluate an expression in the page and print the result
// Env: PP_URL (default http://localhost:5199/pretty-panels/), PP_WIDTH/PP_HEIGHT.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
let chromium;
try {
  ({ chromium } = createRequire(join(here, '.deps', 'x.js'))('playwright'));
} catch {
  console.error(`playwright missing - run: npm i --prefix ${join(here, '.deps')} playwright`);
  process.exit(2);
}

const base = process.env.PP_URL ?? 'http://localhost:5199/pretty-panels/';
try { await fetch(base); } catch {
  console.error(`dev server not reachable at ${base} - start it with: npm run dev -- --port 5199 --strictPort`);
  process.exit(2);
}

const shots = join(here, 'shots');
mkdirSync(shots, { recursive: true });
// channel 'chrome' = the system Google Chrome; avoids `npx playwright install`.
const browser = await chromium.launch({ channel: process.env.PP_CHANNEL ?? 'chrome' });
const page = await browser.newPage({
  viewport: { width: +(process.env.PP_WIDTH ?? 1280), height: +(process.env.PP_HEIGHT ?? 900) },
});
page.on('pageerror', (e) => console.log('PAGEERROR', String(e)));
page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text(), m.location().url));
page.setDefaultTimeout(5000);
page.on('response', (r) => r.status() >= 400 && console.log('HTTP', r.status(), r.url()));

const trigger = (n) => page.locator('[aria-haspopup]').nth(+n);
const args = process.argv.slice(2);
let code = 0;
try {
  for (let i = 0; i < args.length; ) {
    const step = args[i++];
    const a = args[i++];
    switch (step) {
      case 'goto':
        await page.goto(base + (a && a !== 'home' ? `#/${a}` : ''), { waitUntil: 'networkidle' });
        await page.waitForTimeout(600); // page-change slide transition
        console.log('goto', page.url(), '|', await page.title());
        break;
      case 'click':
        await page.getByText(a, { exact: true }).first().click();
        await page.waitForTimeout(600); // menus blink ~300ms before onChange/close
        console.log('clicked', JSON.stringify(a));
        break;
      case 'open':
        await trigger(a).click();
        await page.waitForTimeout(300);
        console.log('opened', JSON.stringify((await trigger(a).innerText()).trim()), '| items:',
          JSON.stringify(await page.locator('[role^=menuitem]').allInnerTexts()));
        break;
      case 'value':
        console.log('value', a, JSON.stringify((await trigger(a).innerText()).trim()));
        break;
      case 'hover':
        await page.locator(a).first().hover();
        await page.waitForTimeout(300); // hover transitions run ~150ms
        console.log('hovered', a);
        break;
      case 'focus':
        await page.locator(a).first().focus();
        console.log('focused', a);
        break;
      case 'key':
        await page.keyboard.press(a);
        await page.waitForTimeout(150);
        console.log('key', a);
        break;
      case 'wait':
        await page.waitForTimeout(+a);
        break;
      case 'ss': {
        const p = join(shots, `${a}.png`);
        await page.screenshot({ path: p });
        console.log('screenshot', p);
        break;
      }
      case 'eval':
        console.log('eval', JSON.stringify(await page.evaluate(a)));
        break;
      default:
        throw new Error(`unknown step ${step}`);
    }
  }
} catch (e) {
  console.error('FAILED', e.message.split('\n')[0]);
  code = 1;
}
await browser.close();
process.exit(code);
