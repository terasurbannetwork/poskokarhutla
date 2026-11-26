"use strict";
/* Status prakiraan per kab/kota dan poligon peringatan BMKG, satu modul untuk peta tiap bencana (DP-10; data/kajian-bnpb/dampak-peringatan/).
   Dua bagian terpisah:
   1. fungsi MURNI (tanpa DOM, tanpa jaringan; diuji node tests/dampak-peringatan): status -> token, aturan hijau/abu, pil hipotesis, pembulatan, teks.
   2. penggambar MapLibre `pasang(peta, opsi)`: isi kab menurut status, poligon BMKG, kartu kab. Dinyalakan per halaman lewat registri
      kemampuan.layar.status_dampak (daftar kode bahaya huruf kecil); saring ke SATU bahaya halaman itu (K11).
   Skema data: DESAIN-TEKNIS.md (GET /api/dampak-peringatan/ringkas dan /status). Data hilang = tampil seperti tanpa modul, tanpa galat (N1).
   Warna hanya dari token tema.css (--dp-0..3, --dp-belum). Teks sumber luar lewat textContent. */
(() => {
  const TINGKAT = ["Normal", "Waspada", "Siaga", "Awas"];
  const BAHAYA = {bnj: "Banjir", lsr: "Longsor", cex: "Cuaca ekstrem", kht: "Karhutla"};
  /* kata kunci jenis peringatan BMKG per bahaya; karhutla tidak punya poligon BMKG (D26) */
  const JENIS = {bnj: ["banjir", "hujan lebat"], lsr: ["longsor", "hujan lebat"], cex: ["angin kencang", "puting beliung", "cuaca ekstrem", "petir"], kht: []};
  const SUMBER = {worldpop: "WorldPop", dukcapil: "Dukcapil", ghsl: "GHSL"};
  const FASILITAS = {sekolah_dapodik: "Sekolah (Dapodik)", faskes_osm: "Fasilitas kesehatan (OpenStreetMap)"};
  const PEMICU = {prakiraan: "prakiraan Centurisk97", bmkg: "peringatan BMKG", keduanya: "prakiraan Centurisk97 dan peringatan BMKG"};
  const BELUM = "belum terukur";
  /* D13: teks tooltip hijau dan abu, persis */
  const TIP_NORMAL = "Normal: tidak ada pemicu di atas ambang dalam 3 hari ke depan menurut prakiraan Centurisk97 dan BMKG. Ini bukan jaminan keselamatan.";
  const TIP_BELUM = "Belum terukur: sebagian sumber belum masuk atau sudah basi.";
  const id = new Intl.NumberFormat("id-ID");

  /* ---------- fungsi murni ---------- */
  const tingkatSah = s => Number.isInteger(s) && s >= 0 && s <= 3;
  const token = s => tingkatSah(s) ? `--dp-${s}` : "--dp-belum";
  const warna = s => `var(${token(s)})`;

  /* GAGAL-TERTUTUP: hipotesis kecuali boleh_tampil === true persis (entri, lalu peta per bahaya, lalu satu bendera dokumen) */
  function bolehTampil(entri, status, kode) {
    const b = entri?.boleh_tampil ?? (status?.boleh_tampil && typeof status.boleh_tampil === "object" ? status.boleh_tampil[String(kode).toUpperCase()] : status?.boleh_tampil);
    return b === true;
  }

  /* hijau Normal hanya bila semua sumber segar (D13): entri kosong, s tak sah, sebagian sumber, atau segar === false jadi abu "belum terukur" */
  function statusEfektif(entri, status, kode) {
    const s = entri?.s;
    const sahih = tingkatSah(s) && !(s === 0 && (entri.sebagian === true || entri.segar === false));
    return {
      s: sahih ? s : null, belum: !sahih,
      sebagian: sahih && s > 0 && entri.sebagian === true,
      hipotesis: !bolehTampil(entri, status, kode),
      pemicu: PEMICU[entri?.pemicu] || null,
      hari: Array.isArray(entri?.hari) ? entri.hari.slice(0, 4) : [],
    };
  }

  const namaTingkat = (s, nama) => tingkatSah(s) ? ((Array.isArray(nama) && nama[s]) || TINGKAT[s]) : "Belum terukur";
  const tooltip = (s, nama) => s === 0 ? TIP_NORMAL : s == null ? TIP_BELUM : namaTingkat(s, nama);

  /* dibulatkan dua angka bermakna; kosong bukan nol (null/undefined = belum terukur), 0 hanya bila dihitung 0 */
  function bulatJiwa(n) {
    if (n == null || !Number.isFinite(+n)) return BELUM;
    n = +n;
    if (n === 0) return "0";
    if (n < 100) return "kurang dari 100";
    const d = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return "sekitar " + id.format(Math.round(n / d) * d);
  }

  function tautanAman(u) {
    try { const x = new URL(String(u)); return x.protocol === "https:" ? x.href : null; } catch { return null; }
  }

  /* peringatan BMKG yang cocok dengan bahaya halaman; nama jenis dicari di bahaya atau event */
  function peringatanUntuk(daftar, kode) {
    const kata = JENIS[kode] || [];
    if (!kata.length || !Array.isArray(daftar)) return [];
    return daftar.filter(p => { const t = `${p?.bahaya ?? ""} ${p?.event ?? ""}`.toLowerCase(); return kata.some(k => t.includes(k)); });
  }

  const teksPeringatan = p => {
    const b = {banjir: "Banjir", longsor: "Longsor"}[String(p?.bahaya || "").toLowerCase()] || String(p?.bahaya || "Peringatan");
    const sampai = p?.berlaku_sampai ? `, berlaku sampai ${String(p.berlaku_sampai).replace("T", " ").slice(0, 16)}` : "";
    return `${b}${p?.wilayah ? " di " + p.wilayah : ""}${sampai}`;
  };

  /* satu kartu kab: model data murni; tampilan membuatnya jadi DOM (kepala = nama kab, tanpa kalimat temuan, tanpa kaki sumber) */
  function modelKartu(kab, kode, {ringkas, status, nama} = {}) {
    const r = ringkas?.kab?.[kab] || {}, st = status?.kab?.[kab] || r;
    const e = statusEfektif(st?.status?.[kode.toUpperCase()], status, kode);
    const pdd = r.penduduk_area_peringatan || {};
    const jiwa = Object.keys(SUMBER).filter(k => k in pdd).map(k => `${SUMBER[k]}: ${bulatJiwa(pdd[k])}`);
    const kelas = r.jiwa_kelas && ["tinggi", "sedang", "rendah", "tak_terliput"].map(k => `${k.replace("_", " ")}: ${bulatJiwa(r.jiwa_kelas[k])}`);
    const fas = Object.entries(r.fasilitas || {}).map(([k, v]) => `${FASILITAS[k] || k.replace(/_/g, " ")}: ${v == null ? BELUM : id.format(v)}`);
    return {
      judul: r.nama || st.nama || "",
      bahaya: BAHAYA[kode] || kode, tingkat: namaTingkat(e.s, nama), token: token(e.s), tip: tooltip(e.s, nama),
      pil: [e.hipotesis && "Hipotesis", e.sebagian && "Sebagian sumber", r.terliput === false && "Kelas bahaya belum terukur"].filter(Boolean),
      pemicu: e.pemicu, hari: e.hari.map((s, i) => ({label: ["Hari ini", "Besok", "Lusa", "3 hari lagi"][i], teks: namaTingkat(s, nama), token: token(s)})),
      penduduk: jiwa.length ? jiwa : [BELUM], kelas: kelas || [], fasilitas: fas.length ? fas : [BELUM],
      peringatan: peringatanUntuk(ringkas?.peringatan, kode).map(p => ({teks: teksPeringatan(p), url: tautanAman(p.web)})),
    };
  }

  /* kab dengan status kosong, tak sah, atau data tak ada tetap tergambar abu; kunci geo "Kab. X" -> "X" seperti besok_inti.js kunciGeo */
  const namaGeo = n => String(n || "").replace(/^Kab\.\s+/, "").trim();

  /* ekspresi warna MapLibre dari fungsi pembaca token (MapLibre tidak memahami var(); nilai diurai sekali saat addLayer) */
  function ekspresiWarna(baca) {
    return ["match", ["get", "dp_s"], 0, baca("--dp-0"), 1, baca("--dp-1"), 2, baca("--dp-2"), 3, baca("--dp-3"), baca("--dp-belum")];
  }

  /* ---------- penggambar ---------- */
  const tunda = () => globalThis.scheduler?.yield ? scheduler.yield() : new Promise(r => setTimeout(r, 0));
  const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);

  /* CSS custom property -> "rgb(r,g,b)" lewat satu piksel kanvas: oklch aman di semua versi MapLibre */
  function rgbToken(t) {
    const css = getComputedStyle(document.documentElement).getPropertyValue(t).trim() || "transparent";
    const c = document.createElement("canvas"); c.width = c.height = 1;
    const x = c.getContext("2d", {willReadFrequently: true});
    x.fillStyle = css; x.fillRect(0, 0, 1, 1);
    const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
    return `rgb(${r},${g},${b})`;
  }

  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

  function kartuDom(m) {
    const k = el("section", "ex ex-std dp-kartu");
    const hd = el("header", "ex-hd"), h = el("h3", "dp-judul");
    const ik = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ik.setAttribute("viewBox", "0 0 24 24"); ik.setAttribute("aria-hidden", "true"); ik.classList.add("dp-ik");
    const jl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    jl.setAttribute("d", "M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zm0-9a3 3 0 1 1 0-6 3 3 0 0 1 0 6z");
    ik.append(jl); h.append(ik, document.createTextNode(m.judul)); hd.append(h);
    const bd = el("div", "ex-bd");
    const baris = (nama, ...isi) => { const r = el("div", "dp-baris"); r.append(el("span", "dp-lbl", nama), ...isi); return r; };
    const st = el("span", "dp-status", m.tingkat); st.style.setProperty("--dp-w", `var(${m.token})`); st.title = m.tip;
    const pil = m.pil.map(t => el("span", "dp-pil", t));
    bd.append(baris(`Status prakiraan Centurisk97, ${m.bahaya.toLowerCase()}`, st, ...pil));
    if (m.pemicu) bd.append(baris("Pemicu", el("span", null, m.pemicu)));
    if (m.hari.length) bd.append(baris("Per hari", ...m.hari.map(x => { const s = el("span", "dp-status dp-kecil", `${x.label}: ${x.teks}`); s.style.setProperty("--dp-w", `var(${x.token})`); return s; })));
    bd.append(baris("Penduduk di area peringatan BMKG", el("span", null, m.penduduk.join("; "))));
    if (m.kelas.length) bd.append(baris("Menurut kelas bahaya", el("span", "dp-sek", m.kelas.join("; "))));
    bd.append(baris("Fasilitas yang terpeta", el("span", null, m.fasilitas.join("; "))));
    const bm = el("div", "dp-baris dp-bmkg"); bm.append(el("span", "dp-lbl", "Peringatan BMKG yang aktif"));
    if (!m.peringatan.length) bm.append(el("span", null, "Tidak ada peringatan BMKG untuk bahaya ini di kab/kota ini."));
    for (const p of m.peringatan) {
      const s = el("span"); s.append(document.createTextNode(p.teks + ". Sumber: BMKG"));
      if (p.url) { const a = el("a", null, " (tautan)"); a.href = p.url; a.target = "_blank"; a.rel = "noopener noreferrer"; s.append(a); }
      bm.append(s);
    }
    bd.append(bm); k.append(hd, bd);
    return k;
  }

  /* pasang(peta, {bahaya:"bnj", nama:[4 nama tingkat registri]|null, kartu:Element, urlRingkas, urlStatus, urlGeo:(prov2)=>url})
     Mengembalikan {nyalakan, matikan}; tidak menyentuh peta sebelum nyalakan() (bawaan mati, tombol lapisan milik halaman). */
  function pasang(peta, opsi) {
    const kode = String(opsi.bahaya || "").toLowerCase();
    if (!BAHAYA[kode]) throw new Error("bahaya tidak dikenal: " + kode);
    const SRC = `dp-kab-${kode}`, POL = `dp-pol-${kode}`, urlGeo = opsi.urlGeo || (p => `/geo/kabupaten/${p}.json`);
    let data = null, nyala = false, sudah = null;

    async function muat() {
      const [ringkas, status] = await Promise.all([ambil(opsi.urlRingkas || "/api/dampak-peringatan/ringkas"), ambil(opsi.urlStatus || "/api/dampak-peringatan/status")]);
      if (!status || status.belum_terukur || !status.kab) return null;
      const kab = Object.keys(status.kab).filter(k => /^\d{4}$/.test(k));
      const provs = [...new Set(kab.map(k => k.slice(0, 2)))], fitur = [], nama = new Map();
      for (const k of kab) nama.set(k, namaGeo(ringkas?.kab?.[k]?.nama || status.kab[k].nama));
      for (const p of provs) {
        const g = await ambil(urlGeo(p)); await tunda();
        for (const f of g?.features || []) {
          const k = kab.find(c => c.startsWith(p) && nama.get(c) === namaGeo(f.properties?.kab));
          if (!k) continue;
          const e = statusEfektif(status.kab[k]?.status?.[kode.toUpperCase()], status, kode);
          fitur.push({type: "Feature", geometry: f.geometry, properties: {kab: k, dp_s: e.s ?? -1}});
        }
      }
      const pol = peringatanUntuk(ringkas?.peringatan, kode).flatMap(p => (p.poligon || []).map(r => ({type: "Feature", properties: {}, geometry: {type: "Polygon", coordinates: [r]}})));
      return {ringkas, status, kab: {type: "FeatureCollection", features: fitur}, pol: {type: "FeatureCollection", features: pol}};
    }

    function gambar() {
      if (!data || peta.getSource(SRC)) return;
      const sebelum = peta.getStyle().layers.find(l => peta.getSource(l.source)?.type === "geojson" && !l.id.startsWith("dp-"))?.id;
      peta.addSource(SRC, {type: "geojson", data: data.kab}); peta.addSource(POL, {type: "geojson", data: data.pol});
      peta.addLayer({id: SRC, type: "fill", source: SRC, paint: {"fill-color": ekspresiWarna(rgbToken), "fill-opacity": .42}}, sebelum);
      peta.addLayer({id: SRC + "-garis", type: "line", source: SRC, paint: {"line-color": rgbToken("--ink2"), "line-width": .6}}, sebelum);
      peta.addLayer({id: POL, type: "fill", source: POL, paint: {"fill-color": rgbToken("--brand2"), "fill-opacity": .12}}, sebelum);
      peta.addLayer({id: POL + "-garis", type: "line", source: POL, paint: {"line-color": rgbToken("--brand2"), "line-width": 2, "line-dasharray": [2, 1]}}, sebelum);
    }
    const buang = () => { for (const i of [POL + "-garis", POL, SRC + "-garis", SRC]) if (peta.getLayer(i)) peta.removeLayer(i); for (const s of [POL, SRC]) if (peta.getSource(s)) peta.removeSource(s); };

    const klik = e => {
      const f = peta.queryRenderedFeatures(e.point, {layers: [SRC]})[0];
      if (!f || !opsi.kartu) return;
      const m = modelKartu(f.properties.kab, kode, {ringkas: data.ringkas, status: data.status, nama: opsi.nama});
      opsi.kartu.replaceChildren(kartuDom(m)); opsi.kartu.hidden = false;
    };
    peta.on("style.load", () => { if (nyala) gambar(); });   /* setStyle membuang lapisan: pasang ulang */

    return {
      async nyalakan() {
        nyala = true;
        if (!sudah) sudah = muat().then(d => { data = d; return d; }).catch(() => null);
        await sudah; if (!nyala || !data) return false;
        gambar(); peta.off("click", klik); peta.on("click", klik); return true;
      },
      matikan() { nyala = false; peta.off("click", klik); buang(); if (opsi.kartu) opsi.kartu.hidden = true; },
    };
  }

  globalThis.DampakPeringatan = {TINGKAT, BAHAYA, TIP_NORMAL, TIP_BELUM, token, warna, bolehTampil, statusEfektif, namaTingkat, tooltip, bulatJiwa, tautanAman,
    peringatanUntuk, teksPeringatan, modelKartu, namaGeo, ekspresiWarna, kartuDom, pasang};
})();
