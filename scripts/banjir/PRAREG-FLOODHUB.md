# Prapendaftaran: sinyal sungai dan banjir bandang Google Flood Hub terhadap kejadian banjir kabupaten-hari

Status: DRAF, belum dibekukan, belum ditinjau validasi-model. Ditulis 1 Nov 2026, SEBELUM kunci Google Flood Forecasting API ada,
jadi belum ada satu pun respons, tingkat, atau poligon Flood Hub yang pernah dilihat pembuat. Pembuat sudah kenal label (DIBI,
arsip `/prediksi`) tetapi belum kenal sinyal Flood Hub; urutan pembekuan di §7 (uji asap, lalu sidik, lalu hari prospektif
pertama), dan rancangan ini tidak boleh disetel sesudahnya.
Pola dan ukuran mengikuti `PRAREG-DEBIT.md` dan `PRAREG-HULU.md`. Peta jalan: `docs/banjir/PETA-JALAN-MODEL-BANJIR.md` Tahap 3c.
Pengambil dan arsip: `scripts/banjir/floodhub.py`.

## 1. Pertanyaan

Dua hipotesis, dua kontras. Keduanya menguji tambahan daya pisah di atas acuan, bukan keterampilan mutlak:

- **(S) sungai:** apakah tingkat maksimum titik sungai Flood Hub di kabupaten (Peringatan, Bahaya, Ekstrem) menambah daya pisah
  kejadian banjir kabupaten-hari di atas acuan?
- **(B) bandang:** apakah poligon banjir bandang 24 jam yang menyentuh kabupaten menambah daya pisah di atas acuan?

Alasan: di Indonesia hampir semua titik Flood Hub adalah titik virtual HydroBASINS level 12 (id `hybas_5120...`, sumber HYBAS,
berlabel "akurasi rendah", peta genangan tidak didukung). Belum diketahui apakah sinyal setakat itu berguna di tingkat kabupaten.
Paper Nearing et al. 2024 (Nature) menilai kejadian dengan selang plus minus 2 hari; selang itu ditiru di §3.

## 2. Data

- **Sinyal:** arsip mentah R2 `poskokarhutla-foto/arsip/floodhub/YYYY/MM/DD/<HHMM>_<jenis>.json.gz` (HHMM dan YYYY/MM/DD dalam UTC,
  waktu mulai `tarik`, bukan `issuedTime`). Jenis: `status` (semua titik Indonesia), `flash` (peristiwa bandang), `poligon` (respons
  `serializedPolygons` mentah), `ambang` dan `prakiraan` (dilaporkan, TIDAK dipakai di S dan B), `riwayat` (status per hari dengan
  `cutoffTime` hari itu 23:59 UTC, jenis dan kunci R2 `2359_riwayat`, beda dari snapshot `tarik`). Periode prospektif HANYA
  menghitung berkas `status`, `flash`, `poligon` hasil `tarik`; `riwayat` tidak pernah mengisi hari prospektif (kode `riwayat`
  menolak tanggal >= hari snapshot harian pertama). Diturunkan oleh kode yang SAMA dengan ringkas publik
  (`floodhub.py`: `agregasi`, `Kab`, `cincin_kml`, `kab_poligon`); kode itu ikut disidik.
- **Peta ke kabupaten:** titik (lintang, bujur) ke kabupaten lewat `public/geo/kabupaten/*.json` (titik-dalam-poligon, kunci
  `pp|Nama`). Titik di luar semua poligon tidak dihitung. Bandang: poligon `likelyAffectedPolygonId` dan
  `highlyLikelyAffectedPolygonId` menyentuh kabupaten bila ada simpul atau titik kisi (langkah >= 0,02 derajat) di dalamnya;
  `eventPolygonId` tidak dihitung dan tidak diunduh (arti belum terverifikasi). Hanya peristiwa dengan `forecastIssueTime`
  dalam 24 jam sebelum waktu mulai snapshot yang dihitung (diterapkan juga di agregasi). Poligon yang bukan KML `<coordinates>` Indonesia dicatat "tak terurai"
  dan tidak dipetakan (`catatan`: "poligon #N tak terurai", tanpa id dari respons). Bila SEMUA poligon tak terurai sepanjang
  periode, B dinyatakan "tidak dapat dinilai". Poligon yang gagal diunduh atau terpotong kuota dicatat di `catatan` dan di
  kunci `_gagal` berkas `poligon`; hari itu B tidak terhitung (bolong, `bandang_sah: false`).
