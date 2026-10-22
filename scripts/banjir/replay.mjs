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
const KELUAR = process.env.REPLAY_KELUAR || path.join(AKAR, "public/banjir/data/replay");
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

/* kedalaman cm per sel urut jam: simpan selisih antarjam, sel-major ([m*J + s-1]); gzip 3x lebih kecil dari mentah jam-major, lossless */
export function kodeDelta(jamMajor, M, J) { const o = new Int16Array(M * J); for (let m = 0; m < M; m++) { let p = 0; for (let s = 0; s < J; s++) { const v = jamMajor[s * M + m]; o[m * J + s] = v - p; p = v; } } return o; }
export function dekodeDelta(delta, M, J) { const o = new Uint16Array(M * J); for (let m = 0; m < M; m++) { let p = 0; for (let s = 0; s < J; s++) { p += delta[m * J + s]; o[s * M + m] = p; } } return o; }
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
const arealEra5 = (E, bobot, mult = () => 1, dari = 0) => { const n = E.waktu.length, o = new Float64Array(n); for (const b of bobot) { const s = E[`${b.lat},${b.lon}`]; s || galat(`titik ERA5 ${b.lat},${b.lon} tak ada`); const m = mult(b); for (let t = 0; t < n; t++) o[t] += s[t] * b.w * (t >= dari ? m : 1); } return o; };
const keSelEra5 = v => +(Math.round(v / SISI) * SISI).toFixed(4);
/* kalibrasi DAS ke puncak dilaporkan: cari (tc, cn) yang meminimalkan galat relatif puncak dan galat waktu puncak. Ini KALIBRASI ke laporan, bukan prediksi.
   hd = hujan DAS mm/jam (seluruh deret), pre = indeks jam 0 replay, sasaran {puncak_m3s|null, s (indeks jam puncak), lebar_jam}, bebas = ["tc_jam","cn"] */
export function kalibrasiDAS(limpasanFn, hdFn, A, dasar, pre, J, sasaran, bebas, awal) {
  const tcs = bebas.includes("tc_jam") ? Array.from({length: 39}, (_, i) => 2 + i) : [awal.tc_jam], cns = bebas.includes("cn") ? Array.from({length: 17}, (_, i) => 60 + i * 2) : [awal.cn],
    arfs = bebas.includes("faktor_areal") ? Array.from({length: 55}, (_, i) => +(.02 * 1.1 ** i).toFixed(4)).filter(v => v <= 1.0001) : [awal.faktor_areal ?? 1],
    gesers = bebas.includes("geser_jam") ? Array.from({length: 16}, (_, i) => -2 * i) : [awal.geser_jam ?? 0]; let best = null;
  for (const arf of arfs) for (const gs of gesers) { const hd = hdFn(arf, gs); for (const cn of cns) { const ef = limpasanFn(hd, cn).efektif; for (const tc of tcs) { const q = hidrografDAS(ef, A, tc, dasar, 1, hd.length + 120).q; let pk = -1, ip = 0;
      for (let t = pre; t <= pre + J; t++) if (q[t] > pk) { pk = q[t]; ip = t - pre; }
      const g = (sasaran.puncak_m3s ? ((pk - sasaran.puncak_m3s) / sasaran.puncak_m3s) ** 2 : 0) + ((ip - sasaran.s) / sasaran.lebar_jam) ** 2;
      if (!best || g < best.galat) best = {tc_jam: tc, cn, faktor_areal: arf, geser_jam: gs, galat: g, puncak_m3s: pk, jam_puncak: ip}; } } }
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
  const {nx, ny} = K, N = nx * ny, gedung = new Uint16Array(N), f = 2 ** (K.zoom - ZB) * 256, jalan = new Map(), tempat = [], alur = [];
  const sel = (tx, ty, x, y, ext) => { const X = (tx + x / ext) * f, Y = (ty + y / ext) * f; return [(X - K.x0) / K.s, (Y - K.y0) / K.s]; };
  const lonlat = (i, j) => SG.dariSel(K, i - .5, j - .5); /* sel pecahan -> lon,lat (dariSel memakai pusat sel i+.5) */
  for (const {tx, ty, d} of tiles) {
    const B = d.building; if (B) for (const ft of B.fitur) { if (ft.tipe !== 3 || !ft.geom.length) continue; const tanda = Math.sign(titikBerat(ft.geom[0])[2]);
      for (const r of ft.geom) { const [cx, cy, a] = titikBerat(r); if (Math.sign(a) !== tanda || cx < 0 || cy < 0 || cx >= B.extent || cy >= B.extent) continue;
        const [fi, fj] = sel(tx, ty, cx, cy, B.extent), i = Math.floor(fi), j = Math.floor(fj); if (i >= 0 && j >= 0 && i < nx && j < ny && gedung[j * nx + i] < 65535) gedung[j * nx + i]++; } }
    const T = d.transportation_name; if (T) for (const ft of T.fitur) { const nm = ft.tag.name; if (!nm || ft.tipe !== 2 || HAPUS_KELAS.has(ft.tag.class)) continue;
      const g = ft.geom.reduce((m, r) => r.length > m.length ? r : m, []); if (!g.length) continue; const [x, y] = g[g.length >> 1]; if (x < 0 || y < 0 || x >= T.extent || y >= T.extent) continue;
      const [fi, fj] = sel(tx, ty, x, y, T.extent); if (fi < 0 || fj < 0 || fi >= nx || fj >= ny) continue;
      const kk = `${nm}|${Math.floor(fi / 50)}|${Math.floor(fj / 50)}`, e = jalan.get(kk); /* gugus 50 sel = 3 km */
      if (e) { e.n++; e.i += fi; e.j += fj; } else jalan.set(kk, {nm, kelas: ft.tag.class || "", n: 1, i: fi, j: fj}); }
    const W = d.waterway; if (W) for (const ft of W.fitur) { if (ft.tipe !== 2) continue; const kl = ft.tag.class || ""; if (kl !== "river" && kl !== "canal" && kl !== "stream") continue;
      for (const g of ft.geom) alur.push({kelas: kl, nama: ft.tag.name || "", garis: g.map(([x, y]) => sel(tx, ty, x, y, W.extent))}); }
    const P = d.place; if (P) for (const ft of P.fitur) { const nm = ft.tag.name; if (!nm || ft.tipe !== 1 || !ft.geom.length) continue; const [x, y] = ft.geom[0];
      if (x < 0 || y < 0 || x >= P.extent || y >= P.extent) continue; const [fi, fj] = sel(tx, ty, x, y, P.extent); if (fi < 0 || fj < 0 || fi >= nx || fj >= ny) continue;
      tempat.push({nm, kelas: ft.tag.class || "", i: fi, j: fj}); }
  }
  const KEL = new Set(["suburb", "quarter", "neighbourhood", "village"]), KOTA = new Set(["town", "city"]);
  const dekat = (i, j, set, maks) => { let b = null, bd = maks * maks; for (const p of tempat) if (set.has(p.kelas)) { const d = (p.i - i) ** 2 + (p.j - j) ** 2; if (d < bd) { bd = d; b = p; } } return b ? b.nm : ""; };
  const rb = v => +v.toFixed(5), baris = [], wil = new Map(), wi = n => { if (!n) return -1; if (!wil.has(n)) wil.set(n, wil.size); return wil.get(n); };
  for (const p of tempat) { const [lo, la] = lonlat(p.i, p.j); baris.push([p.nm, 1, rb(lo), rb(la), wi(KEL.has(p.kelas) ? p.nm : dekat(p.i, p.j, KEL, 50)), wi(dekat(p.i, p.j, KOTA, 250)), p.kelas]); }
  for (const e of jalan.values()) { const i = e.i / e.n, j = e.j / e.n, [lo, la] = lonlat(i, j); baris.push([e.nm, 0, rb(lo), rb(la), wi(dekat(i, j, KEL, 50)), wi(dekat(i, j, KOTA, 250)), e.kelas]); }
  baris.sort((a, b) => a[0].localeCompare(b[0], "id"));
  return {gedung, baris, wilayah: [...wil.keys()], alur, nTempat: tempat.length, nJalan: jalan.size};
}

/* ---------- alur sungai: OpenFreeMap waterway dibakar ke DEM ---------- */
const NAMA_ALUR = /bekasi|leungsi|cikeas|ci ?liwung|sunter|cipinang|ci pinang/i, NAMA_LEBAR = /(?!)/ /* semua alur 1 sel (1d): kapasitas diatur lewat kedalaman bankfull */;
const kunciNama = n => n ? n.toLowerCase().replace(/[\s.]/g, "").replace(/^(kali|sungai|saluran|kanal|s)/, "") : "";
const DALAM_ALUR = {river: 6, canal: 3, stream: 2}; /* ASUMSI: sungai 6 m (Cileungsi normal 350 cm, siaga 1 400 cm), kanal 3 m, anak sungai 2 m */
/* garis-garis (koordinat sel pecahan) -> rantai tersambung per nama, lalu larik sel 4-tersambung di dalam kisi. Hanya river/canal, atau stream bernama pilihan. */
export function rantaiAlur(alur, nx, ny) {
  const pakai = alur.filter(a => a.kelas === "river" || a.kelas === "canal" || (a.kelas === "stream" && NAMA_ALUR.test(a.nama))), grup = new Map();
  for (const a of pakai) { const k = kunciNama(a.nama) || "?" + a.kelas; (grup.get(k) || grup.set(k, []).get(k)).push(a); }
  const hasil = [], dekat = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 < 2.25;
  for (const [, g] of grup) { const sisa = g.map(a => ({...a, garis: a.garis.slice()}));
    while (sisa.length) { const c = sisa.pop(); let lanjut = true;
      while (lanjut) { lanjut = false;
        for (let i = 0; i < sisa.length; i++) { const t = sisa[i].garis, a = c.garis, h = a[a.length - 1], m = a[0];
          if (dekat(h, t[0])) c.garis = a.concat(t.slice(1)); else if (dekat(h, t[t.length - 1])) c.garis = a.concat(t.slice().reverse().slice(1));
          else if (dekat(m, t[t.length - 1])) c.garis = t.concat(a.slice(1)); else if (dekat(m, t[0])) c.garis = t.slice().reverse().concat(a.slice(1)); else continue;
          sisa.splice(i, 1); lanjut = true; break; } }
      /* rasterisasi 4-tersambung, pecah di tempat keluar kisi */
      let run = [], prev = null; const tutup = () => { if (run.length >= 3) hasil.push({kelas: c.kelas, nama: c.nama, lebar: NAMA_LEBAR.test(c.nama) ? 2 : 1, sel: run}); run = []; prev = null; };
      const taruh = (x, y) => { const i = Math.floor(x), j = Math.floor(y); if (i < 0 || j < 0 || i >= nx || j >= ny) { tutup(); return; } if (prev && prev[0] === i && prev[1] === j) return;
        if (prev && prev[0] !== i && prev[1] !== j) run.push(prev[1] * nx + i); run.push(j * nx + i); prev = [i, j]; };
      for (let q = 1; q < c.garis.length; q++) { const [x0, y0] = c.garis[q - 1], [x1, y1] = c.garis[q], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4)); for (let u = q === 1 ? 0 : 1; u <= n; u++) taruh(x0 + (x1 - x0) * u / n, y0 + (y1 - y0) * u / n); }
      tutup(); } }
  return hasil;
}
/* turunkan dasar alur dari tepi lokal (median 7x7), menurun monoton ke hilir (hilir = ujung yang tepi-lokalnya lebih rendah, seri: yang lebih utara). Kembali z baru, topeng alur, rantai terurut hulu->hilir */
/* kedalaman penuh-tepi (Manning terbalik) saluran persegi selebar dx: Q = dx d^(5/3) sqrt(S) / n  =>  d = (Q n / (dx sqrt(S)))^(3/5) */
export const kedalamanBankfull = (q, n, dx, S) => (q * n / (dx * Math.sqrt(S))) ** .6;
export const debitBankfull = (d, n, dx, S) => dx * d ** (5 / 3) * Math.sqrt(S) / n;
/* opsi {dx, n, sMin, qbf: run => m3/dtk | null}: bila qbf(run) ada, dalam tiap sel = kedalamanBankfull dengan lereng lokal (tepi-lokal dihaluskan, jendela +-8 sel); selain itu tabel `dalam` per kelas */
export function bakarAlur(z, nx, ny, runs, dalam = DALAM_ALUR, opsi = {}) {
  const zb = Float64Array.from(z), mask = new Uint8Array(nx * ny), ref = new Float64Array(nx * ny), tepi = k => { const i = k % nx, j = (k / nx) | 0, v = []; for (let b = -3; b <= 3; b++) for (let a = -3; a <= 3; a++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny) v.push(z[jj * nx + ii]); } v.sort((p, q) => p - q); return v[v.length >> 1]; };
  const out = [];
  for (const r of runs) { let sel = r.sel.slice(); const bank = sel.map(tepi), sm = bank.map((_, i) => { let t = 0, n = 0; for (let b = -4; b <= 4; b++) if (bank[i + b] != null) { t += bank[i + b]; n++; } return t / n; });
    const m = Math.min(3, sel.length), a0 = sm.slice(0, m).reduce((x, y) => x + y, 0) / m, a1 = sm.slice(-m).reduce((x, y) => x + y, 0) / m;
    const balik = Math.abs(a0 - a1) > .5 ? a0 < a1 : (sel[0] / nx | 0) < (sel[sel.length - 1] / nx | 0); /* hilir = awal rantai -> dibalik */
    if (balik) { sel.reverse(); sm.reverse(); }
    const Q = opsi.qbf ? opsi.qbf(r) : null, bed = [], dl = []; let p = Infinity;
    for (let i = 0; i < sel.length; i++) { let d = dalam[r.kelas] ?? 2;
      if (Q) { const lo = Math.max(0, i - 8), hi = Math.min(sel.length - 1, i + 8), S = Math.max(opsi.sMin ?? 5e-4, hi > lo ? (sm[hi] - sm[lo]) / ((hi - lo) * opsi.dx) : 0); d = kedalamanBankfull(Q, opsi.n, opsi.dx, S); }
      dl.push(d); p = Math.min(z[sel[i]], sm[i] - d, p - .0005); bed.push(p); }
    const burn = (i, j, v, tp) => { if (i >= 0 && j >= 0 && i < nx && j < ny) { const k = j * nx + i; if (v < zb[k]) zb[k] = v; mask[k] = 1; ref[k] = Math.max(ref[k], tp); } };
    sel.forEach((k, i) => { const x = k % nx, y = (k / nx) | 0, tp = sm[i]; burn(x, y, bed[i], tp); if (r.lebar === 2) { burn(x + 1, y, bed[i], tp); burn(x, y + 1, bed[i], tp); burn(x + 1, y + 1, bed[i], tp); } });
    out.push({kelas: r.kelas, nama: r.nama, lebar: r.lebar, sel, bed, qbf: Q, dalam: dl}); }
  /* kontinuitas jaringan: isi-naik (Priority-Flood pada jaringan alur saja) dari ujung hilir tiap rantai, naik paling tinggi tepi alur dikurangi 0,5 m; sambungan antar rantai
     lewat tetangga radius 2. Dasar hulu dinaikkan seperlunya supaya menurun ke hilir; sel alur terpisah (pulau) dibiarkan. */
  const hp = [], dorong = (f, k) => { hp.push([f, k]); let i = hp.length - 1; while (i) { const q = (i - 1) >> 1; if (hp[q][0] <= hp[i][0]) break; [hp[q], hp[i]] = [hp[i], hp[q]]; i = q; } },
    ambil = () => { const t = hp[0], e = hp.pop(); if (hp.length) { hp[0] = e; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hp.length) break; if (c + 1 < hp.length && hp[c + 1][0] < hp[c][0]) c++; if (hp[i][0] <= hp[c][0]) break; [hp[i], hp[c]] = [hp[c], hp[i]]; i = c; } } return t; };
  const fin = new Float64Array(nx * ny).fill(Infinity), udah = new Uint8Array(nx * ny);
  for (const r of out) { const k = r.sel[0], i = k % nx, j = (k / nx) | 0; /* semua ujung hilir jadi akar (alur buntu tak menaikkan alur lain) */
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny && mask[jj * nx + ii] && zb[jj * nx + ii] < fin[jj * nx + ii]) { fin[jj * nx + ii] = zb[jj * nx + ii]; dorong(fin[jj * nx + ii], jj * nx + ii); } } }
  while (hp.length) { const [f, k] = ambil(); if (udah[k] || f > fin[k]) continue; udah[k] = 1; const i = k % nx, j = (k / nx) | 0;
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue; const n = jj * nx + ii; if (!mask[n] || udah[n]) continue;
      const c = Math.max(zb[n], Math.min(f + .0005, ref[n] - .5)); if (c < fin[n]) { fin[n] = c; dorong(c, n); } } }
  let naik = 0; for (let k = 0; k < nx * ny; k++) if (mask[k] && fin[k] < Infinity) { if (fin[k] > zb[k] + .01) naik++; zb[k] = fin[k]; }
  return {z: zb, mask, tepi: ref, runs: out, naik};
}
/* sel masuk sungai: sel alur paling selatan yang masih di atas baris `baris` dari tepi selatan (j <= ny-1-baris), di antara rantai ber-nama cocok regex; kembali sel itu + sel alur tetangga (radius 1) untuk menyuntik */
export function cariMasuk(hasil, nx, ny, regex, maksBaris = 12, baris = 4) {
  const r = ny - 1 - baris; let best = null;
  for (const run of hasil.runs) if (regex.test(run.nama)) for (const k of run.sel) { const j = (k / nx) | 0; if (j <= r && (!best || j > best.j)) best = {k, j, nama: run.nama}; }
  if (!best || best.j < r - maksBaris) return null;
  const i0 = best.k % nx, cells = []; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const i = i0 + a, j = best.j + b; if (i >= 0 && j >= 0 && i < nx && j < ny && hasil.mask[j * nx + i]) cells.push(j * nx + i); }
  return {...best, i: i0, sel: cells};
}

