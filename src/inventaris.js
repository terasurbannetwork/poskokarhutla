/* Inventaris peralatan pemadam per pihak dan per gudang. Skema: migrations/0031_inventaris.sql. Aturan pemilik (21 Okt 2026):
   - Akun instansi AKTIF mengelola gudang dan alat MILIKNYA (CRUD, tiap perubahan jumlah/kondisi/status/pindah masuk alat_jejak). Gudang/alat akun lain dijawab 404, sama dengan "tidak ada".
   - "Data masih sama, tandai sudah dicek" memperbarui gudang.diubah; gudang yang diubah > 30 hari menjadi butir Meja Pantau (inventaris_lama) untuk pusdalops.
   - Semua instansi melihat RINGKASAN alat siap di provinsi cakupannya, tanpa PIC dan alamat milik pihak lain. Admin (modOK) dan staf (pusdalops, verifikator, pimpinan, koordalops) melihat semua,
     staf berwilayah hanya provinsinya, staf nyata tidak melihat baris dummy.
   - Alat dikerahkan lewat kabar tindakan (alat_inventaris) atau rute kerahkan; kembali siap saat tugas padam (otomatis, lepasDariTugas) atau manual (status siap).
   - P3K dan medis (migrations/0034_korban_p3k.sql): barang habis pakai per gudang di tabel p3k (BUKAN kategori baru di alat: CHECK alat tidak bisa dilonggarkan tanpa membangun ulang tabel). Kolom kedaluwarsa, satuan, ambang;
     stok berkurang lewat aksi pakai (jejak p3k_jejak, tugas api opsional); butir Meja Pantau bila kedaluwarsa dalam 30 hari atau stok di bawah ambang; rekap per provinsi di /api/inventaris. Tanpa 0034: rute P3K 503, sisanya jalan.
   - Tabel 0031 belum ada: semua rute inventaris 503 sopan; rincian tugas dan Meja Pantau tidak terganggu (pengait diam).
   ponytail: satu baris alat dikerahkan UTUH (tidak ada kerahkan sebagian); pecah baris bila perlu. Jarak gudang = garis lurus (haversine), bukan jarak tempuh.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. */
import {json, gagal, acak, sha, bacaBody, bacaBytes, normalWA} from "./worker.js";
import {tx, num, modOK, superOK, wib, tglSah} from "./posko.js";
import {laju} from "./bnpb.js";
import {km} from "./titik.js";
import {jenisBerkas} from "./foto.js";
import {bersihMedia} from "./media_bersih.js";
import {modAtauStaf, dalamWilayahStaf, stafNyata, stafSesi, P_VALIDASI} from "./staf.js";
import {akunAktif, tugasDalam, jsonAman, PROV, RUTE_INSTANSI} from "./instansi.js";
import {halamanInventaris, HALAMAN_STAF} from "./admin_halaman.js";
import {halamanAdmin} from "./statistik.js";

const JAM = 36e5, HARI = 24 * JAM, LAMA_HARI = 30, MAKS_GUDANG = 200, MAKS_ALAT_GUDANG = 300, MAKS_FOTO = 2 * 1048576;
/* daftar tetap: sama dengan CHECK di 0031 dan public/instansi_alat.js (dijaga inventaris.test.mjs) */
export const KATEGORI = {pompa: ["Pompa", null], selang_1_5: ["Selang 1,5 inci", "m"], selang_2_5: ["Selang 2,5 inci", "m"], nozzle: ["Nozzle", null], jet_shooter_lance: ["Jet shooter dan lance", null],
  tangki_fleksibel: ["Tangki fleksibel", "L"], mobil_tangki: ["Mobil tangki", "L"], mobil_pemadam: ["Mobil pemadam", "L"], motor_trail: ["Motor trail", null], alat_berat: ["Alat berat", null],
  drone_termal: ["Drone termal", null], genset: ["Genset", null], perahu: ["Perahu", null], apd_set: ["Set APD", null], scba: ["SCBA", null], kepyok_garu: ["Kepyok dan garu", null],
  pompa_punggung: ["Pompa punggung", null], ht_radio: ["HT dan radio", null], tenda: ["Tenda", null], lainnya: ["Lainnya", null]};
export const JENIS_GUDANG = {gudang: "Gudang", posko: "Posko", markas: "Markas", pos_daops: "Pos Daops", kendaraan_siaga: "Kendaraan siaga"};
export const KATEGORI_P3K = {kotak_p3k: "Kotak P3K", tandu: "Tandu", tabung_oksigen: "Tabung oksigen", regulator: "Regulator", masker_n95: "Masker N95", obat_tetes_mata: "Obat tetes mata",
  salep_luka_bakar: "Salep luka bakar", infus_oralit: "Cairan infus dan oralit", aed: "AED", lainnya: "Lainnya"};   // sama dengan CHECK p3k.kategori di 0034 dan public/instansi_alat.js
export const SATUAN_P3K = ["unit", "kotak", "buah", "liter"];
export const KEDALUWARSA_HARI = 30;
const tanpaP3k = e => /no such table: p3k/i.test(String(e?.message || e));
export const KELAS_POMPA = ["tekanan_tinggi", "debit_besar", "jinjing_ringan", "portabel_besar"];   // selaras POMPA di scripts/data/taktik.py
export const KONDISI = ["baik", "rusak_ringan", "rusak_berat"];
export const STATUS = ["siap", "dikerahkan", "servis"];
const PERAN_LIHAT = ["pusdalops", "verifikator", "pimpinan", "koordalops"];
const NAMA_JENIS_AKUN = {pemprov: "Pemprov", pemkab: "Pemkab", pemkot: "Pemkot", polda: "Polda", polres: "Polres", kodam: "Kodam", kodim: "Kodim"};
const RE_ID = /^[0-9a-f]{16}$/;
const ada = (o, k) => Object.hasOwn(o, k);
const tanpaTabel = e => /no such table: (gudang|alat)/i.test(String(e?.message || e));
const tolakMod = () => gagal(403, "fitur ini hanya untuk moderator ke atas atau staf berperan (bukan akun gerbang situs)");
const nyatakan = (fn, ikutPB) => async (env, req, ...sisa) => {
  if (ikutPB && req.method === "POST" && req.headers.get("x-pb") !== "1") return gagal(403, "kiriman instansi wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman /instansi)");
  try { return await fn(env, req, ...sisa); }
  catch (e) {
    if (tanpaTabel(e)) return gagal(503, "fitur inventaris belum diaktifkan (migrasi 0031_inventaris belum diterapkan)");
    if (tanpaP3k(e)) return gagal(503, "inventaris P3K belum diaktifkan (migrasi 0034_korban_p3k belum diterapkan)");
    throw e;
  }
};

/* ================================================================ murni: validasi */
const cakupanAkun = a => jsonAman(a.cakupan) || [];
/* gudang: {g} galat atau {v}. `lama` = baris gudang untuk ubahan sebagian */
export function cekGudang(o, a, lama = null) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  const nama = tx(f("nama"), 100); if (!nama || nama.length < 2) return {g: "nama gudang 2 sampai 100 karakter"};
  const jenis = f("jenis"); if (!Object.hasOwn(JENIS_GUDANG, jenis)) return {g: `jenis harus ${Object.keys(JENIS_GUDANG).join("/")}`};
  const lat = num(f("lat"), -11.5, 6.5), lon = num(f("lon"), 94.5, 141.5);
  if (lat == null || lon == null || Number.isNaN(lat) || Number.isNaN(lon)) return {g: "lokasi wajib: pilih titik di peta atau pakai GPS perangkat (lintang -11,5 sampai 6,5; bujur 94,5 sampai 141,5)"};
  const sumber = f("sumber_koordinat") ?? "peta"; if (sumber !== "peta" && sumber !== "gps") return {g: "sumber_koordinat harus peta/gps"};
  const alamat = tx(f("alamat"), 200); if (alamat === undefined) return {g: "alamat maksimal 200 karakter"};
  const pn = tx(f("pic_nama"), 80); if (pn === undefined || (pn && pn.length < 2)) return {g: "nama PIC 2 sampai 80 karakter"};
  const pw0 = f("pic_wa"), pw = pw0 == null || pw0 === "" ? null : typeof pw0 === "string" ? normalWA(pw0) : undefined;
  if (pw === undefined || (pw0 && pw === null)) return {g: "nomor WhatsApp PIC tidak sah (contoh 0812xxxxxxx)"};
  if (pw && !pn) return {g: "isi nama PIC bila mengisi nomor WhatsApp"};
  const cak = cakupanAkun(a), prov = ada(o, "prov") ? o.prov : lama?.prov ?? a.prov ?? (cak.length === 1 ? cak[0] : null);
  if (typeof prov !== "string" || !cak.includes(prov)) return {g: `provinsi gudang wajib dan harus salah satu cakupan akun (${cak.join(", ")})`};
  const kab = a.tingkat === "kab" ? a.kab : tx(f("kab"), 60); if (kab === undefined || (kab && kab.length < 2)) return {g: "kabupaten 2 sampai 60 karakter"};
  return {v: {nama, jenis, prov, kab: kab || null, alamat, lat, lon, sumber_koordinat: sumber, pic_nama: pn, pic_wa: pw}};
}
/* alat: {g} atau {v}; `lama` = baris alat untuk ubahan sebagian. kelas_pompa hanya untuk kategori pompa. */
export function cekAlat(o, lama = null) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  const kategori = f("kategori"); if (!Object.hasOwn(KATEGORI, kategori)) return {g: `kategori harus ${Object.keys(KATEGORI).join("/")}`};
  const merek = tx(f("merek_model"), 80); if (merek === undefined) return {g: "merek atau model maksimal 80 karakter"};
  const kelasIn = ada(o, "kelas_pompa") ? o.kelas_pompa : kategori === "pompa" ? lama?.kelas_pompa : null, kelas = kelasIn === "" ? null : kelasIn ?? null;
  if (kelas != null && (kategori !== "pompa" || !KELAS_POMPA.includes(kelas))) return {g: kategori !== "pompa" ? "kelas pompa hanya untuk kategori pompa" : `kelas pompa harus ${KELAS_POMPA.join("/")}`};
  const hp = num(f("hp"), 0.1, 2000), kap = num(f("kapasitas"), 0, 1e7), jumlah = num(f("jumlah"), 1, 100000, true), tahun = num(f("tahun"), 1970, 2100, true);
  if ([hp, kap, tahun].some(Number.isNaN)) return {g: "hp 0,1 sampai 2000, kapasitas 0 sampai 10 juta, tahun 1970 sampai 2100"};
  if (jumlah == null || Number.isNaN(jumlah)) return {g: "jumlah harus bilangan bulat 1 sampai 100000 (untuk menghapus pakai aksi hapus)"};
  const kondisi = f("kondisi") ?? "baik"; if (!KONDISI.includes(kondisi)) return {g: `kondisi harus ${KONDISI.join("/")}`};
  const catatan = tx(f("catatan"), 300); if (catatan === undefined) return {g: "catatan maksimal 300 karakter"};
  return {v: {kategori, merek_model: merek, kelas_pompa: kelas, hp, kapasitas: kap, jumlah, kondisi, tahun, catatan}};
}
const kelasDari = s => { if (typeof s !== "string") return null; const t = s.toLowerCase().replace(/[\s-]+/g, "_"); return KELAS_POMPA.find(k => t === k || t.includes(k) || s.toLowerCase().includes(k.replace("_", " "))) ?? null; };
const tengah = v => { const m = Array.isArray(v) ? (v.length === 3 ? v[1] : v[0]) : v; return typeof m === "number" && Number.isFinite(m) ? m : null; };

