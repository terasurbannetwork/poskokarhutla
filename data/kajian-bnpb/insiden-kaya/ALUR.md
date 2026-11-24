# ALUR: Insiden Kaya

## 1. Alur data (mesin)

```
titik.yml (tiap 3 jam)
  insiden.py        -> insiden.json (status bergulir, cache data-), daftar insiden + anggota
  progresi.py (baru)
     1. baca insiden aktif dan tak_terdeteksi (SIMPAN_HARI)
     2. tambahkan deteksi VIIRS nominal/tinggi baru dari hotspot24.json ke arsip per insiden
        (bergulir, cache data-, tidak di-commit, tidak terbit)
     3. untuk tiap insiden dengan >= 20 piksel unik dan arsip berubah atau > 12 jam:
        epoch -> waktu tiba -> permukaan -> isokron 14.00 WIB -> laju, lompatan, titik awal
     4. tulis public/data/progresi/<id>.json dan indeks.json
     5. tulis daftar petak unik per insiden untuk langkah bangunan (D15, Q7)

bangunan.yml (harian, grid dari cache / R2)
  paparan_insiden.py (baru, pipa-umum)
     1. baca daftar petak per insiden
     2. muat halus_<prov>.json untuk provinsi insiden
     3. sel halus dalam 500 m dari pusat petak mana pun, gabungan, tiap sel sekali
     4. tulis public/data/insiden_bangunan.json (angka per insiden)
        dan data/terkunci/insiden/ (rincian sel, tidak terbit)
```

Prinsip: `insiden.py` tidak berubah perilakunya. Bila `progresi.py` atau `paparan_insiden.py` gagal, insiden tetap terbit tanpa kartu baru dan Actions memberi `::warning`, tidak gagal (pola `insiden.py` di `titik.yml`).

## 2. Alur pengguna di layar

1. Pengguna membuka pop-up insiden (dari peta atau daftar). Kepala pop-up dicat dulu.
2. Dua kartu baru tampil di bawah ringkasan yang sudah ada: "Perkembangan api" dan "Bangunan dekat api". Kartu mengambil `public/data/progresi/<id>.json` saat pop-up dibuka (satu `fetch`, tidak dimuat di awal halaman).
3. Kartu "Perkembangan api":
   - Peta menampilkan isokron berwarna per hari; pemilih hari berupa deret pil, satu pil per hari (klik hanya mengubah filter lapisan, tidak memuat ulang data).
   - Tabel per hari: tanggal, luas dijangkau (ha), baru (ha), laju p90 (km per hari atau "belum terukur"), catatan (lompatan).
   - Perkiraan titik awal: lingkaran berjari-jari galat; label "perkiraan titik awal terdeteksi".
4. Kartu "Bangunan dekat api":
   - Dua angka: "sekitar N bangunan sekarang" dan "sekitar M sejak api terdeteksi", luas atap total.
   - Lingkaran 500 m digambar di sekitar petak aktif (gambar lingkaran, bukan penanda bangunan).
   - Bila provinsi tanpa grid: "belum tercakup untuk provinsi ini".
5. Tidak ada tombol yang menulis ke server. Semua baca.

## 3. Keadaan dan teks kosong

| Keadaan | Kartu Perkembangan api | Kartu Bangunan dekat api |
| ------- | ---------------------- | ------------------------ |
| Insiden < 20 piksel unik | "terlalu kecil untuk dilacak" | tetap dihitung bila petak ada |
| Arsip < 2 hari | "belum cukup riwayat, dihitung sejak <tanggal>" | sama |
| Uji tahan belum ada vonis | angka tampil dengan pil "hipotesis" | tidak terkait |
| Langkah di bawah satu sel | laju "belum terukur" | – |
| `tak_terdeteksi` | garis terakhir tampil, tanpa kata padam; keterangan "tak terlihat sejak <tgl>" | angka terakhir tetap, berlabel tanggalnya |
| Provinsi tanpa grid | – | "belum tercakup" |
| Petak aktif (≤ 12 jam) tidak ada | – | `kini` tampil "–" |
| Berkas gagal dimuat | "belum tersedia" | "belum tersedia" |

## 4. Siapa memegang apa

| Langkah | Pemilik | Pemeriksa |
| ------- | ------- | --------- |
| Arsip deteksi, progresi, keluaran JSON | `pipa-data` | `validasi-model` |
| Bangunan dekat petak | `pipa-umum` (+ `pipa-data` menerbitkan) | `security-reviewer`, `selera-angka` |
| Workflow | `mekanik-mesin` | `penulis-gerbang` |
| Pop-up | `layar-peta` | `inp-reviewer`, `selera-angka` |
