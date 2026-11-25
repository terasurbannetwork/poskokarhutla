# Celah lintas modul

> Pembaca: pemilik, penulis dokumentasi, dan pengembang. Keadaan per 24 November 2026. Pendamping [README.md](README.md). Berkas ini tidak mengubah isi 14 berkas modul; ia mencatat apa yang tidak terjangkau atau saling bertentangan di antara mereka.

## Cara daftar ini disusun

Tiga pemeriksaan dilakukan, semuanya dari isi repositori.

1. Nama berkas `src/*.js`, folder di `public/`, dan folder di `scripts/` dicocokkan dengan teks 14 berkas modul. Berkas yang namanya tidak muncul di satu pun berkas modul masuk bagian A. Pencocokan memakai nama berkas, sehingga fitur yang disebut tanpa nama berkas dicek ulang dengan pencarian kata kunci.
2. Bagian "Batasan dan pertanyaan terbuka" tiap modul dibaca, lalu klaim yang berpapasan di dua berkas atau lebih dibandingkan, termasuk dengan kode (`src/worker.js`) bila perlu. Hasilnya bagian B.
3. Kata yang dipakai di lebih dari satu modul dengan makna berbeda dicatat di bagian C.

Bagian D dan E menghimpun rancangan tanpa kode dan hal yang berkas modul sendiri tulis sebagai "belum terdokumentasi di kode". Bagian F menunjuk dokumen di luar folder ini yang usang menurut berkas modul.

Tiap butir menyebut bukti. Butir yang belum diperiksa per rute ditandai "perlu dicek".

## A. Fitur di kode yang tidak tercakup berkas modul mana pun

Semua butir berikut punya kode, migrasi, dan halaman di repositori, tetapi tidak punya bagian Metode atau Referensi teknis di 14 berkas. Sebagian disebut sepintas (kolom "Yang ditulis dokumen"). Peta modul `AGENTS.md` bagian 2 tidak memiliki baris tersendiri untuk butir-butir ini.

