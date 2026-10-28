/* Server MCP remote (POST /mcp): Streamable HTTP, STATELESS (tanpa sesi, tanpa Durable Objects, tanpa SDK), JSON-RPC 2.0 dengan satu jawaban JSON per POST.
   Tool memanggil logika API v1 secara internal (berkas data dari ASSETS, pembaca D1/R2 yang sama dengan /api/v1), bukan fetch HTTP ke diri sendiri.
   - Tool publik: tanpa kunci. Tool berkunci: hanya terdaftar di tools/list bila header X-API-Key sah dengan cakupan yang cocok (kunci: src/api_v1.js kunciSah).
   - Hasil ringkas: disaring/diagregasi di server, ada parameter limit, dan batas keras BATAS_TEKS; lewat batas = isError, bukan badan raksasa.
   - Galat input/data = result.isError (model bisa membaca dan memperbaiki); galat protokol = error JSON-RPC (-32700, -32600, -32601, -32602).
   - Origin: ditolak (403) HANYA bila ada dan host-nya loopback/localhost/jaringan privat. Alasan: serangan DNS rebinding memakai peramban di jaringan korban
     untuk menjangkau layanan lokal; server ini publik dan tanpa cookie/kredensial ambient (kunci dikirim lewat header yang tak bisa dipasang lintas-origin
     tanpa preflight), jadi Origin web publik apa pun aman, dan klien non-peramban (curl, claude, Cursor) memang tidak mengirim Origin.
   - CORS terbuka seperti /api/v1, tanpa Allow-Credentials. Ditangani di fetch() worker.js sebelum gerbang centurisk97.id: terbuka di semua host. */
import {bacaBytes, ipHash} from "./worker.js";
import {laju} from "./bnpb.js";
import {kunciSah, DATA, riwayatSel, konsesi} from "./api_v1.js";
import {bacaDaftar, bacaRekap, KOLOM_V1} from "./rumah_rusak.js";
import {kirim} from "./bangunan.js";
import {bacaLaporan} from "./laporan_bnpb.js";
import {cariHukum, bacaDok, bacaRelasi} from "./hukum.js";

const JAM = 3600e3, VERSI_SERVER = "1.0.0", PROTOKOL = ["2025-06-18", "2025-03-26", "2024-11-05"], MAKS_BODY = 65536, BATAS_TEKS = 24000, BATAS_IP = [[JAM, 600]];
const CORS = {"access-control-allow-origin": "*", "access-control-allow-headers": "X-API-Key, Mcp-Session-Id, MCP-Protocol-Version, Content-Type, Accept", "access-control-allow-methods": "POST, OPTIONS", "access-control-max-age": "86400"};
const KEYAKINAN = ["rendah", "nominal", "tinggi"];
const kodeHttp = s => s === 413 ? -32600 : -32001;   // -32600 permintaan tak sah; -32001 ditolak server (kunci, cakupan, laju, Origin, layanan belum tersedia)

class GalatTool extends Error {}
const tolak = pesan => { throw new GalatTool(pesan); };

/* ---------------- data publik dari aset (parse sekali per isolate, segar 10 menit) ---------------- */
const CACHE = new Map();
async function data(env, url, nama) {
  const c = CACHE.get(nama); if (c && Date.now() - c.t < 600e3) return c.d;
  const r = await env.ASSETS.fetch(new Request(new URL(DATA[nama], url)));
  if (!r.ok) { r.body?.cancel(); tolak(`data '${nama}' belum tersedia`); }
  const d = await r.json(); CACHE.set(nama, {t: Date.now(), d}); return d;
}
const lima = (a, urut, n) => [...a].sort(urut).slice(0, n);

/* ---------------- skema argumen ---------------- */
const P_PROV = {type: "string", pattern: "^\\d{2}$", description: "Kode provinsi BPS 2 digit, mis. 62 = Kalimantan Tengah. Daftar kode: tool daftar_wilayah."};
const P_LIMIT = (maks, awal) => ({type: "integer", minimum: 1, maximum: maks, default: awal, description: `Jumlah baris maksimum (1-${maks}, bawaan ${awal}).`});
const P_KOOR = (d, minimum, maximum) => ({type: "number", minimum, maximum, description: d});
const P_TGL = d => ({type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: d});
function cekArgumen(skema, a) {
  a ??= {};
  if (typeof a !== "object" || Array.isArray(a)) return {galat: "arguments harus objek"};
  const out = {};
  for (const k of Object.keys(a)) if (!Object.hasOwn(skema.properties, k)) return {galat: `argumen '${k}' tidak dikenal; yang sah: ${Object.keys(skema.properties).join(", ") || "(tanpa argumen)"}`};
  for (const [k, p] of Object.entries(skema.properties)) {
    const v = a[k];
    if (v === undefined || v === null) { if (skema.required?.includes(k)) return {galat: `argumen '${k}' wajib`}; if (p.default !== undefined) out[k] = p.default; continue; }
    if (p.type === "integer" && (!Number.isInteger(v) || v < (p.minimum ?? -Infinity) || v > (p.maximum ?? Infinity))) return {galat: `argumen '${k}' harus bilangan bulat ${p.minimum ?? ""}..${p.maximum ?? ""}`};
    if (p.type === "number" && (typeof v !== "number" || !Number.isFinite(v) || v < p.minimum || v > p.maximum)) return {galat: `argumen '${k}' harus angka ${p.minimum}..${p.maximum}`};
    if (p.type === "string") {
      if (typeof v !== "string" || v.length > (p.maxLength ?? 200)) return {galat: `argumen '${k}' harus teks (maks ${p.maxLength ?? 200} huruf)`};
      if (p.pattern && !new RegExp(p.pattern).test(v)) return {galat: `argumen '${k}' berformat salah (${p.description || p.pattern})`};
    }
    if (p.enum && !p.enum.includes(v)) return {galat: `argumen '${k}' harus salah satu dari: ${p.enum.join(", ")}`};
    out[k] = v;
  }
  return {a: out};
}

