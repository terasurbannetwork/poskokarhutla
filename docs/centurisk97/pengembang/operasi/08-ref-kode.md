# Referensi: berkas dan rute

Halaman ini mendaftar berkas utama dan rute API modul Operasi.

## Berkas utama

| Berkas | Peran |
| --- | --- |
| `public/operasi_laporan.js` | layar laporan `/operasi`: seksi, pemilih periode, kartu, rumus murni layar (telat lapor, kepatuhan, badan air, unduh KML dan GPX) |
| `public/operasi_peta.js` | `window.OpsUdara`: muat data, `kelayakan`, `radiusBase`, foto armada, pil layak |
| `public/operasi_peta.css`, `public/operasi.css` | gaya layar (`#opsLaporan`) dan tab Operasi di peta |
| `public/operasi_semai.js`, `operasi_semai_murni.js`, `operasi_semai.css` | seksi Peluang semai (paket semai-awan) |
| `public/operasi.js` | tab Operasi di peta utama (kebutuhan sumber daya) |
| `public/bnpb/operasi_lapangan.html`, `operasi_lapangan.js`, `.css` | layar kedua `/bnpb/operasi-lapangan` (terdaftar di `src/worker.js:715`): peta operasi udara harian dari `GET /api/operasi/peta?tanggal=`, terpisah dari tab Operasi di `/operasi`; layar `/bnpb/operasi` (`operasi_pusdalops.js`) milik Pemulihan, Laporan Khusus, dan roll call, bukan modul ini |
| `public/bnpb/operasi_lapangan_hitung.js` | `window.OperasiLapangan`: katalog metrik M1 sampai M11, format tampilan |
| `public/renlap_cetak.html`, `.js`, `.css` | lembar cetak renlap udara per base (`/renlap-cetak`) |
| `public/renlap_omc.html`, `.js`, `.css` | lembar cetak renlap OMC per zona (`/renlap-omc`) |
| `public/inti/renlap.js`, `.css` | kartu Renlap, Hasil tindakan, Kepatuhan, Tindakan untuk operasi generik (`window.PbRenlap`) |
| `public/inti/pb_titik.js`, `.css` | kartu titik sarana dan fasilitas (`window.PbTitik`) |
| `public/bencana.json` | registri bencana dan `kemampuan` (sumber tunggal); katalog `tindakan` |
| `src/bencana.generated.js` | modul ES yang dibangkitkan dari registri (`python3 scripts/umum/bencana.py js`) |
| `src/operasi_udara.js` | rute baca `/api/operasi/*`, `catatOperasi`, mesin renlap |
| `src/operasi_isian.js` | rute isian manual `/api/operasi/isian/*` |
| `src/operasi_hasil.js` | penilaian padam dari FIRMS, pelengkapan koordinat, penjagaan isian manual |
| `src/operasi_nilai.js` | metrik M1 sampai M11, `menitRespons` |
| `src/operasi_wa.js` | pengurai pesan WA satgas (`urai`, `uraiStempel`) |
| `src/operasi_semai.js` | berkas prakiraan R2 dan target renlap OMC |
| `src/operasi_lapangan.js` | operasi lapangan darat per tugas (`/api/ops/*`) |
| `src/tugas_bencana.js` | mesin tugas multi-bahaya, `SARANA`, `FASILITAS`, aturan reda per bahaya |
| `src/pb_isian.js` | sarana dan fasilitas, renlap generik, hasil, kepatuhan, tangga tindakan |
| `src/pb_dokumen.js` | dokumen sitrep, renops, laporan KIB, renkon |
| `src/pb_ringkas.js` | `/api/pb/ringkas` dan `/api/pb/papan-sk` |
| `scripts/operasi/renlap.py` | renlap karhutla (target patroli dan water bombing) |
| `scripts/operasi/bobot_renlap.json` | bobot (HIPOTESIS), ambang, batas, deklinasi, bobot per bencana |
| `scripts/operasi/renlap_pdf.py` | PDF renlap bergambar per base (orbit 2 menit per titik periksa, radius pandang 6 km) |
| `scripts/operasi/renlap_banjir.py` | renlap banjir lama (dua fungsi `rencana` dan `susun_tetap` sudah dipindah ke Misi Udara) |
| `scripts/operasi/sumber_air.py` | badan air OSM sekitar base |
| `scripts/operasi/isi_ulang_wa.mjs` | memutar ulang ekspor WA ke SQL idempoten |
| `scripts/operasi/semai*.py` | prakiraan semai awan (paket semai-awan) |
| `scripts/umum/renlap.py`, `renlap_keluaran.py` | renlap lintas bencana, KML, GPX, teks, PDF |
| `scripts/umum/misi_udara.py`, `batas_terbang.json`, `misi_templat.json` | Misi Udara |
| `scripts/umum/bencana.py` | validasi registri dan pembangkit `bencana.generated.js` |
| `scripts/data/logbook_tindakan.py` | persen tindakan dari logbook |
| `scripts/wa/renlap_jam.mjs` | pemicu renlap karhutla di Mac mini (mati bawaan) |

Catatan: `public/renlap.html`, `public/renlap.js`, dan `public/renlap.css` bukan bagian modul ini; itu halaman renlap SIPPA di ponsel (`/renlap`, keputusan SIPPA 61).

## Rute API

Hak baca "peta" berarti: akun gerbang atau moderator, staf `udara`, `pusdalops`, `koordalops`, `pimpinan`, `tmc`, atau pemirsa Pusdalops. Semua rute `/api/operasi/*` yang membaca tabel `op_*` menjawab 503 sopan bila migrasi 0103 belum diterapkan.

