/* Inventori LogPal: gudang logistik BNPB dan BPBD, barang, mutasi, stok opname, permintaan bantuan. Skema: migrations/0112_logpal.sql. Layar: public/logpal/ (/logpal).
   Aturan akses (pemilik):
   - Akun instansi pemprov/pemkab/pemkot (aktif) = BPBD. Membaca: pemprov semua gudang provinsi cakupannya, pemkab/pemkot hanya gudang miliknya. Menulis (barang, mutasi, opname): HANYA gudang yang akun_id-nya dirinya.
     Gudang di luar jangkauan baca dijawab 404 (sama dengan "tidak ada"); gudang terbaca tetapi bukan miliknya 403. BPBD juga mengajukan permintaan dan hanya melihat permintaannya sendiri; tahap tidak bisa diproses BPBD.
   - Staf BNPB (peran pusdalops/koordalops/pimpinan) dan moderator ke atas: membaca semua, menulis hanya gudang pemilik BNPB, memproses tahap permintaan. Staf nyata tidak melihat baris dummy.
   - Mutasi dan stok opname mengubah stok dalam SATU D1 batch dengan UPDATE bersyarat (stok kurang = 409, tanpa baris mutasi); tidak ada stok negatif (CHECK di 0112 sebagai sabuk kedua).
   Rute di bawah /api/instansi/logpal/*: cookie sesi akun instansi hanya dikirim ke Path /instansi dan /api/instansi (cookieSet di src/instansi.js), jadi awalan itu wajib; sesi staf (Path=/) ikut jalan yang sama.
   ponytail: koreksi stok langsung lewat Ubah barang tidak meninggalkan jejak mutasi (perilaku produk asal); batas data baca 20 rb barang, 2 rb mutasi, 200 BA per panggilan, naikkan bila dipakai nasional penuh.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. */
import {json, gagal, acak, sha, bacaBody} from "./worker.js";
import {tx, num, modOK, superOK, wib, tglSah} from "./posko.js";
import {laju} from "./bnpb.js";
import {akunAktif, jsonAman, PROV} from "./instansi.js";
import {modAtauStaf, stafNyata, stafSesi} from "./staf.js";

const JAM = 36e5, HARI = 24 * JAM, RE_ID = /^[0-9a-f]{16}$/, MAKS_BARANG_GUDANG = 3000, MAKS_GUDANG_AKUN = 50;
/* daftar tetap: sama dengan CHECK di 0112 dan public/logpal/logpal.js (dijaga logpal.test.mjs) */
export const KELOMPOK = ["Pangan", "Sandang", "Papan", "Logistik lainnya", "Kendaraan bermotor", "Peralatan air", "Alat komunikasi", "Hunian dan penerangan", "Air dan sanitasi", "Peralatan khusus"];
export const MUTASI = ["Masuk", "Keluar", "Penghapusan"];
export const FLOW = {"Tanggap darurat": ["Rapat koordinasi lintas sektor", "Komandan tanggap darurat", "Kepala gudang", "Distribusi", "Pelaporan kepala gudang", "Selesai"],
  "Penguatan kesiapsiagaan": ["Surat permohonan", "Diagendakan di Deputi", "Disposisi Direktur Logistik", "Penelaahan Kasubdit", "Usulan ke Direktur Logistik", "Arahan Direktur Logistik",
    "Surat perintah, surat pengeluaran, berita acara", "Distribusi", "Pengecekan barang", "Pelaporan", "Selesai"]};
export const PERAN_STAF = ["pusdalops", "koordalops", "pimpinan"];
const JENIS_BPBD = ["pemprov", "pemkab", "pemkot"];
const tanpaTabel = e => /no such table: logpal_/i.test(String(e?.message || e));
const nyatakan = fn => async (env, req, ...sisa) => {
  if (req.method === "POST" && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman LogPal wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman /logpal)");
  try { return await fn(env, req, ...sisa); }
  catch (e) {
    if (tanpaTabel(e)) return gagal(503, "LogPal belum diaktifkan (migrasi 0112_logpal belum diterapkan)");
    if (/constraint failed|CHECK constraint|tahap permintaan hanya/i.test(String(e?.message || e))) return gagal(409, "data berubah atau melanggar aturan; muat ulang lalu ulangi");
    throw e;
  }
};
/* teks yang dibuka di Excel/Sheets sebagai rumus (= + - @ tab CR) ditolak di server; klien juga menetralkan sel CSV */
/* satu pintu teks masukan: tx (NFC, tanpa kontrol, panjang) + tolak awalan rumus; undefined = tidak sah */
export const rumus = v => typeof v === "string" && /^[=+\-@\t\r]/.test(v);
export const ts = (v, maks) => { const t = tx(v, maks); return rumus(t) ? undefined : t; };
const iso = t => new Date(t).toISOString();
const ada = (o, k) => Object.hasOwn(o, k);
const nTak = () => gagal(404, "tidak ada");

/* ================================================================ siapa yang memanggil */
/* {tipe: "staf"|"bpbd", id, dummyOk, a?} atau Response. Staf/moderator dicoba lebih dulu; selain itu sesi akun instansi (pemprov/pemkab/pemkot). */
async function aktor(env, req, kini) {
  const m = await modAtauStaf(env, req, PERAN_STAF);
  if (m) return {tipe: "staf", id: String(m), dummyOk: !stafNyata(req)};
  if (await stafSesi(env, req, kini)) return gagal(403, `peran staf tidak mencakup LogPal (butuh ${PERAN_STAF.join("/")})`);
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!JENIS_BPBD.includes(a.jenis)) return gagal(403, "LogPal hanya untuk BPBD provinsi, kabupaten, dan kota serta staf BNPB");
  return {tipe: "bpbd", id: a.id, dummyOk: !!a.dummy, a, cakupan: jsonAman(a.cakupan) || []};
}
/* potongan WHERE untuk gudang yang BOLEH DIBACA aktor (alias g) */
function jangkauan(ak) {
  const dum = ak.dummyOk ? "1" : "g.dummy = 0";
  if (ak.tipe === "staf") return {sql: dum, ikat: []};
  return ak.a.jenis === "pemprov" ? {sql: `g.prov IN (SELECT value FROM json_each(?)) AND ${dum}`, ikat: [JSON.stringify(ak.cakupan)]} : {sql: `g.akun_id = ? AND ${dum}`, ikat: [ak.id]};
}
const bolehTulis = (ak, g) => ak.tipe === "staf" ? g.pemilik === "BNPB" : g.akun_id === ak.id;
/* gudang yang terbaca aktor, atau Response (404 di luar jangkauan, 403 terbaca tetapi bukan miliknya bila tulis) */
async function gudangBisa(env, ak, id, tulis) {
  const j = jangkauan(ak);
  const g = await env.DB.prepare(`SELECT g.* FROM logpal_gudang g WHERE g.id = ? AND ${j.sql}`).bind(id, ...j.ikat).first();
  if (!g) return nTak();
  return tulis && !bolehTulis(ak, g) ? gagal(403, ak.tipe === "staf" ? "staf BNPB hanya mengubah gudang BNPB" : "gudang ini milik akun lain; hanya pemiliknya yang boleh mengubah") : g;
}
const batasi = (env, ak, aksi, maks, kini) => laju(env, ak.id, aksi, [[JAM, maks]], kini);

