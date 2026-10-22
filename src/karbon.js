/* Modul Karbon (docs/karbon/RANCANGAN.md §5, migrasi 0050_karbon.sql): proyek, pemantauan, pihak, kesepakatan, buku kredit, laporan MRV.
   SEMUA rute: gerbang `masuk` PERTAMA, sebelum parse/validasi: (1) host bukan situs Centurisk/localhost = 404 seragam (sama dengan halaman /karbon),
   (2) adminOK (403), (3) env KARBON_OLEH bila diisi = hanya moderator itu (403). Tamu tidak boleh tahu apa pun, termasuk ada/tidaknya baris.
   Kueri GFW dibaca dari public/karbon/gfw_kueri.json (SATU sumber bersama scripts/karbon/gfw.py) lewat ASSETS saat jalan, bukan impor
   JSON: impor `with {type: "json"}` menjatuhkan semua uji Miniflare yang hanya memasang aturan ESModule untuk **.js. */
import {json, gagal, adminOK, bacaBody, acak, situsCenturisk} from "./worker.js";
import {KONTROL, tglSah} from "./posko.js";
import {bersihIsi} from "./laporan_bnpb.js";
import {kirim, PROV} from "./bangunan.js";
import {dalam} from "./titik.js";
import {susunStat} from "../public/karbon/susun_stat.js";

const HARI = 864e5, BBOX = [94, -11.5, 141.5, 6.5], MAKS_GEOM = 1048576, MAKS_TITIK = 50000, MAKS_GEOM_GFW = 400000;
const MAKS_SUBREQ = 25, MAKS_JUMLAH_T = 1e9, TOLAK_GFW_MS = 25000, BUFFER_M = 1000, MAKS_BARIS_CRON = 500;
export const TAHAP = ["identifikasi", "loi", "kesepakatan", "studi", "pdd", "validasi", "registrasi", "pemantauan", "verifikasi", "terbit", "hentikan"];
export const TAHAP_PANTAU = TAHAP.slice(3, 10);   // studi .. terbit
export const STATUS_PERINGATAN = ["baru", "dicek", "valid", "palsu", "selesai"];
export const JENIS_PIHAK = ["pemegang_konsesi", "pembeli", "investor", "vvb", "mitra", "pemerintah", "komunitas"];
export const ARAH = ["pasok", "jual", "modal", "jasa"];
export const TAHAP_SEPAKAT = ["prospek", "nda", "term_sheet", "loi", "kontrak", "selesai", "batal"];
export const JENIS_BUKU = ["terbit", "cadang", "lepas_cadang", "alih", "pensiun", "batal"];
export const STATUS_LAPORAN = ["draf", "tinjau", "kirim"];
/* kunci asumsi yang berupa porsi 0..1 (RANCANGAN §4.2, §4.4) */
const PORSI = ["efektivitas", "kebocoran", "ketidakpastian", "buffer", "bagian_negara", "porsi_terjual", "pnbp", "bagi_hasil_pemegang", "dana_komunitas", "pph"];
const RE_ID = /^[0-9a-f]{16}$/;
const tolak = () => gagal(403, "perlu masuk admin");
/* Gerbang semua rute karbon. KARBON_OLEH = daftar id moderator (12 hex, hash token) dipisah koma; terisi = hanya mereka, kosong/tak ada = semua yang lolos adminOK. */
async function masuk(env, req, url, kini) {
  if (!situsCenturisk(url.hostname) && url.hostname !== "localhost") return {res: new Response("Tidak ditemukan", {status: 404})};
  const mod = await adminOK(env, req, kini); if (!mod) return {res: tolak()};
  const oleh = String(env.KARBON_OLEH || "").split(",").map(x => x.trim()).filter(Boolean);
  if (oleh.length && !oleh.includes(mod)) return {res: gagal(403, "akun ini tidak diizinkan memakai modul karbon")};
  return {mod};
}
const H = {"cache-control": "no-store"};

/* ---------------- validator: kembalikan nilai bersih atau lempar Error berpesan ---------------- */
const teks = (maks, wajib = false) => v => {
  if (v == null || v === "") { if (wajib) throw new Error("wajib diisi"); return null; }
  if (typeof v !== "string") throw new Error("harus teks");
  const s = v.normalize("NFC").replace(KONTROL, "").trim();
  if (wajib && !s) throw new Error("wajib diisi");
  if (s.length > maks) throw new Error(`lebih dari ${maks} huruf`);
  return s || null;
};
const pilih = daftar => v => { if (!daftar.includes(v)) throw new Error(`harus salah satu dari ${daftar.join(", ")}`); return v; };
const angka = v => { if (v == null || v === "") return null; if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e13) throw new Error("harus angka >= 0"); return v; };
const tgl = (wajib = false) => v => { if (v == null || v === "") { if (wajib) throw new Error("wajib diisi"); return null; } if (typeof v !== "string" || !tglSah(v)) throw new Error("harus YYYY-MM-DD"); return v; };
const idRujuk = (wajib = false) => v => { if (v == null || v === "") { if (wajib) throw new Error("wajib diisi"); return null; } if (typeof v !== "string" || !RE_ID.test(v)) throw new Error("harus id 16 hex"); return v; };
const prov = v => { if (v == null || v === "") return null; if (!PROV.has(v)) throw new Error("harus kode provinsi BPS 2 digit"); return v; };
const objekJSON = (maks, porsi = []) => v => {
  if (v == null) return null;
  if (typeof v !== "object" || Array.isArray(v)) throw new Error("harus objek");
  const o = bersihIsi(v);
  for (const k of porsi) if (k in o && o[k] != null && !(typeof o[k] === "number" && o[k] >= 0 && o[k] <= 1)) throw new Error(`${k} harus porsi 0..1`);
  const s = JSON.stringify(o); if (s.length > maks) throw new Error(`lebih dari ${maks / 1024} KB`);
  return s;
};

