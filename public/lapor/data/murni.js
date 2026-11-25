/* Bagian murni layar /lapor/data/ (tiket LJ-15, paket data/kajian-bnpb/lapor-lanjutan). Tanpa DOM, bisa diuji di node:
   tests/lapor/layar_data.test.mjs. Aturan validasi TIDAK ada di sini: server (src/lapor_lanjut_spek.js) yang menolak dan pesannya ditampilkan.
   Yang ada hanya deskripsi isian untuk menggambar form (nama, label Indonesia, jenis, pilihan); uji mencocokkan nama, pilihan, dan tanda pribadi ke SPEK server. */

export const JENIS = [["rumah", "Rumah", "d-rumah"], ["prasarana", "Prasarana", "d-jalan"], ["titik", "Pengungsian", "d-tenda"], ["jiwa", "Pengungsi", "d-orang"],
  ["korban", "Korban", "d-korban"], ["usaha", "Usaha", "d-usaha"], ["kebutuhan", "Kebutuhan", "d-kebutuhan"]];
export const NAMA_JENIS = Object.fromEntries(JENIS.map(([j, n]) => [j, n]));

const P = (...pasang) => ({t: "pilih", v: pasang.map(x => x[0]), l: Object.fromEntries(pasang)});
const T = {t: "teks"}, TP = {t: "teks", panjang: 1}, A = {t: "angka"}, AD = {t: "angka", desimal: 1}, TGL = {t: "tanggal"}, YT = {t: "ya_tidak"}, HP = {t: "hp"}, NIK = {t: "nik"};
const BANYAK = (...pasang) => ({t: "banyak", v: pasang.map(x => x[0]), l: Object.fromEntries(pasang)});
const TK = [["rb", "Rusak berat"], ["rs", "Rusak sedang"], ["rr", "Rusak ringan"]];
const ADA = P(["ada", "Ada"], ["tidak", "Tidak"]);
const SEKTOR = [["keb_air", "Air bersih"], ["keb_pangan", "Pangan"], ["keb_sandang", "Sandang"], ["keb_kesehatan", "Layanan kesehatan"], ["keb_hunian", "Hunian"], ["keb_pendidikan", "Pendidikan"]];
const jalanJembatan = d => d.jenis === "jalan" || d.jenis === "jembatan";

