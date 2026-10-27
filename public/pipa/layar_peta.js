/* SIPPA: layar Peta kelayakan dan saran sarana /pipa/peta (PRD §9.4.2 §9.13, DS §3.6 §4.2, keputusan 30, 44, 51, 52). Kontrak router: pasang(akar, konteks) dan lepas().
   Bagian atas = fungsi murni tanpa DOM (pembentuk GeoJSON, saringan, ringkasan zona, rincian, saran, formulir); bagian bawah = MapLibre dan DOM.
   Rumus zona dan saran sarana dari hitung.js (satu sumber); angka judul dan ringkasan dari zona.json, tidak dihitung ulang di klien, kecuali kolom Terverifikasi
   yang bergantung cek jalan dan dihitung dari kelayakan_kompleks.json. Sakelar satuan hanya setLayoutProperty, saringan hanya setFilter; sumber GeoJSON dibuat sekali.
   Gaya di layar_peta.css (dimuat layar ini). Tidak ada data di berkas ini. Butuh global public/inti: fmt, esc, jamWIB, Kartu, nanti, PilihCantik (opsional). */
import {saranSarana, zonaTerverifikasi} from "./hitung.js";
import {memuat, kosong, galat as kotakGalat} from "./keadaan.js";
import {kirimPost, bukaDialog, tutupDialog, peranKlien} from "./layar_kit.js";
import {ikon} from "./ikon.js";

export const JALUR = {kompleks: "/api/sippa/data/kelayakan_kompleks", sel: "/api/sippa/data/kelayakan_sel", zona: "/api/sippa/data/zona", cek: "/api/sippa/jalan-cek", aoi: "/api/sippa/aoi"};

/* warna hex setara token PRD §9.4.2 (MapLibre tidak membaca var(--ok)); pola dan huruf membawa makna, warna saja tidak cukup (keputusan 52, DS §2.1.5) */
export const ZONA_META = {
  A: {pola: "penuh", warna: "#20a04e", token: "--ok", arti: "air dan jalan dekat"},
  B: {pola: "cincin", warna: "#259ed6", token: "--info", arti: "air dekat, jalan jauh"},
  C: {pola: "setengah", warna: "#eba002", token: "--warn", arti: "air jauh, jalan dekat"},
  D: {pola: "silang", warna: "#d72828", token: "--bad", arti: "air dan jalan jauh"},
};
const ZONA = Object.keys(ZONA_META);
export const KUNCI_ZONA = {k: "zona_k", u: "zona_u", o: "zona_o", v: "zona_v"};
const NAMA_VERSI = {k: "konservatif", u: "jalan utama OSM", o: "optimistis", v: "terverifikasi"};
const NAMA_GSW = {permanen: "permanen", musiman: "musiman", tak_terdeteksi: "tidak terdeteksi"};
const KENDARAAN = {pickup_4x4: "Pickup 4x4", truk: "Truk", motor: "Motor", jalan_kaki: "Jalan kaki", perahu: "Perahu"};
const NAMA_LAHAN = {lain: "lain", konsesi: "konsesi", konservasi: "konservasi"};
const BASI_HARI = 400;
const PER_HALAMAN = 50;
const RE_KOMPLEKS = /^K\d{1,10}$/, RE_SEL = /^s\d{1,6}_\d{1,6}$/;

/* ---------- potongan kecil ---------- */
const km = n => n == null ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 2});
const tanggal = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const hl = n => `<span class="hl">${esc(fmt(n))}</span>`;
const persen = (x, n) => n ? `${fmt(100 * x / n)}%` : "–";

export const bolehTulis = peran => peran === "W" || peran === "M";
export const basiPeta = (per, kini = Date.now()) => per != null && kini - Date.parse(per) > BASI_HARI * 864e5;

/* ---------- simbol zona: penanda HTML 14 px dengan pola yang sama dengan penanda peta ---------- */
export function polaSvg(z) {
  const w = {A: "a", B: "b", C: "c", D: "d"}[z];
  const isi = {
    A: `<circle class="sp-pola-isi" cx="7" cy="7" r="6"/>`,
    B: `<circle class="sp-pola-garis" cx="7" cy="7" r="4.6"/>`,
    C: `<circle class="sp-pola-garis" cx="7" cy="7" r="5.5"/><path class="sp-pola-isi" d="M7 1.5a5.5 5.5 0 0 0 0 11z"/>`,
    D: `<circle class="sp-pola-isi" cx="7" cy="7" r="6"/><path class="sp-pola-silang" d="M4.2 4.2l5.6 5.6M9.8 4.2l-5.6 5.6"/>`,
  }[z];
  return `<svg class="sp-pola sp-pola-${w}" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">${isi}</svg>`;
}
const pilZona = (z, versi) => `<span class="sp-yakin zona-pil z-${esc(z)}" title="Zona ${esc(z)}: ${esc(ZONA_META[z]?.arti ?? "")}">${polaSvg(z)}${esc(z)} ${esc(versi)}</span>`;

/* ---------- jarak dan zona per versi ---------- */
export const cekTerbaru = daftar => {
  const m = {};
  for (const c of daftar || []) if (c.musim === "hujan" && (!m[c.kompleks_id] || c.waktu > m[c.kompleks_id].waktu)) m[c.kompleks_id] = c;
  return m;
};
export const zonaVersi = (k, versi, cek) => versi === "v" ? zonaTerverifikasi(k, cek[k.id]) : k[KUNCI_ZONA[versi]];
export function hitungPerZona(daftar, versi, cek) {
  const h = {A: 0, B: 0, C: 0, D: 0, n: 0};
  for (const k of daftar) { h[zonaVersi(k, versi, cek)]++; h.n++; }
  return h;
}
/* air dan jalan menurut versi, sama dengan VERSI_ZONA di hitung.js (kendala.json = lama; selain itu semua air OSM) */
export const jarakVersi = (k, versi, cek) => ({
  air: versi === "k" ? k.air_km_lama : k.air_km_semua,
  jalan: versi === "k" ? k.jalan_km_lama : versi === "u" ? k.jalan_km_utama : versi === "o" ? k.jalan_km_semua : cek[k.id]?.hasil === "lolos" ? k.jalan_km_semua : k.jalan_km_lama,
});

/* ---------- angka judul dan ringkasan dari zona.json (P1) ---------- */
const barisZona = (z, prov, versi) => (z.baris || []).find(b => b.prov === prov && b.kab == null && b.versi === versi);
export function judulPeta(z, prov, nama) {
  const k = barisZona(z, prov, "k"), o = barisZona(z, prov, "o");
  if (!k || !o) return null;
  return {teks: `${fmt(k.A)} dari ${fmt(k.n)} kompleks ${nama} di zona A (versi kendala.json); ${fmt(o.A)} bila semua jalan OSM termasuk track dihitung`, k: k.A, o: o.A, n: k.n};
}
export function ringkasanZona(z, prov, kompleks, cek) {
  const b = {k: barisZona(z, prov, "k"), u: barisZona(z, prov, "u"), o: barisZona(z, prov, "o")};
  if (!b.k) return null;
  const v = hitungPerZona(kompleks.filter(k => k.prov === prov), "v", cek);
  const sel = (r, zn) => r ? {n: r[zn], pct: persen(r[zn], r.n)} : {n: null, pct: "–"};
  return {
    baris: ZONA.map(zn => ({zona: zn, k: sel(b.k, zn), u: sel(b.u, zn), o: sel(b.o, zn), v: v.n ? {n: v[zn], pct: persen(v[zn], v.n)} : {n: null, pct: "–"}})),
    n: b.k.n, tanpaJalan16: b.o?.tanpa_jalan_16km ?? null,
    median: Object.fromEntries(["k", "u", "o"].map(x => [x, {air: b[x]?.median_air_km ?? null, jalan: b[x]?.median_jalan_km ?? null}])),
  };
}
const KOLOM_RINGKAS = [["k", "Konservatif", "versi kendala.json"], ["u", "Jalan utama OSM", "tersier ke atas x semua air"], ["o", "Semua jalan OSM", "optimistis, termasuk track"], ["v", "Terverifikasi", "optimistis hanya di kompleks yang cek jalan hujannya lolos"]];
export function ringkasanHtml(r, versiAktif = "k") {
  if (!r) return `<p class="ad-kosong">Belum ada ringkasan zona untuk provinsi ini.</p>`;
  const kepala = KOLOM_RINGKAS.map(([v, n, ket]) => `<th scope="col" class="n${v === versiAktif ? " aktif" : ""}" title="${esc(ket)}">${esc(n)}</th>`).join("");
  const baris = r.baris.map(b => `<tr><th scope="row"><span class="sp-yakin zona-pil z-${b.zona}">${polaSvg(b.zona)}${b.zona}</span></th>${KOLOM_RINGKAS.map(([v, n]) => `<td class="n${v === versiAktif ? " aktif" : ""}" data-label="${esc(n)}"><b>${esc(fmt(b[v].n))}</b> <span class="sp-pct">${esc(b[v].pct)}</span></td>`).join("")}</tr>`).join("");
  const m = r.median;
  return `<div class="ad-tabel-wadah sp-ringkas-zona"><table class="ad-tabel"><caption class="sr">Jumlah kompleks per zona menurut empat versi jarak</caption><thead><tr><th scope="col">Zona</th>${kepala}</tr></thead><tbody>${baris}</tbody></table></div>
    <ul class="sp-daftar sp-ringkas-cat"><li>Tanpa jalan kendaraan dalam 16 km: <b>${esc(fmt(r.tanpaJalan16))}</b> kompleks (semua jalan OSM).</li>
    <li>Median jarak air ${esc(km(m.o.air))} km dan jalan ${esc(km(m.o.jalan))} km (semua jalan OSM); versi kendala.json ${esc(km(m.k.air))} km dan ${esc(km(m.k.jalan))} km.</li></ul>`;
}

