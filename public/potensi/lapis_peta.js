/* Menu lapisan peta mode Peringatan /lapor (K8b): kelas bahaya InaRISK, poligon BMKG, hujan GPM IMERG, awan Himawari (GIBS NASA), titik panas, batas administrasi.
   Lapis yang menyala ada di alamat (?lp=ir-bnj.gpm). Raster di bawah label peta dasar; vektor di atasnya. Token tema saja. */
import { warnaToken } from "/inti/maplibre.js";
import { ambil, geoKab, bbox } from "/potensi/umum.js";
import { ambilPeringatan } from "/potensi/kabar_baru.js";

const IR = [["bnj", "Banjir", "banjir"], ["bdg", "Banjir bandang", "banjir_bandang"], ["lsr", "Longsor", "tanah_longsor"], ["gel", "Gelombang ekstrem", "gelombang_ekstrim_dan_abrasi"], ["kht", "Karhutla", "kebakaran_hutan_dan_lahan"], ["kek", "Kekeringan", "kekeringan"], ["cex", "Cuaca ekstrem", "cuaca_ekstrim"]];
const LAPIS = [
  { k: "ir", n: "Kelas bahaya InaRISK", ras: 1 },
  { k: "bmkg", n: "Poligon peringatan BMKG aktif" },
  { k: "gpm", n: "Hujan satelit GPM IMERG", ras: 1 },
  { k: "him", n: "Awan Himawari inframerah", ras: 1 },
  { k: "tp", n: "Titik panas 24 jam" },
  { k: "adm", n: "Batas provinsi dan kab/kota" },
];
const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const IKON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/></svg>';

let peta = null, state = null, ubah = null, ctl = null, el = null, irb = "bnj", provBB = null, ditolak = new Map();
const nyala = new Set(), opas = { ir: 0.7, gpm: 0.7, him: 0.6 };
const sebelumLabel = () => peta.getStyle().layers.find((l) => l.type === "symbol")?.id;
const simpan = () => ubah({ lp: [...nyala].map((k) => (k === "ir" ? "ir-" + irb : k)).join(".") });
const info = (k, t) => { const s = el?.querySelector(`[data-st="${k}"]`); if (s) s.textContent = t || ""; };
const buang = (...id) => { for (const i of id) if (peta.getLayer(i)) peta.removeLayer(i); for (const i of id) if (peta.getSource(i)) peta.removeSource(i); };

function ras(id, tiles, maxzoom, attr, k) {
  buang(id);
  peta.addSource(id, { type: "raster", tiles: [tiles], tileSize: 256, maxzoom, attribution: attr });
  peta.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opas[k] } }, sebelumLabel());
}
const iso10 = () => { const t = new Date(Date.now() - 3600000); t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 10) * 10, 0, 0); return t.toISOString().slice(0, 19) + "Z"; };

