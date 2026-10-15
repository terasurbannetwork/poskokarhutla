/* Statistik pengunjung (POST /api/jejak, GET /api/statistik), sesi admin (/admin/masuk), dan kotak pesan (/api/pesan).
   Privasi: tidak ada IP (hanya wilayah kasar dari request.cf), tidak ada cookie pelacak, tidak ada baris per pengunjung.
   Hanya terkirim bila pengunjung menyetujui Analitik (public/persetujuan.js) dan DNT/GPC tidak aktif.

   Anggaran gratis (Workers 100 rb permintaan & 10 ms CPU, D1 100 rb baris ditulis per hari) untuk 100 rb+ kunjungan/hari:
   - klien: ~1 kiriman per kunjungan (saat halaman disembunyikan/ditutup, + paling banyak satu di menit ke-5, maks 3 per muat);
     "orang", "kembali", "kunjungan" (> 30 menit), dan slot 10 menit dihitung di klien dari localStorage, jadi server tidak perlu
     menyimpan id pengunjung sama sekali.
   - server: 1 SELECT + 1 UPDATE (satu baris stat_hari per hari+halaman) = 1 baris ditulis per kiriman. Bila kiriman hari itu
     melewati 20 rb, kiriman disampel deterministik per peramban (p 1 -> 0,5 -> 0,2 -> 0,05) dan dicatat dengan bobot 1/p;
     dasbor menandai "perkiraan (sampel)". Batas kasar tulisan statistik: ~40 rb/hari + 5 % dari kelebihannya.
   - CPU: tanpa hash kriptografi, tanpa urai JSON besar; penggabungan JSON dikerjakan SQLite di D1. */
import {json, gagal, sha, hex, acak, cekLaju, ipHash, turnstileOK, adminOK, bacaBody} from "./worker.js";
import {CSP_ADMIN} from "./admin_halaman.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, WIB = 7 * JAM;
export const HAL = ["karhutla", "banjir", "warga", "tentang", "privasi", "statistik"];
/* dimensi yang boleh dikirim klien; cf_* / browser / os diisi server. Selain ini ditolak 400. */
export const PERISTIWA = new Set(["tampil", "tab", "tab_detik", "gulir", "masuk_tab", "keluar_tab", "durasi_sesi", "pantul",
  "kompleks", "provinsi", "wilayah", "cari", "ex_lihat", "kontrol", "sim", "operasi", "unduh", "bagikan", "lapisan", "zoom", "sel_peta",
  "laporan_lihat", "laporan_kirim", "pesan_buka", "pesan_kirim", "berita_bahasa", "tema", "layar_besar", "persetujuan",
  "perangkat", "layar", "viewport", "bahasa", "koneksi", "skema", "pwa", "rujukan", "utm_sumber", "utm_medium", "utm_kampanye", "tautan_dalam",
  "vital", "vital_kelas", "galat_js", "gagal_muat", "umur_data"]);
const BOT = /bot\b|bot\/|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|axios|node-fetch|undici|go-http|java\/|okhttp|phantom|puppeteer|playwright|selenium/i;
export const MAKS_BODY_JEJAK = 4096, MAKS_PERISTIWA = 50, KUNCI_PER_DIM = 100;
const MAKS_KUNCI = 80;

