/* Pasang tema tersimpan sebelum halaman digambar (CSP melarang skrip inline). Kunci sama dengan halaman lain: pk-tema. */
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
