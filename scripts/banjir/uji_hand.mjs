/* Uji balik skenario muka sungai HAND (public/banjir/sim_hand.js) lawan riwayat genangan GLAD 1999-2020.

Pakai:  node scripts/banjir/uji_hand.mjs          # jalankan uji balik, tulis public/banjir/data/lab/uji_hand.json + _ringkas.md
        node scripts/banjir/uji_hand.mjs uji      # uji fungsi murni (luring)

Pertanyaan: kalau muka air semua alur naik m meter, apakah sel dengan HAND < m jatuh di tempat yang memang sering tergenang?
- Kebenaran: poligon riwayat genangan Google Flood Forecasting (turunan GLAD 1999-2020, piksel 128 m), ubin mentah dari
  `python3 scripts/banjir/genangan_historis.py tarik` di data/raw/banjir/genangan_historis/. "Sering" = kelas sedang ke atas (basah >= 1% waktu);
  "pernah" = kelas rendah ke atas (>= 0,5%). Badan air tetap sudah dibuang dari sumber, jadi sel alur sungai lebar terhitung salah alarm (bias ke bawah).
- Prakiraan: persis jalur layar. DEM ubin Terrarium (SimGenangan.ambilDEM, kotak 6 km, 100 sel, sama dengan bawaan tab Simulasi),
  SimGenangan.siapkanArea, SimHand.hitung. Empat varian dinilai berdampingan:
    T  = Terrarium tanpa air permanen;   TA = Terrarium + air WorldCover (SimLahan.kisiLahan, kelas 80) = persis layar;
    F  = FABDEM (tanah tanpa pohon dan bangunan, scripts/banjir/fabdem.mjs) disampel di pusat sel yang sama;   FA = FABDEM + air WorldCover.
  Sel laut ditentukan dari Terrarium untuk semua varian supaya himpunan sel yang dinilai sama. Pembanding sel terendah memakai DEM varian itu.
- Situs: pusat kecamatan dengan riwayat genangan sedang+tinggi >= 5% luasnya, diacak berbenih tetap, dibagi dua: separuh KALIBRASI memilih
  ambang alur dan muka air terbaik, separuh UJI hanya dinilai sekali dengan pilihan itu (tidak ikut memilih).
- Ukuran: CSI = TP / (TP + FP + FN), dijumlah lintas situs. Pembanding: sel TERENDAH di kotak yang sama dengan jumlah sel yang sama dengan
  prakiraan HAND per situs (tinggi mutlak, tanpa jaringan sungai). HAND baru berguna kalau mengalahkan pembanding ini.
*/
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import crypto from "node:crypto";
import {bukaFabdem} from "./fabdem.mjs";

const AKAR = new URL("../../", import.meta.url).pathname;
const MENTAH = path.join(AKAR, "data/raw/banjir");
const DIR_GLAD = path.join(MENTAH, "genangan_historis"), DIR_DEM = path.join(MENTAH, "uji_hand/dem"), DIR_WC = path.join(MENTAH, "uji_hand/wc");
const KELUAR = process.env.KELUAR || path.join(AKAR, "public/banjir/data/lab/uji_hand.json"), RINGKAS = KELUAR.replace(/\.json$/, "_ringkas.md");
const KELAS = {Low_risk: 1, Medium_risk: 2, High_risk: 3};
const CFG = {sisi: +(process.env.SISI || 6000), n: +(process.env.N || 100), situs: 60, benih: 2026, minPersen: 5, jarakKm: 12,
  alurKm2: [0.25, 0.5, 1, 2, 5], muka: [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10], varian: ["T", "TA", "F", "FA"], layar: "TA"};
const NAMA_VARIAN = {T: "Terrarium tanpa air permanen", TA: "Terrarium + air WorldCover (layar)", F: "FABDEM tanpa air permanen", FA: "FABDEM + air WorldCover"};

