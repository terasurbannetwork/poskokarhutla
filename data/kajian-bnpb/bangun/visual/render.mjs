// Spek JSON -> SVG + PNG 300 dpi (Chromium headless lewat Playwright) + manifest JSON, lalu gerbang periksa() per gambar.
// Pakai: node render.mjs [spek/*.json ...] [--ke=DIR] [--tanpa-png] [--lembar]
//        node render.mjs --periksa=DIR      periksa ulang pasangan SVG + manifest di DIR, cetak JSON {nama: [pelanggaran]}
//   --lembar  menulis DIR/lembar.html + lembar.pdf (A4, tiap gambar pada ukuran cetaknya) untuk dibaca lewat pdftoppm.
// Keluar non-nol bila satu gambar melanggar gerbang; berkasnya tetap ditulis supaya bisa dilihat.
// PNG butuh Playwright: repo tidak memasangnya, jadi PLAYWRIGHT (folder paket atau index.mjs) dan, bila Chromium bawaan
// Playwright tidak ada, CHROME (berkas eksekusi) wajib diset. Node >= 22.2 (zlib.crc32).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {T, V, periksa, esc, muat, berkasFont} from './dasar.mjs';
import {peta} from './peta.mjs';
import {GRAFIK} from './grafik.mjs';
import {lembarIkon} from './ikon.mjs';

const DIR = import.meta.dirname;
const BANGUN = {peta, ...GRAFIK, ikon: lembarIkon};

// {nama} di keterangan, sumber, catatan: dari spek.token (dibaca dari data, harus tepat satu nilai) atau dari perender
// (mis. rumus_kelas), supaya angka di baris Sumber tidak diketik (D-22)
function isiToken(teks, spek, out) {
  if (!teks) return teks;
  return teks.replace(/\{(\w+)\}/g, (_, n) => {
    let v = out.token?.[n];
    const t = spek.token?.[n];
    if (t) {
      const vs = [...new Set(muat(t.sumber).map(r => String(r[t.kolom] ?? '')))];
      if (vs.length !== 1) throw new Error(`token {${n}}: ${vs.length} nilai berbeda di ${t.sumber.berkas} kolom ${t.kolom} (${vs.slice(0, 3).join(', ')})`);
      v = vs[0];
    }
    if (v === undefined || v === null || v === '') throw new Error(`token {${n}} di ${spek.nama} tidak terurai (tambahkan spek.token.${n})`);
    return v;
  });
}

export function bangun(spek) {
  const f = BANGUN[spek.jenis];
  if (!f) throw new Error(`jenis "${spek.jenis}" tidak dikenal (${Object.keys(BANGUN).join(', ')}); jenis G25 dilarang`);
  const out = f(spek), isi = s => isiToken(s, spek, out);
  const catatan = [isi(spek.catatan), out.catatan].filter(Boolean).join(' ') || undefined;
  out.manifest = {nama: spek.nama, keterangan: isi(spek.keterangan), sumber: isi(spek.sumber), catatan, ...out.manifest};
  out.salah = periksa(out.svg, out.manifest);
  return out;
}

// pHYs = dpi di PNG, supaya Word/PowerPoint membaca ukuran cetak yang benar
function denganDpi(png, dpi) {
  if (!zlib.crc32) throw new Error(`Node ${process.version}: butuh Node >= 22.2 untuk zlib.crc32`);
  const ppm = Math.round(dpi / 0.0254), isi = Buffer.alloc(9), tipe = Buffer.from('pHYs'), pj = Buffer.alloc(4), crc = Buffer.alloc(4);
  isi.writeUInt32BE(ppm, 0); isi.writeUInt32BE(ppm, 4); isi[8] = 1; pj.writeUInt32BE(9); crc.writeUInt32BE(zlib.crc32(Buffer.concat([tipe, isi])));
  const potong = [png.subarray(0, 8)];
  for (let o = 8; o < png.length;) {
    const n = png.readUInt32BE(o), t = png.toString('latin1', o + 4, o + 8), ch = png.subarray(o, o + 12 + n);
    if (t !== 'pHYs') potong.push(ch);
    if (t === 'IHDR') potong.push(pj, tipe, isi, crc);
    o += 12 + n;
  }
  return Buffer.concat(potong);
}
const fontCss = () => ['regular', 'bold'].map((b, i) => `@font-face{font-family:${T.font.keluarga};font-weight:${[400, 700][i]};src:url("${pathToFileURL(berkasFont(b)).href}")}`).join('');

