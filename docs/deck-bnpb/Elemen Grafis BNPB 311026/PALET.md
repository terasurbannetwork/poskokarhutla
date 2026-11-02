# Palet sistem desain BNPB

Disusun 31 Okt 2026 atas permintaan pemilik ("color palette untuk sistem ini, jangan saling tabrakan"). Semua warna
adalah token `tema.json`; tidak ada hex baru. Kontras dihitung WCAG 2.1.

## Peran

| Peran | Token | Hex | Dipakai untuk |
| --- | --- | --- | --- |
| Dasar terang | `kertas` | #FFFFFF | latar halaman isi, sampul, penutup |
| Bidang | `tint.netral.muda` | #F3F5F8 | panel kiri daftar isi, kotak latar |
| Bidang kedua | `tint.netral.pita` | #E6EAF0 | pita, pil halaman redup, gradien sampul |
| Sorot baris | `tint.api.muda` | #FDF4EC | baris aktif daftar isi |
| Teks utama | `teks` | #1A1A1A | judul dan isi |
| Teks kedua | `teks-2` | #2E3440 | subjudul, jabatan |
| Teks redup | `teks-3` | #6B7280 | sumber, kredit, keterangan |
| Identitas gelap | `navy` | #051C2C | pil tanggal, kepala tabel, panel gelap |
| Aksen tunggal | `oranye` | #D9600B | nomor bagian, garis aksen, hiasan utama |
| Pendamping netral | `skala.netral.2` | #AEBBCB | hiasan kedua, garis rambut |
| Nama lembaga | `biru-lembaga` | #00499D | hanya teks nama lembaga dan tempat di judul |
| Bahaya | `merah` | #C8102E | hanya status bahaya pada data |

## Kontras yang sudah dicek

- Navy di atas putih 17,4:1; putih di atas navy 17,4:1 (teks apa pun).
- Biru lembaga di atas putih 8,6:1 (teks apa pun).
- Teks redup di atas putih 4,8:1 (lolos 4,5:1 untuk teks kecil).
- Oranye di atas putih 3,7:1: hanya untuk teks besar (18 pt tebal ke atas), nomor bagian, garis, dan bentuk; tidak
  untuk isi atau keterangan kecil.
- Oranye di atas navy 4,7:1: aman untuk angka dan label di panel gelap.

## Pasangan yang dilarang (bertabrakan)

- Oranye bersebelahan dengan merah (kontras 1,6:1, terbaca sebagai satu warna kotor). Merah hanya untuk status bahaya,
  tidak pernah di hiasan atau bingkai.
- Biru lembaga bersebelahan dengan biru data `biru` #2F86D1 (2,2:1). Biru lembaga tidak dipakai untuk hiasan, kotak,
  atau bidang; cukup teks nama lembaga.
- Lebih dari satu aksen hangat di satu halaman: oranye adalah satu-satunya aksen; ramp api hanya untuk data api.
- Abu-biru (`skala.netral.2`) sebagai teks: 1,9:1 di atas putih, hanya untuk bentuk.

## Aturan pemakaian

1. Halaman bingkai memakai empat warna saja: putih, navy, oranye, abu-biru. Hiasan berwarna di latar terang; putih
   dengan satu aksen oranye di atas foto.
2. Satu halaman paling banyak satu aksen (oranye) dan satu identitas gelap (navy).
3. Warna data (ramp api, ramp air, emas, kategori bencana, arah naik dan turun) hanya di slide isi data, tidak di bingkai.
4. Panel gelap: teks putih, angka putih, garis aksen oranye; logo di lingkaran putih.
