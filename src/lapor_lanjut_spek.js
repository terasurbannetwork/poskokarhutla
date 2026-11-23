/* Data lanjutan BPBD (paket data/kajian-bnpb/lapor-lanjutan/, ALGORITMA bagian 2 sampai 5 dan 7, tiket LJ-02). Fungsi murni: spek tujuh jenis objek,
   validasi isian umum dan isian pribadi (dipisah, D4; isian pribadi diurai kode, tidak pernah ke AI, D19), foto wajib, titik objek, penanda,
   nilai metrik dengan nihil per metrik (D15: kosong tidak pernah jadi 0), rekap berkunci kolom meja dampak dan pengungsi (D5, D6), kondisi akhir (D13),
   isi versi beku tanpa data pribadi (D14). Tanpa D1, tanpa jaringan. Uji: tests/lapor/lanjut_spek.test.mjs (juga mencocokkan kunci rekap ke kolom meja). */

export const JENIS = ["rumah", "prasarana", "titik", "jiwa", "korban", "usaha", "kebutuhan"];
const TINGKAT = ["rb", "rs", "rr"];
/* prasarana -> kolom meja dampak: vital = <kunci>_unit, layanan = <kunci>_<tingkat>, jalan = jalan_km, jembatan = jembatan_<tingkat> (src/meja_spek.js) */
const VITAL = {listrik: "listrik", air: "air", sinyal: "telekom", irigasi: "irigasi", transportasi: "transportasi", spbu: "spbu"};
const LAYANAN = ["sekolah", "faskes", "ibadah", "kantor", "pasar"];
export const PRASARANA = ["jembatan", "jalan", ...LAYANAN, ...Object.keys(VITAL), "lainnya"];
/* kelompok umur meja pengungsi (tahun) dan meja dampak; umur 0 = bayi (0-11 bulan) */
const UMUR_UNGSI = [["bayi", 0, 0], ["balita", 1, 4], ["anak", 5, 12], ["remaja", 13, 17], ["dewasa", 18, 59], ["lansia", 60, 200]];
const UMUR_DAMPAK = [["anak", 0, 17], ["dewasa", 18, 59], ["lansia", 60, 200]];
export const DEWASA = 18;   // Q13: foto wajah diminta mulai umur ini (batas anak UU 35/2014)
const SEKTOR = ["keb_air", "keb_pangan", "keb_sandang", "keb_kesehatan", "keb_hunian", "keb_pendidikan"];
const RENTAN = ["balita", "hamil_t1", "hamil_t2", "hamil_t3", "menyusui", "lansia", "disabilitas_fisik", "disabilitas_sensorik", "disabilitas_intelektual", "disabilitas_mental", "sakit"];
/* ambang penanda: HIPOTESIS rancangan (ALGORITMA 3), bisa diubah tanpa migrasi */
export const AMBANG = {foto_jauh_m: 500, foto_lama_jam: 72, dobel_titik_m: 10};

