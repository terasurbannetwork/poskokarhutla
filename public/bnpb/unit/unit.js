"use strict";
/* Cangkang Ruang Unit (tiket RU-020; DESIGN-SYSTEM 3, 7.0-7.2, 8-10; DESAIN-TEKNIS 4.9, 9.4). Satu skrip untuk pintu /bnpb/unit dan 22 halaman /bnpb/unit/<kode>.
   Status sistem dihitung dari GET /api/unit/indeks (berkas sudah diunggah = Tayang), bukan diketik. Kartu data digambar UnitRapor (rapor.js) dari
   GET /api/unit/data/<berkas>; layar tidak menghitung ulang angka. Teks dari data lewat textContent atau esc() di rapor.js; tanpa gaya inline (CSP).
   Klik tab: chrome tab dan panel berganti seketika, ambil dan gambar kartu lewat nanti(); antar kartu memberi jeda ke peramban.
   Tooltip pil memakai atribut title bawaan: pasangTip (tip.js) menulis data-tip sebagai HTML, padahal isi pil berasal dari berkas R2. */
(() => {
  const K = window.UnitKatalog, R = window.UnitRapor, app = document.getElementById("app");
  const NS = "http://www.w3.org/2000/svg";
  const IKON = {...R.IKON,
    risiko: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M12 8v5|M12 16h.01", siaga: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    sitrep: "M7 3h8l4 4v14H7z|M15 3v4h4|M10 12h6|M10 16h6", kinerja: "M4 20V10|M10 20V4|M16 20v-7|M22 20H2",
    cek: "M5 12l4 4 10-10", seru: "M12 3l9 16H3z|M12 10v4|M12 17h.01", jam: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3 2",
    panah: "M5 12h14|M13 6l6 6-6 6", kode: "M8 7l-5 5 5 5|M16 7l5 5-5 5", daftar: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"};
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of (IKON[n] || IKON.data).split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  /* h(tag, atribut, ...anak): teks lewat "teks" (textContent); anak null dan false dibuang sebelum append (Element.append menulis "null") */
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const angka = n => Number(n).toLocaleString("id-ID");
  const tgl = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}).replace(/\./g, "");
  const jeda = () => globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(r => setTimeout(r, 0));
  const pasang = (...x) => app.replaceChildren(...x.filter(Boolean));   // replaceChildren bawaan menulis "null" untuk anak kosong
  const ambil = u => fetch(u, {credentials: "same-origin", signal: AbortSignal.timeout(9000)});

  /* ---------- status sistem dari indeks (DS 5.2.5) ---------- */
  const ST = {tayang: ["Tayang", "cek"], disiapkan: ["Disiapkan", "jam"], menunggu: ["Menunggu data", "kosong"], tunda: ["Ditunda", "kosong"], lokal: ["Dijalankan lokal", "kosong"]};
  const FASE = {F0: ["Perbaikan", "f0"], F1: ["Fase 1", "f1"], F2: ["Fase 2", "f2"], "F2*": ["Fase 2", "f2"], F3: ["Fase 3", "f3"], T: ["Ditunda", "t"]};
  /* entri indeks: berkas sukses tercatat dengan nama berkas, langkah gagal dengan ID sistem (scripts/bnpb/unit/jalan.py) */
  const entri = (s, idx) => idx.find(b => s.berkas && b?.nama === s.berkas) || idx.find(b => b?.sistem === s.id && b?.ok === false) || null;
  function status(s, idx) {
    if (s.lokal) return "lokal";
    if (s.fase === "T") return "tunda";
    const e = entri(s, idx);
    if (e && e.nama === s.berkas && e.ok !== false && e.diunggah) return "tayang";
    return e ? "disiapkan" : "menunggu";
  }
  const pilSt = (st, teks, judul) => h("span", {class: "bn-pil un-st " + st, title: judul}, svg(ST[st][1]), teks ?? ST[st][0]);
  const pilFase = f => { const [t, c] = FASE[f] || FASE.F3; return h("span", {class: "bn-pil un-fase " + c}, t); };
  const basiSejak = e => e?.basi && e.diunggah && typeof e.basi_jam === "number" ? tgl(Date.parse(e.diunggah) + e.basi_jam * 36e5) : null;

  /* ---------- kepala kartu standar: pil kategori, nama seksi berikon (AGENTS 3.5, tanpa kalimat temuan) ---------- */
  const kepala = (ey, ikon, judul, idJudul, ...pil) => h("header", {class: "ex-hd"}, h("span", {class: "ex-ey", teks: ey}), ...pil,
    h("div", {class: "ex-jd"}, h("h3", {id: idJudul}, svg(ikon), judul)));
  const seksi = (id, ey, ikon, judul, pil, ...isi) => h("section", {class: "ex ex-std", id, "aria-labelledby": id + "-j"}, kepala(ey, ikon, judul, id + "-j", ...pil), h("div", {class: "ex-bd"}, ...isi));
  const kosong = t => h("p", {class: "ad-kosong", role: "status"}, svg("kosong"), t);

  function layarMasuk(kode) {
    const jalur = location.pathname + location.search;
    pasang(h("div", {class: "bn-blok un-masuk"}, h("h2", {teks: "Masuk staf"}),
      h("p", {teks: kode === 403 ? "Akunmu belum berhak membuka halaman unit ini. Minta Super Admin menambah perannya." : "Ruang Unit hanya untuk staf BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      kode === 403 ? null : h("a", {class: "bn-tombol", href: "/admin/masuk?ke=" + encodeURIComponent(jalur), teks: "Masuk staf"})));
  }

  async function muatIndeks() {
    try {
      const r = await ambil("/api/unit/indeks");
      if (r.status === 401 || r.status === 403) return {akses: r.status};
      if (r.status === 404) return {berkas: []};   // indeks belum diunggah: semua sistem belum tayang, bukan galat
      if (!r.ok) return {berkas: [], galat: true};
      const j = await r.json();
      return {berkas: Array.isArray(j?.berkas) ? j.berkas : []};
    } catch (e) { return {berkas: [], galat: true}; }
  }
  const spandukIndeks = () => h("p", {class: "bn-pesan galat", role: "status", teks: "Daftar sistem gagal dimuat. Coba lagi beberapa menit lagi. Status di bawah belum tentu terbaru."});

  /* ---------- pintu /bnpb/unit (DS 7.1): kartu per kelompok, baris unit bertaut ---------- */
  function pintu(idx) {
    const grupPintu = g => {
      const sis = K.SISTEM.filter(s => g.unit.includes(s.unit)), st = sis.map(s => status(s, idx));
      const n = x => st.filter(v => v === x).length, tayang = n("tayang"), siap = n("disiapkan");
      const baris = g.unit.map(kode => {
        const u = K.UNIT[kode], milik = K.SISTEM.filter(s => s.unit === kode), t = milik.filter(s => status(s, idx) === "tayang");
        const basi = t.map(s => basiSejak(entri(s, idx))).find(Boolean);
        return h("li", null, h("a", {class: "pt-baris", href: "/bnpb/unit/" + kode, "data-unit": kode},
          h("span", {class: "pt-ik"}, svg(g.ikon)), h("span", {class: "pt-nama"}, u.nama,
            basi ? h("span", {class: "un-basi-blok"}, h("span", {class: "bn-pil un-per un-basi", title: "Data belum diperbarui sejak batas waktunya"}, svg("kalender"), "basi sejak " + basi)) : null),
          h("span", {class: "un-jml" + (t.length ? "" : " un-kosong"), title: `${angka(t.length)} dari ${angka(milik.length)} sistem tayang`},
            t.length ? `${angka(t.length)} tayang` : "belum ada")));
      });
      const lama = (g.tautan || []).map(([rute, nama]) => h("li", null, h("a", {class: "pt-baris", href: rute},
        h("span", {class: "pt-ik"}, svg("daftar")), h("span", {class: "pt-nama", teks: nama}), h("span", {class: "pt-arah"}, svg("panah")))));
      return h("section", {class: "ex ex-std pt-grup", id: "g-" + g.id, "aria-labelledby": "g-" + g.id + "-j"},
        kepala(g.jenis, g.ikon, g.nama, "g-" + g.id + "-j",
          tayang ? pilSt("tayang", `${angka(tayang)} dari ${angka(sis.length)} sistem tayang`) : pilSt("menunggu", "Belum ada sistem tayang"),
          siap ? pilSt("disiapkan", `${angka(siap)} disiapkan`) : null),
        h("div", {class: "ex-bd"}, h("ul", {class: "pt-butir"}, ...baris),
          lama.length ? h("p", {class: "un-sub", teks: "Layar yang sudah ada"}) : null, lama.length ? h("ul", {class: "pt-butir"}, ...lama) : null));
    };
    pasang(h("div", {class: "bn-judul"}, h("h1", {teks: "Ruang Unit"})), idx.galat ? spandukIndeks() : null,
      h("div", {class: "pt-daftar"}, h("div", {class: "pt-grup-grid"}, ...K.KELOMPOK.map(grupPintu))));
  }

  /* ---------- halaman unit (DS 7.2) ---------- */
  const hantu = s => seksi(s.id.toLowerCase(), s.pendek, "data", "Memuat …", [],
    h("div", {class: "un-hantu", "aria-hidden": "true"}, ...Array.from({length: 6}, () => h("i"))), h("p", {class: "sr", role: "status", teks: "Memuat " + s.pendek}));
  const panelGalat = (s, t, ulang) => seksi(s.id.toLowerCase(), s.pendek, "data", s.pendek, [],
    h("p", {class: "bn-pesan galat", role: "status", teks: t}), ulang ? h("button", {type: "button", class: "ad-tombol kecil", "data-ulang": s.id, teks: "Muat ulang"}) : null);

  async function isiSistem(s, panel) {
    panel.dataset.muat = "1";
    panel.replaceChildren(hantu(s));
    let r;
    try { r = await ambil("/api/unit/data/" + encodeURIComponent(s.berkas)); } catch (e) { r = null; }
    if (r && (r.status === 401 || r.status === 403)) return layarMasuk(r.status);
    const panelKosong = () => panel.replaceChildren(seksi(s.id.toLowerCase(), s.pendek, "data", s.pendek, [], kosong("Belum ada data.")));
    if (r && r.status === 404) return panelKosong();   // berkas belum diunggah: kosong, bukan nol
    let j = null;
    if (r?.ok) try { j = await r.json(); } catch (e) { j = null; }
    if (!j) { panel.dataset.muat = ""; return panel.replaceChildren(panelGalat(s, `Data ${s.pendek} gagal dimuat. Coba lagi beberapa menit lagi.`, true)); }
    const daftar = (Array.isArray(j.kartu) ? j.kartu : []).filter(k => k && (!k.sistem || k.sistem === s.id));
    if (!daftar.length) return panelKosong();
    const isi = [];
    for (const k of daftar) { isi.push(R.render(k, j)); await jeda(); }   // satu kartu per tugas: tab lain tetap bisa diklik
    panel.replaceChildren(...isi);
  }

  function tabelSistem(u, sis, idx, tayang) {
    const sel = (label, ...anak) => h("td", {"data-label": label}, ...anak);
    const kodeSumber = s => [s.skrip ? h("a", {href: K.REPO + s.skrip, target: "_blank", rel: "noopener", title: s.skrip}, svg("kode"), "Skrip") : null,
      h("a", {href: K.REPO + K.DT, target: "_blank", rel: "noopener", title: "Desain teknis Ruang Unit"}, svg("daftar"), "Desain teknis")];
    const baris = sis.map(s => { const st = status(s, idx), e = entri(s, idx);
      const judul = st === "disiapkan" && e?.ok === false ? "Langkah pipeline terakhir gagal; berkas lama tetap dipakai bila ada"
        : st === "disiapkan" ? "Pipeline sudah ada, berkas belum terunggah" : st === "menunggu" ? "Menunggu data atau mesin pendukungnya" : st === "lokal" ? "Laporan disusun di luar situs untuk pemilik; tidak ada data internal di halaman ini" : null;
      return h("tr", {"data-sistem": s.id}, h("th", {scope: "row", "data-label": "ID", teks: s.id}), sel("Sistem", s.nama), sel("Fase", pilFase(s.fase)),
        sel("Status", pilSt(st, null, judul)), sel("Mesin", s.mesin || "–"), h("td", {"data-label": "Kode sumber", class: "un-kode"}, ...kodeSumber(s))); });
    const th = (t, judul) => h("th", {scope: "col", title: judul, teks: t});
    return seksi("sistem", u.singkat, "daftar", "Sistem unit ini", [pilSt(tayang ? "tayang" : "menunggu", tayang ? `${angka(tayang)} dari ${angka(sis.length)} tayang` : "Belum ada sistem tayang")],
      tayang ? null : kosong("Belum ada sistem yang tayang untuk unit ini."),
      h("div", {class: "ad-tabel-wadah ex-tabel", role: "region", tabindex: "0", "aria-labelledby": "sistem-j"},
        h("table", {class: "ad-tabel"}, h("caption", {class: "sr", teks: "Sistem " + u.singkat}),
          h("thead", null, h("tr", null, th("ID", "Kode sistem KEPUTUSAN-AWAL 5.1"), th("Sistem"), th("Fase", "Fase 1: data sudah ada; Fase 2: menunggu mesin bersama; Fase 3: menunggu izin atau keputusan"),
            th("Status", "Tayang bila berkas datanya sudah diunggah pipeline"), th("Mesin", "Mesin bersama MB-1 sampai MB-8 yang dipakai"), th("Kode sumber", "Skrip di repo dan desain teknisnya (U1)"))),
          h("tbody", null, ...baris))));
  }

  function halamanUnit(kode, idx) {
    const u = K.UNIT[kode];
    if (!u) return pasang(h("p", {class: "bn-pesan galat", role: "status", teks: "Unit ini tidak dikenal."}));
    document.title = u.singkat + ", Ruang Unit, Centurisk97";
    const sis = K.SISTEM.filter(s => s.unit === kode), tayang = sis.filter(s => status(s, idx) === "tayang");
    const remah = h("nav", {class: "un-remah", "aria-label": "Remah"}, h("a", {href: "/bnpb/unit", teks: "Ruang Unit"}), h("span", {"aria-hidden": "true", teks: "›"}),
      h("a", {href: "/bnpb/unit#g-" + u.kelompok.id, teks: u.kelompok.nama}), h("span", {"aria-hidden": "true", teks: "›"}), h("span", {"aria-current": "page", teks: u.singkat}));
    const panel = new Map(tayang.map(s => [s.id, h("div", {class: "un-panel", id: "p-" + s.id.toLowerCase(), "data-sistem": s.id})]));
    const pSistem = h("div", {class: "un-panel", id: "p-sistem"}, tabelSistem(u, sis, idx, tayang.length));
    const lama = u.tautan.length ? seksi("layar", "Tautan", "panah", "Layar yang sudah ada", [],
      h("ul", {class: "pt-butir"}, ...u.tautan.map(([rute, nama]) => h("li", null, h("a", {class: "pt-baris", href: rute}, h("span", {class: "pt-ik"}, svg("daftar")), h("span", {class: "pt-nama", teks: nama}), h("span", {class: "pt-arah"}, svg("panah"))))))) : null;
    app.classList.add("un-hal");
    const kepalaHal = [remah, h("div", {class: "bn-judul"}, h("h1", {teks: u.nama})), idx.galat ? spandukIndeks() : null];

    if (tayang.length < 2) {   // satu sistem tayang atau tanpa sistem: tanpa .ad-tabs, kartunya langsung (DS 7.2)
      pasang(...kepalaHal, ...panel.values(), pSistem, lama);
      for (const s of tayang) nanti(() => isiSistem(s, panel.get(s.id)));
      return;
    }
    const tabs = [...tayang.map(s => [s.id, s.pendek, "data"]), ["sistem", "Sistem", "daftar"]];
    const daftar = h("div", {class: "ad-tabs un-tabs", role: "tablist", "aria-label": "Sistem " + u.singkat},
      ...tabs.map(([id, nama, ik]) => h("button", {type: "button", role: "tab", id: "tab-" + id.toLowerCase(), "data-tab": id, "aria-selected": "false", tabindex: "-1"}, svg(ik), nama)));
    const semua = [...panel.values(), pSistem];
    semua.forEach((p, i) => { p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", "tab-" + tabs[i][0].toLowerCase()); p.hidden = true; });
    const panelDari = id => id === "sistem" ? pSistem : panel.get(id);
    function pilih(id, fokus) {
      const tb = [...daftar.children];
      for (const b of tb) { const on = b.dataset.tab === id; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; if (on && fokus) b.focus(); }
      for (const p of semua) p.hidden = p !== panelDari(id);
      const q = new URLSearchParams(location.search); q.set("s", id.toLowerCase());
      history.replaceState(null, "", location.pathname + "?" + q + location.hash);
      const s = tayang.find(x => x.id === id), p = panelDari(id);
      if (s && !p.dataset.muat) nanti(() => isiSistem(s, p));   // chrome dulu, kerja berat sesudah frame tercat
    }
    daftar.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b && b.getAttribute("aria-selected") !== "true") pilih(b.dataset.tab, false); });
    daftar.addEventListener("keydown", e => {   // panah memindah fokus, Enter atau Spasi memilih (pilihan berbiaya ambil data: aktivasi manual)
      const tb = [...daftar.children], i = tb.indexOf(document.activeElement); if (i < 0) return;
      const j = {ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tb.length - 1}[e.key]; if (j == null) return;
      e.preventDefault(); const b = tb[(j + tb.length) % tb.length]; tb.forEach(x => { x.tabIndex = x === b ? 0 : -1; }); b.focus();
    });
    pasang(...kepalaHal, daftar, ...semua, lama);
    const minta = (new URLSearchParams(location.search).get("s") || location.hash.slice(1)).toUpperCase();
    pilih(tabs.some(t => t[0].toUpperCase() === minta) ? tabs.find(t => t[0].toUpperCase() === minta)[0] : tayang[0].id, false);
  }

  app.addEventListener("click", e => {   // Muat ulang di kartu galat
    const b = e.target.closest("[data-ulang]"); if (!b) return;
    const s = K.SISTEM.find(x => x.id === b.dataset.ulang), p = b.closest(".un-panel");
    if (s && p) { b.disabled = true; nanti(() => isiSistem(s, p)); }
  });

  (async () => {
    const idx = await muatIndeks();
    if (idx.akses) return layarMasuk(idx.akses);
    const m = location.pathname.match(/^\/bnpb\/unit\/([a-z]{2,4})\/?$/);
    if (m) halamanUnit(m[1], Object.assign(idx.berkas, {galat: idx.galat}));
    else pintu(Object.assign(idx.berkas, {galat: idx.galat}));
  })();
})();
