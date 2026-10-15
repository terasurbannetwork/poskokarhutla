/* Statistik publik /statistik: manusia vs asisten AI vs perayap, dihitung dari hit HTML yang sampai ke Worker.
   Tidak menyimpan apa pun di perangkat pengunjung (tanpa persetujuan diperlukan) dan tidak menyimpan IP:
   - pengunjung unik per hari = 16 hex SHA-256(garam harian | IP | UA); garam diganti tiap hari WIB, garam lama dimusnahkan cron.
   - IP hanya dipakai sesaat: hash di atas + mencocokkan perayap dengan rentang IP resmi operatornya (lencana terverifikasi).
   - Halaman dari jaringan hosting/cloud, perayap palsu, dan bot lain tidak dihitung sebagai manusia (dicatat di "tidak dihitung").
   Biaya: 1 pemanggilan Worker per tampilan HTML (aset lain tetap statis), 1 baris D1 ditulis (+1 untuk pengunjung baru),
   disampel otomatis (pHit) saat hari itu ramai. */
import {json, gagal, sha, acak} from "./worker.js";
import {tulisHari, tglWIB, slotWIB} from "./statistik.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, WIB = 7 * JAM;

/* ---------------- klasifikasi UA: [nama, pola, kunci daftar IP operator (null = operator tidak menerbitkan)] ---------------- */
export const AI_JAWAB = [["ChatGPT", /ChatGPT-User/i, "openai-user"], ["Claude", /Claude-User/i, null], ["Perplexity", /Perplexity-User/i, "perplexity-user"],
  ["Mistral Le Chat", /MistralAI-User/i, null], ["Meta AI", /meta-externalfetcher/i, null], ["DuckAssist", /DuckAssistBot/i, null], ["Google (permintaan pengguna)", /Google-(?:Read-Aloud|NotebookLM)/i, null]];
export const AI_CRAWL = [["OAI-SearchBot", /OAI-SearchBot/i, "openai-search"], ["GPTBot", /GPTBot/i, "openai-gptbot"], ["Claude-SearchBot", /Claude-SearchBot/i, null],
  ["ClaudeBot", /ClaudeBot|anthropic-ai/i, null], ["PerplexityBot", /PerplexityBot/i, "perplexity-bot"], ["CCBot", /CCBot/i, "commoncrawl"],
  ["Google-Extended", /Google-Extended/i, "google"], ["Applebot-Extended", /Applebot-Extended/i, "apple"], ["Bytespider", /Bytespider/i, null],
  ["Amazonbot", /Amazonbot/i, null], ["Meta-ExternalAgent", /meta-externalagent/i, null], ["cohere-ai", /cohere-ai|cohere-training/i, null],
  ["Exa", /ExaBot|Exa\b/i, null], ["YouBot", /YouBot/i, null], ["Diffbot", /Diffbot/i, null], ["Timpibot", /Timpibot/i, null]];
export const MESIN_CARI = [["Googlebot", /Googlebot|Google-InspectionTool|GoogleOther/i, "google"], ["Bingbot", /bingbot|BingPreview/i, "bing"],
  ["Applebot", /Applebot/i, "apple"], ["DuckDuckBot", /DuckDuckBot/i, null], ["YandexBot", /YandexBot/i, null], ["Baiduspider", /Baiduspider/i, null], ["PetalBot", /PetalBot/i, null]];
const BOT_LAIN = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|phantom|puppeteer|playwright|selenium|scrapy|httpclient/i;
/* daftar rentang IP resmi yang diterbitkan operator (diambil cron harian, disimpan di stat_ip) */
export const SUMBER_IP = {
  "openai-gptbot": "https://openai.com/gptbot.json", "openai-search": "https://openai.com/searchbot.json", "openai-user": "https://openai.com/chatgpt-user.json",
  google: "https://developers.google.com/static/search/apis/ipranges/googlebot.json", bing: "https://www.bing.com/toolbox/bingbot.json",
  apple: "https://search.developer.apple.com/applebot.json", "perplexity-bot": "https://www.perplexity.ai/perplexitybot.json",
  "perplexity-user": "https://www.perplexity.ai/perplexity-user.json", commoncrawl: "https://index.commoncrawl.org/ccbot.json",
};
/* jaringan hosting/cloud: tampilan dari sini hampir selalu otomatis (pemindai, pratinjau, skrip), bukan orang */
export const ASN_HOSTING = new Set([16509, 14618, 8987, 396982, 19527, 8075, 8068, 14061, 16276, 24940, 213230, 63949, 20473, 45102, 37963, 132203, 31898,
  51167, 12876, 60781, 28753, 13335, 209242, 36352, 46606, 26496, 55286, 62567, 54290, 4785, 135377, 9009, 212238]);