/* ================================================================ murni: validasi */
const ANGKA_B = {tahun: [1950, 2100, true], nilai: [0, 1e13, false], harga: [0, 1e13, false], rr: [0, 1e8, true], rb: [0, 1e8, true]};
export const TEKS_B = {satuan: 30, sumber_dana: 60, catatan: 300, kode_barang: 40, nup: 30, merek: 80, seri: 60, cara: 60, label: 40, batch: 60, lokasi: 100, dokumen: 100, kategori: 60, item_standar: 80, sumber: 120};
export const ASET = ["Kendaraan bermotor", "Peralatan air", "Alat komunikasi", "Hunian dan penerangan", "Air dan sanitasi", "Peralatan khusus"];
/* barang: {g} galat atau {v}. `lama` = baris tersimpan untuk ubahan sebagian */
export function cekBarang(o, lama = null) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  const barang = ts(f("barang"), 200); if (!barang || barang.length < 2) return {g: "nama barang 2 sampai 200 karakter, tidak diawali = + - @"};
  const kelompok = f("kelompok"); if (!KELOMPOK.includes(kelompok)) return {g: "kelompok tidak dikenal"};
  const jumlah = num(f("jumlah"), 0, 1e8, true); if (jumlah == null || Number.isNaN(jumlah)) return {g: "jumlah harus bilangan bulat 0 sampai 100 juta"};
  const v = {barang, kelompok, jumlah};
  for (const [k, m] of Object.entries(TEKS_B)) { const t = ts(f(k), m); if (t === undefined) return {g: `${k} maksimal ${m} karakter dan tidak diawali = + - @`}; v[k] = t ?? (k === "kategori" ? "Lainnya" : ""); }
  for (const [k, [a, b, bulat]] of Object.entries(ANGKA_B)) { const n = num(f(k), a, b, bulat); if (Number.isNaN(n)) return {g: `${k} tidak sah`}; v[k] = n; }
  const ked = f("kedaluwarsa") ?? ""; if (ked !== "" && (typeof ked !== "string" || !tglSah(ked))) return {g: "kedaluwarsa harus tanggal YYYY-MM-DD"}; v.kedaluwarsa = ked;
  const pr = f("prioritas") ?? ""; if (!["", "1", "2"].includes(String(pr))) return {g: "prioritas harus kosong, 1, atau 2"}; v.prioritas = String(pr);
  const baik = f("baik") === "" || f("baik") == null ? jumlah : num(f("baik"), 0, 1e8, true); if (Number.isNaN(baik)) return {g: "kondisi baik tidak sah"};
  const rusak = ASET.includes(kelompok) ? (v.rr || 0) + (v.rb || 0) : f("rusak") === "" || f("rusak") == null ? Math.max(0, jumlah - baik) : num(f("rusak"), 0, 1e8, true);
  if (Number.isNaN(rusak)) return {g: "rusak tidak sah"};
  if (baik + rusak > jumlah) return {g: "kondisi baik ditambah rusak tidak boleh melebihi jumlah"};
  return {v: {...v, baik, rusak}};
}
const KOL_B = ["barang", "kategori", "item_standar", "prioritas", "kelompok", "satuan", "jumlah", "baik", "rusak", "kedaluwarsa", "sumber_dana", "catatan", "kode_barang", "nup", "merek", "seri", "tahun", "cara", "nilai", "rr", "rb", "label", "batch", "harga", "lokasi", "dokumen"];
const bentukBarang = r => ({id: r.id, ...Object.fromEntries([...KOL_B, "per", "sumber"].map(k => [k, r[k]]))});

/* ================================================================ baca */
async function baca(env, req, url, kini) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const j = jangkauan(ak), semua = async (sql, ...ikat) => (await env.DB.prepare(sql).bind(...ikat).all()).results;
  const G = await semua(`SELECT g.* FROM logpal_gudang g WHERE ${j.sql} ORDER BY g.provinsi, g.nama LIMIT 500`, ...j.ikat);
  const B = await semua(`SELECT b.* FROM logpal_barang b JOIN logpal_gudang g ON g.id = b.gudang_id WHERE ${j.sql} ORDER BY b.gudang_id, b.barang LIMIT 20000`, ...j.ikat);
  const M = await semua(`SELECT m.*, g.nama gnama, g.provinsi FROM logpal_mutasi m JOIN logpal_gudang g ON g.id = m.gudang_id WHERE ${j.sql} ORDER BY m.tanggal DESC, m.dibuat DESC LIMIT 2000`, ...j.ikat);
  const O = await semua(`SELECT o.*, g.nama gnama, g.provinsi FROM logpal_opname o JOIN logpal_gudang g ON g.id = o.gudang_id WHERE ${j.sql} ORDER BY o.tanggal DESC, o.dibuat DESC LIMIT 200`, ...j.ikat);
  const R = O.length ? await semua("SELECT * FROM logpal_opname_baris WHERE opname_id IN (SELECT value FROM json_each(?))", JSON.stringify(O.map(o => o.id))) : [];
  const P = ak.tipe === "staf" ? await semua(`SELECT * FROM logpal_permintaan ${ak.dummyOk ? "" : "WHERE dummy = 0"} ORDER BY dibuat DESC LIMIT 500`)
    : await semua("SELECT * FROM logpal_permintaan WHERE akun_id = ? ORDER BY dibuat DESC LIMIT 200", ak.id);
  const T = P.length ? await semua("SELECT * FROM logpal_tahap WHERE permintaan_id IN (SELECT value FROM json_each(?)) ORDER BY id", JSON.stringify(P.map(p => p.id))) : [];
  const K = ak.tipe === "staf" ? await semua(`SELECT * FROM logpal_kebutuhan ${ak.dummyOk ? "" : "WHERE dummy = 0"} ORDER BY no`) : [];   // data pengajuan: hanya staf
  const per = (L, k) => { const m = new Map(); for (const x of L) (m.get(x[k]) ?? m.set(x[k], []).get(x[k])).push(x); return m; };
  const bG = per(B, "gudang_id"), rO = per(R, "opname_id"), tP = per(T, "permintaan_id");
  const kodeProv = ak.tipe === "staf" ? Object.keys(PROV) : ak.a.jenis === "pemprov" ? ak.cakupan : ak.cakupan.slice(0, 1);   // provinsi yang boleh dipilih saat menambah gudang
  return json({kini, peran: ak.tipe, proses: ak.tipe === "staf", super: !!(await superOK(env, req)), cakupan: ak.cakupan ?? null, nama: ak.a?.wilayah ?? null, kab: ak.a?.tingkat === "kab" ? ak.a.kab : null,
    provinsi: kodeProv.filter(k => PROV[k]).map(k => ({kode: k, nama: PROV[k][1]})),
    kelompok: KELOMPOK, flow: FLOW,
    gudang: G.map(g => ({id: g.id, nama: g.nama, pemilik: g.pemilik, prov: g.prov, provinsi: g.provinsi, kab: g.kab, kapasitas_ton: g.kapasitas_ton, lon: g.lon, lat: g.lat, boleh_tulis: bolehTulis(ak, g), items: (bG.get(g.id) ?? []).map(bentukBarang)})),
    mutasi: M.map(m => ({_id: m.id, gudang: m.gudang_id, gudang_nama: m.gnama, provinsi: m.provinsi, tanggal: m.tanggal, jenis: m.jenis, barang_id: m.barang_id, barang: m.barang, kelompok: m.kelompok, satuan: m.satuan,
      jumlah: m.jumlah, lawan: m.lawan, moda: m.moda, dokumen: m.dokumen, nilai: m.nilai, pj: m.pj, diterima: m.diterima, dibuat: iso(m.dibuat)})),
    opname: O.map(o => ({_id: o.id, gudang: o.gudang_id, gudang_nama: o.gnama, provinsi: o.provinsi, tanggal: o.tanggal, petugas: o.petugas, disesuaikan: !!o.disesuaikan, dibuat: iso(o.dibuat),
      baris: (rO.get(o.id) ?? []).map(b => ({barang_id: b.barang_id, barang: b.barang, satuan: b.satuan, tercatat: b.tercatat, fisik: b.fisik, selisih: b.selisih, ket: b.ket}))})),
    permintaan: P.map(p => ({_id: p.id, jenis: p.jenis, bpbd: p.bpbd, provinsi: p.provinsi, kab: p.kab, status_darurat: p.status_darurat, sk: p.sk, jiwa: p.jiwa, rekomendasi: p.rekomendasi, trc: p.trc,
      items: jsonAman(p.items) ?? [], tahap: p.tahap, ditolak: !!p.ditolak, dibuat: iso(p.dibuat), riwayat: (tP.get(p.id) ?? []).map(t => ({tahap: t.tahap, petugas: t.petugas, waktu: iso(t.waktu), catatan: t.catatan}))})),
    kebutuhan: K.map(({dummy, ...k}) => ({...k, setara: String(k.setara), stok_a: String(k.stok_a), stok_b: String(k.stok_b), diajukan: String(k.diajukan), no: String(k.no)}))});
}

