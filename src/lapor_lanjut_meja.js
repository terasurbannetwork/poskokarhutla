/* Data lanjutan BPBD: rekap berkas ke meja dampak dan pengungsi, terima ke Jitupasna (paket data/kajian-bnpb/lapor-lanjutan/, tiket LJ-12; D5, D6, D7, D8).
   Hitungan murni di src/lapor_lanjut_spek.js (rekap, kolomRekap, gabungDampak, titikHari, bahanJitupasna); semua SQL di src/hak.js bagian LJ-12.
   Pemicu rekap (LJ-12): SESUDAH tulis objek, batal, atau nihil, di request yang sama (dorongRekap), bukan cron. Alasan: rekap selalu dihitung ulang penuh dari daftar, jadi
   tulisan yang terlewat sembuh sendiri pada tulis berikutnya; cron menit akan membaca semua berkas terbuka tiap menit (kuota baca D1 Free) tanpa indeks "kotor" yang butuh migrasi.
   Biaya per tulis objek: 1 baca berkas, 1 baca objek, 1 baca catatan dampak (PK), 1 batch baca catatan pengungsi (hanya bila ada titik berpengungsi); tulis hanya bila hasilnya berubah.
   Kegagalan rekap tidak pernah menggagalkan tulis objeknya (galat dicatat ke log Worker). Lifeline tidak ditulis di sini (D7): sampai lewat kolom prasarana meja dampak. */
import {acak} from "./worker.js";
import * as H from "./hak.js";
import {segarkanGrup} from "./meja.js";
import {validasi as validasiMeja, KOLOM_DAMPAK, MEJA} from "./meja_spek.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import {tglWib, labelJenis} from "./lapor_tampil.js";
import {rekap, titikHari, kolomRekap, gabungDampak, sama, bahanJitupasna, DAMPAK_DARI_LAPOR, BENCANA_DARI_LAPOR, klienBaris, awalanBaris} from "./lapor_lanjut_spek.js";

const R = H.pelakuLjRekap;
const UMUR = ["bayi", "balita", "anak", "remaja", "dewasa", "lansia"], SEKTOR_KEB = ["keb_air", "keb_pangan", "keb_sandang", "keb_kesehatan", "keb_hunian", "keb_pendidikan"];
const HITUNG = new Set(MEJA.pengungsi.kolom.filter(c => c.tahap).map(c => c.nama));   // kolom turunan server (jiwa_total dst): bukan masukan
const parse = s => { try { return JSON.parse(s) ?? {}; } catch { return {}; } };
const sansSistem = d => Object.fromEntries(Object.entries(d).filter(([k]) => !k.startsWith("lapor_") && k !== "logbook_id" && k !== "logbook_kib"));
const hanyaSistem = d => Object.fromEntries(Object.entries(d).filter(([k]) => k.startsWith("lapor_") || k === "logbook_id" || k === "logbook_kib"));
const galatStr = e => String(e?.message || e).slice(0, 200);

/* dasar catatan baru: jenis, tanggal kejadian dari tiket induk berkas; null bila tiket tidak terbaca */
async function dasarTiket(env, b, kini) {
  const t = await H.ljIndukInfo(env, R, b.induk); if (!t) return null;
  const ms = Number(t.waktu) > 0 && Number(t.waktu) <= kini ? Number(t.waktu) : t.terkirim;
  return {jenisLapor: t.jenis ?? "lainnya", tanggal: tglWib(Math.min(ms, kini))};
}
const kabTeks = b => { const n = parse(b.isian).kab_nama ?? NAMA_KAB4[b.kab4 ?? (/^\d{2}\.\d{2}$/.test(b.kab) ? b.kab.replace(".", "") : "")]; return typeof n === "string" && n.length >= 2 && n.length <= 60 ? n : null; };

