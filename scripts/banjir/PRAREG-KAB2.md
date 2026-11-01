# Pra-registrasi: model peluang banjir kabupaten-hari untuk OPERASIONAL (KAB2)

Dibuat 1 Nov 2026, SEBELUM satu skor 2026 pun dihitung untuk model ini. Pelaksana: `scripts/banjir/model_kab2.py`.
Keluaran di `data/raw/banjir/model_kab2/` (bukan public/). Jejak luar: `scripts/banjir/model_kab2.sidik` (JSONL, di-commit).

Bedanya dengan HULU/TANAH/DEBIT: itu percobaan kontras (apakah satu kelompok fitur menambah keterampilan). KAB2 adalah
KANDIDAT OPERASIONAL: satu model, fitur hanya yang tersedia harian, dilatih dengan semua tahun 2016-2025, dibandingkan
dengan aturan yang sedang tayang (`status.py`) dan klimatologi.

Keputusan pemilik yang dilaksanakan: (1) tahun 2024-2025 ikut melatih; (2) label bersatu v2 dengan bobot sampel supaya
model tidak dihukum label yang meragukan.

## 1. Pertanyaan

Apakah model GBDT kabupaten-hari berfitur operasional, dilatih 2016-2025 dengan label v2 berbobot, memberi alarm yang
lebih terampil daripada aturan `status.py` yang berlaku dan klimatologi, pada jumlah alarm yang sama, di data yang belum
pernah dilihat (2026-01-01 s.d. 2026-10-18), lalu terkonfirmasi prospektif sampai 2027-04-30?

## 2. Data

- **Sampel kabupaten:** semua kabupaten `uji_balik.sel_per_kab()` yang SEMUA selnya punya cache ERA5 2016-2025
  (`data/raw/banjir/uji_balik/`). 1 Nov 2026: 104 sel tercache, 41 kunci lengkap, satu di antaranya `64|None` (kecamatan
  tanpa nama kabupaten di sumber geo) dibuang, jadi **40 kabupaten**, 104 sel. Tidak ada unduhan baru. Sampel ditulis ke
  `sampel.json` saat `latih` dan dikunci sidik. Kabupaten-kabupaten ini asalnya dipilih `uji_balik.pilih` dari yang sering
  banjir/longsor di DIBI <= 2021 (plus tetangga yang selnya kebetulan sama): hasil TIDAK otomatis berlaku nasional.
- **Fitur (10, semua tersedia harian di operasi):** sama persis dengan M0 HULU (= `model_kab.py` tanpa kelompok
  `anteseden`): `h1`, `h3`, `imax`, `pers_h3` (hujan), `sm` (lengas tanah hari itu), `bulan_sin`, `bulan_cos`,
  `frek_dibi`, `bahaya_b`, `level_aturan`. Tidak ada CHIRPS (final telat ~4 bulan), tidak ada hulu, tidak ada debit,
  tidak ada ERA5-Land. Padanan operasionalnya:
  - `h1`, `h3` (e-1..e+1, `GESER = -1`), `imax`: latih dari ERA5 (prakiraan sempurna); operasi dari `hujan.json`
    (Open-Meteo best_match: e-1 dari hari lalu, e dan e+1 prakiraan), kisi 0,25 derajat yang sama.
  - `sm`: latih ERA5 `soil_moisture_7_to_28cm`; operasi `hujan.json` `sm` 3-27 cm (lapisan beda, lihat §6).
  - `pers_h3`: peringkat `h3` terhadap sebaran `h3` ERA5 sel itu 2016-2025 (batas disimpan di `kandidat.json`).
  - `frek_dibi`: laju hari kejadian DIBI per kabupaten. Baris latih tahun y memakai DIBI tahun < y saja (ekspansif,
    2016 = laju nasional 2008-2015); 2026 dan operasi memakai 2016-2025 penuh. Hanya DIBI, bukan label v2.
  - `bahaya_b`: InaRISK banjir tertinggi di sel kabupaten (statis). `level_aturan`: level `status.py` berlaku hari itu.
