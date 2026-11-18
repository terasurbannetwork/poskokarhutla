# ALUR: mencatat tindakan di operasi

## 1. Staf atau BPBD mencatat tindakan

1. Buka `/operasi`, menu Operasi Udara, seksi Sarana dan fasilitas, pilih bencana (misal longsor).
2. Kartu "Tindakan" menampilkan tindakan yang biasa dilakukan untuk bencana itu beserta persen kejadian di logbook Pusdalops.
3. Di kartu Renlap, pilih provinsi; renlap berstatus terbit atau selesai punya tombol "Isi hasil".
4. Kartu Hasil tindakan memuat target. Tiap baris: didatangi, alasan bila tidak, hasil, **tindakan**, catatan.
5. Kolom tindakan: tombol "Pilih tindakan" membuka daftar centang tindakan bencana itu. Jumlah terpilih tampil di tombol.
6. "Simpan hasil" mengirim `POST /api/pb/hasil` per 100 butir. Butir yang tindakannya disentuh membawa `tindakan` (daftar kode, boleh kosong untuk menghapus); butir yang tidak disentuh tidak membawa kunci itu sehingga tindakan lama tetap.
7. Jawaban sukses: "n butir tersimpan". Bila migrasi 0153 belum diterapkan: hasil tetap tersimpan dan pesan menyebut tindakan belum bisa disimpan.

## 2. Membaca rekap

1. Kartu Kepatuhan, pilih rentang tanggal, "Tampilkan kepatuhan".
2. Selain renlap, target, didatangi, dan alasan, tampil daftar tindakan dengan jumlah target yang mencatatnya.

## 3. Status

Tindakan tidak punya status sendiri. Ia mengikuti baris hasil (renlap terbit atau selesai). Renlap draf atau diminta tidak menerima hasil maupun tindakan (409, sama dengan sekarang).

## 4. Pembaruan persen logbook

Pemegang arsip logbook menjalankan `python3 -I scripts/data/logbook_tindakan.py` di mesin lokal sesudah arsip diperbarui, lalu meng-commit `public/data/bnpb/logbook_tindakan.json`. Tanpa workflow: arsip mentah tidak ada di GitHub.