async function dorongDampak(env, b, r, kini, tiket) {
  const {nilai, nihil} = kolomRekap(r, KOLOM_DAMPAK.sah), prov = b.kab.slice(0, 2), kab = kabTeks(b), c = await H.ljDampakBaca(env, R, b.id);
  if (!c) {
    if (!kab || !/^\d{2}$/.test(prov)) return "tanpa_wilayah";
    const t = await tiket(); if (!t) return "tanpa_tiket";
    const jenis = DAMPAK_DARI_LAPOR[t.jenisLapor] ?? "lainnya";
    const dasar = {jenis, nama_kejadian: `${labelJenis(t.jenisLapor) ?? "Kejadian"} ${kab} (${b.induk})`.slice(0, 120), tanggal: t.tanggal};
    const g = gabungDampak({...dasar, lapor_berkas: b.id}, "dilaporkan", {nilai, nihil}, KOLOM_DAMPAK, kini).data, v = validasiMeja("dampak", sansSistem(g), null, kini);
    if (v.galat) return "tolak:" + v.galat;
    const data = JSON.stringify({...v.data, ...hanyaSistem(g)});
    await H.ljBatch(env, R, [H.ljStmtDampakBaru(env, R, {id: b.id, prov, kab, data}, kini), H.ljStmtMejaJejak(env, R, b.id, null, "dilaporkan", kini, "rekap pertama dari data lanjutan BPBD")]);
    return "baru";
  }
  const lama = parse(c.data), {data: g, ubah} = gabungDampak(lama, c.status, {nilai, nihil}, KOLOM_DAMPAK, kini); if (!ubah) return "sama";
  let data = g;
  if (c.status === "dilaporkan") {   // isi berubah: validasi meja yang sama; yang tidak lolos tidak ditulis (petugas melihat isian lamanya)
    const v = validasiMeja("dampak", sansSistem(g), null, kini); if (v.galat) return "tolak:" + v.galat;
    data = {...v.data, ...hanyaSistem(g)};
  }
  const baru = JSON.stringify(data);
  const [u] = await H.ljBatch(env, R, [H.ljStmtMejaUbah(env, R, c.id, c.data, baru, c.status, kini, c.status === "dilaporkan"),
    H.ljStmtMejaJejak(env, R, c.id, c.status, c.status, kini, c.status === "dilaporkan" ? "rekap diperbarui dari data lanjutan BPBD" : "rekap baru menunggu petugas")]);
  return u.meta.changes ? "ubah" : "kalah";
}

/* rekap harian tiap titik berpengungsi pada tanggal hari ini (D6). Jumlah per kelompok umur dan L/P untuk jiwa aktif yang SEMUANYA punya umur dan jenis kelamin (wajib di spek), jadi kelompok
   tanpa orang = 0 dari data, bukan kosong. Catatan milik berkas ini diperbarui hanya bila penulis terakhirnya mesin ini; kalau petugas pernah mengubahnya isinya tetap dan hanya diberi
   lapor_rekap_baru (tanpa jejak, supaya penulis terakhir tidak berganti). Jiwa terakhir keluar atau batal: catatan hari ini ditutup lewat tgl_tutup (satu-satunya jalur sah meja: status turunan
   "ditutup" dikeluarkan rekapTerakhir); tgl_tutup = kemarin, atau tgl_buka bila titik baru buka hari ini (tidak bisa lebih awal; baru berlaku besok). Dibuka lagi bila jiwa kembali.
   Catatan ketikan petugas atau berkas lain tidak disentuh. */
