# Insiden, perkembangan, bangunan dekat

Halaman ini menguraikan pelacakan insiden, perkembangan api per insiden (hipotesis), dan bangunan dekat api.

## Insiden api

`scripts/data/insiden.py` memberi identitas stabil lintas putaran pada cluster tingkat 2 ke atas, meniru pelacakan kejadian NASA FEDS:

- Aturan pencocokan: tepi bila jarak terdekat antar simpul sampai 0,6 km (`JARAK_KM`) atau titik jatuh di dalam garis luar lain. Satu komponen terhubung adalah satu insiden. Bila menyentuh beberapa insiden lama, yang tertua menang dan sisanya menjadi rekaman `gabung`.
- ID: `<kode provinsi>-<yymmdd WIB deteksi pertama>-<urut tiga digit>`.
- Status: `aktif`, `tak_terdeteksi`, atau `gabung`. Tak terdeteksi bukan padam. Insiden tak terdeteksi tetap dikenal selama `PADAM_HARI = 3` hari; rekaman disimpan 14 hari; api yang menyala lagi dalam 3 hari (10 hari di gambut) membuka insiden yang sama.
- `luas_koreksi` = jumlah deteksi kumulatif x faktor ha per deteksi per provinsi (median rasio luas resmi SiPongi terhadap deteksi VIIRS S-NPP per tahun, dengan rentang p10 sampai p90). Faktor hanya dari tahun 2020 ke atas dan SiPongi sedikitnya 50 ha; provinsi dengan kurang dari 5 tahun terpakai jatuh ke median nasional. Setelah S-NPP berhenti, acuan memakai N20 dibagi rasio 0,89 (IQR 0,72 sampai 1,07). Ini perkiraan perencanaan, bukan luas terverifikasi.
- `luas_aktif` = piksel VIIRS unik berumur 12 jam atau kurang (`SEGAR_JAM`) x 14,0625 ha, tanpa faktor: batas bawah luas piksel menyala.
- `tren` hanya dari N20 dan N21; tumbuh atau menyusut bila selisih sedikitnya 25 persen dan max(deteksi 24 jam, kemarin) sedikitnya 4.
- `bukti`: kuat bila sedikitnya dua lintasan dari dua satelit berbeda atau berselang 6 jam ke atas, atau dua piksel dalam satu lintasan, atau ada deteksi malam, atau ada piksel keyakinan tinggi. Kuat tidak turun lagi.
- Kunci tambahan: `desa`, `nama`, `kota_terdekat`, `riwayat_api` (persen petak yang pernah punya api VIIRS S-NPP 2012 sampai 2025, batas bawah), `n_bukti`.
- `masuk`: titik jalan, sungai besar, atau kanal terdekat dari front, garis lurus, paling jauh 25 km; ini bukan rute.
- Keluaran: `public/data/insiden.json` (status bergulir lewat cache `data-` di `titik.yml`) dan `tugas_kompleks.json` yang disisipi kunci insiden. Batas ukuran 4,5 MB.

## Perkembangan api per insiden (HIPOTESIS)

Dirancang di `data/kajian-bnpb/insiden-kaya/ALGORITMA.md` bagian A dan ditulis di `scripts/data/progresi.py`, masukan dari `scripts/data/arsip_insiden.py`. Metode diambil dari repo pembanding berlisensi MIT, ditulis ulang di stdlib, dengan pemberitahuan lisensi di kepala berkas.

**Arsip** (`arsip_insiden.py`): petak unik 375 m (`SEL = 0,0034` derajat) per insiden aktif sejak 1 Juli 2026 00.00 UTC (`ARSIP_DARI`), dari `titik_hari/*.json` ditambah `hotspot24.json`, waktu dalam menit sejak `ARSIP_DARI`. Paling banyak 20.000 petak per insiden (`MAKS_PETAK`); lebihnya ditandai `terpotong:true`, dan progresi menulis `tersedia:false`. Hanya VIIRS (`petak`); MODIS di `petak_m` hanya informasi. Arsip negara FIRMS 2026 tidak tersedia tanpa kunci (404 pada 24 November 2026), jadi arsip dibangun dari `titik_hari`. Keterbatasan yang diwariskan: `titik_hari` hanya menyimpan deteksi pertama tiap lokasi unik per hari WIB, jeda lintasan tampak membesar, dan petak memakai geometri insiden saat ini, sehingga api yang sudah menyusut tidak terjangkau. Arsip tidak diterbitkan (`public/.assetsignore`: `data/progresi/arsip/`).

**Langkah hitung** (`progresi.py:31` sampai `48`):