/* stat dari layar penyaringan (bentuk §3.2, public/karbon/susun_stat.js). Dibangun ULANG dari daftar putih: kunci/angka/teks tak terduga ditolak, hasilnya bersih dengan konstruksi. */
const TOP_STAT = new Set(["id", "versi", "diambil", "tahun_data_akhir", "luas_ha", "hutan2000_ha", "primer_ha", "gambut_ha", "gambut_hutan_ha", "stok_tC", "hilang", "hilang_api", "tutupan2017", "kawasan", "pendorong", "serapan_co2_t"]);
const objek = (v, nama) => { if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error(`${nama} harus objek`); return v; };
const num0 = (v, nama) => { if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e13) throw new Error(`${nama} harus angka >= 0`); return v; };
const tahunSah = t => /^\d{4}$/.test(t) && t >= 2001 && t <= 2100;
const KUNCI_KELAS = /^[\p{L}\p{N} _.,()\/-]{1,60}$/u;
const petaAngka = (v, nama, kunci) => Object.fromEntries(Object.entries(objek(v, nama)).map(([k, x]) => {
  if (Object.keys(v).length > 200 || k === "__proto__" || !kunci(k)) throw new Error(`${nama}: kunci tidak sah`);
  return [k, num0(x, `${nama}.${k}`)]; }));
const teksStat = (v, nama) => { if (typeof v !== "string") throw new Error(`${nama} harus teks`); const s = bersihIsi(v); if (s.length > 40) throw new Error(`${nama} terlalu panjang`); return s; };
export function sahStat(v) {
  if (v == null) return null;
  const o = objek(v, "stat");
  if (JSON.stringify(o).length > 262144) throw new Error("stat lebih dari 256 KB");
  for (const k of Object.keys(o)) if (!TOP_STAT.has(k)) throw new Error(`stat: kunci tidak dikenal ${k.slice(0, 40)}`);
  if (!Number.isInteger(o.tahun_data_akhir) || o.tahun_data_akhir < 2001 || o.tahun_data_akhir > 2100) throw new Error("stat.tahun_data_akhir harus bilangan bulat 2001..2100");
  const h = {tahun_data_akhir: o.tahun_data_akhir, luas_ha: num0(o.luas_ha, "stat.luas_ha"), hutan2000_ha: num0(o.hutan2000_ha, "stat.hutan2000_ha")};
  for (const k of ["primer_ha", "gambut_ha", "gambut_hutan_ha", "serapan_co2_t"]) if (o[k] != null) h[k] = num0(o[k], "stat." + k);
  if (o.diambil != null) h.diambil = teksStat(o.diambil, "stat.diambil");
  if (o.id != null) h.id = teksStat(o.id, "stat.id");
  if (o.versi != null) h.versi = Object.fromEntries(Object.entries(objek(o.versi, "stat.versi")).map(([k, x]) => { if (!["tcl", "tcd"].includes(k)) throw new Error("stat.versi: kunci tidak dikenal"); return [k, teksStat(x, "stat.versi." + k)]; }));
  if (o.stok_tC != null) h.stok_tC = Object.fromEntries(Object.entries(objek(o.stok_tC, "stat.stok_tC")).map(([k, x]) => { if (!["atas", "bawah", "tanah"].includes(k)) throw new Error("stat.stok_tC: kunci tidak dikenal"); return [k, num0(x, "stat.stok_tC." + k)]; }));
  const hl = objek(o.hilang, "stat.hilang"); if (!Object.keys(hl).length) throw new Error("stat.hilang kosong");
  h.hilang = Object.fromEntries(Object.entries(hl).map(([t, e]) => {
    if (!tahunSah(t)) throw new Error(`stat.hilang: kunci harus tahun 2001..2100, bukan ${t.slice(0, 20)}`);
    const r = {}; for (const [k, x] of Object.entries(objek(e, "stat.hilang." + t))) {
      if (k === "pendorong") r.pendorong = Object.fromEntries(Object.entries(objek(x, "pendorong")).map(([d, y]) => {
        if (d === "__proto__" || !KUNCI_KELAS.test(d)) throw new Error("stat.hilang.pendorong: kunci tidak sah");
        const q = {}; for (const [f, z] of Object.entries(objek(y, "pendorong." + d))) { if (!["ha", "co2_t"].includes(f)) throw new Error("stat.hilang.pendorong: kunci tidak dikenal"); q[f] = num0(z, `stat.hilang.${t}.pendorong.${d}.${f}`); }
        return [d, q]; }));
      else if (["ha", "co2_t", "ha_gambut", "ha_primer"].includes(k)) r[k] = num0(x, `stat.hilang.${t}.${k}`);
      else throw new Error(`stat.hilang.${t}: kunci tidak dikenal ${k.slice(0, 40)}`);
    }
    return [t, r]; }));
  if (o.hilang_api != null) h.hilang_api = petaAngka(o.hilang_api, "stat.hilang_api", tahunSah);
  for (const k of ["tutupan2017", "kawasan", "pendorong"]) if (o[k] != null) h[k] = petaAngka(o[k], "stat." + k, k2 => KUNCI_KELAS.test(k2));
  return JSON.stringify(h);
}

