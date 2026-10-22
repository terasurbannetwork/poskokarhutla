# Rencana lanjut: api padam lebih cepat dan terukur (22 Okt 2026)

Disetujui pemilik 22 Okt 2026: butir 1–10 dan 12–15 dari daftar usulan level lanjut
(replay musim belum diminta), ditambah **analitik SLA di dashboard** dan **kabar lewat email**
di samping push. Rancangan induk tetap `RANCANGAN-API-PADAM.md`; berkas ini memegang
kontrak data supaya pengerja yang jalan bersamaan tidak saling menebak.

## 0. Keadaan awal (hasil pemetaan kode)

| Butir | Sudah ada | Celah |
|---|---|---|
| Himawari | `himawari.yml` tiap 30 menit ke R2, `src/himawari.js tandaiBaru`, email EWS publik, pembuka ulang tugas padam | Tidak membuat insiden, tidak ada riwayat, tidak ada kabar ke Posko pusat, tidak dipantau `/api/status` |
| Push | VAPID + aes128gcm sendiri (`src/push.js`), `push_langganan`, ringkasan 3 jam | Darurat regu dan level 3 baru belum seketika |
| Email | Resend (`src/ews.js`), `instansi_akun.email` wajib | Mati karena pengirim masih `@resend.dev`; email ke instansi belum ada |
| Jam ukur | Stempel waktu tiap tahap ada di `tugas_api`, `tugas_isian`, `penugasan` | Waktu deteksi pertama tidak masuk D1; tidak ada susunan per insiden; Rapor BPBD tidak memakainya |
| SLA | `/api/status` (snapshot), `catatGangguan` per jam ke `stat_hari` | Tidak ada riwayat umur data per sumber, tidak ada layar SLA |
| Kalibrasi | Koefisien di `scripts/data/operasi.py`, isian lapangan di D1 | Pipeline tidak pernah membaca D1 |
| Ramalan | `prospektif.py` mencatat dan menilai (AUC, Brier, Wilson), gerbang `teruji` | Tanpa kurva reliabilitas, tanpa uji balik historis, catatan hanya di cache Actions 7 hari |
| Kekeringan | Uji balik DIBI + 21 kandidat ambang, semuanya gagal | Belum dicoba unit uji lain (tenggang waktu, per provinsi, musim) |
| Rute | Graf OSM sendiri (`scripts/scrape/akses.py`), 183 kompleks level 3 provinsi prioritas | Insiden lain garis lurus; jejak GPS regu belum dipakai |
| Air + DEM | `hitungEstafet`, `ops_sumber_air`, grid kanal | Embung/sungai kecil belum jadi sumber; beda tinggi selalu 0 |
| Masker panas tetap | `titik_palsu.py` (92 sumber) dipakai `harian.py` | Daftar dibangun manual; `/api/titik` di Worker tidak tersaring |
| Luas citra | dNBR per konsesi (`konsesi_citra_jelas.py`) | dNBR per insiden belum ada |
| CAP | `/api/peringatan/aktif` JSON (gempa, tsunami, cuaca) | Tanpa CAP/GeoJSON, tanpa CORS, karhutla belum masuk |
| Gakkum | Lembar A4 per konsesi + bukti lapangan | Tanpa hash, cap waktu, rantai kustodi |
| Regu luring | Draf localStorage, antrean IndexedDB | Tanpa service worker cache, MapLibre dari CDN, tanpa ubin luring |

Keputusan bawaan (pemilik boleh membalik):
- **Rute**: graf sendiri diperluas dulu. Valhalla/GraphHopper hanya kalau graf sendiri terbukti kurang.
- **Target SLA**: hanya target yang sudah jadi aturan (konfirmasi foto ≤ 6 jam, kabar tiap 24 jam)
  yang dinilai lolos/gagal. Tahap lain menampilkan persentil tanpa vonis sampai pemilik menetapkan target
  (rancangan §6: target dari data sendiri).
- **Rapor BPBD**: waktu tanggap api tampil sebagai blok tersendiri; bobot rapor (35/25/40) tidak diubah
  tanpa keputusan pemilik.
- **Cap waktu Gakkum**: SHA-256 saat unggah + manifest berkas ber-hash. Cap waktu pihak ketiga (RFC 3161)
  baru dipasang kalau penyidik memintanya.
- **Himawari**: hanya ke Posko pusat sampai VIIRS mengonfirmasi (keputusan 22 Okt).

## 1. Kontrak data

### 1.1 Migrasi (nomor dikunci, diterapkan pemilik di produksi)

