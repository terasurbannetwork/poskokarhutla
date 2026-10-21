# Laporan Karhutla Otomatis: alur, SOP, dan form

Status: rancangan 21 Okt 2026. Sumber analisis: Laporan Penanganan dan Pengendalian Karhutla 21 Okt 2026 (29 slide),
Laporan Kejadian Bencana Harian 20–21 Okt, laporan WA ke Mensesneg dan Kepala BNPB (karhutla, gelar armada,
dry ice, hasil OMC, BMKG PM2.5, PVMBG, Dit. Koordalops), dan pesan personel Kalteng 16.387.

## 1. Masalah yang dipecahkan

Laporan hari ini disusun dengan menyalin angka dari WA dan rekap tiap provinsi. Akibatnya:

- Angka yang sama berbeda antarlaporan (Kalteng tertulis 4.686 personel di laporan 20 Okt, lalu 16.387 di laporan 21 Okt).
- Luasan bisa terhitung ganda: rekap provinsi dan rincian subsatgas Sumsel tidak sama, dan Kalbar memakai "luasan
  kumulatif, jangan dijumlahkan".
- Data provinsi yang belum masuk dibawa diam-diam dari hari sebelumnya (sisa TNTP 18 Okt dipakai di laporan 20 Okt).
- Satu kejadian dicatat dua kali lintas provinsi (sortie PK-SNK dicatat di Kalteng dan Kalsel).
- Kalimat laporan WA, slide, dan dashboard diketik terpisah.

Prinsipnya: **satu data, satu kali diinput, oleh pemilik datanya**. Laporan WA, slide PPTX/PDF, dan dashboard dibangkitkan
dari data yang sama. **Laporan tidak bisa dikunci dan diunduh sebelum semua sumber wajib mengirim**, kecuali verifikator
menyatakan "lanjut tanpa X", dan pernyataan itu tercetak di laporan.

## 2. Siapa mengisi apa

| Bagian laporan | Sumber | Cara masuk |
| --- | --- | --- |
| Hotspot per provinsi, tren 7 hari, % di konsesi dan gambut, riwayat 1997–2026, konsesi terindikasi (B1–B5) | Satelit FIRMS, peta konsesi dan gambut | **Otomatis** (pipeline situs) |
| PM2.5 per stasiun | BMKG | **Otomatis** bila umpan tersedia, kalau tidak diisi Pusat (BMKG) |
| Status gunung api | PVMBG | **Otomatis** (data gunung api situs) |
| Fire spot (FS): lokasi, target ha, padam darat, padam udara, sisa, kawasan (mis. TNTP) | **Daerah**: Satgas/Pusdalops BPBD Provinsi | Form harian provinsi; baris FS terisi dari tugas api yang dikonfirmasi akun pemkab, kodim, dan polres |
| Personel per unsur (BPBD, TNI, Polri, Manggala Agni, MPA, Swasta, Relawan, Pemda, Kehutanan) dan pola shift | Daerah (BPBD Provinsi menghimpun dari Kodam, Polda, dan Manggala) | Form harian provinsi, hanya diubah bila ada perubahan |
| Peralatan dan dukungan khusus | Daerah | Form provinsi (stok tetap + tambahan hari ini) |
| Kondisi wilayah: kualitas udara per kab/kota, jarak pandang, sekolah, penerbangan, ISPA, hujan | Daerah | Form provinsi, ISPU terisi dulu dari BMKG |
| Hambatan dan upaya | Daerah | Form provinsi (pilihan tetap + teks) |
| Status kedaruratan provinsi | Daerah | Form provinsi (jenis + TMT + s.d.) |
| Armada udara per provinsi, water bombing (heli, sortie, jumlah bom, liter, padam ha), patroli udara | **Pusat**: Satgas Udara BNPB | Form pusat "Operasi udara" |
| OMC: pesawat, sortie, bahan (NaCl/dry ice, kg), sasaran, hasil hujan, PM2.5 sebelum dan sesudah, jarak pandang | **Pusat**: Kedeputian/Posko TMC + BMKG | Form pusat "OMC" |
| Karhutla di luar provinsi prioritas, kejadian bencana harian lain | **Pusat**: Dit. Koordalops | Form `/laporan-bnpb` harian yang sudah ada |
| Provinsi prioritas masuk/keluar | Otomatis (aturan hotspot 3 hari), ditetapkan Pusat | Usulan otomatis, verifikator menyetujui |
| Kesimpulan dan arahan | Pusat (verifikator) | Kalimat otomatis dari angka, bisa disunting |

