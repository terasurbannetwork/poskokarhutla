# ALGORITMA: Siklus Bencana

Dokumen keempat dalam urutan otoritas. Kalah dari `KEPUTUSAN-AWAL.md` (KA), `PRD.md`, `ALUR.md`; menang atas dokumen di bawahnya. Versi 1.0, 10 Nov 2026.

Semua rumus berupa fungsi murni. Kasus uji tiap bagian dihitung tangan (vektor ID dan sidik ditambah cek `hashlib`, 10 Nov 2026) dan dipakai `RENCANA-UJI.md`. Python dan JS wajib sama (selisih paling besar 1e-9 untuk pecahan; bilangan bulat dan teks sama persis).

**Konvensi.** Label keyakinan: `resmi`, `terverifikasi`, `estimasi-model`, `asumsi-kebijakan`, `hipotesis`, `menunggu` (KA 8). Tiap keluaran membawa nilai, satuan, sumber, waktu, label. Data tidak ada = `null`, tampil "tidak ada" atau "menunggu", tidak pernah 0. Kunci wilayah = BPS 4 digit (KA 17). Angka antarsumber tidak dijumlah atau dirata-rata (KA 7). Pertanyaan KA bagian H dirujuk dengan kode U; pertanyaan baru memakai UA-n (bagian 10). Parameter tanpa sumber tertulis di riset ditandai `asumsi-kebijakan` dan hidup sebagai konstanta bernama di `scripts/siklus/konst.py` (kembaran `public/siklus/konst.js`, dijaga uji); yang belum bernilai ditulis `menunggu`, tidak ditebak.

---

## G0. Lapis gudang data

### G0.1 Siklus berkas

Tiga lapis di R2 `MEDIA` (KA B):

| Lapis | Awalan | Isi | Boleh diubah |
| --- | --- | --- | --- |
| mentah | `siklus/mentah/<sumber>/<YYYY>/<YYYY-MM-DD>.<ext>` (DT 5.1) | salinan apa adanya, bertanggal ambil | tidak pernah; hanya tambah |
| bersih | `siklus/bersih/<jenis>/<YYYY>.jsonl.gz` | dinormalkan: kunci BPS 4 digit, tanggal ISO, label keyakinan, baris rusak dibuang dan dihitung | ditulis ulang utuh oleh pipeline |
| saji | `siklus/saji/<fitur>/...` (DT 5.1) | agregat siap layar; satu-satunya lapis yang dibaca layar | ditulis ulang utuh |

Langkah tiap sumber (`siklus.yml`): (1) ambil dengan jeda minimal 2 detik; gagal (HTTP, timeout, 429): ulang paling banyak 3 kali jeda 2 detik, lalu pertahankan saji terakhir dan beri pil `menunggu` (ALUR 1), tidak diisi nol; (2) sidik isi mentah (G0.2) sama dengan berkas mentah terbaru: lewati unggah dan catat `tak_berubah`, berbeda: unggah berkas bertanggal baru; (3) normalkan ke bersih, hitung masuk, bersih, dibuang per alasan (masuk = bersih + dibuang); (4) agregasi ke saji setelah cek anggaran (G0.3); (5) tulis `siklus/saji/laporan_bersih.json` per sumber `{masuk, bersih, dibuang:{alasan:n}, ditandai:{alasan:n}, sidik_mentah, waktu_ambil}`.

Sumber berstatus `gagal` di `sumber.json` tidak diambil. Data raksasa (Overture, NEX-GDDP) dibaca di tempat dengan DuckDB, hanya agregat disimpan (KA 29).

### G0.2 Sidik isi

Sidik = SHA-256 heksadesimal huruf kecil atas byte. Berkas JSON: sidik kanonik atas teks UTF-8 hasil serialisasi dengan kunci terurut naik, pemisah `,` dan `:` tanpa spasi, tanpa lolos ASCII. Berkas bukan JSON: byte mentah. Dipakai melewati unggah dan mengunci keluaran uji; bukan fungsi keamanan. Label `terverifikasi`.

Vektor: sidik `abc` = `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`; `{"b":1,"a":2}` dan `{"a":2,"b":1}` sama-sama menjadi `{"a":2,"b":1}`.

### G0.3 Anggaran ukuran

Plafon awalan `siklus/` = 4 GB (KA 27; dihitung 4.000.000.000 byte, `asumsi-kebijakan`). Anggaran per lapis dan per fitur ditulis di `sumber.json` oleh tiket G0 (jumlahnya tidak melampaui plafon); angkanya `menunggu`, riset tidak memuatnya.

Untuk unggah berukuran `u` ke lapis L dengan terpakai `t_L` dan anggaran `a_L`:

```
terima  jika  t_L + u - u_lama <= a_L      (u_lama = ukuran berkas yang ditimpa, 0 bila baru)
tolak   jika  tidak; laporan memuat {lapis, berkas, u, t_L, a_L, kelebihan = t_L + u - u_lama - a_L}
```

`t_L` dibaca dari manifest `siklus/saji/manifest.json` yang pipeline tulis, bukan dari pindai R2. Berkas `public/` baru paling banyak 200 (KA 28), dihitung `git ls-files`; lebih dari itu uji gagal.

Kasus uji: a = 100 MB, t = 90 MB. Baru 15 MB: 105 > 100, tolak, kelebihan 5 MB. Baru 10 MB: 100, terima. Timpa 8 MB dengan 12 MB: 94, terima.


---

## F1. Buku Besar Kejadian

### F1.1 Satuan rekaman dan kunci jenis

Rekaman: `{sumber, kode_sumber, jenis (tuple), kab (BPS 4), tgl_mulai, nilai{}}`. Kunci jenis dari `kunci_kejadian.JENIS` (sepuluh kunci). Jenis berkode `()` (lainnya, wabah): `jenis_tak_dibandingkan`, disimpan, tidak dipasang.

Rekaman kembar (jenis, kab, hari) satu sumber digabung `satuan()`: nilai dijumlah (hanya di dalam satu sumber), `n_asal` dicatat.

Urutan kanonik sebelum diproses: sumber menurut prioritas (DIBI, Logbook Pusdalops, lintas bencana, gempa, karhutla, rob, lainnya), lalu `tgl_mulai`, lalu `kode_sumber`. Dengan urutan ini pembangunan ulang dari nol memberi ID sama.

### F1.2 Pembentukan ID `KJ-`

```
kunci_pendiri = jenis_utama + "|" + kab_utama + "|" + tgl_mulai_iso
jenis_utama   = kunci jenis rekaman pendiri, diurut naik lalu digabung "+" (banjir+longsor)
kab_utama     = kode BPS terkecil dari kab rekaman pendiri
d(k)          = SHA-256(UTF-8 k)                      32 byte
v(k)          = 5 byte pertama d(k), bilangan besar-ke-kecil (40 bit)
kode(k)       = 8 simbol, simbol ke-i = ALFABET[(v >> (35 - 5 i)) & 31], i = 0..7
ALFABET       = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"    (Crockford base32: tanpa I, L, O, U)
ID            = "KJ-" + tahun(tgl_mulai) + "-" + kode(kunci_pendiri)        panjang tepat 16
```

