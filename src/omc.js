/* Catatan sortie OMC (operasi modifikasi cuaca). Skema: migrations/0033_omc.sql. Rancangan: scratchpad omc/RANCANGAN.md §4. Aturan pemilik (21 Okt 2026):
   - Staf berperan tmc (dan moderator ke atas, bukan akun gerbang situs) mengisi, mengubah, dan menghapus-LUNAK sortie. koordalops dan pimpinan hanya membaca.
     Staf berwilayah hanya menulis/membaca sortie yang provinsinya ada di wilayahnya; staf nyata tidak melihat baris dummy.
   - Rute publik GET /api/omc/sortie (cache tepi 5 menit) berbentuk TETAP karena dibaca pipeline Python (scripts/omc/*, cuaca-udara): TANPA pengisi, catatan, dan baris dummy.
     Sortie tanpa jam mulai (jam tidak diketahui) tampil dengan mulai/selesai null; pembaca wajib melewatinya.
   - Evaluasi dampak TIDAK dihitung di sini (CPU Workers Free tidak muat): pipeline menulis public/udara/data/omc_hasil.json, halaman /admin/omc dan pengait Meja Pantau hanya membacanya.
   - Tabel 0033 belum ada: semua rute 503 sopan; Meja Pantau dan laporan harian tidak terganggu (pengait diam).
   ponytail: poligon tidak diperiksa memotong dirinya sendiri (hanya bentuk, BBOX, dan ukuran); evaluasi memakai titik pusat, jadi silang-sisi tidak mengubah hasil.
   ponytail: batas laju baca-lalu-tulis (laju_bnpb), serentak bisa lolos satu-dua di atas batas. Operasi hanya bisa dibuat, belum diubah (ganti nama = buat baru). */
import {json, gagal, acak, bacaBody, cacheTepi} from "./worker.js";
import {tx, num, modOK, superOK, tglSah, wib} from "./posko.js";
import {laju} from "./bnpb.js";
import {modAtauStaf, dalamWilayahStaf, stafNyata} from "./staf.js";
import {PROV} from "./instansi.js";
import {wilayah, cariWilayah} from "./titik.js";
import {halamanOmc, HALAMAN_STAF} from "./admin_halaman.js";
import {halamanAdmin} from "./statistik.js";

const JAM = 36e5, HARI = 24 * JAM, TENGGAT_HASIL = HARI, MAKS_POLIGON_BYTE = 20480, MAKS_TITIK = 500;
/* daftar tetap: sama dengan CHECK di 0033 dan public/admin/omc.js (dijaga omc.test.mjs) */
export const BAHAN = {nacl: "NaCl", dry_ice: "Dry ice"};
export const PERAN_TULIS = ["tmc"], PERAN_BACA = ["tmc", "koordalops", "pimpinan"];
const BBOX = {lat: [-11.5, 6.5], lon: [94.5, 141.5]};   // sama dengan koordinat gudang inventaris: seluruh Indonesia
const RE_ID = /^[0-9a-f]{16}$/, RE_KAB = /^\d{2}\|[^|]{2,60}$/, RE_JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ada = (o, k) => Object.hasOwn(o, k);
const tanpaTabel = e => /no such table: omc_/i.test(String(e?.message || e));
const baca = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const iso = t => t == null ? null : new Date(t).toISOString();
const jamWib = t => t == null ? null : new Date(t + 7 * JAM).toISOString().slice(11, 16);
const epoch = (tanggal, jam) => Date.parse(`${tanggal}T${jam}:00+07:00`);
const tolak = tulis => gagal(403, tulis ? "mengisi sortie OMC hanya untuk staf berperan TMC/OMC atau moderator ke atas (bukan akun gerbang situs)" : "sortie OMC hanya dibaca staf TMC/OMC, koordinator, pimpinan, atau moderator ke atas");
/* tulis staf berwilayah: SEMUA provinsi sortie harus di wilayahnya (baca cukup beririsan: dalamWilayahStaf) */
const semuaDalam = (req, provs) => provs.every(p => dalamWilayahStaf(req, [p]));
/* provinsi dari titik-titik poligon (cariWilayah: poligon provinsi + kecamatan terdekat); gagal memuat aset = kosong */
async function provDariPoligon(env, teks) {
  try {
    const W = await wilayah(env), out = new Set();
    for (const r of JSON.parse(teks).coordinates) for (const [x, y] of r) { const k = cariWilayah(W, y, x); if (k) out.add(k.split("|")[0]); }
    return [...out];
  } catch (e) { return []; }
}
const nTak = () => gagal(404, "tidak ada");
const bungkus = fn => async (env, req, ...sisa) => {
  try { return await fn(env, req, ...sisa); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "fitur OMC belum diaktifkan (migrasi 0033_omc belum diterapkan)"); throw e; }
};

