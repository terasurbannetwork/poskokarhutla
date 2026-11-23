/* Mesin percakapan WA tahap 2 data lanjutan BPBD (paket data/kajian-bnpb/lapor-lanjutan/, D9, D24, tiket LJ-05). Fungsi murni: tanpa D1, tanpa jam dinding
   (waktu dari pemanggil), tanpa model AI. Semua isian diurai kode: pilihan bernomor, ya atau tidak, angka dari digit, teks apa adanya, HP dan NIK lewat
   validasi spek (D19: isian pribadi tidak pernah ke AI; paling sederhana = tidak ada AI sama sekali). Urutan butir dari spek (src/lapor_lanjut_spek.js),
   wajib bersyarat dievaluasi saat itu. Jenis yang dibuka lewat WA: rumah, prasarana, titik pengungsian, dan jiwa pengungsi (LJ-06; sisanya menyusul LJ-07 sampai LJ-08).
   Jiwa memilih titik dan kepala keluarga dari daftar bernomor yang diberikan pemanggil (konteks: titik dan kk dari berkas); foto di alur jiwa = wajah.
   Keadaan = objek JSON kecil yang disimpan pemanggil di lj_sesi; setelah objek tersimpan atau dibatalkan, isian pribadi tidak tersisa di keadaan.
   Uji: tests/lapor/lanjut_mesin.test.mjs */
import {spek, validasi, kurangFoto, DEWASA} from "./lapor_lanjut_spek.js";

export const JENIS_WA = ["rumah", "prasarana", "titik", "jiwa"];
export const BASI_MS = 24 * 3600e3;          // draf lebih tua dari ini dibuang oleh pemanggil
export const MAKS_FOTO_DRAF = 10;            // = batas per objek di lj_media
const MAKS_WAJAH = 2;                        // = batas wajah per jiwa (src/lapor_lanjut.js)
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
const NAMA_JENIS = {rumah: "rumah", prasarana: "prasarana", titik: "tempat pengungsian", jiwa: "pengungsi"};
const MULAI = {
  "data rumah": {jenis: "rumah", isian: {}}, "data prasarana": {jenis: "prasarana", isian: {}},
  "jembatan rusak": {jenis: "prasarana", isian: {jenis: "jembatan"}}, "jalan rusak": {jenis: "prasarana", isian: {jenis: "jalan"}}, "data": {menu: true},
  "data pengungsian": {jenis: "titik", isian: {}}, "tempat pengungsian": {jenis: "titik", isian: {}}, "data pengungsi": {jenis: "jiwa", isian: {}}};
const BAWA = {rumah: ["desa", "kec"], prasarana: ["desa", "kec"], titik: ["desa"], jiwa: ["titik", "desa_asal", "masuk"]};   // bawaan untuk *lagi*
/* konteks dari pemanggil (berkas): {titik: [{id: TP, nama}], kk: [{id, nama, titik}]}. Dipasang di pintu putaranData dan fotoMasuk (keduanya sinkron);
   ponytail: variabel modul, bukan parameter ke tiap fungsi tampil; ganti parameter bila mesin dipakai serentak (tidak: satu putaran sekali jalan) */
let KONTEKS = {titik: [], kk: []};
const kk = titik => KONTEKS.kk.filter(x => x.titik === titik);
/* perintah yang membuka mode tahap 2 (dicek pemanggil sebelum daftar izin Lapor) */
export const perintahData = teks => norm(teks) in MULAI;

/* label per jenis menang atas label umum (nama, desa, jenis berarti lain di tiap jenis) */
const LABEL_JENIS = {
  titik: {nama: "Nama tempat pengungsian", desa: "Nama desa atau kelurahan lokasi", jenis_tempat: "Bentuk pengungsian", tipe_tempat: "Jenis tempat", tgl_buka: "Tanggal tempat ini dibuka",
    keb_air: "Ada kebutuhan air bersih dan sanitasi?", keb_pangan: "Ada kebutuhan pangan?", keb_sandang: "Ada kebutuhan sandang dan nonpangan?", keb_kesehatan: "Ada kebutuhan kesehatan dan psikososial?",
    keb_hunian: "Ada kebutuhan penampungan dan hunian sementara?", keb_pendidikan: "Ada kebutuhan pendidikan darurat?", mck: "Ada MCK?", dapur: "Ada dapur umum?", listrik: "Ada listrik?", kapasitas: "Daya tampung, dalam jiwa"},
  jiwa: {titik: "Tempat pengungsian", nama: "Nama lengkap pengungsi", umur: "Umur, dalam tahun (bayi di bawah 1 tahun tulis 0)", jk: "Jenis kelamin", desa_asal: "Desa atau kelurahan asal", masuk: "Tanggal masuk pengungsian",
    kk: "Kepala keluarga", hp: "Nomor HP kepala keluarga", nik: "NIK", rentan: "Kelompok rentan", kebutuhan: "Kebutuhan khusus", menolak_foto: "Menolak difoto?", keluar: "Tanggal keluar dari pengungsian, bila sudah pulang"}};
