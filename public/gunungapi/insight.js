"use strict";
/* Insight gunung api: kartu bergaya karhutla/banjir (pil kategori, judul satu kalimat berangka merah, grafik berangka, legenda + "Sumber:").
   Mesin kartu dari public/inti (Kartu.ex/leg/pil, paginasi, pengurutKepala); di sini hanya data dan gambar SVG gunung api.
   Kartu tanpa data tidak digambar (A18). Level resmi PVMBG ditampilkan apa adanya; tidak ada tingkat buatan Pantau Bencana. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:gunung|erupsi|jiwa))$/;
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const SUMBER = "Sumber: MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)";
const NAVY = "oklch(25.5% .075 256)", BATA = "#b5523b";

/* uji kecocokan arah vs acak: peluang kebetulan mendapat >= k cocok dari n bila tiap kejadian cocok dengan peluang p (acak: 90 dari 360 derajat = 25%) */
const ACAK_45 = .25;
const pAcak0 = (n, persen, p = ACAK_45) => { const k = Math.round(persen * n / 100); let t = 0, c = 1; for (let i = 0; i <= n; i++) { if (i > 0) c = c * (n - i + 1) / i; if (i >= k) t += c * p ** i * (1 - p) ** (n - i); } return t; };
/* angka dari berkas bila ada (acak_persen, p_binomial), kalau tidak dihitung */
const pAcak = (d) => d.p_binomial ?? pAcak0(d.n, d.persen_dalam_45deg, (d.acak_persen ?? 25) / 100), acakDari = d => d.acak_persen ?? ACAK_45 * 100;
const fmtP = x => x < .001 ? "< 0,001" : "≈ " + x.toFixed(2).replace(".", ",");
const Insight = {
  EX: ["status", "letusan", "perubahan", "bandara", "krb", "tambang", "kinerja", "daftar"],
  LABEL: {status: "Status", letusan: "Erupsi", perubahan: "Perubahan level", bandara: "Bandara di jalur abu", krb: "Paparan KRB III", tambang: "Izin tambang", kinerja: "Uji", daftar: "Daftar gunung"},
  /* kartu yang bergantung pada berkas turunan (abu, paparan): digambar sesudah berkasnya tiba, dibuang bila datanya tak ada (A18) */
  LAMBAT: ["bandara", "krb", "tambang", "kinerja"],
  T: {daftar: {urut: "_", turun: true, hal: 0}, bandara: {urut: "jam", turun: false, hal: 0}, tambang: {urut: "zona", turun: true, hal: 0}},
  ex: (...a) => Kartu.ex(...a),
  hl: Kartu.hl,
  p: (x, y, t, bg, fg = "#fff", fs = 12) => Kartu.pil(x, y, t, bg, fg, fs),
  nm: n => `<span translate="no">${esc(n)}</span>`,
  pl: (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`,
  tgl: t => new Date(t).toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short"}),
  /* viewBox dirapatkan di layar sempit supaya huruf tetap terbaca */
  uk() { const M = innerWidth < 640; return M ? {W: 520, L: 110, rh: 32, fs: 13} : {W: 940, L: 170, rh: 34, fs: 13}; },
  skor: g => g.level * 1e6 + (g.radius_km || 0) * 1e3,

  /* 1. berapa gunung per level */
  exStatus() {
    const U = this.uk(), G = S.st.gunung, n = S.n, sa = n[3] + n[4], mx = Math.max(...[1, 2, 3, 4].map(l => n[l])), X = v => v / mx * (U.W - U.L - 90);
    const baris = [4, 3, 2, 1].filter(l => n[l] || l >= 2);
    const g = baris.map((l, i) => { const y = i * (U.rh + 14), nm = G.filter(x => x.level === l).map(x => x.nama), tip = `<b>Level ${LEVEL[l][0]} ${LEVEL[l][1]}</b><br>Jumlah: ${fmt(n[l])} gunung${l >= 2 && nm.length ? "<br>" + esc(nm.join(", ")) : ""}`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="700">${LEVEL[l][1]}</text>
        ${n[l] ? `<rect class="gx" x="${U.L}" y="${y + 5}" width="${Math.max(3, X(n[l]))}" height="${U.rh - 8}" rx="6" fill="${WARNA_LV[l]}" data-tip="${tip}"/>` : ""}
        <g class="gf">${this.p(U.L + (n[l] ? Math.max(3, X(n[l])) : 0) + 8, y + 7, fmt(n[l]), WARNA_LV[l], FG_LV[l])[0]}</g>
        ${l >= 2 && nm.length ? `<text x="${U.L + 4}" y="${y + U.rh + 9}" font-size="11" opacity=".7">${esc(nm.slice(0, innerWidth < 640 ? 3 : 8).join(", "))}${nm.length > (innerWidth < 640 ? 3 : 8) ? "…" : ""}</text>` : ""}</g>`; }).join("");
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(sa ? `${this.hl(fmt(sa) + " gunung")} berstatus Siaga atau Awas hari ini, ${fmt(n[2])} lainnya Waspada` : `Tidak ada gunung berstatus Siaga atau Awas hari ini; ${this.hl(fmt(n[2]) + " gunung")} Waspada`, "", "",
      `<svg viewBox="0 0 ${U.W} ${baris.length * (U.rh + 14) + 4}" role="img" aria-label="Gunung api per level">${g}</svg>`, SUMBER); },

  /* 2. erupsi 24 jam terakhir per gunung (daftar informasi letusan MAGMA) */
  exLetusan() {
    const E = S.st.letusan || []; if (!E.length) return "";
    const akhir = new Date(S.st.dibuat), mulai = akhir - 864e5, dlm = E.filter(e => new Date(e.waktu) >= mulai), per = {};
    /* daftar MAGMA dibaca mundur paling banyak 8 halaman: bila gunung yang sering erupsi memenuhinya, jendela lebih pendek dari 24 jam dan judul menyebut jam sebenarnya */
    const jam = Math.min(24, Math.max(1, Math.ceil((akhir - new Date(E.at(-1).waktu)) / 36e5)));
    dlm.forEach(e => { per[e.gunung] = (per[e.gunung] || 0) + 1; });
    const T = Object.entries(per).map(([nm, n]) => ({nm, n, tinggi: Math.max(0, ...dlm.filter(e => e.gunung === nm).map(e => e.tinggi_m || 0)), lv: S.st.gunung.find(g => g.nama === nm)?.level || 1})).sort((a, b) => b.n - a.n).slice(0, 12);
    const U = this.uk(), mx = Math.max(1, ...T.map(x => x.n)), X = v => v / mx * (U.W - U.L - 190);
    const g = T.map((x, i) => { const y = i * U.rh, tip = `<b>${esc(x.nm)}</b><br>Erupsi ${jam} jam: ${fmt(x.n)}${x.tinggi ? `<br>Kolom abu tertinggi: ${fmt(x.tinggi)} m` : ""}`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(x.nm)}</text>
        <rect class="gx" x="${U.L}" y="${y + 6}" width="${Math.max(3, X(x.n))}" height="${U.rh - 12}" rx="5" fill="${WARNA_LV[x.lv]}" data-tip="${tip}"/>
        <g class="gf">${this.p(U.L + Math.max(3, X(x.n)) + 8, y + 7, fmt(x.n), WARNA_LV[x.lv], FG_LV[x.lv])[0]}${x.tinggi ? this.p(U.L + Math.max(3, X(x.n)) + 8 + 34, y + 7, "abu " + fmt(x.tinggi) + " m", BATA)[0] : ""}</g></g>`; }).join("");
    const terakhir = E[0];
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(dlm.length ? `${this.hl(fmt(dlm.length) + " erupsi")} tercatat dalam ${jam} jam terakhir di ${fmt(T.length)} gunung; ${this.nm(T[0].nm)} terbanyak` : `Erupsi terakhir tercatat pada ${tglJam(terakhir.waktu)} di ${this.nm(terakhir.gunung)}`, "", "",
      T.length ? `<svg viewBox="0 0 ${U.W} ${T.length * U.rh + 4}" role="img" aria-label="Erupsi per gunung">${g}</svg>` : `<p class="kosong">${esc(terakhir.ket)}</p>`, SUMBER + " (informasi letusan)"); },

  /* 3. perubahan level yang dicatat Pantau Bencana tiap kali data diperbarui */
  exPerubahan() {
    const P = [...(S.st.perubahan || [])].sort((a, b) => b.tgl.localeCompare(a.tgl)); if (!P.length) return "";
    const p0 = P[0], naik = p0.ke > p0.dari, U = this.uk();
    const g = P.slice(0, 10).map((p, i) => { const y = i * U.rh;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(p.nama)}</text>
        ${this.p(U.L, y + 7, LEVEL[p.dari][1], WARNA_LV[p.dari], FG_LV[p.dari])[0]}<text x="${U.L + 100}" y="${y + 21}" font-size="14" font-weight="700">${p.ke > p.dari ? "↑" : "↓"}</text>
        ${this.p(U.L + 124, y + 7, LEVEL[p.ke][1], WARNA_LV[p.ke], FG_LV[p.ke])[0]}<text x="${U.L + 240}" y="${y + 21}" font-size="12" opacity=".7">${this.tgl(p.tgl + "T12:00:00+07:00")}</text></g>`; }).join("");
    return this.ex(`${this.hl(this.nm(p0.nama))} ${naik ? "naik" : "turun"} dari Level ${LEVEL[p0.dari][0]} ${LEVEL[p0.dari][1]} ke Level ${LEVEL[p0.ke][0]} ${LEVEL[p0.ke][1]} pada ${this.tgl(p0.tgl + "T12:00:00+07:00")}`, "", "",
      `<svg viewBox="0 0 ${U.W} ${Math.min(P.length, 10) * U.rh + 4}" role="img" aria-label="Perubahan level">${g}</svg>`, "Sumber: perbandingan status MAGMA Indonesia (PVMBG) dari pembaruan ke pembaruan"); },

  /* 4. bandara di jalur abu (skenario 72 jam, ambang penerbangan 2 mg/m3) */
  exBandara() {
    const B = this.abu?.bandara_terdampak || []; if (!B.length) return "";
    const nmG = id => S.st.gunung.find(g => idGn(g.nama) === id), pilih = this.T.bandara;
    const kol = [{k: "nm", n: "Bandara", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kd", n: "Kode", v: r => r.iata || r.icao, h: r => `<span translate="no">${esc(r.iata || r.icao)}</span>`},
      {k: "gn", n: "Gunung", v: r => nmG(r.gunung)?.nama || r.gunung, h: r => { const g = nmG(r.gunung); return g ? `<span translate="no">${esc(g.nama)}</span> ${pilLv(g.level, true)}` : esc(r.gunung); }},
      {k: "jam", n: "Abu tiba", num: 1, v: r => r.jam_tiba ?? 99, h: r => r.jam_tiba != null ? `jam ke-${fmt(r.jam_tiba)}` : "–"}];
    const cepat = [...B].sort((a, b) => a.jam_tiba - b.jam_tiba)[0], gn = new Set(B.map(b => b.gunung)).size;
    return this.ex(`${this.hl(fmt(B.length) + " bandara")} berada di jalur abu skenario 72 jam dari ${fmt(gn)} gunung; tercepat ${this.nm(cepat.iata || cepat.icao)} dalam ${this.hl(fmt(cepat.jam_tiba) + " jam")}`, "", "",
      this.tabel("bandara", kol, B, r => `data-gn="${esc(nmG(r.gunung)?.nama || "")}"`, 10, "bandara", r => -r.jam_tiba), "Skenario Pantau Bencana, bukan advisory VAAC. Sumber: model abu Pantau Bencana (angin ECMWF IFS via Open-Meteo), OurAirports"); },

  /* 5. penduduk di KRB III per gunung */
  exKrb() {
    const P = (this.pap?.gunung || []).filter(g => g.zona_sumber === "KRB PVMBG" && g.zona?.III?.penduduk > 0).map(g => ({...g, nm: S.st.gunung.find(x => idGn(x.nama) === g.id), jiwa: g.zona.III.penduduk}))
      .filter(g => g.nm).sort((a, b) => b.jiwa - a.jiwa); if (!P.length) return "";
    const T = P.slice(0, 10), tot = P.reduce((a, g) => a + g.jiwa, 0), U = this.uk(), mx = T[0].jiwa, X = v => v / mx * (U.W - U.L - 230);
    const g = T.map((x, i) => { const y = i * U.rh, w = Math.max(3, X(x.jiwa)), sek = x.zona.III.sekolah, tip = `<b>${esc(x.nama)}</b><br>KRB III: ±${fmt(x.jiwa)} jiwa<br>${fmt(x.zona.III.desa)} desa, ${fmt(sek)} sekolah, ${fmt(x.zona.III.faskes)} faskes`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(x.nama)}</text>
        <rect class="gx" x="${U.L}" y="${y + 6}" width="${w}" height="${U.rh - 12}" rx="5" fill="${WARNA_LV[x.nm.level]}" data-tip="${tip}"/>
        <g class="gf">${this.p(U.L + w + 8, y + 7, "±" + rb(x.jiwa), WARNA_LV[x.nm.level], FG_LV[x.nm.level])[0]}${sek ? this.p(U.L + w + 8 + ("±" + rb(x.jiwa)).length * 7.2 + 22, y + 7, fmt(sek) + " sekolah", "#3b82f6")[0] : ""}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(`Sekitar ${this.hl(rb(tot) + " jiwa")} tinggal di KRB III ${fmt(P.length)} gunung api; terbanyak di ${this.nm(P[0].nama)} (±${rb(P[0].jiwa)})`, "", "",
      `<svg viewBox="0 0 ${U.W} ${T.length * U.rh + 4}" role="img" aria-label="Penduduk di KRB III per gunung">${g}</svg>`, "Sumber: KRB PVMBG 2018 (ESDM), WorldPop 2026 1 km, OpenStreetMap; orde besar"); },

  /* 6. izin tambang di zona KRB */
  exTambang() {
    const R = []; (this.pap?.gunung || []).forEach(g => (g.tambang || []).forEach(t => { if (t.zona && WARNA_ZONA[t.zona]) R.push({...t, gn: g.nama, lv: S.st.gunung.find(x => idGn(x.nama) === g.id)?.level}); })); if (!R.length) return "";
    const ZN = {III: 3, II: 2, I: 1}, kol = [{k: "nm", n: "Pemegang izin", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kom", n: "Komoditas", v: r => r.komoditas || "", h: r => esc(r.komoditas || "–")},
      {k: "gn", n: "Gunung", v: r => r.gn, h: r => `<span translate="no">${esc(r.gn)}</span>`}, {k: "zona", n: "Zona", v: r => ZN[r.zona], h: r => pilZona(r.zona)},
      {k: "keg", n: "Kegiatan", v: r => r.kegiatan || "", h: r => esc(r.kegiatan || "–")}];
    const n3 = R.filter(r => r.zona === "III").length, gn = new Set(R.map(r => r.gn)).size;
    return this.ex(`${this.hl(fmt(R.length) + " izin tambang")} berada di KRB ${fmt(gn)} gunung api, ${this.hl(fmt(n3))} di antaranya di KRB III`, "", "",
      this.tabel("tambang", kol, R, r => `data-gn="${esc(r.gn)}"`, 10, "izin", r => ZN[r.zona] * 1e3 + (r.lv || 0)), "Sumber: WIUP ESDM (badan usaha), KRB PVMBG 2018"); },

  /* 7. kinerja arah abu: kedua angka dengan n jujur; kartu ini tidak disembunyikan walau angkanya sederhana */
  exKinerja() {
    const a = this.abu?.uji_balik, b = this.abu?.uji_balik_tipis; if (!a?.n) return "";
    const R = [[`Berambang (n = ${fmt(a.n)})`, a, "#c9503a"], ...(b?.n ? [[`Tanpa ambang (n = ${fmt(b.n)})`, b, "#e58a45"]] : [])], U = this.uk(), L = U.L + 30, X = v => v / 100 * (U.W - L - 290), pw = t => t.length * 7.2 + 22;
    const ket = d => { const p = pAcak(d); return [p, p < .05 ? "di atas acak" : "belum terbukti"]; };
    const g = R.map(([nm, d, w], i) => { const y = i * (U.rh + 8), x = Math.max(3, X(d.persen_dalam_45deg)), [p, kt] = ket(d), t1 = fmt(d.persen_dalam_45deg) + "% dalam 45°", t2 = "median " + fmt(d.median_selisih_deg) + "°", t3 = "P " + fmtP(p) + ", " + kt,
        tip = `<b>${nm}</b><br>${t1} dari laporan PVMBG<br>${t2}<br>Acak: ${fmt(acakDari(d))}%; ${t3}`;
      return `<g><text x="${L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${nm}</text><rect class="gx" x="${L}" y="${y + 6}" width="${x}" height="${U.rh - 12}" rx="5" fill="${w}" data-tip="${tip}"/>
        <g class="gf">${this.p(L + x + 8, y + 7, t1, w)[0]}${this.p(L + x + 8 + pw(t1), y + 7, t2, "#6b7a90")[0]}${this.p(L + x + 8 + pw(t1) + pw(t2), y + 7, t3, p < .05 ? "#2f7d4f" : "#8a6d1f")[0]}</g></g>`; }).join("");
    const H = R.length * (U.rh + 8) + 4, xa = L + X(acakDari(a));
    const acak = `<line x1="${xa}" x2="${xa}" y1="0" y2="${H - 4}" stroke="currentColor" stroke-dasharray="4 3" opacity=".55"/><text x="${xa}" y="${H + 10}" text-anchor="middle" font-size="11" opacity=".7">acak ${fmt(acakDari(a))}%</text>`;
    const [pa, ka] = ket(a), pb = b?.n ? ket(b) : null;
    return this.ex(`Arah awan abu skenario cocok dalam 45° dengan laporan PVMBG pada ${this.hl(fmt(a.persen_dalam_45deg) + "%")} dari ${this.hl(fmt(a.n) + " kejadian")} berambang, ${ka} (P ${fmtP(pa)})${pb ? `; ${this.hl(fmt(b.persen_dalam_45deg) + "%")} dari ${fmt(b.n)} kejadian tanpa ambang, ${pb[1]} (P ${fmtP(pb[0])})` : ""}`, "", "",
      `<svg viewBox="0 0 ${U.W} ${H + 16}" role="img" aria-label="Uji balik arah abu">${g}${acak}</svg>`, `Pembanding acak: arah acak jatuh dalam 45° pada ${fmt(acakDari(a))}% kejadian. Hanya arah yang bisa diuji (laporan PVMBG 8 mata angin, tanpa jarak); sampel kecil. Sumber: VONA PVMBG vs angin ECMWF IFS, ${esc(a.periode || "")}`); },

  /* 8. tabel standar. Penduduk dalam radius pindah ke tab Dampak (Insight karhutla tidak memuatnya) */
  exDaftar() {
    const G = S.st.gunung, kol = [{k: "nm", n: "Gunung", v: r => r.nama, h: r => `<b>${esc(r.nama)}</b>`}, {k: "pv", n: "Provinsi", v: r => r.prov, h: r => esc(r.prov)},
      {k: "lv", n: "Level", v: r => r.level, h: r => pilLv(r.level, true)},
      {k: "rd", n: "Radius", num: 1, v: r => r.radius_km ?? -1, h: r => r.radius_km ? fmt(r.radius_km) + " km" : "–"},
      {k: "pd", n: "Jiwa dalam radius", num: 1, v: r => r.penduduk_radius ?? -1, h: r => r.penduduk_radius > 0 ? "±" + rb(r.penduduk_radius) : "–"},
      {k: "tg", n: "Tinggi puncak", num: 1, v: r => r.tinggi ?? -1, h: r => r.tinggi > 0 ? fmt(r.tinggi) + " m" : "–"}];
    return this.ex(`${this.hl(fmt(G.length) + " gunung api")} dipantau PVMBG, ${fmt(S.n[2] + S.n[3] + S.n[4])} di atas Level I`, "", "",
      this.tabel("daftar", kol, G, r => `data-gn="${esc(r.nama)}"`, 10, "gunung", r => this.skor(r) + (r.penduduk_radius || 0) / 1e9), SUMBER); },

  /* tabel standar inti: kepala gelap, kolom bisa diurut, paginasi */
  tabel(id, kol, baris, atribut, per, satuan, awal) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut), f = kk ? kk.v : awal;
    const R = [...baris].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik" ${atribut(r)}>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${kol.length}" class="kosong">Tidak ada data.</td></tr>`}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; Kartu._leg = null;
    try { return f.call(this).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.LABEL[id] || ""}</span>`); } catch (e) { console.error(e); return ""; } },
  pasangUrut(box) { const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); }); },
  render() {
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.LAMBAT.includes(id) ? "" : this.gambar(id)}</div>`).join("");
    /* berkas turunan: digambar sesudah tiba; kartu tanpa data dibuang */
    Promise.all([Data.abu(), Data.pap()]).then(([a, p]) => { this.abu = a; this.pap = p;
      this.LAMBAT.forEach(id => { const box = el.querySelector(`[data-ex="${id}"]`); if (!box) return; const h = this.gambar(id); if (h) { box.innerHTML = h; this.pasangUrut(box); } else box.remove(); }); });
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b));
    el.onclick = e => {
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; box.querySelectorAll(".pgn-b[data-h]").forEach(x => { const on = x === pg; if (!x.textContent.match(/[‹›]/)) { x.classList.toggle("on", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); } }); this.ulang(box); } return; }
      const gn = e.target.closest("[data-gn]"); if (gn) { const g = S.st.gunung.find(x => x.nama === gn.dataset.gn); if (g) { bukaTab("peta"); nanti(() => { Peta.terbang(g); Detail.buka(g); }); } } };
  },
};
