# Komponen, tata letak, dan token deck (tema.json)

Semua warna, ukuran huruf, margin, jarak, dan geometri komponen deck dibaca mesin dari `tema.json` (salinannya di `assets/proyek-contoh/tema.json`). Berkas ini menuliskan nilainya supaya bisa dibaca tanpa membuka JSON. Aturan maknanya (kapan warna dipakai, kenapa) ada di `selera-presentasi.md` bagian Kerangka halaman, Tipografi dan warna, dan Komponen, serta `pedoman-desain-deck.md` B1. Nilai di sini dibangkitkan dari tema.json 26 Okt 2026; bila tema.json proyek diubah, tema.json yang menang. Satuan pt (slide 960 x 540 pt, 1 pt = 12.700 EMU).

Menyetel tampilan: ubah `tema.json` proyek (bukan kode), lalu `python scripts/tema.py` (validator, beda warna CIEDE2000, kontras) dan bangun ulang deck. Warna dirujuk spek dengan nama token, tidak pernah hex.

## Kerangka slide (`slide`)

- `lebar_pt`: 960
- `tinggi_pt`: 540
- `margin_kiri_pt`: 43.2
- `tepi_kanan_isi_pt`: 916.8
- `lebar_isi_pt`: 873.6
- `area_isi_y_pt`: [101, 500]
- `kata_per_slide`: [180, 290]
- `blok_per_slide`: [3, 4]
- `judul_kotak`: `{"x_pt": 43.2, "y_pt": 21.6, "tinggi_pt": [47.5, 65], "lebar_pt": 823, "lebar_dengan_pil_pt": 644, "anchor": "bawah"}`
- `garis`: `{"y_pt": [95, 507.6], "tebal_pt": 0.75, "warna": "garis-kuat"}`
- `logo`: `{"x_pt": 889.4, "y_pt": 28.8, "lebar_pt": 27.4, "tinggi_pt": 34.6}`
- `footer`: `{"teks": "Badan Nasional Penanggulangan Bencana  |  Copyright 2026", "y_pt": 512.6, "ukuran_pt": 8.5, "warna": "teks"}`
- `layout`: `{"isi": "kertas", "gelap": "navy", "gelap_untuk": ["penutup", "pembatas-lampiran"]}`

## Warna (`warna`)

| Token | Hex | Peran / catatan |
| --- | --- | --- |
| `teks` (inti) | #1A1A1A | teks isi, teks di atas semua tint |
| `teks-2` (inti) | #2E3440 | sub-subbab, teks tabel sekunder, Sumber di dalam kotak bertint, ikon arah di halaman api atau basah |
| `teks-3` (inti) | #6B7280 | Sumber dan keterangan di latar putih, kepala kolom tabel lampiran, nilai 0% |
| `navy` (inti) | #051C2C | identitas: kepala tabel, baris total, pil data, nomor peringkat, judul bab, label Tabel dan Gambar, sampul |
| `garis` (inti) | #BFC5CC | garis panel 0,75 pt, garis baris tabel 0,5 pt, garis footer |
| `garis-kuat` (inti) | #1A1A1A | garis header 0,75 pt, garis slide |
| `pembanding` (inti) | #DCE1E7 | batang pembanding grafik |
| `tanpa-data` (inti) | #F1F3F6 | wilayah atau sel tanpa data, selalu dengan arsir |
| `arsir-tanpa-data` (inti) | #A9B4C2 | arsir diagonal di atas tanpa-data |
| `wilayah` (inti) | #D3DBE5 | daratan bernilai netral di peta simbol; tidak di peta koroplet |
| `batas` (inti) | #A9B4C2 | batas provinsi 0,6 pt, garis pantai koroplet 0,4 pt |
| `kertas` (inti) | #FFFFFF | latar halaman isi, teks di atas navy |
| `oranye` (aksen) | #D9600B | naik; angka kunci judul >= 14 pt Bold; garis tegak header dan garis aksen |
| `biru` (aksen) | #2F86D1 | turun |
| `merah` (aksen) | #C8102E | hanya bahaya atau perlu perhatian; garis sorot wilayah prioritas yang ditetapkan |
| `slate` (aksen) | #5B7A99 | pil garis Terverifikasi dan peringatan BMKG, garis kiri kotak Catatan dan Koreksi |
| `biru-abu` (aksen) | #3F5F80 | ukuran kedua: pil kolom luas, seri kedua grafik |
| `biru-lembaga` (aksen) | #00499D | nama tempat yang disorot di judul slide |
| `emas-teks` (aksen) | #8A6A2E | teks bernada kekeringan di bawah 14 pt |
| `sumber` (aksen) | #4A9BE0 | bilah 3 pt di kiri catatan sumber slide; tanda grafis saja |
| `teks-di-navy` (aksen) | #C9D1E3 | slide gelap: footer, baris laporan penutup, butir pembatas Lampiran (d9 s7, s8) |
| `aksen-di-navy` (aksen) | #F6B26B | slide gelap: subjudul dan kepala kelompok pembatas Lampiran (d9 s8) |
| `oranye-di-navy` (aksen) | #F28C28 | slide gelap: garis aksen penutup, kode lampiran di pembatas (d9 s7, s8) |
| `redup-di-navy` (aksen) | #8C9AA8 | slide gelap: garis pemisah dan nomor halaman di pembatas Lampiran (d9 s8) |
| `seri-lama` (aksen) | #B7B0A6 | batang periode lama (tidak ditekankan) di grafik batang; di luar ramp skala supaya tidak berarti kelas (B1.8, D-24); CIEDE2000 >= 10,8 dari semua hex tema |
| `seri-lainnya` (aksen) | #8F877D | segmen 'lainnya' batang bertumpuk; di luar ramp skala dan kategori (B1.8, D-24); CIEDE2000 >= 12,8 dari semua hex tema, teks di atasnya 4,9:1 |

Arah naik/turun (`warna.arah`): `{"naik": "oranye", "turun": "biru", "nol": "teks-3", "berkeluarga": "teks-2", "naik_di_navy": {"hex": "#F2A35E"}, "turun_di_navy": {"hex": "#8EC5F5"}, "_aturan": "arah = ikon segitiga vektor atau kata naik/turun, tidak pernah karakter segitiga atau panah; di halaman berkategori api atau basah ikon arah memakai teks-2 dan katanya ditulis"}`

