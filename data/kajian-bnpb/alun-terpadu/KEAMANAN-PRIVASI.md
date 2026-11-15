# KEAMANAN-PRIVASI: Alun-alun Terpadu

Forum publik yang kini terhubung ke kejadian resmi, kotak masuk lembaga, dan layar pimpinan. Risiko utamanya: kiriman tak terverifikasi dianggap fakta, lembaga dipalsukan, dan data orang terbawa ke rekap.

## 1. Matriks hak

| Tindakan | Tamu | Akun umum | Anggota atau pemilik satu akun instansi wilayah | Akun instansi (sesi `/instansi`) | Moderator | Staf Siklus | Pimpinan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Menulis dan membalas | ya | ya | ya | lewat kotak masuk | ya | - | - |
| Membalas sebagai lembaga | tidak | tidak | ya, utas dalam wilayah | ya, utas dalam wilayah | sebagai Petugas | - | - |
| Mengubah status bantuan | tidak | tidak | tidak (lewat kotak masuk) | ya, pemprov, pemkab, pemkot | ya | - | - |
| Melihat kotak masuk wilayah | tidak | tidak | lewat `/instansi` | ya | semua lewat `/admin/alun` | - | - |
| Melihat tanda kejadian yang belum dipublikasikan | tidak | tidak | tidak | tidak | ya | ya | - |
| Melihat "Belum ada di Buku Besar" | tidak | tidak | tidak | tidak | ya | ya | - |
| Melihat rekap | tidak | tidak | tidak | tidak | ya | ya | ya, angka agregat |
| Menarik rekap lewat kunci API | tidak, menunggu Q2 | | | | | | |

## 2. Ancaman dan penangkal

| Ancaman | Penangkal | Sisa risiko |
| --- | --- | --- |
| Kiriman palsu melahirkan atau mengubah kejadian resmi | sumber `alun` tidak pernah membuat kejadian, tidak mengubah fase, tidak menaikkan keyakinan (D3); diuji | kiriman palsu bisa menempel ke kejadian nyata dan tampil di "Kabar warga" staf sampai dimoderasi |
| Kabar bohong tampil berlabel resmi | tanda kejadian hanya berbunyi "Terkait kejadian", bukan pembenaran isi; label lembaga hanya untuk balasan lembaga, tidak pernah untuk utas warga | pembaca bisa menganggap tautan sebagai pengesahan; teks keterangan di rincian menjelaskan |
| Memalsukan lembaga | label dihitung server dari akun instansi aktif; klien tidak bisa mengirim label; nama tampil yang meniru instansi tetap ditolak (`src/alun.js:33`) | akun instansi yang diambil alih bisa menjawab sebagai lembaga; dibatasi wilayah dan tercatat di riwayat |
| Akun instansi menjawab di luar wilayahnya | lingkup dicek di server di tiap rute, di SQL untuk daftar | utas tanpa kabupaten hanya terlihat akun provinsi |
| Menutup kebutuhan yang belum selesai | hanya pemprov, pemkab, pemkot; selesai wajib catatan; riwayat append-only; moderator dan lembaga bisa membuka lagi | lembaga bisa menandai selesai secara keliru; terlihat di riwayat publik |
| Membanjiri BPBD dengan pemberitahuan | Turnstile dan batas laju tulis yang ada; satu pemberitahuan per utas; 20 per akun per jam lalu digabung; batas 40 penerima per kunci | serangan tersebar masih bisa mengisi kotak masuk; moderasi dan aduan |
| Isi utas bocor lewat pemberitahuan | pemberitahuan hanya memuat judul dan wilayah (judul memang publik) | - |
| Data orang masuk rekap | berkas rekap tanpa `mk_id`, nama, nomor, isi utas; hanya hitungan dan judul publik; diuji | judul bisa memuat data pribadi yang ditulis warga; pembersih teks dan aduan `data_pribadi` yang ada |
| Rekap dipakai menilai orang | hitungan per wilayah dan lembaga, tidak per orang (KETERPADUAN K9); tanpa peringkat | pimpinan bisa membaca tabel kabupaten sebagai peringkat; kepala kartu netral dan tanpa kalimat penilaian |
| Rekap bocor ke publik | berkas di R2 privat, disajikan rute berhak; tidak ada salinan di `public/data` sampai Q1 dijawab | - |
| Lokasi warga | koordinat sudah dibulatkan sekitar 1 km dan tidak ditambah presisinya; rekap tidak memuat koordinat | - |
| Rute ingest disalahgunakan | hanya `PIPA_TOKEN`, sama dengan sumber lain; baris rekap tanpa isi dan penulis | bocornya token membuka judul dan status utas yang memang publik |
| Kuota D1 dihabiskan | kotak masuk berindeks dan berhalaman; rekap di pipeline; tanda kejadian di dalam cache | - |
| Pemalsuan permintaan lintas situs | penjaga modul instansi untuk rute `/api/instansi/alun*`; `x-pb` dan Origin untuk balasan lembaga dari halaman publik | - |
| Aduan massal membungkam balasan lembaga | balasan lembaga diperlakukan seperti balasan petugas | lembaga yang salah tidak bisa dibungkam warga; moderator bisa |

## 3. Data pribadi

| Data | Disimpan di | Guna | Disimpan sampai |
| --- | --- | --- | --- |
| Riwayat status | `alun_riwayat` (lembaga, akun, waktu, catatan) | pertanggungjawaban penanganan | selama utas ada |
| Tautan kejadian | `sk_kejadian_sumber` (id utas, id kejadian) | keterpaduan | mengikuti Buku Besar |
| Rekap | R2 `alun/rekap/` | layar pimpinan | ditimpa tiap jadwal; arsip tidak dibuat |
| Pemberitahuan | `kabar_terkirim` yang ada | penghapus ganda | mengikuti aturan kabar |

Catatan penanganan ("selesai") ditulis lembaga dan tampil publik; isinya lewat pembersih teks yang sama dengan balasan (tanpa tautan dan nomor).

## 4. Yang tidak boleh ada

- Nama penulis, nomor, `mk_id`, atau isi utas di berkas rekap, pemberitahuan, dan dasbor.
- Kata "aman" di teks yang dihasilkan sistem.
- Rekap atau daftar "Belum ada di Buku Besar" di `public/data` atau rute tanpa hak.
- Tombol atau rute yang menjadikan utas sebagai kejadian.
- Data contoh.

## 5. Keterkaitan dengan keputusan lain

- KEPUTUSAN-KETERPADUAN K2 (tanpa pintu WA masuk), K9 (jejak per orang).
- KEPUTUSAN-MASUK D22 (nama publik hanya dari isian form) dan D4 (hak mengikuti nomor yang terbukti).
- KEPUTUSAN-CEK-KABAR Q3 (laporan warga belum menjadi sumber cek kabar).
- OUTSTANDING F: feed publik, hub tukar data, daftar warga rentan tidak dibangun.
- Juklak J4: identitas pelapor pengaduan tidak disentuh; pengaduan bukan alun-alun.

## 6. Pemeriksa wajib sebelum tayang

`guard-api` dan `security-reviewer` untuk rute; `migrasi-idempoten` untuk migrasi; `validasi-model` tidak perlu (tidak ada model); `inp-reviewer` dan `selera-angka` untuk layar. Pemeriksa tidak pernah pengerja yang sama (AGENTS 3.2).
