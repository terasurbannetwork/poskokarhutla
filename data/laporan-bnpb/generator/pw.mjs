// Playwright untuk skrip peta/ikon generator, jalan di Mac dan Windows.
// Modul: PLAYWRIGHT_MJS, lalu path Mac lama, lalu cache/node/node_modules/playwright-core, lalu paket 'playwright'.
// Browser: CHROMIUM_SHELL, lalu headless shell Mac lama, lalu ms-playwright lokal, lalu Chrome/Edge terpasang.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const ada = p => p && fs.existsSync(p);
const MAC_MJS = '/Users/priyankaalfatehan28/Developer/worth-it/node_modules/playwright/index.mjs';
const MAC_SHELL = os.homedir() + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';

async function modul() {
  for (const p of [process.env.PLAYWRIGHT_MJS, MAC_MJS, path.join(DI, 'cache', 'node', 'node_modules', 'playwright-core', 'index.mjs')]) {
    if (ada(p)) return import(pathToFileURL(p).href);
  }
  return import('playwright');
}

function browser() {
  if (ada(process.env.CHROMIUM_SHELL)) return process.env.CHROMIUM_SHELL;
  if (ada(MAC_SHELL)) return MAC_SHELL;
  const msp = process.platform === 'win32' ? path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright') : null;
  if (ada(msp)) {
    for (const d of fs.readdirSync(msp).filter(d => d.startsWith('chromium_headless_shell-')).sort().reverse()) {
      const p = path.join(msp, d, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
      if (ada(p)) return p;
    }
  }
  const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
  for (const b of pf) for (const r of ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe']) {
    if (ada(path.join(b, r))) return path.join(b, r);
  }
  return undefined;   // biar playwright memakai browser bawaannya
}

export const { chromium } = await modul();
export const luncur = () => chromium.launch({ executablePath: browser() });
