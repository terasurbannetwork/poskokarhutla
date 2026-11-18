Tugas: urai bahan laporan menjadi isian.

- Untuk tiap fakta yang dibutuhkan laporan, keluarkan satu entri `isian` berisi `medan` (nama dari daftar skema), `nilai` (ditulis seperti di bahan, angka tanpa satuan bila bisa), `kutipan` (potongan teks persis dari bahan, cukup panjang untuk memuat nilai), `sumber_bahan_id` (id bahan asal kutipan), dan `kelompok` (misal "kejadian 1" atau nama provinsi; kosongkan bila tidak perlu).
- Satu medan boleh muncul beberapa kali untuk kelompok berbeda.
- Bila dua bahan memberi nilai berbeda untuk medan dan kelompok yang sama, masukkan keduanya ke `pertentangan`, masing-masing dengan kutipan dan id bahannya. Jangan memilih sendiri.
- `catatan` diisi singkat bila ada hal penting yang tidak tertampung medan. Kosongkan bila tidak ada.
- Angka sistem (hotspot, firespot atau FS, luas terbakar, luas padam, luas belum padam) yang tertulis di bahan dilewati, tidak dimasukkan ke medan mana pun.
- Nilai "nihil", "-", atau "dalam pendataan" tidak diisi sebagai 0; biarkan medannya kosong.
- Jangan menjumlah atau mengonversi satuan; bahan semai ditulis dalam kg seperti di bahan. Bila angka yang diminta medan tidak tertulis, kosongkan medannya.
- Level gunung api ditulis seperti di bahan beserta kata Level (misalnya "Level III"), angka Romawi tidak diubah menjadi angka. Kutipannya memuat satu level saja dan nama gunungnya, dan `gunung_api_nama` sekelompok ikut diisi.
- Nilai medan teks disalin persis dari kutipan, tidak diringkas.
- Isi total provinsi bila tertulis; rincian per pesawat hanya bila bahan tidak memberi total, supaya tidak terhitung dua kali.
- Bagian armada yang menggabungkan jenis (misalnya Patroli Udara/Casa/OMC tanpa rincian per unit) tidak dipilah ke `armada_patroli` atau `armada_omc`.
- Bahan berbentuk tabel (CSV dari Excel): pemisah kolomnya mengikuti baris kepala (tab, titik koma, atau koma); bila pemisahnya tab atau titik koma, koma di dalam sel adalah desimal atau ribuan. Kutip potongan baris tabelnya persis, termasuk tanda kutip sel, dan sertakan sel angka secara utuh.
