# Ilmu model-sebaran

> Kelas: pengerja · Model: sonnet · Definisi: `.claude/agents/model-sebaran.md`
> Dibaca SEBELUM kerja (`node scripts/agents/ilmu.mjs baca model-sebaran`). Kasus baru
> ditambah SESUDAH kerja lewat `node scripts/agents/ilmu.mjs kasus model-sebaran "..."`.

## Peta berkas & tabel

Pipeline (urutan di `SEBARAN_MODEL.md` §4; semua stdlib, tanpa numpy):
- `scripts/sebaran/lacak.py` peristiwa dari VIIRS S-NPP (sambung <=750 m & <=24 jam) -> `cuaca.py` (ERA5 per jam, di-cache) -> `fitur.py` (`FITUR_SEL`, `Seri`, `Konteks`, `calon`, `baris_sel`; R=5 sel) -> `latih.py bangun` (`sampel.pkl`) -> `latih.py latih` = `latih_jalan.py main()` (setel di 2023, buka uji 2024-26, ekspor `public/data/model_sebaran.json`) -> `kasus.py` (123 kasus uji-balik -> `public/data/sebaran_kasus.json`) -> `galat.py` (`sebaran_galat.json`).
- Model "akan membesar" (lolos = >=10 sel ~140 ha dalam 72 jam): `lolos.py` `bangun | cv | selang | akhir`; menulis kunci `lolos`, `lolos_ulang`, `selang` ke `model_sebaran.json`.
- `gbdt.py`: logistik + GBDT histogram (<=32 bin), pohon datar `[fitur, ambang, kiri, kanan]`/`[nilai]`, `auc/brier/logloss/reliabilitas`. `simfisika.py`: port fisika FBP/Rothermel/McArthur/CSIRO sebagai pembanding (`efek_bui` memakai 50, bukan 32).
- `prospektif.py` (CI `.github/workflows/titik.yml`, tiap 3 jam, boleh gagal): `ramalan.jsonl` + `nilai.jsonl` append-only di `data/raw/sebaran/prospektif/` (cache Actions `prospektif-*`) -> ringkasan `public/data/prospektif.json` (kunci `mode.awal|ulang`, `terbaru`).
- Pendukung: `pendorong.py` (-> `sebaran_pendorong.json`), `musim_awal.py` (`musim_awal.json`, `tren_karhutla.json`), `cerita_data.py` (`sebaran_cerita.json`), `umum.py` (grid 375 m: `D=0.003375`, `NX=14300`, `Lahan`, `bootstrap`), `RISET-SEBARAN.md` (angka & klaim), `SEBARAN_MODEL.md` (cara pasang/perbarui).
- Layar: `public/sebaran_model.js` (`window.SebaranModel.{muat,cuaca,lahan,ramal,uji}`), `public/insight_sebaran.js` (eksibit Insight; memuat musim_awal, sebaran_pendorong, sebaran_kasus, model_sebaran, sebaran_galat, prospektif), `public/sim_data.js` (kotak "Model data" di Simulasi), `public/cerita_karhutla.js`.
- Kunci `model_sebaran.json`: versi, dibuat, jenis, fitur, bias, pohon, tau, R, sel_m, ha_sel, lepas_sel, profil_lintasan, iklim, frp_bawaan, kal_lepas, geser_logit, pilihan_strata, kinerja_uji{f1_24,iou_24,arah_24,lepas_auc}, catatan, selang{q,ruang,target,kunci}, lolos{fitur,bias,pohon,platt,ambang,kinerja,catatan,laporan,per_lahan_uji}, lolos_ulang{...,menit}. Berkas ~242 KB: jangan dibaca utuh, ambil kuncinya saja.
- Sistem `* 2.*` (spasi + 2) adalah salinan sisa yang ikut ter-track: `scripts/sebaran/splice_sebaran 2.py` (identik byte dengan `splice_sebaran.py`), `public/insight_sebaran 2.js`, `public/sim_data 2.js` (5.163 B, BEDA dari `sim_data.js` 7.944 B), `public/sim_perlakuan 2.js/.css`. JANGAN disunting; edit hanya berkas tanpa " 2". `splice_sebaran.py` sudah dijalankan 13 Okt 2026 (jangkar harus cocok tepat sekali), jangan jalankan ulang tanpa `--cek`.


