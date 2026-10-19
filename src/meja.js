/* Meja Kerja: satu mesin alur (formulir, status bertahap, rekap per wilayah) untuk kaji cepat, logistik, DSP, renkon, Destana + Rapor Kinerja BPBD.
   Spesifikasi per meja: src/meja_spek.js. Skema: migrations/0026_meja.sql. Rancangan: docs/bnpb/ARSITEKTUR.md.
   Akses: petugas BPBD berkode (header x-kode, per kabupaten + meja yang diizinkan) atau admin moderator ke atas (modOK). Dummy: Super Admin.
   ponytail: rekap, ringkas, dan rapor membaca semua catatan (maks 20.000 baris) lalu menghitung di JS; muat di Workers Free hanya untuk ribuan baris.
   Bila lebih: simpan agregat per kab (tabel ringkas) yang diperbarui saat tulis. */
import {json, gagal, acak, cacheTepi, bacaBody} from "./worker.js";
import {modOK, superOK, RE_PROV, tx, wib} from "./posko.js";
import {laju, kodeBaru, pemegangKode, halamanBnpbPublik} from "./bnpb.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import {MEJA, DAFTAR_MEJA, BENCANA, RAPOR, spekPublik, validasi, statusEfektif, tandaBahaya} from "./meja_spek.js";

const MENIT = 60e3, JAM = 60 * MENIT, HARI = 24 * JAM, MAKS_BARIS = 20000, LAJU_TULIS = [[JAM, 120]];

/* migrasi 0026 (atau 0022 untuk laju) belum jalan di produksi = 503, bukan 500 */
const aman = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "Meja Kerja belum diaktifkan (migrasi 0026 belum diterapkan)"); throw e; }
};
const tolak = () => gagal(403, "akses ditolak: butuh kode petugas atau token admin");

/* ---------------------------------------------------------------- pelaku */
const adminSaja = async (env, req) => { const m = await modOK(env, req); return m ? {admin: true, oleh: "admin:" + m} : tolak(); };
async function pelaku(env, req) {
  if (!req.headers.get("x-kode")) return adminSaja(env, req);
  const p = await pemegangKode(env, req, "meja", sha => env.DB.prepare("SELECT id, nama, prov, kab, meja FROM meja_petugas WHERE kode_sha = ? AND dicabut IS NULL").bind(sha).first());
  return p instanceof Response ? p : {petugas: {...p, meja: JSON.parse(p.meja)}, oleh: "petugas:" + p.id};
}
const semuaKunci = (o, boleh) => Object.keys(o).find(x => !boleh.includes(x));

/* ---------------------------------------------------------------- baris untuk klien */
function baris(r, kini, admin) {
  const M = MEJA[r.meja], data = JSON.parse(r.data), rec = {status: r.status, data, dibuat: r.dibuat};
  return {id: r.id, meja: r.meja, prov: r.prov, kab: r.kab, kec: r.kec, desa: r.desa, status: r.status, status_efektif: statusEfektif(r.meja, rec, kini),
    tanda: tandaBahaya(r.meja, rec, kini), data, dibuat: r.dibuat, diubah: r.diubah, dummy: r.dummy, ...(admin ? {oleh: r.oleh} : {}),
    aksi: Object.entries(M.transisi[r.status] || {}).map(([ke, peran]) => ({ke, peran, boleh: admin || peran === "petugas"})),
    bisa_ubah: !!M.turunan || r.status === M.awal};
}
const KOLOM = "id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, dummy";

