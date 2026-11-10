/* Siklus Bencana: rute dummy (DESAIN-TEKNIS 9, KEAMANAN UJ-KP-13). POST /api/siklus/dummy {aksi: isi|hapus, halaman, periode?, kab4?}; Super Admin saja (gerbang peran di src/siklus.js).
   TIDAK menyentuh env.DB: SQL ada di hak.js. Halaman `kejadian` menyemai tabel sk_* (tiap ember: 7 fase, satu sumber ambigu, satu tanpa_wilayah, dua sumber dengan selisih);
   kaji G2: 5 kaji (semua status) pada kejadian gempa dummy;
   Jitupasna G3: 5 status, R3P 6 status, kegiatan 4 status, sk_harga dummy; hitung memakai hitungJitupasna yang SAMA dengan rute produksi; rantai kejadian, kaji, Jitupasna, R3P saling tertaut;
   halaman `paparan` tanpa tabel: hanya memeriksa berkas contoh di R2 siklus/saji/_dummy/paparan/ (src/siklus_paparan.js). `hapus` membuang SEMUA baris dummy, anak sebelum induk, satu batch.
   Dummy tidak ikut ingest/jendela, publik, atau R2 nyata (kolom dummy = 1 disaring di hak.js). */
import {json, gagal, acak} from "./worker.js";
import {tolak, tglSah} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {bodi, masukan, kab4Sah, ujiLaju} from "./siklus_kejadian.js";
import {idKejadian, kunciPendiri, FASE} from "./siklus_hitung.js";
import {contohAda} from "./siklus_paparan.js";
import {hitungJitupasna} from "./siklus_pulih.js";
import "../public/gempa/pager.js";   // GempaPager: fungsi rentang yang sama dengan layar dan kaji_gempa.py (uji_js_pager.py)

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
  /* kaji dummy (G2): 5 status pada kejadian gempa dummy; rentang dari PAGER yang sama pada MMI contoh {6: 1 jt, 7: 500 rb, 8: 200 rb} (RU UJ-F3-02: [22,1; 353,8]); versi 1..5 dihitung hak.js */
  const pg = globalThis.GempaPager.hitung({6: 1e6, 7: 5e5, 8: 2e5}), r1 = x => Math.round(x * 10) / 10;
  const ringkas = JSON.stringify({rentang: [r1(pg.bawah), r1(pg.atas)], kelas: pg.kelas, model: {pager: [r1(pg.bawah), r1(pg.atas)]}}), mas = JSON.stringify({sumber: "contoh", id: "contoh-mmi", produk: "cont_mmi.json (contoh)", waktu_data: tm});
  const galat = JSON.stringify({kalibrasi: 3.06, faktor_loo: 5.34, n_gempa: 8});
  let kajiDipakai = null;
  for (const status of ["menunggu_data", "dihitung", "diperiksa", "dipakai", "ditarik"])
    st.push(H.skStmtKajiBaru(c.env, p, {id: status === "dipakai" ? (kajiDipakai = acak(8)) : acak(8), kejadian_id: id[3], model: "gempa", status, masukan: mas, ringkas: status === "menunggu_data" ? '{"rentang":null}' : ringkas, galat_kalibrasi: status === "menunggu_data" ? null : galat,
      alasan_tarik: status === "ditarik" ? "contoh: masukan MMI diperbaiki" : null, kini, oleh, dummy: 1}));
  const g3 = await isiPulih(c, st, {kejadian: id[3], kaji: kajiDipakai, kab4, dari});
  st.push(H.skStmtJejak(c.env, p, oleh, "dummy", acak(8), "isi_dummy", null, "kejadian", `${dari} ${kab4}`, kini, 1));
  await H.skBatch(c.env, p, st);
  const per = {sk_kejadian: 7, sk_kejadian_kab: 7, sk_kejadian_sumber: 4, sk_kaji: 5, sk_jejak: 8, ...g3};
  return json({dibuat: Object.values(per).reduce((a, b) => a + b, 0), dihapus: 0, per_tabel: per, contoh: false});
}

/* G3 (SK-079): rantai F1 sampai F4 pada kejadian gempa dummy yang sudah transisi. Jitupasna versi 1..5 berstatus dibuka, pengumpulan, dihitung, ditinjau, final; R3P versi 1..6 dari yang final; 4 kegiatan pada R3P yang berjalan.
   Baris diisi selagi Jitupasna masih dibuka (trigger sk_jitupasna_final), nilai dibekukan lewat hitungJitupasna, lalu status dinaikkan. Menambah pernyataan ke `st`; mengembalikan hitungan per tabel. */