/* hulu terukur (debit Bendung Katulampa dari linimasa): titik dari debit L/dtk yang diberitakan; TMA tanpa debit diubah lewat regresi linear TMA-debit
   dari pasangan yang ada. Antara titik: naik linear, turun eksponensial; sebelum titik pertama naik dari aliran dasar 1,5 jam; sesudah titik terakhir
   datar `plateau_jam` lalu surut dengan waktu paruh `paruh_jam` (ASUMSI ekor, tak ada ukuran). f(t) t = jam dari awal replay. */
export function fungsiHulu(linimasa, H, jam0) {
  const rx = /debit\s*([\d.]+)\s*L\/dtk/, tj = e => (Date.parse(e.waktu_wib + ":00+07:00") - jam0) / 3600e3;
  const ps = linimasa.filter(e => e.pos === H.pos).map(e => { const m = (e.status || "").match(rx); return {t: tj(e), tma: e.tma_cm, q: m ? +m[1].replace(/\./g, "") / 1000 : null}; });
  const pr = ps.filter(x => x.q != null && x.tma != null); pr.length >= 2 || galat("pasangan TMA-debit < 2");
  const mt = pr.reduce((a, c) => a + c.tma, 0) / pr.length, mq = pr.reduce((a, c) => a + c.q, 0) / pr.length, b = pr.reduce((a, c) => a + (c.tma - mt) * (c.q - mq), 0) / pr.reduce((a, c) => a + (c.tma - mt) ** 2, 0), a0 = mq - b * mt;
  const titik = ps.map(x => ({t: x.t, q: x.q ?? (x.tma != null ? Math.max(H.dasar_m3s, a0 + b * x.tma) : null), diukur: x.q != null})).filter(x => x.q != null).sort((p, q) => p.t - q.t).filter((x, i, A) => !i || x.t > A[i - 1].t);
  const T = titik, d0 = H.dasar_m3s, last = T[T.length - 1];
  const f = t => { if (t <= T[0].t - 1.5) return d0; if (t < T[0].t) return d0 + (T[0].q - d0) * (t - (T[0].t - 1.5)) / 1.5;
    for (let i = 1; i < T.length; i++) if (t <= T[i].t) { const p = T[i - 1], c = T[i], u = (t - p.t) / (c.t - p.t); return c.q >= p.q ? p.q + (c.q - p.q) * u : Math.exp(Math.log(p.q) + (Math.log(c.q) - Math.log(p.q)) * u); }
    const u = t - last.t - (H.plateau_jam ?? 2); return u <= 0 ? last.q : d0 + (last.q - d0) * .5 ** (u / (H.paruh_jam ?? 8)); };
  return {f, titik, rating: {a: +a0.toFixed(2), b_m3s_per_cm: +b.toFixed(3), n_pasangan: pr.length}};
}

/* ---------- FABDEM V1-2 (Hawker dkk. 2022, CC BY-NC-SA 4.0): GeoTIFF float32 bertile 256, DEFLATE, prediktor 2 ---------- */
const FAB_DIR = path.join(CACHE, "fabdem");
/* tile terkompresi -> Float32Array w*h. Prediktor 2 pada sampel 32-bit: jumlah kumulatif uint32 per baris (modulo 2^32), lalu bit ditafsir ulang sebagai float32 */
export function dekodeTileFab(mentah, w, h, prediktor = 2, kecil = true) {
  const b = zlib.inflateSync(mentah), n = w * h; b.length >= n * 4 || galat(`tile FABDEM ${b.length} < ${n * 4} byte`);
  const u = new Uint32Array(n); for (let i = 0; i < n; i++) u[i] = kecil ? b.readUInt32LE(i * 4) : b.readUInt32BE(i * 4);
  if (prediktor === 2) for (let y = 0; y < h; y++) for (let x = 1; x < w; x++) u[y * w + x] = (u[y * w + x] + u[y * w + x - 1]) >>> 0;
  return new Float32Array(u.buffer);
}
export function bukaGeoTiff(buf) {
  const le = buf.toString("latin1", 0, 2) === "II", u16 = o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o), u32 = o => le ? buf.readUInt32LE(o) : buf.readUInt32BE(o), f64 = o => le ? buf.readDoubleLE(o) : buf.readDoubleBE(o);
  u16(2) === 42 || galat("bukan TIFF klasik"); const ifd = u32(4), n = u16(ifd), T = {};
  for (let i = 0; i < n; i++) { const o = ifd + 2 + i * 12, tag = u16(o), tipe = u16(o + 2), cnt = u32(o + 4), sz = {3: 2, 4: 4, 12: 8, 2: 1}[tipe] || 1, ptr = cnt * sz <= 4 ? o + 8 : u32(o + 8);
    T[tag] = {tipe, cnt, ptr, nilai: i => tipe === 3 ? u16(ptr + 2 * i) : tipe === 4 ? u32(ptr + 4 * i) : tipe === 12 ? f64(ptr + 8 * i) : buf[ptr + i]}; }
  const w = T[256].nilai(0), h = T[257].nilai(0), tw = T[322].nilai(0), th = T[323].nilai(0), pred = T[317]?.nilai(0) ?? 1, komp = T[259].nilai(0), bits = T[258].nilai(0), fmt = T[339]?.nilai(0);
  (komp === 8 && bits === 32 && fmt === 3 && tw === th) || galat(`GeoTIFF tak didukung (kompresi ${komp}, bit ${bits}, format ${fmt})`);
  const off = Array.from({length: T[324].cnt}, (_, i) => T[324].nilai(i)), cnt = Array.from({length: T[325].cnt}, (_, i) => T[325].nilai(i)), tx = Math.ceil(w / tw);
  const skala = [T[33550].nilai(0), T[33550].nilai(1)], tie = [T[33922].nilai(3), T[33922].nilai(4)], nodata = T[42113] ? +buf.toString("latin1", T[42113].ptr, T[42113].ptr + T[42113].cnt - 1) : -9999;
  const keys = Array.from({length: T[34735].cnt}, (_, i) => T[34735].nilai(i)); let titik = false; for (let i = 4; i + 3 < keys.length; i += 4) if (keys[i] === 1025) titik = keys[i + 3] === 2;
  const cache = new Map(), tile = k => { let t = cache.get(k); if (!t) { t = dekodeTileFab(buf.subarray(off[k], off[k] + cnt[k]), tw, th, pred, le); cache.set(k, t); } return t; };
  return {w, h, skala, tie, nodata, titik, nilai(ix, iy) { if (ix < 0 || iy < 0 || ix >= w || iy >= h) return NaN; const k = Math.floor(iy / th) * tx + Math.floor(ix / tw); return tile(k)[(iy % th) * tw + (ix % tw)]; }};
}
/* FABDEM sampel bilinear di (lon, lat); ubin 1 derajat dimuat dari FAB_DIR bila ada. null/NaN bila di luar ubin atau nodata. Registrasi titik: sampel (0,0) tepat di sudut derajat. */
export function pembacaFabdem(dir = FAB_DIR) {
  const buka = new Map(), ubin = (lon0, lat0s) => { const nm = `${lat0s >= 0 ? "S" : "N"}${String(Math.abs(lat0s >= 0 ? lat0s : lat0s)).padStart(2, "0")}${lon0 >= 0 ? "E" : "W"}${String(Math.abs(lon0)).padStart(3, "0")}_FABDEM_V1-2.tif`;
    if (!buka.has(nm)) { const f = path.join(dir, nm); buka.set(nm, fs.existsSync(f) ? bukaGeoTiff(fs.readFileSync(f)) : null); } return buka.get(nm); };
  const nilai = (ix, iy) => { /* ix = bujur*3600 (timur), iy = -lintang*3600 (selatan), lintang < 0 */
    const dx = Math.floor(ix / 3600), dy = Math.floor(iy / 3600), t = ubin(dx, dy + 1); if (!t) return NaN; const v = t.nilai(ix - dx * 3600, iy - dy * 3600); return v === t.nodata ? NaN : v; };
  /* jendela piksel FABDEM [lon0,lon1]x[lat0,lat1] (lintang selatan) + median bergerak k x k (NaN dilewati) -> sampler bilinear pada raster tersaring */
  const jendela = (lon0, lon1, lat0, lat1, k = 1) => { const ix0 = Math.floor(lon0 * 3600) - 8, ix1 = Math.ceil(lon1 * 3600) + 8, iy0 = Math.floor(-lat1 * 3600) - 8, iy1 = Math.ceil(-lat0 * 3600) + 8, w = ix1 - ix0 + 1, h = iy1 - iy0 + 1, a = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = nilai(ix0 + x, iy0 + y);
    let d = a; if (k > 1) { const r = k >> 1, buf = new Float32Array(k * k); d = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let n = 0;
      for (let dy = -r; dy <= r; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue; for (let dx = -r; dx <= r; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; const v = a[yy * w + xx]; if (v === v) buf[n++] = v; } }
      if (a[y * w + x] !== a[y * w + x] || !n) { d[y * w + x] = NaN; continue; } const sub = buf.subarray(0, n).sort(); d[y * w + x] = sub[n >> 1]; } }
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? NaN : d[y * w + x];
    return {w, h, tinggi(lon, lat) { const fx = lon * 3600 - ix0, fy = -lat * 3600 - iy0, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, p = at(x0, y0), q = at(x0 + 1, y0), r2 = at(x0, y0 + 1), t = at(x0 + 1, y0 + 1);
      if ([p, q, r2, t].some(Number.isNaN)) return NaN; return (p * (1 - ax) + q * ax) * (1 - ay) + (r2 * (1 - ax) + t * ax) * ay; }}; };
  return {ada: () => !!ubin(106, 7), jendela, tinggi(lon, lat) { lat < 0 || galat("FABDEM dimuat hanya untuk lintang selatan"); const fx = lon * 3600, fy = -lat * 3600, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0,
    a = nilai(x0, y0), b = nilai(x0 + 1, y0), c = nilai(x0, y0 + 1), d = nilai(x0 + 1, y0 + 1); if ([a, b, c, d].some(Number.isNaN)) return NaN; return (a * (1 - ax) + b * ax) * (1 - ay) + (c * (1 - ax) + d * ax) * ay; }};
}

