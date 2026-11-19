/* Spek isian Lapor Bencana BNPB (data/kajian-bnpb/lapor-ai, ALGORITMA A0).
   Jenis dan subjenis = Tabel 1 batang tubuh Rancangan Juklak Standar Data (standar-data-bencana/03-juklak-baru/naskah/01-batang-tubuh.md).
   ponytail: isian di bawah adalah subset awal Lampiran I (tahap Laporan awal) + satu isian khusus per jenis dari deck pemilik;
   tiket LA-01 menggantinya dengan berkas bangkitan scripts/lapor/spek.py dari Lampiran I dan III tanpa mengubah bentuk objek ini. */

/* sub: [nama, penjelasan awam]. Penjelasan untuk warga yang tidak hafal istilah (pemilik 19 Nov 2026: "warga umum mana tau gempa tektonik"). */
const S = (...p) => p.map(([nama, ket]) => ({nama, ket}));
export const JENIS = [
  {id: "banjir", label: "Banjir", ket: "Air menggenangi rumah, jalan, atau sawah", sub: S(
    ["Banjir luapan sungai", "Air sungai meluap ke permukiman atau sawah"],
    ["Banjir genangan", "Air hujan menggenang karena tidak bisa mengalir atau meresap"],
    ["Banjir bandang", "Air datang tiba-tiba dan deras, membawa lumpur, batu, atau kayu"],
    ["Banjir rob", "Air laut pasang masuk ke daratan di pesisir"],
    ["Banjir lahar", "Lumpur dan batu dari gunung api terbawa air hujan"],
    ["Banjir akibat tanggul, waduk, atau bendungan jebol", "Air keluar karena tanggul, waduk, atau bendungan rusak"])},
  {id: "longsor", label: "Tanah longsor", ket: "Tanah, lereng, atau tebing bergerak turun", sub: S(
    ["Longsoran", "Tanah atau lereng bergerak turun"],
    ["Jatuhan batuan", "Batu jatuh atau runtuh dari tebing"],
    ["Aliran bahan rombakan", "Campuran tanah, batu, dan air mengalir cepat menuruni lereng"],
    ["Gerakan tanah lambat", "Tanah retak atau bergeser pelan selama berhari-hari"])},
  {id: "abrasi", label: "Gelombang pasang dan abrasi", ket: "Ombak tinggi atau pantai terkikis", sub: S(
    ["Gelombang pasang", "Ombak tinggi menerjang pantai dan permukiman"],
    ["Abrasi pantai", "Garis pantai terkikis ombak sehingga daratan berkurang"])},
  {id: "cuaca", label: "Cuaca ekstrem", ket: "Angin kencang, puting beliung, atau hujan es", sub: S(
    ["Puting beliung", "Angin berputar kencang dari awan gelap, berlangsung singkat"],
    ["Angin kencang", "Angin keras bertiup lama tanpa berputar"],
    ["Siklon tropis", "Badai besar dari laut, angin dan hujan lebat berhari-hari"],
    ["Hujan es", "Butiran es jatuh bersama hujan"],
    ["Suhu udara ekstrem", "Udara jauh lebih panas atau dingin dari biasanya"])},
  {id: "kekeringan", label: "Kekeringan", ket: "Kekurangan air dalam waktu lama", sub: S(
    ["Kekeringan meteorologis", "Hujan jauh lebih sedikit dari biasanya dalam waktu lama"],
    ["Kekeringan pertanian", "Tanaman layu atau gagal panen karena kurang air"],
    ["Kekeringan hidrologis", "Sumur, sungai, atau waduk mengering"])},
  {id: "karhutla", label: "Kebakaran hutan dan lahan", ket: "Api di hutan, kebun, ladang, atau gambut", sub: S(
    ["Kebakaran hutan", "Api membakar kawasan hutan"],
    ["Kebakaran lahan bukan gambut", "Api membakar kebun, semak, atau ladang di tanah biasa"],
    ["Kebakaran lahan gambut", "Api di tanah gambut, berasap tebal dan bisa menjalar di bawah tanah"])},
  {id: "gempa", label: "Gempa bumi", ket: "Tanah dan bangunan terasa berguncang", sub: S(
    ["Gempa tektonik", "Guncangan karena pergeseran lempeng atau patahan bumi, paling sering terjadi"],
    ["Gempa vulkanik", "Guncangan di sekitar gunung api yang sedang aktif"],
    ["Gempa runtuhan", "Guncangan kecil karena runtuhnya gua atau lubang tambang"])},
  {id: "tsunami", label: "Tsunami", ket: "Gelombang laut besar naik ke daratan", sub: S(
    ["Tsunami seismik", "Gelombang laut besar sesudah gempa kuat"],
    ["Tsunami nonseismik", "Gelombang laut besar tanpa gempa, misalnya karena longsor bawah laut atau letusan gunung api"])},
  {id: "erupsi", label: "Erupsi gunung api", ket: "Gunung api meletus, abu, atau awan panas", sub: S(
    ["Awan panas guguran", "Awan panas meluncur dari kubah lava yang runtuh"],
    ["Awan panas letusan", "Awan panas keluar saat gunung api meletus"],
    ["Hujan abu", "Abu gunung api turun seperti hujan"],
    ["Gas vulkanik beracun", "Gas berbau menyengat atau membuat sesak di sekitar gunung api"],
    ["Lontaran material pijar", "Batu atau kerikil membara terlempar dari kawah"])},
  {id: "kebakaran_gedung", label: "Kebakaran gedung dan permukiman", ket: "Api di rumah warga atau bangunan", sub: S(
    ["Kebakaran gedung", "Api di gedung kantor, sekolah, pasar, atau bangunan besar"],
    ["Kebakaran permukiman", "Api membakar rumah warga"])},
];

