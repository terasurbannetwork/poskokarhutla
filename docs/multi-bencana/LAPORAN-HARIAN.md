# Laporan harian generik (semua bencana)

Fondasi bersama supaya tiap bencana punya laporan harian setara karhutla (`/laporan`) tanpa
menulis ulang 80 KB `public/laporan.js`. Karhutla TIDAK dipindah ke mesin ini sekarang; ia
tetap rujukan tampilan. Pemindahan karhutla = pekerjaan strangler terpisah.

## Bagian

| Berkas | Pemilik | Isi |
| --- | --- | --- |
| `scripts/umum/laporan.py` | `pipa-umum` | `tulis(id, ...)` menyusun dan memvalidasi `public/<id>/data/laporan.json`; self-check `python3 scripts/umum/laporan.py uji` |
| `public/inti/laporan.js` | `inti-layar` | Mesin layar: `Laporan.pasang({id, url?})` menggambar semua kartu dari JSON |
| `public/inti/laporan.css` | `inti-layar` | Gaya layar + cetak A4 (bebas dari `public/laporan.css` karhutla) |
| `public/<id>/laporan.html` | pengerja bencana | Cangkang tipis: kepala, `<div id="laporan">`, muat mesin |
| `public/<id>/data/laporan.json` | pengerja bencana | Dibangun pipeline bencana itu lewat `laporan.py` |

## Kontrak `laporan.json` (v1)

```jsonc
{
  "v": 1,
  "bencana": "gempa",                       // id registry
  "judul": "Laporan Harian Gempa Bumi",
  "dibuat": "2026-10-18T17:03+07:00",       // waktu pipeline jalan
  "cutoff": "2026-10-18T14:03+07:00",       // data terakhir yang masuk
  "hari": ["2026-10-05", "...", "2026-10-18"],  // naik, ISO, hari WIB; panjang N (7..120)
  "hari_lengkap": "2026-10-17",             // hari terakhir yang sudah final; hari sesudahnya ditandai "berjalan"
  "metrik": [                               // 1..6 metrik; urutan = urutan tampil
    {"k": "kejadian", "label": "Gempa M≥3", "satuan": "kejadian", "utama": true,
     "agregat": "jumlah",                   // jumlah | maks | rerata: cara menggabung hari (rentang) dan kab→prov
     "arah": "naik_buruk",                  // naik_buruk | naik_baik | netral: warna panah ubah
     "desimal": 0}
  ],
  "nasional": {"kejadian": [3, 5, ...]},    // tiap metrik: array panjang N, null = tidak ada data
  "prov":  {"72": {"nama": "Sulawesi Tengah", "kejadian": [...]}},   // kode Kemendagri 2 digit
  "kab":   [{"prov": "72", "kode": "7203", "nama": "Kab. Donggala", "kejadian": [...]}],
  "sorot": [                                // kartu "Perlu perhatian" (0..8), sudah diurutkan
    {"tingkat": "awas|siaga|waspada|info", "judul": "...", "teks": "...", "prov": "72", "tautan": "/gempa/?k=G0012"}
  ],
  "prakiraan": {                            // opsional: 1..7 hari ke depan dari model bencana itu
    "judul": "Peluang gempa susulan M≥5, 7 hari",
    "hari": ["2026-10-19", "..."],
    "baris": [{"label": "Donggala", "prov": "72", "nilai": [0.12, ...], "satuan": "peluang"}]
  },
  "tambahan": [                             // opsional: kartu khusus domain, tabel polos
    {"id": "susulan", "judul": "Gempa susulan terbesar", "kolom": ["Waktu", "M", "Kedalaman (km)"],
     "baris": [["18 Okt 03.12", 5.1, 10]], "catatan": "satu kalimat"}
  ],
  "sumber": [{"nama": "BMKG", "url": "https://...", "catatan": "katalog gempa M≥3"}]
}
```

Invarian (diperiksa `laporan.py` saat menulis, ditolak bila salah):
- Semua array metrik panjangnya = `len(hari)`; `hari` naik tanpa duplikat.
- Tepat satu metrik `utama`.
- Kode prov 2 digit dan ada di batas Kemendagri; `kab[].prov` ada di `prov`.
- `agregat=jumlah`: jumlah kab satu prov ≤ nilai prov + 1e-6 (boleh kurang: kejadian di laut tanpa kab).
- Angka ≥ 0 kecuali `arah=netral`.
- `sorot.tingkat` ∈ {awas, siaga, waspada, info}.
- Ukuran berkas ≤ 400 KB.

## Yang digambar mesin (urut)

1. Kop cetak (logo + "Centurisk97" + judul + tanggal), sama seperti karhutla.
2. Kepala: judul, hari terpilih (pemilih tanggal dari `hari`), cut-off, pemilih provinsi
   (`?prov=<kode>`, juga di URL), tombol Cetak PDF (`window.print`).
3. Ringkasan: tabel tiap metrik: hari terpilih, kemarin, ubah (panah + %), total rentang 7 hari / bulan ini.
4. Tren harian: batang metrik utama, segmen 7 hari / 30 hari / semua, hari berjalan diarsir.
5. Perlu perhatian: daftar `sorot` (pil tingkat).
6. Prakiraan (bila ada).
7. Per provinsi: tabel bisa diurut, satu kolom per metrik + ubah metrik utama.
8. Kenaikan terbesar per kab/kota (metrik utama, hari terpilih vs kemarin), 10 teratas.
9. Per kab/kota: tabel dikelompokkan per provinsi, bisa diurut.
10. Kartu `tambahan`.
11. Sumber dan cut-off.

Gaya ikut aturan pemilik: kartu Insight berlabel pil tanpa subjudul/KPI, judul + maks 1 kalimat,
pemisah ribuan titik, segmen selebar wadah, angka rata kanan, tanpa paragraf metode (metode di
halaman Metode bencana). Dipilih provinsi: semua kartu menyaring ke provinsi itu.