/* hulu dari TMA terukur + kurva debit Q = a (H - H0)^b (b ASUMSI), dua titik (H1,Q1), (H2,Q2) menentukan H0 dan a.
   H(t): titik TMA diberitakan (linear), sebelum titik pertama = normal sampai `awal_naik_wib` lalu naik linear ke titik pertama, sesudah puncak surut eksponensial ke normal
   dengan waktu paruh `paruh_surut_jam` (ASUMSI, surut belum bersumber). t = jam dari awal replay. */
export function kurvaDebit(H1, Q1, H2, Q2, b) { const r = (Q2 / Q1) ** (1 / b), H0 = (r * H1 - H2) / (r - 1), a = Q1 / (H1 - H0) ** b; return {a, H0, b, Q: H => H > H0 ? a * (H - H0) ** b : 0}; }
export function fungsiTma(T, jam0) {
  const kv = kurvaDebit(T.kurva.H1, T.kurva.Q1, T.kurva.H2, T.kurva.Q2, T.kurva.b), tj = w => (Date.parse(w + ":00+07:00") - jam0) / 3600e3, P = T.titik.map(x => ({t: tj(x.waktu_wib), h: x.tma_cm})).sort((p, q) => p.t - q.t), t0 = tj(T.awal_naik_wib), pk = P.reduce((m, x) => x.h > m.h ? x : m, P[0]);
  const H = t => { if (t <= t0) return T.normal_cm; if (t < P[0].t) return T.normal_cm + (P[0].h - T.normal_cm) * (t - t0) / (P[0].t - t0);
    for (let i = 1; i < P.length; i++) if (t <= P[i].t) return P[i - 1].h + (P[i].h - P[i - 1].h) * (t - P[i - 1].t) / (P[i].t - P[i - 1].t);
    return T.normal_cm + (pk.h - T.normal_cm) * .5 ** ((t - pk.t) / T.paruh_surut_jam); };
  return {H, Q: t => kv.Q(H(t)), kurva: {a: kv.a, H0: kv.H0, b: kv.b}, puncak_t: pk.t};
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
  const demT = await SG.ambilDEM(kk.lat, kk.lon, kk.sisi_m, kk.n, ambilDEMUbin), {nx, ny} = demT, N = nx * ny, K = {...demT}; delete K.z; let dem = demT;
  const [[w0, n0], , [e0, s0]] = K.sudut; log(`kisi ${nx}x${ny} dx ${fmt(K.dx)} m, zoom ${K.zoom}, bujur ${fmt(w0, 4)} sampai ${fmt(e0, 4)}, lintang ${fmt(n0, 4)} sampai ${fmt(s0, 4)}`);
  /* DEM model = FABDEM V1-2 (sampel bilinear di pusat sel); Terrarium (SRTM) cadangan bila ubin tak ada atau sel nodata */
  const fab = pembacaFabdem(), kMed = +(process.env.REPLAY_MEDIAN_K ?? kej.dem_median_k ?? 9), sumber = {dem: "", lahan: ""}; let zFab = null;
  if (fab.ada() && !process.env.REPLAY_TERRARIUM) { zFab = new Float64Array(N); let kosong = 0; const lons = K.sudut.map(p => p[0]), lats = K.sudut.map(p => p[1]), win = fab.jendela(Math.min(...lons) - .002, Math.max(...lons) + .002, Math.min(...lats) - .002, Math.max(...lats) + .002, kMed); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const [lo, la] = SG.dariSel(K, i, j), v = win.tinggi(lo, la); if (Number.isNaN(v)) { zFab[j * nx + i] = demT.z[j * nx + i]; kosong++; } else zFab[j * nx + i] = v; }
    dem = {...demT, z: zFab}; sumber.dem = `FABDEM V1-2 (Hawker dkk. 2022, Environ. Res. Lett. 17 024016; Copernicus GLO-30 dengan hutan dan gedung dibuang, 1 detik busur, geoid EGM2008), lisensi CC BY-NC-SA 4.0; median bergerak ${kMed}x${kMed} piksel 30 m sebelum disampel ke 60 m (ASUMSI: derau urban FABDEM RMSE sekitar 2-3 m, Hawker dkk. 2022; median menjaga tepi tanggul nyata); sel nodata diganti Terrarium: ${kosong}`; lap.dem = {nama: "FABDEM V1-2", median_k: kMed, lisensi: "CC BY-NC-SA 4.0", atribusi: "Hawker, L., Uhe, P., Paulo, L., Sosa, J., Savage, J., Sampson, C., Neal, J. (2022). A 30 m global map of elevation with forests and buildings removed. Environmental Research Letters 17, 024016", cadangan_terrarium_sel: kosong}; }
  else { sumber.dem = "Terrarium AWS (SRTM 30 m) lewat SimGenangan.ambilDEM (ubin FABDEM tidak ada)"; lap.dem = {nama: "Terrarium (SRTM)"}; }
  log("DEM model: " + sumber.dem.split(";")[0] + `, median ${kMed}x${kMed}`);
  { const demP = (zFab || demT.z), tt = SG.keSel(K, 106.94, -6.29), t2 = SG.keSel(K, 106.98, -6.29), j = Math.round(tt[1]), i0 = Math.round(tt[0]), i1 = Math.round(t2[0]), pr = []; for (let i = i0; i <= i1; i += 4) pr.push(+demP[j * nx + i].toFixed(1));
    let rg = 0; for (let i = i0 + 1; i <= i1; i++) rg += Math.abs(demP[j * nx + i] - demP[j * nx + i - 1]); lap.profil_dem = {lintang: -6.29, bujur: [106.94, 106.98], tiap_sel: 4, tinggi_m: pr, jumlah_naik_turun_m: +rg.toFixed(1), jumlah_naik_turun_per_sel_m: +(rg / (i1 - i0)).toFixed(2)};
    log(`  profil lintang -6,29 bujur 106,94-106,98 (tiap 4 sel = 240 m, m): ${pr.join(" ")} | jumlah |dz| per sel ${lap.profil_dem.jumlah_naik_turun_per_sel_m} m`); }
  const tempat = (lat, lon) => { const [fi, fj] = SG.keSel(K, lon, lat), i = Math.round(fi), j = Math.round(fj); return {i, j, dalam: i >= 0 && j >= 0 && i < nx && j < ny, k: j * nx + i}; };
  const cek = [...kej.area, ...kej.titik_pantau].map(a => ({nama: a.nama, ...tempat(a.lat, a.lon)}));
  if (zFab) for (const [nm, la, lo] of [["Pondok Gede Permai", -6.29, 106.956], ["Kampung Melayu", -6.224, 106.866], ["Bekasi Kota", -6.2349, 106.9896]]) { const t = tempat(la, lo); log(`  ${nm}: FABDEM ${fmt(zFab[t.k])} m, Terrarium ${fmt(demT.z[t.k])} m`); }
  const luar = cek.filter(c => !c.dalam); if (luar.length) galat("di luar kisi: " + luar.map(c => c.nama).join(", "));
  /* 1b gedung, pencarian, alur sungai (OpenFreeMap) */
  const pola = await urlUbinVektor(), f = 2 ** (ZB - K.zoom), tx0 = Math.floor(K.x0 * f / 256), ty0 = Math.floor(K.y0 * f / 256), tx1 = Math.floor((K.x0 + nx * K.s) * f / 256), ty1 = Math.floor((K.y0 + ny * K.s) * f / 256);
  const daftar = []; for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) daftar.push([tx, ty]);
  const lap2 = new Set(["building", "transportation_name", "place", "waterway"]);
  const ub = (await Promise.all(daftar.map(async ([tx, ty]) => { let b = await ambilCache(pola.replace("{z}", ZB).replace("{x}", tx).replace("{y}", ty), `ofm/${ZB}_${tx}_${ty}.pbf`);
    if (!b) return null; if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b); return {tx, ty, d: bukaMVT(b, lap2)}; }))).filter(Boolean);
  const V = agregatVektor(ub, K, SG); let totG = 0; for (let k = 0; k < N; k++) totG += V.gedung[k];
  log(`ubin vektor ${ub.length}/${daftar.length}, gedung ${totG}, nama jalan ${V.nJalan}, tempat ${V.nTempat}, pola ${pola.replace(/\/\d+\/\{z\}.*/, "")}`);
  lap.gedung = {ubin: `${ub.length}/${daftar.length}`, jumlah: totG, jalan: V.nJalan, tempat: V.nTempat};
  /* alur sungai dibakar ke DEM sebelum siapkanDEM; topeng laut dari DEM asli supaya alur tak menjadi 'laut' */
  const runs = rantaiAlur(V.alur, nx, ny), laut = SG.topengLaut(dem.z, nx, ny);
  /* 2 lahan */
  let cn, manning, domLahan = null;
  try { const L = await SL.kisiLahan(K, bacaPNGLahan, {cn: 80, n: .06});
    if (!L) throw new Error("kisiLahan menyerah (ubin gagal atau data kurang)");
    cn = L.cn; manning = L.n; domLahan = L.dom; sumber.lahan = `ESA WorldCover 2021 (Planetary Computer), ${L.ubin} ubin, sel tanpa data ${L.kosong}, gagal ${L.gagal}`; lap.lahan = {proporsi: Object.fromEntries(Object.entries(L.proporsi).map(([k, v]) => [k, +v.toFixed(4)])), kosong: L.kosong, gagal: L.gagal};
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
  const pMaks = kej.pengali_maks ?? 3, mult3 = b => Math.min(pMaks, mult(b)), erKisi = arealEra5(E, bobotKisi), hujan = arealEra5(E, bobotKisi, mult3, pre);
  lap.pengali_sel = pCell.map(c => ({...c, pengali: +c.pengali.toFixed(3)}));
  lap.hujan = {era5_area_mm: +sum(erKisi, pre, nTot).toFixed(1), area_mm: +sum(hujan, pre, nTot).toFixed(1), titik_era5: bobotKisi.map(b => ({lat: b.lat, lon: b.lon, w: +b.w.toFixed(3), pengali: +mult3(b).toFixed(3)}))}; lap.pengali_maks = {nilai: pMaks, alasan: "alat titik bukan rata-rata areal; Sumur Batu 208 mm adalah maksimum yang diberitakan; pengali sel kisi dan DAS antara dijepit"};
  const pKisi = lap.hujan.area_mm / lap.hujan.era5_area_mm; lap.hujan.pengali_area = +pKisi.toFixed(3);
  log(`hujan kisi 96 jam: ERA5 ${lap.hujan.era5_area_mm} mm, sesudah pengali ${lap.hujan.area_mm} mm (efektif x${fmt(pKisi, 2)})`);
  const a7 = sum(hujan, pre - 168, pre), amc = kej.amc ?? SG.kelasAMC(a7); lap.amc = {kelas: amc, a7_mm: +a7.toFixed(1)};
  const hj = hujan.slice(pre, pre + J), darat = Uint8Array.from(laut, v => v ? 0 : 1), dr = kej.drainase_mm_jam || {terbangun: 15, lainnya: 5}, drT = +(process.env.REPLAY_DRAINASE_T ?? dr.terbangun), drL = +(process.env.REPLAY_DRAINASE_L ?? dr.lainnya);
  /* limpasan efektif SCS-CN per CN, dikurangi kapasitas drainase per jam (terbangun drT, lainnya drL; tidak negatif) */
  const kunci = new Map(), seri = [], kelasSel = new Uint8Array(N), efCn = new Map(); let efSum = 0, nDar = 0;
  for (let k = 0; k < N; k++) { const c = Math.round(cn[k]), dd = domLahan && domLahan[k] === 50 ? drT : drL, kc = c * 100 + dd; let i = kunci.get(kc);
    if (i === undefined) { if (!efCn.has(c)) efCn.set(c, SG.limpasan(hj, c, amc).efektif); i = seri.length; kunci.set(kc, i); seri.push(Float64Array.from(efCn.get(c), v => Math.max(0, v - dd))); }
    kelasSel[k] = i; if (darat[k]) { nDar++; efSum += sum(seri[i], 0, J); } }
  seri.length <= 255 || galat("kelas limpasan > 255");
  const L = {seri, kelas: kelasSel, efektif_rata: efSum / nDar}; asumsi.drainase = `kapasitas drainase mengurangi limpasan efektif per jam: terbangun ${drT} mm/jam, lainnya ${drL} mm/jam (ASUMSI sesi induk; rujukan: saluran kota dirancang periode ulang 2-5 tahun sekitar 15-20 mm/jam, belum diverifikasi ke dokumen)`; lap.drainase = {terbangun_mm_jam: drT, lainnya_mm_jam: drL, sumber: dr.sumber ?? asumsi.drainase};
  log(`AMC ${amc} (a7 ${fmt(a7)} mm), CN rata-rata ${fmt(cn.reduce((a, c) => a + c, 0) / N)}, drainase ${drT}/${drL} mm/jam, limpasan efektif rata-rata ${fmt(L.efektif_rata)} mm dari hujan ${fmt(sum(hj, 0, J))} mm`); lap.limpasan_efektif_mm = +L.efektif_rata.toFixed(1);
  /* 4 sungai */
  const masuk = [], sungaiOut = {}, HAS = [];
  for (const d of DAS) {
    const mu = d.das.kalibrasi ? mult : mult3, er = arealEra5(E, d.bobot), hdFn = (arf, gs) => { const b0 = arealEra5(E, d.bobot, bb => mu(bb) * arf, pre); return gs ? Float64Array.from(b0, (_, t) => b0[t - gs] ?? 0) : b0; }, lf = (h, cn) => SG.limpasan(h, cn, amc);
    let par = {tc_jam: d.das.tc_jam, cn: d.das.cn, faktor_areal: d.das.faktor_areal ?? 1, geser_jam: 0}, kal = null;
    if (d.das.kalibrasi) { const kb = d.das.kalibrasi, sasaran = {puncak_m3s: kb.puncak_m3s, s: Math.round((Date.parse(kb.jam_puncak_wib + ":00+07:00") - jam0) / 3600e3), lebar_jam: kb.lebar_jam ?? 3};
      kal = kalibrasiDAS(lf, hdFn, d.das.luas_km2, d.das.aliran_dasar_m3s, pre, J, sasaran, kb.bebas, par); const awal0 = {...par}; par = {tc_jam: kal.tc_jam, cn: kal.cn, faktor_areal: kal.faktor_areal, geser_jam: kal.geser_jam};
      kal = {sasaran, bebas: kb.bebas, awal: awal0, hasil: par, puncak_hasil_m3s: +kal.puncak_m3s.toFixed(1), jam_puncak_hasil: kal.jam_puncak, galat: +kal.galat.toFixed(4), sumber: kb.sumber, catatan: "dikalibrasi ke laporan, bukan prediksi bebas"}; }
    const hd = hdFn(par.faktor_areal, par.geser_jam), pg = sum(hd, pre, nTot) / Math.max(1e-9, sum(er, pre, nTot));
    const lim = lf(hd, par.cn), h = hidrografDAS(lim.efektif, d.das.luas_km2, par.tc_jam, d.das.aliran_dasar_m3s, 1, nTot + 120); let q = h.q.slice(pre, pre + J + 1), hulu = null;
    const volEf = sum(lim.efektif, 0, nTot) * 1000 * d.das.luas_km2, volHid = (sum(h.q, 0, nTot + 120) - d.das.aliran_dasar_m3s * (nTot + 120)) * 3600, qLateral = q;
    if (d.hulu_terukur) { const H = d.hulu_terukur, F = fungsiHulu(kej.linimasa_pos, H, jam0), tempuh = (Date.parse(H.tiba_tepi_wib + ":00+07:00") - Date.parse(H.acuan_wib + ":00+07:00")) / 3600e3;
      const qh = Float64Array.from({length: J + 1}, (_, t) => F.f(t - tempuh)); q = Float64Array.from(qLateral, (v, t) => v + qh[t]);
      hulu = {pos: H.pos, luas_hulu_km2: H.luas_hulu_km2, tempuh_jam: tempuh, acuan_wib: H.acuan_wib, tiba_tepi_wib: H.tiba_tepi_wib, rating_tma_debit: F.rating, titik: F.titik.map(x => ({t_jam: +x.t.toFixed(2), q_m3s: +x.q.toFixed(1), diukur: x.diukur})),
        ekor: {plateau_jam: H.plateau_jam ?? 2, paruh_jam: H.paruh_jam ?? 8, dasar_m3s: H.dasar_m3s, catatan: "ekor sesudah ukuran terakhir adalah ASUMSI"}, puncak_hulu_m3s: +mx(qh).toFixed(1), jam_puncak_hulu: qh.indexOf(mx(qh)), sumber: H.sumber, hidrograf_m3s: Array.from(qh, v => +v.toFixed(1))}; }
    let fQ = null;
    if (d.tma_terukur) { const T = d.tma_terukur, F = fungsiTma(T, jam0), qm = q; fQ = F.Q; q = Float64Array.from({length: J + 1}, (_, t) => F.Q(t));
      hulu = {jenis: "tma", pos: T.pos, normal_cm: T.normal_cm, kurva: {a: +F.kurva.a.toFixed(5), H0_cm: +F.kurva.H0.toFixed(1), b: F.kurva.b, titik_kalibrasi: T.kurva, sumber: T.kurva.sumber}, titik: T.titik, awal_naik_wib: T.awal_naik_wib, paruh_surut_jam: T.paruh_surut_jam,
        catatan: "debit dari TMA terukur lewat kurva debit asumsi (b 1,6); waktu tempuh pos ke tepi kisi diabaikan (pos dekat); naik dari normal sebelum 400 cm dan surut sesudah puncak adalah ASUMSI (belum bersumber); tanpa kalibrasi ERA5", puncak_m3s: +mx(q).toFixed(1), jam_puncak: q.indexOf(mx(q)), q_model_das_puncak_m3s: +mx(qm).toFixed(1), sumber: T.sumber, hidrograf_m3s: Array.from(q, v => +v.toFixed(1))}; }
    HAS.push({d, par, kal, hulu, h, pg, er, hd, lim, volEf, volHid, qLateral, q, fQ});
  }
  /* 5 alur: kedalaman bakar dari kapasitas penuh-tepi (Manning), lalu kontinuitas, lalu sel masuk */
  const AB = kej.alur_bankfull, qDas = id => HAS.find(x => x.d.id === id).q, qPada = (q, tWib) => { const t = (Date.parse(tWib + ":00+07:00") - jam0) / 3600e3, a = Math.floor(t), f = t - a; return q[a] + (q[Math.min(J, a + 1)] - q[a]) * f; };
  const kelompok = AB.kelompok.map(g => { const rx = new RegExp(g.regex, "i"); let Q = g.qbf_m3s ?? null; if (g.qbf_dari_hidrograf) { const hs = HAS.find(x => x.d.id === g.qbf_dari_hidrograf.sungai), tt = (Date.parse(g.qbf_dari_hidrograf.waktu_wib + ":00+07:00") - jam0) / 3600e3; Q = hs.fQ ? hs.fQ(tt) : qPada(hs.q, g.qbf_dari_hidrograf.waktu_wib); } return {...g, rx, Q, cabang: (g.cabang || []).map(c => ({...c, rx: new RegExp(c.regex, "i")}))}; });
  const qbfRun = r => { const g = kelompok.find(x => x.rx.test(r.nama)); if (!g || r.kelas === "canal") return null; const c = g.cabang.find(x => x.rx.test(r.nama)); return g.Q * (c ? c.bagi : 1); };
  const bakar = bakarAlur(dem.z, nx, ny, runs, DALAM_ALUR, {dx: K.dx, n: AB.n_manning, sMin: AB.lereng_min, qbf: qbfRun}), z = SG.siapkanDEM(bakar.z, nx, ny, SG.benihTepi(nx, ny, laut));
  let nAlur = 0; for (let k = 0; k < N; k++) nAlur += bakar.mask[k];
  const ringDalam = Object.fromEntries(kelompok.map(g => { const v = bakar.runs.filter(r => r.qbf && g.rx.test(r.nama)).flatMap(r => r.dalam).sort((a, b) => a - b); return [g.id, {qbf_m3s: g.Q, dalam_median_m: v.length ? +v[v.length >> 1].toFixed(2) : null, dalam_p10_m: v.length ? +v[Math.floor(v.length * .1)].toFixed(2) : null, dalam_p90_m: v.length ? +v[Math.floor(v.length * .9)].toFixed(2) : null, sel: v.length, sumber: g.sumber}]; }));
  log(`dasar alur dinaikkan demi kontinuitas: ${bakar.naik} sel`);
  log(`DEM: ${fmt(mn(dem.z))} sampai ${fmt(mx(dem.z))} m, sel laut ${laut.reduce((a, c) => a + c, 0)}, alur dibakar ${runs.length} rantai ${nAlur} sel (lebar 1 sel)`);
  for (const g of kelompok) log(`  alur ${g.id}: Qbf ${fmt(g.Q)} m3/dtk, dalam median ${ringDalam[g.id].dalam_median_m} m (p10 ${ringDalam[g.id].dalam_p10_m}, p90 ${ringDalam[g.id].dalam_p90_m}), ${ringDalam[g.id].sel} sel`);
  lap.alur = {rantai: runs.length, sel: nAlur, lebar_sel: 1, n_manning: AB.n_manning, lereng_min: AB.lereng_min, dalam_tabel_m: DALAM_ALUR, bankfull: ringDalam, rumus: "d = (Qbf n / (dx sqrt(S)))^(3/5), saluran persegi selebar dx", sumber: "OpenFreeMap waterway river/canal + stream bernama (Bekasi, Cileungsi, Cikeas, Ciliwung, Sunter, Cipinang); kelompok di luar Kali Bekasi/Ciliwung: river 3 m (asumsi), canal 3 m, stream 2 m"};
  for (const {d, par, kal, hulu, h, pg, er, hd, lim, volEf, volHid, qLateral, q} of HAS) {
    const tid = d.masuk.alur.map(a => { const c = cariMasuk(bakar, nx, ny, new RegExp(a.regex, "i"), 12, d.masuk.baris_dari_tepi ?? 4); c || galat(`alur masuk ${a.regex} tak ditemukan di tepi selatan`); return {...a, c}; });
    for (const a of tid) for (const k of a.c.sel) masuk.push({k, q: Float64Array.from(q, v => v * a.bagi / a.c.sel.length)});
    sungaiOut[d.id] = {nama: d.nama, luas_km2: d.das.luas_km2, cn: par.cn, tc_jam: par.tc_jam, parameter: par, kalibrasi: kal, hulu_terukur: hulu, tp_jam: +h.Tp.toFixed(2), tb_jam: +h.Tb.toFixed(2), pengali: +pg.toFixed(3), era5_mm: +sum(er, pre, nTot).toFixed(1), hujan_mm: +sum(hd, pre, nTot).toFixed(1),
      efektif_mm: +sum(lim.efektif, pre, nTot).toFixed(1), puncak_m3s: +mx(q).toFixed(1), jam_puncak: q.indexOf(mx(q)), q_lateral_puncak_m3s: +mx(qLateral).toFixed(1), volume_efektif_m3: Math.round(volEf), volume_hidrograf_m3: Math.round(volHid),
      masuk: tid.map(a => ({alur: a.c.nama, bagi: a.bagi, sel: a.c.sel.map(k => ({i: k % nx, j: (k / nx) | 0, z_m: +z[k].toFixed(2)}))})), bobot_era5: d.bobot.length, hidrograf_m3s: Array.from(q, v => +v.toFixed(1)), sumber: d.das.sumber, sementara: !!d.das.sementara};
    log(`${d.nama}: hujan DAS ${sungaiOut[d.id].hujan_mm} mm (x${fmt(pg, 2)}), tc ${par.tc_jam} cn ${par.cn}${kal ? " (kalibrasi)" : ""}${hulu ? (hulu.jenis === "tma" ? `, debit dari TMA ${hulu.pos} (kurva asumsi)` : `, hulu Katulampa puncak ${hulu.puncak_hulu_m3s} m3/s digeser ${fmt(hulu.tempuh_jam)} jam`) : ""}, puncak masuk ${sungaiOut[d.id].puncak_m3s} m3/s jam ke-${sungaiOut[d.id].jam_puncak}, masuk di ${tid.map(a => a.c.nama + " sel " + a.c.i + "," + a.c.j).join("; ")}`);
  }
  /* 6 simulasi */
  const cfg = {nx, ny, dx: K.dx, z, laut, manning, jam: J, hujanKelas: L.seri, kelas: L.kelas, masuk}, tSim = Date.now();
  if (laut.some(v => v)) { cfg.muka = SG.pasang(Array(J / 24).fill(.6)); asumsi.muka_laut = "ada sel laut: muka laut 0,6 m + pasang M2 rentang 1 m (asumsi, tidak diriset)"; }
  const R = SG.jalankan(cfg, p => { if (Math.round(p * J) % 12 === 0) process.stderr.write(`  simulasi ${Math.round(p * 100)} %\r`); });
  log(`simulasi ${fmt((Date.now() - tSim) / 1000)} dtk, ${R.langkah} langkah, galat neraca ${(R.neraca.galat * 100).toFixed(4)} %`);
  const ked = R.kedalaman;
  /* 7a tinggi air sungai (relatif dasar alur) di titik pantau diambil SEBELUM kedalaman diubah ke genangan di atas tanah */
  /* 7 ringkasan per jam, sel basah, biner */
  const A = K.dx * K.dx, jamRing = [], pantau = kej.titik_pantau.map(p => { const t = tempat(p.lat, p.lon), rx = p.alur ? new RegExp(p.alur, "i") : null, alurRegex = new Set(rx ? bakar.runs.filter(r => rx.test(r.nama)).flatMap(r => r.sel) : []); let best = -1, bd = Infinity, rendah = t.k;
    for (let dj = -p.radius_sel; dj <= p.radius_sel; dj++) for (let di = -p.radius_sel; di <= p.radius_sel; di++) { const i = t.i + di, j = t.j + dj; if (i < 0 || j < 0 || i >= nx || j >= ny) continue; const k = j * nx + i, d2 = di * di + dj * dj; if (z[k] < z[rendah]) rendah = k; if (bakar.mask[k] && d2 < bd && (!rx || alurRegex.has(k))) { bd = d2; best = k; } }
    if (best < 0) best = rendah; /* alur terdekat; tanpa alur = sel terendah */
    return {...p, k: best, i: best % nx, j: (best / nx) | 0, z_dasar_m: +z[best].toFixed(2), di_alur: !!bakar.mask[best]}; });
  const mukaSungai = Object.fromEntries(pantau.map(p => [p.id, Array.from({length: J}, (_, u) => +ked[(u + 1) * N + p.k].toFixed(2))]));
  /* sel alur: kedalaman = muka air di atas tepi alur (genangan limpas), bukan isi alur; sel bukan alur tetap kedalaman di atas tanah */
  for (let k = 0; k < N; k++) if (bakar.mask[k]) for (let s = 1; s <= J; s++) { const o = s * N + k; ked[o] = Math.max(0, z[k] + ked[o] - bakar.tepi[k]); }
  const hmaksCm = new Uint16Array(N), jamMaks = new Uint8Array(N); let sbm = 0;
  for (let s = 1; s <= J; s++) { let lu = 0, ge = 0; const o = s * N;
    for (let k = 0; k < N; k++) { const h = ked[o + k], cm = Math.round(h * 100); if (h >= .1) { lu += A; ge += V.gedung[k]; } if (cm > hmaksCm[k]) { hmaksCm[k] = Math.min(65535, cm); jamMaks[k] = s; } }
    jamRing.push({s, waktu: new Date(jam0 + s * 3600e3).toISOString().replace("Z", "+00:00"), luas_km2: +(lu / 1e6).toFixed(3), gedung: ge, hujan_mm: +hj[s - 1].toFixed(2),
      pantau: Object.fromEntries(pantau.map(p => [p.id, mukaSungai[p.id][s - 1]]))}); }
  const wibStr = ms => new Date(ms + WIB).toISOString().slice(0, 16), lonlatSel = (i, j) => SG.dariSel(K, i, j).map(v => +v.toFixed(5));
  const urut = Array.from({length: N}, (_, k) => k).filter(k => !laut[k] && hmaksCm[k] >= 10).sort((a, b) => hmaksCm[b] - hmaksCm[a]), terdalam = [];
  for (const k of urut) { if (terdalam.length >= 10) break; const i = k % nx, j = (k / nx) | 0; if (terdalam.every(c => Math.hypot(c.i - i, c.j - j) >= 10)) terdalam.push({i, j, lonlat: lonlatSel(i, j), cm: hmaksCm[k], s: jamMaks[k], waktu_wib: wibStr(jam0 + jamMaks[k] * 3600e3)}); }
  const areaOut = kej.area.map(a => { const t = tempat(a.lat, a.lon); let m = 0, ms = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = t.i + di, j = t.j + dj; if (i >= 0 && j >= 0 && i < nx && j < ny && hmaksCm[j * nx + i] > m) { m = hmaksCm[j * nx + i]; ms = jamMaks[j * nx + i]; } }
    return {id: a.id, nama: a.nama, lat: a.lat, lon: a.lon, i: t.i, j: t.j, hmaks_3x3_cm: m, jam_hmaks: ms, waktu_hmaks_wib: ms ? wibStr(jam0 + ms * 3600e3) : null, tinggi_tanah_m: +(demT && zFab ? zFab[t.k] : dem.z[t.k]).toFixed(1)}; });
  const basah = []; for (let k = 0; k < N; k++) if (hmaksCm[k] >= 1) basah.push(k);
  const M = basah.length, dalam = new Uint16Array(M * J);
  for (let s = 1; s <= J; s++) { const o = s * N; for (let m = 0; m < M; m++) dalam[(s - 1) * M + m] = Math.min(65535, Math.round(ked[o + basah[m]] * 100)); }
  const demDm = new Int16Array(N); for (let k = 0; k < N; k++) demDm[k] = Math.round(dem.z[k] * 10);
  const dom = new Uint8Array(N); /* kelas dominan tak tersedia dari ringkasan; tidak disimpan */
  const {buf, tabel} = kemasBiner([["indeks", "Uint32", Uint32Array.from(basah)], ["dalam_delta_cm", "Int16", kodeDelta(dalam, M, J)], ["hmaks_cm", "Uint16", hmaksCm], ["jam_hmaks", "Uint8", jamMaks], ["dem_dm", "Int16", demDm], ["gedung", "Uint16", V.gedung]]); void dom;
  const gz = zlib.gzipSync(buf, {level: 9}); fs.mkdirSync(KELUAR, {recursive: true});
  fs.writeFileSync(path.join(KELUAR, `${kej.id}.bin.gz`), gz);
  fs.writeFileSync(path.join(KELUAR, `${kej.id}_cari.json`), JSON.stringify({id: kej.id, kolom: ["nama", "jenis (0 jalan, 1 tempat)", "lon", "lat", "kelurahan (indeks wilayah, -1 kosong)", "kota (indeks wilayah)", "kelas OSM"], wilayah: V.wilayah, baris: V.baris}));
  const geo = geokodeUlang(kej.laporan, {baris: V.baris, wilayah: V.wilayah}); log(`geokode ulang: ${geo.ringkas.osm_place} osm_place, ${geo.ringkas.osm_jalan} osm_jalan, ${geo.ringkas.tak_cocok} tak cocok (tetap perkiraan), ${geo.ringkas.nominatim} nominatim; geser median ${geo.ringkas.geser_median_km} km`);
  const {validasi, ringkasValidasi} = validasiLengkap({kej, laporan: geo.laporan, J, jam0, nx, ny, K, SG, ked, hmaksCm, A, pantau, mukaSungai}, log);
  /* 9 JSON meta */
  const puncakLuas = jamRing.reduce((b, r) => r.luas_km2 > b.luas_km2 ? r : b, jamRing[0]);
  const meta = {id: kej.id, judul: kej.judul, dibuat: new Date().toISOString(), mulai: kej.mulai, jam: J, jam_catatan: "indeks s = 1..jam; kondisi s ada pada mulai + s jam; kedalaman cm sel indeks[m] pada s = jumlah kumulatif dalam_delta_cm[m*jam .. m*jam + s-1]",
    kisi: {nx, ny, dx_m: +K.dx.toFixed(3), zoom: K.zoom, s: K.s, x0: K.x0, y0: K.y0, sudut_lonlat: K.sudut, pusat: {lat: kk.lat, lon: kk.lon}, sisi_m: K.sisi, baris0: "utara", sel_ke_lonlat: "dunia = (x0 + (i+0,5) s, y0 + (j+0,5) s) piksel Mercator 256 px zoom `zoom`; sama dengan SimGenangan.dariSel"},
    biner: {berkas: `${kej.id}.bin.gz`, kompresi: "gzip", urutan_byte: "little-endian", ukuran_mentah: buf.length, ukuran_gz: gz.length, bagian: tabel,
      keterangan: {indeks: "indeks sel (j*nx+i) yang pernah >= 1 cm", dalam_delta_cm: "int16, sel-major [m*jam + (s-1)] = kedalaman_cm(s) - kedalaman_cm(s-1), kedalaman_cm(0) = 0; dekode = jumlah kumulatif per sel; m = urutan di indeks", hmaks_cm: "uint16 cm per sel seluruh kisi (maks dari kondisi per jam)", jam_hmaks: "uint8, s saat hmaks, 0 = tak pernah >= 0,5 cm", dem_dm: "int16 desimeter, DEM model (FABDEM, tanpa bakar alur dan isi cekungan)", gedung: "uint16 jumlah gedung per sel"}},
    cari: {berkas: `${kej.id}_cari.json`},
    mm_area_jam: Array.from(hj, v => +v.toFixed(2)), muka_sungai_m: mukaSungai, muka_sungai_catatan: "kedalaman air (m) di sel alur titik pantau, relatif dasar alur hasil bakar (isi alur, bukan genangan); indeks u = jam s=u+1", genangan_terdalam: terdalam, alur: lap.alur, drainase: lap.drainase, pengali_maks: lap.pengali_maks,
    ringkasan: {tergenang_ambang_cm: 10, jam_luas_puncak: puncakLuas.s, luas_puncak_km2: puncakLuas.luas_km2, gedung_puncak: Math.max(...jamRing.map(r => r.gedung)), hmaks_cm: mx(hmaksCm), sel_basah: M, per_jam: jamRing},
    sumber, lisensi_dem: lap.dem, profil_dem: lap.profil_dem, penyebab: kej.penyebab, area: areaOut, lahan: lap.lahan, hujan: lap.hujan, amc: lap.amc, limpasan_efektif_mm: lap.limpasan_efektif_mm, gedung: lap.gedung,
    pengali: {per_sel_era5: lap.pengali_sel, stasiun: kej.stasiun, aturan: "satu pengali per sel ERA5 = jumlah alat ukur / jumlah ERA5 sel itu pada jendela alat; sel tanpa alat = IDW dari sel beralat"}, rujukan: {linimasa_pos: kej.linimasa_pos, dampak: kej.dampak, validasi_luas: kej.validasi_luas, laporan_semua: geo.laporan}, sungai: sungaiOut, titik_pantau: pantau.map(p => ({id: p.id, nama: p.nama, i: p.i, j: p.j, lonlat: lonlatSel(p.i, p.j), z_dasar_m: p.z_dasar_m, di_alur: p.di_alur, sementara: !!p.sementara})),
    neraca: R.neraca, langkah: R.langkah, validasi: {ringkas: ringkasValidasi, laporan: validasi}, geokode: geo.ringkas,
    asumsi: {genangan: "SimGenangan inersia lokal Bates 2010; cekungan DEM dangkalkan <= 0,5 m; tanggul/saluran kecil tak terlihat di SRTM 30 m",
      hujan: "ERA5 per jam dikali pengali tetap per area (IDW stasiun); bentuk hietograf = ERA5",
      sungai: "DAS terkumpul: SCS-CN kumulatif + hidrograf satuan segitiga SCS, Tp = D/2 + 0,6 Tc (D 1 jam), aliran dasar konstan; debit dibagi rata ke sel DEM terendah di jendela tepi selatan, bukan alur sungai asli",
      gedung: "titik berat gedung OpenFreeMap z14, hanya bila titik berat dalam ubin; 'air di pintu' = sel >= 10 cm",
      pencarian: "kelurahan = place (suburb/quarter/neighbourhood/village) terdekat <= 3 km, kota = town/city terdekat; kecamatan resmi tidak ada di OpenFreeMap", ...asumsi,
      kejadian: "Waktu, tempat, dan kedalaman laporan dari media dan BPBD; sebagian angka di model (luas DAS, CN, waktu surut) masih asumsi sementara."},
    waktu_hitung_dtk: +((Date.now() - t0) / 1000).toFixed(1), waktu_simulasi_dtk: +((Date.now() - tSim) / 1000).toFixed(1)};
  lengkapiMeta(meta, kej); const js = JSON.stringify(meta); fs.writeFileSync(path.join(KELUAR, `${kej.id}.json`), js);
  const ukur = n => fs.statSync(path.join(KELUAR, n)).size;
  log(`keluaran: ${kej.id}.json ${(ukur(`${kej.id}.json`) / 1024).toFixed(0)} KB, ${kej.id}.bin.gz ${(ukur(`${kej.id}.bin.gz`) / 1024).toFixed(0)} KB (mentah ${(buf.length / 1048576).toFixed(1)} MB, sel basah ${M}), ${kej.id}_cari.json ${(ukur(`${kej.id}_cari.json`) / 1024).toFixed(0)} KB; waktu hitung ${meta.waktu_hitung_dtk} dtk`);
  return meta;
}

