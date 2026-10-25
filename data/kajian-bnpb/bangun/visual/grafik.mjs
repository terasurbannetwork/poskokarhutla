// Grafik dari spek JSON -> {svg, manifest}: batang (G1), batang horizontal peringkat (G4), garis tren + pita (G2/G3/G11),
// rentang median sampai tinggi dengan angka tercatat (G12), batang bertumpuk (G8/G9), matriks titik (G16), matriks (G17/G18).
// Pola PEDOMAN B5.10: batang berujung atas membulat, nilai Bold di atas, tanpa sumbu Y, pembanding abu, legenda wajib,
// pil kanan atas <= 1. Tabel peta panas (B5.7) dibuat native oleh pembangun DOCX dari manifest.sel matriks titik.
import {T, G, V, Kanvas, muat, num, fmt, fmtSig, sisaTerbesar, ukuran, batangAtas, batangKanan, aturLegenda, gambarLegenda, f2, langkahBagus, kontras, warna, NAIK, TURUN} from './dasar.mjs';
import {glifDi} from './ikon.mjs';
import {aturKelas, kelasNilai, labelTanpaData} from './peta.mjs';

const tepi = () => G.tepi_pt, jt = () => G.jarak_teks_pt;
const rentangAngka = n => Array.from({length: n}, (_, i) => i);
const kolomDari = c => typeof c === 'string' && /\{(\d+)\.\.(\d+)\}/.test(c)
  ? (([, a, b]) => rentangAngka(+b - +a + 1).map(i => c.replace(/\{\d+\.\.\d+\}/, +a + i)))(c.match(/\{(\d+)\.\.(\d+)\}/)) : c;
// warna seri: token kategori/inti/aksen; ramp skala berarti kelas, jadi tidak boleh jadi seri (PEDOMAN B1.8, D-24)
const seri = tok => { if (/^skala\./.test(tok || '')) throw new Error(`warna seri ${tok}: ramp skala hanya untuk kelas (PEDOMAN B1.8); pakai token seri sendiri`); return tok; };
// keluarga api atau basah tampil di gambar: ikon arah memakai teks-2 dan kata ditulis (B1.5); pil oranye Estimasi model
// bergaris netral bila keluarga api tampil, karena #D9600B sudah berarti api di gambar itu (B1.8; teks pil membawa maknanya)
const pakai = (spek, re) => re.test(JSON.stringify(spek));
const RE_API = /kategori\.api|skala\.api|"ramp":"api"|"skala":"irbi"/, RE_API_BASAH = /kategori\.(api|basah)|skala\.(api|air)|"ramp":"(api|air)"|"skala":"irbi"/;

// titik seri: data lebar (satu baris, kolom per periode) atau panjang (x, y per baris)
function ambil(d) {
  const rows = muat(d.sumber), kolom = kolomDari(d.kolom);
  if (kolom) {
    if (rows.length !== 1) throw new Error(`data lebar harus tepat 1 baris, dapat ${rows.length} (saring ${JSON.stringify(d.sumber.saring)})`);
    return kolom.map((c, i) => ({x: String(d.label?.[i] ?? String(c).match(/\d{4}/)?.[0] ?? c), v: num(rows[0][c])}));
  }
  return rows.map(r => ({x: String(d.label_x?.[r[d.x]] ?? r[d.x]), v: num(r[d.y]), r}));
}
const teksPil = p => p.teks || [T.kosakata.keyakinan[p.keyakinan]?.label, p.tambahan].filter(Boolean).join(', ');

// pil kanan atas (label keyakinan atau skenario), lalu kepala: nama besaran kiri, perubahan neto kanan
function atas(k, spek, info = {}) {
  let y = tepi();
  if (spek.pil) {
    const kk = T.kosakata.keyakinan[spek.pil.keyakinan] || {}, s = teksPil(spek.pil);
    if (spek.pil.keyakinan && !T.kosakata.keyakinan[spek.pil.keyakinan]) throw new Error(`pil: keyakinan ${spek.pil.keyakinan} tidak ada di kosakata`);
    let garis = kk.pil_isi ? null : (kk.pil_garis || spek.pil.garis || 'teks-3');
    if (garis && warna(garis) === warna('kategori.api') && pakai(spek, RE_API)) { garis = 'teks-3'; info.pil_garis_netral = 'B1.8: keluarga api tampil di gambar'; }
    const w = k.ukurTeks(s, 'pil') + 2 * G.pil_isi_pt;
    k.pil(k.w - tepi() - w, y, s, {peran_teks: 'pil', h: G.pil_tinggi_pt, isi: G.pil_isi_pt, warna_isi: kk.pil_isi || 'kertas',
      warna_garis: garis, peran_garis: 'pil', warna_teks: kk.pil_teks || 'teks', jenis: 'pil', grup: 'pil'});
    y += G.pil_tinggi_pt + 4;
  }
  if (spek.kepala) {
    const pt = k.gaya('kepala').ukuran_pt;
    y += NAIK * pt;
    if (spek.kepala.kiri) k.teks(tepi(), y, spek.kepala.kiri, 'kepala', {grup: 'kepala'});
    const n = spek.kepala.neto;
    if (n && n.length === 2 && n[0]) {
      const p = (n[1] - n[0]) / n[0] * 100, kata = p > 0 ? 'naik' : p < 0 ? 'turun' : 'tetap', s = `${kata} ${fmt(Math.abs(p), 1)}%`;
      const x1 = k.w - tepi(), wt = k.ukurTeks(s, 'kepala'), g = pt * 0.85;
      k.teks(x1, y, s, 'kepala', {anchor: 'end', grup: 'kepala'});
      if (p) {
        glifDi(k, kata, x1 - wt - 2 - g / 2, y - 0.36 * pt, g, spek.arah_netral || pakai(spek, RE_API_BASAH) ? 'teks-2' : `arah.${kata}`, 'arah');
        k.kotak.push({x: x1 - wt - 2 - g, y: y - 0.36 * pt - g / 2, w: g, h: g, jenis: 'teks', grup: 'kepala', teks: 'ikon arah'});
      }
    }
    y += TURUN * pt + 5;
  }
  return y;
}
function legendaAtas(k, butir, y) {
  if (!butir.length) return y;
  if (butir.some(b => !b.label)) throw new Error('legenda: tiap seri butuh label (seri_label atau legenda.*)');
  const tl = aturLegenda(k, butir, k.w - 2 * tepi());
  gambarLegenda(k, tl, tepi(), y, k.w - 2 * tepi(), 'kiri');
  return y + tl.h + 6;
}
const selesai = (k, spek, lain) => ({svg: k.svg(), manifest: k.manifest({jenis: spek.jenis, pesan: spek.pesan, alasan: spek.alasan, sumbu_y: false, pil: spek.pil ? 1 : 0, ...lain})});
const teksTerbaik = isi => ['teks', 'kertas'].map(t => [t, kontras(warna(t), warna(isi))]).sort((a, b) => b[1] - a[1])[0];

