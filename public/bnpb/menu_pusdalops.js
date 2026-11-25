/* Menu atas bersama halaman Pusdalops: Pantau, Logbook, Laporan, Operasi, Perencanaan, Kontak, plus deretan sub-halaman per grup.
   Satu sumber supaya kepala halaman sama persis di semua halaman; yang berganti hanya isi di bawahnya (permintaan pemilik 3 Nov 2026).
   Dipasang ke <header class="ad-top"> yang sudah ada: label .ad-sep dibuang, menu disisipkan sesudah logo. Ikon garis disalin dari
   public/bnpb/wilayah.js supaya berkas ini mandiri (halaman Kontak tidak memuat wilayah.js). Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  /* tema tersimpan (kunci bersama "pk-tema", sama dengan /prediksi dan /lapor/meja) dipasang sedini mungkin supaya tidak berkedip */
  try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t === "dark" || t === "light") document.documentElement.dataset.theme = t; } catch (e) {}
  /* lapisan sistem desain dashboard (data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md) untuk semua halaman Pusdalops */
  if (!document.querySelector('link[href^="/inti/dasbor.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/inti/dasbor.css?v=28"; document.head.append(l); }
  const IKON = {"banjir": "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z", "daftar": "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", "simpan": "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7", "personel": "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", "pin": "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z", "peringatan": "M12 3l9 16H3z|M12 10v4M12 17v.5", "kalender": "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4", "sinyal": "M4 20l.01 0M8 16a5.500 5.500 0 0 1 8 0M5 12.500a10 10 0 0 1 14 0|M3 3l18 18", "meja": "M9 3h6v3H9z|M6 5h12v16H6z|M9 11h6M9 15h4", "grafik": "M3 3v18h18|M7 15l4-4 3 3 5-6", "luar": "M7 17L17 7|M9 7h8v8", "awan": "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.600-1.500A3.500 3.500 0 0 1 17 18z"};
  /* 6 grup di navbar (pemilik 11 Nov 2026: 13 butir dirampingkan); tetap tanpa daftar turun (pemilik 4 Nov 2026): grup berisi lebih dari
     satu halaman menampilkan deretan sub-halaman di bawah kepala. Rute lama tetap; tautan grup membuka halaman pertamanya. */
  const GRUP = [
    ["Pantau", "banjir", [["/bnpb/dalops", "Pantau kejadian", "banjir"], ["/admin/pantau", "Meja Pantau", "meja"], ["/lapor/meja", "Laporan warga", "daftar"]]],
    ["Logbook", "daftar", [["/bnpb/logbook", "Logbook", "daftar"]]],
    ["Laporan", "simpan", [["/bnpb/bahan", "Bahan laporan", "daftar"], ["/admin/laporan-karhutla", "Laporan Bencana", "simpan"]   /* nama dari pemilik 25 Nov 2026; halaman memuat karhutla, banjir, gempa, dan jenis lain */, ["/laporan-bnpb", "Laporan Koordalops", "simpan"], ["/bnpb/dokumen", "Dokumen", "simpan"]]],
    ["Operasi", "personel", [["/bnpb/operasi", "Operasi", "personel"], ["/?operasi", "Operasi lapangan", "pin"], ["/admin/omc", "Sortie OMC", "awan"]]],
    ["Perencanaan", "kalender", [["/bnpb/perencanaan", "Perencanaan", "kalender"], ["/bnpb/siaga", "Siaga", "peringatan"]]],
    ["Kontak", "sinyal", [["/daftar-kontak", "Kontak", "sinyal"]]]];
  const MENU = GRUP.flatMap(g => g[2]);
  /* halaman yang membuka dashboard lain (kerangka sendiri, tanpa menu Pusdalops): diberi ikon panah keluar (pemilik 25 Nov 2026) */
  const LUAR = new Set(["/lapor/meja", "/laporan-bnpb", "/?operasi"]);
  const NS = "http://www.w3.org/2000/svg";
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const kepala = document.querySelector("header.ad-top");
  if (!kepala || kepala.querySelector(".mp-menu")) return;
  kepala.querySelector(".ad-sep")?.remove();
  const kini = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const nav = document.createElement("nav");
  nav.className = "mp-menu"; nav.setAttribute("aria-label", "Halaman Pusdalops");
  const tandaLuar = (a, href, teks) => { if (!LUAR.has(href)) return a; const s = ikon("luar"); s.classList.add("mp-luar-ik"); a.classList.add("mp-luar"); a.append(s);
    a.title = "Membuka dashboard lain"; a.setAttribute("aria-label", teks + ", membuka dashboard lain"); return a; };
  const tautan = (href, teks, ik, kini_) => { const a = document.createElement("a"); a.href = href; a.append(ikon(ik), teks);
    if (kini_) a.setAttribute("aria-current", "page"); return tandaLuar(a, href, teks); };
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
  const butir = (href, teks, ik, aktif) => { const a = el("a", "db-nav-b"); a.href = href; const i = el("i", "db-nav-ik"); i.append(ikon(ik)); a.append(i, el("span", "db-nav-t", teks)); if (aktif) a.setAttribute("aria-current", "true"); return tandaLuar(a, href, teks); };
  const kepalaGrup = (teks, ik) => { const g = el("p", "db-nav-g"), i = el("i"); i.append(ikon(ik)); g.append(i, el("span", null, teks)); return g; };
  /* satu pohon menu (pemilik 11 Nov 2026 "recategorize, pastikan ga berulang"): Pusdalops sekali di puncak, tiap grup jadi butir;
     grup berisi lebih dari satu halaman terbuka-tutup di tempat (tanpa pindah halaman) dan menampilkan halamannya bersarang di bawahnya.
     Seksi halaman yang sedang dibuka (tab Logbook, isi Laporan, jenis bencana Dalops) diisi ke slot yang bersarang di bawah butir halaman itu. */
  /* kepala navy kosong di layar lebar (pemilik 20 Nov 2026 "headernya ada tapi kosong isinya ... kepalanya di atas kiri aja", model /lapor/meja):
     merek pindah ke puncak panel kiri, tombol Keluar ikut ke baris merek; header.ad-top disembunyikan menu_pusdalops.css hanya >= 901px (layar sempit tetap memakai menu atas) */
  const merek = el("div", "mp-merek"), merekA = el("a", "mp-merek-a"), logo = el("img"), nama = el("span", null, "Pusdalops");
  merekA.href = "/bnpb/dalops"; logo.src = "/lapor/lambang-bnpb.png"; logo.alt = ""; logo.width = logo.height = 34;
  nama.append(el("small", null, "Pusat Pengendalian Operasi, khusus staf")); merekA.append(logo, nama); merek.append(merekA);
  const lebar = matchMedia("(min-width:901px)");
  /* tombol tema terang/gelap (pemilik 25 Nov 2026 "tambahin toggle theme"): di baris merek (layar lebar) atau kepala navy (layar sempit), sebelum Keluar */
  const tema = el("button", "mp-tema"); tema.type = "button"; tema.id = "mpTema";
  const ikTema = d => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const x of d.split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", x); s.append(p); } return s; };
  const bulan = ikTema("M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"), surya = ikTema("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z|M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4");
  const temaKini = () => document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const segarTema = () => { const gelap = temaKini() === "dark", label = gelap ? "Ganti ke tema terang" : "Ganti ke tema gelap";
    tema.replaceChildren(gelap ? surya : bulan); tema.title = label; tema.setAttribute("aria-label", label); };
  tema.addEventListener("click", () => { const t = temaKini() === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} segarTema(); dispatchEvent(new CustomEvent("pk-tema", {detail: t})); });   /* peta yang warnanya dihitung dari token (data_bencana.js) mendengarkan "pk-tema" */
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { segarTema(); if (!document.documentElement.dataset.theme) dispatchEvent(new CustomEvent("pk-tema", {detail: temaKini()})); }); segarTema();
  const taruhKeluar = () => { const tuju = lebar.matches ? merek : kepala, k = document.getElementById("keluar"); tuju.append(tema); if (k) tuju.append(k); };
  lebar.addEventListener("change", taruhKeluar);
  /* pindah halaman tanpa terasa pindah situs (pemilik 25 Nov 2026 "ketika ganti halaman itu seamless"): grup yang dilipat dan posisi gulir panel diingat per tab peramban */
  const bacaSesi = (k, b) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? b; } catch (e) { return b; } };
  const simpanSesi = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const TUTUP = new Set(bacaSesi("mp-tutup", []));
  const isi = el("nav", "db-nav-isi mp-side-isi"), slot = el("div", "mp-slot");
  isi.addEventListener("scroll", () => { if (isi.scrollLeft) isi.scrollLeft = 0; }, {passive: true});   /* pemilik 25 Nov 2026: butir panel kiri terpotong di kiri; panel hanya bergulir tegak */
  const panah = () => { const s = ikon("daftar"); s.replaceChildren(); const p = document.createElementNS(NS, "path"); p.setAttribute("d", "M9 6l6 6-6 6"); s.append(p); s.classList.add("mp-panah"); return s; };
  const daun = [];   // [elemen butir halaman, href]
  for (const g of GRUP) {   // judul pohon "Pusdalops" kini di baris merek
    const aktifG = g === grup;
    if (g[2].length === 1) {
      const a = butir(g[2][0][0], g[0], g[1], false); daun.push([a, g[2][0][0]]); isi.append(a);
      if (aktifG) isi.append(slot);
      continue;
    }
    const d = el("details", "mp-g"); d.open = !TUTUP.has(g[0]);   // semua grup terbuka (pemilik 11 Nov 2026 "semua menu masukin sini"); grup yang dilipat pengguna tetap terlipat di halaman berikutnya
    d.addEventListener("toggle", () => { d.open ? TUTUP.delete(g[0]) : TUTUP.add(g[0]); simpanSesi("mp-tutup", [...TUTUP]); });
    const ringkas = el("summary", "db-nav-b mp-g-kepala"), i = el("i", "db-nav-ik"); i.append(ikon(g[1]));
    ringkas.append(i, el("span", "db-nav-t", g[0]), panah()); if (aktifG) ringkas.classList.add("mp-induk");
    const anak = el("div", "mp-anak");
    for (const [href, teks, ik] of g[2]) { const a = butir(href, teks, ik, false); daun.push([a, href]); anak.append(a); if (href === kini) anak.append(slot); }
    d.append(ringkas, anak); isi.append(d);
  }
  const kaki = el("div", "db-nav-kaki");
  samping.append(merek, isi, kaki);
  /* halaman aktif navy selama seksinya kosong; bila seksi terisi, seksi yang navy dan halaman ditebalkan saja */
  const tandai = () => { const kosong = !slot.childElementCount; for (const [a, href] of daun) { a.setAttribute("aria-current", String(kosong && href === kini)); a.hidden = false; } };   /* butir halaman tidak pernah disembunyikan (pemilik 25 Nov 2026: "tombol logbook malah jadi gaada") */   /* seksi terisi: butir halaman itu sendiri tidak ditampilkan (pemilik 11 Nov 2026 "ngapain ada Pantau kejadian"), seksinya langsung di bawah grup */
  tandai(); new MutationObserver(tandai).observe(slot, {childList: true});
  /* catatan kaki panjang dilipat jadi "Catatan" (dulu fungsi ini juga menyalin tab dan seksi halaman ke panel kiri; dicabut pilihan A pemilik 25 Nov 2026) */
  const seksiOtomatis = () => {
    if (slot.dataset.halaman) return;
    /* tab dan seksi halaman TIDAK lagi disalin ke panel kiri (pilihan A pemilik 25 Nov 2026): yang tersisa hanya melipat catatan kaki panjang */
    for (const p of document.querySelectorAll("body main .lb-kaki, body main .pr-kaki")) if (!p.closest("details") && p.textContent.length > 120) { const d = el("details", "db-catatan"); d.append(el("summary", null, "Catatan"), p.cloneNode(true)); p.replaceWith(d); }
  };
  let tunda; new MutationObserver(() => { clearTimeout(tunda); tunda = setTimeout(seksiOtomatis, 120); }).observe(document.body, {childList: true, subtree: true});
  /* panel kiri TETAP di semua halaman Pusdalops (pemilik 25 Nov 2026, pilihan A: "terlalu dinamis, jadinya pusing sendiri"): halaman tidak lagi mengisi panel;
     pakaiSlot mengembalikan null sehingga tiap halaman memakai tab di halamannya sendiri (cadangan layar sempit yang sudah ada) */
  window.MenuPusdalops = {pakaiSlot: () => null, slot: () => slot, grup: kepalaGrup, kaki: baris => { kaki.replaceChildren(kepalaGrup("Pembaruan data", "kalender"), ...baris.map(([w, label, nilai]) => { const r = el("div", "db-nav-pb"), d = el("i", "db-nav-dot"); d.style.setProperty("--w", w); r.append(d, el("span", null, label), el("b", null, nilai)); r.style.setProperty("--w", w); return r; })); }};
  const pasangSamping = () => { const main = document.querySelector("body > main"); if (!main || main.closest(".mp-a")) return;
    const w = el("div", "mp-a"); main.before(w); w.append(samping, main); document.body.classList.add("mp-model-a"); taruhKeluar();
    pulihGulir(); requestAnimationFrame(pulihGulir); };
  /* posisi gulir dipulihkan lagi sesudah dasbor.css (disuntik di atas) termuat: sebelum itu panel belum bisa digulir */
  const pulihGulir = () => { const v = bacaSesi("mp-gulir", 0); if (v && !isi.scrollTop) isi.scrollTop = v; };
  if (document.readyState !== "complete") addEventListener("load", pulihGulir, {once: true});
  addEventListener("pagehide", () => simpanSesi("mp-gulir", isi.scrollTop));
  /* halaman menu diunduh duluan saat kursor atau fokus mendekati tautannya (sekali per alamat), supaya perpindahan terasa langsung; dashboard lain tidak */
  const sudahAmbil = new Set([kini]);
  const ambilDulu = e => { const a = e.target.closest?.("a[href]"); if (!a || a.classList.contains("mp-luar")) return; const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || sudahAmbil.has(u.pathname)) return; sudahAmbil.add(u.pathname);
    const l = document.createElement("link"); l.rel = "prefetch"; l.href = u.pathname; document.head.append(l); };
  for (const x of [samping, nav]) { x.addEventListener("pointerover", ambilDulu, {passive: true}); x.addEventListener("focusin", ambilDulu); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangSamping); else pasangSamping();
})();
