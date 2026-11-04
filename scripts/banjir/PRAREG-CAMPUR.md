# Pra-registrasi: model campuran bertingkat (lantai klimatologi + koreksi sinyal fisik) untuk peluang banjir kabupaten-hari

Status: DRAF REVISI 5, 3 Nov 2026 (revisi 5 menjawab tinjauan revisi 4 dan benchmark internasional; revisi 4 memuat tambahan berbasis literatur dan data baru; revisi 3 menjawab tinjauan revisi 2; revisi 2 menjawab tinjauan ulang validasi-model dan menyisipkan keputusan pemilik P1-P5 serta kandidat A). Revisi 1 menjawab tinjauan `validasi-model` (konteks bersih: BELUM SIAP DIBEKUKAN) dan audit
model statistik banjir; masih belum disetujui pemilik dan belum ditinjau ulang. Label Nov 2026 TIDAK dibuka dalam revisi ini.
Ditulis SEBELUM satu
baris kode `model_kab_campur.py` ada dan sebelum satu skor model ini dihitung di tahun mana pun. Tanda **BELUM DICEK** =
asumsi yang harus dibuktikan dulu dengan perintah di §6a sebelum `latih` boleh jalan; bila ternyata salah, protokol
diamandemen SEBELUM dibekukan, bukan sesudahnya.

Pola, ukuran, dan penjaga mengikuti `PRAREG-HULU.md`, `PRAREG-KAB2.md`, `PRAREG-DEBIT.md`. Ini percobaan TERPISAH: hasilnya
tidak digabung angka demi angka dengan HULU, DEBIT, TANAH, GRRR, atau KAB2-OPS.

## 0. Latar: kenapa bentuk ini

Semua model banjir kabupaten-hari sampai 3 Nov 2026 kalah atau hampir tak beda dari pembanding murah:

- `model_kab` (GBDT) mengalahkan klimatologi tetapi TIDAK mengalahkan regresi logistik biasa dan hanya selisih tipis dari
  `status.py`: vonis TIDAK LULUS (`RISET-MODEL-KAB.md` §10; dETS model - LR Waspada +0,0005 [-0,0016, +0,0028]).
- Debit GloFAS (`PRAREG-DEBIT.md`, §12 RISET-MODEL-KAB) tidak menambah di validasi (dETS Waspada -0,0006). Uji ulang
  GloFAS + MCDWD 2 Nov: AUC 0,567 lawan persistensi 0,708 dan klimatologi 0,791, GAGAL.
- Lab tutupan lahan: semua CI melewati nol. Uji logbook 2026: `status.py` ETS 0,016-0,060, TIDAK LULUS.
- Satu-satunya bukti positif (GRRR, "LULUS (daya rendah)", lantai lulus tipis: batas bawah dETS 0,0004) adalah
  prakiraan sempurna dan memakai ulang uji 2024-2025.

Diagnosis yang dipegang protokol ini: hambatannya **label** (laju lapor antar-kabupaten bias; DIBI 2026 terisi susulan;
Groundsource berhenti Jan 2026), bukan kekurangan fitur. Menumpuk fitur ke satu model rumit menyuruh model itu menebak laju
lapor kabupaten dari fitur hujan. Arah yang disetujui pemilik, **campuran bertingkat, bukan ditumpuk**: laju lapor ditanam
sekali di tingkat 1, tingkat 2 hanya boleh belajar apa yang fisika tambahkan DI ATAS lantai itu.

## 1. Pertanyaan

Satu pertanyaan, satu kontras gerbang: apakah koreksi residual dari sinyal fisik (hujan 3 hari terhadap persentil lokal,
kelembapan tanah, debit GloFAS terhadap Q2, interaksi statis) menambah keterampilan di atas klimatologi kabupaten x bulan
yang sudah dihaluskan, pada jumlah alarm yang sama?

- **H1 (hipotesis kerja):** ya, kecil tetapi nyata: dETS(C - klimatologi) Waspada > 0 dan dBSS > 0.
- **H0 yang sama sahnya:** sinyal fisik tidak menambah apa-apa di atas lantai. Hasil ini DIHARAPKAN secara apriori kuat
  (lima percobaan di §0). Lihat §5.4 untuk konsekuensinya; hasil itu bukan kegagalan proyek.
- Pertanyaan sekunder (dilaporkan, bukan gerbang LULUS): apakah C mengalahkan regresi logistik tanpa offset dan `status.py`;
  apakah persistensi dan dampak mengubah gambar (§3, §3.5).

## 2. Satuan, sampel, label

### 2.1 Satuan

Kabupaten-hari (`kab`, `e`), 40 kabupaten, 104 sel 0,25 derajat: sampel KAB2 dikunci dari
`data/raw/banjir/model_kab2/sampel.json` (salinan terlacak `data/banjir/kab2_ops/sampel.json`), tidak dipilih ulang.
Hari `e` = hari kalender Asia/Jakarta (WIB), indeks seperti `uji_balik.AWAL`; hari 2016-01-01..2016-01-20 tidak dinilai
(`MULAI = 30`, sama dengan KAB2).

**Tenggang.** Gerbang memakai label hari tepat: `y0(e) = 1` bila kab itu punya kejadian berjangkar di hari `e`. Dua label toleran
DILAPORKAN sebagai metrik SEKUNDER tanpa vonis: (i) `yt(e) = 1` bila ada kejadian di `e-1..e+2` (toleransi tanggal DIBI/logbook yang
kasar: RISET-LOGBOOK, `tanggal_curiga`); (ii) **skor tingkat-kejadian**: tiap kejadian berjangkar (satu per gugus v2) dihitung kena
bila alarm kab itu menyala pada salah satu hari `mulai-1..mulai+2`, FAR dihitung per alarm-episode (alarm berurutan satu kab
satu episode); pola `uji_logbook.pod_kejadian`. Alasan gerbang TETAP `y0`: (1) kriteria gerbang HULU/DEBIT/TANAH/KAB2 semuanya hari
tepat, jadi `y0` menjaga keterbandingan; (2) memperlebar positif menaikkan laju dasar sekitar 4 kali dan ETS naik menurut
konstruksi, sehingga MDE yang dihitung (§5.5) pada `y0` tidak berlaku untuk `yt`; (3) gugus v2 sudah toleran +-1 hari di label latih;
(4) memilih label gerbang setelah melihat mana yang lolos adalah peluang tambahan yang tak dikoreksi. Bila `y0` gagal dan `yt`
lolos, vonis tetap gagal dan `yt` ditulis sebagai petunjuk (tanggal label kasar), bukan sebagai kelolosan. Fitur tetap bersumber hari
`e`, tidak digeser.

### 2.2 Label

Tiga lapis, dengan fungsi berbeda (jangan dicampur):

| Lapis | Sumber | Dipakai untuk |
| --- | --- | --- |
| Latih | label bersatu v2: `data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz` + `cakupan_hari.csv.gz` (`label_bersatu_v2.py`; DIBI + logbook Pusdalops + Groundsource + berita + PetaBencana) | fit tingkat 1, 2, 3 |
| Evaluasi | resmi: DIBI banjir/bandang ATAU logbook hari mulai (`uji_logbook.label_dari`, `gab_mulai`; `public/data/dibi_kejadian.json`, `public/data/logbook_kejadian.json`) | semua skor gerbang |
| Kontrol | DIBI saja (`data/raw/banjir/dibi_tanggal.json`) | "PEKA LABEL" (§5.3) |

Aturan label latih = aturan KAB2 §2/§6a, tanpa perubahan: positif = jangkar kejadian v2; bobot TINGGI 1,0, SEDANG 0,5, RENDAH 0
(dibuang, bukan negatif); negatif = hari `tidak_ada_laporan` pada kab-tahun terliput (>= 5 poligon Groundsource,
`V2.MIN_GS_KAB_TAHUN`) atau DKI pada `pb_dki` = 1; kelas `tak_teramati`, ekor gugus (d+1 jangkar), positif di kab-hari tak
terliput, dan semua hari/baris jendela uji J3 (`V2.hari_j3()`, `jendela_j3 = 1`) DIBUANG dan bukan negatif. Label 2026 untuk
latih = resmi saja (Groundsource berhenti Jan 2026), bobot SEDANG 0,5 dan TINGGI 1 bila resmi + media/warga, persis A1 KAB2.

**Genangan satelit (butir 5 permintaan pemilik): TIDAK masuk label gerbang.** Status sumbernya hari ini: GFM pilot 34 kab-hari
dan "tidak boleh dipakai sebagai label luas" (ilmu banjir, 1 Nov); MODIS MCDWD memuat recurring flood (sawah, rawa) dan
80% piksel "data tidak cukup" karena awan, kab-hari bertutupan >= 0,5 hanya ~6%; S1 RTC (`s1_genangan.py`) hanya 43 adegan;
`label_bersatu_v2` secara tertulis menyatakan GFM/MODIS "tidak dihitung". Memasukkannya mengubah aturan v2 (revisi = v3,
terlarang sesudah label dipakai menilai model). Gantinya: **pemeriksaan sekunder satelit** (deskriptif, tanpa vonis): pada
kab-hari dengan tutupan MCDWD >= 0,5 dan frekuensi lewat ambang recurring yang ditetapkan sebelum membuka (frekuensi
kab < 0,5 dari hari terliput), laporkan AUC C dan klimatologi terhadap deteksi satelit. **BELUM DICEK:** apakah n positif di
sampel 40 kab cukup (>= 30); bila tidak, pemeriksaan ini ditulis "tidak dapat dinilai" tanpa kompensasi.

**Kontrol label dibuat bukan hanya kosmetik.** Karena evaluasi memakai gabungan DIBI + logbook sedangkan latih memakai v2
berbobot, jarak jenis label latih-evaluasi adalah ancaman utama (KAB2 §6: model bisa belajar "banjir yang diberitakan").
Dua kontrol (§5.3) memotongnya dari dua sisi.

## 3. Model (empat tingkat, tidak ada yang ditumpuk)

Notasi: `p0` peluang lantai; `eta` skor linear; `p` peluang akhir.

### 3.1 Tingkat 1: lantai klimatologi kab x bulan

`p0(k, b)` = laju hari berlabel per kabupaten `k` dan bulan kalender `b`, dihitung dari TAHUN LATIH SAJA, berbobot label v2,
dengan penghalusan dua tingkat (tanpa penyetelan, bobot 30 hari seperti `model_kab.klimatologi`):

1. `r_prov(b)` = laju provinsi-bulan, dihaluskan ke laju provinsi dengan bobot 30; `s(prov, b) = r_prov(b) / r_prov(rerata)`
   = indeks musim provinsi.
2. Prior kab-bulan = `r_kab * s(prov, b)`, dengan `r_kab` laju kab seluruh tahun dihaluskan ke laju provinsi dengan bobot 30.
3. `p0(k, b) = (n_kb + 30 * prior) / (N_kb + 30)`, `n_kb` = jumlah hari berlabel berbobot, `N_kb` = hari terliput.
   Dijepit ke [1e-5, 0,5].

Jadi kab jarang (sedikit kejadian) ditarik ke bentuk musim provinsinya, bukan ke laju sampel yang didominasi kab langganan.
**BELUM DICEK:** jumlah kab per provinsi di sampel 40 (bila < 3, indeks musim ditarik ke pulau; aturan jatuh-ke-pulau
ditetapkan sebelum `latih`, tidak sesudah).

**Pencegah kebocoran tumpukan (wajib).** Untuk baris LATIH, `p0` dihitung leave-one-year-out (tanpa tahun baris itu), supaya
tingkat 2 belajar dari lantai yang tidak pernah melihat label barisnya. Tanpa ini koreksi menyusut karena lantai sudah
"menghafal" barisnya. Untuk baris yang dinilai (validasi bergulir, uji), `p0` dari seluruh tahun latih. `p0` tidak memakai
`frek_dibi` (laju kab sudah di sini).

### 3.2 Tingkat 2: koreksi residual dengan offset

`eta = logit(p0) + sum_j beta_j * z_j`, koefisien `logit(p0)` TETAP 1 (offset), TANPA intersep bebas (`beta_0 = 0`), fitur
`z_j` distandardisasi (rerata nol, simpangan baku 1 pada baris latih). Akibat: dengan sinyal nol (`z = 0`) atau `beta = 0`,
`p = p0`, tepat klimatologi. Pembatas:

- **L2 kuat dan tetap:** prior `beta_j ~ N(0, tau^2)` dengan `tau` dipilih dari {0,05, 0,10, 0,25} per satuan simpangan baku
  menurut logloss validasi bergulir (§4.2), aturan satu-SE ke `tau` terkecil. Tidak ada penyetelan lain.
- **Tanda tak-negatif:** semua `beta_j >= 0` (hujan, tanah basah, dan debit tinggi hanya boleh menaikkan peluang). Bila
  data menginginkan negatif, koefisiennya 0. Ini mengurangi derau, bukan menambah daya.
- **Tanpa efek utama kab atau statis.** Laju lapor kab sudah di lantai; efek utama statis di tingkat 2 akan mengajari model
  ulang laju lapor (kembali ke masalah label). Statis hanya masuk sebagai INTERAKSI dengan anomali hujan.

Fitur tingkat 2 (nama = kolom nyata; sumber dan hari tertulis, tidak ada fitur lain sesudah pembekuan):