- **Tingkat titik:** `ABOVE_NORMAL` = Peringatan (1), `SEVERE` = Bahaya (2), `EXTREME` = Ekstrem (3), `NO_FLOODING` = normal (0),
  `UNKNOWN` dibuang. **S** = maksimum tingkat titik di kabupaten; kabupaten tanpa titik: S = 0 (dilaporkan sebagai "tanpa titik").
  **B** = 1 bila ada poligon terdampak yang menyentuh kabupaten pada snapshot itu, selain itu 0.
- **Unit:** kabupaten/kota (kunci `pp|Nama`) x hari kalender WIB.
- **Label:** DIBI banjir dan banjir bandang (`data/raw/banjir/dibi_tanggal.json`, jenis `{"banjir","bandang"}`, kejadian >= 1,
  dicocokkan seperti `model_kab.py`). `y(d) = 1` bila ada kejadian DIBI di kabupaten itu pada hari d, d+1, atau d+2 (WIB).
  Saat pembukaan, salinan `dibi_tanggal.json` dibekukan dan sha256-nya dicatat. Hari dinilai sampai 2027-04-30, dan hanya yang
  d+2 <= (tanggal DIBI terakhir salinan itu dikurangi 45 hari); hari yang labelnya belum matang tidak dihitung dan tidak
  diisi nol (30 Apr + 45 hari = 14 Jun, maka pembukaan paling cepat 2027-06-15). Logbook Pusdalops hanya KONTROL PEKA LABEL (§5), seperti `PRAREG-HULU.md`.

### 2.1 Aturan waktu (tegas)

Sinyal hari d (WIB) = snapshot `tarik` TERBESAR dengan waktu mulai dalam jendela (B-24 jam, B], B = d-1 17:00 UTC (= d 00:00 WIB;
WIB = UTC + 7). Snapshot terbesar itu harus lengkap (`status`, `flash`, `poligon`); bila tidak, hari d bolong. TIDAK ada fallback ke
snapshot yang lebih tua walau lengkap, dan berkas sesudah B diabaikan (`floodhub.pilih_snapshot`). Contoh: sinyal 2026-11-01 memakai
snapshot terbesar dalam (2026-10-30 17:00, 2026-10-31 17:00] UTC. Waktu mulai = nama berkas (UTC), bukan `issuedTime`. Cron harian 00:20
UTC berarti sinyal d umumnya berasal dari jalan harian d-1 pukul 07.20 WIB (jeda sekitar 16,7 jam). Sinyal memuat prakiraan 7 hari
Flood Hub untuk d..d+2; itu yang diuji, bukan nowcast saja. Hari prospektif sah = snapshot terpilih lengkap dan `poligon` tidak
bertanda `_gagal` (gagal unduh, terpotong kuota, atau pemetaan kena tenggat). Hari matang tanpa itu = bolong: dikeluarkan dari semua
kontras (dari B saja bila hanya poligon gagal), dicatat, TIDAK diisi dari hari lain. Penyebut persentase bolong = jumlah hari
matang. `riwayat` tidak pernah dipakai untuk hari prospektif. Sinyal arsip (hanya uji arsip, §4) hari d = berkas `riwayat` tanggal
d-2 (cutoff d-2 23:59 UTC = d-1 06:59 WIB), supaya jelas mendahului d tanpa bocoran.

## 3. Acuan dan skor

Tiga pembanding, ditetapkan sebelum data:

1. **Klimatologi:** p0(kab, d) = frekuensi kab-hari dengan y=1 (jendela d..d+2) pada bulan kalender yang sama; semesta = 514 kab/kota
   (tabel `scripts/prediksi/dasar.py`, yang membaca `scripts/udara/kota.json`; kunci `pp|Nama`) x semua hari DIBI 2016-01-01 sampai
   akhir tahun sebelum tahun d (tahun < tahun d). Bila kab itu < 10 kab-hari teramati, frekuensi nasional bulan itu. Tie-break akhir
   urutan alarm klimatologi: p0 nasional bulan itu, lalu kunci kab. Fungsi `p0` di `floodhub.py` (murni, diuji) dan `P0` di
   `floodhub_nilai.py` (diuji setara), keduanya disidik.