/* ---------- jenis isian ---------- */
const P = (...v) => ({t: "pilih", v});
const T = (maks = 120) => ({t: "teks", maks}), A = (min = 0, maks = 1e6, desimal = false) => ({t: "angka", min, maks, desimal});
const TGL = {t: "tanggal"}, YT = {t: "ya_tidak"}, HP = {t: "hp"}, NIK = {t: "nik"}, BANYAK = v => ({t: "banyak", v});
/* butir: [nama, jenis, wajib (true | fungsi(data, pribadi)), pribadi?] */
const w = true, o = false;
const SPEK = {
  rumah: {foto: 2, isian: [
    ["kk", T(), w, 1], ["pemilik", T(), o, 1], ["nik_kk", NIK, o, 1],
    ["desa", T(), w], ["kec", T(), w], ["alamat", T(200), w],
    ["tingkat", P(...TINGKAT, "tidak_rusak"), w], ["terendam", YT, w], ["huni", P("dihuni", "mengungsi", "rata", "tidak_tahu"), w], ["jiwa", A(0, 100), w], ["ket", T(400), o]]},
  prasarana: {foto: 2, isian: [
    ["jenis", P(...PRASARANA), w], ["nama", T(), w], ["desa", T(), w], ["tingkat", P(...TINGKAT), w], ["fungsi", P("putus", "terbatas", "berfungsi"), w],
    ["panjang_m", A(0, 1e6, true), d => d.jenis === "jalan" || d.jenis === "jembatan"],
    ["kendaraan", P("tidak_ada", "motor", "mobil", "truk", "tidak_tahu"), d => d.jenis === "jalan" || d.jenis === "jembatan"],
    ["alternatif", T(200), o]]},
  titik: {foto: 1, isian: [
    ["nama", T(), w], ["desa", T(), w], ["jenis_tempat", P("terkonsentrasi", "tidak_terkonsentrasi"), w],
    ["tipe_tempat", P("fasilitas_umum", "tanah_lapang", "lahan_gedung_swasta", "tempat_ibadah", "rumah_perorangan"), w], ["tgl_buka", TGL, w],
    ...SEKTOR.map(s => [s, P("ada", "tidak"), w]), ["mck", P("ada", "tidak"), o], ["dapur", P("ada", "tidak"), o], ["listrik", P("ada", "tidak"), o], ["kapasitas", A(0, 1e5), o]]},
  jiwa: {foto: 0, isian: [
    ["titik", {t: "tp"}, w], ["nama", T(), w, 1], ["umur", A(0, 120), w], ["jk", P("l", "p"), w], ["desa_asal", T(), w], ["masuk", TGL, w],
    ["kk", T(16), w],   // "diri" atau id objek jiwa kepala keluarga di berkas yang sama
    ["hp", HP, d => d.kk === "diri", 1], ["nik", NIK, o, 1], ["rentan", BANYAK(RENTAN), o, 1], ["kebutuhan", T(300), o, 1],
    ["menolak_foto", YT, o], ["keluar", TGL, o]]},
  korban: {foto: 0, isian: [
    ["status", P("meninggal", "hilang", "luka_berat", "luka_ringan"), w], ["nama", T(), w, 1], ["umur", A(0, 120), w], ["jk", P("l", "p"), w], ["desa", T(), w],
    ["kontak_nama", T(), w, 1], ["kontak_hp", HP, w, 1],
    ["terakhir_lokasi", T(200), d => d.status === "hilang"], ["terakhir_waktu", TGL, d => d.status === "hilang"],
    ["pencarian", P("dicari", "ditemukan_hidup", "ditemukan_meninggal"), d => d.status === "hilang"],
    ["dirawat", T(), o], ["tempat", T(), o], ["sumber", P("rs", "keluarga", "aparat"), o], ["ciri", T(300), o, 1], ["nik", NIK, o, 1]]},
  usaha: {foto: 1, isian: [["jenis", P("sawah", "kebun", "tambak", "ternak", "kios", "lainnya"), w], ["desa", T(), w], ["besaran", A(0, 1e7, true), w], ["satuan", P("ha", "ekor", "unit"), w]]},
  kebutuhan: {foto: 0, isian: [
    ["titik", {t: "tp"}, o], ["desa", T(), d => !d.titik], ["butir", P("logistik", "air", "obat", "tenda", "alat_berat", "lainnya"), w],
    ["jumlah", A(0, 1e7, true), w], ["satuan", T(30), w], ["mendesak", YT, w], ["bantuan_dari", T(), o], ["bantuan_apa", T(200), o], ["bantuan_jumlah", A(0, 1e7, true), o]]},
};
export const spek = jenis => SPEK[jenis];
export const NAMA_PRIBADI = Object.fromEntries(JENIS.map(j => [j, SPEK[j].isian.filter(b => b[3]).map(b => b[0])]));