/* [nama, label, jenis isian, wajib (1, 0, atau fungsi(isian)), pribadi (1 = hanya tim berkas dan staf tertentu yang melihat utuh)] */
export const FORM = {
  rumah: [["kk", "Nama kepala keluarga", T, 1, 1], ["pemilik", "Nama pemilik, bila berbeda", T, 0, 1], ["nik_kk", "NIK kepala keluarga", NIK, 0, 1],
    ["desa", "Desa atau kelurahan", T, 1], ["kec", "Kecamatan", T, 1], ["alamat", "Alamat", TP, 1],
    ["tingkat", "Tingkat kerusakan", P(...TK, ["tidak_rusak", "Tidak rusak"]), 1], ["terendam", "Terendam", YT, 1],
    ["huni", "Status huni", P(["dihuni", "Masih dihuni"], ["mengungsi", "Penghuni mengungsi"], ["rata", "Rata dengan tanah"], ["tidak_tahu", "Belum diketahui"]), 1],
    ["jiwa", "Jumlah jiwa", A, 1], ["ket", "Keterangan", TP, 0]],
  prasarana: [["jenis", "Jenis prasarana", P(["jembatan", "Jembatan"], ["jalan", "Jalan"], ["sekolah", "Sekolah"], ["faskes", "Fasilitas kesehatan"], ["ibadah", "Tempat ibadah"],
      ["kantor", "Kantor pemerintah"], ["pasar", "Pasar"], ["listrik", "Listrik"], ["air", "Air bersih"], ["sinyal", "Sinyal telekomunikasi"], ["irigasi", "Irigasi"],
      ["transportasi", "Transportasi"], ["spbu", "SPBU"], ["lainnya", "Lainnya"]), 1],
    ["nama", "Nama", T, 1], ["desa", "Desa atau kelurahan", T, 1], ["tingkat", "Tingkat kerusakan", P(...TK), 1],
    ["fungsi", "Fungsi sekarang", P(["putus", "Putus"], ["terbatas", "Terbatas"], ["berfungsi", "Berfungsi"]), 1],
    ["panjang_m", "Panjang yang rusak (meter)", AD, jalanJembatan],
    ["kendaraan", "Kendaraan yang bisa lewat", P(["tidak_ada", "Tidak ada"], ["motor", "Motor"], ["mobil", "Mobil"], ["truk", "Truk"], ["tidak_tahu", "Belum diketahui"]), jalanJembatan],
    ["alternatif", "Jalur alternatif", T, 0]],
  titik: [["nama", "Nama tempat", T, 1], ["desa", "Desa atau kelurahan", T, 1],
    ["jenis_tempat", "Jenis tempat", P(["terkonsentrasi", "Terkonsentrasi"], ["tidak_terkonsentrasi", "Tidak terkonsentrasi"]), 1],
    ["tipe_tempat", "Tipe tempat", P(["fasilitas_umum", "Fasilitas umum"], ["tanah_lapang", "Tanah lapang"], ["lahan_gedung_swasta", "Lahan atau gedung swasta"], ["tempat_ibadah", "Tempat ibadah"], ["rumah_perorangan", "Rumah perorangan"]), 1],
    ["tgl_buka", "Tanggal dibuka", TGL, 1], ...SEKTOR.map(([n, l]) => [n, `${l} tersedia`, ADA, 1]),
    ["mck", "MCK", ADA, 0], ["dapur", "Dapur umum", ADA, 0], ["listrik", "Listrik", ADA, 0], ["kapasitas", "Kapasitas (jiwa)", A, 0]],
  jiwa: [["titik", "Tempat pengungsian", {t: "tp"}, 1], ["nama", "Nama", T, 1, 1], ["umur", "Umur (tahun)", A, 1], ["jk", "Jenis kelamin", P(["l", "Laki-laki"], ["p", "Perempuan"]), 1],
    ["desa_asal", "Desa asal", T, 1], ["masuk", "Tanggal masuk", TGL, 1], ["kk", "Kepala keluarga", {t: "kk"}, 1],
    ["hp", "Nomor HP (satu per keluarga)", HP, d => d.kk === "diri", 1], ["nik", "NIK", NIK, 0, 1],
    ["rentan", "Kelompok rentan", BANYAK(["balita", "Balita"], ["hamil_t1", "Hamil trimester 1"], ["hamil_t2", "Hamil trimester 2"], ["hamil_t3", "Hamil trimester 3"], ["menyusui", "Menyusui"], ["lansia", "Lansia"],
      ["disabilitas_fisik", "Disabilitas fisik"], ["disabilitas_sensorik", "Disabilitas sensorik"], ["disabilitas_intelektual", "Disabilitas intelektual"], ["disabilitas_mental", "Disabilitas mental"], ["sakit", "Sakit"]), 0, 1],
    ["kebutuhan", "Kebutuhan khusus", TP, 0, 1], ["menolak_foto", "Menolak difoto", YT, 0], ["keluar", "Tanggal keluar", TGL, 0]],
  korban: [["status", "Keadaan", P(["meninggal", "Meninggal"], ["hilang", "Hilang"], ["luka_berat", "Luka berat"], ["luka_ringan", "Luka ringan"]), 1],
    ["nama", "Nama", T, 1, 1], ["umur", "Umur (tahun)", A, 1], ["jk", "Jenis kelamin", P(["l", "Laki-laki"], ["p", "Perempuan"]), 1], ["desa", "Desa asal", T, 1],
    ["kontak_nama", "Nama keluarga yang dihubungi", T, 1, 1], ["kontak_hp", "Nomor HP keluarga", HP, 1, 1],
    ["terakhir_lokasi", "Lokasi terakhir terlihat", TP, d => d.status === "hilang"], ["terakhir_waktu", "Tanggal terakhir terlihat", TGL, d => d.status === "hilang"],
    ["pencarian", "Status pencarian", P(["dicari", "Masih dicari"], ["ditemukan_hidup", "Ditemukan hidup"], ["ditemukan_meninggal", "Ditemukan meninggal"]), d => d.status === "hilang"],
    ["dirawat", "Dirawat di", T, 0], ["tempat", "Tempat kejadian", T, 0], ["sumber", "Sumber kabar", P(["rs", "Rumah sakit"], ["keluarga", "Keluarga"], ["aparat", "Aparat"]), 0],
    ["ciri", "Ciri-ciri", TP, 0, 1], ["nik", "NIK", NIK, 0, 1]],
  usaha: [["jenis", "Jenis usaha", P(["sawah", "Sawah"], ["kebun", "Kebun"], ["tambak", "Tambak"], ["ternak", "Ternak"], ["kios", "Kios"], ["lainnya", "Lainnya"]), 1],
    ["desa", "Desa atau kelurahan", T, 1], ["besaran", "Besaran terdampak", AD, 1], ["satuan", "Satuan", P(["ha", "hektare"], ["ekor", "ekor"], ["unit", "unit"]), 1]],
  kebutuhan: [["titik", "Tempat pengungsian", {t: "tp"}, 0], ["desa", "Desa atau kelurahan", T, d => !d.titik],
    ["butir", "Jenis kebutuhan", P(["logistik", "Logistik"], ["air", "Air bersih"], ["obat", "Obat"], ["tenda", "Tenda"], ["alat_berat", "Alat berat"], ["lainnya", "Lainnya"]), 1],
    ["jumlah", "Jumlah", AD, 1], ["satuan", "Satuan", T, 1], ["mendesak", "Mendesak", YT, 1],
    ["bantuan_dari", "Bantuan yang sudah masuk, dari", T, 0], ["bantuan_apa", "Bantuan yang sudah masuk, berupa", T, 0], ["bantuan_jumlah", "Jumlah bantuan yang sudah masuk", AD, 0]],
};
/* jumlah foto biasa yang diminta per jenis (kurang_foto dari server menentukan sisanya) */
export const FOTO_MINTA = {rumah: 2, prasarana: 2, titik: 1, usaha: 1, jiwa: 0, korban: 0, kebutuhan: 0};
export const TANPA_LOKASI = new Set(["jiwa", "korban", "kebutuhan"]);   // lokasi orang tidak disimpan; titik pengungsian dari daftar
export const wajibIni = (f, nilai) => typeof f[3] === "function" ? !!f[3](nilai) : !!f[3];
/* foto wajah: hanya pengungsi dewasa yang tidak menolak, dan korban hilang yang masih dicari (server menolak selain itu) */
export const wajahTampil = (jenis, n = {}) => jenis === "jiwa" ? Number(n.umur) >= 18 && n.menolak_foto !== true : jenis === "korban" && n.status === "hilang" && n.pencarian === "dicari";
/* isian pribadi atau foto wajah tidak pernah ke penyimpanan perangkat (D21): jenis itu antre di saluran rahasia, yang hidup di memori halaman saja */
export const punyaPribadi = jenis => FORM[jenis].some(f => f[4]);