| No | Fitur | Bukti di kode | Yang ditulis dokumen | Akibat |
| --- | --- | --- | --- | --- |
| A1 | Relawan: rekrutmen, verifikasi, penugasan, jam kerja, relawan kampus lewat MoU | `src/relawan.js` (928 baris), migrasi `0023_relawan.sql`, `public/bnpb/relawan.*` dan `public/bnpb/relawan-saya.*`, rute `/relawan` dan `/relawan/saya` di `BNPB_BERSIH` (`src/worker.js:714`) | Kata "relawan" muncul di dokumen 12 (petugas lapangan) dan 13 (pemetaan relawan), yang keduanya fitur lain. Dokumen 12 hanya mencatat bahwa `/relawan/saya` tidak dialihkan ke `/petugas` | Aturan privasi relawan (tanpa NIK, kode pribadi, anonimisasi) hanya ada di komentar kode |
| A2 | Pendataan Satu Data (responden membuat akun, disetujui Super Admin, mengisi isian per unit) | `src/pendataan.js` (446 baris), migrasi `0060_pendataan.sql`, `public/bnpb/pendataan.*`, `/pendataan` di `PUBLIK_TANPA_SESI` | Dokumen 10 menyatakan pendataan "sengaja tidak tercakup"; dokumen 12 dan 14 hanya menyebut rutenya | Tidak ada berkas pemilik; sisa `/bnpb/*` terdokumentasi, bagian ini tidak |
| A3 | Laporan harian provinsi: Laporan Karhutla dan Laporan Kejadian Bencana Harian (draf dari server, setujui, kunci dengan snapshot dan sha256, koreksi sebagai ralat) | `src/laporan_karhutla.js` (618 baris), `src/laporan_bencana.js` (322 baris), migrasi `0032`, `0048`, spek `public/laporan_karhutla_spek.js` dan `public/laporan_bencana_spek.js`, draf terjadwal jam 0 UTC menit 1 dan 31 (`src/worker.js:1019`) | Dokumen 12 menyebut tab "Laporan harian provinsi"; dokumen 14 mendaftar tabel `lk_*` dan `lkb_*` dan jadwalnya | Alur persetujuan dan aturan "merah menahan setujui dan kunci" tidak diuraikan; tabel `lk_snapshot` adalah calon titik sambung segel dokumen (dokumen 12) |
| A4 | Keluaran laporan di peramban: konferensi pers, Matador, slide bahaya, laporan konsesi, impor laporan | `public/laporan_konpers.js`, `public/laporan_matador.js`, `public/laporan_bahaya_slide.js`, `public/laporan_konsesi.*`, `public/laporan_impor.js`, `public/laporan_koordalops.js` | Hanya `laporan_konsesi` disebut sekali; dokumen 10 hanya membahas `/laporan-bnpb` jenis harian dan presiden | Tidak jelas laporan mana yang resmi dipakai dan bagaimana hubungannya dengan generator di mesin pemilik (dokumen 14, Bot WhatsApp) |
| A5 | Command center operator: antrean peringatan tingkat 3 yang ditindaklanjuti operator | `src/command_center.js` (399 baris), migrasi `0099_command_center.sql` dan `0100_cc_tanpa_dinding.sql`, `public/admin/command_center.js`, peran `operator_cc` | Dokumen 07 dan 14 hanya menyebut peran `operator_cc` dalam tabel hak | Alur status baru, dalam konfirmasi, ada api, tidak ada api, dan pencatatan tiap klik hanya ada di komentar kode |
| A6 | Penugasan orang ke tugas api dan pelacak posisi lewat tautan `/lacak/<token>` | `src/penugasan.js` (504 baris), migrasi `0035_penugasan.sql`, `public/lacak.*` | Disebut sepintas di dokumen 08 dan 12 (nama rute) | Aturan token sekali tampil, geofence tiba otomatis, dan retensi posisi tidak terdokumentasi di folder ini |
| A7 | Meja Pantau (antrean kerja staf), Pengingat harian, Kabar seketika | `src/pantau.js` (399 baris, migrasi `0030`), `src/pengingat.js` (migrasi `0028`), `src/kabar.js` (migrasi `0043`, `0045`) | Dokumen 14 hanya mencantumkan jadwal cron | Aturan dedup butir dan percobaan ulang kabar tidak terdokumentasi |
| A8 | Waktu tanggap (SLA), papan kesehatan, dan Rapor BPBD | `src/sla.js` (266 baris, migrasi `0042`), `/admin/sla`, `src/kesehatan.js` (tab Kesehatan di `/admin/kinerja`) | Dokumen 10 menjelaskan IKU di `/kinerja-bnpb`, bukan SLA atau kesehatan | Hitungan tahap waktu deteksi sampai terverifikasi tidak dijelaskan |
| A9 | Uji lapangan karhutla: lima pertanyaan Q1 sampai Q5 dengan ambang dibekukan di pra-registrasi | `src/uji_lapangan.js` (409 baris), migrasi `0055`, `/uji-lapangan`, cron menit 20 (`src/worker.js:1026`) | Hanya jadwal cron di dokumen 14 | Metode uji yang justru menentukan kapan klasifikasi karhutla boleh disebut teruji tidak masuk daftar metode |
| A10 | Rumah rusak per rumah (RB, RS, RR) | `src/rumah_rusak.js` (185 baris), migrasi `0024_rumah_rusak.sql`, `/rumah-rusak` | Daftar rute dan prefiks R2 di dokumen 14 | Hak koreksi dan hubungan dengan Jitupasna (dokumen 09) tidak dijelaskan |
| A11 | Foto dan video lapangan warga, label foto, pembersih metadata, anti GPS palsu | `src/foto.js` (389 baris), `src/foto_label.js`, `src/media_bersih.js`, `src/gps.js`, migrasi `0007`, `0071`, `public/admin/labelfoto.js` | Tab Foto disebut sebagai pengguna di dokumen 05; prefiks R2 `foto/` di dokumen 14 | Aturan persetujuan admin dan pembuangan EXIF tidak terdokumentasi |
| A12 | Berita: kurasi tautan media sosial dan antrean verifikasi pantauan medsos ke logbook | `src/sosmed.js`, `src/medsos_antre.js` (migrasi `0012`, `0098`), `scripts/berita` | Dokumen 10 menyebut medsos sekali | Tab Berita di peta utama tidak punya penjelasan |
| A13 | Tab peta utama selain yang dibahas | Dokumen 01 mencatat 19 tab (`public/index.html:1737`) dan menyatakan Posko, Simulasi, Berita, Foto, Informasi, Laporan "dimiliki modul lain" | Hanya Dalops (dokumen 10), Operasi (dokumen 11), dan Simulasi (dokumen 03) punya uraian. Saham, Berita, Cluster, Posko, Monitor, Informasi, Foto, Laporan, dan Tentang tidak | Pembaca tidak punya tempat untuk bertanya tentang tab itu; `src/posko.js` (684 baris) dan `src/monitor.js` tidak terjangkau |
| A14 | Halaman Semua Bencana (`/semua`): situasi semua bencana dalam satu peta | `public/semua/` (index, kejadian, dampak, analisis, darurat) | Tidak disebut sama sekali | Halaman lintas bencana tanpa penjelasan di folder ini |
| A15 | Asisten AI berkas pengetahuan (teks dari txt, md, csv, json, docx, pptx, xlsx, indeks FTS5) | `src/ai_teks.js`, migrasi `0109_ai_pengetahuan.sql`, `public/ai/` | Disebut sepintas | Batas jenis berkas (PDF belum) tidak terdokumentasi |
| A16 | Atur drone ke gambut membara (`/admin/drone`), posisi pesawat ADS-B | `src/drone.js`, `public/admin/drone.js`; `src/adsb.js` (migrasi `0086`, cron menit 46) | Disebut sepintas di dokumen 01, 03, 11, 14 | Komentar kode menyebut tahap 1 hanya halaman; metode rute sapuan dan KMZ tidak terdokumentasi |
| A17 | Peringatan email EWS | `src/ews.js`, `src/ews_email.js` | Dokumen 03 menyebut email berdasarkan jejak api; dokumen 05 menyatakan rute dan tabel EWS email "tidak diuraikan" | Nama `ews` di registri ambigu terhadap paket panel EWS sensor (butir C8) |
| A18 | Skrip pendukung tanpa rujukan | `scripts/berita`, `scripts/panen`, `scripts/situs`, `scripts/statistik`, `scripts/warga`, `scripts/i18n`, `scripts/og`, `scripts/lapangan` | Tidak dirujuk di folder ini (hanya `src/lapangan*.js` yang dirujuk lewat dokumen 12) | Pemilik skrip tidak dapat diketahui dari dokumentasi ini |

