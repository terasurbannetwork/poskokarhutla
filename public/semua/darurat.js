"use strict";
/* Status darurat bencana di /semua (fase Tanggap Darurat): titik per kabupaten di peta + tabel ringkas.
   Data: /data/status_darurat.json (scripts/umum/status_darurat.py, SK BNPB). Berkas tak ada atau tak ada SK yang berlaku = kalimat jujur, bukan kosong diam-diam.
   Butuh format.js (esc, escUrl, fmt), kartu.js, tabel.js (pasangTabel), nanti.js. */
const BP = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const WARNA = {"Siaga Darurat": "#e3b94e", "Tanggap Darurat": "#c9503a", "Transisi Darurat ke Pemulihan": "#4f8fc4"};
const ABU = "#9aa5b4", SRC = "s-darurat", LYR = "l-darurat";
export const tglID = t => { const d = new Date(String(t).slice(0, 10) + "T12:00:00Z"); return isNaN(d) ? "–" : `${d.getUTCDate()} ${BP[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);   /* tanggal WIB */
const beda = (a, b) => Math.round((new Date(a + "T12:00:00Z") - new Date(b + "T12:00:00Z")) / 864e5);
export const berlaku = (k, h) => !!k.mulai && k.mulai <= h && (!k.berakhir || k.berakhir >= h);
const tempat = k => k.skala === "provinsi" || !k.kab ? `Provinsi ${k.prov}` : k.kab;
const pil = (t, w) => `<span class="pl" style="--w:${w || ABU}">${esc(t)}</span>`;
export const masa = (k, h) => { const sisa = k.berakhir && berlaku(k, h) ? beda(k.berakhir, h) : null;
  return `${k.berakhir ? `berlaku ${tglID(k.mulai)} sampai ${tglID(k.berakhir)}` : `berlaku sejak ${tglID(k.mulai)}, belum ada tanggal berakhir`}${sisa != null ? `, sisa ${fmt(sisa)} hari` : ""}`; };
const tautan = k => { const u = escUrl(k.tautan); return u === "#" ? "" : `<a href="${u}" target="_blank" rel="noopener noreferrer">Lihat SK</a>`; };

export function popupHTML(k, h) {
  return `<b translate="no">${esc(tempat(k))}</b><br>${pil(k.status, WARNA[k.status])}<br>${esc(k.jenis)}${k.klasifikasi ? `, ${esc(k.klasifikasi)}` : ""}<br>SK ${esc(k.nomor)}<br>${esc(masa(k, h))}${tautan(k) ? `<br>${tautan(k)}` : ""}`;
}

export async function pasangDarurat(el, peta) {
  let D = null; try { const r = await fetch("/data/status_darurat.json", {cache: "no-cache"}); if (r.ok) D = await r.json(); } catch (e) {}
  const SK = Array.isArray(D?.sk) ? D.sk : [], h = hariIni(), st = {mode: "hari", aktif: false};
  const tahun = D?.tahun?.length ? (D.tahun.length > 1 ? `${D.tahun[0]} sampai ${D.tahun.at(-1)}` : String(D.tahun[0])) : "";
  const daftar = () => st.mode === "hari" ? SK.filter(k => berlaku(k, h)) : SK;
  const popup = new maplibregl.Popup({closeButton: false, offset: 8, maxWidth: "320px"});

  /* lapisan: dipasang ulang tiap style.load (ganti tema membuang sumber) */
  const fitur = () => ({type: "FeatureCollection", features: daftar().filter(k => k.lon != null && k.lat != null && isFinite(k.lon) && isFinite(k.lat))
    .map(k => ({type: "Feature", geometry: {type: "Point", coordinates: [+k.lon, +k.lat]}, properties: {i: SK.indexOf(k), c: WARNA[k.status] || ABU}}))});
  const lapis = () => {
    if (!SK.length || peta.getSource(SRC)) return;
    peta.addSource(SRC, {type: "geojson", data: fitur()});
    peta.addLayer({id: LYR, type: "circle", source: SRC, layout: {visibility: st.aktif ? "visible" : "none"}, paint: {"circle-radius": 7, "circle-color": ["get", "c"], "circle-opacity": .9, "circle-stroke-color": "#fff", "circle-stroke-width": 1.5}});
  };
  peta.on("mouseenter", LYR, () => peta.getCanvas().style.cursor = "pointer");
  peta.on("mouseleave", LYR, () => peta.getCanvas().style.cursor = "");
  peta.on("click", LYR, e => { const k = SK[e.features[0].properties.i]; if (k) popup.setLngLat(e.features[0].geometry.coordinates).setHTML(popupHTML(k, h)).addTo(peta); });
  peta.on("style.load", lapis); if (peta.isStyleLoaded()) lapis();

  const judul = () => SK.length ? `${Kartu.hl(fmt(daftar().length) + " SK")} ${st.mode === "hari" ? "berlaku hari ini" : "tercatat pada " + esc(tahun)}` : "Status darurat belum tersedia";
  const ket = () => !SK.length ? "Data SK status darurat BNPB belum tersedia, jadi lapisan ini kosong. Angka tidak ditebak."
    : st.mode === "hari" && !daftar().length ? `Data SK BNPB terakhir mencakup ${tahun}; tidak ada SK yang masih berlaku hari ini (${tglID(h)}). Pilih Semua SK untuk melihat yang sudah berakhir.` : "";
  el.innerHTML = Kartu.kartu("Status darurat", judul(), `<p class="kosong" role="status" id="drKet" hidden></p><div id="drTabel"></div>`,
    esc(D?.sumber || "SK status darurat BNPB") + (D?.dibuat ? `, data ${tglID(D.dibuat)}` : ""),
    SK.length ? `<div class="seg" role="group" aria-label="Saring SK"><button type="button" data-m="hari" aria-pressed="true">Berlaku hari ini</button><button type="button" data-m="semua" aria-pressed="false">Semua SK</button></div>` : "",
    SK.length ? Object.entries(WARNA).map(([n, w]) => [w, n]) : null);
  const tabel = SK.length ? pasangTabel(el.querySelector("#drTabel"), {per: 10, satuan: "SK", urut: "berakhir", turun: false, kosong: "",
    kolom: [["kab", "Kabupaten/kota"], ["status", "Status"], ["jenis", "Jenis"], ["berakhir", "Berakhir"], ["tautan", "SK"]],
    nilai: (k, c) => c === "kab" ? tempat(k) : c === "tautan" ? "" : c === "berakhir" ? k.berakhir || "9999" : k[c] || "",
    sel: (k, c) => c === "kab" ? `<span translate="no">${esc(tempat(k))}</span>` : c === "status" ? pil(k.status, WARNA[k.status]) : c === "berakhir" ? (k.berakhir ? tglID(k.berakhir) : "belum ada") : c === "tautan" ? (tautan(k) || "–") : esc(k.jenis)}) : null;
  const segar = () => { const p = el.querySelector("#drKet"), t = ket(); p.hidden = !t; p.textContent = t;
    el.querySelector("h3").innerHTML = judul(); tabel?.set(daftar()); peta.getSource(SRC)?.setData(fitur()); };
  segar();
  el.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b) return;
    b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));   /* chrome urgent */
    st.mode = b.dataset.m; nanti(segar); });
  return {aktif(ya) { st.aktif = ya; if (peta.getLayer(LYR)) peta.setLayoutProperty(LYR, "visibility", ya ? "visible" : "none"); if (!ya) popup.remove(); }, ada: SK.length > 0, legenda: Object.entries(WARNA)};
}