/* ---------- badan POST /objek dari nilai form ---------- */
const kosong = v => v == null || v === "" || (Array.isArray(v) && !v.length);
export function bangunIsian(jenis, nilai) {
  const o = {};
  for (const [n, , tp] of FORM[jenis]) {
    const v = nilai[n]; if (kosong(v)) continue;
    if (tp.t === "angka") { const x = Number(String(v).replace(",", ".")); o[n] = Number.isFinite(x) ? x : v; }   // bukan angka: biarkan, server menolak dengan nama butirnya
    else o[n] = typeof v === "string" ? v.trim() : v;
  }
  return o;
}
export const nilaiDariObjek = o => ({...o.data, ...(o.pribadi || {})});

/* ---------- tampilan ---------- */
export const LABEL_NILAI = (jenis, nama, v) => { const f = FORM[jenis].find(x => x[0] === nama), t = f?.[2]; return t?.l?.[v] ?? (v === true ? "Ya" : v === false ? "Tidak" : String(v)); };
const TKL = {rb: "Rusak berat", rs: "Rusak sedang", rr: "Rusak ringan", tidak_rusak: "Tidak rusak"};
export const PENANDA = {tanpa_titik: ["Belum ada titik", "Objek ini belum punya titik. Ambil lokasi di tempatnya atau lampirkan foto yang punya titik."],
  foto_jauh: ["Foto jauh dari titik", "Ada foto yang titiknya lebih dari 500 m dari titik objek."], foto_lama: ["Foto lama", "Ada foto yang diambil lebih dari 72 jam sebelum kejadian dilaporkan."],
  dobel_titik: ["Titik berdekatan", "Ada data sejenis dalam jarak 10 m. Periksa apakah ini data yang sama."], nik_ganda: ["NIK sama", "NIK ini sudah ada pada data sejenis lain di berkas ini."], luar_kab: ["Di luar kab/kota", "Titik berada di luar kabupaten atau kota berkas ini."]};
