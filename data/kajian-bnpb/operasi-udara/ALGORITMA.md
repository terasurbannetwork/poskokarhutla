# ALGORITMA: Pantauan Operasi Udara

Semua ambang yang belum dijawab pemilik bertanda **[SEMENTARA]** dan bersumber dari `KEPUTUSAN-UDARA.md`.
Tiap rumus murni punya fungsi dengan uji di `RENCANA-UJI.md`.

## 1. Telat lapor (F-1)

```
pertama(pesawat, tanggal) = op_lapor_pertama.pertama   // jam pesan WA PALING AWAL berisi status pesawat itu
pertama(base, tanggal)    = min(pertama pesawat base itu)
batas(base) = tanggal + 07:30 waktu setempat base [SEMENTARA, Q1]
status_lapor = belum        bila tidak ada pertama dan sekarang > batas
             = telat        bila pertama > batas
             = tepat waktu  bila pertama ≤ batas
             = menunggu     bila belum ada laporan dan sekarang ≤ batas
```
`tanggal` di D1 berbasis WIB. Zona waktu per base (tabel tetap, bukan tebakan dari kode provinsi):

| Base | Provinsi | Zona | Selisih dari WIB |
| ---- | -------- | ---- | ---------------- |
| PKY, SMQ, KLP (Kalteng 62), PNK, KTG (Kalbar 61), PLM (16), DJB (15), PKU (14) | Sumatera, Kalbar, Kalteng | WIB | 0 |
| BDJ | Kalsel 63 | WITA | +1 jam |

Base baru wajib ditambahkan ke tabel ini; base tanpa baris tidak diberi status telat.

## 2. Rusak berulang (F-2)

```
tidak_siap_7h(pesawat) = jumlah tanggal dalam [t-6, t] dengan status = tidak_siap
berulang = tidak_siap_7h ≥ 3 [SEMENTARA, Q2]
```
Hari tanpa laporan tidak dihitung sebagai tidak siap.

## 3. Celah jangkauan (bagian F-7)

```
untuk tiap cluster c level 3:
  base_terjangkau(c) = base b dengan jarak(b, c) ≤ radius(b) dan ada armada b berstatus siap/operasi/siaga
  radius(b) = jelajah_nm terbesar armada b × 1,852 km; semua jelajah_nm masih kosong, jadi 200 km [SEMENTARA] (`RADIUS_KM`, public/operasi_peta.js:34)
  celah = base_terjangkau kosong
  usulan = base berarmada siap terdekat, beserta jaraknya
```

## 4. Waktu respons (F-7)

```
deteksi(c) = jam titik panas satelit pertama dari cluster c (FIRMS atau Himawari, yang lebih dulu)
aksi(c)    = aksi armada pertama (patroli atau WB) dengan jarak ≤ 2 km [SEMENTARA, Q10] dari titik mana pun cluster c,
             dalam (deteksi, deteksi + 72 jam]
respons(c) = aksi(c) - deteksi(c)     // menit; kosong bila tidak ada aksi
ringkasan per base/operator = median, p25, p75, jumlah cluster tanpa respons
```
Cluster tanpa aksi tidak diberi angka respons; dihitung terpisah sebagai "belum direspons".

## 5. Hasil dan api muncul lagi (F-10)

Dasar yang sudah ada (`src/operasi_hasil.js`): `masih_api` bila ada titik FIRMS ≤ 1 km dalam [t0, t0+24 jam]; `padam` bila 24 jam lewat tanpa titik.
Tambahan:
```
untuk aksi WB berhasil = padam:
  muncul_lagi = ada titik FIRMS ≤ 1 km dalam (t0+24 jam, t0+72 jam]
  muncul_lagi_utc = jam titik pertama itu
persen padam bertahan = padam tanpa muncul_lagi / dinilai (aksi yang sudah melewati 72 jam)
```
Aksi yang belum lewat 72 jam ditampilkan "padam, pantau sampai <jam>".

## 6. Di luar base dan sinyal hilang (F-9)

```
posisi_terakhir(p) = baris adsb_posisi terbaru yang cocok registrasi p (flight = registrasi tanpa tanda hubung)
di_luar_base = jarak(posisi_terakhir, base p) > 5 km dan umur posisi ≤ 2 jam
sinyal_hilang = status hari ini = operasi dan umur posisi_terakhir > 2 jam [SEMENTARA] dan jam sekarang di dalam batas terang
```
Karena ADS-B diambil sekali per jam dan hanya di 7 lingkaran, "sinyal hilang" adalah penanda periksa, bukan tanda bahaya.

## 7. Batas terang (F-4)

Rumus matahari NOAA (deklinasi dan persamaan waktu) di klien, sudut −0,833° (terbit/terbenam resmi):
```
terbit, terbenam = surya(lat_base, lon_base, tanggal)
sisa_terang = max(0, terbenam - sekarang)
```

## 8. Prakiraan 3–6 jam (F-3)

Per base, prakiraan per jam Open-Meteo: jarak pandang (m), kecepatan dan embusan angin (kt), presipitasi (mm/jam).
Visibility Open-Meteo adalah **keluaran model**, bukan amatan, dan cenderung terlalu optimis saat asap. `kelayakan()` terikat ke METAR (teks mentah, regex angin), jadi dipakai fungsi baru `kelasPrakiraan(vis_m, angin_kt, hujan_mm)` dengan ambang angka yang sama (layak ≥ 5 km dan ≤ 20 kt; tidak layak < 1,5 km atau > 30 kt). Pita prakiraan berlabel "model".
Asap rute (F-5): nilai AOD/PM2.5 CAMS di titik base dan tiap target renlap; kelas "berasap" bila PM2.5 > 150 µg/m³ [SEMENTARA].

## 9. Kepatuhan dan alasan tidak didatangi (F-13, F-14)

```
didatangi(target) = ada aksi armada base itu ≤ 10 km dari target pada tanggal renlap   // sudah dipakai layar
kepatuhan(base) = target didatangi / target
kepatuhan(operator) = target yang didatangi oleh armada operator itu / target renlap di base tempat operator itu punya armada siap pada tanggal itu
// satu target bisa dihitung untuk beberapa operator di base yang sama; angka per operator tidak dijumlah jadi angka base
alasan(target belum didatangi), urutan pertama yang cocok:
  1. tidak ada armada base itu berstatus siap/operasi/siaga  → "Armada base tidak siap"
  2. base belum lapor                                        → "Base belum lapor"
  3. kelayakan base saat itu tidak layak                     → "Cuaca tidak layak terbang"
  4. jarak target > RADIUS_KM base                           → "Di luar jangkauan"
  5. sisanya                                                 → "Tanpa keterangan"
```

Jarak 10 km (didatangi) lebih longgar dari 2 km (respons, §4): renlap menargetkan sel wilayah 0,02° dan patroli melingkar, sedangkan respons mengukur kedatangan di cluster api itu sendiri.

## 10. Liter dan sumber air (F-8)

```
liter(aksi) = op_gerak_hasil.liter bila dilaporkan, kalau tidak drops × bucket_liter [SEMENTARA, Q8, label "perkiraan"]
sumber_air_terdekat = badan air terdekat dari daftar Q9; kosong sampai Q9 dijawab
```

## 11. Hari menganggur (F-21)

```
menganggur(operator) = Σ (hari_siap - hari_siap_yang_terbang) per armada, 30 hari    // dari kpi monitor
biaya menganggur = menganggur × tarif harian (Q7; tidak tampil sebelum ada)
```
