/* Tracker pemulihan pascabencana (W2, migrasi 0096): huntara, huntap, dana tunggu hunian, jembatan gantung, sumur bor per kab/desa, dengan riwayat progres.
   Semua rute /api/pusdalops/pemulihan*: staf (pusdalops|koordalops|pimpinan) PERTAMA. Id 16 hex di akhir jalur dibaca router worker.js; aksi pada id membawa id di body. */
import {json, gagal, acak, NO_JSON, cek, tolak, teks, teksOpsi, tanggal, tglWIB, kabKunci, kodeProv, luarWilayah, koordinat, angka, pilih, idSah, persen, tabelBelum, bacaStaf, tulisStaf, dummyStaf, lajuTulis} from "./pusdalops_umum.js";

export const JENIS_PEMULIHAN = ["huntara", "huntap", "dana_tunggu_hunian", "jembatan_gantung", "sumur_bor", "lainnya"];
export const STATUS_PEMULIHAN = ["rencana", "berjalan", "selesai", "terhenti"];
const MAKS_ANGKA = 1e7, MAKS_DAFTAR = 500, MAKS_RINGKAS = 1000;
const KOL = "id, jenis, prov, kab, desa, lat, lon, target, realisasi, satuan, pelaksana, sumber_dana, status, mulai, selesai, kejadian_id, catatan, dibuat, diubah, dummy";
const keluar = r => ({...r, dummy: !!r.dummy});