/* judul dan baris kedua kartu objek; pribadi bisa kosong (tampilan tersamar), jadi nama diganti keterangan */
export function ringkasObjek(o) {
  const d = o.data || {}, p = o.pribadi || {}, nama = x => x || "tanpa nama", kl = (n, v) => LABEL_NILAI(o.jenis, n, v);
  const pil = []; let judul, sub;
  if (o.jenis === "rumah") { judul = `Rumah ${o.urut}, keluarga ${nama(p.kk)}`; sub = [d.alamat, d.desa].filter(Boolean).join(", "); pil.push(TKL[d.tingkat] || "Tingkat belum didata"); if (d.terendam) pil.push("Terendam"); }
  else if (o.jenis === "prasarana") { judul = `${kl("jenis", d.jenis)} ${d.nama ?? ""}`.trim(); sub = d.desa; pil.push(TKL[d.tingkat] || "Tingkat belum didata", kl("fungsi", d.fungsi)); }
  else if (o.jenis === "titik") { judul = d.nama; sub = [d.desa, d.kapasitas != null ? `kapasitas ${d.kapasitas} jiwa` : null].filter(Boolean).join(", "); pil.push(kl("jenis_tempat", d.jenis_tempat)); }
  else if (o.jenis === "jiwa") { judul = nama(p.nama); sub = [d.umur != null ? `${d.umur} tahun` : null, d.jk ? kl("jk", d.jk) : null, d.desa_asal && `dari ${d.desa_asal}`].filter(Boolean).join(", "); if (d.kk === "diri") pil.push("Kepala keluarga"); if (d.keluar) pil.push(`Keluar ${tglIndo(d.keluar)}`); }
  else if (o.jenis === "korban") { judul = nama(p.nama); sub = [d.umur != null ? `${d.umur} tahun` : null, d.desa].filter(Boolean).join(", "); pil.push(kl("status", d.status)); if (d.status === "hilang" && d.pencarian) pil.push(kl("pencarian", d.pencarian)); }
  else if (o.jenis === "usaha") { judul = `${kl("jenis", d.jenis)}, ${d.besaran} ${kl("satuan", d.satuan)}`; sub = d.desa; }
  else { judul = `${kl("butir", d.butir)}, ${d.jumlah} ${d.satuan ?? ""}`.trim(); sub = d.titik ? "Untuk tempat pengungsian" : d.desa; if (d.mendesak) pil.push("Mendesak"); }
  return {judul: judul || "Tanpa nama", sub: sub || "", pil: pil.filter(Boolean)};
}

/* ---------- nihil per metrik ---------- */
const VITAL = [["listrik_unit", "Listrik"], ["air_unit", "Air bersih"], ["telekom_unit", "Sinyal telekomunikasi"], ["irigasi_unit", "Irigasi"], ["transportasi_unit", "Transportasi"], ["spbu_unit", "SPBU"]];
const LAYANAN = [["sekolah", "Sekolah"], ["faskes", "Fasilitas kesehatan"], ["ibadah", "Tempat ibadah"], ["kantor", "Kantor pemerintah"], ["pasar", "Pasar"]];
const tingkat3 = (awal, nama) => TK.map(([t, l]) => [`${awal}_${t}`, `${nama} ${l.toLowerCase()}`]);
export const METRIK = Object.fromEntries([["meninggal", "Korban meninggal"], ["hilang", "Korban hilang"], ["luka", "Korban luka"], ["mengungsi", "Warga mengungsi"],
  ...tingkat3("rumah", "Rumah"), ["rumah_terendam", "Rumah terendam"], ["prasarana_putus", "Prasarana putus"], ["jalan_km", "Jalan rusak"], ...tingkat3("jembatan", "Jembatan"),
  ...VITAL.map(([k, l]) => [k, `${l} terdampak`]), ...LAYANAN.flatMap(([k, l]) => tingkat3(k, l))]);
