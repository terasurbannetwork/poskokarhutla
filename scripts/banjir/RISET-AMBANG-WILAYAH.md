# Ambang status banjir per wilayah: protokol dan hasil

Skrip: `scripts/banjir/ambang_wilayah.py`. Keluaran: `public/banjir/data/ambang_wilayah.json` dan blok
`ambang_wilayah` di `public/banjir/data/validasi.json`. Tujuan: memangkas alarm palsu Waspada banjir (uji balik
2022-2025: POD 0,565, FAR 0,964, CSI 0,035) dengan ambang per wilayah, tanpa menjatuhkan POD.

## Protokol (ditulis 19 Okt 2026, SEBELUM angka validasi dan uji dilihat)

> Versi awal di bawah ini DIGANTI sebagian oleh bagian "Perubahan protokol sebelum latih". Bila keduanya berbeda,
> bagian perubahan yang berlaku. Versi awal dibiarkan sebagai jejak.

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

## Perubahan protokol sebelum latih (19 Okt, dari tinjauan validasi-model)

Dibuat sebelum `latih` dijalankan sekali pun: belum ada angka latih, validasi, atau uji yang dilihat (data latih belum
ada di mesin ini). Versi kode: `VERSI = "protokol-2026-10-19b"`.

1. **Kebocoran di pemilihan sampel ditutup.** `uji_balik.pilih()` mengurutkan kabupaten menurut kejadian 2016-2025,
   termasuk tahun uji. `pilih_latih()` memanggil pemilih yang sama dengan kejadian dipotong <= 2021-12-31. Akibatnya
   sampel kabupaten bisa beda dari sampel `validasi.json`, sehingga angka "aturan sekarang" di sini tidak harus sama
   dengan validasi.json. **Keterbatasan yang tidak bisa ditutup:** indeks bahaya InaRISK mungkin sebagian dibentuk dari
   riwayat kejadian (termasuk 2022-2025). Itu bocoran lemah lewat jalur B >= 0,33/0,66, sama besar untuk kedua aturan.
2. **Kriteria lama hampir mustahil dan diganti.** Dari validasi.json (Waspada 2022-2025: a 602, b 15.946, c 463), FAR
   <= 0,864 dengan POD >= 0,515 berarti alarm turun ~76% sambil kehilangan paling banyak 54 kena. Dua periksa awal
   dijalankan di `latih` dari data LATIH saja, sebelum memilih apa pun, dan dicatat di `ambang_wilayah.json.periksa`:
   - (a) porsi hari alarm Waspada aturan sekarang yang H3-nya < 40 mm (dipicu `imax >= 20` saja). Bila > 0,50, kisi
     ditambah kenop iw (ambang intensitas Waspada) in {20, 30, 40} mm/jam; selain itu iw tetap 20. Kenop per wilayah
     menjadi pasangan (k, iw). `status.level_banjir` mendapat argumen `i_waspada` (bawaan 20 = aturan berlaku, tidak
     mengubah status harian).
   - (b) orakel in-sample: tiap kabupaten memilih kenop di latih (eps 0,05, tanpa penyusutan) dan dinilai di latih yang
     sama. Ini batas atas yang optimistis. Bila orakel pun tidak mencapai dFAR -0,10, kriteria lama memang tak bermakna.
   **Kriteria LAYAK baru** (>= Waspada, uji 2024-2025), semuanya wajib:
   1. dCSI > 0 dan batas bawah CI95 > 0;
   2. dETS Waspada > 0 dan batas bawah CI95 > 0;
   3. dPOD >= -0,05 (titik);
   4. dFAR <= -0,03 dan batas atas CI95 < 0 (dibaca relatif, dFAR/FAR_sekarang, bila butir 6 berlaku);
   5. penjaga level atas: selisih ETS rata-rata tiga level >= 0 (titik), dipertahankan dari protokol awal supaya
      Siaga/Awas tidak dikorbankan.
   dFAR -0,10 bukan gerbang lagi. Kriteria "CSI > CI atas acak" dibuang: redundan dengan dETS (ETS sudah dikoreksi
   untuk kena kebetulan) dan aturan sekarang sudah mengalahkan acak.
