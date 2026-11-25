# Cara membaca status dan batasannya

Catatan agar status uji balik tidak salah dibaca.

## Tiga hal yang perlu diingat

Pertama, hanya satu subbagian yang berkas modulnya sebut lulus tanpa syarat, yaitu indeks cuaca kebakaran (FWI) di dokumen 02. Aturan Prioritas provinsi berstatus campuran: ambang kajian lulus uji tertahan, tetapi aturan yang dipakai layar dipilih sesudah uji balik ulang dan vonis lulusnya tidak tertulis. Kedua, hampir semua model prediktif lain berstatus hipotesis, belum diuji, atau gagal; ini disengaja dan tampil begitu di layar. Ketiga, uji prospektif (prakiraan dibekukan sebelum kejadian lalu dinilai) pada 23 November 2026 belum menghasilkan vonis "teruji" untuk satu kode pun di `/prediksi` ([07](/docs/pengembang/prediksi)).

## Dokumen lain yang perlu dibaca bersama

- - `AGENTS.md` di akar repo: aturan kerja, peta modul, dan urutan paket dokumen per modul.
- `data/kajian-bnpb/<modul>/KEPUTUSAN-*.md`: keputusan pemilik dan pertanyaan terbuka, yang menang atas dokumen paket lain.
