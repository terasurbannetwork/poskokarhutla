# Prapendaftaran: kejadian banjir BARU per kabupaten-hari, diprediksi dari jarak ke laporan banjir terakhir (faktor "belum surut", A7)

Status: DIBEKUKAN 24 Nov 2026 (tiket H23), SEBELUM data uji (2023-01-01 s.d. 2026-03-27) dibuka atau dinilai. Yang dilihat pembuat hanya jumlah baris label RESMI
(positif RESMI kab-hari: 9.409 pada 2008-2019, 6.392 pada 2023-01-01..2026-03-27; angka total, tanpa melihat siapa/kapan/hasil model) dan isi sumber surut (bagian 2).
Pelaksana: `banjir`. Kode faktor: `scripts/banjir/faktor_surut.py` (mode `uji` hijau). Kode uji arsip menyusul SETELAH sidik, oleh pemilik modul banjir.
Aturan main induk: `docs/banjir/PETA-JALAN-MODEL-BANJIR.md` §2 (arsip hanya menolak, prospektif memutus, protokol beku dulu). Format mengikuti `PRAREG-MJO.md`.

## 1. Bahaya utama: label bocor dari faktornya sendiri

Faktor dibangun dari laporan banjir, label juga laporan banjir. Bila label = "ada laporan banjir pada hari D", faktor `aktif_3h` (ada laporan pada D-3..D-1) menebak
dirinya sendiri: banjir tiga hari berturut-turut adalah SATU kejadian yang dilaporkan tiga kali, dan hari kedua-ketiga "diprediksi" oleh hari pertama.
Karena itu **label BUKAN "hari ada laporan"**, melainkan **hari-mulai kejadian BARU** (bagian 3), dan hari kelanjutan dikeluarkan dari penyebut, bukan dihitung negatif.

## 2. Data dan apa yang SUNGGUH ada untuk "surut"

- Label dan faktor arsip: `data/raw/banjir/label_bersatu_v2/kab_hari.csv.gz` (v2 beku; tidak disentuh) dan `cakupan_hari.csv.gz`. Positif RESMI = `dibi > 0` ATAU `lb > 0`
  (kolom itu nyata, jadi tidak perlu amandemen pengikatan seperti A1 di PRAREG-MJO). gs, berita, pb tidak pernah positif. `jendela_j3 = 1` dan hari `tak_teramati` dikeluarkan.
  Tabel RESMI hanya bertingkat kabupaten (DIBI: kab+tanggal; logbook CSV: nama kab, `n_kec` tanpa nama kecamatan). Kejadian non-alami tidak dapat disaring dari kolom (batas, bagian 8).
- **Kolom surut hanya ada di dua sumber**: (a) laporan harian Koordalops (`data/laporan-bnpb/harian/*/*/wa-koordalops.txt`, teks "Kondisi Mutakhir", dibaca dengan `surut()` milik
  `scripts/data/dalops_banjir.py`) sejak 27 Okt 2026, 26 berkas, tanggal 20-21 Nov tidak ada dan 12 Nov gagal diurai; (b) `data/raw/dalops/banjir.json` (logbook lokal, bendera `surut` per
  kejadian dan per hari `riwayat`) sejak 23 Okt 2026. **Tidak ada** di DIBI, `logbook_kejadian.csv`, maupun label v2/v3. Akibatnya `belum_surut` TIDAK dapat diuji di arsip 2008-2026-03 (seluruhnya
  sebelum sumbernya ada). Ia tidak masuk model arsip (bagian 5) dan memiliki jalur terpisah (bagian 7).
- Waktu catat: logbook CSV punya `pertama_dicatat` dan `terakhir_dicatat` (waktu catat nyata, tanpa riwayat tiap laporan); DIBI tidak punya waktu catat (terisi susulan, pekan sampai bulan);
  berkas WA bertanggal H diterima pada H.

## 3. Label: hari-mulai kejadian baru

Per kabupaten k, hari D (WIB), ada tiga kelas, dihitung dari baris positif RESMI tabel itu sendiri, bukan kolom `episode` v2 (batas 14 harinya memotong kejadian panjang menjadi
"episode baru" buatan):

