# RENCANA-UJI: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Tiap gerbang harus terbukti bisa gagal (bagian 4). Semua uji memakai data nyata atau fixture di `tests/`, tidak ada data dummy di layar.

## 1. Kriteria terima per tiket (bukti sama persis dengan kolom "Bukti siap" TIKET.md)

| Tiket | Perintah bukti | Kriteria terima |
| ----- | -------------- | --------------- |
| MU-01 | `python3 -I scripts/umum/misi_udara.py uji` menolak baris tanpa sumber (mode gagal diuji) | baris tanpa `nilai`, `satuan`, `sumber`, berkeyakinan C, atau berkeyakinan S tanpa nomor Q ditolak; enam misi punya templat |
| MU-02 | uji: delapan bentuk masukan sah dan enam yang ditolak | desimal, DMS, tautan panjang, tautan pendek, plus code terbaca; di luar wilayah, nama tempat, plus code pendek tanpa acuan, tautan ke host lain ditolak |
| MU-03 | flight plan 15 Nov dibuat ulang: haluan 225, 139, 355, leg 121, 162, 208 km, total 491 km sama (LZ 2.7949, 97.8966); `python3 scripts/operasi/renlap_banjir.py uji` lulus | kasus emas bagian 3; `rencana` dan `susun_tetap` tidak ada lagi di `renlap_banjir.py` |
| MU-04 | uji: misi `kunjungan` dengan `--keluar` di dalam repo gagal; keluaran tanpa bidang nama | bawaan keluaran di luar repo; templat memuat waktu di titik dan daftar periksa |
| MU-05 | uji ALGORITMA 9.2 dan 9.3; kasus Semeru dari RISET sebagai fixture | belokan tidak kurang dari jari-jari; data basi dan kosong mencetak "tidak diperiksa" |
| MU-06 | uji: tipe tanpa `daya_tahan_mnt` mencetak "belum ada datanya" | F-8 hanya jalan bila tipe dipilih dan datanya ada |
| MU-07 | `node --test tests/agen/gerbang-misi-udara.test.mjs` membandingkan hasil Python dan JS pada kasus yang sama | kelayakan terbang Python sama dengan `kelayakan(b)` di `public/operasi_peta.js` |
| MU-08 | uji: panjang lintasan pola cocok hitungan tangan | kotak melebar dan lintasan sejajar; `s` wajib diketik |
| MU-09 | `npm run uji:agen` hijau | gerbang tanpa kata "aman" pada status rute, tanpa keluaran di `public/` |
| MU-10 | `node --test tests/wa/misi_udara.test.mjs` | pesan berformat terurai; grup tak berhak ditolak |
| MU-11 | `node --test tests/warga/pb_misi.test.mjs tests/agen/gerbang-d1.test.mjs`; migrasi dijalankan dua kali | idempoten; `EXPLAIN` memakai indeks; hak sesuai matriks |
| MU-12 | `node --test tests/layar/misi_udara.test.mjs`; tinjau `http://localhost:8800/operasi` | formulir, pratinjau, unduh; klik tidak membekukan layar |
| MU-13 | gerbang kartu standar dan tanpa kesimpulan hijau; tinjau lokal | seksi masuk daftar `LAYAR`; seksi menyala lewat `public/bencana.json` |
| MU-14 | `node --test tests/warga/pb_misi.test.mjs` | hasil misi tersimpan; tamu 403 |

## 2. Kriteria terima per fitur

| Fitur | Kriteria | Tiket |
| ----- | -------- | ----- |
| F-1 | leg berurutan sesuai masukan; haluan, km, NM, menit cocok hitungan tangan | MU-03 |
| F-2 | empat bentuk titik terbaca; validasi wilayah | MU-02 |
| F-3 | titik menyusul berlabel; masukan ulang menaikkan versi dan versi lama utuh | MU-03 |
| F-4 | tiap misi punya bidang isian, waktu di titik, daftar periksa | MU-01, MU-04 |
| F-5 | tiap baris zona punya sumber dan jam data | MU-05, MU-07 |
| F-6 | titik darat di zona larangan ditolak; leg yang memotong lingkaran dibelokkan | MU-05 |
| F-7 | zona manual tanpa alasan atau sumber ditolak; ikut diperiksa | MU-05 |
| F-8 | tipe dipilih dan ada datanya: baris cukup atau saran isi ulang; selain itu "belum ada datanya" | MU-06 |
| F-9 | layak, terbatas, tidak layak, atau "tidak ada data"; satu rumus dengan JS | MU-07 |
| F-10 | PDF tiga halaman, KML, GPX, teks WA, JSON di luar `public/` | MU-03, MU-04 |
| F-11 | titik pola bernomor, termasuk dalam pemeriksaan zona | MU-08 |
| F-12 | permintaan WA menghasilkan PDF di grup berhak | MU-10 |
| F-13 | simpan dan versi; R2 tulis sekali | MU-11 |
| F-14 | seksi Misi udara memenuhi DESIGN-SYSTEM bagian 2 | MU-12, MU-13 |
| F-15 | hasil terlaksana atau batal dengan alasan tersimpan tanpa nama | MU-14 |

