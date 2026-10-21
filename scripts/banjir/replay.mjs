/* replay.mjs: precompute replay banjir (spec docs/multi-bencana/REPLAY-BANJIR.md). Node stdlib saja.
   Memuat public/banjir/sim_genangan.js dan sim_lahan.js lewat vm (tanpa salinan mesin) dengan dua shim kecil
   (createImageBitmap, OffscreenCanvas) supaya ambilDEM versi peramban jalan apa adanya di Node.
   Pakai:  node scripts/banjir/replay.mjs          jalan penuh (butuh jaringan, cache di data/raw/banjir/replay)
           node scripts/banjir/replay.mjs uji      swa-uji tanpa jaringan
   Keluaran: public/banjir/data/replay/<id>.json, <id>.bin.gz (kedalaman + peta per sel), <id>_cari.json */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import assert from "node:assert/strict";
import {fileURLToPath, pathToFileURL} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE = path.join(AKAR, "data/raw/banjir/replay");
const KELUAR = path.join(AKAR, "public/banjir/data/replay");
const UA = "pantau-bencana-replay/1 (riset banjir; github poskokarhutla)";

/* ---------- PNG (8-bit, tak berinterlace): gray, RGB, palet, gray-alpha, RGBA -> RGBA ---------- */
export function bukaPNG(buf) {
  const TTD = [137, 80, 78, 71, 13, 10, 26, 10]; TTD.every((v, i) => buf[i] === v) || galat("bukan PNG");
  let p = 8, w = 0, h = 0, depth = 0, tipe = 0, inter = 0, palet = null, trns = null; const idat = [];
  while (p + 8 <= buf.length) {
    const n = buf.readUInt32BE(p), nama = buf.toString("latin1", p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + n); p += 12 + n;
    if (nama === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); depth = d[8]; tipe = d[9]; inter = d[12]; }
    else if (nama === "PLTE") palet = d; else if (nama === "tRNS") trns = d; else if (nama === "IDAT") idat.push(d); else if (nama === "IEND") break;
  }
  (depth === 8 && !inter) || galat(`PNG depth ${depth} interlace ${inter} tidak didukung`);
  const ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[tipe]; ch || galat(`tipe warna PNG ${tipe}`);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * ch, px = new Uint8Array(w * h * ch);
  (raw.length === h * (st + 1)) || galat("ukuran data PNG tak cocok");
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], s = y * (st + 1) + 1, o = y * st;
    for (let x = 0; x < st; x++) {
      const a = x >= ch ? px[o + x - ch] : 0, b = y ? px[o - st + x] : 0, c = x >= ch && y ? px[o - st + x - ch] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) galat(`filter PNG ${f}`);
      px[o + x] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (tipe === 6) { data.set(px.subarray(i * 4, i * 4 + 4), o); }
    else if (tipe === 2) { data[o] = px[i * 3]; data[o + 1] = px[i * 3 + 1]; data[o + 2] = px[i * 3 + 2]; data[o + 3] = 255; }
    else if (tipe === 0) { data[o] = data[o + 1] = data[o + 2] = px[i]; data[o + 3] = 255; }
    else if (tipe === 4) { data[o] = data[o + 1] = data[o + 2] = px[i * 2]; data[o + 3] = px[i * 2 + 1]; }
    else { const k = px[i]; palet || galat("palet PNG hilang"); data[o] = palet[k * 3]; data[o + 1] = palet[k * 3 + 1]; data[o + 2] = palet[k * 3 + 2]; data[o + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return {w, h, data};
}
function galat(m) { throw new Error("replay: " + m); }

/* ---------- MVT (protobuf Mapbox Vector Tile) ---------- */
class Baca {
  constructor(b, p = 0, akhir = b.length) { this.b = b; this.p = p; this.e = akhir; }
  get ada() { return this.p < this.e; }
  v() { let r = 0, m = 1, c; do { c = this.b[this.p++]; r += (c & 127) * m; m *= 128; } while (c & 128); return r; }
  blok() { const n = this.v(), s = this.p; this.p += n; return [s, s + n]; }
  lewati(tipe) { if (tipe === 0) this.v(); else if (tipe === 1) this.p += 8; else if (tipe === 2) this.blok(); else if (tipe === 5) this.p += 4; else galat(`tipe protobuf ${tipe}`); }
}
const zz = n => (n >> 1) ^ -(n & 1);
function bacaNilai(b, [s, e]) {
  const r = new Baca(b, s, e); let hasil = null;
  while (r.ada) { const t = r.v(), f = t >> 3, ty = t & 7;
    if (f === 1) { const [a, c] = r.blok(); hasil = b.toString("utf8", a, c); }
    else if (f === 2) { hasil = b.readFloatLE(r.p); r.p += 4; } else if (f === 3) { hasil = b.readDoubleLE(r.p); r.p += 8; }
    else if (f === 4 || f === 5) hasil = r.v(); else if (f === 6) { const x = r.v(); hasil = x % 2 ? -(x + 1) / 2 : x / 2; } else if (f === 7) hasil = !!r.v(); else r.lewati(ty); }
  return hasil;
}
/* lapisan = Set nama yang diminta; kembali {nama: {extent, fitur: [{tipe, tag, geom}]}}; geom tipe 1 = [[x,y]...], 2/3 = [ring...] */
export function bukaMVT(buf, lapisan) {
  const out = {}, r = new Baca(buf);
  while (r.ada) { const t = r.v(), f = t >> 3, ty = t & 7; if (f !== 3 || ty !== 2) { r.lewati(ty); continue; }
    const [s, e] = r.blok(), L = new Baca(buf, s, e); let nama = "", extent = 4096; const keys = [], vals = [], fit = [];
    while (L.ada) { const t2 = L.v(), f2 = t2 >> 3, ty2 = t2 & 7;
      if (f2 === 1) { const [a, c] = L.blok(); nama = buf.toString("utf8", a, c); }
      else if (f2 === 2) fit.push(L.blok()); else if (f2 === 3) { const [a, c] = L.blok(); keys.push(buf.toString("utf8", a, c)); }
      else if (f2 === 4) vals.push(L.blok()); else if (f2 === 5) extent = L.v(); else L.lewati(ty2); }
    if (lapisan && !lapisan.has(nama)) continue;
    out[nama] = {extent, fitur: fit.map(([a, c]) => { const F = new Baca(buf, a, c); let tipe = 0, tags = [], geo = null;
      while (F.ada) { const t3 = F.v(), f3 = t3 >> 3, ty3 = t3 & 7;
        if (f3 === 3) tipe = F.v(); else if (f3 === 2 || f3 === 4) { const [x, y] = F.blok(), R = new Baca(buf, x, y), a2 = []; while (R.ada) a2.push(R.v()); if (f3 === 2) tags = a2; else geo = a2; } else F.lewati(ty3); }
      const tag = {}; for (let i = 0; i + 1 < tags.length; i += 2) tag[keys[tags[i]]] = bacaNilai(buf, vals[tags[i + 1]]);
      return {tipe, tag, geom: geometri(tipe, geo || [])}; })};
  }
  return out;
}
function geometri(tipe, g) {
  let x = 0, y = 0, i = 0, cur = null; const hasil = [];
  while (i < g.length) { const c = g[i++], cmd = c & 7, n = c >> 3;
    if (cmd === 7) { cur && cur.length && hasil.push(cur) && (cur = null); continue; }
    for (let q = 0; q < n; q++) { x += zz(g[i++]); y += zz(g[i++]);
      if (cmd === 1) { if (tipe === 1) hasil.push([x, y]); else { cur && cur.length && hasil.push(cur); cur = [[x, y]]; } } else cur.push([x, y]); } }
  if (tipe !== 1 && cur && cur.length) hasil.push(cur);
  return hasil;
}
/* titik berat cincin (rumus luas bertanda); cincin tipis jatuh ke rata-rata simpul. Kembali [cx, cy, luasBertanda] */
export function titikBerat(r) {
  let a = 0, cx = 0, cy = 0; const n = r.length;
  for (let i = 0; i < n; i++) { const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % n], k = x0 * y1 - x1 * y0; a += k; cx += (x0 + x1) * k; cy += (y0 + y1) * k; }
  if (Math.abs(a) < 1e-9) return [r.reduce((s, p) => s + p[0], 0) / n, r.reduce((s, p) => s + p[1], 0) / n, 0];
  return [cx / (3 * a), cy / (3 * a), a / 2];
}

