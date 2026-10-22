## Aturan

Tanda deck: **[Peta]** = Laporan Penanganan Pengendalian Karhutla, varian data satelit (Peta, tabel 6 provinsi, Operasi). **[Koordalops]** = varian Penanganan yang memakai angka BNPB dan Laporan Harian Dit. Koordalops. **[Harian]** = Laporan Kejadian Bencana Harian. **[Presiden]** = Paparan Kepala BNPB kepada Presiden. Aturan tanpa tanda berlaku umum.

Input tidak memuat kode hex warna, nama font, atau ukuran huruf untuk deck. Yang tertulis di bawah hanya nama warna yang dipakai pemilik.

### Struktur
- [Peta] Pakai 3 slide dengan urutan ini:
  1. "Peta Hotspot untuk Pengendalian dan Penanganan Karhutla 2026"
  2. "Penanganan dan Pengendalian Karhutla per Tanggal 21 Oktober 2026" (tabel)
  3. "Operasi Penanganan Karhutla yang Dilakukan per Tanggal 20 Oktober 2026"
- [Peta] Jangan pasang slide Provinsi Tambahan Prioritas.
- [Peta] Muat luas terbakar dan belum padam di slide peta, selain hotspot.
- [Peta] Isi slide 2 dengan 6 provinsi yang hotspotnya terbanyak. Urutannya sama dengan nomor 1–6 di peta (final: Kalteng, Sumsel, Kalsel, Kaltim, Sulteng, Jambi). Jangan pakai 6 provinsi prioritas BNPB.
- [Peta] Urutkan kolom Hotspot → Luas terbakar → Belum padam, jadi Belum padam paling kanan. Urutan ini berlaku di kotak angka, tabel slide peta, dan slide tabel.
- [Peta] Biarkan urutan tabel peringkat di peta mengikuti data, dengan 10 provinsi teratas. Jangan paksa satu provinsi masuk. Contohnya Papsel di nomor 11 (Kalbar 529, Papsel 528).
- [Koordalops] Jangan bikin slide terpisah untuk isi Laporan Harian Koordalops. Deck tetap 2 slide.
- [Koordalops] Jangan pasang pil status darurat (TD/Siaga), strip "KUMULATIF 2026 (ha)", atau format armada siap/total. Kolom armada tetap "N unit".
- [Koordalops] Jangan masukkan kondisi lapangan, kebutuhan, dan Gakkum ke slide 2. Kartu Penanganan tidak diringkas.
- [Harian] Pakai deck 18-19 Okt sebagai standar format. Buat deck per periode dengan format generator yang sekarang (deck 20-21 Okt: 4 slide).
- [Harian] Jangan ubah generator /laporan-bnpb ke format kolom WA, dan jangan tambah tombol salin teks WA.
- [Harian, Presiden] Buat lewat halaman /laporan-bnpb: formulir, pratinjau slide langsung, lalu Simpan ke D1. Paparan Presiden mengikuti versi Utama (7 slide). Slide tambahan versi Lengkap belum dibuat.

### Data
- [Peta] Pakai perkiraan satelit platform sendiri untuk semua angka luas terbakar, bukan angka BNPB.
- [Peta] Ambil hotspot dari data sendiri (MODIS + VIIRS S-NPP + NOAA-20), dihitung per hari WIB. Jangan pakai angka GIS BNPB.
- [Peta] Hitung luas terbakar dan belum padam dengan rumus NOAA-20 + NOAA-21 × 0,534 × 4,3 ha.
- [Peta] Hitung "belum padam" dari api yang bertahan 1 hari penuh, yaitu lokasi (±375 m) yang sudah menyala 12–36 jam sebelumnya, dari NOAA-20 + NOAA-21.
- [Peta] Anggap "padam" setelah 48 jam tanpa titik. Titik hari H-2 padam kalau lokasinya (±375 m) tidak terdeteksi lagi selama 2 hari berikutnya. Persennya dihitung dari luas api H-2.
- [Peta] Pakai aturan 48 jam itu hanya di deck. Kompleks di platform tetap memakai 72 jam (168 jam untuk gambut).
- [Peta] Isi semua sel NA di tabel, termasuk Papua Selatan, Sulteng, dan Kaltim.
- [Peta] Perbarui semua slide data, termasuk peta, ke data tanggal terbaru yang diminta (final: 21 Okt). Geser kolom tabel ikut tanggalnya (18/19/20 → 19/20/21 Okt).
- [Peta] Biarkan slide Operasi memakai angka BNPB dengan tanggal 20 Oktober. Yang diganti ke data sendiri hanya slide data.
- [Peta] Isi pil CUT OFF DATA dengan jam tarikan data terbaru (final: 21 Okt 2026, 22.33 WIB).
- [Peta] Beri tiap kolom tabel peta (hotspot, luas terbakar, belum padam) persen naik/turun dari hari sebelumnya, di samping angkanya.
- [Koordalops] Isi sel NA kolom 20 Okt dari Laporan Harian Dit. Koordalops: Kalteng 431,66/321,35; Jambi 98,50/70,00; Sulteng 70,00/70,00. Sumbernya jangan disebut di catatan kaki (lihat Kata).
- [Koordalops] Jangan masukkan info sekolah daring/PJJ.
- [Harian] Ambil data dari teks WA pemantauan Dit. Koordalops BNPB untuk periode 07.00 WIB sampai 07.00 WIB hari berikutnya. Tiap kejadian menonjol per provinsi memuat Dampak, Penetapan status, Pendampingan BNPB, Kondisi mutakhir, dan Entry no laphar.

