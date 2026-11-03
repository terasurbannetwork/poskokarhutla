/* Kerangka HTML halaman admin. Dilayani worker (bukan aset statis) supaya /admin/* hanya terbuka setelah masuk.
   Skrip & gaya di public/admin/ (tanpa data; datanya dari /api/statistik dan /api/pesan yang dijaga sesi). */
import REGISTRY from "./bencana.generated.js";
import {hidup} from "./bencana.js";
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const kepala = judul => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${judul}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/admin/admin.css?v=8" rel="stylesheet">
</head>`;
/* Tiga halaman admin: emoji = kunci pindai di nav & judul (selera-pinka #43). */
const HAL = {statistik: ["📊", "Statistik"], pesan: ["📨", "Kotak pesan"], foto: ["📸", "Foto lapangan"], labelfoto: ["🏷️", "Label kerusakan"], sosmed: ["📱", "Media sosial"], posko: ["🧯", "Ruang Posko"],
  relawan: ["🙋", "Relawan"], alun: ["🏛️", "Alun-alun"], riset: ["🎓", "Riset"], meja: ["🗂️", "Meja Kerja"], gakkum: ["⚖️", "Berkas Gakkum"], pimpinan: ["🧭", "Layar Pimpinan"], pengingat: ["⏰", "Pengingat"], pantau: ["📋", "Meja Pantau"], instansi: ["🏢", "Akun Instansi"], inventaris: ["📦", "Inventaris alat"], korban: ["🕯️", "Korban jiwa"], "laporan-karhutla": ["📑", "Laporan Karhutla"], omc: ["🌧️", "Sortie OMC"], laporan: ["📋", "Ruang Laporan"], kinerja: ["📈", "Kinerja pemantauan"], akun: ["👥", "Akun & Akses"], "kunci-api": ["🔑", "Kunci API"], kontak: ["📇", "Buku kontak"], pipa: ["💧", "SIPPA"], pendataan: ["🗃️", "Pendataan"], "command-center": ["🎛️", "Command center"]};
/* halaman Ruang Koordinasi BNPB: SATU entri di nav atas, lalu sub-nav di bawahnya (nav atas tetap muat di 1440) */
const BNPB = ["pimpinan", "relawan", "alun", "riset", "meja", "pengingat", "gakkum", "pantau", "inventaris", "korban", "laporan-karhutla", "omc", "laporan", "kinerja", "pendataan"];
/* sub-nav yang sama juga tampil di Akun Instansi (kerja harian staf: Laporan Karhutla, OMC, Inventaris, Meja Pantau) */
const SUB = BNPB.flatMap(k => k === "pantau" ? [k, "instansi"] : [k]);
/* Halaman yang boleh dibuka SESI STAF per peran (null = semua staf). Sama dengan hak API-nya: instansi = P_VALIDASI + P_KONSESI (src/staf.js), inventaris = PERAN_LIHAT (src/inventaris.js),
   omc = PERAN_BACA (src/omc.js), posko = P_KONSESI. Dijaga tests/warga/staf_halaman.test.mjs. */
/* semua peran staf (sama dengan Object.keys(PERAN) di src/staf.js; dijaga tests/warga/sla.test.mjs): hak baca Kinerja pemantauan = adminOK ATAU sesi staf dengan peran apa pun, dipakai halaman /admin/kinerja DAN GET /api/sla */
export const SEMUA_PERAN = ["verifikator", "pusdalops", "analis_konsesi", "udara", "tmc", "koordalops", "pimpinan", "operator_cc"];   // sengaja TANPA kemitraan: peran modul Kemitraan Kampus tidak membuka /admin/kinerja dan /api/sla; operator_cc ikut (melihat semuanya, baca saja)
export const HALAMAN_STAF = {pantau: null, kinerja: SEMUA_PERAN, instansi: ["verifikator", "pusdalops", "analis_konsesi"], inventaris: ["pusdalops", "verifikator", "pimpinan", "koordalops", "operator_cc"], korban: ["pusdalops", "verifikator", "pimpinan", "koordalops"], "laporan-karhutla": null, laporan: null, omc: ["tmc", "koordalops", "pimpinan", "operator_cc"], posko: ["analis_konsesi"],
  pipa: ["pusdalops", "koordalops", "pimpinan"],   // SIPPA = P_SIPPA_BACA (src/sippa.js; dijaga tests/warga/staf_halaman.test.mjs); GET /admin/pipa hanya 303 ke /pipa
  "command-center": ["operator_cc", "koordalops", "pimpinan"]};   // meja operator = pelaku() src/command_center.js (dijaga tests/warga/command_center.test.mjs); GET /admin/command-center hanya 303 ke /command-center
/* halaman yang dibuka sekumpulan peran staf: [{k, ikon, label}] (layar /admin/akun menampilkannya sebagai "Akses") */
export const aksesStaf = peran => [...Object.keys(HALAMAN_STAF).filter(k => bolehStaf(k, peran)).map(k => ({k, ikon: HAL[k][0], label: HAL[k][1]})),
  ...(peran.includes("direktori") ? [{k: "direktori", ikon: "📇", label: "Direktori", href: "/direktori"}] : [])];
/* null = semua peran KECUALI 'direktori' (peran itu hanya membuka Direktori, src/staf.js hanyaDirektori) */
export const bolehStaf = (k, peran) => Object.hasOwn(HALAMAN_STAF, k) && (HALAMAN_STAF[k] === null ? peran.some(p => p !== "direktori") : peran.some(p => HALAMAN_STAF[k].includes(p)));
const subNav = (aktif, ctx) => SUB.includes(aktif) && !ctx ? `<nav class="ad-sub" aria-label="Ruang Koordinasi">${SUB.map(k => `<a href="/admin/${k}" ${aktif === k ? 'aria-current="page"' : ""}>${HAL[k][0]} ${HAL[k][1]}</a>`).join("")}</nav>` : "";
const atas = (aktif, ctx) => ctx ? `<header class="ad-top">
  <a class="ad-logo" href="/"><img src="/img/logo.svg?v=2" alt="" width="30" height="30">Centurisk97</a><span class="ad-sep staf">Staf</span>
  <nav aria-label="Halaman staf">${Object.keys(HALAMAN_STAF).filter(k => bolehStaf(k, ctx.peran)).map(k => `<a href="/admin/${k}" ${aktif === k ? 'aria-current="page"' : ""}>${HAL[k][0]} ${HAL[k][1]}</a>`).join("")}</nav>
  ${ctx.nama ? `<span class="ad-staf-nama">${esc(ctx.nama)}</span><button class="ad-keluar" type="button" data-staf-keluar>Keluar</button>` : ""}