/* ---------- hidrograf DAS terkumpul: SCS-CN + hidrograf satuan segitiga SCS (Tp = D/2 + 0,6 Tc, Tb = 2,67 Tp) ----------
   ef = limpasan efektif mm per jam (SCS-CN kumulatif dari mesin). Debit rata-rata jam [t, t+1) dalam m3/s; volume per mm = 1000 A m3
   (A km2) terbagi menurut CDF segitiga, jadi jumlah volume = limpasan persis (selama ekor tercakup). */
export function hidrografDAS(ef, A, tc, dasar = 0, D = 1, panjang = ef.length) {
  const Tp = D / 2 + .6 * tc, Tb = 2.67 * Tp, Fk = t => t <= 0 ? 0 : t >= Tb ? 1 : t <= Tp ? t * t / (Tp * Tb) : 1 - (Tb - t) ** 2 / (Tb * (Tb - Tp));
  const q = new Float64Array(panjang).fill(dasar);
  for (let i = 0; i < ef.length; i++) { if (!ef[i]) continue; const v = ef[i] * 1000 * A / 3600;
    for (let t = i; t < panjang && t - i < Tb; t++) q[t] += v * (Fk(t + 1 - i) - Fk(t - i)); }
  return {q, Tp, Tb, qp: 2 / (Tb * 3600) * 1000 * A};
}

/* ---------- biner: bagian bertipe berurutan, rata 4 byte, little-endian ---------- */
const TIPE = {Int16: Int16Array, Uint8: Uint8Array, Uint16: Uint16Array, Uint32: Uint32Array};
export function kemasBiner(bagian) {
  let off = 0; const tabel = [];
  for (const [nama, tipe, arr] of bagian) { const T = TIPE[tipe]; T || galat(`tipe biner ${tipe}`); tabel.push({nama, tipe, offset: off, jumlah: arr.length}); off += Math.ceil(arr.length * T.BYTES_PER_ELEMENT / 4) * 4; }
  const buf = Buffer.alloc(off);
  bagian.forEach(([, tipe, arr], i) => { const T = TIPE[tipe]; Buffer.from(new T(arr).buffer).copy(buf, tabel[i].offset); });
  return {buf, tabel};
}
export function bongkarBiner(buf, tabel) {
  const o = {}; for (const t of tabel) { const T = TIPE[t.tipe], n = t.jumlah * T.BYTES_PER_ELEMENT; o[t.nama] = new T(buf.buffer.slice(buf.byteOffset + t.offset, buf.byteOffset + t.offset + n)); } return o;
}

/* ---------- jaringan + cache ---------- */
let antri = 0; const tunggu = [];
const lepas = () => { antri--; tunggu.shift()?.(); };
async function giliran() { if (antri >= 8) await new Promise(r => tunggu.push(r)); antri++; }
async function unduh(url, opsi = {}) {
  for (let k = 0; ; k++) {
    await giliran();
    try { const r = await fetch(url, {headers: {"User-Agent": UA}, signal: AbortSignal.timeout(60000), ...opsi}); if (r.status === 404 || r.status === 204) return null;
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }
    catch (e) { if (k >= 4) throw new Error(`${url}: ${e.message}`); await new Promise(r => setTimeout(r, 1500 * (k + 1))); }
    finally { lepas(); }
  }
}
/* satu berkas cache per url; 404 dicatat sebagai berkas .kosong */
async function ambilCache(url, nama) {
  const f = path.join(CACHE, nama); fs.mkdirSync(path.dirname(f), {recursive: true});
  if (fs.existsSync(f)) return fs.readFileSync(f); if (fs.existsSync(f + ".kosong")) return null;
  const b = await unduh(url); if (!b) { fs.writeFileSync(f + ".kosong", ""); return null; } fs.writeFileSync(f, b); return b;
}

/* ---------- mesin dimuat lewat vm + shim ---------- */
export function muatMesin() {
  const ctx = vm.createContext({});
  ctx.createImageBitmap = async blob => bukaPNG(Buffer.from(blob));
  ctx.OffscreenCanvas = class { constructor(w, h) { this.w = w; this.h = h; }
    getContext() { const s = this; return {drawImage(bm) { s.bm = bm; }, getImageData() { return {data: s.bm.data}; }}; } };
  for (const f of ["sim_genangan.js", "sim_lahan.js"]) vm.runInContext(fs.readFileSync(path.join(AKAR, "public/banjir", f), "utf8"), ctx, {filename: f});
  return {SG: ctx.SimGenangan, SL: ctx.SimLahan};
}
const ambilDEMUbin = async url => { const m = url.match(/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/), b = await ambilCache(url, `dem/${m[1]}/${m[2]}_${m[3]}.png`);
  return b ? {ok: true, status: 200, blob: async () => b} : {ok: false, status: 404}; };

/* ---------- ERA5 Open-Meteo ---------- */
const SISI = 0.25, kisiTitik = (a, b) => { const o = []; for (let v = Math.ceil(a / SISI - 1e-9) * SISI; v <= b + 1e-9; v += SISI) o.push(+v.toFixed(4)); return o; };
/* titik ERA5 (kelipatan 0,25) yang sel 0,25-nya menyentuh kotak; bobot = luas irisan relatif */
export function bobotEra5(lat, lon) {
  const w = []; let tot = 0;
  for (const la of kisiTitik(lat[0] - SISI / 2, lat[1] + SISI / 2)) for (const lo of kisiTitik(lon[0] - SISI / 2, lon[1] + SISI / 2)) {
    const a = Math.max(0, Math.min(lat[1], la + SISI / 2) - Math.max(lat[0], la - SISI / 2)) * Math.max(0, Math.min(lon[1], lo + SISI / 2) - Math.max(lon[0], lo - SISI / 2));
    if (a > 1e-12) { w.push({lat: la, lon: lo, w: a}); tot += a; } }
  w.forEach(x => x.w /= tot); return w;
}
async function hujanEra5(titik, awal, akhir) {
  const kunci = titik.map(t => `${t.lat},${t.lon}`), nama = `era5_${awal}_${akhir}_${kunci.join("_").replace(/[^0-9,_.-]/g, "")}`.slice(0, 180) + ".json";
  const f = path.join(CACHE, nama); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const u = `https://archive-api.open-meteo.com/v1/archive?latitude=${titik.map(t => t.lat).join(",")}&longitude=${titik.map(t => t.lon).join(",")}&start_date=${awal}&end_date=${akhir}&hourly=precipitation&timezone=Asia%2FJakarta&models=era5`;
  const b = await unduh(u); b || galat("ERA5 kosong"); let j = JSON.parse(b.toString()); if (!Array.isArray(j)) j = [j];
  const o = {}; j.forEach((x, i) => { Math.abs(x.latitude - titik[i].lat) < .01 && Math.abs(x.longitude - titik[i].lon) < .01 || galat(`ERA5 titik ${i} bergeser: ${x.latitude},${x.longitude}`);
    o[kunci[i]] = x.hourly.precipitation.map(v => v ?? 0); o.waktu = x.hourly.time; });
  fs.mkdirSync(CACHE, {recursive: true}); fs.writeFileSync(f, JSON.stringify(o)); return o;
}
const arealEra5 = (E, bobot, mult = () => 1) => { const n = E.waktu.length, o = new Float64Array(n); for (const b of bobot) { const s = E[`${b.lat},${b.lon}`]; s || galat(`titik ERA5 ${b.lat},${b.lon} tak ada`); const m = mult(b); for (let t = 0; t < n; t++) o[t] += s[t] * b.w * m; } return o; };
const keSelEra5 = v => +(Math.round(v / SISI) * SISI).toFixed(4);
/* kalibrasi DAS ke puncak dilaporkan: cari (tc, cn) yang meminimalkan galat relatif puncak dan galat waktu puncak. Ini KALIBRASI ke laporan, bukan prediksi.
   hd = hujan DAS mm/jam (seluruh deret), pre = indeks jam 0 replay, sasaran {puncak_m3s|null, s (indeks jam puncak), lebar_jam}, bebas = ["tc_jam","cn"] */