/* ================================================================ murni: validasi */
/* poligon sasaran: Polygon (atau Feature berisi Polygon) -> {v: teks GeoJSON bersih | null} atau {g}. Koordinat dibulatkan 5 desimal, dibangun ulang (tak ada properti ikut tersimpan). */
export function cekPoligon(v) {
  if (v == null || v === "") return {v: null};
  const o = v?.type === "Feature" ? v.geometry : v;
  if (!o || typeof o !== "object" || o.type !== "Polygon" || !Array.isArray(o.coordinates)) return {g: "poligon harus GeoJSON bertipe Polygon"};
  const R = o.coordinates;
  if (R.length < 1 || R.length > 3) return {g: "poligon 1 sampai 3 cincin (cincin luar, lubang opsional)"};
  let total = 0; const bersih = [];
  for (const r of R) {
    if (!Array.isArray(r) || r.length < 4) return {g: "tiap cincin poligon minimal 4 titik (titik pertama sama dengan terakhir)"};
    total += r.length; if (total > MAKS_TITIK) return {g: `poligon maksimal ${MAKS_TITIK} titik`};
    const c = [];
    for (const p of r) {
      if (!Array.isArray(p) || p.length !== 2) return {g: "titik poligon harus [bujur, lintang]"};
      const x = num(p[0], BBOX.lon[0], BBOX.lon[1]), y = num(p[1], BBOX.lat[0], BBOX.lat[1]);
      if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) return {g: `titik poligon harus di dalam Indonesia (bujur ${BBOX.lon.join(" sampai ")}, lintang ${BBOX.lat.join(" sampai ")})`};
      c.push([Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);
    }
    if (c[0][0] !== c.at(-1)[0] || c[0][1] !== c.at(-1)[1]) return {g: "cincin poligon harus tertutup (titik pertama sama dengan terakhir)"};
    bersih.push(c);
  }
  const teks = JSON.stringify({type: "Polygon", coordinates: bersih});
  return teks.length > MAKS_POLIGON_BYTE ? {g: `poligon maksimal ${MAKS_POLIGON_BYTE / 1024} KB`} : {v: teks};
}
/* sortie: {g} galat atau {v}. `lama` = bentuk isian dari baris yang ada (ubahan sebagian). kini dipakai membatasi tanggal masuk akal. */
export function cekSortie(o, kini, lama = null) {
  const f = k => ada(o, k) ? o[k] : lama?.[k];
  const pesawat = tx(f("pesawat"), 40); if (!pesawat || pesawat.length < 2) return {g: "pesawat (registrasi) 2 sampai 40 karakter"};
  const tanggal = f("tanggal");
  if (typeof tanggal !== "string" || !tglSah(tanggal)) return {g: "tanggal harus YYYY-MM-DD (WIB)"};
  if (tanggal < wib(kini - 365 * HARI) || tanggal > wib(kini + 2 * HARI)) return {g: "tanggal sortie harus dalam setahun terakhir sampai dua hari ke depan"};
  const jam = (k, nama) => { const x = f(k); if (x == null || x === "") return {v: null}; return typeof x === "string" && RE_JAM.test(x) ? {v: x} : {g: `${nama} harus HH:MM (WIB) atau kosong bila tidak diketahui`}; };
  const jm = jam("jam_mulai", "jam mulai"), js = jam("jam_selesai", "jam selesai"); if (jm.g || js.g) return {g: jm.g || js.g};
  let mulai = jm.v ? epoch(tanggal, jm.v) : null, selesai = js.v ? epoch(tanggal, js.v) : null;
  if (mulai != null && selesai != null && selesai < mulai) selesai += HARI;   // terbang lewat tengah malam
  if (mulai != null && selesai != null && selesai - mulai > 12 * JAM) return {g: "satu sortie paling lama 12 jam"};
  const bahan = f("bahan"); if (!Object.hasOwn(BAHAN, bahan)) return {g: `bahan harus ${Object.keys(BAHAN).join("/")}`};
  const kg = num(f("kg"), 0.1, 20000); if (kg == null || Number.isNaN(kg)) return {g: "kg wajib, 0,1 sampai 20.000"};
  const ft = num(f("ketinggian_kaki"), 0, 60000, true); if (Number.isNaN(ft)) return {g: "ketinggian (kaki) bilangan bulat 0 sampai 60.000 atau kosong"};
  const kabIn = f("sasaran_kab") ?? [];
  if (!Array.isArray(kabIn) || kabIn.length > 20) return {g: "sasaran_kab larik maksimal 20 kab/kota"};
  const kab = kabIn.map(x => typeof x === "string" ? x.normalize("NFC").trim() : x);
  if (!kab.every(x => typeof x === "string" && RE_KAB.test(x) && Object.hasOwn(PROV, x.slice(0, 2)))) return {g: 'tiap sasaran kab/kota berbentuk "kodeprov|Nama Kab" (contoh "62|Kotawaringin Timur")'};
  if (new Set(kab).size !== kab.length) return {g: "sasaran kab/kota tidak boleh ganda"};
  const pg = cekPoligon(f("sasaran_poligon")); if (pg.g) return pg;
  if (!kab.length && !pg.v) return {g: "sasaran wajib: pilih minimal satu kab/kota atau gambar poligon"};
  const pIn = (ada(o, "prov") ? o.prov : kab.length ? [] : lama?.prov) ?? [];   // kab baru menentukan prov sendiri (bukan gabungan dengan prov lama: wilayah staf tidak bisa dilewati)
  if (!Array.isArray(pIn) || !pIn.every(x => typeof x === "string" && Object.hasOwn(PROV, x))) return {g: "prov harus larik kode provinsi BPS 2 digit"};
  const prov = [...new Set([...kab.map(x => x.slice(0, 2)), ...pIn])];
  if (!prov.length || prov.length > 6) return {g: "provinsi 1 sampai 6 (otomatis dari kab/kota; untuk poligon saja isi prov)"};
  const catatan = tx(f("catatan"), 500); if (catatan === undefined) return {g: "catatan maksimal 500 karakter"};
  const op = f("operasi_id") ?? null; if (op != null && !(typeof op === "string" && RE_ID.test(op))) return {g: "operasi_id tidak sah"};
  return {v: {pesawat, tanggal, mulai, selesai, bahan, kg, ketinggian_kaki: ft, sasaran_kab: kab, sasaran_poligon: pg.v, prov, lintas: prov.length > 1, catatan, operasi_id: op}};
}
const isianDari = r => ({pesawat: r.pesawat, tanggal: r.tanggal, jam_mulai: jamWib(r.mulai), jam_selesai: jamWib(r.selesai), bahan: r.bahan, kg: r.kg, ketinggian_kaki: r.ketinggian_kaki,
  sasaran_kab: baca(r.sasaran_kab) ?? [], sasaran_poligon: baca(r.sasaran_poligon), prov: baca(r.prov) ?? [], catatan: r.catatan, operasi_id: r.operasi_id});

