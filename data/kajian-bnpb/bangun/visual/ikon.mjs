// Ikon garis gaya Lucide (viewBox 24, stroke 2, ujung bulat) di dalam lingkaran, dari registri tema.json ikon (PEDOMAN B5.14).
// Sumber glif: 'deck:' dibaca dari ikon.mjs deck harian (tidak disalin), 'lucide:' path Lucide, 'khusus:' digambar di sini.
import fs from 'node:fs';
import path from 'node:path';
import {REPO, T, V, Kanvas, ukuran, f2, lebar} from './dasar.mjs';

const DECK = 'data/laporan-bnpb/harian-2026-10-23/ikon.mjs';
const deck = Object.fromEntries([...fs.readFileSync(path.join(REPO, DECK), 'utf8').matchAll(/^\s+(\w+): '(<.+>)',$/gm)].map(m => [`deck:${m[1]}`, m[2]]));
const ombak = y => `<path d="M2 ${y}c1.5 0 2.5-1 4-1s2.5 1 4 1 2.5-1 4-1 2.5 1 4 1 2.5-1 4-1"/>`;

export const GLIF = {
  ...deck,
  'lucide:mountain': '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  'lucide:cloud-lightning': '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
  'lucide:sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  // Lucide tidak punya 'virus'; digambar dengan gaya yang sama (inti + 8 duri bertopi)
  'lucide:virus': '<circle cx="12" cy="12" r="5"/><path d="M12 7V3"/><path d="M10.5 3h3"/><path d="M12 17v4"/><path d="M10.5 21h3"/><path d="M7 12H3"/><path d="M3 10.5v3"/><path d="M17 12h4"/><path d="M21 10.5v3"/><path d="m15.5 8.5 2.8-2.8"/><path d="m17.3 4.7 2 2"/><path d="m8.5 15.5-2.8 2.8"/><path d="m4.7 17.3 2 2"/><path d="m8.5 8.5-2.8-2.8"/><path d="m6.7 4.7-2 2"/><path d="m15.5 15.5 2.8 2.8"/><path d="m19.3 17.3-2 2"/>',
  'lucide:factory': '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',
  'lucide:droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  'lucide:sprout': '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
  'lucide:school': '<path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>',
  'lucide:land-plot': '<path d="m12 8 6-3-6-3v10"/><path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12"/><path d="m6.49 12.85 11.02 6.3"/><path d="M17.51 12.85 6.5 19.15"/>',
  'lucide:map-pin': '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  'lucide:landmark': '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 20 7H4z"/>',
  'lucide:list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  'lucide:triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  'lucide:shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  'lucide:siren': '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
  'lucide:hammer': '<path d="m15 12-8.373 8.373a1 1 0 1 1-3-3L12 9"/><path d="m18 15 4-4"/><path d="m21.5 11.5-1.914-1.914A2 2 0 0 1 19 8.172V7l-2.26-2.26a6 6 0 0 0-4.202-1.756L9 2.96l.92.82A6.18 6.18 0 0 1 12 8.4V10l2 2h1.172a2 2 0 0 1 1.414.586L18.5 14.5"/>',
  'lucide:scale': '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'lucide:database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  'lucide:construction': '<rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/>',
  'lucide:graduation-cap': '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  'lucide:banknote': '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  // glif khusus (PEDOMAN B1.3, B1.7): satu glif satu arti
  'khusus:tsunami': '<path d="M2 15.5c3 0 4.6-2 6-5C9.6 7 12 4 16 4c3.3 0 6 2.2 6 5.2 0 2.4-1.8 4.3-4.1 4.3-1.8 0-3.1-1.3-3.1-3 0-1.2.9-2.1 2.1-2.1"/>' + ombak(20.5),
  'khusus:likuefaksi': '<path d="M6.2 16.5 4.6 6.6l7.4-1.3 1.7 9.9"/><path d="M7.8 10.2l2.4-.4"/><path d="M8.3 13.2l2.4-.4"/>' + ombak(20) + '<path d="M15.5 16.5c1.5 0 2-1 3.3-1s1.9 1 3.2 1"/>',
  'khusus:longsor': '<path d="M2 21h20"/><path d="M3 21 11 4.5l2.6 5.3"/><circle cx="16" cy="16.5" r="1.6"/><circle cx="20" cy="18.6" r="1.1"/><circle cx="15.6" cy="11.8" r="0.9"/>',
  'khusus:abrasi': '<path d="M22 3h-7.5l-1 3.5 2 3-2.2 3 1.2 3.2V21H22"/>' + '<path d="M2 11c1.3 0 2-.9 3.3-.9S7.4 11 8.7 11"/><path d="M2 16c1.3 0 2-.9 3.3-.9S7.4 16 8.7 16"/>',
  'khusus:rob': '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 8.6V15"/><path d="M18.5 8.6V15"/><path d="M10 15v-4h4v4"/>' + ombak(17) + ombak(21.5),
  'khusus:konflik': '<circle cx="6" cy="7" r="3"/><circle cx="18" cy="7" r="3"/><path d="M1.5 21v-1.5A5 5 0 0 1 8.5 15"/><path d="M22.5 21v-1.5a5 5 0 0 0-7-4.5"/><path d="m12.6 9-1.6 2.6h2L11.4 14.5"/>',
  'khusus:bendungan': '<path d="M11.5 21 14 4h2.5l5 17Z"/><path d="M2 9.5c1.2 0 1.8.8 3 .8s1.8-.8 3-.8 1.8.8 3 .8"/><path d="M2 14c1.2 0 1.8.8 3 .8s1.8-.8 3-.8 1.6.7 2.6.8"/><path d="M2 21h20"/>',
  'khusus:sumur': '<path d="M3 9.5 12 3l9 6.5"/><path d="M6 8v7"/><path d="M18 8v7"/><path d="M12 8v3.5"/><path d="M10.5 11.5h3v2h-3z"/><path d="M4 15h16v6H4z"/>',
  'khusus:gnss': '<path d="M2 15h7.5l2.5 4h10"/><path d="M8 15V8.5"/><path d="M5 8.5h6"/><path d="M13.5 6.5a3 3 0 0 0-3-3"/><path d="M16.5 6.5a6 6 0 0 0-6-6"/>',
  'khusus:segitiga-naik': '<path d="M12 5 20.5 19h-17Z" fill="currentColor" stroke="none"/>',
  'khusus:segitiga-turun': '<path d="M12 19 3.5 5h17Z" fill="currentColor" stroke="none"/>',
};

