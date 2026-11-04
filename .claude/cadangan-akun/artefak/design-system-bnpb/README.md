# BNPB

Sistem desain deck, laporan, dan bahan paparan Badan Nasional Penanggulangan Bencana. Diekstrak dari mesin deck skill `ppt-konsultan` (`tema.json`, palet sistem 31 Okt 2026) dan pustaka Elemen Grafis BNPB. Satuan di sini pt slide 960×540; di render 72 dpi 1 pt = 1 px.

## Prinsip

- **Terang, padat, berdata.** Semua latar terang, termasuk sampul, penutup, dan pembatas. Ruang kosong paling banyak 10% per panel; ruang diisi bahan, ikon, figur, tabel, atau huruf lebih besar, bukan hiasan.
- **Satu identitas, satu aksen.** `navy` memegang identitas, `oranye` satu-satunya aksen. Satu halaman paling banyak satu aksen dan satu identitas gelap.
- **Warna punya tugas.** `merah` hanya bahaya pada data, `biru-lembaga` hanya nama lembaga dan tempat, warna data (ramp api, air, emas, kategori) hanya di slide isi.
- **Hiasan hanya di bingkai.** Sampul, penutup, daftar isi, pembatas. Slide isi data tidak dihias.

## Isi dan bahasa

- Bahasa Indonesia baku dan lugas. Kalimat dikte pemilik dibuat formal tanpa dikembangkan.
- Judul slide = fakta + angka + sumber, kalimat deskriptif, paling banyak dua baris. Contoh: "Sebaran Titik Panas dan Kebakaran di Jawa Timur per 22 Oktober".
- Dilarang: "Pesan Kunci:", "DIBI mencatat", kode temuan "A1.", pil Resmi/Terverifikasi, titik tengah "·", em dash, personifikasi, slogan, kontras "X bukan Y", tiga-serangkai bergaya.
- "Titik panas" atau hotspot untuk data satelit, tidak "titik api". Hotspot disebut sebelum firespot. "Kompleks" ditulis "cluster".
- Istilah asing dimiringkan. Format angka Indonesia: titik ribuan, koma desimal, satuan selalu tertulis.
- Pil CUT OFF hanya untuk data yang diperbarui harian. Label sampul "Dipresentasikan oleh".
- Deck mitra asing berbahasa Inggris sampai kaki halaman, berisi data, bukan naskah ucapan.

## Fondasi visual

### Warna

| Peran | Token | Hex |
| --- | --- | --- |
| Dasar terang | `kertas` | #FFFFFF |
| Bidang | `tint-netral-muda` | #F3F5F8 |
| Bidang kedua | `tint-netral-pita` | #E6EAF0 |
| Sorot baris | `tint-api-muda` | #FDF4EC |
| Teks utama / kedua / redup | `teks` / `teks-2` / `teks-3` | #1A1A1A / #2E3440 / #6B7280 |
| Identitas gelap | `navy` | #051C2C |
| Aksen tunggal | `oranye` | #D9600B |
| Pendamping netral | `skala-netral-2` | #AEBBCB |
| Nama lembaga | `biru-lembaga` | #00499D |
| Bahaya | `merah` | #C8102E |

Kontras yang sudah dicek: navy di putih 17,4:1; biru lembaga 8,6:1; teks redup 4,8:1; oranye di putih 3,7:1 (hanya teks besar 18 pt tebal ke atas, garis, bentuk); oranye di navy 4,7:1.

Pasangan yang dilarang: oranye bersebelahan dengan merah (1,6:1, terbaca kotor); biru lembaga bersebelahan dengan biru data `biru` (2,2:1); dua aksen hangat di satu halaman; `skala-netral-2` sebagai teks (1,9:1).

Data: arah naik `oranye`, turun `biru`. Enam keluarga bencana (`kategori-*`) dibedakan warna, jenisnya dibedakan ikon dan label. Skala lima kelas dari terang ke pekat: `api-1..5` (juga kelas IRBI Rendah/Sedang/Tinggi = 1/3/5), `air-1..5`, `emas-1..5`, `netral-*`. Status resmi lembaga (PVMBG, BMKG, MMI) memakai warna dan kata asli lembaganya.

Tint sebagai latar panel dan pita: teks di atasnya selalu `teks`, tanpa gradien.

Semua halaman terang, termasuk penutup dan pembatas lampiran (pemilik, 31 Okt 2026). Token `*-di-navy` hanya untuk panel navy kecil di slide isi (pil tanggal, kepala tabel, angka di atas navy); tidak ada halaman berlatar navy.

### Huruf

Hanya **Roboto**. Batas bawah huruf yang dibaca 6 pt. Judul temuan 19–22 pt tebal, subjudul 12 pt, angka kartu 17 pt, judul panel 11 pt, isi panel 8,5 pt, isi tabel 7,5 pt, kepala kolom 6,5 pt kapital. Sampul 32 pt, pembatas 40 pt, penutup 54 pt.

### Tata letak

Slide 960×540 pt, margin 43,2 pt, garis header y 95, isi y 101–500, garis bawah y 507,6, pita kaki navy y 512,6 (sumber di kiri, hak cipta dan nomor di kanan). Logo kanan atas 27,4×34,6 pt. Satu slide 3–4 blok dan 180–290 kata. Jarak blok 10,8 pt. Radius panel 4,3 pt, kartu 5,8 pt, pil penuh.

Satu topik satu kontainer. Tidak ada yang menempel. Teks 2–3 baris rata kiri-kanan; teks di samping ikon rata tengah tegak. Kepala tabel teks polos rata tengah.

## Ikonografi

Ikon garis tebal, putih di atas warna atau navy di lingkaran tint. Tiap status dan tiap jenis bencana punya ikon berbeda. Semua pil berikon. Chip lembaga memakai ikon, bukan logo.

## Logo

Logo BNPB di grup aset Logo: berwarna, transparan, putih (untuk navy dan foto), dan lambang. Berkasnya PNG 250×315 px dari repo poskokarhutla; ganti dengan vektor resmi bila tersedia.

## Pratinjau komponen

Angka, nama tempat, dan tanggal di pratinjau komponen adalah contoh tampilan, bukan data resmi. Foto sampul dan penutup: BNPB, longsor Agam, Sumatera Barat, 1 Desember 2025 (domain publik).

## Hubungan dengan Centurisk97

Sistem ini untuk deck dan laporan; web centurisk97.id memakai sistem Centurisk97 (https://claude.ai/artifact/PzjzaVmDFNkjeUF6f6JXoE). Keduanya berbagi:

- Aturan bahasa dan angka: judul fakta + angka + sumber, format id-ID, tanpa titik tengah, tanpa em dash, "titik panas" bukan "titik api", pil hipotesis untuk angka yang belum lolos uji balik.
- Sumber data: angka karhutla di deck = data sistem Centurisk97 (hotspot dari tabel Real Time, luas terbakar dan belum padam dari lapisan peta), tidak pernah dari Koordalops.
- Kepala tabel rata tengah teks polos, paragraf rata kiri-kanan, skala bahaya empat sampai lima kelas berlabel kata.

Yang sengaja berbeda: huruf (Roboto di sini, Inter dan Plus Jakarta Sans di web), navy (#051C2C di sini, oklch 25,5% di web), angka kunci judul (oranye di sini, merah `.hl` di web), dan arah (naik oranye / turun biru di sini, naik merah / turun hijau di tooltip web). Jangan menulis "Pantau Bencana" di deck BNPB.
