// Peta koroplet dan simbol dari spek JSON -> {svg, manifest}. Batas public/geo, proyeksi ekuirektangular berparalel baku
// di lintang tengah cakupan (distorsi < 1% di 11 LS sampai 6 LU), latar dan laut putih, kelas dari tema.json, legenda wajib,
// label pil tanpa tumpuk (penempatan rakus berkandidat + garis pemandu), simbol sebanding luas, inset, skala batang,
// baris kaki unsur peta (catatan batas tidak resmi, sumber batas, sistem referensi, proyeksi).
import fs from 'node:fs';
import path from 'node:path';
import {REPO, T, P, L, Kanvas, muat, num, fmt, lebar, ukuran, simbol, aturLegenda, gambarLegenda, tumpang, f2, langkahBagus, NAIK, TURUN} from './dasar.mjs';

// berkas lintas modul (README): batas dari public/geo, kode kab dari scripts/udara, nama provinsi dari public/banjir
export const GEO = {
  provinsi: 'public/geo/provinsi.json', kab: 'public/geo/kabupaten/{p}.json', kode_kab: 'scripts/udara/kota.json',
  nama_prov: 'public/banjir/data/meta.json',
  sumber: 'Batas wilayah public/geo Pantau Bencana (asal belum terdokumentasi)', sumber_kaki: 'Pantau Bencana, asal belum terdokumentasi',
  resmi: false, catatan: 'Batas wilayah bukan rujukan resmi', referensi: 'WGS84 geografis',
};
const ALIAS = {'75|Pahuwato': 'Pohuwato'};   // ejaan ganda di peta, sama dengan bangun/irbi.py
export const CAKUPAN = {jawa: ['31', '32', '33', '34', '35', '36']};
const cache = {};
const baca = rel => cache[rel] ??= JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
const poligon = g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
export const namaProv = k => baca(GEO.nama_prov).provinsi[k];
const semuaProv = () => baca(GEO.provinsi).features.map(f => f.properties.kode);

export function wilayah(tingkat, provs) {
  if (tingkat === 'provinsi') return baca(GEO.provinsi).features.filter(f => !provs || provs.includes(f.properties.kode))
    .map(f => ({kode: f.properties.kode, nama: namaProv(f.properties.kode), prov: f.properties.kode, poli: poligon(f.geometry)}));
  const kk = baca(GEO.kode_kab), i = Object.fromEntries(kk.kolom.map((c, j) => [c, j]));
  const kode = new Map(kk.baris.map(b => [`${b[i.prov]}|${b[i.kab]}`, b[i.kode]])), per = new Map();
  for (const p of provs || semuaProv()) for (const f of baca(GEO.kab.replace('{p}', p)).features) {
    const nm = ALIAS[`${p}|${f.properties.kab}`] || f.properties.kab, k = kode.get(`${p}|${nm}`);
    if (!k) throw new Error(`kab "${nm}" (${p}) tidak punya kode di ${GEO.kode_kab}`);
    if (!per.has(k)) per.set(k, {kode: k, nama: nm, prov: p, poli: []});
    per.get(k).poli.push(...poligon(f.geometry));
  }
  return [...per.values()];
}

// ---- geometri ----
const luas = pts => pts.reduce((s, [x, y], i) => { const [u, v] = pts[(i + 1) % pts.length]; return s + x * v - u * y; }, 0) / 2;
const dalam = (pts, x, y) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// titik dalam poligon terbesar: pusat massa bila di dalam, selain itu tengah ruas terlebar pada garis datar pusat massa
function jangkar(poli, f) {
  let best = null, ba = 0;
  for (const pol of poli) { const pts = pol[0].map(f), a = Math.abs(luas(pts)); if (a > ba) { ba = a; best = pts; } }
  let A = 0, cx = 0, cy = 0;
  best.forEach(([x, y], i) => { const [u, v] = best[(i + 1) % best.length], q = x * v - u * y; A += q; cx += (x + u) * q; cy += (y + v) * q; });
  cx /= 3 * A; cy /= 3 * A;
  if (dalam(best, cx, cy)) return [cx, cy];
  const xs = [];
  for (let i = 0, j = best.length - 1; i < best.length; j = i++) {
    const [xi, yi] = best[i], [xj, yj] = best[j];
    if ((yi > cy) !== (yj > cy)) xs.push((xj - xi) * (cy - yi) / (yj - yi) + xi);
  }
  xs.sort((a, b) => a - b);
  let m = [cx, cy], lb = 0;
  for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > lb) { lb = xs[i + 1] - xs[i]; m = [(xs[i] + xs[i + 1]) / 2, cy]; }
  return m;
}
function jalur(poli, f, tol) {   // proyeksi + buang titik lebih dekat dari tol pt (penyederhanaan jarak radial)
  let d = '';
  for (const pol of poli) for (const ring of pol) {
    const pts = [];
    for (const c of ring) { const p = f(c), q = pts[pts.length - 1]; if (!q || Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= tol) pts.push(p); }
    if (pts.length >= 3) d += 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  }
  return d;
}
const kotakLonLat = ws => {
  const b = [180, 90, -180, -90];
  for (const w of ws) for (const pol of w.poli) for (const [x, y] of pol[0]) { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); }
  return b;
};
export function proyeksi([a, b, c, d], x0, y0, wA, hA) {
  const latc = (b + d) / 2, kx = Math.cos(latc * Math.PI / 180);
  const s = Math.min(wA / ((c - a) * kx), hA ? hA / (d - b) : Infinity);
  const ox = x0 + (wA - (c - a) * kx * s) / 2, oy = y0 + (hA ? (hA - (d - b) * s) / 2 : 0);
  return {s, latc, h: (d - b) * s, kmPt: s / 111.32, f: ([lon, lat]) => [ox + (lon - a) * kx * s, oy + (d - lat) * s]};
}
// titik uji kotak terhadap daratan (dipakai label laut dan skala batang)
export const titikUji = (b, nx = 8, ny = 5) => Array.from({length: nx * ny}, (_, i) => [b.x + (i % nx + 0.5) / nx * b.w, b.y + (Math.floor(i / nx) + 0.5) / ny * b.h]);