/* GeoJSON Polygon/MultiPolygon di kotak Indonesia, cincin tertutup >= 4 titik, <= 50 rb titik. Kembalikan {type, coordinates} tanpa kunci lain. */
export function sahGeom(g) {
  if (g == null) return null;
  if (!g || typeof g !== "object" || !["Polygon", "MultiPolygon"].includes(g.type) || !Array.isArray(g.coordinates)) throw new Error("harus GeoJSON Polygon atau MultiPolygon");
  const polis = g.type === "Polygon" ? [g.coordinates] : g.coordinates; let n = 0;
  if (!polis.length) throw new Error("tanpa poligon");
  for (const p of polis) {
    if (!Array.isArray(p) || !p.length) throw new Error("poligon tanpa cincin");
    for (const r of p) {
      if (!Array.isArray(r) || r.length < 4) throw new Error("cincin kurang dari 4 titik");
      for (const t of r) {
        if (!Array.isArray(t) || t.length < 2 || !t.slice(0, 2).every(Number.isFinite)) throw new Error("koordinat bukan angka");
        if (t[0] < BBOX[0] || t[0] > BBOX[2] || t[1] < BBOX[1] || t[1] > BBOX[3]) throw new Error("koordinat di luar Indonesia (urutan [lon, lat])");
      }
      if (r[0][0] !== r.at(-1)[0] || r[0][1] !== r.at(-1)[1]) throw new Error("cincin tidak tertutup");
      if ((n += r.length) > MAKS_TITIK) throw new Error(`lebih dari ${MAKS_TITIK} titik`);
    }
  }
  for (const p of polis) for (const lubang of p.slice(1)) if (!lubang.every(([x, y]) => dalam(x, y, [p[0]]))) throw new Error("lubang harus di dalam cincin luar");
  const o = {type: g.type, coordinates: polis.map(p => p.map(r => r.map(t => [t[0], t[1]])))};
  if (g.type === "Polygon") o.coordinates = o.coordinates[0];
  if (JSON.stringify(o).length > MAKS_GEOM) throw new Error("geometri lebih dari 1 MB");
  return o;
}
/* luas permukaan bola (rumus cincin geojson-area / Chamberlain-Duquette, R WGS84 khatulistiwa), ha; lubang dikurangkan */
const R = 6378137, rad = x => x * Math.PI / 180;
function luasCincin(r) {
  let a = 0; const n = r.length - 1;   // cincin tertutup: titik terakhir = titik pertama
  for (let i = 0; i < n; i++) a += (rad(r[(i + 2) % n][0]) - rad(r[i][0])) * Math.sin(rad(r[(i + 1) % n][1]));
  return Math.abs(a * R * R / 2);
}
export const luasHa = g => (g.type === "Polygon" ? [g.coordinates] : g.coordinates)
  .reduce((s, p) => s + p.reduce((t, r, i) => t + (i ? -1 : 1) * luasCincin(r), 0), 0) / 1e4;

/* ---------------- spesifikasi tabel yang ditulis lewat formulir ---------------- */
const SPEK = {
  proyek: {tabel: "karbon_proyek", maks: MAKS_GEOM + 65536, wajib: ["nama"], kolom: {
    nama: teks(200, true), konsesi_id: teks(80), pemegang: teks(200), prov, kab: teks(100), jenis_kegiatan: teks(80), metodologi: teks(120),
    tahap: pilih(TAHAP), geom: sahGeom, asumsi: objekJSON(32768, PORSI), catatan: teks(2000), stat: sahStat},
    olah: n => { if ("geom" in n) { n.luas_ha = n.geom ? Math.round(luasHa(n.geom) * 100) / 100 : null; if (n.geom && !(n.luas_ha > 0)) throw new Error("geom: luas poligon harus > 0 ha"); n.geom = n.geom ? JSON.stringify(n.geom) : null; } }},
  pihak: {tabel: "karbon_pihak", maks: 8192, wajib: ["nama", "jenis"], kolom: {
    nama: teks(200, true), jenis: pilih(JENIS_PIHAK), negara: teks(80), kontak: teks(300), catatan: teks(2000)}},
  kesepakatan: {tabel: "karbon_kesepakatan", maks: 8192, wajib: ["pihak_id", "arah"], kolom: {
    pihak_id: idRujuk(true), proyek_id: idRujuk(), arah: pilih(ARAH), tahap: pilih(TAHAP_SEPAKAT), volume_t_th: angka, tenor_th: angka,
    harga_usd: angka, nilai_usd: angka, langkah_berikut: teks(500), tenggat: tgl(), catatan: teks(2000)}},
  laporan: {tabel: "karbon_laporan", maks: 131072 + 4096, wajib: ["proyek_id", "periode_awal", "periode_akhir", "isi"], kolom: {
    proyek_id: idRujuk(true), periode_awal: tgl(true), periode_akhir: tgl(true), isi: objekJSON(131072), status: pilih(STATUS_LAPORAN)}},
};
const galatDB = e => { const m = String(e?.message || e);
  return /FOREIGN KEY/i.test(m) ? gagal(400, "rujukan (proyek/pihak/kesepakatan) tidak ada") : /CHECK constraint/i.test(m) ? (console.error("karbon CHECK", m), gagal(400, "isian ditolak aturan data")) : null; };

