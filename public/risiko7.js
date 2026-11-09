"use strict";
/* risiko7.js: overlay EKSPERIMENTAL "Peluang api 7 hari" di peta utama index.html (kotak data-l="risiko7" di #lapis).
   HANYA untuk yang sudah masuk (admin atau akun pemirsa). Cookie sesi HttpOnly, dan HTML publik tidak boleh membawa atribut per orang (halaman anonim ikut di-cache),
   jadi satu-satunya tanda adalah GET /api/risiko7/akses -> 200 {masuk: true|false}, dipanggil SEKALI sesudah halaman selesai dimuat dan peramban menganggur (bukan jalur kritis peta).
   Hanya bila masuk:true ubin dipasang. Anonim: tanpa ubin, tanpa kartu, tanpa penangan peta, tanpa window.Risiko7, dan GET /api/risiko7 tidak pernah dipanggil
   (hanya saat pengguna menyalakan lapisan). Gerbang sebenarnya tetap 401 di Worker; pemeriksaan di sini supaya yang tak berhak tidak melihat tombolnya.
   Data GET /api/risiko7 (kontrak: docs/riset/RISIKO-MINGGUAN.md "Kontrak data"): sel 0,05 derajat [ix, iy, p_permil, peringkat_persen_dalam_provinsi].
   Status: 200 JSON; 401 sesi habis; 503 {status:"belum_ada"} sudah masuk tetapi belum ada ramalan terbit (catatan di kartu dan legenda); lainnya gagal dimuat.
   Warna = PELUANG ASLI sel (kelas mutlak tetap, sama antar provinsi dan minggu), bukan peringkat; peringkat provinsi hanya keterangan kecil di popup. Angka dari API dibaca apa adanya.
   Kalibrasi: uji balik 2015-2025 kemiringan 0,93 (Jul-Nov), kantong peluang cocok dengan laju teramati; uji prospektif belum ada, jadi legenda menyebut "belum terbukti".
   Dimuat sesudah peta_kab.js, sebelum lapisan5.js (skrip klasik: peta, Peta, nanti, toast, namaProv, kartuTip, tampilTip, aksiLokasi, renderLegenda, gelap, $, esc terbaca dari skrip utama).
   Fungsi murni diuji sendiri: node public/risiko7.js */
