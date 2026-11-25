# ALUR: Pemantauan satelit

## 1. Jalur 10 menit (Himawari)

1. Cron Worker `* * * * *` (yang sudah ada) membaca R2 `data/satelit/picu.json` (pindaian 6 jam terakhir yang sudah dipicu, kunci idempoten = jam pindai). Tiap tik, untuk paling banyak 6 pindaian calon (belum `selesai`, belum dipicu atau pemicunya kedaluwarsa), satu permintaan daftar objek ke `noaa-himawari9` per pindaian.
2. Susul: semua pindaian dalam 6 jam terakhir yang keenam kanalnya (S05 sampai S07) sudah ada di S3 tetapi belum `selesai` dipicu, terbaru dulu, paling banyak 3 dispatch per tik (DESAIN-TEKNIS 3). Jadi objek S3 yang telat, cron Worker yang terlewat, atau dispatch yang gagal disusul pada tik berikutnya. Pindaian yang lebih tua dari 6 jam tidak disusul otomatis; bila ada, `/api/status` menghitungnya sebagai `pindaian_hilang` (Q2, Q15).
3. `satelit.yml` menjalankan `scripts/umum/himawari_pindai.py jalan --pindai ...`:
   - unduh B07, B08, B11, B13, B14, B15, segmen S05 sampai S07, sekali;
   - detektor api, abu, konveksi (dan kabut malam bila ST-15 jadi) dipanggil dengan kisi yang sama;
   - tiap keluaran membawa `acuan` (jam pindai UTC), `status_sumber`, `versi_kriteria`, `vonis`.
4. Unggah ke R2: `data/satelit/<jenis>.json` (ditimpa, satu tulis per jenis per pindaian, hanya bila isinya berubah) dan potongan arsip per jam (DESAIN-TEKNIS 4). Tanpa commit (Q4).
   - Arsip: tiap run menulis satu potongan `arsip/satelit/_potong/<jenis>/YYYYMMDD/HHMM.json.gz` (kunci = pindaian, jadi tulis ulang idempoten dan dua run paralel tidak saling menimpa). Langkah harian (paling cepat pukul 06.00 UTC hari berikutnya, sesudah jendela susulan 6 jam hari itu habis, supaya tidak ada potongan yatim) memadatkan potongan satu hari jadi `arsip/satelit/<jenis>/YYYY/MM/DD.jsonl.gz`, memeriksa jumlah barisnya sama dengan jumlah potongan, baru menghapus potongan (DESAIN-TEKNIS 4). Tanpa baca-ubah-tulis di jalur 10 menit.
   - Penanda selesai: run terakhir menulis `data/satelit/selesai/<pindai>` (kosong) sesudah semua unggah sukses; Worker memakainya untuk tidak memicu ulang (bagian 6).
5. Cron Worker pada menit berikutnya melihat etag R2 berubah:
   - detektor ber-vonis `lolos`: baris alarm ke D1 (pola `alarm_himawari`), lalu alur Posko yang ada;
   - detektor tanpa vonis `lolos`: tidak ada baris D1, tidak ada kabar; layar staf membaca JSON R2 berpil hipotesis (D8).
6. Pindaian yang gagal diunduh: tidak menulis apa pun; berkas lama tetap; status sumber dihitung dari umur `acuan` (bagian 3).

## 2. Jalur harian dan mingguan

| Butir | Workflow | Sumber | Keluaran |
| --- | --- | --- | --- |
| Panas kawah | `lintas.yml` (harian, sudah ada) | FIRMS VIIRS area 5 km kawah | R2 `data/satelit/kawah.json`, ringkasan `public/gunungapi/data/kawah_satelit.json` |
| SO2 | `lintas.yml` | TROPOMI OFFL lewat OPeNDAP (pola `tropomi.py`) | `public/gunungapi/data/so2_satelit.json` |
| Genangan harian | `banjir.yml` (harian, sudah ada) | GFM lewat `genangan_nasional.py` | R2 `data/satelit/genangan_harian.json` (staf, Q10) |
| VHI | `statis.yml` (sudah ada), langkah lewat sendiri bila minggu belum berganti | NOAA STAR (Q9) | `public/kekeringan/data/vhi_kab.json` |
| Asap AI | `udara.yml` (sudah memanen TROPOMI) | keluaran `tropomi.py` | `public/udara/data/asap_satelit.json` |
| Rapor uji | workflow harian pemilik detektor | arsip R2 + label | `public/data/gerbang/satelit.json` |

