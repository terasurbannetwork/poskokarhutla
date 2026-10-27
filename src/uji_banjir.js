/* Uji lapangan banjir: label nyata untuk menguji status banjir di peta (public/banjir/data/status.json). Skema: migrations/0065_uji_banjir.sql.
   Dua sampel: 'genangan' (petugas menemukan genangan: tinggi cm, luas kira-kira ha, lama jam, foto bergeotag opsional) dan 'kontrol' (lokasi berstatus Aman yang dicek, tidak tergenang).
   Status di peta saat itu dibaca SERVER dari status.json hari ke-0 untuk kecamatan itu, bukan dari kiriman klien. Hanya akun instansi aktif, hanya kecamatan di wilayahnya.
   Agregat (GET /api/uji-lapangan/banjir, admin/pemirsa) tanpa koordinat, akun, atau kecamatan; sel < 5 ditahan.
   ponytail: tanpa retensi dan tanpa uji statistik (Wilson/ambang) dulu; tambah bila jumlah label cukup untuk vonis. */
import {json, gagal, acak, bacaBody, adminOK, ipHash} from "./worker.js";
import {akunAktif} from "./instansi.js";
import {dalam} from "./push.js";
import {laju, lajuIP} from "./bnpb.js";
import {pemirsaSesi} from "./pemirsa.js";
import {jarakM} from "./foto.js";
import {bacaStatusBanjir, levelKec, NAMA_STATUS} from "./status_banjir.js";

const JAM = 36e5, FOTO_UMUR_MAKS = 30 * 6e4, RETENSI = 365 * 24 * JAM, TAHAN = 5, MAKS_JARAK_FOTO_M = 1000;
const KUNCI = ["sampel", "kec", "lat", "lon", "tinggi_cm", "luas_ha", "lama_jam", "foto_id"];
const bulat = (x, lo, hi) => typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi;
const tabelBelum = e => /no such table: (main\.)?uji_banjir/i.test(String(e?.message || e));
const GALAT_BELUM = "uji banjir belum aktif: migrasi 0065 belum diterapkan";

