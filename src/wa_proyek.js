/* Bot Laporan WA dengan Claude API: rute keadaan proyek untuk mesin bot (BL-02; data/kajian-bnpb/bot-laporan/, KEPUTUSAN D5, D6, D10, K11, K14).
   Semua rute Bearer WA_MESIN (banding konstan lewat sha, WA_MESIN kosong = semua ditolak) KECUALI GET /api/wa/proyek/daftar (sesi staf, tab /pelaporan).
   Urutan gerbang: kunci mesin PERTAMA, sebelum body, D1, atau R2. SQL hanya di src/hak.js (bagian Bot Laporan WA).
   Nomor tidak pernah masuk ke sini: pemakai dikenali dari wa_sha (sha256 nomor ternormal + garam WA_GARAM di mesin).
   R2 (binding MEDIA): bot-laporan/<proyek>/v<n>-<acak>/{isian.json, ubah.json, <nama deck>.pptx, <nama deck>.pdf, pratinjau-<slide>.png}; log kejadian pola di
   bot-laporan/pola/<id>.json. Versi append-only: rute menolak n yang sudah ada; berkas tiap percobaan di awalan unik v<n>-<acak>/ yang kuncinya dicatat baris bl_versi. */
import {json, gagal, sha, acak, bacaBody} from "./worker.js";
import {tglSah} from "./posko.js";
import {hariWib} from "./wa.js";
import {modAtauStaf, stafSesiSemua} from "./staf.js";
import {Galat, pelakuBlMesin as M, pelakuBlStaf, BL_STATUS, BL_POLA, blProyekBuka, blProyekById, blProyekPindah, blProyekStaf, blBahanTambah, blBahanDaftar,
  blVersiTambah, blVersiBaca, blVersiDaftar, blPolaById, blPolaJenis, blPolaNilai, blPolaSimpan, blPolaPutus, blDaftarTulis, BL_TOLAK_HARI, blMenungguHitung, blTerdaftar,
  blBiayaBaca, blBiayaTambah, blDetakBaca, blDetakTulis, blDetakSemua} from "./hak.js";

export const BL_JENIS = ["harian", "penanganan"];   // tahap 1 (Q3 BAWAAN SEMENTARA); jenis tahap 2 ditambah di BL-16. CHECK 0154 sengaja tidak mengunci daftar ini.
const RE_SHA = /^[0-9a-f]{64}$/, RE_ID = /^P-\d{6}-\d{2}$/, RE_WA_ID = /^[\w.:@-]{1,128}$/, RE_JB = /^[a-z0-9_]{2,40}$/, RE_MESIN = /^[a-z0-9_-]{2,40}$/,
  RE_OPERASI = /^[a-z_]{2,30}$/, RE_POLA_ID = /^[a-z0-9-]{8,64}$/, RE_PRATINJAU = /^pratinjau-(\d{1,3})$/, RE_KONTROL = /[\u0000-\u001f\u007f]/;
const MAKS_JSON = 16384, MAKS_BAHAN = 50, MAKS_MENUNGGU = 1000, HARI = 864e5, MUNDUR_HARI = 90;
const MAKS_FORM = 35 * 1024 * 1024, MAKS_DECK = 30 * 1024 * 1024, MAKS_ISIAN = 1024 * 1024, MAKS_PNG = 5 * 1024 * 1024, MAKS_PRATINJAU = 3;
const TIPE = {pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", pdf: "application/pdf", json: "application/json", png: "image/png"};
const MAGIC = {pptx: [0x50, 0x4b, 3, 4], pdf: [0x25, 0x50, 0x44, 0x46, 0x2d], png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]};
const STAF_PERAN = ["pusdalops", "koordalops", "pimpinan"];   // = pembaca bahan laporan harian (src/wa_form.js)

