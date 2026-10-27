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

/* SP-094 (keputusan 56): butir inspeksi pra/pasca gelar dari operator. Bukan bagian MEDAN: ia tidak punya tabel butir sendiri, tetapi masuk
   sippa_inspeksi lewat butirInspeksi di src/sippa.js. Kit tugas ditentukan server (kit_id dari klien ditolak). Uji membandingkan dengan 0059 dan src/sippa.js. */
export const INSPEKSI_LAPANGAN = {
  jenis: ["pra_gelar", "pasca_gelar"], sasaran_jenis: ["komponen", "kit"],
  tindakan: ["tidak_ada", "perbaiki", "ganti", "afkir", "uji_ulang", "serahkan"],
};
export const TINDAKAN_TUNGGU = "tunggu_suku_cadang";
const MEDAN_INSPEKSI = daftar(
  teks("id", "ID butir", null, null, ya({ panjang: ID })),
  pilih("jenis", "Jenis inspeksi", INSPEKSI_LAPANGAN.jenis, { wajib: true }),
  pilih("sasaran_jenis", "Sasaran", INSPEKSI_LAPANGAN.sasaran_jenis, { wajib: true }),
  teks("sasaran_id", "ID sasaran", null, null, ya({ panjang: [16] })),
  bulat("skor", "Skor kondisi", 0, 3, { wajib: true }),
  angka("jam_operasi", "Jam operasi", 0, 100000),
  teks("temuan", "Temuan", null, 1000),
  pilih("tindakan", "Tindakan", [...INSPEKSI_LAPANGAN.tindakan, TINDAKAN_TUNGGU]),   // SP-131: tunggu_suku_cadang (CHECK di migrasi 0070; INSPEKSI_LAPANGAN.tindakan tetap = 0059)
  waktu("waktu_klien", "Waktu catat"),
);
export const cekInspeksiLapangan = butir => cekButir("inspeksi", butir);

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
  const def = jenis === "inspeksi" ? MEDAN_INSPEKSI : Object.hasOwn(MEDAN, jenis) ? MEDAN[jenis] : null;
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

/* ---------- Fase 2 (keputusan 61, SP-120 sampai SP-129): butir lapangan tanpa tabel di MEDAN ----------
   Kontrak medan = src/sippa_lapangan.js (cekLapangan). Tinggal di berkas ini, bukan modul baru, karena /pipa/lapangan hanya menyimpan
   formulir.js, antre.js, ikon.js untuk luring. Foto bukti tidak lewat sini: ia berangkat lewat /lapangan/foto dengan tahap, lat, lon. */
export const JENIS_FASE2 = ["periksa", "sos", "tekanan", "jejak", "selesai", "bor", "debit"];
export const TAHAP_FOTO = [["tiba", "Tiba"], ["pompa", "Pompa terpasang"], ["gelar", "Selang tergelar"], ["injeksi", "Injeksi"], ["selesai", "Selesai"]];
/* urutan kerja renlap (teks.py "kerja"): satu langkah satu centang berjam */
export const LANGKAH_PERIKSA = [["sehari_sebelum", "Sehari sebelumnya: cek air, jalan, izin desa"], ["tiba", "Tiba dan pengarahan keselamatan"], ["pasang_petak", "Pasang petak dan bor tebal gambut"],
  ["ukur_sebelum", "Ukur suhu sebelum dan foto petak"], ["pasang_pompa", "Pasang pompa dan selang"], ["alirkan_air", "Alirkan air"], ["suntik_semprot", "Suntik dan semprot"],
  ["ukur_sesudah", "Ukur suhu sesudah"], ["bongkar", "Bongkar dan catat alat"]];
export const MODA_JEJAK = [["jalan_kaki", "Jalan kaki"], ["perahu", "Perahu"], ["kendaraan", "Kendaraan"]];
export const TITIK_TEKANAN = [["pompa", "Pompa"], ["manifold", "Manifold"], ["lance", "Lance"]];
export const KEBUTUHAN_DEBIT_LPS = 5;   // kebutuhan satu kit (L/s), asumsi kebijakan renlap
export const BAR_MIN_LANCE = 2, PENGINGAT_TEKANAN_MS = 10 * 60000, SOS_TAHAN_MS = 2000;
export const JEJAK = {jarakM: 20, selangMs: 30000, maks: 500};