async function isiPulih(c, st, {kejadian, kaji, kab4, dari}) {
  const p = c.h.pelaku, kini = c.kini, oleh = c.h.oleh, TH = 2026, prov = kab4.slice(0, 2);
  const hargaRows = [["perumahan", "hancur", 300e6], ["perumahan", "rb", 100e6], ["perumahan", "rs", 50e6], ["perumahan", "rr", 20e6], ["pendidikan", "rb", 150e6]].map(([sektor, tingkat, harga_rp]) => ({id: acak(8), sektor, tingkat, harga_rp, satuan: "unit"}));
  for (const h of hargaRows) st.push(H.skStmtHargaBaru(c.env, p, {...h, tahun: TH, kab4: null, dokumen: "Contoh HSBGN (dummy)", kini, oleh, dummy: 1}));
  const STATUS = ["dibuka", "pengumpulan", "dihitung", "ditinjau", "final"], jid = STATUS.map(() => acak(8)); let nBaris = 0;
  STATUS.forEach((ke, i) => {
    const id = jid[i], tabel = i >= 1 ? [["rusak", "perumahan", "rb", 10], ["rusak", "perumahan", "rs", 20], ["rusak", "perumahan", "rr", 30], ["rusak", "pendidikan", "rb", 2], ["rugi", "perumahan", "air_minum", 2e6, 3]] : [];
    const baris = tabel.map((r, k) => ({id: acak(8), jenis: r[0], sektor: r[1], tingkat: r[0] === "rusak" ? r[2] : null, unit: r[0] === "rusak" ? r[3] : null, komponen: r[0] === "rugi" ? r[2] : null, arus_rp: r[0] === "rugi" ? r[3] : null, bulan: r[0] === "rugi" ? r[4] : null, klien_id: `dummy-${id}-${k}`}));
    st.push(H.skStmtJitupasnaDummy(c.env, p, {id, kejadian_id: kejadian, kaji_id: i >= 2 ? kaji : null, prov, kab4, tim_sk: "Contoh SK Tim PDNA", versi: i + 1, induk_id: i ? jid[i - 1] : null, kini, oleh}));
    for (const b of baris) st.push(H.skStmtBaris(c.env, p, id, b, kini, oleh, 1));
    nBaris += baris.length;
    if (i >= 1) st.push(H.skStmtJitupasnaStatus(c.env, p, id, "dibuka", "pengumpulan", kini));
    if (i >= 2) { const {hasil, nilai} = hitungJitupasna(baris, hargaRows, TH, kini); st.push(H.skStmtBarisNilai(c.env, p, id, nilai), H.skStmtHitung(c.env, p, id, TH, JSON.stringify(hasil), kini)); }
    if (i >= 3) st.push(H.skStmtJitupasnaStatus(c.env, p, id, "dihitung", "ditinjau", kini));
    if (i >= 4) st.push(H.skStmtJitupasnaStatus(c.env, p, id, "ditinjau", "final", kini));
  });
  const final = jid[4], r3p = [0, 1, 2, 3, 4, 5].map(() => acak(8)), pem = await H.skPemulihanDummyId(c.env);
  r3p.forEach(id => st.push(H.skStmtR3pBaru(c.env, p, id, final, kini, oleh)));
  const KEG = [["permukiman", "Hunian tetap (contoh)", 100, "unit", 800e6, "rencana", null], ["infrastruktur", "Jembatan gantung (contoh)", 2, "unit", 200e6, "berjalan", pem], ["sosial", "Sekolah darurat (contoh)", 10, "kelas", 100e6, "selesai", null], ["ekonomi", "Modal usaha (contoh)", 50, "usaha", 50e6, "macet", null]];
  for (const [sektor, nama, target, satuan, nilai_rp, status, taut] of KEG) st.push(H.skStmtKegiatanBaru(c.env, p, r3p[4], {id: acak(8), sektor, nama, target, satuan, nilai_rp, status, tautan_jenis: taut ? "pemulihan" : null, tautan_id: taut}, kini, oleh, 1));
  const tgl = new Date(Date.parse(dari + "T00:00:00Z") + 5 * HARI).toISOString().slice(0, 10), v = {no_keputusan: "Contoh SK/1/2026", tgl_keputusan: tgl, penandatangan: "Contoh Gubernur"};
  const URUT = ["draf", "diusulkan", "disetujui_pm", "ditetapkan_resmi", "berjalan", "selesai"];
  r3p.forEach((id, k) => {
    for (let j = 1; j <= k; j++) st.push(URUT[j] === "disetujui_pm" ? H.skStmtR3pSetuju(c.env, p, id, "staf:dummy-pm", kini) : H.skStmtR3pStatus(c.env, p, id, URUT[j - 1], URUT[j], URUT[j] === "ditetapkan_resmi" ? v : null, kini));
  });
  return {sk_harga: hargaRows.length, sk_jitupasna: 5, sk_jitupasna_baris: nBaris, sk_r3p: 6, sk_r3p_kegiatan: KEG.length};
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