const LABEL_BUTIR = {kk: "Nama kepala keluarga", pemilik: "Nama pemilik rumah, bila berbeda", nik_kk: "NIK kepala keluarga", desa: "Nama desa atau kelurahan", kec: "Nama kecamatan",
  alamat: "Alamat atau patokan lokasi", tingkat: "Tingkat kerusakan", terendam: "Apakah terendam banjir?", huni: "Keadaan hunian sekarang", jiwa: "Jumlah jiwa dalam rumah ini",
  ket: "Keterangan tambahan", jenis: "Jenis prasarana", nama: "Nama prasarana", fungsi: "Keadaan fungsi sekarang", panjang_m: "Panjang yang rusak, dalam meter",
  kendaraan: "Kendaraan yang masih bisa lewat", alternatif: "Jalur alternatif"};
const LABEL = {rb: "rusak berat", rs: "rusak sedang", rr: "rusak ringan", tidak_rusak: "tidak rusak", dihuni: "masih dihuni", mengungsi: "penghuni mengungsi", rata: "rata dengan tanah",
  tidak_tahu: "belum tahu", putus: "putus total", terbatas: "bisa dilewati terbatas", berfungsi: "masih berfungsi", tidak_ada: "tidak ada", motor: "sepeda motor", spbu: "SPBU",
  telekom: "telekomunikasi", sinyal: "sinyal telepon", l: "laki-laki", p: "perempuan", terkonsentrasi: "terkonsentrasi (satu lokasi, banyak keluarga)",
  tidak_terkonsentrasi: "tersebar (rumah warga atau kerabat)", hamil_t1: "hamil trimester 1", hamil_t2: "hamil trimester 2", hamil_t3: "hamil trimester 3"};
const label = v => LABEL[v] ?? String(v).replace(/_/g, " ");
const labelButir = (n, jenis) => LABEL_JENIS[jenis]?.[n] ?? LABEL_BUTIR[n] ?? n.replace(/_/g, " ");

/* ---------- butir ---------- */
const BUTIR = jenis => spek(jenis).isian;
const perlu = (b, isian) => typeof b[2] === "function" ? !!b[2](isian) : !!b[2];
const kosong = (k, n) => k.isian[n] == null;

function berikut(k) {   // butir wajib dulu; opsional hanya bila bukan sedang mengubah satu butir (balik)
  const bs = BUTIR(k.jenis), w = bs.find(b => perlu(b, k.isian) && kosong(k, b[0]));
  if (w) return {nama: w[0], opsi: false};
  if (k.balik) return null;
  const o = bs.find(b => !perlu(b, k.isian) && kosong(k, b[0]) && !k.lewat.includes(b[0]) && !(k.jenis === "jiwa" && b[0] === "hp"));   // HP hanya milik kepala keluarga (wajib bila kk = diri)
  return o ? {nama: o[0], opsi: true} : null;
}
const wajahBoleh = isian => Number.isInteger(isian.umur) && isian.umur >= DEWASA && !isian.menolak_foto;   // Q10, Q13: anak tidak difoto, yang menolak tidak dipaksa
const fotoKurang = k => { const f = kurangFoto(k.jenis, k.isian, k.foto.map(() => ({jenis: k.jenis === "jiwa" ? "wajah" : "foto"}))); return f.foto + f.wajah; };
function maju(k) {   // pindah ke langkah berikutnya, ubah k di tempat
  if (k.jenis === "jiwa" && k.foto.length && !wajahBoleh(k.isian)) { k.buang = [...(k.buang || []), ...k.foto.map(f => f.i)]; k.foto = []; }   // umur atau menolak berubah sesudah foto: wajah draf dibuang (pemanggil menghapus k.buang dari R2)
  const n = berikut(k);
  if (n) { k.tahap = "isi"; k.butir = n.nama; k.opsi = n.opsi; return; }
  const dariUbah = k.balik; k.balik = false; delete k.butir; delete k.opsi;
  k.tahap = !dariUbah && !k.fotoLewat && fotoKurang(k) > 0 ? "foto" : "ringkas";
}

