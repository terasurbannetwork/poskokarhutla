/* Alun-alun: forum publik warga, relawan, BPBD. Rancangan: docs/bnpb/ARSITEKTUR.md, docs/bnpb/RENCANA-12-JAM.md R2. Skema: migrations/0024_alun.sql.
   Setiap rute bergerbang sejak awal: tulis = bersihTeks + Turnstile + laju per IP; pengumuman/moderasi = modOK; dummy = superOK; tabel belum ada = 503. */
import {json, gagal, sha, acak, ipHash, bacaBody, bersihTeks, turnstileOK, cacheTepi} from "./worker.js";
import {laju, lajuIP, kodeBaru, pemegangKode, halamanBnpbPublik} from "./bnpb.js";
import {modOK, superOK, num} from "./posko.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import {hidup} from "./bencana.js";

const JAM = 3600e3, HARI = 24 * JAM;
export const JENIS = ["tanya", "butuh_bantuan", "info_lapangan", "pengumuman"];
export const BANTUAN = ["terbuka", "ditangani", "selesai"];
export const ALASAN = ["spam", "kasar", "hoaks", "data_pribadi", "lainnya"];
export const MODERASI = ["tampil", "dilaporkan", "tersembunyi"];
export const TERUSKAN = ["relawan", "logistik"];
export const URUT = ["terbaru", "terpopuler", "belum_terjawab"];
export const PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan", "17": "Bengkulu", "18": "Lampung",
  "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta", "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten",
  "51": "Bali", "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "64": "Kalimantan Timur",
  "65": "Kalimantan Utara", "71": "Sulawesi Utara", "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
  "81": "Maluku", "82": "Maluku Utara", "91": "Papua", "92": "Papua Barat", "93": "Papua Selatan", "94": "Papua Tengah", "95": "Papua Pegunungan", "96": "Papua Barat Daya"};
const BENCANA = () => new Set([...hidup().map(b => b.id), "umum"]);   // registry public/bencana.json + "umum" (tidak terkait satu bencana)
const BATAS = {tulis: [[JAM, 5], [HARI, 20]], balas: [[JAM, 20]], upvote: [[JAM, 120]], lapor: [[JAM, 20]], terjawab: [[JAM, 30]]};
const MAKS_JUDUL = 120, MAKS_UTAS = 1000, MAKS_BALAS = 280, MAKS_NAMA = 40, MAKS_KAB = 60, GLOBAL_UTAS_JAM = 200, AMBANG_ADUAN = 5, MAKS_BALASAN_UTAS = 300, MAKS_SEMATAN = 5, HALAMAN = 20;

/* nama tampil bebas tidak boleh meniru petugas (moderator memakai lencana Petugas, bukan nama) */
const NAMA_RESMI = /petugas|bpbd|bnpb|admin|moderator|resmi|pemerintah|polisi|\btni\b|basarnas/i;
const tolakNama = nama => nama != null && NAMA_RESMI.test(nama) ? "nama: tidak boleh memuat sebutan petugas/instansi resmi" : null;
/* kunci cache dari parameter yang sudah divalidasi saja; query liar (?x=1, urutan lain) tidak membuat kunci baru */
export const kunciDaftar = (url, {jenis, bencana, prov, urut, kursor}) => {
  const k = new URL("/api/alun", url);
  for (const [a, v] of [["bencana", bencana], ["jenis", jenis], ["kursor", kursor === "0" ? "" : kursor], ["prov", prov], ["urut", urut === "terbaru" ? "" : urut]]) if (v) k.searchParams.set(a, v);
  return new Request(k, {method: "GET"});
};
const tolakMod = () => gagal(403, "hanya untuk moderator ke atas (bukan akun gerbang situs)");
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "fitur belum diaktifkan (migrasi 0024_alun belum dijalankan)"); throw e; }
};

/* ---------------- teks ---------------- */
/* teks utas sampai 1000 huruf: bersihTeks yang sama dengan Lapor Warga (tolak kata kasar, buang tautan & nomor HP), hanya batasnya yang dinaikkan */
export function bersihPanjang(t, maks = MAKS_UTAS) {
  const r = bersihTeks(t, maks); if (r.galat) return r;
  return r.teks ? r : {galat: "teks kosong"};
}
const opsi = (v, maks, nama) => {   // teks opsional pendek: null bila kosong
  if (v == null || v === "") return {teks: null};
  if (typeof v !== "string") return {galat: `${nama} harus teks`};
  const r = bersihPanjang(v.trim(), maks); return r.galat ? {galat: `${nama}: ${r.galat}`} : r;
};

/* ---------------- baca ---------------- */
const KOLOM = "id, moderasi, aduan_n, dummy, jenis, judul, bencana, prov, kab, nama, sematan, bantuan, teruskan_ke, terjawab_id IS NOT NULL terjawab, balasan_n, upvote, dibuat";
const baris = (r, admin) => ({id: r.id, jenis: r.jenis, judul: r.judul, bencana: r.bencana, prov: r.prov, prov_nama: PROV[r.prov] || null, kab: r.kab, nama: r.nama || null,
  resmi: r.jenis === "pengumuman", sematan: !!r.sematan, bantuan: r.bantuan, teruskan_ke: r.teruskan_ke, terjawab: !!r.terjawab, balasan: r.balasan_n, upvote: r.upvote, dibuat: r.dibuat,
  ...(admin ? {moderasi: r.moderasi, aduan: r.aduan_n, dummy: !!r.dummy} : {})});