Tint tema (`warna.tint`, latar panel, pita kepala, kartu):

```json
{
 "netral": {
  "pita": "#E6EAF0",
  "muda": "#F3F5F8"
 },
 "api": {
  "pita": "#FBE7D6",
  "muda": "#FDF4EC"
 },
 "bahaya": {
  "pita": "#F8DDE0",
  "muda": "#FCF1F2"
 },
 "basah": {
  "pita": "#DCEBF8",
  "muda": "#EEF5FC"
 },
 "kering": {
  "pita": "#F4ECDC",
  "muda": "#FBF8F2"
 },
 "geologi": {
  "pita": "#F1E2D6"
 },
 "nonalam": {
  "pita": "#E3EDE8"
 },
 "luas": {
  "pita": "#E3EAF1"
 },
 "sorot-baris": {
  "pita": "#FDF1E8"
 },
 "_aturan": "teks di atas tint selalu teks; sosial memakai netral; tanpa gradien"
}
```

Enam keluarga kategori bencana (`warna.kategori`, satu keluarga satu warna di seluruh deck, S19):

```json
{
 "_aturan": "warna menandai keluarga bencana, jenis dibedakan ikon dan label; tidak pernah satu-satunya pembawa makna",
 "geologi": {
  "hex": "#8A4B2A",
  "tint": "geologi",
  "label": "Geologi",
  "varian_skenario": "a",
  "jenis": [
   "gempa",
   "tsunami",
   "gunungapi",
   "likuefaksi"
  ]
 },
 "basah": {
  "hex": "#2F86D1",
  "tint": "basah",
  "label": "Hidrometeorologi basah",
  "varian_skenario": "a",
  "jenis": [
   "banjir",
   "longsor",
   "cuaca-ekstrem",
   "gelombang-abrasi",
   "rob"
  ]
 },
 "kering": {
  "hex": "#B08A3E",
  "tint": "kering",
  "label": "Kekeringan",
  "varian_skenario": "a",
  "jenis": [
   "kekeringan"
  ]
 },
 "api": {
  "hex": "#D9600B",
  "tint": "api",
  "label": "Kebakaran hutan dan lahan",
  "varian_skenario": "a",
  "jenis": [
   "karhutla"
  ]
 },
 "nonalam": {
  "hex": "#3D6B5A",
  "tint": "nonalam",
  "label": "Nonalam",
  "varian_skenario": "b",
  "jenis": [
   "pandemi",
   "kebakaran-industri",
   "kebakaran-tpa"
  ]
 },
 "sosial": {
  "hex": "#4B4F58",
  "tint": "netral",
  "label": "Sosial",
  "varian_skenario": "c",
  "jenis": [
   "konflik-sosial"
  ]
 }
}
```

Skala kelas dan koroplet (`warna.skala`, termasuk `irbi` kelas Rendah/Sedang/Tinggi, T8):

```json
{
 "_aturan": "lima kelas dari terang ke pekat; skala.<ramp>.<1..5>; status resmi lembaga (level PVMBG, peringatan BMKG, MMI) memakai warna dan kata asli lembaganya, tidak dipetakan ke sini",
 "api": {
  "kelas": [
   "#FBE7D6",
   "#F4C3A0",
   "#E8894A",
   "#D9600B",
   "#8F3F07"
  ],
  "dipakai": "karhutla; kelas IRBI (T8)",
  "kategori": "api"
 },
 "air": {
  "kelas": [
   "#DCEBF8",
   "#A4CAEE",
   "#68A8E0",
   "#2F86D1",
   "#1B5A93"
  ],
  "dipakai": "indeks platform banjir, longsor, cuaca ekstrem, gelombang, rob",
  "kategori": "basah"
 },
 "emas": {
  "kelas": [
   "#F4ECDC",
   "#DCC79C",
   "#C4A262",
   "#A07A32",
   "#6E5424"
  ],
  "dipakai": "indeks platform kekeringan",
  "kategori": "kering"
 },
 "netral": {
  "kelas": [
   "#DCE3EB",
   "#AEBBCB",
   "#7F93AA",
   "#4F6A88",
   "#24384F"
  ],
  "dipakai": "kapasitas, geologi, nonalam, multi-bahaya platform"
 },
 "irbi": {
  "ramp": "api",
  "kelas": [
   1,
   3,
   5
  ],
  "label": [
   "Rendah",
   "Sedang",
   "Tinggi"
  ],
  "legenda": "Kelas IRBI BNPB",
  "_aturan": "T8: skala oranye rumah BNPB dengan nama kelas resmi; merah tidak dipakai untuk kelas indeks"
 },
 "tanpa_data": {
  "isi": "tanpa-data",
  "arsir": "arsir-tanpa-data",
  "label": "Belum terdata"
 }
}
```

Warna terlarang (`warna.terlarang`, palet generator lama, D-9 menolak): `["#D9650B", "#0F1E2D", "#0B4EA2", "#A88A3C", "#FBEBDD", "#D5D9DE", "#2F6FB5", "#4F6D8C", "#2E7D8C", "#6B4A2B", "#7A2E1E", "#A23B2A", "#F7F8FA", "#0B2545", "#C9A227"]`

## Tipografi slide (`slide.tipografi`)

Hanya Roboto (font tema juga). Batas bawah huruf yang dibaca 6 pt.

