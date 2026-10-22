# Replay banjir: Jabodetabek 2-5 Maret 2025

Permintaan pemilik 22 Okt 2026: halaman putar ulang banjir **persis** seperti video "Lagos Flood Replay" (rujukan
30 detik, 1280x720, dibedah bingkai per detik), dengan data nyata. Kejadian pertama: banjir Jabodetabek 3-4 Maret 2025
(Kali Bekasi, Ciliwung). Pengerja: `banjir`. Pemeriksa: `validasi-model` (model), `selera-angka` (angka), `inp-reviewer`
(putar/geser/klik), `security-reviewer` (teks berita disisipkan).

## 1. Bedah video (kontrak tampilan)

Lebar desktop 1280. Latar krem terang (#f6f3ec-an), kartu putih bergaris tipis, teks gelap, angka biru (#1f6fb2-an) dan
oranye (#d97a1f-an). Font sans biasa, kecil.

**Kepala (satu baris, tinggi ~50 px):** ikon tetes biru + judul tebal "Replay Banjir Jabodetabek" | rentang tanggal abu
"2 Mar sampai 5 Mar 2025" | daftar area abu terpotong elipsis | kolom cari bulat "Cari jalan, perumahan, atau tempat"
(hasil: daftar tarik-turun nama + kelurahan, kecamatan) | pil krem-oranye "Model sederhana, bukan prakiraan" | tombol
garis "? Tur".

**Baris chip area (mengambang di atas peta, kiri atas):** "Ringkasan" (aktif = gelap) lalu 5 area; klik = kamera terbang
(pitch ~60, bearing miring) ke area itu.

**Peta (kiri, ~75% lebar, ~65% tinggi):** citra satelit 3D (medan + gedung diekstrusi dari OpenFreeMap `building`,
berwarna krem/oranye pucat bila tergenang), genangan = poligon biru semi-transparan bergaris tepi putih/biru muda, makin
dalam makin pekat. Label tempat huruf kapital putih bergaris gelap. Penanda:
- kartu putih kecil "Genangan terdalam: 130 cm" + "Sel 3 Mar, 16.00, model", menunjuk titik biru;
- kartu "Kampung Melayu: dilaporkan banjir" + "Kompas, 4 Mar" dengan garis kiri merah, menunjuk titik merah (kejadian berita);
- tempat dipin = tiang/garis vertikal oranye dari titik ke atas.
Kontrol kanan bawah: + / - / kompas (kotak putih bulat).

**Panel tempat dipin (kartu putih mengambang kiri atas peta, lebar ~300):** "TEMPAT DIPIN" (oranye kecil kapital) | nama
tebal | kelurahan, kecamatan abu | angka besar biru "27 cm" + "air pada Sel 4 Mar, 10.00" | grafik area kedalaman 4 hari
(garis biru, isian biru muda, garis putus oranye "10 cm", garis waktu vertikal hitam, sumbu hari) | baris kunci-nilai:
Genangan tertinggi "49 cm, Sel 4 Mar, 18.00"; Jam dengan 10 cm atau lebih "65 jam"; Tinggi tanah "11 m di atas laut" |
catatan kecil abu "Perkiraan model untuk petak 60 m di sekitar titik ini. Bukan pengukuran." | tombol gelap "Ke genangan
tertinggi" + tombol garis "Salin tautan". Tombol x tutup.

**Bilah putar (di bawah peta):** tombol bulat gelap putar/jeda | kelompok 1x 2x 4x | jam replay "Sel 4 Mar, 10.00" |
legenda kanan: kotak abu "Hujan", kotak biru "Lahan tergenang", titik merah "Kejadian".
**Linimasa:** lebar penuh, batang hujan per jam abu-biru menggantung dari atas, kurva luas tergenang biru di bawahnya,
pita malam abu muda, titik kejadian berwarna di atas (biru = model, merah = berita), garis waktu hitam berkepala bulat,
label hari di bawah. Bisa diklik/diseret.
**Empat grafik kecil (kartu):** Hujan (mm/jam, abu, garis), Lahan tergenang (km2, biru, isian), Bangunan terendam
(oranye), Muka air Kali Bekasi (m, biru, gelombang); masing-masing angka saat ini di kanan atas dan garis waktu.

**Panel kanan (~25% lebar):** tab Ringkasan | Lapisan | Model.
- Ringkasan: "SAAT INI DI REPLAY" lalu 4 kotak angka: km2 lahan dengan air >= 10 cm (biru), bangunan dengan air di pintu
  (oranye), mm hujan jam ini (biru), m muka air sungai (biru). "KEJADIAN": Tanggal, Area, Hujan dalam data ("x mm dalam 4
  hari, rata-rata area, sesudah pengali"), Puncak model, Penyebab resmi (kutipan lembaga). "KEJADIAN PENTING": daftar
  bertitik (waktu kecil abu + teks), titik biru = model, merah = laporan.
- Lapisan: sakelar citra, gedung, genangan, hujan, kejadian, label.
- Model: metode, asumsi, pengali, sumber data, batas.

Interaksi di video: putar 1x berjalan (jam bergerak, genangan bertambah, angka berubah), klik linimasa melompat, ketik
nama jalan lalu pilih = kamera terbang + panel dipin + tiang, klik peta = pin, "Ke genangan tertinggi" melompat waktu,
chip area terbang. Semua halus (INP: kerja berat di worker, render genangan per jam dari data jadi).

Penyesuaian wajib aturan pemilik: bahasa Indonesia sapaan "kamu", tanpa em dash, tanpa pemisah " · ", format angka
Indonesia (koma desimal), ikon SVG garis. Teks penjelas di video DIPERTAHANKAN karena pemilik minta "persis sama"
(pengecualian A1 khusus halaman ini).

## 2. Data (semua nyata, semua bersumber)

| Bagian | Sumber | Catatan |
| --- | --- | --- |
| Kisi | `SimGenangan.rencanaKisi`, 400 x 400 sel, ~60 m, menutup Bekasi (Jatiasih sampai Bekasi Utara) dan Jakarta Timur (Kampung Melayu, Cawang) | 24 km per sisi |
| DEM | Terrarium AWS (sama dengan medan 3D peta) lewat `ambilDEM(..., ambil)` dengan pembuka PNG Node | SRTM 30 m; tanggul dan saluran kecil tidak terlihat |
| Lahan | `sim_lahan.js` (WorldCover 2021) -> CN dan Manning per sel | |
| Hujan | ERA5 per jam (Open-Meteo archive) di sel 0,25 derajat, dikali pengali agar total cocok dengan alat ukur BMKG di stasiun terdekat | pengali per stasiun ditulis di keluaran; ERA5 Bekasi 71 mm, Bogor 90 mm untuk 2-5 Mar |
| Sungai masuk | Kali Bekasi (gabungan Cileungsi + Cikeas) dan Ciliwung di tepi selatan kisi: hidrograf dari model DAS terkumpul (SCS-CN + hidrograf satuan SCS) memakai hujan DAS hulu yang sama, dikalibrasi waktu puncaknya ke tinggi muka air pos yang diberitakan (Katulampa, Depok, P2C) | GloFAS tidak dipakai: debit harian Kali Bekasi hanya 63 ke 70 m3/dtk, tidak menangkap luapan |
| Gedung | Titik berat `building` OpenFreeMap z14 -> jumlah gedung per sel; "air di pintu" = sel >= 10 cm | sama dengan gedung yang digambar |
| Pencarian | `transportation_name` + `place` OpenFreeMap z14 di kisi -> nama + titik + kelurahan | |
| Kejadian | laporan media dan lembaga dengan waktu WIB, koordinat, kedalaman, sumber (riset terpisah) | |

Precompute di Node (`scripts/banjir/replay.mjs`, memuat `public/banjir/sim_genangan.js` dan `sim_lahan.js` lewat vm,
tanpa salinan mesin): 96 jam, simpan kedalaman per jam hanya untuk sel yang pernah >= 1 cm (indeks + cm uint16), ringkasan
per jam (luas, gedung, hujan area, muka sungai), hmaks dan jam hmaks per sel. Keluaran `public/banjir/data/replay/`.

## 3. Validasi (wajib sebelum tayang)

- Tiap laporan berita berlokasi: kedalaman model di sel itu pada jam laporan; hitung berapa laporan yang model tunjukkan
  >= 10 cm (POD), dan beda kedalaman bila media menyebut angka.
- Puncak dan waktu muka air Kali Bekasi model lawan laporan P2C.
- Angka dampak resmi (kelurahan/RW terdampak) lawan kelurahan yang model genangi.
- Hasil ditulis jujur di tab Model; bila POD rendah, katakan.

## 4. Urutan kerja

1. Pipeline data + precompute + validasi (pengerja `banjir`, `validasi-model` memeriksa).
2. Halaman `public/banjir/replay.html` + `replay.js` + `replay.css`, tab `replay` di registry banjir (`halaman`).
3. Verifikasi browser 1440 dan 390, pemeriksa `selera-angka`, `inp-reviewer`, `security-reviewer`.
