// Tarik tabel BPS (Playwright) tahan galat: tiap URL dicoba 3x (jeda bertahap), galat dicatat, keluar 0 bila ada yang berhasil.
// node scripts/air/neraca/tarik_bps.mjs <keluaran_dir> nama=url ...   (PLAYWRIGHT_MJS / CHROMIUM_PATH seperti air_jawa_bps.mjs)
import fs from 'fs';
import path from 'path';
const [out, ...pasangan] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const { chromium } = await import(process.env.PLAYWRIGHT_MJS || '/Users/alfatehanseptianta/Developer/worth-it/node_modules/playwright/index.mjs');
const exe = process.env.CHROMIUM_PATH ?? '/Users/alfatehanseptianta/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' });
let ok = 0;
for (const s of pasangan) {
  const i = s.indexOf('=');
  const [nama, url] = [s.slice(0, i), s.slice(i + 1)];
  for (let t = 1; t <= 3; t++) {
    try {
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await p.waitForFunction(() => document.querySelector("table td") !== null, null, { timeout: 60000 });
      await p.waitForTimeout(8000);   // tabel dirender sesudah blok keterangan
      const teks = await p.evaluate(() => document.body.innerText);
      // tabel tipe statis tidak muncul di innerText halaman: ambil sel per baris
      const baris = await p.evaluate(() => [...document.querySelectorAll('table tr')].map(r => [...r.children].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join('\t')).join('\n'));
      fs.writeFileSync(path.join(out, `${nama}.txt`), `#url ${url}\n#ditarik ${new Date().toISOString()}\n` + teks + `\n#TABEL\n` + baris + '\n');
      console.log('OK', nama, teks.length); ok++;
      break;
    } catch (e) {
      console.log(`GAGAL ${nama} percobaan ${t}: ${String(e.message).slice(0, 100)}`);
      await new Promise(r => setTimeout(r, 5000 * t));
    }
  }
}
await b.close();
process.exit(ok > 0 || pasangan.length === 0 ? 0 : 1);