| Fitur | Definisi | Sumber / berkas | Jendela, indeks hari (tanpa bocor) |
| --- | --- | --- | --- |
| `pers_h3` | peringkat persentil `h3` terhadap sebaran `h3` sel itu, maksimum atas sel kab | `model_kab.FITUR` (kelompok `hujan`) | `h3` = hujan hari `e-1..e+1` (`GESER = -1`), hari WIB; batas persentil dari TAHUN LATIH saja (`bisect_left`); untuk baris LATIH batas dihitung tanpa tahun baris itu (LOYO, bersarang §3.2c) karena `model_kab` menghitungnya dari `h3` hari yang sedang dinilai (RISET-MODEL-KAB §9b) |
| `lh3` | `log1p(h3)` | `model_kab` | idem |
| `limax` | `log1p(imax)`, imax = maks hujan jam-an `e-1..e+1` | `model_kab` | idem |
| `sm` | lengas tanah hari `e` (ERA5 `soil_moisture_7_to_28cm`; operasi `hujan.json` 3-27 cm) | `model_kab` (kelompok `tanah`) | hari `e` (ERA5 hari e sudah memuat sm; cek KELOMPOK `model_kab`) |
| `q_q2` | `q3 - log1p(Q2_sel)`, kab = maks atas sel. `q3` SUDAH berskala log1p (`model_kab_debit.fitur_q`, baris 392: `math.log1p(mx)`), jadi TIDAK di-log1p lagi (draf pertama salah: log1p ganda) | `q3` = debit maks GloFAS `e-1..e+1` (`model_kab_debit`); `Q2_sel` = debit periode ulang 2 tahun Gumbel-momen dari deret GloFAS tahun LATIH, dihitung ULANG per lipatan bergulir (tahun < tahun uji). Ini PENYIMPANGAN SADAR dari `model_kab_grrr` (`TAHUN_Q2 = 2021` tetap): periode Q2 tetap 2021 akan memakai tahun 2022-2025 sebagai bagian lipatan uji tanpa Q2-nya, sedangkan rolling menjaga "hanya masa lalu". Swauji pembeda: Q2 lipatan tahun `y` tidak berubah bila deret debit tahun >= `y` diubah (mutasi) dan sama dengan formula GRRR bila `TAHUN_Q2` dipaksa 2021 pada data mainan | jendela `e-1..e+1`, `timezone=Asia/Jakarta` seperti `model_kab_debit` |
| `hx` | interaksi `pers_h3 * h_rendah`, `h_rendah` = porsi lahan HAND rendah kab (statis) | `fitur_banjir.py` bagian `hand` bila terpetakan; BUKAN `hand_kab.py` (MERIT menunggu kunci, status MENUNGGU KUNCI) | statis; tidak memuat label |

**Fitur inti baru (revisi 4, butir 1): `h3_sm` = `pers_h3 * zsm`**, dengan `zsm(k, e) = (sm(k, e) - rerata_kb) / sd_kb` = ANOMALI per kab-bulan:
`rerata_kb`, `sd_kb` dari `sm` kab `k` (maksimum atas sel, `model_kab.py:215`) pada bulan kalender yang sama di TAHUN LATIH lipatan saja (bukan rerata global:
`sm` global bercampur dengan perbedaan tanah antar-kab, sehingga interaksinya menjadi efek utama statis lewat pintu belakang). Bila kab-bulan < 30 hari
latih, `rerata`/`sd` wilayah-bulan. **Urutan: anomali `zsm` dibentuk lebih dulu, lalu hasil kali `pers_h3 * zsm` dibentuk, baru standardisasi §3.2c
(rerata/sd baris latih) diterapkan pada kolom `h3_sm` itu.** Tanda `>= 0`, L2 `tau`.
Keputusan: masuk S0 (inti, jadi ikut CN dan semua set), BUKAN ekstensi dan bukan kandidat satu-SE, karena (a) bukti terkuat untuk "hujan
saja tidak cukup": di AS 36% hujan ekstrem menjadi debit ekstrem, 62% bila kelembapan anteseden di atas median dan 13% di bawahnya
(Ivancic & Shaw 2015, `reports/Prediktor banjir dan longsor tropis.md`; sumber SEKUNDER dari ringkasan, tidak diverifikasi langsung);
JMA menghapus kriteria hujan-saja pada 2017 dan memakai indeks air tanah (research_notes Benchmark); (b) tanpa derajat bebas seleksi;
(c) memakai `pers_h3` dan `sm` yang sudah ada. Pembatas: `sm` berlapis beda antara ERA5 (7-28 cm) dan `hujan.json` (3-27 cm; KAB2 §6),
jadi interaksi ini paling rentan terhadap pergeseran ERA5 -> operasi; dilaporkan, tidak dikoreksi.

**Fitur kandidat tambahan (keputusan pemilik dan audit, 3 Nov; hanya masuk lewat set S2-S3 dan ekstensi §3.2b-3.2d; tanda `beta >= 0`, L2 sama):**

| Fitur | Definisi (skala log yang benar, tanpa bocor) | Sumber |
| --- | --- | --- |
| `q_ant_mx` | `log1p(maks debit harian e-7..e-2) - log1p(Q2_sel)`; maks atas sel | GloFAS (`model_kab_debit`), Q2 sama dengan `q_q2` |
| `q_ant_mn` | `log1p(rerata debit e-7..e-2) - log1p(Q2_sel)` | idem |
| `dq` | `log1p(q(e-1)) - log1p(q(e-4))`, tren debit; nol bila salah satu hilang | idem; jendela seluruhnya `<= e-1` |
| `p_ant` | peringkat persentil jumlah hujan `e-8..e-2` terhadap sebaran jumlah 7 hari sel itu (tahun latih, LOYO di baris latih, `bisect_left`), maks atas sel | ERA5 `uji_balik`; jendela seluruhnya `<= e-2`, nol tumpang tindih dengan `h3` |
| `qa` | interaksi `pers_h3 * z(Q2_sel/luas DAS hulu)` ("tipe banjir": sungai besar relatif luas hulu), statis hanya sebagai interaksi | `Q2_sel` dan luas basin hulu HydroBASINS (`model_kab_hulu` basin); alternatif sumber Q2: GRRR (`model_kab_grrr`) |
| `twsa` | anomali simpanan air terestrial GRACE: `tws_cm` bulan `b - 5` dikurangi klimatologi bulan-kalender yang dihitung HANYA dari bulan GRACE yang jatuh pada TAHUN LATIH lipatan itu (2016..y-1; sama dengan semua statistik latih lain, bukan deret 2002+); bulan kalender dengan < 4 pengamatan latih dalam lipatan itu memberi `twsa` hilang; HANYA wilayah Jawa; ekstensi `E_twsa` | `public/data/neraca_air/grace.json` (`kab[kode BPS 4 digit].tws_cm`, `meta.waktu`, `meta.bulan_hilang_produk`; dari `scripts/air/neraca/grace.py`) |

