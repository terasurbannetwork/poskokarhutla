# PRAREG-ESKALASI: eskalasi kejadian banjir berjalan dalam 48 jam (KI-30, KEPUTUSAN-KEMAMPUAN Q6)

Status: riset, bukan produk. Hasil apa pun tidak membuka tampilan baru; `boleh_tampil` selalu false (uji ini retrospektif, gerbang meminta vonis prospektif).

## 1. Hitungan label (langkah 1, dikerjakan sebelum model)

Sumber label: `data/pusdalops/logbook_kejadian.csv` saja (jenis banjir, `tgl_kejadian` dan `pertama_dicatat` valid, 2016-2025, 0 <= selisih <= 10 hari). DIBI tidak dipakai: tidak ada tanggal kejadian per-kecamatan di berkas publik, dan `dibi_tanggal.json` tidak dilacak. Label TIDAK memakai status, level, atau keluaran model kita.

- Baris banjir sah (kab x baris): 11.480. KI-16 menunjukkan mutu label per kab buruk di banyak kab; karena itu hujan (fitur) dibatasi pada 43 kab bersampel ERA5 lengkap (cache `uji_balik`, 104 sel), bukan 513 kab.
- Satuan berlabel (provinsi x hari d, ada kab bersampel baru tercatat): **1.502**, y=1: 487 (32%). Latih 2016-2023: 1.104 (y=1 333, 17 provinsi). Uji 2024-2025: 398 (y=1 154, 18 provinsi).
- Setelah dijarangkan (episode provinsi, celah > 3 hari): **1.257** (uji 321). 774 blok provinsi x bulan.
- Ambang tutup: kurang dari 200 satuan, atau kurang dari 100 satuan uji -> "DITUTUP: data tidak cukup". Terlampaui jauh, jadi dilanjutkan.

Keterbukaan: hitungan di atas melihat jumlah y=1 uji secara agregat (bukan skor model). Tidak ada model yang sudah dilatih atau dinilai sebelum berkas ini ditulis.

## 2. Definisi

- Satuan: (provinsi p, hari d), d = hari kabar tercatat (`pertama_dicatat`). Syarat: ada kab bersampel dengan baris tgl_kejadian di d-3..d, dicatat tepat d, dan kab itu belum tercatat di d-3..d-1.
- Himpunan diketahui di d: kab tercatat di p pada d-3..d.
- **y = 1** bila ada kab LAIN (di luar himpunan diketahui) di provinsi p tercatat pada d+1..d+2 dengan tgl_kejadian >= d-2. Kab yang sama berlanjut tidak dihitung eskalasi. Kecamatan, rumah, dan pengungsi tidak dipakai (kolom terlalu jarang dan tanpa tanggal sendiri).
- Keterbatasan yang diakui: "kab lain di provinsi sama" adalah proksi (tanpa adjacency); y mencampur eskalasi nyata dengan kebiasaan pelaporan Pusdalops (pencatatan menyusul). Itulah alasan pembanding persistensi dan klimatologi dipertahankan.

## 3. Fitur (hanya yang diketahui di hari d)

`lh1` (hujan ERA5 hari d), `lh3` (d-2..d), `la7` (d-7..d-1), `sm` (lengas tanah d), semuanya log1p dan dari sel kab bersampel dengan h3 terbesar; `lknown` log(1 + jumlah kab diketahui), `lnew0` log(1 + kab baru hari d), `lnew12` log(1 + kab baru d-2..d-1), `sinm`/`cosm` (bulan). Hujan hulu tidak dipakai (tidak ada deret hulu per kab di cache); ERA5 bukan ramalan, jadi ini batas atas informasi hujan. Standardisasi dari latih saja.

## 4. Model dan pembanding

- Model: regresi logistik ridge (lambda = 1,0 tetap, tanpa penyetelan), IRLS stdlib, dilatih 2016-2023.
- Pembanding (semua dari latih): `klimatologi_bulan`; `klimatologi_prov_bulan` (menyusut ke laju bulan, bobot prior 10); `persistensi` (laju y pada "ada kab baru di d-2..d-1" vs tidak).
- Pembanding utama = yang ber-Brier latih terkecil (aturan tetap, dipilih sebelum uji).

## 5. Uji dan vonis (dibuka sekali: `eskalasi.buka`)

Uji 2024-2025. Metrik: selisih Brier per satuan (pembanding utama minus model), selang 95% bootstrap persentil atas blok (provinsi x bulan), 2000 ulang, biji 7.
**LOLOS** hanya bila batas bawah selang > 0 DAN AUC model > AUC pembanding utama. Selain itu **tidak lolos**; angka dilaporkan apa adanya, aturan tak diubah setelah dibuka. Perubahan = amandemen tertulis dan penanda baru.

## 6. Pembekuan

`eskalasi.sidik` memuat hash `eskalasi.py`, `uji_balik.py`, `scripts/umum/gerbang.py`, berkas ini, hash logbook dan 43 kab x sel cache ERA5. Keluaran: `public/banjir/data/eskalasi_uji.json` dan kunci `eskalasi` di `public/data/gerbang/banjir.json` (kunci lain dipertahankan).
