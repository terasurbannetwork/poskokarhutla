# Layar ketepatan, tangga, paparan

Halaman ini merinci layar ketepatan prakiraan, tangga, paparan dampak, laporan provinsi, konfirmasi lapangan, dan halaman ringkas.

## Tab Ketepatan prakiraan (rapor)

Jalur: `https://centurisk97.id/prediksi#rapor`. Sumber: `skor.json`, `ujibalik.json`, `kalibrasi.json`, `kalibrasi_aktif.json`, `kalender_risiko.json`.

Isi tab, berurutan:

1. **Prospektif.** Per kode bencana, tabel per ambang, tenggang (+1, +2, +3 hari), dan tahap (sementara atau final): n pasangan, Brier model, Brier persistensi, Brier klimatologi, POD, FAR, galat jam mulai dan lama hujan, serta vonis. Kode yang belum punya pengamatan berstatus "menunggu" disertai alasan tertulis.
2. **Model bayangan, diuji berdampingan.** Empat model dari lab (banjir, longsor, cuaca ekstrem, karhutla) dinilai pada pasangan yang sama dengan model lama dan tidak tampil di tab Besok. Ada dua vonis: vonis Brier (aturan sama dengan model lama) dan vonis peringkat (AP, ketepatan peringkat).
3. **Uji balik retrospektif.** Tabel hujan dari `ujibalik.json` bila berkas ada; bila belum, tertulis "Belum dijalankan".
4. **Kalender risiko dari logbook.** Pilih kab/kota untuk melihat batang 12 bulan: jumlah tahun penuh logbook Pusdalops yang bulannya punya sedikitnya satu kejadian banjir, longsor, cuaca, atau karhutla. Kab/kota dengan kurang dari 5 kejadian ditandai "sampel kecil". Ini referensi kedua, bukan pengganti klimatologi di rapor.
5. **Koreksi bulanan banjir** dan **Kalibrasi otomatis.** Menampilkan versi koreksi aktif dan status tiap grup kalibrasi (dipakai, ditolak, menunggu) beserta alasannya.

Cara membaca: Brier lebih kecil berarti lebih baik. POD (probabilitas deteksi) dan FAR (rasio alarm palsu) dihitung pada batas peluang 0,5. Hal yang sering disalahpahami: hujan 1 mm terjadi di mayoritas kab-hari sehingga model "menang" dengan informasi yang sedikit; vonis dibaca per grup, dan pil di tab Besok mengambil grup tertentu saja.

## Tab Tangga peringatan

Jalur: `https://centurisk97.id/prediksi#tangga` atau `#tangga/<id kab 4 digit>`. Sumber: `tangga.json`. Layar baca saja: tidak menulis ke D1 mana pun, sehingga tidak ada tombol data dummy (`KEPUTUSAN-TANGGA.md` D7).

Langkah pakai:

1. Tanpa pilihan, layar menampilkan ringkasan per provinsi: jumlah kab/kota "menguat", "searah", dan "belum selaras" untuk ancaman kering dan basah. Klik satu provinsi.
2. Setelah provinsi dipilih, daftar kab/kota bersinyal tampil, diurutkan: menguat dulu, lalu searah, lalu nama. Saring ancaman dengan tombol "Kering dan basah", "Kering", atau "Basah". Klik satu kab/kota (atau pilih dari dropdown Kab/kota).
3. Kartu tangga kab/kota tampil: tujuh baris skala (Musim, Bulan, Dasarian, 10 hari, Sepekan, 3 hari, Jam) dengan dua kolom (Kering, Basah). Tiap pernyataan memuat pil tingkat dengan label resmi sumber, pil cakupan (nasional, provinsi, atau "dari kecamatan, diringkas ke kabupaten"), pil jenis (kita atau analisis bila bukan pernyataan resmi), kalimat, lembaga, tanggal terbit atau diambil, dan periode.
4. Di kepala tiap kolom, pil sinyal menampilkan "menguat", "searah", "belum selaras", atau "tanpa sinyal", ditambah deretan batang peringkat per skala. Arahkan kursor untuk melihat peringkat dan cakupan tiap skala. Buka "Aturan sinyal" di bawah kartu untuk teks aturan, dan "Sumber yang dilewati" untuk sumber yang tidak dimuat.

Arti label:

- Anak tangga kosong bertulis "Tidak disebut dalam pernyataan sumber" berarti ada sumber resmi untuk skala itu yang termuat dan segar tetapi tidak menyebut kab/kota atau provinsi ini. Bertulis "Belum ada data" berarti sumbernya tidak termuat atau sudah melewati batas basi. Keduanya bukan pernyataan bahwa wilayah itu tidak terancam.
- Pernyataan yang hanya sampai provinsi atau nasional diberi pil cakupan dan tidak diklaim sebagai kabupaten.
- Pil "sinyal belum diuji balik" menandakan bahwa sinyal belum dinilai terhadap kejadian; jangan dibaca sebagai ketepatan.

Hal yang sering disalahpahami: sinyal bukan peluang dan bukan kabar bahwa kejadian akan terjadi; ia hanya menyatakan bahwa pernyataan resmi pada skala berbeda searah atau bertentangan. Prediksi kita di skala 3 hari, sepekan, dan bulan tampil di tangga tetapi tidak ikut menghitung sinyal.

