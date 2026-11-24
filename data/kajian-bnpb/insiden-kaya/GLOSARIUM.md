# GLOSARIUM: Insiden Kaya

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Insiden | Satu api yang dilacak dengan ID stabil (`<kode prov>-<yymmdd>-<urut>`) oleh `scripts/data/insiden.py`; gabungan kompleks titik panas yang bersambung |
| Petak | Satu piksel VIIRS unik 375 m (sel 0,0034 derajat) yang pernah terdeteksi menyala dalam satu insiden |
| Petak segar | Petak dengan deteksi terakhir ≤ 12 jam (`SEGAR_JAM`) |
| Titik panas | Deteksi satelit satu piksel; istilah layar (bukan "titik api", PKH-32) |
| Lintasan atau epoch | Waktu satelit kutub melihat suatu wilayah; lintasan berjarak < 1,5 jam digabung |
| Jeda | Selisih deteksi pertama sebuah petak dengan epoch sebelumnya |
| Waktu tiba | Perkiraan saat api mencapai petak: deteksi pertama dikurangi setengah jeda |
| Galat waktu tiba | Setengah jeda, dalam jam |
| Jejak | Himpunan sel yang diduga pernah dilalui api: petak terdeteksi didilasi lalu ditutup |
| Permukaan waktu tiba | Waktu tiba untuk setiap sel jejak: petak terdeteksi memakai waktunya sendiri, sel lain memakai median 5 petak terdeteksi terdekat |
| Isokron atau garis depan | Batas sel jejak yang waktu tibanya ≤ pukul 14.00 WIB suatu hari |
| Dijangkau | Luas sel yang dilalui garis depan, batas atas luas terbakar; **bukan** luas terbakar |
| Baru | Luas sel yang baru terjangkau dibanding hari sebelumnya |
| Laju p90 | Persentil 90 jarak kemajuan sel baru dari garis hari sebelumnya, km per hari |
| `resolved:false` atau "belum terukur" | Kemajuan p90 di bawah satu sel (0,378 km); bukan nol |
| Lompatan | Petak pertama-terdeteksi 2 sampai 10 km dari seluruh petak yang sudah tercapai; arah geometri, bukan arah angin |
| Perkiraan titik awal | Petak paling awal terdeteksi (dalam 1 jam dari yang pertama), rata-rata berbobot FRP; bukan penentu sebab |
| Mulai lebih awal | Sudah ≥ 5 petak menyala saat pertama terlihat, jadi api mulai sebelum yang terlihat |
| FRP | Daya api (MW) dari satelit; bukan energi |
| Uji tahan | 20% petak disembunyikan lalu waktu tiba ditebak dari sisanya, dibandingkan dengan nilai sebenarnya |
| MAE | Rata selisih absolut waktu tiba (jam) |
| Tak terlihat | Status insiden `tak_terdeteksi`: tidak terdeteksi satelit, **bukan** padam |
| Sel halus | Sel 110 m (1/1000 derajat) Open Buildings di `halus_<prov>.json` |
| Open Buildings | Google Open Buildings v3 (Sirko dkk. 2021), CC BY 4.0, keyakinan ≥ 0,70 |
| Bangunan dalam 500 m | Bangunan Open Buildings pada sel halus yang pusatnya ≤ 500 m dari pusat petak mana pun; satu bangunan sekali per insiden |
| Kumulatif, kini | Bangunan dekat semua petak sejak arsip; bangunan dekat petak segar |
| Terliput | Provinsi insiden punya grid bangunan; tanpa grid = "belum tercakup", bukan 0 |
| Pembulatan | "kurang dari 5" untuk di bawah 5, kelipatan 5 selebihnya, luas atap ke 100 m² |
| Arsip deteksi | Daftar petak dan epoch per insiden (`public/data/progresi/arsip/<id>.json`, sejak 1 Jul 2026, menit sejak `ARSIP_DARI`), bergulir di cache, tidak terbit |
| `titik_hari` | `public/data/titik_hari/<hari>.json`: lokasi unik 375 m per hari WIB dengan waktu deteksi pertama, sumber arsip (K6) |
| `ARSIP_DARI` | 1 Jul 2026 00.00 UTC, awal semua waktu arsip |
| Hipotesis | Pil untuk angka yang uji balik belum lulus |
| Kartu standar | `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS §3.5) |
