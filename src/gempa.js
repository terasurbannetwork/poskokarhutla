/* Katalog gempa hampir-waktu-nyata: cron "* * * * *" (CRON_GEMPA di worker.js) mengambil BMKG (autogempa tiap menit; tiap 5 menit
   gempaterkini, gempadirasakan, dan USGS FDSN), menggabungkannya, menyimpan ke D1 (migrations/0009_gempa.sql), lalu mengelompokkan
   gempa M >= 5 jadi kejadian G0001... Pola dari src/titik.js. Tiap sumber gagal-lunak: satu mati tidak mematahkan yang lain.
   Aturan penting:
   - Potensi BMKG yang tidak menyebut tsunami = kode NULL ("BMKG tidak menyebut tsunami"), TIDAK PERNAH dibaca "aman" (kode 0 hanya
     bila teksnya "tidak berpotensi tsunami").
   - USGS dikotak Indonesia lalu disaring: Filipina, Timor Leste, PNG tidak ikut.
   - Gabung BMKG+USGS bila selisih waktu <= 90 detik dan jarak <= 100 km; yang menang BMKG (magnitudo, lokasi, id "b:...").
   - Wilayah laut: provinsi/kabupaten dari pusat kecamatan terdekat <= 300 km, selebihnya NULL (teks Wilayah sumber tetap ada). */
import {json, gagal, cacheTepi} from "./worker.js";
import {wilayah, cariWilayah} from "./titik.js";

const JAM = 3600e3, HARI = 24 * JAM, TOL_MS = 90e3, TOL_KM = 100, WIL_MAKS_KM = 300, TIMEOUT_MS = 8000, MAKS_BYTE = 2e6;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const BMKG = "https://data.bmkg.go.id/DataMKG/TEWS/";
const USGS = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&minlatitude=-11.5&maxlatitude=6.5&minlongitude=94&maxlongitude=142&minmagnitude=4.5&starttime=";
const KOLOM = ["id", "t", "lat", "lon", "m", "mtipe", "dalam", "wilayah", "prov", "kab", "sumber", "potensi", "potensi_teks", "dirasakan", "mmi_maks", "shakemap", "pager", "usgs_id", "tsunami_usgs", "kej", "diperbarui"];
const ROMAWI = {I: 1, V: 5, X: 10};

const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371; };
const dalamKotak = (lat, lon) => lat >= -11.5 && lat <= 6.5 && lon >= 94 && lon <= 142;

/* ---------------- penguraian (murni, diuji) ---------------- */
/* "Tidak berpotensi tsunami" = 0; "berpotensi tsunami" (tanpa "tidak") = 1..3 menurut kata Waspada/Siaga/Awas, tanpa tingkat = 1;
   selain itu (mis. "Gempa ini dirasakan untuk diteruskan pada masyarakat") = null: tanpa pernyataan, bukan "aman". */
export function uraiPotensi(teks) {
  const t = String(teks ?? "").toLowerCase();
  if (/tidak\s+berpotensi\s+(?:terjadi\s+)?tsunami/.test(t)) return 0;
  if (!/berpotensi\s+(?:terjadi\s+)?tsunami|tsunami/.test(t)) return null;
  return /awas/.test(t) ? 3 : /siaga/.test(t) ? 2 : 1;
}

/* "III Darajat, III Pasirwangi" -> 3; "II - III Kab. Manggarai" -> 3; "II Kabandungan" -> 2; selain itu null */
export function uraiDirasakan(teks) {
  let maks = null;
  for (const bagian of String(teks ?? "").split(",")) {
    for (const m of bagian.trim().match(/^([IVX]+)(?:\s*-\s*([IVX]+))?(?=\s|$)/)?.slice(1) ?? []) {
      if (!m) continue;
      let n = 0; for (let i = 0; i < m.length; i++) { const v = ROMAWI[m[i]], s = ROMAWI[m[i + 1]]; n += s > v ? -v : v; }
      if (n >= 1 && n <= 12 && (maks == null || n > maks)) maks = n;
    }
  }
  return maks;
}

