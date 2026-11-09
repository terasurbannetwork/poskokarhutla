// Bendera negara afiliasi (public/img/bendera/*.svg) jadi PNG untuk halaman perusahaan deck Penanganan 081126.
//   node bendera.mjs   ->  perusahaan-aset/<kode>.png (rasio 4:3, 160x120)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { luncur } from '../generator/pw.mjs';

const S = path.dirname(fileURLToPath(import.meta.url));
const SVG = path.join(S, '..', '..', '..', 'public', 'img', 'bendera');
const KE = path.join(S, 'perusahaan-aset');
fs.mkdirSync(KE, { recursive: true });
const b = await luncur();
const h = await b.newPage({ viewport: { width: 160, height: 120 } });
for (const k of ['sg', 'kr', 'ky', 'vg', 'ws']) {
  const isi = fs.readFileSync(path.join(SVG, k + '.svg'), 'utf8');
  await h.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:160px;height:120px}</style>${isi}`);
  await h.screenshot({ path: path.join(KE, k + '.png'), omitBackground: true });
}
await b.close();
console.log('ok', KE);
