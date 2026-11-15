/* Keterpaduan KP-07: Tanda kejadian. Pil kecil di baris tugas/logbook/SIPPA yang menunjukkan kejadian Buku Besar tempat baris itu bertaut.
   Pakai: KjTanda.pasang([{sumber, kode, el}]) atau KjTanda.pindai(akar) untuk elemen [data-kj="sumber:kode"].
   Satu panggilan GET .../kejadian/tautan?k=sumber:kode (maks 50 per panggilan) hanya untuk baris yang terlihat (IntersectionObserver), di tugas tertunda supaya klik tidak terhambat.
   Halaman /instansi memakai /api/instansi/siklus/* (cookie akun instansi berpath /api/instansi); halaman lain /api/siklus/*. Rancangan: data/kajian-bnpb/keterpaduan/DESIGN-SYSTEM.md, ALUR A1 langkah 6. */
(function (akar) {
  "use strict";
  const MAKS = 50, ANTREAN = "/siklus#antrean";
  const IKON = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
  const kunci = (s, k) => s + ":" + k;
  const bagi = (a, n = MAKS) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
  const awalan = jalur => String(jalur || "").startsWith("/instansi") ? "/api/instansi/siklus" : "/api/siklus";
  const url = (pasangan, jalur) => awalan(jalur) + "/kejadian/tautan?" + pasangan.map(([s, k]) => "k=" + encodeURIComponent(kunci(s, k))).join("&");
  /* status tautan -> model pil. terpasang tanpa id diperlakukan belum (tidak ada tujuan tautan). */
  function model(t) {
    if (t && t.status === "terpasang" && t.kejadian_id) return {kelas: "ok", teks: t.kejadian_id, href: "/siklus/kejadian/" + encodeURIComponent(t.kejadian_id), label: `Bertaut ke kejadian ${t.kejadian_id}, buka di Siklus Bencana`};
    if (t && t.status === "ambigu") return {kelas: "ambigu", teks: "perlu dipilih", href: ANTREAN, label: "Kejadian perlu dipilih, buka antrean di Siklus Bencana"};
    return {kelas: "belum", teks: "belum bertaut", href: null, label: "Belum bertaut ke kejadian"};
  }
  function gambar(el, t) {
    const m = model(t), p = document.createElement(m.href ? "a" : "span");
    p.className = "kj-tanda kj-" + m.kelas; p.setAttribute("aria-label", m.label); p.title = m.label;
    if (m.href) p.href = m.href;
    p.innerHTML = m.kelas === "belum" ? "" : IKON; p.append(m.teks);
    el.replaceChildren(p); el.removeAttribute("hidden");
  }
  const hasil = new Map(), menunggu = new Map();   // kunci -> tautan | kunci -> [el]
  let terjadwal = false;
  const tunda = fn => (typeof window.nanti === "function" ? window.nanti(fn) : setTimeout(fn, 0));
  function tampil(k, t) { for (const el of menunggu.get(k) || []) if (el.isConnected) gambar(el, t); menunggu.delete(k); }
  async function kirim() {
    terjadwal = false;
    const pasangan = [...menunggu.keys()].map(k => { const i = k.indexOf(":"); return [k.slice(0, i), k.slice(i + 1)]; });
    for (const potong of bagi(pasangan)) {
      let j = null;
      try { const r = await fetch(url(potong, location.pathname), {headers: {accept: "application/json"}}); if (r.ok) j = await r.json(); } catch (e) { /* tanpa sinyal: tanda tidak tampil */ }
      for (const [s, k] of potong) {
        const t = j && Array.isArray(j.tautan) ? j.tautan.find(x => x.sumber === s && x.kode === k) : null;
        if (t) { hasil.set(kunci(s, k), t); tampil(kunci(s, k), t); } else menunggu.delete(kunci(s, k));   // 401/403/gagal: tidak ada tanda
      }
    }
  }
  function minta(s, k, el) {
    const kk = kunci(s, k);
    if (hasil.has(kk)) return gambar(el, hasil.get(kk));
    (menunggu.get(kk) || menunggu.set(kk, []).get(kk)).push(el);
    if (!terjadwal) { terjadwal = true; tunda(kirim); }
  }
  const pengamat = typeof IntersectionObserver === "function" ? new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { pengamat.unobserve(e.target); const d = e.target._kj; if (d) minta(d[0], d[1], e.target); } }, {rootMargin: "200px"}) : null;
  function pasang(daftar) {
    for (const d of daftar || []) {
      if (!d || !d.el || !d.sumber || d.kode == null || d.kode === "") continue;
      d.el._kj = [d.sumber, String(d.kode)];
      if (pengamat) pengamat.observe(d.el); else minta(d.sumber, String(d.kode), d.el);
    }
  }
  function pindai(a) {
    pasang([...(a || document).querySelectorAll("[data-kj]:not([data-kj-ok])")].map(el => { el.dataset.kjOk = "1"; const v = el.dataset.kj, i = v.indexOf(":"); return {sumber: v.slice(0, i), kode: v.slice(i + 1), el}; }));
  }
  akar.KjTanda = {pasang, pindai, bagi, model, url, awalan, MAKS};
  if (typeof module !== "undefined") module.exports = akar.KjTanda;
})(typeof window !== "undefined" ? window : globalThis);