Satu skema untuk semua ID: kejadian dari pipeline, kejadian buatan staf, dan baris arsip R2. Tidak ada pembeda antara ID arsip dan ID hidup (rute mencari D1 dulu, lalu R2; DT 4).

Pendiri = rekaman pertama (urutan kanonik) tanpa pasangan (F1.4). ID dikeluarkan sekali dan disimpan; pasangan susulan tidak mengubahnya. Format rancangan internal; nomor induk resmi (Perban 1/2023 Pasal 8) tidak ditemukan, kolomnya kosong (U14).

Tabrakan (ID sama, `kunci_pendiri` beda, atau ID sudah terpakai di D1): hash ulang dengan `kunci_pendiri + "|" + n`, n = 2, 3, dan seterusnya sampai ID bebas. Panjang tetap 8 simbol, tanpa sufiks pada ID. Peluang tabrakan untuk 57.161 kejadian = n^2 / 2 / 2^40 = 0,0015 (batas atas; ID juga memuat tahun). ID tidak pernah dipakai ulang, juga untuk kejadian `dibatalkan` atau `digabung`.

Vektor (dihitung ulang dengan `hashlib`, 10 Nov 2026):

| Masukan hash | ID |
| --- | --- |
| `banjir\|3201\|2026-03-02` | `KJ-2026-9A2WGN3G` |
| `banjir\|3201\|2026-03-02\|2` (tabrakan pertama) | `KJ-2026-8N57ZZ0Y` |
| `banjir+longsor\|3201\|2026-03-02` | `KJ-2026-MT5Z0ZVT` |
| `banjir+longsor\|3201\|2026-03-02\|2` | `KJ-2026-K3JQG02Y` |

Karhutla. `K####` diberi ulang tiap hari (R1 I.1) sehingga hanya disimpan sebagai `pengenal_hari`, bukan `kode_sumber`. `kode_sumber` karhutla = `sel:<i>:<j>` dengan i = floor(lintang / 0,02), j = floor(bujur / 0,02) dari pusat kluster (sel 0,02 derajat, sama dengan `scripts/data/citra.py`), digabung kab BPS. Kluster di sel dan kab sama pada hari berbeda memakai `(karhutla, kode_sumber)` yang sama dan memperbarui `KJ-` yang sama. Kluster yang bergeser ke sel tetangga menjadi `kode_sumber` baru dan masuk pemasangan F1.4; tafsir "kompleks" (gugus sel) tidak bersumber dan tidak dibuat (UA-1).

`kode_sumber` per sumber: DIBI dan Logbook CSV `jenis|kab4|tgl` hasil `satuan()` (tanpa id baris); Logbook D1 `logbook:<id>`; lintas bencana `B0007` dan sejenisnya (stabil lewat `nomor.json` yang bisa kedaluwarsa); gempa `usgs:<eventid>` bila ada, kalau tidak `G0001`; rob, rumah rusak, korban `jenis|kab4|tgl`.

Penjaga kode ulang: baris pemetaan menyimpan `kunci_sumber = jenis|kab4|tgl` saat dipetakan. `(sumber, kode_sumber)` sama dengan kunci bergeser lebih dari jendela dianggap kode dipakai ulang: dicatat konflik, diperlakukan kode baru, `KJ-` lama tidak disentuh.

### F1.3 Multi-kabupaten

- Satu rekaman yang sendiri membawa daftar `kab[]` (lintas bencana, gempa): satu `KJ-` dengan `kab[]` terurut naik; `kab_utama` = terkecil (kolom `sk_kejadian.kab4`). Tiap kab dalam daftar mendapat satu baris `sk_kejadian_kab`, termasuk kab utama; indeks pemasangan memuat satu entri `(jenis, kab)` per baris itu.
- Rekaman satu-kab dari sumber yang memecah kejadian lintas kabupaten (DIBI membagi `jumlah_kejadian` 0,5): masing-masing mendapat `KJ-` sendiri (riset tidak punya data kedekatan kabupaten); gabung hanya oleh KO (F1.5).
- Rekaman satu-kab yang cocok dengan satu `KJ-` multi-kab lewat salah satu kab-nya: menambah entri ke `KJ-` itu.

### F1.4 Pemasangan antarsumber dan jendela hari

Tiap rekaman baru diproses berurutan:

1. **Cari pemetaan tepat** `(sumber, kode_sumber)`. Ada: perbarui `KJ-` itu (nilai, `terakhir`); selesai.
2. **Hitung kandidat**: `KJ-` aktif (bukan `digabung`, bukan `dibatalkan`) dengan irisan jenis tidak kosong, irisan kab tidak kosong, selisih hari `|tgl_rekaman - tgl_mulai_KJ| <= jendela`, dan yang belum punya entri dari sumber yang sama.
3. Tepat 1 kandidat: tambah baris `sk_kejadian_sumber`. 0 kandidat: `KJ-` baru, fase `terdeteksi`. Lebih dari 1: ditolak, masuk antrean PD dengan daftar kandidat; tidak ditebak (PRD F1-02, aturan DATA-DAMPAK).

Jendela hari per jenis (konstanta `JENDELA_JENIS`): `pasangkan(..., jendela=3)` memakai 3 hari untuk semua jenis dan riset tidak punya nilai lain, jadi semua jenis 3 (`kunci_kejadian.py`); untuk kekeringan, karhutla, gunungapi (berdurasi panjang) nilai lain menunggu UA-1. `MASA` di `kejadian.py` (cuaca 1, udara 2, gunungapi 3, kekeringan 14) mengatur `aktif:false`, bukan jendela pemasangan.

Dua mode: (a) **kumpulan sejarah** (DIBI lawan Logbook) memakai `pasangkan` rakus satu-satu urut selisih terkecil seperti `rekonsiliasi_dalops_dibi.py` (58,9 persen logbook terpasang ke DIBI, R3 bagian 4), seri diputus indeks urutan kanonik; (b) **masuk bertahap** ke `KJ-` yang ada memakai hitung kandidat di atas, karena ia keputusan identitas.

Kasus uji. `A` = banjir, 3201, mulai 2026-03-02 (DIBI).
- Logbook banjir 3201, 2026-03-04: selisih 2 hari, satu kandidat (A): tambah.
- Logbook banjir 3201, 2026-03-09: selisih 7 hari, nol: `KJ-` baru.
- Bila ada `B` = banjir 3201 mulai 2026-03-05 (kejadian terpisah) dan rekaman logbook 2026-03-03: selisih ke A = 1, ke B = 2, dua kandidat: ambigu, antrean.
- Vektor ID: `banjir|3201|2026-03-02` memberi `KJ-2026-9A2WGN3G`; `banjir+longsor|3201|2026-03-02` memberi `KJ-2026-MT5Z0ZVT`; sama untuk tiap permutasi urutan masuk. Kejadian kedua dengan kunci pendiri sama memberi `KJ-2026-8N57ZZ0Y` (hash `kunci|2`).
- Karhutla: kluster (-2,505; 114,003) hari ke-1 berkode K0003 dan hari ke-2 berkode K0011, keduanya kab 6211: i = floor(-125,25) = -126, j = floor(5700,15) = 5700, kode `sel:-126:5700` sama, tetap satu `KJ-`.

### F1.5 Gabung dan alias

