#!/usr/bin/env node
// Server lokal Lapor Bencana BNPB (data/kajian-bnpb/lapor-ai, AGENTS 3.8). Mesin = src/lapor_mesin.js, sama dengan yang nanti dipakai Worker.
//   Bawaan: server tinjau http://localhost:8800 memanggil tanganiLapor untuk /api/lapor/*, jadi data lapor TIDAK pernah diteruskan ke produksi.
//   Mandiri: node scripts/lapor/lokal.mjs -> http://localhost:8810/lapor/
// Halaman: /lapor/ (chat pelapor), /lapor/lacak.html?t=<token> (lacak laporan tanpa login), /lapor/meja.html (monitoring petugas).
// Model = Claude API bila ANTHROPIC_API_KEY ada di env atau scripts/wa/.env (tidak pernah dicetak); tanpa kunci = pertanyaan templat.
// Data uji di ~/.lapor-lokal (di luar repo: nomor WA, nama, dan foto pelapor tidak boleh masuk repo publik). Hanya 127.0.0.1.
// Data lanjutan BPBD (/api/lapor/data/*, /lapor/data/): dilayani Worker ASLI di Miniflare (lokal_data.mjs), D1+R2 di ~/.lapor-lokal/miniflare.
//   node scripts/lapor/lokal.mjs berkas-uji  -> buat tiket induk bpbd + berkas (nomor WA rekaan), cetak tautan ketua http://localhost:8800/lapor/data/?t=...
//   Tautan sekali pakai (ditukar kuki); jalankan lagi untuk tautan baru. Meja staf: lokal_data menitipkan token admin lokal bila tanpa kuki tim.
// ponytail: monitoring lokal tanpa login (hanya loopback). Di Worker rute /api/lapor/meja* wajib sesi staf (KEPUTUSAN Q12, DESAIN-TEKNIS).
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import {execFile} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
import {putaran, sesiSekaliKetuk, mulaiDiJenisDarurat, lengkap, nilaiTampil, waktuLapor, T, KELOMPOK} from "../../src/lapor_mesin.js";
import {berlakuSesi, JENIS} from "../../src/lapor_spek.js";
import {buatModel} from "../../src/lapor_model.js";
import {buatWilayah} from "../../src/lapor_wilayah.js";
import {buatInfo} from "../../src/lapor_info.js";
import {kontakBpbd, kalimatBpbd} from "../../src/lapor_kontak.js";
import {hitungGugus, kandidatKejadian, kodeKejadian, tglKejadian} from "../../src/lapor_gugus.js";
import {jenisBerkas, durasiMP4, waktuMP4, lokasiMP4} from "../../src/media_berkas.js";
import {HALAMAN_TUNGGU_DOK, tempatRusak} from "../../src/lapor_tampil.js";
import {jalanOsm} from "../../src/lapor_jalan.js";
import {JENIS_PW, MAKS_KEC, endpointSah, titikTerdekat, NAMA_HARI, label as labelPw} from "../../src/pw_inti.js";

import {BAHASA, bahasaSah, keIndonesia, dariIndonesia, terjemahUi} from "../../src/lapor_bahasa.js";
const kamusTr = b => { try { return JSON.parse(fs.readFileSync(path.join(AKAR, `public/lapor/tr/${b}.json`), "utf8")); } catch { return null; } };   // kamus statis, sama dengan Worker
import {samarkan} from "../../src/samarkan.js";
import {cakupanMeja, dalamWilayah, bolehAksi, pindahUntuk} from "../../src/lapor_meja_hak.js";
import {agregat, keCsv, KOLOM as KOLOM_AGREGAT, BATAS_SEL} from "../../src/lapor_agregat.js";
import {penandaPemeriksa, kejadianTerverifikasi, kartuPublik, terakhir, syaratPublik, usulanDari, usulanTerakhir, statusUsulan} from "../../src/lapor_kejadian.js";
import {HASIL_PERIKSA, revisiTampil, tindakanUntuk, sahkanTindakan, sahkanPeriksa, terapkanRevisi, statusDariHasil} from "../../src/lapor_periksa.js";
const KATA_UMUM = new Set(["rusak", "roboh", "putus", "ambruk", "terendam", "longsor", "banjir", "yang", "di", "dan", "atau", "dekat", "sekitar", "kena", "terdampak"]);

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIK = path.join(AKAR, "public");
const registri = () => JSON.parse(fs.readFileSync(path.join(PUBLIK, "bencana.json"), "utf8")); // katalog tindakan (AGENTS 2.28), dibaca ulang supaya suntingan langsung terpakai
const PORT = Number(process.env.LAPOR_PORT || 8810);
const DIR = path.join(os.homedir(), ".lapor-lokal"), BERKAS = path.join(DIR, "data.json"), FOTO = path.join(DIR, "foto"), DOK = path.join(DIR, "dok");