/* ---------------------------------------------------------------- catatan */
async function daftar(env, req, url, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const meja = url.searchParams.get("meja"); if (!Object.hasOwn(MEJA, meja || "")) return gagal(400, `meja harus salah satu dari ${DAFTAR_MEJA.join(", ")}`);
  const w = ["meja = ?"], a = [meja], status = url.searchParams.get("status");
  if (p.petugas) {
    if (!p.petugas.meja.includes(meja)) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
    w.push("prov = ?", "kab = ?", "dummy = 0"); a.push(p.petugas.prov, p.petugas.kab);
  } else {
    const prov = url.searchParams.get("prov"), kab = tx(url.searchParams.get("kab"), 60);
    if (prov) { if (!RE_PROV.test(prov)) return gagal(400, "prov harus 2 digit"); w.push("prov = ?"); a.push(prov); }
    if (kab) { w.push("kab = ?"); a.push(kab); }
  }
  const semua = (await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE ${w.join(" AND ")} ORDER BY diubah DESC LIMIT 2000`).bind(...a).all()).results.map(r => baris(r, kini, !p.petugas));
  const rows = status ? semua.filter(r => r.status_efektif === status || r.status === status) : semua;
  return json({meja, catatan: rows, status: MEJA[meja].turunan || MEJA[meja].status});
}
const wilayahTeks = (b, M) => {
  const kec = b.kec == null ? null : tx(b.kec, 60), desa = b.desa == null ? null : tx(b.desa, 80);
  if (kec === undefined || (kec != null && kec.length < 2)) return {galat: "kecamatan 2-60 huruf"};
  if (desa === undefined || (desa != null && desa.length < 2)) return {galat: "desa 2-80 huruf"};
  if (M.wilayah.desa && !desa) return {galat: `desa wajib untuk meja ${M.nama}`};
  if (M.wilayah.kec && !kec) return {galat: `kecamatan wajib untuk meja ${M.nama}`};
  return {kec, desa};
};
async function buat(env, req, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["meja", "prov", "kab", "kec", "desa", "data"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (!Object.hasOwn(MEJA, b.o.meja || "")) return gagal(400, `meja harus salah satu dari ${DAFTAR_MEJA.join(", ")}`);
  const M = MEJA[b.o.meja], kabB = b.o.kab == null ? null : tx(b.o.kab, 60);
  let prov, kab;
  if (p.petugas) {
    if (!p.petugas.meja.includes(M.id)) return gagal(403, "meja ini tidak diizinkan untuk kodemu");
    if ((b.o.prov != null && b.o.prov !== p.petugas.prov) || (kabB != null && kabB !== p.petugas.kab)) return gagal(403, "kamu hanya boleh mengisi untuk kabupatenmu sendiri");
    ({prov, kab} = p.petugas);
  } else {
    if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode 2 digit");
    if (!kabB || kabB.length < 2) return gagal(400, "kabupaten 2-60 huruf");
    prov = b.o.prov; kab = kabB;
  }
  const wl = wilayahTeks(b.o, M); if (wl.galat) return gagal(400, wl.galat);
  const v = validasi(M.id, b.o.data, null, kini); if (v.galat) return gagal(400, v.galat);
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  const id = acak(8);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, M.id, prov, kab, wl.kec, wl.desa, JSON.stringify(v.data), M.awal, kini, kini, p.oleh, p.petugas?.id ?? null),
    env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh) VALUES (?, NULL, ?, ?, ?)").bind(id, M.awal, kini, p.oleh),
  ]);
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, !p.petugas)}, 201);
}
/* petugas hanya melihat baris kabupaten + mejanya; selain itu dijawab 404 (tidak membocorkan bahwa id-nya ada) */
async function muatBaris(env, p, id) {
  const r = await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first();
  return r && (!p.petugas || (r.prov === p.petugas.prov && r.kab === p.petugas.kab && p.petugas.meja.includes(r.meja) && !r.dummy)) ? r : null;
}
async function rincian(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const r = await muatBaris(env, p, id); if (!r) return gagal(404, "catatan tidak ada");
  const jejak = (await env.DB.prepare("SELECT dari, ke, waktu, oleh, catatan FROM meja_jejak WHERE catatan_id = ? ORDER BY id").bind(id).all()).results;
  return json({catatan: baris(r, kini, !p.petugas), jejak: p.petugas ? jejak.map(({oleh, ...j}) => j) : jejak});
}
async function ubah(env, req, id, kini) {
  const p = await pelaku(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["aksi", "ke", "data", "kec", "desa", "catatan"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  if (b.o.aksi !== "status" && b.o.aksi !== "ubah") return gagal(400, "aksi harus status atau ubah");
  const r = await muatBaris(env, p, id); if (!r) return gagal(404, "catatan tidak ada");
  const M = MEJA[r.meja], lama = JSON.parse(r.data), cat = b.o.catatan == null ? null : tx(b.o.catatan, 200);
  if (cat === undefined) return gagal(400, "catatan maksimal 200 huruf");
  let ke = r.status, data, kec = r.kec, desa = r.desa;
  if (b.o.aksi === "status") {
    ke = b.o.ke;
    const peran = typeof ke === "string" && Object.hasOwn(M.transisi[r.status] || {}, ke) ? M.transisi[r.status][ke] : null;
    if (!peran) return gagal(409, `transisi ${r.status} ke ${String(ke).slice(0, 30)} tidak sah untuk meja ${M.nama}`);
    if (peran === "admin" && p.petugas) return gagal(403, `perpindahan ke ${ke} hanya boleh oleh admin`);
    const v = validasi(M.id, b.o.data ?? {}, ke, kini, lama); if (v.galat) return gagal(400, v.galat);
    data = {...lama, ...v.data};
  } else {
    if (!M.turunan && r.status !== M.awal) return gagal(409, `isi hanya bisa diubah selama status ${M.awal}; pakai perpindahan status`);
    const v = validasi(M.id, b.o.data ?? {}, null, kini); if (v.galat) return gagal(400, v.galat);
    const wl = wilayahTeks({kec: b.o.kec ?? r.kec, desa: b.o.desa ?? r.desa}, M); if (wl.galat) return gagal(400, wl.galat);
    data = v.data; ({kec, desa} = wl);
  }
  if (p.petugas) { const l = await laju(env, p.petugas.id, "meja.tulis", LAJU_TULIS, kini); if (l) return l; }
  /* UPDATE bersyarat status lama (dua penulis serentak: yang kedua 409); jejak hanya masuk bila UPDATE mengubah baris */
  const [u] = await env.DB.batch([
    env.DB.prepare("UPDATE meja_catatan SET status = ?, data = ?, kec = ?, desa = ?, diubah = ? WHERE id = ? AND status = ?").bind(ke, JSON.stringify(data), kec, desa, Math.max(kini, r.dibuat), id, r.status),
    env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan) SELECT ?, ?, ?, ?, ?, ? WHERE changes() > 0")
      .bind(id, r.status, ke, kini, p.oleh, b.o.aksi === "ubah" ? (cat || "isi diubah") : cat),
  ]);
  if (!u.meta.changes) return gagal(409, "status berubah di waktu yang sama; muat ulang lalu coba lagi");
  return json({catatan: baris(await env.DB.prepare(`SELECT ${KOLOM} FROM meja_catatan WHERE id = ?`).bind(id).first(), kini, !p.petugas)});
}

/* ---------------------------------------------------------------- agregat (rekap admin, ringkas publik, rapor) */
async function muatSemua(env, dummyIkut) {
  return (await env.DB.prepare(`SELECT meja, prov, kab, status, data, dibuat, diubah FROM meja_catatan ${dummyIkut ? "" : "WHERE dummy = 0"} LIMIT ${MAKS_BARIS}`).all()).results
    .map(r => ({...r, data: JSON.parse(r.data)}));
}
/* per = "prov" (publik) atau "kab"; hanya angka, tanpa nama orang */
function agregat(rows, kini, per) {
  const out = {};
  for (const r of rows) {
    const M = MEJA[r.meja], key = per === "prov" ? r.prov : r.prov + "|" + r.kab, a = ((out[r.meja] ??= {})[key] ??= {n: 0, status: {}, bahaya: 0, jumlah: {}, terbaru: 0});
    const se = statusEfektif(r.meja, r, kini);
    a.n++; a.status[se] = (a.status[se] || 0) + 1; if (tandaBahaya(r.meja, r, kini).length) a.bahaya++; a.terbaru = Math.max(a.terbaru, r.diubah);
    for (const c of M.rekap) a.jumlah[c] = (a.jumlah[c] || 0) + (r.data[c] || 0);
  }
  return out;
}
async function rekap(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const ikut = url.searchParams.get("dummy") === "1", rows = await muatSemua(env, ikut);
  const petugasKab = (await env.DB.prepare(`SELECT DISTINCT prov, kab FROM meja_petugas WHERE dicabut IS NULL ${ikut ? "" : "AND dummy = 0"}`).all()).results;
  const kabAda = new Set([...rows.map(r => r.prov + "|" + r.kab), ...petugasKab.map(r => r.prov + "|" + r.kab)]);
  /* kabupaten tanpa renkon berlaku (belum kedaluwarsa) per bencana; bencana yang dihitung = yang pernah muncul di renkon atau kaji cepat */
  const punya = new Set(rows.filter(r => r.meja === "renkon" && statusEfektif("renkon", r, kini) !== "kedaluwarsa").map(r => `${r.data.bencana}|${r.prov}|${r.kab}`));
  const bencana = BENCANA.filter(b => rows.some(r => (r.meja === "renkon" && r.data.bencana === b) || (r.meja === "kaji_cepat" && r.data.kejadian === b)));
  return json({kini, per_kab: agregat(rows, kini, "kab"), tanpa_renkon: Object.fromEntries(bencana.map(b => [b, [...kabAda].filter(k => !punya.has(`${b}|${k}`)).sort()]))});
}
/* publik: angka per provinsi. Dummy hanya untuk admin ?dummy=1 (tanpa cache). */
async function ringkas(env, req, url, kini, ctx) {
  const ambil = async ikut => json({dibuat: kini, meja: agregat(await muatSemua(env, ikut), kini, "prov")});
  if (url.searchParams.get("dummy") === "1" && await modOK(env, req)) return ambil(true);
  return cacheTepi(new Request(new URL("/api/meja/ringkas", url), {method: "GET"}), ctx, 120, () => ambil(false));
}

/* ---------------------------------------------------------------- rapor kinerja BPBD (indeks komposit, bobot sementara: RAPOR di meja_spek.js) */
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const bulat = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
export function skorRespons(menit, dipanggil, direspons) {
  if (!dipanggil) return null;
  if (!direspons) return 0;
  const {respons_terbaik_menit: a, respons_terburuk_menit: z} = RAPOR;
  return bulat(100 * Math.min(1, Math.max(0, (z - menit) / (z - a))));
}
export function gabungSkor(k) {
  let s = 0, b = 0, n = 0;
  for (const [nama, bobot] of Object.entries(RAPOR.bobot)) if (k[nama] != null) { s += bobot * k[nama]; b += bobot; n++; }
  return {skor: b ? bulat(s / b) : null, komponen_ada: n};
}
async function hitungRapor(env, kini, ikut, admin) {
  const dm = ikut ? "" : " AND dummy = 0", K = new Map();
  const kab = (prov, nama) => { const key = prov + "|" + nama; if (!K.has(key)) K.set(key, {prov, kab: nama, dipanggil: 0, direspons: [], regu: 0, aktif: 0, laporan: 0, meja: {}, petugas: []}); return K.get(key); };
  const [pg, rg, lp, pt] = await Promise.all([
    env.DB.prepare(`SELECT prov, kab, dipanggil_pada d, direspons_pada r FROM panggilan WHERE dipanggil_pada > ?${dm} LIMIT ${MAKS_BARIS}`).bind(kini - RAPOR.jendela_panggilan_hari * HARI).all(),
    env.DB.prepare(`SELECT prov, kab, count(*) n FROM regu WHERE dicabut IS NULL${dm} GROUP BY prov, kab`).all(),
    env.DB.prepare(`SELECT prov, kab, count(*) n, count(DISTINCT regu_id) aktif FROM lapangan WHERE dibuat > ?${dm} AND id NOT IN (SELECT lapangan_id FROM lapangan_tahan WHERE putusan = 'tahan') GROUP BY prov, kab`).bind(kini - RAPOR.jendela_regu_hari * HARI).all(),
    env.DB.prepare(`SELECT prov, kab, nama FROM meja_petugas WHERE dicabut IS NULL${dm}`).all(),
  ]);
  for (const r of pg.results) { const k = kab(r.prov, r.kab); k.dipanggil++; if (r.r != null) k.direspons.push((r.r - r.d) / MENIT); }
  for (const r of rg.results) kab(r.prov, r.kab).regu = r.n;
  for (const r of lp.results) { const k = kab(r.prov, r.kab); k.aktif = r.aktif; k.laporan = r.n; }
  for (const r of pt.results) kab(r.prov, r.kab).petugas.push(r.nama);
  for (const r of await muatSemua(env, ikut)) {
    const m = (kab(r.prov, r.kab).meja[r.meja] ??= {n: 0, bahaya: 0}); m.n++; if (tandaBahaya(r.meja, r, kini).length) m.bahaya++;
  }
  const hasil = [...K.values()].map(k => {
    const med = median(k.direspons), respons = skorRespons(med, k.dipanggil, k.direspons.length);
    const keaktifan = k.regu ? bulat(100 * Math.min(k.aktif, k.regu) / k.regu) : null;
    const mj = Object.fromEntries(DAFTAR_MEJA.filter(m => k.meja[m]).map(m => [m, {...k.meja[m], skor: bulat(100 * (k.meja[m].n - k.meja[m].bahaya) / k.meja[m].n)}]));
    const skorMeja = Object.values(mj).map(m => m.skor), kelengkapan = skorMeja.length ? bulat(skorMeja.reduce((a, b) => a + b, 0) / skorMeja.length) : null;
    const g = gabungSkor({respons, keaktifan, kelengkapan});
    return {prov: k.prov, kab: k.kab, respons: {dipanggil: k.dipanggil, direspons: k.direspons.length, median_menit: med == null ? null : bulat(med, 1), skor: respons},
      regu: {terdaftar: k.regu, aktif: Math.min(k.aktif, k.regu), laporan_7h: k.laporan, skor: keaktifan}, kelengkapan: {meja: mj, skor: kelengkapan},
      ...g, ...(admin ? {petugas: k.petugas} : {})};
  }).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1) || a.prov.localeCompare(b.prov) || a.kab.localeCompare(b.kab));
  const prov = {};
  for (const k of hasil) { const p = (prov[k.prov] ??= {prov: k.prov, n_kab: 0, n_dengan_skor: 0, jumlah: 0}); p.n_kab++; if (k.skor != null) { p.n_dengan_skor++; p.jumlah += k.skor; } }
  return {dibuat: kini, label: "indeks komposit, bobot sementara", bobot: RAPOR.bobot, kab: hasil,
    prov: Object.values(prov).map(({jumlah, ...p}) => ({...p, skor: p.n_dengan_skor ? bulat(jumlah / p.n_dengan_skor) : null})).sort((a, b) => (b.skor ?? -1) - (a.skor ?? -1)),
    lapor_warga: "belum dihitung: tabel laporan tidak punya kolom prov/kab"};
}
async function raporAdmin(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  return json(await hitungRapor(env, kini, url.searchParams.get("dummy") === "1", true));
}
async function raporPublik(env, req, url, kini, ctx) {
  return cacheTepi(new Request(new URL("/api/meja/rapor/publik", url), {method: "GET"}), ctx, 300, async () => json(await hitungRapor(env, kini, false, false)));
}

/* ---------------------------------------------------------------- petugas berkode */
async function daftarPetugas(env, req) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  return json({meja: DAFTAR_MEJA, petugas: (await env.DB.prepare(`SELECT t.id, t.nama, t.prov, t.kab, t.meja, t.dibuat, t.dicabut, t.dummy, (SELECT count(*) FROM meja_catatan c WHERE c.petugas_id = t.id) catatan
    FROM meja_petugas t ORDER BY t.dibuat DESC LIMIT 500`).all()).results.map(r => ({...r, meja: JSON.parse(r.meja)}))});
}
async function buatPetugas(env, req, url, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const x = semuaKunci(b.o, ["nama", "prov", "kab", "meja"]); if (x) return gagal(400, `kolom "${x.slice(0, 40)}" tidak dikenal`);
  const nama = tx(b.o.nama, 80), kab = tx(b.o.kab, 60);
  if (!nama || nama.length < 2) return gagal(400, "nama 2-80 huruf");
  if (typeof b.o.prov !== "string" || !RE_PROV.test(b.o.prov)) return gagal(400, "prov harus kode 2 digit");
  if (!kab || kab.length < 2) return gagal(400, "kabupaten 2-60 huruf");
  const mj = b.o.meja;
  if (!Array.isArray(mj) || !mj.length || !mj.every(m => typeof m === "string" && DAFTAR_MEJA.includes(m)) || new Set(mj).size !== mj.length) return gagal(400, `meja: satu atau lebih dari ${DAFTAR_MEJA.join(", ")}, tanpa duplikat`);
  const id = acak(8), {kode, kode_sha} = await kodeBaru();
  await env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, nama, b.o.prov, kab, JSON.stringify(mj), kode_sha, kini, p.oleh).run();
  /* kode tampil SEKALI, di fragmen (#k=) supaya tidak masuk log server */
  return json({petugas: {id, nama, prov: b.o.prov, kab, meja: mj, dibuat: kini, dicabut: null}, kode, tautan: `${url.origin}/meja#k=${kode}`}, 201);
}
async function cabutPetugas(env, req, id, kini) {
  const p = await adminSaja(env, req); if (p instanceof Response) return p;
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi !== "cabut") return gagal(400, "aksi harus cabut");
  const r = await env.DB.prepare("UPDATE meja_petugas SET dicabut = ? WHERE id = ? AND dicabut IS NULL").bind(kini, id).run();
  if (r.meta.changes) return json({id, dicabut: kini});
  return await env.DB.prepare("SELECT 1 FROM meja_petugas WHERE id = ?").bind(id).first() ? gagal(409, "kode ini sudah dicabut") : gagal(404, "petugas tidak ada");
}