/* ---------------- tool publik ---------------- */
function indeksWilayah(daftar, prov, kab) {   // "kodeprov|kabupaten|kecamatan" -> himpunan indeks yang cocok
  const s = new Set(); daftar.forEach((w, i) => { const [p, k] = w.split("|"); if ((!prov || p === prov) && (!kab || k.toLowerCase() === kab.toLowerCase())) s.add(i); });
  return s;
}
async function titikApi(env, url, {prov, kab, jam, limit}) {
  const d = await data(env, url, jam === 72 ? "hotspot72" : "hotspot24"), cocok = indeksWilayah(d.wilayah, prov, kab), ih = d.kolom.indexOf("hitung");
  /* yang dihitung = kolom "hitung" (lokasi unik ~375 m per hari WIB, 4 satelit, semua keyakinan sejak 28 Okt 2026; scripts/data/titik_unik.py) */
  /* berkas lama tanpa kolom itu (sebelum jalan data pertama sesudah 25 Okt 2026): sensor_utama + keyakinan_min seperti dulu */
  const utama = new Set(d.sensor_utama), dihitung = ih >= 0 ? r => r[ih] === 1 : r => utama.has(r[3]) && r[5] >= (d.keyakinan_min ?? 0);
  const per = {}; const baris = d.baris.filter(r => r[2] >= -jam && dihitung(r) && cocok.has(r[6]));
  for (const r of baris) per[r[3]] = (per[r[3]] || 0) + 1;
  const atas = lima(baris, (x, y) => y[4] - x[4], limit), wil = [...new Set(atas.map(r => r[6]))];   // baris berbentuk larik + tabel wilayah, supaya 200 titik muat di batas teks
  return {acuan_utc: d.acuan, jam, jumlah_cocok: baris.length, per_sensor: per, ditampilkan: atas.length, urut: "frp_mw menurun (daya radiasi api)",
    kolom: ["lat", "lon", "jam_lalu", "sensor", "frp_mw", "keyakinan", "wilayah", "tanggal_wib"], wilayah: wil.map(i => d.wilayah[i].split("|")),
    titik: atas.map(r => [r[0], r[1], Math.round(-r[2] * 10) / 10, r[3], r[4], KEYAKINAN[r[5]], wil.indexOf(r[6]), r[7]]),
    catatan: "titik = larik baris menurut 'kolom'; wilayah = indeks ke tabel 'wilayah' ([kode provinsi, kabupaten/kota, kecamatan]). Yang dihitung: lokasi unik ~375 m per hari WIB dari M (MODIS), N (VIIRS S-NPP), N20 (VIIRS NOAA-20), N21 (VIIRS NOAA-21), keyakinan sedang/tinggi; per_sensor = satelit yang pertama mendeteksi lokasi itu. jam_lalu = jam sebelum waktu acuan data. Sumber: NASA FIRMS."};
}
async function statusKabupaten(env, url, {prov, urut, limit}) {
  const l = await data(env, url, "laporan"), i = l.hari.indexOf(l.hari_lengkap);
  if (i < 0) tolak("laporan harian belum punya hari lengkap");
  const baris = l.kab.filter(k => !prov || k.prov === prov).map(k => ({nama: k.nama, prov: k.prov, titik: k.titik[i] ?? 0, titik_total: k.titik.reduce((a, b) => a + b, 0), luas_ha: k.luas[i] ?? 0, level: k.level ?? null, fwi_maks: k.fwi_maks ?? null, kompleks: k.kompleks ?? null}));
  const kunci = {titik: "titik", luas: "luas_ha", level: "level", fwi: "fwi_maks"}[urut];
  return {tanggal: l.hari_lengkap, dibuat: l.dibuat, jumlah_kabupaten: baris.length, urut: kunci + " menurun", kabupaten: lima(baris, (a, b) => (b[kunci] ?? -1) - (a[kunci] ?? -1), limit),
    catatan: `titik = titik panas pada ${l.hari_lengkap} (hari lengkap terakhir); titik_total = jumlah ${l.hari.length} hari (${l.hari[0]} s.d. ${l.hari.at(-1)}); luas_ha = indikasi luas terbakar dari titik panas, bukan citra; level dan fwi_maks (indeks cuaca kebakaran) makin besar makin berisiko. Sumber: NASA FIRMS, olahan Centurisk97.`};
}
async function laporanHarian(env, url, {tanggal}) {
  const l = await data(env, url, "laporan"), t = tanggal ?? l.hari_lengkap, i = l.hari.indexOf(t);
  if (i < 0) tolak(`tanggal ${t} tidak ada di laporan; tersedia ${l.hari[0]} s.d. ${l.hari.at(-1)}`);
  const prov = Object.entries(l.prov).map(([kode, p]) => ({kode, nama: p.nama, titik: p.titik[i] ?? 0, luas_ha: p.luas[i] ?? 0})).sort((a, b) => b.titik - a.titik);
  return {tanggal: t, hari_lengkap: l.hari_lengkap, lengkap: t <= l.hari_lengkap, dibuat: l.dibuat, jadwal: l.jadwal, nasional: {titik: l.nasional.titik[i], luas_ha: l.nasional.luas[i], luas_baru_ha: l.nasional.baru[i], kabupaten_bertitik: l.nasional.kab[i]},
    tahun_berjalan: {luas_ha: l.tahun_berjalan.ha, rentang_ha: [l.tahun_berjalan.rendah, l.tahun_berjalan.tinggi], sampai: l.tahun_berjalan.sd}, provinsi: prov,
    catatan: "Titik panas = lokasi unik ~375 m per hari laporan dari MODIS + VIIRS S-NPP + NOAA-20 + NOAA-21. luas_ha = indikasi dari titik panas, bukan citra. Sumber: NASA FIRMS, KLHK SiPongi, BNPB, olahan Centurisk97."};
}
async function kualitasUdara(env, url, {prov}) {
  const u = await data(env, url, "udara_kualitas"), kol = u.kolom_prov;
  const baris = Object.entries(u.prov).filter(([k]) => !prov || k === prov);
  if (prov && !baris.length) tolak(`provinsi ${prov} tidak ada di data kualitas udara`);
  const bentuk = ([kode, hari]) => ({kode, nama: u.nama_prov[kode], per_hari: hari.map((h, i) => ({tanggal: u.hari[i], rata_pm25: h[kol.indexOf("rata_pm25")], maks_pm25: h[kol.indexOf("maks_pm25")],
    jiwa_tidak_sehat_atau_lebih_buruk: h[2] + h[3] + h[4]}))});
  const pilih = prov ? baris : lima(baris, (a, b) => b[1][0][5] - a[1][0][5], 10);
  const kab = (u.kab[0] || []).filter(k => !prov || k[0] === prov).slice(0, 10).map(k => ({prov: k[0], kabupaten: k[1], rata_pm25: k[2], maks_pm25: k[3], jiwa: k[4], jiwa_tidak_sehat: k[5]}));
  return {dibuat: u.dibuat, status_validasi: u.status_validasi, hari: u.hari, provinsi: pilih.map(bentuk), kabupaten_teratas_hari_pertama: kab,
    catatan: `PM2,5 dalam µg/m³, prakiraan model CAMS (Copernicus) lewat Open-Meteo, belum divalidasi stasiun. ${prov ? "" : "Tanpa prov: 10 provinsi dengan rata-rata tertinggi di hari pertama. "}jiwa_* = penduduk (WorldPop 2026) di sel dengan kategori tersebut.`};
}
async function peringatanAktif(env, url) {
  const p = await data(env, url, "peringatan");
  const now = p.nowcast.filter(n => n.aktif).slice(0, 30).map(n => ({jenis: n.event, tingkat: n.severity, mendesak: n.urgency, mulai: n.mulai, selesai: n.selesai, wilayah: n.wilayah, ringkasan: n.headline, prov: n.prov}));
  const gel = p.gelombang.map(g => ({wilayah: g.wilayah, prov: g.prov, dari: g.dari, sampai: g.sampai, zona_waktu: g.zona, perairan_sedang: g.sedang.length, perairan_tinggi: g.tinggi.length, perairan_sangat_tinggi: g.sangat_tinggi.length, perairan_ekstrem: g.ekstrem.length}))
    .filter(g => g.perairan_tinggi + g.perairan_sangat_tinggi + g.perairan_ekstrem > 0).slice(0, 30);
  return {dibuat: p.dibuat, peringatan_cuaca_aktif: now, gelombang_tinggi_atau_lebih: gel,
    catatan: "Sumber: BMKG (cantumkan sumber). Hanya yang berstatus aktif saat berkas dibuat; cek 'dibuat' untuk umur data. Untuk keputusan operasional rujuk bmkg.go.id."};
}
async function daftarWilayah(env, url, {prov}) {
  if (!prov) { const m = await data(env, url, "meta"); return {provinsi: Object.entries(m.provinsi).map(([kode, nama]) => ({kode, nama}))}; }
  const l = await data(env, url, "laporan"), kab = l.kab.filter(k => k.prov === prov).map(k => k.nama).sort();
  if (!kab.length) tolak(`provinsi ${prov} tidak dikenal atau belum punya kabupaten di data`);
  return {prov, jumlah: kab.length, kabupaten: kab, catatan: "Nama kabupaten/kota persis seperti dipakai argumen kab."};
}

