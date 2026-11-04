---
name: fitur-disembunyikan
description: Ledger of UI elements the owner asked to hide/remove on Pantau Bencana (poskokarhutla) so they can be listed and restored later
metadata:
  node_type: memory
  type: project
  originSessionId: afa0be05-fef7-442d-b655-20ee6b7ff1e3
  modified: 2026-10-14T07:26:59.210Z
---

Owner said (14 Oct 2026): keep a list of everything they ask to hide, because they may later ask for the list and want some brought back. Append every new "hilangkan" request here with file + how to restore.

Hidden/removed on 14 Oct 2026:
- Posko (Ajuan) tab in map panel: `hidden` attr on `data-m="posko"` button, public/index.html. Posko layer tile hidden (`display:none` label) and not auto-on in "kini" mode.
- Insight card "Model sebaran — Coming soon" (sebModel): no longer pushed to Insight.EX, public/insight_sebaran.js.
- Cerita bab "Model sebaran — Coming soon": `${this.model()}` removed from render, public/cerita_karhutla.js (function model() still exists).
- Consent/privacy banner "Privasi kamu": RESTORED 19 Oct 2026 (owner: "nyalakan") so per-hazard statistik fills; `SPANDUK = true` in public/persetujuan.js. Header stats pill (below) still hidden.
- Share dialog: Ekspor tab (xlsx/pdf/pptx) removed from tab list; subtitle "Gambar siap unggah…"; size text "1080 × 1080 px · KB"; label "Tautan ke tampilan ini" (sr-only); hint "Membuka tab dan wilayah…"; Insight chart dropdown #bgEx — all public/bagikan.js.
- Tren: "Unduh CSV" button in risk table (data-rcsv), public/index.html (handler still exists).
- Laci kompleks: province name in header; "Teruskan ke: …" line; "pastikan ke KPH/ATR"; "2002–2026 · MODIS · langganan api" caption; "Kenapa status ini" replaced by visual "Penjelasan status".
- Tooltips/text: "3 hari terakhir vs sebelumnya" subtitle; "Prakiraan CAMS via Open-Meteo" footer on AQI tooltip; "terbakar" in year tooltip; "% dari total" when one province; "Ini peluang, bukan kepastian"; "Cara membaca SWIR" title; "iklim belum ada" soil text; Insight year-chart caption "Tahun El Niño rata-rata…".
- Share image: faint logo watermark in header.
- Cuaca PM2.5 days without data (columns dropped) and "belum ada data" legend item.
- cursor:help removed everywhere (css).

Related: [[gaya-kartu-insight]]

