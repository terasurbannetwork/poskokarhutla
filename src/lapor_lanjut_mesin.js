/* Mesin percakapan WA tahap 2 data lanjutan BPBD (paket data/kajian-bnpb/lapor-lanjutan/, D9, D24, tiket LJ-05). Fungsi murni: tanpa D1, tanpa jam dinding
   (waktu dari pemanggil), tanpa model AI. Semua isian diurai kode: pilihan bernomor, ya atau tidak, angka dari digit, teks apa adanya, HP dan NIK lewat
   validasi spek (D19: isian pribadi tidak pernah ke AI; paling sederhana = tidak ada AI sama sekali). Urutan butir dari spek (src/lapor_lanjut_spek.js),
   wajib bersyarat dievaluasi saat itu. Jenis yang dibuka lewat WA: rumah dan prasarana (sisanya menyusul LJ-06 sampai LJ-08).
   Keadaan = objek JSON kecil yang disimpan pemanggil di lj_sesi; setelah objek tersimpan atau dibatalkan, isian pribadi tidak tersisa di keadaan.
   Uji: tests/lapor/lanjut_mesin.test.mjs */
import {spek, validasi, kurangFoto} from "./lapor_lanjut_spek.js";

export const JENIS_WA = ["rumah", "prasarana"];
export const BASI_MS = 24 * 3600e3;          // draf lebih tua dari ini dibuang oleh pemanggil
export const MAKS_FOTO_DRAF = 10;            // = batas per objek di lj_media
const MAKS_KEADAAN = 5500;                   // CHECK lj_sesi.keadaan <= 6000; sisakan ruang

/* ---------- penyamaran (dipakai juga src/lapor_lanjut.js untuk staf dan akun lembaga) ---------- */
const samarTeks = s => { const t = String(s); return t.length <= 1 ? "*" : t[0] + "*".repeat(Math.min(t.length - 1, 8)); };
export const samarAngka = s => { const t = String(s); return t === "tidak_ada" ? t : "*".repeat(Math.max(t.length - 4, 0)) + t.slice(-4); };
export function samarPribadi(p) {
  if (!p) return null;
  const o = {};
  for (const [k, v] of Object.entries(p)) o[k] = /^(hp|kontak_hp|nik|nik_kk)$/.test(k) ? samarAngka(v) : /^(nama|kk|pemilik|kontak_nama)$/.test(k) ? samarTeks(v) : "(disembunyikan)";
  return o;
}