/* ================================================================ gudang */
async function buatGudang(env, req, url, kini) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = ts(b.o.nama, 100); if (!nama || nama.length < 2) return gagal(400, "nama gudang 2 sampai 100 karakter, tidak diawali = + - @");
  const prov = ak.tipe === "bpbd" && ak.a.jenis !== "pemprov" ? ak.cakupan[0] : b.o.prov;
  if (typeof prov !== "string" || !PROV[prov]) return gagal(400, "provinsi tidak dikenal");
  if (ak.tipe === "bpbd" && !ak.cakupan.includes(prov)) return gagal(403, "provinsi di luar cakupan akun");
  const kap = num(b.o.kapasitas_ton, 0, 1e6); if (Number.isNaN(kap)) return gagal(400, "kapasitas 0 sampai 1 juta ton");
  const kab = ak.tipe === "bpbd" && ak.a.tingkat === "kab" ? ak.a.kab : ts(b.o.kab, 60); if (kab === undefined || (kab && kab.length < 2)) return gagal(400, "kabupaten 2 sampai 60 karakter, tidak diawali = + - @");
  const pemilik = ak.tipe === "staf" ? "BNPB" : "BPBD";   // pemilik tidak diterima dari klien
  if (ak.tipe === "bpbd" && (await env.DB.prepare("SELECT count(*) n FROM logpal_gudang WHERE akun_id = ?").bind(ak.id).first()).n >= MAKS_GUDANG_AKUN) return gagal(409, `maksimal ${MAKS_GUDANG_AKUN} gudang per akun`);
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO logpal_gudang (id, akun_id, nama, pemilik, prov, provinsi, kab, kapasitas_ton, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, ak.tipe === "bpbd" ? ak.id : null, nama, pemilik, prov, PROV[prov][1], kab || null, kap || null, kini, kini, ak.tipe === "bpbd" && ak.a.dummy ? 1 : 0).run();
  return json({id}, 201);
}

/* ================================================================ barang */
async function tambahBarang(env, req, url, kini, ctx, gid) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const g = await gudangBisa(env, ak, gid, true); if (g instanceof Response) return g;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekBarang(b.o); if (c.g) return gagal(400, c.g);
  if ((await env.DB.prepare("SELECT count(*) n FROM logpal_barang WHERE gudang_id = ?").bind(gid).first()).n >= MAKS_BARANG_GUDANG) return gagal(409, `maksimal ${MAKS_BARANG_GUDANG} jenis barang per gudang`);
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const id = acak(8), v = c.v, kol = [...KOL_B, "per", "dibuat", "diubah", "dummy"];
  await env.DB.prepare(`INSERT INTO logpal_barang (id, gudang_id, ${kol.join(", ")}) VALUES (${["?", "?", ...kol.map(() => "?")].join(", ")})`)
    .bind(id, gid, ...KOL_B.map(k => v[k]), wib(kini), kini, kini, g.dummy).run();
  await env.DB.prepare("UPDATE logpal_gudang SET diubah = ? WHERE id = ?").bind(kini, gid).run();
  return json({id}, 201);
}
async function ubahBarang(env, req, url, kini, ctx, id) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const x = await env.DB.prepare("SELECT * FROM logpal_barang WHERE id = ?").bind(id).first(); if (!x) return nTak();
  const g = await gudangBisa(env, ak, x.gudang_id, true); if (g instanceof Response) return g;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekBarang(b.o, x); if (c.g) return gagal(400, c.g);
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const v = c.v;
  await env.DB.batch([env.DB.prepare(`UPDATE logpal_barang SET ${KOL_B.map(k => k + " = ?").join(", ")}, per = ?, diubah = ? WHERE id = ? AND gudang_id = ?`).bind(...KOL_B.map(k => v[k]), wib(kini), kini, id, x.gudang_id),
    env.DB.prepare("UPDATE logpal_gudang SET diubah = ? WHERE id = ?").bind(kini, x.gudang_id)]);
  return json({ok: true});
}

