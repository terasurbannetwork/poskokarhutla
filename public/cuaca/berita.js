"use strict";
/* ================================================================ berita */
/* Tab Berita cuaca ekstrem: rupa dan anatomi sama dengan tab Berita karhutla dan banjir (kartu bergaya Insight: pil kategori, judul berangka, grafik, kaki "Sumber:";
   daftar berpaginasi, pil topik, peta gelembung per kabupaten). Data: ../banjir/data/berita_cuaca.json (scripts/cuaca/berita.py, dirantai harian dari scripts/banjir/posko.py; `dibuat` ditampilkan di kaki).
   Nada/sentimen TIDAK ditampilkan selama `sentimen_teruji` false (belum ada label uji manusia): tidak ada kartu sentimen, tidak ada pil nada.
   Dibuang dulu (A18, datanya belum ada): celah liputan, pantauan media, video, berita internasional. Mesin kartu dari public/inti. */
const TOPIK_B = {kejadian: "Kejadian cuaca", korban: "Korban", kerusakan: "Kerusakan", bantuan: "Bantuan", peringatan: "Peringatan", laut: "Laut", mitigasi: "Mitigasi"};
const WARNA_T = {kejadian: "#4f8fc4", korban: "#7a2b2b", kerusakan: "#e58a45", bantuan: "#2b8c86", peringatan: "#e3b94e", laut: "#3f7fb8", mitigasi: "#5a9e74"};
const Berita = {
  d: null, f: {prov: "", topik: "", q: "", hal: 0}, rentang: 30, peta: null, sorotHari: 3, _bpPilih: null, provPeta: "",
  BIRU: "#4f8fc4",
  tgP: (t, o) => new Date(t.slice(0, 10) + "T12:00:00+07:00").toLocaleDateString("id-ID", o),
  dom: a => a.domain || (() => { try { return new URL(a.url_asli || a.url).hostname.replace(/^www\./, ""); } catch { return ""; } })(),
  fav: d => d ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=64` : "",
  ikon: d => d ? `<img class="br-fav" src="${esc(Berita.fav(d))}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "",
  thumb(a) { const d = this.dom(a), fv = this.fav(d);
    return a.gambar ? `<img class="br-thumb" src="${escUrl(a.gambar)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fav="${esc(fv)}" onerror="if(this.dataset.fav){this.src=this.dataset.fav;this.dataset.fav='';this.classList.add('fb')}else this.remove()">`
      : fv ? `<img class="br-thumb fb" src="${esc(fv)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""; },
  pl: (t, w) => `<em class="br-lb" style="--w:${w}">${t}</em>`,
  /* kartu Insight: pil kategori di kepala, judul, kontrol; legenda/sumber di kaki */
  kartu(ey, judul, isi, catatan, ctl = "") { return Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  hari7() { return Object.keys(this.d.harian).sort().slice(-7); },

  async render() {
    const el = $("#berita");
    if (!this.d) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat berita…</div>`;
      try { this.d = await muatJSON("../banjir/data/berita_cuaca.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data berita belum tersedia.</div>`; return; } }
    this.SM = "Sumber: Google News RSS, per " + jamWIB(this.d.dibuat);
    el.innerHTML = [this.exHarian(), this.exPeta(), this.exSorotan(), this.exTopik(), this.exDaftar()].join("");
    this.pasangPeta(); this.ikat();
    (window.KartuVideo ? Promise.resolve() : new Promise(r => { const s = document.createElement("script"); s.src = "../inti/video.js"; s.onload = r; s.onerror = r; document.head.append(s); })).then(() => window.KartuVideo?.pasang(el, "cuaca")); },

  /* 1. volume berita harian */
  exHarian() {
    const D = this.d, semua = Object.keys(D.harian).sort(), hari = semua.slice(-this.rentang), n = hari.length, jml = t => D.harian[t].n;
    const W = 940, L = 44, R = 20, T = 26, B = 228, gap = (W - L - R) / n, bw = gap * .7, mx = Math.max(1, ...hari.map(jml)), Y = v => B - v / mx * (B - T), X = i => L + i * gap + gap / 2;
    const puncak = hari.reduce((a, t) => jml(t) > jml(a) ? t : a, hari[0]);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += hari.map((t, i) => { const y = Y(jml(t)), lbl = fmt(jml(t)), pw = lbl.length * 11 * .6 + 16;
      const tip = `<b>${this.tgP(t, {weekday: "long", day: "numeric", month: "long", year: "numeric"})}</b><br>Berita: ${fmt(jml(t))}`;
      return `<g class="gy" style="--i:${i}" data-tip="${tip}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="${Math.min(4, bw / 3)}" fill="${this.BIRU}" opacity=".92"/><rect x="${X(i) - bw / 2}" y="${T}" width="${bw}" height="${B - T}" fill="transparent"/></g>`
        + (t === puncak ? Kartu.pil(X(i) - pw / 2, y - 24, lbl, "#c9503a", "#fff", 11)[0] : n <= 30 ? `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".7">${lbl}</text>` : "")
        + (i % Math.ceil(n / 10) === 0 ? `<text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${this.tgP(t, {day: "numeric", month: "short"})}</text>` : ""); }).join("");
    const ini = hari.reduce((a, t) => a + jml(t), 0), lalu = semua.slice(-2 * n, -n).reduce((a, t) => a + jml(t), 0), d = lalu ? Math.round((ini / lalu - 1) * 100) : null;
    const judul = `${Kartu.hl(fmt(ini) + " berita")} cuaca ekstrem dalam ${n} hari terakhir${d != null && semua.length >= 2 * n ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${n} hari sebelumnya` : ""}. Perhatian media memuncak pada ${Kartu.hl(this.tgP(puncak, {day: "numeric", month: "long"}))} dengan ${fmt(jml(puncak))} berita`;
    const ctl = `<div class="seg">${[[14, "14 hari"], [30, "30 hari"], [120, "120 hari"]].map(([v, nm]) => `<button data-br="rentang" data-v="${v}" aria-pressed="${this.rentang === v}">${nm}</button>`).join("")}</div>`;
    return this.kartu("Volume berita", judul, `<svg viewBox="0 0 ${W} ${B + 22}" role="img" aria-label="Berita per hari">${g}</svg>`, this.SM, ctl); },

  /* 2. peta gelembung per kabupaten + panel kabupaten dan daftar berita */
  artikel7() { const t0 = this.hari7()[0]; return this.d.artikel.filter(a => a.tgl.slice(0, 10) >= t0); },
  exPeta() {
    const A = this.artikel7(), pp = {}; for (const a of A) if (a.prov?.length) pp[a.prov[0]] = (pp[a.prov[0]] || 0) + 1;
    const [pk, pn] = Object.entries(pp).sort((a, b) => b[1] - a[1])[0] || ["", 0], tot = Object.values(pp).reduce((a, b) => a + b, 0);
    if (!pk) return "";
    const side = `<aside class="bp-side"><h4>Kabupaten paling diberitakan</h4><ol class="bp-ls"></ol></aside>`;
    return this.kartu("Peta berita", `${Kartu.hl(esc(namaProv(pk)))} paling banyak diberitakan 7 hari terakhir: ${Kartu.hl(fmt(pn) + " berita")} dari ${fmt(tot)} berita yang menyebut lokasi di Indonesia`,
      `<div class="bp-wrap">${side}<div id="brPeta"></div><aside class="bp-side bp-news"></aside></div>`, `Lokasi diambil dari nama wilayah di judul; ${fmt(Math.round(this.d.ringkasan.berlokasi * 100))}% berita bisa dipetakan. ${this.SM}`); },
  kabPeta() { const kab = {}; for (const a of this.artikel7()) { if (a.lat == null || !a.kab?.length) continue; const k = a.kab[0], o = kab[k] ||= {k, lat: a.lat, lon: a.lon, n: 0}; o.n++; } return kab; },
  pasangPeta() {
    const el = $("#brPeta"); if (!el) return; const D = this.d;
    if (typeof maplibregl === "undefined") return;
    const wrap = el.parentElement, kab = this.kabPeta(), f = Object.values(kab).map(o => ({type: "Feature", geometry: {type: "Point", coordinates: [o.lon, o.lat]}, properties: {k: o.k, nama: o.k.split("|")[1], n: o.n}}));
    this._bpKab = kab; this.isiKiri();
    wrap.querySelector(".bp-side:not(.bp-news)").addEventListener("click", e => {
      if (e.target.closest("[data-bpall]")) return this.pilihProvPeta("");
      const k = e.target.closest("[data-bpk]"); if (k) { this.panelBerita(k.dataset.bpk); const o = kab[k.dataset.bpk]; if (o && this.peta) this.peta.easeTo({center: [o.lon, o.lat], zoom: Math.min(5.2, Math.max(this.peta.getZoom(), 4.4)), duration: 700}); } });
    if (this.peta) this.peta.remove();
    const m = this.peta = new maplibregl.Map({container: el, style: DASAR(), center: [116, -2.5], zoom: 3.9, attributionControl: {compact: true}, dragRotate: false, preserveDrawingBuffer: true});
    const lebar = innerWidth > 1100; m.once("load", () => m.fitBounds([[95, -11], [141, 6]], {padding: lebar ? {left: 280, right: 340, top: 30, bottom: 30} : 20, duration: 0}));
    m.on("load", () => {
      const perProv = {}; for (const a of this.artikel7()) if (a.prov?.length) perProv[a.prov[0]] = (perProv[a.prov[0]] || 0) + 1;
      const bawah = m.getStyle().layers.find(l => l.type === "symbol")?.id;
      if ((S.geo?.prov || S.geo)) { m.addSource("bp", {type: "geojson", data: {type: "FeatureCollection", features: (S.geo.prov || S.geo).features.map(x => ({...x, properties: {...x.properties, v: perProv[x.properties.kode] || 0}}))}});
        m.addLayer({id: "bp-fill", type: "fill", source: "bp", paint: {"fill-color": ["step", ["get", "v"], "rgba(0,0,0,0)", 1, "#eaf2fb", 10, "#cfe1f4", 30, "#a5c8ec", 80, "#6fa6dc", 200, "#3f7fb8"], "fill-opacity": .7}}, bawah);
        m.addLayer({id: "bp-line", type: "line", source: "bp", paint: {"line-color": gelap() ? "#c9d6ea" : "#0b2545", "line-width": .8, "line-opacity": .5}}, bawah); }
      m.addSource("kab", {type: "geojson", data: {type: "FeatureCollection", features: f}, cluster: true, clusterRadius: 46, clusterMaxZoom: 7, clusterProperties: {n: ["+", ["get", "n"]]}});
      m.addLayer({id: "kab-cl", type: "circle", source: "kab", filter: ["has", "point_count"], paint: {"circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 9, 5, 15, 12, 24, 25, 34], "circle-color": this.BIRU, "circle-opacity": .9, "circle-stroke-color": "#fff", "circle-stroke-width": 3}});
      m.addLayer({id: "kab", type: "circle", source: "kab", filter: ["!", ["has", "point_count"]], paint: {"circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 6, 4, 11, 8, 17], "circle-color": this.BIRU, "circle-opacity": .92, "circle-stroke-color": "#fff", "circle-stroke-width": 2.2}});
      m.addLayer({id: "kab-n", type: "symbol", source: "kab", filter: [">=", ["get", "n"], 2], layout: {"text-field": ["to-string", ["get", "n"]], "text-size": ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 1, 10, 12, 14], "text-font": ["Noto Sans Bold"], "text-allow-overlap": true}, paint: {"text-color": "#fff"}});
      m.on("click", "kab-cl", e => { const ft = e.features[0], src = m.getSource("kab");
        src.getClusterLeaves(ft.properties.cluster_id, 50, 0).then(ls => { const pvs = [...new Set(ls.map(l => l.properties.k.split("|")[0]))]; if (pvs.length === 1) this.pilihProvPeta(pvs[0]); });
        src.getClusterExpansionZoom(ft.properties.cluster_id).then(z => m.easeTo({center: ft.geometry.coordinates, zoom: z + .3})); });
      m.on("mousemove", "kab", e => { const p = e.features[0].properties, kp = p.k.split("|");
        window.PI?.tampilTip?.(`<b>${esc(p.nama)}</b><br>${esc(namaProv(kp[0]))}<br>${fmt(p.n)} berita 7 hari`, e.originalEvent); m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "kab", () => { $("#tip")?.classList.remove("on"); m.getCanvas().style.cursor = ""; });
      m.on("mouseenter", "kab-cl", () => m.getCanvas().style.cursor = "pointer"); m.on("mouseleave", "kab-cl", () => m.getCanvas().style.cursor = "");
      m.on("click", "kab", e => { const k = e.features[0].properties.k; this.provPeta = k.split("|")[0]; this.isiKiri(); this.panelBerita(k); });
      m.on("click", e => { if (m.queryRenderedFeatures(e.point, {layers: ["kab", "kab-cl"]}).length) return;
        const pf = m.getLayer("bp-fill") && m.queryRenderedFeatures(e.point, {layers: ["bp-fill"]})[0]; if (pf) this.pilihProvPeta(pf.properties.kode); });
      const top1 = Object.values(kab).sort((a, b) => b.n - a.n)[0]; this.panelBerita(this._bpPilih || top1?.k || null); }); },
  isiKiri() {
    const side = $("#brPeta")?.parentElement.querySelector(".bp-side:not(.bp-news)"); if (!side) return;
    const pv = this.provPeta || "", kb = {};
    for (const a of this.artikel7()) { if (!a.kab?.length || (pv && !a.kab[0].startsWith(pv + "|"))) continue; kb[a.kab[0]] = (kb[a.kab[0]] || 0) + 1; }
    side.querySelector("h4").innerHTML = pv ? `<button class="bp-back" data-bpall title="Semua provinsi">‹</button>${esc(namaProv(pv))}` : "Kabupaten paling diberitakan";
    side.querySelector(".bp-ls").innerHTML = Object.entries(kb).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, n], i) => { const kp = k.split("|");
      return `<li><button data-bpk="${esc(k)}" class="${k === this._bpPilih ? "on" : ""}"><span class="bp-no">${i + 1}</span><span class="bp-nm"><b>${esc(kp[1])}</b><small>${esc(namaProv(kp[0]))}</small></span><i style="background:${this.BIRU}"></i><em>${fmt(n)}</em></button></li>`; }).join("") || `<li class="kosong" style="padding:12px">Belum ada berita.</li>`; },
  pilihProvPeta(pv) { this.provPeta = pv; this.isiKiri(); this.panelBerita(pv || null); },
  panelBerita(k) {
    const box = $("#brPeta")?.parentElement.querySelector(".bp-news"); if (!box) return; this._bpPilih = k;
    const kab = k && k.includes("|"), A = this.artikel7().filter(a => (!k ? a.prov?.length : kab ? a.kab?.[0] === k : a.prov?.includes(k))).sort((a, b) => b.tgl.localeCompare(a.tgl));
    const nama = !k ? "Semua wilayah" : kab ? k.split("|")[1] : namaProv(k);
    $("#brPeta").parentElement.querySelectorAll("[data-bpk]").forEach(b => b.classList.toggle("on", b.dataset.bpk === k));
    const gbr = a => { const d = this.dom(a), fv = this.fav(d);
      return a.gambar ? `<img class="br-pt" src="${escUrl(a.gambar)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fav="${esc(fv)}" onerror="if(this.dataset.fav){this.src=this.dataset.fav;this.dataset.fav='';this.classList.add('fb')}else this.replaceWith(Object.assign(document.createElement('i'),{className:'br-pt kosong'}))">`
        : fv ? `<img class="br-pt fb" src="${esc(fv)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'br-pt kosong'}))">` : `<i class="br-pt kosong"></i>`; };
    box.innerHTML = `<h4>${esc(nama)}</h4><div class="br-pop bp-pop"><div class="br-pop-h"><span>${this.pl(fmt(A.length) + " berita 7 hari", "#1d4e89")}</span></div><div class="br-pop-l">${A.slice(0, 30).map(a =>
      `<a href="${escUrl(a.url)}" target="_blank" rel="noopener">${gbr(a)}<span>${esc(a.judul)}</span><small>${esc(a.sumber)}</small><small class="br-pop-lb">${this.pl(this.tgP(a.tgl, {day: "numeric", month: "short"}), "#5b6782")}</small></a>`).join("")}</div>
      ${A.length > 30 ? `<small>+${fmt(A.length - 30)} berita lain</small>` : ""}<button class="btn-gelap" data-saring="${esc(nama)}">Tampilkan di daftar berita</button></div>`;
    box.querySelector("[data-saring]").onclick = ev => { this.f.q = ev.target.dataset.saring; this.f.hal = 0; this.ulangDaftar(); $("#brDaftar")?.scrollIntoView({behavior: "smooth"}); }; },

  /* 3. cerita paling ramai */
  exSorotan() {
    const hr = this.sorotHari, akhir = new Date(this.d.dibuat), dari = hr === 1 ? this.d.dibuat.slice(0, 10) : new Date(akhir - hr * 864e5 + 7 * 36e5).toISOString().slice(0, 16);
    const C = (this.d.cerita || []).filter(c => (c.akhir || "") >= dari).sort((a, b) => b.n_media - a.n_media || b.n - a.n).slice(0, 12), art = new Map();
    for (const a of this.d.artikel) if (!art.has(a.cerita) || (!art.get(a.cerita).gambar && a.gambar)) art.set(a.cerita, a);
    if (!C.length) return "";
    const nmR = {1: "hari ini", 3: "3 hari terakhir", 7: "7 hari terakhir", 30: "30 hari terakhir"}[hr];
    const ctl = `<div class="seg">${[[1, "Hari ini"], [3, "3 hari"], [7, "7 hari"], [30, "1 bulan"]].map(([v, n]) => `<button data-br="sorotHari" data-v="${v}" aria-pressed="${hr === v}">${n}</button>`).join("")}</div>`;
    return this.kartu("Sorotan", `Cerita paling ramai ${nmR}: ${Kartu.hl(esc(C[0].judul))}`, `<div class="br-sorot">${C.map((c, i) => { const a = art.get(c.id) || {};
      return `<a class="br-kartu" href="${escUrl(a.url)}" target="_blank" rel="noopener"><span class="br-no">${i + 1}</span><span class="br-isi"><b>${esc(c.judul)}</b>
        <small>${this.ikon(this.dom(a))}${fmt(c.n_media)} media · ${esc((c.media || []).slice(0, 3).join(", "))}${c.media?.length > 3 ? " …" : ""}</small>
        <span class="br-chip">${(a.topik || c.topik || []).map(t => TOPIK_B[t] ? `<i style="--w:${WARNA_T[t]}">${TOPIK_B[t]}</i>` : "").join("")}</span></span>${this.thumb({...a, gambar: a.gambar})}</a>`; }).join("")}</div>`, this.SM, ctl); },

  /* 4. topik dan media */
  exTopik() {
    const D = this.d, hari = Object.keys(D.harian).sort().slice(-30), tp = {};
    for (const t of hari) for (const [k, n] of Object.entries(D.harian[t].per_topik || {})) tp[k] = (tp[k] || 0) + n;
    const T = Object.entries(tp).filter(([k]) => TOPIK_B[k]).sort((a, b) => b[1] - a[1]); if (!T.length) return "";
    const tot = T.reduce((a, x) => a + x[1], 0) || 1, mx = Math.max(1, ...T.map(x => x[1])), M = D.media.slice(0, 10), mm = Math.max(1, ...M.map(x => x.n));
    const garis = (v, w) => { const m = Math.max(1, ...v), W = 90, H = 24; return `<svg viewBox="0 0 ${W} ${H}" class="br-spark" aria-hidden="true"><path d="${v.map((x, i) => (i ? "L" : "M") + (i / (v.length - 1) * W).toFixed(1) + "," + (H - 2 - x / m * (H - 4)).toFixed(1)).join("")}" fill="none" stroke="${w}" stroke-width="1.8" stroke-linejoin="round"/></svg>`; };
    const tren = k => { const v = hari.map(t => D.harian[t].per_topik?.[k] || 0), a = v.slice(-7).reduce((x, y) => x + y, 0), b = v.slice(-14, -7).reduce((x, y) => x + y, 0); return {v, d: b ? a / b - 1 : 0}; };
    const baris = T.map(([k, n]) => { const t = tren(k), w = WARNA_T[k];
      return `<button class="br-row" data-topikr="${k}"><span class="br-nm"><i style="background:${w}"></i>${TOPIK_B[k]}</span><span class="br-bar"><i style="width:${n / mx * 100}%;background:${w}"></i></span>
        <span class="br-n"><b>${fmt(n)}</b><small>${Math.round(n / tot * 100)}%</small></span>${garis(t.v, w)}<span class="br-d" style="color:${t.d > .1 ? "#c9503a" : t.d < -.1 ? "#2b8c86" : "var(--ink2)"}">${t.d > 0 ? "▲" : "▼"} ${fmt(Math.abs(Math.round(t.d * 100)))}%</span></button>`; }).join("");
    const domM = Object.fromEntries(D.artikel.filter(a => a.domain).map(a => [a.sumber, a.domain]));
    const media = M.map(x => `<button class="br-row br-row-m" data-media="${esc(x.sumber)}"><span class="br-nm">${this.ikon(domM[x.sumber])}${esc(x.sumber)}</span><span class="br-bar"><i style="width:${x.n / mm * 100}%;background:${this.BIRU}"></i></span><span class="br-n"><b>${fmt(x.n)}</b></span></button>`).join("");
    return this.kartu("Topik", `Topik terbanyak 30 hari: ${Kartu.hl(TOPIK_B[T[0][0]])}`, `<div class="grid g2" style="gap:22px"><div><div class="lbl">Topik · 30 hari</div><div class="br-rows">${baris}</div></div><div><div class="lbl">Media · 120 hari</div><div class="br-rows">${media}</div></div></div>`, this.SM); },
  dlg(judul, sub, isi) { const d = $("#dlg");
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">${judul}</h3>${sub ? `<div class="dh-cs"><span class="dh-c"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7"/></svg>${sub}</span></div>` : ""}</div><button aria-label="Tutup" data-tutup>×</button></div><div class="db">${isi}</div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); }; d.showModal(); },
  rinciKumpulan(judul, A) {
    const D = this.d, hari = Object.keys(D.harian).sort().slice(-30), per = Object.fromEntries(hari.map(t => [t, 0]));
    A.forEach(a => { const t = a.tgl.slice(0, 10); if (t in per) per[t]++; });
    const mx = Math.max(1, ...Object.values(per)), W = 620, bw = W / hari.length;
    const g = hari.map((t, j) => { const h = per[t] / mx * 90; return `<rect x="${j * bw + 1.5}" y="${100 - h}" width="${bw - 3}" height="${Math.max(1, h)}" rx="2" fill="${this.BIRU}" data-tip="<b>${this.tgP(t, {weekday: "long", day: "numeric", month: "long"})}</b><br>Berita: ${fmt(per[t])}"/>`; }).join("")
      + `<text x="0" y="116" font-size="10" opacity=".6">${this.tgP(hari[0], {day: "numeric", month: "short"})}</text><text x="${W}" y="116" font-size="10" text-anchor="end" opacity=".6">${this.tgP(hari.at(-1), {day: "numeric", month: "short"})}</text>`;
    const pv = {}; A.forEach(a => (a.prov || []).forEach(k => pv[k] = (pv[k] || 0) + 1)); const PV = Object.entries(pv).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const tp = {}; A.forEach(a => (a.topik || []).forEach(k => tp[k] = (tp[k] || 0) + 1)); const TP = Object.entries(tp).filter(([k]) => TOPIK_B[k]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sek = (j, isi) => `<section class="dl-sek"><h4>${j}</h4><div>${isi}</div></section>`;
    const batangB = xs => { const m = Math.max(1, ...xs.map(x => x[1])); return `<div class="br-bb">${xs.map(([nm, v, w]) => `<div><span>${nm}</span><i><b style="width:${v / m * 100}%;background:${w}"></b></i><em>${fmt(v)}</em></div>`).join("")}</div>`; };
    const urut = [...A].sort((a, b) => b.tgl.localeCompare(a.tgl)).slice(0, 60), grp = {}; urut.forEach(a => (grp[a.tgl.slice(0, 10)] ||= []).push(a));
    const gb = a => { const t = this.thumb(a); return t ? t.replace('class="br-thumb', 'class="br-pt') : `<i class="br-pt kosong"></i>`; };
    const daftar = Object.entries(grp).map(([t, xs], gi) => `<details class="br-grp"${gi ? "" : " open"}><summary>${this.tgP(t, {weekday: "long", day: "numeric", month: "long"})}<em>${fmt(xs.length)} berita</em></summary><div class="br-pop-l br-dlg-l">${xs.map(a =>
      `<a href="${escUrl(a.url_asli || a.url)}" target="_blank" rel="noopener">${gb(a)}<span>${esc(a.judul)}</span><small>${esc(a.sumber)} · ${a.tgl.slice(11, 16)} WIB</small><small class="br-pop-lb">${(a.topik || []).slice(0, 2).map(k => this.pl(TOPIK_B[k] || k, WARNA_T[k] || "#8a96a8")).join("")}</small></a>`).join("")}</div></details>`).join("");
    this.dlg(judul, `${fmt(A.length)} berita · arsip 120 hari`, sek("Berita per hari · 30 hari", `<svg viewBox="0 0 ${W} 120" style="width:100%" role="img" aria-label="Berita per hari">${g}</svg>`)
      + `<div class="grid g2" style="gap:12px">${sek("Provinsi paling sering disebut", PV.length ? batangB(PV.map(([k, v]) => [esc(namaProv(k)), v, "#2b8c86"])) : "Tidak ada lokasi.")}${sek("Topik", batangB(TP.map(([k, v]) => [TOPIK_B[k], v, WARNA_T[k]])))}</div>` + sek("Berita terbaru", daftar)); },

  /* 5. daftar berita berpaginasi */
  saring() { const f = this.f, q = f.q.toLowerCase(), PV = String(f.prov || "").split(",").filter(Boolean);
    return this.d.artikel.filter(a => (!PV.length || PV.some(k => a.prov?.includes(k))) && (!f.topik || a.topik?.includes(f.topik)) && (!q || (a._k ||= (a.judul + " " + (a.kab || []).join(" ") + " " + a.sumber).toLowerCase()).includes(q))); },
  exDaftar() {
    const pv = [...new Set(this.d.artikel.flatMap(a => a.prov || []))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    const ctl = `<details class="pmulti"><summary>Semua provinsi</summary><div class="pm-menu"><label><input type="checkbox" data-fm="prov" value="" checked><span>Semua provinsi (${pv.length})</span></label>${pv.map(k => `<label><input type="checkbox" data-fm="prov" value="${k}"><span>${esc(namaProv(k))}</span></label>`).join("")}</div></details>`
      + `<div class="br-saring"><input data-f="q" type="search" placeholder="Cari judul, kabupaten, media" aria-label="Cari berita" class="br-cari"><select data-f="topik" aria-label="Topik"><option value="">Semua topik</option>${Object.entries(TOPIK_B).map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></div>`;
    return this.kartu("Daftar berita", `${Kartu.hl(fmt(this.d.artikel.length) + " berita")} cuaca ekstrem dari ${fmt(this.d.media.length)} media terbanyak`, `<div id="brList"></div>`, this.SM, ctl).replace("<article class=\"ex\"", "<article class=\"ex\" id=\"brDaftar\""); },
  ulangDaftar() {
    const R = this.saring(), per = 30, hal = R.slice(this.f.hal * per, (this.f.hal + 1) * per);
    $("#brDaftar").querySelectorAll("[data-f]").forEach(x => { if (x.value !== this.f[x.dataset.f]) x.value = this.f[x.dataset.f]; });
    $("#brList").innerHTML = `<div class="br-list">${hal.map(a => { const th = this.thumb(a);
      return `<div class="br-item${th ? " br-tb" : ""}"><a href="${escUrl(a.url)}" target="_blank" rel="noopener"><b>${esc(a.judul)}</b></a>
        <small class="br-meta">${this.ikon(this.dom(a))}<span class="br-src">${esc(a.sumber)}</span></small>
        <span class="br-meta2">${this.pl(this.tgP(a.tgl, {day: "numeric", month: "short"}) + " · " + a.tgl.slice(11, 16).replace(":", ".") + " WIB", "#5b6782")}${a.kab?.length ? this.pl(esc(a.kab[0].split("|")[1]), "#2b8c86") : a.prov?.length ? this.pl(esc(namaProv(a.prov[0])), "#2b8c86") : ""}</span>
        <span class="br-chip">${(a.topik || []).filter(t => TOPIK_B[t]).map(t => `<i style="--w:${WARNA_T[t]}">${TOPIK_B[t]}</i>`).join("")}</span>${th}</div>`; }).join("") || `<p class="kosong">Tidak ada berita yang cocok.</p>`}</div>${paginasi(this.f.hal, R.length, per, "berita")}`; },

  ikat() {
    const el = $("#berita");
    el.onclick = e => {
      const kartu = e.target.closest(".br-item"); if (kartu && !e.target.closest("a, button, [data-tip], select, input")) { const a = kartu.querySelector("a[href]"); if (a) return window.open(a.href, "_blank", "noopener"); }
      const r = e.target.closest("[data-br]"); if (r) { this[r.dataset.br] = +r.dataset.v; r.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === r)); return nanti(() => this.render()); }
      const tr = e.target.closest("[data-topikr]"); if (tr) { const k = tr.dataset.topikr; return nanti(() => this.rinciKumpulan(`Topik: ${TOPIK_B[k] || k}`, this.d.artikel.filter(a => a.topik?.includes(k)))); }
      const md = e.target.closest("[data-media]"); if (md) { const m = md.dataset.media; return nanti(() => this.rinciKumpulan(`Media: ${esc(m)}`, this.d.artikel.filter(a => a.sumber === m))); }
      const h = e.target.closest("[data-h]"); if (h) { this.f.hal = +h.dataset.h; return nanti(() => this.ulangDaftar()); } };
    el.addEventListener("change", e => { const m = e.target.closest("input[data-fm]"); if (!m) return; const box = m.closest(".pm-menu");
      if (!m.value) box.querySelectorAll("input[value]:not([value=''])").forEach(x => x.checked = false); else box.querySelector("input[value='']").checked = false;
      const P = [...box.querySelectorAll("input:checked")].map(x => x.value).filter(Boolean); if (!P.length) box.querySelector("input[value='']").checked = true;
      this.f.prov = P.join(","); this.f.hal = 0; box.closest("details").querySelector("summary").textContent = !P.length ? "Semua provinsi" : P.length === 1 ? namaProv(P[0]) : P.length + " provinsi"; nanti(() => this.ulangDaftar()); });
    el.oninput = e => { const x = e.target.closest("[data-f]"); if (!x) return; this.f[x.dataset.f] = x.value; this.f.hal = 0; clearTimeout(this._t); const g = () => nanti(() => this.ulangDaftar()); if (x.tagName === "INPUT") this._t = setTimeout(g, 250); else g(); };
    this.ulangDaftar(); },
};
