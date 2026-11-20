# KEAMANAN-PRIVASI: Data lanjutan BPBD

Tahap 2 mengumpulkan data pribadi orang yang sedang tertimpa bencana, termasuk anak dan data kesehatan (data spesifik menurut UU 27/2022). Dasar pemrosesan: pelaksanaan tugas penanggulangan bencana oleh BPBD; tujuan dibatasi untuk penanganan, bantuan, dan pemulihan kejadian itu.

## Data dan tempatnya

| Data | Tempat | Siapa membaca |
| --- | --- | --- |
| Nama, umur, L/P, desa pengungsi dan korban | D1 `lj_objek.data` | tim berkas, staf Pusdalops |
| Nomor HP KK dan kontak keluarga | D1 `lj_objek.data` | tim berkas utuh; staf tersamar sampai Tampilkan (tercatat) |
| NIK (opsional, K4) | D1 `lj_objek.data` | sama dengan nomor HP (Q6) |
| Rentan, disabilitas, sakit, hamil | D1 | tim berkas, staf Pusdalops |
| Foto wajah | R2 `lapor/data/<berkas>/wajah/` | tim berkas, staf Pusdalops |
| Foto rumah dan prasarana | R2 `lapor/data/` | tim berkas, staf |
| Rekap angka tanpa identitas | meja `dampak`, meja `pengungsi`, Lifeline, Jitupasna | sesuai hak meja masing-masing |

## Matriks hak

| Aksi | Ketua | Anggota | Staf Pusdalops | Admin | Warga / `bpbd_klaim` |
| --- | --- | --- | --- | --- | --- |
| Baca berkas sendiri | ya | ya | ya | ya | tidak |
| Baca berkas kab lain | tidak | tidak | ya | ya | tidak |
| Tambah dan ubah objek | ya | ya | tidak | tidak | tidak |
| Batal objek | ya | objek isiannya sendiri | tidak | tidak | tidak |
| Atur tim | ya | tidak | cabut saja | ya | tidak |
| Tutup berkas | ya | tidak | terima | tidak | tidak |
| Tampilkan HP/NIK utuh | ya | ya | ya, tercatat di `lapor_akses` | ya, tercatat | tidak |

## Larangan yang diuji

1. Tidak ada data `lj_*` di `public/`, di respons rute tanpa sesi, di log Worker, atau di pesan WA ke selain tim berkas.
2. Teks WA pertanyaan harian dan ringkasan hanya memuat jumlah, tanpa nama, HP, atau NIK.
3. Media hanya lewat rute bersesi, `Cache-Control: private, no-store`; kunci R2 tidak bisa ditebak (id acak 16 karakter).
4. Tidak ada pencocokan orang (K8, D16); `nik_ganda` hanya dalam satu berkas.
5. Foto wajah anak tidak diminta; pilihan "menolak difoto" tidak menolak simpan (Q10).
6. Anggota yang dicabut langsung kehilangan akses; token web berkas diputar saat ada pencabutan.
7. Nomor WA tidak masuk repo, fixture uji memakai nomor rekaan yang tidak bisa dihubungi (memori: jangan menguji dengan nomor pemilik).
8. Masa simpan: belum diputuskan (Q4); tidak ada penghapusan otomatis dan tidak ada ekspor massal data pribadi sampai pemilik memutuskan.

## Ancaman

| Ancaman | Penangkal |
| --- | --- |
| Tautan web bocor | token per berkas, kedaluwarsa 30 hari dan bisa diputar ketua; tiap buka tercatat |
| Nomor palsu mengaku BPBD | tahap 2 hanya tingkat `bpbd` terkonfirmasi (D1) |
| Anggota mengisi ngawur | jejak per pengisi, batal tercatat, penanda |
| Foto dari tempat lain | lencana titik dan penanda `foto_jauh`, `foto_lama` |
| Penipuan bantuan lewat nomor HP pengungsi | nomor tidak pernah ditampilkan ke luar tim dan staf |
