/* Modul Pegawai dan Relawan Lapangan, tahap C (data/kajian-bnpb/lapangan/KONTRAK-TAHAP-C.md, ALUR A10, ALGORITMA §8):
   gerbang WA menarik antrean wa_antre dan melapor hasil, panggilan relawan (SIAP/TIDAK <kode>), pesan penugasan.
   Skema: migrations/0101_lapangan_panggil.sql. Pesan WA HANYA lewat wa_antre; tidak ada balasan langsung ke pengirim.
   Penjaga rute gateway: header x-wa-kunci (sama dengan WA_KUNCI di src/wa.js). Rute panel dijaga di src/lapangan_panel.js.
   Satu panggilan = satu relawan_permintaan (id sama), penerima yang menjawab SIAP jadi lp_anggota + relawan_penugasan 'diterima' (LP-041).
   ponytail: urutan kandidat = kab sama, pelatihan berlaku, jam layanan 90 hari paling sedikit; jarak pusat kab belum dipakai (butuh tabel centroid kab). */
import {gagal, json, acak, bacaBody, sha, bersihTeks} from "./worker.js";
import {tx, num} from "./posko.js";
import {wilayahStaf} from "./staf.js";
import {laju} from "./bnpb.js";
import {tanggalWIB, awalHariWIB, KONDISI, KONDISI_API, KONDISI_BANJIR} from "./lapangan_konst.js";
import {salinOrang} from "./lapangan.js";   // impor melingkar aman: hanya dipanggil saat permintaan

const MENIT = 60e3, JAM = 3600e3, HARI = 24 * JAM, RE_ID = /^[0-9a-f]{16}$/, RE_KEAHLIAN = /^[a-z_]{2,30}$/;
const HURUF_KODE = "ABCDEFGHJKLMNPQRSTUVWXYZ";   // tanpa I dan O (mudah tertukar dengan 1 dan 0)
const PLAFON_PENERIMA = 300, PLAFON_BALAS_GLOBAL = 5000, TARIK_ULANG_MS = 10 * MENIT, MAKS_PERCOBAAN = 3, MAKS_TARIK = 20, BAGIAN = 90;
const RE_BALAS = /^\s*(SIAP|TIDAK)\s+([A-Za-z]{6})\s*[.!]?\s*$/i;
const dalamBagian = (larik, n) => Array.from({length: Math.ceil(larik.length / n)}, (_, i) => larik.slice(i * n, i * n + n));
const kodeAcak = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), b => HURUF_KODE[b % HURUF_KODE.length]).join("");
const jamWIB = ms => `${tanggalWIB(ms)} ${new Date(ms + 7 * JAM).toISOString().slice(11, 16)} WIB`;
/* dummy ikut tugas/relawan contoh: pesan contoh tidak pernah ditarik gerbang (antre() hanya menarik dummy = 0) */
const antreWa = (env, tujuan, pesan, jenis, rujukan, kini, dummy = 0) => env.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, rujukan, status, percobaan, dibuat, dummy) VALUES (?, ?, ?, ?, ?, 'antre', 0, ?, ?)")
  .bind(acak(8), tujuan, pesan.slice(0, 1500), jenis, rujukan, kini, dummy ? 1 : 0);

/* pesan penugasan (LP-022/040): dipakai panel saat anggota ditambahkan dan balas() saat SIAP; tanpa kode pribadi, hanya tautan layar /petugas */
export const pesanPenugasan = (t, nama) => `Penugasan Lapangan BNPB untuk ${nama}: ${t.judul}${t.wilayah_teks ? `, ${t.wilayah_teks}` : ""}. Periode ${tanggalWIB(t.mulai)} sampai ${tanggalWIB(t.selesai)} WIB. Titik tugas ${t.lat}, ${t.lon}.`
  + `${t.renlap_url ? ` Renlap: ${t.renlap_url}.` : ""} Absen dan logbook harian lewat tautan pribadimu di https://centurisk97.id/petugas`;