Tiga halaman di `public/` yang berdiri sebagai halaman kerja dan tidak disebut di berkas modul: `public/monitor.html`, `public/rumah_rusak.html`, dan `public/laporan_konsesi.html`.

## B. Kontradiksi antarberkas

### B1. Apakah halaman bencana terbuka tanpa masuk

- Dokumen 04 menulis bahwa `/banjir` terbuka untuk publik tanpa masuk. Dokumen 05 menulis bahwa semua halaman gempa, gunung api, kekeringan, dan pesisir publik (tanpa masuk) kecuali dinyatakan lain. Dokumen 06 menulis `/cuaca/` publik tanpa masuk dan menyebut `/udara/` sebagai halaman publik. Dokumen 03 menulis bahwa warga umum dapat membuka tab publik di halaman utama.
- Dokumen 01 menulis bahwa `/` termasuk halaman terkunci di `centurisk97.id`. Dokumen 14 bagian Gerbang akses menulis bahwa di host terkunci semua halaman HTML wajib masuk lebih dulu dan halaman baru otomatis terkunci. Dokumen 07 menulis bahwa `/prediksi` tidak termasuk `PUBLIK_TANPA_SESI`.
- Kode: `halamanTerkunci` (`src/worker.js:774`) mengembalikan terkunci untuk rute di `HTML_RUTE`, dan `HTML_RUTE` memuat `ruteBencana()` yang berisi `/`, `/banjir/`, dan rute bencana lain dari registri (`src/worker.js:722`). Daftar pengecualian `PUBLIK_TANPA_SESI` (`src/worker.js:758`) berisi 15 jalur: `/lapangan`, `/petugas`, `/meja`, `/daftar-kontak`, `/renlap`, `/uji-pilot`, `/bantu`, `/presiden`, `/instansi`, `/siklus/kejadian`, `/bnpb/katalog-dokumen`, `/pendataan`, `/lapor`, `/lapor/lacak`, `/masuk`, `/alun-alun`. Halaman bencana tidak ada di sana.
- Kesimpulan sementara: bila kode itu berlaku di `centurisk97.id`, pernyataan "publik tanpa masuk" di dokumen 03 sampai 06 keliru untuk domain produksi; di alamat `workers.dev` lain (uji lokal) halaman memang terbuka (komentar `src/worker.js:717`). Perlu dicek per rute sebelum diperbaiki. Dokumen 12 (daftar tamu: `/masuk`, `/alun-alun`, `/lapor`, `/lapor/lacak`, `/instansi`, dan seterusnya) dan dokumen 10 (daftar lima jalur) masing-masing hanya memuat sebagian dari 15 jalur, sehingga tidak ada satu tempat yang memuat daftar lengkap.