async function riwayatLokasi(env, url, a) {
  const j = await dariRespons(await riwayatSel(env, url, new URLSearchParams({lat: a.lat.toFixed(10), lon: a.lon.toFixed(10)})));
  return {...j, catatan: j.catatan ?? "data = rekaman sel 0,05 derajat (sekitar 5 km) dari arsip VIIRS S-NPP sejak th0: y = titik per tahun, yd = titik sampai tanggal sd tiap tahun, m = titik per bulan, r = lama episode (hari), k = episode per tahun terbakar, x = jangkauan km, v = pergeseran, s = awal dan akhir musim (hari ke-), nm = % deteksi malam. Pola masa lalu, bukan prakiraan fisika."};
}

/* ---------------- tool berkunci: logika yang sama dengan /api/v1 ---------------- */
async function dariRespons(r) {   // Response pembaca v1 -> objek, atau GalatTool dengan pesan galat aslinya
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { tolak(`jawaban bukan JSON (${r.status})`); }
  if (!r.ok) tolak(j?.galat || `galat ${r.status}`);
  return j;
}
function ringkas(v, n) {   // larik dipotong n elemen di semua kedalaman; {dipotong} mencatat berapa banyak yang dibuang
  let buang = 0;
  const f = x => Array.isArray(x) ? (x.length > n ? (buang += x.length - n, x.slice(0, n).map(f)) : x.map(f)) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([k, y]) => [k, f(y)])) : x;
  return {isi: f(v), buang};
}
async function rumahRusak(env, url, a, kini) {
  const q = new URLSearchParams(); for (const k of ["bencana", "prov", "kab", "dari", "sampai"]) if (a[k]) q.set(k, a[k]);
  const d = await bacaDaftar(env, q, {sah: true, kolom: KOLOM_V1}); if (d instanceof Response) await dariRespons(d);
  return {jumlah_cocok_maks_500: d.baris.length, ditampilkan: Math.min(d.baris.length, a.limit), urut: "waktu lapor menurun", laporan: d.baris.slice(0, a.limit),
    catatan: "Hanya laporan berstatus sah; tanpa pelapor, foto, dan catatan bebas; koordinat dibulatkan 4 desimal (sekitar 11 m). tingkat = berat (RB) / sedang (RS) / ringan (RR). Diinput tim lapangan, bukan angka resmi BNPB."};
}
async function rumahRusakRekap(env, url, a, kini) {
  const q = new URLSearchParams(); for (const k of ["bencana", "prov", "dari", "sampai"]) if (a[k]) q.set(k, a[k]);
  const j = await dariRespons(await bacaRekap(env, new URL("/x?" + q, url), kini, 1000));
  return {dari: j.dari, sampai: j.sampai, bencana: j.bencana, prov: j.prov, total: j.total, kabupaten: j.kab.slice(0, 100), kabupaten_dipotong: Math.max(0, j.kab.length - 100),
    catatan: "Jumlah rumah rusak (berat/sedang/ringan) per kabupaten/kota, hanya status sah. Tanpa tanggal: hari ini WIB. Rentang maksimal 366 hari."};
}
async function bangunanTerpapar(env, url, a) {
  const { isi, buang } = ringkas(await dariRespons(await kirim(env, "bangunan/terpapar.json")), a.limit);
  return {...(isi && typeof isi === "object" && !Array.isArray(isi) ? isi : {isi}), _dipotong_elemen: buang, _catatan: "Paparan bangunan (Google Open Buildings) per bahaya. Larik dipotong sampai 'limit' elemen pertama; naikkan limit bila perlu."};
}
async function laporanBnpb(env, url, a) {
  const q = new URLSearchParams({jenis: a.jenis}); if (a.tanggal) q.set("tanggal", a.tanggal);
  const j = await dariRespons(await bacaLaporan(env, new URL("/x?" + q, url), true));
  if (JSON.stringify(j).length <= BATAS_TEKS) return j;
  const { isi, buang } = ringkas(j, 20); return {...isi, _dipotong_elemen: buang, _catatan: "Isi besar: larik dipotong 20 elemen pertama."};
}