### Visual
- [Peta] Samakan format slide peta dengan paparan BNPB: judul, pil cut-off, logo, dan footer.
- [Peta] Pakai palet PPT untuk peta: daratan biru tua dan bulatan oranye, bukan emas.
- [Peta] Perbesar peta dan kurangi ruang kosong.
- [Peta] Buat kotak angka nasional (Hotspot, Luas terbakar, Belum padam) kecil, beri ikon, dan taruh di atas peta.
- [Peta] Tandai peringkat 1–7 provinsi dengan hotspot terbanyak memakai label kecil di peta.
- [Peta] Buat label nomor di peta putih dengan pinggiran oranye. Jangan biru gelap karena tenggelam di daratan biru tua.
- [Peta] Jangan biarkan label nomor menumpuk dengan bulatan atau label lain.
- [Peta] Samakan judul kolom tabel peta dengan slide tabel: ikon, tanda bintang, dan satuan (contoh "HOTSPOT* (titik)"). Header berikon dan cukup satu baris.
- [Peta] Pakai bulatan biru gelap berangka putih untuk nomor peringkat di tabel, bukan bulatan bergaris oranye.
- [Peta] Jangan pakai progress bar di tabel peta. Cukup angka dan persen.
- [Peta] Ratakan angka ke kanan, sedangkan panah dan persen ke kiri, supaya lurus seragam ke bawah.
- [Peta] Pasang legenda "naik dari hari sebelumnya / turun dari hari sebelumnya" di slide peta.
- [Peta] Ratakan judul kolom "LUAS TERBAKAR* (ha)" beserta ikonnya ke tengah kotak.
- [Koordalops] Masukkan angka PM2.5 ke dalam pil, beri ikon segitiga peringatan (contoh "⚠ 366 BERBAHAYA"), dan samakan lebar pilnya dengan pil cuaca di bawahnya.
- [Koordalops] Beri ikon pada pil angin kencang dan hujan. TANPA HUJAN tidak diberi ikon hujan; ini pilihan asisten.
- [Koordalops] Pakai tulisan putih pada pil kuning TIDAK SEHAT.