| Peran | Nilai |
| --- | --- |
| `batas_bawah_pt` | `6` |
| `judul_temuan` | `{"ukuran_pt": [19, 22], "bobot": "bold", "warna": "teks", "warna_angka": "oranye", "warna_angka_berkeluarga": "navy", "warna_tempat": "biru-lembaga", "maks_baris": 2}` |
| `subjudul` | `{"ukuran_pt": 12, "bobot": "regular", "warna": "teks-2"}` |
| `nilai_kartu` | `{"ukuran_pt": 17, "bobot": "bold"}` |
| `hitungan_panel` | `{"ukuran_pt": [16, 18], "bobot": "bold"}` |
| `nilai_ubin` | `{"ukuran_pt": 15, "bobot": "bold"}` |
| `judul_panel` | `{"ukuran_pt": 11, "bobot": "bold", "warna": "teks"}` |
| `judul_grafik` | `{"ukuran_pt": 10, "bobot": "regular", "warna": "teks"}` |
| `judul_kolom_pita` | `{"ukuran_pt": 9, "bobot": "bold", "warna": "teks"}` |
| `label_kartu` | `{"ukuran_pt": 7.5, "bobot": "regular", "warna": "teks-2"}` |
| `label_bagian` | `{"ukuran_pt": 7.5, "bobot": "bold", "spasi_huruf_pt": 1.0}` |
| `isi_daftar` | `{"ukuran_pt": 7.2, "bobot": "regular", "warna": "teks"}` |
| `rincian_rekomendasi` | `{"ukuran_pt": 8, "bobot": "regular", "warna": "teks", "rata": "kiri-kanan"}` |
| `kepala_kolom` | `{"ukuran_pt": 6.5, "bobot": "bold", "warna": "teks-3", "kapital": true, "spasi_huruf_pt": 0.8}` |
| `pil_bagian` | `{"ukuran_pt": 6.6, "bobot": "bold", "warna": "kertas", "kapital": true, "spasi_huruf_pt": 1.0}` |
| `pil_status` | `{"ukuran_pt": [6, 6.4], "bobot": "bold"}` |
| `nilai_batang` | `{"ukuran_pt": 7.6, "bobot": "bold"}` |
| `tanggal_batang` | `{"ukuran_pt": 6.5, "bobot": "regular", "warna": "teks-3"}` |
| `persen_batang` | `{"ukuran_pt": 6, "bobot": "bold"}` |
| `legenda` | `{"ukuran_pt": 7.5, "bobot": "regular", "warna": "teks"}` |
| `catatan_kaki` | `{"ukuran_pt": 7.5, "bobot": "regular", "warna": "teks-3"}` |
| `footer` | `{"ukuran_pt": 8.5, "bobot": "regular", "warna": "teks"}` |
| `nomor_halaman` | `{"ukuran_pt": 8.5, "bobot": "bold", "warna": "teks"}` |
| `pengecualian_bawah` | `{"ukuran_pt": [5.2, 5.8], "hanya": "persen di tabel padat dan chip"}` |
| `isi_pita` | `{"ukuran_pt": 7.2, "bobot": "regular", "warna": "teks-2"}` |
| `temuan_kode` | `{"ukuran_pt": 10.5, "bobot": "bold", "warna": "navy"}` |
| `temuan_isi` | `{"ukuran_pt": 10.5, "bobot": "regular", "warna": "teks"}` |
| `chip` | `{"ukuran_pt": 6.4, "bobot": "bold", "warna": "teks"}` |
| `label_tabel_utama` | `{"ukuran_pt": 8, "bobot": "bold", "warna": "teks"}` |
| `isi_tabel` | `{"ukuran_pt": 7.5, "bobot": "regular", "warna": "teks-2"}` |
| `nilai_tabel` | `{"ukuran_pt": 8, "bobot": "bold", "warna": "teks"}` |
| `total_tabel` | `{"ukuran_pt": 8, "bobot": "bold", "warna": "kertas"}` |
| `nomor_peringkat` | `{"ukuran_pt": 6.5, "bobot": "bold", "warna": "kertas"}` |
| `ubah_grafik` | `{"ukuran_pt": 9, "bobot": "bold"}` |
| `label_peta` | `{"ukuran_pt": 8, "bobot": "bold", "warna": "teks"}` |
| `tesis` | `{"ukuran_pt": 12, "bobot": "bold", "warna": "navy"}` |
| `footer_gelap` | `{"ukuran_pt": 8.5, "bobot": "regular", "warna": "teks-di-navy"}` |
| `cut_off_label` | `{"ukuran_pt": 7, "bobot": "bold", "warna": "batas", "spasi_huruf_pt": 1.0}` |
| `cut_off_nilai` | `{"ukuran_pt": 9, "bobot": "bold", "warna": "kertas"}` |
| `judul_sampul` | `{"ukuran_pt": 32, "bobot": "bold", "warna": "teks", "maks_baris": 3}` |
| `subjudul_sampul` | `{"ukuran_pt": 14, "bobot": "regular", "warna": "teks-2"}` |
| `lembaga_sampul` | `{"ukuran_pt": 16, "bobot": "bold", "warna": "biru-lembaga"}` |
| `kepada_sampul` | `{"ukuran_pt": 12.5, "bobot": "regular", "warna": "teks"}` |
| `tanggal_sampul` | `{"ukuran_pt": 11, "bobot": "bold", "warna": "kertas"}` |
| `kredit_foto` | `{"ukuran_pt": 7, "bobot": "regular", "warna": "kertas"}` |
| `terima_kasih` | `{"ukuran_pt": 54, "bobot": "bold", "warna": "kertas"}` |
| `lembaga_penutup` | `{"ukuran_pt": 18, "bobot": "bold", "warna": "kertas"}` |
| `laporan_penutup` | `{"ukuran_pt": 13, "bobot": "regular", "warna": "teks-di-navy"}` |
| `judul_pembatas` | `{"ukuran_pt": 40, "bobot": "bold", "warna": "kertas"}` |
| `subjudul_pembatas` | `{"ukuran_pt": 15, "bobot": "regular", "warna": "aksen-di-navy"}` |
| `kelompok_pembatas` | `{"ukuran_pt": 11, "bobot": "bold", "warna": "aksen-di-navy"}` |
| `butir_pembatas` | `{"ukuran_pt": 9.5, "bobot": "regular", "warna": "teks-di-navy", "warna_kode": "oranye-di-navy", "warna_halaman": "redup-di-navy"}` |
| `nomor_kartu_kesimpulan` | `{"ukuran_pt": 14, "bobot": "bold", "warna": "pembanding"}` |
| `label_kartu_kesimpulan` | `{"ukuran_pt": 6.8, "bobot": "bold", "spasi_huruf_pt": 1.0}` |
| `judul_kartu_kesimpulan` | `{"ukuran_pt": 12.5, "bobot": "bold", "warna": "teks"}` |
| `isi_kartu_kesimpulan` | `{"ukuran_pt": 7.8, "bobot": "regular", "warna": "teks-2"}` |
| `label_arahan` | `{"ukuran_pt": 7.5, "bobot": "bold", "warna": "kertas", "spasi_huruf_pt": 1.5}` |
| `arahan` | `{"ukuran_pt": 10.5, "bobot": "bold", "warna": "kertas"}` |
| `langkah` | `{"ukuran_pt": 9, "bobot": "bold", "warna": "teks"}` |
| `kode_aksi` | `{"ukuran_pt": 7, "bobot": "bold", "warna": "kertas"}` |
| `aksi_fase` | `{"ukuran_pt": 9, "bobot": "regular", "warna": "teks"}` |
| `kemungkinan_kelas` | `{"ukuran_pt": 9, "bobot": "bold"}` |
| `kemungkinan_label` | `{"ukuran_pt": 6.5, "bobot": "regular"}` |
| `kepala_tabel_lampiran` | `{"ukuran_pt": 8, "bobot": "bold", "warna": "teks-3", "spasi_huruf_pt": 0.5}` |
| `isi_tabel_lampiran` | `{"ukuran_pt": 8, "bobot": "regular", "warna": "teks"}` |
| `isi_panel` | `{"ukuran_pt": 8.5, "bobot": "regular", "warna": "teks"}` |

