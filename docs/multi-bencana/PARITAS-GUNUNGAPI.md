# Paritas karhutla vs gunung api: audit akhir 19 Okt 2026 malam

Rincian 113 baris, tiap baris dengan bukti `berkas:baris` atau jalur data: [bencana/gunungapi.md](bencana/gunungapi.md). Registry `status: "aktif"`.
Metode: kode dibuka satu per satu terhadap `PAKET-FITUR.md`; data live `https://centurisk97.terasurbannetwork.workers.dev` (hanya GET:
`/api/status`, `/api/gunungapi/terbaru`, `/banjir/data/{gunungapi_status,kejadian_gunungapi_*,abu_*,dampak_gunungapi,berita_gunungapi}.json`,
`/gunungapi/data/paparan.json`, halaman `/gunungapi/...`); gerbang dijalankan (`uji:agen` 57/57, enam berkas `tests/warga` terkait 79 tes, `uji` semua skrip
`scripts/gunungapi`, `uji_setara.mjs`, `uji_lahar.mjs`). Paritas diukur terhadap karhutla yang TAMPIL.

## Hasil

| Audit | ADA | SEBAGIAN | BELUM | TIDAK BERLAKU |
| --- | --- | --- | --- | --- |
| 19 Okt pagi | 44 | 29 | 28 | 12 |
| **19 Okt malam** | **67** | **26** | **13** | **7** |

ADA = 52 dibuat + 15 diadaptasi. Dari 13 BELUM, 7 tersembunyi di karhutla (A21-A24 posko/operasi/aset/keputusan, A30, C19, C21); 6 tidak:
A15 risiko riwayat 0-100, A34 video, A36 kurasi tangan, B03 prospektif, B06 tren jangka panjang, C16 cerita. Butir 7 `gerbang-bencana` melarang `aktif` dengan
baris "belum"; keenamnya perlu keputusan pemilik (kerjakan, atau nyatakan tidak berlaku dengan alasan).

## Yang bertambah sejak audit pagi

Kejadian V (`kejadian.py`, 27 kejadian) + tab Kejadian + `/gunungapi/k/V0001` (A04, C15); MAGMA tiap 30 menit di Worker -> D1 -> `/api/gunungapi/terbaru` (A03, D03);
pil 'skenario' untuk semua keluaran abu; kontak resmi PVMBG dari teks rekomendasi (A40); peluang abu 18+51 anggota (A10, B08); paparan KRB/desa/sekolah/faskes/tambang/evakuasi
30 gunung (A28, A29); lapisan konteks (C38); foto dummy 14 (C25); jenis Lapor Warga `abu`, `lahar`, `gemuruh` + migrasi 0020 (D05); i18n EN 213 entri (C29); `gerbang-inti`.

## Lima celah terbesar

1. **Pekerjaan tanpa jadwal** (A29, A32, A38, B07, E01): `paparan.py` dan `citra.py` tidak ada di workflow mana pun; `paparan.json` baru 30 dari 69 gunung dan citra hanya 5 gunung. Gunung yang naik ke Level II tidak otomatis mendapat zona/evakuasi. `uji_setara.mjs`, `uji_lahar.mjs`, `uji_abu.py`, `abu.py uji`, `laporan.py uji` tidak dijalankan CI.
2. **Bukti model lemah dan tanpa prospektif** (B02, B03, A15, A18, B06): arah abu berambang cocok 25% dari 4 kejadian VONA (p = 0,68); sebaran mentah 72% dari 29. Tidak ada catatan prospektif, indeks risiko riwayat, katalog letusan historis, atau uji tren.
3. **Peringatan belum tersambung**: `gunungapi_ubah` (kenaikan level) belum dibaca `src/ews.js` (komentar 'nanti', `src/gunungapi.js:73`); halaman Peringatan Dini tak memuat gunung api. Kontak PVMBG hanya 2 dari 27 gunung Level II ke atas (A40), pos pengamatan tidak terstruktur.
4. **Respons dan keputusan** (A21-A24, A30, C19, C21): kode belum ada; dampak (C20, A27) tanpa rupiah dan lahan pertanian, sekolah/faskes hanya untuk 30 gunung.
5. **Warga, terjemahan, pratinjau** (C24, D05, C29, C28, A33, F04): tab Informasi tidak ada dan migrasi 0020 produksi belum terverifikasi; judul dialog dan kartu baru bocor Indonesia di EN; og:image `/gunungapi/k/V0001` = gambar karhutla; sentimen/EN/video berita; Tentang tak menyebut MAGMA/PVMBG.

## Rusak atau basi yang ditemukan

| Temuan | Letak |
| --- | --- |
| Docstring 'SEMUA gunung (69)'; berkas hanya 30 gunung | `scripts/gunungapi/paparan.py:3`, `public/gunungapi/data/paparan.json` |
| Komentar menyebut `statis.yml` sebagai tempat `paparan.py`/`citra.py`; `statis.yml` tidak memuatnya | `.github/workflows/lintas.yml:85-86` |
| Docstring 'Tidak ada workflow gunung api khusus', keluaran `public/gunungapi/data/berita.json`; nyatanya `public/banjir/data/berita_gunungapi.json` lewat `lintas.yml:117` | `scripts/gunungapi/berita.py:3-5` |
| Data live `gunungapi_status.json` belum membawa `kontak` (0 dari 69) padahal parser dan layar sudah ada; data lokal baru 2 | live vs `scripts/gunungapi/magma.py:93` |
| `/api/status` mengawasi berkas CI, bukan `umur_menit` D1: cron MAGMA mati tak membuat status basi; kolom `diubah` semua sama (12.07Z, putaran pertama) | registry `sumber_status`, `src/gunungapi.js:38` |
| Langkah CI 'Periksa kesegaran' memakai worker yatim (balasan 404) kecuali `vars.URL_STATUS` diisi | `lintas.yml:189` dan empat workflow lain |
| Registry `pengerja: "gunungapi"`, agen sebenarnya `gunungapi-kering` | `public/bencana.json` |
| README: 'perlu cadangan GDACS' padahal GDACS/GVP ditolak (`magma.py:1-15`) | `docs/multi-bencana/README.md:56` |
| Hasil crawl i18n tersimpan 15 Okt | `scripts/i18n/laporan.json` |

## Yang sengaja tidak ditutup

Tanpa kalender musim, ENSO, iklim, kondisi latar, indeks riset tambahan (TB). Level resmi PVMBG dipakai apa adanya (tidak ada tingkat buatan). Abu dan lahar adalah skenario
'jika meletus sekarang', bukan prakiraan letusan, dan tidak menggantikan VONA/VAAC. Sentimen berita tidak ditampilkan sampai ada label uji manusia.
