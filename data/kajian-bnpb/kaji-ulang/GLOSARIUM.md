# GLOSARIUM: Kaji ulang pasca-kejadian

| Istilah | Arti |
| --- | --- |
| Kaji ulang | Tinjauan sesudah kejadian: apa yang terjadi, apa yang berjalan baik, apa yang diperbaiki. Padanan after-action review. |
| Draf | Susunan fakta yang dihitung mesin dari data sistem; belum disimpan dan bukan pendapat staf. |
| Linimasa | Peristiwa kejadian berurut waktu dari deteksi sampai pulih. |
| Tahap | Satu langkah dalam rantai deteksi, tugas, konfirmasi, kabar, tiba, padam, terverifikasi (`src/sla.js`). |
| Celah data | Tahap atau sumber yang tidak punya catatan; ditulis "tidak ada data", bukan nol. |
| Perkiraan | Penanda deteksi yang jam aslinya tidak ada sehingga jatuh ke jam tugas dibuat. |
| Catatan lapangan | Isi `ops_pelajaran`: catatan per tugas karhutla dari pelaku lapangan. |
| Pelajaran | Butir yang ditulis staf pada kaji ulang: berjalan baik atau perlu diperbaiki. |
| Rekomendasi | Tindakan perbaikan dengan penanggung jawab, tenggat, dan status. |
| Kunci `kaji\|` | Penanda rekomendasi di `dl_tindak`: `kaji\|<KJ>\|<nn>`. |
| Dikerjakan | Label layar untuk status `proses` di `dl_tindak` (belum, proses, selesai tampil sebagai Belum, Dikerjakan, Selesai). |
| Tertutup | Rekomendasi berstatus selesai dengan catatan penutup. |
| Lewat tenggat | Rekomendasi terbuka yang tenggatnya sudah lewat; status tidak berubah sendiri. |
| Potret | Salinan beku linimasa dan durasi saat pengesahan. |
| Disahkan | Kaji ulang yang sudah ditetapkan Koordalops; isi lamanya tidak berubah, hanya bisa ditambah. |
| AAR/IP | After Action Report and Improvement Plan, format FEMA HSEEP: laporan dan rencana perbaikan. |
| IAR | Intra-Action Review, kaji ulang di tengah respons (WHO). |
| HSEEP | Homeland Security Exercise and Evaluation Program (FEMA); rujukan siklus perbaikan. |
