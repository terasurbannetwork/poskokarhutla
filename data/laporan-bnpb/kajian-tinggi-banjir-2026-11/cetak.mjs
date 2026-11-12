// Cetak sampul.html dan laporan.html ke PDF A4 (kepala: judul + logo KRIS dan BNPB; kaki: alamat + nomor halaman). node cetak.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const DI = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.resolve(DI, '../generator/');
const { luncur } = await import(pathToFileURL(path.join(GEN, 'pw.mjs')).href);
const HOME = (process.env.USERPROFILE || process.env.HOME).split(path.sep).join('/');
const META = JSON.parse(fs.readFileSync(path.join(DI, 'meta.json'), 'utf8'));
const b64 = p => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const BNPB = b64(HOME + '/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/logo/sumber-bnpb.png');
const KRIS = b64(path.join(GEN, 'sampul/media/kris-logo.png'));

const kepala = `<div style="width:100%;margin:0 17mm;display:flex;align-items:center;justify-content:space-between;font-family:Roboto,Arial;font-size:7.5pt;color:#2E3440;border-bottom:0.6pt solid #BFC5CC;padding-bottom:3mm">
<div><b style="color:#051C2C">${META.kepala}</b><br>Badan Nasional Penanggulangan Bencana</div>
<div style="display:flex;gap:8px;align-items:center"><img src="${KRIS}" style="height:7mm"><img src="${BNPB}" style="height:10mm"></div></div>`;
const kaki = `<div style="width:100%;margin:0 17mm;display:flex;justify-content:space-between;font-family:Roboto,Arial;font-size:7pt;color:#6B7280;border-top:0.6pt solid #BFC5CC;padding-top:2mm">
<div>Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id</div>
<div style="font-weight:700;color:#051C2C"><span class="pageNumber"></span></div></div>`;

const b = await luncur();
const p = await b.newPage();
await p.goto(pathToFileURL(path.join(DI, 'sampul.html')).href, { waitUntil: 'load' });
await p.pdf({ path: path.join(DI, '_sampul.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await p.goto(pathToFileURL(path.join(DI, 'laporan.html')).href, { waitUntil: 'load' });
await p.pdf({ path: path.join(DI, '_isi.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: kepala, footerTemplate: kaki, preferCSSPageSize: true });
await b.close();
console.log('pdf bagian siap');
