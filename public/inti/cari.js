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
const MIN = 2, BATAS_LAPIS = 3, BATAS_TOTAL = 12, JEDA_MS = 180, POTONG = 3000, POTONG_CARI = 20000;
/* lapisan besar baru dimuat dan dicari pada ketikan sepanjang ini (lainnya MIN) */
const MIN_BERKAS = {"/data/sekolah.json": 3}, MIN_LAPIS = {sekolah: 3};
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
/* berkas -> {larik, peta}: larik = baris mentah, peta(baris) = item, daftar item, atau null; dipetakan bertahap (potongan + jeda) di muatBerkas.
   Bentuk item sama dengan SUMBER di public/cari.js, tanpa lapisan khas karhutla. */
const SUMBER = {
  "/data/desa_cari.json": (d, nama, pakai) => ({
    larik: [...(pakai.includes("kab") ? Object.entries(d.kab || {}).map(e => ({kab: e})) : []), ...(pakai.includes("desa") ? d.baris : [])],
    peta: r => r.kab ? {t: "kab", n: r.kab[1], p: r.kab[0].slice(0, 2), id: r.kab[0]}
      : {t: "desa", n: r[1], p: r[0].slice(0, 2), k: [r[2] && "Kec. " + r[2], d.kab[r[0].slice(0, 5)]].filter(Boolean).join(", "), id: r[0]}}),
  "/data/posko.json": d => ({
    larik: [...d.pusat.map(x => ({j: 0, x})), ...d.menengah.map(x => ({j: 1, x})), ...d.posko.map(x => ({j: 2, x}))],
    peta: ({j, x}) => j === 0 ? {t: "posko", n: "Posko Pusat " + x.nama, p: x.prov, c: [x.lon, x.lat]}
      : j === 1 ? {t: "posko", n: "Posko Menengah " + x.nama, p: x.prov, k: x.kab, c: [x.lon, x.lat]}
      : {t: "posko", n: "Posko " + x.nama.split(",")[0], p: x.prov, k: [x.nama.split(", ")[1], x.kab].filter(Boolean).join(", "), c: [x.lon, x.lat]}}),
  "/data/bpbd.json": (d, nama) => ({larik: d.kantor.filter(x => x.prov),
    peta: x => ({t: "bpbd", n: /provinsi/i.test(x.nama) ? "BPBD Provinsi " + nama(x.prov) : "BPBD " + kap(x.nama).replace(/^Kab\.?\s+/, ""), p: x.prov, k: x.kab, c: [x.lon, x.lat]})}),
  "/data/fasilitas.json": d => ({larik: d,
    peta: x => (x.t === "rs" || x.t === "faskes") && x.nama && x.nama.length > 5 && !/tanpa nama|^klini[ck]$/i.test(x.nama)
      ? {t: "faskes", n: x.nama.length > 12 && x.nama === x.nama.toUpperCase() ? kap(x.nama) : x.nama, p: x.prov, c: [x.lon, x.lat]} : null}),
  "/data/metar.json": d => ({larik: d, peta: x => ({t: "bandara", n: x.nama, p: x.prov, k: x.icao, c: [x.lon, x.lat]})}),
  "/data/sekolah.json": d => { const K = Object.fromEntries(d.kolom.map((c, k) => [c, k]));
    return {larik: d.baris, peta: r => ({t: "sekolah", n: r[K.nama], p: r[K.prov], k: [r[K.desa] === r[K.desa]?.toUpperCase() ? kap(r[K.desa]) : r[K.desa], r[K.kab]].filter(Boolean).join(", "), c: [r[K.lon], r[K.lat]]})}; },
};
/* siapkan kunci pencarian pada item (satu kali) */
const siapkan = i => { i.s = " " + norm(i.n + " " + (i.k || "")) + " "; i.nn = norm(i.n); return i; };
/* peringkat: 0 nama persis, 1 diawali ketikan, 2 kata pertama di awal kata, 3 sisanya; -1 bila ada kata yang tak cocok */
const peringkat = (i, t, n) => !t.every(w => i.s.includes(w)) ? -1 : i.nn === n ? 0 : i.s.startsWith(" " + n) ? 1 : i.s.includes(" " + t[0]) ? 2 : 3;
/* cari di himpunan item bersiap; per lapisan paling banyak `perLapis`, total `total`; urutan lapisan = `urutan` */
function susun(ember, t, n, {perLapis = BATAS_LAPIS, total = BATAS_TOTAL, urutan = LAPISAN} = {}) {
  const out = [];
  for (const l of urutan) { const xs = ember[l]; if (!xs) continue;
    out.push(...xs.sort((a, b) => a[0] - b[0] || a[1].n.length - b[1].n.length).slice(0, perLapis).map(x => x[1])); }
  /* hasil terbaik tetap naik bila total terpotong: urutkan stabil menurut peringkat lalu potong */
  return out.length > total ? out.map(i => [peringkat(i, t, n), i]).sort((a, b) => a[0] - b[0]).slice(0, total).map(x => x[1]) : out;
}
function cocok(items, q, o = {}) {
  const n = norm(q), t = n.split(" ").filter(Boolean); if (n.length < MIN) return [];
  const ember = {}, lapisan = o.lapisan || null;
  for (const i of items) { if (lapisan && !lapisan.includes(i.t)) continue; const r = peringkat(i, t, n); if (r >= 0) (ember[i.t] ||= []).push([r, i]); }
  return susun(ember, t, n, o);
}
/* pemindaian bertahap: hasil sama dengan cocok(), dipotong per POTONG_CARI item dengan jeda; batal() true = berhenti (null).
   Mengembalikan {hasil, lolos}: lolos = semua item yang cocok, dipakai sebagai himpunan awal bila ketikan berikutnya memperpanjang ketikan ini. */
