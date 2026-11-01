/* Laporan Khusus operasi besar (W3, migrasi 0096): induk operasi > provinsi > tim pendamping > kejadian logbook; entri harian per kab berisi kebutuhan mendesak berjumlah,
   4 indikator layanan dasar (bbm, sinyal, listrik, air) dan waktu_data. Data lebih tua dari 24 jam dari waktu baca = basi (penanda, bukan penolakan).
   Semua rute /api/pusdalops/lapsus*: staf PERTAMA. Aksi pada operasi membawa operasi_id di body (router worker.js hanya mengenali id di akhir jalur). */
import {periksaJuklak, JENIS} from "./logbook.js";
import {json, gagal, acak, NO_JSON, HARI, MENIT, cek, tolak, teks, tanggal, tglWIB, kodeProv, luarWilayah, kabKunci, pilih, idSah, tabelBelum, bacaStaf, tulisStaf, dummyStaf, lajuTulis} from "./pusdalops_umum.js";
import {PROV} from "./alun.js";
import {RE_HP2} from "./logbook.js";

export const LAYANAN = ["bbm", "sinyal", "listrik", "air"], KONDISI = ["normal", "terganggu", "padam"], BASI_MS = 24 * 36e5;
const MAKS_PROV = 40, MAKS_TIM = 300, MAKS_KEJ = 500, MAKS_ENTRI = 5000;
const keluarOp = r => ({...r, dummy: !!r.dummy});
const keluarEntri = (r, kini) => ({id: r.id, prov: r.prov, kab: r.kab, waktu_data: r.waktu_data, basi: kini - r.waktu_data > BASI_MS, umur_jam: Math.max(0, Math.floor((kini - r.waktu_data) / 36e5)),
  kebutuhan: r.kebutuhan ? JSON.parse(r.kebutuhan) : null, layanan: r.layanan ? JSON.parse(r.layanan) : null, catatan: r.catatan, dibuat: r.dibuat});

