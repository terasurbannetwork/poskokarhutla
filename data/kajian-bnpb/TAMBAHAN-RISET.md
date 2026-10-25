# Tambahan dari skill deep-research untuk alur penulisan kajian

Dinilai 23 Okt 2026. Dipakai sebagai arsitektur tahap naskah.

## Dipakai

| No | Insight skill | Penerapan di kajian | Diperiksa oleh |
| --- | --- | --- | --- |
| 1 | Peneliti dan penulis dipisah; penulis tidak meriset sendiri, hanya menyintesis catatan | Tiap bab punya berkas bukti `naskah/<kajian>/bukti/bab-NN.md` yang disusun lebih dulu dari riset A–D, data/*, dan sumber tambahan; penulis bab menulis HANYA dari berkas bukti + angka.json | penyunting substansi: klaim di naskah yang tidak ada di berkas bukti ditolak |
| 2 | Catatan per pertanyaan kunci dengan empat bagian: Inti, Temuan bersumber, Inferensi, Celah | Struktur wajib berkas bukti: per pertanyaan kunci bab, bagian Inti, Temuan bersumber (tiap butir bersumber, termasuk "dibantah oleh"), Inferensi (analisis tim, ditandai), Celah (yang tidak ditemukan) | qa: berkas bukti tanpa empat bagian ditolak |
| 3 | Evaluasi sumber: fakta vs spekulasi, sumber asli vs agregator, sumber bermasalah, konflik ditulis | Label keyakinan (resmi/terverifikasi/estimasi-model/asumsi-kebijakan) + aturan: berita hanya bila sumber resmi tidak ada dan ditandai; agregator diganti sumber aslinya; konflik ditulis berdampingan | penyunting substansi |
| 4 | Klaim tanpa sumber dibuang, bukan diperhalus | Kalimat faktual tanpa sumber dipindah ke Celah atau dihapus; tidak ada "diperkirakan" untuk menutupi ketiadaan sumber | qa: paragraf isi tanpa rujukan atau token angka dihitung |
| 5 | BLUF: pembuka yang langsung menjawab | Ringkasan Eksekutif dan kotak ringkasan tiap bab dibuka dengan temuan terpenting berangka, lalu arti dan dampaknya bagi BNPB; pembaca yang berhenti di situ sudah paham | penyunting bahasa |
| 6 | Judul penunjuk arah berisi temuan spesifik | Judul bab tetap baku dan kapital (keputusan T1). Judul subbab tingkat 3 dan judul kotak temuan memakai bentuk penunjuk arah berangka, mis. "Kedung Ombo kehilangan 5,5% tampungan" alih-alih "Sedimentasi waduk", selama tetap formal dan ≤ 2 baris | penyunting bahasa |
| 7 | Prosa padat, fakta kunci ditebalkan, kutipan strategis | Paragraf isi berbentuk prosa; daftar butir hanya untuk enumerasi sejajar (lembaga, langkah); angka kunci tebal; rujukan pada klaim besar, angka, dan dokumen | qa: rasio butir terhadap paragraf per bab |
| 8 | Data ditafsirkan, bukan didaftar | Tiap angka utama disertai pembanding (target RPJMN, tahun lalu, provinsi lain, standar internasional) dan artinya bagi keputusan | penyunting substansi |
| 9 | Kejujuran analitis: ketidakpastian dinyatakan, posisi lawan diuji, kesimpulan diambil | Tiap rekomendasi besar yang diperdebatkan (mis. tanggul laut, normalisasi vs naturalisasi sungai, relokasi) menampilkan argumen tandingan dan bukti kegagalan (pola Empat Sungai Korea), lalu posisi kajian | penyunting substansi |
| 10 | Kesimpulan berisi wawasan baru, bukan ringkasan ulang | Bab Kesimpulan dan Rekomendasi berisi keputusan dan implikasi; tidak mengulang paragraf bab sebelumnya | detektor pengulangan kalimat lintas bab |

## Tidak dipakai

| Insight skill | Alasan |
| --- | --- |
| Batas 15 panggilan alat per peneliti | Kajian ini butuh penelusuran lebih dalam per bab |
| Laporan tanpa daftar butir sama sekali | Dokumen kebijakan butuh enumerasi lembaga dan langkah; dibatasi, bukan dilarang |
| Judul bab bergaya naratif | Keputusan T1: judul bab baku |