export function kalibrasiDAS(limpasanFn, hd, A, dasar, pre, J, sasaran, bebas, awal) {
  const tcs = bebas.includes("tc_jam") ? Array.from({length: 77}, (_, i) => 2 + i * .5) : [awal.tc_jam], cns = bebas.includes("cn") ? Array.from({length: 17}, (_, i) => 60 + i * 2) : [awal.cn]; let best = null;
  for (const cn of cns) { const ef = limpasanFn(hd, cn).efektif; for (const tc of tcs) { const q = hidrografDAS(ef, A, tc, dasar, 1, hd.length + 120).q; let pk = -1, ip = 0;
      for (let t = pre; t <= pre + J; t++) if (q[t] > pk) { pk = q[t]; ip = t - pre; }
      const g = (sasaran.puncak_m3s ? ((pk - sasaran.puncak_m3s) / sasaran.puncak_m3s) ** 2 : 0) + ((ip - sasaran.s) / sasaran.lebar_jam) ** 2;
      if (!best || g < best.galat) best = {tc_jam: tc, cn, galat: g, puncak_m3s: pk, jam_puncak: ip}; } }
  return best;
}
/* pengali IDW (1/d^2) dari stasiun terhadap satu titik acuan */
export function pengaliDi(stasiun, lat, lon) {
  let sw = 0, sp = 0; for (const s of stasiun) { const d2 = (s.lat - lat) ** 2 + (s.lon - lon) ** 2 + 1e-4; sw += 1 / d2; sp += s.pengali / d2; } return sp / sw;
}

/* ---------- gedung + pencarian dari OpenFreeMap z14 ---------- */
const ZB = 14;
async function urlUbinVektor() { const f = path.join(CACHE, "openfreemap_tilejson.json"); let j;
  if (fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < 7 * 864e5) j = JSON.parse(fs.readFileSync(f, "utf8"));
  else { j = JSON.parse((await unduh("https://tiles.openfreemap.org/planet")).toString()); fs.writeFileSync(f, JSON.stringify({tiles: j.tiles})); }
  return j.tiles[0]; }
const HAPUS_KELAS = new Set(["service", "track", "path", "pedestrian", "raceway"]);
export function agregatVektor(tiles, K, SG) {
  const {nx, ny} = K, N = nx * ny, gedung = new Uint16Array(N), f = 2 ** (K.zoom - ZB) * 256, jalan = new Map(), tempat = [];
  const sel = (tx, ty, x, y, ext) => { const X = (tx + x / ext) * f, Y = (ty + y / ext) * f; return [(X - K.x0) / K.s, (Y - K.y0) / K.s]; };
  const lonlat = (i, j) => SG.dariSel(K, i - .5, j - .5); /* sel pecahan -> lon,lat (dariSel memakai pusat sel i+.5) */
  for (const {tx, ty, d} of tiles) {
    const B = d.building; if (B) for (const ft of B.fitur) { if (ft.tipe !== 3 || !ft.geom.length) continue; const tanda = Math.sign(titikBerat(ft.geom[0])[2]);
      for (const r of ft.geom) { const [cx, cy, a] = titikBerat(r); if (Math.sign(a) !== tanda || cx < 0 || cy < 0 || cx >= B.extent || cy >= B.extent) continue;
        const [fi, fj] = sel(tx, ty, cx, cy, B.extent), i = Math.floor(fi), j = Math.floor(fj); if (i >= 0 && j >= 0 && i < nx && j < ny && gedung[j * nx + i] < 65535) gedung[j * nx + i]++; } }
    const T = d.transportation_name; if (T) for (const ft of T.fitur) { const nm = ft.tag.name; if (!nm || ft.tipe !== 2 || HAPUS_KELAS.has(ft.tag.class)) continue;
      const g = ft.geom.reduce((m, r) => r.length > m.length ? r : m, []); if (!g.length) continue; const [x, y] = g[g.length >> 1]; if (x < 0 || y < 0 || x >= T.extent || y >= T.extent) continue;
      const [fi, fj] = sel(tx, ty, x, y, T.extent); if (fi < 0 || fj < 0 || fi >= nx || fj >= ny) continue;
      const kk = `${nm}|${Math.floor(fi / 25)}|${Math.floor(fj / 25)}`, e = jalan.get(kk); /* gugus 25 sel = 1,5 km */
      if (e) { e.n++; e.i += fi; e.j += fj; } else jalan.set(kk, {nm, kelas: ft.tag.class || "", n: 1, i: fi, j: fj}); }
    const P = d.place; if (P) for (const ft of P.fitur) { const nm = ft.tag.name; if (!nm || ft.tipe !== 1 || !ft.geom.length) continue; const [x, y] = ft.geom[0];
      if (x < 0 || y < 0 || x >= P.extent || y >= P.extent) continue; const [fi, fj] = sel(tx, ty, x, y, P.extent); if (fi < 0 || fj < 0 || fi >= nx || fj >= ny) continue;
      tempat.push({nm, kelas: ft.tag.class || "", i: fi, j: fj}); }
  }
  const KEL = new Set(["suburb", "quarter", "neighbourhood", "village"]), KOTA = new Set(["town", "city"]);
  const dekat = (i, j, set, maks) => { let b = null, bd = maks * maks; for (const p of tempat) if (set.has(p.kelas)) { const d = (p.i - i) ** 2 + (p.j - j) ** 2; if (d < bd) { bd = d; b = p; } } return b ? b.nm : ""; };
  const rb = v => +v.toFixed(5), baris = [];
  for (const p of tempat) { const [lo, la] = lonlat(p.i, p.j); baris.push([p.nm, "tempat", p.kelas, rb(lo), rb(la), KEL.has(p.kelas) ? p.nm : dekat(p.i, p.j, KEL, 50), dekat(p.i, p.j, KOTA, 250)]); }
  for (const e of jalan.values()) { const i = e.i / e.n, j = e.j / e.n, [lo, la] = lonlat(i, j); baris.push([e.nm, "jalan", e.kelas, rb(lo), rb(la), dekat(i, j, KEL, 50), dekat(i, j, KOTA, 250)]); }
  baris.sort((a, b) => a[0].localeCompare(b[0], "id"));
  return {gedung, baris, nTempat: tempat.length, nJalan: jalan.size};
}

/* ---------- hitung utama ---------- */
const sum = (a, d, b) => { let s = 0; for (let t = d; t < b; t++) s += a[t]; return s; };
const mn = a => { let m = Infinity; for (const v of a) if (v < m) m = v; return m; }, mx = a => { let m = -Infinity; for (const v of a) if (v > m) m = v; return m; };
const WIB = 7 * 3600e3, fmt = (t, d = 1) => (+t).toFixed(d);
const tglWIB = ms => new Date(ms + WIB).toISOString().slice(0, 10);
async function bacaPNGLahan(url) { const m = url.match(/item=([^&]+).*|tiles\/WebMercatorQuad\/(\d+)\/(\d+)\/(\d+)/), z = url.match(/WebMercatorQuad\/(\d+)\/(\d+)\/(\d+)\.png/), it = url.match(/item=([^&]+)/)[1];
  void m; const b = await ambilCache(url, `lahan/${it}_${z[1]}_${z[2]}_${z[3]}.png`); return b ? bukaPNG(b).data : null; }