## Aturan & invarian

- Pembagian waktu (`latih.py:36 bagian()`): latih 2015-2022, validasi 2023 (SEMUA penyetelan), uji 2024-2026 (dibuka sekali di `latih_jalan.py` langkah 6). Putaran penyetelan wajib `SEBARAN_TANPA_UJI=1` (berhenti di `latih_jalan.py:412` sebelum uji). Model ekspor dilatih ulang pada semua tahun (langkah 7), tetapi angka `kinerja_uji` berasal dari model 2015-2022.
- Model "membesar" (`lolos.py`): penyetelan HANYA 2015-2023 dengan validasi silang tinggal-satu-tahun (`TAHUN_CV = 2015..2023`, 9 lipatan). Uji 2024-26 untuk model ini adalah LIHAT KEDUA (model sel sudah pernah dinilai di sana) dan harus diberi label itu (`uji_lihat_kedua`, kunci `uji2_*`). Ambang WASPADA = ambang tertinggi dengan recall >= 70% (`TARGET_RECALL`) di prediksi luar-lipatan; kalibrasi Platt dari luar-lipatan; selang konformal (`lolos.py selang`) dikalibrasi 2015-2023.
- Kasus uji-balik (`kasus.py`): tiap kasus mulai dari deteksi pertama saja, model tidak boleh pernah melihat tahun kasus (`LIPAT`: {2015},{2016-18},{2019},{2020-22}; 2023 dan 2024-26 memakai model 2015-2022). Cuaca reanalisis = prakiraan sempurna (optimistis, harus ditulis).
- Fitur tanpa bocoran: sanksi hanya yang sudah dijatuhkan pada tahun api (`fitur.py:296`, `sanksi_th <= tahun`); fitur hanya dari lintasan <= jangkar; `bekas`, `bekas1`, `tahun_sejak`, `sungai_km` = `RISET` (tidak ada di peramban, tidak boleh masuk model ekspor).
- Prospektif: ramalan ditulis sekali (append-only) lalu dinilai setelah `JEDA_NILAI` (72 jam + 6 jam NRT); tidak boleh dihapus, ditimpa, atau disetel ulang. `RIWAYAT_HARI < 7` hanya uji alur dan menulis ke folder `prospektif_uji_alur`, bukan `public/data/prospektif.json`.
- Evaluator JS = Python: `sebaran_model.js` (FWI port `fwi.py`, `hffmc`, `strataTitik`, `lebarkan`) harus identik dengan `fitur.py`/`latih.py`/`lolos.py`: toleransi peluang hari-1 < 1e-4, fitur membesar 1e-6 (`uji_js.py`). Mengubah satu sisi tanpa sisi lain = kinerja di layar tidak lagi sama dengan yang diuji. Urutan tie-break sel aktif berkunci terkecil juga disamakan (`fitur.py:277`).
- Angka kinerja di layar dibaca dari JSON, bukan diketik: `model_sebaran.json` (`kinerja_uji`, `lolos.kinerja/laporan/per_lahan_uji`), `sebaran_kasus.json` (`ringkasan`: f1_24, iou_24, iou_persistensi_24, `lolos_baru`), `prospektif.json` (`mode.awal`). Nilai terbaca saat ini: F1 sel baru 24 jam uji 0,3835 (604 awal), IoU 24 jam 0,6477, AUC membesar 0,7012 (model MC lama), model khusus uji2 AUC 0,9077, recall 0,674, presisi 0,216, ambang 0,0484, kasus recall 0,638.
- Selisih model-lama vs baru dilaporkan pada himpunan YANG SAMA (`uji500`, 123 kasus), bukan himpunan berbeda.
- Wilayah: pembaruan `model_sebaran.json` lewat `lolos.py akhir`/`latih.py`; jangan menyunting JSON ini dengan tangan. Pipeline FWI/cuaca di `scripts/data` bukan wilayahmu (pipa-data).


