/* Operasi Lapangan OP-1 (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8; skema migrations/0103_operasi_lapangan.sql).
   Pergerakan armada = informasi operasional: KHUSUS staf (peran di PERAN_BACA, moderator ke atas); akun gerbang situs dan tamu 403; staf nyata tidak melihat baris dummy.
   Respons per pengguna: tidak lewat cacheTepi. Satu kueri per tabel (kuota baca D1 Free). Tabel 0103 belum ada: 503 sopan.
   Nama kru tidak disimpan. OP-2: catatOperasi() dipanggil gerbang WA (src/wa.js) sesudah wa_masuk tersimpan; pipeline renlap menyusul di OP-4. */
import {json, gagal, bacaBody, sha} from "./worker.js";
import {tglSah, wib, superOK} from "./posko.js";
import {modAtauStaf, stafNyata} from "./staf.js";
import {urai, tanggalOperasi} from "./operasi_wa.js";
import {hitungNilai} from "./operasi_nilai.js";

export const PERAN_BACA = ["udara", "pusdalops", "koordalops", "pimpinan", "tmc"];
const tanpaTabel = e => /no such table: op_/i.test(String(e?.message || e));
const baca = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const bungkus = fn => async (env, req, ...sisa) => {
  try { return await fn(env, req, ...sisa); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "fitur Operasi Lapangan belum diaktifkan (migrasi 0103_operasi_lapangan belum diterapkan)"); throw e; }
};

async function peta(env, req, url, kini) {
  if (!await modAtauStaf(env, req, PERAN_BACA)) return gagal(403, "data operasi lapangan hanya untuk staf berperan atau moderator ke atas (bukan akun gerbang situs)");
  const t = url.searchParams.get("tanggal") ?? wib(kini);
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  const dum = stafNyata(req) ? "AND dummy = 0" : "";
  const Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results);
  const [base, armada, gerak, temuan, renlap, target] = await Promise.all([
    Q("SELECT * FROM op_base ORDER BY id"),
    Q(`SELECT a.*, s.status, s.alasan, s.sumber FROM op_armada a LEFT JOIN op_armada_status s ON s.registrasi = a.registrasi AND s.tanggal = ? WHERE 1 = 1 ${dum.replace("dummy", "a.dummy")} ORDER BY a.base_id, a.registrasi`, t),
    Q(`SELECT * FROM op_gerak WHERE tanggal = ? ${dum} ORDER BY jam_utc, id LIMIT 500`, t),
    Q(`SELECT * FROM op_temuan WHERE tanggal = ? ${dum} ORDER BY registrasi, id LIMIT 500`, t),
    Q(`SELECT * FROM op_renlap WHERE tanggal = ? ${dum} ORDER BY versi, base_id LIMIT 100`, t),
    Q(`SELECT g.* FROM op_target g JOIN op_renlap r ON r.id = g.renlap_id WHERE r.tanggal = ? ${dum.replace("dummy", "r.dummy")} ORDER BY g.renlap_id, g.urut LIMIT 1000`, t),
  ]);
  return json({tanggal: t, base, armada, gerak, temuan,
    renlap: renlap.map(r => ({...r, isi: baca(r.isi_json), isi_json: undefined, target: target.filter(g => g.renlap_id === r.id).map(g => ({...g, alasan: baca(g.alasan_json), alasan_json: undefined}))}))});
}