/* kelompok berurutan (ALGORITMA A2). tanya = pertanyaan kelompok sekaligus; "tidak ada" mengisi nihil seluruh kelompok. */
export const KELOMPOK = [
  {id: "kejadian", label: "Kejadian", wajib: true},
  {id: "korban", label: "Korban", tanya: "Ada korban jiwa, hilang, atau luka? Sebutkan jumlahnya, atau ketik *tidak ada*."},
  {id: "pengungsian", label: "Warga terdampak dan mengungsi", tanya: "Berapa keluarga dan warga yang terdampak, dan berapa yang mengungsi?"},
  {id: "rumah", label: "Kerusakan rumah", tanya: "Berapa rumah rusak berat, rusak sedang, rusak ringan, atau terendam?"},
  {id: "fasilitas", label: "Fasilitas dan jalan", tanya: "Ada sekolah, fasilitas kesehatan, tempat ibadah, jalan, atau jembatan yang rusak?"},
  {id: "khusus", label: "Data khusus"},
  {id: "kebutuhan", label: "Kebutuhan"},
];

/* tipe: pilihan_jenis | pilihan_sub | waktu | lokasi | teks | angka. wajib = wajib laporan awal (D5). */
export const ISIAN = [
  {nama: "jenis", label: "Jenis bencana", kelompok: "kejadian", tipe: "pilihan_jenis", wajib: true},
  {nama: "subjenis", label: "Subjenis", kelompok: "kejadian", tipe: "pilihan_sub", wajib: true},
  {nama: "waktu", label: "Waktu kejadian", kelompok: "kejadian", tipe: "waktu", wajib: true, tanya: "Kapan kejadiannya? Tulis tanggal dan jam."},
  {nama: "lokasi", label: "Lokasi", kelompok: "kejadian", tipe: "lokasi", wajib: true, tanya: "Di mana lokasinya? Bagikan lokasi, atau tulis nama desa, kecamatan, dan kabupaten/kota."},
  {nama: "kronologi", label: "Kronologi singkat", kelompok: "kejadian", tipe: "teks", wajib: true, maks: 500, tanya: "Ceritakan singkat apa yang terjadi."},
  /* ket = definisi yang tampil di formulir (pemilik 19 Nov 2026: "kasih definisi mengungsi", "definisi rusak berat ... itu dari mana?").
   Sumber: Rancangan Juklak Standar Data Kejadian dan Dampak Bencana (standar-data-bencana/03-juklak-baru/naskah):
   korban dan pengungsi = Lampiran II no. 16-20 dan 56; tingkat kerusakan rumah = Lampiran I bagian C angka 1-4. Diringkas, makna tidak diubah.
   KK tidak didefinisikan juklak (juklak menghitung orang); keterangannya mengikuti arti Kartu Keluarga. Perbandingan ukuran (selutut, hektare)
   adalah alat bantu perkiraan, bukan definisi juklak. */
  {nama: "meninggal", label: "Meninggal", kelompok: "korban", tipe: "angka", satuan: "orang", maks: 100000, ket: "Orang yang meninggal dunia karena kejadian ini"},
  {nama: "hilang", label: "Hilang", kelompok: "korban", tipe: "angka", satuan: "orang", maks: 100000, ket: "Orang yang tidak ditemukan atau tidak diketahui keberadaannya setelah kejadian"},
  {nama: "luka", label: "Luka-luka", kelompok: "korban", tipe: "angka", satuan: "orang", maks: 1000000, ket: "Orang yang luka atau sakit karena kejadian ini, dirawat inap maupun berobat jalan"},
  {nama: "luka_inap", label: "Dirawat inap", kelompok: "korban", tipe: "angka", satuan: "orang", maks: 1000000, bila: "luka",
    tanya: "Dari korban luka itu, berapa orang yang dirawat inap di puskesmas atau rumah sakit?", ket: "Luka berat = dirawat inap; sisanya luka ringan (berobat jalan)"},
  {nama: "terdampak_kk", label: "Keluarga terdampak", kelompok: "pengungsian", tipe: "angka", satuan: "KK", maks: 5000000,
    ket: "Keluarga yang rumahnya terkena atau kehidupannya terganggu oleh kejadian ini, mengungsi atau tidak. Dihitung per Kartu Keluarga"},
  {nama: "terdampak_jiwa", label: "Warga terdampak", kelompok: "pengungsian", tipe: "angka", satuan: "orang", maks: 20000000,
    ket: "Jumlah orang dalam keluarga terdampak. Biarkan ? bila hanya tahu jumlah KK"},
  {nama: "mengungsi_jiwa", label: "Mengungsi", kelompok: "pengungsian", tipe: "angka", satuan: "orang", maks: 5000000,
    ket: "Orang yang terpaksa keluar dari tempat tinggalnya karena kejadian ini, termasuk yang dievakuasi sebelum dampak. Tinggal di tenda, gedung publik, atau rumah kerabat"},
  {nama: "mengungsi_kk", label: "Keluarga mengungsi", kelompok: "pengungsian", tipe: "angka", satuan: "KK", maks: 2000000,
    ket: "Jumlah keluarga yang mengungsi, dihitung per Kartu Keluarga (KK), bukan per orang. Satu rumah tangga dengan satu KK = 1, berapa pun anggotanya"},
  {nama: "titik_pengungsian", label: "Titik pengungsian", kelompok: "pengungsian", tipe: "teks", maks: 300, bila: "mengungsi_jiwa",
    tanya: "Di mana saja warga mengungsi? Tulis nama tempatnya, misalnya Masjid Al Ikhlas, SDN 2 Cibeber, tenda di lapangan desa."},
  {nama: "rumah_berat", label: "Rusak berat", kelompok: "rumah", tipe: "angka", satuan: "rumah", maks: 2000000, ket: "Rumah roboh, atau sebagian besar struktur utama, dinding, dan lantai rusak"},
  {nama: "rumah_sedang", label: "Rusak sedang", kelompok: "rumah", tipe: "angka", satuan: "rumah", maks: 2000000, ket: "Sebagian kecil struktur utama rusak, tetapi rumah masih berdiri"},
  {nama: "rumah_ringan", label: "Rusak ringan", kelompok: "rumah", tipe: "angka", satuan: "rumah", maks: 2000000, ket: "Retak-retak pada dinding plesteran, struktur masih bisa dipakai"},
  {nama: "rumah_terendam", label: "Terendam", kelompok: "rumah", tipe: "angka", satuan: "rumah", maks: 5000000, ket: "Rumah tergenang air tanpa kerusakan struktur"},
  {nama: "fasilitas_sekolah", label: "Sekolah", kelompok: "fasilitas", tipe: "angka", satuan: "unit", maks: 100000, ket: "Gedung sekolah atau madrasah yang rusak"},
  {nama: "fasilitas_kesehatan", label: "Fasilitas kesehatan", kelompok: "fasilitas", tipe: "angka", satuan: "unit", maks: 100000, ket: "Puskesmas, klinik, atau rumah sakit yang rusak"},
  {nama: "fasilitas_ibadah", label: "Tempat ibadah", kelompok: "fasilitas", tipe: "angka", satuan: "unit", maks: 100000, ket: "Masjid, musala, gereja, pura, vihara, atau kelenteng yang rusak"},
  {nama: "jalan_jembatan", label: "Jalan atau jembatan", kelompok: "fasilitas", tipe: "angka", satuan: "titik", maks: 100000, ket: "Ruas jalan atau jembatan yang rusak atau putus"},
  {nama: "nama_sekolah", label: "Nama sekolah rusak", kelompok: "fasilitas", tipe: "teks", maks: 300, bila: "fasilitas_sekolah", tanya: "Sekolah mana saja yang rusak? Tulis nama sekolahnya."},
  {nama: "nama_faskes", label: "Nama fasilitas kesehatan rusak", kelompok: "fasilitas", tipe: "teks", maks: 300, bila: "fasilitas_kesehatan", tanya: "Puskesmas, klinik, atau rumah sakit mana yang rusak? Tulis namanya."},
  {nama: "nama_ibadah", label: "Nama tempat ibadah rusak", kelompok: "fasilitas", tipe: "teks", maks: 300, bila: "fasilitas_ibadah", tanya: "Tempat ibadah mana yang rusak? Tulis namanya."},
  {nama: "nama_jalan", label: "Jalan atau jembatan rusak", kelompok: "fasilitas", tipe: "teks", maks: 300, bila: "jalan_jembatan", tanya: "Jalan atau jembatan mana yang rusak atau putus? Tulis nama jalan atau jembatannya."},
  /* akses jadi pertanyaan pilihan sendiri (pemilik 19 Nov 2026: "apakah masih bisa dilewati harusnya di pertanyaan selanjutnya") */
  {nama: "akses_jalan", label: "Jalan masih bisa dilewati", kelompok: "fasilitas", tipe: "opsi", bila: "jalan_jembatan", tanya: "Apakah jalan atau jembatan itu masih bisa dilewati?", opsi: [
    ["Bisa dilewati semua kendaraan", "Mobil dan truk masih lewat, mungkin pelan"], ["Hanya motor dan pejalan kaki", "Mobil tidak bisa lewat"],
    ["Putus, tidak bisa dilewati", "Harus memutar atau terisolasi"], ["Tidak tahu", "Belum ada yang melihat langsung"]]},
  /* opsi: [label, penjelasan, nilai?]. Pelapor memilih, tidak mengetik (pemilik 19 Nov 2026: "usahakan semuanya itu adalah pilihan"). Perbandingan tubuh = perkiraan. */
  {nama: "kedalaman_genangan", label: "Tinggi air", kelompok: "khusus", tipe: "opsi", satuan: "cm", jenis: ["banjir"], tanya: "Setinggi apa air di lokasi, diukur dari lantai rumah atau permukaan jalan?", opsi: [
    ["Semata kaki", "Sekitar 10 cm", 10], ["Selutut", "Sekitar 50 cm", 50], ["Sepinggang", "Sekitar 100 cm", 100], ["Sedada", "Sekitar 130 cm", 130], ["Melebihi kepala orang dewasa", "Lebih dari 170 cm", 170]]},
  {nama: "luas_terbakar", label: "Luas terbakar", kelompok: "khusus", tipe: "opsi", satuan: "ha", jenis: ["karhutla"], tanya: "Kira-kira seluas apa yang terbakar? Satu hektare = 100 m kali 100 m.", opsi: [
    ["Kurang dari 1 hektare", "Seluas beberapa rumah"], ["1 sampai 5 hektare", "Seluas satu sampai beberapa lapangan bola"], ["5 sampai 25 hektare", "Satu hamparan kebun"], ["Lebih dari 25 hektare", "Sejauh mata memandang"], ["Tidak tahu", "Belum bisa diperkirakan"]]},
  /* intensitas: Lampiran III Tabel III.2 meminta MMI atau SIG-BMKG per desa; pelapor memilih fenomena yang ia amati, tingkat SIG-BMKG I-V */
  {nama: "intensitas", label: "Guncangan dirasakan", kelompok: "khusus", tipe: "opsi", jenis: ["gempa"],
    tanya: "Apa yang Anda lihat dan rasakan saat guncangan? Pilih yang paling sesuai.", opsi: [
      ["SIG I: Hampir tidak terasa", "Hanya sedikit orang yang merasakan, benda tidak bergoyang"],
      ["SIG II: Terasa, tanpa kerusakan", "Banyak orang merasakan, lampu atau benda gantung bergoyang, jendela bergetar"],
      ["SIG III: Kerusakan ringan", "Plester dinding retak, genteng bergeser, barang jatuh dari rak"],
      ["SIG IV: Kerusakan sedang", "Dinding retak lebar atau sebagian runtuh, orang sulit berdiri"],
      ["SIG V: Kerusakan berat", "Banyak bangunan roboh, tanah retak atau ambles"]]},
  {nama: "tebal_abu", label: "Tebal abu", kelompok: "khusus", tipe: "opsi", satuan: "mm", jenis: ["erupsi"], tanya: "Seberapa tebal abu di tanah atau atap?", opsi: [
    ["Tipis seperti debu", "Kurang dari 1 mm"], ["Setebal koin", "1 sampai 5 mm"], ["Menutupi tanah dan atap", "5 mm sampai 2 cm"], ["Tebal", "Lebih dari 2 cm, atap bisa berat"]]},
  {nama: "tinggi_rayapan", label: "Tinggi air laut di darat", kelompok: "khusus", tipe: "opsi", satuan: "m", jenis: ["tsunami"], tanya: "Setinggi apa air laut naik di daratan?", opsi: [
    ["Semata kaki", "Sekitar 0,1 m"], ["Selutut", "Sekitar 0,5 m"], ["Sepinggang", "Sekitar 1 m"], ["Melebihi kepala orang dewasa", "Lebih dari 1,7 m"], ["Tidak tahu", "Tidak melihat langsung"]]},
  {nama: "krisis_air", label: "Keadaan air bersih", kelompok: "khusus", tipe: "opsi", jenis: ["kekeringan"], tanya: "Bagaimana keadaan air bersih warga?", opsi: [
    ["Masih cukup", "Sumur atau mata air masih ada airnya"], ["Mulai sulit", "Harus antre, membeli, atau mengambil ke tempat jauh"], ["Tidak ada air bersih", "Warga butuh kiriman air"]]},
  {nama: "lintasan_angin", label: "Sebaran kerusakan angin", kelompok: "khusus", tipe: "opsi", jenis: ["cuaca"], tanya: "Seberapa luas kerusakan akibat angin?", opsi: [
    ["Satu titik", "Beberapa rumah berdekatan"], ["Satu kampung atau dusun", "Belasan sampai puluhan rumah"], ["Beberapa desa", "Kerusakan tersebar ke desa lain"]]},
  {nama: "garis_pantai", label: "Pantai tergerus", kelompok: "khusus", tipe: "opsi", jenis: ["abrasi"], tanya: "Seberapa jauh daratan pantai tergerus?", opsi: [
    ["Kurang dari 1 meter", "Bibir pantai sedikit terkikis"], ["1 sampai 5 meter", "Pohon atau pagar tumbang ke laut"], ["Lebih dari 5 meter", "Rumah atau jalan terancam atau rusak"], ["Tidak tahu", "Belum bisa diperkirakan"]]},
  {nama: "lahan_terendam", label: "Sawah atau kebun terendam", kelompok: "khusus", tipe: "opsi", satuan: "ha", jenis: ["banjir"], tanya: "Seluas apa sawah atau kebun yang terendam? Satu hektare = 100 m kali 100 m, kira-kira satu setengah lapangan sepak bola.", opsi: [
    ["Tidak ada", "Hanya permukiman dan jalan", 0], ["Kurang dari 1 ha", "Beberapa petak", 0.5], ["1 sampai 10 ha", "Satu hamparan sawah", 5], ["10 sampai 100 ha", "Beberapa hamparan", 50], ["Lebih dari 100 ha", "Sejauh mata memandang", 100], ["Tidak tahu", "", null]]},
  {nama: "jarak_kawah", label: "Jarak dari kawah", kelompok: "khusus", tipe: "opsi", satuan: "km", jenis: ["erupsi"], tanya: "Kira-kira berapa jauh lokasi Anda dari puncak atau kawah gunung?", opsi: [
    ["Kurang dari 3 km", "Sangat dekat puncak", 2], ["3 sampai 5 km", "", 4], ["5 sampai 10 km", "", 7], ["Lebih dari 10 km", "", 10], ["Tidak tahu", "", null]]},
  {nama: "kebutuhan", label: "Kebutuhan mendesak", kelompok: "kebutuhan", tipe: "opsi_banyak", tanya: "Apa yang paling dibutuhkan warga sekarang? Boleh pilih lebih dari satu.", opsi: [
    // Logistik: kategori Perka 18/2009 Standarisasi Logistik dan Perka 23/2014, nama barang mengikuti katalog LogPal (pangan, sandang, family kit, kidsware, logistik lain)
    ["Makanan siap saji", "", null, null, "Logistik"], ["Paket pangan atau sembako", "Beras, mi instan, lauk", null, null, "Logistik"], ["Air bersih atau air minum", "", null, null, "Logistik"],
    ["Paket sandang", "Pakaian dan selimut", null, null, "Logistik"], ["Matras, kasur lipat, atau tikar", "", null, null, "Logistik"], ["Tenda atau terpal", "", null, null, "Logistik"],
    ["Family kit", "Perlengkapan mandi dan kebersihan keluarga", null, null, "Logistik"], ["Kidsware", "Perlengkapan bayi dan anak", null, null, "Logistik"],
    ["Obat dan layanan kesehatan", "", null, null, "Logistik"], ["Masker", "", null, ["karhutla", "erupsi"], "Logistik"],
    // Peralatan: khas per jenis bencana, dari permintaan yang paling sering tercatat di logbook Pusdalops 2024-2026
    ["Perahu karet untuk evakuasi", "", null, ["banjir", "tsunami", "abrasi"], "Peralatan"], ["Tandon atau mobil tangki air", "", null, ["kekeringan"], "Peralatan"],
    ["Mesin dan selang pemadam", "", null, ["karhutla", "kebakaran_gedung"], "Peralatan"], ["Karung atau bronjong", "Menahan tanah atau air", null, ["longsor", "banjir", "abrasi"], "Peralatan"],
    ["Alat berat", "Membuka jalan atau mencari korban", null, ["longsor", "gempa", "banjir", "erupsi", "tsunami"], "Peralatan"],
    ["Lainnya", "Tulis sendiri kebutuhannya", null, null, "Lainnya"], ["Belum ada kebutuhan mendesak", "", null, null, "Lainnya"]]},
];

