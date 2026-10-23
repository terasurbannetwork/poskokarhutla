// Peta koroplet dan simbol dari spek JSON -> {svg, manifest}. Batas public/geo, proyeksi ekuirektangular berparalel baku
// di lintang tengah cakupan (distorsi < 1% di 11 LS sampai 6 LU), latar dan laut putih, kelas dari tema.json, legenda wajib,
// label pil tanpa tumpuk (penempatan rakus berkandidat + garis pemandu), simbol sebanding luas, inset, skala batang.
import fs from 'node:fs';
import path from 'node:path';
import {REPO, T, P, L, Kanvas, muat, num, fmt, lebar, ukuran, simbol, aturLegenda, gambarLegenda, tumpang, f2, langkahBagus, NAIK, TURUN} from './dasar.mjs';

export const GEO = {
  provinsi: 'public/geo/provinsi.json', kab: 'public/geo/kabupaten/{p}.json', kode_kab: 'scripts/udara/kota.json',
  nama_prov: 'public/banjir/data/meta.json',
  sumber: 'Batas wilayah public/geo Pantau Bencana (asal belum terdokumentasi)', resmi: false,
  catatan: 'Batas wilayah bukan rujukan resmi', referensi: 'WGS84 geografis',
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

// ---- kelas ----
export const kelasDari = (v, batas) => { let i = 0; while (i < batas.length && v > batas[i]) i++; return i; };   // batas atas inklusif
const IDX = {2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5]};
export function aturKelas(spek, nilai) {
  let batas = spek.batas, label = spek.label, ramp = spek.ramp, idx, judul = spek.judul;
  if (spek.kuantil) {
    const v = nilai.filter(x => x !== null).sort((a, b) => a - b);
    batas = [...new Set(Array.from({length: spek.kuantil - 1}, (_, i) => v[Math.floor(v.length * (i + 1) / spek.kuantil)]))];
  }
  if (spek.skala === 'irbi') {
    const s = T.warna.skala.irbi;
    ({ramp} = s); idx = s.kelas; label ??= s.label; judul ??= s.legenda;
  } else idx = IDX[batas.length + 1];
  if (!idx || idx.length !== batas.length + 1) throw new Error(`kelas: ${batas.length} batas tidak cocok dengan ${spek.skala || ramp}`);
  if (!T.warna.skala[ramp]?.kelas) throw new Error(`ramp ${ramp} tidak ada di tema warna.skala`);
  const d = spek.desimal ?? 0;
  label ??= batas.map((b, i) => i === 0 ? `≤ ${fmt(b, d)}` : `${fmt(batas[i - 1], d)}–${fmt(b, d)}`).concat(`> ${fmt(batas.at(-1), d)}`);
  return {ramp, batas, label, judul, warna: idx.map(i => `skala.${ramp}.${i}`)};
}

