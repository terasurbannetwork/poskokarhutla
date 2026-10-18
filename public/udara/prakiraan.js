"use strict";
/* Prakiraan 72 jam per kota (peta, laci kota, kartu Insight) dan tab Simulasi.
   Data: /udara/data/{prakiraan,lintasan,atribusi}.json (pipeline udara), dimuat di app.js muatData; boleh tidak ada (A18: lapisan dan kartu dibuang).
   Status resmi tidak ada: ini perkiraan model (CAMS + koreksi bias bila ada stasiun). Fungsi murni di murni.js. Dimuat SESUDAH peta.js dan insight.js. */
const M = window.Murni;
const pilSt = s => `<span class="kt" style="--c:${M.ST_WARNA[s]};--f:#fff">${M.labelStatus(s)}</span>`;
const terkoreksi = () => S.prak?.koreksi?.status === "terkoreksi";
/* pil label model: terkoreksi ke stasiun atau belum */
const pilKor = () => terkoreksi() ? `<span class="kt" style="--c:#2b8c86;--f:#fff;text-transform:none;letter-spacing:0">terkoreksi ke stasiun</span>` : PIL_MODEL;
const tglSing = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
const WARNA_API = ["#e8743b", "#f0a05f", "#c9503a", "#f5c28b"], WARNA_JENIS = {pltu: "#5f6fb0", latar: "#9aa7a0", lain: "#b9a77a"};
const warnaBag = (b, i) => b.jenis === "api" ? WARNA_API[i % WARNA_API.length] : WARNA_JENIS[b.jenis] || "#9aa7a0";
const idxHariPrak = () => S.prak ? S.prak.hari.indexOf(S.uk.hari[S.hari]) : -1;
const kotaByKode = k => S.prak?.kota.find(x => x.kode === k);
const atrKota = k => S.atr?.kota?.find(x => x.kode === k);
/* nama bagian atribusi tanpa nama orang: hanya badan usaha dan kompleks */
const namaBag = b => b.jenis === "api" ? (b.konsesi?.[0] || b.nama) : b.nama;

