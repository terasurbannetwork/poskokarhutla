# Amandemen PRAREG-CAMPUR revisi 5

Tanggal: 3 Nov 2026, SEBELUM `latih` nyata dan SEBELUM `sidik`. Pada saat penulisan TIDAK ada skor uji (F1-F5 maupun prospektif) yang dilihat
oleh penulis amandemen; semua butir menutup hal yang tidak ditentukan dokumen saat kode `model_kab_campur.py` ditulis dan hanya diuji pada
data sintetis. `PRAREG-CAMPUR.md` tidak disunting; berkas ini dikunci di `.sidik` bersamanya. Keputusan pemilik tetap menang atas butir di sini.

- **A-1 (baris evaluasi F1-F5).** Baris evaluasi lipatan F1-F4 = baris berlabel v2 yang sama dengan baris latih tahun itu (w > 0); label evaluasi
  `ye` = DIBI ATAU logbook hari mulai (`uji_logbook.label_dari`, gab_mulai). F5 (2026-01-01..2026-10-18) = semua kab-hari kab terpetakan, `ye` resmi saja.
  Alasan: menjaga himpunan baris sama antar-penilai tanpa membuka semua kab-hari; gerbang vonis prospektif tetap semua kab-hari (§2.1).
- **A-2 (satu-SE).** SE = simpangan baku SAMPEL (n-1) logloss antar-lipatan dibagi akar n (n = 4). Lipatan tanpa positif di satu wilayah (logloss tak
  terhingga/nan) dibuang dari SEMUA konfigurasi yang dibandingkan; bila semua gugur, dipilih konfigurasi paling sederhana. Ekstensi dengan nan ditolak.
- **A-3 (lokasi ONI/DMI).** `data/raw/banjir/iklim/oni.ascii.txt` dan `dmi.had.long.data` (NOAA CPC dan PSL), diunduh 3 Nov 2026; ONI terakhir JAS 2026 (920 musim),
  DMI terakhir 2026-05. Hash dikunci di `.sidik` (BERKAS_SIDIK.ekstensi).
- **A-4 (fitur hilang dan irisan).** Baris LATIH digugurkan bila fitur apa pun di set wilayahnya hilang, kecuali `twsa` (hilang -> 0 setelah standardisasi).
  Pada prediksi fitur hilang = 0 (netral) dan dihitung. Perbandingan logloss/ETS antar-set (S0..S3) dan set+ekstensi vs set di gerbang memakai IRISAN baris
  yang valid untuk SEMUA fitur kandidat yang dibandingkan (`pilih_semua` meneruskan `buang`), sesuai §3.2b butir 5 dan §3.2d.
- **A-5 (jatuh-ke-pulau).** Unit musim §3.1 = provinsi bila >= 3 kab di baris latih lipatan itu, selain itu calon pulau (enam calon §3.2b langkah 1).
- **A-6 (kandidat A).** Persentil ke-20 berbobot = kuantil BAWAH berbobot (nilai terkecil dengan bobot kumulatif >= 0,2 x total); `n_k` = jumlah hari kejadian
  (TINGGI/SEDANG) kab itu di tahun latih, tak berbobot, untuk aturan n_k < 5.
- **A-7 (pemetaan koreksi bias).** Wilayah koreksi bias ditetapkan per CALON (Sumatera, Jawa, Kalimantan masing-masing; selainnya Lainnya), tidak berubah
  walau calon digabung ke Lainnya di Platt; dicatat di `latih.json`.
- **A-8 (cakupan tahun label evaluasi, dihitung 3 Nov, tanpa membuka tanggal >= 2026-10-19).** `public/data/dibi_kejadian.json` (kunci `tanggal`): kejadian
  <= 2025: hanya tahun 2025 (1.294); tahun 2016-2024 TIDAK ada; 2026 (s.d. 2026-10-18): 3.038. `public/data/logbook_kejadian.json` (kunci `mulai`): 2025: 52, 2026: 1.700;
  tidak ada sebelum 2025. AKIBAT: label evaluasi F1-F3 (2022-2024) TIDAK bisa dibentuk dari kedua berkas ini; sumber 2022-2024 harus `data/raw/banjir/dibi_tanggal.json`
  (DIBI, tanggal) untuk DIBI dan arsip logbook `data/pusdalops/logbook_kejadian.csv` (`uji_logbook.arsip_baca`, 2022-2025). Sampai sumber itu dipasang pemilik/pemeriksa,
  `ye` untuk F1-F3 = DIBI saja (dibi_tanggal) dan ini dilaporkan sebagai kelonggaran; F4-F5 memakai gabungan.