async function konsesiPerusahaan(env, url, a) {   // ringkas: tanpa geometri, harian, dan riwayat kompleks
  const q = new URLSearchParams({prov: a.prov}); if (a.nama) q.set("nama", a.nama);
  const j = await dariRespons(await konsesi(env, new URL("/x?" + q, url), true));   // selalu berkas ringkas: berkas penuh terlalu mahal diurai di Workers
  const pt = j.perusahaan.map(x => ({nama: x.nama, jenis: x.jenis, grup: x.grup || null, negara: x.negara, kabupaten: x.kab, titik: x.titik, titik_7h: x.titik_7h, kompleks_aktif: x.kompleks_aktif ?? 0, terakhir: x.terakhir}))
    .sort((x, y) => (y.titik ?? 0) - (x.titik ?? 0));
  return {prov: j.prov, provinsi: j.nama, jumlah_cocok: pt.length, ditampilkan: Math.min(pt.length, a.limit), urut: "titik menurun", perusahaan: pt.slice(0, a.limit),
    catatan: "titik = titik panas VIIRS di dalam konsesi sejak awal tahun; titik_7h = tujuh hari terakhir; kompleks_aktif = kelompok titik aktif terkini. Titik panas bukan bukti kebakaran dan bukan bukti kesalahan perusahaan. Batas konsesi dari data publik lama (lihat sumber di /api/v1/konsesi)."};
}