Kab/kota tidak wajib mengisi form provinsi. Kontribusinya masuk lewat **tugas api** (konfirmasi foto GPS, tindakan,
padam ha), yang otomatis menjadi baris FS di form provinsinya. BPBD provinsi tinggal memeriksa, melengkapi, lalu mengirim.

## 3. Alur harian (WIB)

```
07.00  Cut-off data (pantauan 24 jam hari sebelumnya)
07.00  Sistem mengisi otomatis: hotspot, PM2.5, gunung api, konsesi, baris FS dari tugas api
07.00–09.00  Daerah mengisi dan mengirim form provinsi          (status: draf -> terkirim)
07.00–09.30  Pusat mengisi Operasi udara dan OMC               (status: draf -> terkirim)
09.00  Batas daerah. Yang belum mengirim tampil merah, tombol tagih WA ke PIC provinsi
09.30–10.00  Verifikator pusat: baca hasil cek otomatis, minta perbaikan atau setujui per sumber
10.00  Kunci laporan -> PPTX, PDF, teks WA, dan dashboard pimpinan terbit serentak
```

Status laporan hari H:

| Status | Arti | Unduh |
| --- | --- | --- |
| Belum lengkap | ada sumber wajib belum terkirim | pratinjau saja, berlabel DRAF |
| Lengkap | semua sumber wajib terkirim, menunggu verifikasi | pratinjau berlabel DRAF |
| Dikunci | verifikator menyetujui | PPTX, PDF, teks WA |
| Dikunci dengan pengecualian | dikunci dengan "lanjut tanpa X" | ya, dengan catatan "Provinsi X: data terakhir <tanggal>" di slide dan teks |

Data yang dibawa dari hari sebelumnya **tidak pernah diam-diam**. Selalu tertulis "data terakhir 18 Okt".

## 4. Cek otomatis (rekonsiliasi) sebelum kunci

Pelanggaran **merah** menahan kunci. Pelanggaran **kuning** cukup dibaca verifikator.

- Merah: padam > target per FS; sisa ≠ target − padam (selisih > 0,01 ha); FS tanpa kab/kota; total provinsi ≠ jumlah baris FS.
- Merah: satu sortie OMC atau WB tercatat di dua provinsi tanpa tanda "lintas provinsi" (dihitung sekali di total nasional).
- Kuning: sisa kemarin + FS baru − padam hari ini ≠ sisa hari ini (luasan baru atau koreksi wajib diberi alasan).
- Kuning: personel berubah > 50% dari kemarin (contoh 4.686 jadi 16.387) wajib diberi keterangan, mis. "termasuk shift dan standby".
- Kuning: luasan kumulatif dilarang masuk kolom harian (centang "kumulatif" memindahkannya ke kolom keterangan).
- Kuning: hotspot naik > 100% tetapi FS tidak bertambah.
- Kuning: water bombing dilaporkan "padam" di lokasi yang tugas apinya masih "menyala" dengan bara ≥ 30 cm (heli tidak memadamkan bara gambut).

## 5. Keluaran

1. **Paparan Penanganan dan Pengendalian Karhutla** (PPTX dan PDF): halaman utama 1–3 dan lampiran A1–A11 serta B1–B5,
   bentuk sama dengan laporan 21 Okt.
2. **Laporan Kejadian Bencana Harian** (PPTX dan PDF): mesin `/laporan-bnpb` yang sudah ada.
3. **Teks WA siap salin**: Laporan Karhutla (Mensesneg), Gelar pesawat dan helikopter, Rekap dry ice OMC, Hasil
   pemantauan hujan pasca-OMC, PM2.5 BMKG, gunung api PVMBG. Format tebal dan miring WA sama dengan sekarang.
4. **Dashboard pimpinan**: kartu nasional, tabel provinsi tiga hari, peta FS, kelengkapan laporan per sumber, dan
   tugas api terlambat.

## 6. SOP ringkas per peran