- **Label latih:** label bersatu v2 (`scripts/banjir/label_bersatu_v2.py`, keluaran `data/raw/banjir/label_bersatu_v2/
  kab_hari.csv.gz` dan `cakupan_hari.csv.gz`, dibaca saja; sha256 keduanya dikunci di `label_latih.json`), 2016-2025:
  - Positif = hari jangkar kejadian v2 di kabupaten itu. **Bobot sampel: TINGGI 1,0; SEDANG 0,5; RENDAH 0** (baris RENDAH
    tidak ikut latih sama sekali, dan tidak menjadi negatif).
  - Negatif = kabupaten-hari kelas `tidak_ada_laporan` saja: kab-tahun terliput (>= 5 poligon Groundsource di kab-tahun
    itu, `V2.MIN_GS_KAB_TAHUN`) atau DKI pada hari `pb_dki` = 1. Bobot 1,0. Kelas `tak_teramati` DIBUANG.
  - Semua kabupaten-hari pada tanggal jendela uji J3 (`V2.hari_j3()`) dan semua baris v2 `jendela_j3 = 1` DIBUANG.
- **Label uji 2026 (TEGAS):** Groundsource berhenti Januari 2026, jadi kelas TINGGI v2 (yang di 2016-2025 sebagian besar
  RESMI+MEDIA) TIDAK ADA padanannya di 2026. Uji 2026 memakai **label resmi saja: DIBI banjir/bandang ATAU logbook
  Pusdalops hari mulai** (`gab_mulai` `uji_logbook.label_dari`, berkas `public/data/logbook_kejadian.json` dan
  `public/data/dibi_kejadian.json`), dibekukan (salinan + sha256) di `label_26.json` tepat sebelum menilai. Negatif =
  semua kabupaten-hari sampel tanpa label (tanpa saringan cakupan; kab tak melapor bukan pasti tak banjir, FAR batas atas).
  DIBI 2026 belum terisi susulan.
- **ERA5 2026:** cache `data/raw/banjir/model_kab_debit/era5_2026/` (104 sel, sampai 2026-10-23) lewat
  `model_kab_debit.cuaca_sampai`, tanpa unduhan. Hash per sel dicatat di `uji26.json`.

## 3. Resep dan hiperparameter (DIPAKAI dari HULU, tanpa penyetelan ulang)

- GBDT `scripts/sebaran/gbdt.py`, hiperparameter M0 terpilih HULU (`data/raw/banjir/model_kab_hulu/kandidat.json`,
  sidik `12ff6a89c8e01921`): **kedalaman 4, laju belajar 0,05, 200 pohon, min_h 5,0, l2 1,0, sub 0,5**. Tidak ada kisi,
  tidak ada ablasi. `latih` menolak jalan bila kandidat HULU ada dan hiperparameter M0-nya beda dari ini.
- **Lima biji (1-5)**, masing-masing dengan Platt sendiri; peluang akhir = rerata peluang terkalibrasi (tafsir HULU §6a.1).
- **Kalibrasi Platt dengan validasi silang per tahun (leave-one-year-out 2016-2025)**, karena tidak ada tahun validasi
  terpisah: untuk tiap biji b dan tiap tahun y, GBDT dilatih di 9 tahun lain lalu menskor tahun y (logit luar-lipatan).
  Platt biji b dipasang (regresi logistik berbobot sampel, l2 1e-3) pada logit luar-lipatan 2016-2025 semuanya. Model
  akhir biji b dilatih di 10 tahun, lalu Platt biji b dipakai padanya. 50 model lipatan + 5 model akhir.
- **Pembanding**, diberi perlakuan setara:
  - Aturan `status.py` berlaku (alarm = level >= Waspada / >= Siaga). Sebagai peluang (hanya untuk dBSS): laju berbobot
    per level di data latih 2016-2025.
  - Klimatologi-v2 kab-bulan: laju berbobot label latih, dihaluskan ke laju kab dengan bobot 30 (laju kab dihaluskan ke laju
    sampel dengan bobot 30); dikalibrasi Platt LOYO yang sama (klimatologi lipatan dihitung tanpa tahun y). Dilaporkan.
  - **Klimatologi-DIBI kab-bulan (pembanding gerbang):** laju DIBI banjir/bandang per kab-bulan atas SEMUA kab-hari sampel
    2016-2025 (bobot 1, tanpa saringan cakupan), penghalusan sama, Platt LOYO terhadap label DIBI. Ini pembanding paling keras
    untuk label resmi 2026 dan menjadi acuan Brier semua dBSS.

## 4. Pembagian waktu

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2016-01-21 s.d. 2025-12-31 | GBDT, Platt LOYO, klimatologi, batas persentil, laju per level |
| Uji 2026 (`uji26`) | 2026-01-01 s.d. 2026-10-18 | uji luar sampel, SEKALI |
| Prospektif | tanggal `sidik` s.d. 2027-04-30 | konfirmasi dengan masukan operasional sebenarnya |

