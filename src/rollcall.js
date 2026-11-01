/* Roll call radio harian (W4, migrasi 0096): satu sesi = tanggal + slot (pagi/siang/malam), peserta per kategori (BPBD Prov, BPBD Kab/Kota, komunitas) dengan hasil hadir/tidak/gangguan.
   Ketaatan = hadir / dipanggil per peserta per bulan (gangguan dihitung terpisah, bukan hadir). Semua rute /api/pusdalops/rollcall*: staf PERTAMA. */
import {json, gagal, acak, NO_JSON, HARI, cek, tolak, teks, tanggal, tglWIB, kodeProv, luarWilayah, kabKunci, pilih, idSah, persen, tabelBelum, bacaStaf, tulisStaf, dummyStaf, lajuTulis} from "./pusdalops_umum.js";

export const SLOT = ["pagi", "siang", "malam"], KATEGORI = ["bpbd_prov", "bpbd_kab", "komunitas"], HASIL = ["hadir", "tidak", "gangguan"];
const MAKS_PESERTA = 150, MAKS_RINGKAS = 2000, RE_BULAN = /^\d{4}-(0[1-9]|1[0-2])$/;

function periksa(o, kini) {
  if (!Array.isArray(o.peserta) || !o.peserta.length || o.peserta.length > MAKS_PESERTA) tolak(`peserta harus larik 1-${MAKS_PESERTA} isi`);
  const pakai = new Set(), peserta = o.peserta.map((x, i) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) tolak(`peserta[${i}] harus objek`);
    const kategori = pilih(x.kategori, KATEGORI, `peserta[${i}].kategori`), hasil = pilih(x.hasil, HASIL, `peserta[${i}].hasil`);
    let prov, kab = null, nama = null;
    if (kategori === "bpbd_prov") prov = kodeProv(x.prov ?? x.wilayah, `peserta[${i}].prov`);
    else if (kategori === "bpbd_kab") ({prov, kab} = kabKunci(x.kab ?? x.wilayah, `peserta[${i}].kab`));
    else { nama = teks(x.nama, `peserta[${i}].nama`, 60, 2); prov = kodeProv(x.prov, `peserta[${i}].prov`); if (x.kab != null) ({kab} = kabKunci(x.kab, `peserta[${i}].kab`)); }
    const k = [kategori, prov, kab, nama].join("|"); if (pakai.has(k)) tolak(`peserta[${i}] dobel: ${k}`); pakai.add(k);
    return {kategori, prov, kab, nama, hasil};
  });
  return {tgl: tanggal(o.tgl, "tgl", kini, {depan: 1, belakang: 400}), slot: pilih(o.slot, SLOT, "slot"), peserta};
}
async function buat(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => { const v = periksa(o, kini); if (v.tgl > tglWIB(kini)) tolak("tgl tidak boleh setelah hari ini (WIB)"); return v; }); if (p.r) return p.r;
    const lw = luarWilayah(req, [...new Set(p.v.peserta.map(x => x.prov))]); if (lw) return lw;
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const id = acak(8), v = p.v;
    try {
      await env.DB.batch([env.DB.prepare("INSERT INTO rollcall_sesi (id, tgl, slot, oleh, dibuat) VALUES (?, ?, ?, ?, ?)").bind(id, v.tgl, v.slot, oleh, kini),
        ...v.peserta.map(x => env.DB.prepare("INSERT INTO rollcall_peserta (sesi_id, kategori, prov, kab, nama, hasil) VALUES (?, ?, ?, ?, ?, ?)").bind(id, x.kategori, x.prov, x.kab, x.nama, x.hasil))]);
    } catch (e) { if (/UNIQUE constraint failed: rollcall_sesi/i.test(String(e?.message || e))) return gagal(409, `roll call ${v.tgl} ${v.slot} sudah tercatat`); throw e; }
    return json({sesi: {id, tgl: v.tgl, slot: v.slot, peserta: v.peserta.length}}, 201);
  });
}
const rentang = (bulan, kini) => {
  const b = bulan ?? tglWIB(kini).slice(0, 7); if (!RE_BULAN.test(b)) tolak("bulan harus YYYY-MM");
  const [y, m] = b.split("-").map(Number); return {bulan: b, dari: `${b}-01`, sampai: m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`};
};
async function daftar(env, req, url, kini) {
  return bacaStaf(env, req, async () => {
    const p = cek(() => rentang(url.searchParams.get("bulan"), kini)); if (p.r) return p.r;
    const r = (await env.DB.prepare(`SELECT s.id, s.tgl, s.slot, s.dummy, count(p.hasil) dipanggil, coalesce(sum(p.hasil = 'hadir'), 0) hadir, coalesce(sum(p.hasil = 'tidak'), 0) tidak, coalesce(sum(p.hasil = 'gangguan'), 0) gangguan
      FROM (SELECT id, tgl, slot, dummy FROM rollcall_sesi WHERE tgl >= ? AND tgl < ? ORDER BY tgl DESC, slot LIMIT 101) s LEFT JOIN rollcall_peserta p ON p.sesi_id = s.id GROUP BY s.id ORDER BY s.tgl DESC, s.slot`).bind(p.v.dari, p.v.sampai).all()).results;
    return json({bulan: p.v.bulan, terpotong: r.length > 100, sesi: r.slice(0, 100).map(x => ({...x, dummy: !!x.dummy}))}, 200, NO_JSON);
  });
}
async function rincian(env, req, id) {
  return bacaStaf(env, req, async () => {
    const s = await env.DB.prepare("SELECT id, tgl, slot, dibuat, dummy FROM rollcall_sesi WHERE id = ?").bind(id).first(); if (!s) return gagal(404, "roll call tidak ada");
    const r = (await env.DB.prepare("SELECT kategori, prov, kab, nama, hasil FROM rollcall_peserta WHERE sesi_id = ? ORDER BY kategori, prov, kab, nama").bind(id).all()).results;
    return json({sesi: {...s, dummy: !!s.dummy}, peserta: r}, 200, NO_JSON);
  });
}
/* per kategori dan per peserta (prov/kab/komunitas) dalam satu bulan */
async function ringkasan(env, req, url, kini) {
  return bacaStaf(env, req, async () => {
    const p = cek(() => rentang(url.searchParams.get("bulan"), kini)); if (p.r) return p.r;
    const bind = [p.v.dari, p.v.sampai], dari = "FROM rollcall_peserta p JOIN rollcall_sesi s ON s.id = p.sesi_id WHERE s.tgl >= ? AND s.tgl < ?", jum = "count(*) dipanggil, sum(p.hasil = 'hadir') hadir, sum(p.hasil = 'gangguan') gangguan, sum(p.hasil = 'tidak') tidak";
    const [sesi, kat, wil] = await Promise.all([env.DB.prepare("SELECT count(*) sesi, count(DISTINCT tgl) hari FROM rollcall_sesi WHERE tgl >= ? AND tgl < ?").bind(...bind).first(),
      env.DB.prepare(`SELECT p.kategori, ${jum} ${dari} GROUP BY p.kategori`).bind(...bind).all(), env.DB.prepare(`SELECT p.kategori, p.prov, p.kab, p.nama, ${jum} ${dari} GROUP BY p.kategori, p.prov, p.kab, p.nama ORDER BY p.kategori, p.prov, p.kab, p.nama LIMIT ${MAKS_RINGKAS + 1}`).bind(...bind).all()]);
    const tambah = x => ({...x, persen: persen(x.hadir, x.dipanggil)});
    return json({bulan: p.v.bulan, sesi: sesi.sesi, hari: sesi.hari, per_kategori: kat.results.map(tambah), terpotong: wil.results.length > MAKS_RINGKAS, per_peserta: wil.results.slice(0, MAKS_RINGKAS).map(tambah)}, 200, NO_JSON);
  });
}

async function dummy(env, req, kini) {
  return dummyStaf(env, req, async aksi => {
    if (aksi === "hapus") {
      const [, s] = await env.DB.batch([env.DB.prepare("DELETE FROM rollcall_peserta WHERE sesi_id IN (SELECT id FROM rollcall_sesi WHERE dummy = 1)"), env.DB.prepare("DELETE FROM rollcall_sesi WHERE dummy = 1")]);
      return json({ok: true, sesi: s.meta.changes});
    }
    if ((await env.DB.prepare("SELECT count(*) n FROM rollcall_sesi WHERE dummy = 1").first()).n) return gagal(409, "data dummy roll call sudah ada; hapus dulu lewat tombol Hapus data dummy (Super Admin)");
    const P = [["bpbd_prov", "11", null, null], ["bpbd_prov", "12", null, null], ["bpbd_prov", "13", null, null], ["bpbd_kab", "11", "Aceh Tamiang", null], ["bpbd_kab", "11", "Aceh Utara", null], ["bpbd_kab", "13", "Agam", null], ["komunitas", "11", null, "ORARI Aceh (dummy)"], ["komunitas", "13", null, "RAPI Sumbar (dummy)"]];
    const st = [], ada = new Set((await env.DB.prepare("SELECT tgl || slot k FROM rollcall_sesi").all()).results.map(x => x.k)); let n = 0;
    for (let h = 0; h < 6; h++) for (const slot of h % 2 ? ["pagi"] : ["pagi", "malam"]) {   // hari ini dan 5 hari ke belakang; tanggal+slot yang sudah punya data nyata dilewati
      if (ada.has(tglWIB(kini - h * HARI) + slot)) continue;
      const id = acak(8); n++;
      st.push(env.DB.prepare("INSERT INTO rollcall_sesi (id, tgl, slot, oleh, dibuat, dummy) VALUES (?, ?, ?, 'dummy', ?, 1)").bind(id, tglWIB(kini - h * HARI), slot, kini));
      P.forEach(([k, prov, kab, nama], i) => st.push(env.DB.prepare("INSERT INTO rollcall_peserta (sesi_id, kategori, prov, kab, nama, hasil) VALUES (?, ?, ?, ?, ?, ?)").bind(id, k, prov, kab, nama, (i + h + n) % 5 === 0 ? "tidak" : (i * 3 + h) % 7 === 0 ? "gangguan" : "hadir")));
    }
    await env.DB.batch(st);
    return json({ok: true, sesi: n}, 201);
  });
}

const T = tabelBelum;
export const RUTE_ROLLCALL = {
  "POST /api/pusdalops/rollcall": T((env, req, url, kini) => buat(env, req, kini)),
  "GET /api/pusdalops/rollcall": T((env, req, url, kini) => daftar(env, req, url, kini)),
  "GET /api/pusdalops/rollcall/ringkasan": T((env, req, url, kini) => ringkasan(env, req, url, kini)),
  "GET /api/pusdalops/rollcall/:id": T((env, req, url, kini, ctx, id) => rincian(env, req, id)),
  "POST /api/pusdalops/rollcall/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
