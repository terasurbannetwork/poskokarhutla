/* Siklus Bencana: rute dummy (DESAIN-TEKNIS 9, KEAMANAN UJ-KP-13). POST /api/siklus/dummy {aksi: isi|hapus, halaman, periode?, kab4?}; Super Admin saja (gerbang peran di src/siklus.js).
   TIDAK menyentuh env.DB: SQL ada di hak.js. Halaman `kejadian` menyemai tabel sk_* (tiap ember: 7 fase, satu sumber ambigu, satu tanpa_wilayah, dua sumber dengan selisih);
   halaman `paparan` tanpa tabel: hanya memeriksa berkas contoh di R2 siklus/saji/_dummy/paparan/ (src/siklus_paparan.js). `hapus` membuang SEMUA baris dummy, anak sebelum induk, satu batch.
   Dummy tidak ikut ingest/jendela, publik, atau R2 nyata (kolom dummy = 1 disaring di hak.js). */
import {json, gagal, acak} from "./worker.js";
import {tolak, tglSah} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {bodi, masukan, kab4Sah, ujiLaju} from "./siklus_kejadian.js";
import {idKejadian, kunciPendiri, FASE} from "./siklus_hitung.js";
import {contohAda} from "./siklus_paparan.js";

const HARI = 864e5, HALAMAN = ["kejadian", "paparan"];
const FASE_DUMMY = [...FASE, "dibatalkan"];   // 7 fase
const JENIS = ["banjir", "longsor", "cuaca", "gempa", "karhutla", "kekeringan", "gelombang"];
const tglGeser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * HARI).toISOString().slice(0, 10);
const dampak = (m, d, t) => JSON.stringify({meninggal: {n: m, y: "resmi", t}, terdampak: {n: d, y: "resmi", t}});

async function isiKejadian(c, periode, kab4, akhir) {
  const p = c.h.pelaku, dari = periode, sampai = akhir ?? tglGeser(dari, 30), span = Math.round((Date.parse(sampai) - Date.parse(dari)) / HARI);
  const ada = await H.skDummyKejadianAda(c.env, p, dari, sampai);
  if (ada) return gagal(409, `sudah ada ${ada} baris hidup di periode ini; hapus dulu`);
  const kini = c.kini, oleh = c.h.oleh, nama = n => `Contoh ${n}`;
  const calon = [];   // tiap kejadian: kandidat id n = 1..3 (id nyata yang sama dilewati)
  for (let i = 0; i < 7; i++) { const k = kunciPendiri([JENIS[i]], kab4, tglGeser(dari, Math.min(i, span))); calon.push([await idKejadian(k, 1), await idKejadian(k, 2), await idKejadian(k, 3)]); }
  const terpakai = new Set(await H.skIdTerpakai(c.env, p, calon.flat()));
  const id = calon.map(a => a.find(x => !terpakai.has(x)));
  if (id.some(x => !x)) return gagal(409, "ID bentrok; ganti periode");
  const st = [];
  for (let i = 0; i < 7; i++) {
    const mulai = tglGeser(dari, Math.min(i, span));
    st.push(H.skStmtKejadianBaru(c.env, p, {id: id[i], jenis: JENIS[i], nama: nama(`${JENIS[i]} ${FASE_DUMMY[i]}`), prov: kab4.slice(0, 2), kab4, mulai, fase: FASE_DUMMY[i], asal: "manual", kini, oleh, dummy: 1}),
      H.skStmtKab(c.env, p, id[i], kab4, kini, 1), H.skStmtJejak(c.env, p, oleh, "kejadian", id[i], "buat", null, FASE_DUMMY[i], "contoh", kini, 1));
  }
  const tm = dari, sumber = (s, kode, kid, status, over) => H.skStmtSumberBaru(c.env, p, {id: acak(8), sumber: s, kode: `dummy-${id[0]}-${kode}`, kejadian_id: kid, status, jenis: "banjir", kab4, mulai: tm, diambil: kini, kini, dummy: 1, ...over});
  st.push(sumber("dibi", "a", id[2], "terpasang", {dampak: dampak(5, 1200, tm)}), sumber("glide", "b", id[2], "terpasang", {dampak: dampak(8, 1500, tm)}),
    sumber("dibi", "c", null, "ambigu", {kandidat: JSON.stringify([id[1], id[2]])}), sumber("gdacs", "d", null, "tanpa_wilayah", {kab4: null}));
  st.push(H.skStmtJejak(c.env, p, oleh, "dummy", acak(8), "isi_dummy", null, "kejadian", `${dari} ${kab4}`, kini, 1));
  await H.skBatch(c.env, p, st);
  return json({dibuat: 7 + 7 + 4 + 8, dihapus: 0, per_tabel: {sk_kejadian: 7, sk_kejadian_kab: 7, sk_kejadian_sumber: 4, sk_jejak: 8}, contoh: false});
}