// ---- G1: batang tegak ----
export function batang(spek) {
  const s = ambil(spek.data);
  if (s.length > 24) throw new Error(`batang: ${s.length} periode > 24; ringkas per dekade atau pakai garis (D-28)`);
  if (s.some(p => p.v === null || p.v < 0)) throw new Error('batang: nilai kosong atau negatif (pakai G7 divergen)');
  const {w: W, h: H, mode} = ukuran(spek, V.rasio_tinggi.batang), k = new Kanvas(W, H, mode), n = s.length, info = {};
  if (spek.kepala?.neto === true) spek = {...spek, kepala: {...spek.kepala, neto: [s[0].v, s[n - 1].v]}};
  let y = atas(k, spek, info);
  const iPb = spek.pembanding === true ? 0 : spek.pembanding ?? -1;
  const tekan = new Set(Array.isArray(spek.tekan) ? spek.tekan : spek.tekan ? rentangAngka(spek.tekan).map(i => n - spek.tekan + i) : rentangAngka(n));
  const nada = i => i === iPb ? 'pembanding' : tekan.has(i) ? 'tekan' : 'lama';
  const tok = {pembanding: G.warna_pembanding, tekan: seri(spek.warna || G.warna_batang), lama: seri(spek.warna_lama || G.warna_batang_lama)};
  const ada = [...new Set(s.map((_, i) => nada(i)))].sort((a, b) => ['pembanding', 'lama', 'tekan'].indexOf(a) - ['pembanding', 'lama', 'tekan'].indexOf(b));
  const xsDari = t => s.filter((_, i) => nada(i) === t).map(p => p.x), lg = spek.legenda || {};
  y = legendaAtas(k, ada.map(t => ({jenis: 'kotak', warna: tok[t],
    label: lg[t] || (ada.length === 1 ? spek.seri_label : xsDari(t).length > 1 ? `${xsDari(t)[0]}–${xsDari(t).at(-1)}` : xsDari(t)[0])})), y);
  const ptN = k.gaya('nilai').ukuran_pt, ptK = k.gaya('kategori').ukuran_pt;
  const yB = H - tepi() - (NAIK + TURUN) * ptK - jt(), top = y + ptN + jt(), maks = Math.max(...s.map(p => p.v)) || 1;
  const slot = (W - 2 * tepi()) / n, bw = slot * (1 - G.batang_celah_rasio), skala = (yB - top) / maks, d = spek.desimal ?? 0;
  s.forEach((p, i) => {
    const x = tepi() + i * slot + (slot - bw) / 2, h = p.v * skala;
    k.tambah(`<path d="${batangAtas(x, yB - h, bw, h, bw * G.batang_radius_rasio)}" fill="${k.c(tok[nada(i)], 'seri')}"/>`);
    k.teks(x + bw / 2, yB - h - jt(), fmt(p.v, d), 'nilai', {anchor: 'middle', jenis: 'nilai'});
    k.teks(x + bw / 2, yB + jt() + NAIK * ptK, p.x, 'kategori', {anchor: 'middle'});
  });
  k.tambah(`<line x1="${f2(tepi())}" y1="${f2(yB)}" x2="${f2(W - tepi())}" y2="${f2(yB)}" stroke="${k.c(G.warna_garis_dasar, 'garis')}" stroke-width="${G.garis_dasar_pt}"/>`);
  return selesai(k, spek, {n_batang: n, ...info});
}

// ---- G4: batang horizontal peringkat, nomor dalam bulatan navy, kolom jumlah absolut ----
export function horizontal(spek) {
  const d = spek.data;
  let s = ambil(d);
  if (spek.urut !== false) s.sort((a, b) => b.v - a.v);
  s = s.map((p, i) => ({...p, no: i + 1})).slice(0, spek.n || s.length);
  const {w: W, mode} = ukuran(spek), k = new Kanvas(W, 2000, mode), sorot = new Set(spek.sorot || []), info = {};
  let y = atas(k, spek, info);
  const butir = [{jenis: 'kotak', warna: seri(spek.warna || G.warna_batang), label: spek.seri_label}];
  if (sorot.size) butir.push({jenis: 'kotak', warna: G.warna_sorot_baris, label: spek.sorot_label || 'wilayah fokus'});
  y = legendaAtas(k, butir, y);
  const rowH = G.baris_horizontal_pt, dN = G.bulatan_nomor_pt, ptK = k.gaya('kategori').ukuran_pt, ptH = k.gaya('kepala_kolom').ukuran_pt;
  const tam = d.kolom_tambahan, dd = spek.desimal ?? 0;
  const namaW = Math.max(...s.map(p => k.ukurTeks(p.x, 'kategori')), spek.judul_kolom?.nama ? k.ukurTeks(spek.judul_kolom.nama, 'kepala_kolom') : 0);
  const tamTeks = p => tam ? fmt(num(p.r[tam.kolom]), tam.desimal ?? 0) : '';
  const tamW = tam ? Math.max(k.ukurTeks(tam.judul, 'kepala_kolom'), ...s.map(p => k.ukurTeks(tamTeks(p), 'kategori'))) : 0;
  const nilW = Math.max(...s.map(p => k.ukurTeks(fmt(p.v, dd), 'nilai')));
  const xNama = tepi() + dN + 6, xBar = xNama + namaW + 8, xTam = W - tepi(), barW = (tam ? xTam - tamW - 14 : W - tepi()) - nilW - jt() - xBar;
  if (spek.judul_kolom || tam) {
    y += NAIK * ptH;
    if (spek.judul_kolom?.nama) k.teks(xNama, y, spek.judul_kolom.nama, 'kepala_kolom');
    if (spek.judul_kolom?.nilai) k.teks(xBar, y, spek.judul_kolom.nilai, 'kepala_kolom');
    if (tam) k.teks(xTam, y, tam.judul, 'kepala_kolom', {anchor: 'end'});
    y += TURUN * ptH + 3;
  }
  const maks = Math.max(...s.map(p => p.v)), bh = rowH * 0.52;
  s.forEach((p, i) => {
    const y0 = y + i * rowH, cy = y0 + rowH / 2;
    if (sorot.has(p.x)) k.tambah(`<rect x="0" y="${f2(y0)}" width="${f2(W)}" height="${f2(rowH)}" fill="${k.c(G.warna_sorot_baris, 'sorot-baris')}"/>`);
    k.tambah(`<circle cx="${f2(tepi() + dN / 2)}" cy="${f2(cy)}" r="${f2(dN / 2)}" fill="${k.c(G.warna_nomor, 'identitas')}"/>`);
    const ptNo = k.gaya('nomor').ukuran_pt;
    k.teks(tepi() + dN / 2, cy + (NAIK - TURUN) * ptNo / 2, String(p.no), 'nomor', {anchor: 'middle', kotak: false});
    k.teks(xNama, cy + (NAIK - TURUN) * ptK / 2, p.x, 'kategori');
    const w = Math.max(0.5, p.v / maks * barW);
    k.tambah(`<path d="${batangKanan(xBar, cy - bh / 2, w, bh, bh * G.batang_radius_rasio)}" fill="${k.c(spek.warna || G.warna_batang, 'seri')}"/>`);
    k.teks(xBar + w + jt(), cy + (NAIK - TURUN) * k.gaya('nilai').ukuran_pt / 2, fmt(p.v, dd), 'nilai', {jenis: 'nilai'});
    if (tam) k.teks(xTam, cy + (NAIK - TURUN) * ptK / 2, tamTeks(p), 'kategori', {anchor: 'end'});
    if (i < s.length - 1) k.tambah(`<line x1="${f2(xNama)}" y1="${f2(y0 + rowH)}" x2="${f2(W - tepi())}" y2="${f2(y0 + rowH)}" stroke="${k.c(T.slide.komponen.tabel_peringkat.warna_pemisah, 'garis')}" stroke-width="0.5"/>`);
  });
  k.h = y + s.length * rowH + tepi();
  return selesai(k, spek, {n_batang: s.length, ...info});
}