/* Pustaka Hukum BNPB: pembaca D1 yang sama dengan rute /api/hukum (src/hukum.js) */
const hukumOk = d => { if (d.galat) tolak(d.galat); return d; };
const P_IDDOK = {type: "string", pattern: "^[a-z0-9-]{3,60}$", description: "Id dokumen kanonik, mis. perban-1-2026 (hasil cari_peraturan_bnpb, kolom dok)."};
async function cariPeraturan(env, url, a) {
  const d = hukumOk(await cariHukum(env, {q: a.q, jenis: a.jenis, tahun: a.tahun, status: a.status, limit: a.limit}));
  return {total: d.total, ditampilkan: d.hasil.length, hasil: d.hasil, catatan: "cuplikan memberi tanda [[kata]] pada kata yang cocok. Kutip sebagai 'label pasal + id dokumen' (mis. Pasal 5 perban-1-2026). Baca penuh dengan baca_peraturan_bnpb."};
}
async function bacaPeraturan(env, url, a) {
  const d = hukumOk(await bacaDok(env, a.id, a.pasal)), meta = {id: d.id, judul: d.judul, jenis: d.jenis, nomor: d.nomor, tahun: d.tahun, status: d.status, resmi: d.resmi, sumber: d.sumber, url: d.url, pdf: d.pdf};
  if (a.pasal) return {...meta, segmen: d.segmen.map(s => ({label: s.label, bab: s.bab, halaman: s.halaman, teks: s.teks}))};
  let sisa = 16000; const segmen = [];
  for (const s of d.segmen) { if (sisa <= 0) break; const t = s.teks.slice(0, sisa); sisa -= t.length; segmen.push({label: s.label, bab: s.bab, halaman: s.halaman, teks: t}); }
  return {...meta, daftar_isi: d.segmen.map(s => s.label), segmen, dipotong: segmen.length < d.segmen.length || sisa <= 0,
    catatan: "Teks dipotong sekitar 16000 huruf; untuk pasal tertentu isi argumen pasal (mis. 'Pasal 5'). Kutip label pasal + id dokumen."};
}
async function relasiPeraturan(env, url, a) { return hukumOk(await bacaRelasi(env, a.id)); }