- **A-7 (revisi, 4 Nov 2026, menggantikan A-7 di atas).** Koreksi bias dipetakan dari WILAYAH EFEKTIF sesuai tabel tetap §3.2b langkah 1: Sumatera->Sumatera, Jawa->Jawa, Kalimantan->Kalimantan,
  Bali-NT->Lainnya, Lainnya->Lainnya (calon yang gagal digabung masuk wilayah efektif Lainnya, sehingga koreksinya juga Lainnya). Dicatat di `latih.json` (`koreksi_bias`). Belum ada skor uji yang dilihat.
- **A-9 (4 Nov 2026, opsi A; belum ada skor uji yang dilihat).** Suku pooling §3.2c: penalti `delta_w` dan tarikan `b_w -> beta_nas` hanya berlaku untuk pasangan (wilayah, fitur) yang AKTIF
  (fitur ada di set wilayah itu). Pasangan nonaktif (b_w dipaksa 0) tidak ikut prior pooling. Akibatnya fitur yang aktif di satu wilayah saja (E_neraca/E_twsa Jawa, E_cs) membentuk `beta_nas`
  hanya dari wilayah itu dengan prior L2 `tau`, tidak menyusut ke 0 oleh tarikan wilayah lain. Alasan: sejalan dengan keputusan pemilik "formula boleh beda per wilayah"; tanpa ini efek 0,4 menyusut
  menjadi ~0,016 pada tau_w = 0,02. Uji: kasus ber-mask memulihkan efek sebenarnya (>= 0,8 x kasus wilayah tunggal).
- **A-10 (4 Nov 2026).** Jendela fitur yang keluar dari awal deret (e + batas bawah < 0) tidak membungkus ke ekor deret: `p_ant`, `cs` -> hilang (baris dibuang/netral sesuai aturan fitur hilang);
  `q_ant_*`/`dq` -> 0 (netral, sesuai "nol bila salah satu hilang").
- **A-11 (4 Nov 2026; belum ada skor uji yang dilihat). Titik debit dan Q2.** `model_kab_debit/titik.json` asli tidak ada dan tidak dapat dipulihkan (berkas mentah di-gitignore, tidak ada di riwayat git
  maupun bundle cadangan). `scripts/banjir/data/titik_glofas_kab.json` (satu titik per kab, 514 kode BPS) BUKAN padanannya (dasar kab, bukan sel; tidak di kisi 0,05 derajat) dan tidak dipakai.
  Keputusan: titik latih = PUSAT SEL yang sama dengan arsip (§4.3 aturan 2), sehingga titik latih dan arsip identik. Q2 dihitung ulang dari deret GloFAS harian 2016-2025 di pusat sel
  (`scripts/banjir/q2_pusat.py`, ~27 rb bobot, idempoten, jalan sesudah `jam_era5.py`). Hash manifest `q2_pusat/manifest.json` dikunci di `.sidik`. SIDIK TIDAK MENUNGGU unduhan ini:
  bila belum tuntas (104 sel utuh) saat sidik, berlaku aturan dokumen: `q_q2`, `q_ant_mx`, `q_ant_mn`, `dq`, `qa` dicopot dari model TAYANG (hanya P1/model penuh), dan `latih` mencatat
  sel yang belum utuh di `latih.json`.
- **A-12 (4 Nov 2026).** `E_kedap`: porsi kelas 50 (built-up) WorldCover v200 2021 per kab sampel dari fraksi blok 20x20 piksel (~220 m), rerata sel berpusat di dalam poligon
  `public/geo/kabupaten`; hash ubin dan metode di `kedap.json`, dikunci di `latih.json`/`.sidik`. Pendekatan blok 220 m menjadi toleransi batas kab.
