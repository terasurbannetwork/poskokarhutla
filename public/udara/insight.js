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
  st: {hari: 0, kabHari: 0, asalK: ""},
  EX: ["jiwa", "kab", "pel", "asal", "jarak"],
  PL: null, AS: null,   /* peluang.json dan asal.json, dimuat sekali di render() */
  T: {kab: {urut: "_", turun: true, hal: 0}},
  hl: Kartu.hl,
  /* pil kategori (ikon + nama) di samping pil "perkiraan model CAMS, belum dikoreksi": tiap kartu berangka jiwa/PM2,5 membawa label model */
  IK: {pel: '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/>', asal: '<path d="M4 20c4 0 4-8 8-8s4-8 8-8"/><circle cx="4" cy="20" r="1.5"/><circle cx="20" cy="4" r="1.5"/>', jiwa: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>', kab: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', jarak: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'},
  eyIk: (id, nama) => `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Insight.IK[id]}</svg>${nama}`,
  exM: (id, nama, ...a) => Kartu.ex(...a).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk(id, nama)}</span>${PIL_MODEL}`),
  seg(key, opsi) { return Kartu.seg(key, opsi, this.st); },
  segHari: function (key) { return this.seg(key, hariTampil().map(i => [i, labelHari(i)])); },
  kapan: h => labelHari(h) === "Hari ini" ? "hari ini" : `<span translate="no">${tglPendek(S.uk.hari[h])}</span>`,
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
    return this.exM("jiwa", "Jiwa terpapar", ts ? `${this.hl(jiwa(ts))} menghirup udara tidak sehat (PM2,5 di atas 55,4 µg/m³) di ${this.hl(fmt(semua.length) + " provinsi")} ${this.kapan(h)}, menurut model` : `Tidak ada provinsi dengan udara tidak sehat ${this.kapan(h)}`, "", "",
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
      {k: "maks", n: "Puncak per jam", num: 1, v: r => r[3], h: r => r[3] == null ? "–" : fmt(Math.round(r[3])) + " µg/m³"},
      {k: "ts", n: "Jiwa tidak sehat", num: 1, v: r => r[5], h: r => r[5] ? kr(r[5]) + " jiwa" : "–"}];
    return this.exM("kab", "Kabupaten/kota", `${this.hl(esc(top[1]))} paling tercemar ${this.kapan(h)}: PM2,5 ${this.hl(fmt(Math.round(top[2])) + " µg/m³")} rata-rata 24 jam${ts ? `, ${this.hl(jiwa(ts))} menghirup udara tidak sehat` : ""}`, "", "",
      this.tabel("kab", kol, R, r => `data-prov="${r[0]}"`, 10, "kabupaten/kota", r => r[2]), "Sumber: Copernicus CAMS lewat Open-Meteo, WorldPop", this.segHari("kabHari")); },

  /* 2b. peluang PM2,5 melewati batas status per kab/kota (peluang.json, kontrak peluang/1; mesin public/inti/peluang.js). Tanpa berkas = dibuang. */
  exPel() {
    if (typeof Peluang === "undefined" || !this.PL) return "";
    this.st.pelW ??= Object.entries(this.PL.wilayah).map(([k, w]) => [k, Math.max(0, ...w.hari.map(h => h.p?.[0] ?? 0))]).sort((a, b) => b[1] - a[1])[0]?.[0];   /* awal: kota dengan peluang tertinggi */
    return Peluang.kartu(this.PL, {ey: this.eyIk("pel", "Peluang PM2,5"), st: this.st, kunci: "pel", kejadian: "PM2,5", sumber: "Copernicus CAMS lewat Open-Meteo, sebaran asumsi Centurisk97"}).replace("</span>", "</span>" + PIL_MODEL); },

  /* 2c. asal asap per kota (asal.json): batang mendatar persen per provinsi asal dari lintasan angin mundur */
  exAsal() {
    const A = this.AS?.kota; if (!A || !Object.keys(A).length) return "";
    const kode = Object.keys(A).sort((a, b) => A[a].nama.localeCompare(A[b].nama, "id"));
    const teratas = (S.uk.kab[+this.st.kabHari] || S.uk.kab[S.h0] || []).map(r => kode.find(c => A[c].nama === r[1])).find(Boolean);
    const pilih = A[this.st.asalK] ? this.st.asalK : teratas || kode[0], k = A[pilih], pv = k.prov_asal;
    const M = innerWidth < 640, W = M ? 520 : 940, L = M ? 130 : 190, rh = 30, fs = M ? 14 : 13, mx = Math.max(1, ...pv.map(x => x[1])), X = v => v / mx * (W - L - 90);
    const g = pv.map(([p, v], i) => { const y = i * rh, nm = M ? namaProv(p).replace("Kalimantan", "Kal.").replace("Sumatera", "Sum.").replace("Sulawesi", "Sul.").replace("Nusa Tenggara", "NT") : namaProv(p), bw = Math.max(3, X(v));
      return `<g data-prov="${p}" style="cursor:pointer"><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="${fs}" font-weight="600" translate="no">${esc(nm)}</text>`
        + `<rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${bw}" height="${rh - 10}" fill="#c9503a" data-tip="<b>${esc(namaProv(p))}</b><br>${v}% dari api yang dilewati jalur angin"/>`
        + `<g class="gf" style="--i:${i}">${Kartu.pil(L + bw + 8, y + 5, v + "%", "#c9503a", "#fff")[0]}</g></g>`; }).join("");
    const judul = esc(k.kalimat).replace(/\d+%/g, Kartu.hl);
    return this.exM("asal", "Asal asap", judul, "", "", `<svg viewBox="0 0 ${W} ${pv.length * rh + 6}" role="img" aria-label="Asal asap ${esc(k.nama)} per provinsi">${g}</svg>`,
      "Sumber: Open-Meteo (angin), NASA FIRMS VIIRS, perkiraan Centurisk97", Kartu.selProv("asalK", "Kota paling tercemar", kode, c => A[c].nama, {asalK: pilih === teratas && !this.st.asalK ? "" : pilih})); },

  /* 3. jarak pandang bandara; tanpa laporan segar atau semuanya jernih = kartu dibuang */
  exJarak() {
    const seg = metarSegar(), m = seg.filter(x => x.vis_m < 8000 || x.asap).sort((a, b) => a.vis_m - b.vis_m); if (!m.length) return "";
    const rendah = m.filter(x => x.vis_m < 5000).length, asap = m.filter(x => x.asap).length, M = innerWidth < 640, W = M ? 520 : 940, L = M ? 140 : 210, rh = 30, X = v => Math.min(v, 10000) / 10000 * (W - L - 130);
    const g = m.map((x, i) => { const y = i * rh, k = kelasJP(x.vis_m), w = wxNama(x.wx), km = x.vis_m >= 9999 ? "10 km+" : fmt(x.vis_m / 1000) + " km";
      return `<g><text x="${L - 10}" y="${y + 19}" text-anchor="end" font-size="13" font-weight="600" translate="no">${esc(x.nama.replace(/ (Intl|Arpt|Airport)$/i, ""))}</text>
        <rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(3, X(x.vis_m))}" height="${rh - 10}" fill="${JP[k].w}" data-tip="<b>${esc(x.nama)}</b>, ${esc(x.icao)}<br>Jarak pandang: ${km}${w ? `<br>Cuaca: ${w}` : ""}<br>Laporan: ${jamWIB(x.waktu)}"/>
        <g class="gf" style="--i:${i}">${Kartu.pil(L + Math.max(3, X(x.vis_m)) + 8, y + 5, km + (w ? ", " + w : ""), JP[k].w, k === 1 ? "#3b2e00" : "#fff")[0]}</g></g>`; }).join("");
    Kartu.leg(JP.map(j => [j.w, j.n]));
    const terbaru = jamWIB(Math.max(...seg.map(x => +new Date(x.waktu))));
    return Kartu.ex(rendah ? `${this.hl(fmt(rendah) + " bandara")} melapor jarak pandang di bawah 5 km${asap ? `, ${fmt(asap)} di antaranya berasap` : ""}` : `${this.hl(fmt(m.length) + " bandara")} melapor jarak pandang berkurang${asap ? `, ${fmt(asap)} berasap` : ""}`, "", "",
      `<svg viewBox="0 0 ${W} ${m.length * rh + 6}" role="img" aria-label="Jarak pandang bandara">${g}</svg>`, `Sumber: NOAA Aviation Weather (METAR), ${terbaru}`).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk("jarak", "Jarak pandang")}</span>`); },

  tabel(id, kol, baris, atribut, per, satuan, awal) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut), f = kk ? kk.v : awal;
    const R = [...baris].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik" ${atribut(r)}>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },
  gambar(id) { return ({jiwa: () => this.exJiwa(), kab: () => this.exKab(), pel: () => this.exPel(), asal: () => this.exAsal(), jarak: () => this.exJarak()})[id](); },
  pasang(box) {
    const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasang(box); }); },
  async render() {
    const el = $("#insight");
    if (typeof Peluang !== "undefined") [this.PL, this.AS] = await Promise.all([Peluang.muat("data/peluang.json"), fetch("data/asal.json").then(r => r.ok ? r.json() : null).catch(() => null)]); if (this.st.hari < S.h0) this.st.hari = this.st.kabHari = S.h0;
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    Cerita.sisip(el, "udara");
    el.querySelectorAll("[data-ex]").forEach(b => this.pasang(b));
    el.addEventListener("change", e => { const s = e.target.closest("select[data-set]"); if (s) { this.st[s.dataset.set] = s.value; this.ulang(s.closest("[data-ex]")); } });
    el.onclick = e => {
      const s = e.target.closest("[data-set]"); if (s && s.tagName !== "SELECT") { this.st[s.dataset.set] = s.dataset.v; return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; halUrgen(pg, box); this.ulang(box); } return; }
      const pv = e.target.closest("[data-prov]"); if (pv) { bukaTab("peta"); nanti(() => Peta.pilihProv(pv.dataset.prov)); } };
  },
};
/* kartu Cerita (inti/cerita.js): tahun-tahun titik panas terbanyak sejak 2019 menurut fase ENSO, dari data/musim_asap.json (FIRMS, ONI NOAA CPC). Titik panas = penyebab asap, bukan ukuran asapnya. */
Cerita.daftar("udara", async () => { const D = await muatJSON("data/musim_asap.json").catch(() => null), T = D?.tahun; if (!T) return null;
  const tuntas = Object.keys(T).filter(y => !T[y].sementara).sort((a, b) => T[b].n - T[a].n), y = tuntas[0], z = Object.keys(T).find(k => T[k].sementara), th = Object.keys(T).sort(); if (!y) return null;
  const baris = [["#b5651d", "Pernah terjadi", `Tahun ${y} (${T[y].fase}) mencatat ${fmt(T[y].n)} titik panas di Indonesia, paling banyak di antara ${th[0]} sampai ${Math.max(...tuntas.map(Number))}.`]];
  if (tuntas[1]) baris.push(["#6b7fa3", "Pembanding", `Tahun ${tuntas[1]} (${T[tuntas[1]].fase}) mencatat ${fmt(T[tuntas[1]].n)} titik panas; tahun La Niña ${tuntas.filter(k => T[k].fase === "La Niña").map(k => `${k} hanya ${fmt(T[k].n)}`).join(", ")}.`]);
  if (z) baris.unshift(["#c9503a", "Tahun ini", `Per ${new Date(D.sd + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long"})} tahun ${z} (${T[z].fase}) sudah mencatat ${fmt(T[z].n)} titik panas, angka sementara.`]);
  return {judul: z && T[z].n > T[y].n ? `${Kartu.hl("sekitar " + Cerita.kata(T[z].n) + " titik panas")} sudah tercatat pada ${z} (sementara), melampaui ${y} (sekitar ${Cerita.kata(T[y].n)}), tertinggi dari ${th[0]} sampai ${Math.max(...tuntas.map(Number))}` : `${Kartu.hl("sekitar " + Cerita.kata(T[y].n) + " titik panas")} pada ${y}, tahun terbanyak sejak ${th[0]}, saat ${T[y].fase}`, baris, sumber: "NASA FIRMS, MODIS C6.1 + VIIRS S-NPP + VIIRS NOAA-20, hanya titik di daratan Indonesia; ONI NOAA CPC"}; });
