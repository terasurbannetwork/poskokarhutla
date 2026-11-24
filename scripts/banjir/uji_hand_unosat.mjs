/* Uji skenario muka sungai HAND (public/banjir/sim_hand.js) lawan genangan banjir Sumatra 28 Nov 2025 dari UNOSAT.

Pakai:  node scripts/banjir/uji_hand_unosat.mjs        # jalankan, tulis public/banjir/data/lab/uji_hand_unosat.json + _ringkas.md
        node scripts/banjir/uji_hand_unosat.mjs uji    # uji fungsi murni (luring)

Kebenaran: UNOSAT FL20251126IDN, S1_20251128_FloodExtent_AcehProvince_SumateraProvince (Sentinel-1, 28 Nov 2025), lisensi
CC BY-SA (HDX). Unduh sekali ke data/raw/banjir/unosat/ (tidak di-commit):
  curl -L -o data/raw/banjir/unosat/FL20251126IDN_SHP.zip https://unosat.org/static/unosat_filesystem/4226/FL20251126IDN_SHP.zip
  unzip -o data/raw/banjir/unosat/FL20251126IDN_SHP.zip -d data/raw/banjir/unosat
Laut dan air permanen dikeluarkan dari sel yang dinilai. WaterExtent UNOSAT berisi SEMUA air terdeteksi (semua titik
banjir juga ada di dalamnya, diperiksa 25 Nov 2026), jadi air permanen = WaterExtent dikurangi FloodExtent.

Prakiraan: persis jalur layar varian TA (Terrarium + air WorldCover), mesin dan cache dipakai ulang dari uji_hand.mjs.
- "terpilih": setelan yang dipilih uji GLAD (public/banjir/data/lab/uji_hand.json, terpilih), dikunci sebelum data ini dibuka;
- "terbaik": muka air terbaik sesudah melihat data ini (batas atas, bukan vonis).
Pembanding: n sel TERENDAH di kotak yang sama, n = jumlah sel tebakan HAND (sama dengan uji GLAD).
Situs: pusat kecamatan Aceh dan Sumatera Utara di dalam cakupan analisis dengan genangan >= 5% kotak 6 km, berjarak >= 12 km.
Satu kejadian ekstrem saja (hujan sekitar 685 mm dalam 3 hari di DAS Tamiang), jadi hasil ini pelengkap uji GLAD, bukan pengganti.
*/
import fs from "node:fs";
import path from "node:path";
import {mesin, ambil, ubinWC, dalam, hitungSel, terendah, csi} from "./uji_hand.mjs";

const AKAR = new URL("../../", import.meta.url).pathname;
const DIR = path.join(AKAR, "data/raw/banjir/unosat/FL20251126IDN_SHP");
const BANJIR = path.join(DIR, "S1_20251128_FloodExtent_AcehProvince_SumateraProvince.shp");
const AIR = path.join(DIR, "S1_20251128_WaterExtent_AcehProvince_SumateraProvince.shp");
const CAKUPAN = path.join(DIR, "S1_20251128_AnalysisExtent_AcehProvince_SumateraProvince.shp");
const KELUAR = path.join(AKAR, "public/banjir/data/lab/uji_hand_unosat.json"), RINGKAS = KELUAR.replace(/\.json$/, "_ringkas.md");
const LAB_GLAD = JSON.parse(fs.readFileSync(path.join(AKAR, "public/banjir/data/lab/uji_hand.json"), "utf8"));
const CFG = {sisi: 6000, n: 100, minPersen: 5, jarakKm: 12, situs: 40, muka: [0.5, 1, 1.5, 2, 3, 4, 5, 7, 10],
  alur: LAB_GLAD.terpilih.alurKm2, mTerpilih: LAB_GLAD.terpilih.m};
const ATRIBUSI = "UNOSAT FL20251126IDN, genangan Sentinel-1 28 Nov 2025 (CC BY-SA, HDX).";

