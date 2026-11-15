# DESIGN-SYSTEM: Penurunan tanah

Mengikuti kartu standar AGENTS.md 3.5 (kepala kartu nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber, kepala tabel navy tulisan putih, kartu berjarak 20 px, tanpa huruf kapital semua, tanpa pemisah titik tengah, tombol ikon polos) dan token tema `public/inti/tema.css` (gerbang token warna). Layar banjir tetap terpisah dari layar karhutla; komponen bersama lewat layar-peta.

| Komponen | Isi |
| --- | --- |
| Lapis peta "Penurunan tanah terukur" | Tambahan di daftar lapis `public/banjir/lapis_ekstra.js` (kunci baru di samping `subsiden` literatur, yang tetap ada dengan nama "Penurunan tanah (literatur)"). Poligon kecamatan diwarnai dengan skala `SUB_WARNA` yang sama dengan lapis literatur (`lapis_ekstra.js:44`: batas 5, 10, 20 cm per tahun) supaya dua lapis sebanding. Kecamatan tanpa data: tidak diwarnai. Pil "Hipotesis" di legenda. |
| Kartu "Penurunan tanah" | Kepala: nama kecamatan, ikon. Isi: angka besar laju median cm per tahun dengan satuan, pil metode (dua geometri, satu geometri), tabel kecil (p90, rentang, n piksel, cakupan, periode, acuan). Pembanding literatur satu baris. |
| Kartu "Proyeksi 10 dan 20 tahun" | Kartu terpisah dari kartu rob. Tabel dua baris (10 th, 20 th) x tiga kolom (rendah, pusat, tinggi) dalam cm, kalimat netral "bila laju bertahan". Tanpa grafik tahun tenggelam. |
| Kartu rob (ada) | Baris "turun tanah, literatur (hipotesis)" (`peta.js:163`) tetap, kini mengutamakan laju kecamatan bila ada, dengan label sumbernya berbeda ("terukur satelit, hipotesis"). Tidak digabung dengan angka pasang. |
| Catatan kaki pasang | `lapis_air.js:122` menyebut penurunan tanah berdiri sendiri di kartu lain. |
| Label | Tiga label tetap: hipotesis (belum divalidasi GNSS), cakupan rendah, data lebih dari satu tahun. Warna label dari token (`warn`, `line`), tanpa warna baru. |

Klik kecamatan membuka kartu seketika; berkas proyeksi dimuat tertunda (INP). Tidak ada kontur halus: sumbernya piksel 330 m diagregasi, bukan permukaan kontinu. Angka dibulatkan sesuai galat (1 desimal untuk laju, bulat untuk cm kumulatif).