- **Mulai baru (y=1)**: D positif RESMI DAN tidak ada baris positif RESMI pada D-4..D-1 (`N_GAP = 4`).
- **Negatif (y=0)**: D bukan positif DAN tidak ada baris positif pada D-4..D-1.
- **Kelanjutan (DIKELUARKAN dari penyebut maupun pembilang)**: ada baris positif pada D-4..D-1, apa pun status D.

Mengapa 4: gugus v2 berjangkar mencakup maksimal 2 hari tetapi hanya jangkarnya yang berbaris, jadi hari kedua gugus tidak terlihat; empat hari tanpa baris menjamin sedikitnya tiga hari
tanpa laporan setelah gugus berakhir (cocok dengan jendela `aktif_3h`). Kejadian di kecamatan LAIN pada kab yang sedang berkejadian TIDAK dihitung baru (tabel tak punya nama kecamatan untuk RESMI);
pemisahan hanya berdasar jeda per kabupaten. Memanjangkan atau memendekkan N_GAP sesudah data dibuka = protokol baru.

Konsekuensi yang disengaja, ditulis agar tak dianggap temuan: pada himpunan berisiko (negatif + mulai baru) `aktif_3h` SELALU 0 (secara aljabar ia komplemen dari kelas kelanjutan), jadi
`aktif_3h` bukan prediktor dan tidak diuji. Yang bervariasi hanya `hari_sejak` (>= 5 baris-hari pada tabel arsip). Hipotesis yang sungguh diuji:
**sesudah jeda kejadian lewat, apakah makin dekat kab itu ke kejadian terakhirnya (tanah masih jenuh, pembersihan belum selesai, hujan hulu yang sama) menaikkan peluang kejadian BARU di atas klimatologi?**

## 4. Pembagian waktu dan aturan bersih bocoran

| Bagian | Periode | Dipakai untuk |
| --- | --- | --- |
| Latih | 2008-01-01 s.d. 2019-12-31 | klimatologi kab x bulan, koefisien kelas `hari_sejak` |
| Validasi | 2020-01-01 s.d. 2022-12-31 | memilih penalti ridge (satu-satunya hiperparameter) |
| Uji arsip (beku) | 2023-01-01 s.d. 2026-03-27 | hanya MENOLAK; dibuka sekali oleh `uji` |
| Prospektif | baris `tepat_waktu` di `faktor_surut_arsip.jsonl`, paling awal D = 2026-11-25 | vonis, bagian 6 |

Tahun 2023-2026 sudah pernah terlihat rancangan lain (PETA-JALAN §2.2): hasil arsip tidak pernah boleh disebut LULUS. Label 2026 hanya dibuka oleh uji beku ini (§2.5).

Aturan bersih bocoran (beku, latih sampai prospektif):
1. Fitur hari D hanya dari baris positif bertanggal <= D-1 (arsip) atau berkas WA bertanggal <= D-1 (prospektif, `faktor_surut.py`: H < D). Hari D sendiri dan sesudahnya tidak dibaca.
2. Himpunan berisiko (bagian 3) ditentukan dari D-4..D-1 saja, jadi tidak memakai informasi masa depan.
3. **Batas atas kejujuran arsip**: tanggal baris DIBI adalah tanggal kejadian, bukan tanggal catat; di dunia nyata laporan itu baru tampak berpekan-pekan kemudian. Fitur arsip berbasis RESMI
   (S1) karenanya OPTIMIS. Untuk itu ada analisis kepekaan **S2**: fitur hanya dari baris logbook (`lb`) yang `pertama_dicatat` < D, label tetap RESMI; dinilai pada hari berliputan logbook
   (`cakupan_hari.lb = 1`). Hasil S1 tidak boleh dilaporkan tanpa S2.
4. Prospektif: hanya baris arsip `tepat_waktu = true` (waktu komputasi `hitung` < 00:00 WIB D) yang sah; `--hari` mundur menulis `tepat_waktu = false` dan tidak dihitung.
5. Arsip `faktor_surut_arsip.jsonl` append-only: (D, kab) yang sudah ada tidak pernah ditimpa (diuji `faktor_surut.py uji`).