/* ---------- satuan, simbol, lapisan peta ---------- */
export const ukuranTitik = n => n >= 6 ? 8 : n >= 3 ? 6 : 4;
export const kelasSel = t => t <= 0 ? 0 : t <= 2 ? 1 : t <= 4 ? 2 : t <= 6 ? 3 : t <= 9 ? 4 : 5;
export function campur(a, b, p) {
  const c = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [c(a), c(b)];
  return "#" + x.map((v, i) => Math.round(v * p + y[i] * (1 - p)).toString(16).padStart(2, "0")).join("");
}
/* ramp kekerapan sel DS §2.1.4: --f2 20/40/60/80% di atas --card, kelas 5 = --f3 */
export const rampSel = gelap => [.2, .4, .6, .8].map(p => campur("#ea8f3a", gelap ? "#131c30" : "#ffffff", p)).concat("#d72828");

export function geoKompleks(daftar, cek) {
  return {type: "FeatureCollection", features: daftar.map(k => ({type: "Feature", geometry: {type: "Point", coordinates: [k.lon, k.lat]},
    properties: {id: k.id, kab: k.kab, gambut: k.gambut, zona_k: k.zona_k, zona_u: k.zona_u, zona_o: k.zona_o, zona_v: zonaVersi(k, "v", cek), r: ukuranTitik(k.terbakar_n_2km ?? 0), gsw: k.gsw}}))};
}
export function geoSel(d) {
  const i = Object.fromEntries(d.kolom.map((n, x) => [n, x])), b4 = x => Math.round(x * 1e4) / 1e4, fitur = [];
  for (const r of d.baris) {
    const th = r[i.tahun_aktif]; if (!(th > 0)) continue;   // sel tanpa deteksi tidak digambar
    const lon = r[i.lon], lat = r[i.lat], x0 = b4(lon - 0.01), x1 = b4(lon + 0.01), y0 = b4(lat - 0.01), y1 = b4(lat + 0.01);
    fitur.push({type: "Feature", geometry: {type: "Polygon", coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]},
      properties: {sel: r[i.sel], kelas: kelasSel(th), th, hari: r[i.hari_api], zona: r[i.zona_k_terdekat], kompleks: r[i.kompleks_terdekat]}});
  }
  return {type: "FeatureCollection", features: fitur};
}

