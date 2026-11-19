#!/usr/bin/env node
// Server lokal Lapor Bencana BNPB (data/kajian-bnpb/lapor-ai, AGENTS 3.8). Mesin = src/lapor_mesin.js, sama dengan yang nanti dipakai Worker.
//   Bawaan: server tinjau http://localhost:8800 memanggil tanganiLapor untuk /api/lapor/*, jadi data lapor TIDAK pernah diteruskan ke produksi.
//   Mandiri: node scripts/lapor/lokal.mjs -> http://localhost:8810/lapor/
// Halaman: /lapor/ (chat pelapor), /lapor/lacak.html?t=<token> (lacak laporan tanpa login), /lapor/meja.html (monitoring petugas).
// Model = Claude API bila ANTHROPIC_API_KEY ada di env atau scripts/wa/.env (tidak pernah dicetak); tanpa kunci = pertanyaan templat.
// Data uji di ~/.lapor-lokal (di luar repo: nomor WA, nama, dan foto pelapor tidak boleh masuk repo publik). Hanya 127.0.0.1.
// ponytail: monitoring lokal tanpa login (hanya loopback). Di Worker rute /api/lapor/meja* wajib sesi staf (KEPUTUSAN Q12, DESAIN-TEKNIS).
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import {execFile} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
import {putaran, lengkap, nilaiTampil, waktuLapor, T, KELOMPOK} from "../../src/lapor_mesin.js";
import {berlakuSesi, JENIS} from "../../src/lapor_spek.js";
import {buatModel} from "../../src/lapor_model.js";
import {buatWilayah} from "../../src/lapor_wilayah.js";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUBLIK = path.join(AKAR, "public");
const PORT = Number(process.env.LAPOR_PORT || 8810);
const DIR = path.join(os.homedir(), ".lapor-lokal"), BERKAS = path.join(DIR, "data.json"), FOTO = path.join(DIR, "foto"), DOK = path.join(DIR, "dok");

function kunciApi() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const m = fs.readFileSync(path.join(AKAR, "scripts/wa/.env"), "utf8").match(/^ANTHROPIC_API_KEY=(.+)$/m);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  } catch { return null; }
}
const model = process.argv.includes("--tanpa-ai") ? null
  : buatModel({kunci: kunciApi(), model: process.env.LAPOR_MODEL || undefined, catat: u => console.log(`model ${u.model} masuk ${u.masuk} keluar ${u.keluar} cache ${u.cache ?? 0} ${u.henti}`)});
