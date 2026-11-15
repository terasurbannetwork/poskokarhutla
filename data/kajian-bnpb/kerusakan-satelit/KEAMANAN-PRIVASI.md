# KEAMANAN-PRIVASI: Perkiraan kerusakan satelit

| Hal | Aturan |
| --- | --- |
| Keluaran tingkat bangunan | Hanya di R2 `siklus/kerusakan/`, tidak di `public/`, tidak dilayani rute; hanya agregat per kab dan kecamatan yang dilayani setelah masuk. Open Buildings tidak membawa nama atau penghuni; tetap diperlakukan sebagai data paparan rinci. |
| Akses | Rute baca dan terima di balik sesi (pola `src/bangunan.js`: auth pertama sebelum R2). Tamu tidak tahu apakah berkas ada. |
| Hak terima | Hanya peran pengisi Jitupasna; BPBD hanya kab wilayahnya (Q6). |
| Label | Setiap angka satelit membawa label `estimasi-model`, tanggal citra, cakupan; dilarang tampil tanpa itu. |
| Pelaporan | Tidak ada pelaporan ke warga atau publik dari keluaran ini; tidak ada klaim kerusakan bangunan tertentu. |
| Data pribadi | Tanpa NIK, tanpa registri pengungsi per orang, tanpa nama. |
| Sumber citra | Token SAS anonim Planetary Computer tidak disimpan di berkas yang dilacak git. |
| Catatan staf | Catatan asal terisi otomatis dan tanpa isian bebas berisi data pribadi; panjang dibatasi (asumsi 300 karakter, pola kolom `asumsi`). |
| Riwayat | Perkiraan lama tidak ditimpa; baris terima tidak dihapus lewat fitur ini. |