- `latih` lalu `sidik` (jejak di-commit) WAJIB sebelum `uji26`. `uji26` menolak bila baris `latih` terakhir dan baris
  `sidik` di HEAD tidak sama dengan `kandidat.json`, bila sidik kode/data berubah, atau bila sudah pernah dimulai
  (penanda `uji26.mulai` ditulis atomik O_EXCL SEBELUM menilai; proses yang mati di tengah tetap terhitung dibuka).
- Angka LOYO di data latih (`latih.json`) dilaporkan sebagai diagnostik, BUKAN uji: 2016-2025 sudah dilihat banyak
  rancangan lain (model_kab, HULU, uji balik aturan).

## 5. Kriteria (uji 2026; prospektif memakai kriteria yang sama)

Ukuran: ETS pada jumlah alarm SAMA dengan aturan (>= Waspada, >= Siaga) pada baris yang dinilai, seri skor dipecah acak
biji 11; dBSS = selisih Brier dibagi Brier klimatologi terkalibrasi. Bootstrap blok **5.000** ulangan biji 11, dua skema
(kab x musim-tahun, pulau x minggu), resampel identik untuk semua penilai dalam satu skema; selang **95%** (persentil 2,5
dan 97,5); batas bawah = terkecil dari dua skema, batas atas = terbesar.

**LULUS** bila SEMUA:
1. batas bawah dETS (model - aturan) >= Waspada > 0;
2. batas bawah dETS (model - aturan) >= Siaga > 0;
3. batas bawah dETS (model - klimatologi-DIBI) >= Waspada > 0;
4. batas bawah dBSS (model vs klimatologi-DIBI) > 0.

**TIDAK LULUS** bila dETS (model - aturan) Waspada titik <= 0 atau batas atasnya < 0. **TIDAK MEYAKINKAN** selain itu.

LULUS mensyaratkan keempatnya (uji irisan-gabungan), jadi galat jenis I satu-sisi <= 2,5% tanpa koreksi Bonferroni.
Dilaporkan tanpa menjadi gerbang: POD per kejadian logbook (porsi kejadian yang alarm kab-nya menyala pada mulai-1..mulai+1,
`uji_logbook.pod_kejadian`) untuk model dan aturan; POD/FAR/CSI/ETS tiap penilai; AUC, Brier, logloss; dBSS model vs
aturan; dETS dan dBSS model vs klimatologi-v2; skor titik dengan label DIBI saja dan logbook saja.

**Peran uji 2026: PENOLAK saja.** TIDAK LULUS menghentikan kandidat (latih ulang = protokol baru). LULUS atau TIDAK
MEYAKINKAN = layak lanjut ke prospektif; keduanya TIDAK cukup untuk tayang. Keputusan tayang hanya dari prospektif (sampai
2027-04-30, dinilai paling cepat 2027-06-01), lalu pemilik yang memutuskan. `status.py` TIDAK ditimpa.

Ukuran alarm 2026 (dihitung `baris` dari ERA5 2026 dan aturan saja, tanpa label, tanpa skor model): 40 kab x 291 hari =
11.640 kab-hari; aturan memberi 2.403 alarm >= Waspada dan **308 alarm >= Siaga**. Model dan klimatologi diberi jumlah
alarm yang sama.

**Prospektif:** jendela mulai tanggal baris `sidik` di jejak (atau hari pertama arsip operasional sesudahnya, bila arsip
belum jalan) sampai 2027-04-30. Fitur dari masukan operasional yang diarsip harian (§2, padanan operasional), BUKAN ERA5.
Label DIBI ATAU logbook hari mulai, dinilai sekali paling cepat 2027-06-01 (DIBI susulan). Penilai prospektif ditulis di
berkas terpisah sebelum 2027-04-30, tidak menyunting `model_kab2.py`, membaca `kandidat.json` dan memverifikasi sidik.

## 6. Kejujuran dan batas

- **Yang sudah dilihat penulis sebelum protokol ini:** hasil uji `status.py` 2026 vs logbook (Waspada POD per kejadian
  67%, FAR ~97%, ETS 0,02); angka cakupan dan jumlah label v2 (`label_bersatu_v2_ringkas.json`; di 40 kab sampel 2016-2025:
  TINGGI 1.770, SEDANG 279, RENDAH 6.565 kejadian; kab-tahun terliput 32-39 dari 40 per tahun); angka validasi HULU
  2024-2025 (M0 AUC 0,81 vs klimatologi 0,71) di `latih.log` HULU. Belum ada skor KAB2 apa pun, di tahun mana pun.