function periksaBaru(o, kini) {
  const {prov, kab} = kabKunci(o.kab_kode ?? o.kab), k = koordinat(o), target = angka(o.target, "target", MAKS_ANGKA), real = angka(o.realisasi ?? 0, "realisasi", MAKS_ANGKA);
  if (real > target && o.yakin !== true) tolak("realisasi melebihi target; periksa lagi atau kirim yakin: true");
  const v = {jenis: pilih(o.jenis, JENIS_PEMULIHAN, "jenis"), prov, kab, desa: teksOpsi(o.desa, "desa", 60, 2), ...k, target, realisasi: real, satuan: teks(o.satuan, "satuan", 20, 1),
    pelaksana: teksOpsi(o.pelaksana, "pelaksana", 80, 2), sumber_dana: teksOpsi(o.sumber_dana, "sumber_dana", 80, 2), status: pilih(o.status ?? "rencana", STATUS_PEMULIHAN, "status"),
    mulai: o.mulai == null ? null : tanggal(o.mulai, "mulai", kini, {depan: 365, belakang: 1500}), selesai: o.selesai == null ? null : tanggal(o.selesai, "selesai", kini, {depan: 1500, belakang: 1500}),
    kejadian_id: o.kejadian_id ?? null, catatan: teks(o.catatan, "catatan", 500)};
  if (v.mulai && v.selesai && v.selesai < v.mulai) tolak("selesai tidak boleh sebelum mulai");
  if (v.kejadian_id !== null && !idSah(v.kejadian_id)) tolak("kejadian_id harus id kejadian logbook (16 heks)");
  return v;
}
async function buat(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => periksaBaru(o, kini)); if (p.r) return p.r;
    const v = p.v, lw = luarWilayah(req, [v.prov]); if (lw) return lw;
    if (v.kejadian_id && !await env.DB.prepare("SELECT 1 x FROM logbook_kejadian WHERE id = ?").bind(v.kejadian_id).first()) return gagal(404, "kejadian logbook tidak ada");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const id = acak(8), t = tglWIB(kini);
    await env.DB.batch([env.DB.prepare(`INSERT INTO pemulihan (id, jenis, prov, kab, desa, lat, lon, target, realisasi, satuan, pelaksana, sumber_dana, status, mulai, selesai, kejadian_id, catatan, oleh, dibuat, diubah) VALUES (${Array(20).fill("?")})`)
      .bind(id, v.jenis, v.prov, v.kab, v.desa, v.lat, v.lon, v.target, v.realisasi, v.satuan, v.pelaksana, v.sumber_dana, v.status, v.mulai, v.selesai, v.kejadian_id, v.catatan, oleh, kini, kini),
      env.DB.prepare("INSERT INTO pemulihan_progres (id, pemulihan_id, tgl, realisasi, status, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, 'catatan awal', ?, ?)").bind(acak(8), id, t, v.realisasi, v.status, oleh, kini)]);
    return json({pemulihan: keluar(await env.DB.prepare(`SELECT ${KOL} FROM pemulihan WHERE id = ?`).bind(id).first())}, 201);
  });
}
async function progres(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    if (!idSah(o.id)) return gagal(400, "id harus id pemulihan (16 heks)");
    const p = cek(() => ({real: angka(o.realisasi, "realisasi", MAKS_ANGKA), status: o.status == null ? null : pilih(o.status, STATUS_PEMULIHAN, "status"), tgl: o.tgl == null ? tglWIB(kini) : tanggal(o.tgl, "tgl", kini, {depan: 1, belakang: 400}), catatan: teks(o.catatan, "catatan", 500)}));
    if (p.r) return p.r;
    const it = await env.DB.prepare("SELECT prov, target, status, selesai FROM pemulihan WHERE id = ?").bind(o.id).first(); if (!it) return gagal(404, "pemulihan tidak ada");
    const lw = luarWilayah(req, [it.prov]); if (lw) return lw;
    const {real, tgl, catatan} = p.v, st = p.v.status ?? it.status;
    if (real > it.target && o.yakin !== true) return gagal(400, "realisasi melebihi target; periksa lagi atau kirim yakin: true");
    if ((await env.DB.prepare("SELECT count(*) n FROM pemulihan_progres WHERE pemulihan_id = ?").bind(o.id).first()).n >= 400) return gagal(409, "riwayat progres penuh (400 entri)");
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const pid = acak(8);
    await env.DB.batch([env.DB.prepare("INSERT INTO pemulihan_progres (id, pemulihan_id, tgl, realisasi, status, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(pid, o.id, tgl, real, st, catatan, oleh, kini),
      env.DB.prepare("UPDATE pemulihan SET realisasi = ?, status = ?, selesai = CASE WHEN ? = 'selesai' AND selesai IS NULL AND (mulai IS NULL OR mulai <= ?) THEN ? ELSE selesai END, diubah = ? WHERE id = ?").bind(real, st, st, tgl, tgl, kini, o.id)]);
    return json({pemulihan: keluar(await env.DB.prepare(`SELECT ${KOL} FROM pemulihan WHERE id = ?`).bind(o.id).first()), progres: await env.DB.prepare("SELECT id, tgl, realisasi, status, catatan, dibuat FROM pemulihan_progres WHERE id = ?").bind(pid).first()}, 201);
  });
}
async function daftar(env, req, url) {
  return bacaStaf(env, req, async () => {
    const q = url.searchParams, w = [], b = [];
    const p = cek(() => {
      const kab = q.get("kab"); if (kab) { const k = kabKunci(kab); w.push("prov = ? AND kab = ?"); b.push(k.prov, k.kab); } else if (q.get("prov")) { w.push("prov = ?"); b.push(kodeProv(q.get("prov"))); }
      if (q.get("jenis")) { w.push("jenis = ?"); b.push(pilih(q.get("jenis"), JENIS_PEMULIHAN, "jenis")); }
      if (q.get("status")) { w.push("status = ?"); b.push(pilih(q.get("status"), STATUS_PEMULIHAN, "status")); }
    });
    if (p.r) return p.r;
    const r = (await env.DB.prepare(`SELECT ${KOL} FROM pemulihan ${w.length ? "WHERE " + w.join(" AND ") : ""} ORDER BY diubah DESC LIMIT ${MAKS_DAFTAR + 1}`).bind(...b).all()).results;
    return json({terpotong: r.length > MAKS_DAFTAR, pemulihan: r.slice(0, MAKS_DAFTAR).map(keluar)}, 200, NO_JSON);
  });
}
async function rincian(env, req, id) {
  return bacaStaf(env, req, async () => {
    const it = await env.DB.prepare(`SELECT ${KOL} FROM pemulihan WHERE id = ?`).bind(id).first(); if (!it) return gagal(404, "pemulihan tidak ada");
    const rw = (await env.DB.prepare("SELECT id, tgl, realisasi, status, catatan, dibuat FROM pemulihan_progres WHERE pemulihan_id = ? ORDER BY tgl, dibuat").bind(id).all()).results;
    return json({pemulihan: keluar(it), progres: rw}, 200, NO_JSON);
  });
}
/* per kab/jenis/satuan (satuan tak dicampur): jumlah item, target, realisasi, persen, hitung per status, jumlah ber-koordinat */
async function ringkasan(env, req, url) {
  return bacaStaf(env, req, async () => {
    const pv = url.searchParams.get("prov"); if (pv && !/^\d{2}$/.test(pv)) return gagal(400, "prov harus 2 angka");
    const r = (await env.DB.prepare(`SELECT prov, kab, jenis, satuan, count(*) item, sum(target) target, sum(realisasi) realisasi, sum(status = 'rencana') rencana, sum(status = 'berjalan') berjalan, sum(status = 'selesai') selesai, sum(status = 'terhenti') terhenti, sum(lat IS NOT NULL) berkoordinat
      FROM pemulihan ${pv ? "WHERE prov = ?" : ""} GROUP BY prov, kab, jenis, satuan ORDER BY prov, kab, jenis LIMIT ${MAKS_RINGKAS}`).bind(...pv ? [pv] : []).all()).results;
    return json({ringkasan: r.map(x => ({...x, persen: persen(x.realisasi, x.target)}))}, 200, NO_JSON);
  });
}

