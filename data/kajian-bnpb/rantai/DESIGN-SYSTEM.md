# DESIGN-SYSTEM

Tiru yang sudah ada, tidak membuat palet atau komponen baru.

## 1. Aturan

- Kepala situs navy bersama dan token Centurisk97 (`public/inti/`), seperti halaman Ruang BNPB lain. Tidak ada palet lokal halaman.
- Setiap bagian layar adalah satu kartu `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS.md §3.5): pil kategori `.ex-ey`, judul kalimat temuan dengan angka disorot `.hl`, isi. Tabel memakai `.ex-tabel` menempel penuh. Tanpa kaki keterangan; definisi kolom di `title` kepala tabel.
- Deretan pilihan (filter jenis, tahap, wilayah, status) ujung ke ujung, dibagi rata, berikon, label Indonesia, warna status dari token yang ada.
- Tombol ikon polos, tanpa garis luar atau kotak.
- Tidak ada pemisah titik tengah antar teks: pakai koma, kalimat, label sendiri, atau baris baru; angka kunci di depan.
- Angka berformat Indonesia (titik ribuan, koma desimal), satuan ditulis, sumber pasal disebut.
- Setiap grafik atau angka interaktif dengan tooltip saat hover; paragraf rata kanan-kiri.
- Dua ikon dummy di pojok halaman, hanya muncul untuk Super Admin (DUMMY.md).
- Klik, tab, dan paginasi: kontrol chrome urgent, subtree berat deferred (INP.md); daftar kejadian dipaginasi, bukan dirender semua.

## 2. Label tanda

| Tanda | Teks tampil | Catatan |
| --- | --- | --- |
| Macet pasal | "Lewat tenggat, Juklak 3/2022 hal. 7" | selalu menyebut peraturan dan halaman atau pasal |
| Mandek | "Mandek 61 hari (ambang internal, bukan pasal)" | label asumsi wajib |
| Tidak berlaku | "Tidak berlaku: <alasan>" | alasan dari admin |
| Tanpa jangkar | "Tanggal SPPH belum diisi" | tombol isi untuk yang berhak |
| Periksa | "Jatuh tempo lewat, belum dikonfirmasi ada sisa dana" | bukan merah |
| n kecil | "3 dari 4 operasi" | tanpa persen bila n < 5 |

## 3. Wireframe

### /bnpb/rantai

```
[kepala situs]
Kartu 1  pil: Rantai kejadian
  Judul: "38 kejadian terbuka, 7 macet, terbanyak di tahap DSP"
  Corong 8 kotak sejajar ujung ke ujung: awal | kaji | sk | posko | logistik | dsp | jitupasna | hibah
    tiap kotak: jumlah kejadian berposisi di sini, angka merah kecil bila ada macet
  Deretan filter: jenis | wilayah | hanya macet
Kartu 2  pil: Daftar
  tabel: KIB | kabupaten | jenis | posisi | macet di (jalur, jenis, N hari) | entri terakhir
  paginasi
Kartu 3 (detail, muncul saat baris dipilih)  pil: <KIB>
  garis waktu 8 jalur, tiap jalur: status, tanggal, tautan ke catatan sumber
  alasan macet dan pasalnya
  tombol ikon: tandai tidak berlaku (admin)
```

### /bnpb/kalender

```
Kartu 1  pil: Kalender kewajiban
  Judul: "12 kewajiban lewat tenggat di 9 BPBD"
  Deretan status: lewat | dekat | ada waktu | terpenuhi | tanpa jangkar
Kartu 2  pil: Per kewajiban
  tabel (staf): kunci | BPBD lewat | dekat | tanpa jangkar | terpenuhi
Kartu 3  pil: <BPBD> (dibuka dari baris atau langsung untuk petugas)
  tabel: kewajiban | jatuh tempo | sisa hari | status | pasal dan halaman
  tombol ikon: isi jangkar, tandai terpenuhi
```

### Blok SPM di Rapor Kinerja (`public/admin/pimpinan.js`)

```
Kartu  pil: SPM sub-urusan bencana
  Judul: "Respons 25 menit terpenuhi 4 dari 6 operasi di <kab>"
  tabel: indikator | pasal | n | memenuhi | median | catatan
  baris Juklak 4 dan 5: "belum ada angka di juklak"
```

## 4. Kosong dan galat

Tiap layar kosong menulis penyebabnya (belum ada KIB, belum ada jangkar, belum ada catatan SPM) dan petunjuk satu kalimat. Galat jaringan menulis "gagal memuat" dan tombol ulangi; tidak pernah kartu kosong tanpa kata.
