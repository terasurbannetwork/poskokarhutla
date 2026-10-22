# Deck 221026 versi data 22 Okt sementara (cut-off 22 Okt 16.25 WIB)

Permintaan pemilik 22 Okt sore: kolom 20/21/22 Okt dengan hari 22 Okt yang belum lengkap. Pipeline sama dengan folder induk, dengan perubahan:

- `hitung3.py`, `hitung_nasional.py`: `CUT = 22 Okt 16.25 WIB`, `HARI = 19-22 Okt`; `hitung3.py` menambah NTT (53) ke `TGT`.
- `ganti.py`: kolom 18/19/20 -> 20/21/22, judul dan subjudul 22 Okt, "api 20 Okt telah padam pada 22 Okt", cut-off 16.25 WIB. NTT tidak
  ada di templat BNPB: barisnya salinan baris Kaltim dengan nama "Nusa Tenggara Timur" (huruf 88%) dan lambang NTT dari Wikimedia Commons
  (`logo-ntt.png`, File:Coat of arms of East Nusa Tenggara.svg).
- `koordalops.py`: pil PM2.5 dan cuaca kini dipilih menurut nama provinsi di baris, bukan urutan baris.
- `sementara.py`: catatan kaki slide peta dan tabel ditambah "Angka 22 Okt sementara, data s.d. 16.25 WIB."
- Slide operasi tetap data 21 Okt (laporan Koordalops 22 Okt belum ada).

Yang belum masuk pada 16.25 WIB: lintasan malam 22-24 WIB. Pada 21 Okt lintasan itu menambah sekitar 13-14% titik nasional, tetapi
dampaknya tidak merata: Indonesia timur (Papua, Maluku) dilewati lintasan malamnya sekitar 23 WIB, jadi angka 22 Okt di sana jauh terlalu
rendah (Papua Selatan 38 titik, 21 Okt 1.039). "Telah padam" di subjudul slide tabel juga terlalu besar karena lokasi yang belum terlihat lagi
pada 22 Okt dianggap padam.
