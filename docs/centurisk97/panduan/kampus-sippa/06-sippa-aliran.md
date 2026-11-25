# SIPPA: aliran air dan tekanan

Bagian ini menjelaskan cara SIPPA menghitung aliran air dan tekanan di dalam selang.

## SIPPA: perhitungan aliran air dan tekanan

Gambaran sederhana: air kehilangan tekanan sepanjang selang. Makin panjang selangnya, makin sempit, dan makin deras airnya, makin besar tekanan yang hilang. Pompa harus menutup kehilangan itu, mengangkat air naik bila ada beda tinggi, dan masih menyisakan tekanan yang cukup di ujung untuk menyemprot. Kalkulator menghitung ketiganya lalu memeriksa hasilnya terhadap daftar batas pemakaian.

Data: masukan dari staf di layar Hitung. Perhitungan mengikuti rumus baku hidrolika pipa. Rumus rincinya ada di dokumen pengembang.

1. Kehilangan tekanan karena gesekan dihitung dengan rumus baku untuk aliran air di pipa.
2. Ditambahkan kehilangan di sambungan dan belokan, beda tinggi, tekanan sisa yang diinginkan di ujung, dan tinggi hisap pompa 3,5 m bila pompa menghisap.
3. Hasilnya adalah tinggi angkat total pompa, yang diubah menjadi tekanan pompa dalam bar.
4. Daya pompa dihitung dari debit dan tinggi angkat total, dengan efisiensi pompa 0,65.
5. Tekanan di ujung selang dan waktu pengisian selang dihitung dari hasil di atas.
6. Kecepatan aliran, tekanan, dan debit lalu diperiksa terhadap daftar gerbang.

Gerbang yang paling penting:

| Yang diperiksa | Kapan dianggap bermasalah | Seberapa serius |
| --- | --- | --- |
| Tekanan pompa | Melebihi batas kerja selang, yaitu 88 persen dari tekanan nominal selang | Keras |
| Tekanan di ujung | Kurang dari 1 bar: keras. Dari 1 sampai kurang dari 2 bar: syarat | Keras atau syarat |
| Air yang diterima tiap lance | Debit melebihi 40 liter per menit per lance | Keras |
| Kemampuan pompa | Debit di luar kemampuan pompa | Keras |
| Daya | Daya yang dibutuhkan melebihi 85 persen kemampuan pompa | Keras |
| Kecepatan aliran | Di atas 3 m per detik (risiko lonjakan tekanan mendadak) | Syarat |
| Panas | Selang HDPE (plastik keras) di dekat api aktif | Keras |
| Sumber air | Sumber habis: keras. Debit andalan sumber kurang dari 1,5 kali debit pemakaian: syarat | Keras atau syarat |

Angka-angka ini adalah asumsi kebijakan, bukan hasil uji lapangan.

Batas kerja selang diturunkan bila suhu tinggi, tetapi hanya untuk selang HDPE: tiap derajat Celsius di atas 20 derajat mengurangi batas kerja sebesar 1,4 persen dari nilai nominalnya, paling rendah sampai 58 persen. Selang layflat memakai 88 persen dari tekanan kerja di lembar data selang, tanpa koreksi suhu.

Contoh (angka rekaan untuk ilustrasi): selang layflat 100 mm sepanjang 1.000 m dengan debit 300 liter per menit dan 8 lance berarti tiap lance menerima 37,5 liter per menit, di bawah batas 40, jadi lolos. Misalkan pompa menghasilkan tekanan 3 bar dan tekanan yang hilang di selang 1,2 bar. Sisa tekanan di ujung 1,8 bar, di antara 1 dan 2 bar, jadi vonisnya HOLD karena syarat tekanan ujung 2 bar belum terpenuhi.

Kepercayaan: rumusnya baku, tetapi kurva pompa hanya diperkirakan dari dua sampai tiga titik di lembar data pabrik, bukan hasil ukur. Manfaat dan biaya memakai manfaat bawaan nol, jadi jangan dibaca sebagai klaim manfaat.
