# KEAMANAN-PRIVASI: Akun BPBD dengan profil PIC

Pemeriksa wajib `security-reviewer` dan `guard-api` untuk tiap tiket yang menyentuh `src/**`. Dokumen ini mengikuti pola `data/kajian-bnpb/pintu-masuk/KEAMANAN-PRIVASI.md`.

## 1. Data dan sifatnya

| Data | Sifat | Di mana | Siapa melihat |
| --- | --- | --- | --- |
| Username dan sandi lembaga | rahasia bersama; hanya `sha256(garam + sandi)` | `instansi_akun` | tidak ada yang bisa membaca sandi; admin hanya melihat sandi awal sekali di CSV |
| PIN profil | rahasia pribadi; hanya HMAC bergaram dan berkunci | `instansi_profil.pin_sha` | tidak ada; admin hanya melihat PIN sementara sekali saat atur ulang |
| Nama, jabatan | data pribadi biasa | `instansi_profil` | semua PIC lembaga yang sama (kisi pilih profil), admin |
| NIP, email, no. HP | data pribadi | `instansi_profil`, salinan PIC pertama di `instansi_akun` | pemilik profil, admin dan staf verifikator wilayah; tersamar sampai tombol "Tampilkan" |
| Foto muka | data pribadi, foto biasa (K8) | R2 `instansi/profil/<akun>/<profil>` | PIC lembaga yang sama (di balik sesi akun), admin |
| Surat tugas dan kartu pegawai | data pribadi | R2 `instansi/dok/<akun>/...` (ada) | admin saja (tidak berubah) |
| Log tindakan | catatan kegiatan, `ip` 12 karakter pertama hash bergaram | `instansi_profil_log` | PIC melihat log lembaganya sendiri, admin semua |

Tidak ada data biometrik: foto tidak diolah, tidak ada vektor wajah, tidak ada pencocokan (K8). Foto tidak pernah di `public/`, tidak di `public/data`, tidak di repo.

## 2. Dasar hukum dan retensi

Pengolahan memerlukan persetujuan atau dasar lain menurut UU Pelindungan Data Pribadi; bawaan paket ini: halaman daftar PIC menampilkan satu paragraf pemberitahuan (apa yang dikumpulkan, untuk apa, siapa melihat, berapa lama) dan satu kotak persetujuan per profil sebelum data disimpan. Rumusan resmi menunggu pemilik (belum diputuskan; **[BAWAAN SEMENTARA]**: paragraf dari kerangka halaman `/masuk` yang ada).

| Data | Disimpan | Dihapus |
| --- | --- | --- |
| Profil `dicabut` | data teks 2 tahun (jejak audit), foto 30 hari | pembersihan jam-an |
| Log | 730 hari (Q7) | trigger menolak hapus yang lebih muda; pembersihan menghapus yang tua |
| Sesi profil | 12 jam | baris kedaluwarsa dibuang pembersihan |
| Baris `salah` dan kunci | selama profil ada | ikut profil |

Penghapusan data atas permintaan pemilik data tidak punya tombol di paket ini (pertanyaan N6 di `PRD.md`). Mengosongkan kolom tidak bisa karena CHECK `instansi_profil` mewajibkan nilai sah; bawaan sementara: pemilik repo menghapus baris profil `dicabut` lewat perintah D1, log tetap menyimpan id profil, bukan nama.

## 3. Ancaman dan penangkal