const WARNA_ZONA = ["match", ["get", "zona"], ...ZONA.flatMap(z => [z, ZONA_META[z].warna]), "rgba(0,0,0,0)"];
export function lapisanKompleks(kunci) {
  return [
    {id: "kompleks-pola", type: "symbol", source: "kompleks", layout: {"icon-image": ["concat", "zona-", ["get", kunci]], "icon-size": ["match", ["get", "r"], 4, 0.5, 6, 0.75, 1], "icon-allow-overlap": true, "icon-ignore-placement": true}},
    {id: "kompleks-huruf", type: "symbol", source: "kompleks", minzoom: 10,
      layout: {"text-field": ["get", kunci], "text-font": ["Noto Sans Bold"], "text-size": 10, "text-anchor": "left", "text-offset": [1.1, 0], "text-allow-overlap": false},
      paint: {"text-color": "#ffffff", "text-halo-color": "#0b1220", "text-halo-width": 1.6}},
    {id: "kompleks-sorot", type: "circle", source: "kompleks", paint: {"circle-radius": 14, "circle-opacity": 0, "circle-stroke-color": "#c9a227", "circle-stroke-width": 3,
      "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "dipilih"], false], 1, 0]}},
  ];
}
export function lapisanSel(ramp) {
  return [
    {id: "sel-isi", type: "fill", source: "sel", layout: {visibility: "none"}, paint: {"fill-color": ["match", ["get", "kelas"], 1, ramp[0], 2, ramp[1], 3, ramp[2], 4, ramp[3], ramp[4]], "fill-opacity": 0.75}},
    {id: "sel-garis", type: "line", source: "sel", layout: {visibility: "none"}, paint: {"line-color": ["match", ["get", "zona"], ...ZONA.flatMap(z => [z, ZONA_META[z].warna]), "rgba(0,0,0,0)"], "line-width": 1}},
  ];
}
const LAPISAN_KOMPLEKS = ["kompleks-pola", "kompleks-huruf", "kompleks-sorot"], LAPISAN_SEL = ["sel-isi", "sel-garis"];
/* hanya pasangan [idLapisan, visibility]: pemanggil memakai setLayoutProperty, tidak pernah addSource (P2) */
export function satuanLapisan(satuan) {
  if (satuan !== "kompleks" && satuan !== "sel") throw new RangeError("satuan harus kompleks atau sel");
  const nampak = (daftar, on) => daftar.map(id => [id, on ? "visible" : "none"]);
  return {kompleks: nampak(LAPISAN_KOMPLEKS, satuan === "kompleks"), sel: nampak(LAPISAN_SEL, satuan === "sel")};
}

/* ---------- saringan, urutan, halaman ---------- */
export function saringKompleks(daftar, st, cek) {
  const q = (st.cari || "").trim().toLowerCase();
  return daftar.filter(k => st.zona.has(zonaVersi(k, st.versi, cek)) && (!st.bakar3 || k.terbakar_n_2km >= 3) && st.gsw.has(k.gsw) && (!st.kab || k.kab === st.kab)
    && (!q || k.id.toLowerCase().includes(q) || String(k.kab ?? "").toLowerCase().includes(q))).map(k => k.id);
}
export const filterPeta = ids => ["in", ["get", "id"], ["literal", ids]];

const KUNCI_URUT = {
  id: (k) => k.id, kab: k => k.kab ?? "", zona: (k, v, c) => zonaVersi(k, v, c), terbakar: k => k.terbakar_n_2km ?? -1,
  air: (k, v, c) => jarakVersi(k, v, c).air ?? Infinity, jalan: (k, v, c) => jarakVersi(k, v, c).jalan ?? Infinity, gsw: k => k.gsw ?? "",
};
export function urutDaftar(daftar, versi, cek, urut, turun) {
  const nilai = KUNCI_URUT[urut];
  const lawan = (a, b) => { const x = nilai(a, versi, cek), y = nilai(b, versi, cek); return typeof x === "string" ? x.localeCompare(y) : x - y; };
  const dasar = (a, b) => zonaVersi(a, versi, cek).localeCompare(zonaVersi(b, versi, cek)) || (b.terbakar_n_2km ?? -1) - (a.terbakar_n_2km ?? -1) || a.id.localeCompare(b.id);
  const s = [...daftar].sort(nilai ? (a, b) => (turun ? -1 : 1) * lawan(a, b) || dasar(a, b) : dasar);
  return s;
}
export function potong(daftar, hal, per = PER_HALAMAN) {
  const akhir = Math.max(0, Math.ceil(daftar.length / per) - 1), h = Math.min(Math.max(0, hal), akhir);
  return daftar.slice(h * per, (h + 1) * per);
}

/* ---------- rincian, pop-up, saran ---------- */
export const tautanHitung = id => typeof id === "string" && RE_KOMPLEKS.test(id) ? `/pipa/hitung?kompleks=${id}` : null;
const SUMBER_RINCIAN = "OSM (ODbL) via Overpass, Copernicus GLO-30 (DSM), JRC GSW, MODIS MCD64A1, CHIRPS, VIIRS S-NPP, akses.json";
const baris = (label, isi) => `<div class="sp-dl-baris"><dt>${label}</dt><dd>${isi}</dd></div>`;

export function rincianKompleks(k, cek, versi, meta = {}) {
  const zk = k.zona_k, zo = k.zona_o, zv = zonaVersi(k, "v", cek);
  const jalan = [k.jalan_km_lama == null ? "konservatif: tanpa jalan kendaraan" : `konservatif ${km(k.jalan_km_lama)} km`,
    `jalan utama ${k.terpotong?.jalan_utama ? "16 km atau lebih" : `${km(k.jalan_km_utama)} km`}`, `semua ${k.terpotong?.jalan_semua ? "16 km atau lebih" : `${km(k.jalan_km_semua)} km`}`, `setapak ${km(k.jalan_km_setapak)} km`];
  const per = meta.per ? `, data per ${tanggal(Date.parse(meta.per))}` : "";
  return `<div class="sp-rincian"><h3 class="sp-rincian-judul" tabindex="-1">Rincian kompleks ${esc(k.id)}</h3>
    <div class="sp-pil-baris">${pilZona(zk, "konservatif")}${pilZona(zo, "optimistis")}${pilZona(zv, "terverifikasi")}</div>
    <dl class="sp-dl">
      ${baris("Kabupaten", esc(k.kab ?? "–"))}
      ${baris("Gambut", k.gambut ? "ya" : "tidak")}
      ${baris("Jarak air", `kendala.json ${esc(km(k.air_km_lama))} km; semua OSM ${esc(km(k.air_km_semua))} km; saluran kecil ${esc(km(k.air_km_kecil))} km${k.air_jenis ? ` (${esc(k.air_jenis)})` : ""}`)}
      ${baris("Jarak jalan", jalan.map(esc).join("; "))}
      ${baris("Beda elevasi air", `${esc(fmt(k.beda_air_m))} m terhadap kompleks ${pil("DSM berkanopi", "asumsi-kebijakan", "Beda elevasi dari DSM Copernicus GLO-30 yang menyertakan kanopi; ukur ulang dengan DEMNAS atau GNSS")}`)}
      ${baris("Air permukaan (GSW)", esc(NAMA_GSW[k.gsw] ?? k.gsw ?? "–"))}
      ${baris("Terbakar (MCD64A1)", `${esc(fmt(k.terbakar_n_2km))} tahun dalam 2 km; ${esc(fmt(k.terbakar_n_5km))} tahun dalam 5 km${k.terbakar_akhir ? `; terakhir ${esc(k.terbakar_akhir)}` : ""}`)}
      ${baris("Kekerapan sel (VIIRS)", `${esc(fmt(k.kekerapan_sel22))} dari 14 tahun aktif (sel 2,2 km)`)}
      ${baris("Curah hujan (CHIRPS)", `anomali Jul–Okt tahun terakhir ${esc(fmt(k.chirps_anom_akhir_pct))}%`)}
      ${baris("Status lahan", `${esc(NAMA_LAHAN[k.kaw] ?? k.kaw ?? "–")}; KHG ${k.khg ? esc(k.khg) : "belum dipetakan"}`)}
      ${baris("Waktu tempuh", k.jam_tiba == null ? "belum dihitung" : `${esc(fmt(k.jam_tiba))} jam ${pil("Estimasi model", "estimasi-model", "Waktu tempuh dari akses.json, model akses; bukan uji lapangan")}`)}
    </dl>
    <p class="ad-catat">Sumber: ${esc(SUMBER_RINCIAN)}${esc(per)}. Jarak garis lurus, dibatasi 16 km.</p></div>`;
}

export function saranHtml(k, versi, apiAktif, cek) {
  const s = saranSarana(k, versi, apiAktif, cek), t = tautanHitung(k.id);
  return `<div class="sp-saran"><h3 class="sp-saran-judul">Saran sarana</h3>
    <p class="sp-saran-isi">${esc(s.sarana)}</p>
    <ul class="sp-daftar">${s.alasan.map(a => `<li>${esc(a)}</li>`).join("")}</ul>
    <div class="sp-pil-baris">${pil(`Aturan ${s.aturan} dari 6`, "asumsi-kebijakan", "Urutan aturan PRD §9.4.2, berhenti di aturan pertama yang cocok")}${pil("Asumsi kebijakan", "asumsi-kebijakan", "Saran mengikuti doktrin zona; bukan perintah gelar")}${s.heli ? pil("Heli: ya", "asumsi-kebijakan", "Tahan front dari udara bila waktu tempuh lebih dari 6 jam dan ada titik panas") : ""}</div>
    <label class="sp-sakelar"><input type="checkbox" role="switch" data-api${apiAktif ? " checked" : ""}> Ada titik panas 24 jam di kompleks ini</label>
    <p class="ad-catat">Titik panas 24 jam tidak dibaca otomatis di layar ini; centang bila ada, untuk aturan 1 (tahan front dari udara).</p>
    ${t ? `<a class="ad-tombol utama sp-ke-hitung" href="${esc(t)}" data-aksi="hitung">Hitung hidraulika untuk kompleks ini</a>
    <p class="ad-catat">Panjang trase diisi jarak air x 1,2 (faktor liku, asumsi kebijakan), beda elevasi dari DSM; keduanya bisa diubah di layar Hitung.</p>` : ""}</div>`;
}

export function popupKompleks(k, versi, cek) {
  const j = jarakVersi(k, versi, cek), s = saranSarana(k, versi, false, cek[k.id]), t = tautanHitung(k.id);
  return `<div class="sp-pop"><div class="sp-pop-kepala"><b tabindex="-1">${esc(k.id)}</b><span>${esc(k.kab ?? "–")}</span></div>
    <div class="sp-pil-baris">${pilZona(k.zona_k, "konservatif")}${pilZona(k.zona_o, "optimistis")}${pilZona(zonaVersi(k, "v", cek), "terverifikasi")}</div>
    <dl class="sp-dl sp-dl-kecil">${baris("Air", `${esc(km(j.air))} km`)}${baris("Jalan", j.jalan == null ? "tanpa jalan kendaraan" : `${esc(km(j.jalan))} km`)}${baris("Beda elevasi", `${esc(fmt(k.beda_air_m))} m ${pil("DSM berkanopi")}`)}${baris("Terbakar", `${esc(fmt(k.terbakar_n_2km))} tahun`)}</dl>
    <p class="sp-pop-saran">${esc(s.sarana)}</p>
    <div class="sp-pop-aksi"><button type="button" class="ad-tombol" data-aksi="rincian" data-id="${esc(k.id)}">Rincian di panel</button>${t ? `<a class="ad-tombol" href="${esc(t)}" data-aksi="hitung">Hitung hidraulika</a>` : ""}</div></div>`;
}
export function popupSel(p) {
  return `<div class="sp-pop"><div class="sp-pop-kepala"><b tabindex="-1">Sel ${esc(p.sel)}</b><span>kisi 2,2 km</span></div>
    <dl class="sp-dl sp-dl-kecil">${baris("Tahun aktif", `${esc(fmt(p.th))} dari 14 (VIIRS S-NPP 2012–2025)`)}${baris("Hari api", esc(fmt(p.hari)))}${baris("Zona terdekat", p.zona ? `${polaSvg(p.zona)}${esc(p.zona)} konservatif, kompleks ${esc(p.kompleks)}` : "tidak ada kompleks dalam 5 km")}</dl>
    <div class="sp-pop-aksi"><button type="button" class="ad-tombol" data-aksi="aoi-sel" data-sel="${esc(p.sel)}">Usulkan sebagai calon AOI</button></div></div>`;
}

/* ---------- legenda ---------- */
export function legendaHtml(jumlah, {per, sumber, versi, kini = Date.now()}) {
  const baris = ZONA.map(z => `<li>${polaSvg(z)}<b>${z}</b><span>${esc(ZONA_META[z].arti)}</span><span class="n">${esc(fmt(jumlah[z]))}</span></li>`).join("");
  const ramp = ["1–2", "3–4", "5–6", "7–9", "10–14"].map((t, i) => `<li><i class="sp-ramp sp-ramp-${i + 1}"></i>${t}</li>`).join("");
  const lama = basiPeta(per, kini) ? ` ${pil(`basi, per ${tanggal(Date.parse(per))}`, "asumsi-kebijakan", "Data lebih tua dari 400 hari")}` : "";
  return `<b class="sp-leg-judul">Zona kelayakan, versi ${esc(NAMA_VERSI[versi] ?? versi)}</b>
    <ul class="sp-leg-zona">${baris}</ul>
    <b class="sp-leg-judul">Tahun terbakar (MCD64A1, 2 km)</b>
    <ul class="sp-leg-ukuran"><li><i class="sp-u sp-u4"></i>0–2</li><li><i class="sp-u sp-u6"></i>3–5</li><li><i class="sp-u sp-u8"></i>6 atau lebih</li></ul>
    <div class="sp-leg-sel"><b class="sp-leg-judul">Sel 2,2 km, tahun aktif VIIRS</b>
    <ul class="sp-leg-ramp">${ramp}</ul></div>
    <p class="sp-leg-sumber">Sumber: ${esc(sumber)}, data per ${esc(per ? tanggal(Date.parse(per)) : "–")}${lama}</p>`;
}

/* ---------- daftar kompleks (alternatif aksesibel peta) ---------- */
const KOLOM_DAFTAR = [["zona", "Zona", true], ["id", "Kompleks", true], ["kab", "Kabupaten", true], ["air", "Air (km)", true], ["jalan", "Jalan (km)", true], ["terbakar", "Terbakar (tahun)", false], ["gsw", "GSW", false]];
export function tabelDaftarHtml(rows, versi, cek, st = {}) {
  if (!rows.length) return `<p class="ad-kosong">Tidak ada kompleks yang cocok dengan saringan.</p>`;
  const aktif = st.urut || "zona", arah = st.turun ? "descending" : "ascending";
  const kepala = KOLOM_DAFTAR.map(([k, n]) => `<th scope="col"${aktif === k ? ` aria-sort="${arah}"` : ""}${["air", "jalan", "terbakar"].includes(k) ? ' class="n"' : ""}><button type="button" data-k="${k}" aria-label="Urutkan menurut ${esc(n)}">${esc(n)}<i>${aktif === k ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("");
  const isi = rows.map(k => {
    const j = jarakVersi(k, versi, cek), z = zonaVersi(k, versi, cek), td = (l, v, hp, n) => `<td${n ? ' class="n"' : ""} data-label="${l}"${hp ? " data-hp" : ""}>${v}</td>`;
    return `<tr class="sp-klik">${td("Zona", `<span class="sp-yakin zona-pil z-${z}">${polaSvg(z)}${z}</span>`, true)}${td("Kompleks", `<button type="button" class="sp-baris-id" data-id="${esc(k.id)}">${esc(k.id)}</button>`, true)}${td("Kabupaten", esc(k.kab ?? "–"), true)}${td("Air (km)", esc(km(j.air)), true, true)}${td("Jalan (km)", j.jalan == null ? "tanpa jalan" : esc(km(j.jalan)), true, true)}${td("Terbakar (tahun)", esc(fmt(k.terbakar_n_2km)), false, true)}${td("GSW", esc(NAMA_GSW[k.gsw] ?? k.gsw ?? "–"), false)}</tr>`;
  }).join("");
  return `<div class="ad-tabel-wadah sp-daftar-peta"><table class="ad-tabel"><caption class="sr">Daftar kompleks menurut zona ${esc(NAMA_VERSI[versi] ?? versi)}</caption><thead><tr>${kepala}</tr></thead><tbody>${isi}</tbody></table></div>`;
}

/* ---------- formulir: cek jalan dan usul AOI (DT §4.3) ---------- */
export function badanCek(f, id, prov) {
  const g = [], badan = {kompleks_id: id, prov};
  if (!RE_KOMPLEKS.test(id || "")) g.push({medan: "kompleks_id", pesan: "Kompleks tidak dikenal."});
  if (f.musim !== "kemarau" && f.musim !== "hujan") g.push({medan: "musim", pesan: "Pilih musim kemarau atau hujan."}); else badan.musim = f.musim;
  if (f.hasil !== "lolos" && f.hasil !== "gagal") g.push({medan: "hasil", pesan: "Pilih hasil lolos atau gagal."}); else badan.hasil = f.hasil;
  if (f.kendaraan) { if (!(f.kendaraan in KENDARAAN)) g.push({medan: "kendaraan", pesan: "Kendaraan tidak dikenal."}); else badan.kendaraan = f.kendaraan; }
  const c = String(f.catatan ?? "").trim();
  if ([...c].length > 500) g.push({medan: "catatan", pesan: `Catatan ${fmt([...c].length)} huruf; paling banyak 500.`}); else if (c) badan.catatan = c;
  return g.length ? {badan: null, galat: g} : {badan, galat: []};
}
export function badanAoi(id, prov, alasan) {
  const g = [], a = String(alasan ?? "").trim(), n = [...a].length, badan = {prov};
  if (RE_KOMPLEKS.test(id || "")) badan.kompleks_id = id; else if (RE_SEL.test(id || "")) badan.sel = id; else g.push({medan: "kompleks_id", pesan: "Kompleks atau sel tidak dikenal."});
  if (n < 5 || n > 500) g.push({medan: "alasan", pesan: `Alasan 5 sampai 500 huruf (sekarang ${fmt(n)}).`}); else badan.alasan = a;
  return g.length ? {badan: null, galat: g} : {badan, galat: []};
}

/* ---------- kerangka HTML layar ---------- */
const LAYERS = `<svg class="sp-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`;
const DAFTAR = `<svg class="sp-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>`;
const CARI = `<svg class="sp-ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
const TEKS_GSW = {permanen: "GSW permanen", musiman: "GSW musiman", tak_terdeteksi: "GSW tidak terdeteksi"};

export function kerangkaPeta({kabupaten = [], hitung = {}} = {}) {
  const chipZona = ZONA.map(z => `<button type="button" class="ad-chip sp-chip-zona z-${z}" aria-pressed="true" data-zona="${z}" title="Zona ${z}: ${esc(ZONA_META[z].arti)}">${polaSvg(z)}<span>${z}</span><b>${esc(fmt(hitung[z]))}</b></button>`).join("");
  const chipGsw = Object.keys(TEKS_GSW).map(g => `<button type="button" class="ad-chip" aria-pressed="true" data-gsw="${g}">${esc(TEKS_GSW[g])}</button>`).join("");
  return `<p class="ad-spanduk sp-laptop" role="note">Layar ini dirancang untuk laptop.</p>
  <div class="sp-peta-utama">
    <div class="sp-peta-bilah" role="group" aria-label="Kontrol peta">
      <div class="ad-seg sp-seg-satuan" role="radiogroup" aria-label="Satuan peta"><button type="button" role="radio" aria-checked="true" data-satuan="kompleks" tabindex="0">Per kompleks</button><button type="button" role="radio" aria-checked="false" data-satuan="sel" tabindex="-1">Per sel 2,2 km</button></div>
      <button type="button" class="ad-tombol sp-saring-tombol" data-aksi="saring" aria-expanded="false" aria-controls="sp-saring">${ikon("sliders-horizontal")}Saring</button>
      <div class="sp-saring" id="sp-saring">
        <div class="sp-chips" role="group" aria-label="Zona yang ditampilkan">${chipZona}</div>
        <div class="sp-chips" role="group" aria-label="Saringan lain"><button type="button" class="ad-chip" aria-pressed="false" data-saring="bakar3">Terbakar 3 tahun atau lebih</button>${chipGsw}</div>
        <div class="sp-saring-isian"><select aria-label="Kabupaten" data-saring="kab"><option value="">Semua kabupaten</option>${kabupaten.map(k => `<option value="${esc(k)}">${esc(k)}</option>`).join("")}</select>
          <label class="sp-cari">${CARI}<input type="search" aria-label="Cari kompleks" placeholder="Cari id atau kabupaten" autocomplete="off" data-saring="cari"></label></div>
      </div>
      <div class="sp-peta-aksi"><button type="button" class="ad-tombol" data-aksi="daftar">${DAFTAR}Daftar</button>
        <button type="button" class="ad-tombol sp-ikon-tombol" data-aksi="lapisan" aria-label="Lapisan peta" aria-expanded="false" aria-controls="sp-lapisan">${LAYERS}</button></div>
      <div class="sp-lapisan-menu" id="sp-lapisan" hidden>
        <label class="sp-sakelar"><input type="checkbox" role="switch" data-lapisan="huruf" checked> Huruf zona di peta (zoom 10 ke atas)</label>
        <label class="sp-sakelar"><input type="checkbox" role="switch" data-lapisan="titik"> Titik kompleks di atas sel</label>
      </div>
    </div>
    <div class="sp-peta-bidang">
      <div id="sp-peta-kanvas" class="sp-peta-kanvas" role="region" aria-label="Peta kelayakan kit"></div>
      <div class="sp-muat" role="status">Memuat peta kelayakan</div>
      <div class="ad-spanduk sp-peta-pita" role="status" hidden></div>
      <div class="sp-peta-leg" data-satuan="kompleks"><button type="button" class="sp-leg-tombol" data-aksi="legenda" aria-expanded="false" aria-controls="sp-leg-badan">Legenda</button><div class="sp-leg-badan" id="sp-leg-badan"></div></div>
    </div>
  </div>
  <aside class="sp-peta-panel sp-lembar" data-tinggi="intip" aria-label="Ringkasan zona dan rincian kompleks">
    <button type="button" class="sp-lembar-pegangan" data-aksi="lembar" aria-label="Ubah tinggi panel: intip" aria-expanded="false"><span></span><b class="sp-intip"></b></button>
    <div class="sp-panel-judul"></div><div class="sp-panel-ringkas"></div><div class="sp-panel-rincian" aria-live="polite"></div>
  </aside>`;
}

/* =====================================================================================================
   Perakit: MapLibre dan DOM. Tidak dijalankan uji Node; dibuktikan di peramban preview.
   ===================================================================================================== */
const sebagaiGelap = () => document.documentElement.dataset.theme === "dark";
const DASAR = () => sebagaiGelap() ? "https://tiles.openfreemap.org/styles/dark" : "https://tiles.openfreemap.org/styles/positron";
const GLYPH = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

let ctrl = null, peta = null, hentikan = [];
export function lepas() {
  ctrl?.abort(); ctrl = null;
  hentikan.forEach(f => { try { f(); } catch { /* pembersih boleh gagal */ } }); hentikan = [];
  try { peta?.remove(); } catch { /* peta sudah dilepas */ }
  peta = null; tutupDialog();
}

/* gaya dan pustaka dimuat sekali; layar menunggu gaya agar tidak berkedip polos */
const GAYA_DASAR = ["/inti/tema.css", "/inti/kartu.css", "/inti/insight.css"];   // DS §1.3: token dan kartu Insight; cangkang yang belum memuatnya dilengkapi di sini, di depan pipa.css
function muatGaya() {
  const pasangLink = (href, kunci, sebelum) => new Promise(ok => {
    if (document.querySelector(`link[data-sp="${kunci}"]`)) return ok();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; l.dataset.sp = kunci;
    l.onload = l.onerror = () => ok(); sebelum ? sebelum.before(l) : document.head.append(l); setTimeout(ok, 1500);
  });
  const dasar = getComputedStyle(document.documentElement).getPropertyValue("--ok").trim() ? [] : GAYA_DASAR.map(h => pasangLink(h, h.slice(6), document.querySelector('link[href*="/pipa/pipa.css"]')));
  return Promise.all([...dasar, pasangLink("/pipa/layar_peta.css?v=2", "peta")]);
}
let pustaka = null;
function muatMapLibre() {
  if (globalThis.maplibregl) return Promise.resolve();
  return pustaka ??= new Promise((ok, gagal) => {
    const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "/vendor/maplibre/maplibre-gl.css"; document.head.append(c);
    const s = document.createElement("script"); s.src = "/vendor/maplibre/maplibre-gl.js"; s.onload = ok; s.onerror = () => gagal(new Error("Pustaka peta tidak bisa dimuat.")); document.head.append(s);
  }).catch(e => { pustaka = null; throw e; });
}

/* berkas data turunan sebesar 1,6 MB dipakai ulang antar kunjungan layar dalam satu sesi */
const simpanan = new Map();
function ambilSekali(konteks, url, sinyal) {
  if (!simpanan.has(url)) simpanan.set(url, konteks.ambil(url).catch(e => { simpanan.delete(url); throw e; }));
  return simpanan.get(url).then(v => { if (sinyal?.aborted) throw new DOMException("batal", "AbortError"); return v; });
}
const bungkus = f => Promise.resolve().then(f).then(ok => ({ok}), e => e?.name === "AbortError" ? {batal: true} : {galat: e});

/* gambar penanda zona: warna + pola + garis luar --card + cincin dalam gelap (DS §3.6); dipasang sekali per gaya peta */
function gambarZona(z, gelap) {
  const S = 32, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d"), warna = ZONA_META[z].warna, tepi = gelap ? "#131c30" : "#ffffff", dalam = campur(warna, "#000000", 0.6);
  const lingkar = r => { g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); };
  lingkar(15); g.fillStyle = tepi; g.fill();
  lingkar(12.5); g.fillStyle = z === "B" || z === "C" ? tepi : warna; g.fill();
  if (z === "B") { lingkar(9.5); g.lineWidth = 6; g.strokeStyle = warna; g.stroke(); }
  if (z === "C") { g.beginPath(); g.arc(S / 2, S / 2, 12.5, Math.PI / 2, Math.PI * 1.5); g.closePath(); g.fillStyle = warna; g.fill(); }
  if (z === "D") { g.strokeStyle = tepi; g.lineWidth = 3.4; g.lineCap = "round"; g.beginPath(); g.moveTo(10, 10); g.lineTo(22, 22); g.moveTo(22, 10); g.lineTo(10, 22); g.stroke(); }
  lingkar(12.5); g.lineWidth = 1.6; g.strokeStyle = dalam; g.stroke();
  return g.getImageData(0, 0, S, S);
}

const tinggiLembar = ["intip", "setengah", "penuh"];
const TEKS_TINGGI = {intip: "intip", setengah: "setengah", penuh: "penuh"};

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, prov = konteks.prov, versi = KUNCI_ZONA[konteks.zona] ? konteks.zona : "k", kini = Date.now();
  const namaProv = (typeof Wilayah !== "undefined" && Wilayah.PROV?.[prov]) || `provinsi ${prov}`;
  const peran = peranKlien(document.body?.dataset), tulis = bolehTulis(peran);
  const ponsel = () => matchMedia("(max-width: 767px)").matches;
  await muatGaya();
  if (sinyal.aborted) return;

  akar.innerHTML = `<div class="sp-judul-baris"><h1 class="sp-judul">Peta kelayakan</h1></div><div class="sp-peta" data-peta></div>`;
  const wadah = akar.querySelector("[data-peta]");
  wadah.replaceChildren(memuat());

  const [rk, rz, rc] = await Promise.all([bungkus(() => ambilSekali(konteks, JALUR.kompleks, sinyal)), bungkus(() => ambilSekali(konteks, JALUR.zona, sinyal)), bungkus(() => konteks.ambil(JALUR.cek, sinyal))]);
  if (sinyal.aborted || rk.batal) return;
  if (rk.galat) {
    const e = rk.galat;
    wadah.replaceChildren(e.status === 404 ? Object.assign(kosong("Data kelayakan belum diunggah pipeline (data.yml)."), {className: "ad-kosong ad-peta-kosong"}) : kotakGalat(e.status ?? 0, e.status == null ? "Peta tidak bisa ditampilkan. Coba lagi." : e.message || undefined, () => pasang(akar, konteks)));
    return;
  }
  const dataK = rk.ok, semua = (dataK.kompleks || []).filter(k => k.prov === prov);
  if (!semua.length) { wadah.replaceChildren(Object.assign(kosong("Belum ada data kelayakan untuk provinsi ini. Pilih provinsi lain atau tunggu pipeline."), {className: "ad-kosong ad-peta-kosong"})); return; }
  const dataZ = rz.ok || null;
  let cek = cekTerbaru(rc.ok?.cek || []);
  konteks.setPer?.(dataK.per ? Date.parse(dataK.per) : null);

  /* ---------- keadaan layar ---------- */
  const st = {satuan: "kompleks", zona: new Set(ZONA), bakar3: false, gsw: new Set(Object.keys(NAMA_GSW)), kab: "", cari: "", versi, pilih: null, api: false};
  const kabupaten = [...new Set(semua.map(k => k.kab).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const peKomp = Object.fromEntries(semua.map(k => [k.id, k]));
  let geoK = geoKompleks(semua, cek), geoS = null, selMuat = false, popup = null, ids = semua.map(k => k.id), gagalDasar = false;

  wadah.innerHTML = kerangkaPeta({kabupaten, hitung: hitungPerZona(semua, versi, cek)});
  const q = s => wadah.querySelector(s), semuaQ = s => [...wadah.querySelectorAll(s)];
  const pita = q(".sp-peta-pita"), muatEl = q(".sp-muat");
  if (!rc.ok) { pita.hidden = false; pita.textContent = "Cek jalan tidak bisa dimuat; Terverifikasi sama dengan Konservatif sementara."; }
  try { if (typeof PilihCantik !== "undefined") { PilihCantik.hias(q('select[data-saring="kab"]')); PilihCantik.pasang(); } } catch { /* pemilih biasa tetap jalan */ }

  /* ---------- panel: kartu judul, ringkasan, rincian ---------- */
  const namaTampil = namaProv;
  function gambarPanel() {
    const j = dataZ ? judulPeta(dataZ, prov, namaTampil) : null, sumber = "OpenStreetMap (ODbL) via Overpass 24–25 Okt 2026, jarak garis lurus; kompleks api kendala.json";
    const per = dataZ?.per ? `, data per ${tanggal(Date.parse(dataZ.per))}` : "";
    q(".sp-intip").textContent = j ? j.teks : "Ringkasan zona";
    q(".sp-panel-judul").innerHTML = j
      ? Kartu.kartu("Zona", `${hl(j.k)} dari ${hl(j.n)} kompleks ${esc(namaTampil)} di zona A (versi kendala.json); ${hl(j.o)} bila semua jalan OSM termasuk track dihitung`,
        `<div class="sp-pil-baris">${pil("Terverifikasi", "terverifikasi", "Jarak dihitung dari data OSM yang ditarik")}${pil("Batas atas OSM", "asumsi-kebijakan", "Versi semua jalan OSM memuat jalan track yang belum tentu dapat dilalui pickup pada musim hujan")}</div>`, esc(sumber + per))
      : `<p class="ad-kosong">Ringkasan zona belum tersedia (zona.json belum diunggah). Peta tetap memakai kelayakan_kompleks.json.</p>`;
    q(".sp-panel-ringkas").innerHTML = ringkasanHtml(dataZ ? ringkasanZona(dataZ, prov, semua, cek) : null, st.versi);
  }
  function gambarLegenda() {
    const jumlah = st.versi === "v" ? hitungPerZona(semua, "v", cek) : (() => { const b = dataZ && barisZona(dataZ, prov, st.versi); return b || hitungPerZona(semua, st.versi, cek); })();
    q("#sp-leg-badan").innerHTML = legendaHtml(jumlah, {per: dataK.per, sumber: "OSM (ODbL) via Overpass, Copernicus GLO-30, JRC GSW, MODIS MCD64A1, VIIRS S-NPP", versi: st.versi});
  }
  function gambarRincian() {
    const wad = q(".sp-panel-rincian"), k = st.pilih && peKomp[st.pilih];
    if (!k) { wad.innerHTML = `<p class="ad-kosong">Pilih kompleks di peta atau di Daftar untuk melihat rincian dan saran sarana.</p>`; return; }
    const c = cek[k.id];
    q(".sp-peta-panel").dataset.pilih = "1";   // di ponsel rincian naik ke atas lembar
    wad.innerHTML =`${rincianKompleks(k, cek, st.versi, {per: dataK.per})}${saranHtml(k, st.versi, st.api, c)}
      <div class="sp-aksi-panel"><button type="button" class="ad-tombol" data-aksi="cek" ${tulis ? "" : 'disabled title="Perlu peran tulis"'}>Catat cek jalan</button><button type="button" class="ad-tombol" data-aksi="aoi" ${tulis ? "" : 'disabled title="Perlu peran tulis"'}>Usulkan sebagai calon AOI</button></div>${tulis ? "" : `<p class="ad-catat">Mencatat cek jalan dan mengusulkan AOI butuh peran tulis.</p>`}
      ${c ? `<p class="ad-catat">Cek jalan musim hujan terakhir: ${esc(c.hasil)} (${esc(jamWIB(c.waktu))}).</p>` : ""}`;
  }
  gambarPanel(); gambarLegenda(); gambarRincian();

  /* ---------- peta ---------- */
  const terapkanSaringan = () => {
    ids = saringKompleks(semua, st, cek);
    if (peta?.getLayer("kompleks-pola")) for (const id of LAPISAN_KOMPLEKS) peta.setFilter(id, filterPeta(ids));
    const hz = hitungPerZona(semua, st.versi, cek);
    semuaQ("[data-zona] b").forEach(b => { b.textContent = fmt(hz[b.closest("[data-zona]").dataset.zona]); });
  };
  const terapkanSatuan = () => {
    if (!peta?.getLayer("kompleks-pola")) return;
    const s = satuanLapisan(st.satuan), titik = q('[data-lapisan="titik"]').checked, huruf = q('[data-lapisan="huruf"]').checked;
    for (const [id, v] of s.kompleks) peta.setLayoutProperty(id, "visibility", id === "kompleks-huruf" && !huruf ? "none" : titik && st.satuan === "sel" ? "visible" : v);
    if (peta.getLayer("sel-isi")) for (const [id, v] of s.sel) peta.setLayoutProperty(id, "visibility", v);
    muatEl.hidden = !(st.satuan === "sel" && !peta.getLayer("sel-isi"));
    if (!muatEl.hidden) { muatEl.classList.add("kecil"); muatEl.textContent = "Memuat sel 2,2 km"; }
  };
  function tambahSel() {
    if (!geoS || !peta || peta.getSource("sel")) return;
    peta.addSource("sel", {type: "geojson", data: geoS});
    for (const l of lapisanSel(rampSel(sebagaiGelap()))) peta.addLayer(l, "kompleks-pola");
    terapkanSatuan();
  }
  function pasangLapisan() {
    for (const z of ZONA) if (!peta.hasImage(`zona-${z}`)) peta.addImage(`zona-${z}`, gambarZona(z, sebagaiGelap()), {pixelRatio: 2});
    if (!peta.getSource("kompleks")) {
      peta.addSource("kompleks", {type: "geojson", data: geoK, promoteId: "id"});
      for (const l of lapisanKompleks(KUNCI_ZONA[st.versi])) peta.addLayer(l);
    }
    tambahSel(); terapkanSatuan(); terapkanSaringan();
    if (st.pilih) peta.setFeatureState({source: "kompleks", id: st.pilih}, {dipilih: true});
    muatEl.hidden = true;
  }
  const bacaSel = () => ambilSekali(konteks, JALUR.sel, sinyal).then(d => { if (sinyal.aborted) return; geoS = geoSel(d); selMuat = true; if (peta?.isStyleLoaded()) tambahSel(); }, e => { if (e?.name === "AbortError" || sinyal.aborted) return; selMuat = false; pita.hidden = false; pita.textContent = e.status === 404 ? "Data sel 2,2 km belum diunggah pipeline (data.yml)." : "Sel 2,2 km tidak bisa dimuat."; });

  function pilih(id, {terbang = false, buka = true} = {}) {
    const k = peKomp[id]; if (!k) return;
    if (peta?.getSource("kompleks")) { if (st.pilih) peta.setFeatureState({source: "kompleks", id: st.pilih}, {dipilih: false}); peta.setFeatureState({source: "kompleks", id}, {dipilih: true}); }   // sorot seketika
    st.pilih = id; st.api = false;
    if (terbang && peta) peta.easeTo({center: [k.lon, k.lat], zoom: Math.max(peta.getZoom(), 11), duration: 400});
    nanti(() => {
      if (sinyal.aborted) return;
      gambarRincian();
      if (ponsel()) { if (buka) aturLembar("setengah"); }
      else if (peta) {
        popup?.remove();
        popup = new maplibregl.Popup({closeButton: true, maxWidth: "340px", className: "sp-pop-wadah", offset: 12}).setLngLat([k.lon, k.lat]).setHTML(popupKompleks(k, st.versi, cek)).addTo(peta);
        popup.getElement().querySelector(".sp-pop-kepala b")?.focus({preventScroll: true});
      }
    });
  }
  function aturLembar(t) {
    const l = q(".sp-lembar"), b = q('[data-aksi="lembar"]');
    l.dataset.tinggi = t; l.scrollTop = 0; b.setAttribute("aria-label", `Ubah tinggi panel: ${TEKS_TINGGI[t]}`); b.setAttribute("aria-expanded", String(t !== "intip"));
  }

  try {
    await muatMapLibre();
    if (sinyal.aborted) return;
    const titik = new maplibregl.LngLatBounds(); semua.forEach(k => titik.extend([k.lon, k.lat]));
    peta = new maplibregl.Map({container: "sp-peta-kanvas", style: DASAR(), bounds: titik, fitBoundsOptions: {padding: 32, animate: false}, minZoom: 3, maxZoom: 15, attributionControl: {compact: true}, dragRotate: false});
    peta.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right");
    peta.addControl(new maplibregl.ScaleControl({unit: "metric"}), "bottom-left");
    const ukur = new ResizeObserver(() => peta?.resize());   // wadah berubah tinggi (lembar, saringan, orientasi): kanvas mengikuti
    ukur.observe(q("#sp-peta-kanvas")); hentikan.push(() => ukur.disconnect());
    peta.on("style.load", pasangLapisan);
    peta.on("error", e => {
      if (e.sourceId === "kompleks" || e.sourceId === "sel") return;
      if (!peta.isStyleLoaded() && !gagalDasar) {   // gaya peta dasar gagal: lapisan kita tetap digambar di atas latar polos
        gagalDasar = true; pita.hidden = false; pita.textContent = "Peta dasar gagal dimuat. Lapisan kelayakan tetap ditampilkan.";
        setTimeout(() => { if (peta) peta.setStyle({version: 8, glyphs: GLYPH, sources: {}, layers: [{id: "latar", type: "background", paint: {"background-color": sebagaiGelap() ? "#1a2540" : "#edf2f8"}}]}, {diff: false}); }, 0);
      } else if (e.sourceId && !gagalDasar) { gagalDasar = true; pita.hidden = false; pita.textContent = "Sebagian peta dasar gagal dimuat."; }
    });
    peta.on("click", "kompleks-sorot", e => { const f = e.features?.[0]; if (f) pilih(f.properties.id); });
    peta.on("click", "sel-isi", e => {
      if (peta.queryRenderedFeatures(e.point, {layers: ["kompleks-sorot"]}).length) return;
      const p = e.features?.[0]?.properties; if (!p) return;
      popup?.remove();
      popup = new maplibregl.Popup({closeButton: true, maxWidth: "340px", className: "sp-pop-wadah", offset: 6}).setLngLat(e.lngLat).setHTML(popupSel(p)).addTo(peta);
      popup.getElement().querySelector(".sp-pop-kepala b")?.focus({preventScroll: true});
    });
    for (const id of ["kompleks-sorot", "sel-isi"]) { peta.on("mouseenter", id, () => { peta.getCanvas().style.cursor = "pointer"; }); peta.on("mouseleave", id, () => { peta.getCanvas().style.cursor = ""; }); }
    /* tema: ganti gaya dasar, lalu style.load memasang ulang gambar, sumber, dan lapisan */
    const amati = new MutationObserver(() => { if (peta && !gagalDasar) { popup?.remove(); peta.setStyle(DASAR(), {diff: false}); } });
    amati.observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]}); hentikan.push(() => amati.disconnect());
    peta.once("load", () => (globalThis.requestIdleCallback || (f => setTimeout(f, 400)))(() => nanti(bacaSel)));
  } catch (e) {
    muatEl.hidden = true; pita.hidden = false; pita.textContent = "Peta tidak bisa dimuat. Daftar kompleks tetap bisa dipakai."; if (e?.name !== "AbortError") console.error(e);
  }

  /* ---------- daftar kompleks (dialog) ---------- */
  function bukaDaftar() {
    const s = {urut: null, turun: false, hal: 0}, isi = document.createElement("div"), kepala = document.createElement("p");
    kepala.className = "ad-catat"; isi.append(kepala);
    const tubuh = document.createElement("div"), nav = document.createElement("div"); isi.append(tubuh, nav);
    const gambar = () => {
      const ada = new Set(ids), urut = urutDaftar(semua.filter(k => ada.has(k.id)), st.versi, cek, s.urut, s.turun), hal = potong(urut, s.hal);
      kepala.textContent = `${fmt(urut.length)} dari ${fmt(semua.length)} kompleks menurut saringan peta, zona versi ${NAMA_VERSI[st.versi]}.`;
      tubuh.innerHTML = tabelDaftarHtml(hal, st.versi, cek, s); nav.innerHTML = urut.length ? paginasi(s.hal, urut.length, PER_HALAMAN, "kompleks") : "";
    };
    gambar();
    const d = bukaDialog("Daftar kompleks", isi); d.classList.add("sp-dialog-daftar");
    d.addEventListener("click", e => {
      const u = e.target.closest("th button[data-k]"), h = e.target.closest(".pgn-b"), b = e.target.closest(".sp-baris-id");
      if (u) { const k = u.dataset.k; s.turun = s.urut === k ? !s.turun : false; s.urut = k; s.hal = 0; u.closest("tr").querySelectorAll("th").forEach(t => { const on = t.contains(u); on ? t.setAttribute("aria-sort", s.turun ? "descending" : "ascending") : t.removeAttribute("aria-sort"); t.querySelector("i").textContent = on ? (s.turun ? "↓" : "↑") : ""; }); nanti(gambar); }
      else if (h && !h.disabled) { s.hal = Number(h.dataset.h); h.setAttribute("aria-current", "page"); nanti(gambar); }
      else if (b) { d.close(); pilih(b.dataset.id, {terbang: true}); }
    });
  }

  /* ---------- formulir cek jalan dan usul AOI ---------- */
  const formDialog = (judul, badanHtml, kirim) => {
    const f = document.createElement("form"); f.className = "sp-form"; f.noValidate = true; f.innerHTML = `${badanHtml}<div class="sp-form-galat" role="alert"></div><div class="sp-form-aksi"><button type="submit" class="ad-tombol utama">Simpan</button><button type="button" class="ad-tombol" data-tutup>Batal</button></div>`;
    const d = bukaDialog(judul, f), galatEl = f.querySelector(".sp-form-galat"), simpan = f.querySelector('[type="submit"]');
    f.querySelector("[data-tutup]").addEventListener("click", () => d.close());
    f.addEventListener("submit", async e => {
      e.preventDefault(); galatEl.textContent = "";
      const r = kirim(Object.fromEntries(new FormData(f)));
      if (r.galat.length) { galatEl.replaceChildren(...r.galat.map(g => Object.assign(document.createElement("p"), {className: "sp-galat-isian", textContent: g.pesan}))); return; }
      simpan.disabled = true; simpan.textContent = "Menyimpan";
      try { await r.kirim(); d.close(); }
      catch (x) { galatEl.textContent = x.message || "Gagal menyimpan. Coba lagi."; simpan.disabled = false; simpan.textContent = "Simpan"; }
    });
    return d;
  };
  function dialogCek(k) {
    formDialog(`Catat cek jalan ${k.id}`, `<label>Musim<select name="musim"><option value="hujan">Hujan</option><option value="kemarau">Kemarau</option></select></label>
      <label>Hasil<select name="hasil"><option value="lolos">Lolos</option><option value="gagal">Gagal</option></select></label>
      <label>Kendaraan yang dipakai<select name="kendaraan"><option value="">Tidak dicatat</option>${Object.entries(KENDARAAN).map(([v, n]) => `<option value="${v}">${esc(n)}</option>`).join("")}</select></label>
      <label>Catatan (paling banyak 500 huruf)<textarea name="catatan" rows="3" maxlength="500"></textarea></label>
      <p class="ad-catat">Hanya cek musim hujan yang lolos mengubah zona Terverifikasi. Foto belum bisa dilampirkan dari layar ini.</p>`, f => {
      const r = badanCek(f, k.id, k.prov);
      return {galat: r.galat, kirim: async () => {
        await kirimPost(JALUR.cek, r.badan);
        const j = await konteks.ambil(JALUR.cek, sinyal); cek = cekTerbaru(j.cek || []);
        geoK = geoKompleks(semua, cek); peta?.getSource("kompleks")?.setData(geoK);   // sekali setelah tulis, bukan saat menyaring
        gambarPanel(); gambarLegenda(); gambarRincian(); terapkanSaringan();
        konteks.pesan?.(`Cek jalan ${k.id} dicatat: ${r.badan.hasil} pada musim ${r.badan.musim}.`);
      }};
    });
  }
  function dialogAoi(target, label) {
    formDialog(`Usulkan ${label} sebagai calon AOI`, `<label>Alasan (5 sampai 500 huruf)<textarea name="alasan" rows="4" maxlength="500"></textarea></label>
      <p class="ad-catat">Usul tercatat dengan status usul dan tampil di layar Laporan untuk G0. Survei dan keputusan dikerjakan staf lain.</p>`, f => {
      const r = badanAoi(target, prov, f.alasan);
      return {galat: r.galat, kirim: async () => { await kirimPost(JALUR.aoi, r.badan); konteks.pesan?.(`${label} diusulkan sebagai calon AOI.`); }};
    });
  }

  /* ---------- kontrol: chrome seketika, kerja berat sesudah satu frame ---------- */
  let jedaCari = 0;
  const tombolNyala = (b, on) => b.setAttribute("aria-pressed", String(on));
  wadah.addEventListener("click", e => {
    const t = e.target, satuan = t.closest("[data-satuan]"), zonaB = t.closest("[data-zona]"), gswB = t.closest("[data-gsw]"), sar = t.closest('[data-saring="bakar3"]'), aksi = t.closest("[data-aksi]");
    if (satuan && satuan.getAttribute("aria-checked") !== "true") {
      semuaQ("[data-satuan]").forEach(b => { const on = b === satuan; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      st.satuan = satuan.dataset.satuan; q(".sp-peta-leg").dataset.satuan = st.satuan; popup?.remove();
      if (st.satuan === "sel") { muatEl.hidden = !!peta?.getLayer("sel-isi"); muatEl.classList.add("kecil"); muatEl.textContent = "Memuat sel 2,2 km"; if (!selMuat && !geoS) nanti(bacaSel); }
      nanti(terapkanSatuan);
    } else if (zonaB) { const on = zonaB.getAttribute("aria-pressed") !== "true"; tombolNyala(zonaB, on); on ? st.zona.add(zonaB.dataset.zona) : st.zona.delete(zonaB.dataset.zona); nanti(terapkanSaringan); }
    else if (gswB) { const on = gswB.getAttribute("aria-pressed") !== "true"; tombolNyala(gswB, on); on ? st.gsw.add(gswB.dataset.gsw) : st.gsw.delete(gswB.dataset.gsw); nanti(terapkanSaringan); }
    else if (sar) { st.bakar3 = sar.getAttribute("aria-pressed") !== "true"; tombolNyala(sar, st.bakar3); nanti(terapkanSaringan); }
    else if (aksi) {
      const a = aksi.dataset.aksi, k = st.pilih && peKomp[st.pilih];
      if (a === "daftar") nanti(bukaDaftar);
      else if (a === "saring") { const buka = aksi.getAttribute("aria-expanded") !== "true"; aksi.setAttribute("aria-expanded", String(buka)); q(".sp-saring").classList.toggle("buka", buka); }
      else if (a === "lapisan") { const menu = q("#sp-lapisan"), buka = menu.hidden; menu.hidden = !buka; aksi.setAttribute("aria-expanded", String(buka)); }
      else if (a === "legenda") { const buka = aksi.getAttribute("aria-expanded") !== "true"; aksi.setAttribute("aria-expanded", String(buka)); q(".sp-peta-leg").classList.toggle("buka", buka); }
      else if (a === "lembar") aturLembar(tinggiLembar[(tinggiLembar.indexOf(q(".sp-lembar").dataset.tinggi) + 1) % 3]);
      else if (a === "cek" && k && tulis) dialogCek(k);
      else if (a === "aoi" && k && tulis) dialogAoi(k.id, `kompleks ${k.id}`);
      else if (a === "hitung" && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) { e.preventDefault(); history.pushState(null, "", aksi.getAttribute("href")); dispatchEvent(new PopStateEvent("popstate")); }
    }
  });
  wadah.addEventListener("change", e => {
    const t = e.target;
    if (t.matches('[data-saring="kab"]')) { st.kab = t.value; nanti(terapkanSaringan); }
    else if (t.matches("[data-api]")) { st.api = t.checked; const k = peKomp[st.pilih], c = k && cek[k.id]; if (k) nanti(() => { const s = q(".sp-saran"); if (s) s.outerHTML = saranHtml(k, st.versi, st.api, c); }); }
    else if (t.matches("[data-lapisan]")) nanti(terapkanSatuan);
  });
  wadah.addEventListener("input", e => { if (e.target.matches('[data-saring="cari"]')) { clearTimeout(jedaCari); const v = e.target.value; jedaCari = setTimeout(() => { st.cari = v; nanti(terapkanSaringan); }, 150); } });
  wadah.addEventListener("keydown", e => {
    const radio = e.target.closest('[data-satuan]');
    if (radio && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); const lain = semuaQ("[data-satuan]").find(b => b !== radio); lain.focus(); lain.click(); }
    if (e.key === "Escape") { popup?.remove(); const m = q("#sp-lapisan"); if (!m.hidden) { m.hidden = true; q('[data-aksi="lapisan"]').setAttribute("aria-expanded", "false"); } }
  });
  /* aksi di dalam pop-up MapLibre; pop-up berada di dalam kontainer peta, jadi klik juga lewat handler wadah: lewati yang sudah ditangani (defaultPrevented) */
  const pop = e => {
    if (e.defaultPrevented) return;
    const el = e.target.closest?.("[data-aksi]"); if (!el || !e.target.closest(".sp-pop")) return;
    const a = el.dataset.aksi;
    if (a === "rincian") { popup?.remove(); q(".sp-panel-rincian").querySelector(".sp-rincian-judul")?.focus(); }
    else if (a === "aoi-sel" && tulis) { popup?.remove(); dialogAoi(el.dataset.sel, `sel ${el.dataset.sel}`); }
    else if (a === "aoi-sel") konteks.pesan?.("Mengusulkan AOI butuh peran tulis.");
    else if (a === "hitung" && !(e.metaKey || e.ctrlKey || e.shiftKey || e.button)) { e.preventDefault(); history.pushState(null, "", el.getAttribute("href")); dispatchEvent(new PopStateEvent("popstate")); }
  };
  document.addEventListener("click", pop); hentikan.push(() => document.removeEventListener("click", pop));
  hentikan.push(() => clearTimeout(jedaCari));
  if (ponsel()) aturLembar("intip");
}
