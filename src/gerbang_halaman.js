/* Gerbang halaman Worker sebagai MODUL DAUN (PS-04): host terkunci, daftar putih PUBLIK_TANPA_SESI, HTML_RUTE, halamanTerkunci, perananGerbang, bolehHalaman, arah pemirsa.
   Tidak mengimpor worker.js, admin_halaman.js, atau peta_situs.js, jadi peta_situs.js dan admin_halaman.js bisa dimuat tanpa siklus. Kode dipindah apa adanya dari
   src/worker.js, src/pemirsa.js (arahPemirsa), src/akademisi.js (P_AKADEMISI), src/dalops.js (PERAN_DALOPS); modul asal mengekspor ulang.
   Satu-satunya yang tetap milik worker.js: tabel rute gabungan, dipasang lewat pasangTabelRute saat worker.js dimuat. */
import {ruteBencana} from "./bencana.js";
import {ruteDocs, jalurDocs, DOCS_HTML_LANGSUNG} from "./docs_rute.js";

let tabelRute = () => { throw new Error("gerbang_halaman: tabel rute belum dipasang (muat src/worker.js)"); };
export const pasangTabelRute = f => { tabelRute = f; };
export const P_AKADEMISI = ["verifikator", "pusdalops", "analis_konsesi", "udara", "tmc", "koordalops", "pimpinan", "kemitraan", "direktori"];   // direktori: peran yang HANYA membuka Direktori (2 Nov 2026)
export const PERAN_DALOPS = ["pusdalops", "koordalops", "pimpinan"];
/* menu atas Pusdalops (public/bnpb/menu_pusdalops.js) + peta utama (tab Operasi lapangan di "/operasi"): staf Pusdalops, Koordalops, Pimpinan
   (mis. akun Dirdalops) membuka halamannya di centurisk97.id; API tiap halaman tetap menjaga haknya sendiri (permintaan pemilik 3 Nov 2026) */
const MENU_PUSDALOPS = /^\/(bnpb\/(dalops|logbook|bahan|saham|dokumen|operasi|siaga|perencanaan)\/?)?$/;
/* Tab 'pusdalops' (9 Nov 2026) = MELIHAT semua menu Pusdalops (public/bnpb/menu_pusdalops.js), baca saja: halaman menu di bawah + "/?operasi" (peta utama, tab Operasi lapangan).
   Bukan tab peta, jadi tujuan alihnya /bnpb/dalops. Halaman /admin/* menjaga dirinya sendiri (halamanAdmin/kerangka lewat stafSesi); API: pemirsaLihat di src/staf.js. */
const HALAMAN_PUSDALOPS = /^\/(bnpb\/(dalops|logbook|bahan|saham|dokumen|operasi|siaga|perencanaan)|laporan-bnpb|daftar-kontak)\/?$/;
const awalTab = t => t === "pusdalops" ? "/bnpb/dalops" : "/" + t;
/* murni: halaman yang dibuka pemirsa -> null (boleh) atau alamat tab pertamanya. /kompleks bagian dari Insight; /sim/K0001 = tab sim.
   Banjir ikut tab yang sama (pemilik 28 Okt 2026): /banjir/ = peta, /banjir/<tab> = tab itu, selain itu ke /banjir/<tab pertama>. */
export function arahPemirsa(p, pathname, search = "") {
  if (p.tab.includes("pusdalops") && (HALAMAN_PUSDALOPS.test(pathname) || pathname === "/" && /(^|[?&])operasi(=|&|$)/.test(search))) return null;
  const s = pathname.split("/"), banjir = s[1] === "banjir";
  const seg = (banjir ? s[2] || "peta" : s[1]) || "", tab = seg === "kompleks" ? "insight" : seg;
  /* Monitor tidak punya tab di /banjir/: pemirsa ber-tab monitor melihat banjir lewat /monitor?bencana=banjir (migrasi 0077); tab pusdalops juga bukan tab banjir */
  const pb = banjir ? p.tab.find(x => x !== "monitor" && x !== "pusdalops") : p.tab[0];
  const ke = pb ? (banjir ? "/banjir/" + pb : awalTab(pb)) : p.tab.includes("monitor") ? "/monitor?bencana=banjir" : "/bnpb/dalops";
  if (banjir && tab === "monitor") return p.tab.includes("monitor") ? "/monitor?bencana=banjir" : ke;
  return tab !== "pusdalops" && p.tab.includes(tab) ? null : ke;
}
export const HOST_TERKUNCI = new Set(["centurisk97.id", "www.centurisk97.id"]);
/* host yang halamannya di balik login: domain + alamat workers.dev PRODUKSI (dan pratinjau versinya "<hash>-centurisk97...").
   Uji Setneg 1 Nov 2026: /monitor, /direktori dll. terbuka tanpa login lewat workers.dev. Host *.workers.dev lain (uji lokal) tetap terbuka. */