## Geometri komponen (`slide.komponen`)

Tiap blok dipakai satu fungsi pembangun di `scripts/deck.py` (bingkai, kartu, grup_kartu, pil_bagian, chip, panel, pita_bawah, temuan, baris_rekomendasi, tiga_fase, tabel_peringkat, grafik_batang, legenda, peta, skenario, kesimpulan, tabel_lampiran, cut_off, catatan_kaki, logo_bulat, foto, sampul, penutup, pembatas).

Catatan: dibaca bangun/pptx/deck.py; jarak dalam pt, dx dan dy relatif ke tepi kiri atas komponennya

### `bingkai`

```json
{
 "spasi_baris_judul": 0.95,
 "langkah_judul_pt": 0.5,
 "subjudul_jarak_pt": 2,
 "subjudul_tinggi_pt": 18,
 "subjudul_maks_x_pt": 690,
 "footer_lebar_pt": 432,
 "footer_tinggi_pt": 15.8,
 "nomor_lebar_pt": 43.2,
 "jarak_blok_pt": 10.8,
 "rasio_utama": 0.62,
 "sumber": {
  "y_pt": 485,
  "tinggi_pt": 16,
  "bilah_y_pt": 486.5,
  "bilah_tinggi_pt": 13,
  "teks_x_pt": 50.4,
  "isi_bawah_pt": 479,
  "awalan_olah": "Pengolahan data Pantau Bencana dari",
  "label_olah": "diolah Pantau Bencana"
 }
}
```

### `kartu`

```json
{
 "lebar_pt": [
  132,
  159
 ],
 "tinggi_pt": 40,
 "radius_pt": 5.8,
 "lingkaran_pt": 26,
 "ikon_pt": 14,
 "jarak_pt": 7.2,
 "warna_garis": "garis",
 "lingkaran_dx_pt": 8.6,
 "teks_dx_pt": 40.3,
 "nilai_dy_pt": 2.9,
 "nilai_tinggi_pt": 21.6,
 "label_dy_pt": 23.8,
 "label_tinggi_pt": 12.2,
 "tint_ikon": {
  "teks-2": "tint.netral.pita",
  "teks-3": "tint.netral.pita",
  "navy": "tint.netral.pita",
  "oranye": "tint.api.pita",
  "merah": "tint.bahaya.pita",
  "biru": "tint.basah.pita",
  "slate": "tint.luas.pita",
  "biru-abu": "tint.luas.pita",
  "emas-teks": "tint.kering.pita"
 }
}
```

### `grup_kartu`

```json
{
 "tinggi_pt": 73,
 "jarak_pt": 21,
 "pad_pt": 8.64,
 "pil_dy_pt": 4.3,
 "kartu_dy_pt": 24.5,
 "radius_pt": 5.8,
 "nada": {
  "data": {
   "warna_latar": "tint.netral.muda"
  },
  "perhatian": {
   "warna_latar": "tint.bahaya.muda"
  },
  "bmkg": {
   "warna_latar": "tint.basah.muda"
  }
 }
}
```

### `pil_bagian`

```json
{
 "tinggi_pt": 14.4,
 "ikon_pt": 9
}
```

### `chip`

```json
{
 "tinggi_pt": 13,
 "ikon_rasio": 0.62,
 "pad_rasio": 0.5,
 "jarak_pt": 4,
 "warna_pemimpin": "navy",
 "warna_garis": "garis",
 "warna_ikon": "navy"
}
```

### `panel`

```json
{
 "radius_pt": 4.3,
 "pita_pt": 36,
 "lingkaran_pt": 23,
 "ikon_pt": 14,
 "jarak_pt": 10.8,
 "warna_garis": "garis",
 "tebal_garis_pt": 0.75,
 "pad_pt": 10,
 "jarak_judul_pt": 7,
 "nada": {
  "netral": {
   "warna_pita": "tint.netral.pita",
   "warna_ikon": "navy"
  },
  "api": {
   "warna_pita": "tint.api.pita",
   "warna_ikon": "kategori.api"
  },
  "bahaya": {
   "warna_pita": "tint.bahaya.pita",
   "warna_ikon": "merah"
  },
  "air": {
   "warna_pita": "tint.basah.pita",
   "warna_ikon": "kategori.basah"
  },
  "kering": {
   "warna_pita": "tint.kering.pita",
   "warna_ikon": "kategori.kering"
  },
  "geologi": {
   "warna_pita": "tint.geologi.pita",
   "warna_ikon": "kategori.geologi"
  },
  "nonalam": {
   "warna_pita": "tint.nonalam.pita",
   "warna_ikon": "kategori.nonalam"
  },
  "sosial": {
   "warna_pita": "tint.netral.pita",
   "warna_ikon": "kategori.sosial"
  }
 }
}
```

### `pita_bawah`

