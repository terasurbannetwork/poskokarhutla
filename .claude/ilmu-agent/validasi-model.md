# Ilmu validasi-model

> Kelas: pemeriksa · Model: sonnet · Definisi: `.claude/agents/validasi-model.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca validasi-model`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus validasi-model "..."`.

## Peta berkas & tabel

Pemeriksa read-only. Satu model/indeks = satu butir: sumber angka -> JSON hasil uji -> tempat tampil.
- FWI: `scripts/data/fwi.py` (Van Wagner 1987, Le=9,0 Lf=1,39 khatulistiwa; self-check `__main__` vs data uji cffdrs `fwi_01.csv`: DMC/DC selisih < 0,006; FFMC <=0,12, ISI <=0,25, FWI <=0,24 karena koefisien 147,2 vs 147,27723) -> `public/data/fwi.json`. Port JS: `public/sebaran_model.js` (`ffmcH`, `buiD`, `fwiD`) dan `public/index.html` (hffmc, FBP/Dijkstra). Belum dibandingkan dengan FWI resmi BMKG (`public/index.html:5429`).
- Ansambel: `scripts/data/ansambel.py` (ECMWF IFS 51 anggota, peluang = pecahan anggota; `pt` P(FWI>=7), `ps` P(FWI>=14)) -> `fwi_ansambel.json`; tampil di `ringkasan.js`, `databaru.js`. Gerbang hanya `ansambel.py uji`. Tidak ada uji balik/reliabilitas peluang ansambel.
- Aturan status: `scripts/data/aturan.py` (`PRIOR_PX=15`, `keparahan`, `status`, `prioritas`). Angka uji balik (90% & 95% tertangkap, presisi 53% & 35%, 1,9% & 0,8% kompleks-hari; Agu-Okt 2019 & 2023, ambang 10 px) hanya teks di docstring `aturan.py:11` dan `public/index.html:5009`; tidak ada skrip/JSON penghasilnya di repo.
- Sebaran: lihat `.claude/ilmu-agent/model-sebaran.md`. Hasil: `public/data/model_sebaran.json` (`kinerja_uji`, `lolos.kinerja/laporan/per_lahan_uji`, `selang`), `sebaran_kasus.json` (`ringkasan`), `prospektif.json`, `sebaran_galat.json`; mentah `data/raw/sebaran/hasil.json`, `lolos_hasil.json`, `lolos_cv.json`. Tampil di `public/insight_sebaran.js`, `sim_data.js`, `cerita_karhutla.js`.
- Banjir/longsor: `scripts/banjir/uji_balik.py` -> `public/banjir/data/validasi.json` (banjir/longsor x waspada/siaga/awas: pod, far, csi, pss, ets, ci 95% bootstrap blok, n{a,b,c,d}, laju; periode_latih 2016-2021, periode_uji 2022-2025), dibaca `public/banjir/index.html`. Aturan: `scripts/banjir/status.py` (`GESER=-1`, `K_BANJIR=0.8`, `K_LONGSOR=0.6`, `A7_BASAH=25`, `SM_JENUH=0.45`); narasi `scripts/banjir/RISET-UJI-BALIK.md`. Rob: `rob.py` fungsi `validasi` -> `rob.json`.
- Keputusan: `scripts/data/keputusan.py` `kalibrasi()` (regresi log-log; b nasional dari 2015 + 2018-2023, a per provinsi, `sigma_log`, `tahun_kalibrasi`) -> `keputusan.json`; dipakai `public/index.html` (~2773, ~5491), `ringkasan.js`, `sim_perlakuan.js`.
- PFVI (sesi lain sedang menambah; jangan disunting): `scripts/data/pfvi.py` (port peatfr), `scripts/sebaran/pfvi_balik.py` (uji balik vs FWI di sel gambut); angka dijanjikan di `scripts/sebaran/RISET-PFVI.md` (belum ada saat ilmu ini ditulis).

## Aturan & invarian

Cek wajib per berkas yang berubah (`node scripts/agents/ilmu.mjs cek validasi-model <berkas>`):
1. Pembagian waktu sebaran: latih 2015-2022, validasi 2023 (satu-satunya tempat menyetel), uji 2024-2026 dibuka sekali. `latih.py:36 bagian()` tetap 2022/2023/2024. Menyetel dengan angka uji = temuan. Model "membesar" (`lolos.py`): hanya CV tinggal-satu-tahun 2015-2023 (`TAHUN_CV`); uji 2024-26 untuknya adalah LIHAT KEDUA dan wajib berlabel (`uji_lihat_kedua`, kunci `uji2_*`), tidak boleh disebut "uji murni".
2. Kebocoran fitur: tiap fitur memakai data <= waktu prakiraan; sanksi `sanksi_th <= tahun` (`fitur.py:296`); fitur `RISET` (`bekas`, `bekas1`, `tahun_sejak`, `sungai_km`) tidak masuk model ekspor; kasus uji-balik dilatih tanpa tahunnya (`kasus.py` `LIPAT`). Cuaca ERA5 pada kasus = prakiraan sempurna: wajib ditulis. Hanya `prospektif.py` yang benar-benar tanpa bocoran (append-only, dinilai 78 jam kemudian); `dinilai: 0` = belum ada data, bukan kinerja.
3. Target melingkar: indeks tidak boleh dikalibrasi ke variabel yang ikut membentuknya. Upstream peatfr (Mahdiyasa dkk. 2025) mengkalibrasi PFVI ke DIobs turunan kelembapan tanah; `pfvi.py` sengaja tidak mem-port itu (DIobs hanya untuk keadaan awal). Setiap kalibrasi PFVI baru harus memakai target independen (kejadian api VIIRS) dengan periode uji terpisah.
4. Bug upstream `Rf_b <- c(Rf[-length(Rf)], NA)`: "hujan kemarin" jadi hujan hari ini. Benar: `c(NA, Rf[-n])`. Cek `hujan_kemarin()` di `pfvi.py:59`: hari t memakai hujan t-1, hari pertama tanpa kemarin. Uji kecil: hujan 6 mm hari 1 lalu 3 mm hari 2 -> RF hari 2 memakai seluruh 3 mm (kemarin > 5,1 mm).
5. Proksi berlabel: muka air gambut tidak diukur (SiPALAGA/BRGM 403); `muka_air_proxy()` = ember hujan - ET0. Setiap keluaran/layar PFVI wajib memuat "muka air = perkiraan (proxy), bukan pengukuran"; kelembapan tanah ERA5(-Land) juga proksi. Grep teks itu di `public/` sebelum menyatakan bersih.
6. Klaim = berkas hasil: angka di layar dibaca dari JSON (`validasi.json`, `model_sebaran.json`, `sebaran_kasus.json`, `prospektif.json`), tidak diketik. Pengecualian yang ada: angka uji balik aturan (`index.html:5009`, `aturan.py:11`). Kalimat "lebih baik/mengalahkan X" wajib menyebut metrik dan himpunan.
7. Banjir: skor kontingensi dihitung pada semua kabupaten-hari (bukan hari yang dicocokkan), CI bootstrap blok kabupaten x tahun; usul ambang diterima hanya bila CI berpasangan selisih ETS di periode uji seluruhnya > 0. Ubah `status.py` tanpa menjalankan `uji_balik.py` dan memperbarui `validasi.json` = temuan.
8. Evaluator JS = Python (`uji_js.py`): peluang hari-1 < 1e-4, fitur membesar < 1e-6.

## Ranjau yang pernah meledak

- Angka back-test `aturan.py` tanpa sumber terlacak: 90%/95% dan presisi 53%/35% dihitung dengan ambang 10 px & S-NPP saja, sedangkan produksi memakai `PRIOR_PX = 15` dan 3 satelit; teksnya sendiri mengaku "perlu diuji ulang". Laporkan bila disebut sebagai kinerja saat ini.
- Peluang ansambel (`fwi_ansambel.json`) belum diuji (tidak ada Brier/reliabilitas di `ansambel.py`); cuaca diambil per kotak 1 derajat lalu dipakai semua sel 0,5 derajat di kotak itu (docstring `ansambel.py`): resolusi prakiraan lebih kasar dari sel yang digambar.
- Selisih koefisien FFMC 147,2 (fwi.py) vs 147,27723 (cffdrs kini): batas uji `fwi.py:158-166`; lebih dari itu = rumus rusak. Port JS punya salinan sendiri: ubah satu tanpa yang lain = FWI layar != FWI pipeline.
- Jangan memberi vonis "akurat" untuk FWI: belum dibandingkan dengan FWI resmi BMKG (`index.html:5429`).
- Sebaran: uji 2024-26 sudah terbuka (commit `e28967c`, lalu `b18f946` untuk `lolos`), jadi angka berikutnya optimistis. `kinerja_uji.lepas_auc` 0,7012 = cara lama (Monte Carlo); `lolos.kinerja.uji2_auc` 0,9077 = model khusus: jangan dicampur. Di `sebaran_kasus.json` `iou_persistensi_24` 0,6726 > `iou_24` 0,5842: klaim "mengalahkan model negara lain" hanya sah untuk F1 sel baru. `selang.q` bernilai 0 untuk `*|0`, `gambut|0`, `mineral|0`, `sabana|0` = tidak ada pelebaran: jangan klaim "selang 80% terkalibrasi" untuk semua kasus.
- Banjir: `validasi.json` jujur tetapi lemah: FAR 0,964 dan ETS 0,019 pada Waspada banjir (POD 0,565); hujan ERA5 = prakiraan sempurna ("skill nyata lebih rendah"), DIBI kurang mencatat kejadian kecil, GloFAS dan ansambel tidak diuji, longsor 2024 dibuang. Periksa layar tidak menampilkan POD tanpa FAR/CI.
- Keputusan: regresi log-log dari <= ~6 tahun per provinsi (`tahun_kalibrasi` >= 4, `sigma_log` min 0,3); kemiringan b dikunci titik 2015 (2.611.411 ha Bank Dunia/KLHK, hard-coded); "luas 2026" proyeksi dan rata-rata El Nino memasukkan tahun berjalan. Periksa label proyeksi/asumsi dan rentang rendah-tinggi (parameter `lemah`).
- PFVI: target melingkar dan bug `Rf_b` (Aturan 3-4); pencarian kisi upstream `1/par3` memanggil optim 10^8 kali. Bila `pfvi_balik.py` melaporkan PFVI mengalahkan FWI, cek bahwa api VIIRS tidak juga dipakai menyetel parameter, bahwa cuaca ERA5 reanalisis bukan prakiraan, dan bahwa cakupan hanya sel gambut Sumatra-Kalimantan.
- Salinan ` 2` (`public/insight_sebaran 2.js`, `scripts/sebaran/splice_sebaran 2.py`, `public/data/fwi 2.json`, `scripts/banjir/posko 2.py`) bukan sumber kebenaran; jangan mengutip angka dari sana.

## Gerbang yang menghakimi

Dari akar repo; semua read-only dan murah:
- `python3 scripts/data/fwi.py` (rantai 48 hari vs cffdrs; cetak `ok (...)`), `python3 scripts/data/aturan.py` (`ok`), `python3 scripts/data/ansambel.py uji` (`ok ansambel`), `python3 scripts/banjir/uji_balik.py uji` (swauji luring, `ok uji_balik`; jalan penuh butuh kuota Open-Meteo, jangan). Ikut di `.github/workflows/data.yml:236-247` dan `banjir.yml:54`.
- Sebaran: `python3 scripts/sebaran/uji_js.py` (Python<->JS), `python3 scripts/sebaran/latih.py uji`, `prospektif.py uji`, `gbdt.py uji`, `kasus.py uji`, `lolos.py uji`.
- Klaim di layar: `grep -rn "recall\|presisi\|AUC\|F1\|POD\|FAR" public/insight_sebaran.js public/sim_data.js public/cerita_karhutla.js public/banjir/index.html`, cocokkan dengan `python3 -c "import json;m=json.load(open('public/data/model_sebaran.json'));print(m['kinerja_uji'],m['lolos']['kinerja'])"`, `public/data/prospektif.json` (`mode.awal`), `public/banjir/data/validasi.json`.
- Uji tanpa bocoran: `grep -n "bagian(\|TAHUN_CV\|SEBARAN_TANPA_UJI\|sanksi_th" scripts/sebaran/latih.py scripts/sebaran/latih_jalan.py scripts/sebaran/lolos.py scripts/sebaran/fitur.py`.
- PFVI: `python3 scripts/data/pfvi.py` (self-check) dan baca hasil `pfvi_balik.py`; jangan jalankan subperintah `zenodo`/`api` (unduhan tak tepercaya).
- Tanpa gerbang otomatis: angka back-test aturan, kalibrasi ansambel, regresi keputusan. Laporkan sebagai celah, jangan dianggap bersih.

## Kasus

Diringkas 25 Nov 2026 (41 KB -> di bawah 32 KB): duplikat digabung per kelas, contoh angka dipangkas, tiap aturan tetap. Tanggal = kasus pertama kelasnya.

### Reproduksi dan cara cek
- 2026-10-15 · Ilmu awal diisi dari kode; gerbang `fwi.py`, `aturan.py`, `ansambel.py uji`, `uji_balik.py uji` semua `ok`. Celah terbuka di Ranjau.
- 2026-10-19 · Reproduksi di memori, jangan sunting berkas: muat modul JS lewat node vm/`new Function` (simulasi.js, sim_longsor.js, tsunami.js+guncangan.js+kerusakan.js), modul Python lewat importlib di bawah `python3 -I`; instrumen (dt/Courant, mutasi) di salinan scratchpad. Panggil `bangun()` lalu banding dengan JSON (cuaca_peluang.json beda 148/550 dari hujan_ansambel kini = basi). Keluaran "sesudah" bisa basi terhadap skrip yang diedit sesudahnya: regenerate ke direktori sementara dan diff.
- 2026-10-21 · Reproduksi angka dengan skrip yang sama hanya membuktikan paritas, bukan keabsahan metode (peta_karhutla `--uji`); hitung ulang independen dari mentah (arsip firms tar.gz, CSV FIRMS) dengan kamus sendiri, lalu uji metodenya terpisah. Skrip sekali pakai tetap di scratchpad.
- 2026-10-22 · Sumber rujukan yang bisa diakses: OpenQuake gsim (raw.githubusercontent.com/gem/oq-engine/master: boore_2014.py, zhao_2006.py; Zhao06 klip M7,8 hanya kelas SSlabNSHMP2014, SInter tanpa klip, tau 0,308/0,321 sigma 0,604), cffdrs lewat `gh api repos/cran/cffdrs/contents/... -H 'Accept: application/vnd.github.raw'` (hffmc 2595 baris maks selisih 0,005), USGS fdsnws mmi ShakeMap, Crossref `api.crossref.org/works/<doi>`, EuropePMC fullTextXML. PDF WHO/ACP dan shakemap wgrw12 tidak.
- 2026-10-27 · Uji yang namanya mengklaim angka ("kolam tetap 14 hari") dimutasi di salinan scratch ke angka tetangga sebelum dipercaya; kasus 27 Okt kini dikunci `tests/warga/uji_lapangan.test.mjs:354` (14 tepat, 5/10/13 hari keluar kolam). Catatan transisi aturan adalah pengungkapan, bukan koreksi: data campuran tetap campuran sampai ada pemisahan sebelum/sesudah.
- 2026-11-01 · Swa-uji yang menanamkan indeks/konstanta yang sama dengan kode (ch['h1'][39] untuk e=40, LAT_* simbolik) lulus walau salah; uji sintetik dengan skema rekaan beda dari berkas nyata meloloskan fitur mati (petabencana_laporan.json tanpa `tipe`: filter flood = 0 dari 27.944); fixture simetris (IMERG 7x7) tak mendeteksi lon/lat tertukar; uji jam berjauhan tak menangkap beda presisi stempel (label menit vs prakiraan detik menolak prakiraan sah, M1 timespec). Cek tiap aturan protokol punya kode di `buka`, bukan hanya latih.
- 2026-11-01 · Klaim "belum ada" di rencana: grep tabel D1 (`migrations/`) dan `model_*.py` dulu (SIHKA sudah diarsip `src/sihka.js` TAHAN_HARI=180). Tahun uji rencana dicocokkan dengan LATIH/VALIDASI modelnya (model_kab.py:35: 2022 = validasi, bukan uji bersih).
- 2026-10-28 · JANGAN jalankan `watak_kluster.py` tanpa argumen: itu main() dan menulis `public/data/kluster*.json` (argumen uji = `uji`; insiden = `--uji`). `uji_balik.py` jalan penuh memakan kuota Open-Meteo.

### Kalibrasi, melingkar, kebocoran
- 2026-10-17 · Kalibrasi luas: hitung ulang LOO sendiri (sejarah.json x luas_resmi.json); docstring +43%/-31% vs aktual +101%/-35%. Luas 4,3 ha/titik dari median SiPongi/titik: membandingkannya dengan SiPongi melingkar, hanya GWIS independen; rasio ha/titik naik di tahun besar. Faktor luas per prov-tahun didorong pencilan (Papua 2018-19 rasio ~26); pembilang kluster 7 hari vs penyebut px24 tak sepadan (deteksi berulang ~2x).
- 2026-10-19 · Kalibrasi satu faktor ke N titik lalu uji di titik sama = tautologi; uji di titik lain. Angka contoh di Metode direproduksi dari geometri kode, bukan tebakan tangan.
- 2026-10-21 · Kalibrasi plasebo harus buta terhadap data pemilihan kontrol (OMC nilai.py). Jalur yang hanya diuji fixture sintetis = belum teruji; jalankan dengan arsip nyata.
- 2026-10-22 · Kebocoran seleksi: sel/kab contoh dipilih dengan data periode uji (persentil_fwi: hari-api semua tahun; uji_balik.pilih semua tahun = kab bergantung DIBI uji; ambang_persentil 40 kab = pilih DIBI<=2021 + tetangga). Cek set tahun di `kumpul()`; TAHUN_API memuat 2015 tapi kumpul membuang <2016.
- 2026-10-22 · "Satu-satunya kalibrasi" palsu bila parameter lain dipilih dari tabel kepekaan lawan target uji (replay banjir Mar 2025; jejak banjir.jsonl 1c-1g); hit dekat laporan yang dipakai menyetel tidak dihitung bukti.
- 2026-10-22 · Kalibrasi tahunan bisa nyaris kosong (prospektif_historis 2022: 9 lolos) -> Platt/ambang rapuh; p90 n=10 digeser satu pencilan (kalibrasi.py). Hitung baris/lolos per tahun.
- 2026-10-30 · Label lapangan yang lahir dari tugas satelit (tugas_api/isian; tugas hanya di kab berklaster VIIRS) berkorelasi dengan masukan prakiraan dan persistensi: pakai hanya sebagai audit omisi FIRMS, jangan di-OR ke amatan.
- 2026-11-01 · Pra-reg: offset klim dari label latih yang sama = bocoran in-sample; hiperparameter dipilih logloss DIBI pada model label gabungan = bias laju dasar; kontras yang mencampur dua perubahan (IMERG-vs-ERA5 dengan hulu-vs-lokal) tak bisa diatribusi; Bonferroni satu-sisi dihitung lintas protokol yang berbagi Uji A/B.
- 2026-11-02 · Koefisien ekspor (klim_bulan_logit) bisa beda dari fitur yang diuji bila diambil dari baris latih LOYO: hitung ulang mandiri dari label, bukan hanya AP.
- 2026-11-09 · Angka kalibrasi di uji harus sama dengan konstanta kode (F_LOK 2,254 vs 2,25); uji yang menghitung semua lokasi-hari adalah uji luas, bukan uji subset belum padam. Batas min() mengubah asersi jadi satu arah: periksa batas bawahnya.

### Pembanding dan baseline
- 2026-10-20 · Baseline adil: gempa = bahaya_saja (POD 0,54 > indeks 0,42); persistensi dan klimatologi pada jumlah alarm sama. Seri di ambang top-N (440/515 kab = 100,0) diputus alfabet: cek tie-break.
- 2026-10-23 · Kelemahan sering di pembanding, bukan model: pembanding terdaftar 2 peubah = jerami (logistik atas fitur riwayat milik model sendiri AUC 0,902 vs 0,915); maju-berantai latih tahun < T untuk menguji LOYO. Lokasi kalah dari median nasional episode bila diberi pembanding itu.
- 2026-10-19 · Pembanding "Normal" harus berstruktur harian sama (hujan konstan hampir tak pernah stres); jangan kurangi peluang dengan besaran (satuan beda). Metrik stres yang menghitung kemarau normal dipakai sebagai selisih vs Normal, hanya sel bertanaman. MIN_TAHUN=4 setara acak (P=20,5%).
- 2026-10-21 · Ujibalik jujur boleh gagal (kebakaran permukiman lulus=false, tangkapan < acak); "model.uji gagal" = sah bila cocok gerbang_model/risiko_ujibalik. Pascahoc wajib berlabel.
- 2026-11-02 · Klaim fit>resmi dengan n kecil (PAGER n=11): bootstrap per kejadian + permutasi, dan akurasi semua kejadian (fit 0,953 < resmi 0,976 < nol 0,989); "kelas benar 8/11" bisa = tebak kelas mayoritas.
- 2026-11-10 · Baseline persentil-25 invalid bila p25 laju = 0 (gempa 82% kab nol): hitung share kab berlaju nol dulu. Bias gabungan menutupi bias per jarak (MMI +1,22 <25 km sampai -0,39 >200 km): pecah per strata.
- 2026-11-01 · Uji "tambah informasi": model tanpa fitur persistensi tak boleh dibandingkan dengan persistensi+klim. Daya syarat kemiringan: simulasi sendiri; drift kemiringan nyata yang menggagalkan.

### Selang, bootstrap, klaster
- 2026-10-18 · Gerbang terbit menguji peluang tak-disesuaikan sedangkan layar memakai `sesuaikan()`/jendela lain: uji jalur yang tampil (susulan adj kalah 0,0436 vs 0,0351 @1 hari). Bootstrap berpasangan untuk selisih Brier; bootstrap per stasiun beri CI lebar.
- 2026-10-22 · Bootstrap cuplik-kluster dengan sedikit kluster membuang resampel tanpa alarm -> selang degenerat (FAR 0,802-0,802). Aturan diagnostik yang diganti sesudah melihat hasil = temuan. CSI acak = 1/(1/po+1/pa-1).
- 2026-11-01 · Permutasi/Poisson mengabaikan klaster: acak per tanggal utuh, bukan per kejadian-kab (sd 11,1 -> 22,6, p ~0 -> 0,014); lift susulan: pisahkan hari-0 (laporan gabungan) dari 1-3.
- 2026-11-01 · Skema blok gerbang lebih longgar dari yang dilaporkan bila memakai blok berbeda (kab x tahun vs pulau x minggu): sebut bloknya.

### Data dan sumber
- 2026-10-17 · Banding total titik dengan pihak luar: uji bertingkat dari baris mentah (semua -> in-poligon -> type 0 -> buang low); NRT FIRMS tanpa kolom type. Hitungan titik menyertakan keyakinan rendah; luas/klaster tetap n/h. Tolak poligon 11% VIIRS umumnya luar negeri.
- 2026-10-19 · Data pos sensor: banyak satuan kosong/bukan tinggi air (m3/s, mdpl); label persentil-sendiri menyala ~1-3%/jam by design dan p99=0 memicu tiap kenaikan. Uji balik butuh arsip status append-only.
- 2026-10-21 · Celah data mentah menipu pembanding (viirs.csv kosong 28 Apr-2 Jun 2026: `grep -c ',2026-05-02,'`); sel statis titik_palsu disaring harian.py, tidak oleh peta_karhutla.py (Cilacap/Cilegon 100%). S-NPP berhenti 1 Nov 2026 13.00 UTC; substitusi N21 per hari UTC melewatkan malam 17-20Z. enso.json DMI berhenti 2026-05.
- 2026-10-22 · Angka yang tampak dampak bisa bukan dampak: posko.json = rekomendasi greedy, bukan posko terdata; udara_dampak = PM2,5 total CAMS (88-100% latar), bukan asap; jiwa CAP cuaca = penduduk seluruh kab (gerbang jiwa>=1000 hampa); belum padam satelit 1-1700x angka lapangan, jangan dibanding sebagai ha. Rujuk-silang angka musim antarkartu.
- 2026-10-22 · Kunci yang hilang saat cakupan penuh (udara_dampak prov{}) membuat `v.get(k) or 0` menyusutkan cakupan: banding jumlah nasional vs jumlah provinsi.
- 2026-10-23 · Hit 'sama' 96% menipu pada laju dasar 4%: pakai konkordansi positif. Aturan berbasis jam-sejak-deteksi atau hitungan per pita diuji terhadap arsip: geometri lintasan menggeser hitungan normal (rasio min/max median 0,64, p5 0,25).
- 2026-10-27 · Konstanta pengganti sensor dari sampel kecil (RASIO_N20_N 0,89/0,93): cek tiga arah: tambah hari dari sumber lain (petakan confidence nominal/high ke n/h), banding jumlah bulanan berpenyebut besar (kalibrasi_noaa.json), banding tahunan sepadan; selang antar-hari memuat 1,0. Pengganti sensor mematikan isi_celah kecuali dijaga.
- 2026-10-27 · Dua definisi label lapangan (uji_lapangan.js Q1 vs ujibanding_firespot.py) tak sebanding; keluaran yang dibuat sesudah `sembunyikan_kecil` melewati aturan n<5. Aturan operasional bergantung pada label hasil membuat label endogen; Q1 tanpa dedup lokasi.
- 2026-10-27 · Banjir sensor: SQL_DASAR mengecualikan 24 jam terakhir dan pos hari<14 tak memicu, jadi dasar muda aman. pasut `di_atas_biasa` (max 4 hari vs p90 satu hari) hampir selalu true dekat purnama (68/73).
- 2026-10-30 · Nol-semu tahunan (kejadian.json kab 2024: longsor 340/450 nol) masuk Theil-Sen dan total: hitung share nol per tahun. Hari tanpa logbook (2021, 2023) masuk "hanya_dibi": banding tanggal DIBI dengan himpunan tgl_logbook. Logbook dicatat bulan berikutnya 23%: persistensi dari tgl_kejadian bocor.
- 2026-11-01 · Lompatan deret (abrasi 300-1200 m/th) menghasilkan "tercepat" palsu; lompatan() hanya menyaring 2 tahun terakhir; baseline satu tahun berisik -> median beberapa tahun; transek "gangguan" (tanggul) harus dibuang.
- 2026-11-02 · Kunci wilayah tertukar untuk Kab/Kota senama bila norm() membuang "kota ": cocokkan nama lengkap dengan wilayah.json. Heuristik musiman (puncak/rata<1,5) salah-tandai musim lebar.
- 2026-10-22 · `max()` atas set nondeterministik antar PYTHONHASHSEED: uji dengan 1,2,3.
- 2026-10-28 · Jeda terukur dari pengambilan berkala = latensi FIRMS + tunggu putaran Worker (fungsi tangga), n=granul bukan lintasan; periksa blok periode memakai mulai_catat, p90 berbatas, kesegaran, siang vs malam.

### Prospektif, sidik, arsip
- 2026-10-19 · Entri prospektif harus dicatat sebelum jendela tutup, dan masukan (VONA) terbit sebelum jendela mulai, atau ia sekaligus target nilai() (prospektif_abu.json dicatat vs jendela).
- 2026-10-27 · Arsip "append-only di git" harus benar dilacak git (`git ls-files` kosong = cek_arsip no-op); deploy sebelum `git add` di workflow memutus commit.
- 2026-10-28 · Sidik pra-reg harus meng-hash semua berkas yang menentukan hasil (bukan hanya tangki.py) tapi bukan berkas hidup yang ditulis ulang workflow (hujan.json, kejadian.json oleh statis.yml) kecuali salinan beku; prakiraan dan label tak boleh ditulis di job yang sama. Pengerasan dimasukkan sebelum jangkar (sidik meng-hash skrip). Pra-reg satu-kali mengikat `buka` ke hash sidik yang di-commit dan mencatat tiap percobaan latih termasuk yang crash; contoh gerbang yang menegakkannya: `tests/agen/gerbang-genangan-kriteria.test.mjs` (GS-13). Kontras wajib protokol harus ada di buka_hitung. `gerbang_buka` yang hanya cek ADA baris validasi tanpa cocokkan sidik = celah.
- 2026-10-25 · Setel jendela lapangan butuh insiden berlabel bertanggal/berkoordinat; ~7 insiden tanpa tanggal padam = tidak bisa disetel. Ukuran satelit-saja yang sah: titik muncul lagi sesudah sepi 48 jam.

### Temuan per model (rujukan cepat)
- 2026-10-16 · SPI: cek berapa sel punya pct tanah (kekeringan_grid kolom 3/4); 12/611 -> bukti ganda palsu. Kekeringan: SEAS5 dan cadangan ENSO tanpa skill (BSS -0,021 pooled); penskalaan rasio hujan klimatologi melingkar karena rasio memuat sinyal ENSO.
- 2026-10-18 · Udara: uji METAR memakai r24_kota.json (analisis CAMS ditimpa tiap jalan) = hindcast, bukan prakiraan; atribusi Gaussian menormalkan persen ke model bila model>CAMS (cek kota.model vs pm).
- 2026-10-19 · sim_longsor.js memakai m = theta0/n sebagai rasio tekanan pori, jadi baseline kering sudah merah di lereng >=35 derajat (cek `peluang(b, kejenuhan(0.3,0))`).
- 2026-10-19 · sawit_retro: geometri benar (pembaca shp sendiri identik); Gaveau-vs-Descals 25-33% sawit seragam, bukan bug georef; makin muda tahun sawit Gaveau makin rendah; jejak VIIRS 2,1-2,5x luas resmi.
- 2026-10-20 · Kerusakan gempa: rasio obs/model kematian kerak 0,08-1,4 (sd ln 1,1); Yogya 2006 satu-satunya yang kurang.
- 2026-10-21 · Taktik kebutuhan: personel per ha/hari model 24,75 vs Kalteng 149, Sumsel 45; air bara dibagi T padahal regu bara T+hari_mopup.
- 2026-10-22 · Karbon akuntansi.js: skrip tangan independen persis; spike satu tahun api menaikkan hilang th1 9,25x; NPV bergantung th8-30 (porsi kredit th>7 = 74%).
- 2026-10-23 · riwayat_sel/hierarki: ujibalik direproduksi persis; DC latih (spin-up 30 hari) <300 vs produksi median 650; label 'sampai <kini>' salah (data s.d. tanggal arsip); JS bertingkat d/s null jatuh ke nasional bukan induk dan crash di riwayat_sel.js:131 bila rec tanpa s.
- 2026-10-23 · Kekokohan masukan tanpa melatih (muat model_<T>.json, rakit ulang baris_tahun, ubah kolom): cuaca NaN masuk cabang kanan tanpa galat (peluang x1,9-2,2, BSS negatif); cuaca klimatologi hampir tak rugi; tanpa cuaca dan ONI/DMI setara.
- 2026-10-28 · M1 genangan: CV jujur tapi ETS 0,084 vs klimatologi 0,088, diperkirakan gagal kriteria.
- 2026-11-25 · Periksa kolom kursor rute ingest Worker lawan tanggal rekaman: usulan LU- bertanggal laporan, bukan klik; jendela kandidat pasang.py harus ikut tanggal rekaman (LK-10, 5971f39e0)
- 2026-11-25 · Baris DIBI bencana=0 di bawah ambang tidak masuk angka resmi (dibi_kejadian.py:10-11); perakit Laporan Berkala harus memisah dua angka
- 2026-11-25 · Aturan dampak ganda antar kab (Q20) tanpa batas provinsi menghapus dampak kebetulan; minta batas provinsi dan minimal dua kolom
- 2026-11-26 · Medan GLO-30+GEBCO (tsunami_medan.py): 'celah pantai' (GLO=0 tetapi GEBCO>=0) ternyata sebagian besar petak GEBCO darat 5-140 m di laut terbuka >1,8 km dari darat GLO (artefak GEBCO, mis. -6,89/105,6 +10 m); GLO menang itu benar. Uji georef run-up jendela +-1,5 km hanya menangkap pembalikan N-S atau geser >=5 km, bukan geser <1,5 km.
- 2026-11-26 · Riwayat DIBI tahunan (dibi_kab_tahun) 2015-2023 praktis tanpa laporan bawah ambang (sama dengan dibi_tren is_bencana), 2024 2%, 2025 39%: tren 'semua laporan' lintas tahun memuat lonjakan definisi; banding tren pakai angka resmi (dibi_tren.json) atau tahan klaim. Cara tahu: bandingkan jumlah per tahun kab_tahun lawan dibi_tren 7 jenis.
- 2026-11-26 · 2026-11-26 Ruang Unit: kode kab DIBI (dibi_kab_tahun.json) masih kode Papua pra-pemekaran (9410-9436 dll, 32 kode asing) sedangkan terpapar/ikd memakai 95xx/93xx: 35 kab tanpa baris DIBI. Di skor MB-4 komponen hilang dinormalisasi ulang sehingga kab ini naik ke puncak (mt2 9503 peringkat 1); di uji balik PLP-1 kab-tahunnya diisi 0. Cara tahu: hitung kode DIBI yang tidak ada di terpapar.json dan peringkat kab dengan hilang=['kejadian']. Rasio manfaat/biaya dengan biaya=jarak ke Jakarta meledak untuk kab sekitar Jakarta (1,1 km).
