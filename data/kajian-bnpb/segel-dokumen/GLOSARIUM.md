# GLOSARIUM: Segel dokumen

| Istilah | Arti |
| --- | --- |
| Segel | Catatan di sistem yang mengikat satu dokumen terbitan ke sidik isinya, diberi kode yang tercetak di lembar. |
| Kode segel | 10 huruf acak (Crockford base32) yang tercetak di bawah QR, ditulis `ABCDE-FGHJK`. |
| Sidik | sha256 isi beku dokumen, 64 huruf heksadesimal. Sidik pendek = 12 huruf pertamanya. |
| Sidik berkas | sha256 byte berkas PDF yang disimpan sekali. Kosong bila PDF dirender ulang tiap diminta. |
| Titik beku | Tempat sistem menyimpan versi dokumen yang tidak boleh berubah lagi: `lk_snapshot`, `lkb_snapshot`, `pb_dokumen` beku di R2, `lj_beku`. |
| Rujukan | Penunjuk ke baris beku sumber, mis. `2026-11-23#1` untuk ralat 1 laporan karhutla tanggal itu. |
| Rujukan dasar | Rujukan tanpa nomor ralat atau versi; dipakai mencari versi yang lebih baru. |
| Ralat | Koreksi atas laporan yang sudah dikunci. Ralat membuat versi beku dan segel baru; yang lama tidak diubah. |
| Cabut | Menyatakan segel tidak berlaku lagi. Hanya menambah baris di `segel_cabut`. |
| Tidak cocok | Status bila sidik hitung ulang berbeda dari sidik segel, atau isi sumber hilang. |
| Data sampul | Data yang boleh tampil publik: jenis, wilayah, periode, versi, penerbit, waktu terbit, status, sidik. |
| TTE | Tanda tangan elektronik tersertifikasi (BSrE). Bukan bagian paket ini. |