/* ---------------------------------------------------------------- dummy (DUMMY.md): seluruh rantai Meja Kerja + bahan rapor di tiga kabupaten contoh */
const PROV_D = "62", KAB_D = ["Kab. Contoh Meja A", "Kab. Contoh Meja B", "Kab. Contoh Meja C"];
const tglD = (kini, hariLalu) => wib(kini - hariLalu * HARI);
function barisDummy(kini) {
  const t = h => tglD(kini, h), R = [];   // [meja, kab, status, umurJam, data, kec, desa]
  const add = (meja, kab, status, umurJam, data, desa = null, kec = null) => R.push({meja, kab, status, umurJam, data, desa, kec});
  const A = KAB_D[0], B = KAB_D[1], C = KAB_D[2];
  const kaji = (kej, rb, rs, rr, mati) => ({kejadian: kej, tanggal: t(3), rumah_rb: rb, rumah_rs: rs, rumah_rr: rr, sekolah: 1, faskes: 0, ibadah: 2, jalan_km: 3.5, jembatan: 1, meninggal: mati, hilang: 0, luka: 4, mengungsi: 120});
  add("kaji_cepat", A, "dilaporkan", 5, kaji("banjir", 12, 30, 55, 0), "Desa Contoh Satu");
  add("kaji_cepat", A, "dilaporkan", 100, kaji("banjir", 4, 9, 20, 1), "Desa Contoh Dua");   // > 72 jam: tanda bahaya
  add("kaji_cepat", A, "diverifikasi", 50, kaji("longsor", 8, 11, 6, 2), "Desa Contoh Tiga");
  add("kaji_cepat", B, "masuk_jitupasna", 200, kaji("banjir", 20, 40, 80, 3), "Desa Contoh Empat");
  const lg = (barang, jml, satuan, extra = {}) => ({barang, jumlah_diminta: jml, satuan, posko: "Posko Contoh", kebutuhan_untuk: 300, ...extra});
  add("logistik", A, "diminta", 3, lg("beras", 500, "kg"));
  add("logistik", A, "diminta", 30, lg("air_mineral", 2000, "dus"));   // > 24 jam: tanda bahaya
  add("logistik", A, "disetujui", 20, lg("tenda", 40, "unit"));
  add("logistik", A, "dikirim", 40, lg("selimut", 300, "lembar", {jumlah_kirim: 300, tgl_kirim: t(1), armada: "Truk 2 unit"}));
  add("logistik", A, "diterima", 80, lg("terpal", 100, "lembar", {jumlah_kirim: 100, tgl_kirim: t(2), jumlah_terima: 100, penerima: "Kepala Posko Contoh"}));   // pas
  add("logistik", B, "diterima", 90, lg("family_kit", 150, "paket", {jumlah_kirim: 150, tgl_kirim: t(3), jumlah_terima: 140, penerima: "Kepala Posko Contoh"}));   // kurang
  add("logistik", B, "diterima", 90, lg("masker", 1000, "buah", {jumlah_kirim: 1000, tgl_kirim: t(3), jumlah_terima: 1050, penerima: "Kepala Posko Contoh"}));   // lebih
  const ds = (extra = {}) => ({kejadian: "Banjir Contoh", nomor_permohonan: "DSP/CONTOH/" + (Object.keys(extra).length + 1), nilai_diajukan: 500000000, tgl_ajuan: t(60), ...extra});
  add("dsp", A, "diajukan", 20, ds());
  add("dsp", A, "disetujui", 100, ds({nilai_disetujui: 400000000, tgl_setuju: t(45)}));
  add("dsp", A, "cair", 960, ds({nilai_disetujui: 400000000, tgl_setuju: t(50), nilai_cair: 400000000, tgl_cair: t(40)}));   // 40 hari belum SPJ: tanda bahaya
  add("dsp", B, "cair", 240, ds({nilai_disetujui: 300000000, tgl_setuju: t(15), nilai_cair: 300000000, tgl_cair: t(10)}));
  add("dsp", B, "spj", 150, ds({nilai_disetujui: 300000000, tgl_setuju: t(30), nilai_cair: 300000000, tgl_cair: t(20), realisasi: 280000000, tgl_spj: t(5)}));
  add("dsp", B, "selesai", 100, ds({nilai_disetujui: 250000000, tgl_setuju: t(60), nilai_cair: 250000000, tgl_cair: t(50), realisasi: 250000000, tgl_spj: t(30), tgl_selesai: t(2)}));
  add("dsp", C, "ditolak", 100, ds({alasan: "Dokumen pendukung belum lengkap"}));
  const rk = (bencana, sah, sampai, uji) => ({bencana, judul: "Renkon " + bencana + " Contoh", tgl_sah: t(sah), berlaku_sampai: wib(kini + sampai * HARI), ...(uji == null ? {} : {uji_terakhir: t(uji)}), tautan: "https://contoh.invalid/renkon"});
  add("renkon", A, "tercatat", 5000, rk("banjir", 300, 400, 30));   // berlaku
  add("renkon", A, "tercatat", 5000, rk("karhutla", 300, 40, 30));   // segera_habis
  add("renkon", B, "tercatat", 5000, rk("banjir", 800, -10, 400));   // kedaluwarsa
  add("renkon", C, "tercatat", 5000, rk("gempa", 100, 500, null));   // belum_diuji
  const dt = (kelas, keg) => ({kelas, tahun_dibentuk: 2018, indikator: ["tim_siaga", "peta_risiko", "jalur_evakuasi"], ...(keg == null ? {} : {kegiatan_terakhir: t(keg)})});
  add("destana", A, "tercatat", 5000, dt("utama", 30), "Desa Tangguh Satu", "Kec. Contoh");   // aktif
  add("destana", B, "tercatat", 5000, dt("madya", 400), "Desa Tangguh Dua", "Kec. Contoh");   // pasif
  add("destana", C, "tercatat", 5000, dt("pratama", null), "Desa Tangguh Tiga", "Kec. Contoh");   // pasif
  return R;
}
async function dummyIsi(env, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM meja_catatan WHERE dummy = 1").first()).n) return gagal(409, "data dummy Meja Kerja sudah ada; hapus dulu dengan 🧹");
  const st = [], idPetugas = Array.from({length: 3}, () => acak(8));
  const PT = [[KAB_D[0], DAFTAR_MEJA, 0], [KAB_D[1], ["kaji_cepat", "logistik"], 0], [KAB_D[2], ["renkon"], 1]];
  PT.forEach(([kab, mj, cabut], i) => st.push(env.DB.prepare("INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, dicabut, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(idPetugas[i], `[DUMMY] Petugas Contoh ${i + 1}`, PROV_D, kab, JSON.stringify(mj), "0".repeat(48) + acak(8), kini - 30 * HARI, cabut ? kini - HARI : null, oleh)));
  const rows = barisDummy(kini); let nj = 0;
  for (const r of rows) {
    const M = MEJA[r.meja], id = acak(8), dibuat = kini - r.umurJam * JAM;
    /* jalur status sampai status sekarang (ditolak keluar dari diajukan); jejak tiap langkah 1 jam sesudah sebelumnya, tidak melewati kini */
    const jalur = M.turunan ? [M.awal] : r.status === "ditolak" ? ["diajukan", "ditolak"] : M.status.slice(0, M.status.indexOf(r.status) + 1);
    const waktu = i => Math.min(kini, dibuat + i * JAM), pi = PT.findIndex(x => x[0] === r.kab);
    st.push(env.DB.prepare("INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(id, r.meja, PROV_D, r.kab, r.kec, r.desa, JSON.stringify(r.data), r.status, dibuat, waktu(jalur.length - 1), "petugas:" + idPetugas[pi], idPetugas[pi]));
    jalur.forEach((s, i) => { nj++; st.push(env.DB.prepare("INSERT INTO meja_jejak (catatan_id, dari, ke, waktu, oleh, catatan, dummy) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(id, i ? jalur[i - 1] : null, s, waktu(i), oleh, "[Contoh]")); });
  }
  /* bahan rapor di tabel Posko (dummy=1, diberi nama kabupaten contoh): regu, laporan regu 7 hari, panggilan dengan waktu respons nyata */
  const regu = KAB_D.slice(0, 2).flatMap((kab, i) => Array.from({length: i ? 2 : 3}, (_, j) => ({id: acak(8), kab, nama: `[DUMMY MEJA] Regu ${i ? "B" : "A"}${j + 1}`})));
  for (const g of regu) st.push(env.DB.prepare("INSERT INTO regu (id, nama, unsur, prov, kab, kode_sha, dibuat, oleh, dummy) VALUES (?, ?, 'BPBD', ?, ?, ?, ?, ?, 1)").bind(g.id, g.nama, PROV_D, g.kab, "0".repeat(48) + acak(8), kini - 30 * HARI, oleh));
  const lap = [[0, 4], [1, 3], [3, 1]];   // [indeks regu, jumlah laporan]: regu A1, A2 aktif, A3 diam; regu B1 aktif, B2 diam
  let nl = 0;
  for (const [ri, n] of lap) for (let i = 0; i < n; i++) {
    const g = regu[ri], w = kini - (i * 20 + ri * 3 + 2) * JAM;
    st.push(env.DB.prepare("INSERT INTO lapangan (id, regu_id, klien_id, tgl, waktu, dibuat, lat, lon, akurasi, status, luas_ha, padam_ha, personel, prov, kab, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 20, 'bara', 10, 4, 6, ?, ?, 1)")
      .bind(acak(8), g.id, `mejadum${ri}-${i}-${acak(3)}`, wib(w), w, w, -2.2 - ri * 0.01, 113.9 + i * 0.01, PROV_D, g.kab)); nl++;
  }
  /* panggilan: A responsnya 10, 20, 40, 60 menit (median 30); B 90, 100, 110 menit + satu belum direspons */
  const pg = [[0, [10, 20, 40, 60, null]], [1, [90, 100, 110, null]]];
  let np = 0;
  for (const [ki, durasi] of pg) durasi.forEach((m, i) => {
    const dp = kini - (3 + i * 5) * JAM;
    st.push(env.DB.prepare(`INSERT INTO panggilan (id, tanggal, perusahaan_id, nama_pt, prov, kab, titik_n, terdeteksi, status, dipanggil_pada, batas, direspons_pada, saluran, oleh, dibuat, dummy)
      VALUES (?, ?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, 'email', ?, ?, 1)`).bind(acak(8), wib(dp), `mejadum-${ki}-${i}`, `[DUMMY] PT Contoh Meja ${ki}${i}`, PROV_D, KAB_D[ki], dp - JAM, m == null ? "dipanggil" : "direspons",
      dp, dp + 2 * JAM, m == null ? null : dp + m * MENIT, oleh, kini)); np++;
  });
  await env.DB.batch(st);
  return json({ok: true, petugas: PT.length, catatan: rows.length, jejak: nj, regu: regu.length, lapangan: nl, panggilan: np}, 201);
}
async function dummyHapus(env) {
  /* tabel Posko: hanya baris dummy di kabupaten contoh Meja Kerja (dummy Ruang Posko punya jalur hapusnya sendiri) */
  const kab = KAB_D.map(() => "?").join(","), di = `dummy = 1 AND prov = '${PROV_D}' AND kab IN (${kab})`;
  const n = async (t, w = "dummy = 1", ...a) => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE ${w}`).bind(...a).first()).n;
  const hasil = {petugas: await n("meja_petugas"), catatan: await n("meja_catatan"), jejak: await n("meja_jejak"),
    panggilan: await n("panggilan", di, ...KAB_D), lapangan: await n("lapangan", di, ...KAB_D), regu: await n("regu", di, ...KAB_D)};
  await env.DB.batch([
    env.DB.prepare("DELETE FROM meja_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_catatan WHERE dummy = 1"), env.DB.prepare("DELETE FROM meja_petugas WHERE dummy = 1"),
    env.DB.prepare(`DELETE FROM lapangan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM panggilan WHERE ${di}`).bind(...KAB_D), env.DB.prepare(`DELETE FROM regu WHERE ${di}`).bind(...KAB_D),
  ]);
  return json({ok: true, ...hasil});
}
async function dummy(env, req, kini) {
  const oleh = await superOK(env, req); if (!oleh) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, "admin:" + oleh);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ---------------------------------------------------------------- rute */
const A = {
  "GET /meja": (env, req, url) => halamanBnpbPublik(env, url, "meja", {pribadi: true}),
  "GET /admin/meja": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("meja")),
  "GET /api/meja/spek": (env, req, url, kini, ctx) => cacheTepi(new Request(new URL("/api/meja/spek", url), {method: "GET"}), ctx, 300, async () => json(spekPublik())),
  "GET /api/meja/saya": async (env, req) => { const p = await pelaku(env, req); return p instanceof Response ? p : json(p.petugas ? {peran: "petugas", petugas: {nama: p.petugas.nama, prov: p.petugas.prov, kab: p.petugas.kab, meja: p.petugas.meja}} : {peran: "admin"}); },
  "GET /api/meja/catatan": daftar,
  "POST /api/meja/catatan": (env, req, url, kini) => buat(env, req, kini),
  "GET /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => rincian(env, req, id, kini),
  "POST /api/meja/catatan/:id": (env, req, url, kini, ctx, id) => ubah(env, req, id, kini),
  "GET /api/meja/rekap": rekap,
  "GET /api/meja/ringkas": ringkas,
  "GET /api/meja/rapor": raporAdmin,
  "GET /api/meja/rapor/publik": raporPublik,
  "GET /api/meja/petugas": (env, req) => daftarPetugas(env, req),
  "POST /api/meja/petugas": (env, req, url, kini) => buatPetugas(env, req, url, kini),
  "POST /api/meja/petugas/:id": (env, req, url, kini, ctx, id) => cabutPetugas(env, req, id, kini),
  "POST /api/meja/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
/* gerbang uji membaca kunci tabel ini; tiap rute dibungkus aman() (tabel belum ada = 503) */
export const RUTE_MEJA = Object.fromEntries(Object.entries(A).map(([k, f]) => [k, aman(f)]));