### B2. Peringatan kepada masyarakat

- Dokumen 07 menulis bahwa seluruh layar `/prediksi` adalah alat bantu staf dan tidak menampilkan peringatan kepada masyarakat.
- Dokumen 08 menulis bahwa Lapor Bencana mengirim Web Push peringatan dini per kecamatan kepada warga, dengan tingkat dari `prediksi.json` yang sama, lewat cron menit 29 tiap jam (`src/worker.js:1032`).
- Dokumen 07 sendiri mencatat bahwa data itu dibaca fitur peringatan dini warga. Jadi dua pernyataan benar sekaligus pada lapisan berbeda, tetapi wewenang mengirim atas nama BNPB belum diputuskan (dokumen 08, bawaan sementara: berlabel prakiraan, bukan peringatan resmi). Tidak ada kalimat tunggal yang menyatukan keduanya. Dokumen 08 mencatat bahwa tingkat jenis yang belum mengalahkan baseline ditulis "(belum teruji)" di notifikasi, dan jenis angin (CEX) belum teruji secara bawaan.

### B3. Dua catatan untuk aksi yang tampak sama (drop heli dan water bombing)

- Dokumen 11 menulis bahwa cron menit 23 menjalankan `nilaiDropTertunda` hanya untuk operasi lapangan darat, bukan aksi udara.
- Dokumen 14 menamai langkah yang sama pada menit 23 "nilai drop heli tertunda". Komentar kode di `src/operasi_lapangan.js` menulis "log drop" untuk permintaan heli dan logistik.
- Operasi Udara (dokumen 11) memiliki hasil aksi water bombing sendiri dari satelit. Hubungan antara log drop heli di operasi lapangan darat dan hasil water bombing di Operasi Udara tidak dijelaskan di mana pun; bila satu aksi fisik tercatat di keduanya, ada risiko dihitung dua kali.

### B4. Definisi "hari" dan batas waktu laporan

- Angka utama titik panas memakai hari WIB kalender (dokumen 02, bagian 2).
- Luas terbakar di laporan harian memakai hari laporan (D-1 pukul 16.00, D pukul 16.00] WIB (dokumen 02, bagian 10).
- Dokumen 14 menyebut batas laporan penanganan karhutla pukul 18.00 WIB, sedangkan banjir, longsor, dan rob pukul 17.00 WIB; arsip sitrep terbit pukul 07 WIB; titik panas diambil dua putaran tambahan menjelang batas itu.
- Garis depan insiden dihitung tiap pukul 14.00 WIB (dokumen 01, bagian 6).
- Tidak ada tabel tunggal yang menyatakan batas hari mana dipakai untuk angka mana. Selisih 16.00 (dokumen 02) dan 18.00 (dokumen 14) belum dijelaskan hubungannya.

### B5. Faktor luas per titik dan selisih terhadap SiPongi

