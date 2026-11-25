# Pertanyaan terbuka

Halaman ini mendaftar pertanyaan pemilik yang belum diputuskan beserta bawaan sementaranya.

Sumber: `data/kajian-bnpb/semai-awan/KEPUTUSAN-SEMAI.md`.

| No | Pertanyaan | Bawaan sementara |
| -- | ---------- | ---------------- |
| Q4 | Tinjau BMKG lewat peran akun baru `bmkg` atau tampilan terbuka bagi semua pembaca `/operasi`. | Tampilan yang bisa dipilih semua pembaca; peran `bmkg` menunggu. |
| Q5 | Tampilan Mitra lintas batas hanya di layar dan ringkasan, atau tautan baca tanpa masuk. | Hanya layar dan ringkasan teks, tanpa tautan publik. |
| Q6 | Ambang skor dan jumlah zona. | Skor 0,35 atau lebih, maksimal 5 zona, jarak antarzona 40 km atau lebih. |
| Q7 | Jendela terbang 07.00 sampai 16.00 setempat atau batas terang per base. | 07.00 sampai 16.00 waktu setempat. |
| Q8 | Kecepatan jelajah per jenis armada OMC. | 300 km/jam semua jenis, berlabel perkiraan. |
| Q9 | Tujuan utama semai yang diberi bobot (api aktif, pembasahan gambut, asap). | Api aktif 24 jam dikali pengali gambut 1,5; pembasahan gambut tanpa api menjadi tiket lanjutan. |
| Q10 | Log sortie OMC BMKG berjam dan berkoordinat untuk uji balik. | Memakai `omc_sortie` yang diisi staf TMC. |
| Q11 | Nama kota negara tetangga di tampilan Mitra. | Ya, nama kota dan jam tiba saja, tanpa angka beban. |
| Q12 | Bahasa ringkasan teks. | Indonesia untuk Pos komando, Inggris untuk Mitra. |
| Q13 | Daftar base OMC di luar Sumatera dan Kalimantan. | Digantikan keputusan S10: bandara terdekat tanpa batas jelajah; daftar dari BMKG tetap ditunggu. |
| Q14 | Bahan yang boleh diusulkan mesin. | Hanya NaCl, dan dry ice dulu bila ada inversi berasap. |
| Q15 | Muatan bahan per sortie per jenis armada. | Kosong; layar menulis "muatan armada belum diisi". |
| Q16 | Lama penaburan per sortie. | 30 menit, berlabel perkiraan. |
| Q17 | Grup WA untuk peringatan subuh. | Satu grup Pusdalops yang sudah dipakai bot renlap; belum dibangun di kode. |

Jawaban pemilik yang sudah ada: S6 (boleh memasang `eccodes` di workflow semai), S7 (tombol target untuk `pusdalops`, `tmc`, moderator), S9 (pertanyaan lain diputuskan penyusun dengan bawaan di atas), S10 (OMC berangkat dari bandara terdekat tanpa batas jelajah), S11 (renlap OMC pada halaman tersendiri). Akun GSMaP atau Earthdata, daftar base BMKG, muatan armada, dan penerapan migrasi produksi masih menunggu pihak luar.

Pertanyaan terbuka lain yang berasal dari kode dan catatan agent, tanpa dokumen keputusan resmi: izin akses otomatis dasbor PM2,5 BMKG (pemilik memutuskan lanjut, ketentuan BMKG belum dikonfirmasi), izin penggunaan data stasiun pemerintah Malaysia untuk memperkuat asap lintas negara, dan kunci OpenAQ untuk koreksi MOS.