| Ancaman | Penangkal | Uji |
| --- | --- | --- |
| Tebak PIN | HMAC berahasia `PROFIL_KUNCI`; reservasi percobaan atomik sebelum membandingkan; kunci 15 menit per profil dan IP setelah 5 salah; kunci sampai admin membuka setelah 10 salah sehari; batas laju per akun 30 per jam dan per IP 60 per jam | UP-6, UP-7, UP-8 |
| Tebak PIN paralel | reservasi mencegah lebih dari 5 tebakan lolos per jendela | UP-8 |
| Mengunci profil orang lain (DoS) oleh pemegang sandi lembaga | kunci 15 menit per profil dan IP, jadi satu IP tidak mengunci profil dari IP lain; kunci harian tetap per profil dan hanya admin yang membuka (N7). Sisa risiko: pemegang sandi dari banyak IP bisa menggunakan 10 tebakan salah sehari untuk mengunci profil sampai admin membuka; diterima sebab pemegang sandi sudah orang dalam lembaga, dan kejadiannya terlihat di log `pin_salah` | UP-31 |
| Bocor D1 | PIN tidak bisa dipatahkan dari D1 saja karena kunci HMAC ada di env; sandi lembaga tersimpan sebagai hash bergaram | UP-23 |
| Bocor D1 dan `PROFIL_KUNCI` sekaligus | PIN 6 angka bisa ditebak offline (satu juta kemungkinan). Sisa risiko diterima; mitigasi: rahasia disimpan hanya sebagai rahasia Worker, tidak di berkas, dan sesi profil baru tetap butuh sandi lembaga | dicatat |
| Profil dengan PIN sementara dari reset dipakai tanpa diganti | `pin_wajib_ganti` ditegakkan di `akunAktif`, `hakMeja`, dan pembungkus rute; hanya ganti PIN, keluar, dan daftar profil yang lolos | UP-16 |
| Pencuri sandi lembaga | tanpa PIN tidak ada rute kerja (K3); hanya daftar profil dan foto yang terlihat | UP-3 |
| PIC lama yang sudah pindah | cabut profil mematikan sesi seketika; sandi lembaga yang bocor tidak menghidupkan profil mati | UP-10 |
| Profil direbut sebelum PIN diatur (N1) | admin melihat foto dan nama saat menyetujui; PIN pertama hanya bisa diatur sekali dan tidak menimpa PIN yang ada | UP-14 |
| CSRF | POST bersesi wajib `x-pb: 1` dan Origin sama-situs; `sesi_profil` masuk regex `tolakOrigin`; `SameSite=Lax` | UP-17 |
| Pencurian kuki lewat skrip | `HttpOnly`, `Secure`; CSP halaman `/instansi` yang ada | gerbang CSP yang ada |
| Tab basi mengirim atas nama orang lain | `x-akun` yang ada; sesi profil diverifikasi memiliki `akun_id` yang sama dengan sesi akun | UP-5 |
| Enumerasi username | pesan masuk satu untuk semua sebab (yang ada) | tes yang ada |
| Enumerasi profil | `GET /profil` hanya untuk sesi akun dan hanya mengembalikan profil akun itu | UP-4 |
| Foto berbahaya | hanya JPEG dari byte awal, `bersihMedia` membuang EXIF dan data sesudah EOI, disajikan dengan CSP `sandbox`, `nosniff`, `no-store` | UP-12 |
| Pengunggahan massal | laju `instansi.unggah` 20 per jam; ukuran 2 MB | UP-12 |
| Isi log membocorkan | log hanya jenis, rute, id objek; tidak ada isi pesan, badan, atau PIN | UP-19 |
| Log dipalsukan atau dihapus | trigger menolak UPDATE dan menolak DELETE dini | UP-20 |
| Admin menyalahgunakan atur ulang PIN | PIN sementara hanya tampil sekali, profil wajib ganti saat masuk, log `reset_pin` dengan id admin; PIC melihat log lembaganya | UP-16 |

## 4. Aturan kode

1. PIN, PIN sementara, token sesi, dan sandi tidak pernah masuk `console.*`, jawaban galat, URL, atau log D1. Gerbang GP-1 memindai `src/profil*.js` untuk `console` yang memuat variabel itu.
2. Perbandingan hash sama panjang tanpa keluar lebih awal.
3. Jawaban "profil tidak ditemukan" dan "bukan profil akun ini" sama isi dan status (403).
4. Rute profil tidak pernah menerima `akun_id` dari klien; id akun selalu dari sesi.
5. `PROFIL_KUNCI` kurang dari 32 karakter diperlakukan sama dengan kosong: 503 tanpa menulis apa pun.
6. Tidak ada rute yang menerbitkan `sesi_admin` atau `sesi_staf` dari sesi profil.
7. Sesi profil tidak memberi hak admin; hak admin tetap lewat cookie admin dan staf yang ada.

## 5. Privasi di layar dan di antarmuka

