"use strict";
/* Halaman Kekeringan: keadaan bersama, tab, pemuatan data. Mesin kartu/tip/tabel dari public/inti; data dari scripts/kekeringan/status.py
   (public/data/kekeringan_{meta,grid,wilayah,tren}.json). Semua angka berlabel "Deteksi Centurisk97": BMKG hanya menerbitkan peta gambar. */
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
const toast = msg => { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("on"), 2600); };
const simpanLokal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const bacaLokal = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
async function muatJSON(u) { const r = await fetch(u, {cache: "no-cache"}); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }
/* dua desimal lewat toLocaleString supaya i18n.js menukar koma jadi titik di EN */
const F2 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}).replace("-", "−");   /* minus U+2212, sama dengan sumbu dan legenda */
/* judul dan teks bagikan: ribu/juta ditulis penuh, bukan rb/jt (pola jt() di banjir/dampak.js) */
const jt = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta");
const F1 = x => Number(x).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAS = i => BLN[Math.floor(i / 3)] + " " + ["I", "II", "III"][i % 3];
const bulanPanjang = ym => { const [y, m] = ym.split("-"); return BLN[m - 1] + " " + y; };
const BLN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
/* bulan SPI ("Agustus 2026"): SPI tertinggal ~6 minggu dari hari ini, jadi selalu disebut di samping angkanya */
const spiBulan = () => { const b = S.meta?.spi?.bulan; return b ? BLN_PENUH[b.slice(5) - 1] + " " + b.slice(0, 4) : ""; };
/* kategori SPI menurut WMO/McKee; Waspada/Siaga/Awas hanya untuk status gabungan */
const katSpi = s => s == null ? "" : s <= -2 ? "Kering ekstrem (curah hujan)" : s <= -1.5 ? "Sangat kering" : s <= -1 ? "Agak kering" : s < 1 ? "Normal" : "Basah";
const tglPendek = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});

/* Tingkat mengikuti istilah BNPB/BPBD; "Awas" di halaman ini disebut Awas (bukan "kering ekstrem": itu kategori SPI) */
const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"], WARNA_LV = ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"], FG_LV = ["#fff", "#3b2e00", "#fff", "#fff"];
const NAVY = "oklch(25.5% .075 256)", MERAH = "#c9503a", JINGGA = "#e58a45", KUNING = "#e3b94e", BIRU = "#4f8fc4";
const S = {meta: null, grid: null, wil: null, tren: null, iklim: null, geo: {prov: null, kab: {}}, jalur: [], mode: "status", fiturWil: [], urut: null,
  hth: null, prak: null, padi: null, uji: null, bukti: null, resmi: null, bnpb: null, riw: null, posko: null, bln: 0};
const namaProv = k => S.meta?.provinsi?.[k] ?? k;
/* jumlah wilayah per tingkat TEPAT (kab_n di berkas kumulatif: >= waspada, >= siaga, >= awas) */
/* ---------- data baru (HTH, prakiraan SEAS5, padi, uji balik, bukti, SK resmi); dibaca defensif, yang tak ada = null lalu dibuang dari layar */
const BASELINE_PRAK = (k = "pk1", m = 0) => { const L = S.prak?.nasional?.lead?.[m], v = L?.[k.replace("pk", "b")]; if (typeof v === "number") return v;   /* b1/b15/b2 per bulan, dihitung pipeline dari gamma baku */
  const b = S.prak?.baseline; if (typeof b === "number") return k === "pk1" ? b : null; const w = b && typeof b === "object" ? b[k] ?? b[k + "_pct"] : null; return typeof (Array.isArray(w) ? w[m] : w) === "number" ? (Array.isArray(w) ? w[m] : w) : null; };
const selisihTxt = (v, b) => { if (b == null) return ""; const d = Math.round(v - b); return d === 0 ? "setara baseline" : (d > 0 ? "+" : "−") + fmt(Math.abs(d)) + " poin"; };
const BLN_PRAK = () => (S.prak?.bulan || []).map(ym => bulanPanjang(ym));
const prakAda = o => o && !o.satu_titik && Array.isArray(o.lead);
/* padi: SATU besaran yang dibandingkan dengan Normal. Bila turun25_normal ada: peluang vs peluang; selain itu median vs median (selisih = turun_med - turun_normal) */
const padiBanding = o => !o ? null : o.turun25_normal != null ? {j: "peluang", v: o.turun25, n: o.turun25_normal, d: o.turun25 - o.turun25_normal}
  : o.turun_normal != null ? {j: "median", v: o.turun_med, n: o.turun_normal, d: o.selisih ?? o.turun_med - o.turun_normal} : null;
