"use strict";
/* dropdown cantik (PilihCantik, sama dengan laman bencana lain): tanpa ini pemilih provinsi kartu Sinyal tampil sebagai select bawaan browser */
if (window.PilihCantik && !window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
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
const PASUT = [["Di atas persentil 90 stasiun", "#e8743b"], ["Di atas persentil 75 stasiun", "#e0b400"], ["Di bawah persentil 75", "#4f9be0"]];
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
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["tren", "Tren"], ["dampak", "Dampak"], ["foto", "Foto"], ["tentang", "Tentang"], ["informasi", "Lapor Warga"]];
/* informasi: tidak di menu tapi bisa dibuka lewat /pesisir/informasi (A24) */
const TAB_SEMBUNYI = new Set(["informasi"]);
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>', foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
function bukaTab(id, dorong = true) {
  if (id === "operasi" && !$("#p-operasi")) id = "peta";   /* tab Operasi hanya ada bila operasi.js menyisipkannya (PB-86, F-40) */
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/pesisir/" + (id === "peta" ? "" : id) + location.search);
  nanti(() => { if (id === "peta" && typeof peta !== "undefined" && peta) peta.resize();
    ({insight: Insight, tren: Tren, dampak: Dampak, foto: window.Foto, tentang: Tentang, informasi: window.Informasi, operasi: window.PesisirOperasi})[id]?.render(); });
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
  { const t = W.length ? W.map(([n, t]) => `${n} ${jamWIB(t)}`).join(", ") : "Data tidak terbaca"; $("#upd").innerHTML = `<span class="pjg">${esc(t)}</span>`; $("#upd").title = t; }   /* daftar stasiun panjang: tampil hanya di kepala lebar (.pjg, gaya.css) */
}

/* ================================================================ laci */
/* kotak angka berikon, kartu bagian, dan baris label-nilai dari mesin bersama (inti/peta/lapis.js, window.LaciInti; gaya inti/peta.css, sama dengan laci gempa).
   Cadangan polos bila modul belum termuat. Susunan tiap laci: kotak angka, kartu Lokasi, kartu rinci (Puncak, Masa berlaku) bila ada, kartu grafik (sumber kecil di bawahnya),
   lalu kartu terlipat "Catatan dan sumber" berisi butir bernomor. Kepala laci: nama, lalu pil status dan wilayah sebaris. */
const LI = () => window.LaciInti;
const ikL = (k, u) => LI()?.ikonSvg(k, u) || "";
const kot = (l, v, s, ik = "") => LI() ? LI().kotakAngka(l, v, s, ik) : `<div class="kpi kpi-t"><span class="lbl">${esc(l)}</span><b>${v}</b>${s ? `<small>${s}</small>` : ""}</div>`;
const sek = (judul, ik, isi, sumber = "") => LI()?.seksiLaci ? LI().seksiLaci({judul, ikon: ik, isi, sumber: sumber ? "Sumber: " + sumber : ""})
  : `<section class="lc-sek"><h4 class="lc-h">${esc(judul)}</h4>${isi}${sumber ? `<p class="fnd lc-src">Sumber: ${esc(sumber)}</p>` : ""}</section>`;
const brs = (ik, l, v, tr = false) => LI() ? LI().barisLaci(ik, l, v, {tr}) : `<div class="lc-lb"><span class="lc-lb-k">${esc(l)}</span><b>${v}</b></div>`;
const lbs = (...r) => `<div class="lc-lbs">${r.filter(Boolean).join("")}</div>`;
/* catatan metode dan sumber lengkap: satu kartu terlipat, butir bernomor (bukan paragraf panjang) */
const catatan = (butir, sumber = "") => `<section class="lc-sek gp-lc-cat"><details><summary class="lc-h">${ikL("mata")}<span class="lc-h-t">Catatan dan sumber</span></summary>
  <ol class="fnd gp-ol">${butir.filter(Boolean).map(b => `<li>${b}</li>`).join("")}</ol>${sumber ? `<p class="fnd lc-src">Sumber: ${esc(sumber)}</p>` : ""}</details></section>`;
