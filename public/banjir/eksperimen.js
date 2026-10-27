"use strict";
/* Peluang hujan lebat per wilayah (eksperimental) dan pos hujan terukur di peta /banjir.
   Bagian murni (EksPA) diuji di tests/banjir/eksperimen.test.mjs; bagian peta memakai peta/S/Peluang/Analisa/nanti dari skrip lain. */
globalThis.EksPA = (() => {
  const CAKRAWALA = [["besok", "Besok"], ["lusa", "Lusa"], ["h3", "3 hari"], ["h7", "7 hari"]];
  const DEFINISI = {besok: "≥ 50 mm sehari", lusa: "≥ 50 mm sehari", h3: "≥ 100 mm 3 hari", h7: "≥ 50 mm minimal sehari dalam 7 hari"};
  const BATAS = [0, .1, .25, .5, .75, 1], WARNA = ["#e9e4f5", "#c7b8ea", "#a085d6", "#7a4fbf", "#4b1f8f"], TAK = "rgba(0,0,0,0)", ABU = "#cfd5dc";
  const kelas = p => { if (p == null || !isFinite(p)) return -1; const i = BATAS.findIndex((b, j) => j && p < b); return i < 0 ? 4 : i - 1; };
  const warna = p => kelas(p) < 0 ? TAK : WARNA[kelas(p)];
  const pct = p => p == null || !isFinite(p) ? "–" : p >= .995 ? ">99%" : p > 0 && p < .005 ? "<1%" : Math.round(p * 100) + "%";
  const nilai = (w, c) => { const x = w?.cakrawala?.[c]; return x?.p ?? null; };
  /* wilayah punya entri cakrawala tetapi p null (berkas basi atau di luar horizon): abu, bukan 0 dan bukan transparan */
  const warnaWilayah = (w, c) => { const x = w?.cakrawala?.[c]; return x == null ? TAK : x.p == null ? ABU : warna(x.p); };
  const WIB = {timeZone: "Asia/Jakarta"}, tgl = (t, o) => new Intl.DateTimeFormat("id-ID", {...WIB, ...o}).format(new Date(t + "T12:00:00+07:00")).replace(".", "");
  const hm = t => ({h: tgl(t, {day: "numeric"}), b: tgl(t, {month: "short"})});
  /* "Besok, Rab 28 Okt", "3 hari, 28 sampai 30 Okt", "7 hari, 28 Okt sampai 3 Nov" dari cakrawala wilayah acuan */
  const labelCakrawala = (w, c) => { const x = w?.cakrawala?.[c], nama = Object.fromEntries(CAKRAWALA)[c]; if (!x?.t) return nama;
    if (c === "besok" || c === "lusa") return `${nama}, ${tgl(x.t, {weekday: "short"})} ${hm(x.t).h} ${hm(x.t).b}`;
    if (!x.sampai) return nama; const a = hm(x.t), b = hm(x.sampai); return `${nama}, ${a.h}${a.b === b.b ? "" : " " + a.b} sampai ${b.h} ${b.b}`; };
  const ada = d => !!d?.wilayah && Object.values(d.wilayah).some(w => w?.cakrawala && Object.keys(w.cakrawala).length);
  const lencana = d => { const v = d?.prospektif?.vonis; return v ? `Eksperimental, ${v} uji prospektif` : "Eksperimental, belum ada vonis uji prospektif"; };
  /* kunci peta (provinsi, kabupaten, atau kecamatan) -> kunci peluang.json (provinsi atau provinsi|kabupaten) */
  const kunciPel = k => String(k).split("|").slice(0, 2).join("|");
  /* ekspresi match warna untuk fitur yang tampil, dikelompokkan per warna; tanpa data = transparan */
  const ekspresi = (d, c, kunciFitur) => { const g = new Map();
    for (const k of new Set(kunciFitur)) { const w = warnaWilayah(d?.wilayah?.[kunciPel(k)], c); if (w !== TAK) g.set(w, [...(g.get(w) || []), k]); }
    return g.size ? ["match", ["get", "kunci"], ...[...g].flatMap(([w, l]) => [l, w]), TAK] : TAK; };
  /* pos hujan: skala BMKG harian; pos lama atau macet dan angka kosong abu */
  const HB = [[.5, "#c3ccd6"], [5, "#8cc4ec"], [20, "#4f9be0"], [50, "#2f6fc0"], [100, "#6a3fc0"], [150, "#b0309a"], [1e9, "#7a1040"]];
  const warnaHujan = mm => mm == null || !isFinite(mm) ? "#c3ccd6" : HB.find(([b]) => mm < b)[1];
  const redupHujan = (p, now) => ["lama", "macet"].includes(p?.status) || (p?.t != null && now - (p.t > 1e12 ? p.t / 1000 : p.t) > 6 * 3600);
  const kelasHujan = mm => mm == null ? "" : mm < 20 ? "ringan" : mm < 50 ? "sedang" : mm < 100 ? "lebat" : mm < 150 ? "sangat lebat" : "ekstrem";
  const mmTeks = v => v == null || !isFinite(v) ? "" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: v >= 10 ? 0 : 1});
  const geojsonHujan = (pos, now) => ({type: "FeatureCollection", features: (pos || []).filter(p => typeof p.lon === "number" && typeof p.lat === "number").map(p => ({type: "Feature", geometry: {type: "Point", coordinates: [p.lon, p.lat]},
    properties: {id: p.id, nama: p.nama, w: redupHujan(p, now) ? "#c3ccd6" : warnaHujan(p.mm_hari), a: mmTeks(p.mm_hari), u: p.mm_hari == null ? 0 : p.mm_hari}}))});
  return {labelCakrawala, warnaWilayah, ABU, CAKRAWALA, DEFINISI, BATAS, WARNA, TAK, kelas, warna, pct, nilai, ada, lencana, kunciPel, ekspresi, HB, warnaHujan, redupHujan, kelasHujan, mmTeks, geojsonHujan};
})();

