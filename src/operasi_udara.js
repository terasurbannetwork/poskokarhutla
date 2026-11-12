/* Operasi Lapangan OP-1 (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8; skema migrations/0103_operasi_lapangan.sql).
   Pergerakan armada = informasi operasional: BACA peta = staf peran PERAN_BACA atau adminOK (moderator, dan akun centurisk97 AKUN_SITUS dari login biasa: perintah pemilik 3 Nov 2026); tulis tetap moderator/staf; tamu 403; staf nyata tidak melihat baris dummy.
   Respons per pengguna: tidak lewat cacheTepi. Satu kueri per tabel (kuota baca D1 Free). Tabel 0103 belum ada: 503 sopan.
   Nama kru tidak disimpan. OP-2: catatOperasi() dipanggil gerbang WA (src/wa.js) sesudah wa_masuk tersimpan; pipeline renlap menyusul di OP-4. */
import {json, gagal, bacaBody, sha, adminOK} from "./worker.js";
import {tglSah, wib, superOK} from "./posko.js";
import {stafPeran, stafNyata, pemirsaLihat} from "./staf.js";
import {urai, tanggalOperasi} from "./operasi_wa.js";
import {hitungNilai, menitRespons, median} from "./operasi_nilai.js";
import {gunaAksi, lengkapi, gerakHidup, kejadianGerak, dihapusManual} from "./operasi_hasil.js";

export const PERAN_BACA = ["udara", "pusdalops", "koordalops", "pimpinan", "tmc"];
export const tanpaTabel = e => /no such table: op_/i.test(String(e?.message || e));
const baca = s => { try { return JSON.parse(s); } catch (e) { return null; } };
export const bungkus = fn => async (env, req, ...sisa) => {
  try { return await fn(env, req, ...sisa); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "fitur Operasi Lapangan belum diaktifkan (migrasi 0103_operasi_lapangan belum diterapkan)"); throw e; }
};

