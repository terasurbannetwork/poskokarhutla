"use strict";
/* ================================================================ dampak */
/* Tab Dampak kualitas udara: rupa sama dengan Dampak karhutla dan banjir (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../data/udara_dampak.json (scripts/udara/dampak_udara.py): kecamatan yang PM2,5 rata-rata 24 jamnya di atas 55,4 µg/m³ pada tanggal terpilih, lengkap dengan penduduk, sekolah,
   puskesmas/klinik, dan rumah sakit di dalamnya. SEMUA angka perkiraan model CAMS (kisi ~40 km, belum dikoreksi ke alat ukur): tiap kartu membawa pil model, jiwa ditulis "sekitar".
   Bagian tanpa data dibuang (A18). Korban dan kerugian historis tidak ada: BNPB tidak mencatat kualitas udara sebagai jenis bencana. Rupiah tidak ditampilkan. */
const Dampak = (() => {
  const W = {merah: "#c9503a", ungu: "#5f6fb0", teal: "#2b8c86"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", sek: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5",
    kes: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7ZM3.5 12h5l1.5-3 2 6 1.5-3h7"};
  Object.assign(IKON, {rent: "M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 22v-6a6 6 0 0 1 12 0v6", ispa: "M12 3v18M7 8c-3 2-3 8 0 10M17 8c3 2 3 8 0 10", skz: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5", bnd: "M2 16l9-3V6a1.5 1.5 0 0 1 3 0v7l8 3v2l-8-1.5V20l2 1.5V23l-3.5-1L10 23v-1.5l2-1.5v-4.5L2 18z"});
  const BAG = {rent: ["Balita dan lansia", W.merah], ispa: ["Kasus ISPA", W.teal], skz: ["Sekolah berisiko", W.ungu], bnd: ["Jarak pandang bandara", "#1f5f8b"], pend: ["Penduduk terdampak", W.merah], sek: ["Sekolah", W.ungu], kes: ["Kesehatan", W.teal]};
  let D = null; const st = {hari: ""};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const nmP = k => namaProv(k);
  const SM = "Sumber: Copernicus CAMS lewat Open-Meteo";
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian dan pil model */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>${PIL_MODEL}`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  const baris = (pv, f) => Object.entries(pv).filter(([, o]) => o[f] != null).map(([k, o]) => ({k, v: o[f]})).sort((a, b) => b.v - a.v);
  const hariPilihan = () => { const ds = Object.keys(D.terpapar || {}).sort(), ini = tglWIB(SEKARANG()), depan = ds.filter(t => t >= ini); return depan.length ? depan : ds.slice(-1); };
  const labelTgl = t => t === tglWIB(SEKARANG()) ? "Hari ini" : tglPendek(t);
  const tglH = () => st.hari === tglWIB(SEKARANG()) ? "hari ini" : "pada " + tglPendek(st.hari);
  /* ---- prakiraan rentan (rentan.json): balita, lansia, ISPA, sekolah, bandara. Angka perkiraan model; asumsi + sumber ada di Metode ---- */
  const R = () => S.ren, ri = () => Math.min(st.rh || 0, (R()?.hari.length || 1) - 1);
  const segR = () => R().hari.length > 1 ? `<div class="seg" role="group">${R().hari.map((t, h) => `<button data-dks="rh" data-v="${h}" aria-pressed="${ri() === h}">${tglPendek(t)}</button>`).join("")}</div>` : "";
  const barisR = (f) => Object.entries(R().prov || {}).map(([k, o]) => ({k, o, v: f(o)})).filter(x => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 12);
  const dt = () => R()?.dibuat ? "; data " + jamWIB(R().dibuat) : "";
  const ket = () => "Sumber: perkiraan model CAMS, belum dikoreksi ke alat ukur; WorldPop, BPS" + dt();
  function kartuRentan() { if (!R() || !R().nasional) return "";
    const h = ri(), n = R().nasional, tg = "pada " + tglPendek(R().hari[h]), out = [], ctl = segR(), ms = h2 => (n.ispa?.[h2]) ;
    if (n.balita?.[h] != null) { const rows = barisR(o => (o.balita?.[h] || 0) + (o.lansia?.[h] || 0)).map(x => ({n: nmP(x.k), v: x.v, txt: rb(x.v), tip: `<b>${esc(nmP(x.k))}</b><br>Balita: sekitar ${fmt(x.o.balita?.[h] || 0)}<br>Lansia: sekitar ${fmt(x.o.lansia?.[h] || 0)}`}));
      out.push(bag("rent", `${Kartu.hl("sekitar " + jt(n.balita[h]))} balita dan ${Kartu.hl("sekitar " + jt(n.lansia[h]))} lansia berada di wilayah berudara tidak sehat ${tg}`, hbar(rows, W.merah), ket(), ctl)); }
    if (ms(h)) { const rows = barisR(o => o.ispa?.[h]?.t || 0).map(x => ({n: nmP(x.k), v: x.v, txt: fmt(Math.round(x.v)), tip: `<b>${esc(nmP(x.k))}</b><br>Tambahan kasus ISPA per hari: ${fmt(Math.round(x.v))} (${fmt(Math.round(x.o.ispa[h].lo))} sampai ${fmt(Math.round(x.o.ispa[h].hi))})`}));
      out.push(bag("ispa", `Tambahan sekitar ${Kartu.hl(fmt(Math.round(ms(h).t)) + " kasus ISPA")} per hari ${tg} (${fmt(Math.round(ms(h).lo))} sampai ${fmt(Math.round(ms(h).hi))})`, hbar(rows, W.teal), "Proksi: risiko rawat inap pernapasan (HRAPIE), hanya kota-hari Waspada ke atas, kenaikan dibatasi 100 µg/m³, belum diuji. " + ket(), ctl)); }
    if (R().sekolah?.length) { const s = R().sekolah;
      out.push(bag("skz", `${Kartu.hl("sekitar " + fmt(s.length) + " sekolah")} berada di zona tidak sehat besok`, `<div id="skzTab">${skzTabel()}</div><div id="skzPeta" class="dk-peta"></div>`, `Sumber: data sekolah Kemendikdasmen (Dapodik/EMIS)${dt()}; zona dari prakiraan model CAMS, belum dikoreksi ke alat ukur`)); }
    if (R().bandara?.length) { const b = [...R().bandara].sort((x, y) => x.vis_km - y.vis_km);
      out.push(bag("bnd", `Jarak pandang ${Kartu.hl(esc(b[0].nama))} sekarang ${Kartu.hl(fmt(b[0].vis_km) + " km")}, terendah di antara ${fmt(b.length)} bandara`, `<div id="bndTab">${bndTabel()}</div>`, `Sumber: NOAA METAR; prakiraan jarak pandang dari model${R().bandara.some(x => x.prakiraan_teruji === true) ? "" : ", belum diuji terhadap METAR"}${dt()}`)); }
    return out.join(""); }
  const kotaNama = k => (kotaByKode(k)?.nama) || k;
  function skzTabel() { const kol = [{k: "nama", n: "Sekolah", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kota", n: "Kota", v: r => kotaNama(r.kode_kota), h: r => `<span translate="no">${esc(kotaNama(r.kode_kota))}</span>`}, {k: "st", n: "Status", v: r => Murni.rank(r.st), h: r => pilSt(r.st)}];
    return Insight.tabel("skz", kol, R().sekolah, r => "", 10, "sekolah", r => Murni.rank(r.st)); }
  function bndTabel() { const kol = [{k: "nama", n: "Bandara", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b> <small>${esc(r.icao)}</small>`},
      {k: "vis", n: "Sekarang", num: 1, v: r => r.vis_km, h: r => fmt(r.vis_km) + " km"},
      ...R().hari.map((t, h) => ({k: "p" + h, n: tglPendek(t), num: 1, v: r => r.prakiraan_km?.[h] ?? 99, h: r => r.prakiraan_km?.[h] != null ? fmt(r.prakiraan_km[h]) + " km" : "–"})),
      {k: "pm", n: "PM2,5 besok", num: 1, v: r => r.pm?.[1] ?? 0, h: r => r.pm?.[1] != null ? fmt(r.pm[1]) + " µg/m³" : "–"}];
    return Insight.tabel("bnd", kol, R().bandara, r => "", 10, "bandara", r => -r.vis_km); }
  function ulangTabel(id, fn, box) { box.innerHTML = fn(); const th = box.querySelector("thead"); if (th) pengurutKepala(Insight.T[id], th, () => ulangTabel(id, fn, box)); }
  let petaSek = null;
  function petaSekolah() { const el = $("#skzPeta"); if (!el || !R()?.sekolah?.length || typeof maplibregl === "undefined") return; if (petaSek) return;   /* dibuat sekali */
    const m = petaSek = new maplibregl.Map({container: el, style: DASAR(), center: [118, -2.4], zoom: 3.2, attributionControl: {compact: true}, dragRotate: false});
    m.on("load", () => { m.addSource("s", {type: "geojson", data: {type: "FeatureCollection", features: R().sekolah.map(r => ({type: "Feature", geometry: {type: "Point", coordinates: [r.lon, r.lat]}, properties: {s: r.st, n: r.nama}}))}});
      m.addLayer({id: "s", type: "circle", source: "s", paint: {"circle-radius": 4.5, "circle-color": ["match", ["get", "s"], "awas", Murni.ST_WARNA.awas, "siaga", Murni.ST_WARNA.siaga, Murni.ST_WARNA.waspada], "circle-stroke-color": "#fff", "circle-stroke-width": 1}});
      const xs = R().sekolah.map(r => r.lon), ys = R().sekolah.map(r => r.lat); m.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], {padding: 30, maxZoom: 9, duration: 0}); }); }
  function kartu() {
    if (!D) return "";
    const ds = hariPilihan(); if (!ds.length) return "";
    if (!ds.includes(st.hari)) st.hari = ds[0];
    const T = D.terpapar[st.hari], pv = T.prov || {}, out = [];
    const ctl = ds.length > 1 ? `<div class="seg" role="group">${ds.map(t => `<button data-dks="hari" data-v="${t}" aria-pressed="${st.hari === t}">${labelTgl(t)}</button>`).join("")}</div>` : "";
    const bagi = (kecTanpa) => `Sumber: perkiraan model CAMS, belum dikoreksi ke alat ukur${kecTanpa}`;
    if (T.penduduk) { const R = baris(pv, "penduduk").slice(0, 12);
      out.push(bag("pend", `${Kartu.hl("sekitar " + jt(T.penduduk) + " jiwa")} tinggal di ${fmt(T.kec)} kecamatan berudara tidak sehat (PM2,5 di atas ${fmt(D.batas)} µg/m³) ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, txt: rb(r.v), tip: `<b>${esc(nmP(r.k))}</b><br>Penduduk: sekitar ${fmt(r.v)} jiwa<br>Kecamatan tidak sehat: ${fmt(pv[r.k].kec)}`})), W.merah),
        `Penduduk = semua penghuni kecamatan, bukan hanya yang terpapar langsung. ${T.kec_tanpa_penduduk ? fmt(T.kec_tanpa_penduduk) + " kecamatan tanpa data penduduk tidak dihitung. " : ""}Sumber: WorldPop 2026; perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    if (T.sekolah) { const R = baris(pv, "sekolah").slice(0, 12);
      out.push(bag("sek", `${Kartu.hl("sekitar " + fmt(T.sekolah) + " sekolah")}${T.siswa ? ` dengan sekitar ${jt(T.siswa)} siswa` : ""} berada di kecamatan berudara tidak sehat ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Sekolah: ${fmt(r.v)}${pv[r.k].siswa ? `<br>Siswa: ${fmt(pv[r.k].siswa)}` : ""}`})), W.ungu),
        `${T.kec_tercakup_sekolah ? "Hanya " + fmt(T.kec_tercakup_sekolah) + " kecamatan yang tercatat di data sekolah. " : ""}Sumber: data sekolah Kemendikdasmen (Dapodik/EMIS); perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    if (T.faskes != null || T.rs != null) { const R = baris(pv, "faskes").slice(0, 12);
      out.push(bag("kes", `${Kartu.hl("sekitar " + fmt(T.faskes || 0) + " puskesmas dan klinik")} serta ${fmt(T.rs || 0)} rumah sakit berada di kecamatan berudara tidak sehat ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Puskesmas dan klinik: ${fmt(r.v)}<br>Rumah sakit: ${fmt(pv[r.k].rs || 0)}`})), W.teal),
        `${T.kec_tercakup_faskes ? "Hanya " + fmt(T.kec_tercakup_faskes) + " kecamatan yang punya catatan fasilitas. " : ""}Sumber: OpenStreetMap, bisa kurang dari kenyataan; perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    return out.join(""); }
  async function render() {
    const el = $("#dampak"); if (!el || el.dataset.sudah || el._muat) return;   /* sudah dibangun: jangan bangun ulang tiap buka tab */
    el._muat = 1;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const pg = e.target.closest("#skzTab .pgn-b[data-h], #bndTab .pgn-b[data-h]"); if (pg) { if (pg.disabled) return; const bx = pg.closest("#skzTab, #bndTab"), id = bx.id === "skzTab" ? "skz" : "bnd"; Insight.T[id].hal = +pg.dataset.h; return ulangTabel(id, id === "skz" ? skzTabel : bndTabel, bx); }
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v;   /* chrome langsung, isi menyusul (INP) */
          el.querySelectorAll(`[data-dks="${s.dataset.dks}"]`).forEach(x => x.setAttribute("aria-pressed", x === s));
          nanti(() => { const peta0 = el.querySelector("#skzPeta"); el.querySelector("#dkIsi").innerHTML = isiSemua();   /* peta sekolah tidak bergantung hari: dipindah, bukan dibuat ulang */
            if (peta0 && petaSek) { el.querySelector("#skzPeta")?.replaceWith(peta0); pasangTabel(false); } else pasangTabel(); }); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak kualitas udara…</div>`;
      try { D = await muatJSON("../data/udara_dampak.json"); } catch (e) { D = null; } }
    const isi = isiSemua(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; el._muat = 0; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; pasangTabel(); el.dataset.sudah = 1; }
  const isiSemua = () => kartuRentan() + kartu();
  function pasangTabel(baru = true) { const e1 = $("#skzTab"), e2 = $("#bndTab"); if (e1) ulangTabel("skz", skzTabel, e1); if (e2) ulangTabel("bnd", bndTabel, e2); if (baru) petaSekolah(); }
  return {render};
})();