/* validasi laporan lawan kedalaman model (ked = Float32Array (J+1)*N dalam meter). Dipakai jalan penuh dan penghitungan ulang dari biner. */
export function validasiLengkap({kej, laporan, J, jam0, nx, ny, K, SG, ked, hmaksCm, A, pantau, mukaSungai}, log = () => {}) {
  const N = nx * ny, wibStr = ms => new Date(ms + WIB).toISOString().slice(0, 16), lonlatSel = (i, j) => SG.dariSel(K, i, j).map(v => +v.toFixed(5));
  const tempat = (lat, lon) => { const [fi, fj] = SG.keSel(K, lon, lat), i = Math.round(fi), j = Math.round(fj); return {i, j, dalam: i >= 0 && j >= 0 && i < nx && j < ny, k: j * nx + i}; };
  /* 8 validasi */
  const jamKe = w => Math.max(1, Math.min(J, Math.round((Date.parse(w) - jam0) / 3600e3))), validasi = [], di3 = (t, s) => { let m = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = t.i + di, j = t.j + dj; if (i >= 0 && j >= 0 && i < nx && j < ny) m = Math.max(m, ked[s * N + j * nx + i]); } return m; };
  for (const l of laporan) { const t = tempat(l.lat, l.lon);
    if (!t.dalam) { validasi.push({id: l.id, nama: l.nama, di_kisi: false}); continue; }
    let s = null, mm = 0, sm = 1; for (let u = 1; u <= J; u++) if (ked[u * N + t.k] > mm) { mm = ked[u * N + t.k]; sm = u; }
    let m3m = 0; for (let u = 1; u <= J; u++) m3m = Math.max(m3m, di3(t, u));
    const jenis = l.waktu ? "jam" : "hmaks"; s = l.waktu ? jamKe(l.waktu) : sm;
    const c = ked[s * N + t.k] * 100, m3 = di3(t, s) * 100, d = l.kedalaman_cm;
    const jak = (kej.laporan_jaktim_10 || []).includes(l.id) && l.waktu; let ex = {}; if (jak) { const s12 = jamKe(l.waktu.slice(0, 11) + "12:00:00+07:00"), c12 = ked[s12 * N + t.k] * 100, m12 = di3(t, s12) * 100; ex = {bertentangan_kalibrasi: true, s_12: s12, model_cm_12: +c12.toFixed(1), model_3x3_cm_12: +m12.toFixed(1), tergenang_12: c12 >= 10, tergenang_3x3_12: m12 >= 10}; }
    const kelLok = l.lokasi.startsWith("osm") ? "tepat" : l.lokasi === "nominatim_administrative" ? "pusat_kelurahan" : l.lokasi.startsWith("nominatim") ? "nominatim_lain" : "perkiraan";
    const pertama = f => { for (let u = 1; u <= J; u++) { const v = f(u) * 100; if (v >= 10) { const p = u === 1 ? 0 : f(u - 1) * 100, frac = v > p ? (10 - p) / (v - p) : 1; return wibStr(jam0 + (u - 1 + frac) * 3600e3); } } return null; };
    validasi.push({id: l.id, nama: l.nama, di_kisi: true, lokasi: l.lokasi, kelompok: (kej.laporan_kalibrasi || []).includes(l.id) ? "kalibrasi" : "bebas", kelompok_lokasi: kelLok, ...ex, geser_km: l.geser_km ?? 0, lat: l.lat, lon: l.lon, jenis_waktu: jenis, waktu: l.waktu, s, sel: [t.i, t.j], model_cm: +c.toFixed(1), model_3x3_cm: +m3.toFixed(1), model_maks_96j_cm: +(mm * 100).toFixed(1), model_3x3_maks_96j_cm: +(m3m * 100).toFixed(1),
      laporan_cm: d, selisih_cm: d == null ? null : +(c - d).toFixed(1), selisih_3x3_cm: d == null ? null : +(m3 - d).toFixed(1), tergenang: c >= 10, tergenang_3x3: m3 >= 10, tergenang_maks: mm >= .1,
      waktu_model_wib: wibStr(jam0 + s * 3600e3), lonlat_sel: lonlatSel(t.i, t.j), air_pertama_10cm_wib: pertama(u => ked[u * N + t.k]), air_pertama_10cm_3x3_wib: pertama(u => di3(t, u))}); }
  const dk = validasi.filter(v => v.di_kisi), cocok = v => !v.lokasi.startsWith("perkiraan") && v.kelompok === "bebas", pod = (f, k) => { const a = dk.filter(f); return a.length ? +(a.filter(v => v[k]).length / a.length).toFixed(3) : null; }, banyak = f => dk.filter(f).length;
  const selisih = (k, f = cocok) => { const a = dk.filter(v => v[k] != null && f(v)); return {n: a.length, bias_cm: a.length ? +(a.reduce((x, v) => x + v[k], 0) / a.length).toFixed(1) : null, mae_cm: a.length ? +(a.reduce((x, v) => x + Math.abs(v[k]), 0) / a.length).toFixed(1) : null}; };
  /* luas Kota Bekasi (poligon kasar dari masukan) lawan survei ITB; kedalaman maks lawan 3,32 m */
  const poli = kej.kota_bekasi_poligon.titik, dalamPoli = (x, y) => { let r = false; for (let a = 0, b = poli.length - 1; a < poli.length; b = a++) { const [xa, ya] = poli[a], [xb, yb] = poli[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) r = !r; } return r; };
  let selB = 0, selB30 = 0, dmaksB = 0, nB = 0; for (let k = 0; k < N; k++) { const [lo, la] = SG.dariSel(K, k % nx, (k / nx) | 0); if (!dalamPoli(lo, la)) continue; nB++; if (hmaksCm[k] >= 10) selB++; if (hmaksCm[k] >= 30) selB30++; dmaksB = Math.max(dmaksB, hmaksCm[k]); }
  const ha = c => +(c * A / 1e4).toFixed(0), luasB = {poligon: kej.kota_bekasi_poligon.catatan, luas_poligon_ha: ha(nB), tergenang_ge10cm_hmaks_ha: ha(selB), tergenang_ge30cm_hmaks_ha: ha(selB30), kedalaman_maks_m: +(dmaksB / 100).toFixed(2), itb: {survei_ha: 380, survei_maks_m: 3.32, simulasi_itb_ha: 720, simulasi_itb_maks_m: 3.51}};
  /* puncak muka air model di titik pantau lawan laporan pos */
  const puncakPantau = pantau.map(p => { const v = mukaSungai[p.id], b = mx(v), bs = v.indexOf(b) + 1; return {id: p.id, nama: p.nama, muka_maks_m_relatif_dasar_alur: +b.toFixed(2), s: bs, waktu_wib: wibStr(jam0 + bs * 3600e3), di_alur: p.di_alur}; });
  const podSet = f => { const a = dk.filter(f), p = k => a.length ? +(a.filter(v => v[k]).length / a.length).toFixed(3) : null; return {n: a.length, pod_sel: p("tergenang"), pod_3x3: p("tergenang_3x3"), pod_maks_96j: p("tergenang_maks")}; };
  const bebasK = v => v.kelompok === "bebas", jakK = dk.filter(v => v.bertentangan_kalibrasi), pj = k => jakK.length ? +(jakK.filter(v => v[k]).length / jakK.length).toFixed(3) : null;
  const ringkasValidasi = {n_laporan: validasi.length, n_di_kisi: dk.length, n_di_luar_kisi: validasi.length - dk.length, pod_10cm: pod(cocok, "tergenang"), pod_10cm_3x3: pod(cocok, "tergenang_3x3"), pod_10cm_maks_96j: pod(cocok, "tergenang_maks"), n_utama: banyak(cocok),
    kelompok_kalibrasi: podSet(v => v.kelompok === "kalibrasi"), bebas_semua: podSet(bebasK), per_lokasi_bebas: {tepat: podSet(v => bebasK(v) && v.kelompok_lokasi === "tepat"), pusat_kelurahan: podSet(v => bebasK(v) && v.kelompok_lokasi === "pusat_kelurahan"), nominatim_lain: podSet(v => bebasK(v) && v.kelompok_lokasi === "nominatim_lain"), perkiraan: podSet(v => bebasK(v) && v.kelompok_lokasi === "perkiraan")},
    jakarta_timur_10: {n: jakK.length, bertentangan_kalibrasi: true, pod_jam_laporan_10: pj("tergenang"), pod_3x3_jam_laporan_10: pj("tergenang_3x3"), pod_12: pj("tergenang_12"), pod_3x3_12: pj("tergenang_3x3_12"), catatan: "laporan BPBD DKI kelurahan berjam 10.00 bertentangan dengan kalibrasi waktu tempuh Ciliwung ke sekitar 12.00 di Jakarta Timur; dinilai di dua jam dan keduanya disimpan"},
    pod_tak_cocok_10cm: pod(v => !cocok(v), "tergenang"), pod_tak_cocok_10cm_3x3: pod(v => !cocok(v), "tergenang_3x3"), pod_tak_cocok_10cm_maks_96j: pod(v => !cocok(v), "tergenang_maks"), n_tak_cocok: banyak(v => !cocok(v)),
    pod_semua_10cm: pod(() => true, "tergenang"), pod_semua_10cm_3x3: pod(() => true, "tergenang_3x3"), pod_semua_10cm_maks_96j: pod(() => true, "tergenang_maks"),
    pod_osm_10cm: pod(v => v.lokasi.startsWith("osm"), "tergenang"), pod_osm_10cm_3x3: pod(v => v.lokasi.startsWith("osm"), "tergenang_3x3"), n_osm: banyak(v => v.lokasi.startsWith("osm")),
    pod_10cm_geokode_nominatim: pod(v => v.lokasi.startsWith("nominatim"), "tergenang"), n_geokode_nominatim: banyak(v => v.lokasi.startsWith("nominatim")), 
    pod_10cm_laporan_ber_jam: pod(v => v.jenis_waktu === "jam", "tergenang"), n_ber_jam: banyak(v => v.jenis_waktu === "jam"),
    selisih_sel: selisih("selisih_cm"), selisih_3x3: selisih("selisih_3x3_cm"), selisih_sel_semua: selisih("selisih_cm", () => true), luas_kota_bekasi: luasB, puncak_pantau: puncakPantau,
    catatan: "POD utama = laporan BEBAS (bukan laporan kalibrasi Jatiasih 23.42-23.46 dan PGP 00.10) yang lokasinya Nominatim atau hasil geokode ulang OSM; laporan tak cocok di indeks OSM tetap perkiraan dan dihitung terpisah (pod_tak_cocok); laporan kalibrasi dihitung terpisah (kelompok_kalibrasi). model_cm = sel laporan pada jam laporan (hmaks bila jam tak disebut); 3x3 = maksimum 9 sel (galat posisi laporan sampai ~1 km dan DEM 30 m); laporan 'perkiraan_peneliti' bisa meleset ~1 km (geokode ulang ke OSM menggeser median 2,34 km). Tidak ada lagi kalibrasi ERA5 ke puncak: hidrograf Kali Bekasi dari TMA terukur dan kurva debit asumsi, Qbf dikalibrasi ke SATU waktu laporan (Jatiasih 23.42), Ciliwung memakai debit Katulampa terukur dengan waktu tempuh 9,5 jam dikalibrasi ke sekitar 12.00 di Jakarta Timur."};
  const pgp = dk.find(v => /Pondok Gede Permai/.test(v.nama)); ringkasValidasi.pondok_gede_permai = pgp ? {sasaran: "2025-03-04T00:10", air_pertama_10cm_wib: pgp.air_pertama_10cm_wib, air_pertama_10cm_3x3_wib: pgp.air_pertama_10cm_3x3_wib} : null;
  if (pgp) { const t = tempat(laporan.find(l => l.id === pgp.id).lat, laporan.find(l => l.id === pgp.id).lon), kk2 = t.k, pada = (w, tiga) => { const u = (Date.parse(w + ":00+07:00") - jam0) / 3600e3, a = Math.floor(u), f = u - a, g = x => tiga ? di3(t, x) : ked[x * N + kk2]; return +((g(a) + (g(Math.min(J, a + 1)) - g(a)) * f) * 100).toFixed(1); };
    ringkasValidasi.pondok_gede_permai.kedalaman_cm = Object.fromEntries(["2025-03-04T00:10", "2025-03-04T03:15"].map(w => [w, {sel: pada(w, false), maks_3x3: pada(w, true)}])); ringkasValidasi.pondok_gede_permai.catatan = "00.10 = air pertama menggenang (jam validasi, juga laporan kalibrasi); 03.15 = limpas tanggul"; }
  log("validasi:"); for (const v of validasi) log(v.di_kisi ? `  ${v.nama.slice(0, 30).padEnd(30)} ${v.jenis_waktu === "jam" ? "jam " + String(v.s).padStart(2) : "hmaks " + String(v.s).padStart(2)} model ${String(v.model_cm).padStart(6)} cm, 3x3 ${String(v.model_3x3_cm).padStart(6)} cm, laporan ${v.laporan_cm ?? "-"} (${v.lokasi})` : `  ${v.nama.slice(0, 30).padEnd(30)} di luar kisi`);
  log(`Pondok Gede Permai, air pertama 10 cm: sel ${pgp?.air_pertama_10cm_wib}, 3x3 ${pgp?.air_pertama_10cm_3x3_wib} (sasaran 2025-03-04T00:10)`);
  log(`POD >=10 cm: sel ${ringkasValidasi.pod_10cm}, 3x3 ${ringkasValidasi.pod_10cm_3x3}, maks96j ${ringkasValidasi.pod_10cm_maks_96j}, n ${dk.length}/${validasi.length}; nominatim ${ringkasValidasi.pod_10cm_geokode_nominatim} (n ${ringkasValidasi.n_geokode_nominatim})`);
  log(`selisih sel: ${JSON.stringify(ringkasValidasi.selisih_sel)}; 3x3: ${JSON.stringify(ringkasValidasi.selisih_3x3)}`);
  log(`Kota Bekasi (poligon kasar ${luasB.luas_poligon_ha} ha): ${luasB.tergenang_ge10cm_hmaks_ha} ha >=10 cm, ${luasB.tergenang_ge30cm_hmaks_ha} ha >=30 cm, maks ${luasB.kedalaman_maks_m} m; ITB survei 380 ha / 3,32 m, simulasi ITB 720 ha / 3,51 m`);
  log("puncak muka air model di titik pantau: " + puncakPantau.map(p => `${p.id} ${p.muka_maks_m_relatif_dasar_alur} m pada ${p.waktu_wib}${p.di_alur ? "" : " (tak di alur)"}`).join("; "));
  return {validasi, ringkasValidasi};
}

