# Misi Udara dan pemicu data

Halaman ini menjelaskan metode rute misi udara dan pemicu serta alur datanya.

## Misi Udara: rute urut tetap

Mesin: `scripts/umum/misi_udara.py`. Satu mesin untuk semua bencana (tidak ada `renlap_<bencana>.py`).

**Membaca titik** (`baca_titik`, `:315`), urut, berhenti di yang pertama berhasil: koordinat desimal "lat, lon" (wajib koma atau titik koma diikuti spasi); DMS; tautan Google Maps panjang (ambil `!3d<lat>!4d<lon>`, atau `@<lat>,<lon>`); tautan pendek `maps.app.goo.gl` hanya bila opsi `--buka-tautan` diberikan (alamat titik terkirim ke Google; Worker tidak pernah membuka tautan); plus code penuh. Plus code pendek hanya diterima bila disertai titik acuan dalam 50 km (bawaan sementara). Lintang harus antara -11,5 dan 6,5, bujur antara 94,5 dan 141,5. Nama tempat tanpa koordinat ditolak.

**Rute** (`hitung`, `:405`): untuk tiap pasangan berurutan (base awal, titik 1..n, base akhir): jarak lingkaran besar (haversine), haluan sejati awal, waktu = jarak / kecepatan.

```
menit_leg = km / v x 60
waktu terbang total = jumlah menit_leg   (waktu di titik dicetak terpisah, tidak dijumlahkan ke waktu terbang)
v = --kecepatan, atau kecepatan jelajah tipe (AW139 306, Bell 412EP 226, AS332 L1 247, Mi-171A2 260 km/jam),
    atau 200 km/jam bila tipe tidak dipilih
v harus di antara 20 dan 600 km/jam; titik maksimal 30
leg dengan jarak < 0,05 km dicetak tanpa haluan; haluan 0 ditulis 360
```

Angka kecepatan tipe adalah angka umum dari sumber sekunder (keyakinan B), belum dari operator (Q2). Urutan titik tidak pernah diubah mesin (K1).

**Waktu di titik per misi** (`misi_templat.json`): dropping dengan pendaratan wajib diketik staf; dropping lempar rendah 2 menit per titik; pantau 2 menit orbit per titik (dapat diganti); evakuasi, angkut, kunjungan wajib diketik; cari dari pola pencarian (belum dibangun). Angka 2 menit adalah bawaan sementara yang mengikuti `ORBIT_MNT` renlap karhutla.

**Pemeriksaan keluaran:** `periksa_keluar` (`:644`) menolak `--keluar` di dalam `public/`; untuk kunjungan juga menolak penyimpanan di dalam repositori. Bawaan keluaran: folder di luar repositori. Misi kunjungan tidak mengunduh ubin peta kecuali `--citra` (area tidak dikirim ke server ubin). Jam berangkat di luar 06.00 sampai 18.00 setempat dicetak sebagai perhatian (Q15, tidak ditolak).

**Batas dan angka yang masih berlabel S (sementara):** `scripts/umum/batas_terbang.json` memuat tiap angka dengan `nilai`, `satuan`, `sumber`, `keyakinan` (A resmi, B sekunder, S sementara dengan nomor Q). `periksa_batas` (`:76`) menolak baris tanpa sumber, keyakinan C, dan keyakinan S tanpa nomor Q. Contoh angka berkeyakinan S yang sudah ada di berkas tetapi belum dipakai karena zona belum dibangun: penyangga 5 km di luar radius gunung api (Q4), jarak periksa gunung Level II ke atas tanpa radius 30 km dan Level I 15 km (Q16), siklon 300 km (Q16), batas basi data (gunung api 48 jam, abu 12 jam, tsunami 6 jam, siklon 12 jam, banjir dan longsor 24 jam, METAR 3 jam; Q17), cadangan bahan bakar 30 menit (Q3), kelonggaran belokan 1,05 kali jari-jari (Q17). Angka syarat lapangan pendaratan berkeyakinan A dari NWCG PMS 510 edisi Mei 2019 (standar kebakaran hutan Amerika Serikat; edisi 2023 belum dicek): bidang darat ringan 4,6 m, sedang 6 m, berat 9 m; lingkaran bebas halangan 23, 27, dan 33,5 m (minimal 1,5 kali diameter rotor); kemiringan maksimal 6 derajat. Daftar ini dicetak sebagai daftar periksa untuk tim darat, bukan penilaian mesin atas lapangan.

**Yang direncanakan dan belum ada di kode** (lihat Batasan): zona gunung api, abu, tsunami, cuaca; belokan menghindari lingkaran larangan (jari-jari kali 1,05, dua titik singgung, status "dibelokkan" atau "perlu diputuskan orang"); pemeriksaan daya tahan dan saran isi ulang; pola pencarian kotak melebar dan lintasan sejajar; kelayakan terbang dalam Python.

## Pemicu dan alur data

![Alur data Operasi: lima sumber masuk ke D1 dan R2, dibaca lewat rute API ke layar Operasi (sumber: berkas dan rute di bagian Referensi teknis).](gambar/operasi-alur-data.svg)
