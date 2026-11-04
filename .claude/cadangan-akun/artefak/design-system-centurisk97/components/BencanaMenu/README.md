# BencanaMenu

Menu tarik turun pilihan bencana di header, digambar dari registri `public/bencana.json`.

- Markup `<details class="bencana" data-bencana="<id>">` dengan cadangan statis; `/inti/kepala.js` mengisinya.
- Ringkasan: ikon bencana 17–18px + nama (`brand-name`, putih). Menu: kartu radius 14px, `shadow-lg`.
- Bencana yang belum dibuka tampil redup dengan pil `Soon`, tidak bisa diklik. Prediksi dipisah garis.
- Ikon bencana berwarna tetap (api jingga, air biru, gempa cokelat); ini ilustrasi, bukan token.
- Disembunyikan di bawah 640px.
