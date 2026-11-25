# Referensi: berkas, rute, tabel

Halaman ini mendaftar berkas utama, rute API, tabel D1 beserta migrasi, dan prefiks R2 modul ini.

## Berkas utama

| Berkas | Peran |
| ------ | ----- |
| `public/cuaca/index.html`, `cuaca.js`, `peta.js`, `insight.js`, `dampak.js`, `tren.js`, `status.js`, `metode.js`, `simulasi.html`, `sim_*.js` | Layar /cuaca. |
| `public/cuaca/data/` | Penanda folder registri dan data statis (siklon IBTrACS, jaringan peringatan, zona gerakan tanah PU, nama siklon TCWC, jalur evakuasi tsunami). Keluaran harian ada di `public/banjir/data/cuaca_*.json`. |
| `public/udara/index.html`, `app.js`, `peta.js`, `insight.js`, `prakiraan.js`, `tren.js`, `dampak.js`, `metode.js`, `lintas.js`, `satelit.js`, `stasiun.js`, `operasi.js`, `sim/` | Layar /udara. |
| `public/udara/data/*.json` | Keluaran pipeline udara dan OMC (prakiraan, angin, lintasan, atribusi, asal, peluang, rentan, laporan, bmkg_pm25, ispu, tropomi_*, omc_arsip, omc_bmkg, omc_hasil, awan_himawari, awan_tumbuh, dan lain-lain). |
| `scripts/udara/jalan.py` | Penjalan berantai pipeline udara. |
| `scripts/udara/lintasan.py` | Lintasan asap 72 jam (mode bawaan) dan prakiraan asap 24 jam (`semai`). |
| `scripts/udara/{prakiraan,atribusi,asal,peluang_udara,rentan,dampak_udara,lintas_negara,asap_kab,musim_asap,riwayat,tropomi,bmkg_pm25,ispu,nilai_prakiraan,openaq_mos,geoscf,pm25_mos,awan_himawari,awan_tumbuh}.py` | Langkah pipeline. |
| `scripts/cuaca/cuaca.py` dan modul di folder itu | Pipeline cuaca 72 jam. |
| `scripts/omc/{bmkg_omc,panen,nilai,efek,verifikasi,banding_dalops}.py` | Jadwal resmi, arsip, evaluasi, analisis efek, verifikasi, pembanding. |
| `scripts/operasi/{semai_ifs,semai,semai_murni}.py`, `semai_bobot.json`, `fixture_semai.json` | Mesin zona semai. |
| `src/nowcast.js`, `src/himawari.js`, `src/alarm_himawari.js`, `src/omc.js`, `src/operasi_semai.js`, `src/hak.js` (fungsi `sm*`) | Worker. |
| `public/operasi_semai.js`, `operasi_semai_murni.js`, `operasi_semai.css`, `renlap_omc.html`, `renlap_omc.js`, `renlap_omc.css` | Layar semai dan renlap OMC. |
| `public/admin/omc.js`, `omc.css` | Halaman admin sortie OMC. |
| `public/omc/**` | Tidak ada; folder itu tidak ada di repo per 24 November 2026. Layar OMC berada di `public/admin/omc.*` dan hasilnya di `public/udara/data/omc_*.json`. |

## Rute API

