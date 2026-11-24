# KEAMANAN-PRIVASI: Alat gambar wilayah

## 1. Data dan sensitivitasnya

| Data | Sumber | Sensitivitas | Boleh publik |
| ---- | ------ | ------------ | ------------ |
| Gambar pengguna (simpul, jari-jari) | pengguna | sedang: dapat membuka minat lokasi tertentu | tidak meninggalkan peramban (D11) |
| Titik panas | `hotspot*.json` | rendah, sudah publik | ya |
| Desa, kecamatan, penduduk kecamatan | `geo/desa`, `geo/kecamatan`, `penduduk.json` | rendah | ya, berpil perkiraan kasar |
| Luas dNBR insiden | `citra.json` atau `luas_citra.json` | rendah | ya, per insiden |

Tidak ada data pribadi. Paket ini tidak punya rute tulis.

## 2. Aturan keras

1. Gambar tidak dikirim ke server, tidak masuk URL, tidak masuk `localStorage`, `sessionStorage`, atau IndexedDB (D11, Q2).
2. Tidak ada `fetch` selain berkas JSON milik situs yang sudah publik; tidak ada sumber pihak ketiga; tidak ada kunci atau token di klien.
3. Teks dari data (nama desa dan kecamatan) dimasukkan ke DOM lewat `textContent`, bukan `innerHTML`.
4. Tidak ada `eval`, `Function`, atau `innerHTML` dari data luar.
5. Tidak ada pelacakan penggunaan alat dengan koordinat (tanpa analitik lokasi).
6. Tidak ada nama orang, pemilik lahan, atau konsesi di hasil.
7. Poligon dibatasi `MAKS_SIMPUL` agar masukan berlebih tidak membekukan halaman.