export function glif(konsep) {
  const id = T.ikon[konsep];
  if (!id) throw new Error(`konsep ikon "${konsep}" tidak ada di registri tema.json ikon`);
  if (!GLIF[id]) throw new Error(`glif ${id} (konsep ${konsep}) belum digambar di ikon.mjs`);
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
  const d = dmm * 72 / 25.4, k = new Kanvas(d, d, 'docx');
  if (konsep === 'naik' || konsep === 'turun') glifDi(k, konsep, d / 2, d / 2, d, tok);
  else ikonDi(k, konsep, d / 2, d / 2, d, gaya, tok);
  return {svg: k.svg().replace(/<rect width="[^"]+" height="[^"]+" fill="#FFFFFF"\/>/, ''), manifest: {...k.manifest({jenis: 'ikon-satuan', konsep, gaya}), legenda: false}};
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
    const lebarGrup = d * gaya.length + 6 * (gaya.length - 1);
    gaya.forEach((g, j) => {
      const cx = x - lebarGrup / 2 + d / 2 + j * (d + 6);
      if (n === 'naik' || n === 'turun') glifDi(k, n, cx, y + d / 2, d * V.ikon.rasio, `arah.${n}`);
      else ikonDi(k, n, cx, y + d / 2, d, g);
    });
    k.teks(x, y + d + V.tipografi[mode].kategori.ukuran_pt + 3, n, 'kategori', {anchor: 'middle', grup: `ik${i}`});
  });
  for (const g of gaya) k.legenda.push({label: g === 'solid' ? 'ikon putih di lingkaran berwarna' : 'ikon berwarna di lingkaran tint', jenis: 'ikon'});
  return {svg: k.svg(), manifest: k.manifest({jenis: 'ikon', konsep: daftar, gaya, diameter_mm: dmm, tumpang: []}),
    satuan: spek.satuan ? daftar.flatMap(n => gaya.map(g => ({nama: `${n}-${g}`, ...ikonSatuan(n, g, n === 'naik' || n === 'turun' ? `arah.${n}` : warnaBawaan(n), dmm)}))) : []};
}