/* ---------- PNG 8-bit RGB/RGBA tanpa interlace (cukup untuk ubin Terrarium) -> RGBA ---------- */
export function bukaPNG(buf) {
  (buf.readUInt32BE(0) === 0x89504e47) || salah("bukan PNG");
  let o = 8, w = 0, h = 0, tipe = 0; const idat = [];
  while (o < buf.length) { const len = buf.readUInt32BE(o), jenis = buf.toString("ascii", o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (jenis === "IHDR") { w = d.readUInt32BE(0); h = d.readUInt32BE(4); tipe = d[9];
      (d[8] === 8 && (tipe === 2 || tipe === 6) && d[12] === 0) || salah(`PNG kedalaman ${d[8]} tipe ${tipe} interlace ${d[12]} tidak didukung`); }
    else if (jenis === "IDAT") idat.push(d); else if (jenis === "IEND") break; o += 12 + len; }
  const bpp = tipe === 6 ? 4 : 3, baris = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = new Uint8Array(baris * h), out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) { const f = raw[y * (baris + 1)], src = y * (baris + 1) + 1, dst = y * baris;
    for (let x = 0; x < baris; x++) { const a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - baris + x] : 0, c = x >= bpp && y ? px[dst - baris + x - bpp] : 0;
      let p = raw[src + x];
      if (f === 1) p += a; else if (f === 2) p += b; else if (f === 3) p += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[dst + x] = p & 255; } }
  for (let k = 0; k < w * h; k++) { out[k * 4] = px[k * bpp]; out[k * 4 + 1] = px[k * bpp + 1]; out[k * 4 + 2] = px[k * bpp + 2]; out[k * 4 + 3] = bpp === 4 ? px[k * bpp + 3] : 255; }
  return {w, h, data: out};
}
function salah(m) { throw new Error("uji_hand: " + m); }

/* ---------- poligon: genap-ganjil lintas semua cincin (lubang benar) ---------- */
export function dalam(cincin, x, y) {
  let d = false;
  for (const r of cincin) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; }
  return d;
}
/* fitur GLAD -> [{k, bb, cincin}] yang memotong kotak bb [x0, y0, x1, y1] */
export function poligonDi(fitur, bb) {
  const hasil = [];
  for (const f of fitur) { const k = KELAS[f.properties?.name]; if (!k) continue;
    const g = f.geometry, ps = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    for (const cincin of ps) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y] of cincin[0]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < bb[0] || x0 > bb[2] || y1 < bb[1] || y0 > bb[3]) continue;
      hasil.push({k, bb: [x0, y0, x1, y1], cincin}); } }
  return hasil;
}
/* kelas tertinggi (0 = kering) per titik */
export function kelasTitik(poli, titik) {
  const o = new Uint8Array(titik.length);
  titik.forEach(([x, y], i) => { let k = 0; for (const p of poli) if (p.k > k && x >= p.bb[0] && x <= p.bb[2] && y >= p.bb[1] && y <= p.bb[3] && dalam(p.cincin, x, y)) k = p.k; o[i] = k; });
  return o;
}

/* ---------- ukuran ---------- */
export const csi = ({tp, fp, fn}) => tp + fp + fn ? tp / (tp + fp + fn) : null;
export function hitungSel(prediksi, benar, sah) {
  let tp = 0, fp = 0, fn = 0;
  for (let k = 0; k < benar.length; k++) { if (!sah[k]) continue; const p = prediksi(k), b = benar[k];
    if (p && b) tp++; else if (p) fp++; else if (b) fn++; }
  return {tp, fp, fn};
}
/* pembanding: n sel sah terendah (z) dianggap tergenang */
export function terendah(z, sah, n) {
  const idx = []; for (let k = 0; k < z.length; k++) if (sah[k]) idx.push(k);
  idx.sort((a, b) => z[a] - z[b]); const o = new Uint8Array(z.length); for (let i = 0; i < Math.min(n, idx.length); i++) o[idx[i]] = 1; return o;
}
const tambah = (a, b) => ({tp: a.tp + b.tp, fp: a.fp + b.fp, fn: a.fn + b.fn});
const nol = () => ({tp: 0, fp: 0, fn: 0});