(() => {
  const ok = Number.isFinite, TGL = /^\d{4}-\d\d-\d\d$/;
  const ID = (x, d = 0) => Number(x).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
  /* kelas PELUANG MUTLAK (permil): batas bawah, warna peta (rgba), warna penuh, nama. Di bawah 10 permil (1%) sel tanpa warna. Dipilih dari sebaran data 5 Nov 2026
     (sel di berkas: 44% < 1%, 31% 1-5%, 10% 5-10%, 8% 10-20%, 5% 20-40%, 2% >= 40%), jadi kelas teratas jarang dan peta tidak pekat. */
  const KELAS = [[10, "rgba(201,179,236,.40)", "#c9b3ec", "1–5%"], [50, "rgba(164,127,216,.52)", "#a47fd8", "5–10%"], [100, "rgba(138,92,200,.62)", "#8a5cc8", "10–20%"],
    [200, "rgba(106,47,182,.74)", "#6a2fb6", "20–40%"], [400, "rgba(72,20,140,.86)", "#48148c", "40% atau lebih"]];

  /* ---------- fungsi murni ---------- */
  const kelasDari = p => { let k = -1; KELAS.forEach((x, i) => { if (p >= x[0]) k = i; }); return k; };   /* -1 = di bawah ambang (< 1%): tanpa warna */
  const teksRank = r => `teratas ${ID(Math.max(1, Math.ceil(r)))}%`;   /* dibulatkan ke atas: tidak pernah melebihkan peringkat */
  const teksP = p => p < 1 ? "< 0,1%" : p < 100 ? `${ID(p / 10, 1)}%` : `${ID(Math.round(p / 10))}%`;
  const tg = (t, o) => new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", ...o});
  const rentang = (a, b) => { const pj = {day: "numeric", month: "short", year: "numeric"};
    return a === b ? tg(a, pj) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${tg(b, pj)}` : a.slice(0, 4) === b.slice(0, 4) ? `${tg(a, {day: "numeric", month: "short"})}–${tg(b, pj)}` : `${tg(a, pj)}–${tg(b, pj)}`; };
  const hariWIB = (kini = Date.now()) => new Date(kini + 7 * 36e5).toISOString().slice(0, 10);
  const teksLencana = lolos => `Eksperimental, ${lolos === true ? "lolos" : lolos === false ? "tidak lolos" : "belum lolos"} uji prospektif`;
  function kalimatAndal(UB) {
    const a = UB?.auc_dalam_prov_minggu, b = UB?.pembanding_riwayat, r = UB?.recall10, bag = [];
    if (ok(a)) bag.push(`urutan sel di dalam provinsi mencapai AUC ${ID(a, 3)}${ok(b) ? ` (riwayat api saja: ${ID(b, 3)})` : ""}`);
    if (ok(r)) bag.push(`${ID(Math.round(r * 100))}% sel yang berapi minggu berikutnya ada di 10% sel teratas tiap provinsi`);
    return bag.length ? `Dalam uji balik atas data tahun-tahun lalu, ${bag.join(", dan ")}.` : "";
  }
  function kalimatProsp(P) {
    if (!P) return "Uji prospektif: belum ada data.";
    if (!(P.minggu_dinilai > 0)) return "Uji prospektif: belum ada minggu yang dinilai.";
    return `Uji prospektif: ${ID(P.minggu_dinilai)} minggu dinilai${ok(P.sel_berapi) ? `, ${ID(P.sel_berapi)} sel berapi` : ""}; hasil ${P.lolos === true ? "lolos" : P.lolos === false ? "tidak lolos" : "belum diputuskan"}.`;
  }
  const teksHarap = v => v >= 10 ? ID(Math.round(v)) : Number(v).toLocaleString("id-ID", {maximumFractionDigits: 1});
  const topProv = (prov, n = 6) => Object.entries(prov || {}).filter(([, v]) => ok(v?.harapan_berapi)).sort((a, b) => b[1].harapan_berapi - a[1].harapan_berapi).slice(0, n);
  /* batas kepercayaan pada isi API: bentuk dasar saja; baris sel diperiksa satu per satu saat dibangun */
  function cek(d) {
    const g = d?.grid;
    if (!g || !(g.sel > 0) || !ok(g.x0) || !ok(g.y1)) return "grid tidak sah";
    if (!Array.isArray(d.sel)) return "sel bukan larik";
    if (d.sel.length > 150000) return "sel terlalu banyak";
    if (!Array.isArray(d.berlaku) || !TGL.test(d.berlaku[0]) || !TGL.test(d.berlaku[1])) return "berlaku tidak sah";
    return "";
  }
  const bulat = v => Math.round(v * 1e4) / 1e4;
  /* cincin sel (ix, iy): tepi dihitung dari indeks bulat dengan rumus yang sama, jadi sel bersebelahan berbagi tepi persis (tanpa celah) */
  const cincin = (g, ix, iy) => { const xa = bulat(g.x0 + ix * g.sel), xb = bulat(g.x0 + (ix + 1) * g.sel), ya = bulat(g.y1 - iy * g.sel), yb = bulat(g.y1 - (iy + 1) * g.sel);
    return [[[xa, ya], [xb, ya], [xb, yb], [xa, yb], [xa, ya]]]; };

  if (typeof module !== "undefined") module.exports = {KELAS, kelasDari, teksRank, teksP, rentang, hariWIB, teksLencana, kalimatAndal, kalimatProsp, teksHarap, topProv, cek, cincin};
  /* package.json bertipe module: `node public/risiko7.js` memuatnya sebagai ESM (tanpa module/require), jadi pemicunya nama berkas dan assert lewat getBuiltinModule */
  if (typeof process !== "undefined" && /risiko7\.js$/.test(process.argv?.[1] || "")) {
    const as = process.getBuiltinModule("node:assert/strict"), g = {x0: 94.5, y1: 6.5, sel: .05}, sah = {grid: g, sel: [], berlaku: ["2026-10-22", "2026-10-28"]};
    [[0, -1], [9.9, -1], [10, 0], [49.9, 0], [50, 1], [99.9, 1], [100, 2], [199.9, 2], [200, 3], [399.9, 3], [400, 4], [932, 4]].forEach(([p, k]) => as.equal(kelasDari(p), k, "kelas peluang " + p));
    as.equal(rentang("2026-10-22", "2026-10-28"), "22–28 Okt 2026"); as.equal(rentang("2026-10-29", "2026-11-04"), "29 Okt–4 Nov 2026"); as.equal(rentang("2026-12-30", "2027-01-05"), "30 Des 2026–5 Jan 2027");
    as.deepEqual([0.4, 1, 12, 99, 253].map(teksP), ["< 0,1%", "0,1%", "1,2%", "9,9%", "25%"]); as.deepEqual([0.3, 3.2, 20].map(teksRank), ["teratas 1%", "teratas 4%", "teratas 20%"]);
    as.equal(kalimatAndal({auc_dalam_prov_minggu: .847, pembanding_riwayat: .84, recall10: .414}), "Dalam uji balik atas data tahun-tahun lalu, urutan sel di dalam provinsi mencapai AUC 0,847 (riwayat api saja: 0,840), dan 41% sel yang berapi minggu berikutnya ada di 10% sel teratas tiap provinsi.");
    as.equal(kalimatAndal({}), ""); as.equal(kalimatProsp({minggu_dinilai: 0}), "Uji prospektif: belum ada minggu yang dinilai.");
    as.equal(kalimatProsp({minggu_dinilai: 7, sel_berapi: 2500, lolos: false}), "Uji prospektif: 7 minggu dinilai, 2.500 sel berapi; hasil tidak lolos.");
    as.deepEqual([null, true, false].map(teksLencana), ["Eksperimental, belum lolos uji prospektif", "Eksperimental, lolos uji prospektif", "Eksperimental, tidak lolos uji prospektif"]);
    as.deepEqual([3, 41.7].map(teksHarap), ["3", "42"]); as.deepEqual(topProv({a: {harapan_berapi: 2}, b: {harapan_berapi: 9}, c: {}}).map(x => x[0]), ["b", "a"]);
    as.equal(hariWIB(Date.UTC(2026, 9, 28, 17, 30)), "2026-10-29");   /* 00:30 WIB sudah hari berikutnya */
    as.equal(cek(sah), ""); [{...sah, grid: {...g, sel: 0}}, {...sah, sel: {}}, {...sah, berlaku: ["x", "y"]}, {...sah, sel: new Array(150001)}, null].forEach(d => as.notEqual(cek(d), "", "harus ditolak"));
    const c = cincin(g, 10, 20), kanan = cincin(g, 11, 20); as.deepEqual(c[0][1], kanan[0][0]); as.deepEqual(c[0][2], kanan[0][3]);   /* tepi kanan sel = tepi kiri tetangganya */
    console.log("risiko7.js: murni ok");
  }
  if (typeof document === "undefined") return;
  const DS = document.documentElement.dataset;
  if (DS.pemirsaTab && !DS.pemirsaTab.split(",").includes("peta")) return;   /* akun pemirsa tanpa tab Peta tidak punya layar ini: tidak perlu bertanya */

  /* ---------- keadaan ---------- */
  const API = "/api/risiko7", AKSES = API + "/akses", BASI_MS = 6 * 36e5, KOSONG = {type: "FeatureCollection", features: []};
  const st = {nyala: false, belum: false};   /* belum: sudah masuk, tetapi API menjawab "belum ada ramalan" */
  let K = null, janji = null, gen = 0, kartu = null, pop = null, sorot = -1, ev = null;   /* K = {d, fc, idx, rt, waktu}: data + GeoJSON dibangun SEKALI */

  /* ---------- data: satu panggilan, GeoJSON dibangun sekali (bertahap supaya layar tak membeku), lalu disimpan ---------- */
  const jeda = () => new Promise(r => setTimeout(r, 0));
  const ambil = async () => {
    const r = await fetch(API, {credentials: "same-origin", cache: "no-store", headers: {accept: "application/json"}});   /* jawaban private, no-store */
    if (r.status === 401 || r.status === 403) throw Object.assign(new Error("sesi"), {sebab: "sesi"});
    if (r.status === 503 && (await r.json().catch(() => null))?.status === "belum_ada") throw Object.assign(new Error("belum"), {sebab: "belum"});
    if (!r.ok) throw new Error(API + " " + r.status);
    const d = await r.json(), salah = cek(d); if (salah) throw new Error("risiko7: " + salah);
    return d;
  };
  async function bangun(d) {
    const g = d.grid, n = d.sel.length, fs = [], idx = new Map(); let rusak = 0;
    for (let a = 0; a < n; a += 6000) {
      for (let j = a, e = Math.min(n, a + 6000); j < e; j++) {
        const r = d.sel[j];
        if (!(Array.isArray(r) && Number.isInteger(r[0]) && Number.isInteger(r[1]) && ok(r[2]) && ok(r[3]))) { rusak++; continue; }
        const c = kelasDari(r[2]); if (c < 0) continue;   /* di bawah 1%: tanpa warna, tanpa sorot */
        fs.push({type: "Feature", geometry: {type: "Polygon", coordinates: cincin(g, r[0], r[1])}, properties: {c}});   /* hanya kelas: p dan peringkat dicari dari idx */
        idx.set(r[1] * 65536 + r[0], r);
      }
      await jeda();   /* satu tugas pendek per 6.000 sel */
    }
    if (rusak) console.warn(`risiko7: ${rusak} dari ${n} baris sel tidak sah dan dilewati`);
    return {d, fc: {type: "FeatureCollection", features: fs}, idx, rt: rentang(d.berlaku[0], d.berlaku[1]), waktu: Date.now()};
  }
  const siap = () => janji ||= ambil().then(bangun).then(k => K = k).catch(e => { janji = null; throw e; });

  /* ---------- peta ---------- */
  const ada = () => !!(peta && peta.getLayer("risiko7-fill"));
  const tampil = on => ["risiko7-fill", "risiko7-sorot-line"].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
  /* di bawah label peta dasar (seperti kab-fill) dan di bawah titik/cluster, yang ditambahkan tanpa "before" sehingga di atas semuanya */
  function pasang() {
    if (!K || !peta || peta.getSource("risiko7")) return;
    try {
      const bawah = Peta.lapisAwal(), warna = ["match", ["get", "c"], ...KELAS.slice(0, -1).flatMap((x, k) => [k, x[1]]), KELAS[KELAS.length - 1][1]];
      peta.addSource("risiko7", {type: "geojson", data: K.fc, maxzoom: 10});   /* sel 5 km: lewat zoom 10 cukup diperbesar dari ubin zoom 10 */
      /* tanpa antialias: sel bersebelahan tidak menyisakan garis tipis di antaranya */
      peta.addLayer({id: "risiko7-fill", type: "fill", source: "risiko7", layout: {visibility: st.nyala ? "visible" : "none"},
        paint: {"fill-color": warna, "fill-antialias": false, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 1, 11, .72]}}, bawah);
      peta.addSource("risiko7-sorot", {type: "geojson", data: KOSONG});
      peta.addLayer({id: "risiko7-sorot-line", type: "line", source: "risiko7-sorot", layout: {visibility: st.nyala ? "visible" : "none"}, paint: {"line-color": gelap() ? "#ffffff" : "#1b0f33", "line-width": 2}});
    } catch (e) { console.warn("risiko7: peta belum siap, dicoba lagi saat style.load", e); return; }   /* style.load memanggil pasang() lagi */
    sorot = -1; ikat();
  }
  function buangPeta() {
    if (!peta) return;
    ["risiko7-sorot-line", "risiko7-fill"].forEach(l => peta.getLayer(l) && peta.removeLayer(l));
    ["risiko7-sorot", "risiko7"].forEach(s => peta.getSource(s) && peta.removeSource(s));
  }
  const selDi = e => { const g = K.d.grid, ix = Math.floor((e.lngLat.lng - g.x0) / g.sel), iy = Math.floor((g.y1 - e.lngLat.lat) / g.sel);
    return {ix, iy, r: ix < 0 || iy < 0 ? undefined : K.idx.get(iy * 65536 + ix)}; };
  function sorotkan(ix, iy) {
    const kunci = ix < 0 ? -1 : iy * 65536 + ix; if (kunci === sorot) return; sorot = kunci;
    peta.getSource("risiko7-sorot")?.setData(kunci < 0 ? KOSONG : {type: "Feature", geometry: {type: "Polygon", coordinates: cincin(K.d.grid, ix, iy)}, properties: {}});
  }

  /* ---------- tooltip dan popup ---------- */
  function isiTip(r) {
    const w = KELAS[kelasDari(r[2])][2];
    return kartuTip({judul: "Peluang api 7 hari", sub: `<small class="tp-sub">Eksperimental</small>`,
      stat: [["api", teksP(r[2]), "peluang berapi", w]], kaki: `Berlaku ${K.rt}, peringkat di provinsi ${teksRank(r[3])}`});
  }
  function isiPop(c) {
    const [ix, iy, p, rk] = c.r, g = K.d.grid, kb = (a, b) => `<div class="kb penuh"><span>${a}</span><b>${b}</b></div>`;
    return `<div class="kartu"><div class="kp putih" style="--aksen:${KELAS[kelasDari(p)][2]}"><div><small>Eksperimental</small><b>Peluang api 7 hari</b></div></div>
      <div class="kg">${kb("Peluang berapi", teksP(p))}${kb("Peringkat di provinsi", teksRank(rk))}${kb("Berlaku", K.rt)}</div>
      ${typeof aksiLokasi === "function" ? aksiLokasi(g.y1 - (iy + .5) * g.sel, g.x0 + (ix + .5) * g.sel, "Sel peluang api 7 hari") : ""}
      <div class="kk">Peluang satelit menangkap sedikitnya satu titik api di sel sekitar 5,5 km ini. Peringkat hanya dihitung di dalam provinsinya dan tidak menentukan warna. ${teksLencana(K.d.keandalan?.prospektif?.lolos)}.</div></div>`;
  }
  /* didaftarkan ulang tiap pasang(): Peta.pasang() mendaftarkan ulang penangan hover wilayah di tiap style.load, dan yang terakhir menimpa kartunya (pola peta_kab.js) */
  function ikat() {
    const tip = $("#tip");
    if (ev) { peta.off("mousemove", ev.m); peta.off("mouseout", ev.l); }
    const keluar = () => { sorotkan(-1, -1); if (tip._r7) { tip._r7 = false; tip.classList.remove("on"); peta.getCanvas().style.cursor = ""; } };
    ev = {
      m: e => {
        if (!st.nyala || !K || !ada()) return;
        const c = selDi(e); if (!c.r) return keluar();
        sorotkan(c.ix, c.iy);
        /* tooltip cluster prioritas, bahaya gambut, Himawari, dan pangkalan udara/METAR didahulukan: penangannya sudah menandai kartunya */
        if (tip._kl != null || tip._pf || peta._tipHw || peta._tipUdara) return;
        peta.getCanvas().style.cursor = "pointer"; tip._r7 = true; tampilTip(isiTip(c.r), e.originalEvent); },
      l: keluar};
    peta.on("mousemove", ev.m); peta.on("mouseout", ev.l);
  }
  /* dipanggil penangan klik peta utama sesudah penanda (cluster, posko, titik) didahulukan: true = klik dipakai, jangan turun ke wilayah */
  function klik(e) {
    if (!st.nyala || !K || !ada() || peta.getLayoutProperty("risiko7-fill", "visibility") === "none") return false;
    const c = selDi(e); if (!c.r) return false;
    if (e._r7) return true;   /* penangan klik utama terdaftar ganda sesudah ganti peta dasar: satu popup per klik */
    e._r7 = 1; $("#tip").classList.remove("on"); pop?.remove();
    pop = new maplibregl.Popup({closeButton: false, maxWidth: "300px"}).setLngLat(e.lngLat).setHTML(isiPop(c)).addTo(peta);
    const p0 = pop; p0.on("close", () => { if (pop === p0) pop = null; });
    return true;
  }

  /* ---------- kartu keterangan (di atas legenda) ---------- */
  function kartuEl() {
    if (kartu) return kartu;
    kartu = document.createElement("div"); kartu.id = "r7Kartu"; kartu.className = "card"; kartu.hidden = true; kartu.setAttribute("aria-label", "Peluang api 7 hari, eksperimental");
    kartu.innerHTML = `<div class="r7-hd"><span class="lbl">Peluang api 7 hari</span><span class="r7-pil" data-r7="pil">Eksperimental</span></div>
      <div class="r7-wkt" data-r7="wkt">Memuat…</div><div class="r7-cat" data-r7="cat" hidden></div>
      <details class="r7-rinci"${innerWidth > 900 ? " open" : ""} hidden><summary>Seberapa bisa dipercaya</summary>
        <p data-r7="andal"></p><p data-r7="prosp"></p><div class="r7-prov" data-r7="prov"></div></details>`;
    $("#dok").prepend(kartu); return kartu;
  }
  function isiKartu() {
    const d = K.d, k = kartuEl(), a = x => k.querySelector(`[data-r7="${x}"]`), P = d.keandalan?.prospektif;
    a("pil").textContent = teksLencana(P?.lolos);
    a("wkt").textContent = `Berlaku ${K.rt}${TGL.test(d.terbit || "") ? `, terbit ${tg(d.terbit, {day: "numeric", month: "short", year: "numeric"})}` : ""}`;
    const cat = [d.terlambat === true && "Terbit terlambat: dibuat sesudah minggunya mulai, jadi tidak ikut dinilai.",
      hariWIB() > d.berlaku[1] && "Masa berlaku sudah lewat dan ramalan minggu berikutnya belum terbit."].filter(Boolean);
    a("cat").hidden = !cat.length; a("cat").innerHTML = cat.map(t => `<span>${t}</span>`).join("");
    const andal = kalimatAndal(d.keandalan?.uji_balik); a("andal").textContent = andal; a("andal").hidden = !andal;
    a("prosp").textContent = kalimatProsp(P) + (typeof P?.ringkas === "string" && P.ringkas ? " " + P.ringkas : "");
    const tp = topProv(d.prov); a("prov").hidden = !tp.length;
    a("prov").innerHTML = `<span class="lbl">Perkiraan sel berapi per provinsi</span><ul>${tp.map(([kd, v]) => `<li><span>${typeof namaProvHtml === "function" ? namaProvHtml(kd) : esc(namaProv(kd))}</span><b>${teksHarap(v.harapan_berapi)}</b></li>`).join("")}</ul>`;
    k.querySelector("details").hidden = false;
  }

  /* ---------- legenda: kelas warna (ditempel di akhir legenda bawaan, pola peta_kab.js) ---------- */
  const kepalaLeg = `<div class="lbl">Peluang api 7 hari, eksperimental</div>`;
  const legenda = () => `<div class="lg-g">${kepalaLeg}<div class="leg">${KELAS.map(x => `<span><i class="sw" style="background:${x[1]}"></i>${x[3]}</span>`).join("")}`
    + `<span class="r7-cat-leg">Berlaku ${K.rt}. Warna = peluang sel berapi dalam 7 hari. Sel tanpa warna: peluang di bawah 1%. Cocok dengan kejadian lampau dalam uji balik, belum terbukti pada ramalan ke depan.</span></div></div>`;
  const legendaBelum = () => `<div class="lg-g">${kepalaLeg}<div class="leg"><span class="r7-cat-leg">Belum ada ramalan yang terbit.</span></div></div>`;

  /* ---------- kotak centang ---------- */
  function gagal(e, id) {
    if (id !== gen) return;
    const i = document.querySelector('#lapis input[data-l="risiko7"]'), k = kartuEl(), a = x => k.querySelector(`[data-r7="${x}"]`);
    if (e.sebab === "belum") {   /* sudah masuk, belum ada ramalan terbit: kotak tetap menyala; catatan di kartu dan legenda; dicoba lagi saat dinyalakan berikutnya */
      st.belum = true; a("pil").textContent = "Eksperimental"; a("wkt").textContent = "Belum ada ramalan yang terbit."; a("cat").hidden = true; k.querySelector("details").hidden = true;
      return renderLegenda();
    }
    console.warn("peluang api 7 hari", e);
    st.nyala = false; if (i) i.checked = false; k.hidden = true;
    if (e.sebab === "sesi") { toast("Sesi berakhir. Masuk lagi untuk melihat peluang api 7 hari."); i?.closest("details")?.remove(); }
    else toast("Peluang api 7 hari gagal dimuat.");
    renderLegenda();
  }
  async function terapkan() {
    const id = ++gen, kt = kartuEl(); st.belum = false;
    if (!st.nyala) { pop?.remove(); if (K && ada()) { sorotkan(-1, -1); tampil(false); } renderLegenda(); return; }
    if (K && Date.now() - K.waktu > BASI_MS) { buangPeta(); K = janji = null; }   /* halaman terbuka berjam-jam: ambil ulang, bisa jadi sudah terbit minggu baru */
    if (!K) kt.querySelector('[data-r7="wkt"]').textContent = "Memuat…";
    try { await siap(); } catch (e) { return gagal(e, id); }
    if (id !== gen) return;   /* diganti pengguna selama memuat */
    await new Promise(nanti); if (id !== gen) return;   /* addSource menyalin ribuan poligon ke worker peta: tugas sendiri, sesudah kartu tercat */
    pasang(); if (ada()) tampil(true);
    nanti(() => { if (id !== gen) return; isiKartu(); renderLegenda(); });
  }
  /* dipanggil SEKALI, hanya bila Worker menjawab masuk:true */
  function hubungkan() {
    const L = $("#lapis"); if (!L || L.querySelector('input[data-l="risiko7"]')) return;
    if (typeof UBIN !== "undefined") { UBIN.risiko7 = ["#3a0c78", "#a882de", "api"]; UBIN_PENDEK.risiko7 = "Peluang 7 hari"; }   /* gaya ubin ala kabluas/kabbelum di index.html */
    L.insertAdjacentHTML("beforeend", `<details open><summary>Eksperimental</summary><label><input type="checkbox" data-l="risiko7"> Peluang api 7 hari (eksperimental)</label></details>`);
    /* fase tangkap: penangan bawaan halaman tidak mengenal kunci ini (peta kunci -> lapisan tak ada). Chrome kontrol urgent, kerja berat ditunda */
    L.addEventListener("change", e => { const i = e.target.closest?.('input[data-l="risiko7"]'); if (!i) return;
      e.stopImmediatePropagation();
      st.nyala = i.checked; kartuEl().hidden = !i.checked; nanti(terapkan); }, true);
    const _leg = renderLegenda;
    renderLegenda = function () { _leg(); const box = document.querySelector("#legDet > div"); if (!box || !st.nyala) return;
      if (K && ada()) box.insertAdjacentHTML("beforeend", legenda()); else if (st.belum) box.insertAdjacentHTML("beforeend", legendaBelum()); };
    /* ganti peta dasar = setStyle(diff:false): semua lapisan hilang, pasang ulang bila menyala (tanpa membangun ulang GeoJSON) */
    const tunggu = () => { if (typeof peta === "undefined" || !peta) return setTimeout(tunggu, 300);
      peta.on("style.load", () => setTimeout(() => { if (K && st.nyala) { pasang(); if (ada()) tampil(true); renderLegenda(); } }, 60)); };
    tunggu();
    window.Risiko7 = {klik, aktif: () => st.nyala};
  }

  /* ---------- siapa yang masuk: satu pertanyaan ke Worker, sesudah halaman selesai dimuat dan peramban menganggur; gagal = dianggap belum masuk ---------- */
  const tanya = async () => { try { const r = await fetch(AKSES, {credentials: "same-origin", cache: "no-store"}); return r.ok && (await r.json())?.masuk === true; } catch (e) { return false; } };
  const mulai = () => (window.requestIdleCallback || (f => setTimeout(f, 300)))(() => tanya().then(m => m && hubungkan()), {timeout: 5000});
  document.readyState === "complete" ? mulai() : addEventListener("load", mulai, {once: true});
})();
