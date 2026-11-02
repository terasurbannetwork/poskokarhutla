/* Fungsi murni panel pimpinan (tanpa DOM): koordinat, GeoJSON titik dan jejak, validasi tugas dan putusan tinjauan. Dipakai panel_ops.js dan tests/lapangan/panel.test.mjs. */
import {keMs} from "./murni.js";

export const BENCANA = [{k: "karhutla", label: "Karhutla"}, {k: "banjir", label: "Banjir"}];
export const STATUS_PETA = {lolos: ["Lolos", "#1a9b5b"], sah: ["Sah", "#1a9b5b"], tinjau: ["Menunggu tinjauan", "#e0a100"], tolak: ["Ditolak", "#cf3b3b"]};
export const WARNA_LAIN = "#6b7a90";
export const labelStatusPeta = s => Object.hasOwn(STATUS_PETA, s) ? STATUS_PETA[s][0] : "Belum jelas";
export const warnaStatusPeta = s => Object.hasOwn(STATUS_PETA, s) ? STATUS_PETA[s][1] : WARNA_LAIN;
export const HADIR = new Set(["lolos", "sah"]);

/* "-0,05793 116,42250" atau "-0.05793, 116.42250" (tempelan Renlap) -> {lat, lon} atau null. Tepat dua bilangan, dalam rentang. */
export function bacaKoordinat(teks) {
  const m = String(teks ?? "").match(/-?\d+(?:[.,]\d+)?/g);
  if (!m || m.length !== 2) return null;
  const [lat, lon] = m.map(x => Number(x.replace(",", ".")));
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? {lat, lon} : null;
}
export const teksKoordinat = (lat, lon) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

