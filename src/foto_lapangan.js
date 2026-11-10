/* Foto laporan lapangan di overlay Foto peta utama, KHUSUS staf login (keputusan pemilik 9 Nov 2026; data/kajian-bnpb/lapangan/KEPUTUSAN-LAPANGAN.md).
   Dua sumber: foto logbook /petugas (lp_logbook_foto, R2 lapangan/logbook/) dan uji pilot (uji_pilot_lapor, R2 uji-pilot/<id>).
   Penjaga = modOK (ADMIN_TOKEN, sesi admin; akun gerbang AKUN_SITUS* itu pemirsa dan DITOLAK) ATAU sesi staf nyata (stafSesi), pola aktor() di src/pantau.js. Tamu: 403, tanpa isi.
   TIDAK PERNAH keluar: nama, orang_id, regu, ip_hash, kunci R2, sha256, token uji pilot. Foto absen (lp_absen) dan foto acuan wajah tidak ada di sini sama sekali.
   Satu kueri per sumber saat overlay dibuka (kuota baca D1 Free), tanpa cron dan tanpa cache tepi (respons per pengguna). Indeks waktu: migrasi 0114 (opsional, kode jalan tanpanya). */
import {json, gagal} from "./worker.js";
import {modOK} from "./posko.js";
import {stafSesi} from "./staf.js";
import {wilayah, cariWilayah} from "./titik.js";

const HARI = 864e5, UMUR = 90 * HARI, BATAS = 500, RE_ID = /^[0-9a-f]{16}$/;
const KEPALA = {"cache-control": "private, no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow"};
const TIPE = new Set(["image/jpeg", "image/webp"]);
const boleh = async (env, req, kini) => !!(await modOK(env, req) || await stafSesi(env, req, kini));
const tanpaTabel = e => /no such table/i.test(String(e?.message || e));
const tolak = () => gagal(403, "foto laporan lapangan hanya untuk staf yang masuk", {"cache-control": "private, no-store"});

async function daftar(env, req, url, kini) {
  if (!await boleh(env, req, kini)) return tolak();
  const sejak = kini - UMUR, Q = async (sql) => { try { return (await env.DB.prepare(sql).bind(sejak).all()).results; } catch (e) { if (tanpaTabel(e)) return []; throw e; } };
  const [lb, up] = await Promise.all([
    Q(`SELECT f.id, f.lat, f.lon, f.waktu, l.kegiatan ket FROM lp_logbook_foto f JOIN lp_logbook l ON l.id = f.logbook_id
       WHERE f.waktu > ?1 AND f.dummy = 0 AND l.dummy = 0 AND f.lat IS NOT NULL AND f.lon IS NOT NULL ORDER BY f.waktu DESC LIMIT ${BATAS}`),
    Q(`SELECT id, lat, lon, diambil waktu, tahap ket FROM uji_pilot_lapor WHERE diambil > ?1 AND dummy = 0 AND mime IS NOT NULL ORDER BY diambil DESC LIMIT ${BATAS}`)]);
  let W = null; try { W = await wilayah(env); } catch (e) { /* tanpa wilayah: kab/kec kosong */ }
  const bentuk = (sumber, r) => { const k = W && cariWilayah(W, r.lat, r.lon), [prov, kab, kec] = k ? k.split("|") : ["", "", ""];
    return {id: r.id, sumber, lat: r.lat, lon: r.lon, waktu: r.waktu, prov, kab, kec, ket: r.ket}; };
  const foto = [...lb.map(r => bentuk("logbook", r)), ...up.map(r => bentuk("uji_pilot", r))].sort((a, b) => b.waktu - a.waktu).slice(0, BATAS);
  return json({foto}, 200, {"cache-control": "private, no-store"});
}

async function media(env, req, url, kini, sumber, id) {
  if (!await boleh(env, req, kini)) return tolak();
  if (!RE_ID.test(id) || !env.MEDIA) return gagal(404, "foto tidak ada");
  const sejak = kini - UMUR; let kunci = null;
  try {
    if (sumber === "logbook") {
      const r = await env.DB.prepare(`SELECT f.foto_key k FROM lp_logbook_foto f JOIN lp_logbook l ON l.id = f.logbook_id WHERE f.id = ? AND f.waktu > ? AND f.dummy = 0 AND l.dummy = 0 AND f.lat IS NOT NULL`).bind(id, sejak).first();
      if (r && /^lapangan\/logbook\/[0-9a-f]{16}\.jpg$/.test(r.k)) kunci = r.k;
    } else {
      const r = await env.DB.prepare("SELECT id FROM uji_pilot_lapor WHERE id = ? AND diambil > ? AND dummy = 0 AND mime IS NOT NULL").bind(id, sejak).first();
      if (r) kunci = `uji-pilot/${id}${url.searchParams.get("t") === "1" ? "_t" : ""}`;   // kunci dari id baris D1, bukan dari klien
    }
  } catch (e) { if (tanpaTabel(e)) return gagal(404, "foto tidak ada"); throw e; }
  const o = kunci && await env.MEDIA.get(kunci), tipe = o?.httpMetadata?.contentType;
  if (!o || !TIPE.has(tipe)) { o?.body?.cancel?.(); return gagal(404, "foto tidak ada"); }
  return new Response(o.body, {headers: {...KEPALA, "content-type": tipe}});
}

export const RUTE_FOTO_LAPANGAN = {
  "GET /api/foto/lapangan": daftar,
  "GET /api/foto/lapangan/media/logbook/:id": (env, req, url, kini, ctx, id) => media(env, req, url, kini, "logbook", id),
  "GET /api/foto/lapangan/media/uji_pilot/:id": (env, req, url, kini, ctx, id) => media(env, req, url, kini, "uji_pilot", id),
};