Kisi pilih profil hanya menampilkan foto, nama, jabatan. NIP, email, HP hanya muncul untuk pemilik profil (setelah PIN) dan admin; di layar admin tersamar (`08••••••21`, `an•••@bpbd.go.id`) sampai tombol "Tampilkan". Penampilan penuh di layar admin tidak menulis log di paket ini; bila pemilik ingin jejak lihat-data, itu keputusan tambahan. Daftar profil tidak muncul di halaman publik, di `public/data`, atau di respons yang bisa dibaca tamu.

## 6. Pemberitahuan insiden

Bila `PROFIL_KUNCI` atau dump D1 diduga bocor: ganti `PROFIL_KUNCI` (semua PIN tidak lagi cocok), lalu admin mengatur ulang PIN tiap profil (`pin_wajib_ganti`). Rencana ini dilatih di uji UP-23 (ganti kunci mematikan semua PIN lama).

## 7. Yang tidak dilakukan

Tidak membaca WA masuk, tidak mengirim PIN lewat WA atau email, tidak ada "ingat saya di perangkat ini" (PIN selalu diminta tiap pilih profil, Q8), tidak ada pemulihan PIN mandiri, tidak ada pencocokan wajah, dan tidak ada data PIC di ekspor massal.

## 8. Perluasan K11 sampai K13

| Data atau hal | Sifat | Aturan |
| --- | --- | --- |
| Nomor HP PIC di meja BNPB dan buku kontak | data pribadi (D11) | hanya staf BNPB (`hakMeja` jenis `bnpb`, `adminOK`); tersamar sampai "Tampilkan"; tiap penampilan penuh menulis satu baris `lapor_akses` atas nama staf; tidak pernah di `public/`, `public/data`, `bpbd_kontak.json`, jawaban pelapor, atau halaman lacak |
| Label penangan (nama dan jabatan) | data pribadi ringan | hanya meja (BPBD wilayah itu dan BNPB); tidak ke pelapor (N12) |
| Waktu respons | agregat per BPBD | hanya `hakMeja` jenis `bnpb`; BPBD dengan kurang dari 5 laporan tidak menampilkan angka (cegah menunjuk satu laporan atau satu orang); tanpa nama PIC dan tanpa nomor pelapor; tanpa peringkat |
| Pesan kirim ulang undangan | pesan WA | templat tetap; tujuan hanya nomor di `kontak_pemangku` untuk wilayah akun; tanpa sandi (N10); 1 per akun per jam |
| Teks salin | teks | sandi baru hanya di peramban admin, tidak disimpan, tidak di log |

Ancaman tambahan:

| Ancaman | Penangkal | Uji |
| --- | --- | --- |
| Staf wilayah lain mengirim undangan atau melihat PIC | `dalamWilayahStaf` pada papan dan kirim ulang | UP-33, UP-34 |
| Nomor tujuan kirim ulang dipalsukan | tujuan selalu dari baris `kontak_pemangku` yang cocok wilayah; badan hanya berisi id | UP-34 |
| Penyalahgunaan antrean WA untuk spam | laju 1 per akun per jam dan 200 per hari; templat tetap | UP-34 |
| BPBD mengambil laporan di luar wilayah | `dalamWilayah` sebelum menulis | UP-35 |
| Satu PIC "menyabotase" dengan mengambil semua laporan | pengambilan tercatat atas nama profil (log `meja`), label terlihat BNPB dan PIC lain; pencabutan oleh admin membebaskan laporan (N8) | UP-35 |
| Membaca nomor PIC lewat jawaban pelapor | `src/lapor_kontak.js` dan `src/lapor_info.js` tidak mengimpor fungsi PIC; GP-14 | UP-38, GP-14 |
| Statistik respons membocorkan satu orang | ambang 5 laporan dan tanpa nama | UP-36 |
| Kontak panen dan nomor PIC tercampur | respons menandai `sumber` per nomor; kontak panen tidak ikut urutan PIC | UP-37 |

Nomor PIC disetujui admin, bukan dibuktikan lewat kode (N11); layar tidak menyebutnya "terverifikasi kode" supaya Pusdalops tidak salah menilai kepastiannya.