## 5. Model dan kriteria arsip

Satu hipotesis, SATU klaim nasional (kelas `hari_sejak` tidak punya alasan fisik berbeda per wilayah; pecahan per wilayah dilaporkan deskriptif, tanpa gerbang).

- Sampel kabupaten: >= 20 hari-mulai-baru pada 2008-2019 dan cakupan label (pola `model_kab.py`: dipilih dari kejadian sampai tahun latih terakhir saja); daftar dibekukan sidik sebelum validasi.
- Kelas `hari_sejak` (baris-hari sejak baris positif terakhir, jeda dari tabel): K1 = 5-7, K2 = 8-14, K3 = 15-30, rujukan = lebih dari 30 atau tak ada.
- M0 (klimatologi): laju hari-mulai-baru per kab x bulan pada himpunan berisiko, latih saja, dihaluskan ((n_pos + 0,5) / (n_hari + 1)).
- M1: regresi logistik dengan offset logit(M0) + indikator K1..K3, ridge; penalti dari {0,1; 1; 10; 100} menurut logloss validasi. Tidak ada fitur, interaksi, atau hiperparameter lain.
- Pembanding: (a) M0; (b) persistensi: skor = 1/`hari_sejak` (seri dipecah oleh skor M0), tanpa dilatih; (c) salinan aturan berlaku sebagaimana dijalankan `uji_balik.py`
  (keluaran >= Siaga per kab-hari, tidak diubah, tidak dilatih ulang, dihitung pada hari himpunan berisiko saja).
- Laju alarm SAMA: q = frekuensi alarm aturan berlaku (c) pada himpunan berisiko periode uji; M0, M1, persistensi membunyikan alarm pada q teratas skor.
- Ukuran utama: dETS(M1 - M0) pada q. Sekunder, tanpa gerbang: dETS M1 - persistensi, M1 - aturan berlaku, selisih Brier skill, koefisien K1..K3 beserta selangnya.
- Bootstrap, 1.000 ulangan, biji 11, dua skema: (1) blok per kabupaten (kewajiban); (2) blok 30 hari (kejadian banjir mengelompok menurut musim hujan regional; blok per kab saja meremehkan).
  Batas bawah = yang lebih kecil, atas = yang lebih besar.
- Vonis arsip, hanya menolak: DITOLAK bila dETS(M1 - M0) titik <= 0 atau batas atas CI95 < 0 pada S1, ATAU dETS titik <= 0 pada S2. Selain itu, HANYA bila S2 menilai (>= 100 hari-mulai-baru pada hari berliputan logbook, ukuran minimum S2) dan lolos: "LOLOS SARING" (bukan LULUS), koefisien dibekukan sidik.
  Lolos S1 tanpa S2 yang menilai = "BELUM TERUJI" (bukan LOLOS SARING), karena S1 optimis dan logbook berhenti 2023 sehingga S2 mungkin kosong; koefisien tidak dibekukan untuk prospektif atas dasar S1 saja.
  < 100 hari-mulai-baru di uji (S1) = "belum cukup", berhenti. S2 < 100 = S2 "tak menilai", dilaporkan apa adanya; S1 hanya dapat MENOLAK, tidak dapat meloloskan.

## 6. Vonis prospektif (PRAREG-PROSPEKTIF.md, tidak diubah)

Hanya bila LOLOS SARING. Fitur dari `faktor_surut_arsip.jsonl` (baris `tepat_waktu`, `hari_sejak` dari laporan Koordalops, dikonversi ke kelas K1..K3 memakai jeda berkas dengan N_GAP setara
tiga hari catat tanpa laporan, ditulis kode uji SEBELUM hari prospektif pertama). Label sama (DIBI/logbook, hari-mulai-baru, tertunda: hanya hari <= tanggal DIBI terakhir dikurangi 14).
Belum cukup data bila < 60 hari atau < 100 hari-mulai-baru. LULUS bila batas bawah selang 95% (bootstrap blok-bergerak 7 hari, 1.000 ulangan, biji 7) selisih ETS model terhadap M0 DAN aturan
berlaku > 0; vonis dikunci sekali. Perhatikan pergeseran sumber (arsip: tabel label; prospektif: laporan Koordalops, cakupan kab berbeda): dicatat di laporan, tidak dikoreksi.
Sampai itu, `hari_sejak` tidak masuk `status.py`, kartu, atau tampilan apa pun sebagai faktor terbukti.

