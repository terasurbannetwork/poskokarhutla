// Dasar perender visual kajian BNPB: tema.json, token warna, metrik Roboto, kanvas SVG berkotak, pemuat data,
// format angka id-ID, legenda, gerbang periksa(). Dipakai peta.mjs, grafik.mjs, ikon.mjs. Tanpa dependensi pihak ketiga.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const AKAR = path.resolve(import.meta.dirname, '../..');   // data/kajian-bnpb
export const REPO = path.resolve(AKAR, '../..');
export const T = JSON.parse(fs.readFileSync(path.join(AKAR, 'tema.json'), 'utf8'));
export const G = T.grafik, P = T.peta, V = T.visual, L = T.garis_pt;

// ---- warna: nama token -> hex (cermin tema.py warna()) ----
export function warna(nama) {
  const w = T.warna;
  if (typeof nama !== 'string' || nama.startsWith('#')) throw new Error(`rujukan warna harus nama token, bukan hex: ${nama}`);
  for (const g of ['inti', 'aksen']) if (w[g][nama]) return w[g][nama].hex;
  const b = nama.split('.');
  const v = b[0] === 'tint' && b.length === 3 ? w.tint[b[1]]?.[b[2]]
    : b[0] === 'kategori' && b.length === 2 ? w.kategori[b[1]]?.hex
    : b[0] === 'skala' && b.length === 3 ? w.skala[b[1]]?.kelas?.[+b[2] - 1]
    : b[0] === 'arah' && b.length === 2 ? (typeof w.arah[b[1]] === 'string' ? warna(w.arah[b[1]]) : w.arah[b[1]]?.hex) : undefined;
  if (typeof v !== 'string' || !/^#[0-9A-F]{6}$/.test(v)) throw new Error(`token warna tidak dikenal: ${nama}`);
  return v;
}
// daftar putih D-9: semua hex di blok warna tema, kecuali daftar terlarang
export const HEX_SAH = new Set(JSON.stringify({...T.warna, terlarang: []}).match(/#[0-9A-F]{6}/g));

// luminans relatif dan kontras WCAG (sama dengan tema.py kontras())
const lum = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
export const kontras = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---- huruf: lebar dari hmtx Roboto, cakupan glif dari cmap format 12 (D-23) ----
// Berkas dari tema.json font.berkas (bawaan ~/Library/Fonts); ROBOTO_DIR menimpa foldernya di mesin lain.
export function berkasFont(bobot) {
  const asal = T.font.berkas[bobot], p = process.env.ROBOTO_DIR ? path.join(process.env.ROBOTO_DIR, path.basename(asal)) : asal.replace(/^~/, os.homedir());
  if (!fs.existsSync(p)) throw new Error(`font ${path.basename(asal)} tidak ada di ${p}; pasang Roboto (Regular, Medium, Bold) atau set ROBOTO_DIR=/folder/berisi/ttf`);
  return p;
}
function bacaFont(p) {
  const b = fs.readFileSync(p), tb = {};
  for (let i = 0, n = b.readUInt16BE(4); i < n; i++) { const o = 12 + 16 * i; tb[b.toString('latin1', o, o + 4)] = b.readUInt32BE(o + 8); }
  const upm = b.readUInt16BE(tb.head + 18), nh = b.readUInt16BE(tb.hhea + 34), peta = new Map();
  let sub;
  for (let i = 0, n = b.readUInt16BE(tb.cmap + 2); i < n; i++) {
    const o = tb.cmap + 4 + 8 * i;
    if (b.readUInt16BE(o) === 3 && b.readUInt16BE(o + 2) === 10) sub = tb.cmap + b.readUInt32BE(o + 4);
  }
  for (let g = 0, n = b.readUInt32BE(sub + 12); g < n; g++) {
    const o = sub + 16 + 12 * g, a = b.readUInt32BE(o), z = b.readUInt32BE(o + 4), s = b.readUInt32BE(o + 8);
    for (let k = a; k <= z; k++) peta.set(k, s + k - a);
  }
  return {upm, peta, adv: gid => b.readUInt16BE(tb.hmtx + 4 * Math.min(gid, nh - 1))};
}
const FONT = {400: bacaFont(berkasFont('regular')), 700: bacaFont(berkasFont('bold'))};
export const adaGlif = ch => (FONT[400].peta.get(ch.codePointAt(0)) || 0) > 0;
export function lebar(s, pt, bobot = 400, spasi = 0) {
  const f = FONT[bobot >= 600 ? 700 : 400], cs = [...String(s)];
  return cs.reduce((w, ch) => w + f.adv(f.peta.get(ch.codePointAt(0)) || 0), 0) / f.upm * pt + spasi * Math.max(0, cs.length - 1);
}
export const NAIK = 0.76, TURUN = 0.24;   // kotak teks: puncak = baseline - 0,76 em, dasar = baseline + 0,24 em (cap height Roboto 0,711)

// ---- angka id-ID: titik ribuan, koma desimal ----
export const fmt = (v, d = 0) => new Intl.NumberFormat('id-ID', {minimumFractionDigits: d, maximumFractionDigits: d}).format(v);
// estimasi model/simulasi: 2 angka bermakna (PEDOMAN C4), mis. 1.333 -> 1.300, 5,096 -> 5,1
export function fmtSig(v, n = 2) {
  if (!v) return fmt(0);
  const p = 10 ** (Math.floor(Math.log10(Math.abs(v))) - n + 1), r = Math.round(v / p) * p;
  return fmt(r, Math.max(0, -Math.round(Math.log10(p))));
}
export const num = v => v === null || v === undefined || v === '' || Number.isNaN(+v) ? null : +v;
export function langkahBagus(maks, n = 3) {   // nilai acuan bulat: 1, 2, 2,5, 5 x 10^k
  const kasar = maks / n, p = 10 ** Math.floor(Math.log10(kasar)), f = kasar / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
// pembulatan sisa terbesar: tiap bagian bulat, jumlahnya = round(jumlah asli) (PEDOMAN C4)
export function sisaTerbesar(vs) {
  const lantai = vs.map(Math.floor), kurang = Math.round(vs.reduce((a, b) => a + b, 0)) - lantai.reduce((a, b) => a + b, 0);
  vs.map((v, i) => [v - lantai[i], v, i]).sort((a, b) => b[0] - a[0] || b[1] - a[1]).slice(0, kurang).forEach(([, , i]) => lantai[i]++);
  return lantai;
}

// ---- data: CSV, NDJSON (baris type=row), JSON (jalur), GeoJSON titik; jalur relatif akar repo ----
function csv(t) {
  const rows = []; let r = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { r.push(f); f = ''; }
    else if (c === '\n') { r.push(f); rows.push(r); r = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || r.length) { r.push(f); rows.push(r); }
  const [h, ...d] = rows;
  return d.filter(x => x.length > 1 || x[0]).map(x => Object.fromEntries(h.map((k, i) => [k, x[i] ?? ''])));
}
const cocok = (v, harap) => (Array.isArray(harap) ? harap : [harap]).map(String).includes(String(v));
export function muat(src) {
  if (Array.isArray(src)) return src;
  const p = path.resolve(REPO, src.berkas), isi = fs.readFileSync(p, 'utf8');
  let baris = p.endsWith('.csv') ? csv(isi)
    : p.endsWith('.ndjson') ? isi.split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(o => o.type === 'row').map(o => o.data)
    : p.endsWith('.geojson') ? JSON.parse(isi).features.map(f => ({...f.properties, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1]}))
    : (src.jalur || '').split('.').filter(Boolean).reduce((o, k) => o[k], JSON.parse(isi));
  // kolom saring yang tidak ada atau hasil kosong = galat, bukan gambar kosong diam-diam (paket data bisa berganti nama kolom)
  const kolom = new Set(baris.flatMap(r => Object.keys(r)));
  for (const k of [...Object.keys(src.saring || {}), ...Object.keys(src.kecuali || {}), ...[].concat(src.kelompok || [])])
    if (!kolom.has(k)) throw new Error(`${src.berkas}: kolom "${k}" tidak ada (kolom: ${[...kolom].slice(0, 30).join(', ')})`);
  for (const [k, v] of Object.entries(src.saring || {})) baris = baris.filter(r => cocok(r[k], v));
  for (const [k, re] of Object.entries(src.kecuali || {})) baris = baris.filter(r => !new RegExp(re).test(String(r[k] ?? '')));
  if (!baris.length) throw new Error(`${src.berkas}: tidak ada baris yang cocok dengan saring ${JSON.stringify(src.saring || {})} kecuali ${JSON.stringify(src.kecuali || {})}`);
  if (src.ringkas) baris = ringkas(baris, [].concat(src.kelompok || []), src.ringkas);
  return baris;
}
// ringkasan per kelompok: {kolom_baru: "p10:total" | "rerata:x" | "jumlah:x" | "min:x" | "maks:x" | "n"}
export const kuantil = (v, q) => { const h = (v.length - 1) * q, a = Math.floor(h); return v[a] + (h - a) * ((v[a + 1] ?? v[a]) - v[a]); };
function ringkas(baris, kel, fungsi) {
  const grup = new Map();
  for (const r of baris) { const key = kel.map(c => r[c]).join('|'); if (!grup.has(key)) grup.set(key, []); grup.get(key).push(r); }
  return [...grup.values()].map(rs => {
    const o = Object.fromEntries(kel.map(c => [c, rs[0][c]]));
    for (const [nama, f] of Object.entries(fungsi)) {
      const [fn, kol] = f.split(':'), v = rs.map(r => num(r[kol])).filter(x => x !== null).sort((a, b) => a - b);
      const jml = v.reduce((a, b) => a + b, 0);
      o[nama] = fn === 'n' ? rs.length : fn === 'jumlah' ? jml : fn === 'rerata' ? jml / v.length : fn === 'min' ? v[0] : fn === 'maks' ? v.at(-1)
        : /^p\d+$/.test(fn) ? kuantil(v, +fn.slice(1) / 100) : (() => { throw new Error(`ringkas: fungsi ${fn} tidak dikenal`); })();
    }
    return o;
  });
}

// ---- ukuran kanvas dari spek ----
export function ukuran(spek, rasio) {
  const u = spek.ukuran || 'penuh', cm = x => x * 72 / 2.54;
  let w, h, mode = spek.mode || 'docx';
  if (T.objek.lebar_cm[u]) w = cm(T.objek.lebar_cm[u]);
  else if (V.ukuran_slide[u]) ({lebar_pt: w, tinggi_pt: h} = V.ukuran_slide[u]), mode = spek.mode || 'slide';
  else if (typeof u === 'object') w = u.lebar_pt ?? cm(u.lebar_cm), h = u.tinggi_pt ?? (u.tinggi_cm && cm(u.tinggi_cm));
  else throw new Error(`ukuran tidak dikenal: ${JSON.stringify(u)} (pakai ${Object.keys(T.objek.lebar_cm)}, ${Object.keys(V.ukuran_slide)})`);
  if (spek.tinggi_cm) h = cm(spek.tinggi_cm);
  if (spek.tinggi_pt) h = spek.tinggi_pt;
  if (!V.tipografi[mode]) throw new Error(`mode ${mode} tidak dikenal`);
  return {w, h: h || (rasio ? w * rasio : null), mode};
}

// ---- kanvas SVG: semua warna lewat token dan dicatat per peran (D-24), semua teks berkotak (D-8) ----
const r2 = v => Math.round(v * 100) / 100;
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export class Kanvas {
  constructor(w, h, mode, latar = true) {
    Object.assign(this, {w, h, mode, latar, el: [], defs: new Map(), kotak: [], hex: {}, legenda: [], tip: V.tipografi[mode]});
  }
  c(tok, peran = 'permukaan') { const h = warna(tok); (this.hex[h] ??= new Set()).add(peran); return h; }
  gaya(peran, o = {}) {
    const g = {...this.tip[peran], ...o};
    if (!g.ukuran_pt) throw new Error(`peran tipografi ${peran} tidak ada di visual.tipografi.${this.mode}`);
    return {...g, bb: g.bobot === 'bold' ? 700 : 400};
  }
  ukurTeks(s, peran, o) { const g = this.gaya(peran, o); return lebar(s, g.ukuran_pt, g.bb, g.spasi_huruf_pt || 0); }
  teks(x, y, s, peran, o = {}) {
    const g = this.gaya(peran, o), pt = g.ukuran_pt, w = lebar(s, pt, g.bb, g.spasi_huruf_pt || 0);
    const x0 = o.anchor === 'middle' ? x - w / 2 : o.anchor === 'end' ? x - w : x;
    const k = {x: x0, y: y - NAIK * pt, w, h: pt, jenis: o.jenis || 'teks', grup: o.grup, teks: String(s)};
    if (o.kotak !== false) this.kotak.push(k);
    const a = o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : '';
    const ls = g.spasi_huruf_pt ? ` letter-spacing="${g.spasi_huruf_pt}"` : '';
    // halo kertas di balik huruf supaya angka di atas garis acuan tetap terbaca
    const halo = o.halo ? ` stroke="${this.c('kertas', 'latar')}" stroke-width="${G.halo_pt}" stroke-linejoin="round" paint-order="stroke"` : '';
    if (o.alas) this.el.push(`<rect x="${r2(x0 - 1)}" y="${r2(k.y - 0.5)}" width="${r2(w + 2)}" height="${r2(pt + 1)}" fill="${this.c('kertas', 'latar')}"/>`);
    this.el.push(`<text x="${r2(x)}" y="${r2(y)}" font-size="${pt}"${g.bb === 700 ? ' font-weight="700"' : ''}${a}${ls}${halo} fill="${this.c(g.warna, o.peran || 'teks')}">${esc(s)}</text>`);
    return k;
  }
  // pil berteks: isi + garis dari token; kembali kotak pil. Garis pil = peran 'pil' (bermakna, D-24); isi = 'pil-isi'
  pil(x, y, s, o = {}) {   // x,y = pojok kiri atas
    const g = this.gaya(o.peran_teks || 'label_peta', o.gaya), h = o.h || g.ukuran_pt * P.pil_tinggi_rasio;
    const w = lebar(s, g.ukuran_pt, g.bb, g.spasi_huruf_pt || 0) + 2 * (o.isi ?? P.pil_isi_pt);
    const isi = ` fill="${this.c(o.warna_isi || P.warna_pil, 'pil-isi')}"`;
    const gr = o.warna_garis === null ? '' : ` stroke="${this.c(o.warna_garis || P.pil_label_garis, o.peran_garis || 'garis')}" stroke-width="${o.tebal ?? P.pil_garis_pt}"`;
    this.el.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(h / 2)}"${isi}${gr}/>`);
    this.teks(x + w / 2, y + h / 2 + (NAIK - TURUN) * g.ukuran_pt / 2 + 0.02 * g.ukuran_pt, s, o.peran_teks || 'label_peta',
      {...o.gaya, anchor: 'middle', kotak: false, warna: o.warna_teks || g.warna});
    const k = {x, y, w, h, jenis: o.jenis || 'label', grup: o.grup, teks: s};
    this.kotak.push(k);
    return k;
  }
  tambah(s) { this.el.push(s); }
  def(id, s) { this.defs.set(id, s); return `url(#${id})`; }
  arsir() {   // tanpa data: isi tanpa-data + arsir diagonal (PEDOMAN B1.4)
    const isi = this.c(T.warna.skala.tanpa_data.isi, 'tanpa-data'), ars = this.c(T.warna.skala.tanpa_data.arsir, 'tanpa-data');
    return this.def('arsir', `<pattern id="arsir" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="${isi}"/><line x1="0" y1="0" x2="0" y2="3" stroke="${ars}" stroke-width="0.6"/></pattern>`);
  }
  // satu entri legenda: <g class="legenda" data-warna="#HEX|arsir"> berisi penanda dan teksnya; gerbang D-21 membacanya dari SVG
  legendaMulai(warnaHex, label, jenis) { this.el.push(`<g class="legenda" data-warna="${warnaHex}">`); this.legenda.push({label, jenis, warna: warnaHex}); }
  legendaSelesai() { this.el.push('</g>'); }
  svg() {
    const d = this.defs.size ? `<defs>${[...this.defs.values()].join('')}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(this.w)}pt" height="${r2(this.h)}pt" viewBox="0 0 ${r2(this.w)} ${r2(this.h)}" font-family="${T.font.keluarga}">`
      + `${d}${this.latar ? `<rect width="${r2(this.w)}" height="${r2(this.h)}" fill="${this.c(P.latar, 'latar')}"/>` : ''}${this.el.join('')}</svg>`;
  }
  manifest(lain) {
    return {mode: this.mode, ukuran_pt: [r2(this.w), r2(this.h)], ukuran_cm: [r2(this.w * 2.54 / 72), r2(this.h * 2.54 / 72)],
      legenda: this.legenda.length > 0, entri_legenda: this.legenda,
      hex: Object.fromEntries(Object.entries(this.hex).map(([h, s]) => [h, [...s]])),
      kotak: this.kotak.map(k => ({...k, x: r2(k.x), y: r2(k.y), w: r2(k.w), h: r2(k.h)})), ...lain};
  }
}
export const f2 = r2;

// ---- bentuk ----
export function batangAtas(x, y, w, h, r) {   // batang tegak, sudut atas membulat, dasar lurus
  r = Math.max(0, Math.min(r, w / 2, h));
  return `M${r2(x)} ${r2(y + h)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h)}Z`;
}
export function batangKanan(x, y, w, h, r) {  // batang mendatar, ujung kanan membulat
  r = Math.max(0, Math.min(r, h / 2, w));
  return `M${r2(x)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x)}Z`;
}
// simbol sama luas: lingkaran r, persegi sisi r*sqrt(pi), segitiga sama sisi berluas pi r^2
export function simbol(bentuk, cx, cy, r) {
  if (bentuk === 'lingkaran') return {d: `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"`, s: r};
  if (bentuk === 'persegi') { const s = r * Math.sqrt(Math.PI) / 2; return {d: `<rect x="${r2(cx - s)}" y="${r2(cy - s)}" width="${r2(2 * s)}" height="${r2(2 * s)}"`, s}; }
  if (bentuk === 'segitiga') {
    const a = Math.sqrt(4 * Math.PI * r * r / Math.sqrt(3)), t = a * Math.sqrt(3) / 2;
    return {d: `<path d="M${r2(cx)} ${r2(cy - 2 * t / 3)}L${r2(cx + a / 2)} ${r2(cy + t / 3)}L${r2(cx - a / 2)} ${r2(cy + t / 3)}Z"`, s: Math.max(a / 2, 2 * t / 3)};
  }
  throw new Error(`bentuk simbol tidak dikenal: ${bentuk} (lingkaran, persegi, segitiga)`);
}

// ---- legenda: butir {jenis: kotak|arsir|garis|putus|pita|simbol|tegak|judul, warna, label, bentuk?, r?} mengalir, rata tengah atau kiri ----
export function aturLegenda(k, butir, wMaks) {
  const kk = G.legenda_kotak_pt, jarak = G.legenda_jarak_pt, pt = k.gaya('legenda').ukuran_pt, baris = [[]];
  let x = 0;
  const ukur = b => {
    const sw = b.jenis === 'simbol' ? 2 * b.r : b.jenis === 'judul' ? 0 : b.jenis === 'tegak' ? 4 : kk[0];
    const tw = k.ukurTeks(b.label, b.jenis === 'judul' ? 'judul_legenda' : 'legenda');
    return {sw, w: sw + (sw ? 4 : 0) + tw, tinggi: Math.max(pt * 1.25, b.jenis === 'simbol' ? 2 * b.r : 0)};
  };
  for (const b of butir) {
    const u = {...b, ...ukur(b)};
    if (x > 0 && x + u.w > wMaks) { baris.push([]); x = 0; }
    baris[baris.length - 1].push(u);
    x += u.w + jarak;
  }
  const tinggi = baris.map(r => Math.max(...r.map(u => u.tinggi)));
  return {baris, tinggi, h: tinggi.reduce((a, b) => a + b, 0) + 3 * (baris.length - 1)};
}
export function gambarLegenda(k, tata, x0, y0, wMaks, rata = 'tengah') {
  const kk = G.legenda_kotak_pt, jarak = G.legenda_jarak_pt, pt = k.gaya('legenda').ukuran_pt;
  let y = y0;
  tata.baris.forEach((r, i) => {
    const total = r.reduce((s, u) => s + u.w, 0) + jarak * (r.length - 1);
    let x = rata === 'tengah' ? x0 + (wMaks - total) / 2 : x0;
    const cy = y + tata.tinggi[i] / 2;
    for (const u of r) {
      const g = `leg${i}-${x | 0}`, hx = u.jenis === 'arsir' ? 'arsir' : u.warna ? warna(u.warna) : null;
      if (u.jenis !== 'judul') k.legendaMulai(hx, u.label, u.jenis);
      if (u.jenis === 'kotak' || u.jenis === 'arsir' || u.jenis === 'pita') {
        const isi = u.jenis === 'arsir' ? k.arsir() : k.c(u.warna, 'legenda');
        const gr = u.jenis === 'arsir' || u.garis ? ` stroke="${k.c(u.garis || 'batas', 'garis')}" stroke-width="0.4"` : '';
        k.tambah(`<rect x="${f2(x)}" y="${f2(cy - kk[1] / 2)}" width="${kk[0]}" height="${kk[1]}" fill="${isi}"${gr}/>`);
      } else if (u.jenis === 'garis' || u.jenis === 'putus') {
        k.tambah(`<line x1="${f2(x)}" y1="${f2(cy)}" x2="${f2(x + kk[0])}" y2="${f2(cy)}" stroke="${k.c(u.warna, 'legenda')}" stroke-width="${G.garis_seri_pt}" stroke-linecap="round"${u.jenis === 'putus' ? ' stroke-dasharray="2.5 2.5"' : ''}/>`);
      } else if (u.jenis === 'tegak') {
        k.tambah(`<line x1="${f2(x + 2)}" y1="${f2(cy - kk[1] / 2 - 1)}" x2="${f2(x + 2)}" y2="${f2(cy + kk[1] / 2 + 1)}" stroke="${k.c(u.warna, 'legenda')}" stroke-width="${G.tanda_tercatat_pt}"/>`);
      } else if (u.jenis === 'simbol') {
        const s = simbol(u.bentuk, x + u.r, cy, u.r);
        k.tambah(`${s.d} fill="${k.c(u.warna, 'legenda')}" stroke="${k.c(P.simbol_garis, 'garis')}" stroke-width="${P.simbol_garis_pt}"/>`);
      }
      const tx = x + u.sw + (u.sw ? 4 : 0);
      k.teks(tx, cy + (NAIK - TURUN) * pt / 2, u.label, u.jenis === 'judul' ? 'judul_legenda' : 'legenda', {jenis: 'legenda', grup: g});
      k.kotak.push({x, y: cy - u.tinggi / 2, w: u.w, h: u.tinggi, jenis: 'legenda', grup: g, teks: u.label});
      if (u.jenis !== 'judul') k.legendaSelesai();
      x += u.w + jarak;
    }
    y += tata.tinggi[i] + 3;
  });
}

// ---- irisan kotak (D-8): pasangan kotak beda grup yang beririsan lebih dari eps pt ----
const PADAT = new Set(['label', 'simbol', 'legenda', 'inset', 'skala', 'teks', 'nilai', 'pil']);
export function tumpang(kotak, eps = 0.3) {
  const ks = kotak.filter(k => PADAT.has(k.jenis)), hasil = [];
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
    const a = ks[i], b = ks[j];
    if (a.grup !== undefined && a.grup === b.grup) continue;
    const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ix > eps && iy > eps) hasil.push([a.teks || a.jenis, b.teks || b.jenis, f2(ix), f2(iy)]);
  }
  return hasil;
}