- **Gabung** hanya manual oleh KO. Pemasangan masuk-bertahap yang menyentuh dua `KJ-` tidak menggabung, hanya antre. Fase berbeda: ditolak dengan pesan baku (ALUR 3.2).
- **Penyintas** = `KJ-` bertanggal mulai lebih awal; seri: ID leksikografis lebih kecil. Yang lain: fase `digabung`, kolom `ke` = penyintas, alias `(id_lama, id_baru, waktu, oleh)`; baris `sk_kejadian_sumber` pindah dengan `asal_id` = ID lama; `sk_kejadian_kab` penyintas = gabungan terurut, `kab4` penyintas tetap kab terkecil. Kejadian `digabung` disaring dari daftar.
- **Resolusi alias**: ikuti `ke` sampai baris berfase bukan `digabung`; tiap gabung menunjuk baris yang belum digabung dan lebih awal, jadi rantai tidak berputar (pengaman 32 langkah, gagal keras bila terlampaui). Tautan lama diarahkan lewat resolusi ini; ID lama tidak pernah dihapus atau dipakai ulang.
- **Tidak ada pecah.** Gabung yang salah dibetulkan lewat koreksi manual: KO memindahkan satu baris `sk_kejadian_sumber` ke `KJ-` lain (atau ke `KJ-` baru lewat F1.2) dan perpindahan itu tercatat di `sk_jejak`. `KJ-` yang sudah `digabung` tidak dihidupkan kembali.

Kasus uji. A (03-02) dan B (03-05) digabung: B fase `digabung`, `ke` = A. A digabung ke C (03-01): resolusi(B) = B->A->C. Baris sumber asal B yang salah gabung dipindah KO ke `KJ-` baru: ID baru dari F1.2, jejak tercatat, B tetap `digabung`.

### F1.6 Pembersihan Logbook

Masukan: `data/pusdalops/logbook_kejadian.csv` (56.685 baris; 644 tanggal kosong, sekitar 10 tahun mustahil) dan DIBI harian. Aturan berurutan; yang dibuang dihitung per alasan (S1):

| Urut | Alasan | Aturan | Tindakan |
| --- | --- | --- | --- |
| 1 | `tanggal_kosong` | tanggal mulai kosong atau tak terurai | buang |
| 2 | `tanggal_mustahil` | tahun < 2011 (awal rentang riwayat) atau tanggal > tanggal ambil | buang |
| 3 | `duplikat_persis` | semua kolom sama dengan baris sebelumnya yang masih tinggal | simpan yang pertama; `asumsi-kebijakan` (riset tidak membuktikan ada duplikat; boleh dicabut) |
| 4 | `wilayah_belum_terpetakan` | `kab_kunci` hasilnya `None` (sekitar 7 persen tidak terisi) | tandai, simpan, masuk antrean pilih manual |
| 5 | `jenis_tak_dibandingkan` | `kunci_jenis` = `()` | tandai, simpan, tidak dipasang |
| 6 | `nilai_tak_sah` | kolom dampak negatif atau bukan angka | nilai menjadi `null`, baris tetap |

Invarian: `masuk = bersih + dibuang(1..3)`. Batas 2011 adalah batas rentang data (R1 A.2), bukan peraturan. Baris logbook per kejadian tidak masuk `public/`.

Kasus uji (10 baris: 2 tanggal kosong, 1 tahun 2923, 1 duplikat persis, 1 kab tak terpetakan, 1 jenis lain, 4 biasa): `masuk 10, bersih 6, dibuang {tanggal_kosong 2, tanggal_mustahil 1, duplikat_persis 1}, ditandai {wilayah_belum_terpetakan 1, jenis_tak_dibandingkan 1}`; 6 + 4 = 10.

### F1.7 Angka berdampingan dan selisih

Untuk tiap metrik m (meninggal, hilang, luka, terdampak, mengungsi, rumah rusak berat, sedang, ringan) pada satu `KJ-`, ambil nilai tiap sumber yang melapor: `v_s` (bukan `null`). Sumber yang belum melapor tampil "belum ada laporan".

```
n         = jumlah sumber dengan v_s bukan null
selisih   = maks(v_s) - min(v_s)                 bila n >= 2, selain itu tidak ada
arah      = nama sumber bernilai maks dan min
persen    = selisih / maks(v_s) x 100            hanya bila maks > 0
```

Tidak ada kolom "total gabungan" dan tidak ada rata-rata. Nilai 0 yang dilaporkan adalah angka; `null` bukan. Label kolom = label sumbernya. Karhutla: luas dan titik hanya dari sistem kita (KA 6). Untuk karhutla, metrik `terdampak` dari sumber bukan sistem kita bernilai `null` dan tidak tampil (tidak ditulis angka, tidak ditulis 0); sumber DIBI atau Logbook yang membawa `terdampak` karhutla tetap tersimpan di lapis `bersih` tetapi tidak sampai ke `saji` dan layar (INV-7).

Kasus uji. meninggal DIBI 12, Logbook 15, sistem null: n = 2, selisih 3 ("Logbook lebih tinggi 3"), persen 20. Sumber ketiga 9: selisih 6, persen 40. DIBI 0 dan Logbook null: n = 1, tanpa selisih.

### F1.8 Fase kejadian dari sinyal

Fase mengikuti ALUR 2.1. Otomatis hanya dua hal: membuat `terdeteksi` (F1.4) dan menandai `siap_verifikasi` bila `KJ-` punya entri dari paling sedikit 2 nama sumber berbeda. Perpindahan fase dicatat atas nama PD atau KO; sistem tidak memindahkannya (UA-2).

```
basi = (tanggal_hari_ini - terakhir) > BASI_HARI(3)  untuk fase terdeteksi   (kejadian.js; hanya tampilan)
```

Kasus uji: `KJ-` dari DIBI saja: `terdeteksi`. Logbook ditambahkan: `siap_verifikasi`, fase tetap `terdeteksi`. `terakhir` 2026-03-02, hari ini 2026-03-06: 4 > 3, tampil basi, fase tidak berubah.

---

## F2. Peta Paparan per Bangunan

### F2.1 Agregasi bangunan: grid dan desa

Masukan: `grid_<prov>.json` `{lat0, lon0, step, cells[[i,j,n,luas_m2]]}`, `halus_<prov>.json` (110 m), `kec.json`; Open Buildings v3, ambang keyakinan 0,70 (U11, tertulis di tiap keluaran). Pusat sel = `(lat0 + (i + 0,5) x step, lon0 + (j + 0,5) x step)`, step 0,01 derajat.

- **Sel**: `n` = bangunan berkeyakinan >= 0,70 pada sel; `luas_m2` = jumlah luas jejak. Provinsi tanpa grid: `terliput:false`, "tidak terliput", bukan 0 (PRD F2-01).
- **Kecamatan**: jumlah `n` sel yang pusatnya dalam poligon kecamatan (`kec.json` bila sudah ada).
- **Desa**: poligon desa bila ada; bila belum, sel halus ditetapkan ke titik-pusat desa Dukcapil terdekat dalam kecamatan yang sama, jarak `d^2 = dlat^2 + (cos(lat0) x dlon)^2` (Voronoi). Ketelitian rendah; riset tidak punya poligon desa nasional (UA-3).
- Overture (dibaca di tempat) hanya jumlah dan luas jejak; tinggi dan jenis terisi di bawah 2 persen sehingga tidak dipakai (R2).