/* ---------- mesin layar lewat vm, dengan peramban tiruan secukupnya untuk ambilDEM ---------- */
export function mesin() {
  const ctx = vm.createContext({
    createImageBitmap: async blob => bukaPNG(Buffer.from(await blob.arrayBuffer())),
    OffscreenCanvas: class { getContext() { let d; return {drawImage: bm => { d = bm.data; }, getImageData: () => ({data: d})}; } },
  });
  for (const f of ["sim_genangan.js", "sim_hand.js", "sim_lahan.js"]) vm.runInContext(fs.readFileSync(path.join(AKAR, "public/banjir", f), "utf8"), ctx);
  return {SG: ctx.SimGenangan, SH: ctx.SimHand, SL: ctx.SimLahan};
}
/* ubin DEM disimpan di data/raw (tidak di-commit), jadi uji ulang tidak mengunduh lagi */
export async function ambil(url) {
  const nama = path.join(DIR_DEM, url.split("/terrarium/")[1].replaceAll("/", "_"));
  if (!fs.existsSync(nama)) { const r = await fetch(url); if (!r.ok) return r; fs.mkdirSync(DIR_DEM, {recursive: true}); fs.writeFileSync(nama, Buffer.from(await r.arrayBuffer())); }
  const b = fs.readFileSync(nama); return {ok: true, status: 200, blob: async () => new Blob([b])};
}
/* ubin WorldCover (PNG Planetary Computer) untuk SimLahan.kisiLahan; 404 disimpan sebagai berkas kosong */
export async function ubinWC(url) {
  const nama = path.join(DIR_WC, crypto.createHash("sha1").update(url).digest("hex") + ".png");
  if (!fs.existsSync(nama)) {
    let r; for (let coba = 0; ; coba++) { try { r = await fetch(url, {signal: AbortSignal.timeout(30000)}); if (r.ok || r.status === 404 || coba >= 3) break; } catch (e) { if (coba >= 3) throw e; }
      await new Promise(s => setTimeout(s, 2000 * (coba + 1))); }
    if (r.status !== 404 && !r.ok) salah(`WorldCover HTTP ${r.status}`);
    fs.mkdirSync(DIR_WC, {recursive: true}); fs.writeFileSync(nama, r.status === 404 ? Buffer.alloc(0) : Buffer.from(await r.arrayBuffer())); }
  const b = fs.readFileSync(nama); return b.length ? bukaPNG(b).data : null;
}
/* ubin GLAD: nama berkas inundation_history_<lat0>_<lon0>_<lat1>_<lon1>.geojson.gz */
const UBIN = new Map();
function gladDi(bb) {
  (fs.existsSync(DIR_GLAD)) || salah(`ubin GLAD tidak ada di ${DIR_GLAD}; jalankan python3 scripts/banjir/genangan_historis.py tarik`);
  const hasil = [];
  for (const f of fs.readdirSync(DIR_GLAD)) { const m = f.match(/_(-?[\d.]+)_(-?[\d.]+)_(-?[\d.]+)_(-?[\d.]+)\.geojson\.gz$/); if (!m) continue;
    const [la0, lo0, la1, lo1] = m.slice(1).map(Number);
    if (lo1 < bb[0] || lo0 > bb[2] || la1 < bb[1] || la0 > bb[3]) continue;
    if (!UBIN.has(f)) UBIN.set(f, JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DIR_GLAD, f)))).features);
    hasil.push(...poligonDi(UBIN.get(f), bb)); }
  return hasil;
}

