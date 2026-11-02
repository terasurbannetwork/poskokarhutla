/* Modul Pegawai dan Relawan Lapangan, tahap C (data/kajian-bnpb/lapangan/KONTRAK-TAHAP-C.md, ALUR A10, ALGORITMA §8):
   gerbang WA menarik antrean wa_antre dan melapor hasil, panggilan relawan (SIAP/TIDAK <kode>), pesan penugasan.
   Skema: migrations/0099_lapangan_panggil.sql. Pesan WA HANYA lewat wa_antre; tidak ada balasan langsung ke pengirim.
   Penjaga rute gateway: header x-wa-kunci (sama dengan WA_KUNCI di src/wa.js). Rute panel dijaga di src/lapangan_panel.js.
   Satu panggilan = satu relawan_permintaan (id sama), penerima yang menjawab SIAP jadi lp_anggota + relawan_penugasan 'diterima' (LP-041).
   ponytail: urutan kandidat = kab sama, pelatihan berlaku, jam layanan 90 hari paling sedikit; jarak pusat kab belum dipakai (butuh tabel centroid kab). */
import {gagal, json, acak, bacaBody, sha, ipHash} from "./worker.js";
import {tx, num} from "./posko.js";
import {wilayahStaf} from "./staf.js";
import {laju, lajuIP} from "./bnpb.js";
import {tanggalWIB} from "./lapangan_konst.js";
import {salinOrang} from "./lapangan.js";   // impor melingkar aman: hanya dipanggil saat permintaan

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, RE_ID = /^[0-9a-f]{16}$/, RE_KEAHLIAN = /^[a-z_]{2,30}$/;
const HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // tanpa I dan O (mudah tertukar dengan 1 dan 0)
const TARIK_ULANG_MS = 10 * MENIT, MAKS_PERCOBAAN = 3, MAKS_TARIK = 20, BAGIAN = 90;
const RE_BALAS = /^\s*(SIAP|TIDAK)\s+([A-Za-z]{6})\s*[.!]?\s*$/i;
const dalamBagian = (larik, n) => Array.from({length: Math.ceil(larik.length / n)}, (_, i) => larik.slice(i * n, i * n + n));
const kodeAcak = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => HURUF_KODE[b % HURUF_KODE.length]).join("");
const jamWIB = ms => `${tanggalWIB(ms)} ${new Date(ms + 7 * JAM).toISOString().slice(11, 16)} WIB`;
const antreWa = (env, tujuan, pesan, jenis, rujukan, kini) => env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, 'antre', 0, ?, 0)")
  .bind(acak(8), tujuan, pesan.slice(0, 1500), jenis, rujukan, kini);

/* pesan penugasan (LP-022/040): dipakai panel saat anggota ditambahkan dan balas() saat SIAP; tanpa kode pribadi, hanya tautan layar /petugas */
export const pesanPenugasan = (t, nama) => `Penugasan Lapangan BNPB untuk ${nama}: ${t.judul}${t.wilayah_teks ? `, ${t.wilayah_teks}` : ""}. Periode ${tanggalWIB(t.mulai)} sampai ${tanggalWIB(t.selesai)} WIB. Titik tugas ${t.lat}, ${t.lon}.`
  + `${t.renlap_url ? ` Renlap: ${t.renlap_url}.` : ""} Absen dan logbook harian lewat tautan pribadimu di https://centurisk97.id/petugas`;
export const antrePenugasan = (env, t, o, kini) => antreWa(env, o.wa, pesanPenugasan(t, o.nama), "penugasan", o.id, kini);