export const hostTerkunci = h => HOST_TERKUNCI.has(h) || h.endsWith("centurisk97.terasurbannetwork.workers.dev");
export const HTML_RUTE = [
  ...ruteBencana(),   // "/", "/banjir/", tab dan kejadian dari registry; bencana "mati" tanpa rute
  [/^\/tentang-halaman\/?$/, "/tentang.html", "/tentang-halaman"],   /* /tentang kini tab di index.html (registry) */   // html_handling "none" mematikan /tentang -> tentang.html otomatis
  [/^\/privasi\/?$/, "/privasi.html", "/privasi"],
  [/^\/syarat\/?$/, "/syarat.html", "/syarat"],
  [/^\/design-system\/?$/, "/design-system.html", "/design-system"],   // sistem desain web Centurisk97 (public/design-system*); token dibaca dari /inti/tema.css
  [/^\/design-system\/bnpb\/?$/, "/design-system-bnpb.html", "/design-system/bnpb"],   // sistem desain deck dan laporan BNPB
  [/^\/design-system\/sistem\/?$/, "/design-system-peta.html", "/design-system/sistem"],   // papan peta sistem: alur tiap modul dari sumber sampai layar (public/design-system-peta*)
  [/^\/peringatan\/?$/, "/peringatan.html", "/peringatan"],
  [/^\/laporan\/?$/, "/laporan.html", "/laporan"],
  [/^\/paparan\/?$/, "/paparan.html", "/paparan"],   // deck paparan rakor karhutla per provinsi (public/paparan*)
  [/^\/laporan-konsesi\/?$/, "/laporan_konsesi.html", "/laporan-konsesi"],   // laporan konsesi terbakar 2026, hanya *.workers.dev   // laporan harian karhutla (public/laporan.*)
  [/^\/presiden\/?$/, "/presiden.html", "/presiden"],
  [/^\/renlap-cetak\/?$/, "/renlap_cetak.html", "/renlap-cetak"],   // renlap rute udara siap cetak per base (public/renlap_cetak*, pola renlap_pdf.py); di centurisk97.id wajib masuk   // panel publik agregat karhutla untuk dashboard presiden (public/presiden*); boleh di-iframe dari domain mana pun
  [/^\/renlap-omc\/?$/, "/renlap_omc.html", "/renlap-omc"],   // renlap OMC per zona semai (public/renlap_omc*, data/kajian-bnpb/semai-awan SA-09)
  [/^\/bantu\/?$/, "/bantu.html", "/bantu"],   // halaman organisasi bertoken (#t=), CSP ketat di layaniHTML
  [/^\/uji-lapangan\/?$/, "/instansi_uji.html", "/uji-lapangan"],   // protokol + hasil uji lapangan karhutla (public/instansi_uji*, src/uji_lapangan.js); di centurisk97.id wajib masuk
  [/^\/kabar\/?$/, "/kabar.html", "/kabar"],   // kabar api prioritas per kabupaten, diteruskan Pusdalops ke WA BPBD (public/kabar*, data scripts/data/kabar_kab.py)
  [/^\/laporan-bnpb\/?$/, "/laporan_bnpb.html", "/laporan-bnpb"],
  [/^\/dokumen\/?$/, "/dokumen.html", "/dokumen"],   // generator dokumen: laporan dan data ke Excel, PDF, Word, PowerPoint (public/dokumen*)   // input + ekspor Laporan Harian & Paparan Presiden BNPB, hanya situs Centurisk97
  [/^\/monitor\/?$/, "/monitor.html", "/monitor"],   // monitor peringatan api untuk staf BNPB dan BPBD (public/monitor*, src/monitor.js); tetap tertutup di centurisk97.id, tiap API menjaga sesinya
  [/^\/direktori\/?$/, "/akademisi.html", "/direktori"],   // Direktori Kebencanaan (dulu /akademisi, nama diganti pemilik 30 Okt 2026): pakar, lembaga, inovasi, sistem data
  [/^\/akademisi\/?$/, "/akademisi.html", "/akademisi"],   // alamat lama, dialihkan 301 ke /direktori di layaniHTML   // direktori pakar kebencanaan (public/akademisi*, src/akademisi.js); halaman tertutup di centurisk97.id, datanya hanya lewat /api/akademisi bersesi staf
  [/^\/petugas\/?$/, "/petugas/index.html", "/petugas"],   // modul Pegawai dan Relawan Lapangan: layar petugas berkode (/lapangan milik regu Posko lama)
  [/^\/petugas\/panel\/?$/, "/petugas/panel.html", "/petugas/panel"],   // panel pimpinan modul Lapangan; tertutup di centurisk97.id (sesi staf), API menjaga hak
  [/^\/ai\/?$/, "/ai/index.html", "/ai"],   // Asisten AI internal staf (public/ai/, src/ai.js); tertutup di centurisk97.id, tiap API /api/ai/* menjaga sesi staf
  [/^\/prediksi\/?$/, "/prediksi/index.html", "/prediksi"],   // prediksi bencana per kab (public/prediksi/, src/prediksi.js); login hanya di hostTerkunci (seperti /monitor), TIDAK di PUBLIK_TANPA_SESI; data JSON statis publik
  [/^\/prediksi\/ringkas\/?$/, "/prediksi/ringkas.html", "/prediksi/ringkas"],   // Siaga 3 hari: halaman ringkas tanpa tab untuk staf (KEPUTUSAN-BESOK K18); terkunci seperti /prediksi
  [/^\/lapor\/?$/, "/lapor/index.html", "/lapor"],   // Lapor Bencana BNPB, pintu warga (public/lapor/, src/lapor_ai.js); publik (KEPUTUSAN-MASUK K14)
  [/^\/lapor\/lacak\/?$/, "/lapor/lacak.html", "/lapor/lacak"],   // halaman lacak bertoken ?t=, publik (K14)
  [/^\/lapor\/s\/[^/]+\/?$/, "/lapor/s/index.html", "/lapor/s"],   // tautan kabar selamat bertoken (LA-80/81, K91 D128): tamu, noindex; token tidak masuk statistik hit (kunci jalur "/lapor/s")
  [/^\/lapor\/hari-ini\/?$/, "/lapor/hari-ini.html", "/lapor/hari-ini"],   // kejadian hari ini dari laporan terverifikasi BPBD (lapor-kejadian K86, LK-06); publik, data dari /api/lapor/hari-ini di balik saklar LAPOR_HARI_INI
  [/^\/lapor\/data\/?$/, "/lapor/data/index.html", "/lapor/data"],   // data lanjutan BPBD (LJ-16): token tim di URL ditukar kuki; halaman tidak memuat data, API menjaga kuki tim atau sesi staf
  [/^\/lapor\/meja\/?$/, "/lapor/meja.html", "/lapor/meja"],   // meja laporan staf; tertutup di centurisk97.id, /api/lapor/meja* menjaga sesi staf
  [/^\/desa-waspada\/?$/, "/desa-waspada/index.html", "/desa-waspada"],   // Desa Waspada (public/desa-waspada/, data/kajian-bnpb/desa-waspada); publik (KEPUTUSAN-DESA K6)
  [/^\/verifikasi(?:\/[^/]{1,40})?\/?$/, "/verifikasi.html", "/verifikasi"],   // segel dokumen (segel-dokumen SG-08, K3 Q2): publik tanpa akun, kode di jalur; data hanya dari /api/verifikasi/<kode>
  ...ruteDocs(),   // /docs, /docs/<modul>[/<halaman>], /docs/pengembang/...: pola tertutup, dokumentasi publik Centurisk97 (public/docs/, src/docs_rute.js); terbuka di PUBLIK_TANPA_SESI, tanpa D1/API
];
/* Gerbang centurisk97.id: DEFAULT TERTUTUP. Halaman = /f/, HTML_RUTE, dan tiap rute GET di tabel RUTE yang bukan /api/, /admin (menjaga diri sendiri
   dan /admin/masuk harus terbuka), /ews/ (tautan surel konfirmasi/berhenti) atau /ubin/. Halaman baru otomatis ikut terkunci; yang boleh terbuka HARUS tercatat di sini. */