Batas: bangunan terdeteksi, komisi dan omisi tidak dikoreksi. Label `estimasi-model`. Tiap layar F2 menulis keterbatasan ini beserta presisi +-0,8 km dan fakta bahwa kelas InaRISK tidak resmi.

### F2.2 Silang dengan zona bahaya

Bangunan (sel halus) dianggap di zona bila pusat selnya di dalam poligon zona (titik-dalam-poligon), atau dalam radius untuk karhutla. Galat posisi paling besar setengah diagonal sel: 0,01 derajat = 1,112 km, setengah diagonal 0,79 km, jadi +-0,8 km (sama dengan `paparan_bangunan.py`); sel halus 110 m sekitar +-0,08 km. Sel yang menyilang batas zona tidak dibagi (`asumsi-kebijakan`).

Zona: karhutla = radius 1, 3, 5 km dari kluster aktif dan jejak 72 jam (kumulatif; kode menang bila berbeda); banjir = poligon `kejadian_aktif_geo.json`; gempa = pita MMI (F3.1); gunung api = KRB I, II, III; rob `tersedia:false` (tidak ditulis nol).

### F2.3 Kelas bahaya InaRISK per sel

Raster InaRISK (H antara 0 dan 1) tidak disimpan. Ambil H di pusat tiap sel halus (110 m, sepadan raster 100 m) lewat ImageServer `gis.bnpb.go.id`; tanpa `halus`, di pusat sel 0,01 derajat dan keluaran berlabel kasar.

```
nodata / gagal ambil -> kelas null ("tidak terliput"), bukan rendah
H < 0,33             -> rendah
0,33 <= H <= 0,66    -> sedang
H > 0,66             -> tinggi          (U12 bawaan, sama dengan terpapar.py)
bangunan per kelas   = jumlah n sel halus dengan kelas itu
```

Bila U12 dibalik (tinggi bila H >= 0,67), hanya H dalam (0,66; 0,67) berpindah. Keluaran memuat `batas_versi`, label `estimasi-model`, dan catatan sumber resmi batas tidak ditemukan.

Kasus uji. Sel halus n = 10, 20, 30, 40; H = 0,20; 0,33; 0,66; 0,70: rendah 10, sedang 50, tinggi 40 (jumlah 100); H = 0,661 tinggi.

### F2.4 Fasilitas vital

Kategori mengikuti InaRISK (rumah sakit, puskesmas, sekolah, madrasah, bandara, pelabuhan, obvitnas) ditambah ibadah, kantor pemerintah, jalan, jembatan (PRD F2-05); daftar baku Perka tidak ditemukan.

- **Titik**: hitung titik dalam zona, tiap sumber sendiri dan berdampingan: Dapodik/EMIS `sekolah.json` (65.551), Geofabrik OSM, Overture places, Wikidata. Tanpa de-duplikasi atau penjumlahan antarsumber; label `estimasi-model` (cakupan). Pemetaan tag OSM ke kategori: `asumsi-kebijakan` (`TAG_OSM`).
- **Jalan** (Geofabrik): jumlah panjang ruas yang titik tengahnya di zona; batas atas (seperti `dampak.py`).
- Sekolah Kita dan SIRS tidak dipakai (izin Pusdatin, tidak terjangkau).

Kasus uji. 5 sekolah Dapodik dan 3 OSM di zona: "Dapodik 5, OSM 3, selisih 2", bukan 8. Ruas jalan bertitik tengah di zona 4 km dan 2,5 km, satu di luar: 6,5 km.

### F2.5 Pembagian jiwa: tiga sumber berdampingan

Untuk zona Z, jiwa terpapar dihitung terpisah per sumber, tanpa dirata-rata:

```
WorldPop (per kec K):   J_wp  = jumlah_K  P_K x (n_terpapar_K / n_K)
Dukcapil (per desa d):  J_dk  = jumlah_d  P_d x (n_terpapar_d / n_d)       (desa tanpa bangunan terdata: titik pusat dalam zona = 1, di luar = 0)
GHSL POP (100 m):       J_gh  = jumlah nilai piksel yang pusatnya di Z
selisih = maks(J) - min(J)
```

Pembagian sebanding jumlah bangunan: `asumsi-kebijakan`. Hanya jumlah jiwa, tanpa NIK atau registri (KA 12-13). Tahun dan definisi tiap sumber berbeda; selisih tertulis, tidak dikoreksi. Label `estimasi-model`.

Kasus uji. Kecamatan WorldPop 12.000 jiwa, 4.000 bangunan, 1.000 terpapar: 3.000. Tiga desa Dukcapil (jiwa 5.000/4.000/3.000; bangunan 1.600/1.400/1.000; terpapar 600/300/100): 1.875 + 857,14 + 300 = 3.032,14. GHSL (fixture) 2.700. Tampil "WorldPop 3.000, Dukcapil 3.032, GHSL 2.700, selisih 332".

---

## F3. Kaji Cepat Otomatis

Keluaran F3 selalu rentang `[bawah, atas]` berlabel `estimasi-model` (KA 9), tidak pernah angka resmi BNPB. Model yang belum lolos uji balik tetap tampil dengan pil hipotesis (KA 11).

### F3.1 Gempa: guncangan

MMI_K di pusat kecamatan (`pusat_kec.json`) dari (a) grid ShakeMap USGS (`cont_mmi.json` atau `coverage_mmi_low_res`) bila terbit, atau (b) `guncangan.mmi_kecamatan` (BSSA14, Zhao 2006, Worden 2012; Vs30 400 m/s; hanya nilai tengah) bila belum; pada (b) status `menunggu_data` dan MMI tampil `estimasi-model` dengan galat kalibrasi.

Galat kalibrasi wajib tampil (`kalibrasi_kerusakan.json`, 8 gempa kerak, 3 rangkaian Lombok tidak saling bebas): `kalib` 3,0586 dan `faktor_loo` 5,341 (model dapat meleset sampai 5,341 kali atau bagi). Ditulis, tidak dipakai melebarkan rentang (cara menerapkannya tidak bersumber).

### F3.2 Gempa: korban jiwa

Seperti `pager.per_mmi`: `k = min(10, int(MMI + 0,5))`, MMI < 3,5 tidak dihitung, `k` dihitung bila >= 4; P_K dari `penduduk.json` (WorldPop); `per[k]` = jumlah P_K berkelas k.

```
Model PAGER (koefisien Indonesia, fatality.xml v2.2): theta = 13,248768; beta = 0,150846
  v_P(k) = Phi( ln(k / theta) / beta )            Phi(x) = 0,5 (1 + erf(x / akar 2))
  K_P    = jumlah_k per[k] x v_P(k)
Model ITB:  v_I(k) = 10^(0,62275231 x k - 8,03314466),  k >= 4
  K_I    = jumlah_k per[k] x v_I(k)
Rentang:    bawah = min( K_P / 4 , K_I ) ;  atas = maks( K_P x 4 , K_I )
```