export const METRIK_TAB = {rumah: ["rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"], korban: ["meninggal", "hilang", "luka"], jiwa: ["mengungsi"],
  prasarana: ["prasarana_putus", "jalan_km", ...TK.map(([t]) => "jembatan_" + t), ...VITAL.map(x => x[0]), ...LAYANAN.flatMap(([k]) => TK.map(([t]) => `${k}_${t}`))]};
export const namaMetrik = m => METRIK[m] ?? m;
/* nilai rekap -> teks; kosong tidak pernah tampil 0 (D9, D15) */
const SATUAN = m => ["meninggal", "hilang", "luka"].includes(m) ? "orang" : m === "mengungsi" ? "jiwa" : m.startsWith("rumah_") ? "rumah" : m === "jalan_km" ? "km" : "unit";
export const teksRekap = (v, m) => v == null ? "belum didata" : `${Number(v).toLocaleString("id-ID", {maximumFractionDigits: 1})} ${SATUAN(m)}`;
/* tanggal ISO (YYYY-MM-DD) atau cap waktu -> "20 November 2026"; kosong tetap kosong */
export const tglIndo = t => { if (t == null || t === "") return null; const d = typeof t === "number" ? new Date(t) : new Date(`${t}T00:00:00Z`); return Number.isNaN(+d) ? String(t) : d.toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: typeof t === "number" ? undefined : "UTC"}); };
/* saluran antrean menurut isian: jenis yang punya butir pribadi (spek f[4]) selalu rahasia (D21) */
export const saluranJenis = jenis => punyaPribadi(jenis) ? "rahasia" : "umum";
/* label butir dan nilai untuk tampilan data pribadi staf */
export const labelButir = (jenis, n) => FORM[jenis]?.find(f => f[0] === n)?.[1] ?? n.replace(/_/g, " ");
export const teksNilai = (jenis, n, v) => Array.isArray(v) ? v.map(x => LABEL_NILAI(jenis, n, x)).join(", ") : v === "tidak_ada" ? "Tidak ada" : FORM[jenis]?.find(f => f[0] === n)?.[2].t === "tanggal" ? tglIndo(v) : LABEL_NILAI(jenis, n, v);
export const RINGKAS = [["Korban jiwa", ["meninggal", "hilang", "luka"]], ["Pengungsi", ["mengungsi"]], ["Rumah", ["rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"]], ["Prasarana", ["prasarana_putus", "jalan_km"]]];

/* ---------- status berkas dan kondisi akhir ---------- */
export const STATUS_BERKAS = {terbuka: "Terbuka", usul_tutup: "Menunggu diterima Pusdalops", selesai: "Selesai", selesai_catatan: "Selesai dengan catatan"};
export const STATUS_DARURAT = [["siaga", "Siaga darurat"], ["tanggap_darurat", "Tanggap darurat"], ["transisi", "Transisi darurat ke pemulihan"], ["belum_ditetapkan", "Belum ditetapkan"]];
export function kondisiBaris(k) {
  const baris = k.alasan.map(x => x.teks + (x.nilai != null ? `: ${x.nilai}` : ""));
  return {status: k.status === "selesai" ? "Selesai" : "Selesai dengan catatan", baris, belum: k.belum_didata.map(namaMetrik)};
}
/* galat jaringan atau server sementara = layak masuk antrean luring; selain itu ditampilkan ke pengguna */
export const layakAntre = s => s === 0 || s === 408 || s === 429 || s >= 500;
