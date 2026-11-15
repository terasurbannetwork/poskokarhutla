# KEAMANAN-PRIVASI: Pemetaan bangunan oleh relawan

| Hal | Aturan |
| --- | --- |
| Tindakan ke luar | Sistem tidak pernah membuat proyek di HOT atau menyunting OSM. Staf yang mengirim lewat akun sendiri. Kredensial HOT tidak disimpan di repo, D1, atau sistem. |
| Nama mahasiswa | Tidak tampil di layar publik. Daftar anggota kampus hanya terlihat oleh akun kampus itu sendiri (aturan Kemitraan). |
| Nama pengguna OSM | Publik di OSM oleh sifatnya, tetapi sistem tidak menyimpannya (Q3); hanya hitungan per hashtag. |
| Pembacaan balik | Jawaban API changeset memuat nama pengguna OSM. Nama dibuang dari memori segera setelah dihitung; yang disimpan hanya agregat per hashtag dan proyek. Tidak ada log yang memuat nama. |
| Hashtag | `#CentuRisk-<kode>` bukan rahasia; memuat kode kampus, bukan nama orang. |
| Berkas | AOI dan instruksi di R2 privat; `public/data/kemitraan/pemetaan_kelengkapan.json` hanya agregat per kab dan dipindai gerbang seperti data kemitraan lain. |
| Kesalahan tafsir | Daftar kab tipis tidak publik (D7): bisa dibaca sebagai penilaian wilayah atau menarik perhatian pada daerah yang datanya kosong. |
| Pedoman OSM | Penyuntingan terorganisir wajib punya halaman wiki dan komunikasi komunitas; diurus staf, dicatat di paket. |
| Lisensi | Data OSM ODbL (atribusi "OpenStreetMap contributors"); Open Buildings CC BY 4.0. Atribusi tampil di tiap kartu yang memuat angkanya. |
| PDP | Tidak memproses data pribadi di sistem; bila Q3 dijawab lain, tambah dasar hukum dan persetujuan dulu. |