function tanya(k) {
  const b = BUTIR(k.jenis).find(x => x[0] === k.butir), j = b[1];
  let t = `*${labelButir(b[0], k.jenis)}*`;
  if (j.t === "tp") t += "\n" + KONTEKS.titik.map((x, i) => `${i + 1}. ${x.nama}`).join("\n") + "\nBalas dengan nomor.";
  else if (k.jenis === "jiwa" && b[0] === "kk") t += "\n1. Orang ini sendiri kepala keluarga\n" + kk(k.isian.titik).map((x, i) => `${i + 2}. keluarga ${x.nama}`).join("\n") + (kk(k.isian.titik).length ? "\n" : "") + "Balas dengan nomor.";
  else if (j.t === "banyak") t += "\n" + j.v.map((v, i) => `${i + 1}. ${label(v)}`).join("\n") + "\nBalas dengan nomor, boleh lebih dari satu (misalnya 1 3), atau ketik *tidak ada*.";
  else if (j.t === "pilih") t += "\n" + j.v.map((v, i) => `${i + 1}. ${label(v)}`).join("\n") + "\nBalas dengan nomor.";
  else if (j.t === "ya_tidak") t += "\n1. Ya\n2. Tidak\nBalas dengan nomor.";
  else if (j.t === "angka") t += j.desimal ? "\nTulis angkanya. Boleh memakai koma." : "\nTulis angkanya saja.";
  else if (j.t === "nik") t += "\nTulis 16 angka.";
  else if (j.t === "hp") t += "\nTulis nomor HP, atau ketik *tidak ada*.";
  else if (j.t === "teks") t += `\nTulis jawaban singkat, paling banyak ${j.maks} huruf.`;
  else if (j.t === "tanggal") t += "\nTulis tanggal, misalnya 2026-11-21, atau ketik *hari ini*.";
  if (b[3]) t += "\nData pribadi, hanya dilihat tim data ini.";
  if (k.opsi) t += "\nBoleh dilewati: ketik *lewati*, atau *lewati semua*.";
  return t;
}

/* satu jawaban -> nilai mentah menurut jenis butir, atau undefined; pengesahan akhir oleh validasi spek */
const tglHari = (kini, mundur = 0) => new Date(kini + 7 * 36e5 - mundur * 864e5).toISOString().slice(0, 10);   // tanggal WIB
function urai(j, teks, k, kini) {
  const t = teks.trim(), n = norm(t);
  if (!t) return undefined;
  if (j.t === "tp") return /^\d{1,2}$/.test(t) ? KONTEKS.titik[Number(t) - 1]?.id : undefined;
  if (j.t === "banyak") {
    if (n === "tidak ada" || n === "tidak") return [];
    const m = t.match(/\d+/g); if (!m) return undefined;
    const v = m.map(x => j.v[Number(x) - 1]); return v.every(Boolean) ? [...new Set(v)] : undefined;
  }
  if (j.t === "tanggal") return n === "hari ini" ? tglHari(kini) : n === "kemarin" ? tglHari(kini, 1) : t;
  if (j.t === "pilih") return /^\d{1,2}$/.test(t) ? j.v[Number(t) - 1] : j.v.find(v => norm(v) === n || norm(label(v)) === n);
  if (j.t === "ya_tidak") return ["1", "ya", "iya", "y"].includes(n) ? true : ["2", "tidak", "bukan", "t"].includes(n) ? false : undefined;
  if (j.t === "angka") { const m = t.match(/\d+(?:[.,]\d+)?/g); return m?.length === 1 ? m[0] : undefined; }
  if (j.t === "hp") return n === "tidak ada" ? "tidak_ada" : t;
  return t;   // teks, nik, tanggal
}
function simpanJawaban(k, teks, kini) {
  const b = BUTIR(k.jenis).find(x => x[0] === k.butir);
  let nilai = urai(b[1], teks, k, kini);
  if (k.jenis === "jiwa" && b[0] === "kk") {   // 1 = kepala keluarga sendiri, 2 dan seterusnya = KK lain di titik ini
    const n = /^\d{1,2}$/.test(teks.trim()) ? Number(teks.trim()) : 0;
    nilai = n === 1 ? "diri" : n >= 2 ? kk(k.isian.titik)[n - 2]?.id : undefined;
  }
  const v = nilai === undefined ? {galat: [k.butir], data: {}, pribadi: {}} : validasi(k.jenis, {[k.butir]: nilai});
  if (v.galat.includes(k.butir)) return false;
  k.isian[k.butir] = v.data[k.butir] ?? v.pribadi[k.butir];
  return true;
}

