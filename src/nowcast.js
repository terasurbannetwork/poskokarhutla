/* Nowcast peringatan dini cuaca BMKG (CAP 1.2) hampir-waktu-nyata. Peringatan hidup 2-3 jam, sedangkan peringatan.json
   (scripts/banjir/peringatan.py) dibangun sekali sehari, jadi Worker menariknya sendiri: cron "* * * * *" (CRON_GEMPA) memanggil
   perbaruiNowcast bila menit % 10 == 0. RSS -> tiap tautan *_alert.xml yang belum ada di D1 -> uraiCAP -> upsert cuaca_nowcast
   (migrations/0014). Bentuk keluaran GET /api/cuaca/nowcast = nowcast[] peringatan.json + `dibuat` (+ `terbit` = lastBuildDate RSS BMKG).
   Gagal-lunak: BMKG mati = data terakhir dengan stempel waktu aslinya, tidak pernah mengarang; tabel belum ada = 503.
   Beda dari peringatan.py: prov[] hanya dari poligon (tanpa pemetaan nama area -> kode). Teks luar didekode lalu dibersihkan dan dipotong. */
import {json, gagal, cacheTepi} from "./worker.js";
import {wilayah, cariWilayah} from "./titik.js";

const JAM = 3600e3, RSS = "https://www.bmkg.go.id/alerts/nowcast/id", TIMEOUT_MS = 8000, MAKS_BYTE = 1e6, MAKS_CAP = 30;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const TAUTAN = /^https:\/\/www\.bmkg\.go\.id\/alerts\/nowcast\/id\/[\w.-]{1,80}_alert\.xml$/;
const ENT = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'"};

/* teks luar -> teks polos: dekode entitas XML/CDATA, buang tag, kontrol, < > &; potong. Klien tetap meng-esc saat menampilkan. */
export const bersih = (s, maks) => String(s ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&(amp|lt|gt|quot|apos);|&#(\d+);/g, (_, n, d) => n ? ENT[n] : +d <= 0x10ffff ? String.fromCodePoint(+d) : "")
  .replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b-\u001f\u007f<>&\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, maks);
