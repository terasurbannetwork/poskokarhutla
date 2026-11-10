# Peta data (dihasilkan, jangan disunting)

Dihasilkan `python3 scripts/agents/peta_data.py bangun` dari kode nyata. Aturan pemilik 10 Nov 2026: tiap data eksternal punya pemakai nyata, dan tiap angka yang sama harus cocok di semua tempat.

Status: `terpakai` (ada pemakai + penjadwal), `yatim` (tanpa pemakai), `tanpa-jadwal` (sumber luar, ada pemakai, penjadwal tidak ditemukan), `arsip` (append-only), `statis` (ada pemakai, tanpa penulis terjadwal atau tanpa sumber luar). Heuristik: penulis = skrip yang memuat nama berkas dan penanda tulis; nama dirakit f-string tak terlacak. Pemakai di folder laporan lokal dicatat terpisah dan tidak mengubah status.

## Ringkasan

- arsip: 13
- statis: 104
- tanpa-jadwal: 13
- terpakai: 348
- yatim: 45
- total entri: 523

## Daftar yatim

- `public/banjir/data/charter.json` , penulis scripts/banjir/charter.py
- `public/banjir/data/bmkg_upt.json` , penulis scripts/cuaca/iklim_bmkg.py
- `public/banjir/data/mcdwd_model.json` , penulis scripts/banjir/ems.py, scripts/banjir/mcdwd_model.py
- `public/banjir/data/siaga_persentil_log.json` , penulis scripts/banjir/siaga_persentil.py
- `public/banjir/data/iklim_bmkg.json` , penulis scripts/cuaca/iklim_bmkg.py
- `public/banjir/data/kecamatan_genangan.json` , penulis scripts/banjir/genangan/tangki.py
- `public/banjir/data/cuaca_sarana.json` , penulis scripts/cuaca/dampak_cuaca.py, scripts/cuaca/gelombang.py
- `public/banjir/data/kejadian_gunungapi_geo.json`
- `public/banjir/data/kejadian_aktif_nomor.json` , penulis scripts/banjir/kejadian_aktif.py
- `public/banjir/data/model_bahaya.json` , penulis scripts/banjir/model_bahaya.py
- `public/banjir/data/cuaca_prospektif*.json` , penulis scripts/cuaca/imerg.py, scripts/cuaca/prospektif_cuaca.py
- `public/banjir/data/kejadian_gunungapi_nomor.json`
- `public/banjir/data/paparan_kab.json` , penulis scripts/banjir/dampak_kab.py, scripts/prediksi/terbit.py
- `public/data/risiko_mingguan_uji.json` , penulis scripts/sebaran/risiko_mingguan.py, scripts/sebaran/risiko_produksi.py
- `public/data/ps.json` , penulis scripts/data/panen/ps.py
- `public/data/khg_hari.json` , penulis scripts/data/khg_prioritas.py
- `public/data/iklim_stasiun.json` , penulis scripts/cuaca/iklim_stasiun.py
- `public/data/gdelt.json` , penulis scripts/umum/sinyal_sosial.py
- `public/data/foto_dasar.json` , penulis scripts/umum/foto_dasar.py
- `public/data/tambang.json` , penulis scripts/data/panen/tambang.py
- `public/data/sk_drive.json` , penulis scripts/umum/status_darurat.py
- `public/data/logistik.json` , penulis scripts/umum/logistik.py
- `public/data/slstr_malam.json` , penulis scripts/data/panen/slstr_malam.py
- `public/data/reliefweb.json` , penulis scripts/umum/reliefweb.py
- `public/data/bahan_bakar_uji.json`
- `public/data/transisi_lahan.json` , penulis scripts/data/panen/lab_mapbiomas.py
- `public/data/bahan_bakar.json` , penulis scripts/sebaran/bahan_bakar.py
- `public/data/hgu_api.json` , penulis scripts/data/panen/hgu_api.py
- `public/data/sinyal_sosial.json` , penulis scripts/umum/sinyal_sosial.py
- `public/data/kemenhut/terbakar_2026/*.json` (37 berkas)
- `public/gempa/data/emsc_residu.json` , penulis scripts/gempa/emsc.py
- `public/gempa/data/prospektif_susulan.json` , penulis scripts/gempa/susulan.py, scripts/umum/rapor_belajar.py
- `public/gempa/data/gnss.json` , penulis scripts/gempa/gnss.py
- `public/gempa/data/prospektif_guncangan.json` , penulis scripts/gempa/guncangan.py
- `public/gempa/data/inatews_sejarah.json` , penulis scripts/gempa/inatews.py
- `public/gempa/data/dart.json` , penulis scripts/gempa/dart.py
- `public/gempa/data/inatews_sensor.json` , penulis scripts/gempa/inatews.py
- `public/gempa/data/emsc_prospektif.json` , penulis scripts/gempa/emsc.py
- `public/udara/data/lintasan.json` , penulis scripts/udara/laporan_udara.py, scripts/udara/lintasan.py
- `public/udara/data/geoscf.json` , penulis scripts/udara/geoscf.py
- `public/udara/data/atribusi.json` , penulis scripts/udara/atribusi.py, scripts/udara/laporan_udara.py
- `public/udara/data/kualitas_bmkg.json` , penulis scripts/udara/kualitas_bmkg.py
- `D1:alat_jejak` , penulis src/instansi.js
- `D1:meja_jejak` , penulis src/operasi_lapangan.js
- `D1:rumah_rusak_koreksi` , penulis src/rumah_rusak.js

## Daftar tanpa-jadwal

- `public/banjir/data/pos_sungai.json` , penulis scripts/banjir/pos_sungai.py
- `public/banjir/data/label_kec_ringkas.json` , penulis scripts/banjir/label_kec.py
- `public/banjir/data/cuaca_risiko_bnpb.json` , penulis scripts/cuaca/risiko_bnpb.py
- `public/banjir/data/faktor_kec.json` , penulis scripts/banjir/faktor_kec.py
- `public/banjir/data/lampu_malam_validasi.json` , penulis scripts/umum/lampu_malam.py
- `public/banjir/data/koreksi_bias.json` , penulis scripts/banjir/koreksi_bias.py
- `public/data/logpal/**` , penulis scripts/logpal/impor.mjs, src/logpal.js
- `public/gempa/data/vs30.json` , penulis scripts/gempa/vs30.py
- `public/gempa/data/katalog_merusak.json` , penulis scripts/gempa/katalog_pdf.py
- `public/gempa/data/batimetri.json` , penulis scripts/gempa/batimetri.py
- `public/gempa/data/katalog_tsunami.json` , penulis scripts/gempa/katalog_pdf.py
- `public/prediksi/data/jalan.json` , penulis scripts/data/lab_luas.py, scripts/data/lab_padam.py
- `public/udara/data/omc_hasil.json` , penulis src/omc.js

## Peta lengkap

