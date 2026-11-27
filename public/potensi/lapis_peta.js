/* Menu lapisan peta mode Peringatan /lapor (K8b, K9): kelas bahaya InaRISK dan lapisan InaRISK lain, poligon BMKG, nowcasting BMKG fase 2, hujan GPM IMERG, awan Himawari (GIBS NASA), titik panas, batas administrasi,
   referensi dan lingkungan (DAS, sungai, lahan, hutan, lahan kritis, hillshade) dan pilihan peta dasar.
   Lapis yang menyala ada di alamat (?lp=ir-bnj.gpm.ds-sat). Raster di bawah label peta dasar; vektor di atasnya. Token tema saja. */
import { warnaToken } from "/inti/maplibre.js";
import { ambil, geoKab, bbox } from "/potensi/umum.js";
import { ambilPeringatan } from "/potensi/kabar_baru.js";
import { IKON as IK } from "/inti/peta/lapis.js";

const IR = [["bnj", "Banjir", "banjir"], ["bdg", "Banjir bandang", "banjir_bandang"], ["lsr", "Longsor", "tanah_longsor"], ["gel", "Gelombang ekstrem", "gelombang_ekstrim_dan_abrasi"], ["kht", "Karhutla", "kebakaran_hutan_dan_lahan"], ["kek", "Kekeringan", "kekeringan"], ["cex", "Cuaca ekstrem", "cuaca_ekstrim"]];
// ubin bergaya Overlay peta utama (inti/peta/lapis.css): g = grup, p = nama pendek di ubin, w = gradasi ubin, i = ikon inti
const BN = "https://gis.bnpb.go.id/server/rest/services/", KH = "https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/";
// referensi ArcGIS MapServer (dashboard hidromet InaRISK): u = layanan, l = sublapis, o = opasitas awal
const REF = {
  das: { n: "Batas DAS", p: "Batas DAS", u: BN + "thematic/DAS/MapServer", a: "Batas DAS: BNPB", w: ["var(--brand2)", "var(--ink2)"], i: "sungai", o: 0.8 },
  sng: { n: "Sungai", p: "Sungai", u: BN + "Basemap/Sungai/MapServer", a: "Sungai: BNPB", w: ["var(--brand2)", "var(--brand)"], i: "debit", o: 0.9 },
  pl: { n: "Penggunaan lahan 2025", p: "Lahan 2025", u: KH + "PL_AR_250K/MapServer", l: "show:0", a: "Penggunaan lahan 2025: Kemenhut", w: ["var(--ok)", "var(--warn)"], i: "peta", o: 0.6 },
  hut: { n: "Kawasan hutan", p: "Kawasan hutan", u: KH + "KWSHUTAN_AR_250K/MapServer", a: "Kawasan hutan: Kemenhut", w: ["var(--ok)", "var(--brand)"], i: "gunung", o: 0.6 },
  krt: { n: "Lahan kritis", p: "Lahan kritis", u: KH + "LAHAN_KRITIS_AR_50K/MapServer", a: "Lahan kritis: Kemenhut", w: ["var(--warn)", "var(--bad)"], i: "peringatan", o: 0.6 },
  hil: { n: "IndoHillshade (relief bayangan)", p: "Hillshade", u: BN + "Basemap/Indo_Hillshade/MapServer", a: "IndoHillshade: BNPB", w: ["var(--ink2)", "var(--brand)"], i: "gunung", o: 0.6 },
};
// peta dasar tambahan: sumber terbuka berlisensi atribusi, tanpa Google
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
const DASAR = {
  sat: { n: "Citra satelit", u: ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}", z: 19, a: "Citra: Esri, Maxar, Earthstar Geographics" },
  rel: { n: "Relief", u: ESRI + "Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}", z: 15, a: "Relief: Esri" },
};
const NC = "https://nowcasting.bmkg.go.id/arcgis/rest/services/production/nowcasting_publik_phase2/MapServer/2/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson";
const LAIN = (() => {   // lapisan InaRISK di proksi /api/inarisk/ubin yang belum ada di pemilih tujuh bahaya
  const B = [["banjir", "banjir"], ["banjir_bandang", "banjir bandang"], ["gempabumi", "gempa bumi"], ["kekeringan", "kekeringan"], ["letusan_gunungapi", "letusan gunung api"], ["tanah_longsor", "tanah longsor"], ["likuefaksi", "likuefaksi"], ["tsunami", "tsunami"], ["gelombang_ekstrim_dan_abrasi", "gelombang ekstrem dan abrasi"], ["kebakaran_hutan_dan_lahan", "karhutla"], ["cuaca_ekstrim", "cuaca ekstrem"], ["multi", "multi bahaya"]];
  const tujuh = new Set(["banjir", "banjir_bandang", "tanah_longsor", "gelombang_ekstrim_dan_abrasi", "kebakaran_hutan_dan_lahan", "kekeringan", "cuaca_ekstrim"]);
  return [
    ...B.filter(([c]) => !tujuh.has(c)).map(([c, n]) => ["layer_bahaya_" + c, "Bahaya " + n]),
    ...B.filter(([c]) => c !== "tanah_longsor").map(([c, n]) => ["layer_risiko_" + c, "Risiko " + n]),
    ...B.filter(([c]) => c !== "banjir").map(([c, n]) => ["layer_kerentanan_" + c, "Kerentanan " + n]),
    ["layer_peta_kapasitas", "Kapasitas daerah"],
  ];
})();
const LAPIS = [
  { k: "ir", n: "Kelas bahaya InaRISK", p: "Bahaya InaRISK", g: "Bahaya & peringatan", w: ["#5a1d1a", "#e0533b"], i: "perisai", ras: 1 },
  { k: "il", n: "Lapisan InaRISK lain", p: "InaRISK lain", g: "Bahaya & peringatan", w: ["var(--brand2)", "var(--bad)"], i: "katalog", ras: 1 },
  { k: "bmkg", n: "Poligon peringatan BMKG aktif", p: "Peringatan BMKG", g: "Bahaya & peringatan", w: ["#7a3b0b", "#f2b544"], i: "peringatan" },
  { k: "nc", n: "Nowcasting BMKG (area terjadi, area meluas)", p: "Nowcasting BMKG", g: "Bahaya & peringatan", w: ["var(--warn)", "var(--bad)"], i: "bel" },
  { k: "tp", n: "Titik panas 24 jam", p: "Titik panas", g: "Bahaya & peringatan", w: ["#2a1d17", "#ff8a3d"], i: "titik" },
  { k: "gpm", n: "Hujan satelit GPM IMERG", p: "Hujan GPM", g: "Cuaca satelit", w: ["#1d4e89", "#69a7e8"], i: "hujan", ras: 1 },
  { k: "him", n: "Awan Himawari inframerah", p: "Awan Himawari", g: "Cuaca satelit", w: ["#13324d", "#4d8a5e"], i: "satelit", ras: 1 },
  { k: "adm", n: "Batas provinsi dan kab/kota", p: "Batas wilayah", g: "Wilayah", w: ["#f4c48a", "#d4572f"], i: "peta" },
  ...Object.entries(REF).map(([k, r]) => ({ k, n: r.n, p: r.p, g: "Referensi dan lingkungan", w: r.w, i: r.i, ras: 1 })),
];
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let peta = null, state = null, ubah = null, ctl = null, el = null, irb = "bnj", ilb = "", dsb = "", provBB = null, tmNc = 0, ncMuat = null, tersembunyi = [], ditolak = new Map();
const nyala = new Set(), opas = { ir: 0.7, il: 0.7, gpm: 0.7, him: 0.6, ...Object.fromEntries(Object.entries(REF).map(([k, r]) => [k, r.o])) };
const sebelumLabel = () => peta.getStyle().layers.find((l) => l.type === "symbol")?.id;
const simpan = () => ubah({ lp: [...[...nyala].map((k) => (k === "ir" ? "ir-" + irb : k === "il" && ilb ? "il-" + ilb : k)), ...(dsb ? ["ds-" + dsb] : [])].join(".") });
const info = (k, t) => { const s = el?.querySelector(`[data-st="${k}"]`); if (s) s.textContent = t || ""; };
const buang = (...id) => { for (const i of id) if (peta.getLayer(i)) peta.removeLayer(i); for (const i of id) if (peta.getSource(i)) peta.removeSource(i); };

