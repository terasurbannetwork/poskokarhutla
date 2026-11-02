/* Operasi Lapangan OP-1 (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8; skema migrations/0103_operasi_lapangan.sql).
   Pergerakan armada = informasi operasional: KHUSUS staf (peran di PERAN_BACA, moderator ke atas); akun gerbang situs dan tamu 403; staf nyata tidak melihat baris dummy.
   Respons per pengguna: tidak lewat cacheTepi. Satu kueri per tabel (kuota baca D1 Free). Tabel 0103 belum ada: 503 sopan.
   Nama kru tidak disimpan. OP-2: catatOperasi() dipanggil gerbang WA (src/wa.js) sesudah wa_masuk tersimpan; pipeline renlap menyusul di OP-4. */
import {json, gagal, bacaBody} from "./worker.js";
import {tglSah, wib, superOK} from "./posko.js";
import {modAtauStaf, stafNyata} from "./staf.js";
import {urai, tanggalOperasi} from "./operasi_wa.js";

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
  for (const t of h.temuan) st.push(P("INSERT OR IGNORE INTO op_temuan (tanggal, registrasi, lat, lon, status, luas_klaim_ha, lokasi, wa_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    tgl, t.registrasi, t.lat, t.lon, t.status, t.luas_klaim_ha ?? null, t.lokasi ?? null, id));
  for (const g of h.gerak) { const jam = g.jam_utc ? Date.parse(g.jam_utc) : null;
    st.push(P("INSERT INTO op_gerak (tanggal, registrasi, jenis, jam_utc, misi, lokasi, lat, lon, rujukan, alasan, wa_id) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11 WHERE NOT EXISTS (SELECT 1 FROM op_gerak WHERE tanggal = ?1 AND registrasi = ?2 AND jenis = ?3 AND jam_utc IS ?4)",
      tgl, g.registrasi, g.jenis, jam, g.misi ?? null, g.target?.lokasi ?? null, g.target?.lat ?? null, g.target?.lon ?? null, g.rujukan ?? null, g.alasan ?? null, id)); }
  for (const s of h.status) st.push(P("INSERT INTO op_armada_status (tanggal, registrasi, status, alasan, sumber, diubah) VALUES (?1, ?2, ?3, ?4, 'wa', ?5) ON CONFLICT (tanggal, registrasi) DO UPDATE SET status = ?3, alasan = ?4, sumber = 'wa', diubah = ?5",
    tgl, s.registrasi, s.status, s.alasan ?? null, diterima));
  if (st.length) await env.DB.batch(st);
  return {tanggal: tgl, dikenali: h.dikenali, temuan: h.temuan.length, gerak: h.gerak.length, status: h.status.length, tertahan: h.tertahan.map(({alasan, lokasi}) => ({alasan, ...(lokasi ? {lokasi} : {})}))};
}

/* digabung ke RUTE di src/worker.js; nama jalur tanpa garis (gerbang cakupan) */
export const RUTE_OPERASI = Object.fromEntries(Object.entries({
  "GET /api/operasi/peta": peta,
  "POST /api/operasi/dummy": dummy,
}).map(([k, f]) => [k, bungkus(f)]));