2. **Persistensi:** kabupaten dengan kejadian DIBI pada hari d-1. DIBI terlambat terbit, jadi saat hari d sebenarnya kejadian d-1 sering
   belum tercatat; memakai label yang sudah matang menguntungkan pembanding ini, sehingga pilihan ini konservatif bagi S dan B.
3. **Prakiraan banjir +1 hari `/prediksi`:** kode `BNJ`, tenggang +1, level `lv` dan peluang `ps` dari arsip append-only
   `public/prediksi/data/arsip/YYYY-MM.jsonl` (dibekukan sejak 2026-10-30, sebelum snapshot Flood Hub mana pun). Hanya ada
   pada periode prospektif; pada uji arsip pembandingnya hanya (1) dan (2). Kode kemendagri BNJ dipetakan ke `pp|Nama` dengan tabel
   kabupaten yang sama: `dasar.kab()` memberi pasangan kode kemendagri dan `pp|Nama` (`dasar.py` dan `kota.json` ikut disidik);
   pencocokan nama DIBI memakai aturan `uji_balik.peristiwa` / `model_kab.py` (juga disidik); label tetap `dibi_tanggal.json`. Hari tanpa baris BNJ
   dikeluarkan hanya dari kontras lawan BNJ. `ps` kosong: urutan BNJ = `lv` lalu p0. BNJ dibuat sekitar 09.30 WIB hari t-1 dan
   baru berjalan sejak 2026-10-30 (sedikit hari).

Ukuran (sama dengan `PRAREG-DEBIT.md`):
- **ETS pada jumlah alarm sama.** Alarm S = kabupaten dengan S >= 1 pada hari itu; alarm B = kabupaten dengan B = 1. Jumlah alarm
  hari itu K_d. Tiap pembanding mengalarm K_d kabupaten teratas menurut skornya sendiri (klimatologi: p0; persistensi: kejadian
  d-1 lalu p0; BNJ: `lv`, lalu `ps` kosong = -1, lalu p0; seri sisa dipecah dengan p0, lalu p0 nasional bulan itu, lalu kunci kabupaten). Hari dengan K_d = 0 tidak
  punya alarm di sisi sinyal dan tetap dihitung (a dan b nol). dETS = ETS(alarm sinyal) - ETS(alarm pembanding), kontingensi
  digabung atas semua kabupaten-hari terhitung.
- Top-K_d tiap pembanding dihitung SEBELUM bootstrap; resampling hanya memilih sel kab-hari (kontingensi dihitung ulang dari
  alarm yang sudah tetap). Tidak ada dBSS dan tidak ada model berparameter: kriteria utama S dan B hanya dETS.
- **Bootstrap:** DUA skema blok, 5.000 ulangan, biji 11, blok identik untuk semua pembanding: (1) kabupaten x musim-tahun (Okt-Mar
  bernama tahun awalnya dan Apr-Sep, jadi Jan-Mar 2027 satu musim dengan Nov 2026), (2) pulau x minggu ISO (menangkap korelasi
  antar-kabupaten pada satu sistem cuaca). Batas bawah yang dipakai = yang lebih KECIL dari dua skema, batas atas = yang lebih BESAR.
  **Bonferroni m = 2** (S dan B) pada alfa dua-sisi 5%, jadi tiap kontras memakai selang **97,5%** (persentil 1,25 dan 98,75). Tiga
  pembanding diuji sebagai irisan (S atau B harus unggul atas SEMUA pembanding), jadi tidak butuh koreksi tambahan atas pembanding.
  Penilai: `scripts/banjir/floodhub_nilai.py` (ikut disidik).

## 4. Lapisan dan periode