// ---- penempatan label tanpa tumpuk ----
const iris = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
function calon(l, d) {
  const {ax, ay, w, h} = l, e = (l.r0 || 0) + d, hw = w / 2, hh = h / 2;
  if (e === 0) return [[ax, ay]];
  return [[ax + e + hw, ay], [ax - e - hw, ay], [ax, ay - e - hh], [ax, ay + e + hh],
    [ax + e + hw, ay - hh], [ax + e + hw, ay + hh], [ax - e - hw, ay - hh], [ax - e - hw, ay + hh],
    [ax - hw * 0.6, ay - e - hh], [ax + hw * 0.6, ay - e - hh], [ax - hw * 0.6, ay + e + hh], [ax + hw * 0.6, ay + e + hh],
    [ax + e * 0.7 + hw, ay - e * 0.7 - hh], [ax - e * 0.7 - hw, ay - e * 0.7 - hh], [ax + e * 0.7 + hw, ay + e * 0.7 + hh], [ax - e * 0.7 - hw, ay + e * 0.7 + hh]];
}
// l: [{id, ax, ay, w, h, r0, wilayah}] -> {pasang: [{l, x, y, w, h, pemandu}], lewat: [id]}
export function tempatkan(lbl, rintang, area, jarak = P.jarak_label_pt, pad = P.jarak_antar_label_pt) {
  const pasang = [], lewat = [];
  const padat = l => lbl.filter(m => m !== l && Math.abs(m.ax - l.ax) < 50 && Math.abs(m.ay - l.ay) < 30).length;
  const urut = [...lbl].sort((a, b) => padat(b) - padat(a) || b.w - a.w);
  for (const l of urut) {
    let pos = null;
    cari: for (const d of jarak) for (const [cx, cy] of calon(l, d)) {
      const b = {x: cx - l.w / 2, y: cy - l.h / 2, w: l.w, h: l.h};
      if (b.x < area.x || b.y < area.y || b.x + b.w > area.x + area.w || b.y + b.h > area.y + area.h) continue;
      if (rintang.some(o => iris(b, o, pad)) || pasang.some(o => iris(b, o, pad))) continue;
      if (lbl.some(m => m !== l && m.ax > b.x - 2 && m.ax < b.x + b.w + 2 && m.ay > b.y - 2 && m.ay < b.y + b.h + 2)) continue;
      pos = b; break cari;
    }
    if (!pos) { lewat.push(l.id); continue; }
    const kena = l.ax >= pos.x && l.ax <= pos.x + pos.w && l.ay >= pos.y && l.ay <= pos.y + pos.h;
    const jauh = Math.hypot(Math.max(pos.x - l.ax, 0, l.ax - pos.x - pos.w), Math.max(pos.y - l.ay, 0, l.ay - pos.y - pos.h));
    pasang.push({l, ...pos, pemandu: l.r0 ? jauh > l.r0 + 3 : !kena});
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

// ---- peta ----
export function peta(spek) {
  const {w: W, h: Hspek, mode} = ukuran(spek);
  const m = P.margin_pt, provs = spek.cakupan === 'nasional' || !spek.cakupan ? null : CAKUPAN[spek.cakupan] || spek.cakupan;
  const tingkat = spek.tingkat || 'kab', ws = wilayah(tingkat, provs), provW = wilayah('provinsi', provs);
  const nasional = !provs, bb = kotakLonLat(provW), padLon = (bb[2] - bb[0]) * 0.015, padLat = (bb[3] - bb[1]) * 0.03;
  const bbox = [bb[0] - padLon, bb[1] - padLat, bb[2] + padLon, bb[3] + padLat];

  // data koroplet
  const kor = spek.koroplet, nilai = new Map();
  if (kor) for (const r of muat(kor.sumber)) nilai.set(String(r[kor.sumber.kunci]).padStart(tingkat === 'kab' ? 4 : 2, '0'), num(r[kor.sumber.nilai]));
  const kls = kor && aturKelas(kor.kelas, ws.map(x => nilai.get(x.kode) ?? null));
  const jumlah = kls ? kls.warna.map(() => 0) : [];
  let tanpa = 0;
  if (kls) for (const x of ws) { const v = nilai.get(x.kode); if (v === null || v === undefined) tanpa++; else jumlah[kelasDari(v, kls.batas)]++; }

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
    butir.push({jenis: 'judul', label: kor.judul_legenda || kls.judul || 'Kelas'});
    kls.warna.forEach((wn, i) => jumlah[i] && butir.push({jenis: 'kotak', warna: wn, label: `${kls.label[i]} (${fmt(jumlah[i])})`, peran: 'skala'}));
    if (tanpa) butir.push({jenis: 'arsir', label: `${kor.tanpa_data_label || T.warna.skala.tanpa_data.label} (${fmt(tanpa)})`});
  }
  for (const t of lapis) {
    butir.push({jenis: 'judul', label: t.judul_legenda || t.nama});
    if (t.maks) {
      const lk = langkahBagus(t.maks, 1), contoh = [...new Set([lk / 10, lk / 2, lk].map(v => +v.toPrecision(2)).filter(v => v <= t.maks * 1.0001 || v === lk))];
      for (const v of contoh.slice(-3)) butir.push({jenis: 'simbol', bentuk: t.bentuk || 'lingkaran', warna: t.warna || P.simbol_di_koroplet, r: rSim(t, Math.min(v, t.maks)), label: fmt(v, t.desimal ?? 0)});
    } else butir.push({jenis: 'simbol', bentuk: t.bentuk || 'lingkaran', warna: t.warna || P.simbol_di_koroplet, r: P.simbol_r_tetap_pt, label: t.label_legenda || t.nama});
  }
  if (spek.sorot?.length) butir.push({jenis: 'garis', warna: L.sorot_prioritas.warna, label: spek.sorot_label || 'Prioritas yang ditetapkan'});
  const tataLeg = aturLegenda(k0, butir, W - 2 * m);
  const hLeg = tataLeg.h, gap = P.jarak_legenda_pt;

  // ukuran peta: dari lebar, atau muat ke tinggi spek
  const hMapMaks = Hspek ? Hspek - 2 * m - gap - hLeg : null;
  const pr = proyeksi(bbox, m, m, W - 2 * m, hMapMaks);
  const hMap = hMapMaks || pr.h, H = Hspek || m + hMap + gap + hLeg + m;
  const k = new Kanvas(W, H, mode), area = {x: m, y: m, w: W - 2 * m, h: hMap};
  k.legenda = [];
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
    const isi = isiDarat || (v === null || v === undefined ? k.arsir() : k.c(kls.warna[kelasDari(v, kls.batas)], 'skala'));
    lap.push(`<path d="${d}" fill="${isi}" stroke="${k.c(L.batas_wilayah.warna, 'batas')}" stroke-width="${L.batas_wilayah.tebal_pt}" stroke-linejoin="round"/>`);
  }
  // batas provinsi (sekaligus garis pantai)
  lap.push(`<path d="${provW.map(x => jalur(x.poli, pr.f, tol)).join('')}" fill="none" stroke="${k.c(L.batas_provinsi.warna, 'batas')}" stroke-width="${L.batas_provinsi.tebal_pt}" stroke-linejoin="round"/>`);
  for (const kode of spek.sorot || []) {
    const x = ws.find(y => y.kode === kode) || provW.find(y => y.kode === kode);
    if (!x) throw new Error(`sorot: kode ${kode} tidak ada di cakupan`);
    lap.push(`<path d="${jalur(x.poli, pr.f, tol)}" fill="none" stroke="${k.c(L.sorot_prioritas.warna, 'sorot')}" stroke-width="${L.sorot_prioritas.tebal_pt}" stroke-linejoin="round"/>`);
  }
  k.tambah(`<g clip-path="url(#klip)">${lap.join('')}</g>`);

  // inset lokasi (peta pulau/provinsi): sudut dengan daratan paling sedikit
  const rintang = [];
  if (provs && spek.inset !== false) {
    const semua = wilayah('provinsi'), wI = area.w * P.inset_lebar_rasio, prI0 = proyeksi(kotakLonLat(semua), 0, 0, wI, null), hI = prI0.h;
    const pojok = [[area.x + area.w - wI - 2, area.y + 2], [area.x + 2, area.y + 2], [area.x + 2, area.y + area.h - hI - 2], [area.x + area.w - wI - 2, area.y + area.h - hI - 2]];
    const pts = ws.flatMap(x => x.poli.flatMap(pol => pol[0].filter((_, i) => i % 7 === 0).map(pr.f)));
    const kena = ([x, y]) => pts.filter(([u, v]) => u >= x - 4 && u <= x + wI + 4 && v >= y - 4 && v <= y + hI + 4).length;
    const [ix, iy] = pojok.reduce((a, b) => kena(b) < kena(a) ? b : a);
    const prI = proyeksi(kotakLonLat(semua), ix, iy, wI, null);
    const dI = semua.map(x => `<path d="${jalur(x.poli, prI.f, 0.5)}" fill="${k.c(provs.includes(x.kode) ? P.warna_inset_fokus : P.warna_inset_darat, 'inset')}"/>`).join('');
    k.tambah(`<rect x="${f2(ix)}" y="${f2(iy)}" width="${f2(wI)}" height="${f2(hI)}" fill="${k.c('kertas', 'latar')}" stroke="${k.c(P.warna_bingkai, 'garis')}" stroke-width="${L.panel.tebal_pt}"/>${dI}`);
    rintang.push({x: ix, y: iy, w: wI, h: hI, jenis: 'inset'});
  }
  // skala batang + arah utara di pojok kanan bawah (peta pulau/provinsi)
  if (spek.skala ?? !nasional) {
    const km = langkahBagus(area.w * P.skala_lebar_rasio / pr.kmPt, 1), wS = km * pr.kmPt, pt = k.gaya('anotasi').ukuran_pt;
    const ws2 = lebar(`${fmt(km)} km`, pt) / 2, x1 = area.x + area.w - ws2 - 2, x0 = x1 - wS, y = area.y + area.h - pt - 6;
    const cs = k.c(P.warna_skala, 'skala');
    k.tambah(`<path d="M${f2(x0)} ${f2(y - 2.5)}V${f2(y)}H${f2(x1)}V${f2(y - 2.5)}M${f2((x0 + x1) / 2)} ${f2(y - 1.5)}V${f2(y)}" fill="none" stroke="${cs}" stroke-width="0.75"/>`);
    k.teks(x0, y + pt + 1, '0', 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    k.teks(x1, y + pt + 1, `${fmt(km)} km`, 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    const u = P.utara_pt, ux = x1, uy = y - 9 - u;
    k.tambah(`<path d="M${f2(ux)} ${f2(uy)}L${f2(ux + u * 0.32)} ${f2(uy + u)}L${f2(ux)} ${f2(uy + u * 0.72)}L${f2(ux - u * 0.32)} ${f2(uy + u)}Z" fill="${cs}"/>`);
    k.teks(ux, uy - 2, 'U', 'anotasi', {anchor: 'middle', jenis: 'skala', grup: 'skala'});
    rintang.push({x: x0 - 4, y: uy - 2 - pt, w: x1 - x0 + 2 * ws2 + 4, h: y + pt + 3 - (uy - 2 - pt), jenis: 'skala', grup: 'skala'});
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

  // label: provinsi (nama), wilayah teratas (nama nilai), titik teratas (nama)
  const pt = k.gaya('label_peta').ukuran_pt, hPil = pt * P.pil_tinggi_rasio, lbl = [];
  const lebarPil = s => lebar(s, pt) + 2 * P.pil_isi_pt;
  if (spek.label?.provinsi) for (const x of provW) {
    if (Array.isArray(spek.label.provinsi) && !spek.label.provinsi.includes(x.kode)) continue;
    const [ax, ay] = jangkar(x.poli, pr.f);
    if (ax < area.x || ax > area.x + area.w || ay < area.y || ay > area.y + area.h) continue;
    lbl.push({id: x.kode, teks: x.nama, ax, ay, w: lebarPil(x.nama), h: hPil, r0: 0});
  }
  if (spek.label?.wilayah_teratas && kor) {
    const d = spek.label.desimal ?? kor.kelas.desimal ?? 0;
    for (const x of ws.filter(y => nilai.get(y.kode) != null).sort((a, b) => nilai.get(b.kode) - nilai.get(a.kode)).slice(0, spek.label.wilayah_teratas)) {
      const [ax, ay] = jangkar(x.poli, pr.f), s = `${x.nama} ${fmt(nilai.get(x.kode), d)}`;
      lbl.push({id: x.kode, teks: s, ax, ay, w: lebarPil(s), h: hPil, r0: 0});
    }
  }
  for (const t of lapis.filter(t => t.label && t.label_teratas)) {
    for (const s of sim.filter(q => q.t === t && q.v !== null).sort((a, b) => b.v - a.v).slice(0, t.label_teratas))
      lbl.push({id: `${t.nama}:${s.nama}`, teks: s.nama, ax: s.x, ay: s.y, w: lebarPil(s.nama), h: hPil, r0: s.s + 1});
  }
  const {pasang, lewat} = tempatkan(lbl, rintang, area);
  const cp = k.c(P.warna_pemandu, 'pemandu');
  for (const p of pasang) if (p.pemandu) {
    const bx = Math.max(p.x, Math.min(p.l.ax, p.x + p.w)), by = Math.max(p.y, Math.min(p.l.ay, p.y + p.h));
    k.tambah(`<line x1="${f2(p.l.ax)}" y1="${f2(p.l.ay)}" x2="${f2(bx)}" y2="${f2(by)}" stroke="${cp}" stroke-width="${P.pemandu_pt}"/>`
      + (p.l.r0 ? '' : `<circle cx="${f2(p.l.ax)}" cy="${f2(p.l.ay)}" r="${P.titik_pemandu_pt}" fill="${cp}"/>`));
  }
  for (const p of pasang) k.pil(p.x, p.y, p.l.teks, {grup: `lbl-${p.l.id}`, h: hPil});

  gambarLegenda(k, tataLeg, m, m + hMap + gap, W - 2 * m);
  const man = k.manifest({
    jenis: 'peta', pesan: spek.pesan, cakupan: spek.cakupan || 'nasional', tingkat,
    kelas: kls && {ramp: kls.ramp, batas: kls.batas, label: kls.label, warna: kls.warna, jumlah, tanpa_data: tanpa},
    unsur_peta: {sumber_batas: GEO.sumber, sistem_referensi: GEO.referensi, proyeksi: `Ekuirektangular, paralel baku ${fmt(pr.latc, 1)} derajat`,
      inset: !!provs && spek.inset !== false, skala_batang: !!(spek.skala ?? !nasional), catatan: GEO.resmi ? null : GEO.catatan},
    label_diminta: lbl.length, label_terlewat: lewat, simbol: sim.length, simbol_digeser: pindah.length, putaran_geser: putaran,
  });
  man.tumpang = tumpang(man.kotak);
  return {svg: k.svg(), manifest: man};
}
