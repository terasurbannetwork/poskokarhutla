# RENCANA-UJI

| No | Uji | Perintah bukti |
| --- | --- | --- |
| U1 | kelas desa BNPB: bentuk, 6 bahaya, kosong = null, aturan kelas kab pada kasus batas | `python3 -I scripts/siklus/kelas_desa_bnpb.py --cek` |
| U2 | status BDG ada, sidik v3 cocok, BNJ hari ini tidak berubah selain K baru (golden dengan K lama) | `python3 -I scripts/prediksi/status_prakiraan.py --cek` |
| U3 | analisis: blok sumber hilang = null; urutan; pembulatan | `python3 -I scripts/prediksi/analisis_wilayah.py --cek` |
| U4 | iklim cadangan IOD dan umur | `python3 -I scripts/data/iklim.py --cek` |
| U5 | debit_kab bentuk dan Q2 null | `python3 -I scripts/banjir/debit_glofas.py --cek` |
| U6 | rute rekomendasi 401, 403, 200 staf; publik tanpa rekomendasi | `node --test tests/warga/potensi*.test.mjs` |
| U7 | rute BMKG: kode tidak sah 400, cache, galat | idem |
| U8 | fungsi murni: status per hari, urutan, ringkas, kelas kab | `node --test tests/potensi/` |
| U9 | gerbang: tidak ada "aman", kapital semua, "·" di `public/potensi/`; tidak ada katalog rekomendasi per pihak di `public/` (pengecualian: `public/ews_tindakan.js`, butir warga bersumber yang sudah publik sebelum paket ini); registri `/potensi` ada | `node --test tests/potensi/` dan `npm run uji:agen` |
| U10 | tinjau lokal semua tab, HP 375 px dan desktop | `http://localhost:8800/potensi` |
| U11 | INP: klik tab, pil, hari, kab tidak membekukan | `inp-reviewer` |
| U12 | angka di layar | `selera-angka` |
| U13 | kelas kab baru lawan `kelas_kab.py` lama: laporan beda, bukan gerbang | `python3 -I scripts/siklus/kelas_desa_bnpb.py --banding` |

U14: sebaran K per bahaya dilaporkan dan diperiksa batas D23 sebelum sidik dikunci (`kelas_desa_bnpb.py --cek` mencetaknya).

Uji balik BDG dan K baru ikut gerbang induk, dengan jendela prospektif baru sejak amandemen (D22). BDG kemungkinan tidak pernah lulus karena label banjir bandang jarang; itu bukan kegagalan paket (`status_prakiraan_uji.py`); sampai lulus, pil hipotesis.