Catatan jujur tiap kandidat: (a) fitur anteseden hujan `a7/a30/api` DIBUANG dari M0 `model_kab` dalam ablasinya (tidak membantu), jadi
`p_ant` punya dugaan awal lemah; (b) `qa` mengikuti satu-satunya hasil positif (GRRR, hindcast M3G AUC 0,804 lawan M3 0,769, "LULUS
daya rendah", prakiraan sempurna, uji dipakai ulang), jadi bukan bukti operasional; **BELUM DICEK**: apakah luas basin hulu per sel
sudah tersimpan dari `model_kab_hulu basin` untuk 104 sel, dan padanan Q2 GRRR vs GloFAS (kasus ilmu 1 Nov: pasangan GloFAS-GRRR
menurut jarak menyesatkan); (c) **neraca air**: `kab.json` (skenario klimatologi) tetap TIDAK dipakai, tetapi `public/data/neraca_air/deret_bulanan.json` (dari `scripts/air/neraca/deret.py`; 119 kab Jawa, 2010-01..2026-07, kolom P, ETa, R, S per bulan, tanpa bulan hilang, kunci kode Kemendagri/BPS 4 digit) SUDAH ADA dan menggantikan penolakan lama: lihat `E_neraca` di bawah; (d) GRACE hanya mencakup Jawa (`KOTAK` lat -9,5..-5, lon
104,5..115,5; 119 kab dengan kunci BPS 4 digit, 13 kab sampel Jawa) dan resolusi mascon ~330 km ("iklim simpanan wilayah", bukan kab);
GRACE nasional BELUM diekstrak (produk globalnya ada, ekstraknya belum), jadi `twsa` hanya kandidat wilayah Jawa. Alasan klimatologi 2016+ dan bukan 2002+: konsistensi dengan seluruh protokol (semua statistik latih hanya dari tahun latih lipatan) dan agar swauji bisa memutasi satu tahun; harga: klimatologi bulanan dari <= 10 tahun dengan celah 17 bulan. **BELUM DICEK**: peta nama kab -> kode BPS (`uji_logbook.kode_geo`) untuk 13 kab
(tanggal awal/akhir, jumlah titik 259 dan bulan hilang sudah dibaca dari `meta`). Latensi (bukti dari `grace.json`): `meta.bulan_terakhir = 2026-07` ketika dibaca 3 Nov 2026, yaitu bulan `b - 4` untuk hari di Nov
(dan 2026-08..10 belum ada); `jadwal_usulan` menyebut jeda terbit 2-3 bulan. Maka `L = 5` ditetapkan (satu bulan margin di atas latensi
terukur), bukan 4. Bulan produk yang hilang di rentang 2016-2025 (`meta.bulan_hilang_produk`): 2016-04, 2016-09, 2016-10, 2017-02,
2017-07..2018-05 (11 bulan, celah GRACE/GRACE-FO), 2018-08, 2018-09 = 17 bulan.

Bila `Q2_sel` tak terhitung (deret latih < 5 tahun, atau sel "tanpa sungai berarti" median debit < 5 m3/s seperti
`PRAREG-DEBIT.md` §2), `q_q2 = 0` dan indikator baris tidak dibuat; jumlah sel begitu dilaporkan. Baris tanpa nilai valid pada
fitur apa pun DIBUANG dari semua pembanding sekaligus (kasus ilmu 1 Nov).

**BELUM DICEK:**
(a) `hx`: apakah `fitur_banjir.py ambil hand` sudah di cache untuk 40 kab sampel (cache hanya untuk kab berlabel + kandidat),
dan sumber `HAND_URL`-nya setara; bila tidak ada, `hx` DIHAPUS dari protokol (bukan diganti) dan §3.2 diamandemen sebelum
`latih`;
(b) `q_q2`: operasi di prospektif butuh debit GloFAS harian per sel yang BELUM diarsip (arsip KAB2 tidak memuat debit);
tanpa arsip, `q_q2` hanya bisa dinilai pada tier prakiraan-sempurna (§4.3);
(c) `sm` hujan.json (3-27 cm) vs ERA5 (7-28 cm) beda lapisan (KAB2 §6, tidak dikoreksi);
(d) kolinearitas `pers_h3`, `lh3`, `limax`, `sm`: nonneg + L2 meredam, tetapi interpretasi koefisien per fitur tidak dilaporkan.

Persentil, standardisasi, `Q2`, dan `h_rendah` semua dari TAHUN LATIH (rolling: tahun < tahun uji).

### 3.2b Formula boleh berbeda per wilayah (keputusan pemilik 3 Nov), dengan penjaga anti-overfit

Tiga kandidat berkriteria (CN, CW, dan A §3.6), semuanya dibekukan; bagian ini mengatur CN dan CW: **CN** = tingkat 2 nasional (§3.2, satu `beta`, set fitur S1 tetap, lihat
bawah) dan **CW** = tingkat 2 per wilayah. CN adalah pembanding wajib CW.

**Fakta sampel (`data/banjir/kab2_ops/sampel.json`, dihitung 3 Nov):** 40 kab per wilayah pulau: Sumatera 6, Jawa 13, Kalimantan 7,
Sulawesi 4, Lainnya 10 (calon eksplisit §3.2b langkah 1: Bali-NT 7: Bali 6 + NTB 1; Maluku 2; Papua 1). Positif DIBI banjir/bandang kab-hari 2016-2025 di 40 kab
(proksi; label v2 berbobot belum tersedia lokal, **BELUM DICEK**): Jawa 742, Kalimantan 297, Sumatera 287, Lainnya 186, Sulawesi 162;
2026-01..10 DIBI: Jawa 45, Sumatera 11, Lainnya 10, Kalimantan 6, Sulawesi 5. Taksiran kasar positif prospektif Nov-Apr (total 100-250,
dibagi menurut porsi 2016-2025; **BELUM DICEK**): Jawa 60-145, Sumatera 15-35, Kalimantan 15-35, Lainnya 10-25, Sulawesi 8-20. Jadi
daya per wilayah kecil kecuali Jawa; CW secara apriori berdaya rendah dan itu ditulis sekarang.

**Urutan penerapan (ditetapkan sekarang; semua langkah memakai hanya lipatan bergulir F1-F4, §4.2; label uji F5 dan prospektif tidak dibaca):**
1. **Penggabungan wilayah (SEBELUM `tau_w` atau set fitur), SATU rumus, atas daftar CALON EKSPLISIT (keputusan: enam calon, tidak ada
   calon lain):** Sumatera (kode provinsi 11-19, 21; 6 kab sampel), Jawa (31-36; 13), Kalimantan (61-65; 7), Sulawesi (71-76; 4),
   Bali-NT (51-53; 7), Maluku-Papua (81-82, 91-96; 3). Calon `w` dipertahankan terpisah bila SEMUA benar: (i) `n_kab(w) >= 6`, (ii)
   `P_w >= 100` dengan `P_w` = jumlah positif BERBOBOT label v2 latih 2016-2025 (kab-hari; TINGGI 1, SEDANG 0,5) di calon itu, (iii)
   `T_w >= 5` dengan `T_w` = jumlah tahun latih yang memuat >= 5 positif berbobot di calon itu. Calon yang gagal digabung menjadi
   SATU wilayah **Lainnya** (tidak ada penggabungan lain). Dengan `n_kab` yang sudah diketahui: Sulawesi (4) dan Maluku-Papua (3)
   pasti gagal (i) dan menjadi Lainnya (7 kab); Sumatera, Jawa, Kalimantan, Bali-NT lolos (i) dan harus lolos (ii)-(iii) pada
   label v2. Lainnya adalah wilayah penampung: tidak diuji (ii)-(iii), tetapi kalau di bawah itu `delta_w = 0` (hanya koefisien nasional)
   dan Platt-nya bersama baris penampung, dan vonis wilayahnya "belum cukup data". `P_w` dan `T_w` DIHITUNG oleh `latih` dari tabel
   label v2 (bukan proksi DIBI di §3.2b) dan **ditulis ke `latih.json` bagian `wilayah` (n_kab, P_w, T_w, hasil gabung) SEBELUM langkah
   3 berjalan dan sebelum `sidik`**; `sidik` membekukan bagian itu. Wilayah efektif yang sama dipakai Platt (§3.3). **BELUM DICEK:**
   `P_w`/`T_w` Bali-NT dengan label v2 (proksi DIBI 'Lainnya' 186 sebelum dipisah tidak memisahkan Bali-NT).
   **Tabel tetap wilayah efektif -> wilayah koreksi bias** (`koreksi_bias.WILAYAH = Sumatera, Jawa, Kalimantan, Lainnya` dengan Lainnya
   = Sulawesi + Bali-NT + Maluku + Papua): Sumatera -> Sumatera; Jawa -> Jawa; Kalimantan -> Kalimantan; Bali-NT -> Lainnya; Lainnya
   (Sulawesi + Maluku-Papua) -> Lainnya. Pemetaan ini berlaku tetap bagi P2; kalau penggabungan di `latih` berubah, tabel diperbarui
   dan dicatat di `latih.json` sebelum sidik.
2. **Cek jumlah wilayah efektif.** Bila < 3: CW turun menjadi varian SEKUNDER tanpa vonis; m dihitung tanpa CW (§5.1).
3. **`tau` dan `tau_w` (dengan SET TETAP S1 untuk semua wilayah):** `tau` nasional dipilih LEBIH DAHULU pada CN (S1, tanpa `delta`)
   dari {0,05, 0,10, 0,25} menurut logloss pooled (semua baris wilayah) F1-F4 dan aturan satu-SE §3.2c; kemudian `tau` itu DIKUNCI
   dan dipakai tetap untuk S0-S3 dan semua ekstensi (TIDAK dipilih ulang). Lalu `tau_w` dipilih pada CW dengan S1 untuk semua wilayah dari {0,02, 0,05}
   menurut logloss pooled F1-F4 dan satu-SE; dikunci.
4. **Pencarian set fitur: koordinat per wilayah, satu putaran, urutan = `P_w` menurun (wilayah dengan positif berbobot paling banyak lebih dulu; seri diputus kode provinsi terkecil), Lainnya selalu terakhir.** Mulai dari
   S1 untuk semua wilayah. Untuk wilayah `w` pada gilirannya, evaluasi tiap set kandidat (`S0 = {pers_h3, lh3, limax, sm, h3_sm}` (`h3_sm = pers_h3 * z(sm)`, interaksi hujan x kebasahan, INTI sejak revisi 4);
   `S1 = S0 + q_q2`; `S2 = S1 + {hx, qa}`; `S3 = S2 + {q_ant_mx, q_ant_mn, dq, p_ant}`; `twsa` BUKAN bagian set, melainkan ekstensi `E_twsa` di langkah 4b) dengan
   wilayah lain DIPEGANG pada pilihan terkini; setiap evaluasi memasang ulang model gabungan (pooling), dan metrik = logloss
   WILAYAH `w` saja (baris wilayah itu) pada F1-F4; pilih set paling sederhana dalam satu-SE (§3.2c, SE dari logloss wilayah antar-lipatan).
   Satu putaran, tanpa iterasi sampai konvergen. Tidak ada kombinasi fitur lain. CN memakai S1 untuk semua wilayah (tetap).
   Fitur di luar set wilayah itu dipaksa 0 untuk wilayah itu (`beta_nas + delta_w = 0`).
4b. **Ekstensi fitur (§3.2d), setelah set dasar S* terpilih.** Delapan ekstensi, urutan tetap: `E_kedap`, `E_pasang`, `E_hulu`, `E_neraca`
   (Jawa), `E_twsa` (Jawa), `E_swi` (bersyarat), `E_cs` (Jawa, Sumatera), `E_iklim`. Untuk tiap ekstensi (hanya yang berlaku di wilayah itu), evaluasi S* + ekstensi (ekstensi sebelumnya yang sudah
   diterima tetap ikut) pada logloss wilayah F1-F4; diterima bila SEMUA benar: (a) rerata logloss turun dan penurunan itu > 1 SE dari
   selisih berpasangan antar-lipatan (lebih ketat dari satu-SE biasa karena ruang seleksi bertambah); (b) titik dETS Waspada
   (S* + ekstensi) - S* > 0 pada >= 3 dari 4 lipatan; (c) logloss turun pada >= 3 dari 4 lipatan. Syarat (b)-(c) berlaku untuk SEMUA ekstensi, bukan
   hanya `E_iklim` (revisi 2 hanya memberlakukannya pada iklim; `E_twsa` kini diperlakukan sama karena alasan yang sama: sedikit sampel
   independen, GRACE 17 bulan hilang). Satu putaran.
5. Perbandingan antar-set/ekstensi yang memuat `twsa` (Jawa) dilakukan pada IRISAN baris yang `twsa`-nya valid (bulan hilang di §3.2 baris
   `twsa`), supaya pembandingnya setara; model final tetap dilatih semua baris. Bila `E_twsa` diterima, baris tanpa `twsa` valid mendapat
   `twsa` = 0 setelah standardisasi (netral) dan jumlahnya dilaporkan.
6. Pilihan dibekukan di kandidat sebelum prospektif; tidak ada pemilihan ulang dengan data prospektif.

Partial pooling (butir b): `beta_w = beta_nas + delta_w`, dipasang bersama; `beta_nas ~ N(0, tau^2)`, `delta_w ~ N(0, tau_w^2)`;
`beta_nas + delta_w >= 0`. `delta_w = 0` untuk semua `w` = CN dengan set yang sama (swauji). Wilayah tipis menyusut ke nasional.

(d) **Dinilai nasional DAN per wilayah.** Vonis (§5.2) dijatuhkan NASIONAL (pooled). Per wilayah dilaporkan dETS (C - klimatologi)
Waspada/Siaga dan dBSS dengan CI. **Satu rumus ambang per wilayah:** wilayah dinilai bila jumlah positif `y0` pada baris prospektif
yang dinilai `>= 40`; kurang dari itu ditulis **"belum cukup data"** (bukan lulus, bukan gagal). `mde_80` wilayah dihitung dan dicatat
sebagai keterangan (bukan penentu). Ambang 40 tidak memakai label uji dalam penetapannya. Per wilayah TIDAK bisa meluluskan; hanya
bisa menahan: wilayah bercukup data yang dETS (C - klimatologi) Waspada titiknya <= 0 ditandai "tidak terbukti di wilayah ini" dan
tidak boleh ikut tayang di wilayah itu walau nasional LULUS.

(e) **CW dibanding CN:** kontras dETS (CW - CN) Waspada/Siaga dan dBSS. **CW hanya boleh jadi kandidat tayang bila CW LULUS dan batas
bawah dETS (CW - CN) Waspada > 0 serta batas bawah dBSS (CW - CN) > 0.** Selain itu yang dipertimbangkan CN (bila CN LULUS). Bila CW tak
menambah atas CN, itu hasil sah: satu rumus nasional cukup.

### 3.2c Spesifikasi penyelesai dan validasi bersarang

**Penyelesai (kode baru; `gbdt.latih_lr` tidak mendukung offset, nonneg, maupun pooling dan tidak disunting).**
- Model: `eta_i = logit(p0_i) + sum_j x_ij * beta_{w(i),j}`, `p_i = sigmoid(eta_i)`; tanpa intersep; koefisien `logit(p0)` tetap 1;
  `x` distandardisasi dengan rerata dan simpangan baku berbobot baris latih himpunan tahun yang sedang dipasang (bukan tahun uji).
- Fungsi tujuan: negatif log-likelihood berbobot sampel + `sum_j beta_nas,j^2 / (2 tau^2)` + `sum_{w,j} delta_wj^2 / (2 tau_w^2)`
  (jumlah, bukan rerata; bobot sampel apa adanya, 0,5 untuk SEDANG).
- Algoritma: IRLS/Newton penuh pada vektor `[beta_nas, delta_w1, ...]` dengan himpunan-aktif untuk `beta_nas >= 0` dan
  `beta_nas,j + delta_wj >= 0`: variabel yang melanggar setelah langkah dijepit ke batas dan dibekukan di iterasi berikutnya sampai
  gradiennya menunjuk keluar batas. Pemecah linear: eliminasi Gauss berpivot atas matriks Hessian diagonal-ditambah-L2 (selalu
  definit positif). Redaman langkah (garis-pencarian pembagi-dua) bila likelihood turun.
- Nilai awal semua koefisien 0 (= klimatologi; fungsi tujuan cembung sehingga titik awal tidak mengubah solusi). `logit(p0)` dijepit ke
  [logit(1e-5), logit(0,5)]; `sigmoid` dihitung pada `eta` dijepit ke [-30, 30] (bukan 0 atau 1 persis). Baris berbobot 0 (RENDAH)
  DIBUANG sebelum standardisasi, sehingga rerata/simpangan baku tidak memuat mereka.
- Konvergen bila maks |perubahan koefisien| < 1e-6 DAN norma gradien aktif < 1e-6 x jumlah bobot, maksimum 50 iterasi; gagal
  konvergen = galat keras (keluar 3), tidak diam-diam diteruskan. Hasil dicatat: iterasi, gradien akhir, jumlah koefisien terjepit.
- Swauji penyelesai: (i) tanpa fitur menghasilkan `p = p0` persis; (ii) `tau -> 0` menghasilkan `beta -> 0`; (iii) tanpa offset,
  nonneg mati, pooling mati, `tau` besar, cocok `gbdt.latih_lr` pada data mainan (toleransi 1e-4); (iv) data mainan dengan koefisien
  sebenarnya negatif menghasilkan 0 (bukan negatif); (v) `delta_w = 0` identik CN.

**Aturan satu-SE (satu kalimat):** untuk tiap konfigurasi dihitung logloss pada tiap lipatan bergulir F1-F4 (n = 4); SE = simpangan baku
logloss antar-lipatan dibagi akar 4; dipilih konfigurasi PALING SEDERHANA (urutan: `tau`/`tau_w` lebih kecil, lalu set lebih kecil)
yang rerata loglossnya <= rerata minimum + SE konfigurasi minimum itu. Dengan n = 4 lipatan SE itu kasar (simpangan baku dari empat angka
berkorelasi karena tahun-tahun berurutan berbagi data latih); aturan ini hanya memutus seri ke arah yang lebih sederhana, bukan uji
signifikansi, dan konsekuensinya diakui: pilihan antar-konfigurasi berdekatan sebagian arbitrer.

**Validasi bersarang (anti-bocor dua tingkat).** Lipatan luar (tahun uji `y`): semua penyesuaian memakai hanya tahun `< y`. Di
dalamnya, lantai klimatologi `p0` untuk baris latih tahun `z` dihitung LOYO atas `{tahun latih} \ {z}`, dan `beta`, `tau`, Platt,
batas persentil `pers_h3`/`p_ant`, `Q2_sel`, dan standardisasi untuk skor tahun `z` dilatih pada himpunan tahun YANG SAMA
`{tahun latih} \ {z}`: tidak ada komponen yang melihat tahun `z`. Jalur Platt khususnya: logit luar-lipatan untuk tahun `z` berasal
dari model yang tidak pernah melihat label atau fitur-turunan tahun `z`; lalu Platt dipasang di gabungan logit itu; pada model akhir
Platt dipakai apa adanya. Swauji khusus Platt: (i) mengubah label tahun `z` tidak mengubah logit luar-lipatan tahun `z`; (ii)
mengubah label tahun `z` mengubah logit tahun lain hanya lewat lantai/`beta` (diharapkan); (iii) `p0` baris latih tahun `z` tidak
berubah bila label tahun `z` diubah.

### 3.2d Ekstensi fitur kandidat (keputusan pemilik 3 Nov): pasang astronomis, hujan hulu, iklim antar-tahun, kedap air

Semua dipilih lewat langkah 4b (aturan di lipatan F1-F4), bukan kandidat bervonis baru: kandidat bervonis tetap CN, CW, A (m FINAL = 14, §5.1).
Revisi 4 menambah ekstensi `E_neraca`, `E_swi`, `E_cs` dan fitur inti `h3_sm`; semuanya tetap bukan kandidat bervonis, m tetap 14 (FINAL). Alasan m tidak naik: Bonferroni di sini menghitung KEPUTUSAN pada data uji; ekstensi dipilih seluruhnya pada F1-F4 dan dibekukan
sebelum sidik, jadi tidak ada keputusan tambahan di prospektif. Harga yang diakui: ruang seleksi lebih besar membuat angka lipatan
(bukan vonis) lebih optimistis dan daya pemilihan lemah; itu sebab ambang 4b lebih ketat. Aturan baris-dibuang SETARA antar-set:
perbandingan logloss antar-set/ekstensi di satu wilayah dilakukan pada irisan baris yang valid untuk SEMUA fitur dari set yang
dibandingkan; model final dilatih semua baris valid untuk fiturnya sendiri, nilai hilang di prospektif = 0 (netral) dan dihitung.

**Cakupan ekstensi (keputusan, revisi 5):** ekstensi (`E_*`) hanya berlaku untuk **CW**. **CN dan model tayang-CN TIDAK memakai ekstensi** (CN = S1 tetap + `h3_sm`);
alasan: CN adalah pembanding yang sengaja sederhana dan satu-rumus nasional (§3.2b e), sedangkan ekstensi bersifat per wilayah dan sebagian hanya satu wilayah (Jawa);
memberi CN ekstensi berarti memilih fitur nasional dengan data wilayah yang berbeda. **A** tidak memakai ekstensi lain; hanya anteseden (`p_ant`, `q_ant_mx`) dalam definisinya.
Bila CW sekunder (wilayah efektif < 3), ekstensi tidak berlaku sama sekali. **Risiko seleksi kebetulan diakui:** dengan 8 ekstensi di Jawa dan syarat 4b (>1 SE, >=3/4 lipatan,
titik dETS>0), peluang minimal satu ekstensi salah-terima oleh kebetulan diperkirakan kasar 30-55% (n=4 lipatan, lipatan berkorelasi); ini hanya menurunkan DAYA CW
(fitur derau ikut), BUKAN menghasilkan vonis palsu, karena vonis dijatuhkan pada prospektif T+1.. yang tak dipakai memilih; `E_iklim` paling rapuh (~10 nilai tahun).

**Aturan tambahan 4b:** bila `q_q2` tidak termasuk S* wilayah itu, `pa_q` tidak dibentuk (hanya `pa_h3`). Jumlah hari DMI hilang (nilai -9999) di baris latih dan prospektif dilaporkan per lipatan.

**E_pasang (hanya kab pesisir).** FAKTA yang mengoreksi permintaan: `scripts/banjir/pasang_astro.py` menghasilkan INDEKS GAYA PEMBANGKIT
PASANG (0-1, Bulan+Matahari, `gaya(t)` -> komponen diurnal dan semi-diurnal, dinormalkan ke maksimum 2005-2035), BUKAN tinggi pasang
dan BUKAN tinggi muka air; tidak ada konstanta harmonik per titik (bobot diurnal/semi `PROFIL` pantura 0,8/0,2 dan lain 0,5/0,5
adalah ASUMSI). Fitur: `pa(k, e)` = indeks profil hari `e` (WIB, rerata atau maks harian dari jam-an `gaya`; dipilih MAKS harian,
tetap), pusat dan standardisasi pada baris latih, murni fungsi tanggal (deterministik, nol bocor, identik di operasi). Interaksi saja:
`pa_h3 = pa * pers_h3` dan `pa_q = pa * q_q2`, koefisien `>= 0` (pasang tinggi menahan aliran sungai: arah fisik jelas), efek utama `pa`
TIDAK ada (rob hari kering bukan label sini). Profil: `pantura` untuk kab pesisir provinsi dalam `KP_PANTURA` (31, 32, 33, 35, 36) yang
berpantai Laut Jawa (Kota Semarang), selain itu `lain` (Cilacap pantai selatan memakai `lain`); diimpor dari `pasang_astro.PROFIL`, tidak diubah.
**Definisi kab pesisir (ditetapkan sekarang):** kab/kota yang wilayah administrasinya menyentuh garis pantai laut (poligon kab
berbatasan dengan laut/ garis pantai), TIDAK termasuk yang hanya dekat muara sungai di pedalaman. Daftar dikunci di `latih.json`
bagian `pesisir` sebelum sidik dari poligon batas kab dan garis pantai (**BELUM DICEK**, butuh sumber garis pantai yang sama dengan
`rob.py`). Dugaan awal 22 dari 40 kab (untuk perencanaan saja): Aceh Selatan, Kota Pariaman, Padang Pariaman, Cilacap, Kota Semarang,
Badung, Buleleng, Karangasem, Tabanan, Kota Denpasar, Kota Balikpapan, Kota Bontang, Penajam Paser Utara, Kota Tarakan, Gorontalo,
Kota Gorontalo, Kota Medan, Kota Bima, Kota Ambon, Halmahera Utara, Manokwari, Luwu Utara; Kota Samarinda dan semua kab pedalaman bukan
pesisir. Cakupan titik rob: `data/raw/banjir/rob/titik.json` memuat 66 titik tetapi hanya 4 dari 40 kab sampel (Kota Medan, Kota Semarang,
Kota Bima, Kota Ambon), jadi titik rob TIDAK dipakai sebagai definisi; `pasang_astro` tidak butuh titik (fungsi tanggal + profil), hanya
`PROFIL` yang diasumsikan. Daya: kab pesisir = bagian dari 40, hanya di wilayah yang cukup positif; dilaporkan.

**E_hulu.** Memakai ulang fitur `model_kab_hulu` lewat IMPOR (tanpa menyalin kode): `hu3` (jumlah hujan CHIRPS hulu hari UTC `e-4..e-2`;
`log1p`) dan `hulu_ada`; `hu1` tidak dipakai. Jendela yang diminta "e-3..e-1 WIB" = hari UTC `e-4..e-2` karena hari CHIRPS UTC `e-1`
berakhir pukul 07.00 WIB hari `e` (sebagian jatuh di hari sasaran, bocor); jadi jendela HULU dipakai persis, bukan digeser. Tanda `>= 0`
(banjir kiriman), L2 `tau`. Pembatas jujur: CHIRPS final terbit ~4 bulan sesudah bulan pengamatan, hari hilang 2025-05, 2026-04, 2026-05 (baris
dibuang untuk irisan pemilihan), 17 dari 39 kab tanpa hulu (basin lokalnya sudah hulu paling atas; kab tanpa hulu `hu3 = 0`). **Fitur
ini TIDAK tersedia operasional** (produk final), jadi hanya bisa dinilai di P1 dan tak punya padanan P2 sampai produk cepat (CHIRPS prelim
atau IMERG Early) diuji. HULU validasi 2022-2025 sudah menyentuh periode yang sama (baris 5 daftar buka); tidak menambah m.

**E_iklim (antar-tahun).** Fitur: `oni` = ONI (NOAA CPC, `oni.ascii.txt`, rata-rata 3 bulanan) musim yang BERAKHIR di bulan `b-2` (pusat
`b-3`; ONI terbaru 3 Nov = JAS 2026 = berakhir September); `dmi` = DMI HadISST (NOAA PSL, `dmi.had.long.data`) bulan `b-6` (terukur: berkas
yang dibaca 3 Nov berisi 2026-01..05, 2026-06 dst bernilai -9999 dan dibuat 25 Jul 2026, jadi latensi >= 5 bulan; `L = 6` tetap).
Keduanya distandardisasi di tahun latih. **Bentuk (ditetapkan sekarang), pengubah lantai:** `eta = logit(p0) + sum beta*z + g_o * oni
+ g_d * dmi + h_o * oni * (logit(p0) - m_w) + h_d * dmi * (logit(p0) - m_w)`, `m_w` = rerata `logit(p0)` baris latih wilayah (pusat),
sehingga interaksi mengatur seberapa kuat efek ENSO/IOD pada musim dan kab yang memang rawan banjir (skala odds), bukan menggeser semua
hari sama. Tanda koefisien BEBAS (efek ENSO/IOD bervariasi per wilayah dan musim; tidak ada arah fisik tunggal), tetapi `tau_iklim = 0,05`
tetap, jauh lebih kuat dari `tau`. **Peringatan daya:** ONI/DMI hanya ~10 nilai tahun independen di latih, 4 di F1-F4: pemilihan di
lipatan hampir kebetulan, jadi syarat 4b lebih ketat (>= 3 dari 4 lipatan DAN > 1 SE) dan hasil "tidak diterima" diharapkan.
**MJO DITOLAK:** `rmm.74toRealtime.txt` BoM dapat diakses (HTTP 200) tetapi baris terakhirnya 2024-02-24 saat dibaca 3 Nov 2026
(tidak lagi diperbarui), jadi tidak mencakup F4-F5 dan prospektif; OMI NOAA PSL (`omi.1x.txt`) dapat diakses tetapi baris terakhir
2026-06-24 (latensi ~4 bulan), tidak punya latensi "e-1". Tidak ada indeks MJO terbuka yang terbukti tersedia harian tepat waktu: **BELUM DICEK
AKSES** sumber harian lain (mis. CPC); sampai ada, MJO tidak masuk protokol.

**E_kedap.** Porsi lahan kedap air per kab (statis), HANYA interaksi `kedap * limax` (hujan jam-an deras di kota padat; arah jelas, `>= 0`),
tanpa efek utama (efek utama statis = laju lapor, §3.2). Sumber: ESA WorldCover v200 kelas 50 (built-up), CC BY 4.0, sudah dibaca
`fitur_banjir.py` bagian `tutupan` (reuse, bukan kode baru); alternatif GHSL GHS-BUILT-S R2023A (CC BY 4.0, JRC). Akses dicek 3 Nov:
ubin WorldCover S06E105 dan zip GHSL 30 arcsec membalas HTTP 200. WorldCover satu tahun (2021) dipakai untuk semua tahun
(statis; perubahan lahan 2016-2021 diabaikan, dicatat). **BELUM DICEK:** cache `data/raw/banjir/fitur/` (tutupan) belum ada di
checkout ini dan `lab_tutupan.py` (IO LULC) tak ada cache; unduh ulang butuh GDAL (`fitur_banjir.py`), jangan numpy tanpa venv.

**E_neraca (hanya Jawa; P2 tersedia).** `anomali S` dari `deret_bulanan.json`: `sa(k, b) = S(k, b-4) - rerata bulan-kalender S atas TAHUN LATIH
lipatan` (`deret.anomali(deret, tahun_acuan)`; tahun acuan = tahun latih lipatan itu saja, bukan 2010+), distandardisasi di latih, tanda `>= 0`.
Latensi: bulan `b` tersedia ~3 bulan sesudah akhir `b` (radiasi POWER), jadi untuk hari di bulan `m` dipakai bulan `m-4` (terukur: bulan terakhir
2026-07 tersedia pada 3 Nov = `m-4` untuk Nov). Opsi `m-2` hanya bila ET0 bulan akhir diisi klimatologi: BELUM dikerjakan, BUKAN bagian protokol
ini. Cakupan: 13 kab sampel Jawa, kunci 4 digit (peta nama -> kode `uji_logbook.kode_geo` BELUM DICEK); 2016-2025 tanpa bulan hilang
(berbeda dengan GRACE, 17 bulan hilang). Dibandingkan dengan `twsa` GRACE; KEDUANYA boleh dipilih, aturan 4b sama. `S` adalah keluaran MODEL
(bak Thornthwaite-Mather, TAW 130 mm, `k` 2 bulan; label "estimasi-model"), dihitung dari hujan CHIRPS final dan ET0 POWER. **Ditutup (dibaca dari `meta` 3 Nov):** `P` = CHIRPS v2.0 via IRI (produk FINAL; revisi prelim -> final mungkin mengubah nilai bulan baru), `ET0` = FAO-56 PM dari NASA POWER MERRA-2, bak
Thornthwaite-Mather dijalankan menerus sejak 1991-01, rentang 2010-01..2026-07, 119 kab, tanpa bulan hilang, `ekstensi_ditarik` 2026-11-03; P2 tersedia dengan
latensi `m-4`. Karena berkas diperpanjang tiap bulan dan angka bulan lama dapat berubah (revisi CHIRPS), hash dikunci pada POTONGAN (§7), bukan berkas utuh.
Tersisa BELUM DICEK: peta nama kab -> kode 4 digit untuk 13 kab.

**E_swi (indeks air tanah gaya JMA; PENAMBAH `sm`).** Soil Water Index tiga tangki seri. **Parameter TERVERIFIKASI** (3 Nov) ke sumber primer JMA
(`https://www.jma.go.jp/jma/kishou/know/bosai/dojoshisu.html`, Tabel 1; Ishihara dan Kobatake 1979): tangki 1: L1 = 15 mm, alpha1 = 0,1, L2 = 60 mm, alpha2 = 0,15, beta1 = 0,12;
tangki 2: L3 = 15 mm, alpha3 = 0,05, beta2 = 0,05; tangki 3: L4 = 15 mm, alpha4 = 0,01, beta3 = 0,01. Satuan alpha, beta = PER JAM. Persamaan (JMA memakai langkah 10 menit,
R = hujan per langkah): `S1(t+dt) = (1 - beta1 dt) S1 - q1 dt + R`; `S2(t+dt) = (1 - beta2 dt) S2 - q2 dt + beta1 S1 dt`; `S3(t+dt) = (1 - beta3 dt) S3 - q3 dt + beta2 S2 dt`; `q1 = alpha1 (S1 - L1)
+ alpha2 (S1 - L2)`, `q2 = alpha3 (S2 - L3)`, `q3 = alpha4 (S3 - L4)`, tiap suku keluaran negatif = 0; `SWI = S1 + S2 + S3` (mm). **Keputusan satuan langkah:** hujan JAM-AN ERA5, dt = 1/6 jam
(6 sub-langkah, R/6 per sub-langkah; setara langkah 10 menit JMA). Hujan harian dibagi rata (24 sub-langkah) DILARANG (meremehkan puncak), dan dt = 24 jam DILARANG (beta1 dt = 2,88 -> simpanan
negatif). Parameter dikalibrasi untuk DAS granit Jepang dan dipakai seragam; TIDAK dikalibrasi tropis dan TIDAK disetel di sini (dikunci apa adanya). Preseden tropis: Taiwan (SWI > 107 mm
untuk aliran debris) dan usulan JICA-NBRO Sri Lanka 2019; penerapan Indonesia tidak ditemukan.
Keluaran `swi(k, e)` = SWI pada AKHIR hari `e-2` (hanya hujan jam `<= e-2` 23:00 WIB, tidak bertumpang tindih dengan `h3` maupun `p_ant`), kab = maks atas sel; fitur `swi` dan `pers_h3 * zswi`
(anomali per kab-bulan, urutan sama dengan `h3_sm`), tanda `>= 0`. Spin-up >= 1 tahun sebelum tahun latih pertama. Aturan lama "swi menggantikan `sm`" DIHAPUS; `swi` tidak menggantikan `sm`.
**Syarat data (memblokir):** hujan jam-an ERA5 104 sel TIDAK tersimpan di cache `uji_balik` (hanya `p` harian dan `im` = maks jam per hari; lihat §3.6), jadi E_swi butuh unduh jam-an (kuota
~sama dengan unduhan ERA5 asli, >= 1-2 hari) DAN data sejak >= 2015-01 untuk spin-up (cache mulai 2015-12-22: baris 2016 tanpa spin-up penuh dikeluarkan dari irisan pembanding E_swi).
Bila jam-an tidak tersedia sebelum `latih`, E_swi DIHAPUS (bukan diganti harian). Ekstensi 4b.

**E_cs (indeks seruakan dingin CENS; hanya Jawa dan Sumatera).** Dipilih SATU definisi: **CENS** (Hattori, Mori, dan Matsumoto 2011, JMSJ 89A:27, doi:10.2151/jmsj.2011-A02; abstrak
primer terverifikasi): rerata AREA angin utara > 5 m/s di kotak 105-115 BT, 5 LS-0 (BUKAN 5 LS-5 LU seperti draf sebelumnya). Data asli QuikSCAT 10 m; di sini memakai **angin 10 m ERA5** (setara
definisi asli) dengan komponen meridional `v` (utara = `-v`). `vbar(e)` = rerata area `-v` pada kotak itu, dirata-rata hari `e-1..e+1` (jendela h3). Fitur: `cs_bin(e) = 1[vbar > 5 m/s]` (ambang biner fisik)
dan `cs_cont(e) = max(0, vbar - 5)` (besaran kontinu); model memakai interaksi `cs_cont * pers_h3`, tanda `>= 0`, L2 `tau`; `cs_bin` dilaporkan (frekuensi seruakan per bulan/tahun). TIDAK ada z-skor DJF
dan tidak ada statistik musim, sehingga Nov/Mar/Apr diperlakukan sama (fisik, bukan statistik). Alternatif Chang, Harr, dan Chen 2005 (MWR, doi:10.1175/MWR-2868.1; primer tidak terakses, dua sumber
sekunder sepakat): `v` 925 hPa rerata 110-117,5 BT di 15 LU, seruakan bila `-v >= 8 m/s` (lemah 8-10, sedang 10-12), TIDAK dipakai. Hujan naik 10-100% (hingga ~150% bersama MJO) per ringkasan
literatur (sekunder). **BELUM DICEK:** akses/kuota angin 10 m ERA5 untuk area (rerata area = beberapa titik kisi; Open-Meteo per titik, jumlah titik dan kuota belum dihitung; kalau tak layak,
`E_cs` dihapus), padanan IFS di operasi (P2), dan daya (satu deret regional, ~10 musim; sedikit peristiwa seruakan).

### 3.3 Tingkat 3: kalibrasi Platt per pulau, lintas tahun

Platt (`model_kab.platt`, `b0 + b1 * z`, l2 1e-3, berbobot sampel) dipasang pada `eta` LUAR-LIPATAN leave-one-year-out
(setiap tahun latih diskor oleh model yang dilatih di tahun-tahun lain, termasuk lantainya), terpisah untuk tiap WILAYAH EFEKTIF
hasil penggabungan §3.2b langkah 1 (Sumatera 6 kab, Jawa 13, Kalimantan 7, Bali-NT 7, Lainnya = Sulawesi+Maluku-Papua 7, bila lolos ambang; pemetaan kode provinsi -> wilayah
yang sama). Model akhir dilatih di semua tahun latih dan memakai Platt itu.
Alasan per pulau: laju lapor dan musim hujan berbeda antar-pulau dan mengubah URUTAN antar-kab (Platt per pulau mengubah
peringkat lintas-pulau, jadi ia memengaruhi ETS pada alarm sama; kalibrasi global tidak). Syarat wilayah = rumus tunggal §3.2b langkah 1 (n_kab >= 6, P_w >= 100, T_w >= 5); kriteria "2 tahun berpositif" di draf lama
DIGANTI olehnya. Proksi DIBI 2016-2025 menunjukkan semua wilayah efektif jauh di atas 100; nilai `P_w`, `T_w` sebenarnya
(label v2 berbobot) ditulis `latih` sebelum sidik (berkas v2 tidak ada di checkout ini).

SETIAP pembanding berprobabilitas (klimatologi, LR, persistensi sebagai skor, aturan sebagai peluang) dikalibrasi Platt per
pulau dengan prosedur LOYO yang sama (kasus ilmu 27 Okt). Klimatologi terkalibrasi adalah acuan Brier semua dBSS.

### 3.4 Pembanding

Semua diberi perlakuan setara (jumlah alarm sama, Platt sama, baris sama):

1. **Klimatologi kab x bulan** = tingkat 1 + Platt per pulau (model nol).
2. **Persistensi:** skor = 1 bila kab itu punya kejadian berlabel di hari `e-1` (label evaluasi), selain itu 0; dipecah acak
   biji 11. Tidak bisa disamakan jumlah alarmnya (alarm = hari sesudah kejadian), jadi dinilai di jumlah alarm alaminya dan
   dilaporkan; BUKAN penentu LULUS C (C tidak memakai label hari lalu), tetapi dikontras terhadap varian CP (§3.5).
   Label `e-1` yang dipakai penilaian = salinan beku yang dibekukan sebelum `buka` (satu snapshot untuk semua penilai), BUKAN DIBI
   susulan yang berubah; persistensi dengan label susulan akan lebih baik daripada yang tersedia di operasi.
   **BELUM DICEK:** label hari `e-1` tersedia operasional pada hari terbit? DIBI telat berbulan-bulan; logbook Pusdalops
   harian belum terbukti tersedia sehari-hari.
3. **Regresi logistik tanpa offset (LR1):** resep `model_kab` (`G.latih_lr`, l2 1,0) pada 10 fitur M0 HULU (`h1, h3, imax,
   pers_h3, sm, bulan_sin, bulan_cos, frek_dibi, bahaya_b, level_aturan`), label latih sama (`frek_dibi` seperti `model_kab.py:219`: ekspansif di baris latih, laju penuh di baris uji; ketidaksimetrisan
   ini diwarisi apa adanya dan dilaporkan, LR1b tanpa `frek_dibi` ikut dilaporkan), tanpa offset, tanpa tanda
   nonneg. Inilah pembanding yang mematikan `model_kab`; wajib dikalahkan. **LR2:** C dengan koefisien `logit(p0)` BEBAS
   dan tanda bebas (membedakan efek offset dari efek fitur); dilaporkan, bukan gerbang.
4. **`status.py` berlaku:** alarm = `level_aturan` >= Waspada / >= Siaga, dihitung ulang dengan `level_banjir(h3, bahaya sel,
   None, imax)` maks atas sel (= `ub.level_harian`, BUKAN `status.json`; PRAREG-KAB2 §2). Sebagai peluang (hanya dBSS): laju
   berbobot per level di latih.

### 3.5 Varian sekunder dan tahap 4

- **CP (varian sekunder, tanpa vonis):** C + `kemarin` (= ada kejadian berlabel di `e-1`, label evaluasi) bertanda nonneg. Hanya
  boleh tayang bila persistensi label operasional terbukti tersedia (butir BELUM DICEK di §3.4.2). Dilaporkan dETS(CP - C) dan
  dETS(CP - persistensi).
- **Tahap 4, dampak:** `model_dampak.py` (KK dan rumah, LULUS pada uji 2024-2026-09-30, `model_dampak.buka`; peluang-nya sendiri
  TIDAK LULUS) dipanggil HANYA untuk kab-hari yang peluang akhirnya `p >=` ambang alarm Siaga (jumlah alarm = aturan `status.py`
  Siaga). Hasilnya dibaca "JIKA banjir terjadi, perkiraan KK/rumah", tidak pernah "banjir akan terjadi". Tahap 4 TIDAK ikut
  vonis kejadian, tidak mengubah `p`, tidak punya kriteria LULUS di dokumen ini (kriterianya tetap yang ada di
  `PRAREG-DAMPAK.md`). **BELUM DICEK:** kompatibilitas masukan `model_dampak` (E/D dari POWER 50 km, D = persentil debit)
  dengan keluaran C; sidik `model_dampak.sidik` membekukan kodenya, jadi C tidak boleh menyunting berkas itu.

### 3.6 Kandidat A: ambang pemicu intensitas-durasi (ID) per kab (keputusan pemilik 3 Nov)

Kandidat ketiga yang divonis (ber-kriteria §5.2, bukan sekunder). Bentuknya berbeda dari CN/CW: tidak memakai lantai klimatologi
sebagai offset, tetapi menghitung seberapa sering "kondisi seperti ini" dulu berakhir banjir.

**Fakta sumber hujan jam-an (dicek 3 Nov, sebelum merancang):** cache ERA5 `uji_balik` menyimpan per hari hanya `p` (jumlah harian), `im`
(maksimum jam-an hari itu = `imax`), dan `sm` (`uji_balik.deret`, baris 144-159); deret jam-an TIDAK disimpan. Akumulasi durasi
D = 3, 6, 8, 12 jam karena itu TIDAK dapat dihitung dari cache; hanya D = 1 jam (`im`), ~24 jam (jumlah hari kalender WIB `p`), dan
72 jam (`h3`) yang ada. Respons asli Open-Meteo sudah meminta `hourly=precipitation` (baris 122), jadi unduh ulang jam-an 104 sel x
2016-2025 memakai kuota yang sama dengan ERA5 sebelumnya (~8.216 bobot, >= 1-2 hari, kuota dibagi proses lain). **BELUM DICEK**
kuota dan fungsi penyimpan deret jam-an (butuh kode baru yang tidak mengubah `uji_balik.py`). Aturan penurunan yang ditetapkan sekarang:
bila deret jam-an 104 sel 2016-2026-10-18 belum lengkap dan ber-hash sebelum `latih`, A dibatasi pada D = {1, 24, 72} dari cache yang
ada (dengan "24 jam" = hari kalender WIB, bukan jendela bergulir 24 jam; dicatat), dan dinyatakan "durasi menengah tidak dinilai".

**Definisi (kalau jam-an lengkap, D = {1, 3, 6, 8, 12, 24, 72} jam):**
1. **Jendela kejadian = jendela fitur h3:** jam-jam pada hari WIB `e-1..e+1` (`GESER = -1`), tidak melihat jam sesudah akhir hari
   `e+1`; D = 72 jam setara `h3` (jendela penuh). `acc_D(k, e)` = maksimum akumulasi `D` jam berurutan di dalam jendela itu, per sel,
   kab = maksimum atas sel (ERA5 hourly, zona Asia/Jakarta).
2. **Ambang per kab per durasi:** `theta_{k,D}` = persentil ke-20 BERBOBOT (bobot v2: TINGGI 1, SEDANG 0,5) dari `acc_D` pada hari-hari KEJADIAN kab `k` (jangkar v2 TINGGI dan
   SEDANG; RENDAH tidak), dari tahun latih saja. Bersarang: bagi baris tahun `z` ambang dari kejadian tahun `!= z` (LOYO, sama dengan §3.2c).
   Kab dengan kejadian latih `n_k < 5` memakai ambang wilayah efektif sepenuhnya; kab dengan `n_k >= 5` memakai
   `(n_k q_k + 5 q_w)/(n_k + 5)` (partial pooling ke kuantil ke-20 wilayah `q_w`, §3.2b; wilayah dengan < 5 kejadian ke nasional).
3. **Kondisi hari:** `s(k, e)` = jumlah durasi `D` dengan `acc_D >= theta_{k,D}` (0..|D|); `a(k, e)` = 1 bila anteseden basah:
   `p_ant >= 0,5` (persentil lokal median; §3.2) ATAU `q_ant_mx >= 0` (debit anteseden di atas Q2); `a = 0` bila fitur itu tak tersedia
   di baris (dicatat, tidak diimputasi).
4. **Skor harian = peluang terkalibrasi per sel `(s, a)`, dua arah:** untuk wilayah efektif `w` dan sel `c = (s, a)`,
   `p_w(c) = (positif berbobot di c + 30 r_w) / (hari berbobot di c + 30)` dengan `r_w` laju dasar berbobot wilayah; lalu kab
   `k`: `p(k, c) = (pos_k(c) + 30 p_w(c)) / (hari_k(c) + 30)` (pooling bertingkat; hari TANPA banjir yang melampaui ambang masuk
   penyebut, jadi frekuensi alarm palsu ikut terhitung, bukan hanya POD hari banjir). Seluruhnya dari tahun latih (LOYO bersarang).
   Lalu Platt per wilayah efektif LOYO sama dengan C (§3.3). Skor bersifat diskret (ties banyak); seri dipecah acak biji 11.
5. Layar (bila LULUS): kalimat "kondisi seperti ini pada `k` dari `n` kali sebelumnya berakhir banjir", angka `k/n` dari sel `c` wilayah;
   DILARANG "pasti banjir" atau kata kepastian lain.

**Catatan jujur A:** (0) `theta` LOYO bersarang di baris latih tetapi PENUH (seluruh tahun latih) di baris uji/prospektif: ketidaksimetrisan ini disengaja (mencegah ambang yang "menghafal" tahun barisnya; uji memakai ambang yang memang akan dipakai), sama pola dengan `p0` §3.1. Keputusan fallback durasi (D penuh vs {1,24,72}) diambil SEKALI, sebelum `latih`, dicatat di `latih.json` bagian `A_durasi` dan tidak diubah sesudahnya. P2 A hanya memakai D = {1, 24, 72} (jam-an sungguhan dari prakiraan harian belum diarsip). (a) ERA5 meremehkan puncak (ilmu: replay Bekasi 2025, 4-17x terlalu kecil), sedangkan operasi memakai prakiraan
IFS/best_match; seluruh ambang A dalam "satuan ERA5" dan tidak bisa dipindah ke satuan lain tanpa bukti. (b) GSMaP jam-an (penakar-
satelit) peningkatan di kemudian hari; arsip jam-an belum diunduh (`m1_hujan` hanya DKI), **BELUM DICEK**, bukan bagian protokol ini.
(c) Tanpa lantai klimatologi, A bisa kalah dari C hanya karena laju lapor kab; pooling kab ke wilayah di langkah 4 meredamnya, dan dETS
terstratifikasi per kab (§5.3) memisahkannya. (d) Persentil ke-20 dan bobot 5/30 TETAP, tidak disetel. (e) Ambang dari hari kejadian
saja menciptakan seleksi: kab dengan kejadian sedikit mendapat ambang wilayah.
**Pembanding dan kriteria A:** sama dengan C (§3.4, §5.2), dilaporkan nasional dan per wilayah (aturan 40 positif §3.2b d). Kontras
A - C dilaporkan tanpa vonis. A tidak memakai `beta`, jadi §3.2c berlaku hanya untuk validasi bersarang dan swauji (bukan penyelesai).

## 4. Pembagian waktu dan status "terbakar"

### 4.1 Pemeriksaan jujur: apa yang sudah dilihat

| Periode | Sudah dilihat oleh | Status untuk protokol ini |
| --- | --- | --- |
| 2016-2021 | latih `model_kab`, `ambang_wilayah`, dll | latih |
| 2022-2023 | validasi `model_kab`; latih HULU/DEBIT/TANAH | latih/validasi |
| 2024-2025 | uji `model_kab` DIBUKA 29 Okt (TIDAK LULUS); validasi HULU/DEBIT/TANAH; `model_dampak` peluang (informasi); latih KAB2/KAB2-OPS; uji GloFAS+MCDWD (split >= 2024) | **TERBAKAR**: boleh jadi validasi bergulir, bukan uji |
| 2026-01-01..2026-10-18 | `uji26` KAB2 (1 Nov, TIDAK MEYAKINKAN, penulis melihat skor); `uji_logbook` skor `status.py` 2026 (ETS 0,016-0,060); latih KAB2-OPS; `model_dampak` uji 2026 | **TERBAKAR** untuk keputusan desain; boleh jadi lipatan bergulir ke-5, bukan uji |
| 2026-10-19..2026-10-31 | celah HULU/DEBIT | tidak dipakai |
| 2026-11-01..T (T = tanggal commit sidik CAMPUR) | fitur ERA5/arsip tersedia; label belum dibuka oleh protokol ini, tetapi `public/data/logbook_kejadian.json` bisa sudah memuat entri 1-3 Nov (publik) | **TIDAK DIJAMIN BERSIH untuk label**; dikeluarkan dari vonis (§4.4) |
| T+1..2027-04-30 (prospektif) | belum dinilai siapa pun; berbagi dengan Uji B HULU/DEBIT/TANAH dan penilai KAB2-OPS | **BERSIH**: satu-satunya uji |

Akibatnya: **tidak ada Uji A bersih.** 2026-01..09 (Uji A) dikecualikan dari vonis karena sudah dipakai KAB2 `uji26` dan
`uji_logbook`; bila dibuka juga untuk C, ia tak punya daya kesia-siaan bersih dan hanya menambah satu pengintipan. Satu-satunya
uji final adalah prospektif, dibuka sekali.

**Uji mundur 2008-2015: KLAIM LAMA DICABUT (draf pertama salah).** Periode itu BUKAN bersih: sampel 40 kab dipilih oleh
`uji_balik.pilih` dari kejadian DIBI <= 2021 (`model_kab.py` sekitar baris 111: `batas = hari_ke(2021-12-31)`), yang mencakup 2008-2015, dan
`frek_dibi` tahun latih pertama memakai laju DIBI nasional 2008-2015 (`model_kab.laju_awal`, baris 165-166). Memilih kab dari label
yang sama dengan label uji = bocor pemilihan. Uji mundur hanya sah bila sampel dipilih ulang dari data yang tak mencakup periodenya
(kab dipilih dari 2016-2025, diuji di 2008-2015), yang mengubah sampel dan butuh unduhan ERA5 8 tahun x sel baru. Jadi ia
dicatat sebagai OPSI di luar protokol ini (pertanyaan P1), bukan uji bersih.

### 4.2 Pembagian yang dibekukan

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih penuh | 2016-01-21..2026-10-18 | model akhir (sama dengan KAB2-OPS; label resmi 2026) |
| Validasi bergulir, 5 lipatan luar F1..F5 | F1 = 2022, F2 = 2023, F3 = 2024, F4 = 2025, F5 = 2026-01-01..10-18, tiap kali dilatih pada tahun SEBELUMNYA saja | **F1-F4 memilih** (`tau`, `tau_w`, set fitur, gerbang); **F5 TIDAK memilih** dan dipakai hanya di gerbang pembekuan; DIAGNOSTIK, bukan uji |
| Uji B (prospektif) | T+1..2027-04-30 (T = tanggal commit sidik, §4.4) | satu-satunya uji, dibuka sekali, paling cepat 2027-06-29 |

"Latih <= 2023 / validasi / uji 2024-2026" yang lazim DITINGGALKAN: dua tahun itu terbakar, jadi memperlakukannya sebagai uji
akan melebih-lebihkan bukti. Lipatan bergulir pada tahun terbakar tetap berguna sebagai uji ketahanan (apakah koreksi stabil
tanda dan besarnya antar-tahun), tidak sebagai vonis.

**Gerbang pembekuan (kesia-siaan sebelum prospektif).** `latih` menghitung lima lipatan F1-F5 (pemilihan hanya F1-F4, F5 tidak ikut memilih). Bila dETS(C - klimatologi) Waspada
gabungan (semua lipatan, bootstrap blok) titik <= 0 ATAU titik > 0 pada kurang dari 4 dari 5 lipatan, C DIHENTIKAN dengan
vonis "tidak terbukti (tidak layak dibekukan)", `sidik` tidak ditulis, tidak ada prospektif. Aturan ini hanya bisa menolak.
Lipatan 2024-2025 optimistis karena sudah terbakar (pemilihan `tau`), jadi lulus gerbang tidak berarti apa pun selain
"boleh dibekukan".

### 4.3 Dua tingkat masukan di prospektif

- **P1, prakiraan sempurna:** fitur dari ERA5 (`model_kab_debit.cuaca_sampai` untuk T+1..2027-04-30) dan GloFAS; ini
  tingkat yang dinilai vonis (sama jenisnya dengan KAB2 `uji26`), sehingga ia batas ATAS operasional.
- **P2, masukan operasional terarsip:** `h1, h3, imax, sm, pers_h3` dari arsip harian `data/banjir/arsip_kab2/YYYY-MM.jsonl` (memuat
  `fitur` per `kab` x `lead`). **Arsip debit** sudah ada: commit `bb90da0` (3 Nov), `scripts/banjir/arsip_debit.py`, keluaran
  `data/banjir/arsip_debit/YYYY-MM.jsonl`, mulai 2026-11-03, 104 sel `kab2_ops`, debit GloFAS `e-7..e+3` (Asia/Jakarta), plus label `e-1`
  beku harian (berkas itu tidak disunting di sini; hanya dirujuk). Dua temuan yang mengikat protokol:
  1. **Label `e-1` TIDAK tersedia tepat waktu:** logbook di repo sampai 29 Okt dan DIBI sampai 28 Okt saat arsip 3 Nov. Jadi persistensi
     tetap PEMBANDING saja (keputusan P3), CP tidak punya jalur operasional; tidak ada klaim persistensi operasional.
  2. **`q_q2` operasional belum sepadan dengan latih:** `data/raw/banjir/model_kab_debit/titik.json` tidak ada di checkout dan arsip
     memakai PUSAT SEL, sedangkan `q_q2` latih memakai titik pilihan pindai (`PRAREG-DEBIT.md` §2). ATURAN, urutan kerja: (1) jalankan `arsip_debit.py salin-titik` dulu; bila `model_kab_debit/titik.json` ada, titik latih disalin dan arsip diulang di titik itu;
     (2) bila titik latih tidak ada, Q2 latih DIHITUNG ULANG di pusat sel, yang berarti mengunduh deret GloFAS baru (kuota, BELUM DICEK ketersediaan); mana pun dipilih, titik latih dan titik arsip HARUS identik dan hash daftar titik dicatat di `.sidik`.
     Sampai itu, `q_q2`, `q_ant_*`, dan `dq` tidak punya P2.
  3. **Koreksi bias IFS -> ERA5:** langkah masukan operasional P2 (agen lain membangun `scripts/banjir/koreksi_bias.py`, pemetaan kuantil
     per wilayah x tenggang x musim). Aturan: koreksi dilatih HANYA dari hujan (IFS vs ERA5), TIDAK dari label, supaya tidak masuk jalur
     bocor label; sha256 `koreksi_bias.py` DAN `koreksi_bias.json` (parameter) masuk daftar yang dikunci di `.sidik`; koreksi hanya dilatih dari pasangan IFS-ERA5 2024 ke atas (arsip IFS belum ada sebelumnya), jadi tidak mencakup F1-F3 dan hanya F4-F5/prospektif yang dapat dinilai dengan koreksi; P2 dinilai dengan dan tanpa koreksi, dan kedua hasil dilaporkan.
  P2 dilaporkan, dan dasar izin tayang (pemilik memutuskan) hanya bila P2 tidak jauh di bawah P1. `hu3` dan `twsa` tak punya P2 (§3.2d).

### 4.4 Amandemen jadwal Uji B (3 Nov): mulai sesudah sidik, bukan 1 Nov

Fakta: `PRAREG-HULU/DEBIT/TANAH/KAB2` menulis Uji B mulai 2026-11-01, tetapi hari ini 3 Nov dan `data/banjir/arsip_kab2/2026-11.jsonl`
sudah memuat baris sasaran 2-4 Nov (fitur operasional, tanpa label); `public/data/logbook_kejadian.json` dan `dibi_kejadian.json`
diperbarui harian dan SUDAH bisa memuat logbook 1-3 Nov yang dapat dibaca siapa pun (termasuk sesi lain) sebelum sidik CAMPUR ada.

Dua jalan, dipilih yang paling jujur: **Uji B CAMPUR dimulai pada hari kalender SESUDAH tanggal commit `model_kab_campur.sidik`
(T+1)**, bukan 2026-11-01. Alasan: komitmen "tidak akan membuka label Nov" untuk 1-T tidak bisa dibuktikan secara mekanis, sementara
awal T+1 bisa (tanggal commit dari git). Biaya yang diterima: hilang beberapa hari musim hujan dan jendela tidak persis sama dengan
Uji B HULU/DEBIT/TANAH atau KAB2-OPS (tumpang tindih T+1..2027-04-30, kontras langsung dengan model-model itu tidak diklaim). Jalan
lain (mulai 1 Nov dengan janji) DITOLAK.

Rincian: (1) P1 memakai hindcast ERA5, jadi FITUR tidak terpengaruh jadwal; yang dikunci adalah sidik SEBELUM label Nov dibuka.
(2) Label Nov 2026 (apa pun yang tanggalnya >= 2026-10-19) DILARANG dibaca oleh `baris`, `latih`, `gerbang` (pemotongan di kode:
label dipotong 2026-10-18, sama dengan KAB2-OPS) dan oleh pekerjaan apa pun sebelum sidik di-commit. (3) `buka` menolak bila tanggal
commit `.sidik` lebih baru dari awal jendela yang diminta, dan hanya menilai kab-hari bertanggal sasaran >= T+1. (4) Label beku
diambil sesudah 2027-06-29 (label susulan L2, §5.3d), bukan dari snapshot Nov; pembekuan label sebelum `buka` mengikuti §7. (5) T dicatat di
`.sidik` sebagai `awal_prospektif`. Ketentuan tegas: (a) T = tanggal kalender WIB (UTC+7) dari COMMITTER date (bukan author date, yang
bisa dimundurkan) commit pertama yang memuat baris `sidik` CAMPUR, dibaca dari `origin/main` (`git fetch` dahulu; `git log origin/main --
scripts/banjir/model_kab_campur.sidik`), bukan HEAD lokal atau cabang kerja. (b) Field `awal_prospektif` yang ditulis sebelum commit
hanyalah rencana; bila committer date WIB lebih lambat dari rencana, awal efektif = committer date + 1 dan penilai (bukan model)
yang menggeser jendela, sehingga baris sasaran sebelum itu dikeluarkan; bila commit lebih cepat dari rencana, awal efektif tetap
committer date + 1 (tidak diundur ke rencana). (c0) Pengunci waktu yang lebih kuat daripada committer date semata: waktu run workflow GitHub yang menjalankan penanda sidik atau waktu push yang dibaca dari API GitHub (`gh api`, bukan metadata git yang bisa dipalsukan); bila ketiganya berbeda, yang PALING AKHIR menjadi T. (c) `.sidik` juga mencatat sha256 berkas label saat sidik (`logbook_kejadian.json`,
`dibi_kejadian.json`, `dibi_tanggal.json`) sebagai bukti KEADAAN (BUKAN bukti tak dibaca, BUKAN pengunci: berkas publik berubah harian dan hash hanya membuktikan isi saat itu) agar dapat dibuktikan
kemudian entri mana yang sudah ada.

## 5. Kriteria (ditetapkan sekarang, sebelum angka apa pun)

### 5.1 Ukuran

ETS pada jumlah alarm SAMA dengan `status.py` (>= Waspada dan >= Siaga) pada baris yang dinilai, seri skor dipecah acak
berbiji 11 (bukan urutan indeks); dBSS = selisih skill Brier terhadap Brier klimatologi terkalibrasi. Bootstrap blok **5.000**
ulangan di validasi/gerbang dan **20.000** ulangan di `buka` (biji 11), dua skema (kab x musim-tahun; pulau x minggu), resampel identik untuk semua penilai dalam satu skema;
batas bawah = yang lebih kecil dari dua skema, batas atas = yang lebih besar (konservatif untuk TIDAK LULUS). Catatan akurasi: pada
selang 99,66% kuantil ekor ~0,17% dari 5.000 resampel ditentukan oleh ~10 pengamatan, jadi galat Monte Carlo batas CI nyata; itu sebab
`buka` memakai 20.000 (~34 pengamatan di ekor). **BELUM DICEK:** waktu hitung 20.000 ulangan pada 3 kandidat x 2 skema.

**Keluarga multiplisitas (lengkap, ditampilkan dua pilihan; keputusan pemilik P2).**

Pemakai jendela Uji B (2026-11-01..2027-04-30) saat ini: DEBIT M1-M0 (satu-sisi 2,5%, beku), HULU M2-M0 dan M3-M2 (0,83% masing-masing,
beku), TANAH M3T-M3 dan M0T-M0 (0,4% masing-masing, beku): m = 5, total satu-sisi 4,96% (`PRAREG-TANAH.md` §Bonferroni). KAB2-OPS
memakai penilai prospektif sendiri pada jendela yang sama (satu keputusan gerbang, tanpa koreksi), dan GRRR membuat keluarga sendiri
(m = 6) tanpa memakai Uji B. **Anggaran 5% keluarga bersama sudah habis (sisa 0,04%).** Menambah CN dan CW (2 x 0,4%) ke keluarga
itu = 5,76% > 5%: pilihan Y TIDAK DAPAT dipenuhi tanpa melonggarkan, jadi DITOLAK. Dua pilihan yang tersisa:

| Pilihan | m | satu-sisi per kontras | selang tengah |
| --- | --- | --- | --- |
| X1: keluarga sendiri, hanya CN, CW, A | 3 | 0,83% | 98,33% |
| X2 (keputusan pemilik 3 Nov): keluarga sendiri dengan jalur bercabang (pola GRRR): m = tatapan lama atas 2024-2025 pada tabel di bawah (11, termasuk baris 11 `ambang_persentil` buka, TERBUKTI dibuka dari `ambang_persentil.sidik`) + CN + CW + A | **14 (FINAL)**; 13 bila CW sekunder | 2,5/14 = 0,179%, dibulatkan ke bawah **0,17%** (m = 13: 0,192% -> 0,19%, selang 99,62%) | **99,66%** (persentil 0,17 dan 99,83) |

Keputusan pemilik 3 Nov: X2; sesudah cek git (baris 11 terbukti dibuka) m FINAL = 14, selang 99,66%. X2 dipilih karena X1 mengabaikan bahwa rancangan ini lahir sesudah banyak tatapan atas 2024-2025 yang bisa memengaruhinya
(alasan yang sama dipakai GRRR); dilaporkan juga angka X1 untuk perbandingan. Selang itu ad hoc, bukan jaminan galat keluarga.
Kontras CW - CN dan semua kontras gerbang memakai selang yang sama. Kriteria LULUS adalah irisan-gabungan, jadi tidak ada koreksi
tambahan di dalam satu kandidat. Penyebutan "C" di bawah berlaku untuk CN, CW, dan A terpisah kecuali dinyatakan lain.

**Daftar buka / tatapan atas 2024-2025 (dihitung dari berkas: `latih` menulis `daftar_buka.json` yang mengutip baris `sia/buka/uji26/latih`
tiap `*.sidik` dan baris tabel ini bagi yang tak punya `.sidik`; tanggal ditandai BELUM DICEK bila belum diverifikasi dari git/sidik):**

| # | Tanggal | Model / uji | Periode tersentuh | Kriteria |
| --- | --- | --- | --- | --- |
| 1 | ~19 Okt 2026 (BELUM DICEK) | `ambang_wilayah` / `uji_balik` aturan `status.py` | 2022-2025 | CI selisih ETS > 0 |
| 2 | 29 Okt | `model_kab` `buka` (TIDAK LULUS) | 2024-2025 | CI95, 8 butir |
| 3 | 30 Okt | `model_dampak` `buka` (peluang 2026 TIDAK LULUS; 2024-2025 sebagai informasi) | 2024-2026-09-30 | dETS, BSS |
| 4 | 30 Okt | DEBIT `latih` (validasi dibaca) | 2024-2025 | CI95 |
| 5 | 1 Nov | HULU `latih` (3 kali, A1) | 2024-2025 | CI98,33 |
| 6 | 1 Nov | TANAH `latih` | 2024-2025 | CI99,2 |
| 7 | 1 Nov | KAB2 `latih` LOYO 2016-2025 dan `uji26` (TIDAK MEYAKINKAN) | 2016-2025; 2026-01..10-18 | CI95 |
| 8 | 1 Nov | `uji_logbook` arsip 2022-2025 dan 2026 (`status.py`) | 2022-2026 | ETS, CI blok |
| 9 | 2 Nov | GRRR `sia`/`buka` (uji pakai ulang) | 2024-2025 | CI99,2 |
| 10 | 2 Nov | GloFAS+MCDWD uji ulang (split >= 2024) | 2024-2026 | AUC, dETS |
| 11 | 1 Nov 21:11 | `ambang_persentil` `buka` (TIDAK MEYAKINKAN; `ambang_persentil.sidik` jenis `buka_mulai` 21:10 dan `buka` 21:11; commit 0fba84ac) | 2024-2025 (+ kepekaan 2026) | CI blok |
| (tidak dihitung) | 2 Nov | `siaga_persentil` `segel` (uji PROSPEKTIF, bukan 2024-2025) | tidak menyentuh 2024-2025 | tidak dihitung |

Jumlah baris 1-11 = tatapan terhitung (11). Tabel ini juga menyatakan jujur: 2024-2025 sudah tersentuh >= 8 kali, jadi lipatan
bergulir pada tahun itu bukan bukti.

### 5.2 LULUS, TIDAK LULUS, TIDAK MEYAKINKAN (vonis pada label evaluasi `y0`, tingkat P1, `buka` sekali)

"Batas bawah" di bawah = batas bawah PADA KEDUA skema blok (kab x musim-tahun DAN pulau x minggu), yaitu yang lebih kecil dari keduanya; syarat > 0 berarti kedua skema > 0 (irisan). Skema pulau x minggu menangkap korelasi antar-kab satu sistem cuaca dan karenanya ikut menentukan. Selang = selang keluarga §5.1 (99,66%, m FINAL = 14).

**LULUS** bila SEMUA:
1. batas bawah dETS (C - klimatologi) Waspada > 0;
2. batas bawah dETS (C - klimatologi) Siaga > 0;
3. batas bawah dBSS (C vs klimatologi) > 0;
4. batas bawah dETS (C - LR1) Waspada > 0 dan batas bawah dBSS (C - LR1) > 0;
5. batas bawah dETS (C - `status.py`) Waspada > 0 dan Siaga > 0.

**TIDAK LULUS** bila dETS (C - klimatologi) Waspada titik <= 0, ATAU batas atas dETS (C - LR1) Waspada < 0, ATAU batas atas
dETS (C - `status.py`) Waspada < 0.

**TIDAK MEYAKINKAN** selain itu. Keterangan "(daya rendah)" ditempel bila `mde_80` Waspada (§5.5) > 0,25 x ETS klimatologi
Waspada prospektif; kriteria tidak berubah.

Siaga vs LR1 TIDAK dijadikan syarat (daya Siaga terlalu rendah; MDE80 Siaga DEBIT 0,0138 pada 200 kejadian, lebih besar dari
selisih mana pun yang pernah terukur); dilaporkan saja.

### 5.2b Vonis tayang dihitung pada model TANPA fitur yang tak punya P2 (tegas)

Fitur yang tidak punya padanan operasional (P2): `hu3`/`hulu_ada` (produk final CHIRPS), `twsa` (latensi GRACE; juga hanya Jawa), dan, bila syarat
titik Q2 §4.3 belum terpenuhi saat `buka`, `q_q2`, `q_ant_mx`, `q_ant_mn`, `dq`, `qa`. `latih` membekukan DUA bentuk tiap kandidat: **model penuh** (set
terpilih lengkap) dan **model tayang** (model penuh dengan fitur-tanpa-P2 dicopot dan dilatih ulang dengan resep, `tau`, `tau_w`, dan partial
pooling yang sama; tidak ada pemilihan ulang). **Vonis LULUS/TIDAK LULUS/TIDAK MEYAKINKAN (§5.2) yang memberi izin tayang dijatuhkan HANYA pada
model tayang.** Model penuh dilaporkan sebagai batas atas P1 dan TIDAK PERNAH menjadi dasar tayang. Karena vonis hanya pada model tayang, m tetap 14
(model penuh tidak menambah keputusan). Bila model tayang LULUS tetapi model penuh tidak, tak ada konflik (penuh hanya informasi); bila
penuh LULUS tetapi tayang tidak, hasilnya "tidak layak tayang; tambahan hanya pada fitur tanpa P2".

Catatan P2 revisi 4: `E_neraca` P2 tersedia (kecuali sumber `P` terbukti memakai hujan baru), `swi` P2 tersedia dari hujan (BELUM DICEK), `cs` P2 dari angin IFS (BELUM DICEK); sampai dibuktikan, perlakukan seperti fitur tanpa P2 pada model tayang.

### 5.3 Penjaga label: "PEKA LABEL" (pola HULU)

Dua kontrol, dilatih ulang dengan resep, `tau`, dan hiperparameter terpilih yang sama:
- **K1:** latih y = DIBI saja (berbobot sama), evaluasi DIBI saja.
- **K2:** latih label v2 berbobot (seperti model utama), evaluasi DIBI saja.

Bila C LULUS tetapi dETS (C - klimatologi) Waspada titik K1 atau K2 <= 0 atau batas atasnya < 0, vonis ditulis
**"LULUS, PEKA LABEL"** dan hanya boleh dipasang sesudah pemilik memutuskan. Kontrol tidak pernah menyelamatkan TIDAK LULUS.
Dilaporkan tanpa menjadi gerbang: dETS terstratifikasi per kab (ETS dihitung dalam tiap kab, dirata-rata berbobot jumlah
positif), untuk memisahkan keterampilan dalam-kab dari perbedaan laju lapor antar-kab; `y1` dan `y3`; pemeriksaan satelit
(§2.2); per pulau; per lead P2.

### 5.3b Metrik pendamping (dilaporkan berdampingan, bukan gerbang)

Titik alarm gerbang = jumlah alarm `status.py` Waspada, yaitu sekitar 32% kab-hari pada validasi 2024-2025 (9.258/28.509) dan 21%
pada 2026 (2.403/11.640), dengan laju dasar label ~1,4%. Pada laju alarm setinggi itu hampir semua alarm keliru, sehingga FAR sekitar
97% dan ETS kecil (0,01-0,05) MENURUT KONSTRUKSI, bukan semata kegagalan model; angka ETS mutlak tidak boleh dibaca sebagai
mutu operasional, hanya selisihnya antar-penilai. Karena itu dilaporkan berdampingan pada laju alarm RENDAH yang lebih operasional:
(i) ETS, POD, FAR pada alarm 1% dan 3% kab-hari (seri dipecah acak biji 11); (ii) AUC-PR (area presisi-recall) tiap penilai dengan CI
blok yang sama; (iii) recall@k per minggu: untuk tiap minggu, k = 3 dari 40 kab dengan skor tertinggi, kena bila salah satu punya
`y0`; (iv) skor tingkat-kejadian dan `yt` (§2.1); (v) dETS terstratifikasi per kab (§5.3). Semua dengan CI blok tetapi tanpa
syarat LULUS, dan tidak ada yang menyelamatkan vonis TIDAK LULUS.

### 5.3c Verifikasi tambahan (revisi 4; sekunder, gerbang vonis TIDAK diubah)

Sumber: Ferro dan Stephenson (2011, Weather and Forecasting 26:699-713: ETS dan sejenisnya runtuh ke nilai trivial saat kejadian langka),
praktik EFAS/ERIC, Nearing dkk. 2024 (ringkasan di `research_notes/Benchmark peringatan dini internasional`, sekunder). Dilaporkan berdampingan:
(i) **SEDI** (symmetric extremal dependence index, dari POD dan POFD) dan **bias frekuensi** (alarm/kejadian) untuk alarm ya/tidak pada alarm
Waspada, Siaga, 1%, dan 3%; (ii) **F-beta, beta = 0,8** per kab-hari dengan jendela toleransi SIMETRIS +-1 hari: alarm di hari `e` dianggap kena bila ada kejadian di `e-1..e+1`, DAN kejadian
di hari `d` dianggap tertangkap bila ada alarm di `d-1..d+1`; presisi memakai definisi pertama, recall memakai yang kedua; sekunder; (iii) **skor dipisah menurut kab ber-pelapor-aktif vs tidak**: aktif = kab yang memiliki kejadian resmi (DIBI atau logbook) di >= 8 dari 10 tahun
latih 2016-2025, dihitung dari TAHUN LATIH lipatan (bukan tahun uji; untuk prospektif dari 2016-2025), dikunci; bila kab aktif terlalu sedikit untuk CI, pemisahan ini hanya diagnostik deskriptif tanpa CI; kab tak aktif = "tak diketahui" (laporan tak ada belum berarti tak ada banjir) dan dianalisis sebagai
sensitivitas: negatif milik kab tak aktif dikeluarkan dari penyebut. **BELUM DICEK:** jumlah kab aktif di sampel 40 menurut aturan itu.

**Pembanding murah tambahan (laporan saja, bukan gerbang): aturan periode ulang hujan.** Skor `max(h1 / T1, h3 / T3)` dengan `T1`, `T3` = hujan
periode ulang 2 tahun (Gumbel-momen dari maksimum tahunan 1 hari dan 3 hari, tahun latih lipatan saja, per sel), alarm saat skor >= 1 (alarm alami)
dan pada jumlah alarm `status.py` (skor kontinu). Mengikuti pelajaran US FLASH (periode ulang hujan 1 jam mengalahkan FFG). **BELUM DICEK:**
kestabilan Gumbel pada <= 10 maksimum tahunan.

### 5.3d Putaran QA susulan dan nilai ekonomi relatif (revisi 5; mengikuti benchmark internasional)

**Dua kali skor (ala Norwegia):** skor L1 dihitung 7 hari sesudah 2027-04-30 (2027-05-07) dengan label pertama; skor L2 dihitung 60 hari sesudah akhir jendela
(paling cepat **2027-06-29**) dengan label susulan (DIBI terlambat). **Vonis memakai L2 (susulan)**; L1 dilaporkan sebagai bacaan awal dan tidak mengubah apa pun. L1 bukan
`buka`: ia tidak menyentuh sidik, tidak menulis penanda `.mulai`, dan tidak boleh dipakai memutuskan; `buka` (sekali, penanda `.mulai` dituliskan) hanya L2. Akibatnya
tanggal "paling cepat 2027-06-01" di bagian lain dokumen ini dibaca 2027-06-29 untuk CAMPUR (KAB2-OPS tetap tanggalnya sendiri).

**Nilai ekonomi relatif (cost-loss, Richardson 2000; kerangka FbF), laporan SAJA:** `V(a) = (min(a, o) - [a*(F*(1-o) + H*o) + o*(1-H)]) / (min(a, o) - o*a)` dengan `a` =
rasio biaya/kerugian, `o` = laju dasar, `H` = POD, `F` = POFD. Dilaporkan untuk `a` = 0,02, 0,10, 0,30 dan empat tingkat tindakan berdeskripsi dampak: T1 pantau/siap
(alarm = jumlah Waspada `status.py`), T2 siagakan logistik/relawan (alarm = jumlah Siaga `status.py`), T3 persiapan evakuasi (alarm 3% kab-hari), T4 evakuasi (alarm
1% kab-hari); nilai V untuk C, klimatologi, `status.py`. Titik gerbang tetap jumlah alarm `status.py`; ini hanya melihat tingkat tindakan mana yang bernilai.

### 5.4 Hasil "sinyal fisik tidak menambah apa-apa" adalah hasil sah

Bila C TIDAK LULUS terhadap klimatologi (atau gerbang pembekuan §4.2 menghentikannya), maka yang tertulis adalah:
**"Pada data yang tersedia, sinyal fisik di sampel ini tidak mengalahkan klimatologi yang dihaluskan; hambatannya ada di
label dan prakiraan hujan sel 0,25 derajat, bukan di bentuk model."** Konsekuensinya, ditetapkan sekarang:

1. Layar menayangkan **klimatologi kab x bulan** sebagai "kecenderungan musiman" berlabel jujur (bukan prakiraan), bila pemilik
   memilih menayangkannya; ia tidak menggantikan `status.py`.
2. Model fisik TIDAK dikerjakan lagi pada sampel/label yang sama; protokol berikut (label baru, mis. kedalaman terukur, debit pos
   duga) wajib menyatakan apa yang berubah dari data, bukan dari model.
3. Hasilnya dicatat sebagai kasus di ilmu `banjir` dan di `RISET-MODEL-KAB.md` (bagian baru), dengan angka dETS/dBSS dan CI.
4. Tahap 4 dampak tetap hidup, tetapi hanya sebagai "jika terjadi" atas aturan `status.py`/klimatologi, bukan atas C.

TIDAK MEYAKINKAN tidak membuka jalan tayang apa pun; ia hanya mengizinkan memperpanjang prospektif satu musim dengan
protokol baru.

### 5.5 Daya dan MDE

`latih` mencatat dETS minimum terdeteksi (`mde`, `mde_80`) dari simulasi bootstrap di lipatan bergulir dengan jumlah
kejadian setara prospektif, memakai kerangka `model_kab_hulu.mde_h` / `model_kab_debit.mde` (5 biji, 100 ulangan).
Acuan yang sudah terukur (bukan untuk C): MDE80 DEBIT pada 200 kejadian: Waspada 0,0029, Siaga 0,0138; ETS aturan
2024-2025 Waspada 0,0125, Siaga 0,0287. **BELUM DICEK:** jumlah kejadian prospektif Nov-Apr (acuan: 98 kab-hari resmi di 40
kab selama Jan-18 Okt 2026, 291 hari; musim hujan lebih padat, taksiran kasar 100-250); `buka` memakai jumlah nyata. MDE hanya
derau evaluasi pada alarm tetap, jadi daya sebenarnya lebih rendah. Dicatat, tidak mengubah kriteria.

## 6. Kejujuran dan batas

- **Prakiraan sempurna (P1):** `h3` memakai hujan hari `e+1`; keuntungan C di P1 adalah batas atas. Produksi memakai `hujan.json`
  (Open-Meteo best_match), lebih basah/berbeda dari ERA5 (ilmu banjir: IFS lebih basah dari ERA5). Tidak dikoreksi.
- **Label bias laju lapor:** lantai menyerap bias antar-kab, TETAPI tidak menyerap bias WAKTU (laju lapor naik, mis. media 72% ke
  91% di KAB2 §6, DIBI 2026 terisi susulan). Lantai dari tahun lama bisa salah-skala di 2026+ (Platt per pulau meredamnya
  sebagian, tidak seluruhnya).
- **Negatif lemah** dan **kab sampel terseleksi** (dipilih dari kejadian <= 2021; KAB2 §2): hasil tidak berlaku nasional,
  FAR terukur batas atas.
- **Klimatologi LOYO vs penuh:** baris latih diskor lantai LOYO, baris uji lantai penuh; beda sedikit dalam kualitas lantai.
- **Fitur latih sudah bocor sedikit lewat `frek_dibi` LR1** (ekspansif, KAB2 §6); C tidak memakai `frek_dibi`.
- **Multiplisitas pengintipan:** empat lipatan bergulir F1-F4 menyetel `tau`, `tau_w`, dan set fitur; dETS bergulir optimistis. Tidak ada koreksi, karena
  bergulir bukan vonis.
- **Pembanding persistensi** bukan gerbang C tetapi sejarah (RISET-LOGBOOK: persisten ETS 0,024 lawan model 0,011) menyatakan
  ia sulit dikalahkan pada label berjendela; kalah dari persistensi dilaporkan tegas dan menggugurkan klaim "terbaik".
- Label DIBI 2026 belum terisi susulan; `buka` paling cepat 2027-06-29 (label susulan L2, §5.3d).
- Hasil C tidak boleh dikutip sebagai kemajuan fisika banjir; ia menjawab satu pertanyaan prediktif sempit.

### 6a. Daftar BELUM DICEK, dipisah: MEMBLOKIR `latih`/`sidik` vs boleh menyusul

Sudah dicek/ditutup 3 Nov (tanpa membuka label Nov): kab per wilayah 6/13/7/4/7/3 (`sampel.json`, §3.2b); `q3` log1p (`model_kab_debit.py:392`); `kab.json` bukan deret
bulanan dan `deret_bulanan.json` sudah ada (P = CHIRPS final, ET0 = POWER MERRA-2, 2010-01..2026-07, 119 kab, tanpa bulan hilang); GRACE hanya Jawa, `meta.bulan_hilang_produk` 17 bulan di
2016-2025 dan latensi `L = 5`; akses curl BoM/ONI/DMI/OMI/WorldCover/GHSL; MJO ditolak; baris 11 daftar buka terbukti dibuka (m FINAL = 14); cache ERA5 tidak menyimpan jam-an.

**A. MEMBLOKIR (harus selesai dan bukti ditulis ke `latih.json` sebelum `latih`/`sidik`; kegagalan = amandemen sebelum membekukan):**
1. Label v2 berbobot per wilayah: `P_w`, `T_w` untuk Sumatera, Jawa, Kalimantan, Bali-NT dan kecukupan Lainnya (7 kab) sebagai penampung (§3.2b langkah 1).
2. Titik debit latih = titik arsip (pusat sel), `salin-titik` atau unduh GloFAS baru untuk Q2; hash daftar titik (§4.3).
3. Hujan jam-an ERA5 104 sel sejak >= 2015-01 untuk `E_swi` (parameter dan satuan langkah SUDAH terverifikasi ke JMA); bila tak tersedia, `E_swi` dihapus (§3.2d). Sama untuk jam-an kandidat A.
4. Kebenaran penyelesai: konvergensi pooling pada wilayah efektif; swauji penyelesai, Platt bersarang, dan mutasi (§3.2c, §7).
5. Daftar kab pesisir dari poligon + garis pantai (`E_pasang`) dan cache WorldCover/`hand`/luas DAS hulu untuk `E_kedap`, `hx`, `qa`; bila tidak ada, fitur itu dihapus.
6. Peta nama kab -> kode 4 digit BPS untuk 13 kab Jawa (`E_neraca`, `E_twsa`).
7. Guard kode: pemotongan label 2026-10-18; `buka` menolak bila tanggal commit `.sidik` melewati awal jendela (§4.4).
8. Kuota ERA5/GloFAS Nov 2026..Apr 2027 (`cuaca_sampai`); bila gagal, `sia`/`buka` tertunda, bukan pengganti. Akses/kuota angin 10 m ERA5 untuk `E_cs` (bila tak layak, dihapus).

**B. BOLEH MENYUSUL (laporan atau tahap berikutnya; tidak mengubah vonis atau sidik):**
9. Taksiran positif prospektif per wilayah dan MDE80; jumlah kejadian prospektif total (§5.5); n positif satelit (§2.2); jumlah kab pelapor-aktif (§5.3c); kestabilan Gumbel periode ulang 2 tahun.
10. Kompatibilitas masukan `model_dampak` (§3.5); akses sumber MJO harian lain; waktu hitung 20.000 ulangan; kuota unduh jam-an ERA5 untuk A (A bisa jatuh ke D={1,24,72}).
11. P2: parameter `koreksi_bias.py`, P2 untuk `swi`, `cs`, `E_neraca`; operasional arsip debit/`q_q2` (sudah berjalan sejak 2026-11-03).
12. Definisi CENS terverifikasi abstrak primer (Hattori dkk. 2011); Chang dkk. 2005 hanya sekunder dan tidak dipakai; adaptasi 925 hPa Indonesia belum dicek ulang (tidak dipakai).
13. Latensi ONI/DMI dan update berkas (DMI tertinggal >= 5 bulan pada berkas yang dibaca), `P_w`/`T_w` proksi lain.

## 7. Kode dan sidik

- Berkas baru `scripts/banjir/model_kab_campur.py` yang MENGIMPOR `model_kab.py`, `model_kab2.py` (pembentuk data KAB2, termasuk
  `pasang()` dari `__main__`), `model_kab_debit.py` (`cuaca_sampai`, `q3`), `label_bersatu_v2.py`, `uji_logbook.py`
  (`label_dari`), `fitur_banjir.py` (hand, bila ada) tanpa mengubahnya. Mode: `baris` (hitung kab, baris, alarm aturan
  prospektif; tanpa label, tanpa skor), `latih [--ulang]`, `gerbang` (lima lipatan), `sidik`, `buka --kering`, `buka`, `uji`
  (swauji tanpa jaringan). Keluaran `data/raw/banjir/model_kab_campur/` (bukan public/).
- **Swauji wajib** (tanpa jaringan, data mainan): (1) dengan `beta = 0` peluang = klimatologi persis; (2) `logit(p0)` berkoefisien
  tetap 1; (3) tanda `beta >= 0` terjaga; (4) lantai baris latih LOYO tidak berubah bila label tahun baris itu diubah (uji
  mutasi); (5) ubah label tahun `y` tidak mengubah fitur baris tahun `y`; (6) `hari_hilang` dikeluarkan dari semua model; (7)
  pembeda indeks hari (hari ERA5 WIB, hari GloFAS WIB); (8) penyelesai offset cocok dengan `latih_lr` bila offset 0; (9) `delta_w = 0` menghasilkan CN persis,
  fitur di luar set wilayah bernilai 0, dan mengubah label satu wilayah tidak mengubah fitur/pilihan wilayah lain; (10) `q_q2` tidak ber-log1p ganda (mutasi `q3`), `Q2_sel` lipatan tidak berubah bila deret tahun >= uji dimutasi, `twsa`
  memakai bulan `b - L` (mutasi bulan `b-L+1` tidak mengubah fitur), `p_ant` jendela `<= e-2`; (10a) `h3_sm` memakai `sm` dan `pers_h3` hari yang sama dengan komponennya; `E_neraca` memakai bulan `m-4` dan klimatologi tahun latih saja (mutasi bulan `m-3` dan tahun uji tak mengubah fitur); `swi` hanya hujan `<= e-2`; `cs` hanya jendela `e-1..e+1`;
  (10b) `pa` murni fungsi tanggal (sama bila dihitung dua kali; tidak berubah bila label diubah), `E_hulu` memakai impor HULU (hash fungsi
  sama) dan jendela UTC `e-4..e-2`, `oni`/`dmi` memakai bulan `b-2`/`b-6` (mutasi bulan lebih baru tak mengubah fitur), `E_kedap` tanpa efek utama;
  (11) pemotongan label 2026-10-18 dan
  penolakan `buka` bila tanggal commit `.sidik` melewati awal jendela; (12) semua
  mutasi konstanta (`TAU`, `LANTAI`, `JENDELA`) tertangkap oleh sidik. Default argumen terikat saat `def`: baca konstanta
  global di badan fungsi (kasus ilmu 1 Nov).
- `latih` membekukan sha256: kriteria (berkas ini), isi kandidat (lantai, `beta`, `tau`, Platt per pulau), `model_kab_campur.py`,
  `model_kab.py`, `model_kab2.py`, `model_kab_debit.py`, `label_bersatu_v2.py`, `uji_logbook.py` (sumber fungsi terpakai),
  `status.py`, `umum.py`, `uji_balik.py`, `sampel.json`, `label_latih.json` (sha256 CSV v2 + tabel label), `dibi_tanggal.json`
  (baris <= 2025), manifest cache ERA5 dan GloFAS (hash per sel), `koreksi_bias.py` dan `koreksi_bias.json`, `grace.json`, berkas ONI (`oni.ascii.txt`) dan DMI (`dmi.had.long.data`) sebagaimana terbaca saat sidik, `pasang_astro.py`, `model_kab_hulu.py`,
  `fitur_banjir.py`, daftar titik debit (hash `titik.json` atau titik pusat sel), dan untuk `E_neraca`: hash POTONGAN `deret_bulanan.json` (nilai `P`, `ETa`, `R`, `S` per kab untuk bulan
  `<= 2026-07`, bukan berkas utuh yang diperpanjang tiap bulan) + sha256 `scripts/air/neraca/deret.py`, `iklim.json`, `iklim_ekstensi.json`; parameter SWI (bila E_swi tidak
  dihapus), serta `label_26.json` (label resmi 2026 beku). Swauji: perpanjangan `deret_bulanan.json` ke bulan baru tidak mengubah potongan `<= 2026-07` (mutasi: ubah bulan
  2026-08, potongan tetap cocok); bila revisi CHIRPS prelim -> final mengubah nilai bulan lama, hash potongan patah, sidik patah, dan itu dilaporkan sebagai amandemen (bukan diam-diam). Sidik ditulis
  ke `scripts/banjir/model_kab_campur.sidik` dan di-commit sebelum hari prospektif pertama.
- **Label beku:** label evaluasi prospektif DIBI/logbook dibekukan (salinan + sha256) tepat sebelum `buka`, bukan sebelumnya;
  `buka` menolak bila sidik berubah, bila sumber label berubah di luar apa yang dicatat, atau bila penanda `.mulai` sudah ada.
  Penanda `.mulai` ditulis atomik (O_EXCL) SEBELUM metrik pertama dihitung; proses yang mati di tengah tetap terhitung dibuka
  (jalur sah hanya amandemen tertulis, kasus GRRR A2).
- Penilai prospektif ditulis di berkas terpisah sebelum 2027-04-30, membaca `kandidat.json` dan memverifikasi sidik, tidak
  menyunting `model_kab_campur.py`; sha256 penilai dikunci di `.sidik`.

## 7a. Yang DILARANG tampil di layar sebelum LULUS

Sebelum vonis `buka` dan keputusan tertulis pemilik, tidak boleh ada di `public/banjir/**`, `public/index.html`, atau
berkas data yang dilayani situs: peluang C (angka, persen, kelas), peta/peringkat kab berdasarkan C, label "prakiraan",
"prediksi", atau "model terbaik" yang merujuk C, atau perbandingan "C lebih baik dari status.py". Klimatologi boleh tampil
hanya sebagai "kecenderungan musiman" bila pemilik memutuskan (§5.4). `status.py` TIDAK ditimpa oleh protokol ini, apa pun
vonisnya. Tahap 4 (dampak) tidak boleh dipicu oleh C di layar. LULUS pun hanya berarti "boleh dipasang sebagai pelengkap
berlabel jelas 'belum terbukti secara operasional' sampai P2 selaras".

## 8. Amandemen

(belum ada)

## 9. Keputusan pemilik (3 Nov 2026; sebelumnya pertanyaan)

- P1. Uji mundur 2008-2015 DITINGGALKAN.
- P2. Keluarga X2, m FINAL = 14, selang 99,66% (draf awal 12 dan 99,6%, lalu 13 dan 99,62%; naik karena A dan baris 11 daftar buka terbukti dibuka). Wilayah efektif dan awal Uji B = T+1 sesuai dokumen.
- P3. Persistensi hanya pembanding (varian CP sekunder tanpa vonis).
- P4. Arsip masukan operasional debit dan label `e-1` DIMULAI, dikerjakan agen lain di `scripts/banjir/arsip_debit.py` dan
  `banjir.yml` (dokumen ini hanya merujuk, tidak menyentuh berkas itu). **BELUM DICEK**: isi dan tanggal mulai arsip itu sebelum
  P2 `q_q2` diklaim punya data operasional.
- P5. Bila TIDAK LULUS, layar menampilkan klimatologi saja (§5.4).
- Kandidat metode analog TIDAK ditambahkan (usul belum diputuskan pemilik); kandidat baru wajib amandemen dan menambah m.

## 10. Kerja berikutnya (BUKAN protokol ini; tidak dikerjakan, tidak memengaruhi vonis)

Dicatat dari tinjauan literatur (`reports/Prediktor banjir dan longsor tropis.md`, `research_notes/Prediktor banjir dan longsor tropis/*`) supaya tidak
tercampur dengan protokol ini:
1. Model dua lapis "kejadian sebenarnya" + laju lapor per sumber (Agostini dkk. 2024): memodelkan peluang banjir dan peluang tercatat per sumber secara
   terpisah; menjawab inti hambatan label (laju lapor), bukan fitur.
2. Google Flood Hub sebagai masukan (`floodhub.py`, protokol `PRAREG-FLOODHUB.md` sudah ada).
3. Label berita harian (otomatis) sebagai sumber laporan tambahan dengan laju lapor sendiri.
4. GSMaP jam-an (arsip belum diunduh; `m1_hujan` baru DKI) sebagai sumber hujan jam-an yang lebih baik daripada ERA5 untuk kandidat A.
5. Dataset label Jawa Barat 460 stasiun 4.231 kejadian 2020-2025 (Mendeley Data) sebagai kandidat label tambahan (ketersediaan/lisensi tidak dicek di sini).
Kandidat metode analog (usul pemilik) belum diputuskan; bila disetujui, wajib amandemen dan menaikkan m.
