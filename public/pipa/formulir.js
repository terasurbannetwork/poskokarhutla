/* SIPPA: daftar medan dan batas form lapangan (SP-007; PRD §9.9, DT §5.5.2, ADR-03).
   Satu sumber untuk tiga pemakai: layar /pipa/lapangan, validasi server (src/sippa.js mengimpor berkas ini
   langsung) dan formulir kertas G3-lite. ES module tanpa DOM dan tanpa global peramban, jadi aman diimpor Worker.
   Batas tiap medan SAMA dengan CHECK migrations/0056_sippa_inti.sql; tests/sippa/formulir.test.mjs membacanya
   dari berkas SQL dan merah bila berselisih. Mengubah satu batas = ubah migrasi baru DAN berkas ini, naikkan FORMULIR_VERSI. */

export const FORMULIR_VERSI = 1;

/* Kedalaman probe (cm). 150 sampai 500 hanya untuk tugas lengan_dalam = 1 (lengan uji, PRD §9.4.7).
   Batas atasnya adalah anggota terbesar daftar CHECK sippa_probe.kedalaman_cm; batas kebijakan injeksi
   tinggal di konstanta tunggal hitung.js (SP-010) dan dicocokkan oleh uji, bukan disalin ke sini. */
export const KEDALAMAN_CM = { biasa: [10, 30, 50, 100], lengan_dalam: [150, 300, 400, 500] };

const ID = [16, 36];
const STATUS_KIT = ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"];

function medan(nama, label, tipe, o = {}) {
  return { nama, label, tipe, min: o.min ?? null, maks: o.maks ?? null, pilihan: o.pilihan ?? null, wajib: !!o.wajib,
    ...(o.panjang ? { panjang: o.panjang } : {}), ...(o.minEksklusif ? { minEksklusif: true } : {}) };
}
const daftar = (...m) => Object.fromEntries(m.map(x => [x.nama, x]));
const teks = (n, l, min, maks, o = {}) => medan(n, l, "teks", { min, maks, ...o });
const angka = (n, l, min, maks, o = {}) => medan(n, l, "angka", { min, maks, ...o });
const bulat = (n, l, min, maks, o = {}) => medan(n, l, "bulat", { min, maks, ...o });
const waktu = (n, l, o = {}) => medan(n, l, "waktu", o);
const pilih = (n, l, pilihan, o = {}) => medan(n, l, "pilihan", { pilihan, ...o });
const bool = (n, l, o = {}) => medan(n, l, "bool", { pilihan: [0, 1], ...o });
const ya = o => ({ ...o, wajib: true });