/* autogempa (objek) atau gempaterkini/gempadirasakan (larik) -> baris; baris rusak dihitung, bukan melempar */
export function uraiBMKG(data, kini = Date.now()) {
  const g = data?.Infogempa?.gempa, daftar = Array.isArray(g) ? g : g ? [g] : [], baris = []; let rusak = 0;
  for (const x of daftar) {
    const t = Date.parse(x?.DateTime), [lat, lon] = String(x?.Coordinates ?? "").split(",").map(Number), m = parseFloat(x?.Magnitude), dalam = parseFloat(x?.Kedalaman);
    if (!Number.isFinite(t) || t > kini + JAM || !dalamKotak(lat, lon) || !Number.isFinite(m) || m < 0 || m > 10) { rusak++; continue; }
    const pt = x.Potensi == null ? null : String(x.Potensi).slice(0, 200);
    baris.push({id: `b:${x.DateTime}|${x.Coordinates}`, t, lat, lon, m, mtipe: null, dalam: Number.isFinite(dalam) && dalam >= 0 ? dalam : null,
      wilayah: String(x.Wilayah ?? "").slice(0, 200), sumber: "bmkg", potensi: pt == null ? null : uraiPotensi(pt), potensi_teks: pt,
      dirasakan: x.Dirasakan ? String(x.Dirasakan).slice(0, 300) : null, mmi_maks: uraiDirasakan(x.Dirasakan),
      shakemap: /^[\w.-]{1,80}$/.test(x.Shakemap ?? "") ? x.Shakemap : null, pager: null, usgs_id: null, tsunami_usgs: null});
  }
  return {baris, rusak};
}

/* kotak USGS menjaring Filipina selatan, Timor Leste, PNG: sisakan yang place-nya Indonesia atau laut Indonesia tanpa nama negara */
const ASING = /philippines|papua new guinea|timor.leste|malaysia|australia|solomon|palau|brunei|singapore/i;
const LAUT_ID = /\b(?:banda|molucca|halmahera|seram|flores|celebes|sulawesi|java|sumatra|bali|kepulauan|maluku|sunda|timor sea)\b/i;
export const diIndonesia = place => /indonesia\s*$/i.test(place) || (!ASING.test(place) && LAUT_ID.test(place));

export function uraiUSGS(fc, kini = Date.now()) {
  const baris = []; let rusak = 0;
  for (const f of fc?.features ?? []) {
    const p = f?.properties ?? {}, [lon, lat, dalam] = f?.geometry?.coordinates ?? [], place = String(p.place ?? "");
    if (p.type && p.type !== "earthquake") continue;
    if (!diIndonesia(place)) continue;
    if (!f.id || !Number.isFinite(p.time) || p.time > kini + JAM || !dalamKotak(lat, lon) || !Number.isFinite(p.mag) || p.mag < 0 || p.mag > 10) { rusak++; continue; }
    baris.push({id: `u:${f.id}`, t: p.time, lat, lon, m: p.mag, mtipe: p.magType ? String(p.magType).slice(0, 10) : null, dalam: Number.isFinite(dalam) && dalam >= 0 ? dalam : null,
      wilayah: place.slice(0, 200), sumber: "usgs", potensi: null, potensi_teks: null, dirasakan: null, mmi_maks: Number.isFinite(p.mmi) ? p.mmi : null,
      shakemap: null, pager: /^(green|yellow|orange|red)$/.test(p.alert) ? p.alert : null, usgs_id: String(f.id), tsunami_usgs: p.tsunami ? 1 : 0});
  }
  return {baris, rusak};
}

/* ---------------- wilayah, termasuk laut ---------------- */
/* pusat kecamatan terdekat dalam cincin sel 0,5 derajat; null bila lebih jauh dari maksKm */
export function wilayahTerdekat(W, lat, lon, maksKm = WIL_MAKS_KM) {
  const r = Math.ceil(maksKm / 55) + 1, a = Math.floor(lat * 2), b = Math.floor(lon * 2); let best = null, bd = maksKm;
  for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++)
    for (const k of W.grid.get((a + i) + "," + (b + j)) || []) { const d = km(lat, lon, k[0], k[1]); if (d <= bd) { bd = d; best = k[2]; } }
  return best;
}
const lokasi = (W, lat, lon) => {
  const kunci = W && (cariWilayah(W, lat, lon) || wilayahTerdekat(W, lat, lon)), [prov, kab] = kunci ? kunci.split("|") : [null, null];
  return {prov: prov || null, kab: kab || null};
};