/* POST tanpa id = baris baru; dengan id wajib `diubah` terakhir yang dimuat (penguncian optimistis, pola src/laporan_bnpb.js), hanya kolom yang dikirim yang diubah */
async function simpan(env, req, kini, mod, spek) {
  const b = await bacaBody(req, spek.maks); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, n = {};
  for (const [k, f] of Object.entries(spek.kolom)) if (Object.hasOwn(o, k)) { try { n[k] = f(o[k]); } catch (e) { return gagal(400, `${k}: ${e.message}`); } }
  try { spek.olah?.(n); } catch (e) { return gagal(400, e.message); }
  if ("stat" in n) {   // stat hanya lewat INSERT ini atau /stat/:id; ubah (id ada) tidak boleh menyentuhnya
    if (o.id != null) return gagal(400, "stat tidak bisa diubah lewat pembaruan; pakai POST /api/karbon/stat/:id");
    n.stat_diambil = n.stat == null ? null : kini;
  }
  const kosong = Object.entries(n).filter(([k, v]) => v == null && spek.wajib.includes(k)).map(([k]) => k);   // NOT NULL tidak boleh dikosongkan lewat ubah
  if (kosong.length) return gagal(400, `tidak boleh dikosongkan: ${kosong.join(", ")}`);
  try {
    if (o.id == null) {
      const kurang = spek.wajib.filter(k => n[k] == null); if (kurang.length) return gagal(400, `wajib diisi: ${kurang.join(", ")}`);
      const id = acak(8), k = Object.keys(n);
      await env.DB.prepare(`INSERT INTO ${spek.tabel} (id, ${k.join(", ")}, dibuat, diubah, oleh) VALUES (?, ${k.map(() => "?").join(", ")}, ?, ?, ?)`).bind(id, ...k.map(x => n[x]), kini, kini, mod).run();
      return json({ok: true, id, diubah: kini}, 201);
    }
    if (typeof o.id !== "string" || !RE_ID.test(o.id)) return gagal(400, "id harus 16 hex");
    return ubahBaris(env, spek.tabel, o.id, o.diubah, n, kini, mod);
  } catch (e) { const g = galatDB(e); if (g) return g; throw e; }
}
async function ubahBaris(env, tabel, id, dasar, n, kini, mod) {
  if (!Number.isSafeInteger(dasar)) return gagal(400, "diubah harus angka waktu dari muatan terakhir");
  const k = Object.keys(n); if (!k.length) return gagal(400, "tidak ada kolom yang diubah");
  const u = await env.DB.prepare(`UPDATE ${tabel} SET ${k.map(x => x + " = ?").join(", ")}, diubah = ?, oleh = ? WHERE id = ? AND diubah = ?`).bind(...k.map(x => n[x]), kini, mod, id, dasar).run();
  return u.meta.changes ? json({ok: true, id, diubah: kini}, 201) : gagal(409, "Baris ini baru diubah orang lain atau tidak ada. Muat ulang dulu.");
}

const urai = (r, ...k) => { for (const x of k) if (r[x] != null) r[x] = JSON.parse(r[x]); return r; };
const paramId = (url, k) => { const v = url.searchParams.get(k); return v == null ? {} : RE_ID.test(v) ? {v} : {galat: gagal(400, `${k} harus id 16 hex`)}; };
/* gerbang `masuk` di depan SEMUA rute; f(env, url, id, req, kini, mod). `pos` = pembungkus untuk penulis (env, req, kini, mod, ...tambahan) */
const jaga = f => async (env, req, url, kini, ctx, id) => { const m = await masuk(env, req, url, kini); return m.res || f(env, url, id, req, kini, m.mod); };
const pos = (f, ...a) => jaga((env, url, id, req, kini, mod) => f(env, req, kini, mod, ...a));

const KOLOM_PROYEK = "id, nama, konsesi_id, pemegang, prov, kab, jenis_kegiatan, metodologi, tahap, luas_ha, asumsi, stat, stat_diambil, pantau_terakhir, pantau_galat, catatan, dibuat, diubah, oleh";
async function daftarProyek(env, url) {
  const g = url.searchParams.get("geom") === "1";
  const r = await env.DB.prepare(`SELECT ${KOLOM_PROYEK}${g ? ", geom" : ""} FROM karbon_proyek ORDER BY diubah DESC LIMIT 500`).all();
  return json({proyek: r.results.map(x => urai(x, "asumsi", "stat", "geom"))}, 200, H);
}
async function satuProyek(env, url, id) {
  const r = await env.DB.prepare(`SELECT ${KOLOM_PROYEK}, geom FROM karbon_proyek WHERE id = ?`).bind(id).first();
  return r ? json({proyek: urai(r, "asumsi", "stat", "geom")}, 200, H) : gagal(404, "proyek tidak ada");
}

/* daftar sederhana dengan saringan id opsional */
async function daftar(env, url, sql, saring, kunci) {
  const w = [], v = [];
  for (const [p, kol] of saring) { const x = paramId(url, p); if (x.galat) return x.galat; if (x.v) { w.push(kol + " = ?"); v.push(x.v); } }
  const r = await env.DB.prepare(sql.replace("{W}", w.length ? "WHERE " + w.join(" AND ") : "")).bind(...v).all();
  return json({[kunci]: r.results}, 200, H);
}

/* ---------------- peringatan: baris dibuat cron, formulir hanya mengubah status/catatan ---------------- */
async function daftarPeringatan(env, url) {
  const s = url.searchParams.get("status");
  if (s != null && !STATUS_PERINGATAN.includes(s)) return gagal(400, "status tidak dikenal");
  const x = paramId(url, "proyek"); if (x.galat) return x.galat;
  const w = [], v = []; if (x.v) { w.push("proyek_id = ?"); v.push(x.v); } if (s) { w.push("status = ?"); v.push(s); }
  const r = await env.DB.prepare(`SELECT * FROM karbon_peringatan ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY tanggal DESC, id DESC LIMIT 1000`).bind(...v).all();
  return json({peringatan: r.results}, 200, H);
}
async function ubahPeringatan(env, req, kini, mod) {
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, n = {};
  if (!Number.isSafeInteger(o.id) || o.id < 1) return gagal(400, "id harus bilangan bulat");
  try { if (Object.hasOwn(o, "status")) n.status = pilih(STATUS_PERINGATAN)(o.status); if (Object.hasOwn(o, "catatan")) n.catatan = teks(2000)(o.catatan); }
  catch (e) { return gagal(400, e.message); }
  return ubahBaris(env, "karbon_peringatan", o.id, o.diubah, n, kini, mod);
}

