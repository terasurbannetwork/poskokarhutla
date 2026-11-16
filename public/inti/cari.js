"use strict";
/* inti/cari.js (PB-75, F-38, D15): SATU mesin kotak cari luas untuk lapisan UMUM semua bencana: kab/kota, desa, faskes, sekolah,
   bandara, posko, BPBD. Sumber data sama dengan karhutla (public/cari.js): data/desa_cari.json, posko.json, bpbd.json, fasilitas.json,
   metar.json, sekolah.json, dimuat MALAS saat pengguna mengetik >= 2 huruf, per sumber (satu gagal, yang lain tetap masuk), indeks
   dinormalkan per potongan 3.000 dengan jeda supaya layar tidak membeku. Lapisan khas karhutla (konsesi, pabrik sawit, Daops, kawasan
   bernama) TIDAK ikut dan tetap di public/cari.js. Karhutla belum memakai mesin ini (PB-80).

   Lapisan yang dipakai dipilih lewat registri: kemampuan.layar.cari di /bencana.json = daftar slug
   (["desa","kab","faskes","sekolah","bandara","posko","bpbd"]); daftar kosong atau registri gagal dimuat = tidak mencari apa pun.
   Provinsi dan hasil khas halaman (mis. lokasi gempa) tetap dari adaptor.

   Adaptor dipasang dengan CariLuas.tema({id, nama, terbang}):
     id: id bencana di registri
     nama: kode provinsi -> nama (mis. namaProv)
     terbang: ({c: [lon, lat]} atau {bb: [barat, selatan, timur, utara]}) -> menerbangkan peta ke sana
   CariLuas.ketik(q, panggil) menunda 180 ms, membatalkan ketikan lama, lalu memanggil panggil({hasil, memuat}); hasil = [{t, jenis, n, ket, p}] terurut,
   dibatasi BATAS_TOTAL. CariLuas.pilih(i) menerbangkan peta ke hasil ke-i dari panggilan terakhir. Angka tidak dihitung; tanpa data dummy. */
