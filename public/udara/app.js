"use strict";
/* Inti halaman /udara/: util, kategori ISPU, state, tab, tema, muat data. $, fmt, esc, jamWIB, rb ada di inti/format.js. */
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
const gradasi = (st, v) => { for (let k = 1; k < st.length; k++) if (v <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (v - a) / (b - a);
  return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[st.length - 1][1]; };

/* ================================================================ kategori
   Titik potong PM2,5 rata-rata 24 jam Permen LHK P.14/2020 (sama dengan scripts/udara/kualitas.py BATAS); nama dan warna dari public/bencana.json. */
const BATAS = [15.5, 55.4, 150.4, 250.4];
const KAT = [{n: "Baik", w: "#5a9e74", fg: "#fff", r: "0 sampai 15,5"}, {n: "Sedang", w: "#e3b94e", fg: "#3b2e00", r: "15,6 sampai 55,4"},
  {n: "Tidak sehat", w: "#e8743b", fg: "#fff", r: "55,5 sampai 150,4"}, {n: "Sangat tidak sehat", w: "#d64545", fg: "#fff", r: "150,5 sampai 250,4"}, {n: "Berbahaya", w: "#8a2be2", fg: "#fff", r: "di atas 250,4"}];
const kat = v => BATAS.reduce((n, b) => n + (v > b), 0);
const pilKat = c => `<span class="kt" style="--c:${KAT[c].w};--f:${KAT[c].fg}">${KAT[c].n}</span>`;
/* Jiwa = perkiraan model CAMS mentah (belum dikoreksi ke alat ukur): selalu dibulatkan dan diberi "sekitar", tanpa desimal presisi palsu.
   kr = ringkas untuk label grafik/tabel; jiwa = kalimat. PIL_MODEL dipasang di kepala kartu yang memuat angka jiwa. */
const kr = v => v >= 1e7 ? fmt(Math.round(v / 1e6)) + " jt" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " jt" : v >= 1e3 ? fmt(Math.round(v / 1e3)) + " rb" : fmt(Math.round(v));
const jiwa = v => (v < 1e3 ? "" : "sekitar ") + (v >= 1e7 ? fmt(Math.round(v / 1e6)) + " juta" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " juta" : v >= 1e3 ? fmt(Math.round(v / 1e3)) + " ribu" : fmt(Math.round(v))) + " jiwa";
const PIL_MODEL = '<span class="kt" style="--c:#6b7280;--f:#fff;text-transform:none;letter-spacing:0">perkiraan model CAMS, belum dikoreksi</span>';
/* gradasi warna peta PM2,5 (µg/m³ -> rgba): hijau samar sampai ungu pekat, titik beloknya batas kategori */
const ST_PM = [[0, [90, 158, 116, 0]], [15.5, [90, 158, 116, 85]], [35, [227, 185, 78, 150]], [55.4, [232, 116, 59, 185]], [150, [214, 69, 69, 210]], [250, [138, 43, 226, 225]], [500, [80, 15, 140, 235]]];
/* jarak pandang METAR (m): ICAO kabut < 1000 m, kabut tipis/asap tipis < 5000 m */
const JP = [{n: "Jernih (8 km atau lebih)", w: "#5a9e74", min: 8000}, {n: "Agak berkabut (5 sampai 8 km)", w: "#e3b94e", min: 5000}, {n: "Berkabut atau berasap (1,5 sampai 5 km)", w: "#e8743b", min: 1500}, {n: "Sangat pekat (di bawah 1,5 km)", w: "#d64545", min: 0}];
const kelasJP = v => JP.findIndex(j => v >= j.min);
const WX = {FU: "asap", HZ: "kabut asap kering (haze)", BR: "kabut tipis", FG: "kabut", DU: "debu"};
const wxNama = w => (w || "").split(/\s+/).map(t => WX[t.replace(/^[+-]|^VC/, "")]).filter(Boolean).join(", ");
const MAKS_JAM_METAR = 12;   /* laporan METAR lebih tua dari ini dibuang (A18), bukan ditampilkan basi */

/* ================================================================ state */
const S = {uk: null, prak: null, metar: [], geo: null, hari: 0, h0: 0, rw: null, bbProv: {}, maksJam: MAKS_JAM_METAR};
/* ?sekarang=2026-10-13T02:00:00+07:00 mengganti jam untuk menguji layar dengan data lama; tanpa itu jam peramban */
const SEKARANG = () => { const q = new URLSearchParams(location.search).get("sekarang"), t = q && Date.parse(q); return t || Date.now(); };
const tglWIB = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10);
/* indeks hari ini (WIB) di prakiraan; hari yang sudah lewat tidak ditawarkan. Data lebih tua dari hari ini: jatuh ke hari pertamanya dan diberi tanggal, bukan "Hari ini" (data basi tidak menyamar jadi hari ini). */
const labelHari = i => S.uk.hari[i] === tglWIB(SEKARANG()) ? "Hari ini" : tglPendek(S.uk.hari[i]);
const hariTampil = () => S.uk.hari.map((t, i) => i).filter(i => i >= S.h0);
/* kode Kemendagri -> nama provinsi (prakiraan.json hanya membawa kode) */
const NAMA_PROV = {"11":"Aceh","12":"Sumatera Utara","13":"Sumatera Barat","14":"Riau","15":"Jambi","16":"Sumatera Selatan","17":"Bengkulu","18":"Lampung","19":"Kep. Bangka Belitung","21":"Kepulauan Riau","31":"DKI Jakarta","32":"Jawa Barat","33":"Jawa Tengah","34":"DI Yogyakarta","35":"Jawa Timur","36":"Banten","51":"Bali","52":"Nusa Tenggara Barat","53":"Nusa Tenggara Timur","61":"Kalimantan Barat","62":"Kalimantan Tengah","63":"Kalimantan Selatan","64":"Kalimantan Timur","65":"Kalimantan Utara","71":"Sulawesi Utara","72":"Sulawesi Tengah","73":"Sulawesi Selatan","74":"Sulawesi Tenggara","75":"Gorontalo","76":"Sulawesi Barat","81":"Maluku","82":"Maluku Utara","91":"Papua","92":"Papua Barat","93":"Papua Selatan","94":"Papua Tengah","95":"Papua Pegunungan","96":"Papua Barat Daya"};
const namaProv = k => NAMA_PROV[k] ?? k;
/* kab/kota prakiraan terdekat ke titik (derajat, bujur dikoreksi lintang); null bila lebih jauh dari maksDeg */
const kotaTerdekat = (la, lo, maksDeg = 1.2) => { let b = null, bd = maksDeg * maksDeg, c = Math.cos(la * Math.PI / 180);
  for (const k of S.prak.kota) { const d = (k.lat - la) ** 2 + ((k.lon - lo) * c) ** 2; if (d < bd) { bd = d; b = k; } } return b; };

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["kejadian", "Kejadian"], ["insight", "Insight"], ["berita", "Berita"], ["tren", "Tren"], ["dampak", "Dampak"], ["simulasi", "Simulasi"], ["foto", "Foto"], ["tentang", "Tentang"], ["informasi", "Informasi"], ["metode", "Metode"]];
const TAB_SEMBUNYI = new Set(["informasi", "metode"]); /* ada tapi tidak di menu (A24), seperti Metode karhutla dan banjir */
const IK_TAB = {kejadian: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  simulasi: '<path d="M4 4v16h16"/><path d="M7 15c3-1 3-8 6-8s3 7 7 6"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', metode: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
function bukaTab(id, dorong = true) {
  if (!TABS.some(t => t[0] === id)) id = "peta";
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/udara/" + id);   /* tautan bersih tanpa tagar; worker melayani index.html untuk jalur ini */
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } }
    ({kejadian: Kejadian, insight: Insight, metode: Metode, berita: Berita, tren: Tren, dampak: Dampak, foto: Foto, simulasi: Simulasi, informasi: window.Informasi})[id]?.render(); });
}
/* tab Kejadian hanya ada bila ada kejadian segar (A18): dipanggil lagi sesudah berkasnya terbaca */
const tbTab = ([k, n]) => `<button data-t="${k}" aria-current="${document.querySelector("#p-" + k)?.classList.contains("on") ? "page" : (k === "peta" ? "page" : "false")}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k]}</svg>${n}</button>`;
const isiTab = () => { const T = TABS.filter(t => !TAB_SEMBUNYI.has(t[0]) && (t[0] !== "kejadian" || (typeof Kejadian !== "undefined" && Kejadian.ada()))), el = $("#tabs");
  if (el.children.length && [...el.children].map(b => b.dataset.t).join() === T.map(t => t[0]).join()) return;   /* himpunan tab sama: jangan tulis ulang (fokus dan menu tetap) */
  el.innerHTML = T.map(tbTab).join(""); };
{ isiTab();
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };
/* ================================================================ data */
async function muatData() {
  /* SATU jalur data: prakiraan.json (514 kab/kota, 72 jam, udara.yml 2x sehari) + rentan.json. Tanpa prakiraan halaman tidak bisa dibuka. */
  const dp = n => muatJSON("/udara/data/" + n + ".json").catch(() => null);
  const [prak, geo, lin, atr, ren, rw] = await Promise.all([dp("prakiraan"), muatJSON("../geo/provinsi.json"), dp("lintasan"), dp("atribusi"), dp("rentan"), dp("riwayat")]);
  if (!prak?.kota?.length || !prak.kota.some(k => k.jiwa > 0)) throw new Error("prakiraan.json belum tersedia");
  const {uk, mk} = Murni.satukan(prak);
  Object.assign(S, {uk, mk, prak, geo, lin, atr, ren, rw});
  S.h0 = S.hari = Math.max(0, uk.hari.indexOf(tglWIB(SEKARANG())));
  /* METAR boleh tidak ada: kartu dan lapisannya dibuang */
  S.metar = await muatJSON("../data/metar.json").catch(() => []);
  $("#upd").textContent = "Data " + jamWIB(uk.dibuat);
  await Kejadian.muatAwal(); isiTab();
}
/* stasiun METAR segar (laporan <= maksJam jam, jarak pandang terbaca) */
const metarSegar = () => S.metar.filter(m => m.vis_m != null && (Date.now() - new Date(m.waktu)) / 36e5 <= S.maksJam);
