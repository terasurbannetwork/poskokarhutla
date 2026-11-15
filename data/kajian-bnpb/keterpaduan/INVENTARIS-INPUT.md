# INVENTARIS-INPUT: Jalur masuk data non-publik (diukur 15 Nov 2026)

Pertanyaan pemilik 15 Nov 2026: semua data yang bukan data publik (data lapangan) sudah punya cara input? Jawaban: sebagian besar sudah; daftar yang belum ada di bagian 2. Angka baris "Luring" menunjukkan antrean IndexedDB yang akan disatukan oleh KP-09 sampai KP-15.

## 1. Sudah punya jalur

| Data | Tabel / R2 | Jalur | Pengisi | Luring |
| --- | --- | --- | --- | --- |
| Laporan warga | `laporan`, `suara` | web `/`, `/pesan` ke `POST /api/warga` (`src/worker.js:931`) | warga | tidak |
| Tugas api: konfirmasi, kabar, padam | `tugas_api`, `tugas_isian`, `tugas_kartu` | `/instansi` (`src/instansi.js:1685`) | BPBD, instansi | ya |
| Usulan kontak konsesi | `usulan_kontak_pt` | `/instansi` (`src/instansi.js:1692`) | instansi | tidak |
| Logbook harian petugas, absen wajah | `lp_logbook*`, `lp_absen`, `orang_wajah` | `/petugas` (`src/lapangan.js:554-558`) | petugas, relawan | ya |
| Panggilan relawan | `lp_panggil*`, `wa_antre` | WA `src/lapangan_wa.js`; impor CSV `src/lapangan_panel.js:448` | relawan, admin | - |
| Korban meninggal dan hilang | `korban` | `/instansi` (`src/korban.js:317`) | BPBD, admin | tidak |
| Inventaris alat, gudang, P3K | `alat`, `gudang`, `p3k` | `/instansi` (`src/inventaris.js:588`) | instansi | tidak |
| Stok LogPal | `logpal_*` | `/logpal` (`src/logpal.js:439`); impor lokal `scripts/logpal/impor.mjs` | gudang BNPB dan BPBD | tidak |
| Meja kerja (kaji cepat, logistik, DSP, renkon, destana, rehab, gudang, pengungsi, pengaduan, klaster, risiko, dampak) | `meja_catatan` | `/bnpb/meja` (`src/meja.js:850`); impor XLSX (`src/meja.js:857`) | petugas meja BPBD, ULP, Pusdalops | ya |
| Laporan Masuk Dalops | R2 `dalops/laporan.json`, `wa_masuk` | WA rekap Koordalops (`src/wa.js:101`); web `/bnpb/bahan` (`src/wa_form.js:52`) | Koordalops | tidak |
| Tindak lanjut langkah | `dl_tindak*` | `/bnpb/dalops` (`src/dalops_tindak.js:63`) | staf Dalops | tidak |
| Logbook Pusdalops | `logbook_*` | `/bnpb/logbook` (`src/logbook.js:495`) | Pusdalops, Koordalops | tidak |
| Lapsus, pemulihan, roll call, medsos | `lapsus_*`, `pemulihan*`, `rollcall_*`, `medsos_butir` | `/bnpb/operasi` | Pusdalops | tidak |
| Sortie OMC, target semai | `omc_*`, `op_semai_target` | admin OMC, `/operasi` | staf | tidak |
| Operasi lapangan (garis api, sumber air, patroli, drone, TMAT) | `ops_*` | `/instansi`, `/bnpb/operasi_lapangan` (`src/operasi_lapangan.js:856`) | instansi, staf | tidak |
| Penugasan regu dan posisi | `penugasan*` | `/lacak` (`src/penugasan.js:483`) | regu | ya |
| Laporan regu posko, neraca | `lapangan`, `regu`, `neraca_harian` | `/lapangan` (`src/posko.js:681`) | regu | ya |
| SIPPA lapangan, aset, inspeksi, stok, anggaran | `sippa_*` | `/pipa` (`src/sippa.js:1954`), `/renlap` bertoken | regu, staf SIPPA | ya |
| Uji pilot, uji lapangan banjir | `uji_pilot_lapor`, `uji_*` | `/pipa/uji_pilot`, `/uji-lapangan` | tim uji, instansi | sebagian |
| Pendataan Satu Data | `pdt_isian`, `pdt_berkas` | `/bnpb/pendataan` (`src/pendataan.js:416`) | akun pendataan | tidak |
| Relawan | `relawan*` | `/bnpb/relawan`, `/bnpb/relawan-saya` | relawan, kampus, admin | ya |
| Kontak | `kontak` | `/bnpb/kontak`; impor CSV admin | pemangku, admin | tidak |
| Rumah rusak | `rumah_rusak*` | `/rumah-rusak` (`src/rumah_rusak.js:176`) | regu, akun | tidak |
| Sensor | `sensor_baca` | API HMAC alat (`src/sensor.js:113`) | alat | - |
| Laporan Kejadian Harian, paparan | `laporan_bnpb` | `/laporan-bnpb` + impor PDF diurai LLM | staf | tidak |
| Laporan karhutla harian | `lk_*`, `lkb_*` | `/instansi` (`src/laporan_karhutla.js:616`) | BPBD, verifikator | tidak |
| Siklus: kejadian, kaji, renkon, gladi, Jitupasna, R3P | `sk_*` | `/siklus` | staf, BPBD | ya untuk pulih |
| Foto, alun-alun, riset, konfirmasi prediksi | `foto`, `alun_*`, `riset_*`, `prediksi_konfirmasi` | web masing-masing | warga, mitra | tidak |

## 2. Belum punya jalur atau baru sebagian

| Data | Keadaan | Ditutup oleh |
| --- | --- | --- |
| Status lifeline per kab (listrik, jalan, sinyal, air) | sebagian: unit vital di meja dampak, kendala di logbook; tidak ada status per kab | OUTSTANDING F1 |
| Siapa mengerjakan apa di mana (3W) | tidak ada | F3 |
| Tawaran bantuan | tidak ada | F4 |
| Titik pengungsian berkode tetap per putaran | sebagian: `nama_tempat` + `pendataan_ke` | KP-19, KP-20 |
| Kalimat staf Laporan Berkala | tidak ada (`data/kajian-bnpb/laporan-berkala/PRD.md`) | tiket LB |
| Pakar kemitraan | tidak ada (`src/kemitraan.js:96`) | OUTSTANDING E3, E5 |
| Perjanjian kemitraan (MoU) | sebagian: API ada, form layar tidak ada | E4 |
| Isian operasi udara manual | sebagian: API `src/operasi_isian.js:207`, form layar tidak ditemukan | tiket UD |
| Data padam lapangan untuk kalibrasi | sebagian: status padam di tugas api; impor log Daops dan Manggala Agni tidak ada | OUTSTANDING A3 |
| Luas terbakar resmi | tidak ada; pemilik melarang luas dari WA atau isian manual | OUTSTANDING A1 |
| Harga satuan Jitupasna | sebagian: diisi manual berlabel menunggu | tiket SK |
| Sisa DSP dan PFB | sebagian: meja DSP mencatat permohonan | F5 |
| Format Juklak 1, 5, 7, 11, 12 | belum dibangun | tiket juklak |
| Impor SIMAN, SAKTI, SIMDA | tidak ada | tiket LG |
| Insiden dan nyaris celaka operasi udara | belum dibangun | tiket UD |