const padiJenis = () => padiBanding(Object.values(S.padi?.kab || {})[0])?.j || null;
const PADI_BESARAN = j => j === "peluang" ? "peluang hasil turun 25% atau lebih" : "penurunan hasil median";
const poinTxt = d => { const r = Math.round(d); return r === 0 ? "setara normal" : (r > 0 ? "+" : "−") + fmt(Math.abs(r)) + " poin"; };
/* arah bias prakiraan dari pipeline (bias.label, bias.per_bulan), bukan cuma "tanpa koreksi bias" */
const BIAS_TXT = () => S.prak?.bias?.label || "tanpa koreksi bias";
const BIAS_BULAN = () => (S.prak?.bias?.per_bulan || []).map(x => `${bulanPanjang(x.bulan)}: ${x.kalimat}${x.rasio != null ? ` (hujan anggota ${F2(x.rasio)} kali klimatologi)` : ""}`);
const BELUM_UJI = "Belum diuji balik";
/* ambang status SPI/tanah: label lepas dari "hipotesis" hanya bila uji balik terhadap kejadian DIBI lolos kriteria (ujibalik.py `kejadian.vonis`); alasan tertulis di berkas */
const blnIso = ym => BLN[+ym.slice(5) - 1] + " " + ym.slice(0, 4);
const AMBANG_KAKI = () => { const j = S.uji?.kejadian; if (!j || j.vonis?.layak) return ""; const f = Object.entries(j.aturan?.waspada || {}).filter(([k]) => k !== "semua").map(([, v]) => v.far).filter(x => x != null).map(x => Math.round(x * 100));
  return `Ambang belum lolos uji terhadap kejadian di Data dan Informasi Bencana Indonesia (DIBI) BNPB${f.length ? `, alarm palsu ${Math.min(...f)}–${Math.max(...f)}%` : ""}; angka ini ukuran skala, bukan jumlah penerima bantuan.`; };
/* kartu yang angkanya bergantung pada status Waspada/Siaga/Awas: pil ambang di kepala + satu kalimat di kaki; lepas sendiri bila uji balik lolos */
const beriAmbang = h => { const k = AMBANG_KAKI(); if (!k || !h) return h;
  /* pil hipotesis di kepala; catatan ambang masuk kaki kartu (bukan paragraf lepas di bawah kaki) */
  h = h.replace(/(<header class="ex-hd">(?:<span class="ex-ey">[^<]*<\/span>)?)/, `$1<span class="ex-ey kk-hip" title="${esc(k)}">${AMBANG_PIL()}</span>`);
  return h.includes('<footer class="ex-ft">') ? h.replace(/<\/footer>(\s*<\/article>)/, `<span class="kk-catatan">${k}</span></footer>$1`) : h.replace(/<\/article>/, `<footer class="ex-ft"><span class="kk-catatan">${k}</span></footer></article>`); };
/* kartu laporan standar (AGENTS.md 3.5, pemilik 11 Nov 2026 "gausah ada kesimpulan ini"): kepala = NAMA SEKSI berikon, kalimat temuan dan sumber
   pindah ke title kepala (tetap terbaca saat disorot dan oleh pembaca layar), kaki "Sumber:" dibuang, legenda tetap. Pil kategori yang sama dengan
   nama seksi dibuang; pil lain (ambang hipotesis, belum diuji) tetap. Dipakai Insight, Tren, Berita, Metode, Posko. */
const NAMA_SEKSI = {HTH: "Hari tanpa hujan", "HTH terpanjang": "Hari tanpa hujan terpanjang", "Kode DC": "Kode kekeringan (DC)", BNPB: "Data BNPB",
  "Kabupaten/kota": "Status kabupaten/kota", Jiwa: "Penduduk di wilayah kering", Prakiraan: "Prakiraan 1 sampai 3 bulan", Padi: "Padi tadah hujan",
  "Paling kering": "Wilayah paling kering", Kabupaten: "Kebutuhan air per kabupaten/kota", Dasarian: "Riwayat dasarian", Status: "Status wilayah", Tanah: "Kelembapan tanah", Wilayah: "Status kabupaten/kota", "Seberapa tepat": "Uji balik aturan status", Gambut: "Gambut di wilayah kering", Bukti: "Bukti gambut dan wilayah sering kering", "Penyetelan putaran 2": "Penyetelan ambang putaran 2", Penyetelan: "Penyetelan ambang"};