/* ---------- geokode ulang laporan "perkiraan_peneliti" ke indeks pencarian OpenFreeMap (place, lalu transportation_name) dalam radius 6 km ---------- */
const STOP = new Set(["rt", "rw", "perum", "perumahan", "kel", "kelurahan", "komplek", "kompleks", "no", "jl", "jalan", "gang", "gg", "kec", "kecamatan", "desa", "sekitar", "dan", "di", "raya"]);
const bersih = t => t.toLowerCase().replace(/\b(rt|rw)\s*[\d\s,/&.-]*/g, " ").replace(/\d+/g, " ").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(x => x.length >= 3 && !STOP.has(x));
const jarakKm = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
export function geokodeUlang(laporan, indeks, radiusKm = 6) {
  const calon = indeks.baris.map(b => ({nama: b[0], tempat: b[1] === 1, lon: b[2], lat: b[3], ns: b[0].toLowerCase().replace(/[^a-z]/g, "")})), hasil = [], cacah = {osm_place: 0, osm_jalan: 0, tak_cocok: 0, nominatim: 0}, geser = [];
  for (const l of laporan) {
    if (!(l.lokasi || "").startsWith("perkiraan")) { hasil.push({...l, geser_km: 0}); if ((l.lokasi || "").startsWith("nominatim")) cacah.nominatim++; continue; }
    const dekat = calon.filter(c => jarakKm(l.lat, l.lon, c.lat, c.lon) <= radiusKm), segmen = l.nama.split(",").map(bersih).filter(t => t.length); let pilih = null;
    for (const jenis of [true, false]) { if (pilih) break;
      for (const tok of segmen) { const fr = tok.join(""), lenOk = tok.length >= 2 || tok[0].length >= (jenis ? 5 : 7);
        const sk = dekat.filter(c => c.tempat === jenis).map(c => ({c, skor: c.ns.includes(fr) ? 2 : (tok.length >= 2 && tok.every(t => c.ns.includes(t))) ? 1 : 0})).filter(x => x.skor && lenOk && (tok.length >= 2 || x.skor === 2));
        if (!sk.length) continue; const terbaik = Math.max(...sk.map(x => x.skor)), top = sk.filter(x => x.skor === terbaik).sort((a, b) => jarakKm(l.lat, l.lon, a.c.lat, a.c.lon) - jarakKm(l.lat, l.lon, b.c.lat, b.c.lon)), n0 = top[0].c;
        const grup = top.filter(x => jarakKm(n0.lat, n0.lon, x.c.lat, x.c.lon) <= 1.5), la = grup.reduce((a, x) => a + x.c.lat, 0) / grup.length, lo = grup.reduce((a, x) => a + x.c.lon, 0) / grup.length;
        pilih = {lat: +la.toFixed(5), lon: +lo.toFixed(5), lokasi: jenis ? "osm_place" : "osm_jalan", cocok: n0.nama, n: grup.length}; break; } }
    if (!pilih) { cacah.tak_cocok++; hasil.push({...l, geser_km: 0}); continue; }
    const g = jarakKm(l.lat, l.lon, pilih.lat, pilih.lon); geser.push(g); cacah[pilih.lokasi]++;
    hasil.push({...l, lat_awal: l.lat, lon_awal: l.lon, lat: pilih.lat, lon: pilih.lon, lokasi: pilih.lokasi, cocok_osm: pilih.cocok, geser_km: +g.toFixed(2)});
  }
  geser.sort((a, b) => a - b); return {laporan: hasil, ringkas: {...cacah, geser_median_km: geser.length ? +geser[geser.length >> 1].toFixed(2) : 0, geser_maks_km: geser.length ? +geser[geser.length - 1].toFixed(2) : 0, radius_km: radiusKm}};
}
/* hitung ulang validasi dari keluaran tersimpan (biner + JSON) tanpa simulasi: kedalaman cm per jam hanya untuk sel >= 1 cm, cukup untuk POD, selisih, jam air pertama */
export async function ulangValidasi(dir, id, kej, log = console.log) {
  const m = JSON.parse(fs.readFileSync(path.join(dir, `${id}.json`), "utf8")), {SG} = muatMesin(), B = bongkarBiner(zlib.gunzipSync(fs.readFileSync(path.join(dir, m.biner.berkas))), m.biner.bagian), cari = JSON.parse(fs.readFileSync(path.join(dir, m.cari.berkas), "utf8"));
  const {nx, ny} = m.kisi, N = nx * ny, J = m.jam, M = B.indeks.length, D = dekodeDelta(B.dalam_delta_cm, M, J), ked = new Float32Array(N * (J + 1));
  for (let s = 1; s <= J; s++) for (let i = 0; i < M; i++) ked[s * N + B.indeks[i]] = D[(s - 1) * M + i] / 100;
  const K = {nx, ny, dx: m.kisi.dx_m, zoom: m.kisi.zoom, s: m.kisi.s, x0: m.kisi.x0, y0: m.kisi.y0}, geo = geokodeUlang(kej.laporan, cari);
  const R = validasiLengkap({kej, laporan: geo.laporan, J, jam0: Date.parse(m.mulai), nx, ny, K, SG, ked, hmaksCm: B.hmaks_cm, A: K.dx * K.dx, pantau: m.titik_pantau, mukaSungai: m.muka_sungai_m}, log);
  const lama = m.validasi; m.validasi = {ringkas: R.ringkasValidasi, laporan: R.validasi}; m.geokode = geo.ringkas; m.rujukan.laporan_semua = geo.laporan; lengkapiMeta(m, kej); fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(m));
  return {lama, baru: m.validasi, geo};
}

