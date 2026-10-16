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
  gempa: {nama: "Gempa bumi", pendek: "Gempa", warna: "#7b4b2a", gambar: "bencana-gempa.jpg",
    sumber: "Informasi gempa BMKG (magnitudo, kedalaman, jarak pusat gempa ke lokasi Anda)",
    tindakan: {
      1: ["Periksa retakan di dinding, tiang, dan atap sebelum masuk kembali ke rumah.", "Waspadai gempa susulan dalam beberapa hari ke depan.",
        "Ikuti informasi resmi BMKG; jangan sebarkan kabar yang belum jelas sumbernya."],
      2: ["Saat terasa guncangan: Merunduk, Berlindung di bawah meja kokoh, dan Berpegangan sampai guncangan berhenti.",
        "Setelah guncangan berhenti, keluar rumah dengan tenang lewat tangga, jangan lift; jauhi kaca, tiang, dan bangunan tinggi.",
        "Matikan kompor dan listrik; periksa bau gas.", "Bila tinggal di pesisir dan guncangan kuat atau lama, langsung ke tempat tinggi tanpa menunggu sirene."],
      3: ["Keluar ke lapangan terbuka, jauhi bangunan, tebing, dan pohon besar.", "Tolong sesama dan berikan pertolongan pertama; laporkan korban ke 112.",
        "Jangan masuk ke bangunan yang retak sampai diperiksa petugas."],
    }},
  tsunami: {nama: "Tsunami", pendek: "Tsunami", warna: "#0f6e8c", gambar: "bencana-tsunami.jpg",
    sumber: "Informasi gempa BMKG yang menyatakan berpotensi tsunami",
    tindakan: {
      2: ["Bila Anda di pesisir atau muara sungai: segera menjauhi pantai ke tempat yang tinggi atau minimal 3 km ke darat.",
        "Jangan menunggu email, sirene, atau melihat air laut surut: guncangan kuat di pesisir sudah tanda untuk lari.",
        "Berjalan kaki atau naik motor; mobil mudah terjebak macet.", "Ikuti rambu jalur evakuasi tsunami menuju titik kumpul."],
      3: ["Segera menjauhi pantai ke tempat tinggi atau lantai 3 ke atas bangunan beton yang kokoh.",
        "Tetap di tempat aman sampai BMKG mengakhiri peringatan; gelombang bisa datang lebih dari sekali.",
        "Jangan kembali ke pantai untuk melihat air atau mengambil barang."],
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
};

/* tindakan untuk tingkat t: pakai tingkat tertinggi yang ada dan <= t; kalau tidak ada (tsunami tanpa waspada), yang terendah */
export function tindakanUntuk(bencana, t) {
  const T = BENCANA[bencana]?.tindakan; if (!T) return [];
  const ada = Object.keys(T).map(Number).sort((a, b) => a - b);
  const pilih = ada.filter(x => x <= t).pop() ?? ada[0];
  return T[pilih];
}

export default {TINGKAT, HARI, BENCANA, tindakanUntuk};
