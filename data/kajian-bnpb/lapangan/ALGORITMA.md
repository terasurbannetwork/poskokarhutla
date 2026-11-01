# ALGORITMA: Pegawai dan Relawan Lapangan

Semua konstanta tinggal di satu tempat: `src/lapangan_konst.js` (server) dan disalin ke klien lewat
`GET /api/petugas/konst`, jadi klien dan server tidak pernah berbeda angka. Angka di bawah adalah nilai awal; yang
bertanda **(kalibrasi)** disetel dari data BNPB sendiri (U1) dan perubahannya dicatat di KEPUTUSAN.

## 1. Pustaka dan model

- Pustaka: `@vladmandic/human` (MIT), versi dipatok, berkas JS dan model disimpan di `public/petugas/model/` (aset statis
  kita, bukan CDN pihak ketiga), di-cache Service Worker.
- Model yang dipakai: detektor wajah BlazeFace, FaceMesh (sudut kepala), FaceRes (vektor wajah), antispoof, liveness.
  Model lain dimatikan supaya unduhan pertama kecil.
- Video kamera depan 640 x 480; bila fps < 10 selama 3 detik, turun ke 480 x 360.
- `versi_model` = string versi Human + nama model vektor; vektor dari versi berbeda tidak dibandingkan (daftar ulang).

## 2. Pendaftaran lima arah

Sudut dari `face.rotation.angle` (radian, diubah ke derajat). Arah tanda yaw dan pitch diverifikasi di uji perangkat
(RENCANA-UJI U-07) karena kamera depan dicerminkan; konstanta `TANDA_YAW`, `TANDA_PITCH` menampung hasilnya.

| Arah | Syarat sudut | Panduan di layar |
|---|---|---|
| depan | abs(yaw) ≤ 8° dan abs(pitch) ≤ 8° | "Hadap lurus ke kamera" |
| kiri | yaw ≤ −22° dan abs(pitch) ≤ 12° | "Toleh pelan ke kiri" |
| kanan | yaw ≥ 22° dan abs(pitch) ≤ 12° | "Toleh pelan ke kanan" |
| atas | pitch ≤ −15° dan abs(yaw) ≤ 12° | "Angkat dagu sedikit" |
| bawah | pitch ≥ 15° dan abs(yaw) ≤ 12° | "Tunduk sedikit" |

Gerbang mutu per frame (semua wajib): satu wajah saja; skor deteksi ≥ 0,80; lebar kotak wajah 30% sampai 75% lebar
video; ketajaman (varians Laplacian pada potongan wajah) ≥ 40; antispoof ≥ 0,50.

Per arah: syarat sudut dan mutu terpenuhi **5 frame berturut-turut**; dari frame yang lolos diambil 3 frame terbaik
(skor deteksi tertinggi), vektornya dirata-rata lalu dinormalkan L2 menjadi **satu vektor per arah**. Batas waktu per
arah 15 detik; lewat batas, arah itu diulang.

Pemeriksaan server saat simpan: kemiripan kosinus tiap vektor arah ke vektor depan ≥ `AMBANG_DAFTAR` = 0,45
(kalibrasi); bila gagal, arah itu diminta ulang (bukan orang lain di tengah pendaftaran).

## 3. Pindai wajah saat absen

1. Server memberi tantangan acak dari {kedip, toleh_kiri, toleh_kanan}.
2. Klien menunggu wajah depan lolos mutu (§2) selama 3 frame, lalu meminta tantangan; tantangan harus terjadi dalam 8 detik:
   - kedip: skor mata tertutup naik di atas 0,6 lalu turun di bawah 0,3 (gestur Human `blink`);
   - toleh: syarat sudut arah kiri atau kanan §2 tercapai 3 frame, lalu kembali ke depan.
3. Sesudah tantangan, satu vektor dari 3 frame depan terbaik (cara §2), skor antispoof dan liveness rata-rata 3 frame itu.
4. Server: `skor_wajah` = kemiripan kosinus tertinggi antara vektor absen dan lima vektor terdaftar.

| Ambang (kalibrasi) | Nilai awal | Arti |
|---|---|---|
| `AMBANG_LOLOS` | 0,60 | di atas: wajah cocok |
| `AMBANG_TINJAU` | 0,45 | di antara: tinjau; di bawah: tinjau dengan tanda "wajah berbeda" |
| `AMBANG_HIDUP` | 0,50 | antispoof dan liveness minimum |

