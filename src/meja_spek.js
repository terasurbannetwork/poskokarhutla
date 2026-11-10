/* Meja Kerja: spesifikasi sebelas meja (kolom, status, transisi, tanda bahaya) + validasi + status turunan. Semua meja lewat SATU mesin di src/meja.js.
   Daftar meja, status per meja, dan transisi HARUS sama dengan CHECK/trigger migrations/0118_meja_juklak.sql (dijaga tests/warga/meja.test.mjs).
   Sifat meja: pusat (milik BNPB pusat, wilayah tetap PUSAT, tanpa petugas berkode), adminIsi (admin bisa menambah dari /admin/meja), publik:false (keluar dari /api/meja/ringkas), rapor:false (tidak mengubah skor rapor BPBD).
   Impor lewat worker.js dulu bila dipakai sendirian (posko.js dan worker.js saling impor). */
import {tx, num, tglSah, wib} from "./posko.js";
import {nilai, tenggat} from "../public/inti/jam_aturan.js";   // MB-2: angka tenggat berpasal hanya hidup di sana
import {kelengkapan, bentrokNihil, BAGIAN} from "../public/inti/kelengkapan.js";

const HARI = 864e5, JAM = 36e5;
export const BENCANA = ["banjir", "longsor", "karhutla", "gempa", "tsunami", "gunungapi", "kekeringan", "cuaca_ekstrem", "rob", "lainnya"];
export const BARANG = ["beras", "air_mineral", "makanan_siap_saji", "selimut", "tenda", "terpal", "family_kit", "hygiene_kit", "obat", "popok_bayi", "susu_bayi", "pembalut", "masker", "genset", "lainnya"];
/* ambang tanda bahaya. Berpasal = dari Jam Aturan; "internal" = tanda kerja tanpa pasal (asumsi), tampil berlabel di layar */
export const AMBANG = {
  kaji_awal_jam: nilai("kaji_awal"),                    // Juklak 3/2022 hal. 16
  kaji_lanjutan_jam: nilai("kaji_lanjutan"),            // Juklak 3/2022 hal. 16 (dua tahap penuh = WIL-3)
  logistik_setuju_jam: nilai("logistik_setuju_jam"),    // internal
  dsp_lapor_tanggal: nilai("dsp_laporan_perkembangan"), // Perban 4/2020 Pasal 21 ayat (1)
  dsp_spj_bulan: nilai("dsp_spj"),                      // Perban 4/2020 Pasal 21 ayat (2)
  renkon_berlaku_tahun: nilai("renkon_berlaku"),        // Perban 2/2023 Pasal 21
  renkon_reviu_bulan: nilai("renkon_reviu"),            // Perban 2/2023 Pasal 21
  renkon_segera_hari: nilai("renkon_segera_hari"),      // internal
  destana_nilai_tahun: nilai("destana_penilaian"),      // Perban 7/2025 Pasal 14 ayat (5)
  destana_pasif_bulan: nilai("destana_pasif_bulan"),    // internal
  rehab_macet_hari: nilai("rehab_macet_hari"),          // internal
  data_dinamis_hari: nilai("data_dinamis_darurat"),     // Juklak 7/2023 BAB II huruf A (hal. 3)
};
export const AMBANG_INTERNAL = ["logistik_setuju_jam", "renkon_segera_hari", "destana_pasif_bulan", "rehab_macet_hari"];
const ASUMSI = " (asumsi internal, bukan pasal)";
/* Rapor kinerja BPBD: indeks komposit, BOBOT SEMENTARA (belum diuji balik). Komponen tanpa data dilewati dan bobot sisanya dinormalkan ulang. */
export const RAPOR = {bobot: {respons: 35, keaktifan: 25, kelengkapan: 40}, respons_terbaik_menit: 15, respons_terburuk_menit: 120, jendela_panggilan_hari: 30, jendela_regu_hari: 7};

const URUT_TGL = ["tgl_jitupasna", "tgl_usulan", "tgl_setuju", "tgl_cair", "tgl_bangun", "tgl_selesai"];
const k = (nama, label, tipe, o = {}) => ({nama, label, tipe, ...o});
const angka = (nama, label, o = {}) => k(nama, label, "angka", {min: 0, maks: 1e6, wajib: true, ...o});
const tgl = (nama, label, o = {}) => k(nama, label, "tanggal", o);
const rupiah = (nama, label, o = {}) => angka(nama, label, {maks: 1e13, rupiah: true, ...o});
/* Juklak 9/2023 Format 2: enam kelompok umur, jenis disabilitas, enam sektor kebutuhan */
const UMUR = [["bayi", "Bayi 0-11 bulan"], ["balita", "Balita 12-59 bulan"], ["anak", "Anak 5-12 tahun"], ["remaja", "Remaja 13-17 tahun"], ["dewasa", "Dewasa 18-59 tahun"], ["lansia", "Lansia 60 tahun ke atas"]];
const DISABILITAS = [["dis_kursi_roda", "perlu kursi roda"], ["dis_tongkat", "perlu tongkat siku"], ["dis_rungu", "tuna rungu"], ["dis_netra", "tuna netra"], ["dis_wicara", "tuna wicara"], ["dis_intelektual", "intelektual atau mental"], ["dis_ganda", "ganda"], ["dis_lain", "lainnya"]];
const SEKTOR = [["keb_air", "Air bersih dan sanitasi"], ["keb_pangan", "Pangan"], ["keb_sandang", "Sandang dan nonpangan"], ["keb_kesehatan", "Kesehatan dan psikososial"], ["keb_hunian", "Penampungan dan hunian sementara"], ["keb_pendidikan", "Pendidikan darurat"]];
const HITUNG_PENGUNGSI = [["jiwa_total", "Total jiwa"], ["jiwa_l", "Total laki-laki"], ["jiwa_p", "Total perempuan"], ...UMUR.map(([u, t]) => ["umur_" + u, t])];
/* belum ditelaah: tenggat terpanjang, supaya tanda yang terbit tetap benar apa pun kategori hasil telaahnya */
const kunciAduan = d => d.kategori === "tidak_berkadar_pengawasan" ? "pengaduan_tak_berkadar" : "pengaduan_berkadar";

/* ---------------------------------------------------------------- meja dampak (Juklak 7/2023 Lampiran I huruf A; DATA-DAMPAK.md) */
/* jenis = kode jenis Logbook (src/logbook.js JENIS); sama persis dijaga tests/warga/meja.test.mjs */
export const JENIS_DAMPAK = ["banjir", "cuaca", "kebakaran_permukiman", "karhutla", "longsor", "gempabumi", "gunungapi", "kekeringan", "kecelakaan", "konflik_sosial", "lainnya", "gelombang_pasang", "tsunami", "wabah"];
export const STATUS_DARURAT = ["belum_ditetapkan", "siaga", "tanggap", "transisi"];
const DARURAT_AKTIF = ["siaga", "tanggap", "transisi"];
/* teks bebas: tanpa data pribadi. Dinormalkan dulu (NFKC, buang U+00AD/U+2060/U+034F dan karakter lebar-nol, digit Unicode jadi ASCII) supaya nomor tidak lolos lewat penyamaran.
   HP: 08 atau +62 dengan pemisah spasi . - / _ ( ); NIK: 16 digit dengan pemisah yang sama; plus frasa penanda orang. Koordinat "-6,597998; 106,797429" dan tanggal tidak kena (koma/titik koma/titik dua bukan pemisah).
   Pola HP sama dengan RE_HP_NARASI di src/logbook.js supaya terima ke Logbook tidak gagal. */