const sapaan = r => r.petugas ? "Petugas" : r.nama || null;

async function daftar(env, req, url, kini, ctx) {
  const dummy = url.searchParams.get("dummy") === "1" && !!await modOK(env, req);
  const jenis = url.searchParams.get("jenis") || "", bencana = url.searchParams.get("bencana") || "", prov = url.searchParams.get("prov") || "", urut = url.searchParams.get("urut") || "terbaru";
  const kursor = url.searchParams.get("kursor") || "0";
  if (jenis && !JENIS.includes(jenis)) return gagal(400, "jenis tidak dikenal");
  if (bencana && !/^[a-z_]{3,30}$/.test(bencana)) return gagal(400, "bencana tidak sah");
  if (prov && !PROV[prov]) return gagal(400, "prov harus kode provinsi 2 digit");
  if (!URUT.includes(urut)) return gagal(400, "urut harus terbaru, terpopuler, atau belum_terjawab");
  if (!/^\d{1,6}$/.test(kursor)) return gagal(400, "kursor tidak sah");
  const buat = async () => {
    const w = ["moderasi <> 'tersembunyi'", ...(dummy ? [] : ["dummy = 0"])], b = [];
    if (jenis) { w.push("jenis = ?"); b.push(jenis); }
    if (bencana) { w.push("bencana = ?"); b.push(bencana); }
    if (prov) { w.push("prov = ?"); b.push(prov); }
    if (urut === "belum_terjawab") w.push("terjawab_id IS NULL AND jenis IN ('tanya', 'butuh_bantuan')");
    const mulai = +kursor === 0 && (!jenis || jenis === "pengumuman");
    const sematan = mulai ? (await env.DB.prepare(`SELECT ${KOLOM} FROM alun_utas WHERE sematan = 1 AND moderasi <> 'tersembunyi' ${dummy ? "" : "AND dummy = 0"} ORDER BY dibuat DESC LIMIT ${MAKS_SEMATAN}`).all()).results : [];
    const susun = urut === "terpopuler" ? "upvote DESC, dibuat DESC" : urut === "belum_terjawab" ? "dibuat ASC" : "dibuat DESC";
    const rs = (await env.DB.prepare(`SELECT ${KOLOM} FROM alun_utas WHERE ${w.join(" AND ")} AND sematan = 0 ORDER BY ${susun}, id LIMIT ${HALAMAN + 1} OFFSET ${+kursor}`).bind(...b).all()).results;
    return json({utas: rs.slice(0, HALAMAN).map(r => baris(r, dummy)), sematan: sematan.map(r => baris(r, dummy)), berikut: rs.length > HALAMAN ? String(+kursor + HALAMAN) : null});
  };
  return dummy ? buat() : cacheTepi(kunciDaftar(url, {jenis, bencana, prov, urut, kursor}), ctx, 10, buat);
}

async function rincian(env, req, id, ctx) {
  const admin = await modOK(env, req);
  if (!admin) return cacheTepi(new Request(new URL("/api/alun/" + id, req.url), {method: "GET"}), ctx, 10, () => rincianBaca(env, id, null, false));
  return rincianBaca(env, id, admin, new URL(req.url).searchParams.get("dummy") === "1");
}
async function rincianBaca(env, id, admin, dummy) {
  const u = await env.DB.prepare(`SELECT ${KOLOM}, teks, lat, lon, teruskan_catatan, terjawab_id FROM alun_utas WHERE id = ?`).bind(id).first();
  if (!u || (u.moderasi === "tersembunyi" && !admin) || (u.dummy && !dummy)) return gagal(404, "utas tidak ada");
  const bs = (await env.DB.prepare(`SELECT id, teks, nama, petugas, moderasi, upvote, aduan_n, dibuat, dummy FROM alun_balas WHERE utas_id = ? ${admin ? "" : "AND moderasi <> 'tersembunyi'"} ORDER BY dibuat, id LIMIT 300`).bind(id).all()).results;
  return json({...baris(u, !!admin), teks: u.teks, lat: u.lat, lon: u.lon, terjawab_id: u.terjawab_id, ...(admin ? {teruskan_catatan: u.teruskan_catatan} : {}),
    balasan_daftar: bs.map(r => ({id: r.id, teks: r.teks, nama: sapaan(r), petugas: !!r.petugas, upvote: r.upvote, dibuat: r.dibuat, ...(admin ? {moderasi: r.moderasi, aduan: r.aduan_n, dummy: !!r.dummy} : {})}))});
}

