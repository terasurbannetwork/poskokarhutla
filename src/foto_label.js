/* Label kerusakan foto lapangan (0071 foto_label): kumpulkan label dari MANUSIA dulu, model computer vision nanti.
   Tidak ada model, tidak ada skor AI. Semua rute admin (adminOK PERTAMA, sebelum body/D1). Halaman: public/admin/labelfoto.js. */
import {json, gagal, adminOK, bacaBody} from "./worker.js";
import {laju} from "./bnpb.js";

export const AMBANG_LABEL = 500;   // model baru dilatih setelah sekian FOTO terlabel (disepakati pemilik); satu-satunya tempat angka ini ditulis
export const KELAS = ["rusak_berat", "rusak_sedang", "rusak_ringan", "tidak_rusak", "bukan_bangunan", "tidak_jelas"];
export const JENIS_OBJEK = ["rumah", "sekolah", "ibadah", "kesehatan", "jembatan", "jalan", "lain"];
const JAM = 3600e3, BATAS_LAJU = [[60e3, 90], [24 * JAM, 3000]];

/* Tiga sumber foto yang sudah ada; kolom sama: sumber, id, lat, lon, bencana, kategori, diambil, dibuat, dummy, mime. Hanya foto yang lolos moderasi (foto.status = 'tayang').
   ponytail: uji_pilot dan instansi_media tak punya antrean moderasi (diunggah petugas/regu), jadi semuanya masuk. */
const SEL = {
  foto: "SELECT 'foto' sumber, id, lat, lon, bencana, coalesce(nullif(kategori_b, ''), kategori) kategori, diambil, dibuat, dummy, mime FROM foto WHERE status = 'tayang' AND jenis = 'foto'",
  uji_pilot: "SELECT 'uji_pilot' sumber, id, lat, lon, 'karhutla' bencana, tahap kategori, diambil, dibuat, dummy, mime FROM uji_pilot_lapor WHERE mime IS NOT NULL",
  instansi_media: "SELECT 'instansi_media' sumber, id, lat, lon, 'karhutla' bencana, 'uji_lapangan' kategori, waktu_ambil diambil, dibuat, dummy, mime FROM instansi_media WHERE jenis = 'foto'"};
const KUNCI_R2 = {foto: id => `foto/${id}`, uji_pilot: id => `uji-pilot/${id}`, instansi_media: id => `instansi/media/${id}`};
const SEMUA = `WITH f AS (${Object.values(SEL).join(" UNION ALL ")})`;
const urlMedia = (s, id) => s === "foto" ? `/api/foto/media/${id}` : `/api/labelfoto/media/${id}?s=${s}`;
const dummyMode = url => url.searchParams.get("dummy") === "1" ? 1 : 0;
const tanpaTabel = e => /no such table/i.test(String(e?.message || e)) ? gagal(503, "migrasi 0071 belum dijalankan") : null;

/* Kesepakatan antar-pelabel (murni, diuji langsung). baris = [{k: kunci foto, pelabel, kelas}] hanya foto dengan >= 2 pelabel.
   Tiap pasangan pelabel dihitung dari foto yang keduanya nilai: persen sama, Cohen kappa = (po - pe) / (1 - pe). Ringkasan = pasangan dibobot jumlah foto bersama.
   kappa null bila tak terdefinisi (pe = 1: kedua pelabel selalu memberi satu kelas yang sama). */
export function kesepakatan(baris) {
  const per = new Map();
  for (const b of baris) { if (!per.has(b.k)) per.set(b.k, new Map()); per.get(b.k).set(b.pelabel, b.kelas); }
  const pas = new Map();
  for (const m of per.values()) {
    const p = [...m.keys()].sort();
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const id = p[i] + "|" + p[j], x = pas.get(id) || pas.set(id, {n: 0, sama: 0, a: {}, b: {}}).get(id), ka = m.get(p[i]), kb = m.get(p[j]);
      x.n++; x.a[ka] = (x.a[ka] || 0) + 1; x.b[kb] = (x.b[kb] || 0) + 1; if (ka === kb) x.sama++;
    }
  }
  let n = 0, sama = 0, kw = 0, kn = 0;
  for (const x of pas.values()) {
    n += x.n; sama += x.sama;
    const pe = KELAS.reduce((s, k) => s + ((x.a[k] || 0) / x.n) * ((x.b[k] || 0) / x.n), 0);
    if (pe < 1) { kw += x.n * (x.sama / x.n - pe) / (1 - pe); kn += x.n; }
  }
  const b3 = v => Math.round(v * 1000) / 1000;
  return {foto_ganda: per.size, pasangan: pas.size, persen: n ? b3(sama / n) : null, kappa: kn ? b3(kw / kn) : null};
}

