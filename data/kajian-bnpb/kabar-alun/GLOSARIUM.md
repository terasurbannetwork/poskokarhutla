# GLOSARIUM: Kabar Alun-alun

| Istilah | Arti di modul ini |
| --- | --- |
| Alun-alun | tab publik di `/lapor` yang menampilkan kabar bencana; bukan forum `/alun` (`alun_utas`) |
| Kejadian | satu jenis bencana di satu kab/kota dengan tanggal mulai yang sama; kunci `jenis harian + kab_kode + mulai` |
| Kejadian resmi | kejadian yang ada di laporan harian BNPB |
| Belum ada laporan resmi | kejadian yang hanya punya laporan warga (atau berita), tanpa baris di laporan harian |
| Laporan harian | Laporan Kejadian Bencana Harian BNPB; sumber `data.json` hasil `harian.py` |
| Cut-off | waktu batas data laporan harian, nilai `cutoff` di `data.json` |
| Pita sumber | satu bagian kartu kejadian per sumber: Resmi BNPB, Laporan warga, Berita, Media sosial |
| Laporan warga | laporan Lapor Bencana berstatus ditindaklanjuti atau selesai, digugus 30 hari |
| Klaster warga | satu baris `GET /api/lapor/alun`; gabungan laporan warga dalam satu gugus; `dampak` berupa angka tunggal per bidang |
| Menempel | klaster warga atau berita dipasang pada kejadian resmi lewat kab, jenis, dan jendela tanggal |
| Jendela tanggal | `mulai - 1 hari` sampai hari laporan |
| `kab_kode` | kunci `"<kode prov>|<nama kab>"` dari `Geo.pusat["kab"]` di `scripts/umum/berita.py` |
| Lokasi belum terpetakan | nama kab di laporan harian tidak cocok persis; kejadian tanpa titik, hanya di daftar |
| Kesegaran | umur laporan resmi KEJADIAN itu (`cutoff_terakhir`); lewat 48 jam kartu menulis "Laporan resmi terakhir <tanggal>" |
| `selesai_lama` | tanda: kejadian selesai dan laporan terakhirnya lebih dari 7 hari; hanya muncul di saringan Selesai |
| `lap_terakhir`, `cutoff_terakhir` | tanggal dan cut-off `data.json` terakhir yang menyebut kejadian itu |
| Daftar izin kolom | satu-satunya kolom yang boleh ada di `kabar.json` (KEAMANAN-PRIVASI) |
| Belum tersambung | keadaan pita Media sosial selama Q1 terbuka |
| `kabar.json` | `public/data/alun/kabar.json`, keluaran pipeline harian |
