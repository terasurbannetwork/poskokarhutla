/* Menu halaman Kemitraan Kampus dari registri Peta Situs (paket data/kajian-bnpb/peta-situs D4, D8; tiket PS-07 bagian kampus, PS-09).
   Tanpa daftar tulisan tangan (PS-09). Urutan sumber: menu terakhir di tab ini (sessionStorage "km-menu") digambar seketika, lalu GET /api/peta-situs
   (sesi_kemitraan atau staf, sudah disaring Worker); bila API tidak memuat pintu kampus (tamu, gagal), /inti/peta_situs_publik.json (butir tamu pintu
   kampus, hasil generator dari registri). Hasil sama dengan yang tergambar: tanpa gambar ulang. Semua gagal tanpa simpanan: satu pesan polos + tautan
   /kemitraan. Halaman bertoken (/kemitraan/saya, /kemitraan/sertifikat/:id) tidak pernah ada di menu: tautannya dibagikan lewat kode.
   Teks lewat textContent; satu fetch per sumber per muat halaman; tautan biasa, satu pendengar klik fase tangkap hanya untuk membuang simpanan saat Keluar. */
(() => {
  "use strict";
  /* ikon garis = kunci IKON public/bnpb/menu_pusdalops.js (registri menyimpan kuncinya saja) */
  const IKON = {personel: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    simpan: "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7"};
  const bersih = b => ({rute: String(b.rute), nama: String(b.nama), ikon: String(b.ikon || "daftar")});
  /* jawaban API = [{pintu, grup: [{butir}]}]; berkas publik = {halaman: [{pintu, rute, ...}]}. Hasil: butir pintu kampus, atau null bila tak ada */
  function pilihButir(sumber) {
    let b = null;
    if (Array.isArray(sumber)) { const p = sumber.find(x => x?.pintu === "kampus"); b = p ? p.grup.flatMap(g => g.butir || []) : null; }
    else if (Array.isArray(sumber?.halaman)) b = sumber.halaman.filter(e => e?.pintu === "kampus" && !e.token && e.akses !== "token");
    b = (b || []).filter(e => e && typeof e.rute === "string" && /^\/(?![\/\\])[^\s"'<>\\]*$/.test(e.rute) && !e.rute.includes(":")).map(bersih);
    return b.length ? b : null;
  }
  const jalur = p => (String(p).replace(/\.html$/, "").replace(/\/+$/, "") || "/");
  const api = {IKON, pilihButir, jalur};
  if (typeof window !== "undefined") window.KM_MENU = api;
  if (typeof document === "undefined") return;

  const nav = document.getElementById("kmMenu");
  if (!nav) return;
  const NS = "http://www.w3.org/2000/svg", kini = jalur(location.pathname);
  const svg = k => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[k] || IKON.daftar).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const gambar = butir => nav.replaceChildren(...butir.map(b => { const a = document.createElement("a"); a.href = b.rute;
    if (jalur(b.rute) === kini) a.setAttribute("aria-current", "page"); a.append(svg(b.ikon), document.createTextNode(b.nama)); return a; }));
  let lama = null; try { lama = pilihButir([{pintu: "kampus", grup: [{butir: JSON.parse(sessionStorage.getItem("km-menu"))}]}]); } catch (e) {}
  if (lama) gambar(lama);
  /* keluar (tombol #keluar dari /inti/keluar.js, atau form /admin/keluar): simpanan menu tab ini dibuang sebelum sesi dicabut */
  const buang = e => { if (e.target.closest?.('#keluar, [data-staf-keluar], .ad-keluar, form[action="/admin/keluar"]')) try { sessionStorage.removeItem("km-menu"); } catch (x) {} };
  document.addEventListener("click", buang, true); document.addEventListener("submit", buang, true);
  const ambil = u => fetch(u, {credentials: "same-origin", headers: {accept: "application/json"}, signal: AbortSignal.timeout(9000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  ambil("/api/peta-situs").then(async m => { const b = pilihButir(m) || pilihButir(await ambil("/inti/peta_situs_publik.json"));
    if (!b) { try { sessionStorage.removeItem("km-menu"); } catch (e) {}   // jawaban tanpa butir kampus: simpanan dibuang (privasi), menu yang tergambar dibiarkan
      if (!lama) { const p = document.createElement("span"); p.textContent = "Menu belum bisa dimuat. Muat ulang halaman."; gambar([{rute: "/kemitraan", nama: "Kemitraan kampus", ikon: "personel"}]); nav.prepend(p); } return; }
    const t = JSON.stringify(b); if (t === JSON.stringify(lama)) return;
    try { sessionStorage.setItem("km-menu", t); } catch (e) {} gambar(b); });
})();