export const isianNama = Object.fromEntries(ISIAN.map(i => [i.nama, i]));
/* pilihan yang berlaku untuk jenis kejadian ini: opsi berelemen ke-4 berisi daftar jenis hanya muncul untuk jenis itu (kebutuhan khas per bencana, logbook Pusdalops) */
export const opsiBerlaku = (i, jenis) => (i.opsi || []).filter(o => !o[3] || (jenis && o[3].includes(jenis)));
export const berlaku = (jenis) => ISIAN.filter(i => !i.jenis || (jenis && i.jenis.includes(jenis)));
/* isian yang berlaku untuk sesi ini: pertanyaan lanjutan (bila) hanya bila isian induknya lebih dari 0 (pemilik 19 Nov 2026: "harusnya ada follow up questionnya") */
export const berlakuSesi = (sesi) => berlaku(sesi.isian.jenis?.nilai).filter(i => !i.bila || Number(sesi.isian[i.bila]?.nilai) > 0);

/* Kronologi berpandu per jenis (pemilik 19 Nov 2026: "kronologisnya bukan disuruh ketik panjang tapi dipandu", "ambil dari laporan Koordalops").
   Tiap langkah satu pertanyaan pilihan; frasa yang dipilih dirangkai jadi kalimat kronologi bergaya laporan Pusdalops
   ("Hujan dengan intensitas tinggi mengakibatkan ... sehingga ..."). Frasa ditulis netral tanpa angka: angka korban, rumah,
   dan pengungsi tetap ditanya lewat kotak angka sesudahnya. */