| Berkas | Lembaga | URL | Penulis | Jadwal | Pemakai | Status |
|---|---|---|---|---|---|---|
| `D1:adsb_posisi` | adsb.fi, opendata.adsb.fi | https://adsb.fi | adsb.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:akademisi_riwayat` | akademisi.karya, akademisi.riset, api.openalex.org, openalex.org, pub.orcid.org | https://akademisi.karya/ | akademisi.js | TIDAK ADA | worker: 1 | statis |
| `D1:alat_jejak` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | - | yatim |
| `D1:audit_moderasi` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | worker.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:cc_hadir` | aset.lokal | https://aset.lokal/data/bpbd.json | command_center.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:cc_jejak` | aset.lokal | https://aset.lokal/data/bpbd.json | command_center.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:cc_status` | aset.lokal | https://aset.lokal/data/bpbd.json | command_center.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:cuaca_arsip` | BMKG | https://www.bmkg.go.id/alerts/nowcast/id | nowcast.js | worker scheduled() cron | model/turunan: 1; worker: 1 | terpakai |
| `D1:cuaca_nowcast` | BMKG | https://www.bmkg.go.id/alerts/nowcast/id | nowcast.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:cuaca_sumber` | BMKG, ESDM/PVMBG, api.dpuprkotang.info, centurisk97.id, poskobanjir.dsdadki.web.id | https://api.dpuprkotang.info/nuxt/posduga | gunungapi.js, nowcast.js | worker scheduled() cron | model/turunan: 2; worker: 3 | terpakai |
| `D1:ews_keadaan` | BMKG, api.resend.com, aset.lokal, centurisk97.id | https://api.resend.com/emails | ews.js | TIDAK ADA | worker: 1 | statis |
| `D1:ews_laju` | BMKG, api.resend.com, aset.lokal, centurisk97.id | https://api.resend.com/emails | ews.js | TIDAK ADA | worker: 1 | statis |
| `D1:ews_langganan` | BMKG, api.resend.com, aset.lokal, centurisk97.id | https://api.resend.com/emails | ews.js | TIDAK ADA | worker: 1 | statis |
| `D1:ews_terkirim` | BMKG, api.resend.com, aset.lokal, centurisk97.id | https://api.resend.com/emails | ews.js | TIDAK ADA | worker: 1 | statis |
| `D1:gempa` | BMKG, USGS | https://cdn.bmkg.go.id/ | gempa.js | worker scheduled() cron | layar publik: 66; layar staf: 20; model/turunan: 96; peringatan: 3; worker: 22 | terpakai |
| `D1:gempa_kejadian` | BMKG, USGS | https://cdn.bmkg.go.id/ | gempa.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:gempa_sumber` | BMKG, USGS | https://cdn.bmkg.go.id/ | gempa.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:gunungapi_level` | ESDM/PVMBG | https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas | gunungapi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:gunungapi_ubah` | ESDM/PVMBG | https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas | gunungapi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:instansi_akun` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | model/turunan: 1; peringatan: 1; worker: 10 | terpakai |
| `D1:instansi_jejak` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:instansi_media` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 6 | terpakai |
| `D1:instansi_sesi` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:isian_lapangan` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | model/turunan: 1; worker: 2 | terpakai |
| `D1:isian_rinci` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:kontak` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | worker.js | worker scheduled() cron | layar publik: 14; layar staf: 14; model/turunan: 15; peringatan: 1; worker: 16 | terpakai |
| `D1:kontak_pemangku` | aset.lokal | https://aset.lokal/banjir/data/pusat_kec.json | kontak.js | TIDAK ADA | worker: 2 | statis |
| `D1:kontak_pt` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js, posko.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:laju_bnpb` | *.openfreemap.org, api.resend.com, aset.lokal, assets.stockbit.com, google.com, resend.com, server.arcgisonline.com, wa.me, x | http://x/ | bnpb.js, instansi.js | worker scheduled() cron | worker: 14 | terpakai |
| `D1:laju_posko` | *.openfreemap.org, api.resend.com, aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | posko.js, worker.js | worker scheduled() cron | worker: 4 | terpakai |
| `D1:lapangan` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | layar publik: 49; layar staf: 55; model/turunan: 59; peringatan: 3; worker: 43 | terpakai |
| `D1:lapangan_tahan` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:laporan` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | worker.js | worker scheduled() cron | layar publik: 116; layar staf: 57; model/turunan: 151; peringatan: 2; worker: 41 | terpakai |
| `D1:laporan_wilayah` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | worker.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:lk_fs` | aset.lokal, wa.me | http://aset.lokal/data/laporan.json | laporan_karhutla.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:lk_hari` | aset.lokal, wa.me | http://aset.lokal/data/laporan.json | laporan_karhutla.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:lk_kiriman` | aset.lokal, wa.me | http://aset.lokal/data/laporan.json | laporan_karhutla.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:lk_snapshot` | aset.lokal, wa.me | http://aset.lokal/data/laporan.json | laporan_karhutla.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:lk_versi` | aset.lokal, wa.me | http://aset.lokal/data/laporan.json | laporan_karhutla.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:lkb_hari` | aset.lokal | http://aset.lokal | laporan_bencana.js | TIDAK ADA | worker: 1 | statis |
| `D1:lkb_kiriman` | aset.lokal | http://aset.lokal | laporan_bencana.js | TIDAK ADA | worker: 1 | statis |
| `D1:lkb_snapshot` | aset.lokal | http://aset.lokal | laporan_bencana.js | TIDAK ADA | worker: 1 | statis |
| `D1:lkb_versi` | aset.lokal | http://aset.lokal | laporan_bencana.js | TIDAK ADA | worker: 1 | statis |
| `D1:media_petugas` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:meja_jejak` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | - | yatim |
| `D1:neraca_harian` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:omc_operasi` | aset.lokal | https://aset.lokal/udara/data/omc_hasil.json | omc.js | TIDAK ADA | worker: 1 | statis |
| `D1:omc_sortie` | aset.lokal | https://aset.lokal/udara/data/omc_hasil.json | omc.js | TIDAK ADA | worker: 1 | statis |
| `D1:ops_drone` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_drone_unggah` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_drop` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_garis` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:ops_jejak` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_kunjungan` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_patroli` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_pelajaran` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_periode` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_permintaan` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_serah` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_sumber_air` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:ops_tmat` | aset.lokal | https://aset.lokal | operasi_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:panggilan` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | layar publik: 17; layar staf: 14; model/turunan: 56; worker: 21 | terpakai |
| `D1:paparan_templat` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:pengingat` | aset.lokal, centurisk97.id, wa.me | https://aset.lokal | pengingat.js | worker scheduled() cron | layar staf: 4; worker: 5 | terpakai |
| `D1:penugasan` | aset.lokal, google.com, wa.me | https://aset.lokal/data/cuaca/${k | penugasan.js | TIDAK ADA | layar publik: 6; layar staf: 9; model/turunan: 3; worker: 13 | statis |
| `D1:penugasan_darurat` | aset.lokal, google.com, wa.me | https://aset.lokal/data/cuaca/${k | penugasan.js | TIDAK ADA | worker: 1 | statis |
| `D1:penugasan_posisi` | aset.lokal, google.com, wa.me | https://aset.lokal/data/cuaca/${k | penugasan.js | TIDAK ADA | worker: 4 | statis |
| `D1:peringatan` | BMKG, USGS, aset.lokal, centurisk97.id | https://aset.lokal/banjir/data/kejadian_aktif_awal.json | peringatan.js | worker scheduled() cron | layar publik: 77; layar staf: 36; model/turunan: 77; peringatan: 2; worker: 15 | terpakai |
| `D1:pesan` | api.resend.com, resend.com, x | http://x/ | statistik.js | TIDAK ADA | layar publik: 51; layar staf: 97; model/turunan: 54; peringatan: 3; worker: 32 | statis |
| `D1:regu` | *.openfreemap.org, api.resend.com, aset.lokal, wa.me | https://*.openfreemap.org | posko.js | worker scheduled() cron | layar publik: 36; layar staf: 34; model/turunan: 25; peringatan: 1; worker: 27 | terpakai |
| `D1:rumah_rusak` | *.openfreemap.org | https://*.openfreemap.org | rumah_rusak.js | TIDAK ADA | layar publik: 12; layar staf: 2; model/turunan: 6; worker: 4 | statis |
| `D1:rumah_rusak_koreksi` | *.openfreemap.org | https://*.openfreemap.org | rumah_rusak.js | TIDAK ADA | - | yatim |
| `D1:sihka_baca` | api.dpuprkotang.info, centurisk97.id, poskobanjir.dsdadki.web.id | https://api.dpuprkotang.info/nuxt/posduga | sungai_resmi.js | TIDAK ADA | model/turunan: 1 | statis |
| `D1:sihka_pos` | api.dpuprkotang.info, centurisk97.id, poskobanjir.dsdadki.web.id | https://api.dpuprkotang.info/nuxt/posduga | sungai_resmi.js | TIDAK ADA | model/turunan: 1 | statis |
| `D1:sosmed` | instagram.com, platform.twitter.com, publish.twitter.com, threads.com, x.com | https://platform.twitter.com/embed/Tweet.html?id=${m[2 | sosmed.js | TIDAK ADA | layar publik: 1; layar staf: 1; model/turunan: 2; worker: 3 | statis |
| `D1:stat_garam` | bing.com, cache.lokal, developers.google.com, index.commoncrawl.org, openai.com, perplexity.ai, search.developer.apple.com | https://cache.lokal/api/publik?r=${r | publik.js | TIDAK ADA | worker: 1 | statis |
| `D1:stat_hari` | api.resend.com, resend.com, x | http://x/ | statistik.js | TIDAK ADA | worker: 2 | statis |
| `D1:stat_ip` | bing.com, cache.lokal, developers.google.com, index.commoncrawl.org, openai.com, perplexity.ai, search.developer.apple.com | https://cache.lokal/api/publik?r=${r | publik.js | TIDAK ADA | worker: 2 | statis |
| `D1:stat_tamu` | bing.com, cache.lokal, developers.google.com, index.commoncrawl.org, openai.com, perplexity.ai, search.developer.apple.com | https://cache.lokal/api/publik?r=${r | publik.js | TIDAK ADA | worker: 1 | statis |
| `D1:suara` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | worker.js | worker scheduled() cron | layar publik: 5; layar staf: 1; model/turunan: 9; worker: 4 | terpakai |
| `D1:sungai_meta` | api.dpuprkotang.info, centurisk97.id, poskobanjir.dsdadki.web.id | https://api.dpuprkotang.info/nuxt/posduga | sungai_resmi.js | TIDAK ADA | model/turunan: 1; worker: 1 | statis |
| `D1:titik_proses_sippa` | NASA FIRMS, aset.lokal | https://aset.lokal | titik.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:titik_terbaru` | NASA FIRMS, aset.lokal | https://aset.lokal | titik.js | worker scheduled() cron | peringatan: 2; worker: 9 | terpakai |
| `D1:tugas_api` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js, operasi_lapangan.js | worker scheduled() cron | layar publik: 1; layar staf: 1; model/turunan: 3; peringatan: 3; worker: 15 | terpakai |
| `D1:tugas_bencana` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | layar publik: 3; peringatan: 1; worker: 11 | terpakai |
| `D1:tugas_isian` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | model/turunan: 1; worker: 11 | terpakai |
| `D1:tugas_kartu` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js, uji_lapangan.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:tugas_lapangan` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:tugas_luas_awal` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js, uji_lapangan.js | worker scheduled() cron | worker: 2 | terpakai |
| `D1:tugas_meta` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js, uji_lapangan.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:tugas_muncul` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 4 | terpakai |
| `D1:uji_isian` | aset.lokal | https://aset.lokal/data/ | uji_lapangan.js | worker scheduled() cron | model/turunan: 1; worker: 1 | terpakai |
| `D1:uji_sampel` | aset.lokal | https://aset.lokal/data/ | uji_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:uji_terlewat` | aset.lokal | https://aset.lokal/data/ | uji_lapangan.js | worker scheduled() cron | worker: 1 | terpakai |
| `D1:uji_tugas` | aset.lokal | https://aset.lokal/data/ | uji_lapangan.js | worker scheduled() cron | worker: 3 | terpakai |
| `D1:usulan_kontak_pt` | *.openfreemap.org, aset.lokal, wa.me | https://*.openfreemap.org | instansi.js | worker scheduled() cron | worker: 3 | terpakai |
| `public/banjir/data/abu_gunungapi.json` | ECMWF, ESDM/PVMBG, Open-Meteo, [a-z0-9.-, cendana15.com, davidmegginson.github.io, magma, ourairports.com, x | http://magma.vsi.esdm.go.id/x | abu.py, magma.py | lintas.yml cron 10 2 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * | | layar publik: 5; layar staf: 1; model/turunan: 3 | terpakai |
| `public/banjir/data/abu_peluang.json` | - | - | - | TIDAK ADA | layar publik: 2; model/turunan: 1 | statis |
| `public/banjir/data/ambang_persentil.json` | - | - | ambang_persentil.py | banjir.yml cron 20 0 * * * | layar publik: 1; model/turunan: 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/banjir/data/ambang_wilayah.json` | - | - | ambang_wilayah.py | banjir.yml cron 20 0 * * * | model/turunan (nama tanpa .json): 3 | terpakai |
| `public/banjir/data/bahaya.json` | BNPB, Open-Meteo | https://archive-api.open-meteo.com/v1/archive | bahaya.py, kalibrasi_j3.py | banjir.yml cron 20 0 * * *; genangan_j4.yml cron 30 22 * * *; lintas.y | layar publik: 3; model/turunan: 16 | terpakai |
| `public/banjir/data/bahaya_kelas.json` | BNPB | https://gis.bnpb.go.id/server/rest/services/inarisk | bahaya.py, dampak_kab.py | banjir.yml cron 20 0 * * * | layar publik: 3; model/turunan: 1 | terpakai |
| `public/banjir/data/bendungan.json` | - | - | bangun_pu.py | TIDAK ADA | layar publik: 1 | statis |
| `public/banjir/data/berita.json` | aset.lokal, mesonet.agron.iastate.edu, news.google.com, tiktok.com, tiles.openfreemap.org, wa.me, zenodo.org | http://aset.lokal/ | hubung.mjs, mutakhir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | layar publik: 4; model/turunan: 6; worker: 1 | terpakai |
| `public/banjir/data/berita_cuaca.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2; worker: 1 | statis |
| `public/banjir/data/berita_gempa.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2; worker: 1 | statis |
| `public/banjir/data/berita_gunungapi.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2; worker: 1 | statis |
| `public/banjir/data/berita_kekeringan.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2; worker: 1 | statis |
| `public/banjir/data/berita_udara.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2; worker: 1 | statis |
| `public/banjir/data/bmkg_upt.json` | BMKG, dataweb, docs | https://content.bmkg.go.id/ | iklim_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | - | yatim |
| `public/banjir/data/bukti/**` | *.openfreemap.org, BNPB, ESDM/PVMBG, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, [a-z0-9.-, api.ioda.inetintel.cc.gatech.edu, aset.lokal, cendana15.com, centurisk97.id, data.globalforestwatch.org, drive, drive.google.com, drive.google.com.evil.com, esa-worldcover.s3.eu-central-1.amazonaws.com, flashwildfireservices.ca, ioda.inetintel.cc.gatech.edu, magma, planetarycomputer.microsoft.com, powerequipment.honda.com.au, res.cloudinary.com, s3.amazonaws.com, schemas.openxmlformats.org, sites.research.google, tohatsu.com, wa.me, x, zenodo.org | http://drive.google.com/x | bukti_das.py, citra_banjir.py | bangunan.yml cron 30 20 3 * * | 30 8 * * *; banjir.yml cron 20 0 * * * | laporan: 7; layar publik: 37; layar staf: 24; model/turunan: 29; peringatan: 1; worker: 4 | terpakai |
| `public/banjir/data/charter.json` | centurisk97.id, disasterscharter.org | https://centurisk97.id | charter.py | banjir.yml cron 20 0 * * * | - | yatim |
| `public/banjir/data/cuaca_arsip_bmkg.json` | Open-Meteo | https://previous-runs-api.open-meteo.com/v1/forecast? | verifikasi.py | banjir.yml cron 20 0 * * * | model/turunan: 2 | terpakai |
| `public/banjir/data/cuaca_bandara_bmkg.json` | BMKG | https://www.bmkg.go.id/cuaca/bandara | bandara_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/cuaca_bmkg_arsip*.json` | BMKG | https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4= | bmkg_prakiraan.py, maritim.py | lintas.yml cron 10 2 * * * | - | arsip |
| `public/banjir/data/cuaca_bmkg_arsip_siklon*.json` | BMKG | https://www.bmkg.go.id/cuaca/siklon-tropis | siklon_bmkg.py | lintas.yml cron 10 2 * * * | - | arsip |
| `public/banjir/data/cuaca_bmkg_kab10.json` | BMKG | https://www.bmkg.go.id/cuaca/prakiraan-cuaca | bmkg_kab10.py | lintas.yml cron 10 2 * * * | layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_dampak.json` | BMKG, BNPB, JTWC, Open-Meteo | https://dibi.bnpb.go.id | dampak_cuaca.py, laporan_cuaca.py | lintas.yml cron 10 2 * * * | layar publik: 3; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_factsheet.json` | BMKG, beritajatim.com | https://beritajatim.com/angin-kencang-terjang-bojonegoro-17- | factsheet.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_factsheet_arsip*.json` | BMKG, beritajatim.com | https://beritajatim.com/angin-kencang-terjang-bojonegoro-17- | factsheet.py | arsip-bmkg.yml cron 25 */3 * * * | - | arsip |
| `public/banjir/data/cuaca_gelombang.json` | BMKG, Open-Meteo | https://marine-api.open-meteo.com/v1/marine | dampak_cuaca.py, gelombang.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; model/turunan: 2; worker: 1 | terpakai |
| `public/banjir/data/cuaca_kec.json` | BMKG, BNPB, JTWC, Open-Meteo, centurisk97.id | https://centurisk97.id/api/meja/ringkas | risiko.py, cuaca.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3; layar publik (nama tanpa .json): 1; model/turunan: 3 | terpakai |
| `public/banjir/data/cuaca_langganan.json` | - | - | langganan.py | lintas.yml cron 10 2 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/cuaca_laporan.json` | BMKG, BNPB, JTWC, Open-Meteo, sitrep.internal | https://dibi.bnpb.go.id | laporan_cuaca.py, uji_alur.py | lintas.yml cron 10 2 * * * | layar publik: 3; layar staf: 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_maritim.json` | BMKG | https://maritim.bmkg.go.id/marine2026-data/ | maritim.py | lintas.yml cron 10 2 * * * | layar publik: 2; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_medan.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | medan.py, uji_alur.py | lintas.yml cron 10 2 * * * | layar publik: 2 | terpakai |
| `public/banjir/data/cuaca_meta.json` | - | - | cuaca.py | lintas.yml cron 10 2 * * * | layar publik: 4; model/turunan: 3; worker: 1 | terpakai |
| `public/banjir/data/cuaca_metar.json` | BMKG, aviationweather.gov | https://aviationweather.gov/api/data/metar?format=json&hours | metar.py, jarak_pandang_jam.mjs | jarak_pandang.yml cron 12 22-23,0-10 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_musim.json` | - | - | musim.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/banjir/data/cuaca_peluang.json` | - | - | peluang_cuaca.py | lintas.yml cron 10 2 * * * | layar publik: 2 | terpakai |
| `public/banjir/data/cuaca_petir.json` | BMKG | https://www.bmkg.go.id/geofisika-potensial/petir-realtime | petir.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_petir_arsip*.json` | BMKG | https://www.bmkg.go.id/geofisika-potensial/petir-realtime | petir.py | arsip-bmkg.yml cron 25 */3 * * * | - | arsip |
| `public/banjir/data/cuaca_posko.json` | - | - | posko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/banjir/data/cuaca_prakiraan.json` | - | - | cuaca.py, prospektif_cuaca.py | lintas.yml cron 10 2 * * * | layar publik: 1; model/turunan: 2 | terpakai |
| `public/banjir/data/cuaca_prospektif*.json` | NASA | https://gpm1.gesdisc.eosdis.nasa.gov | imerg.py, prospektif_cuaca.py | lintas.yml cron 10 2 * * * | - | yatim |
| `public/banjir/data/cuaca_risiko_bnpb.json` | BNPB | https://inarisk.bnpb.go.id/apiv4/ | risiko_bnpb.py | TIDAK ADA | layar publik: 1 | tanpa-jadwal |
| `public/banjir/data/cuaca_riwayat.json` | BMKG, BNPB, JTWC, Open-Meteo, contoh.invalid | https://contoh.invalid/ | cuaca.py, laporan_cuaca.py | lintas.yml cron 10 2 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/cuaca_sarana.json` | BMKG, BNPB, JTWC, Open-Meteo, OpenStreetMap, davidmegginson.github.io | https://davidmegginson.github.io/ourairports-data/airports.c | dampak_cuaca.py, gelombang.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | - | yatim |
| `public/banjir/data/cuaca_sepekan.json` | BMKG | https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan | sepekan.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_sepekan_arsip.json` | BMKG | https://www.bmkg.go.id/cuaca/potensi-hujan-sepekan | sepekan.py | arsip-bmkg.yml cron 25 */3 * * * | - | arsip |
| `public/banjir/data/cuaca_siklon.json` | BMKG, BNPB, GDACS, JMA, JTWC, JTWC (US Navy), Open-Meteo, [^ | http://www.gdacs.org/x | cuaca.py, laporan_cuaca.py | lintas.yml cron 10 2 * * * | model/turunan: 1 | terpakai |
| `public/banjir/data/cuaca_siklon_bmkg.json` | BMKG, GDACS, JMA, JTWC, JTWC (US Navy), [^ | http://www.gdacs.org/x | siklon.py, siklon_bmkg.py | lintas.yml cron 10 2 * * * | layar publik: 2 | terpakai |
| `public/banjir/data/cuaca_synop_arsip.json` | - | - | - | TIDAK ADA | model/turunan: 1 | arsip |
| `public/banjir/data/cuaca_uji_logbook.json` | - | - | langganan.py, uji_logbook.py | lintas.yml cron 10 2 * * * | layar publik: 2 | terpakai |
| `public/banjir/data/cuaca_verif_synop.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/banjir/data/cuaca_verifikasi.json` | Open-Meteo | https://previous-runs-api.open-meteo.com/v1/forecast? | peluang_cuaca.py, verifikasi.py | banjir.yml cron 20 0 * * *; lintas.yml cron 10 2 * * * | layar publik: 3; model/turunan: 4 | terpakai |
| `public/banjir/data/dampak.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu | https://inarisk.bnpb.go.id/ | dampak.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * * | layar publik: 7; model/turunan: 2; worker: 1 | terpakai |
| `public/banjir/data/dampak_gempa.json` | - | - | dampak.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/banjir/data/dampak_gunungapi.json` | - | - | - | TIDAK ADA | layar publik: 3; model/turunan: 2 | statis |
| `public/banjir/data/dampak_kekeringan.json` | - | - | dampak.py | lintas.yml cron 10 2 * * * | layar publik: 3 | terpakai |
| `public/banjir/data/ems.json` | Copernicus, centurisk97.id | https://centurisk97.id | ems.py | banjir.yml cron 20 0 * * * | model/turunan: 1 | terpakai |
| `public/banjir/data/faktor_kec.json` | Open-Meteo, api.opentopodata.org | https://api.open-meteo.com/v1/elevation | faktor_kec.py | TIDAK ADA | layar publik: 2; model/turunan: 1 | tanpa-jadwal |
| `public/banjir/data/genangan/**` | BNPB, Copernicus, ESDM/PVMBG, NASA, NOAA, Open-Meteo, OpenStreetMap, centurisk97.id, data.eodc.eu, data.petabencana.id, s3.amazonaws.com, sites.research.google, stac.eodc.eu, tiles.openfreemap.org, zenodo.org | https://api.open-meteo.com/v1/forecast | dampak_sensitivitas.py, ems.py | bangunan.yml cron 30 20 3 * * | 30 8 * * *; banjir.yml cron 20 0 * * * | layar publik: 35; layar staf: 3; model/turunan: 26; worker: 2 | terpakai |
| `public/banjir/data/genangan_historis/*.json` | - | - | genangan_historis.py | TIDAK ADA | layar publik: 1 | statis |
| `public/banjir/data/genangan_historis_kec.json` | - | - | genangan_historis.py | TIDAK ADA | layar publik: 1 | statis |
| `public/banjir/data/genangan_nasional.json` | - | - | - | TIDAK ADA | model/turunan: 2; model/turunan (nama tanpa .json): 3 | statis |
| `public/banjir/data/grrr_ambang.json` | - | - | grrr.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/banjir/data/gunungapi_status.json` | BNPB, ECMWF, ESDM/PVMBG, Open-Meteo, [a-z0-9.-, cendana15.com, centurisk97.id, davidmegginson.github.io, magma, ourairports.com, sitrep.internal, x | http://magma.vsi.esdm.go.id/x | abu.py, dampak.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 4; layar staf: 6; model/turunan: 7; worker: 1 | terpakai |
| `public/banjir/data/hari/**` | *.openfreemap.org, BMKG, BNPB, Copernicus, ESDM/PVMBG, JMA/BMKG Himawari, JTWC, Kemenhut, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [a-z0-9.-, a, akademisi.karya, akademisi.riset, api.dpuprkotang.info, api.gdeltproject.org, api.ioda.inetintel.cc.gatech.edu, api.openalex.org, api.opentopodata.org, api.reliefweb.int, api.resend.com, api.waqi.info, aset.lokal, assets.stockbit.com, beritajatim.com, bing.com, cache.lokal, celestrak.org, cendana15.com, centurisk97.id, commons.wikimedia.org, contoh.invalid, cwfis.cfs.nrcan.gc.ca, data-api.globalforestwatch.org, data.chc.ucsb.edu, data.eodc.eu, data.petabencana.id, dataweb, detik.com, developers.google.com, digilib.uin-suka.ac.id, disasterscharter.org, dji.com, docs, doi.org, drive, drive.google.com, drive.google.com.evil.com, drive.usercontent.google.com, e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com, earth-search.aws.element84.com, edge.stellardata.ai, esa-worldcover.s3.eu-central-1.amazonaws.com, evil.example, finansial.bisnis.com, flashwildfireservices.ca, geodesy.unr.edu, glad.earthengine.app, global-hydrodynamics.github.io, globalfloods.eu, goo.gl, google.com, graph.mapillary.com, greenpeace.org, hydrosheds.org, index.commoncrawl.org, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, iridl.ldeo.columbia.edu, katadata.co.id, lpds.or.id, magma, mesonet.agron.iastate.edu, metrotvnews.com, nama-situs, news.google.com, nwcg.gov, ogimet.com, openai.com, openalex.org, openarchives.org, opencellid.org, opengis.net, pemerintah ID, perplexity.ai, planetarycomputer.microsoft.com, poskobanjir.dsdadki.web.id, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, pub.orcid.org, public.emdat.be, publish.csiro.au, purl.org, reliefweb.int, repositori.usu.ac.id, repository.unhas.ac.id, repository.unib.ac.id, repository.untad.ac.id, res.cloudinary.com, resend.com, rest.isric.org, schemas.openxmlformats.org, scholar.unand.ac.id, search.developer.apple.com, seismicportal.eu, sentinel-asia.org, sentinel-cogs.s3.us-west-2.amazonaws.com, server.arcgisonline.com, sihka.dev-tunnels.id, sitrep.internal, spherestandards.org, stac.eodc.eu, tiktok.com, tiles.openfreemap.org, tohatsu.com, trends.google.com, wa.me, walhi.or.id, x, zenodo.org | http://a/1 | token-ukur.mjs, iklim.py | akademisi.yml cron 0 20 1 * *; arsip-bmkg.yml cron 25 */3 * * *; banji | laporan: 44; layar publik: 209; layar staf: 92; model/turunan: 95; peringatan: 1; worker: 17 | terpakai |
| `public/banjir/data/hujan.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | ansambel_hujan.py, bukti_das.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; genangan_j4.yml | layar publik: 5; model/turunan: 6 | terpakai |
| `public/banjir/data/hujan_ansambel.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | ansambel_hujan.py, peluang_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 5; model/turunan: 3 | terpakai |
| `public/banjir/data/hulu.json` | BNPB, Open-Meteo, glad.earthengine.app, hydrosheds.org | https://archive-api.open-meteo.com/v1/archive? | debit_hulu.py, j4_operasi.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; genangan_j4.yml | layar publik: 1; model/turunan: 2 | terpakai |
| `public/banjir/data/hulu_hilir.json` | - | - | - | TIDAK ADA | layar publik: 1 | statis |
| `public/banjir/data/iklim_bmkg.json` | BMKG, dataweb, docs | https://content.bmkg.go.id/ | iklim_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | - | yatim |
| `public/banjir/data/iklim_bmkg_arsip.json` | BMKG, dataweb, docs | https://content.bmkg.go.id/ | iklim_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | model/turunan: 1 | terpakai |
| `public/banjir/data/karhutla_bmkg.json` | BMKG | https://dataweb.bmkg.go.id/cuaca/dokumen/factsheet-karhutla. | factsheet_karhutla.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/banjir/data/karhutla_bmkg_arsip*.json` | BMKG | https://dataweb.bmkg.go.id/cuaca/dokumen/factsheet-karhutla. | factsheet_karhutla.py | arsip-bmkg.yml cron 25 */3 * * * | - | arsip |
| `public/banjir/data/kebutuhan_musim.json` | - | - | kebutuhan.py | lintas.yml cron 10 2 * * * | layar staf: 3 | terpakai |
| `public/banjir/data/kecamatan_genangan.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | tangki.py | m1_prospektif.yml cron 30 15 * * * | 30 21 * * * | - | yatim |
| `public/banjir/data/kecamatan_pemicu.json` | - | - | m1_nilai.py | m1_prospektif.yml cron 30 15 * * * | 30 21 * * * | layar staf (nama tanpa .json): 1; model/turunan: 2 | terpakai |
| `public/banjir/data/kejadian.json` | BNPB, Copernicus, NASA, Open-Meteo, schemas.openxmlformats.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | bukti_das.py, kejadian.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 7; model/turunan: 14 | terpakai |
| `public/banjir/data/kejadian/**` | *.openfreemap.org, BMKG, BNPB, Copernicus, ECMWF, ESDM/PVMBG, JTWC, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [a-z0-9.-, a, akademisi.karya, akademisi.riset, api.gdeltproject.org, api.ioda.inetintel.cc.gatech.edu, api.openalex.org, api.opentopodata.org, api.reliefweb.int, aset.lokal, cendana15.com, centurisk97.id, contoh.invalid, data.chc.ucsb.edu, data.eodc.eu, davidmegginson.github.io, disasterscharter.org, doi.org, drive, drive.google.com, drive.usercontent.google.com, glad.earthengine.app, globalfloods.eu, graph.mapillary.com, hydrosheds.org, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, magma, mesonet.agron.iastate.edu, nama-situs, news.google.com, ogimet.com, openalex.org, opencellid.org, ourairports.com, overturemaps.org, pemerintah ID, planetarycomputer.microsoft.com, pub.orcid.org, public.emdat.be, reliefweb.int, schemas.openxmlformats.org, seismicportal.eu, stac.eodc.eu, tiktok.com, tiles.openfreemap.org, trends.google.com, wa.me, webservices.volcano.si.edu, x, zenodo.org | http://a/1 | sambung_panen.mjs, ambang_persentil.py | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | laporan: 29; layar publik: 154; layar staf: 48; model/turunan: 64; worker: 11 | terpakai |
| `public/banjir/data/kejadian_aktif_awal.json` | BMKG, BNPB, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, globalfloods.eu | https://aset.lokal/banjir/data/kejadian_aktif_awal.json | kejadian_aktif.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 10; layar publik (nama tanpa .json): 1; model/turunan: 4; worker: 1 | terpakai |
| `public/banjir/data/kejadian_aktif_geo.json` | - | - | kejadian_aktif.py | banjir.yml cron 20 0 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/banjir/data/kejadian_aktif_nomor.json` | - | - | kejadian_aktif.py | banjir.yml cron 20 0 * * * | - | yatim |
| `public/banjir/data/kejadian_gunungapi_awal.json` | centurisk97.id | https://centurisk97.id/api/gempa/terbaru?jam=%d | saran_status.py, tugas.py | data.yml cron 20 14 * * *; lintas.yml cron 10 2 * * *; titik.yml cron  | layar publik: 1; model/turunan: 1 | terpakai |
| `public/banjir/data/kejadian_gunungapi_geo.json` | - | - | - | TIDAK ADA | - | yatim |
| `public/banjir/data/kejadian_gunungapi_nomor.json` | - | - | - | TIDAK ADA | - | yatim |
| `public/banjir/data/kering_peluang.json` | - | - | - | TIDAK ADA | layar publik: 2; model/turunan: 1 | statis |
| `public/banjir/data/koreksi_bias.json` | Open-Meteo | https://archive-api.open-meteo.com/v1/archive? | koreksi_bias.py | TIDAK ADA | model/turunan: 1; model/turunan (nama tanpa .json): 1 | tanpa-jadwal |
| `public/banjir/data/lab/**` | BMKG, BNPB, Copernicus, NASA, NASA FIRMS, NOAA, Open-Meteo, api.gdeltproject.org, centurisk97.id, data-api.globalforestwatch.org, data.eodc.eu, doi.org, esa-worldcover.s3.eu-central-1.amazonaws.com, flashwildfireservices.ca, global-hydrodynamics.github.io, goo.gl, jdih, mesonet.agron.iastate.edu, news.google.com, overturemaps.org, pemerintah ID, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, public.emdat.be, res.cloudinary.com, tohatsu.com, trends.google.com, x, zenodo.org | https://api.gdeltproject.org/api/v2/doc/doc? | grace.py, sambung_panen.mjs | banjir.yml cron 20 0 * * *; bersih_cache.yml cron 50 */3 * * * | 25 10 | laporan: 6; layar publik: 20; layar staf: 8; model/turunan: 17; worker: 1 | terpakai |
| `public/banjir/data/label_bersatu_ringkas.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/banjir/data/label_bersatu_v2_ringkas.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/banjir/data/label_kec_ringkas.json` | zenodo.org | https://zenodo.org/api/records/18647054/files/groundsource_2 | label_kec.py | TIDAK ADA | layar publik: 1 | tanpa-jadwal |
| `public/banjir/data/lampu_malam_validasi.json` | NASA, USGS, WorldPop, centurisk97.id | https://centurisk97.id | lampu_malam.py | TIDAK ADA | layar publik: 1 | tanpa-jadwal |
| `public/banjir/data/laporan.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, glad.earthengine.app, globalfloods.eu, hydrosheds.org, mesonet.agron.iastate.edu, sitrep.internal, wa.me, x | http://aset.lokal | laporan_banjir.py, prioritas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | laporan: 7; layar publik: 17; layar staf: 3; model/turunan: 9; worker: 1 | terpakai |
| `public/banjir/data/laporan_gunungapi.json` | - | - | - | TIDAK ADA | layar publik: 3; model/turunan: 1 | statis |
| `public/banjir/data/mcdwd.json` | NASA, Open-Meteo, centurisk97.id | https://centurisk97.id | mcdwd.py, mcdwd_model.py | banjir.yml cron 20 0 * * * | model/turunan: 2 | terpakai |
| `public/banjir/data/mcdwd_model.json` | Copernicus, Open-Meteo, centurisk97.id | https://centurisk97.id | ems.py, mcdwd_model.py | banjir.yml cron 20 0 * * * | - | yatim |
| `public/banjir/data/meta.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, centurisk97.terasurbannetwork.workers.dev, globalfloods.eu, live, sitrep.internal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | jaga_banjir.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 10; layar staf: 6; model/turunan: 14; peringatan: 1; worker: 2 | terpakai |
| `public/banjir/data/model_bahaya.json` | - | - | model_bahaya.py | TIDAK ADA | - | yatim |
| `public/banjir/data/outlook12.json` | BNPB | https://dibi.bnpb.go.id/ | outlook12.py | banjir.yml cron 20 0 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/paparan_kab.json` | - | - | dampak_kab.py, terbit.py | banjir.yml cron 20 0 * * *; prediksi.yml cron 50 1 * * * | - | yatim |
| `public/banjir/data/param_banjir.json` | - | - | - | TIDAK ADA | layar publik: 5 | statis |
| `public/banjir/data/pasang_astro.json` | BNPB | https://dibi.bnpb.go.id/ | pasang_astro.py, rob_presiden.py | banjir.yml cron 20 0 * * * | layar publik: 3; model/turunan: 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/banjir/data/pasut.json` | BMKG | https://maritim.bmkg.go.id/pasut | pasut.py | banjir.yml cron 20 0 * * * | layar publik: 2 | terpakai |
| `public/banjir/data/pasut_30h.json` | BMKG | https://maritim.bmkg.go.id/pasut | pasut.py | banjir.yml cron 20 0 * * * | layar publik: 2; model/turunan: 1; worker: 1 | terpakai |
| `public/banjir/data/peluang.json` | centurisk97.id, contoh.invalid | https://centurisk97.id | dampak_kab.py, peluang_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | layar publik: 10; model/turunan: 2 | terpakai |
| `public/banjir/data/peringatan.json` | BMKG, BNPB, JTWC, Open-Meteo, USGS, WorldPop, [^, aset.lokal, centurisk97.id, globalfloods.eu | https://[^ | laporan_banjir.py, peringatan.py | banjir.yml cron 20 0 * * *; lintas.yml cron 10 2 * * *; prediksi.yml c | layar publik: 8; model/turunan: 3; peringatan: 1; worker: 2 | terpakai |
| `public/banjir/data/peringatan_bmkg.json` | BMKG | https://www.bmkg.go.id/peringatan-dini/kekeringan-meteorolog | peringatan_bmkg.py | lintas.yml cron 10 2 * * * | layar publik: 1; model/turunan: 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/banjir/data/peringatan_bmkg_arsip.json` | BMKG | https://www.bmkg.go.id/peringatan-dini/kekeringan-meteorolog | peringatan_bmkg.py | lintas.yml cron 10 2 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/pos_pu.json` | - | - | bangun_pu.py | TIDAK ADA | layar publik: 1 | statis |
| `public/banjir/data/pos_sungai.json` | OpenStreetMap, centurisk97.id | https://centurisk97.id | pos_sungai.py | TIDAK ADA | layar publik: 1; model/turunan (nama tanpa .json): 2 | tanpa-jadwal |
| `public/banjir/data/posko.json` | BNPB | https://gis.bnpb.go.id/server/rest/services | posko.py, rob_presiden.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 1; layar publik: 8; layar staf: 3; model/turunan: 3 | terpakai |
| `public/banjir/data/prakiraan72.json` | - | - | prospektif.py, status.py | banjir.yml cron 20 0 * * * | layar publik: 3; model/turunan: 2 | terpakai |
| `public/banjir/data/prospektif.json` | NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast | m1_nilai.py, prospektif.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; m1_prospektif.y | layar publik: 4; worker: 1 | terpakai |
| `public/banjir/data/prospektif_abu.json` | - | - | rapor_belajar.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/banjir/data/prospektif_skor.json` | - | - | prospektif.py, rapor_belajar.py | banjir.yml cron 20 0 * * * | layar publik: 1 | terpakai |
| `public/banjir/data/pusat_kec.json` | *.openfreemap.org, BMKG, BNPB, JTWC, NASA, NASA FIRMS, Open-Meteo, OpenStreetMap, USGS, aset.lokal, centurisk97.id, wa.me | https://*.openfreemap.org | bukti_das.py, kejadian_aktif.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 13; layar publik (nama tanpa .json): 1; layar staf: 3; model/turunan: 29 | terpakai |
| `public/banjir/data/replay/**` | Open-Meteo, tiles.openfreemap.org | https://api.open-meteo.com/v1/forecast | tangki.py, replay.mjs | m1_prospektif.yml cron 30 15 * * * | 30 21 * * * | layar publik: 8; worker: 2 | terpakai |
| `public/banjir/data/risiko_kecamatan.json` | BNPB, Copernicus, centurisk97.id, doi.org, public.emdat.be | https://centurisk97.id/api/meja/ringkas | sambung_panen.mjs, uji_inarisk.py | direktori-bulanan.yml cron 0 1 3 * *; lintas.yml cron 10 2 * * *; titi | layar staf: 3; model/turunan: 3 | terpakai |
| `public/banjir/data/risiko_prioritas.json` | - | - | prioritas.py | lintas.yml cron 10 2 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * | | layar staf: 2; worker: 2 | terpakai |
| `public/banjir/data/risiko_ujibalik.json` | - | - | ujibalik_risiko.py, rapor_belajar.py | lintas.yml cron 10 2 * * * | layar staf: 1; model/turunan: 2 | terpakai |
| `public/banjir/data/riwayat.json` | BNPB, JMA/BMKG Himawari, Open-Meteo, centurisk97.id, contoh.invalid, dji.com, opengis.net | http://www.dji.com/wpmz/1.0.6 | riwayat.py, drone.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 6; model/turunan: 2 | terpakai |
| `public/banjir/data/riwayat_grid.json` | Open-Meteo, USGS, api.opentopodata.org | https://api.open-meteo.com/v1/elevation | faktor_kec.py, riwayat_grid.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 5; layar publik (nama tanpa .json): 1; layar staf: 1; model/turunan: 4; model/turunan (nama tanpa .json): 6 | terpakai |
| `public/banjir/data/riwayat_grid_longsor.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/banjir/data/rob.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu, ioc-sealevelmonitoring.org | https://dibi.bnpb.go.id/api/v1/chart/data | laporan_banjir.py, posko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 7; model/turunan: 6; peringatan: 1; worker: 1 | terpakai |
| `public/banjir/data/rob_presiden.json` | - | - | rob_presiden.py | banjir.yml cron 20 0 * * * | model/turunan (nama tanpa .json): 1 | terpakai |
| `public/banjir/data/seri_status.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu | https://inarisk.bnpb.go.id/ | kejadian_aktif.py, laporan_banjir.py | banjir.yml cron 20 0 * * * | layar publik: 3 | terpakai |
| `public/banjir/data/siaga_persentil_log.json` | - | - | siaga_persentil.py | banjir.yml cron 20 0 * * * | - | yatim |
| `public/banjir/data/status.json` | BMKG, BNPB, ESDM/PVMBG, Open-Meteo, WorldPop, [a-z0-9.-, cendana15.com, globalfloods.eu, magma, x | http://magma.vsi.esdm.go.id/x | bukti_das.py, hulu.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 10; layar staf: 4; model/turunan: 6; peringatan: 1; worker: 2 | terpakai |
| `public/banjir/data/subsiden_literatur.json` | Copernicus | https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_C | medan.py, subsiden.py | lintas.yml cron 10 2 * * * | layar publik: 2; model/turunan: 3 | terpakai |
| `public/banjir/data/sungai.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu | https://flood-api.open-meteo.com/v1/flood | kejadian_aktif.py, laporan_banjir.py | banjir.yml cron 20 0 * * * | layar publik: 5; model/turunan: 3 | terpakai |
| `public/banjir/data/terdampak.json` | - | - | terdampak.py | banjir.yml cron 20 0 * * * | layar publik: 1; layar staf: 1 | terpakai |
| `public/banjir/data/uji_inarisk.json` | - | - | uji_inarisk.py | TIDAK ADA | layar publik: 3 | statis |
| `public/banjir/data/unit_respons.json` | OpenStreetMap, centurisk97.id | https://centurisk97.id/api/gempa/terbaru?jam=%d | unit_respons.py, tugas.py | banjir.yml cron 20 0 * * *; lintas.yml cron 10 2 * * * | layar publik: 4 | terpakai |
| `public/banjir/data/validasi.json` | Open-Meteo | https://archive-api.open-meteo.com/v1/archive | ambang_persentil.py, ambang_wilayah.py | banjir.yml cron 20 0 * * * | layar publik: 3; model/turunan: 2 | terpakai |
| `public/banjir/data/wilayah_hari.json` | - | - | wilayah_hari.py | banjir.yml cron 20 0 * * * | layar publik: 1 | terpakai |
| `public/bnpb/data/kebakaran_31.json` | - | - | - | TIDAK ADA | layar staf: 2 | statis |
| `public/bnpb/data/kebakaran_geo_31.json` | - | - | - | TIDAK ADA | layar staf: 1 | statis |
| `public/cuaca/data/evakuasi_tsunami.json` | - | - | bangun_bnpb.py | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/cuaca/data/gerakan_tanah_pu.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/cuaca/data/jaringan_peringatan.json` | - | - | bangun_bnpb.py | TIDAK ADA | layar publik: 1 | statis |
| `public/cuaca/data/nama_siklon_tcwc.json` | - | - | - | TIDAK ADA | layar publik: 1 | statis |
| `public/data/akses.json` | flashwildfireservices.ca, powerequipment.honda.com.au, res.cloudinary.com, s3.amazonaws.com, tohatsu.com | https://powerequipment.honda.com.au/models/pumps/wb30 | insiden.py, kendala.py | data.yml cron 20 14 * * *; statis.yml cron 0 19 2 * *; titik.yml cron  | layar publik: 6; layar staf: 2; model/turunan: 3; worker: 2 | terpakai |
| `public/data/aktor_greenpeace.json` | greenpeace.org | https://www.greenpeace.org/indonesia/ | aktor_greenpeace.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/aktor_karhutla.json` | centurisk97.id, walhi.or.id | https://centurisk97.id/api/titik | aktor_sawit.py, aktor_walhi.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | laporan: 6; layar publik: 1; model/turunan: 2 | terpakai |
| `public/data/alert_tebang.json` | - | - | alert_tebang_model.py | data.yml cron 20 14 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/asap.json` | Open-Meteo | https://air-quality-api.open-meteo.com/v1/air-quality | model_kab_tanah.py, asap.py | data.yml cron 20 14 * * * | layar publik: 5; model/turunan: 5 | terpakai |
| `public/data/bahan_bakar.json` | dataforgood-fb-data.s3.amazonaws.com | https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsg | bahan_bakar.py | TIDAK ADA | - | yatim |
| `public/data/bahan_bakar_uji.json` | - | - | - | TIDAK ADA | - | yatim |
| `public/data/belum_kini.json` | - | - | peta_karhutla.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 2 | terpakai |
| `public/data/berita.json` | aset.lokal, mesonet.agron.iastate.edu, news.google.com, tiktok.com, tiles.openfreemap.org, wa.me, zenodo.org | http://aset.lokal/ | hubung.mjs, mutakhir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | layar publik: 4; model/turunan: 6; worker: 1 | terpakai |
| `public/data/berita_en.json` | news.google.com | https://news.google.com/_/DotsSplashUi/data/batchexecute | berita.py | data.yml cron 20 14 * * * | layar publik: 1 | terpakai |
| `public/data/bnpb.json` | BNPB, NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | harian.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | laporan: 1; layar publik: 3; model/turunan: 2 | terpakai |
| `public/data/bnpb/*.json` | *.openfreemap.org, BMKG, BNPB, Copernicus, ESDM/PVMBG, JTWC, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, WorldPop, akademisi.karya, akademisi.riset, api.openalex.org, aset.lokal, assets.stockbit.com, cache.lokal, centurisk97.id, contoh.invalid, doi.org, drive, drive.google.com, drive.google.com.evil.com, drive.usercontent.google.com, edge.stellardata.ai, glad.earthengine.app, google.com, hydrosheds.org, ioc-sealevelmonitoring.org, jdih, nama-situs, openalex.org, pemerintah ID, pub.orcid.org, public.emdat.be, s3.amazonaws.com, schemas.openxmlformats.org, server.arcgisonline.com, sitrep.internal, tiles.openfreemap.org, wa.me, webservices.volcano.si.edu | http://aset.lokal/ | lembaga_gabung.mjs, sambung_panen.mjs | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | laporan: 7; layar publik: 42; layar staf: 78; model/turunan: 50; peringatan: 3; worker: 18 | terpakai |
| `public/data/bnpb/desa/*.json` | *.openfreemap.org, BMKG, BNPB, Copernicus, ESDM/PVMBG, NASA FIRMS, Open-Meteo, OpenStreetMap, WorldPop, aset.lokal, centurisk97.id, commons.wikimedia.org, contoh.invalid, data.humdata.org, doi.org, drive, drive.google.com, drive.usercontent.google.com, google.com, nama-situs, news.google.com, pemerintah ID, planetarycomputer.microsoft.com, public.emdat.be, schemas.openxmlformats.org, wa.me, zenodo.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | kebutuhan.py, sambung_panen.mjs | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | laporan: 4; layar publik: 42; layar staf: 23; model/turunan: 44; worker: 4 | terpakai |
| `public/data/bnpb/desa_langganan/*.json` | - | - | logbook_turunan.py | TIDAK ADA | layar staf: 1 | statis |
| `public/data/bnpb/hukum/**` | BNPB, Copernicus, NASA FIRMS, NOAA, centurisk97.id, doi.org, esa-worldcover.s3.eu-central-1.amazonaws.com, jdih, news.google.com, pemerintah ID, public.emdat.be, walhi.or.id, x, zenodo.org | https://bnpb.go.id/storage/app/media/uploads | sambung_panen.mjs, hukum.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | laporan: 14; layar publik: 11; layar staf: 4; model/turunan: 7; worker: 5 | terpakai |
| `public/data/bpbd.json` | BNPB, OpenStreetMap, aset.lokal | https://aset.lokal/data/bpbd.json | lembaga_gabung.mjs, unit_respons.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | layar publik: 8; layar staf: 2; model/turunan: 3 | terpakai |
| `public/data/cari.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2 | statis |
| `public/data/citra.json` | NASA, e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com, earth-search.aws.element84.com, sentinel-cogs.s3.us-west-2.amazonaws.com | https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaw | citra.py, konsesi_citra.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3 | terpakai |
| `public/data/dampak.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu | https://inarisk.bnpb.go.id/ | dampak.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * * | layar publik: 7; model/turunan: 2; worker: 1 | terpakai |
| `public/data/dampak_kekeringan.json` | - | - | dampak.py | lintas.yml cron 10 2 * * * | layar publik: 3 | terpakai |
| `public/data/daops.json` | KLHK (SiPongi), OpenStreetMap | https://nominatim.openstreetmap.org/search?format=json&limit | akses_sippa.py, akses.py | data.yml cron 20 14 * * *; statis.yml cron 0 19 2 * * | laporan: 1; layar publik: 2; layar staf: 1; model/turunan: 4 | terpakai |
| `public/data/desa_cari.json` | BMKG | https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4= | ambang_persentil.py, siaga.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 1; layar staf: 1; model/turunan: 9 | terpakai |
| `public/data/dibi_kejadian.json` | Open-Meteo, api.ioda.inetintel.cc.gatech.edu, graph.mapillary.com, ioda.inetintel.cc.gatech.edu | https://api.ioda.inetintel.cc.gatech.edu/v2 | nilai.py, foto_dasar.py | data.yml cron 20 14 * * *; prediksi.yml cron 50 1 * * *; statis.yml cr | layar publik: 1; layar staf: 1; model/turunan: 14; model/turunan (nama tanpa .json): 2 | terpakai |
| `public/data/factsheet_karhutla.json` | - | - | - | TIDAK ADA | laporan: 9; layar publik: 3; layar publik (nama tanpa .json): 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/data/fasilitas.json` | BNPB, NASA FIRMS, Open-Meteo, OpenStreetMap, s3.amazonaws.com | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, bukti.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 9; model/turunan: 6 | terpakai |
| `public/data/foto_dasar.json` | graph.mapillary.com | https://graph.mapillary.com/images? | foto_dasar.py | statis.yml cron 0 19 2 * * | - | yatim |
| `public/data/fwi.json` | BNPB, NASA FIRMS, Open-Meteo, contoh.invalid | https://api.open-meteo.com/v1/forecast? | ansambel.py, harian.py | data.yml cron 20 14 * * *; lintas.yml cron 10 2 * * *; titik.yml cron  | layar publik: 2; layar staf: 1; model/turunan: 8; peringatan: 1; worker: 1 | terpakai |
| `public/data/fwi_ansambel.json` | Kemenhut, NASA FIRMS, Open-Meteo, OpenStreetMap, cwfis.cfs.nrcan.gc.ca, detik.com, finansial.bisnis.com, katadata.co.id, lpds.or.id, metrotvnews.com, nwcg.gov, pemerintah ID, publish.csiro.au, spherestandards.org | https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi | ansambel.py, operasi.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 3; layar staf: 2; model/turunan: 2 | terpakai |
| `public/data/gdelt.json` | api.gdeltproject.org, trends.google.com | https://api.gdeltproject.org/api/v2/doc/doc? | sinyal_sosial.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/geo/**` | BMKG, BNPB, Copernicus, ESDM/PVMBG, KLHK (SiPongi), NASA, NASA FIRMS, Open-Meteo, OpenStreetMap, USGS, WorldPop, api.gdeltproject.org, api.waqi.info, aset.lokal, centurisk97.id, data-api.globalforestwatch.org, data.eodc.eu, data.globalforestwatch.org, data.humdata.org, dataweb, docs, doi.org, earth-search.aws.element84.com, esa-worldcover.s3.eu-central-1.amazonaws.com, evil.example, flashwildfireservices.ca, graph.mapillary.com, ioc-sealevelmonitoring.org, mesonet.agron.iastate.edu, news.google.com, overturemaps.org, pemerintah ID, planetarycomputer.microsoft.com, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, public.emdat.be, res.cloudinary.com, rest.isric.org, s3.amazonaws.com, schemas.openxmlformats.org, tiles.openfreemap.org, tohatsu.com, trends.google.com, zenodo.org | http://schemas.openxmlformats.org/spreadsheetml/2006/main | sambung_panen.mjs, bahaya.py | arsip-bmkg.yml cron 25 */3 * * *; bangunan.yml cron 30 20 3 * * | 30 8 | laporan: 5; layar publik: 59; layar staf: 12; model/turunan: 53; worker: 1 | terpakai |
| `public/data/gerbang_model.json` | - | - | gerbang.py, jejak.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 4; model/turunan: 1; peringatan: 1 | terpakai |
| `public/data/harga_komoditas.json` | - | - | uji_harga_sawit.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/harian30.json` | pemerintah ID | https://prims.brgm.go.id | harian30.py, harian_panjang.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 1 | terpakai |
| `public/data/harian_panjang.json` | - | - | harian_panjang.py | data.yml cron 20 14 * * * | layar publik: 1 | terpakai |
| `public/data/hgu_api.json` | - | - | hgu_api.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | - | yatim |
| `public/data/himawari.json` | *.openfreemap.org, aset.lokal, flashwildfireservices.ca, powerequipment.honda.com.au, res.cloudinary.com, tohatsu.com, wa.me | https://*.openfreemap.org | himawari.py, taktik.py | data.yml cron 20 14 * * *; himawari.yml cron 7,37 * * * *; titik.yml c | layar publik: 1; model/turunan: 1; peringatan: 1; worker: 2 | terpakai |
| `public/data/hotspot.json` | BNPB, ESDM/PVMBG, NASA FIRMS, Open-Meteo, aset.lokal, centurisk97.id, centurisk97.terasurbannetwork.workers.dev, contoh.invalid, pemerintah ID | https://api.open-meteo.com/v1/forecast | firms_sumber.py, harian.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 9; model/turunan: 6 | terpakai |
| `public/data/hotspot24.json` | BNPB, NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, insiden.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 4; layar staf: 1; model/turunan: 1; worker: 1 | terpakai |
| `public/data/hotspot72.json` | BNPB, Copernicus, NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, slstr_malam.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; layar staf: 1; model/turunan: 2; worker: 2 | terpakai |
| `public/data/iklim.json` | NASA, NOAA, Open-Meteo, iridl.ldeo.columbia.edu | https://archive-api.open-meteo.com/v1/archive? | deret.py, iklim.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 4; model/turunan: 3 | terpakai |
| `public/data/iklim_outlook.json` | BNPB, NOAA, iridl.ldeo.columbia.edu | https://dibi.bnpb.go.id/ | iklim_outlook.py, outlook12.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * * | layar publik: 1; layar staf: 1; layar staf (nama tanpa .json): 1; model/turunan: 2; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/data/iklim_stasiun.json` | NOAA | https://www.ncei.noaa.gov/pub/data/ghcn/daily/ | iklim_stasiun.py | statis.yml cron 0 19 2 * * | - | yatim |
| `public/data/inarisk.json` | BNPB | https://gis.bnpb.go.id/server/rest/services | bnpb_gis.py | data.yml cron 20 14 * * * | layar publik: 1 | terpakai |
| `public/data/internet_padam.json` | api.ioda.inetintel.cc.gatech.edu, ioda.inetintel.cc.gatech.edu | https://api.ioda.inetintel.cc.gatech.edu/v2 | internet_padam.py | data.yml cron 20 14 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/kabar/*.json` | *.openfreemap.org, aset.lokal, centurisk97.id, google.com, news.google.com, wa.me | https://*.openfreemap.org | berita.py, kabar_kab.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 20; layar staf: 9; model/turunan: 5; peringatan: 2; worker: 4 | terpakai |
| `public/data/kalibrasi_wilayah.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/kanal.json` | - | - | insiden.py, kendala.py | data.yml cron 20 14 * * *; statis.yml cron 0 19 2 * *; titik.yml cron  | layar publik: 5; model/turunan: 8; worker: 1 | terpakai |
| `public/data/kanal/*.json` | BMKG, NASA, OpenStreetMap, api.opentopodata.org, aset.lokal, bing.com, cache.lokal, centurisk97.id, commons.wikimedia.org, developers.google.com, download.geofabrik.de, e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com, earth-search.aws.element84.com, flashwildfireservices.ca, google.com, index.commoncrawl.org, mesonet.agron.iastate.edu, news.google.com, openai.com, pemerintah ID, perplexity.ai, powerequipment.honda.com.au, res.cloudinary.com, s3.amazonaws.com, search.developer.apple.com, sentinel-cogs.s3.us-west-2.amazonaws.com, tiktok.com, tohatsu.com | https://api.opentopodata.org/v1/srtm90m?locations= | pos_sungai.py, berita.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan-pakar | laporan: 6; layar publik: 27; layar staf: 15; model/turunan: 24; worker: 6 | terpakai |
| `public/data/karhutla_belum_lapor.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/data/kawasan_cari.json` | - | - | - | TIDAK ADA | layar publik: 2; model/turunan: 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/data/kejadian/*.json` | *.openfreemap.org, BMKG, BNPB, Copernicus, ECMWF, ESDM/PVMBG, JTWC, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [a-z0-9.-, a, akademisi.karya, akademisi.riset, api.gdeltproject.org, api.ioda.inetintel.cc.gatech.edu, api.openalex.org, api.opentopodata.org, api.reliefweb.int, aset.lokal, cendana15.com, centurisk97.id, contoh.invalid, data.chc.ucsb.edu, data.eodc.eu, davidmegginson.github.io, disasterscharter.org, doi.org, drive, drive.google.com, drive.usercontent.google.com, glad.earthengine.app, globalfloods.eu, graph.mapillary.com, hydrosheds.org, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, magma, mesonet.agron.iastate.edu, nama-situs, news.google.com, ogimet.com, openalex.org, opencellid.org, ourairports.com, overturemaps.org, pemerintah ID, planetarycomputer.microsoft.com, pub.orcid.org, public.emdat.be, reliefweb.int, schemas.openxmlformats.org, seismicportal.eu, stac.eodc.eu, tiktok.com, tiles.openfreemap.org, trends.google.com, wa.me, webservices.volcano.si.edu, x, zenodo.org | http://a/1 | sambung_panen.mjs, ambang_persentil.py | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | laporan: 29; layar publik: 154; layar staf: 48; model/turunan: 64; worker: 11 | terpakai |
| `public/data/kekeringan_bnpb.json` | BNPB, drive, drive.google.com, drive.google.com.evil.com | http://drive.google.com/x | bukti.py, dampak.py | lintas.yml cron 10 2 * * * | layar publik (nama tanpa .json): 1 | terpakai |
| `public/data/kekeringan_bukti.json` | - | - | bukti.py | lintas.yml cron 10 2 * * * | layar publik: 1; layar publik (nama tanpa .json): 1 | terpakai |
| `public/data/kekeringan_grid.json` | - | - | bukti.py, posko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3; model/turunan: 1 | terpakai |
| `public/data/kekeringan_hth.json` | Open-Meteo, centurisk97.id, contoh.invalid | https://api.open-meteo.com/v1/forecast?latitude={lat | hth.py, uji_rantai.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/data/kekeringan_laporan.json` | BMKG, NASA, Open-Meteo, sitrep.internal | https://open-meteo.com/en/docs | laporan.py, uji_rantai.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3; layar staf: 1; model/turunan: 1 | terpakai |
| `public/data/kekeringan_meta.json` | - | - | bayangan.py, bukti.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3; model/turunan: 3; worker: 1 | terpakai |
| `public/data/kekeringan_neraca.json` | NASA | https://power.larc.nasa.gov/api/temporal/monthly/point?param | hindcast.py, neraca.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/kekeringan_padi.json` | BMKG, NASA, Open-Meteo | https://open-meteo.com/en/docs | laporan.py, uji_rantai.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/data/kekeringan_prakiraan.json` | BMKG, NASA, NOAA, Open-Meteo | https://open-meteo.com/en/docs | laporan.py, peluang_kering.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik (nama tanpa .json): 2 | terpakai |
| `public/data/kekeringan_prospektif.json` | - | - | rapor_belajar.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/kekeringan_resmi.json` | BNPB, drive, drive.google.com, drive.google.com.evil.com | http://drive.google.com/x | resmi.py | lintas.yml cron 10 2 * * * | layar publik (nama tanpa .json): 1 | terpakai |
| `public/data/kekeringan_riwayat.json` | - | - | riwayat.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/data/kekeringan_tren.json` | - | - | status.py | lintas.yml cron 10 2 * * * | layar publik: 1 | terpakai |
| `public/data/kekeringan_ujibalik.json` | NASA | https://power.larc.nasa.gov/api/temporal/daily/point?paramet | ambang.py, ambang2.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 3 | terpakai |
| `public/data/kekeringan_wilayah.json` | BMKG, NASA, Open-Meteo, centurisk97.id | https://centurisk97.id/api/gempa/terbaru?jam=%d | bayangan.py, dampak.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 3 | terpakai |
| `public/data/kemenhut/terbakar_2025/*.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/kemenhut/terbakar_2026/*.json` | - | - | - | TIDAK ADA | - | yatim |
| `public/data/kemitraan/daerah/*.json` | *.openfreemap.org, BNPB, Copernicus, KLHK (SiPongi), OpenStreetMap, aset.lokal, commons.wikimedia.org, doi.org, google.com, news.google.com, pemerintah ID, planetarycomputer.microsoft.com, public.emdat.be, wa.me | http://aset.lokal | sambung_panen.mjs, bukti_das.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; direktori-bulan | laporan: 21; layar publik: 30; layar staf: 27; model/turunan: 19; worker: 6 | terpakai |
| `public/data/kemitraan/kode.json` | - | - | kode.py, profil_daerah.py | data.yml cron 20 14 * * *; kemitraan-pakar.yml cron 0 3 2 * *; kemitra | layar staf: 2; model/turunan: 5 | terpakai |
| `public/data/kemitraan/kode_gagal.json` | - | - | kode.py | kemitraan.yml cron 30 2 * * * | model/turunan (nama tanpa .json): 3 | terpakai |
| `public/data/kemitraan/pertanyaan.json` | - | - | kemitraan_masalah.js | TIDAK ADA | layar staf: 3; model/turunan: 1 | statis |
| `public/data/kemitraan/prov/*.json` | , *.openfreemap.org, BMKG, BNPB, Copernicus, ECMWF, ESDM/PVMBG, JTWC, KLHK (SiPongi), Kemenhut, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [^, [a-z0-9.-, adb.org, akademisi.karya, akademisi.riset, api.gdeltproject.org, api.ioda.inetintel.cc.gatech.edu, api.openalex.org, api.opentopodata.org, api.resend.com, api.waqi.info, arcgis.com, aset.lokal, aviationweather.gov, cendana15.com, centurisk97.id, contoh.invalid, cwfis.cfs.nrcan.gc.ca, d-portal.org, data-api.globalforestwatch.org, data.eodc.eu, data.globalforestwatch.org, dataweb, davidmegginson.github.io, detik.com, docs, doi.org, download.geofabrik.de, drive, drive.google.com, drive.google.com.evil.com, drive.usercontent.google.com, earth-search.aws.element84.com, esa-worldcover.s3.eu-central-1.amazonaws.com, finansial.bisnis.com, flashwildfireservices.ca, geodesy.unr.edu, glad.earthengine.app, globalfloods.eu, google.com, graph.mapillary.com, greenpeace.org, hydrosheds.org, instagram.com, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, jica.go.jp, katadata.co.id, lpds.or.id, magma, mesonet.agron.iastate.edu, metrotvnews.com, nama-situs, news.google.com, nwcg.gov, openalex.org, opencellid.org, ourairports.com, overturemaps.org, pemerintah ID, planetarycomputer.microsoft.com, platform.twitter.com, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, pub.orcid.org, public.emdat.be, publish.csiro.au, publish.twitter.com, res.cloudinary.com, resources.trase.earth, rest.isric.org, s3.amazonaws.com, schemas.openxmlformats.org, search.worldbank.org, server.arcgisonline.com, sites.research.google, sitrep.internal, spherestandards.org, stac.eodc.eu, threads.com, tiktok.com, tiles.openfreemap.org, tohatsu.com, trase.earth, trends.google.com, wa.me, walhi.or.id, x, x.com, zenodo.org | http://aset.lokal | deret.py, iklim.py | arsip-bmkg.yml cron 25 */3 * * *; bangunan.yml cron 30 20 3 * * | 30 8 | laporan: 28; layar publik: 162; layar staf: 93; model/turunan: 101; worker: 14 | terpakai |
| `public/data/kemitraan/ringkas.json` | NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast | hasil.py, neraca.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 1; layar staf: 2; worker: 1 | terpakai |
| `public/data/kemitraan/uji_cocok.json` | - | - | uji_cocok.py | kemitraan-pakar.yml cron 0 3 2 * * | model/turunan: 1 | terpakai |
| `public/data/kendala.json` | flashwildfireservices.ca, powerequipment.honda.com.au, res.cloudinary.com, tohatsu.com | https://powerequipment.honda.com.au/models/pumps/wb30 | insiden.py, kendala.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar staf: 5; model/turunan: 4 | terpakai |
| `public/data/keputusan.json` | - | - | keputusan.py | data.yml cron 20 14 * * * | layar publik: 6; model/turunan: 1 | terpakai |
| `public/data/khg_hari.json` | pemerintah ID | https://prims.brgm.go.id | khg_prioritas.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/khg_prioritas.json` | pemerintah ID | https://prims.brgm.go.id | khg_prioritas.py | data.yml cron 20 14 * * * | layar publik: 1; layar staf: 1; model/turunan: 2; model/turunan (nama tanpa .json): 2 | terpakai |
| `public/data/kluster.json` | BNPB, Kemenhut, NASA FIRMS, Open-Meteo, OpenStreetMap, centurisk97.terasurbannetwork.workers.dev, cwfis.cfs.nrcan.gc.ca, detik.com, finansial.bisnis.com, flashwildfireservices.ca, katadata.co.id, live, lpds.or.id, metrotvnews.com, nwcg.gov, pemerintah ID, powerequipment.honda.com.au, publish.csiro.au, res.cloudinary.com, spherestandards.org, tohatsu.com | http://live | kebutuhan.py, bnpb_gis.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 5; layar staf: 3; model/turunan: 12; worker: 1 | terpakai |
| `public/data/kluster_awal.json` | BNPB, Copernicus, NASA FIRMS, Open-Meteo, aset.lokal | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, slstr_malam.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 5; layar staf: 3; model/turunan: 1 | terpakai |
| `public/data/kluster_geo.json` | BNPB, NASA FIRMS, Open-Meteo, aset.lokal | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, splice_ops.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1 | terpakai |
| `public/data/kluster_hari/**` | BNPB, NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | harian.py, peta_karhutla.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/kompleks_konsesi.json` | - | - | konsesi_kompleks.py, zona.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 6; layar publik: 6; layar staf: 1; model/turunan: 2 | terpakai |
| `public/data/konsesi2026/*.json` | *.openfreemap.org, NASA FIRMS, api.resend.com, aset.lokal, data.globalforestwatch.org, planetarycomputer.microsoft.com, schemas.openxmlformats.org, wa.me, zenodo.org | http://schemas.openxmlformats.org/spreadsheetml/2006/main | aktor_sawit.py, konsesi_laporan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 8; layar publik: 5; layar staf: 3; model/turunan: 6; worker: 3 | terpakai |
| `public/data/kontak.json` | - | - | - | TIDAK ADA | layar publik: 3; layar staf: 1; worker: 1 | statis |
| `public/data/kumulatif.json` | contoh.invalid | https://contoh.invalid/ | kumulatif.py, riset.js | data.yml cron 20 14 * * * | layar publik: 2; worker: 1 | terpakai |
| `public/data/lab/**` | BMKG, BNPB, Copernicus, NASA, NASA FIRMS, NOAA, Open-Meteo, api.gdeltproject.org, centurisk97.id, data-api.globalforestwatch.org, data.eodc.eu, doi.org, esa-worldcover.s3.eu-central-1.amazonaws.com, flashwildfireservices.ca, global-hydrodynamics.github.io, goo.gl, jdih, mesonet.agron.iastate.edu, news.google.com, overturemaps.org, pemerintah ID, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, public.emdat.be, res.cloudinary.com, tohatsu.com, trends.google.com, x, zenodo.org | https://api.gdeltproject.org/api/v2/doc/doc? | grace.py, sambung_panen.mjs | banjir.yml cron 20 0 * * *; bersih_cache.yml cron 50 */3 * * * | 25 10 | laporan: 6; layar publik: 20; layar staf: 8; model/turunan: 17; worker: 1 | terpakai |
| `public/data/lahan/pippib/*.json` | - | - | bangun_lapisan_kemenhut.py | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/data/laphar_riwayat.json` | - | - | laphar_arsip.py | lintas.yml cron 10 2 * * * | model/turunan: 2 | terpakai |
| `public/data/lapisan_tambahan.json` | - | - | - | TIDAK ADA | layar publik: 7 | statis |
| `public/data/laporan.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, glad.earthengine.app, globalfloods.eu, hydrosheds.org, mesonet.agron.iastate.edu, sitrep.internal, wa.me, x | http://aset.lokal | laporan_banjir.py, prioritas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | laporan: 7; layar publik: 17; layar staf: 3; model/turunan: 9; worker: 1 | terpakai |
| `public/data/logbook_kejadian.json` | drive, drive.google.com, drive.usercontent.google.com, schemas.openxmlformats.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | siaga_persentil.py, uji_logbook_karhutla.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * * | model/turunan: 8; model/turunan (nama tanpa .json): 15 | terpakai |
| `public/data/logbook_riwayat.json` | - | - | perencanaan.py, langganan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 6; layar staf: 2; model/turunan: 3; model/turunan (nama tanpa .json): 1; worker: 1 | terpakai |
| `public/data/logistik.json` | overturemaps.org | https://overturemaps.org | logistik.py | statis.yml cron 0 19 2 * * | - | yatim |
| `public/data/logpal/**` | aset.lokal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | impor.mjs, logpal.js | TIDAK ADA | layar publik: 1; layar staf: 2; worker: 1 | tanpa-jadwal |
| `public/data/luas_resmi.json` | Copernicus, KLHK (SiPongi), contoh.invalid | https://contoh.invalid/ | insiden.py, kumulatif.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 2; layar staf: 2; model/turunan: 5; model/turunan (nama tanpa .json): 2 | terpakai |
| `public/data/luas_satelit.json` | Copernicus, KLHK (SiPongi) | https://cprof.effis.emergency.copernicus.eu/api/v3 | insiden.py, laporan.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; model/turunan: 3; model/turunan (nama tanpa .json): 2 | terpakai |
| `public/data/medsos_tiktok.json` | - | - | tiktok.py | lintas.yml cron 10 2 * * * | model/turunan: 1 | terpakai |
| `public/data/menara.json` | opencellid.org | https://opencellid.org | menara.py | statis.yml cron 0 19 2 * * | layar publik: 1 | terpakai |
| `public/data/meta.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, centurisk97.terasurbannetwork.workers.dev, globalfloods.eu, live, sitrep.internal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | jaga_banjir.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 10; layar staf: 6; model/turunan: 14; peringatan: 1; worker: 2 | terpakai |
| `public/data/metar.json` | BMKG, Open-Meteo, api.waqi.info, aviationweather.gov, mesonet.agron.iastate.edu | https://air-quality-api.open-meteo.com/data/cams_global/stat | metar.py, metar.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; jarak_pandang.y | layar publik: 5; model/turunan: 2 | terpakai |
| `public/data/mitra.json` | - | - | - | TIDAK ADA | layar publik: 1 | statis |
| `public/data/model_sebaran.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | gerbang.py, jejak.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 5; model/turunan: 5; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/data/musim.json` | Open-Meteo | https://archive-api.open-meteo.com/v1/archive?latitude={c[ | kebutuhan.py, musim.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 10; layar publik: 2; layar staf: 1; model/turunan: 1 | terpakai |
| `public/data/musim_awal.json` | - | - | ringkasan.py, musim_awal.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 3; layar staf (nama tanpa .json): 1; model/turunan (nama tanpa .json): 2 | terpakai |
| `public/data/musim_harian.json` | pemerintah ID | https://prims.brgm.go.id | kebutuhan.py, harian30.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 3; worker: 1 | terpakai |
| `public/data/neraca_air/**` | NASA | https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus | deret.py, grace.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | model/turunan: 5 | terpakai |
| `public/data/operasi.json` | Kemenhut, NASA FIRMS, OpenStreetMap, cwfis.cfs.nrcan.gc.ca, detik.com, finansial.bisnis.com, flashwildfireservices.ca, katadata.co.id, lpds.or.id, metrotvnews.com, nwcg.gov, pemerintah ID, powerequipment.honda.com.au, publish.csiro.au, res.cloudinary.com, spherestandards.org, tohatsu.com | https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi | kebutuhan.py, kendala.py | data.yml cron 20 14 * * *; lintas.yml cron 10 2 * * *; titik.yml cron  | layar publik: 1; layar staf: 2; model/turunan: 6; worker: 1 | terpakai |
| `public/data/operasi/**` | Kemenhut, NASA FIRMS, OpenStreetMap, aset.lokal, centurisk97.id, cwfis.cfs.nrcan.gc.ca, detik.com, finansial.bisnis.com, flashwildfireservices.ca, katadata.co.id, lpds.or.id, metrotvnews.com, nwcg.gov, pemerintah ID, powerequipment.honda.com.au, publish.csiro.au, res.cloudinary.com, spherestandards.org, tiles.openfreemap.org, tohatsu.com, wa.me, x | http://aset.lokal/ | saluran.py, kebutuhan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 22; layar publik: 29; layar staf: 25; model/turunan: 11; worker: 8 | terpakai |
| `public/data/operasi_resmi.json` | - | - | laporan.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | laporan: 1; layar publik: 3; layar publik (nama tanpa .json): 1; model/turunan: 1 | terpakai |
| `public/data/osm/**` | BNPB, NASA FIRMS, Open-Meteo, OpenStreetMap, centurisk97.id, davidmegginson.github.io, download.geofabrik.de, pemerintah ID, s3.amazonaws.com, tiles.openfreemap.org, zenodo.org | https://api.open-meteo.com/v1/forecast?latitude= | gedung.py, mesin.mjs | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; genangan_j4.yml | layar publik: 8; layar staf: 1; model/turunan: 13 | terpakai |
| `public/data/osm_nasional/*.json` | - | - | osm_nasional.py | statis.yml cron 0 19 2 * * | layar publik: 1; model/turunan: 2 | terpakai |
| `public/data/pabrik_sawit.json` | - | - | - | TIDAK ADA | laporan: 1; layar publik: 1; model/turunan: 2 | statis |
| `public/data/paparan_templat.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/data/peluang.json` | centurisk97.id, contoh.invalid | https://centurisk97.id | dampak_kab.py, peluang_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | layar publik: 10; model/turunan: 2 | terpakai |
| `public/data/penduduk.json` | BMKG, BNPB, Copernicus, NASA, Open-Meteo, WorldPop, centurisk97.id, pemerintah ID | https://air-quality-api.open-meteo.com/v1/air-quality | dampak_kab.py, kedalaman_genangan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 12; model/turunan: 21 | terpakai |
| `public/data/penerbangan.json` | mesonet.agron.iastate.edu | https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py? | penerbangan.py, ringkasan.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 2 | terpakai |
| `public/data/peringatan.json` | BMKG, BNPB, JTWC, Open-Meteo, USGS, WorldPop, [^, aset.lokal, centurisk97.id, globalfloods.eu | https://[^ | laporan_banjir.py, peringatan.py | banjir.yml cron 20 0 * * *; lintas.yml cron 10 2 * * *; prediksi.yml c | layar publik: 8; model/turunan: 3; peringatan: 1; worker: 2 | terpakai |
| `public/data/persentil_fwi.json` | - | - | - | TIDAK ADA | model/turunan: 2 | statis |
| `public/data/peta_karhutla.json` | - | - | peta_karhutla.py, rasio_n20_n.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 4; layar publik (nama tanpa .json): 5; layar staf (nama tanpa .json): 1; model/turunan (nama tanpa .json): 4; worker: 1 | terpakai |
| `public/data/peta_karhutla_kab.json` | - | - | peta_karhutla.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 2; layar publik (nama tanpa .json): 2; layar staf: 1; worker: 1 | terpakai |
| `public/data/peta_karhutla_wil.json` | - | - | - | TIDAK ADA | layar publik (nama tanpa .json): 1; model/turunan: 1 | statis |
| `public/data/posko.json` | BNPB | https://gis.bnpb.go.id/server/rest/services | posko.py, rob_presiden.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | laporan: 1; layar publik: 8; layar staf: 3; model/turunan: 3 | terpakai |
| `public/data/posko_kekeringan.json` | - | - | posko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3 | terpakai |
| `public/data/presiden/**` | aset.lokal, news.google.com, tiles.openfreemap.org, wa.me | http://aset.lokal/ | berita.py, laporan.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | laporan: 5; layar publik: 7; layar staf: 1; model/turunan: 5; worker: 1 | terpakai |
| `public/data/preventif.json` | Kemenhut, NASA FIRMS, OpenStreetMap, cwfis.cfs.nrcan.gc.ca, detik.com, finansial.bisnis.com, katadata.co.id, lpds.or.id, metrotvnews.com, nwcg.gov, pemerintah ID, publish.csiro.au, spherestandards.org | https://cwfis.cfs.nrcan.gc.ca/background/summary/fwi | operasi.py, preventif.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 2; model/turunan: 1 | terpakai |
| `public/data/prioritas_uji.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/prospektif.json` | NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast | m1_nilai.py, prospektif.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; m1_prospektif.y | layar publik: 4; worker: 1 | terpakai |
| `public/data/prospektif_historis.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | gerbang.py, prospektif.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 1 | terpakai |
| `public/data/ps.json` | pemerintah ID | https://geoportal.planologi.kehutanan.go.id/server/rest/serv | ps.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | - | yatim |
| `public/data/reliefweb.json` | a, api.reliefweb.int, reliefweb.int | http://a/1 | reliefweb.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/ringkasan.json` | Open-Meteo, schemas.openxmlformats.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | logbook_bersih.py, logbook_pusdalops.py | data.yml cron 20 14 * * *; lintas.yml cron 10 2 * * *; titik.yml cron  | layar publik: 1 | terpakai |
| `public/data/risiko_mingguan_uji.json` | NASA, NASA FIRMS | https://firms.modaps.eosdis.nasa.gov/api | risiko_mingguan.py, risiko_produksi.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/riwayat_desa/**` | - | - | riwayat_wilayah.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/data/riwayat_grid.json` | Open-Meteo, USGS, api.opentopodata.org | https://api.open-meteo.com/v1/elevation | faktor_kec.py, riwayat_grid.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 5; layar publik (nama tanpa .json): 1; layar staf: 1; model/turunan: 4; model/turunan (nama tanpa .json): 6 | terpakai |
| `public/data/riwayat_hierarki.json` | - | - | riwayat_sel.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/riwayat_langganan.json` | - | - | riwayat_sel.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/data/riwayat_sel/*.json` | centurisk97.terasurbannetwork.workers.dev, live | http://live | hgu_api.py, riwayat_sel.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 5 | terpakai |
| `public/data/riwayat_sel_uji.json` | - | - | riwayat_sel.py, watak_kluster.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1 | terpakai |
| `public/data/riwayat_wilayah/*.json` | - | - | riwayat_wilayah.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3; model/turunan: 2 | terpakai |
| `public/data/saran_status.json` | - | - | - | TIDAK ADA | layar publik: 2; model/turunan: 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/data/sebaran_cerita.json` | - | - | cerita_data.py | TIDAK ADA | layar publik: 1 | statis |
| `public/data/sebaran_galat.json` | - | - | galat.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 1 | terpakai |
| `public/data/sebaran_kasus.json` | - | - | gerbang.py, kasus.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 2; model/turunan: 1 | terpakai |
| `public/data/sebaran_pendorong.json` | api.opentopodata.org | https://api.opentopodata.org/v1/srtm90m?locations= | pendorong.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * * | layar publik: 2 | terpakai |
| `public/data/sejarah.json` | - | - | insiden.py, laporan.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | laporan: 7; layar publik: 4; model/turunan: 9 | terpakai |
| `public/data/sejarah_modis.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 3 | statis |
| `public/data/sekolah.json` | BNPB, OpenStreetMap, s3.amazonaws.com, schemas.openxmlformats.org | http://schemas.openxmlformats.org/spreadsheetml/2006/main | sekolah.py, bukti.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 6; model/turunan: 6 | terpakai |
| `public/data/senyap.json` | - | - | - | TIDAK ADA | layar staf: 1; model/turunan: 1 | statis |
| `public/data/silang_dibi_logbook.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/sinyal_sosial.json` | api.gdeltproject.org, trends.google.com | https://api.gdeltproject.org/api/v2/doc/doc? | sinyal_sosial.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/sk_drive.json` | BNPB | https://data.bnpb.go.id/api/3/action/ | status_darurat.py | data.yml cron 20 14 * * * | - | yatim |
| `public/data/slstr_malam.json` | Copernicus | https://catalogue.dataspace.copernicus.eu/odata/v1/Products | slstr_malam.py | TIDAK ADA | - | yatim |
| `public/data/sosmed.json` | poskokarhutla.terasurbannetwork.workers.dev | https://poskokarhutla.terasurbannetwork.workers.dev | sosmed.py | data.yml cron 20 14 * * * | layar publik: 1 | terpakai |
| `public/data/status_darurat.json` | - | - | laphar_arsip.py, saran_status.py | data.yml cron 20 14 * * *; lintas.yml cron 10 2 * * *; titik.yml cron  | layar publik: 7; layar staf: 1; layar staf (nama tanpa .json): 7; model/turunan: 2; model/turunan (nama tanpa .json): 8 | terpakai |
| `public/data/tambang.json` | ESDM/PVMBG | https://geoportal.esdm.go.id/gis1/rest/services/ | tambang.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | - | yatim |
| `public/data/tanah.json` | Copernicus, NASA, Open-Meteo, esa-worldcover.s3.eu-central-1.amazonaws.com, maps.isric.org, opengis.net, rest.isric.org | http://www.opengis.net/def/crs/EPSG/0/4326 | fitur_banjir.py, tanah.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 6 | terpakai |
| `public/data/tim.json` | - | - | - | TIDAK ADA | layar publik: 1 | statis |
| `public/data/titik24.json` | - | - | titik24.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 3; layar staf: 2; model/turunan: 2; worker: 2 | terpakai |
| `public/data/titik_hari/*.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | belum_lapor.py, ringkasan.py | data.yml cron 20 14 * * *; prediksi.yml cron 50 1 * * *; titik.yml cro | layar publik: 3; model/turunan: 5 | terpakai |
| `public/data/titik_palsu.json` | NASA FIRMS, aset.lokal, zenodo.org | https://aset.lokal | peta_karhutla.py, titik_palsu.py | titik.yml cron 40 */3 * * * | 10 9 * * * | 55 22 * * *; titik_palsu.ym | layar publik (nama tanpa .json): 1; layar staf: 2; model/turunan: 2; model/turunan (nama tanpa .json): 14 | terpakai |
| `public/data/titik_tahun.json` | - | - | laporan.py, titik_tahun.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 2; layar staf (nama tanpa .json): 2; model/turunan (nama tanpa .json): 6; worker: 1 | terpakai |
| `public/data/tle.json` | celestrak.org, centurisk97.id, x | https://celestrak.org/NORAD/elements/gp.php?CATNR={ | tle.py | data.yml cron 20 14 * * * | layar publik: 3 | terpakai |
| `public/data/tmat.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/transisi_lahan.json` | - | - | lab_mapbiomas.py | TIDAK ADA | - | yatim |
| `public/data/tren_karhutla.json` | - | - | musim_awal.py | TIDAK ADA | layar publik: 1 | statis |
| `public/data/udara.json` | mesonet.agron.iastate.edu | https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py? | penerbangan.py | data.yml cron 20 14 * * * | layar publik: 1; model/turunan: 4 | terpakai |
| `public/data/udara_dampak.json` | - | - | dampak_udara.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | model/turunan: 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/data/udara_kualitas.json` | flashwildfireservices.ca, powerequipment.honda.com.au, res.cloudinary.com, tohatsu.com | https://powerequipment.honda.com.au/models/pumps/wb30 | taktik.py, kualitas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; layar publik (nama tanpa .json): 1; model/turunan: 1; model/turunan (nama tanpa .json): 1; worker: 1 | terpakai |
| `public/data/udara_kualitas_riwayat.json` | Open-Meteo | https://air-quality-api.open-meteo.com/v1/air-quality | isi_riwayat.py, kualitas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | model/turunan: 2 | terpakai |
| `public/data/udara_rekom.json` | - | - | udara_rekom.py | data.yml cron 20 14 * * * | layar publik: 3 | terpakai |
| `public/data/ujibalik_firespot.json` | - | - | ujibalik_firespot.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; model/turunan: 1 | terpakai |
| `public/data/ujibanding_firespot.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1; model/turunan (nama tanpa .json): 1 | statis |
| `public/data/ujiluas_dnbr.json` | - | - | ujiluas_dnbr.py | TIDAK ADA | model/turunan (nama tanpa .json): 1 | statis |
| `public/data/ujiluas_kab.json` | - | - | - | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/validasi_logbook_banjir.json` | - | - | rapor_belajar.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/validasi_logbook_banjir_arsip.json` | - | - | uji_logbook.py | data.yml cron 20 14 * * * | - | arsip |
| `public/data/validasi_logbook_karhutla.json` | - | - | rapor_belajar.py | TIDAK ADA | model/turunan: 1 | statis |
| `public/data/validasi_logbook_karhutla_arsip.json` | - | - | - | TIDAK ADA | model/turunan: 1 | arsip |
| `public/data/validasi_logbook_longsor.json` | - | - | - | TIDAK ADA | model/turunan: 2 | statis |
| `public/data/validasi_logbook_longsor_arsip.json` | - | - | - | TIDAK ADA | model/turunan: 1 | arsip |
| `public/data/video.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2 | statis |
| `public/data/wilayah.json` | BNPB, NASA FIRMS, Open-Meteo | https://api.open-meteo.com/v1/forecast?latitude= | harian.py | data.yml cron 20 14 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * |  | layar publik: 1; layar staf: 1; model/turunan: 7; worker: 1 | terpakai |
| `public/data/wilayah/*.json` | *.openfreemap.org, BMKG, BNPB, Copernicus, JMA/BMKG Himawari, Kemenhut, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [^, adsb.fi, api.ioda.inetintel.cc.gatech.edu, api.opentopodata.org, api.resend.com, aset.lokal, centurisk97.id, commons.wikimedia.org, contoh.invalid, cwfis.cfs.nrcan.gc.ca, data.eodc.eu, data.globalforestwatch.org, dataweb, davidmegginson.github.io, detik.com, disasterscharter.org, dji.com, docs, esa-worldcover.s3.eu-central-1.amazonaws.com, evil.example, finansial.bisnis.com, flashwildfireservices.ca, google.com, greenpeace.org, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, katadata.co.id, lpds.or.id, mesonet.agron.iastate.edu, metrotvnews.com, nama-situs, news.google.com, nwcg.gov, opendata.adsb.fi, opengis.net, pemerintah ID, planetarycomputer.microsoft.com, poskokarhutla.terasurbannetwork.workers.dev, powerequipment.honda.com.au, publish.csiro.au, res.cloudinary.com, resend.com, resources.trase.earth, rest.isric.org, s3.amazonaws.com, schemas.openxmlformats.org, seismicportal.eu, server.arcgisonline.com, spherestandards.org, stac.eodc.eu, tiles.openfreemap.org, tohatsu.com, trase.earth, wa.me, walhi.or.id, x, zenodo.org | http://aset.lokal/ | build.mjs, grace.py | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | laporan: 19; layar publik: 122; layar staf: 65; model/turunan: 114; peringatan: 3; worker: 13 | terpakai |
| `public/gempa/data/bahaya_meta.json` | BNPB | https://gis.bnpb.go.id/server/rest/services/inarisk | bahaya.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2 | terpakai |
| `public/gempa/data/batimetri.json` | NOAA | https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v | batimetri.py | TIDAK ADA | layar publik: 1; model/turunan: 1 | tanpa-jadwal |
| `public/gempa/data/bukti.json` | BNPB, OpenStreetMap, s3.amazonaws.com | https://inarisk1.bnpb.go.id/geoserver/raster/wms | bukti.py | lintas.yml cron 10 2 * * * | layar publik: 4 | terpakai |
| `public/gempa/data/citra.json` | NASA, e84-earth-search-sentinel-data.s3.us-west-2.amazonaws.com, earth-search.aws.element84.com, sentinel-cogs.s3.us-west-2.amazonaws.com | https://e84-earth-search-sentinel-data.s3.us-west-2.amazonaw | citra.py, konsesi_citra.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3 | terpakai |
| `public/gempa/data/dart.json` | NOAA | https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v | dart.py | gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/emsc_arsip.json` | seismicportal.eu | https://www.seismicportal.eu/testimonies-ws/api/search | emsc.py | gempa.yml cron 10 1 * * * | - | arsip |
| `public/gempa/data/emsc_prospektif.json` | seismicportal.eu | https://www.seismicportal.eu/testimonies-ws/api/search | emsc.py | gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/emsc_residu.json` | seismicportal.eu | https://www.seismicportal.eu/testimonies-ws/api/search | emsc.py | gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/factsheet_gempa.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/gempa/data/gnss.json` | doi.org, geodesy.unr.edu | https://doi.org/10.1029/2018EO104623 | gnss.py | statis.yml cron 0 19 2 * * | - | yatim |
| `public/gempa/data/inarisk_gempa.json` | BNPB | https://gis.bnpb.go.id/server/rest/services/inarisk | bahaya.py, dampak.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; layar publik (nama tanpa .json): 1; model/turunan: 4 | terpakai |
| `public/gempa/data/inatews_detail*.json` | BMKG | https://cdn.bmkg.go.id/ | inatews.py | arsip-bmkg.yml cron 25 */3 * * *; gempa.yml cron 10 1 * * * | layar publik: 1 | terpakai |
| `public/gempa/data/inatews_katalog.json` | BMKG | https://cdn.bmkg.go.id/ | inatews.py | arsip-bmkg.yml cron 25 */3 * * *; gempa.yml cron 10 1 * * * | layar publik: 1 | terpakai |
| `public/gempa/data/inatews_sejarah.json` | BMKG | https://cdn.bmkg.go.id/ | inatews.py | arsip-bmkg.yml cron 25 */3 * * *; gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/inatews_sensor.json` | BMKG | https://cdn.bmkg.go.id/ | inatews.py | arsip-bmkg.yml cron 25 */3 * * *; gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/inatews_tsunami.json` | BMKG | https://cdn.bmkg.go.id/ | inatews.py | arsip-bmkg.yml cron 25 */3 * * *; gempa.yml cron 10 1 * * * | layar publik: 1 | terpakai |
| `public/gempa/data/kajian_magma.json` | - | - | kajian_magma.py | TIDAK ADA | layar publik: 1 | statis |
| `public/gempa/data/kalibrasi_kerusakan.json` | - | - | kalibrasi_kerusakan.mjs | TIDAK ADA | layar publik: 2; layar publik (nama tanpa .json): 1 | statis |
| `public/gempa/data/katalog_merusak.json` | BMKG | https://cdn.bmkg.go.id/katalog_gempa.json | katalog_pdf.py | TIDAK ADA | layar publik: 1 | tanpa-jadwal |
| `public/gempa/data/katalog_tsunami.json` | BMKG | https://cdn.bmkg.go.id/katalog_gempa.json | katalog_pdf.py | TIDAK ADA | layar publik: 1 | tanpa-jadwal |
| `public/gempa/data/laju.json` | BNPB | https://dibi.bnpb.go.id/ | peluang_gempa.py, outlook12.py | banjir.yml cron 20 0 * * *; gempa.yml cron 10 1 * * * | layar publik: 1 | terpakai |
| `public/gempa/data/laporan.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, glad.earthengine.app, globalfloods.eu, hydrosheds.org, mesonet.agron.iastate.edu, sitrep.internal, wa.me, x | http://aset.lokal | laporan_banjir.py, prioritas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | laporan: 7; layar publik: 17; layar staf: 3; model/turunan: 9; worker: 1 | terpakai |
| `public/gempa/data/meta.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, centurisk97.terasurbannetwork.workers.dev, globalfloods.eu, live, sitrep.internal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | jaga_banjir.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 10; layar staf: 6; model/turunan: 14; peringatan: 1; worker: 2 | terpakai |
| `public/gempa/data/model_guncangan.json` | - | - | uji_js_guncangan.py | gempa.yml cron 10 1 * * * | layar publik: 4; model/turunan: 2 | terpakai |
| `public/gempa/data/model_susulan.json` | - | - | peluang_gempa.py, susulan.py | gempa.yml cron 10 1 * * * | layar publik: 3; model/turunan: 1 | terpakai |
| `public/gempa/data/peluang.json` | centurisk97.id, contoh.invalid | https://centurisk97.id | dampak_kab.py, peluang_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | layar publik: 10; model/turunan: 2 | terpakai |
| `public/gempa/data/prospektif_guncangan.json` | - | - | guncangan.py | lintas.yml cron 10 2 * * * | - | yatim |
| `public/gempa/data/prospektif_susulan.json` | - | - | susulan.py, rapor_belajar.py | gempa.yml cron 10 1 * * * | - | yatim |
| `public/gempa/data/risiko.json` | USGS, webservices.volcano.si.edu | https://earthquake.usgs.gov/fdsnws/event/1 | riwayat.py, risiko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 4; model/turunan: 2 | terpakai |
| `public/gempa/data/riwayat_grid.json` | Open-Meteo, USGS, api.opentopodata.org | https://api.open-meteo.com/v1/elevation | faktor_kec.py, riwayat_grid.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 5; layar publik (nama tanpa .json): 1; layar staf: 1; model/turunan: 4; model/turunan (nama tanpa .json): 6 | terpakai |
| `public/gempa/data/riwayat_m5.json` | USGS | https://earthquake.usgs.gov/fdsnws/event/1 | ujibalik_risiko.py, citra.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | layar publik: 4; model/turunan: 4 | terpakai |
| `public/gempa/data/riwayat_prov.json` | USGS | https://earthquake.usgs.gov/fdsnws/event/1 | riwayat.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 2 | terpakai |
| `public/gempa/data/vs30.json` | s3.amazonaws.com | https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z | vs30.py | TIDAK ADA | layar publik: 2; model/turunan: 1 | tanpa-jadwal |
| `public/gunungapi/data/bandara.json` | BMKG, ECMWF, ESDM/PVMBG, Open-Meteo, aviationweather.gov, davidmegginson.github.io, ourairports.com | https://api.open-meteo.com/v1/forecast | metar.py, abu.py | jarak_pandang.yml cron 12 22-23,0-10 * * *; lintas.yml cron 10 2 * * * | layar publik: 3 | terpakai |
| `public/gunungapi/data/factsheet_gunungapi.json` | BNPB, NOAA, webservices.volcano.si.edu | https://web.archive.org/web/20110721122014/http://bnpb.go.id | factsheet.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 2 | terpakai |
| `public/gunungapi/data/glosari.json` | - | - | arsip_magma.py | TIDAK ADA | layar publik: 1 | statis |
| `public/gunungapi/data/gunung.json` | ESDM/PVMBG, [a-z0-9.-, cendana15.com, magma, webservices.volcano.si.edu, x | http://magma.vsi.esdm.go.id/x | berita.py, magma.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar staf: 1; model/turunan: 4 | terpakai |
| `public/gunungapi/data/kegempaan.json` | ESDM/PVMBG, [a-z0-9.-, cendana15.com, magma, x | http://magma.vsi.esdm.go.id/x | arsip_magma.py, magma.py | lintas.yml cron 10 2 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * | | layar publik: 3 | terpakai |
| `public/gunungapi/data/mirova.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/gunungapi/data/paparan.json` | BNPB, ESDM/PVMBG, OpenStreetMap, WorldPop, [a-z0-9.-, cendana15.com, magma, x | http://magma.vsi.esdm.go.id/x | citra.py, magma.py | lintas.yml cron 10 2 * * *; statis.yml cron 0 19 2 * *; titik.yml cron | layar publik: 3; layar staf: 1; model/turunan: 3 | terpakai |
| `public/gunungapi/data/paparan_geo.json` | BNPB, ESDM/PVMBG, OpenStreetMap, WorldPop | https://geoportal.esdm.go.id | paparan.py | lintas.yml cron 10 2 * * *; statis.yml cron 0 19 2 * * | layar publik: 2; model/turunan: 2 | terpakai |
| `public/gunungapi/data/pedoman_krb.json` | - | - | - | TIDAK ADA | layar publik: 3 | statis |
| `public/gunungapi/data/perubahan_level.json` | ESDM/PVMBG, [a-z0-9.-, cendana15.com, magma, x | http://magma.vsi.esdm.go.id/x | magma.py | lintas.yml cron 10 2 * * *; titik.yml cron 40 */3 * * * | 10 9 * * * | | layar publik: 2 | terpakai |
| `public/gunungapi/data/pop/*.json` | BMKG, BNPB, Copernicus, ESDM/PVMBG, NASA, NASA FIRMS, Open-Meteo, OpenStreetMap, [a-z0-9.-, api.gdeltproject.org, arcgis.com, aset.lokal, cendana15.com, centurisk97.id, data-api.globalforestwatch.org, data.eodc.eu, data.globalforestwatch.org, esa-worldcover.s3.eu-central-1.amazonaws.com, evil.example, flashwildfireservices.ca, jdih, magma, mesonet.agron.iastate.edu, news.google.com, pemerintah ID, planetarycomputer.microsoft.com, powerequipment.honda.com.au, res.cloudinary.com, rest.isric.org, schemas.openxmlformats.org, stac.eodc.eu, tiktok.com, tohatsu.com, trends.google.com, x, zenodo.org | http://magma.vsi.esdm.go.id/x | dampak_sensitivitas.py, fitur_banjir.py | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | layar publik: 37; layar staf: 17; model/turunan: 73; peringatan: 1; worker: 5 | terpakai |
| `public/gunungapi/data/rezim_letusan.json` | - | - | arsip_magma.py | TIDAK ADA | layar publik: 2 | statis |
| `public/gunungapi/data/risiko.json` | USGS, webservices.volcano.si.edu | https://earthquake.usgs.gov/fdsnws/event/1 | riwayat.py, risiko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 4; model/turunan: 2 | terpakai |
| `public/gunungapi/data/riwayat_level.json` | - | - | riwayat_level.py | TIDAK ADA | layar publik: 1 | statis |
| `public/inti/data/laporan-contoh.json` | - | - | - | TIDAK ADA | layar publik: 1 | statis |
| `public/kekeringan/data/embung.json` | OpenStreetMap | https://overpass-api.de/api/interpreter | embung.py, posko.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; model/turunan: 1 | terpakai |
| `public/kekeringan/data/gdo.json` | Copernicus | https://drought.emergency.copernicus.eu/api/wms?SERVICE=WMS& | gdo.py | lintas.yml cron 10 2 * * * | model/turunan: 1 | terpakai |
| `public/kekeringan/data/hindcast.json` | - | - | hindcast.py | TIDAK ADA | layar publik: 1 | statis |
| `public/kekeringan/data/peluang_bayangan.json` | - | - | bayangan.py | prediksi.yml cron 50 1 * * * | layar publik: 1 | terpakai |
| `public/kekeringan/data/peluang_bayangan_arsip.json` | - | - | bayangan.py | prediksi.yml cron 50 1 * * * | - | arsip |
| `public/kekeringan/data/peluang_bayangan_nilai.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/kekeringan/data/tutupan.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 1 | statis |
| `public/longsor/data/kejadian.json` | BNPB, Copernicus, NASA, Open-Meteo, schemas.openxmlformats.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | bukti_das.py, kejadian.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 7; model/turunan: 14 | terpakai |
| `public/longsor/data/kerentanan.json` | data.humdata.org | https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db9 | hvc_dasar.py, kerentanan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 1; model/turunan: 3 | terpakai |
| `public/longsor/data/nowcast.json` | - | - | model.py | lintas.yml cron 10 2 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/longsor/data/pvmbg.json` | pemerintah ID | https://sigi.pu.go.id/serverpu/rest/services/Hosted/prakiraa | model.py, pvmbg.py | lintas.yml cron 10 2 * * *; statis.yml cron 0 19 2 * * | model/turunan: 1 | terpakai |
| `public/longsor/data/tanah.json` | Copernicus, NASA, Open-Meteo, esa-worldcover.s3.eu-central-1.amazonaws.com, maps.isric.org, opengis.net, rest.isric.org | http://www.opengis.net/def/crs/EPSG/0/4326 | fitur_banjir.py, tanah.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 2; model/turunan: 6 | terpakai |
| `public/longsor/data/tanggapan_pvmbg.json` | ESDM/PVMBG | https://magma.esdm.go.id | tanggapan_pvmbg.py | statis.yml cron 0 19 2 * * | model/turunan: 1 | terpakai |
| `public/longsor/data/uji_balik.json` | - | - | model.py | lintas.yml cron 10 2 * * * | layar publik (nama tanpa .json): 7; layar staf (nama tanpa .json): 1; model/turunan (nama tanpa .json): 44 | terpakai |
| `public/pesisir/data/abrasi.json` | - | - | - | TIDAK ADA | layar publik: 2; model/turunan: 2; worker: 1 | statis |
| `public/pesisir/data/rob_kejadian.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2 | statis |
| `public/prediksi/data/amatan/**` | BMKG, Open-Meteo, aviationweather.gov, drive, drive.google.com, drive.usercontent.google.com, schemas.openxmlformats.org | http://schemas.openxmlformats.org/wordprocessingml/2006/main | metar.py, uji_alur.py | data.yml cron 20 14 * * *; jarak_pandang.yml cron 12 22-23,0-10 * * *; | layar publik: 6; model/turunan: 8 | terpakai |
| `public/prediksi/data/bayangan/**` | BNPB, NASA, Open-Meteo, OpenStreetMap, centurisk97.id, commons.wikimedia.org, google.com, planetarycomputer.microsoft.com, zenodo.org | https://api.open-meteo.com/v1/forecast | mcdwd.py, siaga_persentil.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 6; layar staf: 1; model/turunan: 13 | terpakai |
| `public/prediksi/data/dampak.json` | BMKG, BNPB, Open-Meteo, WorldPop, globalfloods.eu | https://inarisk.bnpb.go.id/ | dampak.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * * | layar publik: 7; model/turunan: 2; worker: 1 | terpakai |
| `public/prediksi/data/jalan.json` | BNPB, NASA FIRMS, NOAA, Open-Meteo, esa-worldcover.s3.eu-central-1.amazonaws.com, x, zenodo.org | https://archive-api.open-meteo.com/v1/archive?latitude= | lab_luas.py, lab_padam.py | TIDAK ADA | layar publik: 1; model/turunan: 1 | tanpa-jadwal |
| `public/prediksi/data/kalender_risiko.json` | - | - | siaga.py, kalender.py | data.yml cron 20 14 * * * | layar publik: 3; layar staf: 1 | terpakai |
| `public/prediksi/data/kalibrasi.json` | centurisk97.id, x | http://x | kalibrasi.py, kalibrasi.py | data.yml cron 20 14 * * *; prediksi.yml cron 50 1 * * * | layar publik: 1; model/turunan: 3 | terpakai |
| `public/prediksi/data/kalibrasi_aktif.json` | - | - | - | TIDAK ADA | layar publik: 1; model/turunan: 2 | statis |
| `public/prediksi/data/lalu.json` | - | - | terbit.py | prediksi.yml cron 50 1 * * * | layar publik: 1 | terpakai |
| `public/prediksi/data/lengas.json` | - | - | terbit.py | prediksi.yml cron 50 1 * * * | layar publik: 1 | terpakai |
| `public/prediksi/data/pasangan.json` | Copernicus, Open-Meteo | https://api.open-meteo.com/v1/forecast | kedalaman_genangan.py, kalibrasi.py | data.yml cron 20 14 * * *; prediksi.yml cron 50 1 * * * | model/turunan: 1 | terpakai |
| `public/prediksi/data/prediksi.json` | - | - | terbit.py | prediksi.yml cron 50 1 * * * | layar publik: 3; layar staf: 1; model/turunan: 2 | terpakai |
| `public/prediksi/data/skor.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | nilai.py, terbit.py | prediksi.yml cron 50 1 * * * | layar publik: 1 | terpakai |
| `public/prediksi/data/tangga.json` | BMKG | https://www.bmkg.go.id/alerts/nowcast/id | tangga.py | prediksi.yml cron 50 1 * * * | layar publik: 2 | terpakai |
| `public/udara/data/angin.json` | Open-Meteo | https://api.open-meteo.com/v1/forecast | angin.py, asal.py | udara.yml cron 40 6,18 * * * | layar publik: 1; model/turunan: 1 | terpakai |
| `public/udara/data/asal.json` | BNPB, glad.earthengine.app, hydrosheds.org | https://dibi.bnpb.go.id | asal.py, laporan_kejadian.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 3 | terpakai |
| `public/udara/data/atribusi.json` | NASA FIRMS, Open-Meteo, WorldPop, mesonet.agron.iastate.edu | https://firms.modaps.eosdis.nasa.gov | atribusi.py, laporan_udara.py | udara.yml cron 40 6,18 * * * | - | yatim |
| `public/udara/data/awan_himawari.json` | - | - | - | TIDAK ADA | model/turunan: 2 | statis |
| `public/udara/data/bmkg_pm25.json` | BMKG | https://www.bmkg.go.id/kualitas-udara | kualitas_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 1; model/turunan: 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/udara/data/geoscf.json` | - | - | geoscf.py | udara.yml cron 40 6,18 * * * | - | yatim |
| `public/udara/data/jarak_pandang.json` | BMKG, aviationweather.gov | https://aviationweather.gov/api/data/metar?format=json&hours | metar.py, jarak_pandang_jam.mjs | jarak_pandang.yml cron 12 22-23,0-10 * * * | layar publik (nama tanpa .json): 2; layar staf: 1; layar staf (nama tanpa .json): 1; model/turunan: 1; model/turunan (nama tanpa .json): 9 | terpakai |
| `public/udara/data/kejadian/**` | *.openfreemap.org, BMKG, BNPB, Copernicus, ECMWF, ESDM/PVMBG, JTWC, NASA, NASA FIRMS, NOAA, Open-Meteo, OpenStreetMap, USGS, WorldPop, [a-z0-9.-, a, akademisi.karya, akademisi.riset, api.gdeltproject.org, api.ioda.inetintel.cc.gatech.edu, api.openalex.org, api.opentopodata.org, api.reliefweb.int, aset.lokal, cendana15.com, centurisk97.id, contoh.invalid, data.chc.ucsb.edu, data.eodc.eu, davidmegginson.github.io, disasterscharter.org, doi.org, drive, drive.google.com, drive.usercontent.google.com, glad.earthengine.app, globalfloods.eu, graph.mapillary.com, hydrosheds.org, ioc-sealevelmonitoring.org, ioda.inetintel.cc.gatech.edu, magma, mesonet.agron.iastate.edu, nama-situs, news.google.com, ogimet.com, openalex.org, opencellid.org, ourairports.com, overturemaps.org, pemerintah ID, planetarycomputer.microsoft.com, pub.orcid.org, public.emdat.be, reliefweb.int, schemas.openxmlformats.org, seismicportal.eu, stac.eodc.eu, tiktok.com, tiles.openfreemap.org, trends.google.com, wa.me, webservices.volcano.si.edu, x, zenodo.org | http://a/1 | sambung_panen.mjs, ambang_persentil.py | arsip-bmkg.yml cron 25 */3 * * *; banjir.yml cron 20 0 * * *; data.yml | laporan: 29; layar publik: 154; layar staf: 48; model/turunan: 64; worker: 11 | terpakai |
| `public/udara/data/kualitas_bmkg.json` | BMKG | https://www.bmkg.go.id/kualitas-udara | kualitas_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | - | yatim |
| `public/udara/data/kualitas_bmkg_arsip.json` | BMKG | https://www.bmkg.go.id/kualitas-udara | kualitas_bmkg.py | arsip-bmkg.yml cron 25 */3 * * * | - | arsip |
| `public/udara/data/laporan.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, glad.earthengine.app, globalfloods.eu, hydrosheds.org, mesonet.agron.iastate.edu, sitrep.internal, wa.me, x | http://aset.lokal | laporan_banjir.py, prioritas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | laporan: 7; layar publik: 17; layar staf: 3; model/turunan: 9; worker: 1 | terpakai |
| `public/udara/data/lintasan.json` | NASA FIRMS, Open-Meteo, WorldPop, mesonet.agron.iastate.edu | https://firms.modaps.eosdis.nasa.gov | laporan_udara.py, lintasan.py | udara.yml cron 40 6,18 * * * | - | yatim |
| `public/udara/data/meta.json` | BMKG, BNPB, NASA FIRMS, Open-Meteo, USGS, WorldPop, aset.lokal, centurisk97.id, centurisk97.terasurbannetwork.workers.dev, globalfloods.eu, live, sitrep.internal, tiles.openfreemap.org, wa.me | http://aset.lokal/ | jaga_banjir.py, laporan_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; kemitraan.yml c | layar publik: 10; layar staf: 6; model/turunan: 14; peringatan: 1; worker: 2 | terpakai |
| `public/udara/data/musim_asap.json` | - | - | musim_asap.py | udara.yml cron 40 6,18 * * * | layar publik: 2; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/udara/data/omc_arsip.json` | BMKG, OpenAQ, mesonet.agron.iastate.edu | https://api.openaq.org/v3/ | panen.py, geoscf.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | model/turunan: 4 | terpakai |
| `public/udara/data/omc_bmkg.json` | BMKG | https://www.bmkg.go.id/cuaca/modifikasi-cuaca | banding_dalops.py, bmkg_omc.py | arsip-bmkg.yml cron 25 */3 * * * | layar publik: 1 | terpakai |
| `public/udara/data/omc_hasil.json` | aset.lokal | https://aset.lokal/udara/data/omc_hasil.json | omc.js | TIDAK ADA | layar publik: 1; layar staf: 1; model/turunan: 2; worker: 1 | tanpa-jadwal |
| `public/udara/data/openaq_mos.json` | OpenAQ | https://api.openaq.org/v3/ | openaq_mos.py | udara.yml cron 40 6,18 * * * | layar publik (nama tanpa .json): 1; model/turunan (nama tanpa .json): 1 | terpakai |
| `public/udara/data/peluang.json` | centurisk97.id, contoh.invalid | https://centurisk97.id | dampak_kab.py, peluang_banjir.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; gempa.yml cron  | layar publik: 10; model/turunan: 2 | terpakai |
| `public/udara/data/pltu.json` | - | - | atribusi.py, peluang_udara.py | udara.yml cron 40 6,18 * * * | layar publik: 2; model/turunan: 1 | terpakai |
| `public/udara/data/prakiraan.json` | NASA FIRMS, Open-Meteo, WorldPop, api.waqi.info, centurisk97.id, mesonet.agron.iastate.edu | https://air-quality-api.open-meteo.com/data/cams_global/stat | risiko.py, rs_kapasitas.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 7; model/turunan: 5; worker: 1 | terpakai |
| `public/udara/data/prakiraan_arsip.json` | Open-Meteo, api.waqi.info, mesonet.agron.iastate.edu | https://air-quality-api.open-meteo.com/data/cams_global/stat | prakiraan.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | model/turunan (nama tanpa .json): 1 | terpakai |
| `public/udara/data/rentan.json` | NASA FIRMS, Open-Meteo, WorldPop, mesonet.agron.iastate.edu | https://firms.modaps.eosdis.nasa.gov | laporan_udara.py, rentan.py | udara.yml cron 40 6,18 * * * | layar publik: 2 | terpakai |
| `public/udara/data/riwayat.json` | BNPB, JMA/BMKG Himawari, Open-Meteo, centurisk97.id, contoh.invalid, dji.com, opengis.net | http://www.dji.com/wpmz/1.0.6 | riwayat.py, drone.py | banjir.yml cron 20 0 * * *; data.yml cron 20 14 * * *; lintas.yml cron | layar publik: 6; model/turunan: 2 | terpakai |
| `public/udara/data/tropomi_kisi.json` | NASA, Open-Meteo, x | http://x | tropomi.py | udara.yml cron 40 6,18 * * * | layar publik (nama tanpa .json): 1 | terpakai |
| `public/udara/data/tropomi_seri.json` | NASA, Open-Meteo, x | http://x | tropomi.py | udara.yml cron 40 6,18 * * * | layar publik (nama tanpa .json): 1 | terpakai |
| `public/udara/data/uji_panen_pm25.json` | Open-Meteo | https://archive-api.open-meteo.com/v1/archive? | uji_panen.py | udara.yml cron 40 6,18 * * * | layar publik (nama tanpa .json): 1 | terpakai |

## Pengecekan tally (pasangan angka sama dari sumber berbeda, perlu label definisi)

- Titik panas karhutla: hotspot FIRMS (VIIRS/MODIS, semua kepercayaan) (`public/data/hotspot.json`) berdampingan dengan hotspot BMKG kepercayaan tinggi (`public/banjir/data/karhutla_bmkg.json`)
- PM2,5: PM2,5 model/prakiraan (`public/udara/data/uji_panen_pm25.json`) berdampingan dengan PM2,5 stasiun BMKG (`public/udara/data/bmkg_pm25.json`)
- Modifikasi cuaca (OMC): operasi OMC publikasi BMKG (`public/udara/data/omc_bmkg.json`) berdampingan dengan logbook OMC Dalops BNPB (`public/data/bnpb/*.json`)
- Siklon tropis: JTWC (`public/banjir/data/cuaca_siklon.json`) berdampingan dengan BMKG/TCWC (`public/banjir/data/cuaca_siklon_bmkg.json`)
- Peringatan dini cuaca: peringatan sistem sendiri (`public/banjir/data/peringatan.json`) berdampingan dengan peringatan BMKG (`public/banjir/data/peringatan_bmkg.json`)
- Gempa: katalog InaTEWS BMKG (`public/gempa/data/inatews_katalog.json`) berdampingan dengan katalog merusak/tsunami (`public/gempa/data/katalog_merusak.json`)
- Petir: petir BMKG (`public/banjir/data/cuaca_petir.json`) berdampingan dengan petir arsip BMKG (`public/banjir/data/cuaca_petir_arsip*.json`)
- Hotspot 24 jam: hotspot.json (`public/data/hotspot.json`) berdampingan dengan hotspot24.json (`public/data/hotspot24.json`)

## Usul sambungan untuk yatim dan tanpa-jadwal

- `public/banjir/data/pos_sungai.json` (tanpa-jadwal): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/charter.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/label_kec_ringkas.json` (tanpa-jadwal): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/bmkg_upt.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/cuaca_risiko_bnpb.json` (tanpa-jadwal): kartu di layar Cuaca (`/cuaca`) dan lampiran Laporan Kejadian Bencana Harian
- `public/banjir/data/faktor_kec.json` (tanpa-jadwal): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/mcdwd_model.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/siaga_persentil_log.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/iklim_bmkg.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/lampu_malam_validasi.json` (tanpa-jadwal): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/kecamatan_genangan.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/cuaca_sarana.json` (yatim): kartu di layar Cuaca (`/cuaca`) dan lampiran Laporan Kejadian Bencana Harian
- `public/banjir/data/kejadian_gunungapi_geo.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/kejadian_aktif_nomor.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/model_bahaya.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/cuaca_prospektif*.json` (yatim): kartu di layar Cuaca (`/cuaca`) dan lampiran Laporan Kejadian Bencana Harian
- `public/banjir/data/kejadian_gunungapi_nomor.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/paparan_kab.json` (yatim): layar Banjir (`/banjir`) dan model bahaya
- `public/banjir/data/koreksi_bias.json` (tanpa-jadwal): layar Banjir (`/banjir`) dan model bahaya
- `public/data/risiko_mingguan_uji.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/ps.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/khg_hari.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/iklim_stasiun.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/gdelt.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/foto_dasar.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/tambang.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/sk_drive.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/logistik.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/slstr_malam.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/reliefweb.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/bahan_bakar_uji.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/transisi_lahan.json` (yatim): layar Karhutla di peta utama dan Laporan Penanganan Karhutla
- `public/data/bahan_bakar.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/hgu_api.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/sinyal_sosial.json` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/data/kemenhut/terbakar_2026/*.json` (yatim): layar Karhutla di peta utama dan Laporan Penanganan Karhutla
- `public/data/logpal/**` (tanpa-jadwal): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/gempa/data/vs30.json` (tanpa-jadwal): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/emsc_residu.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/prospektif_susulan.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/gnss.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/prospektif_guncangan.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/katalog_merusak.json` (tanpa-jadwal): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/inatews_sejarah.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/batimetri.json` (tanpa-jadwal): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/dart.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/katalog_tsunami.json` (tanpa-jadwal): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/inatews_sensor.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/gempa/data/emsc_prospektif.json` (yatim): kartu di layar Gempa (`/gempa`) dan peringatan dini lintas-sumber
- `public/prediksi/data/jalan.json` (tanpa-jadwal): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `public/udara/data/omc_hasil.json` (tanpa-jadwal): kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla
- `public/udara/data/lintasan.json` (yatim): kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla
- `public/udara/data/geoscf.json` (yatim): kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla
- `public/udara/data/atribusi.json` (yatim): kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla
- `public/udara/data/kualitas_bmkg.json` (yatim): kartu di layar Udara (`/udara`) dan Laporan Penanganan Karhutla
- `D1:alat_jejak` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `D1:meja_jejak` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
- `D1:rumah_rusak_koreksi` (yatim): tentukan pemilik: sambungkan ke layar modulnya, ke laporan harian, atau hentikan penulisnya
