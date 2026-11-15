# DESIGN-SYSTEM: Status Lifeline

Mengikuti kartu standar AGENTS.md 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber, kepala tabel navy tulisan putih, kartu berjarak 20 px, tanpa huruf kapital semua, tanpa pemisah titik tengah, tombol ikon polos) dan token tema `public/inti/tema.css` (gerbang token warna).

| Komponen | Isi |
| --- | --- |
| Kartu "Status layanan" di halaman kejadian `/siklus/kejadian/<KJ>` | Tabel kab (baris) x delapan layanan (kolom, ikon + nama pendek). Sel = blok warna token (ok, warn, bad, line untuk abu) dengan huruf singkat untuk pembaca layar dan buta warna (B, T, L, ?). Tanda jam kecil bila lewat 24 jam. Titik kecil bila ada usulan yang berbeda dari status resmi. |
| Laci sel | Kepala: kab dan layanan. Isi: status resmi + oleh + kapan; usulan mesin + daftar isyarat (sumber, jumlah, waktu, tautan ke rincian bila masih ada; isi bukti disalin ke `lf_riwayat.bukti` sehingga tetap terbaca sesudah laporan warga dihapus 7 hari); form tetapkan (empat pilihan warna, centang isyarat sebagai bukti, catatan); riwayat. |
| Ringkasan di `/bnpb/dalops` | Per kejadian aktif: hitungan sel merah dan kuning per layanan, tautan ke kisi. |
| Konteks provinsi | Baris terpisah di bawah kisi: padam internet IODA provinsi, berlabel "per provinsi, bukan per kab". |

Klik sel membuka laci seketika; isyarat dimuat tertunda (INP).