/* "6,939° LS, 110,443° BT" */
/* jam baku EYD: "12.40" bukan "12:40" */
const jamT = j => String(j ?? "").replace(":", ".");
const koord = (lat, lon) => lat == null || lon == null ? "" : `${Math.abs(lat).toFixed(3).replace(".", ",")}° ${lat < 0 ? "LS" : "LU"}, ${Math.abs(lon).toFixed(3).replace(".", ",")}° BT`;
/* nol negatif dari data (-0) ditulis 0 */
const m1n = v => m1(v || 0);
const mM = n => n == null ? "–" : m1(n) + " m";
const mTh = n => n == null ? "–" : (n > 0 ? "+" : "") + m1(n) + " m/th";
const Laci = {
  /* meta = daftar potongan HTML (pil status, wilayah); tiap potongan satu span supaya pil dan wilayah sebaris rapi */
  buka(ey, judul, meta, isi) { const el = $("#laci"), M = [].concat(meta || []).filter(Boolean);
    el.innerHTML = `<div class="hd"><div class="hd-isi"><span class="hd-ey">${ey}</span><h2 id="dlgJudul" translate="no" title="${esc(judul)}">${esc(judul)}</h2>${M.length ? `<div class="hd-meta gp-hd-meta">${M.map(x => `<span>${x}</span>`).join("")}</div>` : ""}</div>
      <div class="hd-aksi"><button class="tutup ik-btn" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div><div class="bd gp-bd" style="display:grid;gap:10px">${isi}</div>`;
    el.classList.add("on"); el.querySelector(".tutup").onclick = () => Laci.tutup(); },
  tutup() { $("#laci").classList.remove("on"); S.pilih = null; Peta?.lepas?.(); }
};
/* lebar grafik = lebar laci dikurangi bingkai laci dan bantalan kartu bagian */
const lebarLaci = () => Math.min(340, ($("#laci").clientWidth || 360) - 60);
const SUMBER_ABR = "citra Landsat (USGS), olahan Centurisk97";
const CAT_ABR = ["Perkiraan dari citra satelit Landsat, belum dikoreksi pasang surut dan belum dicek lapangan.",
  "Laju dalam meter per tahun (m/th). Tanda minus berarti garis pantai mundur ke darat (abrasi), tanda plus berarti maju ke laut (akresi).",
  "Keyakinan tinggi: paling sedikit 15 tahun terbaca, selang 95% tidak memuat nol, dan R² paling sedikit 0,5.", "Keyakinan sedang: paling sedikit 8 tahun terbaca dan selang 95% tidak memuat nol. Keyakinan rendah ditulis tidak nyata.",
  "Keyakinan turun satu tingkat bila membuang tahun pencilan membalik arah laju atau baru membuat laju nyata."];
