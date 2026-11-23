# KEAMANAN-PRIVASI: Data lanjutan BPBD

Tahap 2 mengumpulkan data pribadi orang yang sedang tertimpa bencana, termasuk anak dan data kesehatan (data spesifik menurut UU 27/2022). Dasar pemrosesan: pelaksanaan tugas penanggulangan bencana oleh BPBD; tujuan dibatasi untuk penanganan, bantuan, dan pemulihan kejadian itu. D18 mengganti D12 induk (korban agregat) hanya untuk tahap 2.

## Data dan tempatnya

| Data | Tempat | Siapa membaca |
| --- | --- | --- |
| Nama orang, HP, NIK, kontak keluarga, ciri, rentan dan sakit | D1 `lj_objek.pribadi` | tim berkas utuh; staf Pusdalops tersamar sampai Tampilkan (tercatat) |
| Umur, L/P, desa, status, tingkat rusak, titik | D1 `lj_objek.data` | tim berkas, staf Pusdalops |
| Foto wajah, foto korban hilang | R2 `lapor/data/<berkas>/wajah/` | tim berkas, staf Pusdalops |
| Foto rumah, prasarana, usaha | R2 `lapor/data/` | tim berkas, staf |
| Rekap angka tanpa identitas | meja `dampak`, meja `pengungsi`, Lifeline, Jitupasna, `lj_beku` | sesuai hak masing-masing |
| Riwayat | `lj_jejak`: `data` utuh, `pribadi` hanya sidik | tim berkas, staf |

## Matriks hak

| Aksi | Ketua | Anggota | Staf Pusdalops | Admin | Akun lembaga kab (Q15) | Akun lembaga prov (Q15) | Staf BNPB lain, warga, `bpbd_klaim` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baca berkas sendiri | ya | ya | ya | ya | kabnya, pribadi tersamar | rekap saja | tidak |
| Baca berkas kab lain | tidak | tidak | ya | ya | tidak | rekap kab di provinsinya | tidak |
| Tambah dan ubah objek | ya | ya | tidak | tidak | tidak | tidak | tidak |
| Batal objek | ya | objek isiannya | tidak | tidak | tidak | tidak | tidak |
| Atur tim | tambah, cabut | tidak | cabut, pindah ketua | cabut, pindah ketua | tidak | tidak | tidak |
| Tutup berkas | ya | tidak | terima | tidak | tidak | tidak | tidak |
| Tampilkan pribadi utuh | ya | ya | ya, tercatat | ya, tercatat | tidak | tidak | tidak |

## Larangan yang diuji

1. Tidak ada data `lj_*` di `public/`, di respons rute tanpa kuki atau sesi, di log Worker, atau di pesan WA ke selain tim berkas.
2. Pesan WA pertanyaan harian, pembuka, dan ringkasan hanya memuat jumlah, tanpa nama, HP, atau NIK.
3. Media hanya lewat kuki atau sesi, `Cache-Control: private, no-store`; tidak pernah token di URL.
4. Tidak ada pencocokan orang (K8, D16); `nik_ganda` hanya untuk objek sejenis dalam satu berkas.
5. Foto wajah di bawah 18 tahun tidak diminta; "menolak difoto" tidak menolak simpan.
6. Anggota yang dicabut langsung kehilangan akses; anggota lain tidak terputus (token per orang, D20).
7. Isian `pribadi` tidak pernah dikirim ke AI; teks bebas lain melewati `samarkan` (D19).
8. `lj_beku` tidak memuat data pribadi; `lj_jejak` menyimpan `pribadi` hanya sebagai sidik (D4, D14).
9. Isian `pribadi` dan foto wajah tidak pernah tersimpan di penyimpanan perangkat; antrean luring memakai saluran `rahasia` `antre.js` untuk keduanya (D21).
10. Tiap buka berkas, Tampilkan, dan unduh media tercatat di `lj_akses` (D22).
11. BPBD yang melapor di luar kab izinnya tidak mendapat berkas (D1).
12. Nomor WA tidak masuk repo; fixture uji memakai nomor rekaan yang tidak bisa dihubungi, tidak pernah nomor pemilik.
13. Token tautan mentah hanya ada di `lj_kabar.teks` sampai gateway mengirimnya; sesudah terkirim teksnya dikosongkan (LJ-11). D1 lain hanya menyimpan sidik.
14. Nama anggota tim (petugas BPBD, bukan warga terdampak) tampil ke staf Pusdalops dan akun lembaga; nomornya tersamar. Koordalops dan staf BNPB lain tidak membuka berkas.
15. Masa simpan (K9, D23): data pribadi dihapus 5 tahun sesudah penutupan berkas diterima staf; sebelum itu tidak ada ekspor massal data pribadi.

## Ancaman

| Ancaman | Penangkal |
| --- | --- |
| Tautan web bocor | token sekali pakai per anggota ditukar kuki HttpOnly, kedaluwarsa (Q11), bisa dicabut; tiap buka tercatat |
| Nomor palsu mengaku BPBD | tahap 2 hanya tingkat `bpbd` terkonfirmasi di kab izinnya (D1) |
| Anggota mengisi ngawur | jejak per pengisi, batal tercatat, penanda |
| Foto dari tempat lain | lencana titik, penanda `foto_jauh` dan `foto_lama` |
| Ponsel bersama atau hilang | data pribadi tidak disimpan di perangkat (D21); kuki bisa dicabut |
| Penipuan bantuan lewat nomor HP pengungsi | nomor hanya untuk tim berkas dan staf, tampil utuh hanya lewat Tampilkan tercatat |
| Data pribadi bocor ke penyedia AI | isian pribadi diurai kode (D19) |
