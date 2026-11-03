/* operasi_peta.js — Operasi udara karhutla DI DALAM peta utama (pemilik 3 Nov 2026: "ambil aja dari map").
   Skrip klasik, dimuat SESUDAH skrip utama index.html; memakai global peta utama: peta, Peta, S, $, esc, fmt, km, daopsDekat, kiriPad, terapkanUrut, renderDaftar, renderLegenda, nanti.
   Tidak menyunting index.html selain satu tag <script>: tab panel "Operasi" disisipkan ke #panelMode, renderDaftar/renderLegenda dibungkus,
   lapisan base/temuan/aksi dipasang ulang tiap style.load, rincian base memakai #laci yang sama dengan laci cluster.
   Data: /api/operasi/peta (akun centurisk97, staf berperan, moderator; selain itu 403 = tab tidak muncul), /api/operasi/monitor (aksi + hasil padam + KPI),
   /data/operasi/rekap_udara.json (rekap kontrak 2026, tanpa nama dan nomor kru), /api/jarak-pandang dan data/metar.json (kelayakan terbang).
   Buka langsung: /?operasi. */
(() => {
  "use strict";
  const OP = {data: null, mon: null, rekap: null, vis: null, metar: null, siap: false, pilih: null};
  const hariWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const ambil = u => fetch(u, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null);
  const PROV_PDK = {14: "Riau", 15: "Jambi", 16: "Sumsel", 61: "Kalbar", 62: "Kalteng", 63: "Kalsel", 64: "Kaltim", 93: "Papsel"};
  const GUNA = [["wb", "WB", "Water bombing"], ["patroli", "PTR", "Patroli"], ["omc", "OMC", "Modifikasi cuaca"]];
  const IK_GUNA = {wb: '<path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z"/>',
    patroli: '<path d="M3 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM13 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM7 10l2-5h6l2 5M11 14h2"/>',
    omc: '<path d="M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18zM9 21l1-2M13 21l1-2"/>'};
  const ikG = k => `<svg class="ops-ig ops-g-${k}" viewBox="0 0 24 24" aria-hidden="true">${IK_GUNA[k]}</svg>`;
  const guna = a => ({wb: a.peran === "wb" || a.peran === "patroli_wb", patroli: a.peran === "patroli" || a.peran === "patroli_wb", omc: a.peran === "omc"});
  const hitungGuna = ar => ({wb: ar.filter(a => guna(a).wb).length, patroli: ar.filter(a => guna(a).patroli).length, omc: ar.filter(a => guna(a).omc).length});
  /* foto asli per registrasi (deck Rakor Kalteng/Kalsel 19 Okt 2026 + foto WA satgas, tanpa orang) */
  const FOTO = new Set(["HA-5234", "HA-5235", "N-814AR", "N261BE", "PK-DBM", "PK-FPU", "PK-RTQ", "PK-RTY", "PK-SNK", "PK-SNL", "RA-22747", "RA-22834", "RA-31021", "UR-CSM", "UR-CSN", "VH-HGM", "ZK-HKU"]);
  const STATUS_AR = {siap: ["Siap", "ops-s-siap"], operasi: ["Beroperasi", "ops-s-op"], siaga: ["Siaga", "ops-s-siaga"], tidak_siap: ["Tidak siap", "ops-s-tidak"]};
  const stAr = s => STATUS_AR[s] || ["Belum lapor", "ops-s-belum"];
  const HASIL = {padam: ["Padam", "l0"], masih_api: ["Masih ada api", "l3"], menunggu: ["Menunggu 24 jam", "l1"], tak_dinilai: ["Tak dinilai", "ops-abu"]};
  const LV = ["Rutin", "Patroli", "Siaga", "Prioritas"];
  const RADIUS_KM = 200;   // ponytail: jangkauan base bila jelajah armada belum tercatat; ganti per base bila ada data jelajah resmi
  const KECEPATAN = t => /Cessna|Caravan|CASA|CN-?295|Hercules|C-130/i.test(t || "") ? 280 : 200;   // km/jam jelajah kasar: pesawat sayap tetap vs heli
  const gmaps = (lat, lon) => `https://www.google.com/maps?q=${(+lat).toFixed(5)},${(+lon).toFixed(5)}`;
  const jamWIB = ms => ms == null ? "–" : new Date(+ms + 7 * 36e5).toISOString().slice(11, 16);
  const durasi = j => j < 1 ? Math.round(j * 60) + " mnt" : (Math.round(j * 10) / 10).toLocaleString("id-ID") + " jam";
  const jamMenit = m => m == null ? "–" : `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  const persen = v => v == null ? "–" : Math.round(v * 100) + "%";

  /* ---------------- data turunan ---------------- */
  const armadaBase = id => (OP.data?.armada || []).filter(a => a.base_id === id);
  const radiusBase = b => { const nm = Math.max(0, ...armadaBase(b.id).map(a => a.jelajah_nm || 0)); return nm ? nm * 1.852 : RADIUS_KM; };
  const klusterAktif = () => (S.kluster?.features || []).map(f => f.properties).filter(p => (p.px24 || 0) > 0 && p.lat != null);
  const apiDekat = b => klusterAktif().map(k => ({...k, jarak: km(b.lat, b.lon, k.lat, k.lon)})).filter(k => k.jarak <= radiusBase(b)).sort((x, y) => y.level - x.level || y.px24 - x.px24);
  const kpi = (jenis, id) => OP.mon?.kpi?.[jenis]?.[id] || null;
  const aksiBase = id => { const reg = new Set(armadaBase(id).map(a => a.registrasi)); return (OP.mon?.aksi || []).filter(x => x.base_id === id || reg.has(x.registrasi)); };
  const kontrak = reg => (OP.rekap?.kontrak || []).filter(k => k.registrasi === reg);
  /* kelayakan terbang base dari METAR terdekat (<= 60 km): jarak pandang, angin, cuaca (TS, asap FU/HZ) */
  function kelayakan(b) {
    const st = [...(OP.vis?.stasiun || []).map(s => { const j = (s.jam || []).filter(x => x.vis_m != null).pop(); return j ? {icao: s.icao, lat: s.lat, lon: s.lon, vis: j.vis_m, wx: j.wx || "", t: j.t} : null; }).filter(Boolean),
      ...(OP.metar || []).map(m => ({icao: m.icao, lat: m.lat, lon: m.lon, vis: m.vis_m, wx: m.wx || "", raw: m.raw, t: m.waktu}))];
    const s = st.filter(x => km(b.lat, b.lon, x.lat, x.lon) <= 60).sort((x, y) => (y.t || "").localeCompare(x.t || ""))[0];
    if (!s) return {kelas: "?", teks: "Tanpa METAR", ket: "Tidak ada stasiun METAR dalam 60 km dari base."};
    const raw = (OP.metar || []).find(m => m.icao === s.icao)?.raw || "", ang = /(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?KT/.exec(raw), kt = ang ? Math.max(+ang[2], +(ang[3] || 0)) : null;
    const ts = /TS/.test(s.wx), asap = /FU|HZ/.test(s.wx), v = s.vis;
    const kelas = v < 1500 || ts || (kt != null && kt > 30) ? "tidak" : v < 5000 || asap || (kt != null && kt > 20) ? "terbatas" : "layak";
    const teks = {layak: "Layak terbang", terbatas: "Terbatas", tidak: "Tidak layak"}[kelas];
    return {kelas, teks, ket: `${s.icao}: jarak pandang ${(v / 1000).toLocaleString("id-ID", {maximumFractionDigits: 1})} km${kt != null ? `, angin ${kt} kt` : ""}${asap ? ", asap" : ""}${ts ? ", badai petir" : ""} (${jamWIB(Date.parse(s.t))} WIB)`};
  }
  const pilLayak = k => `<span class="pill ${{layak: "l0", terbatas: "l2", tidak: "l3", "?": "ops-abu"}[k.kelas]}" title="${esc(k.ket)}">${esc(k.teks)}</span>`;

  /* ---------------- tab panel "Operasi": tabel base (pola tabel provinsi, urut lewat terapkanUrut) ---------------- */
  const G = "grid-template-columns:0 minmax(0,2.2fr) minmax(46px,.8fr) repeat(4,minmax(28px,.5fr)) minmax(80px,1.1fr)";
  function daftar() {
    const box = $("#rows"); if (!OP.data) { box.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat operasi udara…</div>`; return; }
    const baris = (OP.data.base || []).map(b => { const ar = armadaBase(b.id), g = hitungGuna(ar), dk = apiDekat(b), p3 = dk.filter(k => k.level >= 3).length, p2 = dk.filter(k => k.level === 2).length;
      const lv = p3 ? 3 : p2 ? 2 : dk.length ? 1 : 0, tem = (OP.data.temuan || []).filter(t => ar.some(a => a.registrasi === t.registrasi) && t.status !== "clear").length;
      return {b, g, p3, lv, tem, siap: ar.filter(a => ["siap", "operasi", "siaga"].includes(a.status)).length, n: ar.length, lay: kelayakan(b)}; });
    const jm = f => baris.reduce((a, x) => a + f(x), 0), nol = v => v ? fmt(v) : "–";
    const ag = OP.mon?.kpi?.semua, sortie = ag?.sortie ?? (OP.data.gerak || []).filter(x => x.jenis === "berangkat").length;
    const kartu = `<div class="ops-ringkas">
      <div><b>${fmt(jm(x => x.siap))}<small>/${fmt(jm(x => x.n))}</small></b><span>armada siap</span></div>
      <div><b>${fmt(sortie)}</b><span>sortie hari ini</span></div>
      <div><b>${ag ? fmt(ag.aksi_wb) : "–"}</b><span>aksi water bombing</span></div>
      <div class="${ag?.persen_padam != null && ag.persen_padam < .5 ? "merah" : ""}"><b>${ag ? persen(ag.persen_padam) : "–"}</b><span>padam ≥ 24 jam</span></div></div>
      <div class="ops-kunci">${GUNA.map(([k, s, t]) => `<span>${ikG(k)}<b>${s}</b>${t}</span>`).join("")}<span><i class="ops-cl"></i><b>CL</b>cluster prioritas di jangkauan</span></div>`;
    const kepala = `<div class="tb kepala" style="${G}"><span></span><span>Base</span><span class="n">Prov</span><span class="n" title="Water bombing">WB</span><span class="n" title="Patroli">PTR</span><span class="n" title="Modifikasi cuaca">OMC</span><span class="n" title="Cluster prioritas dalam jangkauan">CL</span><span>Api</span></div>`;
    const total = `<div class="tb tb-total" style="${G}"><span></span><span>Grand total</span><span></span><span class="n">${nol(jm(x => x.g.wb))}</span><span class="n">${nol(jm(x => x.g.patroli))}</span><span class="n">${nol(jm(x => x.g.omc))}</span><span class="n">${nol(klusterAktif().filter(k => k.level >= 3).length)}</span><span></span></div>`;
    box.innerHTML = kartu + kepala + total + baris.map(x => `<button class="tb${x.lv >= 2 ? " hl" + x.lv : ""}${OP.pilih === x.b.id ? " ops-pilih" : ""}" style="${G}" role="listitem" data-ops="${esc(x.b.id)}" title="${esc(x.b.nama)}, ${fmt(x.siap)} dari ${fmt(x.n)} armada siap. ${esc(x.lay.ket)}">
      <span class="rk"></span><span class="ops-nm">${esc(x.b.nama.split(" / ")[0])}<i class="ops-icao">${esc(x.b.icao || x.b.id)}</i>${x.tem ? `<i class="prio" title="Pilot melapor ${fmt(x.tem)} titik api hari ini"></i>` : ""}<i class="ops-lay ops-lay-${x.lay.kelas}" title="${esc(x.lay.teks + ". " + x.lay.ket)}"></i></span>
      <span class="n ops-prov">${esc(PROV_PDK[x.b.prov] || x.b.prov || "–")}</span><span class="n" data-sort="${x.g.wb}">${nol(x.g.wb)}</span><span class="n" data-sort="${x.g.patroli}">${nol(x.g.patroli)}</span><span class="n" data-sort="${x.g.omc}">${nol(x.g.omc)}</span>
      <span class="n" data-sort="${x.p3}" style="font-weight:700">${nol(x.p3)}</span><span style="text-align:right" data-sort="${x.lv}">${x.lv ? `<span class="pill l${x.lv}">${LV[x.lv]}</span>` : `<span class="pill l0">Aman</span>`}</span></button>`).join("")
      + `<p class="fnd ops-kaki">Titik merah = pilot melapor api hari ini. Bulatan kecil = kelayakan terbang (METAR). Klik base untuk armada, aksi, foto, dan KPI.</p>`;
    terapkanUrut();
  }

  /* ---------------- lapisan peta ---------------- */
  let pop = null;
  function fiturBase() { return {type: "FeatureCollection", features: (OP.data?.base || []).map(b => { const g = hitungGuna(armadaBase(b.id));
    return {type: "Feature", geometry: {type: "Point", coordinates: [b.lon, b.lat]}, properties: {id: b.id, lbl: `${b.icao || b.id}\n${["wb", "patroli", "omc"].filter(k => g[k]).map(k => `${{wb: "WB", patroli: "PTR", omc: "OMC"}[k]} ${g[k]}`).join("  ")}`}}; })}; }
  const fiturTemuan = () => ({type: "FeatureCollection", features: (OP.data?.temuan || []).filter(t => t.lat != null).map(t => ({type: "Feature", geometry: {type: "Point", coordinates: [t.lon, t.lat]}, properties: {s: t.status, reg: t.registrasi, lok: t.lokasi || ""}}))});
  const fiturAksi = () => ({type: "FeatureCollection", features: (OP.mon?.aksi || []).filter(x => x.lat != null).map(x => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {h: x.hasil, reg: x.registrasi, g: x.guna, lok: x.lokasi || "", jam: jamWIB(x.jam_utc)}}))});
  function pasang() {
    if (!OP.data || !peta || !peta.isStyleLoaded() || peta.getSource("ops-base")) return;
    const sumber = (id, data) => peta.addSource(id, {type: "geojson", data});
    sumber("ops-aksi", fiturAksi()); sumber("ops-temuan", fiturTemuan()); sumber("ops-base", fiturBase());
    peta.addLayer({id: "ops-aksi", type: "circle", source: "ops-aksi", paint: {"circle-radius": 8, "circle-color": "#fff", "circle-stroke-width": 3.2,
      "circle-stroke-color": ["match", ["get", "h"], "padam", "#5a9e74", "masih_api", "#c9503a", "menunggu", "#4f8fc4", "#8a94a6"]}});
    peta.addLayer({id: "ops-temuan", type: "symbol", source: "ops-temuan", layout: {"text-field": "▲", "text-size": 16, "text-allow-overlap": true, "text-font": ["Noto Sans Bold"]},
      paint: {"text-color": ["match", ["get", "s"], "clear", "#5a9e74", "berasap_tipis", "#e58a45", "#c9503a"], "text-halo-color": "#fff", "text-halo-width": 1.5}});
    peta.addLayer({id: "ops-base", type: "circle", source: "ops-base", paint: {"circle-radius": 9, "circle-color": "#0b2545", "circle-stroke-color": "#fff", "circle-stroke-width": 2.4}});
    peta.addLayer({id: "ops-base-lbl", type: "symbol", source: "ops-base", layout: {"text-field": ["get", "lbl"], "text-size": 10.5, "text-offset": [0, 1.25], "text-anchor": "top", "text-font": ["Noto Sans Bold"], "text-line-height": 1.25, "text-allow-overlap": false},
      paint: {"text-color": "#fff", "text-halo-color": "#0b2545", "text-halo-width": 2}});
    peta.addLayer({id: "ops-base-ik", type: "symbol", source: "ops-base", layout: {"text-field": "✈", "text-size": 11, "text-allow-overlap": true, "text-font": ["Noto Sans Bold"]}, paint: {"text-color": "#fff"}});
    terapkanLihat();
  }
  const LAPIS_OPS = {opsbase: ["ops-base", "ops-base-lbl", "ops-base-ik"], opstemuan: ["ops-temuan"], opsaksi: ["ops-aksi"]};
  function terapkanLihat() { for (const [k, ids] of Object.entries(LAPIS_OPS)) { const on = $(`#lapis input[data-l="${k}"]`)?.checked !== false;
    for (const id of ids) if (peta.getLayer(id)) peta.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } }
  function segarkanLapis() { if (!peta?.getSource("ops-base")) return pasang();
    peta.getSource("ops-base").setData(fiturBase()); peta.getSource("ops-temuan").setData(fiturTemuan()); peta.getSource("ops-aksi").setData(fiturAksi()); }

  /* kartu hover base (dibangun saat kursor masuk) */
  function kartuHover(b) {
    const ar = armadaBase(b.id), g = hitungGuna(ar), dk = apiDekat(b), p3 = dk.filter(k => k.level >= 3).length, lay = kelayakan(b), k = kpi("base", b.id);
    const urut = ar.slice().sort((x, y) => (FOTO.has(y.registrasi) ? 1 : 0) - (FOTO.has(x.registrasi) ? 1 : 0) || x.registrasi.localeCompare(y.registrasi));
    return `<div class="ops-hv"><div class="ops-hv-hd"><b>${esc(b.nama.split(" / ")[0])}</b><span>${esc(b.icao || b.id)}</span></div>
      <div class="ops-hv-g">${GUNA.map(([kk, s, t]) => `<div class="${g[kk] ? "" : "nol"}">${ikG(kk)}<b>${fmt(g[kk])}</b><span>${kk === "omc" ? "OMC" : t}</span></div>`).join("")}</div>
      <ul>${urut.slice(0, 6).map(a => `<li>${FOTO.has(a.registrasi) ? `<img src="/img/armada/${esc(a.registrasi)}.webp" alt="" loading="lazy">` : `<span class="ops-hv-f">${ikG(guna(a).omc ? "omc" : guna(a).patroli && !guna(a).wb ? "patroli" : "wb")}</span>`}
        <div><b>${esc(a.registrasi)}</b><span>${esc(/tidak diketahui/i.test(a.tipe || "") ? "tipe belum tercatat" : a.tipe || "")}</span></div><i class="${stAr(a.status)[1]}" title="${stAr(a.status)[0]}"></i></li>`).join("")}</ul>
      ${urut.length > 6 ? `<p class="ops-hv-lagi">dan ${fmt(urut.length - 6)} armada lain</p>` : ""}
      <div class="ops-hv-kaki"><span>${pilLayak(lay)}</span><span class="${p3 ? "merah" : ""}">${fmt(p3)} cluster prioritas ≤ ${fmt(Math.round(radiusBase(b)))} km</span>${k ? `<span>${fmt(k.aksi_wb)} aksi WB, padam ${persen(k.persen_padam)}</span>` : ""}</div>
      <p class="ops-hv-klik">Klik untuk rincian armada, aksi, dan foto</p></div>`;
  }
  function pasangInteraksi() {
    peta.on("mouseenter", "ops-base", e => { peta.getCanvas().style.cursor = "pointer"; const b = OP.data.base.find(x => x.id === e.features[0].properties.id); if (!b) return;
      pop ||= new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 14, maxWidth: "none", className: "ops-pop"});
      pop.setLngLat([b.lon, b.lat]).setHTML(kartuHover(b)).addTo(peta); });
    peta.on("mouseleave", "ops-base", () => { peta.getCanvas().style.cursor = ""; pop?.remove(); });
    peta.on("click", "ops-base", e => bukaBase(e.features[0].properties.id));
    const tip = new maplibregl.Popup({closeButton: false, closeOnClick: false, offset: 10});
    for (const id of ["ops-temuan", "ops-aksi"]) {
      peta.on("mouseenter", id, e => { peta.getCanvas().style.cursor = "pointer"; const p = e.features[0].properties;
        tip.setLngLat(e.lngLat).setHTML(id === "ops-aksi" ? `<b>${esc(p.reg)}</b> ${esc(p.jam)} WIB<br>${esc(p.lok)}<br>${HASIL[p.h] ? HASIL[p.h][0] : ""}` : `<b>${esc(p.reg)}</b>: ${esc({fs: "FS berasap", berasap: "Berasap", berasap_tipis: "Berasap tipis", clear: "Clear"}[p.s] || p.s)}<br>${esc(p.lok)}`).addTo(peta); });
      peta.on("mouseleave", id, () => { peta.getCanvas().style.cursor = ""; tip.remove(); }); }
  }

  /* ---------------- laci base (pola laci cluster) ---------------- */
  const lipat = (judul, isi, buka = true) => `<details class="lipat" ${buka ? "open" : ""}><summary>${judul}</summary><div class="isi">${isi}</div></details>`;
  function bukaBase(id) {
    const b = OP.data?.base.find(x => x.id === id); if (!b) return; OP.pilih = id;
    if (!document.querySelector("#p-peta.on")) bukaTab("peta");
    const el = $("#laci"), dl = $("#dlgLaci"), kecil = innerWidth <= 900;
    const ar = armadaBase(id).slice().sort((x, y) => (["siap", "operasi", "siaga"].includes(y.status) ? 1 : 0) - (["siap", "operasi", "siaga"].includes(x.status) ? 1 : 0) || x.registrasi.localeCompare(y.registrasi));
    const g = hitungGuna(ar), dk = apiDekat(b).filter(k => k.level >= 2), lay = kelayakan(b), k = kpi("base", id), aksi = aksiBase(id).sort((x, y) => (y.jam_utc || 0) - (x.jam_utc || 0));
    const kartuAr = a => { const ka = kpi("armada", a.registrasi), kt = kontrak(a.registrasi), ktj = kt.find(x => x.berjalan) || kt[kt.length - 1], s = stAr(a.status);
      const jamTot = kt.reduce((t, x) => t + (x.jam_operasi_menit || 0), 0), sorTot = kt.reduce((t, x) => t + (x.sortie || 0), 0), wbTot = kt.reduce((t, x) => t + (x.wb_drop || 0), 0);
      return `<article class="ops-ar">${FOTO.has(a.registrasi) ? `<img class="ops-ar-f" src="/img/armada/${esc(a.registrasi)}.webp" alt="${esc(a.registrasi)}" loading="lazy">` : `<div class="ops-ar-f ops-ar-sil">${ikG(guna(a).omc ? "omc" : guna(a).patroli && !guna(a).wb ? "patroli" : "wb")}</div>`}
        <div class="ops-ar-isi"><div class="ops-ar-atas"><b>${esc(a.registrasi)}</b><span class="ops-st ${s[1]}">${s[0]}</span></div>
          <p>${esc(/tidak diketahui/i.test(a.tipe || "") ? "Tipe belum tercatat" : a.tipe)}, ${GUNA.filter(([kk]) => guna(a)[kk]).map(([kk, , t]) => t).join(" + ")}</p>
          <p class="ops-red">${esc(a.operator || "Operator belum tercatat")}${a.bucket_liter ? `, bucket ${fmt(a.bucket_liter)} L` : ""}</p>
          ${kt.length ? `<p class="ops-red">2026: ${fmt(kt.length)} kontrak, ${jamMenit(jamTot)} jam operasi, ${fmt(sorTot)} sortie${wbTot ? `, ${fmt(wbTot)} kali WB` : ""}${ktj?.berjalan ? `. Kontrak ke-${fmt(ktj.kontrak_ke)} berjalan sejak ${esc(ktj.periode_teks.split(/\s+-\s+/)[0])}` : ""}</p>` : ""}
          ${ka ? `<p class="ops-kpi"><span>${fmt(ka.sortie)} sortie</span><span>${fmt(ka.aksi_wb)} WB</span><span>padam ${persen(ka.persen_padam)}</span>${ka.respons_median_menit != null ? `<span>respons ${fmt(Math.round(ka.respons_median_menit))} mnt</span>` : ""}</p>` : ""}
          ${a.alasan ? `<p class="ops-alasan">${esc(a.alasan)}</p>` : ""}</div></article>`; };
    const barisAksi = x => `<div class="ops-aksi"><div class="ops-aksi-hd"><b>${jamWIB(x.jam_utc)}</b><span>${esc(x.registrasi)}</span><span class="ops-red">${esc({wb: "Water bombing", patroli: "Patroli", omc: "OMC"}[x.guna] || x.jenis)}</span>
        <span class="pill ${(HASIL[x.hasil] || HASIL.tak_dinilai)[1]}">${(HASIL[x.hasil] || HASIL.tak_dinilai)[0]}</span></div>
        <p>${x.lat != null ? `<a href="${gmaps(x.lat, x.lon)}" target="_blank" rel="noopener noreferrer">${esc(x.lokasi || "Lihat lokasi")}</a>` : esc(x.lokasi || "Lokasi belum tercatat")}${x.titik_dekat ? `, ${fmt(x.titik_dekat)} titik panas ≤ 1 km sesudah aksi` : ""}</p>
        ${(x.foto || []).length ? `<div class="ops-foto">${x.foto.map(f => `<a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(f.url)}" alt="Dokumentasi ${esc(x.registrasi)} ${jamWIB(f.jam_utc)}" loading="lazy"></a>`).join("")}</div>` : ""}</div>`;
    const barisApi = c => { const kec = KECEPATAN(ar.find(a => guna(a).wb)?.tipe), dkp = typeof daopsDekat === "function" ? daopsDekat(c.lat, c.lon, 1)[0] : null;
      return `<tr><td><span class="pill l${c.level}">${LV[c.level]}</span></td><td><b><a href="${gmaps(c.lat, c.lon)}" target="_blank" rel="noopener noreferrer">${esc(c.kec)}, ${esc(c.kab)}</a></b><small>${esc(c.id)}, ${fmt(c.px24)} piksel 24 jam, ${fmt(c.hari)} hari${dkp ? `. Daops ${esc(dkp.nama.replace("Daops ", ""))} ${fmt(Math.round(dkp.jarak))} km` : ""}</small></td>
        <td class="n num">${fmt(Math.round(c.jarak))} km</td><td class="n num">${durasi(c.jarak / kec)}</td></tr>`; };
    const pakai = (n, t) => `<div><b>${n}</b><span>${t}</span></div>`;
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">Base operasi udara</span><h2>${esc(b.nama)}</h2>
        <div class="hd-meta"><span class="pill ops-abu">${esc(b.icao || b.id)}</span>${pilLayak(lay)}<span class="hd-ko">${esc(PROV_PDK[b.prov] || "")}</span></div></div>
      <div class="hd-aksi"><a class="ik-btn" target="_blank" rel="noopener noreferrer" href="${gmaps(b.lat, b.lon)}" title="Buka di Google Maps" aria-label="Buka di Google Maps"><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg></a>
        <button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>
      <div class="bd" style="display:grid;gap:10px">
      <div class="kv">${pakai(`${fmt(ar.filter(a => ["siap", "operasi", "siaga"].includes(a.status)).length)}/${fmt(ar.length)}`, "armada siap")}${pakai(k ? fmt(k.sortie) : "–", "sortie")}${pakai(k ? persen(k.persen_padam) : "–", "padam ≥ 24 jam")}</div>
      <div class="ops-gunaba">${GUNA.map(([kk, s, t]) => `<span class="${g[kk] ? "" : "nol"}">${ikG(kk)}<b>${fmt(g[kk])}</b>${t}</span>`).join("")}</div>
      ${lipat(`Aksi dan hasil (${fmt(aksi.length)})`, aksi.length ? `<div class="ops-aksi-daftar">${aksi.map(barisAksi).join("")}</div><p class="fnd">Padam = tidak ada titik panas satelit dalam 1 km selama 24 jam sesudah aksi. Foto dari grup WA satgas, ditempel lewat stempel registrasi, jam, dan koordinat.</p>`
        : `<p class="fnd">${OP.mon ? "Belum ada aksi tercatat dari laporan WA satgas untuk base ini hari ini." : "Data monitoring belum tersedia."}</p>`)}
      ${lipat(`Armada (${fmt(ar.length)})`, `<div class="ops-ar-daftar">${ar.map(kartuAr).join("") || `<p class="fnd">Belum ada armada tercatat.</p>`}</div>`)}
      ${lipat(`Sumber api dalam ${fmt(Math.round(radiusBase(b)))} km`, dk.length ? `<table class="tb3"><thead><tr><th>Status</th><th>Cluster</th><th class="n">Jarak</th><th class="n">Tempuh</th></tr></thead><tbody>${dk.slice(0, 12).map(barisApi).join("")}</tbody></table>
        <p class="fnd">Waktu tempuh = jarak garis lurus dibagi kecepatan jelajah kasar (heli 200 km/jam, pesawat 280 km/jam), belum termasuk ambil air.</p>` : `<p class="fnd">Tidak ada cluster siaga atau prioritas di jangkauan base ini.</p>`)}
      ${lipat("Kelayakan terbang", `<p style="margin:0;font-size:12.5px">${pilLayak(lay)} ${esc(lay.ket)}</p><p class="fnd">Layak: jarak pandang ≥ 5 km, angin ≤ 20 kt, tanpa asap atau badai petir. Terbatas: 1,5–5 km, asap, atau angin 20–30 kt. Tidak layak: &lt; 1,5 km, badai petir, atau angin &gt; 30 kt.</p>`, false)}
      <p class="fnd">Data operasi ${esc(OP.data.tanggal || "")}. Rekap kontrak 2026 dari rekapitulasi Direktorat Penanganan Darurat Wilayah I–III.</p></div>`;
    if (kecil) { if (el.parentNode !== dl) dl.appendChild(el); if (!dl.open) dl.showModal(); }
    el.classList.add("on");
    el.querySelector(".tutup").onclick = () => { if (dl.open) return dl.close(); el.classList.remove("on"); OP.pilih = null; };
    peta.easeTo({center: [b.lon, b.lat], zoom: Math.max(peta.getZoom(), 7), padding: kiriPad(), duration: 600});
    if (S.panel === "ops") daftar();
  }

  /* ---------------- pasang ke peta utama ---------------- */
  function pasangUI() {
    /* tab panel keempat */
    const pm = $("#panelMode");
    if (pm && !pm.querySelector('[data-m="ops"]')) pm.insertAdjacentHTML("beforeend", `<button data-m="ops" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14 3 12l1-2 7 1 4-6h2l-2 7 5 1 1-2h2l-1 4 1 4h-2l-1-2-5 1 2 7h-2l-4-6-7 1-1-2z"/></svg>Operasi</button>`);
    /* grup overlay; ubinLapis (pengamat MutationObserver) menghias labelnya jadi ubin */
    if (typeof UBIN === "object") Object.assign(UBIN, {opsbase: ["#0b2545", "#3b6fb0", "pesawat"], opstemuan: ["#7a1d10", "#f2693f", "api"], opsaksi: ["#1d4e89", "#5fd0c5", "titik"]});
    if (typeof UBIN_PENDEK === "object") Object.assign(UBIN_PENDEK, {opsbase: "Base & armada", opstemuan: "Temuan pilot", opsaksi: "Aksi & hasil"});
    const L = $("#lapis");
    if (L && !L.querySelector('[data-l="opsbase"]')) L.querySelector("details")?.insertAdjacentHTML("beforebegin", `<details open><summary>Operasi udara</summary><!-- bawaan tidak tercentang (pemilik 3 Nov 2026) -->
      <label><input type="checkbox" data-l="opsbase"> Base dan armada (water bombing, patroli, OMC)</label>
      <label><input type="checkbox" data-l="opstemuan"> Temuan pilot dari laporan WA satgas</label>
      <label><input type="checkbox" data-l="opsaksi"> Aksi armada dan hasilnya (padam 24 jam)</label></details>`);
    /* centang lapisan operasi ditangani di sini (fase tangkap), bukan oleh pemetaan Overlay peta utama */
    L?.addEventListener("change", e => { const k = e.target.closest("input")?.dataset.l; if (!LAPIS_OPS[k]) return; e.stopImmediatePropagation(); nanti(() => { terapkanLihat(); renderLegenda(); }); }, true);
    /* panel Operasi: baris base membuka laci (fase tangkap supaya penangan baris wilayah peta utama tidak ikut) */
    $("#rows").addEventListener("click", e => { const r = e.target.closest("[data-ops]"); if (!r) return; e.stopImmediatePropagation(); bukaBase(r.dataset.ops); }, true);
    /* bungkus renderDaftar dan renderLegenda milik peta utama */
    const rd = renderDaftar; renderDaftar = function () { return S.panel === "ops" ? daftar() : rd.apply(this, arguments); };
    const rl = renderLegenda; renderLegenda = function () { rl.apply(this, arguments); legenda(); };
    peta.on("style.load", () => setTimeout(pasang, 0));
    pasang(); pasangInteraksi(); legenda();
    if (new URLSearchParams(location.search).has("operasi")) pm?.querySelector('[data-m="ops"]')?.click();
  }
  function legenda() {
    const isi = $("#legenda .lg-isi"); if (!isi || !OP.data || isi.querySelector(".ops-lg")) return;
    const on = k => $(`#lapis input[data-l="${k}"]`)?.checked !== false;
    if (!on("opsbase") && !on("opstemuan") && !on("opsaksi")) return;
    isi.insertAdjacentHTML("afterbegin", `<div class="lg-g ops-lg"><div class="lbl">Operasi udara</div><div class="leg">
      ${on("opsbase") ? `<span><i class="sw dot" style="background:#0b2545;border:2px solid #fff;box-shadow:0 0 0 1px #0b2545"></i>Base (angka = WB, PTR, OMC)</span>` : ""}
      ${on("opstemuan") ? `<span><b style="color:#c9503a">▲</b> Temuan api pilot <b style="color:#5a9e74;margin-left:6px">▲</b> Clear</span>` : ""}
      ${on("opsaksi") ? `<span><i class="sw dot" style="background:#fff;border:3px solid #5a9e74"></i>Padam <i class="sw dot" style="background:#fff;border:3px solid #c9503a;margin-left:6px"></i>Masih api <i class="sw dot" style="background:#fff;border:3px solid #4f8fc4;margin-left:6px"></i>Menunggu</span>` : ""}</div></div>`);
  }

  /* ---------------- mulai: tunggu peta utama siap, cek hak, muat data ---------------- */
  async function mulai() {
    const t = hariWIB(), d = await ambil(`/api/operasi/peta?tanggal=${t}`);
    if (!d) return;   // tamu atau tanpa hak: tab Operasi tidak muncul
    OP.data = d;
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/operasi_peta.css?v=1"; document.head.append(l);
    pasangUI();
    [OP.mon, OP.rekap, OP.vis, OP.metar] = await Promise.all([ambil(`/api/operasi/monitor?dari=${t}&sampai=${t}`), ambil("/data/operasi/rekap_udara.json"), ambil("/api/jarak-pandang"), ambil("/data/metar.json")]);
    segarkanLapis(); if (S.panel === "ops") daftar(); if (OP.pilih) bukaBase(OP.pilih);
    window.OperasiPeta = {bukaBase, daftar, OP};
  }
  const tunggu = setInterval(() => { if (typeof peta !== "undefined" && peta && typeof S !== "undefined" && S.kluster && peta.isStyleLoaded()) { clearInterval(tunggu); mulai(); } }, 400);
})();