| Nomor | Isi |
|---|---|
| `0042_sla.sql` | `status_riwayat(slot INTEGER, sumber TEXT, umur_menit INTEGER, batas_menit INTEGER, segar INTEGER, PRIMARY KEY(slot, sumber))`, slot = jam epoch UTC |
| `0043_insiden_waktu.sql` | `tugas_api` + `terdeteksi_awal INTEGER`, `himawari_awal INTEGER`, `sumber_awal TEXT`; tabel `alarm_himawari(id TEXT PRIMARY KEY, lat REAL, lon REAL, radius_m INTEGER, pertama INTEGER, terakhir INTEGER, n_pindai INTEGER, frp REAL, status TEXT CHECK(status IN ('siaga','terkunci','hilang')), tugas_id TEXT, terkunci_pada INTEGER, dikabarkan_pada INTEGER)`; tabel `kabar_terkirim(kunci, penerima, waktu, PRIMARY KEY(kunci, penerima))` untuk kabar idempoten, retensi 30 hari |
| `0044_media_hash.sql` | `instansi_media.sha256`, `lapangan.foto_sha256` (hex 64), dihitung dari byte yang disimpan ke R2 sesudah EXIF dibuang, supaya cocok dengan berkas yang diunduh |
| `0045_kabar_ulang.sql` | antrean `kabar_ulang` untuk kabar yang gagal terkirim (jeda 1/5/15/60 menit, maks 5 percobaan, per saluran) |
| `0046_luas_awal.sql` | `tugas_luas_awal`: luas satelit saat tugas pertama dibuat (ditulis sekali), untuk kalibrasi |

Semua fitur baru wajib tetap aman sebelum migrasinya diterapkan: rute menjawab 503 dengan alasan,
cron melewati langkahnya, layar menampilkan keadaan "belum aktif". Alasannya: commit "gas" pemilik
bisa menyapu dan mendorong kerja yang belum selesai kapan saja.

### 1.2 Tahap waktu per tugas (satu modul hitung, `src/sla.js`)

| Tahap | Kolom |
|---|---|
| deteksi | `min(himawari_awal, terdeteksi_awal)`, jatuh ke `dibuat` bila kosong (ditandai `perkiraan`) |
| tugas | `tugas_api.dibuat` |
| konfirmasi | `tugas_api.konfirmasi_pada` |
| tiba | `min(penugasan.tiba_pada)` untuk tugas itu |
| padam | `tugas_api.padam_pada` |
| terverifikasi | `tugas_api.verif_pada` bila `padam_verif` = terverifikasi |

Layar SLA, Rapor BPBD, dan laporan otomatis memakai fungsi yang sama dari `src/sla.js`. Tidak ada
hitungan kedua di sisi klien.

### 1.3 `GET /api/sla?hari=30&prov=&kab=` (admin dan staf BNPB)

```json
{
  "kini": 0, "hari": 30,
  "sumber": [{"id": "titik", "nama": "Titik panas", "batas_menit": 480,
              "slo_target_pct": 99, "segar_pct": 97.2, "umur_p50": 95, "umur_p95": 410,
              "gangguan": [{"mulai": 0, "selesai": 0, "menit": 0}]}],
  "tahap": [{"dari": "deteksi", "ke": "tugas", "n": 0, "p50_menit": 0, "p90_menit": 0,
             "target_menit": null, "dalam_target_pct": null}],
  "wilayah": [{"kode": "16", "nama": "Sumatera Selatan", "n": 0,
               "tahap": {"deteksi_tugas": {"p50": 0, "p90": 0}},
               "terlambat_buka": 0}],
  "tren": [{"tanggal": "2026-10-22", "segar_pct": 0, "deteksi_tugas_p50": 0}],
  "himawari": {"alarm": 0, "terkunci": 0, "hilang": 0, "selisih_viirs_p50_menit": 0},
  "catatan": ["..."]
}
```

Tambahan 22 Okt (permintaan pemilik: dashboard yang memantau seluruh proses dan bisa mengevaluasi
lapangan). Respons yang sama membawa dua blok lagi, dihitung di `src/sla.js`, juga per wilayah:

```json
{
  "proses": [{"tahap": "deteksi", "n": 0}, {"tahap": "tugas", "n": 0}, {"tahap": "konfirmasi", "n": 0},
             {"tahap": "tiba", "n": 0}, {"tahap": "padam", "n": 0}, {"tahap": "terverifikasi", "n": 0},
             {"tahap": "muncul_lagi", "n": 0}],
  "macet": [{"tahap": "konfirmasi", "n_menunggu": 0, "n_lewat_target": 0}],
  "lapangan": {
    "isian_lengkap_pct": 0, "foto_gps_sah_pct": 0, "gps_curiga_n": 0,
    "kabar_tepat_pct": 0, "padam_terverifikasi_pct": 0, "muncul_lagi_pct": 0,
    "bukan_api_pct": 0,
    "n": {"isian": 0, "foto": 0, "kabar": 0, "padam": 0, "konfirmasi": 0},
    "luas": {"n": 0, "rasio_lapangan_satelit_p50": 0, "rasio_garis_satelit_p50": 0},
    "taktik": {"n": 0, "regu_nyata_per_saran_p50": 0, "personel_nyata_per_saran_p50": 0},
    "regu": [{"akun": "id", "nama": "Instansi", "n": 0, "tiba_p50_menit": 0, "padam_p50_jam": 0,
              "isian_lengkap_pct": 0, "kabar_tepat_pct": 0}]
  }
}
```