// ---- garis tren dengan pita, label seri di ujung garis bila seri <= 4 (B5.10), garis acuan <= 3 ----
export function garis(spek) {
  const sr0 = spek.seri.map(sr => ({...sr, warna: seri(sr.warna), titik: ambil(sr.data)}));
  const xs = sr0[0].titik.map(p => p.x), n = xs.length, langsung = sr0.length <= 4;
  let pita = null;
  if (spek.pita) {
    const pd = spek.pita.data, m = new Map(muat(pd.sumber).map(r => [String(r[pd.x]), [num(r[pd.bawah]), num(r[pd.atas])]]));
    pita = xs.map(x => m.get(x) || [null, null]);
  }
  const {w: W, h: H, mode} = ukuran(spek, V.rasio_tinggi.garis), k = new Kanvas(W, H, mode), info = {};
  if (spek.kepala?.neto === true) {   // perubahan neto dari seri yang disebut pesan, bukan seri pertama diam-diam
    if (sr0.length > 1 && spek.kepala.seri === undefined) throw new Error('garis: kepala.neto dengan lebih dari satu seri butuh kepala.seri (indeks atau label)');
    const s = sr0[typeof spek.kepala.seri === 'number' ? spek.kepala.seri : Math.max(0, sr0.findIndex(x => x.label === spek.kepala.seri))].titik;
    spek = {...spek, kepala: {...spek.kepala, neto: [s[0].v, s.at(-1).v]}};
  }
  let y = atas(k, spek, info);
  const butir = [];
  if (pita) butir.push({jenis: 'pita', warna: spek.pita.warna || G.warna_pita, label: spek.pita.label});
  if (!langsung) for (const sr of sr0) butir.push({jenis: sr.gaya === 'putus' ? 'putus' : 'garis', warna: sr.warna, label: sr.label});
  y = legendaAtas(k, butir, y);
  const ptN = k.gaya('nilai').ukuran_pt, ptK = k.gaya('kategori').ukuran_pt, ptA = k.gaya('acuan').ukuran_pt, ptL = k.gaya('legenda').ukuran_pt, dd = spek.desimal ?? 1;
  const semua = [...sr0.flatMap(sr => sr.titik.map(p => p.v)), ...(pita || []).flat()].filter(v => v !== null);
  let lo = Math.min(...semua), hi = Math.max(...semua);
  if (spek.dari_nol) lo = 0;
  const pad = (hi - lo) * 0.06, yLo = spek.dari_nol ? 0 : lo - pad, yHi = hi + pad;
  let step = langkahBagus(hi - lo, 3), acuan = [];
  for (let i = 0; i < 8; i++, step = langkahBagus(step * 3.2, 3)) {   // paling banyak 3 garis acuan bernilai bulat (PEDOMAN B5.10)
    acuan = [];
    for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) acuan.push(+v.toPrecision(12));
    if (acuan.length <= 3) break;
  }
  const accW = Math.max(...acuan.map(v => k.ukurTeks(fmt(v, spek.desimal_acuan ?? 0), 'acuan')));
  const namaUjung = sr => sr.label_ujung ?? sr.label, sambung = 8;
  const endW = Math.max(...sr0.map(sr => (langsung ? k.ukurTeks(namaUjung(sr) + ' ', 'legenda') + sambung : 0) + k.ukurTeks(fmt(sr.titik.at(-1).v, dd), 'nilai')));
  const x0 = tepi() + accW + 6, xR = W - tepi() - endW - 6, yT = y + ptA, yB = H - tepi() - (NAIK + TURUN) * ptK - jt() - ptA / 2;
  const X = i => x0 + i * (xR - x0) / (n - 1), Y = v => yB - (v - yLo) / (yHi - yLo) * (yB - yT);
  for (const v of acuan) {
    k.tambah(`<line x1="${f2(x0)}" y1="${f2(Y(v))}" x2="${f2(xR)}" y2="${f2(Y(v))}" stroke="${k.c(G.warna_garis_acuan, 'garis')}" stroke-width="${G.garis_acuan_pt}"/>`);
    k.teks(x0 - 5, Y(v) + (NAIK - TURUN) * ptA / 2, fmt(v, spek.desimal_acuan ?? 0), 'acuan', {anchor: 'end'});
  }
  let xKanan = -1e9;   // label sumbu x tanpa tumpuk (yang terakhir selalu tampil)
  const tampil = xs.map((x, i) => i).filter(i => {
    const w = k.ukurTeks(xs[i], 'kategori'), l = X(i) - w / 2;
    if (i !== n - 1 && X(n - 1) - k.ukurTeks(xs[n - 1], 'kategori') / 2 < X(i) + w / 2 + 4) return false;
    if (l < xKanan + 4) return false;
    xKanan = X(i) + w / 2; return true;
  });
  for (const i of tampil) k.teks(X(i), yB + jt() + ptA / 2 + NAIK * ptK, xs[i], 'kategori', {anchor: 'middle'});
  if (pita) {
    const ok = pita.map((p, i) => [i, p]).filter(([, p]) => p[0] !== null && p[1] !== null);
    k.tambah(`<path d="M${ok.map(([i, p]) => `${f2(X(i))} ${f2(Y(p[1]))}`).join('L')}L${ok.reverse().map(([i, p]) => `${f2(X(i))} ${f2(Y(p[0]))}`).join('L')}Z" fill="${k.c(spek.pita.warna || G.warna_pita, 'pita')}"/>`);
  }
  if ((spek.anotasi || []).length > 3) throw new Error('garis: anotasi paling banyak 3 (PEDOMAN B5.10)');
  for (const a of spek.anotasi || []) {
    const i = xs.indexOf(String(a.x));
    if (i < 0) throw new Error(`anotasi: x ${a.x} tidak ada`);
    k.tambah(`<line x1="${f2(X(i))}" y1="${f2(yT - 2)}" x2="${f2(X(i))}" y2="${f2(yB)}" stroke="${k.c(G.warna_anotasi, 'anotasi')}" stroke-width="${G.garis_anotasi_pt}"/>`);
    k.teks(X(i) + 3, yT + NAIK * k.gaya('anotasi').ukuran_pt - 2, a.teks, 'anotasi', {halo: true});
  }
  const ujung = [];
  for (const sr of sr0) {
    const t = sr.titik.map((p, i) => [i, p.v]).filter(([, v]) => v !== null);
    k.tambah(`<path d="M${t.map(([i, v]) => `${f2(X(i))} ${f2(Y(v))}`).join('L')}" fill="none" stroke="${k.c(sr.warna, 'seri')}" stroke-width="${G.garis_seri_pt}" stroke-linejoin="round" stroke-linecap="round"${sr.gaya === 'putus' ? ' stroke-dasharray="3 3"' : ''}/>`);
    for (const [i, v] of [t[0], t.at(-1)]) k.tambah(`<circle cx="${f2(X(i))}" cy="${f2(Y(v))}" r="${G.titik_pt}" fill="${k.c(sr.warna, 'seri')}" stroke="${k.c('kertas', 'garis')}" stroke-width="0.75"/>`);
    ujung.push({sr, y0: Y(t.at(-1)[1]), y: Y(t.at(-1)[1]), x: X(t.at(-1)[0]), s: fmt(t.at(-1)[1], dd), awal: [X(t[0][0]), Y(t[0][1]), fmt(t[0][1], dd)]});
  }
  ujung.sort((a, b) => a.y - b.y).forEach((u, i, arr) => { if (i && u.y - arr[i - 1].y < ptN * 1.15) u.y = arr[i - 1].y + ptN * 1.15; });
  for (const u of ujung) {
    const xa = u.x + G.titik_pt + 2, yb = u.y + (NAIK - TURUN) * ptN / 2;
    if (!langsung) { k.teks(xa + 1, yb, u.s, 'nilai', {jenis: 'nilai', halo: true}); continue; }
    // label ujung: penghubung sewarna seri + nama + nilai, satu entri legenda (D-21 membacanya dari SVG)
    const hx = warna(u.sr.warna), nama = namaUjung(u.sr);
    k.legendaMulai(hx, nama, 'label-ujung');
    k.tambah(`<path d="M${f2(xa)} ${f2(u.y0)}L${f2(xa + sambung - 2)} ${f2(u.y)}" fill="none" stroke="${k.c(u.sr.warna, 'legenda')}" stroke-width="${G.garis_seri_pt}" stroke-linecap="round"/>`);
    k.teks(xa + sambung, u.y + (NAIK - TURUN) * ptL / 2, nama, 'legenda', {jenis: 'legenda', grup: `ujung-${nama}`, halo: true});
    k.teks(xa + sambung + k.ukurTeks(nama + ' ', 'legenda'), yb, u.s, 'nilai', {jenis: 'nilai', grup: `ujung-${nama}`, halo: true});
    k.legendaSelesai();
  }
  // nilai awal: seri tertinggi di atas titiknya, terendah di bawah, sisanya di kanan titik
  const awal = ujung.map(u => u.awal).sort((a, b) => a[1] - b[1]);
  awal.forEach(([ax, ay, as], i) => {
    const wA = k.ukurTeks(as, 'nilai'), xa = Math.max(ax, x0 + wA / 2);
    if (i === 0) k.teks(xa, ay - G.titik_pt - 3, as, 'nilai', {anchor: 'middle', jenis: 'nilai', halo: true});
    else if (i === awal.length - 1) k.teks(xa, ay + G.titik_pt + 3 + NAIK * ptN, as, 'nilai', {anchor: 'middle', jenis: 'nilai', halo: true});
    else k.teks(ax + G.titik_pt + 3, ay + (NAIK - TURUN) * ptN / 2, as, 'nilai', {jenis: 'nilai', halo: true});
  });
  return selesai(k, spek, {n_periode: n, acuan: acuan.length, anotasi: (spek.anotasi || []).length, pita: !!pita, label_ujung: langsung, kepala_neto: spek.kepala?.neto, ...info});
}