Kalibrasi: sesudah 200 pasang absen yang sudah disahkan peninjau, hitung sebaran skor pasangan sah dan pasangan berbeda
orang; `AMBANG_LOLOS` dipilih agar salah terima ≤ 0,1% dengan salah tolak sekecil mungkin. Hasil masuk KEPUTUSAN.

## 4. Lokasi dan waktu

- GPS: tiga sampel `getCurrentPosition` (highAccuracy, maximumAge 0, jeda 1 detik), dinilai `nilaiGps` yang sudah ada
  (`src/gps.js`): tolak bila jaringan luar Indonesia, VPN/hosting, kurang dari 3 sampel, sampel basi; tandai `gps_curiga`
  bila zona waktu tak cocok, sampel tak bergeser sama sekali, atau kecepatan mustahil.
- Lompatan mustahil antarabsen orang yang sama: kecepatan > 900 km/jam (lebih cepat dari pesawat) → `gps_curiga`.
- Jarak: Haversine titik absen ke titik tugas di server. `dalam_radius` bila jarak ≤ radius + min(akurasi, 200 m).
- Waktu resmi = waktu server saat diterima. `selisih_detik` = waktu HP − waktu server. Daring: abs(selisih) > 300 detik →
  tanda `jam_hp`. Luring: waktu HP diterima bila ≤ 24 jam ke belakang dan ≤ 5 menit ke depan (aturan `relawan_jam`).
- Nonce: daring 1 nonce berumur 5 menit. Untuk luring, saat daring HP menyimpan 6 nonce berumur 36 jam. Tiap nonce
  sekali pakai dan terikat ke orang.

## 5. Keputusan status absen

```
tolak       bila  sha256 foto sudah pernah dipakai  ATAU  nonce tidak sah/terpakai  ATAU  nilaiGps menolak
lolos       bila  wajah terdaftar  DAN skor_wajah ≥ AMBANG_LOLOS  DAN tantangan lolos  DAN hidup ≥ AMBANG_HIDUP
                  DAN tidak gps_curiga  DAN dalam_radius  DAN tidak jam_hp
tinjau      selain itu, dengan daftar alasan (wajah_belum_daftar, wajah_rendah, wajah_berbeda, tantangan_gagal,
                  hidup_rendah, gps_curiga, luar_radius, jam_hp, luring)
```

`luring` sendiri tidak memaksa tinjau bila semua syarat lain lolos dan nonce luring sah. Peninjau mengubah `tinjau` ke
`sah` atau `tolak`; `lolos` dan `sah` sama-sama dihitung hadir.

## 6. Stempel di foto

Dicetak di klien pada foto JPEG (kualitas 0,82, sisi panjang 1.280 px) sebelum dikirim, pita gelap di bawah:

```
Sab, 01 Nov 2026 09:25:06 WIB      (waktu server + selisih jam yang diukur saat nonce diambil)
-0,05793 116,42250  ±8 m
Kec. Kenohan, Kab. Kutai Kartanegara (nama wilayah dari tugas atau pencarian titik di server)
Nama Petugas, Tugas Karhutla Kenohan
```

Stempel hanya tampilan untuk manusia. Kebenaran disimpan di kolom D1. Foto asli dari kamera langsung; `bersihMedia`
membuang metadata sebelum masuk R2.

## 7. Kondisi lapangan menjadi label (F-16)

| Isian | Nilai | Dipakai |
|---|---|---|
| kondisi_api | menyala, bara, padam, bukan_api | label hotspot: titik FIRMS ≤ 1 km dan ≤ 48 jam sebelum isian |
| tebal_gambut_cm | 0 sampai 1.500 | kalibrasi Renlap dan kedalaman lance |
| jarak_air_m | 0 sampai 10.000 | kebutuhan selang Renlap |
| akses | mobil, motor, jalan_kaki, perahu | rute Renlap |
| tinggi_genangan_cm | 0 sampai 500 | label banjir kab-hari dan kecamatan |
| hujan_lokal | tidak, ringan, lebat | pembanding prakiraan hujan |

Label disimpan di tabel `lapangan_label` dengan lokasi dan waktu server; pipeline model membacanya lewat ekspor JSON
harian (DESAIN-TEKNIS §6), bukan membaca D1 langsung.

## 8. Pemilihan relawan untuk panggilan

Kandidat: `relawan.status = siap_tugas`, keahlian beririsan, `prov` sama (atau `luar_provinsi = 1`). Urut: kab sama
dulu, lalu jarak pusat kab domisili ke titik tugas, lalu jam layanan 90 hari terakhir paling sedikit (pemerataan).
Dikirim ke `kuota × 2` kandidat pertama; balasan SIAP diterima sampai kuota terpenuhi.
