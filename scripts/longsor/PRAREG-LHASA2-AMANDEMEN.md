# Amandemen PRAREG-LHASA2 revisi 2

Tanggal: 6 Nov 2026, SEBELUM `latih` nyata dan SEBELUM `sidik`. Pada saat penulisan TIDAK ada skor uji (F1-F5 maupun prospektif) yang dilihat penulis amandemen: `latih --kering` hanya mencetak
mekanika (jumlah baris, iterasi, tanda beta), `uji` memakai data mainan. Semua butir menutup hal yang tidak ditentukan dokumen saat `model_lhasa2.py` ditulis atau yang diminta tinjauan
`validasi-model` (konteks bersih, 6 Nov). `PRAREG-LHASA2.md` tidak disunting; berkas ini dikunci di sidik bersamanya (`BERKAS_SIDIK.opsional`). Keputusan pemilik tetap menang atas butir di sini.
Format tiap butir: teks lama, teks baru, alasan.

## A. Keputusan teknis yang tidak tertulis di protokol

- **A-1 (sampel negatif latih).** Lama: tidak ada (baris = semua kab-hari). Baru: negatif `y0` latih disampel 4% (`NEG_LAJU`, biji tetap per tahun) berbobot 25; semua positif ikut bobot 1.
  Lantai, alarm, skor, logloss lipatan, dan semua penilai memakai SEMUA baris. Alasan: IRLS murni Python tak sanggup 1,5 juta baris x beberapa ratus pencocokan; pembobotan menjaga
  penaksir tak bias. Konstanta dikunci sidik.
- **A-2 (lantai lewat agregat).** Lama: lantai dari baris kab-hari. Baru: lantai dihitung dari agregat (kab, tahun, bulan) dengan bobot = jumlah hari dan y = laju sehingga `w*y` = cacah positif
  persis; `KC.lantai_fit`/`KC.lantai_p` dipakai apa adanya (identik secara matematis dengan baris penuh). LOYO: lantai baris tahun z dilatih tanpa z. Alasan: kecepatan dan penghalusan CAMPUR persis.
- **A-3 (gamma aksesibilitas).** Lama: "`gamma` ditetapkan SEKALI per lipatan". Baru: `gamma` diestimasi ulang untuk SETIAP himpunan tahun yang dipakai lantai (termasuk tiap pengecualian LOYO),
  di-cache per himpunan tahun; regresi Poisson kondisional (efek tetap provinsi dibuang), CI persentil 95% dari bootstrap kab (B = 500, biji 11); CI melewati 0 -> `gamma = 0` dan lantai sama persis dengan CAMPUR.
  REVISI 2 (butir tinjauan kedua): gamma > 0: `exp(gamma * (a_k - rerata_prov(a)))` hanya PRIOR; laju kab sendiri tetap masuk: `rk = (n_k + HALUS * ru * exp(gamma * dev_k)) / (d_k + HALUS)`
  (n_k, d_k = cacah positif dan hari kab di tahun lantai; HALUS = 30), lalu dikali musim `s` seperti CAMPUR. Sesuai §3.1 "Prior kab menjadi ..."; gamma = 0 memberi `rk` CAMPUR persis (diuji). Versi sebelumnya
  (`rk = ru * exp(...)` tanpa cacah kab) membuang laju kab sendiri dan DIGANTIKAN. Alasan: tanpa itu label tahun z bocor ke lantai baris z lewat satu skalar (diuji: mutasi label z tak mengubah p0 baris z).
- **A-4 (sumber statis).** Lama: `fitur_statis.json`, `pvmbg.json`. Baru: `fitur_statis.json` (gitignored) tidak ada; lereng p75, jarak sesar, dan zona PVMBG dibaca BERNAMA dari
  `public/longsor/data/kerentanan.json` (`lereng_p75`, `sesar_km`, `pv_zona`; kolom prakiraan Des-2024 tidak dibaca, diuji). Per kab: rerata kec; sesar = rerata `-log1p(km)`. Kab tanpa zona PVMBG
  (null) diberi peringkat rerata kab lain (netral). Peringkat 0-1 antar-kab dihitung sekali dari himpunan kab beku, tidak bergantung label.