export async function hitung(kej, log = console.log) {
  const t0 = Date.now(), {SG, SL} = muatMesin(), J = kej.jam, pre = kej.sebelum_jam, jam0 = Date.parse(kej.mulai);
  const lap = {}, asumsi = {};
  /* 1 kisi + DEM */
  const kk = kej.kisi, K0 = SG.rencanaKisi(kk.lat, kk.lon, kk.sisi_m, kk.n);
  const dem = await SG.ambilDEM(kk.lat, kk.lon, kk.sisi_m, kk.n, ambilDEMUbin), {nx, ny} = dem, N = nx * ny, K = {...dem}; delete K.z;
  const [[w0, n0], , [e0, s0]] = K.sudut; log(`kisi ${nx}x${ny} dx ${fmt(K.dx)} m, zoom ${K.zoom}, bujur ${fmt(w0, 4)} sampai ${fmt(e0, 4)}, lintang ${fmt(n0, 4)} sampai ${fmt(s0, 4)}`);
  const tempat = (lat, lon) => { const [fi, fj] = SG.keSel(K, lon, lat), i = Math.round(fi), j = Math.round(fj); return {i, j, dalam: i >= 0 && j >= 0 && i < nx && j < ny, k: j * nx + i}; };
  const cek = [...kej.area, ...kej.titik_pantau].map(a => ({nama: a.nama, ...tempat(a.lat, a.lon)}));
  const luar = cek.filter(c => !c.dalam); if (luar.length) galat("di luar kisi: " + luar.map(c => c.nama).join(", "));
  const siap = SG.siapkanArea(dem, null), z = siap.z, laut = siap.laut;
  log(`DEM: ${fmt(mn(dem.z))} sampai ${fmt(mx(dem.z))} m, sel laut ${siap.nLaut}, sel didangkalkan ${siap.isi}`);
  /* 2 lahan */
  let cn, manning; const sumber = {dem: "Terrarium AWS (SRTM 30 m) lewat SimGenangan.ambilDEM", lahan: ""};
  try { const L = await SL.kisiLahan(K, bacaPNGLahan, {cn: 80, n: .06});
    if (!L) throw new Error("kisiLahan menyerah (ubin gagal atau data kurang)");
    cn = L.cn; manning = L.n; sumber.lahan = `ESA WorldCover 2021 (Planetary Computer), ${L.ubin} ubin, sel tanpa data ${L.kosong}, gagal ${L.gagal}`; lap.lahan = {proporsi: Object.fromEntries(Object.entries(L.proporsi).map(([k, v]) => [k, +v.toFixed(4)])), kosong: L.kosong, gagal: L.gagal};
    log(`lahan: ${sumber.lahan}; terbangun ${fmt((L.proporsi[50] || 0) * 100)} %`); }
  catch (e) { cn = new Float32Array(N).fill(80); manning = .06; sumber.lahan = `SERAGAM CN 80, n 0,06: lahan gagal (${e.message})`; lap.lahan = {gagal: e.message}; log("LAHAN GAGAL: " + e.message); }
  /* 3 hujan */
  const awal = tglWIB(jam0 - pre * 3600e3), akhir = tglWIB(jam0 + (J - 1) * 3600e3), nTot = pre + J, t00 = jam0 - pre * 3600e3;
  const DAS = kej.sungai.map(s => ({...s, bobot: bobotEra5(s.das.bbox_hujan.lat, s.das.bbox_hujan.lon)}));
  const bobotKisi = bobotEra5([Math.min(n0, s0), Math.max(n0, s0)], [w0, e0]);
  const pakai = kej.stasiun.filter(x => x.dipakai !== false), sCell = new Map();
  for (const x of pakai) { const la = keSelEra5(x.lat), lo = keSelEra5(x.lon), kc = `${la},${lo}`; if (!sCell.has(kc)) sCell.set(kc, {lat: la, lon: lo, stasiun: [], alat_mm: 0, era5_mm: 0}); }
  const semua = new Map(); for (const b of [...bobotKisi, ...DAS.flatMap(d => d.bobot), ...sCell.values()]) semua.set(`${b.lat},${b.lon}`, {lat: b.lat, lon: b.lon});
  const E = await hujanEra5([...semua.values()], awal, akhir); E.waktu.length === nTot || galat(`ERA5 ${E.waktu.length} jam != ${nTot}`);
  E.waktu[pre] === "2025-03-02T00:00" || galat("jam awal ERA5 " + E.waktu[pre]);
  /* satu pengali per sel ERA5 = jumlah alat ukur / jumlah ERA5 sel itu pada jendela alat masing-masing */
  for (const x of pakai) { const c = sCell.get(`${keSelEra5(x.lat)},${keSelEra5(x.lon)}`), a0 = Math.round((Date.parse(x.mulai) - t00) / 3600e3), a1 = Math.round((Date.parse(x.akhir) - t00) / 3600e3);
    (a0 >= 0 && a1 <= nTot && a1 > a0) || galat(`jendela stasiun ${x.nama} di luar deret ERA5`);
    c.stasiun.push(x.nama); c.alat_mm += x.mm; c.era5_mm += sum(E[`${c.lat},${c.lon}`], a0, a1); }
  const pCell = [...sCell.values()].map(c => ({...c, alat_mm: +c.alat_mm.toFixed(1), era5_mm: +c.era5_mm.toFixed(1), pengali: c.era5_mm > 0 ? c.alat_mm / c.era5_mm : 1}));
  const pMap = new Map(pCell.map(c => [`${c.lat},${c.lon}`, c.pengali])), mult = b => pMap.get(`${b.lat},${b.lon}`) ?? pengaliDi(pCell, b.lat, b.lon);
  pCell.forEach(c => log(`pengali sel ERA5 ${c.lat},${c.lon}: alat ${c.alat_mm} mm / ERA5 ${c.era5_mm} mm = ${fmt(c.pengali, 2)} (${c.stasiun.join(", ")})`));
  const erKisi = arealEra5(E, bobotKisi), hujan = arealEra5(E, bobotKisi, mult);
  lap.pengali_sel = pCell.map(c => ({...c, pengali: +c.pengali.toFixed(3)}));
  lap.hujan = {era5_area_mm: +sum(erKisi, pre, nTot).toFixed(1), area_mm: +sum(hujan, pre, nTot).toFixed(1), titik_era5: bobotKisi.map(b => ({lat: b.lat, lon: b.lon, w: +b.w.toFixed(3), pengali: +mult(b).toFixed(3)}))};
  const pKisi = lap.hujan.area_mm / lap.hujan.era5_area_mm; lap.hujan.pengali_area = +pKisi.toFixed(3);
  log(`hujan kisi 96 jam: ERA5 ${lap.hujan.era5_area_mm} mm, sesudah pengali ${lap.hujan.area_mm} mm (efektif x${fmt(pKisi, 2)})`);
  const a7 = sum(hujan, pre - 168, pre), amc = kej.amc ?? SG.kelasAMC(a7); lap.amc = {kelas: amc, a7_mm: +a7.toFixed(1)};
  const hj = hujan.slice(pre, pre + J), darat = Uint8Array.from(laut, v => v ? 0 : 1), L = SG.limpasanSel(hj, cn, amc, darat);
  log(`AMC ${amc} (a7 ${fmt(a7)} mm), CN rata-rata ${fmt(L.cn)}, limpasan efektif ${fmt(sum(L.efektif, 0, J))} mm`); lap.limpasan_efektif_mm = +sum(L.efektif, 0, J).toFixed(1);
  /* 4 sungai */
  const masuk = [], sungaiOut = {};
  for (const d of DAS) {
    const er = arealEra5(E, d.bobot), hd = arealEra5(E, d.bobot, mult), pg = sum(hd, pre, nTot) / Math.max(1e-9, sum(er, pre, nTot)), lf = (h, cn) => SG.limpasan(h, cn, amc);
    let par = {tc_jam: d.das.tc_jam, cn: d.das.cn}, kal = null;
    if (d.das.kalibrasi) { const kb = d.das.kalibrasi, sasaran = {puncak_m3s: kb.puncak_m3s, s: Math.round((Date.parse(kb.jam_puncak_wib + ":00+07:00") - jam0) / 3600e3), lebar_jam: kb.lebar_jam ?? 3};
      kal = kalibrasiDAS(lf, hd, d.das.luas_km2, d.das.aliran_dasar_m3s, pre, J, sasaran, kb.bebas, par); par = {tc_jam: kal.tc_jam, cn: kal.cn};
      kal = {sasaran, bebas: kb.bebas, awal: {tc_jam: d.das.tc_jam, cn: d.das.cn}, hasil: par, puncak_hasil_m3s: +kal.puncak_m3s.toFixed(1), jam_puncak_hasil: kal.jam_puncak, sumber: kb.sumber, catatan: "dikalibrasi ke laporan, bukan prediksi bebas"}; }
    const lim = lf(hd, par.cn), h = hidrografDAS(lim.efektif, d.das.luas_km2, par.tc_jam, d.das.aliran_dasar_m3s, 1, nTot + 120), q = h.q.slice(pre, pre + J + 1);
    const volEf = sum(lim.efektif, 0, nTot) * 1000 * d.das.luas_km2, volHid = (sum(h.q, 0, nTot + 120) - d.das.aliran_dasar_m3s * (nTot + 120)) * 3600;
    const masukCfg = d.masuk, tj = SG.keSel(K, masukCfg.lon, masukCfg.lat), cI = Math.round(tj[0]), cJ = Math.round(tj[1]);
    const r = ny - 1 - masukCfg.baris_dari_tepi, kand = []; for (let i = Math.max(1, cI - masukCfg.jendela_sel); i <= Math.min(nx - 2, cI + masukCfg.jendela_sel); i++) kand.push(r * nx + i);
    kand.sort((a, b) => z[a] - z[b]); const pil = kand.slice(0, masukCfg.jumlah_sel).filter(k => !laut[k]);
    for (const k of pil) masuk.push({k, q: Float64Array.from(q, v => v / pil.length)});
    sungaiOut[d.id] = {nama: d.nama, luas_km2: d.das.luas_km2, cn: par.cn, tc_jam: par.tc_jam, kalibrasi: kal, tp_jam: +h.Tp.toFixed(2), tb_jam: +h.Tb.toFixed(2), pengali: +pg.toFixed(3), era5_mm: +sum(er, pre, nTot).toFixed(1), hujan_mm: +sum(hd, pre, nTot).toFixed(1),
      efektif_mm: +sum(lim.efektif, pre, nTot).toFixed(1), puncak_m3s: +mx(q).toFixed(1), jam_puncak: q.indexOf(mx(q)), q_jam47_m3s: +q[47].toFixed(1), q_jam50_m3s: +q[50].toFixed(1), volume_efektif_m3: Math.round(volEf), volume_hidrograf_m3: Math.round(volHid),
      sel_masuk: pil.map(k => ({i: k % nx, j: (k / nx) | 0, z_m: +z[k].toFixed(2)})), bobot_era5: d.bobot.length, hidrograf_m3s: Array.from(q, v => +v.toFixed(1)), sumber: d.das.sumber, sementara: !!d.das.sementara};
    log(`${d.nama}: hujan ${sungaiOut[d.id].hujan_mm} mm (x${fmt(pg, 2)}), tc ${par.tc_jam} cn ${par.cn}${kal ? " (kalibrasi)" : ""}, puncak ${sungaiOut[d.id].puncak_m3s} m3/s jam ke-${sungaiOut[d.id].jam_puncak}, masuk di sel ${sungaiOut[d.id].sel_masuk.map(s => s.i + "," + s.j)}`);
  }
  /* 5 gedung + pencarian */
  const pola = await urlUbinVektor(), f = 2 ** (ZB - K.zoom), tx0 = Math.floor(K.x0 * f / 256), ty0 = Math.floor(K.y0 * f / 256), tx1 = Math.floor((K.x0 + nx * K.s) * f / 256), ty1 = Math.floor((K.y0 + ny * K.s) * f / 256);
  const daftar = []; for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) daftar.push([tx, ty]);
  const lap2 = new Set(["building", "transportation_name", "place"]);
  const ub = (await Promise.all(daftar.map(async ([tx, ty]) => { let b = await ambilCache(pola.replace("{z}", ZB).replace("{x}", tx).replace("{y}", ty), `ofm/${ZB}_${tx}_${ty}.pbf`);
    if (!b) return null; if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); return {tx, ty, d: bukaMVT(b, lap2)}; }))).filter(Boolean);
  const V = agregatVektor(ub, K, SG); let totG = 0; for (let k = 0; k < N; k++) totG += V.gedung[k];
  log(`ubin vektor ${ub.length}/${daftar.length}, gedung ${totG}, nama jalan ${V.nJalan}, tempat ${V.nTempat}, pola ${pola.replace(/\/\d+\/\{z\}.*/, "")}`);
  lap.gedung = {ubin: `${ub.length}/${daftar.length}`, jumlah: totG, jalan: V.nJalan, tempat: V.nTempat};
  /* 6 simulasi */
  const cfg = {nx, ny, dx: K.dx, z, laut, manning, jam: J, hujanKelas: L.seri, kelas: L.kelas, masuk}, tSim = Date.now();
  if (laut.some(v => v)) { cfg.muka = SG.pasang(Array(J / 24).fill(.6)); asumsi.muka_laut = "ada sel laut: muka laut 0,6 m + pasang M2 rentang 1 m (asumsi, tidak diriset)"; }
  const R = SG.jalankan(cfg, p => { if (Math.round(p * J) % 12 === 0) process.stderr.write(`  simulasi ${Math.round(p * 100)} %\r`); });
  log(`simulasi ${fmt((Date.now() - tSim) / 1000)} dtk, ${R.langkah} langkah, galat neraca ${(R.neraca.galat * 100).toFixed(4)} %`);
  const ked = R.kedalaman;
  /* 7 ringkasan per jam, sel basah, biner */
  const A = K.dx * K.dx, jamRing = [], pantau = kej.titik_pantau.map(p => { const t = tempat(p.lat, p.lon); let best = t.k;
    for (let dj = -p.radius_sel; dj <= p.radius_sel; dj++) for (let di = -p.radius_sel; di <= p.radius_sel; di++) { const i = t.i + di, j = t.j + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const k = j * nx + i; if (z[k] < z[best]) best = k; }
    return {...p, k: best, i: best % nx, j: (best / nx) | 0, z_dasar_m: +z[best].toFixed(2)}; });
  const hmaksCm = new Uint16Array(N), jamMaks = new Uint8Array(N); let sbm = 0;
  for (let s = 1; s <= J; s++) { let lu = 0, ge = 0; const o = s * N;
    for (let k = 0; k < N; k++) { const h = ked[o + k], cm = Math.round(h * 100); if (h >= .1) { lu += A; ge += V.gedung[k]; } if (cm > hmaksCm[k]) { hmaksCm[k] = Math.min(65535, cm); jamMaks[k] = s; } }
    jamRing.push({s, waktu: new Date(jam0 + s * 3600e3).toISOString().replace("Z", "+00:00"), luas_km2: +(lu / 1e6).toFixed(3), gedung: ge, hujan_mm: +hj[s - 1].toFixed(2),
      pantau: Object.fromEntries(pantau.map(p => [p.id, +ked[o + p.k].toFixed(2)]))}); }
  const basah = []; for (let k = 0; k < N; k++) if (hmaksCm[k] >= 1) basah.push(k);
  const M = basah.length, dalam = new Uint16Array(M * J);
  for (let s = 1; s <= J; s++) { const o = s * N; for (let m = 0; m < M; m++) dalam[(s - 1) * M + m] = Math.min(65535, Math.round(ked[o + basah[m]] * 100)); }
  const demDm = new Int16Array(N); for (let k = 0; k < N; k++) demDm[k] = Math.round(dem.z[k] * 10);
  const dom = new Uint8Array(N); /* kelas dominan tak tersedia dari ringkasan; tidak disimpan */
  const {buf, tabel} = kemasBiner([["indeks", "Uint32", Uint32Array.from(basah)], ["dalam_cm", "Uint16", dalam], ["hmaks_cm", "Uint16", hmaksCm], ["jam_hmaks", "Uint8", jamMaks], ["dem_dm", "Int16", demDm], ["gedung", "Uint16", V.gedung]]); void dom;
  const gz = zlib.gzipSync(buf, {level: 9}); fs.mkdirSync(KELUAR, {recursive: true});
  fs.writeFileSync(path.join(KELUAR, `${kej.id}.bin.gz`), gz);
  fs.writeFileSync(path.join(KELUAR, `${kej.id}_cari.json`), JSON.stringify({id: kej.id, kolom: ["nama", "jenis", "kelas", "lon", "lat", "kelurahan", "kota"], baris: V.baris}));
  /* 8 validasi */
  const jamKe = w => Math.max(1, Math.min(J, Math.round((Date.parse(w) - jam0) / 3600e3))), validasi = [], di3 = (t, s) => { let m = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = t.i + di, j = t.j + dj; if (i >= 0 && j >= 0 && i < nx && j < ny) m = Math.max(m, ked[s * N + j * nx + i]); } return m; };
  for (const l of kej.laporan) { const t = tempat(l.lat, l.lon);
    if (!t.dalam) { validasi.push({id: l.id, nama: l.nama, di_kisi: false}); continue; }
    let s = null, mm = 0, sm = 1; for (let u = 1; u <= J; u++) if (ked[u * N + t.k] > mm) { mm = ked[u * N + t.k]; sm = u; }
    let m3m = 0; for (let u = 1; u <= J; u++) m3m = Math.max(m3m, di3(t, u));
    const jenis = l.waktu ? "jam" : "hmaks"; s = l.waktu ? jamKe(l.waktu) : sm;
    const c = ked[s * N + t.k] * 100, m3 = di3(t, s) * 100, d = l.kedalaman_cm;
    validasi.push({id: l.id, nama: l.nama, di_kisi: true, lokasi: l.lokasi, jenis_waktu: jenis, waktu: l.waktu, s, sel: [t.i, t.j], model_cm: +c.toFixed(1), model_3x3_cm: +m3.toFixed(1), model_maks_96j_cm: +(mm * 100).toFixed(1), model_3x3_maks_96j_cm: +(m3m * 100).toFixed(1),
      laporan_cm: d, selisih_cm: d == null ? null : +(c - d).toFixed(1), selisih_3x3_cm: d == null ? null : +(m3 - d).toFixed(1), tergenang: c >= 10, tergenang_3x3: m3 >= 10, tergenang_maks: mm >= .1}); }
  const dk = validasi.filter(v => v.di_kisi), pod = (f, k) => { const a = dk.filter(f); return a.length ? +(a.filter(v => v[k]).length / a.length).toFixed(3) : null; }, banyak = f => dk.filter(f).length;
  const selisih = k => { const a = dk.filter(v => v[k] != null); return {n: a.length, bias_cm: a.length ? +(a.reduce((x, v) => x + v[k], 0) / a.length).toFixed(1) : null, mae_cm: a.length ? +(a.reduce((x, v) => x + Math.abs(v[k]), 0) / a.length).toFixed(1) : null}; };
  /* luas Kota Bekasi (poligon kasar dari masukan) lawan survei ITB; kedalaman maks lawan 3,32 m */
  const poli = kej.kota_bekasi_poligon.titik, dalamPoli = (x, y) => { let r = false; for (let a = 0, b = poli.length - 1; a < poli.length; b = a++) { const [xa, ya] = poli[a], [xb, yb] = poli[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) r = !r; } return r; };
  let selB = 0, selB30 = 0, dmaksB = 0, nB = 0; for (let k = 0; k < N; k++) { const [lo, la] = SG.dariSel(K, k % nx, (k / nx) | 0); if (!dalamPoli(lo, la)) continue; nB++; if (hmaksCm[k] >= 10) selB++; if (hmaksCm[k] >= 30) selB30++; dmaksB = Math.max(dmaksB, hmaksCm[k]); }
  const ha = c => +(c * A / 1e4).toFixed(0), luasB = {poligon: kej.kota_bekasi_poligon.catatan, luas_poligon_ha: ha(nB), tergenang_ge10cm_hmaks_ha: ha(selB), tergenang_ge30cm_hmaks_ha: ha(selB30), kedalaman_maks_m: +(dmaksB / 100).toFixed(2), itb: {survei_ha: 380, survei_maks_m: 3.32, simulasi_itb_ha: 720, simulasi_itb_maks_m: 3.51}};
  /* puncak muka air model di titik pantau lawan laporan pos */
  const puncakPantau = pantau.map(p => { let b = 0, bs = 1; for (let u = 1; u <= J; u++) if (ked[u * N + p.k] > b) { b = ked[u * N + p.k]; bs = u; } return {id: p.id, nama: p.nama, kedalaman_maks_m: +b.toFixed(2), s: bs, waktu_wib: new Date(jam0 + bs * 3600e3 + WIB).toISOString().slice(0, 16)}; });
  const ringkasValidasi = {n_laporan: validasi.length, n_di_kisi: dk.length, n_di_luar_kisi: validasi.length - dk.length, pod_10cm: pod(() => true, "tergenang"), pod_10cm_3x3: pod(() => true, "tergenang_3x3"), pod_10cm_maks_96j: pod(() => true, "tergenang_maks"),
    pod_10cm_geokode_nominatim: pod(v => v.lokasi === "nominatim", "tergenang"), n_geokode_nominatim: banyak(v => v.lokasi === "nominatim"), pod_10cm_perkiraan_peneliti: pod(v => v.lokasi !== "nominatim", "tergenang"), n_perkiraan_peneliti: banyak(v => v.lokasi !== "nominatim"),
    pod_10cm_laporan_ber_jam: pod(v => v.jenis_waktu === "jam", "tergenang"), n_ber_jam: banyak(v => v.jenis_waktu === "jam"),
    selisih_sel: selisih("selisih_cm"), selisih_3x3: selisih("selisih_3x3_cm"), luas_kota_bekasi: luasB, puncak_pantau: puncakPantau,
    catatan: "model_cm = sel laporan pada jam laporan (hmaks bila jam tak disebut); 3x3 = maksimum 9 sel (galat posisi laporan sampai ~1 km dan DEM 30 m); laporan 'perkiraan_peneliti' bisa meleset ~1 km. Hidrograf sungai dikalibrasi ke puncak laporan, jadi bukan uji bebas."};
  log("validasi:"); for (const v of validasi) log(v.di_kisi ? `  ${v.nama.slice(0, 30).padEnd(30)} ${v.jenis_waktu === "jam" ? "jam " + String(v.s).padStart(2) : "hmaks " + String(v.s).padStart(2)} model ${String(v.model_cm).padStart(6)} cm, 3x3 ${String(v.model_3x3_cm).padStart(6)} cm, laporan ${v.laporan_cm ?? "-"} (${v.lokasi})` : `  ${v.nama.slice(0, 30).padEnd(30)} di luar kisi`);
  log(`POD >=10 cm: sel ${ringkasValidasi.pod_10cm}, 3x3 ${ringkasValidasi.pod_10cm_3x3}, maks96j ${ringkasValidasi.pod_10cm_maks_96j}, n ${dk.length}/${validasi.length}; nominatim ${ringkasValidasi.pod_10cm_geokode_nominatim} (n ${ringkasValidasi.n_geokode_nominatim})`);
  log(`selisih sel: ${JSON.stringify(ringkasValidasi.selisih_sel)}; 3x3: ${JSON.stringify(ringkasValidasi.selisih_3x3)}`);
  log(`Kota Bekasi (poligon kasar ${luasB.luas_poligon_ha} ha): ${luasB.tergenang_ge10cm_hmaks_ha} ha >=10 cm, ${luasB.tergenang_ge30cm_hmaks_ha} ha >=30 cm, maks ${luasB.kedalaman_maks_m} m; ITB survei 380 ha / 3,32 m, simulasi ITB 720 ha / 3,51 m`);
  log("puncak muka air model di titik pantau: " + puncakPantau.map(p => `${p.id} ${p.kedalaman_maks_m} m pada ${p.waktu_wib}`).join("; "));
  /* 9 JSON meta */
  const puncakLuas = jamRing.reduce((b, r) => r.luas_km2 > b.luas_km2 ? r : b, jamRing[0]);
  const meta = {id: kej.id, judul: kej.judul, dibuat: new Date().toISOString(), mulai: kej.mulai, jam: J, jam_catatan: "indeks s = 1..jam; kondisi s ada pada mulai + s jam; dalam_cm[(s-1)*jumlah_basah + m] = kedalaman sel indeks[m] pada s",
    kisi: {nx, ny, dx_m: +K.dx.toFixed(3), zoom: K.zoom, s: K.s, x0: K.x0, y0: K.y0, sudut_lonlat: K.sudut, pusat: {lat: kk.lat, lon: kk.lon}, sisi_m: K.sisi, baris0: "utara", sel_ke_lonlat: "dunia = (x0 + (i+0,5) s, y0 + (j+0,5) s) piksel Mercator 256 px zoom `zoom`; sama dengan SimGenangan.dariSel"},
    biner: {berkas: `${kej.id}.bin.gz`, kompresi: "gzip", urutan_byte: "little-endian", ukuran_mentah: buf.length, ukuran_gz: gz.length, bagian: tabel,
      keterangan: {indeks: "indeks sel (j*nx+i) yang pernah >= 1 cm", dalam_cm: "uint16 cm, jam-major", hmaks_cm: "uint16 cm per sel seluruh kisi (maks dari kondisi per jam)", jam_hmaks: "uint8, s saat hmaks, 0 = tak pernah >= 0,5 cm", dem_dm: "int16 desimeter, DEM asli (tanpa isi cekungan)", gedung: "uint16 jumlah gedung per sel"}},
    cari: {berkas: `${kej.id}_cari.json`},
    ringkasan: {tergenang_ambang_cm: 10, jam_luas_puncak: puncakLuas.s, luas_puncak_km2: puncakLuas.luas_km2, gedung_puncak: Math.max(...jamRing.map(r => r.gedung)), hmaks_cm: mx(hmaksCm), sel_basah: M, per_jam: jamRing},
    sumber, lahan: lap.lahan, hujan: lap.hujan, amc: lap.amc, limpasan_efektif_mm: lap.limpasan_efektif_mm, gedung: lap.gedung,
    pengali: {per_sel_era5: lap.pengali_sel, stasiun: kej.stasiun, aturan: "satu pengali per sel ERA5 = jumlah alat ukur / jumlah ERA5 sel itu pada jendela alat; sel tanpa alat = IDW dari sel beralat"}, rujukan: {linimasa_pos: kej.linimasa_pos, dampak: kej.dampak, validasi_luas: kej.validasi_luas, laporan_semua: kej.laporan}, sungai: sungaiOut, titik_pantau: pantau.map(p => ({id: p.id, nama: p.nama, i: p.i, j: p.j, z_dasar_m: p.z_dasar_m, sementara: !!p.sementara})),
    neraca: R.neraca, langkah: R.langkah, validasi: {ringkas: ringkasValidasi, laporan: validasi},
    asumsi: {genangan: "SimGenangan inersia lokal Bates 2010; cekungan DEM dangkalkan <= 0,5 m; tanggul/saluran kecil tak terlihat di SRTM 30 m",
      hujan: "ERA5 per jam dikali pengali tetap per area (IDW stasiun); bentuk hietograf = ERA5",
      sungai: "DAS terkumpul: SCS-CN kumulatif + hidrograf satuan segitiga SCS, Tp = D/2 + 0,6 Tc (D 1 jam), aliran dasar konstan; debit dibagi rata ke sel DEM terendah di jendela tepi selatan, bukan alur sungai asli",
      gedung: "titik berat gedung OpenFreeMap z14, hanya bila titik berat dalam ubin; 'air di pintu' = sel >= 10 cm",
      pencarian: "kelurahan = place (suburb/quarter/neighbourhood/village) terdekat <= 3 km, kota = town/city terdekat; kecamatan resmi tidak ada di OpenFreeMap", ...asumsi,
      kejadian: "replay_kejadian.json; entri sementara=true belum dari riset"},
    waktu_hitung_dtk: +((Date.now() - t0) / 1000).toFixed(1), waktu_simulasi_dtk: +((Date.now() - tSim) / 1000).toFixed(1)};
  const js = JSON.stringify(meta); fs.writeFileSync(path.join(KELUAR, `${kej.id}.json`), js);
  const ukur = n => fs.statSync(path.join(KELUAR, n)).size;
  log(`keluaran: ${kej.id}.json ${(ukur(`${kej.id}.json`) / 1024).toFixed(0)} KB, ${kej.id}.bin.gz ${(ukur(`${kej.id}.bin.gz`) / 1024).toFixed(0)} KB (mentah ${(buf.length / 1048576).toFixed(1)} MB, sel basah ${M}), ${kej.id}_cari.json ${(ukur(`${kej.id}_cari.json`) / 1024).toFixed(0)} KB; waktu hitung ${meta.waktu_hitung_dtk} dtk`);
  return meta;
}

