// Dasar perender visual kajian BNPB: tema.json, token warna, metrik Roboto, kanvas SVG berkotak, pemuat data,
// format angka id-ID, legenda. Dipakai peta.mjs, grafik.mjs, ikon.mjs. Tanpa dependensi pihak ketiga.
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
function bacaFont(p) {
  const b = fs.readFileSync(p.replace(/^~/, os.homedir())), tb = {};
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
const FONT = {400: bacaFont(T.font.berkas.regular), 700: bacaFont(T.font.berkas.bold)};
export const adaGlif = ch => (FONT[400].peta.get(ch.codePointAt(0)) || 0) > 0;
export function lebar(s, pt, bobot = 400, spasi = 0) {
  const f = FONT[bobot >= 600 ? 700 : 400], cs = [...String(s)];
  return cs.reduce((w, ch) => w + f.adv(f.peta.get(ch.codePointAt(0)) || 0), 0) / f.upm * pt + spasi * Math.max(0, cs.length - 1);
}
export const NAIK = 0.76, TURUN = 0.24;   // kotak teks: puncak = baseline - 0,76 em, dasar = baseline + 0,24 em (cap height Roboto 0,711)

// ---- angka id-ID: titik ribuan, koma desimal ----
export const fmt = (v, d = 0) => new Intl.NumberFormat('id-ID', {minimumFractionDigits: d, maximumFractionDigits: d}).format(v);
export const num = v => v === null || v === undefined || v === '' || Number.isNaN(+v) ? null : +v;
export function langkahBagus(maks, n = 3) {   // nilai acuan bulat: 1, 2, 2,5, 5 x 10^k
  const kasar = maks / n, p = 10 ** Math.floor(Math.log10(kasar)), f = kasar / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
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
  for (const [k, v] of Object.entries(src.saring || {})) baris = baris.filter(r => cocok(r[k], v));
  for (const [k, re] of Object.entries(src.kecuali || {})) baris = baris.filter(r => !new RegExp(re).test(String(r[k] ?? '')));
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

// ---- kanvas SVG: semua warna lewat token, semua teks berkotak (gerbang D-8, D-21, D-24) ----
const r2 = v => Math.round(v * 100) / 100;
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export class Kanvas {
  constructor(w, h, mode, latar = true) {
    Object.assign(this, {w, h, mode, latar, el: [], defs: new Map(), kotak: [], hex: {}, huruf: [], legenda: [], tip: V.tipografi[mode]});
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
    this.huruf.push({pt, s: String(s)});
    if (o.kotak !== false) this.kotak.push(k);
    const a = o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : '';
    const ls = g.spasi_huruf_pt ? ` letter-spacing="${g.spasi_huruf_pt}"` : '';
    this.el.push(`<text x="${r2(x)}" y="${r2(y)}" font-size="${pt}"${g.bb === 700 ? ' font-weight="700"' : ''}${a}${ls} fill="${this.c(g.warna, o.peran || 'teks')}">${esc(s)}</text>`);
    return k;
  }
  // pil berteks: isi + garis dari token; kembali kotak pil
  pil(x, y, s, o = {}) {   // x,y = pojok kiri atas
    const g = this.gaya(o.peran_teks || 'label_peta', o.gaya), h = o.h || g.ukuran_pt * P.pil_tinggi_rasio;
    const w = lebar(s, g.ukuran_pt, g.bb, g.spasi_huruf_pt || 0) + 2 * (o.isi ?? P.pil_isi_pt);
    const isi = o.warna_isi ? ` fill="${this.c(o.warna_isi, 'pil')}"` : ` fill="${this.c(P.warna_pil, 'pil')}"`;
    const gr = o.warna_garis === null ? '' : ` stroke="${this.c(o.warna_garis || P.pil_label_garis, 'garis')}" stroke-width="${o.tebal ?? P.pil_garis_pt}"`;
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
  svg() {
    const d = this.defs.size ? `<defs>${[...this.defs.values()].join('')}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(this.w)}pt" height="${r2(this.h)}pt" viewBox="0 0 ${r2(this.w)} ${r2(this.h)}" font-family="${T.font.keluarga}">`
      + `${d}${this.latar ? `<rect width="${r2(this.w)}" height="${r2(this.h)}" fill="${this.c(P.latar, 'latar')}"/>` : ''}${this.el.join('')}</svg>`;
  }
  manifest(lain) {
    return {mode: this.mode, ukuran_pt: [r2(this.w), r2(this.h)], ukuran_cm: [r2(this.w * 2.54 / 72), r2(this.h * 2.54 / 72)],
      legenda: this.legenda.length > 0, entri_legenda: this.legenda,
      hex: Object.fromEntries(Object.entries(this.hex).map(([h, s]) => [h, [...s]])),
      teks_min_pt: this.huruf.length ? Math.min(...this.huruf.map(x => x.pt)) : null,
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

// ---- legenda: butir {jenis: kotak|arsir|garis|putus|pita|simbol, warna, label, bentuk?, r?} disusun mengalir, rata tengah atau kiri ----
export function aturLegenda(k, butir, wMaks) {
  const kk = G.legenda_kotak_pt, jarak = G.legenda_jarak_pt, pt = k.gaya('legenda').ukuran_pt, baris = [[]];
  let x = 0;
  const ukur = b => {
    const sw = b.jenis === 'simbol' ? 2 * b.r : b.jenis === 'judul' ? 0 : kk[0];
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
      const g = `leg${i}-${x | 0}`;
      if (u.jenis === 'kotak' || u.jenis === 'arsir' || u.jenis === 'pita') {
        const isi = u.jenis === 'arsir' ? k.arsir() : k.c(u.warna, u.peran || 'legenda');
        const gr = u.jenis === 'arsir' || u.garis ? ` stroke="${k.c(u.garis || 'batas', 'garis')}" stroke-width="0.4"` : '';
        k.tambah(`<rect x="${f2(x)}" y="${f2(cy - kk[1] / 2)}" width="${kk[0]}" height="${kk[1]}" fill="${isi}"${gr}/>`);
      } else if (u.jenis === 'garis' || u.jenis === 'putus') {
        k.tambah(`<line x1="${f2(x)}" y1="${f2(cy)}" x2="${f2(x + kk[0])}" y2="${f2(cy)}" stroke="${k.c(u.warna, u.peran || 'legenda')}" stroke-width="${G.garis_seri_pt}" stroke-linecap="round"${u.jenis === 'putus' ? ' stroke-dasharray="2.5 2.5"' : ''}/>`);
      } else if (u.jenis === 'simbol') {
        const s = simbol(u.bentuk, x + u.r, cy, u.r);
        k.tambah(`${s.d} fill="${k.c(u.warna, u.peran || 'simbol')}" stroke="${k.c(P.simbol_garis, 'garis')}" stroke-width="${P.simbol_garis_pt}"/>`);
      }
      const tx = x + u.sw + (u.sw ? 4 : 0);
      k.teks(tx, cy + (NAIK - TURUN) * pt / 2, u.label, u.jenis === 'judul' ? 'judul_legenda' : 'legenda', {jenis: 'legenda', grup: g});
      k.kotak.push({x, y: cy - u.tinggi / 2, w: u.w, h: u.tinggi, jenis: 'legenda', grup: g, teks: u.label});
      if (u.jenis !== 'judul') k.legenda.push({label: u.label, jenis: u.jenis, warna: u.warna ? warna(u.warna) : (u.jenis === 'arsir' ? 'arsir' : null), bentuk: u.bentuk});
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
