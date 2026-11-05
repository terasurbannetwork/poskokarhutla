/* Antrean verifikasi pantauan medsos/TV ke logbook (G4, migrasi 0098). Staf memasukkan butir (tautan https, judul pendek, wilayah perkiraan), lalu menolak, menautkan ke kejadian logbook yang ada,
   atau membuat kejadian baru lewat buatKejadian() di src/logbook.js (validasi kejadian satu tempat). Tidak ada impor otomatis dari internet. Jeda = waktu_pantau -> logbook_kejadian.dibuat. */
import {json, gagal, NO_JSON, HARI, MENIT, cek, tolak, teks, teksOpsi, tglWIB, kodeProv, kabKunci, pilih, idSah, luarWilayah, acak, tabelBelum3, bacaStaf, tulisStaf, dummyStaf, lajuTulis} from "./pusdalops_umum.js";
import {JENIS, buatKejadian, wilayahKejadian} from "./logbook.js";
import {laju} from "./bnpb.js";
import {modAtauStaf} from "./staf.js";

const SUMBER = ["medsos", "tv"], STATUS = ["baru", "terverifikasi", "ditolak", "jadi_kejadian"], MAKS_ANTRE = 100, MAKS_JEDA = 5000;
const KOLOM = "id, sumber, tautan, judul, prov, kab, jenis, waktu_pantau, status, kejadian_id, catatan, dibuat, diverifikasi, dummy";
const keluar = r => ({...r, dummy: !!r.dummy});

/* tautan https biasa: id postingan panjang (puluhan angka) sah, jadi TANPA saringan nomor telepon; yang ditolak: bukan https, kredensial, alamat IP, spasi, > 300 karakter */
function tautan(v) {
  if (typeof v !== "string" || v.length > 300 || /[\s\u0000-\u001f\u007f]/.test(v) || !v.startsWith("https://")) tolak("tautan harus URL https:// maksimal 300 karakter tanpa spasi");
  let u; try { u = new URL(v); } catch { tolak("tautan bukan URL"); }
  if (u.protocol !== "https:" || u.username || u.password || !u.hostname.includes(".") || u.hostname.endsWith(".") || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(":")) tolak("tautan harus URL https://nama-situs tanpa kata sandi dan bukan alamat IP");
  if (/(^|\.)(wa\.me|whatsapp\.com)$/i.test(u.hostname) || u.pathname.includes("@") || u.search.includes("@") || /\d(?:\D{0,3}\d){10,}/.test(decodeURIComponent(u.search).normalize("NFKC"))) tolak("tautan tidak boleh ke WhatsApp, memuat @, atau nomor telepon di query");
  return u.href.length <= 300 ? u.href : tolak("tautan maksimal 300 karakter");
}
function waktu(v, kini) {
  if (v == null) return kini;
  const t = typeof v === "number" ? v : typeof v === "string" ? Date.parse(v) : NaN;
  if (!Number.isFinite(t) || t > kini + 5 * MENIT || t < kini - 30 * HARI) tolak("waktu_pantau harus epoch ms atau ISO, tidak lebih dari 5 menit ke depan dan 30 hari ke belakang");
  return Math.round(t);
}
function periksa(o, kini) {
  let prov = o.prov == null ? null : kodeProv(o.prov), kab = null;
  if (o.kab != null && o.kab !== "") { const k = kabKunci(o.kab); if (prov && prov !== k.prov) tolak("prov dan kab tidak cocok"); prov = k.prov; kab = k.kab; }
  if (!prov) tolak("prov (2 angka) atau kab (kunci \"prov|nama\") wajib");
  return {sumber: pilih(o.sumber, SUMBER, "sumber"), tautan: tautan(o.tautan), judul: teks(o.judul, "judul", 140, 3), prov, kab, jenis: o.jenis == null || o.jenis === "" ? null : pilih(o.jenis, JENIS, "jenis"), waktu_pantau: waktu(o.waktu_pantau, kini)};
}
const ambil = (env, id) => env.DB.prepare(`SELECT ${KOLOM} FROM medsos_butir WHERE id = ?`).bind(id).first();

async function tambah(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const p = cek(() => periksa(o, kini)); if (p.r) return p.r;
    const lw = luarWilayah(req, [p.v.prov]); if (lw) return lw;
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    const id = acak(8), v = p.v;
    try { await env.DB.prepare("INSERT INTO medsos_butir (id, sumber, tautan, judul, prov, kab, jenis, waktu_pantau, status, oleh, dibuat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'baru', ?, ?)").bind(id, v.sumber, v.tautan, v.judul, v.prov, v.kab, v.jenis, v.waktu_pantau, oleh, kini).run(); }
    catch (e) { if (/UNIQUE constraint failed/i.test(String(e?.message || e))) return gagal(409, "tautan ini sudah ada di antrean"); throw e; }
    return json({butir: keluar(await ambil(env, id))}, 201);
  });
}

