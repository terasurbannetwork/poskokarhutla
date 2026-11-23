# GLOSARIUM: Lapor Bencana BNPB

| Istilah | Arti |
| --- | --- |
| Pintu | Jalan masuk percakapan: WA (gateway bot) atau web (`/lapor`). Satu mesin untuk keduanya |
| Sesi lapor | Satu laporan sejak pesan pertama sampai terkirim, batal, atau kedaluwarsa |
| Isian | Satu butir data laporan dari spek (misalnya "meninggal", "kedalaman genangan") |
| Data umum | Isian Lampiran I yang berlaku untuk semua jenis bencana |
| Data khusus | Isian Lampiran III yang hanya berlaku untuk jenis tertentu |
| Wajib awal | Isian yang harus ada sebelum laporan bisa dikirim: jenis dan subjenis, waktu, lokasi |
| Nihil | Pelapor menyatakan "tidak ada"; dihitung terjawab |
| Belum didata | Pelapor belum tahu atau tidak menjawab; tidak pernah ditulis sebagai 0 |
| Kutipan | Potongan pesan pelapor yang menjadi dasar satu angka; angka tanpa kutipan dibuang |
| Asal isian | Catatan dari mana nilai datang: pesan, GPS perangkat, lokasi WA, EXIF, atau sistem |
| Tingkat sumber | `warga`, `bpbd_klaim` (mengaku petugas, belum dikonfirmasi), atau `bpbd` (dikonfirmasi) |
| Lencana foto | Kekuatan bukti lokasi foto: GPS perangkat, EXIF cocok, lokasi WA, tanpa lokasi; ditambah tanda curiga |
| Tiket | Catatan tindak lanjut satu laporan, bernomor sama `LA-DDMMYY-NN`, dengan status dan riwayat append-only |
| Monitoring | Layar staf `/lapor/meja`: Peta, Daftar, Foto |
| Izin uji | Daftar nomor yang boleh memakai layanan pada F0, diatur PEMILIK lewat `lapor izin` |
| PEMILIK | Nomor WA pemilik di `.env` mesin bot |
| F0, F1, F2 | Fase uji satu pengguna, rintisan BPBD, dan publik |

---

## Lanjutan 19 Nov 2026

