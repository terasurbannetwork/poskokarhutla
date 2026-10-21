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
    kebakaran: "M12 3c1 3-1 4-1 6 0 1.5 1 2 2 2 0-1 1-2 1-2 2 1.5 3 3.5 3 6a5 5 0 0 1-10 0c0-3 3-5 5-12z",
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
      return typeof v === "number" ? ["Rp" + F(Math.round(v / 1e9)) + " miliar", "perkiraan biaya 90 hari"] : null; }, "perkiraan", "titik panas 2019–2025, rencana operasi karhutla, asumsi kerja tim Pantau Bencana"],
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