/* ================================================================ bentuk keluaran */
/* BENTUK TETAP publik (dibaca scripts/omc/*): jangan menambah/mengganti kunci tanpa mengabari cuaca-udara */
const bentukPublik = r => ({id: r.id, operasi_id: r.operasi_id, pesawat: r.pesawat, mulai: iso(r.mulai), selesai: iso(r.selesai), bahan: r.bahan, kg: r.kg, ketinggian_kaki: r.ketinggian_kaki,
  sasaran_kab: baca(r.sasaran_kab) ?? [], sasaran_poligon: baca(r.sasaran_poligon), lintas: !!r.lintas_provinsi, prov: baca(r.prov) ?? []});
const bentukAdmin = r => ({...bentukPublik(r), tanggal: r.tanggal, jam_mulai: jamWib(r.mulai), jam_selesai: jamWib(r.selesai), catatan: r.catatan, dummy: !!r.dummy, diubah: r.diubah});

async function publik(env, req, url, kini, ctx) {
  let sejak = url.searchParams.get("sejak") ?? wib(kini - 90 * HARI);
  if (!tglSah(sejak)) return gagal(400, "sejak harus YYYY-MM-DD");
  if (sejak < wib(kini - 400 * HARI)) sejak = wib(kini - 400 * HARI);   // paling lama 400 hari ke belakang
  return cacheTepi(req, ctx, 300, async () => {
    const R = (await env.DB.prepare("SELECT * FROM omc_sortie WHERE dihapus IS NULL AND dummy = 0 AND tanggal >= ? ORDER BY tanggal, mulai, id LIMIT 500").bind(sejak).all()).results;
    return json({dibuat: new Date(kini).toISOString(), sortie: R.map(bentukPublik)});
  });
}

