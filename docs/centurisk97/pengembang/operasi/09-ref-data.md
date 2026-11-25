# Referensi: tabel, workflow, uji

Halaman ini mendaftar tabel, penyimpanan, workflow, berkas keluaran, dan uji modul Operasi.

## Tabel D1 dan migrasi

| Tabel | Migrasi | Isi |
| --- | --- | --- |
| `op_base`, `op_armada`, `op_armada_status`, `op_renlap`, `op_target`, `op_gerak`, `op_temuan` | `0103_operasi_lapangan.sql` | base, armada, status harian, renlap, target, sortie, temuan pilot |
| `op_foto`, `op_gerak_hasil` | `0106_operasi_monitor.sql` | foto grup, hasil aksi (padam, titik dekat, jatuhan, liter) |
| `op_isian`, `op_isian_log`, `op_isian_kejadian`, `op_kontrak`, `op_personel`, `op_foto_unggah` | `0126_operasi_isian.sql` | penanda sumber manual, riwayat, penjaga kembaran; tabel kontrak, personel, dan foto unggahan sudah dibuat tetapi belum ada rute tulisnya |
| indeks `op_isian_terhapus` | `0127_op_isian_terhapus.sql` | indeks pembaca butir terhapus |
| `op_semai_target` | `0129_semai_target.sql` | target renlap OMC dari zona semai |
| `tugas_bencana_x`, `pb_titik`, `pb_renlap`, `pb_renlap_hasil`, `pb_log` | `0130_paritas_operasi.sql` | tugas longsor dan pesisir, sarana dan fasilitas, renlap generik, hasil, jejak audit |
| `pb_dokumen`, `pb_tindakan`, indeks `logbook_sk_selesai` | `0131_paritas_dokumen.sql` | dokumen beku, pelaksanaan butir tangga tindakan |
| `peringatan_x` | `0137_peringatan_x.sql` | peringatan jenis tambahan (tabel `peringatan` lama tidak disentuh karena CHECK-nya) |
| `pb_renlap_tindakan` | `0153_pb_renlap_tindakan.sql` | tindakan per target renlap |

Semua migrasi memakai `CREATE ... IF NOT EXISTS` dan tidak memakai `ALTER`, karena `ALTER TABLE ADD COLUMN` tidak idempoten di D1. Kode yang membaca tabel baru menangkap `no such table` dan menjawab sopan (503 atau `tersedia:false`) sehingga urutan tayang dan migrasi tidak saling menunggu. Migrasi produksi diterapkan oleh pemilik. Tabel `pb_misi` dan `pb_misi_hasil` yang dirancang untuk Misi Udara tahap kedua belum ada migrasinya.

Jejak audit: `op_isian_log` (isian manual operasi udara) dan `pb_log` (tulis `pb_*`) memuat pengisi (`staf:<id>`, `admin:<hash12>`, `instansi:<id>`, atau `mesin`), tanpa nama orang. Kolom `sebelum` dan `sesudah` dibatasi 8 KB.

## Penyimpanan R2

| Awalan | Isi | Penulis |
| --- | --- | --- |
| `foto` lewat `wa_masuk` (kunci tersimpan di D1) | foto dari grup satgas | gateway WA |
| `operasi/renlap/<bencana>/<tanggal>/<prov>[-<kab>]/v<versi>/renlap.<fmt>` | berkas renlap generik (`json`, `kml`, `gpx`, `txt`; tulis sekali) | Worker, dari callback mesin |
| `dokumen/draf/<id>.json`, `dokumen/<jenis>/<bencana>/<periode>/<prov>[-<kab>]/v<versi>.json` | draf dan dokumen beku | Worker |
| `operasi/semai/...` | berkas prakiraan semai | pipeline semai |

Rancangan Misi Udara memakai `operasi/misi/<tanggal>/<id>/` (belum dipakai) dan rancangan PDF renlap karhutla memakai `operasi/renlap/<tanggal>/<versi>/<BASE>.pdf` (belum dipakai).

## Workflow dan jadwal

| Workflow atau pemicu | Jadwal | Peran |
| --- | --- | --- |
| `.github/workflows/renlap-pb.yml` | `workflow_dispatch` (dipicu Worker saat staf meminta renlap) | membangun renlap lintas bencana dan memanggil callback HMAC |
| `.github/workflows/semai.yml` | cron `0 10,22 * * *` | prakiraan peluang semai awan |
| Worker, cron FIRMS | tiap 3 jam UTC pada menit 15 (satu cron `* * * * *`, `AGENTS.md` 2) | `nilaiAksi` menilai aksi water bombing lewat `perbaruiTitik` (`src/worker.js:1010`); `lengkapi` tidak dipanggil dari cron |
| Worker, cron jam menit 23 | tiap jam | `nilaiDropTertunda` untuk operasi lapangan darat (maksimal 50 per jam) |
| `scripts/wa/renlap_jam.mjs` (Mac mini) | jendela malam 20.00 sampai 24.00 WIB, pagi 07.00 sampai 12.00 WIB, sekali per versi per hari | renlap karhutla; mati bawaan (`RENLAP=1`) |

