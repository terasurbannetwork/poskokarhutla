"use strict";
/* Cuaca ekstrem: state, data, tab. Format dasar ($, fmt, esc, jamWIB, rb) dari ../inti/format.js; kartu dari ../inti/kartu.js.
   Status resmi BMKG (nowcast CAP, gelombang) dibaca apa adanya dari ../data/peringatan.json dan hanya disaring menurut jam berlaku;
   prakiraan hujan, embusan, dan ansambel dari ../banjir/data/cuaca_prakiraan.json (scripts/cuaca/cuaca.py). Data yang tak terbaca dibuang, bukan ditampilkan kosong (A18). */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
function gradasi(st, v) { for (let k = 1; k < st.length; k++) if (v <= st[k][0]) { const [a, ca] = st[k - 1], [b, cb] = st[k], t = (v - a) / (b - a);
    return ca.map((c, j) => Math.round(c + (cb[j] - c) * t)); } return st[st.length - 1][1]; }

/* ================================================================ istilah */
/* ?sekarang=2026-10-13T02:00:00+07:00 mengganti jam untuk menguji layar dengan data lama; tanpa itu jam peramban */
const SEKARANG = () => { const q = new URLSearchParams(location.search).get("sekarang"), t = q && Date.parse(q); return t || Date.now(); };
const tglWIB = t => new Date(t + 7 * 36e5).toISOString().slice(0, 10);
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
const OFS = {WIB: "+07:00", WITA: "+08:00", WIT: "+09:00"};
/* skala hujan harian BMKG (mm): lebat 50, sangat lebat 100, ekstrem 150; embusan (km/jam) 54, 72, 90 = 15, 20, 25 m/s */
const ST_HUJAN = [[0, [120, 170, 230, 0]], [1, [150, 205, 240, 90]], [5, [110, 180, 235, 150]], [20, [60, 140, 220, 200]], [50, [40, 80, 200, 225]], [100, [110, 50, 190, 235]], [150, [190, 40, 140, 245]], [250, [120, 20, 60, 250]]];
const ST_ANGIN = [[0, [120, 200, 190, 0]], [25, [140, 205, 190, 70]], [40, [190, 215, 130, 150]], [54, [227, 185, 78, 215]], [72, [229, 138, 69, 235]], [90, [201, 80, 58, 245]], [130, [120, 20, 40, 250]]];
const WARNA_LV = ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"];
const KELAS_HUJAN = ["", "lebat", "sangat lebat", "ekstrem"], KELAS_ANGIN = ["", "waspada", "siaga", "awas"];
const tingkat = (v, a) => a.reduce((n, x) => n + ((v || 0) >= x ? 1 : 0), 0);
/* tingkat peringatan CAP BMKG dengan warnanya (kata asli BMKG dipertahankan) */
const WARNA_SEV = {Minor: "#e3b94e", Moderate: "#e58a45", Severe: "#c9503a", Extreme: "#7a1f2b"}, SEV_ASAL = "#8a96a6";
/* kelas gelombang BMKG Maritim yang jadi PERINGATAN: tinggi, sangat tinggi, ekstrem (tinggi dalam meter). Kelas "sedang" (1,25 sampai 2,5 m) ada di berkas BMKG tetapi bukan peringatan
   (sama dengan hitungan scripts/banjir/peringatan.py "kategori tinggi+"), jadi tidak dihitung: "21 provinsi dalam peringatan" dulu menghitung provinsi yang hanya bergelombang sedang. */
const GEL = [["tinggi", "Tinggi", "2,5 sampai 4 m", "#3f7fb8"], ["sangat_tinggi", "Sangat tinggi", "4 sampai 6 m", "#5b4fb0"], ["ekstrem", "Ekstrem", "di atas 6 m", "#2a1f6b"]];

