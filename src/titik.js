/* Titik panas hampir-waktu-nyata: cron tiap 3 jam mengambil FIRMS area CSV (1–2 hari terakhir) dan menyimpan
   hasil ringkas di D1 (titik_terbaru, 8 putaran terakhir). Format SAMA dengan public/data/hotspot.json
   (kolom lat, lon, jam relatif acuan, sensor, frp, keyakinan, indeks wilayah, tgl_wib) supaya klien cukup menggabungkan.
   Aturan dicerminkan dari scripts/data/harian.py::hotspot(): empat sensor NRT, semua tingkat keyakinan (dikodekan
   0/1/2 dengan ambang BRIN), dedup (lat4, lon4, waktu, sensor), titik di luar wilayah Indonesia dibuang. Bedanya:
   wilayah dicari dari geo/provinsi.json + pusat kecamatan terdekat (banjir/data/pusat_kec.json), bukan poligon
   kecamatan penuh, jadi titik di pantai/perbatasan bisa sedikit berbeda dari data harian. */
export const SENSOR = {VIIRS_SNPP_NRT: "N", VIIRS_NOAA20_NRT: "N20", VIIRS_NOAA21_NRT: "N21", MODIS_NRT: "M"};
export const SENSOR_UTAMA = ["M", "N", "N20"];
const BBOX = [94, -11.5, 141.5, 6.5], JAM = 3600e3, SIMPAN = 8, MAKS_BYTE = 1.8e6, KEC_CADANGAN_KM = 8;

export const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
const tglWIB = t => new Date(t + 7 * JAM).toISOString().slice(5, 10);

/* keyakinan: MODIS 0–29 rendah, 30–79 sedang, 80–100 tinggi; VIIRS l/n/h; selain itu sedang (sama dengan harian.py) */
export function keyakinan(sensor, conf) {
  if (sensor.startsWith("MODIS")) return /^\d+$/.test(conf) ? (+conf < 30 ? 0 : +conf < 80 ? 1 : 2) : 0;
  return {l: 0, n: 1, h: 2}[conf] ?? 1;
}

/* CSV FIRMS -> titik sah. Baris rusak (angka bukan angka, tanggal/jam salah, di luar kotak, waktu di masa depan) dibuang. */
export function uraiCSV(teks, sensor, kini, jendelaJam = 24) {
  const baris = String(teks).trim().split(/\r?\n/), kepala = (baris.shift() || "").split(",");
  const i = n => kepala.indexOf(n);
  if (i("latitude") < 0 || i("longitude") < 0 || i("acq_date") < 0 || i("acq_time") < 0) return {galat: `${sensor}: bukan CSV FIRMS: ${String(teks).slice(0, 80)}`, titik: [], rusak: 0};
  const out = [], s = SENSOR[sensor]; let rusak = 0;
  for (const b of baris) {
    const c = b.split(","), lat = Number(c[i("latitude")]), lon = Number(c[i("longitude")]);
    const tg = c[i("acq_date")] || "", jm = (c[i("acq_time")] || "").trim(), frpS = i("frp") >= 0 ? c[i("frp")] : "0";
    const frp = frpS === "" ? 0 : Number(frpS);
    if (c.length !== kepala.length || !Number.isFinite(lat) || !Number.isFinite(lon) || !/^\d{4}-\d{2}-\d{2}$/.test(tg) || !/^\d{1,4}$/.test(jm) || !Number.isFinite(frp) || frp < 0) { rusak++; continue; }
    if (lon < BBOX[0] || lon > BBOX[2] || lat < BBOX[1] || lat > BBOX[3]) { rusak++; continue; }
    const j4 = jm.padStart(4, "0"), t = Date.parse(`${tg}T${j4.slice(0, 2)}:${j4.slice(2)}:00Z`);
    if (!Number.isFinite(t) || t > kini + JAM) { rusak++; continue; }
    if (t < kini - jendelaJam * JAM) continue;
    out.push({lat: Math.round(lat * 1e4) / 1e4, lon: Math.round(lon * 1e4) / 1e4, t, s, frp: Math.round(frp * 10) / 10, c: keyakinan(sensor, (c[i("confidence")] || "").trim())});
  }
  return {titik: out, rusak};
}

/* ---------------- wilayah: provinsi (poligon) + kecamatan (pusat terdekat) ---------------- */
let WIL = null;
export async function wilayah(env) {
  if (WIL) return WIL;
  const ambil = async p => { const r = await env.ASSETS.fetch(new Request("https://aset.lokal" + p)); if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); };
  const [prov, kec] = await Promise.all([ambil("/geo/provinsi.json"), ambil("/banjir/data/pusat_kec.json")]);
  const poli = prov.features.map(f => {
    const cincin = (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates).flat();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of cincin) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return {kode: f.properties.kode, cincin, kotak: [x0, y0, x1, y1]};
  });
  const grid = new Map();
  for (const [k, [la, lo]] of Object.entries(kec)) { const g = Math.floor(la * 2) + "," + Math.floor(lo * 2); (grid.get(g) || grid.set(g, []).get(g)).push([la, lo, k]); }
  return WIL = {poli, grid};
}
export const dalam = (x, y, cincin) => { let ok = false; for (const r of cincin) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
  const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok; } return ok; };
