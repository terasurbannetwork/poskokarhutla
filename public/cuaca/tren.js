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

  /* Logbook Pusdalops BNPB (public/data/logbook_riwayat.json, kalender_risiko.json): kejadian cuaca ekstrem yang DILAPORKAN. Tahun dasar dibaca dari berkas (tahun_penuh), bukan ditulis tetap.
     Tahun belum penuh dipudarkan; angka korban logbook tidak dipakai (lihat DIBI). */
  LB: undefined, KAL: undefined,
  rentangTh(a) { const r = []; a.forEach((y, i) => i && y === a[i - 1] + 1 ? r[r.length - 1][1] = y : r.push([y, y])); const s = r.map(([x, z]) => x === z ? `${x}` : `${x} sampai ${z}`); return s.length < 3 ? s.join(" dan ") : `${s.slice(0, -1).join(", ")}, dan ${s.at(-1)}`; },
  exLogTahun() {
    const L = this.LB, N = L?.nasional, th = N && Object.keys(N).filter(t => N[t].cuaca != null).sort(); if (!th || th.length < 3) return "";
    const penuh = new Set((L.tahun_penuh || []).map(String)), v = t => N[t].cuaca, pk = th.reduce((a, t) => v(t) > v(a) ? t : a, th[0]), akhir = th.at(-1), hari = L.hari_tercatat || {};
    return this.kartu("Logbook", `${Kartu.hl(fmt(v(pk)) + " kejadian")} cuaca ekstrem dilaporkan pada ${Kartu.hl(pk)}, tertinggi dari ${th[0]} sampai ${akhir} menurut logbook Pusdalops BNPB`,
      Grafik.kolom({cat: th.map(t => "'" + t.slice(2)), seri: [["Cuaca ekstrem", "#c99a1e"]], nilai: th.map(t => [v(t)]), aria: "Kejadian cuaca ekstrem dalam logbook per tahun", pudar: i => !penuh.has(th[i]),
        tip: i => `<b>${th[i]}</b><br>${fmt(v(th[i]))} kejadian dilaporkan${penuh.has(th[i]) ? "" : `<br><small>tahun belum penuh: ${fmt(hari[th[i]] || 0)} hari tercatat</small>`}`}),
      `Logbook Pusdalops BNPB ${th[0]} sampai ${akhir}; kejadian yang dilaporkan; DIBI tahunan juga mencatat lonjakan 2025 (cuaca 756 kejadian pada 2024 menjadi 2.432 pada 2025); batang pudar = tahun belum penuh`); },
  exLogMusim() {
    const L = this.LB, kab = L?.kab && Object.entries(L.kab), tp = (L?.tahun_penuh || []).length; if (!kab || !tp) return "";
    const bln = Array(12).fill(0); kab.forEach(([, d]) => (d.bulan_penuh?.cuaca || []).forEach((n, i) => bln[i] += n)); const N = bln.reduce((a, b) => a + b, 0); if (!N) return "";
    const pk = bln.indexOf(Math.max(...bln)), m = new Date().getMonth(), rng = this.rentangTh(L.tahun_penuh.map(Number).sort((a, b) => a - b));
    const top = kab.map(([k, d]) => ({k, ada: d.tahun_ada?.cuaca?.[m] || 0, n: d.bulan_penuh?.cuaca?.[m] || 0})).filter(r => r.ada > 0).sort((a, b) => b.ada - a.ada || b.n - a.n).slice(0, 8);
    const sering = (this.KAL ? Object.values(this.KAL.kab).filter(d => d.cuaca && !d.cuaca.kecil && d.cuaca.p[m] >= .5).length : 0);
    const nm = k => { const [p, n] = k.split("|"); return `${n} (${namaProv(p)})`; };
    return this.kartu("Musim logbook", `${Kartu.hl(BLN_PENUH[pk])} bulan terbanyak kejadian cuaca ekstrem dilaporkan (${Kartu.hl(fmt(bln[pk]))}) dalam ${fmt(tp)} tahun dasar`,
      Grafik.kolom({cat: Grafik.BLN, seri: [["Cuaca ekstrem", "#c99a1e"]], nilai: bln.map(v => [v]), aria: "Kejadian cuaca ekstrem dalam logbook per bulan", pudar: i => i !== m,
        tip: i => `<b>${BLN_PENUH[i]}</b><br>${fmt(bln[i])} kejadian dalam ${fmt(tp)} tahun dasar`})
      + (top.length ? `<p class="kecil" style="margin:10px 0 4px">${this.KAL ? Kartu.hl(fmt(sering) + " kabupaten/kota") + ` punya cuaca ekstrem tercatat di bulan ${BLN_PENUH[m]} pada separuh tahun dasar atau lebih. ` : ""}Paling langganan bulan ini:</p>`
        + `<div class="lb-baris" style="display:grid;gap:6px">${top.map(r => `<div data-tip="${esc(`${nm(r.k)}: ${fmt(r.ada)} dari ${fmt(tp)} tahun ada kejadian di ${BLN_PENUH[m]}, total ${fmt(r.n)} kejadian`)}" style="cursor:pointer"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><b translate="no">${esc(nm(r.k))}</b><span style="white-space:nowrap">${fmt(r.ada)} dari ${fmt(tp)} tahun</span></div><div style="height:8px;border-radius:4px;background:rgba(125,140,163,.18)"><div style="height:8px;border-radius:4px;background:#c99a1e;width:${r.ada / top[0].ada * 100}%"></div></div></div>`).join("")}</div>` : ""),
      `Logbook Pusdalops BNPB, tahun dasar ${rng}; kalender risiko ${this.KAL ? "dari berkas yang sama" : "belum tersedia"}; kejadian yang dilaporkan, pelaporan tidak merata antar daerah`); },

  /* kalender per kabupaten/kota: rata-rata kejadian cuaca ekstrem yang dilaporkan per bulan (bulan_penuh / tahun dasar), dibanding rata-rata kab/kota se-Indonesia. Pilihan wilayah di this.st.kp / this.st.kk. */
  KAB() { const L = this.LB, tp = (L?.tahun_penuh || []).length; if (!tp) return null;
    const ada = Object.entries(L.kab || {}).filter(([, d]) => d.bulan_penuh?.cuaca?.some(n => n > 0)); if (!ada.length) return null;
    if (!this._kab) { const nas = Array(12).fill(0); ada.forEach(([, d]) => d.bulan_penuh.cuaca.forEach((n, i) => nas[i] += n)); this._kab = {tp, ada, nas: nas.map(n => n / tp / Object.keys(L.kab).length), jml: Object.keys(L.kab).length}; }
    return this._kab; },
  exLogKab() {
    const K = this.KAB(); if (!K) return ""; const {tp, ada, nas, jml} = K, nm = k => k.split("|")[1];
    const prov = [...new Set(ada.map(([k]) => k.split("|")[0]))].sort((a, b) => namaProv(a).localeCompare(namaProv(b)));
    if (!prov.includes(this.st.kp)) this.st.kp = prov[0];
    const daftar = ada.map(([k]) => k).filter(k => k.startsWith(this.st.kp + "|")).sort((a, b) => nm(a).localeCompare(nm(b)));
    if (!daftar.includes(this.st.kk)) this.st.kk = daftar[0];
    const cnt = this.LB.kab[this.st.kk].bulan_penuh.cuaca, tot = cnt.reduce((a, b) => a + b, 0), v = cnt.map(n => n / tp), mx = Math.max(...v, ...nas), pk = cnt.indexOf(Math.max(...cnt)), m = new Date().getMonth(), f1 = n => n.toLocaleString("id-ID", {maximumFractionDigits: 1}), f2 = n => n.toLocaleString("id-ID", {maximumFractionDigits: 2});
    const sel = (id, ops, cur, lbl) => `<select data-kl="${id}" aria-label="${lbl}" style="width:100%">${ops.map(([x, t]) => `<option value="${esc(x)}"${x === cur ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    const sel2 = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">${sel("kp", prov.map(p => [p, namaProv(p)]), this.st.kp, "Provinsi")}${sel("kk", daftar.map(k => [k, nm(k)]), this.st.kk, "Kabupaten atau kota")}</div>`;
    const sel_ = (arr, nama, hit) => `<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:4px;margin-bottom:6px">${arr.map((x, i) => `<div data-tip="${esc(`<b>${BLN_PENUH[i]}</b><br>${nama}: ${hit ? `${fmt(hit[i])} kejadian dalam ${fmt(tp)} tahun dasar<br>rata-rata ${f2(x)} per tahun` : `${f2(x)} kejadian per tahun per kabupaten/kota`}`)}" style="cursor:pointer;border-radius:6px;padding:8px 0;text-align:center;font-size:11px;font-weight:700;background:rgba(201,154,30,${(.08 + .92 * x / mx).toFixed(2)});color:${x / mx > .55 ? "#fff" : "inherit"};${i === m ? "outline:2px solid currentColor;outline-offset:-2px" : ""}"><div style="font-size:10px;opacity:.8">${Grafik.BLN[i]}</div>${hit ? fmt(hit[i]) : f2(x)}</div>`).join("")}</div>`;
    const rasio = nas[pk] > 0 ? v[pk] / nas[pk] : 0, bandingan = tot < 5 ? "" : rasio >= 1.2 ? `, ${f1(rasio)}× rata-rata kabupaten/kota se-Indonesia (${f2(nas[pk])} per tahun, dari ${fmt(jml)} kabupaten/kota)` : rasio >= .8 ? `, setara rata-rata kabupaten/kota se-Indonesia (${f2(nas[pk])} per tahun, dari ${fmt(jml)} kabupaten/kota)` : `, di bawah rata-rata kabupaten/kota se-Indonesia (${f2(nas[pk])} per tahun, dari ${fmt(jml)} kabupaten/kota)`;
    const kalimat = tot > 0
      ? (tot < 5 ? `${Kartu.hl(fmt(tot) + " kejadian")} dalam ${fmt(tp)} tahun dasar di ${esc(nm(this.st.kk))}, ${tot === 1 ? "di" : "terbanyak di"} bulan ${BLN_PENUH[pk]}` : `${Kartu.hl(fmt(cnt[pk]) + " kejadian")} dalam ${fmt(tp)} tahun dasar di ${BLN_PENUH[pk]}, bulan terbanyak di ${esc(nm(this.st.kk))}${bandingan}`)
      : `${Kartu.hl("0 kejadian")} dalam ${fmt(tp)} tahun dasar di ${esc(nm(this.st.kk))}`;
    const top = ada.map(([k, x]) => [k, x.bulan_penuh.cuaca[m]]).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const lst = top.length ? `<p class="kecil" style="margin:12px 0 4px">Terbanyak dilaporkan di bulan ${BLN_PENUH[m]} (jumlah dalam ${fmt(tp)} tahun dasar), klik untuk membuka kalendernya:</p><div style="display:grid;gap:6px">${top.map(([k, n]) => `<button type="button" data-kab="${esc(k)}" data-tip="${esc(`${nm(k)} (${namaProv(k.split("|")[0])}): ${fmt(n)} kejadian di ${BLN_PENUH[m]}`)}" style="all:unset;cursor:pointer;display:block"><div style="display:flex;justify-content:space-between;gap:8px;font-size:13px"><b translate="no">${esc(nm(k))}, ${esc(namaProv(k.split("|")[0]))}</b><span>${fmt(n)}</span></div><div style="height:8px;border-radius:4px;background:rgba(125,140,163,.18)"><div style="height:8px;border-radius:4px;background:#c99a1e;width:${n / top[0][1] * 100}%"></div></div></button>`).join("")}</div>` : "";
    return this.kartu("Kalender kabupaten", kalimat, sel2 + `<p class="kecil" style="margin:0 0 4px"><b>${esc(nm(this.st.kk))}</b></p>` + sel_(v, esc(nm(this.st.kk)), cnt) + `<p class="kecil" style="margin:8px 0 4px"><b>Rata-rata per tahun, ${fmt(jml)} kabupaten/kota se-Indonesia</b></p>` + sel_(nas, "Rata-rata se-Indonesia") + lst,
      `Logbook Pusdalops BNPB, rata-rata per tahun dalam ${fmt(tp)} tahun dasar (${this.rentangTh(this.LB.tahun_penuh.map(Number).sort((a, b) => a - b))}); angin kencang, puting beliung, hujan es, dan cuaca ekstrem yang dilaporkan, pelaporan tidak merata antar daerah; kotak bergaris = bulan ini`); },

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

  kabUlang(box) { const f = document.activeElement?.parentElement?.querySelector?.("select[data-kl]")?.dataset.kl; box.innerHTML = this.gambar(box.dataset.ex); box.querySelectorAll("select").forEach(x => PilihCantik.hias(x)); if (f) box.querySelector(`select[data-kl="${f}"]`)?.parentElement.querySelector(".pc-btn")?.focus({preventScroll: true}); },
  segRentang() { return this.tampilSeg() ? Kartu.seg("rentang", [["14", "14 hari"], ["30", "30 hari"], ["90", "90 hari"]], this.st) : ""; },
  kartu(ey, judul, isi, sumber, ctl = "", leg = null) { return Kartu.kartu(`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[this.IKON[ey]] || ""}</svg>${ey}`, judul, isi, sumber, ctl, leg); },
  IKON: {"Hujan lebat": "hujan", Angin: "angin", Provinsi: "provinsi", "Per tahun": "ansambel", "Kalender musim": "peluang", ENSO: "siklon", Logbook: "ansambel", "Musim logbook": "peluang", "Kalender kabupaten": "peluang"},
  EX: ["hujan", "angin", "provinsi", "bnpb", "logTahun", "logMusim", "logKab", "musim", "enso"],
  gambar(id) { Kartu._leg = null; try { return this["ex" + id[0].toUpperCase() + id.slice(1)]() || ""; } catch (e) { console.error(e); return ""; } },
  tulis() { const el = $("#tren"), h = this.EX.map(id => `<div data-ex="${id}">${this.gambar(id)}</div>`).join("");
    el.innerHTML = h; Grafik.gulir(el); },
  async render() {
    const el = $("#tren"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("change", e => { const s = e.target.closest("select[data-kl]"); if (!s) return; this.st[s.dataset.kl] = s.value; if (s.dataset.kl === "kp") this.st.kk = null; const box = s.closest("[data-ex]"); nanti(() => this.kabUlang(box)); });
      el.addEventListener("click", e => {
        const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s)); return nanti(() => this.tulis()); }
        const kb = e.target.closest("[data-kab]"); if (kb) { kb.setAttribute("aria-current", "true"); kb.style.opacity = .5; const [p] = kb.dataset.kab.split("|"); this.st.kp = p; this.st.kk = kb.dataset.kab; const box = kb.closest("[data-ex]"); return nanti(() => this.kabUlang(box)); }
        const pg = e.target.closest(".pgn-b[data-h]"); if (pg && !pg.disabled) { this.T.provinsi.hal = +pg.dataset.h; const box = pg.closest("[data-ex]"); return nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); }
        const th = e.target.closest("th button[data-k]"); if (th) { const st = this.T.provinsi, k = th.dataset.k; st.turun = st.urut === k ? !st.turun : true; st.urut = k; st.hal = 0; const box = th.closest("[data-ex]"); nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); }); } }); }
    if (!this.R && !this.D && !this.M) {
      muatJSON("../data/logbook_riwayat.json").then(j => { this.LB = j; return muatJSON("../prediksi/data/kalender_risiko.json").catch(() => null); }).then(k => { this.KAL = k; if (el.dataset.siap) this.tulis(); }).catch(() => {}); el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren cuaca…</div>`;
      [this.R, this.D, this.M] = await Promise.all([muatJSON("../banjir/data/cuaca_riwayat.json").catch(() => null), muatJSON("../banjir/data/cuaca_dampak.json").catch(() => null), muatJSON("../banjir/data/cuaca_musim.json").catch(() => null)]); }
    this.tulis();
    if (!el.textContent.trim()) el.innerHTML = `<div class="kosong">Data tren cuaca belum tersedia.</div>`; },
};