export const tglWIB = t => new Date(t + WIB).toISOString().slice(0, 10);
export const slotWIB = t => Math.floor(((t + WIB) % HARI) / (10 * MENIT));
const menitWIB = t => Math.floor(((t + WIB) % HARI) / MENIT);
const bersih = (s, n) => String(s ?? "").replace(/[\u0000-\u001F\u007F<>"\\]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
const angka = (x, maks) => { const v = Number(x ?? 0); return Number.isFinite(v) && v >= 0 && v <= maks ? v : NaN; };
/* sampel: bagian kiriman yang ditulis, turun bertahap supaya tulisan D1 (100 rb/hari gratis) cukup untuk semuanya:
   kiriman analitik (berpersetujuan) maks ~22 rb + 5 % kelebihan; hit HTML publik maks ~40 rb (+ ≤ 1 baris stat_tamu per
   pengunjung baru, + ≤ 1 baris stat_tamu dan 1 tulisan slot per pengunjung per 10 menit) + 5 % kelebihan. Sisanya untuk Lapor Warga, pesan, dan masuk admin. */
export const pSampel = total => total < 12000 ? 1 : total < 18000 ? .5 : total < 22000 ? .2 : .05;
export const pHit = total => total < 30000 ? 1 : total < 36000 ? .5 : total < 40000 ? .2 : .05;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967296; };

export function browserOS(ua) {
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /UCBrowser/.test(ua) ? "UC Browser"
    : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "lainnya";
  const o = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS"
    : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "lainnya";
  return [b, o];
}

const kosong = n => "[" + new Array(n).fill(0).join(",") + "]";
const jalur = (dim, kunci) => `$."${dim}"."${kunci}"`;   // kunci sudah dibersihkan dari " dan \ ; dim dari allow-list [a-z_]
const potong = (xs, n) => { const o = []; for (let i = 0; i < xs.length; i += n) o.push(xs.slice(i, i + n)); return o; };

/* Tulis satu kiriman ke baris (tgl, hal): SATU pernyataan UPDATE. x = {orang, kembali, kunjungan, tampilan, klik, detik, slot[], menit, dim: Map}.
   Kunci baru di atas KUNCI_PER_DIM per dimensi per hari masuk 'lainnya' (diputuskan dari potret baris; balapan antar-isolat
   paling banyak meloloskan beberapa kunci ekstra). Mengembalikan false bila kiriman tidak lolos sampel. */
export async function tulisHari(env, tgl, hal, x, kini, kunciSampel) {
  const ks = [...x.dim.values()], ikat = [tgl, hal, ...ks.map(a => jalur(a.dim, a.kunci))], dims = [...new Set(ks.map(a => a.dim))];
  const cek = ks.map((a, i) => `json_extract(dim, ?${i + 3}) IS NOT NULL AS a${i}`).concat(dims.map((d, i) => `coalesce(json_extract(dim, '$._n."${d}"'), 0) AS c${i}`));
  const r = await env.DB.prepare(`SELECT (SELECT coalesce(sum(kiriman), 0) FROM stat_hari WHERE tgl = ?1 AND ${hal === "publik" ? "hal = 'publik'" : "hal NOT IN ('sistem', 'publik')"}) AS total
    ${cek.length ? ", " + cek.join(", ") : ""} FROM (SELECT 1) LEFT JOIN stat_hari ON tgl = ?1 AND hal = ?2`).bind(...ikat).first();
  const p = hal === "sistem" ? 1 : hal === "publik" ? pHit(r.total) : pSampel(r.total);
  if (kunciSampel != null && fnv(kunciSampel + "|" + tgl) >= p) return false;
  const w = 1 / p, n = Object.fromEntries(dims.map((d, i) => [d, r["c" + i] || 0])), baru = {};
  const pasang = [];   // [indeks param jalur | literal jalur 'lainnya', n, s]
  ks.forEach((a, i) => {
    if (r["a" + i] || a.kunci === "lainnya") return pasang.push([`?${i + 3}`, a.n, a.s]);
    if (n[a.dim] + (baru[a.dim] || 0) < KUNCI_PER_DIM) { baru[a.dim] = (baru[a.dim] || 0) + 1; return pasang.push([`?${i + 3}`, a.n, a.s]); }
    pasang.push([`'${jalur(a.dim, "lainnya")}'`, a.n, a.s]);
  });
  const L = v => (Math.round(v * 1000) / 1000).toString();   // angka sudah divalidasi -> literal aman
  let dimE = "dim";
  for (const d of dims) dimE = `json_insert(${dimE}, '$."${d}"', json('{}'))`;
  for (const g of potong(pasang, 30)) dimE = `json_set(${dimE}, ${g.map(([j, a, s]) =>
    `${j}, json_array(round(coalesce(json_extract(dim, ${j} || '[0]'), 0) + ${L(a * w)}, 3), round(coalesce(json_extract(dim, ${j} || '[1]'), 0) + ${L(s * w)}, 1))`).join(", ")})`;
  const nb = Object.entries(baru);
  if (nb.length) dimE = `json_set(${dimE}, ${nb.map(([d, k]) => `'$._n."${d}"', coalesce(json_extract(dim, '$._n."${d}"'), 0) + ${k}`).join(", ")})`;
  let slotE = "slot";
  for (const g of potong(x.slot, 40)) slotE = `json_set(${slotE}, ${g.map(s => `'$[${s}]', round(json_extract(slot, '$[${s}]') + ${L(w)}, 3)`).join(", ")})`;
  const m = menitWIB(kini), menitE = x.menit ? `json_set(menit, '$[${m}]', round(json_extract(menit, '$[${m}]') + ${L(w)}, 3))` : "menit";
  /* publik: [waktu, tamu8, jalur] untuk "sedang membaca"; entri > 5 menit dibuang dalam pernyataan yang sama (maks 300) */
  const kiniE = x.kini ? `(SELECT json_group_array(json(value)) FROM (SELECT value FROM json_each(json_insert(kini, '$[#]', json_array(${kini}, ?${ikat.length + 1}, ?${ikat.length + 2})))
    WHERE json_extract(value, '$[0]') > ${kini - 5 * MENIT} ORDER BY json_extract(value, '$[0]') DESC LIMIT 300))` : "kini";
  if (x.kini) ikat.push(x.kini[0], x.kini[1]);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO stat_hari (tgl, hal, slot, menit) VALUES (?1, ?2, '${kosong(144)}', '${kosong(1440)}')`).bind(tgl, hal),
    ...(x.tamu ? [x.tamu] : []),   // INSERT OR IGNORE stat_tamu tepat sebelum UPDATE: changes() = 1 bila pengunjung baru hari ini
    env.DB.prepare(`UPDATE stat_hari SET kiriman = kiriman + 1, sampel = min(sampel, ${p}),
      orang = orang + ${x.tamu ? `changes() * ${L(w)}` : L(x.orang * w)}, kembali = kembali + ${L(x.kembali * w)}, kunjungan = kunjungan + ${L(x.kunjungan * w)},
      tampilan = tampilan + ${L(x.tampilan * w)}, klik = klik + ${L(x.klik * w)}, detik = detik + ${L(x.detik * w)},
      ai_jawab = ai_jawab + ${L((x.ai_jawab || 0) * w)}, ai_crawl = ai_crawl + ${L((x.ai_crawl || 0) * w)}, mesin_cari = mesin_cari + ${L((x.mesin_cari || 0) * w)},
      tak_dihitung = tak_dihitung + ${L((x.tak_dihitung || 0) * w)},
      slot = ${slotE}, menit = ${menitE}, dim = ${dimE}, kini = ${kiniE} WHERE tgl = ?1 AND hal = ?2`).bind(...ikat),
    ...(x.slotUnik ? [x.slotUnik.tamu, env.DB.prepare(`UPDATE stat_hari SET slot = json_set(slot, '$[${x.slotUnik.s}]', round(json_extract(slot, '$[${x.slotUnik.s}]') + ${L(w)}, 3))
      WHERE tgl = ?1 AND hal = ?2 AND changes() = 1`).bind(tgl, hal)] : []),   // tulis hanya bila sidik (tamu, slot) baru
  ]);
  return w;
}

/* ponytail: batas laju per isolat (Map di memori), bukan global; cukup untuk meredam satu klien nakal tanpa menulis D1.
   Pindah ke Rate Limiting binding Cloudflare bila ada banjir terdistribusi. */
const LAJU = new Map();
function lajuJejak(kunci, kini) {
  if (LAJU.size > 5000) LAJU.clear();
  const r = LAJU.get(kunci);
  if (!r || kini - r[0] > MENIT) { LAJU.set(kunci, [kini, 1]); return true; }
  return ++r[1] <= 6;
}

/* ================================================================ POST /api/jejak
   body ≤ 4 KB: {v: id acak 16–40, h: halaman, o: 1 = pertama hari ini, b: 1 = pernah datang hari lain, kv: 1 = kunjungan baru (> 30 mnt),
   k: klik, d: detik terlihat, s: [slot 10 menit baru aktif], e: [[dimensi, kunci, n?, s?], ...] ≤ 50} */
export async function jejak(env, req, kini) {
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return gagal(403, "bot atau permintaan tanpa user-agent tidak dihitung");
  const t = await req.text();
  if (t.length > MAKS_BODY_JEJAK) return gagal(413, `kiriman ${t.length} byte, maksimal ${MAKS_BODY_JEJAK}`);
  let o; try { o = JSON.parse(t); } catch (e) { return gagal(400, "body bukan JSON"); }
  if (!o || typeof o !== "object" || Array.isArray(o)) return gagal(400, "body harus objek JSON");
  if (typeof o.v !== "string" || !/^[0-9a-z]{16,40}$/.test(o.v)) return gagal(400, "id pengunjung (v) wajib: 16–40 huruf kecil/angka acak buatan peramban");
  if (!HAL.includes(o.h)) return gagal(400, `halaman (h) harus ${HAL.join("/")}, diterima '${String(o.h).slice(0, 20)}'`);
  const e = o.e ?? [], s = o.s ?? [];
  if (!Array.isArray(e) || !Array.isArray(s)) return gagal(400, "e dan s harus larik");
  if (e.length > MAKS_PERISTIWA) return gagal(413, `maksimal ${MAKS_PERISTIWA} peristiwa per kiriman, diterima ${e.length}`);
  if (s.length > 144 || s.some(x => !Number.isInteger(x) || x < 0 || x > 143) || new Set(s).size !== s.length) return gagal(400, "s harus slot 0–143 unik");
  const dim = new Map(), tambah = (d, kunci, n = 1, nilai = 0) => { const k = d + "\u0001" + kunci, a = dim.get(k); if (a) { a.n += n; a.s += nilai; } else dim.set(k, {dim: d, kunci, n, s: nilai}); };
  for (const x of e) {
    if (!Array.isArray(x) || x.length < 1 || x.length > 4) return gagal(400, "tiap peristiwa = [dimensi, kunci?, n?, s?]");
    if (!PERISTIWA.has(x[0])) return gagal(400, `peristiwa '${String(x[0]).slice(0, 30)}' tidak dikenal`);
    const n = angka(x[2] ?? 1, 1000), v = angka(x[3], 1e7);
    if (!(n >= 1) || Number.isNaN(v)) return gagal(400, `n peristiwa ${x[0]} harus 1–1000 dan s 0–10000000`);
    tambah(x[0], bersih(x[1] ?? "-", MAKS_KUNCI) || "-", Math.floor(n), v);
  }
  const klik = angka(o.k, 5000), detik = angka(o.d, 86400);
  if (Number.isNaN(klik) || Number.isNaN(detik)) return gagal(400, "k (klik) 0–5000 dan d (detik) 0–86400");
  if (!lajuJejak(o.v, kini)) return gagal(429, "terlalu sering: maksimal 6 kiriman per menit per pengunjung", {"retry-after": "60"});
  const bit = k => o[k] === 1 ? 1 : 0;
  if (bit("kv")) {   // konteks dihitung sekali per kunjungan: wilayah kasar dari Cloudflare, peramban & OS kasar dari UA
    const cf = req.cf || {}, [br, os] = browserOS(ua), c = (d, k) => { k = bersih(k, MAKS_KUNCI); if (k) tambah(d, k); };
    c("cf_negara", cf.country); c("cf_wilayah", [cf.region, cf.country].filter(Boolean).join(", ")); c("cf_zona", cf.timezone); c("cf_colo", cf.colo);
    c("cf_jaringan", cf.asOrganization); c("cf_asn", cf.asn ? "AS" + cf.asn : "");
    const la = Number(cf.latitude), lo = Number(cf.longitude);
    if (cf.city) c("cf_kota", [cf.city, cf.region || "", cf.country || "", cf.latitude != null && Number.isFinite(la) ? la.toFixed(1) : "", cf.longitude != null && Number.isFinite(lo) ? lo.toFixed(1) : ""].join("|"));
    c("browser", br); c("os", os);
  }
  if (dim.size > 62) return gagal(413, `terlalu banyak kunci berbeda (${dim.size}); maksimal 62`);   // batas 100 parameter terikat D1
  const tampilan = [...dim.values()].filter(a => a.dim === "tampil").reduce((x, a) => x + a.n, 0);
  const ditulis = await tulisHari(env, tglWIB(kini), o.h, {orang: bit("o"), kembali: bit("o") & bit("b"), kunjungan: bit("kv"), tampilan, klik, detik, slot: s, menit: true, dim}, kini, o.v);
  return new Response(null, {status: ditulis ? 204 : 202, headers: {"cache-control": "no-store"}});
}

/* cron per jam: sumber data basi dicatat per slot 10 menit -> pita gangguan di grafik "Orang di peta" */
export async function catatGangguan(env, hasil, kini) {
  if (hasil.ok) return 0;
  const dim = new Map(hasil.basi.map(b => ["basi" + b, {dim: "basi", kunci: b, n: 1, s: 0}]));
  await tulisHari(env, tglWIB(kini), "sistem", {orang: 0, kembali: 0, kunjungan: 0, tampilan: 0, klik: 0, detik: 0, slot: [slotWIB(kini)], menit: false, dim}, kini, null);
  return hasil.basi.length;
}

/* ================================================================ GET /api/statistik (admin) */
const RE_TGL = /^\d{4}-\d{2}-\d{2}$/;
const larik = t => { try { return JSON.parse(t); } catch (e) { return []; } };
export async function statistik(env, req, url, kini) {
  if (!await adminOK(env, req, kini)) return gagal(401, "perlu masuk admin (cookie sesi /admin/masuk atau Authorization: Bearer <ADMIN_TOKEN>)");
  const q = url.searchParams, hal = q.get("hal") || "";
  if (hal && !HAL.includes(hal)) return gagal(400, `hal harus kosong atau ${HAL.join("/")}`);
  const fh = hal ? "hal = ?3" : "hal != 'sistem'";
  /* "saat ini" = kiriman dalam 5 menit terakhir (perkiraan: klien mengirim saat halaman ditutup/disembunyikan, bukan detak) */
  const m = menitWIB(kini), hk = await env.DB.prepare(`SELECT hal, menit FROM stat_hari WHERE tgl = ?1 AND ${hal ? "hal = ?2" : "hal != 'sistem'"}`).bind(tglWIB(kini), ...(hal ? [hal] : [])).all();
  const per_hal = {}; let sekarang = 0, n30 = 0;
  for (const r of hk.results) { const a = larik(r.menit), jml = k => { let t = 0; for (let i = Math.max(0, m - k + 1); i <= m; i++) t += a[i] || 0; return Math.round(t); };
    per_hal[r.hal] = {sekarang: jml(5), n30: jml(30)}; sekarang += per_hal[r.hal].sekarang; n30 += per_hal[r.hal].n30; }
  const langsung = {kini, sekarang, n30, per_hal};
  if (q.get("kini") === "1") return json(langsung);

  const sampai = q.get("sampai") || tglWIB(kini), dari = q.get("dari") || sampai;
  if (!RE_TGL.test(dari) || !RE_TGL.test(sampai) || dari > sampai) return gagal(400, "dari/sampai harus YYYY-MM-DD dan dari <= sampai");
  const hariN = (Date.parse(sampai) - Date.parse(dari)) / HARI + 1;
  if (!(hariN <= 90)) return gagal(400, `rentang ${hariN} hari; maksimal 90`);
  const ikat = hal ? [dari, sampai, hal] : [dari, sampai];
  const [harian, slot, dim, gang, pesan] = await env.DB.batch([
    env.DB.prepare(`SELECT tgl, sum(orang) orang, sum(kembali) kembali, sum(kunjungan) kunjungan, sum(tampilan) tampilan, sum(klik) klik, sum(detik) detik,
      sum(kiriman) kiriman, min(sampel) sampel FROM stat_hari WHERE tgl BETWEEN ?1 AND ?2 AND ${fh} GROUP BY tgl ORDER BY tgl`).bind(...ikat),
    env.DB.prepare(`SELECT slot FROM stat_hari WHERE tgl = ?2 AND ${fh}`).bind(...ikat),
    /* gabungan dimensi lintas hari dikerjakan SQLite (json_each), bukan CPU Worker; 60 kunci teratas per dimensi */
    env.DB.prepare(`WITH d AS (SELECT j.key dim, k.key kunci, sum(json_extract(k.value, '$[0]')) n, sum(json_extract(k.value, '$[1]')) s
        FROM stat_hari h, json_each(h.dim) j, json_each(j.value) k WHERE h.tgl BETWEEN ?1 AND ?2 AND h.${fh} AND j.key != '_n' GROUP BY 1, 2)
      SELECT dim, kunci, n, s FROM (SELECT *, row_number() OVER (PARTITION BY dim ORDER BY n DESC) r FROM d) WHERE r <= 60 ORDER BY dim, n DESC`).bind(...ikat),
    env.DB.prepare("SELECT slot FROM stat_hari WHERE tgl = ? AND hal = 'sistem'").bind(sampai),
    env.DB.prepare("SELECT count(*) n FROM pesan WHERE status = 'baru'"),
  ]);
  const D = {};
  for (const r of dim.results) (D[r.dim] ||= []).push([r.kunci, Math.round(r.n * 10) / 10, Math.round(r.s * 10) / 10]);
  const sl = new Array(144).fill(0);
  for (const r of slot.results) larik(r.slot).forEach((v, i) => sl[i] += v);
  const H = harian.results.map(r => ({...r, ...Object.fromEntries(["orang", "kembali", "kunjungan", "tampilan", "klik", "detik"].map(k => [k, Math.round(r[k])]))}));
  const jml = k => H.reduce((s, r) => s + (r[k] || 0), 0);
  const jamWIB = new Date(kini + WIB).toISOString().slice(11, 16);
  return json({dari, sampai, hal: hal || null, hari: hariN,
    jendela: `${dari === sampai ? sampai : dari + " s.d. " + sampai}, 00:00–${sampai === tglWIB(kini) ? jamWIB : "24:00"} WIB`,
    ringkas: {orang: jml("orang"), kembali: jml("kembali"), kunjungan: jml("kunjungan"), tampilan: jml("tampilan"), klik: jml("klik"), detik: jml("detik"), kiriman: jml("kiriman")},
    sampel: H.some(r => r.sampel < 1), harian: H,
    slot: sl.map((v, i) => [i, Math.round(v)]).filter(([, v]) => v > 0),
    gangguan: larik(gang.results[0]?.slot || "[]").map((v, i) => v > 0 ? i : -1).filter(i => i >= 0),
    dim: D, langsung, pesan_baru: pesan.results[0].n, email_siap: emailSiap(env)});
}

/* ================================================================ sesi admin: cookie HMAC "exp.moderator.tanda", 12 jam */
const SESI_UMUR = 12 * JAM, COOKIE = "sesi_admin";
const kunciHMAC = env => crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESI_KUNCI), {name: "HMAC", hash: "SHA-256"}, false, ["sign", "verify"]);
export async function buatSesi(env, mod, kini) {
  const isi = `${kini + SESI_UMUR}.${mod}`;
  return isi + "." + hex(await crypto.subtle.sign("HMAC", await kunciHMAC(env), new TextEncoder().encode(isi)));
}
/* sah bila tanda HMAC cocok (perbandingan waktu-tetap oleh subtle.verify), belum kedaluwarsa, dan token moderatornya masih ada di ADMIN_TOKEN */
export async function sesiOK(env, req, kini, modSah) {
  if (!env.SESI_KUNCI) return null;
  const m = (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([0-9a-f]{12})\\.([0-9a-f]{64})`));
  if (!m || Number(m[1]) <= kini || !modSah.includes(m[2])) return null;
  const tanda = new Uint8Array(m[3].match(/../g).map(h => parseInt(h, 16)));
  return await crypto.subtle.verify("HMAC", await kunciHMAC(env), tanda, new TextEncoder().encode(`${m[1]}.${m[2]}`)) ? m[2] : null;
}
const cookie = (nilai, umur) => `${COOKIE}=${nilai}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${umur}`;
const html = (isi, status = 200, h = {}) => new Response(isi, {status, headers: {"content-type": "text/html; charset=utf-8", "cache-control": "no-store",
  "x-frame-options": "DENY", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "content-security-policy": CSP_ADMIN, ...h}});
const alihkan = (ke, h = {}) => new Response(null, {status: 303, headers: {location: ke, "cache-control": "no-store", ...h}});

export async function masuk(env, req, kini, halamanMasuk) {
  if (!env.SESI_KUNCI || !env.ADMIN_TOKEN) return html(halamanMasuk("Server belum dikonfigurasi (SESI_KUNCI / ADMIN_TOKEN)."), 503);
  if (req.method === "GET") return (await adminOK(env, req, kini)) ? alihkan("/admin/statistik") : html(halamanMasuk(""));
  const laju = await cekLaju(env, await ipHash(env, req), "masuk", kini);
  if (laju) return html(halamanMasuk("Terlalu banyak percobaan. Coba lagi nanti."), 429, {"retry-after": laju.headers.get("retry-after") || "900"});
  const t = await req.text();
  /* akun = entri "email:sandi" di ADMIN_TOKEN (email huruf kecil); tetap lewat adminOK supaya sesi & pencabutan sama dengan token */
  const f = new URLSearchParams(t.length <= 2048 ? t : ""), email = (f.get("email") || "").trim().toLowerCase(), sandi = f.get("sandi") || "";
  const sah = email && sandi && await adminOK(env, new Request("http://x/", {headers: {"x-admin-token": `${email}:${sandi}`}}), kini);
  if (!sah) return html(halamanMasuk("Email atau kata sandi salah."), 401);
  return alihkan("/admin/statistik", {"set-cookie": cookie(await buatSesi(env, sah, kini), SESI_UMUR / 1000)});
}
export const keluar = () => alihkan("/admin/masuk", {"set-cookie": cookie("", 0)});
export async function halamanAdmin(env, req, kini, isi) {
  return (await adminOK(env, req, kini)) ? html(isi) : alihkan("/admin/masuk");
}