async function peta(env, req, url, kini) {
  if (!await adminOK(env, req, kini) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "data operasi lapangan hanya untuk akun centurisk97, staf berperan, atau moderator");
  const t = url.searchParams.get("tanggal") ?? wib(kini);
  if (!tglSah(t)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  const dum = stafNyata(req) ? "AND dummy = 0" : "";
  const Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results);
  const [base, armada, gerak, temuan, renlap, target, hapus] = await Promise.all([
    Q("SELECT * FROM op_base ORDER BY id"),
    Q(`SELECT a.*, s.status, s.alasan, s.sumber FROM op_armada a LEFT JOIN op_armada_status s ON s.registrasi = a.registrasi AND s.tanggal = ? WHERE 1 = 1 ${dum.replace("dummy", "a.dummy")} ORDER BY a.base_id, a.registrasi`, t),
    Q(`SELECT * FROM op_gerak WHERE tanggal = ? ${dum} ORDER BY jam_utc, id LIMIT 500`, t),
    Q(`SELECT * FROM op_temuan WHERE tanggal = ? ${dum} ORDER BY registrasi, id LIMIT 500`, t),
    Q(`SELECT * FROM op_renlap WHERE tanggal = ? ${dum} ORDER BY versi, base_id LIMIT 100`, t),
    Q(`SELECT g.* FROM op_target g JOIN op_renlap r ON r.id = g.renlap_id WHERE r.tanggal = ? ${dum.replace("dummy", "r.dummy")} ORDER BY g.renlap_id, g.urut LIMIT 1000`, t),
    dihapusManual(env),
  ]);
  /* butir yang dihapus manual (0126) tidak tampil; status gelar baru disembunyikan bila masih berasal dari isian manual (bot yang menulis sesudah hapus mengembalikannya) */
  const hilang = (tabel, id) => hapus.has(`${tabel}|${id}`);
  armada.forEach(a => { if (a.sumber === "manual" && hilang("op_armada_status", `${t}|${a.registrasi}`)) { a.status = null; a.alasan = null; a.sumber = null; } });
  return json({tanggal: t, base, armada, gerak: gerak.filter(g => !hilang("op_gerak", g.id)), temuan: temuan.filter(x => !hilang("op_temuan", x.id)),
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
    const r = await env.DB.batch([env.DB.prepare("DELETE FROM op_temuan WHERE dummy = 1"), env.DB.prepare("DELETE FROM op_gerak_hasil WHERE gerak_id IN (SELECT id FROM op_gerak WHERE dummy = 1)"), env.DB.prepare("UPDATE op_foto SET gerak_id = NULL WHERE gerak_id IN (SELECT id FROM op_gerak WHERE dummy = 1)"), env.DB.prepare("DELETE FROM op_gerak WHERE dummy = 1"),
      env.DB.prepare("DELETE FROM op_target WHERE renlap_id IN (SELECT id FROM op_renlap WHERE dummy = 1)"), env.DB.prepare("DELETE FROM op_renlap WHERE dummy = 1"),
      env.DB.prepare("DELETE FROM op_armada WHERE dummy = 1")]);
    return json({ok: true, temuan: r[0].meta.changes, gerak: r[3].meta.changes});
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
  const h = urai(teks, {tanggal: tgl, armada}), P = (sql, ...b) => env.DB.prepare(sql).bind(...b);
  /* jaga = penjagaan isian manual 0126 (K15, DESAIN-TEKNIS 7.4) DI DALAM pernyataan tulis, bukan baca-lalu-tulis; bot tidak mencatat penanda untuk tulisannya sendiri. */
  const bangun = jaga => {
    const st = [], tolak = (tabel, kunci) => `EXISTS (SELECT 1 FROM op_isian WHERE tabel = '${tabel}' AND kunci = ${kunci} AND terhapus = 0)`;
    /* jam temuan = jam pesan diterima bila tanggal operasi sama dengan hari terima (pesan patroli jarang menulis jam per titik); selain itu NULL. Bahan M7 waktu respons. */
    const jamTemuan = tgl === wib(diterima) ? diterima : null;
    for (const t of h.temuan) st.push(P("INSERT OR IGNORE INTO op_temuan (tanggal, jam_utc, registrasi, lat, lon, status, luas_klaim_ha, lokasi, wa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      tgl, jamTemuan, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha ?? null, t.lokasi ?? null, id));
    for (const g of h.gerak) { const drop = g.tindakan === "drop", jam = g.jam_utc ? Date.parse(g.jam_utc) : drop ? diterima : null;   // aksi drop: jam = jam pesan diterima
      const kunciG = `?1 || '|' || ?2 || '|' || ?3`;
      if (jaga) st.push(P(`INSERT INTO op_isian_log (waktu, oleh, tabel, kunci, aksi) SELECT ?4, 'bot', 'op_gerak', ${kunciG}, 'bot_dilewati' WHERE ${kejadianGerak("?1", "?2", "?3")}`, tgl, g.registrasi, g.jenis, diterima));
      st.push(P(`INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lokasi, lat, lon, rujukan, alasan, wa_id, rute) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 WHERE NOT EXISTS (SELECT 1 FROM op_gerak x WHERE x.tanggal = ?1 AND x.registrasi = ?2 AND x.jenis = ?3 AND x.jam_utc IS ?4${jaga ? ` AND ${gerakHidup("x")}` : ""})${jaga ? ` AND NOT ${kejadianGerak("?1", "?2", "?3")}` : ""}`,
        tgl, g.registrasi, g.jenis, jam, g.misi ?? null, g.target?.lokasi ?? null, g.target?.lat ?? null, g.target?.lon ?? null, g.rujukan ?? null, drop ? "water_drop" : g.alasan ?? null, id, g.rute ?? null));
      if (["drops", "liter", "lapor", "luas_terbakar_ha", "luas_padam_ha", "menit_terbang"].some(k => g[k] != null)) {
        const sel = `FROM op_gerak WHERE tanggal = ?1 AND registrasi = ?2 AND jenis = ?3 AND jam_utc IS ?4${jaga ? ` AND ${gerakHidup("op_gerak")}` : ""} ORDER BY id LIMIT 1`;
        const args = [tgl, g.registrasi, g.jenis, jam, g.drops ?? null, g.liter ?? null, g.lapor ?? null, g.luas_terbakar_ha ?? null, g.luas_padam_ha ?? null, g.menit_terbang ?? null];
        if (jaga) st.push(P(`INSERT INTO op_isian_log (waktu, oleh, tabel, kunci, aksi) SELECT ?5, 'bot', 'op_gerak_hasil', CAST(id AS TEXT), 'bot_dilewati' ${sel.replace(/ORDER BY id LIMIT 1$/, "")} AND ${tolak("op_gerak_hasil", "CAST(op_gerak.id AS TEXT)")} ORDER BY id LIMIT 1`, tgl, g.registrasi, g.jenis, jam, diterima));
        st.push(P(`INSERT INTO op_gerak_hasil (gerak_id, drops, liter, lapor, luas_terbakar_ha, luas_padam_ha, menit_terbang) SELECT id, ?5, ?6, ?7, ?8, ?9, ?10 ${sel} ON CONFLICT (gerak_id) DO UPDATE SET drops = ?5, liter = ?6, lapor = ?7, luas_terbakar_ha = ?8, luas_padam_ha = ?9, menit_terbang = ?10${jaga ? ` WHERE NOT ${tolak("op_gerak_hasil", "CAST(op_gerak_hasil.gerak_id AS TEXT)")}` : ""}`, ...args));
      } }
    for (const s of h.status) {
      if (jaga) st.push(P(`INSERT INTO op_isian_log (waktu, oleh, tabel, kunci, aksi) SELECT ?3, 'bot', 'op_armada_status', ?1 || '|' || ?2, 'bot_dilewati' WHERE ${tolak("op_armada_status", "?1 || '|' || ?2")}`, tgl, s.registrasi, diterima));
      st.push(P(`INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES (?1, ?2, ?3, ?4, 'wa', ?5) ON CONFLICT (tanggal, registrasi) DO UPDATE SET status = ?3, alasan = ?4, sumber = 'wa', diubah = ?5${jaga ? ` WHERE NOT ${tolak("op_armada_status", "excluded.tanggal || '|' || excluded.registrasi")}` : ""}`,
        tgl, s.registrasi, s.status, s.alasan ?? null, diterima));
    }
    return st;
  };
  /* 0126 belum diterapkan di produksi: jalur lama tanpa penjagaan */
  try { const st = bangun(true); if (st.length) await env.DB.batch(st); }
  catch (e) { if (!/no such table: op_isian/i.test(String(e?.message || e))) throw e; const st = bangun(false); if (st.length) await env.DB.batch(st); }
  try { await lengkapi(env, diterima); } catch (e) { if (!tanpaTabel(e)) throw e; }   // 0106 belum ada: pesan tetap tercatat tanpa pemasangan foto/koordinat
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
  const [temuan, gerak, hapus] = await Promise.all([
    Q(`SELECT ${KOLOM_TEMUAN} FROM op_temuan WHERE dummy = 0 AND tanggal BETWEEN ? AND ? ORDER BY tanggal, id LIMIT 2000`),
    Q(`SELECT ${KOLOM_GERAK} FROM op_gerak WHERE dummy = 0 AND tanggal BETWEEN ? AND ? ORDER BY tanggal, jam_utc, id LIMIT 2000`), dihapusManual(env)]);
  return json({...r, temuan: temuan.filter(x => !hapus.has(`op_temuan|${x.id}`)), gerak: gerak.filter(x => !hapus.has(`op_gerak|${x.id}`))});
}

const MAKS_TARGET = 20, MAKS_RENLAP = 200000, MAKS_BASE = 20;
export const dalamBbox = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 141.5;
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

/* GET /api/operasi/nilai: hak baca sama dengan peta (akun centurisk97, staf PERAN_BACA, moderator), staf nyata tanpa dummy. Satu kueri per tabel; rentang maks 31 hari (kuota baca D1 Free). */
async function nilai(env, req, url) {
  if (!await adminOK(env, req) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "nilai operasi lapangan hanya untuk akun centurisk97, staf berperan, atau moderator");
  const r = rentang(url, 31); if (r instanceof Response) return r;
  const dum = stafNyata(req), A = [r.dari, r.sampai];
  const Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(x => x.results);
  const nd = dum ? "AND dummy = 0" : "";
  const [base, armada, status0, gerak0, temuan0, renlap, target, hapus] = await Promise.all([
    Q("SELECT id, nama, prov, lat, lon FROM op_base ORDER BY id"),
    Q(`SELECT registrasi, tipe, peran, base_id FROM op_armada WHERE 1 = 1 ${nd}`),
    Q("SELECT tanggal, registrasi, status, sumber FROM op_armada_status WHERE tanggal BETWEEN ? AND ?", ...A),
    Q(`SELECT id, tanggal, registrasi, jenis, jam_utc, lat, lon, rujukan FROM op_gerak WHERE tanggal BETWEEN ? AND ? ${nd} LIMIT 5000`, ...A),
    Q(`SELECT id, tanggal, jam_utc, registrasi, lat, lon, status FROM op_temuan WHERE tanggal BETWEEN ? AND ? ${nd} LIMIT 5000`, ...A),
    Q(`SELECT id, tanggal, versi, base_id FROM op_renlap WHERE tanggal BETWEEN ? AND ? ${nd}`, ...A),
    Q(`SELECT g.renlap_id, g.lat, g.lon, g.jenis FROM op_target g JOIN op_renlap r ON r.id = g.renlap_id WHERE r.tanggal BETWEEN ? AND ? ${dum ? "AND r.dummy = 0" : ""}`, ...A), dihapusManual(env)]);
  const status = status0.filter(x => !(x.sumber === "manual" && hapus.has(`op_armada_status|${x.tanggal}|${x.registrasi}`))), gerak = gerak0.filter(x => !hapus.has(`op_gerak|${x.id}`)), temuan = temuan0.filter(x => !hapus.has(`op_temuan|${x.id}`));
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

/* ================================================================ monitoring operasi udara: aksi, hasil (padam/masih_api), foto, KPI */
const bulat = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const SIAP = ["siap", "operasi", "siaga"];
function hitungK({aks, status, tem, menitTerbang}) {
  const n = h => aks.filter(a => a.hasil === h).length, padam = n("padam"), masih = n("masih_api"), dinilai = padam + masih;
  const terbang = new Set(aks.map(a => `${a.tanggal}|${a.registrasi}`)), siap = status.filter(s => SIAP.includes(s.status));
  const wb = aks.filter(a => a.guna === "wb" && Number.isFinite(a.jam_utc)).map(a => ({jam_utc: a.jam_utc, lat: a.lat, lon: a.lon, rujukan: a.rujukan})), {menit} = menitRespons(tem, wb);
  const berfoto = aks.filter(a => a.foto.length).length, jumlah = k => aks.reduce((s, a) => s + (a[k] ?? 0), 0);
  return {sortie: aks.filter(a => a.jenis === "berangkat").length, aksi_wb: aks.filter(a => a.guna === "wb").length, dinilai, padam, masih_api: masih, menunggu: n("menunggu"),
    persen_padam: dinilai ? bulat(padam / dinilai) : null, respons_median_menit: menit.length ? bulat(median(menit), 1) : null,
    hari_siap: siap.length, hari_terbang: terbang.size, utilisasi: siap.length ? bulat(siap.filter(s => terbang.has(`${s.tanggal}|${s.registrasi}`)).length / siap.length) : null,
    aksi_berfoto: berfoto, persen_berfoto: aks.length ? bulat(berfoto / aks.length) : null, drop_total: jumlah("drop"), liter_total: jumlah("liter"), menit_terbang: menitTerbang};
}

/* GET /api/operasi/monitor?dari=&sampai= (default hari ini WIB, maks 31 hari). Hak baca = nilai/peta. Aksi = gerak berangkat (sortie atau laporan drop) bermisi wb/patroli/omc;
   hasil hanya dinilai untuk wb (padam/masih_api dari cron FIRMS, tanpa baris hasil: menunggu bila koordinat+jam ada), patroli dan omc = tak_dinilai. */
async function monitor(env, req, url, kini) {
  if (!await adminOK(env, req) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "monitor operasi udara hanya untuk akun centurisk97, staf berperan, atau moderator");
  const u = new URL(url); for (const k of ["dari", "sampai"]) if (!u.searchParams.has(k)) u.searchParams.set(k, wib(kini));
  const r = rentang(u, 31); if (r instanceof Response) return r;
  const nd = stafNyata(req) ? "AND g.dummy = 0" : "", A = [r.dari, r.sampai], Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(x => x.results);
  const [armada, gerak0, foto, status0, tem0, hapus] = await Promise.all([
    Q(`SELECT registrasi, base_id, peran FROM op_armada ${nd ? "WHERE dummy = 0" : ""}`),
    Q(`SELECT g.id, g.tanggal, g.registrasi, g.jenis, g.jam_utc, g.misi, g.lokasi, g.lat, g.lon, g.rujukan, g.alasan, h.sumber_lokasi, h.hasil, h.titik_dekat, h.drops, h.liter, h.lapor, h.luas_terbakar_ha, h.luas_padam_ha, h.menit_terbang
      FROM op_gerak g LEFT JOIN op_gerak_hasil h ON h.gerak_id = g.id WHERE g.tanggal BETWEEN ?1 AND ?2 ${nd} ORDER BY g.jam_utc, g.id LIMIT 3000`, ...A),
    Q("SELECT id, gerak_id, coalesce(jam_utc, diterima) jam_utc, lat, lon FROM op_foto WHERE gerak_id IN (SELECT id FROM op_gerak WHERE tanggal BETWEEN ?1 AND ?2) ORDER BY 3, id LIMIT 5000", ...A),
    Q("SELECT tanggal, registrasi, status, sumber FROM op_armada_status WHERE tanggal BETWEEN ?1 AND ?2", ...A),
    Q(`SELECT id, tanggal, jam_utc, registrasi, lat, lon, status FROM op_temuan g WHERE tanggal BETWEEN ?1 AND ?2 ${nd} LIMIT 5000`, ...A), dihapusManual(env)]);
  const status = status0.filter(x => !(x.sumber === "manual" && hapus.has(`op_armada_status|${x.tanggal}|${x.registrasi}`))), tem = tem0.filter(x => !hapus.has(`op_temuan|${x.id}`));
  const gerak = gerak0.filter(x => !hapus.has(`op_gerak|${x.id}`)).map(x => hapus.has(`op_gerak_hasil|${x.id}`) ? {...x, drops: null, liter: null, lapor: null, luas_terbakar_ha: null, luas_padam_ha: null, menit_terbang: null} : x);
  const am = new Map(armada.map(a => [a.registrasi, a]));
  const aksi = gerak.filter(g => g.jenis === "berangkat").flatMap(g => {
    const guna = gunaAksi(g.misi, am.get(g.registrasi)?.peran); if (!guna) return [];
    const ada = g.lat != null && g.jam_utc != null, hasil = g.hasil ?? (guna === "wb" && ada && kini - g.jam_utc <= 48 * 36e5 ? "menunggu" : "tak_dinilai");
    return [{id: g.id, tanggal: g.tanggal, registrasi: g.registrasi, base_id: am.get(g.registrasi)?.base_id ?? null, guna, jenis: g.alasan === "water_drop" ? "drop" : "berangkat", jam_utc: g.jam_utc, lokasi: g.lokasi,
      lat: g.lat, lon: g.lon, sumber_lokasi: g.lat == null ? null : g.sumber_lokasi ?? "teks", hasil, titik_dekat: hasil === "tak_dinilai" ? null : g.titik_dekat ?? 0,
      drop: g.drops, liter: g.liter, lapor_akhir: g.lapor, luas_terbakar_ha: g.luas_terbakar_ha, luas_padam_ha: g.luas_padam_ha, rujukan: g.rujukan,
      foto: foto.filter(f => f.gerak_id === g.id).map(f => ({id: f.id, url: `/api/operasi/foto/${f.id}`, jam_utc: f.jam_utc, lat: f.lat, lon: f.lon}))}];
  });
  const menit = gerak.filter(g => g.menit_terbang != null), pada = (cocok) => ({aks: aksi.filter(a => cocok(a.registrasi)), status: status.filter(s => cocok(s.registrasi)), tem, menitTerbang: menit.filter(g => cocok(g.registrasi)).reduce((s, g) => s + g.menit_terbang, 0)});
  const regs = [...new Set([...aksi.map(a => a.registrasi), ...status.map(s => s.registrasi)])].sort(), bases = [...new Set(regs.map(x => am.get(x)?.base_id).filter(Boolean))].sort();
  return json({dari: r.dari, sampai: r.sampai, aksi: aksi.map(({rujukan, ...a}) => a),
    kpi: {semua: hitungK(pada(() => true)), base: Object.fromEntries(bases.map(b => [b, hitungK(pada(x => am.get(x)?.base_id === b))])), armada: Object.fromEntries(regs.map(x => [x, hitungK(pada(y => y === x))]))}}, 200, {"cache-control": "no-store"});
}

/* GET /api/operasi/jejak?tanggal= (bawaan hari ini WIB): jejak ADS-B per armada kita. adsb_posisi (0086) tak punya registrasi: dicocokkan lewat callsign
   (registrasi tanpa strip = flight). posisi_hari_ini = semua baris hari itu (bukti ADS-B hidup walau tak ada armada kita). Tabel belum ada = aktif:false. */
async function jejak(env, req, url, kini) {
  if (!await adminOK(env, req) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "jejak ADS-B hanya untuk akun centurisk97, staf berperan, atau moderator");
  const tanggal = url.searchParams.get("tanggal") ?? wib(kini);
  if (!tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD yang sah");
  const awal = Date.parse(tanggal + "T00:00:00Z") - 7 * 36e5, akhir = awal + HARI, nd = stafNyata(req) ? "AND a.dummy = 0" : "";
  let semua, baris;
  try {
    [semua, baris] = await Promise.all([
      env.DB.prepare("SELECT count(*) n FROM adsb_posisi WHERE menit >= ?1 AND menit < ?2").bind(awal, akhir).first(),
      env.DB.prepare(`SELECT a.registrasi, p.hex, p.menit, p.lat, p.lon, p.alt, p.gs FROM adsb_posisi p JOIN op_armada a ON upper(replace(a.registrasi, '-', '')) = upper(trim(p.flight))
        WHERE p.menit >= ?1 AND p.menit < ?2 ${nd} ORDER BY a.registrasi, p.hex, p.menit LIMIT 2000`).bind(awal, akhir).all().then(x => x.results)]);
  } catch (e) {
    if (/no such table: adsb_posisi/i.test(String(e?.message || e))) return json({tanggal, aktif: false, posisi_hari_ini: 0, jejak: []}, 200, {"cache-control": "no-store"});
    throw e;
  }
  const per = new Map();
  for (const b of baris) { const k = b.registrasi + "|" + b.hex; if (!per.has(k)) per.set(k, {registrasi: b.registrasi, hex: b.hex, titik: []}); per.get(k).titik.push({t: b.menit, lat: b.lat, lon: b.lon, alt: b.alt, gs: b.gs}); }
  return json({tanggal, aktif: true, posisi_hari_ini: semua?.n ?? 0, jejak: [...per.values()]}, 200, {"cache-control": "no-store"});
}

/* GET /api/operasi/foto/:id -> byte foto dari R2. Hak baca sama; privat (data operasional). */
async function fotoBerkas(env, req, url, kini, ctx, id) {
  if (!await adminOK(env, req) && !await stafPeran(env, req, PERAN_BACA) && !await pemirsaLihat(env, req)) return gagal(403, "foto operasi hanya untuk akun centurisk97, staf berperan, atau moderator");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const r = await env.DB.prepare("SELECT w.berkas, w.tipe FROM op_foto f JOIN wa_masuk w ON w.id = f.wa_id WHERE f.id = ?").bind(Number(id)).first();
  const o = r?.berkas && await env.MEDIA.get(r.berkas); if (!o) return gagal(404, "foto tidak ada");
  return new Response(o.body, {headers: {"content-type": /^image\/(jpeg|png|webp)$/.test(r.tipe || "") ? r.tipe : "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox"}});
}

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis (gerbang cakupan) */
export const RUTE_OPERASI = Object.fromEntries(Object.entries({
  "GET /api/operasi/peta": peta,
  "POST /api/operasi/dummy": dummy,
  "GET /api/operasi/temuan": temuanMesin,
  "POST /api/operasi/renlap": renlapMesin,
  "GET /api/operasi/nilai": nilai,
  "GET /api/operasi/monitor": monitor,
  "GET /api/operasi/jejak": jejak,
  "GET /api/operasi/foto/:id": fotoBerkas,
}).map(([k, f]) => [k, bungkus(f)]));