| Metode dan jalur | Hak | Isi |
| ---------------- | --- | --- |
| `GET /api/cuaca/nowcast` | publik, cache tepi 60 detik | Peringatan nowcast aktif dari `cuaca_nowcast` dan `terbit` RSS (`src/nowcast.js:155`). 503 bila tabel belum ada. |
| `GET /api/cuaca/arsip?dari=&sampai=` | publik, cache 300 detik | Arsip ringkas CAP dari `cuaca_arsip`. |
| `GET /api/himawari` | publik, cache tepi 300 detik | Hotspot Himawari dengan kolom `baru`, `w`, `n_baru` (`src/worker.js:927`, `himawariRespons`). Objek R2 hilang berarti kosong, bukan 500. |
| `GET /api/awan_tumbuh` | publik, cache 300 detik | Awan tumbuh cepat dari R2 `data/awan_tumbuh.json` (`src/worker.js:930`); 404 bila belum ada. |
| `GET /api/omc/sortie?sejak=` | publik, cache tepi 5 menit | Sortie nyata tanpa pengisi, catatan, dan baris dummy; bentuk tetap karena dibaca pipeline; paling lama 400 hari, maksimal 500 baris (`src/omc.js:117-125`). |
| `GET /api/omc/admin` | moderator atau staf `tmc`, `koordalops`, `pimpinan`, `operator_cc`; pemirsa Pusdalops | Sortie dan operasi untuk halaman admin (`src/omc.js:128`, `src/staf.js` daftar izin pemirsa). |
| `POST /api/omc/sortie` dan `POST /api/omc/sortie/:id` | moderator atau staf `tmc`; sesi staf wajib header `x-pb: 1`; batas 120 tulis per jam per akun | Buat, ubah, hapus lunak sortie. |
| `POST /api/omc/operasi` | sama | Buat operasi. |
| `POST /api/omc/dummy` | Super Admin | Isi atau hapus data dummy OMC (`aksi: isi` atau `hapus`). |
| `GET /admin/omc` | moderator atau staf berperan | Kerangka halaman admin. |
| `GET /api/operasi/semai/berkas/:nama` | moderator, staf `udara`, `pusdalops`, `koordalops`, `pimpinan`, `tmc` | Berkas R2 `operasi/semai/` dengan nama sah `semai.json`, `angin_asap.json`, `arsip/<10 angka>.json`, `awan_<langkah>.png`, `asap_<langkah>.png` (langkah kelipatan 3 sampai 36); `cache-control: private, max-age=600`. |
| `GET /api/operasi/semai/target?tanggal=` | sama | Target renlap OMC satu hari, tanpa baris terhapus. |
| `POST /api/operasi/semai/target` | moderator atau staf `pusdalops`, `tmc` | Badan `{zona_id, putaran, base_id, tanggal, catatan?}`. Koordinat, skor, jendela, alasan diambil dari arsip R2; 404 bila zona tidak ada; 400 bila jendela lewat, tanggal bukan hari ini atau besok WIB, atau base tidak dikenal; 409 bila target aktif sama sudah ada; 429 setelah 30 isian per hari per akun (`src/operasi_semai.js:61-86`). |
| `POST /api/operasi/semai/target/hapus` | sama | `{id, alasan}` (alasan 5 sampai 300 huruf), hapus lunak, batas 30 per hari. |
| `GET /renlap-omc` | halaman statis | `public/renlap_omc.html` (`src/worker.js:736`); datanya lewat rute berkas di atas. |

Cron Worker (konstanta jadwal di `src/worker.js:110`; pemanggilan `alarmHimawari` di `src/worker.js:1029`, `perbaruiNowcast` di `src/worker.js:1040`, `bersihkanAlarm` di `src/worker.js:1087`): satu cron `* * * * *` (batas 5 jadwal akun gratis) memanggil `alarmHimawari` tiap menit, `perbaruiNowcast` tiap menit kelipatan 10, dan `bersihkanAlarm` pada rutinitas pembersihan.

## Tabel D1 dan migrasi

| Tabel | Migrasi | Isi |
| ----- | ------- | --- |
| `cuaca_nowcast`, `cuaca_sumber` | `0014_cuaca_nowcast.sql` | CAP aktif dan stempel sumber. |
| `cuaca_arsip` | `0021_arsip_cap_gunungapi.sql` | Arsip ringkas CAP permanen. |
| `alarm_himawari` | `0043_insiden_waktu.sql` (baris 9-23; migrasi yang sama menambah kolom `tugas_api.terdeteksi_awal`, `himawari_awal`, `sumber_awal`) | Alarm api baru Himawari; kolom `dikabarkan_pada`, `status`, `tugas_id`. |
| `omc_operasi`, `omc_sortie` | `0033_omc.sql` | Operasi dan sortie OMC; hapus lunak; kolom `dummy`. |
| `op_semai_target` | `0129_semai_target.sql` | Target renlap OMC dari zona; indeks unik `(zona_id, base_id)` untuk target aktif; indeks per akun untuk batas harian. |

Tabel yang dirancang paket semai tetapi belum ada di migrasi: log keputusan harian (`op_semai_putusan`) dan jejak sortie lanjutan.

## Prefiks R2

| Prefiks | Isi |
| ------- | --- |
| `operasi/semai/` (bucket `poskokarhutla-foto`) | `semai.json`, `awan_<l>.png`, `asap_<l>.png`, `angin_asap.json`, `arsip/<putaran>.json` (append-only, tidak ditimpa). |
| `data/himawari.json`, `data/awan_tumbuh.json` | Hotspot dan awan tumbuh, ditimpa tiap 30 menit. |
| `arsip/himawari/YYYY/MM/DD/<HHMM>.json.gz` | Arsip bertanggal hotspot Himawari. |