| Metode dan jalur | Hak | Isi |
| --- | --- | --- |
| `GET /api/operasi/peta?tanggal=` | peta | base, armada dengan status hari itu, gerak, temuan, renlap dan target (`src/operasi_udara.js:20`) |
| `GET /api/operasi/nilai?dari=&sampai=` | peta | metrik M1 sampai M11, maksimal 31 hari (`:178`) |
| `GET /api/operasi/monitor?dari=&sampai=` | peta | aksi, hasil, foto, KPI per base dan armada, maksimal 31 hari (`:221`) |
| `GET /api/operasi/jejak?tanggal=` | peta | jejak ADS-B armada Centurisk97 dari `adsb_posisi` (maksimal 2.000 baris; `aktif:false` bila tabel belum ada) (`:252`) |
| `GET /api/operasi/foto/:id` | peta | foto dari R2 (`private, no-store`, `nosniff`, `sandbox`) |
| `GET /api/operasi/temuan?dari=&sampai=` | `Bearer WA_MESIN` (mesin) | temuan dan gerak maksimal 7 hari untuk mesin renlap (`:126`) |
| `POST /api/operasi/renlap` | `Bearer WA_MESIN` (mesin) | simpan renlap draf per base; maksimal 20 base, 20 target per base, 256 KB per base; renlap berstatus `dikirim` tidak ditimpa (409) (`:138`) |
| `POST /api/operasi/dummy` | Super Admin | mengisi atau menghapus data dummy (hanya untuk uji) |
| `POST /api/operasi/isian/gelar`, `/sortie`, `/hasil`, `/temuan`, `/hapus` | staf `pusdalops` atau moderator | isian manual; tanggal hari ini sampai 7 hari ke belakang; maksimal 60 tulis per 10 menit per pengisi (`src/operasi_isian.js:206`) |
| `GET /api/operasi/isian/riwayat?tabel=&kunci=` atau `?tanggal=` | peta | riwayat isian maksimal 200 baris |
| `GET /api/operasi/semai/berkas/:nama` | peta | berkas prakiraan semai di R2 `operasi/semai/` |
| `GET /api/operasi/semai/target?tanggal=` | peta | target renlap OMC |
| `POST /api/operasi/semai/target`, `/target/hapus` | staf `pusdalops` atau `tmc`, atau moderator | catat atau hapus target (`src/operasi_semai.js:85`) |
| `GET /api/pb/titik?bencana=&prov=&kab=` | peta berwilayah | daftar sarana dan fasilitas |
| `POST /api/pb/titik`, `/titik/hapus` | moderator, staf `pusdalops` (provinsinya), akun instansi pemda aktif (wilayahnya) | isi, ubah, hapus lunak titik (`src/pb_isian.js:433`) |
| `GET /api/pb/titik/mesin` | HMAC `RENLAP_KUNCI` | titik untuk mesin renlap; 20 kegagalan per IP per jam menjadi 429 |
| `GET /api/pb/renlap`, `POST /api/pb/renlap` | baca; tulis seperti titik | daftar (rentang maksimal 92 hari, `src/pb_isian.js:298`); minta renlap (maksimal 6 permintaan per jam per pengisi; tanggal hari ini sampai 7 hari ke belakang) |
| `POST /api/pb/renlap/selesai` | HMAC (mesin) | callback mesin: status `draf` atau `gagal`; tanda tangan mengikat isi berkas; selisih waktu paling lama 300 detik |
| `POST /api/pb/renlap/terbit`, `/selesai-tandai` | tulis seperti titik | `draf` menjadi `terbit` (berlaku 14 hari), `terbit` menjadi `selesai`; tidak ada jalan mundur |
| `GET /api/pb/renlap/berkas?id=&fmt=` | baca (pemirsa tidak) | berkas json, kml, gpx, txt, pdf dari R2 |
| `POST /api/pb/hasil` | tulis seperti titik | hasil per target (1 sampai 100 butir) dan tindakan |
| `GET /api/pb/kepatuhan?bencana=&dari=&sampai=` | baca | rekap, rentang maksimal 31 hari; `per_tindakan` bila migrasi 0153 ada |
| `GET /api/pb/tindakan?peringatan=`, `POST /api/pb/tindakan` | baca: gerbang, `pusdalops`, `koordalops`, `pimpinan`, pemirsa, instansi wilayahnya; tulis seperti titik | tangga tindakan |
| `POST /api/pb/dokumen/rakit`, `/bekukan`, `GET /api/pb/dokumen`, `/dokumen/berkas` | rakit: `pusdalops`, `koordalops`, moderator; bekukan: ditambah `pimpinan`; baca: staf dan gerbang | dokumen (404 selama `kemampuan.dokumen` kosong) (`src/pb_dokumen.js:180`) |
| `GET /api/pb/ringkas`, `GET /api/pb/papan-sk` | gerbang, staf, pemirsa | ringkasan dasbor per bencana, papan SK status darurat (`src/pb_ringkas.js:86`) |
| `/api/ops/*` (tugas, garis api, sumber air, selang, periode, permintaan, drop, linimasa, patroli, drone, TMAT, bukti) | akun instansi aktif pemegang cakupan tugas, moderator, atau staf berperan di wilayahnya | operasi lapangan darat (`src/operasi_lapangan.js:854`); tugas di luar cakupan dijawab 404 |

Peran baca khusus: untuk `/api/pb/titik` dan `/api/pb/renlap`, peran `udara` dan `tmc` hanya membaca karhutla dan udara (`izinBaca`, `src/pb_isian.js:144`).
