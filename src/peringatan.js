/* Peringatan dini (docs/multi-bencana/PERINGATAN-DINI.md, tahap 1): aturan pemicu atas data yang SUDAH ada di Worker, hasilnya ditulis
   idempoten ke D1 `peringatan` (migrations/0010_peringatan.sql) dengan kunci "jenis:kode:jendela" (INSERT OR IGNORE: ulang = tetap satu).
   Dipanggil dari scheduled() sesudah cron gempa (tiap menit) — gagal-lunak: tabel belum ada (migrasi produksi belum jalan) atau aset
   hilang = diam, cron lain tidak terganggu.
   Aturan yang jalan:
   - gempa:   M >= 5 di darat atau <= 100 km dari pusat kecamatan, ATAU dirasakan >= MMI IV -> Waspada; M >= 6 dan dangkal (<= 60 km) -> Siaga.
   - tsunami: BMKG Potensi kode 1-3 -> Awas, berlabel InaTEWS. Tanpa pernyataan tsunami TIDAK ADA alarm, dan tidak pernah ditulis "aman".
   - cuaca:   nowcast BMKG (aset /banjir/data/peringatan.json) tingkat Severe -> Siaga, Extreme -> Awas.
   - karhutla: tugas api level 3 BARU (dibuat <= 6 jam, buka, bukan dummy) -> Siaga. Alarm Himawari TIDAK ikut: alarm siaga hanyalah perkiraan 2 km; baru setelah VIIRS membuat tugas
     (alarm terkunci) insidennya ada di tugas_api dan masuk lewat aturan ini. Tabel tugas (0029) belum ada = aturan dilewati.
   Belum ada (datanya tidak ada di Worker, tidak dikarang): banjir (kejadian_aktif_awal.json belum ada di aset).
   Keluaran: JSON /api/peringatan/aktif, CAP 1.2 /api/peringatan/aktif.cap, GeoJSON /api/peringatan/aktif.geojson (bentuk() yang sama, CORS *). */
import {json, gagal, cacheTepi, adminOK, tolakOrigin, sha} from "./worker.js";
import {modOK} from "./posko.js";
import {wilayah, cariWilayah} from "./titik.js";
import {wilayahTerdekat} from "./gempa.js";
import {PROV} from "./instansi.js";

const JAM = 3600e3, HARI = 24 * JAM, DANGKAL_KM = 60, DARAT_KM = 100, TEKS_MAKS = 600;
const SUMBER_BMKG = "https://www.bmkg.go.id/gempabumi/gempabumi-terkini.html", SUMBER_INATEWS = "https://inatews.bmkg.go.id/", SUMBER_CUACA = "https://www.bmkg.go.id/alerts/nowcast/id";
/* nilai sumber di D1 tetap "Deteksi Pantau Bencana" (CHECK di migrations/0010); yang tampil di API dan CAP "Deteksi Centurisk97" (merek, 26 Okt 2026) */
const DETEKSI_D1 = "Deteksi Pantau Bencana", DETEKSI = "Deteksi Centurisk97";
const KOLOM = ["kunci", "jenis", "tingkat", "prov", "kab", "lat", "lon", "judul", "teks", "sumber", "sumber_url", "dibuat", "berlaku_hingga"];

const potong = (s, n) => String(s ?? "").slice(0, n);
const koma = x => String(x).replace(".", ",");
const MASUK = "INSERT OR IGNORE INTO peringatan (" + KOLOM + ") VALUES (" + KOLOM.map(() => "?") + ")";

/* satu baris per pernyataan: baris yang melanggar CHECK dilewati, alarm sah lain tetap tertulis (batch akan membatalkan semuanya) */
async function tulis(st) {
  let n = 0;
  for (const s of st) { try { await s.run(); n++; } catch (e) { console.error("peringatan tulis", e?.message); } }
  return n;
}