/* ---------------- gabung & simpan ---------------- */
/* satukan baris D1 (lama) dengan hasil urai (baru) tanpa menghapus kolom yang hanya dimiliki sumber lain */
export function satukan(lama, baru, kini) {
  const ada = (a, k) => baru[k] != null ? baru[k] : a[k];
  const mmi = lama.mmi_maks != null && baru.mmi_maks != null ? Math.max(lama.mmi_maks, baru.mmi_maks) : lama.mmi_maks ?? baru.mmi_maks;
  let h;
  if (baru.sumber === "bmkg") {
    const dasar = lama.sumber === "usgs" ? {...baru, prov: lama.prov, kab: lama.kab, kej: lama.kej, usgs_id: lama.usgs_id, pager: lama.pager, tsunami_usgs: lama.tsunami_usgs, sumber: "gabung"} : lama;
    h = {...dasar, ...(lama.sumber === "usgs" ? {} : {t: baru.t, lat: baru.lat, lon: baru.lon, m: baru.m, dalam: ada(lama, "dalam"), wilayah: baru.wilayah || lama.wilayah}),
      id: lama.sumber === "usgs" ? baru.id : lama.id, mtipe: lama.sumber === "usgs" ? null : lama.mtipe};
    if (baru.potensi_teks != null) { h.potensi = baru.potensi; h.potensi_teks = baru.potensi_teks; }
    else if (lama.sumber === "usgs") { h.potensi = null; h.potensi_teks = null; }
    h.dirasakan = ada(lama, "dirasakan"); h.shakemap = ada(lama, "shakemap");
  } else if (lama.sumber === "usgs") h = {...lama, ...baru, prov: lama.prov, kab: lama.kab, kej: lama.kej, id: lama.id};
  else h = {...lama, usgs_id: baru.usgs_id, pager: baru.pager ?? lama.pager, tsunami_usgs: baru.tsunami_usgs, sumber: "gabung"};
  h.mmi_maks = mmi; h.diperbarui = lama.diperbarui;
  const sama = KOLOM.every(k => h[k] === lama[k]);
  if (!sama) h.diperbarui = kini;
  return {baris: h, berubah: !sama};
}

function cocok(ada, r) {
  if (ada.has(r.id)) return ada.get(r.id);
  let terbaik = null, td = 1e18;
  for (const x of ada.values()) {
    if (r.sumber === "usgs" && x.usgs_id === r.usgs_id) return x;
    const pasangan = r.sumber === "bmkg" ? x.sumber === "usgs" : x.sumber === "bmkg";   // gabung sudah punya pasangan
    const dt = Math.abs(x.t - r.t);
    if (pasangan && dt <= TOL_MS && dt < td && km(x.lat, x.lon, r.lat, r.lon) <= TOL_KM) { terbaik = x; td = dt; }
  }
  return terbaik;
}

const simpanSql = env => env.DB.prepare(`INSERT OR REPLACE INTO gempa (${KOLOM.join(",")}) VALUES (${KOLOM.map(() => "?").join(",")})`);

export async function simpan(env, baris, kini = Date.now()) {
  if (!baris.length) return {baru: 0, ubah: 0};
  const lo = Math.min(...baris.map(r => r.t)) - TOL_MS, hi = Math.max(...baris.map(r => r.t)) + TOL_MS;
  const ada = new Map((await env.DB.prepare("SELECT * FROM gempa WHERE t BETWEEN ? AND ?").bind(lo, hi).all()).results.map(r => [r.id, r]));
  let W = null; try { W = await wilayah(env); } catch (e) { console.error("wilayah gempa", e.message); }
  const st = []; let baru = 0, ubah = 0;
  for (const r of baris) {
    const lama = cocok(ada, r);
    if (!lama) {
      const h = {...r, ...lokasi(W, r.lat, r.lon), kej: null, diperbarui: kini};
      ada.set(h.id, h); st.push(simpanSql(env).bind(...KOLOM.map(k => h[k] ?? null))); baru++; continue;
    }
    const {baris: h, berubah} = satukan(lama, r, kini);
    if (!berubah) continue;
    ada.delete(lama.id); ada.set(h.id, h);
    if (h.id !== lama.id) st.push(env.DB.prepare("DELETE FROM gempa WHERE id = ?").bind(lama.id), env.DB.prepare("UPDATE gempa_kejadian SET utama_id = ? WHERE utama_id = ?").bind(h.id, lama.id));
    st.push(simpanSql(env).bind(...KOLOM.map(k => h[k] ?? null))); ubah++;
  }
  if (st.length) await env.DB.batch(st);
  return {baru, ubah};
}

