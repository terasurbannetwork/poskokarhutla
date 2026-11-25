# DESIGN-SYSTEM: Semai Redistribusi Banjir

Tujuan banjir hidup di dalam seksi Peluang semai, jadi `data/kajian-bnpb/semai-awan/DESIGN-SYSTEM.md` dan
`data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` berlaku penuh. Dokumen ini hanya menambah yang berbeda. Gaya baru masuk
`public/operasi_semai.css` dengan awalan `#opsLaporan .sm-`; warna baru hanya lewat token `public/inti/tema.css` (AGENTS §3.9,
gerbang `gerbang-token-warna`). Tidak ada palet lokal.

## 1. Saklar tujuan

- Di kepala L1 seksi, kiri dari pemilih tampilan peran: dua segmen ujung ke ujung berikon (memori "deretan pilihan ujung ke ujung"):
  **Karhutla** (ikon api) dan **Banjir** (ikon tetes bergelombang). Segmen aktif navy, teks putih; tidak aktif garis tipis.
- Angka kecil di kanan nama seksi pada panel kiri = jumlah zona usulan tujuan yang terakhir dibuka.
- Tujuan banjir menyembunyikan pemilih "Mulai dari: api besar / target pilihan" dan kartu Peringatan asap.

```
L1 kepala navy: "Peluang semai"   [Karhutla | Banjir]   [Pos komando | Tinjau BMKG | Mitra]   [Salin ringkasan]
bilah sumber: [ECMWF IFS 0,1°, putaran 25 Nov 12z] [prakiraan banjir 24 Nov 18.40, belum teruji] [BMKG 3 hari, 24 Nov] [umur 3 j]
┌──────────── peta ────────────┐ ┌──── kolom kanan 380 px ────┐
│ poligon sasaran, awan, angin │ │ L2 Sasaran hari ini         │
│ zona cegat, garis ke sasaran │ │ L2 Rekomendasi              │
│ bilah jam                    │ │ L2 Zona usulan 24 jam       │
└──────────────────────────────┘ └─────────────────────────────┘
L2 Cara memutuskan (lipat)   L2 Yang tidak terlihat satelit dan model (lipat)   L2 Rapor uji (lipat)
```

## 2. Lapisan peta (tambahan)

| Lapisan | Bentuk | Warna |
| ------- | ------ | ----- |
| Sasaran | poligon kab, garis 2 px, isi 12% | token baru `--sm-sasaran` (biru tua air, diturunkan dari warna makna banjir di `tema.css`) |
| Sasaran tenggang 2 | poligon garis putus, tanpa isi | `--sm-sasaran` |
| Zona cegat | lingkaran 14 px berpinggir `--sm-sasaran`, label pil "BA 0,59"; terpilih penuh | `--sm-sasaran` |
| Garis cegat | garis putus dari titik hujan ke titik masuk sasaran, label kecil "tiba sekitar 2 j" | abu tua |
| Awan layak semai, angin pengarah, base, kota | sama dengan induk | sama |

Titik api, prakiraan asap, angin asap, dan cluster tidak tampil di tujuan banjir. Kotak lapisan menyesuaikan daftar.

## 3. Kolom kanan (L2)

| Kartu | Isi |
| ----- | --- |
| Sasaran hari ini | daftar baris L4: nama kab/kota tebal, pil asal (`prakiraan kita` abu garis + pil kecil "belum teruji", `BMKG` navy, `daftar tetap` abu, `Pusdalops` ungu OMC), tenggang ("besok" atau "lusa, pantau"), angka peluang dari sumbernya monospasi; tombol garis "Tambah sasaran" membuka pemilih kab/kota |
| Rekomendasi | sama bentuknya dengan induk; judul "Zona BA"; baris "Melindungi: Jakarta Utara, Bekasi"; alasan empat baris berikon kotak berhuruf C (biru, awan), H (biru tua, lepas sebelum sasaran: "tiba di sasaran sekitar 2 jam, titik hujan 18 km di luar tepi"), P (abu tua, paparan: "di laut" atau "darat, 34 km dari kota terdekat"), B (navy, base); baris "Untuk renlap": ketinggian, "bahan dari BMKG"; tombol "Jadikan target renlap" |
| Zona usulan 24 jam | daftar induk; pil tambahan "laut" atau "darat" |
| Rapor uji | lipat; dua baris Lapis A dan Lapis B: n, efek persen dengan selang 95%, MDE, pil vonis (`sejalan` hijau lembut, `tak terbedakan` abu, `berlawanan` merah bata lembut, `data kurang` abu garis); kaki tetap "kesesuaian, bukan sebab-akibat" sebagai bagian isi kartu, bukan kaki sumber |

Kartu kosong: kalimat ALGORITMA §7 sebagai judul tanpa huruf besar, paragraf kecil, tombol "Tambah sasaran" tetap ada.

## 4. Dialog

- **Jadikan target renlap**: dialog induk, judul "Jadikan Zona BA target renlap OMC (banjir)", baris tambahan "Sasaran" (tidak bisa
  disunting).
- **Tambah sasaran**: `<dialog>` pola `.ops-dlg`: pencari kab/kota (pola kotak cari repo), tanggal (hari ini atau besok), catatan
  opsional <= 300 huruf, tombol "Simpan sasaran" navy dan "Batal" garis. Sesudah simpan: baris baru di Sasaran hari ini berpil
  `Pusdalops`, dan bila kab sudah punya kandidat, zona dihitung ulang.

## 5. Teks baku

| Tempat | Teks |
| ------ | ---- |
| Pita tujuan banjir | "Tujuan banjir: awan layak semai di hulu sasaran, usulan, konfirmasi BMKG." |
| Kartu Cara memutuskan | urutan ALGORITMA §2 sampai §6 dalam kalimat biasa |
| Kartu Yang tidak terlihat | butir induk + "hujan sasaran yang tumbuh di tempat tidak punya hulu untuk dicegat", "lintasan model lebih dari 3 jam makin tidak pasti", "prakiraan banjir kita belum teruji" |
| Ringkasan teks | "Peluang semai (banjir), Rab 25 Nov, 05.30 WIB (ECMWF 12z)" / "Sasaran: Jakarta Utara, Bekasi (BMKG), Bogor (daftar tetap)" / "- BA lepas pantai utara Tangerang, 10.00 sampai 13.00 WIB, skor 0,59, tiba di sasaran sekitar 2 jam, dari Halim (WIHH) sekitar 10 menit" / "Usulan mesin, bukan prakiraan resmi. Konfirmasi tiap operasi dengan BMKG." |

Kata terlarang di semua teks: KEAMANAN-PRIVASI §6.

## 6. Gerak dan INP

- Saklar tujuan: segmen dicat dulu; lapisan peta tujuan lain disembunyikan dengan `setLayoutProperty` di frame berikutnya;
  `semai_banjir.json` diambil malas saat pertama kali dipilih, lalu disimpan di memori. Tidak ada render ulang kolom kanan karhutla.
- Tambah sasaran: dialog terbuka seketika; hitung ulang zona di `requestIdleCallback`.
- Aturan induk §10 lainnya berlaku.