Pita 4 = `PITA` di `pager.py` (`asumsi-kebijakan`); ITB tanpa pita. Model dasar menunggu pemilik (U13): keduanya berdampingan. Kelas siaga memakai K_P: hijau < 1, kuning 1 sampai 99, oranye 100 sampai 999, merah >= 1000. Tidak dihitung: tsunami dan likuefaksi (Palu 2018: PAGER 86 lawan nyata 4.140). Layar memperingatkan bahwa `faktor_loo` 5,341 melebihi `PITA` 4, rentang bisa terlalu sempit. Rumah rusak gempa: tidak ada kurva kerapuhan resmi (R3 3.3), keluaran `menunggu`, bukan 0.

Kasus uji. `per = {6: 1.000.000; 7: 500.000; 8: 200.000}`. v_P(6) = 7,549e-8, v_P(7) = 1,1714e-5, v_P(8) = 4,1256e-4. K_P = 0,0755 + 5,857 + 82,51 = 88,44. v_I(6) = 5,051e-5, v_I(7) = 2,119e-4, v_I(8) = 8,889e-4: K_I = 50,5 + 105,9 + 177,8 = 334,2. Rentang `[min(22,1; 334,2); maks(353,8; 334,2)] = [22,1; 353,8]` jiwa; kelas PAGER kuning (88,4). MMI 7,5 dibulatkan ke 8; MMI 3,4 tidak dihitung.

### F3.3 Banjir

Tahap pertama (KA 19): poligon `kejadian_aktif_geo.json` x paparan F2 x `dampak.json`.

```
bangunan_terpapar = jumlah n sel halus dengan pusat dalam poligon
jiwa_terpapar     = jumlah_K P_K x (n_terpapar_K / n_K)                      (F2.5, tiga sumber berdampingan)
batas_atas_jam1   = jumlah_{K berlevel Siaga atau Awas} P_K                    (seluruh kecamatan, bukan hanya bagian tergenang)
sekolah, faskes   = hitungan titik dalam poligon (F2.4); jalan berisiko = batas atas
```

Rentang `[jiwa_terpapar, batas_atas_jam1]`. Poligon bukan genangan terukur (Sentinel-1 tanpa pembaca, GFM hanya DKI): ini paparan, bukan dampak. Tanpa kedalaman, JRC tidak dijalankan ("kedalaman belum tersedia").

Bila kedalaman d (m) ada: kurva Asia JRC (Huizinga dkk 2017), hunian `(d; f)` = (0;0), (0,5;0,33), (1;0,49), (1,5;0,62), (2;0,72), (3;0,87), (4;0,93), (5;0,98), (6;1); niaga dan industri dari R3 3.2. Interpolasi linear (`asumsi-kebijakan`), f = 0 untuk d <= 0 dan 1 untuk d >= 6.

```
kerusakan = f(d) x D_maks x luas_m2          D_maks Asia (euro/m2, harga 2010): hunian 111, niaga 138, industri 114
rupiah    = kerusakan x kurs x faktor_harga   (kurs, faktor_harga: asumsi-kebijakan, belum bernilai)
```

Tanpa kurs dan faktor harga, rupiah `menunggu`; hanya euro 2010 tampil.

Kasus uji. Hunian, d = 0,75 m: f = 0,33 + (0,49 - 0,33) x (0,75 - 0,5) / 0,5 = 0,41. Luas 50 m2: 0,41 x 111 x 50 = 2.275,5 euro (harga 2010). d = 7 m memberi f = 1.

### F3.4 Karhutla dan gunung api

- **Karhutla**: hanya paparan, bangunan dan jiwa pada radius 1, 3, 5 km; titik panas, luas, kluster hanya dari sistem kita (KA 6). Tanpa kerusakan atau korban.
- **Gunung api**: hanya paparan per kelas KRB I, II, III. Tanpa kerusakan atau korban.
- **Jenis lain**: "belum ada perkiraan otomatis" (ALUR 3.4). Label semua `estimasi-model`.

Kasus uji: sel pusat berjarak 0,9 km, 2,5 km, 4,9 km, 6 km dari kluster dengan n = 100, 200, 300, 400: radius 1 km = 100, 3 km = 300, 5 km = 600 (kumulatif); sel 6 km tidak dihitung.

### F3.5 Uji balik terhadap DIBI dan rumah rusak

Tiap kejadian arsip i dengan keluaran `m_i` dan pengamatan `o_i` (DIBI meninggal atau `rr_*`, atau `rumah_rusak`):

```
g_i      = ln( m_i / o_i )                        hanya bila m_i > 0 dan o_i > 0; selain itu dicatat `tak_dihitung`
bias     = rerata g_i
faktor   = exp( akar( rerata g_i^2 ) )            (cara `faktor_loo` di kalibrasi_kerusakan.json)
cakupan  = (jumlah i dengan bawah_i <= o_i <= atas_i) / n
```

Tampil: n, `tak_dihitung`, bias, faktor, cakupan. Ambang "lolos" tidak ada di riset (UA-4); label tetap `estimasi-model` (KA 9, S6). Tiap sumber pengamatan diuji terpisah, tidak digabung.

Kasus uji. (m, o): (555; 5.700), (149; 104), (105; 20). g = -2,3293; 0,3596; 1,6582; bias -0,1038; rms = akar((5,4256 + 0,1293 + 2,7498) / 3) = 1,6638; faktor 5,279. Cakupan dengan `[m/4; 4m]`: 5.700 di luar `[138,8; 2.220]`, 104 di dalam, 20 di luar `[26,3; 420]`: 1/3.

---

## F4. Jitupasna ke R3P Digital

### F4.1 Klasifikasi tingkat kerusakan

Persentase kerusakan fisik `p` (Perka 15/2011 Formulir 05):

```
p > 70      -> RB (rusak berat)
30 <= p <= 70 -> RS (rusak sedang)
p < 30      -> RR (rusak ringan)
```

"Hancur total" adalah isian terpisah, tidak dilebur ke RB (peta baku menunggu, U10). `rumah_rusak.tingkat` (berat, sedang, ringan) dipetakan ke RB, RS, RR; tanpa tabel rumah rusak kedua. Kasus uji: p = 70 -> RS; 70,01 -> RB; 30 -> RS; 29,99 -> RR.

### F4.2 Harga satuan terindeks

Harga dasar `h_ref` per sektor dan tingkat diisi manual dari dokumen HSBGN atau Perka di pustaka, `asumsi-kebijakan` (U4); tidak ada API harga PUPR.

```
h = h_ref x ( IKK_k / IKK_ref ) x ( IHPB_t1 / IHPB_t0 )
```

- IKK (BPS var 2515) hanya dalam tahun sama; kota acuan berganti per tahun (2025 Surabaya = 100, 2024 Banjarmasin = 100). `IKK_ref` = wilayah dasar harga dokumen.
- IHPB (var 1018) bulan dokumen dan bulan kejadian, hanya pada seri berdasar sama (dasar 2023 = 100 sejak Jan 2025); melintasi patahan dasar: `menunggu`.
- Harga kosong: `menunggu`, bukan nol.

### F4.3 Nilai kerusakan

```
V_s = jumlah_t ( n_{s,t} x h_{s,t} )         t di {hancur_total, RB, RS, RR}; n_{s,t} unit fisik rusak sektor s
V   = jumlah_s V_s                            (satu dokumen)
```

