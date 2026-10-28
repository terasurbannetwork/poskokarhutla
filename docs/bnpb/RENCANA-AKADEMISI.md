# Rencana /akademisi: Direktori Pakar Kebencanaan Indonesia

Disusun 28 Okt 2026. Status: rencana, belum dibangun.

## Keputusan pemilik (28 Okt)

1. Akses: hanya akun staf BNPB dan admin (pakai gerbang akun di `src/staf.js`), tidak publik.
2. Kontak: semua yang tercantum publik (email, telepon kantor, HP/WA bila tertulis di laman resmi atau profil profesional), selalu dengan tautan sumbernya.
3. Panen: boleh, pelan dan sopan. Jeda antar permintaan, User-Agent jujur, tanpa menyamar sebagai situs resmi. Diblokir berarti berhenti dan lapor.

## Tujuan

Saat BNPB butuh pakar ("cari ahli longsor di Sulawesi Tengah, S3, pernah bantu BPBD"), jawabannya keluar dalam hitungan detik, lengkap dengan CV, bukan dari ingatan atau grup WA.

## Sumber data

| Sumber | Isi yang diambil | Catatan |
| --- | --- | --- |
| PDDikti (pddikti.kemdiktisaintek.go.id) | nama, gelar, kampus, prodi, jabatan fungsional, pendidikan terakhir, riwayat pendidikan per jenjang (kampus, tahun lulus), riwayat mengajar | daftar induk semua dosen RI, sekitar 300 ribu |
| SINTA (sinta.kemdiktisaintek.go.id) | bidang riset, skor SINTA, h-index Scopus/Scholar, jumlah dan judul publikasi, hibah, foto | penentu relevansi kebencanaan |
| Laman profil kampus | foto resmi, jabatan struktural (dekan, kepala pusat studi bencana), email, telepon | per kampus, dikerjakan bertahap dari kampus simpul |
| Google Scholar / Scopus / ORCID | tautan profil, topik | dari tautan yang tercantum di SINTA, tidak dipanen massal |
| Berita, JDIH BNPB, SK tim kajian | lencana "pernah membantu BNPB/BPBD/BMKG/PVMBG" | dari basis data repo yang sudah ada |

## Saringan relevansi (exhaustive tapi tidak semua dosen)

Seorang dosen masuk bila memenuhi salah satu:

- A. Mengajar di prodi rumpun bencana: geologi, teknik geologi, geofisika, meteorologi, klimatologi, geodesi/geomatika, oseanografi, hidrologi, teknik sipil (keairan, geoteknik, struktur gempa), kehutanan, ilmu lingkungan, geografi, manajemen/magister kebencanaan, kesehatan masyarakat (kedaruratan), psikologi (psikososial), perencanaan wilayah.
- B. Dari prodi mana pun, punya publikasi atau bidang SINTA dengan kata kunci bencana: gempa, tsunami, longsor, banjir, rob, karhutla, gambut, gunung api, kekeringan, cuaca ekstrem, perubahan iklim, likuefaksi, abrasi, mitigasi, kebencanaan, pengurangan risiko.

Tiap orang diberi skor relevansi (0–100) dari jumlah publikasi berkata kunci, prodi, dan jabatan. Perkiraan hasil 10–30 ribu orang. Angka pastinya diketahui setelah tahap 1.

## Isi kartu per akademisi

- Nama lengkap dengan gelar depan dan belakang.
- Foto, dengan sumber.
- Kampus, fakultas, prodi, provinsi kampus.
- Jabatan fungsional (Guru Besar, Lektor Kepala, Lektor, Asisten Ahli) dan jabatan struktural.
- Pendidikan: tiap jenjang S1, S2, S3 dengan kampus dan tahun lulus, serta negara kampus luar negeri.
- Perkiraan usia: dari tahun lulus S1 dikurangi 22, ditandai "perkiraan". Tanggal lahir tidak publik dan tidak dicari.
- Bidang keahlian dan rumpun bahaya (hidrometeorologi, geologi, vulkanologi, kebakaran, iklim, sosial/kesehatan).
- Portofolio: publikasi teratas, hibah, skor SINTA, h-index, tautan Scholar/Scopus/ORCID.
- Jenjang karier: riwayat kampus dan jabatan, disusun dari PDDikti dan laman kampus.
- Kontak: email, telepon, dengan tautan sumber tiap butir.
- Deskripsi singkat 2–3 kalimat, ditulis otomatis dari data di atas, tanpa klaim yang tidak bersumber.
- Tanggal data terakhir diperbarui.

## Pengelompokan dan filter

Kampus, provinsi, rumpun bahaya, bidang ilmu, jenjang terakhir (S2/S3), jabatan fungsional, kelompok usia (di bawah 40, 40–50, 50–60, di atas 60), lulusan luar negeri, skor SINTA, pernah bermitra dengan BNPB.

## Rekomendasi tambahan

Pilihan pemilik 28 Okt: nomor 1, 3, 5, 7 dibangun. Nomor 10 (kewajiban UU PDP) dan 11 (standar pemilik) tetap wajib. Sisanya (2, 4, 6, 8, 9) cadangan, belum dibangun.

Urut menurut manfaat untuk BNPB.

