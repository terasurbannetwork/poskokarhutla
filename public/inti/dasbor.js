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
  /* ---- mode otomatis untuk layar mana pun (pemilik 11 Nov 2026 "ubah semuanya"): <script src="/inti/dasbor.js" data-oto data-nama="..."
     data-isi="selektor isi" data-tab="selektor deretan tab" data-kepala="selektor kepala halaman" data-ringkas="selektor angka ringkas">
     Deretan tab dicerminkan ke panel kiri (2 tab = segmen, 3+ = daftar), kepala jadi L1 navy, angka ringkas jadi ubin di bawahnya. */
  const sc = document.currentScript;
  function otomatis(c) {
    const isi = document.querySelector(c.isi); if (!isi || isi.closest(".db-oto")) return;
    const kepala = c.kepala && document.querySelector(c.kepala), ringkas = c.ringkas && document.querySelector(c.ringkas);
    const w = el("div", "db-a db-oto"), kanan = el("div", "db-kanan");
    nav = el("aside", "db-nav"); nav.setAttribute("aria-label", "Bagian " + (c.nama || "halaman"));
    daftar = el("nav", "db-nav-isi"); kakiEl = el("div", "db-nav-kaki");
    (kepala || isi).before(w);
    if (kepala) kanan.append(kepala); if (ringkas) kanan.append(ringkas); kanan.append(isi);
    w.append(nav, kanan);
    nav.append(daftar, kakiEl);
    document.body.classList.add("db-oto-aktif");
    const tab = c.tab && document.querySelector(c.tab);
    if (tab) {   // tombol tab bisa dibuat skrip halaman sesudah data dimuat: tunggu sampai ada
      const coba = () => { if (tab.querySelectorAll(":scope > button, :scope > a").length >= 2 && !nav.dataset.tab) { nav.dataset.tab = 1; cerminTab(c, tab); } };
      coba(); if (!nav.dataset.tab) new MutationObserver(coba).observe(tab, {childList: true});
      return;
    }
    let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(seksi, 80); }).observe(kanan, {childList: true, subtree: true}); seksi();
  }
  function cerminTab(c, tab) {
    const asli = [...tab.querySelectorAll(":scope > button, :scope > a")];
    {
      const aktif = b => ["aria-selected", "aria-pressed", "aria-current"].some(a => ["true", "page"].includes(b.getAttribute(a)));
      const dua = asli.length === 2, wadah = dua ? el("nav", "db-mode") : daftar;
      const cermin = asli.map(o => { const b = el("button", dua ? "" : "db-nav-b"); b.type = "button"; const sv = o.querySelector("svg");
        if (dua) { if (sv) b.append(sv.cloneNode(true)); b.append(el("span", null, o.textContent.trim())); }
        else { const i = el("i", "db-nav-ik"); if (sv) i.append(sv.cloneNode(true)); b.append(i, el("span", "db-nav-t", o.textContent.trim())); }
        b.addEventListener("click", () => o.click()); return b; });
      const sinkron = () => cermin.forEach((b, i) => b.setAttribute("aria-current", String(aktif(asli[i]))));
      if (dua) { wadah.append(...cermin); nav.prepend(wadah); } else daftar.append(grup(c.grup || "Tampilan", IK.isi), ...cermin);
      sinkron(); new MutationObserver(sinkron).observe(tab, {subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-pressed", "aria-current", "class"]});
      (tab.closest(c.tabWadah || "nav, div") || tab).classList.add("db-sembunyi"); tab.classList.add("db-sembunyi");
    }
  }
  if (sc?.hasAttribute("data-oto")) { const c = {...sc.dataset}; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => otomatis(c)); else otomatis(c); }
  window.DasborA = {pasang, kaki, seksi, otomatis};
})();