/* ringkas.titik -> FeatureCollection; saring: null = semua, "hadir" = lolos/sah, selain itu = status persis. Titik tanpa koordinat sah dibuang. */
export function titikGeo(titik, saring = null) {
  const fitur = [];
  for (const t of Array.isArray(titik) ? titik : []) {
    const lat = Number(t.lat), lon = Number(t.lon);
    if (t.lat == null || t.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    if (saring === "hadir" ? !HADIR.has(t.status) : saring && t.status !== saring) continue;
    fitur.push({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties: {orang: t.orang ?? "", nama: String(t.nama ?? ""), tugas: String(t.tugas ?? ""), status: String(t.status ?? ""), waktu: keMs(t.waktu), warna: warnaStatusPeta(t.status)}});
  }
  return {type: "FeatureCollection", features: fitur};
}

/* ringkas.jejak -> FeatureCollection garis. Menerima [{orang, titik:[[lat,lon]|{lat,lon}]}] (server: pasangan [lat, lon]; keluaran GeoJSON [lon, lat]) atau titik datar [{orang, lat, lon, waktu}] (dikelompokkan per orang, urut waktu). Garis butuh >= 2 titik. */
export function jejakGeo(jejak) {
  const kelompok = new Map(), tambah = (orang, lat, lon, waktu = 0) => {
    lat = Number(lat); lon = Number(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return;
    if (!kelompok.has(orang)) kelompok.set(orang, []);
    kelompok.get(orang).push({lat, lon, w: keMs(waktu) || 0});
  };
  for (const j of Array.isArray(jejak) ? jejak : []) {
    if (Array.isArray(j.titik)) j.titik.forEach((p, i) => Array.isArray(p) ? tambah(j.orang, p[0], p[1], p[2] ?? i) : tambah(j.orang, p.lat, p.lon, p.waktu ?? i));
    else tambah(j.orang, j.lat, j.lon, j.waktu);
  }
  const fitur = [];
  for (const [orang, ps] of kelompok) {
    if (ps.length < 2) continue;
    ps.sort((a, b) => a.w - b.w);
    fitur.push({type: "Feature", geometry: {type: "LineString", coordinates: ps.map(p => [p.lon, p.lat])}, properties: {orang: orang ?? ""}});
  }
  return {type: "FeatureCollection", features: fitur};
}

/* tepi pembatas (minLon, minLat, maxLon, maxLat) dari titik dan jejak; null bila kosong */
export function tepiPeta(...kumpulan) {
  let a = [Infinity, Infinity, -Infinity, -Infinity];
  const lihat = ([x, y]) => { a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; };
  for (const fc of kumpulan) for (const f of fc.features) (f.geometry.type === "Point" ? [f.geometry.coordinates] : f.geometry.coordinates).forEach(lihat);
  return Number.isFinite(a[0]) ? a : null;
}

/* strip angka dari ringkas; nilai bukan angka jadi 0 */
export const angkaStrip = r => Object.fromEntries(["hadir", "belum_absen", "belum_logbook", "tinjau"].map(k => [k, Math.max(0, Math.trunc(Number(r?.[k])) || 0)]));

/* foto tinjauan hanya dari rute foto sendiri (bukan URL luar yang disusupkan) */
export const fotoAman = u => typeof u === "string" && /^\/api\/petugas\/foto\/[A-Za-z0-9_-]{1,64}(\?[A-Za-z0-9_=&-]{0,64})?$/.test(u) ? u : null;

/* putusan tinjauan: tolak wajib catatan (>= 3 huruf). -> {ok, galat, badan} */
export function putusanTinjau(putus, catatan) {
  const c = String(catatan ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (putus !== "sah" && putus !== "tolak") return {ok: false, galat: "Putusan tidak dikenal", badan: null};
  if (putus === "tolak" && c.length < 3) return {ok: false, galat: "Catatan wajib diisi bila menolak", badan: null};
  return {ok: true, galat: "", badan: {putus, catatan: c}};
}

/* "2026-11-02T08:00" (datetime-local, jam perangkat) -> ms epoch; kosong/rusak -> NaN */
export const dtLokalKeMs = s => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(s ?? "")) ? new Date(s).getTime() : NaN;

/* formulir tugas -> {ok, galat{kolom}, badan}. radius kosong = biarkan server memakai bawaannya. */
export function rapikanTugas(f) {
  const galat = {}, judul = String(f?.judul ?? "").replace(/\s+/g, " ").trim();
  if (judul.length < 3 || judul.length > 120) galat.judul = "Judul 3 sampai 120 huruf";
  if (!BENCANA.some(b => b.k === f?.bencana)) galat.bencana = "Pilih jenis bencana";
  const kor = bacaKoordinat(f?.koordinat);
  if (!kor) galat.koordinat = "Isi titik dengan dua angka, mis. -0,05793 116,42250, atau klik peta";
  let radius;
  if (String(f?.radius_m ?? "").trim() !== "") {
    radius = /^\d+$/.test(String(f.radius_m).trim()) ? Number(f.radius_m) : NaN;
    if (!(radius >= 50 && radius <= 50000)) galat.radius_m = "Radius 50 sampai 50.000 meter";
  }
  const mulai = dtLokalKeMs(f?.mulai), selesai = dtLokalKeMs(f?.selesai);
  if (!Number.isFinite(mulai)) galat.mulai = "Isi waktu mulai";
  if (!Number.isFinite(selesai)) galat.selesai = "Isi waktu selesai";
  else if (Number.isFinite(mulai) && selesai <= mulai) galat.selesai = "Selesai harus sesudah mulai";
  const anggota = [...new Set(Array.isArray(f?.anggota) ? f.anggota.filter(x => typeof x === "string" && x) : [])];
  if (!anggota.length) galat.anggota = "Tambahkan minimal satu anggota";
  const renlap = String(f?.renlap_url ?? "").trim();
  if (renlap && !/^https:\/\/[^\s"'<>]+$/.test(renlap)) galat.renlap_url = "Tautan Renlap harus diawali https://";
  if (Object.keys(galat).length) return {ok: false, galat, badan: null};
  return {ok: true, galat: {}, badan: {judul, bencana: f.bencana, lat: kor.lat, lon: kor.lon, ...(radius ? {radius_m: radius} : {}), wilayah_teks: String(f.wilayah_teks ?? "").replace(/\s+/g, " ").trim().slice(0, 160), ...(renlap ? {renlap_url: renlap} : {}), mulai, selesai, anggota}};
}

/* tugas.anggota dari server = [{id, nama, peran}] -> {jumlah, nama: "Ani (ketua), Budi"}; bentuk lain (angka lama, null) tetap terbaca. Maks `batas` nama, sisanya "+n". */
export function ringkasAnggota(anggota, batas = 4) {
  if (!Array.isArray(anggota)) return {jumlah: Number.isFinite(Number(anggota)) && anggota !== null && anggota !== "" ? Number(anggota) : 0, nama: ""};
  const ada = anggota.filter(a => a && typeof a === "object" && a.nama), ketua = ada.filter(a => a.peran === "ketua"), urut = [...ketua, ...ada.filter(a => a.peran !== "ketua")];
  const nama = urut.slice(0, batas).map(a => a.peran === "ketua" ? `${a.nama} (ketua)` : String(a.nama)).join(", ") + (urut.length > batas ? `, +${urut.length - batas}` : "");
  return {jumlah: anggota.length, nama};
}

/* kondisi lapangan dari nilai label logbook ({kondisi_api} atau {tinggi_genangan_cm}) -> teks pil. Kunci asing diabaikan. */
const NAMA_API = {menyala: "Menyala", bara: "Bara", padam: "Padam", bukan_api: "Bukan api"};
export function teksKondisi(nilai) {
  const n = nilai && typeof nilai === "object" ? nilai : {}, t = [];
  if (typeof n.kondisi_api === "string" && Object.hasOwn(NAMA_API, n.kondisi_api)) t.push(`Kondisi api: ${NAMA_API[n.kondisi_api].toLowerCase()}`);
  const cm = Number(n.tinggi_genangan_cm); if (n.tinggi_genangan_cm != null && Number.isFinite(cm)) t.push(`Genangan ${Math.round(cm)} cm`);
  return t;
}