Monoton: `h_hancur >= h_RB >= h_RS >= h_RR`; pelanggaran ditandai, tidak diperbaiki. Label `asumsi-kebijakan` (harga); bukan angka resmi sampai ditinjau KO.

Kasus uji (rumah). RB 10 x Rp100 juta, RS 20 x Rp50 juta, RR 30 x Rp20 juta: Rp2.600 juta. IKK 95/100 memberi 2.470 juta; IHPB 118,0/112,0 memberi Rp2.602,32 juta. `h_RS` 120 juta > `h_RB` 100 juta: bendera monoton.

### F4.4 Nilai kerugian

Perka 15/2011 hal. 40-41: identifikasi komponen kerugian dan taksir berdasarkan asumsi, misalnya lama pemulihan:

```
L_s = jumlah_c ( arus_c x bulan_c )      arus_c (Rp per bulan) dan bulan_c (lama pemulihan): isian per baris `jenis='rugi'`, kolom `komponen`, `arus_rp`, `bulan` (DT 3.3); nilai_rp baris = arus_rp x bulan
```

Parameter isian `asumsi-kebijakan`, tanpa faktor bawaan. Tiga penanda (Kotak 1 hal. 41): hitung ganda (kunci komponen sama di dua sektor), cakupan (sektor tanpa isian: "kosong"), kewajaran (`V_s <= jumlah_t n_{s,t} x h_{s,hancur}` dan monoton). Kasus uji: `air_minum` terisi di permukiman dan infrastruktur: bendera hitung ganda; sektor ekonomi tanpa baris: bendera kosong.

### F4.5 Kebutuhan dan peta ke lima sektor R3P

```
Kebutuhan_s = V_s (harga sama) + jumlah_kegiatan ( volume x satuan_biaya x IKK_k / IKK_ref )     kegiatan tambahan isian manual
```

Tanpa faktor bangun lebih baik (tidak bersumber). Pemetaan ke lima sektor Perban 5/2017 Pasal 8 ayat (2), tafsir bawaan menurut nama subsektor R3 1.2, menunggu U10:

| Jitupasna | R3P |
| --- | --- |
| perumahan | permukiman |
| jalan dan jembatan, telekomunikasi, air bersih dan sanitasi | infrastruktur |
| pertanian, perikanan, IKM, perdagangan, pariwisata | ekonomi |
| kesehatan, pendidikan, agama, sosial budaya | sosial |
| lingkungan, sarana pemerintahan, keuangan dan perbankan, ketertiban dan keamanan | lintas sektor |

Subsektor di luar tabel: `belum_terpeta`, dilaporkan terpisah. Invarian: lima sektor + `belum_terpeta` = total Jitupasna.

### F4.6 Stimulan dan dana tunggu hunian

```
Stimulan   = n_RB x 60 juta + n_RS x 30 juta + n_RR x 15 juta                  asumsi-kebijakan (U8), sumber sekunder
DTH        = KK x Rp600.000 x 3 bulan                                          Juklak DTH 1/2023 (repo)
```

Stimulan adalah bantuan, bukan nilai kerusakan. Tarif 50/25/10 dan 80 juta tidak dipakai sebelum U8 diputus. Kasus uji: 10 RB, 20 RS, 30 RR memberi 600 + 600 + 450 = Rp1.650 juta; 100 KK memberi Rp180 juta.

### F4.7 Waktu: batas 90 hari dan PDNA

```
sisa_90      = 90 - (hari_ini - tanggal_mulai_tanggap_darurat)      (Perban 5/2017 Pasal 2; <= 0: tampil "lewat batas", bukan penolakan)
PDNA_BNPB    = tanggal_berakhir_darurat - 14 hari ;  PDNA_BPBD = tanggal_berakhir_darurat - 7 hari     (Perka 15/2011 hal. 16)
```

Kasus uji: tanggap mulai 2026-08-01, hari ini 2026-09-15: berlalu 45 hari, sisa 45. Darurat berakhir 2026-09-30: PDNA BNPB 2026-09-16, BPBD 2026-09-23.

### F4.8 Tahapan, persen realisasi, macet

Per kegiatan dari `pemulihan` (target, realisasi, satuan):

```
persen_i = realisasi_i / target_i x 100      target kosong atau 0 -> "menunggu"; realisasi > target ditandai anomali, tampil maks 100
persen_total (tertimbang nilai) = jumlah_i ( nilai_i x persen_i / 100 ) / jumlah_i nilai_i       hanya bila semua nilai_i terisi; selain itu "menunggu"
```

Satuan berbeda tidak dijumlah; pembobot rupiah `asumsi-kebijakan`. Rantai dana `nilai_cair <= nilai_disetujui <= nilai_usulan` dijaga `cek` meja. Macet: tahap sama lebih dari `rehab_macet_hari` = 60 hari sejak masuk tahap (`jam_aturan.json`, `asumsi: true`, tanpa pasal), dibaca saat halaman dibuka, bukan kueri pindai di cron.

Kasus uji. A nilai 800 juta target 100 realisasi 50; B 200 juta target 10 realisasi 10: 50 dan 100, total (400 + 200) / 1.000 = 60. `usulan` masuk 2026-08-01, dibaca 2026-10-05: 65 hari, macet; dibaca 2026-09-30 (60 hari): belum.

---

## F5. Renkon Hidup dan Gladi

### F5.1 Kebutuhan dasar per skenario (Perka 7/2008)

Masukan: `J` jiwa terpapar (estimasi F2 atau F3, tanpa registri), `h` hari, `KK` keluarga (isian; tidak diturunkan dari J, ukuran keluarga tidak bersumber).

| Komponen | Rumus | Satuan |
| --- | --- | --- |
| penampungan | 3 x J | m2 |
| beras | 0,4 x J x h | kg |
| makan (dapur umum) | 2 x J x h | porsi |
| energi | 2.100 per orang per hari (info) | kkal |
| air bersih | J x ( 7 x min(h; 3) + 15 x max(h - 3; 0) ) | liter |
| air minum | 2,5 x J x h | liter |
| jamban | ceil(J / 20) | unit |
| tempat sampah 100 L | ceil(KK / 10) | unit, `menunggu` bila KK kosong |
| sabun mandi | 0,25 x J x ceil(h / 30) | kg |
| sabun cuci | 0,2 x J x ceil(h / 30) | kg |

`ceil(h / 30)` bulan penuh: `asumsi-kebijakan`. Keluaran F5.1 hanya USULAN angka asumsi dampak; isian asumsi renkon tetap manual oleh staf, usulan tidak menimpa (PRD F5-03). Sphere 2018 (3,5 m2; air 15 liter; belum dibaca langsung) `hipotesis`, di samping, tidak menggantikan (U9). Standar `resmi`; keluaran `estimasi-model` karena J perkiraan.

Kasus uji. J = 1.000, h = 5: 3.000 m2; beras 2.000 kg; makan 10.000; air bersih 1.000 x (21 + 30) = 51.000 liter; air minum 12.500 liter; jamban 50; sabun mandi 250 kg, cuci 200 kg. Sphere: 3.500 m2 dan 75.000 liter berdampingan.

### F5.2 Kesenjangan stok LogPal dan personel

```
gap_b       = maks( 0 ; K_b - S_b )        S_b = stok kondisi `baik` di gudang wilayah; `rusak` dan `belum dinilai` tampil terpisah, tidak dihitung
surplus_b   = maks( 0 ; S_b - K_b )
```

