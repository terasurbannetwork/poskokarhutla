# RENCANA-UJI: Pemetaan bekas longsor dari satelit

| No | Uji | Perintah bukti | Kriteria terima |
| --- | --- | --- | --- |
| T1 | Kriteria terkunci: sidik tertulis di vonis; berkas berubah berarti vonis tidak sah; pipeline menolak jalan tanpa jangkar. | `python3 scripts/longsor/bekas.py prasyarat` | menolak saat sidik salah atau jangkar null |
| T2 | Fungsi murni: rdNDVI, masker SCL, saringan MNDWI dan sungai, gugus 8-tetangga dan luas minimum, pemisahan lapis tebangan, agregat per kecamatan, null untuk tak terliput. | `python3 scripts/longsor/bekas.py uji` | hijau, tanpa jaringan |
| T3 | Kebenaran sah: kappa dua penafsir dihitung dan dibandingkan ambang; kebenaran tidak sah menghasilkan vonis menunggu. | `python3 scripts/longsor/bekas_uji.py uji` | hijau |
| T4 | Uji balik optik: kalibrasi dan uji terpisah, plasebo, tiga naif, akurasi tertimbang strata dengan CI. | `python3 scripts/longsor/bekas_uji.py optik` | vonis tertulis; gagal pun dilaporkan apa adanya |
| T5 | Uji balik radar terpisah dari optik. | `python3 scripts/longsor/bekas_uji.py radar` | vonis tertulis |
| T6 | Vonis bukan lulus: keluaran tanpa angka (null, bukan 0); layar tanpa sel angka. | `node --test tests/longsor/bekas_vonis.test.mjs` | hijau |
| T7 | Rute: tanpa sesi 401 sebelum R2; hak per peran. | `npm run uji:warga` | hijau |
| T8 | Tidak ada berkas bekas longsor di `public/` sebelum Q6. | `node --test tests/longsor/bekas_vonis.test.mjs` | hijau |
| T9 | Nowcast longsor dan pra-registrasi LHASA2 tidak berubah (sidik `model_lhasa2.sidik` tetap). | `node --test tests/longsor/longsor.test.mjs` | hijau |
| T10 | Gerbang paket, kartu standar, token warna. | `npm run uji:agen` | hijau |

Pemeriksa: `validasi-model` (T1, T3 sampai T5, sebelum dan sesudah kunci), `guard-api` dan `security-reviewer` (T7), `selera-angka` dan `inp-reviewer` (layar), `higiene-repo` sebelum commit besar.