const TOOLS = [
  {nama: "titik_api_terkini", deskripsi: "Titik panas (hotspot) satelit di Indonesia dalam 24 atau 72 jam terakhir, terurut dari daya api (FRP, megawatt) terbesar. Bisa disaring per provinsi dan kabupaten/kota. Sumber NASA FIRMS (MODIS, VIIRS S-NPP, VIIRS NOAA-20), diperbarui tiap 3 jam. Titik panas adalah indikasi, belum tentu kebakaran.",
    skema: {properties: {prov: P_PROV, kab: {type: "string", maxLength: 80, description: "Nama kabupaten/kota persis (tak peka huruf besar), mis. Kapuas."}, jam: {type: "integer", enum: [24, 72], default: 24, description: "Rentang jam ke belakang dari waktu data terakhir: 24 atau 72."}, limit: P_LIMIT(200, 50)}}, jalan: titikApi},
  {nama: "status_kabupaten", deskripsi: "Peringkat kabupaten/kota menurut titik panas hari lengkap terakhir, indikasi luas terbakar (hektare), tingkat kewaspadaan (level), dan indeks cuaca kebakaran (FWI) maksimum. Sumber laporan harian karhutla Centurisk97 (olahan NASA FIRMS dan data cuaca), diperbarui tiap 3 jam.",
    skema: {properties: {prov: P_PROV, urut: {type: "string", enum: ["titik", "luas", "level", "fwi"], default: "titik", description: "Urut menurun menurut: titik (jumlah titik panas), luas (hektare), level, atau fwi."}, limit: P_LIMIT(100, 20)}}, jalan: statusKabupaten},
  {nama: "laporan_harian", deskripsi: "Ringkasan laporan harian karhutla nasional untuk satu tanggal: jumlah titik panas, indikasi luas (hektare), dan rincian per provinsi, ditambah akumulasi tahun berjalan. Rentang tanggal sekitar dua minggu terakhir. Sumber NASA FIRMS, KLHK SiPongi, BNPB; olahan Centurisk97, jadwal tiap 3 jam.",
    skema: {properties: {tanggal: P_TGL("Tanggal WIB YYYY-MM-DD; kosong = hari lengkap terakhir.")}}, jalan: laporanHarian},
  {nama: "kualitas_udara", deskripsi: "Prakiraan kualitas udara PM2,5 (µg/m³) untuk beberapa hari ke depan per provinsi, beserta jumlah penduduk terpapar kategori tidak sehat. Prakiraan model CAMS (Copernicus) via Open-Meteo, belum divalidasi stasiun; diperbarui dua kali sehari.",
    skema: {properties: {prov: P_PROV}}, jalan: kualitasUdara},
  {nama: "peringatan_aktif", deskripsi: "Peringatan dini cuaca (nowcast) yang sedang aktif dan peringatan gelombang tinggi dari BMKG. Diperbarui berkala beberapa kali sehari; periksa kolom dibuat untuk umur data.", skema: {properties: {}}, jalan: peringatanAktif},
  {nama: "daftar_wilayah", deskripsi: "Kode provinsi BPS (38 provinsi). Dengan argumen prov: daftar nama kabupaten/kota provinsi itu, untuk dipakai sebagai argumen kab tool lain.", skema: {properties: {prov: P_PROV}}, jalan: daftarWilayah},
  {nama: "riwayat_lokasi", deskripsi: "Riwayat titik panas VIIRS S-NPP sejak 2012 di sekitar satu koordinat (sel 0,05 derajat): titik per tahun dan per bulan, lama episode, kekambuhan, jangkauan, awal dan akhir musim. data null bila lokasi tidak punya riwayat (kebakaran di sana tidak biasa). Pola masa lalu, bukan prakiraan fisika.",
    skema: {required: ["lat", "lon"], properties: {lat: P_KOOR("Lintang, -11,5 sampai 6,5 (negatif = selatan).", -11.5, 6.5), lon: P_KOOR("Bujur, 94,5 sampai 141,5.", 94.5, 141.5)}}, jalan: riwayatLokasi},
  {nama: "cari_peraturan_bnpb", deskripsi: "Cari pasal di peraturan BNPB (Peraturan Badan, Perka, juklak/juknis, keputusan kepala) dari jdih.bnpb.go.id, pencarian teks penuh per pasal. Jawab pengguna dengan MENGUTIP label pasal dan id dokumen (mis. 'Pasal 5 perban-1-2026'); jangan mengarang pasal. UU/PP/Perpres di luar BNPB tidak ada di sini: rujuk ke pasal.id. Hasil dengan resmi=0 adalah salinan tidak resmi (lihat sumber): sarankan pengguna memeriksa sumber resmi (jdih.bnpb.go.id).",
    skema: {required: ["q"], properties: {q: {type: "string", maxLength: 200, description: "Kata kunci, mis. 'dana bersama penyaluran'."}, jenis: {type: "string", maxLength: 30, description: "Singkatan atau jenis dokumen, mis. PERBAN, PERKA."}, tahun: {type: "integer", minimum: 1900, maximum: 2100, description: "Tahun penetapan."}, status: {type: "string", maxLength: 30, description: "mis. BERLAKU, DICABUT."}, limit: P_LIMIT(20, 8)}}, jalan: cariPeraturan},
  {nama: "baca_peraturan_bnpb", deskripsi: "Baca teks peraturan BNPB berdasarkan id dokumen, seluruhnya (dipotong, disertai daftar isi) atau satu pasal lewat argumen pasal. Saat menjawab, kutip label pasal dan id dokumen. UU/PP di luar BNPB: rujuk ke pasal.id. Dokumen resmi=0 adalah salinan tidak resmi (lihat sumber): sarankan cek sumber resmi.",
    skema: {required: ["id"], properties: {id: P_IDDOK, pasal: {type: "string", maxLength: 60, description: "Label segmen persis atau nomornya, mis. 'Pasal 5' atau '5'."}}}, jalan: bacaPeraturan},
  {nama: "relasi_peraturan_bnpb", deskripsi: "Relasi satu peraturan BNPB: dasar hukum (mengingat), yang dicabut/diganti/diubah, dan peraturan lain yang merujuknya (masuk). Berguna memeriksa apakah suatu peraturan masih berlaku. Sebut id dokumen saat mengutip.",
    skema: {required: ["id"], properties: {id: P_IDDOK}}, jalan: relasiPeraturan},
  {nama: "rumah_rusak", cakupan: "rumah_rusak", deskripsi: "Laporan rumah rusak per rumah (berat/sedang/ringan), hanya yang berstatus sah, terbaru dulu. Diinput tim lapangan; tanpa pelapor, foto, dan catatan bebas; koordinat dibulatkan 4 desimal (sekitar 11 m). Butuh kunci API bercakupan rumah_rusak.",
    skema: {properties: {bencana: {type: "string", pattern: "^[a-z0-9_]{2,30}$", description: "Id bencana, mis. banjir, karhutla."}, prov: P_PROV, kab: {type: "string", maxLength: 80, description: "Nama kabupaten/kota persis."}, dari: P_TGL("Tanggal kejadian awal YYYY-MM-DD."), sampai: P_TGL("Tanggal kejadian akhir YYYY-MM-DD."), limit: P_LIMIT(100, 50)}}, jalan: rumahRusak},
  {nama: "rumah_rusak_rekap", cakupan: "rumah_rusak", deskripsi: "Rekap jumlah rumah rusak berat/sedang/ringan per kabupaten/kota untuk rentang tanggal (bawaan hari ini WIB, maksimal 366 hari), hanya status sah. Butuh kunci API bercakupan rumah_rusak.",
    skema: {properties: {bencana: {type: "string", pattern: "^[a-z0-9_]{2,30}$", description: "Id bencana."}, prov: P_PROV, dari: P_TGL("Awal rentang YYYY-MM-DD."), sampai: P_TGL("Akhir rentang YYYY-MM-DD.")}}, jalan: rumahRusakRekap},
  {nama: "bangunan_terpapar", cakupan: "bangunan", deskripsi: "Jumlah bangunan (Google Open Buildings) yang terpapar bahaya aktif (karhutla, banjir, gempa, gunung api), ringkasan nasional. Larik dipotong sebanyak limit. Butuh kunci API bercakupan bangunan.",
    skema: {properties: {limit: P_LIMIT(100, 20)}}, jalan: bangunanTerpapar},
  {nama: "konsesi_perusahaan", cakupan: "konsesi", deskripsi: "Perusahaan pemegang konsesi (sawit, HTI, HPH, tambang) di satu provinsi beserta titik panas di dalam konsesinya: nama PT, grup, negara induk, kabupaten, jumlah titik dan kompleks aktif. Terurut dari titik terbanyak. Butuh kunci API bercakupan konsesi.",
    skema: {required: ["prov"], properties: {prov: P_PROV, nama: {type: "string", minLength: 2, maxLength: 80, description: "Potongan nama PT (tak peka huruf besar), mis. Sangkowong."}, limit: P_LIMIT(50, 20)}}, jalan: konsesiPerusahaan},
  {nama: "laporan_bnpb", cakupan: "laporan_bnpb", deskripsi: "Laporan Harian atau Paparan Presiden BNPB yang diketik tim. Tanpa tanggal: daftar tanggal tersimpan; dengan tanggal: isi laporan. Butuh kunci API bercakupan laporan_bnpb.",
    skema: {required: ["jenis"], properties: {jenis: {type: "string", enum: ["harian", "presiden"], description: "Jenis laporan."}, tanggal: P_TGL("Tanggal laporan YYYY-MM-DD; kosong = daftar tanggal.")}}, jalan: laporanBnpb},
];
const skemaLengkap = s => ({type: "object", properties: s.properties, ...(s.required ? {required: s.required} : {}), additionalProperties: false});
const terlihat = (kunci, t) => !t.cakupan || !!kunci?.cakupan.includes(t.cakupan);
export const NAMA_TOOLS = TOOLS.map(t => t.nama);