/* shapefile poligon (tipe 5) -> [{bb, cincin: [[[x, y]...]...]}], hanya rekaman yang memotong bbFilter */
export function bacaShp(buf, bbFilter) {
  const hasil = []; let p = 100;
  while (p < buf.length) {
    const ln = buf.readUInt32BE(p + 4) * 2, r = p + 8; p = r + ln;
    if (buf.readInt32LE(r) !== 5) continue;
    const bb = [buf.readDoubleLE(r + 4), buf.readDoubleLE(r + 12), buf.readDoubleLE(r + 20), buf.readDoubleLE(r + 28)];
    if (bbFilter && (bb[2] < bbFilter[0] || bb[0] > bbFilter[2] || bb[3] < bbFilter[1] || bb[1] > bbFilter[3])) continue;
    const nb = buf.readInt32LE(r + 36), nt = buf.readInt32LE(r + 40), o = r + 44 + 4 * nb, bag = [];
    for (let k = 0; k < nb; k++) bag.push(buf.readInt32LE(r + 44 + 4 * k));
    const cincin = bag.map((s, k) => { const e = k + 1 < nb ? bag[k + 1] : nt, c = [];
      for (let i = s; i < e; i++) c.push([buf.readDoubleLE(o + 16 * i), buf.readDoubleLE(o + 16 * i + 8)]); return c; });
    hasil.push({bb, cincin});
  }
  return hasil;
}
/* indeks kisi kasar supaya uji titik tidak memindai semua poligon */
export function indeks(poli, ukuran = 0.05) {
  const m = new Map();
  for (const q of poli) for (let gx = Math.floor(q.bb[0] / ukuran); gx <= Math.floor(q.bb[2] / ukuran); gx++)
    for (let gy = Math.floor(q.bb[1] / ukuran); gy <= Math.floor(q.bb[3] / ukuran); gy++) {
      const k = gx + "," + gy; if (!m.has(k)) m.set(k, []); m.get(k).push(q); }
  return (x, y) => { for (const q of m.get(Math.floor(x / ukuran) + "," + Math.floor(y / ukuran)) || [])
    if (x >= q.bb[0] && x <= q.bb[2] && y >= q.bb[1] && y <= q.bb[3] && dalam(q.cincin, x, y)) return true; return false; };
}

const tambah = (a, b) => ({tp: a.tp + b.tp, fp: a.fp + b.fp, fn: a.fn + b.fn}), nol = () => ({tp: 0, fp: 0, fn: 0});
const r3 = v => v == null ? null : Math.round(v * 1000) / 1000;

async function jalankan() {
  fs.existsSync(BANJIR) || (() => { throw new Error(`berkas UNOSAT tidak ada di ${DIR}; lihat kepala berkas`); })();
  const cakupan = bacaShp(fs.readFileSync(CAKUPAN)), diCakupan = indeks(cakupan, 1);
  const bbAceh = [96.5, 1.0, 100.0, 5.4];
  const diBanjir = indeks(bacaShp(fs.readFileSync(BANJIR), bbAceh)), diAir = indeks(bacaShp(fs.readFileSync(AIR), bbAceh));
  const pusat = JSON.parse(fs.readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"));
  const calon = Object.entries(pusat).filter(([k, [la, lo]]) => /^(11|12)\|/.test(k) && diCakupan(lo, la)).sort(([a], [b]) => a < b ? -1 : 1);
  const {SG, SH, SL} = mesin(), situs = [], jauh = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 111 * Math.cos(a[0] * Math.PI / 180)) >= CFG.jarakKm;
  for (const [k, ll] of calon) {
    if (situs.length >= CFG.situs) break;
    if (!situs.every(s => jauh([s.lat, s.lon], ll))) continue;
    /* saring cepat: genangan di 11 x 11 titik kotak 6 km */
    let c = 0; for (let a = -5; a <= 5; a++) for (let b = -5; b <= 5; b++) if (diBanjir(ll[1] + b * 0.0049, ll[0] + a * 0.0049)) c++;
    if (c / 121 * 100 < CFG.minPersen) continue;
    try {
      const dem = await SG.ambilDEM(ll[0], ll[1], CFG.sisi, CFG.n, ambil), N = dem.nx * dem.ny, prep = SG.siapkanArea(dem);
      const titik = Array.from({length: N}, (_, i) => SG.dariSel(dem, i % dem.nx, (i / dem.nx) | 0));
      const benar = Uint8Array.from(titik, ([x, y]) => diBanjir(x, y) ? 1 : 0);
      /* WaterExtent UNOSAT = semua air terdeteksi (banjir ikut di dalamnya), jadi air permanen = air yang bukan banjir */
      const sah = Uint8Array.from(titik, ([x, y], i) => prep.laut[i] || (!benar[i] && diAir(x, y)) ? 0 : 1);
      const L = await SL.kisiLahan(dem, ubinWC), air = L?.dom ? Uint8Array.from(L.dom, v => v === 80 ? 1 : 0) : null;
      const H = SH.hitung(prep, dem, SG, CFG.alur, air), per = {};
      for (const m of CFG.muka) {
        const pred = i => H.hand[i] < m; let n = 0; for (let i = 0; i < N; i++) if (sah[i] && pred(i)) n++;
        const low = terendah(dem.z, sah, n);
        per[m] = {hand: hitungSel(pred, benar, sah), base: hitungSel(i => low[i], benar, sah), n};
      }
      let nB = 0, nS = 0; for (let i = 0; i < N; i++) if (sah[i]) { nS++; if (benar[i]) nB++; }
      situs.push({k, lat: ll[0], lon: ll[1], nSah: nS, nBanjir: nB, per});
      console.error(`${situs.length} ${k}: banjir ${nB}/${nS} sel`);
    } catch (e) { console.error(`${k} GAGAL: ${e.message}`); }
  }
  return situs;
}