// ---- G12: rentang per skenario, titik median, angka tercatat sebagai penanda dan batas bawah skenario terburuk ----
// Estimasi model ditulis 2 angka bermakna (C4). Bila angka tercatat melebihi batas tinggi, skenario terburuk = "≥ tercatat"
// (catatan paket skenario: "pakai angka tercatat sebagai batas bawah skenario"); kumis model tetap digambar.
export function rentang(spek) {
  const d = spek.data, dd = spek.desimal ?? 0, sat = spek.satuan ? ' ' + spek.satuan : '';
  let rows = muat(d.sumber).map(r => ({id: String(r[d.kategori]), lo: num(r[d.rendah]), hi: num(r[d.tinggi]), mid: d.tengah ? num(r[d.tengah]) : null}));
  if (d.urutan) rows = d.urutan.map(id => rows.find(r => r.id === id) || (() => { throw new Error(`rentang: kategori ${id} tidak ada di data`); })());
  const tc = d.tercatat ? new Map(muat(d.tercatat.sumber).map(r => [String(r[d.tercatat.kategori]), num(r[d.tercatat.nilai])])) : new Map();
  if (d.tercatat) for (const r of rows) if (!tc.has(r.id)) throw new Error(`rentang: angka tercatat untuk ${r.id} tidak ada`);
  const estimasi = spek.pil?.keyakinan === 'estimasi-model', f = v => estimasi ? fmtSig(v) : fmt(v, dd);
  rows = rows.map(r => {
    const t = tc.get(r.id) ?? null, geser = t !== null && t > r.hi && spek.tercatat_batas_bawah !== false;
    return {...r, tc: t, geser, tampil: geser ? [t, null] : [r.lo, r.hi], label: geser ? `≥ ${fmt(t)}${sat} (model ${f(r.lo)}–${f(r.hi)})` : `${f(r.lo)}–${f(r.hi)}${sat}`,
      nama: d.label_kategori?.[r.id] ?? r.id, warna: seri(d.warna_kategori?.[r.id] || spek.warna || G.warna_kumis)};
  });
  if (rows.some(r => r.lo === null || r.hi === null || r.lo > r.hi)) throw new Error('rentang: rendah/tinggi kosong atau terbalik');
  const {w: W, mode} = ukuran(spek), k = new Kanvas(W, 2000, mode), info = {};
  let y = atas(k, spek, info);
  const warnaUnik = [...new Set(rows.map(r => r.warna))], butir = warnaUnik.map(wn => ({jenis: 'garis', warna: wn,
    label: d.legenda_warna?.[wn] || (warnaUnik.length === 1 ? spek.seri_label : null)}));
  if (rows.some(r => r.mid !== null)) butir.push({jenis: 'simbol', bentuk: 'lingkaran', r: G.titik_pt + 0.4, warna: G.warna_titik_tengah, label: spek.tengah_label || 'median'});
  if (rows.some(r => r.tc !== null)) butir.push({jenis: 'tegak', warna: G.warna_tercatat, label: d.tercatat.label || 'tercatat'});
  y = legendaAtas(k, butir, y);
  const ptK = k.gaya('kategori').ukuran_pt, ptN = k.gaya('nilai').ukuran_pt, ptA = k.gaya('acuan').ukuran_pt;
  const labW = Math.max(...rows.map(r => k.ukurTeks(r.nama, 'kategori'))), rW = Math.max(...rows.map(r => k.ukurTeks(r.label, 'nilai')));
  const x0 = tepi() + labW + 10, xR = W - tepi() - rW - 8, maks = Math.max(...rows.map(r => Math.max(r.hi, r.tc ?? 0)));
  const step = langkahBagus(maks, 4), top = Math.ceil(maks / step) * step, X = v => x0 + v / top * (xR - x0);
  const rowH = G.baris_horizontal_pt * 1.2, yA = y + 2, yZ = yA + rows.length * rowH;
  for (let v = 0; v <= top + step / 2; v += step) {
    k.tambah(`<line x1="${f2(X(v))}" y1="${f2(yA)}" x2="${f2(X(v))}" y2="${f2(yZ)}" stroke="${k.c(G.warna_garis_acuan, 'garis')}" stroke-width="${G.garis_acuan_pt}"/>`);
    k.teks(X(v), yZ + jt() + NAIK * ptA, fmt(v), 'acuan', {anchor: 'middle'});
  }
  rows.forEach((r, i) => {
    const cy = yA + i * rowH + rowH / 2, c = k.c(r.warna, 'seri');
    k.teks(tepi(), cy + (NAIK - TURUN) * ptK / 2, r.nama, 'kategori');
    k.tambah(`<line x1="${f2(X(r.lo))}" y1="${f2(cy)}" x2="${f2(X(r.hi))}" y2="${f2(cy)}" stroke="${c}" stroke-width="${G.kumis_pt}" stroke-linecap="round"/>`
      + [r.lo, r.hi].map(v => `<circle cx="${f2(X(v))}" cy="${f2(cy)}" r="${f2(G.titik_pt * 0.8)}" fill="${c}"/>`).join(''));
    if (r.mid !== null) k.tambah(`<circle cx="${f2(X(r.mid))}" cy="${f2(cy)}" r="${f2(G.titik_pt + 0.4)}" fill="${k.c(G.warna_titik_tengah, 'simbol')}" stroke="${k.c('kertas', 'garis')}" stroke-width="0.75"/>`);
    if (r.tc !== null) {
      if (r.geser) k.tambah(`<line x1="${f2(X(r.hi) + G.titik_pt)}" y1="${f2(cy)}" x2="${f2(X(r.tc))}" y2="${f2(cy)}" stroke="${k.c(G.warna_garis_acuan, 'garis')}" stroke-width="0.75" stroke-dasharray="2 2"/>`);
      const h = rowH * 0.32;
      k.tambah(`<line x1="${f2(X(r.tc))}" y1="${f2(cy - h)}" x2="${f2(X(r.tc))}" y2="${f2(cy + h)}" stroke="${k.c(G.warna_tercatat, 'tercatat')}" stroke-width="${G.tanda_tercatat_pt}"/>`);
    }
    k.teks(Math.max(X(r.hi), r.tc !== null ? X(r.tc) : 0) + G.titik_pt + 4, cy + (NAIK - TURUN) * ptN / 2, r.label, 'nilai', {jenis: 'nilai', alas: true});
  });
  k.h = yZ + jt() + (NAIK + TURUN) * ptA + tepi();
  return selesai(k, spek, {n_baris: rows.length, ...info,
    baris_rentang: rows.map(r => ({id: r.id, rendah: r.lo, tinggi: r.hi, median: r.mid, tercatat: r.tc, geser: r.geser, tampil: r.tampil, label: r.label}))});
}

