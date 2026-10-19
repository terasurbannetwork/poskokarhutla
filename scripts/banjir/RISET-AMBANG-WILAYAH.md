# Ambang status banjir per wilayah: protokol dan hasil

Skrip: `scripts/banjir/ambang_wilayah.py`. Keluaran: `public/banjir/data/ambang_wilayah.json` dan blok
`ambang_wilayah` di `public/banjir/data/validasi.json`. Tujuan: memangkas alarm palsu Waspada banjir (uji balik
2022-2025: POD 0,565, FAR 0,964, CSI 0,035) dengan ambang per wilayah, tanpa menjatuhkan POD.

## Protokol (ditulis 19 Okt 2026, SEBELUM angka validasi dan uji dilihat)

Bagian ini tidak boleh diubah setelah `buka` dijalankan. Perubahan protokol sesudah itu = eksperimen baru dengan
periode uji baru (2026 ke atas), bukan perbaikan.

**Satuan dan data.** Sama dengan `uji_balik.py`: kabupaten-hari, level kabupaten = kecamatan tertinggi, hujan ERA5
sebagai prakiraan sempurna (cache `data/raw/banjir/uji_balik/`), kejadian = tanggal DIBI banjir/bandang
(`data/raw/banjir/dibi_tanggal.json`, sumber yang sama dengan `kejadian.json`; `kejadian.json` sendiri hanya memuat
baris harian 2023 ke atas, jadi tidak cukup untuk melatih). Sampel kabupaten = `uji_balik.pilih()` apa adanya.

**Wilayah = kabupaten**, bukan DAS. DIBI mencatat per kabupaten; memetakan kejadian ke DAS butuh lokasi yang tidak
ada di DIBI. Induk: kelompok pulau (`uji_balik.KELOMPOK`), lalu nasional.

**Kenop per wilayah: satu pengali k** untuk ambang H3 50/100/150 x k (Waspada/Siaga/Awas), kisi
k in {0,6; 0,8; 1,0; 1,2; 1,4; 1,6; 2,0}. Jalur lain (I >= 20/30 mm/jam, bahaya InaRISK, GESER -1) tetap global.
Aturan sekarang = k 0,8 di semua wilayah.

**Pembagian waktu.**
- latih 2016-2021: memilih k tiap wilayah;
- validasi 2022-2023: memilih hiperparameter (di bawah);
- uji 2024-2025: dibuka SEKALI dengan perintah `buka`. Skrip menyimpan sidik parameter terpilih; `buka` menolak
  jalan bila sidiknya berbeda dari yang sudah pernah dibuka. Tidak ada angka uji yang dipakai memilih apa pun.

**Pemilihan k satu wilayah (di data latih).** Di antara k yang POD >= Waspada wilayah itu turun paling banyak
`eps` dari POD aturan sekarang di wilayah yang sama, pilih FAR terkecil; seri dipecah CSI terbesar, lalu k
terdekat 0,8. Bila tidak ada k yang lolos, k = 0,8.

**Penyusutan ke induk.** Nasional: k dipilih atas semua kabupaten sampel. Pulau: k sendiri bila jumlah hari
kejadian latih pulau itu >= `n_min`, selain itu k nasional. Kabupaten: k sendiri bila hari kejadian latihnya
>= `n_min`, selain itu k pulaunya. `n_min` = tak hingga berarti satu k nasional.

**Hiperparameter** (dipilih di validasi 2022-2023): `eps` in {0,02; 0,04} x `n_min` in {20; 40; 80; tak hingga}
= 8 kombinasi. Yang dipilih: ΔFAR >= Waspada terkecil (paling negatif) di antara kombinasi dengan ΔPOD >= -0,05;
seri dipecah ΔCSI terbesar. Bila tidak ada yang lolos, dipilih kombinasi dengan ΔPOD terbesar (tetap dinilai di uji).

**Pembanding di uji.** (1) aturan sekarang (k 0,8); (2) alarm acak berlaju sama: tiap blok kabupaten x tahun,
hari alarm ditarik acak (benih tetap) sebanyak hari alarm >= Waspada aturan wilayah di blok itu.

**Selang.** Bootstrap blok (kabupaten x tahun) 1.000 ulangan, berpasangan (blok yang sama untuk kedua aturan),
pola `uji_balik.py`.

**Kriteria LAYAK** (>= Waspada banjir, periode uji 2024-2025), semuanya wajib:
1. ΔFAR (wilayah - sekarang) <= -0,10, dan batas atas CI95 ΔFAR < 0;
2. ΔPOD >= -0,05 (nilai titik);
3. ΔCSI > 0, dan batas bawah CI95 ΔCSI > 0;
4. CSI aturan wilayah > batas atas CI95 CSI alarm acak berlaju sama;
5. penjaga level atas: selisih ETS rata-rata tiga level (wilayah - sekarang) >= 0 (nilai titik).

LAYAK = `status.py` memakai k wilayah (bendera `pakai` di `ambang_wilayah.json`) dan layar menampilkan angka uji.
TIDAK LAYAK = status tidak diubah; hasil ditulis apa adanya di bab uji balik Metode.

**Bias DIBI yang harus dibaca bersama hasilnya.**
- Kurang lapor: banjir kecil tidak tercatat, jadi sebagian "alarm palsu" adalah banjir yang tidak dicatat. FAR
  mutlak pesimistis. Selisih antaraturan tetap sah karena keduanya dinilai terhadap catatan yang sama, tetapi aturan
  yang memangkas alarm di hari hujan sedang akan tampak lebih baik bila justru banjir kecil di hari itu yang tidak
  tercatat. Laju dasar ~1,7% kabupaten-hari membuat FAR alarm acak ~0,98: FAR turun 0,10 berarti ketepatan alarm
  naik dari ~4% ke ~14%, hampir empat kali lipat. Target ini berat, dan itu disengaja.
- Pencatatan naik dari tahun ke tahun (2016: 823 hari banjir, 2025: 2.938). Laju dasar uji lebih tinggi dari latih,
  sehingga FAR uji semua aturan lebih rendah dari latih; yang dibandingkan hanya selisih di periode yang sama.
- DIBI 2024 kurang lengkap (longsor hanya 219). Banjir 2024 diperiksa jumlahnya sebelum uji dibuka; bila jauh di
  bawah 2023 dan 2025, itu dicatat sebagai keterbatasan, periode uji tidak diganti.
- Tanggal DIBI bisa tanggal laporan, bukan tanggal kejadian.

## Hasil

Belum dijalankan.