const wilayah = buatWilayah(async p => JSON.parse(await fs.promises.readFile(path.join(PUBLIK, p), "utf8")));

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
const PINDAH = {baru: ["dilihat"], dilihat: ["ditelaah", "tidak_valid"], ditelaah: ["diteruskan", "ditindaklanjuti", "tidak_valid"], diteruskan: ["ditindaklanjuti"],
  ditindaklanjuti: ["selesai"], selesai: ["ditelaah"], tidak_valid: ["ditelaah"]}; // ALGORITMA A8 + "dilihat" otomatis saat petugas membuka

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
  kelompok.push({judul: "Foto", baris: (s.foto || []).length ? s.foto.map((f, n) => [`Foto ${n + 1}`, `${f.lencanaTeks}${f.lat != null ? `, ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}` : ""}${f.waktuAmbil ? `, diambil ${waktuLapor(f.waktuAmbil, prov)}` : ""}`]) : [["Foto", "Tidak ada"]]});
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
  const foto = (s.foto || []).map(f => ({berkas: path.join(FOTO, `${f.id}.jpg`), ket: `${f.lencanaTeks}${f.waktuAmbil ? `, ${waktuLapor(f.waktuAmbil, prov)}` : ""}`}));
  return {narasi, foto, nomor: s.nomor, tingkat_label: s.tingkat === "bpbd" ? "" : "Laporan warga, belum terverifikasi",
    pelapor: {nama: p.nama, peran: PERAN[p.peran], instansi: p.kab ? `BPBD ${p.kab}${p.jabatan ? `, ${p.jabatan}` : ""}` : null, wa_samar: waSamar(s.wa)},
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
const KUOTA_JAM = 60, KUOTA_MENIT = 20, kuota = {}; // ponytail: hitungan di memori proses; Worker memakai tabel laju D1
async function pesan(body) {
  const wa = nomorWa(body.wa);
  if (!wa) return [400, {galat: "Nomor WhatsApp tidak sah."}];
  const d = baca(), kini = Date.now();
  // kuota pesan per nomor (pemilik 19 Nov 2026: "kuota chat pelaporan dalam 1 jam biar ga di-abuse"): 60 per jam, 20 per menit; laporan yang sedang diisi tetap tersimpan
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
  const teks = body.teks ? String(body.teks).slice(0, 2000) : "";

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
    lokasi = {lat: c.lat, lon: c.lon, sumber: "cari", wilayah: c.wilayah};
  }
  const h = await putaran({sesi: sesiAktif, pelapor: d.pelapor[wa] || null, model, wilayah,
    pesan: {wa, teks, lokasi, form: body.form || null, pilih: Array.isArray(body.pilih) ? body.pilih.slice(0, 20) : null, foto: body.foto || null, lain: typeof body.lain === "string" ? body.lain.slice(0, 120) : null, kembali: body.kembali === true, saluran: "web"}, kini}); // rute ini hanya dipakai layar web
  h.sesi.id ||= `${kini.toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  h.sesi.wa = wa;
  let tambahan = {};
  if (h.kirim) { // nomor tiket, token lacak, PDF dan Word (ALGORITMA A6, A8)
    const tgl = tglWib(kini), n = (d.urut[tgl] || 0) + 1;
    d.urut[tgl] = n;
    h.sesi.nomor = `LA-${tgl.slice(8, 10)}${tgl.slice(5, 7)}${tgl.slice(2, 4)}-${String(n).padStart(2, "0")}`;
    h.sesi.token = crypto.randomBytes(16).toString("hex");
    h.sesi.tiket = {status: "baru", riwayat: [{ke: "baru", pelaku: "Sistem", catatan: null, waktu: kini}]};
    h.sesi.versi = [{versi: 1, isi: structuredClone(h.sesi.isian), waktu: kini}];
    h.inti = T.terkirim(h.pelapor.nama, h.sesi.nomor);
    const q = `?t=${h.sesi.token}`;
    tambahan = {nomor: h.sesi.nomor, lacak: `/lapor/lacak.html${q}`, foto: h.sesi.foto?.[0] ? `/api/lapor/foto/${h.sesi.foto[0].id}${q}` : null, unduhan: [ // foto pertama untuk kartu Laporan saya
      {label: "Lacak laporan", url: `/lapor/lacak.html${q}`, lacak: true},
      {label: "Unduh PDF", url: `/api/lapor/unduh/${h.sesi.nomor}.pdf${q}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${h.sesi.nomor}.docx${q}`}]};
    buatDokumen(h.sesi, h.pelapor);
  }
  d.sesi[h.sesi.id] = h.sesi; d.aktif[wa] = h.sesi.id;
  if (h.pelapor) d.pelapor[wa] = h.pelapor;
  simpan(d);
  return [200, {...keluaran(h, h.sesi), ...tambahan, pelapor: h.pelapor ? {nama: h.pelapor.nama, peran: h.pelapor.peran} : null}];
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
  if (gpsSah && x?.lat != null && km(g.lat, g.lon, x.lat, x.lon) > 5) return [400, {galat: "Lokasi di foto lebih dari 5 km dari posisi Anda sekarang. Kirim foto yang diambil di lokasi ini."}];
  const meta = gpsSah ? {lencana: "gps", lencanaTeks: "Lokasi GPS perangkat", lat: g.lat, lon: g.lon, akurasi: g.akurasi}
    : x?.lat != null ? {lencana: "exif", lencanaTeks: "Lokasi dari data foto", lat: x.lat, lon: x.lon} : {lencana: "tanpa", lencanaTeks: "Tanpa lokasi"};
  const sAkt = sesiMentah(wa), MAKS = 10; // standar foto publik: paling banyak 10 foto per laporan
  if ((sAkt?.foto || []).length >= MAKS) return [400, {galat: `Paling banyak ${MAKS} foto per laporan.`}];
  const id = crypto.randomBytes(8).toString("hex");
  fs.mkdirSync(FOTO, {recursive: true, mode: 0o700});
  fs.writeFileSync(path.join(FOTO, `${id}.jpg`), buf, {mode: 0o600}); // sudah digambar ulang di kanvas peramban: metadata asli tidak ikut
  // waktu ambil: EXIF, lalu waktu GPS perangkat, lalu waktu unggah; sumbernya ikut ditampilkan (pola /instansi dan /lacak)
  const waktuAmbil = x?.waktu || kini, sumberWaktu = x?.waktu ? "waktu EXIF foto" : gpsSah ? "waktu GPS perangkat" : "waktu unggah";
  const [kode, isi] = await pesan({wa, foto: {id, ...meta, waktuAmbil, sumberWaktu, waktuTerima: kini}});
  const prov = sesiMentah(wa)?.isian?.lokasi?.nilai?.wilayah?.provKode;
  return [kode, {...isi, fotoBaru: {id, lencana: meta.lencana, lencanaTeks: meta.lencanaTeks, lat: meta.lat ?? null, lon: meta.lon ?? null, akurasi: meta.akurasi ?? null,
    waktuTeks: waktuLapor(waktuAmbil, prov), sumberWaktu, ke: (sAkt?.foto || []).length + 1, maks: MAKS}}];
}

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
    waktuLapor: waktuLapor(s.terkirim, prov), pelapor: (p.nama || "").split(" ")[0], foto: (s.foto || []).length, fotoPertama: s.foto?.[0] ? `/api/lapor/foto/${s.foto[0].id}?t=${s.token}` : null,
    tahap: s.tiket.status === "tidak_valid" ? [...URUTAN.filter(k => sudah.has(k)), "tidak_valid"].map(k => ({kunci: k, label: STATUS[k], selesai: true, waktu: waktuLapor(sudah.get(k)?.waktu, prov), catatan: sudah.get(k)?.catatan || null}))
      : URUTAN.filter(k => k !== "diteruskan" || sudah.has(k)).map(k => ({kunci: k, label: STATUS[k], selesai: sudah.has(k), waktu: sudah.has(k) ? waktuLapor(sudah.get(k).waktu, prov) : null, catatan: sudah.get(k)?.catatan || null})),
    balasan: (s.balasan || []).map(b => ({teks: b.teks, waktu: waktuLapor(b.waktu, prov)})),
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
  if (!fs.existsSync(f)) { res.writeHead(202, {"content-type": "text/plain; charset=utf-8"}); return res.end("Dokumen sedang dibuat. Coba lagi beberapa detik lagi."); }
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
    c = {semua: rapikan(lokal), lengkap: false};
    cacheSekitar.set(kunci, c);
    const ql = `[out:json][timeout:8];(nwr(around:3000,${lat},${lon})["amenity"~"place_of_worship|school|community_centre|townhall|shelter|clinic|hospital|doctors"]["name"];way(around:1500,${lat},${lon})["highway"~"primary|secondary|tertiary|residential|unclassified"]["name"];);out center 160;`;
    c.overpass = fetch("https://overpass-api.de/api/interpreter", {method: "POST", body: new URLSearchParams({data: ql}), headers: {"user-agent": "lapor-bencana-lokal/0.1"}, signal: AbortSignal.timeout(10000)})
      .then(r => r.json()).then(J => { const JT = {place_of_worship: "Rumah ibadah", school: "Sekolah", community_centre: "Balai warga", townhall: "Kantor atau balai", shelter: "Shelter", clinic: "Klinik", hospital: "Rumah sakit", doctors: "Klinik"}, tambah = [];
        for (const e of J.elements || []) { const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon; if (la == null || !e.tags?.name) continue; tambah.push({nama: e.tags.name, jenis: e.tags.highway ? "Jalan" : JT[e.tags.amenity] || "Tempat", jarakKm: km(lat, lon, la, lo)}); }
        c.semua = rapikan([...c.semua, ...tambah]); c.lengkap = true; })
      .catch(e => { console.error("overpass gagal", e.message); cacheSekitar.delete(kunci); }); // gagal: dicoba lagi pada permintaan berikutnya
  }
  if (!c.lengkap) await Promise.race([c.overpass, new Promise(r => setTimeout(r, 2500))]);
  // satu pemilih untuk titik pengungsian dan nama fasilitas rusak (pemilik 19 Nov 2026: "SD rusak kasih pilihan langsung", juga faskes, ibadah, jalan)
  const SARING = {pengungsian: /^(Sekolah|Kantor atau balai|Balai warga|Rumah ibadah|Titik kumpul|Shelter)$/, sekolah: /^Sekolah$/, faskes: /^(Puskesmas|Rumah sakit|Klinik)$/,
    ibadah: /^Rumah ibadah$/, jalan: /^(Jalan|Jembatan)$/};
  const semua = c.semua.filter(x => (SARING[q.jenis] || SARING.pengungsian).test(x.jenis));
  // cari per kata pada nama dan jenis, dengan sebutan sehari-hari ("balai desa" = kantor desa, "sd" = sekolah dasar); tidak ada yang cocok = tampilkan yang terdekat
  const SEBUT = {"Kantor atau balai": "balai desa kantor kelurahan aula", "Balai warga": "balai warga aula gedung serbaguna", "Rumah ibadah": "masjid musala mushola surau gereja pura vihara klenteng",
    "Sekolah": "sekolah sd smp sma smk madrasah", "Titik kumpul": "titik kumpul lapangan evakuasi", "Puskesmas": "puskesmas faskes", "Rumah sakit": "rs rsud rumah sakit faskes", "Klinik": "klinik faskes", "Jalan": "jalan jl", "Jembatan": "jembatan", "Shelter": "shelter tempat evakuasi"};
  const kata = String(q.q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const cocok = kata.length ? semua.filter(x => { const h = `${x.nama} ${x.jenis} ${SEBUT[x.jenis] || ""}`.toLowerCase(); return kata.every(k => h.includes(k)); }) : semua;
  return [200, {...(cocok.length ? {tempat: cocok.slice(0, 24)} : {tempat: semua.slice(0, 12), terdekat: true}), sebagian: !c.lengkap}];
}

/* ---------- nomor penting di sekitar lokasi terverifikasi (pemilik 19 Nov 2026: damkar, BPBD daerah, rumah sakit terdekat, kepolisian) ----------
   BPBD: public/data/bpbd.json (peta BPBD BNPB; nomor Pusdalops bila tercatat). Fasilitas: public/data/osm_nasional/<prov>.json (OSM: rs, puskesmas,
   klinik, polisi; berkoordinat, tanpa nomor telepon, jadi diberi tautan arah). Nomor darurat nasional: 112 terpadu, 110 polisi, 113 pemadam kebakaran,
   115 Basarnas, 117 BNPB, 119 ambulans. Lokasi wajib dari GPS atau desa terpilih. */
const NOMOR_NASIONAL = [["112", "Darurat terpadu"], ["113", "Pemadam kebakaran"], ["119", "Ambulans dan gawat darurat"], ["110", "Polisi"], ["115", "SAR (Basarnas)"], ["117", "BNPB"]];
const normKab = t => String(t || "").toLowerCase().replace(/kota administrasi|kabupaten|kab\.|kota|adm\./g, "").replace(/[^a-z]/g, "");
async function penting(q) {
  let lat = Number(q.lat), lon = Number(q.lon), w = null;
  const semuaKantor = JSON.parse(fs.readFileSync(path.join(PUBLIK, "data/bpbd.json"), "utf8")).kantor;
  if (q.kode && /^\d{2}\.\d{2}(\.\d{2})?$/.test(q.kode)) { // daerah tingkat kab/kec (mis. "Daerah terakhir" dari Info): titik acuan = kantor BPBD kab itu
    const d = (await wilayah.cariNama("", q.kode))[0]; w = d ? {...d, desa: null} : null;
    const k = w && semuaKantor.find(x => x.prov === w.provKode && normKab(x.kab) === normKab(w.kab));
    if (k) ({lat, lon} = k); else if (d) { const c = await wilayah.pusat(d.kode); if (c) ({lat, lon} = c); } // kantor BPBD kab belum terdata: pakai titik desa pertama di kab itu
  } else if (q.kode) { const c = await wilayah.pusat(String(q.kode)); if (c) ({lat, lon, wilayah: w} = c); }
  else if (Number.isFinite(lat)) w = await wilayah(lat, lon);
  if (!w || !Number.isFinite(lat)) return [400, {galat: "Lokasi belum terbaca. Pakai lokasi saat ini atau cari desa Anda."}];
  const kantor = semuaKantor.filter(x => x.prov === w.provKode);
  const nomor = t => /\d{3}/.test(t || "") ? String(t).replace(/[^\d+ -]/g, "").trim() : null;
  const bpbdKab = kantor.find(x => normKab(x.kab) === normKab(w.kab)) || kantor.filter(x => !/provinsi/i.test(x.nama)).sort((a, b) => km(lat, lon, a.lat, a.lon) - km(lat, lon, b.lat, b.lon))[0];
  const bpbdProv = kantor.find(x => /provinsi/i.test(x.nama));
  const bp = x => x && {nama: /provinsi/i.test(x.nama) ? `BPBD Provinsi ${PROV_NAMA(w)}` : `BPBD ${x.kab}`, alamat: x.alamat || null, nomor: nomor(x.pusdalops), jarakKm: Math.round(km(lat, lon, x.lat, x.lon) * 10) / 10, lat: x.lat, lon: x.lon};
  let osm = {};
  try { osm = JSON.parse(fs.readFileSync(path.join(PUBLIK, `data/osm_nasional/${w.provKode}.json`), "utf8")); } catch {}
  // OSM kadang menandai puskesmas sebagai rumah sakit: pindahkan menurut namanya
  const pkm = /^(puskesmas|pustu|poskesdes|polindes)\b/i;
  const pilah = jenis => jenis === "rs" ? (osm.rs || []).filter(x => !pkm.test(x[2] || "")) : jenis === "puskesmas" ? [...(osm.puskesmas || []), ...(osm.rs || []).filter(x => pkm.test(x[2] || ""))] : osm[jenis] || [];
  const dekat = (jenis, n) => pilah(jenis).map(([la, lo, nama]) => ({nama, lat: la, lon: lo, jarakKm: Math.round(km(lat, lon, la, lo) * 10) / 10})).sort((a, b) => a.jarakKm - b.jarakKm).slice(0, n);
  return [200, {wilayah: w, nasional: NOMOR_NASIONAL.map(([n, l]) => ({nomor: n, label: l})), bpbd: [bp(bpbdKab), bp(bpbdProv)].filter(Boolean),
    rs: dekat("rs", 3), puskesmas: dekat("puskesmas", 2), polisi: dekat("polisi", 2)}];
}
const PROV_NAMA = w => w.prov;

/* ---------- Alun-alun warga (K30, Q14 dijawab 19 Nov 2026) ----------
   Hanya laporan berstatus ditindaklanjuti atau selesai. Tanpa nama, nomor WA, foto, kronologi bebas, dan nomor tiket (tiket = kunci lacak).
   Isi: jenis, karakteristik, waktu kejadian, desa sampai provinsi, angka dampak, status. */
const TAMPIL_ALUN = new Set(["ditindaklanjuti", "selesai"]);
function alun(q) {
  const d = baca(), angka = (s, n) => { const x = s.isian[n]; return x && !x.belum && !x.nihil ? x.nilai : 0; };
  const baris = Object.values(d.sesi).filter(s => s.nomor && TAMPIL_ALUN.has(s.tiket?.status))
    .filter(s => !q.prov || s.isian.lokasi?.nilai?.wilayah?.provKode === q.prov).filter(s => !q.jenis || s.isian.jenis?.nilai === q.jenis)
    .sort((a, b) => (b.isian.waktu?.ms || b.terkirim) - (a.isian.waktu?.ms || a.terkirim)).slice(0, 100)
    .map(s => { const w = s.isian.lokasi?.nilai?.wilayah || {};
      return {id: crypto.createHash("sha256").update(s.id).digest("hex").slice(0, 10), jenisId: s.isian.jenis?.nilai || null, jenis: JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || "Kejadian",
        subjenis: s.isian.subjenis?.nilai !== "Belum diketahui" ? s.isian.subjenis?.nilai || null : null, waktu: s.isian.waktu?.nilai || null,
        lokasi: {desa: w.desa || null, kec: w.kec || null, kab: w.kab || null, prov: w.prov || null, provKode: w.provKode || null},
        dampak: {meninggal: angka(s, "meninggal"), hilang: angka(s, "hilang"), luka: angka(s, "luka"), mengungsi: angka(s, "mengungsi_jiwa"),
          rumah: ["rumah_berat", "rumah_sedang", "rumah_ringan"].reduce((t, n) => t + angka(s, n), 0), terendam: angka(s, "rumah_terendam")},
        status: s.tiket.status, statusLabel: STATUS[s.tiket.status], tingkat: s.tingkat === "bpbd" ? "Petugas BPBD" : "Warga"}; });
  return [200, {baris, jumlah: baris.length}];
}

/* ---------- monitoring petugas (K7, D20, D22) ---------- */
// angka dampak ringkas untuk peta dan kepala rincian; null = belum didata (kosong tidak pernah jadi nol)
const dampakRingkas = s => { const a = n => { const x = s.isian[n]; return !x || x.belum ? null : x.nihil ? 0 : Number(x.nilai) || 0; };
  const rumah = ["rumah_berat", "rumah_sedang", "rumah_ringan"].map(a), adaRumah = rumah.some(v => v != null);
  return {meninggal: a("meninggal"), hilang: a("hilang"), luka: a("luka"), mengungsi: a("mengungsi_jiwa"), rumah: adaRumah ? rumah.reduce((t, v) => t + (v || 0), 0) : null}; };
function meja() {
  const d = baca();
  return [200, {baris: Object.values(d.sesi).filter(s => s.nomor).sort((a, b) => b.terkirim - a.terkirim).map(s => {
    const p = d.pelapor[s.wa] || {}, w = s.isian.lokasi?.nilai;
    return {nomor: s.nomor, status: s.tiket.status, statusLabel: STATUS[s.tiket.status], waktuLapor: waktuLapor(s.terkirim, w?.wilayah?.provKode), terkirim: s.terkirim,
      waktuKejadian: s.isian.waktu?.nilai || null, wa: s.wa, nama: p.nama || null, peran: PERAN[p.peran] || null, instansi: p.kab ? `BPBD ${p.kab}` : null,
      jenis: JENIS.find(j => j.id === s.isian.jenis?.nilai)?.label || null, jenisId: s.isian.jenis?.nilai || null, subjenis: s.isian.subjenis?.nilai || null,
      lat: w?.lat ?? null, lon: w?.lon ?? null, wilayah: w?.wilayah || null, lengkap: lengkap(s), foto: (s.foto || []).length, balasan: (s.balasan || []).length, dampak: dampakRingkas(s)};
  })}];
}
function mejaRinci(nomor, lihat = false) {
  const d = baca(), s = Object.values(d.sesi).find(x => x.nomor === nomor);
  if (!s) return [404, {galat: "Laporan tidak ditemukan."}];
  if (lihat && s.tiket.status === "baru") { // petugas membuka laporan = "Sudah dilihat petugas"
    s.tiket.riwayat.push({dari: "baru", ke: "dilihat", pelaku: "Admin BNPB", catatan: null, waktu: Date.now()}); s.tiket.status = "dilihat"; simpan(d);
  }
  const p = d.pelapor[s.wa] || {}, prov = s.isian.lokasi?.nilai?.wilayah?.provKode;
  return [200, {nomor, token: s.token, status: s.tiket.status, pindah: PINDAH[s.tiket.status], statusLabel: STATUS,
    pelapor: {nama: p.nama, wa: s.wa, peran: PERAN[p.peran], kab: p.kab || null, jabatan: p.jabatan || null},
    waktuLapor: waktuLapor(s.terkirim, prov), waktuKejadian: s.isian.waktu?.nilai || null, isian: isianTampil(s), lengkap: lengkap(s), dampak: dampakRingkas(s), jenisId: s.isian.jenis?.nilai || null, wilayah: s.isian.lokasi?.nilai?.wilayah || null,
    lat: s.isian.lokasi?.nilai?.lat ?? null, lon: s.isian.lokasi?.nilai?.lon ?? null,
    foto: (s.foto || []).map(f => ({url: `/api/lapor/foto/${f.id}?t=${s.token}`, lencana: f.lencanaTeks, waktu: f.waktuAmbil ? waktuLapor(f.waktuAmbil, prov) : null})),
    riwayat: s.tiket.riwayat.map(r => ({...r, label: STATUS[r.ke], waktu: waktuLapor(r.waktu, prov)})), balasan: (s.balasan || []).map(b => ({...b, waktu: waktuLapor(b.waktu, prov)})),
    unduhan: [{label: "PDF", url: `/api/lapor/unduh/${nomor}.pdf?t=${s.token}`}, {label: "Word", url: `/api/lapor/unduh/${nomor}.docx?t=${s.token}`}],
    transkrip: s.transkrip.map(t => ({dari: t.dari, teks: t.teks || (t.lokasi ? "Lokasi dibagikan" : ""), waktu: waktuLapor(t.waktu, prov)}))}];
}
function mejaUbah(nomor, aksi, body) {
  const d = baca(), s = Object.values(d.sesi).find(x => x.nomor === nomor), kini = Date.now();
  if (!s) return [404, {galat: "Laporan tidak ditemukan."}];
  const catatan = String(body.catatan || body.teks || "").replace(/\s+/g, " ").trim().slice(0, 1000);
  if (aksi === "balas") {
    if (catatan.length < 2) return [400, {galat: "Balasan kosong."}];
    (s.balasan ||= []).push({teks: catatan, waktu: kini, oleh: "Admin BNPB"});
    (d.kotak[s.wa] ||= []).push({nomor, teks: catatan, waktu: kini});
    if (s.tiket.status === "baru" || s.tiket.status === "dilihat") { s.tiket.riwayat.push({dari: s.tiket.status, ke: "ditelaah", pelaku: "Admin BNPB", catatan: null, waktu: kini}); s.tiket.status = "ditelaah"; }
  } else if (aksi === "status") {
    if (!PINDAH[s.tiket.status]?.includes(body.ke)) return [409, {galat: "Perpindahan status tidak sah."}];
    if (["selesai", "tidak_valid"].includes(s.tiket.status) && !catatan) return [400, {galat: "Membuka kembali wajib dengan catatan."}];
    s.tiket.riwayat.push({dari: s.tiket.status, ke: body.ke, catatan: catatan || null, pelaku: "Admin BNPB", waktu: kini}); // append-only
    s.tiket.status = body.ke;
    (d.kotak[s.wa] ||= []).push({nomor, teks: `Status laporan ${nomor}: ${STATUS[body.ke]}.${catatan ? ` ${catatan}` : ""}`, waktu: kini, status: true});
  } else return [404, {galat: "aksi"}];
  simpan(d);
  return mejaRinci(nomor);
}

/* ---------- penangan /api/lapor/* (dipakai server tinjau 8800 dan mode mandiri). true = sudah dijawab ---------- */
async function badan(req) { let raw = ""; for await (const c of req) { raw += c; if (raw.length > 4 * 1048576) throw Object.assign(new Error("besar"), {kode: 413}); } return JSON.parse(raw || "{}"); }
export async function tanganiLapor(req, res, url) {
  const kirim = ([kode, isi]) => { res.writeHead(kode, {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}); res.end(JSON.stringify(isi)); return true; };
  const j = url.pathname;
  if (!j.startsWith("/api/lapor/")) return false;
  try {
    if (req.method === "POST" && j === "/api/lapor/pesan") return kirim(await pesan(await badan(req)));
    if (req.method === "POST" && j === "/api/lapor/foto") return kirim(await foto(await badan(req)));
    if (j === "/api/lapor/sesi") return kirim(sesiAktif(url.searchParams.get("wa")));
    if (j === "/api/lapor/cari") return kirim([200, {hasil: await wilayah.cariNama(url.searchParams.get("q"), /^\d{2}\.\d{2}(\.\d{2})?$/.test(url.searchParams.get("dalam") || "") ? url.searchParams.get("dalam") : "")}]);
    if (j === "/api/lapor/lacak") return kirim(lacak(url.searchParams.get("t")));
    if (j === "/api/lapor/kotak") { const d = baca(), sejak = Number(url.searchParams.get("sejak") || 0); return kirim([200, {pesan: (d.kotak[nomorWa(url.searchParams.get("wa"))] || []).filter(k => k.waktu > sejak)}]); }
    if (j.startsWith("/api/lapor/unduh/")) { unduh(res, decodeURIComponent(j.slice(17)), url.searchParams.get("t")); return true; }
    if (j.startsWith("/api/lapor/foto/")) {
      const id = j.slice(16), d = baca(), s = Object.values(d.sesi).find(x => x.token === url.searchParams.get("t") && (x.foto || []).some(f => f.id === id));
      if (!s || !/^[0-9a-f]{16}$/.test(id)) return kirim([404, {galat: "tidak ada"}]);
      res.writeHead(200, {"content-type": "image/jpeg", "cache-control": "private, no-store"}); fs.createReadStream(path.join(FOTO, `${id}.jpg`)).pipe(res); return true;
    }
    if (req.method === "POST" && j === "/api/lapor/nilai") { // nilai percakapan 1-5 (pemilik 19 Nov 2026)
      const b = await badan(req), d = baca(), s = Object.values(d.sesi).find(x => x.nomor === b.nomor && x.wa === nomorWa(b.wa)), n = Number(b.nilai);
      if (!s || !Number.isInteger(n) || n < 1 || n > 5) return kirim([400, {galat: "Nilai tidak sah."}]);
      s.nilai = {nilai: n, waktu: Date.now()}; simpan(d); return kirim([200, {ok: true}]);
    }
    if (j === "/api/lapor/penting") return kirim(await penting(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/sekitar") return kirim(await sekitar(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/daerah") return kirim(await daerah(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/alun") return kirim(alun(Object.fromEntries(url.searchParams)));
    if (j === "/api/lapor/meja") return kirim(meja());
    const m = /^\/api\/lapor\/meja\/(LA-\d{6}-\d{2,3})(?:\/(balas|status))?$/.exec(j);
    if (m && !m[2]) return kirim(mejaRinci(m[1], url.searchParams.get("lihat") === "1"));
    if (m && req.method === "POST") return kirim(mejaUbah(m[1], m[2], await badan(req)));
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (await tanganiLapor(req, res, url)) return;
  if (req.method === "GET") return statis(res, url);
  res.writeHead(405); res.end();
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Lapor Bencana lokal mandiri: http://localhost:${PORT}/lapor/  (model: ${model ? process.env.LAPOR_MODEL || "claude-sonnet-5-5" : "tanpa AI"})`);
  console.log(`Data uji: ${DIR}`);
});
