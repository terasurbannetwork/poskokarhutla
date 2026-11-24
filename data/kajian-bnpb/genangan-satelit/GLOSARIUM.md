# GLOSARIUM: Genangan satelit per kejadian

| Istilah | Arti di paket ini |
| --- | --- |
| GFM | Global Flood Monitoring, layanan Copernicus EMS yang memetakan air banjir dari radar Sentinel-1 secara otomatis dengan tiga algoritma (ensemble). |
| Lintasan | Satu kali satelit Sentinel-1 lewat di atas wilayah; satu lintasan memotret satu jam tertentu. Ulang lintas 6 sampai 12 hari. |
| Pra | Lintasan sebelum kejadian pada orbit dan jam serupa, pembanding untuk memisahkan air baru dari air lama. |
| Tergenang baru | Area yang tergenang sesudah kejadian dan kering pada lintasan pra. Angka utama paket ini. |
| Latar | Area yang sudah tergenang pada lintasan pra (sawah berair, tambak, rawa). |
| Ter-mask (exclusion mask) | Area yang tidak bisa dibaca GFM, misalnya kota padat dan bayangan lereng. Bukan kering, bukan banjir. |
| Diamati | Nama kolom kode `diamati_ha`: area dalam sapuan radar, TERMASUK yang ter-mask. |
| Teramati | Diamati dikurangi ter-mask: bacaan sah, penyebut cakupan dan persen. |
| Cakupan | Persen luas kab yang teramati pada lintasan itu. |
| Cakupan sah | Cakupan >= ambang Q4 dan sinyal tidak lemah; syarat angka tampil. |
| Sinyal lemah | Tergenang baru kurang dari dua kali latar. |
| Air tetap | Sungai, danau, dan laut menurut lapisan referensi GFM; tidak dihitung banjir. |
| Sel | Kotak kisi halus bangunan paparan F2 berukuran sekitar 110 m. |
| Zona bawah, zona atas | Sel yang paling sedikit separuhnya tergenang baru (bawah) dan sel yang berisi tergenang baru sama sekali (atas); dua ujung rentang penduduk. |
| Kisi kasar | Kab besar yang langkah titik sampelnya lebih lebar dari sel, sehingga zona atas bisa kurang. |
| Penduduk di area genangan | Rentang jiwa per sumber penduduk (zona bawah sampai zona atas). Paparan, bukan jumlah warga terdampak. |
| WorldCover | Peta tutupan lahan ESA 10 m tahun 2021, 11 kelas. |
| Semu SWIR | Citra optik Sentinel-2 dengan kanal inframerah gelombang pendek (B12, B8A, B4) yang membuat air dan lumpur kontras. |
| VV | Polarisasi radar kirim vertikal terima vertikal; air tenang tampak gelap. |
| `banjir_jam1` | Kaji Cepat banjir jam pertama dari kecamatan Siaga/Awas, sebelum satelit lewat. |
| `banjir_gfm` | Kaji Cepat banjir dari genangan GFM, model baru paket ini. |
| Vonis | Hasil uji balik terkunci: menunggu, lulus, gagal, tak dapat dinilai. |
| Estimasi model | Label keyakinan semua angka mesin di Siklus; tidak pernah angka resmi BNPB. |