async function statistik(env, dummy, pelabel) {
  const gabung = "FROM foto_label l JOIN f ON f.sumber = l.sumber AND f.id = l.foto_id WHERE l.dummy = ?";   // join: label foto yang sudah dihapus/ditolak tidak dihitung
  const [kelas, foto, saya, total, ganda] = await env.DB.batch([
    env.DB.prepare(`${SEMUA} SELECT l.kelas, count(*) n ${gabung} GROUP BY l.kelas`).bind(dummy),
    env.DB.prepare(`${SEMUA} SELECT count(*) n FROM (SELECT 1 ${gabung} GROUP BY l.sumber, l.foto_id)`).bind(dummy),
    env.DB.prepare(`${SEMUA} SELECT count(*) n ${gabung} AND l.pelabel = ?`).bind(dummy, pelabel),
    env.DB.prepare(`${SEMUA} SELECT count(*) n FROM f WHERE dummy = ?`).bind(dummy),
    env.DB.prepare(`${SEMUA} SELECT l.sumber || l.foto_id k, l.pelabel, l.kelas ${gabung} AND (l.sumber, l.foto_id) IN
      (SELECT sumber, foto_id FROM foto_label WHERE dummy = ? GROUP BY sumber, foto_id HAVING count(*) >= 2) LIMIT 50000`).bind(dummy, dummy)]);
  const per = Object.fromEntries(KELAS.map(k => [k, 0]));
  for (const r of kelas.results) per[r.kelas] = r.n;
  return {ambang: AMBANG_LABEL, terlabel: foto.results[0].n, label_total: Object.values(per).reduce((a, b) => a + b, 0), per_kelas: per,
    saya: saya.results[0].n, total_foto: total.results[0].n, kesepakatan: kesepakatan(ganda.results)};
}

async function antre(env, req, url, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const dummy = dummyMode(url), baru = url.searchParams.get("mode") === "baru", batas = Math.min(50, Math.max(1, parseInt(url.searchParams.get("batas"), 10) || 20)), cur = url.searchParams.get("sebelum");
  let kunci = null;
  if (cur) { const m = /^(\d{1,15}):(\w{16})$/.exec(cur); if (!m) return gagal(400, "sebelum harus <waktu>:<id>"); kunci = [Number(m[1]), m[2]]; }
  /* mode saya (bawaan) = yang BELUM saya label (foto yang sudah dilabel orang lain tetap muncul: perlu pelabel kedua untuk kesepakatan); mode baru = belum dilabel siapa pun */
  const belum = `dummy = ? AND NOT EXISTS (SELECT 1 FROM foto_label l WHERE l.sumber = f.sumber AND l.foto_id = f.id${baru ? "" : " AND l.pelabel = ?"})`, arg = baru ? [dummy] : [dummy, mod];
  try {
    const [r, n] = await env.DB.batch([
      env.DB.prepare(`${SEMUA} SELECT sumber, id, lat, lon, bencana, kategori, diambil, dibuat FROM f WHERE ${belum}${kunci ? " AND (dibuat < ? OR (dibuat = ? AND id < ?))" : ""} ORDER BY dibuat DESC, id DESC LIMIT ?`)
        .bind(...arg, ...(kunci ? [kunci[0], kunci[0], kunci[1]] : []), batas + 1),
      env.DB.prepare(`${SEMUA} SELECT count(*) n FROM f WHERE ${belum}`).bind(...arg)]);
    const ada = r.results.slice(0, batas), lagi = r.results.length > batas, akhir = ada[ada.length - 1];
    return json({foto: ada.map(x => ({...x, url: urlMedia(x.sumber, x.id)})), berikut: lagi ? `${akhir.dibuat}:${akhir.id}` : null, sisa: n.results[0].n});
  } catch (e) { return tanpaTabel(e) || (console.error("labelfoto antre", e?.message), gagal(500, "galat server")); }
}