const mesin = async (env, req) => { const t = /^Bearer (.+)$/.exec(req.headers.get("authorization") || "")?.[1]; return !!(env.WA_MESIN && t && await sha(t) === await sha(env.WA_MESIN)); };
/* bungkus: kunci mesin dulu; Galat dari hak.js jadi status HTTP-nya, galat lain dilempar ke rute() (500) */
const jaga = (f, {mesinSaja = true} = {}) => async (env, req, url, kini) => {
  if (mesinSaja && !await mesin(env, req)) return gagal(403, "perlu kunci mesin");
  try { return await f(env, req, url, kini); } catch (e) { if (e instanceof Galat) return gagal(e.status, e.message); throw e; }
};
const tolak = pesan => { throw new Galat(400, pesan); };
const teks = (v, min, maks, nama, wajib = false) => {
  if (v == null || v === "") { if (wajib) tolak(`${nama} wajib`); return null; }
  if (typeof v !== "string") tolak(`${nama} harus teks`);
  const s = v.trim(); if (s.length < min || s.length > maks || RE_KONTROL.test(s)) tolak(`${nama} ${min} sampai ${maks} karakter tanpa karakter kendali`);
  return s;
};
const pola = (v, re, nama) => typeof v === "string" && re.test(v) ? v : tolak(`${nama} tidak sah`);
const tanggalLaporan = (v, kini) => {
  if (!tglSah(v)) tolak("tanggal harus YYYY-MM-DD");
  const h = Date.parse(hariWib(kini)), t = Date.parse(v);
  if (t < h - MUNDUR_HARI * HARI || t > h + HARI) tolak(`tanggal laporan harus dalam ${MUNDUR_HARI} hari terakhir sampai besok`);
  return v;
};
const body = async req => { const b = await bacaBody(req, MAKS_JSON); if (b.galat) throw new Galat(b.status || 400, b.galat); return b.o; };
const proyekAda = async (env, id) => { const p = await blProyekById(env, M, id); if (!p) throw new Galat(404, "proyek tidak ada"); return p; };
const pemegang = (p, waSha) => { if (waSha != null && pola(waSha, RE_SHA, "wa_sha") !== p.wa_sha) throw new Galat(404, "proyek tidak ada"); };   // proyek orang lain = 404, bukan 403 (tidak membocorkan keberadaan)

/* POST /api/wa/proyek {wa_sha, jenis, tanggal, bahan?: [{wa_id, jenis_bahan?}]} = buka atau ambil proyek aktif; {id, wa_sha?} = ambil proyek apa pun statusnya */
async function proyek(env, req, url, kini) {
  const o = await body(req);
  if (o.id != null) {
    const p = await proyekAda(env, pola(o.id, RE_ID, "id")); pemegang(p, o.wa_sha);
    return json({proyek: p, bahan: await blBahanDaftar(env, M, p.id)});
  }
  const waSha = pola(o.wa_sha, RE_SHA, "wa_sha (sha256 hex 64 huruf kecil)"), jenis = BL_JENIS.includes(o.jenis) ? o.jenis : tolak(`jenis harus salah satu: ${BL_JENIS.join(", ")}`);
  const tanggal = tanggalLaporan(o.tanggal, kini);
  const bahan = o.bahan == null ? [] : Array.isArray(o.bahan) && o.bahan.length <= MAKS_BAHAN ? o.bahan.map(b => ({
    wa_id: pola(String(b?.wa_id ?? ""), RE_WA_ID, "bahan.wa_id"), jenis_bahan: b?.jenis_bahan == null ? null : pola(b.jenis_bahan, RE_JB, "bahan.jenis_bahan")})) : tolak(`bahan harus larik paling banyak ${MAKS_BAHAN}`);
  const {proyek: p, baru} = await blProyekBuka(env, M, {waSha, jenis, tanggal}, kini);
  const tambah = await blBahanTambah(env, M, p.id, bahan, kini);
  return json({proyek: tambah ? await blProyekById(env, M, p.id) : p, baru, bahan_baru: tambah, bahan: await blBahanDaftar(env, M, p.id)});
}