/* ================================================================ mutasi */
async function catatMutasi(env, req, url, kini, ctx, gid) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const g = await gudangBisa(env, ak, gid, true); if (g instanceof Response) return g;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, jenis = o.jenis, jumlah = num(o.jumlah, 1, 1e8, true);
  if (typeof jenis !== "string") return gagal(400, `jenis harus ${MUTASI.join("/")}`);
  if (!MUTASI.includes(jenis)) return gagal(400, `jenis harus ${MUTASI.join("/")}`);
  if (typeof o.tanggal !== "string" || !tglSah(o.tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (typeof o.barang_id !== "string" || !RE_ID.test(o.barang_id)) return gagal(400, "pilih barang");
  if (jumlah == null || Number.isNaN(jumlah)) return gagal(400, "jumlah harus bilangan bulat 1 sampai 100 juta");
  const lawan = ts(o.lawan, 120), moda = ts(o.moda, 30), dok = ts(o.dokumen, 100), pj = ts(o.pj, 80), nilai = num(o.nilai, 0, 1e13);
  if ([lawan, moda, dok, pj].includes(undefined) || Number.isNaN(nilai)) return gagal(400, "lawan 120, moda 30, dokumen 100, penanggung jawab 80 karakter dan tidak diawali = + - @; nilai 0 sampai 1e13");
  const x = await env.DB.prepare("SELECT * FROM logpal_barang WHERE id = ? AND gudang_id = ?").bind(o.barang_id, gid).first(); if (!x) return gagal(404, "barang tidak ada di gudang ini");
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const id = acak(8);
  /* satu batch = satu transaksi: UPDATE bersyarat menjaga stok; baris mutasi hanya lahir bila UPDATE mengubah satu baris */
  const upd = jenis === "Masuk"
    ? env.DB.prepare("UPDATE logpal_barang SET jumlah = jumlah + ?, baik = baik + ?, per = ?, diubah = ? WHERE id = ? AND gudang_id = ? AND jumlah + ? <= 100000000").bind(jumlah, jumlah, o.tanggal, kini, x.id, gid, jumlah)
    : env.DB.prepare("UPDATE logpal_barang SET jumlah = jumlah - ?, baik = max(0, baik - ?), rusak = rusak - max(0, ? - baik), per = ?, diubah = ? WHERE id = ? AND gudang_id = ? AND jumlah >= ?").bind(jumlah, jumlah, jumlah, o.tanggal, kini, x.id, gid, jumlah);
  const ins = env.DB.prepare("INSERT INTO logpal_mutasi (id, gudang_id, barang_id, tanggal, jenis, barang, kelompok, satuan, jumlah, lawan, moda, dokumen, nilai, pj, oleh, dibuat, dummy) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() > 0")
    .bind(id, gid, x.id, o.tanggal, jenis, x.barang, x.kelompok, x.satuan, jumlah, lawan ?? "", moda ?? "", dok ?? "", nilai ?? 0, pj ?? "", ak.id, kini, g.dummy);
  const r = await env.DB.batch([upd, ins, env.DB.prepare("UPDATE logpal_gudang SET diubah = ? WHERE id = ? AND changes() > 0").bind(kini, gid)]);
  if (!r[0].meta.changes) return gagal(409, jenis === "Masuk" ? "stok melebihi batas" : `jumlah melebihi stok (${x.jumlah}); muat ulang bila stok baru berubah`);
  return json({id}, 201);
}
async function catatDiterima(env, req, url, kini, ctx, id) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const m = await env.DB.prepare("SELECT gudang_id, jenis, jumlah FROM logpal_mutasi WHERE id = ?").bind(id).first(); if (!m) return nTak();
  const g = await gudangBisa(env, ak, m.gudang_id, true); if (g instanceof Response) return g;
  const b = await bacaBody(req, 256); if (b.galat) return gagal(b.status || 400, b.galat);
  const n = num(b.o.diterima, 0, 1e8, true);
  if (m.jenis !== "Keluar") return gagal(400, "jumlah diterima hanya untuk mutasi Keluar");
  if (n == null || Number.isNaN(n) || n > m.jumlah) return gagal(400, `diterima bilangan bulat 0 sampai ${m.jumlah}`);
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  await env.DB.prepare("UPDATE logpal_mutasi SET diterima = ? WHERE id = ? AND jenis = 'Keluar'").bind(n, id).run();
  return json({ok: true});
}