const CONTOH = [   // [jenis, kab, desa, lat, lon, target, realisasi, satuan, pelaksana, sumber_dana, status, [[hari lalu, realisasi, status, catatan]]]
  ["huntara", "11|Aceh Tamiang", "Kampung Dalam", 4.25, 98.05, 120, 90, "unit", "PT Contoh Bangun (dummy)", "APBN BNPB", "berjalan", [[20, 30, "berjalan", "pondasi selesai"], [5, 90, "berjalan", "dinding terpasang"]]],
  ["huntara", "11|Aceh Tamiang", "Sekerak", null, null, 80, 80, "unit", "PT Contoh Karya (dummy)", "Swasta (CSR)", "selesai", [[30, 40, "berjalan", ""], [3, 80, "selesai", "serah terima"]]],
  ["huntap", "11|Aceh Tamiang", "Bundar", 4.3, 98.0, 200, 0, "unit", "Kementerian PUPR (dummy)", "APBN", "rencana", []],
  ["dana_tunggu_hunian", "11|Aceh Utara", "Lhoksukon", null, null, 500, 310, "KK", "Bank Contoh (dummy)", "APBN BNPB", "berjalan", [[10, 310, "berjalan", "tahap 1 tersalur"]]],
  ["jembatan_gantung", "13|Agam", "Maninjau", -0.35, 100.2, 2, 0, "unit", "TNI AD Zeni (dummy)", "APBN", "terhenti", [[7, 0, "terhenti", "menunggu material"]]],
  ["sumur_bor", "12|Tapanuli Tengah", "Pandan", 1.7, 98.8, 15, 6, "titik", "Dinas PU (dummy)", "APBD", "berjalan", [[4, 6, "berjalan", ""]]]];
async function dummy(env, req, kini) {
  return dummyStaf(env, req, async aksi => {
    if (aksi === "hapus") {
      const [, p] = await env.DB.batch([env.DB.prepare("DELETE FROM pemulihan_progres WHERE pemulihan_id IN (SELECT id FROM pemulihan WHERE dummy = 1)"), env.DB.prepare("DELETE FROM pemulihan WHERE dummy = 1")]);
      return json({ok: true, pemulihan: p.meta.changes});
    }
    if ((await env.DB.prepare("SELECT count(*) n FROM pemulihan WHERE dummy = 1").first()).n) return gagal(409, "data dummy pemulihan sudah ada; hapus dulu lewat tombol Hapus data dummy (Super Admin)");
    const st = [], hari = 864e5;
    for (const [jenis, kunci, desa, lat, lon, target, real, satuan, pel, dana, status, rw] of CONTOH) {
      const [prov, kab] = kunci.split("|"), id = acak(8);
      st.push(env.DB.prepare(`INSERT INTO pemulihan (id, jenis, prov, kab, desa, lat, lon, target, realisasi, satuan, pelaksana, sumber_dana, status, mulai, catatan, oleh, dibuat, diubah, dummy) VALUES (${Array(18).fill("?")}, 1)`)
        .bind(id, jenis, prov, kab, desa, lat, lon, target, real, satuan, pel, dana, status, new Date(kini - 40 * hari).toISOString().slice(0, 10), "Data dummy untuk menilai layar", "dummy", kini, kini));
      for (const [lalu, r, s, c] of rw) st.push(env.DB.prepare("INSERT INTO pemulihan_progres (id, pemulihan_id, tgl, realisasi, status, catatan, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, 'dummy', ?)").bind(acak(8), id, new Date(kini - lalu * hari).toISOString().slice(0, 10), r, s, c || null, kini));
    }
    await env.DB.batch(st);
    return json({ok: true, pemulihan: CONTOH.length}, 201);
  });
}

const T = tabelBelum;
export const RUTE_PEMULIHAN = {
  "POST /api/pusdalops/pemulihan": T((env, req, url, kini) => buat(env, req, kini)),
  "POST /api/pusdalops/pemulihan/progres": T((env, req, url, kini) => progres(env, req, kini)),
  "GET /api/pusdalops/pemulihan": T((env, req, url) => daftar(env, req, url)),
  "GET /api/pusdalops/pemulihan/ringkasan": T((env, req, url) => ringkasan(env, req, url)),
  "GET /api/pusdalops/pemulihan/:id": T((env, req, url, kini, ctx, id) => rincian(env, req, id)),
  "POST /api/pusdalops/pemulihan/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
