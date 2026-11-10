# ALGORITMA: Tangga Peringatan

Semua aturan di sini terbuka dan dijalankan `scripts/prediksi/tangga.py`. Tidak ada angka yang berasal dari warna peta. Peringkat `tk` dipakai HANYA untuk sinyal lintas skala; label resmi (`t`) selalu tampil apa adanya dan tidak diubah.

## 1. Urutan skala (terjauh ke terdekat)

`musim`, `bulan`, `dasarian`, `h10` (10 hari), `sepekan` (7 hari), `h3` (3 hari), `jam`.

## 2. Pemilihan periode yang berlaku

Hari acuan = tanggal WIB saat skrip jalan. Untuk bulan dan dasarian: ambil pernyataan yang periodenya belum berakhir (akhir periode >= hari acuan), urut menurut awal periode, dua yang pertama. Peringkat `tk` skala itu memakai yang pertama. Dasarian I = tanggal 1 sampai 10, II = 11 sampai 20, III = 21 sampai akhir bulan. Kekeringan, sepekan, dan factsheet yang masa berlakunya sudah lewat tidak dipakai.

## 3. Peringkat tk (0 sampai 3) per sumber

`tk` kosong (null) berarti pernyataan itu tidak punya tingkat; ia tampil tetapi tidak ikut sinyal. Pernyataan "tidak disebut" juga null, BUKAN nol.

| Sumber | Ancaman | Pernyataan | tk |
| --- | --- | --- | --- |
| Sifat hujan bulan/dasarian | basah | Jauh di Atas Normal / Atas Normal / lainnya | 2 / 1 / 0 |
| Sifat hujan bulan/dasarian | kering | Bawah Normal / lainnya | 1 / 0 |
| Curah hujan ekstrem searah | basah | sifat menyimpang ke atas dan kategori curah Sangat Tinggi | +1 (maks 3) |
| Curah hujan ekstrem searah | kering | sifat Bawah Normal dan kategori curah Rendah | +1 (maks 3) |
| Peringatan kekeringan BMKG (kecamatan, dirangkum per kabupaten dengan tingkat tertinggi) | kering | Waspada / Siaga / Awas (kode 1/2/3) | 1 / 2 / 3 |
| Prakiraan 10 hari BMKG (kabupaten) | basah | ada hari berkondisi "Sangat Lebat" atau "Ekstrem" / "Lebat" / selain itu | 3 / 2 / 0 |
| Prakiraan 10 hari BMKG | kering | jumlah hari tanpa hujan | null (informasi) |
| Sepekan BMKG (provinsi) | basah | masuk Awas (hujan sangat lebat) / Siaga (hujan lebat) / daftar hujan sedang | 3 / 2 / 0 |
| Factsheet karhutla BMKG (provinsi) | kering | perhatian khusus karhutla / risiko FWI tertinggi / provinsi berasap | 2 / 2 / 1 |
| Ensemble 3 hari BMKG (provinsi) | basah | peluang ensemble >= 60% untuk hujan lebat ada di provinsi itu | 2 |
| Nowcast BMKG (provinsi, peringatan aktif) | basah | severity Minor / Moderate / Severe atau Extreme | 1 / 2 / 3 |
| Petir BMKG | basah | pengamatan sambaran 30 menit terakhir | null (pengamatan) |
| Himawari (analisis kita) | basah | awan dingin per kabupaten | null (analisis, bukan peringatan) |
| Prediksi kita BNJ, LSR | basah | level model Normal/Waspada/Siaga/Awas, terbesar dalam 3 hari | 0 / 1 / 2 / 3 |
| Prediksi kita API | kering | aturan karhutla terpenuhi / tidak | 1 / 0 |
| Prediksi kita ASP | kering | kategori ISPU 0..3 terbesar dalam 3 hari | 0 .. 3 |
| Musim | kering, basah | prediksi musim nasional | null |

Satu anak tangga bisa memuat beberapa pernyataan untuk satu ancaman; peringkat anak tangga itu = maksimum `tk` BMKG yang tidak null di kabupaten itu (pernyataan kabupaten, provinsinya, dan nasional digabung).

## 4. Sinyal lintas skala

Per kabupaten dan per ancaman, ambil daftar `r` = peringkat tiap skala (urutan bagian 1), hanya dari lembaga BMKG, buang yang null. Misalkan `v` = daftar yang tersisa.

- **menguat**: `len(v) >= 2`, `v` tidak menurun (tiap skala lebih dekat bernilai sama atau lebih tinggi dari sebelumnya), `v[-1] >= 1`, dan paling sedikit dua skala bernilai >= 1.
- **belum selaras**: ada dua skala dengan selisih peringkat >= 2 (contoh: satu menyatakan Siaga, yang lain tanpa tingkat perhatian).

Dua tanda bersifat bebas; keduanya boleh menyala sekaligus. Sinyal tidak memberi persen, tidak memakai kata "peluang", dan tidak mengatakan apa pun tentang kejadian yang akan terjadi: ia hanya menyatakan bahwa pernyataan resmi pada skala berbeda searah atau bertentangan. Skala yang pernyataannya hanya tingkat provinsi atau nasional ikut dihitung, dan layar menyebut cakupannya.

Prediksi kita (3 hari) tidak masuk sinyal (KEPUTUSAN D2). Untuk tiap ancaman, `tangga.json` menyimpan peringkat prediksi kita terpisah (`kita`).

## 5. Pencocokan wilayah

- Provinsi: kode 2 digit Kepmendagri (semua berkas sepekan, factsheet, nowcast, petir).
- Kabupaten dari berkas iklim, awan, kekeringan: `dasar.pencari(prov, nama)`, bukan kode. Kode awan dan iklim memakai indeks internal; awan memakai dua digit pertama kode itu sebagai provinsi.
- Kabupaten dari `kab10`: id Kepmendagri tanpa titik, diperiksa dengan `dasar.kunci(nama)`; yang tidak lolos pemeriksaan nama dicoba lewat `pencari`, bila tetap gagal dilewati dan dihitung di `gagal`.
- Kabupaten tak cocok tidak dikarang: dicatat.

## 6. Batas basi

Jam (nowcast, petir, Himawari): 4 jam sejak `dibuat` atau `diambil`. Harian (kab10, sepekan, factsheet, karhutla, prediksi kita, kekeringan): 48 jam. Iklim bulan dan dasarian: 14 hari. Prediksi musim: 240 hari sejak terbit. Melewati batas: sumber diabaikan, anak tangganya "belum ada data".

## 7. Uji balik (direncanakan)

Lihat RENCANA-UJI. Tidak ada klaim ketepatan sebelum arsip cukup.
