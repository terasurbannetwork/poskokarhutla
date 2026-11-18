# DESIGN-SYSTEM: Bot WA pembuat laporan

Permukaan utamanya chat WA, jadi "komponen" di sini adalah templat pesan. Deck mengikuti generator dan skill `ppt-konsultan` yang sudah ada; paket ini tidak menambah gaya slide.

## Aturan teks pesan (pemilik 18 Nov 2026: balasan lama "padet banget"; enak dibaca di HP)

Teks akhir tiap jenis pesan, persis seperti yang dilihat pemakai, ada di `CONTOH-PESAN.md`. Kode: `scripts/wa/proyek.mjs` (`susun`, `MENU`), `perintah.mjs`, `daftar.cjs`, `arah.cjs` (`teksTerlewat`), `claude.mjs` (`PESAN`).

- **Format WhatsApp saja.** `*tebal*` untuk baris pertama dan label bagian (`*Catatan:*`, `*Membuat laporan*`); `_miring_` untuk baris kode proyek; perintah ditulis tebal (`*final*`, `*buat saja*`). Tanpa judul Markdown (`#`), tanpa pagar kode.
- **Baris 1 = apa yang terjadi**, tebal, paling banyak sekitar 5 kata: `*Draf v2 siap*`, `*Laporan selesai*`, `*Bahan belum lengkap*`.
- **Baris 2 = kode proyek miring** bila pesan menyangkut proyek: `_P-181126-01, versi 2_` atau `_P-181126-01_` sebelum ada versi. Kode dan versi dipisah koma, tidak pernah dengan titik tengah.
- **Baris pendek, satu gagasan per baris**, baris kosong di antara bagian, paling banyak sekitar 12 baris per pesan (pesan bantuan boleh lebih karena rujukan). Daftar memakai `1.` atau `- `. Angka memakai titik ribuan: 1.284 ha.
- **Bahasa Indonesia sopan dan lugas.** Tanpa gw/lu, "Anda" jarang atau tidak sama sekali, tanpa "silakan" berulang. Tanpa titik tengah, tanpa em dash dan en dash, tanpa emoji.
- **Galat = apa yang terjadi DAN langkah berikutnya**, keduanya dalam satu atau dua baris pendek. Tiap balasan gagal (bangun, simpan, revisi, Claude, galat umum) diakhiri "Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan." (kecuali kuota habis). Satu pesan masuk tidak pernah dijawab dua kali dengan teks yang sama.
- **Ekor perintah dibuang**: perintah satu baris pendek dibaca tanpa ekor bukan huruf atau angka (`lanjut\`, `lanjut.`, `final!`).
- **Keterangan gambar pratinjau dan PDF tetap pendek** (WA hanya menampilkan sedikit baris): PDF dan PPTX cukup judul, kode, nama laporan. Ringkasan draf v1 menempel di gambar pratinjau; ringkasan revisi menempel di PDF (dua kiriman per draf, Q1).
- Angka sistem disertai asalnya: "dari sistem (hari D-1)".
- Satu pesan per kejadian; jangan memecah satu jawaban jadi beberapa pesan (limiter, Q1).
- Kabar galat ke pemilik memakai judul tetap `*Galat bot laporan*`, kode proyek, apa yang gagal, lalu rincian teknis dipotong.

## Menu bernomor (pemilik 18 Nov 2026)

Tiap pesan draf (v1 dan revisi) diakhiri:

```
*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

- Angka `1` sampai `4` saja (boleh berspasi atau bertitik, mis. `2.`) dari pemegang proyek berstatus `draf` dipetakan ke `final`, `pptx`, `versi`, `batal` di `parsePerintah` dan `klasifikasi`. Angka itu perintah: tidak pernah revisi, tidak pernah ke Claude, tidak diteruskan ke Worker (`arah.cjs` `KATA_PROYEK`).
- Di luar draf, angka dijawab petunjuk singkat: ketik `*buat*` dulu.
- `4` bertanya sekali: "Ketik *ya* untuk membatalkan P-...". `ya` dalam 5 menit membatalkan proyek yang ditanyakan (`~/.wa-bot/proyek/konfirmasi.json`). Lewat 5 menit, atau pemegang mengirim pesan lain dulu, tanya itu hangus dan `ya` kembali kalimat biasa. Mengetik `batal` langsung tetap membatalkan tanpa tanya (perilaku lama).
- Pesan lain apa pun dari pengirim itu menghapus tanya batal: pesan yang sampai ke mesin proyek (termasuk `bantuan` dan pesan diteruskan), dan perintah pemilik yang ditangani `perintah.mjs` (`kirim ulang`, `status <tanggal>`; gateway memanggil `proyek.hapusKonfirmasi`).
- Pesan berlabel Diteruskan tidak pernah jadi angka menu atau `ya`: selalu bahan (`arah.cjs`, `klasifikasi`, `tangani`).
- Pemegang beberapa draf: angka berlaku untuk proyek yang menunya terakhir dikirim ke pengirim itu (`~/.wa-bot/proyek/menu.json`). Tanpa catatan itu mesin tidak menebak: balasannya daftar kode draf dan contoh perintah berkode (`final P-181126-02`; juga `pptx`, `versi`, `batal` berkode).

## Templat

| Kode | Kapan | Isi |
| --- | --- | --- |
| T-BAHAN | `buat harian` / `buat penanganan` (K17; penanganan wajib hanya laporan Satgas pemadaman atau laporan penanganan lengkap, tanpa BMKG pagi, 18 Nov 2026; BMKG pagi tetap dibaca dan diteruskan `--bmkg` bila ada dan tetap masuk hash jalur terjadwal; BMKG pagi yang dikirim sendirian tidak membuka proyek, terhitung saat `buat harian`) | `*Kirim bahan laporan*` (atau `*Bahan wajib lengkap*`), kode, nama laporan, baris cut-off bila belum lewat, `*Wajib:*` dari `LAPORAN[].butuh` dan `*Tambahan:*` dari `LAPORAN[].pilihan` dengan label `JENIS_LAPORAN` dan tanda ": sudah ada" (lingkup bahan D12), ajakan kirim lalu *lanjut*. Tidak pernah membangun |
| T-TERIMA | tiap bahan dari pemegang proyek dituntun berstatus `terbuka` atau `bertanya` (K17); kiriman dalam sekitar 20 detik digabung jadi satu pesan, lewat ember balasan limiter | wajib belum lengkap: `*Diterima: <label>* (k dari n wajib)`, kode, `*Masih kurang:*`, ajakan *lanjut*. Wajib lengkap: `*Bahan wajib lengkap*`, "Diterima: ...", `*Opsional, boleh dilewati:*`, "Ketik *lanjut* untuk membuat laporan." Di luar format baku: `*Bahan disimpan*`, "Kiriman lain (bukan format baku) ikut disimpan dan dibaca saat laporan dibuat.", daftar wajib dan tambahan. Proyek tanpa `buat` (bahan sebelum perintah) tidak dibalas |
| T-LANJUT-KOSONG | `lanjut` tanpa proyek terbuka | `*Belum ada proyek terbuka*`, ketik *buat harian* atau *buat penanganan* dulu |
| T-ULANGI | `ulangi` (catatan gagal paling lama 24 jam; proyek asal dibaca ulang dan harus masih menunggu dibangun atau masih draf) | bangun yang gagal dibangun lagi seperti `lanjut`; revisi yang gagal dijalankan lagi dengan kalimat yang sama; galat perintah lain = pesan itu diproses ulang. Tanpa langkah gagal: `*Tidak ada yang perlu diulang*`, "Belum ada langkah yang gagal. Ketik *status* untuk melihat proyek." (`~/.wa-bot/proyek/gagal.json`; pesan `ulangi` yang diteruskan = bahan) |
| T-MASIH-DIBANGUN | `lanjut`, `ulangi`, `buat saja` saat pembangunan pengirim itu masih jalan | `*Masih dibangun*`, kode, "Tunggu sebentar, draf dikirim begitu siap." Sekali per pembangunan, dijawab gateway tanpa antre; tidak membangun kedua kalinya |
| T-KEMAJUAN | awal tiap pembangunan draf atau revisi | tanpa pesan: hanya presence "sedang mengetik" sampai berkas draf terkirim (pemilik 18 Nov 2026: "Hapus, cukup mengetik"; suntingan Baileys tampil "Waiting for this message") |
| T-SAPA | pesan pribadi nomor terdaftar yang bukan perintah, tidak diteruskan, tanpa lampiran, satu baris paling banyak 80 huruf, tidak dikenali sebagai bahan, dan pengirim tidak memegang proyek terbuka, bertanya, membangun, atau draf dan tidak sedang dibangun; sekali per pengirim per 6 jam (`~/.wa-bot/proyek/sapa.json`) | `*Halo, ini Bot Laporan BNPB*`, satu kalimat fungsi bot, `*Mulai dengan mengetik:*` (*buat harian*, *buat penanganan*), `*Butuh bantuan?*` (*bantuan*, *panduan*). Tidak menempel ke proyek; bahan tetap lewat jalur biasa |
| T-BUKA + T-DRAF v1 | draf v1 jadi sesudah `lanjut` atau `buat saja` (keterangan gambar pratinjau slide 1) | `*Draf v1 siap*`, kode, nama laporan, bahan per jenis, kalimat angka sistem (penanganan), `*Catatan:*` (bahan wajib yang kurang dan cut-off dicatat di sini, tidak ditanyakan), `*Pemeriksaan:*`, menu bernomor |
| T-TANYA | sesudah `lanjut`, bila ada bentrok angka atau bahan tak terbaca (A3) | `*Bahan perlu dipastikan*`, kode, pertanyaan bernomor, "Kirim jawabannya, atau ketik *lanjut* untuk membuat dengan bahan yang ada." `lanjut` berikutnya membangun dan mencatat sisanya |
| T-SATELIT (baris) | daftar bahan penanganan (K18) | "Data satelit: lintasan siang masuk FIRMS 13.42 WIB, situs sudah/belum memuat." dari `segar_situs.py --status --tanggal D` (`dep.statusSatelit` bila disuntik); status tak terbaca = "Data satelit: status belum terbaca.", tidak pernah menahan |
| T-PILIH-SATELIT | sebelum membangun penanganan, FIRMS sudah memuat lintasan siang tetapi situs belum (K18) | `*Situs belum memuat data satelit*`, kode, baris satelit, pilihan `*tunggu*` dan `*hitung*`. Kedua kata itu perintah hanya selama pilihan ini menunggu (`~/.wa-bot/proyek/satelit.json`), tidak untuk pesan diteruskan |
| T-TUNGGU-SITUS | `tunggu` | `*Menunggu situs*`, kode, dibangun otomatis (detak 10 menit gateway, `ulangSatelit`), ajakan *hitung*. `hitung` membangun dengan `--firespot firms` dan catatan draf "Firespot dihitung langsung dari FIRMS dengan rumus situs." Label cut-off 18.00 tidak berubah |
| T-SATELIT-ULANG | 3 status satelit kosong berturut-turut atau 3 jam menunggu, sekali per *tunggu* | `*Situs masih belum memuat*`, kode, baris satelit, pilih lagi *hitung* atau *tunggu* |
| T-SATELIT-KOSONG | *hitung* / *tunggu* tanpa pilihan hidup (lebih 24 jam, proyek tidak lagi menunggu, atau sudah dibangun, dibatalkan, final, kedaluwarsa) | `*Tidak ada pilihan menunggu*`, satu baris petunjuk; tidak membuka proyek dan tidak membangun |

Pesan diteruskan yang isinya persis angka menu, *lanjut*, *buat saja*, *hitung*, atau *tunggu* selalu bahan. Tanda terima menyebut bahan bertanggal lain: "Diterima, tetapi bertanggal 25 Okt, tidak dipakai untuk laporan 26 Okt: BMKG pagi." (judul `*Bahan bertanggal lain*` bila hanya itu).
| T-PRATINJAU | gambar slide revisi | `*Pratinjau slide N*`, kode, satu baris |
| T-PDF | PDF draf v1 | `*PDF draf vN*`, kode, nama laporan |
| T-DRAF revisi | PDF revisi terkirim | `*Draf vN siap*`, kode, nama laporan, `*Perubahan:*`, `*Tidak diubah:*`, `*Dilewati:*`, `*Catatan:*`, `*Pemeriksaan:*`, menu bernomor |
| T-TOLAK-KUNCI | operasi menyentuh angka terkunci | `*Revisi tidak diterapkan*`, kode, "Draf tetap vN.", nama angka, nilai, asal, tawaran catatan dengan contoh |
| T-VERSI | `versi` atau `3` | `*Riwayat versi*`, kode, daftar `- vN tanggal jam, instruksi`, cara `*balik v1*` |
| T-BATAL-TANYA | `4` | `*Batalkan proyek ini?*`, kode, "Ketik *ya* untuk membatalkan P-..., tanpa unggah.", berlaku 5 menit |
| T-FINAL | closing selesai | `*Laporan selesai*`, kode, versi final, tautan folder Drive di baris sendiri, `*Riwayat versi:*`, proyek ditutup |
| T-STATUS | `status` | `*Proyek terbuka*`, per proyek: kode, nama laporan, `Status: ...`, langkah berikutnya |
| T-BANTUAN | `bantuan` | `*Cara pakai bot laporan*`, bagian `*Membuat laporan*`, `*Saat draf*`, `*Lainnya*` (perintah tebal + 2 sampai 5 kata), satu baris contoh; `*Khusus pemilik*` hanya untuk pemilik |
| T-DAFTAR | nomor asing, paling banyak sekali sehari per nomor (30 nomor per hari) | `*Nomor belum terdaftar*` lalu "Bot ini hanya bisa dipakai nomor yang terdaftar."; tanpa cara mendaftar (K19) |
| T-TERLEWAT | mesin menyala, nomor itu sempat mengirim pesan saat mati (sekali per nomor) | `*Pesan belum diproses*`, jam mati sampai menyala, "Kirim ulang bila masih perlu." |
| T-ATURAN | usulan aturan tetap ke pemilik | pola, 3 contoh, `setuju` atau `tolak` (belum dibangun) |
| T-KUOTA | batas belanja | `*Kuota hari ini habis*`, kode, lanjut besok |

## Hitungan kiriman per hari (limiter, Q1)

Balasan dalam percakapan memakai ember terpisah 40 kiriman per tujuan per hari (`WA_MAX_PER_TARGET_PERCAKAPAN`). Satu draf 2 kiriman: pratinjau dan PDF (tanpa pesan kemajuan sejak 18 Nov 2026). Balasan percakapan berjeda 2-4 detik dan paling banyak 10 per menit; kiriman lain 15-20 detik dan 3 per menit. Berkas draf yang ditolak batas per menit atau antrean diulang sesudah jendela menit, paling banyak 3 kali (`arah.kirimUlangMenit`). Hari biasa satu pengirim: daftar bahan 1, tanda terima sekitar 3, draf v1 2, dua revisi 4, final 3 (PPTX, PDF, T-FINAL) = 13, masih di bawah 40. "Sedang mengetik" adalah presence, tidak dihitung limiter, dan berhenti bila soket tertutup.

## Tampilan di tab Pelaporan (`/pelaporan`, `#p-pelaporan` di `public/index.html`, arsip di `public/arsip_laporan.js`)

Daftar proyek bot memakai kartu standar `.ex.ex-std` (AGENTS 3.5): kepala kartu "Proyek bot laporan", tabel dengan kolom Kode, Jenis, Tanggal, Pemegang (nama dari akun, bukan nomor), Versi, Status, Drive. Status memakai pil bawaan layar itu. Tanpa kalimat kesimpulan di kepala kartu. Baris "Mesin bot" menampilkan detak terakhir. Layar milik `layar-peta`; ditinjau di `http://localhost:8800/pelaporan`.
