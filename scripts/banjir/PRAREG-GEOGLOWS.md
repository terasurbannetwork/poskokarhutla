# Prapendaftaran: sinyal debit GEOGloWS (retrospektif) terhadap kejadian banjir kabupaten-hari

Status: DIBEKUKAN 11 Nov 2026, sebelum satu pun skor GEOGloWS-lawan-label dilihat pembuat. Pembuat sudah mengenal label (`label_bersatu_v2`) dan
tahu hanya 28 dari 46 ruas jatuh di dalam poligon kabupaten, tetapi belum pernah memasangkan deret debit dengan label. Pola dan ukuran mengikuti
`PRAREG-FLOODHUB.md` dan `PRAREG-DEBIT.md`. Penilai: `scripts/banjir/uji_geoglows.py` (keluaran `public/banjir/data/uji_geoglows.json`).
Ruas dan periode ulang: `scripts/banjir/geoglows_ruas.json` (dibuat `geoglows.py pilih`, tidak disunting di sini).

## 0. Batas yang dinyatakan di muka (jujur)

1. **Ini BUKAN uji ramalan.** Yang tersedia gratis dan panjang adalah *retrospectivedaily* GEOGloWS: simulasi hidrologi yang dipaksa reanalisis
   ERA5, bukan ramalan 15 hari yang pernah diterbitkan. Uji ini hanya menjawab: "bila model GEOGloWS benar-benar mensimulasikan debit >= T2 di ruas
   itu, apakah kabupatennya berlabel banjir sekitar hari itu?" Itu batas ATAS atas keterampilan ramalan (ramalan memakai hujan prakiraan
   dan pasti lebih buruk). Lulus uji ini TIDAK cukup untuk memasang ramalan ke `status.json`; ia hanya membuka langkah berikutnya
   (arsip ramalan prospektif). Tidak lulus berarti sinyal hidrologinya sendiri tak berguna di skala kabupaten.
2. **Sampel kecil.** Dari 46 ruas, hanya yang titiknya jatuh DI DALAM poligon kabupaten dan bukan ruas kecil (median historis >= 1 m3/s) yang masuk
   uji utama: kira-kira 9 ruas (7 sungai induk, Cisadane Batu Belah, dan Karet). Ruas kecil (kanal Jakarta/Tangerang, median < 1) dilaporkan
   deskriptif saja karena simulasi global bias di sana (`geoglows.py`). Satu titik ruas = satu kabupaten; sungai besar yang menguras banyak kabupaten
   hanya diuji lawan kabupaten tempat titiknya berada (undercount kejadian hulu).
3. **Periode ulang dihitung sendiri** (Gumbel, `geoglows.periode_ulang`, 1990 sampai kini) dari deret simulasi yang sama dengan yang diuji, termasuk
   2016-2025: T2 itu tidak memakai label, jadi tidak menyetel apa pun terhadap label, tetapi ia in-sample terhadap deret debit.
4. **Label 2024-2025 sudah terbakar** untuk model kab-hari (daftar buka). Sinyal ini tidak dilatih (nol parameter yang disetel), jadi tahun-tahun itu
   dipakai, tetapi vonisnya tidak boleh dibaca sebagai uji prospektif murni; dilaporkan dengan label itu.

## 1. Pertanyaan

Apakah hari ketika debit retrospektif ruas >= T2 (periode ulang 2 tahun, Gumbel) menambah daya pisah kejadian banjir kab-hari di atas dua pembanding
sederhana (klimatologi bulanan dan persistensi)? Satu hipotesis, satu kontras, jadi tidak ada koreksi Bonferroni (m = 1, selang 95%).

## 2. Data dan definisi (beku)

- **Sinyal:** unit = (ruas, hari). `s(d) = 1` bila debit harian retrospektif `Q(d) >= rp["2"]` dari `geoglows_ruas.json` (sha256 dicatat di keluaran).
  Hari = tanggal UTC deret GEOGloWS diperlakukan sama dengan tanggal WIB label (selisih <= 7 jam, di bawah resolusi jendela).
- **Ruas masuk:** `rp` ada, dan titik (lat, lon) ruas berada di poligon kabupaten (`floodhub.Kab.repo`, kunci `pp|Nama`). Uji utama: median historis
  >= 1 m3/s. Ruas lain: lapis deskriptif (bukan vonis). Ruas yang tidak masuk dicatat beserta alasannya di `reach_keluar`.