// ---- G8/G9: batang bertumpuk, <= 4 kategori + lainnya, nilai tiap segmen dan total tertulis ----
// Cacah dibulatkan metode sisa terbesar per batang supaya jumlah label segmen = label total (C4, D-6).
export function bertumpuk(spek) {
  const d = spek.data, seg = spek.seri.map(s => ({...s, warna: seri(s.warna || (s.id === 'lainnya' ? G.warna_lainnya : null))}));
  if (seg.length > 5) throw new Error(`bertumpuk: ${seg.length} segmen > 5 (D-28)`);
  const keSeg = new Map(Object.entries(d.kelompok || {}).flatMap(([id, vs]) => vs.map(v => [String(v), id])));
  const adaLain = seg.some(s => s.id === 'lainnya'), val = new Map();
  let dibuang = 0, pecahan = 0;
  for (const r of muat(d.sumber)) {
    const id = d.kelompok ? keSeg.get(String(r[d.seri])) || (adaLain ? 'lainnya' : null) : String(r[d.seri]), v = num(r[d.nilai]);
    if (!id || v === null) { dibuang++; continue; }
    if (v % 1) pecahan++;
    const x = String(r[d.x]);
    if (!val.has(x)) val.set(x, {});
    val.get(x)[id] = (val.get(x)[id] || 0) + v;
  }
  const xs = d.urutan_x?.map(String) || [...val.keys()].sort();
  if (xs.length > 24) throw new Error(`bertumpuk: ${xs.length} batang > 24 (D-28)`);
  const {w: W, h: H, mode} = ukuran(spek, V.rasio_tinggi.bertumpuk), k = new Kanvas(W, H, mode), info = {};
  let y = atas(k, spek, info);
  y = legendaAtas(k, seg.map(s => ({jenis: 'kotak', warna: s.warna, label: s.label})), y);
  const ptN = k.gaya('nilai').ukuran_pt, ptK = k.gaya('kategori').ukuran_pt, dd = spek.desimal ?? 0, n = xs.length;
  const total = x => seg.reduce((s, g) => s + (val.get(x)?.[g.id] || 0), 0), maks = Math.max(...xs.map(total));
  const yB = H - tepi() - (NAIK + TURUN) * ptK - jt(), top = y + ptN + jt(), skala = (yB - top) / maks;
  const slot = (W - 2 * tepi()) / n, bw = slot * (1 - (spek.celah_rasio ?? 0.5)), celah = slot - bw;
  let takTertulis = 0, kontrasMin = 99;
  const cek = [];
  xs.forEach((x, i) => {
    const bx = tepi() + i * slot + (slot - bw) / 2, luar = [];
    let yy = yB;
    const isi = seg.filter(g => val.get(x)?.[g.id]), mentah = isi.map(g => val.get(x)[g.id]);
    const bulat = dd === 0 ? sisaTerbesar(mentah) : mentah, tot = dd === 0 ? bulat.reduce((a, b) => a + b, 0) : total(x);
    cek.push({x, segmen: bulat, total: tot});
    isi.forEach((g, j) => {
      const v = mentah[j], h = v * skala, ya = yy - h, akhir = j === isi.length - 1;
      k.tambah(akhir ? `<path d="${batangAtas(bx, ya, bw, h, bw * G.batang_radius_rasio)}" fill="${k.c(g.warna, 'seri')}"/>`
        : `<rect x="${f2(bx)}" y="${f2(ya)}" width="${f2(bw)}" height="${f2(h)}" fill="${k.c(g.warna, 'seri')}"/>`);
      if (j) k.tambah(`<line x1="${f2(bx)}" y1="${f2(yy)}" x2="${f2(bx + bw)}" y2="${f2(yy)}" stroke="${k.c('kertas', 'garis')}" stroke-width="0.5"/>`);
      const s = fmt(bulat[j], dd), tw = k.ukurTeks(s, 'nilai', {bobot: 'regular'});
      if (h >= ptN * 1.4 && tw + 4 <= bw) {
        const [tk, kt] = teksTerbaik(g.warna);
        kontrasMin = Math.min(kontrasMin, kt);
        k.teks(bx + bw / 2, ya + h / 2 + (NAIK - TURUN) * ptN / 2, s, 'nilai', {anchor: 'middle', jenis: 'nilai', warna: tk, bobot: 'regular', grup: `seg${i}`});
      } else luar.push({s, tw, cy: ya + h / 2, warna: g.warna});
      yy = ya;
    });
    // nilai yang tidak muat di dalam segmen: di sela kanan batang, digeser tegak supaya tidak bertumpuk
    luar.sort((a, b) => b.cy - a.cy).forEach((l, j, arr) => { if (j && arr[j - 1].cy - l.cy < ptN * 1.15) l.cy = arr[j - 1].cy - ptN * 1.15; });
    const sw = G.legenda_kotak_pt[1] - 1;   // kotak warna segmen di depan angka supaya pasangannya terbaca
    for (const l of luar) {
      if (3 + sw + 2 + l.tw > celah - 2) { takTertulis++; continue; }
      k.tambah(`<rect x="${f2(bx + bw + 3)}" y="${f2(l.cy - sw / 2)}" width="${sw}" height="${sw}" fill="${k.c(l.warna, 'seri')}"/>`);
      k.teks(bx + bw + 3 + sw + 2, l.cy + (NAIK - TURUN) * ptN / 2, l.s, 'nilai', {jenis: 'nilai', bobot: 'regular'});
    }
    k.teks(bx + bw / 2, yy - jt(), fmt(tot, dd), 'nilai', {anchor: 'middle', jenis: 'nilai'});
    k.teks(bx + bw / 2, yB + jt() + NAIK * ptK, x, 'kategori', {anchor: 'middle'});
  });
  for (const c of cek) if (dd === 0 && (c.segmen.reduce((a, b) => a + b, 0) !== c.total || c.total !== Math.round(total(c.x))))
    throw new Error(`bertumpuk ${c.x}: jumlah label segmen ${c.segmen.join('+')} tidak sama dengan total ${c.total}`);
  k.tambah(`<line x1="${f2(tepi())}" y1="${f2(yB)}" x2="${f2(W - tepi())}" y2="${f2(yB)}" stroke="${k.c(G.warna_garis_dasar, 'garis')}" stroke-width="${G.garis_dasar_pt}"/>`);
  return {...selesai(k, spek, {n_batang: n, segmen: seg.length, nilai_tak_tertulis: takTertulis, kontras_teks_min: kontrasMin === 99 ? null : +kontrasMin.toFixed(2),
    baris_dibuang: dibuang, cacah_pecahan: pecahan, jumlah_per_batang: cek, ...info}),
    catatan: pecahan && dd === 0 ? 'Cacah berpecahan di sumber dibulatkan metode sisa terbesar per batang.' : null};
}