const titikTrans = t => { const lj = t.laju, ci = t.ci95, k = ABR[t.kelas || "tidak nyata"], s = S.abr.situs.find(x => x.id === t.situs), t10 = t.laju_10th;
  const seri = [{n: t.id, w: k[1], titik: t.jarak.map(([y, v]) => ({x: y, y: v}))}], tinjau = (s?.tinjau || []).includes(t.id);
  return `<div class="kpis">${kot("Laju", mTh(lj), ci ? `selang 95%: ${m1n(ci[0])} sampai ${m1n(ci[1])}` : "tanpa statistik", "rasio")}${kot("Kelas", k[0], `keyakinan ${t.keyakinan || "–"}`, "perisai")}
    ${kot("Periode", `${t.periode?.[0] ?? "–"} sampai ${t.periode?.[1] ?? "–"}`, `${fmt(t.n)} tahun terbaca`, "waktu")}${kot("Perubahan total", t.perubahan_m == null ? "–" : (t.perubahan_m > 0 ? "+" : "") + fmt(t.perubahan_m) + " m", "garis awal ke akhir", "peta")}</div>
    ${sek("Lokasi", "pusat", lbs(s && brs("satelit", "Situs", esc(s.nama), true), t.desa && brs("kab", "Desa", esc(t.desa), true), s && brs("peta", "Kabupaten/kota", esc(s.kab), true), s && brs("peta", "Provinsi", esc(s.prov)),
      brs("pusat", "Koordinat", koord(t.lat, t.lon), true), brs("rasio", "Kode transek", esc(t.id), true)))}
    ${sek("Jarak garis pantai ke laut (meter)", "satelit", `<div class="tw sk gp-wr">${GrafikP.garis(seri, {lebar: lebarLaci(), tinggi: 190, nol: false, tip: x => { const p = t.jarak.find(j => j[0] === x); return `<b>${esc(t.desa || t.id)}, ${x}</b><br>Jarak ke laut: ${p ? fmt(p[1]) + " m" : "–"}`; }})}</div>
      <p class="fnd">Diukur dari garis dasar transek ke arah laut, satu titik per tahun.</p>`, SUMBER_ABR)}
    ${t10?.kelas ? sek("Sepuluh tahun terakhir", "waktu", lbs(brs("rasio", "Laju", mTh(t10.laju)), t10.ci95 && brs("debit", "Selang 95%", `${m1n(t10.ci95[0])} sampai ${m1n(t10.ci95[1])}`),
      brs("perisai", "Kelas", esc(ABR[t10.kelas]?.[0] || t10.kelas)), brs("mata", "Keyakinan", esc(t10.keyakinan || "–")))) : ""}
    ${tinjau || t.gangguan ? sek("Perlu cek citra", "peringatan", `<ol class="fnd gp-ol">${[t.gangguan && `<span class="gp-gg">${ikL("peringatan", 12)}${esc(t.gangguan)}</span>`, ...(tinjau ? Pesisir.ketLompatan(t).split(/(?<=\.)\s+/).filter(Boolean).map(esc) : [])].filter(Boolean).map(x => `<li>${x}</li>`).join("")}</ol>`) : ""}
    ${catatan(CAT_ABR, S.abr.sumber)}`; };