/* ================================================================ rute staf */
async function bacaAdmin(env, req, url, kini) {
  const mod = await modAtauStaf(env, req, PERAN_BACA); if (!mod) return tolak(false);
  const dum = stafNyata(req) ? "AND dummy = 0" : "";
  const S = (await env.DB.prepare(`SELECT * FROM omc_sortie WHERE dihapus IS NULL ${dum} ORDER BY tanggal DESC, mulai DESC, id LIMIT 2000`).all()).results.filter(r => dalamWilayahStaf(req, baca(r.prov) ?? []));
  const O = (await env.DB.prepare(`SELECT id, nama, provinsi, mulai, selesai, dummy FROM omc_operasi WHERE 1 = 1 ${dum} ORDER BY dibuat DESC LIMIT 200`).all()).results
    .filter(o => !o.provinsi || dalamWilayahStaf(req, [o.provinsi])).map(o => ({...o, dummy: !!o.dummy}));
  return json({kini, boleh_tulis: !!(await modAtauStaf(env, req, PERAN_TULIS)), super: !!await superOK(env, req), bahan: BAHAN, operasi: O, sortie: S.map(bentukAdmin)});
}
async function tulisSortie(env, req, url, kini, ctx, id) {
  const mod = await modAtauStaf(env, req, PERAN_TULIS); if (!mod) return tolak(true);
  const b = await bacaBody(req, 32768); if (b.galat) return gagal(b.status || 400, b.galat);
  let lama = null;
  if (id) {
    lama = RE_ID.test(id) ? await env.DB.prepare("SELECT * FROM omc_sortie WHERE id = ? AND dihapus IS NULL").bind(id).first() : null;
    if (!lama || (stafNyata(req) && lama.dummy) || !dalamWilayahStaf(req, baca(lama.prov) ?? [])) return nTak();
    if (!semuaDalam(req, baca(lama.prov) ?? [])) return gagal(403, "sortie ini mencakup provinsi di luar wilayah akun staf ini");
    if (b.o.aksi !== "ubah" && b.o.aksi !== "hapus") return gagal(400, "aksi harus ubah/hapus");
  }
  const lj = await laju(env, String(mod), "omc.tulis", [[JAM, 120]], kini); if (lj) return lj;
  if (id && b.o.aksi === "hapus") {
    await env.DB.prepare("UPDATE omc_sortie SET dihapus = ?, diubah = ? WHERE id = ? AND dihapus IS NULL").bind(kini, kini, id).run();
    return json({id, dihapus: true});
  }
  const c = cekSortie(b.o, kini, lama && isianDari(lama)); if (c.g) return gagal(400, c.g);
  const v = c.v;
  if (v.sasaran_poligon) {   // prov poligon diturunkan dari titik-titiknya, bukan dari klien
    const dr = await provDariPoligon(env, v.sasaran_poligon);
    if (dr.length) v.prov = [...new Set([...v.sasaran_kab.map(k => k.slice(0, 2)), ...dr])].slice(0, 6);
    else if (!dalamWilayahStaf(req, ["00"])) return gagal(403, "provinsi poligon tidak bisa dipastikan; akun staf berwilayah hanya boleh memakai sasaran kab/kota di wilayahnya");
    v.lintas = v.prov.length > 1;
  }
  if (!semuaDalam(req, v.prov)) return gagal(403, "provinsi sortie di luar wilayah akun staf ini");
  if (v.operasi_id) {
    const op = await env.DB.prepare("SELECT dummy FROM omc_operasi WHERE id = ?").bind(v.operasi_id).first();
    if (!op || op.dummy) return gagal(400, "operasi tidak ada");   // sortie nyata tidak menempel pada operasi dummy, siapa pun pelakunya
  }
  const kolom = [v.operasi_id, v.tanggal, v.pesawat, v.mulai, v.selesai, v.bahan, v.kg, v.ketinggian_kaki, JSON.stringify(v.sasaran_kab), v.sasaran_poligon, v.lintas ? 1 : 0, JSON.stringify(v.prov), v.catatan];
  if (id) {
    await env.DB.prepare(`UPDATE omc_sortie SET operasi_id = ?, tanggal = ?, pesawat = ?, mulai = ?, selesai = ?, bahan = ?, kg = ?, ketinggian_kaki = ?, sasaran_kab = ?, sasaran_poligon = ?, lintas_provinsi = ?, prov = ?, catatan = ?, diubah = ?
      WHERE id = ? AND dihapus IS NULL`).bind(...kolom, kini, id).run();
    return json({id, diubah: kini});
  }
  const baru = acak(8);
  await env.DB.prepare(`INSERT INTO omc_sortie (operasi_id, tanggal, pesawat, mulai, selesai, bahan, kg, ketinggian_kaki, sasaran_kab, sasaran_poligon, lintas_provinsi, prov, catatan, id, pengisi, dibuat, diubah, dummy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`).bind(...kolom, baru, String(mod), kini, kini).run();
  return json({id: baru}, 201);
}
async function buatOperasi(env, req, url, kini) {
  const mod = await modAtauStaf(env, req, PERAN_TULIS); if (!mod) return tolak(true);
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = tx(b.o.nama, 100); if (!nama || nama.length < 2) return gagal(400, "nama operasi 2 sampai 100 karakter");
  const prov = b.o.provinsi == null || b.o.provinsi === "" ? null : b.o.provinsi; if (prov != null && !(typeof prov === "string" && Object.hasOwn(PROV, prov))) return gagal(400, "provinsi harus kode BPS 2 digit atau kosong");
  if (prov && !dalamWilayahStaf(req, [prov])) return gagal(403, "provinsi di luar wilayah akun staf ini");
  const t = k => { const x = b.o[k]; return x == null || x === "" ? null : typeof x === "string" && tglSah(x) ? x : undefined; };
  const mulai = t("mulai"), selesai = t("selesai"); if (mulai === undefined || selesai === undefined) return gagal(400, "tanggal mulai/selesai harus YYYY-MM-DD atau kosong");
  if (mulai && selesai && selesai < mulai) return gagal(400, "tanggal selesai tidak boleh sebelum mulai");
  const lj = await laju(env, String(mod), "omc.tulis", [[JAM, 120]], kini); if (lj) return lj;
  const id = acak(8);
  await env.DB.prepare("INSERT INTO omc_operasi (id, nama, provinsi, mulai, selesai, dibuat, pengisi, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 0)").bind(id, nama, prov, mulai, selesai, kini, String(mod)).run();
  return json({id}, 201);
}