```json
{
 "lebar_pt": 874,
 "tinggi_pt": [
  61,
  71
 ],
 "lingkaran_pt": 26,
 "tinggi_baku_pt": 64.8,
 "radius_pt": 6,
 "pad_pt": 11.5,
 "label_dy_pt": 5.8,
 "label_tinggi_pt": 14.4,
 "lingkaran_dy_pt": 27.4,
 "ikon_pt": 14,
 "teks_dx_pt": 33.1,
 "judul_dy_pt": 23,
 "judul_tinggi_pt": 15.8,
 "isi_dy_pt": 39,
 "pemisah_dy_pt": 26,
 "pemisah_bawah_pt": 6,
 "nada": {
  "aksi": {
   "warna_latar": "tint.api.muda",
   "warna_label": "oranye",
   "warna_ikon": "oranye",
   "warna_pemisah": "skala.api.2"
  },
  "hujan": {
   "warna_latar": "tint.basah.muda",
   "warna_label": "kategori.basah",
   "warna_ikon": "kategori.basah",
   "warna_pemisah": "skala.air.2"
  },
  "data": {
   "warna_latar": "tint.netral.muda",
   "warna_label": "navy",
   "warna_ikon": "navy",
   "warna_pemisah": "skala.netral.1"
  }
 }
}
```

### `temuan`

```json
{
 "lingkaran_pt": 26,
 "ikon_rasio": 0.54,
 "warna_lingkaran": "navy",
 "jarak_pt": 9,
 "tinggi_baris": 1.25,
 "baris_maks_pt": 120,
 "jarak_kolom_pt": 24,
 "warna_pemisah": "tint.netral.pita",
 "maks_baris": 3,
 "pola_kode": "Temuan [A-C]\\.\\d+",
 "jarak_pil_pt": 8,
 "tesis_maks_baris": 2,
 "tesis_jarak_pt": 8
}
```

### `baris_rekomendasi`

```json
{
 "tinggi_pt": 46.8,
 "tinggi_maks_pt": 72,
 "lingkaran_pt": 26,
 "ikon_rasio": 0.54,
 "kolom_rasio": [
  0,
  0.33,
  0.74
 ],
 "jarak_pt": 9,
 "kepala_tinggi_pt": 14,
 "warna_garis_kepala": "garis-kuat",
 "warna_pemisah": "tint.netral.pita",
 "warna_lingkaran": "navy",
 "warna_kode": "oranye",
 "langkah_dy_pt": 6.5,
 "chip_dy_pt": 25,
 "nada_waktu": {
  "pil_isi": "tint.netral.pita",
  "pil_teks": "teks"
 }
}
```

### `tiga_fase`

```json
{
 "aksi_maks_pt": 110,
 "kode_lebar_pt": 20,
 "kode_tinggi_pt": 13,
 "warna_kode": "navy",
 "aksi_teks_tinggi_pt": 22,
 "chip_dy_pt": 25,
 "warna_pemisah": "tint.netral.pita",
 "nada_waktu": {
  "pil_isi": "tint.netral.pita",
  "pil_teks": "teks"
 }
}
```

### `tabel_peringkat`

```json
{
 "baris_pt": 17.3,
 "bulatan_pt": 13.7,
 "total_pt": 21,
 "warna_pemisah": "tint.netral.pita",
 "kepala_tinggi_pt": 16.6,
 "baris_min_pt": 12,
 "baris_maks_pt": 21,
 "segitiga_pt": 5,
 "pil_tinggi_pt": 14.4,
 "pil_lebar_min_pt": 57.6,
 "kolom_jarak_pt": 8,
 "warna_garis_kepala": "garis-kuat",
 "warna_sorot": "tint.sorot-baris.pita",
 "warna_nomor": "navy",
 "warna_total": "navy"
}
```

### `grafik_batang`

```json
{
 "maks_batang": 24,
 "kepala_tinggi_pt": 16,
 "segitiga_kepala_pt": 6,
 "nilai_tinggi_pt": 11,
 "label_tinggi_pt": 10,
 "persen_tinggi_pt": 9,
 "bawah_pt": 22,
 "lebar_rasio": 0.62,
 "radius_rasio": 0.22,
 "pekat_terakhir": 3,
 "segitiga_pt": 4,
 "warna_pembanding": "pembanding",
 "warna_garis_dasar": "garis",
 "keluarga": {
  "netral": {
   "warna_pekat": "navy",
   "warna_lama": "skala.netral.2"
  },
  "api": {
   "warna_pekat": "kategori.api",
   "warna_lama": "skala.api.2"
  },
  "air": {
   "warna_pekat": "kategori.basah",
   "warna_lama": "skala.air.2"
  },
  "kering": {
   "warna_pekat": "kategori.kering",
   "warna_lama": "skala.emas.2"
  }
 }
}
```

### `legenda`

```json
{
 "kotak_pt": 8,
 "jarak_kotak_pt": 4,
 "jarak_item_pt": 12,
 "tinggi_pt": 14,
 "warna_garis_kotak": "garis"
}
```

### `peta`

```json
{
 "legenda_tinggi_pt": 14,
 "jarak_legenda_pt": 6,
 "penanda_tinggi_pt": 13,
 "warna_garis_penanda": "garis",
 "unsur_tinggi_pt": 11,
 "label_jarak_min_pt": 2,
 "label_darat_maks": 0.03
}
```

### `skenario`

```json
{
 "kepala_tinggi_pt": 36,
 "rasio_kerusakan": 0.52,
 "label_tinggi_pt": 12,
 "baris_maks_pt": 27,
 "kolom_nilai_rasio": 0.5,
 "kemungkinan_tinggi_pt": 30,
 "jarak_kebijakan_pt": 12,
 "label_kebijakan_rasio": 0.34,
 "nilai_kebijakan_lebar_pt": 64,
 "batang_kebijakan_pt": 20,
 "batang_kebijakan_jarak_pt": 24,
 "warna_batang": [
  "pembanding",
  "teks-2"
 ]
}
```

### `kesimpulan`

```json
{
 "kolom": 4,
 "baris": 2,
 "y_pt": 106,
 "tinggi_pt": 147.6,
 "jarak_pt": 10.8,
 "radius_pt": 5.8,
 "pad_pt": 13,
 "lingkaran_pt": 31.7,
 "ikon_rasio": 0.55,
 "nomor_lebar_pt": 30.2,
 "label_dy_pt": 51.8,
 "label_tinggi_pt": 11.5,
 "judul_dy_pt": 64.8,
 "judul_tinggi_pt": 36,
 "isi_dy_pt": 99.4,
 "isi_maks_baris": 4,
 "arahan": {
  "tinggi_pt": 44,
  "radius_pt": 5.8,
  "lingkaran_pt": 26,
  "warna_isi": "oranye",
  "warna_lingkaran": "kertas",
  "warna_ikon": "oranye"
 }
}
```

