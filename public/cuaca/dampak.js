"use strict";
/* ================================================================ dampak */
/* Tab Dampak cuaca ekstrem: rupa sama dengan Dampak karhutla dan banjir (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../banjir/data/cuaca_dampak.json (scripts/cuaca/dampak_cuaca.py). Bagian yang datanya tidak ada dibuang (A18): tanpa area hujan lebat pada hari terpilih, bagian Penduduk
   tidak muncul; sekolah dan fasilitas kesehatan tidak ada karena datanya per kecamatan sedangkan hujan per kotak prakiraan. Korban dan kerugian historis (BNPB/DIBI) selalu ada selama sumbernya ada.
   Kerugian ekonomi (rupiah) belum ada asumsi bernama yang bersumber kuat, jadi tidak ditampilkan. Penduduk = prakiraan, BUKAN jiwa yang sudah terdampak. */
const Dampak = (() => {
  const W = {merah: "#c9503a", oranye: "#e58a45", abu: "#7d8ca3"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", hist: "M12 3 2 20h20zM12 10v4M12 17v.5"};
  const BAG = {pend: ["Penduduk di area hujan lebat", W.merah], hist: ["Korban dan kerugian", W.oranye]};
  let D = null; const st = {k: "terdampak", hari: ""};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const sumber = {BNPB: "<a href=\"https://data.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">BNPB</a>", dibi: "<a href=\"https://dibi.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">DIBI BNPB</a>"};
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  const hariPilihan = () => Object.keys(D.terpapar || {}).filter(t => t >= tglWIB(SEKARANG())).sort();
  const labelTgl = t => t === tglWIB(SEKARANG()) ? "Hari ini" : tglPendek(t);
  function pend() {
    const ds = hariPilihan(); if (!ds.length) return "";
    if (!ds.includes(st.hari)) st.hari = ds[0];
    const T = D.terpapar[st.hari], R = Object.entries(T.prov).map(([k, o]) => ({k, v: o.penduduk, sel: o.sel})).sort((a, b) => b.v - a.v).slice(0, 12);
    const ctl = ds.length > 1 ? `<div class="seg" role="group">${ds.map(t => `<button data-dks="hari" data-v="${t}" aria-pressed="${st.hari === t}">${labelTgl(t)}</button>`).join("")}</div>` : "";
    return bag("pend", `${Kartu.hl(jt(T.penduduk) + " jiwa")} tinggal di area prakiraan hujan lebat (${D.ambang_mm} mm atau lebih) ${st.hari === tglWIB(SEKARANG()) ? "hari ini" : "pada " + tglPendek(st.hari)}, di ${fmt(R.length)}${R.length < Object.keys(T.prov).length ? " dari " + fmt(Object.keys(T.prov).length) : ""} provinsi`,
      hbar(R.map(r => ({n: namaProv(r.k), v: r.v, txt: rb(r.v), tip: `<b>${esc(namaProv(r.k))}</b><br>Penduduk: ${fmt(r.v)} jiwa<br>Area hujan lebat: ${fmt(r.sel)}`})), W.merah),
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
  const gambar = () => [pend(), hist()].filter(Boolean).join("");
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; const id = s.dataset.dks === "hari" ? "pend" : "hist", b = el.querySelector("#dk-" + id), f = id === "pend" ? pend : hist; if (b) b.outerHTML = f(); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak cuaca…</div>`;
      try { D = await muatJSON("../banjir/data/cuaca_dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  return {render};
})();
