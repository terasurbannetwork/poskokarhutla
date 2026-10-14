/* sim_perlakuan.js — mode "Perlakuan" di tab Simulasi.
   Untuk kompleks terpilih: susun calon perlakuan dari sumber nyata (posko, Daops, MPA desa, heli, sekat, OMC, kombinasi),
   jalankan tiap calon lewat sebar() yang sama dengan skenario, lalu urutkan menurut luas yang diselamatkan dalam 72 jam.
   Model, bukan kepastian. Butuh: Sim, sebar, tabelLaju, anggaran, ASUMSI, Kp, S, akses.json, udara_rekom.json.
   Butuh juga satu baris di sebar(): garis kendali boleh berupa fungsi waktu o.garis(t) (beberapa tim tiba di jam berbeda). */
(() => {
if (typeof Sim === "undefined" || typeof sebar !== "function") return;

/* asumsi yang tidak ada di data; semua tertulis di kartu "Asumsi" */
const PKA = {mob: 1, mobHeli: 2, lajuHeli: 180, isiSiram: .06, mSiram: 40, heliGambut: .2, Lmpa: 100, lajuMpa: 15, omcLag: 36, omcMm: 20, omcHari: 3,
  sekatKmJam: 1, pendinginan: 1, topRentang: 3};
const WARNA = {regu: "#5a9e74", mpa: "#2b8c86", heli: "#4f8fc4", sekat: "#e3b94e", omc: "#5f6fb0", kombo: "#3f7fb8"};
const JENIS = {regu: "Regu darat", mpa: "MPA desa", heli: "Water bombing", sekat: "Sekat bakar", omc: "Modifikasi cuaca", kombo: "Gabungan"};
const bulat = (v, d = 0) => fmt(Math.round(v * 10 ** d) / 10 ** d);
const jamT = j => j < 1 ? "< 1 jam" : "± " + fmtJam(j);
const tunggu = () => new Promise(r => setTimeout(r, 0));
const par = (k, i = 0, cad) => Kp.d?.param?.[k]?.[i] ?? cad;

/* garis kendali kumulatif (m) pada jam t dari beberapa tim: Σ P_i × (t − T0_i)⁺ */
const garisTim = tim => t => { let g = 0; for (const x of tim) if (t > x.T0) g += x.P * (t - x.T0); return g; };
const Ptim = x => x.jenis === "heli" ? x.unit * x.Pper : x.regu * x.Pper;

Object.assign(Sim, {
  pk: null,
  async pkData() {
    const [ak, ud, kp] = await Promise.all([this._akses ?? muatJSON("data/akses.json").catch(() => null), Lapis.cache.udara ?? muatJSON("data/udara_rekom.json").catch(() => null),
      Kp.d ?? muatJSON("data/keputusan.json").catch(() => null)]);
    this._akses = ak; if (ud) Lapis.cache.udara = ud; if (kp) Kp.d ||= kp;
    return {ak, ud};
  },

  /* ---------- calon perlakuan dari sumber nyata ---------- */
  pkKandidat(K, B, data) {
    const p = this.f.properties, id = this.k, n = K.n, L = this.op.L, out = [];
    const sel = K.benih.map(k => [k % n + .5, ((k / n) | 0) + .5]), cx = sel.reduce((a, s) => a + s[0], 0) / sel.length, cy = sel.reduce((a, s) => a + s[1], 0) / sel.length;
    const [lon0, lat0] = this.selKeLL(K, [cx, cy]);
    const gambutPorsi = B.luas.mid[72] > 0 ? Math.min(1, B.gambutHa / B.luas.mid[72]) : 0;
    /* regu darat: akses.json (jaringan jalan & sungai OSM), cadangan garis lurus × 1,4 / 40 km/jam */
    const A = data.ak?.[id]?.dari?.filter(x => x.jam != null) || [];
    const sumber = A.map(x => ({nama: x.dari, kode: x.kode, jenis: x.jenis, km: x.km_jalan, jam: x.jam, rute: true}));
    if (!sumber.length) {
      const ps = S.poskoDari?.get(id); if (ps) { const d = km(p.lat, p.lon, ps.lat, ps.lon); sumber.push({nama: `${ps.id} ${ps.nama || ""}`.trim(), kode: ps.id, jenis: "posko", km: d * KELOK, jam: jamDarat(d), rute: false}); }
      for (const d of daopsDekat(p.lat, p.lon, 3)) if (d.jarak <= 400) sumber.push({nama: d.nama, kode: d.kode, jenis: "daops", km: d.jarak * KELOK, jam: jamDarat(d.jarak), rute: false});
    }
    for (const s of sumber) {
      const regu = s.jenis === "daops" ? (S.daops.find(d => d.kode === s.kode)?.regu || 1) : (() => { const x = S.semuaPosko?.get(s.kode); return x?.kompleks ? reguPosko(x) : 1; })();
      const T0 = PKA.mob + s.jam;
      out.push({jenis: "regu", n: s.jenis === "daops" ? `Regu ${s.nama}` : `Regu posko ${s.nama}`, sumber: s,
        sub: `${fmt(regu)} regu · ${bulat(s.km)} km ${s.rute ? "jalan/sungai" : "garis lurus × 1,4"} · tiba ${jamT(T0)}`,
        tim: [{jenis: "regu", n: s.nama, T0, regu, Pper: L}]});
    }
    /* MPA desa terdekat dengan api */
    const ds = K.desa.map(x => ({...x, d: km(lat0, lon0, x.lat, x.lon)})).sort((a, b) => a.d - b.d)[0];
    if (ds && ds.d <= 25) { const T0 = .5 + ds.d * KELOK / PKA.lajuMpa;
      out.push({jenis: "mpa", n: `MPA desa ${ds.nama}`, sub: `1 regu warga · ${bulat(ds.d, 1)} km dari api · tiba ${jamT(T0)}`, tim: [{jenis: "mpa", n: "MPA " + ds.nama, T0, regu: 1, Pper: PKA.Lmpa}]}); }
    /* heli: jarak isi air dari sungai/danau OSM terdekat dengan pusat api (kisi), cadangan asumsi berkas udara */
    let dAir = Infinity; for (let k = 0; k < K.air.length; k++) if (K.air[k]) dAir = Math.min(dAir, Math.hypot(k % n + .5 - cx, ((k / n) | 0) + .5 - cy) * K.d / 1000);
    const airAsumsi = !isFinite(dAir); if (airAsumsi) dAir = data.ud?.asumsi_jarak_air_km ?? 5;
    const siramJam = 1 / (2 * Math.max(.5, dAir) / PKA.lajuHeli + PKA.isiSiram);
    const faktorGb = 1 - (1 - PKA.heliGambut) * gambutPorsi;
    const unik = new Set(), pangkalan = [...(data.ud?.heli || []).filter(h => !unik.has(h.icao || h.nama) && unik.add(h.icao || h.nama)).map(h => ({...h, aju: false, d: km(p.lat, p.lon, h.lat, h.lon)})).sort((a, b) => a.d - b.d).slice(0, 2),
      ...(data.ud?.aju || []).map(h => ({...h, aju: true, d: km(p.lat, p.lon, h.lat, h.lon)})).sort((a, b) => a.d - b.d).slice(0, 1)];
    for (const h of pangkalan) {
      const jamEf = Math.max(0, ASUMSI.heliJamHari - 2 * h.d / PKA.lajuHeli); if (jamEf < .5 || h.d > 500) continue;
      const T0 = PKA.mobHeli + (h.d + (h.aju ? h.ke_utama_km || 0 : 0)) / PKA.lajuHeli;
      out.push({jenis: "heli", n: `Heli dari ${h.aju ? "pangkalan aju " : ""}${h.icao ? h.icao + " " : ""}${h.nama}`, pangkalan: h,
        sub: `1 heli · ${bulat(h.d)} km · tiba ${jamT(T0)} · ± ${bulat(siramJam, 1)} siraman/jam terbang, air ${airAsumsi ? "± " + bulat(dAir) + " km (asumsi)" : bulat(dAir, 1) + " km"}`,
        tim: [{jenis: "heli", n: h.icao || h.nama, T0, unit: 1, Pper: siramJam * PKA.mSiram * jamEf / 24 * faktorGb, jamEf}]});
    }
    /* sekat bakar di sisi hilir angin, dibangun oleh tim tercepat; jarak dipilih supaya selesai sebelum api tiba */
    const cepat = out.filter(c => c.jenis === "regu" || c.jenis === "mpa").sort((a, b) => a.tim[0].T0 - b.tim[0].T0)[0];
    if (cepat) out.push({jenis: "sekat", n: `Sekat bakar ${fmt(this.op.sekatW)} km di hilir angin`, sekat: this.pkSekat(K, B, cepat.tim[0].T0, cepat.tim[0].n), tim: []});
    /* OMC dari bandara OMC terdekat */
    const om = (data.ud?.omc || []).map(o => ({...o, d: km(p.lat, p.lon, o.lat, o.lon)})).sort((a, b) => a.d - b.d)[0];
    if (om) out.push({jenis: "omc", n: `Modifikasi cuaca dari ${om.icao || om.nama}`, omc: {lag: PKA.omcLag, p: par("ef_omc", 0, .05), mm: PKA.omcMm, bandara: om}, tim: []});
    out.forEach((c, i) => { c.id = "pk" + i; c.w = WARNA[c.jenis]; });
    this.pk.gambutPorsi = gambutPorsi;
    return out;
  },
  /* jarak sekat terdekat (km di depan benih terdepan) yang sempat selesai sebelum api prakiraan tiba di garisnya */
  pkSekat(K, B, T0, oleh) {
    const W = B.W, simpan = this.op.sekatD, siap = T0 + this.op.sekatW / PKA.sekatKmJam;
    let pilih = null;
    for (const D of [.5, 1, 2, 3, 5, 8, 12]) {
      this.op.sekatD = D; const g = this.garisSekat(K, W), f = this.fuelDasar0.slice(); this.pasangSekat(K, f, g);
      let tiba = Infinity; for (let k = 0; k < f.length; k++) if (!f[k] && this.fuelDasar0[k]) tiba = Math.min(tiba, B.T[k]);
      if (this.op.sekatManual) { pilih = {D, g, tiba}; break; }
      if (tiba >= siap) { pilih = {D, g, tiba}; break; }
    }
    this.op.sekatD = simpan;
    return pilih ? {...pilih, siap, oleh, ok: pilih.tiba >= siap} : {D: null, siap, oleh, ok: false};
  },

  /* ---------- jalankan satu calon ---------- */
  pkRun(c, mult) {
    const K = this.K, P = this.pk;
    const ok = c.sekat?.ok, fuel = ok ? (c._fuel ||= (() => { const f = this.fuelDasar0.slice(); this.pasangSekat(K, f, c.sekat.g); return f; })()) : this.fuelDasar0;
    const cu = c.omc ? this.pkHujan(c.omc) : P.cu0;
    const tim = c.tim.map(x => ({T0: x.T0, P: Ptim(x)}));
    const o = tim.length ? {P: 1, T0: Math.min(...tim.map(x => x.T0)), garis: garisTim(tim)} : {};
    return {r: sebar(K, cu.tab, fuel, cu.W.hujan, {...o, mult}), fuel, cu};
  },
  pkHujan(om) {
    const kunci = om.lag + "|" + om.mm, P = this.pk; if (P.hujan?.[kunci]) return P.hujan[kunci];
    const s = [this.op.hujanJam, this.op.hujanMm]; this.op.hujanJam = Math.round(om.lag); this.op.hujanMm = om.mm;
    const W = this.cuacaSkenario("hujan"); [this.op.hujanJam, this.op.hujanMm] = s;
    W.utama = this.fuelDasar0[this.K.benih[0]];
    return (P.hujan ||= {})[kunci] = {W, tab: tabelLaju(W, this.f.properties.bui ?? 40)};
  },
  pkUkur(c, r) {
    const K = this.K, P = this.pk, B = P.B, m = r.mid;
    const H = this.ukur(K, {id: c.id, n: c.n, w: c.w}, {mid: m.r, lo: (r.lo || m).r, hi: (r.hi || m).r}, m.cu.W, m.cu.tab, m.fuel, c.sekat?.ok ? c.sekat.g : null);
    if (c.omc) { /* nilai harapan: hujan berhasil dengan peluang p, selain itu sama dengan prakiraan */
      const pp = c.omc.p; for (const k of ["lo", "mid", "hi"]) H.luas[k] = H.luas[k].map((v, h) => B.luas[k][h] + pp * (v - B.luas[k][h]));
      H.gambutHa = B.gambutHa + pp * (H.gambutHa - B.gambutHa); H.tahan = null; }
    const end = H.tahan ?? 72;
    c.H = H; c.rentang = !!(r.lo && r.hi);
    c.selamat = {mid: B.luas.mid[72] - H.luas.mid[72], lo: B.luas.lo[72] - H.luas.lo[72], hi: B.luas.hi[72] - H.luas.hi[72]};
    c.selamat.min = c.rentang ? Math.min(c.selamat.lo, c.selamat.hi, c.selamat.mid) : c.selamat.mid; c.selamat.max = c.rentang ? Math.max(c.selamat.lo, c.selamat.hi, c.selamat.mid) : c.selamat.mid;
    c.desaHindar = c.omc ? Math.round(c.omc.p * (B.desa.length - H.desa.length)) : B.desa.length - H.desa.length;
    c.gambutSelamat = B.gambutHa - H.gambutHa;
    c.T0 = c.tim.length ? Math.min(...c.tim.map(x => x.T0)) : c.sekat ? c.sekat.siap : c.omc.lag;
    c.biaya = this.pkBiaya(c, end);
    c.perJuta = c.biaya > 0 ? c.selamat.mid / (c.biaya / 1e6) : 0;
    return c;
  },
  pkBiaya(c, end) {
    const reguHari = anggaran({tingkat: 2, jenis_posko: "aju", kompleks: ["x"], prioritas: 2, prov: this.f.properties.prov}).harian; /* 1 regu (15 orang) per hari */
    let b = 0; const rinci = [];
    for (const x of c.tim) { const hari = Math.ceil(Math.max(1, end - x.T0) / 24);
      if (x.jenis === "heli") { const jam = x.unit * hari * ASUMSI.heliJamHari; b += jam * ASUMSI.heliJam; rinci.push(`${fmt(jam)} jam terbang × ${rp(ASUMSI.heliJam)}`); }
      else if (x.jenis === "mpa") { const v = x.regu * 15 * (ASUMSI.honorMPA + ASUMSI.konsumsi) * (hari + PKA.pendinginan); b += v; rinci.push(`MPA ${fmt(hari + PKA.pendinginan)} hari ${rp(v)}`); }
      else { const v = x.regu * reguHari * (hari + PKA.pendinginan); b += v; rinci.push(`${fmt(x.regu)} regu × ${fmt(hari + PKA.pendinginan)} hari × ${rp(reguHari)}`); } }
    if (c.sekat?.ok) { const v = this.op.sekatW * par("biaya_sekat", 0, 23e6); b += v; rinci.push(`sekat ${fmt(this.op.sekatW)} km × ${rp(par("biaya_sekat", 0, 23e6))}`); }
    if (c.omc) { const v = PKA.omcHari * ASUMSI.omc; b += v; rinci.push(`OMC ${PKA.omcHari} hari × ${rp(ASUMSI.omc)}`); }
    c.biayaRinci = rinci; return b;
  },
  pkGabung(n, cs) {
    const c = {jenis: "kombo", n, tim: cs.flatMap(x => x.tim.map(t => ({...t}))), sekat: cs.find(x => x.sekat?.ok)?.sekat || null, dari: cs.map(x => x.id)};
    c.sub = cs.map(x => x.n).join(" + "); return c;
  },

  /* ---------- alur utama ---------- */
  async pkJalan() {
    const id = this.k, btn = $("#pkJalan"), bar = $("#pkProg"), st = $("#pkStatus");
    const langkah = async (t, f) => { if (this.k !== id) throw new Error("batal"); st.textContent = t; if (f != null) bar.firstElementChild.style.width = Math.round(f * 100) + "%"; await tunggu(); if (this.k !== id) throw new Error("batal"); };
    btn.disabled = true; bar.hidden = false; const t0 = performance.now();
    try {
      await langkah("Memuat lahan, cuaca, akses regu, pangkalan udara…", .02);
      const [K, , data] = await Promise.all([this.siapkan(), this.cuacaJam(), this.pkData()]);
      const p = this.f.properties, P = this.pk = {id, hujan: {}}, fuel0 = this.fuelDasar0 = this.bahan(K);
      const W0 = this.cuacaSkenario("dasar"); W0.utama = fuel0[K.benih[0]];
      P.cu0 = {W: W0, tab: tabelLaju(W0, p.bui ?? 40)};
      await langkah("Mengkalibrasi laju ke pertumbuhan teramati…", .05);
      const kal = this.kal = this.kalibrasi(K, fuel0, W0, P.cu0.tab); P.kal = kal;
      const dasar = {r: sebar(K, P.cu0.tab, fuel0, W0.hujan, {mult: kal.m}), fuel: fuel0, cu: P.cu0};
      P.B = this.ukur(K, SKEN[0], {mid: dasar.r, lo: dasar.r, hi: dasar.r}, W0, P.cu0.tab, fuel0, null);
      const C = P.C = this.pkKandidat(K, P.B, data);
      const total = C.length + 3 + 2 * (PKA.topRentang + 1); let ke = 1;
      for (const c of C) { await langkah(`Menguji ${c.n}…`, ++ke / total); this.pkUkur(c, {mid: c._mid = this.pkRun(c, kal.m)}); }
      /* gabungan dari calon tunggal terbaik */
      const terbaik = j => C.filter(c => c.jenis === j).sort((a, b) => b.selamat.mid - a.selamat.mid || a.T0 - b.T0)[0];
      const rg = terbaik("regu") || terbaik("mpa"), hl = terbaik("heli"), sk = C.find(c => c.jenis === "sekat" && c.sekat.ok);
      const darat = C.filter(c => c.jenis === "regu" || c.jenis === "mpa");
      const G = [rg && hl && this.pkGabung(`${rg.n} + ${hl.n}`, [rg, hl]), rg && sk && this.pkGabung(`${rg.n} + sekat bakar`, [rg, sk]),
        darat.length && this.pkGabung("Semua sumber: seluruh regu darat" + (hl ? " + heli" : "") + (sk ? " + sekat" : ""), [...darat, hl, sk].filter(Boolean))].filter(Boolean);
      G.forEach((c, i) => { c.id = "pkg" + i; c.w = WARNA.kombo; C.push(c); });
      for (const c of G) { await langkah(`Menguji gabungan ${c.n}…`, ++ke / total); this.pkUkur(c, {mid: c._mid = this.pkRun(c, kal.m)}); }
      this.pkUrut();
      /* rentang laju ±20% untuk prakiraan dan calon teratas */
      await langkah("Menghitung rentang (laju api ±20%)…", ++ke / total);
      const dlo = sebar(K, P.cu0.tab, fuel0, W0.hujan, {mult: kal.m * .8}), dhi = sebar(K, P.cu0.tab, fuel0, W0.hujan, {mult: kal.m * 1.2});
      P.B = this.ukur(K, SKEN[0], {mid: dasar.r, lo: dlo, hi: dhi}, W0, P.cu0.tab, fuel0, null);
      for (const c of P.C.slice(0, PKA.topRentang)) { await langkah(`Rentang ${c.n}…`, (ke += 2) / total); await this.pkRentang(c); }
      this.pkUrut(); P.ms = performance.now() - t0;
      st.textContent = `${C.length} perlakuan diuji dalam ${(P.ms / 1000).toFixed(1).replace(".", ",")} detik · cuaca ${this.cuaca.sumber}`;
      this.pkLihat(P.C[0].id, false);
      this.pkRender();
    } catch (e) { if (e.message !== "batal") { console.error(e); st.textContent = "Uji perlakuan gagal: " + e.message; } }
    if (btn.isConnected) { btn.disabled = false; btn.textContent = "Uji ulang semua perlakuan"; } bar.hidden = true;
  },
  async pkRentang(c) {
    const m = this.pk.kal.m, mid = c._mid = c._mid || this.pkRun(c, m);
    this.pkUkur(c, {mid, lo: this.pkRun(c, m * .8), hi: this.pkRun(c, m * 1.2)});
  },
  pkUrut() {
    const C = this.pk.C;
    /* lebih banyak diselamatkan dulu; seri → tiba lebih cepat → lebih murah. Daops lebih jauh dengan regu sama tidak bisa menang. */
    C.sort((a, b) => (b.selamat.mid - a.selamat.mid) || (a.T0 - b.T0) || (a.biaya - b.biaya));
  },

  /* ---------- tampilkan di peta ---------- */
  pkLihat(cid, render = true) {
    const P = this.pk, c = P?.C.find(x => x.id === cid); if (!c) return;
    P.pilih = cid;
    if (!this.hasil) this.hasil = {dasar: P.B};
    for (const k of Object.keys(this.hasil)) if (k.startsWith("pk")) delete this.hasil[k];
    this.hasil[cid] = c.H; this.lihat = cid; this.fuelDasar = this.fuelDasar0;
    const s = $("#simT"); if (s && +s.value < 24) s.value = 72;
    this.pasangLapis(); $("#simWaktu").hidden = false; this.waktu(+$("#simT").value, false);
    if (render) this.pkRender();
  },

  /* ---------- panel ---------- */
  pkPanel() {
    const box = document.createElement("section"); box.className = "pk"; box.id = "pkBox";
    const P = this.pk?.id === this.k ? this.pk : null;
    Sim._dl ||= S.kluster.features.filter(f => f.properties.level >= 1).slice(0, 2500).map(f => `<option value="${f.properties.id} · ${esc(f.properties.kec)}, ${esc(f.properties.kab)}">`).join("");
    box.innerHTML = `<div class="pk-kepala"><span class="lbl">Perlakuan</span><h3>Apa yang paling efektif untuk ${esc(this.k)}?</h3>
      <p class="fnd">Menguji regu dari posko dan Daops terdekat, MPA desa, helikopter water bombing, sekat bakar, modifikasi cuaca, dan gabungannya, memakai waktu tempuh dan jumlah regu dari data. Pilih kompleks lain lewat daftar di atas, kotak cari, atau klik titik kompleks di peta.</p></div>
      <label class="fld"><span class="lbl">Cari kompleks (ID atau kecamatan)</span><input id="pkCari" list="pkDaftar" placeholder="mis. K0039 atau Katingan" autocomplete="off"></label><datalist id="pkDaftar">${Sim._dl}</datalist>
      <button class="btn pri" id="pkJalan" style="width:100%">${P ? "Uji ulang semua perlakuan" : "Uji semua perlakuan"}</button>
      <div class="simprog" id="pkProg" hidden><i></i></div><p class="fnd" id="pkStatus" aria-live="polite">${P ? `${P.C.length} perlakuan diuji · cuaca ${esc(this.cuaca?.sumber || "")}` : ""}</p>
      <div id="pkHasil"></div>`;
    $("#simPanel").appendChild(box);
    const cari = $("#pkCari"); cari.onchange = () => { const m = cari.value.trim().match(/^K\d+/i); if (!m) return; const id = m[0].toUpperCase();
      if (!S.kluster.features.some(f => f.properties.id === id)) return toast(`Kompleks ${id} tidak ditemukan`); this.pilih(id); };
    $("#pkJalan").onclick = () => { $("#pkJalan").textContent = "Menghitung…"; $("#pkJalan").disabled = true; nanti(() => this.pkJalan()); };
    if (P) this.pkRender();
  },
  pkRender() {
    const P = this.pk, el = $("#pkHasil"); if (!P || !el || P.id !== this.k) return;
    const C = P.C, B = P.B, b72 = B.luas.mid[72], best = C[0], pc = v => b72 > 0 ? Math.round(v / b72 * 100) : 0;
    const efisien = C.filter(c => c.selamat.mid >= Math.max(1, .25 * best.selamat.mid) && c.biaya > 0).sort((a, b) => b.perJuta - a.perJuta)[0];
    const pilih = C.find(c => c.id === P.pilih) || best, tunggal = C.find(c => c.jenis !== "kombo");
    const tahanT = c => c.H.tahan != null ? `tertahan jam ke-${bulat(c.H.tahan)}` : c.omc ? "tidak menahan, hanya mengurangi" : "belum tertahan dalam 72 jam";
    const nyata = best.selamat.mid >= Math.max(5, .02 * b72);
    const sumberTeks = c => c.jenis === "kombo" ? c.tim.map(t => `${t.jenis === "heli" ? "heli " + esc(t.n) : t.jenis === "mpa" ? esc(t.n) : "regu " + esc(t.n)} (tiba ${jamT(t.T0)})`).join(" + ") + (c.sekat?.ok ? " + sekat bakar" : "")
      : c.tim.length ? `${esc(c.n)} (tiba ${jamT(c.T0)})` : esc(c.n);
    const rek = nyata ? `<p><b>Untuk ${esc(this.k)}, perlakuan paling efektif:</b> ${sumberTeks(best)}; ${tahanT(best)}, menyelamatkan ± <b>${bulat(best.selamat.mid)} ha</b> (${pc(best.selamat.mid)}% dari luas 72 jam tanpa pemadaman${best.rentang ? `, rentang ${bulat(best.selamat.min)}–${bulat(best.selamat.max)} ha` : ""}), biaya ± <b>${rp(best.biaya)}</b>.</p>
        ${best.jenis === "kombo" && tunggal && tunggal.selamat.mid > 0 ? `<p><b>Bila hanya bisa mengirim satu sumber:</b> ${sumberTeks(tunggal)}; ${tahanT(tunggal)}, ± ${bulat(tunggal.selamat.mid)} ha (${pc(tunggal.selamat.mid)}%), ± ${rp(tunggal.biaya)}.</p>` : ""}
        ${efisien && efisien !== best ?`<p><b>Yang paling hemat:</b> ${sumberTeks(efisien)}: ± ${bulat(efisien.selamat.mid)} ha dengan ± ${rp(efisien.biaya)} (${bulat(efisien.perJuta, 1)} ha per Rp1 jt, terbaik ${bulat(best.perJuta, 1)}).</p>` : efisien === best ? `<p>Pilihan ini juga yang paling hemat per rupiah.</p>` : ""}
        ${best.desaHindar > 0 ? `<p>${fmt(best.desaHindar)} titik desa tidak lagi tercapai api dalam 72 jam.</p>` : ""}${best.gambutSelamat >= 1 ? `<p>Gambut terselamatkan ± ${bulat(best.gambutSelamat)} ha.</p>` : ""}`
      : `<p><b>Untuk ${esc(this.k)}, tidak ada perlakuan yang mengubah luas 72 jam secara berarti</b> (terbaik ± ${bulat(best.selamat.mid)} ha dari ${bulat(b72)} ha). ${b72 - B.luas.mid[0] < 20 ? "Api diperkirakan hampir tidak menjalar di cuaca ini; patroli dan pendinginan cukup." : "Sumber terdekat tiba setelah api terlalu besar; pertimbangkan pos aju lebih dekat."}</p>`;
    const mx = Math.max(1, ...C.map(c => c.selamat.max)), X = v => 140 + Math.max(0, v) / mx * 190, rh = 20;
    const grafik = `<svg class="pk-bar" viewBox="0 0 340 ${C.length * rh + 18}" role="img" aria-label="Luas diselamatkan per perlakuan, ha">
      ${C.map((c, i) => { const y = i * rh + 4, w = Math.max(1, X(c.selamat.mid) - 140);
        return `<g data-pk="${c.id}" class="${c.id === pilih.id ? "on" : ""}"><text x="136" y="${y + 11}" text-anchor="end">${esc(c.n.length > 26 ? c.n.slice(0, 25) + "…" : c.n)}</text>
        <rect x="140" y="${y + 2}" width="${w}" height="12" rx="3" fill="${c.w}"${c.H.tahan == null && c.tim.length ? ' opacity=".6"' : ""}/>
        ${c.rentang ? `<line x1="${X(c.selamat.min)}" x2="${X(c.selamat.max)}" y1="${y + 8}" y2="${y + 8}" stroke="var(--ink)" stroke-width="1.4"/><line x1="${X(c.selamat.min)}" x2="${X(c.selamat.min)}" y1="${y + 4}" y2="${y + 12}" stroke="var(--ink)"/><line x1="${X(c.selamat.max)}" x2="${X(c.selamat.max)}" y1="${y + 4}" y2="${y + 12}" stroke="var(--ink)"/>` : ""}
        <text x="${Math.min(334, X(c.selamat.mid) + 4)}" y="${y + 11}" text-anchor="${X(c.selamat.mid) > 290 ? "end" : "start"}" class="v">${bulat(c.selamat.mid)}</text></g>`; }).join("")}
      <text x="140" y="${C.length * rh + 14}" class="ax">0</text><text x="330" y="${C.length * rh + 14}" text-anchor="end" class="ax">${bulat(mx)} ha</text></svg>`;
    const baris = C.map((c, i) => `<tr data-pk="${c.id}" class="${c.id === pilih.id ? "on" : ""}" tabindex="0"><td class="num">${i + 1}</td>
      <td><i class="pk-sw" style="background:${c.w}"></i><b>${esc(c.n)}</b><small>${c.sub ? esc(c.sub) : ""}${c.sekat ? `${c.sub ? " · " : ""}${c.sekat.ok ? `${fmt(c.sekat.D)} km di depan api, selesai jam ${bulat(c.sekat.siap)}` : "tidak sempat selesai"}` : ""}${c.omc ? `peluang hujan buatan ${Math.round(c.omc.p * 100)}%, hujan ± jam ke-${fmt(c.omc.lag)}` : ""}</small><small>${tahanT(c)}</small></td>
      <td class="n num">${bulat(c.selamat.mid)}<small>${pc(c.selamat.mid)}%${c.rentang ? ` · ${bulat(c.selamat.min)}–${bulat(c.selamat.max)}` : ""}</small></td>
      <td class="n num">${rp(c.biaya)}<small>${c.perJuta > 0 ? bulat(c.perJuta, c.perJuta < 10 ? 2 : 0) + " ha/jt" : "–"}</small></td></tr>`).join("");
    el.innerHTML = `<div class="pk-rek">${rek}</div>
      <div class="lbl" style="margin-top:12px">Luas diselamatkan dalam 72 jam (ha)${C.some(c => c.rentang) ? " · garis = rentang laju api ±20%" : ""}</div>${grafik}
      <div class="lbl" style="margin-top:10px">Peringkat · klik untuk melihat di peta</div>
      <table class="tb3 pk-tb"><thead><tr><th>#</th><th>Perlakuan</th><th class="n">Selamat (ha)</th><th class="n">Biaya</th></tr></thead><tbody>${baris}</tbody></table>
      ${this.pkRinci(pilih)}
      <div class="lbl" style="margin-top:12px">Mengapa pilihan lain kalah</div><ul class="pk-alasan">${C.filter(c => c !== best).slice(0, 8).map(c => `<li><b>${esc(c.n)}</b>: ${this.pkAlasan(c, best)}</li>`).join("")}</ul>
      <details class="simatur"><summary class="lbl">Asumsi yang dipakai</summary><ul class="pk-alasan">
        <li>Regu tiba = ${PKA.mob} jam mobilisasi + waktu tempuh jaringan jalan/sungai OSM (akses.json). Kondisi jalan, banjir, portal kebun, dan izin lewat tidak dihitung.</li>
        <li>Garis kendali ${fmt(this.op.L)} m/jam per regu (atur di "Serangan awal"); MPA ${PKA.Lmpa} m/jam per regu warga, tiba ${PKA.lajuMpa} km/jam dari desa terdekat.</li>
        <li>Heli: ${PKA.mobHeli} jam mobilisasi, terbang ${PKA.lajuHeli} km/jam, ${fmt(ASUMSI.heliJamHari)} jam terbang/hari dikurangi pulang-pergi pangkalan, isi + siram ${Math.round(PKA.isiSiram * 60)} menit. Satu siraman (± 2–4 ribu liter) dianggap menahan ${PKA.mSiram} m tepi api permukaan. Di gambut hanya ${Math.round(PKA.heliGambut * 100)}% yang dihitung: air dari udara tidak memadamkan bara gambut. Porsi gambut area api: ${Math.round((P.gambutPorsi || 0) * 100)}%.</li>
        <li>Sekat bakar ${fmt(this.op.sekatW)} km dibuka ${PKA.sekatKmJam} km/jam oleh tim tercepat, biaya ${rp(par("biaya_sekat", 0, 23e6))}/km (biaya satu sekat kanal sebagai proksi). Loncatan bara tidak dimodelkan.</li>
        <li>OMC: hujan ${PKA.omcMm} mm pada jam ke-${PKA.omcLag} dengan peluang berhasil = ef_omc keputusan.json (${Math.round(par("ef_omc", 0, .05) * 100)}%, rentang ${Math.round(par("ef_omc", 1, 0) * 100)}–${Math.round(par("ef_omc", 2, .2) * 100)}%), biaya ${PKA.omcHari} hari × ${rp(ASUMSI.omc)}.</li>
        <li>Biaya regu dari asumsi anggaran posko (uang harian, konsumsi, BBM pompa, sewa mobil) per hari aktif + ${PKA.pendinginan} hari pendinginan; heli ${rp(ASUMSI.heliJam)}/jam terbang. Gaji Manggala Agni (DIPA) tidak dihitung.</li></ul></details>
      <div class="sop" style="border-color:var(--warn)"><b>Model, bukan kepastian.</b> Angka hektare indikatif dari model penjalaran yang belum divalidasi untuk Indonesia; pakai untuk membandingkan pilihan, bukan sebagai janji hasil. Water bombing tidak memadamkan gambut; api gambut butuh regu darat, pompa, dan pembasahan berhari-hari. Waktu tempuh tidak memperhitungkan kondisi jalan.</div>`;
    el.querySelectorAll("[data-pk]").forEach(r => { const go = () => { if (P.pilih === r.dataset.pk) return; P.pilih = r.dataset.pk; nanti(() => this.pkLihat(r.dataset.pk)); };
      r.onclick = go; r.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; });
    this.pkUbahIkat(pilih);
  },
  pkRinci(c) {
    const B = this.pk.B, ls = h => `${bulat(c.H.luas.mid[h])}<small>tanpa: ${bulat(B.luas.mid[h])}</small>`;
    const f = (lbl, nm, v, min, max, st) => `<label class="pk-in"><span>${lbl}</span><input type="number" data-ubah="${nm}" value="${Math.round(v * 100) / 100}" min="${min}" max="${max}" step="${st}"></label>`;
    const isian = [...c.tim.map((t, i) => `<div class="pk-baris"><b>${esc(t.jenis === "heli" ? "Heli " + t.n : t.n)}</b>${f("Tiba jam ke", `T0.${i}`, t.T0, 0, 72, .5)}${t.jenis === "heli" ? f("Jumlah heli", `unit.${i}`, t.unit, 1, 6, 1) : f("Jumlah regu", `regu.${i}`, t.regu, 1, 30, 1)}</div>`),
      c.omc ? `<div class="pk-baris"><b>Modifikasi cuaca</b>${f("Peluang berhasil (%)", "p", c.omc.p * 100, 0, 100, 5)}${f("Hujan jam ke", "lag", c.omc.lag, 1, 71, 1)}</div>` : "",
      c.sekat && c.jenis === "sekat" ? `<div class="pk-baris"><b>Sekat bakar</b>${f("Selesai jam ke", "siap", c.sekat.siap, 0, 72, .5)}</div>` : ""].join("");
    return `<div class="pk-rinci" style="--w:${c.w}"><div class="lbl">${esc(JENIS[c.jenis])} · tampil di peta</div><b>${esc(c.n)}</b>
      <table class="simangka"><tr><td>Terbakar 24 j</td><td>48 j</td><td>72 j</td></tr><tr><td>${ls(24)}</td><td>${ls(48)}</td><td>${ls(72)}</td></tr></table>
      <p class="fnd">Desa terhindar: ${fmt(c.desaHindar)} · gambut terselamatkan ± ${bulat(c.gambutSelamat)} ha · ${c.biayaRinci.map(esc).join("; ") || "tanpa biaya"}. Biru di peta = terbakar bila tanpa perlakuan, tidak bila dengan perlakuan ini.</p>
      ${isian ? `<details class="simatur"><summary class="lbl">Ubah perlakuan ini lalu hitung ulang</summary>${isian}<button class="btn sec" id="pkUlang" style="height:32px;font-size:12.5px;margin-top:6px">Hitung ulang perlakuan ini</button></details>` : ""}</div>`;
  },
  pkUbahIkat(c) {
    const b = $("#pkUlang"); if (!b) return;
    b.onclick = () => { b.disabled = true; b.textContent = "Menghitung…";
      document.querySelectorAll("[data-ubah]").forEach(i => { const [k, j] = i.dataset.ubah.split("."), v = Math.max(+i.min, Math.min(+i.max, +i.value || 0));
        if (j != null) { const t = c.tim[+j]; t[k] = v; if (k !== "T0") t[k] = Math.max(1, Math.round(v)); }
        else if (k === "p") c.omc.p = v / 100; else if (k === "lag") c.omc.lag = Math.round(v);
        else if (k === "siap") { c.sekat.siap = v; c.sekat.ok = c.sekat.tiba >= v && c.sekat.D != null; } });
      c.sub = c.jenis === "kombo" ? c.sub : c.tim[0] ? c.sub.replace(/^\d+ (regu|heli)/, m => `${c.tim[0].jenis === "heli" ? c.tim[0].unit + " heli" : c.tim[0].regu + " regu"}`).replace(/tiba [^·]*[^·\s]/, `tiba ${jamT(c.tim[0].T0)}`) : c.sub;
      c.n = c.n.replace(/ \(diubah\)$/, "") + " (diubah)"; c._mid = null;
      nanti(async () => { try { await this.pkRentang(c); this.pkUrut(); this.pkLihat(c.id); } catch (e) { console.error(e); toast("Hitung ulang gagal: " + e.message); } }); };
  },
  pkAlasan(c, best) {
    const B = this.pk.B, gp = this.pk.gambutPorsi || 0, kurang = `Menyelamatkan ± ${bulat(c.selamat.mid)} ha, ${bulat(best.selamat.mid - c.selamat.mid)} ha lebih sedikit dari terbaik`;
    if (c.omc) return `peluang hujan buatan berhasil hanya ± ${Math.round(c.omc.p * 100)}% dan hujan baru turun ± jam ke-${fmt(c.omc.lag)}; bahkan bila berhasil, gambut tetap membara. ${kurang}.`;
    if (c.sekat && !c.sekat.ok) return `sekat baru selesai jam ke-${bulat(c.sekat.siap)} oleh ${esc(c.sekat.oleh)}; api prakiraan sudah melewati semua lokasi sekat yang dicoba lebih dulu.`;
    if (c.jenis === "sekat") return c.H.kenaSekat ? `sekat hanya menahan sisi hilir angin; tanpa regu, api memutari ujungnya. ${kurang}.` : `api tidak mencapai sekat dalam 72 jam, jadi sekat tidak mengubah luas.`;
    const t0 = c.T0, l0 = B.luas.mid[Math.min(72, Math.ceil(t0))];
    if (c.jenis === "heli" && gp > .3) return `± ${Math.round(gp * 100)}% area api di gambut; siraman air hanya mendinginkan permukaan dan tidak memadamkan bara gambut, butuh regu darat. ${kurang}.`;
    if (c.tim.length && c.H.tahan == null) return `tiba ${jamT(t0)}${c.sumber ? ` dari ${bulat(c.sumber.km)} km` : ""}, saat api sudah ± ${bulat(l0)} ha; ${c.tim.map(t => t.jenis === "heli" ? fmt(t.unit) + " heli" : fmt(t.regu) + " regu").join(" + ")} tak cukup mengurungnya sebelum jam ke-72${t0 > 6 ? " (terlalu jauh)" : ""}. ${kurang}.`;
    if (c.H.tahan != null && best.H.tahan != null && c.H.tahan > best.H.tahan + .5) return `api baru tertahan jam ke-${bulat(c.H.tahan)} (terbaik jam ke-${bulat(best.H.tahan)})${t0 > best.T0 + .5 ? `, karena tiba lebih lambat (${jamT(t0)})` : ""}.`;
    if (c.selamat.mid >= best.selamat.mid - .5) return `hasil hampir sama dengan terbaik${c.biaya > best.biaya ? ` tetapi lebih mahal (${rp(c.biaya)})` : t0 > best.T0 ? ` tetapi tiba lebih lambat (${jamT(t0)})` : ""}.`;
    return kurang + ".";
  },
});

/* ---------- kaitan ke Sim yang sudah ada ---------- */
const asli = {panel: Sim.panel, pilih: Sim.pilih, pasangLapis: Sim.pasangLapis, klikPeta: Sim.klikPeta};
Sim.panel = function (...a) { asli.panel.apply(this, a); if (this.f) this.pkPanel(); };
Sim.pilih = function (id, ...a) { if (id !== this.k) this.pk = null; return asli.pilih.call(this, id, ...a); };
Sim.pasangLapis = function (...a) {
  asli.pasangLapis.apply(this, a);
  const m = this.peta; if (!m || !this.f) return;
  /* isStyleLoaded() bernilai false selama ubin/gambar masih dimuat; ulangi sekali saat peta diam */
  if (!m.getLayer("sim-k")) { if (!this._pkUlang) { this._pkUlang = true; m.once("idle", () => { this._pkUlang = false; this.pasangLapis(); }); } return; }
  if (!m.getSource("pk-kl")) {
    m.addSource("pk-kl", {type: "geojson", data: {type: "FeatureCollection", features: S.kluster.features.filter(f => f.properties.level >= 1).map(f => ({type: "Feature", geometry: {type: "Point", coordinates: [f.properties.lon, f.properties.lat]}, properties: {id: f.properties.id, level: f.properties.level}}))}});
    m.addLayer({id: "pk-kl", type: "circle", source: "pk-kl", paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 11, 6], "circle-color": ["match", ["get", "level"], 3, "#c9503a", 2, "#e58a45", "#e3b94e"], "circle-opacity": .55, "circle-stroke-color": "#fff", "circle-stroke-width": .8}});
    m.on("mouseenter", "pk-kl", () => { if (!this._gambarSekat) m.getCanvas().style.cursor = "pointer"; });
    m.on("mouseleave", "pk-kl", () => { if (!this._gambarSekat) m.getCanvas().style.cursor = ""; });
  }
  if (m.getLayer("pk-sekat")) m.removeLayer("pk-sekat"); if (m.getSource("pk-sekat")) m.removeSource("pk-sekat");
  const c = this.pk?.C?.find(x => x.id === this.lihat);
  if (c?.sekat?.ok && this.K) { m.addSource("pk-sekat", {type: "geojson", data: {type: "Feature", geometry: {type: "LineString", coordinates: c.sekat.g.map(g => this.selKeLL(this.K, g))}, properties: {}}});
    m.addLayer({id: "pk-sekat", type: "line", source: "pk-sekat", paint: {"line-color": "#4f8fc4", "line-width": 4, "line-opacity": .95}}); }
};
Sim.klikPeta = function (e) {
  if (this._gambarSekat) return asli.klikPeta.call(this, e);
  const m = this.peta, q = m.getLayer("pk-kl") ? m.queryRenderedFeatures([[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]], {layers: ["pk-kl"]}) : [];
  const id = q[0]?.properties.id; if (!id || id === this.k) return;
  toast(`Kompleks ${id} dipilih`); this.pilih(id);
};
/* bila tab Simulasi sudah terbuka sebelum modul ini termuat */
if (Sim.f && $("#simPanel")?.innerHTML && !$("#pkBox")) Sim.pkPanel();
if (Sim.peta?.isStyleLoaded()) Sim.pasangLapis();
})();