/* ================================================================ gerbang WA: tarik antrean dan lapor hasil */
async function kunciWA(env, req) {
  if (!env.WA_KUNCI) return gagal(503, "gerbang WA belum dikonfigurasi");
  if (await sha(req.headers.get("x-wa-kunci") || "") !== await sha(env.WA_KUNCI)) return gagal(403, "kunci salah");
  return null;
}
/* satu UPDATE ... RETURNING: dua penarikan serentak tidak mengambil baris yang sama */
async function antre(env, req, kini) {
  const g = await kunciWA(env, req); if (g) return g;
  const {results} = await env.DB.prepare(`UPDATE wa_antre SET percobaan = percobaan + 1, dikirim = ?1 WHERE id IN (
      SELECT id FROM wa_antre WHERE status = 'antre' AND percobaan < ?3 AND (dikirim IS NULL OR dikirim <= ?2) ORDER BY dibuat, id LIMIT ${MAKS_TARIK}) RETURNING id, tujuan, pesan, jenis`)
    .bind(kini, kini - TARIK_ULANG_MS, MAKS_PERCOBAAN).all();
  return json({ok: true, pesan: results});   // dikirim = waktu tarik selagi status antre (tanda "jangan ditarik ulang 10 menit")
}
async function hasil(env, req, kini) {
  const g = await kunciWA(env, req); if (g) return g;
  const b = await bacaBody(req, 8192); if (b.galat) return gagal(b.status || 400, b.galat);
  const h = b.o.hasil;
  if (!Array.isArray(h) || !h.length || h.length > 50 || h.some(x => !x || typeof x.id !== "string" || !RE_ID.test(x.id) || typeof x.ok !== "boolean")) return gagal(400, "hasil harus larik 1 sampai 50 {id (16 hex), ok (boolean), galat?}");
  let n = 0;
  for (const x of h) {
    /* hanya baris yang masih antre: hasil ulang atau id asing tidak mengubah apa pun */
    const r = x.ok
      ? await env.DB.prepare("UPDATE wa_antre SET status = 'dikirim', dikirim = ? WHERE id = ? AND status = 'antre' RETURNING jenis, rujukan").bind(kini, x.id).first()
      : await env.DB.prepare("UPDATE wa_antre SET status = CASE WHEN percobaan >= ? THEN 'gagal' ELSE status END WHERE id = ? AND status = 'antre' RETURNING jenis, rujukan, status").bind(MAKS_PERCOBAAN, x.id).first();
    if (!r) continue;
    n++;
    if (r.jenis !== "panggil" || !r.rujukan) continue;
    if (x.ok || r.status === "gagal") {
      const [pid, rid] = r.rujukan.split(".");
      try { await env.DB.prepare("UPDATE lp_panggil_penerima SET status = ? WHERE panggil_id = ? AND relawan_id = ? AND status = 'antre'").bind(x.ok ? "terkirim" : "gagal", pid, rid).run(); }
      catch (e) { if (!/no such table/i.test(e?.message || "")) throw e; }
    }
  }
  return json({ok: true, n});
}

/* ================================================================ panggilan relawan (panel) */
/* tugas yang terlihat staf: staf berwilayah hanya tugas yang punya anggota di provinsinya (pola tugasDaftar) */
export const tugasTerlihat = (env, req, id) => {
  const w = wilayahStaf(req);
  return env.DB.prepare(`SELECT t.id, t.judul, t.bencana, t.lat, t.lon, t.wilayah_teks, t.renlap_url, t.mulai, t.selesai, t.dummy FROM lp_tugas t WHERE t.id = ?1
    AND (?2 = '[]' OR EXISTS (SELECT 1 FROM lp_anggota a JOIN orang o ON o.id = a.orang_id WHERE a.tugas_id = t.id AND o.prov IN (SELECT value FROM json_each(?2))))`).bind(id, JSON.stringify(w)).first();
};