### `tabel_lampiran`

```json
{
 "baris_pt": [
  18,
  21.6
 ],
 "maks_baris": 24,
 "kepala_tinggi_pt": 20,
 "pad_sel_pt": 3,
 "kolom_jarak_pt": 10,
 "warna_garis_kepala": "teks-3",
 "tebal_kepala_pt": 1.0,
 "warna_garis_baris": "garis",
 "tebal_baris_pt": 0.5
}
```

### `cut_off`

```json
{
 "label": "CUT OFF DATA",
 "tinggi_pt": [
  16.6,
  18
 ],
 "lebar_pt": [
  186,
  220
 ],
 "warna_isi": "navy",
 "x_pt": 696,
 "y_pt": 70,
 "pad_pt": 10
}
```

### `catatan_kaki`

```json
{
 "bilah_pt": [
  3,
  15
 ],
 "warna_bilah": "sumber"
}
```

### `logo_bulat`

```json
{
 "warna_isi": "kertas",
 "rasio_logo": 0.66
}
```

### `foto`

```json
{
 "skala_px_per_pt": 2
}
```

### `sampul`

```json
{
 "foto_x_pt": 497,
 "foto_alfa": [
  0,
  1,
  0.45
 ],
 "logo": {
  "x_pt": 43.2,
  "y_pt": 36,
  "d_pt": 79.2
 },
 "teks_x_pt": 43.2,
 "teks_lebar_pt": 446.4,
 "judul_y_pt": 126,
 "judul_tinggi_pt": 120,
 "spasi_baris_judul": 0.95,
 "jarak_pt": {
  "subjudul": 8,
  "lembaga": 12,
  "kepada": 4,
  "garis": 12
 },
 "garis_lebar_pt": 403.2,
 "tanggal": {
  "y_pt": 453.6,
  "lebar_pt": 230.4,
  "tinggi_pt": 30.2
 },
 "kredit": {
  "x_pt": 568.8,
  "y_pt": 517,
  "lebar_pt": 369.6,
  "tinggi_pt": 14.4
 },
 "putih": {
  "warna_judul": "teks",
  "warna_subjudul": "teks-2",
  "warna_lembaga": "biru-lembaga",
  "warna_kepada": "teks",
  "warna_garis": "teks",
  "warna_tanggal_isi": "navy",
  "warna_tanggal_teks": "kertas"
 },
 "gelap": {
  "warna_judul": "kertas",
  "warna_subjudul": "teks-di-navy",
  "warna_lembaga": "aksen-di-navy",
  "warna_kepada": "teks-di-navy",
  "warna_garis": "redup-di-navy",
  "warna_tanggal_isi": "kertas",
  "warna_tanggal_teks": "navy"
 }
}
```

### `penutup`

```json
{
 "foto_alfa": [
  0.12,
  0.62,
  1.0
 ],
 "logo": {
  "x_pt": 43.2,
  "y_pt": 39.6,
  "d_pt": 79.2
 },
 "teks_lebar_pt": 720,
 "judul_y_pt": 194.4,
 "judul_tinggi_pt": 79.2,
 "garis": {
  "y_pt": 288,
  "lebar_pt": 374.4,
  "tebal_pt": 2,
  "warna": "oranye-di-navy"
 },
 "lembaga_y_pt": 302.4,
 "lembaga_tinggi_pt": 28.8,
 "laporan_y_pt": 334,
 "laporan_tinggi_pt": 25.2
}
```

### `pembatas`

```json
{
 "logo": {
  "x_pt": 855.6,
  "y_pt": 25.2,
  "d_pt": 61.2
 },
 "judul_y_pt": 126,
 "judul_tinggi_pt": 64.8,
 "subjudul_y_pt": 201.6,
 "subjudul_tinggi_pt": 28.8,
 "garis_y_pt": 244.8,
 "warna_garis": "redup-di-navy",
 "kolom_x_pt": [
  43.2,
  489.6
 ],
 "kolom_lebar_pt": 427,
 "kelompok_y_pt": 255.6,
 "kelompok_tinggi_pt": 21.6,
 "baris_pt": 20.2
}
```

### `jarak_isi_ke_tepi_panel_pt`

```json
7
```

## Kosakata tertutup (`kosakata`)

### `keyakinan`

```json
{
 "resmi": {
  "label": "Resmi",
  "pil_isi": "navy",
  "pil_teks": "kertas"
 },
 "terverifikasi": {
  "label": "Terverifikasi",
  "pil_garis": "slate",
  "pil_teks": "teks"
 },
 "estimasi-model": {
  "label": "Estimasi model",
  "pil_garis": "oranye",
  "pil_teks": "teks",
  "tambahan": [
   "belum diuji balik",
   "uji balik gagal"
  ]
 },
 "asumsi-kebijakan": {
  "label": "Asumsi kebijakan",
  "pil_garis": "teks-3",
  "pil_teks": "teks"
 },
 "penilaian-pakar": {
  "label": "Penilaian pakar",
  "pil_garis": "teks-3",
  "pil_teks": "teks"
 }
}
```

### `status_usulan`

```json
{
 "sudah-ada": {
  "label": "Sudah ada",
  "pil_garis": "teks-3",
  "pil_teks": "teks"
 },
 "dikembangkan": {
  "label": "Sudah ada, perlu dikembangkan",
  "pil_garis": "navy",
  "pil_teks": "teks"
 },
 "baru": {
  "label": "Usulan baru",
  "pil_isi": "navy",
  "pil_teks": "kertas"
 }
}
```

### `fase`

```json
{
 "prabencana": {
  "label": "Prabencana",
  "kepala": "PRABENCANA"
 },
 "tanggap-darurat": {
  "label": "Tanggap darurat",
  "kepala": "TANGGAP DARURAT"
 },
 "pascabencana": {
  "label": "Pascabencana",
  "kepala": "PASCABENCANA"
 },
 "_aturan": "T10; ketiga kolom bertint netral, dibedakan ikon dan label"
}
```

### `jenis_aksi`

```json
{
 "regulasi": "Regulasi",
 "data": "Data",
 "infrastruktur": "Infrastruktur",
 "kapasitas": "Kapasitas",
 "pembiayaan": "Pembiayaan"
}
```

### `horizon`