async function muatPlaywright() {
  const p = process.env.PLAYWRIGHT;
  try {
    return p ? await import(pathToFileURL(fs.statSync(p).isDirectory() ? path.join(p, 'index.mjs') : p).href) : await import('playwright');
  } catch (e) {
    throw new Error(`Playwright tidak termuat (${e.message.split('\n')[0]}). Repo tidak memasang Playwright: set PLAYWRIGHT=/jalur/node_modules/playwright `
      + 'dan CHROME=/jalur/chrome-headless-shell bila Chromium bawaan Playwright belum diunduh, atau jalankan dengan --tanpa-png.');
  }
}
async function bukaPeramban(ke) {
  const {chromium} = await muatPlaywright();
  const b = await chromium.launch(process.env.CHROME ? {executablePath: process.env.CHROME} : {}), pg = await b.newPage({deviceScaleFactor: V.dpi / 96});
  const wadah = path.join(ke, '.wadah.html');
  fs.writeFileSync(wadah, `<!doctype html><meta charset="utf-8"><style>${fontCss()}body{margin:0;background:#FFFFFF}svg{display:block}</style><div id="w"></div>`);
  await pg.goto(pathToFileURL(wadah).href);
  await pg.evaluate(async f => { await document.fonts.load(`400 10px ${f}`); await document.fonts.load(`700 10px ${f}`); }, T.font.keluarga);
  const n = await pg.evaluate(f => [...document.fonts].filter(x => x.family.replace(/"/g, '') === f && x.status === 'loaded').length, T.font.keluarga);
  if (n < 2) throw new Error(`Roboto tidak termuat di Chromium (${n} wajah)`);
  return {b, pg, async png(svg, berkas) {
    await pg.evaluate(s => { document.getElementById('w').innerHTML = s; }, svg);
    const el = await pg.$('#w svg'), kt = await el.boundingBox();
    await pg.setViewportSize({width: Math.ceil(kt.width) + 2, height: Math.ceil(kt.height) + 2});
    fs.writeFileSync(berkas, denganDpi(await el.screenshot({type: 'png'}), V.dpi));
  }};
}

function lembar(ke, hasil) {
  const m = T.halaman.margin_cm, lebarIsi = T.halaman.lebar_isi_cm;
  const fig = hasil.map(({manifest: x}, i) => {
    const cm = Math.min(x.ukuran_cm[0], lebarIsi), kecil = cm < x.ukuran_cm[0] ? ` (diperkecil dari ${String(x.ukuran_cm[0]).replace('.', ',')} cm)` : '';
    const judul = x.keterangan || x.nama;
    return `<figure><figcaption><b>Gambar uji ${i + 1}</b> ${esc(judul)}</figcaption><img src="${esc(x.nama)}.png" style="width:${cm}cm">`
      + `<p class="s"><b>Sumber:</b> ${esc(x.sumber || 'pengolahan data Pantau Bencana')}</p>`
      + (x.catatan ? `<p class="s"><b>Catatan:</b> ${esc(x.catatan)}</p>` : '')
      + `<p class="s"><b>Mesin:</b> ${esc([x.jenis, x.pesan || (x.alasan ? `di luar tabel B5.10: ${x.alasan}` : null), `mode ${x.mode}`, `${String(x.ukuran_cm[0]).replace('.', ',')} x ${String(x.ukuran_cm[1]).replace('.', ',')} cm`].filter(Boolean).join(', '))}${kecil}</p></figure>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>Lembar bukti visual</title><style>${fontCss()}`
    + `@page{size:A4;margin:${m.atas}cm ${m.kanan}cm ${m.bawah}cm ${m.kiri}cm}body{font-family:${T.font.keluarga};font-size:9pt;color:${T.warna.inti.teks.hex};margin:0}`
    + `figure{margin:0 0 14pt;break-inside:avoid}figcaption{text-align:center;margin-bottom:5pt}figcaption b{color:${T.warna.inti.navy.hex}}img{display:block;margin:0 auto}`
    + `.s{font-size:8.5pt;color:${T.warna.inti['teks-3'].hex};margin:3pt 0 0}</style>${fig}`;
  fs.writeFileSync(path.join(ke, 'lembar.html'), html);
}

// gerbang atas keluaran yang sudah ada (dipakai qa/periksa.py --visual)
export function periksaDir(dir) {
  const hasil = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    const svg = path.join(dir, f.replace(/\.json$/, '.svg'));
    if (!fs.existsSync(svg)) continue;
    hasil[f.replace(/\.json$/, '')] = periksa(fs.readFileSync(svg, 'utf8'), JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  if (!Object.keys(hasil).length) throw new Error(`${dir}: tidak ada pasangan .svg + .json`);
  return hasil;
}

async function utama() {
  const arg = process.argv.slice(2), opsi = new Set(arg.filter(a => a.startsWith('--') && !a.includes('=')));
  const cek = arg.find(a => a.startsWith('--periksa='))?.slice(10);
  if (cek) {
    const h = periksaDir(path.resolve(cek));
    console.log(JSON.stringify(h, null, 1));
    process.exit(Object.values(h).some(x => x.length) ? 1 : 0);
  }
  const ke = path.resolve(arg.find(a => a.startsWith('--ke='))?.slice(5) || path.join(DIR, 'keluaran'));
  let berkas = arg.filter(a => !a.startsWith('--'));
  if (!berkas.length) berkas = fs.readdirSync(path.join(DIR, 'spek')).filter(f => f.endsWith('.json')).sort().map(f => path.join(DIR, 'spek', f));
  fs.mkdirSync(path.join(ke, 'ikon'), {recursive: true});
  const hasil = [];
  let gagal = 0;
  for (const b of berkas) for (const spek of [].concat(JSON.parse(fs.readFileSync(b, 'utf8')))) {
    const t0 = Date.now(), out = bangun(spek);
    fs.writeFileSync(path.join(ke, `${spek.nama}.svg`), out.svg);
    fs.writeFileSync(path.join(ke, `${spek.nama}.json`), JSON.stringify(out.manifest, null, 1));
    for (const s of out.satuan || []) fs.writeFileSync(path.join(ke, 'ikon', `${s.nama}.svg`), s.svg);
    hasil.push(out);
    gagal += out.salah.length > 0;
    console.log(`${out.salah.length ? 'GAGAL' : 'lolos'} ${spek.nama} (${spek.jenis}, ${Date.now() - t0} ms, ${(out.svg.length / 1024).toFixed(0)} KB)`);
    for (const s of out.salah) console.log(`  ${s}`);
  }
  if (!opsi.has('--tanpa-png')) {
    const p = await bukaPeramban(ke);
    for (const out of hasil) {
      await p.png(out.svg, path.join(ke, `${out.manifest.nama}.png`));
      for (const s of out.satuan || []) await p.png(s.svg, path.join(ke, 'ikon', `${s.nama}.png`));
    }
    if (opsi.has('--lembar')) {
      lembar(ke, hasil);
      await p.pg.goto(pathToFileURL(path.join(ke, 'lembar.html')).href, {waitUntil: 'load'});
      await p.pg.evaluate(() => document.fonts.ready);
      await p.pg.pdf({path: path.join(ke, 'lembar.pdf'), format: 'A4', preferCSSPageSize: true, printBackground: true});
      console.log(path.join(ke, 'lembar.pdf'));
    }
    await p.b.close();
  }
  if (gagal) { console.error(`${gagal} gambar melanggar gerbang`); process.exit(1); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await utama();
