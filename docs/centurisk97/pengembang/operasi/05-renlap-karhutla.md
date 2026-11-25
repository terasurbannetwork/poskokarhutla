# Renlap karhutla dan efektivitas

Halaman ini menjelaskan metode renlap udara karhutla dan ukuran efektivitas M1 sampai M11.

## Renlap udara karhutla (target patroli dan water bombing)

Mesin: `scripts/operasi/renlap.py`. Dijalankan pemicu di Mac mini (`scripts/wa/renlap_jam.mjs`): versi malam jam 20.00 sampai 24.00 WIB dan versi pagi jam 07.00 sampai 12.00 WIB, sekali sehari, **mati bawaan** (aktif bila env `RENLAP=1`). PDF bergambar dikirim ke pemilik saja, tidak ke grup WhatsApp (K2). Keluaran: `public/data/operasi/renlap_<tanggal>_<versi>.json` dan `.txt`, serta kiriman ke Worker (`POST /api/operasi/renlap`, `scripts/operasi/renlap.py:505`).

Masukan: titik panas 72 jam (`public/data/hotspot72.json`, atau `/api/titik` bila berkas lebih tua dari 72 jam), temuan pilot (via `/api/operasi/temuan`), FFMC kekeringan bahan bakar, poligon gambut, desa OSM, prakiraan PM. Seluruh bobot di `scripts/operasi/bobot_renlap.json` berlabel **HIPOTESIS** (aturan tangan, belum diuji balik); penalaan ulang direncanakan dari metrik M1 setelah 14 hari data.

Langkah (`kandidat`, `scripts/operasi/renlap.py:279`):

1. Buang titik panas yang berjarak 1 km atau kurang dari temuan `clear` yang lebih baru. Titik yang lebih baru dari `clear` dipertahankan dengan pengurang bobot.
2. Kelompokkan titik ke sel 0,02 derajat.
3. Skor tiap sel (nilai bobot dari JSON):

```
skor = 2,0 x min(titik_baru, 5)          # titik dalam 6 jam terakhir dari titik terbaru
     + 1,5 x min(hari_berturut, 6)       # sel menahun berapi
     + 3,0 bila di gambut
     + 2,0 x clamp((FFMC - 80) / 15, 0, 1)   # hanya bila data FFMC tidak lebih tua dari 3 hari
     + 2,0 bila permukiman dalam 2 km
     + 1,5 bila belum ada temuan pilot berapi dalam 1 km ("belum ditangani")
     - 2,0 bila ada clear lama tetapi muncul titik baru
sel masuk bila skor >= 0,1
```

![Grafik batang sumbangan maksimum tiap komponen skor sel renlap, berlabel hipotesis; sumber scripts/operasi/bobot_renlap.json.](gambar/operasi-bobot-renlap.svg)

4. **Water bombing** (`pilih_wb`, `:369`): paling banyak 3 lokasi dari temuan pilot 48 jam berstatus FS, berasap (bobot 3), atau berasap tipis (bobot 1), kecuali sudah di-clear sesudahnya, dalam radius jelajah. Skor = bobot status + min(luas klaim, 10) / 5 + skor sel terdekat. Lokasi dipilih berurutan dengan jarak antarlokasi lebih dari 1 km.
5. **Patroli** (`pilih_cakupan`, `:353`): rakus menurut cakupan, bukan skor tertinggi saja. Tiap langkah memilih sel yang menambah skor terbesar dari sel yang belum terlihat dalam radius pandang 6 km; berhenti di 8 target atau saat tidak ada sel tersisa. Sel yang tidak terlihat dicatat di `di_luar_rute`. Urutan rute: tetangga terdekat dari base.
6. Radius jelajah renlap = 120 Nm (sekitar 222 km), bawaan karena `jelajah_nm` belum diisi (`batas.jelajah_nm_bawaan`). Radial dan jarak VOR dihitung dengan deklinasi timur tetap 0,5 derajat (perkiraan, bukan model magnet dunia).

Aturan peran: base dengan armada berperan `wb` atau `patroli_wb` mendapat target water bombing; base berperan selain `wb` murni mendapat target patroli. Sumber air untuk water bombing: `scripts/operasi/sumber_air.py` mengambil badan air OpenStreetMap (danau, waduk, sungai, danau tapal kuda, laguna) berluas kotak batas minimal 4 hektare (dikali 0,5 sebagai perkiraan bentuk tak beraturan) lewat Overpass; hasilnya `public/data/operasi/sumber_air.json` (radius yang tercatat saat ini 120 km). Kolom `panjang_m` dan `lebar_m` adalah sisi panjang dan pendek kotak batas, berlabel perkiraan.

Status uji balik: **belum diuji** (hipotesis).

## Efektivitas M1 sampai M11

Dihitung murni di `src/operasi_nilai.js` (`hitungNilai`, baris 79) untuk tujuh hari. Metrik dengan penyebut kurang dari 5 (`MIN_N`) diberi `nilai: null` dan catatan "data kurang"; kejadian tetap dihitung di `n` dan `jumlah`. Metrik M5, M8, M9, M10 bernilai null dengan alasan "data belum tersedia".

| Kode | Nama | Rumus ringkas | Arah baik |
| --- | --- | --- | --- |
| M1 | Ketepatan target | temuan pilot yang bukan `clear` dibagi semua temuan | tinggi |
| M2 | Kepatuhan renlap | target renlap yang ada temuan dalam 1 km pada hari yang sama dibagi semua target | tinggi |
| M3 | Temuan di luar renlap | temuan yang tidak dekat target renlap mana pun dibagi temuan pada hari yang punya renlap | rendah |
| M4 | Padam bertahan | temuan `clear` tanpa titik panas dalam 1 km selama 48 jam sesudahnya dibagi temuan `clear` yang jendela 48 jamnya tertutup data titik panas | tinggi |
| M6 | Utilisasi armada | pesawat-hari berstatus siap, operasi, atau siaga yang punya sortie berangkat dibagi semua pesawat-hari siap | tinggi |
| M7 | Waktu respons | median menit dari temuan berasap berjam ke sortie water bombing pertama dalam 24 jam yang menuju 1 km atau kurang (atau berrujukan registrasi pelapor) | rendah |
| M11 | Heli siaga tanpa tugas | armada-hari siaga atau siap tanpa sortie pada hari ada temuan berasap dalam 120 Nm dari base, dibagi armada-hari siaga atau siap pada hari yang sama | rendah |

Renlap per (tanggal, base) yang dinilai adalah versi pagi bila ada, selain itu malam. Temuan tanpa jam tidak masuk M7. Temuan `clear` tanpa jam memakai akhir hari WIB sebagai awal jendela M4. Satu temuan tanpa respons dihitung di `tanpa_respons` dan tidak diberi angka menit.

Status uji balik: tidak ada; metrik adalah ukuran kinerja, bukan model prediksi.