/* ================================================================ stok opname */
async function catatOpname(env, req, url, kini, ctx, gid) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const g = await gudangBisa(env, ak, gid, true); if (g instanceof Response) return g;
  const b = await bacaBody(req, 80000); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, petugas = ts(o.petugas, 80);
  if (typeof o.tanggal !== "string" || !tglSah(o.tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
  if (!petugas || petugas.length < 2) return gagal(400, "isi nama petugas pemeriksa (2 sampai 80 karakter)");
  if (!Array.isArray(o.baris) || !o.baris.length || o.baris.length > 500) return gagal(400, "baris 1 sampai 500");
  const lihat = new Set(), baris = [];
  for (const r of o.baris) {
    const f = num(r?.fisik, 0, 1e8, true), ket = ts(r?.ket, 120);
    if (typeof r?.barang_id !== "string" || !RE_ID.test(r.barang_id) || f == null || Number.isNaN(f) || ket === undefined || lihat.has(r.barang_id)) return gagal(400, "tiap baris: barang_id sah tanpa ulang, fisik bilangan bulat >= 0, keterangan maks 120 karakter dan tidak diawali = + - @");
    lihat.add(r.barang_id); baris.push({b: r.barang_id, f, k: ket ?? ""});
  }
  const sah = (await env.DB.prepare("SELECT count(*) n FROM logpal_barang WHERE gudang_id = ? AND id IN (SELECT value FROM json_each(?))").bind(gid, JSON.stringify(baris.map(x => x.b))).first()).n;
  if (sah !== baris.length) return gagal(400, "ada barang yang bukan milik gudang ini");
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const id = acak(8), sesuaikan = o.disesuaikan === true ? 1 : 0;
  /* satu batch: BA, barisnya (tercatat dibaca dari stok server SEKARANG), lalu penyesuaian stok dari baris yang baru lahir */
  const st = [env.DB.prepare("INSERT INTO logpal_opname (id, gudang_id, tanggal, petugas, disesuaikan, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, gid, o.tanggal, petugas, sesuaikan, ak.id, kini, g.dummy),
    env.DB.prepare("INSERT INTO logpal_opname_baris (opname_id, barang_id, barang, satuan, tercatat, fisik, selisih, ket) SELECT ?, b.id, b.barang, b.satuan, b.jumlah, json_extract(je.value, '$.f'), json_extract(je.value, '$.f') - b.jumlah, json_extract(je.value, '$.k') FROM json_each(?) je JOIN logpal_barang b ON b.id = json_extract(je.value, '$.b') AND b.gudang_id = ?")
      .bind(id, JSON.stringify(baris), gid)];
  if (sesuaikan) {
    const fisik = "(SELECT r.fisik FROM logpal_opname_baris r WHERE r.opname_id = ?1 AND r.barang_id = logpal_barang.id)";
    st.push(env.DB.prepare(`UPDATE logpal_barang SET jumlah = ${fisik}, baik = min(baik, ${fisik}), rusak = min(rusak, ${fisik} - min(baik, ${fisik})), per = ?2, diubah = ?3 WHERE gudang_id = ?4 AND id IN (SELECT barang_id FROM logpal_opname_baris WHERE opname_id = ?1)`).bind(id, o.tanggal, kini, gid));
  }
  st.push(env.DB.prepare("UPDATE logpal_gudang SET diubah = ? WHERE id = ?").bind(kini, gid));
  await env.DB.batch(st);
  return json({id, baris: baris.length}, 201);
}

/* ================================================================ permintaan bantuan */
async function buatPermintaan(env, req, url, kini) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, jenis = o.jenis;
  if (typeof jenis !== "string" || !Object.hasOwn(FLOW, jenis)) return gagal(400, `jenis harus ${Object.keys(FLOW).join("/")}`);
  const bpbd = ak.tipe === "bpbd" ? ak.a.wilayah.slice(0, 100) : ts(o.bpbd, 100), prov = ak.tipe === "bpbd" ? PROV[ak.cakupan[0]]?.[1] : ts(o.provinsi, 60);
  const kab = ak.tipe === "bpbd" && ak.a.tingkat === "kab" ? ak.a.kab : ts(o.kab, 60), sd = ts(o.status_darurat, 40), sk = ts(o.sk, 120), rek = ts(o.rekomendasi, 60), trc = ts(o.trc, 600), jiwa = num(o.jiwa, 0, 1e8, true);
  if (!bpbd || bpbd.length < 2 || !prov || prov.length < 2) return gagal(400, "isi BPBD pemohon dan provinsi");
  if ([kab, sd, sk, rek, trc].includes(undefined) || Number.isNaN(jiwa)) return gagal(400, "kabupaten 60, status 40, nomor penetapan 120, rekomendasi 60, TRC 600 karakter; jiwa bilangan bulat");
  if (jenis === "Tanggap darurat" && (!sd || !sk)) return gagal(400, "tanggap darurat wajib mengisi status dan nomor penetapannya");
  if (!Array.isArray(o.items) || !o.items.length || o.items.length > 40) return gagal(400, "isi 1 sampai 40 barang");
  const items = [];
  for (const i of o.items) {
    const nm = ts(i?.barang, 200), jm = num(i?.jumlah, 1, 1e8, true), sat = ts(i?.satuan, 30);
    if (!nm || nm.length < 2 || jm == null || Number.isNaN(jm) || sat === undefined) return gagal(400, "tiap barang: nama 2 sampai 200 karakter, jumlah bilangan bulat >= 1, satuan maks 30");
    items.push({barang: nm, jumlah: jm, satuan: sat ?? ""});
  }
  const l = await batasi(env, ak, "logpal.minta", 20, kini); if (l) return l;
  const id = acak(8);
  await env.DB.batch([env.DB.prepare("INSERT INTO logpal_permintaan (id, akun_id, jenis, bpbd, provinsi, kab, status_darurat, sk, jiwa, rekomendasi, trc, items, tahap, ditolak, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)")
      .bind(id, ak.tipe === "bpbd" ? ak.id : null, jenis, bpbd, prov, kab ?? "", sd ?? "", sk ?? "", jiwa ?? 0, rek ?? "", trc ?? "", JSON.stringify(items), kini, kini, ak.tipe === "bpbd" && ak.a.dummy ? 1 : 0),
    env.DB.prepare("INSERT INTO logpal_tahap (permintaan_id, tahap, petugas, catatan, waktu) VALUES (?, ?, ?, 'Diajukan', ?)").bind(id, FLOW[jenis][0], bpbd, kini)]);
  return json({id}, 201);
}
async function prosesTahap(env, req, url, kini, ctx, id) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  if (ak.tipe !== "staf") return gagal(403, "tahap permintaan hanya diproses staf BNPB");
  const p = await env.DB.prepare(`SELECT * FROM logpal_permintaan WHERE id = ? ${ak.dummyOk ? "" : "AND dummy = 0"}`).bind(id).first(); if (!p) return nTak();
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const aksi = b.o.aksi, petugas = ts(b.o.petugas, 80), cat = ts(b.o.catatan, 300), dari = num(b.o.dari, 0, 10, true);
  if (aksi !== "lanjut" && aksi !== "tolak") return gagal(400, "aksi harus lanjut/tolak");
  if (!petugas || petugas.length < 2) return gagal(400, "isi nama petugas (2 sampai 80 karakter)");
  if (cat === undefined) return gagal(400, "catatan maksimal 300 karakter");
  if (dari !== p.tahap) return gagal(409, "tahap permintaan sudah berubah; muat ulang");
  const alur = FLOW[p.jenis];
  if (p.ditolak || p.tahap >= alur.length - 1) return gagal(409, "permintaan sudah selesai atau ditolak");
  const l = await batasi(env, ak, "logpal.tulis", 300, kini); if (l) return l;
  const tolak = aksi === "tolak";
  const r = await env.DB.batch([tolak ? env.DB.prepare("UPDATE logpal_permintaan SET ditolak = 1, diubah = ? WHERE id = ? AND tahap = ? AND ditolak = 0").bind(kini, id, p.tahap)
      : env.DB.prepare("UPDATE logpal_permintaan SET tahap = tahap + 1, diubah = ? WHERE id = ? AND tahap = ? AND ditolak = 0").bind(kini, id, p.tahap),
    env.DB.prepare("INSERT INTO logpal_tahap (permintaan_id, tahap, petugas, catatan, waktu) SELECT ?, ?, ?, ?, ? WHERE changes() > 0").bind(id, tolak ? "Ditolak" : alur[p.tahap + 1], petugas, cat ?? "", kini)]);
  return r[0].meta.changes ? json({ok: true, tahap: tolak ? p.tahap : p.tahap + 1, ditolak: tolak}) : gagal(409, "tahap permintaan sudah berubah; muat ulang");
}

