"use strict";
/* ================================================================ tren cuaca ekstrem */
/* Tab Tren: kartu bergaya Insight (Kartu.kartu di public/inti), tabel standar (kepala gelap, urut, paginasi), rupa sama dengan Tren karhutla dan banjir.
   Data: ../banjir/data/cuaca_riwayat.json (scripts/cuaca/cuaca.py: satu titik per hari, tumbuh tiap jalan; hari lampau = analisis model, bukan alat ukur)
   dan kejadian tahunan cuaca ekstrem BNPB/DIBI dari ../banjir/data/cuaca_dampak.json. Kartu tanpa data dibuang (A18): riwayat harian baru muncul bila >= 2 hari.
   Peringatan nowcast BMKG tidak ada di sini: nowcast hidup 2-3 jam dan berkasnya terbit sekali sehari, jadi hitungan per hari tidak pernah lengkap. */
const Grafik = {
  MERAH: "#c9503a", BLN: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  tgl: (t, o = {day: "numeric", month: "short"}) => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", o),
  /* batang tegak (bertumpuk bila seri > 1): cat = label sumbu, seri = [[nama, warna]], nilai[i] = angka tiap seri, tip(i) = isi tooltip.
     Puncak diberi pil merah, selain itu angka total tertulis di atas batang (A8). Layar sempit menggulir ke samping, huruf tidak mengecil. */
  kolom({cat, seri, nilai, tip, aria = "Grafik", fmtNilai = fmt, pudar = () => false}) {
    const M = innerWidth < 640, n = cat.length, W = M ? Math.max(350, n * 24 + 60) : 940, L = 44, R = 20, T = 36, B = 236, gap = (W - L - R) / n, bw = gap * .72;
    const tot = nilai.map(v => v.reduce((a, b) => a + b, 0)), mx = Math.max(1, ...tot), Y = v => B - v / mx * (B - T), puncak = tot.indexOf(Math.max(...tot)), fs = n > 40 ? 8.5 : n > 24 ? 9.5 : 10.5, langkah = Math.ceil(n / (M ? 9 : 14));
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${W - R}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += cat.map((c, i) => { const x = L + i * gap + (gap - bw) / 2; let y0 = B, bar = "";
      nilai[i].forEach((v, k) => { if (!v) return; const h = v / mx * (B - T); y0 -= h; bar += `<rect x="${x}" y="${y0}" width="${bw}" height="${Math.max(1, h)}" rx="${seri.length > 1 ? 0 : Math.min(4, bw / 3)}" fill="${seri[k][1]}" opacity="${pudar(i) ? .5 : .93}"/>`; });
      const lbl = fmtNilai(tot[i]), pw = lbl.length * 11 * .6 + 16;
      return `<g class="gy" style="--i:${i}" data-tip="${esc(tip(i))}">${bar}<rect x="${x - (gap - bw) / 2}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/></g>`
        + (i === puncak && tot[i] ? Kartu.pil(x + bw / 2 - pw / 2, Y(tot[i]) - 26, lbl, Grafik.MERAH, "#fff", 11)[0] : tot[i] ? `<text x="${x + bw / 2}" y="${Y(tot[i]) - 6}" text-anchor="middle" font-size="${fs}" font-weight="700" opacity=".75" pointer-events="none">${lbl}</text>` : "")
        + (i % langkah === 0 ? `<text x="${x + bw / 2}" y="${B + 16}" text-anchor="middle" font-size="10.5" opacity=".7">${c}</text>` : ""); }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${W} ${B + 24}" style="min-width:${M ? W : 0}px" role="img" aria-label="${aria}">${g}</svg></div>`; },
  gulir: el => el.querySelectorAll(".tw.sk").forEach(w => { w.scrollLeft = w.scrollWidth; }),
};
const BNPB = {kejadian: ["Kejadian", "kejadian"], terdampak: ["Terdampak", "jiwa"], mengungsi: ["Mengungsi", "jiwa"], rumah_rusak: ["Rumah rusak", "rumah"], meninggal: ["Meninggal", "jiwa"]};
const SUMBER_BNPB = "BNPB dan DIBI BNPB";
const BLN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MUSIM_ONI = {DJF: "Des sampai Feb", JFM: "Jan sampai Mar", FMA: "Feb sampai Apr", MAM: "Mar sampai Mei", AMJ: "Apr sampai Jun", MJJ: "Mei sampai Jul", JJA: "Jun sampai Agu", JAS: "Jul sampai Sep", ASO: "Agu sampai Okt", SON: "Sep sampai Nov", OND: "Okt sampai Des", NDJ: "Nov sampai Jan"};

const Tren = {
  st: {rentang: "30", bnpb: "kejadian"}, T: {provinsi: {urut: "hari", turun: true, hal: 0}},
  R: undefined, D: undefined, M: undefined,
  hari() { const N = +this.st.rentang; return Object.keys(this.R.tgl).sort().slice(-N); },
  tampilSeg: () => Tren.R && Object.keys(Tren.R.tgl).length > 14,

  /* sel prakiraan 0,25 derajat (kotak sekitar 28 km) per hari: ambang BMKG hujan lebat 50 / 100 / 150 mm */
  exHujan() {
    const h = this.hari(); if (h.length < 2) return "";
    const nilai = h.map(t => this.R.tgl[t].slice(0, 3)), tot = nilai.map(v => v[0] + v[1] + v[2]), pk = tot.indexOf(Math.max(...tot));
    if (!tot[pk]) return `${this.kartu("Hujan lebat", `Tidak ada hujan 50 mm atau lebih dalam ${h.length} hari terakhir menurut model`, "", "Open-Meteo", this.segRentang())}`;
    const nama = i => Grafik.tgl(h[i], {weekday: "long", day: "numeric", month: "long"});
    return this.kartu("Hujan lebat", `${Kartu.hl(fmt(tot[pk]) + " area")} berhujan lebat (50 mm atau lebih) pada ${Kartu.hl(Grafik.tgl(h[pk]))}, terbanyak dalam ${fmt(h.length)} hari terakhir`,
      Grafik.kolom({cat: h.map(t => Grafik.tgl(t, {day: "numeric", month: "short"})), seri: [["Lebat", "#c99a1e"], ["Sangat lebat", "#e58a45"], ["Ekstrem", "#c9503a"]], nilai, aria: "Area berhujan lebat per hari",
        tip: i => `<b>${nama(i)}</b><br>Lebat 50 sampai 100 mm: ${fmt(nilai[i][0])} area<br>Sangat lebat 100 sampai 150 mm: ${fmt(nilai[i][1])} area<br>Ekstrem 150 mm atau lebih: ${fmt(nilai[i][2])} area<br>Terlebat: ${fmt(this.R.tgl[h[i]][6])} mm<br><small>1 area = kotak prakiraan 28 km</small>`}),
      "Open-Meteo, analisis dan prakiraan model", this.segRentang(), [["#c99a1e", "lebat"], ["#e58a45", "sangat lebat"], ["#c9503a", "ekstrem"]]); },
  /* embusan angin: ambang 54 / 72 / 90 km/jam */
  exAngin() {
    const h = this.hari(); if (h.length < 2) return "";
    const nilai = h.map(t => this.R.tgl[t].slice(3, 6)), tot = nilai.map(v => v[0] + v[1] + v[2]), pk = tot.indexOf(Math.max(...tot)); if (!tot[pk]) return "";
    const nama = i => Grafik.tgl(h[i], {weekday: "long", day: "numeric", month: "long"});
    return this.kartu("Angin", `${Kartu.hl(fmt(tot[pk]) + " area")} berembusan kencang (54 km/jam atau lebih) pada ${Kartu.hl(Grafik.tgl(h[pk]))}, terbanyak dalam ${fmt(h.length)} hari terakhir`,
      Grafik.kolom({cat: h.map(t => Grafik.tgl(t, {day: "numeric", month: "short"})), seri: [["Waspada", "#c99a1e"], ["Siaga", "#e58a45"], ["Awas", "#c9503a"]], nilai, aria: "Area berembusan kencang per hari",
        tip: i => `<b>${nama(i)}</b><br>Waspada 54 sampai 72 km/jam: ${fmt(nilai[i][0])} area<br>Siaga 72 sampai 90 km/jam: ${fmt(nilai[i][1])} area<br>Awas 90 km/jam atau lebih: ${fmt(nilai[i][2])} area<br>Terkuat: ${fmt(this.R.tgl[h[i]][7])} km/jam<br><small>1 area = kotak prakiraan 28 km</small>`}),
      "Open-Meteo, analisis dan prakiraan model", this.segRentang(), [["#c99a1e", "waspada"], ["#e58a45", "siaga"], ["#c9503a", "awas"]]); },
  /* provinsi: berapa hari melewati ambang dalam rentang */
  exProvinsi() {
    const h = this.hari(); if (h.length < 2) return ""; Insight.T.tren_prov = this.T.provinsi;   /* Insight.tabel memakai Insight.T[id]: satu keadaan urut/halaman */
    const R = Object.entries(this.R.prov).map(([k, d]) => { const v = h.map(t => d[t]).filter(Boolean);
      return {k, hari: v.filter(x => x[0] >= 50).length, mm: Math.max(0, ...v.map(x => x[0])), hariA: v.filter(x => x[1] >= 54).length, kmj: Math.max(0, ...v.map(x => x[1]))}; }).filter(r => r.hari || r.hariA);
    if (!R.length) return "";
    const pl = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`, kol = [
      {k: "prov", n: "Provinsi", v: r => namaProv(r.k), h: r => `<span translate="no">${esc(namaProv(r.k))}</span>`},
      {k: "hari", n: "Hari hujan lebat", num: 1, v: r => r.hari, h: r => r.hari ? pl(fmt(r.hari) + " hari", warnaHujan(50)) : "–"},
      {k: "mm", n: "Hujan terlebat", num: 1, v: r => r.mm, h: r => pl(fmt(r.mm) + " mm", warnaHujan(r.mm))},
      {k: "hariA", n: "Hari embusan kencang", num: 1, v: r => r.hariA, h: r => r.hariA ? pl(fmt(r.hariA) + " hari", warnaAngin(54)) : "–"},
      {k: "kmj", n: "Embusan terkuat", num: 1, v: r => r.kmj, h: r => pl(fmt(r.kmj) + " km/jam", warnaAngin(r.kmj))}];
    const top = [...R].sort((a, b) => b.hari - a.hari || b.mm - a.mm)[0];
    return this.kartu("Provinsi", `${Kartu.hl(fmt(R.length) + " provinsi")} punya hari hujan lebat atau embusan kencang dalam ${fmt(h.length)} hari terakhir${top.hari ? `; terbanyak hujan lebat ${Kartu.hl(esc(namaProv(top.k)))} (${fmt(top.hari)} hari)` : ""}`,
      Insight.tabel("tren_prov", kol, R, 10, "provinsi"), "Open-Meteo, analisis dan prakiraan model"); },
  /* kejadian cuaca ekstrem per tahun menurut BNPB (angin puting beliung dan sejenisnya) */
  exBnpb() {
    const N = this.D?.tahunan?.nasional, th = N && Object.keys(N).sort(); if (!th || th.length < 2) return "";
    const ada = Object.keys(BNPB).filter(k => th.some(t => N[t][k] != null)); if (!ada.length) return "";
    if (!ada.includes(this.st.bnpb)) this.st.bnpb = ada[0];
    const k = this.st.bnpb, [nm, sat] = BNPB[k], v = t => N[t][k] ?? 0, akhir = th.at(-1), pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), ber = akhir >= String(new Date().getFullYear());
    return this.kartu("Per tahun", `${Kartu.hl(fmt(v(pk)) + " " + sat)}${k === "kejadian" ? "" : " " + nm.toLowerCase()} akibat cuaca ekstrem pada ${Kartu.hl(pk)}, tertinggi sejak ${th[0]}${ber ? ` (${akhir} belum penuh)` : ""}`,
      Grafik.kolom({cat: th.map(t => "'" + String(t).slice(2)), seri: [[nm, "#7d8ca3"]], nilai: th.map(t => [v(t)]), aria: nm + " per tahun",
        tip: i => `<b>${th[i]}${ber && th[i] === akhir ? " (berjalan)" : ""}</b><br>${nm}: ${fmt(v(th[i]))} ${sat}`}),
      `${SUMBER_BNPB}, ${th[0]} sampai ${akhir}; hanya angka yang tercatat`, Kartu.seg("bnpb", ada.map(x => [x, BNPB[x][0]]), this.st)); },

  /* kalender bulanan: kejadian cuaca dan gelombang ekstrem DIBI di satu tahun penuh (cuaca_musim.json, scripts/cuaca/musim.py). Tanpa klaim musim: satu tahun, dan DIBI telat lapor */
  exMusim() {
    const M = this.M?.bulan; if (!M) return "";
    const c = M.cuaca, g = M.gelombang, tot = c.map((v, i) => v + g[i]), N = tot.reduce((a, b) => a + b, 0), th = this.M.tahun_bulan; if (!N) return "";
    const pk = tot.indexOf(Math.max(...tot)), ur = tot.map((v, i) => i).sort((a, b) => tot[b] - tot[a]), nama = i => BLN_PENUH[i];
    return this.kartu("Kalender musim", `${Kartu.hl(nama(pk) + " " + th)} bulan terbanyak kejadian cuaca dan gelombang ekstrem (${Kartu.hl(fmt(tot[pk]))}), disusul ${nama(ur[1])} (${fmt(tot[ur[1]])})`,
      Grafik.kolom({cat: Grafik.BLN, seri: [["Cuaca ekstrem", "#c99a1e"], ["Gelombang ekstrem", "#3f7fb8"]], nilai: c.map((v, i) => [v, g[i]]), aria: "Kejadian cuaca ekstrem per bulan",
        tip: i => `<b>${nama(i)} ${th}</b><br>Cuaca ekstrem: ${fmt(c[i])} kejadian<br>Gelombang ekstrem: ${fmt(g[i])} kejadian`}),
      `${SUMBER_BNPB}, tahun ${th} saja (2024 tidak lengkap, 2026 belum lengkap); hanya yang dilaporkan, pelaporan sering terlambat`, "", [["#c99a1e", "cuaca ekstrem"], ["#3f7fb8", "gelombang ekstrem"]]); },
  /* ENSO: kejadian cuaca dan gelombang ekstrem per tahun, diwarnai fase ENSO tahun itu (rata-rata ONI setahun, NOAA CPC); hanya mempertemukan dua deret, tidak menilai sebab */
  exEnso() {
    const T = this.M?.tahun, th = T && Object.keys(T).sort(); if (!th || th.length < 5) return "";
    const FASE = [["El Niño", "#c9503a"], ["Netral", "#9aa4b2"], ["La Niña", "#3f7fb8"]], pk = th.reduce((a, t) => T[t].n > T[a].n ? t : a, th[0]), K = this.M.kini || {}, o = K.oni;
    const f2 = v => (v > 0 ? "+" : "") + v.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}), nEl = th.filter(t => T[t].fase === "El Niño").length;
    return this.kartu("ENSO", `${Kartu.hl(fmt(T[pk].n) + " kejadian")} cuaca dan gelombang ekstrem pada ${Kartu.hl(pk)} (${T[pk].fase}), tertinggi sejak ${th[0]}${K.status && o ? `; ENSO kini ${Kartu.hl(K.status)}, ONI ${f2(o.nilai)} (${MUSIM_ONI[o.musim] || o.musim} ${o.tahun})` : ""}`,
      Grafik.kolom({cat: th.map(t => "'" + t.slice(2)), seri: FASE, nilai: th.map(t => FASE.map(([f]) => T[t].fase === f ? T[t].n : 0)), aria: "Kejadian cuaca ekstrem per tahun menurut fase ENSO",
        tip: i => `<b>${th[i]}</b><br>${fmt(T[th[i]].n)} kejadian<br>Fase ${T[th[i]].fase}, ONI rata-rata ${f2(T[th[i]].oni)}`}),
      `${SUMBER_BNPB} ${th[0]} sampai ${th.at(-1)}; ONI NOAA CPC rata-rata setahun kalender (El Niño +0,5 atau lebih, La Niña -0,5 atau kurang); jumlah tercatat juga naik karena pelaporan makin lengkap`,
      "", FASE.map(([f, w]) => [w, f])); },

  segRentang() { return this.tampilSeg() ? Kartu.seg("rentang", [["14", "14 hari"], ["30", "30 hari"], ["90", "90 hari"]], this.st) : ""; },
  kartu(ey, judul, isi, sumber, ctl = "", leg = null) { return Kartu.kartu(`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[this.IKON[ey]] || ""}</svg>${ey}`, judul, isi, sumber, ctl, leg); },
  IKON: {"Hujan lebat": "hujan", Angin: "angin", Provinsi: "provinsi", "Per tahun": "ansambel", "Kalender musim": "peluang", ENSO: "siklon"},
  EX: ["hujan", "angin", "provinsi", "bnpb", "musim", "enso"],
  gambar(id) { Kartu._leg = null; try { return this["ex" + id[0].toUpperCase() + id.slice(1)]() || ""; } catch (e) { console.error(e); return ""; } },
  tulis() { const el = $("#tren"), h = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.innerHTML = h; Grafik.gulir(el); },
  async render() {
    const el = $("#tren"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s)); return nanti(() => this.tulis()); }
        const pg = e.target.closest(".pgn-b[data-h]"); if (pg && !pg.disabled) { this.T.provinsi.hal = +pg.dataset.h; const box = pg.closest("[data-ex]"); return nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); }
        const th = e.target.closest("th button[data-k]"); if (th) { const st = this.T.provinsi, k = th.dataset.k; st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0; const box = th.closest("[data-ex]"); nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); } }); }
    if (!this.R && !this.D && !this.M) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren cuaca…</div>`;
      [this.R, this.D, this.M] = await Promise.all([muatJSON("../banjir/data/cuaca_riwayat.json").catch(() => null), muatJSON("../banjir/data/cuaca_dampak.json").catch(() => null), muatJSON("../banjir/data/cuaca_musim.json").catch(() => null)]); }
    this.tulis();
    if (!el.textContent.trim()) el.innerHTML = `<div class="kosong">Data tren cuaca belum tersedia.</div>`; },
};