Workflow yang menarik jarak pandang dan ADS-B untuk layar dan jadwalnya tidak ditelusuri di dokumen ini (belum terdokumentasi di kode yang dibaca).

## Berkas keluaran di `public/data`

| Berkas | Isi |
| --- | --- |
| `public/data/operasi/renlap_<tanggal>_<versi>.json`, `.txt` | renlap karhutla (JSON dan teks siap salin WA) |
| `public/data/operasi/sumber_air.json` | badan air OSM per base, kolom `panjang_m` dan `lebar_m` |
| `public/data/operasi/rekap_udara.json` | rekap kontrak 2026 (statis, tanpa nama dan nomor kru) |
| `public/data/bnpb/logbook_tindakan.json` | persen tindakan per bencana dari logbook |
| `public/data/ringkas/<bencana>.json` | ringkasan per bencana untuk dasbor dan dokumen |
| `public/data/operasi.json` | kebutuhan sumber daya karhutla (tab Operasi di peta) |

Keluaran Misi Udara tidak pernah di `public/`.

## Uji dan gerbang

| Perintah | Yang dijaga |
| --- | --- |
| `node --test --test-concurrency=1 tests/warga/operasi_udara.test.mjs tests/warga/operasi_monitor.test.mjs tests/warga/operasi_nilai.test.mjs tests/warga/operasi_wa.test.mjs tests/warga/operasi_isian.test.mjs tests/warga/operasi_isi_ulang.test.mjs tests/warga/operasi_lapangan.test.mjs tests/warga/operasi_semai.test.mjs` | rute operasi udara, penilaian, pengurai WA dengan fikstur pesan nyata 2 dan 3 November 2026, isian manual |
| `node --test --test-concurrency=1 tests/warga/pb_*.test.mjs tests/warga/tugas_bencana*.test.mjs` | sarana, renlap generik, hasil, kepatuhan, tindakan, dokumen, hak, skema, karhutla tetap |
| `node --test --test-concurrency=1 tests/layar/pb_renlap.test.mjs tests/layar/pb_titik.test.mjs tests/layar/pb_tindakan.test.mjs tests/layar/pb_tab_operasi*.test.mjs` | layar sarana, renlap, tindakan, tab Operasi |
| `npm run uji:warga` | seluruh uji Worker dan D1 (Miniflare) |
| `npm run uji:paritas` | gerbang paket paritas (`scripts/agents/paritas.mjs --uji` dan `--cek`) |
| `node --test tests/agen/gerbang-paritas.test.mjs tests/agen/paritas-hitung.test.mjs` | gerbang paket Paritas (empat pemeriksaan murni) |
| `node --test tests/agen/gerbang-operasi-gelap.test.mjs tests/agen/gerbang-operasi-renggang.test.mjs` | gaya layar Operasi (tanpa latar gelap, kartu tidak menempel) |
| `node --test tests/agen/gerbang-kartu-std.test.mjs tests/agen/gerbang-tanpa-kesimpulan.test.mjs tests/agen/gerbang-dasbor.test.mjs` | standar kartu dan dasbor |
| `node --test tests/agen/gerbang-d1.test.mjs tests/agen/gerbang-d1-pindai.test.mjs` | akses D1 hanya lewat `src/hak.js`, tanpa pindai tabel penuh |
| `npm run uji:agen` | seluruh gerbang agen |
| `python3 -I scripts/umum/misi_udara.py uji` | Misi Udara: pembaca titik, rute, batas bersumber, keluaran |
| `python3 -I scripts/umum/renlap.py uji` | renlap lintas bencana |
| `python3 scripts/operasi/renlap.py uji`, `python3 scripts/operasi/renlap_banjir.py uji`, `python3 scripts/operasi/sumber_air.py uji` | renlap karhutla, banjir, sumber air |
| `python3 scripts/data/logbook_tindakan.py uji` | daftar tindakan registri sama dengan aturan 2 persen |
| `python3 scripts/umum/bencana.py cek` | validasi `public/bencana.json` |
| `node --test tests/wa/renlap_jam.test.mjs` | jendela pemicu renlap |

Gerbang khusus Misi Udara (`tests/agen/gerbang-misi-udara.test.mjs`) dan skrip `uji:operasi` yang direncanakan belum ada.