const NILAI_HARI = ["kk", ...UMUR.flatMap(u => [`${u}_l`, `${u}_p`])];
const pilih = (d, ks) => Object.fromEntries(ks.map(k => [k, d[k]]));
async function dorongPengungsi(env, b, semua, kini, tiket) {
  const tgl = tglWib(kini), kemarin = tglWib(kini - 864e5), prov = b.kab.slice(0, 2), kab = kabTeks(b), hasil = {};
  const titik = semua.filter(x => x.jenis === "titik" && x.titik_id);
  if (!titik.length || !kab) return hasil;
  const hari = new Map(titik.map(t => [t.titik_id, t.status === "aktif" ? titikHari(semua, t.titik_id, tgl) : null]));
  const ada = (await H.ljBatch(env, R, titik.map(t => H.ljStmtPengungsiBaca(env, R, t.titik_id, tgl)))).map(x => x.results?.[0] ?? null);
  const milik = ada.map((c, i) => c && parse(c.data).lapor_berkas === b.id ? i : -1).filter(i => i >= 0);
  const oleh = new Map(); if (milik.length) (await H.ljBatch(env, R, milik.map(i => H.ljStmtJejakOleh(env, R, ada[i].id)))).forEach((x, k) => oleh.set(milik[k], x.results?.[0]?.oleh ?? null));
  let info = null;
  const stmts = [], catat = [];
  for (const [i, t] of titik.entries()) {
    const h = hari.get(t.titik_id), d = t.data, lama = ada[i] ? parse(ada[i].data) : null, id = t.titik_id;
    if (lama && lama.lapor_berkas !== b.id) { hasil[id] = "bukan_milik_berkas"; continue; }
    const diedit = !!lama && oleh.get(i) !== "lapor_lanjut", simpan = (data, jejak) => {   // satu jalur tulis untuk catatan yang sudah ada; tanpa jejak = hanya menandai
      stmts.push(H.ljStmtMejaUbah(env, R, ada[i].id, ada[i].data, JSON.stringify(data), ada[i].status, kini, !!jejak)); if (jejak) stmts.push(H.ljStmtMejaJejak(env, R, ada[i].id, "tercatat", "tercatat", kini, jejak)); catat.push(id); };
    if (!h) {   // tidak ada jiwa aktif hari ini
      if (!lama || lama.tgl_tutup) { hasil[id] = "sama"; continue; }
      if (diedit) {
        const nol = {kk: 0, jiwa_total: 0}; if (JSON.stringify(lama.lapor_rekap_baru?.nilai) === JSON.stringify(nol)) { hasil[id] = "sama"; continue; }
        simpan({...lama, lapor_rekap_baru: {nilai: nol, waktu: kini}}, null); continue;
      }
      const tutup = lama.tgl_buka > kemarin ? lama.tgl_buka : kemarin, v = validasiMeja("pengungsi", sansSistem(Object.fromEntries(Object.entries({...lama, tgl_tutup: tutup}).filter(([k]) => !HITUNG.has(k)))), null, kini);
      if (v.galat) { hasil[id] = "tolak:" + v.galat; continue; }
      simpan({...v.data, lapor_berkas: b.id, lapor_tutup: true}, "titik ditutup: tidak ada pengungsi aktif menurut data lanjutan BPBD"); continue;
    }
    info ??= await tiket(); if (!info) return hasil;
    const baru = {tgl_data: tgl, nama_tempat: d.nama, jenis_tempat: d.jenis_tempat, kejadian: BENCANA_DARI_LAPOR[info.jenisLapor] ?? "lainnya", tgl_buka: d.tgl_buka, titik_id: id, kk: h.kk, ...Object.fromEntries(SEKTOR_KEB.map(s => [s, d[s]]))};
    if (d.tipe_tempat != null) baru.tipe_tempat = d.tipe_tempat;
    for (const u of UMUR) for (const jk of ["l", "p"]) baru[`${u}_${jk}`] = h[`${u}_${jk}`] ?? 0;
    if (diedit) {
      const nilai = pilih(baru, NILAI_HARI);
      if (sama(pilih(lama, NILAI_HARI), nilai)) { if (lama.lapor_rekap_baru) { const {lapor_rekap_baru, ...sisa} = lama; simpan(sisa, null); } else hasil[id] = "sama"; continue; }
      if (sama(lama.lapor_rekap_baru?.nilai, nilai)) { hasil[id] = "sama"; continue; }
      simpan({...lama, lapor_rekap_baru: {nilai, waktu: kini}}, null); continue;
    }
    const gabung = Object.fromEntries(Object.entries({...(lama ?? {}), ...baru}).filter(([k]) => !HITUNG.has(k) && !(lama?.lapor_tutup && (k === "tgl_tutup"))));
    delete gabung.lapor_rekap_baru;
    const v = validasiMeja("pengungsi", sansSistem(gabung), null, kini);
    if (v.galat) { hasil[id] = "tolak:" + v.galat; continue; }
    const data = {...v.data, lapor_berkas: b.id};
    if (lama) { if (sama(lama, data)) { hasil[id] = "sama"; continue; } simpan(data, "rekap harian dari data lanjutan BPBD"); }
    else {
      const baruId = acak(8);
      stmts.push(H.ljStmtPengungsiBaru(env, R, {id: baruId, prov, kab, desa: d.desa ?? null, data: JSON.stringify(data)}, kini), H.ljStmtMejaJejak(env, R, baruId, null, "tercatat", kini, "rekap harian dari data lanjutan BPBD")); catat.push(id);
    }
  }
  if (stmts.length) { await H.ljBatch(env, R, stmts); for (const k of catat) hasil[k] = "tulis"; }
  return hasil;
}

/* Dorong rekap berkas ke meja dampak (satu catatan per berkas) dan meja pengungsi (satu per titik per hari). Keluaran ringkas untuk uji; galat ditelan. */
export async function dorongRekap(env, berkasId, kini = Date.now()) {
  try {
    const b = await H.ljBerkasRekap(env, R, berkasId); if (!b) return {galat: "berkas tidak ada"};
    const semua = (await H.ljObjekRekap(env, R, b.id)).map(x => ({...x, data: parse(x.data)})), isian = parse(b.isian);
    const r = rekap(semua, {nihil: new Set(Array.isArray(isian.nihil) ? isian.nihil : []), tgl: tglWib(kini)});
    let memo; const tiket = async () => memo ??= await dasarTiket(env, b, kini);
    const dampak = await dorongDampak(env, b, r, kini, tiket), pengungsi = await dorongPengungsi(env, b, semua, kini, tiket);
    const prov = b.kab.slice(0, 2), kab = kabTeks(b);
    if (kab && (["baru", "ubah"].includes(dampak) || Object.values(pengungsi).includes("tulis"))) {   // meja_ringkas ikut diperbarui; gagal = basi sampai segarkan berikutnya
      if (["baru", "ubah"].includes(dampak)) await segarkanGrup(env, "dampak", prov, kab, 0, kini).catch(() => {});
      if (Object.values(pengungsi).includes("tulis")) await segarkanGrup(env, "pengungsi", prov, kab, 0, kini).catch(() => {});
    }
    return {dampak, pengungsi};
  } catch (e) { console.error("rekap lanjut gagal", berkasId, galatStr(e)); return {galat: galatStr(e)}; }
}