/* melengkapi meta keluaran (jalan penuh dan hitung ulang validasi): penyetelan, kepekaan kurva debit, pengali dipakai, string asumsi, puncak laporan, batas */
export function lengkapiMeta(m, kej) {
  const V = m.validasi.ringkas, L = V.luas_kota_bekasi, bk = m.alur?.bankfull?.kali_bekasi, pMaks = m.pengali_maks?.nilai ?? 3, jam0 = Date.parse(m.mulai), ft = x => x == null ? "tidak tersedia" : x;
  /* 6 ketidakpastian kurva debit: Qbf dan kedalaman median untuk b = 1, 1,6, 2 (kedalaman ~ Q^0,6 pada lereng sama; tanpa efek kontinuitas) */
  const kb = kej.sungai.find(x => x.id === "kali_bekasi")?.tma_terukur, kg = kej.alur_bankfull.kelompok.find(g => g.id === "kali_bekasi");
  if (kb && bk) { const tt = (Date.parse(kg.qbf_dari_hidrograf.waktu_wib + ":00+07:00") - jam0) / 3600e3, q16 = fungsiTma(kb, jam0).Q(tt), baris = {};
    for (const b of [1, 1.6, 2]) { const T = {...kb, kurva: {...kb.kurva, b}}, F = fungsiTma(T, jam0), q = F.Q(tt); baris["b_" + String(b).replace(".", "_")] = {b, H0_cm: +F.kurva.H0.toFixed(1), a: +F.kurva.a.toFixed(5), qbf_m3s: +q.toFixed(1), dalam_median_m: +(bk.dalam_median_m * (q / q16) ** .6).toFixed(2), q_puncak_m3s: kb.kurva.Q2}; }
    const qs = Object.values(baris).map(x => x.qbf_m3s), ds = Object.values(baris).map(x => x.dalam_median_m);
    m.alur.kepekaan_kurva_debit = {...baris, rentang: {qbf_m3s: [Math.min(...qs), Math.max(...qs)], dalam_median_m: [Math.min(...ds), Math.max(...ds)]}, catatan: "b kurva debit adalah ASUMSI (1,5-2 untuk saluran alam). Dua titik (350 cm = 60 m3/dtk, 875 cm = 1.100 m3/dtk) tetap; kedalaman median dihitung dari kedalaman b=1,6 dikali (Q/Q1,6)^0,6 (Manning, lereng sama), tidak lewat simulasi ulang"}; }
  /* 7 pengali */
  if (m.pengali?.per_sel_era5) { for (const c of m.pengali.per_sel_era5) { c.pengali_mentah = c.pengali; c.pengali_dipakai = Math.min(pMaks, c.pengali); } m.pengali.pengali_dipakai = pMaks; m.pengali.teks = `ERA5 dikali ${pMaks} rata; ERA5 di hulu kurang 5-17 kali dari alat ukur`; }
  /* 8 string asumsi dan sitasi */
  m.asumsi = {...m.asumsi, genangan: `SimGenangan inersia lokal (Bates dkk. 2010) di kisi 60 m; DEM FABDEM V1-2 (bukan SRTM) dengan median bergerak ${m.lisensi_dem?.median_k ?? "k"}x${m.lisensi_dem?.median_k ?? "k"} piksel; cekungan DEM dangkalkan paling banyak 0,5 m; tanggul dan saluran kecil tidak terlihat kecuali alur OSM yang dibakar`,
    sungai: "Alur OSM waterway dibakar 1 sel ke DEM, kedalaman = bankfull Manning d = (Qbf n/(dx sqrt S))^0,6 (n 0,035 asumsi) lalu dijamin menurun ke hilir; Kali Bekasi: hidrograf dari TMA Cileungsi lewat kurva debit asumsi (b 1,6), dibagi 0,6/0,4 ke Ci Leungsi/Cikeas; Ciliwung: debit Katulampa terukur digeser 9,5 jam ditambah DAS antara; debit disuntik di sel alur dekat tepi selatan (bukan sel DEM terendah)",
    hujan: `ERA5 per jam dikali pengali tiap sel 0,25 derajat (alat ukur dibagi ERA5 pada jendela alat), dijepit maksimum ${pMaks}; antesenden tidak dikali`};
  if (typeof m.sumber?.dem === "string") m.sumber.dem = m.sumber.dem.replace("17 034014", "17 024016");
  /* 9 puncak muka air: model lawan laporan pos Cileungsi */
  const lap = kej.linimasa_pos.find(e => /Kali Bekasi \(P2C\/KP2C\)/.test(e.pos) && e.tma_cm === 875), tL = lap ? Date.parse(lap.waktu_wib + ":00+07:00") : null;
  if (tL) for (const p of V.puncak_pantau) if (p.id === "p2c" || p.id === "kali_bekasi") { p.laporan_puncak = {tma_cm: 875, waktu_wib: lap.waktu_wib, pos: "Cileungsi/KP2C (TMA pos, bukan relatif dasar alur)", url: lap.url}; p.selisih_jam = +((Date.parse(p.waktu_wib + ":00+07:00") - tL) / 3600e3).toFixed(1); }
  /* 5 penyetelan */
  const tgl = V.pod_10cm, rasio = L ? +(L.tergenang_ge10cm_hmaks_ha / L.itb.survei_ha).toFixed(1) : null;
  m.penyetelan = {catatan: "Daftar semua yang disetel ke laporan, dan semua yang dipilih sesudah melihat hasil. Angka kepekaan diambil dari jalan 1c-1g yang tercatat (log scratchpad, ilmu banjir); tabel lama memakai SEMUA laporan dan koordinat lama (sebelum geokode ulang), jadi hanya sebanding di antara barisnya. 'tidak tersedia' = tidak pernah dijalankan.",
    disetel_ke_laporan: [
      {butir: "Daya tampung alur Kali Bekasi, Ci Leungsi, dan Cikeas disetel sama dengan debit model pukul 23.42 3 Mar", nilai: {qbf_m3s: bk?.qbf_m3s ?? null}, laporan: "air pertama masuk permukiman Jatiasih 23.42 (Perum Bumi Nasio 23.46)", kepekaan: [{keterangan: "jalan 1d: Qbf 896 m3/dtk (hidrograf lama berkalibrasi ERA5, dibuang) lawan jalan 1e: Qbf 259 m3/dtk (TMA)", pod_sel: [0.167, 0.083], pod_3x3: [0.306, 0.25], luas_kota_bekasi_ha: [5099, 4684], sumber: "1d dan 1e, drainase 5/5, koordinat lama; kedua jalan berbeda juga di hidrograf, bukan hanya Qbf"}], laporan_kalibrasi_dipisah: kej.laporan_kalibrasi},
      {butir: "Waktu tempuh Katulampa ke tepi kisi Ciliwung 9,5 jam", nilai: {tempuh_jam: m.sungai?.ciliwung?.hulu_terukur?.tempuh_jam ?? 9.5}, laporan: "air sampai Jakarta Timur sekitar 12.00 4 Mar; Katulampa ke Jakarta 9-12 jam", kepekaan: "tidak tersedia (waktu tempuh tidak pernah divariasikan)", catatan: "laporan BPBD DKI kelurahan l25-l36 berjam 10.00 bertentangan dengan 12.00; keduanya dinilai (validasi.ringkas.jakarta_timur_10)"}],
    dipilih_sesudah_melihat_hasil: [
      {butir: "drainase 5 mm/jam terbangun dan 5 lainnya", rujukan_sendiri: "saluran kota 15-20 mm/jam (arahan sesi induk, belum diverifikasi ke dokumen)", kepekaan: [{terbangun_lainnya: "0 dan 0", pod_sel: 0.194, pod_3x3: 0.333, luas_kota_bekasi_ha: 6060}, {terbangun_lainnya: "5 dan 5", pod_sel: 0.083, pod_3x3: 0.25, luas_kota_bekasi_ha: 4684}, {terbangun_lainnya: "10 dan 5", pod_sel: 0.056, pod_3x3: 0.139, luas_kota_bekasi_ha: 3585}], sumber: "jalan 1e, k=1, koordinat lama, 36 laporan"},
      {butir: `jepitan pengali ERA5 maksimum ${pMaks}`, kepekaan: "tidak tersedia (tidak pernah divariasikan sendirian)", alasan: "alat titik bukan rata-rata areal; Sumur Batu 208 mm adalah maksimum yang diberitakan"},
      {butir: `median DEM k=${m.lisensi_dem?.median_k ?? 9}`, kepekaan: [{k: 1, pod_sel: 0.083, pod_3x3: 0.25, luas_kota_bekasi_ha: 4684}, {k: 5, pod_sel: 0.083, pod_3x3: 0.278, luas_kota_bekasi_ha: 5552}, {k: 9, pod_sel: 0.111, pod_3x3: 0.25, luas_kota_bekasi_ha: 5499}, {k: 15, pod_sel: 0.111, pod_3x3: 0.194, luas_kota_bekasi_ha: 5143}], sumber: "jalan 1f, drainase 5/5, koordinat lama; perbedaan antar-k dalam wilayah derau"},
      {butir: "geokode ulang koordinat laporan perkiraan ke indeks OSM", kepekaan: {sebelum: {n: 36, pod_sel: 0.111, pod_3x3: 0.25, keterangan: "k=9, semua laporan, koordinat lama (1f)"}, sesudah: {n: V.n_utama, pod_sel: tgl, pod_3x3: V.pod_10cm_3x3, keterangan: "laporan bebas dengan lokasi Nominatim atau OSM"}}, geser_median_km: m.geokode?.geser_median_km ?? null}]};
  /* 10 batas */
  m.batas = [`Luas model ${String(rasio ?? "?").replace(".", ",")} kali survei ITB (sekitar ${L?.tergenang_ge10cm_hmaks_ha != null ? (Math.round(L.tergenang_ge10cm_hmaks_ha / 100) * 100).toLocaleString("id-ID") : "?"} ha lawan 380 ha) sementara titik laporan terlalu dangkal: lokasi genangan model tidak akurat.`,
    "Galat tinggi FABDEM di kawasan urban 2-3 m (RMSE, Hawker dkk. 2022) sama besar dengan kedalaman banjir itu sendiri.",
    "Hujan lokal ERA5 kurang 5-17 kali dari alat ukur di hulu; pengali dijepit 3 jadi hujan kisi masih jauh di bawah alat.",
    "Kurva debit Kali Bekasi dan daya tampung Ciliwung (370 m³/dtk) adalah asumsi; daya tampung Kali Bekasi disetel ke satu laporan waktu.",
    "Puncak air sungai di model datang beberapa jam lebih lambat dari laporan pos pantau; alur sungai di model lebih lambat merambatkan banjir.",
    "Laporan yang lokasinya hanya perkiraan dan tidak ditemukan di peta OSM bisa meleset 1,5 sampai 4 km; laporan itu dihitung terpisah."];
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
  assert.equal(V.gedung.reduce((a, c) => a + c, 0), 1, "satu gedung"); assert.ok(V.baris.some(r => r[0] === "Jalan Uji" && r[1] === 0 && V.wilayah[r[4]] === "Kelurahan Uji"), "jalan harus dapat kelurahan terdekat");
  /* 4 hidrograf: volume = volume limpasan; puncak mendekati qp; tanpa hujan = aliran dasar */
  const ef = new Float64Array(40); ef[3] = 12; ef[4] = 20; ef[5] = 8; const A = 330, tc = 10, h = hidrografDAS(ef, A, tc, 15, 1, 400);
  const vol = (h.q.reduce((a, c) => a + c, 0) - 15 * 400) * 3600, mau = 40 * 1000 * A; assert.ok(Math.abs(vol - mau) / mau < 1e-9, `volume ${vol} != ${mau}`);
  assert.ok(Math.max(...h.q) > 15, "puncak positif"); assert.ok(Math.max(...h.q) - 15 < 40 * 1000 * A / 3600 / (h.Tp), "puncak di bawah batas pulsa");
  assert.ok(h.q.indexOf(Math.max(...h.q)) >= 3 + Math.floor(h.Tp), "puncak muncul sesudah hujan + sekitar Tp");
  assert.ok(hidrografDAS(new Float64Array(10), A, tc, 7, 1, 20).q.every(v => v === 7), "tanpa hujan = aliran dasar");
  /* 4b kalibrasi memulihkan tc yang dipakai membuat sasaran */
  const hd = new Float64Array(100); hd[10] = 20; hd[11] = 35; hd[12] = 15; const asli = hidrografDAS(hd, 400, 9, 5, 1, 220).q, ip = asli.indexOf(Math.max(...asli));
  const kal = kalibrasiDAS((x) => ({efektif: x}), (arf, gs) => hd.map(v => v * arf), 400, 5, 0, 99, {puncak_m3s: Math.max(...asli), s: ip, lebar_jam: 1}, ["tc_jam", "faktor_areal"], {tc_jam: 20, cn: 80}); assert.ok(Math.abs(kal.tc_jam - 9) <= .5 && Math.abs(kal.faktor_areal - 1) < .11, "kalibrasi " + JSON.stringify(kal));
  /* 5 biner bolak-balik */
  const bg = [["a", "Uint32", Uint32Array.from([1, 4e9, 7])], ["b", "Uint16", Uint16Array.from([0, 65535, 12])], ["c", "Uint8", Uint8Array.from([9, 255, 1, 3, 4])], ["d", "Int16", Int16Array.from([-500, 32767, -32768])]];
  const {buf, tabel} = kemasBiner(bg), balik = bongkarBiner(zlib.gunzipSync(zlib.gzipSync(buf)), tabel);
  for (const [n, , a] of bg) assert.deepEqual(Array.from(balik[n]), Array.from(a), "biner " + n); assert.ok(tabel.every(t => t.offset % 4 === 0), "rata 4 byte");
  const jm = Uint16Array.from([0, 3, 40, 40, 7, 0, 0, 65535, 2, 2, 9, 1]), dd = kodeDelta(jm, 4, 3); assert.deepEqual(Array.from(dekodeDelta(dd, 4, 3)), Array.from(jm), "delta bolak-balik");
  /* alur: sungai diagonal pada bidang miring (hilir ke utara) -> 4-tersambung, dasar turun monoton ke hilir, di bawah tepi; masuk di sel selatan */
  { const nx = 40, ny = 40, z = Float64Array.from({length: nx * ny}, (_, k) => 10 + (k / nx | 0) * .05 + ((k * 7919) % 13) * .02);
    const alur = [{kelas: "river", nama: "Kali Uji", garis: [[5, 38.5], [12, 25.5], [20, 15.5]]}, {kelas: "river", nama: "Kali Uji", garis: [[20.3, 15.5], [25, 3.5]]}, {kelas: "drain", nama: "Selokan", garis: [[1, 1], [30, 30]]}];
    const rn = rantaiAlur(alur, nx, ny); assert.equal(rn.length, 1, "dua segmen ber-nama sama menyambung, 'drain' dibuang");
    for (let q = 1; q < rn[0].sel.length; q++) { const a = rn[0].sel[q - 1], b = rn[0].sel[q], d = Math.abs(a % nx - b % nx) + Math.abs((a / nx | 0) - (b / nx | 0)); assert.equal(d, 1, "sel alur 4-tersambung"); }
    const B = bakarAlur(z, nx, ny, rn), r0 = B.runs[0]; assert.ok((r0.sel[0] / nx | 0) > (r0.sel[r0.sel.length - 1] / nx | 0), "hilir = utara (j mengecil)");
    for (let q = 1; q < r0.bed.length; q++) assert.ok(r0.bed[q] < r0.bed[q - 1], "dasar menurun monoton ke hilir"); r0.sel.forEach((k, q) => assert.ok(B.z[k] <= z[k] - 1.9 + 1e-9 || B.z[k] <= z[k], "dasar tak lebih tinggi dari DEM"));
    assert.ok(r0.bed[0] < z[r0.sel[0]] - 3, "dasar jauh di bawah tepi (sungai 6 m dikurangi median)");
    const m = cariMasuk(B, nx, ny, /uji/i, 12, 4); assert.ok(m && m.j <= ny - 1 - 4 && m.sel.length >= 1, "sel masuk di selatan"); assert.equal(cariMasuk(B, nx, ny, /tidak ada/i), null); }
  /* geokode ulang: nama perkiraan ke place OSM (spasi diabaikan), radius 6 km, nominatim tak disentuh, tak cocok tetap perkiraan */
  { const idx = {wilayah: [], baris: [["Komplek Pondokgede Permai", 1, 106.9706, -6.3015, -1, -1, "neighbourhood"], ["Jalan Mawar", 0, 106.9, -6.2, -1, -1, "residential"], ["Pondokgede Permai Jauh", 1, 107.5, -6.3, -1, -1, "neighbourhood"]]};
    const L = [{id: "a", nama: "Perum Pondok Gede Permai", lat: -6.29, lon: 106.956, lokasi: "perkiraan_peneliti"}, {id: "b", nama: "Gang Mawar RT 8 RW 3", lat: -6.246, lon: 107.02, lokasi: "perkiraan_peneliti"}, {id: "c", nama: "Kel. Cawang", lat: -6.24, lon: 106.87, lokasi: "nominatim_station"}, {id: "d", nama: "Tempat Tak Dikenal", lat: -6.3, lon: 106.95, lokasi: "perkiraan_peneliti"}];
    const G = geokodeUlang(L, idx), o = Object.fromEntries(G.laporan.map(x => [x.id, x]));
    assert.equal(o.a.lokasi, "osm_place"); assert.ok(Math.abs(o.a.lat + 6.3015) < 1e-6 && o.a.geser_km > 1.5 && o.a.geser_km < 2.5, "PGP bergeser ~2 km: " + o.a.geser_km); assert.equal(o.b.lokasi, "perkiraan_peneliti", "token tunggal 'mawar' hanya jalan: ditolak (terlalu pendek)");
    assert.equal(o.c.lat, -6.24); assert.equal(o.d.lokasi, "perkiraan_peneliti"); assert.equal(G.ringkas.osm_place, 1); assert.equal(G.ringkas.tak_cocok, 2); assert.equal(G.ringkas.nominatim, 1); }
  /* kedalaman bankfull Manning: bolak-balik debit <-> kedalaman; alur dibakar mengikuti Qbf (lebih besar Qbf = lebih dalam, lereng lebih landai = lebih dalam) */
  { const d = kedalamanBankfull(250, .035, 60, 1e-3); assert.ok(Math.abs(debitBankfull(d, .035, 60, 1e-3) - 250) < 1e-9, "Manning balik"); assert.ok(d > 2 && d < 3, "250 m3/dtk, S 1e-3, n 0,035, dx 60: kedalaman " + d);
    assert.ok(kedalamanBankfull(500, .035, 60, 1e-3) > d && kedalamanBankfull(250, .035, 60, 1e-4) > d, "monoton");
    const nx = 30, ny = 30, z = Float64Array.from({length: nx * ny}, (_, k) => 20 + (k / nx | 0) * .06), rn = rantaiAlur([{kelas: "river", nama: "Kali Uji", garis: [[15.5, 28.5], [15.5, 2.5]]}], nx, ny);
    const kecil = bakarAlur(z, nx, ny, rn, DALAM_ALUR, {dx: 60, n: .035, sMin: 5e-4, qbf: () => 50}), besar = bakarAlur(z, nx, ny, rn, DALAM_ALUR, {dx: 60, n: .035, sMin: 5e-4, qbf: () => 800});
    const md = r => r.dalam.reduce((a, c) => a + c, 0) / r.dalam.length; assert.ok(md(besar.runs[0]) > md(kecil.runs[0]) * 1.5, "Qbf besar = alur lebih dalam"); assert.ok(kecil.runs[0].lebar === 1, "lebar 1 sel"); }
  /* kurva debit dari dua titik + TMA -> hidrograf */
  { const kv = kurvaDebit(350, 60, 875, 1100, 1.6); assert.ok(Math.abs(kv.Q(350) - 60) < 1e-9 && Math.abs(kv.Q(875) - 1100) < 1e-9, "kurva lewat dua titik"); assert.ok(kv.H0 > 240 && kv.H0 < 256 && kv.a > .03 && kv.a < .045, `H0 ${kv.H0} a ${kv.a}`);
    const T = {normal_cm: 350, awal_naik_wib: "2025-03-03T18:00", paruh_surut_jam: 10, titik: [{waktu_wib: "2025-03-03T23:00", tma_cm: 400}, {waktu_wib: "2025-03-03T23:40", tma_cm: 500}, {waktu_wib: "2025-03-04T03:00", tma_cm: 710}, {waktu_wib: "2025-03-04T06:30", tma_cm: 875}], kurva: {H1: 350, Q1: 60, H2: 875, Q2: 1100, b: 1.6}};
    const F = fungsiTma(T, Date.parse("2025-03-02T00:00:00+07:00")); assert.equal(F.H(0), 350); assert.equal(F.H(47), 400); assert.ok(Math.abs(F.H(54.5) - 875) < 1e-9 && Math.abs(F.Q(54.5) - 1100) < 1e-6, "puncak 875 cm = 1.100 m3/dtk pada 06.30");
    assert.ok(Math.abs(F.H(54.5 + 10) - 612.5) < 1e-6, "surut: waktu paruh 10 jam"); assert.ok(F.H(44.5) > 350 && F.H(44.5) < 400, "naik linear dari normal ke 400 cm"); assert.ok(F.Q(40) === kv.Q(350), "normal = aliran dasar"); }
  /* hulu terukur: debit dari L/dtk, TMA tanpa debit lewat regresi, naik linear, turun eksponensial, ekor surut */
  { const lm = [{waktu_wib: "2025-03-02T10:00", pos: "P", tma_cm: 100, status: "debit 100.000 L/dtk"}, {waktu_wib: "2025-03-02T12:00", pos: "P", tma_cm: 200, status: "debit 300.000 L/dtk"}, {waktu_wib: "2025-03-02T14:00", pos: "P", tma_cm: 150, status: "x"}, {waktu_wib: "2025-03-02T14:00", pos: "Q", tma_cm: 999, status: "x"}];
    const F = fungsiHulu(lm, {pos: "P", dasar_m3s: 10}, Date.parse("2025-03-02T00:00:00+07:00")); assert.equal(F.titik.length, 3); assert.ok(Math.abs(F.titik[2].q - 200) < 1e-6 && !F.titik[2].diukur, "TMA 150 -> 200 m3/s lewat rating linear");
    assert.ok(Math.abs(F.f(10) - 100) < 1e-9 && Math.abs(F.f(11) - 200) < 1e-9, "naik linear"); assert.ok(Math.abs(F.f(13) - Math.sqrt(300 * 200)) < 1e-6, "turun eksponensial");
    assert.equal(F.f(0), 10, "sebelum titik pertama = aliran dasar"); assert.ok(F.f(14 + 2 + 8) < 200 && F.f(14 + 2 + 8) > 10 && Math.abs(F.f(14 + 2 + 8) - 105) < 1e-9, "ekor: waktu paruh 8 jam"); }
  /* FABDEM: prediktor 2 pada float32 bolak-balik (tile buatan, nilai negatif dan nodata ikut) */
  { const w = 8, h = 4, f = Float32Array.from({length: w * h}, (_, i) => i % 7 === 0 ? -9999 : (i * 1.37 - 5) % 90), u = new Uint32Array(f.buffer), d = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d[y * w + x] = x ? (u[y * w + x] - u[y * w + x - 1]) >>> 0 : u[y * w];
    const bk = Buffer.alloc(w * h * 4); d.forEach((v, i) => bk.writeUInt32LE(v, i * 4));
    assert.deepEqual(Array.from(dekodeTileFab(zlib.deflateSync(bk), w, h, 2)), Array.from(f), "prediktor 2 float32 bolak-balik");
    assert.deepEqual(Array.from(dekodeTileFab(zlib.deflateSync(Buffer.from(f.buffer)), w, h, 1)), Array.from(f), "tanpa prediktor"); }
  /* FABDEM nyata (bila ubin ada): bilinear pada titik sudut = nilai sampel; bandingkan dengan Terrarium (cache) di tiga titik */
  { const fb = pembacaFabdem(); if (fb.ada()) { const {SG: S3} = muatMesin(), t = bukaGeoTiff(fs.readFileSync(path.join(FAB_DIR, "S07E106_FABDEM_V1-2.tif")));
      assert.equal(t.w, 3600); assert.ok(t.titik && t.tie[0] === 106 && t.tie[1] === -6, "georeferensi titik FABDEM"); const v = t.nilai(1000, 1000); assert.ok(v > -50 && v < 3000, "tinggi masuk akal " + v);
      assert.ok(Math.abs(fb.tinggi(106 + 1000 / 3600, -6 - 1000 / 3600) - v) < 1e-3, "bilinear di titik sampel = sampel");
      { const w1 = fb.jendela(106.94, 106.98, -6.30, -6.28, 1), w9 = fb.jendela(106.94, 106.98, -6.30, -6.28, 9); assert.ok(Math.abs(w1.tinggi(106.96, -6.29) - fb.tinggi(106.96, -6.29)) < 1e-4, "jendela k=1 = sampel langsung");
        const tv = w => { let t = 0, p = null; for (let q = 0; q <= 150; q++) { const v = w.tinggi(106.94 + q * .04 / 150, -6.29); if (p != null) t += Math.abs(v - p); p = v; } return t; }; assert.ok(tv(w9) < tv(w1), "median 9x9 mengurangi naik-turun"); }
      const hasil = []; for (const [nm, la, lo] of [["Pondok Gede Permai", -6.29, 106.956], ["Kampung Melayu", -6.224, 106.866], ["Bekasi Kota", -6.2349, 106.9896]]) { let terr = null;
        try { const D = await S3.ambilDEM(la, lo, 600, 8, async u => { const m = u.match(/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/), f = path.join(CACHE, `dem/${m[1]}/${m[2]}_${m[3]}.png`); if (!fs.existsSync(f)) throw new Error("tak ada di cache"); const b = fs.readFileSync(f); return {ok: true, status: 200, blob: async () => b}; }); terr = D.z.reduce((a, c) => a + c, 0) / D.z.length; } catch { /* ubin Terrarium belum di cache: lewati */ }
        const fv = fb.tinggi(lo, la); assert.ok(fv > -10 && fv < 100, `FABDEM ${nm} ${fv}`); hasil.push(`${nm}: FABDEM ${fv.toFixed(1)} m, Terrarium ${terr == null ? "-" : terr.toFixed(1)} m`); }
      console.log("  FABDEM vs Terrarium: " + hasil.join("; ")); } }
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
  else if (cmd === "validasi") { const kej = JSON.parse(fs.readFileSync(path.join(AKAR, "scripts/banjir/replay_kejadian.json"), "utf8")); await ulangValidasi(process.argv[3] || KELUAR, kej.id, kej); }
  else { const kej = JSON.parse(fs.readFileSync(path.join(AKAR, "scripts/banjir/replay_kejadian.json"), "utf8")); await hitung(kej); }
}
