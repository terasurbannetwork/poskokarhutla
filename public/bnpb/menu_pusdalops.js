/* Menu atas bersama halaman Pusdalops: Pantau, Logbook, Laporan, Operasi, Perencanaan, Kontak, plus deretan sub-halaman per grup.
   Satu sumber supaya kepala halaman sama persis di semua halaman; yang berganti hanya isi di bawahnya (permintaan pemilik 3 Nov 2026).
   Dipasang ke <header class="ad-top"> yang sudah ada: label .ad-sep dibuang, menu disisipkan sesudah logo. Ikon garis disalin dari
   public/bnpb/wilayah.js supaya berkas ini mandiri (halaman Kontak tidak memuat wilayah.js). Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  /* lapisan sistem desain dashboard (data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md) untuk semua halaman Pusdalops */
  if (!document.querySelector('link[href^="/inti/dasbor.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/inti/dasbor.css?v=16"; document.head.append(l); }
  const IKON = {"banjir": "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z", "daftar": "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", "simpan": "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7", "personel": "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", "pin": "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z", "peringatan": "M12 3l9 16H3z|M12 10v4M12 17v.5", "kalender": "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4", "sinyal": "M4 20l.01 0M8 16a5.500 5.500 0 0 1 8 0M5 12.500a10 10 0 0 1 14 0|M3 3l18 18", "meja": "M9 3h6v3H9z|M6 5h12v16H6z|M9 11h6M9 15h4", "grafik": "M3 3v18h18|M7 15l4-4 3 3 5-6", "awan": "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.600-1.500A3.500 3.500 0 0 1 17 18z"};
  /* 6 grup di navbar (pemilik 11 Nov 2026: 13 butir dirampingkan); tetap tanpa daftar turun (pemilik 4 Nov 2026): grup berisi lebih dari
     satu halaman menampilkan deretan sub-halaman di bawah kepala. Rute lama tetap; tautan grup membuka halaman pertamanya. */
  const GRUP = [
    ["Pantau", "banjir", [["/bnpb/dalops", "Pantau kejadian", "banjir"], ["/admin/pantau", "Meja Pantau", "meja"]]],
    ["Logbook", "daftar", [["/bnpb/logbook", "Logbook", "daftar"]]],
    ["Laporan", "simpan", [["/bnpb/bahan", "Bahan laporan", "daftar"], ["/admin/laporan-karhutla", "Laporan Karhutla", "simpan"], ["/laporan-bnpb", "Laporan Koordalops", "simpan"], ["/bnpb/dokumen", "Dokumen", "simpan"]]],
    ["Operasi", "personel", [["/bnpb/operasi", "Operasi", "personel"], ["/?operasi", "Operasi lapangan", "pin"], ["/admin/omc", "Sortie OMC", "awan"]]],
    ["Perencanaan", "kalender", [["/bnpb/perencanaan", "Perencanaan", "kalender"], ["/bnpb/siaga", "Siaga", "peringatan"]]],
    ["Kontak", "sinyal", [["/daftar-kontak", "Kontak", "sinyal"]]]];
  const MENU = GRUP.flatMap(g => g[2]);
  const NS = "http://www.w3.org/2000/svg";
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const kepala = document.querySelector("header.ad-top");
  if (!kepala || kepala.querySelector(".mp-menu")) return;
  kepala.querySelector(".ad-sep")?.remove();
  const kini = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const nav = document.createElement("nav");
  nav.className = "mp-menu"; nav.setAttribute("aria-label", "Halaman Pusdalops");
  const tautan = (href, teks, ik, kini_) => { const a = document.createElement("a"); a.href = href; a.append(ikon(ik), teks);
    if (kini_) a.setAttribute("aria-current", "page"); return a; };
  const grup = GRUP.find(g => g[2].some(m => m[0] === kini));
  nav.append(...GRUP.map(g => tautan(g[2][0][0], g[0], g[1], g === grup)));
  if (grup && grup[2].length > 1) {   // deretan sub-halaman: penuh ujung ke ujung, dibagi rata, berikon
    const sub = document.createElement("nav");
    sub.className = "mp-sub"; sub.setAttribute("aria-label", grup[0]);
    sub.append(...grup[2].map(([href, teks, ik]) => tautan(href, teks, ik, href === kini)));
    kepala.after(sub);
  }
  /* halaman admin di menu ini (Meja Pantau, Laporan Karhutla, Sortie OMC): nav admin bawaannya diganti menu ini; tombol Keluar tetap */
  if (MENU.some(m => m[0] === kini)) kepala.querySelector("nav:not(.mp-menu)")?.remove();
  (kepala.querySelector(".ad-logo") || kepala.firstChild).after(nav);

  /* model A (sistem desain dashboard, pemilik 11 Nov 2026 "masuk ke sini"): menu Pusdalops pindah ke panel kiri; halaman yang sedang dibuka
     ditandai, dan seksi halaman itu (mis. jenis bencana Dalops) diisi halamannya ke slot di bawah butirnya lewat MenuPusdalops.slot().
     Menu atas tetap ada untuk layar sempit; di layar lebar disembunyikan dasbor.css (.mp-model-a). main tidak diubah, hanya dibungkus. */
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const samping = el("aside", "db-nav mp-side"); samping.setAttribute("aria-label", "Menu Pusdalops");
  const butir = (href, teks, ik, aktif) => { const a = el("a", "db-nav-b"); a.href = href; const i = el("i", "db-nav-ik"); i.append(ikon(ik)); a.append(i, el("span", "db-nav-t", teks)); if (aktif) a.setAttribute("aria-current", "true"); return a; };
  const kepalaGrup = (teks, ik) => { const g = el("p", "db-nav-g"), i = el("i"); i.append(ikon(ik)); g.append(i, el("span", null, teks)); return g; };
  /* segmen atas = halaman satu grup (mis. Pantau kejadian | Meja Pantau), setara Udara | Darat di /operasi */
  if (grup && grup[2].length === 2) {   // dua halaman: segmen seperti Udara | Darat; tiga atau lebih: daftar berlabel di bawah
    const mode = el("nav", "db-mode"); mode.setAttribute("aria-label", grup[0]);
    for (const [href, teks, ik] of grup[2]) { const a = el("a"); a.href = href; a.append(ikon(ik), el("span", null, teks.replace(/^Pantau kejadian$/, "Kejadian"))); if (href === kini) a.setAttribute("aria-current", "true"); mode.append(a); }
    samping.append(mode);
  }
  const isi = el("nav", "db-nav-isi mp-side-isi"), slot = el("div", "mp-slot");
  if (grup && grup[2].length > 2) isi.append(kepalaGrup(grup[0], grup[1]), ...grup[2].map(([href, teks, ik]) => butir(href, teks, ik, href === kini)));
  isi.append(slot, kepalaGrup("Pusdalops", "daftar"), ...GRUP.map(g => butir(g[2][0][0], g[0], g[1], false)));
  const kaki = el("div", "db-nav-kaki");
  samping.append(isi, kaki);
  /* tanpa seksi dari halaman: butir grup aktif ditandai navy */
  const utama = [...isi.querySelectorAll(":scope > .db-nav-b")].slice(-GRUP.length);
  const tandai = () => { const kosong = !slot.childElementCount && !(grup && grup[2].length > 2); utama.forEach((a, i) => a.setAttribute("aria-current", String(kosong && GRUP[i] === grup))); };
  tandai(); new MutationObserver(tandai).observe(slot, {childList: true});
  /* seksi halaman otomatis: halaman yang tidak mengisi slot sendiri mendapat daftar seksi dari kepala bloknya (h2 pertama tiap .bn-blok / .ex-std),
     klik menggulir ke seksinya, seksi yang sedang dibaca ditandai navy (rujukan /operasi). Catatan kaki panjang dilipat. */
  let io = null;
  const seksiOtomatis = () => {
    if (slot.dataset.halaman) return;
    const kartu = [...document.querySelectorAll("body main .bn-blok, body main .ex.ex-std")].filter(k => !k.closest(".bn-blok .bn-blok") && k.querySelector(":scope > h2, :scope > .ex-hd h3") && !k.classList.contains("sg-pilih"));
    if (kartu.length < 2) return;
    const tanda = kartu.map(k => k.querySelector(":scope > h2, :scope > .ex-hd h3").textContent.trim()).join("|"); if (tanda === slot.dataset.tanda) return; slot.dataset.tanda = tanda;   // tanpa perubahan seksi: jangan gambar ulang (cegah putaran MutationObserver)
    io?.disconnect(); io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) slot.querySelectorAll(".db-nav-b").forEach(b => b.setAttribute("aria-current", String(b.dataset.ke === e.target.id))); }, {rootMargin: "-15% 0px -70% 0px"});
    const pilihan = [...document.querySelectorAll("body main select")].map(x => x.selectedOptions[0]?.textContent.trim());
    slot.replaceChildren(kepalaGrup("Isi halaman", "daftar"), ...kartu.map((k, i) => { k.id ||= "mp-s" + i;
      const j = k.querySelector(":scope > h2, :scope > .ex-hd h3"), b = el("button", "db-nav-b"); b.type = "button"; b.dataset.ke = k.id;
      const ik = el("i", "db-nav-ik"), sv = j.querySelector("svg"); if (sv) ik.append(sv.cloneNode(true));
      const c = j.cloneNode(true); c.querySelectorAll("button, select, input, a, .ops-lbl, small").forEach(x => x.remove());
      let nama = c.textContent.trim().replace(/\s+/g, " ").replace(/ per \d.*$/, "");
      for (const t of pilihan) if (t && nama.endsWith(" " + t)) nama = nama.slice(0, -t.length - 1);   // buang nama daerah terpilih
      b.append(ik, el("span", "db-nav-t", nama)); b.addEventListener("click", () => k.scrollIntoView({behavior: "smooth", block: "start"})); io.observe(k); return b; }));
    for (const p of document.querySelectorAll("body main .lb-kaki, body main .pr-kaki")) if (!p.closest("details") && p.textContent.length > 120) { const d = el("details", "db-catatan"); d.append(el("summary", null, "Catatan"), p.cloneNode(true)); p.replaceWith(d); }
  };
  let tunda; new MutationObserver(() => { clearTimeout(tunda); tunda = setTimeout(seksiOtomatis, 120); }).observe(document.body, {childList: true, subtree: true});
  window.MenuPusdalops = {pakaiSlot: () => { slot.dataset.halaman = "1"; return slot; }, slot: () => slot, grup: kepalaGrup, kaki: baris => { kaki.replaceChildren(kepalaGrup("Pembaruan data", "kalender"), ...baris.map(([w, label, nilai]) => { const r = el("div", "db-nav-pb"), d = el("i", "db-nav-dot"); d.style.setProperty("--w", w); r.append(d, el("span", null, label), el("b", null, nilai)); r.style.setProperty("--w", w); return r; })); }};
  const pasangSamping = () => { const main = document.querySelector("body > main"); if (!main || main.closest(".mp-a")) return;
    const w = el("div", "mp-a"); main.before(w); w.append(samping, main); document.body.classList.add("mp-model-a"); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangSamping); else pasangSamping();
})();
