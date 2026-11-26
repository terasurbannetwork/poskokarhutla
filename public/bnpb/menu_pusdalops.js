/* Menu staf bersama halaman Pusdalops: delapan grup pintu Staf BNPB dari GET /api/peta-situs (paket data/kajian-bnpb/peta-situs, D4, D7, D8),
   sudah disaring Worker per peran; plus deretan sub-halaman per grup. Sebelum jawaban API tiba, menu digambar dari jawaban terakhir
   yang disimpan per tab (sessionStorage "mp-peta"), jadi tanpa daftar tulisan tangan (PS-09); tab baru tanpa simpanan menunggu API.
   Satu sumber supaya kepala halaman sama persis di semua halaman; yang berganti hanya isi di bawahnya (permintaan pemilik 3 Nov 2026).
   Dipasang ke <header class="ad-top"> yang sudah ada: label .ad-sep dibuang, menu disisipkan sesudah logo. Ikon garis disalin dari
   public/bnpb/wilayah.js supaya berkas ini mandiri (halaman Kontak tidak memuat wilayah.js). Tanpa gaya inline (CSP). */
(() => {
  "use strict";
  /* tema tersimpan (kunci bersama "pk-tema", sama dengan /prediksi dan /lapor/meja) dipasang sedini mungkin supaya tidak berkedip */
  try { const t = JSON.parse(localStorage.getItem("pk-tema")); if (t === "dark" || t === "light") document.documentElement.dataset.theme = t; } catch (e) {}
  /* halaman yang juga dibuka bukan-staf (BPBD, petugas berkode, tamu) memuat skrip ini dengan atribut data-opsional: panel hanya dipasang
     bila sesi ini punya menu staf (pemilik 26 Nov 2026 "satukan sistem tampilan semua"); tanpa menu staf halaman tampil apa adanya */
  /* halaman di dalam bingkai (Ruang Laporan /admin/laporan) tidak memasang panel kedua: menunya milik halaman induk */
  try { if (window.self !== window.top) return; } catch (e) { return; }
  const skrip = document.currentScript, opsional = !!skrip?.hasAttribute("data-opsional");
  /* peta situs diminta SEKALI per muat halaman: halaman opsional meminta di sini lalu memuat ulang skrip ini, yang memakai janji yang sama (window.__mpPeta) */
  const ambilPeta = () => window.__mpPeta ||= fetch("/api/peta-situs", {credentials: "same-origin", signal: AbortSignal.timeout(9000)}).then(r => ({status: r.status, m: r.ok ? r.json() : null})).catch(() => ({status: 0, m: null}));
  if (opsional && !window.__mpPeta) { let ada = false; try { ada = (JSON.parse(sessionStorage.getItem("mp-peta")) || []).length > 0; } catch (e) {}
    if (!ada) { ambilPeta().then(x => x.m).then(m => { if (Array.isArray(m) && m.some(p => p?.pintu === "staf" && p.grup?.length)) { const s = document.createElement("script"); s.src = skrip.src; document.head.append(s); } }).catch(() => {});
      return; } }
  /* layar lebar: kepala atas lama disembunyikan SEJAK skrip ini jalan, bukan sesudah halaman selesai dimuat (pemilik 26 Nov 2026: saat pindah menu
     sempat muncul halaman lain dulu, yaitu bilah navy bermenu mendatar sebelum panel kiri terpasang) */
  document.documentElement.classList.add("mp-pra");
  /* lapisan sistem desain dashboard (data/kajian-bnpb/dashboard/DESIGN-SYSTEM.md) untuk semua halaman Pusdalops */
  if (!document.querySelector('link[href^="/bnpb/menu_pusdalops.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/bnpb/menu_pusdalops.css?v=17"; document.head.append(l); }   // halaman yang lupa memuat gaya panel
  if (!document.querySelector('link[href^="/inti/dasbor.css"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/inti/dasbor.css?v=31"; document.head.append(l); }
  const IKON = {"banjir": "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.500 2-5 5-9z", "daftar": "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01", "simpan": "M5 3h11l3 3v15H5z|M8 3v6h7V3M8 21v-7h8v7", "personel": "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0", "pin": "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z|M12 12a2.500 2.500 0 1 0 0-5 2.500 2.500 0 0 0 0 5z", "peringatan": "M12 3l9 16H3z|M12 10v4M12 17v.5", "kalender": "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4", "sinyal": "M4 20l.01 0M8 16a5.500 5.500 0 0 1 8 0M5 12.500a10 10 0 0 1 14 0|M3 3l18 18", "meja": "M9 3h6v3H9z|M6 5h12v16H6z|M9 11h6M9 15h4", "grafik": "M3 3v18h18|M7 15l4-4 3 3 5-6", "luar": "M7 17L17 7|M9 7h8v8", "awan": "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.600-1.500A3.500 3.500 0 0 1 17 18z", "atur": "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"};
  /* peta situs diminta SEKALI per muat halaman, sedini mungkin; pintu.js memakai janji yang sama (MenuPusdalops.peta) */
  let statusPeta = 0;   // jawaban HTTP tanpa butir staf (401, 403, 2xx kosong): simpanan menu tab ini dibuang
  const peta = ambilPeta().then(x => { statusPeta = x.status; return x.m; }).catch(() => null);
  /* ikon grup registri (registri tidak menyimpan ikon grup); ikon butir = kunci IKON yang sama dengan src/peta_situs.js */
  const IKON_GRUP = {pantau: "banjir", kejadian: "daftar", operasi: "pin", laporan: "simpan", risiko: "peringatan", pimpinan: "grafik", jejaring: "personel", pengaturan: "atur"};
  /* satu saringan untuk jawaban API DAN simpanan sessionStorage sebelum gambar: rute jalur sendiri (bukan //host, /\\host, skema, atau :pola),
     nama teks, ikon kunci IKON; grup tanpa butir sah dibuang */
  const ruteAman = r => typeof r === "string" && /^\/(?![\/\\])[^\s"'<>\\:]*$/.test(r);
  const ikonAman = k => typeof k === "string" && Object.hasOwn(IKON, k);
  const saring = G => (Array.isArray(G) ? G : []).filter(g => Array.isArray(g) && typeof g[0] === "string" && ikonAman(g[1]) && Array.isArray(g[2]))
    .map(g => [g[0], g[1], g[2].filter(b => Array.isArray(b) && ruteAman(b[0]) && typeof b[1] === "string" && ikonAman(b[2])).map(b => [b[0], b[1], b[2]])]).filter(g => g[2].length);
  const dariPeta = m => saring((m.find(p => p && p.pintu === "staf")?.grup || []).map(g => [g?.nama, IKON_GRUP[g?.id] || "daftar",
    (Array.isArray(g?.butir) ? g.butir : []).map(b => [b?.rute, b?.nama, ikonAman(b?.ikon) ? b.ikon : "daftar"])]));
  /* halaman yang memuat menu ini; tautan lain membuka dashboard lain (kerangka sendiri) dan diberi ikon panah keluar (pemilik 25 Nov 2026) */
  /* satu sistem tampilan (pemilik 26 Nov 2026 "Satukan sistem tampilan semua. gw ga mau beda"): semua halaman staf memuat menu ini, jadi panel
     kiri tetap saat pindah halaman. Panah "membuka dashboard lain" hanya untuk halaman peta publik yang berkerangka sendiri. */
  const LUAR = new Set(["/?operasi", "/pelaporan", "/presiden"]);
  const DALAM = h => !LUAR.has(h);
  const NS = "http://www.w3.org/2000/svg";
  const ikon = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const kepala = document.querySelector("header.ad-top");
  if (!kepala || kepala.querySelector(".mp-menu")) return;
  kepala.querySelector(".ad-sep")?.remove();
  const kini = location.pathname.replace(/\/$/, "").replace(/\.html$/, "");
  const nav = document.createElement("nav");
  nav.className = "mp-menu"; nav.setAttribute("aria-label", "Halaman Pusdalops");
  const tandaLuar = (a, href, teks) => { if (DALAM(href)) return a; const s = ikon("luar"); s.classList.add("mp-luar-ik"); a.classList.add("mp-luar"); a.append(s);
    a.title = "Membuka dashboard lain"; a.setAttribute("aria-label", teks + ", membuka dashboard lain"); return a; };
  const tautan = (href, teks, ik, kini_) => { const a = document.createElement("a"); a.href = href; a.append(ikon(ik), teks);
    if (kini_) a.setAttribute("aria-current", "page"); return tandaLuar(a, href, teks); };
  let sub = null;
  const gambarAtas = (G, grup) => {
    nav.replaceChildren(...G.map(g => tautan(g[2][0][0], g[0], g[1], g === grup)));
    sub?.remove(); sub = null;
    if (grup && grup[2].length > 1) {   // deretan sub-halaman: penuh ujung ke ujung, dibagi rata, berikon
      sub = document.createElement("nav");
      sub.className = "mp-sub"; sub.setAttribute("aria-label", grup[0]);
      sub.append(...grup[2].map(([href, teks, ik]) => tautan(href, teks, ik, href === kini)));
      kepala.after(sub);
    }
    /* halaman admin di menu ini (Meja Pantau, Laporan Karhutla, Sortie OMC): nav admin bawaannya diganti menu ini; tombol Keluar tetap */
    kepala.querySelector('nav[aria-label="Halaman staf"], nav[aria-label="Halaman admin"]')?.remove();   /* menu atas lama kerangka admin: satu menu saja (pemilik 26 Nov 2026) */
  };
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
  logo.src = "/lapor/lambang-bnpb.png"; logo.alt = ""; logo.width = logo.height = 34;
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
  const gambarSamping = (G, grup) => {
    daun.length = 0; isi.replaceChildren();
    for (const g of G) {   // judul pohon "Pusdalops" kini di baris merek
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
  };
  const kaki = el("div", "db-nav-kaki");
  samping.append(merek, isi, kaki);
  /* halaman aktif navy selama seksinya kosong; bila seksi terisi, seksi yang navy dan halaman ditebalkan saja */
  const tandai = () => { const kosong = !slot.childElementCount; for (const [a, href] of daun) { a.setAttribute("aria-current", String(kosong && href === kini)); a.hidden = false; } };   /* butir halaman tidak pernah disembunyikan (pemilik 25 Nov 2026: "tombol logbook malah jadi gaada") */   /* seksi terisi: butir halaman itu sendiri tidak ditampilkan (pemilik 11 Nov 2026 "ngapain ada Pantau kejadian"), seksinya langsung di bawah grup */
  /* satu titik gambar: jawaban peta situs terakhir di tab ini dulu, lalu jawaban baru begitu API menjawab. Beranda di merek = /bnpb bila peran ini boleh membukanya */
  const gambar = G => { const grup = G.find(g => g[2].some(m => m[0] === kini)), rute = G.flatMap(g => g[2].map(m => m[0]));
    gambarAtas(G, grup); gambarSamping(G, grup); tandai(); merekA.href = rute.includes("/bnpb") || !rute.length ? "/bnpb" : rute[0]; };
  /* simpanan = menu staf hasil dariPeta (bukan seluruh jawaban API). Gagal tanpa simpanan: satu pesan polos + tautan ke pintu /bnpb, bukan menu kosong */
  const simpanan = saring(bacaSesi("mp-peta", null)), adaSimpan = simpanan.length > 0;
  /* keluar (tombol #keluar dari /inti/keluar.js, data-staf-keluar, atau form /admin/keluar): simpanan menu tab ini dibuang sebelum sesi dicabut */
  const buangKeluar = e => { if (e.target.closest?.('#keluar, [data-staf-keluar], .ad-keluar, form[action="/admin/keluar"]')) try { sessionStorage.removeItem("mp-peta"); } catch (x) {} };
  document.addEventListener("click", buangKeluar, true); document.addEventListener("submit", buangKeluar, true);
  const gagal = () => { if (opsional) { document.documentElement.classList.remove("mp-pra"); const w = samping.closest(".mp-a"); samping.remove(); nav.remove(); sub?.remove(); document.body.classList.remove("mp-model-a"); if (w) w.replaceWith(...w.childNodes); return; }   // sesi bukan staf lagi: halaman kembali apa adanya
    gambar([]); const t = "Menu belum bisa dimuat. Muat ulang halaman.";
    isi.replaceChildren(el("p", "db-nav-sub", t), butir("/bnpb", "Pintu staf BNPB", "daftar", false)); nav.replaceChildren(el("span", null, t), tautan("/bnpb", "Pintu staf BNPB", "daftar", false)); };
  gambar(adaSimpan ? simpanan : []);
  new MutationObserver(tandai).observe(slot, {childList: true});
  peta.then(m => { const G = Array.isArray(m) ? dariPeta(m) : [];
    const buang = !G.length && (statusPeta === 401 || statusPeta === 403 || (statusPeta >= 200 && statusPeta < 300));   // jawaban tanpa butir staf: simpanan dibuang (privasi); jaringan putus atau 5xx: simpanan tetap
    if (buang) { try { sessionStorage.removeItem("mp-peta"); } catch (e) {} }
    if (!G.length) { if (!adaSimpan || buang) gagal(); return; }
    if (adaSimpan && JSON.stringify(G) === JSON.stringify(simpanan)) return;   // sama dengan yang sudah tergambar: tanpa gambar ulang
    simpanSesi("mp-peta", G); gambar(G); pulihGulir(); });
  /* catatan kaki panjang dilipat jadi "Catatan" (dulu fungsi ini juga menyalin tab dan seksi halaman ke panel kiri; dicabut pilihan A pemilik 25 Nov 2026) */
  const seksiOtomatis = () => {
    if (slot.dataset.halaman) return;
    /* tab dan seksi halaman TIDAK lagi disalin ke panel kiri (pilihan A pemilik 25 Nov 2026): yang tersisa hanya melipat catatan kaki panjang */
    for (const p of document.querySelectorAll("body main .lb-kaki, body main .pr-kaki")) if (!p.closest("details") && p.textContent.length > 120) { const d = el("details", "db-catatan"); d.append(el("summary", null, "Catatan"), p.cloneNode(true)); p.replaceWith(d); }
  };
  let tunda; new MutationObserver(() => { clearTimeout(tunda); tunda = setTimeout(seksiOtomatis, 120); }).observe(document.body, {childList: true, subtree: true});
  /* panel kiri TETAP di semua halaman Pusdalops (pemilik 25 Nov 2026, pilihan A: "terlalu dinamis, jadinya pusing sendiri"): halaman tidak lagi mengisi panel;
     pakaiSlot mengembalikan null sehingga tiap halaman memakai tab di halamannya sendiri (cadangan layar sempit yang sudah ada) */
  /* ikon dan dalam dipakai pintu /bnpb (pintu.js): ikon butir dan tanda "membuka dashboard lain" sama persis dengan panel kiri */
  window.MenuPusdalops = {peta, ikon: n => ikon(ikonAman(n) ? n : "daftar"), dalam: DALAM, pakaiSlot: () => null, slot: () => slot, grup: kepalaGrup, kaki: baris => { kaki.replaceChildren(kepalaGrup("Pembaruan data", "kalender"), ...baris.map(([w, label, nilai]) => { const r = el("div", "db-nav-pb"), d = el("i", "db-nav-dot"); d.style.setProperty("--w", w); r.append(d, el("span", null, label), el("b", null, nilai)); r.style.setProperty("--w", w); return r; })); }};
  const pasangSamping = () => { const main = document.querySelector("body > main"); if (!main || main.closest(".mp-a")) return;
    const w = el("div", "mp-a"); main.before(w); w.append(samping, main); document.body.classList.add("mp-model-a"); taruhKeluar(); tarik(w);
    pulihGulir(); requestAnimationFrame(pulihGulir); };
  /* panel kiri bisa ditarik 200 sampai 320 px (D7; sama dengan pegangan .db-tarik dasbor.js, kunci lebar yang sama): lebar = --db-w di .mp-a, ditulis di rAF */
  const tarik = w => {
    const pagar = x => Math.max(200, Math.min(320, Math.round(x))), tk = el("span", "db-tarik");
    tk.tabIndex = 0; tk.setAttribute("role", "separator"); tk.setAttribute("aria-orientation", "vertical"); tk.setAttribute("aria-label", "Tarik lebar panel");
    tk.setAttribute("aria-valuemin", "200"); tk.setAttribute("aria-valuemax", "320");
    const setW = x => { x = pagar(x); w.style.setProperty("--db-w", x + "px"); tk.setAttribute("aria-valuenow", String(x)); return x; };
    const simpan = x => { try { localStorage.setItem("db_nav_lebar", String(x)); } catch (e) {} };
    try { const x = +localStorage.getItem("db_nav_lebar"); setW(x || 284); } catch (e) { setW(284); }
    let x0 = 0, w0 = 0, x1 = 0, rid = 0;
    const gerak = e => { x1 = pagar(w0 + e.clientX - x0); if (!rid) rid = requestAnimationFrame(() => { rid = 0; setW(x1); }); };
    const lepas = () => { tk.classList.remove("aktif"); removeEventListener("pointermove", gerak); removeEventListener("pointerup", lepas); removeEventListener("pointercancel", lepas); cancelAnimationFrame(rid); rid = 0; simpan(setW(x1)); };
    tk.addEventListener("pointerdown", e => { e.preventDefault(); x0 = e.clientX; w0 = x1 = samping.offsetWidth; tk.classList.add("aktif"); addEventListener("pointermove", gerak); addEventListener("pointerup", lepas); addEventListener("pointercancel", lepas); });
    tk.addEventListener("keydown", e => { if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return; e.preventDefault(); simpan(setW(samping.offsetWidth + (e.key === "ArrowRight" ? 16 : -16))); });
    samping.append(tk);
  };
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
  /* panel dipasang begitu <main> muncul di DOM, tidak menunggu DOMContentLoaded (skrip berat sesudah main menunda event itu sampai
     ratusan milidetik, dan selama itu halaman tampil tanpa panel lalu melompat); parser tetap mengisi main walau main sudah dipindah ke .mp-a */
  if (document.querySelector("body > main") || document.readyState !== "loading") pasangSamping();
  else { const amati = new MutationObserver(() => { if (document.querySelector("body > main")) { amati.disconnect(); pasangSamping(); } });
    amati.observe(document.documentElement, {childList: true, subtree: true});
    document.addEventListener("DOMContentLoaded", () => { amati.disconnect(); pasangSamping(); }, {once: true}); }
})();