const ORG_HOSTING = /amazon|aws|google cloud|microsoft corporation|azure|digitalocean|ovh|hetzner|linode|akamai connected cloud|vultr|choopa|alibaba|tencent|oracle|contabo|scaleway|leaseweb|m247|datacamp|colocrossing|hostinger|cloudflare|fastly|zenlayer|psychz|quadranet/i;
export const jaringanHosting = cf => ASN_HOSTING.has(Number(cf?.asn)) || ORG_HOSTING.test(cf?.asOrganization || "");

export function klasifikasi(ua, cf, h = {}) {
  for (const [daftar, jenis] of [[AI_JAWAB, "ai_jawab"], [AI_CRAWL, "ai_crawl"], [MESIN_CARI, "mesin_cari"]])
    for (const [nama, re, op] of daftar) if (re.test(ua)) return {jenis, nama, op};
  if (!ua || BOT_LAIN.test(ua)) return {jenis: "tak", alasan: "bot lain"};
  if (jaringanHosting(cf)) return {jenis: "tak", alasan: "jaringan hosting/cloud"};
  if (!h.bahasa || h.bahasa.trim() === "*" || (h.dest && h.dest !== "document")) return {jenis: "tak", alasan: "tanpa tanda peramban"};   // fetch skrip (undici, dll.) mengirim "*"
  return {jenis: "manusia"};
}

/* ---------------- CIDR (IPv4 & IPv6) ---------------- */
export function ipKeAngka(ip) {
  if (ip.includes(".") && !ip.includes(":")) { const p = ip.split(".").map(Number); if (p.length !== 4 || p.some(x => !(x >= 0 && x <= 255))) return null; return [p.reduce((a, x) => a * 256n + BigInt(x), 0n), 32]; }
  if (!ip.includes(":")) return null;
  let [a, b] = ip.split("::"); const h = a ? a.split(":") : [], t = b != null ? (b ? b.split(":") : []) : [];
  if (b == null && h.length !== 8) return null;
  const g = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  if (g.length !== 8 || g.some(x => !/^[0-9a-f]{1,4}$/i.test(x))) return null;
  return [g.reduce((acc, x) => acc * 65536n + BigInt(parseInt(x, 16)), 0n), 128];
}
export function cidrKe(c) {
  const [ip, pre] = c.split("/"), a = ipKeAngka(ip), n = Number(pre);
  if (!a || !Number.isInteger(n) || n < 0 || n > a[1]) return null;
  return [a[0] >> BigInt(a[1] - n), n, a[1]];
}
export const dalamCidr = (ip, daftar) => { const a = ipKeAngka(ip); return !!a && daftar.some(([net, n, bits]) => bits === a[1] && (a[0] >> BigInt(bits - n)) === net); };
export const ambilCidr = teks => [...new Set(String(teks).match(/\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b|\b[0-9a-f]{1,4}(?::[0-9a-f]{0,4}){2,7}\/\d{1,3}\b/gi) || [])].filter(c => cidrKe(c));

