/* Laporan harian multi-bahaya (banjir, gempa, gunungapi, cuaca, kekeringan, udara). Skema: migrations/0048_laporan_bencana.sql (tabel lkb_*, kembaran lk_* dengan kolom bencana di kunci).
   Spek: public/laporan_bencana_spek.js (adaptor per bahaya dari laporan.json v1). Karhutla TIDAK lewat sini: tetap src/laporan_karhutla.js dan lk_*.
   Pintu masuk: tiap rute /api/laporan-karhutla/* (dan alias /api/instansi/laporan/*) menerima ?bencana=<bahaya>; src/laporan_karhutla.js memvalidasi nilainya terhadap registri
   (400 bila tidak dikenal) lalu menyerahkan ke sini, jadi tidak ada rute baru di src/worker.js dan cookie sesi instansi (Path /api/instansi) tetap berlaku.
   Aturan sama dengan karhutla: operator provinsi = akun pemprov aktif, hanya provinsinya (provinsi lain 404); peramban tidak dipercaya (validasi ulang + cek merah/kuning di Worker);
   merah menahan SETUJUI dan KUNCI; kunci membekukan snapshot + sha256 di lkb_snapshot; koreksi = ralat. Beda dari karhutla: sumber hanya prov:<kode>, satu bentuk isian generik,
   provinsi yang wajib mengirim laporan (prioritas) = penyumbang terbesar metrik utama di laporan.json pada tanggal data (dibekukan saat hari dibuat); provinsi di luar prioritas boleh mengirim (tidak wajib).
   Tanpa migrasi 0048 semua rute ?bencana= menjawab 503 sopan. Draf dibuat saat dibaca (tidak ada cron): angka otomatis dibaca dari berkas aset, bukan disalin ke D1.
   ponytail: tanpa tagih WA dan tanpa pengait Meja Pantau (provinsi belum kirim) untuk bahaya lain; tambahkan bila dibutuhkan, polanya ada di laporan_karhutla.js. */
import {json, gagal, sha, bacaBody} from "./worker.js";
import {wib} from "./posko.js";
import * as K from "../public/laporan_karhutla_spek.js";
import {spek, pilihPrioritas, dariLaporan} from "../public/laporan_bencana_spek.js";

const JAM = 3600e3, HARI = 24 * JAM;
export const tanpa0048 = e => /no such table: lkb_/i.test(String(e?.message || e));
const jsonDari = s => { try { return JSON.parse(s); } catch (e) { return null; } };
export const TANGGAL_DUMMY_BENCANA = "2026-10-21";