export const KRONOLOGI = {
  banjir: [
    {tanya: "Apa yang membuat air naik?", opsi: [["Hujan lebat lama", "Hujan dengan intensitas tinggi dalam waktu lama"], ["Sungai meluap", "Debit sungai meningkat hingga meluap"], ["Tanggul atau bendungan jebol", "Tanggul atau bendungan jebol"], ["Air laut pasang", "Air laut pasang masuk ke daratan"], ["Tidak tahu", "Air naik dengan penyebab yang belum diketahui"]]},
    {tanya: "Apa yang tergenang?", opsi: [["Rumah warga", "mengakibatkan permukiman warga tergenang"], ["Jalan", "mengakibatkan jalan tergenang dan akses terganggu"], ["Sawah atau kebun", "mengakibatkan sawah dan kebun warga tergenang"], ["Rumah, jalan, dan sawah", "mengakibatkan permukiman, jalan, dan lahan pertanian tergenang"]]},
    {tanya: "Bagaimana air sekarang?", opsi: [["Masih naik", "Saat dilaporkan, air masih naik."], ["Bertahan", "Saat dilaporkan, ketinggian air bertahan."], ["Mulai surut", "Saat dilaporkan, air mulai surut."], ["Sudah surut", "Saat dilaporkan, air sudah surut."]]},
  ],
  longsor: [
    {tanya: "Apa pemicunya?", opsi: [["Hujan lebat", "Hujan dengan intensitas tinggi mengakibatkan tanah di lereng tidak stabil dan longsor"], ["Gempa", "Guncangan gempa mengakibatkan lereng longsor"], ["Tebing digali atau dipotong", "Lereng yang digali atau dipotong longsor"], ["Tidak tahu", "Tanah di lereng longsor dengan pemicu yang belum diketahui"]]},
    {tanya: "Apa yang tertimbun atau terdampak?", opsi: [["Rumah", "sehingga material longsor menimpa rumah warga"], ["Jalan", "sehingga material longsor menutup jalan"], ["Kebun atau sawah", "sehingga material longsor menimbun kebun atau sawah"], ["Ada warga tertimbun", "sehingga material longsor menimbun warga"]]},
    {tanya: "Bagaimana lereng sekarang?", opsi: [["Masih bergerak atau retak", "Saat dilaporkan, tanah masih bergerak dan terdapat retakan."], ["Sudah berhenti", "Saat dilaporkan, gerakan tanah sudah berhenti."], ["Tidak tahu", "Kondisi lereng saat dilaporkan belum diketahui."]]},
  ],
  abrasi: [
    {tanya: "Apa yang terjadi di pantai?", opsi: [["Gelombang tinggi menerjang", "Gelombang tinggi menerjang kawasan pesisir"], ["Air pasang masuk ke darat", "Air laut pasang masuk ke daratan"], ["Pantai terkikis", "Garis pantai terkikis gelombang"]]},
    {tanya: "Apa yang terdampak?", opsi: [["Rumah di pesisir", "sehingga rumah warga di pesisir terdampak"], ["Perahu atau tambak", "sehingga perahu dan tambak warga terdampak"], ["Jalan pesisir", "sehingga jalan di pesisir rusak atau tergenang"]]},
    {tanya: "Bagaimana gelombang sekarang?", opsi: [["Masih tinggi", "Saat dilaporkan, gelombang masih tinggi."], ["Sudah mereda", "Saat dilaporkan, gelombang sudah mereda."]]},
  ],
  cuaca: [
    {tanya: "Cuaca apa yang terjadi?", opsi: [["Angin kencang atau puting beliung", "Angin kencang disertai puting beliung melanda permukiman"], ["Hujan es", "Hujan es turun di permukiman"], ["Hujan lebat disertai petir", "Hujan lebat disertai petir dan angin kencang melanda permukiman"]]},
    {tanya: "Apa yang rusak?", opsi: [["Atap rumah", "sehingga atap rumah warga rusak"], ["Pohon tumbang", "sehingga pohon tumbang"], ["Tiang listrik atau baliho roboh", "sehingga tiang listrik atau baliho roboh"], ["Beberapa sekaligus", "sehingga atap rumah rusak dan pohon serta tiang tumbang"]]},
    {tanya: "Berapa lama kejadiannya?", opsi: [["Kurang dari 15 menit", "Kejadian berlangsung singkat, kurang dari 15 menit."], ["Lebih dari 15 menit", "Kejadian berlangsung lebih dari 15 menit."], ["Masih berlangsung", "Saat dilaporkan, cuaca buruk masih berlangsung."]]},
  ],
  kekeringan: [
    {tanya: "Apa yang mengering?", opsi: [["Sumur warga", "Sumur warga mengering"], ["Sungai atau mata air", "Sungai dan mata air mengering"], ["Sawah atau kebun", "Lahan pertanian kekurangan air"]]},
    {tanya: "Sejak kapan?", opsi: [["Kurang dari 1 bulan", "sejak kurang dari satu bulan terakhir"], ["1 sampai 3 bulan", "sejak satu sampai tiga bulan terakhir"], ["Lebih dari 3 bulan", "sejak lebih dari tiga bulan terakhir"]]},
    {tanya: "Bagaimana warga mendapat air?", opsi: [["Membeli air", "Warga membeli air untuk kebutuhan sehari-hari."], ["Mengambil air dari tempat jauh", "Warga mengambil air dari tempat yang jauh."], ["Sudah ada bantuan air", "Sudah ada distribusi air bersih untuk warga."]]},
  ],
  karhutla: [
    {tanya: "Apa yang terbakar?", opsi: [["Lahan gambut", "Terjadi kebakaran di lahan gambut"], ["Hutan", "Terjadi kebakaran hutan"], ["Kebun atau ladang", "Terjadi kebakaran di kebun atau ladang"], ["Semak belukar", "Terjadi kebakaran semak belukar"]]},
    {tanya: "Bagaimana apinya sekarang?", opsi: [["Masih menyala", "dan saat dilaporkan api masih menyala"], ["Sudah padam, masih berasap", "dan saat dilaporkan api sudah padam namun masih berasap"], ["Sudah padam", "dan saat dilaporkan api sudah padam"]]},
    {tanya: "Bagaimana asapnya?", opsi: [["Tipis", "Asap yang timbul tipis."], ["Tebal, mengganggu napas", "Asap tebal mengganggu pernapasan warga."], ["Tidak berasap", "Tidak terlihat asap."]]},
  ],
  gempa: [
    {tanya: "Seberapa kuat guncangannya?", opsi: [["Sangat kuat, sulit berdiri", "Guncangan gempa terasa sangat kuat hingga warga sulit berdiri"], ["Kuat, benda berjatuhan", "Guncangan gempa terasa kuat hingga benda berjatuhan"], ["Terasa ringan", "Guncangan gempa terasa ringan"]]},
    {tanya: "Apa yang rusak?", opsi: [["Bangunan roboh", "dan mengakibatkan bangunan roboh"], ["Dinding retak", "dan mengakibatkan dinding bangunan retak"], ["Tidak ada kerusakan terlihat", "tanpa kerusakan yang terlihat"]]},
    {tanya: "Ada gempa susulan?", opsi: [["Ada", "Warga masih merasakan gempa susulan."], ["Tidak ada", "Belum terasa gempa susulan."]]},
  ],
  tsunami: [
    {tanya: "Apa yang terjadi lebih dulu?", opsi: [["Gempa kuat terasa", "Setelah gempa kuat terasa, gelombang laut naik ke daratan"], ["Air laut surut tiba-tiba", "Air laut surut tiba-tiba, lalu gelombang besar datang"], ["Gelombang besar langsung datang", "Gelombang besar datang dari laut tanpa didahului gempa yang terasa"]]},
    {tanya: "Sampai mana air masuk?", opsi: [["Pantai saja", "dan air mencapai bibir pantai"], ["Permukiman", "dan air masuk ke permukiman warga"], ["Jauh ke darat", "dan air masuk jauh ke daratan"]]},
    {tanya: "Bagaimana warga?", opsi: [["Sudah ke tempat tinggi", "Warga sudah menyelamatkan diri ke tempat tinggi."], ["Belum mengungsi", "Sebagian warga belum mengungsi."]]},
  ],
  erupsi: [
    {tanya: "Apa yang terjadi?", opsi: [["Hujan abu", "Erupsi gunung api mengakibatkan hujan abu"], ["Lontaran batu atau kerikil", "Erupsi gunung api disertai lontaran batu dan kerikil"], ["Awan panas", "Erupsi gunung api disertai awan panas"], ["Lahar", "Lahar dari gunung api mengalir ke permukiman"]]},
    {tanya: "Apa yang terdampak?", opsi: [["Rumah dan atap", "sehingga rumah dan atap warga terdampak"], ["Tanaman dan ternak", "sehingga tanaman dan ternak warga terdampak"], ["Jalan", "sehingga jalan tertutup material"]]},
    {tanya: "Bagaimana warga?", opsi: [["Sudah mengungsi", "Warga sudah mengungsi."], ["Belum mengungsi", "Warga belum mengungsi."]]},
  ],
  kebakaran_gedung: [
    {tanya: "Apa dugaan penyebabnya?", opsi: [["Korsleting listrik", "Kebakaran diduga akibat korsleting listrik"], ["Kompor atau tabung gas", "Kebakaran diduga berasal dari kompor atau tabung gas"], ["Tidak tahu", "Kebakaran terjadi dengan penyebab yang belum diketahui"]]},
    {tanya: "Apa yang terbakar?", opsi: [["Rumah warga", "dan menghanguskan rumah warga"], ["Toko atau pasar", "dan menghanguskan toko atau kios"], ["Gedung atau kantor", "dan menghanguskan gedung"]]},
    {tanya: "Bagaimana apinya sekarang?", opsi: [["Masih menyala", "Saat dilaporkan, api masih menyala."], ["Sudah padam", "Saat dilaporkan, api sudah padam."], ["Pemadam sudah datang", "Pemadam kebakaran sudah di lokasi."]]},
  ],
};
/* frasa langkah dirangkai: langkah yang diawali huruf kecil menyambung kalimat sebelumnya */
export function rangkaiKronologi(frasa) {
  return frasa.reduce((t, f) => !t ? f : /^[a-z]/.test(f) ? `${t.replace(/\.$/, "")} ${f}` : `${/[.!?]$/.test(t) ? t : `${t}.`} ${f}`, "").replace(/([^.!?])$/, "$1.");
}