export async function panggilBuat(env, req, mod, kini) {
  const lj = await laju(env, mod, "lapangan.panggil", [[JAM, 20]], kini); if (lj) return lj;
  const b = await bacaBody(req, 4096); if (b.galat) return gagal(b.status || 400, b.galat);
  const o = b.o;
  if (typeof o.tugas_id !== "string" || !RE_ID.test(o.tugas_id)) return gagal(400, "tugas_id tidak sah");
  if (!Array.isArray(o.keahlian) || !o.keahlian.length || o.keahlian.length > 5 || o.keahlian.some(k => typeof k !== "string" || !RE_KEAHLIAN.test(k)) || new Set(o.keahlian).size !== o.keahlian.length) return gagal(400, "keahlian harus 1 sampai 5 kata huruf kecil tanpa ulang (mis. pemadaman, drone)");
  if (typeof o.prov !== "string" || !/^\d{2}$/.test(o.prov)) return gagal(400, "prov harus kode 2 angka");
  const kab = tx(o.kab, 60); if (kab === undefined || (kab && kab.length < 2)) return gagal(400, "kab 2 sampai 60 karakter");
  const kuota = num(o.kuota, 1, 100, true), jam = num(o.batas_jam, 1, 72, true), pesan = tx(o.pesan, 300);
  if (kuota == null || Number.isNaN(kuota)) return gagal(400, "kuota bilangan bulat 1 sampai 100");
  if (jam == null || Number.isNaN(jam)) return gagal(400, "batas_jam bilangan bulat 1 sampai 72");
  if (pesan === undefined) return gagal(400, "pesan maksimal 300 karakter");
  const w = wilayahStaf(req);
  if (w.length && !w.includes(o.prov)) return gagal(403, "provinsi di luar wilayah staf ini");
  const t = await tugasTerlihat(env, req, o.tugas_id); if (!t) return gagal(404, "tugas tidak ditemukan");
  if (t.selesai <= kini) return gagal(409, "tugas sudah berakhir");
  const batas = kini + jam * JAM, id = acak(8), kah = JSON.stringify(o.keahlian), hari = tanggalWIB(kini);
  /* kandidat: siap_tugas, nomor WA ada, provinsi sama (atau bersedia luar provinsi), keahlian relawan ATAU penanda orang_keahlian beririsan; ALGORITMA §8 */
  const {results: cand} = await env.DB.prepare(`SELECT r.id, r.wa,
      (SELECT coalesce(sum(j.menit), 0) FROM relawan_jam j WHERE j.relawan_id = r.id AND j.masuk >= ?5) jam,
      (SELECT count(*) FROM relawan_pelatihan p WHERE p.relawan_id = r.id AND (p.berlaku_sampai IS NULL OR p.berlaku_sampai >= ?6)) latih
    FROM relawan r WHERE r.status = 'siap_tugas' AND r.anonim = 0 AND r.wa IS NOT NULL AND r.dummy = ?7 AND (r.prov = ?1 OR r.luar_provinsi = 1)
      AND (EXISTS (SELECT 1 FROM json_each(r.keahlian) WHERE value IN (SELECT value FROM json_each(?2)))
        OR EXISTS (SELECT 1 FROM orang x JOIN orang_keahlian k ON k.orang_id = x.id WHERE x.relawan_id = r.id AND x.status = 'aktif' AND k.keahlian IN (SELECT value FROM json_each(?2))))
    ORDER BY (r.kab = ?3) DESC, (r.prov = ?1) DESC, latih > 0 DESC, jam, r.id LIMIT ?4`).bind(o.prov, kah, kab ?? "", kuota * 2, kini - 90 * HARI, hari, t.dummy ? 1 : 0).all();
  const susunPesan = k => `Panggilan relawan BNPB: ${t.judul}${kab ? `, ${kab}` : ""}. Butuh ${kuota} orang (${o.keahlian.join(", ")}).${pesan ? ` ${pesan}` : ""} Siap? Balas SIAP ${k}. Tidak bisa? Balas TIDAK ${k}. Batas ${jamWIB(batas)}.`;
  const dibuat = [
    env.DB.prepare("INSERT INTO relawan_permintaan (id, judul, bencana, prov, kab, lat, lon, butuh, mulai, selesai, status, catatan, dibuat, oleh, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?, ?, ?)")
      .bind(id, t.judul.slice(0, 120), t.bencana.slice(0, 40), o.prov, kab ?? "Seluruh provinsi", t.lat, t.lon, JSON.stringify(o.keahlian.map(k => ({keahlian: k, jumlah: kuota}))), tanggalWIB(t.mulai), tanggalWIB(t.selesai), pesan, kini, String(mod).slice(0, 64), t.dummy ? 1 : 0),
    env.DB.prepare("INSERT INTO lp_panggil (id, tugas_id, keahlian, prov, kab, kuota, batas, pesan, status, dibuat_oleh, dibuat, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'buka', ?, ?, ?)")
      .bind(id, t.id, kah, o.prov, kab, kuota, batas, pesan, String(mod).slice(0, 64), kini, t.dummy ? 1 : 0)];
  try { await env.DB.batch(dibuat); } catch (e) { if (/no such table/i.test(e?.message || "")) throw e; console.error("lapangan.panggil", String(e?.message).slice(0, 120)); return gagal(500, "panggilan gagal dibuat"); }
  const dipakai = new Set();
  const penerima = cand.map(c => { let k; do k = kodeAcak(); while (dipakai.has(k)); dipakai.add(k); return {...c, kode: k}; });
  for (const g of dalamBagian(penerima, BAGIAN)) {
    try {
      await env.DB.batch(g.flatMap(c => [
        env.DB.prepare("INSERT INTO lp_panggil_penerima (panggil_id, relawan_id, kode_balas, status, waktu) VALUES (?, ?, ?, 'antre', ?)").bind(id, c.id, c.kode, kini),
        antreWa(env, c.wa, susunPesan(c.kode), "panggil", `${id}.${c.id}`, kini)]));
    } catch (e) {
      if (!/UNIQUE/i.test(e?.message || "")) throw e;   // tabrakan kode acak (peluang ~1 dari 10 juta): bagian ini dilewati, panggilan tetap jalan untuk bagian lain
      console.error("lapangan.panggil", "tabrakan kode balas, satu bagian dilewati");
    }
  }
  console.log("lapangan.panggil", JSON.stringify({oleh: String(mod).slice(0, 64), panggil: id, tugas: t.id, penerima: penerima.length, waktu: kini}));
  return json({ok: true, id, penerima: penerima.length}, 201);
}