## Ranjau yang pernah meledak

- Duplikat ` 2`: lihat Peta. Sunting salah berkas = perubahan tidak pernah dimuat `index.html`. `grep -n "sim_data" public/index.html` untuk berkas yang sungguh dipakai.
- Beda 32 vs 50 pada efek BUI: mesin fisika situs (`tabelLaju` di `public/index.html`) memakai `exp(32 ln0,9 (1/BUI-1/32))`, FBP pers. 54 memakai 50; `simfisika.py efek_bui` sudah 50. Jangan menyamakan Python ke index.html (`SEBARAN_MODEL.md` §2). Perbaikan metode: commit `5678cd1`.
- Peluang lolos lama (porsi Monte Carlo model sel yang mencapai 10 sel) hanya AUC ~0,70 dan menandai ~1/3 api besar; diganti model khusus `lolos.py` (recall 64% di 123 kasus) di commit `b18f946`. Jangan menampilkan `p_lepas_mc` sebagai peringatan dini; dipertahankan hanya sebagai pembanding "cara lama".
- Penyetelan di himpunan uji: model sel dibuka sekali di `e28967c`; setelah itu uji 2024-26 TIDAK netral untuk `lolos.py` (lihat kedua). Menyetel ulang hiperparameter memakai angka uji = kebocoran. Gunakan `SEBARAN_TANPA_UJI=1` dan `lolos.py cv`.
- `galat.py himpunan-uji` adalah laporan saja; analisis kesalahan dan rekalibrasi per lahan (`geser_logit`, `pilihan_strata`) dipilih di validasi 2023, bukan di uji.
- Selang luas (`selang.q`) saat ini banyak yang 0 (`gambut|0`, `mineral|0`, `sabana|0`, `*|0` = [0,0,0]) dan hanya `gambut|1` serta `*|1` melebar: P10/P90 yang tampil nyaris = P10/P90 Monte Carlo mentah untuk non-WASPADA. Jangan klaim "terkalibrasi 80%" tanpa melihat kunci itu.
- Cuaca hanya 1.623 + 681 pasangan (tahun, sel 0,5 derajat); 2020-2022, 2024-25 sebagian; uji sengaja tidak ditambah. CAPE/Haines tidak ada di arsip (diperiksa: null). FIRMS punya celah 8 Mei - 1 Jun 2026.
- Memori mesin 8 GB: `lolos.py` satu proses (`LOLOS_PROSES=1`), negatif disampel 5% (bobot 20); kisi hiperparameter kecil. Menaikkan pohon/proses = OOM. Jangan menjalankan `bangun/cv/akhir` tanpa diminta.
- `prospektif.py` boleh gagal di CI (`titik.yml`); `dinilai: 0` di `prospektif.json` berarti belum cukup 78 jam sejak ramalan pertama, bukan bug. Cache Actions hilang = catatan hilang; jangan membangun ulang dengan menulis `nilai.jsonl` manual.
- Hati-hati klaim "mengalahkan model Kanada/AS/Australia" (commit `e28967c`): di `sebaran_kasus.json` `iou_persistensi_24` (0,6726) lebih tinggi dari `iou_24` model (0,5842); keunggulan ada di F1 sel baru, bukan IoU total. Setiap kalimat "lebih baik" harus menyebut metriknya.


## Gerbang yang menghakimi