Dilaporkan, bukan vonis (penilai menghitung (b) saja; (a), (c), (d) menyusul bila field-nya terbukti ada): (a) titik terverifikasi
kualitas lawan tidak (S dihitung ulang dari `tingkat_terverifikasi`; bergantung pada field `qualityVerified` yang belum terverifikasi); (b) Jawa (kode provinsi 31-36) lawan luar Jawa;
(c) kabupaten bertitik lawan tanpa titik; (d) per jenis DIBI banjir lawan bandang.

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Uji arsip (S saja) | 2025-08-01 s.d. hari sebelum `awal_prospektif` | HANYA boleh menghentikan S; tanpa koefisien |
| Prospektif (S dan B) | dari `awal_prospektif` (hari WIB sesudah commit sidik) s.d. 2027-04-30 | vonis |

- Uji arsip dianggap TIDAK setara snapshot harian (arti `cutoffTime` belum terverifikasi; titik HYBAS yang sudah hilang atau diganti tidak
  muncul di arsip, jadi ada bias penyintas). Ia hanya boleh menghentikan S dengan vonis "tidak terbukti" bila dETS(S - klimatologi) <= 0
  DAN dETS(S - persistensi) <= 0 DAN kab-hari berlabel 1 di arsip >= 100; selain itu tanpa pengaruh. Tidak pernah menambah bukti
  LULUS dan tidak memasang koefisien apa pun.
- B tidak punya arsip (`flashFloods:search` hanya status terkini): langsung prospektif.
- Penilai `floodhub_nilai.py buka` menolak jalan sebelum 2027-06-15, sebelum `floodhub.sidik` utuh, sebelum salinan DIBI memuat
  kejadian >= 2027-06-16, dan bila `buka.json` sudah ada; penanda dan salinan DIBI (sha256) ditulis sebelum metrik pertama.
- Dibuka paling cepat **2027-06-15**, sekali, dengan manifest arsip R2 lengkap: daftar kunci `arsip/floodhub/` tiap hari
  prospektif, hari bolong dicatat dan tidak diisi. Bila hari bolong > 15% periode prospektif, atau ada bolong beruntun
  > 7 hari, vonis "tidak dapat dinilai".

## 5. Vonis

Per hipotesis (S dan B terpisah), pada kontras lawan SEMUA pembanding yang tersedia:
- **LULUS** bila batas bawah CI97,5 dETS > 0 terhadap TIAP pembanding yang tersedia.
- **TIDAK LULUS** bila dETS titik <= 0 terhadap salah satu pembanding, atau batas atas CI97,5 dETS terhadap salah satu < 0.
- **TIDAK MEYAKINKAN** selain itu.
- Kontrol peka label: hitung ulang dengan label DIBI ATAU logbook Pusdalops (hari tercakup saja). Bila kontrol berlawanan
  tanda sedangkan vonis LULUS, vonis ditulis "LULUS, PEKA LABEL" dan hanya boleh dipasang sesudah pemilik memutuskan.
  Kontrol tidak pernah dipakai menyelamatkan TIDAK LULUS.
- **Daya:** bila kab-hari y=1 pada himpunan dinilai (kab-hari dengan sinyal dan label ada) < 300, vonis selain TIDAK LULUS diberi
  "(daya rendah)"; bila < 100, vonis "tidak dapat dinilai". B juga "(daya rendah)" bila alarm B < 30 kab-hari. Tanpa simulasi pada data.
- Lulus berarti sinyal itu boleh dipasang sebagai pelengkap berlabel "model, akurasi rendah". Status resmi `status.py` tidak ditimpa.

## 6. Kejujuran, batas, dan butir yang menunggu bukti

1. Pembuat kenal label (DIBI, arsip `/prediksi`), belum kenal sinyal Flood Hub. Label dan arsip itu tidak disetel terhadap
   Flood Hub karena belum ada Flood Hub untuk disetel.
2. Belum terverifikasi dan HARUS dicek sebelum sidik dibekukan, tanpa mengubah kriteria: nama dan isi field `severity`,
   `qualityVerified`, `gaugeLocation`; arti `cutoffTime` pada `searchLatestFloodStatusByArea`; format `serializedPolygons`
   (diasumsikan KML dengan blok `<coordinates>`); endpoint `gaugeModels:batchGet` dan `gauges:queryGaugeForecasts`. Bila
   format ternyata lain, perbaikan HANYA di pembaca (`floodhub.py`) dan dicatat sebagai tafsir pelaksanaan sebelum sidik.
