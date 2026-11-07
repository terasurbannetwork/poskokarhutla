/* Sensor lapangan (kontrak L1: docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md; migrasi 0089).
   POST /api/sensor/baca: badan JSON {alat, waktu, nilai:{...}, baterai?, rssi?, waktu_asli?}, header X-Sensor-Tanda = HMAC-SHA256(badan MENTAH) hex huruf kecil.
   POST /api/sensor/lapor: {alat (jenis gateway), waktu, pengirim_node, teks}, tanda tangan sama; laporan teks desa tanpa sinyal -> antrean pengingat Pusdalops.
   KUNCI: Worker harus mengenal kunci untuk memverifikasi HMAC, jadi kunci alat DITURUNKAN, bukan disimpan: kunci_alat = HMAC-SHA256(secret SENSOR_KUNCI_INDUK, id alat) hex 64,
   dipakai firmware/gateway sebagai string UTF-8 apa adanya (sensor/gateway/penanda.py). D1 bocor tanpa secret = tak ada kunci. Kunci/tanda tidak pernah dicatat atau dikembalikan.
   Alat tak dikenal dan tanda salah dijawab sama (401). waktu = waktu kirim, wajib +-10 menit dari server; waktu_asli (opsional, <= 24 jam lalu) = waktu ukur bacaan tertunda dan
   menjadi kunci simpan (alat, waktu). Ambang (sensor_alat.ambang) = {"<kunci nilai>": {"waspada": n, "siaga": n, "awas": n}}, terlewati bila nilai >= n; nilai null (sensor rusak) tidak dinilai.
   Terlewati = baris antrean `pengingat` (jenis sensor_ambang), BUKAN peringatan publik: bacaan belum diverifikasi manusia dan /api/peringatan/aktif terbuka untuk umum.
   Satu baris per (alat, tingkat, hari WIB). */
import {json, gagal, bacaBytes, sha, acak, ipHash} from "./worker.js";
import {laju} from "./bnpb.js";
import {modAtauStaf} from "./staf.js";
import {wib} from "./posko.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], MAKS_BADAN = 1024, TUA_MAKS = 24 * 3600e3, KONTROL = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\ufeff]/g, SELISIH = 10 * 6e4, LAJU_ALAT = [[5 * 6e4, 30]], LAJU_IP = [[6e4, 300]], BASI = 3600e3, TINGKAT = ["waspada", "siaga", "awas"];
const RE_ID = /^[A-Za-z0-9_-]{3,40}$/, RE_TANDA = /^(?:sha256=)?([0-9a-f]{64})$/i, RE_KUNCI = /^[a-z][a-z0-9_]{0,23}$/;
const enc = new TextEncoder(), hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");

/* kunci alat (hex 64) untuk skrip pendaftaran alat; HANYA dari secret induk + id alat */
export async function kunciAlat(induk, id) {
  const k = await crypto.subtle.importKey("raw", enc.encode(induk), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(id)));
}
export const tandaSah = async (kunci, badan, tandaHex) => {
  const k = await crypto.subtle.importKey("raw", enc.encode(kunci), {name: "HMAC", hash: "SHA-256"}, false, ["verify"]);
  return crypto.subtle.verify("HMAC", k, Uint8Array.from(tandaHex.match(/../g), x => parseInt(x, 16)), badan);   // banding waktu-tetap
};
/* tingkat tertinggi yang terlewati: "awas" | "siaga" | "waspada" | null (murni, diuji) */
export function tingkatAmbang(ambang, nilai) {
  let t = -1, kunci = null;
  for (const [k, a] of Object.entries(ambang || {})) {
    const v = nilai?.[k]; if (typeof v !== "number" || !a || typeof a !== "object") continue;
    TINGKAT.forEach((n, i) => { if (typeof a[n] === "number" && v >= a[n] && i > t) { t = i; kunci = k; } });
  }
  return t < 0 ? null : {tingkat: TINGKAT[t], kunci};
}
const waktuBaca = v => { const t = typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN; return Number.isFinite(t) ? Math.round(t) : null; };