const dalam = (v, a, z) => typeof v === "number" && Number.isFinite(v) && v >= a && v <= z;
const r3 = x => Math.round(x * 1000) / 1000;

/* debit L/s: pelampung = lebar x dalam x kecepatan x 0,85 x 1000; ember = liter per detik. null bila isian belum lengkap. Sama dengan hitungDebit server. */
export function hitungDebit(d) {
  if (!d) return null;
  if (d.metode === "pelampung") return dalam(d.lebar_m, 0.01, 500) && dalam(d.dalam_m, 0.01, 50) && dalam(d.kecepatan_ms, 0.01, 20) ? r3(d.lebar_m * d.dalam_m * d.kecepatan_ms * 0.85 * 1000) : null;
  if (d.metode === "ember") return dalam(d.volume_l, 0.01, 100000) && dalam(d.detik, 0.5, 3600) ? r3(d.volume_l / d.detik) : null;
  return null;
}
/* debit dibanding kebutuhan satu kit: kata dan rasio, tanpa menghakimi di bawah ambang yang belum teruji */
export const bandingDebit = lps => lps == null ? null : {lps, rasio: lps / KEBUTUHAN_DEBIT_LPS, cukup: lps >= KEBUTUHAN_DEBIT_LPS};

/* aturan ganti petak renlap: kurang dari 50 cm bukan gambut, kurang dari 100 cm lance tembus ke tanah biasa */
export function peringatanBor(cm) {
  if (!dalam(cm, 0, 1500)) return null;
  if (cm < 50) return "Kurang dari 50 cm: ini bukan gambut. Pindah ke petak lain.";
  if (cm < 100) return "Kurang dari 100 cm: lance bisa tembus ke tanah biasa. Pertimbangkan ganti petak.";
  return null;
}
export const peringatanTekanan = (titik, bar) => titik === "lance" && dalam(bar, 0, 25) && bar < BAR_MIN_LANCE ? "Di bawah 2 bar di lance: air belum cukup menembus. Naikkan gas pelan-pelan." : null;
/* pengingat tiap 10 menit saat sesi gelar aktif (sudah air mengalir, belum selesai); terakhir = ms catatan tekanan atau pengingat terakhir */
export function pengingatTekanan({aktif, terakhir, kini}) {
  if (!aktif) return {perlu: false, sisaMs: null};
  const sisa = PENGINGAT_TEKANAN_MS - (kini - (terakhir ?? 0));
  return {perlu: sisa <= 0, sisaMs: Math.max(0, sisa)};
}

