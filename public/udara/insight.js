"use strict";
/* chrome urgen: halaman aktif langsung berpindah, isi tabel menyusul di ulang() */
const halUrgen = (pg, box) => { const h = pg.dataset.h; box.querySelectorAll(".pgn-b").forEach(x => { if (!/^\d+$/.test(x.textContent)) return; const on = x.dataset.h === h; x.classList.toggle("on", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); }); };
/* ================================================================ insight
   Kartu bergaya Insight karhutla lewat mesin bersama public/inti (Kartu.ex/hl/pil/seg/leg, paginasi, pengurutKepala): pil kategori, judul satu kalimat
   berangka merah, grafik dengan angka tertulis, kaki legenda dan "Sumber:". Semua angka PERKIRAAN MODEL CAMS (bukan ISPU resmi). */
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const jt = kr;
const tglIns = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});

const Insight = {
  st: {hari: 0, kabHari: 0, tren: "jiwa"},
  EX: ["jiwa", "kab", "tren", "jarak"],
  T: {kab: {urut: "_", turun: true, hal: 0}},
  hl: Kartu.hl,
  exM: (...a) => Kartu.ex(...a).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${PIL_MODEL}</span>`),
  seg(key, opsi) { return Kartu.seg(key, opsi, this.st); },
  segHari: function (key) { return this.seg(key, S.uk.hari.map((t, i) => [i, i ? tglPendek(t) : "Hari ini"])); },
  kapan: h => h ? `<span translate="no">${tglPendek(S.uk.hari[h])}</span>` : "hari ini",
  tsProv: p => p[2] + p[3] + p[4],

  /* 1. jiwa terpapar udara tidak sehat per provinsi */
  exJiwa() {
    const h = +this.st.hari, nas = S.uk.nasional[h].jiwa, ts = nas[2] + nas[3] + nas[4];
    const semua = Object.entries(S.uk.prov).map(([k, hs]) => ({k, p: hs[h], ts: this.tsProv(hs[h])})).filter(x => x.ts > 0).sort((a, b) => b.ts - a.ts);
    const pv = semua.slice(0, 12), M = innerWidth < 640, W = M ? 520 : 940, L = M ? 130 : 190, rh = 30, fs = M ? 14 : 13, mx = Math.max(1, ...pv.map(x => x.ts)), X = v => v / mx * (W - L - 90);
    const g = pv.map((x, i) => { let acc = 0, y = i * rh, kt = x.p.slice(0, 5).reduce((a, v, c) => v ? c : a, 0);
      const nm = M ? namaProv(x.k).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT") : namaProv(x.k);
      const tip = `<b>${esc(namaProv(x.k))}</b><br>Tidak sehat: ${jiwa(x.p[2])}<br>Sangat tidak sehat: ${jiwa(x.p[3])}<br>Berbahaya: ${jiwa(x.p[4])}<br>PM2,5 rata-rata: ${fmt(Math.round(x.p[5]))} µg/m³`;
      return `<g data-prov="${x.k}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${fs}" font-weight="600" translate="no">${esc(nm)}</text>`
        + [2, 3, 4].map(c => { const bw = X(x.p[c]); if (!bw) return ""; const s = `<rect class="gx" style="--i:${i}" x="${L + acc}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="${KAT[c].w}" data-tip="${tip}"/>`; acc += bw; return s; }).join("")
        + `<g class="gf" style="--i:${i}">${Kartu.pil(L + acc + 8, y + 5, kr(x.ts), KAT[kt].w, KAT[kt].fg)[0]}</g></g>`; }).join("");
    Kartu.leg([2, 3, 4].map(c => [KAT[c].w, KAT[c].n]));
    return this.exM(ts ? `${this.hl(jiwa(ts))} menghirup udara tidak sehat (PM2,5 di atas 55) di ${this.hl(fmt(semua.length) + " provinsi")} ${this.kapan(h)}, menurut model` : `Tidak ada provinsi dengan udara tidak sehat ${this.kapan(h)}`, "", "",
      pv.length ? `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Jiwa terpapar udara tidak sehat per provinsi">${g}</svg>` : `<p class="kosong">Semua provinsi di kategori baik atau sedang.</p>`,
      "Sumber: Copernicus CAMS lewat Open-Meteo, WorldPop", this.segHari("hari")); },

  /* 2. kabupaten/kota paling tercemar */
  exKab() {
    const h = +this.st.kabHari, R = S.uk.kab[h] || []; if (!R.length) return "";
    const top = R[0], ts = top[5];
    const kol = [{k: "kab", n: "Kabupaten/kota", v: r => r[1], h: r => `<b translate="no">${esc(r[1])}</b>`},
      {k: "prov", n: "Provinsi", v: r => namaProv(r[0]), h: r => `<span translate="no">${esc(namaProv(r[0]))}</span>`},
      {k: "rata", n: "PM2,5 24 jam", num: 1, v: r => r[2], h: r => `<span class="kt" style="--c:${KAT[kat(r[2])].w};--f:${KAT[kat(r[2])].fg}">${fmt(Math.round(r[2]))} µg/m³</span>`},
      {k: "kat", n: "Kategori", v: r => kat(r[2]), h: r => pilKat(kat(r[2]))},
      {k: "maks", n: "Puncak per jam", num: 1, v: r => r[3], h: r => fmt(Math.round(r[3])) + " µg/m³"},
      {k: "ts", n: "Jiwa tidak sehat", num: 1, v: r => r[5], h: r => r[5] ? kr(r[5]) + " jiwa" : "–"}];
    return this.exM(`${this.hl(esc(top[1]))} paling tercemar ${this.kapan(h)}: PM2,5 ${this.hl(fmt(Math.round(top[2])) + " µg/m³")} rata-rata 24 jam${ts ? `, ${this.hl(jiwa(ts))} menghirup udara tidak sehat` : ""}`, "", "",
      this.tabel("kab", kol, R, r => `data-prov="${r[0]}"`, 10, "kabupaten/kota", r => r[2]), "Sumber: Copernicus CAMS lewat Open-Meteo, WorldPop", this.segHari("kabHari")); },

  /* 3. tren nasional: titik riwayat tiap hari + prakiraan 4 hari */
  exTren() {
    const U = S.uk, m = this.st.tren, nas = U.nasional, nilai = (jiwaTS, rata) => m === "jiwa" ? jiwaTS : rata;
    const lalu = Object.entries(S.rw?.tgl || {}).filter(([t]) => t < U.hari[0]).slice(-20).map(([t, v]) => ({t, v: nilai(v[1], v[2]), depan: false}));
    const ke = nas.map((n, i) => ({t: U.hari[i], v: nilai(n.jiwa[2] + n.jiwa[3] + n.jiwa[4], n.rata), depan: i > 0}));
    const P = [...lalu, ...ke], M = innerWidth < 640, W = M ? 520 : 940, H = 270, a = 44, b = 40, mx = Math.max(1, ...P.map(p => p.v)) * 1.18;
    const X = i => 40 + i * (W - 80) / Math.max(1, P.length - 1), Y = v => H - b - v / mx * (H - a - b), tx = v => m === "jiwa" ? jt(v) : fmt(Math.round(v));
    const jalur = (ps, dari) => ps.map((p, i) => `${i ? "L" : "M"}${X(dari + i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join("");
    const nLalu = lalu.length + 1;
    const g = `<path d="${jalur(P.slice(0, nLalu), 0)}" fill="none" stroke="${KAT[2].w}" stroke-width="3"/><path d="${jalur(P.slice(nLalu - 1), nLalu - 1)}" fill="none" stroke="${KAT[2].w}" stroke-width="3" stroke-dasharray="7 6"/>`
      + P.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.v)}" r="5" fill="${p.depan ? "var(--card)" : KAT[2].w}" stroke="${KAT[2].w}" stroke-width="2.5" data-tip="<b>${tglIns(p.t)}</b>${p.depan ? " · prakiraan" : ""}<br>${m === "jiwa" ? "Jiwa tidak sehat" : "PM2,5 rata-rata"}: ${m === "jiwa" ? jiwa(p.v) : fmt(Math.round(p.v)) + " µg/m³"}"/>`
        + `<text x="${X(i)}" y="${Y(p.v) - 12}" text-anchor="middle" font-size="${M ? 13 : 12}" font-weight="700">${tx(p.v)}</text><text x="${X(i)}" y="${H - 14}" text-anchor="middle" font-size="${M ? 12 : 11}" translate="no">${tglIns(p.t)}</text>`).join("");
    const v0 = ke[0].v, v1 = ke[ke.length - 1].v, arah = v1 > v0 ? "naik" : "turun";
    Kartu.leg([[KAT[2].w, "Garis putus-putus: prakiraan"]]);
    return this.exM(Math.abs(v1 - v0) < (m === "jiwa" ? 5e5 : 2) ? `${m === "jiwa" ? "Jiwa di udara tidak sehat" : "PM2,5 rata-rata nasional"} ${this.hl("hampir tetap")} sampai ${tglIns(ke[ke.length - 1].t)}: ${this.hl(tx(v1) + (m === "jiwa" ? " jiwa" : " µg/m³"))}`
      : `${m === "jiwa" ? "Jiwa di udara tidak sehat" : "PM2,5 rata-rata nasional"} ${arah} dari ${this.hl(tx(v0))} hari ini ke ${this.hl(tx(v1) + (m === "jiwa" ? " jiwa" : " µg/m³"))} pada ${tglIns(ke[ke.length - 1].t)}`, "", "",
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tren nasional">${g}</svg>`, "Sumber: Copernicus CAMS lewat Open-Meteo, WorldPop", this.seg("tren", [["jiwa", "Jiwa tidak sehat"], ["rata", "PM2,5 rata-rata"]])); },

  /* 4. jarak pandang bandara; tanpa laporan segar atau semuanya jernih = kartu dibuang */
  exJarak() {
    const seg = metarSegar(), m = seg.filter(x => x.vis_m < 8000 || x.asap).sort((a, b) => a.vis_m - b.vis_m); if (!m.length) return "";
    const rendah = m.filter(x => x.vis_m < 5000).length, asap = m.filter(x => x.asap).length, M = innerWidth < 640, W = M ? 520 : 940, L = M ? 140 : 210, rh = 30, X = v => Math.min(v, 10000) / 10000 * (W - L - 130);
    const g = m.map((x, i) => { const y = i * rh, k = kelasJP(x.vis_m), w = wxNama(x.wx), km = x.vis_m >= 9999 ? "10 km+" : fmt(x.vis_m / 1000) + " km";
      return `<g><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="13" font-weight="600" translate="no">${esc(x.nama.replace(/ (Intl|Arpt|Airport)$/i, ""))}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(x.vis_m))}" height="${rh - 10}" fill="${JP[k].w}" data-tip="<b>${esc(x.nama)}</b> · ${esc(x.icao)}<br>Jarak pandang: ${km}${w ? `<br>Cuaca: ${w}` : ""}<br>Laporan: ${jamWIB(x.waktu)}"/>
        <g class="gf" style="--i:${i}">${Kartu.pil(L + Math.max(3, X(x.vis_m)) + 8, y + 5, km + (w ? " · " + w : ""), JP[k].w, k === 1 ? "#3b2e00" : "#fff")[0]}</g></g>`; }).join("");
    Kartu.leg(JP.map(j => [j.w, j.n]));
    const terbaru = jamWIB(Math.max(...seg.map(x => +new Date(x.waktu))));
    return Kartu.ex(rendah ? `${this.hl(fmt(rendah) + " bandara")} melapor jarak pandang di bawah 5 km${asap ? `, ${fmt(asap)} di antaranya berasap` : ""}` : `${this.hl(fmt(m.length) + " bandara")} melapor jarak pandang berkurang${asap ? `, ${fmt(asap)} berasap` : ""}`, "", "",
      `<svg viewBox="0 0 ${W} ${m.length * rh + 6}" role="img" aria-label="Jarak pandang bandara">${g}</svg>`, `Sumber: NOAA Aviation Weather (METAR), ${terbaru}`); },

  tabel(id, kol, baris, atribut, per, satuan, awal) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut), f = kk ? kk.v : awal;
    const R = [...baris].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik" ${atribut(r)}>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },
  gambar(id) { return ({jiwa: () => this.exJiwa(), kab: () => this.exKab(), tren: () => this.exTren(), jarak: () => this.exJarak()})[id](); },
  pasang(box) {
    const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasang(box); }); },
  render() {
    const el = $("#insight");
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasang(b));
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s && s.tagName !== "SELECT") { this.st[s.dataset.set] = s.dataset.v; return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; halUrgen(pg, box); this.ulang(box); } return; }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); nanti(() => Peta.pilihProv(pv.dataset.prov)); } };
  },
};
