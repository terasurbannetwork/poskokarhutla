/* Pintu /bnpb: kartu ke tiap sistem Ruang Koordinasi dengan angka hidup dari endpoint ringkas masing-masing.
   Angka gagal dimuat = "belum ada data" (bukan kartu kosong). Teks data lewat textContent. */
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

  /* [id, judul, tautan, ikon, label khusus, pengambil angka -> [nilai, label] atau null, pil khusus] */
  const KARTU = [
    ["sitrep", "Laporan situasi", "/sitrep", "sitrep", async () => { const r = await ambil("/bencana.json"); const n = r?.bencana?.length; return n ? [F(n), "bencana dalam laporan"] : null; }],
    ["relawan", "Relawan", "/relawan", "relawan", async () => { const r = await ambil("/api/relawan/ringkas"); return r && typeof r.siap_tugas === "number" ? [F(r.siap_tugas), "relawan siap tugas"] : null; }],
    ["alun", "Alun-alun", "/alun-alun", "alun", async () => { const r = await ambil("/api/alun?jenis=butuh_bantuan"); if (!r || !Array.isArray(r.utas)) return null;
      const n = [...(r.sematan || []), ...r.utas].filter(u => u.bantuan === "terbuka").length; return [F(n) + (r.berikut ? "+" : ""), "permintaan bantuan terbuka"]; }],
    ["riset", "Riset", "/riset", "riset", async () => { const r = await ambil("/api/riset/ringkas"); const k = r?.kartu; return k && typeof k.berjalan === "number" ? [F(k.berjalan), "riset berjalan"] : null; }],
    ["risiko", "Indeks risiko kecamatan", "/risiko", "risiko", async () => { const r = await awalRisiko(); const p = r?.per_kelas; return p ? [F((p["Tinggi"] || 0) + (p["Sangat tinggi"] || 0)), "kecamatan berisiko tinggi", "belum diuji balik"] : null; }, null, "BNPB InaRISK, BMKG, PVMBG, WorldPop 2026"],
    ["kebakaran", "Risiko kebakaran permukiman", "/risiko-kebakaran", "kebakaran", async () => { const r = await ambil("/bnpb/data/kebakaran_31.json"); const i = r?.kolom?.indexOf("kelas");
      return i >= 0 && Array.isArray(r.baris) ? [F(r.baris.filter(b => b[i] === 3).length), "kelurahan sangat tinggi, DKI Jakarta", r.ujibalik?.lulus ? null : "hipotesis"] : null; }, null, "Dinas Gulkarmat DKI, BIG, OpenStreetMap, Google Open Buildings"],
    ["kebutuhan", "Kebutuhan musim", "/kebutuhan", "sitrep", async () => { const r = await ambil("/banjir/data/kebutuhan_musim.json"); const v = r?.nasional?.["rata|90"]?.rp_total;
      return typeof v === "number" ? ["Rp" + F(Math.round(v / 1e9)) + " miliar", "perkiraan biaya 90 hari"] : null; }, "perkiraan", "titik panas 2019–2025, rencana operasi karhutla, asumsi kerja tim Centurisk97"],
    ["kinerja", "Kinerja BNPB", "/kinerja-bnpb", "kinerja", async () => { const r = await ambil("/data/bnpb/iku.json"); const v = r?.kapasitas?.resmi;
      return v ? [v.persen_min_sedang + "%", "daerah berkapasitas minimal sedang, target " + v.target + "%"] : null; }, null, "LAKIP BNPB 2025, Renstra BNPB 2025-2029, NDPBA"],
    ["logbook", "Logbook Pusdalops", "/bnpb/logbook.html", "logbook", async () => { const r = await ambil("/data/logbook_riwayat.json"); const n = Object.values(r?.nasional || {}).reduce((a, y) => a + Object.values(y).reduce((b, v) => b + v, 0), 0);
      return n ? [F(n), `kejadian dalam arsip logbook ${Object.keys(r.nasional).sort()[0]} sampai ${Object.keys(r.nasional).sort().pop()}`] : null; }, "untuk staf Pusdalops", "Logbook harian Pusdalops BNPB"],
    ["dalops", "Pantau Banjir Dalops", "/bnpb/dalops", "banjir", async () => { const r = await ambil("/api/dalops/banjir"); if (!r?.hari || !Array.isArray(r.kejadian)) return null;   // staf saja: tamu dapat 401 -> "belum ada data"
      const awal = new Date(Date.parse(r.hari) - 6 * 864e5).toISOString().slice(0, 10); return [F(r.kejadian.filter(k => k.terakhir >= awal).length), "laporan banjir sepekan sampai logbook " + r.hari.split("-").reverse().join("/")]; }, "untuk staf Pusdalops", "Logbook harian Pusdalops BNPB, status banjir Centurisk97"],
    ["siaga", "Siaga pra-musim", "/bnpb/siaga", "siaga", async () => { const r = await ambil("/data/bnpb/siaga.json"); const n = Object.values(r?.kab || {}).filter(k => Object.keys(k.musim).length).length;
      return n ? [F(n), "kabupaten/kota punya musim bencana berulang"] : null; }, "untuk staf Pusdalops", "Logbook harian Pusdalops BNPB 2014–2020 dan 2024–2025"],
    ["rapor-sumber", "Rapor sumber prakiraan", "/bnpb/rapor-sumber", "kinerja", async () => { const r = await ambil("/data/bnpb/rapor_sumber.json"); const s = (r?.sel || []).filter(x => x.daerah.tingkat === "nas"); if (!s.length) return null;
      return [F(s.filter(x => x.status !== "belum_cukup").length), "dari " + F(s.length) + " penilaian sumber sudah punya data cukup", "perlu arsip 30 hari"]; }, "untuk staf Pusdalops", "BMKG, Centurisk97, DIBI BNPB, Logbook Pusdalops"],
    ["silang", "Kajian silang sumber", "/bnpb/silang", "logbook", async () => { const r = await ambil("/data/bnpb/beda_sumber.json"); const k = r?.ringkas; if (!k) return null;
      return [F(k.n_perlu_dicek), "dari " + F(k.n_dibandingkan) + " perbandingan resmi lawan model perlu dicek", "hipotesis"]; }, "untuk staf Pusdalops", "BMKG, Open-Meteo, DIBI BNPB, Logbook Pusdalops"],
    ["siklus", "Siklus Bencana", "/siklus/", "siaga", async () => ["5", "alat kerja: Buku Besar Kejadian, Kaji Cepat, Jitupasna ke R3P, Renkon dan Gladi, Risiko Masa Depan"], "untuk staf"],
    ["meja", "Meja kerja", "/meja", "meja", async () => { const r = await ambil("/api/meja/ringkas"); return r?.meja ? [F(jumlah(r.meja)), "catatan lapangan"] : null; }, "untuk petugas BPBD"],
  ];

  const h = (tag, att, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(att || {})) { if (v == null) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v); } for (const a of anak) if (a != null) e.append(a); return e; };
  const pil = (teks, ikon) => { const e = h("span", {class: "bn-pil"}); if (ikon) e.append(svg(ikon)); e.append(teks); return e; };

  const host = document.getElementById("pintu");
  document.getElementById("admin").append(svg("admin"), "Pintu admin");
  for (const [id, judul, href, ikon, ambilAngka, petugas, sumber] of KARTU) {
    const angka = h("div", {class: "pt-angka"}), a = h("a", {class: "bn-kartu pt-kartu", href, id: "k-" + id},
      h("h2", null, svg(ikon), judul, h("span", {class: "pt-panah"}, svg("panah"))), angka, petugas ? pil(petugas, "meja") : null, sumber ? h("div", {class: "bn-label", teks: "Sumber: " + sumber}) : null);
    const kosong = () => angka.append(h("span", {class: "bn-label", teks: "belum ada data"}));
    host.append(a);
    ambilAngka().then(x => { if (!x) return kosong(); angka.append(h("span", {class: "bn-angka", teks: x[0]}), h("span", {class: "bn-label", teks: x[1]})); if (x[2]) a.append(pil(x[2], "risiko")); }).catch(kosong);
  }
})();
