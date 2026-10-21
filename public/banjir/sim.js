"use strict";
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="sim.css">');
/* ================================================================ simulasi skenario */
/* Aturan status = scripts/banjir/status.py, ditulis ulang di peramban, baris per baris:
   kecamatan -> titik berat poligon terbesar (fitur pertama bila kecamatan terbelah), sel hujan.json di petak yang sama
   (atau tetangga terdekat), titik sungai.json terdekat <= 25 km, titik hujan_ansambel.json terdekat (<= 1 derajat);
   H3 = jumlah prakiraan 3 hari dibulatkan 0,1 mm; RK dari debit tertinggi di jendela yang sama terhadap Q2/Q5/Q20;
   I/C = imax/cape tertinggi di jendela; P3 = peluang ansambel; sm hari d; A7 tetap. Medan yang tidak ada di berkas
   (imax, cape, sm, ansambel) = jalur itu mati, persis seperti status.py. Tanpa skenario hasilnya harus sama persis
   dengan status.json: Simulasi.uji() memeriksanya dan hasilnya tampil di tab.
   Skenario mengubah masukan, bukan aturannya:
     hujan x1,5 / x2   -> prakiraan harian dan intensitas per jam (imax) hari ini dan sesudahnya dikali; P3 ansambel tetap
     hujan ekstrem     -> tiap jendela 3 hari minimal X mm
     tanah jenuh       -> A7 minimal 200 mm dan sm minimal 0,45 (aturan banjir tidak memakai keduanya: hanya longsor berubah)
     sungai Q5 / Q20   -> kelas sungai minimal 2 / 3 di kecamatan yang punya titik sungai <= 25 km (juga titik tanpa
                          ambang Q2/Q5/Q20: "debit mencapai Q5" sudah berarti kelas 2 tanpa perlu tahu angkanya)
     pasang tinggi     -> TAMBAHAN simulasi, bukan status.py: kecamatan pesisir minimal Waspada, Siaga bila H3 >= 50 mm
                          (hujan tak bisa dibuang ke laut saat pasang). Pesisir = indeks gelombang/abrasi InaRISK > 0
                          atau <= 15 km dari titik pantai rob.json. */
/* imax/cape/p3/sm null = jalur itu tidak dipakai (aturan lama), sama dengan status.py */
/* hasil uji balik 13 Okt 2026 (status.py GESER, K_BANJIR, K_LONGSOR, A7_BASAH; scripts/banjir/RISET-UJI-BALIK.md):
   jendela H3/I/C hari d = d-1..d+1; ambang H3 banjir 40/80/120, longsor 30/60/90 mm; jenuh = sm >= 0,45 dan A7 >= 25 mm */
const GESER = -1, AMBANG_B = [40, 80, 120], AMBANG_L = [30, 60, 90], A7_BASAH = 25;
const levelBanjir = (h3, bh, rk, im, cape, p3) => { im ||= 0; cape ||= 0; p3 ||= 0; const [w, s, a] = AMBANG_B;
  return rk === 3 || (h3 >= a && bh >= .66) ? 3 : rk === 2 || (bh >= .33 && (h3 >= s || im >= 30 || p3 >= .5)) ? 2 : rk === 1 || h3 >= w || im >= 20 || (cape >= 2500 && h3 >= w) ? 1 : 0; };
const levelLongsor = (h3, a7, bh, sm, im) => { const j = sm != null ? sm >= .45 && a7 >= A7_BASAH : a7 >= 150, [w, s, a] = AMBANG_L;
  return h3 >= a && j && bh >= .66 ? 3 : (h3 >= s && j && bh >= .66) || (h3 >= a && bh >= .33) || ((im || 0) >= 20 && bh >= .66) ? 2 : h3 >= w && bh >= .33 ? 1 : 0; };
const puncak3 = (xs, m) => { const a = (xs || []).slice(m, m + 3).filter(x => x != null); return a.length ? Math.max(...a) : null; };
/* round(sum, 1) Python: toFixed membulatkan nilai biner persis, sama dengan round() kecuali tepat di x,x5 yang tak pernah jatuh di ambang */
const jendela3 = (xs, m) => +xs.slice(m, m + 3).reduce((a, x) => a + (x || 0), 0).toFixed(1);
const kelasSungai = (q, m, t) => { const ada = q.slice(m, m + 3).filter(x => x != null); if (!ada.length || !t.q2) return null; const p = Math.max(...ada);
  return p >= t.q20 ? 3 : p >= t.q5 ? 2 : p >= t.q2 ? 1 : 0; };