/* ---------- validasi ---------- */
const TIDAK_ADA = "tidak_ada";
function satu(nilai, j) {
  if (j.t === "pilih") return j.v.includes(nilai) ? [nilai] : null;
  if (j.t === "teks") { if (typeof nilai !== "string" && typeof nilai !== "number") return null; const s = String(nilai).trim().replace(/\s+/g, " "); return s && s.length <= j.maks ? [s] : null; }
  if (j.t === "angka") { const n = typeof nilai === "number" ? nilai : Number(String(nilai).replace(",", ".")); return Number.isFinite(n) && n >= j.min && n <= j.maks && (j.desimal || Number.isInteger(n)) ? [n] : null; }
  if (j.t === "tanggal") return /^\d{4}-\d{2}-\d{2}$/.test(nilai) && !Number.isNaN(Date.parse(nilai + "T00:00:00Z")) ? [nilai] : null;
  if (j.t === "ya_tidak") return typeof nilai === "boolean" ? [nilai] : null;
  if (j.t === "tp") return /^TP-[0-9A-Za-z]{8}$/.test(nilai) ? [nilai] : null;
  if (j.t === "nik") { const s = String(nilai).replace(/\D/g, ""); return s.length === 16 ? [s] : null; }
  if (j.t === "hp") { if (nilai === TIDAK_ADA) return [nilai]; let s = String(nilai).replace(/[^\d+]/g, "").replace(/^\+/, ""); if (s.startsWith("0")) s = "62" + s.slice(1); return /^62\d{8,13}$/.test(s) ? [s] : null; }
  if (j.t === "banyak") return Array.isArray(nilai) && nilai.every(x => j.v.includes(x)) ? [[...new Set(nilai)]] : null;
  return null;
}
/* masukan: {...isian} campur umum dan pribadi. Keluaran {galat: [nama butir], data, pribadi}; isian tak dikenal dibuang. Kosong = null, tidak pernah 0. */
export function validasi(jenis, isian = {}) {
  const s = SPEK[jenis]; if (!s) return {galat: ["jenis"], data: {}, pribadi: {}};
  const data = {}, pribadi = {}, galat = [];
  for (const [nama, j, , pr] of s.isian) {
    const v = isian[nama]; if (v == null || v === "") continue;
    const h = satu(v, j); if (!h) { galat.push(nama); continue; }
    (pr ? pribadi : data)[nama] = h[0];
  }
  for (const [nama, , wajib, pr] of s.isian) {
    const perlu = typeof wajib === "function" ? wajib({...data, ...pribadi}) : wajib;
    if (perlu && (pr ? pribadi : data)[nama] == null && !galat.includes(nama)) galat.push(nama);
  }
  if (jenis === "jiwa" && data.keluar && data.masuk && data.keluar < data.masuk) galat.push("keluar");
  return {galat, data, pribadi};
}

/* foto wajah (jenis media `wajah`) hanya untuk dua jenis: jiwa dewasa yang tidak menolak (Q10, Q13) dan korban yang masih dicari (Q8: foto semasa hidup dari keluarga).
   Satu fungsi untuk web, WA, dan penghapusan saat syaratnya hilang (batasi tujuan, UU 27/2022): ditemukan atau meninggal = foto dihapus. */
export const JENIS_WAJAH = new Set(["jiwa", "korban"]);
export const wajahBoleh = (jenis, d = {}) => jenis === "jiwa" ? d.umur >= DEWASA && !d.menolak_foto : jenis === "korban" && d.status === "hilang" && d.pencarian === "dicari";

/* foto wajib menurut jenis; jiwa: wajah untuk umur dewasa kecuali menolak difoto (Q10, Q13) */
export function fotoWajib(jenis, data = {}) {
  if (jenis === "jiwa") return {foto: 0, wajah: data.umur >= DEWASA && !data.menolak_foto ? 1 : 0};
  return {foto: SPEK[jenis]?.foto ?? 0, wajah: 0};
}
export function kurangFoto(jenis, data, media = []) {
  const f = fotoWajib(jenis, data), n = t => media.filter(m => m.jenis === t).length;
  return {foto: Math.max(0, f.foto - n("foto")), wajah: Math.max(0, f.wajah - n("wajah"))};
}

/* ---------- titik dan penanda ---------- */
// ponytail: jarak equirectangular, cukup untuk ambang ratusan meter; ganti haversine bila ambang naik ke puluhan km
export const jarakM = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };
const adaTitik = m => m.lat != null && m.lon != null;
/* titik isian manual, lalu foto gps, lalu foto exif, lalu null */
export function titikObjek(objek, media = []) {
  if (adaTitik(objek)) return {lat: objek.lat, lon: objek.lon};
  const f = ["gps", "exif"].map(l => media.find(m => m.lencana === l && adaTitik(m))).find(Boolean);
  return f ? {lat: f.lat, lon: f.lon} : null;
}
/* objek: {id, jenis, data, pribadi, lat, lon, status}; konteks: {objek: semua objek berkas, media: media objek ini, waktuKejadian ms, dalamKab(lat, lon)?} */
export function penanda(objek, {objek: semua = [], media = [], waktuKejadian = null, dalamKab = null} = {}) {
  const hasil = [], t = titikObjek(objek, media);
  if (!t && !JENIS_WAJAH.has(objek.jenis)) hasil.push("tanpa_titik");   // jiwa dan korban memang tanpa titik: lokasi orang tidak disimpan (LJ-06, LJ-07)
  if (t && media.some(m => adaTitik(m) && jarakM(t.lat, t.lon, m.lat, m.lon) > AMBANG.foto_jauh_m)) hasil.push("foto_jauh");
  if (waktuKejadian != null && media.some(m => m.waktu_ambil != null && m.waktu_ambil < waktuKejadian - AMBANG.foto_lama_jam * 3600e3)) hasil.push("foto_lama");
  const lain = semua.filter(x => x.id !== objek.id && x.jenis === objek.jenis && x.status !== "batal");
  // ponytail: objek lain dibandingkan lewat titik tersimpannya (lj_objek.lat/lon); pemanggil mengisi kolom itu dari titikObjek saat simpan
  if (t && (objek.jenis === "rumah" || objek.jenis === "prasarana") && lain.some(x => adaTitik(x) && jarakM(t.lat, t.lon, x.lat, x.lon) <= AMBANG.dobel_titik_m)) hasil.push("dobel_titik");
  // D16: hanya objek sejenis dalam berkas yang sama (pemanggil memberi objek satu berkas); jiwa tidak pernah dibandingkan dengan korban
  const nik = objek.pribadi?.nik || objek.pribadi?.nik_kk;
  if (nik && (objek.jenis === "jiwa" || objek.jenis === "korban") && lain.some(x => (x.pribadi?.nik || x.pribadi?.nik_kk) === nik)) hasil.push("nik_ganda");
  if (t && dalamKab && !dalamKab(t.lat, t.lon)) hasil.push("luar_kab");
  return hasil;
}