function kunciApi() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const m = fs.readFileSync(path.join(AKAR, "scripts/wa/.env"), "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch { return null; }
}
function dasarApi() {   // ANTHROPIC_BASE_URL: router API (9router); dari env atau scripts/wa/.env seperti kunciApi()
  if (process.env.ANTHROPIC_BASE_URL) return process.env.ANTHROPIC_BASE_URL;
  try {
    const m = fs.readFileSync(path.join(AKAR, "scripts/wa/.env"), "utf8").match(/^ANTHROPIC_BASE_URL=(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch { return ""; }
}
const model = process.argv.includes("--tanpa-ai") ? null
  : buatModel({kunci: kunciApi(), dasar: dasarApi(), model: process.env.LAPOR_MODEL || undefined, catat: u => console.log(`model ${u.model} masuk ${u.masuk} keluar ${u.keluar} cache ${u.cache ?? 0} ${u.henti}`)});
const wilayah = buatWilayah(async p => JSON.parse(await fs.promises.readFile(path.join(PUBLIK, p), "utf8")));
const info = buatInfo({muat: async p => JSON.parse(await fs.promises.readFile(path.join(PUBLIK, p), "utf8")), wilayah});

const baca = () => { try { return JSON.parse(fs.readFileSync(BERKAS, "utf8")); } catch { return {pelapor: {}, sesi: {}, aktif: {}, urut: {}, kotak: {}}; } };
const simpan = d => { fs.mkdirSync(DIR, {recursive: true, mode: 0o700}); fs.writeFileSync(BERKAS, JSON.stringify(d), {mode: 0o600}); };
const nomorWa = s => { const d = String(s || "").replace(/\D/g, ""); const n = d.startsWith("0") ? "62" + d.slice(1) : d; return /^628\d{7,12}$/.test(n) ? n : null; };
const tglWib = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const waSamar = wa => `0${wa.slice(2, 5)}****${wa.slice(-4)}`;
const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
const PERAN = {warga: "Warga", bpbd_klaim: "Petugas BPBD (belum dikonfirmasi)", bpbd: "Petugas BPBD"};
/* status tiket (pemilik 19 Nov 2026: "bisa tau laporan lu sudah dilihat atau sudah ditanggapi, persis kaya tiket") */
export const STATUS = {baru: "Laporan diterima", dilihat: "Sudah dilihat petugas", ditelaah: "Sedang ditelaah", diteruskan: "Diteruskan ke BPBD setempat",
  ditindaklanjuti: "Ditindaklanjuti", selesai: "Selesai ditangani", tidak_valid: "Tidak dapat ditindaklanjuti"};
export const URUTAN = ["baru", "dilihat", "ditelaah", "diteruskan", "ditindaklanjuti", "selesai"];
const PINDAH = {baru: ["dilihat"], dilihat: ["ditelaah", "tidak_valid"], ditelaah: ["diteruskan", "ditindaklanjuti", "tidak_valid"], diteruskan: ["ditindaklanjuti", "tidak_valid"],
  ditindaklanjuti: ["selesai", "tidak_valid"], selesai: ["ditelaah"], tidak_valid: ["ditelaah"]}; // ALGORITMA A8 + "dilihat" otomatis saat petugas membuka

function isianTampil(sesi) {
  return berlakuSesi(sesi).map(i => {
    const x = sesi.isian[i.nama];
    return {nama: i.nama, label: i.label, kelompok: KELOMPOK.find(k => k.id === i.kelompok).label, wajib: !!i.wajib,
      status: !x ? "kosong" : x.nihil ? "nihil" : x.belum ? (x.tidakTahu ? "tidaktahu" : "belum") : "isi", tampil: x ? nilaiTampil(i, x) : "", asal: x?.asal?.sumber || null};
  });
}
const keluaran = (h, sesi) => ({balasan: h.inti, pilihan: h.pilihan, ket: h.pilihanKet || null, minta: h.minta || null, isiAwal: h.isiAwal || null, form: h.form || null,
  banyak: !!h.banyak, grup: h.grup || null, kunci: h.kunci || null, saran: h.saran || 0, status: sesi.status, lengkap: lengkap(sesi), isian: isianTampil(sesi), foto: (sesi.foto || []).length, bisaKembali: !!sesi.jejak?.length, kembali: !!h.kembali});

/* ---------- dokumen PDF dan Word (KEPUTUSAN K8, D21) ---------- */
function bahanDokumen(s, p) {
  const prov = s.isian.lokasi?.nilai?.wilayah?.provKode;
  const kelompok = KELOMPOK.map(k => ({judul: k.label, baris: berlakuSesi(s).filter(i => i.kelompok === k.id && i.nama !== "kronologi")
    .map(i => [i.label, nilaiTampil(i, s.isian[i.nama])])})).filter(g => g.baris.length);
  kelompok.push({judul: "Foto dan video", baris: (s.foto || []).length ? s.foto.map((f, n) => [`${f.jenis === "video" ? "Video" : "Foto"} ${n + 1}`, `${f.lencanaTeks}${f.lat != null ? `, ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}` : ""}${f.waktuAmbil ? `, diambil ${waktuLapor(f.waktuAmbil, prov)}` : ""}`]) : [["Foto", "Tidak ada"]]});
  // narasi gaya laporan pemantauan Koordalops (public/laporan_koordalops.js): judul, waktu, kronologis, dampak bernomor, kebutuhan
  const v = n => s.isian[n], ada = n => v(n) && !v(n).belum && !v(n).nihil, angka = n => ada(n) ? v(n).nilai : 0;
  const w = s.isian.lokasi?.nilai?.wilayah, jenis = JENIS.find(j => j.id === v("jenis")?.nilai)?.label || "Kejadian";
  const tempat = w ? `Desa/Kel. ${w.desa}${s.isian.lokasi.nilai.rt ? ` RT ${s.isian.lokasi.nilai.rt} RW ${s.isian.lokasi.nilai.rw}` : ""}, Kec. ${w.kec}, ${w.kab}, Prov. ${w.prov}` : "lokasi belum terbaca";
  const korban = [["meninggal", "meninggal dunia"], ["hilang", "hilang"], ["luka", "luka-luka"]].filter(([n]) => angka(n)).map(([n, t]) => `${angka(n).toLocaleString("id-ID")} orang ${t}`);
  const rumah = [["rumah_berat", "rusak berat"], ["rumah_sedang", "rusak sedang"], ["rumah_ringan", "rusak ringan"], ["rumah_terendam", "terendam"]].filter(([n]) => angka(n)).map(([n, t]) => `${angka(n).toLocaleString("id-ID")} unit ${t}`);
  const fas = [["fasilitas_sekolah", "sekolah", "nama_sekolah"], ["fasilitas_kesehatan", "fasilitas kesehatan", "nama_faskes"], ["fasilitas_ibadah", "tempat ibadah", "nama_ibadah"], ["jalan_jembatan", "titik jalan atau jembatan", "nama_jalan"]]
    .filter(([n]) => angka(n)).map(([n, t, nm]) => `${angka(n).toLocaleString("id-ID")} ${t}${ada(nm) ? ` (${v(nm).nilai})` : ""}`);
  const khusus = berlakuSesi(s).filter(i => i.kelompok === "khusus" && ada(i.nama)).map(i => `${i.label}: ${nilaiTampil(i, v(i.nama))}`);
  const narasi = {judul: `Bencana Alam ${jenis}${ada("subjenis") && v("subjenis").nilai !== "Belum diketahui" ? ` (${v("subjenis").nilai.toLowerCase()})` : ""} di ${w ? `${w.kab}, Prov. ${w.prov}` : "lokasi belum terbaca"}`,
    butir: [["Lokasi", tempat], ["Waktu kejadian", v("waktu")?.nilai || "belum didata"], ["Kronologis", v("kronologi")?.nilai || "belum didata"],
      ["Dampak", [`Korban jiwa: ${korban.length ? korban.join(", ") : v("meninggal")?.nihil ? "nihil" : "belum didata"}${angka("luka_inap") ? `, ${angka("luka_inap")} orang dirawat inap` : ""}.`,
        `Pengungsi: ${angka("mengungsi_jiwa") ? `${angka("mengungsi_jiwa").toLocaleString("id-ID")} jiwa${angka("mengungsi_kk") ? ` (${angka("mengungsi_kk").toLocaleString("id-ID")} KK)` : ""}${ada("titik_pengungsian") ? ` di ${v("titik_pengungsian").nilai}` : ""}` : v("mengungsi_jiwa")?.nihil ? "nihil" : "belum didata"}.`,
        `Kerusakan rumah: ${rumah.length ? rumah.join(", ") : "belum didata atau nihil"}.`, `Fasilitas umum: ${fas.length ? fas.join("; ") : "belum didata atau nihil"}.`, ...khusus.map(k => `${k}.`)]],
      ["Kebutuhan mendesak", ada("kebutuhan") ? v("kebutuhan").nilai : "belum didata"],
      ["Sumber", `Laporan ${s.tingkat === "bpbd" ? "petugas BPBD" : "warga"} melalui Lapor Bencana BNPB, ${waktuLapor(s.terkirim, prov)}${s.tingkat === "bpbd" ? "" : ", belum terverifikasi"}.`]]};
  const foto = (s.foto || []).filter(f => fs.existsSync(path.join(FOTO, `${f.id}.jpg`))) // video: sampul bingkai pertama
    .map(f => ({berkas: path.join(FOTO, `${f.id}.jpg`), ket: `${f.jenis === "video" ? `Video ${f.durasi ?? "?"} detik, ` : ""}${f.lencanaTeks}${f.waktuAmbil ? `, ${waktuLapor(f.waktuAmbil, prov)}` : ""}`}));
  return {narasi, foto, nomor: s.nomor, tingkat_label: s.tingkat === "bpbd" ? "" : "Laporan warga, belum terverifikasi",
    pelapor: {nama: p.nama || "Belum dikenal", peran: PERAN[p.peran] || "Warga", instansi: p.kab ? `BPBD ${p.kab}${p.jabatan ? `, ${p.jabatan}` : ""}` : null, wa_samar: waSamar(s.wa)},
    waktu_kejadian: s.isian.waktu?.nilai || "belum didata", waktu_lapor: waktuLapor(s.terkirim, prov),
    kelompok, kronologi: s.isian.kronologi?.nilai || ""};
}
export function buatDokumen(s, p, ulang = false) {
  fs.mkdirSync(DOK, {recursive: true, mode: 0o700});
  const json = path.join(DOK, `${s.nomor}.json`);
  fs.writeFileSync(json, JSON.stringify(bahanDokumen(s, p)), {mode: 0o600});
  execFile("python3", [path.join(AKAR, "scripts/lapor/dokumen.py"), json, path.join(DOK, s.nomor)], {timeout: 180000}, (e, out, err) => {
    if (!e) return console.log("dokumen jadi", s.nomor);
    console.error("dokumen gagal, dicoba sekali lagi", s.nomor, String(err).slice(-300)); // LibreOffice kadang bentrok dengan proses lain
    if (!ulang) setTimeout(() => buatDokumen(s, p, true), 5000);
  });
}

/* ---------- satu pesan dari pelapor ---------- */
/* ---------- laporan susulan (F-28, ALUR 11, ALGORITMA A12; Q26: 72 jam, paling banyak 10 versi) ---------- */
const KUNCI_SUSULAN = ["jenis", "subjenis", "lokasi", "waktu", "rtrw"], JENDELA_SUSULAN = 72 * 3600e3;
const bolehSusulan = s => !!s?.nomor && Date.now() - s.terkirim <= JENDELA_SUSULAN && !["selesai", "tidak_valid"].includes(s.tiket?.status) && (s.versi || []).length < 10;
async function susulan(body) {
  const wa = nomorWa(body.wa), d = baca(), kini = Date.now();
  const asal = Object.values(d.sesi).find(x => x.nomor === body.nomor && x.wa === wa);
  if (!asal) return [404, {galat: "Laporan tidak ditemukan."}];
  if (!bolehSusulan(asal)) return [409, {galat: "Kabar tambahan hanya bisa dikirim 72 jam sejak laporan terkirim, sebelum laporan selesai ditangani."}];
  const hidup = d.sesi[d.aktif[wa]];
  if (hidup && !["terkirim", "batal", "susulan"].includes(hidup.status) && !hidup.susulanDari) return [409, {galat: "Selesaikan atau batalkan dulu laporan yang sedang diisi."}];
  const {nomor, token, tiket, versi, jejak, akhir, susulanBaru, balasan, nilai, ...dasar} = structuredClone(asal);
  const s = {...dasar, id: `${kini.toString(36)}${crypto.randomBytes(3).toString("hex")}`, status: "ringkasan", susulanDari: asal.nomor, transkrip: [], foto: [], fotoSelesai: true, ditanya: [], dibuat: kini};
  const lengkapiDarurat = mulaiDiJenisDarurat(s);   // laporan sekali ketuk (K90): mulai di jenis, korban, foto
  if (lengkapiDarurat) s.status = "darurat_jenis";
  const h = await putaran({sesi: s, pelapor: d.pelapor[wa], model, wilayah, kini, pesan: {wa, teks: lengkapiDarurat ? "" : "2", saluran: body.saluran || "web"}}); // masuk mode Ubah
  h.sesi.transkrip = h.sesi.transkrip.filter(t => t.dari === "bot");
  h.inti = lengkapiDarurat ? `*Lengkapi laporan darurat ${asal.nomor}*\nLokasi Anda sudah diterima petugas. Jawab beberapa pertanyaan ini bila sempat.\n\n${h.inti}` : `*Tambah kabar untuk ${asal.nomor}*\nTulis apa yang berubah dengan kalimat biasa, misalnya *air naik lagi sepinggang*, *meninggal jadi 2*, atau *pengungsi 30 orang*.\nJenis bencana, lokasi, dan waktu kejadian tidak berubah. Kabar ini masuk ke tiket yang sama sebagai versi baru.`;
  h.sesi.transkrip.at(-1).teks = h.inti; h.sesi.akhir = {...(h.sesi.akhir || {}), inti: h.inti, balasan: h.inti};
  d.sesi[h.sesi.id] = h.sesi; d.aktif[wa] = h.sesi.id; simpan(d);
  return [200, {...keluaran(h, h.sesi), susulanDari: asal.nomor}];
}
/* darurat sekali ketuk (K90, D122-D125): sama dengan Worker, batas per nomor 30 menit di memori proses */
const sekaliTerakhir = {};
async function daruratCepat(body) {
  const wa = nomorWa(body.wa); if (!wa) return [400, {galat: "Nomor WhatsApp tidak sah."}];
  const kini = Date.now();
  if (kini - (sekaliTerakhir[wa] || 0) < 30 * 6e4) return [429, {galat: "Laporan darurat dari perangkat ini baru saja terkirim. Petugas sudah menerimanya; telepon 112 bila ada nyawa terancam."}];
  const L = body.lokasi, ok = L && Number.isFinite(L.lat) && Number.isFinite(L.lon) && L.lat >= -12 && L.lat <= 7 && L.lon >= 94 && L.lon <= 142;
  const lokasi = ok ? {lat: L.lat, lon: L.lon, ...(Number.isFinite(L.akurasi) && L.akurasi >= 0 ? {akurasi: L.akurasi} : {})} : null;
  let wil = null; if (lokasi) { try { const w = await wilayah(lokasi.lat, lokasi.lon); if (w) { const {sekitar, ...x} = w; wil = x; } } catch {} }
  const d = baca(), pel = d.pelapor[wa] || null, hidup = d.sesi[d.aktif[wa]];
  const sesi = sesiSekaliKetuk({pelapor: pel, lokasi, wil, kini, waktu: Number.isFinite(body.waktu_klien) ? body.waktu_klien : null});
  sesi.id = hidup && !["terkirim", "batal"].includes(hidup.status) && !hidup.susulanDari ? hidup.id : `${kini.toString(36)}${crypto.randomBytes(3).toString("hex")}`;   // draf biasa diganti (K68)
  sesi.wa = wa;
  const h = {sesi, pelapor: pel, kirim: true, inti: ""};
  const tambahan = terbitBaru(d, h, kini);
  d.sesi[sesi.id] = sesi; d.aktif[wa] = sesi.id; simpan(d);
  sekaliTerakhir[wa] = kini;
  return [200, {...tambahan, balasan: h.inti, wilayah: wil ? {desa: wil.desa, kec: wil.kec, kab: wil.kab} : null}];
}
/* kejadian yang sama (K66, D103-D107): kandidat dari laporan terkirim sekecamatan; anggota kejadian = sesi yang membawa kejadian.kode */
const anggotaKejadian = (d, kode) => Object.values(d.sesi).filter(s => s.nomor && s.kejadian?.kode === kode);
function kandidatLokal(d, kecKode, kini) {
  return kandidatKejadian(Object.values(d.sesi).filter(s => s.nomor).map(s => ({nomor: s.nomor, jenis: s.isian.jenis?.nilai, subjenis: s.isian.subjenis?.nilai || null, wilayah: s.isian.lokasi?.nilai?.wilayah,
    ref: Math.max(s.isian.waktu?.ms || 0, s.terkirim || 0), status: s.tiket?.status, kejadian: s.kejadian?.kode || null,
    n: s.kejadian?.kode ? new Set(anggotaKejadian(d, s.kejadian.kode).map(x => x.wa)).size : 1, waktu: s.isian.waktu?.ms ? {nilai: s.isian.waktu.nilai, ms: s.isian.waktu.ms} : null})), {kecKode, kini});
}
function pasangKejadian(d, sesi, kini) { // sesudah laporan terkirim: kode KJ dari induk (K66, D106); induk ikut ditandai
  const induk = Object.values(d.sesi).find(x => x.nomor && x.nomor === sesi.kejadian?.induk);
  if (!induk) { delete sesi.kejadian; return; }
  if (!induk.kejadian?.kode) { const t = tglKejadian(induk.terkirim), n = ((d.urutKj ||= {})[t] || 0) + 1; d.urutKj[t] = n; induk.kejadian = {kode: kodeKejadian(induk.terkirim, n)}; }
  sesi.kejadian = {kode: induk.kejadian.kode, induk: induk.nomor};
}
/* laporan baru terkirim: nomor tiket, token lacak, PDF dan Word (ALGORITMA A6, A8); dipakai /pesan dan darurat sekali ketuk */
function terbitBaru(d, h, kini) {
  const tgl = tglWib(kini), n = (d.urut[tgl] || 0) + 1;
  d.urut[tgl] = n;
  h.sesi.nomor = `LA-${tgl.slice(8, 10)}${tgl.slice(5, 7)}${tgl.slice(2, 4)}-${String(n).padStart(2, "0")}`;
  h.sesi.token = crypto.randomBytes(16).toString("hex");
  h.sesi.tiket = {status: "baru", riwayat: [{ke: "baru", pelaku: "Sistem", catatan: null, waktu: kini}]};
  h.sesi.versi = [{versi: 1, isi: structuredClone(h.sesi.isian), waktu: kini}];
  if (h.sesi.kejadian) pasangKejadian(d, h.sesi, kini);
  let K = null; try { K = JSON.parse(fs.readFileSync(path.join(PUBLIK, "data/bpbd_kontak.json"), "utf8")); } catch {}
  const kb = kontakBpbd(K, h.sesi.isian.lokasi?.nilai?.wilayah);   // K88: arahkan pelapor ke BPBD setempat (sama dengan Worker)
  h.inti = T.terkirim(h.pelapor?.nama, h.sesi.nomor, kalimatBpbd(kb));
  const q = `?t=${h.sesi.token}`;
  const tambahan = {nomor: h.sesi.nomor, bpbd: {nama: kb.nama, nomor: kb.nomor, tingkat: kb.tingkat}, lacak: `/lapor/lacak.html${q}`, foto: h.sesi.foto?.[0] ? `/api/lapor/foto/${h.sesi.foto[0].id}${q}` : null, unduhan: [ // foto pertama untuk kartu Laporan saya
    {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
    {label: "Unduh PDF", url: `/api/lapor/unduh/${h.sesi.nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${h.sesi.nomor}.docx${q}`}]};
  buatDokumen(h.sesi, h.pelapor || {});   // sekali ketuk tanpa profil: dokumen tanpa nama, sama dengan Worker (lengkapi)
  return tambahan;
}
const KUOTA_JAM = 120, KUOTA_MENIT = 20, kuota = {};   // K104 (25 Nov 2026): 120 per jam, sama dengan Worker; // ponytail: hitungan di memori proses; Worker memakai tabel laju D1
async function pesan(body) {
  const wa = nomorWa(body.wa);
  if (!wa) return [400, {galat: "Nomor WhatsApp tidak sah."}];
  const d = baca(), kini = Date.now();
  // kuota pesan per nomor (pemilik 19 Nov 2026: "kuota chat pelaporan dalam 1 jam biar ga di-abuse"; K104: 120 per jam): 120 per jam, 20 per menit; laporan yang sedang diisi tetap tersimpan
  const jejakKuota = (kuota[wa] ||= []).filter(t => kini - t < 3600e3); kuota[wa] = jejakKuota;
  const lewatMenit = jejakKuota.filter(t => kini - t < 60e3).length >= KUOTA_MENIT, lewatJam = jejakKuota.length >= KUOTA_JAM;
  if (lewatJam || lewatMenit) {
    const buka = lewatJam ? jejakKuota[0] + 3600e3 : jejakKuota.filter(t => kini - t < 60e3)[0] + 60e3;
    const jam = new Date(buka).toLocaleTimeString("id-ID", {hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(":", ".");
    const teks = `*Kuota pesan habis*\nNomor ini sudah mengirim ${lewatJam ? `${KUOTA_JAM} pesan dalam satu jam` : `${KUOTA_MENIT} pesan dalam satu menit`}. Laporan Anda tersimpan; lanjutkan lagi pukul ${jam} WIB.\nBila ada nyawa terancam, telepon 112.`;
    return [429, {galat: teks.replace(/\*/g, ""), balasan: teks, teksWa: teks, sisaDetik: Math.ceil((buka - kini) / 1000)}];
  }
  jejakKuota.push(kini);
  const idAktif = d.aktif[wa], sesiAktif = idAktif ? d.sesi[idAktif] : null;
  // bahasa pilihan (K58, D80, D81): pesan diterjemahkan ke Indonesia sebelum mesin, teks asli disimpan di transkrip; tanpa model hanya Indonesia
  const bahasa = model ? bahasaSah(body.bahasa) : "id";
  const terj = await keIndonesia(model, body.teks ? String(body.teks).slice(0, 2000) : "", bahasa);
  const teks = terj.teks;

  if (/^(cek\s+)?status(\s+laporan)?$/i.test(teks.trim())) { // cek status laporan milik nomor ini
    const milik = Object.values(d.sesi).filter(s => s.wa === wa && s.nomor).sort((a, b) => b.terkirim - a.terkirim).slice(0, 5);
    const balasan = milik.length ? `*Status laporan Anda*${milik.map(s => `\n\n*${s.nomor}*\n${JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || "Kejadian"}, dilaporkan ${waktuLapor(s.terkirim, s.isian.lokasi?.nilai?.wilayah?.provKode)}\nStatus: ${STATUS[s.tiket.status]}`).join("")}`
      : "*Belum ada laporan*\nNomor ini belum pernah mengirim laporan.";
    const lanjut = sesiAktif && !["terkirim", "batal"].includes(sesiAktif.status) ? sesiAktif : null;
    return [200, {balasan, unduhan: milik.map(s => ({label: `Lacak ${s.nomor}`, url: `/lapor/lacak.html?t=${s.token}`, lacak: true})),
      ...(lanjut ? {pilihan: lanjut.pilihan, ket: lanjut.pilihanKet, minta: lanjut.minta, form: lanjut.form, banyak: lanjut.banyak, grup: lanjut.grup, kunci: lanjut.kunci, saran: lanjut.saran, isiAwal: lanjut.isiAwal,
        lengkap: lengkap(lanjut), isian: isianTampil(lanjut)} : {})}];
  }

  let lokasi = body.lokasi || null;
  if (lokasi?.kode) { // dipilih dari pencarian desa
    const c = await wilayah.pusat(String(lokasi.kode));
    if (!c) return [400, {galat: "Desa tidak ditemukan."}];
    lokasi = {lat: c.lat, lon: c.lon, sumber: lokasi.poster === true ? "poster" : "cari", wilayah: c.wilayah};   // poster: K92, D131
  }
  const h = await putaran({sesi: sesiAktif, pelapor: d.pelapor[wa] || null, model, wilayah, kandidat: ({kecKode, kini: k}) => kandidatLokal(d, kecKode, k),
    pesan: {wa, teks, lokasi, form: body.form || null, pilih: Array.isArray(body.pilih) ? body.pilih.slice(0, 20) : null, foto: body.foto || null, lain: typeof body.lain === "string" ? body.lain.slice(0, 120) : null, kembali: body.kembali === true, saluran: "web"}, kini}); // rute ini hanya dipakai layar web
  h.sesi.id ||= `${kini.toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  h.sesi.wa = wa; h.sesi.bahasa = bahasa;
  if (terj.diterjemahkan) { const t = [...h.sesi.transkrip].reverse().find(x => x.dari === "pelapor"); if (t) Object.assign(t, {asli: samarkan(terj.asli), bahasa}); } // teks asli disamarkan sama dengan terjemahannya
  let tambahan = {};
  if (h.kirim && h.sesi.susulanDari) { // laporan susulan (F-28, ALGORITMA A12): perubahan digabung ke tiket yang sama sebagai versi baru
    const asal = Object.values(d.sesi).find(x => x.nomor === h.sesi.susulanDari);
    for (const k of KUNCI_SUSULAN) if (asal.isian[k]) h.sesi.isian[k] = asal.isian[k]; else if (!(k === "jenis" && asal.darurat)) delete h.sesi.isian[k]; // jenis, lokasi, waktu terkunci; jenis kosong sekali ketuk boleh diisi (K90)
    const lama = new Map(isianTampil(asal).map(x => [x.nama, x])), perubahan = [];
    for (const x of isianTampil(h.sesi)) { const l = lama.get(x.nama); const a = l && l.status !== "kosong" ? l.tampil : "belum didata", b = x.status !== "kosong" ? x.tampil : "belum didata";
      const kosong = v => /^(belum didata|tidak tahu|belum tahu|belum diketahui)$/i.test(v); // dari kosong ke "tidak tahu" bukan perubahan
      if (a !== b && !(kosong(a) && kosong(b))) perubahan.push({nama: x.nama, label: x.label, dari: a, ke: b}); }
    if (asal.darurat?.cara === "sekali_ketuk" && h.sesi.darurat?.korban && h.sesi.darurat.korban !== asal.darurat.korban) {   // K90: sama dengan Worker
      const K = {ya: "ada", tidak: "tidak ada", belum_tahu: "belum tahu"}; perubahan.push({nama: "korban_darurat", label: "Ada korban", dari: K[asal.darurat.korban], ke: K[h.sesi.darurat.korban]});
      asal.darurat = {...asal.darurat, korban: h.sesi.darurat.korban}; }
    const versi = asal.versi.length + 1, st = asal.tiket.status;
    asal.isian = structuredClone(h.sesi.isian);
    asal.foto = [...(asal.foto || []), ...(h.sesi.foto || [])].slice(0, 20);
    asal.versi.push({versi, isi: structuredClone(asal.isian), waktu: kini, susulan: true, perubahan});
    asal.tiket.riwayat.push({dari: st, ke: st, pelaku: "Pelapor", catatan: `Susulan versi ${versi}: ${perubahan.length ? perubahan.map(x => x.label).join(", ") : "tanpa perubahan angka"}`, waktu: kini});
    asal.susulanBaru = kini; // penanda "ada susulan" di meja sampai staf bertindak
    h.sesi.status = "terkirim"; h.sesi.susulanVersi = versi; // sesi salinan selesai; tanpa nomor sendiri jadi tidak tampil di meja
    h.inti = `*Laporan diperbarui*\n_${asal.nomor} versi ${versi}_\n\n${perubahan.length ? `*Perubahan:*\n${perubahan.map(x => `- ${x.label}: ${x.dari} menjadi ${x.ke}`).join("\n")}` : "Tidak ada angka yang berubah."}\n\nPDF versi baru menyusul.`;
    const q = `?t=${asal.token}`;
    tambahan = {nomor: asal.nomor, susulan: versi, lacak: `/lapor/lacak.html${q}`, foto: asal.foto?.[0] ? `/api/lapor/foto/${asal.foto[0].id}${q}` : null, unduhan: [
      {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
      {label: "Unduh PDF", url: `/api/lapor/unduh/${asal.nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${asal.nomor}.docx${q}`}]};
    for (const x of ["pdf", "docx"]) fs.rmSync(path.join(DOK, `${asal.nomor}.${x}`), {force: true});
    buatDokumen(asal, d.pelapor[asal.wa]);
  } else if (h.kirim) tambahan = terbitBaru(d, h, kini);
  d.sesi[h.sesi.id] = h.sesi; d.aktif[wa] = h.sesi.id;
  if (h.pelapor) d.pelapor[wa] = h.pelapor;
  simpan(d);
  const out = {...keluaran(h, h.sesi), ...tambahan, pelapor: h.pelapor ? {nama: h.pelapor.nama, peran: h.pelapor.peran} : null};
  if (bahasa !== "id") { const tr = await dariIndonesia(model, {teks: out.balasan, pilihan: out.pilihan, ket: out.ket, nama: out.pelapor?.nama || null}, bahasa, kamusTr(bahasa)); Object.assign(out, {balasan: tr.teks, pilihan: tr.pilihan, ket: tr.ket, bahasa, pilihanAsli: out.pilihan}); }
  return [200, out];
}

/* ---------- foto (KEPUTUSAN K5, D11): GPS perangkat <= 1 km dan <= 10 menit; EXIF <= 5 km dan <= 48 jam ---------- */
async function foto(body) {
  const wa = nomorWa(body.wa);
  if (!wa) return [400, {galat: "Nomor WhatsApp tidak sah."}];
  const buf = Buffer.from(String(body.data || "").replace(/^data:image\/jpeg;base64,/, ""), "base64");
  if (buf.length < 1000 || buf.length > 2.5 * 1048576 || buf[0] !== 0xff || buf[1] !== 0xd8) return [400, {galat: "Foto harus JPEG, paling besar 2,5 MB."}];
  const kini = Date.now(), g = body.gps, x = body.exif;
  const gpsSah = g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && g.akurasi <= 1000 && kini - g.waktu <= 10 * 6e4;
  if (x?.waktu && kini - x.waktu > 48 * 3600e3) return [400, {galat: "Foto diambil lebih dari 48 jam lalu. Kirim foto terbaru dari lokasi."}];
  if (x && x.kamera === false) return [400, {galat: "Foto harus diambil langsung dengan kamera ponsel. Tangkapan layar atau gambar hasil sunting tidak diterima."}];
  if (gpsSah && x?.lat != null && km(g.lat, g.lon, x.lat, x.lon) > 5) return [400, {galat: "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini."}];
  const meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
    : x?.lat != null ? {lencana: "exif", lencanaTeks: "Lokasi dari data foto", lat: x.lat, lon: x.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
  const sAkt = sesiMentah(wa), MAKS = 10; // standar foto publik: paling banyak 10 foto per laporan
  if ((sAkt?.foto || []).filter(f => f.jenis !== "video").length >= MAKS) return [400, {galat: `Paling banyak ${MAKS} foto per laporan.`}];
  const id = crypto.randomBytes(8).toString("hex");
  fs.mkdirSync(FOTO, {recursive: true, mode: 0o700});
  fs.writeFileSync(path.join(FOTO, `${id}.jpg`), buf, {mode: 0o600}); // sudah digambar ulang di kanvas peramban: metadata asli tidak ikut
  // waktu ambil: EXIF, lalu waktu GPS perangkat, lalu waktu unggah; sumbernya ikut ditampilkan (pola /instansi dan /lacak)
  const waktuAmbil = x?.waktu || kini, sumberWaktu = x?.waktu ? "waktu EXIF foto" : gpsSah ? "waktu GPS perangkat" : "waktu unggah";
  const [kode, isi] = await pesan({wa, bahasa: body.bahasa, foto: {id, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini}});
  const prov = sesiMentah(wa)?.isian?.lokasi?.nilai?.wilayah?.provKode;
  return [kode, {...isi, fotoBaru: {id, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null, akurasi: meta.akurasi ?? null,
    waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu, ke: (sAkt?.foto || []).length + 1, maks: MAKS}}];
}

/* ---------- video, unggah bersambung (KEPUTUSAN K57, K61, D77, D79, D89, D90) ----------
   Video selalu lewat unggah bersambung: dipotong 5 MB per bagian (batas minimum bagian multipart R2), bagian yang sudah diterima dicatat,
   peramban melanjutkan dari GET status sesudah sinyal pulih. Pemeriksaan isi (byte awal, besar, durasi, metadata lokasi dan waktu) di "selesai".
   Lokal: bagian di ~/.lapor-lokal/unggah/<id>/; Worker: multipart R2 dan tabel lapor_unggah. */
const BUKTI = path.join(DIR, "bukti"), UNGGAH = path.join(DIR, "unggah"), BAGIAN = 5 * 1048576, VIDEO_MAKS = 30 * 1048576, VIDEO_DETIK = 60, VIDEO_PER_LAPORAN = 3, UNGGAH_BASI = 24 * 3600e3;
const MIME_VIDEO = {"video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm"};
function unggahBersih(d, kini = Date.now()) { // D90: unggahan tanpa bagian baru 24 jam dibuang (Worker: cron bersih-bersih menit 17)
  for (const [id, u] of Object.entries(d.unggah || {})) if (kini - u.akhir > UNGGAH_BASI) { fs.rmSync(path.join(UNGGAH, id), {recursive: true, force: true}); delete d.unggah[id]; }
}
function unggahMulai(body) {
  const wa = nomorWa(body.wa), ukuran = Number(body.ukuran);
  if (!wa) return [400, {galat: "Nomor WhatsApp tidak sah."}];
  if (!Number.isInteger(ukuran) || ukuran < 1000 || ukuran > VIDEO_MAKS) return [400, {galat: `Video paling besar ${VIDEO_MAKS / 1048576} MB.`}];
  const s = sesiMentah(wa);
  if (!s || s.status !== "foto") return [409, {galat: "Kirim video saat diminta foto atau video kejadian."}];
  if ((s.foto || []).filter(f => f.jenis === "video").length >= VIDEO_PER_LAPORAN) return [400, {galat: `Paling banyak ${VIDEO_PER_LAPORAN} video per laporan.`}];
  const d = baca(); unggahBersih(d);
  const id = crypto.randomBytes(8).toString("hex"), jumlah = Math.ceil(ukuran / BAGIAN);
  (d.unggah ||= {})[id] = {wa, bahasa: body.bahasa || "id", ukuran, jumlah, diterima: [], gps: body.gps || null, durasi: Number(body.durasi) || null, mulai: Date.now(), akhir: Date.now()};
  fs.mkdirSync(path.join(UNGGAH, id), {recursive: true, mode: 0o700}); simpan(d);
  return [200, {id, bagian: BAGIAN, jumlah, diterima: []}];
}
async function unggahBagian(req, id, n) {
  const d = baca(), u = d.unggah?.[id];
  if (!u || !Number.isInteger(n) || n < 0 || n >= u.jumlah) return [404, {galat: "Unggahan tidak ditemukan atau sudah kedaluwarsa. Pilih video lagi."}];
  const harap = n === u.jumlah - 1 ? u.ukuran - n * BAGIAN : BAGIAN, potong = [];
  let pjg = 0; for await (const c of req) { pjg += c.length; if (pjg > harap) return [413, {galat: "Bagian lebih besar dari seharusnya."}]; potong.push(c); }
  if (pjg !== harap) return [400, {galat: `Bagian ${n + 1} terpotong (${pjg} dari ${harap} byte). Dikirim ulang.`}];
  fs.writeFileSync(path.join(UNGGAH, id, String(n)), Buffer.concat(potong), {mode: 0o600});
  const d2 = baca(), u2 = d2.unggah[id]; if (!u2.diterima.includes(n)) u2.diterima.push(n); u2.akhir = Date.now(); simpan(d2);
  return [200, {diterima: u2.diterima.sort((a, b) => a - b), jumlah: u2.jumlah}];
}
function unggahStatus(id) { const u = baca().unggah?.[id]; return u ? [200, {diterima: u.diterima.sort((a, b) => a - b), jumlah: u.jumlah, bagian: BAGIAN}] : [404, {galat: "Unggahan tidak ditemukan."}]; }
async function unggahSelesai(id, body) {
  const d = baca(), u = d.unggah?.[id];
  if (!u) return [404, {galat: "Unggahan tidak ditemukan."}];
  if (u.diterima.length !== u.jumlah) return [409, {galat: `Baru ${u.diterima.length} dari ${u.jumlah} bagian.`, diterima: u.diterima}];
  const buf = Buffer.concat([...Array(u.jumlah).keys()].map(n => fs.readFileSync(path.join(UNGGAH, id, String(n)))));
  const buang = () => { fs.rmSync(path.join(UNGGAH, id), {recursive: true, force: true}); const d2 = baca(); delete d2.unggah[id]; simpan(d2); };
  const mime = jenisBerkas(buf), eks = MIME_VIDEO[mime];
  if (!eks || buf.length !== u.ukuran) { buang(); return [400, {galat: "Berkas bukan video MP4, MOV, atau WebM."}]; }
  const durasi = durasiMP4(buf) ?? u.durasi;
  if (durasi != null && durasi > VIDEO_DETIK + 1) { buang(); return [400, {galat: `Video paling lama ${VIDEO_DETIK} detik. Potong dulu, lalu kirim lagi.`}]; }
  // aturan lokasi dan waktu sama dengan foto (D11): GPS perangkat; metadata video menggantikan EXIF
  const kini = Date.now(), g = u.gps, mLok = lokasiMP4(buf), mWaktu = waktuMP4(buf);
  const gpsSah = g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && g.akurasi <= 1000 && kini - g.waktu <= 10 * 6e4;
  if (mWaktu && kini - mWaktu > 48 * 3600e3) { buang(); return [400, {galat: "Video direkam lebih dari 48 jam lalu. Kirim rekaman terbaru dari lokasi."}]; }
  if (gpsSah && mLok && km(g.lat, g.lon, mLok.lat, mLok.lon) > 5) { buang(); return [400, {galat: "Lokasi di video lebih dari 5 km dari posisi Anda sekarang."}]; }
  const meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
    : mLok ? {lencana: "exif", lencanaTeks: "Lokasi dari data video", ...mLok} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
  fs.mkdirSync(FOTO, {recursive: true, mode: 0o700});
  fs.writeFileSync(path.join(FOTO, `${id}.${eks}`), buf, {mode: 0o600});
  // sampul (bingkai pertama, digambar peramban): dipakai kartu, galeri meja, dan PDF (bahanDokumen membaca <id>.jpg)
  const sampul = Buffer.from(String(body.sampul || "").replace(/^data:image\/jpeg;base64,/, ""), "base64");
  if (sampul.length > 500 && sampul.length < 400 * 1024 && sampul[0] === 0xff && sampul[1] === 0xd8) fs.writeFileSync(path.join(FOTO, `${id}.jpg`), sampul, {mode: 0o600});
  buang();
  const waktuAmbil = mWaktu || kini, sumberWaktu = mWaktu ? "waktu rekam video" : gpsSah ? "waktu GPS perangkat" : "waktu unggah";
  const [kode, isi] = await pesan({wa: u.wa, bahasa: u.bahasa, foto: {id, jenis: "video", eks, durasi: durasi != null ? Math.round(durasi) : null, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini}});
  const prov = sesiMentah(u.wa)?.isian?.lokasi?.nilai?.wilayah?.provKode;
  return [kode, {...isi, fotoBaru: {id, jenis: "video", durasi: durasi != null ? Math.round(durasi) : null, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null,
    waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu}}];
}
/* sajikan media (foto JPEG atau video dengan Range supaya bisa digeser) */
function sajikanMedia(req, res, berkas, tipe) {
  if (!fs.existsSync(berkas)) { res.writeHead(404); res.end(); return; }
  const n = fs.statSync(berkas).size, m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (m && tipe.startsWith("video/")) {
    const a = m[1] ? Number(m[1]) : n - Number(m[2]), b = m[1] && m[2] ? Math.min(Number(m[2]), n - 1) : n - 1;
    if (!(a >= 0 && a <= b)) { res.writeHead(416, {"content-range": `bytes */${n}`}); res.end(); return; }
    res.writeHead(206, {"content-type": tipe, "content-range": `bytes ${a}-${b}/${n}`, "content-length": b - a + 1, "accept-ranges": "bytes", "cache-control": "private, no-store"});
    fs.createReadStream(berkas, {start: a, end: b}).pipe(res); return;
  }
  res.writeHead(200, {"content-type": tipe, "content-length": n, "accept-ranges": "bytes", "cache-control": "private, no-store"}); fs.createReadStream(berkas).pipe(res);
}
const TIPE_EKS = {mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm"};
const urlMedia = (f, q) => f.jenis === "video" ? `/api/lapor/foto/${f.id}.${f.eks}${q}` : `/api/lapor/foto/${f.id}${q}`;

// sesi mentah (isian, foto) untuk rute dalam; sesiAktif() mengembalikan [kode, tampilan] untuk peramban
function sesiMentah(wa) { const d = baca(), id = d.aktif[nomorWa(wa)]; return id ? d.sesi[id] : null; }
function sesiAktif(wa) {
  const d = baca(), id = d.aktif[nomorWa(wa)], s = id && d.sesi[id];
  if (!s) return [200, {transkrip: []}];
  return [200, {transkrip: s.transkrip, nomor: s.nomor || null, pilihan: s.pilihan || null, ket: s.pilihanKet || null, minta: s.minta || null, isiAwal: s.isiAwal || null,
    form: s.form || null, banyak: !!s.banyak, grup: s.grup || null, kunci: s.kunci || null, saran: s.saran || 0, status: s.status, lengkap: lengkap(s), isian: isianTampil(s), foto: (s.foto || []).length,
    balasan: s.akhir?.inti || [...(s.transkrip || [])].reverse().find(t => t.dari === "bot")?.teks || null, bisaKembali: !!s.jejak?.length}];
}

const cariToken = (d, t) => /^[0-9a-f]{32}$/.test(t || "") ? Object.values(d.sesi).find(s => s.token === t) : null;
function lacak(t) { // halaman lacak tanpa login: tanpa nomor WA, nama depan saja
  const d = baca(), s = cariToken(d, t);
  if (!s) return [404, {galat: "Laporan tidak ditemukan."}];
  const p = d.pelapor[s.wa] || {}, w = s.isian.lokasi?.nilai?.wilayah, prov = w?.provKode;
  const sudah = new Map(s.tiket.riwayat.map(r => [r.ke, r]));
  return [200, {nomor: s.nomor, status: s.tiket.status, statusLabel: STATUS[s.tiket.status], jenis: JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || "Kejadian",
    subjenis: s.isian.subjenis?.nilai || null, lokasi: w ? `Desa/Kel. ${w.desa}, Kec. ${w.kec}, ${w.kab}` : null, waktuKejadian: s.isian.waktu?.nilai || null,
    waktuLapor: waktuLapor(s.terkirim, prov), pelapor: (p.nama || "").split(" ")[0], foto: (s.foto || []).length, terkirimMs: s.terkirim || null, bisaSusulan: bolehSusulan(s), versi: (s.versi || []).length, fotoPertama: s.foto?.[0] ? `/api/lapor/foto/${s.foto[0].id}?t=${s.token}` : null,
    tahap: s.tiket.status === "tidak_valid" ? [...URUTAN.filter(k => sudah.has(k)), "tidak_valid"].map(k => ({kunci: k, label: STATUS[k], selesai: true, waktu: waktuLapor(sudah.get(k)?.waktu, prov), catatan: sudah.get(k)?.catatan || null}))
      : URUTAN.filter(k => k !== "diteruskan" || sudah.has(k)).map(k => ({kunci: k, label: STATUS[k], selesai: sudah.has(k), waktu: sudah.has(k) ? waktuLapor(sudah.get(k).waktu, prov) : null, catatan: sudah.get(k)?.catatan || null})),
    balasan: (s.balasan || []).map(b => ({teks: b.teks, waktu: waktuLapor(b.waktu, prov)})),
    bukti: (s.bukti || []).map(b => ({url: `/api/lapor/bukti/${b.id}?t=${t}`, waktu: waktuLapor(b.waktu, prov)})), // foto penanganan petugas (K60, D88)
    unduhan: [{label: "Unduh PDF", url: `/api/lapor/unduh/${s.nomor}.pdf?t=${t}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${s.nomor}.docx?t=${t}`}]}];
}

const sedangBuat = {};
function unduh(res, nama, t) {
  const m = /^(LA-\d{6}-\d{2,3})\.(pdf|docx)$/.exec(nama), d = baca(), s = cariToken(d, t);
  if (!m || !s || s.nomor !== m[1]) { res.writeHead(404); return res.end("tidak ada"); }
  const f = path.join(DOK, `${m[1]}.${m[2]}`);
  // templat dokumen berubah sesudah berkas dibuat: hapus berkas lama supaya dibuat ulang dengan tampilan baru
  try { if (fs.statSync(f).mtimeMs < fs.statSync(path.join(AKAR, "scripts/lapor/dokumen.py")).mtimeMs) for (const x of ["pdf", "docx"]) fs.rmSync(path.join(DOK, `${m[1]}.${x}`), {force: true}); } catch {}
  if (!fs.existsSync(f) && !fs.existsSync(path.join(DOK, `${m[1]}.pdf`)) && Date.now() - (sedangBuat[m[1]] || 0) > 60000) { sedangBuat[m[1]] = Date.now(); buatDokumen(s, d.pelapor[s.wa]); } // belum ada: buat ulang
  if (!fs.existsSync(f)) { res.writeHead(202, {"content-type": "text/html; charset=utf-8", "cache-control": "no-store"}); return res.end(HALAMAN_TUNGGU_DOK); }
  res.writeHead(200, {"content-type": m[2] === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "content-disposition": `attachment; filename="Laporan ${m[1]}.${m[2]}"`, "cache-control": "private, no-store"});
  fs.createReadStream(f).pipe(res);
}

/* ---------- info dan prediksi bencana di daerah (pemilik 19 Nov 2026: "langsung summary ke chat untuk provinsi dan kab/kota tersebut") ----------
   Sumber: public/prediksi/data/prediksi.json (keluaran pipeline /prediksi). Level dihitung dengan fungsi yang sama dengan halaman /prediksi
   (public/prediksi/besok_inti.js, dimuat di vm), jadi angka di chat sama dengan halaman itu. Label uji model tidak ditampilkan ke warga (pemilik 19 Nov 2026). */
const Besok = (() => { const ctx = {window: {}}; vm.runInNewContext(fs.readFileSync(path.join(PUBLIK, "prediksi/besok_inti.js"), "utf8"), ctx); return ctx.window.Besok; })();
const TINGKAT = ["Normal", "Waspada", "Siaga", "Awas"];
async function daerah(q) {
  let w = null;
  if (q.kode && /^\d{2}\.\d{2}(\.\d{2})?$/.test(q.kode)) { const d = (await wilayah.cariNama("", q.kode))[0]; w = d ? {...d, desa: null} : null; } // kab atau kec: tingkat kab cukup untuk prakiraan
  else if (q.kode) w = (await wilayah.pusat(String(q.kode)))?.wilayah;
  else if (q.lat != null) w = await wilayah(Number(q.lat), Number(q.lon));
  if (!w) return [404, {galat: "Lokasi tidak terbaca sebagai desa di Indonesia."}];
  const P = JSON.parse(fs.readFileSync(path.join(PUBLIK, "prediksi/data/prediksi.json"), "utf8"));
  const id = w.kabKode.replace(".", ""), k = P.kab.find(x => x.id === id);
  if (!k) return [404, {galat: "Data prakiraan untuk kabupaten/kota ini belum ada."}];
  const KOL = Object.fromEntries(Object.entries(P.kode).map(([c, v]) => [c, v.kol]));
  const hari = P.kode.HJN.hari, nmHari = t => new Date(`${t}T00:00:00Z`).toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "UTC"});
  const teruji = c => Object.values(P.kode[c].vonis || {}).some(v => v[0] === "mengalahkan baseline");
  const perHari = hari.map((t, i) => ({tanggal: nmHari(t), butir: Besok.KOLOM.map(c => ({c, label: P.kode[c]?.label || c, lv: Besok.levelKode(k, KOL, i + 1, c)}))
    .filter(x => x.lv != null && P.kode[x.c]).map(x => ({...x, tingkat: TINGKAT[x.lv], teruji: teruji(x.c)}))}));
  const waspada = P.waspada.filter(x => x.kab === id).map(x => ({hari: nmHari(hari[x.tenggang - 1]), maka: x.maka}));
  const dibuat = new Date(P.dibuat).toLocaleString("id-ID", {day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(":", ".");
  // curah hujan per hari dari kolom HJN (tot = total mm, puncak = jam): angka yang sama dengan halaman /prediksi (pemilik 19 Nov 2026: "waspada curah hujan berapa")
  const ki = Object.fromEntries((P.kode.HJN.kol || []).map((n, i) => [n, i]));
  const hujan = i => { const r = k.HJN?.[i]; if (!r || r[ki.tot] == null) return ""; const v = r[ki.tot], mm = Math.round(v); if (v < 0.5) return "- Tidak hujan"; // kategori hujan harian BMKG
    const kat = v > 150 ? "ekstrem" : v > 100 ? "sangat lebat" : v > 50 ? "lebat" : v > 20 ? "sedang" : "ringan";
    return `- Hujan ${kat}: *${mm.toLocaleString("id-ID")} mm*${v >= 5 && r[ki.puncak] != null ? `, puncak sekitar pukul ${String(r[ki.puncak]).padStart(2, "0")}.00` : ""}`; };
  const baris = (h, i) => [hujan(i), ...h.butir.filter(x => x.lv >= 1 && x.c !== "HJN").map(x => `- ${x.label}: *${x.tingkat}*`)].filter(Boolean).join("\n") || "- Semua jenis ancaman Normal";
  const info = `*${k.nama}, ${k.pn}*${w.desa ? `\nDesa/Kel. ${w.desa}, Kec. ${w.kec}` : ""}\n\n*${perHari[0].tanggal}*\n${baris(perHari[0], 0)}${waspada.length ? `\n\n*Imbauan*\n${waspada.map(x => `- ${x.hari}: ${x.maka}`).join("\n")}` : ""}\n\nPrakiraan Centurisk97 diperbarui ${dibuat} WIB. Untuk peringatan resmi ikuti BMKG dan BPBD setempat.`;
  const prediksi = `*Prediksi 3 hari: ${k.nama}*\n${perHari.map((h, i) => `\n*${h.tanggal}*\n${baris(h, i)}`).join("\n")}\n\nDiperbarui ${dibuat} WIB.`;
  const kartu = perHari.map((h, i) => { const r = k.HJN?.[i]; return {tanggal: h.tanggal, hujanMm: r && r[ki.tot] != null ? Math.round(r[ki.tot]) : null, puncak: r?.[ki.puncak] ?? null,
    ancaman: h.butir.filter(x => x.lv >= 1 && x.c !== "HJN").map(x => ({label: x.label, tingkat: x.tingkat, lv: x.lv}))}; });
  return [200, {wilayah: w, kab: k.nama, prov: k.pn, info, prediksi, perHari: kartu, waspada, dibuat}];
}

/* ---------- peringatan dini warga, tiruan lokal (paket pwa-peringatan PW-11) ----------
   Sama bentuknya dengan rute Worker (src/pw_peringatan.js); langganan disimpan di memori proses dan tidak ada notifikasi sungguhan.
   Kunci VAPID lokal dibuat sekali per proses supaya peramban bisa berlangganan dan alurnya bisa dicoba di localhost:8800. */
const PW_LOKAL = new Map();   // endpoint -> {kec, jenis, ambang}
let PW_KUNCI = null;
const pwKunci = () => { if (!PW_KUNCI) { const {publicKey} = crypto.generateKeyPairSync("ec", {namedCurve: "P-256"}); PW_KUNCI = publicKey.export({format: "jwk"}); } const raw = Buffer.concat([Buffer.from([4]), Buffer.from(PW_KUNCI.x, "base64url"), Buffer.from(PW_KUNCI.y, "base64url")]); return raw.toString("base64url"); };
async function peringatanLokal(rute, req, url) {
  const kec = async kd => { if (!/^\d{2}\.\d{2}\.\d{2}$/.test(kd || "")) return null; const d = (await wilayah.cariNama("", kd))[0]; return d?.kec ? {kode: kd, nama: d.kec, kab: d.kabKode.replace(".", ""), prov: d.provKode, desa: d.kode} : null; };
  if (rute === "kunci") return [200, {tersedia: true, publik: pwKunci(), lokal: true}];
  if (rute === "cari") { const q = String(url.searchParams.get("q") || ""); return [200, {hasil: q.trim().length < 2 ? [] : (await wilayah.cariNama(q, "")).filter(x => x.tingkat === "kec").slice(0, 12).map(x => ({kode: x.kode, judul: x.judul, sub: x.sub}))}]; }
  if (rute === "arah") {
    const x = await kec(url.searchParams.get("kec")); if (!x) return [400, {galat: "Kecamatan tidak dikenal."}];
    const lat = Number(url.searchParams.get("lat")), lon = Number(url.searchParams.get("lon"));
    const asal = Number.isFinite(lat) && Number.isFinite(lon) && url.searchParams.get("lat") ? {lat, lon} : await wilayah.pusat(x.desa);
    const baca = j => { try { return JSON.parse(fs.readFileSync(path.join(PUBLIK, j), "utf8")); } catch { return null; } };
    const P = baca("prediksi/data/prediksi.json"), k = P?.kab.find(r => r.id === x.kab), KOL = P ? Object.fromEntries(Object.entries(P.kode).map(([c, v]) => [c, v.kol])) : {};
    const hari = k ? P.kode.HJN.hari.map((t, i) => ({tanggal: t, nama: NAMA_HARI(t), butir: JENIS_PW.map(([c]) => ({jenis: c, label: labelPw(c), lv: Besok.levelKode(k, KOL, i + 1, c)})).filter(b => b.lv != null)})) : [];
    return [200, {kec: x.nama, kab: k?.nama || null, hari, titik: asal ? titikTerdekat(asal, baca(`data/osm_nasional/${x.prov}.json`), baca(`data/osm_nasional/ibadah/${x.prov}.json`)) : [], catatan: "Jarak garis lurus, bukan rute. Tempat ini belum tentu ditetapkan sebagai titik evakuasi."}];
  }
  if (req.method !== "POST") return [404, {galat: "rute peringatan tidak ada"}];
  const b = await badan(req);
  if (!endpointSah(b?.endpoint)) return [400, {galat: "Langganan peramban tidak sah."}];
  if (rute === "status") { const a = PW_LOKAL.get(b.endpoint); return [200, {aktif: !!a, kec: a?.kec || [], jenis: a?.jenis ?? null, ambang: a?.ambang ?? null}]; }
  if (rute === "berhenti") { PW_LOKAL.delete(b.endpoint); return [200, {ok: true}]; }
  if (rute === "langganan" || rute === "ubah") {
    const kodes = [...new Set((b.kec || []).map(String))]; if (!kodes.length || kodes.length > MAKS_KEC) return [400, {galat: `Pilih 1 sampai ${MAKS_KEC} kecamatan.`}];
    const info = []; for (const kd of kodes) { const x = await kec(kd); if (!x) return [400, {galat: `Kecamatan ${kd} tidak dikenal.`}]; info.push({kode: x.kode, nama: x.nama}); }
    const jenis = Number.isInteger(b.jenis) && b.jenis >= 1 && b.jenis <= 15 ? b.jenis : 15, ambang = [1, 2, 3].includes(b.ambang) ? b.ambang : 1;
    PW_LOKAL.set(b.endpoint, {kec: info, jenis, ambang}); console.log("peringatan lokal: langganan", info.map(x => x.nama).join(", "));
    return [200, {ok: true, kec: info, jenis, ambang}];
  }
  return [404, {galat: "rute peringatan tidak ada"}];
}

/* ---------- tempat di sekitar lokasi kejadian untuk titik pengungsian (pemilik 19 Nov 2026: "connect ke OpenStreetMap, bisa dipilih beberapa") ----------
   Dua sumber: data OSM lokal (public/data/osm_nasional: sekolah, kantor pemerintahan, titik kumpul, puskesmas) dan Overpass API OSM untuk rumah ibadah,
   balai warga, dan sekolah dalam radius 3 km (data lokal hanya menghitung rumah ibadah). Yang dikirim ke Overpass hanya koordinat kejadian. */
const cacheSekitar = new Map();
async function sekitar(q) {
  const s = sesiMentah(q.wa), L = s?.isian?.lokasi?.nilai;
  if (!L || L.lat == null) return [400, {galat: "Lokasi kejadian belum ada."}];
  const lat = Number(L.lat), lon = Number(L.lon), kunci = `${lat.toFixed(3)},${lon.toFixed(3)}`, JENIS_T = {sekolah: "Sekolah", pemerintahan: "Kantor atau balai", titik_kumpul: "Titik kumpul", puskesmas: "Puskesmas", rs: "Rumah sakit", klinik: "Klinik", jembatan: "Jembatan"};
  // data OSM lokal langsung; Overpass (rumah ibadah, balai warga) ditunggu paling lama 2,5 detik, sisanya mengisi cache untuk ketukan berikutnya
  // (pemilik 19 Nov 2026: "lama banget")
  const rapikan = xs => { const unik = new Map(); for (const x of xs) { const k = x.nama.toLowerCase(); if (!unik.has(k) || unik.get(k).jarakKm > x.jarakKm) unik.set(k, x); }
    return [...unik.values()].sort((a, b) => a.jarakKm - b.jarakKm).map(x => ({...x, jarakKm: Math.round(x.jarakKm * 10) / 10})); };
  let c = cacheSekitar.get(kunci);
  if (!c) {
    const lokal = [];
    let osm = {}; try { osm = JSON.parse(fs.readFileSync(path.join(PUBLIK, `data/osm_nasional/${L.wilayah?.provKode}.json`), "utf8")); } catch {}
    for (const [k, t] of Object.entries(JENIS_T)) for (const [la, lo, nama] of osm[k] || []) { const d = km(lat, lon, la, lo); if (d <= 5 && nama) lokal.push({nama, jenis: t, jarakKm: d}); }
    // rumah ibadah: berkas terpisah per provinsi, sama dengan Worker (src/lapor_info.js); Overpass sering gagal, jadi ini sumber utamanya
    let ib = null; try { ib = JSON.parse(fs.readFileSync(path.join(PUBLIK, `data/osm_nasional/ibadah/${L.wilayah?.provKode}.json`), "utf8")); } catch {}
    for (const [la, lo, nama] of ib || []) { const d = km(lat, lon, la, lo); if (d <= 5 && nama) lokal.push({nama, jenis: "Rumah ibadah", jarakKm: d}); }
    c = {semua: rapikan(lokal), lengkap: false, ibadahLokal: !!ib};
    cacheSekitar.set(kunci, c);
    const ql = `[out:json][timeout:8];(nwr(around:3000,${lat},${lon})["amenity"~"place_of_worship|school|community_centre|townhall|shelter|clinic|hospital|doctors"]["name"];way(around:1500,${lat},${lon})["highway"~"primary|secondary|tertiary|residential|unclassified"]["name"];);out center 160;`;
    // server Overpass utama sering penuh (502): coba cermin berurutan, jawaban bukan JSON dianggap gagal
    const CERMIN = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
    const tanya = async () => { for (const u of CERMIN) { try { const r = await fetch(u, {method: "POST", body: new URLSearchParams({data: ql}), headers: {"user-agent": "lapor-bencana-lokal/0.1"}, signal: AbortSignal.timeout(12000)});
      if (r.ok && /json/.test(r.headers.get("content-type") || "")) return await r.json(); } catch {} } throw new Error("semua cermin Overpass gagal"); };
    c.overpass = tanya().then(J => { const JT = {place_of_worship: "Rumah ibadah", school: "Sekolah", community_centre: "Balai warga", townhall: "Kantor atau balai", shelter: "Shelter", clinic: "Klinik", hospital: "Rumah sakit", doctors: "Klinik"}, tambah = [];
        for (const e of J.elements || []) { const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon; if (la == null || !e.tags?.name) continue; tambah.push({nama: e.tags.name, jenis: e.tags.highway ? "Jalan" : JT[e.tags.amenity] || "Tempat", jarakKm: km(lat, lon, la, lo)}); }
        c.semua = rapikan([...c.semua, ...tambah]); c.lengkap = true; })
      .catch(e => { console.error("overpass gagal", e.message); cacheSekitar.delete(kunci); }); // gagal: dicoba lagi pada permintaan berikutnya
  }
  const cukup = c.lengkap || (q.jenis === "ibadah" && c.ibadahLokal);   // daftar lokal rumah ibadah sudah lengkap, Overpass hanya tambahan
  if (!cukup) await Promise.race([c.overpass, new Promise(r => setTimeout(r, 2500))]);
  // satu pemilih untuk titik pengungsian dan nama fasilitas rusak (pemilik 19 Nov 2026: "SD rusak kasih pilihan langsung", juga faskes, ibadah, jalan)
  const SARING = {pengungsian: /^(Sekolah|Kantor atau balai|Balai warga|Rumah ibadah|Titik kumpul|Shelter)$/, sekolah: /^Sekolah$/, faskes: /^(Puskesmas|Rumah sakit|Klinik)$/,
    ibadah: /^Rumah ibadah$/, jalan: /^(Jalan|Jembatan)$/};
  const semua = c.semua.filter(x => (SARING[q.jenis] || SARING.pengungsian).test(x.jenis));
  // cari per kata pada nama dan jenis, dengan sebutan sehari-hari ("balai desa" = kantor desa, "sd" = sekolah dasar); tidak ada yang cocok = tampilkan yang terdekat
  const SEBUT = {"Kantor atau balai": "balai desa kantor kelurahan aula", "Balai warga": "balai warga aula gedung serbaguna", "Rumah ibadah": "masjid musala mushola surau gereja pura vihara klenteng",
    "Sekolah": "sekolah sd smp sma smk madrasah", "Titik kumpul": "titik kumpul lapangan evakuasi", "Puskesmas": "puskesmas faskes", "Rumah sakit": "rs rsud rumah sakit faskes", "Klinik": "klinik faskes", "Jalan": "jalan jl", "Jembatan": "jembatan", "Shelter": "shelter tempat evakuasi"};
  const kata = String(q.q || "").trim().toLowerCase().split(/\s+/).filter(k => k && !KATA_UMUM.has(k));   // kata keadaan ("rusak", "putus") bukan bagian nama tempat
  const cocok = kata.length ? semua.filter(x => { const h = `${x.nama} ${x.jenis} ${SEBUT[x.jenis] || ""}`.toLowerCase(); return kata.every(k => h.includes(k)); }) : semua;
  if (q.semua) return [200, {tempat: semua.slice(0, 400), sebagian: !cukup}];   // layar menyaring sendiri saat diketik, tanpa menunggu server (pemilik 21 Nov 2026)
  return [200, {...(cocok.length ? {tempat: cocok.slice(0, 24)} : {tempat: semua.slice(0, 12), terdekat: true}), sebagian: !cukup}];
}


/* ---------- Alun-alun warga (K30, Q14 dijawab 19 Nov 2026) ----------
   Hanya laporan berstatus ditindaklanjuti atau selesai. Tanpa nama, nomor WA, foto, kronologi bebas, dan nomor tiket (tiket = kunci lacak).
   Isi: jenis, karakteristik, waktu kejadian, desa sampai provinsi, angka dampak, status. */
const TAMPIL_ALUN = new Set(["ditindaklanjuti", "selesai"]);
const idAlun = s => crypto.createHash("sha256").update(s.id).digest("hex").slice(0, 10);
/* K59, D84-D86: titik peta = pusat desa (bukan koordinat pelapor, Q14); laporan satu gugus jadi satu kartu dengan "N warga melapor" bila N >= 2
   (jumlah nomor berbeda, nomornya tidak dikirim); angka dampak dari laporan terbaru gugus itu, tidak dijumlah (D28).
   id kartu = sidik laporan paling awal gugus, jadi tetap sama saat laporan baru bergabung: dipakai "Ikuti kejadian" di perangkat. */
async function alun(q) {
  const d = baca(), angka = (s, n) => { const x = s.isian[n]; return x && !x.belum && !x.nihil ? x.nilai : 0; };
  const G = gugusSemua(d), perGugus = new Map(), sesiNomor = new Map(Object.values(d.sesi).filter(s => s.nomor).map(s => [s.nomor, s]));
  const tampil = Object.values(d.sesi).filter(s => s.nomor && TAMPIL_ALUN.has(s.tiket?.status))
    .filter(s => !q.prov || s.isian.lokasi?.nilai?.wilayah?.provKode === q.prov).filter(s => !q.jenis || s.isian.jenis?.nilai === q.jenis);
  for (const s of tampil) { const k = G.per[s.nomor] || s.nomor, lama = perGugus.get(k); if (!lama || (s.isian.waktu?.ms || s.terkirim) > (lama.isian.waktu?.ms || lama.terkirim)) perGugus.set(k, s); }
  const baris = await Promise.all([...perGugus].sort(([, a], [, b]) => (b.isian.waktu?.ms || b.terkirim) - (a.isian.waktu?.ms || a.terkirim)).slice(0, 100)
    .map(async ([k, s]) => { const w = s.isian.lokasi?.nilai?.wilayah || {}, g = G.gugus.find(x => x.kode === k);
      const awal = g ? sesiNomor.get(g.anggota[0]) : s, desa = w.kode ? await wilayah.pusat(String(w.kode)).catch(() => null) : null;
      const bukti = (g ? g.anggota.map(n => sesiNomor.get(n)) : [s]).flatMap(x => TAMPIL_ALUN.has(x?.tiket?.status) ? (x.bukti || []).filter(b => b.publik) : []);
      return {id: idAlun(awal), jenisId: s.isian.jenis?.nilai || null, jenis: JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || "Kejadian",
        subjenis: s.isian.subjenis?.nilai !== "Belum diketahui" ? s.isian.subjenis?.nilai || null : null, waktu: s.isian.waktu?.nilai || null,
        lokasi: {desa: w.desa || null, kec: w.kec || null, kab: w.kab || null, prov: w.prov || null, provKode: w.provKode || null},
        titik: desa ? {lat: Math.round(desa.lat * 1e4) / 1e4, lon: Math.round(desa.lon * 1e4) / 1e4} : null,
        nWarga: g && g.n_pelapor >= 2 ? g.n_pelapor : null,
        dampak: {meninggal: angka(s, "meninggal"), hilang: angka(s, "hilang"), luka: angka(s, "luka"), mengungsi: angka(s, "mengungsi_jiwa"),
          rumah: ["rumah_berat", "rumah_sedang", "rumah_ringan"].reduce((t, n) => t + angka(s, n), 0), terendam: angka(s, "rumah_terendam")},
        bukti: bukti.slice(0, 4).map(b => `/api/lapor/bukti/${b.id}?alun=1`),
        status: s.tiket.status, statusLabel: STATUS[s.tiket.status], tingkat: s.tingkat === "bpbd" ? "Petugas BPBD" : "Warga"}; }));
  return [200, {baris, jumlah: baris.length}];
}

/* ---------- kejadian hari ini (lapor-kejadian LK-05, LK-06): mesin yang sama dengan Worker (kejadianTerverifikasi, kartuPublik), data dari ~/.lapor-lokal ----------
   Hanya kejadian laporan dengan pengecekan Valid terakhir oleh BPBD wilayahnya dalam 24 jam; tarikan d.tarik per nomor anggota (LK-07). Saklar LAPOR_HARI_INI tidak dibaca di lokal. */
const tarikNomor = (d, n) => (d.tarik || []).filter(x => x.kode === n);
const periksaAkun = s => (s.periksa || []).map((p, i) => ({id: i + 1, hasil: p.hasil, waktu: p.waktu, akun: p.akun || null}));
const JENDELA_HARI = 24 * 3600e3;
/* usulan ke Buku Besar (LK-09): penentu yang sama dengan Worker (usulanDari); usulan disimpan di d.usulan. Lokal tidak punya Siklus, jadi tidak ada usulan yang ditolak */
function usulanLokal(d, nomor) {
  const G = gugusSemua(d), sesi = Object.values(d.sesi), daftar = G.gugus.find(x => x.kode === G.per[nomor])?.anggota || [nomor];
  const anggota = daftar.map(n => { const s = sesi.find(x => x.nomor === n), w = s.isian.lokasi?.nilai?.wilayah || null;
    return {nomor: n, jenis: s.isian.jenis?.nilai || null, laporan: {status: s.tiket.status, wilayah: w}, periksa: periksaAkun(s), versi: (s.versi || []).map(v => ({waktu: v.waktu}))}; });
  const lama = (d.usulan || []).filter(u => daftar.includes(u.kejadian_laporan));
  return {...usulanDari(anggota, lama), statusUsulan: statusUsulan(usulanTerakhir(lama), null)};   // LK-11: tanpa Siklus lokal, usulan selalu menunggu pencocokan
}
async function hariIni(q, kini = Date.now()) {
  const d = baca(), G = gugusSemua(d), gk = new Map(G.gugus.map(g => [g.kode, g])), sesi = new Map(Object.values(d.sesi).filter(s => s.nomor).map(s => [s.nomor, s]));
  const kejadian = new Map();
  for (const [n, s] of sesi) if ((s.periksa || []).some(p => p.hasil === "valid" && p.waktu > kini - JENDELA_HARI)) { const k = G.per[n] || n; if (!kejadian.has(k)) kejadian.set(k, (gk.get(k)?.anggota || [n]).filter(x => sesi.has(x))); }
  const pilih = [];
  for (const anggota of kejadian.values()) {
    const isi = anggota.map(n => { const s = sesi.get(n), w = s.isian.lokasi?.nilai?.wilayah || null;
      const r = {id: s.id, jenis: s.isian.jenis?.nilai || null, wa: s.wa, terkirim: s.terkirim,
        ringkas: JSON.stringify({waktuMs: s.isian.waktu?.ms ?? null, subjenis: s.isian.subjenis?.nilai || null, wilayah: w, dampakMeja: dampakRingkas(s)})};
      return {nomor: n, r, w, laporan: {status: s.tiket.status, wilayah: w}, periksa: periksaAkun(s),
        versi: (s.versi || []).map(v => ({waktu: v.waktu}))}; });
    const kj = kejadianTerverifikasi(isi, anggota.flatMap(n => tarikNomor(d, n)));
    if (!kj.terverifikasi || kj.waktu <= kini - JENDELA_HARI) continue;
    const sah = isi.filter(a => kj.anggota.includes(a.nomor)), akhir = sah.reduce((m, a) => (JSON.parse(a.r.ringkas).waktuMs || 0) > (JSON.parse(m.r.ringkas).waktuMs || 0) ? a : m);
    if (q.prov && akhir.w?.provKode !== q.prov || q.jenis && akhir.r.jenis !== q.jenis) continue;
    pilih.push({sah, akhir, awal: isi[0], waktu: kj.waktu});
  }
  const baris = (await Promise.all(pilih.sort((a, z) => z.waktu - a.waktu).slice(0, 100).map(async x => {
    const pusat = x.akhir.w?.kode ? await wilayah.pusat(String(x.akhir.w.kode)).catch(() => null) : null;
    return kartuPublik({id: crypto.createHash("sha256").update(`lapor-hari-ini|${x.awal.r.id}`).digest("hex").slice(0, 10), pusat,
      anggota: x.sah.map(a => { const p = terakhir(a.periksa); return {r: a.r, verifikasi: {waktu: p.waktu, tingkat: p.akun?.tingkat, kab_nama: p.akun?.kab_nama || null}}; })});
  }))).filter(Boolean);
  return [200, {baris, jumlah: baris.length, dibuat: kini, jendela_jam: 24}];
}

/* ---------- monitoring petugas (K7, D20, D22) ---------- */
// angka dampak ringkas untuk peta dan kepala rincian; null = belum didata (kosong tidak pernah jadi nol)
const dampakRingkas = s => { const a = n => { const x = s.isian[n]; return !x || x.belum ? null : x.nihil ? 0 : Number(x.nilai) || 0; };
  const rumah = ["rumah_berat", "rumah_sedang", "rumah_ringan"].map(a), adaRumah = rumah.some(v => v != null);
  const fas = ["fasilitas_sekolah", "fasilitas_kesehatan", "fasilitas_ibadah"].map(a), adaFas = fas.some(v => v != null);
  return {meninggal: a("meninggal"), hilang: a("hilang"), luka: a("luka"), mengungsi: a("mengungsi_jiwa"), rumah: adaRumah ? rumah.reduce((t, v) => t + (v || 0), 0) : null,
    fasilitas: adaFas ? fas.reduce((t, v) => t + (v || 0), 0) : null, jalan: a("jalan_jembatan")}; };
// waktu tanggap (D68): menit dari terkirim sampai "dilihat" pertama dan sampai "ditindaklanjuti" pertama; null = belum. Tanpa target (Q37).
const tanggap = s => { const pertama = ke => s.tiket.riwayat.find(r => r.ke === ke || (ke === "dilihat" && r.ke !== "baru"))?.waktu;
  const m = w => w ? Math.max(0, Math.round((w - s.terkirim) / 60000)) : null; return {dibuka: m(pertama("dilihat")), tindak: m(pertama("ditindaklanjuti"))}; };
// gugus (A9, src/lapor_gugus.js) dihitung atas semua laporan terkirim
const gugusSemua = d => hitungGugus(Object.values(d.sesi).filter(s => s.nomor).map(s => { const L = s.isian.lokasi?.nilai;
  return {nomor: s.nomor, jenis: s.isian.jenis?.nilai, lat: L?.lat ?? null, lon: L?.lon ?? null, kab: L?.wilayah?.kab || null, desa: L?.wilayah?.kode || null,
    t: s.isian.waktu?.ms || s.terkirim, wa: s.wa, fotoSah: (s.foto || []).some(f => f.lencana === "gps" || f.lencana === "exif"), status: s.tiket.status}; }));
/* satu baris per kejadian di meja (D107): hanya bila ada dua laporan atau lebih; jumlah warga = nomor WA berbeda */
const kejadianTampil = (d, s) => { const a = s.kejadian?.kode ? anggotaKejadian(d, s.kejadian.kode) : []; return a.length >= 2 ? {kode: s.kejadian.kode, n_laporan: a.length, n_pelapor: new Set(a.map(x => x.wa)).size} : null; };
function meja(c) {
  const d = baca(), G = gugusSemua(d), gk = Object.fromEntries(G.gugus.map(g => [g.kode, g]));
  return [200, {akun: {jenis: c.jenis, label: c.label}, baris: Object.values(d.sesi).filter(s => s.nomor && dalamWilayah(c, s.isian.lokasi?.nilai?.wilayah)).sort((a, b) => b.terkirim - a.terkirim).map(s => {
    const p = d.pelapor[s.wa] || {}, w = s.isian.lokasi?.nilai;
    return {nomor: s.nomor, status: s.tiket.status, statusLabel: STATUS[s.tiket.status], waktuLapor: waktuLapor(s.terkirim, w?.wilayah?.provKode), terkirim: s.terkirim,
      waktuKejadian: s.isian.waktu?.nilai || null, wa: s.wa, nama: p.nama || null, peran: PERAN[p.peran] || null, instansi: p.kab ? `BPBD ${p.kab}` : null,
      jenis: JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || null, jenisId: s.isian.jenis?.nilai || null, subjenis: s.isian.subjenis?.nilai || null,
      lat: w?.lat ?? null, lon: w?.lon ?? null, wilayah: w?.wilayah || null, lengkap: lengkap(s), foto: (s.foto || []).length, balasan: (s.balasan || []).length, versi: (s.versi || []).length, adaSusulan: !!s.susulanBaru, dampak: dampakRingkas(s), tempat: tempatRusak(s), tanggap: tanggap(s), darurat: s.darurat ? {korban: s.darurat.korban || null, ...(s.darurat.cara ? {cara: s.darurat.cara} : {}), ...(s.darurat.tertunda ? {tertunda: true} : {})} : null, dikenal: !!p.nama, periksa: s.periksa?.at(-1)?.hasil || null,
      gugus: G.per[s.nomor] ? {kode: G.per[s.nomor], label: gk[G.per[s.nomor]].label, n_laporan: gk[G.per[s.nomor]].n_laporan, n_pelapor: gk[G.per[s.nomor]].n_pelapor, satu_desa: gk[G.per[s.nomor]].satu_desa} : null, kejadian: kejadianTampil(d, s)};
  })}];
}
function mejaRinci(c, nomor, lihat = false) {
  const d = baca(), s = Object.values(d.sesi).find(x => x.nomor === nomor);
  if (!s || !dalamWilayah(c, s.isian.lokasi?.nilai?.wilayah)) return [404, {galat: "Laporan tidak ditemukan."}]; // di luar wilayah = tidak ada (D95)
  if (lihat && c.jenis !== "bnpb") { (s.akses ||= []).push({oleh: c.pelaku, waktu: Date.now()}); simpan(d); } // log akses rincian BPBD (D95)
  if (lihat && s.tiket.status === "baru") { // petugas membuka laporan = "Sudah dilihat petugas"
    s.tiket.riwayat.push({dari: "baru", ke: "dilihat", pelaku: c.pelaku, catatan: null, waktu: Date.now()}); s.tiket.status = "dilihat"; simpan(d);
  }
  const p = d.pelapor[s.wa] || {}, prov = s.isian.lokasi?.nilai?.wilayah?.provKode;
  return [200, {nomor, token: s.token, status: s.tiket.status, pindah: pindahUntuk(c, s.tiket.status, PINDAH[s.tiket.status]), statusLabel: STATUS, akun: {jenis: c.jenis, label: c.label},
    pelapor: {nama: p.nama, wa: s.wa, peran: PERAN[p.peran], kab: p.kab || null, jabatan: p.jabatan || null},
    waktuLapor: waktuLapor(s.terkirim, prov), waktuKejadian: s.isian.waktu?.nilai || null, isian: isianTampil(s), lengkap: lengkap(s), dampak: dampakRingkas(s), tanggap: tanggap(s),
    // nilai mentah per isian (null = belum, 0 = tidak ada) dan waktu kejadian ms: bahan draf logbook Pusdalops di meja (K56)
    nilai: Object.fromEntries(berlakuSesi(s).map(i => { const x = s.isian[i.nama]; return [i.nama, !x || x.belum ? null : x.nihil ? 0 : x.nilai]; })), waktuKejadianMs: s.isian.waktu?.ms ?? null,
    kejadian: kejadianTampil(d, s),
    // pengecekan lapangan dan tindakan (K69-K70): riwayat append-only; pilihan tindakan dari katalog jenis; angka yang boleh direvisi
    periksa: (s.periksa || []).map(x => ({...x, label: HASIL_PERIKSA[x.hasil], waktu: waktuLapor(x.waktu, prov)})),
    tindakan: (s.tindakan || []).map(x => ({...x, waktu: waktuLapor(x.waktu, prov)})),
    tindakanPilihan: tindakanUntuk(s.isian.jenis?.nilai, registri()),
    publik: (() => { const P = periksaAkun(s), T = tarikNomor(d, nomor), sy = syaratPublik({status: s.tiket.status, wilayah: s.isian.lokasi?.nilai?.wilayah || null}, P, (s.versi || []).map(v => ({waktu: v.waktu})), T);
      const segar = (terakhir(P)?.waktu || 0) > Date.now() - JENDELA_HARI;   // sama dengan statusPublik di Worker (LK-07); halaman lokal selalu buka
      return {syarat: sy, ditarik: !!terakhir(T)?.aktif, tayang: sy.every(x => x.ok) && segar, dalam24jam: segar, halamanBuka: true}; })(),
    revisi: revisiTampil(s),
    usulan: c.jenis === "bnpb" ? (() => { const r = usulanLokal(d, nomor); return {...(r.usulan ? {siap: true, ada: null, alasan: null} : {siap: false, ada: r.ada || null, alasan: r.ada ? null : r.galat}), status: r.statusUsulan}; })() : null,   // saklar LAPOR_USUL tidak dibaca di lokal
    gugus: (() => { const G = gugusSemua(d), g = G.gugus.find(x => x.anggota.includes(nomor)); if (!g) return null;
      const sesi = Object.values(d.sesi); return {...g, anggota: g.anggota.map(n => { const a = sesi.find(x => x.nomor === n);
        return {nomor: n, waktuLapor: waktuLapor(a.terkirim, a.isian.lokasi?.nilai?.wilayah?.provKode), desa: a.isian.lokasi?.nilai?.wilayah?.desa || null, status: a.tiket.status, dampak: dampakRingkas(a), saya: n === nomor}; })}; })(), jenisId: s.isian.jenis?.nilai || null, wilayah: s.isian.lokasi?.nilai?.wilayah || null,
    lat: s.isian.lokasi?.nilai?.lat ?? null, lon: s.isian.lokasi?.nilai?.lon ?? null,
    foto: (s.foto || []).map(f => ({url: urlMedia(f, `?t=${s.token}`), sampul: `/api/lapor/foto/${f.id}?t=${s.token}`, jenis: f.jenis || "foto", durasi: f.durasi ?? null, lencana: f.lencanaTeks, waktu: f.waktuAmbil ? waktuLapor(f.waktuAmbil, prov) : null})),
    bukti: (s.bukti || []).map(b => ({id: b.id, url: `/api/lapor/bukti/${b.id}?t=${s.token}`, publik: !!b.publik, waktu: waktuLapor(b.waktu, prov), lokasi: b.lat != null})),
    riwayat: s.tiket.riwayat.map(r => ({...r, label: STATUS[r.ke], waktu: waktuLapor(r.waktu, prov)})), balasan: (s.balasan || []).map(b => ({...b, waktu: waktuLapor(b.waktu, prov)})),
    unduhan: [{label: "PDF", url: `/api/lapor/unduh/${nomor}.pdf?t=${s.token}`}, {label: "Word", url: `/api/lapor/unduh/${nomor}.docx?t=${s.token}`}],
    bahasa: BAHASA.find(([k]) => k === (s.bahasa || "id"))?.[1] || null,
    transkrip: s.transkrip.map(t => ({dari: t.dari, teks: t.teks || (t.lokasi ? "Lokasi dibagikan" : ""), asli: t.asli || null, waktu: waktuLapor(t.waktu, prov)}))}];
}
function mejaUbah(c, nomor, aksi, body) {
  const d = baca(), s = Object.values(d.sesi).find(x => x.nomor === nomor), kini = Date.now();
  if (!s || !dalamWilayah(c, s.isian.lokasi?.nilai?.wilayah)) return [404, {galat: "Laporan tidak ditemukan."}];
  if (!bolehAksi(c, aksi, s.tiket.status, body.ke)) return [403, {galat: "Membuka kembali tiket hanya oleh BNPB."}]; // D96
  const catatan = String(body.catatan || body.teks || "").replace(/\s+/g, " ").trim().slice(0, 1000);
  if (aksi === "tarik") { // LK-07, sama dengan tarikPublik di Worker: satu baris per anggota gugus, tanpa riwayat tiket (catatannya tampil di lacak)
    if (typeof body.aktif !== "boolean") return [400, {galat: "aktif harus true (tarik) atau false (tampilkan lagi)."}];
    if (!!terakhir(tarikNomor(d, nomor))?.aktif === body.aktif) return [409, {galat: body.aktif ? "Laporan ini sudah ditarik dari halaman publik." : "Laporan ini tidak sedang ditarik."}];
    const alasan = String(body.alasan ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) || null;
    const G = gugusSemua(d), sesi = Object.values(d.sesi), wil = n => sesi.find(x => x.nomor === n)?.isian.lokasi?.nilai?.wilayah || null;   // BPBD hanya anggota di wilayahnya (sama dengan Worker)
    const anggota = [nomor, ...(G.gugus.find(x => x.kode === G.per[nomor])?.anggota || []).filter(n => n !== nomor && dalamWilayah(c, wil(n)))];
    for (const n of anggota) (d.tarik ||= []).push({id: (d.tarik || []).length + 1, kode: n, aktif: body.aktif ? 1 : 0, alasan, oleh: c.pelaku, waktu: kini});
    simpan(d); return [200, {ok: true, ditarik: body.aktif, anggota: anggota.length}];
  }
  if (aksi === "usulkan") { // LK-09, sama dengan usulkan di Worker: satu baris d.usulan, tidak pernah mendirikan kejadian resmi
    if (c.jenis !== "bnpb") return [403, {galat: "Mengusulkan ke Buku Besar hanya untuk staf Pusdalops atau Koordalops BNPB dan Super Admin."}];
    const r = usulanLokal(d, nomor); if (!r.usulan) return [r.status, {galat: r.galat, ...(r.ada ? {usulan: r.ada} : {})}];
    const hari = tglKejadian(kini), kode = `LU-${hari}-${String((d.usulan || []).filter(u => u.kode.startsWith(`LU-${hari}-`)).length + 1).padStart(2, "0")}`;
    (d.usulan ||= []).push({kode, ...r.usulan, oleh: c.pelaku, waktu: kini});
    simpan(d); return [200, {ok: true, usulan: {kode, putaran: r.usulan.putaran, anggota: r.usulan.anggota.length}}];
  }
  if (aksi === "balas") {
    if (catatan.length < 2) return [400, {galat: "Balasan kosong."}];
    (s.balasan ||= []).push({teks: catatan, waktu: kini, oleh: c.pelaku});
    (d.kotak[s.wa] ||= []).push({nomor, teks: catatan, waktu: kini});
    if (s.tiket.status === "baru" || s.tiket.status === "dilihat") { s.tiket.riwayat.push({dari: s.tiket.status, ke: "ditelaah", pelaku: c.pelaku, catatan: null, waktu: kini}); s.tiket.status = "ditelaah"; }
  } else if (aksi === "bukti") { // foto penanganan petugas (K60, D87): tabel samping, bukan foto pelapor; GPS perangkat petugas
    const buf = Buffer.from(String(body.data || "").replace(/^data:image\/jpeg;base64,/, ""), "base64");
    if (buf.length < 1000 || buf.length > 3 * 1048576 || jenisBerkas(buf) !== "image/jpeg") return [400, {galat: "Foto penanganan harus JPEG, paling besar 3 MB."}];
    if ((s.bukti || []).length >= 10) return [400, {galat: "Paling banyak 10 foto penanganan per laporan."}];
    const g = body.gps, gpsSah = g && Number.isFinite(g.lat) && Number.isFinite(g.lon) && g.akurasi <= 1000 && kini - g.waktu <= 10 * 6e4;
    const id = crypto.randomBytes(8).toString("hex");
    fs.mkdirSync(BUKTI, {recursive: true, mode: 0o700}); fs.writeFileSync(path.join(BUKTI, `${id}.jpg`), buf, {mode: 0o600});
    (s.bukti ||= []).push({id, waktu: kini, oleh: c.pelaku, publik: false, ...(gpsSah ? {lat: g.lat, lon: g.lon, akurasi: g.akurasi} : {})});
    s.tiket.riwayat.push({dari: s.tiket.status, ke: s.tiket.status, pelaku: c.pelaku, catatan: `Foto penanganan ditambahkan${gpsSah ? "" : " (tanpa lokasi GPS)"}`, waktu: kini});
  } else if (aksi === "lepas") { // D106: hanya BNPB (bolehAksi); laporan keluar dari kejadiannya, tercatat di riwayat tiket
    const kode = s.kejadian?.kode;
    if (!kode) return [409, {galat: "Laporan ini tidak tergabung dalam kejadian."}];
    delete s.kejadian;
    const sisa = anggotaKejadian(d, kode); if (sisa.length < 2) for (const x of sisa) delete x.kejadian; // kejadian minimal dua laporan
    s.tiket.riwayat.push({dari: s.tiket.status, ke: s.tiket.status, pelaku: c.pelaku, catatan: `Dilepas dari kejadian ${kode}`, waktu: kini});
  } else if (aksi === "teruskan") { // LA-67 (D97): hanya BNPB (bolehAksi); lokal hanya mengubah status, pemberitahuan BPBD butuh Worker dan bot
    if (!PINDAH[s.tiket.status]?.includes("diteruskan")) return [409, {galat: "Perpindahan status tidak sah."}];
    s.tiket.riwayat.push({dari: s.tiket.status, ke: "diteruskan", pelaku: c.pelaku, catatan: "Diteruskan ke meja BPBD (pemberitahuan menunggu Worker)", waktu: kini});
    s.tiket.status = "diteruskan";
    (d.kotak[s.wa] ||= []).push({nomor, teks: `Status laporan ${nomor}: ${STATUS.diteruskan}.`, waktu: kini, status: true});
    simpan(d);
    const r = mejaRinci(c, nomor); r[1].bpbdTerdaftar = false; r[1].antre = 0; return r;
  } else if (aksi === "bukti-publik") { // D88: tampil di Alun-alun hanya bila staf menandai per foto
    const b = (s.bukti || []).find(x => x.id === body.id);
    if (!b) return [404, {galat: "Foto penanganan tidak ditemukan."}];
    b.publik = body.publik === true;
  } else if (aksi === "periksa") { // pengecekan lapangan (K69, D108-D110): hasil + catatan; revisi angka = versi baru berasal petugas; tidak valid memindah tiket
    if (["selesai", "tidak_valid"].includes(s.tiket.status)) return [409, {galat: "Tiket sudah ditutup."}];
    const v = sahkanPeriksa(body, new Set(berlakuSesi(s).map(i => i.nama)));
    if (v.galat) return [400, {galat: v.galat}];
    const r = terapkanRevisi(s.isian, v.ubah, {pelaku: c.pelaku, catatan: v.catatan, waktu: kini}), st = s.tiket.status, ke = statusDariHasil(v.hasil, st, PINDAH);
    if (r.perubahan.length) {
      const label = Object.fromEntries(berlakuSesi(s).map(i => [i.nama, i.label])), versi = (s.versi || []).length + 1;
      s.isian = r.isian;
      (s.versi ||= []).push({versi, isi: structuredClone(s.isian), waktu: kini, petugas: c.pelaku, perubahan: r.perubahan.map(x => ({...x, label: label[x.nama]}))});
      for (const x of ["pdf", "docx"]) fs.rmSync(path.join(DOK, `${nomor}.${x}`), {force: true});
      buatDokumen(s, d.pelapor[s.wa]);
    }
    (s.periksa ||= []).push({hasil: v.hasil, catatan: v.catatan, oleh: c.pelaku, waktu: kini, perubahan: r.perubahan, akun: penandaPemeriksa(c)});   // akun = penanda wilayah pemeriksa (LK-02), sama dengan lk_periksa_akun di Worker
    const ket = `Pengecekan lapangan: ${HASIL_PERIKSA[v.hasil]}. ${v.catatan}${r.perubahan.length ? `. Revisi versi ${s.versi.length}: ${r.perubahan.map(x => `${x.nama.replace(/_/g, " ")} ${x.dari ?? "belum didata"} menjadi ${x.ke}`).join(", ")}` : ""}`;
    s.tiket.riwayat.push({dari: st, ke: ke || st, pelaku: c.pelaku, catatan: ket.slice(0, 1000), waktu: kini});
    if (ke) { s.tiket.status = ke; delete s.susulanBaru; (d.kotak[s.wa] ||= []).push({nomor, teks: `Status laporan ${nomor}: ${STATUS[ke]}. ${v.catatan}`, waktu: kini, status: true}); }
  } else if (aksi === "tindakan") { // tambah tindakan saat tiket ditindaklanjuti (K70, D111-D112)
    if (s.tiket.status !== "ditindaklanjuti") return [409, {galat: "Tindakan dicatat saat tiket Ditindaklanjuti."}];
    const v = sahkanTindakan(body, s.isian.jenis?.nilai, registri()); if (v.galat) return [400, {galat: v.galat}];
    (s.tindakan ||= []).push(...v.tindakan.map(x => ({...x, oleh: c.pelaku, waktu: kini})));
    s.tiket.riwayat.push({dari: s.tiket.status, ke: s.tiket.status, pelaku: c.pelaku, catatan: `Tindakan: ${v.tindakan.map(x => x.label).join(", ")}`, waktu: kini});
    (d.kotak[s.wa] ||= []).push({nomor, teks: `Tindakan untuk laporan ${nomor}: ${v.tindakan.map(x => x.label).join(", ")}.`, waktu: kini, status: true});
  } else if (aksi === "status") {
    if (!PINDAH[s.tiket.status]?.includes(body.ke)) return [409, {galat: "Perpindahan status tidak sah."}];
    if (body.ke === "tidak_valid" && catatan.length < 5) return [400, {galat: "Tulis alasan laporan tidak valid di kotak catatan."}];
    let tindakan = []; // Ditindaklanjuti wajib menyebut tindakan yang dilakukan (K70, D112)
    if (body.ke === "ditindaklanjuti") { const v = sahkanTindakan(body, s.isian.jenis?.nilai, registri()); if (v.galat) return [400, {galat: v.galat, perluTindakan: true}]; tindakan = v.tindakan; }
    if (tindakan.length) (s.tindakan ||= []).push(...tindakan.map(x => ({...x, oleh: c.pelaku, waktu: kini})));
    // Selesai wajib minimal satu foto penanganan, atau alasan tertulis tanpa foto yang tercatat di riwayat (K60, D87, Q49)
    const alasan = String(body.tanpaBukti || "").replace(/\s+/g, " ").trim().slice(0, 300);
    if (body.ke === "selesai" && !(s.bukti || []).length && alasan.length < 5) return [400, {galat: "Lampirkan minimal satu foto penanganan, atau tulis alasan tanpa foto.", perluBukti: true}];
    if (["selesai", "tidak_valid"].includes(s.tiket.status) && !catatan) return [400, {galat: "Membuka kembali wajib dengan catatan."}];
    const tanpa = body.ke === "selesai" && !(s.bukti || []).length ? `Tanpa foto penanganan: ${alasan}` : null;
    delete s.susulanBaru; s.tiket.riwayat.push({dari: s.tiket.status, ke: body.ke, catatan: [tindakan.length ? `Tindakan: ${tindakan.map(x => x.label).join(", ")}` : null, catatan, tanpa].filter(Boolean).join(". ") || null, pelaku: c.pelaku, waktu: kini}); // append-only
    s.tiket.status = body.ke;
    const nb = (s.bukti || []).length;
    (d.kotak[s.wa] ||= []).push({nomor, teks: `Status laporan ${nomor}: ${STATUS[body.ke]}.${tindakan.length ? ` Tindakan: ${tindakan.map(x => x.label).join(", ")}.` : ""}${catatan ? ` ${catatan}` : ""}${body.ke === "selesai" && nb ? ` Lihat ${nb} foto penanganan di halaman lacak.` : ""}`, waktu: kini, status: true});
  } else return [404, {galat: "aksi"}];
  simpan(d);
  return mejaRinci(c, nomor);
}

/* ---------- akun meja (K63, D94): lokal tanpa login = BNPB (hanya loopback). Kuki lapor_sebagai=kab:31.75 atau prov:31 meniru akun lembaga
   pemkab/pemkot/pemprov supaya tampilan BPBD bisa ditinjau di http://localhost:8800/lapor/meja.html?sebagai=kab:31.75.
   Worker: dari sesi Ruang Instansi atau /masuk (instansi_akun aktif, mk_anggota), bukan kuki ini. ---------- */
async function akunMeja(req) {
  const m = /(?:^|;\s*)lapor_sebagai=(kab|prov):([\d.]{2,5})/.exec(req.headers.cookie || "");
  if (!m) return cakupanMeja({bnpb: true});
  const [, tingkat, kode] = m, prov = kode.slice(0, 2);
  const w = (await wilayah.cariNama("", kode))[0];
  return cakupanMeja({jenis: tingkat === "prov" ? "pemprov" : /^kota/i.test(w?.kab || "") ? "pemkot" : "pemkab", tingkat, prov, kab: tingkat === "kab" ? kode : null,
    wilayah: tingkat === "kab" ? (w?.kab || kode).replace(/^Kota Administrasi /, "Kota ") : `Provinsi ${w?.prov || prov}`, status: "aktif", nama: "Uji lokal"});
}

/* ---------- penangan /api/lapor/* (dipakai server tinjau 8800 dan mode mandiri). true = sudah dijawab ---------- */
async function badan(req) { let raw = ""; for await (const c of req) { raw += c; if (raw.length > 4 * 1048576) throw Object.assign(new Error("besar"), {kode: 413}); } return JSON.parse(raw || "{}"); }
export async function tanganiLapor(req, res, url) {
  const kirim = ([kode, isi]) => { res.writeHead(kode, {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}); res.end(JSON.stringify(isi)); return true; };
  const j = url.pathname;
  if (!j.startsWith("/api/lapor/")) return false;
  if (j.startsWith("/api/lapor/data/")) return (await import("./lokal_data.mjs")).layani(req, res, url).catch(e => kirim([500, {galat: String(e?.message || e)}]));   // Worker asli di Miniflare
  try {
    if (req.method === "POST" && j === "/api/lapor/pesan") return kirim(await pesan(await badan(req)));
    if (req.method === "POST" && j === "/api/lapor/foto") return kirim(await foto(await badan(req)));
    if (j === "/api/lapor/sesi") return kirim(sesiAktif(url.searchParams.get("wa")));
    if (j === "/api/lapor/cari" && req.method !== "POST") return kirim([200, {hasil: await wilayah.cariNama(url.searchParams.get("q"), /^\d{2}\.\d{2}(\.\d{2})?$/.test(url.searchParams.get("dalam") || "") ? url.searchParams.get("dalam") : "")}]);
    if (j === "/api/lapor/lacak") return kirim(lacak(url.searchParams.get("t")));
    if (j === "/api/lapor/kotak") { const d = baca(), sejak = Number(url.searchParams.get("sejak") || 0); return kirim([200, {pesan: (d.kotak[nomorWa(url.searchParams.get("wa"))] || []).filter(k => k.waktu > sejak)}]); }
    if (j.startsWith("/api/lapor/unduh/")) { unduh(res, decodeURIComponent(j.slice(17)), url.searchParams.get("t")); return true; }
    if (j.startsWith("/api/lapor/foto/")) { // foto, sampul video (<id>), atau video (<id>.<eks>); hanya dengan token lacak laporan itu
      const [, id, eks] = /^([0-9a-f]{16})(?:\.(mp4|mov|webm))?$/.exec(j.slice(16)) || [], d = baca(), s = id && Object.values(d.sesi).find(x => x.token === url.searchParams.get("t") && (x.foto || []).some(f => f.id === id));
      if (!s) return kirim([404, {galat: "tidak ada"}]);
      sajikanMedia(req, res, path.join(FOTO, `${id}.${eks || "jpg"}`), eks ? TIPE_EKS[eks] : "image/jpeg"); return true;
    }
    if (j.startsWith("/api/lapor/bukti/")) { // foto penanganan: token lacak laporan itu, atau ?alun=1 bila ditandai publik
      const id = j.slice(17), d = baca(), alunQ = url.searchParams.get("alun") === "1";
      const s = /^[0-9a-f]{16}$/.test(id) && Object.values(d.sesi).find(x => (x.bukti || []).some(b => b.id === id && (alunQ ? b.publik && TAMPIL_ALUN.has(x.tiket?.status) : x.token === url.searchParams.get("t"))));
      if (!s) return kirim([404, {galat: "tidak ada"}]);
      sajikanMedia(req, res, path.join(BUKTI, `${id}.jpg`), "image/jpeg"); return true;
    }
    if (req.method === "POST" && j === "/api/lapor/unggah/mulai") return kirim(unggahMulai(await badan(req)));
    const mu = /^\/api\/lapor\/unggah\/([0-9a-f]{16})(?:\/(\d+|selesai))?$/.exec(j);
    if (mu && req.method === "PUT" && /^\d+$/.test(mu[2] || "")) return kirim(await unggahBagian(req, mu[1], Number(mu[2])));
    if (mu && req.method === "POST" && mu[2] === "selesai") return kirim(await unggahSelesai(mu[1], await badan(req)));
    if (mu && !mu[2]) return kirim(unggahStatus(mu[1]));
    if (req.method === "POST" && j === "/api/lapor/nilai") { // nilai percakapan 1-5 (pemilik 19 Nov 2026)
      const b = await badan(req), d = baca(), s = Object.values(d.sesi).find(x => x.nomor === b.nomor && x.wa === nomorWa(b.wa)), n = Number(b.nilai);
      if (!s || !Number.isInteger(n) || n < 1 || n > 5) return kirim([400, {galat: "Nilai tidak sah."}]);
      s.nilai = {nilai: n, waktu: Date.now()}; simpan(d); return kirim([200, {ok: true}]);
    }
    if (j === "/api/lapor/terjemah" && req.method === "POST") { const b = await badan(req); return kirim([200, {teks: await terjemahUi(model, b.teks, bahasaSah(b.bahasa))}]); }
    if (j === "/api/lapor/bahasa") return kirim([200, {bahasa: model ? BAHASA.map(([kode, nama]) => ({kode, nama})) : [{kode: "id", nama: "Bahasa Indonesia"}]}]);
    if (j === "/api/lapor/penting") return kirim(await info.penting(Object.fromEntries(url.searchParams)));   // satu mesin dengan Worker (src/lapor_info.js)
    if (j === "/api/lapor/sekitar") return kirim(await sekitar(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/daerah") return kirim(await daerah(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/rapor") return kirim(await info.rapor(Object.fromEntries(url.searchParams)));   // satu mesin dengan Worker (src/lapor_info.js)
    if (j === "/api/lapor/alun") return kirim(await alun(Object.fromEntries(url.searchParams)));
    /* kabar warga per kartu (LA-85, LA-87): saringan sama dengan Worker (bersihKomen), data di ~/.lapor-lokal; aduan lokal dihitung per nomor (tanpa IP) */
    const km = /^\/api\/lapor\/komen\/(?:([0-9a-f]{10})|([0-9a-f]{16})\/laporkan)$/.exec(j);
    if (km && req.method === "GET" && km[1]) return kirim([200, {komen: (baca().komen || []).filter(k => k.kartu === km[1] && k.status === "tampil").map(k => ({id: k.id, teks: k.teks, waktu: Math.floor(k.dibuat / 60e3) * 60e3}))}]);
    if (km && req.method === "POST") {
      const b = await badan(req), wa = nomorWa(b.wa); if (!wa) return kirim([401, {galat: "Masuk dulu dengan nomor WhatsApp Anda."}]);
      const d = baca(); d.komen ||= [];
      if (km[2]) { const k = d.komen.find(x => x.id === km[2]); if (!k) return kirim([404, {galat: "Komentar tidak ada."}]); if (k.wa === wa) return kirim([400, {galat: "Komentar sendiri tidak bisa dilaporkan."}]);
        k.aduan ||= []; const baru = !k.aduan.includes(wa); if (baru) k.aduan.push(wa); if (k.aduan.length >= 3 && k.status === "tampil") k.status = "dilaporkan"; simpan(d); return kirim([200, {ok: true, baru}]); }
      if (typeof b.teks !== "string") return kirim([400, {galat: "Komentar harus berupa teks."}]);
      const r = (await import("../../src/lapor_komen.js")).bersihKomen(b.teks); if (r.galat) return kirim([400, {galat: r.galat}]);
      if (!(await alun({}))[1].baris.some(x => x.id === km[1])) return kirim([404, {galat: "Kejadian ini tidak sedang tampil di Alun-alun."}]);
      const k = {id: crypto.randomBytes(8).toString("hex"), kartu: km[1], wa, teks: r.teks, status: "tampil", dibuat: Date.now()}; d.komen.push(k); simpan(d);
      return kirim([200, {komen: {id: k.id, teks: k.teks, waktu: Math.floor(k.dibuat / 60e3) * 60e3}}]);
    }
    if (j === "/api/lapor/hari-ini") { const q = url.searchParams, ks = [...q.keys()], jn = q.get("jenis") || "", pv = q.get("prov") || "";   // saringan sama dengan Worker
      if (ks.some(k => k !== "jenis" && k !== "prov") || new Set(ks).size !== ks.length || jn && !JENIS.some(x => x.id === jn) || pv && !/^\d{2}$/.test(pv)) return kirim([400, {galat: "Saringan tidak dikenal."}]);
      return kirim(await hariIni({jenis: jn, prov: pv})); }
    if (j === "/api/lapor/susulan" && req.method === "POST") return kirim(await susulan(await badan(req)));
    if (j === "/api/lapor/darurat/cepat" && req.method === "POST") return kirim(await daruratCepat(await badan(req)));
    if (j === "/api/lapor/agregat") { // K62, D91-D93: lokal tanpa login (loopback); Worker: hanya sesi kampus mitra /kemitraan, unduhan dicatat
      const d = baca(), baris = agregat(Object.values(d.sesi).filter(s => s.nomor).map(s => { const w = s.isian.lokasi?.nilai?.wilayah || {};
        return {provKode: w.provKode, prov: w.prov, kabKode: w.kabKode, kab: w.kab, jenis: JENIS.find(x => x.id === s.isian.jenis?.nilai)?.label || null, kejadian: s.isian.waktu?.ms ?? null,
          terkirim: s.terkirim, wa: s.wa, fotoSah: (s.foto || []).some(f => f.lencana === "gps" || f.lencana === "exif"), status: s.tiket?.status}; }));
      if (url.searchParams.get("format") === "csv") { res.writeHead(200, {"content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="lapor-agregat.csv"', "cache-control": "no-store"}); res.end(keCsv(baris)); return true; }
      return kirim([200, {dibuat: new Date().toLocaleString("id-ID", {dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta"}), batas: BATAS_SEL, kolom: KOLOM_AGREGAT, baris}]);
    }
    if (j.startsWith("/api/lapor/peringatan/")) return kirim(await peringatanLokal(j.slice("/api/lapor/peringatan/".length), req, url));
    /* kabar selamat dan orang dicari (LA-80): rute yang sama dengan Worker (src/lapor_selamat.js). Lokal tanpa kode sekali pakai: nomor dari badan atau ?wa= (loopback). */
    if (j === "/api/lapor/selamat" || j === "/api/lapor/selamat/saya" || j === "/api/lapor/cari" && req.method === "POST" || j.startsWith("/api/lapor/s/")) {
      const d = baca(), kini = Date.now(), b = req.method === "POST" ? await badan(req) : {}, wa = nomorWa(b.wa || url.searchParams.get("wa")), aktif = t => !t.dicabut && t.kedaluwarsa > kini;
      const host = String(req.headers.host || "").replace(/:\d+$/, "").toLowerCase();
      if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) return kirim([403, {galat: "Hanya dari komputer ini."}]);   // mesin lokal bukan layanan jaringan
      if (req.method !== "GET" && req.headers["x-pb"] !== "1") return kirim([403, {galat: "kiriman wajib membawa header x-pb: 1"}]);
      d.selamat ||= []; d.cari ||= [];
      const tampil = async t => ({nama_panggil: t.nama_panggil, status: t.status, label: t.status === "selamat" ? "Selamat" : "Selamat, butuh bantuan", kab: t.kab, kab_nama: await wilayah.kabNama(t.kab), waktu: t.dibuat});
      if (j.startsWith("/api/lapor/s/")) { const h = crypto.createHash("sha256").update(j.slice(13)).digest("hex"), t = d.selamat.find(x => x.token_sha === h && aktif(x));
        return kirim(t ? [200, await tampil(t)] : [404, {galat: "Tautan ini tidak ditemukan atau sudah tidak berlaku."}]); }
      if (!wa) return kirim([401, {galat: "Minta kode dulu: masuk dengan nomor WhatsApp Anda."}]);
      if (j === "/api/lapor/selamat/saya") { const t = d.selamat.find(x => x.nomor === wa && aktif(x)); return kirim([200, {tanda: t ? {...await tampil(t), kedaluwarsa: t.kedaluwarsa} : null}]); }
      if (req.method === "DELETE") { let n = 0; for (const t of d.selamat) if (t.nomor === wa && !t.dicabut) { t.dicabut = kini; n++; } simpan(d); return kirim([200, {dicabut: n > 0}]); }
      if (j === "/api/lapor/cari") {
        const nomorDicari = b.nomor_dicari ? nomorWa(b.nomor_dicari) : null;
        if (String(b.nama_dicari || "").trim().length < 2 || !await wilayah.kabNama(b.kab) || b.nomor_dicari && !nomorDicari) return kirim([400, {galat: "Isian belum sah."}]);
        const id = crypto.randomBytes(8).toString("hex"); d.cari.push({id, nomor_pencari: wa, nama_dicari: String(b.nama_dicari).trim().slice(0, 80), ciri: b.ciri || null, lokasi_terakhir: b.lokasi_terakhir || null,
          waktu_terakhir: b.waktu_terakhir || null, nomor_dicari: nomorDicari, hubungan: b.hubungan || null, kab: b.kab, status: "buka", dibuat: kini, riwayat: []}); simpan(d);
        return kirim([200, {id, status: "buka", pesan: "Laporan diterima petugas. Laporan ini tidak tampil di publik."}]); }
      const nama = String(b.nama_panggil || "").trim().slice(0, 40);
      if (!nama || nama.replace(/\D/g, "").length >= 6 || !["selamat", "butuh_bantuan"].includes(b.status) || !await wilayah.kabNama(b.kab)) return kirim([400, {galat: "Isian belum sah."}]);
      for (const t of d.selamat) if (t.nomor === wa && !t.dicabut) t.dicabut = kini;
      const token = crypto.randomBytes(32).toString("hex"), kedaluwarsa = kini + 7 * 864e5;
      d.selamat.push({nomor: wa, nama_panggil: nama, status: b.status, kab: b.kab, token_sha: crypto.createHash("sha256").update(token).digest("hex"), dibuat: kini, kedaluwarsa}); simpan(d);
      return kirim([200, {tautan: `/lapor/s/${token}`, kedaluwarsa, status: b.status, nama_panggil: nama, kab: b.kab, kab_nama: await wilayah.kabNama(b.kab)}]);
    }
    if (j.startsWith("/api/lapor/meja")) {
      const c = await akunMeja(req);
      if (!c) return kirim([403, {galat: "Akun ini tidak berhak membuka meja laporan."}]);
      if (j === "/api/lapor/meja/cari") { const d = baca(); d.selamat ||= []; d.cari ||= [];   // orang dicari; cocok hanya nomor sama persis dengan tanda aktif (D130)
        const baris = []; for (const r of d.cari) { const kn = await wilayah.kabNama(r.kab); if (!dalamWilayah(c, {provKode: r.kab.slice(0, 2), kabKode: r.kab, kab: kn})) continue;
          const t = r.nomor_dicari && d.selamat.find(x => x.nomor === r.nomor_dicari && !x.dicabut && x.kedaluwarsa > Date.now());
          baris.push({...r, kab_nama: kn, cocok: !!t, tanda: t ? {status: t.status, waktu: t.dibuat} : null}); }
        return kirim([200, {akun: {jenis: c.jenis, label: c.label}, baris}]); }
      const cs = /^\/api\/lapor\/meja\/cari\/([0-9a-f]{16})\/status$/.exec(j);
      if (cs && req.method === "POST") { const d = baca(), r = (d.cari || []).find(x => x.id === cs[1]), b = await badan(req);
        if (!r || !dalamWilayah(c, {provKode: r.kab.slice(0, 2), kabKode: r.kab, kab: await wilayah.kabNama(r.kab)})) return kirim([404, {galat: "Laporan tidak ditemukan."}]);
        if (!["buka", "ditemukan_selamat", "ditemukan_meninggal", "ke_sar", "tutup"].includes(b.status)) return kirim([400, {galat: "Status tidak sah."}]);
        r.status = b.status; r.ditutup = b.status === "buka" ? null : Date.now(); r.ditutup_oleh = b.status === "buka" ? null : c.pelaku; r.riwayat.push({status: b.status, catatan: String(b.catatan || "").slice(0, 300) || null, oleh: c.pelaku, waktu: Date.now()}); simpan(d);
        return kirim([200, {id: r.id, status: r.status}]); }
      if (j === "/api/lapor/meja") return kirim(meja(c));
      const mj = /^\/api\/lapor\/meja\/(LA-\d{6}-\d{2,3})\/jalan$/.exec(j);   // ruas jalan rusak untuk peta meja (K83), sama dengan Worker
      if (mj) { const s = Object.values(baca().sesi).find(x => x.nomor === mj[1]), w = s?.isian.lokasi?.nilai;
        if (!s || !dalamWilayah(c, w?.wilayah)) return kirim([404, {galat: "Laporan tidak ditemukan."}]);
        return kirim([200, await jalanOsm(w?.lat, w?.lon, tempatRusak(s)?.jalan || [])]); }
      const m = /^\/api\/lapor\/meja\/(LA-\d{6}-\d{2,3})(?:\/(balas|status|lihat|bukti|bukti-publik|teruskan|lepas|periksa|tindakan|tarik|usulkan))?$/.exec(j);
      // sama dengan Worker: GET rincian tidak pernah menulis; tanda "dilihat" lewat POST .../lihat (guard-api 19 Nov 2026). ?lihat=1 lama tetap dilayani sementara
      if (m && m[2] === "lihat" && req.method === "POST") return kirim(mejaRinci(c, m[1], true));
      if (m && !m[2]) return kirim(mejaRinci(c, m[1], url.searchParams.get("lihat") === "1"));
      if (m && req.method === "POST") return kirim(mejaUbah(c, m[1], m[2], await badan(req)));
    }
    return kirim([404, {galat: "rute lapor tidak ada"}]);
  } catch (e) { if (e.kode === 413) return kirim([413, {galat: "Kiriman terlalu besar."}]); console.error(e); return kirim([500, {galat: "Galat server lokal."}]); }
}

const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json"};
function statis(res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/" || rel === "/lapor") { res.writeHead(302, {location: "/lapor/"}); return res.end(); }
  if (rel.endsWith("/")) rel += "index.html";
  const f = path.join(PUBLIK, path.normalize(rel));
  if (!f.startsWith(PUBLIK + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end("tidak ada"); }
  res.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "cache-control": "no-store"});
  fs.createReadStream(f).pipe(res);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href && process.argv[2] === "berkas-uji") {
  const r = await (await import("./lokal_data.mjs")).berkasUji(); console.log(r.buka === false ? "berkas sudah ada: " + r.sebab : r.tautan); process.exit(0);
} else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (await tanganiLapor(req, res, url)) return;
  if (req.method === "GET") return statis(res, url);
  res.writeHead(405); res.end();
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Lapor Bencana lokal mandiri: http://localhost:${PORT}/lapor/  (model: ${model ? process.env.LAPOR_MODEL || "claude-sonnet-5-5" : "tanpa AI"})`);
  console.log(`Data uji: ${DIR}`);
});