/* gerbang bersama: konfigurasi, tanda tangan, alat aktif, waktu kirim, batas laju. Mengembalikan {r: Response} atau {a, o, kini}. tabel = sensor_baca | sensor_lapor */
async function masuk(env, req, kini, tabel, jenisAlat) {
  if (!env.SENSOR_KUNCI_INDUK) return {r: gagal(503, "sensor belum dikonfigurasi (secret SENSOR_KUNCI_INDUK)")};
  const tanda = (req.headers.get("x-sensor-tanda") || "").match(RE_TANDA)?.[1]?.toLowerCase();
  if (!tanda) return {r: gagal(401, "tanda tangan tidak sah")};
  const lip = await laju(env, await ipHash(env, req), "sensor_ip", LAJU_IP, kini); if (lip) return {r: lip};   // semua kiriman, sah atau tidak, sebelum menyentuh sensor_alat
  const r = await bacaBytes(req, MAKS_BADAN); if (r.galat) return {r: gagal(r.status || 400, r.galat)};
  let o; try { o = JSON.parse(new TextDecoder().decode(r.b)); } catch (e) { return {r: gagal(401, "tanda tangan tidak sah")}; }   // bukan JSON = tidak ada oracle format sebelum HMAC
  if (!o || typeof o !== "object" || Array.isArray(o) || typeof o.alat !== "string" || !RE_ID.test(o.alat)) return {r: gagal(401, "tanda tangan tidak sah")};
  const a = await env.DB.prepare("SELECT id, jenis, kab, ambang, aktif FROM sensor_alat WHERE id = ?").bind(o.alat).first();
  const sah = await tandaSah(await kunciAlat(env.SENSOR_KUNCI_INDUK, a?.id ?? "tidak-ada-alat"), r.b, tanda);   // alat tak dikenal tetap menghitung HMAC: waktu sama dengan tanda salah
  if (!a || !sah) return {r: gagal(401, "tanda tangan tidak sah")};
  if (!a.aktif) return {r: gagal(403, "alat tidak aktif")};
  const la = await laju(env, "sensor:" + a.id, "sensor_alat_" + tabel, LAJU_ALAT, kini); if (la) return {r: la};   // tiap kiriman bertanda sah dihitung, duplikat juga
  if ((a.jenis === "gateway") !== (jenisAlat === "gateway")) return {r: gagal(403, jenisAlat === "gateway" ? "hanya alat jenis gateway yang boleh melapor" : "gateway tidak mengirim bacaan sensor; pakai /api/sensor/lapor")};
  const w = waktuBaca(o.waktu);
  if (w == null || Math.abs(w - kini) > SELISIH) return {r: json({galat: "waktu kirim menyimpang lebih dari 10 menit dari waktu server; setel jam alat atau kirim waktu_asli", kini}, 400)};
  return {a, o, w};
}
async function baca(env, req, kini) {
  const g = await masuk(env, req, kini, "sensor_baca", "sensor"); if (g.r) return g.r;
  const {a, o} = g; let w = g.w;
  if (o.waktu_asli != null) {
    const t = waktuBaca(o.waktu_asli);
    if (t == null || t > w + SELISIH || t < kini - TUA_MAKS) return gagal(400, "waktu_asli harus tidak lebih dari 24 jam lalu dan tidak melewati waktu kirim");
    w = t;
  }
  const n = o.nilai, k = n && typeof n === "object" && !Array.isArray(n) ? Object.entries(n) : null;
  if (!k || !k.length || k.length > 8 || k.some(([kk, v]) => !RE_KUNCI.test(kk) || (v !== null && (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e9)))) return gagal(400, "nilai harus objek 1-8 entri berkunci huruf kecil, angka atau null (sensor rusak)");
  const bat = o.baterai ?? null, rssi = o.rssi ?? null;
  if ((bat != null && !(typeof bat === "number" && bat >= 0 && bat <= 100)) || (rssi != null && !(typeof rssi === "number" && rssi >= -200 && rssi <= 0))) return gagal(400, "baterai 0-100, rssi -200..0");
  const res = await env.DB.prepare("INSERT OR IGNORE INTO sensor_baca (alat_id, waktu, nilai, baterai, rssi, diterima) VALUES (?, ?, ?, ?, ?, ?)").bind(a.id, w, JSON.stringify(n), bat, rssi, kini).run();
  if (!res.meta.changes) return json({ok: true, duplikat: true});
  let ambangObj = {}; try { ambangObj = JSON.parse(a.ambang); } catch (e) {}
  const t = tingkatAmbang(ambangObj, n);
  if (t) await masukPengingat(env, a, "sensor_ambang", `${t.tingkat}:${wib(kini)}`, a.id, `Sensor ${a.jenis} ${a.id}${namaKab(a)}: ${t.tingkat} (${t.kunci} ${n[t.kunci]})`, `Bacaan ${new Date(w).toISOString()}: ${JSON.stringify(n)}`, kini);
  return json({ok: true, tingkat: t?.tingkat ?? null});
}
async function lapor(env, req, kini) {
  const g = await masuk(env, req, kini, "sensor_lapor", "gateway"); if (g.r) return g.r;
  const {a, o, w} = g, node = typeof o.pengirim_node === "string" ? o.pengirim_node.trim() : "", teksBersih = typeof o.teks === "string" ? o.teks.replace(KONTROL, " ").replace(/\s+/g, " ").trim() : "";
  if (!/^[A-Za-z0-9!_.:-]{1,40}$/.test(node)) return gagal(400, "pengirim_node 1-40 karakter [A-Za-z0-9!_.:-]");
  if (teksBersih.length < 1 || teksBersih.length > 500) return gagal(400, "teks 1-500 karakter");
  const id = (await sha(`lapor|${a.id}|${w}|${node}|${teksBersih}`)).slice(0, 16);
  const res = await env.DB.prepare("INSERT OR IGNORE INTO sensor_lapor (id, alat_id, waktu, pengirim_node, teks, diterima) VALUES (?, ?, ?, ?, ?, ?)").bind(id, a.id, w, node, teksBersih, kini).run();
  if (!res.meta.changes) return json({ok: true, duplikat: true});
  await masukPengingat(env, a, "sensor_lapor", "baru", id, `Laporan desa via radio mesh (${node})${namaKab(a)}: ${teksBersih.slice(0, 80)}`, `Dari node ${node} lewat ${a.id}, ${new Date(w).toISOString()}: ${teksBersih}`, kini);
  return json({ok: true});
}
const namaKab = a => { const n = a.kab?.includes("|") ? a.kab.split("|")[1] : a.kab; return n ? `, ${n}` : ""; };
/* gagal-lunak: tabel/jenis pengingat belum dimigrasi (0088) tidak boleh membuang kiriman yang sudah tersimpan */
async function masukPengingat(env, a, jenis, keadaan, sumber, judul, rincian, kini) {
  const nama = a.kab?.includes("|") ? a.kab.split("|")[1] : a.kab;
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, rincian, prov, kab, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 0)`)
      .bind(acak(8), jenis, (await sha("sensor|" + sumber)).slice(0, 16), keadaan, wib(kini), judul.slice(0, 160), rincian.slice(0, 300), nama && nama.length >= 2 && nama.length <= 60 ? nama : null, kini).run();
  } catch (e) { console.error("sensor pengingat", e?.message); }
}
async function status(env, req, kini) {
  if (!await modAtauStaf(env, req, PERAN)) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const rows = (await env.DB.prepare(`SELECT a.id, a.jenis, a.kab, a.desa, a.lat, a.lon, a.ambang, a.aktif, b.waktu, b.nilai, b.baterai, b.rssi FROM sensor_alat a
    LEFT JOIN sensor_baca b ON b.alat_id = a.id AND b.waktu = (SELECT max(waktu) FROM sensor_baca WHERE alat_id = a.id) ORDER BY a.id LIMIT 500`).all()).results;
  return json({alat: rows.map(r => {
    const nilai = r.waktu == null ? null : JSON.parse(r.nilai), umur = r.waktu == null ? null : Math.max(0, Math.round((kini - r.waktu) / 1000));
    let amb = {}; try { amb = JSON.parse(r.ambang); } catch (e) {}
    return {id: r.id, jenis: r.jenis, kab: r.kab, desa: r.desa, lat: r.lat, lon: r.lon, aktif: !!r.aktif, ambang: amb, terakhir: r.waktu, umur_detik: umur, nilai, baterai: r.baterai, rssi: r.rssi,
      tingkat: nilai ? tingkatAmbang(amb, nilai)?.tingkat ?? null : null, basi: umur == null || umur * 1000 > BASI};
  })}, 200, {"cache-control": "no-store"});
}
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "sensor belum diaktifkan (migrasi 0089_sensor belum diterapkan)"); throw e; }
};
export const RUTE_SENSOR = {
  "POST /api/sensor/baca": tabelBelum((env, req, url, kini) => baca(env, req, kini)),
  "POST /api/sensor/lapor": tabelBelum((env, req, url, kini) => lapor(env, req, kini)),
  "GET /api/sensor/status": tabelBelum((env, req, url, kini) => status(env, req, kini)),
};