/* ---------- metrik dan rekap ---------- */
const aktif = semua => semua.filter(x => x.status !== "batal");
const kelompok = (umur, daftar) => typeof umur === "number" ? daftar.find(([, a, b]) => umur >= a && umur <= b)?.[0] : undefined;   // null >= 0 benar di JS: jaga dulu
const jiwaAktif = (o, tgl) => o.jenis === "jiwa" && o.data.masuk <= tgl && (!o.data.keluar || o.data.keluar > tgl);
/* himpunan objek tiap metrik (ALGORITMA 4); kunci = kolom meja dampak bila ada */
function himpunan(semua, tgl) {
  const S = {}, tambah = (k, x) => (S[k] ||= []).push(x);
  for (const x of aktif(semua)) {
    const d = x.data;
    if (x.jenis === "rumah") { if (TINGKAT.includes(d.tingkat)) tambah("rumah_" + d.tingkat, x); if (d.terendam) tambah("rumah_terendam", x); }
    if (x.jenis === "korban") {
      if (d.status === "meninggal" || d.pencarian === "ditemukan_meninggal") tambah("meninggal", x);
      else if (d.status === "hilang" && d.pencarian === "dicari") tambah("hilang", x);
      else if (d.status === "luka_berat" || d.status === "luka_ringan") tambah("luka", x);
    }
    if (tgl && jiwaAktif(x, tgl)) tambah("mengungsi", x);
    if (x.jenis === "prasarana") {
      if (d.jenis === "jembatan") tambah("jembatan_" + d.tingkat, x);
      else if (d.jenis === "jalan") tambah("jalan_km", x);
      else if (VITAL[d.jenis]) tambah(VITAL[d.jenis] + "_unit", x);
      else if (LAYANAN.includes(d.jenis)) tambah(d.jenis + "_" + d.tingkat, x);
      if (d.fungsi === "putus") tambah("prasarana_putus", x);
    }
  }
  return S;
}
export const METRIK_INTI = ["meninggal", "hilang", "luka", "mengungsi", ...[...TINGKAT, "terendam"].map(t => "rumah_" + t)];
/* hanya nama ini yang boleh ditandai nihil; nama lain diabaikan supaya LJ-12 tidak menulis kolom karangan */
export const METRIK_NIHIL = new Set([...METRIK_INTI, "prasarana_putus", "jalan_km", ...TINGKAT.map(t => "jembatan_" + t),
  ...Object.values(VITAL).map(v => v + "_unit"), ...LAYANAN.flatMap(l => TINGKAT.map(t => l + "_" + t))]);
/* metrik kondisi akhir yang bernilai 0 dari data, bukan hanya dari nihil (ALGORITMA 5, D13): ada objeknya tetapi tidak ada yang tersisa */
const tercakup = (semua, tgl) => {
  const xs = aktif(semua);
  return {hilang: xs.some(x => x.jenis === "korban" && x.data.status === "hilang"),
    mengungsi: tgl != null && xs.some(x => x.jenis === "jiwa"), prasarana_putus: xs.some(x => x.jenis === "prasarana")};
};
/* nilai(m) = jumlah bila ada objek; 0 bila ditandai nihil atau bila objeknya ada tetapi semua sudah selesai (hilang ditemukan, jiwa keluar, prasarana
   tidak putus); null selain itu. tgl (YYYY-MM-DD) wajib untuk mengungsi: tanpa tgl, mengungsi selalu null dan nihilnya diabaikan. */