/* ---------------- kejadian G (G8) ---------------- */
/* Jendela jarak Gardner-Knopoff 1974: R = 10^(0,1238 M + 0,983) km. Waktu tidak memakai jendela GK (ratusan hari) tetapi masa aktif kejadian.
   ponytail: ini stand-in sampai public/gempa/model.js (G6) ada; lalu impor jendelaGK/masukJendela dari sana, jangan salin. */
export const jendelaKm = m => 10 ** (0.1238 * m + 0.983);
const masaAktif = m => m >= 6.5 ? 7 * HARI : 3 * HARI;

export async function kelompokkan(env) {
  const g = (await env.DB.prepare("SELECT id, t, lat, lon, m, wilayah FROM gempa WHERE m >= 5 AND kej IS NULL ORDER BY t").all()).results;
  if (!g.length) return 0;
  const kejadian = (await env.DB.prepare("SELECT * FROM gempa_kejadian WHERE aktif_hingga >= ?").bind(g[0].t).all()).results;
  let nomor = +((await env.DB.prepare("SELECT max(kode) k FROM gempa_kejadian").first()).k ?? "G0000").slice(1);
  const sentuh = new Set(), st = [];
  for (const x of g) {
    let k = kejadian.filter(c => c.mulai <= x.t && x.t <= c.aktif_hingga && km(c.lat, c.lon, x.lat, x.lon) <= jendelaKm(c.m))
      .sort((a, b) => km(a.lat, a.lon, x.lat, x.lon) - km(b.lat, b.lon, x.lat, x.lon))[0];
    if (k) { k.akhir = Math.max(k.akhir, x.t); k.aktif_hingga = Math.max(k.aktif_hingga, x.t + masaAktif(k.m)); }
    else { k = {kode: "G" + String(++nomor).padStart(4, "0"), utama_id: x.id, lat: x.lat, lon: x.lon, mulai: x.t, akhir: x.t, m: x.m, nama: x.wilayah, aktif_hingga: x.t + masaAktif(x.m)}; kejadian.push(k); }
    sentuh.add(k); st.push(env.DB.prepare("UPDATE gempa SET kej = ? WHERE id = ?").bind(k.kode, x.id));
  }
  const K = ["kode", "utama_id", "lat", "lon", "mulai", "akhir", "m", "nama", "aktif_hingga"];
  for (const k of sentuh) st.push(env.DB.prepare(`INSERT OR REPLACE INTO gempa_kejadian (${K}) VALUES (${K.map(() => "?")})`).bind(...K.map(c => k[c])));
  await env.DB.batch(st);
  return sentuh.size;
}

/* ---------------- satu putaran cron ---------------- */
const TUGAS = {
  autogempa: {url: () => BMKG + "autogempa.json", urai: uraiBMKG, etag: true},
  gempaterkini: {url: () => BMKG + "gempaterkini.json", urai: uraiBMKG, etag: true},
  gempadirasakan: {url: () => BMKG + "gempadirasakan.json", urai: uraiBMKG, etag: true},
  usgs: {url: kini => USGS + new Date(kini - 3 * HARI).toISOString().slice(0, 19), urai: uraiUSGS, etag: false},   // 3 hari: isi ulang selisih bila Worker sempat mati
};