export const MEDAN = {
  /* sippa_log_gelar: satu sesi gelar. Enam tahap berurutan, angka sesi, medan vonis pilot (keputusan 53). */
  log: daftar(
    teks("id", "ID butir", null, null, ya({ panjang: ID })),
    pilih("jenis", "Jenis sesi", ["karhutla", "banjir", "latihan"], { wajib: true }),
    pilih("kelas_medan", "Kelas medan", ["I", "II", "III"]),
    angka("panjang_m", "Panjang trase (m)", 0, 5000),
    bulat("n_orang", "Jumlah orang", 1, 300),
    waktu("t_tiba", "Tiba"),
    waktu("t_mulai_gelar", "Mulai gelar"),
    waktu("t_air_mengalir", "Air mengalir"),
    waktu("t_mulai_injeksi", "Mulai injeksi"),
    waktu("t_selesai", "Selesai"),
    waktu("t_bongkar_selesai", "Bongkar selesai"),
    angka("jam_pompa", "Jam pompa", 0, 720),
    angka("bbm_l", "BBM (L)", 0, 20000),
    angka("air_m3", "Air terpakai (m3)", 0, 1000000),
    angka("banjir_m3", "Air banjir terpompa (m3)", 0, 10000000),
    angka("lat", "Lintang", -11.5, 6.5),
    angka("lon", "Bujur", 94.5, 141.5),
    teks("catatan", "Catatan", null, 1000),
    teks("petak_id", "Kode petak", 3, 40),
    bool("air_sampai_lance", "Air sampai ujung lance"),
    angka("p_ujung_bar", "Tekanan ujung (bar)", 0, 25),
    bulat("p_ujung_menit", "Lama bertahan 2 bar atau lebih (menit)", 0, 1440),
    pilih("p_ujung_sumber", "Sumber tekanan", ["gauge", "operator"]),
    bool("kecelakaan", "Kecelakaan kerja"),
    bulat("bocor_henti_menit", "Henti karena bocor (menit)", 0, 1440),
    medan("konfigurasi", "Konfigurasi kit (JSON)", "json", { maks: 4096 }),
    teks("koreksi_dari", "Mengoreksi butir", null, null, { panjang: ID }),
    waktu("waktu_klien", "Waktu perangkat", { wajib: true }),
  ),
  /* sippa_probe: satu suhu gambut pada satu titik, tahap, dan kedalaman. */
  probe: daftar(
    teks("id", "ID butir", null, null, ya({ panjang: ID })),
    teks("log_id", "Sesi gelar", null, null, { panjang: ID }),
    teks("petak_id", "Kode petak", 3, 40),
    teks("titik", "Kode titik", 1, 20, { wajib: true }),
    pilih("tahap", "Tahap", ["sebelum", "sesudah", "24j", "72j", "7h", "30h", "90h"], { wajib: true }),
    pilih("kedalaman_cm", "Kedalaman (cm)", [...KEDALAMAN_CM.biasa, ...KEDALAMAN_CM.lengan_dalam], { wajib: true }),
    angka("suhu_c", "Suhu (°C)", -10, 900, { wajib: true }),
    waktu("waktu", "Waktu ukur", { wajib: true }),
  ),
  /* sippa_bbm: buku BBM, hanya ditambah. */
  bbm: daftar(
    teks("id", "ID butir", null, null, ya({ panjang: ID })),
    teks("log_id", "Sesi gelar", null, null, { panjang: ID }),
    waktu("waktu", "Waktu", { wajib: true }),
    pilih("jenis", "Jenis BBM", ["bensin", "solar"], { wajib: true }),
    pilih("aksi", "Aksi", ["terima", "keluar", "kembali", "koreksi"], { wajib: true }),
    angka("liter", "Liter", 0, 20000, { wajib: true, minEksklusif: true }),
    teks("operator", "Operator", null, 80),
    teks("tiket", "Nomor tiket", null, 40),
  ),
  /* sippa_gerak: pindah kit. Transisi sah dan hak per peran ditegakkan D1 dan src/sippa.js, bukan di sini. */
  gerak: daftar(
    teks("id", "ID butir", null, null, ya({ panjang: ID })),
    pilih("dari_status", "Status asal", STATUS_KIT, { wajib: true }),
    pilih("ke_status", "Status tujuan", STATUS_KIT, { wajib: true }),
    teks("ke_lokasi", "Lokasi tujuan", null, 120),
    angka("lat", "Lintang", -11.5, 6.5),
    angka("lon", "Bujur", 94.5, 141.5),
    teks("prov", "Kode provinsi", null, null, { panjang: [2] }),
    teks("kab", "Kabupaten atau kota", null, 60),
    pilih("alasan", "Alasan", ["pra_posisi", "gelar", "bongkar", "pindah_banjir", "kembali", "servis", "hilang", "ditemukan", "pensiun", "koreksi"], { wajib: true }),
    bool("rencana", "Gerak terencana"),
    angka("eta_jam", "Perkiraan tiba (jam)", 0, 720),
    waktu("tiba", "Waktu tiba"),
    pilih("pengangkut", "Pengangkut", ["yontp", "bpbd", "daops", "manggala_agni", "lain"]),
    teks("permintaan_dari", "Permintaan dari", null, 120),
    teks("catatan", "Catatan", null, 500),
    waktu("waktu", "Waktu catat", { wajib: true }),
  ),
};

/* Kolom tabel yang BUKAN isian klien: diisi atau diturunkan server. Uji memastikan medan + daftar ini = semua kolom. */
export const DIISI_SERVER = {
  log: ["tugas_id", "kit_id", "kompleks_id", "prov", "foto_id", "jam_klien_meleset", "diterima", "oleh", "dummy"],
  probe: ["tugas_id", "oleh", "dummy"],
  bbm: ["kit_id", "oleh", "dummy"],
  gerak: ["kit_id", "tugas_id", "oleh", "dummy"],
};

export const JENIS_TABEL = { log: "sippa_log_gelar", probe: "sippa_probe", bbm: "sippa_bbm", gerak: "sippa_gerak" };

/* Pasangan [lebih awal, lebih akhir] yang ditolak trigger sippa_log_urut bila terbalik. Persis daftar trigger:
   t_mulai_injeksi sengaja tidak dibandingkan dengan t_selesai dan t_bongkar_selesai. */
