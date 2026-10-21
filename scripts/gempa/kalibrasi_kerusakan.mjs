/* Setel satu pengali median kerapuhan (kal) ke korban jiwa kejadian nyata, lalu ukur galat leave-one-out -> public/gempa/data/kalibrasi_kerusakan.json.
   Jalur hitung = GempaKerusakan.dampak (sama dengan Sim.hitung: BSSA14 + Vs30 per sel + kecamatan WorldPop). Hanya gempa KERAK; Padang 2009 (slab)
   dicatat terpisah sebagai uji di luar sampel. Jumlah korban ditulis dari ingatan sumbernya (BNPB, USGS PAGER/NEIC, BMKG), BELUM dicocokkan ke
   halaman sumber, dan repo tidak punya kejadian gempa DIBI (kejadian.json hanya banjir/cuaca/longsor/kering): validasi-model wajib mencocokkan.
   Pakai:  node scripts/gempa/kalibrasi_kerusakan.mjs */
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const R = fileURLToPath(new URL("../../public/", import.meta.url));
const c = { console, Math, JSON }; vm.createContext(c);
for (const b of ["gempa/tsunami.js", "gempa/guncangan.js", "gempa/kerusakan.js"]) vm.runInContext(fs.readFileSync(R + b, "utf8"), c);
const model = JSON.parse(fs.readFileSync(R + "gempa/data/model_guncangan.json"));
const meta = JSON.parse(fs.readFileSync(R + "gempa/data/vs30.json"));
export const ctx = { M: c.GempaGuncangan.pasang(model), Tsunami: c.Tsunami, model,
  vs30: c.GempaGuncangan.vs30Grid(meta, new Uint8Array(fs.readFileSync(R + "gempa/data/vs30.bin")), 400),
  pusat: JSON.parse(fs.readFileSync(R + "banjir/data/pusat_kec.json")), pend: JSON.parse(fs.readFileSync(R + "data/penduduk.json")).kec };
export const K = c.GempaKerusakan;

/* jam = jam lokal kejadian; jiwa = meninggal resmi (BNPB) */
export const KEJADIAN = [
  { id: "yogya-2006", nama: "Yogyakarta 27 Mei 2006", lat: -7.96, lon: 110.45, m: 6.3, dalam: 10, strike: 48, jenis: "geser", jam: 5.9, jiwa: 5700, sumber: "BNPB/Bappenas; USGS NEIC (Mw 6,3)" },
  { id: "pidie-2016", nama: "Pidie Jaya 7 Des 2016", lat: 5.28, lon: 96.11, m: 6.5, dalam: 13, strike: 45, jenis: "geser", jam: 5.1, jiwa: 104, sumber: "BNPB; USGS NEIC (Mw 6,5)" },
  { id: "lombok-29jul", nama: "Lombok 29 Jul 2018", lat: -8.26, lon: 116.47, m: 6.4, dalam: 24, strike: 85, jenis: "naik", jam: 6.8, jiwa: 20, sumber: "BNPB; USGS NEIC (Mw 6,4)" },
  { id: "lombok-5agt", nama: "Lombok 5 Agu 2018", lat: -8.29, lon: 116.44, m: 6.9, dalam: 31, strike: 85, jenis: "naik", jam: 19.8, jiwa: 560, sumber: "BNPB; USGS NEIC (Mw 6,9)" },
  { id: "lombok-19agt", nama: "Lombok 19 Agu 2018", lat: -8.3, lon: 116.7, m: 6.9, dalam: 10, strike: 85, jenis: "naik", jam: 22.9, jiwa: 14, sumber: "BNPB; USGS NEIC. Bangunan sudah rusak oleh 5 Agu" },
  { id: "mamuju-2021", nama: "Mamuju 15 Jan 2021", lat: -2.98, lon: 118.89, m: 6.2, dalam: 10, strike: 20, jenis: "naik", jam: 1.5, jiwa: 105, sumber: "BNPB; USGS NEIC (Mw 6,2)" },
  { id: "pasaman-2022", nama: "Pasaman Barat 25 Feb 2022", lat: 0.14, lon: 99.98, m: 6.1, dalam: 12, strike: 330, jenis: "geser", jam: 8.7, jiwa: 25, sumber: "BNPB; USGS NEIC (Mw 6,1)" },
  { id: "cianjur-2022", nama: "Cianjur 21 Nov 2022", lat: -6.84, lon: 107.05, m: 5.6, dalam: 10, strike: 320, jenis: "geser", jam: 13.4, jiwa: 600, sumber: "BNPB (sekitar 600 meninggal); USGS NEIC (Mw 5,6)" },
];
export const DILUAR = { id: "padang-2009", nama: "Padang 30 Sep 2009 (slab, 80 km)", lat: -0.72, lon: 99.87, m: 7.6, dalam: 80, strike: 60, jenis: "geser", jg: "intraslab", jam: 17.2, jiwa: 1115, sumber: "BNPB; USGS NEIC (Mw 7,6)" };

