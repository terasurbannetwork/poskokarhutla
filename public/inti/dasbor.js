/* Cangkang model A bersama (data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md §3): panel seksi kiri dibangun dari kartu .ex-std di halaman,
   kepala halaman gelap, kaki "Pembaruan data". Rujukan bentuk: /operasi dan /sitrep. Gaya di public/inti/dasbor.css (.db-a, .db-nav).
   Pakai: DasborA.pasang({nama, sub, kaki: [[warna, label, nilai], ...]}); kaki bisa diganti kemudian lewat DasborA.kaki([...]).
   Kepala kartu jadi nama seksi (pil kategori .ex-ey), kalimat temuan dibuang dari kepala (AGENTS 3.5 pembaruan 11 Nov 2026).
   Tanpa gaya inline selain variabel warna (CSP), tanpa render ulang saat pindah seksi (INP). */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const ikonSvg = d => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const p of d.split("|")) { const e = document.createElementNS(NS, "path"); e.setAttribute("d", p); s.append(e); } return s; };
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const IK = {isi: "M4 6h16|M4 12h16|M4 18h10", jam: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3 2"};
  let nav, daftar, kakiEl, io;

  function grup(teks, ikon) { const g = el("p", "db-nav-g"), i = el("i"); i.append(ikonSvg(ikon)); g.append(i, el("span", null, teks)); return g; }
  function kaki(baris) {
    if (!kakiEl) return;
    kakiEl.replaceChildren(grup("Pembaruan data", IK.jam), ...(baris || []).map(([w, label, nilai]) => {
      const r = el("div", "db-nav-pb"); r.style.setProperty("--w", w); r.append(el("i", "db-nav-dot"), el("span", null, label), el("b", null, nilai)); return r; }));
  }
  /* kartu .ex-std jadi seksi: kepala = nama seksi dari pil kategori, tanpa kalimat temuan */
  function seksi() {
    if (!daftar) return;
    const kartu = [...document.querySelectorAll(".db-kanan .ex.ex-std")];
    io?.disconnect(); io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) daftar.querySelectorAll(".db-nav-b").forEach(b => b.setAttribute("aria-current", String(b.dataset.ke === e.target.id))); }, {rootMargin: "-15% 0px -70% 0px"});
    daftar.replaceChildren(...kartu.map((k, i) => {
      k.id ||= "db-s" + i;
      const ey = k.querySelector(":scope>.ex-hd .ex-ey"), h3 = k.querySelector(":scope>.ex-hd .ex-jd>h3"), nama = (ey?.textContent || h3?.textContent || "Bagian").trim();
      if (h3 && ey && !k.dataset.dbNama) { k.dataset.dbNama = "1"; h3.title = h3.textContent.trim(); h3.replaceChildren(...(ey.querySelector("svg") ? [ey.querySelector("svg").cloneNode(true)] : []), document.createTextNode(nama)); ey.hidden = true; }
      /* teks metode panjang (daftar catatan, paragraf panjang) dilipat jadi "Catatan metode" di bawah kartu */
      const bd = k.querySelector(":scope>.ex-bd");
      if (bd && !bd.dataset.dbLipat) {
        const panjang = [...bd.children].filter(c => (c.tagName === "UL" && c.children.length > 2) || (c.tagName === "P" && c.textContent.length > 220));
        if (panjang.length) { bd.dataset.dbLipat = "1"; const d = el("details", "db-catatan"); d.append(el("summary", null, "Catatan metode"), ...panjang); bd.append(d); }
      }
      const b = el("button", "db-nav-b"); b.type = "button"; b.dataset.ke = k.id;
      const ik = el("i", "db-nav-ik"), sv = (ey || h3)?.querySelector("svg"); if (sv) ik.append(sv.cloneNode(true));
      b.append(ik, el("span", "db-nav-t", nama)); b.addEventListener("click", () => k.scrollIntoView({behavior: "smooth", block: "start"}));
      io.observe(k); return b;
    }));
  }
  function pasang(o = {}) {
    const main = document.querySelector("main.bn-wrap"); if (!main || main.classList.contains("db-a")) return;
    const kanan = el("div", "db-kanan"); kanan.append(...main.childNodes);
    nav = el("aside", "db-nav"); nav.setAttribute("aria-label", "Seksi halaman");
    const id = el("div", "db-nav-id"); id.append(el("b", null, o.nama || document.querySelector("h1")?.textContent || ""), el("small", null, o.sub || "Centurisk97, Ruang Koordinasi"));
    daftar = el("nav", "db-nav-isi"); kakiEl = el("div", "db-nav-kaki");
    nav.append(id, grup("Isi halaman", IK.isi), daftar, kakiEl);
    main.classList.add("db-a"); main.append(nav, kanan);
    kaki(o.kaki);
    let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(seksi, 60); }).observe(kanan, {childList: true, subtree: true});
    seksi();
  }
  window.DasborA = {pasang, kaki, seksi};
})();