/* ---------------- tulis ---------------- */
async function tulis(env, req, kini) {
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (typeof o.jenis !== "string" || !JENIS.includes(o.jenis)) return gagal(400, "jenis harus tanya, butuh_bantuan, info_lapangan, atau pengumuman");
  const resmi = o.jenis === "pengumuman", mod = resmi ? await modOK(env, req) : null;
  if (resmi && !mod) return gagal(403, "pengumuman resmi hanya untuk admin");
  if (typeof o.judul !== "string" || o.judul.length > MAKS_JUDUL) return gagal(400, `judul wajib, maksimal ${MAKS_JUDUL} huruf`);
  const judul = bersihPanjang(o.judul.trim(), MAKS_JUDUL); if (judul.galat) return gagal(400, "judul: " + judul.galat);
  if (judul.teks.length < 3) return gagal(400, "judul minimal 3 huruf");
  if (typeof o.teks !== "string") return gagal(400, "teks wajib");
  const teks = bersihPanjang(o.teks.trim()); if (teks.galat) return gagal(400, teks.galat);
  if (typeof o.bencana !== "string" || !BENCANA().has(o.bencana)) return gagal(400, "bencana tidak dikenal");
  if (typeof o.prov !== "string" || !PROV[o.prov]) return gagal(400, "prov harus kode provinsi 2 digit");
  const kab = opsi(o.kab, MAKS_KAB, "kab"); if (kab.galat) return gagal(400, kab.galat);
  if (kab.teks != null && kab.teks.length < 2) return gagal(400, "kab minimal 2 huruf");
  const nama = opsi(o.nama, MAKS_NAMA, "nama"); if (nama.galat) return gagal(400, nama.galat);
  if (nama.teks != null && nama.teks.length < 2) return gagal(400, "nama minimal 2 huruf");
  const tn = !mod && tolakNama(nama.teks); if (tn) return gagal(400, tn);
  const lat0 = num(o.lat, -11.5, 6.5), lon0 = num(o.lon, 94.5, 141.5);
  if (Number.isNaN(lat0) || Number.isNaN(lon0) || (lat0 == null) !== (lon0 == null)) return gagal(400, "lat dan lon harus berpasangan dan di dalam Indonesia");
  const kira = v => v == null ? null : Math.round(v * 100) / 100, lat = kira(lat0), lon = kira(lon0);   // privasi: disimpan dibulatkan 2 desimal (sekitar 1 km); presisi penuh tidak pernah masuk D1
  if (o.sematan != null && (!resmi || typeof o.sematan !== "boolean")) return gagal(400, "sematan hanya untuk pengumuman");
  if (!mod) {
    const l = await lajuIP(env, req, "alun.tulis", BATAS.tulis, kini); if (l) return l;
    if (!(await turnstileOK(env, o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
    if ((await env.DB.prepare("SELECT count(*) n FROM alun_utas WHERE dibuat > ? AND dummy = 0").bind(kini - JAM).first()).n >= GLOBAL_UTAS_JAM)
      return gagal(429, "forum sedang ramai sekali; coba lagi sebentar lagi", {"retry-after": "600"});
  }
  if (o.sematan && (await env.DB.prepare("SELECT count(*) n FROM alun_utas WHERE sematan = 1").first()).n >= MAKS_SEMATAN) return gagal(409, `paling banyak ${MAKS_SEMATAN} pengumuman tersemat`);
  const id = acak(8), {kode, kode_sha} = await kodeBaru();
  await env.DB.prepare(`INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, kab, lat, lon, nama, pemilik_sha, sematan, bantuan, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, o.jenis, judul.teks, teks.teks, o.bencana, o.prov, kab.teks, lat, lon, nama.teks, kode_sha, o.sematan ? 1 : 0, o.jenis === "butuh_bantuan" ? "terbuka" : null, kini).run();
  return json({ok: true, id, kode}, 201);   // kode pemilik tampil sekali; hanya sha256-nya disimpan
}

const hitungBalas = (env, utas) => env.DB.prepare("UPDATE alun_utas SET balasan_n = (SELECT count(*) FROM alun_balas WHERE utas_id = ?1 AND moderasi <> 'tersembunyi') WHERE id = ?1").bind(utas);

async function balas(env, req, id, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, petugas = o.petugas === true, mod = petugas ? await modOK(env, req) : null;
  if (petugas && !mod) return tolakMod();
  if (typeof o.teks !== "string") return gagal(400, "teks wajib");
  const teks = bersihTeks(o.teks.trim()); if (teks.galat) return gagal(400, teks.galat);
  if (!teks.teks) return gagal(400, "teks kosong");
  const nama = petugas ? {teks: null} : opsi(o.nama, MAKS_NAMA, "nama"); if (nama.galat) return gagal(400, nama.galat);
  if (nama.teks != null && nama.teks.length < 2) return gagal(400, "nama minimal 2 huruf");
  const tn = tolakNama(nama.teks); if (tn) return gagal(400, tn);
  const u = await env.DB.prepare("SELECT id, moderasi, dummy, balasan_n FROM alun_utas WHERE id = ?").bind(id).first();
  if (!u || (u.moderasi === "tersembunyi" && !mod)) return gagal(404, "utas tidak ada");
  if (!mod) {
    const l = await lajuIP(env, req, "alun.balas", BATAS.balas, kini); if (l) return l;
    if (!(await turnstileOK(env, o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");
  }
  if (u.balasan_n >= MAKS_BALASAN_UTAS) return gagal(409, "utas ini sudah penuh");
  const rid = acak(8);
  await env.DB.batch([env.DB.prepare("INSERT INTO alun_balas (id, utas_id, teks, nama, petugas, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(rid, id, teks.teks, nama.teks, petugas ? 1 : 0, kini, u.dummy), hitungBalas(env, id)]);
  return json({ok: true, id: rid}, 201);
}

/* pos = utas atau balasan: kedua tabel berbagi ruang id acak 64-bit */
const cariPos = async (env, id) => {
  const u = await env.DB.prepare("SELECT id, jenis, moderasi, dummy, id utas_id, 'alun_utas' tabel FROM alun_utas WHERE id = ?").bind(id).first();
  return u || await env.DB.prepare("SELECT b.id, b.petugas, b.moderasi, b.dummy, b.utas_id, 'alun_balas' tabel, u.jenis FROM alun_balas b JOIN alun_utas u ON u.id = b.utas_id WHERE b.id = ?").bind(id).first();
};
/* hitung ulang cacah dari alun_suara (satu sumber kebenaran). Aduan >= ambang menyembunyikan, kecuali pos resmi (pengumuman, balasan petugas) dan permintaan bantuan (butuh_bantuan serta balasannya): tidak bisa dibungkam massa, cukup 'dilaporkan' untuk moderator. */
const hitungSuara = (env, p) => env.DB.prepare(`UPDATE ${p.tabel} SET upvote = (SELECT count(*) FROM alun_suara WHERE pos_id = ?1 AND jenis = 'upvote'),
  aduan_n = (SELECT count(*) FROM alun_suara WHERE pos_id = ?1 AND jenis = 'aduan'),
  moderasi = CASE WHEN moderasi <> 'tampil' AND moderasi <> 'dilaporkan' THEN moderasi
    WHEN ?2 = 1 THEN moderasi
    WHEN ?3 = 0 AND (SELECT count(*) FROM alun_suara WHERE pos_id = ?1 AND jenis = 'aduan') >= ${AMBANG_ADUAN} THEN 'tersembunyi'
    WHEN (SELECT count(*) FROM alun_suara WHERE pos_id = ?1 AND jenis = 'aduan') > 0 THEN 'dilaporkan' ELSE moderasi END WHERE id = ?1`).bind(p.id, p.jenis === "pengumuman" || p.petugas ? 1 : 0, p.jenis === "butuh_bantuan" ? 1 : 0);

async function suara(env, req, id, jenis, kini) {
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const alasan = jenis === "aduan" ? b.o.alasan : null;
  if (jenis === "aduan" && (typeof alasan !== "string" || !ALASAN.includes(alasan))) return gagal(400, "alasan harus " + ALASAN.join(", "));
  const p = await cariPos(env, id);
  if (!p || p.moderasi === "tersembunyi" || p.dummy) return gagal(404, "konten tidak ada");
  const l = await lajuIP(env, req, jenis === "aduan" ? "alun.lapor" : "alun.upvote", jenis === "aduan" ? BATAS.lapor : BATAS.upvote, kini); if (l) return l;
  if (jenis === "aduan" && !(await turnstileOK(env, b.o.turnstile, req))) return gagal(403, "verifikasi Turnstile gagal");   // aduan hanya dihitung dari manusia terverifikasi (anti pembungkaman massal)
  const baru = (await env.DB.prepare("INSERT OR IGNORE INTO alun_suara (pos_id, kunci, jenis, alasan, waktu) VALUES (?, ?, ?, ?, ?)").bind(id, await ipHash(env, req), jenis, alasan, kini).run()).meta.changes;
  if (baru) await env.DB.batch([hitungSuara(env, p), ...(jenis === "aduan" && p.tabel === "alun_balas" ? [hitungBalas(env, p.utas_id)] : [])]);
  const t = await env.DB.prepare(`SELECT upvote, aduan_n, moderasi FROM ${p.tabel} WHERE id = ?`).bind(id).first();
  return json({ok: true, baru: !!baru, upvote: t.upvote, tersembunyi: t.moderasi === "tersembunyi"});
}

async function terjawab(env, req, id, kini) {
  const mod = await modOK(env, req);
  if (!mod) {   // bukan moderator: harus pemilik utas (header x-kode, token dari saat membuat)
    const g = await pemegangKode(env, req, "alun", async h => env.DB.prepare("SELECT id FROM alun_utas WHERE id = ? AND pemilik_sha = ?").bind(id, h).first());
    if (g instanceof Response) return g;
    const l = await laju(env, "alun.kode:" + g.id, "alun.terjawab", BATAS.terjawab, kini); if (l) return l;
  }
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const bid = b.o.balasan_id;
  if (bid !== null && (typeof bid !== "string" || !/^[0-9a-f]{16}$/.test(bid))) return gagal(400, "balasan_id wajib (16 hex) atau null untuk mencabut");
  const u = await env.DB.prepare("SELECT jenis FROM alun_utas WHERE id = ?").bind(id).first();
  if (!u) return gagal(404, "utas tidak ada");
  if (u.jenis === "pengumuman") return gagal(400, "pengumuman tidak ditandai terjawab");
  if (bid === null) { await env.DB.prepare("UPDATE alun_utas SET terjawab_id = NULL, terjawab_pada = NULL WHERE id = ?").bind(id).run(); return json({ok: true, terjawab: false}); }
  const r = await env.DB.prepare("SELECT id FROM alun_balas WHERE id = ? AND utas_id = ? AND moderasi <> 'tersembunyi'").bind(bid, id).first();
  if (!r) return gagal(404, "balasan tidak ada di utas ini");
  await env.DB.prepare("UPDATE alun_utas SET terjawab_id = ?, terjawab_pada = ? WHERE id = ?").bind(bid, kini, id).run();
  return json({ok: true, terjawab: true});
}

/* ---------------- admin ---------------- */
async function adminDaftar(env, req, url, kini) {
  if (!await modOK(env, req)) return tolakMod();
  const d = url.searchParams.get("dummy") === "1", ft = d ? "1" : "dummy = 0";
  const ut = (await env.DB.prepare(`SELECT ${KOLOM}, teruskan_catatan FROM alun_utas WHERE ${ft} ORDER BY dibuat DESC LIMIT 150`).all()).results;
  const rb = (await env.DB.prepare(`SELECT b.id, b.utas_id, b.teks, b.nama, b.petugas, b.moderasi, b.aduan_n, b.upvote, b.dibuat, b.dummy, u.judul FROM alun_balas b JOIN alun_utas u ON u.id = b.utas_id
    WHERE b.moderasi <> 'tampil' ${d ? "" : "AND b.dummy = 0"} ORDER BY b.dibuat DESC LIMIT 40`).all()).results;
  const antrean = (await env.DB.prepare(`SELECT id, judul, teks, moderasi, aduan_n, dibuat, dummy FROM alun_utas WHERE moderasi <> 'tampil' AND ${ft} ORDER BY aduan_n DESC, dibuat DESC LIMIT 60`).all()).results;
  const ids = JSON.stringify([...antrean.map(x => x.id), ...rb.map(x => x.id)]);
  const al = (await env.DB.prepare("SELECT pos_id, alasan, count(*) n FROM alun_suara WHERE jenis = 'aduan' AND pos_id IN (SELECT value FROM json_each(?)) GROUP BY pos_id, alasan").bind(ids).all()).results;
  const alasan = id => Object.fromEntries(al.filter(x => x.pos_id === id).map(x => [x.alasan, x.n]));
  const stat = await env.DB.prepare(`SELECT jenis, count(*) n FROM alun_utas WHERE ${ft} GROUP BY jenis`).all();
  const tj = await env.DB.prepare(`SELECT count(*) n, avg(terjawab_pada - dibuat) rata FROM alun_utas WHERE terjawab_id IS NOT NULL AND ${ft}`).first();
  const lama = (await env.DB.prepare(`SELECT count(*) n FROM alun_utas WHERE bantuan = 'terbuka' AND dibuat < ? AND ${ft}`).bind(kini - HARI).first()).n;
  return json({
    stat: {per_jenis: Object.fromEntries(JENIS.map(j => [j, stat.results.find(x => x.jenis === j)?.n || 0])), terjawab: tj.n, rata_terjawab_ms: tj.n ? Math.round(tj.rata) : null, bantuan_terbuka_24j: lama,
      antrean: antrean.length + rb.length},
    antrean: [...antrean.map(x => ({tipe: "utas", id: x.id, utas_id: x.id, judul: x.judul, teks: x.teks, moderasi: x.moderasi, aduan: x.aduan_n, alasan: alasan(x.id), dibuat: x.dibuat, dummy: !!x.dummy})),
      ...rb.map(x => ({tipe: "balasan", id: x.id, utas_id: x.utas_id, judul: x.judul, teks: x.teks, moderasi: x.moderasi, aduan: x.aduan_n, alasan: alasan(x.id), dibuat: x.dibuat, petugas: !!x.petugas, dummy: !!x.dummy}))]
      .sort((a, b) => b.aduan - a.aduan || b.dibuat - a.dibuat),
    utas: ut.map(x => ({...baris(x, true), teruskan_catatan: x.teruskan_catatan})),
    bantuan: ut.filter(x => x.bantuan && x.bantuan !== "selesai").sort((a, b) => a.dibuat - b.dibuat).map(x => ({...baris(x, true), teruskan_catatan: x.teruskan_catatan})),
    prov: PROV, bencana: [...BENCANA()],
  });
}

const AKSI_ADMIN = ["tampilkan", "sembunyikan", "hapus", "sematkan", "lepas_sematan", "status", "teruskan"];
async function adminAksi(env, req, id, kini) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, aksi = o.aksi;
  if (typeof aksi !== "string" || !AKSI_ADMIN.includes(aksi)) return gagal(400, "aksi harus " + AKSI_ADMIN.join(", "));
  const p = await cariPos(env, id); if (!p) return gagal(404, "konten tidak ada");
  const utas = p.tabel === "alun_utas";
  if (["sematkan", "lepas_sematan", "status", "teruskan"].includes(aksi) && !utas) return gagal(400, "aksi ini hanya untuk utas");
  const dibatalkan = env.DB.prepare("UPDATE alun_utas SET terjawab_id = NULL, terjawab_pada = NULL WHERE terjawab_id = ?").bind(id);
  const sisa = utas ? [] : [hitungBalas(env, p.utas_id)];
  if (aksi === "tampilkan") await env.DB.batch([env.DB.prepare(`UPDATE ${p.tabel} SET moderasi = 'tampil', aduan_n = 0 WHERE id = ?`).bind(id), env.DB.prepare("DELETE FROM alun_suara WHERE pos_id = ? AND jenis = 'aduan'").bind(id), ...sisa]);
  else if (aksi === "sembunyikan") await env.DB.batch([env.DB.prepare(`UPDATE ${p.tabel} SET moderasi = 'tersembunyi' WHERE id = ?`).bind(id), dibatalkan, ...sisa]);
  else if (aksi === "hapus") await env.DB.batch(utas
    ? [env.DB.prepare("DELETE FROM alun_suara WHERE pos_id = ?1 OR pos_id IN (SELECT id FROM alun_balas WHERE utas_id = ?1)").bind(id), env.DB.prepare("DELETE FROM alun_balas WHERE utas_id = ?").bind(id), env.DB.prepare("DELETE FROM alun_utas WHERE id = ?").bind(id)]
    : [env.DB.prepare("DELETE FROM alun_suara WHERE pos_id = ?").bind(id), env.DB.prepare("DELETE FROM alun_balas WHERE id = ?").bind(id), dibatalkan, ...sisa]);
  else if (aksi === "sematkan" || aksi === "lepas_sematan") {
    if (p.jenis !== "pengumuman") return gagal(400, "hanya pengumuman yang bisa disematkan");
    if (aksi === "sematkan" && (await env.DB.prepare("SELECT count(*) n FROM alun_utas WHERE sematan = 1 AND id <> ?").bind(id).first()).n >= MAKS_SEMATAN) return gagal(409, `paling banyak ${MAKS_SEMATAN} pengumuman tersemat`);
    await env.DB.prepare("UPDATE alun_utas SET sematan = ? WHERE id = ?").bind(aksi === "sematkan" ? 1 : 0, id).run();
  } else if (aksi === "status") {
    if (p.jenis !== "butuh_bantuan") return gagal(400, "status hanya untuk utas butuh_bantuan");
    if (!BANTUAN.includes(o.status)) return gagal(400, "status harus " + BANTUAN.join(", "));
    await env.DB.prepare("UPDATE alun_utas SET bantuan = ? WHERE id = ?").bind(o.status, id).run();
  } else {   // teruskan
    if (p.jenis !== "butuh_bantuan") return gagal(400, "teruskan hanya untuk utas butuh_bantuan");
    if (o.ke !== null && !TERUSKAN.includes(o.ke)) return gagal(400, "ke harus " + TERUSKAN.join(", ") + " atau null");
    const c = opsi(o.catatan, 300, "catatan"); if (c.galat) return gagal(400, c.galat);
    await env.DB.prepare("UPDATE alun_utas SET teruskan_ke = ?, teruskan_catatan = ? WHERE id = ?").bind(o.ke, o.ke ? c.teks : null, id).run();
  }
  return json({ok: true});
}

/* ---------------- dummy (DUMMY.md): satu halaman = seluruh rantai, tiap jenis dan status ada ---------------- */
const mnt = 60e3;
const D = [   // jam = umur utas; balas: [teks, petugas, upvote, jam sesudah utas, jawaban]
  {j: "tanya", s: "Apakah air sumur aman diminum setelah banjir surut?", t: "Rumah kami di tepi sungai baru kering kemarin. Air sumur masih keruh. Perlu dikuras berapa kali sebelum dipakai?", b: "banjir", p: "33", k: "Kabupaten Demak", n: "Sari", jam: 30, up: 14,
    r: [["Kuras sampai jernih, lalu diamkan sehari dan tambahkan kaporit sesuai takaran puskesmas.", 1, 9, 2, 1], ["Rebus dulu air minumnya sampai mendidih minimal satu menit.", 0, 4, 3]]},
  {j: "tanya", s: "Di mana posko pengungsian terdekat Kalimantan Tengah?", t: "Asap makin tebal di kampung kami. Ada posko dengan masker dan ruang bersih?", b: "karhutla", p: "62", k: "Kota Palangka Raya", n: null, jam: 20, up: 8,
    r: [["Posko ruang bersih ada di kantor kelurahan dan gedung olahraga kota. Buka sepanjang hari.", 1, 6, 1, 1]]},
  {j: "tanya", s: "Kapan status gunung naik lagi?", t: "Warga menunggu kabar terbaru. Apakah jalur evakuasi sudah dibuka?", b: "gunungapi", p: "51", k: null, n: "Wayan", jam: 5, up: 3, r: []},
  {j: "tanya", s: "Soal obat gratis untuk pengungsi", t: "Pertanyaan ini dilaporkan karena dianggap iklan terselubung oleh beberapa orang.", b: "banjir", p: "32", k: null, n: null, jam: 12, up: 1, mod: "dilaporkan", ad: ["spam", "lainnya"], r: []},
  {j: "tanya", s: "Postingan yang sudah disembunyikan karena kasar", t: "Isi dummy yang menunggu keputusan moderator.", b: "cuaca", p: "35", k: null, n: null, jam: 40, up: 0, mod: "tersembunyi", ad: ["kasar", "kasar", "spam"], r: []},
  {j: "butuh_bantuan", s: "Butuh perahu karet untuk evakuasi lansia", t: "Air naik sampai dada. Ada empat lansia di lantai dua dan satu balita. Kami butuh perahu secepatnya.", b: "banjir", p: "36", k: "Kabupaten Lebak", n: "Rudi", jam: 30, up: 22, bn: "terbuka",
    r: [["Kami catat. Tim sedang dikoordinasikan, mohon tetap di tempat tinggi.", 1, 11, 1, 0]]},
  {j: "butuh_bantuan", s: "Kekurangan air bersih di dusun terpencil", t: "Sumur kering sejak dua bulan. Sekitar 60 keluarga mengambil air dari jarak dua kilometer.", b: "kekeringan", p: "53", k: "Kabupaten Timor Tengah Selatan", n: null, jam: 6, up: 17, bn: "terbuka", r: []},
  {j: "butuh_bantuan", s: "Obat pernapasan dan masker untuk balita", t: "Anak-anak mulai batuk karena asap. Posko kecamatan kehabisan masker.", b: "karhutla", p: "16", k: "Kabupaten Ogan Komering Ilir", n: "Dewi", jam: 26, up: 12, bn: "ditangani", fw: ["relawan", "Diteruskan ke koordinator relawan kesehatan wilayah."],
    r: [["Relawan kesehatan menuju lokasi sore ini membawa masker dan inhaler.", 1, 7, 3, 0], ["Terima kasih, kami tunggu di balai desa.", 0, 2, 4]]},
  {j: "butuh_bantuan", s: "Logistik makanan untuk 120 pengungsi", t: "Stok beras habis hari ini. Dapur umum belum berjalan.", b: "gempa", p: "52", k: "Kabupaten Lombok Utara", n: null, jam: 14, up: 19, bn: "ditangani", fw: ["logistik", "Diteruskan ke gudang logistik provinsi, kirim dua truk."],
    r: [["Kiriman logistik berangkat pukul empat sore.", 1, 8, 2, 0]]},
  {j: "butuh_bantuan", s: "Atap sekolah roboh, murid butuh tenda belajar", t: "Gempa kemarin merusak dua ruang kelas. Murid belajar di halaman.", b: "gempa", p: "73", k: "Kabupaten Maros", n: "Guru Amir", jam: 70, up: 9, bn: "selesai",
    r: [["Tenda belajar sudah terpasang oleh relawan kampus.", 1, 5, 20, 1]]},
  {j: "butuh_bantuan", s: "Pompa air untuk menguras rumah", t: "Genangan sudah surut tetapi lumpur menutup lantai.", b: "banjir", p: "13", k: "Kota Padang", n: null, jam: 50, up: 5, bn: "selesai", r: [["Pompa dipinjamkan oleh BPBD kota.", 1, 3, 10, 0]]},
  {j: "info_lapangan", s: "Jalan penghubung desa tertutup longsor", t: "Longsor menutup separuh jalan di tikungan dekat jembatan. Motor masih bisa lewat pelan.", b: "banjir", p: "32", k: "Kabupaten Garut", n: "Asep", jam: 9, up: 15,
    r: [["Terima kasih informasinya, alat berat dikirim besok pagi.", 1, 6, 4, 0]]},
  {j: "info_lapangan", s: "Titik api baru di lahan gambut dekat sekolah", t: "Terlihat api kecil dan asap putih sejak pagi. Warga sudah menyiram sekadarnya.", b: "karhutla", p: "14", k: "Kabupaten Pelalawan", n: null, jam: 3, up: 11, r: []},
  {j: "info_lapangan", s: "Air sungai naik cepat sejak subuh", t: "Tinggi air naik sekitar satu meter dalam tiga jam. Hati-hati yang tinggal di bantaran.", b: "banjir", p: "64", k: "Kota Samarinda", n: "Joko", jam: 2, up: 6, r: []},
  {j: "info_lapangan", s: "Laporan yang dilaporkan karena belum jelas kebenarannya", t: "Katanya ada retakan besar di bukit. Belum ada yang memastikan.", b: "gempa", p: "31", k: null, n: null, jam: 8, up: 2, mod: "dilaporkan", ad: ["hoaks"], r: [["Balasan yang dilaporkan sebagai kasar oleh satu orang.", 0, 0, 1, 0, "dilaporkan"]]},
  {j: "pengumuman", s: "Jam layanan posko terpadu diperpanjang", t: "Posko terpadu BPBD melayani sampai pukul 22.00 selama masa tanggap darurat. Bawa kartu keluarga bila ada.", b: "umum", p: "62", k: null, n: null, jam: 18, up: 21, sem: 1, r: [["Apakah posko Sampit juga buka sampai malam?", 0, 3, 2, 0], ["Posko Sampit mengikuti jam yang sama.", 1, 5, 3, 0]]},
  {j: "pengumuman", s: "Imbauan waspada hujan lebat tiga hari ke depan", t: "BMKG memperkirakan hujan lebat di sebagian besar Jawa. Siapkan tas siaga dan kenali jalur evakuasi.", b: "cuaca", p: "33", k: null, n: null, jam: 60, up: 10, r: []},
];
async function dummyIsi(env, kini) {
  if ((await env.DB.prepare("SELECT (SELECT count(*) FROM alun_utas WHERE dummy = 1) + (SELECT count(*) FROM alun_balas WHERE dummy = 1) n").first()).n) return gagal(409, "data dummy sudah ada; hapus dulu dengan 🧹");
  const st = [], suara = [], q = s => `'${String(s).replace(/'/g, "''")}'`;
  let nb = 0;
  for (const x of D) {
    const id = acak(8), dibuat = kini - x.jam * JAM, mod = x.mod || "tampil";
    const rs = x.r.map(r => ({id: acak(8), teks: r[0], petugas: r[1], up: r[2], waktu: dibuat + r[3] * JAM, jawab: r[4], mod: r[5] || "tampil"}));
    const jw = rs.find(r => r.jawab);
    st.push(env.DB.prepare(`INSERT INTO alun_utas (id, jenis, judul, teks, bencana, prov, kab, nama, pemilik_sha, sematan, bantuan, teruskan_ke, teruskan_catatan, moderasi, terjawab_id, terjawab_pada,
      upvote, balasan_n, aduan_n, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .bind(id, x.j, x.s, x.t, x.b, x.p, x.k, x.n, "0".repeat(64), x.sem || 0, x.bn || null, x.fw?.[0] || null, x.fw?.[1] || null, mod, jw?.id || null, jw ? jw.waktu + 30 * mnt : null,
        x.up, rs.filter(r => r.mod !== "tersembunyi").length, (x.ad || []).length, dibuat));
    for (const r of rs) {
      nb++;
      st.push(env.DB.prepare("INSERT INTO alun_balas (id, utas_id, teks, nama, petugas, moderasi, upvote, aduan_n, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(r.id, id, r.teks, r.petugas ? null : "Warga", r.petugas, r.mod, r.up, r.mod === "tampil" ? 0 : 1, r.waktu));
      for (let i = 0; i < r.up; i++) suara.push(`('${r.id}', 'dummy-uv-${i + 1}', 'upvote', NULL, ${kini})`);
      if (r.mod !== "tampil") suara.push(`('${r.id}', 'dummy-ad-1', 'aduan', 'kasar', ${kini})`);
    }
    for (let i = 0; i < x.up; i++) suara.push(`('${id}', 'dummy-uv-${i + 1}', 'upvote', NULL, ${kini})`);
    (x.ad || []).forEach((a, i) => suara.push(`('${id}', 'dummy-ad-${i + 1}', 'aduan', ${q(a)}, ${kini})`));
  }
  await env.DB.batch([...st, env.DB.prepare(`INSERT INTO alun_suara (pos_id, kunci, jenis, alasan, waktu) VALUES ${suara.join(", ")}`)]);
  return json({ok: true, utas: D.length, balasan: nb, suara: suara.length});
}
async function dummyHapus(env) {
  const hitung = async t => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n, n = {utas: await hitung("alun_utas"), balasan: await hitung("alun_balas")};
  await env.DB.batch([
    env.DB.prepare("DELETE FROM alun_suara WHERE pos_id IN (SELECT id FROM alun_utas WHERE dummy = 1 UNION SELECT id FROM alun_balas WHERE dummy = 1)"),
    env.DB.prepare("DELETE FROM alun_balas WHERE dummy = 1"), env.DB.prepare("DELETE FROM alun_utas WHERE dummy = 1")]);
  return json({ok: true, ...n});
}
async function dummy(env, req) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, Date.now());
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

const T = tabelBelum;
export const RUTE_ALUN = {
  "GET /alun-alun": (env, req, url) => halamanBnpbPublik(env, url, "alun-alun"),
  "GET /admin/alun": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("alun")),
  "GET /api/alun": T((env, req, url, kini, ctx) => daftar(env, req, url, kini, ctx)),
  "GET /api/alun/admin": T((env, req, url, kini) => adminDaftar(env, req, url, kini)),
  "GET /api/alun/:id": T((env, req, url, kini, ctx, id) => rincian(env, req, id, ctx)),
  "POST /api/alun": T((env, req, url, kini) => tulis(env, req, kini)),
  "POST /api/alun/balas/:id": T((env, req, url, kini, ctx, id) => balas(env, req, id, kini)),
  "POST /api/alun/upvote/:id": T((env, req, url, kini, ctx, id) => suara(env, req, id, "upvote", kini)),
  "POST /api/alun/lapor/:id": T((env, req, url, kini, ctx, id) => suara(env, req, id, "aduan", kini)),
  "POST /api/alun/terjawab/:id": T((env, req, url, kini, ctx, id) => terjawab(env, req, id, kini)),
  "POST /api/alun/admin/:id": T((env, req, url, kini, ctx, id) => adminAksi(env, req, id, kini)),
  "POST /api/alun/dummy": T((env, req) => dummy(env, req)),
};
