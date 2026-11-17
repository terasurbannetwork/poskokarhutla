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

export const BENCANA = {
  karhutla: {nama: "Kebakaran hutan & lahan", pendek: "Karhutla", warna: "#e2711d", gambar: "bencana-karhutla.jpg",
    sumber: "Indeks cuaca kebakaran (FWI) prakiraan 3 hari dan titik panas satelit NASA FIRMS",
    tindakan: {
      1: ["Jangan membakar sampah, lahan, atau sisa panen.", "Siapkan masker N95 atau KN95 untuk tiap anggota keluarga.",
        "Simpan nomor darurat: Manggala Agni, BPBD, pemadam kebakaran 113."],
      2: ["Tutup jendela dan pintu saat asap tercium; pakai masker N95 bila keluar rumah.", "Kurangi kegiatan di luar, terutama anak, lansia, ibu hamil, dan penderita asma.",
        "Siapkan tas siaga: dokumen penting, obat rutin, air minum, senter.", "Laporkan api atau asap baru lewat menu Lapor Warga."],
      3: ["Bila api terlihat dekat permukiman, jauhi arah angin dan asap, ikuti arahan petugas.", "Matikan listrik dan gas sebelum meninggalkan rumah bila diminta mengungsi.",
        "Jangan memadamkan api besar sendiri; hubungi 113 atau Manggala Agni.", "Sesak napas atau dada nyeri: segera ke puskesmas atau rumah sakit."],
    }},
  banjir: {nama: "Banjir", pendek: "Banjir", warna: "#1f78c8", gambar: "bencana-banjir.jpg",
    sumber: "Status banjir per kecamatan dari prakiraan hujan dan kondisi sungai",
    tindakan: {
      1: ["Bersihkan saluran air dan selokan di sekitar rumah.", "Pindahkan dokumen, barang elektronik, dan obat ke tempat tinggi.",
        "Pantau tinggi air sungai terdekat dan info dari BPBD."],
      2: ["Siapkan tas siaga: dokumen dalam plastik kedap air, obat, air minum, makanan 3 hari, senter, pengisi daya.",
        "Ketahui jalur evakuasi dan lokasi pengungsian terdekat.", "Isi penuh baterai ponsel dan simpan nomor BPBD."],
      3: ["Matikan listrik dari meteran dan tutup katup gas.", "Segera mengungsi ke tempat tinggi, dahulukan anak, lansia, dan difabel.",
        "Jangan berjalan atau berkendara menembus arus: air 15 cm bisa menjatuhkan orang, 60 cm menghanyutkan mobil.",
        "Jauhi kabel listrik dan tiang yang terendam."],
    }},
  longsor: {nama: "Tanah longsor", pendek: "Longsor", warna: "#8a5a2b", gambar: "bencana-longsor.jpg",
    sumber: "Status longsor per kecamatan dari hujan kumulatif dan kerentanan lereng",
    tindakan: {
      1: ["Perhatikan tanda awal: retakan baru di tanah atau dinding, pohon atau tiang miring, mata air keruh tiba-tiba.",
        "Tutup retakan tanah dengan tanah liat agar air hujan tidak meresap.", "Kenali jalur menjauhi lereng menuju tempat aman."],
      2: ["Saat hujan deras lebih dari 2 jam, jangan tidur di kamar yang menempel lereng.", "Siapkan tas siaga dan sepakati titik kumpul keluarga.",
        "Hindari melintas di jalan bawah tebing selama hujan."],
      3: ["Segera tinggalkan rumah di kaki atau puncak lereng; mengungsi ke tanah datar yang jauh dari tebing.",
        "Bila terdengar gemuruh atau tanah bergerak, lari menyamping menjauhi arah longsoran.", "Jangan kembali ke rumah sampai dinyatakan aman oleh petugas."],
    }},
  cuaca: {nama: "Cuaca ekstrem", pendek: "Cuaca ekstrem", warna: "#5b5fc7", gambar: "bencana-cuaca.jpg",
    sumber: "Peringatan dini cuaca BMKG (nowcast) untuk kecamatan Anda",
    tindakan: {
      1: ["Tunda perjalanan yang tidak penting selama peringatan berlaku.", "Amankan benda di luar rumah yang bisa terbang tertiup angin."],
      2: ["Jauhi pohon besar, baliho, dan tiang listrik saat angin kencang.", "Cabut peralatan listrik saat petir; jangan berteduh di bawah pohon di lapangan terbuka.",
        "Nelayan dan penyeberangan: tunda melaut."],
      3: ["Tetap di dalam bangunan yang kokoh, jauh dari jendela kaca.", "Bila banjir mulai naik, ikuti tindakan banjir: matikan listrik dan menuju tempat tinggi."],
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
    sumber: "Prakiraan pasang air laut di titik pesisir dan peringatan rob BMKG",
    tindakan: {
      1: ["Pindahkan barang berharga dan dokumen ke tempat tinggi.", "Perhatikan jam pasang tertinggi pada siang atau malam hari."],
      2: ["Siapkan karung pasir di pintu rumah; tutup lubang saluran yang bisa membalikkan air laut.",
        "Hindari parkir kendaraan di jalan pesisir yang rendah.", "Nelayan: tambatkan perahu lebih kuat."],
      3: ["Matikan listrik bila air mulai masuk rumah.", "Ungsikan anak, lansia, dan ternak ke tempat yang lebih tinggi.",
        "Jangan menyeberang jalan yang tergenang air laut berarus."],
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
      1: ["Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:30)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:36)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:42)", "MAGMA PVMBG (gunungapi_status.json)"],
      2: ["Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:31)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:37)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:43)", "MAGMA PVMBG (gunungapi_status.json)"],
      3: ["Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:32)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:38)", "Permen ESDM 15/2011 lewat MAGMA (pedoman_krb.json:44)", "MAGMA PVMBG (gunungapi_status.json)"],
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