3. **Uji benar-benar sekali.** Sidik = sha256 atas parameter terpilih + isi `ambang_wilayah.py`, `uji_balik.py`,
   `status.py`, dan `dibi_tanggal.json`. `buka` menolak bila sidik tidak cocok dengan saat latih, dan menolak SAMA
   SEKALI bila `dibuka` sudah ada. `latih` juga menolak setelah uji dibuka.
4. **Selang kriteria = bootstrap blok pulau x tahun** (1.000 ulangan, berpasangan). Kabupaten x tahun tetap dilaporkan
   sebagai pembanding, bukan gerbang. Di uji hanya ada 6 pulau x 2 tahun = 12 blok, jadi selangnya lebar; itu
   disengaja (kejadian bergerombol per pulau-musim).
5. **Alarm acak = nilai harapan analitik** per blok dan level (kena = m x e / n), bukan satu tarikan acak.
6. **Pasang ulang final.** Setelah eps dan n_min dipilih di validasi, kenop dipasang ulang pada 2016-2023 dengan
   eps/n_min itu; yang disidik dan diuji adalah kenop final. Angka latih/validasi di berkas memakai kenop yang
   dipasang di latih saja. **FAR relatif:** bila hari kejadian 2024 di sampel < 70% rata 2023 dan 2025, kriteria 4
   memakai dFAR/FAR_sekarang.
7. **Kisi n_min = {80, 160, tak hingga}** (20 dan 40 dibuang: terlalu sedikit untuk satu kabupaten). Pemilihan hiper:
   dFAR terkecil (3 desimal) di antara dPOD >= -0,05, pemutus seri dETS rata-rata tiga level terbesar.
8. **Label wajib** (`ambang_wilayah.json.label`, dibawa ke `validasi.json`): hujan ERA5 sebagai prakiraan sempurna;
   ambang menyerap bias ERA5 dan tidak langsung berlaku untuk hujan produksi (IFS); DIBI kurang lapor. `pakai`
   tetap false; vonis LAYAK pun hanya membuka peninjauan validasi-model, bukan perubahan status otomatis.

Proses latar penunggu DIBI hanya boleh menjalankan `ambil`; `latih` dan `buka` dijalankan tangan.

## Hasil

**Latih dan validasi dijalankan 29 Okt 2026** (39 kab, 104 sel ERA5 lengkap). Uji 2024-2025 BELUM dibuka; `pakai` = false.

- Periksa (a): porsi alarm Waspada yang dipicu `imax` saja = 0,000, jadi kisi iw tetap {20}.
- Periksa (b), orakel in-sample latih: dPOD +0,016, dFAR -0,002, dETS +0,002. Batas atas yang optimistis pun jauh dari
  syarat LAYAK dFAR <= -0,03.
- Latih 2016-2021 dan validasi 2022-2023: aturan per wilayah memberi alarm yang PERSIS sama dengan aturan sekarang (validasi:
  POD 0,529, FAR 0,977, CSI 0,022, ETS 0,011, laju alarm 0,28). Keenam kombinasi eps x n_min memberi selisih nol.
- Kenop final (pasang ulang 2016-2023, eps 0,02, n_min 80): nasional k 0,8; 32 kab k 0,8 (= aturan sekarang), 7 kab k 0,6.

**Kesimpulan: ambang per wilayah tidak memperbaiki aturan.** Pengali ambang H3 bukan tuas yang membatasi; FAR ~0,98 berasal
dari sinyal hujan itu sendiri (lihat RISET-MODEL-KAB.md: model dengan fitur statis dan tanah menaikkan POD Waspada 0,53 -> 0,72
pada jumlah alarm sama). Uji tidak disarankan dibuka: validasi dan orakel sudah menunjukkan selisih nol.
