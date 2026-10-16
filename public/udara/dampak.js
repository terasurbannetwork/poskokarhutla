"use strict";
/* ================================================================ dampak */
/* Tab Dampak kualitas udara: rupa sama dengan Dampak karhutla dan banjir (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../data/udara_dampak.json (scripts/udara/dampak_udara.py): kecamatan yang PM2,5 rata-rata 24 jamnya di atas 55,4 µg/m³ pada tanggal terpilih, lengkap dengan penduduk, sekolah,
   puskesmas/klinik, dan rumah sakit di dalamnya. SEMUA angka perkiraan model CAMS (kisi ~40 km, belum dikoreksi ke alat ukur): tiap kartu membawa pil model, jiwa ditulis "sekitar".
   Bagian tanpa data dibuang (A18). Korban dan kerugian historis tidak ada: BNPB tidak mencatat kualitas udara sebagai jenis bencana. Rupiah tidak ditampilkan. */
const Dampak = (() => {
  const W = {merah: "#c9503a", ungu: "#5f6fb0", teal: "#2b8c86"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", sek: "M22 10 12 5 2 10l10 5 10-5ZM6 12v5c3 3 9 3 12 0v-5",
    kes: "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7 7-7ZM3.5 12h5l1.5-3 2 6 1.5-3h7"};
  const BAG = {pend: ["Penduduk terdampak", W.merah], sek: ["Sekolah", W.ungu], kes: ["Kesehatan", W.teal]};
  let D = null; const st = {hari: ""};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const nmP = k => namaProv(k);
  const SM = "Sumber: Copernicus CAMS lewat Open-Meteo";
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian dan pil model */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>${PIL_MODEL}`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, tip}] */
  function hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  const baris = (pv, f) => Object.entries(pv).filter(([, o]) => o[f] != null).map(([k, o]) => ({k, v: o[f]})).sort((a, b) => b.v - a.v);
  const hariPilihan = () => { const ds = Object.keys(D.terpapar || {}).sort(), ini = tglWIB(SEKARANG()), depan = ds.filter(t => t >= ini); return depan.length ? depan : ds.slice(-1); };
  const labelTgl = t => t === tglWIB(SEKARANG()) ? "Hari ini" : tglPendek(t);
  const tglH = () => st.hari === tglWIB(SEKARANG()) ? "hari ini" : "pada " + tglPendek(st.hari);
  function kartu() {
    const ds = hariPilihan(); if (!ds.length) return "";
    if (!ds.includes(st.hari)) st.hari = ds[0];
    const T = D.terpapar[st.hari], pv = T.prov || {}, out = [];
    const ctl = ds.length > 1 ? `<div class="seg" role="group">${ds.map(t => `<button data-dks="hari" data-v="${t}" aria-pressed="${st.hari === t}">${labelTgl(t)}</button>`).join("")}</div>` : "";
    const bagi = (kecTanpa) => `Sumber: perkiraan model CAMS, belum dikoreksi ke alat ukur${kecTanpa}`;
    if (T.penduduk) { const R = baris(pv, "penduduk").slice(0, 12);
      out.push(bag("pend", `${Kartu.hl("sekitar " + jt(T.penduduk) + " jiwa")} tinggal di ${fmt(T.kec)} kecamatan berudara tidak sehat (PM2,5 di atas ${fmt(D.batas)}) ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, txt: rb(r.v), tip: `<b>${esc(nmP(r.k))}</b><br>Penduduk: sekitar ${fmt(r.v)} jiwa<br>Kecamatan tidak sehat: ${fmt(pv[r.k].kec)}`})), W.merah),
        `Penduduk = semua penghuni kecamatan, bukan hanya yang terpapar langsung. ${T.kec_tanpa_penduduk ? fmt(T.kec_tanpa_penduduk) + " kecamatan tanpa data penduduk tidak dihitung. " : ""}Sumber: WorldPop 2026; perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    if (T.sekolah) { const R = baris(pv, "sekolah").slice(0, 12);
      out.push(bag("sek", `${Kartu.hl("sekitar " + fmt(T.sekolah) + " sekolah")}${T.siswa ? ` dengan sekitar ${jt(T.siswa)} siswa` : ""} berada di kecamatan berudara tidak sehat ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Sekolah: ${fmt(r.v)}${pv[r.k].siswa ? `<br>Siswa: ${fmt(pv[r.k].siswa)}` : ""}`})), W.ungu),
        `${T.kec_tercakup_sekolah ? "Hanya " + fmt(T.kec_tercakup_sekolah) + " kecamatan yang tercatat di data sekolah. " : ""}Sumber: data sekolah Kemendikdasmen; perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    if (T.faskes != null || T.rs != null) { const R = baris(pv, "faskes").slice(0, 12);
      out.push(bag("kes", `${Kartu.hl("sekitar " + fmt(T.faskes || 0) + " puskesmas dan klinik")} serta ${fmt(T.rs || 0)} rumah sakit berada di kecamatan berudara tidak sehat ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Puskesmas dan klinik: ${fmt(r.v)}<br>Rumah sakit: ${fmt(pv[r.k].rs || 0)}`})), W.teal),
        `${T.kec_tercakup_faskes ? "Hanya " + fmt(T.kec_tercakup_faskes) + " kecamatan yang punya catatan fasilitas. " : ""}Sumber: OpenStreetMap, bisa kurang dari kenyataan; perkiraan model CAMS, belum dikoreksi ke alat ukur`, ctl)); }
    return out.join(""); }
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; const top = scrollY; el.querySelector("#dkIsi").innerHTML = kartu(); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak kualitas udara…</div>`;
      try { D = await muatJSON("../data/udara_dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    const isi = kartu(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  return {render};
})();