## 7. Pemakaian operasional terpisah: bendera "banjir belum surut" (TANPA vonis)

`belum_surut` (dan `aktif_3h`, `hari_sejak`) dari `faktor_surut.py` boleh tampil sebagai **bendera situasi**: "laporan terakhir <tanggal>: banjir belum surut" per kabupaten. Ia keterangan keadaan
yang sedang dilaporkan, BUKAN prakiraan; karena itu tidak butuh vonis ini dan tidak diukur dengan ETS. Syaratnya, semuanya mengikat:
- Sumber dan umur ditampilkan; lewat 14 hari tanpa laporan menjadi "belum diketahui" (aturan `terdampak.py`, tidak diubah); teks kondisi yang tak menyatakan apa pun = tak ada bendera, bukan "sudah surut".
- Tidak boleh dinyatakan atau disiratkan menaikkan peluang banjir baru, tidak masuk skor `kejadian_aktif.py`, `status.py`, atau peringkat, selama vonis bagian 6 belum LULUS.
- Tidak ada angka dampak (KK, jiwa, pengungsi) di berkas publiknya (batas `terdampak.py`).
- Cakupan laporan Koordalops berlubang (20-21 Nov tidak ada, 12 Nov gagal diurai): kab tanpa bendera tidak berarti surut.

## 8. Kejujuran dan batas

- `hari_sejak` arsip memakai tanggal kejadian, bukan tanggal catat (bagian 4.3): S1 optimis, S2 jujur tapi sempit (logbook berhenti 2023; 2011-2013 dan 2022-2023 parsial).
- Tabel kab tidak membedakan kecamatan: kejadian baru di kecamatan lain pada kab yang sama dalam 4 hari terhitung kelanjutan (mengecilkan hari-mulai).
- Positif RESMI mencampur banjir alami dan non-alami (tanggul jebol, bendungan) karena kolomnya tak memuat jenis; tidak disaring.
- DIBI 2026 belum terisi susulan: hari uji 2026-01..03 bertumpu pada logbook; hari-mulai-baru di sana kurang terhitung.
- "Aturan berlaku" di arsip adalah salinan hitung `uji_balik.py` dengan hujan ERA5, bukan prakiraan yang benar-benar terbit.
- Banjir kronis (pasang, genangan menetap) dapat tampil sebagai kejadian terputus-putus dan mengisi kelas K1-K2; tidak dikendalikan selain lewat klimatologi kab x bulan.

## 9. Kode dan sidik

- `scripts/banjir/faktor_surut.py` (+ fixture nyata `scripts/banjir/fixture/surut/`: 5 berkas WA Koordalops 17, 18, 19, 22, 23 Nov 2026 apa adanya).
- Kode uji arsip: berkas baru `scripts/banjir/uji_surut.py` (modus `latih`, `uji`), ditulis SETELAH sidik berkas ini, penanda buka O_EXCL sekali jalan seperti `model_kab_debit.py`.
- Sidik: sha256 berkas ini di `scripts/banjir/PRAREG-SURUT.sidik` (pola `PRAREG-MJO.sidik`), di-commit sebelum `latih`. Sidik daftar sampel kab, label latih, dan berkas data ditambahkan `latih` sebagai
  baris baru; baris yang ada tidak diubah. Mengubah berkas ini sesudah sidik = protokol baru dengan tanggal baru.

## 10. Amandemen

### Amandemen sebelum data dibuka (24 Nov 2026)

Data uji belum dibuka dan `latih` belum jalan; sidik diperbarui.

- F5 (§4.3, §5): S2 praktis kosong (logbook berhenti 2023) sehingga vonis jatuh ke S1 yang optimis. Kini lolos S1 tanpa S2 menilai (< 100 hari-mulai-baru) = "BELUM TERUJI", bukan "LOLOS SARING".