// ---- G16: matriks titik wilayah x kategori, titik berwarna kelas, angka tertulis di titik ----
// manifest.sel = bahan tabel peta panas native di DOCX (B5.7), dengan kelas dan rumus yang sama.
export function matriksTitik(spek) {
  const d = spek.data, rows0 = muat(d.sumber), cols = d.kolom;
  const rows = d.urutan ? d.urutan.map(id => rows0.find(r => String(r[d.baris]) === String(id))) : rows0;
  if (rows.some(r => !r)) throw new Error('matriks-titik: baris di urutan tidak ditemukan');
  const nilai = rows.flatMap(r => cols.map(c => num(r[c.kolom])));
  const kls = aturKelas(spek.kelas, nilai, d.sumber.berkas), dd = spek.kelas.desimal ?? 0;
  const {w: W, mode} = ukuran(spek), k = new Kanvas(W, 2000, mode), info = {};
  let y = atas(k, spek, info);
  const ptK = k.gaya('kategori').ukuran_pt, ptN = k.gaya('nilai').ukuran_pt, dT = G.titik_matriks_pt, rowH = G.baris_matriks_titik_pt;
  const nama = r => d.label_baris?.[r[d.baris]] ?? r[d.baris];
  const labW = Math.max(...rows.map(r => k.ukurTeks(nama(r), 'kategori')));
  const x0 = tepi() + labW + 6, cw = (W - tepi() - x0) / cols.length;
  const pecah = s => {   // kepala kolom paling banyak 2 baris, tidak diputar
    if (k.ukurTeks(s, 'kategori') <= cw - 2) return [s];
    const w = s.split(' ');
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '); if (k.ukurTeks(a, 'kategori') <= cw - 2 && k.ukurTeks(b, 'kategori') <= cw - 2) return [a, b]; }
    throw new Error(`matriks-titik: kepala "${s}" tidak muat ${f2(cw)} pt dalam 2 baris`);
  };
  const kepala = cols.map(c => pecah(c.label)), nb = Math.max(...kepala.map(x => x.length));
  kepala.forEach((ls, j) => ls.forEach((s, l) => k.teks(x0 + j * cw + cw / 2, y + NAIK * ptK + (l + nb - ls.length) * ptK * 1.15, s, 'kategori', {anchor: 'middle', grup: `kp${j}`})));
  y += nb * ptK * 1.15 + 3;
  let kontrasMin = 99, tanpa = 0;
  const sel = [];
  rows.forEach((r, i) => {
    const cy = y + i * rowH + rowH / 2;
    k.teks(tepi(), cy + (NAIK - TURUN) * ptK / 2, nama(r), 'kategori');
    if (i < rows.length - 1) k.tambah(`<line x1="${f2(tepi())}" y1="${f2(cy + rowH / 2)}" x2="${f2(W - tepi())}" y2="${f2(cy + rowH / 2)}" stroke="${k.c(T.slide.komponen.tabel_peringkat.warna_pemisah, 'garis')}" stroke-width="0.5"/>`);
    cols.forEach((c, j) => {
      const v = num(r[c.kolom]), cx = x0 + j * cw + cw / 2;
      if (v === null) {
        tanpa++;
        sel.push({baris: nama(r), kolom: c.label, nilai: null, kelas: null});
        k.tambah(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(dT / 2)}" fill="${k.arsir()}" stroke="${k.c(T.warna.skala.tanpa_data.arsir, 'garis')}" stroke-width="0.4"/>`);
        k.teks(cx, cy + (NAIK - TURUN) * ptN / 2, '–', 'nilai', {anchor: 'middle', bobot: 'regular', grup: `sel${i}-${j}`});
        return;
      }
      const ki = kelasNilai(kls, v), isi = kls.warna[ki], [tk, kt] = teksTerbaik(isi), s = fmt(v, dd);
      if (k.ukurTeks(s, 'nilai', {bobot: 'regular'}) > dT - 1) throw new Error(`matriks-titik: angka ${s} tidak muat di titik ${dT} pt`);
      kontrasMin = Math.min(kontrasMin, kt);
      sel.push({baris: nama(r), kolom: c.label, nilai: v, kelas: kls.label[ki], warna: isi});
      k.tambah(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(dT / 2)}" fill="${k.c(isi, 'skala')}"/>`);
      k.teks(cx, cy + (NAIK - TURUN) * ptN / 2, s, 'nilai', {anchor: 'middle', warna: tk, bobot: 'regular', grup: `sel${i}-${j}`});
    });
  });
  y += rows.length * rowH + 6;
  const butir = [{jenis: 'judul', label: spek.judul_legenda || kls.judul || 'Kelas'}, ...kls.warna.map((wn, i) => ({jenis: 'kotak', warna: wn, label: kls.label[i]}))];
  if (tanpa) butir.push({jenis: 'arsir', label: labelTanpaData(spek)});
  const tl = aturLegenda(k, butir, W - 2 * tepi());
  gambarLegenda(k, tl, tepi(), y, W - 2 * tepi());
  k.h = y + tl.h + tepi();
  return {...selesai(k, spek, {kelas: {ramp: kls.ramp, batas: kls.batas, label: kls.label, rumus: kls.rumus}, kontras_teks_min: +kontrasMin.toFixed(2), sel_kosong: tanpa, sel, ...info}),
    token: {rumus_kelas: kls.rumus}};
}