const Prak = {
  st: {jam: null, lapis: "850hPa"},
  ada: () => !!S.prak,
  /* nilai PM2,5 terpilih per kota: jam tertentu (rata-rata 24 jam terakhir) atau rata-rata hari terpilih */
  nilai(k) { const j = this.st.jam, h = idxHariPrak(); if (j != null) return M.rata24(k.pm, j); return h >= 0 ? k.r24?.[h] ?? null : null; },
  statusKini(k) { const v = this.nilai(k); return v == null ? null : M.statusDari(v); },
  geoKota() { return {type: "FeatureCollection", features: S.prak.kota.map((k, i) => { const v = this.nilai(k); if (v == null) return null;
    return {type: "Feature", geometry: {type: "Point", coordinates: [k.lon, k.lat]}, properties: {i, s: M.rank(M.statusDari(v)), v: Math.round(v)}}; }).filter(Boolean)}; },
  geoKomp() { return {type: "FeatureCollection", features: (S.lin?.kompleks || []).map((k, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [k.lon, k.lat]}, properties: {i}}))}; },
  lapisList() { const a = M.lapisAda(S.lin); return a.length ? a : []; },
  pasangPeta() {
    if (!S.prak || peta.getSource("kota")) return;
    const vis = k => ({visibility: Peta.lihat(k) ? "visible" : "none"});
    if (S.lin?.kompleks?.length) {
      peta.addSource("lin", {type: "geojson", data: M.garisLintasan(S.lin, this.st.lapis)});
      peta.addLayer({id: "lin", type: "line", source: "lin", layout: {...vis("lintasan"), "line-cap": "round"}, paint: {"line-color": "#e8743b", "line-width": 2, "line-opacity": .8, "line-dasharray": [2, 1.2]}});
      peta.addSource("lin-k", {type: "geojson", data: this.geoKomp()});
      peta.addLayer({id: "lin-k", type: "circle", source: "lin-k", layout: vis("lintasan"), paint: {"circle-radius": 5, "circle-color": "#c0392b", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}}); }
    peta.addSource("kota", {type: "geojson", data: this.geoKota()});
    peta.addLayer({id: "kota", type: "circle", source: "kota", layout: {...vis("kota"), "circle-sort-key": ["get", "s"]},
      paint: {"circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 5, 9, 11], "circle-color": ["match", ["get", "s"], 3, M.ST_WARNA.awas, 2, M.ST_WARNA.siaga, 1, M.ST_WARNA.waspada, M.ST_WARNA.normal], "circle-stroke-color": "#fff", "circle-stroke-width": 1.8}});
    peta.on("mousemove", "kota", e => { Peta._diKota = true; peta.getCanvas().style.cursor = "pointer"; PI?.tampilTip(this.kartuKota(e.features[0].properties.i), e.originalEvent); });
    peta.on("mouseleave", "kota", () => { Peta._diKota = false; peta.getCanvas().style.cursor = ""; PI?.sembunyiTip(); });
    peta.on("mousemove", "lin-k", e => { Peta._diKota = true; PI?.tampilTip(this.kartuKomp(e.features[0].properties.i), e.originalEvent); });
    peta.on("mouseleave", "lin-k", () => { Peta._diKota = false; PI?.sembunyiTip(); });
  },
  segarkan() { if (!S.prak || !peta?.getSource("kota")) return; peta.getSource("kota").setData(this.geoKota()); this.hiasJam(); },
  gantiLapis(l) { this.st.lapis = l; peta?.getSource("lin")?.setData(M.garisLintasan(S.lin, l)); this.hiasKontrol(); },
  kartuKota(i) { const k = S.prak.kota[i]; if (!k) return ""; const v = this.nilai(k); if (v == null) return ""; const s = M.statusDari(v), w = M.ST_WARNA[s];
    return PI.kartuTip({judul: esc(k.nama), stat: [["perisai", M.labelStatus(s), "status", w, s !== "normal"], ["debit", fmt(Math.round(v)) + " µg/m³", this.st.jam != null ? "rata-rata 24 jam sampai jam ini" : "rata-rata 24 jam", w]]}); },
  kartuKomp(i) { const k = S.lin.kompleks[i]; if (!k) return "";
    return PI.kartuTip({judul: "Kompleks api " + esc(k.id), sub: k.konsesi?.length ? `<small>${k.konsesi.map(esc).join(", ")}</small>` : "", stat: [["peringatan", fmt(Math.round(k.frp)) + " MW", "daya radiasi api", "#c0392b"], ...(k.kota?.length ? [["peta", fmt(k.kota.length) + " kota", "dilalui asap", "#e8743b"]] : [])]}); },

  /* kontrol di kartu kanan: geser jam + pilih lapis; muncul hanya bila lapisan kota atau lintasan menyala */
  kontrol() { const el = $("#jamKota"); if (!el) return; if (!S.prak) { el.hidden = true; return; }
    const n = S.prak.jam.length, j0 = this.st.jam ?? Math.min(n - 1, M.indeksJam(S.prak.jam, SEKARANG())), lp = this.lapisList();
    el.innerHTML = `<span class="lbl">Jam</span><input type="range" id="jamGeser" min="0" max="${n - 1}" step="1" value="${j0}" aria-label="Jam prakiraan"><b id="jamTeks"></b>`
      + (lp.length ? `<div class="seg penuh" id="lapisLin" aria-label="Lapis angin lintasan asap">${lp.map(l => `<button data-l="${l}" aria-pressed="${l === this.st.lapis}">${l}</button>`).join("")}</div>` : "");
    this.hiasKontrol(); this.hiasJam(); },
  hiasKontrol() { const el = $("#jamKota"); if (!el || !S.prak) return; const on = Peta.lihat("kota") || Peta.lihat("lintasan"); el.hidden = !on;
    el.querySelectorAll("#lapisLin button").forEach(b => b.setAttribute("aria-pressed", b.dataset.l === this.st.lapis)); const l = $("#lapisLin"); if (l) l.hidden = !Peta.lihat("lintasan"); },
  hiasJam() { const g = $("#jamGeser"), t = $("#jamTeks"); if (!g || !t) return; const J = S.prak.jam, h = idxHariPrak();
    if (this.st.jam == null) { const tg = S.prak.hari[h], mulai = J.findIndex(j => new Date(Date.parse(j) + 7 * 36e5).toISOString().slice(0, 10) === tg);
      g.value = h === S.prak.hari.indexOf(tglWIB(SEKARANG())) ? M.indeksJam(J, SEKARANG()) : Math.max(0, mulai); }
    t.textContent = this.st.jam == null ? "rata-rata hari" : M.kataJam(J[this.st.jam]); },
  ikutHari() { this.st.jam = null; this.segarkan(); },

  /* grafik garis PM2,5 per jam dengan pita kategori; mentah putus-putus bila beda; angka puncak tertulis */
  garis72(k, sempit = false) {
    k = {...k, mentah: k.mentah?.some((v, i) => v !== k.pm[i]) ? k.mentah : null};   /* mentah = terkoreksi (belum ada koreksi): satu garis saja */
    const mobil = sempit || innerWidth < 640, W = mobil ? 520 : 940, H = mobil ? 200 : 210, L = 44, R = 14, T = 16, B = H - 26, n = k.pm.length, ser = [k.pm, k.mentah || []];
    const mx = Math.max(60, ...ser.flat()) * 1.12, X = i => L + i / (n - 1) * (W - L - R), Y = v => B - Math.sqrt(Math.min(Math.max(v, 0), mx) / mx) * (B - T);   /* akar: pita kategori tetap terbaca walau puncak asap ribuan µg/m³ */
    const pita = [[0, 55.4, "normal"], [55.4, 150.4, "waspada"], [150.4, 250.4, "siaga"], [250.4, Infinity, "awas"]].filter(b => b[0] < mx).map(([a, z, s]) =>
      `<rect x="${L}" width="${W - L - R}" y="${Y(Math.min(z, mx))}" height="${Y(a) - Y(Math.min(z, mx))}" fill="${M.ST_WARNA[s]}" opacity=".13"/>`).join("");
    const jalur = a => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join("");
    const pk = k.pm.indexOf(Math.max(...k.pm)), pil = Kartu.pil(Math.min(W - R - 70, Math.max(L, X(pk) - 34)), Math.max(0, Y(k.pm[pk]) - 26), fmt(k.pm[pk]) + " µg/m³", M.ST_WARNA[M.statusDari(k.pm[pk])], "#fff", 11)[0];
    const hari = S.prak.jam.map((j, i) => ((new Date(Date.parse(j) + 7 * 36e5)).getUTCHours() === 0 ? i : -1)).filter(i => i >= 0);
    const sb = hari.map(i => `<line x1="${X(i)}" x2="${X(i)}" y1="${T}" y2="${B}" stroke="currentColor" opacity=".18"/><text x="${X(i) + 4}" y="${B + 16}" font-size="10.5" opacity=".75">${tglSing(new Date(Date.parse(S.prak.jam[i]) + 7 * 36e5).toISOString().slice(0, 10))}</text>`).join("");
    const tip = i => `<b>${M.kataJam(S.prak.jam[i])}</b><br>Terkoreksi: ${fmt(k.pm[i])} µg/m³${k.mentah ? `<br>Mentah CAMS: ${fmt(k.mentah[i])} µg/m³` : ""}`;
    const kena = k.pm.map((v, i) => `<rect x="${X(i) - (W - L - R) / (n - 1) / 2}" y="${T}" width="${(W - L - R) / (n - 1)}" height="${B - T}" fill="transparent" data-tip="${esc(tip(i))}"/>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="PM2,5 per jam ${esc(k.nama)}">${pita}${[0, 55.4, 150.4, 250.4].filter(v => v < mx).map(v => `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" font-size="10.5" opacity=".65">${fmt(v)}</text>`).join("")}${sb}
      ${k.mentah ? `<path d="${jalur(k.mentah)}" fill="none" stroke="#8a94a6" stroke-width="1.6" stroke-dasharray="4 3"/>` : ""}<path d="${jalur(k.pm)}" fill="none" stroke="#0b2545" stroke-width="2.4" stroke-linejoin="round" style="stroke:var(--ink)"/>${pil}${kena}</svg>`; },
  batangAtribusi(a, lebar = 420, tinggi = 22) { if (!a) return "";
    const b = M.normBagian(a.bagian); let x = 0;
    return b.map((s, i) => { const w = s.lebar / 100 * lebar, tip = `<b>${esc(namaBag(s))}</b><br>${fmt(s.persen)}% (rentang ${fmt(s.rendah)} sampai ${fmt(s.tinggi)}%)${s.konsesi?.length ? `<br>Konsesi: ${s.konsesi.map(esc).join(", ")}` : ""}`;
      const r = `<rect x="${x}" y="0" width="${Math.max(1, w - 1)}" height="${tinggi}" fill="${warnaBag(s, i)}" data-tip="${tip}"/>${w > 34 ? `<text x="${x + w / 2}" y="${tinggi / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${fmt(s.persen)}%</text>` : ""}`; x += w; return r; }).join(""); },

  /* atribusi di laci: CAMS dan model berdampingan; kota tak terpercaya tanpa persen */
  bagianAtribusi(a, kom) { const cm = `<p class="fnd">PM2,5 CAMS besok <b>${fmt(a.pm)} µg/m³</b>${a.model != null ? ` · model sumber <b>${fmt(a.model)} µg/m³</b>` : ""}</p>`;
    if (a.terpercaya === false) return `<p class="fnd">Asal asap besok:</p>${cm}<p class="fnd">Model jauh di atas CAMS, porsi tak dihitung.${a.alasan ? " " + esc(a.alasan) : ""}</p>`;
    return `<p class="fnd">Asal asap besok:</p>${cm}<svg viewBox="0 0 420 22" width="100%" role="img" aria-label="Asal PM2,5">${this.batangAtribusi(a)}</svg>
      <div class="legd">${M.normBagian(a.bagian || []).map((b, j) => `<span class="kt" style="--c:${warnaBag(b, j)};--f:#fff;text-transform:none" translate="no">${esc(namaBag(b))} · ${fmt(b.persen)}%</span>`).join(" ")}</div>
      ${kom.length ? `<p class="fnd">Kompleks api di karhutla: ${kom.map(b => `<a href="/?k=${encodeURIComponent(b.id)}" translate="no">${esc(b.id)}</a>`).join(", ")}</p>` : ""}`; },
  laciKota(i) { const k = S.prak.kota[i]; if (!k) return; const a = atrKota(k.kode), hr = S.prak.hari;
    const kom = a && a.terpercaya !== false ? M.normBagian(a.bagian || []).filter(b => b.jenis === "api" && b.id) : [];
    Laci.buka("Kota", `<span translate="no">${esc(k.nama)}</span>`, pilKor(),
      `<div class="grid g4">${hr.map((t, h) => { const s = M.statusHari(k, h), w = M.ST_WARNA[s || "normal"]; return kot(tglSing(t), `<span style="color:${w}">${fmt(k.r24[h])} µg/m³</span>`, M.labelStatus(s) + ` · api ${k.asap?.[h] == null ? "–" : fmt(Math.round(k.asap[h] * 100)) + "%"}`); }).join("")}</div>
      <p class="fnd">PM2,5 per jam, 72 jam ke depan${k.mentah?.some((v, j) => v !== k.pm[j]) ? " (garis tebal terkoreksi, putus-putus mentah)" : ""}:</p>${this.garis72(k, true)}
      ${a ? this.bagianAtribusi(a, kom) : ""}
      <p class="fnd">Sumber: Copernicus CAMS lewat Open-Meteo${terkoreksi() ? ", stasiun pemantau" : ""}. ${terkoreksi() ? "" : "Perkiraan model, belum dikoreksi ke alat ukur. "}Data ${jamWIB(S.prak.dibuat)}</p>`);
  },

  /* ---------- kartu Insight ---------- */
  ex(id, nama, judul, isi, catatan, ctl = "") { return Kartu.ex(judul, "", "", isi, catatan, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${Insight.eyIk(id, nama)}</span>${pilKor()}`); },
  segHariPrak(key) { return Kartu.seg(key, S.prak.hari.map((t, h) => [h, tglSing(t)]), Insight.st); },
  exPrak() { if (!S.prak) return ""; const h = Math.min(+Insight.st.prakHari || 0, S.prak.hari.length - 1), k = M.terburuk(S.prak.kota, h); if (!k) return "";
    const st = M.statusHari(k, h), c = M.hitungStatus(S.prak.kota, h), parah = c.awas + c.siaga;
    Kartu.leg(["normal", "waspada", "siaga", "awas"].map(s => [M.ST_WARNA[s], `${M.labelStatus(s)} ${fmt(c[s])} kota`]));
    return this.ex("prak", "Prakiraan 72 jam", `${Kartu.hl(esc(k.nama))} paling tercemar pada ${tglSing(S.prak.hari[h])}: PM2,5 ${Kartu.hl(fmt(k.r24[h]) + " µg/m³")}, status ${M.labelStatus(st)}${parah ? `; ${Kartu.hl(fmt(parah) + " kota")} siaga atau awas` : ""}`,
      this.garis72(k), `${terkoreksi() ? "" : "Belum dikoreksi ke alat ukur. "}Sumber: Copernicus CAMS lewat Open-Meteo; status dari rata-rata 24 jam`, this.segHariPrak("prakHari")); },
  exGalat() { const g = S.prak?.galat, kr_ = S.prak?.koreksi; if (!g || (!g.metar && !g.stasiun)) return "";
    const me = g.metar, ci = k => { const c = me?.ci?.[k]; return Array.isArray(c) && c.length === 2 ? ` (${M.persen(c[0])} sampai ${M.persen(c[1])})` : ""; };
    const hb = me ? `${fmt(me.n)} hari-bandara${me.n_bandara ? ` dari ${fmt(me.n_bandara)} bandara` : ""}` : "";
    const baris = [];
    if (me) baris.push(["Kejadian asap tertangkap (hit)", M.persen(me.hit) + ci("hit"), hb], ["Peringatan keliru (FAR)", M.persen(me.far) + ci("far"), ""], ["Skor gabungan (CSI)", M.persen(me.csi) + ci("csi"), ""]);
    if (me?.tabel) baris.push(["Hit, luput, alarm palsu, benar negatif", `${fmt(me.tabel.hit)}, ${fmt(me.tabel.luput)}, ${fmt(me.tabel.alarm_palsu)}, ${fmt(me.tabel.benar_negatif)}`, "hari-bandara"]);
    if (g.stasiun) baris.push(["Stasiun: bias rata-rata", M.desimal(g.stasiun.bias, 1) + " µg/m³", `${fmt(g.stasiun.n)} stasiun`], ["Stasiun: galat kuadrat (RMSE)", M.desimal(g.stasiun.rmse, 1) + " µg/m³", ""], ["Stasiun: kategori tepat", M.persen(g.stasiun.tepat_kategori), ""]);
    const kata = me ? `Uji analisis terhadap METAR: ${Kartu.hl(M.persen(me.hit))} kejadian asap tertangkap, ${Kartu.hl(M.persen(me.far))} peringatannya keliru` : `Galat model terhadap stasiun: bias ${Kartu.hl(M.desimal(g.stasiun.bias, 1) + " µg/m³")}`;
    const tab = `<div class="tw"><table><thead><tr><th>Ukuran</th><th class="n">Nilai</th><th class="n">Jumlah</th></tr></thead><tbody>${baris.map(b => `<tr><td>${b[0]}</td><td class="n"><b>${b[1]}</b></td><td class="n">${b[2]}</td></tr>`).join("")}</tbody></table></div>`;
    const pr = me && g.metar_prakiraan == null ? "Uji prakiraan 24 sampai 72 jam sedang mengumpulkan data. " : "";
    return this.ex("galat", "Galat model", kata, tab, `${pr}${kr_?.status === "terkoreksi" ? "" : "Angka PM2,5 belum dikoreksi ke stasiun. "}${me?.periode ? "Periode " + esc(me.periode) + ". " : ""}${me?.ci && me.ci_metode ? "Rentang: " + esc(me.ci_metode) + ". " : ""}Sumber: NOAA METAR${g.stasiun ? ", stasiun pemantau" : ""}`); },
  exAtribusi() { const A = S.atr?.kota?.filter(k => k.terpercaya === false || k.bagian?.some(x => x.persen > 0)); if (!A?.length) return "";
    const ok = A.filter(k => k.terpercaya !== false).sort((a, b) => b.pm - a.pm), tk = A.filter(k => k.terpercaya === false).sort((a, b) => (b.model || 0) - (a.model || 0));
    const top = [...ok.slice(0, tk.length ? 7 : 10), ...tk.slice(0, 3)], t0 = top.find(k => k.terpercaya !== false), api0 = t0 && M.normBagian(t0.bagian).find(b => b.jenis === "api");
    const mobil = innerWidth < 640, W = mobil ? 520 : 940, L = mobil ? 120 : 190, rh = 32, bw = W - L - (mobil ? 215 : 230);
    const nm = k => esc(k.nama.replace(/^(Kota|Kab\.?|Kabupaten) /, ""));
    const g = top.map((k, i) => { const w = M.ST_WARNA[M.statusDari(Math.max(k.pm, k.model || 0))], teks = `CAMS ${fmt(k.pm)}${k.model != null ? ` · model ${fmt(k.model)}` : ""} µg/m³`;
      return `<g transform="translate(0,${i * rh})"><text x="${L - 10}" y="19" text-anchor="end" font-size="${mobil ? 13 : 12.5}" font-weight="600" translate="no">${nm(k)}</text>
      ${k.terpercaya === false ? `<text x="${L}" y="19" font-size="12" opacity=".75" data-tip="${esc(k.alasan || "")}">Model jauh di atas CAMS, porsi tak dihitung</text>` : `<g transform="translate(${L},5)">${this.batangAtribusi(k, bw, 22)}</g>`}
      ${Kartu.pil(L + bw + 8, 5, teks, w, "#fff", 11)[0]}</g>`; }).join("");
    const kom = new Map(); top.forEach(k => k.terpercaya !== false && k.bagian.forEach(b => { if (b.jenis === "api" && b.id && !kom.has(b.id)) kom.set(b.id, b); }));
    Kartu.leg([[WARNA_API[0], "api"], [WARNA_JENIS.pltu, "PLTU"], [WARNA_JENIS.lain, "sumber lain"], [WARNA_JENIS.latar, "latar"]]);
    const tautan = [...kom.values()].slice(0, 8).map(b => `<a class="kt" style="--c:#3f4a5e;--f:#fff;text-transform:none" href="/?k=${encodeURIComponent(b.id)}" translate="no">${esc(b.id)}${b.konsesi?.length ? " · " + esc(b.konsesi[0]) : ""}</a>`).join(" ");
    return this.ex("atr", "Sumber asap", t0 ? (api0 ? `${Kartu.hl(esc(api0.nama))} menyumbang ${api0.tinggi - api0.rendah >= 80 ? `antara ${Kartu.hl(fmt(api0.rendah))} dan ${Kartu.hl(fmt(api0.tinggi) + "%")}` : `${Kartu.hl(fmt(api0.persen) + "%")} (${fmt(api0.rendah)} sampai ${fmt(api0.tinggi)}%)`} PM2,5 ${nm(t0)} besok, menurut model` : `Model sumber asap besok: ${Kartu.hl(nm(t0))} paling tinggi di antara kota yang dihitung`) : "Besok, model sumber asap jauh di atas CAMS di kota teratas, porsi tak dihitung",
      `<svg viewBox="0 0 ${W} ${top.length * rh}" role="img" aria-label="Asal PM2,5 per kota">${g}</svg>${tautan ? `<div class="legd" style="margin-top:8px">${tautan}</div>` : ""}`,
      `Prakiraan besok. Angka di kanan: PM2,5 CAMS dan total model sumber, µg/m³. Sumber: titik panas NASA FIRMS, angin Open-Meteo, daftar PLTU WRI; perkiraan, rentang di tooltip`); },
};
Object.assign(Insight.IK, {prak: '<path d="M3 17l5-6 4 3 5-8 4 5"/><path d="M3 21h18"/>', galat: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', atr: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'});
Insight.T.skz = {urut: "_", turun: true, hal: 0}; Insight.T.bnd = {urut: "_", turun: true, hal: 0};
Insight.EX.unshift("prak", "galat", "atr"); Insight.st.prakHari = 0;
{ const g0 = Insight.gambar.bind(Insight); Insight.gambar = id => ({prak: () => Prak.exPrak(), galat: () => Prak.exGalat(), atr: () => Prak.exAtribusi()})[id]?.() ?? g0(id); }

/* kontrol peta */
$("#jamKota")?.addEventListener("input", e => { if (e.target.id !== "jamGeser") return; Prak.st.jam = +e.target.value; Prak.hiasJam(); if (!Prak._rf) Prak._rf = requestAnimationFrame(() => { Prak._rf = 0; Prak.segarkan(); }); });
$("#jamKota")?.addEventListener("click", e => { const b = e.target.closest("#lapisLin button"); if (b) Prak.gantiLapis(b.dataset.l); });

/* ================================================================ tab Simulasi: modul /udara/sim/sim.js dimuat saat tab dibuka */
const Simulasi = {
  async render() { const el = $("#simUdara"); if (!el || el._ok) return;
    const kosong = t => { el.innerHTML = `<div class="kosong">${t}</div>`; };
    kosong("Memuat simulasi…");
    try { const r = await fetch("/udara/sim/sim.js", {method: "HEAD"}); if (!r.ok) throw 0;
      if (!$("#simCss")) document.head.insertAdjacentHTML("beforeend", '<link id="simCss" rel="stylesheet" href="/udara/sim/sim.css">');
      const m = await import("/udara/sim/sim.js"), A = window.SimUdara || m.SimUdara || m.default; if (!A?.pasang) throw 0;
      el.innerHTML = ""; A.pasang(el, {prak: S.prak}); el._ok = 1;
    } catch (e) { kosong("Simulasi belum tersedia."); } },
};