/* POST /api/wa/proyek/status {id, ke, wa_sha?, drive_url?}: transisi divalidasi BL_TRANSISI (src/hak.js) */
async function status(env, req, url, kini) {
  const o = await body(req), id = pola(o.id, RE_ID, "id"), ke = BL_STATUS.includes(o.ke) ? o.ke : tolak("status tujuan tidak dikenal");
  let driveUrl = null;
  if (o.drive_url != null) {
    if (ke !== "ditutup") tolak("drive_url hanya saat ke ditutup");
    const u = teks(o.drive_url, 12, 500, "drive_url"); let h = null; try { h = new URL(u); } catch {}
    if (!h || h.protocol !== "https:" || !["drive.google.com", "docs.google.com"].includes(h.hostname)) tolak("drive_url harus https://drive.google.com atau docs.google.com");
    driveUrl = h.href;
  }
  if (o.wa_sha != null) pemegang(await proyekAda(env, id), o.wa_sha);
  return json({ok: true, proyek: await blProyekPindah(env, M, {id, ke, driveUrl}, kini)});
}

/* POST /api/wa/proyek/versi multipart: proyek, n, wa_sha?, instruksi?, peringatan?, berkas isian (wajib di v1), ubah, pptx (wajib), pdf, pratinjau-<slide> (maks 3).
   n wajib = versi proyek + 1. Tiap percobaan menulis ke awalan unik bot-laporan/<proyek>/v<n>-<8 heks acak>/ (put bersyarat etagDoesNotMatch "*"), lalu baris D1
   mencatat kunci lengkapnya. Gagal di put R2 atau batch D1 = semua kunci percobaan ini dihapus, jadi ulang dengan n sama berhasil selama barisnya belum ada;
   dua percobaan n sama bersamaan: satu menang (PK bl_versi), yang kalah 409 tanpa sisa berkas. Berkas versi yang sudah tercatat tidak pernah disentuh. */