// ---- G17/G18: matriks n x m bertint netral seragam, butir bernomor dalam bulatan navy, daftar di samping ----
export function matriks(spek) {
  const nk = spek.kolom.label.length, nb = spek.baris.label.length;
  let butir = spek.butir, ambang = null;
  if (!butir) {   // otomatis 2 x 2 dari dua kolom angka dan ambang (median bawaan)
    const d = spek.data, rows = muat(d.sumber);
    if (nk !== 2 || nb !== 2) throw new Error('matriks: penempatan otomatis hanya untuk 2 x 2');
    const med = c => { const v = rows.map(r => num(r[c])).sort((a, b) => a - b), m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
    ambang = {x: d.ambang_x === 'median' || d.ambang_x === undefined ? med(d.x) : d.ambang_x, y: d.ambang_y === 'median' || d.ambang_y === undefined ? med(d.y) : d.ambang_y};
    butir = rows.map(r => ({nama: d.label_nama?.[r[d.nama]] ?? r[d.nama], kolom: +(num(r[d.x]) > ambang.x), baris: +(num(r[d.y]) > ambang.y)}));
  }
  butir = butir.map((b, i) => ({...b, kode: b.kode ?? String(i + 1)}));
  const {w: W, mode} = ukuran(spek), k = new Kanvas(W, 2000, mode), info = {};
  let y = atas(k, spek, info);
  const ptK = k.gaya('kategori').ukuran_pt, ptH = k.gaya('kepala_kolom').ukuran_pt, ptL = k.gaya('legenda').ukuran_pt, dN = G.bulatan_nomor_pt + 2, gap = G.sel_celah_pt * 2;
  const daftar = spek.daftar !== false, listW = daftar ? Math.max(...butir.map(b => k.ukurTeks(b.nama, 'legenda'))) + dN + 6 : 0;
  const rowLabW = Math.max(...spek.baris.label.map(s => k.ukurTeks(s, 'kategori')));
  const x0 = tepi() + rowLabW + 6, gw = W - tepi() - x0 - (daftar ? listW + 16 : 0), cw = (gw - gap * (nk - 1)) / nk;
  const ch = spek.tinggi_sel_pt || Math.min(cw * 0.55, 60);
  if (spek.baris.judul) { y += NAIK * ptH; k.teks(tepi(), y, spek.baris.judul, 'kepala_kolom'); y += TURUN * ptH + 4; }
  const yG = y;
  for (let j = 0; j < nb; j++) {   // baris 0 di bawah (dampak/urgensi naik ke atas)
    const yy = yG + (nb - 1 - j) * (ch + gap);
    k.teks(x0 - 6, yy + ch / 2 + (NAIK - TURUN) * ptK / 2, spek.baris.label[j], 'kategori', {anchor: 'end'});
    for (let i = 0; i < nk; i++) {
      const x = x0 + i * (cw + gap), isi = butir.filter(b => b.kolom === i && b.baris === j);
      k.tambah(`<rect x="${f2(x)}" y="${f2(yy)}" width="${f2(cw)}" height="${f2(ch)}" rx="2" fill="${k.c(G.warna_sel, 'permukaan')}"/>`);
      const per = Math.max(1, Math.floor((cw - 8) / (dN + 4))), brs = Math.ceil(isi.length / per);
      if (brs * (dN + 4) > ch) throw new Error(`matriks: ${isi.length} butir tidak muat di sel (${i}, ${j})`);
      isi.forEach((b, q) => {
        const r = Math.floor(q / per), dlm = Math.min(per, isi.length - r * per), c = q % per;
        const cx = x + cw / 2 + (c - (dlm - 1) / 2) * (dN + 4), cy = yy + ch / 2 + (r - (brs - 1) / 2) * (dN + 4);
        k.tambah(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(dN / 2)}" fill="${k.c(G.warna_nomor, 'nomor')}"/>`);
        k.teks(cx, cy + (NAIK - TURUN) * k.gaya('nomor').ukuran_pt / 2, b.kode, 'nomor', {anchor: 'middle', grup: `m${q}-${i}-${j}`});
      });
    }
  }
  const yBawah = yG + nb * (ch + gap) - gap;
  spek.kolom.label.forEach((s, i) => k.teks(x0 + i * (cw + gap) + cw / 2, yBawah + jt() + NAIK * ptK, s, 'kategori', {anchor: 'middle'}));
  let yEnd = yBawah + jt() + (NAIK + TURUN) * ptK;
  if (spek.kolom.judul) { k.teks(x0 + gw / 2, yEnd + 3 + NAIK * ptH, spek.kolom.judul, 'kepala_kolom', {anchor: 'middle'}); yEnd += 3 + (NAIK + TURUN) * ptH; }
  if (daftar) {
    const xl = W - tepi() - listW;
    butir.forEach((b, q) => {
      const cy = yG + dN / 2 + q * (dN + 4);
      k.legendaMulai(warna(G.warna_nomor), `${b.kode} ${b.nama}`, 'nomor');
      k.tambah(`<circle cx="${f2(xl + dN / 2)}" cy="${f2(cy)}" r="${f2(dN / 2)}" fill="${k.c(G.warna_nomor, 'legenda')}"/>`);
      k.teks(xl + dN / 2, cy + (NAIK - TURUN) * k.gaya('nomor').ukuran_pt / 2, b.kode, 'nomor', {anchor: 'middle', kotak: false});
      k.teks(xl + dN + 6, cy + (NAIK - TURUN) * ptL / 2, b.nama, 'legenda', {jenis: 'legenda', grup: `daftar${q}`});
      k.legendaSelesai();
    });
    yEnd = Math.max(yEnd, yG + butir.length * (dN + 4));
  }
  k.h = yEnd + tepi();
  return selesai(k, spek, {ukuran_matriks: [nb, nk], butir: butir.length, ambang, ...info});
}


// ---- diagram kotak dan panah di kisi (bagan alur, lembaga, lapisan, garis waktu): di luar tabel B5.10, wajib alasan ----
// spek: kolom, baris, judul_kolom[], judul_baris[], kelas{id: {label, warna}}, kotak[{id, k, b, lk, lb, kelas, judul, isi}],
// panah[{dari, ke, label}]. Warna kotak = kelas (peran seri, berlegenda); panah dan garis netral.
function bungkus(k, s, peran, w) {
  const out = [];
  for (const par of String(s || '').split('\n')) {
    let b = '';
    for (const kata of par.split(/\s+/).filter(Boolean)) {
      const c = b ? `${b} ${kata}` : kata;
      if (b && k.ukurTeks(c, peran) > w) { out.push(b); b = kata; } else b = c;
    }
    if (b) out.push(b);
  }
  return out;
}
export function diagram(spek) {
  const {w: W, mode} = ukuran(spek), k0 = new Kanvas(W, 10, mode);
  const nk = spek.kolom, nb = spek.baris, sela = spek.sela_pt ?? 10, isiPt = 4;
  const ptJ = k0.gaya('nilai').ukuran_pt, ptI = k0.gaya('kategori').ukuran_pt, ptKK = k0.gaya('kepala_kolom').ukuran_pt;
  const kiriJ = spek.judul_baris ? Math.max(...spek.judul_baris.map(s => Math.max(...bungkus(k0, s, 'kepala_kolom', 70).map(x => k0.ukurTeks(x, 'kepala_kolom'))))) + 8 : 0;
  const x0 = tepi() + kiriJ, lebarK = (W - x0 - tepi() - sela * (nk - 1)) / nk;
  const lebarKotak = b => lebarK * (b.lk || 1) + sela * ((b.lk || 1) - 1);
  const isi = b => {
    const wt = lebarKotak(b) - 2 * isiPt;
    return {j: bungkus(k0, b.judul, 'nilai', wt), i: bungkus(k0, b.isi, 'kategori', wt)};
  };
  const tinggiKotak = b => { const t = isi(b); return 2 * isiPt + t.j.length * ptJ * 1.2 + (t.i.length ? (t.j.length ? 2 : 0) + t.i.length * ptI * 1.2 : 0); };
  const tb = Array(nb).fill(spek.tinggi_baris_min_pt ?? 0);
  for (const b of spek.kotak) if (!(b.lb > 1)) tb[b.b] = Math.max(tb[b.b], tinggiKotak(b));
  for (const b of spek.kotak) if (b.lb > 1) {
    const ada = tb.slice(b.b, b.b + b.lb).reduce((a, c) => a + c, 0) + sela * (b.lb - 1), kurang = tinggiKotak(b) - ada;
    if (kurang > 0) for (let i = b.b; i < b.b + b.lb; i++) tb[i] += kurang / b.lb;
  }
  const kelas = spek.kelas || {}, ada = new Set(spek.kotak.map(b => b.kelas)), dipakai = [...Object.keys(kelas).filter(c => ada.has(c)), ...[...ada].filter(c => !kelas[c])];
  for (const c of dipakai) if (!kelas[c]) throw new Error(`diagram ${spek.nama}: kelas ${c} tidak didefinisikan`);
  // tinggi: legenda, judul kolom, kisi
  const tl = aturLegenda(k0, dipakai.map(c => ({jenis: 'kotak', warna: kelas[c].warna, garis: kelas[c].garis, label: kelas[c].label})), W - 2 * tepi());
  const hKK = spek.judul_kolom ? Math.max(...spek.judul_kolom.map(s => bungkus(k0, s, 'kepala_kolom', lebarK).length)) * ptKK * 1.2 + 5 : 0;
  const H = tepi() + tl.h + 8 + hKK + tb.reduce((a, c) => a + c, 0) + sela * (nb - 1) + tepi();
  const k = new Kanvas(W, H, mode);
  let y = legendaAtas(k, dipakai.map(c => ({jenis: 'kotak', warna: kelas[c].warna, garis: kelas[c].garis, label: kelas[c].label})), tepi()) + 2;
  if (spek.judul_kolom) {
    spek.judul_kolom.forEach((s, i) => bungkus(k, s, 'kepala_kolom', lebarK).forEach((l, j) =>
      k.teks(x0 + i * (lebarK + sela) + lebarK / 2, y + NAIK * ptKK + j * ptKK * 1.2, l, 'kepala_kolom', {anchor: 'middle', grup: `kk${i}`})));
    y += hKK;
  }
  const yB = [y]; for (let i = 1; i < nb; i++) yB.push(yB[i - 1] + tb[i - 1] + sela);
  if (spek.judul_baris) spek.judul_baris.forEach((s, i) => { const ls = bungkus(k, s, 'kepala_kolom', kiriJ - 8);
    ls.forEach((l, j) => k.teks(tepi(), yB[i] + tb[i] / 2 - (ls.length - 1) * ptKK * 0.6 + (NAIK - TURUN) * ptKK / 2 + j * ptKK * 1.2, l, 'kepala_kolom', {grup: `jb${i}`})); });
  const pos = {};
  for (const b of spek.kotak) {
    const x = x0 + b.k * (lebarK + sela), w = lebarKotak(b), yy = yB[b.b], h = yB[b.b + (b.lb || 1) - 1] + tb[b.b + (b.lb || 1) - 1] - yy;
    pos[b.id] = {x, y: yy, w, h};
    const tok = kelas[b.kelas].warna, [tt] = teksTerbaik(tok), t = isi(b);
    k.tambah(`<rect x="${f2(x)}" y="${f2(yy)}" width="${f2(w)}" height="${f2(h)}" rx="3" fill="${k.c(tok, 'seri')}"${kelas[b.kelas].garis ? ` stroke="${k.c(kelas[b.kelas].garis, 'garis')}" stroke-width="0.75"` : ''}/>`);
    const tinggiT = t.j.length * ptJ * 1.2 + (t.i.length ? (t.j.length ? 2 : 0) + t.i.length * ptI * 1.2 : 0) - 0.2 * (t.i.length ? ptI : ptJ);
    let ty = yy + (h - tinggiT) / 2 + NAIK * ptJ;
    for (const l of t.j) { k.teks(x + w / 2, ty, l, 'nilai', {anchor: 'middle', warna: tt, grup: b.id}); ty += ptJ * 1.2; }
    if (t.i.length) ty += (t.j.length ? 2 - ptJ * 1.2 + ptI * 1.2 : 0) + (NAIK * ptI - NAIK * ptJ);
    for (const l of t.i) { k.teks(x + w / 2, ty, l, 'kategori', {anchor: 'middle', warna: tt, grup: b.id}); ty += ptI * 1.2; }
  }
  const gw = k.c('teks-3', 'garis');
  k.def('panah', `<marker id="panah" viewBox="0 0 6 6" refX="5.5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z" fill="${gw}"/></marker>`);
  for (const a of spek.panah || []) {
    const p = pos[a.dari], q = pos[a.ke];
    if (!p || !q) throw new Error(`diagram ${spek.nama}: panah ${a.dari} -> ${a.ke} tanpa kotak`);
    let d, lx, ly, ank = 'start';
    const cxp = p.x + p.w / 2, cyp = p.y + p.h / 2, cxq = q.x + q.w / 2, cyq = q.y + q.h / 2;
    if (q.x >= p.x + p.w - 0.5 && !(q.y >= p.y + p.h) && !(q.y + q.h <= p.y)) {          // kanan, baris beririsan
      const yy = (Math.max(p.y, q.y) + Math.min(p.y + p.h, q.y + q.h)) / 2; d = `M${f2(p.x + p.w)} ${f2(yy)}L${f2(q.x - 1)} ${f2(yy)}`; lx = (p.x + p.w + q.x) / 2; ly = yy - 3; ank = 'middle';
    } else if (q.x + q.w <= p.x + 0.5 && !(q.y >= p.y + p.h) && !(q.y + q.h <= p.y)) {   // kiri
      const yy = (Math.max(p.y, q.y) + Math.min(p.y + p.h, q.y + q.h)) / 2; d = `M${f2(p.x)} ${f2(yy)}L${f2(q.x + q.w + 1)} ${f2(yy)}`; lx = (p.x + q.x + q.w) / 2; ly = yy - 3; ank = 'middle';
    } else if (q.y >= p.y + p.h - 0.5) {                                                   // bawah
      const xx = !(q.x >= p.x + p.w) && !(q.x + q.w <= p.x) ? (Math.max(p.x, q.x) + Math.min(p.x + p.w, q.x + q.w)) / 2 : null;
      if (xx !== null) { d = `M${f2(xx)} ${f2(p.y + p.h)}L${f2(xx)} ${f2(q.y - 1)}`; lx = xx + 3; ly = (p.y + p.h + q.y) / 2 + 3; }
      else { const ym = (p.y + p.h + q.y) / 2; d = `M${f2(cxp)} ${f2(p.y + p.h)}L${f2(cxp)} ${f2(ym)}L${f2(cxq)} ${f2(ym)}L${f2(cxq)} ${f2(q.y - 1)}`; lx = (cxp + cxq) / 2; ly = ym - 3; ank = 'middle'; }
    } else {                                                                               // atas
      const xx = !(q.x >= p.x + p.w) && !(q.x + q.w <= p.x) ? (Math.max(p.x, q.x) + Math.min(p.x + p.w, q.x + q.w)) / 2 : null;
      if (xx !== null) { d = `M${f2(xx)} ${f2(p.y)}L${f2(xx)} ${f2(q.y + q.h + 1)}`; lx = xx + 3; ly = (p.y + q.y + q.h) / 2 + 3; }
      else { const ym = (p.y + q.y + q.h) / 2; d = `M${f2(cxp)} ${f2(p.y)}L${f2(cxp)} ${f2(ym)}L${f2(cxq)} ${f2(ym)}L${f2(cxq)} ${f2(q.y + q.h + 1)}`; lx = (cxp + cxq) / 2; ly = ym - 3; ank = 'middle'; }
    }
    k.tambah(`<path d="${d}" fill="none" stroke="${gw}" stroke-width="0.9" marker-end="url(#panah)"/>`);
    if (a.label) k.teks(a.lx ?? lx, a.ly ?? ly, a.label, 'anotasi', {anchor: a.anchor || ank, halo: true, grup: `p-${a.dari}-${a.ke}`});
  }
  return selesai(k, spek, {n_kotak: spek.kotak.length});
}

export const GRAFIK = {diagram, batang, horizontal, garis, rentang, bertumpuk, 'matriks-titik': matriksTitik, matriks};
