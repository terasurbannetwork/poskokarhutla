/* Peringatan Dini (EWS) — SATU sumber katalog bencana, tingkat, dan tindak lanjut untuk worker (email, src/ews.js),
   halaman /peringatan (public/peringatan.js), dan uji. Tidak ada logika hitung di sini; aturan "kena atau tidak" ada di
   src/ews.js (nilaiTitik). Isi tindakan disarikan dari panduan BNPB (Buku Saku Tanggap Tangkas Tangguh), BMKG
   (gempa & tsunami), dan Manggala Agni; ditulis untuk warga, bukan petugas.

   tingkat: 1 Waspada, 2 Siaga, 3 Awas (sama dengan status banjir/longsor di public/banjir/data/status.json).
   tindakan[tingkat] = daftar kalimat perintah, urut dari yang paling penting. Tingkat yang tidak ada memakai yang lebih
   rendah terdekat. gambar = berkas di public/img (JPG/PNG, bukan SVG: Gmail tidak menampilkan SVG). */

export const TINGKAT = {
  1: {nama: "Waspada", warna: "#d9a400", latar: "#fff6d6", arti: "Ada kemungkinan terjadi. Siapkan diri."},
  2: {nama: "Siaga", warna: "#e0701f", latar: "#ffe9d6", arti: "Kemungkinan besar terjadi. Bersiap bertindak."},
  3: {nama: "Awas", warna: "#c62828", latar: "#fde2e0", arti: "Sedang atau segera terjadi. Bertindak sekarang."},
};

/* hari: kunci yang dipakai email & layar untuk "hari ini / besok / lusa" */
export const HARI = ["Hari ini", "Besok", "Lusa"];

/* KI-56: rujukan butir karhutla, banjir, longsor, dan rob. Buku Saku Tanggap Tangkas Tangguh Menghadapi Bencana, BNPB:
   edisi 2012 = bnpb.go.id/storage/app/media/uploads/migration/pubs/478.pdf, cetakan 4 (2019) = bnpb.go.id/storage/app/media/uploads/24/buku-data-bencana/6-buku-saku-cetakan-4-2019.pdf
   (nomor halaman = nomor cetak di buku, dibaca 25 Nov 2026). Dipakai lewat b12(hlm) dan b19(hlm). */
const b12 = n => `BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. ${n}`;
const b19 = n => `BNPB, Buku Saku Tanggap Tangkas Tangguh (cetakan 4, 2019), hlm. ${n}`;

