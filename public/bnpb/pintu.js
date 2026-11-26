/* Pintu /bnpb: halaman pintu Staf BNPB dari GET /api/peta-situs (paket data/kajian-bnpb/peta-situs D4), sudah disaring Worker per peran.
   Dua tingkat (rombak 26 Nov 2026, pemilik: "masih jelek dan berantakan"): deret ubin angka hidup setinggi sama di atas, lalu satu kartu standar per grup
   berisi daftar baris rapat (ikon, nama, panah), dua kartu per baris setinggi sama, daftar dua kolom di dalamnya (26 Nov sore: "berantakan jir", susunan bertingkat dibuang). Angka gagal dimuat = "belum ada data", bukan 0. Teks data lewat textContent. */
(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const IKON = {
    sitrep: "M7 3h8l4 4v14H7z|M15 3v4h4|M10 12h6|M10 16h6",
    relawan: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M4 21a8 8 0 0 1 16 0",
    alun: "M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z",
    riset: "M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3|M8 3h8",
    risiko: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M12 8v5|M12 16h.01",
    meja: "M3 7l9-4 9 4-9 4z|M3 7v10l9 4 9-4V7|M12 11v10",
    admin: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    kinerja: "M4 20V10|M10 20V4|M16 20v-7|M22 20H2",
    kebakaran: "M12 3c1 3-1 4-1 6 0 1.5 1 2 2 2 0-1 1-2 1-2 2 1.5 3 3.5 3 6a5 5 0 0 1-10 0c0-3 3-5 5-12z",
    logbook: "M6 3h12v18H6z|M9 8h6|M9 12h6|M9 16h3",
    siaga: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
    banjir: "M3 17c2 0 2-2 4.5-2S10 17 12 17s2.5-2 4.5-2S19 17 21 17|M3 21c2 0 2-2 4.5-2S10 21 12 21s2.5-2 4.5-2S19 21 21 21|M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9z",
    panah: "M5 12h14|M13 6l6 6-6 6",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const F = v => Number(v).toLocaleString("id-ID");
  const ambil = u => fetch(u, {signal: AbortSignal.timeout(9000)}).then(r => r.ok ? r.json() : null).catch(() => null);
  /* ringkasan indeks risiko ada di awal berkas 900 KB: baca potongan awal saja, jangan unduh semuanya */
  async function awalRisiko() {
    try {
      const r = await fetch("/banjir/data/risiko_kecamatan.json", {signal: AbortSignal.timeout(9000)}); if (!r.ok) return null;
      const rd = r.body.getReader(), dec = new TextDecoder(); let t = "";
      while (t.length < 200000) { const {value, done} = await rd.read(); if (done) break; t += dec.decode(value, {stream: true}); const m = t.match(/"ringkas":\s*(\{[^{}]*\{[^{}]*\}[^{}]*\})/); if (m) { rd.cancel().catch(() => {}); return JSON.parse(m[1]); } }
      rd.cancel().catch(() => {});
    } catch (e) {}
    return null;
  }
  const jumlah = o => Object.values(o || {}).reduce((a, m) => a + Object.values(m || {}).reduce((b, v) => b + (v?.n || 0), 0), 0);

  /* angka hidup per rute: pengambil -> [nilai, label, pil mutu] atau null; [pengambil, pil tetap, sumber] */
  const ANGKA = {
    "/sitrep": [async () => { const r = await ambil("/bencana.json"); const n = r?.bencana?.length; return n ? [F(n), "bencana dalam laporan"] : null; }],
    "/relawan": [async () => { const r = await ambil("/api/relawan/ringkas"); return r && typeof r.siap_tugas === "number" ? [F(r.siap_tugas), "relawan siap tugas"] : null; }],
    "/admin/alun": [async () => { const r = await ambil("/api/alun?jenis=butuh_bantuan"); if (!r || !Array.isArray(r.utas)) return null;
      const n = [...(r.sematan || []), ...r.utas].filter(u => u.bantuan === "terbuka").length; return [F(n) + (r.berikut ? "+" : ""), "permintaan bantuan terbuka"]; }],
    "/riset": [async () => { const r = await ambil("/api/riset/ringkas"); const k = r?.kartu; return k && typeof k.berjalan === "number" ? [F(k.berjalan), "riset berjalan"] : null; }],
    "/risiko": [async () => { const r = await awalRisiko(); const p = r?.per_kelas; return p ? [F((p["Tinggi"] || 0) + (p["Sangat tinggi"] || 0)), "kecamatan berisiko tinggi", "belum diuji balik"] : null; }, null, "BNPB InaRISK, BMKG, PVMBG, WorldPop 2026"],
    "/risiko-kebakaran": [async () => { const r = await ambil("/bnpb/data/kebakaran_31.json"); const i = r?.kolom?.indexOf("kelas");
      return i >= 0 && Array.isArray(r.baris) ? [F(r.baris.filter(b => b[i] === 3).length), "kelurahan sangat tinggi, DKI Jakarta", r.ujibalik?.lulus ? null : "hipotesis"] : null; }, null, "Dinas Gulkarmat DKI, BIG, OpenStreetMap, Google Open Buildings"],
    "/kebutuhan": [async () => { const r = await ambil("/banjir/data/kebutuhan_musim.json"); const v = r?.nasional?.["rata|90"]?.rp_total;
      return typeof v === "number" ? ["Rp" + F(Math.round(v / 1e9)) + " miliar", "perkiraan biaya 90 hari"] : null; }, "perkiraan", "titik panas 2019–2025, rencana operasi karhutla, asumsi kerja tim Centurisk97"],
    "/kinerja-bnpb": [async () => { const r = await ambil("/data/bnpb/iku.json"); const v = r?.kapasitas?.resmi;
      return v ? [v.persen_min_sedang + "%", "daerah berkapasitas minimal sedang, target " + v.target + "%"] : null; }, null, "LAKIP BNPB 2025, Renstra BNPB 2025-2029, NDPBA"],
    "/bnpb/logbook": [async () => { const r = await ambil("/data/logbook_riwayat.json"); const n = Object.values(r?.nasional || {}).reduce((a, y) => a + Object.values(y).reduce((b, v) => b + v, 0), 0);
      return n ? [F(n), `kejadian dalam arsip logbook ${Object.keys(r.nasional).sort()[0]} sampai ${Object.keys(r.nasional).sort().pop()}`] : null; }, null, "Logbook harian Pusdalops BNPB"],
    "/bnpb/dalops": [async () => { const r = await ambil("/api/dalops/banjir"); if (!r?.hari || !Array.isArray(r.kejadian)) return null;   // staf saja: tamu dapat 401 -> "belum ada data"
      const awal = new Date(Date.parse(r.hari) - 6 * 864e5).toISOString().slice(0, 10); return [F(r.kejadian.filter(k => k.terakhir >= awal).length), "laporan banjir sepekan sampai logbook " + r.hari.split("-").reverse().join("/")]; }, null, "Logbook harian Pusdalops BNPB, status banjir Centurisk97"],
    "/bnpb/siaga": [async () => { const r = await ambil("/data/bnpb/siaga.json"); const n = Object.values(r?.kab || {}).filter(k => Object.keys(k.musim).length).length;
      return n ? [F(n), "kabupaten/kota punya musim bencana berulang"] : null; }, null, "Logbook harian Pusdalops BNPB 2014–2020 dan 2024–2025"],
    "/bnpb/rapor-sumber": [async () => { const r = await ambil("/data/bnpb/rapor_sumber.json"); const s = (r?.sel || []).filter(x => x.daerah.tingkat === "nas"); if (!s.length) return null;
      return [F(s.filter(x => x.status !== "belum_cukup").length), "dari " + F(s.length) + " penilaian sumber sudah punya data cukup", "perlu arsip 30 hari"]; }, null, "BMKG, Centurisk97, DIBI BNPB, Logbook Pusdalops"],
    "/bnpb/silang": [async () => { const r = await ambil("/data/bnpb/beda_sumber.json"); const k = r?.ringkas; if (!k) return null;
      return [F(k.n_perlu_dicek), "dari " + F(k.n_dibandingkan) + " perbandingan data resmi dan model perlu dicek", "hipotesis"]; }, null, "BMKG, Open-Meteo, DIBI BNPB, Logbook Pusdalops"],
    "/meja": [async () => { const r = await ambil("/api/meja/ringkas"); return r?.meja ? [F(jumlah(r.meja)), "catatan lapangan"] : null; }],
  };

  const h = (tag, att, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(att || {})) { if (v == null) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v); } for (const a of anak) if (a != null) e.append(a); return e; };
  const MP = window.MenuPusdalops;
  /* ikon butir: ikon panel kiri bila ada (registri peta situs), cadangan ikon berkas ini */
  const IKON_BUTIR = {banjir: "banjir", daftar: "logbook", simpan: "sitrep", personel: "relawan", pin: "risiko", peringatan: "siaga", kalender: "logbook", sinyal: "alun", meja: "meja", grafik: "kinerja", awan: "banjir", atur: "admin"};
  const IKON_GRUP = {pantau: "banjir", kejadian: "daftar", operasi: "pin", laporan: "simpan", risiko: "peringatan", pimpinan: "grafik", jejaring: "personel", pengaturan: "atur"};
  const ikonButir = k => MP?.ikon ? MP.ikon(k) : svg(IKON_BUTIR[k] || "logbook");
  const luar = rute => MP?.dalam ? !MP.dalam(rute) : false;

  const host = document.getElementById("pintu");
  document.getElementById("admin").append(svg("admin"), "Pintu admin");

  /* hero (26 Nov 2026 malam, pemilik: "jadi hero ... tambahin foto sebagai overlay", lalu "masih kurang, bagusin lagi"): kepala berfoto di index.html.
     Hierarki: empat angka UTAMA besar tanpa kotak (dipisah garis tipis, naik dari nol saat dimuat), lalu PITA angka lain di dasar hero (kecil, tanpa angka nol).
     Semua angka diambil dulu, baru digambar sekali. Tanpa angka: tidak tampil (bukan 0). Mutu angka (hipotesis, perkiraan, belum diuji balik)
     hanya di tooltip bersama sumber, tanpa pil ("pill2nya hapus", "jadikan tooltip aja"). */
  const UTAMA = ["/bnpb/dalops", "/sitrep", "/bnpb/siaga", "/risiko"];   // urutan angka utama; yang tak ada diganti angka bukan nol berikutnya
  /* tooltip bergaya (pemilik 26 Nov 2026: "yang kayak gini jadiin tooltip", "kasih penjelasan juga itu apa"): nama halaman, penjelasan angka,
     keterangan angka, mutu, sumber. Penjelasan disusun dari cara angka dihitung di ANGKA di atas, bukan definisi baru. */
  const ARTI = {
    "/bnpb/dalops": "Kejadian banjir di logbook harian Pusdalops yang tercatat dalam 7 hari sampai tanggal logbook terakhir.",
    "/sitrep": "Jenis bencana yang dimuat di Laporan situasi.",
    "/bnpb/siaga": "Kabupaten/kota yang punya musim bencana berulang menurut logbook Pusdalops 2014–2020 dan 2024–2025.",
    "/risiko": "Kecamatan berkelas Tinggi dan Sangat tinggi pada indeks risiko kecamatan.",
    "/risiko-kebakaran": "Kelurahan di DKI Jakarta dengan kelas risiko kebakaran permukiman tertinggi.",
    "/kebutuhan": "Perkiraan biaya penanganan karhutla untuk 90 hari ke depan pada skenario rata-rata.",
    "/kinerja-bnpb": "Persen daerah dengan kapasitas penanggulangan bencana minimal sedang, dibanding target Renstra.",
    "/bnpb/logbook": "Seluruh kejadian yang tercatat di arsip logbook harian Pusdalops.",
    "/bnpb/rapor-sumber": "Penilaian sumber prakiraan tingkat nasional yang datanya sudah cukup untuk dinilai.",
    "/bnpb/silang": "Perbandingan angka sumber resmi dengan model yang selisihnya perlu dicek staf.",
    "/relawan": "Relawan terdaftar yang berstatus siap tugas.",
    "/admin/alun": "Permintaan bantuan di Alun-alun yang belum ditutup.",
    "/riset": "Riset kampus yang sedang berjalan.",
    "/meja": "Catatan lapangan di Meja kerja.",
  };
  const tip = r => ({"data-tip": "", "data-tip-judul": r.b.nama, "data-tip-ikon": r.b.ikon || "", "data-tip-arti": ARTI[r.b.rute] || "",
    "data-tip-nilai": r.x[0], "data-tip-ket": r.x[1], "data-tip-mutu": [r.pilTetap, r.x[2]].filter(Boolean).join(", "), "data-tip-sumber": r.sumber || ""});
  const statUtama = r => h("a", {class: "pt-utama-i", href: r.b.rute, ...tip(r)},
    h("span", {class: "pt-utama-nilai", "data-nilai": r.x[0], teks: r.x[0]}), h("span", {class: "pt-utama-ket", teks: r.x[1]}));
  const statKecil = r => h("a", {class: "pt-kecil", href: r.b.rute, ...tip(r)},
    h("span", {class: "pt-kecil-nama"}, ikonButir(r.b.ikon), h("span", {teks: r.b.nama})), h("span", {class: "pt-kecil-nilai", teks: r.x[0]}));
  /* baris penuh tanpa bolong: grid 60 kolom; tiap baris dibagi rata, baris terakhir yang kurang isi dilebarkan */
  function susun(g, anak, maks) {
    const n = anak.length, baris = Math.ceil(n / maks), c = Math.ceil(n / baris), akhir = n - c * (baris - 1);
    anak.forEach((e, i) => e.style.setProperty("--span", 60 / (i < n - akhir ? c : akhir)));
    g.append(...anak); return g;
  }
  /* angka utama naik dari nol (0,7 detik); awalan dan akhiran dipertahankan ("Rp446 miliar", "50%"); tanpa gerak bila pengguna memintanya */
  function naik(el) {
    const m = /^(\D*)([\d.]+)(.*)$/.exec(el.dataset.nilai || ""); if (!m || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const akhir = Number(m[2].replace(/\./g, "")); if (!Number.isFinite(akhir) || akhir < 10) return;
    const t0 = performance.now(), langkah = t => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + Math.round(akhir * e).toLocaleString("id-ID") + m[3]; if (p < 1) requestAnimationFrame(langkah); else el.textContent = el.dataset.nilai; };
    requestAnimationFrame(langkah);
  }
  async function angkaTerkini(berangka, utamaW, pitaW) {
    utamaW.setAttribute("aria-busy", "true");
    const hasil = await Promise.all(berangka.map(b => { const [ambilAngka, pilTetap, sumber] = ANGKA[b.rute];
      return ambilAngka().catch(() => null).then(x => x && {b, x, pilTetap, sumber}); }));
    utamaW.removeAttribute("aria-busy");
    const ada = hasil.filter(Boolean), bukanNol = ada.filter(r => r.x[0] !== "0");
    const utama = [...UTAMA.map(u => bukanNol.find(r => r.b.rute === u)).filter(Boolean), ...bukanNol.filter(r => !UTAMA.includes(r.b.rute))].slice(0, 4);
    const lain = bukanNol.filter(r => !utama.includes(r));   // angka nol tidak ditampilkan di hero (pemilik: "terlalu penuh"); halamannya tetap di kartu grup
    utamaW.replaceChildren(...utama.map(statUtama)); utamaW.style.setProperty("--n", utama.length || 1);
    utamaW.querySelectorAll(".pt-utama-nilai").forEach(naik);
    if (lain.length) { pitaW.hidden = false; pitaW.replaceChildren(susun(h("div", {class: "pt-pita-grid"}), lain.map(statKecil), 6)); }
  }
  /* gelembung tooltip: satu elemen di body (tidak terpotong overflow pita), muncul saat kursor atau fokus keyboard, hilang saat keluar, gulir, Esc */
  const gel = h("div", {class: "pt-tip", id: "ptTip", role: "tooltip", hidden: ""});
  document.body.append(gel);
  let pemilik = null;
  const tutupTip = () => { if (!pemilik) return; pemilik.removeAttribute("aria-describedby"); pemilik = null; gel.hidden = true; };
  const bukaTip = el => {
    if (pemilik === el) return; tutupTip(); pemilik = el; const d = el.dataset;
    gel.replaceChildren(
      h("div", {class: "pt-tip-kepala"}, h("span", {class: "pt-tip-j"}, ikonButir(d.tipIkon), h("span", {teks: d.tipJudul})), d.tipMutu ? h("span", {class: "pt-tip-mutu", teks: d.tipMutu}) : null),
      h("div", {class: "pt-tip-nilai"}, h("b", {teks: d.tipNilai}), h("span", {teks: d.tipKet})),
      d.tipArti ? h("p", {class: "pt-tip-arti", teks: d.tipArti}) : null,
      d.tipSumber ? h("p", {class: "pt-tip-sumber"}, h("span", {teks: "Sumber"}), d.tipSumber) : null);
    gel.classList.remove("pt-tip-atas"); gel.hidden = false; el.setAttribute("aria-describedby", "ptTip");
    const k = el.getBoundingClientRect(), g = gel.getBoundingClientRect(), jarak = 10;
    let x = k.left + k.width / 2 - g.width / 2, y = k.bottom + jarak;
    if (y + g.height > innerHeight - 8) { y = k.top - g.height - jarak; gel.classList.add("pt-tip-atas"); }
    x = Math.max(8, Math.min(x, innerWidth - g.width - 8));
    gel.style.setProperty("left", x + "px"); gel.style.setProperty("top", Math.max(8, y) + "px");
    gel.style.setProperty("--panah", Math.max(14, Math.min(g.width - 14, k.left + k.width / 2 - x)) + "px");   // panah menunjuk tengah angka
  };
  document.addEventListener("pointerover", e => { const el = e.target.closest?.("[data-tip]"); if (el) bukaTip(el); else if (!e.target.closest?.(".pt-tip")) tutupTip(); });
  document.addEventListener("focusin", e => { const el = e.target.closest?.("[data-tip]"); if (el) bukaTip(el); else tutupTip(); });
  document.addEventListener("focusout", e => { if (e.target === pemilik) tutupTip(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") tutupTip(); });
  addEventListener("scroll", tutupTip, {passive: true});
  const tgl = document.getElementById("heroTgl");
  if (tgl) tgl.textContent = new Date().toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
  const baris = b => {
    const ke = luar(b.rute), a = h("a", {class: "pt-baris", href: b.rute, title: ke ? "Membuka dashboard lain" : null, "aria-label": ke ? b.nama + ", membuka dashboard lain" : null},
      h("span", {class: "pt-ik"}, ikonButir(b.ikon)), h("span", {class: "pt-nama", teks: b.nama}), ke ? h("span", {class: "pt-arah"}, ikonButir("luar")) : null);
    return h("li", null, a);
  };
  const kepala = (ikon, nama) => h("header", {class: "ex-hd"}, h("div", {class: "ex-jd"}, h("h3", null, MP?.ikon ? MP.ikon(ikon) : svg("logbook"), h("span", {teks: nama})),
  ));
  const seksiGrup = g => h("section", {class: "ex ex-std pt-grup", id: "g-" + g.id}, kepala(IKON_GRUP[g.id] || "daftar", g.nama),
    h("div", {class: "ex-bd"}, h("ul", {class: "pt-butir"}, ...g.butir.map(baris))));

  const pesan = t => host.replaceChildren(h("p", {class: "bn-pesan", role: "status", teks: t}));
  pesan("Memuat menu staf…");
  (MP?.peta || fetch("/api/peta-situs", {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null)).then(m => {
    const staf = Array.isArray(m) && m.find(p => p.pintu === "staf");
    if (!m) return pesan("Menu staf belum bisa dimuat. Muat ulang halaman ini.");
    if (!staf) return pesan("Masuk dengan akun staf untuk melihat halaman Ruang Koordinasi.");
    const grup = staf.grup.map(g => ({...g, butir: g.butir.filter(b => b.rute !== "/bnpb")})).filter(g => g.butir.length);   // halaman ini sendiri tidak ditautkan ulang
    const berangka = grup.flatMap(g => g.butir).filter(b => ANGKA[b.rute]);
    const isi = [];
    /* daftar isi hero: grup bernomor, tautan ke kartu grupnya di bawah */
    document.getElementById("heroIsi")?.replaceChildren(...grup.map((g, i) => h("li", null, h("a", {href: "#g-" + g.id},
      h("span", {class: "pt-isi-no", teks: String(i + 1).padStart(2, "0")}), h("span", {class: "pt-isi-nama", teks: g.nama}), h("span", {class: "pt-isi-jml", teks: String(g.butir.length)})))));
    const utamaW = document.getElementById("heroUtama"), pitaW = document.getElementById("heroPita"); if (utamaW && pitaW && berangka.length) angkaTerkini(berangka, utamaW, pitaW);
    isi.push(h("div", {class: "pt-grup-grid"}, ...grup.map(seksiGrup)));
    host.replaceChildren(...isi);
  });
})();
