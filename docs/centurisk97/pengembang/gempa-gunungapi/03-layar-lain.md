# Layar gunung api, longsor, kekeringan

Halaman ini menguraikan layar gunung api, longsor, kekeringan, dan pesisir.

## Letusan Gunung Api: `/gunungapi/`

Tab menurut `public/gunungapi/app.js:56`: Peta, Kejadian, Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang, Informasi (tersembunyi), Metode. Tab Operasi mengikuti aturan yang sama dengan gempa (`public/gunungapi/operasi.js`).

**Peta.** Titik 69 gunung api berwarna menurut level resmi PVMBG: "Level I Normal", "Level II Waspada", "Level III Siaga", "Level IV Awas" (`public/bencana.json`, kunci `tingkat`). Pemilih "Level" menyaring. Klik gunung untuk laci: level dan waktu perubahan, radius rekomendasi PVMBG dari laporan harian, kegempaan 24 jam, letusan terbaru, kawasan rawan bencana (KRB) I sampai III, dan lembar fakta. Cincin di peta adalah radius rekomendasi MAGMA, sedangkan KRB adalah poligon resmi ESDM edisi 2018.

**Kejadian (`/gunungapi/k/V0001`).** Kejadian gunung api bernomor V. Datanya dari berkas awal kejadian (`../banjir/data/kejadian_gunungapi_awal.json`). Hanya satu kejadian V per gunung berstatus Waspada (Level II) ke atas; kode tetap selama gunung tetap Level II ke atas, masa aktif 3 hari sesudah turun (`public/gunungapi/kejadian.js:1-3`).

**Insight.** Kartu: Status gunung api, Daftar gunung, Perubahan level, Erupsi, Paparan KRB III, Arahan per KRB, Bandara di jalur abu, Izin tambang, dan Uji model (`public/gunungapi/insight.js`). Kartu "Bandara di jalur abu" adalah skenario, bukan awan abu saat ini. Kartu "Uji model" menampilkan hasil uji balik model abu apa adanya.

**Tren.** Riwayat level nasional, erupsi per hari, dan riwayat level per gunung dari surat PVMBG yang diarsipkan Pusdalops. Hari yang tidak terbaca digambar tanda strip, bukan 0.

**Dampak.** Penduduk dalam radius dan zona, sekolah dan fasilitas kesehatan dalam radius (hanya provinsi yang datanya ada), serta korban historis BNPB. Kerugian rupiah tidak ditampilkan karena belum ada asumsi yang bersumber kuat (`public/gunungapi/dampak.js`).

**Simulasi (`/gunungapi/simulasi`).** Simulasi 3D erupsi untuk satu gunung (bawaan dari status MAGMA). Langkah pakai:
1. Pilih gunung dan skenario: tinggi kolom (1, 3, 5, 10, 15 km), durasi (1, 3, 6, 12, 24 jam), volume lahar (100 ribu, 1 juta, 10 juta meter kubik), dan rasio awan panas H/L (0,2; 0,25; 0,3; 0,35) (`public/gunungapi/sim.js:11`).
2. Jalankan. Abu mengikuti angin 72 jam, lahar mengikuti lembah dari DEM, awan panas mengikuti kerucut energi.
3. Baca lapis tanggap: desa terdampak, waktu tiba, evakuasi berkapasitas, peringkat perlakuan, masker, dan bandara. Semua satuan biaya dan kapasitas adalah asumsi yang bisa diganti.
Hasil adalah ilustrasi bahaya, bukan prakiraan. Pita merah awan panas adalah keluaran model.

**Foto, Tentang, Metode, Laporan harian (`/gunungapi/laporan.html`).** Kategori foto: Hujan abu, Lahar, Pengungsian, Lainnya.

## Tanah Longsor: tab Longsor di `/banjir/`

Jalur: `/banjir/#longsor` (kunci registri `layar.jalur`). Tab ini milik halaman banjir; kode kartunya `public/banjir/longsor.js`. Kartu:
- **Status longsor kecamatan.** Jumlah kecamatan Waspada, Siaga, Awas per hari (hari ini sampai +3) dan 10 provinsi teratas. Status ini berasal dari aturan produksi di `scripts/banjir/status.py` (lihat Metode, bagian Status longsor harian).
- **Nowcast.** Daftar kecamatan berbahaya tinggi dan sedang dari model kerentanan dikali hujan 7 hari (`public/longsor/data/nowcast.json`). Kartu menyebut terang-terangan bahwa model belum lulus uji balik. Kecamatan yang tidak tercantum berarti "rendah", sedangkan `tanpa_nilai` adalah kecamatan yang belum punya sel hujan, bukan rendah.
- **Musim.** Riwayat logbook jenis longsor per 100 hari tercatat dan peluang bulanan dari kalender risiko prediksi.

Simulasi longsor (peluang longsor dangkal per sel dari lereng dan hujan) berada di simulasi banjir (`public/banjir/sim_longsor.js`, dimuat `public/banjir/index.html:293`).

