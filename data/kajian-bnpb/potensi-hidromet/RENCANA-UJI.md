# RENCANA-UJI

| No | Uji | Perintah bukti |
| --- | --- | --- |
| U1 | kelas_kab cek, bahaya tambahan, desa kurang sampel null | `python3 -I scripts/siklus/kelas_kab.py --cek` |
| U2 | status BDG ada, sidik v3 cocok, BNJ tidak berubah (golden) | `python3 -I scripts/prediksi/status_prakiraan.py --cek` |
| U3 | analisis: blok sumber hilang = null; urutan; pembulatan | `python3 -I scripts/prediksi/analisis_wilayah.py --cek` |
| U4 | iklim cadangan IOD dan umur | `python3 -I scripts/data/iklim.py --cek` |
| U5 | debit_kab bentuk dan Q2 null | `python3 -I scripts/banjir/debit_glofas.py --cek` |
| U6 | rute rekomendasi 401, 403, 200 staf; publik tanpa rekomendasi | `node --test tests/warga/alun_peringatan*.test.mjs` |
| U7 | rute BMKG: kode kab tidak sah 400, cache, galat | idem |
| U8 | fungsi murni: status per hari, urutan, ringkas, Normal vs belum terukur | `node --test tests/alun-peringatan/` |
| U9 | gerbang: tidak ada "aman", kapital semua, "·" di layar baru; tidak ada `rekomendasi` di `public/` | `node --test tests/alun-peringatan/` |
| U10 | tinjau lokal: mode Peringatan, pil, hari, kartu kab, analisis | `http://localhost:8800/lapor/` |
| U11 | INP: klik pil, sub-tab, hari tidak membekukan | `inp-reviewer` |
| U12 | angka di layar | `selera-angka` |

Uji balik BDG ikut gerbang induk (`status_prakiraan_uji.py`); sampai lulus, pil hipotesis.
