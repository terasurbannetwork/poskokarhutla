/* Kemitraan riset perguruan tinggi: agenda riset BNPB -> mitra berkode -> usulan -> telaah -> berjalan -> luaran -> dipakai kebijakan.
   Rancangan: docs/bnpb/RENCANA-12-JAM.md R3. Skema: migrations/0025_riset.sql (daftar tetap di bawah HARUS sama dengan CHECK-nya; dijaga riset.test.mjs).
   - Mitra tanpa akun: admin mencatat institusi -> KODE 26 hex (hanya sha256 disimpan, bisa dicabut, tampil SEKALI di fragmen #k=). Halaman /riset/mitra.
   - Publik hanya agregat + riset berjalan/selesai TANPA kontak PIC dan tanpa nama ketua. Kontak PIC hanya admin (modOK) dan mitra itu sendiri.
   - Institusi tunggal (C7): identitas, PIC, dan PKS riset tinggal di institusi + institusi_perjanjian (migrasi 0023, kode di src/relawan.js); mitra_riset hanya menempelkan kode riset + unit ke institusi.
   ponytail: satu GET admin memuat semua tab (<= 500 baris per tabel); pecah per tab bila antrean melewati itu. */
import {json, gagal, acak, bacaBody, cacheTepi} from "./worker.js";
import REGISTRY from "./bencana.generated.js";
import {tx, tglSah, wib, modOK, superOK} from "./posko.js";
import {halamanAdmin} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import {laju, lajuIP, kodeBaru, pemegangKode, halamanBnpbPublik} from "./bnpb.js";
import {cekInstitusi, cekPerjanjian, sisipInstitusi, sisipPerjanjian, pilihPerjanjian, institusiDummy, hapusInstitusiYatim} from "./relawan.js";

const JAM = 3600e3, HARI = 24 * JAM;

/* ================================================================ daftar tetap (sama dengan CHECK migrasi 0025) */
export const TEMA = {peringatan_dini: "Peringatan dini", pemodelan_bahaya: "Pemodelan bahaya", kerentanan_sosial: "Kerentanan sosial", logistik: "Logistik", rehab_rekon: "Rehabilitasi dan rekonstruksi",
  kebijakan_anggaran: "Kebijakan dan anggaran", kesehatan: "Kesehatan", teknologi: "Teknologi", lainnya: "Lainnya"};
export const STATUS_AGENDA = ["buka", "tutup"];
export const STATUS = ["diajukan", "ditelaah", "revisi", "disetujui", "ditolak", "berjalan", "laporan_akhir", "selesai"];
/* alur usulan: dari -> {ke: pelaku}. Trigger riset_usulan_alur di D1 menolak pasangan di luar daftar ini. */
export const ALUR = {diajukan: {ditelaah: "admin"}, ditelaah: {revisi: "admin", disetujui: "admin", ditolak: "admin"}, revisi: {diajukan: "mitra"}, disetujui: {berjalan: "admin"},
  berjalan: {laporan_akhir: "mitra"}, laporan_akhir: {selesai: "admin", berjalan: "admin"}, ditolak: {}, selesai: {}};
export const JENIS_LUARAN = ["artikel", "dataset", "model", "policy_brief", "prototipe"];
export const JENIS_KEMAJUAN = ["kemajuan", "akhir"];
export const STATUS_PERMINTAAN = ["diminta", "disetujui", "ditolak"];
export const BENTUK = {se: "Surat edaran", juknis: "Juknis", model_operasional: "Model operasional", materi_rakor: "Materi rakor", lainnya: "Lainnya"};
export const BENCANA_SAH = [...REGISTRY.bencana.map(b => b.id), "lintas"];
const NAMA_BENCANA = {...Object.fromEntries(REGISTRY.bencana.map(b => [b.id, b.nama])), lintas: "Lintas bencana"};

/* katalog data yang bisa diminta. jalur = alamat publik (bebas diunduh); null = disiapkan admin per permintaan. Semua CC BY 4.0: wajib sitasi.
   Berkas jalur diperiksa ada di riset.test.mjs. */
export const LISENSI = "CC BY 4.0";
const K = (id, nama, bencana, deskripsi, format, cakupan, jalur) => ({id, nama, bencana, deskripsi, format, cakupan, lisensi: LISENSI, jalur});
export const KATALOG = [
  K("titik_panas", "Titik panas terbaru", "karhutla", "Titik panas VIIRS dan MODIS per kecamatan dengan FRP dan keyakinan.", "JSON", "Jendela terbaru, diperbarui berkala", "/data/hotspot.json"),
  K("titik_panas_72", "Titik panas 72 jam", "karhutla", "Titik panas tiga hari terakhir untuk analisis pergerakan api.", "JSON", "72 jam terakhir", "/data/hotspot72.json"),
  K("titik_tahunan", "Titik panas per tahun", "karhutla", "Rekap titik panas tahunan untuk tren jangka panjang.", "JSON", "Beberapa tahun", "/data/titik_tahun.json"),
  K("kumulatif_karhutla", "Titik panas kumulatif", "karhutla", "Kurva kumulatif tahun berjalan dibanding rerata tahun-tahun sebelumnya.", "JSON", "Tahun berjalan dan pembanding", "/data/kumulatif.json"),
  K("luas_resmi", "Luas kebakaran resmi per provinsi", "karhutla", "Indikasi luas kebakaran KLHK SiPongi per provinsi.", "JSON", "Sejak 2018", "/data/luas_resmi.json"),
  K("fwi", "Indeks cuaca kebakaran (FWI)", "karhutla", "FWI harian per sel 0,5 derajat beserta komponen kode kelembapan.", "JSON", "Beberapa hari terakhir dan prakiraan", "/data/fwi.json"),
  K("peluang_karhutla", "Peluang karhutla ansambel", "karhutla", "Peluang melewati ambang FWI dari ansambel 51 anggota.", "JSON", "Prakiraan ke depan", "/data/peluang.json"),
  K("kekeringan_hth", "Hari tanpa hujan", "kekeringan", "Deret hari tanpa hujan per wilayah.", "JSON", "Diperbarui berkala", "/data/kekeringan_hth.json"),
  K("banjir_riwayat", "Riwayat kejadian banjir", "banjir", "Riwayat kejadian banjir dan longsor yang terhimpun.", "JSON", "Riwayat tersedia", "/banjir/data/riwayat.json"),
  K("cuaca_riwayat", "Riwayat peringatan cuaca", "cuaca", "Riwayat peringatan dini cuaca ekstrem.", "JSON", "Riwayat tersedia", "/banjir/data/cuaca_riwayat.json"),
  K("cuaca_arsip_cap", "Arsip peringatan CAP BMKG", "cuaca", "Arsip permanen peringatan CAP BMKG, termasuk poligon.", "JSON (API)", "Sejak arsip dimulai", "/api/cuaca/arsip"),
  K("titik_3jam", "Titik panas FIRMS 3 jam", "karhutla", "Putaran terbaru titik panas FIRMS yang disimpan di basis data.", "JSON (API)", "8 putaran terakhir", "/api/titik"),
  K("neraca_posko", "Neraca harian posko", "karhutla", "Angka agregat regu lapangan per kabupaten (luas, padam, personel).", "JSON (API)", "Harian, parameter prov dan tgl", "/api/neraca?prov=62"),
  K("laporan_warga_agregat", "Laporan warga teragregasi", "lintas", "Laporan warga tanpa data pribadi pelapor, disiapkan admin sesuai permintaan.", "CSV", "Sesuai permintaan", null),
  K("arsip_foto_lapangan", "Metadata foto lapangan", "lintas", "Metadata foto lapangan yang sudah dimoderasi (tanpa berkas asli), disiapkan admin.", "CSV", "Sesuai permintaan", null),
];
const ID_KATALOG = new Set(KATALOG.map(k => k.id));