Added later 14 Oct 2026:
- Konsesi laci footnote "Porsi dari … bukan bukti siapa yang membakar" (public/konsesi.js).
- Insight sebDorong (rasio lahan/cuaca, toggle Lahan & konsesi / Cuaca & api) merged away — only sebLolos kept; sebUji (123 kejadian table) and sebGalat (validasi/kalibrasi) hidden: Insight.EX.splice in public/insight_sebaran.js.
- Cerita bab6 "Uji model" (peta teramati vs ramalan): removed from render in public/cerita_karhutla.js.
- Red stale-data banner #basi: `if (false && umur > 26)` in public/index.html.
- Header stats pill "N online · N tampilan · Statistik →": `if (true || …) return` in pil() public/persetujuan.js (/statistik page still reachable by URL).
- Kirim pesan dialog privacy note box (public/pesan.js).
- Tentang team: Alfatehan Septianta hidden via `"sembunyi": true` in public/data/tim.json.
- Panel Riwayat siaga strip: right-hand text (Agu awal – Okt akhir) removed; 36 dasarian boxes → 12 month boxes.
- Export CSV in Tren risk table; Posko ajuan still hidden; Manggala Agni restored (shown).
- Tab Kompleks: merged into bottom of Insight (#insightKompleks), "kompleks" in TAB_SEMBUNYI, /kompleks redirects to Insight; p-kompleks section emptied (public/index.html).
- Tab Metode: RESTORED to karhutla menu 29 Oct 2026 (removed from TAB_SEMBUNYI, added to monitor.html static nav; also removed from karhutla tab_sembunyi in public/bencana.json + sitemap test, commit 6bcd16cd); still absent from tentang.html nav.
- Hazard dropdown "Tentang kami" link removed (Tentang now in top nav).
- Search results group headers "Wilayah"/"Kompleks" removed.
- Share image: "Rekomendasi" block removed from provinsi & kompleks templates (TATA in bagikan.js).
- Angin layer: briefly turned off by default, then owner asked it back ON by default (14 Okt 2026).
- Citra Insight: three info boxes (Menembus asap tipis / Cukup jernih / Cadangan VIIRS) removed (public/citra.js).
- Konsesi table: 'Peta batas' column removed (public/konsesi.js).
- Peta hover card wilayah (kecamatan): stat 'posko' count removed (public/index.html kartuWil).
- Konsesi: tabel 'Status lahan' (titik/porsi/luas/kompleks/musim) dihapus; label 'Porsi titik panas di dalam dan di luar areal konsesi per provinsi' dihapus (public/konsesi.js).
- Insight sebLolos ('Model khusus "akan membesar" menangkap …' + tabel per lahan) hidden: splice commented out in public/insight_sebaran.js (14 Okt 2026).
- Tentang: kotak angka hidup (.bukti-sek: titik panas/kompleks/wilayah/berita/data satelit) and 'Landasan hukum peran masyarakat' (details.hukum) hidden via hidden attribute in public/tentang.html (14 Okt 2026).
- Tentang FAQ 'Bisakah saya memakai datanya?' removed; mentions of 'tab Metode' and 'Lihat tabel di bagian Cara kerja data' removed (public/tentang.html, 14 Okt 2026).
- Tentang FAQ 'Bagaimana cara melapor kejadian di lapangan?' (Lapor Warga, 112) removed (14 Okt 2026).
- Tentang FAQ 'Apakah situs ini mengumpulkan data pribadi saya?' removed (14 Okt 2026). Tentang hero mock map window (.panggung) replaced by 5-disaster photo grid background.
- Tentang 'Cara mengutip' box (#cara-mengutip) hidden (14 Okt 2026).
- Tentang kontak: kalimat 'Koreksi data kami prioritaskan. Dalam keadaan darurat, hubungi 112 atau BPBD setempat.' dan baris 'Situs: terasurban.com' dihapus (14 Okt 2026).
- Tentang kontak: tombol WhatsApp disembunyikan (`if (false && wa)`, 14 Okt 2026).
- Tentang: bagian Layanan (#fitur, 'Apa yang kami lakukan') disembunyikan via atribut hidden; nomor bagian diurutkan ulang 01-06 (14 Okt 2026).
- Tentang: bagian Sumber data (#sumber, kartu keterangan) disembunyikan; di Cara kerja: kotak 'Batas dan kejujuran', tiga prinsip, dan 'Jadwal pembaruan' disembunyikan; label 'Jawaban kami' dihapus (14 Okt 2026).
- Tentang: seluruh bagian 'Cara kerja data' (#cara-kerja) disembunyikan; nomor bagian kini 01 Latar belakang, 02 Siapa kami, 03 Rekam jejak, 04 FAQ (14 Okt 2026).
- Tentang kartu organisasi: kalimat peran (o.peran) dan tautan terasurban.com tidak dirender (14 Okt 2026).
- Tentang: semua label pil bagian (01 Latar belakang dst.) dan label hero 'Pemantauan bencana Indonesia' dihapus; peran & situs dihapus dari tim.json organisasi (14 Okt 2026).
- Insight kartu Musim 2026: tombol 'Bagikan video' sempat disembunyikan (14 Okt 2026); DIPULIHKAN 15 Okt 2026 setelah bug $q di rekamVideo dibetulkan. Tombol gambar (.bg-ex) di #ct-musim kini yang disembunyikan.
- Mobile (≤640px): pilihan bencana (details.bencana) dan tombol tema #tema disembunyikan; tab pindah ke menu garis tiga #burger (index.html, 15 Okt 2026).
- Pop-up situasi (public/sapa.js): kartu '50–300 km dari Daops' dan 'Tanpa Daops' (kompleks siaga jauh/tanpa Daops, pakai p.jarak_daops) dihapus beserta hitungannya (15 Okt 2026).
- Halaman Foto: judul 'Foto' + subjudul 'Foto dan video dari warga di lokasi, diperiksa admin sebelum tayang.' dihapus (public/foto.js, 15 Okt 2026).
- Overlay: ubin 'Bekas terbakar' (hilang_api) digabung ke ubin 'Hutan hilang'; dua lapisan tetap, dibedakan di legenda (public/lapisan5.js, 15 Okt 2026).
- Insight bab Pendorong (public/cerita_karhutla.js): baris keterangan 'Berapa kali lebih mungkin api membesar…' + pil 'N dari M titik api membesar · x%' disembunyikan (15 Okt 2026).
- Halaman Foto: toggle tampilan Galeri/Peta (.fg-mode, data-m) dihapus dari markup; lihatPeta() masih ada di public/foto.js untuk dipulihkan (15 Okt 2026).
- Halaman Foto: baris hitungan '81 foto & video dari 6 provinsi' (#fgRing) dihapus (public/foto.js, 15 Okt 2026).

Added 15 Oct 2026:
- Insight card "Penanganan" (factsheet Bakom): hidden 15 Oct 2026, RESTORED 17 Oct 2026 at owner request ("penanganan" back in Insight.EX after "bnpb").
- Pop-up situasi (public/sapa.js): baris waktu data 'Data 12 Okt 19.27 WIB' (.sp-wkt, jamWIB) di kepala dihapus (15 Okt 2026).
- Lapisan peta 'Foto' (public/foto.js P.nyala): tiap buka mulai mati, tidak lagi diingat di localStorage fl-lapis; checkbox index.html tanpa 'checked'. Bahasa (public/i18n.js pb-bahasa) pindah ke sessionStorage supaya kunjungan baru selalu ID (15 Okt 2026).

Added 16 Oct 2026 (20-hour run, banjir naik kelas L5, public/banjir/index.html TAB_SEMBUNYI):
- Banjir tabs hidden but reachable by URL: Posko, Informasi, Metode; Prakiraan, Wilayah siaga (daftar), Provinsi, Rob, Sungai (content moves into Insight/Peta in L6/L7); Keputusan, Sarana (to go under Posko). Berita, Dampak, Foto hidden until their content exists. Restore = remove id from TAB_SEMBUNYI.
- Banjir registry status `uji`: karhutla menu shows it as "Segera" until banjir upgrade done (public/bencana.json).
- Banjir peta (16 Okt): seg "Posko" in left panel (#panelMode hidden in public/banjir/peta.js) and Overlay tile "Rekomendasi posko" (`<label hidden>` + unchecked in public/banjir/index.html). Restore = remove hidden / re-add checked.
- Banjir (16 Okt, L6/L7): spanduk data basi #basi hidden via BASI_TAMPIL=false in public/banjir/mulai.js (karhutla parity); Tren: kartu "rekomendasi posko permanen" (kPosko) out of render order, CSV button and "Cara menghitung skor risiko" fold removed; Insight: exMusim/exDampak/exKab out of Insight.EX (window.InsightEx keeps them), header/subtitle/notes removed, Daftar CSV + search not carried over.

16 Okt 2026 (run 20 jam, modul baru, disembunyikan karena data/halaman belum ada — A18/A24):
- Gempa: tab Insight, Tren, Berita, Dampak, Foto disembunyikan di `public/gempa/tab.js`; hanya Peta + Tentang tampil. Registry gempa masih `mati`.
- Cuaca: tab Metode ada tapi tidak di menu; Tren dibuang (belum ada riwayat cuaca).
- Kekeringan: Metode ada tapi tidak di menu.
- Udara: lapisan dan kartu METAR otomatis hilang bila tidak ada laporan ≤ 12 jam; ISPU KLHK dibuang (tak terjangkau).
- Gunung api: KRB dibuang (lisensi tak jelas); kartu "Perubahan level" hilang bila kosong.
- Banjir Dampak: kerugian rupiah dibuang; Foto tanpa tombol "Ambil foto" sampai src/foto.js mengenal kategori banjir.

17 Okt 2026 — DIPULIHKAN: nama perusahaan & grup konsesi (disembunyikan 14 Okt). public/data/lahan/konsesi.geojson memuat lagi id/nama/grup (scripts/scrape/konsesi.py PUBLIK_KOLOM); data WALHI "Siapa di Balik Api?" di public/data/aktor_karhutla.json (scripts/data/aktor_walhi.py, cek silang VIIRS + /api/titik); tampil lewat public/aktor.js: 5 kartu Insight + garis merah & pil bendera di lapisan Konsesi. Nomor izin & kasus sanksi tetap tidak tampil. Belum: nama perusahaan per kompleks di laci/tooltip kompleks (konsesi_kompleks.py masih per jenis).

17 Okt 2026 (aktor karhutla, public/aktor.js): kartu Insight "PSN Merauke" (aktorPsn) dan "Tokoh politik" (aktorTokoh) dikeluarkan dari Insight.EX; fungsi exAktorPsn/exAktorTokoh tetap ada — pulihkan dengan menambahkan kembali ke splice. Pil "tokoh politik" di tabel perusahaan dan baris tokoh di tooltip ikut dibuang. Nama WALHI, kolom "WALHI" dan angka titik panas versi WALHI (titik_agu/titik_sep) tidak ditampilkan; sumber kartu ditulis "Kajian Peta Aktor Karhutla 2026". Data mentahnya masih di data/aktor_karhutla.json.

Added 17 Oct 2026:
- Hazard dropdown: only Karhutla clickable, other hazards shown disabled with "Soon" badge; "Semua bencana" and "Tentang kami" hidden; footer "Bencana" column hidden. Restore: empty `TAMPIL` set in public/inti/kepala.js and drop `&& x.id === "karhutla"` in public/kaki.js. Pages still reachable by URL.
- Aktor (public/aktor.js): flag pills on concession polygons no longer always on (one pill appears on polygon click); source line "Kajian Peta Aktor Karhutla" removed from all aktor cards; "(dugaan)" removed from group names; initials-logo fallback removed (no logo if none official).
- Aktor: 4 companies with no concession polygon hidden (filter in A.muat, public/aktor.js); Grace Putri Perdana shown with polygon province (cek.prov_peta).
- Header bell (link to /peringatan, Peringatan Dini page) replaced by "!" button #sapaBuka that opens the "Situasi karhutla hari ini" pop-up (public/sapa.js). Restore: put back the `<a class="iconbtn" href="/peringatan">` bell in public/index.html header. /peringatan still reachable by URL.
- Insight dirampingkan (17 Okt 2026): kartu `ytd`, `tahun`, `kec` dibuang dari `Insight.EX` karena dobel dengan Tren (fungsinya exYtd/exTahun/exKec tetap ada; pulihkan dengan menambah id ke EX). Kartu `luasTahun`, `luas`, `nasional`, `dunia` pindah ke Tren lewat `Insight.TREN` (#trenRiwayat), bab cerita "Penempatan regu" pindah ke Tren lewat `Cerita.reguKartu()` (public/index.html, public/cerita_karhutla.js). Kartu aktor kini dijangkar sesudah `bnpb` (public/aktor.js).
- Laporan harian (17 Oct 2026): "SiPongi 2026" and "BNPB dipadamkan" columns removed from the province table (tabelProv in public/laporan.js), plus the "Luas resmi" and "Operasi" source tiles and BNPB in the page footer. Data (`sipongi_ha`, `padam_ha`, `bnpb_sd`) is still in the JSON; restore from commit before this change.
- Insight "Laporan resmi" BNPB card (`bnpb`) and "Penanganan" card (`penanganan`, exPenanganan kept) removed from `Insight.EX` (17 Oct 2026, public/index.html); exBnpb still exists. Aktor cards now anchored after `paparan` (public/aktor.js). Restore: add "bnpb" back after "paparan" in EX and re-anchor aktor to "bnpb".
- Situs Centurisk97 (centurisk97.id, *.workers.dev; 19 Oct 2026): every Tentang hidden on all hazards. Tab button `[data-t=tentang]` and `a[href="/tentang"]` hidden by `html[data-situs=w]` rule in public/inti/kepala.css (karhutla already had its own rule in public/index.html). Worker redirects /tentang, /tentang-halaman, /<bencana>/tentang to peta (src/worker.js layaniHTML, test in tests/warga/api.test.mjs). pantau.terasurban.com unchanged. Restore: delete the CSS line and the `tt` redirect.
- Gempa laci "Kontak BPBD terdekat" (19 Oct 2026): built but hidden like karhutla "Respons terdekat" via `#laci [data-j="Kontak BPBD"]{display:none}` in public/gempa/gempa.css (data: public/data/bpbd.json, Kontak in public/gempa/kata.js). Restore: delete that CSS rule.

19 Oct 2026 (Ruang Koordinasi BNPB, [[ruang-bnpb]]):
- M8 Pengungsi terpilah: dicoret pemilik saat menyetujui rencana; tidak dibangun (bukan disembunyikan). Rancangannya ada di docs/bnpb/RENCANA-12-JAM.md §S7. Pulihkan = bangun sebagai meja ke-6 di src/meja_spek.js.
- Pintu /bnpb dan semua halamannya (/relawan, /alun-alun, /riset, /risiko, /sitrep, /kebutuhan, /meja) TIDAK ditautkan dari nav utama situs (default disetujui pemilik); hanya terbuka lewat URL. Di admin semuanya satu menu "Ruang Koordinasi". Pulihkan/buka = tambah tautan ke /bnpb di public/inti/kepala.js atau nav index.html.

22 Oct 2026:
- Tab panel "Posko (Ajuan)" (`#panelMode [data-m=posko]`, public/index.html) hidden: it had `hidden` but `#panelMode button{display:inline-flex}` overrode it; rule `#panelMode button[hidden]{display:none}` added. Restore: remove `hidden` from the button.
- Text "(perkiraan satelit)" removed from all screen labels, tooltips, legends, kab popup, riwayat chart, ringkasan, slides (commit 944bffc5; owner rule: never write "perkiraan satelit"). Kab popup now says "Bukan luas resmi."; slides say "hitungan satelit". Restore from commit before 944bffc5.

26 Oct 2026:
- Laci cluster: baris tombol Maps / WA / Lapor WA (`aksiLokasi(...)` di Laci.buka, public/index.html) dihapus karena Maps dobel dengan ikon di kepala; WA jadi ikon di kepala laci. "Lapor WA" ke Pusdalops BPBD terdekat ikut hilang dari laci (fungsi aksiLokasi tetap ada, masih dipakai risiko7.js). Pulihkan = tambahkan lagi baris aksiLokasi di awal .bd laci.

27 Oct 2026 (SIPPA /pipa):
- Menu Akses (jembatan) dibuang dari rel kiri: entri `akses` dipindah dari GRUP ke RINCIAN di public/pipa/app.js (rute /pipa/akses tetap hidup, layar_akses.js utuh). Pulihkan = kembalikan `{k: "akses", n: "Akses", i: "chevron-right"}` ke kelompok Operasi.
- Peta /pipa/peta: kartu judul Zona, teks "Pilih kompleks di peta…", cincin emas kompleks terpilih, dan baris "Sumber: …" di legenda dihapus. Pulihkan dari git sebelum commit 27 Okt.
- Kalkulator /pipa/hitung: pilihan HDPE (bahan, OD, SDR, suhu pipa, perimeter aktif) dicabut dari layar; mesin hitung.js tetap mendukung HDPE.

30 Oct 2026 (/akademisi):
- Tab "Pengadaan kajian" disembunyikan: entri `pengadaan` dicabut dari VIEW dan MUAT di public/akademisi.js (bangunPeng, section akv-pengadaan, rute /api/akademisi/data/pengadaan, dan R2 akademisi/pengadaan.json tetap utuh). Pulihkan = kembalikan dua entri yang tertulis di komentar dekat VIEW.
- Tab "Jurnal" disembunyikan 30 Okt: jurnal kini di profil kampus/lembaga penerbitnya (jurnalKampus di public/akademisi.js). 19 dari 77 jurnal (penerbit swasta, IAGI, HAGI, AHA Centre, PUPR SDA, KLHK) belum punya rumah sampai direktori lembaga dibangun. Pulihkan tab = dua entri di komentar dekat VIEW.
- 30 Okt (/direktori): bagian Anggaran di profil Wilayah dan rute /api/akademisi/data/wilayah_anggaran dicabut atas permintaan pemilik (sensitif, direktori dipakai juga oleh BPBD). Data mentah BTT DJPK 2024 (6 provinsi) tetap di scratchpad sesi, TIDAK diunggah ke R2.
- 30 Oct 2026: drone pill markers on the karhutla map (sim_armada.js `.sf-pl-d`) hidden via CSS rule at end of public/sim_armada.css. Restore: delete that rule.
- 31 Oct 2026 (/akademisi dan /direktori): dua tombol dummy 🧪/🧹 Super Admin di bawah kepala halaman disembunyikan atas permintaan pemilik. Panggilan `nanti(pasangDummyAk)` dicabut di public/akademisi.js (fungsi, #akDummy, rute dummy tetap utuh). Pulihkan = kembalikan panggilan itu.

Added 1 Nov 2026:
- Tab Foto: "foto" added to TAB_SEMBUNYI (public/index.html) and karhutla tab_sembunyi (public/bencana.json); Foto link removed from static nav in public/monitor.html. /foto still opens directly. Restore: undo those three.
- Header share button "Bagikan" (#bgBuka, all hazard pages via public/bagikan.js init): `b.style.display = "none"` line. Per-chart/per-card share buttons still shown. Restore: delete that line.
