# DESIGN-SYSTEM: Kemampuan Inti

Paket ini hampir seluruhnya mesin. Yang tampil di layar memakai komponen yang sudah ada, tanpa gaya baru (AGENTS 3.9):

- **Pil hipotesis** dari gerbang (`public/inti/gerbang.js`) memakai pil kategori `.ex-ey` di `public/inti/kartu.css` dengan token warna di `public/inti/tema.css`. Teks: "Hipotesis, belum lolos uji". Alasan dari gerbang masuk `title` pil, bukan kalimat di kartu.
- **Pita P10 sampai P90** ditulis "antara A dan B" dengan format angka Indonesia dan tanpa presisi palsu (`selera-angka`). Satu angka tunggal hanya tampil untuk keluaran yang lolos.
- **Vonis di Metode** memakai kartu standar `.ex.ex-std` (AGENTS 3.5): kepala = nama seksi, tabel metrik model lawan persistensi lawan klimatologi, tanpa kaki sumber dan tanpa kalimat kesimpulan.
- **Peringatan resmi** membawa label lembaganya apa adanya. Deteksi kita berlabel "Deteksi Centurisk97".
- **Mesin perlakuan inti** (KI-40) memakai tampilan peringkat yang sudah ada di Simulasi gunung api. Klik pengurutan mengikuti pola `nanti()` (INP).
- Tidak pernah menulis "aman". Kosong ditulis "belum tersedia", bukan nol.