/** Satu ubin uji dulu: layanan luar kadang menolak (CORS, token, mati). Hasil diingat per kunci; alasan tampil di keterangan lapis. */
async function rasUji(k, kunci, u, maxzoom, attr, nama) {
  if (!ditolak.has(kunci)) {
    let alasan = "";
    try { const r = await fetch(u.replace("{bbox-epsg-3857}", "11700000,-850000,12000000,-550000"), { signal: AbortSignal.timeout(25000) }); if (!r.ok || !/image/.test(r.headers.get("content-type") || "")) alasan = nama + " tidak menjawab (kode " + r.status + ")"; } catch { alasan = nama + " tidak bisa dihubungi dari peramban"; }
    ditolak.set(kunci, alasan);
  }
  if (!nyala.has(k)) return;
  if (ditolak.get(kunci)) return info(k, "Tidak tersedia: " + ditolak.get(kunci));
  info(k, ""); ras("lp-" + k, u, maxzoom, attr, k);
}
function ras(id, tiles, maxzoom, attr, k) {
  buang(id);
  peta.addSource(id, { type: "raster", tiles: [tiles], tileSize: 256, maxzoom, attribution: attr });
  peta.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opas[k] } }, sebelumLabel());
}
const iso10 = () => { const t = new Date(Date.now() - 3600000); t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 10) * 10, 0, 0); return t.toISOString().slice(0, 19) + "Z"; };