const Rinci = {
  trans(i) { const t = S.abr.transek[i], s = S.abr.situs.find(x => x.id === t.situs), k = ABR[t.kelas || "tidak nyata"];
    Laci.buka("Transek abrasi", t.desa || t.id, [pilW(k[0], k[1]), s && esc(`${s.kab}, ${s.prov}`)], titikTrans(t)); },
  situs(id) { const s = S.abr.situs.find(x => x.id === id), p = Pesisir.perSitus(S.abr).find(x => x.id === id), T = S.abr.transek.map((t, i) => ({t, i})).filter(x => x.t.situs === id && x.t.laju != null).sort((a, b) => a.t.laju - b.t.laju);
    const thn = s.tahun?.length ? `${s.tahun[0]} sampai ${s.tahun.at(-1)}` : "", parah = S.abr.transek.find(t => t.id === s.terparah);
    Laci.buka("Situs abrasi", s.nama, [esc(`${s.kab}, ${s.prov}`)], `<div class="kpis">${kot("Transek", fmt(s.transek), `${fmt(s.terbaca)} terbaca`, "peta")}${kot("Median laju", mTh(s.laju_median), "semua transek", "rasio")}${kot("Abrasi nyata", fmt(s.abrasi_nyata), "transek bersih", "dalam")}${kot("Akresi nyata", fmt(s.akresi_nyata), "transek bersih", "debit")}</div>
      ${sek("Ringkasan situs", "satelit", lbs(brs("peta", "Kabupaten/kota", esc(s.kab), true), brs("peta", "Provinsi", esc(s.prov)), thn && brs("waktu", "Tahun citra", thn),
        p && brs("perisai", "Tidak nyata", fmt(p.tidak) + " transek"), p && brs("peringatan", "Ditinjau atau bangunan", fmt(p.tinjau + p.gangguan) + " transek"),
        parah && brs("dalam", "Terparah, abrasi nyata", `${esc(parah.desa || parah.id)}, ${mTh(parah.laju)}`, true)))}
      ${sek("Transek, dari mundur tercepat", "satelit", `<p class="fnd">Ketuk satu transek untuk melihat rinciannya.</p><div class="rows gp-rows">${T.map(({t, i}) => `<button class="rw" data-tr="${i}"><span class="rw-hd">${pilW(mTh(t.laju), ABR[t.kelas || "tidak nyata"][1])}<b translate="no">${esc(t.desa || t.id)}</b></span><span class="rw-wil">Transek ${esc(t.id)}, keyakinan ${esc(t.keyakinan || "–")}</span>${t.gangguan || (s.tinjau || []).includes(t.id) ? `<span class="gp-tanda">${ikL("peringatan", 12)}${t.gangguan ? "Ada bangunan pantai, perlu cek citra" : "Perlu cek citra"}</span>` : ""}</button>`).join("")}</div>`, SUMBER_ABR)}
      ${catatan(CAT_ABR, S.abr.sumber)}`);
    $("#laci").querySelector(".gp-rows").onclick = e => { const b = e.target.closest("[data-tr]"); if (b) { Rinci.trans(+b.dataset.tr); Peta.terbang(S.abr.transek[+b.dataset.tr].lat, S.abr.transek[+b.dataset.tr].lon, 13); } }; },
  rob(i) { const t = S.rob.titik[i], d = Pesisir.idxHari(S.rob.hari, S.hari), lv = d < 0 || t.lv[d] == null ? -1 : t.lv[d];
    const cols = S.rob.hari.map((h, k) => ({n: tglSgk(h).replace(" ", " "), v: t.h[k], w: TK(t.lv[k] ?? -1)[1], txt: m1(t.h[k]), tip: `<b>${tglSgk(h)}</b><br>Muka laut maksimum: ${m1(t.h[k])} m<br>Status: ${TK(t.lv[k] ?? -1)[0]}`}));
    Laci.buka("Titik rob", t.kec, [pilT(lv), esc(`${t.kab}, ${t.prov}`)], `<div class="kpis">${kot("Muka laut maksimum", d < 0 ? "–" : m1(t.h[d]) + " m", d < 0 ? "hari ini di luar data" : labelHari(S.hari), "ombak")}${kot("Ambang Waspada", mM(t.p95), "persentil 95 model", "peringatan")}${kot("Ambang Siaga", mM(t.p99), "persentil 99 model", "bel")}${kot("Tertinggi tercatat", mM(t.amax), "dalam arsip model", "debit")}</div>
      ${sek("Lokasi", "pusat", lbs(brs("kab", "Kecamatan", esc(t.kec), true), brs("peta", "Kabupaten/kota", esc(t.kab), true), brs("peta", "Provinsi", esc(t.prov)), brs("pusat", "Koordinat", koord(t.lat, t.lon), true)))}
      ${sek("Muka laut maksimum harian (meter)", "ombak", `${t.p95 == null ? `<p class="fnd">Titik ini belum punya arsip model yang cukup, jadi ambang dan status tidak dihitung.</p>` : ""}<div class="tw sk gp-wr">${GrafikP.batangV(cols, {lebar: lebarLaci(), garis: t.p95 == null ? [] : [{v: t.p95, w: "#e0b400", n: "Waspada"}, {v: t.p99, w: "#e8743b", n: "Siaga"}]})}</div>`, "model SMOC (MeteoFrance) lewat Open-Meteo Marine")}
      ${catatan(["Muka laut dari model SMOC (MeteoFrance) terhadap rata-rata muka laut global.", "Ambang Waspada (persentil 95) dan Siaga (persentil 99) dihitung dari arsip model sendiri, bukan dari datum lokal.", "Ini bukan peringatan resmi."], (S.rob.sumber || []).join(", "))}`); },
  pasut(i) { const s = S.pas.stasiun[i], pu = S.pasP?.stasiun?.find(x => x.id === s.id), hari = s.hari || [], tg = S.hari;
    const cols = hari.slice(0, 14).map(h => ({n: tglSgk(h[0]).replace(" ", " "), v: h[1], w: PASUT[kelasPasut(s, h[1])][1], txt: String(h[1]), tip: `<b>${tglSgk(h[0])}</b><br>Pasang tertinggi: ${fmt(h[1])} cm<br>Pukul: ${jamT(h[2])} WIB`}));
    const hi = hari.find(h => h[0] === tg), pk = (pu?.puncak || []).filter(p => p.t.slice(0, 10) === tg);
    Laci.buka("Stasiun pasang surut", s.nama, [hi && pilW(fmt(hi[1]) + " cm", PASUT[kelasPasut(s, hi[1])][1]), esc(s.prov)], `<div class="kpis">${kot("Pasang tertinggi", hi ? fmt(hi[1]) + " cm" : "–", hi ? `${labelHari(tg)} pukul ${jamT(hi[2])} WIB` : "di luar data", "ombak")}${kot("Tipikal (median)", fmt(s.p50) + " cm", "puncak harian", "debit")}${kot("Persentil 75", fmt(s.p75) + " cm", "puncak harian", "rasio")}${kot("Persentil 90", fmt(s.p90) + " cm", `${fmt(s.hari_basis)} hari basis`, "peringatan")}</div>
      ${sek("Lokasi", "pusat", lbs(brs("peta", "Provinsi", esc(s.prov)), brs("pusat", "Koordinat", koord(s.lat, s.lon), true), brs("debit", "Acuan tinggi", "rata-rata muka laut")))}
      ${pk.length ? sek(`Puncak ${labelHari(tg)}`, "waktu", lbs(...pk.map(p => brs(p.jenis === "tinggi" ? "ombak" : "dalam", `${p.jenis === "tinggi" ? "Pasang" : "Surut"} pukul ${jamT(p.t.slice(11, 16))} WIB`, fmt(p.cm) + " cm")))) : ""}
      ${sek("Pasang tertinggi harian, 14 hari (cm)", "debit", `<div class="tw sk gp-wr">${GrafikP.batangV(cols, {lebar: lebarLaci(), tinggi: 180, garis: [{v: s.p90, w: "#e8743b", n: "Persentil 90"}]})}</div>
        <p class="fnd">Tinggi dalam sentimeter terhadap rata-rata muka laut.</p>`, "BMKG Maritim")}
      ${catatan(["Prediksi astronomis BMKG Maritim, bukan pengamatan.", "Persentil 90 dihitung dari puncak harian stasiun itu sendiri, bukan ambang banjir.", "Warna batang: jingga di atas persentil 90, kuning di atas persentil 75, biru di bawahnya."], S.pas.sumber)}`); },
  ombak(i) { const r = S.gel.titik[i], hs = Pesisir.hsHari(S.gel, r, S.hari), t0 = Date.parse(S.gel.t0);
    const pts = r[4].map((v, k) => ({x: t0 + k * 36e5, y: v / 10})).filter((_, k) => k % 3 === 0).map(p => ({x: Math.round((p.x - Date.parse(S.hari + "T00:00:00+07:00")) / 36e5), y: p.y})).filter(p => p.x >= -24 && p.x <= 96);
    Laci.buka("Gelombang model", r[3] || namaProv(r[2]), [hs == null ? "" : pilGel(hs), esc(namaProv(r[2]))], `<div class="kpis">${kot("Tertinggi " + kapan(S.hari), mM(hs), hs == null ? "di luar jendela data" : "model Open-Meteo Marine", "ombak")}${kot("Tertinggi 72 jam", m1(Math.max(...r[4]) / 10) + " m", "dalam jendela data", "waktu")}</div>
      ${sek("Lokasi", "pusat", lbs(r[3] && brs("kab", "Titik", esc(r[3]), true), brs("peta", "Provinsi", esc(namaProv(r[2]))), brs("pusat", "Koordinat", koord(r[0], r[1]), true)))}
      ${pts.length > 2 ? sek("Tinggi gelombang tiap 3 jam (meter)", "ombak", `<div class="tw sk gp-wr">${GrafikP.garis([{n: "hs", w: "#3f7fb8", titik: pts}], {lebar: lebarLaci(), tinggi: 180, fx: x => x + " j", tip: x => { const p = pts.find(q => q.x === x); return `<b>Jam ${x} dari ${tglSgk(S.hari)}</b><br>Tinggi: ${p ? m1(p.y) : "–"} m`; }})}</div>
        <p class="fnd">Jam 0 adalah tengah malam ${tglSgk(S.hari)}; huruf j berarti jam.</p>`, "Open-Meteo Marine") : sek("Tinggi gelombang tiap 3 jam (meter)", "ombak", `<p class="fnd">Data model terakhir dibuat ${jamWIB(S.gel.dibuat)} dan tidak mencakup ${tglSgk(S.hari)}, jadi grafik tidak digambar.</p>`)}
      ${catatan(["Keluaran model gelombang di titik pesisir, bukan peringatan BMKG Maritim.", "Kelas pada pil mengikuti ambang BMKG: 2,5 m, 4 m, dan 6 m."], S.gel.sumber)}`); },
  glb(k) { const o = S.glb.find(x => x.prov === k), nm = ["Tinggi (2,5 sampai 4 m)", "Sangat tinggi (4 sampai 6 m)", "Ekstrem (di atas 6 m)"], KL = ["Tinggi", "Sangat tinggi", "Ekstrem"];
    const kg = n => Pesisir.KELAS_GEL.find(c => c[1] === n), top = kg(KL[o.lv - 1]), jam = x => `${tglSgk(x.slice(0, 10))} pukul ${jamT(x.slice(11, 16))} ${o.zona}`;
    const kel = o.kelas.map((n, i) => n ? {i, nama: nm[i], n, p: o.perairan[i]} : null).filter(Boolean);
    const bar = kel.length > 1 && LI()?.kelasBar ? LI().kelasBar(kel.map(x => ({label: KL[x.i], nilai: x.n, teks: fmt(x.n), w: kg(KL[x.i])[2], pil: true}))) : "";
    Laci.buka("Peringatan gelombang BMKG", namaProv(k), [pilW(top[1], top[2]), "peringatan resmi"], `<div class="kpis">${kot("Perairan", fmt(o.total), "dalam peringatan", "peringatan")}${kot("Kelas tertinggi", esc(top[1]), ["2,5 sampai 4 m", "4 sampai 6 m", "di atas 6 m"][o.lv - 1], "ombak")}</div>
      ${sek("Masa berlaku", "waktu", lbs(o.dari && brs("waktu", "Mulai", jam(o.dari)), brs("bel", "Sampai", jam(o.sampai))))}
      ${bar ? sek("Perairan per kelas", "debit", bar) : ""}
      ${kel.map(x => sek(`${x.nama}: ${fmt(x.n)} perairan`, "peringatan", `<ol class="gp-perairan" translate="no">${x.p.map(n => `<li>${esc(n)}</li>`).join("")}</ol>`)).join("")}
      ${catatan(["Daftar perairan dari BMKG Maritim, ditampilkan apa adanya.", "Kelas: Tinggi 2,5 sampai 4 m, Sangat tinggi 4 sampai 6 m, Ekstrem di atas 6 m."], "BMKG Maritim")}`); }
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
    return L.slice(0, 80).map(x => `<button class="rw" data-pas="${x.i}"><span class="rw-hd">${pilW(fmt(x.h[1]) + " cm", PASUT[kelasPasut(x.s, x.h[1])][1])}<b translate="no">${esc(x.s.nama)}</b></span><span class="rw-wil" translate="no">${esc(x.s.prov)}</span><span class="rw-jam">Pukul ${jamT(x.h[2])} WIB, persentil 90 stasiun ${fmt(x.s.p90)} cm</span></button>`).join("") || kosong(`Tidak ada data pasang surut untuk ${tglSgk(tg)}.`); }
  const B = S.glb.filter(o => cocok(namaProv(o.prov))).map(o => { const k = Pesisir.KELAS_GEL.find(c => c[1] === ["Tinggi", "Sangat tinggi", "Ekstrem"][o.lv - 1]);
    return `<button class="rw" data-glb="${o.prov}"><span class="rw-hd">${pilW(k[1], k[2])}<b translate="no">${esc(namaProv(o.prov))}</b></span><span class="rw-wil">Peringatan BMKG, ${fmt(o.total)} perairan</span></button>`; }).join("");
  const M = S.gel ? Pesisir.gelHari(S.gel, tg).filter(x => cocok(x.nama, namaProv(x.prov))).slice(0, 60).map(x => `<button class="rw" data-gel="${S.gel.titik.indexOf(x.r)}"><span class="rw-hd">${pilGel(x.hs)}<b translate="no">${esc(x.nama || namaProv(x.prov))}</b></span><span class="rw-wil" translate="no">${esc(namaProv(x.prov))}</span><span class="rw-jam">Model: tertinggi ${m1(x.hs)} m</span></button>`).join("") : "";
  const tanpaGel = S.gel && !Pesisir.gelHari(S.gel, tg).length;   /* data model tak mencakup hari ini: tulis alasannya, bukan daftar kosong */
  const ket = tanpaGel ? kosong(`Data gelombang terakhir dibuat ${jamWIB(S.gel.dibuat)} dan tidak mencakup ${tglSgk(tg)}.`) : "";
  return (B ? `<div class="lbl gp-sub">Peringatan resmi BMKG Maritim</div>` + B : "") + (M ? `<div class="lbl gp-sub">Titik pesisir, gelombang model</div>` + M : "") + ket || kosong(S.per ? "Tidak ada peringatan gelombang BMKG yang berlaku pada data terbit " + jamWIB(S.per.dibuat) + "." : "Data gelombang tidak terbaca."); }
