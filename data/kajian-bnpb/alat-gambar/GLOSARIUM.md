# GLOSARIUM: Alat gambar wilayah

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Gambar | Bentuk yang digambar pengguna: poligon, kotak, atau buffer |
| Buffer | Lingkaran dari satu titik atau kapsul dari garis, jari-jari 1 sampai 50 km |
| Luas wilayah digambar | Luas geodesik gambar (km2, ha). Bukan luas terbakar, bukan luas bakar |
| Titik panas | Deteksi satelit satu piksel; istilah layar (bukan "titik api") |
| Lokasi unik per hari | Satu petak 375 m per hari WIB, bukan satu baris deteksi (`scripts/data/titik_unik.py`); angka utama alat ini |
| FRP | Daya radiatif api (MW) per deteksi; dijumlah dan diambil maksimumnya, baris tanpa FRP dikeluarkan |
| Siang, malam | Dari jam WIB deteksi; malam 18.00 sampai 06.00 WIB; tanpa tafsir gambut |
| Petak, sel | Sel 0,003375 derajat dengan bujur diskalakan cos lintang (±375 m), sama dengan sel angka utama |
| Sel berdeteksi | Jumlah petak berbeda dengan sedikitnya satu deteksi dalam periode |
| Jejak sel | Sel berdeteksi × luas sel (sekitar 14,08 ha); bukan luas terbakar |
| Luas dNBR | Luas citra Sentinel-2 per insiden (`luas_citra.py`), batas bawah, bukan luas gambar |
| `acuan` | Waktu referensi `hotspot.json`; `jam` tiap titik relatif terhadapnya |
| Desa beririsan | Desa yang poligonnya berpotongan dengan gambar |
| Penduduk kecamatan yang beririsan | Jumlah `kec` di `penduduk.json` untuk kecamatan yang beririsan; perkiraan kasar, bukan penduduk di dalam gambar |
| `MAKS_KAB`, `MAKS_SIMPUL` | Batas 12 kabupaten dan 200 simpul |
| Tak terukur | Tidak dapat dihitung (data belum ada atau terlalu luas); bukan nol |
| Mode gambar | Keadaan peta saat alat aktif; penangan klik peta dialihkan dan dikembalikan saat keluar |