- Dokumen 01 dan 02 sepakat bahwa `peta_karhutla.py` memakai 4,12 dan 4,16 hektare per titik NOAA-20 dan NOAA-21, sedangkan `laporan.py` memakai 4,30 hektare per titik S-NPP. Ilmu agent `pipa-data` menulis 4,22 dan 4,36 (dokumen 02, Batasan).
- Dokumen 01 menulis bahwa uji Januari sampai Juli 2026 memberi 219.174 hektare, 8,5 persen di atas SiPongi. Dokumen 02 menulis bahwa perubahan dari cara lama "+20 persen terhadap SiPongi" pada periode yang sama. Kalimat kedua tidak menyatakan apakah 20 persen itu selisih cara lama atau cara baru; hubungan dengan angka 8,5 persen belum dijelaskan.
- Dua angka luas tinggal berdampingan (peta dan laporan), tanpa dokumen yang menyatakan angka mana dipakai untuk layar mana.

### B6. Aturan Prioritas provinsi

- Dokumen 02 menyajikan kajian dengan garis masuk 50 dan keluar 25 (rata-rata 7 hari), yang lulus uji tertahan.
- Dokumen 01 dan 02 sama-sama mencatat bahwa layar memakai rata-rata 3 hari dengan garis dasar 60 dan 30 yang dikalikan rasio satelit (180 dan 90 sampai 2 November 2026, 144 dan 72 sesudahnya).
- Yang lulus uji dan yang tayang berbeda, dan paket `data/kajian-bnpb/ambang-hotspot/` tidak memuat berkas keputusan. Jadi dasar tertulis aturan yang tayang hanya hasil uji ulang di skrip dan catatan pemilik.

### B7. Jadwal alur kerja GitHub dan cadangannya

- Dokumen 14 bagian Penjaga jadwal menulis bahwa GitHub membuang pemicu `schedule` secara luas pada 7 dan 8 November 2026, dan bahwa penjaga hanya memulihkan delapan alur kerja di daftar `JADWAL`: `titik.yml`, `himawari.yml`, `jarak_pandang.yml`, `udara.yml`, `semai.yml`, `data.yml`, `banjir.yml`, `gempa.yml`. Alur kerja lain yang terlewat tidak dipulihkan otomatis.
- Dokumen 07 menjelaskan `prediksi.yml` (`50 1 * * *` UTC), dokumen 09 menjelaskan `siklus.yml`, dan dokumen 13 menjelaskan `kemitraan.yml` (harian pukul 02.30 UTC), tanpa catatan bahwa ketiganya berada di luar daftar `JADWAL`.
- Akibat: kesegaran `prediksi.json` (dasar vonis di dokumen 07) dan berkas Siklus serta Kemitraan tidak dijamin oleh penjaga, sedangkan dokumen modulnya menulis jadwal seolah pasti berjalan. Pembaca perlu memeriksa `/api/status` (dokumen 14) sebelum menyimpulkan.

### B8. Perbedaan hitungan sensor dan alat di API

- Dokumen 14 mencatat bahwa `public/api.html` dan alat MCP `titik_api_terkini` menyebut tiga sensor, sedangkan kode dan dokumen 02 memuat empat (termasuk NOAA-21, dan S-NPP sudah berhenti per 1 November 2026). Halaman API juga mendaftar tujuh alat publik, sedangkan `src/mcp.js` menyediakan sebelas.

### B9. Dokumen paket yang tertinggal dari kode, atau sebaliknya, dengan dampak lintas modul

- Izin unduhan LiCSBAS: `KEPUTUSAN-PENURUNAN.md` Q1 masih menulis bawaan "tidak diizinkan"; catatan riset menulis izin diberikan 24 November 2026 dan dua putaran sudah dijalankan (dokumen 04). Dokumen 02 bagian lab InSAR gambut menulis hal serupa sebagai rancangan "belum ada kode"; hubungan antara jalur InSAR kota pesisir (dokumen 04) dan InSAR gambut (dokumen 02) hanya disebut "satu mesin InSAR" di `AGENTS.md`.
- Alun-alun: dokumen 10 menulis bahwa paket Alun-alun Terpadu baru punya migrasi `0150` dan tiket AT-03 sampai AT-12 belum dikerjakan, tetapi `src/alun.js` (364 baris) sudah berjalan sebagai forum dengan label lembaga (PM-15). Dokumen 08 memakai kata "Alun-alun" untuk hal lain (butir C3).
- Cara masuk akun pemda: dokumen 12 mencatat bahwa `ALGORITMA.md` pintu masuk tidak membedakan jenis akun, padahal kode mengecualikan pemprov, pemkab, dan pemkot dari kode WhatsApp.
- `AGENTS.md` bagian 2.39 menyebut `src/segel.js` dan `public/verifikasi.*` sebagai lokasi kode segel dokumen; berkas itu belum ada (dokumen 12).