/* ---------- bagian peta ---------- */
const Eksp = {
  d: null, c: "besok", nyala: false, asli: null,
  async mulai() {
    this.d ||= await (typeof Peluang !== "undefined" ? Peluang.muat("data/peluang.json") : muatJSON("data/peluang.json").catch(() => null));
    const l = document.querySelector('#lapis input[data-l="peluang"]')?.closest("label"), ok = EksPA.ada(this.d);
    if (l) { l.hidden = !ok; l.style.display = ok ? "" : "none"; }
    if (ok && this.nyala) this.pasang(); },
  pasang() { if (!peta?.getSource("wil")) return;
    if (!peta.getLayer("wil-pel")) peta.addLayer({id: "wil-pel", type: "fill", source: "wil", paint: {"fill-color": EksPA.TAK, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 10, .75, 13, .2]}}, "wil-line");
    this.asli ||= peta.getPaintProperty("wil-fill", "fill-opacity");
    peta.setPaintProperty("wil-fill", "fill-opacity", .01);   /* tetap bisa disorot dan diklik, tetapi tak terlihat */
    this.terapkan(); },
  terapkan() { if (!this.nyala || !peta?.getLayer("wil-pel")) return;
    peta.setPaintProperty("wil-pel", "fill-color", EksPA.ekspresi(this.d, this.c, (S.fiturWil || []).map(f => f.properties.kunci))); },
  tampil(on) { this.nyala = on; const k = this.kartu(); k.hidden = !on;
    if (on) { this.mulai(); this.isiKartu(); } else { if (peta?.getLayer("wil-pel")) peta.removeLayer("wil-pel"); if (this.asli && peta?.getLayer("wil-fill")) peta.setPaintProperty("wil-fill", "fill-opacity", this.asli); this.asli = null; }
    renderLegenda(); },
  kartu() { let k = $("#eksKartu"); if (k) return k;
    k = document.createElement("div"); k.id = "eksKartu"; k.className = "box"; k.hidden = true; $("#lapis").after(k);
    k.addEventListener("click", e => { const b = e.target.closest("button[data-c]"); if (!b) return; this.c = b.dataset.c; k.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { this.terapkan(); this.isiKartu(); renderLegenda(); }); });
    return k; },
  isiKartu() { this.kartu().innerHTML = `<div class="lbl" style="margin-bottom:6px">Peluang hujan lebat</div><div class="seg penuh" style="box-shadow:none">${EksPA.CAKRAWALA.map(([c, n]) => `<button data-c="${c}" aria-pressed="${c === this.c}">${n}</button>`).join("")}</div>
    <div style="margin-top:6px;font-weight:600">${esc(EksPA.labelCakrawala(this.d?.wilayah?.ID, this.c))}</div><span class="pill" style="margin-top:8px;background:#7a4fbf;color:#fff">${esc(EksPA.lencana(this.d))}</span>`; },
  legenda() { if (!this.nyala || !EksPA.ada(this.d)) return "";
    return `<div class="lbl">Peluang ${esc(EksPA.DEFINISI[this.c])}</div><div class="legscale">${EksPA.WARNA.map(w => `<i style="background:${w}"></i>`).join("")}</div><div class="legnum">${EksPA.BATAS.map(b => `<span>${Math.round(b * 100)}%</span>`).join("")}</div><div class="lbl" style="font-weight:400">Peluang tertinggi di wilayah</div><div class="leg" style="margin:4px 0 8px"><span><i class="sw dot" style="background:${EksPA.ABU}"></i>Tanpa data</span></div>`; },
};

