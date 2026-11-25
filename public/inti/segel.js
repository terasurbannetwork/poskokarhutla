/* Blok QR segel untuk lembar cetak (paket data/kajian-bnpb/segel-dokumen/, SG-09, DESIGN-SYSTEM 3). Skrip klasik, global window.SegelDok.
   SegelDok.blok(kode, sidik12) -> Promise<Element>: QR 22 mm (koreksi galat M) ke https://centurisk97.id/verifikasi/<kode> (KEPUTUSAN K4, Q6),
   di bawahnya kode dan 12 huruf sidik supaya tetap bisa diperiksa bila QR rusak, di kirinya kalimat periksa dan batas hukum (K4, Q10).
   Pustaka QR vendor (qrcode-generator) dimuat sekali, pola sama dengan buatQR di public/pipa/layar_kit.js. Teks lewat textContent. */
(g => {
  "use strict";
  const DOMAIN = "centurisk97.id", NS = "http://www.w3.org/2000/svg";
  let janji = null;
  const muat = () => typeof g.qrcode === "function" ? Promise.resolve() : (janji ??= new Promise((ok, gagal) => {
    const s = document.createElement("script"); s.src = "/vendor/qrcode/qrcode.min.js?v=1";
    s.onload = ok; s.onerror = () => { janji = null; gagal(new Error("pustaka QR gagal dimuat")); }; document.head.append(s);
  }));
  const tampil = k => `${k.slice(0, 5)}-${k.slice(5)}`;
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

  function svgQR(teks, label) {
    const q = g.qrcode(0, "M"); q.addData(teks); q.make();
    const n = q.getModuleCount(), m = 2, w = n + 2 * m;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${w} ${w}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label); svg.setAttribute("shape-rendering", "crispEdges"); svg.classList.add("sg-qr");
    const latar = document.createElementNS(NS, "rect"); latar.setAttribute("width", w); latar.setAttribute("height", w); latar.classList.add("sg-qr-latar");
    const modul = document.createElementNS(NS, "path"); modul.setAttribute("d", d); modul.classList.add("sg-qr-modul");
    svg.append(latar, modul);
    return svg;
  }

  async function blok(kode, sidik12) {
    if (!/^[0-9A-HJKMNP-TV-Z]{10}$/.test(kode || "")) return null;
    await muat();
    const w = el("div", "sg-blok"), kiri = el("div", "sg-kiri"), kanan = el("div", "sg-kanan");
    kiri.append(el("p", null, `Periksa keaslian di ${DOMAIN}/verifikasi`), el("p", "sg-batas", "Segel keaslian sistem, bukan tanda tangan elektronik."));
    kanan.append(svgQR(`https://${DOMAIN}/verifikasi/${kode}`, `QR verifikasi kode ${tampil(kode)}`), el("p", null, `Kode ${tampil(kode)}`));
    if (sidik12) kanan.append(el("p", null, `Sidik ${sidik12}`));
    w.append(kiri, kanan);
    return w;
  }
  g.SegelDok = {blok};
})(globalThis);
