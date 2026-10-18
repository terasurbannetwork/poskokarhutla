"use strict";
/* Kerangka halaman gunung api: util, state, tab, tema, muat data, bagikan. Format ($, fmt, esc, jamWIB, rb) dari inti/format.js. */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }

/* Level resmi PVMBG apa adanya: nama dan angka romawi dari MAGMA. Warna sama dengan tingkat di public/bencana.json (abu untuk Normal: bukan pernyataan bebas bahaya). */
const LEVEL = {1: ["I", "Normal"], 2: ["II", "Waspada"], 3: ["III", "Siaga"], 4: ["IV", "Awas"]};
const WARNA_LV = {1: "#9aa4b2", 2: "#e0b400", 3: "#e8743b", 4: "#d64545"};
const FG_LV = {1: "#fff", 2: "#3b2e00", 3: "#fff", 4: "#fff"};
const IK_GN = '<path d="M3 20 9 9h6l6 11z"/><path d="M12 9V6M9.5 5l-1-2M14.5 5l1-2"/>';
/* label pil berwarna + ikon gunung (A3) */
const pilLv = (l, pendek = false) => `<span class="pl lvp" style="--w:${WARNA_LV[l]}"><svg viewBox="0 0 24 24" aria-hidden="true">${IK_GN}</svg>${pendek ? LEVEL[l][1] : `Level ${LEVEL[l][0]} ${LEVEL[l][1]}`}</span>`;
const tglJam = t => new Date(t).toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(/\./g, ":") + " WIB";

const S = {st: null, level: 0, q: "", urut: {k: "lv", d: -1}, geo: {prov: null}};   /* level 0 = semua */
/* kode provinsi BPS -> nama (Berita memberi kode); tabel administratif statis */
const PROV = {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kep. Bangka Belitung", 21: "Kepulauan Riau",
  31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur", 61: "Kalimantan Barat",
  62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan", 74: "Sulawesi Tenggara", 75: "Gorontalo",
  76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua", 92: "Papua Barat", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua Barat Daya"};
const namaProv = k => PROV[k] ?? k;
/* id gunung = aturan SATU dengan abu.id_gunung (scripts/gunungapi/abu.py): huruf kecil, spasi jadi "-", tanpa tanda baca selain "-" ("lewotobi-laki-laki") */
const idGn = nama => String(nama).toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").split(/\s+/).filter(Boolean).join("-");
/* berkas turunan dimuat malas dan sekali: null bila tak terjangkau (bagian yang bergantung padanya dibuang, A18) */
const DATA = {};
const sekali = (k, u) => DATA[k] ||= muatJSON(u).catch(() => { delete DATA[k]; return null; });
const Data = {abu: () => sekali("abu", "../banjir/data/abu_gunungapi.json"), pap: () => sekali("pap", "data/paparan.json"), geo: () => sekali("geo", "data/paparan_geo.json"), bandara: () => sekali("bandara", "data/bandara.json"),
  /* paparan per id gunung */
  async pg(id) { const p = await this.pap(); return p?.gunung?.find(x => x.id === id) || null; }};
const ARAH8 = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
const arahMata = d => ARAH8[Math.round(d / 45) % 8];
/* jejak berambang dengan sel_n < 5 dianggap derau = di bawah ambang penerbangan (selaras abu.py / laporan.py) */
const SEL_MIN = 5, jejakOk = j => !!j?.poligon?.length && !j.di_bawah_ambang && (j.sel_n ?? SEL_MIN) >= SEL_MIN;
/* evakuasi desa KRB III/II saja, waktu tempuh arus bebas: ringkasan dari paparan.evakuasi_ringkas {n, median_menit, maks_menit} (dihitung dari SEMUA desa III/II, daftar evakuasi bisa dipotong);
   daftar desa yang tampil = entri berzona_desa III/II (I hanya fallback, tidak masuk) */
const evakZona = pg => (pg?.evakuasi || []).filter(e => e.menit > 0 && ["III", "II"].includes(e.zona_desa));
const evakRingkas = pg => pg?.evakuasi_ringkas?.n ? pg.evakuasi_ringkas : null;
const evakTerlama = pg => { const r = evakRingkas(pg); return r && (evakZona(pg).find(e => e.menit === r.maks_menit) || evakZona(pg).reduce((a, e) => !a || e.menit > a.menit ? e : a, null)); };
const WARNA_ZONA = {III: "#d64545", II: "#e8743b", I: "#e0b400"};
const pilZona = z => `<span class="pl" style="--w:${WARNA_ZONA[z]}">KRB ${z}</span>`;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const DASAR = () => gelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";

