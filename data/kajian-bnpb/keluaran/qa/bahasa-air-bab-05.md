# Penyunting bahasa (lapis c): naskah/air/bab-05.md

Tanggal: 24 Okt 2026. Berkas: `naskah/air/bab-05.md` (Profil Risiko Musim Kemarau).

## Vonis slop akhir

`qa/slop.py --final`: LULUS, skor 0, 4.425 kata, kata kosong 0,0 per 1.000. Sebelum sunting juga LULUS skor 0 (4.403 kata).

## Suntingan

Glosarium (`data/glosarium.json`, aturan L66, gerbang T-9): singkatan dieja pada kemunculan pertama di prosa bab, termasuk ringkasan bab.

| Singkatan | Letak eja baru | Eja ganda yang dihapus |
| --- | --- | --- |
| BNPB | ringkasan, temuan DIBI | |
| ONI | ringkasan, temuan DIBI | paragraf pembuka bab |
| ENSO | ringkasan, angka kunci | |
| IRBI | ringkasan, angka kunci | |
| BPBD | ringkasan, rekomendasi r-a03 | paragraf pembuka bab |
| BMKG | ringkasan, rekomendasi r-a09 | subbab Kemarau 2026 |
| BPS | subbab Dampak, paragraf pertama | |
| Renas PB | kotak temuan Gunungkidul | |
| TPA | subbab Karhutla dan TPA, kalimat pembuka (token tetap `|satuan`) | |

Bahasa:
- "rilis 23 Oktober menulis indeks" menjadi "mencantumkan indeks".
- "menurut narasi BNPB" menjadi "menurut berita BNPB" (selaras dengan istilah di paragraf berikutnya).
- "Kekuatan bukti embung ... adalah belum terbukti, dan kekuatan bukti Sekolah Lapang Iklim BMKG lemah" dirapikan menjadi "Embung dan panen air hujan berkekuatan bukti belum terbukti, sedangkan Sekolah Lapang Iklim BMKG berbukti lemah". Label kekuatan bukti tidak berubah.

## Yang tidak diubah

Angka, token `{{angka:...}}`, kutipan `[@...]`, rujukan silang `@...`, label keyakinan, dan isi tabel: daftar token sebelum dan sesudah identik (diff kosong). Kalimat pembuka tebal L16 di semua paragraf temuan sudah berangka; judul subbab sudah deskriptif.

## Catatan di luar lapis bahasa

`bangun/kontrak/naskah.py` menolak bab ini, baik versi sebelum maupun sesudah sunting: kunci `perhatian.air.kekeringan.n_syarat_d` (baris 15) tidak ada di `data/angka.json`. Galat ini sudah ada sebelum sunting dan perlu ditangani pemilik paket angka daftar perhatian.
