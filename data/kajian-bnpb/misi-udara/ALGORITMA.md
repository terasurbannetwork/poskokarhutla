# ALGORITMA: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Semua angka berlabel [SEMENTARA] menunggu jawaban Q yang disebut.

## 1. Membaca titik (F-2)

Urutan percobaan, berhenti di yang pertama berhasil:

1. Dua angka desimal `lat, lon` (titik atau koma desimal ditolak bila ambigu: pemisah wajib koma diikuti spasi atau titik koma).
2. DMS `N 02° 47' 03" E 097° 53' 37"` lewat `dari_dms`.
3. Tautan Google Maps panjang: ambil `!3d<lat>!4d<lon>`; bila tidak ada, `@<lat>,<lon>`.
4. Tautan pendek `maps.app.goo.gl`: hanya di perintah baris dan bot WA (Q11). Ikuti pengalihan, lalu langkah 3. Bila hasilnya tanpa koordinat tetapi memuat plus code, lanjut langkah 5.
5. Plus code penuh (10 atau 11 karakter). Plus code pendek ditolak kecuali disertai titik acuan (base atau titik sebelumnya dalam 50 km [SEMENTARA Q17]).

Validasi: lintang -11,5 sampai 6,5 dan bujur 94,5 sampai 141,5; di luar itu ditolak dengan pesan. Nama tempat tanpa koordinat ditolak (D8).

## 2. Rute urut tetap (F-1)

Masukan: base awal, daftar titik berurutan, base akhir (bawaan sama dengan base awal), kecepatan jelajah `v` km/jam.

Untuk tiap pasangan berurutan: jarak lingkaran besar (haversine, `jarak_nm`), haluan sejati awal (`baringan`), waktu = jarak dibagi `v`.
Waktu kumulatif di tabel = jumlah waktu terbang leg saja; waktu di titik (bagian 5) dicetak di kolom dan total tersendiri, tidak dijumlahkan ke waktu terbang. Semua keluaran yang dibaca orang memformat dari nilai mentah yang sama; hanya JSON yang dibulatkan satu desimal. Leg berjarak di bawah 0,05 km dicetak tanpa haluan. Haluan dicetak tiga angka; 0 ditulis 360.

Urutan titik tidak diubah mesin (K1). Mesin hanya menyisipkan titik belokan (bagian 4).

## 3. Zona per bencana (F-5)

Level di data `gunungapi_status.json` berupa bilangan 1 sampai 4: 1 = Level I Normal, 2 = Level II Waspada, 3 = Level III Siaga, 4 = Level IV Awas.
Semua batas basi di tabel ini bawaan sementara [SEMENTARA Q17].

Tiap zona: `{id, bencana, tingkat: larangan|perhatian, bentuk: lingkaran|poligon|wilayah, sumber, waktu_data, alasan}`.

| Bencana | Zona | Tingkat | Dibentuk dari | Batas basi |
| ------- | ---- | ------- | ------------- | ---------- |
| Gunung api | lingkaran pusat `lat, lon` gunung, jari-jari `radius_km` + penyangga 5 km [SEMENTARA Q4], untuk gunung dengan `radius_km` terisi | larangan | `gunungapi_status.json` | 48 jam |
| Gunung api | gunung Level II ke atas dengan `radius_km` kosong | larangan tanpa bentuk: bila rute lewat dalam 30 km [SEMENTARA Q16] keluaran berstatus "perlu diputuskan orang" | sama | 48 jam |
| Gunung api | gunung Level I dalam 15 km [SEMENTARA Q16] dari rute | perhatian (Q5) | sama | 48 jam |
| Gunung api | jejak abu model di atas ambang penerbangan | larangan | `public/banjir/data/abu_gunungapi.json` | 12 jam |
| Gunung api | sektor di luar lingkaran (misal lembah sungai) | larangan, zona manual (Q14) | isian staf | selama kejadian |
| Tsunami | kabupaten dengan peringatan aktif | larangan untuk titik darat saja (Q8) | `inatews_tsunami.json`, `tsunami_zona.json` | 6 jam |
| Gempa | zona hening pencarian | larangan, zona manual (Q14) | isian staf | selama kejadian |
| Cuaca | poligon peringatan dini yang berlaku pada jam terbang | perhatian | `peringatan.json` `nowcast[]` | sampai `selesai` |
| Cuaca | siklon aktif dalam 300 km [SEMENTARA Q16] dari rute | perhatian | `cuaca_siklon.json` | 12 jam |
| Karhutla, udara | kelayakan terbang di base dan tiap titik darat (bagian 7) | perhatian | `cuaca_metar.json` | 3 jam |
| Banjir | titik darat di kecamatan Siaga atau Awas | perhatian | `public/banjir/data/status.json` | 24 jam |
| Longsor | titik darat di kecamatan berpeluang tinggi | perhatian | `public/longsor/data/nowcast.json` | 24 jam |

Aturan umum:

1. Semua zona dari semua bencana diperiksa di tiap flight plan, apa pun bencana misinya. Bencana misi hanya menentukan templat dan daftar periksa. Alasan: rute dropping banjir tetap tidak boleh memotong radius gunung api.
2. Data lebih tua dari batas basi dianggap tidak ada. Barisnya dicetak "data <sumber> basi sejak <jam>, tidak diperiksa".
3. Berkas sumber tidak terbaca: baris dicetak "tidak ada data", bukan lolos.
4. Jejak abu adalah keluaran model skenario, bukan pengamatan: labelnya "model, bukan pengamatan".

## 4. Belokan dan penolakan (F-6)

**Titik darat** (base, titik mendarat, titik jatuh) di dalam zona larangan: flight plan tidak dibuat; pesan menyebut zona, sumber, dan jarak titik ke tepi zona.

