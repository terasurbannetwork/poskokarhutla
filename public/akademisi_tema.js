/* tema tersimpan dipasang sebelum CSS dimuat supaya tidak berkedip (CSP: tanpa skrip inline) */
try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
