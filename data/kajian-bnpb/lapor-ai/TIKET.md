# TIKET: Lapor Bencana BNPB

Ambil tiket berurutan; kerjakan hanya cakupannya. Tiap tiket ditutup dengan bukti di `RENCANA-UJI.md`.

| Tiket | Isi | Pengerja | Pemeriksa | Tergantung |
| --- | --- | --- | --- | --- |
| LA-00 | Agent `lapor-ai` di roster, ilmu awal, baris AGENTS 2.30 sudah ada | sesi induk | `penulis-gerbang` | paket diperiksa |
| LA-01 | `scripts/lapor/spek.py` dan `src/lapor_spek.generated.js` dari Lampiran I dan III; pertanyaan templat tiap isian | `lapor-ai` | `selera-angka` | LA-00 |
| LA-02 | `src/lapor_mesin.js` murni: identitas (A7), perintah, validasi kutipan, gabung, isian berikutnya (A2), balasan templat, transisi tiket (A8), perintah `ulang`, `hapus data`, `update LA-...`, penguraian tanggal, pencocokan nama desa ke `desa_cari.json`; uji bagian 1 | `warga-api` | pemeriksa bersih | LA-01 |
| LA-03 | `src/lapor_model.js`; `scripts/wa/claude.mjs` mengimpor `src/samarkan.js` dan salinannya dihapus (uji bot laporan tetap hijau); uji emas rekaman (bagian 2) | `warga-api` | `security-reviewer` | LA-02 |
| LA-04 | Migrasi 0155, `src/lapor_ai.js` rute pesan, sesi, izin, kirim (batch), batas laju; uji rute | `warga-api` | `migrasi-idempoten`, `guard-api` | LA-02 |
| LA-05 | Pisah `periksaFotoLokasi` dari `src/foto.js`; rute foto lapor (web, tautan, WA) dengan lencana D16; R2 `lapor/` | `warga-api` | `security-reviewer` | LA-04 |
| LA-06 | Gateway: arah nomor izin lapor, teruskan teks, lokasi, foto WA; perintah PEMILIK `lapor izin`/`lapor cabut`; kirim kabar status | `wa-bot` | pemeriksa bersih | LA-04 |
| LA-07 | Halaman `/lapor` chat web mobile dan layar lebar, panel isian, lokasi, foto, ringkasan, kirim | `layar-peta` | `inp-reviewer`, `selera-angka` | LA-04, LA-05 |
| LA-08 | Halaman `/lapor/foto` kamera bertoken | `layar-peta` | `security-reviewer` | LA-05 |
| LA-09 | Halaman laporan `/lapor/l/<nomor>` dan tampilan cetak; `scripts/wa/lapor_pdf.mjs` antrean PDF dan kirim ke WA | `layar-peta`, `wa-bot` | `selera-angka` | LA-04, LA-06 |
| LA-10 | `/lapor/meja`: tab Peta, Daftar, Foto, rincian, ubah status, konfirmasi BPBD; rute monitoring | `layar-peta`, `warga-api` | `inp-reviewer`, `guard-api` | LA-04, LA-05 |
| LA-11 | Uji emas dengan model nyata; uji lapangan F0 dibuka untuk pengguna uji pertama (pemilik mengetik `lapor izin`) | sesi induk | `validasi-model` | LA-01..LA-10 |
| LA-12 | (F1) sumber `lapor_ai` di `pasang.py`; dorong laporan `bpbd` ke meja `dampak` | `siklus`, `warga-api` | pemeriksa bersih | Q3, Q5 |
| LA-13 | (F1) minta verifikasi dua arah | `warga-api`, `layar-peta` | `security-reviewer` | Q5, Q8 |

Prasyarat dari pemilik sebelum LA-11: terapkan migrasi 0155 ke produksi, pasang secret `ANTHROPIC_API_KEY` di Worker (Q2), kirim `lapor izin <nomor uji>` dari WA.

## Sudah dibangun di server lokal (19 Nov 2026, belum Worker dan D1)

Mesin percakapan (`src/lapor_mesin.js`), spek isian berdefinisi juklak (`src/lapor_spek.js`), wilayah dari GPS dan pencarian (`src/lapor_wilayah.js`), model Claude (`src/lapor_model.js`), server lokal di tinjau 8800 (`scripts/lapor/lokal.mjs`), PDF dan Word gaya Koordalops (`scripts/lapor/dokumen.py`), layar `/lapor` (beranda, laporan, bantuan, chat berkartu, info daerah, prediksi, nomor penting, privasi), halaman lacak (`/lapor/lacak.html`), maskot (`public/lapor/maskot.js`).

## Antrean dari masukan pemilik 19 Nov 2026 (belum dikerjakan)

| Tiket | Isi |
| --- | --- |
| LA-14 | Baca Kajian Penentuan Kejadian Bencana dan Lampirannya (K25), samakan spek isian, kelas mayor dan minor, dan bentuk laporan jadi dengannya |
| LA-15 | Layar monitoring petugas `/lapor/meja`: daftar, peta, foto, balas, status tiket, hubungi pelapor (rute lokal sudah ada) |
| LA-16 | Lampiran dokumen dan foto kapan saja di chat; menu titik tiga (cari percakapan, lihat lampiran, unduh transkrip) |
| LA-17 | Alun-alun warga (K30), menunggu Q14 |
| LA-18 | Pencarian nama jalan (K29), menunggu Q15 |
| LA-19 | Mode Tanya bebas dengan jawaban bersumber (pola ChatHPT), Riwayat, Jelajah, Tentang |
| LA-20 | Pintu WA: sambungkan gateway ke mesin yang sama (LA-06), teks bernomor, foto dan lokasi WA |
| LA-21 | Damkar per daerah: belum ada datanya di repo; sementara 113 |

### Pelaksanaan K55 (19 Nov 2026)

| Tiket | Isi | Pengerja | Status |
| --- | --- | --- | --- |
| LA-24a | `src/lapor_gugus.js` murni + uji, gugus di jawaban meja lokal (D71) | sesi induk | selesai lokal; rute Worker menyusul di LA-24 |
| LA-25a | Chip gugus, saring Bergugus, kartu gugus rincian (D71) | sesi induk | selesai lokal; Buku Besar tetap LA-25 (F1) |
| LA-49a | Kartu Teruskan ke BPBD di rincian, kirim WA oleh staf, tandai diteruskan (D72) | sesi induk | selesai lokal; otomatis tetap LA-49 (F1) |
| LA-56 | Batas waktu respons per status: warna lewat batas dan hitungan di Antrean kerja | `layar-peta` | menunggu Q40 |
