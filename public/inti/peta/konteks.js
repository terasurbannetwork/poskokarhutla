"use strict";
/* Lapisan konteks bersama (penduduk, sekolah & fasilitas, jalan) untuk halaman bencana selain karhutla.
   Daftarnya dibaca dari `lapisan` di bencana.json; tiap halaman cukup satu baris sesudah peta dibuat:
     import("../inti/peta/konteks.js").then(m => m.pasang(peta, "banjir")).catch(() => 0);
   Ubinnya masuk grup "Infrastruktur" di #lapis (gaya ubin Overlay lapis.js), data dimuat malas saat dinyalakan
   dan dipasang sesudah satu frame tercat, jadi klik toggle hanya mengubah chrome (INP.md). Sekolah + RS/faskes
   diurai di worker (konteks-kerja.js) dan masuk peta sebagai blob; jalan dibaca MapLibre langsung dari URL.
   Registry `sekolah` dan `fasilitas` sama-sama menyalakan satu ubin "Sekolah & faskes" (seperti karhutla).
   opsi.lewati: nama lapisan yang halamannya sudah punya sendiri (gunungapi: sekolah, fasilitas). */
import {kartuTip, tampilTip, sembunyiTip} from "./lapis.js";

const DATA = new URL("../../data/", import.meta.url).href;
const DAFTAR = {
  penduduk: {nama: "Penduduk (WorldPop 2026)", pendek: "Penduduk", ket: "Jiwa per sel ± 28 km", w: "#c4578a"},
  fasilitas: {nama: "Sekolah (Dapodik/Kemendikbud) & faskes (OSM)", pendek: "Sekolah & faskes", ket: "Sekolah dan faskes", w: "#6b5fc7"},
  jalan: {nama: "Jalan & sungai (OSM)", pendek: "Jalan & sungai", ket: "Jalan & sungai", w: "#4b5563"},
};
const ALIAS = {sekolah: "fasilitas"};
const W = {merah: "#c9503a", oranye: "#e58a45", kuning: "#e3b94e", hijau: "#5a9e74", biru: "#4f8fc4", ungu: "#5f6fb0", lain: "#8a94a6"};
const W_JENJANG = {dini: W.kuning, sd: W.oranye, smp: W.hijau, sma: W.merah, lain: W.lain};
const LAYER = {penduduk: ["kt-penduduk"], fasilitas: ["kt-fasilitas"], jalan: ["kt-sungai", "kt-jalan"]};
const gelap = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
const angka = n => Number(n).toLocaleString("id-ID");
const nanti = fn => { let ok = false; const go = () => { if (!ok) { ok = true; fn(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };

let registryJanji = null;
const registry = () => registryJanji ||= fetch(new URL("../../bencana.json", import.meta.url)).then(r => r.json());

/* sel penduduk 0,25° (satu sel bisa terbelah batas provinsi: jumlahkan); sel < 500 jiwa dibuang seperti karhutla */
let pen1;   /* janji dipakai ulang: ganti tema tidak mengunduh ulang */
const geoPenduduk = () => pen1 ||= hitungPenduduk().catch(e => { pen1 = null; throw e; });
async function hitungPenduduk() {
  const pen = await fetch(DATA + "penduduk.json").then(r => r.json()), sel = new Map();
  for (const [la, lo, n] of pen.grid) { const k = la + "," + lo; sel.set(k, (sel.get(k) || 0) + n); }
  const f = [];
  for (const [k, n] of sel) { if (n < 500) continue; const [la, lo] = k.split(",").map(Number); f.push({type: "Feature", geometry: {type: "Point", coordinates: [lo, la]}, properties: {n}}); }
  return {type: "FeatureCollection", features: f};
}
let fas1;   /* satu blob per halaman, dipakai ulang tiap style.load (tanpa unduh/parse ulang, tanpa blob baru) */
const dataFasilitas = () => fas1 ||= new Promise((ok, gagal) => {
  const k = new Worker(new URL("./konteks-kerja.js", import.meta.url));
  k.onmessage = ({data}) => { k.terminate(); data.teks ? ok(URL.createObjectURL(new Blob([data.teks], {type: "application/json"}))) : gagal(new Error(data.galat)); };
  k.onerror = e => { k.terminate(); gagal(new Error(e.message)); };
  k.postMessage({fasilitas: DATA + "fasilitas.json", sekolah: DATA + "sekolah.json"});
}).catch(e => { fas1 = null; throw e; });

const kartu = {
  penduduk: p => kartuTip({judul: "Penduduk", stat: [["orang", "± " + angka(Math.round(p.n / 1000) * 1000), "jiwa di sel ± 28 km", "#c4578a"]]}),
  fasilitas: p => {
    const nama = `<span translate="no">${esc(p.n)}</span>`;
    if (p.t !== "sekolah") return kartuTip({judul: nama, sub: `<small>${p.t === "rs" ? "Rumah sakit" : "Fasilitas kesehatan"}</small>`});
    return kartuTip({judul: nama, sub: `<small>${esc(p.j)} · ${p.st === "N" ? "Negeri" : "Swasta"}${p.w ? " · " + esc(p.w) : ""}</small>`,
      stat: p.sw == null || p.sw === "null" ? [] : [["orang", angka(p.sw), "siswa", W_JENJANG[p.g] || W.lain]]});
  },
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

const pasangLapisan = {
  async penduduk(peta, sebelum) {
    const data = await geoPenduduk();
    if (!peta.getSource("kt-penduduk")) peta.addSource("kt-penduduk", {type: "geojson", data});
    if (!peta.getLayer("kt-penduduk")) peta.addLayer({id: "kt-penduduk", type: "circle", source: "kt-penduduk", paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 20, 2, 1000, 12], 8, ["interpolate", ["linear"], ["sqrt", ["get", "n"]], 20, 6, 1000, 34]],
      "circle-color": DAFTAR.penduduk.w, "circle-opacity": .5, "circle-stroke-color": gelap() ? "#0b1424" : "#fff", "circle-stroke-width": .8}}, sebelum());
  },
  async fasilitas(peta) {
    const data = await dataFasilitas();
    if (!peta.getSource("kt-fasilitas")) peta.addSource("kt-fasilitas", {type: "geojson", data});
    const warna = ["match", ["get", "t"], "rs", W.ungu, "faskes", W.biru, ["match", ["get", "g"], "dini", W_JENJANG.dini, "sd", W_JENJANG.sd, "smp", W_JENJANG.smp, "sma", W_JENJANG.sma, W_JENJANG.lain]];
    if (!peta.getLayer("kt-fasilitas")) peta.addLayer({id: "kt-fasilitas", type: "circle", source: "kt-fasilitas", paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, ["match", ["get", "t"], "rs", 3.5, 2], 10, ["match", ["get", "t"], "rs", 8, 5.5]],
      "circle-color": warna, "circle-stroke-color": "#fff", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 5, .5, 10, 1.5]}});
  },
  async jalan(peta, sebelum) {
    /* seluruh Indonesia dari sumber vektor basemap (OpenMapTiles: transportation, waterway); jalan.geojson (akses.py) hanya
       Riau, Jambi, Sumsel, Kalimantan, NTT, jadi cuma fallback bila peta tak punya sumber vektor itu. Id kt-* beda dari alir-* (pos_air.js). */
    const ls = peta.getStyle().layers, vek = nama => ls.find(l => l["source-layer"] === nama)?.source;
    const sJalan = vek("transportation"), sSungai = vek("waterway");
    const lbl = ls.find(l => l.type === "symbol")?.id;   /* di bawah label basemap */
    const bawah = sJalan && sSungai ? lbl : sebelum();
    const lebarJ = ["interpolate", ["linear"], ["zoom"], 5, ["match", ["get", "k"], 1, 1.2, .5], 10, ["match", ["get", "k"], 1, 3, 1.4]];
    if (sJalan && sSungai) {
      if (!peta.getLayer("kt-sungai")) peta.addLayer({id: "kt-sungai", type: "line", source: sSungai, "source-layer": "waterway", minzoom: 5,
        filter: ["any", ["==", ["get", "class"], "river"], ["all", ["in", ["get", "class"], ["literal", ["canal", "stream"]]], [">=", ["zoom"], 9]]],
        layout: {visibility: "none"}, paint: {"line-color": W.biru, "line-width": ["interpolate", ["linear"], ["zoom"], 5, .6, 10, 2], "line-opacity": .8}}, bawah);
      if (!peta.getLayer("kt-jalan")) peta.addLayer({id: "kt-jalan", type: "line", source: sJalan, "source-layer": "transportation", minzoom: 4,
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        layout: {visibility: "none", "line-cap": "round", "line-join": "round"},
        paint: {"line-color": ["match", ["get", "class"], ["motorway", "trunk", "primary"], W.merah, "secondary", W.oranye, W.kuning],
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 1.2, .5], 10, ["match", ["get", "class"], ["motorway", "trunk", "primary"], 3, 1.4]], "line-opacity": .85}}, bawah);
      return;
    }
    if (!peta.getSource("kt-jalan")) peta.addSource("kt-jalan", {type: "geojson", data: DATA + "jalan.geojson", attribution: "Jalan & sungai © kontributor OpenStreetMap (ODbL)"});
    if (!peta.getLayer("kt-sungai")) peta.addLayer({id: "kt-sungai", type: "line", source: "kt-jalan", filter: ["==", ["get", "k"], 6], paint: {"line-color": W.biru, "line-width": ["interpolate", ["linear"], ["zoom"], 5, .6, 10, 2], "line-opacity": .8}}, bawah);
    if (!peta.getLayer("kt-jalan")) peta.addLayer({id: "kt-jalan", type: "line", source: "kt-jalan", filter: ["<=", ["get", "k"], 3], layout: {"line-cap": "round", "line-join": "round"},
      paint: {"line-color": ["match", ["get", "k"], 1, W.merah, 2, W.oranye, W.kuning], "line-width": lebarJ, "line-opacity": .85}}, bawah);
  },
};