/* Cakupan: gerbang ini menutup CANGKANG HALAMAN (HTML, termasuk berkas .html yang dibuka langsung lewat run_worker_first di wrangler*.jsonc),
   BUKAN /data/*.json, JS, CSS, atau gambar: itu tetap aset statis publik tanpa Worker. */
export const PUBLIK_TANPA_SESI = new Map([["/lapangan", "regu lapangan masuk dengan KODE tanpa akun (keputusan pemilik 19 Okt 2026); kode dicek di tiap panggilan API"],
  ["/petugas", "pegawai dan relawan masuk dengan kode pribadi tanpa akun (KEPUTUSAN-LAPANGAN D5); kode dicek di tiap panggilan API"],
  ["/meja", "petugas BPBD membuka Meja Kerja dengan kode per kabupaten tanpa akun situs (keputusan pemilik 10 Nov 2026); halaman tanpa kode tidak memuat data, kode dan wilayah dicek di tiap panggilan API"],
  ["/daftar-kontak", "registrasi kontak pemangku kepentingan (kepala daerah, BPBD, TNI, Polri) yang tidak punya akun situs (permintaan pemilik 23 Okt 2026); hanya menulis baris menunggu, tidak membaca apa pun"],
  ["/renlap", "halaman HP Renlap SIPPA dibuka regu lapangan dengan tautan bertoken di fragmen #t=, tanpa akun (keputusan SIPPA 61, SP-140); data.json hanya terkirim bila token cocok (/api/renlap/data), halaman tanpa token kosong"],
  ["/uji-pilot", "regu uji pilot SIPPA Kalteng membuka dossier dan melapor dengan tautan bertoken, tanpa akun (keputusan pemilik 26 Okt 2026, keputusan SIPPA 59); token dicek di tiap panggilan API, halaman tanpa token kosong"],
  ["/bantu", "organisasi (NGO, dunia usaha, lembaga luar) menulis 3W dan tawaran dengan tautan bertoken tanpa akun (KEPUTUSAN-TIGA-W D4); halaman tidak memuat data, token di fragmen #t= dicek di tiap panggilan /api/bantu"],
  ["/presiden", "panel publik agregat karhutla untuk dashboard presiden, tanpa data pribadi (keputusan pemilik 22 Okt 2026)"],
  ["/instansi", "pemda, polisi, dan TNI masuk dengan username dan sandi akun instansi sendiri, bukan sesi admin (keputusan pemilik 21 Okt 2026); sesi, status aktif, dan cakupan wilayah dicek di tiap panggilan API"],
  ["/siklus/kejadian", "ringkasan publik satu kejadian (/siklus/kejadian/KJ-...) dibuka tamu tanpa akun (KEPUTUSAN-AWAL U3 bawaan, DESAIN-TEKNIS siklus 7.2): cangkang publik hanya memuat ringkasan yang sudah dipublikasikan KO; halaman dan API staf Siklus tetap wajib sesi (src/siklus.js)"],
  ["/bnpb/katalog-dokumen", "katalog dokumen repo, dibuka tanpa login untuk sementara (permintaan pemilik 9 Nov 2026); hanya daftar judul dan tautan GitHub, repo-nya sendiri publik"],
  ["/pendataan", "pendataan Satu Data BNPB: staf direktorat membuat akun sendiri tanpa akun situs (keputusan pemilik 26 Okt 2026); akun baru menunggu persetujuan Super Admin, sesi dan status aktif dicek di tiap panggilan API"],
  ["/lapor", "Lapor Bencana BNPB: warga melapor kejadian (KEPUTUSAN-MASUK K14, pemilik 19 Nov 2026); halaman tidak memuat data, pelapor masuk lewat /masuk dan nomor dari sesi dicek di tiap /api/lapor/*"],
  ["/lapor/lacak", "lacak laporan dengan tautan bertoken ?t= yang dikirim ke pelapor, tanpa akun (KEPUTUSAN-MASUK K14); halaman tanpa token kosong, token dicek di /api/lapor/lacak"],
  ["/lapor/s", "tautan kabar selamat yang dibagikan penanda sendiri kepada keluarga, tanpa akun (KEPUTUSAN-LAPOR-AI K91, D128); halaman tidak memuat data, token di jalur dicek di /api/lapor/s/:token"],
  ["/lapor/data", "layar tim pendataan BPBD dari tautan WA (lapor-lanjutan LJ-15, KEPUTUSAN-MASUK K17); halaman tidak memuat data, token ?t= ditukar kuki tim lewat /api/lapor/data/masuk dan tiap API menjaga kuki tim atau sesi staf"],
  ["/lapor/hari-ini", "kejadian hari ini dari laporan warga terverifikasi BPBD untuk wartawan dan warga (lapor-kejadian K86, KEPUTUSAN-MASUK K15); halaman tidak memuat data, kartu dari /api/lapor/hari-ini berdaftar putih kolom dan di balik saklar LAPOR_HARI_INI"],
  ["/verifikasi", "pemeriksaan keaslian dokumen bersegel lewat kode di bawah QR, terbuka tanpa akun (KEPUTUSAN-SEGEL K3, Q2); halaman tidak memuat data, sampul dokumen dari /api/verifikasi/<kode> yang berlaju dan tanpa angka isi"],
  ["/desa-waspada", "daftar desa dengan titik panas 7 hari dan desa berulang terbakar, publik (KEPUTUSAN-DESA K6, pemilik 25 Nov 2026, KEPUTUSAN-MASUK K20); halaman tidak memuat data, JSON statis tanpa koordinat titik dan tanpa nama orang"],
  ["/bnpb/data-bencana", "Data Bencana Indonesia (tren, sebaran, tabel kejadian DIBI) publik (KEPUTUSAN-MASUK K22, pemilik 25 Nov 2026); halaman tanpa API, hanya JSON statis publik dibi_*.json tanpa nama orang"],
  ["/docs", "dokumentasi Centurisk97 (cara kerja, metode, referensi) terbuka tanpa login (KEPUTUSAN-DOCS Q1 bawaan); hanya HTML statis hasil scripts/docs/bangun.py, tanpa data pribadi, tanpa API, tanpa tulis; jalur dikunci ke pola tertutup (segmen [a-z0-9-], paling dalam 3 segmen)"],
  ["/laporan-konsesi", "laporan konsesi terbakar 2026 publik (PETA-SITUS Q3, bawaan diterima pemilik 25 Nov 2026, KEPUTUSAN-MASUK K24); cangkang tanpa API, isinya JSON statis publik /data/konsesi2026/* tanpa nama orang; di luar alamat Centurisk97 tetap 404"],
  ["/masuk", "pintu masuk satu nomor WhatsApp dan kode sekali pakai harus bisa dibuka tamu (keputusan pemilik 15 Nov 2026, K8); halaman tidak memuat data, kode dan sesi dicek di tiap panggilan /api/masuk/*"],
  ["/alun-alun", "forum alun-alun dibuka tamu tanpa login (keputusan pemilik 15 Nov 2026, K8: \"alun alun\"); tulis dan baca lewat /api/alun* yang berlaju dan ber-Turnstile, daftar relawan dan peta utama tetap terkunci"]]);