const cache = new Map();
export const jiwaModel = (ev, kal) => { K.atur({ kalib: kal, faktor_loo: 1 }); if (!cache.has(ev.id)) cache.set(ev.id, K.siap(ctx, ev, ev.jg)); const q = cache.get(ev.id); return K.taksir(q.s, q.jg, q.m, q.jam, true).jiwa[1]; };
/* kal yang membuat rerata ln(model/obs) = 0 (bisection pada ln kal; jiwa model turun terhadap kal) */
export function sesuaikan(daftar) {
  let lo = Math.log(0.1), hi = Math.log(10);
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2, kal = Math.exp(mid);
    const s = daftar.reduce((a, ev) => a + Math.log(jiwaModel(ev, kal) / ev.jiwa), 0);
    if (s > 0) lo = mid; else hi = mid; }
  return Math.exp((lo + hi) / 2);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const kal = sesuaikan(KEJADIAN), loo = KEJADIAN.map((ev, i) => {
    const k = sesuaikan(KEJADIAN.filter((_, j) => j !== i)); return { id: ev.id, kal_loo: +k.toFixed(4), model_loo: Math.round(jiwaModel(ev, k)) }; });
  const r = KEJADIAN.map((ev, i) => Math.log(loo[i].model_loo / ev.jiwa)), rms = Math.sqrt(r.reduce((a, x) => a + x * x, 0) / r.length);
  const tabel = KEJADIAN.map((ev, i) => ({ ...ev, model: Math.round(jiwaModel(ev, kal)), model_loo: loo[i].model_loo, kal_loo: loo[i].kal_loo }));
  const pd = { ...DILUAR, model: Math.round(jiwaModel(DILUAR, kal)) };
  const keluar = { dibuat: new Date().toISOString().slice(0, 10), kalib: +kal.toFixed(4), faktor_loo: +Math.exp(rms).toFixed(3), n: KEJADIAN.length,
    catatan: "Satu pengali median kerapuhan disetel agar rerata ln(model/pengamatan) korban jiwa = 0 pada 8 gempa kerak (3 di antaranya rangkaian Lombok, tidak saling bebas). faktor_loo = exp(rms galat ln leave-one-out): model sering meleset sebesar itu (kali atau bagi). Korban jiwa pengamatan ditulis dari ingatan, belum dicocokkan ke halaman sumber. Padang 2009 (slab) di luar kalibrasi.",
    kejadian: tabel, di_luar_sampel: pd };
  fs.writeFileSync(R + "gempa/data/kalibrasi_kerusakan.json", JSON.stringify(keluar, null, 1));
  console.table(tabel.map(t => ({ id: t.id, obs: t.jiwa, model: t.model, loo: t.model_loo })));
  console.log("kal", keluar.kalib, "faktor LOO", keluar.faktor_loo, "Padang", pd.jiwa, "->", pd.model);
}