async function simpan(env, req, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  const {sumber, foto_id: id, kelas} = b.o, jenis = b.o.jenis_objek ?? null;
  if (!Object.hasOwn(SEL, sumber)) return gagal(400, `sumber harus ${Object.keys(SEL).join("/")}`);
  if (typeof id !== "string" || !/^\w{16}$/.test(id)) return gagal(400, "foto_id harus 16 karakter");
  if (!KELAS.includes(kelas)) return gagal(400, `kelas harus ${KELAS.join("/")}`);
  if (jenis !== null && !JENIS_OBJEK.includes(jenis)) return gagal(400, `jenis_objek harus ${JENIS_OBJEK.join("/")}`);
  try {
    const f = await env.DB.prepare(`SELECT dummy FROM (${SEL[sumber]}) WHERE id = ?`).bind(id).first();   // hanya foto yang lolos moderasi
    if (!f) return gagal(404, "foto tidak ada atau belum disetujui");
    const l = await laju(env, mod, "foto_label", BATAS_LAJU, kini); if (l) return l;
    await env.DB.prepare(`INSERT INTO foto_label (sumber, foto_id, pelabel, kelas, jenis_objek, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (sumber, foto_id, pelabel) DO UPDATE SET kelas = excluded.kelas, jenis_objek = excluded.jenis_objek, waktu = excluded.waktu`).bind(sumber, id, mod, kelas, jenis, kini, f.dummy).run();
    return json({ok: true});
  } catch (e) { return tanpaTabel(e) || (console.error("labelfoto simpan", e?.message), gagal(500, "galat server")); }
}

async function ringkas(env, req, url, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  try { return json(await statistik(env, dummyMode(url), mod)); } catch (e) { return tanpaTabel(e) || (console.error("labelfoto statistik", e?.message), gagal(500, "galat server")); }
}

async function ekspor(env, req, url, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const dummy = dummyMode(url);
  try {
    const [r, st] = [await env.DB.prepare(`${SEMUA} SELECT f.sumber, f.id, f.lat, f.lon, f.bencana, f.kategori, f.diambil, f.dibuat, l.pelabel, l.kelas, l.jenis_objek, l.waktu
      FROM f JOIN foto_label l ON l.sumber = f.sumber AND l.foto_id = f.id WHERE l.dummy = ? ORDER BY f.dibuat, f.id, l.pelabel LIMIT 100000`).bind(dummy).all(), await statistik(env, dummy, mod)];
    const per = new Map();
    for (const x of r.results) {
      const k = x.sumber + x.id;
      if (!per.has(k)) per.set(k, {sumber: x.sumber, id: x.id, kunci_r2: KUNCI_R2[x.sumber](x.id), lat: x.lat, lon: x.lon, tanggal: new Date(x.diambil || x.dibuat).toISOString(), jenis_bencana: x.bencana, kategori: x.kategori, label: []});
      per.get(k).label.push({pelabel: x.pelabel, kelas: x.kelas, jenis_objek: x.jenis_objek, waktu: x.waktu});
    }
    const foto = [...per.values()].map(f => {
      const n = f.label.length, hit = {}; for (const l of f.label) hit[l.kelas] = (hit[l.kelas] || 0) + 1;
      const [kls, jml] = Object.entries(hit).sort((a, b) => b[1] - a[1])[0];
      return {...f, kesepakatan: {n_label: n, sepakat: n >= 2 && jml === n, kelas_mayoritas: jml * 2 > n ? kls : null}};
    });
    return json({dibuat: new Date(kini).toISOString(), kelas: KELAS, jenis_objek: JENIS_OBJEK, statistik: st, foto}, 200, {"content-disposition": 'attachment; filename="label-kerusakan.json"'});
  } catch (e) { return tanpaTabel(e) || (console.error("labelfoto ekspor", e?.message), gagal(500, "galat server")); }
}