/* ================================================================ tab */
const TABS = [["peta", "Peta"], ["insight", "Insight"], ["berita", "Berita"], ["tren", "Tren"], ["dampak", "Dampak"], ["simulasi", "Simulasi"], ["foto", "Foto"], ["tentang", "Tentang"], ["metode", "Metode"]];
/* tidak tampil di nav: Metode ada tapi disembunyikan (A24, sama dengan karhutla); Foto menunggu kategori gunung api di public/foto.js (KAT_AWAL): tanpa itu galerinya
   jatuh ke kategori karhutla dan kirimannya ditolak server. Hapus "foto" dari sini dan dari tab_sembunyi di public/bencana.json begitu foto.js memilikinya. */
const TAB_SEMBUNYI = new Set(["metode"]);
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  simulasi: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>', foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', metode: '<path d="M4 5h16M4 12h16M4 19h10"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
/* Tab Simulasi: sim.js (+ abu_model.js, sim_lahar.js) dimuat malas saat tab dibuka; Sim.buka({id}) mengisi #sim-akar. Tab lain menjeda pemutarnya, peta tetap hidup. */
const SimTab = {
  _p: null,
  muat() { return this._p ||= Promise.all(["abu_model.js", "sim_lahar.js", "sim.js"].map(f => new Promise((ok, gagal) => { const e = document.createElement("script"); e.src = f; e.onload = ok; e.onerror = () => gagal(new Error(f)); document.head.append(e); }))).catch(e => { this._p = null; throw e; }); },
  async render() {
    const akar = $("#sim-akar"); if (!akar) return;
    const id = S.simId || window.Sim?.keadaan?.id || new URLSearchParams(location.search).get("g") || "semeru"; S.simId = null;
    if (!akar.firstChild) akar.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat simulasi…</div>`;
    try { await this.muat(); } catch (e) { akar.innerHTML = `<div class="kosong">Simulasi belum bisa dimuat.</div>`; return; }
    const k = window.Sim.keadaan;
    if (k?.peta && k.id === id) { k.peta.resize(); return; }
    window.Sim.buka({id, akar}); },
  jeda() { const k = window.Sim?.keadaan; if (k?.main) $("#smMain")?.click(); },
};
function bukaTab(id, dorong = true, gid = "") {
  if (!TABS.some(t => t[0] === id) || (TAB_SEMBUNYI.has(id) && !["metode"].includes(id))) id = "peta";
  if (id === "simulasi" && gid) S.simId = gid;
  if (id !== "simulasi") SimTab.jeda();
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  /* tautan bersih tanpa tagar: /gunungapi/insight (worker mengarahkan jalur ini ke index.html); Simulasi membawa gunungnya: /gunungapi/simulasi?g=semeru */
  if (dorong) history.replaceState(null, "", "/gunungapi/" + id + (id === "simulasi" && (S.simId || window.Sim?.keadaan?.id) ? "?g=" + (S.simId || window.Sim.keadaan.id) : ""));
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1"; } }
    ({insight: Insight, berita: Berita, tren: Tren, dampak: Dampak, simulasi: SimTab, foto: window.Foto, metode: Metode})[id]?.render(); });
}
{ $("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k]}</svg>${n}</button>`).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }

/* ================================================================ tema */
const temaAwal = bacaLokal("pb-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pb-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };
/* ================================================================ data */
async function muatData() {
  const st = await muatJSON("../banjir/data/gunungapi_status.json");
  if (!st.gunung?.length) throw new Error("data gunung api kosong");
  S.st = st; muatJSON("../geo/provinsi.json").then(g => { S.geo.prov = g; }).catch(() => {});
  $("#upd").textContent = "Data " + jamWIB(st.dibuat);
  /* hitungan dari daftar, bukan dari tulisan pada berkas: satu sumber kebenaran */
  S.n = {1: 0, 2: 0, 3: 0, 4: 0}; st.gunung.forEach(g => S.n[g.level]++);
}