## C. Istilah yang berbeda makna

| No | Istilah | Makna yang berbeda | Berkas |
| --- | --- | --- | --- |
| C1 | Waspada, Siaga, Awas, tingkat, level | Status banjir per kecamatan (04); tingkat resmi gunung api dari PVMBG (05); tanda WASPADA pada api baru yang diperkirakan membesar (03); status kekeringan SPI-3 (05); peringkat 0 sampai 3 pada prediksi dan Tangga (07); tingkat taktis cluster 0 sampai 3 (01, 02). Ambang dan arti tiap skala tidak sama dan tidak boleh dibandingkan | 01, 02, 03, 04, 05, 07 |
| C2 | Kejadian | Buku Besar `KJ-tahun-kode` (09); kejadian logbook dan Dalops (10); kejadian banjir aktif `B0007` (04); laporan warga `LA-DDMMYY-NN` (08); kluster karhutla `K####` yang diberi ulang tiap hari (02) dan padanannya `sel:i:j` di Buku Besar (09). Tidak ada satu kamus yang memetakan | 02, 04, 08, 09, 10 |
| C3 | Alun-alun | Forum publik warga di `/alun-alun` (10) dan kelompok laporan berstatus ditindaklanjuti di `GET /api/lapor/alun` (08) | 08, 10 |
| C4 | Insiden, kompleks, cluster, firespot, tugas api | Insiden api berumur panjang dengan nama desa dan bukti (01, 02); kompleks atau cluster adalah gugus titik tiga hari (02); firespot adalah penilaian ya atau mungkin per cluster (02); tugas api adalah pekerjaan akun instansi yang dibuat dari cluster tingkat 3 (belum punya bagian metode, butir A5 dan A6) | 01, 02, 12 |
| C5 | Terverifikasi | Laporan warga yang dinyatakan Valid oleh BPBD wilayahnya (08); label keyakinan angka di Siklus (09); peran verifikator (14); antrean verifikasi pantauan media sosial (A12) | 08, 09, 10, 14 |
| C6 | Titik panas | Angka utama lokasi unik per hari semua sensor dan keyakinan (02); titik mentah SiPongi atau GIS BNPB (01, 02); titik daftar Desa Waspada, hanya VIIRS dengan keyakinan sedikitnya nominal (01); titik NOAA-20 per `laporan.py` (02); deteksi Himawari (06) | 01, 02, 06 |
| C7 | Prioritas | Prioritas provinsi karhutla (01, 02); prioritas pemadaman tingkat 3 (02); skor prioritas sumber daya (03); provinsi prioritas laporan harian (A3); skor prioritas daerah Ruang Unit (10); skor prioritas masalah Kemitraan (13); prioritas pemetaan relawan (13); prioritas kartu pintu (09); "9 provinsi prioritas karhutla" untuk data sekolah dan fasilitas (05, 13) | 01, 02, 03, 05, 09, 10, 13 |
| C8 | EWS | Panel sensor dan CCTV banjir dan gunung api (paket `ews`, 04, 05); langganan email peringatan dini `src/ews.js` (A17); nama `ews` di registri; peringatan dini warga lewat PWA (08) | 03, 04, 05, 08 |
| C9 | Peluang | Peluang api baru membesar (03); peluang api 7 hari per sel (03); peluang hujan lebat dari ansambel yang bukan peluang banjir (04); peluang PM2,5 melewati batas (06); peluang kabupaten/kota 3 hari (07); peluang susulan gempa (05); peluang kekeringan bulan depan (07). Semuanya probabilitas dengan dasar dan kalibrasi berbeda | 03, 04, 05, 06, 07 |
| C10 | Lacak | Pelacak posisi petugas `/lacak/<token>` (A6); lacak laporan `/lapor/lacak` (08); pelacak peristiwa `lacak.py` (03); telusur asal asap lintasan mundur (06) | 03, 06, 08 |
| C11 | Meja | `/meja` meja kerja kabupaten/kota dengan kode (10); `/lapor/meja` meja laporan (08); Meja Pantau antrean staf (A7); meja operator command center (A5) | 08, 10 |
| C12 | Sitrep | Laporan Situasi harian `/sitrep` dengan arsip 07 WIB (10, 14); dokumen sitrep generik semua bencana yang saklarnya mati (11) | 10, 11, 14 |
| C13 | Operasi | Menu `/operasi` (11); Operasi Pusdalops `/bnpb/operasi` (10); tab Operasi di peta utama dan di `/udara` (01, 06); Operasi Darat (11); operasi lapangan darat di `src/operasi_lapangan.js` (B3) | 01, 06, 10, 11 |
| C14 | SPM | Standar pelayanan minimal pada Rapor SPM (09, rancangan); parameter kualitas udara pada keluaran stasiun (06) | 06, 09 |
| C15 | KIB | Kode Identitas Bencana 16 digit yang di repositori selalu berstatus usulan, disimpan di `logbook_kib` (10, 11); berbeda dari nomor kejadian `KJ-`, dan kolom nomor induk resmi sengaja dikosongkan karena format Perban tidak ditemukan (09) | 09, 10, 11 |
| C16 | Label kepastian | Hipotesis, belum diuji, belum teruji, belum unggul, belum_cukup, eksperimental, estimasi-model, asumsi-kebijakan, indikatif, perkiraan dipakai bergantian. Hanya sebagian punya definisi: enam label keyakinan di Siklus (09), tiga keadaan teruji di prediksi (07). Lihat [README.md](README.md) untuk pemetaan yang dipakai di daftar metode | semua |
| C17 | Pemirsa | Akun baca saja bertab pusdalops (10); daftar izin pemirsa tidak mencakup `/api/operasi/semai/*` sehingga pemirsa tidak lolos ke seksi semai (06, selisih 6); `/prediksi` boleh dibuka pemirsa bertab yang sesuai (07) | 06, 07, 10 |
| C18 | Hari, jendela 72 jam, 3 jam | Jendela hitung tiga hari lengkap Prioritas provinsi (01), aktif 72 atau 168 jam cluster (02), simulasi 72 jam (03), status cuaca 72 jam (06), prakiraan 3 hari (07), putaran FIRMS tiap 3 jam (14). Lihat juga butir B4 | semua |