/* ---------------- buku kredit ---------------- */
/* satu rumus saldo untuk GET dan pemeriksaan POST: saldo = terbit - alih - pensiun - batal; cadang bersih = cadang - lepas_cadang; tersedia = saldo - cadang bersih */
const S_SALDO = "coalesce(sum(CASE jenis WHEN 'terbit' THEN jumlah_t WHEN 'cadang' THEN 0 WHEN 'lepas_cadang' THEN 0 ELSE -jumlah_t END), 0)";
const S_CADANG = "coalesce(sum(CASE jenis WHEN 'cadang' THEN jumlah_t WHEN 'lepas_cadang' THEN -jumlah_t ELSE 0 END), 0)";
async function bacaBuku(env, url) {
  const x = paramId(url, "proyek"); if (x.galat) return x.galat;
  const w = x.v ? "WHERE proyek_id = ?" : "", v = x.v ? [x.v] : [];
  const [e, s, t] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM karbon_buku ${w} ORDER BY id DESC LIMIT 2000`).bind(...v),
    env.DB.prepare(`SELECT proyek_id, vintage, ${S_SALDO} saldo, ${S_CADANG} cadang FROM karbon_buku ${w} GROUP BY proyek_id, vintage ORDER BY proyek_id, vintage`).bind(...v),
    env.DB.prepare(`SELECT proyek_id, vintage, ${JENIS_BUKU.map(j => `coalesce(sum(CASE jenis WHEN '${j}' THEN jumlah_t END), 0) ${j}`).join(", ")} FROM karbon_buku ${w} GROUP BY proyek_id, vintage ORDER BY proyek_id, vintage`).bind(...v)]);
  return json({entri: e.results, saldo: s.results.map(r => ({...r, tersedia: r.saldo - r.cadang})), total: t.results}, 200, H);
}
/* Pemeriksaan dan penyisipan dalam SATU pernyataan INSERT..SELECT..WHERE: D1 menjalankan satu pernyataan secara atomik di SQLite tunggal,
   jadi dua entri serentak tidak bisa sama-sama lolos dari saldo/serial yang sama (tidak ada celah baca-lalu-tulis). Aturan serial (satu serial = 1 tCO2e):
   terbit = rentang baru tidak boleh tumpang tindih dengan terbitan lain proyek+vintage, hanya di tahap verifikasi/terbit;
   alih/pensiun/batal = rentang harus di dalam SATU rentang terbit dan tidak tumpang tindih dengan alih/pensiun/batal sebelumnya. Parameter: ?5 awal, ?6 akhir. */
const SYARAT_TERBIT = ` AND EXISTS (SELECT 1 FROM karbon_proyek WHERE id = ?1 AND tahap IN ('verifikasi', 'terbit'))
  AND NOT EXISTS (SELECT 1 FROM karbon_buku WHERE proyek_id = ?1 AND vintage = ?2 AND jenis = 'terbit' AND serial_awal <= ?6 AND serial_akhir >= ?5)`;
const SYARAT_KELUAR = ` AND EXISTS (SELECT 1 FROM karbon_buku WHERE proyek_id = ?1 AND vintage = ?2 AND jenis = 'terbit' AND serial_awal <= ?5 AND serial_akhir >= ?6)
  AND NOT EXISTS (SELECT 1 FROM karbon_buku WHERE proyek_id = ?1 AND vintage = ?2 AND jenis IN ('alih', 'pensiun', 'batal') AND serial_awal <= ?6 AND serial_akhir >= ?5)`;
const BERSERIAL = ["terbit", "alih", "pensiun", "batal"];
async function alasanBuku(env, n, vintage, j) {   // hanya untuk pesan 409 (sesudah penolakan atomik); urutan = kemungkinan sebab
  const a = n.serial_awal, z = n.serial_akhir, p = n.proyek_id;
  const q = jenis => env.DB.prepare(`SELECT count(*) n FROM karbon_buku WHERE proyek_id = ? AND vintage = ? AND jenis IN (${jenis}) AND serial_awal <= ? AND serial_akhir >= ?`);
  if (j === "terbit") {
    const t = await env.DB.prepare("SELECT tahap FROM karbon_proyek WHERE id = ?").bind(p).first();
    if (!t) return null;
    if (!["verifikasi", "terbit"].includes(t.tahap)) return `Penerbitan hanya boleh saat proyek di tahap verifikasi atau terbit (sekarang: ${t.tahap}).`;
    if ((await q("'terbit'").bind(p, vintage, z, a).first()).n) return `Serial ${a}-${z} tumpang tindih dengan terbitan vintage ${vintage} yang sudah ada (terbit ganda).`;
  } else if (BERSERIAL.includes(j)) {
    if (!(await q("'terbit'").bind(p, vintage, a, z).first()).n) return `Serial ${a}-${z} tidak berada di dalam satu rentang terbitan vintage ${vintage} proyek ini.`;
    if ((await q("'alih', 'pensiun', 'batal'").bind(p, vintage, z, a).first()).n) return `Serial ${a}-${z} tumpang tindih dengan serial yang sudah dialihkan/dipensiunkan/dibatalkan (pakai ganda).`;
  }
  return "Entri ditolak: saldo atau kredit tersedia vintage ini akan negatif (atau melepas cadangan melebihi yang dicadangkan).";
}
async function tulisBuku(env, req, kini, mod) {
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o; let n;
  try {
    n = {proyek_id: idRujuk(true)(o.proyek_id), jenis: pilih(JENIS_BUKU)(o.jenis), kesepakatan_id: idRujuk()(o.kesepakatan_id),
      pembeli: teks(200)(o.pembeli), catatan: teks(2000)(o.catatan), serial_awal: o.serial_awal ?? null, serial_akhir: o.serial_akhir ?? null};
    if (!Number.isInteger(o.vintage) || o.vintage < 2000 || o.vintage > 2100) throw new Error("vintage harus tahun 2000..2100");
    if (!Number.isSafeInteger(o.jumlah_t) || o.jumlah_t <= 0 || o.jumlah_t > MAKS_JUMLAH_T) throw new Error(`jumlah_t harus bilangan bulat 1..${MAKS_JUMLAH_T}`);
    const {serial_awal: a, serial_akhir: z} = n, perlu = BERSERIAL.includes(n.jenis);
    if (perlu || a != null || z != null) {
      if (!perlu) throw new Error("serial hanya untuk terbit, alih, pensiun, batal");
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(z) || a < 1 || z > 1e12) throw new Error(`serial_awal dan serial_akhir wajib bilangan bulat 1..1e12 untuk ${n.jenis}`);
      if (z - a + 1 !== o.jumlah_t) throw new Error("serial_akhir - serial_awal + 1 harus sama dengan jumlah_t");
    }
    if (n.jenis === "alih" && !n.kesepakatan_id && !n.pembeli) throw new Error("alih wajib menyebut kesepakatan_id atau pembeli");
  } catch (e) { return gagal(400, e.message); }
  const x = o.jumlah_t, j = n.jenis;
  const dSaldo = j === "terbit" ? x : ["alih", "pensiun", "batal"].includes(j) ? -x : 0, dCadang = j === "cadang" ? x : j === "lepas_cadang" ? -x : 0;
  try {
    const r = await env.DB.prepare(`INSERT INTO karbon_buku (proyek_id, vintage, jenis, jumlah_t, serial_awal, serial_akhir, kesepakatan_id, pembeli, catatan, waktu, oleh)
      SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11 FROM (SELECT ${S_SALDO} + ?12 s, ${S_CADANG} + ?13 c FROM karbon_buku WHERE proyek_id = ?1 AND vintage = ?2)
      WHERE s >= 0 AND c >= 0 AND s - c >= 0${j === "terbit" ? SYARAT_TERBIT : BERSERIAL.includes(j) ? SYARAT_KELUAR : ""}`)
      .bind(n.proyek_id, o.vintage, j, x, n.serial_awal, n.serial_akhir, n.kesepakatan_id, n.pembeli, n.catatan, kini, mod, dSaldo, dCadang).run();
    if (!r.meta.changes) { const m = await alasanBuku(env, n, o.vintage, j); return m ? gagal(409, m) : gagal(400, "proyek tidak ada"); }
    return json({ok: true, id: r.meta.last_row_id, waktu: kini}, 201);
  } catch (e) { const g = galatDB(e); if (g) return g; throw e; }
}

/* ---------------- laporan ---------------- */
async function bacaLaporan(env, url) {
  const i = paramId(url, "id"); if (i.galat) return i.galat;
  if (i.v) { const r = await env.DB.prepare("SELECT * FROM karbon_laporan WHERE id = ?").bind(i.v).first(); return r ? json({laporan: urai(r, "isi")}, 200, H) : gagal(404, "laporan tidak ada"); }
  return daftar(env, url, "SELECT id, proyek_id, periode_awal, periode_akhir, status, dibuat, diubah, oleh FROM karbon_laporan {W} ORDER BY periode_akhir DESC LIMIT 1000", [["proyek", "proyek_id"]], "laporan");
}

/* ---------------- GFW ---------------- */
let KUERI = null;   // per isolat (berkas berubah hanya saat terbit)
async function muatKueri(env) {
  if (KUERI) return KUERI;
  const r = await env.ASSETS.fetch(new Request("https://aset.lokal/karbon/gfw_kueri.json"));
  if (!r.ok) throw new Error(`gfw_kueri.json: HTTP ${r.status}`);
  return KUERI = await r.json();
}
/* koordinat dibulatkan 5 desimal (~1 m) supaya muatan kecil; GFW lambat/menolak geometri besar (scripts/karbon/gfw.py MAKS_GEOM) */
function geomGFW(g) {
  const b = x => Math.round(x * 1e5) / 1e5, polis = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  const s = JSON.stringify({type: "MultiPolygon", coordinates: polis.map(p => p.map(r => r.map(([x, y]) => [b(x), b(y)])))});
  if (s.length > MAKS_GEOM_GFW) throw Object.assign(new Error(`geometri ${Math.round(s.length / 1024)} KB, GFW hanya menerima <= ${MAKS_GEOM_GFW / 1000} KB: sederhanakan poligon`), {status: 413});
  return s;
}
/* satu kueri; versi "harian" = vYYYYMMDD hari ini UTC, mundur sampai 3 hari bila 404. hitung.n = subrequest terpakai */
async function gfw(env, K, nama, geomTeks, kini, hitung, sejak = "") {
  const q = K.kueri[nama], harian = q.versi === "harian";
  const body = `{"sql":${JSON.stringify(q.sql.replace("{sejak}", sejak))},"geometry":${geomTeks}}`;
  const versi = harian ? [0, 1, 2, 3].map(d => "v" + new Date(kini - d * HARI).toISOString().slice(0, 10).replaceAll("-", "")) : [q.versi];
  for (const v of versi) {
    hitung.n++;
    let r;
    try {
      r = await fetch(`https://${K.host}/dataset/${q.dataset}/${v}/query/json`, {method: "POST", body, signal: AbortSignal.timeout(TOLAK_GFW_MS),
        headers: {"content-type": "application/json", "x-api-key": env.GFW_API_KEY || K.kunci_publik}});   // huruf kecil persis (RANCANGAN §2 ranjau 1)
    } catch (e) { console.error("GFW", nama, e?.message); throw new Error(`GFW ${nama}: tidak terjangkau atau melewati batas waktu`); }
    if (r.status === 404 && harian) { await r.body?.cancel(); continue; }
    if (!r.ok) { console.error("GFW", nama, r.status, (await r.text()).slice(0, 300)); throw new Error(`GFW ${nama} HTTP ${r.status}`); }
    const j = await r.json(); if (!Array.isArray(j?.data)) throw new Error(`GFW ${nama}: respons tanpa data`);
    return j.data;
  }
  throw new Error(`GFW ${nama}: versi harian 4 hari terakhir belum ada`);
}

