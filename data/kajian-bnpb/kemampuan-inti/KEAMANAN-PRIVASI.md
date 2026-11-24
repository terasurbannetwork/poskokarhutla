# KEAMANAN-PRIVASI: Kemampuan Inti

- **Kanal keluar (KI-50)** hanya mengirim sumber resmi dengan label lembaganya atau keluaran yang lolos gerbang.
  - Tiap jenis baru melewati double opt-in, HMAC tautan berhenti, dan jeda kirim yang sudah ada di `src/ews.js`.
  - Tidak ada data pelanggan baru yang disimpan.
- **Label laporan warga** (KI-16, KI-53) diolah agregat per kab-bulan.
  - Identitas pelapor, nomor HP, dan koordinat rumah tidak masuk `public/`.
  - Daerah senyap menyebut kab, bukan orang.
- **Dampak (KI-60 sampai KI-67)** berupa angka agregat per kecamatan atau kab, tanpa nama orang. Rumah per rumah tetap di jalur Lapor lanjutan (AGENTS 2.31), tidak di paket ini.
- **Gerbang lisensi (KI-17)**: data nonkomersial (mis. MIROVA, FABDEM CC BY-NC-SA) tidak menjadi masukan model. Atribusi sumber tetap tampil.
- **Secret**: kunci API produk luar (LHASA NASA bila butuh Earthdata, Flood Hub) hanya di secret Actions, tidak di berkas yang dilacak git.
- **Pengulas**: `guard-api` dan `security-reviewer` untuk KI-01, KI-02, KI-50, KI-51.
