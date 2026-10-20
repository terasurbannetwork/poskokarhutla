# Paritas karhutla vs gempa: audit akhir 19 Okt 2026 malam

Rincian 113 baris, tiap baris dengan bukti `berkas:baris` atau jalur data: [bencana/gempa.md](bencana/gempa.md). Registry `status: "aktif"`.
Metode: kode dibuka satu per satu terhadap `PAKET-FITUR.md`; data live `https://centurisk97.terasurbannetwork.workers.dev` (hanya GET:
`/api/status`, `/api/gempa/terbaru|kejadian|status`, `/gempa/data/*.json`, `/banjir/data/*gempa*.json`, halaman `/gempa/...`); gerbang dijalankan
(`uji:agen` 57/57, enam berkas `tests/warga` terkait 79 tes, 11 `scripts/gempa/*.py uji`). Paritas diukur terhadap karhutla yang TAMPIL.

## Hasil

| Audit | ADA | SEBAGIAN | BELUM | TIDAK BERLAKU |
| --- | --- | --- | --- | --- |
| 19 Okt pagi | 50 | 27 | 23 | 13 |
| **19 Okt malam** | **69** | **25** | **10** | **9** |

ADA = 57 dibuat + 12 diadaptasi. Dari 10 BELUM, 6 tersembunyi di karhutla (posko A21, operasi A22, keputusan A24, ringkasan A30 dan C21, paket C19);
4 tidak tersembunyi di karhutla: A32 citra sebelum/sesudah, A34 video, A35 bandara/NOTAM, C16 cerita. Butir 7 `gerbang-bencana` melarang `aktif`
dengan baris "belum"; keempat baris itu perlu keputusan pemilik (kerjakan, atau nyatakan tidak berlaku dengan alasan).

## Yang bertambah sejak audit pagi

Tab Kejadian + laci + `/gempa/k/G0016` + isoseismal MMI (`kejadian.js`, C15); risiko 0-100 di Tren dan laci (A15); galeri 'Gempa merusak' bersumber
8 kasus (B04, A36); peluang susulan di laci dan pop-up (B01, B08); foto dummy 14 berlisensi (C25); lapisan konteks penduduk/sekolah/fasilitas/jalan (C38); jenis
Lapor Warga `guncang`, `rusak_gedung`, `tsunami_tanda` dan migrasi 0020 (D05); kontak BPBD di laci (tersembunyi, A40); i18n EN 213 entri (C29); `gerbang-inti` memblokir.

## Lima celah terbesar

1. **Kejadian tidak menghimpun susulan M<5** (A04, A05): `kelompokkan` hanya menautkan M>=5 (`src/gempa.js:157`). Live 13 kejadian semuanya berjumlah 1; kolom Susulan selalu 0 dan 'n susulan tercatat' di laci tidak pernah terisi.
2. **Tingkat Pantau Bencana dan uji balik aturan belum ada** (A13, A14, B02): hanya status resmi BMKG. Model guncangan `belum_diuji` (arsip Dirasakan belum terkumpul); susulan M5 BSS 0,002, setara pembanding.
3. **Respons dan keputusan** (A21-A24, A30, C19, C21, A40): kode belum ada; data BPBD lama (±2016) dan tampil tersembunyi. Prospektif guncangan 0 entri.
4. **Warga di layar** (C24, D05, C25, D09): tab Informasi tidak ada, migrasi 0020 produksi belum terverifikasi, lapis Foto di peta belum, foto dummy belum diisi di produksi (`/api/foto?bencana=gempa` 0 foto).
5. **Terjemahan dan pratinjau** (C29, C28, A33, F04): judul laci dan kartu baru bocor Indonesia di EN, og:image kejadian = gambar karhutla, judul berita tanpa EN, Tentang tak menyebut USGS/GEM (CC BY-SA)/NOAA.

## Rusak atau basi yang ditemukan

| Temuan | Letak |
| --- | --- |
| og:image `/gempa/k/G0016` = `ringkasan.png` (gambar karhutla), deskripsi OG '12 Okt: 1 gempa M 5+' padahal terkuat 18 Okt | live; `src/og_meta.js:20-24` |
| Komentar 'model guncangan belum dipakai di layar' padahal laci, Dampak, Kejadian memakainya | `public/gempa/insight.js:6`, `dampak.js:4`, `scripts/gempa/dampak.py:7` |
| Docstring 'Tidak ada workflow gempa', keluaran `public/gempa/data/berita.json`; nyatanya `public/banjir/data/berita_gempa.json` lewat `lintas.yml:117` | `scripts/gempa/berita.py:3-4` |
| `uji_js_tsunami.py` tidak dijalankan workflow mana pun | `gempa.yml` |
| Langkah CI 'Periksa kesegaran' memakai worker yatim (balasan 404) kecuali `vars.URL_STATUS` diisi | `lintas.yml:189`, juga `banjir.yml`, `data.yml`, `titik.yml`, `jaga.yml` |
| Hasil crawl i18n tersimpan 15 Okt; laci/Kejadian belum tercakup | `scripts/i18n/laporan.json` |
| README menyebut '26.004 gempa' dan 'USGS/EMSC'; nyatanya 28.134 (M>=4,5) dan EMSC tidak dipakai | `docs/multi-bencana/README.md:53` |
| Riwayat M5+ dan risiko berhenti 16 Okt (diperbarui bulanan); Tren tertinggal sampai 3 hari dari D1 | `public/gempa/data/meta.json`, `statis.yml:69-90` |
| Foto dummy 14 berkas (karhutla 100), kredit ada | `src/foto.js:113` |

## Yang sengaja tidak ditutup

Tidak ada kalender musim, ENSO, ansambel IFS, cuaca, aset udara, penanggung jawab lahan (TB, alasan di tabel). Sentimen berita tidak ditampilkan sampai ada
label uji manusia. Isoseismal berupa lingkaran model (bukan kontur ShakeMap) dan berlabel perkiraan.