## 3. Kasus emas dan fixture

1. **Flight plan 15 Nov 2026.** Lanud Soewondo 3.5589, 98.6719; Lapangan Bola Jambi, Kec. Sultan Daulat 2.7949, 97.8966 (koordinat ini sudah publik di berkas 15 Nov; fixture tidak menyebut kunjungan); Pandan 1.6921, 98.8426; kembali ke Lanud Soewondo; 200 km/jam. Harus menghasilkan haluan 225, 139, 355; leg 121, 162, 208 km; total 491 km (sekitar 265 NM); 147 menit terbang. Angka sama dengan keluaran lama (ukuran berhasil PRD 7.4).
2. **Gunung api (Semeru, fixture).** Fixture di `tests/` dari RISET: Level IV, 19 Nov 2025, radius 8 km, penyangga 5 km [SEMENTARA Q4] sehingga lingkaran larangan 13 km; sektor tenggara 20 km (Besuk Kobokan) dan sempadan sungai 500 m sebagai zona manual (Q14). Koordinat puncak diambil dari `gunungapi_status.json` atau diberi label fixture; fixture tidak tampil di layar.
3. **Tanpa radius.** Gunung Level II ke atas dengan `radius_km` kosong dalam 30 km dari rute: status "perlu diputuskan orang". Gunung Level I dalam 15 km: hanya perhatian (Q5).
4. **Dropping banjir dekat gunung.** Rute banjir yang melewati lingkaran gunung tetap diperiksa (ALGORITMA bagian 3, aturan 1).
5. **Kelayakan terbang.** Kasus bersama JS dan Python: jarak pandang 1.500 m dan 5.000 m, angin 20 dan 30 knot, badai guntur, basi 3 jam, stasiun terdekat 60 km.

## 4. Uji mode gagal

| Gerbang | Cara membuktikan bisa gagal |
| ------- | --------------------------- |
| batas bersumber | tambah baris tanpa `sumber`, `keyakinan: C`, atau `keyakinan: S` tanpa `q`: uji merah |
| belokan | geser titik sehingga leg masuk lingkaran dan matikan fungsi belokan: uji merah |
| data basi | beri `waktu_data` lewat batas: harus ada baris "tidak diperiksa", bukan lolos |
| sumber tak terbaca | hapus berkas sumber: baris "tidak ada data" |
| tanpa kata "aman" | sisipkan kata itu ke templat: uji merah |
| tanpa keluaran di `public/` | arahkan `--keluar` ke `public/`: gagal |
| `kunjungan` di repo | `--keluar` di dalam repo: gagal |
| hak | panggilan tamu dan pembaca pimpinan ke rute tulis: 403 |
| migrasi | jalankan dua kali: tanpa galat |

## 5. Empat uji kejujuran (ALGORITMA bagian 9)

1. Tiap baris `batas_terbang.json` punya `nilai`, `satuan`, `sumber`, `keyakinan` (A, B, atau S); `keyakinan: C` ditolak; S wajib punya nomor Q.
2. Belokan pada rute uji memotong lingkaran: jarak terdekat belokan ke pusat tidak kurang dari jari-jari.
3. Data basi dan kosong tidak pernah menghasilkan status "tidak memotong zona" tanpa baris "tidak diperiksa".
4. Keluaran tidak memuat kata "aman" (uji teks atas PDF, KML, GPX, teks WA, JSON, templat).

## 6. Tinjau lokal (tahap 3)

Tinjau di `http://localhost:8800/operasi` (kode dari folder kerja, data dan login dari produksi). Bila port tidak menjawab, `npm run tinjau`. Login produksi diketik pemilik. Pemeriksaan tampilan: DESIGN-SYSTEM bagian 2, kartu tidak menempel, tanpa huruf kapital semua, klik jenis misi tidak membekukan layar (`inp-reviewer`).