Satuan beda: "satuan beda, menunggu". Stok tak ada di LogPal: "stok belum tercatat", bukan 0. Tanpa salinan stok; hanya barang yang berpadanan dengan komponen Perka (beras, air mineral) dihitung. Personel: `siap_tugas` dari `/petugas`; **riset tidak punya standar kebutuhan personel**, jadi target adalah isian KO `asumsi-kebijakan`, gap = maks(0; target - siap), tanpa target: "target menunggu".

Kasus uji. Beras K = 2.000 kg, S baik = 1.200, rusak 100: gap 800 (rusak tidak ikut). Air minum K = 12.500 liter, S baik = 15.000: gap 0, surplus 2.500. Tenda: "tidak punya padanan". Terigu: tidak ada baris LogPal: "stok belum tercatat".

### F5.3 Kesegaran renkon

Mengikuti `statusEfektif("renkon")` dan `public/inti/jam_aturan.json`; `reviu_terakhir` adalah kolom isian staf `sk_renkon.reviu_terakhir` (DT 3.4):

```
berlaku_sampai = tambahBulan(tgl_sah, 36)           hari-dalam-bulan dipangkas ke akhir bulan; Perban 2/2023 Pasal 21 ayat (1)
sisa           = berlaku_sampai - hari_ini           dalam hari
reviu_acuan    = tanggal terbaru dari {tgl_sah, reviu_terakhir};  reviu_jatuh = tambahBulan(reviu_acuan, 6)   Pasal 21 ayat (2)
status         = kedaluwarsa     bila sisa < 0
                 segera_habis    bila sisa <= 90            (renkon_segera_hari 90, asumsi: true)
                 perlu_reviu     bila reviu_jatuh < hari_ini
                 berlaku         selain itu
```

Dibaca saat halaman dibuka. Tanggal sah kosong: `menunggu`. R3 menyebut Lampiran 1.8, `jam_aturan.json` Pasal 21 ayat (1); diikuti yang kedua karena dipakai meja (UA-5).

Kasus uji. `tgl_sah` 2024-02-29: berlaku_sampai 2027-02-28 (dipangkas). Hari ini 2026-12-15: sisa 75, `segera_habis`; 2027-03-01: sisa -1, `kedaluwarsa`. `tgl_sah` 2025-01-10 tanpa reviu, hari ini 2025-07-11: reviu_jatuh 2025-07-10, `perlu_reviu`.

### F5.4 Skor kesiapan gladi

Juklak 4/2026 dan riset tidak punya rumus skor; ini rancangan sementara `asumsi-kebijakan`, bobot sama, pola `RAPOR` (komponen tanpa data dilewati, bobot dinormalkan). Komponen 0 sampai 1:

| Komponen | Nilai |
| --- | --- |
| K1 kesegaran renkon | 0 bila `kedaluwarsa`, 1 selain itu |
| K2 kecukupan logistik | rerata atas barang bertanda stok tercatat dari min(1; S_b / K_b) |
| K3 personel | min(1; siap / target); lewat bila target kosong |
| K4 tindak lanjut | rekomendasi gladi terakhir yang tertaut ke renkon / seluruh rekomendasi; lewat bila belum ada gladi |

```
skor = jumlah_{k tersedia} K_k / (banyak komponen tersedia) x 100       tampil "n dari 4 komponen"
```

Rerata per barang karena satuan berbeda. Skor `menunggu` bila komponen tersedia < 2. Kasus uji: K1 = 1; K2: beras 1.200/2.000 = 0,6 dan air 1 (stok 60.000 lawan 51.000): 0,8; K3: 40/50 = 0,8; K4 lewat. Skor = (1 + 0,8 + 0,8) / 3 x 100 = 86,67, "3 dari 4 komponen".

### F5.5 Pemutaran ulang kejadian

Masukan: garis waktu kejadian F1 yang sudah dipromosikan ke D1 (kejadian yang masih di arsip R2 tidak bisa jadi gladi sebelum dipromosikan; DT 4), entri `(waktu, sumber, metrik, nilai)` dari `logbook_entri` dan `sk_kejadian_sumber`, tanpa nama korban; urut waktu, seri oleh sumber lalu kode. `T_i = waktu_i - waktu_pertama` (jam); percepatan `c >= 1` opsional, `T_i' = T_i / c` (bawaan 1, tanpa sumber nilai lain). Nilai diinjeksikan apa adanya, tidak disimulasikan atau diinterpolasi; bukan simulasi genangan. Replay Maret 2025 tetap satu kejadian, lisensi NC, "Model sederhana, bukan prakiraan". Label `terverifikasi`.

Kasus uji. Entri 2026-03-01 08:00 (meninggal 0), 11:30 (3), 2026-03-02 08:00 (5): T = 0; 3,5; 24 jam. Dengan c = 2: 0; 1,75; 12.

---

## F6. Risiko Masa Depan dan Tata Ruang

Semua keluaran F6 berlabel `hipotesis` (KA 10, S9); sinyal perubahan terhadap dasar, bukan ramalan kejadian.

### F6.1 Indeks ETCCDI dari NEX-GDDP-CMIP6

Masukan harian `pr` (kg m-2 s-1) 0,25 derajat per model, skenario historical, ssp245, ssp585; `RR = pr x 86400` mm per hari; kalender tiap model diperiksa, tidak diasumsikan. Per sel dan tahun kalender y:

```
Rx1day(y) = maks RR harian di tahun y
Rx5day(y) = maks jumlah RR lima hari berurutan dalam tahun y (jendela tidak melintasi tahun)
CDD(y)    = rentang terpanjang hari berurutan dengan RR < 1 mm di tahun y
```

Hanya tiga indeks ini; CWD, R20mm, dan R95pTOT tidak dibuat (keputusan Tinjauan 1). Nilai kabupaten = rerata sel berpusat dalam poligon; tanpa sel di dalam, sel terdekat ke centroid (`asumsi-kebijakan`; grid sekitar 27 km lebih kasar dari banyak kabupaten, tertulis di layar). Potongan bbox belum teruji: `menunggu` sampai lolos di lab.

### F6.2 Periode, dasar, dan perubahan

Dasar = 1995-2014 (20 tahun, sama dengan dasar AR6 muka laut). Horizon: 2021-2040 (tengah 2030,5) dan 2041-2060 (tengah 2050,5). Skenario: ssp245 dan ssp585. Per model m dengan data lengkap untuk dasar dan periode (jumlah `n_model` ditulis):

```
P_m(skenario, periode) = rerata tahunan indeks pada 20 tahun periode
B_m                    = rerata tahunan indeks pada 1995-2014 (historical model yang sama)
delta_m                = P_m - B_m                         (mm untuk Rx, hari untuk CDD)
relatif_m              = delta_m / B_m x 100               hanya bila B_m > 0
```

Delta terhadap dasar model sendiri meniadakan galat sistematik (`asumsi-kebijakan`). CHIRPS v3 1995-2014 jadi pembanding bias `B_median - B_CHIRPS`, tidak dicampur ke delta (menyimpang dari PRD F6-02, UA-6).

### F6.3 Median dan rentang antarmodel

