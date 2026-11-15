# GLOSARIUM: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Urut abjad. Padanan Inggris di dalam kurung bila ada.

| Istilah | Arti dalam paket ini |
| ------- | -------------------- |
| angkut | Jenis misi mengangkut personel dan alat ke titik darat, bolak-balik (D3). |
| base | Titik berangkat dan kembali helikopter: bandara, lanud, atau helipad. Bisa dari sembilan base karhutla, dari `public/data/udara.json`, atau diketik sebagai titik (Q12). (base) |
| belokan | Titik `BL` yang disisipkan mesin agar leg tidak memotong lingkaran larangan, dicetak sebagai "belokan menghindari <nama zona>". (detour) |
| cadangan bahan bakar | Waktu terbang yang harus tersisa di atas waktu rute: 30 menit [SEMENTARA Q3]. (fuel reserve) |
| cari | Jenis misi pencarian (SAR) dengan pola kotak melebar atau lintasan sejajar. (search) |
| daya tahan | Lama terbang maksimum satu tipe helikopter (`daya_tahan_mnt`). Kosong sampai Q2 dijawab. (endurance) |
| data basi | Data sumber yang lebih tua dari batas basi per sumber. Dianggap tidak ada dan dicetak "tidak diperiksa". (stale data) |
| DMS | Derajat, menit, detik, misal N 02° 47' 03". Dipakai di tabel pilot. (degrees, minutes, seconds) |
| dropping | Jenis misi menjatuhkan atau menyerahkan bantuan di titik darat atau titik jatuh. (airdrop) |
| evakuasi | Jenis misi menjemput korban atau pasien dari titik jemput ke tujuan, jumlah orang tanpa nama. (evacuation) |
| flight plan | Rencana terbang berisi base, titik berurutan, leg, pemeriksaan zona, dan daftar periksa. Usulan, bukan perintah terbang. (flight plan) |
| haluan sejati | Arah awal sebuah leg terhadap utara sejati, tiga angka; 0 ditulis 360. (true course) |
| jejak abu | Sebaran abu vulkanik dari model skenario (`abu_gunungapi.json`). Dilabeli "model, bukan pengamatan". (ash plume) |
| kelayakan terbang | Penilaian cuaca di base dan titik darat dari METAR terdekat: layak, terbatas, tidak layak, atau "tidak ada data". Ambangnya perkiraan (Q7). |
| KRB | Kawasan rawan bencana gunung api yang ditetapkan PVMBG. |
| kunjungan | Jenis misi kunjungan lapangan. Tidak di-commit ke repo dan tanpa nama pejabat. (site visit) |
| lapangan pendaratan | Tempat mendarat di titik darat. Daftar periksa tim darat memakai angka NWCG PMS 510 berlabel sumbernya (Q6). (landing site) |
| leg | Satu ruas terbang antara dua titik berurutan, berisi haluan, km, NM, dan menit. (leg) |
| lingkaran bebas halangan | Lingkaran tanpa halangan di sekeliling bidang darat helikopter; minimal 1,5 kali diameter rotor (PMS 510). Istilah geometri lapangan, bukan status rute. (safety circle) |
| lintasan sejajar | Pola pencarian: ruas sepanjang `p`, pindah `s`, sampai lebar kotak tertutup. (parallel track search) |
| METAR | Laporan cuaca bandara berkala. Sumber kelayakan terbang: `public/banjir/data/cuaca_metar.json`. |
| misi | Jenis tugas terbang: `dropping`, `pantau`, `evakuasi`, `angkut`, `cari`, `kunjungan`. (mission) |
| NM | Mil laut, 1,852 km. Jarak leg dicetak dalam km dan NM. (nautical mile) |
| orbit | Berputar di atas titik untuk mengamati; bawaan 2 menit per titik pada misi pantau. (orbit) |
| pantau | Jenis misi melihat kondisi titik atau kecamatan dari udara. (reconnaissance) |
| penyangga | Jarak tambahan di luar radius larangan PVMBG: 5 km [SEMENTARA Q4], tanpa sumber resmi. (buffer) |
| perhatian | Tingkat pemeriksaan zona yang dicetak sebagai catatan; tidak mengubah rute (D4). (caution) |
| PIC | Pilot in command, pilot penanggung jawab yang menetapkan rute, ketinggian, dan keputusan terbang. |
| plus code | Kode lokasi Open Location Code. Hanya plus code penuh (10 atau 11 karakter) diterima, atau pendek dengan titik acuan dalam 50 km. |
| pola kotak melebar | Pola pencarian ruas 1 dan 2 sepanjang `s`, ruas 3 dan 4 `2s`, dan seterusnya, belok kanan 90 derajat. (expanding square search) |
| PVMBG | Pusat Vulkanologi dan Mitigasi Bencana Geologi (Badan Geologi), penetapan level dan radius per gunung. |
| renlap | Dokumen rencana operasi udara di repo (renlap karhutla, renlap banjir). Misi Udara menambah renlap flight untuk semua bencana. |
| titik darat | Titik tempat helikopter mendarat (base, lapangan pendaratan). Di dalam zona larangan, flight plan ditolak. (landing point) |
| titik jatuh | Titik penjatuhan muatan pada dropping lempar rendah. (drop point) |
| titik menyusul | Titik sementara yang koordinat pastinya belum ada; berlabel dan memicu versi baru saat diganti (F-3). (pending waypoint) |
| VONA | Pemberitahuan aktivitas gunung api untuk penerbangan dengan kode warna penerbangan merah, oranye, kuning, hijau. (Volcano Observatory Notice for Aviation) |
| versi | Nomor flight plan yang bertambah tiap dibuat ulang; versi lama tidak ditimpa. |
| zona larangan | Zona bersumber resmi atau zona manual berbentuk lingkaran atau poligon yang membelokkan leg atau menolak titik darat. (exclusion zone) |
| zona manual | Zona yang diisi staf per kejadian dengan alasan dan sumber wajib (Q14). |
| zona perhatian | Zona yang dicetak sebagai catatan bagi pilot, tanpa mengubah rute. |