async function kirim(env, req, kini) {
  if (req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1");
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  for (const k of Object.keys(o)) if (!KUNCI.includes(k)) return gagal(400, `kunci '${String(k).slice(0, 30)}' tidak dikenal (boleh: ${KUNCI.join(", ")})`);
  if (o.sampel !== "genangan" && o.sampel !== "kontrol") return gagal(400, "sampel harus genangan atau kontrol");
  const [prov, kab, kec] = String(o.kec ?? "").split("|");
  if (typeof o.kec !== "string" || o.kec.length > 200 || !/^\d{2}$/.test(prov) || !kab || !kec) return gagal(400, "kec harus 'prov|kabupaten|kecamatan' seperti di status banjir");
  if (typeof o.lat !== "number" || typeof o.lon !== "number" || !(o.lat >= -11.5 && o.lat <= 6.5 && o.lon >= 94.5 && o.lon <= 141.5)) return gagal(400, "lat/lon wajib (GPS perangkat, dalam wilayah Indonesia)");
  const genangan = o.sampel === "genangan";
  if (genangan) {
    if (!bulat(o.tinggi_cm, 1, 1000)) return gagal(400, "tinggi_cm wajib: bilangan bulat 1-1000");
    if (!bulat(o.lama_jam, 0, 720)) return gagal(400, "lama_jam wajib: bilangan bulat 0-720");
    if (o.luas_ha != null && !(typeof o.luas_ha === "number" && o.luas_ha > 0 && o.luas_ha <= 100000)) return gagal(400, "luas_ha harus angka lebih dari 0 dan paling banyak 100000");
  } else if (["tinggi_cm", "luas_ha", "lama_jam"].some(k => o[k] != null)) return gagal(400, "sampel kontrol tidak membawa tinggi_cm, luas_ha, atau lama_jam");
  if (o.foto_id != null && (typeof o.foto_id !== "string" || !/^[0-9a-f]{16}$/.test(o.foto_id))) return gagal(400, "foto_id harus 16 hex");
  if (!dalam(a, prov, kab)) return gagal(403, "kecamatan di luar wilayah akun ini");
  const l = await laju(env, "ujib:" + a.id, "uji.banjir", [[JAM, 60]], kini); if (l) return l;
  const st = await bacaStatusBanjir(env, kini); if (!st) return gagal(503, "status banjir hari ini belum tersedia; coba lagi nanti");
  const level = levelKec(st.kec[o.kec]); if (level == null) return gagal(400, "kecamatan tidak ada di status banjir hari ini");
  if (!genangan && level !== 0) return gagal(409, `sampel kontrol hanya untuk lokasi berstatus Aman; peta saat ini ${NAMA_STATUS[level]}`);
  if (o.foto_id) {
    /* foto harus diunggah dari perangkat/IP yang sama dalam 30 menit terakhir (ip_hash + dibuat di tabel foto; tanpa migrasi, akun tidak tercatat di foto) dan bukan dummy */
    const TIDAK_SAH = "foto_id tidak valid untuk lokasi ini";   // satu pesan untuk semua sebab: bukan oracle keberadaan foto
    let f; try { f = await env.DB.prepare("SELECT lat, lon, ip_hash, dibuat FROM foto WHERE id = ? AND dummy = 0").bind(o.foto_id).first(); } catch (e) { f = null; }
    if (!f || f.ip_hash !== await ipHash(env, req) || kini - f.dibuat > FOTO_UMUR_MAKS || jarakM(o.lat, o.lon, f.lat, f.lon) > MAKS_JARAK_FOTO_M) return gagal(400, TIDAK_SAH);
  }
  const id = acak(8);
  try {
    await env.DB.prepare(`INSERT INTO uji_banjir (id, akun_id, sampel, prov, kab, kec, hari_status, status_peta, lat, lon, tinggi_cm, luas_ha, lama_jam, foto_id, waktu, dibuat)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15)`)
      .bind(id, a.id, o.sampel, prov, kab, kec, st.hari, level, Math.round(o.lat * 1e3) / 1e3, Math.round(o.lon * 1e3) / 1e3, genangan ? o.tinggi_cm : null, genangan ? (o.luas_ha ?? null) : null, genangan ? o.lama_jam : null, o.foto_id ?? null, kini).run();
  } catch (e) { if (tabelBelum(e)) return gagal(503, GALAT_BELUM); throw e; }
  return json({ok: true, id, status_peta: NAMA_STATUS[level], hari_status: st.hari}, 201);
}

/* daftar kecamatan di wilayah akun beserta status peta saat ini, untuk pilihan di formulir petugas (tanpa koordinat) */
async function daftarKec(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const l = await lajuIP(env, req, "uji.banjir.kec", [[60e3, 30]], kini); if (l) return l;
  const st = await bacaStatusBanjir(env, kini); if (!st) return gagal(503, "status banjir hari ini belum tersedia; coba lagi nanti");
  const out = [];
  for (const [k, v] of Object.entries(st.kec)) { const [prov, kab, kec] = k.split("|"), lv = levelKec(v); if (lv != null && kec && dalam(a, prov, kab)) out.push({kec: k, kab, nama: kec, status: NAMA_STATUS[lv]}); }
  out.sort((x, y) => x.kab.localeCompare(y.kab) || x.nama.localeCompare(y.nama));
  return json({hari: st.hari, kecamatan: out.slice(0, 3000)});
}
async function agregat(env, req, kini) {
  if (!(await adminOK(env, req) || await pemirsaSesi(env, req))) return gagal(403, "perlu masuk");
  const l = await lajuIP(env, req, "uji.baca", [[60e3, 20]], kini); if (l) return l;
  let rs; try { rs = (await env.DB.prepare("SELECT sampel, status_peta, tinggi_cm FROM uji_banjir LIMIT 20000").all()).results; } catch (e) { if (tabelBelum(e)) return gagal(503, GALAT_BELUM); throw e; }
  const gen = rs.filter(r => r.sampel === "genangan"), ktr = rs.filter(r => r.sampel === "kontrol");
  const sel = n => n < TAHAN ? null : n;
  const per = NAMA_STATUS.map((nama, i) => ({status: nama, n: gen.filter(r => r.status_peta === i).length})), tahanPer = per.some(x => x.n > 0 && x.n < TAHAN);   // satu sel kecil ditahan = semua sel ditahan (selisih dengan total tak boleh membuka sel kecil)
  const tinggi = gen.map(r => r.tinggi_cm).sort((x, y) => x - y);
  const h = new Response(JSON.stringify({
    diperbarui: kini,
    genangan: {n: sel(gen.length), ditahan: gen.length < TAHAN, per_status: per.map(x => ({status: x.status, n: tahanPer ? null : x.n})),
      tinggi_median_cm: gen.length < TAHAN ? null : tinggi[tinggi.length >> 1]},
    kontrol: {n: sel(ktr.length), ditahan: ktr.length < TAHAN},
    catatan: ["Status peta dibaca server saat pengamatan. Genangan di lokasi berstatus Aman = banjir terlewat; kontrol = lokasi Aman yang dicek tanpa genangan.", "Sel di bawah 5 ditahan."]}),
    {status: 200, headers: {"content-type": "application/json; charset=utf-8", "cache-control": "private, no-store", vary: "cookie"}});
  return h;
}
/* retensi 12 bulan; dipanggil cron bersih-bersih (menit 17). Tabel 0065 belum ada = lewati. */
export async function bersihkanUjiBanjir(env, kini = Date.now()) {
  try { return (await env.DB.prepare("DELETE FROM uji_banjir WHERE waktu < ?").bind(kini - RETENSI).run()).meta.changes; }
  catch (e) { if (tabelBelum(e)) return 0; throw e; }
}
export const RUTE_UJI_BANJIR = {
  "POST /api/instansi/uji-banjir": (env, req, url, kini) => kirim(env, req, kini),   // cookie sesi instansi hanya terkirim ke /api/instansi
  "GET /api/instansi/uji-banjir/kec": (env, req, url, kini) => daftarKec(env, req, kini),
  "GET /api/uji-lapangan/banjir": (env, req, url, kini) => agregat(env, req, kini),
};