</header>` : `<header class="ad-top">
  <a class="ad-logo" href="/"><img src="/img/logo.svg?v=2" alt="" width="30" height="30">Centurisk97</a><span class="ad-sep">Admin</span>
  <nav>${Object.entries(HAL).filter(([k]) => k !== "labelfoto" && (!BNPB.includes(k) || k === BNPB[0])).map(([k, [ik, l]]) => BNPB.includes(k)
    ? `<a href="/admin/${k}" ${BNPB.includes(aktif) || aktif === "instansi" ? 'aria-current="page"' : ""}>🏛️ Ruang Koordinasi</a>`
    : `<a href="/admin/${k}" ${aktif === k || (k === "foto" && aktif === "labelfoto") ? 'aria-current="page"' : ""}>${ik} ${l}${k === "pesan" ? '<b class="ad-badge" id="badgePesan" hidden></b>' : ""}</a>`).join("")}</nav>
  <form method="post" action="/admin/keluar"><button class="ad-keluar" type="submit">Keluar</button></form>
</header>`;
/* Kerangka bersama: header, judul halaman (ikon + judul + slot aksi kanan #aksiJudul), lalu isi #app yang diisi skripnya. */
const halaman = (k, memuat, ekor, ctx) => `${kepala(`${HAL[k][1]} · Centurisk97`)}
<body${ctx ? ` data-staf="1" data-peran="${esc(ctx.peran.join(","))}"${ctx.nama ? ' data-masuk="1"' : ""}` : ""}>
${atas(k, ctx)}
<main class="ad-wrap">
  ${subNav(k, ctx)}
  <div class="ad-judul"><span class="ad-ikon" aria-hidden="true">${HAL[k][0]}</span><h1>${HAL[k][1]}</h1><div class="ad-judul-aksi" id="aksiJudul"></div></div>
  <div class="ad-isi" id="app"><p class="ad-redup">${memuat}</p></div>