// ---- kelas ----
export const kelasDari = (v, batas) => { let i = 0; while (i < batas.length && v > batas[i]) i++; return i; };   // batas atas inklusif
export const kelasNilai = (kls, v) => {
  if (!kls.kategori) return kelasDari(v, kls.batas);
  const i = kls.label.indexOf(v);
  if (i < 0) throw new Error(`kelas "${v}" tidak ada di ${kls.label.join(', ')}`);
  return i;
};
const IDX = {2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5]};
// spek: {skala: 'irbi', kolom} kelas resmi dari data (irbi.py) | {ramp, batas, rumus} | {ramp, kuantil}; asal = berkas data
export function aturKelas(spek, nilai, asal = '') {
  const irbi = spek.skala === 'irbi' || /irbi/i.test(asal), d = spek.desimal ?? 0;
  let batas = spek.batas, label = spek.label, ramp = spek.ramp, idx, judul = spek.judul, rumus = spek.rumus;
  if (spek.skala === 'irbi') {
    // kelas resmi: kolom kelas dari keluaran irbi.py, nama dan warna dari tema (T8); ambang tidak diketik di spek
    const s = T.warna.skala.irbi;
    if (!spek.kolom || spek.batas) throw new Error('skala irbi: kelas dibaca dari kolom data (mis. kelas_total irbi.py), bukan batas ketikan');
    if ((spek.label || spek.judul) && !spek.alasan) throw new Error('skala irbi: nama kelas dan judul legenda dari tema.json (Kelas IRBI BNPB); menimpa butuh alasan');
    const ada = new Set(nilai.filter(v => v !== null));
    for (const v of ada) if (!s.label.includes(v)) throw new Error(`skala irbi: kelas "${v}" di data bukan ${s.label.join('/')}`);
    const pakai = s.label.map((l, i) => [l, s.kelas[i]]).filter(([l]) => ada.has(l));
    return {ramp: s.ramp, batas: null, kategori: true, resmi: true, label: pakai.map(x => x[0]), judul: s.legenda,
      warna: pakai.map(x => `skala.${s.ramp}.${x[1]}`), rumus: `kelas resmi dari kolom ${spek.kolom}`};
  }
  if (spek.kuantil) {
    const v = nilai.filter(x => x !== null).sort((a, b) => a - b);
    batas = [...new Set(Array.from({length: spek.kuantil - 1}, (_, i) => +v[Math.floor(v.length * (i + 1) / spek.kuantil)].toFixed(d)))];
    rumus ??= `${{4: 'kuartil', 5: 'kuintil'}[spek.kuantil] || `kuantil ${spek.kuantil}`} dari ${fmt(v.length)} nilai, batas atas inklusif`;
  }
  if (irbi && ramp !== 'api') throw new Error(`data IRBI memakai ramp ${ramp}; kelas IRBI wajib ramp api (KEPUTUSAN T8, PEDOMAN B1.4)`);
  if (irbi && !rumus) throw new Error('batas kelas IRBI per bahaya tanpa rumus tertulis (PEDOMAN C6.3; data/irbi/README: tidak ada ambang per bahaya di sumber); pakai kuantil atau isi kelas.rumus');
  idx = IDX[batas.length + 1];
  if (!idx) throw new Error(`kelas: ${batas.length} batas tidak cocok dengan ramp ${ramp} (2 sampai 5 kelas)`);
  if (!T.warna.skala[ramp]?.kelas) throw new Error(`ramp ${ramp} tidak ada di tema warna.skala`);
  label ??= batas.map((b, i) => i === 0 ? `≤ ${fmt(b, d)}` : `${fmt(batas[i - 1], d)}–${fmt(b, d)}`).concat(`> ${fmt(batas.at(-1), d)}`);
  return {ramp, batas, label, judul, rumus, kategori: false, resmi: false, warna: idx.map(i => `skala.${ramp}.${i}`)};
}
// label tanpa data: tema "Belum terdata"; menimpa butuh alasan (PEDOMAN B1.4)
export function labelTanpaData(o) {
  if (o.tanpa_data_label && o.tanpa_data_label !== T.warna.skala.tanpa_data.label && !o.alasan_tanpa_data)
    throw new Error(`label tanpa data "${o.tanpa_data_label}": pakai "${T.warna.skala.tanpa_data.label}" (PEDOMAN B1.4) atau tulis alasan_tanpa_data`);
  return o.tanpa_data_label || T.warna.skala.tanpa_data.label;
}