export const URUTAN_WAKTU = [
  ["t_tiba", "t_mulai_gelar"], ["t_mulai_gelar", "t_air_mengalir"], ["t_air_mengalir", "t_mulai_injeksi"],
  ["t_air_mengalir", "t_selesai"], ["t_selesai", "t_bongkar_selesai"], ["t_tiba", "t_air_mengalir"],
  ["t_tiba", "t_mulai_injeksi"], ["t_tiba", "t_selesai"], ["t_tiba", "t_bongkar_selesai"],
  ["t_mulai_gelar", "t_mulai_injeksi"], ["t_mulai_gelar", "t_selesai"], ["t_mulai_gelar", "t_bongkar_selesai"],
  ["t_air_mengalir", "t_bongkar_selesai"],
];

const n = v => Number(v).toLocaleString("id-ID");
const ada = v => v !== undefined && v !== null;

function cekMedan(m, v, opsi) {
  if (!ada(v)) return m.wajib ? "wajib diisi" : null;
  switch (m.tipe) {
    case "teks": case "json": {
      if (typeof v !== "string") return "harus berupa teks";
      if (m.tipe === "json") { try { JSON.parse(v); } catch { return "bukan JSON yang sah"; } }
      if (m.panjang && !m.panjang.includes(v.length)) return `panjang harus ${m.panjang.map(n).join(" atau ")} karakter`;
      if (m.min != null && v.length < m.min) return `minimal ${n(m.min)} karakter`;
      if (m.maks != null && v.length > m.maks) return `maksimal ${n(m.maks)} karakter`;
      return null;
    }
    case "pilihan": case "bool": {
      if (!m.pilihan.includes(v)) return `harus salah satu dari ${m.pilihan.map(String).join(", ")}`;
      if (m.nama === "kedalaman_cm" && KEDALAMAN_CM.lengan_dalam.includes(v) && !(opsi && opsi.lengan_dalam)) {
        return "kedalaman 150 cm atau lebih hanya untuk tugas lengan uji (lengan_dalam)";
      }
      return null;
    }
    default: {
      if (typeof v !== "number" || !Number.isFinite(v)) return "harus berupa angka";
      if ((m.tipe === "bulat" || m.tipe === "waktu") && !Number.isInteger(v)) return "harus bilangan bulat";
      if (m.min != null && (m.minEksklusif ? v <= m.min : v < m.min)) return m.maks != null
        ? `harus ${m.minEksklusif ? "lebih dari" : "antara"} ${n(m.min)}${m.minEksklusif ? " dan paling banyak" : " dan"} ${n(m.maks)}`
        : `minimal ${n(m.min)}`;
      if (m.maks != null && v > m.maks) return `harus antara ${n(m.min ?? 0)} dan ${n(m.maks)}`;
      return null;
    }
  }
}

/* Periksa satu butir kiriman klien. Mengembalikan {ok, galat:[{medan, pesan}]}; semua galat dikumpulkan.
   opsi.lengan_dalam: tugas boleh probe 150 sampai 500 cm. Medan di luar MEDAN ditolak (kolom server tidak dikirim klien). */
export function cekButir(jenis, butir, opsi = {}) {
  const galat = [];
  const ke = (medanNama, pesan) => { if (!galat.some(g => g.medan === medanNama)) galat.push({ medan: medanNama, pesan }); };
  const def = Object.hasOwn(MEDAN, jenis) ? MEDAN[jenis] : null;
  if (!def) return { ok: false, galat: [{ medan: "jenis", pesan: `jenis butir tidak dikenal: ${String(jenis)}` }] };
  if (!butir || typeof butir !== "object" || Array.isArray(butir)) return { ok: false, galat: [{ medan: "butir", pesan: "butir harus berupa objek" }] };
  for (const k of Object.keys(butir)) if (!Object.hasOwn(def, k)) ke(k, "medan tidak dikenal");
  for (const m of Object.values(def)) { const p = cekMedan(m, butir[m.nama], opsi); if (p) ke(m.nama, p); }
  if (jenis === "log") {
    for (const [awal, akhir] of URUTAN_WAKTU) {
      if (Number.isInteger(butir[awal]) && Number.isInteger(butir[akhir]) && butir[akhir] < butir[awal]) {
        ke(akhir, `tidak boleh lebih awal dari ${def[awal].label.toLowerCase()}`);
      }
    }
    if (ada(butir.banjir_m3) && butir.jenis !== "banjir") ke("banjir_m3", "hanya untuk sesi jenis banjir");
  }
  if (jenis === "gerak" && butir.rencana !== 1 && !ada(butir.tiba) && !galat.some(g => g.medan === "rencana")) {
    ke("tiba", "wajib diisi untuk gerak langsung; hanya gerak terencana boleh tanpa waktu tiba");
  }
  return { ok: galat.length === 0, galat };
}
