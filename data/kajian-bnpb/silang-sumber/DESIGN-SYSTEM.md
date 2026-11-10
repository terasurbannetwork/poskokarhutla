# DESIGN-SYSTEM: Silang Sumber

Semua layar memakai chrome yang ada: kepala situs biru tua, token Centurisk97, `public/inti/kartu.css`, `tabel.css`, `tip.js`, `bnpb.css`. Tidak ada palet halaman sendiri.

## Komponen

| Komponen | Bentuk |
| --- | --- |
| Kartu | Kartu `.ex.ex-std` (AGENTS.md 3.5): pil kategori `.ex-ey`, judul kalimat temuan dengan angka disorot `.hl`, isi tabel `.ex-tabel` menempel penuh, kepala tabel biru tua rata tengah. Tanpa kaki keterangan; definisi kolom di `title` kepala. |
| Pemilih | Baris segmen lebar penuh terbagi rata, berikon (bahaya, tenggang, kejadian). |
| Pil status | "Resmi BMKG" (label lembaga), "Deteksi Centurisk97", "data belum cukup", "n kurang dari 30, tanpa persen", "perlu dicek". Pil "perlu dicek" netral, bukan merah peringatan. |
| Sel angka | Rata kanan, format id-ID, satuan di kepala; a, b, c, d selalu tampil bersama n. |
| Peta | Tsunami per zona: poligon kabupaten diwarnai menurut tingkat resmi dengan legenda hanya yang digambar; gambar peta BMKG utuh dengan logo dan sumber di kartu terpisah. Warna tidak dibaca sebagai angka. |
| Pemutar ulang | Penggeser buletin dengan tombol ikon polos; label "latihan" tetap terlihat. |

## Halaman

| Halaman | Berkas | Isi |
| --- | --- | --- |
| `/bnpb/rapor-sumber` | `public/bnpb/rapor-sumber.html`, `.js`, `.css` | Kartu per bahaya: tabel sumber x tenggang. |
| `/bnpb/silang` (tambahan) | `public/bnpb/silang.js`, `.css` | Kartu "Beda sumber hari ini" di atas kajian yang ada. |
| `/gempa` tab Tsunami zona | `public/gempa/` | Ringkasan, zona, eksposur, garis waktu, pemutar. |
| `/gempa` kartu Beruntun | `public/gempa/` | Daftar sasaran, kejutan, silang MAGMA. |
| Profil daerah | `public/kemitraan/**` (kampus) | Kartu kalender 12 bulan. |

## Teks

Bahasa Indonesia lugas, tanpa titik tengah sebagai pemisah, tanpa "Pantau Bencana", "kita" untuk BNPB dan BPBD. Kata "aman" tidak muncul. Klik atau tab tidak membekukan layar: kendali urgent, tabel berat ditunda setelah paint (INP.md).

## Dummy

Tidak ada tulisan ke D1 (KEPUTUSAN D8), jadi tombol dummy tidak berlaku. Isian uji ada di fixture di bawah `tests/`.
