/* Katalog jenis laporan Lapor Warga — SATU sumber untuk worker (import), halaman (import() dinamis) dan uji.
   CHECK di migrations/0001_warga.sql harus memuat pasangan jenis:sub dan jenis:bahaya yang sama persis;
   tests/warga/skema.test.mjs menolak kalau keduanya menyimpang.
   sub: kode -> [label, kelas]. kelas menentukan warna penanda (WARNA) dan arah status untuk durasi padam
   (buruk -> baik pada laporan lanjutan = "akhirnya hidup setelah padam N jam"). */

export const BAHAYA = {karhutla: "Karhutla", banjir: "Banjir", longsor: "Longsor", rob: "Rob", umum: "Umum"};

/* kelas -> warna cincin (isi = versi pastelnya). Palet redup proyek. */
export const WARNA = {buruk: "#c9503a", sedang: "#e3b94e", baik: "#5a9e74", minta: "#b5475f", tawar: "#4f8fc4",
  api: "#e58a45", air: "#2b8c86", info: "#8b93a3", ungu: "#5f6fb0", tua: "#7a2b2b"};

const SEDIA = {tersedia: ["Tersedia", "baik"], terbatas: ["Terbatas / antre", "sedang"], habis: ["Habis", "buruk"]};
const KATEGORI = k => ({makanan: ["Makanan", k], air: ["Air minum", k], pakaian: ["Pakaian", k], obat: ["Obat-obatan", k],
  evakuasi: ["Evakuasi / angkutan", k], tempat: ["Tempat mengungsi", k], lainnya: ["Lainnya", k]});

/* bahaya: null = muncul di semua bahaya. umur: jam sampai kedaluwarsa. bantuan: bisa ditandai selesai + boleh kontak WA.
   lanjut: boleh diberi laporan lanjutan (status per lokasi). jumlah: label isian angka (kolom jumlah).
   isian: data tambahan tervalidasi server, disimpan di kolom detail (JSON). bulat: koordinat dibulatkan ~1 km. */
export const JENIS = {
  listrik: {nama: "Listrik", bahaya: null, umur: 24, lanjut: true, ikon: "listrik",
    sub: {padam: ["Mati total", "buruk", 1], genset: ["Ada genset", "sedang"], hidup: ["PLN hidup", "baik"]}},
  sinyal: {nama: "Jaringan", bahaya: null, umur: 24, lanjut: true, ikon: "sinyal",
    sub: {tidak_ada: ["Tidak ada sinyal", "buruk", 1], lemah: ["Sinyal lemah", "sedang"], lancar: ["Internet lancar", "baik"]}},
  bbm: {nama: "BBM", bahaya: null, umur: 24, lanjut: true, ikon: "bbm", sub: SEDIA,
    isian: {bahan: {label: "Bahan bakar", tipe: "multi", nilai: {pertalite: "Pertalite / bensin", pertamax: "Pertamax", solar: "Solar"}}}},
  elpiji: {nama: "LPG", bahaya: null, umur: 24, lanjut: true, ikon: "elpiji", sub: SEDIA,
    isian: {ukuran: {label: "Ukuran tabung", tipe: "multi", nilai: {"3kg": "3 kg", "5kg": "5,5 kg", "12kg": "12 kg"}}}},
  minta: {nama: "Minta bantuan", bahaya: null, umur: 168, bantuan: true, ikon: "minta", jumlah: "Untuk berapa orang", sub: KATEGORI("minta")},
  tawar: {nama: "Tawaran bantuan", bahaya: null, umur: 168, bantuan: true, ikon: "tawar", jumlah: "Cukup untuk berapa orang", sub: KATEGORI("tawar")},
  info: {nama: "Pesan", bahaya: null, umur: 24, ikon: "info", sub: {umum: ["Pesan umum", "info"]}},

  api: {nama: "Lihat api / asap", bahaya: ["karhutla"], umur: 12, ikon: "api",
    sub: {kecil: ["Api kecil (< 1 ha)", "api"], besar: ["Api besar", "buruk"], bara: ["Bara gambut", "tua"], asap: ["Asap tebal saja", "ungu"]},
    isian: {jarak: {label: "Jarak ke permukiman", tipe: "pilih", nilai: {"100m": "≤ 100 m", "1km": "≤ 1 km", jauh: "> 1 km"}},
            angin: {label: "Angin bertiup ke", tipe: "pilih", nilai: {U: "Utara", TL: "Timur laut", T: "Timur", TG: "Tenggara", S: "Selatan", BD: "Barat daya", B: "Barat", BL: "Barat laut"}}}},
  udara: {nama: "Kualitas udara", bahaya: ["karhutla"], umur: 24, ikon: "udara",
    sub: {p100: ["Jarak pandang < 100 m", "tua"], p500: ["Jarak pandang 100–500 m", "buruk"], p1000: ["Jarak pandang 500 m–1 km", "sedang"], jauh: ["Jarak pandang > 1 km", "baik"]},
    isian: {bau: {label: "Bau asap", tipe: "ya"}, perih: {label: "Mata perih / sesak napas", tipe: "ya"}}},
  sehat: {nama: "Kesehatan", bahaya: ["karhutla"], umur: 168, bantuan: true, ikon: "sehat", jumlah: "Untuk berapa orang",
    sub: {masker: ["Butuh masker N95", "minta"], oksigen: ["Butuh oksigen / nebulizer", "minta"], obat_ispa: ["Butuh obat ISPA", "minta"],
          rujukan: ["Butuh rujukan faskes", "minta"], faskes_penuh: ["Puskesmas / RS penuh", "buruk"]}},
  ruang: {nama: "Ruang udara bersih", bahaya: ["karhutla"], umur: 24, ikon: "ruang", jumlah: "Kapasitas (orang)",
    sub: {tersedia: ["Tersedia", "baik"], penuh: ["Penuh", "buruk"]}},
  air_padam: {nama: "Sumber air pemadaman", bahaya: ["karhutla"], umur: 168, ikon: "air",
    sub: {embung: ["Embung", "air"], sumur_bor: ["Sumur bor", "air"], kanal: ["Kanal / sungai", "air"], hidran: ["Hidran", "air"]},
    isian: {status: {label: "Kondisi air", tipe: "pilih", wajib: true, nilai: {ada: "Ada air", dangkal: "Dangkal", kering: "Kering"}}}},
  padam: {nama: "Bantuan pemadaman", bahaya: ["karhutla"], umur: 168, bantuan: true, ikon: "padam", jumlah: "Jumlah orang",
    sub: {butuh_regu: ["Butuh relawan / regu", "minta"], butuh_alat: ["Butuh alat", "minta"], tawar_relawan: ["Tawarkan relawan / MPA", "tawar"], tawar_alat: ["Tawarkan alat", "tawar"]},
    isian: {alat: {label: "Alat", tipe: "multi", nilai: {pompa: "Pompa", selang: "Selang", jet_shooter: "Jet shooter"}}}},
  sekolah: {nama: "Sekolah libur", bahaya: ["karhutla"], umur: 24, ikon: "sekolah", sub: {libur: ["Libur karena asap", "ungu"], daring: ["Belajar daring", "sedang"]}},
  satwa: {nama: "Satwa terdampak", bahaya: ["karhutla"], umur: 24, ikon: "satwa", bulat: true,
    sub: {orangutan: ["Orangutan", "tua"], beruang: ["Beruang madu", "tua"], harimau: ["Harimau", "tua"], gajah: ["Gajah", "tua"], lainnya: ["Satwa lain", "tua"]}},

  banjir: {nama: "Tinggi banjir", bahaya: ["banjir"], umur: 24, ikon: "banjir",
    sub: {kaki: ["Semata kaki", "sedang"], lutut: ["Selutut", "api"], pinggang: ["Sepinggang", "buruk"], dada: ["Sedada", "tua"], atap: ["Sampai atap", "tua"]},
    isian: {arus: {label: "Arus deras", tipe: "ya"}, perahu: {label: "Butuh perahu", tipe: "ya"}}},
  longsor: {nama: "Longsor", bahaya: ["longsor"], umur: 24, ikon: "longsor",
    sub: {jalan: ["Jalan tertimbun", "buruk"], rumah: ["Rumah rusak", "tua"], retakan: ["Retakan tanah baru", "sedang"]}},
  rob: {nama: "Genangan rob", bahaya: ["rob"], umur: 24, ikon: "rob",
    sub: {kaki: ["Semata kaki", "sedang"], lutut: ["Selutut", "api"], pinggang: ["Sepinggang atau lebih", "buruk"]}},

  akses: {nama: "Akses jalan", bahaya: null, umur: 24, ikon: "akses",
    sub: {truk: ["Bisa dilalui truk", "baik"], motor: ["Hanya motor", "sedang"], tergenang: ["Tergenang", "api"], asap: ["Tertutup asap", "ungu"], tertimbun: ["Tertimbun", "buruk"], putus: ["Terputus", "tua"]}},
  evakuasi: {nama: "Evakuasi / mengungsi", bahaya: null, umur: 168, bantuan: true, ikon: "evakuasi", jumlah: "Jumlah orang",
    sub: {mengungsi: ["Warga sudah mengungsi", "sedang"], perlu: ["Perlu dievakuasi", "minta"]}},
};