</main>
${ekor}
</body></html>`;

export const halamanMasuk = (galat, ke = "", merek = "Centurisk97") => `${kepala("Masuk · " + merek)}
<body class="ad-masuk">
<div class="ad-cahaya" aria-hidden="true"><i></i><i></i><i></i></div>
<main class="ad-kartu-masuk">
  <div class="ad-kepala-masuk">
    <img src="/img/logo.svg?v=2" alt="" width="64" height="64">
    <h1>${esc(merek)}</h1>
    <p>Masuk staf dan admin</p>
  </div>
  <div class="ad-garis"></div>
  <div class="ad-isi-masuk">
    <h2>Login</h2>
    <form method="post" action="/admin/masuk${ke ? "?ke=" + encodeURIComponent(ke) : ""}">
      <div class="ad-isian">
        <input id="email" name="email" type="text" placeholder=" " autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus>
        <label for="email">Username atau email</label>
      </div>
      <div class="ad-isian">
        <input id="sandi" name="sandi" type="password" placeholder=" " autocomplete="current-password" required>
        <label for="sandi">Kata sandi</label>
        <button class="ad-mata" type="button" tabindex="-1" aria-label="Tampilkan sandi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z"/><circle cx="12" cy="12" r="3"/><path class="coret" d="m2 2 20 20"/></svg></button>
      </div>
      ${galat ? `<p class="ad-galat" role="alert">${esc(galat)}</p>` : ""}
      <button class="ad-tombol-masuk" type="submit">Masuk</button>
    </form>
    <p class="ad-catatan">Sesi berlaku 12 jam. Percobaan masuk dibatasi.</p>
  </div>
</main>
<script src="/admin/masuk.js?v=2"></script>
</body></html>`;

export const halamanStatistik = () => halaman("statistik", "Memuat statistik…", `<script src="/admin/statistik.js?v=2"></script>`);

export const halamanPesan = () => halaman("pesan", "Memuat pesan…", `<script src="/admin/pesan.js?v=2"></script>`);

export const halamanFoto = () => halaman("foto", "Memuat antrean foto…", `<link href="/admin/foto.css?v=2" rel="stylesheet">
<script src="/admin/foto.js?v=2"></script>`);

/* Label kerusakan foto (/admin/labelfoto): bagian dari kelompok Foto lapangan (tidak di nav atas; tautannya tab di /admin/foto) */
export const halamanLabelFoto = () => halaman("labelfoto", "Memuat foto…", `<link href="/admin/labelfoto.css?v=1" rel="stylesheet">
<script src="/admin/labelfoto.js?v=1"></script>`);

export const halamanSosmed = () => halaman("sosmed", "Memuat post…", `<link href="/admin/sosmed.css?v=1" rel="stylesheet">
<script src="/admin/sosmed.js?v=1"></script>`);

export const halamanPosko = ctx => halaman("posko", "Memuat Ruang Posko…", `<link href="/admin/posko.css?v=1" rel="stylesheet">
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/posko.js?v=2"></script>`, ctx);

/* Akun Instansi & Tugas Api (/admin/instansi): helper bersama bersama.js lalu skrip halaman */
export const halamanInstansi = ctx => halaman("instansi", "Memuat Akun Instansi…", `<link href="/admin/instansi.css?v=3" rel="stylesheet">
<link href="/instansi_kebutuhan.css?v=1" rel="stylesheet">
<link href="/instansi_kartu.css?v=1" rel="stylesheet">
<link href="/instansi_tugaskan.css?v=1" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/instansi_kebutuhan.js?v=2"></script>
<script src="/instansi_akses.js?v=1"></script>
<script src="/instansi_kartu.js?v=1"></script>
<script src="/instansi_tugaskan.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/instansi.js?v=6"></script>`, ctx);

