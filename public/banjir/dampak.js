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
    jln: "M4 21 9 3M20 21 15 3M12 6v3M12 12v3M12 18v3",
    hist: "M12 3 2 20h20zM12 10v4M12 17v.5"};
  const BAG = {pend: ["Penduduk terdampak", W.merah], sek: ["Sekolah", W.ungu], kes: ["Kesehatan", W.teal], jln: ["Jalan", W.tua], hist: ["Korban dan kerugian", W.oranye]};
  const KUNCI = {kejadian: ["Kejadian", "kejadian", "kejadian banjir"], meninggal: ["Meninggal", "jiwa", "jiwa meninggal akibat banjir"], hilang: ["Hilang", "jiwa", "jiwa hilang akibat banjir"],
    luka: ["Luka-luka", "jiwa", "jiwa luka-luka akibat banjir"], mengungsi: ["Mengungsi", "jiwa", "jiwa mengungsi akibat banjir"], terdampak: ["Terdampak", "jiwa", "jiwa terdampak banjir"],
    rumah_rusak: ["Rumah rusak", "rumah", "rumah rusak akibat banjir"], rumah_terendam: ["Rumah terendam", "rumah", "rumah terendam banjir"]};
  let D = null; const st = {k: "terdampak", h: null};
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
  const tglT = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long"});
  const tglH = () => tglT(st.h || D.hari);
  const LUAR = " Provinsi yang terkena belum tercakup datanya (data ini baru tercakup untuk sembilan provinsi), jadi tidak dihitung nol.";
  const hariWIB = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const SM = () => `Sumber: status banjir BMKG/Open-Meteo per ${tglT(D.hari)}`;
  const nol = v => v == null ? "–" : fmt(v);
  function terpapar(T) {
    const out = [], pv = T.prov || {};
    if (T.penduduk) { const R = baris(pv, "penduduk").slice(0, 12);
      out.push(bag("pend", `${Kartu.hl(jt(T.penduduk) + " jiwa")} tinggal di ${fmt(T.kec)} kecamatan berstatus siaga atau awas banjir pada ${tglH()}`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, txt: rb(r.v), tip: `<b>${esc(nmP(r.k))}</b><br>Penduduk: ${fmt(r.v)} jiwa<br>Kecamatan siaga atau awas: ${fmt(pv[r.k].kec)}`})), W.merah),
        `Penduduk = semua penghuni kecamatan berstatus, bukan hanya area tergenang. ${T.kec_tanpa_penduduk ? fmt(T.kec_tanpa_penduduk) + " kecamatan tanpa data penduduk tidak dihitung. " : ""}Sumber: WorldPop 2026; ${SM().replace("Sumber: ", "")}`)); }
    if (T.sekolah) { const R = baris(pv, "sekolah").slice(0, 12);
      out.push(bag("sek", `${Kartu.hl(fmt(T.sekolah) + " sekolah")}${T.siswa ? ` dengan ${fmt(T.siswa)} siswa` : ""} berada di kecamatan siaga atau awas banjir`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Sekolah: ${fmt(r.v)}${pv[r.k].siswa ? `<br>Siswa: ${fmt(pv[r.k].siswa)}` : ""}`})), W.ungu),
        `${T.kec_tercakup_sekolah ? "Hanya " + fmt(T.kec_tercakup_sekolah) + " kecamatan yang tercatat di data sekolah. " : ""}Sumber: data sekolah Kemendikdasmen; ${SM().replace("Sumber: ", "")}`)); }
    if (T.faskes != null || T.rs != null) { const R = baris(pv, "faskes").slice(0, 12);
      out.push(bag("kes", `${[T.faskes != null && Kartu.hl(fmt(T.faskes) + " puskesmas dan klinik"), T.rs != null && (T.faskes != null ? "serta " : "") + Kartu.hl(fmt(T.rs) + " rumah sakit")].filter(Boolean).join(" ")} berada di kecamatan siaga atau awas banjir`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, tip: `<b>${esc(nmP(r.k))}</b><br>Puskesmas dan klinik: ${fmt(r.v)}<br>Rumah sakit: ${nol(pv[r.k].rs)}`})), W.teal),
        `${T.kec_tercakup_faskes ? "Hanya " + fmt(T.kec_tercakup_faskes) + " kecamatan yang punya catatan fasilitas. " : ""}Sumber: OpenStreetMap, bisa kurang dari kenyataan; ${SM().replace("Sumber: ", "")}`)); }
    if (T.sekolah == null) out.push(bag("sek", `Data sekolah belum mencakup kecamatan siaga atau awas pada ${tglH()}`, "", LUAR.trim()));
    if (T.faskes == null && T.rs == null) out.push(bag("kes", `Data fasilitas kesehatan belum mencakup kecamatan siaga atau awas pada ${tglH()}`, "", LUAR.trim()));
    if (T.jalan_km != null) { const R = baris(pv, "jalan_km").slice(0, 12);
      out.push(bag("jln", `${Kartu.hl(fmt(T.jalan_km) + " km")} jalan berisiko terputus di ${fmt(T.kec_bahaya_tinggi)} kecamatan siaga atau awas yang bahaya banjirnya tinggi`,
        hbar(R.map(r => ({n: nmP(r.k), v: r.v, txt: fmt(r.v) + " km", tip: `<b>${esc(nmP(r.k))}</b><br>Jalan berisiko terputus: ${fmt(r.v)} km<br>Jalan nasional: ${nol(pv[r.k].jalan_nas_km)} km`})), W.tua),
        `Berisiko terputus berarti jalan nasional, provinsi, dan kabupaten di kecamatan berbahaya banjir tinggi (InaRISK), bukan jalan yang pasti tergenang. ${T.kec_tercakup_jalan ? "Hanya " + fmt(T.kec_tercakup_jalan) + " kecamatan yang jalannya terpeta. " : ""}Sumber: OpenStreetMap, InaRISK BNPB`)); }
    else if (T.kec) out.push(bag("jln", `Data jalan belum mencakup kecamatan siaga atau awas pada ${tglH()}`, "", LUAR.trim()));
    return out; }
  function hist() {
    const N = D.tahunan.nasional, th = Object.keys(N).sort(); if (th.length < 2) return "";
    const ada = Object.keys(KUNCI).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(st.k)) st.k = ada[0];
    const k = st.k, [nm, sat, frasa] = KUNCI[k], raw = t => N[t][k], v = t => raw(t) ?? 0, ya = th.filter(t => raw(t) != null), W2 = 940, L = 44, R = 20, T = 26, B = 200, gap = (W2 - L - R) / th.length, bw = gap * .66, mx = Math.max(1, ...th.map(v)), Y = x => B - x / mx * (B - T), X = i => L + i * gap + gap / 2;
    const pk = ya.reduce((a, t) => v(t) > v(a) ? t : a, ya[0]), akhir = ya.at(-1), lalu = ya.at(-2);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W2 - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="10.5" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += th.map((t, i) => { const lbl = raw(t) == null ? "–" : rb(v(t)), y = Y(v(t));
      return `<g class="gy" style="--i:${i}" data-tip="<b>${t}</b><br>${nm}: ${raw(t) == null ? "tidak tercatat" : fmt(v(t)) + " " + sat}"><rect x="${X(i) - bw / 2}" y="${y}" width="${bw}" height="${B - y}" rx="3" fill="${t === pk ? W.merah : W.oranye}" opacity=".92"/><rect x="${X(i) - gap / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + `<text x="${X(i)}" y="${y - 5}" text-anchor="middle" font-size="9.5" font-weight="700" opacity=".75">${lbl}</text><text x="${X(i)}" y="${B + 15}" text-anchor="middle" font-size="10" opacity=".65">${t}</text>`; }).join("");
    const d = lalu && v(lalu) ? Math.round((v(akhir) / v(lalu) - 1) * 100) : null;
    const judul = `${Kartu.hl(fmt(v(akhir)) + " " + frasa)} sepanjang ${akhir}${d != null ? `, ${Kartu.hl((d >= 0 ? "naik " : "turun ") + fmt(Math.abs(d)) + "%")} dari ${lalu}` : ""}; tertinggi pada ${Kartu.hl(pk)} dengan ${fmt(v(pk))} ${sat}`;
    const ctl = `<div class="seg" role="group">${ada.map(x => `<button data-dks="k" data-v="${x}" aria-pressed="${st.k === x}">${KUNCI[x][0]}</button>`).join("")}</div>`;
    return bag("hist", judul, `<svg class="dk-svg" viewBox="0 0 ${W2} ${B + 22}" role="img" aria-label="${nm} per tahun">${g}</svg>`, `Sumber: ${sumber.BNPB} dan ${sumber.dibi}, kejadian banjir 2010–${akhir}; hanya angka yang tercatat`, ctl); }
  const blokDi = t => t === D.hari ? D.terpapar : D.prakiraan?.[t];
  const selisih = t => Math.round((Date.parse(t) - Date.parse(hariWIB())) / 864e5);
  const lblH = t => { const d = selisih(t); return d === 0 ? "Hari ini" : d > 0 ? "+" + d + " hari" : "Sudah lewat"; };
  const pilihHari = () => { const l = D.hari_semua || [], basi = D.hari < hariWIB();
    return (l.length < 2 ? "" : `<div class="seg" role="group" aria-label="Hari prakiraan" style="margin:0 0 12px">${l.map(t => `<button data-dks="h" data-v="${t}" aria-pressed="${t === st.h}">${lblH(t)}<span style="display:block;font-size:10.5px;opacity:.7" translate="no">${tglT(t)}</span></button>`).join("")}</div>`)
      + (basi ? `<p style="margin:0 0 12px;font-size:12.5px;opacity:.75">Data per <span translate="no">${tglT(D.hari)}</span>, belum diperbarui hari ini. Hari yang sudah lewat adalah prakiraan dari tanggal itu.</p>` : ""); };
  const tautan = () => `<section class="dk-bag" id="dk-tautan">${Kartu.ex("Baca bukti banjir per daerah aliran sungai atau laporan harian", "", "", `<p style="margin:0;padding:4px 2px"><a href="laporan-das.html">Bukti banjir per DAS</a> &nbsp;·&nbsp; <a href="laporan.html">Laporan harian banjir</a></p>`, "", "").replace('<span class="ex-ey"></span>', '<span class="ex-ey">Lanjut baca</span>')}</section>`;
  const gambar = () => { const T = blokDi(st.h); const o = T ? terpapar(T) : D.hari_semua ? [bag("pend", `Tidak ada kecamatan siaga atau awas banjir pada ${tglH()}`, "", SM())] : []; const h = D.tahunan?.nasional ? hist() : ""; if (h) o.push(h); if (o.length) o.push(tautan()); return o.join(""); };
  async function render() {
    const el = $("#dampak"); if (!el) return;
    if (!el._dk) { el._dk = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-dks]"); if (s) { st[s.dataset.dks] = s.dataset.v;
          if (s.dataset.dks === "h") { s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === s))); nanti(() => { el.querySelector("#dkIsi").innerHTML = gambar(); }); return; }
          s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === s)));
          nanti(() => { const b = el.querySelector("#dk-hist"), t = document.createElement("div"); t.innerHTML = hist(); if (!b || !t.firstChild) return;   /* ganti judul dan grafik saja, tombol yang diklik tetap */
            b.querySelector("h3").innerHTML = t.querySelector("h3").innerHTML; b.querySelector(".ex-bd").innerHTML = t.querySelector(".ex-bd").innerHTML; }); return; }
        const nav = e.target.closest("[data-ke]"); if (nav) el.querySelector("#dk-" + nav.dataset.ke)?.scrollIntoView({behavior: "smooth", block: "start"}); });
      let rf = 0; document.addEventListener("scroll", () => { if (rf) return; rf = requestAnimationFrame(() => { rf = 0; let a = ""; el.querySelectorAll(".dk-bag").forEach(b => { if (b.getBoundingClientRect().top <= 140) a = b.dataset.bag; });
        el.querySelectorAll(".dk-nav button").forEach(b => b.classList.toggle("on", b.dataset.ke === a)); }); }, {capture: true, passive: true}); }
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat dampak banjir…</div>`;
      try { D = await muatJSON("data/dampak.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; } }
    if (!st.h) st.h = D.hari; const isi = gambar(); if (!isi) { el.innerHTML = `<div class="kosong">Data dampak belum tersedia.</div>`; return; }
    const ada = Object.keys(BAG).filter(k => isi.includes(`id="dk-${k}"`));
    el.innerHTML = `<div class="dk-lay"><nav class="dk-nav" aria-label="Bagian dampak">${ada.map(k => `<button data-ke="${k}" style="--w:${BAG[k][1]}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IKON[k]}"/></svg>${BAG[k][0]}</button>`).join("")}</nav><div><div id="dkHari">${pilihHari()}</div><div id="dkIsi">${isi}</div></div></div>`; }
  return {render};
})();