async function operasi(env, id, { terbuka = true } = {}) {
  if (!idSah(id)) return {r: gagal(400, "operasi_id harus id operasi (16 heks)")};
  const op = await env.DB.prepare("SELECT id, nama, jenis, mulai, status, dibuat, diubah, dummy FROM lapsus_operasi WHERE id = ?").bind(id).first();
  if (!op) return {r: gagal(404, "operasi tidak ada")};
  if (terbuka && op.status !== "aktif") return {r: gagal(409, "operasi sudah selesai; buka lagi lewat /status")};
  return {op};
}
const provTerdaftar = async (env, op, prov) => (await env.DB.prepare("SELECT 1 x FROM lapsus_prov WHERE operasi_id = ? AND prov = ?").bind(op, prov).first()) ? null : gagal(400, `provinsi ${prov} belum ditambahkan ke operasi ini`);
const hitung = async (env, t, op) => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE operasi_id = ?`).bind(op).first()).n;

async function buat(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => {
      const provs = o.provinsi == null ? [] : Array.isArray(o.provinsi) && o.provinsi.length <= MAKS_PROV ? o.provinsi.map(x => kodeProv(x, "provinsi[]")) : tolak(`provinsi harus larik maksimal ${MAKS_PROV} kode`);
      if (new Set(provs).size !== provs.length) tolak("provinsi dobel");
      return {nama: teks(o.nama, "nama", 120, 3), jenis: pilih(o.jenis, JENIS, "jenis"), mulai: tanggal(o.mulai, "mulai", kini, {depan: 1, belakang: 400}), provs};
    });
    if (p.r) return p.r;
    const lw = luarWilayah(req, p.v.provs); if (lw) return lw;
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const id = acak(8), v = p.v;
    await env.DB.batch([env.DB.prepare("INSERT INTO lapsus_operasi (id, nama, jenis, mulai, status, oleh, dibuat, diubah) VALUES (?, ?, ?, ?, 'aktif', ?, ?, ?)").bind(id, v.nama, v.jenis, v.mulai, oleh, kini, kini),
      ...v.provs.map(x => env.DB.prepare("INSERT INTO lapsus_prov (operasi_id, prov) VALUES (?, ?)").bind(id, x))]);
    return json({operasi: {id, nama: v.nama, jenis: v.jenis, mulai: v.mulai, status: "aktif", provinsi: v.provs}}, 201);
  });
}
async function tambahProv(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => kodeProv(o.prov)); if (p.r) return p.r;
    const lw = luarWilayah(req, [p.v]); if (lw) return lw;
    const {op, r} = await operasi(env, o.operasi_id); if (r) return r;
    if (await hitung(env, "lapsus_prov", op.id) >= MAKS_PROV) return gagal(409, "provinsi penuh");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const x = await env.DB.prepare("INSERT OR IGNORE INTO lapsus_prov (operasi_id, prov) VALUES (?, ?)").bind(op.id, p.v).run();
    return json({ok: true, prov: p.v, baru: !!x.meta.changes}, x.meta.changes ? 201 : 200);
  });
}
async function tambahTim(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => ({prov: kodeProv(o.prov), nama: teks(o.nama, "nama", 80, 2)})); if (p.r) return p.r;
    const lw = luarWilayah(req, [p.v.prov]); if (lw) return lw;
    const {op, r} = await operasi(env, o.operasi_id); if (r) return r;
    const t = await provTerdaftar(env, op.id, p.v.prov); if (t) return t;
    if (await hitung(env, "lapsus_tim", op.id) >= MAKS_TIM) return gagal(409, "tim penuh");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const id = acak(8);
    try { await env.DB.prepare("INSERT INTO lapsus_tim (id, operasi_id, prov, nama, dibuat) VALUES (?, ?, ?, ?, ?)").bind(id, op.id, p.v.prov, p.v.nama, kini).run(); }
    catch (e) { if (/UNIQUE constraint failed/i.test(String(e?.message || e))) return gagal(409, "tim itu sudah tercatat di provinsi ini"); throw e; }
    return json({tim: {id, prov: p.v.prov, nama: p.v.nama}}, 201);
  });
}
async function tautKejadian(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    if (!idSah(o.kejadian_id) || (o.tim_id != null && !idSah(o.tim_id))) return gagal(400, "kejadian_id dan tim_id harus id 16 heks");
    const {op, r} = await operasi(env, o.operasi_id); if (r) return r;
    const k = await env.DB.prepare("SELECT prov FROM logbook_kejadian WHERE id = ?").bind(o.kejadian_id).first(); if (!k) return gagal(404, "kejadian logbook tidak ada");
    const lw = luarWilayah(req, [k.prov]); if (lw) return lw;
    const t = await provTerdaftar(env, op.id, k.prov); if (t) return t;
    if (o.tim_id != null && !await env.DB.prepare("SELECT 1 x FROM lapsus_tim WHERE id = ? AND operasi_id = ? AND prov = ?").bind(o.tim_id, op.id, k.prov).first()) return gagal(400, "tim_id bukan tim operasi ini di provinsi kejadian");
    if (await hitung(env, "lapsus_kejadian", op.id) >= MAKS_KEJ) return gagal(409, "kejadian penuh");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    await env.DB.prepare("INSERT INTO lapsus_kejadian (operasi_id, kejadian_id, prov, tim_id, dibuat) VALUES (?, ?, ?, ?, ?) ON CONFLICT (operasi_id, kejadian_id) DO UPDATE SET tim_id = excluded.tim_id").bind(op.id, o.kejadian_id, k.prov, o.tim_id ?? null, kini).run();
    return json({ok: true, kejadian_id: o.kejadian_id, prov: k.prov, tim_id: o.tim_id ?? null}, 201);
  });
}
function periksaEntri(o, kini) {
  const {prov, kab} = kabKunci(o.kab_kode ?? o.kab);
  let w = kini; if (o.waktu_data != null) { w = typeof o.waktu_data === "number" ? o.waktu_data : Date.parse(o.waktu_data); if (!Number.isFinite(w) || w > kini + 5 * MENIT || w < kini - 60 * HARI) tolak("waktu_data harus epoch ms atau ISO, tidak lebih dari 5 menit ke depan dan 60 hari ke belakang"); w = Math.round(w); }
  let kebutuhan = null, layanan = null;
  if (o.kebutuhan != null) {
    const j = periksaJuklak({kebutuhan_rinci: o.kebutuhan, yakin: o.yakin}); if (j.galat) tolak("kebutuhan: " + j.galat);
    kebutuhan = j.j.kebutuhan_rinci; if (kebutuhan?.some(x => RE_HP2.test((x.barang + " " + x.satuan).normalize("NFKC")) || (x.barang + x.satuan).normalize("NFKC").includes("@"))) tolak("kebutuhan tidak boleh memuat nomor telepon atau surel");
  }
  if (o.layanan != null) {
    if (typeof o.layanan !== "object" || Array.isArray(o.layanan)) tolak("layanan harus objek");
    layanan = {};
    for (const [k, v] of Object.entries(o.layanan)) {
      if (!LAYANAN.includes(k)) tolak(`layanan.${k} tidak dikenal; pilih: ${LAYANAN.join(", ")}`);
      if (!v || typeof v !== "object" || Array.isArray(v)) tolak(`layanan.${k} harus objek {status, catatan?}`);
      layanan[k] = {status: pilih(v.status, KONDISI, `layanan.${k}.status`), catatan: teks(v.catatan, `layanan.${k}.catatan`, 80)};
    }
    if (!Object.keys(layanan).length) layanan = null;
  }
  if (!kebutuhan && !layanan) tolak("entri harus memuat kebutuhan atau layanan");
  return {prov, kab, waktu_data: w, kebutuhan, layanan, catatan: teks(o.catatan, "catatan", 500)};
}
async function entri(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => periksaEntri(o, kini)); if (p.r) return p.r;
    const lw = luarWilayah(req, [p.v.prov]); if (lw) return lw;
    const {op, r} = await operasi(env, o.operasi_id); if (r) return r;
    const t = await provTerdaftar(env, op.id, p.v.prov); if (t) return t;
    if (await hitung(env, "lapsus_entri", op.id) >= MAKS_ENTRI) return gagal(409, "entri operasi penuh");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const v = p.v, id = acak(8);
    await env.DB.prepare("INSERT INTO lapsus_entri (id, operasi_id, prov, kab, waktu_data, kebutuhan, layanan, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, op.id, v.prov, v.kab, v.waktu_data, v.kebutuhan && JSON.stringify(v.kebutuhan), v.layanan && JSON.stringify(v.layanan), v.catatan, oleh, kini).run();
    await env.DB.prepare("UPDATE lapsus_operasi SET diubah = ? WHERE id = ?").bind(kini, op.id).run();
    return json({entri: keluarEntri({id, ...v, kebutuhan: v.kebutuhan && JSON.stringify(v.kebutuhan), layanan: v.layanan && JSON.stringify(v.layanan), dibuat: kini}, kini)}, 201);
  });
}
async function ubahStatus(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => pilih(o.status, ["aktif", "selesai"], "status")); if (p.r) return p.r;
    const {op, r} = await operasi(env, o.operasi_id, {terbuka: false}); if (r) return r;
    const pv = (await env.DB.prepare("SELECT prov FROM lapsus_prov WHERE operasi_id = ?").bind(op.id).all()).results.map(x => x.prov), lw = luarWilayah(req, pv); if (lw) return lw;
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    await env.DB.prepare("UPDATE lapsus_operasi SET status = ?, diubah = ? WHERE id = ?").bind(p.v, kini, op.id).run();
    return json({ok: true, id: op.id, status: p.v});
  });
}
async function daftar(env, req) {
  return bacaStaf(env, req, async () => {
    const r = (await env.DB.prepare("SELECT o.id, o.nama, o.jenis, o.mulai, o.status, o.diubah, o.dummy, (SELECT count(*) FROM lapsus_prov p WHERE p.operasi_id = o.id) jumlah_prov, (SELECT count(*) FROM lapsus_entri e WHERE e.operasi_id = o.id) jumlah_entri FROM lapsus_operasi o ORDER BY (o.status = 'aktif') DESC, o.diubah DESC LIMIT 101").all()).results;
    return json({terpotong: r.length > 100, operasi: r.slice(0, 100).map(keluarOp)}, 200, NO_JSON);
  });
}
async function rincian(env, req, kini, id) {
  return bacaStaf(env, req, async () => {
    const {op, r} = await operasi(env, id, {terbuka: false}); if (r) return r;
    const [provs, tim, kej, ent] = await Promise.all([env.DB.prepare("SELECT prov FROM lapsus_prov WHERE operasi_id = ? ORDER BY prov").bind(id).all(), env.DB.prepare("SELECT id, prov, nama FROM lapsus_tim WHERE operasi_id = ? ORDER BY prov, nama").bind(id).all(),
      env.DB.prepare("SELECT l.kejadian_id, l.prov, l.tim_id, k.jenis, k.kab, k.status FROM lapsus_kejadian l LEFT JOIN logbook_kejadian k ON k.id = l.kejadian_id WHERE l.operasi_id = ? ORDER BY l.prov, k.kab").bind(id).all(),
      env.DB.prepare(`SELECT e.id, e.prov, e.kab, e.waktu_data, e.kebutuhan, e.layanan, e.catatan, e.dibuat FROM lapsus_entri e WHERE e.operasi_id = ? AND e.rowid = (SELECT x.rowid FROM lapsus_entri x WHERE x.operasi_id = e.operasi_id AND x.prov = e.prov AND x.kab = e.kab ORDER BY x.waktu_data DESC, x.rowid DESC LIMIT 1) ORDER BY e.prov, e.kab LIMIT 601`).bind(id).all()]);
    const terpotong = ent.results.length > 600, terkini = ent.results.slice(0, 600).map(x => keluarEntri(x, kini));
    return json({terpotong, operasi: keluarOp(op), basi_jam: BASI_MS / 36e5, jumlah_basi: terkini.filter(x => x.basi).length,
      provinsi: provs.results.map(({prov}) => ({prov, nama: PROV[prov], tim: tim.results.filter(x => x.prov === prov).map(({id, nama}) => ({id, nama})), kejadian: kej.results.filter(x => x.prov === prov), kab: terkini.filter(x => x.prov === prov)}))}, 200, NO_JSON);
  });
}

const KEB = (barang, jumlah, satuan, kelompok = "logistik") => ({kelompok, barang, jumlah, satuan});
async function dummy(env, req, kini) {
  return dummyStaf(env, req, async aksi => {
    if (aksi === "hapus") {
      const [, , , , o] = await env.DB.batch([env.DB.prepare("DELETE FROM lapsus_entri WHERE operasi_id IN (SELECT id FROM lapsus_operasi WHERE dummy = 1)"), env.DB.prepare("DELETE FROM lapsus_kejadian WHERE operasi_id IN (SELECT id FROM lapsus_operasi WHERE dummy = 1)"),
        env.DB.prepare("DELETE FROM lapsus_tim WHERE operasi_id IN (SELECT id FROM lapsus_operasi WHERE dummy = 1)"), env.DB.prepare("DELETE FROM lapsus_prov WHERE operasi_id IN (SELECT id FROM lapsus_operasi WHERE dummy = 1)"), env.DB.prepare("DELETE FROM lapsus_operasi WHERE dummy = 1")]);
      return json({ok: true, operasi: o.meta.changes});
    }
    if ((await env.DB.prepare("SELECT count(*) n FROM lapsus_operasi WHERE dummy = 1").first()).n) return gagal(409, "data dummy laporan khusus sudah ada; hapus dulu lewat tombol Hapus data dummy (Super Admin)");
    const id = acak(8), j = kini - 36e5, st = [];
    const kej = await env.DB.prepare("SELECT id, prov FROM logbook_kejadian WHERE dummy = 1 LIMIT 1").first().catch(() => null);
    st.push(env.DB.prepare("INSERT INTO lapsus_operasi (id, nama, jenis, mulai, status, oleh, dibuat, diubah, dummy) VALUES (?, ?, 'banjir', ?, 'aktif', 'dummy', ?, ?, 1)").bind(id, "Operasi Banjir Sumatera (dummy)", tglWIB(kini - 20 * HARI), kini, kini));
    const tim = {};   // prov -> id tim pertama
    for (const prov of ["11", "12", "13"]) st.push(env.DB.prepare("INSERT INTO lapsus_prov (operasi_id, prov) VALUES (?, ?)").bind(id, prov));
    for (const [prov, nama] of [["11", "Tim A BNPB (dummy)"], ["11", "Tim B Kemensos (dummy)"], ["12", "Tim C BNPB (dummy)"], ["13", "Tim D TNI (dummy)"]]) {
      const tid = acak(8); tim[prov] ??= tid;
      st.push(env.DB.prepare("INSERT INTO lapsus_tim (id, operasi_id, prov, nama, dibuat) VALUES (?, ?, ?, ?, ?)").bind(tid, id, prov, nama, kini));
    }
    if (kej && tim[kej.prov]) st.push(env.DB.prepare("INSERT INTO lapsus_kejadian (operasi_id, kejadian_id, prov, tim_id, dibuat) VALUES (?, ?, ?, ?, ?)").bind(id, kej.id, kej.prov, tim[kej.prov], kini));
    const E = (prov, kab, waktu, kebutuhan, layanan, catatan) => st.push(env.DB.prepare("INSERT INTO lapsus_entri (id, operasi_id, prov, kab, waktu_data, kebutuhan, layanan, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'dummy', ?)")
      .bind(acak(8), id, prov, kab, waktu, kebutuhan && JSON.stringify(kebutuhan), layanan && JSON.stringify(layanan), catatan, kini));
    E("11", "Aceh Tamiang", j, [KEB("Sekop", 2400, "buah", "peralatan"), KEB("Backhoe", 10, "unit", "peralatan"), KEB("Terpal", 3000, "lembar")], {bbm: {status: "terganggu", catatan: "antrean SPBU"}, sinyal: {status: "padam"}, listrik: {status: "terganggu"}, air: {status: "normal"}}, "Data dummy untuk menilai layar");
    E("11", "Aceh Utara", kini - 4 * HARI, [KEB("Tenda keluarga", 500, "unit")], {bbm: {status: "normal"}, sinyal: {status: "normal"}, listrik: {status: "normal"}, air: {status: "terganggu", catatan: "air keruh"}}, "Dummy basi: data 4 hari lalu");
    E("12", "Tapanuli Tengah", kini - 2 * 36e5, [KEB("Beras", 8, "ton"), KEB("Dana siap pakai", 500, "juta rupiah", "dana")], {listrik: {status: "padam", catatan: "gardu rusak"}}, null);
    E("13", "Agam", kini - 30 * 36e5, null, {sinyal: {status: "terganggu"}, air: {status: "normal"}}, "Dummy basi: lebih dari 24 jam");
    await env.DB.batch(st);
    return json({ok: true, operasi: 1, entri: 4}, 201);
  });
}

const T = tabelBelum;
export const RUTE_LAPSUS = {
  "POST /api/pusdalops/lapsus": T((env, req, url, kini) => buat(env, req, kini)),
  "POST /api/pusdalops/lapsus/provinsi": T((env, req, url, kini) => tambahProv(env, req, kini)),
  "POST /api/pusdalops/lapsus/tim": T((env, req, url, kini) => tambahTim(env, req, kini)),
  "POST /api/pusdalops/lapsus/kejadian": T((env, req, url, kini) => tautKejadian(env, req, kini)),
  "POST /api/pusdalops/lapsus/entri": T((env, req, url, kini) => entri(env, req, kini)),
  "POST /api/pusdalops/lapsus/status": T((env, req, url, kini) => ubahStatus(env, req, kini)),
  "GET /api/pusdalops/lapsus": T((env, req) => daftar(env, req)),
  "GET /api/pusdalops/lapsus/:id": T((env, req, url, kini, ctx, id) => rincian(env, req, kini, id)),
  "POST /api/pusdalops/lapsus/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