const kmDatar = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, x = (lo2 - lo1) * r * Math.cos((la1 + la2) / 2 * r); return 6371 * Math.hypot(x, (la2 - la1) * r); };
/* skenario yang dibandingkan (tiap satu mengubah satu masukan; Prakiraan = status.json, selalu ikut sebagai pembanding) */
const SKEN = [{id: "dasar", n: "Prakiraan", w: "#5f6fb0"}, {id: "hujan", n: "Hujan lebih deras", w: "#4f8fc4"}, {id: "ekstrem", n: "Hujan ekstrem", w: "#c9503a"},
  {id: "jenuh", n: "Tanah jenuh", w: "#a8842e"}, {id: "sungai", n: "Sungai meluap", w: "#3f7fb8"}, {id: "pasang", n: "Pasang tinggi", w: "#5a9e74"}];
const Simulasi = {
  prov: "32", kab: "", b: "b", hari: "maks", lihat: "dasar", dom: false, basi: false, hasilSk: null, on: new Set(["hujan", "ekstrem", "jenuh", "sungai", "pasang"]), op: {x: 1.5, ekstrem: 100, sungai: 2},
  kec: null, kode: null, dasar: null, aktif: false, peta: null, JENUH: 200, PANTAI_KM: 15,
  /* mode "genangan" = sim_tampak.js (DEM, genangan 72 jam 3D, longsor, perlakuan); /banjir/sim?sim=genangan membukanya langsung */
  mode: new URLSearchParams(location.search).get("sim") === "genangan" ? "genangan" : "status",
  modeHtml() { return `<div class="simchips simmode" role="group" aria-label="Jenis simulasi">${[["status", "Status kecamatan"], ["genangan", "Genangan 3D"]].map(([v, n]) => `<button type="button" data-mode="${v}" aria-pressed="${this.mode === v}">${n}</button>`).join("")}</div>`; },
  gantiMode(m) { if (m === this.mode || (m === "genangan" && !window.SimTampak)) return; this.mode = m;
    document.querySelectorAll(".simmode button").forEach(x => x.setAttribute("aria-pressed", x.dataset.mode === m)); nanti(() => this.render()); },
  get hasil() { return this.hasilSk?.[this.lihat] || this.dasar; },
  sentroid(ring) { let a = 0, cx = 0, cy = 0; const n = ring.length;
    for (let i = 0; i < n; i++) { const [x1, y1] = ring[i], [x2, y2] = ring[(i + 1) % n], c = x1 * y2 - x2 * y1; a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c; }
    if (Math.abs(a) < 1e-12) return [ring.reduce((s, p) => s + p[1], 0) / n, ring.reduce((s, p) => s + p[0], 0) / n];
    return [cy / (3 * a), cx / (3 * a)]; },
  /* masukan tetap per kecamatan satu provinsi: sel hujan, titik sungai, bahaya, pesisir */
  async siapkan(kode) {
    if (this.kode === kode) return;
    const gj = S.geo.kec[kode] ||= await muatJSON(`../geo/kecamatan/${kode}.json`);
    if (!Object.keys(S.bahaya).length) S.bahaya = (await muatJSON("data/bahaya.json")).kec || {};
    if (!S.kejadian) S.kejadian = await muatJSON("data/kejadian.json").catch(() => null);
    if (this.ens === undefined) this.ens = await muatJSON("data/hujan_ansambel.json").catch(() => null);
    if (this.val === undefined) this.val = await muatJSON("data/validasi.json").catch(() => null);
    const E = this.ens && this.ens.hari.includes(S.hujan.hari_ini) ? this.ens : null;
    const H = S.hujan, sel = H.sel, petak = this.petak ||= new Map(H.grid.map(g => [Math.floor(g.lat / sel) + "," + Math.floor(g.lon / sel), g]));
    const selTerdekat = (la, lo) => { const gy = Math.floor(la / sel), gx = Math.floor(lo / sel), d2 = g => (g.lat - la) ** 2 + (g.lon - lo) ** 2;
      if (petak.has(gy + "," + gx)) return petak.get(gy + "," + gx);
      const dekat = [-1, 0, 1].flatMap(a => [-1, 0, 1].map(b => petak.get((gy + a) + "," + (gx + b)))).filter(Boolean);
      return (dekat.length ? dekat : H.grid).reduce((m, g) => d2(g) < d2(m) ? g : m); };
    const titik = S.sungai?.titik || [], pantai = (S.rob?.titik || []).map(t => [t.lat, t.lon]), kec = {};
    for (const f of gj.features) { const g = f.geometry, k = `${kode}|${f.properties.kab}|${f.properties.kec}`; if (kec[k]) continue;
      const ring = (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]).map(p => p[0]).reduce((a, r) => r.length > a.length ? r : a);
      let [la, lo] = this.sentroid(ring); la = +la.toFixed(4); lo = +lo.toFixed(4);
      let sg = null, jarak = 25;
      titik.forEach((t, i) => { if (Math.abs(t.lat - la) < .25 && Math.abs(t.lon - lo) < .25) { const d = kmDatar(la, lo, t.lat, t.lon); if (d <= jarak) { sg = i; jarak = d; } } });
      const bh = S.bahaya[k] || {};
      const e = E && E.grid.reduce((m, g) => (g.lat - la) ** 2 + (g.lon - lo) ** 2 < (m.lat - la) ** 2 + (m.lon - lo) ** 2 ? g : m);
      kec[k] = {kab: f.properties.kab, nama: f.properties.kec, lat: la, lon: lo, g: selTerdekat(la, lo), sg, bb: bh.banjir || 0, bl: bh.longsor || 0,
        p3: e && Math.abs(e.lat - la) <= 1 && Math.abs(e.lon - lo) <= 1 ? e.p3 : null,
        pantai: (bh.gelombang || 0) > 0 || pantai.some(([a, b]) => km(la, lo, a, b) <= this.PANTAI_KM)}; }
    this.kec = kec; this.kode = kode; this.dasar = this.hitung(null); this.cek = this.uji(); },
  /* status 4 hari semua kecamatan; u = skenario atau null (prakiraan) */
  hitung(u) {
    const H = S.hujan, i0 = H.hari.indexOf(H.hari_ini), titik = S.sungai?.titik || [], j = (S.sungai?.hari || []).indexOf(H.hari_ini), j0 = j < 0 ? 3 : j, out = {};
    const e0 = this.ens ? this.ens.hari.indexOf(H.hari_ini) : -1, kali = xs => u && u.x !== 1 && xs ? xs.map((v, i) => i >= i0 && v != null ? v * u.x : v) : xs;
    for (const [k, c] of Object.entries(this.kec)) {
      const h = kali(c.g.h), im = kali(c.g.imax), sm = c.g.sm || [];
      const smD = d => { const v = i0 + d < sm.length ? sm[i0 + d] : null; return v != null && u?.jenuh ? Math.max(v, .45) : v; };
      const p3D = d => c.p3 && c.p3.length && e0 >= 0 && e0 + d < c.p3.length ? c.p3[e0 + d] : null;
      const h3s = [0, 1, 2, 3].map(d => Math.max(jendela3(h, i0 + d + GESER), u?.ekstrem || 0)), a7 = Math.max(c.g.a7 || 0, u?.jenuh ? this.JENUH : 0);
      const rk = h3s.map((_, d) => { const r = c.sg != null ? kelasSungai(titik[c.sg].q, j0 + d, titik[c.sg]) : null; return c.sg != null && u?.sungai ? Math.max(r ?? 0, u.sungai) : r; });
      out[k] = {b: h3s.map((x, d) => { const l = levelBanjir(x, c.bb, rk[d], puncak3(im, i0 + d + GESER), puncak3(c.g.cape, i0 + d + GESER), p3D(d)); return u?.pasang && c.pantai ? Math.max(l, x >= 50 ? 2 : 1) : l; }),
        l: h3s.map((x, d) => levelLongsor(x, a7, c.bl, smD(d), puncak3(im, i0 + d + GESER))), h3: Math.max(...h3s), a7, rk: Math.max(-1, ...rk.map(r => r ?? -1))}; }
    return out; },
  /* uji: perhitungan ulang tanpa skenario harus sama dengan status.json (yang tak tercantum = Normal 4 hari) */
  uji() { const beda = [], nol = [0, 0, 0, 0];
    for (const [k, v] of Object.entries(this.dasar)) { const s = S.st.kec[k] || {b: nol, l: nol}; if (["b", "l"].some(z => s[z].join() !== v[z].join())) beda.push(k); }
    const hilang = Object.keys(S.st.kec).filter(k => k.startsWith(this.kode + "|") && !this.dasar[k]);
    return {n: Object.keys(this.dasar).length, beda, hilang}; },
  preset(id) { const o = this.op; return {x: id === "hujan" ? o.x : 1, ekstrem: id === "ekstrem" ? o.ekstrem : 0, jenuh: id === "jenuh", pasang: id === "pasang", sungai: id === "sungai" ? o.sungai : 0}; },
  ids() { return SKEN.filter(s => s.id === "dasar" || this.on.has(s.id)).map(s => s.id); },
  lv(r, k) { const a = r[k][this.b]; return this.hari === "maks" ? Math.max(...a) : a[this.hari]; },
  kunciLihat() { return Object.keys(this.kec).filter(k => !this.kab || this.kec[k].kab === this.kab); },
  /* level skenario untuk peta utama: agregat ke prov/kab/kec = level tertinggi, sama dengan agregat() halaman */
  agregat() { const o = {}; if (!this.hasil) return o;
    for (const k of Object.keys(this.hasil)) { const l = this.lv(this.hasil, k), [p, kb] = k.split("|");
      for (const key of [p, p + "|" + kb, k]) { const a = o[key] ||= {lv: 0, n: [0, 0, 0, 0]}; a.lv = Math.max(a.lv, l); a.n[l]++; } }
    return o; },
  /* dipanggil di akhir Peta.aturWilayah() bila skenario aktif: warnai fitur `wil` provinsi ini dengan level skenario */
  lukisPeta() {
    if (!this.aktif || !this.hasil || typeof peta === "undefined" || !peta?.getSource("wil") || !S.fiturWil) return;
    const ag = this.agregat();
    S.fiturWil.forEach(f => { if (f.properties.kunci.split("|")[0] === this.kode) f.properties.lv = ag[f.properties.kunci]?.lv || 0; });
    peta.getSource("wil").setData({type: "FeatureCollection", features: S.fiturWil}); },
  async keUtama() { this.aktif = true; S.b = this.b; S.jalur = this.kab ? [this.kode, this.kab] : [this.kode]; bukaTab("peta");
    await Peta.aturWilayah(); this.lukisPeta(); toast("Peta menampilkan skenario. Pindah wilayah untuk kembali ke prakiraan."); this.aktif = false; },
  /* rata-rata pengungsi & terdampak per kejadian (per kabupaten, DIBI) di provinsi: P25, median, P75 antartahun */
  perKejadian() { const p = S.kejadian?.prov?.[this.kode] || {}, J = this.b === "b" ? ["banjir", "bandang", "rob"] : ["longsor"], o = {};
    for (const f of ["mengungsi", "terdampak"]) { const r = [];
      for (let y = 2008; y <= 2025; y++) { const kj = J.reduce((a, j) => a + (p[j]?.[y]?.kejadian || 0), 0); if (kj) r.push(J.reduce((a, j) => a + (p[j]?.[y]?.[f] || 0), 0) / kj); }
      o[f] = r.length ? [persentil(r, .25), persentil(r, .5), persentil(r, .75)] : [0, 0, 0]; }
    return o; },
  /* titik awal = kejadian aktif paling genting hari ini (kejadian_aktif_awal.json, skor tertinggi), tanpa kejadian = kecamatan status tertinggi;
     SimTanggap.pilihAwal. Bawaan provinsi 32 hanya bila keduanya kosong. Satu kali per muat halaman. */
  awal() { return this._awal ||= (async () => { try {
    const K = window.KejAktif ? await KejAktif.muatAwal() : ((await muatJSON("data/kejadian_aktif_awal.json").catch(() => null))?.kejadian || []);
    const a = window.SimTanggap?.pilihAwal(K, S.st?.kec); if (!a) return; const [pv, kb] = a.k.split("|"); if (!S.meta.provinsi[pv]) return;
    this.awalInfo = a; this.prov = pv; this.kab = kb; } catch (e) { console.warn("Simulasi.awal:", e); } })(); },
  awalHtml(k) { const a = this.awalInfo; if (!a || (k ? k !== a.k : this.prov !== a.k.split("|")[0])) return ""; const [, kb, kc] = a.k.split("|");
    return `<p class="fnd" id="simAwal">${a.sumber === "kejadian" ? `Dimulai dari kejadian ${esc(a.kode)} sejak ${tglPendek(a.sejak)}, yang paling genting hari ini` : "Dimulai dari kecamatan paling genting di status hari ini"}: <span translate="no">${esc(kc)}, ${esc(kb)}</span>.</p>`; },
  async render() {
    const p = $("#p-sim");
    /* peta penuh + panel kiri + dok legenda, seperti /sim karhutla; section dibuat ulang sekali (tanpa .scroll/.wrap halaman form lama) */
    if (!this.dom) { p.classList.remove("scroll"); this.dom = true;
      p.innerHTML = `<div id="simPeta" role="img" aria-label="Peta status kecamatan skenario"></div><div class="card simpanel" id="simPanel"></div><div class="dok" id="simDok"><div class="box" id="simLegenda"></div></div>`; }
    if (!S.st || !S.hujan) { $("#simPanel").innerHTML = `<div class="kosong"><div class="spin"></div>Memuat data…</div>`; return; }
    await this.awal();
    if (this.mode === "genangan" && window.SimTampak) return SimTampak.render();
    window.SimTampak?.lepas(); this.muat(); },
  async muat() {
    if (this.kode !== this.prov) { $("#simPanel").innerHTML = `<div class="kosong"><div class="spin"></div>Menyiapkan kecamatan…</div>`; await this.siapkan(this.prov); }
    this.panel(); this.peta2(true); },
  tandaiBasi() { if (!this.hasilSk) return; this.basi = true; const j = $("#simJalan"); if (j) j.textContent = "Jalankan ulang"; },
  async jalan() {
    const s = $("#simStatus"); if (s) s.textContent = "Menghitung…";
    await this.siapkan(this.prov); await new Promise(nanti);
    const ids = this.ids(); this.hasilSk = {}; ids.forEach(id => this.hasilSk[id] = id === "dasar" ? this.dasar : this.hitung(this.preset(id)));
    /* yang dilihat pertama = skenario dengan kecamatan berubah terbanyak */
    const ubah = id => this.kunciLihat().filter(k => this.lv(this.dasar, k) !== this.lv(this.hasilSk[id], k)).length;
    if (!ids.includes(this.lihat) || this.lihat === "dasar") this.lihat = ids.filter(i => i !== "dasar").sort((x, y) => ubah(y) - ubah(x))[0] || "dasar";
    this.basi = false; this.panel(); this.peta2(false); const h = $("#simHasil"); if (h) $("#simPanel").scrollTop = h.offsetTop - 12; },
  panel() {
    const el = $("#simPanel"), atas = el.scrollTop, o = this.op, ks = this.kunciLihat(), R = this.hasil, D = this.dasar, ada = !!this.hasilSk;
    const hit = r => { const n = [0, 0, 0, 0]; ks.forEach(k => n[this.lv(r, k)]++); return n; }, n1 = hit(R), n0 = hit(D), tinggi = n1[3] ? 3 : n1[2] ? 2 : n1[1] ? 1 : 0;
    const wil = this.kab || namaProv(this.kode), kabs = [...new Set(Object.values(this.kec).map(c => c.kab))].sort();
    const geser = (id, lbl, min, max, step, v, tampil) => `<label class="simgeser"><span>${lbl}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><b class="num" id="${id}V">${tampil(v)}</b></label>`;
    const atur = {
      hujan: geser("smX", "Pengali hujan", 1.25, 3, .25, o.x, v => fmt(v) + "×"),
      ekstrem: geser("smE", "Hujan 3 hari minimal", 50, 300, 10, o.ekstrem, v => fmt(v) + " mm"),
      jenuh: geser("smJ", "Hujan 7 hari ≥", 100, 300, 10, this.JENUH, v => fmt(v) + " mm"),
      sungai: geser("smS", "Debit sungai", 2, 3, 1, o.sungai, v => v === 3 ? "Q20" : "Q5"),
    };
    const hariOpt = [["maks", "4 hari ke depan"], ...S.st.hari.map((t, i) => [i, tglPendek(t)])];
    el.innerHTML = `<div class="lbl">Simulasi skenario 4 hari · model</div><h2>${esc(wil)}</h2>
      <div style="font-size:12.5px;color:var(--ink2)">${this.kab ? esc(namaProv(this.kode)) : esc(fmt(kabs.length) + " kabupaten/kota")} · <span class="pill l${tinggi}">${LEVEL[tinggi]}</span></div>
      ${this.awalHtml()}
      ${window.SimTampak ? this.modeHtml() : ""}
      <label class="fld"><span class="lbl">Provinsi</span><select id="smProv" aria-label="Provinsi">${Object.entries(S.meta.provinsi).map(([k, n]) => `<option value="${k}" ${k === this.prov ? "selected" : ""}>${esc(n)}</option>`).join("")}</select></label>
      <label class="fld"><span class="lbl">Kabupaten/kota</span><select id="smKab" aria-label="Kabupaten"><option value="">Semua kabupaten/kota</option>${kabs.map(k => `<option ${k === this.kab ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
      <div class="kv">${[[3, "Awas"], [2, "Siaga"], [1, "Waspada"]].map(([i, n]) => `<div><b>${fmt(n1[i])}</b><span>Kecamatan ${n}${ada ? `<em>prakiraan ${fmt(n0[i])}</em>` : ""}</span></div>`).join("")}</div>
      <div class="lbl" style="margin:12px 0 6px">Jenis bahaya</div>
      <div class="simchips" role="group" aria-label="Jenis bahaya">${[["b", "Banjir"], ["l", "Longsor"]].map(([v, n]) => `<button type="button" data-b="${v}" aria-pressed="${this.b === v}">${n}</button>`).join("")}</div>
      <div class="lbl" style="margin:12px 0 6px">Skenario yang dibandingkan</div>
      <div class="simchips" role="group" aria-label="Skenario">${SKEN.map(s => `<button type="button" data-sk="${s.id}" aria-pressed="${s.id === "dasar" || this.on.has(s.id)}" ${s.id === "dasar" ? "disabled title=\"Selalu dihitung sebagai pembanding\"" : ""}><i style="background:${s.w}"></i>${s.n}</button>`).join("")}</div>
      <details class="simatur-grup" ${ada && !this.basi ? "" : "open"}><summary class="lbl">Pengaturan skenario</summary>
      ${SKEN.filter(s => atur[s.id] && this.on.has(s.id)).map(s => `<div class="simatur"><div class="lbl" style="color:${s.w}">${s.n}</div>${atur[s.id]}</div>`).join("")}
      <div class="simatur"><div class="lbl">Hari yang dilihat</div><label class="fld" style="margin:6px 0 0"><select id="smHari" aria-label="Hari">${hariOpt.map(([v, n]) => `<option value="${v}" ${String(this.hari) === String(v) ? "selected" : ""}>${n}</option>`).join("")}</select></label></div></details>
      <button class="btn pri" id="simJalan" style="width:100%;margin-top:10px">${ada ? "Jalankan ulang" : `Jalankan ${this.ids().length} skenario`}</button>
      <p class="fnd" id="simStatus" aria-live="polite" style="margin-top:6px"></p>
      <div id="simHasil">${ada ? this.hasilHtml(ks) : ""}</div>`;
    el.onclick = e => { const b = e.target.closest("button"); if (!b) return;
      const tekan = () => b.setAttribute("aria-pressed", "true"), segar = peta => nanti(() => { this.panel(); if (peta) this.peta2(false); });
      if (b.dataset.mode) return this.gantiMode(b.dataset.mode);
      if (b.dataset.sk) { const i = b.dataset.sk; const on = !this.on.has(i); on ? this.on.add(i) : this.on.delete(i); b.setAttribute("aria-pressed", on); if (this.hasilSk) this.basi = true; segar(false); }
      else if (b.dataset.b) { this.b = b.dataset.b; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); segar(true); }
      else if (b.dataset.lihat) { this.lihat = b.dataset.lihat; tekan(); segar(true); }
      else if (b.id === "simJalan") this.jalan();
      else if (b.id === "simUtama") this.keUtama(); };
    $("#smProv").onchange = async e => { const ran = !!this.hasilSk; this.prov = e.target.value; this.kab = ""; this.hasilSk = null; await this.muat(); if (ran) this.jalan(); };
    $("#smKab").onchange = e => { this.kab = e.target.value; nanti(() => { this.panel(); this.peta2(true); }); };
    $("#smHari").onchange = e => { this.hari = e.target.value === "maks" ? "maks" : +e.target.value; nanti(() => { this.panel(); this.peta2(false); }); };
    [["smX", v => o.x = v, v => fmt(v) + "×"], ["smE", v => o.ekstrem = v, v => fmt(v) + " mm"], ["smJ", v => this.JENUH = v, v => fmt(v) + " mm"], ["smS", v => o.sungai = v, v => v === 3 ? "Q20" : "Q5"]].forEach(([id, set, t]) => {
      const i = $("#" + id); if (i) i.oninput = () => { set(+i.value); $("#" + id + "V").textContent = t(+i.value); this.tandaiBasi(); }; });
    el.scrollTop = atas; this.legenda(); },
  legenda() {
    const nm = this.b === "b" ? "banjir" : "longsor", s = SKEN.find(x => x.id === this.lihat);
    $("#simLegenda").innerHTML = `<div class="lbl" style="margin-bottom:4px"><span>Status ${nm}</span> · <span>${s.n}</span></div><div class="leg row">${LEVEL.map((n, i) => `<span><i class="sw" style="background:${WARNA_LV[i]}"></i>${n}</span>`).join("")}<span><i class="sw" style="background:none;border:2px solid var(--ink)"></i>berubah dari prakiraan</span></div>`; },
  hasilHtml(ks) {
    const D = this.dasar, R = this.hasil, u = this.preset(this.lihat), nm = this.b === "b" ? "banjir" : "longsor", hit = r => { const n = [0, 0, 0, 0]; ks.forEach(k => n[this.lv(r, k)]++); return n; }, n0 = hit(D), n1 = hit(R);
    const berubah = ks.filter(k => this.lv(D, k) !== this.lv(R, k)).map(k => ({k, c: this.kec[k], a: this.lv(D, k), z: this.lv(R, k)})).sort((x, y) => y.z - x.z || (y.z - y.a) - (x.z - x.a) || x.c.nama.localeCompare(y.c.nama));
    const perKab = {}; berubah.forEach(x => perKab[x.c.kab] = (perKab[x.c.kab] || 0) + 1); const kabTop = Object.entries(perKab).sort((a, b) => b[1] - a[1])[0];
    const kabSiaga = r => new Set(ks.filter(k => this.lv(r, k) >= 2).map(k => this.kec[k].kab)).size, kb0 = kabSiaga(D), kb1 = kabSiaga(R);
    const pk = this.perKejadian(), wil = this.kab ? esc(this.kab) : esc(namaProv(this.kode)), hariT = this.hari === "maks" ? "dalam 4 hari ke depan" : "pada " + tglPendek(S.st.hari[this.hari]);
    const bag = [u.x !== 1 && `hujan ${fmt(u.x)} kali prakiraan`, u.ekstrem && `hujan 3 hari minimal ${fmt(u.ekstrem)} mm`, u.jenuh && `tanah sudah jenuh (hujan 7 hari ≥ ${fmt(this.JENUH)} mm)`,
      u.sungai && `sungai mencapai debit ${u.sungai === 3 ? "Q20 (sekali dalam 20 tahun)" : "Q5 (sekali dalam 5 tahun)"}`, u.pasang && "pasang tinggi di pesisir"].filter(Boolean);
    const s0 = n0[2] + n0[3], s1 = n1[2] + n1[3], orang = n => pk.mengungsi.map(x => n * x);
    const per = d => { const a = [0, 0, 0, 0], b = [0, 0, 0, 0]; ks.forEach(k => { a[D[k][this.b][d]]++; b[R[k][this.b][d]]++; }); return [a, b]; };
    const kartu = Object.keys(this.hasilSk).map(id => { const s = SKEN.find(x => x.id === id), r = this.hasilSk[id], n = hit(r), ub = ks.filter(k => this.lv(D, k) !== this.lv(r, k)).length, d = i => n[i] - n0[i];
      return `<button type="button" class="simkartu${id === this.lihat ? " on" : ""}" data-lihat="${id}" style="--w:${s.w}"><b>${s.n}</b>
        <table class="simangka"><tr><td>Awas</td><td>Siaga</td><td>Waspada</td></tr><tr>${[3, 2, 1].map(i => `<td>${fmt(n[i])}${id === "dasar" ? "" : `<small>${d(i) >= 0 ? "+" : ""}${fmt(d(i))}</small>`}</td>`).join("")}</tr></table>
        <span class="fnd">${id === "dasar" ? "Status prakiraan" : `${fmt(ub)} kecamatan berubah status`}</span></button>`; }).join("");
    return `<span class="pill l3">Model, belum divalidasi</span>
      <div class="simringkas"><div class="lbl"><span>Ringkasan</span> · <span>${SKEN.find(x => x.id === this.lihat).n}</span></div>
      <p>${!bag.length ? `Ini status prakiraan ${nm} ${hariT}: ${fmt(s0)} kecamatan Siaga atau Awas di ${wil}.` :
        `Bila ${bag.join(", ")}, kecamatan Siaga atau Awas ${nm} di ${wil} ${s1 === s0 ? `tetap <b>${fmt(s0)}</b>` : `${s1 > s0 ? "naik" : "turun"} dari <b>${fmt(s0)}</b> menjadi <b>${fmt(s1)}</b>`} ${hariT}.
        ${berubah.length ? `${fmt(berubah.length)} kecamatan berubah status, terbanyak di ${esc(kabTop[0])} (${fmt(kabTop[1])}).` : "Tidak ada kecamatan yang berubah status."}
        ${kb1 ? `${fmt(kb1)} kabupaten/kota perlu menyiapkan posko (prakiraan: ${fmt(kb0)}).` : ""}`}</p>
</div>
      <div class="simkartu-daftar">${kartu}</div>
      <div class="lbl" style="margin-top:12px"><span>Kecamatan yang berubah status</span> · <span>${SKEN.find(x => x.id === this.lihat).n}</span></div>
      ${!berubah.length ? `<p class="fnd">Belum ada perubahan.</p>` : `<table class="tb3" style="margin-top:4px"><thead><tr><th>Kecamatan</th><th>Prakiraan → skenario</th><th class="n">Hujan 3h</th></tr></thead><tbody>
      ${berubah.slice(0, 30).map(x => { const d = D[x.k], r = R[x.k], sebab = [r.h3 !== d.h3 && `hujan ${fmt(d.h3)}→${fmt(r.h3)} mm`, r.rk !== d.rk && r.rk >= 0 && `sungai kelas ${r.rk}`, r.a7 !== d.a7 && "tanah jenuh", this.b === "b" && u.pasang && this.kec[x.k].pantai && "pesisir saat pasang"].filter(Boolean).join(", ");
        return `<tr><td>${esc(x.c.nama)}<small>${esc(x.c.kab)} · bahaya ${nm} ${fmt(this.b === "b" ? x.c.bb : x.c.bl)}</small></td><td>${pill(x.a)} → ${pill(x.z)}<small>${sebab}</small></td><td class="n num">${fmt(r.h3)}</td></tr>`; }).join("")}</tbody></table>
      ${berubah.length > 30 ? `<p class="fnd">${fmt(30)} dari ${fmt(berubah.length)}</p>` : ""}`}
      <div class="lbl" style="margin-top:12px">Per hari: prakiraan → skenario</div><table class="tb3" style="margin-top:4px"><thead><tr><th>Hari</th><th class="n">Awas</th><th class="n">Siaga</th><th class="n">Waspada</th></tr></thead><tbody>
        ${S.st.hari.map((t, d) => { const [a, b] = per(d); return `<tr><td>${tglPendek(t)}</td>${[3, 2, 1].map(i => `<td class="n num">${fmt(a[i])} → <b>${fmt(b[i])}</b></td>`).join("")}</tr>`; }).join("")}</tbody></table>
      <div class="lbl" style="margin-top:12px">Perkiraan orang terpapar <span class="pill l3" style="height:17px;font-size:9.5px">asumsi</span></div>
      <table class="tb2" style="margin-top:4px"><tbody>
        <tr><td>Kabupaten/kota dengan kecamatan Siaga/Awas</td><td class="n">${fmt(kb0)} → ${fmt(kb1)}</td></tr>
        <tr><td>Pengungsi per kejadian (median, P25–P75)</td><td class="n">${fmt(Math.round(pk.mengungsi[1]))}<small style="display:block;color:var(--ink2);font-weight:500">${fmt(Math.round(pk.mengungsi[0]))}–${fmt(Math.round(pk.mengungsi[2]))}</small></td></tr>
        <tr><td>Mengungsi bila tiap kabupaten itu mengalami satu kejadian</td><td class="n">${fmt(Math.round(orang(kb1)[0]))}–${fmt(Math.round(orang(kb1)[2]))}</td></tr>
        <tr><td>Terdampak bila tiap kabupaten itu mengalami satu kejadian</td><td class="n">${fmt(Math.round(kb1 * pk.terdampak[0]))}–${fmt(Math.round(kb1 * pk.terdampak[2]))}</td></tr></tbody></table>
      ${(() => { const v = this.val?.[this.b === "b" ? "banjir" : "longsor"]?.waspada; return v ? `<p class="fnd" style="margin-top:6px">Sebagian besar peringatan tidak diikuti kejadian: ${fmt(Math.round(v.far * 100))} % status Waspada ${nm} tanpa kejadian tercatat (uji balik ${esc(this.val.periode_uji)}).</p>` : ""; })()}
      <p class="fnd" style="margin-top:8px"><b>Uji:</b> ${fmt(this.cek.n - this.cek.beda.length)} dari ${fmt(this.cek.n)} kecamatan sama dengan status.json</p>
      <button class="btn sec" id="simUtama" style="margin-top:8px;width:100%">Tampilkan di peta utama</button>`; },
  /* peta penuh halaman: kecamatan provinsi/kabupaten terpilih, warna = level skenario yang dilihat, garis tebal = berubah dari prakiraan */
  async peta2(terbang) {
    if (this.mode !== "status") return;
    const R = this.hasil, fc = {type: "FeatureCollection", features: (S.geo.kec[this.kode]?.features || []).filter(f => !this.kab || f.properties.kab === this.kab).map((f, i) => {
      const k = `${this.kode}|${f.properties.kab}|${f.properties.kec}`, a = this.lv(this.dasar, k), z = this.lv(R, k);
      return {type: "Feature", geometry: f.geometry, properties: {i, k, nama: f.properties.kec, kab: f.properties.kab, lv: z, lv0: a, beda: a !== z ? 1 : 0}}; })};
    this._fc = fc; /* peta yang masih memuat memakai data terbaru begitu siap */
    if (!this.peta || !document.body.contains(this.peta.getContainer())) {
      this.peta = new maplibregl.Map({container: "simPeta", style: DASAR(), center: [118, -2.4], zoom: 4, attributionControl: {compact: true}, dragRotate: false});
      this.peta.touchZoomRotate.disableRotation(); this.peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
      await new Promise(r => this.peta.once("load", r));
      this.peta.addSource("sm", {type: "geojson", data: this._fc});
      this.peta.addLayer({id: "sm-fill", type: "fill", source: "sm", paint: {"fill-color": ["match", ["get", "lv"], 3, WARNA_LV[3], 2, WARNA_LV[2], 1, WARNA_LV[1], WARNA_LV[0]], "fill-opacity": ["match", ["get", "lv"], 0, .12, .6]}});
      this.peta.addLayer({id: "sm-line", type: "line", source: "sm", paint: {"line-color": ["case", ["==", ["get", "beda"], 1], gelap() ? "#ffffff" : "#0b2545", gelap() ? "#9fb3d1" : "#1d4e89"], "line-width": ["case", ["==", ["get", "beda"], 1], 2.2, .4], "line-opacity": ["case", ["==", ["get", "beda"], 1], 1, .5]}});
      const tip = $("#tip");
      this.peta.on("mousemove", "sm-fill", e => { const p = e.features[0].properties; this.peta.getCanvas().style.cursor = "pointer";
        tip.innerHTML = `<b>${esc(p.nama)}</b><br>${esc(p.kab)}<br>Prakiraan ${LEVEL[p.lv0]} → skenario <b>${LEVEL[p.lv]}</b>`; tip.classList.add("on");
        tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; tip.style.top = Math.max(8, e.originalEvent.clientY - tip.offsetHeight - 12) + "px"; });
      this.peta.on("mouseleave", "sm-fill", () => { this.peta.getCanvas().style.cursor = ""; tip.classList.remove("on"); });
      terbang = true; }
    else if (!this.peta.getSource("sm")) return;
    else this.peta.getSource("sm").setData(fc);
    if (this.mode !== "status") return; /* pindah ke Genangan 3D selagi peta memuat: wadah tersembunyi, jangan fitBounds */
    this.peta.resize();
    if (terbang && this._fc.features.length) { const hp = innerWidth <= 900; this.peta.fitBounds(kotak(this._fc.features), {padding: hp ? {top: 20, left: 20, right: 20, bottom: innerHeight * .5} : {top: 30, left: 420, right: 60, bottom: 100}, duration: 0}); } },
};