const PASANG = {
  ir() { return rasUji("ir", "ir-" + irb, `${location.origin}/api/inarisk/ubin/layer_bahaya_${IR.find((x) => x[0] === irb)[2]}?bbox={bbox-epsg-3857}`, 12, "Kelas bahaya: InaRISK BNPB", "layanan peta BNPB"); },
  il() { if (!ilb) return info("il", "Pilih lapisan lewat kolom cari"); return rasUji("il", "il-" + ilb, `${location.origin}/api/inarisk/ubin/${ilb}?bbox={bbox-epsg-3857}`, 12, "InaRISK BNPB: " + (LAIN.find((x) => x[0] === ilb)?.[1] || ilb), "layanan peta BNPB"); },
  gpm() { const t = new Date(Date.now() - 86400000).toISOString().slice(0, 10); ras("lp-gpm", `${GIBS}IMERG_Precipitation_Rate/default/${t}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, 6, "Hujan satelit: NASA GIBS, GPM IMERG", "gpm"); info("gpm", "Curah hujan harian, " + t); },
  him() { const t = iso10(); ras("lp-him", `${GIBS}Himawari_AHI_Band13_Clean_Infrared/default/${t}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`, 6, "Awan: NASA GIBS, Himawari-9 AHI", "him"); info("him", "Citra " + t.slice(11, 16) + " UTC"); },
  async bmkg() {
    const R = await ambilPeringatan();
    if (!R || !Array.isArray(R.peringatan)) return info("bmkg", "Tidak tersedia: data peringatan BMKG belum bisa dimuat");
    const fs = R.peringatan.filter((p) => p.poligon?.length).map((p) => ({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: p.poligon.map((r) => [r]) } }));
    info("bmkg", fs.length ? fs.length + " area peringatan" : "Tidak ada peringatan BMKG yang aktif");
    if (!nyala.has("bmkg")) return;
    buang("lp-bmkg-isi", "lp-bmkg-garis", "lp-bmkg");
    const w = warnaToken("--warn");
    peta.addSource("lp-bmkg", { type: "geojson", data: { type: "FeatureCollection", features: fs } });
    peta.addLayer({ id: "lp-bmkg-isi", type: "fill", source: "lp-bmkg", paint: { "fill-color": w, "fill-opacity": 0.2 } });
    peta.addLayer({ id: "lp-bmkg-garis", type: "line", source: "lp-bmkg", paint: { "line-color": w, "line-width": 1.6 } });
  },
  async tp() {
    const d = await ambil("/data/hotspot24.json");
    if (!d?.baris) return info("tp", "Tidak tersedia: berkas titik panas belum bisa dimuat");
    const fs = d.baris.filter((r) => r[2] > -24).map((r) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [r[1], r[0]] } }));
    info("tp", fs.length + " titik, dari data sistem");
    if (!nyala.has("tp")) return;
    buang("lp-tp", "lp-tp-s");
    peta.addSource("lp-tp", { type: "geojson", data: { type: "FeatureCollection", features: fs } });
    peta.addLayer({ id: "lp-tp-s", type: "circle", source: "lp-tp", paint: { "circle-color": warnaToken("--bad"), "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 9, 5], "circle-opacity": 0.8, "circle-stroke-width": 0.5, "circle-stroke-color": warnaToken("--card") } });
  },
  async nc() {
    const muat = async () => {
      let d; try { const r = await fetch(NC, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw 0; d = await r.json(); } catch { return info("nc", "Tidak tersedia: server BMKG tidak mengizinkan akses dari peramban"); }
      if (!nyala.has("nc") || !Array.isArray(d?.features)) return;
      const fs = d.features.filter((f) => f.geometry);
      const meluas = fs.filter((f) => /meluas/i.test(f.properties?.tipearea || "")).length;
      info("nc", fs.length ? `${fs.length - meluas} area terjadi (merah), ${meluas} area meluas (kuning), ${new Date().toTimeString().slice(0, 5)}` : "Tidak ada area nowcasting aktif");
      const src = peta.getSource("lp-nc");
      if (src) return src.setData({ type: "FeatureCollection", features: fs });
      peta.addSource("lp-nc", { type: "geojson", data: { type: "FeatureCollection", features: fs }, attribution: "Nowcasting: BMKG" });
      const w = ["case", ["in", "luas", ["downcase", ["to-string", ["get", "tipearea"]]]], warnaToken("--warn"), warnaToken("--bad")];
      peta.addLayer({ id: "lp-nc-isi", type: "fill", source: "lp-nc", paint: { "fill-color": w, "fill-opacity": 0.3 } });
      peta.addLayer({ id: "lp-nc-garis", type: "line", source: "lp-nc", paint: { "line-color": w, "line-width": 1.2 } });
    };
    ncMuat = muat; await muat(); jadwalNc();
  },
  async adm() {
    const g = await ambil("/geo/provinsi.json");
    if (!g?.features) return info("adm", "Tidak tersedia: batas wilayah belum bisa dimuat");
    provBB = g.features.map((f) => [f.properties.kode, bbox(f.geometry.coordinates)]);
    if (!nyala.has("adm")) return;
    buang("lp-adm-p", "lp-adm-k", "lp-adm-prov", "lp-adm-kab");
    const w = warnaToken("--ink2");
    peta.addSource("lp-adm-prov", { type: "geojson", data: g });
    peta.addSource("lp-adm-kab", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    peta.addLayer({ id: "lp-adm-k", type: "line", source: "lp-adm-kab", paint: { "line-color": w, "line-width": 0.6, "line-opacity": 0.7 } });
    peta.addLayer({ id: "lp-adm-p", type: "line", source: "lp-adm-prov", paint: { "line-color": w, "line-width": 1.2 } });
    info("adm", "Kab/kota tampil mulai zoom 6");
    kab();
  },
};
for (const [k, r] of Object.entries(REF)) {   // ArcGIS MapServer export per ubin (EPSG:3857)
  const u = `${r.u}/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&f=image${r.l ? "&layers=" + r.l : ""}`;
  PASANG[k] = () => rasUji(k, k, u, 18, r.a, "layanan peta " + r.a.split(":")[1].trim());
}
const LEPAS = { ...Object.fromEntries(Object.keys(REF).map((k) => [k, ["lp-" + k]])), il: ["lp-il"], nc: ["lp-nc-isi", "lp-nc-garis", "lp-nc"], ir: ["lp-ir"], gpm: ["lp-gpm"], him: ["lp-him"], bmkg: ["lp-bmkg-isi", "lp-bmkg-garis", "lp-bmkg"], tp: ["lp-tp-s", "lp-tp"], adm: ["lp-adm-p", "lp-adm-k", "lp-adm-prov", "lp-adm-kab"] };

async function kab() {   // garis kab/kota hanya untuk provinsi yang terlihat, dari cache geo bersama
  if (!nyala.has("adm") || !provBB || !peta.getSource("lp-adm-kab")) return;
  if (peta.getZoom() < 6) return peta.getSource("lp-adm-kab").setData({ type: "FeatureCollection", features: [] });
  const b = peta.getBounds(), ada = provBB.filter(([, [[a, c], [d, e]]]) => a <= b.getEast() && d >= b.getWest() && c <= b.getNorth() && e >= b.getSouth());
  const fs = (await Promise.all(ada.map(([k]) => geoKab(k)))).flatMap((g) => g?.features || []);
  peta.getSource("lp-adm-kab")?.setData({ type: "FeatureCollection", features: fs });
}

function jadwalNc() {   // tiap 10 menit saat menyala, berhenti saat tab tersembunyi
  clearInterval(tmNc); tmNc = 0;
  if (nyala.has("nc") && !document.hidden) tmNc = setInterval(() => ncMuat?.(), 600000);
}
const lihat = () => { if (document.hidden) jadwalNc(); else if (nyala.has("nc")) { ncMuat?.(); jadwalNc(); } };
function dasar(v) {   // peta dasar raster di bawah semua lapis; isi vektor peta dasar (bukan label) disembunyikan selama menyala
  dsb = DASAR[v] ? v : "";
  buang("lp-dasar");
  const L = peta.getStyle().layers, vis = (i, x) => peta.setLayoutProperty(i, "visibility", x);
  if (!dsb) { for (const i of tersembunyi) if (peta.getLayer(i)) vis(i, "visible"); tersembunyi = []; return; }
  const d = DASAR[dsb];
  peta.addSource("lp-dasar", { type: "raster", tiles: [d.u], tileSize: 256, maxzoom: d.z, attribution: d.a });
  peta.addLayer({ id: "lp-dasar", type: "raster", source: "lp-dasar" }, L[0]?.id);
  for (const l of L) if (!tersembunyi.includes(l.id) && !l.id.startsWith("lp-") && /^(background|fill|line)$/.test(l.type) && (l.type === "background" || l.source === "openmaptiles") && (l.layout?.visibility ?? "visible") === "visible") { vis(l.id, "none"); tersembunyi.push(l.id); }
}
function hidupkan(k) { nyala.add(k); Promise.resolve().then(() => PASANG[k]()).catch(() => info(k, "Tidak tersedia: terjadi galat saat memuat")); }
function matikan(k) { nyala.delete(k); buang(...LEPAS[k]); info(k, ""); if (k === "nc") jadwalNc(); }

const IK2 = { ...IK, titik: '<circle cx="7" cy="8" r="2"/><circle cx="16" cy="7" r="2"/><circle cx="11" cy="15" r="2"/><circle cx="18" cy="16" r="2"/>' };   // titik: ikon ubin Titik panas peta utama
const svg = (i) => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK2[i]}</svg>`;
function panel() {
  const grup = [...new Set(LAPIS.map((d) => d.g))];
  const ds = `<details open><summary>Peta dasar</summary><div class="lp-lp-set"><select data-ds aria-label="Peta dasar"><option value="">Bawaan</option>${Object.entries(DASAR).map(([c, d]) => `<option value="${c}"${c === dsb ? " selected" : ""}>${esc(d.n)}</option>`).join("")}</select></div></details>`;
  return `<div class="lapis-hd"><span>Overlay</span><button type="button" data-lipat aria-label="Tutup semua grup" title="Tutup semua grup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 11 5-5 5 5M7 18l5-5 5 5"/></svg></button></div>`
    + ds + grup.map((g) => { const L = LAPIS.filter((d) => d.g === g); return `<details open><summary>${esc(g)}</summary><div class="ub-gr">`
      + L.map((d) => `<label class="ubin" title="${esc(d.n)}"><input type="checkbox" data-k="${d.k}"${nyala.has(d.k) ? " checked" : ""}><i class="ub-th" style="--a:${d.w[0]};--b:${d.w[1]}">${svg(d.i)}</i><span>${esc(d.p)}</span></label>`).join("")
      + `</div>` + L.map((d) => `<div class="lp-lp-set" data-set="${d.k}"${nyala.has(d.k) ? "" : " hidden"}><b>${esc(d.n)}</b>`
        + (d.k === "ir" ? `<select data-ir aria-label="Jenis bahaya InaRISK">${IR.map(([c, n]) => `<option value="${c}"${c === irb ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>` : "")
        + (d.k === "il" ? `<input type="search" list="lpIl" data-il placeholder="Cari lapisan InaRISK" value="${esc(LAIN.find((x) => x[0] === ilb)?.[1] || "")}" aria-label="Cari lapisan InaRISK lain"><datalist id="lpIl">${LAIN.map(([, n]) => `<option value="${esc(n)}">`).join("")}</datalist><small>Lapisan GeoServer InaRISK lain (tol, drone, dan sebagainya) belum bisa: server BNPB menolak akses dari peramban.</small>` : "")
        + (d.ras ? `<label class="lp-lp-o"><span>Transparansi</span><input type="range" min="10" max="100" value="${Math.round(opas[d.k] * 100)}" data-o="${d.k}" aria-label="Opasitas ${esc(d.n)}"></label>` : "")
        + `<small data-st="${d.k}" role="status"></small></div>`).join("") + `</details>`; }).join("");
}
function pasangKontrol() {
  ctl = {
    onAdd() {
      el = Object.assign(document.createElement("div"), { className: "maplibregl-ctrl lp-lp-pn lapis", id: "lpLapis", role: "group", ariaLabel: "Overlay peta" });   // selalu terbuka, seperti Overlay peta utama (pemilik 27 Nov 2026)
      el.innerHTML = panel();
      const pn = el;
      pn.addEventListener("change", (e) => {
        const c = e.target;
        if (c.dataset.k) { c.checked ? hidupkan(c.dataset.k) : matikan(c.dataset.k); pn.querySelector(`[data-set="${c.dataset.k}"]`).hidden = !c.checked; simpan(); }
        else if (c.matches("[data-ds]")) { dasar(c.value); simpan(); }
        else if (c.matches("[data-il]")) { const h = LAIN.find((x) => x[1] === c.value); if (!h) return; ilb = h[0]; info("il", ""); if (!nyala.has("il")) { pn.querySelector('[data-k="il"]').checked = true; pn.querySelector('[data-set="il"]').hidden = false; } hidupkan("il"); simpan(); }
        else if (c.matches("[data-ir]")) { irb = c.value; if (nyala.has("ir")) { info("ir", ""); hidupkan("ir"); } simpan(); }
      });
      pn.addEventListener("click", (e) => {   // tombol kepala: lipat atau buka semua grup, seperti Overlay peta utama
        const b = e.target.closest("[data-lipat]"); if (!b) return;
        const tutup = b.classList.toggle("tutup"), t = tutup ? "Buka semua grup" : "Tutup semua grup";
        pn.querySelectorAll("details").forEach((d) => { d.open = !tutup; }); b.ariaLabel = t; b.title = t;
      });
      pn.addEventListener("input", (e) => { const k = e.target.dataset.o; if (!k) return; opas[k] = e.target.value / 100; if (peta.getLayer("lp-" + k)) peta.setPaintProperty("lp-" + k, "raster-opacity", opas[k]); });
      return el;
    },
    onRemove() { el?.remove(); el = null; },
  };
  peta.addControl(ctl, "top-right");
}

/** Dipanggil saat mode Peringatan menyala dan peta siap. */
export function buka(p, st, ub) {
  tutup();
  peta = p; state = st; ubah = ub;
  const tk = (state.lp || "").split(".");
  for (const t of tk) {
    if (t.startsWith("ir-") && IR.some((x) => x[0] === t.slice(3))) irb = t.slice(3);
    else if (t.startsWith("il-") && LAIN.some((x) => x[0] === t.slice(3))) ilb = t.slice(3);
    else if (t.startsWith("ds-") && DASAR[t.slice(3)]) dsb = t.slice(3);
  }
  const awal = tk.map((t) => t === "ir" || t.startsWith("ir-") ? "ir" : t === "il" || t.startsWith("il-") ? "il" : t).filter((t) => LAPIS.some((d) => d.k === t));
  pasangKontrol();
  if (dsb) dasar(dsb);
  for (const k of awal) hidupkan(k);
  peta.on("moveend", kab);
  document.addEventListener("visibilitychange", lihat);
}
/** Mode kembali ke Kejadian: lapis dan kontrol dicabut. */
export function tutup() {
  if (!peta) return;
  peta.off("moveend", kab);
  document.removeEventListener("visibilitychange", lihat);
  for (const k of [...nyala]) matikan(k);
  dasar("");
  if (ctl) { try { peta.removeControl(ctl); } catch { /* peta sudah dibuang */ } ctl = null; }
  peta = null;
}
