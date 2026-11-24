# USUL-AGENTS: teks untuk AGENTS.md (belum dipasang)

Berkas ini hanya usulan. AGENTS.md disunting oleh sesi induk pada tiket HH-00, bukan oleh pengerja paket. Pasang bagian di bawah sesudah bagian terakhir yang ada (saat ditulis `### 2.46` Alat gambar wilayah; nomor bebas berikutnya 2.47, cek `grep -n '^### 2\.' AGENTS.md` saat memasang), lalu jalankan `npm run uji:agen`. Usulan baris tambahan untuk tabel peta modul §2 dan penunjuk ilmu agent ada di bagian akhir.

---

### 2.47 Hulu ke Hilir per kejadian banjir dan banjir bandang (Kaji Cepat `/siklus/kaji/:id`: hutan hilang menurut lereng, zona, sempadan, hujan IMERG dan CHIRPS, genangan resmi, uji bahaya): baca dulu, baru bangun

Sebelum menyentuh hutan hilang per kelas lereng dan zona elevasi per DAS dan sub-DAS, sempadan sungai 100 m, pemisahan hutan hilang sebelum dan sesudah kejadian, hujan per DAS saat kejadian, bekas longsor otomatis dari citra Sentinel-2 sebelum dan sesudah, genangan produk resmi UNOSAT dan Charter berdampingan dengan GFM, kilometer jalan dan desa tergenang, uji peta bahaya terhadap genangan, atau lampiran cetak hulu ke hilir untuk kaji ulang, baca dokumen di
`data/kajian-bnpb/hulu-hilir/` dengan urutan otoritas ini (kode di `scripts/banjir/bukti_das.py` dan modul `scripts/banjir/hulu_hilir_*.py` milik `banjir`; `scripts/siklus/hulu_hilir*.py`, `public/siklus/hulu_hilir*`, `tests/siklus/hulu_hilir*` milik `siklus`; detektor bekas longsor `scripts/longsor/lereng_kejadian.py` (satu mesin bersama paket `lereng-bangunan` LT-15) milik `longsor`; `src/siklus_kaji.js` dan migrasi model `hulu_hilir` milik `warga-api`; pembaca lereng `scripts/longsor/lereng_dem.py` milik `longsor` hanya dibaca):

1. `KEPUTUSAN-HULU-HILIR.md`: keputusan pemilik K1-K11, rancangan D1-D23, pertanyaan terbuka Q1-Q24 dengan bawaan sementara; menang atas semuanya. Jangan menjawab pertanyaan terbuka dengan karangan.
2. `RISET.md`, 3. `PRD.md` (F-1..F-17), 4. `ALUR.md`, 5. `ALGORITMA.md` (pemilihan DAS, penanda lereng dan zona, label waktu, sempadan, hujan, genangan resmi, uji bahaya, kalimat templat, replikasi lunak), 6. `DESIGN-SYSTEM.md`, 7. `DESAIN-TEKNIS.md`, 8. `KEAMANAN-PRIVASI.md`,
9. `RENCANA-UJI.md`, 10. `TIKET.md` (`HH-*`), `GLOSARIUM.md`.

Aturan berhentinya sama dengan §2.1. Hanya keadaan, tidak pernah sebab: tanpa "menyebabkan", "akibat", "gara-gara", "pemicu", "aman", "tidak banjir", "surut". Tahun kejadian tidak pernah digabung ke "sebelum"; angka lereng selalu bersama porsi hutan awal kelas itu; kosong (zona tak ada, tanpa DEM, tahun belum tercakup, produk resmi tak tersedia) tidak pernah jadi nol; GFM, UNOSAT, IMERG, CHIRPS, DIBI, dan angka Pemkab tidak dijumlah; satu mesin hutan (`bukti_das.py` diperluas lewat `penanda`, tanpa salinan) dan satu mesin genangan (paket `genangan-satelit`); satu detektor bekas longsor (`lereng_kejadian.py`), uji golongan hutan utuh lawan lahan terbuka tidak pernah ditulis sebagai bukti sebab dan hujan ekstrem selalu satu paragraf dengannya; tanpa buku kejadian kedua dan tanpa tabel D1 baru; berkas beku sidik J4 dan nowcast serta `imerg.parse` tidak disentuh; label hipotesis dicabut hanya oleh vonis uji terkunci; staf saja sebelum Q6; tinjau di `http://localhost:8800/siklus/kaji`.

---

## Usulan tambahan (opsional, oleh sesi induk)

Baris untuk tabel peta modul §2:

| Hulu ke Hilir `/siklus/kaji/:id` | `scripts/banjir/hulu_hilir_*.py`, `scripts/siklus/hulu_hilir*`, `public/siklus/hulu_hilir*`, `data/kajian-bnpb/hulu-hilir/**`; `src/siklus_kaji.js`, migrasi model `hulu_hilir` (warga-api) | R2 `siklus/saji/hulu_hilir/`, `sk_kaji` model `hulu_hilir`; manual per kejadian, tanpa cron | `banjir` (hutan, sempadan, hujan, resmi), `siklus` (perakit, layar) |

Penunjuk di ilmu agent (`ilmu.mjs kasus`): untuk `banjir` dan `siklus`, satu baris yang menyebut paket ini dan aturan "satu mesin hutan: perluas `bukti_das.py`, jangan salin".