export function halamanTerkunci(url) {
  const jalur = url.pathname.replace(/\/+$/, "") || "/";
  if (url.pathname === "/desa-waspada/index.html") return false;   // alamat langsung berkas, sama dengan jalur bersih (K6)
  if (/^\/lapor\/(index|lacak|s\/index|data\/index)\.html$/.test(url.pathname) || /^\/lapor\/s\/[^/]+$/.test(jalur)) return false;   // alamat langsung pintu Lapor dan tautan lacak lama (/lapor/lacak.html?t=), sama dengan K14
  if (url.pathname === "/verifikasi.html" || /^\/verifikasi\/[^/]{1,40}$/.test(jalur)) return false;   // halaman segel publik: kode di jalur (KEPUTUSAN-SEGEL K3)
  if (DOCS_HTML_LANGSUNG.test(url.pathname)) return false;   // alamat langsung berkas Docs (keluaran generator), publik seperti /docs (DC-03)
  if (/\.html$/i.test(url.pathname)) return true;   // berkas HTML statis dibuka langsung lewat nama (Worker dipanggil hanya untuk pola ini)
  if (PUBLIK_TANPA_SESI.has(jalur) || jalurDocs(jalur)) return false;
  if (url.pathname.startsWith("/f/") || HTML_RUTE.some(([re]) => re.test(url.pathname))) return true;
  const kunci = /\/[0-9a-f]{16}$/.test(jalur) ? jalur.slice(0, -16) + ":id" : jalur;
  if (/^\/command-center(\/|$)/.test(jalur)) return false;
  if (jalur === "/instansi/data-bencana") return false;   // menjaga dirinya sendiri (src/instansi.js): staf atau akun instansi aktif, tanpa sesi 303 ke /instansi
  if (jalur === "/instansi/logpal" || jalur === "/logpal/index.html") return false;   // LogPal menjaga dirinya sendiri (src/logpal.js halaman): tanpa sesi sah 303 ke /instansi; BUKAN daftar putih (keputusan pemilik 9 Nov 2026: wajib login)   // meja menjaga dirinya sendiri (src/command_center.js): tamu 303 ke /admin/masuk?ke=
  return !!tabelRute()["GET " + kunci] && !/^\/(api|admin|ews|ubin|pipa)(\/|$)/.test(jalur);   // /pipa* menjaga dirinya sendiri (src/sippa.js, DESAIN-TEKNIS SIPPA §1.4): tamu 303 ke /admin/masuk?ke= (satu pintu)
}
/* Peran staf yang membuka halaman terkunci di centurisk97.id (selain admin): operator command center melihat semuanya, staf berperan Direktori membuka /direktori, peran Dalops membuka menu Pusdalops. Satu sumber untuk gerbang di fetch() DAN bolehHalaman. */
export const perananGerbang = jalur => /^\/direktori\/?$/.test(jalur) ? ["operator_cc", ...P_AKADEMISI] : MENU_PUSDALOPS.test(jalur) ? ["operator_cc", ...PERAN_DALOPS] : ["operator_cc"];
/* Murni: apakah satu halaman (rute, boleh berbuntut ?query atau #fragmen) dibuka Worker untuk sesi ini? Cermin gerbang fetch(): /uji-lapangan (admin atau pemirsa, semua host),
   /kemitraan* dan /siklus* (modul menjaga dirinya, sebelum gerbang host), lalu gerbang centurisk97.id (halamanTerkunci, admin, perananGerbang, tab pemirsa).
   sesi = {jenis: "admin"|"staf"|"pemirsa"|..., peran: [], tab: []}. Hak per halaman (HALAMAN_STAF, gerbang modul) tidak dihitung di sini. */
export function bolehHalaman(rute, sesi, terkunci = true) {
  const [depan, ...sisa] = String(rute).split("#")[0].split("?"), jalur = depan || "/", jenis = sesi?.jenis, peran = sesi?.peran || [];
  if (/^\/uji-lapangan\/?$/.test(jalur)) return jenis === "admin" || jenis === "pemirsa";
  if (jalur === "/kemitraan" || jalur.startsWith("/kemitraan/") || jalur === "/siklus" || jalur.startsWith("/siklus/")) return true;
  if (!terkunci || !halamanTerkunci(new URL(jalur, "https://x.invalid"))) return true;
  if (jenis === "admin") return true;
  if (jenis === "staf" && peran.some(p => perananGerbang(jalur).includes(p))) return true;
  if (jenis === "pemirsa") return arahPemirsa({tab: sesi.tab || []}, jalur, sisa.length ? "?" + sisa.join("?") : "") === null;
  return false;
}