/* foto bukan dummy dari R2 (foto dummy dilayani /api/foto/media dari aset). Jenis dari kolom mime, bukan dari kiriman. */
async function media(env, req, url, kini, id) {
  if (!(await adminOK(env, req, kini))) return gagal(403, "admin wajib masuk");
  const s = url.searchParams.get("s"); if (!Object.hasOwn(SEL, s)) return gagal(400, `s harus ${Object.keys(SEL).join("/")}`);
  if (!env.MEDIA) return gagal(503, "penyimpanan foto belum diaktifkan (R2 binding MEDIA)");
  const r = await env.DB.prepare(`SELECT mime FROM (${SEL[s]}) WHERE id = ?`).bind(id).first(); if (!r) return gagal(404, "foto tidak ada");
  const o = await env.MEDIA.get(KUNCI_R2[s](id)); if (!o) return gagal(404, "berkas tidak ada");
  return new Response(o.body, {headers: {"content-type": r.mime, "content-length": String(o.size), "x-content-type-options": "nosniff", "cache-control": "private, max-age=300", "content-disposition": "inline"}});
}

/* Dummy (DUMMY.md): label contoh pada foto dummy yang SUDAH ada (isi dulu di /admin/foto). Tiap kelas terisi; tiga pelabel palsu supaya kesepakatan dan kappa berangka
   (b sama dengan a kecuali tiap foto ke-4, c hanya tiap foto ke-3); sepertiga foto dibiarkan belum dilabel supaya antrean tidak kosong. Gerbang "sudah ada" = label dummy yang MASIH hidup. */
async function dummy(env, req, kini) {
  const mod = await adminOK(env, req, kini); if (!mod) return gagal(403, "admin wajib masuk");
  const b = await bacaBody(req); if (b.galat) return gagal(400, b.galat);
  try {
    if (b.o.aksi === "hapus") return json({ok: true, label: (await env.DB.prepare("DELETE FROM foto_label WHERE dummy = 1").run()).meta.changes});
    if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
    const sudah = (await env.DB.prepare(`${SEMUA} SELECT count(*) n FROM foto_label l JOIN f ON f.sumber = l.sumber AND f.id = l.foto_id WHERE l.dummy = 1`).first()).n;
    if (sudah) return gagal(409, `label dummy masih ada (${sudah}); hapus dulu bila ingin mengisi ulang`);
    const fs = (await env.DB.prepare("SELECT id FROM foto WHERE dummy = 1 AND status = 'tayang' AND jenis = 'foto' ORDER BY id LIMIT 30").all()).results;
    if (!fs.length) return gagal(409, "belum ada foto dummy yang tayang; isi dulu lewat 🧪 di /admin/foto dan setujui sebagian");
    const st = [], ins = env.DB.prepare("INSERT INTO foto_label (sumber, foto_id, pelabel, kelas, jenis_objek, waktu, dummy) VALUES ('foto', ?, ?, ?, ?, ?, 1)");
    fs.slice(0, Math.ceil(fs.length * 2 / 3)).forEach((f, i) => {
      const a = KELAS[i % KELAS.length], jenis = a === "bukan_bangunan" || a === "tidak_jelas" ? null : JENIS_OBJEK[i % JENIS_OBJEK.length];
      st.push(ins.bind(f.id, "dummy-a", a, jenis, kini));
      st.push(ins.bind(f.id, "dummy-b", i % 4 === 3 ? KELAS[(i + 1) % KELAS.length] : a, jenis, kini));
      if (i % 3 === 0) st.push(ins.bind(f.id, "dummy-c", a, jenis, kini));
    });
    await env.DB.batch(st);
    return json({ok: true, label: st.length, foto: Math.ceil(fs.length * 2 / 3)});
  } catch (e) { return tanpaTabel(e) || (console.error("labelfoto dummy", e?.message), gagal(500, "galat server")); }
}

export const RUTE_FOTO_LABEL = {
  "GET /api/labelfoto/antre": (env, req, url, kini) => antre(env, req, url, kini),
  "POST /api/labelfoto/simpan": (env, req, url, kini) => simpan(env, req, kini),
  "GET /api/labelfoto/statistik": (env, req, url, kini) => ringkas(env, req, url, kini),
  "GET /api/labelfoto/ekspor": (env, req, url, kini) => ekspor(env, req, url, kini),
  "GET /api/labelfoto/media/:id": (env, req, url, kini, ctx, id) => media(env, req, url, kini, id),
  "POST /api/labelfoto/dummy": (env, req, url, kini) => dummy(env, req, kini),
};