/* ---------- ringkasan ---------- */
function tampilNilai(nama, j, v, jenis) {
  if (/^(hp|kontak_hp|nik|nik_kk)$/.test(nama)) return v === "tidak_ada" ? "tidak ada" : samarAngka(v);   // HP dan NIK tidak pernah utuh di balasan
  if (j.t === "tp") return KONTEKS.titik.find(x => x.id === v)?.nama ?? "titik di berkas ini";
  if (jenis === "jiwa" && nama === "kk") return v === "diri" ? "dia sendiri" : `keluarga ${KONTEKS.kk.find(x => x.id === v)?.nama ?? "lain"}`;
  if (j.t === "banyak") return v.length ? v.map(label).join(", ") : "tidak ada";
  if (j.t === "pilih") return label(v);
  if (j.t === "ya_tidak") return v ? "ya" : "tidak";
  return String(v);
}
function ringkasan(k) {
  const baris = BUTIR(k.jenis).filter(b => k.isian[b[0]] != null).map(b => `${labelButir(b[0], k.jenis)}: ${tampilNilai(b[0], b[1], k.isian[b[0]], k.jenis)}`);
  const kf = fotoKurang(k), wj = k.jenis === "jiwa";
  baris.push(`${wj ? "Foto wajah" : "Foto"}: ${k.foto.length}${kf ? `, kurang ${kf}` : ""}`);
  if (!wj) baris.push(`Titik lokasi: ${k.lat != null ? "sudah dibagikan" : "belum ada"}`);
  return `*Ringkasan ${NAMA_JENIS[k.jenis]}*\n${baris.join("\n")}\n\nKetik *simpan* untuk menyimpan, *ubah* diikuti nama butir untuk mengubah (misalnya ubah alamat), atau *batal*.`;
}
const sapa = k => k.tahap === "isi" ? tanya(k)
  : k.tahap === "foto" ? (k.jenis === "jiwa" ? `Kirim foto wajah pengungsi ini, diambil langsung dengan kamera. Bila yang bersangkutan menolak difoto, ketik *menolak*. Belum bisa? Ketik *lewati*.`
    : `Kirim foto ${NAMA_JENIS[k.jenis]}, kurang ${fotoKurang(k)}. Foto diambil langsung dengan kamera. Bagikan lokasi lewat WhatsApp bila bisa. Belum bisa? Ketik *lewati*.`)
  : ringkasan(k);

const BANTUAN = "*Data lanjutan*\nKetik *data rumah*, *data prasarana*, *data pengungsian* (tempat pengungsian), atau *data pengungsi* (satu orang di tempat pengungsian). Untuk jembatan atau jalan yang rusak, ketik *jembatan rusak* atau *jalan rusak*.";
/* jiwa: menolak_foto ditanyakan lewat tahap foto (ketik *menolak*), bukan sebagai butir opsional */
const BARU = (m, bawaan, kini) => ({v: 1, jenis: m.jenis, awal: m.isian, isian: {...m.isian, ...bawaan}, bawaan, lewat: m.jenis === "jiwa" ? ["menolak_foto"] : [], foto: [], lat: null, lon: null, mulai: kini, tahap: "isi"});
function mulai(m, bawaan, kini) {
  if (m.menu) return {keadaan: null, balasan: BANTUAN, selesai: true};
  if (m.jenis === "jiwa" && !KONTEKS.titik.length) return {keadaan: null, balasan: "Belum ada tempat pengungsian di berkas ini. Ketik *data pengungsian* dulu untuk mengisinya.", selesai: true};
  const k = BARU(m, bawaan, kini);
  if (m.jenis === "jiwa" && k.isian.titik == null && KONTEKS.titik.length === 1) k.isian.titik = KONTEKS.titik[0].id;   // satu titik saja: tidak perlu memilih
  maju(k);
  return {keadaan: k, balasan: `*Data ${NAMA_JENIS[k.jenis]}*\nKetik *batal* kapan saja untuk membuang isian ini.\n\n${sapa(k)}`};
}
export const balasanTersimpan = (jenis, urut) => `*Tersimpan*\n${NAMA_JENIS[jenis]} nomor ${urut} sudah masuk ke berkas.\nKetik *lagi* untuk mengisi ${NAMA_JENIS[jenis]} berikutnya${jenis === "jiwa" ? " di tempat yang sama" : jenis === "titik" ? "" : " di desa yang sama"}, atau *selesai*.`;
export const kunciFotoDraf = (berkas, id) => `lapor/data/${berkas}/draf/${id}.jpg`;
export const titikWa = L => L && typeof L === "object" && Number.isFinite(L.lat) && Number.isFinite(L.lon) && L.lat >= -11.5 && L.lat <= 6.5 && L.lon >= 94.5 && L.lon <= 141.5 ? {lat: L.lat, lon: L.lon} : null;