**Operator Pusdalops BPBD Provinsi (akun pemprov)**
1. 07.00 buka `/instansi`, tab Laporan harian. Form sudah terisi angka kemarin, hotspot satelit, dan baris FS dari tugas api.
2. Perbarui tiap FS: padam darat, padam udara, sisa terhitung otomatis. Tambahkan FS yang belum ada di tugas api.
3. Perbarui personel per unsur bila berubah, isi kondisi wilayah, hambatan dan upaya, serta status kedaruratan.
4. Baca cek otomatis di bawah form. Merah wajib dibetulkan, kuning wajib diberi keterangan.
5. Kirim paling lambat 09.00. Koreksi setelah terkirim membuka ulang status "perlu verifikasi ulang".

**Satgas Udara BNPB**: isi armada per provinsi dan pemiliknya, WB per heli (sortie, jumlah bom, liter, lokasi, padam ha),
patroli per pesawat (durasi, temuan FS dan ha), dan alasan tidak terbang (visibilitas, pemeliharaan, siaga).

**Posko TMC**: isi per sortie pesawat, bahan (NaCl atau dry ice), kg, sasaran kab/kota, ketinggian, jam, dan tanda
lintas provinsi. Hasil hujan dan perubahan PM2.5 atau jarak pandang diisi bersama BMKG. Teks selalu memuat kalimat
"kesesuaian lokasi hujan dengan sasaran belum membuktikan sebab-akibat".

**Dit. Koordalops**: tetap memakai `/laporan-bnpb` harian. Kejadian karhutla di luar provinsi prioritas otomatis
masuk ke lampiran A11.

**Verifikator pusat**: baca kelengkapan dan cek otomatis, kembalikan ke pengirim dengan catatan atau setujui per
sumber, lalu kunci. "Lanjut tanpa X" wajib beralasan dan tercetak di laporan.

## 7. Sistem input dan pengolahan data

### 7.1 Dua tanggal, tidak boleh tertukar

- `tanggal_laporan` (D): hari laporan dikunci, mis. 21 Okt.
- `tanggal_data` (D−1): pantauan 24 jam yang dilaporkan, mis. 20 Okt, cut-off D pukul 07.00 WIB.
Setiap angka di layar, slide, dan teks WA menyebut salah satunya secara eksplisit. Laporan 21 Okt hari ini memakai
keduanya bergantian di slide yang sama.

### 7.2 Satuan data

| Satuan | Isi | Kunci |
| --- | --- | --- |
| **Hari laporan** | status (belum lengkap, lengkap, dikunci, dikunci dengan pengecualian), pengecualian beralasan, snapshot terkunci | `tanggal_laporan` |
| **Kiriman** | satu per sumber per hari: `prov:62`, `udara`, `omc`, `koordalops`. Status draf, terkirim, dikembalikan, disetujui. Isi = JSON tervalidasi spek | `(tanggal_laporan, sumber)` |
| **Versi kiriman** | tiap simpan dan kirim menambah versi (tidak menimpa): pengisi, waktu, isi, hasil cek | `(tanggal, sumber, versi)` |
| **Fire spot (FS)** | identitas tetap lintas hari `FS-62-20261019-007`, tertaut ke `tugas_id` bila berasal dari tugas api. Per hari: target, padam darat, padam udara, sisa, kawasan, kab/kec, koordinat, tanda kumulatif | `fs_id` + `tanggal_laporan` |
| **Sortie udara** | satu baris per pesawat per sortie: registrasi, jenis (WB, patroli, OMC), provinsi (bisa lebih dari satu, ditandai lintas), bom, liter, padam ha, durasi, bahan, kg, sasaran, alasan tidak terbang | registrasi + jam mulai |
| **Snapshot** | semua angka yang dipakai slide, teks WA, dan dashboard, dihitung sekali saat kunci, lalu dibekukan dengan hash | `tanggal_laporan` + nomor ralat |

FS memakai identitas tetap supaya sistem tahu sisa kemarin (FS yang sama) dan bisa membuktikan
sisa kemarin + FS baru − padam = sisa hari ini. Tanpa identitas tetap, angka antarhari tidak bisa direkonsiliasi.

### 7.3 Alur pengolahan