/* statistik §3.2: perakitan murni di public/karbon/susun_stat.js (dibagi dengan padanan Python); di sini hanya id */
async function tarikStat(env, url, id, req, kini) {
  const p = await env.DB.prepare("SELECT geom FROM karbon_proyek WHERE id = ?").bind(id).first();
  if (!p) return gagal(404, "proyek tidak ada");
  if (!p.geom) return gagal(400, "proyek belum punya geometri");
  let stat;
  try {
    const K = await muatKueri(env), g = geomGFW(JSON.parse(p.geom)), hitung = {n: 0}, nama = Object.keys(K.kueri).filter(x => x !== "peringatan");
    const hasil = await Promise.all(nama.map(x => gfw(env, K, x, g, kini, hitung)));
    stat = {id, ...susunStat(Object.fromEntries(nama.map((x, i) => [x, hasil[i]])), K, kini)};
  } catch (e) { return gagal(e.status || 502, e.message); }
  await env.DB.prepare("UPDATE karbon_proyek SET stat = ?, stat_diambil = ? WHERE id = ?").bind(JSON.stringify(stat), kini, id).run();
  return json({ok: true, stat, stat_diambil: kini}, 200, H);
}

/* ---------------- geometri untuk pemantauan ---------------- */
function siapkan(g) {
  const cincin = (g.type === "Polygon" ? [g.coordinates] : g.coordinates).flat();   // genap-ganjil lintas poligon: poligon MultiPolygon saling lepas
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of cincin) for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return {cincin, kotak: [x0, y0, x1, y1]};
}
/* jarak titik ke ruas (meter), proyeksi ekuirektangular lokal di sekitar titik: galat << 1% pada skala 1 km */
export function jarakRuasM(lat, lon, a, b) {
  const ky = 111320, kx = ky * Math.cos(rad(lat));
  const ax = (a[0] - lon) * kx, ay = (a[1] - lat) * ky, dx = (b[0] - a[0]) * kx, dy = (b[1] - a[1]) * ky, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / L)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