## Kekeringan: `/kekeringan/`

Tab menurut `public/kekeringan/app.js:95`: Peta, Insight, Berita, Tren, Dampak, Simulasi, Posko, Foto, Tentang, Informasi, Metode. Tab Informasi dan Posko disembunyikan dari menu tetapi dapat dibuka lewat URL (`app.js:98`, `app.js:102`).

**Peta.** Tujuh mode peta (`public/kekeringan/peta.js`): Status (gabungan hujan dan kelembapan tanah), Tanpa hujan (HTH), Prakiraan (peluang kering 1 sampai 3 bulan), Padi (peluang hasil padi tadah hujan turun), Hujan (SPI-3), Tanah (kelembapan 7 sampai 28 cm), dan Kode kering (Drought Code). Warna status: abu Normal, kuning Waspada, jingga Siaga, merah Awas. Tingkat kecamatan memakai sel 0,5 derajat terdekat; tingkat kabupaten dan provinsi memakai tingkat tertinggi yang dialami 30 persen penduduk atau lebih. Semua status berlabel "Deteksi Centurisk97" dan berpil "Ambang masih hipotesis" selama ujinya belum lulus (lihat Metode).

**Insight, Tren, Dampak.** Insight memuat kartu status berpil hipotesis dan kartu "Peringatan resmi BMKG" (peta dasarian PDKM tampil apa adanya dari BMKG, berlabel BMKG dan terpisah dari deteksi kita; kartu dibuang bila gambar gagal dimuat). Data SK status darurat BNPB dari `kekeringan_resmi.json` berlabel BNPB dan didahulukan dari deteksi kita; kartunya (bagian "Status darurat resmi") ada di tab Dampak (`public/kekeringan/dampak.js:66` dan `:73`; pemetaan SK per kabupaten dan provinsi di `app.js:87-89`). Dampak menghitung siswa dan fasilitas terpapar hanya di kabupaten yang tercakup datanya; sisanya dibuang, bukan nol.

**Simulasi (`/kekeringan/simulasi.html`).** Neraca air tanah 180 hari per sel. Langkah pakai: pilih sel di peta, pilih hari simulasi atau hari tanam, pilih skenario hujan (ECMWF, El Nino kuat, Normal), pilih perlakuan (sewa tangki, sumur, dan sebagainya), tekan Putar, lalu baca peringkat perlakuan. Biaya satuan adalah asumsi perencanaan Centurisk97 (`public/kekeringan/sim_tanggap.js`), bukan harga resmi.

**Posko (`/kekeringan/posko`).** Posko air bersih dan kebutuhan tangki per gugus kecamatan Siaga atau Awas. Kebutuhan dihitung untuk seluruh penduduk kecamatan berstatus, sehingga merupakan batas atas skala logistik, bukan jumlah penerima.

**Foto.** Kategori Sumur kering, Sawah puso, Antre air, Lainnya.

## Gelombang Pasang dan Abrasi: `/pesisir/`

Tab menurut `public/pesisir/pesisir.js:37`: Peta, Insight, Tren, Dampak, Foto, Metode, dan Lapor Warga (Informasi, tersembunyi, `pesisir.js:39`). Tab Operasi pesisir (`public/pesisir/operasi.js`, `tab_operasi: true` di `public/bencana.json`) muncul bersyarat seperti gempa dan gunung api; Kekeringan dan Longsor `tab_operasi: false`.

**Foto.** Kategori Abrasi pantai, Rob, Gelombang tinggi, Lainnya.

**Peta.** Garis pantai dan transek abrasi (5 situs pantura: Sayung, Pesisir Pekalongan, Karangsong dan delta Cimanuk, Blanakan dan Legonkulon, Muara Gembong), titik rob, stasiun pasang surut, gelombang model, dan peringatan gelombang BMKG. Pemilih "Hari" menggeser tanggal acuan.

**Insight.** Kartu: Status rob model, Peringatan rob BMKG, Peringatan gelombang BMKG, Pasang tertinggi tujuh hari, Gelombang model, Transek abrasi tercepat, dan Kelas transek per situs.

**Tren.** Kejadian rob per tahun (DIBI), bulan dan musim laporan rob, seri garis pantai per situs, dan logbook gelombang pasang. Logbook tidak memiliki jenis gelombang pasang atau abrasi yang cukup, sehingga tidak ada deret karangan.

**Dampak.** Kabupaten atau kota dengan titik rob berstatus Waspada atau lebih beserta penduduk seluruh kabupaten (bukan penduduk di area tergenang), dampak tercatat banjir rob DIBI, dan transek abrasi per situs.

Hal yang sering disalahpahami: laju abrasi tampil bersama selang 95 persen dan keyakinan; "tidak nyata" berarti selang laju memuat nol, bukan "pantai stabil". Satu angka posisi garis pantai tahun tertentu tidak boleh dibaca sebagai fakta karena belum ada koreksi pasang surut.
