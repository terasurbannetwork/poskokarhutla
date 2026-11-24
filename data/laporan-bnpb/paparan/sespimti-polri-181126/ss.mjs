// Tangkapan layar panel publik Centurisk97 (/presiden, PUBLIK_TANPA_SESI) untuk Bab 9 handout.
// Halaman lain di centurisk97.id wajib login, jadi tidak dipotret di sini. Pakai: node ss.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { luncur } from '../../generator/pw.mjs';

const DI = path.dirname(fileURLToPath(import.meta.url));
const b = await luncur();
const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2, locale: 'id-ID' });
const p = await ctx.newPage();
await p.goto('https://centurisk97.id/presiden', { waitUntil: 'networkidle', timeout: 90000 }).catch(e => console.log('lambat', e.message.slice(0, 80)));
await p.waitForTimeout(12000);
await p.screenshot({ path: path.join(DI, 'gambar', 'ss_presiden_kartu.png') });
console.log('ok kartu');
await p.getByText('Peta', { exact: true }).first().click();
await p.waitForTimeout(12000);
await p.screenshot({ path: path.join(DI, 'gambar', 'ss_presiden_peta.png') });
console.log('ok peta');
await b.close();