// ---- penempatan label tanpa tumpuk ----
const iris = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
function calon(l, d) {
  const {ax, ay, w, h} = l, e = (l.r0 || 0) + d, hw = w / 2, hh = h / 2;
  if (e === 0) return [0, -0.45, 0.45, -0.85, 0.85].flatMap(fx => [0, -0.8, 0.8].map(fy => [ax + fx * hw, ay + fy * hh]));
  // kanan/kiri bergeser tegak, atas/bawah bergeser mendatar (supaya tingkat luar gugus padat bisa menyebar), lalu diagonal
  const ys = [0, -1, 1, -2, 2].map(f => ay + f * h), xs = [0, -0.6, 0.6, -1.2, 1.2, -2, 2].map(f => ax + f * hw);
  return [...ys.map(y => [ax + e + hw, y]), ...ys.map(y => [ax - e - hw, y]), ...xs.map(x => [x, ay - e - hh]), ...xs.map(x => [x, ay + e + hh]),
    [ax + e * 0.7 + hw, ay - e * 0.7 - hh], [ax - e * 0.7 - hw, ay - e * 0.7 - hh], [ax + e * 0.7 + hw, ay + e * 0.7 + hh], [ax - e * 0.7 - hw, ay + e * 0.7 + hh]];
}
// ruas memotong kotak (Liang-Barsky)
function potong([x1, y1, x2, y2], b) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - b.x], [dx, b.x + b.w - x1], [-dy, y1 - b.y], [dy, b.y + b.h - y1]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; t0 = Math.max(t0, t); } else { if (t < t0) return false; t1 = Math.min(t1, t); }
  }
  return t1 - t0 > 1e-6;
}
const kecil = (b, e) => ({x: b.x + e, y: b.y + e, w: b.w - 2 * e, h: b.h - 2 * e});
const arah3 = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
function silang([a1, a2, a3, a4], [b1, b2, b3, b4]) {   // dua garis pemandu berpotongan sejati
  const p = [a1, a2], q = [a3, a4], r = [b1, b2], s = [b3, b4];
  return arah3(p, q, r) * arah3(p, q, s) < 0 && arah3(r, s, p) * arah3(r, s, q) < 0;
}
// garis pemandu: dari jangkar ke titik kotak terdekat, bila kotak tidak memuat jangkar (wilayah) atau jauh dari simbol (titik)
function pemandu(l, b) {
  const kena = l.ax >= b.x && l.ax <= b.x + b.w && l.ay >= b.y && l.ay <= b.y + b.h;
  const px = Math.max(b.x, Math.min(l.ax, b.x + b.w)), py = Math.max(b.y, Math.min(l.ay, b.y + b.h));
  const perlu = l.r0 ? Math.hypot(px - l.ax, py - l.ay) > l.r0 + 3 : !kena;
  return perlu ? [l.ax, l.ay, px, py] : null;
}
// l: [{id, ax, ay, w, h, r0, laut}] -> {pasang: [{l, x, y, w, h, pemandu}], lewat: [id]}
// fase: laut (kotak tidak menyentuh daratan, bila diminta), dalam (di wilayah sendiri), bebas (cincin makin jauh)
export function tempatkan(lbl, rintang, area, darat = null, jarak = P.jarak_label_pt, pad = P.jarak_antar_label_pt) {
  const pasang = [], lewat = [], aj = P.jarak_jangkar_lain_pt;   // ruang di sekitar jangkar label lain
  const kenaDarat = b => darat && [0.04, 0.27, 0.5, 0.73, 0.96].some(fx => [0.1, 0.5, 0.9].some(fy => darat(b.x + fx * b.w, b.y + fy * b.h)));
  const padat = l => lbl.filter(m => m !== l && Math.abs(m.ax - l.ax) < 50 && Math.abs(m.ay - l.ay) < 30).length;
  const urut = [...lbl].sort((a, b) => padat(b) - padat(a) || b.w - a.w);
  for (const l of urut) {
    let pos = null;
    const fasa = l.laut && darat ? [['laut', P.jarak_laut_dekat_pt], ['dalam', 0], ['laut', P.jarak_laut_maks_pt], ['bebas', Infinity]] : [['bebas', Infinity]];
    // semua kandidat diurutkan menurut jarak nyata jangkar ke kotak: yang terdekat dan sah dipakai
    const semua = jarak.flatMap(d => calon(l, d)).map(([cx, cy]) => {
      const b = {x: cx - l.w / 2, y: cy - l.h / 2, w: l.w, h: l.h};
      return {b, jauh: Math.hypot(Math.max(b.x - l.ax, 0, l.ax - b.x - b.w), Math.max(b.y - l.ay, 0, l.ay - b.y - b.h))};
    }).sort((a, z) => a.jauh - z.jauh);
    for (const [fase, dMaks] of fasa) {
      for (const {b, jauh} of semua) {
        if (jauh > dMaks + (l.r0 || 0)) break;
        if (b.x < area.x || b.y < area.y || b.x + b.w > area.x + area.w || b.y + b.h > area.y + area.h) continue;
        if (rintang.some(o => iris(b, o, pad)) || pasang.some(o => iris(b, o, pad))) continue;
        if (lbl.some(m => m !== l && m.ax > b.x - aj && m.ax < b.x + b.w + aj && m.ay > b.y - aj && m.ay < b.y + b.h + aj)) continue;
        if (fase === 'laut' && kenaDarat(b)) continue;
        const ruas = pemandu(l, b);   // pemandu tidak memotong label lain, label baru tidak memotong pemandu lama
        if (ruas && pasang.some(o => potong(ruas, kecil(o, 0.5)))) continue;
        if (ruas && rintang.some(o => !(l.ax >= o.x && l.ax <= o.x + o.w && l.ay >= o.y && l.ay <= o.y + o.h) && potong(ruas, kecil(o, 0.3)))) continue;
        if (pasang.some(o => o.pemandu && potong(o.pemandu, kecil(b, -0.5)))) continue;
        if (ruas && pasang.some(o => o.pemandu && silang(ruas, o.pemandu))) continue;
        pos = {...b, pemandu: ruas}; break;
      }
      if (pos) break;
    }
    if (pos) pasang.push({l, ...pos}); else lewat.push(l.id);
  }
  return {pasang, lewat};
}
// simbol bertumpuk digeser sepanjang sumbu tembus terkecil sampai kotaknya lepas (pemandu ke titik asli)
export function geser(sim, pad = 0.8, putaran = 200) {
  for (let t = 0; t < putaran; t++) {
    let gerak = false;
    for (let i = 0; i < sim.length; i++) for (let j = i + 1; j < sim.length; j++) {
      const a = sim[i], b = sim[j], dx = b.x - a.x, dy = b.y - a.y;
      const ox = a.s + b.s + pad - Math.abs(dx), oy = a.s + b.s + pad - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      gerak = true;
      if (ox < oy) { const m = (ox / 2 + 0.05) * (dx > 0 || (dx === 0 && i < j) ? 1 : -1); a.x -= m; b.x += m; }
      else { const m = (oy / 2 + 0.05) * (dy > 0 || (dy === 0 && i < j) ? 1 : -1); a.y -= m; b.y += m; }
    }
    if (!gerak) return t;
  }
  return putaran;
}
// pecah teks ke baris selebar w (kata utuh)
function bungkus(k, s, peran, w) {
  const baris = [''];
  for (const kata of s.split(' ')) {
    const coba = baris.at(-1) ? `${baris.at(-1)} ${kata}` : kata;
    if (baris.at(-1) && k.ukurTeks(coba, peran) > w) baris.push(kata); else baris[baris.length - 1] = coba;
  }
  return baris;
}