/* penjaga ukuran sebelum body dibaca: content-length wajib dan paling banyak MAKS_FORM (diekspor supaya uji tidak bergantung waktu soket) */
export function cekUkuranVersi(req) {
  const cl = req.headers.get("content-length");
  if (!cl || !/^\d{1,12}$/.test(cl)) return gagal(411, "content-length wajib");
  return Number(cl) > MAKS_FORM ? gagal(413, `kiriman melebihi ${MAKS_FORM / 1048576} MB`) : null;
}
async function versiTambah(env, req, url, kini) {
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const ct = req.headers.get("content-type") || "";
  if (!/^multipart\/form-data/i.test(ct)) return gagal(400, "kiriman harus multipart/form-data");
  const ukuran = cekUkuranVersi(req); if (ukuran) return ukuran;
  let f; try { f = await req.formData(); } catch { return gagal(400, "kiriman tidak terbaca"); }
  const isianTeks = k => { const v = f.get(k); return v == null ? null : typeof v === "string" ? v : tolak(`${k} harus teks`); };
  const id = pola(isianTeks("proyek"), RE_ID, "proyek"), nT = isianTeks("n") ?? "";
  if (!/^[1-9]\d{0,2}$/.test(nT)) tolak("n harus 1 sampai 999");
  /* instruksi (kalimat revisi) dan peringatan (catatan draf digabung baris) boleh berbaris banyak: \n dan \r\n dijadikan pengganti netral
     dulu supaya penjaga karakter kendali tetap menolak kendali lain, lalu dikembalikan sebagai \n (insiden 18 Nov 2026: tiap draf berperingatan 400). */
  const baris = (v, maks, nama) => { if (typeof v !== "string") return teks(v, 1, maks, nama); const s = teks(v.replace(/\r?\n/g, " "), 1, maks, nama); return s == null ? null : v.replace(/\r\n?/g, "\n").trim(); };
  const n = Number(nT), instruksi = baris(isianTeks("instruksi"), 4000, "instruksi"), peringatan = baris(isianTeks("peringatan"), 8000, "peringatan");
  const berkas = {}, pratinjau = [];
  for (const [k, v] of f.entries()) {
    if (["proyek", "n", "wa_sha", "instruksi", "peringatan"].includes(k)) continue;
    if (typeof v === "string") tolak(`${k} harus berkas`);
    const m = RE_PRATINJAU.exec(k), j = m ? "png" : {isian: "json", ubah: "json", pptx: "pptx", pdf: "pdf"}[k];
    if (!j) tolak(`medan ${k} tidak dikenal`);
    if (m ? pratinjau.some(x => x.k === k) : berkas[k]) tolak(`${k} dikirim dua kali`);
    const maks = j === "json" ? MAKS_ISIAN : j === "png" ? MAKS_PNG : MAKS_DECK;
    if (!v.size || v.size > maks) throw new Galat(v.size ? 413 : 400, `${k} kosong atau melebihi ${maks / 1048576} MB`);
    const u = new Uint8Array(await v.arrayBuffer());
    if (j === "json") { try { const x = JSON.parse(new TextDecoder("utf-8", {fatal: true}).decode(u)); if (!x || typeof x !== "object") throw 0; } catch { tolak(`${k} bukan JSON objek atau larik`); } }
    else if (!MAGIC[j].every((b, i) => u[i] === b)) tolak(`${k} bukan ${j} sah`);
    const isi = {u, j, nama: v.name || ""};
    if (m) { pratinjau.push({k, ...isi}); if (pratinjau.length > MAKS_PRATINJAU) tolak(`pratinjau paling banyak ${MAKS_PRATINJAU}`); } else berkas[k] = isi;
  }
  if (!berkas.pptx) tolak("berkas pptx wajib");
  if (n === 1 && !berkas.isian) tolak("v1 wajib membawa isian");
  if (n > 1 && !berkas.ubah && !berkas.isian) tolak("versi revisi wajib membawa ubah atau isian");
  const p = await proyekAda(env, id); pemegang(p, isianTeks("wa_sha"));
  if (n <= p.versi) throw new Galat(409, `versi ${n} sudah ada; versi tidak bisa ditimpa (versi terakhir ${p.versi})`);
  if (n !== p.versi + 1) tolak(`n harus ${p.versi + 1}`);
  if (!["terbuka", "bertanya", "membangun", "draf"].includes(p.status)) throw new Galat(409, `proyek ${p.status}; versi baru tidak bisa ditambah`);
  const dasar = `bot-laporan/${id}/v${n}-${acak(4)}/`;
  const deck = (berkas.pptx.nama.replace(/\.pptx$/i, "").replace(/[^\w.\- ]/g, "_").replace(/^[.\s]+/, "").slice(0, 120).trim()) || p.jenis;
  const kunci = {isian: berkas.isian && dasar + "isian.json", ubah: berkas.ubah && dasar + "ubah.json", pptx: dasar + deck + ".pptx", pdf: berkas.pdf && dasar + deck + ".pdf"};
  const tulis = [...["isian", "ubah", "pptx", "pdf"].filter(k => berkas[k]).map(k => [kunci[k], berkas[k].u, TIPE[berkas[k].j]]), ...pratinjau.map(x => [dasar + x.k + ".png", x.u, TIPE.png])];
  const sudah = [];
  try {
    for (const [k, u, tipe] of tulis) {
      const r = await env.MEDIA.put(k, u, {httpMetadata: {contentType: tipe}, onlyIf: {etagDoesNotMatch: "*"}});
      if (!r) throw new Galat(409, "kunci berkas versi sudah terpakai; kirim ulang");
      sudah.push(k);
    }
    const ok = await blVersiTambah(env, M, {id, n, isian_r2: kunci.isian || null, ubah_r2: kunci.ubah || null, pptx_r2: kunci.pptx, pdf_r2: kunci.pdf || null, instruksi, peringatan}, kini);
    if (!ok) throw new Galat(409, "versi proyek berubah bersamaan; baca ulang");
  } catch (e) {
    try { if (sudah.length) await env.MEDIA.delete(sudah); } catch (e2) { console.error("versi: bersihkan R2 gagal", dasar, e2); }
    throw e;
  }
  return json({ok: true, proyek: id, n, berkas: tulis.map(([k]) => k.slice(dasar.length))});
}