/* Inventaris peralatan pemadam (/admin/inventaris): peta gudang digambar SVG sendiri oleh skrip halaman, jadi CSP admin tidak berubah */
export const halamanInventaris = ctx => halaman("inventaris", "Memuat inventaris alat…", `<link href="/admin/inventaris.css?v=1" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/inventaris.js?v=2"></script>`, ctx);

/* Laporan korban jiwa (/admin/korban): peta titik digambar SVG oleh skrip halaman (CSP admin tidak berubah) */
export const halamanKorban = ctx => halaman("korban", "Memuat laporan korban…", `<link href="/admin/korban.css?v=1" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/inti/foto_kecil.js?v=1"></script>
<script src="/admin/korban.js?v=2"></script>`, ctx);

/* Laporan Karhutla otomatis (/admin/laporan-karhutla): berkas klien memakai garis bawah (public/admin/laporan_karhutla.*) */
export const halamanLaporanKarhutla = ctx => halaman("laporan-karhutla", "Memuat Laporan Karhutla…", `<link href="/admin/laporan_karhutla.css?v=2" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/laporan_karhutla.js?v=3" type="module"></script>`, ctx);

/* Sortie OMC dan evaluasinya (/admin/omc): peta sasaran digambar SVG oleh skrip halaman (CSP admin tidak berubah) */
export const halamanOmc = ctx => halaman("omc", "Memuat sortie OMC…", `<link href="/admin/omc.css?v=1" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/omc.js?v=2"></script>`, ctx);

/* Ruang Laporan (/admin/laporan): sidebar kiri + halaman pantau yang sudah ada dalam iframe sesama asal (CSP_ADMIN: frame-ancestors 'self', default-src 'self' sudah mencakup frame-src).
   Tanpa judul besar supaya bingkai memakai sisa tinggi layar. Perilaku (hash, sinkron aktif, kelas .sematan di dokumen bingkai) di public/admin/ruang_laporan.js. */
const IK = d => `<svg class="rl-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const RUANG_LAPORAN = [
  {item: [["pantau", "Meja Pantau", "/admin/pantau", IK('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 14h3"/>')]]},
  {kel: "Bahan laporan", item: [["karhutla", "Laporan Karhutla", "/admin/laporan-karhutla", IK('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>')],
    ["omc", "Sortie OMC", "/admin/omc", IK('<path d="M7 18a4 4 0 0 1-.5-7.97A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 0 9.5z"/><path d="M9 21l1-2M13 21l1-2"/>')],
    ["logbook", "Logbook Pusdalops", "/bnpb/logbook", IK('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>')],
    ["dalops", "Pantau Banjir Dalops", "/bnpb/dalops", IK('<path d="M3 15c2 0 2-1.5 4.5-1.5S9.5 15 12 15s2.5-1.5 4.5-1.5S19 15 21 15M3 19c2 0 2-1.5 4.5-1.5S9.5 19 12 19s2.5-1.5 4.5-1.5S19 19 21 19"/><path d="M12 3v8M9 8l3 3 3-3"/>')]]},
  {kel: "Keluaran", item: [["pelaporan", "Laporan dan arsip", "/pelaporan", IK('<path d="M4 4h16v5H4zM5 9v11h14V9M10 13h4"/>')],
    ["koordalops", "Laporan Koordalops", "/laporan-bnpb", IK('<path d="M12 3v12m0 0l-4-4m4 4l4-4M5 20h14"/>')]]},
  {kel: "Pantauan", item: [["udara", "Kualitas udara", "/udara", IK('<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>')],
    ["gunungapi", "Gunung api", "/gunungapi", IK('<path d="M3 20l6-10 3 4 2-3 7 9zM12 3v3M7 5l1.5 2M17 5l-1.5 2"/>')]]}];
export const halamanRuangLaporan = ctx => `${kepala("Ruang Laporan · Centurisk97")}
<body class="rl-badan" data-staf="${ctx ? "1" : "0"}"${ctx ? ` data-peran="${esc(ctx.peran.join(","))}"${ctx.nama ? ' data-masuk="1"' : ""}` : ""}>
${atas("laporan", ctx)}
<link href="/admin/ruang_laporan.css?v=1" rel="stylesheet">
<div class="rl-tubuh">
  <nav class="rl-rel" aria-label="Menu Ruang Laporan">${RUANG_LAPORAN.map((g, i) => `${g.kel ? `<h2 class="ad-ey rl-kel" id="rl-kel-${i}">${g.kel}</h2>` : ""}<ul${g.kel ? ` aria-labelledby="rl-kel-${i}"` : ""}>${g.item.map(([k, l, ke, ik]) => `<li><a href="#${k}" data-ke="${ke}">${ik}<span>${l}</span></a></li>`).join("")}</ul>`).join("")}</nav>
  <iframe id="rlBingkai" class="rl-bingkai rl-muat" title="Isi Ruang Laporan" src="about:blank"></iframe>