/* ================================================================ dummy (DUMMY.md): temuan dan gerak nyata 2 Nov 2026; jam temuan tidak diketahui = NULL */
const TGL = "2026-11-02", z = jam => Date.parse(`${TGL}T${jam}:00Z`);
const TEMUAN = [   // [registrasi, status, lat, lon, lokasi, luas, umur]
  ["H-3217", "clear", -0.27103, 109.36153, "Rasau"], ["H-3217", "berasap_tipis", -0.45078, 109.36847, "Kubu"], ["H-3217", "clear", -0.34503, 109.54761, "Sungai Asam"],
  ["H-3217", "clear", -0.32556, 109.62222, "Sungai Raya"], ["H-3217", "clear", -0.26194, 109.59722, "Sungai Bulan"], ["H-3217", "berasap_tipis", -0.15944, 109.55083, "Sungai Ambawang"],
  ["H-3217", "berasap_tipis", -0.14011, 109.55192, "Pasak Piang"],
  ["PK-RTQ", "fs", -3.33583, 114.83333, "Sungai Batang Banjar", 0.2], ["PK-RTQ", "clear", -3.33889, 114.77361, "Penggalaman"], ["PK-RTQ", "clear", -3.41222, 114.71028, "Gambut"],
  ["PK-RTQ", "fs", -3.29639, 114.49472, "Tinggiran Tengah Batola", 1],
  ["PK-FPA", "clear", 0.16806, 109.69333, "Kumpang Tengah"], ["PK-FPA", "clear", 1.32722, 109.13556, "Merubung"],
  ["VN-8416", "fs", -2.84278, 110.66917, "Air Hitam Besar", 8, 22]];