export async function panggilDaftar(env, req, url) {
  const tid = url.searchParams.get("tugas_id") || "";
  if (!RE_ID.test(tid)) return gagal(400, "tugas_id tidak sah");
  if (!await tugasTerlihat(env, req, tid)) return gagal(404, "tugas tidak ditemukan");
  const {results} = await env.DB.prepare(`SELECT p.id, p.kuota, p.status, p.batas,
      sum(n.status = 'siap') siap, sum(n.status = 'tidak') tidak, sum(n.status IN ('antre', 'terkirim')) antre
    FROM lp_panggil p LEFT JOIN lp_panggil_penerima n ON n.panggil_id = p.id WHERE p.tugas_id = ? GROUP BY p.id ORDER BY p.dibuat DESC, p.id LIMIT 50`).bind(tid).all();
  return json({ok: true, panggil: results.map(x => ({...x, siap: x.siap ?? 0, tidak: x.tidak ?? 0, antre: x.antre ?? 0}))});
}

/* ================================================================ balasan WA: SIAP/TIDAK <kode> (dipanggil src/wa.js SESUDAH x-wa-kunci diperiksa)
   null = bukan format balasan (wa.js meneruskan ke alur lama). Selain itu Response 200 {ok, balas, diterima, alasan?}: gerbang tidak perlu mengulang. */
