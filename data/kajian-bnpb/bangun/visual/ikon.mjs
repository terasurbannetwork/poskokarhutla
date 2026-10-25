// Ikon garis gaya Lucide (viewBox 24, stroke 2, ujung bulat) di dalam lingkaran, dari registri tema.json ikon (PEDOMAN B5.14).
// Sumber glif: 'deck:' dibaca dari ikon.mjs deck harian (tidak disalin), 'lucide:' dan 'khusus:' dari tema.json glif.
import fs from 'node:fs';
import path from 'node:path';
import {REPO, T, V, Kanvas, ukuran, f2, lebar, tumpang} from './dasar.mjs';

const DECK = 'data/laporan-bnpb/harian-2026-10-23/ikon.mjs';
const deck = Object.fromEntries([...fs.readFileSync(path.join(REPO, DECK), 'utf8').matchAll(/^\s+(\w+): '(<.+>)',$/gm)].map(m => [`deck:${m[1]}`, m[2]]));
// path Lucide dan khusus dari registri tema.json glif (satu sumber untuk DOCX, deck, web; D-25); 'deck:' dari ikon.mjs deck harian
export const GLIF = {...deck, ...Object.fromEntries(Object.entries(T.glif).filter(([k]) => !k.startsWith('_')))};

export function glif(konsep) {
  const id = T.ikon[konsep];
  if (!id) throw new Error(`konsep ikon "${konsep}" tidak ada di registri tema.json ikon`);
  if (!GLIF[id]) throw new Error(`glif ${id} (konsep ${konsep}) tidak ada di tema.json glif atau ikon.mjs deck`);
  return GLIF[id];
}
export const KONSEP = Object.keys(T.ikon).filter(k => !k.startsWith('_'));
const kategoriDari = konsep => Object.entries(T.warna.kategori).find(([n, x]) => !n.startsWith('_') && x.jenis?.includes(konsep))?.[0];
// warna bawaan: jenis bencana = warna keluarganya, lainnya navy (PEDOMAN B1.3, B1.7)
export const warnaBawaan = konsep => (kategoriDari(konsep) ? `kategori.${kategoriDari(konsep)}` : 'navy');
const tintDari = tok => tok.startsWith('kategori.') ? `tint.${T.warna.kategori[tok.split('.')[1]].tint}.pita` : 'tint.netral.pita';

// gambar glif di kotak g x g berpusat (cx, cy); arah (segitiga) tanpa lingkaran
export function glifDi(k, konsep, cx, cy, g, tok, peran = 'ikon') {
  const c = k.c(tok, peran), s = g / V.ikon.viewbox;
  k.tambah(`<g transform="translate(${f2(cx - g / 2)} ${f2(cy - g / 2)}) scale(${f2(s * 1000) / 1000})" fill="none" stroke="${c}" color="${c}" stroke-width="${V.ikon.garis}" stroke-linecap="round" stroke-linejoin="round">${glif(konsep)}</g>`);
}
// ikon di lingkaran: gaya 'solid' = ikon putih di lingkaran berwarna; 'tint' = ikon berwarna di lingkaran tint
export function ikonDi(k, konsep, cx, cy, d, gaya = 'solid', tok = warnaBawaan(konsep)) {
  const latar = gaya === 'solid' ? tok : tintDari(tok);
  k.tambah(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(d / 2)}" fill="${k.c(latar, 'ikon-latar')}"/>`);
  glifDi(k, konsep, cx, cy, d * V.ikon.rasio, gaya === 'solid' ? 'kertas' : tok);
}

// satu ikon satu berkas (untuk DOCX/PPTX): kanvas persegi seluas lingkaran
export function ikonSatuan(konsep, gaya, tok, dmm) {
  const d = dmm * 72 / 25.4, k = new Kanvas(d, d, 'docx', false);
  if (konsep === 'naik' || konsep === 'turun') glifDi(k, konsep, d / 2, d / 2, d, tok);
  else ikonDi(k, konsep, d / 2, d / 2, d, gaya, tok);
  return {svg: k.svg(), manifest: k.manifest({jenis: 'ikon-satuan', konsep, gaya, tumpang: []})};
}

// lembar registri: semua konsep, kisi berlabel, dua gaya
export function lembarIkon(spek) {
  const daftar = spek.konsep === 'semua' || !spek.konsep ? KONSEP : spek.konsep, gaya = spek.gaya || ['solid', 'tint'];
  const {w: W, mode} = ukuran(spek), dmm = spek.diameter_mm || T.objek.lingkaran_ikon_kartu_mm, d = dmm * 72 / 25.4;
  const sel = Math.max(d * gaya.length + 6 * (gaya.length - 1), ...daftar.map(n => lebar(n, V.tipografi[mode].kategori.ukuran_pt))) + 8;
  const kol = Math.floor((W - 4) / sel), baris = Math.ceil(daftar.length / kol), hSel = d + V.tipografi[mode].kategori.ukuran_pt * 1.6 + 8;
  const k = new Kanvas(W, baris * hSel + 4, mode), sx = (W - kol * sel) / 2;
  daftar.forEach((n, i) => {
    const x = sx + (i % kol) * sel + sel / 2, y = 2 + Math.floor(i / kol) * hSel;
    const arah = n === 'naik' || n === 'turun', gs = arah ? [gaya[0]] : gaya, lebarGrup = d * gs.length + 6 * (gs.length - 1);
    gs.forEach((g, j) => {
      const cx = x - lebarGrup / 2 + d / 2 + j * (d + 6);
      if (arah) glifDi(k, n, cx, y + d / 2, d * V.ikon.rasio, `arah.${n}`);   // arah: segitiga sebaris, tanpa lingkaran (B1.5)
      else ikonDi(k, n, cx, y + d / 2, d, g);
    });
    k.teks(x, y + d + V.tipografi[mode].kategori.ukuran_pt + 3, n, 'kategori', {anchor: 'middle', grup: `ik${i}`});
  });
  const man = k.manifest({jenis: 'ikon', konsep: daftar, gaya, diameter_mm: dmm});
  man.tumpang = tumpang(man.kotak);
  return {svg: k.svg(), manifest: man,
    satuan: spek.satuan ? daftar.flatMap(n => (n === 'naik' || n === 'turun' ? [gaya[0]] : gaya).map(g => ({nama: `${n}-${g}`, ...ikonSatuan(n, g, n === 'naik' || n === 'turun' ? `arah.${n}` : warnaBawaan(n), dmm)}))) : []};
}