/* ================================================================ untuk laporan harian karhutla (sumber omc) dan Meja Pantau */
/* Sortie pada tanggal data (WIB) dalam bentuk isian `omc.sortie` laporan (public/laporan_karhutla_spek.js normalisasiOmc), siap diprefill. Jam tidak diketahui = jam_mulai null
   (formulir menolak kirim sampai petugas mengisinya). Tanpa tabel 0033: []. Dummy hanya bila diminta (laporan dummy).
   Pemanggil: drafPusat di src/laporan_karhutla.js, cabang sumber === "omc": normalisasiOmc({sortie: await sortieHari(env, tanggalData(tanggal), dummy), hasil: []}, ...). */
export async function sortieHari(env, tanggal_data, dummy = false) {
  if (typeof tanggal_data !== "string" || !tglSah(tanggal_data)) return [];
  let R;
  try { R = (await env.DB.prepare(`SELECT * FROM omc_sortie WHERE dihapus IS NULL AND tanggal = ? ${dummy ? "" : "AND dummy = 0"} ORDER BY mulai, pesawat, id LIMIT 100`).bind(tanggal_data).all()).results; }
  catch (e) { if (tanpaTabel(e)) return []; throw e; }
  return R.map(r => { const prov = baca(r.prov) ?? [];
    return {jenis: "omc", registrasi: r.pesawat, jam_mulai: jamWib(r.mulai), bahan: r.bahan, kg: r.kg, sasaran: (baca(r.sasaran_kab) ?? []).map(k => k.split("|")[1]), provs: prov, lintas: prov.length > 1, ketinggian_ft: r.ketinggian_kaki}; });
}
/* id sortie yang sudah punya episode di omc_hasil.json (dibuat pipeline). Berkas belum ada atau rusak: kosong. */
export async function sortieDenganHasil(env) {
  try {
    const r = await env.ASSETS.fetch(new Request("https://aset.lokal/udara/data/omc_hasil.json"));
    if (!r.ok) { r.body?.cancel(); return new Set(); }
    return new Set(((await r.json()).episode ?? []).flatMap(e => e?.sortie_ids ?? []));
  } catch (e) { return new Set(); }
}
/* butir Meja Pantau omc_tanpa_hasil: sortie lebih dari 24 jam lalu (dari selesai, mulai, atau akhir tanggal WIB bila jam tak diketahui) tanpa episode di omc_hasil.json. a.dummy = pelaku boleh melihat dummy. */
export async function butirOmcTanpaHasil(env, kini, dummy) {
  const R = (await env.DB.prepare(`SELECT id, tanggal, pesawat, bahan, kg, mulai, selesai, prov, sasaran_kab, dummy FROM omc_sortie WHERE dihapus IS NULL ${dummy ? "" : "AND dummy = 0"} AND tanggal <= ? AND tanggal >= ? ORDER BY tanggal DESC LIMIT 500`).bind(wib(kini), wib(kini - 30 * HARI)).all()).results;
  if (!R.length) return [];
  const sudah = await sortieDenganHasil(env), out = [];
  for (const r of R) {
    if (sudah.has(r.id)) continue;
    const acuan = r.selesai ?? r.mulai ?? epoch(r.tanggal, "00:00") + HARI, batas = acuan + TENGGAT_HASIL;
    if (kini <= batas) continue;
    const m = Math.floor((kini - acuan) / HARI), lewat = m >= 1 ? `${m} hari` : `${Math.floor((kini - acuan) / JAM)} jam`;
    out.push({id: `omc:${r.id}`, jenis: "omc_tanpa_hasil", judul: `Sortie ${r.pesawat} tanggal ${r.tanggal} (${BAHAN[r.bahan]}, ${new Intl.NumberFormat("id-ID").format(r.kg)} kg) belum ada hasil evaluasi, lewat ${lewat}`,
      rincian: "Evaluasi dibuat otomatis dari data BMKG dan METAR; bila lama tidak muncul, periksa jam dan sasaran sortie", provs: baca(r.prov) ?? [], kab: (baca(r.sasaran_kab) ?? [])[0]?.split("|")[1] ?? null,
      dibuat: acuan, tenggat: batas, prioritas: kini - batas > 3 * HARI ? 2 : 3, dummy: r.dummy});
  }
  return out;
}