/* GET /api/wa/proyek/versi?id=[&n=][&berkas=]: tanpa n = daftar versi; dengan n = baris + isian + ubah + nama berkas; dengan berkas = unduh satu berkas versi itu.
   Kunci dibaca dari baris bl_versi: awalan percobaan = folder pptx_r2 (selalu terisi), jadi berkas percobaan gagal atau kalah tidak pernah terbaca. */
async function versiBaca(env, req, url, kini) {
  const q = k => url.searchParams.get(k), id = pola(q("id"), RE_ID, "id");
  const p = await proyekAda(env, id); pemegang(p, q("wa_sha"));
  if (q("n") == null) return json({proyek: p, versi: await blVersiDaftar(env, M, id)});
  if (!/^[1-9]\d{0,2}$/.test(q("n"))) tolak("n harus 1 sampai 999");
  const v = await blVersiBaca(env, M, id, Number(q("n"))); if (!v) return gagal(404, "versi tidak ada");
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const dasar = v.pptx_r2.slice(0, v.pptx_r2.lastIndexOf("/") + 1);
  if (!dasar.startsWith(`bot-laporan/${id}/v${v.n}-`)) return gagal(500, "kunci versi tidak sah");
  const daftar = (await env.MEDIA.list({prefix: dasar, limit: 20})).objects;
  const nama = q("berkas");
  if (nama != null) {
    const o = daftar.find(x => x.key === dasar + nama), b = o && await env.MEDIA.get(o.key); if (!b) return gagal(404, "berkas tidak ada");
    const ext = nama.split(".").pop();
    return new Response(b.body, {headers: {"content-type": TIPE[ext] || "application/octet-stream", "content-disposition": `attachment; filename="${nama.replace(/[^\w.\- ]/g, "_")}"`,
      "cache-control": "private, no-store", "x-content-type-options": "nosniff"}});
  }
  const baca = async k => { if (!k) return null; const b = await env.MEDIA.get(k); try { return b ? JSON.parse(await b.text()) : null; } catch { return null; } };
  return json({proyek: p, versi: v, isian: await baca(v.isian_r2), ubah: await baca(v.ubah_r2), berkas: daftar.map(x => ({nama: x.key.slice(dasar.length), ukuran: x.size}))});
}

/* POST /api/wa/proyek/pola
   {proyek, n, label: [{jenis, slide_judul, operasi, ringkas, id?}]} = catat kejadian (sekali per proyek+versi per pola), kembalikan pola yang BARU mencapai ambang Q12;
   {id, putusan: aturan|ditolak} = putusan pemilik atas usulan (gateway hanya meneruskan dari nomor PEMILIK). */