/* jarak meter antara dua titik (haversine) */
export function jarakM(a, b) {
  const R = 6371008.8, rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/* Perekam jejak: titik baru disimpan bila sudah 20 m dari titik tersimpan terakhir ATAU 30 detik sejak itu. Mengembalikan larik yang sama bila tidak disimpan.
   Penuh (500): setiap titik kedua dibuang dan perekaman terus, supaya bentuk jejak tetap utuh dari awal sampai akhir (titik awal dan akhir tidak hilang). */
export function tambahTitikJejak(titik, baru, o = JEJAK) {
  if (!Array.isArray(baru) || !dalam(baru[0], -11.5, 6.5) || !dalam(baru[1], 94.5, 141.5) || !dalam(baru[2], 1, 9e15)) return titik;
  const akhir = titik.at(-1);
  if (akhir && jarakM(akhir, baru) < o.jarakM && baru[2] - akhir[2] < o.selangMs) return titik;
  let hasil = [...titik, baru];
  if (hasil.length > o.maks) hasil = [...hasil.filter((_, i) => i % 2 === 0 || i === hasil.length - 1)];
  return hasil;
}
export const panjangJejakM = titik => titik.reduce((s, t, i) => i ? s + jarakM(titik[i - 1], t) : 0, 0);

/* validasi klien butir fase 2: aturan sama dengan cekLapangan server; mengembalikan {ok, galat:[{medan,pesan}]} seperti cekButir */
export function cekFase2(jenis, b) {
  const galat = [], ke = (medan, pesan) => galat.push({medan, pesan});
  if (!JENIS_FASE2.includes(jenis)) return {ok: false, galat: [{medan: "jenis", pesan: `jenis butir tidak dikenal: ${String(jenis)}`}]};
  if (!b || typeof b !== "object" || Array.isArray(b)) return {ok: false, galat: [{medan: "butir", pesan: "butir harus berupa objek"}]};
  const bom = (k) => { if (b[k] != null && !(Array.isArray(b[k]) && b[k].length <= 100 && b[k].every(x => typeof x === "string" && /^[A-Z]{1,4}-\d{1,6}$/.test(x)))) ke(k, "harus daftar kode BOM seperti P-101"); };
  if (b.petak_id != null && !(typeof b.petak_id === "string" && /^[A-Za-z0-9._ -]{1,40}$/.test(b.petak_id))) ke("petak_id", "1 sampai 40 karakter huruf, angka, titik, garis, spasi");
  if (jenis === "jejak") {
    if (!Array.isArray(b.titik) || b.titik.length < 2 || b.titik.length > JEJAK.maks) ke("titik", "harus 2 sampai 500 titik");
    else if (!b.titik.every(t => Array.isArray(t) && t.length === 3 && dalam(t[0], -11.5, 6.5) && dalam(t[1], 94.5, 141.5) && dalam(t[2], 1, 9e15))) ke("titik", "tiap titik harus [lintang, bujur, waktu] di dalam Indonesia");
    if (!MODA_JEJAK.some(m => m[0] === b.moda)) ke("moda", "harus jalan_kaki, perahu, atau kendaraan");
    return {ok: !galat.length, galat};
  }
  if (jenis !== "jejak" && !dalam(b.waktu, 1, 9e15)) ke("waktu", "wajib diisi");
  if (jenis === "periksa" && !(typeof b.langkah === "string" && /^[a-z0-9_]{2,40}$/.test(b.langkah))) ke("langkah", "2 sampai 40 karakter a-z, 0-9, garis bawah");
  if (jenis === "tekanan") { if (!TITIK_TEKANAN.some(t => t[0] === b.titik)) ke("titik", "harus pompa, manifold, atau lance"); if (!dalam(b.bar, 0, 25)) ke("bar", "harus antara 0 dan 25"); }
  if (jenis === "selesai") { bom("alat_kembali"); bom("alat_hilang"); }
  if (jenis === "sos" || jenis === "bor" || jenis === "debit") { if (!dalam(b.lat, -11.5, 6.5)) ke("lat", "di luar Indonesia"); if (!dalam(b.lon, 94.5, 141.5)) ke("lon", "di luar Indonesia"); }
  if (jenis === "sos" && b.pesan != null && !(typeof b.pesan === "string" && [...b.pesan].length <= 200)) ke("pesan", "paling banyak 200 karakter");
  if ((jenis === "selesai" || jenis === "bor") && b.catatan != null && !(typeof b.catatan === "string" && [...b.catatan].length <= (jenis === "bor" ? 200 : 500))) ke("catatan", `paling banyak ${jenis === "bor" ? 200 : 500} karakter`);
  if (jenis === "bor" && !dalam(b.kedalaman_cm, 0, 1500)) ke("kedalaman_cm", "harus antara 0 dan 1.500");
  if (jenis === "debit") {
    if (b.metode === "pelampung") { if (hitungDebit(b) == null) ke("lebar_m", "isi lebar, kedalaman, dan kecepatan dengan angka lebih dari 0"); }
    else if (b.metode === "ember") { if (hitungDebit(b) == null) ke("volume_l", "isi volume dan detik dengan angka lebih dari 0 (detik minimal 0,5)"); }
    else ke("metode", "harus pelampung atau ember");
  }
  const kenal = {periksa: ["langkah", "waktu", "petak_id"], sos: ["lat", "lon", "waktu", "pesan"], tekanan: ["titik", "bar", "waktu", "petak_id"], selesai: ["waktu", "alat_kembali", "alat_hilang", "catatan"],
    bor: ["petak_id", "lat", "lon", "kedalaman_cm", "waktu", "catatan"], debit: ["metode", "lat", "lon", "waktu", "lebar_m", "dalam_m", "kecepatan_ms", "volume_l", "detik"]}[jenis];
  for (const k of Object.keys(b)) if (k !== "id" && !kenal.includes(k)) ke(k, "medan tidak dikenal");
  return {ok: !galat.length, galat};
}
