"use strict";
/* ================================================================ dampak */
/* Tab Dampak kekeringan: rupa sama dengan Dampak banjir/karhutla (pintasan bagian di kiri, pita bagian berwarna, kartu bergaya Insight, gaya dk-* dari public/inti/dampak.css).
   Data: ../data/dampak_kekeringan.json (scripts/kekeringan/dampak.py, harian lewat scripts/banjir/posko.py). Bagian yang datanya tidak ada dibuang (A18): tanpa kecamatan Siaga/Awas hari ini, bagian Penduduk tidak muncul;
   Korban dan kerugian historis (BNPB) ada selama sumbernya ada. Sekolah dan fasilitas kesehatan hanya untuk kabupaten Siaga/Awas yang ada dalam data (data baru tersedia untuk 9 provinsi; sisanya dibuang, bukan nol); lahan pertanian tidak ada.
   Kerugian ekonomi (rupiah) belum ada asumsi bernama yang bersumber kuat, jadi tidak ditampilkan. */
const Dampak = (() => {
  const W = {pasir: "#c9a24b", oranye: "#e58a45"};
  const IKON = {pend: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8", hist: "M12 3 2 20h20zM12 10v4M12 17v.5", sawah: "M3 20c3-6 6-9 9-9s6 3 9 9M12 11V4M9 7l3-3 3 3", sk: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5", fas: "M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"};
  const BAG = {pend: ["Penduduk terdampak", W.pasir], hist: ["Korban dan kerugian", W.oranye], sawah: ["Sawah rusak", "#7a9a4a"], sk: ["Status darurat resmi", "#1d4e89"], fas: ["Sekolah dan fasilitas", "#3f7fb8"]};
  const KUNCI = {kejadian: ["Kejadian", "kejadian"], terdampak: ["Terdampak", "jiwa"]};   /* mengungsi dan rumah rusak hampir selalu 0 pada kekeringan: tidak bermakna */
  let D = null; const st = {k: "terdampak", tingkat: "awas"};
  const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
  const sumber = {BNPB: "<a href=\"https://data.bnpb.go.id/\" target=\"_blank\" rel=\"noopener\">BNPB</a>"};
  /* kartu: pita bagian + kartu Insight dengan pil = nama bagian */
  const bag = (id, judul, isi, catatan, ctl = "") => { const [nm, w] = BAG[id];
    return `<section class="dk-bag" id="dk-${id}" data-bag="${id}"><header class="dk-sh" style="--w:${w}"><span class="dk-sn"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[id]}"/></svg><h2>${nm}</h2></header>${Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${nm}</span>`)}</section>`; };
  /* batang horizontal berlabel pil: rows [{n, v, txt, w, tip}] */
  function hbar(rows) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${r.w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, r.w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; }
  function terpapar() {
    const T = D.terpapar; if (!T?.jiwa_siaga) return "";
    const awas = st.tingkat === "awas", f = awas ? "jiwa_awas" : "jiwa_siaga", kf = awas ? "kab_awas" : "kab_siaga", w = WARNA_LV[awas ? 3 : 2];
    const R = Object.entries(T.prov).filter(([, o]) => o[f]).sort((a, b) => b[1][f] - a[1][f]).slice(0, 12); if (!R.length) return "";
    const ctl = Kartu.seg("tingkat", [["awas", "Awas"], ["siaga", "Siaga atau Awas"]], st);
    return bag("pend", `${Kartu.hl(jt(T[f]) + " jiwa")} tinggal di kecamatan berstatus ${awas ? "Awas" : "Siaga atau Awas"} kekeringan, ${fmt(T[kf])} kabupaten/kota di ${fmt(Object.values(T.prov).filter(o => o[kf]).length)} provinsi`,
      hbar(R.map(([k, o]) => ({n: namaProv(k), v: o[f], txt: rb(o[f]), w, tip: `<b>${esc(namaProv(k))}</b><br>Jiwa di kecamatan ${awas ? "Awas" : "Siaga atau Awas"}: ${fmt(o[f])}<br>Kabupaten/kota: ${fmt(o[kf])}<br>Penduduk provinsi: ${fmt(o.total)}`}))),
      `Penduduk = semua penghuni kecamatan berstatus, bukan hanya yang kehilangan air. Sumber: ${esc(D.sumber.terpapar)}`, ctl); }
  /* sekolah, siswa, puskesmas/klinik, rumah sakit di kabupaten Siaga/Awas yang ada dalam data (dampak.py sekolah_fasilitas); di luar cakupan dibuang */
  function fas() {
    const F = D.sekolah_fasilitas, A = F?.siaga_awas, Aw = F?.awas; if (!A?.kab) return "";
    const R = Object.entries(F.prov).filter(([, o]) => o.sekolah).sort((a, b) => b[1].siswa - a[1].siswa).slice(0, 12); if (!R.length) return "";
    return bag("fas", `${Kartu.hl(fmt(A.sekolah) + " sekolah")} dengan ${jt(A.siswa)} siswa di ${fmt(A.kab)} dari ${fmt(F.kab_siaga_awas)} kabupaten/kota Siaga atau Awas, ditambah ${fmt(A.faskes)} puskesmas atau klinik dan ${fmt(A.rs)} rumah sakit${Aw?.kab ? `; ${fmt(Aw.sekolah)} sekolah di antaranya di ${fmt(Aw.kab)} kabupaten Awas` : ""}`,
      hbar(R.map(([k, o]) => ({n: namaProv(k), v: o.siswa, txt: rb(o.siswa), w: "#3f7fb8", tip: `<b>${esc(namaProv(k))}</b><br>Siswa: ${fmt(o.siswa)}<br>Sekolah: ${fmt(o.sekolah)}<br>Puskesmas dan klinik: ${fmt(o.faskes)}<br>Rumah sakit: ${fmt(o.rs)}<br>Kabupaten/kota Siaga atau Awas: ${fmt(o.kab)}`}))),
      `Hanya ${fmt(F.kab_tercakup)} dari ${fmt(F.kab_siaga_awas)} kabupaten/kota Siaga atau Awas yang ada dalam data sekolah dan fasilitas (${fmt(F.prov_sekolah.length)} provinsi); sisanya tidak dihitung, bukan nol. Batang = jumlah siswa. Fasilitas OpenStreetMap tidak lengkap, jadi bisa kurang dari kenyataan. Sumber: ${esc(D.sumber.sekolah_fasilitas || "Dapodik, EMIS, OpenStreetMap")}`); }
  function hist() {
    const N = D.tahunan, th = Object.keys(N || {}).sort(); if (th.length < 2) return "";
    const ada = Object.keys(KUNCI).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(st.k)) st.k = ada[0];
    const k = st.k, [nm, sat] = KUNCI[k], v = t => N[t][k] ?? 0, W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), akhir = th.at(-1), lalu = th.at(-2);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const lbl = rb(v(t)), y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${esc(t)}</b><br>${nm}: ${fmt(v(t))} ${sat}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="3" fill="${t === pk ? "#c9503a" : W.oranye}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${lbl}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    const d = v(lalu) ? Math.round((v(akhir) / v(lalu) - 1) * 100) : null;
    const judul = `${Kartu.hl(fmt(v(akhir)) + " " + sat)} ${nm.toLowerCase()} akibat kekeringan sepanjang ${akhir}${d != null ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${lalu}` : ""}; tertinggi pada ${Kartu.hl(pk)} dengan ${fmt(v(pk))} ${sat}`;
    const ctl = `<div class="seg" role="group">${ada.map(x => `<button data-dks="k" data-v="${x}" aria-pressed="${st.k === x}">${KUNCI[x][0]}</button>`).join("")}</div>`;
    return bag("hist", judul, `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="${nm} per tahun">${g}</svg>`, `Sumber: ${sumber.BNPB}, kejadian kekeringan ${th[0]}–${akhir}; hanya angka yang tercatat`, ctl); }

  /* sawah rusak (BNPB, ha nasional per tahun): seri pelaporan, bukan ukuran dampak; catatan dari JSON */
  function sawah() {
    const Sw = D.sawah_rusak, seri = Sw?.seri, th = Object.keys(seri || {}).sort(); if (th.length < 2) return "";
    const v = t => seri[t] ?? 0, W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), ada = th.filter(t => v(t) > 0).length;
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${esc(t)}</b><br>Sawah rusak: ${fmt(v(t))} ha"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${Math.max(1, B - y)}" rx="3" fill="${t === pk ? "#c9503a" : "#7a9a4a"}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g><text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${rb(v(t))}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    return bag("sawah", `${Kartu.hl(jt(v(pk)) + " ha")} sawah rusak akibat kekeringan pada ${Kartu.hl(pk)}, tertinggi sejak ${th[0]}; ${fmt(ada)} dari ${fmt(th.length)} tahun tercatat di atas nol`,
      `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="Sawah rusak per tahun">${g}</svg>`, `${esc(Sw.catatan || "Seri pelaporan BNPB, bukan ukuran dampak")}. Sumber: ${sumber.BNPB}${/^BNPB/i.test(Sw.sumber || "") ? esc(Sw.sumber.replace(/^BNPB/i, "")) : Sw.sumber ? ", " + esc(Sw.sumber) : ""}`); }
  /* SK status darurat BNPB 2025: riwayat, bukan status berlaku */
  function sk() {
    const R = S.resmi; if (!R?.sk?.length) return "";
    const st = {}, pv = {}; for (const s of R.sk) { st[s.status] = (st[s.status] || 0) + 1; pv[s.prov] = (pv[s.prov] || 0) + 1; }
    const rows = Object.entries(pv).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => ({n, v: c, w: "#1d4e89", tip: `<b>${esc(n)}</b><br>${fmt(c)} SK`}));
    const ket = Object.entries(st).sort((a, b) => b[1] - a[1]).map(([n, c]) => `${fmt(c)} ${n}`).join(", ");
    return bag("sk", `${Kartu.hl(fmt(R.sk.length) + " SK")} status darurat BNPB ${R.tahun_data} menyebut kekeringan, ${Kartu.hl(fmt(R.n_aktif) + " berlaku")} sekarang (${esc(ket)})`, hbar(rows),
      `Riwayat SK ${R.tahun_data}, bukan status berlaku; surat lengkap ada di pop-up wilayah pada peta. Sumber: ${esc(R.sumber || "BNPB")}`); }
  const gambar = () => [beriAmbang(terpapar()), beriAmbang(fas()), hist(), sawah(), sk()].filter(Boolean).join("");
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v; const b = el.querySelector("#dk-hist"); if (b) b.outerHTML = hist(); return; }
        const t = e.target.closest("[data-set]"); if (t) { st[t.dataset.set] = t.dataset.v; nanti(() => { const b = el.querySelector("#dk-pend"); if (b) b.outerHTML = terpapar(); }); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak kekeringan…</div>`;
      try { D = await muatJSON("../data/dampak_kekeringan.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div id="dkIsi">${isi}</div></div>`; }
  return {render};
})();