async function polaTulis(env, req, url, kini) {
  const o = await body(req);
  if (o.putusan != null) {
    const id = pola(o.id, RE_POLA_ID, "id"), putusan = ["aturan", "ditolak"].includes(o.putusan) ? o.putusan : tolak("putusan harus aturan atau ditolak");
    if (!await blPolaPutus(env, M, id, putusan, kini)) throw new Galat(409, "pola tidak sedang diusulkan");
    return json({ok: true, pola: await blPolaById(env, M, id)});
  }
  if (!env.MEDIA) return gagal(503, "penyimpanan belum aktif");
  const pid = pola(o.proyek, RE_ID, "proyek"), n = Number.isInteger(o.n) && o.n >= 1 && o.n <= 999 ? o.n : tolak("n harus 1 sampai 999");
  if (!Array.isArray(o.label) || !o.label.length || o.label.length > 10) tolak("label harus larik 1 sampai 10");
  const p = await proyekAda(env, pid); if (n > p.versi) tolak("n melebihi versi proyek");
  const hasil = [], ambang = [];
  for (const l of o.label) {
    const label = {jenis: p.jenis, slide_judul: teks(l?.slide_judul, 1, 200, "slide_judul", true), operasi: pola(l?.operasi, RE_OPERASI, "operasi"), ringkas: teks(l?.ringkas, 1, 120, "ringkas", true)};
    if (l?.jenis != null && l.jenis !== p.jenis) tolak("jenis label harus sama dengan jenis proyek");
    label.id = l?.id != null ? pola(l.id, RE_POLA_ID, "label.id") : "pl-" + (await sha([label.jenis, label.slide_judul, label.operasi, label.ringkas].map(s => s.toLowerCase().replace(/\s+/g, " ")).join("|"))).slice(0, 24);
    const lama = await blPolaById(env, M, label.id);
    if (lama && lama.jenis !== p.jenis) tolak("pola milik jenis laporan lain");
    const kunci = `bot-laporan/pola/${label.id}.json`;
    let log = null;
    for (let coba = 0; coba < 3 && !log; coba++) {   // baca-ubah-tulis bersyarat etag: penulis lain di antaranya = baca ulang
      const obj = await env.MEDIA.get(kunci);
      let l = []; try { l = obj ? JSON.parse(await obj.text()).k ?? [] : []; } catch {}
      l = l.filter(k => kini - k.t <= BL_POLA.hari * HARI);
      if (!l.some(k => k.p === pid && k.n === n)) l.push({p: pid, n, t: kini});
      const r = await env.MEDIA.put(kunci, JSON.stringify({k: l}), {httpMetadata: {contentType: TIPE.json}, onlyIf: obj ? {etagMatches: obj.etag} : {etagDoesNotMatch: "*"}});
      if (r) log = l;
    }
    if (!log) throw new Galat(503, "log pola sedang ditulis bersamaan; coba lagi");
    const {baris, capai} = blPolaNilai(lama, label, log, kini);
    await blPolaSimpan(env, M, baris);
    hasil.push(baris); if (capai) ambang.push({...baris, contoh: log.map(k => ({proyek: k.p, n: k.n}))});
  }
  return json({ok: true, pola: hasil, ambang});
}
/* GET /api/wa/proyek/pola?jenis= : pola diusulkan dan aturan tetap untuk jenis itu (aturan diterapkan sebelum operasi pemakai, A9) */
async function polaBaca(env, req, url) {
  const jenis = url.searchParams.get("jenis"); if (!BL_JENIS.includes(jenis)) tolak("jenis tidak dikenal");
  return json({pola: await blPolaJenis(env, M, jenis)});
}

/* GET /api/wa/terdaftar: himpunan wa_sha setuju untuk salinan gateway (D10, A1; WA_IZIN digabung di gateway) */
const terdaftar = async env => json({wa_sha: await blTerdaftar(env, M)});

/* POST /api/wa/daftar {wa_sha, status: menunggu|setuju|tolak, nama?, instansi?}; menunggu wajib nama dan instansi */
async function daftar(env, req, url, kini) {
  const o = await body(req), waSha = pola(o.wa_sha, RE_SHA, "wa_sha (sha256 hex 64 huruf kecil)");
  const st = ["menunggu", "setuju", "tolak"].includes(o.status) ? o.status : tolak("status harus menunggu, setuju, atau tolak");
  const nama = teks(o.nama, 2, 80, "nama", st === "menunggu"), instansi = teks(o.instansi, 2, 120, "instansi", st === "menunggu");
  if (st === "menunggu" && await blMenungguHitung(env, M) >= MAKS_MENUNGGU) throw new Galat(429, "antrean pendaftaran penuh; putuskan yang menunggu dulu");
  const r = await blDaftarTulis(env, M, {waSha, nama, instansi, status: st}, kini);
  const diam = st === "menunggu" && r.status === "tolak";   // ditolak kurang dari BL_TOLAK_HARI lalu: tetap tolak, gateway tidak meneruskan ke pemilik dan tidak membalas
  return json({ok: true, status: r.status, nama: r.nama, instansi: r.instansi, berubah: r.status === st, ...(diam ? {diam: true, tolak_sampai: r.dibuat + BL_TOLAK_HARI * HARI} : {})});
}

