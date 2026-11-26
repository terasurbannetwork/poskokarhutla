/* Lacak laporan tanpa login (/lapor/lacak.html?t=<token>): penggambar ada di lacak_isi.js (dipakai juga layar Lacak di dalam aplikasi /lapor).
   Peramban yang sudah pernah memakai aplikasi (ada "lapor-wa") dialihkan ke /lapor/#lacak=<token>: token pindah ke fragmen, bukan query. */
const t = new URLSearchParams(location.search).get("t");
let punyaApp = false; try { punyaApp = !!localStorage.getItem("lapor-wa"); } catch {}
if (punyaApp && /^[0-9a-f]{16,64}$/i.test(t || "")) location.replace(`/lapor/#lacak=${t}`);
else import("/lapor/lacak_isi.js?v=1").then(m => m.pasangLacak(document.getElementById("lk"), {token: t, mandiri: true}));