1. **Siapkan draf (cron 07.00 WIB).** Tiap provinsi prioritas mendapat draf berisi:
   - FS kemarin yang sisanya > 0, dengan kolom padam hari ini dikosongkan;
   - FS baru dari tugas api yang dikonfirmasi `api_ada` sejak cut-off kemarin, lengkap dengan luas dan padam dari kabar tindakannya;
   - hotspot satelit per provinsi (D−1) dan ISPU BMKG terakhir;
   - personel, peralatan, dan status darurat disalin dari kiriman kemarin, ditandai "belum diperbarui".
   Draf pusat (udara, OMC) berisi armada kemarin.
2. **Isi (peramban).** Validasi langsung memakai modul spek yang SAMA dengan Worker (pola `meja_spek.js`): angka gaya
   Indonesia, sisa dihitung sendiri, cek merah/kuning tampil per baris saat diketik. Simpan otomatis tiap perubahan
   sebagai draf. Antrean luring bila sinyal hilang. Kiriman memakai `klien_id`, jadi kiriman ulang tidak menggandakan.
3. **Kirim (Worker).** Worker memvalidasi ulang di batas kepercayaan (peramban tidak dipercaya), menghitung cek, lalu
   menyimpan versi baru. Konflik dua operator di provinsi yang sama ditolak 409 dengan nomor versi terakhir (penguncian
   optimistis), bukan saling menimpa.
4. **Verifikasi.** Verifikator menyetujui atau mengembalikan per kiriman, dengan catatan. Kiriman yang dikoreksi
   setelah disetujui kembali ke "perlu verifikasi ulang".
5. **Kunci.** Satu fungsi agregasi membaca kiriman yang disetujui dan menghasilkan snapshot:
   - total nasional dan per wilayah (Kalimantan, Sumatera);
   - tiga hari terakhir dari snapshot sebelumnya, bukan dihitung ulang;
   - sortie lintas provinsi dihitung sekali;
   - FS kumulatif tidak dijumlahkan ke kolom harian.
   Snapshot dibekukan beserta hash-nya. Koreksi setelah kunci menjadi **Ralat-1, Ralat-2**, lengkap dengan daftar
   angka yang berubah, dan laporan lama tetap bisa dibuka.
6. **Terbitkan.** Mesin slide `/laporan-bnpb` (PPTX dan PDF di peramban), templat teks WA, dan dashboard HANYA membaca
   snapshot. Tidak ada angka yang diketik ulang di tahap ini.

### 7.4 Hak akses

| Peran | Akun | Boleh |
| --- | --- | --- |
| Operator provinsi | pemprov (aktif) | isi dan kirim kiriman provinsinya saja |
| Pemkab, kodim, polres | akun kabupaten | tidak mengisi laporan; data tugas apinya masuk otomatis ke draf provinsi |
| Satgas Udara, Posko TMC | admin berperan `udara` / `omc` | isi kiriman pusat masing-masing |
| Verifikator | moderator (`modOK`) | setujui, kembalikan, kunci, lanjut tanpa X, ralat |
| Pimpinan | admin baca | dashboard dan unduhan |

Semua perubahan tercatat di jejak (siapa, kapan, versi). Jejak tidak bisa dihapus dari layar.

### 7.5 Pembuktian

- Uji integrasi yang memutar ulang laporan nyata: masukkan angka per provinsi 20 Okt (data laporan 21 Okt), lalu
  snapshot WAJIB menghasilkan target ±983,34 ha, padam ±502,08 ha, belum padam ±481,26 ha, dan 261 FS. Kalteng wajib
  memisahkan di luar TNTP (74,77/58,31/16,46) dan TNTP (356,89/52,00/304,89).
- Uji sortie lintas provinsi (PK-SNK Kalteng dan Kalsel) yang dihitung sekali di total nasional.
- Uji kunci ditolak selama ada kiriman wajib belum disetujui, dan diterima dengan "lanjut tanpa X" yang tercetak.
- Uji ralat: snapshot lama tidak berubah.

## 8. Batas yang sengaja dipegang

- Tidak ada kiriman otomatis keluar. Tagih WA dan teks laporan disalin atau ditekan manusia.
- Angka satelit dan angka lapangan tidak pernah dicampur dalam satu kolom. Hotspot selalu berlabel "GIS/satelit".
  Luas FS selalu dari lapangan.
- Nama perusahaan di lampiran B hanya di laporan berotorisasi, tidak di halaman publik.