async function ambil(env, nama, kini) {
  const t = TUGAS[nama], h = {"user-agent": UA, accept: "application/json, */*;q=0.8", "accept-language": "id,en;q=0.8"};
  const lama = t.etag ? await env.DB.prepare("SELECT etag FROM gempa_sumber WHERE kunci = ?").bind(nama).first() : null;
  if (lama?.etag) h["if-none-match"] = lama.etag;
  const r = await fetch(t.url(kini), {headers: h, signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (r.status === 304) { r.body?.cancel(); return {nama, tetap: true, baris: [], rusak: 0}; }
  if (!r.ok) { r.body?.cancel(); throw new Error(`HTTP ${r.status}`); }
  if (+r.headers.get("content-length") > MAKS_BYTE) { r.body?.cancel(); throw new Error("badan terlalu besar"); }
  const teks = await r.text();
  if (teks.length > MAKS_BYTE) throw new Error("badan terlalu besar");
  return {nama, etag: r.headers.get("etag"), ...t.urai(JSON.parse(teks), kini)};
}

export async function perbaruiGempa(env, kini = Date.now()) {
  const pilih = ["autogempa", ...(new Date(kini).getUTCMinutes() % 5 === 0 ? ["gempaterkini", "gempadirasakan", "usgs"] : [])];
  const hasil = await Promise.allSettled(pilih.map(n => ambil(env, n, kini))), galat = [], ok = [];
  hasil.forEach((h, i) => h.status === "fulfilled" ? ok.push(h.value) : galat.push(`${pilih[i]}: ${h.reason?.message ?? h.reason}`));
  if (!ok.length) return {galat};                                       // semua sumber gagal: data lama dipertahankan
  try {
    /* semua 304: tidak ada yang berubah. Penanda "sumber sehat" (dasar /api/status) cukup diperbarui tiap 10 menit, bukan tiap menit. */
    if (ok.every(h => h.tetap)) {
      const d = await gempaDibuat(env);
      if (d != null && kini - d < 10 * 60e3) return {tetap: true, galat};
    }
    const r = await simpan(env, ok.flatMap(h => h.baris).sort((a, b) => (a.sumber === "bmkg" ? 0 : 1) - (b.sumber === "bmkg" ? 0 : 1)), kini);   // BMKG dulu, USGS menempel
    const kej = await kelompokkan(env);
    await env.DB.batch(ok.map(h => env.DB.prepare("INSERT INTO gempa_sumber (kunci, etag, isi, dibuat) VALUES (?, ?, ?, ?) ON CONFLICT(kunci) DO UPDATE SET etag = coalesce(excluded.etag, etag), isi = excluded.isi, dibuat = excluded.dibuat")
      .bind(h.nama, h.etag ?? null, JSON.stringify({baris: h.baris.length, rusak: h.rusak, tetap: !!h.tetap}), kini)));
    return {...r, kejadian: kej, rusak: ok.reduce((a, h) => a + h.rusak, 0), galat};
  } catch (e) { return {galat: [...galat, "simpan: " + e.message]}; }
}

export const bersihkanGempa = (env, kini = Date.now()) =>
  env.DB.prepare("DELETE FROM gempa WHERE m < 4 AND t <= ? AND kej IS NULL").bind(kini - 90 * HARI).run();

/* untuk /api/status: kapan sumber BMKG utama terakhir menjawab sehat (200 atau 304), bukan kapan gempa terakhir (bisa berjam-jam sepi) */
export async function gempaDibuat(env) {
  try { return (await env.DB.prepare("SELECT dibuat FROM gempa_sumber WHERE kunci = 'autogempa'").first())?.dibuat ?? null; } catch (e) { return null; }
}

/* ---------------- API publik ---------------- */
const iso = t => new Date(t).toISOString();
const bentuk = r => ({id: r.id, waktu: iso(r.t), lat: r.lat, lon: r.lon, m: r.m, mtipe: r.mtipe, dalam: r.dalam, wilayah: r.wilayah, prov: r.prov, kab: r.kab, sumber: r.sumber,
  tsunami: {kode: r.potensi, teks: r.potensi_teks, usgs: r.tsunami_usgs == null ? null : !!r.tsunami_usgs},
  dirasakan: r.dirasakan, mmi_maks: r.mmi_maks, shakemap: r.shakemap ? "https://cdn.bmkg.go.id/" + r.shakemap : null, pager: r.pager, kej: r.kej});
const bentukKej = (k, kini) => ({kode: k.kode, nama: k.nama, utama_id: k.utama_id, lat: k.lat, lon: k.lon, m: k.m, mulai: iso(k.mulai), akhir: iso(k.akhir),
  aktif_hingga: iso(k.aktif_hingga), aktif: k.aktif_hingga >= kini, jumlah: k.n});

/* ?jam= tidak ada -> 72; bukan salah satu dari 24/72/168/720 -> null (rute menjawab 400) */
const jamSah = url => { const j = url.searchParams.get("jam"); return j == null ? 72 : [24, 72, 168, 720].includes(+j) && /^\d+$/.test(j) ? +j : null; };
async function terbaru(env, url) {
  const jam = jamSah(url), kini = Date.now();
  const rows = (await env.DB.prepare("SELECT * FROM gempa WHERE t >= ? ORDER BY t DESC LIMIT 3000").bind(kini - jam * JAM).all()).results;
  const dibuat = await gempaDibuat(env);
  return json({dibuat: dibuat == null ? null : iso(dibuat), jam, n: rows.length, gempa: rows.map(bentuk)});
}
async function status(env) {
  const kini = Date.now(), s = (await env.DB.prepare("SELECT kunci, dibuat, isi FROM gempa_sumber").all()).results, n = await env.DB.prepare("SELECT count(*) n, max(t) t FROM gempa").first();
  return json({kini: iso(kini), n: n.n, gempa_terakhir: n.t == null ? null : iso(n.t),
    sumber: Object.fromEntries(s.map(x => [x.kunci, {dibuat: iso(x.dibuat), umur_detik: Math.round((kini - x.dibuat) / 1000), ...JSON.parse(x.isi || "{}")}]))});
}
const SQL_KEJ = "SELECT k.*, (SELECT count(*) FROM gempa g WHERE g.kej = k.kode) n FROM gempa_kejadian k";
async function kejadian(env, url, kode) {
  const kini = Date.now();
  if (!kode) {
    const rows = (await env.DB.prepare(SQL_KEJ + " WHERE k.akhir >= ? ORDER BY k.mulai DESC LIMIT 200").bind(kini - 30 * HARI).all()).results;
    return json({kejadian: rows.map(k => bentukKej(k, kini))});
  }
  if (!/^G\d{4,}$/.test(kode)) return gagal(404, "kejadian tidak ada");
  const k = await env.DB.prepare(SQL_KEJ + " WHERE k.kode = ?").bind(kode).first();
  if (!k) return gagal(404, "kejadian tidak ada");
  const g = (await env.DB.prepare("SELECT * FROM gempa WHERE kej = ? ORDER BY t LIMIT 1000").bind(kode).all()).results;
  return json({...bentukKej(k, kini), gempa: g.map(bentuk)});
}

/* worker.js memanggil layaniGempa untuk /api/gempa/*. Hanya GET/HEAD; kunci cache tepi = pathname + jam tervalidasi (parameter lain dibuang,
   supaya ?x=acak tidak membanjiri cache dan D1); galat D1 (migrasi belum jalan) = 503, kecuali terbaru = daftar kosong. */
export function gempaRute(jalur) {
  const j = jalur.replace(/\/+$/, "");
  if (j === "/api/gempa/terbaru") return terbaru;
  if (j === "/api/gempa/status") return status;
  if (j === "/api/gempa/kejadian") return (env, url) => kejadian(env, url, null);
  const m = j.match(/^\/api\/gempa\/kejadian\/([^/]+)$/);
  return m ? (env, url) => kejadian(env, url, m[1]) : null;
}
export async function layaniGempa(req, env, ctx, url) {
  const f = gempaRute(url.pathname); if (!f) return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  const jam = f === terbaru ? jamSah(url) : null;
  if (f === terbaru && jam == null) return gagal(400, "jam harus 24, 72, 168, atau 720");
  const kunci = new Request(url.origin + url.pathname.replace(/\/+$/, "") + (jam != null && url.searchParams.has("jam") ? `?jam=${jam}` : ""), {method: "GET"});
  const r = await cacheTepi(kunci, ctx, 60, async () => {
    try { return await f(env, url); }
    catch (e) {
      console.error("gempa api", url.pathname, e);
      return f === terbaru ? json({dibuat: null, jam: jam ?? 72, n: 0, gempa: []}) : gagal(503, "katalog gempa belum siap");
    }
  });
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