## D. Rancangan tanpa kode yang berkas modul sendiri tandai

Daftar ini bukan celah di dokumen; ia membantu pembaca tidak menganggap rancangan sebagai fitur.

| Rancangan | Yang ada di repositori | Berkas |
| --- | --- | --- |
| Desa Waspada, Alat gambar wilayah | Paket dokumen di `data/kajian-bnpb/`; belum ada `scripts/data/desa_waspada.py`, `public/desa-waspada/`, atau `public/alat_gambar*` | 01 |
| Lab InSAR gambut | Paket dokumen; belum ada `scripts/data/insar_gambut.py` | 02 |
| Genangan satelit per kejadian, panel EWS, genangan tsunami, bangunan di lereng terjal | Paket dokumen; hanya kriteria GS-02 dan sebagian paket lereng (LT-03, LT-04, LT-06, LT-07, LT-12) terkodekan | 04, 05 |
| Prakiraan lawan Kejadian | Hanya PK-0 (paket dokumen) | 07 |
| Mode Tanya, kabar balik, ringkasan harian, penugasan, penilaian foto, halaman publik kejadian hari ini | Dokumen paket; kode sebagian (`lk_tarik`, `lk_usulan`, rute `GET /api/lapor/hari-ini`) | 08 |
| Rute luring `POST /api/lapor/luring` | Tidak ada; luring memutar ulang alur darurat | 08 |
| Layar kaji ulang, Rantai, Kalender Kewajiban, Rapor SPM, rute pembiayaan risiko | Kaji ulang punya rute API tanpa layar; Rantai tanpa tabel; pembiayaan baru migrasi `0148` dan uji skema | 09 |
| Alun-alun Terpadu (kotak masuk, balasan lembaga, rekap, kartu pimpinan), Laporan Berkala, Ruang Unit | Migrasi `0150`; tidak ada `scripts/berkala/` dan `src/laporan_berkala.js`; hanya `scripts/bnpb/unit/skor.py` dan `jalan.py` | 10 |
| Isian armada, kontrak, personel, foto operasi udara; zona terbang dan misi udara lengkap | Tabel ada, rute dan layar belum; `scripts/umum/zona_terbang.py` belum ada | 11 |
| Segel dokumen, kode QR di lembar cetak | Migrasi `0171`; tidak ada `src/segel.js` | 12 |
| Layar Masalah, Riset, Dana, Satgas, Talenta, Kampus, Dasbor Kemitraan; rute pencocokan pakar; pemetaan relawan (rute dan layar) | Kerangka kosong atau penampung 501; migrasi `0149` ada | 13 |

