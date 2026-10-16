# Gunung api

Pengerja: `gunungapi`. Urutan: 5. Risiko utama: MAGMA tidak punya API terbuka, sehingga pemanen
HTML bisa patah. Siapkan cadangan (GDACS) dan `uji` dengan contoh HTML tersimpan.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `gunungapi` / `/gunungapi/` |
| `kejadian.awalan` | `V` |
| `cron_worker` | tiap 5 menit: MAGMA informasi letusan + VONA; tiap 30 menit: GDACS VO |
| Workflow | `gunungapi.yml` tiap 6 jam (level semua gunung, angin lapisan atas, sebaran abu); bulanan (KRB, katalog GVP) |

Bahan yang sudah ada: `GUNUNG_API` (40 gunung, GVP) di `scripts/data/aturan.py`, dipakai untuk
membuang titik panas vulkanik dari karhutla. Dipindah ke `scripts/umum/` dan diperluas ke 127
gunung api aktif Indonesia.

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| **Level resmi PVMBG** I Normal, II Waspada, III Siaga, IV Awas + radius rekomendasi km | MAGMA | Status utama, warna dan nama persis PVMBG. **Tidak ada tingkat buatan Pantau Bencana untuk gunung api**: level PVMBG dipakai apa adanya |
| VONA (hijau/kuning/oranye/merah) | MAGMA VONA | Label "untuk penerbangan" |
| GDACS | `alertlevel` | Pembanding, diberi label |

Tingkat per kecamatan (untuk peta) = level gunung bila kecamatan di dalam radius rekomendasi
atau KRB; ini turunan geometri, bukan penilaian ulang.

## 3. Kejadian

Gunung dengan level ≥ II, atau meletus dalam 24 jam. Kode `V` + nomor GVP (stabil). Atribut: nama,
level, tanggal perubahan level terakhir, letusan terakhir, tinggi kolom abu (m di atas puncak),
warna dan arah abu, kode VONA, radius rekomendasi, KRB, penduduk dalam radius dan KRB per tingkat,
desa terdampak, bandara dalam arah abu, riwayat letusan GVP sejak 1900.

## 4. Model dan uji balik

- **Sebaran abu indikatif**: kerucut 2D dari tinggi kolom (VONA) + angin 700/500/300 hPa
  Open-Meteo, interpolasi menurut ketinggian kolom; label tegas "indikatif, bukan VAAC". Python↔JS setara.
- **Uji balik**:
  1. Arah abu perkiraan vs arah yang tertulis di VONA, letusan Semeru, Merapi, Ruang, Lewotobi,
     Marapi 2018–2026 (selisih sudut).
  2. Hubungan level vs letusan: seberapa sering kenaikan level diikuti letusan ≤ 7 hari (GVP).
     Ini informasi, bukan model prakiraan; Pantau Bencana tidak meramal letusan.
- **Prospektif**: catat arah abu perkiraan tiap VONA baru, nilai terhadap VONA berikutnya.

## 5. Layar

- **Lapisan**: gunung api (ikon warna level), radius rekomendasi, KRB I/II/III, kerucut abu, VONA,
  angin lapisan atas, InaRISK gunung api, bandara, desa.
- **Laci**: level resmi + radius (pita) → letusan terakhir dan VONA → rekomendasi PVMBG apa adanya
  → kerucut abu + bandara di jalurnya → penduduk dan desa per KRB → jalur evakuasi dan titik kumpul
  → riwayat letusan → bagikan `/gunungapi/k/V263250`.
- **Insight**: jumlah gunung per level dari waktu ke waktu, letusan per tahun sejak 1900,
  durasi level III/IV, kinerja arah abu, tabel gunung.
- **Tren**: indeks risiko riwayat per kecamatan (kekerapan letusan gunung terdekat, VEI maks,
  penduduk); kalender musim T (letusan tidak bermusim).
- **Dampak**: penduduk per KRB, pengungsi (BNPB), bandara tutup, lahan pertanian terkena abu,
  sekolah, kerugian.
- **Simulasi**: kerucut abu "bagaimana kalau" dengan tinggi kolom pilihan pengguna.
- **Posko**: titik pengungsian di luar radius rekomendasi dengan greedy coverage desa di dalam
  radius; kebutuhan masker, air bersih, tenda.

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `abu` (hujan abu tipis/tebal), `lahar` (aliran di sungai), `gemuruh` (suara/getaran) |
| Foto | kolom abu, hujan abu, lahar, pengungsian, lainnya |
| Pop-up | Gunung yang naik level, letusan 24 jam, bandara terdampak abu |
| Berita | erupsi, status gunung, hujan abu, lahar dingin, VONA |
| OG | per gunung, per provinsi |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R MAGMA HTML + GDACS | A14 | A level ≥ III = prioritas | A27 | R |
| A02 | R | A15 | R | A28 | R |
| A03 | R cron 5 menit | A16 | T | A29 | R |
| A04 | R gunung = kejadian | A17 | T | A30 | R |
| A05 | R | A18 | R GVP | A31 | R angin lapisan atas |
| A06 | R radius/KRB/kerucut | A19 | R | A32 | R citra sebelum/sesudah |
| A07 | R | A20 | R PVMBG/VONA | A33 | R |
| A08 | R angin | A21 | R | A34 | R |
| A09 | T level resmi dipakai | A22 | R masker/air/tenda | A35 | R penerbangan |
| A10 | T | A23 | A pangkalan helikopter evakuasi | A36 | R |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | R latihan evakuasi | A38 | R KRB |
| A13 | A turunan geometri level resmi | A26 | T | | |
| B01 | A kerucut abu | B02 | R arah abu + level | B03–B10 | R |
| C01–C22 | R | C23 | R kerucut abu | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |
