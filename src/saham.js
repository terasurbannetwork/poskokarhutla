/* Proksi data saham untuk halaman staf /bnpb/saham (public/bnpb/saham.*) ke gateway Stellar Data (Stockbit + Investing).
   Kunci TIDAK pernah keluar dari Worker: secret STELLAR_KEY_STOCKBIT (info/transaksi/grafik) dan STELLAR_KEY_INVESTING (cari/dividen),
   dikirim hanya sebagai header X-Stellar-Api-Key ke edge.stellardata.ai. Hanya staf yang masuk (atau admin); anonim 401.
   Kegagalan selalu {ok:false, kode, pesan}: akses_belum_dibuka (401/403 gateway atau penyedia, atau secret kosong, 403),
   masukan_salah (400), penyedia_galat (5xx/timeout/bentuk tak dikenal/lainnya, 502). Sukses di-cache caches.default (60 dtk; cari+dividen 1 hari).
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), hanya dihitung saat cache luput. */
import {json, adminOK} from "./worker.js";
import {stafSesi} from "./staf.js";
import {laju} from "./bnpb.js";

const BASE = "https://edge.stellardata.ai", TIMEOUT = 15000, KODE = /^[A-Z0-9][A-Z0-9.]{0,11}$/;
const PERIODE = ["LAST_1_DAY", "LAST_7_DAYS", "LAST_1_MONTH", "LAST_3_MONTHS", "YEAR_TO_DATE", "LAST_1_YEAR"];
const STATUS = {akses_belum_dibuka: 403, masukan_salah: 400, penyedia_galat: 502};
const PESAN = {akses_belum_dibuka: "Akses data saham belum dibuka untuk kunci ini.", penyedia_galat: "Penyedia data saham sedang bermasalah, coba lagi nanti."};
const galat = (kode, pesan) => json({ok: false, kode, pesan: pesan || PESAN[kode]}, STATUS[kode]);
class Gagal extends Error { constructor(kode) { super(kode); this.kode = kode; } }

async function panggil(env, secret, jalur, params) {
  const kunci = env[secret]; if (!kunci) throw new Gagal("akses_belum_dibuka");
  const u = new URL(BASE + jalur); for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  let r;
  try { r = await fetch(u, {headers: {"X-Stellar-Api-Key": kunci, accept: "application/json"}, signal: AbortSignal.timeout(TIMEOUT)}); }
  catch (e) { throw new Gagal("penyedia_galat"); }
  if (r.status === 401 || r.status === 403) { r.body?.cancel(); throw new Gagal("akses_belum_dibuka"); }
  if (!r.ok) { r.body?.cancel(); throw new Gagal("penyedia_galat"); }
  try { return await r.json(); } catch (e) { throw new Gagal("penyedia_galat"); }
}
const perlu = (x, larik) => { if (larik ? !Array.isArray(x) : (typeof x !== "object" || !x || Array.isArray(x))) throw new Gagal("penyedia_galat"); return x; };
const teks = x => (typeof x === "string" ? x : x == null ? "" : String(x)).slice(0, 200);
/* "4,920" / "4910.000000" / "+80.00" / 1.65 -> angka; selain itu null */
const angka = x => { const n = typeof x === "number" ? x : typeof x === "string" && x.trim() ? Number(x.replace(/,/g, "")) : NaN; return Number.isFinite(n) ? n : null; };

/* jenis -> d => [secret, jalur, params, susun(payload), detik cache]. d = hasil validasi masukan() */
const JENIS = {
  cari: d => ["STELLAR_KEY_INVESTING", "/investing/search", {keyword: d.q, force: "false"}, j => {
    const a = Array.isArray(j?.data) ? j.data : j?.data?.data;
    return {hasil: perlu(a, true).slice(0, 50).map(x => ({pair_id: x.pair_ID, kode: teks(x.search_main_text), nama: teks(x.search_main_longtext), bursa: teks(x.search_main_subtext)}))};
  }, 86400],
  dividen: d => ["STELLAR_KEY_INVESTING", "/investing/dividends", {pair_id: d.pair_id, force: "false"}, j => {
    const r = perlu(j?.data?.data ?? j?.data), tanggal = r.date?.data?.data;
    return {ringkas: perlu(r.summary?.data), riwayat: perlu(tanggal ?? [], true).slice(0, 200).map(x => ({tanggal: x.div_date, nilai: x.div_amount, jenis: x.div_payment_type, bayar: x.pay_date, yield: x.yield ?? null}))};
  }, 86400],
  /* Stockbit: daftar-putih bidang (bentuk nyata 4 Nov 2026). Payload asli memuat bidang akun gateway (is_holding_exist, is_price_alert_exist, followed): tidak diteruskan. */
  info: d => ["STELLAR_KEY_STOCKBIT", `/stockbit/${d.kode}/info`, {}, j => {
    const x = perlu(j?.data?.provider_payload?.data), ob = x.orderbook || {};
    return {data: {nama: teks(x.name), kode: teks(x.symbol), bursa: teks(x.exchange), sektor: teks(x.sector), sub_sektor: teks(x.sub_sector), jenis: teks(x.type_company),
      harga: angka(x.price), perubahan: angka(x.change), perubahan_persen: angka(x.percentage), volume: angka(x.volume), sebelumnya: angka(x.previous), rata_rata: angka(x.average),
      bid_harga: angka(ob.bid?.price), bid_volume: angka(ob.bid?.volume), offer_harga: angka(ob.offer?.price), offer_volume: angka(ob.offer?.volume),
      status_pasar: teks(x.market_hour?.status), diperbarui: teks(x.updated)}};
  }, 60],
  transaksi: d => ["STELLAR_KEY_STOCKBIT", `/stockbit/${d.kode}/running-trade`, {sort: "DESC", limit: d.limit, order_by: "RUNNING_TRADE_ORDER_BY_TIME"}, j => {
    const x = perlu(j?.data?.provider_payload?.data);
    return {data: {tanggal: teks(x.date), pasar_buka: !!x.is_open_market, baris: perlu(x.running_trade ?? [], true).slice(0, 200).map(r => ({waktu: teks(r.time),
      sisi: r.action === "buy" ? "Beli" : r.action === "sell" ? "Jual" : teks(r.action), harga: angka(r.price), lot: angka(r.lot), nilai: angka(r.value?.raw), papan: teks(r.market_board)}))}};
  }, 60],
  grafik: d => ["STELLAR_KEY_STOCKBIT", `/stockbit/${d.kode}/running-trade/chart`, {period: "RT_PERIOD_" + d.periode, investor_type: "INVESTOR_TYPE_ALL", market_board: "BOARD_TYPE_REGULAR"}, j => {
    const x = perlu(j?.data?.provider_payload?.data);
    const deret = perlu(x.price_chart_data ?? [], true).slice(0, 2000).map(r => ({t: /^\d{4}-\d\d-\d\d$/.test(r.date) && /^\d\d:\d\d$/.test(r.time) ? `${r.date}T${r.time}:00+07:00` : teks(r.date),
      harga: angka(r.value?.raw), buka: angka(r.open?.raw), tertinggi: angka(r.high?.raw), terendah: angka(r.low?.raw)})).filter(r => r.harga !== null);
    return {data: {dari: teks(x.from), sampai: teks(x.to), sesi: teks(x.date_session_info), deret}};
  }, 60],
};

/* objek masukan bersih, atau string pesan galat (400) */
function masukan(jenis, url) {
  const p = url.searchParams;
  if (jenis === "cari") { const q = (p.get("q") || "").trim(); return q.length >= 1 && q.length <= 40 ? {q} : "q harus 1 sampai 40 karakter"; }
  if (jenis === "dividen") { const s = p.get("pair_id") || ""; return /^[1-9]\d{0,9}$/.test(s) ? {pair_id: s} : "pair_id harus bilangan bulat positif"; }
  let kode = url.pathname.split("/")[3] || ""; try { kode = decodeURIComponent(kode); } catch (e) {}
  kode = kode.toUpperCase();
  if (!KODE.test(kode) || kode.includes("..")) return "kode saham harus 1 sampai 12 huruf, angka, atau titik";
  if (jenis === "transaksi") { const s = p.get("limit") ?? "50", n = /^\d{1,3}$/.test(s) ? +s : 0; return n >= 1 && n <= 200 ? {kode, limit: String(n)} : "limit harus 1 sampai 200"; }
  if (jenis === "grafik") { const s = (p.get("periode") || "LAST_1_DAY").toUpperCase().replace(/^RT_PERIOD_/, ""); return PERIODE.includes(s) ? {kode, periode: s} : `periode harus salah satu: ${PERIODE.join(", ")}`; }
  return {kode};
}

const BALAS = {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff"};
async function layani(jenis, env, req, url, kini) {
  const staf = (await adminOK(env, req, kini)) ? "admin" : await stafSesi(env, req, kini).then(s => s && "staf:" + s.id);
  if (!staf) return json({ok: false, kode: "akses_belum_dibuka", pesan: "Masuk sebagai staf dulu."}, 401);
  const d = masukan(jenis, url); if (typeof d === "string") return json({ok: false, kode: "masukan_salah", pesan: d}, 400);
  const [secret, jalur, params, susun, ttl] = JENIS[jenis](d);
  const kc = new Request("https://cache.lokal/api/saham/" + jenis + "?" + new URLSearchParams(d)), c = globalThis.caches?.default;
  const ada = await c?.match(kc).catch(() => null);
  if (ada) return new Response(ada.body, {headers: BALAS});
  if (!env[secret]) return galat("akses_belum_dibuka");   // tanpa kunci: tidak ada fetch, tidak memakan jatah laju
  const lj = await laju(env, "sh:" + staf, "saham", [[60e3, 60], [3600e3, 600]], kini); if (lj) return lj;
  let badan;
  try { badan = JSON.stringify({ok: true, ...susun(await panggil(env, secret, jalur, params))}); }
  catch (e) { if (e instanceof Gagal) return galat(e.kode); console.error("saham", jenis, String(e?.message || e)); return galat("penyedia_galat"); }
  if (c) await c.put(kc, new Response(badan, {headers: {"content-type": "application/json; charset=utf-8", "cache-control": "max-age=" + ttl}})).catch(() => {});
  return new Response(badan, {headers: BALAS});
}

export const RUTE_SAHAM = {
  "GET /api/saham/cari": (env, req, url, kini) => layani("cari", env, req, url, kini),
  "GET /api/saham/dividen": (env, req, url, kini) => layani("dividen", env, req, url, kini),
  "GET /api/saham/:kode/info": (env, req, url, kini) => layani("info", env, req, url, kini),
  "GET /api/saham/:kode/transaksi": (env, req, url, kini) => layani("transaksi", env, req, url, kini),
  "GET /api/saham/:kode/grafik": (env, req, url, kini) => layani("grafik", env, req, url, kini),
};