/* ================================================================ state */
const S = {pr: null, meta: null, per: null, geo: null, hari: 0, h0: 0, mode: "hujan", nc: [], gl: [], kec: null, gel: null, sik: null, sar: null, ver: null, dmp: null};
/* tingkat Pantau Bencana (registry cuaca.tingkat); ganti dari /bencana.json bila terbaca */
let TINGKAT = [["Normal", "#9aa4b2"], ["Waspada", "#e0b400"], ["Siaga", "#e8743b"], ["Awas", "#d64545"]];
const warnaT = t => TINGKAT[t]?.[1] || TINGKAT[0][1], namaT = t => TINGKAT[t]?.[0] || "";
const pilT = t => `<span class="pl" style="--w:${warnaT(t)}">${namaT(t)}</span>`;
const lbl3 = j => { const h = S.kec?.hari?.[j] ?? S.pr.hari[S.h0 + j], n = Math.round((Date.parse(h + "T12:00:00+07:00") - Date.parse(tglWIB(SEKARANG()) + "T12:00:00+07:00")) / 864e5); if (basi()) return "prakiraan " + tglSgk(h); return n === 0 ? "Hari ini" : n === 1 ? "Besok" : n === 2 ? "Lusa" : tglPendek(h); };
/* kata keterangan waktu dalam kalimat: hari ini, besok, lusa, atau "pada 13 Okt" */
const kapan3 = j => { const h = S.kec?.hari?.[j] ?? S.pr.hari[S.h0 + j], n = Math.round((Date.parse(h + "T12:00:00+07:00") - Date.parse(tglWIB(SEKARANG()) + "T12:00:00+07:00")) / 864e5); return basi() || n < 0 || n > 2 ? "pada " + tglSgk(h) : ["hari ini", "besok", "lusa"][n]; };
const kIdx = () => S.kec ? S.kec.hari.indexOf(S.pr.hari[S.hari]) : -1;   /* hari terpilih di kontrak 72 jam; -1 = di luar 3 hari */
const tglSgk = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
/* prakiraan dibuat bukan pada hari WIB ini: "Hari ini/Besok" diganti tanggal */
const basi = () => !!S.meta && tglWIB(Date.parse(S.meta.dibuat)) !== tglWIB(SEKARANG());
const pct = (a, b) => b ? Math.round(a / b * 100) : null;
const namaProv = k => S.meta?.prov?.[k] ?? k;
const AMB = () => S.meta.ambang;

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["berita", "Berita"], ["tren", "Tren"], ["dampak", "Dampak"], ["foto", "Foto"], ["tentang", "Tentang"], ["metode", "Metode"]];
const TAB_SEMBUNYI = new Set(["metode"]); /* ada tapi tidak di menu (A24), seperti Metode karhutla dan banjir */
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const halamanAda = id => !!$("#p-" + id);
function bukaTab(id, dorong = true) {
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/cuaca/" + id + location.search);
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } }
    ({insight: Insight, metode: Metode, berita: Berita, tren: Tren, dampak: Dampak, foto: Foto})[id]?.render(); });
}
{ const tb = ([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k] || ""}</svg>${n}</button>`;
  $("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(tb).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme:dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };

/* ================================================================ data */
/* berkas tambahan boleh hilang: kartu dan lapisan yang datanya tak ada dibuang (A18) */
const opsi = u => muatJSON(u).catch(() => null);
async function muatTambahan() {
  const B = "../banjir/data/", [kec, gel, sik, sar, ver, dmp, reg] = await Promise.all(["kec", "gelombang", "siklon", "sarana", "verifikasi", "dampak"].map(n => opsi(B + "cuaca_" + n + ".json")).concat(opsi("/bencana.json")));
  const tg = reg?.bencana?.find(b => b.id === "cuaca")?.tingkat; if (tg?.length === 4) TINGKAT = tg.map(x => [x.nama, x.warna]);
  if (kec?.kec?.length) { const pk = await opsi(B + "pusat_kec.json"); if (pk) Object.assign(S, {kec, kecKunci: Object.keys(pk), kecPusat: Object.values(pk)}); }
  if (gel?.titik?.length) S.gel = gel;
  if (sik?.aktif?.length) S.sik = sik;
  if (sar && dmp && (dmp.pelabuhan?.length || dmp.bandara?.length)) S.sar = sar;
  if (ver && (ver.bmkg || ver.kita)) S.ver = ver;
  S.dmp = dmp;
}
async function muatData() {
  const tambahan = muatTambahan();
  const [pr, meta, geo] = await Promise.all([muatJSON("../banjir/data/cuaca_prakiraan.json"), muatJSON("../banjir/data/cuaca_meta.json"), muatJSON("../geo/provinsi.json")]);
  Object.assign(S, {pr, meta, geo});
  /* nowcast: /api/cuaca/nowcast (Worker menarik BMKG tiap 10 menit) lebih dulu, lalu peringatan.json harian; gelombang selalu dari peringatan.json.
     S.ncDibuat = waktu terbit RSS BMKG yang sebenarnya (atau waktu tarik bila terbit tak ada); null bila nowcast dari berkas harian. */
  const [file, api] = await Promise.all([muatJSON("../data/peringatan.json").catch(() => null), muatJSON("/api/cuaca/nowcast").catch(() => null)]);
  const apiSah = api && Array.isArray(api.nowcast) && (api.terbit || api.dibuat);
  S.ncDibuat = apiSah ? api.terbit || api.dibuat : null;
  S.per = apiSah ? {gelombang: [], ...file, dibuat: file ? file.dibuat : S.ncDibuat, nowcast: api.nowcast} : file; /* BMKG tak terbaca: bagian peringatan dibuang, prakiraan tetap */
  /* hari ini menurut jam WIB peramban; di luar jangkauan data (data basi) jatuh ke hari_ini data */
  const i = pr.hari.indexOf(tglWIB(SEKARANG())); S.h0 = S.hari = i >= 0 ? i : Math.max(0, pr.hari.indexOf(pr.hari_ini));
  S.sel = new Map(pr.sel.map(r => [r[0].toFixed(3) + "," + r[1].toFixed(3), r]));
  S.ensK = new Map(pr.ens.map(r => [Math.round(r[0]) + "," + Math.round(r[1]), r]));
  olahPeringatan();
  await tambahan;
  $("#upd").textContent = "Data " + jamWIB(meta.dibuat);
}
/* peringatan yang masih berlaku pada jam sekarang. Nowcast: satu CAP satu baris. Gelombang: satu provinsi satu baris (nama perairan dihitung per kelas);
   baris ringkasan "Indonesia" tanpa kode provinsi dibuang agar tak terhitung dua kali. */
function olahPeringatan() {
  const t = SEKARANG(), p = S.per; S.nc = []; S.gl = []; if (!p) return;
  S.nc = (p.nowcast || []).filter(a => Date.parse(a.selesai) > t && a.polygon?.length).map(a => ({...a, n: a.wilayah.split(",").length}));
  const per = {};
  for (const g of p.gelombang || []) { if (!g.prov || Date.parse(g.sampai + (OFS[g.zona] || "+07:00")) <= t) continue;
    const o = per[g.prov] ||= {prov: g.prov, nama: g.wilayah, kelas: [0, 0, 0], perairan: [[], [], []], dari: g.dari, sampai: g.sampai, zona: g.zona};
    GEL.forEach((k, i) => { o.kelas[i] += g[k[0]].length; o.perairan[i].push(...g[k[0]]); }); if (g.sampai > o.sampai) o.sampai = g.sampai; }
  S.gl = Object.values(per).map(o => ({...o, lv: o.kelas.reduce((a, n, i) => n ? i + 1 : a, 0), total: o.kelas.reduce((a, b) => a + b, 0)})).filter(o => o.lv);
}
/* hari-hari yang ditampilkan: hari ini sampai 6 hari ke depan (yang tersedia) */
const hariTampil = () => { const a = []; for (let i = S.h0; i < Math.min(S.pr.hari.length, S.h0 + 7); i++) a.push(i); return a; };
const labelHari = i => basi() ? tglSgk(S.pr.hari[i]) : i === S.h0 ? "Hari ini" : i === S.h0 + 1 ? "Besok" : tglPendek(S.pr.hari[i]);
const waktuBerlaku = (a, b) => { const d = x => new Date(x).toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", ""); return `${d(a)} sampai ${d(b)} WIB`; };