/* ================================================================ statement bersama */
const jejak = (env, oleh, alatId, gudangId, aksi, dari, ke, tugasId, kini, dummy, syarat = "1", ikat = []) =>
  env.DB.prepare("INSERT INTO alat_jejak (waktu, oleh, alat_id, gudang_id, aksi, dari, ke, tugas_id, dummy) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE " + syarat)
    .bind(kini, oleh, alatId, gudangId, aksi, dari == null ? null : String(dari).slice(0, 80), ke == null ? null : String(ke).slice(0, 80), tugasId ?? null, dummy ? 1 : 0, ...ikat);
const bump = (env, gudangId, kini) => env.DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ?").bind(kini, gudangId);
const bentukAlat = r => ({id: r.id, gudang_id: r.gudang_id, kategori: r.kategori, merek_model: r.merek_model, kelas_pompa: r.kelas_pompa, hp: r.hp, kapasitas: r.kapasitas, jumlah: r.jumlah, kondisi: r.kondisi,
  status: r.status, dikerahkan_ke_tugas: r.dikerahkan_ke_tugas, tahun: r.tahun, foto: !!r.foto, catatan: r.catatan, diubah: r.diubah});
/* kdl: 'lewat' (sudah kedaluwarsa) atau 'dekat' (dalam KEDALUWARSA_HARI hari) menurut tanggal WIB; rendah = stok di bawah ambang pemilik */
const bentukP3k = (r, kini) => ({id: r.id, gudang_id: r.gudang_id, kategori: r.kategori, nama: r.nama, satuan: r.satuan, jumlah: r.jumlah, ambang: r.ambang, kedaluwarsa: r.kedaluwarsa, catatan: r.catatan, diubah: r.diubah,
  kdl: !r.kedaluwarsa ? null : r.kedaluwarsa < wib(kini) ? "lewat" : r.kedaluwarsa <= wib(kini + KEDALUWARSA_HARI * HARI) ? "dekat" : null, rendah: r.ambang != null && r.jumlah < r.ambang});
const KAMUS = () => ({kategori: Object.entries(KATEGORI).map(([k, [label, satuan]]) => ({k, label, satuan})), jenis: JENIS_GUDANG, kelas_pompa: KELAS_POMPA, kondisi: KONDISI, status: STATUS, lama_hari: LAMA_HARI,
  p3k: Object.entries(KATEGORI_P3K).map(([k, label]) => ({k, label})), satuan_p3k: SATUAN_P3K, kedaluwarsa_hari: KEDALUWARSA_HARI});
const gudangMilik = (env, a, id) => typeof id === "string" && RE_ID.test(id) ? env.DB.prepare("SELECT * FROM gudang WHERE id = ? AND akun_id = ?").bind(id, a.id).first() : null;
const alatMilik = (env, a, id) => env.DB.prepare("SELECT l.*, g.nama gudang_nama FROM alat l JOIN gudang g ON g.id = l.gudang_id WHERE l.id = ? AND g.akun_id = ?").bind(id, a.id).first();
/* koordinat gudang PIHAK LAIN dibulatkan 0,01 derajat (kira-kira 1 km): cukup untuk gambaran sebaran dan jarak, tidak cukup untuk mendatangi gudangnya. Pemilik dan admin/staf tetap presisi. Jarak dan urutan dihitung dari koordinat asli di server. */
export const bulat01 = x => Math.round(x * 100) / 100;
const nTak = () => gagal(404, "tidak ada");   // "tidak ada" dan "milik pihak lain" dijawab sama

