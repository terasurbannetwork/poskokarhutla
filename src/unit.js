/* Ruang Unit BNPB: rute baca (RU-019; data/kajian-bnpb/kedeputian/DESAIN-TEKNIS.md §1.4, §4.9, §9.4; KEAMANAN-PRIVASI.md §2.3, §3.2).
   Staf saja. Halaman: hak dulu, tamu 303 ke /admin/masuk?ke= (P-8) tanpa memeriksa kode atau berkas; sesi sah tanpa peran 403 polos (cegah pantulan);
   pemirsa ke tab pertamanya. Data: hak SEBELUM nama dan R2, gagal = 401 (tamu tidak tahu berkas ada); nama di luar DATA_UNIT 404 tanpa menyentuh R2.
   Tanpa D1 selain pemeriksaan sesi di stafOK/modAtauStaf (kuota, RU §7.2). /bnpb/unit* dikecualikan dari gerbang host (src/gerbang_halaman.js halamanTerkunci). */
import {json, gagal, catatHTML} from "./worker.js";
import {stafOK, modAtauStaf, stafSesiSemua} from "./staf.js";
import {pemirsaSesi} from "./pemirsa.js";
import {arahPemirsa} from "./gerbang_halaman.js";
import {halamanBnpbPublik} from "./bnpb.js";

export const P_UNIT_BACA = ["unit", "pimpinan", "koordalops", "pusdalops", "operator_cc"];
export const P_UNIT_TULIS = ["unit", "pimpinan", "koordalops", "pusdalops"];
export const KODE_UNIT = ["perb", "pspb", "spb", "pus", "pd", "ks", "mt", "kpod", "wil", "plp", "ojl", "rrx", "rrp", "rri", "rrs", "ren", "keu", "sdu", "huk", "irt", "dik", "jf"];
/* nama tetap R2 unit/<nama>.json; tiap nama wajib tercatat kelasnya di KEAMANAN-PRIVASI §3.2 di commit yang sama (tak tercatat = kelas T) */
export const DATA_UNIT = ["stok_penyangga", "pendampingan_ikd", "mitigasi_prioritas", "satu_data", "jdih_daerah", "pengadaan", "status_peraturan", "fasilitas_sosial", "kalender_gladi", "kompetensi", "kalender_monev", "rb"];
export const DATA_UNIT_TERBATAS = ["pengadaan"];   // kelas T: modAtauStaf, akun gerbang AKUN_SITUS* ditolak
const JAM = 3600e3, MAKS_BYTE = 8 * 1024 * 1024;
const H_DATA = {"cache-control": "private, max-age=300", vary: "cookie"};

const alihkan = ke => new Response(null, {status: 303, headers: {location: ke, "cache-control": "no-store"}});
const polos403 = () => new Response(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Ruang Unit, Centurisk97</title></head><body><p>Akunmu tidak punya akses Ruang Unit.</p></body></html>`,
  {status: 403, headers: {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-content-type-options": "nosniff", "x-robots-tag": "noindex, nofollow"}});

async function halaman(env, req, url, ctx, berkas, kode) {
  if (!await stafOK(env, req, P_UNIT_BACA)) {
    const p = await pemirsaSesi(env, req);
    if (p) { const ke = arahPemirsa(p, url.pathname, url.search); return ke ? alihkan(ke) : polos403(); }
    if (await stafSesiSemua(env, req)) return polos403();
    return alihkan("/admin/masuk?ke=" + encodeURIComponent(url.pathname + url.search));
  }
  if (kode !== undefined && !KODE_UNIT.includes(kode)) return gagal(404, "unit tidak dikenal");
  catatHTML(env, req, kode ? "/bnpb/unit/" + kode : "/bnpb/unit", ctx);   // K5 PRD: hitungan buka per jalur unit
  const r = await halamanBnpbPublik(env, url, berkas, {pribadi: true});
  r.headers.set("cache-control", "private, no-store"); r.headers.append("vary", "cookie");
  return r;
}

async function indeks(env, req, url, kini) {
  if (!await stafOK(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const o = await env.MEDIA.get("unit/indeks.json");
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return json({galat: "indeks belum diunggah", status: "belum_ada"}, 404, H_DATA); }
  let isi; try { isi = await o.json(); } catch (e) { return gagal(500, "indeks rusak"); }
  const berkas = Array.isArray(isi?.berkas) ? isi.berkas : [];
  /* DT §9.4 butir 3: umur dari waktu unggah R2 (head kelas B, tanpa D1); hanya nama di DATA_UNIT, jalur tidak pernah dirakit dari isi indeks */
  isi.berkas = await Promise.all(berkas.map(async b => {
    if (!DATA_UNIT.includes(b?.nama)) return b;
    const h = await env.MEDIA.head(`unit/${b.nama}.json`).catch(() => null), t = h?.size ? h.uploaded.getTime() : null;
    return {...b, diunggah: t && new Date(t).toISOString(), basi: t == null ? null : typeof b.basi_jam === "number" && kini - t > b.basi_jam * JAM};
  }));
  return json(isi, 200, {...H_DATA, "cache-control": "private, no-store", "x-diperbarui": o.uploaded.toISOString()});
}

async function data(env, req, url, kini, ctx, nama) {
  const t = DATA_UNIT_TERBATAS.includes(nama);   // hak SEBELUM nama dan R2: nama tak dikenal pun 401 untuk yang tak berhak
  if (!await (t ? modAtauStaf : stafOK)(env, req, P_UNIT_BACA)) return gagal(401, "perlu masuk sebagai staf BNPB");
  if (!DATA_UNIT.includes(nama)) return json({galat: "data tidak dikenal", status: "tidak_dikenal"}, 404, H_DATA);
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503);
  const o = await env.MEDIA.get(`unit/${nama}.json`);
  if (!o?.size) { o?.body?.cancel().catch(() => {}); return json({galat: `data ${nama} belum diunggah`, status: "belum_ada"}, 404, H_DATA); }   // 0 byte = unggahan gagal
  if (o.size > MAKS_BYTE) { console.error("unit data terlalu besar", nama, o.size); o.body?.cancel().catch(() => {}); return json({galat: `berkas ${o.size} byte, batas ${MAKS_BYTE}`, status: "terlalu_besar"}, 500); }
  return new Response(o.body, {headers: {"content-type": "application/json; charset=utf-8", ...H_DATA, "x-content-type-options": "nosniff"}});
}

/* router src/worker.js: /bnpb/unit/:kode ([a-z]{2,4}) dan /api/unit/data/:nama ([a-z0-9_]{1,40}) diteruskan sebagai argumen ke-6 */
export const RUTE_UNIT = {
  "GET /bnpb/unit": (env, req, url, kini, ctx) => halaman(env, req, url, ctx, "unit/index"),
  "GET /bnpb/unit/:kode": (env, req, url, kini, ctx, kode) => halaman(env, req, url, ctx, "unit/unit", kode),
  "GET /api/unit/indeks": (env, req, url, kini) => indeks(env, req, url, kini),
  "GET /api/unit/data/:nama": data,
};
