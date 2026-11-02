"use strict";
/* Gelombang Pasang & Abrasi: state, data, tab, panel kiri, laci. Format dasar ($, fmt, esc, jamWIB, nanti) dari ../inti/format.js,
   kartu dari ../inti/kartu.js, tooltip dari ../inti/tip.js, hitungan murni di hitung.js (Pesisir). Berkas data dibaca apa adanya; yang tak terbaca dibuang, bukan ditampilkan kosong. */
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const muatJSON = async u => { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const opsi = u => muatJSON(u).catch(() => null);
/* ?sekarang=2026-10-13T02:00:00+07:00 mengganti jam untuk menguji layar dengan data lama */
const SEKARANG = () => { const q = new URLSearchParams(location.search).get("sekarang"), t = q && Date.parse(q); return t || Date.now(); };
const HARI_INI = () => Pesisir.tglWIB(SEKARANG());
const tglSgk = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
const labelHari = t => t === HARI_INI() ? "hari ini" : t === Pesisir.hariKe(HARI_INI(), 1) ? "besok" : tglPendek(t);   /* huruf kecil hanya untuk hari ini dan besok; tanggal tetap "Sen, 2 Nov" */
const kapan = t => t === HARI_INI() ? "hari ini" : t === Pesisir.hariKe(HARI_INI(), 1) ? "besok" : "pada " + tglSgk(t);

/* kelas laju abrasi, tingkat rob (aturan rob.json: Waspada p95, Siaga p99, Awas di atas itu) */
const ABR = {"abrasi": ["Abrasi nyata", "#c9503a"], "akresi": ["Akresi nyata", "#3f8f6b"], "tidak nyata": ["Tidak nyata", "#9aa4b2"]};
const TINGKAT = [["Normal", "#9aa4b2"], ["Waspada", "#e0b400"], ["Siaga", "#e8743b"], ["Awas", "#d64545"]];
const PASUT = [["Di atas p90 stasiun", "#e8743b"], ["Di atas p75 stasiun", "#e0b400"], ["Di bawah p75", "#4f9be0"]];
const pilW = (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`;
const TK = lv => TINGKAT[lv] || ["Tanpa ambang", "#cfd4da"];   /* lv -1 = titik tanpa arsip untuk ambang */
const pilT = t => pilW(TK(t)[0], TK(t)[1]);
const pilGel = m => { const k = Pesisir.kelasGel(m); return pilW(k[1], k[2]); };
const m1 = n => n == null ? "–" : fmt(Math.round(n * 10) / 10);
const kelasPasut = (s, cm) => cm >= s.p90 ? 0 : cm >= s.p75 ? 1 : 2;

/* ================================================================ state */
const S = {abr: null, rob: null, pas: null, pasP: null, gel: null, per: null, geo: null, meta: null, hari: HARI_INI(), glb: [], mode: "abrasi", pilih: null};
const tersedia = () => ({abrasi: !!S.abr, rob: !!S.rob, pasang: !!S.pas, ombak: !!(S.gel || S.glb.length)});
const namaProv = k => S.meta?.prov?.[k] ?? k;
const hariTampil = () => [0, 1, 2, 3].map(n => Pesisir.hariKe(HARI_INI(), n));

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["tren", "Tren"], ["tentang", "Tentang"]];
const TAB_SEMBUNYI = new Set([]);
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
function bukaTab(id, dorong = true) {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/pesisir/" + (id === "peta" ? "" : id) + location.search);
  nanti(() => { if (id === "peta" && typeof peta !== "undefined" && peta) peta.resize();
    ({insight: Insight, tren: Tren, tentang: Tentang})[id]?.render(); });
}
$("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(([k, n]) => `<button data-t="${k}" aria-current="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k]}</svg>${n}</button>`).join("");
{ const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
{ const t = bacaLokal("pb-tema", null); if (t) document.documentElement.dataset.theme = t; }
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };

/* ================================================================ data */
async function muatData() {
  const [abr, rob, pas, pasP, gel, per, geo, meta] = await Promise.all([opsi("data/abrasi.json"), opsi("../banjir/data/rob.json"), opsi("../banjir/data/pasut_30h.json"), opsi("../banjir/data/pasut.json"),
    opsi("../banjir/data/cuaca_gelombang.json"), opsi("../data/peringatan.json"), opsi("../geo/provinsi.json"), opsi("../banjir/data/cuaca_meta.json")]);
  Object.assign(S, {abr: abr?.transek?.length ? abr : null, rob: rob?.titik?.length ? rob : null, pas: pas?.stasiun?.length ? pas : null, pasP: pasP?.stasiun?.length ? pasP : null,
    gel: gel?.titik?.length ? gel : null, per, geo, meta});
  S.glb = Pesisir.gelBmkg(per, SEKARANG());
  /* waktu tiap sumber terpisah (bukan yang terbaru saja): sumber yang basi tak tertutup sumber yang segar */
  const W = [["Abrasi", abr?.dibuat], ["Rob", rob?.dibuat], ["Pasang", pas?.dibuat], ["Ombak", gel?.dibuat], ["Peringatan BMKG", per?.dibuat]].filter(x => x[1] && Number.isFinite(Date.parse(x[1])));
  $("#upd").textContent = W.length ? W.map(([n, t]) => `${n} ${jamWIB(t)}`).join(", ") : "Data tidak terbaca";
  $("#upd").title = $("#upd").textContent;
}

/* ================================================================ laci */
const kot = (l, v, s) => `<div class="kpi"><span class="lbl">${l}</span><b>${v}</b><small>${s}</small></div>`;
const Laci = {
  buka(ey, judul, meta, isi) { const el = $("#laci");
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">${ey}</span><h2 id="dlgJudul" translate="no" title="${esc(judul)}">${esc(judul)}</h2>${meta ? `<div class="hd-meta"><span>${meta}</span></div>` : ""}</div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div><div class="bd" style="display:grid;gap:10px">${isi}</div>`;
    el.classList.add("on"); el.querySelector(".tutup").onclick = () => Laci.tutup(); },
  tutup() { $("#laci").classList.remove("on"); S.pilih = null; Peta?.lepas?.(); }
};
const lebarLaci = () => Math.min(360, ($("#laci").clientWidth || 360) - 34);
const titikTrans = t => { const lj = t.laju, ci = t.ci95, k = ABR[t.kelas || "tidak nyata"];
  const seri = [{n: t.id, w: k[1], titik: t.jarak.map(([y, v]) => ({x: y, y: v}))}];
  return `<div class="kpis">${kot("Laju", lj == null ? "–" : (lj > 0 ? "+" : "") + m1(lj) + " m/th", ci ? `selang 95%: ${m1(ci[0])} sampai ${m1(ci[1])}` : "tanpa statistik")}${kot("Kelas", k[0], `keyakinan ${t.keyakinan || "–"}`)}
    ${kot("Periode", `${t.periode?.[0] ?? "–"} sampai ${t.periode?.[1] ?? "–"}`, `${fmt(t.n)} tahun terbaca`)}${kot("Perubahan total", t.perubahan_m == null ? "–" : (t.perubahan_m > 0 ? "+" : "") + fmt(t.perubahan_m) + " m", "garis awal ke akhir")}</div>
    <div class="lbl">Jarak garis pantai ke laut dari garis dasar (m)</div><div class="tw sk gp-wr">${GrafikP.garis(seri, {lebar: lebarLaci(), tinggi: 190, nol: false, tip: x => { const p = t.jarak.find(j => j[0] === x); return `<b>${esc(t.desa || t.id)}, ${x}</b><br>Jarak ke laut: ${p ? fmt(p[1]) + " m" : "–"}`; }})}</div>
    ${t.laju_10th?.kelas ? `<p class="gp-cat">Sepuluh tahun terakhir: ${m1(t.laju_10th.laju)} m/th (${ABR[t.laju_10th.kelas]?.[0].toLowerCase() || t.laju_10th.kelas}, keyakinan ${t.laju_10th.keyakinan}).</p>` : ""}
    ${(S.abr.situs.find(x => x.id === t.situs)?.tinjau || []).includes(t.id) ? `<p class="gp-cat">Bertanda tinjau: garis melompat lebih dari 300 m di dua tahun terakhir (tanggul, reklamasi, atau tahun berawan) dan belum diperiksa tangan.</p>` : ""}
    <p class="gp-cat">Perkiraan dari citra Landsat, belum dikoreksi pasang surut dan belum dicek lapangan.</p>`; };
const Rinci = {
  trans(i) { const t = S.abr.transek[i], s = S.abr.situs.find(x => x.id === t.situs);
    Laci.buka("Abrasi pantai", t.desa || t.id, `${ABR[t.kelas || "tidak nyata"][1] && pilW(ABR[t.kelas || "tidak nyata"][0], ABR[t.kelas || "tidak nyata"][1])} ${esc(s?.kab || "")}, ${esc(s?.prov || "")}`, titikTrans(t)); },
  situs(id) { const s = S.abr.situs.find(x => x.id === id), T = S.abr.transek.map((t, i) => ({t, i})).filter(x => x.t.situs === id && x.t.laju != null).sort((a, b) => a.t.laju - b.t.laju);
    Laci.buka("Situs abrasi", s.nama, `${esc(s.kab)}, ${esc(s.prov)}`, `<div class="kpis">${kot("Transek", fmt(s.transek), `${fmt(s.terbaca)} terbaca`)}${kot("Median laju", m1(s.laju_median) + " m/th", "semua transek")}${kot("Abrasi nyata", fmt(s.abrasi_nyata), "transek bersih")}${kot("Akresi nyata", fmt(s.akresi_nyata), "transek bersih")}</div>
      <div class="lbl">Transek, dari mundur tercepat</div><div class="rows gp-rows">${T.map(({t, i}) => `<button class="rw" data-tr="${i}"><span class="rw-hd">${pilW(m1(t.laju) + " m/th", ABR[t.kelas || "tidak nyata"][1])}<b translate="no">${esc(t.desa || t.id)}</b></span><span class="rw-wil">${t.id}, keyakinan ${t.keyakinan || "–"}</span></button>`).join("")}</div>`);
    $("#laci").querySelector(".gp-rows").onclick = e => { const b = e.target.closest("[data-tr]"); if (b) { Rinci.trans(+b.dataset.tr); Peta.terbang(S.abr.transek[+b.dataset.tr].lat, S.abr.transek[+b.dataset.tr].lon, 13); } }; },
  rob(i) { const t = S.rob.titik[i], d = Pesisir.idxHari(S.rob.hari, S.hari), lv = d < 0 || t.lv[d] == null ? -1 : t.lv[d];
    const cols = S.rob.hari.map((h, k) => ({n: tglSgk(h).replace(" ", " "), v: t.h[k], w: TK(t.lv[k] ?? -1)[1], txt: m1(t.h[k]), tip: `<b>${tglSgk(h)}</b><br>Muka laut maks: ${m1(t.h[k])} m<br>Status: ${TK(t.lv[k] ?? -1)[0]}`}));
    Laci.buka("Rob", t.kec, `${pilT(lv)} ${esc(t.kab)}, ${esc(t.prov)}`, `<div class="kpis">${kot("Muka laut maks", d < 0 ? "–" : m1(t.h[d]) + " m", d < 0 ? "hari ini di luar data" : labelHari(S.hari))}${kot("Ambang Waspada", m1(t.p95) + " m", "persentil 95 model")}${kot("Ambang Siaga", m1(t.p99) + " m", "persentil 99 model")}${kot("Tertinggi tercatat", m1(t.amax) + " m", "dalam arsip model")}</div>
      <div class="lbl">Muka laut maksimum harian (m)</div><div class="tw sk gp-wr">${GrafikP.batangV(cols, {lebar: lebarLaci(), garis: t.p95 == null ? [] : [{v: t.p95, w: "#e0b400", n: "Waspada"}, {v: t.p99, w: "#e8743b", n: "Siaga"}]})}</div>
      <p class="gp-cat">${t.p95 == null ? "Titik ini belum punya arsip model yang cukup, jadi ambang dan status tidak dihitung. " : ""}Muka laut model SMOC terhadap rata-rata laut global, ambangnya dari iklim model sendiri, bukan datum lokal atau peringatan resmi.</p>`); },
  pasut(i) { const s = S.pas.stasiun[i], pu = S.pasP?.stasiun?.find(x => x.id === s.id), hari = s.hari || [], tg = S.hari;
    const cols = hari.slice(0, 14).map(h => ({n: tglSgk(h[0]).replace(" ", " "), v: h[1], w: PASUT[kelasPasut(s, h[1])][1], txt: String(h[1]), tip: `<b>${tglSgk(h[0])}</b><br>Pasang tertinggi: ${fmt(h[1])} cm<br>Pukul: ${h[2]} WIB`}));
    const hi = hari.find(h => h[0] === tg), pk = (pu?.puncak || []).filter(p => p.t.slice(0, 10) === tg);
    Laci.buka("Pasang surut", s.nama, esc(s.prov), `<div class="kpis">${kot("Pasang tertinggi", hi ? fmt(hi[1]) + " cm" : "–", hi ? `${labelHari(tg)} pukul ${hi[2]} WIB` : "di luar data")}${kot("Tipikal (p50)", fmt(s.p50) + " cm", "puncak harian")}${kot("p75", fmt(s.p75) + " cm", "puncak harian")}${kot("p90", fmt(s.p90) + " cm", `${fmt(s.hari_basis)} hari basis`)}</div>
      ${pk.length ? `<div class="lbl">Puncak ${labelHari(tg)}</div><div class="tw gp-pk"><table><tbody>${pk.map(p => `<tr><td>${p.jenis === "tinggi" ? "Pasang" : "Surut"}</td><td>${p.t.slice(11, 16)} WIB</td><td class="n">${fmt(p.cm)} cm</td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="lbl">Pasang tertinggi harian, 14 hari (cm terhadap MSL)</div><div class="tw sk gp-wr">${GrafikP.batangV(cols, {lebar: lebarLaci(), tinggi: 180, garis: [{v: s.p90, w: "#e8743b", n: "p90"}]})}</div>
      <p class="gp-cat">Prediksi astronomis BMKG Maritim. Ambang p90 dihitung dari puncak harian stasiun itu sendiri, bukan ambang banjir.</p>`); },
  ombak(i) { const r = S.gel.titik[i], hs = Pesisir.hsHari(S.gel, r, S.hari), t0 = Date.parse(S.gel.t0);
    const pts = r[4].map((v, k) => ({x: t0 + k * 36e5, y: v / 10})).filter((_, k) => k % 3 === 0).map(p => ({x: Math.round((p.x - Date.parse(S.hari + "T00:00:00+07:00")) / 36e5), y: p.y})).filter(p => p.x >= -24 && p.x <= 96);
    Laci.buka("Gelombang model", r[3] || namaProv(r[2]), `${hs == null ? "" : pilGel(hs) + " "}${esc(namaProv(r[2]))}`, `<div class="kpis">${kot("Tertinggi " + kapan(S.hari), hs == null ? "–" : m1(hs) + " m", "model Open-Meteo Marine")}${kot("Tertinggi 72 jam", m1(Math.max(...r[4]) / 10) + " m", "dalam jendela data")}</div>
      ${pts.length > 2 ? `<div class="lbl">Tinggi gelombang tiap 3 jam (m), jam 0 = tengah malam ${tglSgk(S.hari)}</div><div class="tw sk gp-wr">${GrafikP.garis([{n: "hs", w: "#3f7fb8", titik: pts}], {lebar: lebarLaci(), tinggi: 180, fx: x => x + " j", tip: x => { const p = pts.find(q => q.x === x); return `<b>Jam ${x} dari ${tglSgk(S.hari)}</b><br>Tinggi: ${p ? m1(p.y) : "–"} m`; }})}</div>` : ""}
      <p class="gp-cat">Keluaran model gelombang di titik pesisir, bukan peringatan BMKG Maritim; kelas pil mengikuti ambang BMKG (2,5; 4; 6 m).</p>`); },
  glb(k) { const o = S.glb.find(x => x.prov === k), nm = ["Tinggi (2,5 sampai 4 m)", "Sangat tinggi (4 sampai 6 m)", "Ekstrem (di atas 6 m)"];
    Laci.buka("Peringatan gelombang BMKG", namaProv(k), pilW(Pesisir.KELAS_GEL.find(c => c[1] === ["Tinggi", "Sangat tinggi", "Ekstrem"][o.lv - 1])[1], Pesisir.KELAS_GEL.find(c => c[1] === ["Tinggi", "Sangat tinggi", "Ekstrem"][o.lv - 1])[2]) + ` berlaku sampai ${tglSgk(o.sampai.slice(0, 10))} ${o.sampai.slice(11, 16)} ${o.zona}`,
      o.kelas.map((n, i) => n ? `<div class="lbl">${nm[i]}: ${fmt(n)} perairan</div><p class="gp-cat" translate="no">${o.perairan[i].map(esc).join(", ")}</p>` : "").join("") + `<p class="gp-cat">Sumber: BMKG Maritim apa adanya.</p>`); }
};

/* ================================================================ panel kiri */
const kosong = t => `<p class="kosong">${t}</p>`;
function barisPanel(q) {
  const cocok = (...a) => !q || a.join(" ").toLowerCase().includes(q), tg = S.hari;
  if (S.mode === "abrasi") { if (!S.abr) return kosong("Data abrasi tidak terbaca.");
    return Pesisir.perSitus(S.abr).filter(s => cocok(s.nama, s.kab, s.prov)).map(s => `<button class="rw" data-situs="${s.id}"><span class="rw-hd">${pilW((s.median == null ? "–" : m1(s.median)) + " m/th", s.median < 0 ? ABR.abrasi[1] : s.median > 0 ? ABR.akresi[1] : ABR["tidak nyata"][1])}<b translate="no">${esc(s.nama)}</b></span><span class="rw-wil">${esc(s.kab)}, ${esc(s.prov)}</span><span class="rw-jam">${fmt(s.abrasi)} abrasi nyata, ${fmt(s.akresi)} akresi nyata, ${fmt(s.tidak)} tidak nyata dari ${fmt(s.bersih)} transek bersih; ${fmt(s.tinjau + s.gangguan)} ditinjau atau bangunan</span></button>`).join("") || kosong("Tidak ada yang cocok."); }
  if (S.mode === "rob") { if (!S.rob) return kosong("Data rob tidak terbaca."); const r = Pesisir.robHari(S.rob, tg);
    if (!r) return kosong(`Data rob terakhir dibuat ${jamWIB(S.rob.dibuat)} dan tidak mencakup ${tglSgk(tg)}.`);
    return [...r.L].sort((a, b) => b.lv - a.lv || (b.h - (b.t.p95 ?? b.h)) - (a.h - (a.t.p95 ?? a.h)) || b.h - a.h).filter(x => cocok(x.t.kec, x.t.kab, x.t.prov)).slice(0, 80).map(x => `<button class="rw" data-rob="${S.rob.titik.indexOf(x.t)}"><span class="rw-hd">${pilT(x.lv)}<b translate="no">${esc(x.t.kec)}</b></span><span class="rw-wil" translate="no">${esc(x.t.kab)}, ${esc(x.t.prov)}</span><span class="rw-jam">Muka laut maks ${m1(x.h)} m, ${x.t.p95 == null ? "belum ada ambang" : "ambang Waspada " + m1(x.t.p95) + " m"}</span></button>`).join("") || kosong("Tidak ada yang cocok."); }
  if (S.mode === "pasang") { if (!S.pas) return kosong("Data pasang surut tidak terbaca.");
    const L = S.pas.stasiun.map((s, i) => ({s, i, h: s.hari?.find(h => h[0] === tg)})).filter(x => x.h && cocok(x.s.nama, x.s.prov)).sort((a, b) => b.h[1] - a.h[1]);
    return L.slice(0, 80).map(x => `<button class="rw" data-pas="${x.i}"><span class="rw-hd">${pilW(fmt(x.h[1]) + " cm", PASUT[kelasPasut(x.s, x.h[1])][1])}<b translate="no">${esc(x.s.nama)}</b></span><span class="rw-wil" translate="no">${esc(x.s.prov)}</span><span class="rw-jam">Pukul ${x.h[2]} WIB, p90 stasiun ${fmt(x.s.p90)} cm</span></button>`).join("") || kosong(`Tidak ada data pasang surut untuk ${tglSgk(tg)}.`); }
  const B = S.glb.filter(o => cocok(namaProv(o.prov))).map(o => { const k = Pesisir.KELAS_GEL.find(c => c[1] === ["Tinggi", "Sangat tinggi", "Ekstrem"][o.lv - 1]);
    return `<button class="rw" data-glb="${o.prov}"><span class="rw-hd">${pilW(k[1], k[2])}<b translate="no">${esc(namaProv(o.prov))}</b></span><span class="rw-wil">Peringatan BMKG, ${fmt(o.total)} perairan</span></button>`; }).join("");
  const M = S.gel ? Pesisir.gelHari(S.gel, tg).filter(x => cocok(x.nama, namaProv(x.prov))).slice(0, 60).map(x => `<button class="rw" data-gel="${S.gel.titik.indexOf(x.r)}"><span class="rw-hd">${pilGel(x.hs)}<b translate="no">${esc(x.nama || namaProv(x.prov))}</b></span><span class="rw-wil" translate="no">${esc(namaProv(x.prov))}</span><span class="rw-jam">Model: tertinggi ${m1(x.hs)} m</span></button>`).join("") : "";
  const tanpaGel = S.gel && !Pesisir.gelHari(S.gel, tg).length;   /* data model tak mencakup hari ini: tulis alasannya, bukan daftar kosong */
  const ket = tanpaGel ? kosong(`Data gelombang terakhir dibuat ${jamWIB(S.gel.dibuat)} dan tidak mencakup ${tglSgk(tg)}.`) : "";
  return (B ? `<div class="lbl gp-sub">Peringatan resmi BMKG Maritim</div>` + B : "") + (M ? `<div class="lbl gp-sub">Titik pesisir, gelombang model</div>` + M : "") + ket || kosong(S.per ? "Tidak ada peringatan gelombang BMKG yang berlaku pada data terbit " + jamWIB(S.per.dibuat) + "." : "Data gelombang tidak terbaca."); }
function renderPanel() {
  const q = ($("#cari").value || "").trim().toLowerCase(), T = tersedia(), M = [["abrasi", "Abrasi"], ["rob", "Rob"], ["pasang", "Pasang"], ["ombak", "Ombak"]];
  $("#panelMode").innerHTML = M.map(([k, n]) => `<button data-m="${k}" aria-pressed="${S.mode === k}"${T[k] ? "" : " disabled"}>${n}</button>`).join("");
  $("#rows").innerHTML = barisPanel(q); }
$("#panelMode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.disabled) return; S.mode = b.dataset.m;
  $("#panelMode").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
  Peta.mode?.();   /* centang lapis dan visibilitas urgent; legenda dan daftar menyusul */
  nanti(renderPanel); });
{ let td; $("#cari").addEventListener("input", () => { clearTimeout(td); td = setTimeout(renderPanel, 150); }); }
$("#rows").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const D = b.dataset;
  nanti(() => { if (D.situs) { const s = S.abr.situs.find(x => x.id === D.situs); Rinci.situs(D.situs); Peta.kotak(s.bbox); }
    else if (D.rob != null) { const t = S.rob.titik[+D.rob]; Rinci.rob(+D.rob); Peta.terbang(t.lat, t.lon, 11); }
    else if (D.pas != null) { const s = S.pas.stasiun[+D.pas]; Rinci.pasut(+D.pas); Peta.terbang(s.lat, s.lon, 10); }
    else if (D.gel != null) { const r = S.gel.titik[+D.gel]; Rinci.ombak(+D.gel); Peta.terbang(r[0], r[1], 9); }
    else if (D.glb) { Rinci.glb(D.glb); } }); });
$("#handle").addEventListener("click", () => $("#panel").classList.toggle("min"));

/* hari: rob, pasang, dan ombak dibaca per tanggal */
function renderHari() { $("#hariSeg").innerHTML = `<div class="seg penuh" role="group" style="box-shadow:none">${hariTampil().map(t => `<button data-h="${t}" aria-pressed="${t === S.hari}">${t === HARI_INI() ? "Hari ini" : t === Pesisir.hariKe(HARI_INI(), 1) ? "Besok" : new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric"})}</button>`).join("")}</div>`; }
$("#hariSeg").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.hari = b.dataset.h;
  $("#hariSeg").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => { renderPanel(); Peta.segarkan(); }); });
$("#lapisBtn").addEventListener("click", () => $("#lapis").classList.toggle("buka"));

/* ================================================================ mulai */
(async () => {
  Tip.polaSatu = null; pasangTip();
  try { await muatData(); } catch (e) { console.error(e); toast("Sebagian data tidak terbaca."); }
  renderHari(); renderPanel();
  await Peta.init().catch(e => { console.error(e); $("#muat").innerHTML = "<div>Peta tidak bisa dimuat. Muat ulang halaman.</div>"; });
  $("#muat").classList.add("hilang");
  const awal = (location.pathname.match(/^\/pesisir\/([a-z]+)/) || [])[1]; bukaTab(TABS.some(t => t[0] === awal) ? awal : "peta", false);
})();