## Tab Paparan dampak

Jalur: `https://centurisk97.id/prediksi#dampak/<kode provinsi>`. Sumber: `dampak.json`, `jalan.json`.

1. Pilih provinsi. Pilih lapisan: Bahaya gempa, Desa langganan terisolir, Ruas rawan putus jalan, atau Genangan banjir terekam.
2. Peta kab/kota satu provinsi berwarna menurut kelas lapisan. Klik kab/kota (atau cari namanya) untuk rincian di sisi peta: kelas bahaya gempa dan skor, magnitudo tertinggi dan jumlah gempa M5+, jumlah kecamatan berindeks InaRISK tinggi, desa langganan terisolir menurut logbook, luas genangan radar terbesar yang terekam, dan ruas jalan rawan beserta 10 ruas teratas (tautan ke OpenStreetMap).
3. Buka "Batasan" untuk label sumber.

Ini skenario dan paparan statis, bukan prakiraan dan bukan peluang kejadian. "Tanpa data" berarti sumber tidak memuat kab/kota itu, bukan nol. Ruas rawan putus jalan adalah ruas tunggal yang bila hilang memisahkan bagian jaringan jalan utama OSM; ruas di tepi kotak kab bisa tampak tunggal padahal tersambung keluar kotak (batas atas).

## Tab Laporan provinsi

Jalur: `https://centurisk97.id/prediksi#laporan/<kode provinsi>[/<jenis>]`. Pilih provinsi dan jenis (Banjir, Longsor, Titik panas, Asap, Rob, Hujan). Tombol unduh membuka dialog cetak (A4 lanskap).

- Laporan Banjir berisi ringkasan jumlah kab/kota per level, peta hujan kemarin, lengas tanah, prakiraan hujan besok, ambang hujan pemicu banjir, prakiraan lewat ambang, tiga peta level banjir (besok, +2, +3), dan tabel rincian. Panel ambang dan lebihan berpil "hipotesis" selama berkas `ambang_persentil.json` belum menyatakan `pakai: true`; kab/kota di luar sampel memakai angka nasional (bertanda *).
- Laporan jenis lain memuat ringkasan per kelas, tiga peta (besok, +2, +3), dan rincian kab/kota. Provinsi tanpa kab/kota pesisir yang dipantau rob menampilkan keterangan, bukan peta kosong.
- Laporan adalah alat bantu staf, tidak untuk disebar ke publik.

## Tab Konfirmasi lapangan

Jalur: `https://centurisk97.id/prediksi#konfirmasi`. Untuk regu atau staf mencatat apakah kejadian yang diprakirakan benar terjadi. Jawaban dipakai menilai prakiraan, bukan laporan darurat.

1. Isi kode regu, nama kab/kota (pilih dari daftar), tanggal kejadian (paling lama 7 hari ke belakang, tidak boleh di masa depan), dan jenis (Hujan, Titik panas, Banjir, Longsor, Asap, Rob).
2. Nilai (opsional, mis. tinggi genangan cm atau hujan mm) dan catatan (opsional, maksimal 500 karakter).
3. Tekan "Terjadi" atau "Tidak terjadi". Bagian "Prakiraan sehari sebelumnya untuk tanggal ini" menampilkan prakiraan beku dari `lalu.json` sebagai bahan pembanding.
4. Kirim ulang untuk kab-tanggal-jenis yang sama menimpa jawaban regu itu. Staf yang masuk lewat sesi dapat mengirim tanpa kode regu.

Formulir belum menerima jenis gelombang dan angin (keputusan K15).

## Halaman ringkas /prediksi/ringkas

Jalur: `https://centurisk97.id/prediksi/ringkas`. Terkunci seperti `/prediksi`. Satu pertanyaan: kab/kota mana yang perlu siaga besok sampai tiga hari, untuk bencana apa. Tanpa tab.

1. Pilih hari (Besok, Lusa, H+3), provinsi, atau cari kab/kota.
2. Tombol ringkasan per bencana menampilkan jumlah kab/kota berlevel Siaga ke atas. Klik sekali untuk menyaring, klik lagi untuk kembali ke Semua. Bencana yang vonisnya bukan "mengalahkan baseline" tampil pucat berlabel "uji coba".
3. "Perlu tindakan" memuat aturan terpicu. Daftar kab/kota memuat level Waspada ke atas beserta bencananya dalam bentuk chip; klik baris untuk rincian berbahasa biasa dan tautan ke Paparan dampak dan Laporan provinsi.
4. Bagian "Untuk tim teknis" menautkan Ketepatan prakiraan, Tangga peringatan, Konfirmasi lapangan, dan halaman lengkap.

Hal yang sering disalahpahami: angka di tombol bencana menghitung level Siaga ke atas, sedangkan daftar di bawahnya memuat level Waspada ke atas, sehingga daftar lebih panjang daripada angka tombol. Halaman ini mengambil data dan fungsi yang sama dengan `/prediksi` dan tidak menghitung prakiraan sendiri.