## E. Hal yang berkas modul sendiri tulis sebagai belum terdokumentasi di kode

- Peran dan akun yang boleh membuka `/` dan `/k/<id>`, serta tabel D1 khusus peta utama (dokumen 01).
- Isi lengkap kajian ambang hotspot (PDF, PPTX, Word) dan skrip analisisnya yang menurut catatan hanya ada di sesi lama (dokumen 01, 02).
- Nilai terkini `jejak_api.json` dan `prospektif.json` di produksi, karena berkas dibuat CI dan salinan lokal bertanggal 23 Oktober 2026 (dokumen 03).
- Jadwal cron putaran usulan Lifeline (dokumen 09; dokumen paket menyebut menit 22, kode menghitung saat halaman dibuka).
- Mekanisme penghapusan otomatis data pribadi tahap 2 lima tahun sesudah kejadian selesai (dokumen 08).
- Asal indeks `bahaya` longsor di `status.py` dan verifikasi ulang ambang yang menurut komentar lolos 2022 sampai 2025 (dokumen 05).
- Hasil pilot SIPPA di Kalimantan Timur dan vonis G4 (dokumen 13).
- Umur sesi akun kampus yang dokumen paket tulis 12 jam, belum diverifikasi di `src/kemitraan_akun.js` (dokumen 12).
- Daftar lengkap nama rahasia Worker dan GitHub beserta pemiliknya; prosedur pemulihan D1 dan R2; alur pasang bot WhatsApp di Windows (dokumen 14).
- `docs/prediksi/RANCANGAN.md` yang dirujuk komentar `src/prediksi.js` dan migrasi `0079` tidak diperiksa (dokumen 07).
- Rincian meja `/lapor/meja` bagi staf BNPB dan nomor PIC untuk buku kontak darurat hanya sebagian dibaca (dokumen 12).

## F. Dokumen di luar folder ini yang usang menurut berkas modul

- `AGENTS.md` peta modul menyebut cron Worker hanya FIRMS menit 15 dan bersih-bersih menit 17, padahal kode menjalankan lebih dari 30 tugas pada menit tetap (dokumen 14). Baris Kemitraan kampus di peta modul tidak memuat `scripts/pemetaan` dan `public/pemetaan` (dokumen 13).
- `docs/cara-kerja.md` menyebut dua sensor VIIRS dan data tiap 3 jam; kode memuat empat sensor dan S-NPP berhenti (dokumen 02).
- Ilmu agent `kampus`, `gunungapi-kering`, `gempa`, `prediksi`, dan `model-sebaran` memuat angka atau status yang sudah berubah (dokumen 05, 07, 13). Dokumen 05 mencatat dua butir ilmu `gunungapi-kering` yang kini keliru (`pop/<id>.json` dan uji `sim_tanggap`).
- Alur kerja `terbit_antre.yml`, `terbit.yml`, dan `lab.yml` masih menyebut cabang `staging` dan `claude/**`, padahal `AGENTS.md` bagian 3.3 melarang cabang selain `main` (dokumen 14).
- Berkas `wrangler.warga.jsonc` memuat `database_id` placeholder dan hanya `wrangler.jsonc` yang diterbitkan (dokumen 14).
- Komentar kode dan teks tampilan masih memuat nama produk lama pada beberapa tempat, antara lain `src/worker.js:1031` dan teks sumber arsip di `scripts/prediksi/catat.py:383` (dokumen 07, 08); nama yang berlaku adalah Centurisk97.