/* POST /api/wa/detak {mesin}: detak tiap 5 menit; sebelumnya = detak terakhir sebelum ini (bahan T-TERLEWAT "mati dari jam X sampai Y") */
async function detak(env, req, url, kini) {
  const o = await body(req), m = pola(o.mesin, RE_MESIN, "mesin");
  const sebelumnya = await blDetakBaca(env, M, m); await blDetakTulis(env, M, m, kini);
  return json({ok: true, mesin: m, sebelumnya, terakhir: kini});
}

/* GET /api/wa/biaya?tanggal= dan POST /api/wa/biaya {tanggal, usd_mikro} (tambah, bukan timpa): batas belanja harian A10 dihitung di mesin */
async function biayaBaca(env, req, url, kini) {
  const t = url.searchParams.get("tanggal") || hariWib(kini); if (!tglSah(t)) tolak("tanggal harus YYYY-MM-DD");
  return json({tanggal: t, usd_mikro: await blBiayaBaca(env, M, t)});
}
async function biayaTambah(env, req, url, kini) {
  const o = await body(req), t = o.tanggal == null ? hariWib(kini) : tglSah(o.tanggal) ? o.tanggal : tolak("tanggal harus YYYY-MM-DD");
  const u = Number.isInteger(o.usd_mikro) && o.usd_mikro >= 1 && o.usd_mikro <= 50_000_000 ? o.usd_mikro : tolak("usd_mikro harus bilangan bulat 1 sampai 50000000");
  return json({ok: true, tanggal: t, usd_mikro: await blBiayaTambah(env, M, t, u)});
}

/* GET /api/wa/proyek/daftar: tab /pelaporan, sesi staf Pusdalops/Koordalops/Pimpinan atau admin. Tanpa isian, bahan, wa_sha. 14 hari terakhir + detak mesin. */
async function stafDaftar(env, req, url, kini) {
  if (!await modAtauStaf(env, req, STAF_PERAN)) return (await stafSesiSemua(env, req)) ? gagal(403, "hanya staf Pusdalops, Koordalops, atau Pimpinan") : gagal(401, "belum masuk sebagai staf atau sesi berakhir; masuk lagi");
  const baris = await blProyekStaf(env, pelakuBlStaf, kini - 14 * HARI);
  return json({proyek: baris.map(r => ({...r, pemegang: r.pemegang || "Pemakai terdaftar"})), detak: await blDetakSemua(env, pelakuBlStaf)});
}

export const RUTE_WA_PROYEK = {
  "POST /api/wa/proyek": jaga(proyek),
  "POST /api/wa/proyek/status": jaga(status),
  "POST /api/wa/proyek/versi": jaga(versiTambah),
  "GET /api/wa/proyek/versi": jaga(versiBaca),
  "POST /api/wa/proyek/pola": jaga(polaTulis),
  "GET /api/wa/proyek/pola": jaga(polaBaca),
  "GET /api/wa/proyek/daftar": jaga(stafDaftar, {mesinSaja: false}),
  "GET /api/wa/terdaftar": jaga(terdaftar),
  "POST /api/wa/daftar": jaga(daftar),
  "POST /api/wa/detak": jaga(detak),
  "GET /api/wa/biaya": jaga(biayaBaca),
  "POST /api/wa/biaya": jaga(biayaTambah),
};
