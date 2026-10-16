"use strict";
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
const Simulasi = {
  prov: "32", kab: "", b: "b", hari: "maks", x: 1, ekstrem: 0, jenuh: false, pasang: false, sungai: 0,
  kec: null, kode: null, dasar: null, hasil: null, aktif: false, peta: null, JENUH: 200, PANTAI_KM: 15,
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
  skenario() { return {x: this.x, ekstrem: this.ekstrem, jenuh: this.jenuh, pasang: this.pasang, sungai: this.sungai}; },
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
  render() {
    const el = $("#simulasi");
    if (!S.st || !S.hujan) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat data…</div>`; return; }
    if (!el.querySelector("#simIsi")) {
      el.innerHTML = `<div class="head"><div><h2>Simulasi skenario</h2><p>Ubah hujan, tanah, sungai, atau pasang, lalu lihat status kecamatan 4 hari ke depan berubah. Aturannya sama persis dengan status di peta.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="smProv" class="btn sec" aria-label="Provinsi">${Object.entries(S.meta.provinsi).map(([k, n]) => `<option value="${k}" ${k === this.prov ? "selected" : ""}>${esc(n)}</option>`).join("")}</select>
        <select id="smKab" class="btn sec" aria-label="Kabupaten"></select>
        <div class="seg" id="smB">${[["b", "Banjir"], ["l", "Longsor"]].map(([v, n]) => `<button data-v="${v}" aria-pressed="${this.b === v}">${n}</button>`).join("")}</div></div></div>
      <div class="card pad sm-atur" style="margin-bottom:14px">
        <div><span class="lbl">Hujan prakiraan</span><div class="seg" data-sm="x">${[[1, "Prakiraan"], [1.5, "+50%"], [2, "×2"]].map(([v, n]) => `<button data-v="${v}" aria-pressed="${this.x === v}">${n}</button>`).join("")}</div></div>
        <label><span class="lbl">Hujan 3 hari ekstrem (mm, 0 = mati)</span><input type="number" min="0" step="10" data-sm="ekstrem" value="${this.ekstrem}"></label>
        <div><span class="lbl">Sungai</span><div class="seg" data-sm="sungai">${[[0, "Prakiraan"], [2, "Meluap Q5"], [3, "Meluap Q20"]].map(([v, n]) => `<button data-v="${v}" aria-pressed="${this.sungai === v}">${n}</button>`).join("")}</div></div>
        <label class="sm-cek"><input type="checkbox" data-sm="jenuh" ${this.jenuh ? "checked" : ""}> Tanah jenuh (hujan 7 hari ≥ ${this.JENUH} mm)</label>
        <label class="sm-cek"><input type="checkbox" data-sm="pasang" ${this.pasang ? "checked" : ""}> Pasang tinggi + hujan di pesisir</label>
        <div><span class="lbl">Hari</span><div class="seg" id="smHari">${[["maks", "4 hari"], ...S.st.hari.map((t, i) => [i, tglPendek(t)])].map(([v, n]) => `<button data-v="${v}" aria-pressed="${String(this.hari) === String(v)}">${n}</button>`).join("")}</div></div></div>
      <div id="simIsi"></div>
      <div class="grid g2" style="margin-bottom:14px"><div class="card sm-peta"><div id="smPeta" role="img" aria-label="Peta status kecamatan skenario"></div>
        <div class="sm-leg">${LEVEL.map((n, i) => `<span><i style="background:${WARNA_LV[i]}"></i>${n}</span>`).join("")}<span><i style="background:none;border:2px solid var(--ink)"></i>berubah</span>
        <button class="btn sec" id="smUtama" style="margin-left:auto">Tampilkan di peta utama</button></div></div>
        <div class="card pad" id="simDaftar" style="max-height:470px;overflow:auto"></div></div>
      <div id="simBawah"></div>`;
      $("#smProv").onchange = e => { this.prov = e.target.value; this.kab = ""; this.hitungUlang(true); };
      $("#smKab").onchange = e => { this.kab = e.target.value; this.hitungUlang(true); };
      el.querySelectorAll(".seg").forEach(s => s.onclick = e => { const b = e.target.closest("button"); if (!b) return; s.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); const v = b.dataset.v;
        if (s.id === "smB") this.b = v; else if (s.id === "smHari") this.hari = v === "maks" ? v : +v; else this[s.dataset.sm] = +v; this.hitungUlang(); });
      el.querySelectorAll("input[data-sm]").forEach(i => i.onchange = () => { this[i.dataset.sm] = i.type === "checkbox" ? i.checked : Math.max(0, +i.value || 0); this.hitungUlang(); });
      $("#smUtama").onclick = () => this.keUtama(); }
    this.hitungUlang(true); },
  async hitungUlang(terbang) {
    if (this.kode !== this.prov) { $("#simIsi").innerHTML = `<div class="kosong"><div class="spin"></div>Menyiapkan kecamatan…</div>`; await this.siapkan(this.prov);
      $("#smKab").innerHTML = `<option value="">Semua kabupaten/kota</option>` + [...new Set(Object.values(this.kec).map(c => c.kab))].sort().map(k => `<option ${k === this.kab ? "selected" : ""}>${esc(k)}</option>`).join(""); }
    const u = this.skenario(), adaSk = u.x !== 1 || u.ekstrem || u.jenuh || u.pasang || u.sungai;
    this.hasil = adaSk ? this.hitung(u) : this.dasar;
    const ks = this.kunciLihat(), D = this.dasar, R = this.hasil, nm = this.b === "b" ? "banjir" : "longsor";
    const hit = r => { const n = [0, 0, 0, 0]; ks.forEach(k => n[this.lv(r, k)]++); return n; }, n0 = hit(D), n1 = hit(R);
    const berubah = ks.filter(k => this.lv(D, k) !== this.lv(R, k)).map(k => ({k, c: this.kec[k], a: this.lv(D, k), z: this.lv(R, k)})).sort((x, y) => y.z - x.z || (y.z - y.a) - (x.z - x.a) || x.c.nama.localeCompare(y.c.nama));
    const perKab = {}; berubah.forEach(x => perKab[x.c.kab] = (perKab[x.c.kab] || 0) + 1); const kabTop = Object.entries(perKab).sort((a, b) => b[1] - a[1])[0];
    const kabSiaga = r => new Set(ks.filter(k => this.lv(r, k) >= 2).map(k => this.kec[k].kab)).size, kb0 = kabSiaga(D), kb1 = kabSiaga(R);
    const pk = this.perKejadian(), wil = this.kab ? esc(this.kab) : esc(namaProv(this.kode)), hariT = this.hari === "maks" ? "dalam 4 hari ke depan" : "pada " + tglPendek(S.st.hari[this.hari]);
    const bag = [u.x !== 1 && `hujan ${u.x === 2 ? "dua kali" : "50% di atas"} prakiraan`, u.ekstrem && `hujan 3 hari minimal ${fmt(u.ekstrem)} mm`, u.jenuh && "tanah sudah jenuh",
      u.sungai && `sungai mencapai debit ${u.sungai === 3 ? "Q20 (sekali dalam 20 tahun)" : "Q5 (sekali dalam 5 tahun)"}`, u.pasang && "pasang tinggi di pesisir"].filter(Boolean);
    const s0 = n0[2] + n0[3], s1 = n1[2] + n1[3], orang = n => pk.mengungsi.map(x => n * x);
    const catatan = [u.jenuh && this.b === "b" && "Aturan banjir tidak memakai hujan 7 hari sebelumnya, jadi tanah jenuh hanya mengubah status longsor.",
      u.sungai && this.b === "l" && "Aturan longsor tidak memakai debit sungai.", u.pasang && this.b === "l" && "Pasang tinggi hanya memengaruhi status banjir.",
      u.sungai && `Sungai hanya mengubah ${fmt(ks.filter(k => this.kec[k].sg != null).length)} dari ${fmt(ks.length)} kecamatan: yang punya titik sungai GloFAS dalam 25 km.`,
      u.pasang && `${fmt(ks.filter(k => this.kec[k].pantai).length)} kecamatan dianggap pesisir.`].filter(Boolean);
    $("#simIsi").innerHTML = `<div class="card pad" style="margin-bottom:14px;border-left:4px solid var(--brand2)"><div class="lbl">Ringkasan</div>
      <p style="margin:6px 0 0;font-size:14px;line-height:1.55">${!bag.length ? `Ini status prakiraan ${nm} ${hariT}: ${fmt(s0)} kecamatan Siaga atau Awas di ${wil}. Pilih skenario di atas untuk melihat perubahannya.` :
        `Bila ${bag.join(", ")}, kecamatan Siaga atau Awas ${nm} di ${wil} ${s1 === s0 ? `tetap <b>${fmt(s0)}</b>` : `${s1 > s0 ? "naik" : "turun"} dari <b>${fmt(s0)}</b> menjadi <b>${fmt(s1)}</b>`} ${hariT}.
        ${berubah.length ? `${fmt(berubah.length)} kecamatan berubah status, terbanyak di ${esc(kabTop[0])} (${fmt(kabTop[1])}).` : "Tidak ada kecamatan yang berubah status."}
        ${kb1 ? `${fmt(kb1)} kabupaten/kota perlu menyiapkan posko (prakiraan: ${fmt(kb0)}). Bila tiap kabupaten mengalami satu kejadian seukuran yang biasa di provinsi ini, kira-kira <b>${rb(orang(kb1)[0])}–${rb(orang(kb1)[2])}</b> orang mengungsi.` : ""}`}</p>
      ${catatan.length ? `<p class="fnd" style="margin-top:6px">${catatan.join(" ")}</p>` : ""}</div>
      <div class="grid g4" style="margin-bottom:14px">${[[3, "Awas"], [2, "Siaga"], [1, "Waspada"]].map(([i, n]) => kot(`Kecamatan ${n}`, fmt(n1[i]), `prakiraan ${fmt(n0[i])} · ${n1[i] - n0[i] >= 0 ? "+" : ""}${fmt(n1[i] - n0[i])}`)).join("")}
        ${kot("Kabupaten Siaga/Awas", fmt(kb1), `prakiraan ${fmt(kb0)}`)}</div>`;
    $("#simDaftar").innerHTML = `<h3 style="font-size:15px">Kecamatan yang berubah status</h3>${!berubah.length ? `<p class="fnd" style="margin-top:6px">Belum ada perubahan.</p>` :
      `<table class="tb3" style="margin-top:6px"><thead><tr><th>Kecamatan</th><th>Prakiraan → skenario</th><th class="n">Hujan 3h</th></tr></thead><tbody>
      ${berubah.slice(0, 200).map(x => { const d = D[x.k], r = R[x.k], sebab = [r.h3 !== d.h3 && `hujan ${fmt(d.h3)}→${fmt(r.h3)} mm`, r.rk !== d.rk && r.rk >= 0 && `sungai kelas ${r.rk}`, r.a7 !== d.a7 && `tanah jenuh`,
          this.b === "b" && u.pasang && this.kec[x.k].pantai && "pesisir saat pasang"].filter(Boolean).join(", ");
        return `<tr><td>${esc(x.c.nama)}<small>${esc(x.c.kab)} · bahaya ${nm} ${fmt(this.b === "b" ? x.c.bb : x.c.bl)}</small></td><td>${pill(x.a)} → ${pill(x.z)}<small>${sebab}</small></td><td class="n num">${fmt(r.h3)}</td></tr>`; }).join("")}</tbody></table>
      ${berubah.length > 200 ? `<p class="fnd">200 dari ${fmt(berubah.length)} ditampilkan.</p>` : ""}`}`;
    const per = d => { const a = [0, 0, 0, 0], b = [0, 0, 0, 0]; ks.forEach(k => { a[D[k][this.b][d]]++; b[R[k][this.b][d]]++; }); return [a, b]; };
    $("#simBawah").innerHTML = `<div class="grid g2" style="margin-bottom:14px">
      <div class="card pad"><h3 style="font-size:15px">Per hari: prakiraan → skenario</h3><table class="tb3" style="margin-top:6px"><thead><tr><th>Hari</th><th class="n">Awas</th><th class="n">Siaga</th><th class="n">Waspada</th></tr></thead><tbody>
        ${S.st.hari.map((t, d) => { const [a, b] = per(d); return `<tr><td>${tglPendek(t)}</td>${[3, 2, 1].map(i => `<td class="n num">${fmt(a[i])} → <b>${fmt(b[i])}</b></td>`).join("")}</tr>`; }).join("")}</tbody></table>
        <p class="fnd" style="margin-top:8px">${fmt(ks.length)} kecamatan di ${wil}. H3 = jumlah prakiraan hujan 3 hari mulai hari itu.</p></div>
      <div class="card pad"><h3 style="font-size:15px">Perkiraan orang terpapar <span class="pill l3" style="height:17px;font-size:9.5px">asumsi</span></h3>
        <table class="tb2" style="margin-top:6px"><tbody>
          <tr><td>Kabupaten/kota dengan kecamatan Siaga/Awas</td><td class="n">${fmt(kb0)} → ${fmt(kb1)}</td></tr>
          <tr><td>Pengungsi per kejadian (median, P25–P75 antartahun)</td><td class="n">${rb(pk.mengungsi[1])}<small style="display:block;color:var(--ink2);font-weight:500">${rb(pk.mengungsi[0])}–${rb(pk.mengungsi[2])}</small></td></tr>
          <tr><td>Perkiraan mengungsi, skenario</td><td class="n">${rb(orang(kb1)[0])}–${rb(orang(kb1)[2])}</td></tr>
          <tr><td>Perkiraan terdampak, skenario</td><td class="n">${rb(kb1 * pk.terdampak[0])}–${rb(kb1 * pk.terdampak[2])}</td></tr></tbody></table>
        <p class="fnd" style="margin-top:8px">Tidak ada data penduduk per kecamatan di halaman ini. Asumsinya: tiap kabupaten dengan kecamatan Siaga/Awas mengalami satu kejadian ${nm}, dan dampaknya seperti rata-rata kejadian ${nm} di ${esc(namaProv(this.kode))} 2008–2025 (DIBI mencatat kejadian per kabupaten). Angka ini untuk menyiapkan skala logistik, bukan ramalan korban.</p></div></div>
      ${lipat("Cara hitung dan uji", `<p style="margin:0;font-size:13px">Status dihitung ulang di peramban dengan aturan yang sama dengan pembuat status harian (scripts/banjir/status.py): banjir Awas bila sungai ≥ Q20 atau H3 ≥ 120 mm dan bahaya ≥ 0,66; Siaga bila sungai ≥ Q5, atau bahaya ≥ 0,33 dan (H3 ≥ 80 mm, hujan per jam ≥ 30 mm, atau peluang ansambel 3 hari ≥ 100 mm ≥ 50%); Waspada bila sungai ≥ Q2, H3 ≥ 40 mm, atau hujan per jam ≥ 20 mm (H3 = hujan sehari sebelum s.d. sehari sesudah). Longsor memakai H3 (ambang 30/60/90 mm), kejenuhan tanah (kelembapan 3–27 cm ≥ 0,45 dan hujan 7 hari ≥ 25 mm, atau hujan 7 hari ≥ 150 mm bila kelembapan tidak ada), hujan per jam, dan bahaya longsor InaRISK. Jalur yang datanya belum ada di berkas hari ini tidak dipakai.</p>
        <p style="margin:0;font-size:13px"><b>Uji:</b> tanpa skenario, ${fmt(this.cek.n - this.cek.beda.length)} dari ${fmt(this.cek.n)} kecamatan ${esc(namaProv(this.kode))} sama persis dengan status.json${this.cek.beda.length ? ` (berbeda: ${esc(this.cek.beda.slice(0, 5).map(k => k.split("|")[2]).join(", "))}${this.cek.beda.length > 5 ? ", …" : ""})` : ""}${this.cek.hilang.length ? `; ${this.cek.hilang.length} kecamatan di status.json tidak ditemukan di peta` : ""}.</p>
        <p style="margin:0;font-size:13px">Pasang tinggi adalah aturan tambahan simulasi (bukan bagian status harian) dan belum diuji terhadap kejadian. Ambang hujan diterapkan pada jumlah 3 hari dan sudah diuji balik terhadap kejadian DIBI 2016-2025 (RISET-UJI-BALIK.md); skenario simulasi sendiri tidak diuji.</p>`, false)}`;
    this.peta2(terbang);
    if (this.aktif) this.lukisPeta(); },
  /* peta kecil di tab: kecamatan provinsi/kabupaten terpilih, warna = level skenario, garis tebal = berubah */
  async peta2(terbang) {
    const fc = {type: "FeatureCollection", features: (S.geo.kec[this.kode]?.features || []).filter(f => !this.kab || f.properties.kab === this.kab).map((f, i) => {
      const k = `${this.kode}|${f.properties.kab}|${f.properties.kec}`, a = this.lv(this.dasar, k), z = this.lv(this.hasil, k);
      return {type: "Feature", geometry: f.geometry, properties: {i, k, nama: f.properties.kec, kab: f.properties.kab, lv: z, lv0: a, beda: a !== z ? 1 : 0}}; })};
    this._fc = fc; /* peta yang masih memuat memakai data terbaru begitu siap */
    if (!this.peta || !document.body.contains(this.peta.getContainer())) {
      this.peta = new maplibregl.Map({container: "smPeta", style: DASAR(), center: [118, -2.4], zoom: 4, attributionControl: {compact: true}, dragRotate: false});
      this.peta.touchZoomRotate.disableRotation();
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
    this.peta.resize();
    if (terbang && this._fc.features.length) this.peta.fitBounds(kotak(this._fc.features), {padding: 20, duration: 0}); },
};