3. Titik HYBAS level 12 mewakili sub-DAS kecil; titik bisa jatuh di kabupaten lain dari tempat banjirnya. Pemetaan titik ke
   kabupaten adalah kasar. Titik pesisir yang jatuh di luar poligon dibuang (under-report).
4. DIBI kurang lapor; alarm palsu terukur kemungkinan lebih buruk dari kenyataan. Selang plus minus 2 hari menggembungkan
   ETS semua model sama rata.
5. Flood Hub tidak menunjukkan banjir perkotaan (genangan); label DIBI banjir mencampur keduanya.
6. Poligon bandang yang menyentuh kabupaten lewat tepi tanpa simpul atau titik kisi tidak tertangkap.

## 7. Urutan sidik, aturan kegagalan, dan larangan menyunting

- **Urutan:** (1) begitu kunci ada, SATU uji asap `tarik`: responsnya hanya dipakai membetulkan PEMBACA (nama field, format poligon,
  endpoint di `floodhub.py`), tidak pernah menyetel kriteria, ambang, atau aturan, dan tidak dinilai terhadap label apa pun; (2) `floodhub.py
  sidik` dijalankan sekali dan hasilnya di-commit (`scripts/banjir/floodhub.sidik`); (3) hari prospektif pertama = hari WIB sesudah
  commit sidik, dicatat di `floodhub.sidik` sebagai `awal_prospektif` (dibaca `riwayat` dan penilai dari berkas itu, bukan dari
  pemindaian cache). Snapshot sebelum hari itu tidak dinilai.
- Isi sidik: sha256 berkas ini; sumber fungsi (`tarik`, `riwayat`, `unggah`, `p0`, `pilih_snapshot`, `awal_prospektif`, `_snapshots`,
  `peristiwa_sah`, `_dt`, `petakan_bandang`, `sinyal_snapshot`, `agregasi`, `Kab`, `cincin_kml`, `kab_poligon`, `terverifikasi`,
  `kunci_arsip`, `sev`, `koordinat`, `_waktu`, `_num`, `_teks`, `status_sungai`, `flash`, `halaman`, `potong`) dan konstanta
  (`URUT`, `MIN_NAIK`, `TINGKAT`, `MIN_P0`, `MAKS_SIMPUL`, `JENDELA_PERISTIWA`, `MAKS_POLIGON`, `RE_ID`, `RE_WAKTU`, `MAKS_POS`,
  `MAKS_HAL`, `TENGGAT_TARIK`, `MAKS_ID`, `MAKS_URL`) di `floodhub.py`; berkas `scripts/banjir/wilayah.py`, `scripts/prediksi/aturan.json`,
  `scripts/prediksi/dasar.py`, `scripts/udara/kota.json` (tabel kode kemendagri ke `pp|Nama`), `scripts/banjir/model_kab.py` dan
  `scripts/banjir/uji_balik.py` (pencocokan DIBI), `scripts/banjir/floodhub_nilai.py`; tabel kabupaten `public/geo/kabupaten/*.json`;
  dan PREFIKS arsip `public/prediksi/data/arsip/*.jsonl` (jumlah baris dan sha256 baris-baris saat sidik; arsip append-only, jadi
  yang dikunci prefiksnya, baris sesudahnya boleh bertambah). Berkas sidik yang hilang membuat sidik galat, bukan bolong diam-diam.
- Sesudah sidik: tidak ada perubahan pada aturan waktu, peta kabupaten, label, pembanding, ukuran, selang, atau kriteria.
  Perbaikan yang tak mengubah keluaran (galat ketik, log) boleh, tercatat; perubahan yang mengubah satu saja kabupaten-hari
  menggugurkan sidik dan seluruh percobaan dinyatakan tidak sah, mulai dari awal dengan protokol baru. `buka` memeriksa sidik.
- Pembukaan satu kali: penanda dibuka ditulis sebelum metrik pertama dihitung. Hasil negatif dilaporkan setara hasil positif.
- Arsip R2: `unggah` tidak pernah menimpa objek yang sudah ada (cek ada dengan `r2 object get`, bandingkan sha256; isi beda = peringatan,
  objek lama tetap). Sidik hanya sah bila arsip R2 hari yang dinilai tidak diubah sejak unggah pertama.
