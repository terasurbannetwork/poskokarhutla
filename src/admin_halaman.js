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
<link href="/admin/admin.css?v=6" rel="stylesheet">
</head>`;
/* Tiga halaman admin: emoji = kunci pindai di nav & judul (selera-pinka #43). */
const HAL = {statistik: ["📊", "Statistik"], pesan: ["📨", "Kotak pesan"], foto: ["📸", "Foto lapangan"], sosmed: ["📱", "Media sosial"], posko: ["🧯", "Ruang Posko"],
  relawan: ["🙋", "Relawan"], alun: ["🏛️", "Alun-alun"], riset: ["🎓", "Riset"], meja: ["🗂️", "Meja Kerja"], gakkum: ["⚖️", "Berkas Gakkum"], pimpinan: ["🧭", "Layar Pimpinan"], pengingat: ["⏰", "Pengingat"]};
/* halaman Ruang Koordinasi BNPB: SATU entri di nav atas, lalu sub-nav di bawahnya (nav atas tetap muat di 1440) */
const BNPB = ["pimpinan", "relawan", "alun", "riset", "meja", "pengingat", "gakkum"];
const subBnpb = aktif => BNPB.includes(aktif) ? `<nav class="ad-sub" aria-label="Ruang Koordinasi">${BNPB.map(k => `<a href="/admin/${k}" ${aktif === k ? 'aria-current="page"' : ""}>${HAL[k][0]} ${HAL[k][1]}</a>`).join("")}</nav>` : "";
const atas = aktif => `<header class="ad-top">
  <a class="ad-logo" href="/"><img src="/img/logo.svg?v=2" alt="" width="30" height="30">Pantau Bencana</a><span class="ad-sep">Admin</span>
  <nav>${Object.entries(HAL).filter(([k]) => !BNPB.includes(k) || k === BNPB[0]).map(([k, [ik, l]]) => BNPB.includes(k)
    ? `<a href="/admin/${k}" ${BNPB.includes(aktif) ? 'aria-current="page"' : ""}>🏛️ Ruang Koordinasi</a>`
    : `<a href="/admin/${k}" ${aktif === k ? 'aria-current="page"' : ""}>${ik} ${l}${k === "pesan" ? '<b class="ad-badge" id="badgePesan" hidden></b>' : ""}</a>`).join("")}</nav>
  <form method="post" action="/admin/keluar"><button class="ad-keluar" type="submit">Keluar</button></form>
</header>`;
/* Kerangka bersama: header, judul halaman (ikon + judul + slot aksi kanan #aksiJudul), lalu isi #app yang diisi skripnya. */
const halaman = (k, memuat, ekor) => `${kepala(`${HAL[k][1]} · Pantau Bencana`)}
<body>
${atas(k)}
<main class="ad-wrap">
  ${subBnpb(k)}
  <div class="ad-judul"><span class="ad-ikon" aria-hidden="true">${HAL[k][0]}</span><h1>${HAL[k][1]}</h1><div class="ad-judul-aksi" id="aksiJudul"></div></div>
  <div class="ad-isi" id="app"><p class="ad-redup">${memuat}</p></div>
</main>
${ekor}
</body></html>`;

export const halamanMasuk = (galat, ke = "", merek = "Pantau Bencana") => `${kepala("Masuk admin · " + merek)}
<body class="ad-masuk">
<div class="ad-cahaya" aria-hidden="true"><i></i><i></i><i></i></div>
<main class="ad-kartu-masuk">
  <div class="ad-kepala-masuk">
    <img src="/img/logo.svg?v=2" alt="" width="64" height="64">
    <h1>${esc(merek)}</h1>
    <p>Panel admin</p>
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

export const halamanSosmed = () => halaman("sosmed", "Memuat post…", `<link href="/admin/sosmed.css?v=1" rel="stylesheet">
<script src="/admin/sosmed.js?v=1"></script>`);

export const halamanPosko = () => halaman("posko", "Memuat Ruang Posko…", `<link href="/admin/posko.css?v=1" rel="stylesheet">
<script src="/admin/posko.js?v=1"></script>`);

/* Ruang Koordinasi BNPB: satu pola untuk keempat halaman (skrip + gaya di public/admin/<k>.js|css) */
export const halamanBnpb = k => halaman(k, `Memuat ${HAL[k][1]}…`, `<link href="/admin/${k}.css?v=1" rel="stylesheet">
<script src="/admin/bersama.js?v=1"></script>
<script src="/admin/${k}.js?v=1"></script>`);

export const CSP_ADMIN = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

/* halaman publik /statistik (tanpa login). Data dari /api/publik. */
export const halamanPublik = () => new Response(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Statistik pengunjung · Centurisk97</title>
<script src="/i18n.js"></script>
<meta name="description" content="Berapa orang membaca Pantau Bencana, dan berapa kali asisten AI serta perayap membuka halamannya, dihitung terpisah.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/admin/admin.css?v=6" rel="stylesheet">
</head>
<body class="pb">
<header class="ad-top"><a class="ad-logo" href="/">Pantau Bencana</a><span class="ad-sep">Statistik</span>
  <nav>${hidup(REGISTRY).map(b => `<a href="${esc(b.rute)}">${esc(b.nama)}</a>`).join("")}<a href="/privasi.html">Privasi</a></nav></header>
<main class="ad-wrap pb-wrap" id="app"><p class="ad-redup">Memuat statistik…</p></main>
<script src="/statistik_publik.js?v=1"></script>
<script src="/persetujuan.js" defer></script>
<script src="/jejak.js" data-halaman="statistik" defer></script>
</body></html>`, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
  /* style-src 'unsafe-inline': spanduk persetujuan menyisipkan <style>; skrip tetap hanya 'self' */
  "content-security-policy": CSP_ADMIN.replace("frame-ancestors 'none'", "frame-ancestors 'self'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")}});