/* ================================================================ kotak pesan */
export const KATEGORI = {masukan: "Masukan", koreksi: "Koreksi data", kerja_sama: "Kerja sama", media: "Media", lainnya: "Lainnya"};
export const emailSiap = env => !!(env.EMAIL_API_KEY && env.EMAIL_TO && env.EMAIL_FROM);
const RE_EMAIL = /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const polos = (s, n) => String(s ?? "").normalize("NFC").replace(/<[^>]*>?/g, "").replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, n + 1);

export async function kirimPesan(env, req, ctx, kini) {
  const t = await req.text();
  if (t.length > 8192) return gagal(413, `body ${t.length} byte, maksimal 8192`);
  let o; try { o = JSON.parse(t); } catch (e) { return gagal(400, "body bukan JSON"); }
  if (!o || typeof o !== "object" || Array.isArray(o)) return gagal(400, "body harus objek JSON");
  if (o.situs) return gagal(400, "kiriman ditolak");   // honeypot: kolom tersembunyi yang hanya diisi bot
  const email = String(o.email ?? "").trim().toLowerCase();
  if (!email) return gagal(400, "email wajib diisi supaya tim bisa membalas");
  if (email.length > 254 || !RE_EMAIL.test(email)) return gagal(400, "alamat email tidak sah");
  if (!(o.kategori in KATEGORI)) return gagal(400, `kategori harus ${Object.keys(KATEGORI).join("/")}`);
  const isi = polos(o.pesan, 2000), nama = polos(o.nama, 100), instansi = polos(o.instansi, 150);
  if (isi.length < 10) return gagal(400, `pesan minimal 10 karakter, diterima ${isi.length}`);
  if (isi.length > 2000) return gagal(400, "pesan maksimal 2000 karakter");
  if (nama.length > 100 || instansi.length > 150) return gagal(400, "nama maksimal 100, instansi maksimal 150 karakter");
  let tautan = String(o.tautan ?? "").trim().slice(0, 500);
  try { if (tautan && !/^https?:$/.test(new URL(tautan).protocol)) tautan = ""; } catch (e) { tautan = ""; }
  if (!(await turnstileOK(env, o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  const laju = await cekLaju(env, await ipHash(env, req), "pesan", kini); if (laju) return laju;
  const p = {id: acak(8), dibuat: kini, nama, instansi, email, kategori: o.kategori, isi, tautan};
  await env.DB.prepare(`INSERT INTO pesan (id, dibuat, diubah, nama, instansi, email, kategori, isi, tautan, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(p.id, kini, kini, nama, instansi, email, p.kategori, isi, tautan, await ipHash(env, req)).run();
  if (emailSiap(env)) ctx?.waitUntil?.(kabariEmail(env, p).catch(e => console.error("email", e)));
  return json({id: p.id}, 201);
}

/* notifikasi lewat Resend (https://resend.com). Tanpa EMAIL_API_KEY/EMAIL_TO/EMAIL_FROM: dilewati diam-diam, admin melihat spanduk. */
export async function kabariEmail(env, p) {
  const r = await fetch("https://api.resend.com/emails", {method: "POST", headers: {authorization: `Bearer ${env.EMAIL_API_KEY}`, "content-type": "application/json"},
    body: JSON.stringify({from: env.EMAIL_FROM, to: env.EMAIL_TO.split(",").map(s => s.trim()).filter(Boolean), reply_to: p.email,
      subject: `[Posko] ${KATEGORI[p.kategori]}: pesan dari ${p.nama || p.email}`,
      text: `${p.isi}\n\n— ${p.nama || "(tanpa nama)"}${p.instansi ? ", " + p.instansi : ""} <${p.email}>\nKategori: ${KATEGORI[p.kategori]}\n${p.tautan ? "Tampilan: " + p.tautan + "\n" : ""}\nBalas email ini untuk menjawab langsung. Kotak pesan: /admin/pesan`})});
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return true;
}

export async function daftarPesan(env, req, url, kini) {
  if (!await adminOK(env, req, kini)) return gagal(401, "perlu masuk admin");
  const q = url.searchParams, status = q.get("status") || "aktif", kat = q.get("kategori") || "", cari = (q.get("q") || "").slice(0, 100);
  if (!["aktif", "baru", "dibaca", "arsip", "semua"].includes(status)) return gagal(400, "status harus aktif/baru/dibaca/arsip/semua");
  if (kat && !(kat in KATEGORI)) return gagal(400, "kategori tidak dikenal");
  const w = [], ikat = [];
  if (status === "aktif") w.push("status != 'arsip'"); else if (status !== "semua") { w.push("status = ?"); ikat.push(status); }
  if (kat) { w.push("kategori = ?"); ikat.push(kat); }
  if (cari) { w.push("(nama LIKE ? OR instansi LIKE ? OR email LIKE ? OR isi LIKE ?)"); const l = `%${cari.replace(/[%_]/g, "")}%`; ikat.push(l, l, l, l); }
  const [r, h] = await env.DB.batch([
    env.DB.prepare(`SELECT id, dibuat, diubah, nama, instansi, email, kategori, isi, tautan, status FROM pesan ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY dibuat DESC LIMIT 300`).bind(...ikat),
    env.DB.prepare("SELECT status, count(*) n FROM pesan GROUP BY status"),
  ]);
  return json({pesan: r.results, hitung: Object.fromEntries(h.results.map(x => [x.status, x.n])), kategori: KATEGORI, email_siap: emailSiap(env)});
}

export async function ubahPesan(env, req, id, kini) {
  if (!await adminOK(env, req, kini)) return gagal(401, "perlu masuk admin");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  if (!["baru", "dibaca", "arsip"].includes(b.o.status)) return gagal(400, "status harus baru/dibaca/arsip");
  const r = await env.DB.prepare("UPDATE pesan SET status = ?, diubah = ? WHERE id = ?").bind(b.o.status, kini, id).run();
  if (!r.meta.changes) return gagal(404, "pesan tidak ada");
  return json({id, status: b.o.status});
}

/* retensi: statistik 90 hari, pesan 180 hari, catatan laju 2 hari */
export const bersihkanStatistik = (env, kini) => [
  env.DB.prepare("DELETE FROM stat_hari WHERE tgl < ? AND hal != 'publik'").bind(tglWIB(kini - 90 * HARI)),
  env.DB.prepare(`UPDATE stat_hari SET dim = '{"_n":{}}', kini = '[]', menit = '${kosong(1440)}' WHERE tgl < ? AND hal = 'publik' AND dim != '{"_n":{}}'`).bind(tglWIB(kini - 90 * HARI)),
  env.DB.prepare("DELETE FROM stat_tamu WHERE tgl < ?").bind(tglWIB(kini - HARI)),
  env.DB.prepare("DELETE FROM pesan WHERE dibuat <= ?").bind(kini - 180 * HARI),
  env.DB.prepare("DELETE FROM laju WHERE waktu <= ?").bind(kini - 2 * HARI),
];