/* ---------- teks ---------- */
const norm = s => String(s ?? "").toLowerCase().replace(/[_\-]+/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const NAMA_JENIS = {rumah: "rumah", prasarana: "prasarana"};
const MULAI = {
  "data rumah": {jenis: "rumah", isian: {}}, "data prasarana": {jenis: "prasarana", isian: {}},
  "jembatan rusak": {jenis: "prasarana", isian: {jenis: "jembatan"}}, "jalan rusak": {jenis: "prasarana", isian: {jenis: "jalan"}}, "data": {menu: true}};
/* perintah yang membuka mode tahap 2 (dicek pemanggil sebelum daftar izin Lapor) */
export const perintahData = teks => norm(teks) in MULAI;

const LABEL_BUTIR = {kk: "Nama kepala keluarga", pemilik: "Nama pemilik rumah, bila berbeda", nik_kk: "NIK kepala keluarga", desa: "Nama desa atau kelurahan", kec: "Nama kecamatan",
  alamat: "Alamat atau patokan lokasi", tingkat: "Tingkat kerusakan", terendam: "Apakah terendam banjir?", huni: "Keadaan hunian sekarang", jiwa: "Jumlah jiwa dalam rumah ini",
  ket: "Keterangan tambahan", jenis: "Jenis prasarana", nama: "Nama prasarana", fungsi: "Keadaan fungsi sekarang", panjang_m: "Panjang yang rusak, dalam meter",
  kendaraan: "Kendaraan yang masih bisa lewat", alternatif: "Jalur alternatif"};
const LABEL = {rb: "rusak berat", rs: "rusak sedang", rr: "rusak ringan", tidak_rusak: "tidak rusak", dihuni: "masih dihuni", mengungsi: "penghuni mengungsi", rata: "rata dengan tanah",
  tidak_tahu: "belum tahu", putus: "putus total", terbatas: "bisa dilewati terbatas", berfungsi: "masih berfungsi", tidak_ada: "tidak ada", motor: "sepeda motor", spbu: "SPBU",
  telekom: "telekomunikasi", sinyal: "sinyal telepon"};
const label = v => LABEL[v] ?? String(v).replace(/_/g, " ");
const labelButir = n => LABEL_BUTIR[n] ?? n.replace(/_/g, " ");

/* ---------- butir ---------- */
const BUTIR = jenis => spek(jenis).isian;
const perlu = (b, isian) => typeof b[2] === "function" ? !!b[2](isian) : !!b[2];
const kosong = (k, n) => k.isian[n] == null;

function berikut(k) {   // butir wajib dulu; opsional hanya bila bukan sedang mengubah satu butir (balik)
  const bs = BUTIR(k.jenis), w = bs.find(b => perlu(b, k.isian) && kosong(k, b[0]));
  if (w) return {nama: w[0], opsi: false};
  if (k.balik) return null;
  const o = bs.find(b => !perlu(b, k.isian) && kosong(k, b[0]) && !k.lewat.includes(b[0]));
  return o ? {nama: o[0], opsi: true} : null;
}
const fotoKurang = k => kurangFoto(k.jenis, {}, k.foto.map(() => ({jenis: "foto"}))).foto;
function maju(k) {   // pindah ke langkah berikutnya, ubah k di tempat
  const n = berikut(k);
  if (n) { k.tahap = "isi"; k.butir = n.nama; k.opsi = n.opsi; return; }
  const dariUbah = k.balik; k.balik = false; delete k.butir; delete k.opsi;
  k.tahap = !dariUbah && !k.fotoLewat && fotoKurang(k) > 0 ? "foto" : "ringkas";
}

function tanya(k) {
  const b = BUTIR(k.jenis).find(x => x[0] === k.butir), j = b[1];
  let t = `*${labelButir(b[0])}*`;
  if (j.t === "pilih") t += "\n" + j.v.map((v, i) => `${i + 1}. ${label(v)}`).join("\n") + "\nBalas dengan nomor.";
  else if (j.t === "ya_tidak") t += "\n1. Ya\n2. Tidak\nBalas dengan nomor.";
  else if (j.t === "angka") t += j.desimal ? "\nTulis angkanya. Boleh memakai koma." : "\nTulis angkanya saja.";
  else if (j.t === "nik") t += "\nTulis 16 angka.";
  else if (j.t === "hp") t += "\nTulis nomor HP, atau ketik *tidak ada*.";
  else if (j.t === "teks") t += `\nTulis jawaban singkat, paling banyak ${j.maks} huruf.`;
  else if (j.t === "tanggal") t += "\nTulis tanggal, misalnya 2026-11-21.";
  if (b[3]) t += "\nData pribadi, hanya dilihat tim data ini.";
  if (k.opsi) t += "\nBoleh dilewati: ketik *lewati*, atau *lewati semua*.";
  return t;
}

/* satu jawaban -> nilai mentah menurut jenis butir, atau undefined; pengesahan akhir oleh validasi spek */
function urai(j, teks) {
  const t = teks.trim(), n = norm(t);
  if (!t) return undefined;
  if (j.t === "pilih") return /^\d{1,2}$/.test(t) ? j.v[Number(t) - 1] : j.v.find(v => norm(v) === n || norm(label(v)) === n);
  if (j.t === "ya_tidak") return ["1", "ya", "iya", "y"].includes(n) ? true : ["2", "tidak", "bukan", "t"].includes(n) ? false : undefined;
  if (j.t === "angka") { const m = t.match(/\d+(?:[.,]\d+)?/g); return m?.length === 1 ? m[0] : undefined; }
  if (j.t === "hp") return n === "tidak ada" ? "tidak_ada" : t;
  return t;   // teks, nik, tanggal
}
function simpanJawaban(k, teks) {
  const b = BUTIR(k.jenis).find(x => x[0] === k.butir), nilai = urai(b[1], teks);
  const v = nilai === undefined ? {galat: [k.butir], data: {}, pribadi: {}} : validasi(k.jenis, {[k.butir]: nilai});
  if (v.galat.includes(k.butir)) return false;
  k.isian[k.butir] = v.data[k.butir] ?? v.pribadi[k.butir];
  return true;
}

/* ---------- ringkasan ---------- */
function tampilNilai(nama, j, v) {
  if (/^(hp|kontak_hp|nik|nik_kk)$/.test(nama)) return v === "tidak_ada" ? "tidak ada" : samarAngka(v);   // HP dan NIK tidak pernah utuh di balasan
  if (j.t === "pilih") return label(v);
  if (j.t === "ya_tidak") return v ? "ya" : "tidak";
  return String(v);
}
function ringkasan(k) {
  const baris = BUTIR(k.jenis).filter(b => k.isian[b[0]] != null).map(b => `${labelButir(b[0])}: ${tampilNilai(b[0], b[1], k.isian[b[0]])}`);
  const kf = fotoKurang(k);
  baris.push(`Foto: ${k.foto.length}${kf ? `, kurang ${kf}` : ""}`, `Titik lokasi: ${k.lat != null ? "sudah dibagikan" : "belum ada"}`);
  return `*Ringkasan ${NAMA_JENIS[k.jenis]}*\n${baris.join("\n")}\n\nKetik *simpan* untuk menyimpan, *ubah* diikuti nama butir untuk mengubah (misalnya ubah alamat), atau *batal*.`;
}
const sapa = k => k.tahap === "isi" ? tanya(k)
  : k.tahap === "foto" ? `Kirim foto ${NAMA_JENIS[k.jenis]}, kurang ${fotoKurang(k)}. Foto diambil langsung dengan kamera. Bagikan lokasi lewat WhatsApp bila bisa. Belum bisa? Ketik *lewati*.`
  : ringkasan(k);

const BANTUAN = "*Data lanjutan*\nKetik *data rumah* atau *data prasarana*. Untuk jembatan atau jalan yang rusak, ketik *jembatan rusak* atau *jalan rusak*.";
const BARU = (m, bawaan, kini) => ({v: 1, jenis: m.jenis, awal: m.isian, isian: {...m.isian, ...bawaan}, bawaan, lewat: [], foto: [], lat: null, lon: null, mulai: kini, tahap: "isi"});
function mulai(m, bawaan, kini) {
  if (m.menu) return {keadaan: null, balasan: BANTUAN, selesai: true};
  const k = BARU(m, bawaan, kini); maju(k);
  return {keadaan: k, balasan: `*Data ${NAMA_JENIS[k.jenis]}*\nKetik *batal* kapan saja untuk membuang isian ini.\n\n${sapa(k)}`};
}
export const balasanTersimpan = (jenis, urut) => `*Tersimpan*\n${NAMA_JENIS[jenis]} nomor ${urut} sudah masuk ke berkas.\nKetik *lagi* untuk mengisi ${NAMA_JENIS[jenis]} berikutnya di desa yang sama, atau *selesai*.`;
export const kunciFotoDraf = (berkas, id) => `lapor/data/${berkas}/draf/${id}.jpg`;
export const titikWa = L => L && typeof L === "object" && Number.isFinite(L.lat) && Number.isFinite(L.lon) && L.lat >= -11.5 && L.lat <= 6.5 && L.lon >= 94.5 && L.lon <= 141.5 ? {lat: L.lat, lon: L.lon} : null;

/* ---------- putaran ---------- */
/* keadaan: objek dari lj_sesi, atau null. pesan: {teks, lokasi?: {lat, lon}}. Keluaran: {keadaan (null = keluar), balasan, simpan?, selesai?}.
   simpan = {jenis, isian (umum dan pribadi campur), lat, lon, foto: [{i, la, lo}], klien}: pemanggil menyimpan lalu memakai keadaan keluaran (tanpa isian) hanya bila berhasil. */
export function putaranData({keadaan, pesan = {}, kini}) {
  const r = putar(keadaan ? structuredClone(keadaan) : null, pesan, kini);
  if (r.keadaan && JSON.stringify(r.keadaan).length > MAKS_KEADAAN) return {keadaan, balasan: "Isian terlalu panjang untuk disimpan. Persingkat jawaban Anda.\n\n" + sapa(keadaan)};
  return r;
}
function putar(k, pesan, kini) {
  const teks = typeof pesan.teks === "string" ? pesan.teks.trim().slice(0, 2000) : "", n = norm(teks), titik = titikWa(pesan.lokasi);
  if (!k) return MULAI[n] ? mulai(MULAI[n], {}, kini) : {keadaan: null, balasan: BANTUAN, selesai: true};
  if (n === "batal" || (n === "selesai" && k.tahap === "sesudah")) return {keadaan: null, balasan: n === "batal" ? "Isian dibuang. Ketik *data rumah* atau *data prasarana* bila ingin mengisi lagi." : "Terima kasih. Data yang sudah disimpan ada di berkas Anda. Ketik *data rumah* atau *data prasarana* bila ingin mengisi lagi.", selesai: true};
  if (k.tahap === "sesudah") {
    if (n === "lagi") return mulai({jenis: k.jenis, isian: k.awal}, k.bawaan, kini);
    if (MULAI[n]) return mulai(MULAI[n], k.bawaan, kini);
    return {keadaan: k, balasan: "Ketik *lagi* untuk mengisi satu lagi, *data rumah* atau *data prasarana* untuk jenis lain, atau *selesai*."};
  }
  if (n === "selesai") return {keadaan: k, balasan: "Masih ada isian yang belum disimpan. Ketik *simpan* untuk menyimpannya, atau *batal* untuk membuangnya.\n\n" + sapa(k)};
  let awalan = "";
  if (titik) { k.lat = titik.lat; k.lon = titik.lon; awalan = "Titik lokasi diterima.\n\n"; if (!teks) return {keadaan: k, balasan: awalan + sapa(k)}; }
  const kembali = balasan => ({keadaan: k, balasan: awalan + balasan});
  if (k.tahap === "isi") {
    if (n === "lewati semua" && k.opsi) { k.lewat = BUTIR(k.jenis).filter(b => !perlu(b, k.isian) && kosong(k, b[0])).map(b => b[0]); maju(k); return kembali(sapa(k)); }
    if (n === "lewati") { if (!k.opsi) return kembali("Butir ini wajib diisi.\n\n" + tanya(k)); k.lewat.push(k.butir); maju(k); return kembali(sapa(k)); }
    if (!simpanJawaban(k, teks)) return kembali("Jawaban belum sesuai.\n\n" + tanya(k));
    maju(k); return kembali(sapa(k));
  }
  if (k.tahap === "foto") {
    if (n === "lewati") { k.fotoLewat = true; maju(k); return kembali(sapa(k)); }
    return kembali("Menunggu foto.\n\n" + sapa(k));
  }
  // ringkas
  if (n === "simpan") {
    const sesudah = {v: 1, jenis: k.jenis, awal: k.awal, bawaan: {...(k.isian.desa != null && {desa: k.isian.desa}), ...(k.isian.kec != null && {kec: k.isian.kec})}, lewat: [], foto: [], isian: {}, tahap: "sesudah", mulai: kini};
    return {keadaan: sesudah, balasan: "", simpan: {jenis: k.jenis, isian: k.isian, lat: k.lat, lon: k.lon, foto: k.foto, klien: `wa-${k.mulai}`}};
  }
  const u = /^ubah (.+)$/.exec(n);
  if (u) {
    const b = BUTIR(k.jenis).find(x => norm(x[0]) === u[1] || (u[1].length >= 3 && norm(labelButir(x[0])).includes(u[1])));
    if (b) { Object.assign(k, {tahap: "isi", butir: b[0], opsi: !perlu(b, k.isian), balik: true}); return kembali(tanya(k)); }
    return kembali("Butir itu tidak dikenal. Tulis *ubah* diikuti nama butir, misalnya ubah alamat.\n\n" + ringkasan(k));
  }
  return kembali(ringkasan(k));
}

/* satu foto diterima: pemanggil sudah memeriksa JPEG dan menulis ke R2 hanya bila diterima. f = {i: id acak, w?: waktu pesan ms, lat?, lon?} */
export function fotoMasuk(keadaan, f) {
  const k = keadaan ? structuredClone(keadaan) : null;
  if (!k || k.tahap === "sesudah") return {ditolak: true, balasan: "Belum ada isian yang menunggu foto. Ketik *data rumah* atau *data prasarana* dulu."};
  if (k.tahap === "isi") return {ditolak: true, balasan: "Foto diminta sesudah semua isian terjawab. Jawab dulu pertanyaan ini.\n\n" + tanya(k)};
  if (k.foto.length >= MAKS_FOTO_DRAF) return {ditolak: true, balasan: `Paling banyak ${MAKS_FOTO_DRAF} foto per objek. Ketik *simpan* untuk menyimpan.`};
  const lok = titikWa(f);
  k.foto.push({i: f.i, ...(Number.isFinite(f.w) && {w: f.w}), ...(lok && {la: lok.lat, lo: lok.lon})});
  if (lok && k.lat == null) { k.lat = lok.lat; k.lon = lok.lon; }
  const awal = k.tahap; maju(k);
  const awalan = awal === "foto" && k.tahap === "foto" ? `Foto diterima. Kurang ${fotoKurang(k)} lagi.` : "Foto diterima.";
  const hasil = {keadaan: k, balasan: k.tahap === "foto" ? awalan : `${awalan}\n\n${ringkasan(k)}`};
  return JSON.stringify(k).length > MAKS_KEADAAN ? {ditolak: true, balasan: "Isian sudah terlalu panjang untuk menambah foto. Ketik *simpan*."} : hasil;
}