```json
{
 "100-hari": "100 hari",
 "2026-2027": "2026–2027",
 "2028-2030": "2028–2030"
}
```

### `kelompok_rekomendasi`

```json
{
 "internal": "Internal BNPB",
 "lintas": "Lintas K/L"
}
```

### `musim`

```json
{
 "kemarau": {
  "label": "Musim kemarau",
  "tint": "kering"
 },
 "hujan": {
  "label": "Musim hujan",
  "tint": "basah"
 }
}
```

### `nada_pil`

```json
{
 "data": {
  "pil_isi": "navy",
  "pil_teks": "kertas"
 },
 "perhatian": {
  "pil_isi": "merah",
  "pil_teks": "kertas"
 },
 "bmkg": {
  "pil_garis": "slate",
  "pil_teks": "teks"
 }
}
```

### `kemungkinan_5_tahun`

```json
{
 "1": "< 0,2%",
 "2": "0,2–1%",
 "3": "1–5%",
 "4": "5–25%",
 "5": "> 25%"
}
```

### `jenis_bencana`

```json
{
 "gempa": "Gempa bumi",
 "tsunami": "Tsunami",
 "gunungapi": "Letusan gunung api",
 "likuefaksi": "Likuefaksi",
 "banjir": "Banjir dan banjir bandang",
 "longsor": "Tanah longsor",
 "cuaca-ekstrem": "Cuaca ekstrem",
 "gelombang-abrasi": "Gelombang ekstrem dan abrasi",
 "rob": "Rob",
 "kekeringan": "Kekeringan",
 "karhutla": "Kebakaran hutan dan lahan",
 "pandemi": "Epidemi dan pandemi",
 "kebakaran-industri": "Kebakaran industri",
 "kebakaran-tpa": "Kebakaran TPA",
 "konflik-sosial": "Kerusuhan dan konflik sosial"
}
```

### `istilah`

```json
{
 "_catatan": "PEDOMAN C3 dan gerbang D-10 sampai glosarium.json ada: label dari data diganti ke istilah baku; teks tampil yang memuat istilah terlarang ditolak (kata utuh, tanpa beda huruf)",
 "ganti": {
  "Bali–Nusa Tenggara": "Bali dan Nusa Tenggara"
 },
 "terlarang": [
  "titik api",
  "perkiraan satelit",
  "provinsi prioritas",
  "hujan pertama",
  "kamu",
  "Anda",
  "pra bencana",
  "pra-bencana",
  "subsiden",
  "amblesan",
  "Bali–Nusa Tenggara",
  "[SEKUNDER]",
  "TIDAK DITEMUKAN"
 ]
}
```

### `lisensi_foto`

```json
[
 "CC BY",
 "CC BY-SA",
 "CC0",
 "PD"
]
```

### `sifat_temuan`

```json
{
 "fakta": "fakta",
 "penilaian": "penilaian"
}
```

### `kode_peran`

```json
{
 "_aturan": "kode peran lembaga di matriks mandat tertulis dan rekomendasi; sama dengan paket lembaga (lembaga.json meta kode_peran)",
 "K": "koordinator/penanggung jawab utama",
 "P": "pelaksana/pendukung",
 "R": "penetap status/izin/norma",
 "I": "informasi dan peringatan dini"
}
```

### `peran_bnpb`

```json
{
 "_aturan": "kosakata tertutup peran BNPB di tiap program dan rekomendasi (KERANGKA prinsip 14); dasar Perpres 1/2019 Pasal 18-20, Perban 6/2025 jo. Perban 11/2025",
 "koordinasi": "Koordinasi",
 "nspk": "NSPK",
 "monev": "Pemantauan dan evaluasi",
 "data-krb": "Data dan KRB",
 "dana-bersama": "Pendanaan Dana Bersama",
 "komando-darurat": "Komando darurat"
}
```

## Registri ikon (`ikon`)

Satu konsep satu glif (D-25). Kunci ini yang ditulis di spek (`"ikon": "gempa"`); glifnya di `scripts/glif.json`.

| Konsep | Glif |
| --- | --- |
| `gempa` | `deck:gempa` |
| `tsunami` | `khusus:tsunami` |
| `gunungapi` | `lucide:mountain` |
| `likuefaksi` | `khusus:likuefaksi` |
| `banjir` | `deck:banjir` |
| `longsor` | `khusus:longsor` |
| `cuaca-ekstrem` | `lucide:cloud-lightning` |
| `gelombang-abrasi` | `khusus:abrasi` |
| `rob` | `khusus:rob` |
| `kekeringan` | `lucide:sun` |
| `karhutla` | `deck:api` |
| `pandemi` | `lucide:virus` |
| `kebakaran-industri` | `lucide:factory` |
| `kebakaran-tpa` | `deck:sampah` |
| `konflik-sosial` | `khusus:konflik` |
| `air-baku` | `lucide:droplet` |
| `irigasi` | `lucide:sprout` |
| `bendungan` | `khusus:bendungan` |
| `air-tanah` | `khusus:sumur` |
| `penurunan-muka-tanah` | `khusus:gnss` |
| `jiwa` | `deck:orang` |
| `rumah` | `deck:rumah` |
| `pengungsi` | `deck:tenda` |
| `kesehatan` | `deck:hati` |
| `sekolah` | `lucide:school` |
| `luas` | `lucide:land-plot` |
| `wilayah` | `lucide:map-pin` |
| `lembaga` | `lucide:landmark` |
| `kalender` | `deck:kalender` |
| `ringkasan` | `lucide:list-checks` |
| `peringatan` | `lucide:triangle-alert` |
| `prabencana` | `lucide:shield-check` |
| `tanggap-darurat` | `lucide:siren` |
| `pascabencana` | `lucide:hammer` |
| `regulasi` | `lucide:scale` |
| `data` | `lucide:database` |
| `infrastruktur` | `lucide:construction` |
| `kapasitas` | `lucide:graduation-cap` |
| `pembiayaan` | `lucide:banknote` |
| `naik` | `khusus:segitiga-naik` |
| `turun` | `khusus:segitiga-turun` |

## Kajian dan penamaan berkas (`kajian`)