async function verifikasi(env, req, kini) {
  return tulisStaf(env, req, async (o, oleh) => {
    const a = cek(() => { if (!idSah(o.id)) tolak("id butir 16 heks wajib"); return pilih(o.aksi, ["tolak", "tautkan", "buat"], "aksi"); }); if (a.r) return a.r;
    const b = await ambil(env, o.id); if (!b) return gagal(404, "butir tidak ada");
    if (b.status !== "baru") return gagal(409, "butir sudah diverifikasi");
    const lw = luarWilayah(req, [b.prov]); if (lw) return lw;
    if (a.v === "tolak") {
      const c = cek(() => teksOpsi(o.catatan, "catatan", 200, 3)); if (c.r) return c.r;
      const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
      const r = await env.DB.prepare("UPDATE medsos_butir SET status = 'ditolak', catatan = ?, oleh = ?, diverifikasi = ? WHERE id = ? AND status = 'baru'").bind(c.v, oleh, kini, b.id).run();
      return r.meta.changes ? json({butir: keluar(await ambil(env, b.id))}) : gagal(409, "butir sudah diverifikasi");
    }
    if (a.v === "tautkan") {
      if (!idSah(o.kejadian_id)) return gagal(400, "kejadian_id 16 heks wajib");
      const k = await env.DB.prepare("SELECT prov FROM logbook_kejadian WHERE id = ?").bind(o.kejadian_id).first(); if (!k) return gagal(404, "kejadian logbook tidak ada");
      const lw2 = luarWilayah(req, [b.prov, k.prov]); if (lw2) return lw2;
      const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
      const r = await env.DB.prepare("UPDATE medsos_butir SET status = 'terverifikasi', kejadian_id = ?, oleh = ?, diverifikasi = ? WHERE id = ? AND status = 'baru'").bind(o.kejadian_id, oleh, kini, b.id).run();
      return r.meta.changes ? json({butir: keluar(await ambil(env, b.id))}) : gagal(409, "butir sudah diverifikasi");
    }
    /* buat: bahan dasar dari butir, staf menimpa lewat o.kejadian (medan sama persis dengan POST /api/logbook/kejadian) */
    const kj = o.kejadian == null ? {} : o.kejadian;
    if (typeof kj !== "object" || Array.isArray(kj)) return gagal(400, "kejadian harus objek");
    for (const x of ["kab_kode", "wilayah", "prov", "prov_kode"]) if (x in kj) return gagal(400, `kejadian.${x} tidak dipakai; wilayah lewat kejadian.kab "prov|nama"`);
    const isi = {jenis: b.jenis ?? undefined, kab: b.kab ? `${b.prov}|${b.kab}` : undefined, mulai: tglWIB(b.waktu_pantau), catatan: `Dari pantauan ${b.sumber === "tv" ? "TV" : "medsos"}: ${b.judul}`, sumber_instansi: b.sumber === "tv" ? "Pantauan TV" : "Pantauan medsos", ...kj};
    const w = wilayahKejadian(isi);   // fungsi yang sama dengan yang dipakai buatKejadian
    const lw2 = luarWilayah(req, [b.prov, ...w ? [w.prov] : []]); if (lw2) return lw2;
    const lj = await lajuTulis(env, oleh, kini); if (lj) return lj;
    /* klaim dulu supaya dua klik serentak tak membuat dua kejadian; gagal = klaim dikembalikan */
    const klaim = await env.DB.prepare("UPDATE medsos_butir SET status = 'jadi_kejadian', oleh = ?, diverifikasi = ? WHERE id = ? AND status = 'baru'").bind(oleh, kini, b.id).run();
    if (!klaim.meta.changes) return gagal(409, "butir sudah diverifikasi");
    let res;
    try { res = await buatKejadian(env, oleh, isi, kini); } catch (e) { await lepas(env, b.id); throw e; }
    if (res.status !== 201) { await lepas(env, b.id); return res; }
    const j = await res.clone().json();
    await env.DB.prepare("UPDATE medsos_butir SET kejadian_id = ? WHERE id = ?").bind(j.kejadian.id, b.id).run();
    return json({butir: keluar(await ambil(env, b.id)), kejadian: j.kejadian, entri: j.entri}, 201);
  });
}
const lepas = (env, id) => env.DB.prepare("UPDATE medsos_butir SET status = 'baru', oleh = NULL, diverifikasi = NULL WHERE id = ? AND kejadian_id IS NULL").bind(id).run();

async function antrean(env, req, url, kini) {
  return bacaStaf(env, req, async oleh => {
    const lj = await laju(env, "pd:" + oleh, "pusdalops_baca", [[3600e3, 120]], kini); if (lj) return lj;
    const p = cek(() => ({status: pilih(url.searchParams.get("status") ?? "baru", STATUS, "status"), prov: url.searchParams.get("prov") == null ? null : kodeProv(url.searchParams.get("prov"))})); if (p.r) return p.r;
    const r = (await env.DB.prepare(`SELECT ${KOLOM} FROM medsos_butir WHERE status = ?${p.v.prov ? " AND prov = ?" : ""} ORDER BY waktu_pantau DESC LIMIT ${MAKS_ANTRE + 1}`).bind(...p.v.prov ? [p.v.status, p.v.prov] : [p.v.status]).all()).results;
    return json({status: p.v.status, terpotong: r.length > MAKS_ANTRE, butir: r.slice(0, MAKS_ANTRE).map(keluar)}, 200, NO_JSON);
  });
}