1. Pencari "pakar untuk kejadian ini": pilih bencana dan lokasinya, keluar 10 pakar paling cocok menurut bidang dan jarak kampusnya ke lokasi. Tersambung ke kejadian yang sudah ada di sistem.
2. Daftar pendek dan ekspor: centang beberapa nama, unduh PDF atau Excel berisi profil ringkas. Bentuknya persis seperti daftar 4 nama yang diterima 28 Okt.
3. Peta sebaran pakar per provinsi, ditimpa indeks risiko: kelihatan provinsi rawan yang tidak punya pakar lokal.
4. Kesenjangan bidang: bidang mana yang pakarnya sedikit dibanding kejadiannya (riset sebelumnya: psikososial paling kosong). Bahan untuk program beasiswa dan konsorsium S3.
5. Lencana rekam jejak: pernah di tim kajian BNPB, BPBD, BMKG, PVMBG, atau tim ahli pascabencana, dengan bukti tautan.
6. Jaringan kolaborasi: siapa sering menulis bersama siapa, supaya satu pakar bisa membawa timnya.
7. Pusat studi bencana per kampus: daftar PSB/PSBA dan ketuanya, sebagai pintu masuk kelembagaan.
8. Catatan internal BNPB: staf bisa menulis "sudah dihubungi, bersedia, tarif, catatan" per pakar. Hanya terlihat oleh staf.
9. Pemutakhiran otomatis bulanan: jabatan, publikasi, dan skor ikut berubah tanpa input manual.
10. Hak koreksi: pakar bisa meminta data dikoreksi atau dihapus (kewajiban UU PDP).
11. Tombol isi data dummy untuk Super Admin, sesuai standar pemilik.

## Rincian empat fitur terpilih

**1. Cari pakar untuk kejadian ini.** Masukannya jenis bencana (dari registri `public/bencana.json`) dan lokasinya (kab/kota, atau satu kejadian yang sudah ada di sistem). Keluarannya 10 pakar.

- Skor = 60% kecocokan bidang dengan jenis bencana + 25% kedekatan kampus ke lokasi + 15% rekam jejak (lencana dan jabatan).
- Jarak dihitung dari titik kampus ke titik tengah kab/kota memakai `public/geo`.
- Tiap pakar menampilkan alasannya, misalnya "12 publikasi longsor, kampus 40 km, pernah tim kajian BPBD Sulteng 2018".

**3. Peta sebaran pakar per provinsi.** Peta koroplet jumlah pakar per provinsi kampus, per rumpun bahaya.

- Lapisan atasnya indeks risiko yang sudah ada (`risiko_kecamatan`, InaRISK).
- Provinsi berisiko tinggi dengan pakar lokal kurang dari 5 orang diberi tanda "rawan tanpa pakar lokal".

**5. Lencana rekam jejak.** Lencananya BNPB, BPBD, BMKG, PVMBG, dan tim ahli pascabencana.

- Lencana hanya muncul bila ada bukti bertautan: SK, laporan kajian, berita, atau dokumen JDIH. Tanpa tautan bukti, lencana tidak dipasang.
- Bukti dicari dari basis data repo (JDIH BNPB, DIBI, pustaka, berita) dan pencarian nama + lembaga.
- Tiap lencana menyebut tahun dan peran, misalnya "Tim kajian likuefaksi Palu, BNPB, 2018".

**7. Pusat studi bencana per kampus.** Daftarnya mencakup PSB/PSBA, pusat studi gempa, pusat studi iklim, dan pusat riset sejenis.

- Tiap pusat berisi kampus, nama, ketua (tertaut ke kartu pakarnya bila ada), laman, kontak, dan bidang.
- Sumbernya laman resmi kampus dan Forum Perguruan Tinggi untuk Pengurangan Risiko Bencana (FPT PRB).
- Tanggal periksa ditampilkan karena ketua berganti tiap periode.

## Tahapan

| Tahap | Isi | Bukti selesai |
| --- | --- | --- |
| 0 | Uji sopan ke PDDikti dan SINTA dengan 4 nama dari daftar 28 Okt | 4 profil lengkap terisi dari sumber |
| 1 | Daftar induk: dosen prodi rumpun bencana dari PDDikti | jumlah dosen per prodi dan kampus |
| 2 | Pengayaan SINTA dan saringan kata kunci, skor relevansi | jumlah lolos saring, contoh 20 acak diperiksa manual |
| 3 | Laman kampus: foto, jabatan struktural, kontak, mulai dari kampus simpul | cakupan foto dan kontak per kampus |
| 4 | Layar /akademisi di balik login staf, filter, kartu, ekspor | uji di browser, INP aman untuk 30 ribu baris |
| 5 | Rekomendasi terpilih: 1 pencari pakar per kejadian, 3 peta sebaran di atas indeks risiko, 5 lencana rekam jejak bertautan bukti, 7 pusat studi bencana dan ketuanya | tersambung ke kejadian dan peta; tiap lencana punya tautan bukti |
| 6 | Pemutakhiran bulanan lewat workflow | satu putaran terjadwal berhasil |

## Penyimpanan dan keamanan

- Data pakar tidak boleh masuk `public/data` karena berkas statis bisa dibuka siapa saja. Data disimpan di D1 atau R2 dan disajikan lewat route worker yang memeriksa sesi staf.
- Mentah panen disimpan di luar repo dan tidak di-commit.
- Tiap butir data membawa sumber dan tanggal ambil.

## Risiko

- PDDikti atau SINTA memblokir panen massal. Mitigasinya jeda lebih panjang dan panen dicicil beberapa hari. Kalau tetap diblokir, minta akses data resmi lewat surat (contoh ada di `docs/bnpb/SURAT-AKSES-DATA.md`).
- Laman kampus beragam bentuknya, jadi foto dan kontak tidak akan 100%. Cakupannya ditampilkan jujur.
- Perkiraan usia bisa meleset untuk yang kuliah S1 di usia tidak lazim.
