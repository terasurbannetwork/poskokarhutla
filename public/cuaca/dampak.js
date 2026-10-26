"use strict";
/* ================================================================ dampak */
/* Tab Dampak cuaca ekstrem: rupa sama dengan Dampak karhutla dan banjir (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../banjir/data/cuaca_dampak.json (scripts/cuaca/dampak_cuaca.py). Bagian yang datanya tidak ada dibuang (A18): tanpa area hujan lebat pada hari terpilih, bagian Penduduk
   tidak muncul; sekolah dan fasilitas kesehatan tidak ada karena datanya per kecamatan sedangkan hujan per kotak prakiraan. Korban dan kerugian historis (BNPB/DIBI) selalu ada selama sumbernya ada.
   Kerugian ekonomi (rupiah) belum ada asumsi bernama yang bersumber kuat, jadi tidak ditampilkan. Penduduk = prakiraan, BUKAN jiwa yang sudah terdampak. */
const Dampak = (() => {
  const W = {merah: "#c9503a", oranye: "#e58a45", abu: "#7d8ca3"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", hist: "M12 3 2 20h20zM12 10v4M12 17v.5", risiko: "M4 20V10M10 20V4M16 20v-7M22 20H2", sarbnpb: "M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z", zona: "M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9M8 17v3M12 16v4M16 17v3", sarana: "M4 20V9l8-5 8 5v11H4ZM10 20v-6h4v6", pesisir: "M2 12c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2M2 18c2.5-4 5-4 7.5 0s5 4 7.5 0 3-2.5 5-2"};
  const BAG = {pend: ["Penduduk di area hujan lebat", W.merah], zona: ["Zona hujan lebat 72 jam", W.merah], sarana: ["Pelabuhan dan bandara", W.oranye], pesisir: ["Penduduk pesisir, gelombang tinggi", "#3f7fb8"], hist: ["Korban dan kerugian", W.oranye], risiko: ["Risiko menurut BNPB", "#8a5fb0"], sarbnpb: ["Sarana di bahaya tinggi", W.oranye]};
  let D = null, RB = null; const st = {k: "terdampak", hari: "", zm: "jiwa", sh: 0, rk: "cuaca", sb: "cuaca", rt: {urut: "i", turun: true, hal: 0}};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const sumber = {BNPB: "<a href=\"https://data.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">BNPB</a>", dibi: "<a href=\"https://dibi.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">DIBI BNPB</a>"};
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 110, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${esc(r.tip || "")}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  const hariPilihan = () => Object.keys(D.terpapar || {}).filter(t => t >= tglWIB(SEKARANG())).sort();
  const labelTgl = t => t === tglWIB(SEKARANG()) ? "Hari ini" : tglPendek(t);
  function pend() {
    const ds = hariPilihan(); if (!ds.length) return "";
    if (!ds.includes(st.hari)) st.hari = ds[0];
    const T = D.terpapar[st.hari], R = Object.entries(T.prov).map(([k, o]) => ({k, v: o.penduduk, sel: o.sel})).sort((a, b) => b.v - a.v).slice(0, 12);
    const ctl = ds.length > 1 ? `<div class="seg" role="group">${ds.map(t => `<button data-dks="hari" data-v="${t}" aria-pressed="${st.hari === t}">${labelTgl(t)}</button>`).join("")}</div>` : "";
    return bag("pend", `${Kartu.hl(jt(T.penduduk) + " jiwa")} tinggal di area prakiraan hujan lebat (${D.ambang_mm} mm atau lebih) ${st.hari === tglWIB(SEKARANG()) ? "hari ini" : "pada " + tglPendek(st.hari)}, di ${fmt(R.length)}${R.length < Object.keys(T.prov).length ? " dari " + fmt(Object.keys(T.prov).length) : ""} provinsi`,
      hbar(R.map(r => ({n: namaProv(r.k), v: r.v, txt: rb(r.v) + " jiwa", tip: `<b>${esc(namaProv(r.k))}</b><br>Penduduk: ${fmt(r.v)} jiwa<br>Area hujan lebat: ${fmt(r.sel)}`})), W.merah),
      `Penduduk = semua penghuni area prakiraan (kotak 28 km), bukan jiwa yang sudah terdampak. Sumber: WorldPop 2026; Open-Meteo`, ctl); }
  function hist() {
    const N = D.tahunan?.nasional, th = N && Object.keys(N).sort(); if (!th || th.length < 2) return "";
    const ada = Object.keys(BNPB).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(st.k)) st.k = ada[0];
    const k = st.k, [nm, sat] = BNPB[k], v = t => N[t][k] ?? 0, W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), akhir = th.at(-1), lalu = th.at(-2);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const lbl = rb(v(t)), y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${t}</b><br>${nm}: ${fmt(v(t))} ${sat}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="3" fill="${t === pk ? W.merah : W.oranye}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${lbl}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    const d = v(lalu) ? Math.round((v(akhir) / v(lalu) - 1) * 100) : null, penuh = akhir < String(new Date().getFullYear());
    const judul = `${Kartu.hl(fmt(v(akhir)) + " " + sat)} ${nm.toLowerCase()} akibat cuaca ekstrem sepanjang ${akhir}${penuh ? "" : " (belum penuh)"}${d != null && penuh ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${lalu}` : ""}; tertinggi pada ${Kartu.hl(pk)} dengan ${fmt(v(pk))}`;
    const ctl = `<div class="seg" role="group">${ada.map(x => `<button data-dks="k" data-v="${x}" aria-pressed="${st.k === x}">${BNPB[x][0]}</button>`).join("")}</div>`;
    return bag("hist", judul, `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="${nm} per tahun">${g}</svg>`, `Sumber: ${sumber.BNPB} dan ${sumber.dibi}, kejadian cuaca ekstrem ${th[0]}–${akhir}; hanya angka yang tercatat`, ctl); }
  /* prakiraan 72 jam Centurisk97 (cuaca_dampak.json: zona, pelabuhan, bandara, pesisir); angka nol di semua hari = bagian dibuang, bukan "0" */
  const hari3 = () => (D.hari || []).map((_, i) => lbl3(i));
  const ZM = {jiwa: ["Penduduk", "jiwa"], sekolah: ["Sekolah", "sekolah"], faskes: ["Fasilitas kesehatan", "fasilitas kesehatan"]};
  function zona() {
    const Z = D.zona; if (!Z || !D.hari) return ""; const ada = Object.keys(ZM).filter(m => Z[m]?.some(v => v > 0)); if (!ada.length) return "";
    if (!ada.includes(st.zm)) st.zm = ada[0];
    const v = Z[st.zm], mx = v.indexOf(Math.max(...v)), ctl = ada.length > 1 ? `<div class="seg" role="group">${ada.map(m => `<button data-dks="zm" data-v="${m}" aria-pressed="${st.zm === m}">${ZM[m][0]}</button>`).join("")}</div>` : "";
    return bag("zona", `${Kartu.hl(fmt(v[mx]) + " " + ZM[st.zm][1])} berada di kecamatan yang diprakirakan hujan lebat (Siaga atau lebih) ${kapan3(mx)}`,
      hbar(v.map((x, i) => ({n: lbl3(i), v: x, txt: fmt(x) + " " + ZM[st.zm][1], tip: `<b>${lbl3(i)}</b><br>${fmt(x)} ${ZM[st.zm][1]}<br>${fmt(Z.kec?.[i] ?? 0)} kecamatan`})), W.merah),
      `Prakiraan, bukan yang sudah terdampak. Sumber: Deteksi Centurisk97 dari Open-Meteo; penduduk WorldPop 2026`, ctl); }
  function sarana() {
    if (!S.sar || !D.hari) return ""; const j = Math.min(st.sh, D.hari.length - 1), nama = {pelabuhan: r => S.sar.pelabuhan[r[0]], bandara: r => S.sar.bandara[r[0]]};
    const B = [...(D.pelabuhan || []).map(r => ({j: "Pelabuhan", s: nama.pelabuhan(r), t: r[1][j], v: fmt(r[2] / 10) + " m", g: r[3]})), ...(D.bandara || []).map(r => ({j: "Bandara", s: nama.bandara(r), t: r[1][j], v: fmt(r[2]) + " mm", g: r[3]}))]
      .filter(x => x.s && x.t > 0).sort((a, b) => b.t - a.t); if (!B.length && !D.hari.some((_, i) => [...(D.pelabuhan || []), ...(D.bandara || [])].some(r => r[1][i] > 0))) return "";
    const np = B.filter(x => x.j === "Pelabuhan").length, nb = B.length - np, ctl = `<div class="seg" role="group">${D.hari.map((_, i) => `<button data-dks="sh" data-v="${i}" aria-pressed="${j === i}">${lbl3(i)}</button>`).join("")}</div>`;
    const tab = B.length ? `<div class="tw"><table><thead><tr><th>Nama</th><th>Jenis</th><th>Tingkat</th><th class="n">Gelombang atau hujan</th><th class="n">Embusan (km/jam)</th></tr></thead><tbody>${B.slice(0, 15).map(x => `<tr><td translate="no">${esc(x.j === "Bandara" ? x.s[1] : x.s[0])}</td><td>${x.j}</td><td>${pilT(x.t)}</td><td class="n">${x.v}</td><td class="n">${fmt(x.g)}</td></tr>`).join("")}</tbody></table></div>` : "";
    return bag("sarana", `${Kartu.hl(fmt(np) + " pelabuhan")} dan ${Kartu.hl(fmt(nb) + " bandara")} diprakirakan berstatus Waspada atau lebih ${kapan3(j)}`, tab, `Prakiraan. Sumber: Deteksi Centurisk97 dari Open-Meteo dan Open-Meteo Marine`, ctl); }
  function pesisir() {
    const v = D.pesisir?.jiwa; if (!v || !D.hari || !v.some(x => x > 0)) return ""; const mx = v.indexOf(Math.max(...v));
    return bag("pesisir", `${Kartu.hl(jt(v[mx]) + " jiwa")} tinggal di kecamatan pesisir dengan gelombang 2,5 m atau lebih ${kapan3(mx)}`,
      hbar(v.map((x, i) => ({n: lbl3(i), v: x, txt: rb(x) + " jiwa", tip: `<b>${lbl3(i)}</b><br>${fmt(x)} jiwa`})), "#3f7fb8"), `Prakiraan, bukan yang sudah terdampak. Sumber: Open-Meteo Marine; penduduk WorldPop 2026`); }
  /* InaRISK BNPB (scripts/cuaca/risiko_bnpb.py -> cuaca_risiko_bnpb.json): indeks risiko = potensi, BUKAN kejadian. Berkas hilang atau kosong = bagian dibuang (A18). Teks dari BNPB lewat esc. */
  const HZ = {cuaca: ["Cuaca ekstrem", "cuaca ekstrem"], gelombang: ["Abrasi", "gelombang ekstrem dan abrasi"]}, SRC = "Sumber: InaRISK BNPB";
  const JN = {penduduk: "Penduduk (jiwa)", sekolah: "Sekolah", faskes: "Fasilitas kesehatan", bandara: "Bandara", pelabuhan: "Pelabuhan"};
  const hz = pre => ["cuaca", "gelombang"].filter(h => RB?.[pre + h]);
  function risiko() {
    const ada = hz("indeks_"); if (!ada.length) return ""; if (!ada.includes(st.rk)) st.rk = ada[0];
    const T = st.rt, per = 10, R = RB["indeks_" + st.rk].baris.map(r => ({n: r[1], p: namaProv(r[2]), i: r[3].at(-1), d: r[3][9] != null && r[3][0] != null ? Math.round((r[3][9] - r[3][0]) * 10) / 10 : null}));
    const kol = [{k: "n", n: "Kabupaten atau kota", v: r => r.n, h: r => `<span translate="no">${esc(r.n)}</span>`}, {k: "p", n: "Provinsi", v: r => r.p, h: r => `<span translate="no">${esc(r.p)}</span>`},
      {k: "i", n: "Indeks 2025", num: 1, v: r => r.i, h: r => fmt(r.i)}, {k: "d", n: "Perubahan 2015 ke 2024", num: 1, v: r => r.d ?? -1e9, h: r => r.d == null ? "–" : r.d === 0 ? "tetap" : `<span class="pl" style="--w:${r.d > 0 ? W.merah : "#3f7fb8"}">${r.d > 0 ? "naik " : "turun "}${fmt(Math.abs(r.d))}</span>`}];
    const kk = kol.find(c => c.k === T.urut) || kol[2], z = T.turun ? -1 : 1; R.sort((a, b) => { const x = kk.v(a), y = kk.v(b); return (typeof x === "string" ? x.localeCompare(y, "id") : x - y) * z || a.n.localeCompare(b.n, "id"); });
    T.hal = Math.min(T.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const mx = Math.max(...R.map(r => r.i)), top = R.filter(r => r.i === mx), nm = HZ[st.rk][1];
    const judul = top.length === 1 ? `${Kartu.hl(`<span translate="no">${esc(top[0].n)}</span>`)} memiliki indeks risiko ${nm} tertinggi pada 2025, yaitu ${fmt(mx)}` : `${Kartu.hl(fmt(top.length) + " kabupaten dan kota")} sama-sama memiliki indeks risiko ${nm} tertinggi pada 2025, yaitu ${fmt(mx)}`;
    const tab = `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (T.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (T.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead><tbody>${R.slice(T.hal * per, (T.hal + 1) * per).map(r => `<tr>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(T.hal, R.length, per, "kabupaten dan kota")}`;
    const ctl = ada.length > 1 ? `<div class="seg" role="group">${ada.map(h => `<button data-dks="rk" data-v="${h}" aria-pressed="${st.rk === h}">${HZ[h][0]}</button>`).join("")}</div>` : "";
    return bag("risiko", judul, tab, `Indeks risiko adalah penilaian potensi, bukan catatan kejadian. Indeks 2025 memakai skala baru (maks 36), tidak sebanding dengan 2015 sampai 2024; perubahan dihitung 2015 ke 2024. ${SRC}`, ctl); }
  function sarbnpb() {
    const ada = hz("sarana_"); if (!ada.length) return ""; if (!ada.includes(st.sb)) st.sb = ada[0];
    const N = RB["sarana_" + st.sb].nasional, J = Object.keys(JN).filter(j => N[j] && N[j].some(v => v > 0)); if (!J.length) return "";
    const t = j => N[j]?.[3] ?? 0, nm = HZ[st.sb][1];
    const bagian = [["penduduk", v => jt(v) + " jiwa"], ["sekolah", v => fmt(v) + " sekolah"], ["faskes", v => fmt(v) + " fasilitas kesehatan"], ["bandara", v => fmt(v) + " bandara"], ["pelabuhan", v => fmt(v) + " pelabuhan"]].filter(([j]) => J.includes(j) && t(j) > 0).map(([j, f]) => Kartu.hl(f(t(j))));
    if (!bagian.length) return "";
    const tab = `<div class="tw"><table><thead><tr><th>Jenis</th><th class="n">Tinggi</th><th class="n">Sedang</th><th class="n">Rendah</th><th class="n">Aman</th><th class="n">Porsi tinggi</th></tr></thead><tbody>${J.map(j => { const a = N[j], tot = a.reduce((x, y) => x + y, 0);
      return `<tr><td>${JN[j]}</td><td class="n"><span class="pl" style="--w:${W.merah}">${fmt(a[3])}</span></td><td class="n">${fmt(a[2])}</td><td class="n">${fmt(a[1])}</td><td class="n">${fmt(a[0])}</td><td class="n">${tot ? fmt(Math.round(a[3] / tot * 1000) / 10) + "%" : "–"}</td></tr>`; }).join("")}</tbody></table></div>`;
    const ctl = ada.length > 1 ? `<div class="seg" role="group">${ada.map(h => `<button data-dks="sb" data-v="${h}" aria-pressed="${st.sb === h}">${HZ[h][0]}</button>`).join("")}</div>` : "";
    return bag("sarbnpb", `${bagian.length > 3 ? bagian.slice(0, 3).join(", ") + ", dan sarana lain" : bagian.length > 1 ? bagian.slice(0, -1).join(", ") + (bagian.length > 2 ? "," : "") + " dan " + bagian.at(-1) : bagian[0]} berada di kelas bahaya tinggi (${nm})`, tab, `Kelas bahaya menurut peta InaRISK, bukan kejadian. ${SRC}`, ctl); }
  const gambar = () => [zona(), sarana(), pesisir(), pend(), hist(), risiko(), sarbnpb()].filter(Boolean).join("");
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.dks === "sh" ? +s.dataset.v : s.dataset.v; s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s)); if (s.dataset.dks === "rk") st.rt.hal = 0; const id = {hari: "pend", k: "hist", zm: "zona", sh: "sarana", rk: "risiko", sb: "sarbnpb"}[s.dataset.dks], b = el.querySelector("#dk-" + id), f = {pend, hist, zona, sarana, risiko, sarbnpb}[id]; if (b) nanti(() => { const b2 = el.querySelector("#dk-" + id); if (b2) b2.outerHTML = f(); }); return; }
        const th = e.target.closest("#dk-risiko th button[data-k]"), pg = e.target.closest("#dk-risiko .pgn-b[data-h]");
        if (th || pg) { if (th) { st.rt.turun = st.rt.urut === th.dataset.k ? !st.rt.turun : true; st.rt.urut = th.dataset.k; st.rt.hal = 0; } else if (!pg.disabled) st.rt.hal = +pg.dataset.h; nanti(() => { const b2 = el.querySelector("#dk-risiko"); if (b2) b2.outerHTML = risiko(); }); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D && S.dmp) D = S.dmp;
    if (RB === null) RB = await muatJSON("../banjir/data/cuaca_risiko_bnpb.json").catch(() => false);   /* false = tak ada, jangan coba lagi */
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak cuaca…</div>`;
      try { D = await muatJSON("../banjir/data/cuaca_dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  /* tanggal pembuatan berkas InaRISK untuk tab Metode */
  const dibuat = async () => { if (RB === null) RB = await muatJSON("../banjir/data/cuaca_risiko_bnpb.json").catch(() => false); return RB?.dibuat || null; };
  return {render, dibuat};
})();
