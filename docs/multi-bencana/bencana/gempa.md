# Gempa bumi & tsunami

Status registry: belum ada (akan `uji` di ALUR tahap 3). Pengerja: `gempa`. Urutan: 2.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` | `gempa` |
| `nama` / `nama_en` | Gempa Bumi & Tsunami / Earthquake & Tsunami |
| `rute` / `data` | `/gempa/` / `/gempa/data/` |
| `kejadian.awalan` | `G` (G0001) |
| `tab` | ringkasan, peta, insight, berita, tren, kejadian, posko, dampak, metode, sim, informasi, foto |
| `cron_worker` | tiap 60 detik: BMKG `autogempa` (dengan ETag); tiap 5 menit: `gempaterkini`, `gempadirasakan`, USGS `4.5_day`, PTWC Atom |
| Workflow | `gempa.yml` harian 01.10 UTC (riwayat, susulan, risiko, dampak, berita); bulanan untuk lapisan statis |

## 2. Status: resmi dulu, indeks sendiri sesudahnya

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Status resmi tsunami | BMKG `Potensi` + PTWC | Pita teratas di peta dan laci: "BMKG: tidak berpotensi tsunami" atau peringatan apa adanya, dengan jam terbit. Tidak pernah diturunkan atau ditafsirkan ulang |
| Besaran resmi | BMKG `Magnitude`, `Kedalaman`, `Dirasakan` (MMI) | Angka utama laci |
| PAGER | USGS `alert` | Label "USGS PAGER" |
| **Tingkat Pantau Bencana** (pelengkap) | Aturan §4 | Normal / Waspada / Siaga / Awas per kabupaten untuk 72 jam ke depan, dari perkiraan guncangan + peluang susulan + kerentanan |

## 3. Kejadian (padanan kompleks api)

- **Definisi**: satu gempa utama M ≥ 5 (atau dirasakan BMKG) beserta gempa susulannya. Jendela
  pengelompokan memakai metode Reasenberg (1985) atau jendela Gardner-Knopoff ASLI (jarak
  `10^(0,1238·M + 0,983)` km, waktu bertingkat menurut M), dipilih di tahap riset dan dikalibrasi
  dari katalog USGS 2000–2022; parameternya ditulis di Metode. Untuk tampilan "kejadian aktif",
  jendela tampil dipotong 72 jam (7 hari bila M ≥ 6,5) walau jendela pengelompokan lebih panjang.
  Gempa yang masuk jendela gempa sebelumnya digabung sebagai susulan, bukan kejadian baru.
- **Kode**: `G` + nomor urut stabil; kunci alami = id USGS/BMKG gempa utama.
- **Masa aktif**: 72 jam sejak gempa terakhir di kelompok itu, diperpanjang 7 hari bila M utama ≥ 6,5.
- **Atribut** (A05): M, jenis magnitudo, kedalaman, waktu, episentrum, wilayah BMKG, MMI maks
  resmi, daftar tempat dirasakan, bendera tsunami, jumlah susulan, susulan terbesar, peluang
  susulan M≥5 dalam 7 hari (§5), penduduk per kelas MMI perkiraan, fasilitas di zona MMI ≥ VI,
  sesar terdekat, kecamatan terdampak, riwayat gempa ≥ M6 radius 100 km sejak 1900, kelas InaRISK.
- **Geometri** (A06): isoseismal MMI perkiraan (§5) sebagai poligon bertingkat; bila USGS ShakeMap
  ada, pakai `cont_mmi.json` dan beri label sumbernya.

## 4. Aturan tingkat Pantau Bencana (A13)

Per kabupaten, horizon 72 jam:

| Tingkat | Syarat (salah satu) |
| --- | --- |
| Awas | MMI perkiraan ≥ VII di kabupaten, ATAU peringatan tsunami resmi aktif untuk pantainya |
| Siaga | MMI ≥ VI, ATAU peluang susulan M≥6 dalam 7 hari ≥ 10% dengan kabupaten di radius susulan |
| Waspada | MMI ≥ V, ATAU peluang susulan M≥5 ≥ 30% |
| Normal | lainnya |

Ambang final ditetapkan dari uji balik (§6), bukan dari tabel ini. Tabel ini hipotesis awal.

## 5. Model (B01)

1. **Perkiraan guncangan**: GMPE sederhana jarak-hiposenter → PGA/PGV → MMI lewat GMICE Worden et al.
   2012 atau Wald et al. 1999; koreksi tapak memakai kelas Vs30 kasar (topografi, Wald & Allen 2007)
   bila datanya bisa dipanen sekali; jika tidak, tanpa koreksi tapak dan ditulis di Batasan.
   Dihitung per pusat kecamatan (7.274 titik).
2. **Susulan**: Reasenberg-Jones dengan parameter generik (a = −1,67, b = 0,91, p = 1,08,
   c = 0,05 hari), dikalibrasi ulang untuk Indonesia dari katalog USGS 2000–2022. Keluaran:
   P(M≥5) dan P(M≥6) dalam 1, 3, 7 hari.
3. **Waktu tiba tsunami** (ditunda, setelah rilis pertama): perambatan Huygens di kisi batimetri
   kasar; butuh berkas batimetri berlisensi terbuka. Sampai ada, laci menampilkan status resmi saja.
4. **Tidak dibuat**: prakiraan gempa utama. Ditulis tegas di Metode: tidak ada yang bisa
   meramal gempa utama, termasuk situs ini.

## 6. Uji balik (B02)

| Yang diuji | Kebenaran | Ukuran | Pembagian |
| --- | --- | --- | --- |
| MMI perkiraan | `Dirasakan` BMKG (MMI per tempat) dan USGS DYFI `cdi` | Bias, RMSE per kelas, % tepat ±1 kelas | Latih 2008–2019, validasi 2020–2022, uji 2023–2026 dibuka sekali |
| Peluang susulan | Hitungan susulan nyata 7 hari setelah tiap M ≥ 6 (USGS) | Log-likelihood Poisson, kalibrasi (diagram reliabilitas) | idem |
| Tingkat Pantau Bencana | Kejadian DIBI gempa (korban/kerusakan per kabupaten) | POD, FAR, CSI | idem |
| Prospektif (B03) | Tiap gempa M≥5 baru: catat prakiraan susulan saat itu, nilai 7 hari kemudian | idem | Append-only |

## 7. Layar

**Lapisan (C08)**

| Kelompok | Lapisan |
| --- | --- |
| Kejadian & respons | Gempa (lingkaran ukuran M, warna kedalaman), susulan, isoseismal, kejadian G, posko, foto |
| Bahaya statis | Sesar aktif (Pusgen 2017, bila lisensinya terbuka), InaRISK gempa, InaRISK tsunami, zona subduksi |
| Riwayat | Gempa ≥ M6 sejak 1900, kepadatan kejadian 0,1° |
| Infrastruktur | RS, sekolah, jembatan, bandara (data statis bersama) |

**Panel kiri (C05)**: mode Sekarang (gempa 24 jam/72 jam/7 hari, urut waktu), Riwayat, Kejadian.
Rentang (C06): 24 jam / 72 jam / 7 hari / 30 hari.

**Laci kejadian (C12)**, urutan bagian:
1. Status resmi tsunami (pita)
2. Gempa saat ini: M, kedalaman, jam WIB/WITA/WIT setempat, lokasi, MMI resmi
3. Dirasakan di: daftar tempat dan MMI-nya
4. Perkiraan guncangan per kabupaten (tabel kelas MMI, penduduk)
5. Susulan: hitungan sejauh ini + peluang 1/3/7 hari dengan selang
6. Penjelasan tingkat (aturan §4 dengan angka hari ini)
7. Tindakan yang disarankan per tingkat (sumber: pedoman BNPB/BMKG) — dibuat, **disembunyikan**
   seperti di karhutla sampai pemilik membukanya
8. Respons terdekat: BPBD, RS, posko — idem, disembunyikan
9. Bahaya InaRISK di lokasi
10. Riwayat gempa besar di sekitar (sejak 1900)
11. Bagikan `/gempa/k/G0001`, Google Maps

**Insight (C14)**, minimum:
- Gempa per hari, 30 hari terakhir (M per kelas)
- Peta kepadatan gempa per provinsi tahun berjalan vs rata-rata 2000–2025
- Distribusi magnitudo (Gutenberg-Richter) dengan nilai b per wilayah
- Kedalaman vs magnitudo
- Gempa merusak sejak 2000: korban dan kerusakan (DIBI)
- Kinerja model: MMI perkiraan vs dirasakan, kalibrasi susulan (B09, apa adanya)
- Tabel kejadian G

**Tren (C18)**: indeks risiko riwayat gempa 0–100 per kab/kec (kekerapan M≥5, besaran maks, tren),
tanpa kalender musim (gempa tidak bermusim: A16 "tidak berlaku").

**Dampak (C20)**: penduduk per kelas MMI, sekolah dan RS di MMI ≥ VI, bangunan rentan (bila ada data
terbuka), jalan dan jembatan, perkiraan kerugian ekonomi kelas PAGER, pengungsi (BNPB bila terbit).

**Dashboard (C21)**: I situasi (gempa 24 jam, kejadian aktif, status tsunami), II keputusan hari ini
(kabupaten Siaga/Awas), III 72 jam (peluang susulan), IV sentimen media, V sumber daya (BPBD, RS,
posko), VI sumber.

**Metode (C22)**: magnitudo dan MMI, jendela susulan, GMPE + GMICE dengan contoh hitung gempa hari
ini, Reasenberg-Jones dengan contoh, aturan tingkat, uji balik, kenapa gempa tidak bisa diramal,
batasan (tanpa koreksi tapak, katalog tidak lengkap untuk M < 5 sebelum 2008).

**Simulasi (C23)**: "Bagaimana kalau": pengguna memilih titik + M + kedalaman, layar menghitung
isoseismal dan penduduk terpapar dengan model yang sama (Python↔JS setara, B07).

**Posko dan sarana (A21–A25, C19)**: titik pengungsian dari greedy coverage penduduk MMI ≥ VI;
kebutuhan tenda, air bersih, tim SAR, alat berat per 1.000 pengungsi (koefisien bersumber Sphere
Handbook / Perka BNPB); Keputusan: biaya respons cepat vs kerugian tertunda (Monte Carlo lo/mid/hi).

## 8. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga (C24) | Jenis baru `guncang` (sub: terasa, kuat, barang jatuh, retak dinding, roboh) dengan isian MMI sederhana bergambar; `tsunami_amat` (sub: air surut, air naik, genangan). Jenis umum tetap. Laporan guncang dekat gempa ≤ 15 menit diberi lencana "cocok dengan gempa BMKG" (padanan lencana satelit) |
| Foto (C25) | Kategori: kerusakan bangunan, retakan tanah, longsoran, pengungsian, genangan tsunami, lainnya. Dummy: 100 foto gempa/tsunami berlisensi bebas dari Wikimedia Commons |
| Pop-up situasi (C26) | Gempa terasa dalam 24 jam di provinsi pengguna (bila diizinkan lokasi kasar) atau nasional, kejadian aktif, status tsunami |
| Berita (A33) | Kueri: gempa, gempa susulan, tsunami, BMKG gempa, likuifaksi, pengungsi gempa; topik: kerusakan, korban, bantuan, susulan, hoaks gempa |
| OG (C28) | `/gempa/`, `/gempa/k/G0001` (peta isoseismal + angka), per provinsi |
| i18n (C29) | Glosarium: magnitudo, MMI, episentrum, hiposenter, susulan, InaTEWS, "tidak berpotensi tsunami" = "no tsunami potential" (istilah BMKG berbahasa Inggris) |

## 9. Daftar periksa PAKET-FITUR

Rencana awal; diperbarui tiap tahap ALUR. `R` = rencana dibuat, `A` = diadaptasi, `T` = tidak berlaku.

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R BMKG 3 berkas + USGS + EMSC | A14 | R Awas/Siaga prioritas | A27 | A dampak gempa §7 |
| A02 | R gempa24/72/30hari | A15 | R | A28 | R |
| A03 | R cron 1 menit | A16 | T gempa tidak bermusim | A29 | R |
| A04 | R kejadian G | A17 | T tidak bergantung ENSO | A30 | R |
| A05 | R §3 | A18 | R USGS sejak 1900 | A31 | T simulasi tidak butuh cuaca |
| A06 | R isoseismal / ShakeMap | A19 | R | A32 | A citra sebelum/sesudah untuk M ≥ 6,5 saja |
| A07 | R | A20 | R BMKG + PAGER + BNPB | A33 | R |
| A08 | T cuaca bukan pemicu | A21 | R pengungsian | A34 | R |
| A09 | A MMI perkiraan sebagai indeks | A22 | A kebutuhan tenda/air/SAR | A35 | A bandara tutup (NOTAM bila ada) |
| A10 | T tidak ada ansambel gempa | A23 | T | A36 | R `factsheet_gempa.json` |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | A mitigasi bangunan & latihan evakuasi | A38 | R sesar, InaRISK |
| A13 | R §4 | A26 | T | | |
| B01 | R §5 | B05 | R pendorong kerusakan | B09 | R |
| B02 | R §6 | B06 | R tren kekerapan | B10 | R `RISET-GMPE.md`, `RISET-SUSULAN.md` |
| B03 | R | B07 | R simulasi | | |
| B04 | R gempa merusak 2000– | B08 | R selang susulan | | |
| C01–C15 | R | C16 | R cerita "gempa yang mengubah Indonesia" | C17–C22 | R |
| C23 | R §7 Simulasi | C24–C35 | R | | |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R (D09: dummy `kejadian_langsung` gempa) | E01–E10 | R | F01–F04 | R |