## 3. Status sumber

```
hidup      umur acuan <= 2 x kadens + latensi wajar (Himawari 40 menit; harian 36 jam; mingguan 10 hari)
terlambat  di atas hidup, di bawah 6 x kadens (Himawari 2 jam)
terputus   di atas itu, atau galat sambungan berulang 3 kali; `sejak` = acuan terakhir yang sah
```

Layar: `terlambat` pil warn "terlambat, pindaian terakhir <jam WIB>"; `terputus` pil gagal "sumber terputus sejak <jam WIB>", angka lama disembunyikan, tidak pernah diganti 0. `/api/status` memakai ambang yang sama.

## 4. Jalur vonis (sekali per detektor, lalu bergulir)

1. Tulis `<nama>.kriteria.json` (ambang detektor, metrik, pembanding, jumlah alarm, periode kalibrasi dan uji, label) dan `<nama>.sidik` lewat `scripts/umum/sidik.py`, commit, sebelum data uji dibaca.
2. Kumpulkan arsip R2 untuk periode uji; ambil label (`label_dalops.py jalan <bahaya>`, VIIRS, VONA, MAGMA, PM2.5).
3. `prasyarat`: sidik cocok, jangkar commit ada; bila tidak, berhenti.
4. Hitung metrik detektor dan pembanding pada jumlah alarm sama (`pembanding.py`), selang 95 persen (`selang.py`).
5. `gerbang.py` menulis entri ke `public/data/gerbang/satelit.json`. Pemeriksa `validasi-model`.
6. Vonis `lolos`: pil hipotesis dicabut, alarm boleh ke D1; ke luar masih menunggu Q6. Vonis `gagal`: detektor tetap tampil berpil hipotesis atau disembunyikan sesuai keputusan pemilik; tidak disetel ulang pada data uji yang sama (kriteria versi 2 dikunci dulu, periode uji baru).

## 5. Layar

1. Kepala layar bencana (yang sudah ada).
2. Kartu status resmi tetap di tempatnya (BMKG, PVMBG, VAAC).
3. Kartu "Satelit" per layar: status sumber, pindaian terakhir, isi deteksi, pil hipotesis selama belum lolos.
4. Lapis peta terpisah ("Himawari 10 menit", "Abu satelit", "Awan konvektif"), dimuat sesudah kartu tercat.
5. Metode (lipat): data, deteksi, uji, catatan, termasuk vonis dan atribusi.

## 6. Gagal

- S3 NOAA tidak menjawab: tidak ada pemicu; status menjadi `terlambat` lalu `terputus`.
- Satu kanal hilang: detektor yang butuh kanal itu menulis `kanal_hilang`, detektor lain tetap jalan.
- Dispatch GitHub gagal: pindaian itu tidak ditandai dipicu; tik susul berikutnya mencobanya lagi selama masih dalam 6 jam.
- Run dipicu tetapi gagal atau melewati batas waktu 8 menit: penanda `dipicu` kedaluwarsa sesudah 20 menit tanpa `selesai`, lalu pindaian disusul paling banyak 2 kali lagi; sesudah itu `gagal_tetap` dan dihitung di `/api/status`.
- Duplikat (dua tik memicu pindaian sama sebelum `picu.json` tersimpan): run kedua membaca R2 `data/satelit/selesai/<pindai>` di langkah pertama dan keluar tanpa menulis (DESAIN-TEKNIS 3).
- Unggah R2 gagal: workflow merah, `jaga_pipa` mencatat; berkas lama tetap.
- Label belum menjangkau periode uji: vonis `tak dapat dinilai`, bukan lulus.