function renderPanel() {
  const q = ($("#cari").value || "").trim().toLowerCase(), T = tersedia(), M = [["abrasi", "Abrasi"], ["rob", "Rob"], ["pasang", "Pasang"], ["ombak", "Ombak"]];
  /* deretan pilihan berikon (ikon sama dengan pil kategori kartu, IK_EY di insight.js) */
  $("#panelMode").innerHTML = M.map(([k, n]) => `<button data-m="${k}" aria-pressed="${S.mode === k}"${T[k] ? "" : " disabled"}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_EY[k] || ""}</svg>${n}</button>`).join("");
  const unduh = window.UnduhTabel?.tombol() || "";   /* hanya bila registri menyalakan kemampuan.layar.unduh_tabel (PB-86, F-34) */
  /* tombol unduh di ujung kanan baris pilihan (pola karhutla dan gempa), bukan baris sendiri di atas daftar */
  const u = $("#gpUnduh"); if (u && u.innerHTML !== unduh) u.innerHTML = unduh;
  $("#rows").innerHTML = barisPanel(q);
  window.PilihTanggal?.gambar(); }
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

/* PB-86 (F-40): tab Operasi, tersembunyi untuk tamu; logika dan probe hak baca di operasi.js (dimuat di sini supaya index.html tidak berubah). */
{ const s = document.createElement("script"); s.src = "operasi.js?v=1"; s.onload = () => window.PesisirOperasi?.pasang(); document.head.append(s); }

/* ================================================================ mulai */
(async () => {
  Tip.polaSatu = null; pasangTip();
  try { await muatData(); } catch (e) { console.error(e); toast("Sebagian data tidak terbaca."); }
  renderHari(); renderPanel();
  await Peta.init().catch(e => { console.error(e); $("#muat").innerHTML = "<div>Peta tidak bisa dimuat. Muat ulang halaman.</div>"; });
  $("#muat").classList.add("hilang");
  const awal = (location.pathname.match(/^\/pesisir\/([a-z]+)/) || [])[1]; bukaTab(TABS.some(t => t[0] === awal) ? awal : "peta", false);
})();