/* ================================================================ rute akun instansi: gudang */
async function daftarMilik(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const G = (await env.DB.prepare("SELECT * FROM gudang WHERE akun_id = ? ORDER BY nama LIMIT 500").bind(a.id).all()).results;
  const L = (await env.DB.prepare("SELECT l.* FROM alat l JOIN gudang g ON g.id = l.gudang_id WHERE g.akun_id = ? ORDER BY l.kategori, l.dibuat LIMIT 5000").bind(a.id).all()).results;
  const per = new Map(G.map(g => [g.id, []])); for (const l of L) per.get(l.gudang_id)?.push(bentukAlat(l));
  const perP = new Map(G.map(g => [g.id, []]));
  let p3kAktif = true;
  try { for (const r of (await env.DB.prepare("SELECT p.* FROM p3k p JOIN gudang g ON g.id = p.gudang_id WHERE g.akun_id = ? ORDER BY p.kategori, p.dibuat LIMIT 5000").bind(a.id).all()).results) perP.get(r.gudang_id)?.push(bentukP3k(r, kini)); }
  catch (e) { if (!tanpaP3k(e)) throw e; p3kAktif = false; }   // 0034 belum ada: tab Peralatan tetap jalan tanpa bagian P3K
  return json({kini, kamus: KAMUS(), p3k_aktif: p3kAktif, prov: cakupanAkun(a).map(p => ({kode: p, nama: PROV[p]?.[1] ?? p})), tingkat: a.tingkat, kab: a.kab,
    gudang: G.map(g => ({...g, akun_id: undefined, dummy: undefined, basi: kini - g.diubah > LAMA_HARI * HARI, alat: per.get(g.id), p3k: perP.get(g.id)}))});
}
async function tambahGudang(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const c = cekGudang(b.o, a); if (c.g) return gagal(400, c.g);
  if ((await env.DB.prepare("SELECT count(*) n FROM gudang WHERE akun_id = ?").bind(a.id).first()).n >= MAKS_GUDANG) return gagal(409, `maksimal ${MAKS_GUDANG} gudang per akun`);
  const l = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (l) return l;
  const id = acak(8), v = c.v;
  await env.DB.prepare("INSERT INTO gudang (id, akun_id, nama, jenis, prov, kab, alamat, lat, lon, sumber_koordinat, pic_nama, pic_wa, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, a.id, v.nama, v.jenis, v.prov, v.kab, v.alamat, v.lat, v.lon, v.sumber_koordinat, v.pic_nama, v.pic_wa, kini, kini, a.dummy ? 1 : 0).run();
  return json({id}, 201);
}
async function ubahGudang(env, req, url, kini, ctx, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const g = await gudangMilik(env, a, id); if (!g) return nTak();
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const aksi = b.o.aksi;
  if (aksi !== "ubah" && aksi !== "konfirmasi" && aksi !== "hapus") return gagal(400, "aksi harus ubah/konfirmasi/hapus");
  const c = aksi === "ubah" ? cekGudang(b.o, a, g) : null; if (c?.g) return gagal(400, c.g);
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;   // sama dengan tambah gudang/alat: tulis apa pun dibatasi
  if (aksi === "konfirmasi") { await bump(env, id, kini).run(); return json({id, diubah: kini}); }
  if (aksi === "hapus") {
    /* atomik: syarat "tak ada alat" ada di DELETE itu sendiri. Cek-lalu-hapus terpisah membiarkan alat yang baru ditambah (serentak) ikut terhapus diam-diam lewat ON DELETE CASCADE. */
    const hapus = p3k => env.DB.prepare(`DELETE FROM gudang WHERE id = ? AND akun_id = ? AND NOT EXISTS (SELECT 1 FROM alat WHERE gudang_id = ?)${p3k ? " AND NOT EXISTS (SELECT 1 FROM p3k WHERE gudang_id = ?)" : ""}`).bind(id, a.id, id, ...(p3k ? [id] : [])).run();
    let r; try { r = await hapus(true); } catch (e) { if (!tanpaP3k(e)) throw e; r = await hapus(false); }   // barang P3K juga menahan hapus gudang; tanpa 0034 hanya alat
    return r.meta.changes ? json({id, dihapus: true}) : gagal(409, "gudang masih berisi alat atau barang P3K; pindahkan atau hapus isinya dulu");
  }
  const v = c.v;
  await env.DB.prepare("UPDATE gudang SET nama = ?, jenis = ?, prov = ?, kab = ?, alamat = ?, lat = ?, lon = ?, sumber_koordinat = ?, pic_nama = ?, pic_wa = ?, diubah = ? WHERE id = ? AND akun_id = ?")
    .bind(v.nama, v.jenis, v.prov, v.kab, v.alamat, v.lat, v.lon, v.sumber_koordinat, v.pic_nama, v.pic_wa, kini, id, a.id).run();
  return json({id, diubah: kini});
}

/* ================================================================ rute akun instansi: alat */
async function tambahAlat(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const g = await gudangMilik(env, a, b.o.gudang_id); if (!g) return gagal(404, "gudang tidak ada");
  const c = cekAlat(b.o); if (c.g) return gagal(400, c.g);
  const st = ada(b.o, "status") ? b.o.status : "siap";
  if (st !== "siap" && st !== "servis") return gagal(400, "status awal siap atau servis (dikerahkan lewat tugas api)");
  const status = c.v.kondisi === "rusak_berat" ? "servis" : st;
  if ((await env.DB.prepare("SELECT count(*) n FROM alat WHERE gudang_id = ?").bind(g.id).first()).n >= MAKS_ALAT_GUDANG) return gagal(409, `maksimal ${MAKS_ALAT_GUDANG} jenis alat per gudang`);
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
  const id = acak(8), v = c.v, dummy = a.dummy ? 1 : 0;
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO alat (id, gudang_id, kategori, merek_model, kelas_pompa, hp, kapasitas, jumlah, kondisi, status, tahun, catatan, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, g.id, v.kategori, v.merek_model, v.kelas_pompa, v.hp, v.kapasitas, v.jumlah, v.kondisi, status, v.tahun, v.catatan, kini, kini, dummy),
      jejak(env, a.id, id, g.id, "tambah", null, `${v.kategori} x${v.jumlah}`, null, kini, dummy), bump(env, g.id, kini)]);
  } catch (e) { if (/FOREIGN KEY/i.test(String(e?.message || e))) return gagal(409, "gudang baru saja dihapus; muat ulang"); throw e; }   // hapus gudang serentak
  return json({id}, 201);
}
async function ubahAlat(env, req, url, kini, ctx, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const l = await alatMilik(env, a, id); if (!l) return nTak();
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, dummy = l.dummy;
  /* penguncian optimistis: tulisan hanya berlaku bila status dan tugas yang tadi dibaca masih sama (padam, kerahkan, atau ubah serentak = 409). Jejak dan gudang hanya ikut bila UPDATE/DELETE berhasil (changes() > 0). */
  const SAMA = "status = ? AND dikerahkan_ke_tugas IS ?", konflik = () => gagal(409, "alat sudah berubah (dikerahkan, dipulangkan, atau diubah pihak lain); muat ulang lalu ulangi");
  if (o.aksi === "hapus") {
    const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
    const r = await env.DB.batch([env.DB.prepare(`DELETE FROM alat WHERE id = ? AND ${SAMA}`).bind(id, l.status, l.dikerahkan_ke_tugas), jejak(env, a.id, id, l.gudang_id, "hapus", `${l.kategori} x${l.jumlah}`, null, null, kini, dummy, "changes() > 0"),
      env.DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ? AND NOT EXISTS (SELECT 1 FROM alat WHERE id = ?)").bind(kini, l.gudang_id, id)]);
    if (!r[0].meta.changes) return konflik();
    if (l.foto && env.MEDIA) await env.MEDIA.delete(`inventaris/foto/${id}`);
    return json({id, dihapus: true});
  }
  if (o.aksi !== "ubah") return gagal(400, "aksi harus ubah/hapus");
  const c = cekAlat(o, l); if (c.g) return gagal(400, c.g);
  let tujuan = null;
  if (ada(o, "gudang_id") && o.gudang_id !== l.gudang_id) { tujuan = await gudangMilik(env, a, o.gudang_id); if (!tujuan) return gagal(404, "gudang tujuan tidak ada"); }
  const diminta = ada(o, "status") ? o.status : l.status;
  if (!STATUS.includes(diminta)) return gagal(400, `status harus ${STATUS.join("/")}`);
  if (diminta === "dikerahkan" && l.status !== "dikerahkan") return gagal(400, "mengerahkan alat lewat kabar tindakan tugas api atau tombol Kerahkan");
  if (c.v.kondisi === "rusak_berat" && ada(o, "status") && o.status === "siap") return gagal(400, "alat rusak berat tidak bisa berstatus siap");
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
  const status = c.v.kondisi === "rusak_berat" && diminta === "siap" ? "servis" : diminta, tugas = status === "dikerahkan" ? l.dikerahkan_ke_tugas : null, v = c.v, gid = tujuan?.id ?? l.gudang_id;
  const st = [env.DB.prepare(`UPDATE alat SET gudang_id = ?, kategori = ?, merek_model = ?, kelas_pompa = ?, hp = ?, kapasitas = ?, jumlah = ?, kondisi = ?, status = ?, dikerahkan_ke_tugas = ?, tahun = ?, catatan = ?, diubah = ? WHERE id = ? AND ${SAMA}`)
    .bind(gid, v.kategori, v.merek_model, v.kelas_pompa, v.hp, v.kapasitas, v.jumlah, v.kondisi, status, tugas, v.tahun, v.catatan, kini, id, l.status, l.dikerahkan_ke_tugas)];
  const ikut = (...x) => st.push(jejak(env, a.id, id, gid, ...x, "changes() > 0"));   // changes() tetap > 0 sepanjang rantai bila UPDATE berhasil, 0 bila kalah
  if (v.jumlah !== l.jumlah) ikut("jumlah", l.jumlah, v.jumlah, null, kini, dummy);
  if (v.kondisi !== l.kondisi) ikut("kondisi", l.kondisi, v.kondisi, null, kini, dummy);
  if (status !== l.status) ikut("status", l.status, status, l.status === "dikerahkan" ? l.dikerahkan_ke_tugas : null, kini, dummy);
  if (tujuan) ikut("pindah", l.gudang_nama, tujuan.nama, null, kini, dummy);
  const berhasil = "EXISTS (SELECT 1 FROM alat WHERE id = ? AND diubah = ?)";   // tanda UPDATE tadi menang: gudang hanya digeser bila alatnya benar-benar berubah
  st.push(env.DB.prepare(`UPDATE gudang SET diubah = ? WHERE id = ? AND ${berhasil}`).bind(kini, l.gudang_id, id, kini)); if (tujuan) st.push(env.DB.prepare(`UPDATE gudang SET diubah = ? WHERE id = ? AND ${berhasil}`).bind(kini, tujuan.id, id, kini));
  const r = await env.DB.batch(st);
  if (!r[0].meta.changes) return konflik();
  return json({alat: bentukAlat(await env.DB.prepare("SELECT * FROM alat WHERE id = ?").bind(id).first())});
}

/* ================================================================ kerahkan dan kembali (dipakai kabar tindakan dan rute kerahkan) */
/* Periksa pilihan alat milik akun; kembalikan {g, s} galat atau {rows, stmts(kini, syarat, ikat)}. syarat = SQL tambahan yang harus berlaku saat batch jalan. */
export async function siapkanKerahkan(env, akun, tugasId, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || !ids.every(x => typeof x === "string" && RE_ID.test(x)) || new Set(ids).size !== ids.length)
    return {g: "alat_inventaris harus larik 1 sampai 50 id alat tanpa duplikat", s: 400};
  let rows;
  try { rows = (await env.DB.prepare("SELECT l.id, l.gudang_id, l.status, l.kategori, l.dummy FROM alat l JOIN gudang g ON g.id = l.gudang_id WHERE g.akun_id = ? AND l.id IN (SELECT value FROM json_each(?))").bind(akun.id, JSON.stringify(ids)).all()).results; }
  catch (e) { if (tanpaTabel(e)) return {g: "fitur inventaris belum diaktifkan (migrasi 0031_inventaris belum diterapkan)", s: 503}; throw e; }
  if (rows.length !== ids.length) return {g: "ada alat yang tidak ditemukan atau bukan milik akun ini", s: 404};
  const salah = rows.find(r => r.status !== "siap"); if (salah) return {g: `alat ${KATEGORI[salah.kategori][0]} berstatus ${salah.status}, hanya alat siap yang bisa dikerahkan`, s: 409};
  return {rows, stmts: (kini, syarat, ikat) => rows.flatMap(r => [
    env.DB.prepare(`UPDATE alat SET status = 'dikerahkan', dikerahkan_ke_tugas = ?, diubah = ? WHERE id = ? AND status = 'siap' AND ${syarat}`).bind(tugasId, kini, r.id, ...ikat),
    jejak(env, akun.id, r.id, r.gudang_id, "status", "siap", "dikerahkan", tugasId, kini, r.dummy, "changes() > 0"),
    env.DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ? AND EXISTS (SELECT 1 FROM alat WHERE id = ? AND dikerahkan_ke_tugas = ?)").bind(kini, r.gudang_id, r.id, tugasId)])};
}
async function kerahkan(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.tugas_id !== "string" || !RE_ID.test(b.o.tugas_id)) return gagal(400, "tugas_id wajib");
  const t = await tugasDalam(env, a, b.o.tugas_id); if (t instanceof Response) return t;
  if (t.status !== "buka" || t.hasil_konfirmasi !== "api_ada") return gagal(409, "alat hanya bisa dikerahkan ke tugas yang terbuka dan sudah dikonfirmasi api ada");
  const p = await siapkanKerahkan(env, a, t.id, b.o.alat); if (p.g) return gagal(p.s, p.g);
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
  await env.DB.batch(p.stmts(kini, "EXISTS (SELECT 1 FROM tugas_api WHERE id = ? AND status = 'buka')", [t.id]));
  return json({dikerahkan: (await env.DB.prepare("SELECT count(*) n FROM alat WHERE dikerahkan_ke_tugas = ? AND id IN (SELECT value FROM json_each(?))").bind(t.id, JSON.stringify(b.o.alat)).first()).n});
}
/* Tugas padam: semua alat yang dikerahkan ke sana kembali siap (rusak_berat jadi servis). Dipanggil SESUDAH isian tersimpan; galat di sini tidak menggagalkan kabar (alat bisa dikembalikan manual). */
export async function lepasDariTugas(env, tugasId, kini) {
  try {
    const rows = (await env.DB.prepare("SELECT id, gudang_id, kondisi, dummy FROM alat WHERE dikerahkan_ke_tugas = ?").bind(tugasId).all()).results;
    if (!rows.length) return 0;
    await env.DB.batch(rows.flatMap(r => [jejak(env, "sistem", r.id, r.gudang_id, "status", "dikerahkan", r.kondisi === "rusak_berat" ? "servis" : "siap", tugasId, kini, r.dummy, "EXISTS (SELECT 1 FROM alat WHERE id = ? AND dikerahkan_ke_tugas = ?)", [r.id, tugasId]),
      env.DB.prepare("UPDATE alat SET status = CASE WHEN kondisi = 'rusak_berat' THEN 'servis' ELSE 'siap' END, dikerahkan_ke_tugas = NULL, diubah = ? WHERE id = ? AND dikerahkan_ke_tugas = ?").bind(kini, r.id, tugasId)]));
    return rows.length;
  } catch (e) { if (!tanpaTabel(e)) console.error("lepasDariTugas", e?.message); return 0; }
}

/* ================================================================ foto alat (opsional): R2 inventaris/foto/<alat>, EXIF dibuang */
async function unggahFoto(env, req, url, kini, ctx, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const l = await alatMilik(env, a, id); if (!l) return nTak();
  if (!env.MEDIA) return gagal(503, "penyimpanan berkas belum aktif (R2 MEDIA)");
  const lj = await laju(env, a.id, "inventaris.foto", [[JAM, 30]], kini); if (lj) return lj;
  if (!(Number(req.headers.get("content-length")) > 0)) return gagal(411, "Content-Length wajib pada unggahan");
  const u = await bacaBytes(req, MAKS_FOTO); if (u.galat) return gagal(u.status || 400, u.galat);
  const mime = jenisBerkas(u.b); if (mime !== "image/jpeg" && mime !== "image/webp") return gagal(400, "foto alat harus JPEG atau WebP");
  const bersih = bersihMedia(mime, u.b); if (!bersih) return gagal(400, "struktur gambar tidak sah");
  await env.MEDIA.put(`inventaris/foto/${id}`, bersih, {httpMetadata: {contentType: mime}});
  try { await env.DB.batch([env.DB.prepare("UPDATE alat SET foto = 1, diubah = ? WHERE id = ?").bind(kini, id), bump(env, l.gudang_id, kini)]); } catch (e) { await env.MEDIA.delete(`inventaris/foto/${id}`); throw e; }
  return json({foto: true});
}
async function kirimFoto(env, id) {
  const o = env.MEDIA ? await env.MEDIA.get(`inventaris/foto/${id}`) : null;
  return o ? new Response(o.body, {headers: {"content-type": o.httpMetadata?.contentType || "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "sandbox; default-src 'none'"}}) : gagal(404, "foto tidak ada");
}
async function lihatFotoMilik(env, req, url, kini, ctx, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  return await alatMilik(env, a, id) ? kirimFoto(env, id) : nTak();
}

/* ================================================================ P3K dan medis (tabel p3k, migrasi 0034): CRUD pemilik, pakai (stok berkurang dengan jejak), butir Meja Pantau */
const MAKS_P3K_GUDANG = 100;
/* {g} galat atau {v}; `lama` = baris untuk ubahan sebagian. jumlah boleh 0 (habis). kedaluwarsa = tanggal WIB YYYY-MM-DD atau kosong. */
export function cekP3k(o, lama = null) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  const kategori = f("kategori"); if (!Object.hasOwn(KATEGORI_P3K, kategori)) return {g: `kategori P3K harus ${Object.keys(KATEGORI_P3K).join("/")}`};
  const nama = tx(f("nama"), 80); if (nama === undefined) return {g: "nama atau merek maksimal 80 karakter"};
  const satuan = f("satuan") ?? "unit"; if (!SATUAN_P3K.includes(satuan)) return {g: `satuan harus ${SATUAN_P3K.join("/")}`};
  const jumlah = num(f("jumlah"), 0, 1e6, true); if (jumlah == null || Number.isNaN(jumlah)) return {g: "jumlah harus bilangan bulat 0 sampai 1.000.000"};
  const ambang = num(f("ambang"), 1, 1e6, true); if (Number.isNaN(ambang)) return {g: "ambang stok harus bilangan bulat 1 sampai 1.000.000, atau kosong"};
  const kd0 = f("kedaluwarsa"), kd = kd0 == null || kd0 === "" ? null : kd0;
  if (kd != null && (typeof kd !== "string" || !tglSah(kd))) return {g: "kedaluwarsa harus tanggal sah berbentuk TTTT-BB-HH, atau kosong"};
  const catatan = tx(f("catatan"), 300); if (catatan === undefined) return {g: "catatan maksimal 300 karakter"};
  return {v: {kategori, nama, satuan, jumlah, ambang, kedaluwarsa: kd, catatan}};
}
const jejakP3k = (env, oleh, id, gudangId, aksi, dari, ke, tugasId, kini, dummy, syarat = "1") =>
  env.DB.prepare("INSERT INTO p3k_jejak (waktu, oleh, p3k_id, gudang_id, aksi, dari, ke, tugas_id, dummy) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE " + syarat)
    .bind(kini, oleh, id, gudangId, aksi, dari == null ? null : String(dari).slice(0, 80), ke == null ? null : String(ke).slice(0, 80), tugasId ?? null, dummy ? 1 : 0);
const p3kMilik = (env, a, id) => env.DB.prepare("SELECT p.*, g.nama gudang_nama FROM p3k p JOIN gudang g ON g.id = p.gudang_id WHERE p.id = ? AND g.akun_id = ?").bind(id, a.id).first();
async function tambahP3k(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const g = await gudangMilik(env, a, b.o.gudang_id); if (!g) return gagal(404, "gudang tidak ada");
  const c = cekP3k(b.o); if (c.g) return gagal(400, c.g);
  if ((await env.DB.prepare("SELECT count(*) n FROM p3k WHERE gudang_id = ?").bind(g.id).first()).n >= MAKS_P3K_GUDANG) return gagal(409, `maksimal ${MAKS_P3K_GUDANG} jenis barang P3K per gudang`);
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
  const id = acak(8), v = c.v, dummy = a.dummy ? 1 : 0;
  try {
    await env.DB.batch([env.DB.prepare("INSERT INTO p3k (id, gudang_id, kategori, nama, satuan, jumlah, ambang, kedaluwarsa, catatan, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, g.id, v.kategori, v.nama, v.satuan, v.jumlah, v.ambang, v.kedaluwarsa, v.catatan, kini, kini, dummy),
      jejakP3k(env, a.id, id, g.id, "tambah", null, `${v.kategori} x${v.jumlah}`, null, kini, dummy), bump(env, g.id, kini)]);
  } catch (e) { if (/FOREIGN KEY/i.test(String(e?.message || e))) return gagal(409, "gudang baru saja dihapus; muat ulang"); throw e; }
  return json({id}, 201);
}
async function ubahP3k(env, req, url, kini, ctx, id) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const l = await p3kMilik(env, a, id); if (!l) return nTak();
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o, dummy = l.dummy, SAMA = "diubah = ?", konflik = () => gagal(409, "barang P3K sudah berubah (dipakai atau diubah pihak lain); muat ulang lalu ulangi");
  const sesudah = "EXISTS (SELECT 1 FROM p3k WHERE id = ? AND diubah = ?)";
  if (o.aksi === "hapus") {
    const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
    const r = await env.DB.batch([env.DB.prepare(`DELETE FROM p3k WHERE id = ? AND ${SAMA}`).bind(id, l.diubah), jejakP3k(env, a.id, id, l.gudang_id, "hapus", `${l.kategori} x${l.jumlah}`, null, null, kini, dummy, "changes() > 0"),
      env.DB.prepare("UPDATE gudang SET diubah = ? WHERE id = ? AND NOT EXISTS (SELECT 1 FROM p3k WHERE id = ?)").bind(kini, l.gudang_id, id)]);
    return r[0].meta.changes ? json({id, dihapus: true}) : konflik();
  }
  if (o.aksi === "pakai") {
    /* stok berkurang saat dipakai; syarat "jumlah >= n" ada di UPDATE itu sendiri (dua pemakaian serentak tidak membuat stok minus). tugas_id opsional: harus tugas dalam lingkup akun. */
    const n = num(o.jumlah, 1, 1e6, true); if (n == null || Number.isNaN(n)) return gagal(400, "jumlah yang dipakai harus bilangan bulat minimal 1");
    let tugasId = null;
    if (o.tugas_id != null && o.tugas_id !== "") { if (typeof o.tugas_id !== "string" || !RE_ID.test(o.tugas_id)) return gagal(400, "tugas_id tidak sah"); const t = await tugasDalam(env, a, o.tugas_id); if (t instanceof Response) return t; tugasId = t.id; }
    if (l.jumlah < n) return gagal(409, `stok ${l.jumlah} tidak cukup untuk dipakai ${n}`);
    const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
    const r = await env.DB.batch([env.DB.prepare("UPDATE p3k SET jumlah = jumlah - ?, diubah = ? WHERE id = ? AND jumlah >= ?").bind(n, kini, id, n),
      jejakP3k(env, a.id, id, l.gudang_id, "pakai", l.jumlah, l.jumlah - n, tugasId, kini, dummy, "changes() > 0"),
      env.DB.prepare(`UPDATE gudang SET diubah = ? WHERE id = ? AND ${sesudah}`).bind(kini, l.gudang_id, id, kini)]);
    if (!r[0].meta.changes) return gagal(409, "stok tidak cukup (baru saja berubah); muat ulang lalu ulangi");
    return json({id, jumlah: (await env.DB.prepare("SELECT jumlah FROM p3k WHERE id = ?").bind(id).first()).jumlah});
  }
  if (o.aksi !== "ubah") return gagal(400, "aksi harus ubah/pakai/hapus");
  const c = cekP3k(o, l); if (c.g) return gagal(400, c.g);
  const lj = await laju(env, a.id, "inventaris.tulis", [[JAM, 200]], kini); if (lj) return lj;
  const v = c.v, lain = ["kategori", "nama", "satuan", "ambang", "kedaluwarsa", "catatan"].some(k => v[k] !== l[k]);
  const st = [env.DB.prepare(`UPDATE p3k SET kategori = ?, nama = ?, satuan = ?, jumlah = ?, ambang = ?, kedaluwarsa = ?, catatan = ?, diubah = ? WHERE id = ? AND ${SAMA}`)
    .bind(v.kategori, v.nama, v.satuan, v.jumlah, v.ambang, v.kedaluwarsa, v.catatan, kini, id, l.diubah)];
  if (v.jumlah !== l.jumlah) st.push(jejakP3k(env, a.id, id, l.gudang_id, "jumlah", l.jumlah, v.jumlah, null, kini, dummy, "changes() > 0"));
  if (lain) {   // semua bidang yang berubah (dari dan ke dibatasi 80 huruf oleh jejakP3k)
    const ber = ["kategori", "nama", "satuan", "ambang", "kedaluwarsa", "catatan"].filter(k => v[k] !== l[k]), t = x => x == null ? "kosong" : x;
    st.push(jejakP3k(env, a.id, id, l.gudang_id, "ubah", ber.map(k => `${k}: ${t(l[k])}`).join("; "), ber.map(k => `${k}: ${t(v[k])}`).join("; "), null, kini, dummy, "changes() > 0"));
  }
  st.push(env.DB.prepare(`UPDATE gudang SET diubah = ? WHERE id = ? AND ${sesudah}`).bind(kini, l.gudang_id, id, kini));
  const r = await env.DB.batch(st);
  if (!r[0].meta.changes) return konflik();
  return json({p3k: bentukP3k(await env.DB.prepare("SELECT * FROM p3k WHERE id = ?").bind(id).first(), kini)});
}
/* Meja Pantau: P3K berjumlah > 0 yang kedaluwarsa dalam 30 hari (atau sudah lewat), dan P3K yang stoknya di bawah ambang pemilik gudang. Tanpa tabel 0034: []. */
export async function butirP3k(env, kini, dummyOk) {
  try {
    const batas = wib(kini + KEDALUWARSA_HARI * HARI), hari = wib(kini);
    const R = (await env.DB.prepare(`SELECT p.id, p.kategori, p.nama, p.jumlah, p.ambang, p.satuan, p.kedaluwarsa, p.diubah, p.dummy, g.nama gnama, g.prov, g.kab, k.wilayah FROM p3k p JOIN gudang g ON g.id = p.gudang_id JOIN instansi_akun k ON k.id = g.akun_id
      WHERE k.status = 'aktif' ${dummyOk ? "" : "AND p.dummy = 0"} AND ((p.kedaluwarsa IS NOT NULL AND p.kedaluwarsa <= ? AND p.jumlah > 0) OR (p.ambang IS NOT NULL AND p.jumlah < p.ambang)) ORDER BY p.kedaluwarsa LIMIT 500`).bind(batas).all()).results;
    const out = [], label = r => `${KATEGORI_P3K[r.kategori]}${r.nama ? " " + r.nama : ""}`;
    for (const r of R) {
      const asal = {provs: [r.prov], kab: r.kab, dummy: r.dummy};
      if (r.kedaluwarsa && r.kedaluwarsa <= batas && r.jumlah > 0) {
        const lewat = r.kedaluwarsa < hari, tgl = Date.parse(r.kedaluwarsa + "T00:00:00+07:00"), sisa = Math.ceil((tgl - Date.parse(hari + "T00:00:00+07:00")) / HARI);
        out.push({id: `p3k-kdl:${r.id}:${r.kedaluwarsa}`, jenis: "p3k_kedaluwarsa", judul: `${label(r)} ${r.jumlah} ${r.satuan} di ${r.gnama} (${r.wilayah}) ${lewat ? "sudah kedaluwarsa" : sisa === 0 ? "kedaluwarsa hari ini" : `kedaluwarsa ${sisa} hari lagi`}`,
          rincian: "Minta pemilik gudang mengganti stok atau menarik barangnya", ...asal, dibuat: r.diubah, tenggat: tgl, prioritas: lewat ? 2 : 3});
      }
      if (r.ambang != null && r.jumlah < r.ambang)
        out.push({id: `p3k-stok:${r.id}:${r.diubah}`, jenis: "p3k_stok", judul: `${label(r)} di ${r.gnama} (${r.wilayah}) tinggal ${r.jumlah} ${r.satuan}, di bawah ambang ${r.ambang}`, rincian: "Minta pemilik gudang mengisi ulang stok",
          ...asal, dibuat: r.diubah, tenggat: null, prioritas: r.jumlah === 0 ? 2 : 3});
    }
    return out;
  } catch (e) { if (tanpaP3k(e)) return []; throw e; }
}

/* ================================================================ ringkasan wilayah untuk semua instansi (tanpa PIC dan alamat milik pihak lain) */
async function ringkasanWilayah(env, req, url, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const G = (await env.DB.prepare(`SELECT g.id, g.akun_id, g.nama, g.jenis, g.prov, g.kab, g.lat, g.lon, g.diubah, k.jenis pjenis, k.wilayah pwilayah FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id
    WHERE g.prov IN (SELECT value FROM json_each(?)) AND k.status = 'aktif' ${a.dummy ? "" : "AND g.dummy = 0"} ORDER BY g.prov, g.nama LIMIT 1000`).bind(a.cakupan).all()).results;
  const S = (await env.DB.prepare(`SELECT l.gudang_id, l.kategori, sum(l.jumlah) n FROM alat l WHERE l.status = 'siap' AND l.gudang_id IN (SELECT g.id FROM gudang g WHERE g.prov IN (SELECT value FROM json_each(?)) ${a.dummy ? "" : "AND g.dummy = 0"})
    GROUP BY l.gudang_id, l.kategori`).bind(a.cakupan).all()).results;
  const siap = new Map(); for (const s of S) (siap.get(s.gudang_id) || siap.set(s.gudang_id, {}).get(s.gudang_id))[s.kategori] = s.n;
  const total = {}; for (const s of S) total[s.kategori] = (total[s.kategori] || 0) + s.n;
  return json({kini, kamus: KAMUS(), total_siap: total, gudang: G.map(g => ({id: g.id, nama: g.nama, jenis: g.jenis, prov: g.prov, kab: g.kab, lat: g.akun_id === a.id ? g.lat : bulat01(g.lat), lon: g.akun_id === a.id ? g.lon : bulat01(g.lon), koordinat_kasar: g.akun_id !== a.id, diubah: g.diubah, milik_saya: g.akun_id === a.id,
    pemilik: {jenis: g.pjenis, nama: g.pwilayah}, siap: siap.get(g.id) || {}}))});
}

/* ================================================================ gudang terdekat dengan alat siap (rincian tugas api) */
/* t = baris tugas (lat, lon, prov, rekomendasi, dummy). provs = batasi provinsi (akun instansi) atau null (admin). akunId = penanda milik sendiri; adminPic = sertakan PIC. */
/* dalam = (prov) => bool untuk staf berwilayah: gudang di luar wilayahnya tetap tampil (bantuan lintas wilayah), tetapi PIC disembunyikan dan koordinat dibulatkan 0,01 derajat */
export async function gudangTerdekat(env, t, {provs = null, akunId = null, adminPic = false, batas = 5, dalam = null} = {}) {
  try {
    const d = 3, w = [t.lat - d, t.lat + d, t.lon - d, t.lon + d];
    const G = (await env.DB.prepare(`SELECT g.id, g.akun_id, g.nama, g.jenis, g.prov, g.kab, g.lat, g.lon, g.diubah, g.pic_nama, g.pic_wa, k.jenis pjenis, k.wilayah pwilayah FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id
      WHERE g.lat BETWEEN ? AND ? AND g.lon BETWEEN ? AND ? AND k.status = 'aktif' AND g.dummy = ? AND (? IS NULL OR g.prov IN (SELECT value FROM json_each(?)))
        AND EXISTS (SELECT 1 FROM alat l WHERE l.gudang_id = g.id AND l.status = 'siap') LIMIT 500`).bind(...w, t.dummy ? 1 : 0, provs && JSON.stringify(provs), provs && JSON.stringify(provs)).all()).results;
    const dekat = G.map(g => ({...g, jarak: km(t.lat, t.lon, g.lat, g.lon)})).sort((x, y) => x.jarak - y.jarak).slice(0, batas);
    if (!dekat.length) return {gudang: [], pompa: []};
    const S = (await env.DB.prepare("SELECT gudang_id, kategori, kelas_pompa, hp, sum(jumlah) jumlah FROM alat WHERE status = 'siap' AND gudang_id IN (SELECT value FROM json_each(?)) GROUP BY gudang_id, kategori, kelas_pompa ORDER BY kategori")
      .bind(JSON.stringify(dekat.map(g => g.id))).all()).results;
    const luar = g => !!dalam && !dalam(g.prov), kasar = g => (!adminPic && g.akun_id !== akunId) || luar(g);   // pihak lain: koordinat dibulatkan (admin dan pemilik presisi)
    const gudang = dekat.map(g => ({id: g.id, nama: g.nama, jenis: g.jenis, prov: g.prov, kab: g.kab, lat: kasar(g) ? bulat01(g.lat) : g.lat, lon: kasar(g) ? bulat01(g.lon) : g.lon, jarak_km: Math.round(g.jarak * 10) / 10, diubah: g.diubah,
      pemilik: {jenis: g.pjenis, nama: g.pwilayah}, milik_saya: g.akun_id === akunId,
      ...((adminPic || g.akun_id === akunId) && !luar(g) ? {pic_nama: g.pic_nama, pic_wa: g.pic_wa} : {}),
      alat: S.filter(s => s.gudang_id === g.id).map(s => ({kategori: s.kategori, label: KATEGORI[s.kategori]?.[0] ?? s.kategori, kelas_pompa: s.kelas_pompa, hp: s.hp, jumlah: s.jumlah}))}));
    /* pompa yang direkomendasikan pipeline (rekomendasi.kebutuhan.total.pompa): per kelas, gudang terdekat yang menyimpan kelas itu dalam keadaan siap */
    const rek = jsonAman(t.rekomendasi), daftar = Array.isArray(rek?.kebutuhan?.total?.pompa) ? rek.kebutuhan.total.pompa : [];
    const pompa = daftar.map(p => {
      const kelas = kelasDari(p?.kelas);
      const tersedia = kelas ? gudang.flatMap(g => g.alat.filter(x => x.kategori === "pompa" && x.kelas_pompa === kelas).map(x => ({gudang_id: g.id, nama: g.nama, jarak_km: g.jarak_km, jumlah: x.jumlah}))) : [];
      return {kelas, label: String(p?.kelas ?? ""), hp: p?.hp ?? null, perlu: tengah(p?.unit), tersedia, total_siap: tersedia.reduce((s, x) => s + x.jumlah, 0)};
    });
    return {gudang, pompa};
  } catch (e) { if (tanpaTabel(e)) return null; throw e; }
}

/* ================================================================ Meja Pantau: gudang yang tidak diperbarui > 30 hari (pengait inventarisLama di src/pantau.js) */
export async function butirInventarisLama(env, kini, dummyOk) {
  const R = (await env.DB.prepare(`SELECT g.id, g.nama, g.prov, g.kab, g.diubah, g.dummy, k.wilayah FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id
    WHERE g.diubah < ? AND k.status = 'aktif' ${dummyOk ? "" : "AND g.dummy = 0"} ORDER BY g.diubah LIMIT 500`).bind(kini - LAMA_HARI * HARI).all()).results;
  return R.map(g => { const hari = Math.floor((kini - g.diubah) / HARI), batas = g.diubah + LAMA_HARI * HARI;
    return {id: `inv:${g.id}:${g.diubah}`, jenis: "inventaris_lama", judul: `Inventaris ${g.nama} (${g.wilayah}) belum diperbarui ${hari} hari, batasnya ${LAMA_HARI} hari`, rincian: "Minta pemilik menekan Data masih sama, tandai sudah dicek, atau memperbarui isinya",
      provs: [g.prov], kab: g.kab, dibuat: batas, tenggat: batas, prioritas: hari >= 60 ? 2 : 3, dummy: g.dummy}; });
}

/* ================================================================ agregat untuk laporan harian: alat siap per kategori per provinsi (baris dummy tidak ikut) */
export async function inventarisProvinsi(env) {
  try {
    const R = (await env.DB.prepare(`SELECT g.prov, l.kategori, sum(l.jumlah) n FROM alat l JOIN gudang g ON g.id = l.gudang_id JOIN instansi_akun k ON k.id = g.akun_id
      WHERE l.status = 'siap' AND g.dummy = 0 AND k.status = 'aktif' GROUP BY g.prov, l.kategori`).all()).results;
    const G = (await env.DB.prepare("SELECT g.prov, count(*) n FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id WHERE g.dummy = 0 AND k.status = 'aktif' GROUP BY g.prov").all()).results;
    const per = new Map(G.map(g => [g.prov, {prov: g.prov, nama: PROV[g.prov]?.[1] ?? g.prov, gudang: g.n, siap: Object.fromEntries(Object.keys(KATEGORI).map(k => [k, 0])), total_siap: 0}]));
    for (const r of R) { const p = per.get(r.prov); if (p) { p.siap[r.kategori] = r.n; p.total_siap += r.n; } }
    return {provinsi: [...per.values()].sort((x, y) => x.prov.localeCompare(y.prov))};
  } catch (e) { if (tanpaTabel(e)) return {provinsi: []}; throw e; }
}

/* ================================================================ admin dan staf: lihat semua */
async function pelihat(env, req) { return modAtauStaf(env, req, PERAN_LIHAT); }
/* nomor WhatsApp PIC gudang: hanya moderator ke atas dan staf verifikator/pusdalops (aturan yang sama dengan tautan tagih Meja Pantau); pimpinan dan koordinator melihat gudangnya, bukan nomornya */
async function bolehPic(env, req) { if (await modOK(env, req)) return true; const s = await stafSesi(env, req); return !!s && s.peran.some(p => P_VALIDASI.includes(p)); }
function saringAdmin(req, kolom = "g") {
  const nyata = stafNyata(req);
  return nyata ? `AND ${kolom}.dummy = 0` : "";
}
async function bacaAdmin(env, req, url, kini) {
  if (!await pelihat(env, req)) return tolakMod();
  const prov = url.searchParams.get("prov") || "", pihak = url.searchParams.get("pihak") || "";
  if (prov && !/^\d{2}$/.test(prov)) return gagal(400, "prov harus kode 2 digit"); if (pihak && !Object.hasOwn(NAMA_JENIS_AKUN, pihak)) return gagal(400, `pihak harus ${Object.keys(NAMA_JENIS_AKUN).join("/")}`);
  const saring = `${saringAdmin(req)} AND k.status = 'aktif' ${prov ? "AND g.prov = ?1" : ""} ${pihak ? `AND k.jenis = ?${prov ? 2 : 1}` : ""}`, ikat = [prov, pihak].filter(Boolean);
  const G = (await env.DB.prepare(`SELECT g.id, g.nama, g.jenis, g.prov, g.kab, g.alamat, g.lat, g.lon, g.sumber_koordinat, g.pic_nama, g.pic_wa, g.dibuat, g.diubah, g.dummy, k.jenis pjenis, k.wilayah pwilayah,
      coalesce(sum(l.jumlah), 0) total, coalesce(sum(CASE WHEN l.status = 'siap' THEN l.jumlah END), 0) siap, coalesce(sum(CASE WHEN l.kondisi = 'rusak_berat' THEN l.jumlah END), 0) rusak_berat
    FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id LEFT JOIN alat l ON l.gudang_id = g.id WHERE 1 = 1 ${saring} GROUP BY g.id ORDER BY g.prov, g.nama LIMIT 2000`).bind(...ikat).all()).results
    .filter(g => dalamWilayahStaf(req, [g.prov]));
  const R = (await env.DB.prepare(`SELECT g.prov, l.kategori, sum(l.jumlah) total, sum(CASE WHEN l.status = 'siap' THEN l.jumlah ELSE 0 END) siap, sum(CASE WHEN l.status = 'dikerahkan' THEN l.jumlah ELSE 0 END) dikerahkan
    FROM alat l JOIN gudang g ON g.id = l.gudang_id JOIN instansi_akun k ON k.id = g.akun_id WHERE 1 = 1 ${saring} GROUP BY g.prov, l.kategori`).bind(...ikat).all()).results.filter(r => dalamWilayahStaf(req, [r.prov]));
  const per = new Map();
  for (const g of G) per.get(g.prov) || per.set(g.prov, {prov: g.prov, nama: PROV[g.prov]?.[1] ?? g.prov, gudang: 0, kategori: {}});
  for (const g of G) per.get(g.prov).gudang++;
  for (const r of R) { const p = per.get(r.prov); if (p) p.kategori[r.kategori] = {total: r.total, siap: r.siap, dikerahkan: r.dikerahkan}; }
  /* rekap P3K per provinsi (tabel p3k, 0034): jumlah, berapa jenis barang hampir kedaluwarsa (<= 30 hari, termasuk lewat) atau di bawah ambang */
  let rekapP3k = [], p3kAktif = true;
  try {
    const batasKdl = wib(kini + KEDALUWARSA_HARI * HARI), idx = ikat.length;
    const P = (await env.DB.prepare(`SELECT g.prov, p.kategori, sum(p.jumlah) jumlah, count(*) jenis, sum(CASE WHEN p.kedaluwarsa IS NOT NULL AND p.kedaluwarsa <= ?${idx + 1} AND p.jumlah > 0 THEN 1 ELSE 0 END) kedaluwarsa,
        sum(CASE WHEN p.ambang IS NOT NULL AND p.jumlah < p.ambang THEN 1 ELSE 0 END) rendah FROM p3k p JOIN gudang g ON g.id = p.gudang_id JOIN instansi_akun k ON k.id = g.akun_id WHERE 1 = 1 ${saring} GROUP BY g.prov, p.kategori`)
      .bind(...ikat, batasKdl).all()).results.filter(r => dalamWilayahStaf(req, [r.prov]));
    const pp = new Map(); for (const r of P) (pp.get(r.prov) || pp.set(r.prov, {prov: r.prov, nama: PROV[r.prov]?.[1] ?? r.prov, kategori: {}}).get(r.prov)).kategori[r.kategori] = {jumlah: r.jumlah, jenis: r.jenis, kedaluwarsa: r.kedaluwarsa, rendah: r.rendah};
    rekapP3k = [...pp.values()].sort((x, y) => x.prov.localeCompare(y.prov));
  } catch (e) { if (!tanpaP3k(e)) throw e; p3kAktif = false; }
  const basi = kini - LAMA_HARI * HARI, pic = await bolehPic(env, req);
  return json({kini, super: !!await superOK(env, req), kamus: KAMUS(), p3k_aktif: p3kAktif, rekap_p3k: rekapP3k, pihak: NAMA_JENIS_AKUN, gudang: G.map(g => ({...g, pic_wa: pic ? g.pic_wa : null, basi: g.diubah < basi, pemilik: {jenis: g.pjenis, nama: g.pwilayah}, pjenis: undefined, pwilayah: undefined})),
    rekap: [...per.values()].sort((x, y) => x.prov.localeCompare(y.prov))});
}
async function rincianAdminGudang(env, req, url, kini, ctx, id) {
  if (!await pelihat(env, req)) return tolakMod();
  const g = await env.DB.prepare("SELECT g.*, k.jenis pjenis, k.wilayah pwilayah FROM gudang g JOIN instansi_akun k ON k.id = g.akun_id WHERE g.id = ?").bind(id).first();
  if (!g || !dalamWilayahStaf(req, [g.prov]) || (stafNyata(req) && g.dummy)) return nTak();
  const L = (await env.DB.prepare("SELECT * FROM alat WHERE gudang_id = ? ORDER BY kategori, dibuat LIMIT 500").bind(id).all()).results;
  const J = (await env.DB.prepare("SELECT waktu, oleh, alat_id, aksi, dari, ke, tugas_id FROM alat_jejak WHERE gudang_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results;
  let P = [], PJ = [];
  try {
    P = (await env.DB.prepare("SELECT * FROM p3k WHERE gudang_id = ? ORDER BY kategori, dibuat LIMIT 200").bind(id).all()).results;
    PJ = (await env.DB.prepare("SELECT waktu, oleh, p3k_id, aksi, dari, ke, tugas_id FROM p3k_jejak WHERE gudang_id = ? ORDER BY id DESC LIMIT 100").bind(id).all()).results;
  } catch (e) { if (!tanpaP3k(e)) throw e; }
  const {akun_id, dummy, pjenis, pwilayah, ...gd} = g;
  return json({kini, p3k: P.map(r => bentukP3k(r, kini)), p3k_jejak: PJ.map(j => ({...j, oleh: j.oleh === "sistem" ? "sistem" : "pemilik"})), gudang: {...gd, pic_wa: await bolehPic(env, req) ? gd.pic_wa : null, basi: g.diubah < kini - LAMA_HARI * HARI, pemilik: {jenis: pjenis, nama: pwilayah}}, alat: L.map(bentukAlat), jejak: J.map(j => ({...j, oleh: j.oleh === "sistem" ? "sistem" : "pemilik"}))});
}
async function fotoAdmin(env, req, url, kini, ctx, id) {
  if (!await pelihat(env, req)) return tolakMod();
  const l = await env.DB.prepare("SELECT l.dummy, g.prov FROM alat l JOIN gudang g ON g.id = l.gudang_id WHERE l.id = ?").bind(id).first();
  return l && dalamWilayahStaf(req, [l.prov]) && !(stafNyata(req) && l.dummy) ? kirimFoto(env, id) : nTak();
}

/* ================================================================ dummy (DUMMY.md): satu halaman = rantai penuh. Pemilik = akun dummy instansi (dibuat rute dummy instansi bila belum ada) ditambah
   akun dummyinv* di provinsi lain. Alat mencakup SEMUA kategori, ketiga kondisi, ketiga status (satu dikerahkan ke tugas dummy), satu gudang basi > 30 hari (butir Meja Pantau). */
async function hulu(env, req, url, kini, aksi) {
  const h = new Headers(req.headers); h.delete("content-length"); h.set("content-type", "application/json");
  const r = await RUTE_INSTANSI["POST /api/instansi/admin/dummy"](env, new Request(req.url, {method: "POST", headers: h, body: JSON.stringify({aksi})}), url, kini, undefined);
  if (!r.ok && r.status !== 409) return r;
  r.body?.cancel(); return null;
}
const TAMBAHAN = [["14", "pemprov", "Provinsi Riau", "Riau"], ["16", "polda", "Polda Sumatera Selatan", "Sumatera Selatan"], ["61", "pemprov", "Provinsi Kalimantan Barat", "Kalimantan Barat"]];
async function dummyIsi(env, req, url, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM gudang WHERE dummy = 1").first()).n) return gagal(409, "data dummy inventaris sudah ada; hapus dulu dengan 🧹");
  await env.DB.prepare("DELETE FROM alat_jejak WHERE dummy = 1").run();   // sisa jejak bila akun dummy dihapus lebih dulu lewat /admin/instansi
  const g0 = await hulu(env, req, url, kini, "isi"); if (g0) return g0;
  const st = [], garam = acak(16), pakai = new Map();
  const tambahAkun = async (prov, jenis, wilayah, i) => {
    const id = acak(8), u = "dummyinv" + prov;
    st.push(env.DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, nama, nip, pangkat, jabatan, unit, email, wa, telepon_kantor, surat, kartu, dikirim, diputus, oleh, wajib_ganti, dibuat, dummy)
      VALUES (?, ?, ?, 'prov', ?, ?, ?, NULL, NULL, ?, ?, 'aktif', ?, '198001012005011001', 'Pembina IV/a', 'Kepala Pelaksana', ?, ?, ?, '0536 300000', 1, 1, ?, ?, ?, 0, ?, 1)`)
      .bind(id, u, jenis, `[DUMMY] ${wilayah}`, "dummy|" + u, JSON.stringify([prov]), garam, await sha(acak(16)), `[DUMMY] ${wilayah}`, `[DUMMY] ${wilayah}`, `${u}@contoh.invalid`, "62000000" + String(800 + i).padStart(3, "0"), kini - 2 * HARI, kini - HARI, oleh, kini - 3 * HARI));
    pakai.set(u, id);
  };
  for (const [i, [prov, jenis, wilayah]] of TAMBAHAN.entries()) await tambahAkun(prov, jenis, wilayah, i);
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  const A = (await env.DB.prepare("SELECT id, username, jenis, tingkat, prov, kab, cakupan FROM instansi_akun WHERE dummy = 1 AND status = 'aktif'").all()).results, per = u => A.find(a => a.username === u);
  const pilih = (cocok) => A.find(cocok);
  const tugas = (await env.DB.prepare("SELECT id FROM tugas_api WHERE dummy = 1 AND status = 'buka' AND konfirmasi_pada IS NOT NULL ORDER BY dibuat LIMIT 1").first())?.id ?? null;
  /* [akun, nama, jenis, prov, kab, lat, lon, umur diperbarui (hari), alat[]]; alat = [kategori, jumlah, kondisi, status, ekstra] */
  const P = (k, n, kond = "baik", s = "siap", x = {}) => [k, n, kond, s, x];
  const SPEK = [
    [pilih(a => a.jenis === "pemprov" && a.prov == null && JSON.parse(a.cakupan)[0] === "62"), "Gudang Logistik BPBD Provinsi", "gudang", "62", null, -2.215, 113.915, 3, [
      P("pompa", 6, "baik", "siap", {kelas_pompa: "debit_besar", hp: 5.5, merek_model: "Honda WB30"}), P("pompa", 3, "baik", "siap", {kelas_pompa: "jinjing_ringan", hp: 2.1, merek_model: "Waterax Mini-Striker"}),
      P("pompa", 2, "rusak_ringan", "siap", {kelas_pompa: "tekanan_tinggi", hp: 10.7, merek_model: "Waterax Mark-3"}), P("pompa", 1, "baik", "dikerahkan", {kelas_pompa: "portabel_besar", hp: 40.8, merek_model: "Tohatsu VC52AS"}),
      P("selang_1_5", 40, "baik", "siap", {kapasitas: 20}), P("selang_2_5", 25, "baik", "siap", {kapasitas: 20}), P("nozzle", 30), P("jet_shooter_lance", 8, "rusak_ringan"), P("tangki_fleksibel", 4, "baik", "siap", {kapasitas: 5000})]],
    [pilih(a => a.jenis === "polda" && JSON.parse(a.cakupan)[0] === "62"), "Markas Brimob Polda", "markas", "62", null, -2.205, 113.895, 6, [
      P("mobil_tangki", 2, "baik", "siap", {kapasitas: 6000}), P("mobil_pemadam", 1, "rusak_berat", "servis", {kapasitas: 4000}), P("drone_termal", 2), P("ht_radio", 20), P("apd_set", 30, "baik", "siap", {tahun: 2023})]],
    [pilih(a => a.jenis === "kodam"), "Kendaraan Siaga Kodam Tambun Bungai", "kendaraan_siaga", "62", null, -2.31, 114.02, 10, [
      P("motor_trail", 12), P("alat_berat", 2, "baik", "siap", {merek_model: "Ekskavator amfibi"}), P("genset", 4), P("tenda", 10), P("perahu", 3, "rusak_ringan")]],
    [pilih(a => a.jenis === "kodam"), "Pos Daops Banjarbaru", "pos_daops", "63", null, -3.44, 114.83, 12, [P("scba", 8), P("kepyok_garu", 60), P("pompa_punggung", 25), P("lainnya", 5, "baik", "siap", {catatan: "Sekop dan cangkul"})]],
    [pilih(a => ["pemkab", "pemkot"].includes(a.jenis) && a.tingkat === "kab"), "Posko BPBD Kabupaten", "posko", "62", "dari-akun", -2.255, 113.955, 45, [
      P("pompa", 4, "baik", "siap", {kelas_pompa: "debit_besar", hp: 5.5}), P("selang_2_5", 10, "baik", "siap", {kapasitas: 20}), P("nozzle", 8)]],
    [pilih(a => a.jenis === "polres"), "Pos Polres Siaga Karhutla", "posko", "62", "dari-akun", -2.52, 114.2, 2, [P("ht_radio", 6), P("apd_set", 10), P("pompa_punggung", 6)]],
    [per("dummyinv14"), "Gudang Manggala Agni Pekanbaru", "gudang", "14", null, 0.53, 101.45, 4, [P("pompa", 10, "baik", "siap", {kelas_pompa: "tekanan_tinggi", hp: 10.7}), P("tangki_fleksibel", 6, "baik", "siap", {kapasitas: 5000}), P("drone_termal", 1), P("selang_1_5", 60, "baik", "siap", {kapasitas: 20})]],
    [per("dummyinv16"), "Markas Polda Sumsel", "markas", "16", null, -2.98, 104.76, 5, [P("mobil_tangki", 3, "baik", "siap", {kapasitas: 8000}), P("genset", 2, "rusak_berat", "servis"), P("kepyok_garu", 40)]],
    [per("dummyinv61"), "Gudang BPBD Kalimantan Barat", "gudang", "61", null, -0.03, 109.33, 7, [P("pompa", 5, "baik", "siap", {kelas_pompa: "jinjing_ringan", hp: 2.1}), P("perahu", 2), P("tenda", 8), P("scba", 4, "rusak_ringan")]],
  ].filter(s => s[0]);
  const isi = [], isiP3k = []; let nG = 0, nL = 0, nP = 0;
  /* P3K contoh (tabel p3k, 0034): satu gudang punya barang lewat kedaluwarsa, hampir kedaluwarsa, stok di bawah ambang, habis dengan jejak "dipakai di tugas", dan aman; gudang lain memakai satuan lain */
  const tgl = d => wib(kini + d * HARI), Q = (kategori, jumlah, satuan, kedaluwarsa, ambang, nama, ekstra = {}) => ({kategori, jumlah, satuan, kedaluwarsa, ambang, nama, ...ekstra});
  const P3K = [[Q("kotak_p3k", 6, "kotak", tgl(-12), null, "Kotak P3K standar"), Q("masker_n95", 40, "buah", tgl(18), 100, "Masker N95 (contoh)"), Q("tabung_oksigen", 2, "unit", tgl(400), 3, "Tabung oksigen 1 m3"),
      Q("infus_oralit", 0, "liter", tgl(200), 5, "Oralit dan infus (contoh)", {pakai: [3, 5]}), Q("tandu", 4, "unit", null, null, "Tandu lipat"), Q("aed", 1, "unit", tgl(700), null, null)],
    [Q("salep_luka_bakar", 25, "buah", tgl(25), 10, "Salep luka bakar (contoh)"), Q("obat_tetes_mata", 60, "buah", tgl(300), null, "Tetes mata (contoh)"), Q("regulator", 3, "unit", null, null, null)]];
  for (const [akun, nama, jenis, prov, kab, lat, lon, umur, alat] of SPEK) {
    const gid = acak(8), diubah = kini - umur * HARI; nG++;
    for (const x of P3K[nG === 1 ? 0 : nG === 7 ? 1 : 9] ?? []) {
      const pid = acak(8); nP++; isiP3k.push(env.DB.prepare("INSERT INTO p3k (id, gudang_id, kategori, nama, satuan, jumlah, ambang, kedaluwarsa, catatan, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 1)")
        .bind(pid, gid, x.kategori, x.nama, x.satuan, x.jumlah, x.ambang, x.kedaluwarsa, diubah - 10 * HARI, diubah));
      isiP3k.push(jejakP3k(env, akun.id, pid, gid, "tambah", null, `${x.kategori} x${x.jumlah + (x.pakai?.[0] ?? 0)}`, null, diubah - 10 * HARI, 1));
      if (x.pakai) isiP3k.push(jejakP3k(env, akun.id, pid, gid, "pakai", x.pakai[0] + x.jumlah, x.jumlah, tugas, diubah - HARI, 1));
    }
    isi.push(env.DB.prepare("INSERT INTO gudang (id, akun_id, nama, jenis, prov, kab, alamat, lat, lon, sumber_koordinat, pic_nama, pic_wa, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
      .bind(gid, akun.id, "[DUMMY] " + nama, jenis, prov, kab === "dari-akun" ? akun.kab : null, "Jalan Contoh No. 1", lat, lon, nG % 2 ? "peta" : "gps", `Rudi Contoh ${nG}`, "6200000070" + nG, diubah - 20 * HARI, diubah));
    for (const [kategori, jumlah, kondisi, status, x] of alat) {
      const aid = acak(8), kirim = status === "dikerahkan" ? tugas : null; nL++;
      isi.push(env.DB.prepare("INSERT INTO alat (id, gudang_id, kategori, merek_model, kelas_pompa, hp, kapasitas, jumlah, kondisi, status, dikerahkan_ke_tugas, tahun, catatan, dibuat, diubah, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)")
        .bind(aid, gid, kategori, x.merek_model ?? null, x.kelas_pompa ?? null, x.hp ?? null, x.kapasitas ?? null, jumlah, kondisi, status, kirim, x.tahun ?? 2018 + nL % 7, x.catatan ?? null, diubah - 10 * HARI, diubah));
      isi.push(jejak(env, akun.id, aid, gid, "tambah", null, `${kategori} x${jumlah}`, null, diubah - 10 * HARI, 1));
      if (status === "dikerahkan") isi.push(jejak(env, akun.id, aid, gid, "status", "siap", "dikerahkan", kirim, diubah, 1));
      else if (status === "servis") isi.push(jejak(env, akun.id, aid, gid, "kondisi", "baik", kondisi, null, diubah - 5 * HARI, 1));
      else if (nL % 4 === 0) isi.push(jejak(env, akun.id, aid, gid, "jumlah", jumlah + 2, jumlah, null, diubah - 2 * HARI, 1));
    }
  }
  for (let i = 0; i < isi.length; i += 50) await env.DB.batch(isi.slice(i, i + 50));
  /* tanpa 0034 bagian P3K dilewati diam-diam (alat dan gudang tetap terisi) */
  try { for (let i = 0; i < isiP3k.length; i += 50) await env.DB.batch(isiP3k.slice(i, i + 50)); } catch (e) { if (!tanpaP3k(e)) throw e; }
  return json({ok: true, akun: pakai.size, gudang: nG, alat: nL, p3k: nP}, 201);
}
async function dummyHapus(env, req, url, kini) {
  const hitung = async t => (await env.DB.prepare(`SELECT count(*) n FROM ${t} WHERE dummy = 1`).first()).n;
  const n = {gudang: await hitung("gudang"), alat: await hitung("alat"), jejak: await hitung("alat_jejak"), p3k: 0};
  try { n.p3k = await hitung("p3k"); await env.DB.batch([env.DB.prepare("DELETE FROM p3k_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM p3k WHERE dummy = 1")]); } catch (e) { if (!tanpaP3k(e)) throw e; }
  await env.DB.batch([env.DB.prepare("DELETE FROM alat_jejak WHERE dummy = 1"), env.DB.prepare("DELETE FROM alat WHERE dummy = 1"), env.DB.prepare("DELETE FROM gudang WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM instansi_akun WHERE dummy = 1 AND username LIKE 'dummyinv%' AND NOT EXISTS (SELECT 1 FROM tugas_isian i WHERE i.akun_id = instansi_akun.id) AND NOT EXISTS (SELECT 1 FROM instansi_media m WHERE m.akun_id = instansi_akun.id) AND NOT EXISTS (SELECT 1 FROM usulan_kontak_pt u WHERE u.akun_id = instansi_akun.id)")]);
  const g = await hulu(env, req, url, kini, "hapus"); if (g) return g;   // 🧹 menghapus SELURUH dummy: akun dan tugas dummy instansi ikut (seperti Meja Pantau)
  return json({ok: true, ...n});
}
async function dummy(env, req, url, kini) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, req, url, kini, mod);
  if (b.o.aksi === "hapus") return dummyHapus(env, req, url, kini);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ halaman /admin/inventaris: kerangka tanpa data (data dari /api/inventaris yang dijaga sesi admin atau staf) */

/* rute digabung ke RUTE di src/worker.js. /api/instansi/* memakai sesi akun instansi (POST wajib x-pb); /api/inventaris/* memakai admin (modOK) atau sesi staf berperan. */
export const RUTE_INVENTARIS = Object.fromEntries(Object.entries({
  "GET /admin/inventaris": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanInventaris, HALAMAN_STAF.inventaris),   // staf tanpa peran untuk halaman ini ke Meja Pantau, anonim ke login admin
  "GET /api/instansi/gudang": daftarMilik,
  "POST /api/instansi/gudang": tambahGudang,
  "POST /api/instansi/gudang/:id": ubahGudang,
  "POST /api/instansi/alat": tambahAlat,
  "POST /api/instansi/alat/kerahkan": kerahkan,
  "POST /api/instansi/alat/:id": ubahAlat,
  "POST /api/instansi/p3k": tambahP3k,
  "POST /api/instansi/p3k/:id": ubahP3k,
  "POST /api/instansi/foto-alat/:id": unggahFoto,
  "GET /api/instansi/foto-alat/:id": lihatFotoMilik,
  "GET /api/instansi/inventaris/wilayah": ringkasanWilayah,
  "GET /api/inventaris": bacaAdmin,
  "GET /api/inventaris/gudang/:id": rincianAdminGudang,
  "GET /api/inventaris/foto/:id": fotoAdmin,
  "POST /api/inventaris/dummy": dummy,
}).map(([k, f]) => [k, k.startsWith("GET /admin") ? f : nyatakan((env, req, url, kini, ctx, id) => f(env, req, url, kini, ctx, id), k.includes("/api/instansi/"))]));
