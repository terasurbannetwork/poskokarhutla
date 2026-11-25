# PRD: Pemetaan bekas longsor dari satelit

## Pengguna

Staf Pusdalops dan Kedeputian Penanganan Darurat yang menilai sebaran longsor sesudah hujan ekstrem; tim kaji cepat yang memilih kecamatan untuk dikunjungi.

## Fitur

| No | Fitur | Syarat tampil |
| --- | --- | --- |
| F-1 | Poligon bekas longsor baru dari rdNDVI Sentinel-2 untuk satu kejadian dan satu kotak wilayah (kab). | vonis lulus (D3) |
| F-2 | Luas bekas longsor per kecamatan (ha) dan bagian kecamatan yang terliput citra bersih. | vonis lulus |
| F-3 | Peta kerapatan perubahan radar Sentinel-1 per sel 1 km untuk bagian yang berawan. | vonis lulus jalur radar terpisah |
| F-4 | Irisan dengan hilang tutupan tahun yang sama, dilaporkan terpisah tanpa kalimat sebab (Q7). | ikut F-2 |
| F-5 | Status uji per jalur (optik, radar) dengan alasan dan tanggal sidik. | selalu |
| F-6 | Citra sebelum dan sesudah (PNG kecil) untuk tiap kecamatan teratas, sebagai bukti visual. | vonis lulus |

## Larangan

- Tidak ada angka sebelum lulus; kosong tampil "menunggu", tidak pernah 0.
- Tidak menyebut korban, rumah rusak, atau penyebab.
- Tidak membuat kejadian di Buku Besar, tidak masuk Jitupasna, tidak mengubah nowcast longsor.
- Tidak ada router atau pipeline citra kedua.

## Di luar lingkup

Penilaian kerusakan bangunan (paket kerusakan satelit), peringatan dini, volume material longsor, atribusi penyebab.