(() => {
const MIN = 2, BATAS_LAPIS = 3, BATAS_TOTAL = 12, JEDA_MS = 180, POTONG = 3000;
/* lapisan umum yang dikenal mesin, urutan = urutan tampil */
const LAPISAN = ["kab", "desa", "bandara", "bpbd", "posko", "faskes", "sekolah"];
const JENIS = {kab: "Kabupaten/kota", desa: "Desa / kelurahan", bandara: "Bandara", bpbd: "Kantor BPBD", posko: "Posko", faskes: "Fasilitas kesehatan", sekolah: "Sekolah"};
/* sumber berkas -> lapisan yang dihasilkannya (desa_cari.json menghasilkan kab dan desa) */
const BERKAS = {"/data/desa_cari.json": ["kab", "desa"], "/data/metar.json": ["bandara"], "/data/bpbd.json": ["bpbd"], "/data/posko.json": ["posko"],
  "/data/fasilitas.json": ["faskes"], "/data/sekolah.json": ["sekolah"]};

/* ---------- model murni (diuji di tests/layar/pb_cari.test.mjs) ---------- */
const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const kap = s => (s || "").toLowerCase().replace(/(^|[\s(.\/-])\p{Ll}/gu, c => c.toUpperCase());
/* daftar slug dari registri untuk id; hanya slug yang dikenal mesin, urutan mesin */
const lapisanDari = (r, id) => {
  const b = r && Array.isArray(r.bencana) ? r.bencana.find(x => x.id === id) : null, d = b?.kemampuan?.layar?.cari;
  return Array.isArray(d) ? LAPISAN.filter(l => d.includes(l)) : [];
};
/* baris data -> item {t, n, p, k?, c?} per berkas (bentuk sama dengan SUMBER di public/cari.js, tanpa lapisan khas karhutla) */
const SUMBER = {
  "/data/desa_cari.json": (d, nama, pakai) => [
    ...(pakai.includes("kab") ? Object.entries(d.kab || {}).map(([kd, n]) => ({t: "kab", n, p: kd.slice(0, 2), id: kd})) : []),
    ...(pakai.includes("desa") ? d.baris.map(([kd, n, kc]) => ({t: "desa", n, p: kd.slice(0, 2), k: [kc && "Kec. " + kc, d.kab[kd.slice(0, 5)]].filter(Boolean).join(", "), id: kd})) : [])],
  "/data/posko.json": d => [...d.pusat.map(x => ({t: "posko", n: "Posko Pusat " + x.nama, p: x.prov, c: [x.lon, x.lat]})),
    ...d.menengah.map(x => ({t: "posko", n: "Posko Menengah " + x.nama, p: x.prov, k: x.kab, c: [x.lon, x.lat]})),
    ...d.posko.map(x => ({t: "posko", n: "Posko " + x.nama.split(",")[0], p: x.prov, k: [x.nama.split(", ")[1], x.kab].filter(Boolean).join(", "), c: [x.lon, x.lat]}))],
  "/data/bpbd.json": (d, nama) => d.kantor.filter(x => x.prov).map(x => ({t: "bpbd", n: /provinsi/i.test(x.nama) ? "BPBD Provinsi " + nama(x.prov) : "BPBD " + kap(x.nama).replace(/^Kab\.?\s+/, ""), p: x.prov, k: x.kab, c: [x.lon, x.lat]})),
  "/data/fasilitas.json": d => d.filter(x => (x.t === "rs" || x.t === "faskes") && x.nama && x.nama.length > 5 && !/tanpa nama|^klini[ck]$/i.test(x.nama))
    .map(x => ({t: "faskes", n: x.nama.length > 12 && x.nama === x.nama.toUpperCase() ? kap(x.nama) : x.nama, p: x.prov, c: [x.lon, x.lat]})),
  "/data/metar.json": d => d.map(x => ({t: "bandara", n: x.nama, p: x.prov, k: x.icao, c: [x.lon, x.lat]})),
  "/data/sekolah.json": d => { const K = Object.fromEntries(d.kolom.map((c, k) => [c, k]));
    return d.baris.map(r => ({t: "sekolah", n: r[K.nama], p: r[K.prov], k: [r[K.desa] === r[K.desa]?.toUpperCase() ? kap(r[K.desa]) : r[K.desa], r[K.kab]].filter(Boolean).join(", "), c: [r[K.lon], r[K.lat]]})); },
};
/* siapkan kunci pencarian pada item (satu kali) */
const siapkan = i => { i.s = " " + norm(i.n + " " + (i.k || "")) + " "; i.nn = norm(i.n); return i; };
/* peringkat: 0 nama persis, 1 diawali ketikan, 2 kata pertama di awal kata, 3 sisanya; -1 bila ada kata yang tak cocok */
const peringkat = (i, t, n) => !t.every(w => i.s.includes(w)) ? -1 : i.nn === n ? 0 : i.s.startsWith(" " + n) ? 1 : i.s.includes(" " + t[0]) ? 2 : 3;
/* cari di himpunan item bersiap; per lapisan paling banyak `perLapis`, total `total`; urutan lapisan = `urutan` */
function cocok(items, q, {perLapis = BATAS_LAPIS, total = BATAS_TOTAL, urutan = LAPISAN, lapisan = null} = {}) {
  const n = norm(q), t = n.split(" ").filter(Boolean); if (n.length < MIN) return [];
  const ember = {};
  for (const i of items) { if (lapisan && !lapisan.includes(i.t)) continue; const r = peringkat(i, t, n); if (r >= 0) (ember[i.t] ||= []).push([r, i]); }
  const out = [];
  for (const l of urutan) { const xs = ember[l]; if (!xs) continue;
    out.push(...xs.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length).slice(0, perLapis).map(x => x[1])); }
  /* hasil terbaik tetap naik bila total terpotong: urutkan stabil menurut peringkat lalu potong */
  return out.length > total ? out.map(i => [peringkat(i, t, n), i]).sort((a, b) => a[0] - b[0]).slice(0, total).map(x => x[1]) : out;
}
const tampil = (i, nama) => ({t: i.t, jenis: JENIS[i.t] || i.t, n: i.n, ket: i.k || "", p: i.p, prov: nama ? nama(i.p) : i.p, id: i.id, c: i.c});
const bbox = g => { const b = [180, 90, -180, -90]; const sapu = a => typeof a[0] === "number" ? (b[0] = Math.min(b[0], a[0]), b[1] = Math.min(b[1], a[1]), b[2] = Math.max(b[2], a[0]), b[3] = Math.max(b[3], a[1])) : a.forEach(sapu); sapu(g.coordinates); return b; };

/* ---------- muat malas ---------- */
let A = null, reg = null, pakai = [], indeks = [], dimuat = {}, tTunda = 0, no = 0, terakhir = [];
const muatReg = () => reg ||= fetch("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null);
const jeda = () => new Promise(r => setTimeout(r));
const ambil = u => fetch(u).then(r => r.ok ? r.json() : Promise.reject(new Error(u + " " + r.status)));
/* satu berkas dimuat sekali, hanya bila salah satu lapisannya dipakai */
const muatBerkas = u => dimuat[u] ||= ambil(u).then(async d => {
  const xs = SUMBER[u](d, k => A?.nama ? A.nama(k) : k, pakai);
  for (let a = 0; a < xs.length; a += POTONG) { for (const i of xs.slice(a, a + POTONG)) indeks.push(siapkan(i)); await jeda(); }
}).catch(e => { delete dimuat[u]; console.warn("cari", u, e); });
const muatSemua = () => Promise.all(Object.entries(BERKAS).filter(([, ls]) => ls.some(l => pakai.includes(l))).map(([u]) => muatBerkas(u)));

async function jalankan(q, panggil, nomor) {
  if (!A) return;
  pakai = lapisanDari(await muatReg(), A.id);
  if (nomor !== no) return;
  if (!pakai.length) { panggil({hasil: [], memuat: false}); return; }
  const muat = muatSemua();
  /* hasil sementara dari yang sudah masuk, lalu hasil penuh saat semua sumber selesai */
  const kirim = memuat => { if (nomor !== no) return; terakhirMentah = cocok(indeks, q, {lapisan: pakai}); terakhir = terakhirMentah.map(i => tampil(i, A.nama)); panggil({hasil: terakhir, memuat}); };
  kirim(true); await muat; kirim(false);
}
let terakhirMentah = [];

/* desa dan kab tak punya titik: ambil kotak batas dari berkas geo, dimuat saat dipilih */
async function kotak(i) {
  if (i.t === "desa") { const fc = await ambil(`/geo/desa/${i.id.slice(0, 5)}.json`), f = fc.features.find(x => x.properties.kd === i.id); return f ? bbox(f.geometry) : null; }
  if (i.t === "kab") { const fc = await ambil(`/geo/kabupaten/${i.id.slice(0, 2)}.json`), f = fc.features.find(x => norm(x.properties.kab) === norm(i.n)); return f ? bbox(f.geometry) : null; }
  return null;
}
async function pilih(k) {
  const i = terakhirMentah[k]; if (!i || !A) return false;
  if (i.c && Number.isFinite(i.c[0]) && Number.isFinite(i.c[1])) { A.terbang({c: i.c}); return true; }
  try { const bb = await kotak(i); if (bb) { A.terbang({bb}); return true; } } catch (e) { console.warn("cari kotak", e); }
  return false;
}
const ketik = (q, panggil) => {
  clearTimeout(tTunda); const nomor = ++no;
  if (norm(q).length < MIN) { terakhir = []; terakhirMentah = []; panggil({hasil: [], memuat: false}); return; }
  tTunda = setTimeout(() => jalankan(q, panggil, nomor), JEDA_MS);
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
/* tombol hasil seragam dengan kotak cari halaman: <button data-ci="i">judul<br><small>jenis, ket, provinsi</small></button> */
const html = hasil => hasil.map((h, k) => `<button data-ci="${k}">${esc(h.n)}<br><small>${esc([h.jenis, h.ket, h.t === "kab" ? "" : h.prov].filter(Boolean).join(", "))}</small></button>`).join("");

window.CariLuas = {
  tema: a => { A = a; return a; },
  ketik, pilih, html,
  aktif: async () => !!A && lapisanDari(await muatReg(), A.id).length > 0,   /* registri menyalakan minimal satu lapisan */
  model: {norm, cocok, lapisanDari, siapkan, tampil, bbox, SUMBER, LAPISAN, JENIS, MIN, BATAS_LAPIS, BATAS_TOTAL}};
})();