/* ---------------- gempa & tsunami ---------------- */
/* tingkat gempa tanpa memeriksa darat/laut: 'Siaga' | 'Waspada' | null (murni, diuji) */
export const tingkatGempa = r => (r.m >= 6 && r.dalam != null && r.dalam <= DANGKAL_KM) ? "Siaga" : r.m >= 5 || r.mmi_maks >= 4 ? "Waspada" : null;
/* kejadian G (m >= 5) memberi kode stabil walau id berganti saat USGS bergabung dengan BMKG; gempa kecil dirasakan: sel 30 menit x 1 derajat */
// ponytail: sel waktu bisa membelah satu gempa kecil jadi dua alarm di batas 30 menit; cukup untuk MMI IV, perbaiki bila terlihat di produksi
const kode = r => r.kej ?? `q${Math.floor(r.t / 1.8e6)},${Math.round(r.lat)},${Math.round(r.lon)}`;

async function aturanGempa(env, kini) {
  const baris = (await env.DB.prepare("SELECT * FROM gempa WHERE t >= ? AND (m >= 5 OR mmi_maks >= 4 OR potensi BETWEEN 1 AND 3) ORDER BY t").bind(kini - 12 * JAM).all()).results;
  if (!baris.length) return 0;
  const ada = new Set((await env.DB.prepare("SELECT kunci FROM peringatan WHERE jenis IN ('gempa', 'tsunami') AND dibuat >= ?").bind(kini - HARI).all()).results.map(x => x.kunci));
  const st = []; let W = null;
  for (const r of baris) {
    if (r.potensi >= 1 && r.potensi <= 3) {
      const k = `tsunami:${potong(r.kej ?? r.id, 120)}:awas`;
      if (!ada.has(k)) { ada.add(k); st.push([k, "tsunami", "Awas", r, "Peringatan potensi tsunami", `${potong(r.potensi_teks, 300)}. ${potong(r.wilayah, 200)}. M${koma(r.m)}.`, "InaTEWS", SUMBER_INATEWS, r.t + 12 * JAM]); }
    }
    const tingkat = r.t >= kini - 6 * JAM ? tingkatGempa(r) : null;
    if (!tingkat) continue;
    const k = `gempa:${kode(r)}:${tingkat.toLowerCase()}`;
    if (ada.has(k)) continue;
    if (r.mmi_maks < 4) {   // jalur M >= 5 saja: wajib di darat atau <= 100 km dari pusat kecamatan (laut jauh tidak berbunyi)
      W ??= await wilayah(env);
      if (!cariWilayah(W, r.lat, r.lon) && !wilayahTerdekat(W, r.lat, r.lon, DARAT_KM)) continue;
    }
    ada.add(k);
    const dalam = r.dalam == null ? "" : ` Kedalaman ${Math.round(r.dalam)} km.`, rasa = r.dirasakan ? ` Dirasakan: ${potong(r.dirasakan, 200)}.` : "";
    st.push([k, "gempa", tingkat, r, `Gempa M${koma(r.m.toFixed(1))}${tingkat === "Siaga" ? " dangkal" : ""}`, `${potong(r.wilayah, 200)}.${dalam}${rasa}`,
      r.sumber === "usgs" ? DETEKSI_D1 : "BMKG", r.sumber === "usgs" && r.usgs_id ? "https://earthquake.usgs.gov/earthquakes/eventpage/" + encodeURIComponent(r.usgs_id) : SUMBER_BMKG,
      r.t + (tingkat === "Siaga" ? 12 : 6) * JAM]);
  }
  return tulis(st.map(([k, jenis, tingkat, r, judul, teks, sumber, url, hingga]) => {
    const ok = r.lat >= -11.5 && r.lat <= 6.5 && r.lon >= 94 && r.lon <= 142;   // di luar kotak CHECK: alarm tetap, titiknya NULL
    return env.DB.prepare(MASUK).bind(k, jenis, tingkat, r.prov, r.kab, ok ? r.lat : null, ok ? r.lon : null, potong(judul, 200), potong(teks, TEKS_MAKS), sumber, url, kini, hingga);
  }));
}