</div>
<script src="/admin/ruang_laporan.js?v=1"></script>
</body></html>`;

/* Akun (/admin/akun): buat akun staf, daftar semua akun dan halaman yang dibukanya. Data dari /api/staf/admin/daftar (Super Admin). */
export const halamanAkun = () => halaman("akun", "Memuat daftar akun…", `<link href="/admin/akun.css?v=3" rel="stylesheet">
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/akun.js?v=3"></script>`);

/* Kunci API mitra (/admin/kunci-api): terbitkan, salin sekali, daftar, cabut. Data dari /api/kunci-api/admin/*. */
export const halamanKunciApi = () => halaman("kunci-api", "Memuat daftar kunci…", `<link href="/admin/akun.css?v=3" rel="stylesheet">
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/kunci_api.js?v=1"></script>`);

/* Buku kontak pemangku kepentingan (/admin/kontak): kepala daerah, BPBD, TNI, Polri, dll. Data dari /api/kontak/admin (src/kontak.js). */
export const halamanKontak = () => halaman("kontak", "Memuat buku kontak…", `<link href="/admin/akun.css?v=3" rel="stylesheet">
<link href="/admin/kontak.css?v=1" rel="stylesheet">
<script src="/instansi_wilayah.js?v=1"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/kontak.js?v=1"></script>`);

/* Ruang Koordinasi BNPB: satu pola untuk keempat halaman (skrip + gaya di public/admin/<k>.js|css) */
export const halamanBnpb = (k, ctx) => halaman(k, `Memuat ${HAL[k][1]}…`, `<link href="/admin/${k}.css?v=1" rel="stylesheet">
${k === "pantau" ? `<script src="/inti/format.js"></script>\n<script src="/instansi_wilayah.js?v=1"></script>
` : k === "kinerja" ? `<script src="/inti/nanti.js"></script>
` : ""}<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/${k}.js?v=${k === "pantau" ? 4 : 1}"></script>`, ctx);

export const CSP_ADMIN = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; form-action 'self'";

/* SIPPA (/pipa): cangkang staf dibangkitkan worker dari string, bukan berkas .html di public/ (ADR-12): .html di public/ bisa dibuka langsung dan di host publik tanpa CSP halaman.
   Isi layar di public/pipa/*.js (kode dan teks, tanpa data). CSP_SIPPA = CSP_ADMIN dengan tiga penggantian: peta openfreemap, rute OSRM untuk /pipa/kunjungan (keputusan 64, izin pemilik 30 Okt 2026), dan worker blob (DESAIN-TEKNIS SIPPA §4.2). */