const SEP = "[\\s.\\-/_()]*";
const RE_HP_BEBAS = new RegExp(`(?:^|\\D)(?:\\+?62|0)${SEP}8(?:${SEP}\\d){7,}`), RE_NIK = new RegExp(`\\d(?:${SEP}\\d){15,}`);
const RE_FRASA = [/(?<![\p{L}])atas\s+nama(?![\p{L}])/iu, /(?<![\p{L}])(?:[Aa]\.[Nn]|[Aa][Nn])\.\s*\p{Lu}/u, /(?<![\p{L}])(?:[Aa]lmarhum(?:ah)?|[Aa]lm)\.?\s+\p{Lu}/u, /(?<![\p{L}])RT\.?\s*\d+\s*[\/\-,]?\s*RW\.?\s*\d+/i];
const nilaiDigit = c => { let n = 0, cp = c.codePointAt(0); while (n < 9 && /^\p{Nd}$/u.test(String.fromCodePoint(cp - n - 1))) n++; return String(n % 10); };   // digit Unicode: urutan dalam deretnya (selalu mulai dari nol)
export const normalTeks = t => String(t).replace(/[\u00AD\u2060\u034F\u200B-\u200D\uFEFF]/g, "").normalize("NFKC").replace(/[\u00AD\u2060\u034F\u200B-\u200D\uFEFF]/g, "").replace(/\p{Nd}/gu, c => /[0-9]/.test(c) ? c : nilaiDigit(c));
export const teksBersih = t => { const n = normalTeks(t); return RE_HP_BEBAS.test(n) || RE_NIK.test(n) || n.includes("@") || RE_FRASA.some(r => r.test(n)) ? "tidak boleh memuat data pribadi (nomor telepon, NIK, surel, atas nama, almarhum, RT/RW)" : ""; };
const dk = (bagian, nama, label, tipe, o = {}) => k(nama, label, tipe, {bagian, ...o});
const da = (bagian, nama, label, o = {}) => dk(bagian, nama, label, "angka", {min: 0, maks: 1e6, ...o});   // tidak wajib: kosong = belum didata, 0 = tidak ada
const dt = (bagian, nama, label, maks, o = {}) => dk(bagian, nama, label, "teks", {maks, bersih: true, ...o});
const TINGKAT = [["rb", "rusak berat"], ["rs", "rusak sedang"], ["rr", "rusak ringan"], ["terendam", "terendam"]];
const nihil = (bagian, label) => dk(bagian, "nihil_" + bagian, label, "ya", {nihil: true});
const rugi = (bagian, nama, label, bila) => da(bagian, nama, `Taksiran kerugian ${label} (juta rupiah)`, {maks: 1e6, desimal: true, bila});
const per = (bagian, awalan, label, o = {}) => TINGKAT.map(([t, n]) => da(bagian, `${awalan}_${t}`, `${label}, ${n} (unit)`, o));
const UMUR_DAMPAK = [["anak", "anak-anak 0-17 tahun"], ["dewasa", "dewasa 18-59 tahun"], ["lansia", "lansia 60 tahun ke atas"]], KORBAN = [["meninggal", "Meninggal"], ["hilang", "Hilang"], ["luka", "Luka/sakit"], ["mengungsi", "Mengungsi"], ["terdampak", "Terdampak"]];
const HA = [["sawah", "Sawah"], ["lahan", "Lahan"], ["kebun", "Kebun"], ["hutan", "Hutan"], ["kolam", "Kolam"]];
const UNIT_VITAL = [["air", "Jaringan air bersih/minum"], ["listrik", "Jaringan listrik dan lampu penerangan"], ["telekom", "Jaringan telekomunikasi"], ["irigasi", "Jaringan irigasi"], ["transportasi", "Jaringan transportasi (pelabuhan, bandara, terminal, stasiun)"], ["spbu", "Sarana pengisian bahan bakar umum"]];
const LAYANAN = [["ibadah", "Rumah ibadat"], ["faskes", "Fasilitas pelayanan kesehatan"], ["sekolah", "Satuan pendidikan"], ["kantor", "Kantor"], ["pasar", "Pasar"]];
const kolomDampak = () => [
  dk("kejadian", "jenis", "Jenis bencana", "pilih", {nilai: JENIS_DAMPAK, wajib: true, inti: true}), dt("kejadian", "nama_kejadian", "Nama kejadian", 120, {wajib: true, inti: true}),
  dk("kejadian", "tanggal", "Tarikh (tanggal kejadian)", "tanggal", {wajib: true, maks: "hariini", inti: true}), dt("kejadian", "jam", "Waktu kejadian (jam:menit WIB)", 5, {inti: true, bersih: false}),
  dk("kejadian", "kec", "Kecamatan", "wilayah", {inti: true}), dk("kejadian", "desa", "Kelurahan/desa", "wilayah", {inti: true}),
  dk("kejadian", "bujur", "Longitude (bujur, disarankan 6 angka di belakang koma)", "angka", {min: 94, maks: 142, desimal: 6, inti: true}),
  dk("kejadian", "lintang", "Latitude (lintang, disarankan 6 angka di belakang koma)", "angka", {min: -11.5, maks: 6.5, desimal: 6, inti: true}),
  dt("kejadian", "penyebab", "Penyebab bencana", 300, {inti: true}), dt("kejadian", "kronologis", "Kronologis bencana", 2000, {inti: true}), dt("kejadian", "deskripsi", "Deskripsi", 1000, {inti: true}),
  dt("kejadian", "sumber", "Sumber informasi", 100, {inti: true}), dt("kejadian", "kondisi_mutakhir", "Kondisi mutakhir", 500, {inti: true}),
  dk("kejadian", "status_darurat", "Status keadaan darurat bencana", "pilih", {nilai: STATUS_DARURAT, inti: true}), dt("kejadian", "upaya", "Upaya penanganan", 1000, {inti: true}),
  dk("kejadian", "dokumentasi", "Dokumentasi (tautan)", "tautan", {opsional: true}), dk("kejadian", "sebaran", "Sebaran dampak (tautan peta)", "tautan", {opsional: true}),
  dk("kejadian", "tgl_tuntas", "Tanggal kejadian ditutup (status darurat berakhir)", "tanggal", {maks: "hariini", opsional: true}),
  ...[["dana", "Dana"], ["sdm", "Sumber daya manusia"], ["sarpras", "Sarana dan prasarana"], ["logistik", "Logistik"], ["peralatan", "Peralatan"]].map(([n, t]) => dt("kebutuhan", "keb_" + n, `Kebutuhan ${t}`, 300)),
  nihil("kebutuhan", "Tidak ada kebutuhan yang diminta"),
  ...KORBAN.map(([n, t]) => da("manusia", n, `${t} (jiwa total)`, {maks: 1e7, inti: true})),
  ...KORBAN.flatMap(([n, t]) => UMUR_DAMPAK.flatMap(([u, ut]) => ["l", "p"].map(s => da("manusia", `${n}_${u}_${s}`, `${t}, ${ut}, ${s === "l" ? "laki-laki" : "perempuan"}`, {maks: 1e7, bila: [n]})))),
  ...HA.map(([n, t]) => da("sosek", n + "_ha", `${t} (hektare)`, {maks: 3e6, desimal: true})),
  ...per("sosek", "kios", "Kios/toko"), ...per("sosek", "pabrik", "Pabrik"),
  ...HA.map(([n, t]) => rugi("sosek", "rugi_" + n, t.toLowerCase(), [n + "_ha"])), rugi("sosek", "rugi_kios", "kios/toko", TINGKAT.map(([t]) => "kios_" + t)), rugi("sosek", "rugi_pabrik", "pabrik", TINGKAT.map(([t]) => "pabrik_" + t)),
  nihil("sosek", "Tidak ada kerusakan sosial ekonomi"),
  ...UNIT_VITAL.map(([n, t]) => da("prasarana", n + "_unit", `${t} (unit rusak)`, {maks: 1e5})), da("prasarana", "jalan_km", "Jalan rusak (km)", {maks: 1e5, desimal: true}),
  ...TINGKAT.slice(0, 3).map(([t, n]) => da("prasarana", "jembatan_" + t, `Jembatan, ${n} (unit)`, {maks: 1e5})),
  ...UNIT_VITAL.map(([n, t]) => rugi("prasarana", "rugi_" + n, t.toLowerCase(), [n + "_unit"])), rugi("prasarana", "rugi_jalan", "jalan", ["jalan_km"]), rugi("prasarana", "rugi_jembatan", "jembatan", TINGKAT.slice(0, 3).map(([t]) => "jembatan_" + t)),
  nihil("prasarana", "Tidak ada kerusakan prasarana dan sarana vital"),
  ...per("rumah", "rumah", "Rumah/pemukiman", {inti: true, maks: 1e6}), rugi("rumah", "rugi_rumah", "rumah/pemukiman", TINGKAT.map(([t]) => "rumah_" + t)),
  ...LAYANAN.flatMap(([n, t]) => per("layanan", n, t, {maks: 1e5})), ...LAYANAN.map(([n, t]) => rugi("layanan", "rugi_" + n, t.toLowerCase(), TINGKAT.map(([x]) => n + "_" + x))),
  nihil("layanan", "Tidak ada kerusakan pelayanan dasar"),
  dt("aset", "aset_barang", "Barang yang dipakai untuk penanganan darurat bencana", 400), nihil("aset", "Tidak ada aset atau layanan yang dipakai"),
];
const jam = /^([01]\d|2[0-3]):[0-5]\d$/;
const cekDampak = (d, kolom) => {
  if (d.jam && !jam.test(d.jam)) return "waktu kejadian harus jam:menit 24 jam, contoh 14:30";
  if ((d.bujur == null) !== (d.lintang == null)) return "longitude dan latitude diisi berpasangan";
  for (const [n, t] of KORBAN) { const j = UMUR_DAMPAK.reduce((s, [u]) => s + (d[`${n}_${u}_l`] || 0) + (d[`${n}_${u}_p`] || 0), 0); if (j > (d[n] || 0)) return `jumlah rincian ${t.toLowerCase()} (${j}) tidak boleh melebihi total ${d[n] ?? "kosong"}; isi total dulu atau kecilkan rincian`; }
  if (d.tgl_tuntas && d.tgl_tuntas < d.tanggal) return "tanggal ditutup tidak boleh sebelum tanggal kejadian";
  return bentrokNihil(kolom, d);
};
/* gerbang transisi: dilaporkan ke diverifikasi ditolak bila inti belum lengkap, pesan menyebut butirnya */
const gerbangDampak = (kolom, ke, data, wilayah) => {
  if (ke !== "diverifikasi") return "";
  const h = kelengkapan(kolom, {...data, ...wilayah});
  return h.inti_lengkap ? "" : `verifikasi ditolak: ${h.kurang_inti.length} butir inti belum terjawab: ${h.kurang_inti.map(x => x.label).join("; ")}. Angka 0 dihitung terjawab; bagian tanpa kerusakan dipilih "tidak ada".`;
};