/* langkah tambahan kronologi (pemilik 19 Nov 2026: "kronologi masa gitu doang, berlangsung berapa lama, ada fenomena apa lagi"):
   lama kejadian untuk jenis yang belum menanyakannya, lalu fenomena lain yang terlihat (boleh lebih dari satu) */
const LAMA = {tanya: "Sudah berapa lama kejadiannya berlangsung?", opsi: [["Kurang dari 1 jam", "Kejadian berlangsung kurang dari satu jam."], ["1 sampai 6 jam", "Kejadian berlangsung satu sampai enam jam."],
  ["6 sampai 24 jam", "Kejadian berlangsung enam sampai 24 jam."], ["Lebih dari sehari", "Kejadian berlangsung lebih dari satu hari."], ["Masih berlangsung", "Saat dilaporkan, kejadian masih berlangsung."]]};
const FENOMENA = {
  banjir: ["Arus deras", "Air berlumpur", "Listrik padam", "Jalan terputus", "Warga terjebak", "Hewan ternak hanyut"],
  longsor: ["Suara gemuruh sebelum longsor", "Tanah retak di sekitar", "Mata air keruh atau baru muncul", "Pohon atau tiang miring", "Jalan terputus", "Longsor susulan"],
  abrasi: ["Tanggul pantai jebol", "Air asin masuk sawah atau tambak", "Perahu rusak atau hanyut", "Pohon pantai tumbang", "Jalan pesisir putus"],
  cuaca: ["Petir menyambar", "Hujan es", "Genangan atau banjir", "Listrik padam", "Jalan tertutup pohon", "Warga terluka"],
  kekeringan: ["Gagal panen", "Ternak kekurangan air", "Warga antre air", "Gangguan kesehatan seperti diare", "Sekolah atau tempat ibadah kekurangan air"],
  karhutla: ["Asap masuk ke rumah", "Warga sesak napas", "Sekolah diliburkan", "Api dekat permukiman", "Jarak pandang pendek", "Api muncul lagi"],
  gempa: ["Gempa susulan", "Tanah retak", "Longsor", "Warga panik keluar rumah", "Air laut surut", "Listrik padam"],
  tsunami: ["Air laut surut sebelumnya", "Gemuruh dari laut", "Kapal terdampar ke darat", "Gelombang datang lebih dari sekali", "Sirene peringatan berbunyi"],
  erupsi: ["Suara gemuruh", "Gempa terasa", "Bau belerang", "Hujan kerikil", "Lahar di sungai", "Sirene atau kentongan"],
  kebakaran_gedung: ["Terdengar ledakan", "Asap hitam tebal", "Angin menyebarkan api", "Akses sempit, damkar sulit masuk", "Air untuk memadamkan kurang", "Warga terjebak"],
};
/* langkah kronologi lengkap untuk satu jenis: langkah khas, lama kejadian (bila belum ada), fenomena lain (pilihan ganda) */
export function langkahKronologi(jenis) {
  const dasar = KRONOLOGI[jenis] || [];
  if (!dasar.length) return [];
  const punyaLama = dasar.some(l => /lama|sejak/i.test(l.tanya));
  return [...dasar, ...(punyaLama ? [] : [LAMA]), ...(FENOMENA[jenis] ? [{tanya: "Ada hal lain yang Anda lihat? Boleh pilih lebih dari satu.", banyak: true, opsi: [...FENOMENA[jenis].map(f => [f, f.toLowerCase()]), ["Tidak ada", null]]}] : [])];
}
