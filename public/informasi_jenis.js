/* Katalog jenis laporan Lapor Warga — SATU sumber untuk worker (import), halaman (import() dinamis) dan uji.
   CHECK di migrations/0001_warga.sql harus memuat pasangan jenis:sub dan jenis:bahaya yang sama persis;
   tests/warga/skema.test.mjs menolak kalau keduanya menyimpang.
   sub: kode -> [label, kelas]. kelas menentukan warna penanda (WARNA) dan arah status untuk durasi padam
   (buruk -> baik pada laporan lanjutan = "akhirnya hidup setelah padam N jam"). */

/* BAHAYA diturunkan dari registry (public/bencana.json -> lapor_bahaya tiap bencana), bukan daftar tulisan tangan.
   Node/worker membaca src/bencana.generated.js (hasil bangkit registry); peramban membaca /bencana.json. 'umum' selalu ada.
   Label: nama bencana bila ia satu-satunya bahayanya; bencana kelompok (banjir+longsor+rob, gempa+tsunami) memakai slug berhuruf besar. */
const REGISTRY = typeof document === "undefined" ? (await import("../src/bencana.generated.js")).default : await fetch("/bencana.json").then(r => { if (!r.ok) throw new Error(`/bencana.json ${r.status}`); return r.json(); });
export const bahayaDari = reg => {
  const h = {};
  for (const b of reg.bencana) for (const s of b.lapor_bahaya) h[s] = b.lapor_bahaya.length === 1 ? b.nama : s[0].toUpperCase() + s.slice(1);
  h.umum = "Umum";
  return h;
};
export const BAHAYA = bahayaDari(REGISTRY);

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

  /* Bencana lain (registry lapor_bahaya). Tab Informasi belum ditampilkan di halaman bencana baru; API dan katalog sudah siap. */
  guncang: {nama: "Guncangan gempa", bahaya: ["gempa"], umur: 24, ikon: "guncang",
    sub: {ringan: ["Terasa ringan", "sedang"], kuat: ["Kuat, barang jatuh", "api"], hebat: ["Sulit berdiri", "buruk"]}},
  rusak_gedung: {nama: "Kerusakan bangunan", bahaya: ["gempa"], umur: 168, ikon: "rusak_gedung",
    sub: {retak: ["Dinding retak", "sedang"], rusak: ["Rusak berat", "buruk"], roboh: ["Roboh", "tua"]}},
  tsunami_tanda: {nama: "Tanda tsunami", bahaya: ["gempa", "tsunami"], umur: 12, ikon: "tsunami_tanda",
    sub: {surut: ["Air laut surut mendadak", "buruk"], ombak: ["Gelombang tak biasa", "tua"], sirene: ["Sirene berbunyi", "api"]}},
  abu: {nama: "Hujan abu", bahaya: ["gunungapi"], umur: 24, ikon: "abu",
    sub: {tipis: ["Abu tipis", "sedang"], tebal: ["Abu tebal", "buruk"], kerikil: ["Hujan kerikil / pasir", "tua"]}},
  lahar: {nama: "Lahar", bahaya: ["gunungapi"], umur: 24, ikon: "lahar",
    sub: {sungai: ["Mengalir di sungai", "api"], meluap: ["Meluap ke permukiman", "buruk"], putus: ["Jalan / jembatan putus", "tua"]}},
  gemuruh: {nama: "Gemuruh / sinar api", bahaya: ["gunungapi"], umur: 12, ikon: "gemuruh",
    sub: {gemuruh: ["Gemuruh terdengar", "sedang"], dentuman: ["Dentuman keras", "api"], sinar: ["Sinar api di puncak", "tua"]}},
  pohon_tumbang: {nama: "Pohon tumbang", bahaya: ["cuaca"], umur: 24, ikon: "pohon_tumbang",
    sub: {jalan: ["Menutup jalan", "buruk"], rumah: ["Menimpa rumah", "tua"], kabel: ["Menimpa kabel listrik", "api"]}},
  atap_rusak: {nama: "Atap rusak", bahaya: ["cuaca"], umur: 168, ikon: "atap_rusak",
    sub: {sebagian: ["Sebagian atap", "sedang"], banyak: ["Banyak atap di sekitar", "buruk"], umum: ["Fasilitas umum", "tua"]}},
  puting_beliung: {nama: "Puting beliung", bahaya: ["cuaca"], umur: 24, ikon: "puting_beliung",
    sub: {terlihat: ["Terlihat pusaran", "buruk"], merusak: ["Sudah merusak", "tua"]}},
  hujan_es: {nama: "Hujan es", bahaya: ["cuaca"], umur: 12, ikon: "hujan_es",
    sub: {kecil: ["Butiran kecil", "sedang"], besar: ["Sebesar kelereng atau lebih", "buruk"]}},
  asap_tebal: {nama: "Asap tebal", bahaya: ["udara"], umur: 24, ikon: "asap_tebal",
    sub: {bau: ["Berbau asap / polusi", "sedang"], tebal: ["Langit kelabu pekat", "buruk"], sangat: ["Sangat pekat", "tua"]}},
  sesak_napas: {nama: "Sesak napas", bahaya: ["udara"], umur: 24, ikon: "sesak_napas",
    sub: {perih: ["Mata perih / batuk", "sedang"], sesak: ["Sesak napas", "buruk"], berat: ["Perlu pertolongan medis", "tua"]}},
  jarak_pandang: {nama: "Jarak pandang", bahaya: ["udara"], umur: 12, ikon: "jarak_pandang",
    sub: {p500: ["Kurang dari 500 m", "buruk"], p1000: ["500 m–1 km", "sedang"], p3000: ["1–3 km", "baik"]}},
  sumur_kering: {nama: "Sumur kering", bahaya: ["kekeringan"], umur: 168, ikon: "sumur_kering",
    sub: {surut: ["Air menyusut", "sedang"], kering: ["Sumur kering", "buruk"]}},
  gagal_panen: {nama: "Gagal panen", bahaya: ["kekeringan"], umur: 168, ikon: "gagal_panen",
    sub: {sebagian: ["Sebagian lahan", "sedang"], seluruh: ["Seluruh lahan", "tua"]}},
  antre_air: {nama: "Antre air", bahaya: ["kekeringan"], umur: 24, ikon: "antre_air",
    sub: {antre: ["Antre panjang", "sedang"], tangki: ["Bergantung air tangki", "api"], habis: ["Air tangki habis", "buruk"]}},

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
  guncang: "M3 12l2.5-4 3 8 3-10 3 12 3-8 2.5 2M3 20h18",
  rusak_gedung: "M4 21V9l6-4v16M10 21h10V12l-4-3M7 12h.01M7 16h.01M14 15l2 2-2 2",
  tsunami_tanda: "M2 18c3 0 3-2 6-2s3 2 6 2 3-2 8-2M4 13c1-5 5-8 10-8-3 2-3 5 0 6-3 1-6 0-10 2zM2 21h20",
  abu: "M7 15a4 4 0 1 1 1-7.8A5 5 0 0 1 18 9a3.5 3.5 0 0 1 0 7H7zM8 19h.01M12 20h.01M16 19h.01",
  lahar: "M3 20l6-12 3 5 3-7 6 14zM9 8c1 2 1 4-1 6M14 17c1-1 1-2 3-2",
  gemuruh: "M12 3l-2 5 3 2-3 4 5-3-2-3 3-2zM4 9c-1 2-1 4 0 6M20 9c1 2 1 4 0 6M2 7c-1.5 3-1.5 7 0 10M22 7c1.5 3 1.5 7 0 10",
  pohon_tumbang: "M3 20h18M14 20l-4-9M10 11l-6-1M10 11l1-6M10 11l5-2M14 20l5-4",
  atap_rusak: "M2 12l10-8 10 8M5 11v9h14v-9M12 11l-2 3 3 2-2 4",
  puting_beliung: "M4 5h16M6 9h12M8 13h8M10 17h4M12 21h.01",
  hujan_es: "M12 3v6M9 5l3 2 3-2M12 14h.01M7 17h.01M17 17h.01M12 21h.01M7 12h.01M17 12h.01",
  asap_tebal: "M4 8c3-3 5 3 8 0s5 3 8 0M4 13c3-3 5 3 8 0s5 3 8 0M4 18c3-3 5 3 8 0s5 3 8 0",
  sesak_napas: "M12 3v8M12 11c-2 0-3 1-5 3-1.5 2-2 4-1 6h5M12 11c2 0 3 1 5 3 1.5 2 2 4 1 6h-5",
  jarak_pandang: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM4 4l16 16",
  sumur_kering: "M5 9h14M7 9v11h10V9M9 9V5h6v4M11 14l2 3M13 14l-2 3",
  gagal_panen: "M12 21v-9M12 12c0-4-3-6-6-6 0 4 2 6 6 6zM12 15c0-3 2-5 5-5 0 3-2 5-5 5M5 21h14M16 4l4 4M20 4l-4 4",
  antre_air: "M12 4s4 4.5 4 7.5a4 4 0 0 1-8 0C8 8.5 12 4 12 4zM4 21v-4M4 14.5h.01M9 21v-3M15 21v-3M20 21v-4M20 14.5h.01",
  coret: "M4 4l16 16",
};

export default {BAHAYA, bahayaDari, WARNA, JENIS, IKON, jenisUntuk};