export async function balas(env, req, dari, teks, kini) {
  const m = RE_BALAS.exec(String(teks ?? "")); if (!m) return null;
  const lj = await lajuIP(env, req, "lapangan.balas", [[JAM, 300]], kini) ?? await laju(env, await sha(`${env.IP_SALT}|wa|${dari}`), "lapangan.balas_no", [[JAM, 20]], kini);
  if (lj) return lj;
  const aksi = m[1].toUpperCase(), kode = m[2].toUpperCase(), tolak = alasan => json({ok: true, balas: aksi.toLowerCase(), diterima: false, alasan});
  let n;
  try {
    n = await env.DB.prepare(`SELECT n.panggil_id, n.relawan_id, n.status, p.tugas_id, p.kuota, p.batas, p.status pstatus, r.wa, r.nama, r.status rstatus, r.anonim, t.selesai
      FROM lp_panggil_penerima n JOIN lp_panggil p ON p.id = n.panggil_id JOIN lp_tugas t ON t.id = p.tugas_id JOIN relawan r ON r.id = n.relawan_id WHERE n.kode_balas = ?`).bind(kode).first();
  } catch (e) { if (/no such table/i.test(e?.message || "")) return tolak("modul belum aktif"); throw e; }
  /* kode tak dikenal, atau milik nomor lain: ditolak sama rupa, tanpa membocorkan mana yang benar */
  if (!n || !n.wa || n.wa !== dari || n.anonim) return tolak("kode tidak berlaku untuk nomor ini");
  if (n.status === "siap" || n.status === "tidak") return tolak("sudah dibalas");
  const kabar = pesan => antreWa(env, n.wa, pesan, "panggil_info", `${n.panggil_id}.${n.relawan_id}`, kini);
  if (aksi === "TIDAK") {
    const x = await env.DB.prepare("UPDATE lp_panggil_penerima SET status = 'tidak', waktu = ? WHERE panggil_id = ? AND relawan_id = ? AND status IN ('antre', 'terkirim')").bind(kini, n.panggil_id, n.relawan_id).run();
    return x.meta.changes ? json({ok: true, balas: "tidak", diterima: true}) : tolak("sudah dibalas");
  }
  if (n.pstatus === "tutup" || n.batas < kini || n.selesai <= kini || n.rstatus !== "siap_tugas") {
    await env.DB.batch([env.DB.prepare("UPDATE lp_panggil_penerima SET status = 'penuh', waktu = ? WHERE panggil_id = ? AND relawan_id = ? AND status IN ('antre', 'terkirim')").bind(kini, n.panggil_id, n.relawan_id),
      kabar("Panggilan relawan BNPB ini sudah ditutup. Terima kasih sudah bersedia.")]);
    return tolak(n.rstatus !== "siap_tugas" ? "relawan tidak berstatus siap tugas" : "panggilan ditutup atau lewat batas");
  }
  /* SIAP: satu UPDATE bersyarat menjaga kuota walau dua balasan datang bersamaan */
  const x = await env.DB.prepare(`UPDATE lp_panggil_penerima SET status = 'siap', waktu = ?1 WHERE panggil_id = ?2 AND relawan_id = ?3 AND status IN ('antre', 'terkirim')
    AND (SELECT status FROM lp_panggil WHERE id = ?2) = 'buka' AND (SELECT count(*) FROM lp_panggil_penerima WHERE panggil_id = ?2 AND status = 'siap') < (SELECT kuota FROM lp_panggil WHERE id = ?2)`)
    .bind(kini, n.panggil_id, n.relawan_id).run();
  if (!x.meta.changes) {
    await env.DB.batch([env.DB.prepare("UPDATE lp_panggil_penerima SET status = 'penuh', waktu = ? WHERE panggil_id = ? AND relawan_id = ? AND status IN ('antre', 'terkirim')").bind(kini, n.panggil_id, n.relawan_id),
      kabar("Terima kasih, kuota relawan untuk panggilan ini sudah terpenuhi.")]);
    return tolak("kuota penuh");
  }
  await salinOrang(env, n.relawan_id, kini);
  const o = await env.DB.prepare("SELECT id, nama, wa FROM orang WHERE relawan_id = ?").bind(n.relawan_id).first();
  const t = await env.DB.prepare("SELECT judul, wilayah_teks, renlap_url, lat, lon, mulai, selesai FROM lp_tugas WHERE id = ?").bind(n.tugas_id).first();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(n.tugas_id, o.id),
    env.DB.prepare("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, status, asuransi, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, 'diterima', 'belum', ?, ?, 'wa', (SELECT dummy FROM lp_panggil WHERE id = ?)) ON CONFLICT (permintaan_id, relawan_id) DO NOTHING")
      .bind(acak(8), n.panggil_id, n.relawan_id, kini, kini, n.panggil_id),
    env.DB.prepare("UPDATE relawan SET status = 'ditugaskan', diubah = ? WHERE id = ? AND status = 'siap_tugas'").bind(kini, n.relawan_id),
    antreWa(env, n.wa, pesanPenugasan(t, o.nama), "penugasan", o.id, kini)]);
  /* kuota terpenuhi: panggilan penuh; yang belum menjawab diberi tahu (yang pesannya belum terkirim dibatalkan saja) */
  const {siap} = await env.DB.prepare("SELECT count(*) siap FROM lp_panggil_penerima WHERE panggil_id = ? AND status = 'siap'").bind(n.panggil_id).first();
  if (siap >= n.kuota) {
    const {results: sisa} = await env.DB.prepare("SELECT n.relawan_id, n.status, r.wa FROM lp_panggil_penerima n JOIN relawan r ON r.id = n.relawan_id WHERE n.panggil_id = ? AND n.status IN ('antre', 'terkirim')").bind(n.panggil_id).all();
    await env.DB.batch([env.DB.prepare("UPDATE lp_panggil SET status = 'penuh' WHERE id = ? AND status = 'buka'").bind(n.panggil_id),
      env.DB.prepare("UPDATE lp_panggil_penerima SET status = 'penuh', waktu = ? WHERE panggil_id = ? AND status IN ('antre', 'terkirim')").bind(kini, n.panggil_id),
      env.DB.prepare("DELETE FROM wa_antre WHERE jenis = 'panggil' AND status = 'antre' AND rujukan LIKE ?").bind(`${n.panggil_id}.%`),
      ...sisa.filter(s => s.status === "terkirim" && s.wa).map(s => antreWa(env, s.wa, "Terima kasih, kuota relawan untuk panggilan BNPB ini sudah terpenuhi.", "panggil_info", `${n.panggil_id}.${s.relawan_id}`, kini))]);
  }
  return json({ok: true, balas: "siap", diterima: true});
}

export const RUTE_GATEWAY_WA = {
  "GET /api/petugas/wa/antre": (env, req, url, kini) => antre(env, req, kini),
  "POST /api/petugas/wa/hasil": (env, req, url, kini) => hasil(env, req, kini),
};
