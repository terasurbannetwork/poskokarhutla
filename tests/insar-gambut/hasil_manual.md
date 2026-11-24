# Periksa manual IG-09 (validasi-model, konteks bersih, 24 Nov 2026)

Dasar: `RENCANA-UJI.md` §2 (terkunci), `hasil_lab.json`, `scripts/data/insar_gambut.py --uji` (hijau, T1-T8 dan F).

## Vonis dari angka

- Jendela `api` (satu-satunya dasar vonis): piksel terbakar yang bernilai = 1 dari 754 (0,13%). Syarat `MIN_KOHEREN_PCT` 30 dan `MIN_PIKSEL` 50 tak terpenuhi, kontrol 178 piksel cukup.
- Vonis saya: **`tak_terukur`**. Jendela `pra`, `pasca30`, `pasca90` juga `tak_terukur`; baris `*_tm` hanya eksploratif (tanpa topeng mutu) dan tidak ikut vonis.
- Setuju dengan pengerja. Tidak ada `selaras` atau `meremehkan`, jadi `D_BAWAH, D_ATAS` di `gambut_bara.py` tetap literatur (gerbang IG-08 butir 1 terpenuhi). Semua `dh_cm`, `d_insar_*`, `kepekaan` bernilai `null`, bukan 0.

## Temuan

1. Salah angka di `hasil_lab.md` baris uji sebab (a): "laju gradien tetangga sekitar 42 mm/thn". λ/4 = 1,39 cm per 12 hari = 1,39 x 365/12 = 42,3 cm/thn = **sekitar 422 mm/thn**, bukan 42 (selisih 10x). Berkas sendiri memakai batas wajar 400 mm/thn (`SAH_MM`). Fix: ganti jadi "sekitar 420 mm/thn (42 cm/thn)". Tidak mengubah vonis.
2. Kalimat dekorelasi (b) "bukan khusus api" terlalu lunak. Angka sendiri: unwrapping valid terbakar 0,13% (1/754) lawan kontrol cincin 4,52% dan gambut tak terbakar 3,72%. Terbakar 30 sampai 35 kali lebih sering hilang dari gambut yang tak terbakar. Itu searah dengan dekorelasi akibat api (sebab b/c), tetapi tetap tak bisa dipisah dari efek topeng (valid Sentinel-2 pasca hanya 28,7%, 754 piksel adalah batas bawah) dan dari 1 piksel sampel. Fix: tulis kedua angka berdampingan dan "tidak dapat dipisah", bukan "bukan khusus api".
3. Kecil: `vonis()` punya keluaran ketiga `di_luar_kriteria` (selang bawah > 51 cm) yang tidak ada di tabel §2. Tak terpicu di lab ini. Fix: tambahkan ke §2 lewat pemilik, atau catat di CATATAN.

## Pemeriksaan lain (bersih)

- Uji sebab: (a) λ/4 = 5,55/4 = 1,39 cm cocok; porsi berisiko terbakar 0% (1 piksel, tak bermakna, ditulis "tidak dapat diuji"), kontrol 0% dan 5,05%. (c) oksidasi tidak dapat diuji karena pasca30 dan pasca90 tak punya piksel terbakar; tertulis begitu, tidak dibaca sebagai "tidak ada oksidasi".
- Label: `tak terukur` konsisten, tidak jadi 0. Penyimpangan musim 2023 dan bingkai berakhir 23 Jan 2026 (bukan Jul-Sep 2026 seperti D3) tertulis di `catatan` dan bagian "Batas lab ini". Vonis dibatasi untuk kotak, musim, bingkai ini.
- Kebocoran dan pemilihan wilayah: topeng terbakar dari Sentinel-2 dNBR (ambang `luas_citra.py` 0,27 dan 0,2), bebas dari LOS InSAR. Kotak dipilih dari hotspot VIIRS, bukan dari nilai InSAR. Kontrol hanya di gambut, tak terbakar (<=2%), cincin 2 sampai 20 km. Tidak ada penyetelan ambang memakai hasil. Kriteria §2 sudah ada sebelum lab dan `0944468f9` mengunci sesudah Q6 diterima. Satu catatan: kontrol yang selamat adalah gambut koheren (bias seleksi), tertulis di berkas.
- Pembanding Geoaccess 1,26 cm dilabeli tak dibuka sumbernya; klaim "dispersi kontrol 1,4 cm" cocok p10 -0,49 sampai p90 0,95.
- Berkas lab (`insar_gambut.py`, `hasil_lab.*`, `tests/insar-gambut/`) masih belum di-commit.

## Kesimpulan

Vonis sama dengan pengerja. Tiket IG-09 boleh ditutup setelah temuan 1 dan 2 diperbaiki di `hasil_lab.md` (teks saja, tanpa angka vonis).