export const CSP_SIPPA = CSP_ADMIN.replace("img-src 'self' data:", "img-src 'self' data: blob: https://*.openfreemap.org").replace("connect-src 'self'", "connect-src 'self' https://*.openfreemap.org https://router.project-osrm.org") + "; worker-src 'self' blob:";
export const halamanSippa = (layar, ctx) => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>SIPPA, Centurisk97</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/inti/tema.css?v=1" rel="stylesheet">
<link href="/admin/admin.css?v=7" rel="stylesheet">
<link href="/inti/kartu.css?v=1" rel="stylesheet">
<link href="/inti/insight.css?v=1" rel="stylesheet">
<link href="/pipa/pipa.css?v=10" rel="stylesheet">
</head>
<body data-staf="1" data-peran="${esc(ctx.peran.join(","))}" data-layar="${esc(layar)}" data-tulis="${ctx.tulis ? 1 : 0}" data-mod="${ctx.mod ? 1 : 0}" data-super="${ctx.super ? 1 : 0}" data-nama="${esc(ctx.nama || "")}">
<div id="app"><p class="ad-redup">Memuat SIPPA…</p></div>
<script src="/inti/format.js"></script>
<script src="/inti/tip.js"></script>
<script src="/inti/pilih.js"></script>
<script src="/inti/tabel.js"></script>
<script src="/inti/nanti.js"></script>
<script src="/inti/kartu.js"></script>
<script type="module" src="/pipa/app.js?v=4"></script>
</body></html>`;
/* /pipa/lapangan: form luring operator berkode, tanpa sesi dan tanpa data staf; gaya dan skrip hanya 'self' (CSP_LAPANGAN di src/posko.js) */
export const halamanSippaLapangan = () => `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>SIPPA Lapangan, Centurisk97</title>
<link href="/admin/admin.css?v=7" rel="stylesheet">
<link href="/pipa/pipa.css?v=10" rel="stylesheet">
</head>
<body>
<div id="app"><p>Memuat form lapangan…</p></div>
<noscript><p>Form lapangan butuh JavaScript aktif.</p></noscript>
<script type="module" src="/pipa/lapangan.js?v=5"></script>
</body></html>`;

/* Command center karhutla (src/command_center.js): MEJA OPERATOR /command-center (kerangka admin/staf bersama; ctx undefined = moderator). Layar dinding dibuang 2 Nov 2026.
   Isi layar di public/admin/command_*.js (kode dan teks, tanpa data; datanya dari /api/cc/*). Meja memakai CSP_ADMIN apa adanya, tanpa skrip dan gaya sebaris, SENYAP (tanpa suara). */
export const halamanCc = ctx => halaman("command-center", "Memuat command center…", `<link href="/admin/command_bersama.css?v=1" rel="stylesheet">
<link href="/admin/command_center.css?v=1" rel="stylesheet">
<script src="/inti/format.js"></script>
<script src="/admin/bersama.js?v=4"></script>
<script src="/admin/command_bersama.js?v=1"></script>
<script src="/admin/command_center.js?v=1"></script>`, ctx);

/* halaman publik /statistik (tanpa login). Data dari /api/publik. */
export const halamanPublik = () => new Response(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Statistik pengunjung · Centurisk97</title>
<script src="/i18n.js"></script>
<meta name="description" content="Berapa orang membaca Centurisk97, dan berapa kali asisten AI serta perayap membuka halamannya, dihitung terpisah.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/admin/admin.css?v=7" rel="stylesheet">
</head>
<body class="pb">
<header class="ad-top"><a class="ad-logo" href="/">Centurisk97</a><span class="ad-sep">Statistik</span>
  <nav>${hidup(REGISTRY).map(b => `<a href="${esc(b.rute)}">${esc(b.nama)}</a>`).join("")}<a href="/privasi.html">Privasi</a></nav></header>
<main class="ad-wrap pb-wrap" id="app"><p class="ad-redup">Memuat statistik…</p></main>
<script src="/statistik_publik.js?v=1"></script>
<script src="/persetujuan.js" defer></script>
<script src="/jejak.js" data-halaman="statistik" defer></script>
</body></html>`, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
  /* style-src 'unsafe-inline': spanduk persetujuan menyisipkan <style>; skrip tetap hanya 'self' */
  "content-security-policy": CSP_ADMIN.replace("frame-ancestors 'none'", "frame-ancestors 'self'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")}});