/* ---------------- cuaca BMKG (nowcast CAP dari aset statis) ---------------- */
const TINGKAT_CAP = {Severe: "Siaga", Extreme: "Awas"};
async function aturanCuaca(env, kini) {
  const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/peringatan.json"));
  if (!r.ok) { r.body?.cancel(); return 0; }
  const st = [];
  for (const x of (await r.json()).nowcast ?? []) {
    const tingkat = TINGKAT_CAP[x?.severity], hingga = Date.parse(x?.selesai);
    if (!tingkat || x.aktif === false || !x.id || !(hingga > kini)) continue;
    const prov = /^\d{2}$/.test(x.prov?.[0]) ? x.prov[0] : null;
    st.push(env.DB.prepare(MASUK).bind(`cuaca:${potong(x.id, 140)}:${tingkat.toLowerCase()}`, "cuaca", tingkat, prov, null, null, null, potong(x.headline || x.event || "Peringatan cuaca BMKG", 200),
      potong(x.deskripsi || x.wilayah, TEKS_MAKS), "BMKG", /^https:\/\//.test(x.url) ? x.url : SUMBER_CUACA, kini, hingga));
  }
  return tulis(st);
}

/* ---------------- karhutla: tugas api level 3 baru ---------------- */
const BARU_KARHUTLA = 6 * JAM, BERLAKU_KARHUTLA = 12 * JAM;
async function aturanKarhutla(env, kini) {
  let rows;
  try { rows = (await env.DB.prepare("SELECT id, prov, kab, kec, lat, lon, n24, luas_ha, dibuat FROM tugas_api WHERE level = 3 AND status = 'buka' AND dummy = 0 AND dibuat >= ? ORDER BY dibuat DESC LIMIT 50").bind(kini - BARU_KARHUTLA).all()).results; }
  catch (e) { if (/no such (table|column)/i.test(String(e?.message))) return 0; throw e; }   // migrasi 0029 belum diterapkan: aturan ini diam
  const nama = r => [r.kec, r.kab, PROV[r.prov]?.[1]].filter(Boolean).join(", ");
  const kunci = await Promise.all(rows.map(async r => (await sha("pk|" + r.id)).slice(0, 12)));   // id tugas tidak keluar di feed publik
  return tulis(rows.map((r, i) => {
    const lat = Math.round(r.lat * 100) / 100, lon = Math.round(r.lon * 100) / 100, ok = lat >= -11.5 && lat <= 6.5 && lon >= 94 && lon <= 142;   // 0,01 derajat (~1 km): bukan titik tepat
    return env.DB.prepare(MASUK).bind(`karhutla:${kunci[i]}:siaga`, "karhutla", "Siaga", r.prov, potong(r.kab, 80), ok ? lat : null, ok ? lon : null, potong(`Api level 3 baru di ${nama(r)}`, 200),
      potong(`Cluster titik api level 3 (${r.n24} titik panas 24 jam${r.luas_ha ? `, perkiraan ${Math.round(r.luas_ha)} ha` : ""}) terdeteksi satelit di ${nama(r)}. Perlu konfirmasi lapangan; lokasi dibulatkan 0,01 derajat.`, TEKS_MAKS),
      DETEKSI_D1, null, kini, r.dibuat + BERLAKU_KARHUTLA);
  }));
}

/* ---------------- satu putaran ---------------- */
/* tidak pernah melempar. cuaca hanya tiap 10 menit (berkasnya statis, berubah sejarang itu). */
export async function periksaPeringatan(env, kini = Date.now()) {
  const hasil = {};
  const tugas = [["gempa", aturanGempa], ["karhutla", aturanKarhutla], ...(new Date(kini).getUTCMinutes() % 10 === 0 ? [["cuaca", aturanCuaca]] : [])];
  for (const [nama, f] of tugas) {
    try { hasil[nama] = await f(env, kini); }
    catch (e) { if (/no such table/i.test(e?.message)) return {lewat: "tabel peringatan belum ada (migrasi 0010)"}; console.error("peringatan", nama, e?.message); hasil[nama] = "galat"; }
  }
  return hasil;
}

export const bersihkanPeringatan = (env, kini = Date.now()) =>
  env.DB.prepare("DELETE FROM peringatan WHERE berlaku_hingga <= ?").bind(kini - 7 * HARI).run();

/* ---------------- API ---------------- */
const iso = t => new Date(t).toISOString();
const bentuk = r => ({kunci: r.kunci, jenis: r.jenis, tingkat: r.tingkat, prov: r.prov, kab: r.kab, lat: r.lat, lon: r.lon, judul: r.judul, teks: r.teks,
  sumber: r.sumber === DETEKSI_D1 ? DETEKSI : r.sumber, sumber_url: r.sumber_url, dibuat: iso(r.dibuat), berlaku_hingga: iso(r.berlaku_hingga)});

async function muatAktif(env, sejak) {
  const kini = Date.now();
  try {
    const rows = (await env.DB.prepare("SELECT * FROM peringatan WHERE berlaku_hingga > ? AND dicabut IS NULL AND dibuat >= ? ORDER BY dibuat DESC LIMIT 50").bind(kini, sejak).all()).results;
    return {kini, daftar: rows.map(bentuk)};
  } catch (e) { console.error("peringatan api", e?.message); return {kini, daftar: []}; }   // migrasi belum jalan / D1 galat: daftar kosong, bukan 5xx
}
const aktif = async (env, sejak) => { const {kini, daftar} = await muatAktif(env, sejak); return json({kini: iso(kini), n: daftar.length, peringatan: daftar}); };

/* GeoJSON: satu Feature per peringatan (Point bila ada koordinat, geometry null bila tidak); properties = bentuk() persis */
const aktifGeo = async (env, sejak) => {
  const {kini, daftar} = await muatAktif(env, sejak);
  return new Response(JSON.stringify({type: "FeatureCollection", kini: iso(kini), features: daftar.map(p => ({type: "Feature", id: p.kunci, geometry: p.lat != null && p.lon != null ? {type: "Point", coordinates: [p.lon, p.lat]} : null, properties: p}))}),
    {headers: {"content-type": "application/geo+json; charset=utf-8", "x-content-type-options": "nosniff"}});
};

/* CAP 1.2 (OASIS): SATU <alert> sah berisi satu <info> per peringatan aktif. Kategori: gempa/tsunami Geo, cuaca Met, karhutla Fire. Tingkat -> Awas Extreme/Immediate, Siaga Severe/Expected, Waspada Moderate/Expected.
   Koordinat -> <circle> "lat,lon 0" (titik); tanpa koordinat -> hanya areaDesc + geocode BPS provinsi. Waktu CAP wajib berzona: +00:00, bukan Z. */
const xml = x => String(x ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"})[c]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
const capWaktu = t => new Date(t).toISOString().replace(/\.\d+Z$/, "+00:00");
const CAP_KATEGORI = {gempa: "Geo", tsunami: "Geo", cuaca: "Met", karhutla: "Fire", banjir: "Met"}, CAP_TINGKAT = {Awas: ["Extreme", "Immediate"], Siaga: ["Severe", "Expected"], Waspada: ["Moderate", "Expected"]};
const CAP_PASTI = {gempa: "Observed", tsunami: "Likely", cuaca: "Likely", karhutla: "Likely", banjir: "Likely"}, CAP_EVENT = {gempa: "Gempa bumi", tsunami: "Potensi tsunami", cuaca: "Cuaca ekstrem", karhutla: "Kebakaran hutan dan lahan", banjir: "Banjir"};
export function bentukCap(daftar, kini) {
  const info = p => {
    const [sev, urg] = CAP_TINGKAT[p.tingkat] ?? ["Unknown", "Unknown"], lokasi = [p.kab, PROV[p.prov]?.[1]].filter(Boolean).join(", ") || "Indonesia";
    return `  <info>
    <language>id</language>
    <category>${CAP_KATEGORI[p.jenis] ?? "Other"}</category>
    <event>${xml(CAP_EVENT[p.jenis] ?? p.jenis)}</event>
    <urgency>${urg}</urgency>
    <severity>${sev}</severity>
    <certainty>${CAP_PASTI[p.jenis] ?? "Unknown"}</certainty>
    <effective>${capWaktu(Date.parse(p.dibuat))}</effective>
    <expires>${capWaktu(Date.parse(p.berlaku_hingga))}</expires>
    <senderName>Centurisk97 (${xml(p.sumber)})</senderName>
    <headline>${xml(p.judul)}</headline>
    <description>${xml(p.teks)}</description>${p.sumber_url ? `\n    <web>${xml(p.sumber_url)}</web>` : ""}
    <parameter><valueName>kunci</valueName><value>${xml(p.kunci)}</value></parameter>
    <area>
      <areaDesc>${xml(lokasi)}</areaDesc>${p.lat != null && p.lon != null ? `\n      <circle>${p.lat},${p.lon} 0</circle>` : ""}${p.prov ? `\n      <geocode><valueName>BPS</valueName><value>${xml(p.prov)}</value></geocode>` : ""}
    </area>
  </info>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>centurisk97.id-${kini}</identifier>
  <sender>centurisk97.id</sender>
  <sent>${capWaktu(kini)}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <note>Peringatan aktif Centurisk97 (gempa, tsunami, cuaca BMKG, karhutla). ${daftar.length} peringatan. Satu blok info per peringatan.</note>
${daftar.map(info).join("\n")}
</alert>
`;
}
const aktifCap = async (env, sejak) => { const {kini, daftar} = await muatAktif(env, sejak); return new Response(bentukCap(daftar, kini), {headers: {"content-type": "application/cap+xml; charset=utf-8", "x-content-type-options": "nosniff"}}); };

async function cabut(env, req, kunci, kini) {
  const mod = await modOK(env, req);   // moderator ke atas: akun gerbang situs (AKUN_SITUS) tidak boleh mencabut peringatan
  if (!mod) return gagal(403, "perlu moderator (ADMIN_TOKEN); akun gerbang situs tidak cukup");
  if (!/^[\w:.,|+\-]{3,200}$/.test(kunci)) return gagal(404, "peringatan tidak ada");
  const r = await env.DB.prepare("UPDATE peringatan SET dicabut = ?, dicabut_oleh = ? WHERE kunci = ? AND dicabut IS NULL").bind(kini, mod, kunci).run();
  if (r.meta.changes) return json({ok: true});
  return (await env.DB.prepare("SELECT 1 x FROM peringatan WHERE kunci = ?").bind(kunci).first()) ? json({ok: true, sudah: true}) : gagal(404, "peringatan tidak ada");
}

/* GET/HEAD /api/peringatan/aktif?sejak=<epoch ms> (cache tepi 30 dtk; kunci cache = jalur + sejak dibulatkan ke menit, parameter lain dibuang)
   POST /api/admin/peringatan/<kunci>/cabut (modOK PERTAMA, CSRF tolakOrigin seperti rute() lain) */
export async function layaniPeringatan(req, env, ctx, url) {
  const j = url.pathname.replace(/\/+$/, ""), BACA = {"/api/peringatan/aktif": aktif, "/api/peringatan/aktif.cap": aktifCap, "/api/peringatan/aktif.geojson": aktifGeo};
  if (Object.hasOwn(BACA, j)) {
    if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
    const s = url.searchParams.get("sejak"), dibulat = /^\d{1,15}$/.test(s ?? "") ? Math.floor(+s / 60e3) * 60e3 : 0,
      sejak = dibulat >= Date.now() - 7 * HARI ? dibulat : 0;   // lebih tua dari 7 hari = diabaikan (kunci cache tak bisa diputar tanpa batas)
    const kunci = new Request(url.origin + j + (sejak ? `?sejak=${sejak}` : ""), {method: "GET"});
    const r = await cacheTepi(kunci, ctx, 30, () => BACA[j](env, sejak)), h = new Headers(r.headers); h.set("access-control-allow-origin", "*");   // feed publik baca-saja: boleh dipakai lintas situs
    return new Response(req.method === "HEAD" ? null : r.body, {status: r.status, headers: h});
  }
  const m = j.match(/^\/api\/admin\/peringatan\/([^/]+)\/cabut$/);
  if (!m) return null;
  if (req.method !== "POST") return gagal(405, "hanya POST", {allow: "POST"});
  const x = tolakOrigin(req, url); if (x) return x;   // gerbang CSRF yang sama dengan rute(): dengan cookie sesi_admin, Origin kosong/"null" ditolak
  try { return await cabut(env, req, decodeURIComponent(m[1]), Date.now()); }
  catch (e) { console.error("cabut peringatan", e?.message); return gagal(500, "galat server"); }
}