### Kata
- [Peta] Isi catatan kaki slide 1 dan 2 dengan "*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS)."
- [Peta] Jangan tulis kalimat "luas terbakar dan belum padam adalah perkiraan…".
- [Peta] Tetap pakai kata "padam". Jangan ganti dengan "tidak terdeteksi lagi".
- [Peta] Tulis kalimat bawah judul slide peta tanpa tanggal, dengan pola "Terbanyak di <provinsi> (<n> titik). Total: <n> titik, <n> ha terbakar, <n> ha belum padam". Contoh final: "Terbanyak di Kalimantan Tengah (3.250 titik). Total: 14.807 titik, 33.021 ha terbakar, 15.883 ha belum padam".
- [Peta] Tulis label kolom "PROVINSI" saja, tanpa tanggal.
- [Peta] Jangan pakai tanda ± di kotak angka slide peta. Kalimat bawah judul slide tabel di deck final masih memakai ±.
- [Peta] Jangan pasang keterangan kecil di bawah angka kotak, misalnya "33 provinsi · ▼17% dari 19 Okt", "38 provinsi, perkiraan satelit", atau "api bertahan ≥1 hari".
- [Peta] Pakai judul slide operasi "Operasi Penanganan Karhutla yang Dilakukan per Tanggal 20 Oktober 2026", satu baris, hurufnya sedikit dikecilkan.
- [Peta] Deck final tidak punya baris fire spot. Label terakhirnya "Lokasi api bertahan", dan frasa "karena peningkatan hotspot" dihapus. Keduanya dipilih asisten di bawah delegasi "Lu tentukan".
- [Koordalops] Jangan sebut Laporan Harian Dit. Koordalops sebagai sumber angka di catatan kaki **. Bunyinya "masih dalam proses rekapitulasi, menunggu data laporan dari lapangan".
- [Koordalops] Jangan tulis rincian kejadian baru di catatan kaki, misalnya Sigi ±60 ha dan Tojo Una-Una ±10 ha.
- [Koordalops] Hentikan judul slide 2 di "…dan Sulawesi Tengah masuk prioritas". Buang "Riau dikeluarkan; terdapat 7 provinsi prioritas".

### Proses
- Langsung kerjakan perubahan tanpa menunggu konfirmasi lagi.
- Kerjakan cepat dan ganti hanya bagian yang diminta. Contohnya, hanya slide data 1 dan 2.
- Pastikan hasilnya benar, valid, dan lebih mendekati kebenaran.
- Evaluasi juga metode hitung di website, bukan cuma deck, karena datanya diserahkan ke Presiden.
- Simpan semua hasil di repo: deck, data mentah, skrip, verifikasi, dan evaluasi metode. Contohnya `data/laporan-bnpb/satelit-2026-10-21/`.
- Dahulukan PPT dari pekerjaan website, dan langsung kirim berkasnya.
- Kalau pemilik bilang "Lu tentukan", putuskan sendiri dengan pegangan best practice.
- Catat deck Penanganan di artifact sebagai deck utama dan pedoman ("kitab suci") yang terus diperbarui.
- [Harian, Presiden] Taruh fitur laporan BNPB hanya di centurisk97.id dan wajibkan login. Di alamat Pantau Bencana halamannya membalas 404.
- [Harian, Presiden] Ekspor otomatis ke PPTX dan PDF dari fungsi slide yang sama dengan pratinjau. Nama berkasnya mengikuti pola berkas pemilik.

### Di luar deck (dicatat karena menyangkut cara hitung)
- Dashboard tidak boleh menampilkan angka akumulasi. Titik panas selalu satu hari kalender WIB, dan pilihan 72 jam / 7 hari dihapus.
- Deck mengikuti tarikan data terbaru, sedangkan dashboard diperbarui otomatis tiap 3 jam. Peringkat di keduanya bisa beda (kasus Papsel nomor 10).

### Belum dijawab pemilik
- [Koordalops] Saran mengganti kuning pil TIDAK SEHAT ke amber yang lebih gelap.
- [Harian] Empat hal di deck 20-21 Okt yang diputuskan asisten: Karanganyar ditandai "belum selesai", Bromo masuk "Perlu perhatian", 4 kotak "Yang akan dilakukan BNPB" masih draf, dan kolom Kekeringan bernilai 0.

## Riwayat

Diurutkan dari yang terbaru. Keputusan yang sudah diganti ditandai "(diganti …)".

