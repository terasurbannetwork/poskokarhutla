/* Menu halaman Kemitraan Kampus dari registri Peta Situs (paket data/kajian-bnpb/peta-situs D4, D8; tiket PS-07 bagian kampus).
   Urutan sumber: CADANGAN digambar seketika (tanpa menunggu jaringan), lalu GET /api/peta-situs (sesi_kemitraan atau staf, sudah disaring Worker);
   bila API tidak memuat pintu kampus (tamu, gagal), /inti/peta_situs_publik.json (butir tamu pintu kampus). Halaman bertoken (/kemitraan/saya,
   /kemitraan/sertifikat/:id) tidak pernah ada di menu: tautannya dibagikan lewat kode, Sertifikat dibuka dari halaman Saya.
   Teks lewat textContent; satu fetch per sumber per muat halaman; tanpa pendengar klik (tautan biasa). */
(() => {
  "use strict";
  /* salinan butir non-token pintu kampus src/peta_situs.js (dijaga tests/kemitraan/menu.test.mjs) */
  const CADANGAN = [
    {rute: "/kemitraan", nama: "Kemitraan kampus", ikon: "personel"},
    {rute: "/kemitraan/masuk", nama: "Masuk koordinator kemitraan kampus", ikon: "personel"},
    {rute: "/kemitraan/buku", nama: "Buku profil daerah", ikon: "daftar"},
    {rute: "/kemitraan/panduan", nama: "Panduan wawancara", ikon: "daftar"},
    {rute: "/kemitraan/daftar", nama: "Daftar kemitraan kampus", ikon: "daftar"}];
  /* ikon garis = kunci IKON public/bnpb/menu_pusdalops.js (registri menyimpan kuncinya saja) */
  const IKON = {personel: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    simpan: "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7"};
  const bersih = b => ({rute: String(b.rute), nama: String(b.nama), ikon: String(b.ikon || "daftar")});
  /* jawaban API = [{pintu, grup: [{butir}]}]; berkas publik = {halaman: [{pintu, rute, ...}]}. Hasil: butir pintu kampus, atau null bila tak ada */
  function pilihButir(sumber) {
    let b = null;
    if (Array.isArray(sumber)) { const p = sumber.find(x => x?.pintu === "kampus"); b = p ? p.grup.flatMap(g => g.butir || []) : null; }
    else if (Array.isArray(sumber?.halaman)) b = sumber.halaman.filter(e => e?.pintu === "kampus" && !e.token && e.akses !== "token");
    b = (b || []).filter(e => e && typeof e.rute === "string" && !e.rute.includes(":")).map(bersih);
    return b.length ? b : null;
  }
  const jalur = p => (String(p).replace(/\.html$/, "").replace(/\/+$/, "") || "/");
  const api = {CADANGAN, IKON, pilihButir, jalur};
  if (typeof window !== "undefined") window.KM_MENU = api;
  if (typeof document === "undefined") return;

  const nav = document.getElementById("kmMenu");
  if (!nav) return;
  const NS = "http://www.w3.org/2000/svg", kini = jalur(location.pathname);
  const svg = k => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[k] || IKON.daftar).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const gambar = butir => nav.replaceChildren(...butir.map(b => { const a = document.createElement("a"); a.href = b.rute;
    if (jalur(b.rute) === kini) a.setAttribute("aria-current", "page"); a.append(svg(b.ikon), document.createTextNode(b.nama)); return a; }));
  gambar(CADANGAN);
  const ambil = u => fetch(u, {credentials: "same-origin", headers: {accept: "application/json"}, signal: AbortSignal.timeout(9000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  ambil("/api/peta-situs").then(async m => { const b = pilihButir(m) || pilihButir(await ambil("/inti/peta_situs_publik.json")); if (b) gambar(b); });
})();
