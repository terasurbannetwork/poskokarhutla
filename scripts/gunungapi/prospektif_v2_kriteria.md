# Pra-registrasi metode arah abu v2 (KI-80), dibekukan 2026-11-25

Dibekukan lewat `prospektif_v2.sidik` (`scripts/umum/sidik.py`). Berubah satu bait di berkas kode atau di berkas ini = entri baru tidak lagi berlabel `v2` dan tidak ikut vonis.

Latar: uji balik 18 entri lama, model 78% (n 18) lawan persistensi VONA 93% (n 15). Tiga sebab yang ditemukan dan diperbaiki sebelum entri baru dicatat:
1. arah lama = titik tengah SEMUA partikel melayang; VONA melaporkan puncak awan yang terlihat. Metrik baru: arah kolom atas (partikel di 0,5H sampai 1H di atas puncak, berbobot massa). Metrik lama tetap dicatat (`skenario.arah_deg`).
2. skenario lama mengandaikan erupsi pada `angin.mulai`, VONA terbit hingga 12 jam kemudian. Baru: skenario dicatat untuk awal erupsi k = 0..12 jam; saat dinilai dipilih k = jam terbit VONA (dibulatkan, 0..12).
3. potret lama jam 6, uji balik jam 3. Baru: keduanya jam 3 (`abu.JAM_ARAH` = `uji_abu.JAM_NILAI`).

Aturan nilai: cocok bila selisih sudut arah utama dan arah VONA <= 45 derajat (8 mata angin). Arah utama = kolom atas; sebaran mentah hanya bila < 20 partikel di pita atas.
Pembanding pada baris yang sama: persistensi (VONA terakhir <= 30 hari), klimatologi leave-one-out, acak 25%, campuran (VONA terakhir; ganti ke arah model bila angin di tengah pita atas berbelok > 45 derajat sejak VONA itu dan lajunya > 5 m/s; angin tak tercatat = tak dihitung).
Entri yang dihitung: metode `v2`, dicatat SESUDAH 2026-11-25, `n_vona` > 0, tidak `terlambat`.
Vonis hanya bila n >= 60 DAN >= 4 gunung; selang 95% bootstrap berblok per gunung atas (model - persistensi): batas bawah > 0 = unggul, batas atas < 0 = kalah, selain itu setara. Sebelum itu layar menulis "belum teruji". Tidak ada ambang yang diubah sesudah melihat hasil.