/* ---------- swa-uji tanpa jaringan ---------- */
function pngBuat(w, h, tipe, baris) { /* penyandi mini untuk uji; baris[y] = {filter, bytes} sudah mentah (belum difilter) */
  const ch = {0: 1, 2: 3, 6: 4}[tipe], st = w * ch, raw = Buffer.alloc(h * (st + 1));
  for (let y = 0; y < h; y++) { const f = y % 5, o = y * (st + 1); raw[o] = f;
    for (let x = 0; x < st; x++) { const v = baris[y][x], a = x >= ch ? baris[y][x - ch] : 0, b = y ? baris[y - 1][x] : 0, c = x >= ch && y ? baris[y - 1][x - ch] : 0;
      const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c), pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      raw[o + 1 + x] = (v - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : pr)) & 255; } }
  const chunk = (n, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const t = Buffer.concat([Buffer.from(n, "latin1"), d]); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(t) >>> 0); return Buffer.concat([l, t, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = tipe;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ih), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const pbV = n => { const o = []; while (n > 127) { o.push(n % 128 | 128); n = Math.floor(n / 128); } o.push(n); return Buffer.from(o); };
const pbTag = (f, t) => pbV(f << 3 | t), pbLen = (f, b) => Buffer.concat([pbTag(f, 2), pbV(b.length), b]), pbStr = (f, s) => pbLen(f, Buffer.from(s)), enc = n => n < 0 ? -2 * n - 1 : 2 * n;
const pbPak = (f, a) => pbLen(f, Buffer.concat(a.map(pbV)));
function mvtBuat() { /* lapisan building (persegi 100x100 di (1000,1000)), transportation_name (garis bernama), place (titik) */
  const fit = (tipe, tags, geo) => pbLen(2, Buffer.concat([pbPak(2, tags), pbTag(3, 0), pbV(tipe), pbPak(4, geo)]));
  const lay = (nama, fits, keys, vals) => pbLen(3, Buffer.concat([pbStr(1, nama), ...fits, ...keys.map(k => pbStr(3, k)), ...vals.map(v => pbLen(4, pbStr(1, v))), pbTag(5, 0), pbV(4096), pbTag(15, 0), pbV(2)]));
  const persegi = [9, enc(1000), enc(1000), 26, enc(100), 0, 0, enc(-100), enc(-100), 0, 15]; /* MoveTo, LineTo x3 (dx,dy), Close */
  const garis = [9, enc(500), enc(2000), 18, enc(100), 0, enc(100), 0]; /* (500,2000) (600,2000) (700,2000) */
  return Buffer.concat([lay("building", [fit(3, [], persegi)], [], []), lay("transportation_name", [fit(2, [0, 0, 1, 1], garis)], ["name", "class"], ["Jalan Uji", "primary"]),
    lay("place", [fit(1, [0, 0, 1, 1], [9, enc(650), enc(2050)])], ["name", "class"], ["Kelurahan Uji", "suburb"]), lay("lain", [], [], [])]);
}
export async function uji() {
  /* 1 PNG: semua jenis filter 0-4, RGB dan RGBA */
  for (const tipe of [2, 6]) { const ch = tipe === 2 ? 3 : 4, w = 7, h = 10, baris = Array.from({length: h}, (_, y) => Array.from({length: w * ch}, (_, x) => (x * 37 + y * 91 + x * y) & 255));
    const p = bukaPNG(pngBuat(w, h, tipe, baris)); assert.equal(p.w, w); assert.equal(p.h, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) assert.equal(p.data[(y * w + x) * 4 + c], baris[y][x * ch + c], `PNG tipe ${tipe} piksel ${x},${y},${c}`);
    if (tipe === 2) assert.equal(p.data[3], 255); }
  assert.throws(() => bukaPNG(Buffer.from("bukan png")), /bukan PNG/);
  /* 2 MVT */
  const T = bukaMVT(mvtBuat(), new Set(["building", "transportation_name", "place"])); assert.equal(Object.keys(T).length, 3, "lapisan 'lain' harus dilewati");
  const b = T.building.fitur[0]; assert.equal(b.tipe, 3); assert.deepEqual(b.geom[0], [[1000, 1000], [1100, 1000], [1100, 900], [1000, 900]]);
  const tb = titikBerat(b.geom[0]); assert.ok(Math.abs(tb[0] - 1050) < 1e-6 && Math.abs(tb[1] - 950) < 1e-6, "titik berat persegi " + tb);
  assert.deepEqual(T.transportation_name.fitur[0].tag, {name: "Jalan Uji", class: "primary"}); assert.deepEqual(T.transportation_name.fitur[0].geom[0], [[500, 2000], [600, 2000], [700, 2000]]);
  assert.deepEqual(T.place.fitur[0].geom, [[650, 2050]]); assert.equal(T.place.fitur[0].tag.name, "Kelurahan Uji");
  /* 3 agregat vektor: kisi 10x10 sel di zoom 14 (s = 1) */
  const {SG} = muatMesin(), K = {nx: 10, ny: 10, dx: 10, zoom: 14, s: 1, x0: 0, y0: 0, lat: 0, lon: 0};
  const sel = SG.rencanaKisi(-6.25, 106.95, 24000, 400); assert.ok(sel.zoom >= 10);
  const V = agregatVektor([{tx: 0, ty: 0, d: T}], {...K, nx: 400, ny: 400, zoom: 14, s: 1}, {dariSel: (_, i, j) => [i, j]});
  assert.equal(V.gedung.reduce((a, c) => a + c, 0), 1, "satu gedung"); assert.ok(V.baris.some(r => r[0] === "Jalan Uji" && r[1] === "jalan" && r[5] === "Kelurahan Uji"), "jalan harus dapat kelurahan terdekat");
  /* 4 hidrograf: volume = volume limpasan; puncak mendekati qp; tanpa hujan = aliran dasar */
  const ef = new Float64Array(40); ef[3] = 12; ef[4] = 20; ef[5] = 8; const A = 330, tc = 10, h = hidrografDAS(ef, A, tc, 15, 1, 400);
  const vol = (h.q.reduce((a, c) => a + c, 0) - 15 * 400) * 3600, mau = 40 * 1000 * A; assert.ok(Math.abs(vol - mau) / mau < 1e-9, `volume ${vol} != ${mau}`);
  assert.ok(Math.max(...h.q) > 15, "puncak positif"); assert.ok(Math.max(...h.q) - 15 < 40 * 1000 * A / 3600 / (h.Tp), "puncak di bawah batas pulsa");
  assert.ok(h.q.indexOf(Math.max(...h.q)) >= 3 + Math.floor(h.Tp), "puncak muncul sesudah hujan + sekitar Tp");
  assert.ok(hidrografDAS(new Float64Array(10), A, tc, 7, 1, 20).q.every(v => v === 7), "tanpa hujan = aliran dasar");
  /* 4b kalibrasi memulihkan tc yang dipakai membuat sasaran */
  const hd = new Float64Array(100); hd[10] = 20; hd[11] = 35; hd[12] = 15; const asli = hidrografDAS(hd, 400, 9, 5, 1, 220).q, ip = asli.indexOf(Math.max(...asli));
  const kal = kalibrasiDAS((x) => ({efektif: x}), hd, 400, 5, 0, 99, {puncak_m3s: Math.max(...asli), s: ip, lebar_jam: 1}, ["tc_jam"], {tc_jam: 20, cn: 80}); assert.ok(Math.abs(kal.tc_jam - 9) <= .5, "kalibrasi tc " + kal.tc_jam);
  /* 5 biner bolak-balik */
  const bg = [["a", "Uint32", Uint32Array.from([1, 4e9, 7])], ["b", "Uint16", Uint16Array.from([0, 65535, 12])], ["c", "Uint8", Uint8Array.from([9, 255, 1, 3, 4])], ["d", "Int16", Int16Array.from([-500, 32767, -32768])]];
  const {buf, tabel} = kemasBiner(bg), balik = bongkarBiner(zlib.gunzipSync(zlib.gzipSync(buf)), tabel);
  for (const [n, , a] of bg) assert.deepEqual(Array.from(balik[n]), Array.from(a), "biner " + n); assert.ok(tabel.every(t => t.offset % 4 === 0), "rata 4 byte");
  /* 6 bobot ERA5 + pengali */
  const w = bobotEra5([-6.6, -6.34], [106.78, 107.15]); assert.ok(Math.abs(w.reduce((a, c) => a + c.w, 0) - 1) < 1e-9, "bobot ERA5 berjumlah 1"); assert.ok(w.every(x => Math.abs(x.lat / .25 - Math.round(x.lat / .25)) < 1e-6), "titik ERA5 kelipatan 0,25");
  assert.ok(Math.abs(pengaliDi([{lat: 0, lon: 0, pengali: 2}], 5, 5) - 2) < 1e-12);
  /* 7 mesin dalam vm + shim: ambilDEM dengan ubin PNG buatan (lereng lembut) memberi DEM bentuk benar */
  const ubin = (zz, i, j) => { const bar = Array.from({length: 256}, (_, y) => Array.from({length: 768}, (_, x) => { const px = x / 3, e = 100 + px * .1 + y * .2 + 0 * (zz + i + j) + 32768; return [e >> 8, e & 255, 0][x % 3]; })); return pngBuat(256, 256, 2, bar); };
  const {SG: SG2} = muatMesin(), D = await SG2.ambilDEM(-6.25, 106.95, 2000, 16, async u => { const m = u.match(/(\d+)\/(\d+)\/(\d+)\.png/); return {ok: true, status: 200, blob: async () => ubin(+m[1], +m[2], +m[3])}; });
  assert.equal(D.z.length, 256); assert.ok(D.z.every(v => Math.abs(v - 120) < 80), "DEM dari PNG buatan masuk akal");
  console.log("replay uji: PNG, MVT, agregat gedung+jalan, hidrograf, biner, bobot ERA5, ambilDEM lewat vm: semua lolos");
}

/* ---------- CLI ---------- */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cmd = process.argv[2];
  if (cmd === "uji") await uji();
  else { const kej = JSON.parse(fs.readFileSync(path.join(AKAR, "scripts/banjir/replay_kejadian.json"), "utf8")); await hitung(kej); }
}