const PASANG = {
  async ir() {
    const l = IR.find((x) => x[0] === irb)[2], u = `${location.origin}/api/inarisk/ubin/layer_bahaya_${l}?bbox={bbox-epsg-3857}`;
    if (!ditolak.has(irb)) {   // satu ubin uji: layanan BNPB kadang menolak atau mati
      let alasan = "";
      try { const r = await fetch(u.replace("{bbox-epsg-3857}", "11700000,-850000,12000000,-550000")); if (!r.ok || !/image/.test(r.headers.get("content-type") || "")) alasan = "layanan peta BNPB tidak menjawab (kode " + r.status + ")"; } catch { alasan = "layanan peta BNPB tidak bisa dihubungi"; }
      ditolak.set(irb, alasan);
    }
    if (ditolak.get(irb)) return info("ir", "Tidak tersedia: " + ditolak.get(irb));
    info("ir", ""); ras("lp-ir", u, 12, "Kelas bahaya: InaRISK BNPB", "ir");
  },
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
const LEPAS = { ir: ["lp-ir"], gpm: ["lp-gpm"], him: ["lp-him"], bmkg: ["lp-bmkg-isi", "lp-bmkg-garis", "lp-bmkg"], tp: ["lp-tp-s", "lp-tp"], adm: ["lp-adm-p", "lp-adm-k", "lp-adm-prov", "lp-adm-kab"] };

async function kab() {   // garis kab/kota hanya untuk provinsi yang terlihat, dari cache geo bersama
  if (!nyala.has("adm") || !provBB || !peta.getSource("lp-adm-kab")) return;
  if (peta.getZoom() < 6) return peta.getSource("lp-adm-kab").setData({ type: "FeatureCollection", features: [] });
  const b = peta.getBounds(), ada = provBB.filter(([, [[a, c], [d, e]]]) => a <= b.getEast() && d >= b.getWest() && c <= b.getNorth() && e >= b.getSouth());
  const fs = (await Promise.all(ada.map(([k]) => geoKab(k)))).flatMap((g) => g?.features || []);
  peta.getSource("lp-adm-kab")?.setData({ type: "FeatureCollection", features: fs });
}

function hidupkan(k) { nyala.add(k); Promise.resolve().then(() => PASANG[k]()).catch(() => info(k, "Tidak tersedia: terjadi galat saat memuat")); }
function matikan(k) { nyala.delete(k); buang(...LEPAS[k]); info(k, ""); }

function panel() {
  return LAPIS.map((d) => `<div class="lp-lp-b"><label><input type="checkbox" data-k="${d.k}"${nyala.has(d.k) ? " checked" : ""}><span>${esc(d.n)}</span></label>`
    + (d.k === "ir" ? `<select data-ir aria-label="Jenis bahaya InaRISK">${IR.map(([c, n]) => `<option value="${c}"${c === irb ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>` : "")
    + (d.ras ? `<label class="lp-lp-o"><span>Transparansi</span><input type="range" min="10" max="100" value="${Math.round(opas[d.k] * 100)}" data-o="${d.k}" aria-label="Opasitas ${esc(d.n)}"></label>` : "")
    + `<small data-st="${d.k}" role="status"></small></div>`).join("");
}
function pasangKontrol() {
  ctl = {
    onAdd() {
      el = Object.assign(document.createElement("div"), { className: "maplibregl-ctrl maplibregl-ctrl-group lp-lp" });
      el.innerHTML = `<button type="button" class="lp-lp-btn" popovertarget="lpLapis" aria-label="Lapisan peta" title="Lapisan peta">${IKON}<span>Lapisan peta</span></button><div id="lpLapis" class="lp-lp-pn" popover>${panel()}</div>`;
      const pn = el.querySelector("#lpLapis"), bt = el.querySelector("button");
      pn.addEventListener("toggle", (e) => { if (e.newState !== "open") return; const r = bt.getBoundingClientRect(); pn.style.top = r.bottom + 6 + "px"; pn.style.right = Math.max(8, innerWidth - r.right) + "px"; });
      pn.addEventListener("change", (e) => {
        const c = e.target;
        if (c.dataset.k) { c.checked ? hidupkan(c.dataset.k) : matikan(c.dataset.k); simpan(); }
        else if (c.matches("[data-ir]")) { irb = c.value; if (nyala.has("ir")) { info("ir", ""); hidupkan("ir"); } simpan(); }
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
  for (const t of (state.lp || "").split(".")) { if (t.startsWith("ir-") && IR.some((x) => x[0] === t.slice(3))) irb = t.slice(3); }
  const awal = (state.lp || "").split(".").map((t) => t.slice(0, 2) === "ir" ? "ir" : t).filter((t) => LAPIS.some((d) => d.k === t));
  pasangKontrol();
  for (const k of awal) hidupkan(k);
  peta.on("moveend", kab);
}
/** Mode kembali ke Kejadian: lapis dan kontrol dicabut. */
export function tutup() {
  if (!peta) return;
  peta.off("moveend", kab);
  for (const k of [...nyala]) matikan(k);
  if (ctl) { try { peta.removeControl(ctl); } catch { /* peta sudah dibuang */ } ctl = null; }
  peta = null;
}