**Leg memotong lingkaran larangan** (jarak terdekat ruas ke pusat lebih kecil dari jari-jari):

1. Hitung dua titik singgung kandidat: titik pada lingkaran berjari-jari `R × 1,05` [SEMENTARA Q17] di kiri dan kanan arah leg, tegak lurus garis pusat ke titik terdekat.
2. Pilih sisi dengan tambahan jarak terkecil.
3. Sisipkan satu titik belokan bertanda `BL`. Bila ruas baru masih memotong, sisipkan dua titik (masuk dan keluar busur) pada sudut 45 derajat sebelum dan sesudah titik terdekat. Bila masih memotong atau memotong zona lain, berhenti: status "perlu diputuskan orang".
4. Leg belokan dicetak dengan kata "belokan menghindari <nama zona>".

**Leg memotong poligon larangan** (abu, zona manual poligon): mesin tidak membelokkan; status "perlu diputuskan orang" dengan nama zona. Catatan `ponytail`: belokan poligon belum dibuat, tambah bila sering terjadi.

**Perhatian** tidak pernah mengubah rute.

Dua baris tetap di tiap keluaran: "NOTAM tidak diperiksa" (Operasi Udara Q6 belum dijawab) dan, bila jam berangkat di luar 06.00 sampai 18.00 waktu setempat, perhatian "terbang di luar jam terang" (Q15).

Status flight plan: `tidak memotong zona yang diketahui`, `dibelokkan`, `perlu diputuskan orang`, atau `ditolak`. Tidak ada status "aman".

## 5. Waktu di titik per jenis misi (F-4)

| Misi | Waktu di titik | Catatan |
| ---- | -------------- | ------- |
| `dropping` mendarat | diketik staf, wajib | tanpa bawaan |
| `dropping` lempar rendah | 2 menit per titik [SEMENTARA Q17] | pola orbit renlap karhutla |
| `pantau` | 2 menit orbit per titik, bisa diganti | `ORBIT_MNT` yang ada |
| `evakuasi`, `angkut`, `kunjungan` | diketik staf, wajib | |
| `cari` | waktu pola (bagian 8) | |

## 6. Daya tahan dan isi ulang (F-8)

Hanya dihitung bila tipe helikopter dipilih dan tipe itu punya `daya_tahan_mnt` di `batas_terbang.json`.

`butuh = waktu terbang total + cadangan`, cadangan 30 menit [SEMENTARA Q3]. Waktu di darat dengan mesin menyala tidak dihitung
(catatan dicetak). Bila `butuh > daya_tahan_mnt`: cari titik pertama di rute di mana waktu terbang kumulatif ditambah cadangan
melampaui daya tahan; sarankan isi ulang di titik darat sebelum itu, atau bandara terdekat dari `udara.json` dalam 30 km [SEMENTARA Q17] dari rute.
Mesin menyarankan, tidak menyisipkan.

Tabel tipe [SEMENTARA Q2], semua berlabel "angka umum, belum dari operator": AW139 306 km/jam, Bell 412EP 226 km/jam,
AS332 L1 247 km/jam, Mi-171A2 260 km/jam. `daya_tahan_mnt` kosong untuk semua tipe sampai Q2 dijawab, sehingga F-8 mencetak
"daya tahan tipe belum ada datanya".

## 7. Kelayakan terbang (F-9)

Satu rumus dengan `kelayakan(b)` di `public/operasi_peta.js`, ditulis ulang di Python dan diuji dengan kasus yang sama:
stasiun METAR terdekat dalam 60 km, basi di atas 3 jam. Tidak layak: jarak pandang di bawah 1.500 m, badai guntur, atau angin
atau embusan di atas 30 knot. Terbatas: jarak pandang di bawah 5.000 m, asap atau kabut asap, atau angin di atas 20 knot.
Ambang ini rancangan agent (Q7) dan dicetak berlabel "perkiraan". Tanpa stasiun atau data basi: "tidak ada data".

Sumber Python adalah `public/banjir/data/cuaca_metar.json` (`jarak_pandang_m`, `angin_kmj`, `embusan_kmj`, `ts`), sedangkan rumus JS membaca `vis_m`, `wx`, dan angin dalam knot dari teks METAR.
Sebelum dibandingkan dengan ambang, km/jam diubah ke knot (dibagi 1,852). Bendera `embusan_kencang` di data (ambang 54 km/jam) tidak dipakai. Kasus uji bersama ditulis dalam knot dan meter.

## 8. Pola pencarian (F-11)

Masukan: titik acuan, arah awal, jarak lintasan `s` km (wajib diketik, Q13), dan batas (jumlah ruas atau ukuran kotak).

- Kotak melebar: ruas 1 dan 2 sepanjang `s`, ruas 3 dan 4 sepanjang `2s`, dan seterusnya, belok 90 derajat ke kanan tiap ruas.
- Lintasan sejajar: kotak panjang `p` lebar `l`; ruas sepanjang `p`, pindah `s`, sampai lebar tertutup.

Waktu pola = panjang lintasan dibagi `v`. Titik pola ikut pemeriksaan zona.

## 9. Uji kejujuran

1. Tiap baris `batas_terbang.json` wajib punya `nilai`, `satuan`, `sumber`, `keyakinan` (A, B, atau S). `keyakinan: C` ditolak; `S` wajib punya `q` (nomor pertanyaan di KEPUTUSAN) dan tampil berlabel "sementara" (D5).
2. Rute uji yang memotong lingkaran gunung menghasilkan belokan yang jarak terdekatnya ke pusat tidak kurang dari jari-jari.
3. Data basi dan data kosong tidak pernah menghasilkan status "tidak memotong zona" tanpa baris "tidak diperiksa".
4. Keluaran tidak memuat kata "aman" (uji teks).