export const MEJA = {
  kaji_cepat: {
    id: "kaji_cepat", nama: "Kaji cepat", ikon: '<path d="M9 4h6v3H9z"/><path d="M7 5H5v16h14V5h-2"/><path d="m9 14 2 2 4-4"/>',
    wilayah: {kec: false, desa: true},
    kolom: [
      k("kejadian", "Bencana", "pilih", {nilai: BENCANA, wajib: true}), tgl("tanggal", "Tanggal kejadian", {wajib: true, maks: "hariini"}),
      angka("rumah_rb", "Rumah rusak berat"), angka("rumah_rs", "Rumah rusak sedang"), angka("rumah_rr", "Rumah rusak ringan"),
      angka("sekolah", "Sekolah rusak", {maks: 1e4}), angka("faskes", "Faskes rusak", {maks: 1e4}), angka("ibadah", "Tempat ibadah rusak", {maks: 1e4}),
      angka("jalan_km", "Jalan rusak (km)", {maks: 1e4, desimal: true}), angka("jembatan", "Jembatan rusak", {maks: 1e4}),
      angka("meninggal", "Meninggal (jiwa)"), angka("hilang", "Hilang (jiwa)"), angka("luka", "Luka (jiwa)"), angka("mengungsi", "Mengungsi (jiwa)"),
      k("foto", "Tautan foto (opsional)", "tautan"),
      /* Juklak 3/2022 Format 1 dan 3/4; semua opsional supaya catatan lama tetap sah */
      angka("terancam_jiwa", "Penduduk terancam (jiwa)", {wajib: false}), angka("terancam_kk", "Penduduk terancam (KK)", {wajib: false}),
      angka("terdampak_jiwa", "Penduduk terdampak (jiwa)", {wajib: false}), angka("terdampak_kk", "Penduduk terdampak (KK)", {wajib: false}),
      angka("rentan_bayi", "Rentan: bayi 0-11 bulan", {wajib: false}), angka("rentan_balita", "Rentan: balita 12-59 bulan", {wajib: false}), angka("rentan_anak", "Rentan: anak 5-17 tahun", {wajib: false}), angka("rentan_lansia", "Rentan: lansia 60 tahun ke atas", {wajib: false}),
      angka("rentan_hamil", "Rentan: ibu hamil", {wajib: false}), angka("rentan_menyusui", "Rentan: ibu menyusui", {wajib: false}), angka("rentan_disabilitas", "Rentan: disabilitas", {wajib: false}), angka("rentan_sakit", "Rentan: orang sakit", {wajib: false}),
      k("kesehatan", "Kebutuhan kesehatan", "teks", {maks: 300}), k("air_sanitasi", "Air bersih dan sanitasi", "teks", {maks: 300}), k("kebutuhan", "Kebutuhan tindakan dan sumber daya", "teks", {maks: 400}),
      k("rek_status", "Rekomendasi status darurat", "pilih", {nilai: ["ya", "tidak"]}), angka("rek_status_hari", "Perkiraan lama status (hari)", {wajib: false, min: 1, maks: 365}), k("rek_alasan", "Alasan rekomendasi", "teks", {maks: 200}),
    ],
    cek: d => d.rek_status === "ya" && !d.rek_status_hari ? "rekomendasi status Ya wajib menyebut perkiraan lama status" : d.rek_status === "tidak" && d.rek_status_hari ? "perkiraan lama status hanya diisi bila rekomendasi status Ya" : "",
    awal: "dilaporkan", status: ["dilaporkan", "diverifikasi", "masuk_jitupasna"],
    transisi: {dilaporkan: {diverifikasi: "petugas"}, diverifikasi: {masuk_jitupasna: "admin"}},
    rekap: ["rumah_rb", "rumah_rs", "rumah_rr", "meninggal", "hilang", "luka", "mengungsi"],
    bahaya: {belum_diverifikasi: `dilaporkan lebih dari ${AMBANG.kaji_awal_jam} jam belum diverifikasi (laporan awal Juklak 3/2022)`},
  },
  logistik: {
    id: "logistik", nama: "Logistik", ikon: '<path d="m3 7 9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("barang", "Barang", "pilih", {nilai: BARANG, wajib: true}), angka("jumlah_diminta", "Jumlah diminta", {min: 1, maks: 1e7}),
      k("satuan", "Satuan", "teks", {wajib: true, maks: 20}), k("posko", "Posko / lokasi", "teks", {wajib: true, maks: 80}),
      angka("kebutuhan_untuk", "Kebutuhan untuk (jiwa)"),
      angka("jumlah_kirim", "Jumlah dikirim", {maks: 1e7, tahap: "dikirim"}), tgl("tgl_kirim", "Tanggal kirim", {wajib: true, tahap: "dikirim"}),
      k("armada", "Armada", "teks", {maks: 60, tahap: "dikirim"}),
      k("gudang_asal", "Gudang asal (stok berkurang otomatis)", "gudang", {tahap: "dikirim"}),
      angka("jumlah_terima", "Jumlah diterima", {maks: 1e7, tahap: "diterima"}), k("penerima", "Penerima", "teks", {wajib: true, maks: 80, tahap: "diterima"}),
    ],
    awal: "diminta", status: ["diminta", "disetujui", "dikirim", "diterima"],
    transisi: {diminta: {disetujui: "admin"}, disetujui: {dikirim: "admin"}, dikirim: {diterima: "petugas"}},
    rekap: ["kebutuhan_untuk"],
    bahaya: {belum_disetujui: `diminta lebih dari ${AMBANG.logistik_setuju_jam} jam belum disetujui${ASUMSI}`, selisih_terima: "jumlah diterima tidak sama dengan jumlah dikirim"},
  },
  dsp: {
    jalurTolak: ["diajukan"],
    id: "dsp", nama: "Dana Siap Pakai", ikon: '<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 1.8-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2"/><path d="M12 6v1.5M12 16.5V18"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("kejadian", "Kejadian", "teks", {wajib: true, maks: 100}), k("nomor_permohonan", "Nomor permohonan", "teks", {wajib: true, maks: 60}),
      rupiah("nilai_diajukan", "Nilai diajukan"), tgl("tgl_ajuan", "Tanggal pengajuan", {wajib: true}),
      tgl("tgl_status_berakhir", "Tanggal status darurat berakhir (opsional)"), tgl("laporan_terakhir", "Laporan perkembangan terakhir (opsional)", {maks: "hariini"}),
      rupiah("nilai_disetujui", "Nilai disetujui", {tahap: "disetujui"}), tgl("tgl_setuju", "Tanggal disetujui", {wajib: true, tahap: "disetujui"}),
      rupiah("nilai_cair", "Nilai cair", {tahap: "cair"}), tgl("tgl_cair", "Tanggal cair", {wajib: true, tahap: "cair"}),
      rupiah("realisasi", "Realisasi", {tahap: "spj"}), tgl("tgl_spj", "Tanggal SPJ", {wajib: true, tahap: "spj"}),
      tgl("tgl_selesai", "Tanggal selesai", {wajib: true, tahap: "selesai"}),
      k("alasan", "Alasan ditolak", "teks", {wajib: true, maks: 200, tahap: "ditolak"}),
    ],
    awal: "diajukan", status: ["diajukan", "disetujui", "cair", "spj", "selesai", "ditolak"],
    transisi: {diajukan: {disetujui: "admin", ditolak: "admin"}, disetujui: {cair: "admin"}, cair: {spj: "petugas"}, spj: {selesai: "admin"}},
    rekap: ["nilai_diajukan", "nilai_disetujui", "nilai_cair", "realisasi"],
    bahaya: {laporan_terlambat: `laporan perkembangan lewat tanggal ${AMBANG.dsp_lapor_tanggal} bulan berikutnya (Perban 4/2020 Pasal 21 ayat 1)`,
      spj_terlambat: `belum SPJ lebih dari ${AMBANG.dsp_spj_bulan} bulan sesudah status darurat berakhir (Perban 4/2020 Pasal 21 ayat 2)`},
    cek: d => d.nilai_disetujui > d.nilai_diajukan ? "nilai disetujui tidak boleh melebihi nilai diajukan"
      : d.nilai_cair > d.nilai_disetujui ? "nilai cair tidak boleh melebihi nilai disetujui" : d.realisasi > d.nilai_cair ? "realisasi tidak boleh melebihi nilai cair" : "",
  },
  renkon: {
    id: "renkon", nama: "Rencana kontinjensi", ikon: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("bencana", "Bencana", "pilih", {nilai: BENCANA, wajib: true}), k("judul", "Judul dokumen", "teks", {wajib: true, maks: 150}),
      tgl("tgl_sah", "Tanggal disahkan", {wajib: true}), tgl("berlaku_sampai", "Berlaku sampai (bawaan 3 tahun sesudah disahkan)"),
      tgl("reviu_terakhir", "Reviu terakhir", {maks: "hariini"}), tgl("uji_terakhir", "Uji terakhir (simulasi/geladi)", {maks: "hariini"}), k("tautan", "Tautan dokumen (http/https)", "tautan"),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["berlaku", "segera_habis", "kedaluwarsa", "perlu_reviu"],
    rekap: [],
    bahaya: {kedaluwarsa: "dokumen sudah kedaluwarsa", perlu_reviu: `belum direviu lebih dari ${AMBANG.renkon_reviu_bulan} bulan (Perban 2/2023 Pasal 21)`},
    cek: d => d.berlaku_sampai && d.berlaku_sampai < d.tgl_sah ? "berlaku sampai tidak boleh sebelum tanggal disahkan"
      : d.berlaku_sampai && d.berlaku_sampai > tenggat("renkon_berlaku", d.tgl_sah).hasil ? `berlaku sampai tidak boleh lebih dari ${AMBANG.renkon_berlaku_tahun} tahun sesudah disahkan (Perban 2/2023 Pasal 21)` : "",
  },
  destana: {
    id: "destana", nama: "Desa tangguh (Destana)", ikon: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    wilayah: {kec: true, desa: true},
    kolom: [
      k("kelas", "Kelas", "pilih", {nilai: ["pratama", "madya", "utama"], wajib: true}), angka("tahun_dibentuk", "Tahun dibentuk", {min: 2000, maks: 2100}),
      tgl("tgl_penilaian", "Penilaian mandiri terakhir", {maks: "hariini"}), tgl("kegiatan_terakhir", "Kegiatan terakhir", {maks: "hariini"}),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["aktif", "pasif"]   /* penilaian_kedaluwarsa hanya TANDA, bukan status turunan (satu status efektif per catatan) */,
    rekap: [],
    bahaya: {pasif: `tidak ada kegiatan lebih dari ${AMBANG.destana_pasif_bulan} bulan${ASUMSI}`,
      penilaian_kedaluwarsa: `penilaian mandiri belum ada atau lebih dari ${AMBANG.destana_nilai_tahun} tahun (Perban 7/2025 Pasal 14 ayat 5)`},
  },
  rehab: {
    id: "rehab", nama: "Rehab-rekon", ikon: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-5h6v5M12 6v3M10.5 7.5h3"/>',
    wilayah: {kec: false, desa: false}, tautKaji: "opsional",   // 0110: kaji cepat induk boleh kosong; bila diisi dijaga trigger meja_rehab_tautan
   
    kolom: [
      k("kejadian_ref", "Rujukan kejadian (nomor SK status atau id episode)", "teks", {maks: 80}),
      angka("rumah_rb", "Rumah rusak berat diusulkan"), angka("rumah_rs", "Rumah rusak sedang diusulkan"), angka("rumah_rr", "Rumah rusak ringan diusulkan"),
      tgl("tgl_jitupasna", "Tanggal masuk JITUPASNA", {wajib: true, maks: "hariini"}),
      rupiah("nilai_usulan", "Nilai usulan stimulan", {tahap: "usulan"}), tgl("tgl_usulan", "Tanggal usulan", {wajib: true, maks: "hariini", tahap: "usulan"}),
      rupiah("nilai_disetujui", "Nilai disetujui", {tahap: "disetujui"}), tgl("tgl_setuju", "Tanggal disetujui", {wajib: true, maks: "hariini", tahap: "disetujui"}),
      rupiah("nilai_cair", "Nilai cair", {tahap: "cair"}), tgl("tgl_cair", "Tanggal cair", {wajib: true, maks: "hariini", tahap: "cair"}),
      angka("rumah_dibangun", "Jumlah rumah dibangun", {tahap: "dibangun"}), tgl("tgl_bangun", "Tanggal pembangunan", {wajib: true, maks: "hariini", tahap: "dibangun"}),
      tgl("tgl_selesai", "Tanggal selesai", {wajib: true, maks: "hariini", tahap: "selesai"}),
      k("alasan", "Alasan ditolak", "teks", {wajib: true, maks: 200, tahap: "ditolak"}),
    ],
    awal: "jitupasna", status: ["jitupasna", "usulan", "disetujui", "cair", "dibangun", "selesai", "ditolak"],
    transisi: {jitupasna: {usulan: "petugas"}, usulan: {disetujui: "admin", ditolak: "admin"}, disetujui: {cair: "admin"}, cair: {dibangun: "petugas"}, dibangun: {selesai: "admin"}},
    jalurTolak: ["jitupasna", "usulan"],
    rekap: ["rumah_rb", "rumah_rs", "rumah_rr", "nilai_usulan", "nilai_disetujui", "nilai_cair", "rumah_dibangun"],
    bahaya: {macet: `tahap yang sama lebih dari ${AMBANG.rehab_macet_hari} hari (macet)${ASUMSI}`},
    cek: d => {
      const total = (d.rumah_rb || 0) + (d.rumah_rs || 0) + (d.rumah_rr || 0);
      if (!total) return "total rumah yang diusulkan harus lebih dari 0";
      if (d.nilai_disetujui > d.nilai_usulan) return "nilai disetujui tidak boleh melebihi nilai usulan";
      if (d.nilai_cair > d.nilai_disetujui) return "nilai cair tidak boleh melebihi nilai disetujui";
      if (d.rumah_dibangun > total) return "rumah dibangun tidak boleh melebihi total rumah yang diusulkan";
      const t = URUT_TGL.filter(x => d[x]);
      for (let i = 1; i < t.length; i++) if (d[t[i]] < d[t[i - 1]]) return `${t[i]} tidak boleh sebelum ${t[i - 1]}`;
      return "";
    },
  },
  gudang: {
    id: "gudang", nama: "Stok gudang", ikon: '<path d="M3 10 12 4l9 6v10H3z"/><path d="M8 20v-6h8v6M8 17h8"/>',
    wilayah: {kec: false, desa: false},
    kolom: [
      k("gudang", "Nama gudang", "teks", {wajib: true, maks: 60}), k("barang", "Barang", "pilih", {nilai: BARANG, wajib: true}),
      angka("stok", "Stok sekarang", {tahap: "_baca", wajib: false}), k("satuan", "Satuan", "teks", {wajib: true, maks: 20}),
      angka("ambang_min", "Ambang minimum"), angka("stok_awal", "Stok awal", {maks: 1e7}),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["cukup", "menipis"],
    stokPeran: {masuk: "petugas", keluar: "petugas", koreksi: "admin"},
    rekap: [],
    bahaya: {stok_rendah: "stok sama dengan atau di bawah ambang minimum"},
  },
  /* Juklak 9/2023 Format 1, 2, 4. AGREGAT tanpa nama atau NIK: satu catatan per tempat pengungsian per hari; kolom rekap dijumlahkan hanya dari catatan terbaru per tempat yang masih berjalan. */
  pengungsi: {
    id: "pengungsi", nama: "Pengungsi terpilah", ikon: '<path d="M3 21 12 4l9 17z"/><path d="M12 13v8M8.5 21 12 13l3.5 8"/>',
    wilayah: {kec: true, desa: true}, adminIsi: false, rapor: false,
    kolom: [
      tgl("tgl_data", "Tanggal data", {wajib: true, maks: "hariini"}), k("nama_tempat", "Nama tempat pengungsian", "teks", {wajib: true, maks: 120}), k("pos_lapangan", "Pos lapangan", "teks", {maks: 80}),
      k("jenis_tempat", "Jenis tempat", "pilih", {nilai: ["terkonsentrasi", "tidak_terkonsentrasi"], wajib: true}), k("tipe_tempat", "Tipe tempat", "pilih", {nilai: ["fasilitas_umum", "tanah_lapang", "lahan_gedung_swasta", "tempat_ibadah", "rumah_perorangan"]}),
      k("kejadian", "Bencana", "pilih", {nilai: BENCANA, wajib: true}), angka("pendataan_ke", "Pendataan ke", {min: 1, maks: 1000, wajib: false}), tgl("tgl_buka", "Tanggal buka", {wajib: true, maks: "hariini"}), tgl("tgl_tutup", "Tanggal tutup"),
      angka("kk", "Kepala keluarga (KK)"),
      ...UMUR.flatMap(([u, t]) => [angka(`${u}_l`, `${t} laki-laki`), angka(`${u}_p`, `${t} perempuan`)]),
      ...["bayi", "balita", "anak"].flatMap(u => [angka(`yatim_${u}_l`, `Yatim piatu ${u} laki-laki`, {wajib: false}), angka(`yatim_${u}_p`, `Yatim piatu ${u} perempuan`, {wajib: false}), angka(`pisah_${u}_l`, `Terpisah wali ${u} laki-laki`, {wajib: false}), angka(`pisah_${u}_p`, `Terpisah wali ${u} perempuan`, {wajib: false})]),
      angka("hamil_t1", "Ibu hamil trimester I", {wajib: false}), angka("hamil_t2", "Ibu hamil trimester II", {wajib: false}), angka("hamil_t3", "Ibu hamil trimester III", {wajib: false}), angka("menyusui", "Ibu menyusui", {wajib: false}),
      ...DISABILITAS.map(([n, t]) => angka(n, `Disabilitas ${t}`, {wajib: false})),
      angka("anak_kk", "Anak menjadi kepala keluarga", {wajib: false}), angka("perempuan_kk", "Perempuan menjadi kepala keluarga", {wajib: false}), angka("nikah_dini", "Perempuan menikah usia dini (di bawah 19 tahun)", {wajib: false}), angka("penyakit_bawaan", "Penyakit bawaan perlu penanganan khusus", {wajib: false}),
      ...SEKTOR.map(([n, t]) => k(n, `${t}: tersedia`, "pilih", {nilai: ["ada", "tidak"], wajib: true})), k("saran", "Saran tindak lanjut", "teks", {maks: 400}),
      /* dihitung server */
      ...HITUNG_PENGUNGSI.map(([n, t]) => angka(n, t, {tahap: "_baca", wajib: false})),
    ],
    hitung: d => {
      const jl = UMUR.reduce((s, [u]) => s + (d[u + "_l"] || 0), 0), jp = UMUR.reduce((s, [u]) => s + (d[u + "_p"] || 0), 0);
      return {jiwa_l: jl, jiwa_p: jp, jiwa_total: jl + jp, ...Object.fromEntries(UMUR.map(([u]) => ["umur_" + u, (d[u + "_l"] || 0) + (d[u + "_p"] || 0)]))};
    },
    cek: d => {
      const j = UMUR.reduce((s, [u]) => s + (d[u + "_l"] || 0) + (d[u + "_p"] || 0), 0);
      return !j ? "jumlah jiwa harus lebih dari 0" : d.kk > j ? "KK tidak boleh melebihi jumlah jiwa" : d.tgl_data < d.tgl_buka ? "tanggal data tidak boleh sebelum tanggal buka" : d.tgl_tutup && d.tgl_tutup < d.tgl_buka ? "tanggal tutup tidak boleh sebelum tanggal buka" : "";
    },
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["berjalan", "ditutup"],
    rekap: ["kk", "jiwa_total", "jiwa_l", "jiwa_p", ...UMUR.map(([u]) => "umur_" + u)], rekapTerakhir: {kunci: "nama_tempat", tanggal: "tgl_data", status: "berjalan"},
    bahaya: {kebutuhan_kurang: "ada sektor kebutuhan yang belum tersedia di tempat pengungsian"},
  },
  /* Juklak 5/2025. Identitas pelapor tidak di data: tabel meja_pelapor, dibaca hanya lewat GET /api/meja/pelapor/:id (peran Irtama/ULP). */
  pengaduan: {
    jalurTolak: ["register", "telaah"], id: "pengaduan", nama: "Pengaduan masyarakat", ikon: '<path d="M4 4h16v12H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
    wilayah: {kec: false, desa: false}, pusat: true, adminIsi: true, publik: false, rapor: false,
    kolom: [
      k("nomor_register", "Nomor register", "teks", {wajib: true, maks: 40}), k("kanal", "Kanal pengaduan", "pilih", {nilai: ["langsung", "website", "telepon", "surel", "surat", "whatsapp"], wajib: true}),
      tgl("tgl_terima", "Tanggal diterima", {wajib: true, maks: "hariini"}), k("nomor_surat", "Nomor surat pengaduan", "teks", {maks: 60}), tgl("tgl_surat", "Tanggal surat pengaduan", {maks: "hariini"}),
      k("perihal", "Hal yang diadukan", "teks", {wajib: true, maks: 200}), k("uraian", "Uraian singkat aduan", "teks", {wajib: true, maks: 500}), k("lokasi_aduan", "Lokasi aduan", "teks", {maks: 120}), tgl("waktu_kejadian", "Waktu kejadian", {maks: "hariini"}),
      k("unit_terlapor", "Unit kerja terlapor", "teks", {maks: 120}), k("lampiran", "Lampiran", "teks", {maks: 200}),
      k("kategori", "Kategori hasil telaah", "pilih", {nilai: ["berkadar_pengawasan", "tidak_berkadar_pengawasan"], wajib: true, tahap: "telaah"}), k("wewenang", "Kewenangan", "pilih", {nilai: ["bnpb", "bukan_bnpb"], wajib: true, tahap: "telaah"}),
      k("hasil_telaah", "Hasil telaah", "teks", {wajib: true, maks: 500, tahap: "telaah"}), tgl("tgl_telaah", "Tanggal telaah", {wajib: true, maks: "hariini", tahap: "telaah"}),
      k("tujuan", "Diteruskan kepada", "teks", {wajib: true, maks: 120, tahap: "diteruskan"}), k("nomor_penerusan", "Nomor surat penerusan", "teks", {maks: 60, tahap: "diteruskan"}), tgl("tgl_diteruskan", "Tanggal diteruskan", {wajib: true, maks: "hariini", tahap: "diteruskan"}),
      k("alasan", "Alasan ditolak", "teks", {wajib: true, maks: 200, tahap: "ditolak"}),
      k("tindakan", "Jenis tindak lanjut", "pilih", {nilai: ["klarifikasi", "konfirmasi", "pemeriksaan_audit"], wajib: true, tahap: "tindak_lanjut"}), tgl("tgl_tindak", "Tanggal tindak lanjut", {wajib: true, maks: "hariini", tahap: "tindak_lanjut"}), k("catatan_tindak", "Catatan tindak lanjut", "teks", {maks: 300, tahap: "tindak_lanjut"}),
      k("simpulan", "Simpulan", "teks", {wajib: true, maks: 500, tahap: "selesai"}), k("rekomendasi", "Rekomendasi", "teks", {maks: 500, tahap: "selesai"}), tgl("tgl_selesai", "Tanggal selesai", {wajib: true, maks: "hariini", tahap: "selesai"}), k("penjelasan_lambat", "Penjelasan melewati tenggat", "teks", {maks: 300, tahap: "selesai"}),
    ],
    awal: "register", status: ["register", "telaah", "diteruskan", "tindak_lanjut", "selesai", "ditolak"],
    transisi: {register: {telaah: "admin"}, telaah: {diteruskan: "admin", ditolak: "admin"}, diteruskan: {tindak_lanjut: "admin"}, tindak_lanjut: {selesai: "admin"}},
    rekap: [],
    bahaya: {lewat_tenggat: "melewati tenggat penanganan Juklak 5/2025 (20 hari kerja berkadar, 15 hari kerja tidak berkadar)"},
    cek: d => d.tgl_telaah && d.tgl_telaah < d.tgl_terima ? "tanggal telaah tidak boleh sebelum tanggal diterima"
      : d.tgl_selesai && d.tgl_selesai > tenggat(kunciAduan(d), d.tgl_terima).hasil && !d.penjelasan_lambat ? "melewati tenggat: penjelasan tertulis wajib (Juklak 5/2025 BAB III)" : "",
  },
  /* Juklak 16/2025 Format 1, 2, 5, 6: dokumen klaster saja. Stok tetap di LogPal (KEPUTUSAN-LOGPAL D2-D4); tidak ada kolom stok atau persetujuan barang. */
  klaster: {
    id: "klaster", nama: "Klaster logistik", ikon: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5V12M12 12l-5.5 4M12 12l5.5 4"/>',
    wilayah: {kec: false, desa: false}, adminIsi: true, publik: false, rapor: false,
    kolom: [
      k("tingkat", "Tingkat klaster", "pilih", {nilai: ["nasional", "provinsi", "kabupaten_kota"], wajib: true}), k("dokumen", "Jenis dokumen", "pilih", {nilai: ["sk_klaster", "rencana_kerja", "laporan_triwulan", "laporan_tahunan"], wajib: true}),
      k("judul", "Judul dokumen", "teks", {wajib: true, maks: 150}), angka("tahun", "Tahun", {min: 2020, maks: 2100}), k("triwulan", "Triwulan", "pilih", {nilai: ["1", "2", "3", "4"]}),
      k("nomor_dokumen", "Nomor dokumen", "teks", {maks: 60}), tgl("tgl_dokumen", "Tanggal dokumen", {wajib: true, maks: "hariini"}), k("ringkasan", "Ringkasan", "teks", {maks: 400}), k("tautan", "Tautan dokumen (http/https)", "tautan"),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {},
    rekap: [],
    bahaya: {tanpa_dokumen: "tautan dokumen belum diisi"},
    cek: d => d.dokumen === "laporan_triwulan" && !d.triwulan ? "laporan triwulan wajib menyebut triwulan" : d.dokumen !== "laporan_triwulan" && d.triwulan ? "triwulan hanya untuk laporan triwulan" : "",
  },
  /* Juklak 17/2025 Lampiran I Format 2, 3, 4. Skala Tabel 3.2 dan matriks Tabel 3.4 tidak terbaca: level diisi manual, pertanyaan terbuka di data/kajian-bnpb/juklak/KEPUTUSAN-JUKLAK.md. */
  risiko: {
    id: "risiko", nama: "Register risiko", ikon: '<path d="M12 3 3 20h18z"/><path d="M12 9v5M12 17v.5"/>',
    wilayah: {kec: false, desa: false}, pusat: true, adminIsi: true, publik: false, rapor: false,
    kolom: [
      k("unit_pemilik", "Unit pemilik risiko", "teks", {wajib: true, maks: 120}), angka("tahun", "Tahun", {min: 2020, maks: 2100}),
      k("jenis_konteks", "Jenis konteks", "pilih", {nilai: ["sasaran_strategis", "program", "keberlangsungan", "proses_bisnis"], wajib: true}), k("nama_konteks", "Nama konteks", "teks", {wajib: true, maks: 200}), k("indikator", "Indikator", "teks", {wajib: true, maks: 200}),
      k("kode", "Kode risiko", "teks", {wajib: true, maks: 30}), k("pernyataan", "Pernyataan risiko", "teks", {wajib: true, maks: 400}), k("kategori", "Kategori risiko", "pilih", {nilai: ["kebijakan", "bencana", "kecurangan", "kepatuhan", "operasional", "pemangku_kepentingan"], wajib: true}),
      k("dampak", "Uraian dampak", "teks", {wajib: true, maks: 400}), k("spip", "Tujuan SPIP", "pilih", {nilai: ["efektif_efisien", "keandalan_pelaporan", "pengamanan_aset", "ketaatan"], wajib: true}),
      angka("skor_kemungkinan", "Skor probabilitas", {min: 1, maks: 5}), angka("skor_dampak", "Skor dampak", {min: 1, maks: 5}), angka("level", "Level risiko", {min: 1, maks: 25}),
      k("pengendalian", "Pengendalian yang ada", "pilih", {nilai: ["ada", "belum_ada"], wajib: true}), k("uraian_pengendalian", "Uraian pengendalian", "teks", {maks: 300}), k("memadai", "Kecukupan pengendalian", "pilih", {nilai: ["memadai", "belum_memadai"]}),
      angka("res_kemungkinan", "Skor probabilitas residu", {min: 1, maks: 5}), angka("res_dampak", "Skor dampak residu", {min: 1, maks: 5}), angka("res_level", "Level risiko residu", {min: 1, maks: 25}),
      angka("selera", "Selera risiko pemilik", {min: 1, maks: 25}),
    ],
    awal: "tercatat", status: ["tercatat"], transisi: {}, turunan: ["dalam_selera", "di_atas_selera"],
    rekap: [],
    bahaya: {di_atas_selera: "level risiko residu di atas selera risiko (Juklak 17/2025 Format 4)"},
    cek: d => d.pengendalian === "belum_ada" && d.uraian_pengendalian ? "uraian pengendalian hanya bila pengendalian ada"
      : (d.pengendalian === "belum_ada" || d.memadai !== "memadai") && d.res_level < d.level ? "pengendalian belum ada atau belum memadai: level residu tidak boleh turun (Juklak 17/2025 BAB III)" : "",
  },
  /* Juklak 7/2023 Lampiran I huruf A: satu catatan per kejadian per kabupaten/kota, diperbarui di catatan yang sama. Kosong beda dari nol; bagian tanpa kerusakan dipilih nihil. Rapor BPBD tidak berubah (rapor:false, T3). */
  dampak: {
    id: "dampak", nama: "Data kejadian dan dampak", ikon: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><path d="m14 5 2 2 4-4"/>',
    wilayah: {kec: false, desa: false}, adminIsi: false, publik: false, rapor: false, ubahBuka: true, sistem: ["logbook_id", "logbook_kib"],
    bagian: BAGIAN, kolom: kolomDampak(),
    awal: "dilaporkan", status: ["dilaporkan", "diverifikasi", "masuk_logbook"],
    transisi: {dilaporkan: {diverifikasi: "petugas"}, diverifikasi: {masuk_logbook: "pusdalops", dilaporkan: "petugas"}, masuk_logbook: {dilaporkan: "petugas", diverifikasi: "sistem"}},
    rekap: ["meninggal", "hilang", "luka", "mengungsi", "terdampak", "rumah_rb", "rumah_rs", "rumah_rr", "rumah_terendam"],
    bahaya: {belum_dimutakhirkan: `keadaan darurat belum ditutup dan data belum diubah lebih dari ${AMBANG.data_dinamis_hari} hari (data dinamis minimal 1 hari sekali, Juklak 7/2023 BAB II)`},
    cek(d) { return cekDampak(d, this.kolom); },
    gerbang(ke, data, wilayah) { return gerbangDampak(this.kolom, ke, data, wilayah); },
    kelengkapan(data, wilayah) { return kelengkapan(this.kolom, {...data, ...wilayah}); },
  },
};
export const DAFTAR_MEJA = Object.keys(MEJA);
export const DAFTAR_PETUGAS = DAFTAR_MEJA.filter(m => !MEJA[m].pusat);   // sama dengan trigger meja_petugas_sah
export const MEJA_RAPOR = DAFTAR_MEJA.filter(m => MEJA[m].rapor !== false);
export const PUSAT = {prov: "00", kab: "BNPB Pusat"};
/* Juklak 17/2025 Lampiran I: kolom CSV sesuai Format 2, 3, 4 (Keterangan kolom di teks juklak), didahului butir (a) unit dan (b) tahun */
const AWAL_RISIKO = ["Unit Pemilik Risiko", "Tahun"];
export const EKSPOR_RISIKO = {
  2: {kolom: [...AWAL_RISIKO, "No", "Jenis Konteks", "Nama Konteks", "Indikator", "Kode Risiko", "Pernyataan Risiko", "Kategori Risiko", "Dampak", "Metode Pencapaian Tujuan SPIP"],
    isi: (d, i) => [d.unit_pemilik, d.tahun, i + 1, d.jenis_konteks, d.nama_konteks, d.indikator, d.kode, d.pernyataan, d.kategori, d.dampak, d.spip]},
  3: {kolom: [...AWAL_RISIKO, "Kode Risiko", "Pernyataan Risiko", "Skor Probabilitas", "Skor Dampak", "Level Risiko", "Ada/Belum Ada", "Uraian Pengendalian", "Memadai/Belum Memadai", "Skor Probabilitas Residu", "Skor Dampak Residu", "Level Risiko Residu"],
    isi: d => [d.unit_pemilik, d.tahun, d.kode, d.pernyataan, d.skor_kemungkinan, d.skor_dampak, d.level, d.pengendalian, d.uraian_pengendalian ?? "", d.memadai ?? "", d.res_kemungkinan, d.res_dampak, d.res_level]},
  4: {kolom: [...AWAL_RISIKO, "Selera Risiko", "Kode Risiko", "Pernyataan Risiko", "Skor Probabilitas", "Skor Dampak", "Level Risiko"],
    saring: d => d.res_level > d.selera, urut: (a, b) => b.res_level - a.res_level,
    isi: d => [d.unit_pemilik, d.tahun, d.selera, d.kode, d.pernyataan, d.res_kemungkinan, d.res_dampak, d.res_level]},
};
/* pasangan 'meja:dari>ke' sah; sama dengan trigger meja_catatan_ubah */
export const PASANGAN = DAFTAR_MEJA.flatMap(m => Object.entries(MEJA[m].transisi).flatMap(([d, o]) => Object.keys(o).map(ke => `${m}:${d}>${ke}`)));
/* bentuk untuk klien: tanpa fungsi */
export const spekPublik = () => ({ambang: AMBANG, ambang_internal: AMBANG_INTERNAL, rapor: RAPOR, meja: Object.values(MEJA).map(m => Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v !== "function")))});

