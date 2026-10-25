# Lapis (c) penyunting bahasa: naskah/air/bab-01.md

Tanggal: 24 Oktober 2026. Angka, token, kutipan, rujukan, dan makna tidak diubah.

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (2789 kata).
- Sesudah sunting: LOLOS, skor 0, nol pelanggaran (2796 kata), `qa/slop.py --final`.
- Satu temuan S-18 (rendah, tiga-serangkai) sempat muncul dari rumusan sunting baris 85 dan
  sudah dibetulkan sebelum vonis akhir.

## Suntingan

| Baris | Jenis | Sebelum | Sesudah |
| --- | --- | --- | --- |
| 37 | KBBI | Cacah kabupaten/kota berkejadian | Jumlah kabupaten/kota yang melaporkan kejadian |
| 58 | KBBI | rekam musim terakhir | rekaman musim terakhir |
| 74, 79 | singkatan | Pola PSDA dipakai di kotak temuan sebelum dieja di baris 79 | dieja di kemunculan pertama (baris 74); baris 79 memakai singkatan |
| 85 | kejelasan | ditambah syarat keterhubungannya (rujukan kabur) | disertai syarat agar keduanya terhubung ke rencana kontinjensi BPBD pesisir |
| 87 | kejelasan | dapat dilibatkan tetapi tidak berhak dilibatkan | dapat dilibatkan, tetapi tidak dapat menuntut pelibatan |
| 118 | singkatan | Kementerian ESDM | Kementerian Energi dan Sumber Daya Mineral |
| 142, 153 | singkatan | Progsun dipakai di tabel sebelum dieja di baris 153 | dieja di sel tabel; baris 153 memakai singkatan |
| 147 | gaya | bersyarat dua | memiliki dua syarat |
| 149 | PUEBI, singkatan | pra-pelaksanaan; K/L tidak pernah dieja | prapelaksanaan; kementerian/lembaga (K/L) |
| 155 | gaya | masuk keputusan 14 hari pertama | termasuk dalam keputusan 14 hari pertama |
| 159 | ritme | "beserta" empat kali dalam satu paragraf | dua kali, sisanya "dan"/"termasuk" |

## Daftar periksa M-1 sampai M-14

Tidak ada temuan tersisa. M-3: kalimat pembuka tiap subbab memuat fakta baru. M-5: semua
angka bertoken. M-9: rekomendasi di ringkasan bab memuat status, lembaga, dan tenggat. M-10:
kontras yang tersisa (BNPB tidak duduk di Dewan Pengarah; cacah kejadian bukan ukuran
keparahan) dilandasi teks peraturan dan data 2015. M-14 berlaku untuk keluaran DOCX/PPTX,
tidak untuk naskah. L16: paragraf temuan dibuka kalimat tebal berangka; paragraf
lanjutan (149, 151, 155) dan paragraf Tujuan, Lingkup, Sistematika bukan paragraf temuan.
Judul subbab mengikuti KERANGKA dan tidak diubah.

## Catatan untuk sesi induk

1. `glosarium.json` tidak ada di `data/kajian-bnpb/` (glosarium dibangkitkan pembangun menurut
   NASKAH-SPEK §1). Pemeriksaan singkatan memakai kemunculan pertama di prosa bab.
2. Kontrak `bangun/kontrak/naskah.py` gagal pada baris 16: kunci
   `airjawa.kekeringan.terdampak_2026` tidak ada di `data/angka.json` (berkas itu sedang
   berubah di tree kerja). Token itu tidak disentuh lapis ini; perlu dibereskan pemilik
   `air-jawa.py` sebelum bangun.