let RENTANG = null;   // cache isolat: {dimuat, op: {kunci: [[net, n, bits]]}}
async function rentang(env, kini) {
  if (RENTANG && kini - RENTANG.dimuat < 6 * JAM) return RENTANG.op;
  const r = await env.DB.prepare("SELECT operator, cidr FROM stat_ip").all(), op = {};
  for (const x of r.results) op[x.operator] = JSON.parse(x.cidr).map(cidrKe).filter(Boolean);
  RENTANG = {dimuat: kini, op};
  return op;
}
export const lupakanRentang = () => { RENTANG = null; };
/* terverifikasi | palsu (operator menerbitkan daftar, IP di luar) | tak terverifikasi (operator tidak menerbitkan / daftar belum diambil) */
export async function verifikasi(env, op, ip, kini) {
  if (!op) return "tak terverifikasi";
  const d = (await rentang(env, kini))[op];
  if (!d?.length) return "tak terverifikasi";
  return dalamCidr(ip, d) ? "terverifikasi" : "palsu";
}

/* cron: ambil ulang daftar IP operator (sehari sekali) */
export async function perbaruiRentang(env, kini = Date.now()) {
  const hasil = {};
  await Promise.all(Object.entries(SUMBER_IP).map(async ([op, u]) => {
    try {
      const r = await fetch(u, {headers: {"user-agent": "PoskoKarhutla-statistik/1.0"}});
      if (!r.ok) throw new Error(r.status);
      const c = ambilCidr(await r.text());
      if (!c.length) throw new Error("tanpa CIDR");
      await env.DB.prepare("INSERT INTO stat_ip (operator, cidr, diambil) VALUES (?, ?, ?) ON CONFLICT (operator) DO UPDATE SET cidr = excluded.cidr, diambil = excluded.diambil")
        .bind(op, JSON.stringify(c), kini).run();
      hasil[op] = c.length;
    } catch (e) { hasil[op] = "gagal: " + e.message; }
  }));
  RENTANG = null;
  return hasil;
}

/* ---------------- garam harian: dibuat saat pertama dipakai hari itu, garam hari sebelumnya dihapus cron ---------------- */
let GARAM = null;
export async function garam(env, tgl) {
  if (GARAM?.tgl === tgl) return GARAM.garam;
  await env.DB.prepare("INSERT OR IGNORE INTO stat_garam (tgl, garam) VALUES (?, ?)").bind(tgl, acak(32)).run();
  const g = (await env.DB.prepare("SELECT garam FROM stat_garam WHERE tgl = ?").bind(tgl).first()).garam;
  GARAM = {tgl, garam: g};
  return g;
}
export const musnahkanGaram = (env, kini) => env.DB.prepare("DELETE FROM stat_garam WHERE tgl < ?").bind(tglWIB(kini));
export const tamuHash = async (g, ip, ua) => (await sha(g + "|" + ip + "|" + ua)).slice(0, 16);

/* ---------------- rujukan & kanal ---------------- */
const AI_REF = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|poe\.com|you\.com|phind\.com|meta\.ai|chat\.mistral\.ai|deepseek\.com)$/;
const SOSIAL = /(^|\.)(whatsapp\.com|wa\.me|facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|threads\.net|threads\.com|linkedin\.com|lnkd\.in|tiktok\.com|youtube\.com|t\.me|telegram\.org|reddit\.com|line\.me)$/;
const CARI = /(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|baidu\.com|ecosia\.org|search\.brave\.com)$/;
export function kanal(referer, host, utm) {
  let d = ""; try { d = new URL(referer).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, ""); } catch (e) {}
  const k = utm ? "Kampanye" : !d ? "Langsung" : d === host ? "Internal" : AI_REF.test(d) ? "Dari jawaban AI" : SOSIAL.test(d) ? "Media sosial" : CARI.test(d) ? "Pencarian" : "Rujukan";
  return {kanal: k, rujukan: d && d !== host ? d : "(langsung)"};
}
export const perangkat = ua => /iPad|Tablet|Android(?!.*Mobi)/i.test(ua) ? "Tablet" : /Mobi|iPhone|Android/i.test(ua) ? "Ponsel" : "Desktop";

