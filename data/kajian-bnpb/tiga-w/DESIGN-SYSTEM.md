# DESIGN-SYSTEM: 3W dan tawaran

Mengikuti kartu standar AGENTS.md 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber, kepala tabel navy tulisan putih, kartu berjarak 20 px, tanpa huruf kapital semua, tanpa titik tengah, tombol ikon polos) dan token `public/inti/tema.css`.

| Komponen | Isi |
| --- | --- |
| Kartu "Siapa di mana" di halaman kejadian `/siklus` | Tabel kab (baris) x delapan klaster (kolom, ikon). Sel = jumlah organisasi berjalan; sel celah bertanda kosong bergaris; sel tumpang tindih bertanda warna peringatan. Klik sel membuka daftar organisasi dan kegiatannya. Tombol "Tambah" dan "Buat tautan organisasi". |
| Kartu "Tawaran bantuan" | Tabel: organisasi, barang, jumlah, status (pil), diperbarui. Filter status. Klik baris membuka laci: rincian, mitra lokal, kandidat kebutuhan, tombol keputusan, riwayat. |
| Halaman organisasi bertoken `/bantu#t=` | Satu halaman ringan, dapat dibuka di ponsel: nama kejadian, baris 3W milik organisasi, form tambah baris, form tawaran, status tawaran. Pakai `public/inti/spek.js` untuk form dan antrean `PbAntre` bila luring. |