/* ---------- putaran ---------- */
/* keadaan: objek dari lj_sesi, atau null. pesan: {teks, lokasi?: {lat, lon}}. Keluaran: {keadaan (null = keluar), balasan, simpan?, selesai?}.
   simpan = {jenis, isian (umum dan pribadi campur), lat, lon, foto: [{i, la, lo}], klien}: pemanggil menyimpan lalu memakai keadaan keluaran (tanpa isian) hanya bila berhasil. */
export function putaranData({keadaan, pesan = {}, kini, konteks}) {
  KONTEKS = {titik: konteks?.titik ?? [], kk: konteks?.kk ?? []};
  const r = putar(keadaan ? structuredClone(keadaan) : null, pesan, kini);
  if (r.keadaan && JSON.stringify(r.keadaan).length > MAKS_KEADAAN) return {keadaan, balasan: "Isian terlalu panjang untuk disimpan. Persingkat jawaban Anda.\n\n" + sapa(keadaan)};
  return r;
}
function putar(k, pesan, kini) {
  const teks = typeof pesan.teks === "string" ? pesan.teks.trim().slice(0, 2000) : "", n = norm(teks), titik = k?.jenis === "jiwa" ? null : titikWa(pesan.lokasi);   // lokasi orang tidak disimpan
  if (!k) return MULAI[n] ? mulai(MULAI[n], {}, kini) : {keadaan: null, balasan: BANTUAN, selesai: true};
  if (n === "batal" || (n === "selesai" && k.tahap === "sesudah")) return {keadaan: null, balasan: n === "batal" ? "Isian dibuang. Ketik *data rumah* atau *data prasarana* bila ingin mengisi lagi." : "Terima kasih. Data yang sudah disimpan ada di berkas Anda. Ketik *data rumah* atau *data prasarana* bila ingin mengisi lagi.", selesai: true};
  if (k.tahap === "sesudah") {
    if (n === "lagi") return mulai({jenis: k.jenis, isian: k.awal}, k.bawaan, kini);
    if (MULAI[n]) return mulai(MULAI[n], k.bawaan, kini);
    return {keadaan: k, balasan: "Ketik *lagi* untuk mengisi satu lagi, *data rumah* atau *data prasarana* untuk jenis lain, atau *selesai*."};
  }
  if (n === "selesai") return {keadaan: k, balasan: "Masih ada isian yang belum disimpan. Ketik *simpan* untuk menyimpannya, atau *batal* untuk membuangnya.\n\n" + sapa(k)};
  let awalan = "";
  if (titik) { k.lat = titik.lat; k.lon = titik.lon; delete k.paksa; awalan = "Titik lokasi diterima.\n\n"; if (!teks) return {keadaan: k, balasan: awalan + sapa(k)}; }
  const kembali = balasan => ({keadaan: k, balasan: awalan + balasan});
  if (k.tahap === "isi") {
    if (n === "lewati semua" && k.opsi) { k.lewat = BUTIR(k.jenis).filter(b => !perlu(b, k.isian) && kosong(k, b[0])).map(b => b[0]); maju(k); return kembali(sapa(k)); }
    if (n === "lewati") { if (!k.opsi) return kembali("Butir ini wajib diisi.\n\n" + tanya(k)); k.lewat.push(k.butir); maju(k); return kembali(sapa(k)); }
    if (!simpanJawaban(k, teks, kini)) return kembali("Jawaban belum sesuai.\n\n" + tanya(k));
    maju(k); return kembali(sapa(k));
  }
  if (k.tahap === "foto") {
    if (n === "lewati") { k.fotoLewat = true; maju(k); return kembali(sapa(k)); }
    if (n === "menolak" && k.jenis === "jiwa") { k.isian.menolak_foto = true; maju(k); return kembali("Dicatat: menolak difoto. Foto wajah tidak diminta.\n\n" + sapa(k)); }
    return kembali("Menunggu foto.\n\n" + sapa(k));
  }
  // ringkas
  if (n === "simpan") {
    const sesudah = {v: 1, jenis: k.jenis, awal: k.awal, bawaan: Object.fromEntries((BAWA[k.jenis] || []).filter(n => k.isian[n] != null).map(n => [n, k.isian[n]])), lewat: [], foto: [], isian: {}, tahap: "sesudah", mulai: kini};
    return {keadaan: sesudah, balasan: "", simpan: {jenis: k.jenis, isian: k.isian, lat: k.lat, lon: k.lon, foto: k.foto, klien: `wa-${k.mulai}`, ...(k.paksa && {paksa: true})}};
  }
  const u = /^ubah (.+)$/.exec(n);
  if (u) {
    const b = BUTIR(k.jenis).find(x => norm(x[0]) === u[1] || (u[1].length >= 3 && norm(labelButir(x[0], k.jenis)).includes(u[1])));
    if (b) { Object.assign(k, {tahap: "isi", butir: b[0], opsi: !perlu(b, k.isian), balik: true}); return kembali(tanya(k)); }
    return kembali("Butir itu tidak dikenal. Tulis *ubah* diikuti nama butir, misalnya ubah alamat.\n\n" + ringkasan(k));
  }
  return kembali(ringkasan(k));
}