async function hapusSemua(c) {
  const p = c.h.pelaku, st = H.skStmtDummyHapus(c.env, p);
  st.push(H.skStmtJejak(c.env, p, c.h.oleh, "dummy", acak(8), "hapus_dummy", null, null, null, c.kini, 0));   // jejak nyata bertahan sesudah dummy dibuang
  const res = await H.skBatch(c.env, p, st), per = {};
  H.SK_DUMMY_TABEL.forEach((t, i) => { per[t] = res[i].meta.changes; });
  return json({dibuat: 0, dihapus: Object.values(per).reduce((a, b) => a + b, 0), per_tabel: per, contoh: false});
}

async function dummy(c) {
  const b = await bodi(c);
  const v = masukan(() => {
    if (b.aksi !== "isi" && b.aksi !== "hapus") tolak("aksi harus isi atau hapus");
    if (b.aksi === "isi" && !HALAMAN.includes(b.halaman)) tolak(`halaman harus salah satu dari ${HALAMAN.join(", ")}`);
    /* periode: "YYYY-MM" | "YYYY-MM-DD" | {dari, sampai?} (layar kejadian) | {kab4, prov, bahaya} (layar paparan) */
    let periode = b.periode, sampai = null, kab = b.kab4;
    if (periode !== null && typeof periode === "object" && !Array.isArray(periode)) {
      if (periode.kab4 != null) kab = kab ?? periode.kab4;
      if (periode.prov != null && !/^\d{2}$/.test(String(periode.prov))) tolak("periode.prov harus 2 digit");
      if (periode.bahaya != null && !/^[a-z_]{3,24}$/.test(String(periode.bahaya))) tolak("periode.bahaya tidak sah");
      sampai = periode.sampai ?? null; periode = periode.dari ?? null;
    }
    if (periode == null) periode = new Date(c.kini + 7 * 36e5).toISOString().slice(0, 7) + "-01";
    else if (typeof periode === "string" && /^\d{4}-\d\d$/.test(periode)) periode += "-01";
    if (!tglSah(periode)) tolak("periode harus YYYY-MM, YYYY-MM-DD, atau {dari, sampai}");
    if (sampai != null && (!tglSah(sampai) || sampai < periode || Date.parse(sampai) - Date.parse(periode) > 366 * HARI)) tolak("sampai harus tanggal sah sesudah dari, paling lama 366 hari");
    return {aksi: b.aksi, halaman: b.halaman, periode, sampai, kab4: kab == null ? "3201" : kab4Sah(kab)};
  });
  const lj = await ujiLaju(c, "sk.dummy", 6); if (lj) return lj;
  if (v.aksi === "hapus") return hapusSemua(c);
  if (v.halaman === "paparan") {
    if (!c.env.MEDIA) return gagal(503, "penyimpanan belum terpasang");
    return (await contohAda(c.env)) ? json({dibuat: 0, dihapus: 0, per_tabel: {}, contoh: true}) : gagal(404, "berkas contoh belum dibuat (jalankan scripts/siklus/dummy_saji.py)");
  }
  return isiKejadian(c, v.periode, v.kab4, v.sampai);
}

export const RUTE_SIKLUS_DUMMY = {"POST /api/siklus/dummy": {izin: ["SA"], f: dummy}};