Semua murah dan tanpa data mentah kecuali ditandai; dijalankan dari akar repo:
- `python3 scripts/sebaran/latih.py uji` (skor F1/IoU, `bagian(2022/2023/2024)` = latih/val/uji; harus cetak `ok`).
- `python3 scripts/sebaran/gbdt.py uji`, `simfisika.py uji`, `umum.py uji`, `prospektif.py uji` (label72, `gabung`; harus `ok`), `fitur.py uji`, `kasus.py uji`, `galat.py uji`, `lolos.py uji`, `cuaca.py uji`, `lacak.py uji`, `musim_awal.py uji`, `pendorong.py uji`, `cerita_data.py uji` (yang butuh `data/raw/` bisa gagal bila arsip tidak ada; jangan dianggap regresi).
- `python3 scripts/sebaran/uji_js.py` : gerbang utama Python <-> JS (butuh node dan `data/raw/sebaran`/`public/data/lahan`; 6 kasus nyata). Gagal bila fitur membesar beda > 1e-6 atau peluang hari-1 beda > 1e-4; juga memastikan evaluator menolak lintang 20, bujur 150, waktu rusak, cuaca tanpa 30 hari masa panas, model `{}`; tanpa titik sekitar `lolos` harus null; >= 10 sel awal -> `sudah_besar`. Jalankan setiap kali `sebaran_model.js`, `fitur.py`, `latih.py` atau `lolos.py` berubah.
- Setelah perubahan layar: buka Insight di browser preview dan periksa eksibit "Peringatan dini: akan membesar" cocok dengan `model_sebaran.json lolos.laporan` + `prospektif.json`.
- `python3 scripts/sebaran/splice_sebaran.py --cek` hanya memeriksa jangkar sisip.
- Tidak dijalankan di sesi ini: `latih.py latih`, `lolos.py cv/akhir/selang` (berjam-jam, menulis JSON publik). Verifikasi independen: panggil `validasi-model` setelah angka berubah.


## Kasus

- 2026-10-15 · Ilmu awal diisi dari kode (scripts/sebaran/*.py, public/sebaran_model.js, insight_sebaran.js, kunci model_sebaran.json, prospektif.json) dan `git log -- scripts/sebaran`; cek: `python3 scripts/sebaran/{latih,gbdt,simfisika,umum,prospektif}.py uji` semua `ok`. Riwayat bermakna hanya `e28967c` dan `b18f946`; sisanya commit "gas" tanpa pesan.
- 2026-10-16 · jejak.py: kompleks aktif = kluster.json level>=2 (n24>0) ~2259 buah, jadi dibatasi JEJAK_MAKS=40 + anggaran 420 dtk (K0001 ~76 dtk @20 MC). Cuaca: public/data/cuaca (cuaca_jam.py, 20 sel) dulu, selebihnya Open-Meteo past33+forecast4 (forecast_days=3 prospektif tak cukup 72 jam). hotspot.json basi >12 jam -> status data_basi, kompleks []. Cache jejak_cuaca di data/raw/sebaran/prospektif tidak di-gitignore.
- 2026-10-17 · sim_3d.js: Sim.pilih mencari fitur di S.kluster, jadi titik pilihan didorong sementara ke S.kluster.features lalu dibuang (try/finally) alih-alih menyalin pilih(); pasangLapis jangan dijaga isStyleLoaded() sesudah pasangan asli (false selama sumber baru dimuat), cukup getLayer('sim-k'); H (hasil ukur) tidak menyimpan org, jalur kepala api memakai jarak ke benih terdekat; cek: node --check + smoke vm untuk dasbor
- 2026-10-17 · sim_armada.js: semua gerak = fungsi murni (t, detik); inti diekspor di window.SimArmada.inti untuk smoke vm; visual operasi TIDAK mengubah H (luas api tetap skenario yang dilihat); konstanta asumsi di objek A, salinan PKA sim_perlakuan harus disamakan bila di sana berubah; cek: node --check + smoke vm 6 pembuktian
- 2026-10-17 · 2026-10-17 · sim_3d.js: .map pada Float32Array (H.luas.mid) mengembalikan typed array sehingga path SVG jadi NaN; pakai Array.from(a, fn). Smoke vm dengan DOM Proxy + H palsu (scratchpad/smoke/smoke.js) menangkapnya. Rumus Byram: I = 300*sfc*ROS(m/menit) (18000 kJ/kg * sfc * ROS/60), bukan dibagi 60 lagi.
