# DESIGN-SYSTEM: Simulasi tsunami dengan genangan darat

Token dari `public/inti/tema.css`; palet lokal haram (gerbang `gerbang-token-warna`). Tampilan dasar tab Simulasi (label T + menit, legenda meter, riak kontras) sudah dirapikan terpisah (K2) di `public/gempa/sim.css` dan `sim.js`; dokumen ini hanya menambahkan lapisan genangan. Teks lewat skill `bahasa-indonesia-plain`: tanpa huruf kapital semua, tanpa titik tengah sebagai pemisah, tanpa tanda pisah panjang di teks tampil, tidak pernah menulis "aman". Kartu mengikuti AGENTS 3.5: kepala berupa nama seksi berikon, tanpa kalimat kesimpulan, tabel menempel penuh.

## 1. Komponen baru (awalan `.tg-` dipakai tangga; modul ini memakai `.gn-`)

| Komponen | Isi | Catatan |
| --- | --- | --- |
| `.gn-pilih` | deretan pantai yang sudah dihitung, ujung ke ujung, rata, berikon | mengikuti memori "deretan pilihan ujung ke ujung"; satu pil per pantai, status warna dari token |
| `.gn-peta` | lapisan raster genangan di atas peta tab Simulasi | satu gambar per pantai, piksel tidak dihaluskan agar sel terbaca; transparan di sel kering |
| `.gn-legenda` | skala kedalaman 0 sampai 8 m dengan langkah tertulis, kelas "lebih dari 8 m", dan kotak "kering pada simulasi" | skala satu rona yang menggelap (bukan pelangi); angka tertulis di legenda; warna dari token |
| `.gn-label` | pil tingkat dan status: "skenario terdekat" atau "dihitung untuk gempa ini", dan "hipotesis" atau "teruji pada n kejadian" | selalu tampil di atas peta genangan dan dalam gambar bagikan bila nanti ada (Q16); pil hipotesis memakai token peringatan, bukan hijau |
| `.gn-angka` | luas tergenang, persen beserta pembaginya, kedalaman maksimum, waktu tiba pertama | angka besar di atas, pembagi kecil di bawah; format `public/inti/format.js` |
| `.gn-runup` | titik run-up di peta dan tabel titik | titik terukur dan titik hitung berbeda bentuk (bukan hanya warna) |
| `.gn-batang` | batang run-up historis per lokasi: sumbu tahun, tinggi tertulis di ujung batang, hasil simulasi sebagai garis pembanding | angka tertulis di batang (A8); tanpa data = "tidak ada data run-up tercatat di sini" |

## 2. Peta

- Batas kotak halus digambar sebagai garis tipis dengan label "kotak hitung"; di luarnya tertulis "belum dihitung".
- Peta bergerak ke kotak saat pantai dipilih; tombol kembali ke tampilan pulau.
- Animasi: kontrol putar dan geser waktu yang sudah ada; label "T + N menit" mengikuti geser. Geser tidak boleh membekukan layar (INP): bingkai di-decode di luar utas klik dan raster ditaruh dengan satu pembaruan.

## 3. Teks yang tampil

| Tempat | Teks |
| --- | --- |
| Label status | "hipotesis" atau "teruji pada 3 kejadian" |
| Label tingkat | "skenario terdekat, M 8,5, selisih 0,2 M" atau "dihitung untuk gempa ini" |
| Catatan di bawah peta | "Simulasi, bukan peringatan. Status resmi tsunami hanya dari BMKG." |
| Pantai tidak dihitung | "belum dihitung" |
| Sel kering | "tidak tergenang pada simulasi ini" |
| Kalimat batas (wajib, di samping legenda, tiap tampilan genangan) | "Tinggi darat dari DEM permukaan, tanpa pasang surut, tanpa dispersi, tanpa longsor. Bukan jaminan." |
| Kelas terendah legenda | "kurang dari 0,05 m digabung ke kering" |
| Label pada kotak atau jenis sumber yang belum teruji | "hipotesis, jenis sumber ini belum teruji" |
| Tanpa data historis | "tidak ada data run-up tercatat di sini" |

## 4. Aksesibilitas dan HP

- Peta genangan punya padanan tabel (pantai, luas, kedalaman maksimum, waktu tiba) yang dapat dibaca pembaca layar.
- Skala warna tidak memakai merah-hijau sebagai satu-satunya pembeda.
- Lebar 390 px: pemilih pantai berbaris dua, legenda di bawah peta, batang run-up bisa digulir mendatar.
- Target sentuh sesuai token; tidak ada tombol hanya-ikon tanpa label teks alternatif.