/* di dalam poligon, atau <= m meter dari tepinya (ruas mana pun) */
export function dekat(lat, lon, P, m = BUFFER_M) {
  const dLat = m / 111320, dLon = dLat / Math.max(0.1, Math.cos(rad(lat))), [x0, y0, x1, y1] = P.kotak;
  if (lon < x0 - dLon || lon > x1 + dLon || lat < y0 - dLat || lat > y1 + dLat) return false;
  if (dalam(lon, lat, P.cincin)) return true;
  for (const r of P.cincin) for (let i = 1; i < r.length; i++) if (jarakRuasM(lat, lon, r[i - 1], r[i]) <= m) return true;
  return false;
}
const PERINGKAT = {nominal: 1, high: 2, highest: 3};
/* piksel peringatan -> kejadian per (tanggal, sel 0,005 derajat); luas = n x luas piksel (gfw_kueri.json _peringatan) */
export function kelompokkan(baris, K) {
  const px = Number(K.peringatan_piksel_derajat) || 1e-4, g = new Map();
  for (const b of baris.slice(0, 50000)) {
    const lat = Number(b.lat), lon = Number(b.lon), t = String(b.tanggal ?? "").slice(0, 10);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lon < BBOX[0] || lon > BBOX[2] || lat < BBOX[1] || lat > BBOX[3] || !tglSah(t)) continue;
    const k = `${t}|${Math.floor(lat / 0.005)}|${Math.floor(lon / 0.005)}`, o = g.get(k) || g.set(k, {t, la: 0, lo: 0, n: 0, y: 0}).get(k);
    o.la += lat; o.lo += lon; o.n++; o.y = Math.max(o.y, PERINGKAT[b.keyakinan] || 0);
  }
  const b5 = x => Math.round(x * 1e5) / 1e5, sisi = px * 111320;
  return [...g.values()].map(o => { const lat = b5(o.la / o.n);
    return {tanggal: o.t, lat, lon: b5(o.lo / o.n), luas_ha: Math.round(o.n * sisi * sisi * Math.cos(rad(lat)) / 1e4 * 1e4) / 1e4, keyakinan: Object.keys(PERINGKAT)[o.y - 1] ?? null}; });
}
/* putaran FIRMS terakhir dari D1 (src/titik.js: kolom lat, lon, jam relatif acuan, ..., keyakinan 0/1/2) */
async function titikFirms(env) {
  const r = await env.DB.prepare("SELECT isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first();
  if (!r) return [];
  const d = JSON.parse(r.isi), i = k => d.kolom.indexOf(k), acuan = Date.parse(d.acuan);
  return d.baris.map(b => ({lat: b[i("lat")], lon: b[i("lon")], tanggal: new Date(acuan + b[i("jam")] * 3600e3).toISOString().slice(0, 10),
    keyakinan: ["rendah", "sedang", "tinggi"][b[i("keyakinan")]] ?? null}));
}

/* Cron harian (23.48 UTC, invokasi sendiri): proyek tahap studi..terbit bergeometri, yang paling lama belum diperiksa dulu (NULL dulu, lalu id).
   Anggaran subrequest MAKS_SUBREQ (Workers Free 50, sisakan untuk cron lain): ASSETS, tiap fetch GFW, tiap pernyataan/batch D1 dihitung di `hitung`.
   Satu proyek gagal tidak menghentikan yang lain: galatnya dicatat di pantau_galat dan pantau_terakhir TIDAK maju (dicoba lagi besok).
   ponytail: proyek yang selalu gagal tetap di depan antrean dan memakan jatah tiap malam; beri jeda coba-ulang bila jumlahnya bertambah.
   ponytail: kejadian GFW yang pikselnya bertambah belakangan (rerata lat/lon bergeser) tercatat sebagai baris baru; dedup per sel bila jadi masalah. */
export async function pantauKarbon(env, kini = Date.now()) {
  const hitung = {n: 1}, K = await muatKueri(env), sejak = new Date(kini - 30 * HARI).toISOString().slice(0, 10);
  hitung.n++;
  const proyek = (await env.DB.prepare(`SELECT id, geom FROM karbon_proyek WHERE geom IS NOT NULL AND tahap IN (${TAHAP_PANTAU.map(() => "?").join(", ")})
    ORDER BY pantau_terakhir, id LIMIT 100`).bind(...TAHAP_PANTAU).all()).results;   // NULL lebih dulu di SQLite; indeks karbon_proyek_pantau
  let firms = []; const out = {proyek: 0, baru: 0, lewat: 0, galat: []};
  if (proyek.length) { hitung.n++; firms = await titikFirms(env); }
  for (const [i, p] of proyek.entries()) {
    if (MAKS_SUBREQ - hitung.n < 5) { out.lewat = proyek.length - i; break; }   // satu proyek paling banyak 4 fetch (mundur versi harian) + 1 batch
    let galat = null;
    try {
      const g = JSON.parse(p.geom), P = siapkan(g), baris = [];
      try { for (const e of kelompokkan(await gfw(env, K, "peringatan", geomGFW(g), kini, hitung, sejak), K)) baris.push({...e, sumber: "gfw_terpadu"}); }
      catch (e) { galat = String(e.message).slice(0, 300); out.galat.push(`${p.id}: ${galat}`); }
      for (const t of firms) if (dekat(t.lat, t.lon, P)) baris.push({...t, sumber: "firms", luas_ha: null});
      const st = baris.slice(0, MAKS_BARIS_CRON).map(b => env.DB.prepare(`INSERT OR IGNORE INTO karbon_peringatan (proyek_id, sumber, tanggal, lat, lon, luas_ha, keyakinan, status, dibuat, diubah)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'baru', ?, ?)`).bind(p.id, b.sumber, b.tanggal, b.lat, b.lon, b.luas_ha, b.keyakinan, kini, kini));
      /* pantau_terakhir maju hanya bila GFW sukses; tanpa menyentuh `diubah` (bukan suntingan orang) */
      st.push(galat ? env.DB.prepare("UPDATE karbon_proyek SET pantau_galat = ? WHERE id = ?").bind(galat, p.id)
        : env.DB.prepare("UPDATE karbon_proyek SET pantau_terakhir = ?, pantau_galat = NULL WHERE id = ?").bind(kini, p.id));
      hitung.n++;
      const r = await env.DB.batch(st);
      out.proyek++; out.baru += r.slice(0, -1).reduce((s, x) => s + (x.meta.changes || 0), 0);
    } catch (e) { console.error("karbon proyek", p.id, e?.message); if (!galat) out.galat.push(`${p.id}: ${String(e?.message).slice(0, 200)}`); }
  }
  return {...out, subrequest: hitung.n};
}

const BELUM_SARING = "hasil penyaringan belum tersedia (scripts/karbon belum diunggah ke R2 karbon/)";
export const RUTE_KARBON = {
  "GET /api/karbon/proyek": jaga(daftarProyek),
  "POST /api/karbon/proyek": pos(simpan, SPEK.proyek),
  "GET /api/karbon/proyek/:id": jaga(satuProyek),
  /* router hanya mengenali id 16 hex di AKHIR jalur, jadi /proyek/:id/stat ditulis /stat/:id */
  "POST /api/karbon/stat/:id": jaga(tarikStat),
  "GET /api/karbon/peringatan": jaga(daftarPeringatan),
  "POST /api/karbon/peringatan": pos(ubahPeringatan),
  "GET /api/karbon/pihak": jaga((env, url) => daftar(env, url, "SELECT * FROM karbon_pihak {W} ORDER BY nama LIMIT 1000", [], "pihak")),
  "POST /api/karbon/pihak": pos(simpan, SPEK.pihak),
  "GET /api/karbon/kesepakatan": jaga((env, url) => daftar(env, url, "SELECT * FROM karbon_kesepakatan {W} ORDER BY diubah DESC LIMIT 1000", [["proyek", "proyek_id"], ["pihak", "pihak_id"]], "kesepakatan")),
  "POST /api/karbon/kesepakatan": pos(simpan, SPEK.kesepakatan),
  "GET /api/karbon/buku": jaga(bacaBuku),
  "POST /api/karbon/buku": pos(tulisBuku),
  "GET /api/karbon/laporan": jaga(bacaLaporan),
  "POST /api/karbon/laporan": pos(simpan, SPEK.laporan),
  "GET /api/karbon/saring": jaga(env => kirim(env, "karbon/saring.json", BELUM_SARING)),
  "GET /api/karbon/saring_geom": jaga(env => kirim(env, "karbon/saring_geom.json", BELUM_SARING)),
};