- **Prakiraan sempurna di uji 2026:** `h3` memakai ERA5 hari e+1. Skor uji 2026 adalah batas atas; prospektif dengan
  prakiraan Open-Meteo yang sebenarnya menguji operasi. Pergeseran sebaran ERA5 -> prakiraan (hujan, `imax`, `pers_h3`)
  dan lapisan `sm` (7-28 cm vs 3-27 cm) tidak dikoreksi.
- **Label latih dan uji berbeda jenis.** Latih memberi bobot 0,5 pada SEDANG (= resmi saja: DIBI dan/atau logbook tanpa
  media), padahal label uji 2026 justru resmi saja. TINGGI 2016-2025 sebagian besar RESMI+MEDIA, dan pangsa media naik
  72% (2016) ke 91% (2025) karena laju Groundsource, bukan karena banjir. Model bisa belajar "banjir yang diberitakan".
  Kalibrasi absolut di 2026 karena itu tidak terjamin; ETS pada jumlah alarm sama tidak bergantung kalibrasi, dBSS ya.
- **Negatif lemah:** `tidak_ada_laporan` = media meliput kab-tahun itu tetapi tidak ada laporan; bias ke tempat ber-media.
- **Platt LOYO** dipasang pada model 9 tahun lalu dipakai pada model 10 tahun; kemiringannya bisa sedikit meleset.
  Batas persentil memakai hujan 2016-2025 termasuk tahun yang ditahan (tanpa label, tidak bocor label).
- `frek_dibi` ekspansif: baris latih tahun sesudah y memuat DIBI tahun y; baris tahun y sendiri tidak. Pada LOYO, model
  lipatan tanpa tahun y tetap melihat frek_dibi tahun sesudahnya yang dihitung dari DIBI tahun y, jadi logit luar-lipatan
  (dasar Platt dan diagnostik LOYO) sedikit optimistis; label tahun y tidak pernah masuk fitur baris tahun y.
- Uji 2026 hanya sekitar 9,5 bulan, satu musim hujan parsial (Jan-Mar) dan awal musim berikut (Okt). Jumlah label
  (dihitung `baris`, tanpa skor, sebelum `latih`): 40 kab terpetakan, 98 kab-hari DIBI ATAU logbook (DIBI 66, logbook hari
  mulai 54), 54 kejadian logbook. Daya rendah: selang lebar, TIDAK MEYAKINKAN adalah hasil yang wajar; kriteria tidak diubah.
- Data latih (`baris`): 40 kab, 104 sel, 116.537 kab-hari, positif 2.007 (TINGGI 1.742, SEDANG 265; bobot 1.874,5),
  negatif 114.530; dibuang: RENDAH 6.496, ekor gugus 8.585, tak teramati 13.220, J3 400, positif tak terliput 82.

## 6a. Tafsir pelaksanaan (ditetapkan sebelum `latih`)

1. **Positif di kab-hari tak terliput DIBUANG juga** (bukan hanya negatifnya): baris positif tanpa pasangan negatif di
   kab-tahun yang sama adalah sampel kasus saja dan menggelembungkan laju dasar di tempat media sepi. Satuan cakupan = kab-hari
   (`tidak_ada_laporan` atau positif, keduanya hanya bila terliput). Jumlah positif yang terbuang per tingkat dicatat.
2. **Ekor gugus:** gugus v2 bisa 2 hari (jangkar + hari berikutnya) dan rantai episode berjangkar tiap 2 hari. Hari d+1
   dari jangkar mana pun (termasuk RENDAH) yang bukan jangkar sendiri DIBUANG (bisa jadi hari kedua gugus; bukan negatif).
3. **Poligon Groundsource per kab-tahun** dihitung dari `gs_n` baris `kab_hari.csv.gz` menurut tahun jangkar. Beda dengan
   hitungan v2 hanya pada gugus yang melintasi 31 Des - 1 Jan.
4. Hari 2016-01-01 s.d. 2016-01-20 tidak dinilai (`MULAI = 30` `model_kab.py`, sama dengan HULU).
5. Kabupaten sampel yang tidak terpetakan ke kode BPS `pp.kk` (`uji_logbook.kode_geo`) dikeluarkan dari uji 2026 saja.
6. Konstanta `model_kab.LATIH/VALIDASI/UJI` ditunjuk ulang ke 2016-2025 / kosong / 2026 HANYA di proses `model_kab2.py`
   sendiri lewat `pasang()` dari `__main__`; fungsi pembentuk data menolak jalan bila belum.