const legenda = {
  penduduk: () => ["Penduduk", `<span><i class="sw dot" style="background:${DAFTAR.penduduk.w}"></i>Lingkaran makin besar = makin banyak jiwa</span><span>WorldPop 2026, sel ± 28 km</span>`],
  fasilitas: () => ["Sekolah & faskes (Dapodik/Kemendikbud, OSM)", `<span><i class="sw dot" style="background:${W.ungu};border:1px solid #fff"></i>Rumah sakit</span><span><i class="sw dot" style="background:${W.biru};border:1px solid #fff"></i>Puskesmas, klinik</span>` +
    [["dini", "PAUD, TK"], ["sd", "SD, MI"], ["smp", "SMP, MTs"], ["sma", "SMA, SMK, MA"]].map(([g, n]) => `<span><i class="sw dot" style="background:${W_JENJANG[g]};border:1px solid #fff"></i>${n}</span>`).join("")],
  jalan: () => ["Jalan & sungai", [[W.merah, "Jalan nasional/primer"], [W.oranye, "Sekunder"], [W.kuning, "Tersier"], [W.biru, "Sungai, rute perahu"]].map(([c, n]) => `<span><i class="sw" style="background:${c};height:3px"></i>${n}</span>`).join("")],
};

export async function pasang(peta, id, {lewati = []} = {}) {
  const lapis = document.getElementById("lapis"); if (!peta || !lapis) return;
  const reg = (await registry()).bencana.find(b => b.id === id);
  const ada = [...new Set((reg?.lapisan || []).map(k => ALIAS[k] || k))].filter(k => DAFTAR[k] && !lewati.some(l => (ALIAS[l] || l) === k));
  if (!ada.length) return;
  const aktif = new Set(), dimuat = new Set(), sedang = new Map();
  let det = [...lapis.querySelectorAll("details")].find(d => d.querySelector(":scope > summary")?.textContent.trim() === "Infrastruktur");
  if (!det) { det = document.createElement("details"); det.open = true; det.innerHTML = "<summary>Infrastruktur</summary>"; lapis.append(det); }
  for (const k of ada) {
    const l = document.createElement("label"); l.dataset.tip = `<b>${DAFTAR[k].nama}</b>`;
    l.innerHTML = `<input type="checkbox" data-l="kt_${k}">${DAFTAR[k].pendek}`; det.append(l);
  }

  /* lapisan data pertama (geojson) halaman: penduduk dan jalan ditaruh di bawahnya supaya status bahaya tetap terbaca */
  const sebelum = () => peta.getStyle().layers.find(l => !LAYER.penduduk.concat(LAYER.jalan).includes(l.id) && peta.getSource(l.source)?.type === "geojson")?.id;
  const tampil = (k, on) => LAYER[k].forEach(l => peta.getLayer(l) && peta.setLayoutProperty(l, "visibility", on ? "visible" : "none"));
  const gambar = async k => {
    if (peta.getLayer(LAYER[k][0])) return tampil(k, true);
    await (sedang.get(k) || sedang.set(k, pasangLapisan[k](peta, sebelum).finally(() => sedang.delete(k))).get(k));
    dimuat.add(k); daftarkanTip(k); aktif.has(k) ? tampil(k, true) : tampil(k, false);
  };
  const tip = new Set();
  const daftarkanTip = k => { if (!kartu[k] || tip.has(k)) return; tip.add(k); const lid = LAYER[k][0]; let ev = null, p = null, rf = 0;
    peta.on("mousemove", lid, e => { peta.getCanvas().style.cursor = "pointer"; p = e.features?.[0]?.properties; if (!p) return; ev = e.originalEvent; rf ||= requestAnimationFrame(() => { rf = 0; if (ev && p) tampilTip(kartu[k](p), ev); }); });
    peta.on("mouseleave", lid, () => { ev = null; peta.getCanvas().style.cursor = ""; sembunyiTip(); }); };

  /* legenda: dititipkan ke dok legenda halaman setiap kali halaman menulis ulang #legenda, tanpa menyentuh renderLegenda-nya */
  const legendaku = () => { const lg = document.getElementById("legenda"); if (!lg) return; lg.querySelectorAll(".lg-konteks").forEach(x => x.remove());
    const isi = lg.querySelector(".lg-isi"); if (!isi) return; const sub = [...aktif].filter(k => peta.getLayer(LAYER[k][0]) && legenda[k]);
    if (!sub.length) return;
    isi.insertAdjacentHTML("beforeend", sub.map(k => { const [j, h] = legenda[k](); return `<div class="lg-g lg-konteks"><div class="lbl">${j}</div><div class="leg">${h}</div></div>`; }).join("")); };
  const lg = document.getElementById("legenda"); if (lg) new MutationObserver(legendaku).observe(lg, {childList: true});

  /* chrome urgent: kotak sudah tercentang oleh browser; muat data dan gambar menyusul sesudah satu frame. Pendengar fase tangkap menelan
     kejadian ini sebelum penangan #lapis halaman, yang tak mengenal kuncinya (banjir, kekeringan melempar galat pada kunci asing). */
  lapis.addEventListener("change", e => { const i = e.target.closest?.("input[data-l^='kt_']"); if (!i) return; e.stopPropagation();
    const k = i.dataset.l.slice(3); i.checked ? aktif.add(k) : aktif.delete(k);
    const lb = i.closest("label"); if (i.checked) { lb.classList.add("memuat"); lb.setAttribute("aria-busy", "true"); }
    nanti(async () => { try { i.checked ? await gambar(k) : tampil(k, false); } catch (er) { console.warn("konteks", k, er.message); }   /* centang pengguna dibiarkan; mati-nyala memuat ulang */
      lb.classList.remove("memuat"); lb.removeAttribute("aria-busy"); legendaku(); }); }, true);
  /* setStyle (ganti tema) membuang lapisan: pasang ulang yang menyala */
  peta.on("style.load", () => { dimuat.clear(); [...aktif].forEach(k => nanti(() => peta.isStyleLoaded() ? gambar(k).then(legendaku).catch(er => console.warn("konteks", k, er.message)) : peta.once("idle", () => gambar(k).then(legendaku).catch(() => 0)))); });
}
