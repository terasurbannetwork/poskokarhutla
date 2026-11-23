# TIKET: Kejadian dari Laporan Warga

Ambil berurutan menurut kolom Tergantung; kerjakan hanya cakupannya; tutup dengan bukti di `RENCANA-UJI.md` bagian 3.
Tiket layar menutup laporannya dengan tautan `http://localhost:8800/lapor/hari-ini` atau `/lapor/meja`. Subagent tidak
commit dan tidak push (AGENTS 9). Commit dengan path spesifik oleh sesi induk.

| Tiket | Isi | Pengerja | Pemeriksa | Tergantung | Menunggu |
| --- | --- | --- | --- | --- | --- |
| LK-00 | Paket diperiksa pemeriksa bersih; baris "baca dulu, baru bangun" di AGENTS.md bagian 2 untuk `data/kajian-bnpb/lapor-kejadian/`; gerbang `tests/agen/gerbang-paket-modul.test.mjs` mengenali folder; tanpa agent baru (D14) | sesi induk | pemeriksa bersih | paket ini | |
| LK-01 | Aturan satu desa dan batas rantai di `src/lapor_gugus.js` (A1), uji U1 termasuk emas; konstanta `JENDELA_DESA_JAM`, `RANTAI_MAKS_JAM` HIPOTESIS; sesuaikan teks A9 di `lapor-ai/ALGORITMA.md` (hanya baris A9, sesi induk menyetujui) | `warga-api` | `validasi-model` | LK-00 | Q1, Q2, Q3 bawaan |
| LK-02 | `terverifikasiBpbd` murni di `src/lapor_kejadian.js` (A3); putuskan dengan bukti kode bagaimana jenis akun pemeriksa diturunkan (tabel samping `lk_periksa_akun` bila perlu); uji U2 | `warga-api` | `security-reviewer` | LK-01 | Q4. **Selesai 23 Nov 2026**: teks `oleh` tidak bisa membedakan staf BNPB dari BPBD (nama staf bebas, tanpa kode wilayah), jadi tabel samping `lk_periksa_akun` (migrasi 0168) diisi rute `periksa` dari sesi; pengecekan lama tanpa baris samping = belum terverifikasi; U2 `tests/lapor/verifikasi_bpbd.test.mjs`, penanda di `tests/lapor/rute.test.mjs` |
| LK-03 | Migrasi `lk_tarik`, `lk_usulan`, SQL dan `MATRIKS` di `src/hak.js`; nomor migrasi diambil sesudah 0162; U4 | `warga-api` | `migrasi-idempoten` | LK-02 | |
| LK-04 | `kartuPublik` dan daftar putih (`DESAIN-TEKNIS.md` bagian 5), `barisAlun` dibagi ke pembentuk bersama; uji U3 | `warga-api` | `security-reviewer`, `selera-angka` | LK-02 | Q6, Q8, Q19 |
| LK-05 | Rute `GET /api/lapor/hari-ini` (cache, laju, saklar), `alunBuat` dipecah tanpa mengubah Alun-alun (uji Alun-alun lama tetap hijau); U5 bagian hari-ini, U9 | `warga-api` | `guard-api`, `security-reviewer` | LK-03, LK-04 | Q5, Q9, Q10, Q20 |
| LK-06 | Halaman `public/lapor/hari-ini.*`, `kartu_publik.js` dipakai bersama Alun-alun; daftar di `HTML_RUTE` dan `PUBLIK_TANPA_SESI`; rujuk `modern-web-guidance` dulu; U8; tautan tinjau lokal; server tinjau lokal menjawab rute yang sama | `layar-peta` (halaman), `warga-api` (daftar rute dan server lokal) | `selera-angka`, `inp-reviewer`, `security-reviewer` | LK-05 | Q7, Q15, Q16, Q17; pemilik meninjau di lokal |
| LK-07 | Rute `POST /api/lapor/meja/tarik` dan kartu "Halaman publik" di rincian meja; U5 bagian tarik | `warga-api`, `layar-peta` | `guard-api` | LK-05 | Q18 |
| LK-08 | Meja: "N pelapor", chip "satu desa", pelabelan "Kejadian laporan" lawan "Kejadian resmi" (Q14), gerbang uji tanpa kode tercampur | `layar-peta` | `inp-reviewer`, `selera-angka` | LK-01 | Q14 |
| LK-09 | Rute `POST /api/lapor/meja/usulkan` dan tombol "Usulkan ke Buku Besar" (satu klik), kunci unik; U5 bagian usulkan | `warga-api`, `layar-peta` | `guard-api`, `security-reviewer` | LK-03, LK-02 | Q11 |
| LK-10 | `pasang.py`: sumber `lapor_ai` di `PRIORITAS_MASUK` dan `SUMBER_MODUL`, `usulan_staf` boleh `baru`; rute ingest modul bila belum ada (cek paket `keterpaduan`); U6; tanpa mengubah aturan sumber lain | `siklus` (pasang.py), `warga-api` (rute) | pemeriksa bersih, `validasi-model` bukan perlu | LK-09; ini juga menutup bagian pasang.py dari LA-25 | Q12, Q13 |
| LK-11 | Status usulan di meja dari `sk_kejadian_sumber`, tautan ke `/siklus` (A7); U7 bagian status | `warga-api`, `layar-peta` | `selera-angka` | LK-10 | |
| LK-12 | Uji integrasi ujung ke ujung U7 terdaftar di `tests/e2e/cakupan.json`; gerbang `gerbang-test-integrasi` hijau | `penulis-gerbang` | pemeriksa bersih | LK-11 | |
| LK-13 | Tinjauan menyeluruh sebelum rilis: `security-reviewer`, `guard-api`, `migrasi-idempoten`, `higiene-repo`; pemilik meninjau di lokal; pemilik menjawab Q4, Q5, Q6, Q10; pemilik menerapkan migrasi dan menyalakan saklar | sesi induk | semua pemeriksa | LK-12 | pemilik |

## Urutan yang tidak butuh jawaban pemilik

LK-00, LK-01 (bawaan), LK-02 (bawaan Q4), LK-03, LK-04, LK-05, LK-06 di balik saklar mati, LK-08. Menyalakan saklar menunggu pemilik (Q4, Q5, Q6, Q10 untuk halaman publik; Q11, Q12, Q13 untuk usulan).

## Batas

- Tidak ada deploy, push, atau penerapan migrasi produksi oleh agent.
- Tidak mengubah Alun-alun, `public/siklus/**` selain yang tertulis, atau aturan sumber lain di `pasang.py`.
- Tidak menyentuh `public/prediksi/**` dan `scripts/prediksi/**`.
- Tidak membuat buku kejadian kedua dan tidak menaikkan fase kejadian resmi.