- **Kabupaten ruas:** kabupaten yang memuat titik ruas (satu kabupaten per ruas). Tidak ada penambahan kabupaten tetangga atau hilir.
- **Periode:** 2016-01-01 s.d. 2025-12-31 (tahun padat DIBI dan Groundsource pada `label_bersatu_v2`). 2026 dikeluarkan (parsial, DIBI belum terisi).
  Hari dalam +-2 hari dari jendela uji J3 terkunci dibuang.
- **Label:** `data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz` (sha256 dicatat), baris berkeyakinan **TINGGI atau SEDANG** (grup RESMI, atau RESMI
  dengan sumber lain), `jendela_j3 = 0`. RENDAH (hanya media/warga) TIDAK dihitung sebagai positif. `y(d) = 1` bila ada tanggal jangkar kejadian di
  kabupaten itu dalam d-2 .. d+2 (selang plus minus 2 hari seperti Nearing et al. 2024; sama dengan `PRAREG-FLOODHUB.md`).
  Hari tanpa label bukan bukti nol (DIBI kurang lapor): negatif lemah, diakui di §6.

## 3. Pembanding dan skor

1. **Klimatologi:** `p0(ruas, hari)` = frekuensi `y = 1` pada (ruas, bulan kalender) di tahun LAIN (leave-one-year-out; tidak ada riwayat sebelum 2016
   sehingga bentuk ekspansif tidak mungkin). Tahun hari yang dinilai tidak pernah ikut menghitung `p0`-nya.
2. **Persistensi:** kabupaten dengan jangkar label pada hari d-1 (jendela y menutup d-1, jadi pembanding ini diuntungkan: konservatif bagi sinyal).

Ukuran, identik dengan `PRAREG-FLOODHUB.md`: **ETS pada jumlah alarm sama.** `K_d` = jumlah ruas bersinyal pada hari d; tiap pembanding mengalarm `K_d`
ruas teratas menurut skornya (klimatologi: p0; persistensi: label d-1, lalu p0; seri dipecah kunci ruas). `dETS = ETS(sinyal) - ETS(pembanding)`,
kontingensi digabung atas semua (ruas, hari) terhitung. Top-K dihitung SEBELUM bootstrap. POD, FAR, CSI dilaporkan, bukan kriteria.
**Bootstrap:** dua skema blok, 5.000 ulangan, biji 11: (1) ruas x tahun, (2) minggu ISO (korelasi antar-ruas pada satu sistem cuaca). Batas bawah =
yang lebih kecil dari dua skema, batas atas = yang lebih besar. Selang 95%.

## 4. Vonis (utama = ruas besar masuk, semua)

- **LULUS** bila batas bawah dETS > 0 terhadap KEDUA pembanding.
- **TIDAK LULUS** bila dETS titik <= 0 terhadap salah satu, atau batas atas < 0 terhadap salah satu.
- **TIDAK MEYAKINKAN** selain itu.
- **Daya:** `y = 1` pada himpunan dinilai < 300 atau alarm sinyal < 30 (ruas-hari): "(daya rendah)" pada vonis selain TIDAK LULUS;
  `y = 1` < 100 atau alarm < 10: "tidak dapat dinilai".
- Lapisan deskriptif (tanpa vonis): sungai induk saja, pos SIHKA besar saja, ruas kecil, dan ambang T5. Lapisan tidak boleh dipakai menyelamatkan
  vonis utama.
- Lulus (apa pun dayanya) hanya berarti sinyal retrospektif layak diteruskan ke langkah berikutnya: arsip ramalan harian prospektif
  `geoglows.json` dibandingkan dengan label baru. Status resmi `status.py` tidak ditimpa.

## 5. Urutan dan aturan kegagalan

`uji_geoglows.py ambil` (unduh, boleh diulang), lalu `nilai` dijalankan SEKALI: penanda `uji_geoglows.buka` ditulis O_EXCL (dengan sha256 label,
ruas, skrip) sebelum metrik pertama; jalan kedua ditolak. Aturan, ambang, jendela, periode, dan pembanding tidak diubah setelah dibuka; perubahan =
amandemen tertulis (berkas amandemen sendiri) dan penanda baru. Vonis ditulis apa adanya.

## 6. Kejujuran dan batas

- Titik ruas = satu kabupaten; debit sungai besar di muara tidak mewakili banjir di hulunya. Pemetaan titik ke poligon kasar.
- DIBI kurang lapor dan negatif bias media; alarm palsu terukur kemungkinan lebih buruk dari kenyataan. Selang +-2 hari menggembungkan ETS semua
  pembanding sama rata.
- Genangan perkotaan (kanal Jakarta) tidak ditangkap debit sungai global.
- Sampel ruas kecil (tanda daya rendah hampir pasti); perolehan statistik utama dari satu dua kabupaten tidak boleh digeneralisasi.