export function rekap(semua, {nihil = new Set(), tgl = null} = {}) {
  const S = himpunan(semua, tgl), c = tercakup(semua, tgl), r = {};
  const nh = new Set([...nihil].filter(m => METRIK_NIHIL.has(m) && (m !== "mengungsi" || tgl != null)));
  for (const m of new Set([...METRIK_INTI, "prasarana_putus", ...Object.keys(S), ...nh])) {
    const xs = S[m] || [];
    r[m] = xs.length ? (m === "jalan_km" ? Math.round(xs.reduce((s, x) => s + (x.data.panjang_m || 0), 0)) / 1000 : xs.length) : nh.has(m) || c[m] ? 0 : null;
  }
  if (tgl == null) r.mengungsi = null;
  // rincian kelompok umur dan L/P meja dampak, hanya untuk metrik berisi objek; umur atau jk kosong (baris impor lama) tidak dirinci
  for (const m of ["meninggal", "hilang", "luka", "mengungsi"]) for (const x of S[m] || []) {
    const u = kelompok(x.data.umur, UMUR_DAMPAK); if (!u || !["l", "p"].includes(x.data.jk)) continue;
    const k = `${m}_${u}_${x.data.jk}`; r[k] = (r[k] || 0) + 1;
  }
  return r;
}
/* mengisi objek untuk metrik bertanda nihil mencabut nihilnya (ALGORITMA 4); jiwa mana pun mencabut nihil mengungsi */
export const cabutNihil = (nihil, semua) => {
  const S = himpunan(semua, null), c = tercakup(semua, "9999-12-31"), n = new Set(nihil);
  for (const m of [...Object.keys(S), ...Object.keys(c).filter(k => c[k])]) n.delete(m); return n;
};

/* rekap harian satu titik untuk meja pengungsi: <kelompok>_<l|p>, kk, jiwa_total; null bila tidak ada jiwa aktif */
export function titikHari(semua, tp, tgl) {
  const xs = aktif(semua).filter(x => x.data.titik === tp && jiwaAktif(x, tgl)); if (!xs.length) return null;
  const r = {kk: xs.filter(x => x.data.kk === "diri").length, jiwa_total: xs.length};
  for (const x of xs) { const u = kelompok(x.data.umur, UMUR_UNGSI); if (!u || !["l", "p"].includes(x.data.jk)) continue; const k = `${u}_${x.data.jk}`; r[k] = (r[k] || 0) + 1; }
  return r;
}

/* ---------- kondisi akhir (D13) ---------- */
export function kondisiAkhir(r) {
  const butir = [["hilang", "korban hilang belum ditemukan"], ["mengungsi", "warga masih mengungsi"], ["prasarana_putus", "prasarana masih putus"]];
  const alasan = butir.filter(([m]) => r[m] !== 0).map(([m, t]) => ({metrik: m, nilai: r[m] ?? null, teks: r[m] == null ? `${t}: belum didata` : t}));
  const belum = Object.keys(r).filter(m => r[m] == null && !butir.some(([b]) => b === m));
  return {status: alasan.length ? "selesai_catatan" : "selesai", alasan, belum_didata: belum};
}

/* ---------- versi beku (D14): tanpa data pribadi, objek diwakili sidik ---------- */
const kanonik = v => Array.isArray(v) ? `[${v.map(kanonik).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ":" + kanonik(v[k])).join(",")}}` : JSON.stringify(v);
export const sha256 = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
export async function isiBeku({berkas, semua, rekap: r, kondisi, penutupan}) {
  const objek = await Promise.all(aktif(semua).slice().sort((a, b) => a.id < b.id ? -1 : 1)
    .map(async x => ({id: x.id, jenis: x.jenis, urut: x.urut, sidik: await sha256(kanonik({data: x.data, pribadi: x.pribadi ?? null}))})));
  const isi = kanonik({berkas: {id: berkas.id, induk: berkas.induk, kab: berkas.kab, kejadian_id: berkas.kejadian_id ?? null}, rekap: r, kondisi_akhir: kondisi, penutupan, objek});
  return {isi, sidik: await sha256(isi)};
}