// ---- gerbang per gambar (PEDOMAN D): diukur dari SVG, bukan dari angka yang dilaporkan generator ----
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const atr = (a, n) => a.match(new RegExp(`\\s${n}="([^"]*)"`))?.[1];
// tiap <text>: isi dan kotaknya dihitung ulang dari x, y, font-size, font-weight, text-anchor, letter-spacing dan metrik Roboto
export function teksSvg(svg) {
  return [...svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)].map(([, a, isi]) => {
    const s = unesc(isi), gaya = atr(a, 'style') || '';
    const pt = +(atr(a, 'font-size') ?? gaya.match(/font-size:\s*([\d.]+)/)?.[1] ?? NaN);
    const bb = /\b(700|bold)\b/.test(`${atr(a, 'font-weight') || ''} ${gaya}`) ? 700 : 400, anc = atr(a, 'text-anchor') || 'start';
    const w = Number.isFinite(pt) ? lebar(s, pt, bb, +(atr(a, 'letter-spacing') || 0)) : 0, x = +atr(a, 'x'), y = +atr(a, 'y');
    return {s, pt, x: anc === 'middle' ? x - w / 2 : anc === 'end' ? x - w : x, y: y - NAIK * pt, w, h: pt};
  });
}
// kode pesan -> jenis yang sah (kolom Grafik tabel pilih grafik PEDOMAN B5.10); kode lain belum punya perender
export const PESAN_JENIS = {
  G1: ['batang'], G2: ['batang', 'garis'], G3: ['garis'], G4: ['horizontal'], G5: ['horizontal'], G8: ['bertumpuk'], G9: ['bertumpuk'],
  G11: ['garis'], G12: ['rentang'], G14: ['batang'], G16: ['matriks-titik'], G17: ['matriks'], G18: ['matriks'], G19: ['peta'], G20: ['peta'], G24: ['garis'],
};
const DATA = new Set(['seri', 'skala', 'simbol', 'pita', 'sorot', 'sorot-baris', 'tercatat', 'nomor']);          // tanda bermakna yang wajib berlegenda (D-21)
const MAKNA = new Set(['seri', 'skala', 'simbol', 'arah', 'pil', 'inset', 'sorot', 'sorot-baris', 'tercatat', 'nomor']);   // satu hex satu arti (D-24)
export function periksa(svg, man) {
  const salah = [], tks = teksSvg(svg), teks = tks.map(t => t.s).join('\n'), grafik = !['ikon', 'ikon-satuan'].includes(man.jenis);
  if (teks.includes('—')) salah.push('D-1 em dash di teks SVG');
  if (teks.includes('·')) salah.push('D-2 titik tengah di teks SVG');
  if (/\p{Extended_Pictographic}/u.test(teks)) salah.push('D-3 emoji di teks SVG');
  const luar = [...new Set([...teks.replace(/\n/g, '')].filter(c => !adaGlif(c)))];
  if (luar.length) salah.push(`D-23 glif di luar cmap Roboto: ${luar.map(c => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(', ')}`);
  // D-4: atribut, style, dan CSS
  const fam = [...new Set([...svg.matchAll(/font-family\s*(?:=\s*"|:\s*)([^";]+)/g)].map(m => m[1].trim().replace(/^['"]|['"]$/g, '')))];
  if (fam.some(f => f !== T.font.keluarga)) salah.push(`D-4 font-family ${fam.join(', ')}; hanya ${T.font.keluarga}`);
  const hexSvg = [...new Set((svg.match(/#[0-9A-Fa-f]{6}\b/g) || []).map(h => h.toUpperCase()))];
  const hex = hexSvg.filter(h => !HEX_SAH.has(h));
  if (hex.length) salah.push(`D-9 hex di luar tema.json: ${hex.join(', ')}`);
  // D-5 dari font-size tiap <text>
  const batas = V.tipografi[man.mode].batas_bawah_pt, kecil = tks.filter(t => !(t.pt >= batas));
  if (kecil.length) salah.push(`D-5 ${kecil.length} teks di bawah ${batas} pt (mode ${man.mode}), mis. "${kecil[0].s}" ${kecil[0].pt} pt`);
  // D-8 irisan: teks lawan teks diukur dari SVG, kotak lain (simbol, inset, skala, pil) dihitung ulang dari manifest
  const irisTeks = tumpang(tks.map((t, i) => ({...t, jenis: 'teks', grup: i, teks: t.s})), 0.6);
  if (irisTeks.length) salah.push(`D-8 ${irisTeks.length} pasang teks beririsan di SVG, mis. ${JSON.stringify(irisTeks.slice(0, 2))}`);
  const irisKotak = tumpang(man.kotak || []);
  if (irisKotak.length) salah.push(`D-8 ${irisKotak.length} pasang kotak beririsan, mis. ${JSON.stringify(irisKotak.slice(0, 2))}`);
  if (man.jenis === 'peta') {
    const u = man.unsur_peta || {};
    if (man.label_terlewat?.length) salah.push(`D-8 label tidak terpasang tanpa tumpuk: ${man.label_terlewat.join(', ')}`);
    for (const k of ['sumber_batas', 'sistem_referensi', 'proyeksi']) if (!u[k]) salah.push(`D-8 unsur peta ${k} kosong`);
    if (u.resmi !== true && !(u.catatan && teks.includes(u.catatan))) salah.push('D-8 batas tidak resmi tanpa catatan "Batas wilayah bukan rujukan resmi" tertulis di peta');
    if (man.cakupan !== 'nasional' && !u.inset) salah.push(`D-8 peta ${man.cakupan} tanpa inset lokasi`);
    if (u.skala_batang && u.skala_kena_darat > 0 && !u.skala_alas) salah.push(`D-8 skala batang dan arah utara menimpa daratan (${u.skala_kena_darat} titik uji)`);
  }
  // D-21: penanda legenda dibaca dari <g class="legenda" data-warna>, dibandingkan dengan hex peran data yang tergambar
  if (grafik) {
    const grup = [...svg.matchAll(/<g class="legenda" data-warna="([^"]*)">([\s\S]*?)<\/g>/g)];
    const leg = new Set(), palsu = [];
    for (const [, w, isi] of grup) {
      if (w === 'arsir' ? !isi.includes('url(#arsir)') : !new RegExp(`(fill|stroke)="${w}"`, 'i').test(isi)) palsu.push(w);
      leg.add(w.toUpperCase());
    }
    const data = new Set(Object.entries(man.hex || {}).filter(([, p]) => p.some(x => DATA.has(x))).map(([h]) => h.toUpperCase()));
    const badan = svg.replace(/<g class="legenda"[\s\S]*?<\/g>/g, '').replace(/<defs>[\s\S]*?<\/defs>/, '');
    if (badan.includes('url(#arsir)')) data.add('ARSIR');
    const tanpa = [...data].filter(h => !leg.has(h)), lebih = [...leg].filter(h => !data.has(h));
    if (!grup.length) salah.push('D-21 legenda tidak ada di SVG');
    if (palsu.length) salah.push(`D-21 entri legenda tanpa penanda sewarna: ${palsu.join(', ')}`);
    if (tanpa.length) salah.push(`D-21 warna tergambar tanpa entri legenda: ${tanpa.join(', ')}`);
    if (lebih.length) salah.push(`D-21 entri legenda untuk warna yang tidak tergambar: ${lebih.join(', ')}`);
  }
  // D-24: buku hex lengkap terhadap SVG, lalu satu hex satu peran bermakna per gambar
  const buku = new Set(Object.keys(man.hex || {}).map(h => h.toUpperCase())), takTercatat = hexSvg.filter(h => !buku.has(h));
  if (takTercatat.length) salah.push(`D-24 hex di SVG tanpa peran di manifest: ${takTercatat.join(', ')}`);
  for (const [h, p] of Object.entries(man.hex || {})) {
    const m = p.filter(x => MAKNA.has(x));
    if (m.length > 1) salah.push(`D-24 ${h} dipakai untuk ${m.join(' dan ')} di satu gambar (PEDOMAN B1.8)`);
  }
  // D-28: pasangan pesan dan jenis, atau alasan bila di luar tabel; besaran peta
  if (grafik) {
    if (man.pesan) {
      if (!PESAN_JENIS[man.pesan]) salah.push(`D-28 pesan "${man.pesan}" tidak punya perender (G25 dilarang)`);
      else if (!PESAN_JENIS[man.pesan].includes(man.jenis)) salah.push(`D-28 pesan ${man.pesan} digambar sebagai ${man.jenis}; tabel B5.10 meminta ${PESAN_JENIS[man.pesan].join(' atau ')}`);
      if (man.pesan === 'G2' && man.jenis === 'garis' && !(man.n_periode > 24)) salah.push(`D-28 G2 (seri panjang) butuh lebih dari 24 periode, dapat ${man.n_periode}`);
      if (man.pesan === 'G19' && !man.kelas) salah.push('D-28 G19 tanpa koroplet');
      if (man.pesan === 'G20' && man.kelas) salah.push('D-28 G20 (sebaran total) digambar koroplet');
    } else if (!(typeof man.alasan === 'string' && man.alasan.length >= 30)) salah.push('D-28 pesan kosong tanpa alasan satu kalimat (grafik di luar tabel B5.10)');
    if (man.jenis === 'peta' && man.kelas && !['rasio', 'indeks'].includes(man.besaran)) salah.push(`D-28 koroplet untuk besaran "${man.besaran}"; koroplet hanya rasio atau indeks`);
  }
  if ((man.anotasi || 0) > 3) salah.push(`D-28 ${man.anotasi} anotasi > 3`);
  if (man.n_batang > 24) salah.push(`D-28 ${man.n_batang} batang > 24`);
  if (man.segmen > 5) salah.push(`D-28 ${man.segmen} segmen > 5`);
  if (man.pil > 1) salah.push('D-28 pil kanan atas > 1');
  if (man.sumbu_y) salah.push('D-28 sumbu Y pada batang');
  if (grafik && man.keterangan !== undefined && !/\d{4}/.test(man.keterangan || '')) salah.push(`D-31 keterangan tanpa tahun atau periode: "${man.keterangan}"`);
  if ((man.catatan || '').length > 120) salah.push(`D-32 catatan ${man.catatan.length} karakter > 120`);
  for (const b of man.baris_rentang || []) {   // skenario terburuk: batas atas tidak di bawah angka tercatat (KEPUTUSAN P10)
    if (b.tercatat !== null && b.tampil[1] !== null && b.tampil[1] < b.tercatat) salah.push(`P10 rentang ${b.id} berbatas atas ${b.tampil[1]} di bawah tercatat ${b.tercatat}`);
    if (!teks.includes(b.label)) salah.push(`P10 label rentang "${b.label}" tidak tertulis di SVG`);
  }
  if (man.nilai_tak_tertulis) salah.push(`B5.10 ${man.nilai_tak_tertulis} nilai segmen tidak tertulis`);
  if (man.kontras_teks_min !== null && man.kontras_teks_min !== undefined && man.kontras_teks_min < T.validasi.teks_kontras_min)
    salah.push(`B1.1 kontras teks di sel/segmen ${man.kontras_teks_min}:1 < ${T.validasi.teks_kontras_min}:1`);
  return salah;
}
