# DESIGN-SYSTEM: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Dua permukaan: PDF kerja lapangan (tahap 1) dan seksi Misi udara di `/operasi` (tahap 3).
Warna dan token dipinjam dari `data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` dan token situs Centurisk97.

## 1. PDF tiga halaman (DESAIN-TEKNIS bagian 5)

Dicetak Chrome headless seperti `renlap_pdf.py`, tanpa huruf kapital semua. Kepala tiap halaman: nama misi, bencana, versi, jam pembuatan.

| Halaman | Isi dari atas ke bawah |
| ------- | ---------------------- |
| 1. Peta dan ringkasan | peta rute di atas citra (utara, skala, penanda bernomor); zona digambar; tabel urutan titik; empat angka ringkas (total km, total NM, menit terbang, menit di titik); baris status flight plan |
| 2. Tabel leg untuk pilot | koordinat tujuan DMS dan desimal, haluan sejati tiga angka (0 ditulis 360), km, NM, menit, menit kumulatif; baris belokan diberi tanda "belokan" |
| 3. Pemeriksaan dan daftar periksa | tabel zona (hasil, sumber, jam data); baris "tidak diperiksa"; kelayakan terbang; daya tahan; daftar periksa misi; daftar yang perlu diputuskan; kaki berisi label sementara |

Satu halaman tambahan per titik darat bila diminta: daftar periksa lapangan pendaratan atau zona dropping (angka PMS 510 berlabel sumbernya, Q6).

### Warna dan label di PDF

| Elemen | Gambar | Warna |
| ------ | ------ | ----- |
| Zona larangan | lingkaran atau poligon bergaris, isi transparan | merah `#a63a26`, isi 18%, garis penuh |
| Zona perhatian | lingkaran atau poligon bergaris putus | jingga `#e08a3a`, isi 14% |
| Rute | garis tebal, panah arah per leg | navy `#0b2545` |
| Belokan | titik `BL` dan leg bergaris putus | merah `#a63a26`, label "belokan menghindari <nama zona>" |
| Titik menyusul | penanda berongga | jingga, label "titik menyusul" |
| Jejak abu | poligon | label "model, bukan pengamatan" |
| Angka bawaan sementara | teks | label "sementara" di sebelah angka, daftar Q di kaki |

Aturan tambahan: semua teks nama zona dan titik lewat penyaring XML; kata "aman" tidak dipakai; kalimat status memakai bentuk "tidak memotong zona yang diketahui per <jam data>". Kolom kosong tampil "–", bukan 0.

## 2. Seksi Misi udara di `/operasi` (tahap 3)

Mengikuti AGENTS bagian 3.5 dan model wadah di DESIGN-SYSTEM Operasi Udara bagian 8. Gaya di `public/inti/misi_udara.css`, semua selektor diawali `.mu-`.

| Aturan | Isi |
| ------ | --- |
| Kartu | satu kartu `.ex.ex-std` per bagian; kepala kartu = nama seksi berikon ("Misi udara", "Formulir", "Pemeriksaan zona", "Daftar flight plan"), tanpa kalimat kesimpulan |
| Tanpa kaki | tanpa kaki keterangan atau sumber; definisi kolom di `title` kepala tabel |
| Huruf | tanpa huruf kapital semua (`text-transform:none`) |
| Latar | tanpa latar sorot abu-abu; pembeda memakai garis tipis `var(--line)`, warna lembut, atau ikon |
| Jarak | wadah kartu `display:grid; gap:20px`; kartu tidak menempel |
| Deret pilihan | enam jenis misi selebar penuh, terbagi rata, tiap pilihan berikon |
| Tabel | kepala navy `#0b2545` teks putih rata tengah; tabel menempel penuh di kartu |
| Tombol | tombol ikon polos tanpa garis luar atau kotak; tombol unduh `.ops-kml` dipakai ulang |
| Pemisah | tanpa titik tengah; pakai koma atau baris baru |
| Angka | format Indonesia, satuan disebut, belum ada = "–" |

### Komponen

| Komponen | Kelas | Isi |
| -------- | ----- | --- |
| Deret jenis misi | `.mu-misi` | enam segmen berikon, satu terpilih; mengganti `hidden` pada bidang isian, tanpa render ulang |
| Formulir | `.mu-form` | bencana, base awal dan akhir, daftar titik, kecepatan atau tipe, berangkat, waktu di titik |
| Baris titik | `.mu-titik` | nomor, masukan titik, peran (darat, jatuh, acuan), saklar "menyusul", tombol hapus berikon |
| Peringatan kolom bebas | `.mu-tanpanama` | teks "tanpa nama kru, penumpang, atau pejabat" di kolom bebas |
| Pratinjau peta | `.mu-peta` | rute dan zona, warna sama dengan PDF |
| Pil status | `.mu-status` | empat status flight plan, pil sama bentuk: navy untuk "tidak memotong zona yang diketahui" (bukan hijau, supaya tidak terbaca sebagai aman), oranye "dibelokkan", merah "perlu diputuskan orang" dan "ditolak" |
| Tabel pemeriksaan | `.mu-zona` | zona, tingkat, hasil, jarak, sumber, jam data; baris "tidak diperiksa" |
| Label sementara | `.mu-sem` | pil kecil "sementara" dengan nomor Q di `title` |
| Daftar flight plan | `.mu-daftar` | per bencana dan tanggal, batas 50 baris, unduh PDF, KML, GPX |
| Isian hasil | `.mu-hasil` | terlaksana atau batal, alasan, muatan, jumlah orang |

### Wireframe teks

```
[Kartu: Misi udara]
  deret: [Dropping][Pantau][Evakuasi][Angkut][Cari][Kunjungan]   (selebar penuh, terbagi rata)
[Kartu: Formulir]
  Bencana [banjir v]   Tipe [pilih v]   Kecepatan [200] km/jam   Berangkat [..]
  Base awal [kode atau titik]   Base akhir [sama]
  1  [koordinat, tautan, DMS, plus code]  peran [darat v]  di titik [30] mnt  [ ] menyusul  [hapus]
  +  tambah titik        catatan: tanpa nama kru, penumpang, pejabat
  [Buat flight plan]
[Kartu: Pemeriksaan zona]   pratinjau peta kiri, tabel kanan, pil status di atas
[Kartu: Daftar flight plan] tabel: versi, misi, status, km, menit, unduh
```

### Perilaku dan INP

1. Memilih jenis misi hanya mengganti `hidden` pada bidang isian yang sudah dirender.
2. Tombol Buat memunculkan chrome (pil status "memproses") lebih dulu; peta dan tabel zona menyusul sesudahnya (tidak membekukan layar).
3. Pratinjau peta digambar setelah kontrol terlihat, bukan sebelum.
4. Tinjau lokal di `http://localhost:8800/operasi`; login produksi diketik pemilik.
5. `prefers-reduced-motion`: tanpa animasi kartu. Baris yang bisa diklik punya `tabindex="0"` dan bisa dibuka dengan Enter.
6. Layar masuk daftar `LAYAR` di `tests/agen/gerbang-kartu-std.test.mjs` dan `tests/agen/gerbang-tanpa-kesimpulan.test.mjs`.
