/* Label harian teranonim untuk pelatihan/uji model (docs/panen/RENCANA-PANEN-DATA.md #43). GET /api/pipa/label?sejak=YYYY-MM-DD, Bearer PIPA_TOKEN (pipa.js periksaToken:
   503 tanpa token Worker, 401 salah, 429 bila >300 token salah/jam per IP). Hanya-baca; tidak ada tabel baru.
   Baris: {tanggal (WIB), prov, kab, kec, jenis, status, sumber, n}. TIDAK ada id, nama, nomor, hash IP, teks bebas, atau koordinat: titik dikunci ke kecamatan terdekat (cariWilayah) lalu dibuang.
   Sumber: regu = tugas_api yang sudah dikonfirmasi/dipadamkan lapangan (padam | menyala | bukan_api); warga = laporan tak tersembunyi (terjadi); konfirmasi = prediksi_konfirmasi (terjadi | tidak_terjadi, hanya sampai kab).
   ponytail: maks 20000 baris sumber per panggilan; pembaca memanggil ulang dengan sejak lebih baru. */
import {json, gagal} from "./worker.js";
import {periksaToken} from "./pipa.js";
import {wilayah, cariWilayah} from "./titik.js";
import {tglSah, wib} from "./posko.js";

const MAKS = 20000, HARI = 864e5, KODE_JENIS = {HJN: "cuaca", API: "karhutla", BNJ: "banjir", LSR: "longsor", ASP: "udara", ROB: "rob"};

/* murni: tiap masukan sudah berbentuk {tanggal, lat, lon, ...}; cari(lat, lon) -> "prov|kab|kec" atau null */
export function labelHarian({regu = [], warga = [], konfirmasi = []}, cari) {
  const peta = new Map();
  const tambah = (tanggal, lokasi, jenis, status, sumber) => {
    const k = [tanggal, ...lokasi, jenis, status, sumber].map(v => v ?? "").join("\t");
    peta.set(k, (peta.get(k) || 0) + 1);
  };
  const lok = (lat, lon, cadangan) => { const s = lat == null ? null : cari(lat, lon); return s ? s.split("|").concat([null, null]).slice(0, 3) : cadangan; };
  for (const r of regu) tambah(r.tanggal, lok(r.lat, r.lon, [r.prov, r.kab, null]), "karhutla", r.status, "regu");
  for (const r of warga) tambah(r.tanggal, lok(r.lat, r.lon, [null, null, null]), r.bahaya, "terjadi", "warga");
  for (const r of konfirmasi) tambah(r.tanggal, [null, r.kab, null], KODE_JENIS[r.kode] || r.kode, r.terjadi ? "terjadi" : "tidak_terjadi", "konfirmasi");
  const b = v => v === "" ? null : v;
  return [...peta].map(([k, n]) => { const [tanggal, prov, kab, kec, jenis, status, sumber] = k.split("\t"); return {tanggal, prov: b(prov), kab: b(kab), kec: b(kec), jenis, status, sumber, n}; })
    .sort((a, c) => (a.tanggal + a.sumber + a.kab + a.kec + a.jenis + a.status).localeCompare(c.tanggal + c.sumber + c.kab + c.kec + c.jenis + c.status));
}

const tanpaTabel = e => /no such (table|column)/i.test(String(e?.message || e));
async function label(env, req, url, kini = Date.now()) {
  const tolak = await periksaToken(env, req); if (tolak) return tolak;
  const sejak = url.searchParams.get("sejak") || wib(kini - 30 * HARI);
  if (!tglSah(sejak)) return gagal(400, "sejak harus YYYY-MM-DD");
  const ms = Date.parse(sejak + "T00:00:00+07:00"), q = async (sql, ...b) => { try { return (await env.DB.prepare(sql).bind(...b).all()).results; } catch (e) { if (tanpaTabel(e)) return []; throw e; } };
  const [regu, warga, konfirmasi] = await Promise.all([
    q(`SELECT date(coalesce(padam_pada, konfirmasi_pada) / 1000 + 25200, 'unixepoch') tanggal, lat, lon, prov, kab,
        CASE WHEN padam_pada IS NOT NULL THEN 'padam' WHEN status = 'bukan_api' THEN 'bukan_api' ELSE 'menyala' END status
        FROM tugas_api WHERE dummy = 0 AND coalesce(padam_pada, konfirmasi_pada) >= ?1 LIMIT ${MAKS}`, ms),
    q(`SELECT date(dibuat / 1000 + 25200, 'unixepoch') tanggal, lat, lon, bahaya FROM laporan WHERE disembunyikan = 0 AND dibuat >= ?1 LIMIT ${MAKS}`, ms),
    q(`SELECT kab, tanggal, kode, terjadi FROM prediksi_konfirmasi WHERE tanggal >= ?1 LIMIT ${MAKS}`, sejak)]);
  let W = null; try { W = await wilayah(env); } catch (e) { console.error("wilayah label", e.message); }
  const baris = labelHarian({regu, warga, konfirmasi}, (la, lo) => W ? cariWilayah(W, la, lo) : null);
  return json({sejak, n: baris.length, label: baris}, 200, {"cache-control": "no-store"});
}
export const RUTE_LABEL = {"GET /api/pipa/label": (env, req, url) => label(env, req, url)};
