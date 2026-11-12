/* Log tindak lanjut Usulan langkah Pantau Dalops (data/kajian-bnpb/tindak-langkah/; skema migrations/0128_dl_tindak.sql; SQL di src/hak.js).
   Baca = hak layar Dalops (modAtauStaf PERAN_DALOPS, termasuk pemirsa baca-saja). Tulis = moderator (modOK) atau staf pusdalops/koordalops,
   staf berwilayah hanya provinsi wilayahnya. BUKAN adminOK: akun gerbang AKUN_SITUS* tidak boleh menulis. Riwayat append-only. */
import {json, gagal, bacaBody} from "./worker.js";
import {modOK} from "./posko.js";
import {stafPeran, modAtauStaf, dalamWilayahStaf} from "./staf.js";
import {dlTindakTerkini, dlTindakRiwayat, dlTindakLaju, dlStmtTindak, dlStmtTindakLog, dlNamaStaf, batchTulis} from "./hak.js";

const PERAN_BACA = ["pusdalops", "koordalops", "pimpinan"], PERAN_TULIS = ["pusdalops", "koordalops"];
const STATUS = ["belum", "proses", "selesai"], HARI = 864e5, MAKS_LAJU = 120, JENDELA_LAJU = 10 * 60e3;
export const RE_KUNCI = /^banjir\|\d{2}\|[^|\u0000-\u001f]{1,80}\|(posko|evakuasi|lereng|kebutuhan|kendala|konfirmasi|pendataan|pantau|lanjut)$/;
const TANPA_CACHE = {"cache-control": "private, no-store"};
const teks = (v, maks) => typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, maks) : "";
const tanpaTabel = e => /no such table: dl_tindak/i.test(String(e?.message || e));
const belumAktif = () => gagal(503, "log tindak lanjut belum diaktifkan (migrasi 0128_dl_tindak belum diterapkan)");

/* pengisi -> nama tampil (Q3): staf dari akunnya, moderator "Moderator", pemirsa tidak pernah menulis */
async function beriNama(env, baris) {
  const ids = [...new Set(baris.map(r => r.oleh).filter(o => o.startsWith("staf:")).map(o => o.slice(5)))];
  const nama = await dlNamaStaf(env, ids);
  return baris.map(({oleh, ...r}) => ({...r, oleh_nama: oleh.startsWith("staf:") ? nama.get(oleh.slice(5)) || "Staf" : "Moderator"}));
}
const penulis = async (env, req) => { const m = await modOK(env, req); return m ? "admin:" + m : stafPeran(env, req, PERAN_TULIS); };

async function terkini(env, req, url, kini) {
  if (!(await modAtauStaf(env, req, PERAN_BACA))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  try {
    const butir = await beriNama(env, await dlTindakTerkini(env, kini - 60 * HARI));
    return json({boleh_tulis: !!(await penulis(env, req)), butir}, 200, TANPA_CACHE);
  } catch (e) { if (tanpaTabel(e)) return belumAktif(); throw e; }
}

async function riwayat(env, req, url) {
  if (!(await modAtauStaf(env, req, PERAN_BACA))) return gagal(401, "masuk sebagai staf Pusdalops, Koordalops, atau Pimpinan");
  const kunci = url.searchParams.get("kunci") || "";
  if (!RE_KUNCI.test(kunci)) return gagal(400, "kunci langkah tidak sah");
  try { return json(await beriNama(env, await dlTindakRiwayat(env, kunci)), 200, TANPA_CACHE); }
  catch (e) { if (tanpaTabel(e)) return belumAktif(); throw e; }
}

async function simpan(env, req, url, kini) {
  const oleh = await penulis(env, req);
  if (!oleh) return gagal(403, "status langkah hanya bisa diubah staf Pusdalops, Koordalops, atau moderator");
  if (oleh.startsWith("staf:") && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman bersesi wajib membawa header x-pb: 1");   // lapis di atas tolakOrigin, sama dengan rute staf lain
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o || {}, kunci = typeof o.kunci === "string" ? o.kunci : "";
  if (!RE_KUNCI.test(kunci)) return gagal(400, "kunci langkah tidak sah");
  if (!STATUS.includes(o.status)) return gagal(400, "status harus salah satu dari: " + STATUS.join(", "));
  if (typeof o.catatan === "string" && o.catatan.trim().length > 300) return gagal(400, "catatan maksimal 300 karakter");
  if (!dalamWilayahStaf(req, [kunci.split("|")[1]])) return gagal(403, "kab/kota ini di luar wilayah akunmu");
  const catatan = teks(o.catatan, 300) || null, langkah = teks(o.langkah, 400) || null;
  try {
    if ((await dlTindakLaju(env, oleh, kini - JENDELA_LAJU)) + 1 > MAKS_LAJU) return gagal(429, `terlalu cepat: maksimal ${MAKS_LAJU} perubahan per 10 menit`);
    await batchTulis(env, [dlStmtTindak(env, kunci, o.status, catatan, oleh, kini), dlStmtTindakLog(env, kunci, o.status, catatan, langkah, oleh, kini)]);
  } catch (e) { if (tanpaTabel(e)) return belumAktif(); throw e; }
  return json({ok: true, kunci, status: o.status, waktu: kini}, 201, TANPA_CACHE);
}

/* digabung ke RUTE_DALOPS (src/dalops.js) */
export const RUTE_TINDAK = {
  "GET /api/dalops/tindak": (env, req, url, kini) => terkini(env, req, url, kini ?? Date.now()),
  "GET /api/dalops/tindak/riwayat": (env, req, url) => riwayat(env, req, url),
  "POST /api/dalops/tindak": (env, req, url, kini) => simpan(env, req, url, kini ?? Date.now()),
};