/* ---------------------------------------------------------------- tanggal */
const selisihHari = (a, b) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / HARI);
const mundurBulan = (t, n) => { const d = new Date(t + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() - n); return d.toISOString().slice(0, 10); };

/* ---------------------------------------------------------------- validasi */
const URL_OK = s => { try { const u = new URL(s); return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password && !/\s/.test(s); } catch (e) { return false; } };
function satu(c, v, kini) {
  const kosong = v == null || v === "";
  if (kosong) return c.wajib ? {galat: `${c.label} wajib diisi`} : {};
  if (c.tipe === "teks") {
    const s = tx(v, c.maks ?? 120); if (!s) return {galat: `${c.label}: teks 1-${c.maks ?? 120} huruf`};
    const g = c.bersih ? teksBersih(s) : ""; return g ? {galat: `${c.label}: ${g}`} : {v: s};
  }
  if (c.tipe === "angka") { const n = num(v, c.min ?? 0, c.maks ?? 1e9, !c.desimal); const p = 10 ** (typeof c.desimal === "number" ? c.desimal : 2); return Number.isNaN(n) ? {galat: `${c.label}: angka ${c.desimal ? "" : "bulat "}${c.min ?? 0} sampai ${c.maks ?? 1e9}`} : {v: c.desimal ? Math.round(n * p) / p : n}; }
  if (c.tipe === "pilih") return typeof v === "string" && c.nilai.includes(v) ? {v} : {galat: `${c.label}: pilih salah satu dari ${c.nilai.join(", ")}`};
  if (c.tipe === "multi") return Array.isArray(v) && v.length <= c.nilai.length && v.every(x => typeof x === "string" && c.nilai.includes(x)) && new Set(v).size === v.length ? {v} : {galat: `${c.label}: pilihan tidak sah`};
  if (c.tipe === "gudang") return typeof v === "string" && /^[0-9a-f]{16}$/.test(v) ? {v} : {galat: `${c.label}: pilih gudang dari daftar`};
  if (c.tipe === "ya") return typeof v === "boolean" ? {v} : {galat: `${c.label}: harus ya atau tidak`};
  if (c.tipe === "tanggal") {
    const maks = c.maks === "hariini" ? wib(kini + HARI) : c.maks ?? "2100-12-31";
    return typeof v === "string" && tglSah(v) && v >= (c.min ?? "2000-01-01") && v <= maks ? {v} : {galat: `${c.label}: tanggal YYYY-MM-DD antara ${c.min ?? "2000-01-01"} dan ${maks}`};
  }
  if (c.tipe === "tautan") return typeof v === "string" && v.length <= 300 && URL_OK(v) ? {v} : {galat: `${c.label}: tautan http/https, maksimal 300 huruf`};
  return {galat: `${c.label}: tipe tidak dikenal`};
}
/* tahap null = isian awal (kolom tanpa `tahap`); tahap 'dikirim' dst = isian saat pindah ke status itu. Kolom di luar tahap ditolak. */
export function validasi(meja, masuk, tahap, kini = Date.now(), lama = {}) {
  const M = MEJA[meja]; if (!M) return {galat: "meja tidak dikenal"};
  if (!masuk || typeof masuk !== "object" || Array.isArray(masuk)) return {galat: "data harus objek"};
  const boleh = M.kolom.filter(c => (c.tahap ?? null) === tahap && c.tipe !== "wilayah"), nama = new Set(boleh.map(c => c.nama));
  for (const x of Object.keys(masuk)) if (!nama.has(x)) return {galat: `kolom "${x.slice(0, 40)}" tidak dikenal untuk ${tahap ? "tahap " + tahap : "isian awal"} di meja ${M.nama}`};
  const data = {};
  for (const c of boleh) { const r = satu(c, masuk[c.nama], kini); if (r.galat) return r; if (r.v !== undefined) data[c.nama] = r.v; }
  const gabung = {...lama, ...data}, g = M.cek?.(gabung);
  return g ? {galat: g} : {data: {...data, ...M.hitung?.(gabung)}};
}