Dari `{delta_m}` (n model), diurut naik `x_0 ... x_{n-1}`: persentil p dengan interpolasi linear, posisi `q = (n - 1) x p`, nilai `x_floor(q) + (q - floor(q)) x (x_ceil(q) - x_floor(q))`. Median = p 0,5. Rentang = [p 0,17; p 0,83] (konvensi AR6 17-83 persen, `asumsi-kebijakan` untuk himpunan model). Tampil juga `n_model_positif / n`; tanpa rata-rata antarskenario.

Kasus uji. delta (n = 5) = -2; 0; 3; 5; 10. Median = 3. p17: q = 0,68, nilai = -2 + 0,68 x 2 = -0,64. p83: q = 3,32, nilai = 5 + 0,32 x 5 = 6,6. Rentang [-0,64; 6,6]; model positif 3/5.
Satu model (4 tahun saja): Rx1day = 80, 100, 120, 100 mm: P = 100, B = 90, delta 10 mm, relatif 11,1 persen.

### F6.4 Muka laut

AR6 relatif 1995-2014, median dan rentang mungkin 17 sampai 83 persen (R3): 2050 ssp245 0,20 (0,17 sampai 0,26) m; ssp585 0,23 (0,20 sampai 0,29) m. Horizon 2041-2060 memakai nilai 2050 ini; 2021-2040 tidak ada di tabel R3: `menunggu` sampai rekaman Zenodo AR6 dibaca. Nilai global dipakai sampai titik regional (`location_list.lst`, PSMSL) dibaca, lalu menggantikannya dan disebut. Penurunan muka tanah tidak dihitung (tertulis). Keluaran meter, bukan area tergenang (tanpa DEM).

### F6.5 Pertumbuhan bangunan di zona bahaya (GHSL)

GHS-BUILT-S R2023A 100 m, luas terbangun m2 per piksel; epoch 2015 dan 2020 berbasis pengamatan, 2025 dan 2030 model (R2). Untuk kabupaten k dan zona Z (F2: kelas InaRISK tinggi atau poligon KRB), epoch e:

```
B_Z(e) = jumlah nilai piksel pusatnya di Z ;  B_k(e) = untuk seluruh kabupaten ;  A_Z, A_k = luas
CAGR_Z = ( B_Z(e2) / B_Z(e1) )^(1 / (e2 - e1)) - 1                       bila B_Z(e1) > 0
indeks konsentrasi = ( (B_Z(e2) - B_Z(e1)) / (B_k(e2) - B_k(e1)) ) / ( A_Z / A_k )     bila penyebut > 0 dan B_k tumbuh
```

Indeks > 1: pertumbuhan terkonsentrasi di zona melebihi porsi luasnya. 2015-2020 berlabel pengamatan, 2020-2030 model; keduanya `hipotesis`. GHSL mentah belum diunduh: `menunggu`. Tata ruang: irisan PIPPIB dan konsesi dengan Z (ha); RTRW tidak otomatis (tertulis).

Kasus uji. B_Z(2015) = 40.000, B_Z(2020) = 46.000 m2: CAGR = 1,15^0,2 - 1 = 2,83 persen. B_k: 400.000 menjadi 420.000. Porsi tumbuh = 6.000 / 20.000 = 0,30. A_Z / A_k = 0,10. Indeks = 3,0.

### F6.6 Label

Kamus `yakin` kemitraan dipetakan ke enam nilai KA 8 sesuai KA 27b. Keluaran per kabupaten satu berkas per provinsi di R2.

---

## F7. Pintu Tunggal

### F7.1 Peran dan fase

```
peran: Super Admin -> SA ; sesi staf (pusdalops, koordalops, pimpinan) -> PD, KO, PM ; akun instansi BPBD -> BP (wilayahnya) ; selain itu WG
fase aktif untuk wilayah W (bisa lebih dari satu sekaligus):
  tanggap       : ada KJ- berfase tanggap atau transisi di W
  pascabencana  : ada KJ- berfase pemulihan, atau R3P berstatus draf sampai berjalan
  kesiapsiagaan : ada renkon berstatus persiapan sampai segera_habis, perlu_reviu, atau gladi dirancang
  pengurangan risiko : selalu (paparan F2, masa depan F6)
```

Peran menyaring kartu menurut matriks PRD 3.1; WG hanya kartu publik (ringkasan resmi kejadian, ringkasan F6 berpil `hipotesis`, tautan publik).

### F7.2 Urutan prioritas situasi

Urutan = (kelas naik, urgensi naik, nama naik); urutan kelas rancangan `asumsi-kebijakan` (tanpa sumber; pemilik boleh mengubah). Kelas 1: kejadian tanggap atau transisi di W (urgensi: hari sejak mulai tanggap, terbaru dulu). Kelas 2: tenggat berjalan (sisa 90 hari R3P, PDNA, renkon `segera_habis` atau `kedaluwarsa`, rehab macet), hari tersisa naik, negatif paling awal, tanpa tenggat di akhir. Kelas 3: pemulihan berjalan, persen realisasi naik. Kelas 4: kesiapsiagaan (renkon `perlu_reviu`, gladi, kesenjangan stok). Kelas 5: pengurangan risiko (F2, F6), nama.

Kartu ke layar yang belum hidup tidak tampil. Asisten AI memakai alat publik MCP dan menyebut label hasil alat (F7-03); tanpa rumus tambahan.

Kasus uji. W, peran KO: banjir `tanggap` hari ke-2 (kelas 1); R3P sisa 12 hari (2); renkon `segera_habis` sisa 40 hari (2); F6 (5). Urutan: kejadian, R3P, renkon, F6. Peran WG di W sama: kejadian lalu F6 (dua kartu publik).

---

## 10. Konflik, asumsi, dan pertanyaan baru

Konflik dan keputusan di sini: (1) PRD F1-02 (hitung kandidat, tolak lebih dari satu) lawan kode `pasangkan` (rakus): dua mode, F1.4; (2) PRD F6-02 (dasar CHIRPS v3) lawan dasar 1995-2014 model historical: delta model sendiri (UA-6); (3) R3 (renkon Lampiran 1.8) lawan `jam_aturan.json` (Pasal 21 ayat (1)): ikut yang kedua (UA-5); (4) KA 17 benar kecuali `K####` tidak stabil: karhutla memakai sel 0,02 derajat.

Pertanyaan baru (belum di KA bagian H; tidak dijawab dengan karangan):

| Kode | Pertanyaan | Bawaan sementara | Berdampak |
| --- | --- | --- | --- |
| UA-1 | Jendela khusus jenis berdurasi panjang (karhutla, kekeringan, gunung api)? Tafsir "kompleks" karhutla? | 3 hari; sel 0,02 derajat | F1 |
| UA-2 | `terverifikasi` otomatis bila dua sumber melapor? | tidak, tanda `siap_verifikasi` | F1 |
| UA-3 | Sumber poligon desa nasional? | titik-pusat Dukcapil terdekat, `estimasi-model` | F2 |
| UA-4 | Ambang uji balik F3 agar label naik? | tanpa ambang, label tetap | F3 |
| UA-5 | Pasal masa berlaku renkon? | `jam_aturan.json` | F5 |
| UA-6 | Dasar iklim: model historical atau CHIRPS v3? | model historical | F6 |

