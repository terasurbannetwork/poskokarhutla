/* /masuk: satu pintu, username dan sandi saja (pemilik 26 Nov 2026, KEPUTUSAN-MASUK K25: "Sandi saja, WA hapus").
   Form biasa POST /masuk (logika server St.masuk: laju, kunci akun, CSRF). Galat dari server ada di <body data-galat>, dipasang lewat textContent. */
(() => {
  /* ?ke= hanya jalur di situs sendiri: awalan satu "/", bukan "//" atau "/\", tanpa karakter kontrol atau spasi (sama dengan tujuan() src/statistik.js) */
  const jalurAman = k => typeof k === "string" && /^\/(?![\/\\])[^\x00-\x20\x7f]*$/.test(k) ? k : "";
  /* akun pendataan dan koordinator kampus punya layar sandinya sendiri; selain itu form di halaman ini */
  const pintuSandi = ke => /^\/pendataan(?:[\/?#]|$)/.test(ke) ? "/pendataan" : /^\/kemitraan(?:[\/?#]|$)/.test(ke) ? "/kemitraan/masuk" : "";
  globalThis.MasukMurni = {jalurAman, pintuSandi};
  const $ = id => document.getElementById(id);
  if (!$("fAkun")) return;   // dimuat tanpa halaman (uji)

  const ke = jalurAman(new URLSearchParams(location.search).get("ke") || "");
  const lain = pintuSandi(ke);
  if (lain) { location.replace(lain); return; }
  $("fAkun").action = "/masuk" + (ke ? "?ke=" + encodeURIComponent(ke) : "");

  const galat = document.body.dataset.galat || "";
  if (galat) { $("pGalat").textContent = galat; $("pGalat").hidden = false; }

  const sandi = $("iSandiAkun"), mata = $("bMata");
  mata.addEventListener("click", () => {
    const lihat = sandi.type === "password";
    sandi.type = lihat ? "text" : "password";
    mata.setAttribute("aria-label", lihat ? "Sembunyikan sandi" : "Tampilkan sandi");
    mata.setAttribute("aria-pressed", String(lihat));
    mata.classList.toggle("buka", lihat);
  });
  $("fAkun").addEventListener("submit", () => { $("bAkun").disabled = true; $("bAkun").textContent = "Memeriksa..."; });
  /* kembali lewat tombol Back: tombol hidup lagi, sandi tidak tertinggal */
  window.addEventListener("pageshow", e => { if (e.persisted) { $("bAkun").disabled = false; $("bAkun").textContent = "Masuk"; sandi.value = ""; } });
})();