const tag = (x, n) => x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${n}>`))?.[1] ?? "";
const waktu = s => { const t = Date.parse(s); return Number.isFinite(t) ? t : null; };

/* RSS -> {terbit (ms atau null), tautan[]}; bukan RSS = lempar (jangan menandai sumber sehat dari halaman tantangan) */
export function uraiRSS(xml) {
  if (!/<rss[\s>]/.test(xml)) throw new Error("bukan RSS");
  const tautan = [...new Set([...xml.matchAll(/<link>\s*(https:\/\/[^<\s]+_alert\.xml)\s*<\/link>/g)].map(m => m[1]).filter(u => TAUTAN.test(u)))];
  return {terbit: waktu(tag(xml.replace(/<item>[\s\S]*<\/item>/, ""), "lastBuildDate")), tautan};
}

/* "lat,lon lat,lon ..." -> [[lon, lat], ...] 3 desimal; cincin rusak/di luar Indonesia = null */
function poligon(teks) {
  const out = [];
  for (const p of String(teks).trim().split(/\s+/)) {
    const [la, lo] = p.split(",").map(Number);
    if (!(la >= -12 && la <= 7 && lo >= 94 && lo <= 142)) return null;
    out.push([Math.round(lo * 1e3) / 1e3, Math.round(la * 1e3) / 1e3]);
  }
  return out.length >= 3 && out.length <= 1500 ? out : null;
}

/* satu berkas CAP -> {t: ms selesai, p: peringatan tanpa prov/url/aktif} atau null bila tak sah */
export function uraiCAP(xml) {
  if (xml.length > MAKS_BYTE || !/<alert[\s>]/.test(xml)) return null;
  const info = tag(xml, "info"), area = tag(info, "area"), g = (x, k, m = 200) => bersih(tag(x, k), m);
  const id = g(xml, "identifier", 120), mulai = g(info, "effective", 40) || g(xml, "sent", 40), selesai = g(info, "expires", 40), t = waktu(selesai);
  if (!/^[\w.:-]{3,120}$/.test(id) || t == null || waktu(mulai) == null) return null;
  const desk = g(info, "description", 1500), polys = [...area.matchAll(/<polygon>([^<]*)<\/polygon>/g)].slice(0, 20).map(m => poligon(m[1])).filter(Boolean);
  const web = bersih(tag(info, "web"), 300);
  return {t, p: {id, event: g(info, "event", 80), severity: g(info, "severity", 20), urgency: g(info, "urgency", 20), certainty: g(info, "certainty", 20),
    mulai, selesai, wilayah: (desk.match(/khususnya di (.+?)\.\s/)?.[1] ?? g(area, "areaDesc")).trim().slice(0, 600), headline: g(info, "headline", 200),
    deskripsi: desk.split(/(?<=\.)\s/)[0].slice(0, 240), polygon: polys.length ? polys : null, web: /^https:\/\/[\w.-]+\.bmkg\.go\.id\//.test(web) ? web : null}};
}

/* ringkasan permanen satu CAP untuk cuaca_arsip (migrasi 0021): bbox dari semua poligon, poligon disederhanakan (<= 8 cincin x <= 12 titik) */
export function ringkasArsip(p, prov) {
  const polys = p.polygon ?? [], semua = polys.flat();
  const bbox = semua.length ? [Math.min(...semua.map(x => x[0])), Math.min(...semua.map(x => x[1])), Math.max(...semua.map(x => x[0])), Math.max(...semua.map(x => x[1]))] : null;
  const tipis = ring => { const k = Math.max(1, Math.ceil(ring.length / 12)); return ring.filter((_, i) => i % k === 0).slice(0, 12); };
  return {id: p.id, event: p.event, tingkat: TINGKAT.has(p.severity) ? p.severity : "Unknown", mulai: waktu(p.mulai), selesai: waktu(p.selesai), bbox: bbox && JSON.stringify(bbox),
    poligon: polys.length ? JSON.stringify(polys.slice(0, 8).map(tipis)) : null, wilayah: p.wilayah, prov: prov.join(",")};
}
const TINGKAT = new Set(["Minor", "Moderate", "Severe", "Extreme"]);   // CHECK cuaca_arsip.tingkat; selain itu 'Unknown'
const SQL_ARSIP = `INSERT INTO cuaca_arsip (id, event, tingkat, mulai, selesai, bbox, poligon, wilayah, prov, pertama_dilihat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET event = excluded.event, tingkat = excluded.tingkat, mulai = excluded.mulai, selesai = excluded.selesai, bbox = excluded.bbox, poligon = excluded.poligon, wilayah = excluded.wilayah, prov = excluded.prov`;
const stmtArsip = (env, r, dilihat) => env.DB.prepare(SQL_ARSIP).bind(r.id, r.event, r.tingkat, r.mulai ?? r.selesai, r.selesai, r.bbox, r.poligon, r.wilayah, r.prov, dilihat);

/* badan respons teks dengan batas: tolak lewat content-length, lalu hitung byte selagi mengalir dan hentikan saat melewati batas */
export async function bacaBatas(r, maks) {
  if (+r.headers.get("content-length") > maks) { r.body?.cancel(); throw new Error("badan terlalu besar"); }
  const rd = r.body.getReader(), dec = new TextDecoder(); let n = 0, t = "";
  for (;;) {
    const {value, done} = await rd.read(); if (done) break;
    n += value.length; if (n > maks) { rd.cancel().catch(() => {}); throw new Error("badan terlalu besar"); }
    t += dec.decode(value, {stream: true});
  }
  return t + dec.decode();
}

async function unduh(url) {
  const r = await fetch(url, {headers: {"user-agent": UA, accept: "application/xml, text/xml, */*;q=0.8", "accept-language": "id,en;q=0.8"}, signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (!r.ok) { r.body?.cancel(); throw new Error(`HTTP ${r.status}`); }
  return bacaBatas(r, MAKS_BYTE);
}

/* satu putaran cron. RSS gagal = data lama utuh dan stempel TIDAK maju. CAP gagal satuan = dicoba lagi putaran depan (belum ada di D1). */
export async function perbaruiNowcast(env, kini = Date.now()) {
  let rss; try { rss = uraiRSS(await unduh(RSS)); } catch (e) { return {galat: "rss: " + e.message}; }
  const ada = new Set((await env.DB.prepare("SELECT url FROM cuaca_nowcast WHERE selesai > ?").bind(kini - 6 * JAM).all()).results.map(r => r.url));
  const baru = rss.tautan.filter(u => !ada.has(u)).slice(0, MAKS_CAP);
  let W = null; if (baru.length) try { W = await wilayah(env); } catch (e) { console.error("wilayah nowcast", e.message); }
  const tulis = [], arsip = [], galat = []; let rusak = 0;
  for (const u of baru) {
    try {
      const c = uraiCAP(await unduh(u)); if (!c) { rusak++; continue; }
      const prov = new Set();
      if (W) for (const ring of c.p.polygon ?? []) for (let i = 0; i < ring.length; i += Math.max(1, Math.floor(ring.length / 8))) { const w = cariWilayah(W, ring[i][1], ring[i][0]); if (w) prov.add(w.split("|")[0]); }
      tulis.push(env.DB.prepare("INSERT INTO cuaca_nowcast (id, url, selesai, isi, dibuat) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET url = excluded.url, selesai = excluded.selesai, isi = excluded.isi")
        .bind(c.p.id, u, c.t, JSON.stringify({...c.p, prov: [...prov].sort(), url: u}), kini));
      arsip.push(stmtArsip(env, ringkasArsip(c.p, [...prov].sort()), kini));
    } catch (e) { galat.push(`${u.split("/").pop()}: ${e.message}`); }
  }
  /* arsip permanen terpisah dari batch aktif: migrasi 0021 belum jalan tidak boleh menjatuhkan nowcast. Baris yang akan dihapus ikut diarsipkan dulu (menutup CAP
     yang masuk sebelum 0021 atau saat arsip gagal); pertama_dilihat = kapan baris aktifnya dibuat. */
  try {
    const lewat = (await env.DB.prepare("SELECT isi, dibuat FROM cuaca_nowcast WHERE selesai < ? LIMIT 500").bind(kini - 6 * JAM).all()).results;
    for (const r of lewat) { const p = JSON.parse(r.isi); arsip.push(stmtArsip(env, ringkasArsip(p, p.prov ?? []), r.dibuat)); }
    if (arsip.length) await env.DB.batch(arsip);
  } catch (e) { console.error("arsip nowcast", e?.message); }
  await env.DB.batch([...tulis, env.DB.prepare("DELETE FROM cuaca_nowcast WHERE selesai < ?").bind(kini - 6 * JAM),
    env.DB.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('nowcast', ?, ?) ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat")
      .bind(JSON.stringify({terbit: rss.terbit, item: rss.tautan.length, baru: tulis.length, rusak, gagal: galat.length}), kini)]);
  return {item: rss.tautan.length, baru: tulis.length, rusak, galat};
}

/* untuk /api/status: kapan RSS BMKG terakhir menjawab sehat */
export async function nowcastDibuat(env) {
  try { return (await env.DB.prepare("SELECT dibuat FROM cuaca_sumber WHERE kunci = 'nowcast'").first())?.dibuat ?? null; } catch (e) { return null; }
}

async function daftar(env) {
  const kini = Date.now(), s = await env.DB.prepare("SELECT isi, dibuat FROM cuaca_sumber WHERE kunci = 'nowcast'").first();
  const rows = (await env.DB.prepare("SELECT isi FROM cuaca_nowcast WHERE selesai > ? ORDER BY selesai DESC LIMIT 200").bind(kini).all()).results;
  const terbit = s ? JSON.parse(s.isi || "{}").terbit : null;
  return json({dibuat: s ? new Date(s.dibuat).toISOString() : null, terbit: terbit ? new Date(terbit).toISOString() : null, nowcast: rows.map(r => ({...JSON.parse(r.isi), aktif: true}))});
}

const TGL = /^\d{4}-\d{2}-\d{2}$/, MAKS_ARSIP = 1000, MAKS_RENTANG = 62;
const hari = s => { if (!TGL.test(s)) return null; const t = Date.parse(s + "T00:00:00Z"); return Number.isFinite(t) && new Date(t).toISOString().startsWith(s) && t >= Date.parse("2020-01-01T00:00:00Z") ? t : null; };

/* GET /api/cuaca/arsip?dari=YYYY-MM-DD&sampai=YYYY-MM-DD (tanggal UTC, dua-duanya termasuk, menurut waktu mulai CAP). Tanpa parameter: 7 hari terakhir.
   Maks 62 hari dan 1000 baris (terpotong:true bila lebih: persempit rentang). Parameter lain ditolak supaya kunci cache tepi tidak bisa dibengkakkan. */
async function arsipJawab(env, url) {
  for (const k of url.searchParams.keys()) {
    if (k !== "dari" && k !== "sampai") return gagal(400, `parameter tak dikenal: ${k.slice(0, 20)}`);
    if (url.searchParams.getAll(k).length > 1) return gagal(400, `parameter ganda: ${k}`);
  }
  const kini = Date.now(), s = url.searchParams.get("sampai"), d = url.searchParams.get("dari");
  const sampai = s == null ? hari(new Date(kini).toISOString().slice(0, 10)) : hari(s), dari = d == null && sampai != null ? sampai - 6 * 86400e3 : hari(d ?? "");
  if (sampai == null || dari == null) return gagal(400, "dari/sampai harus tanggal sah YYYY-MM-DD (sejak 2020)");
  if (dari > sampai) return gagal(400, "dari harus <= sampai");
  if ((sampai - dari) / 86400e3 + 1 > MAKS_RENTANG) return gagal(400, `rentang maksimum ${MAKS_RENTANG} hari`);
  const rows = (await env.DB.prepare("SELECT * FROM cuaca_arsip WHERE mulai >= ? AND mulai < ? ORDER BY mulai, id LIMIT ?").bind(dari, sampai + 86400e3, MAKS_ARSIP + 1).all()).results;
  const iso = t => new Date(t).toISOString();
  return json({dari: iso(dari).slice(0, 10), sampai: iso(sampai).slice(0, 10), terpotong: rows.length > MAKS_ARSIP,
    arsip: rows.slice(0, MAKS_ARSIP).map(r => ({id: r.id, event: r.event, tingkat: r.tingkat, mulai: iso(r.mulai), selesai: iso(r.selesai), bbox: r.bbox && JSON.parse(r.bbox),
      poligon: r.poligon && JSON.parse(r.poligon), wilayah: r.wilayah, prov: r.prov ? r.prov.split(",") : [], pertama_dilihat: iso(r.pertama_dilihat)}))});
}

/* kunci cache arsip dari nilai yang lolos pola tanggal, bukan query mentah */
export const kunciArsip = url => ["dari", "sampai"].map(k => [k, url.searchParams.get(k)]).filter(([, v]) => v != null && TGL.test(v)).map(([k, v]) => `${k}=${v}`).join("&").replace(/^(?=.)/, "?");

/* GET/HEAD /api/cuaca/nowcast, cache tepi 60 dtk; tabel belum ada (migrasi 0014) = 503, klien jatuh ke peringatan.json */
export async function layaniNowcast(req, env, ctx, url) {
  const jalur = url.pathname.replace(/\/+$/, "");
  if (jalur !== "/api/cuaca/nowcast" && jalur !== "/api/cuaca/arsip") return null;
  if (req.method !== "GET" && req.method !== "HEAD") return gagal(405, "hanya GET dan HEAD", {allow: "GET, HEAD"});
  const arsip = jalur === "/api/cuaca/arsip";
  const r = await cacheTepi(new Request(arsip ? url.origin + jalur + kunciArsip(url) : url.origin + jalur), ctx, arsip ? 300 : 60, async () => {
    try { return await (arsip ? arsipJawab(env, url) : daftar(env)); } catch (e) { console.error("nowcast api", e?.message); return gagal(503, arsip ? "arsip belum siap" : "nowcast belum siap"); }
  });
  return req.method === "HEAD" ? new Response(null, {status: r.status, headers: r.headers}) : r;
}