/* ---------------------------------------------------------------- status turunan & tanda bahaya */
export function statusEfektif(meja, rec, kini = Date.now()) {
  const d = rec.data, h = wib(kini);
  if (meja === "renkon") {
    const sampai = d.berlaku_sampai || tenggat("renkon_berlaku", d.tgl_sah).hasil, sisa = selisihHari(sampai, h);
    const reviu = [d.tgl_sah, d.reviu_terakhir].filter(Boolean).sort().at(-1);   // catatan lama (uji_terakhir) dihitung dari tgl_sah
    return sisa < 0 ? "kedaluwarsa" : sisa <= AMBANG.renkon_segera_hari ? "segera_habis" : tenggat("renkon_reviu", reviu).hasil < h ? "perlu_reviu" : "berlaku";
  }
  if (meja === "pengungsi") return d.tgl_tutup && d.tgl_tutup < h ? "ditutup" : "berjalan";
  if (meja === "risiko") return d.res_level > d.selera ? "di_atas_selera" : "dalam_selera";
  if (meja === "gudang") return d.stok <= d.ambang_min ? "menipis" : "cukup";
  if (meja === "destana") return d.kegiatan_terakhir && d.kegiatan_terakhir >= mundurBulan(h, AMBANG.destana_pasif_bulan) ? "aktif" : "pasif";
  return rec.status;
}
/* tanggal masuknya catatan rehab ke tahap sekarang; dipakai tanda macet */
const TGL_TAHAP = {jitupasna: "tgl_jitupasna", usulan: "tgl_usulan", disetujui: "tgl_setuju", cair: "tgl_cair", dibangun: "tgl_bangun"};
/* daftar kode tanda bahaya yang sedang terpicu */
export function tandaBahaya(meja, rec, kini = Date.now()) {
  const d = rec.data, out = [], h = wib(kini);
  if (meja === "kaji_cepat" && rec.status === "dilaporkan" && kini - rec.dibuat > AMBANG.kaji_awal_jam * JAM) out.push("belum_diverifikasi");
  if (meja === "logistik") {
    if (rec.status === "diminta" && kini - rec.dibuat > AMBANG.logistik_setuju_jam * JAM) out.push("belum_disetujui");
    if (rec.status === "diterima" && d.jumlah_terima !== d.jumlah_kirim) out.push("selisih_terima");
  }
  if (meja === "dsp" && rec.status === "cair") {
    if (h > tenggat("dsp_laporan_perkembangan", d.laporan_terakhir || d.tgl_cair).hasil) out.push("laporan_terlambat");
    // tanpa tgl_status_berakhir tidak ada tanda SPJ palsu
    if (d.tgl_status_berakhir && h > tenggat("dsp_spj", d.tgl_status_berakhir).hasil) out.push("spj_terlambat");
  }
  if (meja === "renkon") { const s = statusEfektif(meja, rec, kini); if (s === "kedaluwarsa" || s === "perlu_reviu") out.push(s); }
  if (meja === "destana") {
    if (statusEfektif(meja, rec, kini) === "pasif") out.push("pasif");
    if (!d.tgl_penilaian || tenggat("destana_penilaian", d.tgl_penilaian).hasil < h) out.push("penilaian_kedaluwarsa");
  }
  if (meja === "gudang" && statusEfektif(meja, rec, kini) === "menipis") out.push("stok_rendah");
  if (meja === "pengungsi" && statusEfektif(meja, rec, kini) === "berjalan" && SEKTOR.some(([n]) => d[n] === "tidak")) out.push("kebutuhan_kurang");
  if (meja === "pengaduan" && !["selesai", "ditolak"].includes(rec.status) && h > tenggat(kunciAduan(d), d.tgl_terima).hasil) out.push("lewat_tenggat");
  if (meja === "klaster" && !d.tautan) out.push("tanpa_dokumen");
  if (meja === "dampak" && DARURAT_AKTIF.includes(d.status_darurat) && !d.tgl_tuntas && kini - rec.diubah > AMBANG.data_dinamis_hari * HARI) out.push("belum_dimutakhirkan");
  if (meja === "risiko" && statusEfektif(meja, rec, kini) === "di_atas_selera") out.push("di_atas_selera");
  const tg = meja === "rehab" && TGL_TAHAP[rec.status];
  if (tg && d[tg] && selisihHari(h, d[tg]) > AMBANG.rehab_macet_hari) out.push("macet");
  return out;
}