/* satu foto diterima: pemanggil sudah memeriksa JPEG dan menulis ke R2 hanya bila diterima. f = {i: id acak, w?: waktu pesan ms, lat?, lon?} */
export function fotoMasuk(keadaan, f, konteks) {
  KONTEKS = {titik: konteks?.titik ?? [], kk: konteks?.kk ?? []};
  const k = keadaan ? structuredClone(keadaan) : null;
  if (!k || k.tahap === "sesudah") return {ditolak: true, balasan: "Belum ada isian yang menunggu foto. Ketik *data rumah* atau *data prasarana* dulu."};
  if (k.tahap === "isi") return {ditolak: true, balasan: "Foto diminta sesudah semua isian terjawab. Jawab dulu pertanyaan ini.\n\n" + tanya(k)};
  if (k.jenis === "jiwa" && !wajahBoleh(k.isian)) return {ditolak: true, balasan: "Foto wajah tidak diminta untuk anak di bawah 18 tahun atau yang menolak difoto. Ketik *simpan* untuk menyimpan."};
  if (k.foto.length >= (k.jenis === "jiwa" ? MAKS_WAJAH : MAKS_FOTO_DRAF)) return {ditolak: true, balasan: `Paling banyak ${k.jenis === "jiwa" ? MAKS_WAJAH : MAKS_FOTO_DRAF} foto per objek. Ketik *simpan* untuk menyimpan.`};
  const lok = k.jenis === "jiwa" ? null : titikWa(f);   // wajah tidak mengisi titik
  k.foto.push({i: f.i, ...(Number.isFinite(f.w) && {w: f.w}), ...(lok && {la: lok.lat, lo: lok.lon})});
  if (lok && k.lat == null) { k.lat = lok.lat; k.lon = lok.lon; delete k.paksa; }
  const awal = k.tahap; maju(k);
  const awalan = awal === "foto" && k.tahap === "foto" ? `Foto diterima. Kurang ${fotoKurang(k)} lagi.` : "Foto diterima.";
  const hasil = {keadaan: k, balasan: k.tahap === "foto" ? awalan : `${awalan}\n\n${ringkasan(k)}`};
  return JSON.stringify(k).length > MAKS_KEADAAN ? {ditolak: true, balasan: "Isian sudah terlalu panjang untuk menambah foto. Ketik *simpan*."} : hasil;
}
