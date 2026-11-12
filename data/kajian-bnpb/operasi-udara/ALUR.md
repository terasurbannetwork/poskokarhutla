# ALUR: Pantauan Operasi Udara

Alur ujung ke ujung per peran dan per siklus harian. Jam dalam waktu setempat base kecuali disebut WIB.

## 1. Siklus harian

| Jam | Kejadian | Sumber | Yang berubah di layar |
| --- | -------- | ------ | --------------------- |
| 20.00 WIB (H-1) | Mesin renlap menyusun renlap **malam** untuk H | `scripts/operasi/renlap.py` di Mac mini → `POST /api/operasi/renlap` | Kolom Renlap per base, blok Renlap |
| 20.0x WIB | Bot membuat PDF renlap per base dan gabungan | `scripts/operasi/renlap_pdf.py` (bot `scripts/wa/renlap_jam.mjs`) | **F-15**: PDF diunggah ke R2, tombol PDF muncul |
| 05.00–07.30 | Satgas tiap base mengirim laporan gelar armada ke grup WA | Gateway WA → `catatOperasi()` | **F-1**: jam masuk per base; status armada |
| 07.30 (Q1) | Batas laporan | – | **F-1**: base tanpa laporan ditandai **telat** |
| 07.00 WIB | Renlap **pagi** | sama seperti malam | Renlap dan PDF versi pagi menggantikan malam di layar |
| Siang | Sortie, water bombing, temuan pilot, foto masuk lewat WA | `catatOperasi()`, ADS-B tiap jam | Aksi, jejak, **F-7** respons, **F-9** armada di luar base |
| Tiap 3 jam | Titik panas dan cluster diperbarui | pipeline FIRMS/Himawari | Status api per base, celah jangkauan, **F-10** api muncul lagi |
| Matahari terbenam | Batas terang | hitungan astronomi | **F-4**: sisa jam terang 0, kelayakan "di luar jam terang" |
| H+1 sampai H+3 | Penilaian padam ≥ 24 jam dan api muncul lagi ≤ 72 jam | aturan di `ALGORITMA.md` §5 | Hasil per aksi, **F-12** per kabupaten |

## 2. Alur Pusdalops pagi

1. Buka `/operasi`, bagian Operasi Udara, tanggal hari ini.
2. Ubin ringkasan: berapa armada siap, berapa base **telat lapor** (F-1).
3. Tabel Base, saklar "Belum lapor": hubungi base yang telat lewat WA.
4. Saklar "Ada api prioritas": cek kolom kelayakan dan prakiraan 3–6 jam (F-3), batas terang (F-4).
5. Blok Renlap: unduh PDF (F-15) dan KML/GPX, kirim ke satgas base.
6. Kartu Celah jangkauan: cluster prioritas tanpa armada dalam radius; putuskan pemindahan.

## 3. Alur pimpinan

1. Ubin ringkasan dan judul kartu: kesiapan, sortie, persen padam.
2. Kartu Kepatuhan renlap per operator (F-13) dan alasan tidak didatangi (F-14).
3. Kartu Respons (F-7): median per base dan operator, 30 hari.
4. Kartu Kontrak: sisa jam dan perkiraan habis (F-19), hari menganggur (F-21).

## 4. Alur satgas base

1. Buka `/operasi` dengan akun staf berperan, saring pulau, buka base sendiri.
2. Unduh PDF dan GPX renlap base; impor GPX ke perangkat navigasi.
3. Laporkan gelar armada dan hasil sortie lewat WA seperti biasa (tanpa aplikasi baru).

## 5. Status dan peralihannya

| Objek | Status | Peralihan |
| ----- | ------ | --------- |
| Laporan base harian | belum lapor → lapor tepat waktu / lapor telat | jam pesan WA pertama berisi status armada base itu |
| Pesawat | siap, siaga, beroperasi, tidak siap, belum lapor | dari laporan gelar armada; berulang bila Q2 terpenuhi |
| Target renlap | belum didatangi → didatangi | aksi armada base itu ≤ 10 km dari target pada hari renlap |
| Aksi water bombing | menunggu 24 jam → padam / masih api → api muncul lagi | ALGORITMA §5 |
| Cluster prioritas | terjangkau / celah → direspons | ALGORITMA §3 dan §4 |
| PDF renlap | dibuat di Mac mini → diunggah → tersedia di layar | F-15; gagal unggah = kabar pemilik, layar tetap tanpa tombol |

## 6. Alur isian manual (K12)

1. Staf `pusdalops` (K14) membuka `/operasi`. Panel kiri punya grup **Isian**: Gelar armada, Sortie dan hasil, Temuan api pilot, Data armada, Kontrak, Personel darat, Foto, OMC (tautan ke `/admin/omc`).
2. Jalan pintas: tiap baris kotak **Pembaruan data** (Gelar armada 0/55, Sortie terakhir) dan tiap butir **Perlu tindakan** yang soal data (base belum lapor, data belum lengkap) punya tombol **Isi** yang membuka dialog yang sama, sudah terisi tanggal dan base.
3. Dialog gelar armada: daftar pesawat base itu, tiap baris satu deret pil status + kolom alasan (wajib untuk tidak siap). Simpan sekali untuk semua pesawat base.
4. Simpan: Worker memeriksa hak, memvalidasi, menulis baris dengan `sumber = 'manual'` dan `oleh = staf:<id>`, lalu mencatat `op_isian_log` (sebelum, sesudah). Layar memuat ulang data seksi itu saja.
5. Nilai dari isian manual bertanda pil kecil **manual** (tooltip: pengisi dan jam). Klik pil membuka riwayat butir itu.
6. Bot WA datang sesudahnya untuk butir yang sama: tidak menimpa isian manual (K15); pesan WA tetap tercatat di `wa_masuk` dan riwayat menyebut "bot dilewati karena isian manual".
7. Salah isi: tombol hapus di riwayat, alasan wajib (K17). Baris ditandai terhapus, layar kembali ke nilai sebelumnya (bot atau kosong).

| Objek | Status | Peralihan |
| ----- | ------ | --------- |
| Butir data operasi | kosong → bot → manual → (manual diganti manual) → terhapus lunak | K15, K17 |