/* ================================================================ validasi */
const RE_ID = /^[0-9a-f]{16}$/;
/* tautan http/https saja tanpa kredensial/spasi/tanda kutip: null bila kosong, undefined bila tidak sah */
export function tautanSah(v) {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || v.length > 300 || /[\s<>"'\\\u0000-\u001f\u007f]/.test(v)) return undefined;
  try { const u = new URL(v); return (u.protocol === "http:" || u.protocol === "https:") && u.hostname && !u.username && !u.password && u.href.length <= 300 ? u.href : undefined; } catch (e) { return undefined; }
}
export const doiSah = v => v == null || v === "" ? null : typeof v === "string" && /^10\.\d{4,9}\/[^\s<>"'\\]{1,100}$/.test(v) ? v : undefined;
/* opsi: null bila kosong, undefined bila tidak sah (bukan teks, kepanjangan, atau lebih pendek dari min). teks: wajib, kosong = undefined */
const opsi = (v, min, maks) => { const s = tx(v, maks); return s === undefined ? undefined : s == null ? null : s.length >= min ? s : undefined; };
const teks = (v, min, maks) => opsi(v, min, maks) ?? undefined;
const bencanaSah = v => typeof v === "string" && BENCANA_SAH.includes(v) ? v : undefined;
const galatField = (nama, aturan) => ({g: `${nama} ${aturan}`});

function agendaSah(o) {
  const judul = teks(o.judul, 5, 200), latar = opsi(o.latar, 0, 800), luaran = opsi(o.luaran, 0, 400), bencana = bencanaSah(o.bencana);
  if (!judul) return galatField("judul", "5-200 karakter");
  if (latar === undefined) return galatField("latar", "maksimal 800 karakter");
  if (bencana === undefined) return galatField("bencana", `harus salah satu dari ${BENCANA_SAH.join(", ")}`);
  if (typeof o.tema !== "string" || !Object.hasOwn(TEMA, o.tema)) return galatField("tema", `harus salah satu dari ${Object.keys(TEMA).join(", ")}`);
  if (![1, 2, 3].includes(o.prioritas)) return galatField("prioritas", "harus 1, 2, atau 3");
  if (luaran === undefined) return galatField("luaran", "maksimal 400 karakter");
  if (!STATUS_AGENDA.includes(o.status ?? "buka")) return galatField("status", "harus buka atau tutup");
  return {v: {judul, latar: latar ?? "", bencana, tema: o.tema, prioritas: o.prioritas, luaran: luaran ?? "", status: o.status ?? "buka"}};
}
function usulanSah(o) {
  const judul = teks(o.judul, 5, 200), ketua = teks(o.ketua, 2, 100), anggota = opsi(o.anggota, 0, 400), wilayah = teks(o.wilayah, 2, 120), metode = teks(o.metode, 10, 800), luaran = teks(o.luaran_rencana, 3, 400);
  if (!judul) return galatField("judul", "5-200 karakter");
  if (!ketua) return galatField("ketua peneliti", "2-100 karakter");
  if (anggota === undefined) return galatField("anggota", "maksimal 400 karakter");
  const bencana = bencanaSah(o.bencana);
  if (!bencana) return galatField("bencana", `harus salah satu dari ${BENCANA_SAH.join(", ")}`);
  if (!wilayah) return galatField("wilayah", "2-120 karakter");
  if (!metode) return galatField("metode", "10-800 karakter");
  const d = o.data_butuh ?? [];
  if (!Array.isArray(d) || d.length > 12 || new Set(d).size !== d.length || !d.every(x => typeof x === "string" && ID_KATALOG.has(x))) return galatField("data_butuh", "harus daftar id katalog tanpa duplikat (maksimal 12)");
  if (typeof o.mulai !== "string" || !tglSah(o.mulai) || typeof o.selesai !== "string" || !tglSah(o.selesai)) return galatField("jadwal", "mulai dan selesai harus YYYY-MM-DD");
  if (o.selesai < o.mulai) return galatField("jadwal", "selesai tidak boleh sebelum mulai");
  if (!luaran) return galatField("luaran rencana", "3-400 karakter");
  if (o.agenda_id != null && (typeof o.agenda_id !== "string" || !RE_ID.test(o.agenda_id))) return galatField("agenda_id", "tidak sah");
  return {v: {judul, ketua, anggota, bencana, wilayah, metode, data_butuh: d, mulai: o.mulai, selesai: o.selesai, luaran_rencana: luaran, agenda_id: o.agenda_id ?? null}};
}
export function statusPks(sampai, kini) {
  if (!sampai) return {s: "tanpa", sisa: null};
  const sisa = Math.floor((Date.parse(sampai + "T23:59:59+07:00") - kini) / HARI);
  return {s: sisa < 0 ? "kedaluwarsa" : sisa <= 60 ? "hampir" : "berlaku", sisa};
}

/* tabel belum dimigrasi (diterapkan manual) -> 503 bukan 500; transisi ditolak trigger -> 409 */
const aman = fn => async (...a) => {
  try { return await fn(...a); } catch (e) {
    const m = String(e?.message || e);
    if (/no such table/i.test(m)) return gagal(503, "fitur riset belum diaktifkan (migrasi 0025_riset belum diterapkan)");
    if (/transisi status usulan tidak sah/.test(m)) return gagal(409, "transisi status tidak sah");
    throw e;
  }
};
const tolakAdmin = () => gagal(403, "akses ditolak");
const bacaObj = async (req, maks) => { const b = await bacaBody(req, maks); return b.galat ? {r: gagal(b.status || 400, b.galat)} : {o: b.o}; };

/* ================================================================ publik */
const hostDari = u => { try { return u ? new URL(u).hostname : null; } catch { return null; } };
async function ringkas(env, dummy) {
  const sd = dummy ? "" : " AND dummy = 0", su = dummy ? "" : " AND u.dummy = 0", sm = dummy ? "" : " AND m.dummy = 0";
  const q = sql => env.DB.prepare(sql).all().then(r => r.results);
  const [kartu, agenda, mitra, riset, luaran] = await Promise.all([
    env.DB.prepare(`SELECT (SELECT count(*) FROM mitra_riset WHERE dicabut IS NULL${sd}) mitra_aktif,
      (SELECT count(*) FROM riset_usulan WHERE status IN ('berjalan','laporan_akhir')${sd}) berjalan,
      (SELECT count(*) FROM riset_usulan WHERE status = 'selesai'${sd}) selesai,
      (SELECT count(*) FROM riset_luaran WHERE disetujui = 1${sd}) luaran,
      (SELECT count(DISTINCT l.usulan_id) FROM riset_kebijakan k JOIN riset_luaran l ON l.id = k.luaran_id WHERE l.disetujui = 1${sd.replace("dummy", "k.dummy")}) kebijakan`).first(),
    q(`SELECT judul, latar, bencana, tema, prioritas, luaran FROM riset_agenda WHERE status = 'buka'${sd} ORDER BY prioritas, dibuat DESC LIMIT 100`),
    q(`SELECT i.nama institusi, m.unit FROM mitra_riset m JOIN institusi i ON i.id = m.institusi_id WHERE m.dicabut IS NULL${sm} ORDER BY i.nama LIMIT 200`),
    q(`SELECT u.id, u.judul, i.nama institusi, m.unit, u.bencana, u.wilayah, u.status, u.mulai, u.selesai,
      (SELECT count(DISTINCT k.id) FROM riset_kebijakan k JOIN riset_luaran l ON l.id = k.luaran_id WHERE l.usulan_id = u.id AND l.disetujui = 1) kebijakan
      FROM riset_usulan u JOIN mitra_riset m ON m.id = u.mitra_id JOIN institusi i ON i.id = m.institusi_id WHERE u.status IN ('berjalan','laporan_akhir','selesai')${su}
      ORDER BY CASE u.status WHEN 'selesai' THEN 1 ELSE 0 END, u.diubah DESC LIMIT 200`),
    q(`SELECT l.usulan_id, l.jenis, l.judul, l.tautan, l.doi FROM riset_luaran l JOIN riset_usulan u ON u.id = l.usulan_id
      WHERE l.disetujui = 1 AND u.status IN ('berjalan','laporan_akhir','selesai')${su} ORDER BY l.waktu LIMIT 1000`),
  ]);
  const per = new Map(); for (const l of luaran) (per.get(l.usulan_id) || per.set(l.usulan_id, []).get(l.usulan_id)).push({jenis: l.jenis, judul: l.judul, tautan: l.tautan, host: hostDari(l.tautan), doi: l.doi});
  /* id usulan TIDAK keluar: hanya dipakai menyusun luaran per riset */
  return json({kartu, agenda, mitra, riset: riset.map(({id, ...r}) => ({...r, luaran: per.get(id) || []})), katalog: KATALOG, tema: TEMA, bencana: NAMA_BENCANA, jenis_luaran: JENIS_LUARAN, lisensi: LISENSI});
}
async function ringkasPublik(env, req, url, kini, ctx) {
  const dummy = url.searchParams.get("dummy") === "1" && !!await modOK(env, req);
  if (dummy) return ringkas(env, true);
  return cacheTepi(new Request(new URL("/api/riset/ringkas", url), {method: "GET"}), ctx, 300, () => ringkas(env, false));
}

/* ================================================================ mitra (kode) */
const pksInstitusi = async (env, institusiId, kini) => pilihPerjanjian((await env.DB.prepare("SELECT jenis_perjanjian, nomor, mulai, berakhir FROM institusi_perjanjian WHERE institusi_id = ? AND jenis_perjanjian = 'pks_riset' LIMIT 100").bind(institusiId).all()).results, "pks_riset", kini);
const mitraDari = (env, req) => pemegangKode(env, req, "riset", async h => {
  const m = await env.DB.prepare("SELECT m.id, m.institusi_id, i.nama institusi, m.unit, i.pic_nama, m.dummy FROM mitra_riset m JOIN institusi i ON i.id = m.institusi_id WHERE m.kode_sha = ? AND m.dicabut IS NULL").bind(h).first();
  const pks = m && await pksInstitusi(env, m.institusi_id, Date.now());
  return m && {...m, pks_nomor: pks?.nomor ?? null, pks_mulai: pks?.mulai ?? null, pks_sampai: pks?.berakhir ?? null};
});
/* jejak ditulis hanya bila pernyataan sebelumnya mengubah baris (changes() > 0): pembanding kondisi balapan */
const tulisJejak = (env, usulan, dari, ke, oleh, catatan, kini) => env.DB.prepare("INSERT INTO riset_jejak (usulan_id, dari, ke, oleh, catatan, waktu) SELECT ?, ?, ?, ?, ?, ? WHERE changes() > 0").bind(usulan, dari, ke, oleh, catatan, kini);

async function mitraSaya(env, req) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results);
  const [usulan, jejak, kemajuan, luaran, permintaan, agenda] = await Promise.all([
    q("SELECT id, agenda_id, judul, ketua, anggota, bencana, wilayah, metode, data_butuh, mulai, selesai, luaran_rencana, status, nomor_pks, catatan, dibuat, diubah FROM riset_usulan WHERE mitra_id = ? ORDER BY dibuat DESC LIMIT 100", m.id),
    q("SELECT j.usulan_id, j.dari, j.ke, substr(j.oleh, 1, instr(j.oleh || ':', ':') - 1) oleh, j.catatan, j.waktu FROM riset_jejak j JOIN riset_usulan u ON u.id = j.usulan_id WHERE u.mitra_id = ? ORDER BY j.id LIMIT 1000", m.id),
    q("SELECT k.id, k.usulan_id, k.jenis, k.isi, k.tautan, k.waktu FROM riset_kemajuan k JOIN riset_usulan u ON u.id = k.usulan_id WHERE u.mitra_id = ? ORDER BY k.waktu LIMIT 1000", m.id),
    q("SELECT l.id, l.usulan_id, l.jenis, l.judul, l.tautan, l.doi, l.waktu, l.disetujui FROM riset_luaran l JOIN riset_usulan u ON u.id = l.usulan_id WHERE u.mitra_id = ? ORDER BY l.waktu LIMIT 1000", m.id),
    q("SELECT id, usulan_id, dataset, tujuan, status, jalur, catatan, dibuat, diputus FROM riset_permintaan WHERE mitra_id = ? ORDER BY dibuat DESC LIMIT 200", m.id),
    q("SELECT id, judul, bencana, tema, prioritas FROM riset_agenda WHERE status = 'buka' AND dummy = 0 ORDER BY prioritas, dibuat DESC LIMIT 100"),
  ]);
  const {dummy, institusi_id, ...mitra} = m;
  return json({mitra: {...mitra, pks: statusPks(m.pks_sampai, Date.now())}, usulan: usulan.map(u => ({...u, data_butuh: JSON.parse(u.data_butuh)})), jejak, kemajuan, luaran, permintaan, agenda,
    katalog: KATALOG, tema: TEMA, bencana: NAMA_BENCANA, jenis_luaran: JENIS_LUARAN, alur: ALUR});
}
async function agendaTerbuka(env, id, dummy) {
  return id == null || !!await env.DB.prepare("SELECT 1 FROM riset_agenda WHERE id = ? AND status = 'buka' AND dummy = ?").bind(id, dummy).first();
}
async function usulanBaru(env, req, kini) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const b = await bacaObj(req, 6000); if (b.r) return b.r;
  const s = usulanSah(b.o); if (s.g) return gagal(400, s.g);
  if (!await agendaTerbuka(env, s.v.agenda_id, m.dummy)) return gagal(400, "agenda_id tidak ada atau sudah ditutup");
  const l = await laju(env, m.id, "riset.usulan", [[HARI, 10]], kini) || await lajuIP(env, req, "riset.usulan", [[HARI, 30]], kini); if (l) return l;
  const id = acak(8), v = s.v;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO riset_usulan (id, mitra_id, agenda_id, judul, ketua, anggota, bencana, wilayah, metode, data_butuh, mulai, selesai, luaran_rencana, status, dibuat, diubah, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'diajukan', ?, ?, ?)`).bind(id, m.id, v.agenda_id, v.judul, v.ketua, v.anggota, v.bencana, v.wilayah, v.metode, JSON.stringify(v.data_butuh), v.mulai, v.selesai, v.luaran_rencana, kini, kini, m.dummy),
    env.DB.prepare("INSERT INTO riset_jejak (usulan_id, dari, ke, oleh, waktu, dummy) VALUES (?, NULL, 'diajukan', 'mitra', ?, ?)").bind(id, kini, m.dummy),
  ]);
  return json({id, status: "diajukan"}, 201);
}
/* usulan milik mitra ini, atau Response 404 (usulan mitra lain dijawab sama dengan "tidak ada") */
async function usulanMilik(env, m, id) {
  if (!RE_ID.test(id)) return gagal(404, "usulan tidak ditemukan");
  return await env.DB.prepare("SELECT id, status, agenda_id FROM riset_usulan WHERE id = ? AND mitra_id = ?").bind(id, m.id).first() || gagal(404, "usulan tidak ditemukan");
}
/* revisi: hanya saat status revisi; isian diganti utuh lalu kembali diajukan */
async function usulanRevisi(env, req, id, kini) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const u = await usulanMilik(env, m, id); if (u instanceof Response) return u;
  const b = await bacaObj(req, 6000); if (b.r) return b.r;
  const s = usulanSah(b.o); if (s.g) return gagal(400, s.g);
  if (u.status !== "revisi") return gagal(409, `usulan berstatus ${u.status}; hanya status revisi yang bisa diubah`);
  if (!await agendaTerbuka(env, s.v.agenda_id, m.dummy)) return gagal(400, "agenda_id tidak ada atau sudah ditutup");
  const l = await laju(env, m.id, "riset.usulan", [[HARI, 10]], kini); if (l) return l;
  const v = s.v;
  const r = await env.DB.batch([
    env.DB.prepare(`UPDATE riset_usulan SET agenda_id = ?, judul = ?, ketua = ?, anggota = ?, bencana = ?, wilayah = ?, metode = ?, data_butuh = ?, mulai = ?, selesai = ?, luaran_rencana = ?, status = 'diajukan', diubah = ?
      WHERE id = ? AND mitra_id = ? AND status = 'revisi'`).bind(v.agenda_id, v.judul, v.ketua, v.anggota, v.bencana, v.wilayah, v.metode, JSON.stringify(v.data_butuh), v.mulai, v.selesai, v.luaran_rencana, kini, id, m.id),
    tulisJejak(env, id, "revisi", "diajukan", "mitra", null, kini),
  ]);
  return r[0].meta.changes ? json({id, status: "diajukan"}) : gagal(409, "status usulan berubah; muat ulang halaman");
}
async function kemajuanBaru(env, req, id, kini) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const u = await usulanMilik(env, m, id); if (u instanceof Response) return u;
  const b = await bacaObj(req, 4000); if (b.r) return b.r;
  const isi = teks(b.o.isi, 10, 1500), tautan = tautanSah(b.o.tautan), akhir = b.o.akhir === true;
  if (!isi) return gagal(400, "isi laporan 10-1500 karakter");
  if (tautan === undefined) return gagal(400, "tautan harus http:// atau https:// (maks 300 karakter)");
  if (b.o.akhir != null && typeof b.o.akhir !== "boolean") return gagal(400, "akhir harus true/false");
  if (u.status !== "berjalan") return gagal(409, `laporan hanya bisa dikirim saat riset berjalan (status sekarang ${u.status})`);
  const l = await laju(env, m.id, "riset.kemajuan", [[HARI, 20]], kini); if (l) return l;
  const kid = acak(8);
  const r = await env.DB.batch([
    env.DB.prepare("INSERT INTO riset_kemajuan (id, usulan_id, jenis, isi, tautan, waktu, dummy) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM riset_usulan WHERE id = ? AND mitra_id = ? AND status = 'berjalan')")
      .bind(kid, id, akhir ? "akhir" : "kemajuan", isi, tautan, kini, m.dummy, id, m.id),
    ...(akhir ? [env.DB.prepare("UPDATE riset_usulan SET status = 'laporan_akhir', diubah = ? WHERE id = ? AND mitra_id = ? AND status = 'berjalan' AND changes() > 0").bind(kini, id, m.id), tulisJejak(env, id, "berjalan", "laporan_akhir", "mitra", null, kini)] : []),
  ]);
  return r[0].meta.changes ? json({id: kid, status: akhir ? "laporan_akhir" : "berjalan"}, 201) : gagal(409, "status usulan berubah; muat ulang halaman");
}
async function luaranBaru(env, req, id, kini) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const u = await usulanMilik(env, m, id); if (u instanceof Response) return u;
  const b = await bacaObj(req, 3000); if (b.r) return b.r;
  const judul = teks(b.o.judul, 3, 200), tautan = tautanSah(b.o.tautan), doi = doiSah(b.o.doi);
  if (typeof b.o.jenis !== "string" || !JENIS_LUARAN.includes(b.o.jenis)) return gagal(400, `jenis harus salah satu dari ${JENIS_LUARAN.join(", ")}`);
  if (!judul) return gagal(400, "judul luaran 3-200 karakter");
  if (tautan === undefined) return gagal(400, "tautan harus http:// atau https:// (maks 300 karakter)");
  if (doi === undefined) return gagal(400, "DOI tidak sah (contoh 10.1234/abcd)");
  if (!["berjalan", "laporan_akhir", "selesai"].includes(u.status)) return gagal(409, `luaran hanya dicatat saat riset berjalan atau sesudahnya (status sekarang ${u.status})`);
  const l = await laju(env, m.id, "riset.luaran", [[HARI, 20]], kini); if (l) return l;
  const lid = acak(8);
  await env.DB.prepare("INSERT INTO riset_luaran (id, usulan_id, jenis, judul, tautan, doi, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(lid, id, b.o.jenis, judul, tautan, doi, kini, m.dummy).run();
  return json({id: lid}, 201);
}
async function permintaanBaru(env, req, kini) {
  const m = await mitraDari(env, req); if (m instanceof Response) return m;
  const b = await bacaObj(req, 2000); if (b.r) return b.r;
  const tujuan = teks(b.o.tujuan, 10, 500);
  if (typeof b.o.dataset !== "string" || !ID_KATALOG.has(b.o.dataset)) return gagal(400, "dataset tidak ada di katalog");
  if (!tujuan) return gagal(400, "tujuan 10-500 karakter");
  if (b.o.sitasi !== true) return gagal(400, `centang janji sitasi: data berlisensi ${LISENSI}, wajib mencantumkan BNPB dan Pantau Bencana sebagai sumber`);
  if (b.o.usulan_id != null) { if (typeof b.o.usulan_id !== "string") return gagal(400, "usulan_id tidak sah"); const u = await usulanMilik(env, m, b.o.usulan_id); if (u instanceof Response) return u; }
  if (await env.DB.prepare("SELECT 1 FROM riset_permintaan WHERE mitra_id = ? AND dataset = ? AND status = 'diminta'").bind(m.id, b.o.dataset).first()) return gagal(409, "permintaan untuk dataset ini masih menunggu keputusan");
  const l = await laju(env, m.id, "riset.permintaan", [[HARI, 10]], kini) || await lajuIP(env, req, "riset.permintaan", [[HARI, 30]], kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO riset_permintaan (id, mitra_id, usulan_id, dataset, tujuan, sitasi, status, dibuat, dummy) VALUES (?, ?, ?, ?, ?, 1, 'diminta', ?, ?)").bind(id, m.id, b.o.usulan_id ?? null, b.o.dataset, tujuan, kini, m.dummy).run();
  return json({id, status: "diminta"}, 201);
}

/* ================================================================ admin */
const SQL_PERMINTAAN = "SELECT p.id, p.dataset, p.tujuan, p.status, p.jalur, p.catatan, p.dibuat, p.diputus, p.usulan_id, i.nama institusi, p.dummy FROM riset_permintaan p JOIN mitra_riset m ON m.id = p.mitra_id JOIN institusi i ON i.id = m.institusi_id";
const SQL_LUARAN = `SELECT l.id, l.usulan_id, l.jenis, l.judul, l.tautan, l.doi, l.waktu, l.disetujui, u.judul usulan, i.nama institusi, l.dummy,
  (SELECT count(*) FROM riset_kebijakan k WHERE k.luaran_id = l.id) kebijakan FROM riset_luaran l JOIN riset_usulan u ON u.id = l.usulan_id JOIN mitra_riset m ON m.id = u.mitra_id JOIN institusi i ON i.id = m.institusi_id`;
const SQL_KEBIJAKAN = "SELECT k.id, k.luaran_id, k.instansi, k.bentuk, k.tanggal, k.catatan, k.dibuat, k.dummy, l.judul luaran, u.judul usulan, i.nama institusi FROM riset_kebijakan k JOIN riset_luaran l ON l.id = k.luaran_id JOIN riset_usulan u ON u.id = l.usulan_id JOIN mitra_riset m ON m.id = u.mitra_id JOIN institusi i ON i.id = m.institusi_id";
const SQL_USULAN = `SELECT u.id, u.mitra_id, u.agenda_id, u.judul, u.ketua, u.anggota, u.bencana, u.wilayah, u.metode, u.data_butuh, u.mulai, u.selesai, u.luaran_rencana, u.status, u.nomor_pks, u.catatan, u.dibuat, u.diubah, u.dummy,
  i.nama institusi, m.unit, (SELECT judul FROM riset_agenda a WHERE a.id = u.agenda_id) agenda FROM riset_usulan u JOIN mitra_riset m ON m.id = u.mitra_id JOIN institusi i ON i.id = m.institusi_id`;

async function adminSemua(env, req, kini) {
  if (!await modOK(env, req)) return tolakAdmin();
  const q = sql => env.DB.prepare(sql).all().then(r => r.results);
  const [agenda, mitra, usulan, jejak, kemajuan, permintaan, luaran, kebijakan, kartu, pks, institusi] = await Promise.all([
    q("SELECT id, judul, latar, bencana, tema, prioritas, luaran, status, dibuat, diubah, dummy, (SELECT count(*) FROM riset_usulan u WHERE u.agenda_id = riset_agenda.id) usulan FROM riset_agenda ORDER BY status, prioritas, dibuat DESC LIMIT 500"),
    q("SELECT m.id, m.institusi_id, i.nama institusi, m.unit, i.pic_nama, i.pic_email, i.pic_wa, m.dibuat, m.dicabut, m.dummy, (SELECT count(*) FROM riset_usulan u WHERE u.mitra_id = m.id) usulan FROM mitra_riset m JOIN institusi i ON i.id = m.institusi_id ORDER BY m.dicabut IS NOT NULL, m.dibuat DESC LIMIT 500"),
    q(`${SQL_USULAN} ORDER BY CASE u.status WHEN 'diajukan' THEN 0 WHEN 'ditelaah' THEN 1 WHEN 'laporan_akhir' THEN 2 WHEN 'revisi' THEN 4 ELSE 3 END, u.diubah DESC LIMIT 500`),
    q("SELECT usulan_id, dari, ke, oleh, catatan, waktu FROM riset_jejak ORDER BY id DESC LIMIT 2000"),
    q("SELECT usulan_id, jenis, isi, tautan, waktu FROM riset_kemajuan ORDER BY waktu DESC LIMIT 1000"),
    q(`${SQL_PERMINTAAN} ORDER BY p.status != 'diminta', p.dibuat DESC LIMIT 500`),
    q(`${SQL_LUARAN} ORDER BY l.waktu DESC LIMIT 500`),
    q(`${SQL_KEBIJAKAN} ORDER BY k.tanggal DESC LIMIT 500`),
    env.DB.prepare(`SELECT (SELECT count(*) FROM mitra_riset WHERE dicabut IS NULL) mitra_aktif, (SELECT count(*) FROM riset_usulan WHERE status IN ('berjalan','laporan_akhir')) berjalan,
      (SELECT count(*) FROM riset_usulan WHERE status = 'selesai') selesai, (SELECT count(*) FROM riset_usulan WHERE status IN ('diajukan','ditelaah')) antre, (SELECT count(*) FROM riset_luaran) luaran,
      (SELECT count(DISTINCT l.usulan_id) FROM riset_kebijakan k JOIN riset_luaran l ON l.id = k.luaran_id) kebijakan, (SELECT count(*) FROM riset_luaran WHERE disetujui = 0) luaran_antre, (SELECT count(*) FROM riset_permintaan WHERE status = 'diminta') permintaan_antre`).first(),
    q("SELECT institusi_id, jenis_perjanjian, nomor, mulai, berakhir FROM institusi_perjanjian WHERE jenis_perjanjian = 'pks_riset' LIMIT 3000"),
    q("SELECT id, nama FROM institusi ORDER BY nama LIMIT 500"),   // pilihan institusi untuk mitra baru (daftar lengkapnya di tab Institusi)
  ]);
  const pksDari = id => pilihPerjanjian(pks.filter(p => p.institusi_id === id), "pks_riset", kini);
  return json({agenda, institusi, mitra: mitra.map(m => { const p = pksDari(m.institusi_id); return {...m, pks_nomor: p?.nomor ?? null, pks_mulai: p?.mulai ?? null, pks_sampai: p?.berakhir ?? null, pks: statusPks(p?.berakhir, kini)}; }), usulan: usulan.map(u => ({...u, data_butuh: JSON.parse(u.data_butuh)})), jejak, kemajuan, permintaan, luaran, kebijakan, kartu,
    enum: {tema: TEMA, status: STATUS, alur: ALUR, bencana: NAMA_BENCANA, jenis_luaran: JENIS_LUARAN, bentuk: BENTUK, katalog: KATALOG.map(({id, nama, jalur}) => ({id, nama, jalur}))}});
}
async function agendaTulis(env, req, id, kini) {
  const adm = await modOK(env, req); if (!adm) return tolakAdmin();
  const b = await bacaObj(req, 4000); if (b.r) return b.r;
  if (id == null) {
    const s = agendaSah(b.o); if (s.g) return gagal(400, s.g);
    const baru = acak(8), v = s.v;
    await env.DB.prepare("INSERT INTO riset_agenda (id, judul, latar, bencana, tema, prioritas, luaran, status, dibuat, diubah) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(baru, v.judul, v.latar, v.bencana, v.tema, v.prioritas, v.luaran, v.status, kini, kini).run();
    return json({id: baru}, 201);
  }
  if (!RE_ID.test(id)) return gagal(404, "agenda tidak ditemukan");
  const awal = await env.DB.prepare("SELECT judul, latar, bencana, tema, prioritas, luaran, status FROM riset_agenda WHERE id = ?").bind(id).first(); if (!awal) return gagal(404, "agenda tidak ditemukan");
  const s = agendaSah({...awal, ...b.o}); if (s.g) return gagal(400, s.g);
  const v = s.v;
  await env.DB.prepare("UPDATE riset_agenda SET judul = ?, latar = ?, bencana = ?, tema = ?, prioritas = ?, luaran = ?, status = ?, diubah = ? WHERE id = ?").bind(v.judul, v.latar, v.bencana, v.tema, v.prioritas, v.luaran, v.status, kini, id).run();
  return json({id, status: v.status});
}
/* Mitra baru = institusi (yang sudah ada: institusi_id atau nama sama, jadi satu institusi tak pernah punya dua identitas) + kode riset + PKS riset opsional.
   Bila institusi baru, identitas dan PIC divalidasi bersama modul relawan (cekInstitusi). PKS: nomor, mulai, sampai harus lengkap atau kosong semua. */
async function mitraBuat(env, req, url, kini) {
  const adm = await modOK(env, req); if (!adm) return tolakAdmin();
  const b = await bacaObj(req, 3000); if (b.r) return b.r;
  const o = b.o, unit = opsi(o.unit, 2, 120);
  if (unit === undefined) return gagal(400, "unit 2-120 karakter");
  const pakaiPks = ["pks_nomor", "pks_mulai", "pks_sampai"].some(k => o[k] != null && o[k] !== "");
  const pks = pakaiPks ? cekPerjanjian({jenis_perjanjian: "pks_riset", nomor: o.pks_nomor, mulai: o.pks_mulai, berakhir: o.pks_sampai}) : null;
  if (pks?.galat) return gagal(400, pks.galat.replace("perjanjian", "PKS"));
  let id = o.institusi_id, nama, st = [];
  if (id != null) {
    if (typeof id !== "string" || !RE_ID.test(id)) return gagal(400, "institusi_id tidak sah");
    nama = (await env.DB.prepare("SELECT nama FROM institusi WHERE id = ?").bind(id).first())?.nama;
    if (!nama) return gagal(404, "institusi tidak ditemukan");
  } else {
    const c = cekInstitusi({...o, nama: o.institusi}, false); if (c.galat) return gagal(400, c.galat);
    nama = c.v.nama;
    id = (await env.DB.prepare("SELECT id FROM institusi WHERE lower(nama) = lower(?) AND dummy = 0 ORDER BY dibuat LIMIT 1").bind(nama).first())?.id;
    if (!id) { id = acak(8); st.push(sisipInstitusi(env, id, c.v, null, kini, adm)); }
  }
  if (pks && !st.length && await env.DB.prepare("SELECT 1 FROM institusi_perjanjian WHERE institusi_id = ? AND jenis_perjanjian = 'pks_riset' AND nomor = ?").bind(id, pks.v.nomor).first()) return gagal(409, "nomor PKS ini sudah tercatat untuk institusi ini");
  const {kode, kode_sha} = await kodeBaru(), mid = acak(8);
  await env.DB.batch([...st, ...(pks ? [sisipPerjanjian(env, id, pks.v, kini, adm)] : []),
    env.DB.prepare("INSERT INTO mitra_riset (id, institusi_id, unit, kode_sha, dibuat) VALUES (?, ?, ?, ?, ?)").bind(mid, id, unit, kode_sha, kini)]);
  /* kode hanya tampil SEKALI di sini; di fragmen (#k=) supaya tidak masuk log server */
  return json({id: mid, institusi_id: id, institusi: nama, kode, tautan: `${url.origin}/riset/mitra#k=${kode}`}, 201);
}
async function mitraUbah(env, req, id, kini) {
  const adm = await modOK(env, req); if (!adm) return tolakAdmin();
  const b = await bacaObj(req, 3000); if (b.r) return b.r;
  if (!RE_ID.test(id)) return gagal(404, "mitra tidak ditemukan");
  if (b.o.aksi === "cabut") {
    const r = await env.DB.prepare("UPDATE mitra_riset SET dicabut = ? WHERE id = ? AND dicabut IS NULL").bind(kini, id).run();
    if (r.meta.changes) return json({id, dicabut: kini});
    return await env.DB.prepare("SELECT 1 FROM mitra_riset WHERE id = ?").bind(id).first() ? gagal(409, "kode mitra ini sudah dicabut") : gagal(404, "mitra tidak ditemukan");
  }
  if (b.o.aksi === "pks") {   // perbarui PKS terpilih institusinya (atau catat yang pertama)
    const c = cekPerjanjian({jenis_perjanjian: "pks_riset", nomor: b.o.pks_nomor, mulai: b.o.pks_mulai, berakhir: b.o.pks_sampai}); if (c.galat) return gagal(400, c.galat.replace("perjanjian", "PKS"));
    const m = await env.DB.prepare("SELECT institusi_id FROM mitra_riset WHERE id = ?").bind(id).first(); if (!m) return gagal(404, "mitra tidak ditemukan");
    const ada = (await env.DB.prepare("SELECT id, jenis_perjanjian, mulai, berakhir FROM institusi_perjanjian WHERE institusi_id = ? AND jenis_perjanjian = 'pks_riset' LIMIT 100").bind(m.institusi_id).all()).results, cur = pilihPerjanjian(ada, "pks_riset", kini), v = c.v;
    try {
      await (cur ? env.DB.prepare("UPDATE institusi_perjanjian SET nomor = ?, mulai = ?, berakhir = ?, diubah = ?, oleh = ? WHERE id = ?").bind(v.nomor, v.mulai, v.berakhir, kini, adm, cur.id) : sisipPerjanjian(env, m.institusi_id, v, kini, adm)).run();
    } catch (e) { if (/UNIQUE/i.test(e?.message)) return gagal(409, "nomor PKS ini sudah tercatat untuk institusi ini"); throw e; }
    return json({id, pks_nomor: v.nomor, pks_sampai: v.berakhir});
  }
  return gagal(400, "aksi harus cabut atau pks");
}
async function usulanTelaah(env, req, id, kini) {
  const adm = await modOK(env, req); if (!adm) return tolakAdmin();
  const b = await bacaObj(req, 3000); if (b.r) return b.r;
  if (!RE_ID.test(id)) return gagal(404, "usulan tidak ditemukan");
  const u = await env.DB.prepare("SELECT status FROM riset_usulan WHERE id = ?").bind(id).first(); if (!u) return gagal(404, "usulan tidak ditemukan");
  const ke = b.o.ke, catatan = opsi(b.o.catatan, 0, 600), pks = opsi(b.o.nomor_pks, 3, 80);
  if (typeof ke !== "string" || !STATUS.includes(ke)) return gagal(400, `ke harus salah satu dari ${STATUS.join(", ")}`);
  if (catatan === undefined) return gagal(400, "catatan maksimal 600 karakter");
  if (ALUR[u.status]?.[ke] !== "admin") return gagal(409, ALUR[u.status]?.[ke] === "mitra" ? `status ${ke} hanya bisa diajukan mitra` : `usulan berstatus ${u.status} tidak bisa langsung menjadi ${ke}`);
  if ((ke === "revisi" || ke === "ditolak") && (!catatan || catatan.length < 5)) return gagal(400, `${ke === "revisi" ? "revisi" : "penolakan"} wajib disertai catatan (min 5 karakter)`);
  if (ke === "disetujui" && !pks) return gagal(400, "persetujuan wajib mencantumkan nomor PKS (3-80 karakter)");
  const r = await env.DB.batch([
    env.DB.prepare("UPDATE riset_usulan SET status = ?, nomor_pks = coalesce(?, nomor_pks), catatan = coalesce(?, catatan), diubah = ? WHERE id = ? AND status = ?").bind(ke, ke === "disetujui" ? pks : null, catatan, kini, id, u.status),
    tulisJejak(env, id, u.status, ke, `admin:${adm}`, catatan, kini),
  ]);
  return r[0].meta.changes ? json({id, status: ke}) : gagal(409, "status usulan berubah; muat ulang halaman");
}
async function luaranPutus(env, req, id, kini) {
  if (!await modOK(env, req)) return tolakAdmin();
  const b = await bacaObj(req, 500); if (b.r) return b.r;
  if (!RE_ID.test(id)) return gagal(404, "luaran tidak ditemukan");
  if (b.o.aksi !== "setujui" && b.o.aksi !== "tolak") return gagal(400, "aksi harus setujui atau tolak");
  const ya = b.o.aksi === "setujui" ? 1 : 0;
  const r = await env.DB.prepare("UPDATE riset_luaran SET disetujui = ? WHERE id = ?").bind(ya, id).run();
  return r.meta.changes ? json({id, disetujui: ya}) : gagal(404, "luaran tidak ditemukan");
}
async function permintaanPutus(env, req, id, kini) {
  const adm = await modOK(env, req); if (!adm) return tolakAdmin();
  const b = await bacaObj(req, 2000); if (b.r) return b.r;
  if (!RE_ID.test(id)) return gagal(404, "permintaan tidak ditemukan");
  const ke = b.o.ke, catatan = opsi(b.o.catatan, 0, 600), jalur = typeof b.o.jalur === "string" && b.o.jalur.startsWith("/") && !b.o.jalur.startsWith("//") && b.o.jalur.length <= 300 && !/[\s<>"'\\]/.test(b.o.jalur) ? b.o.jalur : tautanSah(b.o.jalur);
  if (ke !== "disetujui" && ke !== "ditolak") return gagal(400, "ke harus disetujui atau ditolak");
  if (catatan === undefined) return gagal(400, "catatan maksimal 600 karakter");
  if (jalur === undefined) return gagal(400, "jalur harus tautan http(s) atau alamat dalam situs (/data/...)");
  if (ke === "disetujui" && !jalur) return gagal(400, "persetujuan wajib mencantumkan jalur/tautan data");
  if (ke === "ditolak" && !catatan) return gagal(400, "penolakan wajib disertai catatan");
  const r = await env.DB.prepare("UPDATE riset_permintaan SET status = ?, jalur = ?, catatan = ?, diputus = ? WHERE id = ? AND status = 'diminta'").bind(ke, ke === "disetujui" ? jalur : null, catatan, kini, id).run();
  if (r.meta.changes) return json({id, status: ke});
  return await env.DB.prepare("SELECT 1 FROM riset_permintaan WHERE id = ?").bind(id).first() ? gagal(409, "permintaan ini sudah diputuskan") : gagal(404, "permintaan tidak ditemukan");
}
async function kebijakanTulis(env, req, id, kini) {
  if (!await modOK(env, req)) return tolakAdmin();
  const b = await bacaObj(req, 2000); if (b.r) return b.r;
  if (id != null) {
    if (b.o.aksi !== "hapus") return gagal(400, "aksi harus hapus");
    if (!RE_ID.test(id)) return gagal(404, "pemanfaatan tidak ditemukan");
    const r = await env.DB.prepare("DELETE FROM riset_kebijakan WHERE id = ?").bind(id).run();
    return r.meta.changes ? json({id, dihapus: true}) : gagal(404, "pemanfaatan tidak ditemukan");
  }
  const instansi = teks(b.o.instansi, 2, 120), catatan = opsi(b.o.catatan, 0, 600);
  if (typeof b.o.luaran_id !== "string" || !RE_ID.test(b.o.luaran_id)) return gagal(400, "luaran_id tidak sah");
  if (!instansi) return gagal(400, "instansi/unit pengguna 2-120 karakter");
  if (typeof b.o.bentuk !== "string" || !Object.hasOwn(BENTUK, b.o.bentuk)) return gagal(400, `bentuk harus salah satu dari ${Object.keys(BENTUK).join(", ")}`);
  if (typeof b.o.tanggal !== "string" || !tglSah(b.o.tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (b.o.tanggal > wib(kini + HARI)) return gagal(400, "tanggal tidak boleh di masa depan");
  if (catatan === undefined) return gagal(400, "catatan maksimal 600 karakter");
  const l = await env.DB.prepare("SELECT dummy FROM riset_luaran WHERE id = ?").bind(b.o.luaran_id).first(); if (!l) return gagal(404, "luaran tidak ditemukan");
  const kid = acak(8);
  await env.DB.prepare("INSERT INTO riset_kebijakan (id, luaran_id, instansi, bentuk, tanggal, catatan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(kid, b.o.luaran_id, instansi, b.o.bentuk, b.o.tanggal, catatan, kini, l.dummy).run();
  return json({id: kid}, 201);
}

/* ekspor CSV: sel berawalan = + - @ tab diberi apostrof (injeksi rumus di Excel/Sheets) */
const CSV = {
  agenda: "SELECT id, judul, bencana, tema, prioritas, luaran, status, dibuat, dummy FROM riset_agenda ORDER BY dibuat",
  /* PKS = yang berakhir paling akhir (ekspor; tampilan memakai pilihPerjanjian: yang berlaku hari ini lebih dulu) */
  mitra: `SELECT m.id, i.nama institusi, m.unit, i.pic_nama, i.pic_email, i.pic_wa, p.nomor pks_nomor, p.mulai pks_mulai, p.berakhir pks_sampai, m.dibuat, m.dicabut, m.dummy FROM mitra_riset m JOIN institusi i ON i.id = m.institusi_id
    LEFT JOIN institusi_perjanjian p ON p.id = (SELECT id FROM institusi_perjanjian WHERE institusi_id = i.id AND jenis_perjanjian = 'pks_riset' ORDER BY berakhir DESC, id LIMIT 1) ORDER BY m.dibuat`,
  usulan: "SELECT u.id, i.nama institusi, u.judul, u.ketua, u.bencana, u.wilayah, u.mulai, u.selesai, u.status, u.nomor_pks, u.dibuat, u.diubah, u.dummy FROM riset_usulan u JOIN mitra_riset m ON m.id = u.mitra_id JOIN institusi i ON i.id = m.institusi_id ORDER BY u.dibuat",
  permintaan: `${SQL_PERMINTAAN} ORDER BY p.dibuat`,
  luaran: `${SQL_LUARAN} ORDER BY l.waktu`,
  kebijakan: `${SQL_KEBIJAKAN} ORDER BY k.tanggal`,
};
const WAKTU = new Set(["dibuat", "diubah", "dicabut", "diputus", "waktu"]);
const sel = (k, v) => { if (v == null) return ""; if (WAKTU.has(k) && typeof v === "number") v = new Date(v).toISOString(); let s = String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };
async function ekspor(env, req, url) {
  if (!await modOK(env, req)) return tolakAdmin();
  const t = url.searchParams.get("tabel") || "";
  if (!Object.hasOwn(CSV, t)) return gagal(400, `tabel harus salah satu dari ${Object.keys(CSV).join(", ")}`);
  const baris = (await env.DB.prepare(CSV[t] + " LIMIT 20000").all()).results, kol = baris.length ? Object.keys(baris[0]) : [];
  return new Response("\ufeff" + [kol.join(","), ...baris.map(r => kol.map(k => sel(k, r[k])).join(","))].join("\r\n"), {headers: {"content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="riset-${t}-${wib(Date.now())}.csv"`, "cache-control": "no-store", "x-content-type-options": "nosniff"}});
}

/* ================================================================ dummy (DUMMY.md): rantai penuh, tiap status minimal satu */
const TABEL_DUMMY = ["riset_kebijakan", "riset_permintaan", "riset_luaran", "riset_kemajuan", "riset_jejak", "riset_usulan", "riset_agenda", "mitra_riset"];
const hitungDummy = async (env, t) => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n;
async function dummyIsi(env, kini) {
  if (await hitungDummy(env, "mitra_riset")) return gagal(409, "data dummy riset sudah ada; hapus dulu dengan 🧹");
  const st = [], tgl = ms => wib(ms), hari = n => kini + n * HARI, id = () => acak(8);
  const agenda = Object.keys(TEMA).map((t, i) => ({id: id(), tema: t, bencana: BENCANA_SAH[i % BENCANA_SAH.length], p: i % 3 + 1, status: i === 8 ? "tutup" : "buka"}));
  agenda.forEach((a, i) => st.push(env.DB.prepare("INSERT INTO riset_agenda (id, judul, latar, bencana, tema, prioritas, luaran, status, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(a.id, `Contoh agenda: ${TEMA[a.tema].toLowerCase()} ${NAMA_BENCANA[a.bencana]}`, "Pertanyaan riset contoh untuk memeriksa tampilan; bukan agenda sungguhan.", a.bencana, a.tema, a.p, "Policy brief dan model yang bisa dipakai operasional", a.status, hari(-30 + i), hari(-30 + i))));
  /* mitra = peran kode riset di institusi dummy yang dibagi dengan dummy relawan (nama sama dipakai ulang); PKS riset di institusi_perjanjian */
  const M = [["Universitas Contoh Nusantara", "UCN", "ptn", "64", "Pusat Studi Kebencanaan", -200, 400, 0], ["Institut Teknologi Contoh Barat", "ITCB", "pts", "32", "Fakultas Teknik", -700, 30, 0],
    ["Universitas Contoh Timur", "UCT", "ptn", "73", "Pusat Riset Iklim", -800, -10, 0], ["Politeknik Contoh Selatan", "PCS", "pts", "16", null, -300, 60, 1]];
  const inst = await institusiDummy(env, M.map(([nama, singkatan, jenis, prov]) => [nama, singkatan, jenis, prov]), kini, "dummy");
  st.push(...inst.stmts);
  const mitra = M.map((m, i) => ({id: id(), iid: inst.ids[i], nama: m[0], unit: m[4], a: tgl(hari(m[5])), z: tgl(hari(m[6])), cabut: m[7], i}));
  mitra.forEach(m => st.push(sisipPerjanjian(env, m.iid, {jenis_perjanjian: "pks_riset", nomor: `PKS/CONTOH/${m.i + 1}/2026`, mulai: m.a, berakhir: m.z}, hari(-200), "dummy", 1),
    env.DB.prepare("INSERT INTO mitra_riset (id, institusi_id, unit, kode_sha, dibuat, dicabut, dummy) VALUES (?, ?, ?, ?, ?, ?, 1)").bind(m.id, m.iid, m.unit, "0".repeat(48) + acak(8), hari(-200), m.cabut ? hari(-5) : null)));
  /* satu usulan per status; jalur status = rantai transisi sah menuju status itu */
  const JALUR = {diajukan: ["diajukan"], ditelaah: ["diajukan", "ditelaah"], revisi: ["diajukan", "ditelaah", "revisi"], disetujui: ["diajukan", "ditelaah", "disetujui"], ditolak: ["diajukan", "ditelaah", "ditolak"],
    berjalan: ["diajukan", "ditelaah", "disetujui", "berjalan"], laporan_akhir: ["diajukan", "ditelaah", "disetujui", "berjalan", "laporan_akhir"], selesai: ["diajukan", "ditelaah", "disetujui", "berjalan", "laporan_akhir", "selesai"]};
  const usulan = STATUS.map((s, i) => ({id: id(), s, m: mitra[i % 3], a: agenda[i % agenda.length], b: BENCANA_SAH[i % BENCANA_SAH.length]}));
  const SESUDAH_SETUJU = new Set(["disetujui", "berjalan", "laporan_akhir", "selesai"]);
  usulan.forEach((u, i) => {
    const t0 = hari(-120 + i * 3);
    st.push(env.DB.prepare(`INSERT INTO riset_usulan (id, mitra_id, agenda_id, judul, ketua, anggota, bencana, wilayah, metode, data_butuh, mulai, selesai, luaran_rencana, status, nomor_pks, catatan, dibuat, diubah, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).bind(u.id, u.m.id, i < 6 ? u.a.id : null, `Contoh usulan ${i + 1}: ${NAMA_BENCANA[u.b].toLowerCase()} berstatus ${u.s.replace("_", " ")}`, `Dr. Ketua Contoh ${i + 1}`,
      "Anggota Contoh A, Anggota Contoh B", u.b, "Kalimantan Tengah", "Analisis deret waktu dan uji balik terhadap data kejadian terbaru.", JSON.stringify([KATALOG[i % 8].id, KATALOG[(i + 3) % 8].id]),
      tgl(hari(-60 + i * 5)), tgl(hari(120 + i * 5)), "Artikel jurnal dan policy brief", u.s, SESUDAH_SETUJU.has(u.s) ? `PKS/CONTOH/U${i + 1}/2026` : null,
      u.s === "revisi" ? "Perjelas metode validasi dan data pembanding." : u.s === "ditolak" ? "Di luar prioritas agenda tahun ini." : null, t0, t0 + 20 * HARI));
    JALUR[u.s].forEach((ke, j) => st.push(env.DB.prepare("INSERT INTO riset_jejak (usulan_id, dari, ke, oleh, catatan, waktu, dummy) VALUES (?, ?, ?, ?, ?, ?, 1)")
      .bind(u.id, j ? JALUR[u.s][j - 1] : null, ke, ke === "diajukan" || ke === "laporan_akhir" ? "mitra" : "admin:000000000000", j === JALUR[u.s].length - 1 && (u.s === "revisi" || u.s === "ditolak") ? "Catatan telaah contoh" : null, t0 + j * 2 * HARI)));
  });
  const jalan = usulan.filter(u => ["berjalan", "laporan_akhir", "selesai"].includes(u.s));
  jalan.forEach((u, i) => {
    st.push(env.DB.prepare("INSERT INTO riset_kemajuan (id, usulan_id, jenis, isi, tautan, waktu, dummy) VALUES (?, ?, 'kemajuan', ?, ?, ?, 1)").bind(id(), u.id, "Pengumpulan data selesai dan analisis awal berjalan (contoh).", "https://contoh.invalid/laporan-kemajuan", hari(-40 + i)));
    if (u.s !== "berjalan") st.push(env.DB.prepare("INSERT INTO riset_kemajuan (id, usulan_id, jenis, isi, tautan, waktu, dummy) VALUES (?, ?, 'akhir', ?, NULL, ?, 1)").bind(id(), u.id, "Laporan akhir contoh: temuan utama dan rekomendasi.", hari(-10 + i)));
  });
  /* luaran: kelima jenis ada; kebijakan jatuh pada dua riset (laporan_akhir dan selesai), sehingga yang dipakai (2) < luaran */
  const L = (u, jenis, judul, doi, setuju = 1) => { const l = {id: id(), u: u.id}; st.push(env.DB.prepare("INSERT INTO riset_luaran (id, usulan_id, jenis, judul, tautan, doi, waktu, disetujui, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)")
    .bind(l.id, u.id, jenis, judul, "https://contoh.invalid/" + jenis, doi, hari(-5), setuju)); return l; };
  const [rBerjalan, rAkhir, rSelesai] = jalan;
  L(rBerjalan, "model", "Model contoh peringatan dini", null, 0);   // belum disetujui: menunggu admin
  const lA = L(rAkhir, "prototipe", "Prototipe contoh dasbor posko", null);
  const lS1 = L(rSelesai, "artikel", "Artikel contoh jurnal kebencanaan", "10.1234/contoh.2026.001"), lS2 = L(rSelesai, "dataset", "Dataset contoh uji balik", null), lS3 = L(rSelesai, "policy_brief", "Policy brief contoh untuk BNPB", null);
  [[lS3, "Direktorat Contoh BNPB", "se", "Dipakai sebagai dasar surat edaran contoh."], [lS3, "Pusdalops Contoh", "juknis", null], [lS2, "Pusat Data Contoh", "materi_rakor", null],
    [lS1, "Biro Perencanaan Contoh", "lainnya", null], [lA, "Direktorat Contoh Sistem Informasi", "model_operasional", "Diuji di rakor contoh."]]
    .forEach(([l, ins, bentuk, cat], i) => st.push(env.DB.prepare("INSERT INTO riset_kebijakan (id, luaran_id, instansi, bentuk, tanggal, catatan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").bind(id(), l.id, ins, bentuk, tgl(hari(-3 - i)), cat, hari(-3 - i))));
  /* permintaan data: tiap status */
  [["diminta", 3, null, null], ["disetujui", 0, "/data/hotspot.json", "Silakan unduh dan cantumkan sitasi."], ["ditolak", 13, null, "Dataset ini perlu persetujuan unit data terlebih dahulu."]].forEach(([s, k, jalur, cat], i) =>
    st.push(env.DB.prepare("INSERT INTO riset_permintaan (id, mitra_id, usulan_id, dataset, tujuan, sitasi, status, jalur, catatan, dibuat, diputus, dummy) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1)")
      .bind(id(), mitra[i % 3].id, i === 0 ? null : usulan[i].id, KATALOG[k].id, "Contoh tujuan: validasi model peringatan dini dengan data historis.", s, jalur, cat, hari(-8 + i), s === "diminta" ? null : hari(-6 + i))));
  await env.DB.batch(st);
  return json({ok: true, agenda: agenda.length, mitra: mitra.length, usulan: usulan.length, kemajuan: await hitungDummy(env, "riset_kemajuan"), luaran: await hitungDummy(env, "riset_luaran"),
    permintaan: await hitungDummy(env, "riset_permintaan"), kebijakan: await hitungDummy(env, "riset_kebijakan")});
}
async function dummyHapus(env) {
  const n = {}; for (const t of TABEL_DUMMY) n[t] = await hitungDummy(env, t);
  await env.DB.batch([...TABEL_DUMMY.map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`)), env.DB.prepare("DELETE FROM institusi_perjanjian WHERE dummy = 1 AND jenis_perjanjian = 'pks_riset'")]);
  await hapusInstitusiYatim(env);
  return json({ok: true, agenda: n.riset_agenda, mitra: n.mitra_riset, usulan: n.riset_usulan, kemajuan: n.riset_kemajuan, luaran: n.riset_luaran, permintaan: n.riset_permintaan, kebijakan: n.riset_kebijakan});
}
async function dummy(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaObj(req); if (b.r) return b.r;
  if (b.o.aksi === "isi") return dummyIsi(env, kini);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ rute (digabung ke RUTE di src/worker.js). Tiap rute bergerbang: publik (-), kode mitra (x-kode), admin (modOK), Super Admin. */
export const RUTE_RISET = {
  "GET /riset": (env, req, url) => halamanBnpbPublik(env, url, "riset"),
  "GET /riset/mitra": (env, req, url) => halamanBnpbPublik(env, url, "mitra", {pribadi: true}),
  "GET /api/riset/ringkas": aman((env, req, url, kini, ctx) => ringkasPublik(env, req, url, kini, ctx)),
  "GET /api/riset/mitra/saya": aman((env, req) => mitraSaya(env, req)),
  "POST /api/riset/mitra/usulan": aman((env, req, url, kini) => usulanBaru(env, req, kini)),
  "POST /api/riset/mitra/usulan/:id": aman((env, req, url, kini, ctx, id) => usulanRevisi(env, req, id, kini)),
  "POST /api/riset/mitra/kemajuan/:id": aman((env, req, url, kini, ctx, id) => kemajuanBaru(env, req, id, kini)),
  "POST /api/riset/mitra/luaran/:id": aman((env, req, url, kini, ctx, id) => luaranBaru(env, req, id, kini)),
  "POST /api/riset/mitra/permintaan": aman((env, req, url, kini) => permintaanBaru(env, req, kini)),
  "GET /admin/riset": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("riset")),
  "GET /api/riset/admin": aman((env, req, url, kini) => adminSemua(env, req, kini)),
  "GET /api/riset/admin/csv": aman((env, req, url) => ekspor(env, req, url)),
  "POST /api/riset/admin/agenda": aman((env, req, url, kini) => agendaTulis(env, req, null, kini)),
  "POST /api/riset/admin/agenda/:id": aman((env, req, url, kini, ctx, id) => agendaTulis(env, req, id, kini)),
  "POST /api/riset/admin/mitra": aman((env, req, url, kini) => mitraBuat(env, req, url, kini)),
  "POST /api/riset/admin/mitra/:id": aman((env, req, url, kini, ctx, id) => mitraUbah(env, req, id, kini)),
  "POST /api/riset/admin/usulan/:id": aman((env, req, url, kini, ctx, id) => usulanTelaah(env, req, id, kini)),
  "POST /api/riset/admin/permintaan/:id": aman((env, req, url, kini, ctx, id) => permintaanPutus(env, req, id, kini)),
  "POST /api/riset/admin/luaran/:id": aman((env, req, url, kini, ctx, id) => luaranPutus(env, req, id, kini)),
  "POST /api/riset/admin/kebijakan": aman((env, req, url, kini) => kebijakanTulis(env, req, null, kini)),
  "POST /api/riset/admin/kebijakan/:id": aman((env, req, url, kini, ctx, id) => kebijakanTulis(env, req, id, kini)),
  "POST /api/riset/dummy": aman((env, req, url, kini) => dummy(env, req, kini)),
};