7. Sidik `uji_logbook.py` dan `label_bersatu_v2.py` hanya mencakup sumber fungsi/konstanta yang dipakai (bukan seluruh
   berkas), karena keduanya masih disunting sesi lain; isi label tetap terkunci lewat sha256 CSV v2 dan `label_26.json`.
   Sebagai gantinya `uji26` menolak bila `model_kab2.py`, `PRAREG-KAB2.md`, `model_kab.py`, `uji_balik.py`,
   `label_bersatu_v2.py`, atau `uji_logbook.py` tidak terlacak atau beda dengan HEAD.
8. **Label 2026 dibekukan saat `latih`**, bukan saat `uji26`: `label_26.json` (isi, sha256 `logbook_kejadian.json` dan
   `dibi_kejadian.json` saat itu, hitungan 98/66/54/54) dan ringkasnya di `label_latih.json` (disidik). `uji26` memakai
   salinan beku dan menolak (sebelum penanda) bila isi, sha256 sumber, atau hitungannya beda dari catatan. Berkas publik
   diperbarui harian, jadi membandingkan dengan berkas hidup akan selalu menolak; sha256 berkas hidup saat uji hanya dicatat
   di `uji26.json`. Konsekuensi: DIBI susulan sesudah `latih` tidak ikut uji 2026.
9. `latih.json` memuat kemiringan Platt `b1` tiap biji, klimatologi-v2, dan klimatologi-DIBI.
10. `uji26 --kering` = gladi dengan kandidat nyata: label hidup tanpa tulis, ERA5 2026, tiga label, peluang; hanya memeriksa
    panjang, NaN, rentang (0, 1), dan sum(y) = hitungan label. Tanpa skor, tanpa penanda, boleh berulang.

## 7. Kode dan sidik

Mode `model_kab2.py`: `uji` (swauji tanpa jaringan), `baris` (hitung kab, baris, label, alarm aturan 2026; tanpa model, tanpa
skor), `latih [--ulang]`, `sidik`, `uji26 --kering` (gladi), `uji26`. `latih` membekukan sha256: kriteria, isi kandidat (pohon, Platt, klimatologi, frek,
batas persentil), konstanta, berkas ini, `model_kab2.py`, `model_kab.py`, `model_kab_hulu.py`, `model_kab_debit.py`,
`uji_balik.py`, `status.py`, `umum.py`, `label_bersatu.py`, `gbdt.py`, sumber fungsi terpakai `uji_logbook.py` dan
`label_bersatu_v2.py`, `sampel.json`, `label_latih.json` (sha256 CSV v2 + tabel label latih), `dibi_le2025.json`, dan
manifest cache ERA5 2016-2025. Sidik ditulis ke `model_kab2.sidik` dan di-commit sebelum `uji26`.

## 8. Amandemen

### A1 (1 Nov 2026, saat `latih` pertama berjalan, sebelum `uji26` dan sebelum skor 2026 apa pun dilihat)

Keputusan pemilik: data 2026 ikut melatih model operasional. Urutan yang ditetapkan sekarang, tanpa bergantung pada
hasil uji 2026:

1. `uji26` dijalankan sekali pada kandidat 2016-2025 sebagaimana §5 (penolak saja).
2. Bila vonisnya TIDAK LULUS, kandidat berhenti dan tidak ada latih ulang. Bila LULUS atau TIDAK MEYAKINKAN, model
   operasional KAB2-OPS dilatih ulang dengan resep, fitur, hiperparameter, bobot, dan aturan pembuangan yang sama
   persis, pada 2016-01-21..2026-10-18. Label 2026 = label resmi (DIBI atau logbook hari mulai, bobot SEDANG 0,5;
   TINGGI 1 bila resmi + media/warga), karena Groundsource berhenti Januari 2026. Platt LOYO meliputi 2016-2026.
3. Latih ulang itu memakai berkas kode terpisah (`model_kab2_ops.py`) yang mengimpor fungsi `model_kab2.py` tanpa
   menyuntingnya; sidik KAB2-OPS di-commit sebelum hari prospektif pertama.
4. Uji prospektif §4 menilai KAB2-OPS, bukan kandidat 2016-2025, dengan kriteria §5 yang sama, sampai 2027-04-30,
   dinilai paling cepat 2027-06-01. Data 2026-01-01..2026-10-18 tidak pernah dipakai lagi sebagai data uji.
