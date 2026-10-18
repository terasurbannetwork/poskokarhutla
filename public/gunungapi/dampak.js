"use strict";
/* ================================================================ dampak */
/* Tab Dampak gunung api: rupa sama dengan Dampak banjir/karhutla (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../banjir/data/dampak_gunungapi.json (scripts/gunungapi/dampak.py, harian lewat scripts/banjir/posko.py). Bagian yang datanya tidak ada dibuang (A18): tanpa gunung berradius dan berpenduduk, bagian Penduduk tidak muncul;
   Korban dan kerugian historis (BNPB) ada selama sumbernya ada. Sekolah dan fasilitas kesehatan dalam radius tidak ada: berkas sekolah/fasilitas hanya mencakup provinsi prioritas karhutla.
   Kerugian ekonomi (rupiah) belum ada asumsi bernama yang bersumber kuat, jadi tidak ditampilkan.
   Bagian paparan (penduduk per zona KRB dan cincin, sekolah dan faskes, jalur evakuasi, bandara) dari data/paparan.json dan abu_gunungapi.json; data kosong dibuang. */
const Dampak = (() => {
  const W = {bata: "#b5523b", oranye: "#e58a45"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", hist: "M12 3 2 20h20zM12 10v4M12 17v.5",
    krb: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", fas: "M3 10l9-5 9 5-9 5zM7 12v5c3 2 7 2 10 0v-5", evak: "M6 19a2 2 0 1 0 0-.01M18 5a2 2 0 1 0 0-.01M8 19h5a4 4 0 0 0 0-8h-2a4 4 0 0 1 0-8h5",
    band: "M2 14l8-2.5V5.5a2 2 0 0 1 4 0v6.5l8 2.5v2.5l-8-2v4l2.5 1.5V22L12 21l-4.5 1v-1.5L10 19v-4l-8 2z"};
  const BAG = {pend: ["Penduduk terpapar", W.bata], krb: ["Penduduk per zona", "#d64545"], fas: ["Sekolah dan faskes", "#3b82f6"], evak: ["Jalur evakuasi", "#2fb36a"], band: ["Bandara terdampak", "#6d7b91"], hist: ["Korban dan kerugian", W.oranye]};
  const KUNCI = {kejadian: ["Kejadian", "kejadian"], mengungsi: ["Mengungsi", "jiwa"], terdampak: ["Terdampak", "jiwa"], rumah_rusak: ["Rumah rusak", "rumah"]};
  let D = null, P = null, A = null; const st = {k: "mengungsi", sk: "zona", gn: ""};
  const lv = id => S.st.gunung.find(g => idGn(g.nama) === id)?.level || 1, KRB = () => (P?.gunung || []).filter(g => g.zona_sumber === "KRB PVMBG");
  const med = a => { const x = [...a].sort((p, q) => p - q), n = x.length; return n % 2 ? x[(n - 1) / 2] : (x[n / 2 - 1] + x[n / 2]) / 2; };
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const sumber = {BNPB: "<a href=\"https://data.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">BNPB</a>"};
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, txt, w, tip}] */
  function hbar(rows, R = 80) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${r.w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, r.w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  function terpapar() {
    const T = D?.terpapar; if (!T?.jiwa) return "";
    const R = T.daftar.slice(0, 12), SM = "Sumber: MAGMA Indonesia (PVMBG), WorldPop 2026";
    return bag("pend", `Sekitar ${Kartu.hl(jt(T.jiwa) + " jiwa")} tinggal dalam radius rekomendasi ${fmt(T.gunung)} gunung berstatus Waspada ke atas`,
      hbar(R.map(r => ({n: r.nama, v: r.jiwa, txt: "±" + rb(r.jiwa), w: WARNA_LV[r.level], tip: `<b>${esc(r.nama)}</b><br>${esc(r.prov)}<br>Radius: ${fmt(r.radius_km)} km<br>Perkiraan penduduk: ± ${fmt(r.jiwa)} jiwa`}))),
      `Perkiraan orde besar: kisi penduduk 25 km jauh lebih kasar daripada radius, bukan hitungan per desa. ${SM}`); }
  function hist() {
    const N = D?.tahunan, th = Object.keys(N || {}).sort(); if (th.length < 2) return "";
    const ada = Object.keys(KUNCI).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(st.k)) st.k = ada[0];
    const k = st.k, [nm, sat] = KUNCI[k], v = t => N[t][k] ?? 0, W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), akhir = th.at(-1), lalu = th.at(-2);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const lbl = rb(v(t)), y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${t}</b><br>${nm}: ${fmt(v(t))} ${sat}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="3" fill="${t === pk ? "#c9503a" : W.oranye}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${lbl}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    const d = v(lalu) ? Math.round((v(akhir) / v(lalu) - 1) * 100) : null;
    const judul = `${Kartu.hl(fmt(v(akhir)) + " " + sat)} ${nm.toLowerCase()} akibat letusan gunung api sepanjang ${akhir}${d != null ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${lalu}` : ""}; tertinggi pada ${Kartu.hl(pk)} dengan ${fmt(v(pk))}`;
    const ctl = `<div class="seg" role="group">${ada.map(x => `<button data-dks="k" data-bg="hist" data-v="${x}" aria-pressed="${st.k === x}">${KUNCI[x][0]}</button>`).join("")}</div>`;
    return bag("hist", judul, `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="${nm} per tahun">${g}</svg>`, `Sumber: ${sumber.BNPB}, kejadian erupsi gunung api 2010–${akhir}; hanya angka yang tercatat`, ctl); }
  /* penduduk per zona KRB atau per cincin jarak, nasional atau satu gunung */
  function krb() {
    const PG = KRB(); if (!PG.length) return "";
    const pilih = st.gn ? (P.gunung.filter(g => g.id === st.gn)) : PG; if (!pilih.length) return "";
    const nm = st.gn ? esc(pilih[0].nama) : `${fmt(pilih.length)} gunung api`, jum = f => pilih.reduce((a, g) => a + f(g), 0);
    const zona = st.sk === "zona" || !PG.length;
    let R, judul;
    if (zona) { const z = k => jum(g => g.zona?.[k]?.penduduk || 0);
      R = ["III", "II", "I"].map(k => ({n: "KRB " + k, v: z(k), txt: "±" + rb(z(k)), w: WARNA_ZONA[k], tip: `<b>KRB ${k}</b><br>± ${fmt(z(k))} jiwa`})).filter(r => r.v > 0);
      judul = `Sekitar ${Kartu.hl(jt(z("III")) + " jiwa")} tinggal di KRB III ${nm}, ${jt(z("II"))} jiwa lagi di KRB II`; }
    else { const c = km => jum(g => g.cincin?.find(x => x.km === km)?.penduduk || 0), W4 = ["#d64545", "#e8743b", "#e0b400", "#9aa4b2"];
      R = [3, 5, 10, 15].map((km, i) => ({n: "≤ " + km + " km", v: c(km), txt: "±" + rb(c(km)), w: W4[i], tip: `<b>Dalam ${km} km dari kawah</b><br>± ${fmt(c(km))} jiwa`})).filter(r => r.v > 0);
      judul = `Sekitar ${Kartu.hl(jt(c(10)) + " jiwa")} tinggal dalam 10 km dari ${nm}, ${jt(c(5))} jiwa dalam 5 km`; }
    if (!R.length) return "";
    const sel = `<select data-dkc="gn" aria-label="Gunung"><option value="">Semua gunung</option>${[...P.gunung].sort((a, b) => a.nama.localeCompare(b.nama)).map(g => `<option value="${esc(g.id)}"${g.id === st.gn ? " selected" : ""}>${esc(g.nama)}</option>`).join("")}</select>`;
    const seg = `<div class="seg" role="group">${[["zona", "Zona KRB"], ["cincin", "Jarak dari kawah"]].map(([v, n]) => `<button data-dks="sk" data-bg="krb" data-v="${v}" aria-pressed="${st.sk === v}">${n}</button>`).join("")}</div>`;
    return bag("krb", judul, hbar(R), `Orde besar (piksel 1 km)${st.gn ? "" : ", dijumlah per gunung"}. Sumber: KRB PVMBG 2018 (ESDM), WorldPop 2026`, sel + seg); }
  /* sekolah dan faskes di KRB III + II */
  function fas() {
    const L = KRB().map(g => ({g, s: (g.zona?.III?.sekolah || 0) + (g.zona?.II?.sekolah || 0), f: (g.zona?.III?.faskes || 0) + (g.zona?.II?.faskes || 0)})).filter(x => x.s + x.f > 0).sort((a, b) => b.s + b.f - a.s - a.f);
    if (!L.length) return "";
    const nS = L.reduce((a, x) => a + x.s, 0), nF = L.reduce((a, x) => a + x.f, 0);
    return bag("fas", `${Kartu.hl(fmt(nS) + " sekolah")} dan ${Kartu.hl(fmt(nF) + " fasilitas kesehatan")} berada di KRB III atau II ${fmt(L.length)} gunung api; terbanyak di ${esc(L[0].g.nama)}`,
      hbar(L.slice(0, 12).map(x => ({n: x.g.nama, v: x.s + x.f, txt: `${fmt(x.s)} sekolah · ${fmt(x.f)} faskes`, w: WARNA_LV[lv(x.g.id)], tip: `<b>${esc(x.g.nama)}</b><br>KRB III dan II<br>${fmt(x.s)} sekolah, ${fmt(x.f)} fasilitas kesehatan`})), 170),
      "Dari OpenStreetMap, bisa kurang lengkap. Sumber: OpenStreetMap, KRB PVMBG 2018 (ESDM)"); }
  /* jalur evakuasi dan waktu tempuh */
  function evak() {
    const L = P.gunung.map(g => ({g, r: evakRingkas(g)})).filter(x => x.r); if (!L.length) return "";
    const n = L.reduce((a, x) => a + x.r.n, 0), R = [...L].sort((a, b) => b.r.maks_menit - a.r.maks_menit), tl = evakTerlama(R[0].g);
    return bag("evak", `${Kartu.hl(fmt(n) + " desa")} di KRB III dan II ${fmt(L.length)} gunung api punya rute evakuasi; waktu tempuh arus bebas terlama ${Kartu.hl(fmt(R[0].r.maks_menit) + " menit")}${tl ? ` dari ${esc(tl.desa)}` : ""} (${esc(R[0].g.nama)})`,
      hbar(R.slice(0, 12).map(x => ({n: x.g.nama, v: x.r.maks_menit, txt: `terlama ${fmt(x.r.maks_menit)} · median ${fmt(x.r.median_menit)} mnt`, w: "#2fb36a", tip: `<b>${esc(x.g.nama)}</b><br>${fmt(x.r.n)} desa KRB III dan II<br>Median ${fmt(x.r.median_menit)} menit, terlama ${fmt(x.r.maks_menit)} menit`})), 200),
      "Hanya desa di KRB III dan II. Waktu tempuh arus bebas kendaraan di jalan OpenStreetMap (tanpa antrean evakuasi massal), bukan jalan kaki. Sumber: OpenStreetMap, perhitungan Pantau Bencana"); }
  /* bandara di jalur abu skenario */
  function band() {
    const B = [...(A?.bandara_terdampak || [])].sort((a, b) => a.jam_tiba - b.jam_tiba); if (!B.length) return "";
    const nmG = id => S.st.gunung.find(g => idGn(g.nama) === id)?.nama || id;
    return bag("band", `${Kartu.hl(fmt(B.length) + " bandara")} berada di jalur abu skenario 72 jam; tercepat ${esc(B[0].iata || B[0].icao)} dalam ${Kartu.hl(fmt(B[0].jam_tiba) + " jam")}`,
      hbar(B.slice(0, 12).map(b => ({n: `${b.iata || b.icao} · ${nmG(b.gunung)}`, v: b.jam_tiba, txt: "jam ke-" + fmt(b.jam_tiba), w: b.jam_tiba <= 6 ? "#d64545" : b.jam_tiba <= 24 ? "#e8743b" : "#e0b400", tip: `<b>${esc(b.nama)}</b><br>Abu dari ${esc(nmG(b.gunung))} tiba jam ke-${fmt(b.jam_tiba)}`}))),
      "Skenario Pantau Bencana, bukan advisory VAAC. Sumber: model abu Pantau Bencana, OurAirports"); }
  const gambar = () => [terpapar(), krb(), fas(), evak(), band(), hist()].filter(Boolean).join("");
  const BAGIAN = {krb, hist};
  const ulang = id => { const b = $("#dampak")?.querySelector("#dk-" + id); if (b) b.outerHTML = BAGIAN[id]() || ""; };
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; ulang(s.dataset.bg || "hist"); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      el.addEventListener("change", e => { const c = e.target.closest("[data-dkc]"); if (c) { st[c.dataset.dkc] = c.value; ulang("krb"); } });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak gunung api…</div>`;
      [D, P, A] = await Promise.all([muatJSON("../banjir/data/dampak_gunungapi.json").catch(() => ({})), Data.pap(), Data.abu()]); }
    const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  return {render};
})();