const GERAK = [["VN-8416", "berangkat", "01:28", "WB"], ["VH-L6T", "berangkat", "02:05", "WB"], ["PK-FPA", "berangkat", "01:11", "patroli"], ["H-3217", "rencana", "01:00", "patroli"]];
async function dummy(env, req) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "hapus") {
    const r = await env.DB.batch([env.DB.prepare("DELETE FROM op_temuan WHERE dummy = 1"), env.DB.prepare("DELETE FROM op_gerak WHERE dummy = 1"),
      env.DB.prepare("DELETE FROM op_target WHERE renlap_id IN (SELECT id FROM op_renlap WHERE dummy = 1)"), env.DB.prepare("DELETE FROM op_renlap WHERE dummy = 1"),
      env.DB.prepare("DELETE FROM op_armada WHERE dummy = 1")]);
    return json({ok: true, temuan: r[0].meta.changes, gerak: r[1].meta.changes});
  }
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
  if ((await env.DB.prepare("SELECT count(*) n FROM op_temuan WHERE dummy = 1").first()).n) return gagal(409, "data dummy operasi lapangan sudah ada; hapus dulu dengan 🧹");
  await env.DB.batch([...TEMUAN.map(([reg, st, lat, lon, lok, luas, umur]) => env.DB.prepare("INSERT OR IGNORE INTO op_temuan (tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, umur_klaim_hari, lokasi, dummy) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(TGL, reg, lat, lon, st, luas ?? null, umur ?? null, lok)),
    ...GERAK.map(([reg, jenis, jam, misi]) => env.DB.prepare("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, dummy) VALUES (?, ?, ?, ?, ?, 1)").bind(TGL, reg, jenis, z(jam), misi))]);
  return json({ok: true, temuan: TEMUAN.length, gerak: GERAK.length}, 201);
}

/* OP-2: pesan WA satgas udara -> op_temuan/op_gerak/op_armada_status. Dipanggil gerbang WA SESUDAH wa_masuk tersimpan, dibungkus try/catch di pemanggil:
   galat pengurai atau tabel 0103 belum ada tidak boleh menggagalkan penyimpanan pesan. Pesan non-operasi: null tanpa menyentuh D1. Tanggal = tanggal isi bila wajar (tidak lewat besok WIB), selain itu tanggal terima.
   ponytail: tertahan tidak disimpan, hanya dikembalikan di respons gerbang; tabel antrean menyusul bila staf perlu mengonfirmasinya dari layar. */
export async function catatOperasi(env, {id, teks, tanggal, diterima}) {
  if (!urai(teks, {tanggal}).dikenali) return null;
  const isi = tanggalOperasi(teks), batas = wib(diterima + 864e5), tgl = isi && isi <= batas ? isi : tanggal;
  let armada; try { armada = (await env.DB.prepare("SELECT registrasi FROM op_armada").all()).results.map(r => r.registrasi); } catch (e) { if (tanpaTabel(e)) return null; throw e; }
  const h = urai(teks, {tanggal: tgl, armada}), P = (sql, ...b) => env.DB.prepare(sql).bind(...b), st = [];
  /* jam temuan = jam pesan diterima bila tanggal operasi sama dengan hari terima (pesan patroli jarang menulis jam per titik); selain itu NULL. Bahan M7 waktu respons. */
  const jamTemuan = tgl === wib(diterima) ? diterima : null;
  for (const t of h.temuan) st.push(P("INSERT OR IGNORE INTO op_temuan (tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, lokasi, wa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    tgl, jamTemuan, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha ?? null, t.lokasi ?? null, id));
  for (const g of h.gerak) { const jam = g.jam_utc ? Date.parse(g.jam_utc) : null;
    st.push(P("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lokasi, lat, lon, rujukan, alasan, wa_id) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11 WHERE NOT EXISTS (SELECT 1 FROM op_gerak WHERE tanggal = ?1 AND registrasi = ?2 AND jenis = ?3 AND jam_utc IS ?4)",
      tgl, g.registrasi, g.jenis, jam, g.misi ?? null, g.target?.lokasi ?? null, g.target?.lat ?? null, g.target?.lon ?? null, g.rujukan ?? null, g.alasan ?? null, id)); }
  for (const s of h.status) st.push(P("INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES (?1, ?2, ?3, ?4, 'wa', ?5) ON CONFLICT (tanggal, registrasi) DO UPDATE SET status = ?3, alasan = ?4, sumber = 'wa', diubah = ?5",
    tgl, s.registrasi, s.status, s.alasan ?? null, diterima));
  if (st.length) await env.DB.batch(st);
  return {tanggal: tgl, dikenali: h.dikenali, temuan: h.temuan.length, gerak: h.gerak.length, status: h.status.length, tertahan: h.tertahan.map(({alasan, lokasi}) => ({alasan, ...(lokasi ? {lokasi} : {})}))};
}

/* ================================================================ OP-4/OP-5: mesin Mac mini (Bearer WA_MESIN, banding sha) dan nilai */
const bacaMesin = async (env, req) => { const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1]; return !!(env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN)); };
const HARI = 864e5;
/* ?dari=&sampai= -> {dari, sampai} atau Response galat; maks = jumlah hari inklusif */
function rentang(url, maks) {
  const dari = url.searchParams.get("dari"), sampai = url.searchParams.get("sampai");
  if (!tglSah(dari || "") || !tglSah(sampai || "")) return gagal(400, "dari dan sampai harus YYYY-MM-DD yang sah");
  const hari = (Date.parse(sampai) - Date.parse(dari)) / HARI + 1;
  if (hari < 1) return gagal(400, "sampai tidak boleh sebelum dari");
  if (hari > maks) return gagal(400, `rentang maksimal ${maks} hari`);
  return {dari, sampai};
}
const KOLOM_TEMUAN = "id, tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, umur_klaim_hari, lokasi, kab_kode";
const KOLOM_GERAK = "id, tanggal, registrasi, jenis, jam_utc, misi, rute, lokasi, lat, lon, rujukan, alasan";

async function temuanMesin(env, req, url) {
  if (!await bacaMesin(env, req)) return gagal(403, "perlu kunci mesin");
  const r = rentang(url, 7); if (r instanceof Response) return r;
  const Q = (sql) => env.DB.prepare(sql).bind(r.dari, r.sampai).all().then(x => x.results);
  const [temuan, gerak] = await Promise.all([
    Q(`SELECT ${KOLOM_TEMUAN} FROM op_temuan WHERE dummy = 0 AND tanggal BETWEEN ? AND ? ORDER BY tanggal, id LIMIT 2000`),
    Q(`SELECT ${KOLOM_GERAK} FROM op_gerak WHERE dummy = 0 AND tanggal BETWEEN ? AND ? ORDER BY tanggal, jam_utc, id LIMIT 2000`)]);
  return json({...r, temuan, gerak});
}

const MAKS_TARGET = 20, MAKS_RENLAP = 200000, MAKS_BASE = 20;
const dalamBbox = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5;
async function renlapMesin(env, req, url, kini) {
  if (!await bacaMesin(env, req)) return gagal(403, "perlu kunci mesin");
  const b = await bacaBody(req, MAKS_RENLAP); if (b.galat) return gagal(b.status || 400, b.galat);
  const {tanggal, versi, base} = b.o;
  if (typeof tanggal !== "string" || !tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  if (versi !== "malam" && versi !== "pagi") return gagal(400, "versi harus malam atau pagi");
  if (!Array.isArray(base) || !base.length || base.length > MAKS_BASE) return gagal(400, `base harus larik 1 sampai ${MAKS_BASE}`);
  const ada = new Set((await env.DB.prepare("SELECT id FROM op_base").all()).results.map(r => r.id)), lihat = new Set(), isi = [];
  for (const x of base) {
    if (!x || typeof x !== "object" || !ada.has(x.id)) return gagal(400, `base ${String(x?.id).slice(0, 8)} tidak ada di op_base`);
    if (lihat.has(x.id)) return gagal(400, `base ${x.id} dobel`); lihat.add(x.id);
    const lP = x.patroli ?? [], lW = x.wb ?? [];
    if (!Array.isArray(lP) || !Array.isArray(lW)) return gagal(400, `${x.id}: patroli dan wb harus larik`);
    if (lP.length + lW.length > MAKS_TARGET) return gagal(400, `${x.id}: maksimal ${MAKS_TARGET} target per base`);
    const target = [];
    for (const [jenis, l] of [["patroli", lP], ["wb", lW]]) for (const t of l) {
      if (!t || typeof t !== "object" || !dalamBbox(t.lat, t.lon)) return gagal(400, `${x.id}: koordinat target di luar Indonesia`);
      if (t.skor != null && !Number.isFinite(t.skor)) return gagal(400, `${x.id}: skor harus angka`);
      if (t.alasan != null && (typeof t.alasan !== "object")) return gagal(400, `${x.id}: alasan harus objek`);
      target.push({jenis, lat: t.lat, lon: t.lon, skor: t.skor ?? null, alasan: t.alasan ?? null});
    }
    const {armada, kandidat_dalam_radius, ...sisa} = x;
    isi.push({id: x.id, target, json: JSON.stringify({meta: {dibuat: b.o.dibuat ?? null, sumber: b.o.sumber ?? null, catatan: b.o.catatan ?? null, bobot_label: b.o.bobot_label ?? null}, base: {...sisa, armada, kandidat_dalam_radius}})});
    if (isi.at(-1).json.length > 262144) return gagal(400, `${x.id}: isi renlap melebihi 256 KB`);
  }
  const P = (sql, ...a) => env.DB.prepare(sql).bind(...a), ids = isi.map(i => `${tanggal}-${versi}-${i.id}`);
  const kunci = await P(`SELECT id FROM op_renlap WHERE status = 'dikirim' AND id IN (${ids.map(() => "?").join(",")})`, ...ids).all();
  if (kunci.results.length) return gagal(409, `renlap ${kunci.results[0].id} sudah dikirim, tidak boleh ditimpa`);
  const st = [];
  isi.forEach((i, k) => {
    const id = ids[k]; let urut = 0;
    st.push(P("INSERT INTO op_renlap (id, tanggal, versi, base_id, dibuat, isi_json, status, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'draf', 0) ON CONFLICT (id) DO UPDATE SET dibuat = ?5, isi_json = ?6, status = 'draf'", id, tanggal, versi, i.id, kini, i.json));
    st.push(P("DELETE FROM op_target WHERE renlap_id = ?", id));
    for (const t of i.target) st.push(P("INSERT INTO op_target (id, renlap_id, urut, jenis, lat, lon, skor, alasan_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", `${id}-${++urut}`, id, urut, t.jenis, t.lat, t.lon, t.skor, t.alasan == null ? null : JSON.stringify(t.alasan)));
  });
  await env.DB.batch(st);
  return json({ok: true, tanggal, versi, renlap: ids, target: isi.reduce((a, i) => a + i.target.length, 0)}, 201);
}

/* GET /api/operasi/nilai: staf (PERAN_BACA), staf nyata tanpa dummy. Satu kueri per tabel; rentang maks 31 hari (kuota baca D1 Free). */
async function nilai(env, req, url) {
  if (!await modAtauStaf(env, req, PERAN_BACA)) return gagal(403, "nilai operasi lapangan hanya untuk staf berperan atau moderator ke atas (bukan akun gerbang situs)");
  const r = rentang(url, 31); if (r instanceof Response) return r;
  const dum = stafNyata(req), A = [r.dari, r.sampai];
  const Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(x => x.results);
  const nd = dum ? "AND dummy = 0" : "";
  const [base, armada, status, gerak, temuan, renlap, target] = await Promise.all([
    Q("SELECT id, nama, prov, lat, lon FROM op_base ORDER BY id"),
    Q(`SELECT registrasi, tipe, peran, base_id FROM op_armada WHERE 1 = 1 ${nd}`),
    Q("SELECT tanggal, registrasi, status FROM op_armada_status WHERE tanggal BETWEEN ? AND ?", ...A),
    Q(`SELECT tanggal, registrasi, jenis, jam_utc, lat, lon, rujukan FROM op_gerak WHERE tanggal BETWEEN ? AND ? ${nd} LIMIT 5000`, ...A),
    Q(`SELECT tanggal, jam_utc, registrasi, lat, lon, status FROM op_temuan WHERE tanggal BETWEEN ? AND ? ${nd} LIMIT 5000`, ...A),
    Q(`SELECT id, tanggal, versi, base_id FROM op_renlap WHERE tanggal BETWEEN ? AND ? ${nd}`, ...A),
    Q(`SELECT g.renlap_id, g.lat, g.lon, g.jenis FROM op_target g JOIN op_renlap r ON r.id = g.renlap_id WHERE r.tanggal BETWEEN ? AND ? ${dum ? "AND r.dummy = 0" : ""}`, ...A)]);
  let titik = null, alasanTitik = null;
  if (temuan.some(t => t.status === "clear")) {
    try {
      const x = await env.DB.prepare("SELECT dibuat, isi FROM titik_terbaru ORDER BY id DESC LIMIT 1").first();
      if (x) { const o = JSON.parse(x.isi), acuan = Date.parse(o.acuan), p = o.baris.map(b => ({lat: b[0], lon: b[1], t: acuan + b[2] * 36e5}));
        titik = {awal: p.length ? Math.min(...p.map(q => q.t)) : x.dibuat, akhir: x.dibuat, titik: p}; }
    } catch (e) { alasanTitik = "titik panas sistem tidak terbaca"; }
  }
  return json({dari: r.dari, sampai: r.sampai, hari: (Date.parse(r.sampai) - Date.parse(r.dari)) / HARI + 1, dummy: !dum,
    ...hitungNilai({base, armada, status, gerak, temuan, renlap, target, titik}), ...alasanTitik ? {galat_titik: alasanTitik} : {}});
}

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis (gerbang cakupan) */
export const RUTE_OPERASI = Object.fromEntries(Object.entries({
  "GET /api/operasi/peta": peta,
  "POST /api/operasi/dummy": dummy,
  "GET /api/operasi/temuan": temuanMesin,
  "POST /api/operasi/renlap": renlapMesin,
  "GET /api/operasi/nilai": nilai,
}).map(([k, f]) => [k, bungkus(f)]));
