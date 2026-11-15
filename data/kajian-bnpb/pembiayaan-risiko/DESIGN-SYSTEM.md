# DESIGN-SYSTEM: Pembiayaan risiko

Mengikuti kartu standar AGENTS.md 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber, kepala tabel navy tulisan putih, kartu berjarak 20 px, tanpa huruf kapital semua, tanpa pemisah titik tengah, tombol ikon polos) dan token tema `public/inti/tema.css`. Hanya untuk staf.

| Komponen | Isi |
| --- | --- |
| Halaman pembiayaan per kejadian | Di bawah `/siklus/kejadian/<KJ>`, kartu berurutan: Kerugian, Perkiraan awal (bila ada), Dana, Perbandingan, Parametrik (bila ada catatan). |
| Kartu "Kerugian" | Tabel sektor: kerusakan, kerugian, pil keyakinan (resmi, asumsi kebijakan, menunggu). Sel menunggu tertulis "menunggu", bukan 0. |
| Kartu "Perkiraan awal" | Tiga angka bawah, tengah, atas berlabel hipotesis sampai lulus; ikon info menjelaskan uji balik di `title`. Tidak ada kartu bila model belum lulus. |
| Kartu "Dana" | Tabel per lapis: realisasi DSP (sistem), saldo DSP, saldo PFB; kolom tanggal data, sumber, tanda basi. "belum diisi" bila kosong. Tombol ikon isi saldo membuka laci. |
| Kartu "Perbandingan" | Dua baris berdampingan (kerugian, dana), kolom selisih dan keyakinan; alasan bila selisih tidak dihitung. Tanpa warna merah hijau vonis. |
| Kartu "Parametrik" | Tabel skema dan status pemicu; baris data yang dibaca. |
| Laci isi saldo | Nilai, tanggal data, sumber (wajib), catatan; riwayat di bawahnya. |

Klik membuka laci seketika; data dimuat tertunda (INP). Angka uang diformat Rupiah dengan tahun harga di kepala kolom.