// ---- peta ----
export function peta(spek) {
  const {w: W, h: Hspek, mode} = ukuran(spek);
  const m = P.margin_pt, provs = spek.cakupan === 'nasional' || !spek.cakupan ? null : CAKUPAN[spek.cakupan] || spek.cakupan;
  const tingkat = spek.tingkat || 'kab', ws = wilayah(tingkat, provs), provW = wilayah('provinsi', provs);
  const nasional = !provs, bb = kotakLonLat(provW), padLon = (bb[2] - bb[0]) * 0.015, padLat = (bb[3] - bb[1]) * 0.03;
  const bbox = [bb[0] - padLon, bb[1] - padLat, bb[2] + padLon, bb[3] + padLat];

  // data koroplet: angka (kelas berbatas atau kuantil) atau kelas kategorikal dari kolom data (kelas resmi)
  const kor = spek.koroplet, nilai = new Map(), angka = new Map();
  if (kor) for (const r of muat(kor.sumber)) {
    const kunci = String(r[kor.sumber.kunci]).padStart(tingkat === 'kab' ? 4 : 2, '0');
    if (kor.sumber.nilai) angka.set(kunci, num(r[kor.sumber.nilai]));
    nilai.set(kunci, kor.kelas.kolom ? (r[kor.kelas.kolom] || null) : num(r[kor.sumber.nilai]));
  }
  const kls = kor && aturKelas(kor.kelas, ws.map(x => nilai.get(x.kode) ?? null), kor.sumber.berkas);
  if (kls?.resmi && kor.judul_legenda && kor.judul_legenda !== kls.judul && !kor.alasan_legenda)
    throw new Error(`judul legenda kelas IRBI "${kor.judul_legenda}": tema meminta "${kls.judul}"; menimpa butuh alasan_legenda`);
  const jumlah = kls ? kls.warna.map(() => 0) : [];
  let tanpa = 0;
  if (kls) for (const x of ws) { const v = nilai.get(x.kode); if (v === null || v === undefined) tanpa++; else jumlah[kelasNilai(kls, v)]++; }

  // lapisan titik
  const lapis = (spek.titik || []).map(t => {
    const baris = muat(t.sumber).filter(r => num(r.lon) !== null && num(r.lat) !== null);
    const vs = t.nilai ? baris.map(r => num(r[t.nilai])).filter(v => v !== null) : [];
    return {...t, baris, maks: vs.length ? Math.max(...vs) : null};
  });
  const rSim = (t, v) => t.maks && v !== null ? Math.max(P.simbol_r_min_pt, P.simbol_r_maks_pt * Math.sqrt(v / t.maks)) : P.simbol_r_tetap_pt;

  // legenda (diukur dulu supaya tinggi peta diketahui)
  const k0 = new Kanvas(W, 100, mode), butir = [];
  if (kls) {
    butir.push({jenis: 'judul', label: kls.resmi ? kls.judul : kor.judul_legenda || kls.judul || 'Kelas'});
    kls.warna.forEach((wn, i) => jumlah[i] && butir.push({jenis: 'kotak', warna: wn, label: `${kls.label[i]} (${fmt(jumlah[i])})`}));
    if (tanpa) butir.push({jenis: 'arsir', label: `${labelTanpaData(kor)} (${fmt(tanpa)})`});
  }
  for (const t of lapis) {
    butir.push({jenis: 'judul', label: t.judul_legenda || t.nama});
    if (t.maks) {
      const p = 10 ** Math.floor(Math.log10(t.maks)), top = Math.floor(t.maks / p) * p;
      for (const v of [...new Set([top / 10, top / 3, top].map(x => +x.toPrecision(1)))])
        butir.push({jenis: 'simbol', bentuk: t.bentuk || 'lingkaran', warna: t.warna || P.simbol_di_koroplet, r: rSim(t, v), label: fmt(v, t.desimal ?? 0)});
    } else butir.push({jenis: 'simbol', bentuk: t.bentuk || 'lingkaran', warna: t.warna || P.simbol_di_koroplet, r: P.simbol_r_tetap_pt, label: t.label_legenda || t.nama});
  }
  if (spek.sorot?.length) butir.push({jenis: 'garis', warna: L.sorot_prioritas.warna, label: spek.sorot_label || 'Prioritas yang ditetapkan'});
  const tataLeg = aturLegenda(k0, butir, W - 2 * m);
  const hLeg = tataLeg.h, gap = P.jarak_legenda_pt;

  // ukuran peta: dari lebar, atau muat ke tinggi spek; baris kaki unsur peta di bawah legenda
  const pr0 = proyeksi(bbox, m, m, W - 2 * m, null), latc = pr0.latc;
  const proy = `ekuirektangular, paralel baku ${fmt(Math.abs(latc), 1)}° ${latc < 0 ? 'LS' : 'LU'}`;
  const kaki = `${GEO.resmi ? '' : GEO.catatan + '. '}Sumber batas: ${GEO.sumber_kaki}; ${GEO.referensi}; proyeksi ${proy}.`;
  const barisKaki = bungkus(k0, kaki, 'kaki', W - 2 * m), ptKaki = k0.gaya('kaki').ukuran_pt, hKaki = barisKaki.length * ptKaki * 1.2 + 3;
  const hMapMaks = Hspek ? Hspek - 2 * m - gap - hLeg - hKaki : null;
  const pr = hMapMaks ? proyeksi(bbox, m, m, W - 2 * m, hMapMaks) : pr0;
  const hMap = hMapMaks || pr.h, H = Hspek || m + hMap + gap + hLeg + hKaki + m;
  const k = new Kanvas(W, H, mode), area = {x: m, y: m, w: W - 2 * m, h: hMap};
  k.def('klip', `<clipPath id="klip"><rect x="${f2(area.x)}" y="${f2(area.y)}" width="${f2(area.w)}" height="${f2(area.h)}"/></clipPath>`);
  const tol = P.sederhana_pt, lap = [];

  // daratan di luar cakupan: putih bergaris batas (PEDOMAN B1.4)
  if (provs) {
    const luar = wilayah('provinsi').filter(x => !provs.includes(x.kode)).map(x => jalur(x.poli, pr.f, tol)).join('');
    lap.push(`<path d="${luar}" fill="${k.c(P.warna_luar, 'luar-cakupan')}" stroke="${k.c(L.pantai.warna, 'batas')}" stroke-width="${L.pantai.tebal_pt}"/>`);
  }
  // koroplet atau daratan netral
  const isiDarat = spek.daratan === 'netral' || !kls ? k.c(P.daratan_netral, 'daratan-netral') : null;
  for (const x of ws) {
    const v = nilai.get(x.kode), d = jalur(x.poli, pr.f, tol);
    if (!d) continue;
    const isi = isiDarat || (v === null || v === undefined ? k.arsir() : k.c(kls.warna[kelasNilai(kls, v)], 'skala'));
    lap.push(`<path d="${d}" fill="${isi}" fill-rule="evenodd" stroke="${k.c(L.batas_wilayah.warna, 'batas')}" stroke-width="${nasional && tingkat === 'kab' ? P.batas_wilayah_nasional_pt : L.batas_wilayah.tebal_pt}" stroke-linejoin="round"/>`);
  }
  // batas provinsi (sekaligus garis pantai)
  lap.push(`<path d="${provW.map(x => jalur(x.poli, pr.f, tol)).join('')}" fill="none" stroke="${k.c(L.batas_provinsi.warna, 'batas')}" stroke-width="${L.batas_provinsi.tebal_pt}" stroke-linejoin="round"/>`);
  for (const kode of spek.sorot || []) {
    const x = ws.find(y => y.kode === kode) || provW.find(y => y.kode === kode);
    if (!x) throw new Error(`sorot: kode ${kode} tidak ada di cakupan`);
    lap.push(`<path d="${jalur(x.poli, pr.f, tol)}" fill="none" stroke="${k.c(L.sorot_prioritas.warna, 'sorot')}" stroke-width="${L.sorot_prioritas.tebal_pt}" stroke-linejoin="round"/>`);
  }
  k.tambah(`<g clip-path="url(#klip)">${lap.join('')}</g>`);

  // daratan terproyeksi (cakupan + luar cakupan) untuk uji label laut dan skala batang
  const cincin = (provs ? wilayah('provinsi') : provW).flatMap(x => x.poli.map(pol => pol[0].map(pr.f)))
    .map(pts => ({pts, b: pts.reduce((a, [x, y]) => [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)], [1e9, 1e9, -1e9, -1e9])}));
  const darat = (x, y) => cincin.some(c => x >= c.b[0] && x <= c.b[2] && y >= c.b[1] && y <= c.b[3] && dalam(c.pts, x, y));

  // inset lokasi (peta pulau/provinsi): sudut dengan daratan paling sedikit
  const rintang = [];
  let kotakInset = null;
  if (provs && spek.inset !== false) {
    const semua = wilayah('provinsi'), wI = area.w * P.inset_lebar_rasio, prI0 = proyeksi(kotakLonLat(semua), 0, 0, wI, null), hI = prI0.h;
    const pojok = [[area.x + area.w - wI - 2, area.y + 2], [area.x + 2, area.y + 2], [area.x + 2, area.y + area.h - hI - 2], [area.x + area.w - wI - 2, area.y + area.h - hI - 2]];
    const pts = ws.flatMap(x => x.poli.flatMap(pol => pol[0].filter((_, i) => i % 7 === 0).map(pr.f)));
    const kena = ([x, y]) => pts.filter(([u, v]) => u >= x - 4 && u <= x + wI + 4 && v >= y - 4 && v <= y + hI + 4).length;
    const [ix, iy] = pojok.reduce((a, b) => kena(b) < kena(a) ? b : a);
    const prI = proyeksi(kotakLonLat(semua), ix, iy, wI, null);
    const dI = semua.map(x => `<path d="${jalur(x.poli, prI.f, 0.5)}" fill="${k.c(provs.includes(x.kode) ? P.warna_inset_fokus : P.warna_inset_darat, 'inset')}"/>`).join('');
    k.tambah(`<rect x="${f2(ix)}" y="${f2(iy)}" width="${f2(wI)}" height="${f2(hI)}" fill="${k.c('kertas', 'latar')}" stroke="${k.c(P.warna_bingkai, 'garis')}" stroke-width="${L.panel.tebal_pt}"/>${dI}`);
    kotakInset = {x: ix, y: iy, w: wI, h: hI, jenis: 'inset'};
    rintang.push(kotakInset);
  }
  // skala batang + arah utara (peta pulau/provinsi): pojok kanan bawah bila lepas dari daratan, selain itu pojok lain
  // yang paling sedikit menyentuh daratan; bila semua menyentuh, beralas putih bergaris
  let skalaKena = 0, skalaAlas = false, skalaPojok = null;
  if (spek.skala ?? !nasional) {
    const km = langkahBagus(area.w * P.skala_lebar_rasio / pr.kmPt, 1), wS = km * pr.kmPt, pt = k.gaya('anotasi').ukuran_pt, u = P.utara_pt;
    const ws2 = lebar(`${fmt(km)} km`, pt) / 2, wBox = 4 + wS + 2 * ws2, hBox = 2 * pt + u + 14;
    const pojok = {'kanan bawah': [area.x + area.w - wBox - 2, area.y + area.h - hBox - 3], 'kiri bawah': [area.x + 2, area.y + area.h - hBox - 3],
      'kanan atas': [area.x + area.w - wBox - 2, area.y + 2], 'kiri atas': [area.x + 2, area.y + 2]};
    const calonS = Object.entries(pojok).map(([nama, [x, y]]) => ({nama, b: {x, y, w: wBox, h: hBox}}))
      .filter(c => !kotakInset || !iris(c.b, kotakInset, 2)).map(c => ({...c, kena: titikUji(c.b).filter(([x, y]) => darat(x, y)).length}));
    const pilih = calonS.find(c => c.kena === 0) || calonS.reduce((a, c) => c.kena < a.kena ? c : a);
    ({kena: skalaKena, nama: skalaPojok} = pilih);
    skalaAlas = skalaKena > 0;
    const {x: bx, y: by} = pilih.b, x0 = bx + 4, x1 = x0 + wS, y = by + pt + 11 + u, cs = k.c(P.warna_skala, 'skala-batang');
    if (skalaAlas) k.tambah(`<rect x="${f2(bx - 1)}" y="${f2(by - 1)}" width="${f2(wBox + 2)}" height="${f2(hBox + 2)}" rx="2" fill="${k.c('kertas', 'latar')}" stroke="${k.c(P.warna_bingkai, 'garis')}" stroke-width="0.5"/>`);
    k.tambah(`<path d="M${f2(x0)} ${f2(y - 2.5)}V${f2(y)}H${f2(x1)}V${f2(y - 2.5)}M${f2((x0 + x1) / 2)} ${f2(y - 1.5)}V${f2(y)}" fill="none" stroke="${cs}" stroke-width="0.75"/>`);
    k.teks(x0, y + pt + 1, '0', 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    k.teks(x1, y + pt + 1, `${fmt(km)} km`, 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    const ux = x1, uy = y - 9 - u;
    k.tambah(`<path d="M${f2(ux)} ${f2(uy)}L${f2(ux + u * 0.32)} ${f2(uy + u)}L${f2(ux)} ${f2(uy + u * 0.72)}L${f2(ux - u * 0.32)} ${f2(uy + u)}Z" fill="${cs}"/>`);
    k.teks(ux, uy - 2, 'U', 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    rintang.push({...pilih.b, jenis: 'skala', grup: 'skala'});
  }

  // simbol: dari besar ke kecil (yang kecil di atas), digeser bila bertumpuk
  const sim = [];
  for (const t of lapis) for (const r of t.baris) {
    const v = t.nilai ? num(r[t.nilai]) : null, rr = rSim(t, v), [x, y] = pr.f([+r.lon, +r.lat]);
    const s = simbol(t.bentuk || 'lingkaran', 0, 0, rr).s;
    sim.push({t, r, v, rr, x, y, x0: x, y0: y, s, nama: t.label ? r[t.label] : t.nama});
  }
  sim.sort((a, b) => b.rr - a.rr);
  const putaran = geser(sim);
  const pindah = sim.filter(s => Math.hypot(s.x - s.x0, s.y - s.y0) > 0.5);
  for (const s of pindah) {
    const cp = k.c(P.warna_pemandu, 'pemandu');
    k.tambah(`<line x1="${f2(s.x0)}" y1="${f2(s.y0)}" x2="${f2(s.x)}" y2="${f2(s.y)}" stroke="${cp}" stroke-width="${P.pemandu_pt}"/><circle cx="${f2(s.x0)}" cy="${f2(s.y0)}" r="${P.titik_pemandu_pt}" fill="${cp}"/>`);
  }
  sim.forEach((s, i) => {
    const g = simbol(s.t.bentuk || 'lingkaran', s.x, s.y, s.rr);
    k.tambah(`${g.d} fill="${k.c(s.t.warna || P.simbol_di_koroplet, 'simbol')}" stroke="${k.c(P.simbol_garis, 'garis')}" stroke-width="${P.simbol_garis_pt}"/>`);
    const kt = {x: s.x - s.s, y: s.y - s.s, w: 2 * s.s, h: 2 * s.s, jenis: 'simbol', grup: `sim${i}`, teks: s.nama};
    k.kotak.push(kt); rintang.push(kt);
  });

  // label: provinsi (nama; daftar, semua, atau n teratas menurut data), wilayah teratas (nama nilai), titik teratas (nama)
  const pt = k.gaya('label_peta').ukuran_pt, hPil = pt * P.pil_tinggi_rasio, lbl = [];
  const lebarPil = s => lebar(s, pt) + 2 * P.pil_isi_pt;
  let provLabel = spek.label?.provinsi, teratas = null;
  if (spek.label?.provinsi_teratas) {
    const o = spek.label.provinsi_teratas;
    teratas = muat(o.sumber).map(r => [String(r[o.kunci]).padStart(2, '0'), num(r[o.nilai])]).filter(([, v]) => v !== null)
      .sort((a, b) => b[1] - a[1]).slice(0, o.n).map(([kd]) => kd);
    provLabel = teratas;
  }
  if (provLabel) for (const x of provW) {
    if (Array.isArray(provLabel) && !provLabel.includes(x.kode)) continue;
    const [ax, ay] = jangkar(x.poli, pr.f);
    if (ax < area.x || ax > area.x + area.w || ay < area.y || ay > area.y + area.h) continue;
    lbl.push({id: x.kode, teks: x.nama, ax, ay, w: lebarPil(x.nama), h: hPil, r0: 0});
  }
  if (spek.label?.wilayah_teratas && kor) {
    const d = spek.label.desimal ?? kor.kelas.desimal ?? 0;
    for (const x of ws.filter(y => angka.get(y.kode) != null).sort((a, b) => angka.get(b.kode) - angka.get(a.kode)).slice(0, spek.label.wilayah_teratas)) {
      const [ax, ay] = jangkar(x.poli, pr.f), s = `${x.nama} ${fmt(angka.get(x.kode), d)}`;
      lbl.push({id: x.kode, teks: s, ax, ay, w: lebarPil(s), h: hPil, r0: 0});
    }
  }
  for (const t of lapis.filter(t => t.label && t.label_teratas)) {
    for (const s of sim.filter(q => q.t === t && q.v !== null).sort((a, b) => b.v - a.v).slice(0, t.label_teratas))
      lbl.push({id: `${t.nama}:${s.nama}`, teks: s.nama, ax: s.x, ay: s.y, w: lebarPil(s.nama), h: hPil, r0: s.s + 1});
  }
  const laut = spek.label?.laut ?? nasional;
  for (const l of lbl) if (!l.r0) l.laut = laut;
  const {pasang, lewat} = tempatkan(lbl, rintang, area, darat);
  const cp = k.c(P.warna_pemandu, 'pemandu');
  for (const p of pasang) if (p.pemandu) {
    const [x1, y1, x2, y2] = p.pemandu;
    k.tambah(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${cp}" stroke-width="${P.pemandu_pt}"/>`
      + (p.l.r0 ? '' : `<circle cx="${f2(p.l.ax)}" cy="${f2(p.l.ay)}" r="${P.titik_pemandu_pt}" fill="${cp}"/>`));
  }
  for (const p of pasang) k.pil(p.x, p.y, p.l.teks, {grup: `lbl-${p.l.id}`, h: hPil});

  gambarLegenda(k, tataLeg, m, m + hMap + gap, W - 2 * m);
  const yKaki = m + hMap + gap + hLeg + 3;
  barisKaki.forEach((s, i) => k.teks(m, yKaki + NAIK * ptKaki + i * ptKaki * 1.2, s, 'kaki', {grup: 'kaki'}));
  const man = k.manifest({
    jenis: 'peta', pesan: spek.pesan, alasan: spek.alasan, besaran: spek.besaran, cakupan: spek.cakupan || 'nasional', tingkat,
    kelas: kls && {ramp: kls.ramp, batas: kls.batas, label: kls.label, warna: kls.warna, rumus: kls.rumus, resmi: kls.resmi, jumlah, tanpa_data: tanpa},
    unsur_peta: {sumber_batas: GEO.sumber, sistem_referensi: GEO.referensi, proyeksi: proy, resmi: GEO.resmi, catatan: GEO.resmi ? null : GEO.catatan,
      inset: !!kotakInset, skala_batang: !!(spek.skala ?? !nasional), skala_pojok: skalaPojok, skala_kena_darat: skalaKena, skala_alas: skalaAlas,
      label_laut: false},
    label_diminta: lbl.length, label_terlewat: lewat, provinsi_teratas: teratas, simbol: sim.length, simbol_digeser: pindah.length, putaran_geser: putaran,
  });
  return {svg: k.svg(), manifest: man, token: {rumus_kelas: kls?.rumus, ambang_kelas: kls?.batas?.map(b => fmt(b, kor.kelas.desimal ?? 0)).join(', ')}};
}