| Istilah | Arti |
| --- | --- |
| Verifikasi dua arah | Staf BNPB meminta BPBD setempat menjawab Benar, Sebagian benar, atau Tidak ditemukan atas satu laporan warga; bukti tambahan, bukan vonis |
| Kontak BPBD | Nomor WA petugas BPBD kab/kota yang didaftarkan admin atau PEMILIK di `lapor_kontak_bpbd`; bukan nomor pengakuan pelapor |
| Tautan bertoken | Alamat `/lapor/v/<token>` tanpa login, berlaku 48 jam, terikat satu permintaan atau paket tugas |
| Gugus (laporan) | Himpunan laporan terkirim jenis sama yang berdekatan dalam jarak dan jam tertentu dari paling sedikit dua nomor pelapor berbeda, nomor `GL-DDMMYY-NN`; bukan kejadian resmi |
| Gugus kuat | Gugus dengan paling sedikit tiga pelapor berbeda atau dua pelapor berfoto berlencana; tidak berarti terverifikasi |
| Gugus kejadian | Istilah Buku Besar (`KJ-...`) untuk kejadian resmi; berbeda dari gugus laporan |
| Kelompok titik | Pengelompokan tampilan titik di peta meja (lingkaran berangka) yang memecah saat zoom; bukan gugus laporan |
| Kabar balik | Pesan WA ke pelapor yang setuju dikabari: peringatan BMKG atau jumlah laporan di sekitar lokasinya |
| Langganan kabar | Persetujuan opt-in dan lokasi dibulatkan 0,01 derajat untuk kabar balik |
| Peringatan nowcast BMKG | Peringatan jangka sangat pendek BMKG berformat CAP di `peringatan.json`, bidang `severity`, `urgency`, `certainty`, `polygon` |
| CAP | Common Alerting Protocol 1.2 (OASIS), format baku peringatan darurat |
| Mode Tanya | Tanya bebas yang dijawab dari butir `edukasi.json` dengan sumber; jawaban tanpa sumber tidak diberikan |
| Butir | Satu poin teks di `edukasi.json` (ringkas, tanda, sebelum, saat, sesudah) yang bisa dikutip utuh |
| Susulan | Tambahan kabar ke tiket yang sama; membuat versi laporan baru dan PDF baru tanpa laporan baru |
| Jendela susulan | Waktu sesudah terkirim ketika susulan ditawarkan (bawaan 72 jam, selama tiket belum selesai atau tidak valid) |
| Transkrip suara | Teks hasil ubah pesan suara WA di Mac mini; harus dikonfirmasi pelapor sebelum diurai; audio dihapus |
| Foto saja | Laporan yang dimulai dari foto tanpa teks |
| Laporan cepat | Formulir luring tiga kelompok wajib ditambah kronologi dan foto, disimpan di HP sampai ada sinyal |
| Luring | Tanpa sinyal; butir disimpan di IndexedDB `pb-antre` oleh `public/inti/antre.js` |
| Waktu klien dan waktu terima | Saat pelapor menekan simpan di HP dan saat server menerima; dicatat terpisah |
| Penilaian foto | Tanda otomatis untuk staf: Buram, Lama, Mirip foto di LA-...; tidak pernah menolak |
| dHash | Hash perseptual 64 bit dari selisih piksel bertetangga, dibandingkan dengan jarak Hamming |
| Relevansi foto | Kesesuaian foto dengan jenis bencana lewat model penglihatan; tertahan Q4 dan Q29 |
| Ringkasan harian | Rangkuman laporan warga 24 jam per provinsi dan jenis, arsip append-only, siap ditempel ke Laporan Harian BNPB |
| Cut off | Batas waktu jendela ringkasan harian (bawaan 06.00 WIB) |
| Tugas | Penugasan satu tiket ke staf atau kontak BPBD dengan tenggat; riwayat append-only |
| Paket (tugas) | Beberapa tugas ke kontak BPBD yang sama dengan satu pesan dan satu tautan |
| Tindakan | Pindah status, catatan staf, jawaban verifikasi, atau penanda penerima sesudah penugasan |
| Merah lewat tenggat | Tampilan tugas terbuka yang lewat tenggat tanpa tindakan sebelum tenggat; bukan status |
| Sinyal awal | Lapisan staf di peta utama berisi gugus dan laporan 48 jam, berlabel belum terverifikasi |
| Sejalan dengan prediksi, Di luar prediksi | Tanda netral pada laporan menurut level prediksi kab pada tanggal kejadian; bukan penilaian laporan atau prediksi |
| Pembanding | Tabel hitung laporan warga lawan prediksi per jenis di `/prediksi`; tanpa skor gabungan |
| Draf LogPal | Draf permintaan logistik dari kebutuhan laporan, nama barang `item_standar`, tanpa jumlah, diperiksa dan diajukan BPBD |
| `item_standar` | Nama barang standar di `logpal_barang` yang dipakai LogPal (Paket makanan siap saji, Selimut, dan seterusnya) |
| Skor perhatian | Jumlah penanda yang menyala pada satu laporan (Korban, Foto sah, GPS, Lama belum dibuka, Gugus kuat, Dari BPBD atau terverifikasi, Ada susulan); alat urutan, bukan nilai kebenaran |
| Lama dibuka, lama tindak | Selang dari waktu terima ke penanda dilihat pertama, dan ke status ditindaklanjuti pertama |
| Tandai ganda | Menandai laporan sebagai salinan laporan lain (bukan laporan pelapor lain tentang kejadian yang sama) |
| Layar besar | Mode penuh layar `/lapor/meja?layar=besar` untuk ruang Pusdalops, tanpa data pribadi |
| Tindakan massal | Aksi atas beberapa laporan sekaligus: pindah status, teruskan ke BPBD, tandai ganda |
| Darurat sekali ketuk | Laporan darurat yang terkirim dengan satu ketukan berisi titik GPS, dilengkapi kemudian lewat percakapan K68 |
| Pelapor belum dikenal | Label laporan sekali ketuk dari perangkat yang belum terikat ke nomor |
| Kabar selamat | Tanda dari warga bahwa dirinya selamat, dilihat keluarga lewat tautan yang ia bagikan |
| Orang dicari | Laporan orang belum ditemukan dari keluarga, hanya untuk meja petugas |
| Poster desa | Poster A4 ber-QR yang membuka `/lapor` dengan desa sudah terisi |
