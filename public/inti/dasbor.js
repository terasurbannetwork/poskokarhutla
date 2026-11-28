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
  /* pegangan tarik lebar panel kiri 200-320 px (PB-02): lebar = variabel --db-w di <html> (semua .db-a ikut), ditulis di rAF; disimpan per penonton, layar benar tanpa penyimpanan */
  const KUNCI = "db_nav_lebar", pagar = w => Math.max(200, Math.min(320, Math.round(w)));
  let tkEl;   // variabel ditulis ke tiap .db-a (bukan <html>) supaya invalidasi style terbatas pada layar ini
  const setW = w => { w = pagar(w); document.querySelectorAll(".db-a").forEach(a => a.style.setProperty("--db-w", w + "px")); tkEl?.setAttribute("aria-valuenow", String(w)); };
  function tarik(aside) {
    if (!aside || aside.querySelector(":scope>.db-tarik")) return;
    const tk = tkEl = el("span", "db-tarik"); tk.tabIndex = 0; tk.setAttribute("role", "separator"); tk.setAttribute("aria-orientation", "vertical"); tk.setAttribute("aria-label", "Tarik lebar panel");
    tk.setAttribute("aria-valuemin", "200"); tk.setAttribute("aria-valuemax", "320"); tk.setAttribute("aria-valuenow", "284");
    aside.append(tk);
    try { const w = +localStorage.getItem(KUNCI); if (w) setW(w); } catch (e) {}
    const simpan = w => { try { localStorage.setItem(KUNCI, String(w)); } catch (e) {} };
    let x0 = 0, w0 = 0, w = 0, rid = 0;
    const gerak = e => { w = pagar(w0 + e.clientX - x0); if (!rid) rid = requestAnimationFrame(() => { rid = 0; setW(w); }); };
    const lepas = () => { tk.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); removeEventListener("pointercancel", lepas); cancelAnimationFrame(rid); rid = 0; setW(w); simpan(w); };
    tk.addEventListener("pointerdown", e => { e.preventDefault(); try { tk.setPointerCapture(e.pointerId); } catch (x) {} x0 = e.clientX; w0 = w = aside.offsetWidth; tk.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); addEventListener("pointercancel", lepas); });
    tk.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); w = pagar(aside.offsetWidth + (e.key === "ArrowRight" ? 16 : -16)); setW(w); simpan(w); });
  }
  function pasang(o = {}) {
    const main = document.querySelector("main.bn-wrap"); if (!main || main.classList.contains("db-a")) return;
    const kanan = el("div", "db-kanan"); kanan.append(...main.childNodes);
    nav = el("aside", "db-nav"); nav.setAttribute("aria-label", "Seksi halaman");
    const id = el("div", "db-nav-id"); id.append(el("b", null, o.nama || document.querySelector("h1")?.textContent || ""), el("small", null, o.sub || "Centurisk97, Ruang Koordinasi"));
    daftar = el("nav", "db-nav-isi"); kakiEl = el("div", "db-nav-kaki");
    nav.append(id, grup("Isi halaman", IK.isi), daftar, kakiEl);
    main.classList.add("db-a"); main.append(nav, kanan); tarik(nav);
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
    nav.append(daftar, kakiEl); tarik(nav);
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
  /* ---- pembantu dashboard bersama (diekstrak dari /operasi, DB-02): label pil berikon, tabel berkepala navy, urut dan lipat grup, kolom simetris, pop-up.
     Kelas .ops-* tetap milik CSS /operasi sampai layar lain ikut memakainya. */
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const IK_LBL = {catat: '<path d="M9 4h6v3H9z"/><path d="M15 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/>', vis: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', angin: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
    es: '<path d="M12 2v20M4.9 6l14.2 12M4.9 18 19.1 6"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2"/>', garam: '<path d="M12 3 20 7.5v9L12 21 4 16.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>',
    jam: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', silang: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>', tren: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>', siap: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', sortie: '<path d="M4 19c4-1 6-5 8-9s5-6 8-6"/><circle cx="4" cy="19" r="1.6"/>', temuan: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', awan: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>', air: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', padam: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/><path d="M4 4l16 16"/>',
    kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', respons: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4M12 2v3"/>', base: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', api: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 2 1.5 3 3 3-1-3 0-6 0-8.5z"/>', unduh: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', peran: '<path d="M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1-2h2l-1 4 1 4h-2l-1-2-5 1 2 7h-2l-4-6-7 1-1-2z"/>',
    op: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', milik: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>', ember: '<path d="M5 7h14l-2 13H7zM5 7a7 3 0 0 1 14 0"/>', asap: '<path d="M4 15a4 4 0 0 1 4-4 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 17H7a3 3 0 0 1-3-2z"/>', ts: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'};
  const lbl = (k, t) => `<span class="ops-lbl" data-k="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_LBL[k]}</svg>${t}</span>`;
  const tabelH = (kepala, baris, kosong) => baris.length ? `<div class="tw ops-tw ex-tabel"><table><thead><tr>${kepala.map(k => { const [t, tip] = k.split("|");
      return `<th${t.startsWith("#") ? ' class="n"' : ""}${tip ? ` title="${esc(tip)}"` : ""}>${t.replace(/^#/, "")}</th>`; }).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`
    : `<p class="ops-kosong">${kosong}</p>`;
  const kolomSim = n => n <= 5 ? Math.max(n, 1) : n % 3 === 0 ? 3 : n % 4 === 0 ? 4 : Math.min(4, Math.ceil(n / 2));
  const lipatGrup = tr => { const buka = tr.getAttribute("aria-expanded") !== "true"; tr.setAttribute("aria-expanded", String(buka));
    for (let r = tr.nextElementSibling; r && !r.classList.contains("ops-grup"); r = r.nextElementSibling) { const bb = r.classList.contains("ops-rinci") ? r.previousElementSibling : r;
      r.hidden = !buka || bb.dataset.lolos === "" || (r !== bb && bb.getAttribute("aria-expanded") !== "true"); } };
  function urutTabel(th) {
    const tb = th.closest("table").tBodies[0], i = [...th.parentElement.children].indexOf(th), turun = th.getAttribute("aria-sort") !== "descending";
    th.parentElement.querySelectorAll("th").forEach(x => x.removeAttribute("aria-sort")); th.setAttribute("aria-sort", turun ? "descending" : "ascending");
    const nilai = tr => { const td = tr.children[i]; if (!td) return null; const ds = td.dataset.sort ?? td.querySelector("[data-sort]")?.dataset.sort; if (ds != null) return +ds;
      const t = (td.querySelector("b")?.textContent || td.textContent).trim(); if (!t || t === "–") return null;
      const n = t.replace(/\./g, "").replace(",", ".").match(/^-?\d+(\.\d+)?/); return n ? +n[0] : t.toLowerCase(); };
    const tetap = [...tb.rows].filter(r => r.classList.contains("ops-total")), lain = [...tb.rows].filter(r => !r.classList.contains("ops-total"));
    lain.sort((a, b) => { const x = nilai(a), y = nilai(b); if (x == null) return y == null ? 0 : 1; if (y == null) return -1;
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id"); return turun ? -c : c; });
    tb.append(...tetap, ...lain);
  }
  /* satu <dialog> untuk semua pop-up layar; wadah = elemen induk (supaya gaya layar ikut), saatTanggal(tgl) dipanggil bila tanggal di grafik pop-up diklik */
  function bukaDialog(html, {wadah, saatTanggal} = {}) {
    let d = document.getElementById("opsDlgAr");
    if (!d) { d = document.createElement("dialog"); d.id = "opsDlgAr"; d.className = "ops-dlg"; (wadah || document.body).append(d);   // di dalam #opsLaporan supaya gaya layar ikut
      d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-tutup]")) return d.close();
        const tg = e.target.closest(".ops-rp-tren [data-tgl]"); if (tg) { d.close(); saatTanggal?.(tg.dataset.tgl); } });
      /* tooltip grafik pop-up: isi dari data-otip (HTML yang sudah di-escape saat dibuat), mengikuti kursor */
      const tip = document.createElement("div"); tip.className = "ops-tip"; tip.hidden = true; d.append(tip);
      d.addEventListener("pointermove", e => { const el = e.target.closest?.("[data-otip]"); if (!el) { tip.hidden = true; return; }
        if (tip.dataset.dari !== el.dataset.otip) { tip.innerHTML = el.dataset.otip; tip.dataset.dari = el.dataset.otip; }
        tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(innerWidth - w - 8, e.clientX + 14) + "px"; tip.style.top = Math.max(8, e.clientY - h - 12) + "px"; });
      d.addEventListener("pointerleave", () => { tip.hidden = true; }); }
    d.querySelector(".ops-dlg-isi")?.remove(); d.insertAdjacentHTML("afterbegin", `<div class="ops-dlg-isi">${html}</div>`);
    if (!d.open) d.showModal();
  }
  window.DasborA = {pasang, kaki, seksi, otomatis, tarik};
  window.Dasbor = {lbl, tabelH, kolomSim, lipatGrup, urutTabel, bukaDialog, IK_LBL};
})();
