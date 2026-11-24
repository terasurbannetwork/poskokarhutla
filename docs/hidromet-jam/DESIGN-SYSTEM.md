# DESIGN SYSTEM

Kartu baru di `/cuaca` memakai komponen kartu, pil, dan token warna yang sudah ada di `public/cuaca/` (tidak membuat token baru).

| Kartu | Isi utama | Pil |
| --- | --- | --- |
| Embusan awan badai terekam | Bandara, waktu, "suhu turun 8 °C, tekanan naik 1 hPa, angin berbalik", embusan km/jam | "Pengamatan" |
| Awan tumbuh cepat | Kabupaten, "puncak awan mendingin 9 °C dalam 30 menit", suhu puncak sekarang | "Pengamatan · uji" |
| Jam rawan hujan | Batang 24 jam, jam puncak, jendela 70% | "Rata-rata satelit 2015-2026" |
| Bibit siklon | Nama, posisi, jarak ke daratan terdekat, peluang JTWC | "JTWC" |

Aturan angka: satuan lokal (°C, km/jam, WIB/WITA/WIT), tanda "±" untuk perkiraan satelit, tanpa desimal palsu.
Setiap kartu menyebut sumber dan "bukan peringatan resmi BMKG". Klik kartu tidak boleh membekukan layar (aturan INP).