Spek menulis `"kajian": "<kunci>"`; kunci harus ada di sini. Judul sampul, subjudul, judul pendek, kata kunci properti PPTX, dan nama berkas bawaan (`nama_berkas`, `{DDMMYY}` diganti tanggal spek) dibaca dari entri ini. Deck baru di luar tiga kajian: tambahkan entri baru ke tema.json proyek (salin bentuk entri di bawah).

```json
{
 "air": {
  "judul": "Grand Design Ketahanan Air Pulau Jawa 2026–2030",
  "subjudul": "Pengelolaan Air pada Musim Kemarau dan Musim Hujan untuk Pengurangan Risiko Bencana",
  "judul_pendek": "Kajian Ketahanan Air Pulau Jawa",
  "nama_berkas": "Kajian Ketahanan Air Pulau Jawa {DDMMYY}",
  "batas_halaman_isi": null,
  "lampiran": "ABCDEFGHIJKL",
  "kata_kunci": [
   "BNPB",
   "penanggulangan bencana",
   "ketahanan air",
   "Pulau Jawa",
   "grand design",
   "musim kemarau",
   "musim hujan"
  ],
  "cakupan_sampul": "Cakupan: seluruh kabupaten/kota di enam provinsi Pulau Jawa dan lima komponen air pada musim kemarau dan musim hujan."
 },
 "mitigasi": {
  "judul": "Grand Design Mitigasi Bencana Indonesia 2026–2030",
  "subjudul": "Strategi Prabencana, Tanggap Darurat, dan Pascabencana",
  "judul_pendek": "Kajian Mitigasi Bencana Indonesia",
  "nama_berkas": "Kajian Mitigasi Bencana Indonesia {DDMMYY}",
  "batas_halaman_isi": null,
  "lampiran": "ABCDEFGHIJKL",
  "kata_kunci": [
   "BNPB",
   "penanggulangan bencana",
   "mitigasi bencana",
   "Indonesia",
   "grand design",
   "skenario terburuk",
   "prabencana"
  ],
  "cakupan_sampul": "Cakupan: seluruh kabupaten/kota di Indonesia dan seluruh jenis bencana menurut UU 24/2007 pada tiga tahap penanggulangan."
 },
 "rehab": {
  "judul": "Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030",
  "subjudul": "Sistem Perpipaan, Pemanfaatan Air Tanah, dan Jembatan untuk Pemulihan Daerah Terdampak Bencana",
  "judul_pendek": "Kajian Rehabilitasi dan Rekonstruksi Air dan Akses",
  "nama_berkas": "Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026-2030",
  "batas_halaman_isi": null,
  "lampiran": "ABCDEFGHIJKLMN",
  "kata_kunci": [
   "BNPB",
   "penanggulangan bencana",
   "rehabilitasi dan rekonstruksi",
   "pascabencana",
   "grand design",
   "jembatan",
   "air tanah",
   "sistem penyediaan air minum"
  ],
  "cakupan_sampul": "Cakupan: 38 provinsi dan 514 kabupaten/kota, akses (jembatan), air perpipaan, dan air tanah pada tiga lapis waktu pemulihan."
 },
 "penerbit": "Badan Nasional Penanggulangan Bencana",
 "terbit": "Oktober 2026"
}
```

## Kepala dan kaki (`header_footer`)

```json
{
 "header": {
  "baris1": "{judul_pendek}",
  "baris2": "BNPB | {terbit}",
  "logo": "logo/sumber-bnpb.png",
  "tanpa_di": [
   "sampul",
   "sampul-belakang",
   "pembatas-lampiran"
  ]
 },
 "footer": {
  "baris": [
   "Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120",
   "Call Center 117, www.bnpb.go.id"
  ],
  "nomor": "kanan, bidang PAGE",
  "tanpa_di": [
   "sampul",
   "sampul-belakang",
   "pembatas-lampiran"
  ],
  "_aturan": "KEPUTUSAN T4; kaki dua baris menambah tinggi kaki sekitar 4 mm, masih di dalam margin bawah 2,0 cm"
 },
 "penomoran": {
  "sampul": "tanpa",
  "bagian_depan": "romawi-kecil",
  "isi": "arab",
  "mulai_arab": "bab-1",
  "objek": "per-bab",
  "objek_lampiran": "per-kode"
 },
 "sampul_belakang": [
  "Badan Nasional Penanggulangan Bencana",
  "Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120",
  "Call Center 117",
  "www.bnpb.go.id",
  "persuratan@bnpb.go.id"
 ]
}
```

## Blok `qa` (ambang gerbang)

```json
{
 "pustaka": {
  "_catatan": "L65 Buku Pegangan: ambang kajian final (manifest pustaka.status final); draf hanya diperiksa keutuhan kunci",
  "bab_min": 8,
  "kajian_min": {
   "air": 50,
   "mitigasi": 80,
   "rehab": 50
  },
  "resmi_primer_min_persen": 50
 },
 "_catatan": "Kenop gerbang qa/periksa.py yang bukan token desain. Nama gaya dicocokkan ke rantai gaya Word tanpa beda huruf; kepala kolom ke teks kepala yang dikapitalkan.",
 "gaya_kapital_boleh": [
  "Label Bagian",
  "Kepala Tabel",
  "Pil",
  "Label Pita",
  "Judul Bagian Depan",
  "Judul Daftar Isi"
 ],
 "gaya_pustaka": [
  "Pustaka",
  "Bibliography"
 ],
 "kolom_tanpa_rata_kanan": [
  "NO",
  "NO.",
  "PERINGKAT",
  "KODE",
  "BAB",
  "REK",
  "REGISTER",
  "REK KAJIAN AIR",
  "TINDAK LANJUT",
  "LAPIS"
 ],
 "kata_cacah": [
  "kejadian",
  "jiwa",
  "orang",
  "KK",
  "desa",
  "kab/kota",
  "kabupaten",
  "kota",
  "provinsi",
  "rumah",
  "unit",
  "ha",
  "km",
  "km²",
  "titik",
  "korban",
  "pengungsi",
  "sekolah",
  "faskes",
  "kasus",
  "liter",
  "tangki",
  "banjir",
  "longsor",
  "gempa",
  "kebakaran",
  "letusan"
 ],
 "cut_off_teks": "CUT OFF DATA",
 "panel_tinggi_min_pt": 48,
 "jarak_tepi_bawah_panel_pt": 7,
 "irisan_toleransi_pt": 1,
 "logo_toleransi_mm": 0.5
}
```