- **A-5 (luas kab dan penduduk).** Lama: luas dari poligon `public/geo/kabupaten`. Baru: luas kab = jumlah luas cincin luar kecamatan (`public/geo/kecamatan`); penduduk = jumlah `penduduk.json` per kec.
  151 kec tanpa entri penduduk dihitung 0 (nama kec cocok 7.113 dari 7.264). `a_k` None bila penduduk atau luas 0 (efek 0 pada kab itu). Hash `public/geo/kecamatan/*.json` dan `desa_cari.json` dikunci (A-21).
- **A-6 (rentang baris).** Lama: 2017-01-01..2026-10-18 tanpa 2024. Baru: baris kab-hari 2017-01-15 (a14 butuh e-14) .. 2026-10-17 (y1 +-1 hari butuh e+1 <= 10-18), tanpa 2024, dan dua hari batas
  2023-12-31 dan 2025-01-01 dikeluarkan (tetangga 2024). Label y0 hari 2026-10-18 tidak jadi baris. Alasan: y1 simetris tak terpotong label yang dipotong kode.
- **A-7 (urutan pemilihan).** Lama: tidak berurutan tegas. Baru: tau (CN, set S1, satu-SE pada logloss F1-F4) -> tau_w (CW, S1) -> set nasional (CN, urutan S0 < S1; S2/S3/S3' dicoret karena fiturnya tak ada).
- **A-8 (y1 F2-F3).** Lama: `y1` = DIBI ATAU logbook. Baru: logbook ada hanya 2025-2026, jadi `y1` F1-F3 (2021-2023) = DIBI saja; F4-F5 gabungan. Arsip `data/pusdalops/logbook_kejadian.csv` belum disambungkan
  (pola A-8 CAMPUR). Dilaporkan sebagai kelonggaran.
- **A-9 (gerbang per kandidat dan MDE).** Gerbang kesia-siaan (§4.2) berlaku PER kandidat; `sidik` ditulis bila minimal satu selamat; kandidat yang dihentikan tidak diberi izin tayang. Gerbang berbasis TITIK
  (dTSS per lipatan dan gabungan), tanpa bootstrap: `ULANG_GERBANG` (5.000) TIDAK dipakai (masih di tambal, tak berefek). MDE: dua angka berbeda. (a) PERENCANAAN di `latih`: SE dTSS dari bootstrap blok
  kab x bulan-tahun pada F1-F5 (5 biji x 100 ulangan), diskalakan ke 1.625 positif y1 (taksiran 650 y0 x 2,5), z satu-sisi 99,5% = 2,807. (b) NYATA di `buka`: `se_skala = SE x sqrt(positif)` disimpan di
  `kandidat.json`; `mde_80 = (2,807 + 0,8416) * se_skala / sqrt(positif y1 prospektif nyata)` masuk vonis "(daya rendah)" (A-19).
- **A-10 (klaim lengas).** Lama: §0/§1/§5.5 menyebut sinyal "lengas". Baru: `sm`/`rH_sm` (7A4: 0 dari 947 sel) dan `lr_lahan` (7A5: 20 dari 75 ubin WorldCover) tidak ada, S2, S3, S3' dicoret sehingga
  resep yang dilatih adalah "resep tanpa lengas dan tutupan lahan" (S0 atau S1). Kalimat hasil nol §5.5 dibaca: "sinyal hujan (hari-H, anteseden) dan kerentanan statis tidak mengalahkan klimatologi...". Pembaca cache lengas
  (`muat_sm`, format di docstring) ada; fitur BELUM ditulis dan baru boleh diaktifkan lewat amandemen berikutnya SEBELUM `latih`.
- **A-11 (jumlah sel).** Lama: 948 sel. Baru: 947 sel diperlukan oleh kab yang dinilai (sel poligon kab "None" tidak dipakai); angka 948 di dokumen dibaca 947. `sidik` tetap menunggu semua sel utuh
  (atau penanda `data/raw/longsor/hujan_gagal.json` bila panen tuntas dengan sel gagal; kab parsial dikeluarkan).
- **A-12 (ILEWS).** Lama: ambiguitas "per sel lalu maks atas sel kab". Baru: P1/P3 per sel, skor ordinal 0/1/2 per sel, lalu MAKS atas sel kab; seri dipecah acak biji 11. Alarm alami: kuning = skor >= 1, merah = skor 2;
  kandidat disamakan jumlah alarmnya. Bila alarm kuning atau merah = 0 (atau semua baris): TSS tak terdefinisi, kontras itu dilaporkan "tak terdefinisi", TIDAK dihitung dalam syarat LULUS/TIDAK LULUS.
- **A-13 (wilayah dari label semua tahun latih).** `gabung_wilayah` (n_kab >= 15, P_w >= 200, T_w >= 4 tahun dengan >= 10 positif) memakai label y0 SEMUA tahun latih, sehingga struktur lipatan F1-F4
  sedikit optimistis (wilayah dibentuk dari label yang juga ada di tahun lipatan). Diterima dan dilaporkan; tidak diulang per lipatan.
- **A-14 (daftar tatapan).** `daftar_buka()` ditulis tangan di kode (8 tatapan + 2 kandidat = 10), bukan dihasilkan dari git. Bila tatapan ke-9 ditemukan, m naik SEBELUM sidik.
- **A-15 (kejadian.py).** §8 menyebut impor `kejadian.py`; tidak diimpor (nama bentrok dengan `scripts/banjir/kejadian.py`). `kejadian.json` dibaca langsung.

## B. Tinjauan `validasi-model` (6 Nov)

- **A-16 (P1, salinan beku masukan hidup).** Lama: sidik meng-hash `hujan.json` dan `kejadian.json` hidup (tumbuh terus). Baru: `latih` membuat salinan beku di `data/raw/longsor/model_lhasa2/beku/` (sekali; tidak
  ditimpa): `hujan.json` dipotong s.d. 2026-10-18, `kejadian.json` (baris `dibi` <= 10-18, tanpa `dibuat`), `logbook.json` (jenis, kab_kode, mulai, terlihat; mulai <= 10-18). Yang di-hash sidik adalah salinan itu
  (`manifest_beku`); `kejadian.json` hidup keluar dari "wajib". Konteks latih (juga klimatologi dan B2b saat `buka`) membaca beku; HANYA konteks prospektif membaca berkas hidup, dan `buka` menolak bila awalan
  hujan hidup berbeda dari beku (`cek_live_vs_beku`). Catatan: salinan dibuat saat `latih` (bukan `sidik`) karena `latih` pun harus membacanya; `sidik` memverifikasi hash.
- **A-17 (P2, kontras LH-W - LH-N).** Lama: ada di §5.2 tetapi tak dihitung. Baru: LH-N selalu dibekukan bila LH-W hidup (juga bila LH-N dihentikan gerbang: `pembanding_saja`, tanpa izin tayang);
  `buka` menambah `dtss_lhn_waspada` dan `dauc_lhn` pada LH-W; `_ringkas.lulus_p1_calon` (kunci lama `izin_tayang` DIGANTI, lihat revisi A-20/A-32) = LH-W hanya bila LULUS dan kedua batas bawah > 0, selain itu LH-N bila LULUS, selain itu tidak ada. Itu CALON, bukan izin tayang (P2 belum dinilai).
- **A-18 (m = 9).** Bila LH-W sekunder (< 3 wilayah efektif) `kandidat.json` menyimpan `m = 9` dan selang 99,46% (`selang_m(9)` = 0,0027); selain itu m = 10 dan 0,0025.
- **A-19 (P3, mde nyata).** Lihat A-9(b): `vonis_buka` tak lagi menerima `mde=None` pada `buka` nyata.
- **A-20 (P4, urutan tulis dan laporan).** `buka.mulai` ditulis sesudah data dan konteks terbukti cocok dan sebelum penilaian; `buka.json` utama dan `buka_vektor.json.gz` (y1, y0, skor, alarm, kab, tanggal per baris)
  ditulis SEBELUM K2; K2 dibungkus try, hasil/galat di `buka_k2.json` terpisah (PEKA LABEL ditentukan di sana, tidak mengubah `buka.json`). REVISI (butir 5): kunci hasil `izin_tayang` diganti `lulus_p1_calon` dan `_ringkas.p2 = "tidak dinilai, izin tayang BELUM penuh"`: LULUS pada hujan ERA5 (P1) hanya menjadi CALON; izin tayang penuh memerlukan P2 (hujan operasional terarsip, §4.3) yang tidak dinilai pada
  rev. ini. Laporan yang dikerjakan: POD/FAR/bias, AUC total, AUC-PR (average
  precision), dBSS vs klimatologi, konfusi per level 1-4, y0 hari tepat, F-beta (beta 0,8) +-1 hari, strata (tertil kepadatan, tertil n_sel, wilayah, bulan, kab aktif vs tak diketahui), model v1 pada sasaran g=0
  sendiri (g=1 murni bukan negatif), nilai ekonomi, per wilayah (menahan). TIDAK dikerjakan: skor tingkat-kejadian (gugus kejadian), kec-hari sekunder, tenggang +1..+3 (arsip prakiraan belum ada), koreksi bias
  hujan operasional, P2 (hujan operasional terarsip), L1 (bacaan awal 2027-05-07), SWI.
- **A-21 (P5, konteks dibekukan).** `kandidat.json` memuat daftar kab, `wilayah_peta`, `geo_sha` (public/geo/kecamatan/*.json), `desa_sha` (desa_cari.json); `buka` menolak bila `ctx_t.kab_keys`, wilayah, atau hash berbeda.
  `latih.json` memuat keluaran `pemblokir()` (bukti 7A) dan manifest beku.
- **A-22 (B2b).** tau B2b = tau terpilih kandidat (satu-SE yang sama), bukan konstanta.
- **A-23 ("Lainnya" nasional).** Di LH-W, baris wilayah Lainnya memakai koefisien nasional `beta_nas` langsung (tanpa delta_w); pooling hanya antar wilayah efektif lain (§3.3). Platt tetap per wilayah termasuk Lainnya.
- **A-24 (Platt b1 > 0).** Model berfitur ditolak (ValueError) bila Platt suatu wilayah (bukan netral) b1 <= 0; klimatologi tanpa fitur dikecualikan (b1 ~ 0 oleh derau). `latih --kering` hanya menghitung peringatan
  (sampel 24 kab menghasilkan beberapa untuk wilayah kecil); pada `latih` nyata keras. DIGANTIKAN seluruhnya oleh A-28 (tidak ada lagi klausa "ditunda", tidak ada pengecualian klimatologi yang berdiri sendiri).
- **A-25 (tenggang +1..+3).** `kandidat.json` mencatat eksplisit: "tidak dinilai musim ini (7A10)".
- **A-26 (kering).** `latih --kering` tidak mencetak pilihan tau/tau_w/set atau gamma dari label nyata; hanya hitungan, iterasi, gradien, tanda beta.
- **A-27 (ULANG_BUKA, DIUKUR 6 Nov).** dAUC dalam-kab lewat tabel konkordansi sparse per blok, dua skema, 11 kontras per kandidat (LH-W) pada ~450.000 baris (500 kab x 900 hari, 3.675 positif, data mainan; `buka_hitung`
  sendiri belum diukur penuh karena butuh model): `boot_kontras` = ~4 detik persiapan + 0,255 detik/ulangan (20 ulangan 9,2 dtk; 100 ulangan 29,6 dtk; 1.000 ulangan 258,9 dtk, linear 0,255 dtk/ulangan). Ekstrapolasi 20.000 ulangan = ~85 menit per kandidat,
  ~2,8 jam untuk dua kandidat (> 2 jam). Karena itu `ULANG_BUKA` diturunkan dari 20.000 menjadi 10.000 (~43 menit per kandidat, ~1,5 jam untuk dua), dikunci di sidik. Indeks persentil `int(q*(ulang-1))` dengan q = 0,0025 pada 10.000 ulangan = urutan ke-24 (cukup).

## C. Tinjauan kedua `validasi-model` (6 Nov)

- **A-28 (Platt, menggantikan klausa "ditunda" di A-24).** Untuk SEMUA model (klimatologi, B2b, LH-N, LH-W) di setiap pencocokan Platt (seleksi, lipatan, model akhir): wilayah dengan b1 <= 0 atau satu kelas (Platt netral)
  memakai Platt NASIONAL model yang sama (`K2.platt_w` pada seluruh logit OOF semua wilayah). Bila b1 nasional <= 0: model berfitur -> `ValueError` (temuan sah, `latih` berhenti); klimatologi -> Platt netral (0, 1). Pengecualian
  klimatologi di penjaga lama dihapus. Daftar wilayah yang jatuh per model per lipatan dicatat di `latih.json` (`platt_jatuh`) dan TIDAK memengaruhi seleksi maupun vonis (hanya dicatat). Diuji pada fungsi `platt_aman` dan lewat `cocok_penuh`
  untuk klimatologi, LH-N, dan LH-W (wilayah pertama dipaksa b1 < 0 -> jatuh ke nasional).
- **A-29 (pembanding dilatih di `latih`).** Klimatologi dan B2b (tau = tau terpilih) dilatih di `latih` dan disimpan di `kandidat.json["model"]` (ikut sidik; `pembanding_saja`). `buka` TIDAK melatih apa pun (sebelum maupun sesudah `buka.mulai`);
  satu-satunya pelatihan ulang adalah K2 (sensitivitas, sesudah hasil utama ditulis, A-20).
- **A-30 (peta wilayah tak lagi tautologis).** `buka` membangun konteks latih dari label beku sehingga `gabung_wilayah` menghitung peta sendiri; `cek_konteks_beku` menegaskan `ctx_t.wilayah_info["peta"] == kand["wilayah_peta"]` SEBELUM apa pun
  diset dari `kand` (`set_wilayah` dari `kand` hanya untuk konteks prospektif, yang tak punya baris latih). Swauji: mengubah label (satu-satunya yang diubah) membuat peta berbeda dan `cek_konteks_beku` menolak.
- **A-31 (salinan beku diperluas, merevisi A-5 dan A-16).** Selain hujan, kejadian, dan logbook, `latih` menyalin ke `beku/`: `penduduk.json`, `desa_cari.json`, `kerentanan.json`, `pvmbg.json`, dan `public/geo/kecamatan/`. Konteks latih membaca daftar
  kecamatan, penduduk, kerentanan, dan peta kode logbook dari salinan itu (`daftar_kec_dari(root)` mengalihkan sementara `DASAR.AKAR`); manifest sidik memuat hash semuanya; berkas hidup itu keluar dari "wajib" (statis.yml menulis ulang
  `penduduk.json` bulanan). Swauji: menyentuh salinan apa pun mengubah sidik; mengubah berkas hidup tidak.
- **A-32 (izin tayang).** Lihat revisi A-20: `lulus_p1_calon` + `p2` "tidak dinilai, izin tayang BELUM penuh".
- **A-33 (keluaran terminal).** `gerbang` mencetak hanya `hentikan`/`lolos pembekuan` dan vonis per kandidat (dTSS ada di `gerbang.json`); `latih --kering` tidak lagi mencetak jumlah terjepit atau peringatan Platt (dan sudah tidak mencetak
  pilihan, A-26).
- **A-34 (`--ulang` tercatat; REVISI 3 di A-36).** `latih` mencatat `riwayat_latih` (nomor ke-, jumlah dan waktu latih sebelumnya, apakah `--ulang`) di `kandidat.json` (jadi di sidik) dan menambah `ke` dan `ulang` pada baris jejak `.sidik`. Salinan beku TIDAK dibekukan ulang oleh `--ulang`.
- **A-35 (pembanding berskor mentah; berkas di luar git).** Pembanding hujan-saja v1, v1, v2, Muntohar, dan ILEWS dinilai dengan SKOR MENTAH (bukan probabilitas): TSS pada jumlah alarm sama dan AUC hanya bergantung urutan, jadi Platt tidak relevan; Platt hanya dipakai
  untuk klimatologi dan B2b (dan dBSS). `beku/` dan `kandidat.json` ada di `data/raw/` yang di-gitignore: di git hanya hash (baris `.sidik` dan, bila perlu, hash manifest); salinan beku wajib disimpan pemilik di luar worktree (ranjau worktree dibuang).

## D. Tinjauan ketiga `validasi-model` (6 Nov)

- **A-36 (jejak latih lengkap; menggantikan sebagian A-34).** Setiap `latih` yang berhenti sebelum selesai dicatat di `.sidik`: `{"jenis":"latih","hasil":"dihentikan"}` sebelum keluar karena gerbang pembekuan, dan `"hasil":"galat"` (dengan `alasan`)
  untuk ValueError Platt atau galat/interupsi apa pun (dicatat lalu dilempar ulang); yang selesai bertanda `"hasil":"ok"`. Pra-pemeriksaan dari jejak yang sama dengan `riwayat_latih`: `kandidat.json`, `kandidat_dihentikan.json`, atau baris `latih` apa pun
  tanpa `--ulang` -> ditolak (tanpa menambah jejak). `ke` dan `sebelumnya` kini menghitung baris `mulai` (REVISI di A-42), bukan penutup.
- **A-37 (buka terikat ke sidik ter-commit).** `buka` membaca baris `sidik` PERTAMA yang ter-commit di `origin/main` (`sidik_commit`, pola `KC.tanggal_T`: commit tertua yang memuat `jenis=sidik`, dari `git show`, bukan berkas lokal) dan menolak bila
  `kandidat.json["sidik"]` berbeda atau baris itu belum ada; penolakan terjadi SEBELUM `buka.mulai` ditulis. `latih` menolak bila jejak LOKAL sudah memuat baris `sidik`, termasuk dengan `--ulang` (kandidat yang sudah dibekukan tidak dilatih ulang;
  sidik baru berarti protokol baru).
- **A-38 (konteks prospektif).** Hanya `hujan.json`, `kejadian.json`, dan `logbook` yang dibaca hidup; geo kecamatan, kerentanan, pvmbg, penduduk, dan desa_cari dibaca dari `beku/` (`jalur_sumber("prospektif")`). `buka` menegaskan
  `ctx_p.kab_keys`, `wilayah`, dan `sels` sama dengan konteks latih. Merevisi A-31 (yang menyebut konteks prospektif membaca "berkas hidup").
- **A-39 (jam_era5).** `data/raw/banjir/jam_era5/manifest.json` dikeluarkan dari `BERKAS_SIDIK["opsional"]` (SWI sekunder tidak dipakai; bukan bagian sidik).
- **A-40 (`buka.mulai`).** Menyimpan sha256 `hujan.json`, `kejadian.json`, dan `logbook_kejadian.json` HIDUP saat `buka` dimulai (§4.4; bukti keadaan, bukan pengunci).
- **A-41 (swauji `buka()` ujung ke ujung).** `uji` menjalankan `buka()` penuh dengan `tanggal_T`, `hari_ini`, `sidik_commit`, dan konteks ditambal (data mainan; konteks latih `sumber="beku"`, prospektif `sumber="prospektif"`): urutan sumber, penolakan sidik beda
  atau belum ada, penolakan sebelum 2027-06-29, `buka.json`/vektor/K2/`buka.mulai` ada, dan eksekusi kedua ditolak. Ulangan bootstrap kecil lewat argumen `buka(ulang=...)` yang hanya dipakai uji (`ULANG_BUKA` terkunci sidik, CLI tidak meneruskannya).

## E. Tinjauan keempat `validasi-model` (6 Nov)

- **A-42 (N1, latih dimatikan paksa; merevisi A-34 dan A-36).** `latih` menulis baris jejak `{"jenis":"latih","hasil":"mulai"}` SEBELUM pekerjaan dimulai dan menutupnya dengan satu baris `ok`, `dihentikan`, atau `galat` (nomor `ke` sama).
  `ke` = jumlah baris `mulai` + 1, sehingga SIGTERM/SIGKILL/OOM (yang tak bisa ditangkap) tetap terhitung. Pra-pemeriksaan menolak tanpa `--ulang` bila `latih.json`, `kandidat(.json/_dihentikan.json)`, atau baris `latih` apa pun ada;
  pesannya menyebut bila ada `mulai` tanpa penutup. Dengan `--ulang` latih boleh jalan lagi (kecuali ada baris `sidik`, A-37); `mulai` yatim tetap di jejak sebagai bukti.
- **A-43 (N2, buka tidak boleh membakar satu-kali).** Semua pemeriksaan murah dipindahkan SEBELUM `buka.mulai`: `kab_aktif_dari`, `se_skala`, `ix` tidak kosong, positif y1 prospektif > 0, dan kunci model lengkap (hidup, `klim`, `b2b`, `LH-N` bila LH-W hidup; `mde` tiap
  kandidat hidup), serta baris jejak latih terakhir harus `ok`. Penilaian (`buka_hitung` + `buka_tulis`) dibungkus `try/except BaseException`: galat apa pun menulis `buka.galat.json` (alasan, waktu, `sha256_hidup`, riwayat galat sebelumnya) lalu dilempar ulang.
  **Aturan lanjut (ditetapkan sekarang, sebelum ada hasil):** `buka --lanjut` hanya bila (1) `buka.mulai` ada, (2) `buka.json` TIDAK ada, (3) `buka.galat.json` ada, dan (4) sha256 hujan/kejadian/logbook hidup SEKARANG sama dengan yang tersimpan di `buka.mulai`.
  `--lanjut` melewati `tulis_mulai`, menulis baris jejak `{"jenis":"lanjut"}` (nomor, alasan galat sebelumnya), dan jumlah lanjut dilaporkan di `buka.json` (`_ringkas.lanjut` dan `vonis.lanjut` tiap kandidat). Selain syarat itu `buka` kedua tetap ditolak ("buka.mulai sudah ada").
  Lanjut tidak mengubah masukan (hash hidup sama) maupun kode (sidik sama); yang diulang hanya komputasi yang gagal.
- **A-44 (catatan a: latih ke > 1 dilaporkan).** `buka.json` memuat `_ringkas.latih_ke`, `_ringkas.catatan_latih`, dan `vonis.latih_ke` tiap kandidat. Bila `ke` > 1, vonis dibaca dengan catatan: koreksi uji jamak (m = 10 atau 9) TIDAK mencakup percobaan latih ulang.
- **A-45 (catatan b dan c).** (b) Pesan "semua kandidat dihentikan" menyebut bila `kandidat.json` LAMA masih ada (bukan hasil latih ini); `gerbang` menolak membaca `kandidat.json` bila baris jejak latih terakhir bukan `ok` (membaca `kandidat_dihentikan.json` hanya bila terakhir `dihentikan`).
  (c) Impor transitif banjir (`umum.py`, `model_kab2.py`, `model_kab.py`, `kejadian.py`) TIDAK masuk wajib/sidik (umum.py dibekukan sidik J4 sampai Apr 2027 dan dibagi lintas modul). RISIKO DITERIMA: perubahan di sana dapat mengubah perilaku tanpa mematahkan sidik.
  Mitigasi: hash keempatnya dicatat sebagai INFORMASI di baris `sidik` (`info_banjir_transitif`); `buka` membandingkannya dengan baris `sidik` ter-commit dan melaporkan yang berbeda (`_ringkas.info_banjir_transitif_beda`, juga dicetak), TIDAK menolak.