const IK_SEKSI = [
  [/hujan|dasarian|kalender|musim|persentase/i, "M7 15a4 4 0 0 1-.9-7.9A6 6 0 0 1 17.7 8 3.5 3.5 0 0 1 17.5 15M8 18l-1 3M12 18l-1 3M16 18l-1 3"],
  [/penduduk|jiwa|kebutuhan/i, "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
  [/padi/i, "M3 20c3-6 6-9 9-9s6 3 9 9M12 11V4M9 7l3-3 3 3"],
  [/gambut|DC/i, "M12 3c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 2 4 3 4 0-3-1-6 0-9Z"],
  [/El Ni/i, "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"],
  [/uji|tepat|penyetelan|bukti/i, "M4 12.5l5 5L20 6.5"],
  [/prakiraan|peluang|risiko|volume|topik/i, "M4 20V10M10 20V4M16 20v-7M22 20H2"],
  [/peta berita|kabupaten|wilayah/i, "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"],
  [/berita|sorotan/i, "M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"],
  [/posko|air/i, "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"],
  [/BMKG|BNPB|status/i, "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"]];
const IK_KERING = "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19";
const ikonSeksi = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${(IK_SEKSI.find(([r]) => r.test(n)) || [0, IK_KERING])[1]}"/></svg>`;
const teksPolos = h => new DOMParser().parseFromString(String(h), "text/html").body.textContent.replace(/\s+/g, " ").trim();
const kepalaSeksi = (h, namaPaksa) => {
  if (!h || !h.includes("<article")) return h;
  const m = h.match(/<span class="ex-ey">([^<]+)<\/span>/); if (!m) return h;
  const nama = namaPaksa || NAMA_SEKSI[m[1]] || m[1]; let sumber = "";
  h = h.replace(/<em>Sumber:\s*([\s\S]*?)<\/em>/, (_, s) => { sumber = teksPolos(s); return ""; }).replace(/<footer class="ex-ft"><\/footer>/, "");
  h = h.replace(/<h3([^>]*)>([\s\S]*?)<\/h3>/, (_, a, j) => { const t = teksPolos(j); return `<h3${a} title="${esc(t + (sumber ? (/[.!?]$/.test(t) ? " " : ". ") + "Sumber: " + sumber : ""))}">${h.includes('class="ex-ik"') ? "" : ikonSeksi(nama)}${esc(nama)}</h3>`; });
  return h.replace(m[0], "").replace(/<article class="ex"/, '<article class="ex ex-std"'); };
const AMBANG_PIL = () => S.uji?.kejadian?.vonis?.layak ? "Ambang teruji terhadap kejadian DIBI" : "Ambang masih hipotesis";
/* nama provinsi pada SK BNPB -> kode */
const PROV_KODE = (() => { let m = null; return n => { if (!m) { m = {}; for (const [k, v] of Object.entries(S.meta.provinsi)) m[v.toLowerCase()] = k; m["daerah istimewa yogyakarta"] = "34"; m["dki jakarta"] = "31"; } return m[String(n).toLowerCase()]; }; })();
const skPer = () => { if (S._sk) return S._sk; const o = {kab: {}, prov: {}}; for (const s of S.resmi?.sk || []) { const p = PROV_KODE(s.prov); if (!p) continue;
    if (s.kab) (o.kab[p + "|" + s.kab.toLowerCase()] ||= []).push(s); else (o.prov[p] ||= []).push(s); } return S._sk = o; };
const skKab = kunci => { const p = kunci.split("|"); return skPer().kab[p[0] + "|" + (p[1] || "").toLowerCase()] || []; };
const irbiKab = kunci => { if (!S.bnpb?.irbi) return null; if (!S._irbi) { S._irbi = {}; for (const [kd, v] of Object.entries(S.bnpb.irbi)) S._irbi[kd.slice(0, 2) + "|" + v.nama.toLowerCase()] = v; }
  const p = kunci.split("|"); return S._irbi[p[0] + "|" + (p[1] || "").toLowerCase()] || null; };
const tepat = n => [n[0] - n[1], n[1] - n[2], n[2]];   /* [waspada, siaga, awas] */
const pill = l => `<span class="pill l${l}">${LEVEL[l]}</span>`;

const TABS = [["peta", "Peta"], ["insight", "Insight"], ["berita", "Berita"], ["tren", "Tren"], ["dampak", "Dampak"], ["simulasi", "Simulasi"], ["posko", "Posko"], ["foto", "Foto"], ["tentang", "Tentang"], ["informasi", "Informasi"], ["metode", "Metode"]];
/* tidak tampil di nav: Metode dan Posko ada tapi disembunyikan (A24, sama dengan karhutla; rute /kekeringan/posko tetap terbuka bila alamatnya diketik); Foto menunggu kategori kekeringan di public/foto.js (KAT_AWAL): tanpa itu galerinya
   jatuh ke kategori karhutla dan kirimannya ditolak server. Hapus "foto" dari sini dan dari tab_sembunyi di public/bencana.json begitu foto.js memilikinya. */
const TAB_SEMBUNYI = new Set(["informasi", "metode", "posko"]);
const IK_TAB = {peta: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>', insight: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', tren: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', dampak: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  simulasi: '<path d="M8 5v14l11-7z"/>', posko: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>', foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', metode: '<path d="M4 5h16M4 12h16M4 19h10"/>', tentang: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'};
const halamanAda = id => !!$("#p-" + id) && (!TAB_SEMBUNYI.has(id) || id === "informasi" || id === "metode" || id === "posko");
function bukaTab(id, dorong = true) {
  if (!halamanAda(id)) id = "peta";
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-current", b.dataset.t === id ? "page" : "false"));
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("on", p.id === "p-" + id));
  if (dorong) history.replaceState(null, "", "/kekeringan/" + id);   /* tautan bersih tanpa tagar; worker mengarahkan jalur ini ke index.html */
  nanti(() => { if (id === "peta" && peta) peta.resize();
    if (id === "simulasi") { const f = $("#simulasiBingkai"); if (!f.src) f.src = "/kekeringan/simulasi.html?tertanam=1"; }
    if (id === "tentang") { const f = $("#tentangBingkai"); if (!f.src) { f.style.opacity = 0; f.src = "/tentang.html?tertanam=1&bencana=kekeringan"; } }
    ({insight: Insight, berita: Berita, tren: Tren, dampak: Dampak, posko: Posko, foto: window.Foto, metode: Metode, informasi: window.Informasi})[id]?.render(); });
}
{ const tb = ([k, n]) => `<button data-t="${k}" aria-current="${k === "peta" ? "page" : "false"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_TAB[k] || ""}</svg>${n}</button>`;
  $("#tabs").innerHTML = TABS.filter(t => !TAB_SEMBUNYI.has(t[0])).map(tb).join("");
  const hd = $("header.top"), bg = $("#burger"), atur = v => { hd.classList.toggle("buka", v); bg.setAttribute("aria-expanded", v); };
  bg.onclick = e => { e.stopPropagation(); atur(!hd.classList.contains("buka")); };
  document.addEventListener("click", e => { if (hd.classList.contains("buka") && !e.target.closest("#tabs")) atur(false); });
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; bukaTab(b.dataset.t); atur(false); }); }
const temaAwal = bacaLokal("pk-tema", null); if (temaAwal) document.documentElement.dataset.theme = temaAwal;
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
$("#tema").onclick = () => { const t = gelap() ? "light" : "dark"; document.documentElement.dataset.theme = t; simpanLokal("pk-tema", t); nanti(() => peta && peta.setStyle(DASAR(), {diff: false})); };