Definisi: isian lengkap = konfirmasi + PIC + foto ber-GPS + status api; foto GPS sah = tidak ditandai
`gps_curiga`; kabar tepat = tiap selang kabar ≤ 24 jam selama api belum padam; bukan api = isian
`hasil = bukan_api` (ukuran alarm palsu satelit di lapangan). Rasio dihitung hanya dari tugas yang
punya kedua angka; `n` selalu ikut tampil. Penyebut tiap persen ada di `lapangan.n`: isian lengkap
dan kabar tepat dibagi tugas yang sudah dikonfirmasi (`n.konfirmasi`, `n.kabar` = tugas yang wajib
kabar), foto GPS sah dibagi jumlah foto (`n.foto`), padam terverifikasi dan muncul lagi dibagi tugas
padam (`n.padam`), bukan api dibagi isian konfirmasi (`n.konfirmasi`). Nama orang tidak pernah keluar, hanya instansi.

Layar: `/admin/kinerja` ("Kinerja pemantauan"), tiga tab: **Data** (kesegaran sumber), **Proses**
(corong dan waktu tahap, macet), **Lapangan** (evaluasi isian, verifikasi, alarm palsu, luas, taktik,
per instansi).

### 1.4 `GET /api/pipa/lapangan?sejak=<ms>` (pipeline saja)

Header `Authorization: Bearer <PIPA_TOKEN>` (secret Worker dan secret GitHub, dipasang pemilik).
Isi per tugas, tanpa nama dan nomor orang: `id, prov, kab, lat, lon (dibulatkan 0,01°), lahan,
luas_satelit_ha, luas_lapangan_ha, padam_ha, luas_garis_ha, regu, personel, mulai_padam, padam_pada,
padam_verif, kedalaman_bara_cm, alat_dipakai, status_api`. Tanpa token yang cocok: 401. Token
kosong di Worker: 503.

### 1.5 Kabar seketika

| Kejadian | Penerima | Saluran |
|---|---|---|
| Darurat regu | akun pemilik penugasan + admin | push + email, tanpa menunggu 3 jam |
| Tugas level 3 baru | akun wilayahnya | push + email |
| Alarm Himawari baru | Posko pusat (admin, staf BNPB, `EMAIL_TO`) | push bila ada langganan + email |

Email lewat `src/ews.js` yang ada, tetap ditolak selama pengirim `@resend.dev`. Satu kejadian satu
kabar per penerima (kunci idempoten di D1).

## 2. Gelombang kerja

| Gel. | Pengerja | Butir | Berkas |
|---|---|---|---|
| 1 | `warga-api` (backend) | 0042–0043, `src/sla.js`, `/api/sla`, kabar seketika, alarm Himawari + kunci VIIRS, `/api/pipa/lapangan`, masker di `src/titik.js`, Himawari di `sumber_status`, blok Rapor | `src/**`, `migrations/0042-0043`, `tests/warga/**`, `public/bencana.json` (`sumber_status` saja) |
| 1 | `warga-api` (layar) | Layar SLA `/admin/sla` | `public/admin/sla.*`, tautan menu admin |
| 1 | `model-sebaran` | Kurva reliabilitas, uji balik historis "akan membesar", arsip catatan permanen | `scripts/sebaran/**`, `public/sim_data.js` |
| 1 | `gunungapi-kering` | Uji ambang kekeringan dengan unit uji lain | `scripts/kekeringan/**`, `public/kekeringan/**` |
| 2 | `pipa-data` | `kalibrasi.py`, dNBR per insiden, perluasan `akses.py` (semua tugas prioritas + jejak GPS), embung/sungai + DEM, penyegaran otomatis `titik_palsu` | `scripts/data/**`, `scripts/scrape/**` |
| 2 | `warga-api` | CAP + GeoJSON + CORS, aturan peringatan karhutla, `bedaTinggiM` dari DEM, `0044` + hash media | `src/peringatan.js`, `src/operasi_lapangan.js`, `src/instansi.js` |
| 2 | `ruang-bnpb` | Berkas Gakkum: manifest ber-hash, rantai kustodi | `public/admin/gakkum.*` |
| 2 | `layar-peta` | Regu luring: service worker `/lapangan`, MapLibre lokal, ubin luring, Kartu Api di halaman regu | `public/lapangan.*`, `public/sw-*.js` |
| 2 | `mekanik-mesin` | Secret `PIPA_TOKEN` di workflow, arsip catatan prospektif, jadwal bulanan `titik_palsu` | `.github/workflows/**` |

