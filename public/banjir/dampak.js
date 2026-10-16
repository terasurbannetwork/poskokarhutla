"use strict";
/* ================================================================ dampak */
/* Tab Dampak banjir: rupa sama dengan Dampak karhutla (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/dampak.css).
   Data: data/dampak.json (scripts/banjir/dampak.py). Bagian yang datanya tidak ada dibuang (A18): tanpa kecamatan berstatus Siaga/Awas hari ini,
   bagian Penduduk, Sekolah, dan Kesehatan tidak muncul; Korban dan kerugian historis (BNPB/DIBI) selalu ada selama sumbernya ada.
   Kerugian ekonomi (rupiah) belum ada asumsi bernama yang bersumber kuat, jadi tidak ditampilkan. */
const Dampak = (() => {
  const W = {merah: "#c9503a", oranye: "#e58a45", biru: "#4f8fc4", ungu: "#5f6fb0", teal: "#2b8c86", tua: "#7a2b2b"};
  const NAVY = "oklch(25.5% .075 256)";
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    sek: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5", kes: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7ZM3.5 12h5l1.5-3 2 6 1.5-3h7",
    hist: "M12 3 2 20h20zM12 10v4M12 17v.5"};
  const BAG = {pend: ["Penduduk terdampak", W.merah], sek: ["Sekolah", W.ungu], kes: ["Kesehatan", W.teal], hist: ["Korban dan kerugian", W.oranye]};
  const KUNCI = {kejadian: ["Kejadian", "kejadian"], meninggal: ["Meninggal", "jiwa"], hilang: ["Hilang", "jiwa"], luka: ["Luka-luka", "jiwa"], mengungsi: ["Mengungsi", "jiwa"], terdampak: ["Terdampak", "jiwa"],
    rumah_rusak: ["Rumah rusak", "rumah"], rumah_terendam: ["Rumah terendam", "rumah"]};
  let D = null; const st = {k: "terdampak"};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const nmP = k => namaProv(k);
  const sumber = {BNPB: "<a href=\"https://data.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">BNPB</a>", dibi: "<a href=\"https://dibi.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">DIBI BNPB</a>"};
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>`)}</section>`; };
  const pw = t => String(t).length * 11 * .6 + 16;
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  const baris = (pv, f) => Object.entries(pv).filter(([, o]) => o[f] != null).map(([k, o]) => ({k, v: o[f]})).sort((a, b) => b.v - a.v);
  const tglH = () => new Date(D.hari + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long"});
  const SM = "Sumber: status banjir BMKG/Open-Meteo hari ini";
  function terpapar() {
    const T = D.terpapar, out = [], pv = T.prov || {};
    if (T.penduduk) { const R = baris(pv, "penduduk").slice(0, 12);
      out.push(bag("pend", `${Kartu.hl(jt(T.penduduk) + " jiwa")} tinggal di ${fmt(T.kec)} kecamatan berstatus siaga atau awas banjir pada ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, txt: rb(r.v), tip: `<b>${esc(nmP(r.k))}</b><br>Penduduk: ${fmt(r.v)} jiwa<br>Kecamatan siaga atau awas: ${fmt(pv[r.k].kec)}`})), W.merah),
        `Penduduk = semua penghuni kecamatan berstatus, bukan hanya area tergenang. ${T.kec_tanpa_penduduk ? fmt(T.kec_tanpa_penduduk) + " kecamatan tanpa data penduduk tidak dihitung. " : ""}Sumber: WorldPop 2026; ${SM.replace("Sumber: ", "")}`)); }
    if (T.sekolah) { const R = baris(pv, "sekolah").slice(0, 12);
      out.push(bag("sek", `${Kartu.hl(fmt(T.sekolah) + " sekolah")}${T.siswa ? ` dengan ${fmt(T.siswa)} siswa` : ""} berada di kecamatan siaga atau awas banjir`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Sekolah: ${fmt(r.v)}${pv[r.k].siswa ? `<br>Siswa: ${fmt(pv[r.k].siswa)}` : ""}`})), W.ungu),
        `${T.kec_tercakup_sekolah ? "Hanya " + fmt(T.kec_tercakup_sekolah) + " kecamatan yang tercatat di data sekolah. " : ""}Sumber: data sekolah Kemendikdasmen; ${SM.replace("Sumber: ", "")}`)); }
    if (T.faskes != null || T.rs != null) { const R = baris(pv, "faskes").slice(0, 12);
      out.push(bag("kes", `${Kartu.hl(fmt(T.faskes || 0) + " puskesmas dan klinik")} serta ${fmt(T.rs || 0)} rumah sakit berada di kecamatan siaga atau awas banjir`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Puskesmas dan klinik: ${fmt(r.v)}<br>Rumah sakit: ${fmt(pv[r.k].rs || 0)}`})), W.teal),
        `${T.kec_tercakup_faskes ? "Hanya " + fmt(T.kec_tercakup_faskes) + " kecamatan yang punya catatan fasilitas. " : ""}Sumber: OpenStreetMap, bisa kurang dari kenyataan; ${SM.replace("Sumber: ", "")}`)); }
    return out; }
  function hist() {
    const N = D.tahunan.nasional, th = Object.keys(N).sort(); if (th.length < 2) return "";
    const ada = Object.keys(KUNCI).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(st.k)) st.k = ada[0];
    const k = st.k, [nm, sat] = KUNCI[k], v = t => N[t][k] ?? 0, W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), akhir = th.at(-1), lalu = th.at(-2);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const lbl = rb(v(t)), y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${t}</b><br>${nm}: ${fmt(v(t))} ${sat}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="3" fill="${t === pk ? W.merah : W.oranye}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${lbl}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    const d = v(lalu) ? Math.round((v(akhir) / v(lalu) - 1) * 100) : null;
    const judul = `${Kartu.hl(fmt(v(akhir)) + " " + sat)} ${nm.toLowerCase()} akibat banjir sepanjang ${akhir}${d != null ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${lalu}` : ""}; tertinggi pada ${Kartu.hl(pk)} dengan ${fmt(v(pk))}`;
    const ctl = `<div class="seg" role="group">${ada.map(x => `<button data-dks="k" data-v="${x}" aria-pressed="${st.k === x}">${KUNCI[x][0]}</button>`).join("")}</div>`;
    return bag("hist", judul, `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="${nm} per tahun">${g}</svg>`, `Sumber: ${sumber.BNPB} dan ${sumber.dibi}, kejadian banjir 2010–${akhir}; hanya angka yang tercatat`, ctl); }
  const gambar = () => { const o = D.terpapar ? terpapar() : []; const h = D.tahunan?.nasional ? hist() : ""; if (h) o.push(h); return o.join(""); };
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; const b = el.querySelector("#dk-hist"); if (b) b.outerHTML = hist(); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak banjir…</div>`;
      try { D = await muatJSON("data/dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  return {render};
})();