/* ---------- data */
async function muatData() {
  const lain = n => muatJSON("../data/" + n + ".json").catch(() => null);
  const [meta, grid, wil, tren, prov, hth, prak, padi, uji, bukti, resmi, bnpb, riw] = await Promise.all([muatJSON("../data/kekeringan_meta.json"), muatJSON("../data/kekeringan_grid.json"), muatJSON("../data/kekeringan_wilayah.json"),
    muatJSON("../data/kekeringan_tren.json").catch(() => null), muatJSON("../geo/provinsi.json"),
    lain("kekeringan_hth"), lain("kekeringan_prakiraan"), lain("kekeringan_padi"), lain("kekeringan_ujibalik"), lain("kekeringan_bukti"), lain("kekeringan_resmi"), lain("kekeringan_bnpb"), lain("kekeringan_riwayat")]);
  Object.assign(S, {meta, grid, wil, tren, hth, prak: prak?.lengkap === false ? null : prak, padi, uji, bukti, resmi, bnpb, riw}); S.geo.prov = prov;
  muatJSON("../data/iklim.json").then(d => { S.iklim = d; if ($("#p-insight").classList.contains("on")) Insight.render(); }).catch(() => {});
  $("#upd").innerHTML = jamData(meta.dibuat);
  /* lencana ENSO di kepala, sama dengan karhutla (lapisan5.js lencanaIklim): El Niño = kemarau lebih kering */
  const e = meta.enso; if (e?.status && !$(".l5-iklim")) { const o = e.oni, kuat = o >= 2 ? " sangat kuat" : o >= 1.5 ? " kuat" : o >= 1 ? " sedang" : o >= .5 ? " lemah" : "", kering = e.status === "El Niño" || e.iod === "IOD positif";
    const el = document.createElement("span"); el.className = "l5-iklim" + (kering ? " kering" : ""); el.textContent = e.status === "El Niño" ? "El Niño" + kuat : e.status === "La Niña" ? "La Niña" : "ENSO netral";
    el.title = `ONI ${e.musim} ${e.tahun}: ${o > 0 ? "+" : ""}${F2(o)} °C${e.dmi != null ? `, DMI ${e.dmi > 0 ? "+" : ""}${F2(e.dmi)} °C` : ""}${e.cpc ? ", " + e.cpc : ""}`; $("#upd").before(el); }
}