/* ---------- Terima ke Jitupasna (D8): rumah rb, rs, rr sebagai unit_asal rekap_rumah_rusak, prasarana per sektor sebagai isian. Staf Pusdalops menekan sendiri. ---------- */
const tolak = (kode, pesan, tambah = {}) => ({kode, isi: {galat: pesan, ...tambah}});
export async function terimaJitupasna(env, b, oleh, kini) {
  const STAF = H.pelakuLjTerima;   // pelaku khusus Terima: hak sk_* tidak dibagi ke lp_staf
  if (!b.kejadian_id) return tolak(409, "Berkas ini belum tertaut ke kejadian di Buku Besar, jadi belum bisa diterima ke Jitupasna. Tautkan dulu lewat Siklus Bencana.");
  const kab4 = b.kab4 || (/^\d{2}\.\d{2}$/.test(b.kab) ? b.kab.replace(".", "") : null);
  if (!kab4) return tolak(409, "Kabupaten atau kota berkas ini belum dikenali sistem. Hubungi staf BNPB.");
  const kej = await H.skKejadianRingkas(env, STAF, b.kejadian_id); if (!kej) return tolak(409, "Kejadian berkas ini tidak ditemukan di Buku Besar.");
  const jp = await H.skJitupasnaTerbaru(env, STAF, b.kejadian_id, kab4, kej.dummy);
  if (!jp) return tolak(409, "Jitupasna kabupaten atau kota ini belum dibuka. Buka dulu di Siklus Bencana, lalu terima lagi.");
  if (jp.status === "final") return tolak(409, "Jitupasna kabupaten atau kota ini sudah final dan dikunci. Buka revisi Jitupasna (versi baru) di Siklus Bencana, lalu terima lagi.");
  if (jp.status !== "dibuka" && jp.status !== "pengumpulan") return tolak(409, `Jitupasna sedang ${jp.status === "dihitung" ? "dihitung" : "ditinjau"} dan tidak menerima baris baru.`);
  const semua = (await H.ljObjekRekap(env, STAF, b.id)).map(x => ({...x, data: parse(x.data)})), bahan = bahanJitupasna(semua);
  const dilewati = {rumah_tanpa_tingkat_rusak: semua.filter(x => x.status === "aktif" && x.jenis === "rumah" && !["rb", "rs", "rr"].includes(x.data.tingkat)).length,
    prasarana_tanpa_sektor: semua.filter(x => x.status === "aktif" && x.jenis === "prasarana" && x.data.jenis === "lainnya").length,
    jalan_ditahan_satuan_harga_belum_dikonfirmasi: semua.filter(x => x.status === "aktif" && x.jenis === "prasarana" && x.data.jenis === "jalan" && ["rb", "rs", "rr"].includes(x.data.tingkat)).length};   // U10
  if (!bahan.length) return tolak(409, "Belum ada rumah atau prasarana berstatus rusak berat, sedang, atau ringan di berkas ini.", {dilewati});
  const dummy = kej.dummy ? 1 : 0, klien = bahan.map(x => klienBaris(b.id, x.sektor, x.tingkat));
  const baris = bahan.map((x, i) => H.ljStmtBarisTerima(env, STAF, jp.id, {...x, id: acak(8), klien_id: klien[i]}, kini, oleh, dummy));
  const res = await H.skBatch(env, STAF, [...baris, H.ljStmtBarisNolkan(env, STAF, jp.id, awalanBaris(b.id), klien),
    H.skStmtJejak(env, STAF, String(oleh).slice(0, 64), "jitupasna", jp.id, "terima_lapor", null, null, `${bahan.length} baris dari berkas ${b.id}`, kini, dummy),
    H.ljStmtJejak(env, STAF, {berkas: b.id, aksi: "terima_jitupasna", sesudah: JSON.stringify({jitupasna: jp.id, versi: jp.versi, baris: bahan.map(x => `${x.sektor}:${x.tingkat}=${x.unit}`)}), oleh: String(oleh).slice(0, 200)}, kini)]);
  if (!res.slice(0, baris.length).some(x => x.meta.changes)) return tolak(409, "Jitupasna baru saja berubah status atau sudah penuh. Muat ulang lalu coba lagi.");
  return {kode: 200, isi: {aksi: "jitupasna", jitupasna: jp.id, versi: jp.versi, baris: bahan.map(({sektor, tingkat, unit, unit_asal}) => ({sektor, tingkat, unit, unit_asal})), dilewati}};
}
