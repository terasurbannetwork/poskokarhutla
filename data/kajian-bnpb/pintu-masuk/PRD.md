# PRD: Satu Pintu Masuk

Otoritas: `KEPUTUSAN-MASUK.md` menang atas dokumen ini.

## Tujuan

Siapa pun yang punya nomor WhatsApp bisa masuk dalam satu menit, tanpa menunggu admin untuk hal yang bisa dibuktikan sistem, dan langsung tiba di ruang kerjanya.

## Ukuran berhasil

| Ukuran | Sekarang (15 Nov 2026) | Sasaran 30 hari sesudah tayang |
| --- | --- | --- |
| Akun instansi aktif | 0 | 100 dari 514 kab/kota punya paling sedikit satu akun (aktivasi pertama tetap lewat verifikasi yang ada) |
| Waktu dari buka `/masuk` sampai tiba di ruang kerja | tidak terukur (butuh admin) | median di bawah 60 detik untuk nomor yang dikenal |
| Anggota yang aktif tanpa menunggu admin | 0 persen | paling sedikit 60 persen dari anggota kedua dan seterusnya |
| Permintaan "lupa sandi" ke admin | semua lewat admin | nol untuk akun non-staf; staf tetap lewat Super Admin |
| Utas alun-alun dari orang yang masuk | 0 | terukur (angka dasar pertama) |

Sasaran angka adalah usulan agent, bukan janji pemilik; diganti bila pemilik menetapkan lain.

## Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Warga | Menulis di alun-alun dan melihat kirimannya sendiri tanpa membuat sandi |
| Relawan | Masuk ke `/relawan/saya` tanpa mencari tautan kode lama |
| Petugas BPBD, pemda, TNI, Polri | Punya akun hari itu juga dan mengundang timnya sendiri |
| Staf BNPB | Masuk dari pintu yang sama; tetap dijaga sandi sesudah kode |
| Koordinator kampus | Masuk tanpa menunggu tautan atur sandi |
| Admin pusat | Melihat kabupaten mana yang belum punya akun dan mengundangnya |

## Fitur

| No | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Halaman `/masuk`: isi nomor WA, terima kode enam angka, masuk | D1, D9 |
| F-2 | Kode yang sah menerbitkan sesi lama tiap akun peran yang nomornya cocok | D2, D4 |
| F-3 | Pemilih ruang bila satu nomor punya lebih dari satu akun peran | D2 |
| F-4 | Akun umum untuk nomor yang belum dikenal: nama, provinsi, kabupaten atau kota | D5 |
| F-5 | Menjadi anggota akun lembaga yang sudah aktif: aktif otomatis lewat kontak, undangan, atau email yang domainnya dipetakan admin | D6, D15, D16 |
| F-6 | Undangan berantai: anggota aktif mengundang nomor lain ke akun lembaganya | D7 |
| F-7 | Staf wajib sandi sesudah kode; akun rahasia tidak lewat pintu ini | D8 |
| F-8 | Atur sandi baru sesudah masuk dengan kode, untuk akun non-staf | D11 |
| F-9 | Cadangan kode lewat email saat gerbang WA mati | D10 |
| F-10 | Halaman publik dibuka: `/masuk` dan `/alun-alun` | K8 |
| F-11 | Papan aktivasi 514 kab/kota di ruang admin: akun aktif, terakhir masuk, tombol undang | D12, K6 |
| F-12 | Tautan "Masuk" di semua pintu lama mengarah ke `/masuk`; form lama tetap ada sebagai "Masuk dengan sandi" | D3 |
| F-14 | Pemirsa masuk lewat kode; nomornya diisi Super Admin | K12, D17 |
| F-13 | Alun-alun mengenali akun yang masuk: nama dan label lembaga terisi, kiriman tercatat ke akun | D5 |

## Larangan

- Tidak membaca WA masuk dan tidak membalas pesan orang (K7).
- Tidak menggabung atau mengubah tabel akun produksi (D2); tidak membuat baris `staf` atau `instansi_akun`.
- Tidak menerima akhiran email umum (`.go.id`, `.ac.id`) sebagai bukti lembaga.
- Tidak mencocokkan orang dari nama (D4).
- Tidak menyimpan kode dalam bentuk terbaca; tidak menulis kode ke log.
- Tidak memberi tahu apakah sebuah nomor terdaftar atau tidak sebelum kodenya terbukti.
- Tidak ada data contoh dan tidak ada tombol isi atau hapus contoh (aturan pemilik 11 Nov 2026).
- Tidak menutup pintu lama sebelum pemilik memutuskan.
- Tidak membangun integrasi alun-alun ke kejadian, antrean BPBD, atau rekap Kepala di paket ini (D14).

## Di luar lingkup

Masuk lewat penyedia lain, passkey, aplikasi seluler, router WA masuk, penggabungan tabel akun, perubahan peran dan hak yang sudah ada.

## Ketergantungan

| Butuh | Status | Akibat bila belum ada |
| --- | --- | --- |
| Gerbang WA hidup di Mac mini dan rahasia `WA_KUNCI` | sudah dipakai modul lapangan | `/masuk` menawarkan email, atau menampilkan "kode belum bisa dikirim" |
| Rahasia `TURNSTILE_SECRET` | belum bisa dipastikan dari repo | rute minta kode menolak (503) |
| Rahasia baru `MASUK_KUNCI` (HMAC kode) | belum ada | `/masuk` 503; pintu lama jalan |
| Migrasi `mk_*` diterapkan pemilik | belum ada | `/masuk` 503; pintu lama jalan |
| Akun instansi daerah sudah aktif | 0 akun | tidak ada akun yang bisa dimasuki anggota; verifikasi pertama harus jalan dulu |
| Domain pengirim email terverifikasi | belum | F-9 mati |
| `kontak_pemangku` terisi | 0 baris | jalur aktif otomatis lewat kontak belum berguna |
