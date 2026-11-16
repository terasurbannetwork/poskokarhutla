// Cetak _kerja/sampul.html dan _kerja/isi.html ke PDF A4: sampul tanpa kepala/kaki, isi dengan kepala (logo KRIS dan BNPB) dan kaki (alamat, nomor halaman).
// node cetak.mjs   -> _kerja/_sampul.pdf, _kerja/_isi.pdf
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const KERJA = path.join(DI, '_kerja');
const GEN = path.resolve(DI, '../../../laporan-bnpb/generator') + '/';
const { luncur } = await import(pathToFileURL(GEN + 'pw.mjs').href);
const HOME = process.env.USERPROFILE.replace(/\\/g, '/');
const b64 = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const BNPB = b64(HOME + '/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/logo/sumber-bnpb.png');
const KRIS = b64(GEN + 'sampul/media/kris-logo.png');

const kepala = `<div style="width:100%;margin:0 17mm;display:flex;align-items:center;justify-content:space-between;font-family:Roboto,Arial;font-size:7.5pt;color:#2E3440;border-bottom:0.6pt solid #BFC5CC;padding-bottom:3mm">
<div><b style="color:#051C2C">${(process.env.JUDUL_KEPALA || 'Kajian Penghitungan dan Klasifikasi Kejadian Bencana').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</b><br>Badan Nasional Penanggulangan Bencana</div>
<div style="display:flex;gap:8px;align-items:center"><img src="${KRIS}" style="height:7mm"><img src="${BNPB}" style="height:10mm"></div></div>`;
const kaki = `<div style="width:100%;margin:0 17mm;display:flex;justify-content:space-between;font-family:Roboto,Arial;font-size:7pt;color:#6B7280;border-top:0.6pt solid #BFC5CC;padding-top:2mm">
<div>Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id</div>
<div style="font-weight:700;color:#051C2C"><span class="pageNumber"></span></div></div>`;

const b = await luncur();
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(KERJA, 'sampul.html')).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: path.join(KERJA, '_sampul.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await p.goto(pathToFileURL(path.join(KERJA, 'isi.html')).href, { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: path.join(KERJA, '_isi.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: kepala, footerTemplate: kaki, preferCSSPageSize: true });
await b.close();
console.log('cetak ok');
