# KEAMANAN-PRIVASI: Pembiayaan risiko

| Data | Aturan |
| --- | --- |
| Saldo DSP/PFB, skema, polis | Data fiskal, hanya pimpinan, Pusdalops, Koordalops (baca) dan Super Admin (tulis), tanpa peran baru (Q9). BPBD tidak melihat saldo pusat. Tidak ada di `public/`, tidak di JSON statis, tidak di cache publik, tidak di tangkapan layar OG. |
| Realisasi DSP | Mengikuti hak meja DSP yang sudah ada; halaman ini tidak memperluas siapa yang melihat. |
| Perkiraan model | Berlabel hipotesis, hanya staf, tidak masuk dokumen yang dibagikan keluar sebelum lulus uji balik. |
| Isian saldo | Wajib ada sumber; append-only, tidak ada rute ubah atau hapus. `oleh` tampil sebagai nama hanya untuk staf. |
| Catatan | Maksimal 300 karakter, dibersihkan; ditolak bila memuat nomor telepon atau nomor rekening. |
| Ekspor | PDF atau CSV berisi uang diberi tanda "internal" dan hanya diunduh peran berhak; tidak ada tautan terbuka. |
| Batas laju | Per akun untuk tulis. |
| Rahasia | Tidak ada kunci atau token baru; tidak ada panggilan ke sistem Kemenkeu atau BPDLH dari Worker. |

Peminta tanpa hak dijawab sama dengan kejadian tidak ada. Pemeriksa: `guard-api`, `security-reviewer`, `migrasi-idempoten`; `validasi-model` untuk pra-registrasi dan uji balik.
