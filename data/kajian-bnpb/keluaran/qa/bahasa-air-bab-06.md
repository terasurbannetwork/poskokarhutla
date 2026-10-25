# Penyunting bahasa (lapis c): naskah/air/bab-06.md

Tanggal: 24 Okt 2026. Berkas: `naskah/air/bab-06.md` (Profil Risiko Musim Hujan).

## Vonis slop

- Sebelum sunting: LOLOS, skor 0 (5669 kata), 12 catatan S-18 rendah.
- Sesudah sunting: **LOLOS, skor 0** (5683 kata), kata kosong 0,0 per 1.000, nol pola kritis/tinggi.
- 12 catatan S-18 (rendah) tersisa semuanya daftar butir nyata (nama kabupaten, jenis bahaya DIBI, kutipan pasal PP 30/2024 Pasal 94 ayat (5), daftar kegagalan menurut Renstra 2020–2024), bukan tiga-serangkai gaya; dibiarkan karena mengubahnya akan mengubah isi atau kutipan.

## Integritas

- Token `{{angka:...}}`, rujukan `[@...]`, dan kutipan bertanda petik: identik dengan versi sebelum sunting (dicek multiset).
- Tanpa em dash, tanpa " · ".
- `bangun/kontrak/naskah.py` berhenti di baris 15: kunci `dibi.jawa.longsor.meninggal_2015_2026` tidak ada di `data/angka.json`. Galat yang sama muncul pada versi sebelum sunting, jadi bukan akibat sunting ini; perlu ditangani pemilik data angka sebelum render.

## Suntingan

Singkatan dieja pada kemunculan pertama di bab (glosarium `data/glosarium.json`):
- GNSS (ringkasan bab), InSAR, Renstra, Bappenas, BOP Pantura Jawa, Kementerian ESDM, ONI, ENSO, Renas PB, IKP.

KBBI/PUEBI dan kelancaran:
- "Pelajaran dari tabel itu adalah bahwa" menjadi "Tabel itu menunjukkan bahwa".
- "Rasio itu karena itu hanya didukung" menjadi "Karena itu, rasio tersebut hanya didukung" (dobel "itu").
- "jalur BNPB membawa telaah risiko" menjadi "jalur bagi BNPB untuk membawa telaah risiko".
- "Ketiganya di bawah lantai" menjadi "Ketiganya berada di bawah lantai".
- "Hasil ini bukan kritik" menjadi "Temuan itu bukan kritik" (pengulangan "Hasil ini" dua kalimat berturut).

Pengulangan antarsubbab:
- Subbab Kepekaan: kalimat "koefisien lintas negara tidak berlaku untuk bahaya berwaktu tunggu pendek" yang sudah dinyatakan di paragraf sebelumnya dihapus.
- Paragraf Cisarua di Subbab Kepekaan: rentang tanggal status siaga (sudah lengkap di Subbab Kejadian Besar) diganti rujukan silang `@sub:kejadian-besar`.

## Yang tidak diubah

- Paragraf bukti "Pengendalian pengambilan air tanah ..." tidak memuat angka di kalimat pembuka tebal; ini paragraf bukti program, bukan temuan berangka, dan angkanya (Tokyo) terikat sumber di kalimat berikut. Catatan untuk penulis bila L16 diberlakukan juga ke paragraf bukti.
- Frasa "Kajian ini menilai bahwa" dipertahankan sebagai penanda penilaian penyusun.