const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length ? Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
/* median menit dari waktu_pantau ke kejadian dibuat, per bulan WIB (12 bulan terakhir). Kejadian yang sudah ada SEBELUM pantauan (jeda negatif) dihitung terpisah: logbook lebih dulu. */
async function jeda(env, req, kini) {
  const oleh = await modAtauStaf(env, req, ["pusdalops", "koordalops", "pimpinan"]); if (!oleh) return gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan");
  const lj = await laju(env, "pd:" + String(oleh).slice(0, 64), "pusdalops_baca", [[3600e3, 120]], kini); if (lj) return lj;
  const r = (await env.DB.prepare(`SELECT b.waktu_pantau w, k.dibuat d FROM medsos_butir b JOIN logbook_kejadian k ON k.id = b.kejadian_id WHERE b.kejadian_id IS NOT NULL AND b.waktu_pantau >= ? ORDER BY b.waktu_pantau DESC LIMIT ${MAKS_JEDA + 1}`).bind(kini - 366 * HARI).all()).results;
  const bulan = new Map(), semua = [];
  let lebihDulu = 0;
  for (const x of r.slice(0, MAKS_JEDA)) {
    const b = tglWIB(x.w).slice(0, 7), a = bulan.get(b) ?? {bulan: b, n: 0, logbook_lebih_dulu: 0, m: []}; bulan.set(b, a);
    a.n++; const menit = (x.d - x.w) / MENIT;
    if (menit < 0) { a.logbook_lebih_dulu++; lebihDulu++; } else { a.m.push(menit); semua.push(menit); }
  }
  return json({terpotong: r.length > MAKS_JEDA, keseluruhan: {n: semua.length + lebihDulu, median_menit: median(semua), logbook_lebih_dulu: lebihDulu},
    per_bulan: [...bulan.values()].map(({m, ...a}) => ({...a, median_menit: median(m)}))}, 200, NO_JSON);
}

async function dummy(env, req, kini) {
  return dummyStaf(env, req, async aksi => {
    if (aksi === "hapus") return json({ok: true, butir: (await env.DB.prepare("DELETE FROM medsos_butir WHERE dummy = 1").run()).meta.changes});
    if (await env.DB.prepare("SELECT 1 x FROM medsos_butir WHERE dummy = 1 LIMIT 1").first()) return gagal(409, "data dummy antrean medsos sudah ada; hapus dulu lewat tombol Hapus data dummy (Super Admin)");
    const kej = (await env.DB.prepare("SELECT id, prov, kab, jenis, dibuat FROM logbook_kejadian WHERE dummy = 1 ORDER BY dibuat LIMIT 3").all()).results;
    const st = [], ins = (n, sumber, judul, prov, kab, jenis, w, status, kid) => st.push(env.DB.prepare("INSERT INTO medsos_butir (id, sumber, tautan, judul, prov, kab, jenis, waktu_pantau, status, kejadian_id, oleh, dibuat, diverifikasi, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dummy', ?, ?, 1)")
      .bind(acak(8), sumber, `https://contoh.invalid/pantauan/${n}`, judul, prov, kab, jenis, w, status, kid, kini, kid || status === "ditolak" ? kini : null));
    ins(1, "medsos", "Video banjir menggenangi jalan raya (contoh)", "33", "Cilacap", "banjir", kini - 30 * MENIT, "baru", null);
    ins(2, "tv", "Liputan longsor di perbukitan (contoh)", "33", "Banjarnegara", "longsor", kini - 3 * 36e5, "baru", null);
    ins(3, "medsos", "Unggahan asap tipis di lahan, belum jelas lokasinya (contoh)", "14", null, null, kini - 6 * 36e5, "ditolak", null);
    kej.forEach((k, i) => ins(4 + i, i % 2 ? "tv" : "medsos", `Pantauan kejadian ${k.kab} (contoh)`, k.prov, k.kab, k.jenis, k.dibuat - (45 + i * 75) * MENIT, i % 2 ? "terverifikasi" : "jadi_kejadian", k.id));
    await env.DB.batch(st);
    return json({ok: true, butir: st.length}, 201);
  });
}

const T = tabelBelum3;
export const RUTE_MEDSOS = {
  "POST /api/pusdalops/medsos": T((env, req, url, kini) => tambah(env, req, kini)),
  "POST /api/pusdalops/medsos/verifikasi": T((env, req, url, kini) => verifikasi(env, req, kini)),
  "GET /api/pusdalops/medsos": T((env, req, url, kini) => antrean(env, req, url, kini)),
  "GET /api/pusdalops/medsos/jeda": T((env, req, url, kini) => jeda(env, req, kini)),
  "POST /api/pusdalops/medsos/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