const PosHujan = {
  D: null, p: null,
  muat() { return this.p ||= fetch("/api/banjir/hujan-ukur", {cache: "no-cache"}).then(r => r.ok ? r.json() : null).then(d => this.D = d?.pos?.length ? d : null).catch(() => null); },
  menyala: () => !!document.querySelector('#lapis input[data-l="hujanukur"]')?.checked,
  async mulai() { await this.muat(); const l = document.querySelector('#lapis input[data-l="hujanukur"]')?.closest("label"), ok = !!this.D;
    if (l) { l.hidden = !ok; l.style.display = ok ? "" : "none"; } if (!ok || !peta) return;
    const g = EksPA.geojsonHujan(this.D.pos, Date.now() / 1000), s = peta.getSource("hujanukur"); if (s) return s.setData(g);
    const vis = this.menyala() ? "visible" : "none", gl = gelap();
    peta.addSource("hujanukur", {type: "geojson", data: g});
    peta.addLayer({id: "hujanukur", type: "circle", source: "hujanukur", layout: {visibility: vis, "circle-sort-key": ["get", "u"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 7, 13, 10], "circle-color": ["get", "w"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.6}});
    peta.addLayer({id: "hujanukur-angka", type: "symbol", source: "hujanukur", minzoom: 8.5, filter: ["!=", ["get", "a"], ""],
      layout: {visibility: vis, "text-field": ["concat", ["get", "a"], " mm"], "text-font": ["Noto Sans Bold"], "text-size": 12, "text-anchor": "left", "text-offset": [.9, 0], "text-optional": true},
      paint: {"text-color": gl ? "#fff" : "#0b2545", "text-halo-color": gl ? "#0b1424" : "#fff", "text-halo-width": 1.8}});
    peta.on("mouseenter", "hujanukur", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "hujanukur", () => peta.getCanvas().style.cursor = ""); },
  cari(id) { return this.D?.pos?.find(p => p.id === id) || null; },
  tampil(on) { for (const l of ["hujanukur", "hujanukur-angka"]) peta?.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"); },
  hit(pt) { const f = peta.getLayer("hujanukur") && peta.queryRenderedFeatures(pt, {layers: ["hujanukur"]}); return f?.length ? f[0].properties.id : null; },
  buka(id) { const x = this.cari(id); if (!x) return; const mati = EksPA.redupHujan(x, Date.now() / 1000), w = mati ? "#7a8796" : EksPA.warnaHujan(x.mm_hari);
    const isi = `<div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:34px;line-height:1;color:${w}">${EksPA.mmTeks(x.mm_hari) || "–"}</b><span style="font-size:15px;color:var(--ink2)">mm hari ini</span>${mati ? `<span class="pill" style="margin-left:auto;background:#8d9aa9;color:#fff">Data lama</span>` : EksPA.kelasHujan(x.mm_hari) ? `<span class="pill" style="margin-left:auto;background:${w};color:#fff">${EksPA.kelasHujan(x.mm_hari)}</span>` : ""}</div>
      <table class="tb2"><tbody><tr><td>Satu jam terakhir</td><td class="n">${x.mm_1jam == null ? "–" : EksPA.mmTeks(x.mm_1jam) + " mm"}</td></tr>${x.t ? `<tr><td>Dibaca</td><td class="n">${PosAir.waktuBaca(x.t).replace("Dibaca ", "")}</td></tr>` : ""}<tr><td>Pengelola</td><td class="n">${esc(x.pengelola || "–")}</td></tr></tbody></table>`;
    Analisa.buka(isi, `<div><h3 id="dlgJudul">${esc(x.nama)}</h3><p>Pos hujan</p></div>`); },
};