function rangkum(situs) {
  const jumlah = (m, kunci) => situs.reduce((a, s) => tambah(a, s.per[m][kunci]), nol());
  const baris = CFG.muka.map(m => { const h = jumlah(m, "hand"), b = jumlah(m, "base");
    return {m, csiHand: r3(csi(h)), csiTerendah: r3(csi(b)), menangSitus: situs.filter(s => csi(s.per[m].hand) > csi(s.per[m].base)).length}; });
  const pilih = baris.find(b => b.m === CFG.mTerpilih), terbaik = baris.reduce((a, b) => (b.csiHand > a.csiHand ? b : a));
  return {dibuat: new Date().toISOString(), dibuat_oleh: "scripts/banjir/uji_hand_unosat.mjs", atribusi: ATRIBUSI,
    konfigurasi: {...CFG, varian: "TA (layar)"}, nSitus: situs.length, terpilih: pilih, terbaik, perMuka: baris,
    situs: situs.map(s => ({k: s.k, nSah: s.nSah, nBanjir: s.nBanjir}))};
}
function ringkas(R) {
  const t = R.terpilih, b = R.terbaik;
  return `# Uji HAND lawan genangan UNOSAT 28 Nov 2025 (Aceh dan Sumatera Utara)\n\n${R.atribusi}\n\n` +
    `${R.nSitus} situs kotak 6 km, varian layar TA, alur ${R.konfigurasi.alur} km2.\n\n` +
    `| Setelan | Muka air | CSI HAND | CSI sel terendah | Situs HAND menang |\n| --- | --- | --- | --- | --- |\n` +
    `| Terpilih dari uji GLAD (dikunci) | ${t.m} m | ${t.csiHand} | ${t.csiTerendah} | ${t.menangSitus}/${R.nSitus} |\n` +
    `| Terbaik sesudah melihat data (batas atas) | ${b.m} m | ${b.csiHand} | ${b.csiTerendah} | ${b.menangSitus}/${R.nSitus} |\n\n` +
    `Semua muka air: ${R.perMuka.map(x => `${x.m} m ${x.csiHand} lawan ${x.csiTerendah}`).join("; ")}.\n\n` +
    `Satu kejadian ekstrem; pelengkap uji GLAD, bukan pengganti. Skenario debit tidak diuji: Q2 GloFAS belum ada untuk titik di Sumatra.\n`;
}

function uji() {
  const ok = (c, m) => { if (!c) throw new Error("uji_hand_unosat: " + m); };
  /* satu poligon kotak 0..2, ditulis sebagai rekaman shapefile tipe 5 */
  const rek = Buffer.alloc(44 + 4 + 5 * 16); rek.writeInt32LE(5, 0); [0, 0, 2, 2].forEach((v, i) => rek.writeDoubleLE(v, 4 + 8 * i));
  rek.writeInt32LE(1, 36); rek.writeInt32LE(5, 40); rek.writeInt32LE(0, 44);
  [[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]].forEach(([x, y], i) => { rek.writeDoubleLE(x, 48 + 16 * i); rek.writeDoubleLE(y, 56 + 16 * i); });
  const kepala = Buffer.alloc(108); kepala.writeUInt32BE(rek.length / 2, 104);
  const buf = Buffer.concat([kepala, rek]), poli = bacaShp(buf);
  ok(poli.length === 1 && poli[0].cincin[0].length === 5, "baca rekaman");
  ok(bacaShp(buf, [5, 5, 6, 6]).length === 0, "saring bbox");
  const di = indeks(poli, 0.5); ok(di(1, 1) && !di(3, 1), "indeks titik");
  console.log("uji_hand_unosat: uji lulus");
}

if (process.argv[2] === "uji") uji();
else if (import.meta.url === `file://${process.argv[1]}`) { const R = rangkum(await jalankan()); fs.writeFileSync(KELUAR, JSON.stringify(R)); fs.writeFileSync(RINGKAS, ringkas(R)); console.log(ringkas(R)); }