/* ---------------- hit HTML: dipanggil dari src/worker.js (layaniHTML) lewat ctx.waitUntil, setelah respons dikirim ---------------- */
export async function catatHit(env, req, jalur, kini = Date.now()) {
  const ua = req.headers.get("user-agent") || "", cf = req.cf || {}, ip = req.headers.get("cf-connecting-ip") || "", url = new URL(req.url);
  const k = klasifikasi(ua, cf, {bahasa: req.headers.get("accept-language"), dest: req.headers.get("sec-fetch-dest")});
  const tgl = tglWIB(kini), jam = new Date(kini + WIB).toISOString().slice(11, 13), dim = new Map();
  const d = (dm, kunci) => dim.set(dm + "\u0001" + kunci, {dim: dm, kunci: String(kunci).replace(/["\\<>]/g, "").slice(0, 80), n: 1, s: 0});
  const x = {orang: 0, kembali: 0, kunjungan: 0, tampilan: 0, klik: 0, detik: 0, slot: [], menit: false, dim};
  if (k.jenis === "manusia") {
    const g = await garam(env, tgl), h = await tamuHash(g, ip, ua), r = kanal(req.headers.get("referer") || "", url.hostname, url.searchParams.get("utm_source"));
    x.tampilan = 1; x.menit = true; x.kini = [h.slice(0, 8), jalur];
    /* slot 10 menit = orang, bukan muat ulang: sidik (tamu, slot) di stat_tamu, slot naik hanya saat sidiknya baru */
    const sl = slotWIB(kini); x.slotUnik = {s: sl, tamu: env.DB.prepare("INSERT OR IGNORE INTO stat_tamu (tgl, h) VALUES (?, ?)").bind(tgl, (await sha(h + "|" + sl)).slice(0, 16))};
    x.tamu = env.DB.prepare("INSERT OR IGNORE INTO stat_tamu (tgl, h) VALUES (?, ?)").bind(tgl, h);
    d("halaman", jalur); d("rujukan", r.rujukan); d("kanal", r.kanal); d("negara", cf.country || "?"); d("perangkat", perangkat(ua));
  } else if (k.jenis === "tak") { x.tak_dihitung = 1; d("tak_dihitung", k.alasan); }
  else {
    const v = await verifikasi(env, k.op, ip, kini);
    if (v === "palsu") { x.tak_dihitung = 1; d("tak_dihitung", "perayap palsu: " + k.nama); }
    else {
      x[k.jenis] = 1;
      if (k.jenis === "ai_jawab") { d("ai_agen", `${k.nama}|${v}`); d("ai_halaman", jalur); d("jam_ai", jam); }
      else d("perayap", `${k.jenis === "ai_crawl" ? "AI" : "Pencarian"}|${k.nama}|${v}`);
    }
  }
  return tulisHari(env, tgl, "publik", x, kini, ip + ua);
}

/* angka kecil untuk pil di header: cache isolat 60 detik (1 baca D1 per menit per isolat) */
let PIL = null;
export async function angkaPil(env, kini = Date.now()) {
  if (PIL && kini - PIL.t < 60e3) return PIL;
  const r = await env.DB.prepare("SELECT tampilan, kini FROM stat_hari WHERE tgl = ? AND hal = 'publik'").bind(tglWIB(kini)).first();
  const k = r ? JSON.parse(r.kini) : [];
  PIL = {t: kini, online: new Set(k.filter(e => e[0] > kini - 5 * MENIT).map(e => e[1])).size, tampilan: Math.round(r?.tampilan || 0)};
  return PIL;
}

/* ---------------- GET /api/publik?r=24j|7h|30h|semua (tanpa login; di-cache 60 detik di tepi) ---------------- */
const RENTANG_PUB = {"24j": 1, "7h": 7, "30h": 30, semua: 0};
export async function publik(env, req, url, ctx, kini = Date.now()) {
  const r = url.searchParams.get("r") || "7h";
  if (!(r in RENTANG_PUB)) return gagal(400, "r harus 24j/7h/30h/semua");
  const kunci = new Request(`https://cache.lokal/api/publik?r=${r}`), c = typeof caches !== "undefined" ? caches.default : null;
  const ada = await c?.match(kunci); if (ada) return ada;
  const hari = tglWIB(kini), dari = r === "semua" ? "0000-00-00" : tglWIB(kini - (RENTANG_PUB[r] === 1 ? 1 : RENTANG_PUB[r] - 1) * HARI), tujuh = tglWIB(kini - 6 * HARI);
  const jml = "sum(tampilan) tampilan, sum(orang) orang, sum(ai_jawab) ai_jawab, sum(ai_crawl) ai_crawl, sum(mesin_cari) mesin_cari, sum(tak_dihitung) tak_dihitung, min(sampel) sampel";
  const [hk, h7, hs, seri, dim, slot] = await env.DB.batch([
    env.DB.prepare("SELECT kini FROM stat_hari WHERE tgl = ? AND hal = 'publik'").bind(hari),
    env.DB.prepare(`SELECT ${jml} FROM stat_hari WHERE hal = 'publik' AND tgl >= ?`).bind(tujuh),
    env.DB.prepare(`SELECT ${jml}, min(tgl) mulai FROM stat_hari WHERE hal = 'publik'`),
    env.DB.prepare("SELECT tgl, tampilan, orang, ai_jawab, ai_crawl, mesin_cari FROM stat_hari WHERE hal = 'publik' AND tgl >= ? ORDER BY tgl").bind(dari),
    env.DB.prepare(`WITH d AS (SELECT j.key dim, k.key kunci, sum(json_extract(k.value, '$[0]')) n FROM stat_hari h, json_each(h.dim) j, json_each(j.value) k
        WHERE h.hal = 'publik' AND h.tgl >= ? AND j.key != '_n' GROUP BY 1, 2)
      SELECT dim, kunci, n FROM (SELECT *, row_number() OVER (PARTITION BY dim ORDER BY n DESC) r FROM d) WHERE r <= 25 ORDER BY dim, n DESC`).bind(r === "24j" ? tglWIB(kini - HARI) : dari),
    env.DB.prepare("SELECT tgl, slot FROM stat_hari WHERE hal = 'publik' AND tgl >= ?").bind(tglWIB(kini - HARI)),
  ]);
  const ki = JSON.parse(hk.results[0]?.kini || "[]").filter(e => e[0] > kini - 5 * MENIT), buka = {};
  const orangKini = new Set(ki.map(e => e[1]));
  for (const t of orangKini) { const j = ki.find(e => e[1] === t)[2]; buka[j] = (buka[j] || 0) + 1; }   // tiap orang dihitung di halaman terakhirnya (kini terurut terbaru dulu)
  const D = {}; for (const x of dim.results) (D[x.dim] ||= []).push([x.kunci, Math.round(x.n)]);
  const bulat = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, typeof v === "number" ? Math.round(v * 1000) / 1000 : v]));
  /* 24 jam: per jam dari slot 10 menit (manusia) dan dimensi jam_ai (hari ini + kemarin) */
  let perJam = null;
  if (r === "24j") {
    const s = Object.fromEntries(slot.results.map(x => [x.tgl, JSON.parse(x.slot)])), jamKini = Math.floor(((kini + WIB) % HARI) / JAM), kemarin = tglWIB(kini - HARI);
    perJam = [];
    for (let i = 23; i >= 0; i--) { const j = (jamKini - i + 24) % 24, t = jamKini - i < 0 ? kemarin : hari, a = s[t] || [];
      perJam.push({jam: String(j).padStart(2, "0"), tgl: t, manusia: Math.round(a.slice(j * 6, j * 6 + 6).reduce((x, y) => x + y, 0)), ai_jawab: null}); }
    // jam_ai digabung lintas hari di kueri dimensi; cukup untuk sebaran per jam, dipetakan ke 24 jam terakhir
    const aj = Object.fromEntries((D.jam_ai || []).map(([k, n]) => [k, n])); perJam.forEach(p => p.ai_jawab = aj[p.jam] || 0);
  }
  const res = json({kini, rentang: r, hari, online: orangKini.size, buka: Object.entries(buka).sort((a, b) => b[1] - a[1]).slice(0, 10),
    tujuh: bulat(h7.results[0]), sejak: bulat(hs.results[0]), mulai: hs.results[0]?.mulai || hari,
    seri: seri.results.map(bulat), per_jam: perJam, dim: D}, 200, {"cache-control": "public, max-age=60"});
  if (c) ctx?.waitUntil?.(c.put(kunci, res.clone()));
  return res;
}