export const BENCANA = {
  karhutla: {nama: "Kebakaran hutan & lahan", pendek: "Karhutla", warna: "#e2711d", gambar: "bencana-karhutla.jpg",
    sumber: "Indeks cuaca kebakaran (FWI) prakiraan 3 hari dan titik panas satelit NASA FIRMS",
    /* KI-56: butir lama tanpa sumber (nomor 113 dan Manggala Agni, tas siaga, matikan listrik dan gas, jangan memadamkan api besar sendiri, ke puskesmas bila sesak,
       anak/lansia/ibu hamil) dibuang atau diganti butir yang ada di Buku Saku. */
    tindakan: {
      1: ["Jangan membakar rumput, sampah, atau puing, dan hindari membakar saat cuaca berangin.", "Bila terpaksa membakar, pastikan api sudah mati dan area bersih dari bahan mudah terbakar sebelum pergi.",
        "Jangan membuang puntung rokok sembarangan, dan matikan api setelah berkemah."],
      2: ["Bila tidak berkepentingan, jangan keluar rumah; tutup akses udara berasap ke dalam rumah.",
        "Lindungi pernapasan dengan masker atau kain saat beraktivitas di luar ruangan; masker N95 memberi perlindungan lebih baik. Cuci tangan dan wajah sesudahnya.",
        "Cukupi asupan air putih, buah, dan makanan bergizi.", "Bila melihat api, laporkan kepada Ketua RT atau pemuka masyarakat agar pemadaman diusahakan."],
      3: ["Bila api terus menjalar, segera laporkan kepada Posko Kebakaran terdekat atau pihak terkait.", "Tinggal di dalam rumah, tutup akses udara berasap, dan jaga udara dalam ruangan sebersih mungkin.",
        "Segera periksa ke dokter bila memiliki gangguan jantung atau paru-paru."],
    },
    rujukan: {
      1: [b19(55), b19(55), b12(36)],
      2: [b19(56), b19(56), b19(56), b12(36)],
      3: [b19(56), b19(56), b19(56)],
    }},
  banjir: {nama: "Banjir", pendek: "Banjir", warna: "#1f78c8", gambar: "bencana-banjir.jpg",
    sumber: "Status banjir per kecamatan dari prakiraan hujan dan kondisi sungai",
    /* KI-56: angka 15 cm dan 60 cm, "bersihkan selokan", "pantau tinggi air sungai" tidak ada di Buku Saku dan dibuang. */
    tindakan: {
      1: ["Ketahui rute evakuasi dan daerah yang lebih tinggi, dan bicarakan dengan keluarga tempat bertemu bila terpencar.",
        "Siapkan diri untuk hidup mandiri sekurangnya tiga hari: tas siaga bencana, makanan, dan air minum.",
        "Ketahui cara mematikan air, listrik, dan gas.", "Simpan dokumen penting dengan baik."],
      2: ["Simak informasi banjir dari media; informasi resmi biasanya berasal dari BPBD di daerah Anda.",
        "Bila bersiap evakuasi, amankan rumah dan letakkan barang berharga di bagian yang lebih tinggi di dalam rumah.",
        "Bersihkan dan siapkan penampungan air untuk berjaga-jaga bila kehabisan air bersih."],
      3: ["Segera evakuasi ke tempat yang lebih tinggi; mengungsilah sedini mungkin selagi genangan masih bisa dilewati.",
        "Matikan jaringan listrik bila ada instruksi pihak berwenang, cabut alat yang tersambung listrik, dan jangan menyentuh peralatan listrik saat berdiri di atas atau dalam air.",
        "Jangan berjalan di arus air: beberapa langkah di arus bisa membuat Anda jatuh. Jangan mengemudikan mobil di wilayah banjir.",
        "Waspada saluran air dan tempat lewatnya arus deras, karena banjir bandang kerap tiba tanpa peringatan."],
    },
    rujukan: {
      1: [b19(34), b19(34), b19(34), b19(35)],
      2: [b19(36) + "; " + b19(33), b19(36), b19(37)],
      3: [b19(36) + "; " + b12(19), b19(36), b19(37), b19(37)],
    }},
  longsor: {nama: "Tanah longsor", pendek: "Longsor", warna: "#8a5a2b", gambar: "bencana-longsor.jpg",
    sumber: "Status longsor per kecamatan dari hujan kumulatif dan kerentanan lereng",
    /* KI-56: butir lama tanpa sumber ("hujan lebih dari 2 jam", tidur di kamar menempel lereng, tas siaga, lari menyamping, jangan kembali sampai petugas menyatakan)
       diganti butir Buku Saku. Buku Saku hanya memberi tindakan saat bencana (menjauhi gemuruh dan zona evakuasi), bukan ambang jam hujan. */
    tindakan: {
      1: ["Kenali tanda utama longsor: retakan vertikal pada tebing, air tanah muncul tiba-tiba, air sumur di sekitar tebing keruh, atau longsoran batu-batu kecil.",
        "Tutup rekahan di atas lereng agar air tidak cepat masuk ke dalam tanah.", "Kenali daerah rawan longsor di sekitar tempat tinggal Anda."],
      2: ["Waspada saat curah hujan tinggi.", "Jaga selokan dan saluran drainase agar tidak tersumbat, supaya air hujan mengalir menjauhi lereng.",
        "Longsor biasanya terjadi begitu cepat sehingga waktu evakuasi mandiri terbatas; kenali lebih dulu zona evakuasi yang telah ditentukan."],
      3: ["Segera evakuasi menjauhi suara gemuruh atau arah datangnya longsoran.", "Bila mendengar sirine peringatan longsor, segera evakuasi ke zona evakuasi yang telah ditentukan.",
        "Hindari wilayah longsor karena tanah labil, dan antisipasi longsor susulan bila hujan turun setelahnya."],
    },
    rujukan: {
      1: [b12(23), b19(43), b19(42)],
      2: [b19(43), b19(41) + "; " + b19(43), b19(40) + "; " + b19(44)],
      3: [b19(44), b19(44), b19(44)],
    }},
  cuaca: {nama: "Cuaca ekstrem", pendek: "Cuaca ekstrem", warna: "#5b5fc7", gambar: "bencana-cuaca.jpg",
    sumber: "Peringatan dini cuaca BMKG (nowcast) untuk kecamatan Anda",
    /* PB-42: butir disalin dari BNPB, Buku Saku Tanggap Tangkas Tangguh Menghadapi Bencana edisi 2012 (bnpb.go.id/storage/app/media/uploads/migration/pubs/478.pdf),
       bagian Angin Puting Beliung, Banjir, dan Gelombang Pasang; butir lama tanpa sumber (tunda perjalanan, berteduh di bawah pohon, jendela kaca) dibuang.
       Tingkat dari CAP severity BMKG: peringatan terpadu Severe = Siaga (2), Extreme = Awas (3); email Moderate = 2, Severe dan Extreme = 3, lainnya 1 (src/ews.js). */
    tindakan: {
      1: ["Perhatikan tanda cuaca buruk: gumpalan awan gelap, besar, dan tinggi, petir dan guruh terlihat dari kejauhan, atau suara gemuruh terdengar dari kejauhan.",
        "Bawa masuk barang di luar rumah agar tidak terbawa angin.", "Bila sedang berlayar, hindari daerah laut yang sedang dilanda cuaca buruk."],
      2: ["Tutup jendela dan pintu, lalu kunci.", "Matikan aliran listrik dan peralatan elektronik.",
        "Hindari bangunan yang tinggi, tiang listrik, dan papan reklame.",
        "Jika terasa petir akan menyambar, segera membungkuk, duduk, dan peluk lutut ke dada; jangan tiarap di atas tanah."],
      3: ["Segera masuk ke dalam rumah atau bangunan yang kokoh.",
        "Saat terjadi banjir, hindari berjalan di dekat saluran air agar tidak terseret arus banjir.",
        "Bila genangan naik, mengungsi ke posko banjir sedini mungkin selagi genangan masih bisa dilewati.",
        "Setelah reda, pastikan tidak ada anggota keluarga yang cedera, beri pertolongan darurat bila ada korban, dan laporkan kerusakan listrik, gas, dan lainnya kepada yang berwenang."],
    },
    rujukan: {
      1: ["BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 28", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 28", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 33"],
      2: ["BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 28", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 28",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 29", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 29"],
      3: ["BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 29", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 18",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 19", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 30"],
    }},
  /* PB-44: butir gempa dan tsunami disalin dari dua dokumen resmi (dibaca 17 Nov 2026); butir lama tanpa sumber (minimal 3 km ke darat,
     lantai 3 bangunan beton, naik motor, matikan listrik, bau gas, nomor 112) dibuang. rujukan[tingkat][i] = sumber butir ke-i (tests/layar/ews_tindakan.test.mjs).
     BMKG = "Petunjuk Keselamatan Gempabumi dan Tsunami", BMKG bersama JICA, content.bmkg.go.id/wp-content/uploads/Petunjuk-keselamatan-gembabumi-tsunami_171024.pdf
     BNPB = "Buku Saku Tanggap Tangkas Tangguh Menghadapi Bencana" edisi 2012, bnpb.go.id/storage/app/media/uploads/migration/pubs/478.pdf
     Tingkat tsunami mengikuti status ancaman BMKG di dokumen BMKG: Siaga = 2, Awas = 3; Waspada tsunami (gelombang < 0,5 m) tidak dipetakan ke tingkat 1. */
  gempa: {nama: "Gempa bumi", pendek: "Gempa", warna: "#7b4b2a", gambar: "bencana-gempa.jpg",
    sumber: "Informasi gempa BMKG (magnitudo, kedalaman, jarak pusat gempa ke lokasi Anda)",
    tindakan: {
      1: ["Jauhi bangunan yang retak, dan jangan masuk kembali sebelum ada arahan dari pihak berwenang.",
        "Waspadai gempa susulan dan pantau informasi resmi BMKG, BNPB, dan BPBD setempat.",
        "Jangan bertindak karena kabar yang belum jelas sumbernya."],
      2: ["Saat terasa guncangan: berlutut, berlindung di bawah barang yang kuat seperti meja, dan bertahan sambil berpegangan sampai gempa mereda.",
        "Jauhi kaca dan barang lain yang bisa jatuh menimpa.", "Setelah guncangan mereda, keluar dengan tenang dan jangan memakai lift.",
        "Bila sedang memasak, matikan kompor untuk mencegah kebakaran.",
        "Bila berada di pantai dan gempa terasa sangat kuat atau berlangsung sekitar 1 menit atau lebih, segera jauhi pantai menuju tempat yang lebih tinggi."],
      3: ["Di luar bangunan, cari tempat lapang dan jangan berdiri dekat gedung, tiang, dan pohon.",
        "Beri pertolongan pertama kepada orang di sekitar, lalu laporkan kejadian kerugian dan korban orang hilang.",
        "Jangan kembali ke dalam bangunan sebelum menerima arahan dari pihak berwenang."],
    },
    rujukan: {
      1: ["BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 5; BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Sesaat Setelah Gempabumi butir 4",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 5; BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Sesaat Setelah Gempabumi butir 1",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 5"],
      2: ["BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Saat Terjadi Gempabumi butir 2", "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Saat Terjadi Gempabumi butir 4",
        "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Saat Terjadi Gempabumi butir 5; BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 4",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 3",
        "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, bagian tsunami Perhatikan Jika Terasa Gempa Besar butir 3 dan 4"],
      3: ["BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 3", "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 5",
        "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Sesaat Setelah Gempabumi butir 4"],
    }},
  tsunami: {nama: "Tsunami", pendek: "Tsunami", warna: "#0f6e8c", gambar: "bencana-tsunami.jpg",
    sumber: "Informasi gempa BMKG yang menyatakan berpotensi tsunami",
    tindakan: {
      2: ["Segera lakukan evakuasi mandiri menuju tempat yang lebih tinggi atau titik kumpul sementara.",
        "Bila di pantai gempa terasa sangat kuat atau lama, air laut surut tiba-tiba, atau terdengar dentuman keras dari laut, segera jauhi pantai dan tepian sungai.",
        "Pergilah ke titik kumpul atau tempat evakuasi terdekat.",
        "Naiklah ke lantai yang lebih tinggi, atau panjat pohon tinggi yang berakar kuat."],
      3: ["Jangan ragu: segera lakukan evakuasi mandiri menuju tempat yang lebih tinggi atau titik kumpul sementara.",
        "Tetap di area evakuasi sampai pihak berwenang setempat menyatakan bahaya telah berlalu.",
        "Gelombang bisa datang berulang: setelah gelombang pertama surut, jangan segera turun ke daerah yang rendah.",
        "Cari informasi terkini dari sumber resmi dan hindari kabar dari sumber yang tidak diketahui."],
    },
    rujukan: {
      2: ["BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, status ancaman SIAGA", "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Perhatikan Jika Terasa Gempa Besar butir 3 dan 4a",
        "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Perhatikan Jika Terasa Gempa Besar butir 4a",
        "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Perhatikan Jika Terasa Gempa Besar butir 4b dan 4c"],
      3: ["BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, status ancaman AWAS", "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Perhatikan Jika Terasa Gempa Besar butir 5",
        "BNPB, Buku Saku Tanggap Tangkas Tangguh (2012), hlm. 10", "BMKG, Petunjuk Keselamatan Gempabumi dan Tsunami, Perhatikan Jika Terasa Gempa Besar butir 6"],
    }},
  rob: {nama: "Banjir rob (pasang laut)", pendek: "Rob", warna: "#2b8c86", gambar: "bencana-rob.jpg",
    sumber: "Prakiraan pasang air laut dari model Centurisk97 (hipotesis); peringatan rob dari BMKG bila ada",
    /* KI-56: Buku Saku menggolongkan banjir rob sebagai salah satu kategori banjir (hlm. 17, 2012) dan punya bab Gelombang Pasang; butir diambil dari kedua bab.
       Butir lama tanpa sumber (karung pasir, lubang saluran, parkir kendaraan, tambatkan perahu, ternak, jam pasang) dibuang. */
    tindakan: {
      1: ["Ikuti pemberitahuan dini dari prakiraan cuaca lewat radio dan alat komunikasi.", "Segera amankan barang berharga ke tempat yang lebih tinggi.",
        "Rencanakan tempat pengungsian bila terjadi gelombang pasang di pinggir pantai."],
      2: ["Perhatikan tanda: angin kencang, badai di tengah laut, atau cuaca yang tiba-tiba menjadi gelap.", "Bila sedang berlayar, hindari daerah laut yang sedang dilanda cuaca buruk.",
        "Bila bersiap evakuasi, amankan rumah dan letakkan barang berharga di bagian yang lebih tinggi di dalam rumah."],
      3: ["Saat gelombang pasang terjadi, jauhi pantai dan berlarilah ke dataran yang lebih tinggi.", "Matikan aliran listrik di dalam rumah.",
        "Mengungsilah ke posko banjir sedini mungkin selagi genangan masih bisa dilewati.", "Jangan berjalan di arus air."],
    },
    rujukan: {
      1: [b12(33), b12(19), b12(33)],
      2: [b12(32), b12(33), b19(36)],
      3: [b12(33), b12(18), b12(19), b19(37)],
    }},
  /* Udara (PB-38a). Tingkat BAWAAN SEMENTARA Q37 (rancangan agent): 1 = ISPU PM2,5 Tidak sehat (Permen LHK P.14/2020), 2 = Sangat tidak sehat, 3 = Berbahaya; label resmi kategori tampil di samping tingkat.
     Hanya anjuran warga dari siaran resmi Kemenkes; tiap butir punya rujukan paralel (dijaga tests/layar/ews_tindakan.test.mjs). Anjuran khusus tingkat ISPU, tindakan sekolah, dan tindakan dinas
     tidak ada dalam sumber yang dibaca, jadi tidak ditulis; "Kemenkes" di bawah = tiga halaman siaran Kemenkes di rujukan, bukan Permenkes. Dua siaran bertentangan soal N95 untuk kelompok rentan
     (2015: tidak dianjurkan; 2026: dianjurkan bila harus keluar): butir memakai siaran 2026 yang terbaru, pertentangannya menunggu keputusan pemilik. */
  udara: {nama: "Kualitas udara", pendek: "Udara", warna: "#6b6f7a", gambar: "bencana-karhutla.jpg",
    sumber: "PM2,5 rata-rata 24 jam stasiun BMKG, dipetakan ke kategori ISPU Permen LHK P.14/2020 (hitungan Centurisk97, bukan ISPU resmi)",
    tindakan: {
      1: ["Pakai masker saat kualitas udara memburuk dan batasi kegiatan di luar ruangan.", "Periksa indeks kualitas udara secara mandiri lewat aplikasi resmi.", "Jangan menyepelekan gejala pernapasan ringan."],
      2: ["Kalau tidak perlu, jangan keluar rumah, terutama balita, ibu hamil, dan orang tua.", "Bila harus keluar, pakai masker N95 dan pastikan terpasang tanpa celah di sisi atas, bawah, maupun samping.", "Masker bedah menyaring partikel besar, tidak partikel kecil; tidak ada masker yang melindungi dari semua gas asap.", "Segera ke puskesmas bila mulai sesak napas."],
      3: ["Kalau tidak perlu, jangan keluar rumah, terutama balita, ibu hamil, dan orang tua.", "Bila harus keluar, pakai masker N95 dan pastikan terpasang tanpa celah di sisi atas, bawah, maupun samping.", "Gejala berat: segera cari pertolongan medis ke puskesmas atau rumah sakit terdekat sebelum kondisi memburuk."],
    },
    rujukan: {
      1: ["Kemenkes, 21 Agustus 2026, \"Menkes: Pakai Masker dan Pantau Kualitas Udara untuk Cegah Dampak Asap Karhutla\" (kemkes.go.id)", "Kemenkes, 21 Agustus 2026, \"Menkes: Pakai Masker dan Pantau Kualitas Udara untuk Cegah Dampak Asap Karhutla\" (kemkes.go.id)", "Kemenkes, 21 Agustus 2026, \"Menkes: Pakai Masker dan Pantau Kualitas Udara untuk Cegah Dampak Asap Karhutla\" (kemkes.go.id)"],
      2: ["Kemenkes, 23 Oktober 2026, \"Kemenkes Perkuat Perlindungan Kesehatan Warga Terdampak Kabut Asap di Palangka Raya\" (kemkes.go.id)", "Kemenkes, 23 Oktober 2026, \"Kemenkes Perkuat Perlindungan Kesehatan Warga Terdampak Kabut Asap di Palangka Raya\" (kemkes.go.id)", "Kemenkes, 15 Oktober 2015, \"Penggunaan Masker Pada Asap Kebakaran Hutan\" (kemkes.go.id)", "Kemenkes, 23 Oktober 2026, \"Kemenkes Perkuat Perlindungan Kesehatan Warga Terdampak Kabut Asap di Palangka Raya\" (kemkes.go.id)"],
      3: ["Kemenkes, 23 Oktober 2026, \"Kemenkes Perkuat Perlindungan Kesehatan Warga Terdampak Kabut Asap di Palangka Raya\" (kemkes.go.id)", "Kemenkes, 23 Oktober 2026, \"Kemenkes Perkuat Perlindungan Kesehatan Warga Terdampak Kabut Asap di Palangka Raya\" (kemkes.go.id)", "Kemenkes, 21 Agustus 2026, \"Menkes: Pakai Masker dan Pantau Kualitas Udara untuk Cegah Dampak Asap Karhutla\" (kemkes.go.id)"],
    }},
  /* Butir dari Permen ESDM 15/2011 lewat MAGMA PVMBG (public/gunungapi/data/pedoman_krb.json). Level II Waspada = 1, III Siaga = 2, IV Awas = 3.
     rujukan[tingkat][i] = sumber butir ke-i; dijaga tests/layar/ews_tindakan.test.mjs. */
  gunungapi: {nama: "Gunung api", pendek: "Gunung api", warna: "#b5523b", gambar: "bencana-gunungapi.jpg",
    sumber: "Level aktivitas gunung api dari PVMBG (MAGMA Indonesia)",
    tindakan: {
      1: ["KRB I: tetap berkegiatan dengan meningkatkan kewaspadaan.", "KRB II: tetap berkegiatan dengan meningkatkan kewaspadaan terhadap ancaman bahaya.", "KRB III: tidak beraktivitas di sekitar kawah.", "Ikuti radius dan sektor yang ditetapkan PVMBG untuk gunung ini."],
      2: ["KRB I: tidak beraktivitas di sekitar lembah sungai yang berhulu di daerah puncak.", "KRB II: mulai menyiapkan diri untuk mengungsi sambil menunggu perintah pemerintah daerah sesuai rekomendasi teknis KESDM.", "KRB III: warga di wilayah terancam tidak boleh beraktivitas dan mulai menyiapkan diri untuk mengungsi.", "Ikuti radius dan sektor yang ditetapkan PVMBG untuk gunung ini."],
      3: ["KRB I: segera mengungsi berdasarkan perintah pemerintah daerah sesuai rekomendasi teknis KESDM.", "KRB II: segera mengungsi berdasarkan perintah pemerintah daerah sesuai rekomendasi teknis KESDM.", "KRB III: warga di wilayah terancam tidak boleh beraktivitas dan segera mengungsi.", "Ikuti radius dan sektor yang ditetapkan PVMBG untuk gunung ini."],
    },
    rujukan: {
      1: ["Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "MAGMA PVMBG"],
      2: ["Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "MAGMA PVMBG"],
      3: ["Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "Permen ESDM 15/2011 lewat MAGMA PVMBG", "MAGMA PVMBG"],
    }},
};

/* tindakan untuk tingkat t: pakai tingkat tertinggi yang ada dan <= t; kalau tidak ada (tsunami tanpa waspada), yang terendah */
export function tindakanUntuk(bencana, t) {
  const T = BENCANA[bencana]?.tindakan; if (!T) return [];
  const ada = Object.keys(T).map(Number).sort((a, b) => a - b);
  const pilih = ada.filter(x => x <= t).pop() ?? ada[0];
  return T[pilih];
}

export default {TINGKAT, HARI, BENCANA, tindakanUntuk};