export const antrePenugasan = (env, t, o, kini) => antreWa(env, o.wa, pesanPenugasan(t, o.nama), "penugasan", o.id, kini, t.dummy || o.dummy);

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
      SELECT id FROM wa_antre WHERE status = 'antre' AND dummy = 0 AND percobaan < ?3 AND (dikirim IS NULL OR dikirim <= ?2) ORDER BY dibuat, id LIMIT ${MAKS_TARIK}) RETURNING id, tujuan, pesan, jenis`)
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
  const kuota = num(o.kuota, 1, 100, true), jam = num(o.batas_jam, 1, 72, true);
  let pesan = tx(o.pesan, 300);
  if (kuota == null || Number.isNaN(kuota)) return gagal(400, "kuota bilangan bulat 1 sampai 100");
  if (jam == null || Number.isNaN(jam)) return gagal(400, "batas_jam bilangan bulat 1 sampai 72");
  if (pesan === undefined) return gagal(400, "pesan maksimal 300 karakter");
  if (pesan) { const bt = bersihTeks(pesan, 300); if (bt.galat) return gagal(400, "pesan: " + bt.galat); pesan = bt.teks || null; }   // tautan dan nomor HP dibuang: pesan ini dikirim massal atas nama BNPB
  const w = wilayahStaf(req);
  if (w.length && !w.includes(o.prov)) return gagal(403, "provinsi di luar wilayah staf ini");
  const t = await tugasTerlihat(env, req, o.tugas_id); if (!t) return gagal(404, "tugas tidak ditemukan");
  if (t.selesai <= kini) return gagal(409, "tugas sudah berakhir");
  /* plafon penerima: 300 per jam per moderator (jumlah baris penerima dari panggilan buatannya), selain 20 panggilan per jam di atas */
  const terpakai = (await env.DB.prepare("SELECT count(*) n FROM lp_panggil_penerima n JOIN lp_panggil p ON p.id = n.panggil_id WHERE p.dibuat_oleh = ? AND p.dibuat > ?").bind(String(mod).slice(0, 64), kini - JAM).first()).n;
  if (terpakai >= PLAFON_PENERIMA) return gagal(429, `batas penerima panggilan: ${PLAFON_PENERIMA} per jam per moderator sudah tercapai`, {"retry-after": "3600"});
  const batas = kini + jam * JAM, id = acak(8), kah = JSON.stringify(o.keahlian), hari = tanggalWIB(kini);
  /* kandidat: siap_tugas, nomor WA ada, provinsi sama (atau bersedia luar provinsi), keahlian relawan ATAU penanda orang_keahlian beririsan; ALGORITMA §8 */
  const {results: cand} = await env.DB.prepare(`SELECT r.id, r.wa,
      (SELECT coalesce(sum(j.menit), 0) FROM relawan_jam j WHERE j.relawan_id = r.id AND j.masuk >= ?5) jam,
      (SELECT count(*) FROM relawan_pelatihan p WHERE p.relawan_id = r.id AND (p.berlaku_sampai IS NULL OR p.berlaku_sampai >= ?6)) latih
    FROM relawan r WHERE r.status = 'siap_tugas' AND r.anonim = 0 AND r.wa IS NOT NULL AND r.dummy = ?7 AND (r.prov = ?1 OR r.luar_provinsi = 1)
      AND (EXISTS (SELECT 1 FROM json_each(r.keahlian) WHERE value IN (SELECT value FROM json_each(?2)))
        OR EXISTS (SELECT 1 FROM orang x JOIN orang_keahlian k ON k.orang_id = x.id WHERE x.relawan_id = r.id AND x.status = 'aktif' AND k.keahlian IN (SELECT value FROM json_each(?2))))
    ORDER BY (r.kab = ?3) DESC, (r.prov = ?1) DESC, latih > 0 DESC, jam, r.id LIMIT ?4`).bind(o.prov, kah, kab ?? "", Math.min(kuota * 2, PLAFON_PENERIMA - terpakai), kini - 90 * HARI, hari, t.dummy ? 1 : 0).all();
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
        antreWa(env, c.wa, susunPesan(c.kode), "panggil", `${id}.${c.id}`, kini, t.dummy)]));
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
  const m = RE_BALAS.exec(String(teks ?? "")); if (!m) return balasKondisi(env, dari, teks, kini);   // LP-022: API <kondisi> <kode> / GENANGAN <cm> <kode>
  /* laju per NOMOR dulu: IP di sini milik gateway (semua balasan satu IP), jadi ember per IP bisa dibungkam satu orang. Plafon global tinggi hanya jaring pengaman. */
  const lj = await laju(env, await sha(`${env.IP_SALT}|wa|${dari}`), "lapangan.balas_no", [[JAM, 20]], kini) ?? await laju(env, "global", "lapangan.balas_semua", [[JAM, PLAFON_BALAS_GLOBAL]], kini);
  if (lj) return lj;
  const aksi = m[1].toUpperCase(), kode = m[2].toUpperCase(), tolak = alasan => json({ok: true, balas: aksi.toLowerCase(), diterima: false, alasan});
  let n;
  try {
    n = await env.DB.prepare(`SELECT n.panggil_id, n.relawan_id, n.status, p.tugas_id, p.kuota, p.batas, p.status pstatus, r.wa, r.nama, r.status rstatus, r.anonim, r.dummy, t.selesai, t.dummy tdummy
      FROM lp_panggil_penerima n JOIN lp_panggil p ON p.id = n.panggil_id JOIN lp_tugas t ON t.id = p.tugas_id JOIN relawan r ON r.id = n.relawan_id WHERE n.kode_balas = ?`).bind(kode).first();
  } catch (e) { if (/no such table/i.test(e?.message || "")) return tolak("modul belum aktif"); throw e; }
  /* kode tak dikenal, atau milik nomor lain: ditolak sama rupa, tanpa membocorkan mana yang benar */
  if (!n || !n.wa || n.wa !== dari || n.anonim) return tolak("kode tidak berlaku untuk nomor ini");
  if (n.status === "siap" || n.status === "tidak") return tolak("sudah dibalas");
  const dum = n.dummy || n.tdummy, kabar = pesan => antreWa(env, n.wa, pesan, "panggil_info", `${n.panggil_id}.${n.relawan_id}`, kini, dum);
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
  /* dari sini sampai batch: galat apa pun (salinOrang, baca, batch) mengembalikan status ke semula, jadi tidak pernah "siap" tanpa anggota; relawan bisa membalas ulang */
  try {
  await salinOrang(env, n.relawan_id, kini);
  const o = await env.DB.prepare("SELECT id, nama, wa FROM orang WHERE relawan_id = ?").bind(n.relawan_id).first();
  const t = await env.DB.prepare("SELECT judul, wilayah_teks, renlap_url, lat, lon, mulai, selesai, dummy FROM lp_tugas WHERE id = ?").bind(n.tugas_id).first();
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO lp_anggota (tugas_id, orang_id, peran) VALUES (?, ?, 'anggota')").bind(n.tugas_id, o.id),
    env.DB.prepare("INSERT INTO relawan_penugasan (id, permintaan_id, relawan_id, status, asuransi, dibuat, diubah, oleh, dummy) VALUES (?, ?, ?, 'diterima', 'belum', ?, ?, 'wa', (SELECT dummy FROM lp_panggil WHERE id = ?)) ON CONFLICT (permintaan_id, relawan_id) DO NOTHING")
      .bind(acak(8), n.panggil_id, n.relawan_id, kini, kini, n.panggil_id),
    env.DB.prepare("UPDATE relawan SET status = 'ditugaskan', diubah = ? WHERE id = ? AND status = 'siap_tugas'").bind(kini, n.relawan_id),
    antreWa(env, n.wa, pesanPenugasan(t, o.nama), "penugasan", o.id, kini, dum)]);
  } catch (e) {   // batch D1 atomik, tetapi status siap sudah tertulis: kembalikan supaya tidak siap tanpa anggota
    await env.DB.prepare("UPDATE lp_panggil_penerima SET status = ?, waktu = ? WHERE panggil_id = ? AND relawan_id = ? AND status = 'siap'").bind(n.status, kini, n.panggil_id, n.relawan_id).run().catch(() => {});
    throw e;
  }
  /* kuota terpenuhi: panggilan penuh; yang belum menjawab diberi tahu (yang pesannya belum terkirim dibatalkan saja) */
  const {siap} = await env.DB.prepare("SELECT count(*) siap FROM lp_panggil_penerima WHERE panggil_id = ? AND status = 'siap'").bind(n.panggil_id).first();
  if (siap >= n.kuota) {
    const {results: sisa} = await env.DB.prepare("SELECT n.relawan_id, n.status, r.wa FROM lp_panggil_penerima n JOIN relawan r ON r.id = n.relawan_id WHERE n.panggil_id = ? AND n.status IN ('antre', 'terkirim')").bind(n.panggil_id).all();
    await env.DB.batch([env.DB.prepare("UPDATE lp_panggil SET status = 'penuh' WHERE id = ? AND status = 'buka'").bind(n.panggil_id),
      env.DB.prepare("UPDATE lp_panggil_penerima SET status = 'penuh', waktu = ? WHERE panggil_id = ? AND status IN ('antre', 'terkirim')").bind(kini, n.panggil_id),
      env.DB.prepare("DELETE FROM wa_antre WHERE jenis = 'panggil' AND status = 'antre' AND rujukan LIKE ?").bind(`${n.panggil_id}.%`),
      ...sisa.filter(s => s.status === "terkirim" && s.wa).map(s => antreWa(env, s.wa, "Terima kasih, kuota relawan untuk panggilan BNPB ini sudah terpenuhi.", "panggil_info", `${n.panggil_id}.${s.relawan_id}`, kini, dum))]);
  }
  return json({ok: true, balas: "siap", diterima: true});
}

/* ================================================================ LP-022 sisa: tanya kondisi lapangan harian (cron 16.05 WIB, tanpa jadwal baru, tanpa tabel baru)
   Kode balas tidak disimpan sebagai kolom (muncul hanya di teks wa_antre.pesan, dibersihkan 24/72 jam): sha(IP_SALT|orang|tugas|hari) jadi 6 huruf, per orang per tugas per hari WIB. Balasan dicocokkan ke kandidat
   (anggota tugas aktif yang wa-nya = pengirim), jadi kode hanya sah untuk nomor pemiliknya. Dedup: satu wa_antre jenis tanya_kondisi (rujukan = orang.id) per orang per hari.
   Hasil = kondisi di logbook hari itu (dibuat minimal, tanpa foto) + lapangan_label terverifikasi = 0: tetap harus ditandai peninjau. Dummy tidak pernah ditanya dan tidak sah membalas. */
const RE_KONDISI = /^\s*(?:API\s+(MENYALA|BARA|PADAM|BUKAN)|GENANGAN\s+(\d{1,6}))\s+([A-Za-z]{6})\s*[.!]?\s*$/i;
const API_NILAI = {MENYALA: "menyala", BARA: "bara", PADAM: "padam", BUKAN: "bukan_api"};
const jenisKondisi = b => b === "karhutla" ? "api" : /^banjir/.test(b) ? "banjir" : null;
const kodeKondisi = async (env, oid, tid, hari) => {
  const h = await sha(`${env.IP_SALT}|kondisi|${oid}|${tid}|${hari}`);
  return Array.from({length: 6}, (_, i) => HURUF_KODE[parseInt(h.slice(i * 2, i * 2 + 2), 16) % HURUF_KODE.length]).join("");
};
const susunTanya = (a, k) => `Lapangan BNPB, ${a.nama}: bagaimana kondisi di titik tugas "${a.judul}" hari ini? `
  + (jenisKondisi(a.bencana) === "api" ? `Balas satu: API MENYALA ${k} / API BARA ${k} / API PADAM ${k} / API BUKAN ${k}.` : `Balas tinggi genangan dalam cm, mis. GENANGAN 30 ${k} (0 bila tidak ada).`)
  + " Logbook lengkap dan foto: https://centurisk97.id/petugas";

export async function tanyaKondisi(env, kini) {
  if (!env.IP_SALT) return {n: 0};
  const hari = tanggalWIB(kini), a0 = awalHariWIB(hari);
  const {results} = await env.DB.prepare(`SELECT o.id oid, o.wa, o.nama, t.id tid, t.judul, t.bencana FROM lp_anggota g JOIN orang o ON o.id = g.orang_id JOIN lp_tugas t ON t.id = g.tugas_id
    WHERE t.mulai < ?2 AND t.selesai >= ?1 AND t.dummy = 0 AND o.dummy = 0 AND o.status = 'aktif' AND o.wa IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM lp_logbook l WHERE l.orang_id = o.id AND l.tugas_id = t.id AND l.tanggal = ?3)
      AND NOT EXISTS (SELECT 1 FROM wa_antre w WHERE w.jenis = 'tanya_kondisi' AND w.rujukan = o.id AND w.dibuat >= ?1)
    ORDER BY o.id, t.mulai, t.id LIMIT 1000`).bind(a0, a0 + HARI, hari).all();
  const satuPerOrang = new Map();
  for (const r of results) if (jenisKondisi(r.bencana) && !satuPerOrang.has(r.oid)) satuPerOrang.set(r.oid, r);
  const stmt = [];
  for (const a of satuPerOrang.values()) stmt.push(antreWa(env, a.wa, susunTanya(a, await kodeKondisi(env, a.oid, a.tid, hari)), "tanya_kondisi", a.oid, kini));
  for (const g of dalamBagian(stmt, BAGIAN)) await env.DB.batch(g);
  return {n: stmt.length};
}

async function balasKondisi(env, dari, teks, kini) {
  const m = RE_KONDISI.exec(String(teks ?? "")); if (!m || !env.IP_SALT) return null;
  const lj = await laju(env, await sha(`${env.IP_SALT}|wa|${dari}`), "lapangan.balas_no", [[JAM, 20]], kini);
  if (lj) return lj;
  const tolak = alasan => json({ok: true, balas: "kondisi", diterima: false, alasan}), hari = tanggalWIB(kini), a0 = awalHariWIB(hari), kode = m[3].toUpperCase();
  let cand;
  try {
    cand = (await env.DB.prepare(`SELECT o.id oid, t.id tid, t.bencana, t.lat, t.lon FROM orang o JOIN lp_anggota g ON g.orang_id = o.id JOIN lp_tugas t ON t.id = g.tugas_id
      WHERE o.wa = ?1 AND o.status = 'aktif' AND o.dummy = 0 AND t.dummy = 0 AND t.mulai < ?3 AND t.selesai >= ?2 LIMIT 20`).bind(dari, a0, a0 + HARI).all()).results;
  } catch (e) { if (/no such table/i.test(e?.message || "")) return tolak("modul belum aktif"); throw e; }
  if (cand.length) { const g = await laju(env, "global", "lapangan.balas_semua", [[JAM, PLAFON_BALAS_GLOBAL]], kini); if (g) return g; }   // plafon global hanya untuk pengirim yang punya tugas
  let c = null;
  for (const x of cand) if (await kodeKondisi(env, x.oid, x.tid, hari) === kode) { c = x; break; }
  if (!c) return tolak("kode tidak berlaku untuk nomor ini");   // kode orang lain, nomor lain, kode lama, dan dummy: satu jawaban yang sama
  const jenis = jenisKondisi(c.bencana), nilai = {};
  if (m[1]) { if (jenis !== "api") return tolak("jenis balasan tidak sesuai bencana tugas"); nilai.kondisi_api = API_NILAI[m[1].toUpperCase()]; }
  else {
    if (jenis !== "banjir") return tolak("jenis balasan tidak sesuai bencana tugas");
    const [a, b] = KONDISI.angka.tinggi_genangan_cm, n = Number(m[2]);
    if (!Number.isInteger(n) || n < a || n > b) return tolak(`tinggi genangan harus ${a} sampai ${b} cm`);
    nilai.tinggi_genangan_cm = n;
  }
  const ada = await env.DB.prepare("SELECT id, kondisi FROM lp_logbook WHERE orang_id = ? AND tugas_id = ? AND tanggal = ?").bind(c.oid, c.tid, hari).first();
  let lama = {}; try { lama = ada ? JSON.parse(ada.kondisi) : {}; } catch { /* kondisi rusak: ditimpa */ }
  const kondisi = {...lama, ...nilai}, lbId = ada?.id ?? acak(8), kunci = jenis === "api" ? KONDISI_API : KONDISI_BANJIR;
  const sah = ada && await env.DB.prepare("SELECT 1 FROM lapangan_label WHERE sumber_id = ? AND jenis = ? AND terverifikasi = 1").bind(lbId, jenis).first();
  if (sah) return tolak("kondisi ini sudah diverifikasi peninjau");
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO lp_logbook (id, orang_id, tugas_id, tanggal, kegiatan, kendala, kebutuhan, kondisi, waktu, diubah, terkunci, dummy) VALUES (?, ?, ?, ?, 'pemantauan', '[]', '[]', ?, ?, ?, 0, 0)
      ON CONFLICT (orang_id, tugas_id, tanggal) DO UPDATE SET kondisi = excluded.kondisi, diubah = excluded.diubah`).bind(lbId, c.oid, c.tid, hari, JSON.stringify(kondisi), kini, kini),
    /* label lama (tugas_api_id, jarak_tugas_m, lat/lon foto) dipertahankan: nilai digabung, lat/lon tidak diganti */
    env.DB.prepare("INSERT INTO lapangan_label (id, sumber_id, jenis, nilai, lat, lon, waktu, terverifikasi, dummy) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0) ON CONFLICT (sumber_id, jenis) DO UPDATE SET nilai = json_patch(lapangan_label.nilai, excluded.nilai), waktu = excluded.waktu")
      .bind(acak(8), lbId, jenis, JSON.stringify(Object.fromEntries(kunci.filter(k => k in kondisi).map(k => [k, kondisi[k]]))), c.lat, c.lon, kini)]);
  return json({ok: true, balas: "kondisi", diterima: true});
}

export const RUTE_GATEWAY_WA = {
  "GET /api/petugas/wa/antre": (env, req, url, kini) => antre(env, req, kini),
  "POST /api/petugas/wa/hasil": (env, req, url, kini) => hasil(env, req, kini),
};