Pemeriksa per §6 AGENTS.md: `guard-api` + `security-reviewer` (route), `migrasi-idempoten`,
`validasi-model` (ramalan, kekeringan, kalibrasi), `selera-angka` + `inp-reviewer` (layar).

### 2.1 Antrean Worker gelombang 2 (dikumpulkan dari laporan pengerja)

| # | Butir | Kontrak |
|---|---|---|
| W1 | `CSP_LAPANGAN` (`src/posko.js`) | `worker-src 'self' blob:` supaya `sw-lapangan.js` terpasang |
| W2 | `GET /api/lapangan/tugas` di `RUTE_POSKO` | header `x-kode-regu` lewat `reguDari`; `{kini, tugas:[{id, lat, lon, kab, kec, level, rekomendasi, akses, kartu}]}`, maks 20 tugas buka di kabupaten regu itu, level tertinggi dulu (kode regu tidak terhubung ke `penugasan`, jadi cabang "penugasan regu" tidak dipakai); bentuk `kartu/akses/rekomendasi` sama dengan `GET /api/instansi/tugas/:id`; `cache-control: private, no-store` |
| W3 | `0044_media_hash.sql` + hash saat unggah | `instansi_media.sha256` dihitung dari byte yang diterima, sebelum disimpan ke R2 |
| W4 | `buktiLapangan` (`GET /api/ops/bukti`) | tiap `media[]` menambah `sha256`, `dibuat` (ms), `instansi` (join `instansi_akun`, tanpa nama orang); `diverifikasi_oleh/pada` bila ada |
| W5 | `bedaTinggiM` di `src/operasi_lapangan.js` | dari `akses.json` entri `air.sumber[].beda_tinggi_m` (api − sumber, null tanpa DEM, `km` garis lurus belum ×1,2) dan `air.elev_m` |
| W6 | Feed CAP 1.2 + GeoJSON + CORS | `/api/peringatan/aktif.cap` dan `.geojson` dari `bentuk()` yang sama; `access-control-allow-origin: *` untuk GET; aturan peringatan karhutla (insiden level 3 baru, alarm Himawari tidak ikut sampai terkunci) |
| W8 | Tambahan `/api/pipa/lapangan` | `regu_maks`, `regu_rata` (sepanjang pemadaman), `luas_satelit_awal_ha`, `luas_satelit_maks_ha`, `lahan_peta_gambut` (boolean dari peta gambut), `jumlah_isian`, `instansi_hash` (sha256 terpotong, untuk dedupe) |
| W9 | Temuan review gelombang 1 | kunci dedupe darurat per jendela 5 menit; nama orang keluar dari isi push/email darurat (cukup regu, wilayah, tautan Meja Pantau); `/api/sla` memaksa `prov` ke wilayah staf berwilayah; penanda dummy jelas di respons; `cakupan` rusak di `kabarLevel3` tidak menggagalkan putaran; `PIPA_TOKEN` di `.dev.vars.example` + batas laju percobaan token gagal |
| W7 | `GET /api/pipa/jejak?sejak=` | Bearer `PIPA_TOKEN`; `{"jejak":[[[lat,lon],...]]}` dari `penugasan_posisi`, tanpa identitas regu, titik dibulatkan 0,0001°, hanya segmen bergerak; dipakai `akses.py` lewat `data/jejak_regu.json` |

## 3. Yang hanya bisa dilakukan pemilik

1. Terapkan migrasi D1 produksi 0036–0046.
2. Verifikasi domain `centurisk97.id` di Resend, lalu ganti `EMAIL_FROM` (contoh `Pantau Bencana <kabar@centurisk97.id>`).
3. Pastikan secret `VAPID_PUBLIK`, `VAPID_PRIVAT`, `VAPID_SUBJEK` terpasang di Worker produksi.
4. Pasang secret `PIPA_TOKEN` (nilai acak yang sama) di Worker dan GitHub.
5. Tetapkan target waktu tahap SLA selain konfirmasi dan kabar.
6. Kirim surat akses data (`SURAT-AKSES-DATA.md`).

## 4. Yang tidak diklaim

- Uji balik historis ramalan bukan uji prospektif. Layar menyebut keduanya terpisah; peluang hanya tampil
  kalau gerbang prospektif lolos.
- Alarm Himawari adalah perkiraan lokasi dalam radius 2 km, bukan titik api.
- Jam ukur hanya sejujur isian lapangan; tahap tanpa isian dihitung "tidak ada data", bukan nol.
