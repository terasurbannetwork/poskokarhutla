/* Peta peluang api 7 hari (model P1, EKSPERIMENTAL; kontrak di docs/riset/RISIKO-MINGGUAN.md "Kontrak data"). Pipeline mengunggah dua berkas JSON polos
   (tanpa Content-Encoding) ke R2 MEDIA awalan risiko/: BUKAN ke public/data/ dan BUKAN lewat /api/v1. Publik baru sesudah model lolos syarat uji prospektif.
   Yang boleh membaca hanya yang masuk: admin (token/sesi) atau akun pemirsa, gerbang yang sama dengan dokumentasi /api di worker.js.
   Auth PERTAMA, sebelum R2: tamu tak boleh tahu apakah berkasnya ada. Berkas diteruskan sebagai aliran, tidak diurai. */
import {json, adminOK} from "./worker.js";
import {pemirsaSesi} from "./pemirsa.js";

export const MAKS_BYTE = 8 * 1024 * 1024;   // lebih besar dari ini = pipeline salah tulis: 500, bukan dikirim ke peramban
const H = {"cache-control": "private, no-store", vary: "cookie"};   // per orang: tak boleh masuk cache CDN atau peramban bersama

/* satu pemeriksaan untuk semua rute di sini (data dan penanda /akses): admin atau akun pemirsa, persis gerbang dokumentasi /api */
const masuk = async (env, req) => !!(await adminOK(env, req) || await pemirsaSesi(env, req));

const layani = kunci => async (env, req) => {
  const kepala = req.method === "HEAD";
  if (!await masuk(env, req)) return json({galat: "perlu masuk (admin atau akun pemirsa)"}, 401, H);
  if (!env.MEDIA) return json({galat: "penyimpanan belum tersedia", status: "tanpa_penyimpanan"}, 503, H);
  const o = await (kepala ? env.MEDIA.head(kunci) : env.MEDIA.get(kunci));
  if (!o?.size) return json({galat: "peta peluang 7 hari belum terbit", status: "belum_ada"}, 503, H);   // berkas kosong = unggahan gagal, sama dengan belum ada (peramban tak boleh mengurai badan kosong)
  if (o.size > MAKS_BYTE) {
    console.error("risiko7: berkas terlalu besar", kunci, o.size);
    o.body?.cancel().catch(() => {});
    return json({galat: `berkas ${o.size} byte, batas ${MAKS_BYTE}`, status: "terlalu_besar"}, 500, H);
  }
  return new Response(kepala ? null : o.body, {headers: {"content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", ...H}});
};

/* penanda untuk UI: SELALU 200 {masuk: true|false} dan tanpa menyentuh R2, jadi tamu tidak memicu 401 merah di konsol peramban. Hanya memberi tahu
   peminta tentang sesinya sendiri; galat infrastruktur (mis. D1 mati) tetap 500 dari rute(), bukan "masuk:false" yang menyesatkan. */
const akses = async (env, req) => json({masuk: await masuk(env, req)}, 200, H);

/* HEAD didaftarkan sendiri: rute() hanya meneruskan "METODE /jalur" yang ada di tabel (metode lain pada jalur ini = 405) */
export const RUTE_RISIKO7 = {
  "GET /api/risiko7": layani("risiko/terbaru.json"),
  "HEAD /api/risiko7": layani("risiko/terbaru.json"),
  "GET /api/risiko7/prospektif": layani("risiko/prospektif.json"),
  "HEAD /api/risiko7/prospektif": layani("risiko/prospektif.json"),
  "GET /api/risiko7/akses": akses,
  "HEAD /api/risiko7/akses": akses,
};