/* ---------------- JSON-RPC ---------------- */
const galatRpc = (id, kode, pesan) => ({jsonrpc: "2.0", id: id ?? null, error: {code: kode, message: pesan}});
const hasil = (id, result) => ({jsonrpc: "2.0", id, result});
const teks = (t, isError = false) => ({content: [{type: "text", text: t}], ...(isError ? {isError: true} : {})});

async function panggil(env, url, kunci, params, kini) {
  const t = TOOLS.find(x => x.nama === params?.name);
  if (!t) return galatRpc(null, -32602, `tool '${params?.name}' tidak dikenal`);
  if (t.cakupan && !terlihat(kunci, t)) return teks(kunci ? `Kunci API ini tidak mencakup '${t.cakupan}'. Minta admin menerbitkan kunci dengan cakupan itu.` : `Tool '${t.nama}' butuh kunci API (header X-API-Key) bercakupan '${t.cakupan}'. Minta admin menerbitkan kunci.`, true);
  const c = cekArgumen(t.skema, params.arguments); if (c.galat) return teks(c.galat, true);
  try {
    const t0 = JSON.stringify(await t.jalan(env, url, c.a, kini));
    return t0.length > BATAS_TEKS ? teks(`Hasil ${t0.length} karakter, melebihi batas ${BATAS_TEKS}. Kecilkan limit atau persempit filter (prov, kab, tanggal).`, true) : teks(t0);
  } catch (e) {
    if (e instanceof GalatTool) return teks(e.message, true);
    console.error("mcp tool", t.nama, e); return teks("galat server saat menjalankan tool", true);
  }
}
async function proses(env, url, kunci, m, kini) {
  const id = m.id;
  switch (m.method) {
    case "initialize": {
      const minta = m.params?.protocolVersion;
      return hasil(id, {protocolVersion: PROTOKOL.includes(minta) ? minta : PROTOKOL[0], capabilities: {tools: {}}, serverInfo: {name: "centurisk97", version: VERSI_SERVER},
        instructions: "Data bencana Indonesia (karhutla, cuaca, kualitas udara). Tool publik tanpa kunci; tool rumah_rusak, bangunan, laporan BNPB, konsesi butuh header X-API-Key dari admin. Dokumentasi: /api."});
    }
    case "ping": return hasil(id, {});
    case "tools/list": return hasil(id, {tools: TOOLS.filter(t => terlihat(kunci, t)).map(t => ({name: t.nama, description: t.deskripsi, inputSchema: skemaLengkap(t.skema)}))});
    case "tools/call": {
      const r = await panggil(env, url, kunci, m.params, kini);
      return r.error ? {...r, id} : hasil(id, r);
    }
    default: return galatRpc(id, -32601, `metode '${m.method}' tidak dikenal`);
  }
}