/* ================================================================ dummy (DUMMY.md): satu halaman = rantai penuh */
async function akunDummy(env, kini, oleh) {
  const ada = await env.DB.prepare("SELECT id FROM instansi_akun WHERE dummy = 1 AND status = 'aktif' AND jenis = 'pemprov' AND cakupan = '[\"62\"]' LIMIT 1").first(); if (ada) return ada.id;
  const id = acak(8), u = "dummylogpal62";
  await env.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, pangkat, jabatan, unit, email, wa, telepon_kantor, surat, kartu, dikirim, diputus, oleh, wajib_ganti, dibuat, dummy)
    VALUES (?, ?, 'pemprov', 'prov', '[DUMMY] BPBD Provinsi Kalimantan Tengah', ?, '["62"]', NULL, NULL, ?, ?, 'aktif', '[DUMMY] Petugas Logistik', '198001012005011001', 'Pembina IV/a', 'Kepala Pelaksana', '[DUMMY] BPBD Provinsi Kalimantan Tengah', ?, '628000000901', '0536 300000', 1, 1, ?, ?, ?, 0, ?, 1)`)
    .bind(id, u, "dummy|" + u, acak(16), await sha(acak(16)), `${u}@contoh.invalid`, kini - 2 * HARI, kini - HARI, oleh, kini - 3 * HARI).run();
  return id;
}
async function dummyIsi(env, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM logpal_gudang WHERE dummy = 1").first()).n) return gagal(409, "data dummy LogPal sudah ada; hapus dulu dengan 🧹");
  const akun = await akunDummy(env, kini, oleh), tgl = d => wib(kini + d * HARI), st = [];
  const ib = (gid, barang, kelompok, satuan, jumlah, baik, rusak, x = {}) => { const id = acak(8); st.push(env.DB.prepare(`INSERT INTO logpal_barang (id, gudang_id, barang, kategori, item_standar, prioritas, kelompok, satuan, jumlah, baik, rusak, kedaluwarsa, sumber_dana, per, sumber, catatan,
    kode_barang, nup, merek, seri, tahun, cara, nilai, rr, rb, label, batch, harga, lokasi, dokumen, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Contoh', '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
    .bind(id, gid, "[DUMMY] " + barang, x.kategori ?? "Lainnya", x.item_standar ?? "", x.prioritas ?? "", kelompok, satuan, jumlah, baik, rusak, x.ked ?? "", x.dana ?? "APBD", tgl(-3), x.kode ?? "", x.nup ?? "", x.merek ?? "", x.seri ?? "", x.tahun ?? null,
      x.cara ?? "", x.nilai ?? null, x.rr ?? null, x.rb ?? null, x.label ?? "", x.batch ?? "", x.harga ?? null, x.lokasi ?? "", x.dok ?? "", kini - 30 * HARI, kini - 3 * HARI)); return id; };
  const gudang = (akunId, nama, pemilik, kapasitas, lon, lat) => { const id = acak(8); st.push(env.DB.prepare("INSERT INTO logpal_gudang (id, akun_id, nama, pemilik, prov, provinsi, kab, kapasitas_ton, lon, lat, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, '62', 'Kalimantan Tengah', NULL, ?, ?, ?, ?, ?, 1)")
    .bind(id, akunId, "[DUMMY] " + nama, pemilik, kapasitas, lon, lat, kini - 40 * HARI, kini - 3 * HARI)); return id; };
  const g1 = gudang(null, "Poslog BNPB Kalimantan Tengah", "BNPB", 400, 113.92, -2.21), g2 = gudang(akun, "Gudang BPBD Provinsi Kalimantan Tengah", "BPBD", 250, 113.9, -2.2), g3 = gudang(akun, "Gudang BPBD Kapuas", "BPBD", null, 114.39, -3.0);
  const bn = [ib(g1, "Selimut tebal standar BNPB", "Sandang", "lembar", 1200, 1200, 0, {kategori: "Selimut", item_standar: "Selimut", prioritas: "1", kode: "SB-001", harga: 85000, dok: "BAST-01", lokasi: "Rak A1", dana: "APBN"}),
    ib(g1, "Family kit", "Logistik lainnya", "paket", 300, 280, 20, {kategori: "Paket keluarga", item_standar: "Paket perlengkapan keluarga", prioritas: "1", kode: "FK-001", harga: 450000, dok: "BAST-02", lokasi: "Rak A2", dana: "APBN"}),
    ib(g1, "Mi instan 40 bungkus per dus", "Pangan", "dus", 500, 500, 0, {kategori: "Pangan", ked: tgl(-20), batch: "B-2025-11", kode: "PG-001", harga: 110000, dok: "BAST-03", lokasi: "Rak B1", dana: "APBN"}),
    ib(g1, "Terpal 4x6 m", "Papan", "lembar", 800, 760, 40, {kategori: "Terpal", item_standar: "Terpal", prioritas: "2", kode: "PP-001", harga: 120000, dok: "BAST-04", lokasi: "Rak C1", dana: "APBN"}),
    ib(g1, "Tenda pengungsi", "Hunian dan penerangan", "unit", 40, 36, 4, {kategori: "Tenda", item_standar: "Tenda pengungsi", kode: "3.05.01", nup: "1", merek: "Dumbo", seri: "TP-6x8", tahun: 2022, cara: "Hibah", nilai: 18000000, rr: 3, rb: 1, label: "Permanen", dok: "BAST-05", lokasi: "Hanggar 1"}),
    ib(g1, "Genset 5 kVA", "Hunian dan penerangan", "unit", 6, 6, 0, {kategori: "Genset", kode: "3.05.02", nup: "2", merek: "Honda", seri: "EU50", tahun: 2021, cara: "Pembelian", nilai: 32000000, label: "Belum", dok: "BAST-06", lokasi: "Hanggar 1"})];
  const b2 = [ib(g2, "Beras 5 kg", "Pangan", "karung", 400, 380, 20, {kategori: "Pangan", ked: tgl(25), batch: "B-2026-01", kode: "PG-101", harga: 65000, dok: "BAST-11", lokasi: "Rak 1"}),
    ib(g2, "Obat-obatan dasar", "Logistik lainnya", "boks", 60, 60, 0, {kategori: "Obat", ked: tgl(200), batch: "O-2026-02", kode: "OB-101", harga: 90000, dok: "BAST-12", lokasi: "Rak 2"}),
    ib(g2, "Matras lipat", "Sandang", "lembar", 500, 500, 0, {kategori: "Matras dan kasur", item_standar: "Matras dan kasur lipat", prioritas: "1", kode: "SD-101", harga: 150000, dok: "BAST-13", lokasi: "Rak 3"}),
    ib(g2, "Perahu karet", "Peralatan air", "unit", 8, 6, 2, {kategori: "Perahu", item_standar: "Perahu evakuasi", kode: "3.04.01", nup: "5", merek: "Zodiac", seri: "Z-470", tahun: 2020, cara: "Pembelian", nilai: 95000000, rr: 1, rb: 1, label: "Permanen", dok: "BAST-14", lokasi: "Hanggar 2"}),
    ib(g2, "Mesin tempel 15 PK", "Peralatan air", "unit", 5, 5, 0, {kategori: "Mesin perahu", kode: "3.04.02", nup: "6", merek: "Yamaha", seri: "F15", tahun: 2020, cara: "Pembelian", nilai: 48000000, label: "Permanen", dok: "BAST-15", lokasi: "Hanggar 2"}),
    ib(g2, "Pompa air portabel", "Air dan sanitasi", "unit", 12, 10, 2, {kategori: "Pompa", item_standar: "Pompa banjir", kode: "3.06.01", nup: "7", merek: "Honda", seri: "WB30", tahun: 2019, cara: "Hibah", nilai: 15000000, rr: 2, label: "Permanen", dok: "BAST-16", lokasi: "Hanggar 2"}),
    ib(g2, "Radio HT", "Alat komunikasi", "unit", 30, 28, 2, {kategori: "Komunikasi", kode: "3.07.01", nup: "8", merek: "Hytera", seri: "PD785", tahun: 2023, cara: "Pembelian", nilai: 6500000, rb: 2, label: "Belum", dok: "BAST-17", lokasi: "Rak 4"}),
    ib(g2, "Susu balita", "Pangan", "kaleng", 90, 90, 0, {kategori: "Pangan", ked: tgl(-10), batch: "S-2025-09", kode: "PG-102", harga: 70000, dok: "BAST-18", lokasi: "Rak 1"})];
  const b3 = [ib(g3, "Beras 5 kg", "Pangan", "karung", 120, 120, 0, {kategori: "Pangan", ked: tgl(120), batch: "B-2026-03", kode: "PG-201", harga: 65000, dok: "BAST-21", lokasi: "Gudang A"}),
    ib(g3, "Terpal 4x6 m", "Papan", "lembar", 150, 150, 0, {kategori: "Terpal", item_standar: "Terpal", prioritas: "2"})];
  const mut = (gid, bid, barang, kelompok, satuan, hari, jenis, jumlah, lawan, moda, dok, diterima, nilai) => st.push(env.DB.prepare("INSERT INTO logpal_mutasi (id, gudang_id, barang_id, tanggal, jenis, barang, kelompok, satuan, jumlah, lawan, moda, dokumen, nilai, pj, diterima, oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[DUMMY] Rahmat', ?, ?, ?, 1)")
    .bind(acak(8), gid, bid, tgl(hari), jenis, "[DUMMY] " + barang, kelompok, satuan, jumlah, lawan, moda, dok, nilai, diterima, oleh, kini + hari * HARI));
  mut(g2, b2[0], "Beras 5 kg", "Pangan", "karung", -20, "Masuk", 200, "Bulog Palangka Raya", "Darat", "SJ-0101", null, 13000000);
  mut(g2, b2[0], "Beras 5 kg", "Pangan", "karung", -9, "Keluar", 100, "Kabupaten Kapuas", "Darat", "BAST-K01", 100, 6500000);
  mut(g2, b2[2], "Matras lipat", "Sandang", "lembar", -7, "Keluar", 200, "Kabupaten Pulang Pisau", "Darat", "BAST-K02", 150, 30000000);
  mut(g2, b2[3], "Perahu karet", "Peralatan air", "unit", -5, "Keluar", 3, "Kabupaten Katingan", "Sungai", "BAST-K03", null, 285000000);
  mut(g2, b2[7], "Susu balita", "Pangan", "kaleng", -2, "Penghapusan", 10, "Kedaluwarsa", "", "BA-HPS-01", null, 700000);
  mut(g1, bn[0], "Selimut tebal standar BNPB", "Sandang", "lembar", -12, "Keluar", 300, "BPBD Provinsi Kalimantan Tengah", "Udara", "BAST-K10", 300, 25500000);
  mut(g1, bn[1], "Family kit", "Logistik lainnya", "paket", -6, "Masuk", 100, "Pusat Logistik BNPB", "Darat", "SP-1001", null, 45000000);
  const op = acak(8);
  st.push(env.DB.prepare("INSERT INTO logpal_opname (id, gudang_id, tanggal, petugas, disesuaikan, oleh, dibuat, dummy) VALUES (?, ?, ?, '[DUMMY] Siti', 0, ?, ?, 1)").bind(op, g2, tgl(-4), oleh, kini - 4 * HARI));
  [[b2[0], 380 + 0, 378, "Dua karung bocor"], [b2[1], 60, 60, ""], [b2[2], 500, 505, "Selisih dari penerimaan sebelumnya"], [b2[3], 8, 8, ""], [b2[5], 12, 11, "Satu unit di bengkel"]].forEach(([bid, tercatat, fisik, ket]) =>
    st.push(env.DB.prepare("INSERT INTO logpal_opname_baris (opname_id, barang_id, barang, satuan, tercatat, fisik, selisih, ket) SELECT ?, id, barang, satuan, ?, ?, ? , ? FROM logpal_barang WHERE id = ?").bind(op, tercatat, fisik, fisik - tercatat, ket, bid)));
  const minta = (akunId, jenis, bpbd, kab, sd, sk, jiwa, items, tahap, ditolak, hari, riwayat) => { const id = acak(8);
    st.push(env.DB.prepare("INSERT INTO logpal_permintaan (id, akun_id, jenis, bpbd, provinsi, kab, status_darurat, sk, jiwa, rekomendasi, trc, items, tahap, ditolak, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, 'Kalimantan Tengah', ?, ?, ?, ?, 'Layak', '[DUMMY] TRC-01', ?, ?, ?, ?, ?, 1)")
      .bind(id, akunId, jenis, bpbd, kab, sd, sk, jiwa, JSON.stringify(items), tahap, ditolak ? 1 : 0, kini + hari * HARI, kini + hari * HARI));
    riwayat.forEach(([t, p, c], i) => st.push(env.DB.prepare("INSERT INTO logpal_tahap (permintaan_id, tahap, petugas, catatan, waktu) VALUES (?, ?, ?, ?, ?)").bind(id, t, p, c, kini + hari * HARI + i * 3 * JAM))); return id; };
  const TD = FLOW["Tanggap darurat"], PK = FLOW["Penguatan kesiapsiagaan"], bp = "[DUMMY] BPBD Provinsi Kalimantan Tengah";
  minta(akun, "Tanggap darurat", bp, "Kapuas", "Siaga darurat", "SK-DUMMY/2026/01", 4200, [{barang: "Selimut", jumlah: 1500, satuan: "lembar"}, {barang: "Family kit", jumlah: 400, satuan: "paket"}], 2, false, -3,
    [[TD[0], bp, "Diajukan"], [TD[1], "[DUMMY] Nur", "Disetujui komandan"], [TD[2], "[DUMMY] Budi", "Barang disiapkan"]]);
  minta(akun, "Penguatan kesiapsiagaan", bp, "", "", "", 0, [{barang: "Terpal", jumlah: 600, satuan: "lembar"}], PK.length - 1, false, -30,
    PK.map((t, i) => [t, i ? "[DUMMY] Petugas" : bp, i ? "Selesai tahap " + i : "Diajukan"]));
  minta(null, "Tanggap darurat", "[DUMMY] BPBD Kabupaten Barito", "Barito", "Tanggap darurat", "SK-DUMMY/2026/02", 900, [{barang: "Tenda pengungsi", jumlah: 50, satuan: "unit"}], 0, true, -8,
    [[TD[0], "[DUMMY] BPBD Kabupaten Barito", "Diajukan"], ["Ditolak", "[DUMMY] Nur", "Stok daerah mencukupi"]]);
  minta(akun, "Penguatan kesiapsiagaan", bp, "", "", "", 0, [{barang: "Mi instan", jumlah: 800, satuan: "dus"}, {barang: "Matras", jumlah: 300, satuan: "lembar"}], 0, false, -1, [[PK[0], bp, "Diajukan"]]);
  [[1, "Kalimantan Tengah", "Selimut tebal standar BNPB", 5000, "lembar", 307, "307 lembar", 368, "368 lembar", 1, ""], [2, "Kalimantan Tengah", "Family kit", 2500, "boks", 0, "", 11, "11 paket", 1, ""], [3, "Kalimantan Tengah", "Minyak goreng pouch", 1500, "kg", 0, "", 3548, "3.548 liter", 0, "Terpenuhi"],
    [4, "Kalimantan Tengah", "Tenda peleton 6x8", 8, "unit", 8, "8 tenda pengungsi", 9, "9 tenda pengungsi", 0, "Pengganti"], [5, "Kalimantan Tengah", "Beras", 3000, "kg", 1000, "1.000 kg", 4000, "4.000 kg", 1, ""]]
    .forEach(([no, w, k, d, s, kq, kqt, sb, sbt, se, sts]) => st.push(env.DB.prepare("INSERT INTO logpal_kebutuhan (no, wilayah, kebutuhan, diajukan, satuan, stok_a, stok_a_teks, stok_b, stok_b_teks, setara, status_tetap, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(900 + no, "Kalimantan Tengah", "[DUMMY] " + k, d, s, kq, kqt, sb, sbt, se, sts)));
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return json({ok: true, gudang: 3, barang: bn.length + b2.length + b3.length, mutasi: 7, opname: 1, permintaan: 4, kebutuhan: 5}, 201);
}
async function dummyHapus(env) {
  const hit = async t => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n;
  const n = {gudang: await hit("logpal_gudang"), barang: await hit("logpal_barang"), mutasi: await hit("logpal_mutasi"), opname: await hit("logpal_opname"), permintaan: await hit("logpal_permintaan"), kebutuhan: await hit("logpal_kebutuhan")};
  await env.DB.batch(["logpal_permintaan", "logpal_opname", "logpal_mutasi", "logpal_barang", "logpal_gudang", "logpal_kebutuhan"].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1`))
    .concat(env.DB.prepare("DELETE FROM instansi_akun WHERE dummy = 1 AND username LIKE 'dummylogpal%' AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.akun_id = instansi_akun.id)")));
  return json({ok: true, ...n});
}
async function dummy(env, req, url, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, kini, String(mod));
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ halaman dan data statis (wajib login, keputusan pemilik 9 Nov 2026) */
/* Halaman di /instansi/logpal supaya cookie sesi_instansi (Path /instansi) ikut terkirim; staf (cookie Path=/) dan admin juga lewat jalur yang sama. Tanpa sesi: 303 ke /instansi; sesi sah tanpa hak: 403. */
async function halaman(env, req, url, kini) {
  const ak = await aktor(env, req, kini);
  if (ak instanceof Response) return ak.status === 401 ? new Response(null, {status: 303, headers: {location: "/instansi", "cache-control": "no-store"}}) : ak;
  const r = await env.ASSETS.fetch(new Request(new URL("/logpal/index.html", url)));
  return new Response(r.body, {status: r.status, headers: {"content-type": "text/html; charset=utf-8", "cache-control": "private, no-store", vary: "cookie", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff"}});
}
const NAMA_STATIS = ["gudang", "usulan", "rute", "jangkauan", "teks"];
const NAMA_POTONG = ["matriks", "kecamatan", "terdampak"];   // besar: potongan berurutan di logpal_statis_potong (migrasi 0113), dibaca sekali saat tab Pengantaran dibuka
/* ponytail: memo per isolat, TTL 10 menit, hanya hasil sukses. Ceiling: impor ulang baru terlihat di isolat yang memegang memo paling lama 10 menit, dan tiap isolat menyimpan ~1,4 MB;
   naik ke ETag/versi di tabel kecil bila impor sering atau memori isolat jadi masalah. */
const MEMO_POTONG = new Map();
async function statis(env, req, url, kini) {
  const ak = await aktor(env, req, kini); if (ak instanceof Response) return ak;
  const nama = url.searchParams.get("nama");
  const potong = NAMA_POTONG.includes(nama);
  if (!potong && !NAMA_STATIS.includes(nama)) return gagal(400, `nama harus ${[...NAMA_STATIS, ...NAMA_POTONG].join("/")}`);
  let isi;
  if (potong) {
    const m = MEMO_POTONG.get(nama);   // sesudah aktor() sah, sebelum D1: tamu tak sah tidak pernah sampai sini
    if (m && kini - m.t < 10 * 60e3) isi = m.isi;
    else {
      let results;
      try { ({results} = await env.DB.prepare("SELECT urut, isi FROM logpal_statis_potong WHERE nama = ? ORDER BY urut").bind(nama).all()); }
      catch (e) { return gagal(503, "tabel potongan data statis belum ada; jalankan migrasi LogPal 0112 dan 0113"); }
      if (!results.length) return gagal(404, "data statis belum diimpor (jalankan SQL keluaran scripts/logpal/impor.mjs)");
      if (results.some((r, i) => r.urut !== i)) return gagal(500, "potongan data statis tidak lengkap; impor ulang");
      isi = results.map(r => r.isi).join("");
      MEMO_POTONG.set(nama, {t: kini, isi});
    }
  } else {
    const r = await env.DB.prepare("SELECT isi FROM logpal_statis WHERE nama = ?").bind(nama).first();
    if (!r) return gagal(404, "data statis belum diimpor (jalankan SQL keluaran scripts/logpal/impor.mjs)");
    isi = r.isi;
  }
  return new Response(isi, {headers: {"content-type": nama === "teks" || nama === "matriks" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8", "cache-control": "private, no-store", "x-content-type-options": "nosniff"}});
}
/* JS dan CSS halaman: hanya sesi sah (pola halaman); tanpa sesi 401. Lewat Worker karena run_worker_first mencakup /logpal/* di wrangler.jsonc. */
const asetSah = (env, req, url, kini) => aktor(env, req, kini).then(ak => ak instanceof Response ? ak
  : env.ASSETS.fetch(new Request(url, {headers: req.headers})).then(r => new Response(req.method === "HEAD" ? null : r.body, {status: r.status, headers: {"content-type": r.headers.get("content-type") || (url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8"), "cache-control": "private, max-age=60", vary: "cookie", "x-content-type-options": "nosniff"}})));

/* rute digabung ke RUTE di src/worker.js. Tiap POST wajib x-pb: 1 (nyatakan). Halaman /logpal ada di HTML_RUTE worker.js. */
export const RUTE_LOGPAL = {
  "GET /instansi/logpal": halaman,
  "GET /logpal/index.html": halaman,   // alamat langsung berkas: gerbang yang sama (tanpa sesi tidak dapat HTML)
  "HEAD /instansi/logpal": halaman,
  "HEAD /logpal/index.html": halaman,   // HEAD anonim tidak boleh 200
  "GET /logpal/logpal.js": asetSah, "HEAD /logpal/logpal.js": asetSah, "GET /logpal/logpal.css": asetSah, "HEAD /logpal/logpal.css": asetSah,
  ...Object.fromEntries(Object.entries({
  "GET /api/instansi/logpal/statis": statis,
  "GET /api/instansi/logpal/data": baca,
  "POST /api/instansi/logpal/gudang": buatGudang,
  "POST /api/instansi/logpal/barang/:id": tambahBarang,
  "POST /api/instansi/logpal/ubah/:id": ubahBarang,
  "POST /api/instansi/logpal/mutasi/:id": catatMutasi,
  "POST /api/instansi/logpal/diterima/:id": catatDiterima,
  "POST /api/instansi/logpal/opname/:id": catatOpname,
  "POST /api/instansi/logpal/permintaan": buatPermintaan,
  "POST /api/instansi/logpal/tahap/:id": prosesTahap,
  "POST /api/instansi/logpal/dummy": dummy,
}).map(([k, f]) => [k, nyatakan(f)])),
};