/* kit = {pelaku, verifikator, adaTanggal, gerbangDummy, superOK, topeng, batasMs} dari laporan_karhutla.js (satu sumber hak akses, tanpa impor melingkar) */
export function buatRute(kit) {
  const {pelaku, verifikator, adaTanggal, gerbangDummy, superOK, topeng, batasMs, batasPemprov} = kit;

  /* ---------------- data dasar */
  async function laporan(env, b) {
    try { const r = await env.ASSETS.fetch(new Request("http://aset.lokal" + K.BENCANA[b].url)); if (!r.ok) { r.body?.cancel(); return null; } return await r.json(); } catch (e) { return null; }
  }
  const ambilHari = (env, b, tanggal) => env.DB.prepare("SELECT * FROM lkb_hari WHERE bencana = ? AND tanggal_laporan = ?").bind(b, tanggal).first();
  const hariMaya = (tanggal, prioritas) => ({tanggal_laporan: tanggal, status: "terbuka", prioritas: JSON.stringify(prioritas), pengecualian: "[]", ralat: 0, hash: null, dikunci_oleh: null, dikunci_pada: null, dibuat: null, dummy: 0, maya: true});
  /* hari nyata SELALU dummy = 0; prioritas dibekukan dari laporan.json saat baris dibuat */
  async function pastikanHari(env, b, tanggal, kini) {
    const pr = pilihPrioritas(await laporan(env, b), K.tanggalData(tanggal));
    await env.DB.prepare("INSERT OR IGNORE INTO lkb_hari (bencana, tanggal_laporan, prioritas, dibuat, dummy) VALUES (?, ?, ?, ?, 0)").bind(b, tanggal, JSON.stringify(pr), kini).run();
    return ambilHari(env, b, tanggal);
  }
  const kirimanHari = async (env, b, tanggal) => Object.fromEntries((await env.DB.prepare("SELECT * FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ?").bind(b, tanggal).all()).results.map(r => [r.sumber, r]));
  const bolehTulis = (p, sumber) => { const k = K.kodeDariSumber(sumber); return p.tipe === "pemprov" && !!k && p.cakupan.includes(k); };
  const namaProv = (L, kode) => L?.prov?.[kode]?.nama ?? K.namaProv(kode);
  const namaSemua = L => Object.fromEntries(Object.entries(L?.prov ?? {}).map(([k, p]) => [k, p?.nama ?? k]));
  /* angka otomatis satu provinsi untuk operator yang mengisi (hanya dibaca, tidak disimpan) */
  const otomatisProv = (L, td, kode) => { const d = dariLaporan(L, td); if (!d) return null; const m = d.prov[kode]?.metrik ?? {};
    return {tanggal_data: td, metrik: d.metrik.filter(x => m[x.k] != null).map(x => ({k: x.k, label: x.label, satuan: x.satuan, desimal: x.desimal, nilai: m[x.k]})), sumber: d.sumber.map(x => x.nama), berjalan: d.otomatis.berjalan}; };

  /* ---------------- tulis kiriman */
  async function tulisKiriman(env, o) {
    const {b, tanggal, sumber, isi, cek, status, aksi, oleh, kini, klien, dasar, dummy} = o;
    if (klien) {
      const u = await env.DB.prepare("SELECT versi, status FROM lkb_versi WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ? AND klien_id = ?").bind(b, tanggal, sumber, klien).first();
      if (u) return {ulang: true, versi: u.versi, status: u.status};
    }
    const ada = await env.DB.prepare("SELECT versi, status, catatan FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ?").bind(b, tanggal, sumber).first(), skrg = ada?.versi ?? 0;
    if (skrg !== dasar) return {konflik: true, versi_terakhir: skrg, status: ada?.status ?? null};
    const baru = skrg + 1, tIsi = JSON.stringify(isi), tCek = JSON.stringify(cek), kirim = aksi === "kirim";
    const st = [ada
      ? env.DB.prepare("UPDATE lkb_kiriman SET status = ?1, versi = ?2, isi = ?3, cek = ?4, pengirim = ?5, diubah = ?6, dikirim = ?7, catatan = ?8, verif_oleh = NULL, verif_pada = NULL WHERE bencana = ?9 AND tanggal_laporan = ?10 AND sumber = ?11 AND versi = ?12")
        .bind(status, baru, tIsi, tCek, oleh, kini, kirim ? kini : null, kirim ? null : ada.catatan, b, tanggal, sumber, skrg)
      : env.DB.prepare("INSERT INTO lkb_kiriman (bencana, tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)").bind(b, tanggal, sumber, status, baru, tIsi, tCek, oleh, kini, kirim ? kini : null, dummy),
      env.DB.prepare("INSERT INTO lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, klien_id, dummy) SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12 WHERE changes() > 0").bind(b, tanggal, sumber, baru, aksi, status, tIsi, tCek, oleh, kini, klien ?? null, dummy)];
    const kalah = async () => { const n = await env.DB.prepare("SELECT versi, status FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ?").bind(b, tanggal, sumber).first(); return {konflik: true, versi_terakhir: n?.versi ?? 0, status: n?.status ?? null}; };
    let r;
    try { r = await env.DB.batch(st); }
    catch (e) {
      const m = String(e?.message || e);
      if (/CHECK constraint/i.test(m)) { const besar = /length\(isi\)/i.test(m); return {galat: besar ? "isian melebihi batas ukuran (262144 karakter)" : "isian melanggar batas skema: " + m.replace(/^.*CHECK constraint failed:?/i, "").slice(0, 120).trim(), s: besar ? 413 : 400}; }
      if (/UNIQUE|constraint/i.test(m)) return kalah();
      throw e;
    }
    if (!r[0].meta.changes) return kalah();
    return {versi: baru, status};
  }
  const tolakKonflik = r => gagal(409, `kiriman sudah berubah (versi terakhir ${r.versi_terakhir}${r.status ? ", status " + r.status : ""}); muat ulang sebelum menyimpan`, {"x-versi": String(r.versi_terakhir)});
  const galatBentuk = (SP, g) => json({galat: `isian tidak sah, ${SP.galatManusia(g[0])}`, rincian: g.slice(0, 50)}, 400);

  async function parameterKiriman(env, req, kini, p, b) {
    const bd = await bacaBody(req, 300 * 1024); if (bd.galat) return {r: gagal(bd.status || 400, bd.galat)};
    const {tanggal, sumber, isi, klien_id, versi_dasar} = bd.o;
    if (typeof tanggal !== "string" || !adaTanggal(tanggal, kini)) return {r: gagal(400, "tanggal harus YYYY-MM-DD yang sah dan tidak lebih dari besok")};
    if (!K.kodeDariSumber(sumber)) return {r: gagal(400, "sumber harus prov:<kode provinsi 2 digit>")};
    if (p.tipe === "pemprov" && !bolehTulis(p, sumber)) return {r: gagal(404, "kiriman tidak ditemukan")};   // provinsi lain: 404 sama dengan "tidak ada"
    if (!bolehTulis(p, sumber)) return {r: gagal(403, "hanya akun Pemerintah Provinsi yang mengisi laporan provinsi")};
    if (klien_id != null && !(typeof klien_id === "string" && /^[A-Za-z0-9_-]{8,40}$/.test(klien_id))) return {r: gagal(400, "klien_id harus 8-40 huruf/angka")};
    if (!Number.isInteger(versi_dasar) || versi_dasar < 0) return {r: gagal(400, "versi_dasar wajib (0 bila belum ada kiriman)")};
    const hari = (await ambilHari(env, b, tanggal)) ?? hariMaya(tanggal, []);
    const gd = gerbangDummy(p, hari); if (gd) return {r: gd};
    if (hari.status !== "terbuka") return {r: gagal(409, "laporan hari itu sudah dikunci; koreksi lewat ralat oleh verifikator")};
    const bp = await batasPemprov(env, p, tanggal, kini); if (bp) return {r: bp};   // tanggal terlalu lama + batas laju tulis akun provinsi
    return {tanggal, sumber, isi, klien: klien_id ?? null, dasar: versi_dasar, hari};
  }
  async function simpan(env, req, kini, b, kirim) {
    const SP = spek(b), p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    const a = await parameterKiriman(env, req, kini, p, b); if (a.r) return a.r;
    let mentah = a.isi;
    if (kirim && mentah == null) { const k = await env.DB.prepare("SELECT isi FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ?").bind(b, a.tanggal, a.sumber).first(); mentah = jsonDari(k?.isi); if (!mentah) return gagal(400, "belum ada draf untuk dikirim; sertakan isi"); }
    const {isi, galat} = SP.normalisasi(a.sumber, mentah, a.tanggal, kirim); if (galat.length) return galatBentuk(SP, galat);
    const cek = SP.cek(a.sumber, isi);
    if (a.hari.maya) await pastikanHari(env, b, a.tanggal, kini);
    const r = await tulisKiriman(env, {...a, b, isi, cek, status: kirim ? "terkirim" : "draf", aksi: kirim ? "kirim" : "draf", oleh: p.oleh, kini, dummy: a.hari.dummy});
    if (r.konflik) return tolakKonflik(r); if (r.galat) return gagal(r.s ?? 400, r.galat);
    return json({ok: true, bencana: b, versi: r.versi, status: r.status, ulang: !!r.ulang, cek, hitung: K.hitungCek(cek)}, r.ulang ? 200 : 201);
  }

  /* ---------------- baca: hari, kiriman */
  async function bacaHari(env, req, url, kini, b) {
    const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (p.tipe === "pemprov") return gagal(403, "kelengkapan laporan hanya untuk staf dan admin");
    const tanggal = url.searchParams.get("tanggal");
    if (tanggal == null) {
      const R = (await env.DB.prepare("SELECT tanggal_laporan, status, ralat, dummy FROM lkb_hari WHERE bencana = ? ORDER BY tanggal_laporan DESC LIMIT 40").bind(b).all()).results;
      return json({kini, bencana: b, nama_bencana: K.BENCANA[b].nama, hari: R});
    }
    if (!K.tglSah(tanggal)) return gagal(400, "tanggal harus YYYY-MM-DD");
    const L = await laporan(env, b), row = await ambilHari(env, b, tanggal), hari = row ?? hariMaya(tanggal, pilihPrioritas(L, K.tanggalData(tanggal)));
    const pr = jsonDari(hari.prioritas) || [], kir = await kirimanHari(env, b, tanggal), wajib = pr.map(k => "prov:" + k), SP = spek(b);
    const baris = [...wajib, ...Object.keys(kir).filter(s => !wajib.includes(s)).sort()].map(s => { const k = kir[s], cek = jsonDari(k?.cek) || [];
      return {sumber: s, label: namaProv(L, K.kodeDariSumber(s)), wajib: wajib.includes(s), status: k?.status ?? "belum", versi: k?.versi ?? 0, diubah: k?.diubah ?? null, dikirim: k?.dikirim ?? null, pengirim: k ? topeng(k.pengirim) : null,
        catatan: k?.catatan ?? null, cek: K.hitungCek(cek), merah: cek.filter(x => x.t === "merah").length}; });
    const td = K.tanggalData(tanggal), dl = dariLaporan(L, td);
    return json({kini, bencana: b, nama_bencana: K.BENCANA[b].nama, tanggal, tanggal_data: td, tersimpan: !!row, dummy: hari.dummy, status: SP.statusHari({status: hari.status, prioritas: pr, kiriman: kir}), status_tersimpan: hari.status, prioritas: pr,
      wajib, batas_wib: batasMs(tanggal), lewat_batas: kini > batasMs(tanggal), ralat: hari.ralat, hash: hari.hash, dikunci_pada: hari.dikunci_pada, pengecualian: jsonDari(hari.pengecualian) || [], kiriman: baris, tagih: [],
      data_otomatis: {tersedia: !!dl, hari_lengkap: L?.hari_lengkap ?? null}, boleh: {tulis: [], verifikasi: verifikator(p), super: !!await superOK(env, req)}, nama_prov: namaSemua(L)});
  }
  async function bacaKiriman(env, req, url, kini, b) {
    const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    const tanggal = url.searchParams.get("tanggal"), sumber = url.searchParams.get("sumber"), kode = K.kodeDariSumber(sumber ?? "");
    if (!K.tglSah(tanggal || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
    if (!kode) return gagal(400, "sumber tidak sah (prov:<kode>)");
    if (p.tipe === "pemprov" && !p.cakupan.includes(kode)) return gagal(404, "kiriman tidak ditemukan");
    const SP = spek(b), L = await laporan(env, b), hari = (await ambilHari(env, b, tanggal)) ?? hariMaya(tanggal, pilihPrioritas(L, K.tanggalData(tanggal)));
    const k = await env.DB.prepare("SELECT * FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ?").bind(b, tanggal, sumber).first();
    const isi = k ? jsonDari(k.isi) : SP.normalisasi(sumber, {}, tanggal, false).isi, cek = SP.cek(sumber, isi);
    const riwayat = k ? (await env.DB.prepare("SELECT versi, aksi, status, oleh, waktu, catatan FROM lkb_versi WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ? ORDER BY id DESC LIMIT 30").bind(b, tanggal, sumber).all()).results.map(r => ({...r, oleh: topeng(r.oleh)})) : [];
    return json({kini, bencana: b, nama_bencana: K.BENCANA[b].nama, tanggal, sumber, label: namaProv(L, kode), ada: !!k, draf_otomatis: !k, versi: k?.versi ?? 0, status: k?.status ?? "draf", catatan: k?.catatan ?? null, diubah: k?.diubah ?? null, dikirim: k?.dikirim ?? null,
      terkunci: hari.status !== "terbuka", wajib: (jsonDari(hari.prioritas) || []).includes(kode), isi, cek, hitung: K.hitungCek(cek), otomatis: otomatisProv(L, K.tanggalData(tanggal), kode), riwayat,
      boleh_tulis: bolehTulis(p, sumber) && hari.status === "terbuka", boleh_verifikasi: verifikator(p)});
  }

  /* ---------------- verifikasi dan prioritas */
  async function verifikasi(env, req, kini, b) {
    const SP = spek(b), p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, p.tipe === "pemprov" ? "tidak ditemukan" : "hanya verifikator, pusdalops, atau moderator yang memverifikasi");
    const bd = await bacaBody(req, 4096); if (bd.galat) return gagal(bd.status || 400, bd.galat);
    const {tanggal, sumber, aksi, versi} = bd.o, catatan = typeof bd.o.catatan === "string" ? K.ringkas(bd.o.catatan).slice(0, 500) : "";
    if (!K.tglSah(tanggal || "") || !K.kodeDariSumber(sumber ?? "")) return gagal(400, "tanggal dan sumber (prov:<kode>) wajib");
    if (!["setujui", "kembalikan"].includes(aksi)) return gagal(400, "aksi harus setujui atau kembalikan");
    if (aksi === "kembalikan" && catatan.length < 3) return gagal(400, "catatan pengembalian wajib (minimal 3 huruf)");
    if (!Number.isInteger(versi)) return gagal(400, "versi kiriman wajib");
    const hari = await ambilHari(env, b, tanggal); if (!hari) return gagal(404, "belum ada laporan hari itu");
    const gd = gerbangDummy(p, hari); if (gd) return gd;
    if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; koreksi lewat ralat");
    const k = await env.DB.prepare("SELECT * FROM lkb_kiriman WHERE bencana = ? AND tanggal_laporan = ? AND sumber = ?").bind(b, tanggal, sumber).first();
    if (!k) return gagal(404, "kiriman belum ada");
    if (k.versi !== versi) return gagal(409, `versi sudah berubah (terakhir ${k.versi})`, {"x-versi": String(k.versi)});
    if (k.status !== "terkirim") return gagal(409, `hanya kiriman berstatus terkirim yang diverifikasi (sekarang ${k.status})`);
    if (aksi === "setujui") { const cek = SP.cek(sumber, jsonDari(k.isi)); if (K.adaMerah(cek)) return json({galat: "cek merah menahan persetujuan; kembalikan ke pengirim", merah: cek.filter(x => x.t === "merah")}, 422); }
    const status = aksi === "setujui" ? "disetujui" : "dikembalikan", oleh = p.oleh;
    const r = await env.DB.batch([
      env.DB.prepare("UPDATE lkb_kiriman SET status = ?1, verif_oleh = ?2, verif_pada = ?3, catatan = ?4 WHERE bencana = ?5 AND tanggal_laporan = ?6 AND sumber = ?7 AND versi = ?8 AND status = 'terkirim'").bind(status, oleh, kini, catatan || null, b, tanggal, sumber, versi),
      env.DB.prepare("INSERT INTO lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, catatan, dummy) SELECT bencana, tanggal_laporan, sumber, versi, ?1, status, isi, cek, ?2, ?3, catatan, dummy FROM lkb_kiriman WHERE bencana = ?4 AND tanggal_laporan = ?5 AND sumber = ?6 AND changes() > 0")
        .bind(aksi, oleh, kini, b, tanggal, sumber)]);
    if (!r[0].meta.changes) return gagal(409, "kiriman berubah saat diverifikasi; muat ulang");
    return json({ok: true, bencana: b, status, versi});
  }
  async function ubahPrioritas(env, req, kini, b) {
    const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator yang menetapkan provinsi yang wajib mengirim laporan");
    const bd = await bacaBody(req, 2048); if (bd.galat) return gagal(bd.status || 400, bd.galat);
    const {tanggal, provinsi} = bd.o;
    if (!adaTanggal(tanggal, kini)) return gagal(400, "tanggal tidak sah");
    if (!Array.isArray(provinsi) || provinsi.length > 12 || !provinsi.every(k => typeof k === "string" && /^\d{2}$/.test(k)) || new Set(provinsi).size !== provinsi.length) return gagal(400, "provinsi: 0-12 kode 2 digit unik");
    let hari = (await ambilHari(env, b, tanggal)) ?? hariMaya(tanggal, []);
    const gd = gerbangDummy(p, hari); if (gd) return gd;
    if (hari.maya) hari = await pastikanHari(env, b, tanggal, kini);
    if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; prioritas beku");
    await env.DB.prepare("UPDATE lkb_hari SET prioritas = ? WHERE bencana = ? AND tanggal_laporan = ? AND status = 'terbuka'").bind(JSON.stringify(provinsi), b, tanggal).run();
    return json({ok: true, bencana: b, prioritas: provinsi});
  }

  /* ---------------- kunci, ralat, snapshot */
  async function susunKiriman(env, b, tanggal, hari, kir, pengecualian, ganti = {}) {
    const out = {}, tanpa = new Set(pengecualian.map(x => x.sumber));
    for (const [s, k] of Object.entries(kir)) if (k.status === "disetujui" && !tanpa.has(s)) out[s] = {isi: jsonDari(k.isi)};
    for (const [s, isi] of Object.entries(ganti)) out[s] = {isi};
    for (const x of pengecualian) {
      const prev = await env.DB.prepare("SELECT tanggal_laporan t, isi FROM lkb_kiriman WHERE bencana = ? AND sumber = ? AND tanggal_laporan < ? AND status IN ('terkirim', 'disetujui') AND dummy = ? ORDER BY tanggal_laporan DESC LIMIT 1").bind(b, x.sumber, tanggal, hari.dummy).first();
      out[x.sumber] = prev ? {isi: jsonDari(prev.isi), data_terakhir: prev.t} : {isi: null, data_terakhir: null};
    }
    return out;
  }
  async function bangun(env, b, hari, tanggal, kir, pengecualian, ralat, alasan, oleh, kini, ganti, beku) {
    return spek(b).agregasi({tanggal_laporan: tanggal, prioritas: jsonDari(hari.prioritas) || [], pengecualian, kiriman: await susunKiriman(env, b, tanggal, hari, kir, pengecualian, ganti),
      laporan: beku ? null : await laporan(env, b), beku, ralat, alasan, dikunci_oleh: topeng(oleh), dikunci_pada: kini});
  }
  async function kunci(env, req, kini, b) {
    const SP = spek(b), p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator, pusdalops, atau moderator yang mengunci");
    const bd = await bacaBody(req, 8192); if (bd.galat) return gagal(bd.status || 400, bd.galat);
    const tanggal = bd.o.tanggal; if (!K.tglSah(tanggal || "")) return gagal(400, "tanggal tidak sah");
    if (tanggal > wib(kini)) return gagal(400, "tanggal belum tiba; laporan hanya bisa dikunci pada hari itu atau sesudahnya");
    let hari = await ambilHari(env, b, tanggal);
    if (!hari) hari = hariMaya(tanggal, pilihPrioritas(await laporan(env, b), K.tanggalData(tanggal)));
    const gd = gerbangDummy(p, hari); if (gd) return gd;
    if (hari.maya) hari = await pastikanHari(env, b, tanggal, kini);
    if (hari.status !== "terbuka") return gagal(409, "laporan sudah dikunci; koreksi lewat ralat");
    const pr = jsonDari(hari.prioritas) || [], wajib = SP.sumberWajib(pr), kir = await kirimanHari(env, b, tanggal), lanjut = bd.o.lanjut_tanpa ?? [];
    if (!Array.isArray(lanjut) || lanjut.length > 12) return gagal(400, "lanjut_tanpa harus daftar");
    const pengecualian = [];
    for (const x of lanjut) {
      const alasan = typeof x?.alasan === "string" ? K.ringkas(x.alasan) : "";
      if (!wajib.includes(x?.sumber)) return gagal(400, `lanjut tanpa hanya untuk sumber wajib hari itu (${wajib.join(", ") || "tidak ada"})`);
      if (alasan.length < 10 || alasan.length > 300) return gagal(400, `alasan lanjut tanpa ${x.sumber} wajib 10-300 huruf`);
      if (pengecualian.some(y => y.sumber === x.sumber)) return gagal(400, "sumber berulang di lanjut_tanpa");
      pengecualian.push({sumber: x.sumber, alasan});
    }
    if (pengecualian.length && tanggal === wib(kini) && kini < batasMs(tanggal)) return gagal(409, "lanjut tanpa baru boleh dipakai untuk hari ini sesudah 09.00 WIB (batas daerah); tunggu atau minta sumbernya mengirim");
    const tanpa = new Set(pengecualian.map(x => x.sumber)), belum = wajib.filter(s => !tanpa.has(s) && kir[s]?.status !== "disetujui").map(s => ({sumber: s, label: SP.labelSumber(s), status: kir[s]?.status ?? "belum"}));
    if (belum.length) return json({galat: `laporan belum bisa dikunci: ${belum.length} sumber wajib belum disetujui (${belum.map(x => x.label).join(", ")})`, belum}, 409);
    for (const s of wajib) if (!tanpa.has(s)) { const cek = SP.cek(s, jsonDari(kir[s].isi)); if (K.adaMerah(cek)) return json({galat: `cek merah menahan kunci pada ${SP.labelSumber(s)}`, sumber: s, merah: cek.filter(x => x.t === "merah")}, 422); }
    const snap = await bangun(env, b, hari, tanggal, kir, pengecualian, 0, null, p.oleh, kini, undefined, null);
    const teks = JSON.stringify(snap), hash = await sha(teks), status = pengecualian.length ? "dikunci_pengecualian" : "dikunci";
    try {
      const r = await env.DB.batch([
        env.DB.prepare("INSERT INTO lkb_snapshot (bencana, tanggal_laporan, ralat, hash, isi, oleh, waktu, dummy) VALUES (?1, ?2, 0, ?3, ?4, ?5, ?6, ?7)").bind(b, tanggal, hash, teks, p.oleh, kini, hari.dummy),
        env.DB.prepare("UPDATE lkb_hari SET status = ?1, pengecualian = ?2, ralat = 0, hash = ?3, dikunci_oleh = ?4, dikunci_pada = ?5 WHERE bencana = ?6 AND tanggal_laporan = ?7 AND status = 'terbuka'").bind(status, JSON.stringify(snap.pengecualian), hash, p.oleh, kini, b, tanggal)]);
      if (!r[1].meta.changes) return gagal(409, "laporan sudah dikunci oleh orang lain");
    } catch (e) { const m = String(e?.message); if (/CHECK constraint/i.test(m)) return gagal(/length\(isi\)/i.test(m) ? 413 : 400, "snapshot melanggar batas skema: " + m.slice(0, 160)); if (/UNIQUE|constraint/i.test(m)) return gagal(409, "laporan sudah dikunci oleh orang lain"); throw e; }
    return json({ok: true, bencana: b, tanggal, status, ralat: 0, hash, pengecualian: snap.pengecualian}, 201);
  }
  async function ralat(env, req, kini, b) {
    const SP = spek(b), p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (!verifikator(p)) return gagal(p.tipe === "pemprov" ? 404 : 403, "hanya verifikator, pusdalops, atau moderator yang membuat ralat");
    const bd = await bacaBody(req, 300 * 1024); if (bd.galat) return gagal(bd.status || 400, bd.galat);
    const {tanggal, ganti} = bd.o, alasan = typeof bd.o.alasan === "string" ? K.ringkas(bd.o.alasan) : "";
    if (!K.tglSah(tanggal || "")) return gagal(400, "tanggal tidak sah");
    if (tanggal > wib(kini)) return gagal(400, "tanggal belum tiba");
    if (alasan.length < 10 || alasan.length > 500) return gagal(400, "alasan ralat wajib 10-500 huruf");
    if (!ganti || typeof ganti !== "object" || Array.isArray(ganti) || !Object.keys(ganti).length || Object.keys(ganti).length > 12) return gagal(400, "ganti: objek sumber -> isi yang dikoreksi (1-12 sumber)");
    const hari = await ambilHari(env, b, tanggal); if (!hari) return gagal(404, "belum ada laporan hari itu");
    const gd = gerbangDummy(p, hari); if (gd) return gd;
    if (hari.status === "terbuka") return gagal(409, "laporan belum dikunci; ubah lewat kiriman biasa");
    const kir = await kirimanHari(env, b, tanggal), lamaBaris = await env.DB.prepare("SELECT isi FROM lkb_snapshot WHERE bencana = ? AND tanggal_laporan = ? AND ralat = ?").bind(b, tanggal, hari.ralat).first(), lama = jsonDari(lamaBaris?.isi);
    const bersih = {}, st = [];
    for (const [s, mentah] of Object.entries(ganti)) {
      if (!K.kodeDariSumber(s)) return gagal(400, `sumber ${s} bukan prov:<kode>`);
      const {isi, galat} = SP.normalisasi(s, mentah, tanggal, true); if (galat.length) return galatBentuk(SP, galat);
      bersih[s] = isi;
    }
    const asal = Array.isArray(lama?.pengecualian) ? lama.pengecualian : (jsonDari(hari.pengecualian) || []), pengecualian = asal.filter(x => !Object.hasOwn(bersih, x.sumber)).map(x => ({sumber: x.sumber, alasan: x.alasan}));
    if (!lama?.provinsi) return gagal(404, "snapshot sebelumnya tidak terbaca; ralat tidak bisa dibuat");
    /* sumber yang tidak dikoreksi diambil dari snapshot sebelumnya (beku), BUKAN dari lkb_kiriman hidup: kiriman yang berubah sesudah kunci tidak boleh menyelinap lewat ralat */
    const kiriman = {};
    for (const p of lama.provinsi) if (p.ada || p.lanjut_tanpa) kiriman[p.sumber] = {isi: p.kiriman, data_terakhir: p.data_terakhir};
    for (const [s, isi] of Object.entries(bersih)) kiriman[s] = {isi};
    for (const [s, isi] of Object.entries(bersih)) {
      const cek = SP.cek(s, isi), ada = kir[s], baru = (ada?.versi ?? 0) + 1, tIsi = JSON.stringify(isi), tCek = JSON.stringify(cek);
      if (K.adaMerah(cek)) return json({galat: `cek merah menahan ralat pada ${SP.labelSumber(s)}; betulkan angkanya dulu`, sumber: s, merah: cek.filter(x => x.t === "merah")}, 422);
      st.push(ada
        ? env.DB.prepare("UPDATE lkb_kiriman SET status = 'disetujui', versi = ?1, isi = ?2, cek = ?3, pengirim = ?4, diubah = ?5, verif_oleh = ?4, verif_pada = ?5, catatan = ?6 WHERE bencana = ?7 AND tanggal_laporan = ?8 AND sumber = ?9 AND versi = ?10").bind(baru, tIsi, tCek, p.oleh, kini, "ralat: " + alasan.slice(0, 300), b, tanggal, s, ada.versi)
        : env.DB.prepare("INSERT INTO lkb_kiriman (bencana, tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, catatan, verif_oleh, verif_pada, dummy) VALUES (?1, ?2, ?3, 'disetujui', ?4, ?5, ?6, ?7, ?8, ?8, ?9, ?7, ?8, ?10)").bind(b, tanggal, s, baru, tIsi, tCek, p.oleh, kini, "ralat: " + alasan.slice(0, 300), hari.dummy));
      st.push(env.DB.prepare("INSERT INTO lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, catatan, dummy) VALUES (?1, ?2, ?3, ?4, 'ralat', 'disetujui', ?5, ?6, ?7, ?8, ?9, ?10)").bind(b, tanggal, s, baru, tIsi, tCek, p.oleh, kini, alasan.slice(0, 500), hari.dummy));
    }
    const n = hari.ralat + 1, snap = SP.agregasi({tanggal_laporan: tanggal, prioritas: jsonDari(hari.prioritas) || [], pengecualian, kiriman, laporan: null, beku: lama, ralat: n, alasan, dikunci_oleh: topeng(p.oleh), dikunci_pada: kini});
    const perubahan = lama ? K.bedaSnapshot(lama, snap) : [];
    if (!perubahan.length) return gagal(400, "koreksi tidak mengubah angka apa pun di snapshot");
    const teks = JSON.stringify(snap), hash = await sha(teks);
    st.push(env.DB.prepare("INSERT INTO lkb_snapshot (bencana, tanggal_laporan, ralat, hash, isi, alasan, perubahan, oleh, waktu, dummy) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)").bind(b, tanggal, n, hash, teks, alasan, JSON.stringify(perubahan), p.oleh, kini, hari.dummy),
      env.DB.prepare("UPDATE lkb_hari SET ralat = ?1, hash = ?2 WHERE bencana = ?3 AND tanggal_laporan = ?4 AND ralat = ?5").bind(n, hash, b, tanggal, hari.ralat));
    try { await env.DB.batch(st); } catch (e) { const m = String(e?.message); if (/CHECK constraint/i.test(m)) return gagal(/length\(isi\)/i.test(m) ? 413 : 400, "ralat melanggar batas skema: " + m.slice(0, 160)); if (/UNIQUE|constraint/i.test(m)) return gagal(409, "ralat bersamaan dari orang lain; muat ulang"); throw e; }
    return json({ok: true, bencana: b, tanggal, ralat: n, hash, perubahan}, 201);
  }
  async function bacaSnapshot(env, req, url, kini, b, tanggal) {
    const p = await pelaku(env, req, kini); if (p instanceof Response) return p;
    if (p.tipe === "pemprov") return gagal(403, "snapshot hanya untuk staf dan admin");
    if (!K.tglSah(tanggal || "")) return gagal(400, "tanggal harus YYYY-MM-DD");
    const hari = await ambilHari(env, b, tanggal); if (!hari || hari.status === "terbuka") return gagal(404, "laporan hari itu belum dikunci");
    const q = url.searchParams.get("ralat"); if (q != null && !/^\d{1,3}$/.test(q)) return gagal(400, "ralat harus nomor");
    const n = q == null ? hari.ralat : Number(q);
    const r = await env.DB.prepare("SELECT ralat, hash, isi, alasan, perubahan, waktu FROM lkb_snapshot WHERE bencana = ? AND tanggal_laporan = ? AND ralat = ?").bind(b, tanggal, n).first();
    if (!r) return gagal(404, "nomor ralat tidak ada");
    const daftar = (await env.DB.prepare("SELECT ralat, hash, alasan, waktu, json_array_length(perubahan) berubah FROM lkb_snapshot WHERE bencana = ? AND tanggal_laporan = ? ORDER BY ralat").bind(b, tanggal).all()).results;
    const snap = JSON.parse(r.isi), utuh = (await sha(r.isi)) === r.hash;
    return json({bencana: b, tanggal, ralat: r.ralat, terbaru: r.ralat === hari.ralat, hash: r.hash, utuh, dikunci_pada: snap.dikunci_pada, alasan_ralat: r.alasan, perubahan: JSON.parse(r.perubahan), ralat_tersedia: daftar, snapshot: snap, teks_wa: spek(b).teksWA(snap)});
  }

  /* ---------------- dummy: satu hari contoh per bahaya, berlabel DUMMY (Super Admin). Tanpa angka dampak karangan: hanya teks contoh. */
  async function dummyIsi(env, kini, b, oleh) {
    const SP = spek(b), T = TANGGAL_DUMMY_BENCANA;
    if (await ambilHari(env, b, T)) return gagal(409, `tanggal ${T} sudah punya laporan ${K.BENCANA[b].nama.toLowerCase()} (dummy atau nyata); hapus dummy dulu bila itu dummy`);
    const L = await laporan(env, b); if (!L?.prov) return gagal(409, "berkas laporan otomatis tidak terbaca; dummy tidak bisa dibuat");
    let pr = pilihPrioritas(L, K.tanggalData(T)); if (!pr.length) pr = Object.keys(L.prov).filter(k => /^\d{2}$/.test(k)).sort().slice(0, 2);
    const st = [env.DB.prepare("INSERT INTO lkb_hari (bencana, tanggal_laporan, prioritas, dibuat, dummy) VALUES (?, ?, ?, ?, 1)").bind(b, T, JSON.stringify(pr), kini)];
    for (const kode of pr) {
      const sumber = "prov:" + kode, {isi, galat} = SP.normalisasi(sumber, {ringkasan: `Contoh (DUMMY): laporan provinsi ${namaProv(L, kode)} untuk uji tampilan, bukan data kejadian.`, catatan: "DUMMY"}, T, true);
      if (galat.length) throw new Error("dummy bencana tidak sah: " + JSON.stringify(galat[0]));
      const tIsi = JSON.stringify(isi), tCek = JSON.stringify(SP.cek(sumber, isi));
      st.push(env.DB.prepare("INSERT INTO lkb_kiriman (bencana, tanggal_laporan, sumber, status, versi, isi, cek, pengirim, diubah, dikirim, verif_oleh, verif_pada, dummy) VALUES (?1, ?2, ?3, 'disetujui', 1, ?4, ?5, ?6, ?7, ?7, ?6, ?7, 1)").bind(b, T, sumber, tIsi, tCek, oleh, kini),
        env.DB.prepare("INSERT INTO lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, dummy) VALUES (?1, ?2, ?3, 1, 'kirim', 'terkirim', ?4, ?5, ?6, ?7, 1)").bind(b, T, sumber, tIsi, tCek, oleh, kini),
        env.DB.prepare("INSERT INTO lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi, status, isi, cek, oleh, waktu, dummy) VALUES (?1, ?2, ?3, 1, 'setujui', 'disetujui', ?4, ?5, ?6, ?7, 1)").bind(b, T, sumber, tIsi, tCek, oleh, kini));
    }
    await env.DB.batch(st);
    return json({ok: true, bencana: b, tanggal: T, kiriman: pr.length}, 201);
  }
  async function dummyHapus(env, b) {
    const n = await env.DB.prepare("SELECT (SELECT count(*) FROM lkb_hari WHERE dummy = 1 AND bencana = ?1) hari, (SELECT count(*) FROM lkb_kiriman WHERE dummy = 1 AND bencana = ?1) kiriman, (SELECT count(*) FROM lkb_snapshot WHERE dummy = 1 AND bencana = ?1) snapshot").bind(b).first();
    await env.DB.batch(["lkb_snapshot", "lkb_versi", "lkb_kiriman", "lkb_hari"].map(t => env.DB.prepare(`DELETE FROM ${t} WHERE dummy = 1 AND bencana = ?`).bind(b)));
    return json({ok: true, bencana: b, ...n});
  }
  async function dummy(env, req, kini, b) {
    const mod = await superOK(env, req); if (!mod) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
    const bd = await bacaBody(req, 512); if (bd.galat) return gagal(bd.status || 400, bd.galat);
    if (bd.o.aksi === "isi") return dummyIsi(env, kini, b, mod);
    if (bd.o.aksi === "hapus") return dummyHapus(env, b);
    return gagal(400, "aksi harus isi/hapus");
  }

  return {
    hari: (env, req, url, kini, b) => bacaHari(env, req, url, kini, b), kiriman: (env, req, url, kini, b) => bacaKiriman(env, req, url, kini, b),
    draf: (env, req, url, kini, b) => simpan(env, req, kini, b, false), kirim: (env, req, url, kini, b) => simpan(env, req, kini, b, true),
    verifikasi: (env, req, url, kini, b) => verifikasi(env, req, kini, b), prioritas: (env, req, url, kini, b) => ubahPrioritas(env, req, kini, b),
    kunci: (env, req, url, kini, b) => kunci(env, req, kini, b), ralat: (env, req, url, kini, b) => ralat(env, req, kini, b),
    snapshot: (env, req, url, kini, b, tanggal) => bacaSnapshot(env, req, url, kini, b, tanggal), dummy: (env, req, url, kini, b) => dummy(env, req, kini, b),
  };
}