export function cariWilayah(W, lat, lon) {
  const p = W.poli.find(q => lon >= q.kotak[0] && lon <= q.kotak[2] && lat >= q.kotak[1] && lat <= q.kotak[3] && dalam(lon, lat, q.cincin));
  let best = null, bd = 1e9;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++)
    for (const k of W.grid.get((Math.floor(lat * 2) + a) + "," + (Math.floor(lon * 2) + b)) || []) {
      if (p && !k[2].startsWith(p.kode + "|")) continue;
      const d = km(lat, lon, k[0], k[1]); if (d < bd) { bd = d; best = k[2]; }
    }
  return p ? best : bd <= KEC_CADANGAN_KM ? best : null;   // di luar poligon provinsi: hanya kalau dekat sekali ke pusat kecamatan
}

/* ---------------- masker sumber panas tetap (smelter, tambang, kilang, PLTU): public/data/titik_palsu.json ----------------
   Sama dengan scripts/data/titik_palsu.py::sel_industri: sel = (round(lat*100), round(lon*100)) dengan pembulatan genap Python, kawah TIDAK disaring (gunung api tetap dihitung
   setara SiPongi). Berkas tak terbaca = tanpa masker (lebih baik titik lebih daripada titik hilang). */
const bulatGenap = x => { const f = Math.floor(x), d = x - f; return d < .5 ? f : d > .5 ? f + 1 : f % 2 === 0 ? f : f + 1; };
export const selTitik = (lat, lon) => bulatGenap(lat * 100) + "," + bulatGenap(lon * 100);
export async function muatMasker(env) {
  try {
    const r = await env.ASSETS.fetch(new Request("https://aset.lokal/data/titik_palsu.json")); if (!r.ok) { r.body?.cancel(); return null; }
    const d = await r.json(); return new Set((d.sumber_statis || []).filter(x => x.jenis !== "kawah").map(x => selTitik(x.lat, x.lon)));
  } catch (e) { return null; }
}

/* ---------------- satu putaran: ambil, urai, simpan ---------------- */
export async function perbaruiTitik(env, kini = Date.now()) {
  if (!env.FIRMS_MAP_KEY) return {lewat: "FIRMS_MAP_KEY belum diset"};
  const hasil = await Promise.all(Object.keys(SENSOR).map(async s => {
    try {
      const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.FIRMS_MAP_KEY}/${s}/${BBOX.join(",")}/2`);
      return r.ok ? uraiCSV(await r.text(), s, kini) : {galat: `${s}: HTTP ${r.status}`, titik: [], rusak: 0};
    } catch (e) { return {galat: `${s}: ${e.message}`, titik: [], rusak: 0}; }
  }));
  const galat = hasil.filter(h => h.galat).map(h => h.galat);
  if (galat.length === hasil.length) return {galat};             // semua sensor gagal: putaran lama tetap dipakai
  const W = await wilayah(env), masker = await muatMasker(env), lihat = new Set(), tabel = new Map(), titik = []; let palsu = 0;
  for (const p of hasil.flatMap(h => h.titik).sort((a, b) => a.t - b.t)) {
    const k = `${p.lat}|${p.lon}|${p.t}|${p.s}`; if (lihat.has(k)) continue; lihat.add(k);
    if (masker?.has(selTitik(p.lat, p.lon))) { palsu++; continue; }   // sumber panas industri tetap, bukan kebakaran
    const w = cariWilayah(W, p.lat, p.lon); if (!w) continue;      // laut atau negara tetangga
    if (!tabel.has(w)) tabel.set(w, tabel.size);
    titik.push({...p, w: tabel.get(w)});
  }
  const acuan = titik.length ? titik[titik.length - 1].t : kini;
  const isi = {kolom: ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"], acuan: new Date(acuan).toISOString(), dibuat: new Date(kini).toISOString(),
    wilayah: [...tabel.keys()], sensor_utama: SENSOR_UTAMA, galat,
    baris: titik.map(p => [p.lat, p.lon, Math.round((p.t - acuan) / JAM * 100) / 100, p.s, p.frp, p.c, p.w, tglWIB(p.t)])};
  let teks = JSON.stringify(isi);
  while (teks.length > MAKS_BYTE && isi.baris.length) { isi.baris = isi.baris.slice(Math.ceil(isi.baris.length * .1)); teks = JSON.stringify(isi); }   // buang yang tertua
  await env.DB.batch([
    env.DB.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").bind(kini, teks),
    env.DB.prepare(`DELETE FROM titik_terbaru WHERE id NOT IN (SELECT id FROM titik_terbaru ORDER BY id DESC LIMIT ${SIMPAN})`),
  ]);
  return {titik: isi.baris.length, palsu, rusak: hasil.reduce((a, h) => a + h.rusak, 0), galat};
}

export async function titikTerbaru(env) {
  const r = await env.DB.prepare("SELECT dibuat, isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first();
  if (!r) return new Response(JSON.stringify({galat: "belum ada putaran titik panas"}), {status: 404, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "no-store"}});
  return new Response(r.isi, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=600", "last-modified": new Date(r.dibuat).toUTCString()}});
}
