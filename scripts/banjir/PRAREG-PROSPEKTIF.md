# Pra-registrasi uji prospektif banjir

Didaftarkan 27 Okt 2026, SEBELUM ada skor yang dihitung. Prakiraan tercatat sejak 19 Okt 2026 (`public/banjir/data/prospektif.json`),
tetapi tanggal terbit itu belum pernah dinilai terhadap kejadian (DIBI terlambat terbit dan terisi), jadi kriteria di bawah ditetapkan
tanpa melihat hasil apa pun. Dokumen ini tidak menyebut hasil. Pola dari `scripts/sebaran/prospektif.py` (kriteria beku dicek ke commit).

## Yang dinilai

Status banjir per kabupaten (level tertinggi kecamatan di kabupaten itu, satuan yang sama dengan `uji_balik.py` dan DIBI) pada
tanggal terbit, untuk waktu-tunda 0 sampai 3 hari. Ramalan "ya" bila level >= Siaga (2). Ambang `status.py` (K 0,8; 50/100/150 mm;
FAR uji balik 0,92 sampai 0,96) TIDAK diubah dan tetap ditampilkan apa adanya; yang diuji di sini hanya apakah ramalan nyata lebih
baik dari dua pembanding sederhana.

## Sumber kebenaran

Kejadian DIBI BNPB (`data/raw/banjir/dibi_tanggal.json`, jenis banjir atau bandang, jumlah kejadian >= 1) per pasangan
`provinsi|kabupaten` dan tanggal: sumber yang sama dengan uji balik. Hanya tanggal sasaran sampai (tanggal DIBI terakhir dikurangi
14 hari) yang dinilai, karena kejadian dilaporkan menyusul. Hari yang kebenarannya belum ada tidak dihitung dan tidak diisi nol.

## Pembanding

- Persistensi: kabupaten yang mengalami kejadian pada hari sebelum tanggal terbit diramalkan mengalaminya lagi pada tanggal sasaran.
- Klimatologi: kabupaten dengan frekuensi kejadian historis tertinggi pada musim yang sama (hari kalender +-15 hari, hanya tahun
  sebelum tahun sasaran), sebanyak jumlah kabupaten yang diramalkan model hari itu (tanpa parameter yang disetel).

## Metrik dan aturan keputusan

Tabel kontingensi kabupaten-hari per waktu-tunda (a kena, b alarm palsu, c terlewat, d benar tidak): POD = a/(a+c), FAR = b/(a+b),
CSI = a/(a+b+c), ETS = (a - ar)/(a+b+c - ar), ar = (a+b)(a+c)/N. Selang 95% dengan bootstrap blok-bergerak atas hari terbit
(blok 7 hari, 1.000 ulangan, benih 7). Vonis ditetapkan pada waktu-tunda primer (1 hari):

1. Belum cukup data bila hari yang dinilai < `n_hari_min` (60) atau jumlah kejadian < `kejadian_min` (100). Tidak ada vonis lolos atau tidak lolos.
2. Lolos bila batas bawah selang 95% ETS model > 0, dan batas bawah selang 95% selisih ETS (model dikurangi pembanding) > 0 terhadap
   KEDUA pembanding. Selain itu tidak lolos.
3. Vonis akhir dikunci sekali: begitu keluar (lolos atau tidak lolos) tidak diganti oleh data berikutnya. Waktu-tunda lain dilaporkan, tidak menghakimi.

## Catatan jujur tentang pembanding dan data

- Persistensi memakai kejadian DIBI hari sebelum terbit, padahal DIBI belum ada saat prakiraan terbit (terlambat berhari-hari sampai berminggu).
  Jadi persistensi adalah BATAS ATAS oracle, bukan pembanding yang bisa dijalankan operasional; mengalahkannya berarti jauh melampaui yang perlu.
- Entri 19 sampai 27 Okt 2026 tercatat sebelum registrasi ini dan tanpa pernah dilihat hasilnya terhadap kejadian.
- Sel `d` memakai `n_kab` entri terbaru di arsip (satu angka untuk seluruh jendela), bukan n_kab saat tiap entri terbit.

## Logika penilaian ikut beku

Selain angka di blok, logika penilaian di `scripts/banjir/prospektif.py` (fungsi `tabel_per_terbit`, `klimatologi`, `bootstrap`, `skor_tunda`,
`metrik`) pada commit jangkar adalah bagian dari kriteria: mengubahnya sesudah jangkar berarti kriteria baru. Jangkar yang tak bisa
diverifikasi (clone dangkal atau bukan leluhur HEAD) membuat skrip menolak menilai, tidak melewati.

## Kriteria beku

Blok ini dibaca mesin; `prospektif.py` menolak menilai bila isinya berbeda dari `KRITERIA` (hash `KRITERIA_SHA256`) atau dari versi di
`JANGKAR_COMMIT`. Mengubah angka berarti mengubah ketiganya sekaligus, dan itu kriteria baru dengan tanggal registrasi baru.

<!-- BEKU:mulai -->
```json
{
 "tanggal_registrasi": "2026-10-27",
 "jendela_mulai": "2026-10-19",
 "kebenaran": "DIBI banjir/bandang >= 1 kejadian per kabupaten-hari",
 "tunda_primer": 1,
 "ambang_status": 2,
 "n_hari_min": 60,
 "kejadian_min": 100,
 "margin_dibi": 14,
 "blok_hari": 7,
 "boot_b": 1000,
 "benih": 7,
 "selang_persen": 95,
 "pembanding": [
  "persistensi",
  "klimatologi"
 ],
 "ets_selisih_bawah_min": 0.0,
 "ets_model_bawah_min": 0.0,
 "klimatologi_jendela_hari": 15,
 "definisi_ramalan": "level banjir tertinggi kecamatan di kabupaten >= ambang_status pada waktu-tunda yang dinilai",
 "metode_klimatologi": "top-N kabupaten menurut frekuensi kejadian +-jendela hari kalender pada tahun < tahun sasaran (frekuensi > 0), N = jumlah ramalan model hari itu, seri diurut (frekuensi turun, kunci naik)",
 "metode_persistensi": "kabupaten berkejadian pada tanggal terbit minus 1",
 "metode_bootstrap": "blok-bergerak atas hari terbit, panjang blok_hari, boot_b ulangan, benih; ulangan tanpa kejadian model (ETS tak terdefinisi) dilewati; selang persentil dua sisi",
 "rumus_ets": "ar=(a+b)(a+c)/N; ETS=(a-ar)/(a+b+c-ar); N=a+b+c+d; d=n_kab(entri terbaru)-|ramalan U kejadian|"
}
```
<!-- BEKU:akhir -->

## Jangkar

Commit yang memuat berkas ini dicatat di konstanta `JANGKAR_COMMIT` (`scripts/banjir/prospektif.py`) pada commit SESUDAHNYA (hash commit
tidak bisa ada di dalam isinya sendiri). Sejak terisi, `skor` membandingkan blok beku dengan `git show <commit>:scripts/banjir/PRAREG-PROSPEKTIF.md`.

## Arsip dan vonis di git

`prospektif.json` hanya bertambah dan entrinya tidak pernah berubah. Skrip membandingkan arsip lokal dengan versi di git HEAD
(`public/banjir/data/prospektif.json`); lebih pendek atau berubah = keluar kode 3 dan tidak mencatat. Keluaran skor:
`public/banjir/data/prospektif_skor.json` (`vonis_berjalan`, `vonis_akhir` terkunci, `tunda`.n_hari, metrik, selang).