/* ================================================================ dummy (DUMMY.md). Sortie NYATA dari laporan harian 20 Okt 2026 (kalimat pemilik). Jam yang tidak disebut = NULL, bukan karangan.
   Panel hasil membaca omc_hasil.json (pipeline); selama berkas itu belum memuat episode sortie dummy, layar memakai contoh episode berlabel DUMMY yang dibuat klien dari sortie-sortie ini. */
const SORTIE_CONTOH = [   // [indeks operasi, pesawat, bahan, kg, ketinggian, jam mulai, jam selesai, kab, prov, catatan]
  [0, "PK-SCH", "nacl", 1000, 10000, null, null, ["61|Ketapang", "61|Kayong Utara"], ["61"], null],
  [1, "PK-SNL", "dry_ice", 1000, null, null, null, ["62|Kota Palangkaraya"], ["62"], null],
  [1, "PK-SNL", "dry_ice", 500, null, null, null, ["62|Kota Palangkaraya"], ["62"], null],
  [1, "PK-SNL", "nacl", 800, null, null, null, ["62|Kotawaringin Timur", "62|Seruyan", "62|Kotawaringin Barat"], ["62"], "Kotawaringin Timur dan perbatasan Seruyan dengan Kotawaringin Barat"],
  [1, "CASA A-2107", "dry_ice", 800, null, null, null, ["62|Kota Palangkaraya"], ["62"], null],
  [1, "CASA A-2107", "dry_ice", 800, null, null, null, ["62|Kota Palangkaraya"], ["62"], null],
  [1, "CASA A-2107", "dry_ice", 800, null, null, null, ["62|Kota Palangkaraya"], ["62"], null],
  [2, "CASA A-2117", "dry_ice", 800, 5000, "11:29", "13:04", ["16|Kota Palembang"], ["16"], "Timur laut hingga timur Palembang"],
];
const OPERASI_CONTOH = [["[DUMMY] OMC Kalimantan Barat Okt 2026", "61"], ["[DUMMY] OMC Kalimantan Tengah Okt 2026", "62"], ["[DUMMY] OMC Sumatera Selatan Okt 2026", "16"]];
const TGL_CONTOH = "2026-10-20";
async function dummyIsi(env, req, url, kini, oleh) {
  if ((await env.DB.prepare("SELECT count(*) n FROM omc_sortie WHERE dummy = 1").first()).n) return gagal(409, "data dummy OMC sudah ada; hapus dulu dengan 🧹");
  await env.DB.prepare("DELETE FROM omc_operasi WHERE dummy = 1 AND NOT EXISTS (SELECT 1 FROM omc_sortie s WHERE s.operasi_id = omc_operasi.id)").run();   // sisa operasi dummy tanpa sortie
  const idOp = OPERASI_CONTOH.map(() => acak(8)), st = [];
  OPERASI_CONTOH.forEach(([nama, prov], i) => st.push(env.DB.prepare("INSERT INTO omc_operasi (id, nama, provinsi, mulai, selesai, dibuat, pengisi, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 1)").bind(idOp[i], nama, prov, TGL_CONTOH, TGL_CONTOH, kini, oleh)));
  for (const [i, pesawat, bahan, kg, ft, jm, js, kab, prov, catatan] of SORTIE_CONTOH) {
    st.push(env.DB.prepare(`INSERT INTO omc_sortie (id, operasi_id, tanggal, pesawat, mulai, selesai, bahan, kg, ketinggian_kaki, sasaran_kab, sasaran_poligon, lintas_provinsi, prov, catatan, pengisi, dibuat, diubah, dummy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, 1)`).bind(acak(8), idOp[i], TGL_CONTOH, pesawat, jm ? epoch(TGL_CONTOH, jm) : null, js ? epoch(TGL_CONTOH, js) : null, bahan, kg, ft,
      JSON.stringify(kab), JSON.stringify(prov), catatan, oleh, kini, kini));
  }
  await env.DB.batch(st);
  return json({ok: true, operasi: idOp.length, sortie: SORTIE_CONTOH.length}, 201);
}
async function dummyHapus(env) {
  const n = {sortie: (await env.DB.prepare("SELECT count(*) n FROM omc_sortie WHERE dummy = 1").first()).n, operasi: (await env.DB.prepare("SELECT count(*) n FROM omc_operasi WHERE dummy = 1").first()).n};
  await env.DB.batch([env.DB.prepare("DELETE FROM omc_sortie WHERE dummy = 1"),
    env.DB.prepare("DELETE FROM omc_operasi WHERE dummy = 1 AND NOT EXISTS (SELECT 1 FROM omc_sortie s WHERE s.operasi_id = omc_operasi.id)")]);
  return json({ok: true, ...n});
}
async function dummy(env, req) {
  const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req, 512); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "isi") return dummyIsi(env, req, null, Date.now(), mod);
  if (b.o.aksi === "hapus") return dummyHapus(env);
  return gagal(400, "aksi harus isi/hapus");
}

/* ================================================================ halaman /admin/omc: kerangka tanpa data (data dari /api/omc/admin yang dijaga admin atau sesi staf) */

/* rute digabung ke RUTE di src/worker.js. Publik: GET /api/omc/sortie. Staf: modOK atau sesi staf berperan (POST wajib x-pb untuk sesi staf). Nama jalur tanpa garis (gerbang cakupan). */
export const RUTE_OMC = Object.fromEntries(Object.entries({
  "GET /admin/omc": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanOmc, HALAMAN_STAF.omc),   // staf tanpa peran untuk halaman ini ke Meja Pantau, anonim ke login admin
  "GET /api/omc/sortie": publik,
  "GET /api/omc/admin": bacaAdmin,
  "POST /api/omc/sortie": (env, req, url, kini, ctx) => tulisSortie(env, req, url, kini, ctx, null),
  "POST /api/omc/sortie/:id": tulisSortie,
  "POST /api/omc/operasi": buatOperasi,
  "POST /api/omc/dummy": dummy,
}).map(([k, f]) => [k, k.startsWith("GET /admin") ? f : bungkus(f)]));
