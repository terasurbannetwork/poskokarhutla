/* Atur drone gambut (/admin/drone, src/drone.js). Daftar cluster gambut membara dari /data/kluster_awal.json (properti bara.sel),
   rute sapuan termal per cluster (drone_rute.js), unduh KMZ per penerbangan untuk DJI Pilot 2. Panduan: docs/bnpb/PANDUAN-DRONE-GAMBUT.md.
   Klik peta = titik lepas landas. ?k=<id> memilih cluster (tautan ikon drone di peta utama). */
(() => {
"use strict";
const R = window.DroneRute, SEL = 0.003375, app = document.getElementById("app");
const angka = (v, d = 0) => Number(v).toLocaleString("id-ID", {maximumFractionDigits: d, minimumFractionDigits: d});
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const LEVEL = ["Pantau", "Waspada", "Siaga", "Darurat"];
let daftar = [], pilih = null, lepas = null, peta = null, rencana = null, jadwal = 0;
/* contoh untuk Super Admin (tombol 🧪): satu cluster rekaan di Pulang Pisau, hanya di peramban ini, tidak tersimpan */
const CONTOH = (() => {
  const sel = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) if (!(i === 4 && j === 0)) sel.push([-2.74 + j * SEL, 114.2 + i * SEL / Math.cos(2.74 * Math.PI / 180), +(i + j < 5)]);
  return {id: "CONTOH", dummy: true, kab: "Pulang Pisau (contoh)", prov: "Kalimantan Tengah", level: 2, lat: -2.735, lon: 114.207, akhir: new Date().toISOString(),
    bara: {fb: 0.6, d: [15, 37, 51], a: [28, 84, 281], sel}};
})();

const opsi = () => {
  const f = document.getElementById("drForm"); if (!f) return {};
  const v = n => f.elements[n]?.value, num = n => Number(v(n));
  const d = R.DRONE[v("drone")] || R.DRONE.m3t;
  return {drone: v("drone"), tinggi: num("tinggi"), laju: num("laju"), samping: num("samping") / 100, depan: num("samping") / 100,
    menit: num("menit") || d.menit, fov_h: num("fov") || d.fov_h, enum: [num("e0"), num("e1"), num("e2")], lepas};
};

function kotak(s) {
  const h = SEL / 2, hl = h / Math.cos(s[0] * Math.PI / 180);
  return {type: "Feature", properties: {p: s[2]}, geometry: {type: "Polygon", coordinates: [[[s[1] - hl, s[0] - h], [s[1] + hl, s[0] - h], [s[1] + hl, s[0] + h], [s[1] - hl, s[0] + h], [s[1] - hl, s[0] - h]]]}};
}
const fc = f => ({type: "FeatureCollection", features: f});

function gambarPeta() {
  if (!peta?.getSource("sel")) return;
  const k = pilih;
  peta.getSource("sel").setData(fc(k ? k.bara.sel.map(kotak) : []));
  peta.getSource("rute").setData(fc(rencana ? rencana.terbang.map((f, i) => ({type: "Feature", properties: {i}, geometry: {type: "LineString", coordinates: [[rencana.lepas[1], rencana.lepas[0]], ...f.titik.map(([a, b]) => [b, a]), [rencana.lepas[1], rencana.lepas[0]]]}})) : []));
  peta.getSource("lepas").setData(fc(rencana ? [{type: "Feature", properties: {}, geometry: {type: "Point", coordinates: [rencana.lepas[1], rencana.lepas[0]]}}] : []));
}
function bingkai() {
  if (!peta || !pilih) return;
  const s = pilih.bara.sel, la = s.map(x => x[0]), lo = s.map(x => x[1]);
  peta.fitBounds([[Math.min(...lo) - 0.01, Math.min(...la) - 0.01], [Math.max(...lo) + 0.01, Math.max(...la) + 0.01]], {padding: 40, animate: false});
}

function ringkasan() {
  const el = document.getElementById("drHasil"); if (!el) return;
  if (!rencana) { el.innerHTML = '<p class="ad-redup">Pilih cluster di daftar.</p>'; return; }
  const r = rencana;
  el.innerHTML = `<div class="dr-kpi"><div><b>${angka(r.terbang.length)}</b><span>penerbangan</span></div><div><b>${angka(r.km, 1)} km</b><span>panjang rute</span></div>
    <div><b>${angka(r.menit)} menit</b><span>waktu terbang</span></div><div><b>${angka(r.foto)}</b><span>foto termal</span></div></div>
    <p class="dr-ket">Lebar lajur ${angka(r.jarak_lajur)} m, foto tiap ${angka(r.jarak_foto)} m, ketinggian ${angka(r.tinggi)} m di atas titik lepas landas, ${angka(r.sel)} sel gambut 375 m.</p>
    ${r.peringatan.map(p => `<p class="dr-awas">${esc(p)}</p>`).join("")}
    <ol class="dr-terbang">${r.terbang.map((f, i) => `<li><span>Penerbangan ${i + 1}: ${angka(f.km, 1)} km, ${angka(f.menit)} menit, ${angka(f.foto)} foto</span>
      <button class="ad-tombol" type="button" data-kmz="${i}">Unduh KMZ</button></li>`).join("")}</ol>
    <p class="dr-ket">Buka KMZ di DJI Pilot 2 (Rute, Impor). Cek ketinggian, kecepatan, dan batas area larangan terbang di layar remote sebelum terbang.</p>`;
}

function hitung() {
  jadwal = 0;
  rencana = pilih ? R.rencana(pilih.bara.sel, opsi()) : null;
  ringkasan(); gambarPeta();
}
const hitungNanti = () => { if (!jadwal) jadwal = setTimeout(hitung, 0); };   // input mengetik: rute dihitung sesudah bingkai berikutnya, bukan di handler

function isiDaftar() {
  const ul = document.getElementById("drDaftar"); if (!ul) return;
  if (!daftar.length) { ul.innerHTML = '<li class="ad-redup">Belum ada cluster gambut yang ditandai membara hari ini. Penanda muncul pada cluster level Waspada ke atas di lahan gambut.</li>'; return; }
  ul.innerHTML = daftar.map(k => `<li><button type="button" data-k="${esc(k.id)}" aria-pressed="${pilih === k}">
    <b>${esc(k.id)}${k.dummy ? " (contoh)" : ""}</b><span>${esc(k.kab || "")}, ${esc(k.prov || "")}</span>
    <small>${esc(LEVEL[k.level] || "")}, ${angka(k.bara.sel.length)} sel gambut, persistensi ${angka((k.bara.fb || 0) * 100)}%, kedalaman tengah ${angka(k.bara.d?.[1] ?? 0)} cm</small></button></li>`).join("");
}

function pilihCluster(k) {
  pilih = k; lepas = null;
  const f = document.getElementById("drForm"); if (f) f.hidden = !k;
  isiDaftar(); bingkai(); hitungNanti();   // daftar tercat dulu (chrome urgent), rute menyusul
  if (k) history.replaceState(null, "", "?k=" + encodeURIComponent(k.id));
}

function isiDrone(kunci) {
  const f = document.getElementById("drForm"), d = R.DRONE[kunci];
  f.elements.fov.value = d.fov_h; f.elements.menit.value = d.menit; [0, 1, 2].forEach(i => { f.elements["e" + i].value = d.enum[i]; });
}

function kerangka() {
  const B = R.BAWAAN;
  app.innerHTML = `<div class="dr-tata">
  <section class="dr-panel">
    <h2>Cluster gambut membara</h2><ul class="dr-daftar" id="drDaftar"></ul>
    <form id="drForm" class="dr-form" hidden>
      <h2>Drone dan rute</h2>
      <label>Drone<select name="drone">${Object.entries(R.DRONE).map(([k, d]) => `<option value="${k}" ${k === B.drone ? "selected" : ""}>${esc(d.nama)}</option>`).join("")}</select></label>
      <label>Ketinggian (m)<input name="tinggi" type="number" min="30" max="${R.MAKS_TINGGI}" step="5" value="${B.tinggi}"></label>
      <label>Kecepatan (m/detik)<input name="laju" type="number" min="2" max="15" step="1" value="${B.laju}"></label>
      <label>Tumpang tindih foto (%)<input name="samping" type="number" min="0" max="60" step="5" value="${B.samping * 100}"></label>
      <label>Waktu terbang satu baterai (menit)<input name="menit" type="number" min="5" max="60" step="1"></label>
      <details><summary>Lanjutan: kamera dan kode drone</summary>
        <label>Sudut pandang horizontal kamera termal (derajat)<input name="fov" type="number" min="10" max="90" step="1"></label>
        <label>Kode drone WPML<span class="dr-tiga"><input name="e0" type="number" aria-label="droneEnumValue"><input name="e1" type="number" aria-label="droneSubEnumValue"><input name="e2" type="number" aria-label="payloadEnumValue"></span></label>
        <p class="dr-ket">Isi kode dari KMZ yang diekspor DJI Pilot 2 untuk drone yang sama (berkas wpmz/waylines.wpml). Nilai bawaan belum diverifikasi.</p>
      </details>
      <p class="dr-ket">Klik peta untuk memindah titik lepas landas. Bawaan: ujung lajur pertama.</p>
      <button class="ad-tombol" type="button" data-lepas-ulang>Kembalikan titik lepas landas</button>
    </form>
    <div id="drHasil"></div>
  </section>
  <section class="dr-peta"><div id="drPeta" role="img" aria-label="Peta sel gambut membara dan rute drone"></div>
    <p class="dr-legenda"><i class="dr-l1"></i>sel persisten <i class="dr-l0"></i>sel gambut lain <i class="dr-lr"></i>rute <i class="dr-ll"></i>lepas landas</p></section>
  </div>`;
  isiDrone(B.drone);
}

function pasangPeta() {
  peta = new maplibregl.Map({container: "drPeta", style: "https://tiles.openfreemap.org/styles/positron", center: [113.9, -2.2], zoom: 6, attributionControl: {compact: true}});
  peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  peta.on("load", () => {
    for (const id of ["sel", "rute", "lepas"]) peta.addSource(id, {type: "geojson", data: fc([])});
    peta.addLayer({id: "sel-isi", type: "fill", source: "sel", paint: {"fill-color": ["case", ["==", ["get", "p"], 1], "#b42318", "#e8a33d"], "fill-opacity": 0.45}});
    peta.addLayer({id: "sel-garis", type: "line", source: "sel", paint: {"line-color": "#7a1e14", "line-width": 0.6}});
    peta.addLayer({id: "rute-garis", type: "line", source: "rute", paint: {"line-color": ["match", ["%", ["get", "i"], 3], 0, "#0b2545", 1, "#1d4e89", "#5b6782"], "line-width": 1.6}});
    peta.addLayer({id: "lepas-titik", type: "circle", source: "lepas", paint: {"circle-radius": 7, "circle-color": "#c9a227", "circle-stroke-color": "#0b2545", "circle-stroke-width": 2}});
    bingkai(); gambarPeta();
  });
  peta.on("click", e => { if (!pilih) return; lepas = [e.lngLat.lat, e.lngLat.lng]; hitungNanti(); });
}

function unduh(i) {
  const k = pilih, r = rencana; if (!k || !r) return;
  const b = window.LaporanKoordalops.zip(R.wpml(r, i, `${k.id} penerbangan ${i + 1}`));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([b], {type: "application/vnd.google-earth.kmz"}));
  a.download = `drone-gambut-${k.id}-terbang${i + 1}.kmz`; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

app.addEventListener("click", e => {
  const b = e.target.closest("[data-k]"); if (b) { pilihCluster(daftar.find(k => k.id === b.dataset.k) || null); return; }
  const z = e.target.closest("[data-kmz]"); if (z) { unduh(+z.dataset.kmz); return; }
  if (e.target.closest("[data-lepas-ulang]")) { lepas = null; hitungNanti(); }
});
app.addEventListener("input", e => {
  if (e.target.name === "drone") isiDrone(e.target.value);
  hitungNanti();
});
document.getElementById("aksiJudul")?.addEventListener("click", e => {
  const t = e.target.closest("[data-dummy]"); if (!t) return;
  daftar = daftar.filter(k => !k.dummy);
  if (t.dataset.dummy === "isi") daftar.unshift(CONTOH);
  pilihCluster(t.dataset.dummy === "isi" ? CONTOH : null);
});

(async () => {
  kerangka();
  window.Admin?.pasangDummy(document.getElementById("aksiJudul"), document.body.dataset.super === "1");
  try { pasangPeta(); } catch (e) { document.getElementById("drPeta").textContent = "Peta tidak bisa dimuat di peramban ini."; }
  try {
    const d = await fetch("/data/kluster_awal.json").then(r => r.ok ? r.json() : fetch("/data/kluster.json").then(x => x.json()));
    daftar = d.features.map(f => f.properties).filter(p => p.bara?.sel?.length)
      .sort((a, b) => b.level - a.level || (b.bara.fb || 0) - (a.bara.fb || 0));
  } catch (e) { daftar = []; }
  const k0 = new URLSearchParams(location.search).get("k");
  isiDaftar();
  pilihCluster(daftar.find(k => k.id === k0) || null);
})();
})();