/* jenis yang tampil untuk satu bahaya, urut katalog (empat fitur inti selalu di depan). */
export const jenisUntuk = b => Object.keys(JENIS).filter(j => !JENIS[j].bahaya || JENIS[j].bahaya.includes(b));

/* Ikon 24x24 garis (dibuat sendiri), digambar dengan Path2D. */
export const IKON = {
  listrik: "M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5",
  sinyal: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  bbm: "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8l3 3v6a1.5 1.5 0 0 0 3 0V8l-3-3",
  elpiji: "M8 7h8l1 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9zM10 3h4v4h-4zM7 14h10",
  minta: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6",
  tawar: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  info: "M4 5h16v11H9l-5 4zM9 10.5h.01M12 10.5h.01M15 10.5h.01",
  api: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 .8-3.4 2-4.5.3 1.6 1.2 2.5 2.2 2.8C10.6 9 11 6 12 3z",
  udara: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  sehat: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z",
  ruang: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5",
  air: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  padam: "M9 8h6v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zM10 8V5h4v3M14 5h4l2 2M12 12v4",
  sekolah: "M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5",
  satwa: "M12 12c-3 0-5 3.5-5 5.5S9 20 12 20s5-.5 5-2.5S15 12 12 12zM7 8.5h.01M17 8.5h.01M10 5.5h.01M14 5.5h.01",
  banjir: "M3 17c2 0 2-1.5 4.5-1.5S9.5 17 12 17s2.5-1.5 4.5-1.5S19 17 21 17M3 21c2 0 2-1.5 4.5-1.5S9.5 21 12 21s2.5-1.5 4.5-1.5S19 21 21 21M6 13V8l6-4 6 4v5",
  longsor: "M3 20h18L9 6zM15 11h.01M18 14h.01M16 17h.01",
  rob: "M3 18c2 0 2-1.5 4.5-1.5S9.5 18 12 18s2.5-1.5 4.5-1.5S19 18 21 18M15 4a5 5 0 1 0 5 7 4 4 0 0 1-5-7z",
  akses: "M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3",
  evakuasi: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10",
  coret: "M4 4l16 16",
};

export default {BAHAYA, WARNA, JENIS, IKON, jenisUntuk};