| Tanggal-jam WIB | Deck | Keputusan | Kutipan pemilik |
|---|---|---|---|
| 22 Okt 00:43 | Peta | Deck dicatat di artifact sebagai deck utama dan pedoman yang terus diperbarui | "Lu catat sebagai kitab suci yang bakal gw update terus. Lu liat historinya. Pilihan\" gw." |
| 21 Okt 23:05 | Peta | Catatan kaki slide 1-2 jadi "*Data berdasarkan GIS dengan satelit NASA (FIRMS: VIIRS dan MODIS)", kalimat "perkiraan" dihapus | "Date berdasarkan Geographic Information System dengan satelit Nasa bla bla bla. ... luas terbakar bla bla bla itu hilangkan aja" |
| 21 Okt 23:01 | Peta | Slide 2 berisi 6 provinsi dengan hotspot terbanyak, urutannya sama dengan peta | "Bukan yang di slide 2 juga yang paling banyak titiknya ya. samain sama depan" |
| 21 Okt 22:56 | Peta | Angka rata kanan, panah dan persen rata kiri, lurus ke bawah | "Rapiin ya. Untuk angka dan panah dan persen agar lurus seragam ke bawah" |
| 21 Okt 22:55 | Peta | Label nomor peta tidak boleh menumpuk | "Tumpang tindih" |
| 21 Okt 22:55 | Peta | Slide tabel jadi 6 provinsi prioritas, Riau ditambah (diganti 23:01) | "Slide pertama jadikan 6 provinsi prioritas" |
| 21 Okt 22:55 | Peta | Slide Provinsi Tambahan Prioritas dihapus | "Slide ketiga hilangkan" |
| 21 Okt 22:55 | Peta | Judul operasi "…per Tanggal 20 Oktober 2026", satu baris | "Operasi Penanganan Karhutla yang Dilakukan per Tanggal 20" |
| 21 Okt 22:50 | Peta | Asisten mengganti "Fire spot" jadi "Lokasi api bertahan" dan memasang catatan kaki "perkiraan" (catatan kaki diganti 23:05) | — (delegasi 22:48) |
| 21 Okt 22:48 | Peta | Keputusan tertunda diserahkan ke asisten dengan pegangan best practice; 10 provinsi teratas dipertahankan | "Lu tentukan deh. Ikuti best practice" |
| 21 Okt 22:40 | Peta | Belum padam paling kanan: Hotspot → Luas terbakar → Belum padam | "Belum padam paling kanan deh" |
| 21 Okt 22:38 | Peta / dashboard | Beda peringkat deck dan dashboard dijelaskan: deck ikut tarikan terbaru, dashboard diperbarui tiap 3 jam | "Ini belum terupdate. masih nomor 10 bro" |
| 21 Okt 22:32 | Peta | Semua slide data pakai data 21 Okt, kolom 19/20/21 Okt | "Oke untuk slide gw pengen semuanya diupdate dengan data 2021. ... 18 19 20 jadi 19 20 21." |
| 21 Okt 22:32 | Peta | Papsel jadi nomor 10 (diganti 22:48: urutan mengikuti data) | "Papuas selatan jadi no. 10 ya." |
| 21 Okt 22:32 | Peta | Slide operasi pakai tanggal 20 Oktober | "Operasi yang dilakukan per tanggal 20 Oktober." |
| 21 Okt 22:24 | Dashboard (bukan deck) | Tanpa akumulasi; titik panas satu hari WIB; pilihan 72 jam / 7 hari dihapus | "Ini jangan ada yang akumulasi lah berarti." |
| 21 Okt 22:04 | Dashboard (bukan deck) | Overlay luas terbakar dan belum padam per wilayah, dengan filter waktu | "Luas lahan terbakar dan belum padam bisa di overlay kan dengan ada filter waktu di dashboard map" |
| 21 Okt 22:01 | Peta | Luas terbakar paling kanan (diganti 22:40) | "Luas terbakar paling kanan ya" |
| 21 Okt 21:59 | Peta | Nomor peringkat pakai bulatan biru gelap berangka putih | "Pake yang biru gelap ini aja angkanya" |
| 21 Okt 21:58 | Peta | Tabel peta tanpa progress bar | "Gausah ada progress barnya." |
| 21 Okt 21:58 | Peta | Judul kolom tabel peta satu baris | "Bagusin. Itu kalo bisa sebaris ya" |
| 21 Okt 21:57 | Peta | Label nomor peta jangan biru gelap; final putih berpinggiran oranye | "Warna label jangan biru gelap juga. Nyaru" |
| 21 Okt 21:56 | Semua | PPT didahulukan dari website, file langsung dikirim | "Oke fokus ke ppt dulu ya. Kasih ppt nya mana" |
| 21 Okt 21:55 | Peta | Kotak angka tanpa ± | "Gausah pakai lebih kurang" |
| 21 Okt 21:55 | Peta | Keterangan kecil di bawah angka kotak dihapus | "Hilangkan keterangan ini" |
| 21 Okt 21:54 | Peta | Peta diperbesar, ruang kosong dikurangi | "Besarin aja mapsnya ini white spacenya banyak banget" |
| 21 Okt 21:54 | Peta | Judul kolom tabel peta disamakan dengan slide tabel (ikon, *, satuan) | "Samain sama ini" |
| 21 Okt 21:54 | Peta | Legenda naik/turun ditambah ke slide peta | "Tambahin ini di slide 1 sebagai lagenda" |
| 21 Okt 21:53 | Peta | Tanggal dihapus dari label "PROVINSI" dan kalimat bawah judul | "Hilangkan 20 Okt." |
| 21 Okt 21:53 | Peta | Tabel peringkat dirombak dengan header berikon | "Bagusin. Sumpah jelek banget" |
| 21 Okt 21:53 | Peta | Tiap kolom diberi persen naik/turun di samping angka | "Masing\" ada percentagenya ya. Dibuat di sampingnya naik atau turun" |
| 21 Okt 21:52 | Peta | Pola kalimat bawah judul: provinsi terbanyak, lalu total hotspot, terbakar, belum padam | "Provinsi dengan hotspot terbanyak bla bla bla. Total hotspot, Total lahan terbakar, total belum padam bla bla bla" |
| 21 Okt 21:52 | Peta | Peringkat 1–7 ditandai dengan label kecil | "Tandain nomor 1 2 3 4 5 6 7 paling banyak. Pakai label kecil aja" |
| 21 Okt 21:50 | Peta | Kotak angka nasional kecil, berikon, di atas peta | "Kecilin Buat bagus ada icon dan buat di atas peta." |
| 21 Okt 21:46 | Peta | Warna peta: daratan biru tua, bulatan oranye | "Warnanya sesuaikan ya sama format ppt" |
| 21 Okt 21:46 | Website Insight (bukan deck) | Kartu peta dengan pilihan hotspot/luas/belum padam dan pemilih periode | "Hotspot, luas terbakar dan belum padam dimasukin bisa dipilih\" dan bisa ada picker period" |
| 21 Okt 21:44 | Peta | Format slide peta disamakan dengan paparan BNPB | "Oke tapi formatnya samain sama format paparan ya" |
| 21 Okt 21:42 | Peta | Slide pembuka Peta Hotspot ditambah, lengkap dengan luas terbakar dan belum padam | "Bisa ga paparan depannya tambahin ini ... Tapi bisa ditambah luas terbakar dan luas belum padamnya ga" |
| 21 Okt 21:42 | Peta | Slide peta tetap tanggal 20 Okt (diganti 22:32) | "Tetap tanggalnya 20 Oktober ya" |
| 21 Okt 21:41 | Peta | Pil CUT OFF DATA ikut tarikan terbaru (final 22.33 WIB) | "Cut off data terbaru update dong." |
| 21 Okt 15:38 | Peta | Semua hasil kerja disimpan di repo | "Simpan semua ya hasilnya" |
| 21 Okt 15:26 | Peta | Padam = 48 jam tanpa titik, hanya untuk deck | "Oke berarti 48 jam tanpa titik berarti padam ya" |
| 21 Okt 15:18 | Peta | v3: luas terbakar dan belum padam dihitung NOAA-20 + NOAA-21 × 0,534 × 4,3 ha | — (setelah verifikasi independen) |
| 21 Okt 14:57 | Semua | Hasil wajib benar, valid, dan mendekati kebenaran | "Iya tapi pastikan benar ya. Dan valid datanya. Dan lebih mendekati kebenaran" |
| 21 Okt 14:56 | Semua | Semua metode hitung di website ikut dievaluasi | "Lu evaluasi. Apakah kira\" relevan atau nggak metodenya. Karena ini data yang mau dikasih ke Presiden" |
| 21 Okt 14:43 | Peta | Kata "padam" tetap dipakai | "Ga apa pakai padam aja." |
| 21 Okt 14:43 | Peta | Judul kolom "LUAS TERBAKAR* (ha)" dan ikonnya rata tengah | "Rata tengah" |
| 21 Okt 14:38 | Peta | Metode S-NPP + NOAA-20, padam dari api yang benar-benar hilang, fire spot per kebakaran (diganti 15:18 dan 15:26) | "oke ubah langsung bro, cepetin" |
| 21 Okt 14:38 | Peta | Hotspot pakai data sendiri, bukan GIS BNPB | "Loh data hotspot bukan pakai data kita?" |
| 21 Okt 14:24 | Peta | Catatan kaki "Data berdasarkan GIS" (diganti 23:05) | "Ini keterangannya data berdasarkan GIS" |
| 21 Okt 14:20 | Peta | Data hanya sampai 20 Okt (diganti 22:32) | "Pakai data 20 Okt aja bro. Jangan ambil yang terbaru lagi" |
| 21 Okt 14:12 | Peta | Semua sel NA wajib terisi | "yang NA NA harusnya keiisi semua kan ya?" |
| 21 Okt 14:10 | Peta | Hanya slide data 1-2 yang diganti, cepat; operasi tetap angka BNPB | "CEPETIN dong gw cuma mau ganti yang di slide 1 dan 2 aja" |
| 21 Okt 14:09 | Peta | Deck 3 slide dari versi non-Lengkap (diganti 21:42 dan 22:55) | "Oke cukup 3 slide ya" |
| 21 Okt 14:08 | Semua | Perubahan langsung dikerjakan tanpa konfirmasi | "Oke langsung diubah ya." |
| 21 Okt 14:07 | Peta | Semua luas terbakar pakai data satelit sendiri | "Oke sekarang pakai data kita aja ya. Luas terbakar ganti semua pakai data kita." |
| 21 Okt 14:07 | Peta | Belum padam = api yang bertahan 1 hari penuh | "Belum padam juga berarti yang bertahan selama 1 hari penuh." |
| 21 Okt 14:07 | Peta | Fire spot = hotspot yang bertahan 1 hari (diganti; barisnya hilang di deck final) | "Oke fire spot pakai data hotspot yang bertahan selama 1 hari" |
| 21 Okt 08:28 | Koordalops | Tulisan pil kuning TIDAK SEHAT putih | "Ini harusnya tulisan putih" |
| 21 Okt 08:26 | Koordalops | Judul slide 2 tanpa "Riau dikeluarkan; terdapat 7 provinsi prioritas" | "Riau dikeluarkan; terdapat 7 provinsi prioritas ini hilangkan" |
| 21 Okt 08:26 | Koordalops | Slide 3 Laporan Harian dihapus, deck jadi 2 slide | "Slide 3 hilangkan" |
| 21 Okt 08:25 | Koordalops | Pil PM2.5 dikecilkan selebar pil cuaca, angka masuk ke pil | "Ini kecilin lah biar atas sama bawah lebarnya sama. Angkanya masuk" |
| 21 Okt 08:24–08:25 | Koordalops | Pil TD/Siaga, strip KUMULATIF 2026, dan format armada siap/total dihapus | "Hilangkan" |
| 21 Okt 08:15 | Koordalops | Pil status darurat dan strip KUMULATIF 2026 di slide 1 (diganti 08:24) | "slide 1 gas" |
| 21 Okt 08:15 | Koordalops | Armada format siap/total, baris kosong "–" (diganti 08:24–08:25) | "jadi kedua baris itu akan kosong. oke gas" |
| 21 Okt 08:15 | Koordalops | Kondisi lapangan, kebutuhan, dan Gakkum tidak masuk slide 2 | "oke ga apa gausah dimasukin dulu" |
| 21 Okt 08:14 | Koordalops | Isi slide 3 ditanyakan untuk dipindah ke slide 1-2 (diganti 08:24–08:26) | "Ini ga bisa dimasukin ke slide 1 dan 2?" |
| 21 Okt 08:13 | Koordalops | Catatan kaki ** tidak menyebut Koordalops sebagai sumber | "Jambi, dan Sulawesi Tengah dari Laporan Harian Dit. Koordalops BNPB 20  ini gausah ada" |
| 21 Okt 08:13 | Koordalops | Rincian Sigi dan Tojo Una-Una dibuang dari catatan kaki | "…ini gausah ada" |
| 21 Okt 07:55 | Koordalops | Angka PM2.5 dipisah dari label (diganti 08:25) | "336 dan berbahaya ya dipisah labelnya ya." |
| 21 Okt 07:55 | Koordalops | Label BERBAHAYA diberi ikon | "Berbahaya kasih icon" |
| 21 Okt 07:55 | Koordalops | Pil angin kencang dan hujan diberi ikon | "Angin kencang dan hujan kasih icon" |
| 21 Okt 07:53 | Koordalops | NA kolom 20 Okt diisi dari Laporan Harian; baris Jumlah tetap NA (bagian Jumlah diganti 14:12: semua NA diisi) | "1. gas" |
| 21 Okt 07:53 | Koordalops | Luas kumulatif 2026 dimasukkan (diganti 08:24) | "2. gas" |
| 21 Okt 07:53 | Koordalops | Status darurat dan armada udara masuk slide 3 baru (diganti 08:24–08:26) | "3. 4 gas" |
| 21 Okt 07:53 | Koordalops | Kondisi lapangan dimasukkan, tanpa sekolah daring (dihapus 08:26; pengecualian sekolah daring tetap) | "7 gas yang sekolah daring gausah" |
| 21 Okt 07:53 | Koordalops | Kebutuhan mendesak dan Gakkum dimasukkan (dihapus 08:26) | "8 gas" |
| 21 Okt 07:50 | Koordalops | Info Laporan Harian Koordalops ditambahkan ke deck kiriman pemilik, bukan ke skema /laporan-bnpb | "Bukan dari laporan harian dir koordalops tadi bisa menambah informasi apa di deck yang saya kirim" |
| 21 Okt 07:49 | Harian | Hanya deck 20-21 Okt yang dibuat; generator tidak diubah ke format WA | "Buat deck 20–21 Okt saja" |
| 21 Okt 07:47 | Harian | Deck 18-19 Okt jadi standar acuan | "Ini gw kirim standar laporan harian sebelumnya. Tolong dibantu disesuaikan" |
| 21 Okt 07:47 | Harian | Sumber data teks WA Koordalops, 19 laporan dan 18 kejadian menonjol | "Laporan kejadian bencana sejumlah 19 (sembilan belas) kejadian. INi ada laporan harian" |
| 20 Okt 16:29 | Situs (bukan deck) | Spanduk privasi dihapus, analitik tetap menyala | "Dihapus aja Tapi tetap analitik semua pengunjung" |
| 20 Okt 16:27 | Peta situs (bukan deck) | Gelembung Himawari dikecilkan | "Kecil aja yang Himawari ya" |
| 20 Okt 16:27 | Situs (bukan deck) | Keluhan spanduk privasi belum hilang (diselesaikan 16:29) | "Kenapa belum ilang" |
| 20 Okt 15:59 | Peta situs (bukan deck) | Keluhan angka pada gelembung tidak terlihat | "Mana angkanya ga keliatan" |
| 20 Okt 15:56 | Peta situs (bukan deck) | Titik Himawari dikelompokkan dalam gelembung berangka yang memperbesar peta saat diklik | "ada lingkaran kecil gitu di lingkaran besar. Ada angkanya. Baru nanti dia zoom" |
| 20 Okt 14:30 | Situs (bukan deck) | Form rumah rusak dibuka lewat tombol di /lapangan | "Tombol di /lapangan (Recommended)" |
| 20 Okt 13:59 | Situs (bukan deck) | Spanduk privasi dihilangkan (SPANDUK = false) | "Hilangkan" |
| 20 Okt 13:46 | Situs (bukan deck) | Pelapor rumah rusak: pemegang akun dan regu berkode | "Akun + regu kode (Recommended)" |
| 20 Okt 13:43 | Situs (bukan deck) | Hasil ditaruh di centurisk.id yang wajib login | "Ini taruh di centurisk.id aja yang butuh login" |
| 20 Okt 13:42 | Harian (rujukan) | Kategori rumah rusak Berat/Sedang/Ringan dari laporan 18-19 Okt jadi dasar fitur laporan warga | "ada rumah yang rusak sedang berat ringan. Jadi orang bisa kasih laporan" |
| 20 Okt 13:42 | Situs (bukan deck) | Semua lapisan keterpaparan Open Buildings disetujui | "Oke untuk semua" |
| 20 Okt 13:34 | Situs (bukan deck) | Akun login baru di centurisk97.id (dirgayuza), secret per orang | "Oke buatkan akun di centurisk97.id" |
| 20 Okt 13:33 | Harian, Presiden | Ekspor otomatis ke PPTX dan PDF | "Dan ada otomatis utnuk di export ke ppt dan pdf" |
| 20 Okt 13:33 | Harian, Presiden | Fitur laporan BNPB hanya di centurisk97.id | "Ini hanya untuk centurisk97.id ya" |
| 20 Okt 13:33 | Harian, Presiden | Dashboard dan cara input dibuat sebagai halaman /laporan-bnpb | "Tolong ini buatkan dashboardnya atau tampilannya. Dan cara inputan datanya" |

Sesi de8d4fe1 (19 Okt sekitar 01:38) tidak berisi keputusan deck apa pun.