async function cocokBertahap(items, q, o = {}, batal = () => false) {
  const n = norm(q), t = n.split(" ").filter(Boolean); if (n.length < MIN) return {hasil: [], lolos: []};
  const ember = {}, lolos = [], lapisan = o.lapisan || null;
  for (let a = 0; a < items.length; a += POTONG_CARI) {
    for (let k = a, z = Math.min(a + POTONG_CARI, items.length); k < z; k++) { const i = items[k];
      if (lapisan && !lapisan.includes(i.t)) continue; const r = peringkat(i, t, n); if (r >= 0) { (ember[i.t] ||= []).push([r, i]); lolos.push(i); } }
    if (a + POTONG_CARI < items.length) { await jeda(); if (batal()) return null; }
  }
  return {hasil: susun(ember, t, n, o), lolos};
}
const tampil = (i, nama) => ({t: i.t, jenis: JENIS[i.t] || i.t, n: i.n, ket: i.k || "", p: i.p, prov: nama ? nama(i.p) : i.p, id: i.id, c: i.c});
const bbox = g => { const b = [180, 90, -180, -90]; const sapu = a => typeof a[0] === "number" ? (b[0] = Math.min(b[0], a[0]), b[1] = Math.min(b[1], a[1]), b[2] = Math.max(b[2], a[0]), b[3] = Math.max(b[3], a[1])) : a.forEach(sapu); sapu(g.coordinates); return b; };

/* ---------- muat malas ---------- */
let A = null, reg = null, pakai = [], indeks = [], versi = 0, dimuat = {}, tTunda = 0, no = 0, terakhir = [], cache = null;
const muatReg = () => reg ||= fetch("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null);
const jeda = () => new Promise(r => setTimeout(r));
const ambil = u => fetch(u).then(r => r.ok ? r.json() : Promise.reject(new Error(u + " " + r.status)));
/* satu berkas dimuat sekali, hanya bila salah satu lapisannya dipakai. Item dikumpulkan di larik lokal dan digabung ke indeks SEKALI di akhir,
   jadi kegagalan di tengah tidak meninggalkan item setengah jadi (muat ulang tidak menggandakan). */
const muatBerkas = u => dimuat[u] ||= ambil(u).then(async d => {
  const {larik, peta} = SUMBER[u](d, k => A?.nama ? A.nama(k) : k, pakai), baru = [];
  for (let a = 0; a < larik.length; a += POTONG) {
    for (let k = a, z = Math.min(a + POTONG, larik.length); k < z; k++) { const h = peta(larik[k]); if (!h) continue; for (const i of Array.isArray(h) ? h : [h]) baru.push(siapkan(i)); }
    await jeda();
  }
  for (const i of baru) indeks.push(i);
  versi++;
}).catch(e => { delete dimuat[u]; console.warn("cari", u, e); });
const muatSemua = n => Promise.all(Object.entries(BERKAS).filter(([u, ls]) => n >= (MIN_BERKAS[u] || MIN) && ls.some(l => pakai.includes(l))).map(([u]) => muatBerkas(u)));

async function jalankan(q, panggil, nomor) {
  if (!A) return;
  pakai = lapisanDari(await muatReg(), A.id);
  if (nomor !== no) return;
  if (!pakai.length) { panggil({hasil: [], memuat: false}); return; }
  const n = norm(q), batal = () => nomor !== no, lapisan = pakai.filter(l => n.length >= (MIN_LAPIS[l] || MIN));
  const muat = muatSemua(n.length);
  /* bila ketikan ini memperpanjang ketikan terakhir, indeks dan lapisan sama, pindai hanya yang cocok tadi */
  const kirim = async memuat => {
    if (batal()) return;
    const kunci = lapisan.join(), dari = cache && cache.versi === versi && cache.kunci === kunci && n.startsWith(cache.n) ? cache.lolos : indeks;
    const r = await cocokBertahap(dari, q, {lapisan}, batal); if (!r || batal()) return;
    cache = {n, versi, kunci, lolos: r.lolos};
    terakhirMentah = r.hasil; terakhir = terakhirMentah.map(i => tampil(i, A.nama)); panggil({hasil: terakhir, memuat});
  };
  /* hasil sementara dari yang sudah masuk, lalu hasil penuh saat semua sumber selesai */
  await kirim(true); await muat; await kirim(false);
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
  if (norm(q).length < MIN) { terakhir = []; terakhirMentah = []; cache = null; panggil({hasil: [], memuat: false}); return; }
  tTunda = setTimeout(() => jalankan(q, panggil, nomor), JEDA_MS);
};
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
/* tombol hasil seragam dengan kotak cari halaman: <button data-ci="i">judul<br><small>jenis, ket, provinsi</small></button> */
const html = hasil => hasil.map((h, k) => `<button data-ci="${k}">${esc(h.n)}<br><small>${esc([h.jenis, h.ket, h.t === "kab" ? "" : h.prov].filter(Boolean).join(", "))}</small></button>`).join("");

window.CariLuas = {
  tema: a => { A = a; return a; },
  ketik, pilih, html,
  aktif: async () => !!A && lapisanDari(await muatReg(), A.id).length > 0,   /* registri menyalakan minimal satu lapisan */
  model: {norm, cocok, cocokBertahap, MIN_BERKAS, lapisanDari, siapkan, tampil, bbox, SUMBER, LAPISAN, JENIS, MIN, BATAS_LAPIS, BATAS_TOTAL}};
})();