function acak(benih) { let a = benih >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32; }; }
function pilihSitus() {
  const pusat = JSON.parse(fs.readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"));
  const gh = JSON.parse(fs.readFileSync(path.join(AKAR, "public/banjir/data/genangan_historis_kec.json"), "utf8")).kec;
  const calon = Object.entries(gh).filter(([k, [t, s]]) => t + s >= CFG.minPersen && pusat[k]).map(([k]) => k).sort();
  const r = acak(CFG.benih); for (let i = calon.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [calon[i], calon[j]] = [calon[j], calon[i]]; }
  /* situs berjarak >= JARAK_KM satu sama lain (kotak tidak bertumpuk, kalibrasi dan uji tidak bertetangga) */
  const jauh = (a, b) => { const dy = (a[0] - b[0]) * 111, dx = (a[1] - b[1]) * 111 * Math.cos(a[0] * Math.PI / 180); return Math.hypot(dx, dy) >= CFG.jarakKm; };
  const pilih = []; for (const k of calon) { if (pilih.length >= CFG.situs) break; if (pilih.every(p => jauh(pusat[p], pusat[k]))) pilih.push(k); }
  return {nCalon: calon.length, situs: pilih.map((k, i) => ({k, lat: pusat[k][0], lon: pusat[k][1], peran: i % 2 ? "uji" : "kalibrasi"}))};
}

async function jalankan() {
  const {SG, SH, SL} = mesin(), {nCalon, situs} = pilihSitus(), hasil = [], FB = await bukaFabdem();
  for (const [i, s] of situs.entries()) {
    try {
      const dem = await SG.ambilDEM(s.lat, s.lon, CFG.sisi, CFG.n, ambil), N = dem.nx * dem.ny, prep = SG.siapkanArea(dem);
      const titik = Array.from({length: N}, (_, k) => SG.dariSel(dem, k % dem.nx, (k / dem.nx) | 0));
      let bb = [1e9, 1e9, -1e9, -1e9]; for (const [x, y] of titik) bb = [Math.min(bb[0], x), Math.min(bb[1], y), Math.max(bb[2], x), Math.max(bb[3], y)];
      const kls = kelasTitik(gladDi(bb), titik), sah = Uint8Array.from(prep.laut, l => l ? 0 : 1);
      const sering = kls.map(k => k >= 2 ? 1 : 0), pernah = kls.map(k => k >= 1 ? 1 : 0);
      /* FABDEM di pusat sel yang sama; nodata (pantai, laut) memakai Terrarium */
      await FB.muat([bb[0] - .001, bb[1] - .001, bb[2] + .001, bb[3] + .001]);
      let nFb = 0; const zF = Float64Array.from(titik, ([x, y], k) => { const v = FB.tinggi(x, y); if (Number.isFinite(v)) { nFb++; return v; } return dem.z[k]; });
      const prepF = SG.siapkanArea({...dem, z: zF});
      const L = await SL.kisiLahan(dem, ubinWC), air = L?.dom ? Uint8Array.from(L.dom, c => c === 80 ? 1 : 0) : null;
      const pakai = {T: [prep, null, dem.z], TA: [prep, air, dem.z], F: [prepF, null, zF], FA: [prepF, air, zF]};
      const grid = {};
      for (const v of CFG.varian) { const [pp, aa, zz] = pakai[v];
        for (const a of CFG.alurKm2) { const H = SH.hitung(pp, dem, SG, a, aa);
          for (const m of CFG.muka) { const pred = k => H.hand[k] < m, nPred = (() => { let c = 0; for (let k = 0; k < N; k++) if (sah[k] && pred(k)) c++; return c; })();
            const low = terendah(zz, sah, nPred);
            grid[`${v}|${a}|${m}`] = {sering: hitungSel(pred, sering, sah), pernah: hitungSel(pred, pernah, sah),
              base: hitungSel(k => low[k], sering, sah), nPred, nTak: H.nTak}; } } }
      let nSering = 0; for (let k = 0; k < N; k++) if (sah[k] && sering[k]) nSering++;
      hasil.push({...s, dx: dem.dx, nSah: sah.reduce((a, b) => a + b, 0), nSering, nFabdem: nFb, nAir: air ? air.reduce((a, b) => a + b, 0) : null, grid});
      console.error(`${i + 1}/${situs.length} ${s.k} sering ${nSering} sel, FABDEM ${nFb}/${N}, air ${air ? air.reduce((a, b) => a + b, 0) : "gagal"}`);
    } catch (e) { console.error(`${i + 1}/${situs.length} ${s.k} GAGAL: ${e.message}`); hasil.push({...s, gagal: e.message}); }
  }
  return {nCalon, hasil};
}

function rangkum({nCalon, hasil}) {
  const ok = hasil.filter(h => !h.gagal), per = peran => ok.filter(h => h.peran === peran);
  const jumlah = (hs, kunci, f) => hs.reduce((t, h) => tambah(t, h.grid[kunci][f]), nol());
  const r3 = v => v == null ? null : Math.round(v * 1000) / 1000;
  /* satu varian: pilih setelan di separuh kalibrasi, nilai sekali di separuh uji */
  const nilai = v => {
    const kisi = CFG.alurKm2.flatMap(a => CFG.muka.map(m => { const kunci = `${v}|${a}|${m}`;
      return {alurKm2: a, m, csiKal: csi(jumlah(per("kalibrasi"), kunci, "sering")), csiUji: csi(jumlah(per("uji"), kunci, "sering")),
        baseUji: csi(jumlah(per("uji"), kunci, "base")), csiUjiPernah: csi(jumlah(per("uji"), kunci, "pernah"))}; }));
    const terbaik = kisi.reduce((b, r) => r.csiKal > b.csiKal ? r : b), kunci = `${v}|${terbaik.alurKm2}|${terbaik.m}`;
    const u = jumlah(per("uji"), kunci, "sering"), b = jumlah(per("uji"), kunci, "base");
    const situsUji = per("uji").map(h => ({k: h.k, csi: csi(h.grid[kunci].sering), base: csi(h.grid[kunci].base), nSering: h.nSering}));
    const menang = situsUji.filter(s => s.csi != null && s.base != null && s.csi > s.base).length, banding = situsUji.filter(s => s.csi != null && s.base != null).length;
    /* berapa sel kisi (alur x muka) yang HAND-nya mengalahkan pembanding di separuh uji */
    const unggulKisi = kisi.filter(r => r.csiUji != null && r.baseUji != null && r.csiUji > r.baseUji).length;
    return {nama: NAMA_VARIAN[v], terpilih: {alurKm2: terbaik.alurKm2, m: terbaik.m, csiKalibrasi: r3(terbaik.csiKal)},
      uji: {nSitus: per("uji").length, csi: r3(csi(u)), pod: r3(u.tp / (u.tp + u.fn || 1)), far: r3(u.fp / (u.tp + u.fp || 1)),
        csiPembanding: r3(csi(b)), situsMenang: menang, situsBanding: banding, unggulKisi, nKisi: kisi.length},
      kisi: kisi.map(r => ({...r, csiKal: r3(r.csiKal), csiUji: r3(r.csiUji), baseUji: r3(r.baseUji), csiUjiPernah: r3(r.csiUjiPernah)})),
      situs: situsUji.map(s => ({...s, csi: r3(s.csi), base: r3(s.base)}))};
  };
  const varian = Object.fromEntries(CFG.varian.map(v => [v, nilai(v)])), layar = varian[CFG.layar];
  return {
    dibuat: new Date().toISOString().slice(0, 16) + "Z",
    sumber: "Kebenaran: Google Flood Forecasting, riwayat genangan (GLAD 1999-2020), CC BY 4.0. DEM: ubin Terrarium (SRTM ~30 m) dan FABDEM V1-2 " +
      "(Hawker dkk. 2022, CC BY-NC-SA 4.0, hanya uji). Air permanen: ESA WorldCover 2021 v200, CC BY 4.0.",
    metode: "scripts/banjir/uji_hand.mjs; muka air seragam di semua alur, kotak 6 km 100 sel seperti tab Simulasi; empat varian DEM x air permanen",
    konfigurasi: {sisi: CFG.sisi, n: CFG.n, benih: CFG.benih, minPersenRiwayat: CFG.minPersen, jarakKm: CFG.jarakKm, nCalon, nSitus: hasil.length, nGagal: hasil.length - ok.length,
      selFabdem: r3(ok.reduce((t, h) => t + h.nFabdem, 0) / (ok.length * CFG.n * CFG.n) || 0), situsTanpaAir: ok.filter(h => h.nAir == null).length},
    /* tingkat atas = varian yang sama dengan layar (dibaca sim_tampak.js) */
    varianLayar: CFG.layar, terpilih: layar.terpilih, uji: layar.uji, kisi: layar.kisi, situs: layar.situs,
    varian: Object.fromEntries(Object.entries(varian).map(([v, x]) => [v, {nama: x.nama, terpilih: x.terpilih, uji: x.uji, kisi: x.kisi}])),
  };
}

function tulisRingkas(R) {
  const p = v => v == null ? "–" : String(v).replace(".", ",");
  const ringkas = Object.entries(R.varian).map(([v, x]) => `| ${v} | ${x.nama} | ${p(x.terpilih.alurKm2)} km2, ${p(x.terpilih.m)} m | ${p(x.uji.csi)} | ${p(x.uji.csiPembanding)} | ${x.uji.situsMenang}/${x.uji.situsBanding} | ${x.uji.unggulKisi}/${x.uji.nKisi} |`);
  const a = R.terpilih.alurKm2, muka = Object.entries(R.varian).map(([v, x]) => x.kisi.filter(r => r.alurKm2 === a));
  const baris = R.varian[R.varianLayar].kisi.filter(r => r.alurKm2 === a).map((r, i) => `| ${p(r.m)} | ${Object.keys(R.varian).map((v, j) => `${p(muka[j][i].csiUji)} / ${p(muka[j][i].baseUji)}`).join(" | ")} |`);
  return `# Uji balik HAND lawan riwayat genangan GLAD\n\nDibuat ${R.dibuat}. ${R.metode}.\n\n` +
    `Situs ${R.konfigurasi.nSitus} (gagal ${R.konfigurasi.nGagal}) dari ${R.konfigurasi.nCalon} kecamatan dengan riwayat genangan sedang+tinggi >= ${R.konfigurasi.minPersenRiwayat}%. ` +
    `Sel yang mendapat nilai FABDEM: ${p(R.konfigurasi.selFabdem)} dari sel darat. Situs tanpa data air WorldCover: ${R.konfigurasi.situsTanpaAir}.\n\n` +
    `Setelan dipilih di separuh kalibrasi, dinilai sekali di separuh uji (${R.uji.nSitus} situs). Pembanding = sel terendah di DEM varian itu, jumlah sel sama.\n\n` +
    `| varian | DEM dan air | setelan terpilih | CSI uji | pembanding | situs menang | kisi unggul |\n|---|---|---|---|---|---|---|\n${ringkas.join("\n")}\n\n` +
    `CSI uji / pembanding per muka air, ambang alur ${p(a)} km2:\n\n| muka air (m) | ${Object.keys(R.varian).join(" | ")} |\n|---|${Object.keys(R.varian).map(() => "---").join("|")}|\n${baris.join("\n")}\n\n` +
    `Catatan:\n\n- Setelan terpilih bisa jatuh di tepi kisi. CSI naik seiring makin banyak sel ditebak (pola sebaran kebenaran, bukan kemampuan HAND), ` +
    `jadi setelan itu bukan optimum dan tidak dipakai di layar. Yang menentukan adalah HAND lawan pembanding di tiap baris.\n` +
    `- Hanya berlaku untuk kecamatan yang memang punya riwayat genangan (situs dipilih dari turunan GLAD yang sama). Salah alarm di kecamatan kering tidak diuji.\n` +
    `- Situs berjarak minimal ${R.konfigurasi.jarakKm} km satu sama lain. n = ${R.uji.nSitus}, tanpa selang kepercayaan.\n` +
    `- FABDEM berlisensi non-komersial: dipakai untuk uji ini saja, tidak disajikan di layar.\n`;
}

function uji() {
  const ok = (c, m) => { if (!c) throw new Error("GAGAL: " + m); };
  /* PNG 2x2 RGB, filter Sub pada baris kedua */
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.from([0, 10, 20, 30, 40, 50, 60, 1, 5, 5, 5, 1, 1, 1]);
  const blok = (j, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(j, 4, "ascii"); d.copy(b, 8); return b; };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), blok("IHDR", ihdr), blok("IDAT", zlib.deflateSync(raw)), blok("IEND", Buffer.alloc(0))]);
  const im = bukaPNG(png); ok(im.w === 2 && im.data[4] === 40 && im.data[8] === 5 && im.data[12] === 6 && im.data[15] === 255, `PNG ${[...im.data]}`);
  /* poligon berlubang */
  const kotak = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]];
  ok(dalam(kotak, 1, 1) && !dalam(kotak, 5, 5) && !dalam(kotak, 11, 5), "genap-ganjil dengan lubang");
  const poli = poligonDi([{properties: {name: "Low_risk"}, geometry: {type: "Polygon", coordinates: kotak}},
    {properties: {name: "High_risk"}, geometry: {type: "MultiPolygon", coordinates: [[[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]]}},
    {properties: {name: "Medium_risk"}, geometry: {type: "Polygon", coordinates: [[[50, 50], [51, 50], [51, 51], [50, 50]]]}}], [-1, -1, 12, 12]);
  ok(poli.length === 2, "poligon di luar kotak dibuang");
  ok(String([...kelasTitik(poli, [[1, 1], [3, 3], [5, 5], [20, 20]])]) === "3,1,0,0", "kelas tertinggi menimpa");
  const sah = Uint8Array.from([1, 1, 1, 1, 0]), benar = Uint8Array.from([1, 1, 0, 0, 1]);
  const c = hitungSel(k => k < 3, benar, sah); ok(c.tp === 2 && c.fp === 1 && c.fn === 0 && Math.abs(csi(c) - 2 / 3) < 1e-9, "TP FP FN, sel tidak sah dilewati");
  ok(String([...terendah([5, 1, 3, 0, 2], Uint8Array.from([1, 1, 1, 0, 1]), 2)]) === "0,1,0,0,1", "terendah melewati sel tidak sah");
  console.log("uji_hand: uji lulus");
}

if (process.argv[2] === "uji") uji();
else if (import.meta.url === `file://${process.argv[1]}`) {
  const R = rangkum(await jalankan());
  fs.writeFileSync(KELUAR, JSON.stringify(R)); fs.writeFileSync(RINGKAS, tulisRingkas(R));
  console.log(tulisRingkas(R));
}