const privat = h => /^(localhost|.*\.localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1?\]|\[f[cd][0-9a-f:]*\])$/i.test(h);
const rpcHttp = (status, pesan, h = {}) => balas(galatRpc(null, kodeHttp(status), pesan), status, h);
const balas = (badan, status = 200, h = {}) => new Response(badan == null ? null : JSON.stringify(badan), {status, headers: {...CORS, ...(badan == null ? {} : {"content-type": "application/json; charset=utf-8"}), "cache-control": "private, no-store", "x-content-type-options": "nosniff", ...h}});
const tolakHttp = async r => { const j = await r.json().catch(() => null), ra = r.headers.get("retry-after"); return rpcHttp(r.status, j?.galat || "ditolak", ra ? {"retry-after": ra} : {}); };   // galat HTTP dibungkus envelope JSON-RPC, status HTTP tetap

export async function layaniMcp(req, env, ctx, url) {
  if (req.method === "OPTIONS") return new Response(null, {status: 204, headers: CORS});
  if (req.method !== "POST") return balas(galatRpc(null, -32600, "hanya POST (server stateless, tanpa aliran SSE)"), 405, {allow: "POST, OPTIONS"});
  const o = req.headers.get("origin");
  if (o && (!URL.canParse(o) || privat(new URL(o).hostname))) return rpcHttp(403, "Origin ditolak");
  const kini = Date.now();
  try {
    const b = await bacaBytes(req, MAKS_BODY); if (b.galat) return rpcHttp(b.status || 400, b.galat);
    let m; try { m = JSON.parse(new TextDecoder().decode(b.b)); } catch (e) { return balas(galatRpc(null, -32700, "JSON rusak")); }
    if (Array.isArray(m)) return balas(galatRpc(null, -32600, "batch tidak didukung; kirim satu pesan per POST"));
    if (!m || typeof m !== "object" || m.jsonrpc !== "2.0") return balas(galatRpc(null, -32600, "bukan pesan JSON-RPC 2.0"));
    if (m.method === undefined && ("result" in m || "error" in m)) return balas(null, 202);   // jawaban dari klien: diabaikan
    if (typeof m.method !== "string") return balas(galatRpc(m.id, -32600, "method wajib berupa teks"));
    if (m.id === undefined) return balas(null, 202);   // notifikasi (notifications/initialized dst.)
    if (typeof m.id !== "string" && typeof m.id !== "number") return balas(galatRpc(null, -32600, "id harus teks atau angka"));
    if (!env.IP_SALT) { console.error("mcp: IP_SALT belum diset"); return rpcHttp(503, "layanan belum tersedia"); }
    let kunci = null;
    if (req.headers.has("x-api-key")) { const k = await kunciSah(env, req, ctx, kini); if (k instanceof Response) return await tolakHttp(k); kunci = k; }   // batas per kunci ada di kunciSah
    else { const g = await laju(env, await ipHash(env, req), "mcp.ip", BATAS_IP, kini); if (g) return await tolakHttp(g); }
    return balas(await proses(env, url, kunci, m, kini));
  } catch (e) { console.error("mcp", e); return balas(galatRpc(null, -32603, "galat server"), 500); }
}
