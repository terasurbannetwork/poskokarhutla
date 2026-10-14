/* Kerangka HTML halaman admin. Dilayani worker (bukan aset statis) supaya /admin/* hanya terbuka setelah masuk.
   Skrip & gaya di public/admin/ (tanpa data; datanya dari /api/statistik dan /api/pesan yang dijaga sesi). */
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
<link href="/admin/admin.css?v=1" rel="stylesheet">
</head>`;
const atas = aktif => `<header class="ad-top">
  <a class="ad-logo" href="/">Posko Karhutla</a><span class="ad-sep">Admin</span>
  <nav><a href="/admin/statistik" ${aktif === "statistik" ? 'aria-current="page"' : ""}>Statistik</a><a href="/admin/pesan" ${aktif === "pesan" ? 'aria-current="page"' : ""}>Kotak pesan<b class="ad-badge" id="badgePesan" hidden></b></a></nav>
  <form method="post" action="/admin/keluar"><button class="ad-keluar" type="submit">Keluar</button></form>
</header>`;

export const halamanMasuk = galat => `${kepala("Masuk admin · Posko Karhutla")}
<body class="ad-masuk">
<main class="ad-kartu-masuk">
  <h1>Masuk admin</h1>
  <p class="ad-redup">Statistik pengunjung dan kotak pesan Posko Karhutla. Gunakan token admin Anda.</p>
  ${galat ? `<p class="ad-galat" role="alert">${esc(galat)}</p>` : ""}
  <form method="post" action="/admin/masuk">
    <label for="token">Token admin</label>
    <input id="token" name="token" type="password" autocomplete="current-password" required autofocus>
    <button type="submit">Masuk</button>
  </form>
  <p class="ad-redup kecil">Sesi berlaku 12 jam. Percobaan masuk dibatasi.</p>
</main>
</body></html>`;

export const halamanStatistik = () => `${kepala("Statistik · Posko Karhutla")}
<body>
${atas("statistik")}
<main class="ad-wrap" id="app"><p class="ad-redup">Memuat statistik…</p></main>
<script src="/admin/statistik.js?v=1"></script>
</body></html>`;

export const halamanPesan = () => `${kepala("Kotak pesan · Posko Karhutla")}
<body>
${atas("pesan")}
<main class="ad-wrap" id="app"><p class="ad-redup">Memuat pesan…</p></main>
<script src="/admin/pesan.js?v=1"></script>
</body></html>`;

export const CSP_ADMIN = "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

/* halaman publik /statistik (tanpa login). Data dari /api/publik. */
export const halamanPublik = () => new Response(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Statistik pengunjung · Pantau Bencana</title>
<meta name="description" content="Berapa orang membaca Pantau Bencana, dan berapa kali asisten AI serta perayap membuka halamannya, dihitung terpisah.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
<link href="/admin/admin.css?v=2" rel="stylesheet">
</head>
<body class="pb">
<header class="ad-top"><a class="ad-logo" href="/">Pantau Bencana</a><span class="ad-sep">Statistik</span>
  <nav><a href="/">Karhutla</a><a href="/banjir/">Banjir</a><a href="/privasi.html">Privasi</a></nav></header>
<main class="ad-wrap pb-wrap" id="app"><p class="ad-redup">Memuat statistik…</p></main>
<script src="/statistik_publik.js?v=1"></script>
<script src="/persetujuan.js" defer></script>
<script src="/jejak.js" data-halaman="statistik" defer></script>
</body></html>`, {headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff",
  /* style-src 'unsafe-inline': spanduk persetujuan menyisipkan <style>; skrip tetap hanya 'self' */
  "content-security-policy": CSP_ADMIN.replace("frame-ancestors 'none'", "frame-ancestors 'self'").replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")}});