```
epoch E       = waktu lintasan unik (dibulatkan 30 menit), selisih <= 1,5 jam digabung
jeda(p)       = t_pertama(p) - epoch terbesar < t_pertama - 0,75 ; bawaan 12 jam, batas 24 jam
t_tiba(p)     = t_pertama(p) - jeda / 2 ; galat = jeda / 2
jejak         = tutup2(dilasi4(petak terdeteksi)) gabung petak terdeteksi
T(sel kosong) = median t_tiba dari 5 petak terdeteksi terdekat (K_TETANGGA = 5)
T(petak)      = min(T, t_pertama)
garis depan   = tiap pukul 07.00 UTC (14.00 WIB), sel dijangkau bila T <= tk
luas_k        = sel dijangkau x 14,0625 ha  (batas atas luas terbakar, bukan luas terbakar)
laju_k        = persentil 90 jarak sel baru ke garis hari sebelumnya, hanya sel baru dalam 2 km
terukur       = (p90 > 0,378 km) ; selain itu null, di_batas_resolusi:true, tidak pernah 0
lompatan      = petak pertama-terdeteksi 2 sampai 10 km dari seluruh sel yang sudah tercapai
titik awal    = petak t_tiba <= t0 + 1 jam, rata-rata berbobot FRP, galat = jeda terbesar / 2,
                radius minimal 375 m; mulai_lebih_awal bila >= 5 sel sudah menyala saat pertama terlihat
```

Arah lompatan adalah arah geometri dari asal ke tujuan, bukan arah angin. Insiden dengan kurang dari 20 piksel unik (`MIN_PIKSEL`, bawaan sementara) tampil "terlalu kecil untuk dilacak". Petak yang lebih awal dari awal insiden dikurangi 24 jam dibuang (`SEBELUM_AWAL_JAM`, keputusan D20). Maksimum 30 langkah isokron, 150 KB per berkas, 120 insiden (`MAKS_INSIDEN`), dihitung ulang bila berkas lebih dari 12 jam.

**Uji tahan** (`progresi.py uji-tahan`, hasil di `tests/insiden/hasil_uji.json`): 20 persen petak disembunyikan secara acak (benih `20261124`) lalu ditebak dari 80 persen sisanya, dibandingkan dengan tetangga terdekat. Kriteria bawaan sementara (Q2): gabungan 10 insiden dengan 24 jam ke dalam sedikitnya 0,60 dan MAE tidak lebih buruk dari tetangga terdekat.

| Kelompok | Hasil | Vonis |
| --- | --- | --- |
| FIRMS lengkap 2019 dan 2023, 10 insiden | median-5: dalam 24 jam 0,820, MAE 14,27 jam; tetangga terdekat: 0,751 dan 18,43 jam | `vonis_historis` lulus |
| Arsip `titik_hari` musim ini, 1 insiden | dalam 24 jam 0,583, MAE 28,61 jam | gagal, tetapi hanya 1 insiden dengan 50 petak atau lebih (diminta 3) dan 12 sel ditahan, jadi belum cukup untuk vonis |
| Vonis gabungan di berkas | | `belum` |

Karena vonis akhir `belum` dan masukan produksi lebih miskin daripada FIRMS lengkap (Q11), semua angka perkembangan api berpil hipotesis. Uji ini mengukur interpolasi sel yang ditahan, bukan akurasi garis depan terhadap perimeter independen (`jenis_uji` di berkas hasil).

## Bangunan dekat api per insiden

`scripts/umum/paparan_insiden.py`, rancangan di ALGORITMA bagian B:

```
S(petak)  = sel halus 110 m (Open Buildings v3, keyakinan >= bangunan.AMBANG_KEYAKINAN = 0,70)
            yang pusatnya <= 500 m dari pusat petak 375 m
kumulatif = gabungan S(petak) untuk semua petak insiden
kini      = gabungan S(petak) untuk petak yang deteksi terakhirnya <= 12 jam
```

Gabungan, bukan jumlah: satu sel (dan bangunan di dalamnya) dihitung sekali per insiden. Hanya provinsi yang punya grid halus (`halus_<prov>.json`); selainnya `terliput:false` dan angka `null`, tampil "belum tercakup", bukan 0. Per 24 November 2026 grid lokal hanya untuk provinsi 13, 33, dan 63, dan unduhan semua provinsi sudah disetujui (K7) tetapi keadaan R2 belum diukur. Angka publik dibulatkan: di bawah 5 tampil "kurang dari 5", selain itu "sekitar" dibulatkan ke kelipatan 5 dan luas atap ke 100 m2 (bawaan sementara Q6). Koordinat sel dan bangunan tidak pernah terbit. Angka ini tidak dijumlah dengan paparan 1, 3, dan 5 km di `paparan_bangunan.py` atau dengan OSM. Nol terdeteksi bukan jaminan tidak ada bangunan.
