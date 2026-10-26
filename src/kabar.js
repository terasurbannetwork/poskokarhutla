/* Kabar seketika (docs/bnpb/RENCANA-LANJUT.md §1.5): push + email SEKARANG untuk darurat regu, tugas level 3 baru, dan alarm Himawari,
   tanpa menunggu ringkasan 3 jam (src/push.js). Satu kejadian satu kabar per penerima: baris (kunci, penerima) di kabar_terkirim (0043)
   dicatat SESUDAH kirim berhasil (paling banyak sekali sukses); yang gagal masuk kabar_ulang (0045) dan dicoba lagi cron menit dengan jeda 1/5/15/60 menit, maks 5 percobaan (ulangiKabar).
   Penerima tanpa saluran yang sedang hidup (tanpa langganan push dan email mati) tidak dicatat, jadi tidak "habis" sebelum saluran dipasang. Email lewat Resend (src/ews.js), tetap mati selama pengirim @resend.dev.
   Isi hanya wilayah dan jenis kejadian: tanpa nama orang dan nomor telepon. Migrasi 0043/0040 belum diterapkan = dilewati rapi.
   ponytail: maks 40 penerima per kejadian (batas subrequest akun Free); push ke staf/admin belum ada karena langganan push hanya milik akun instansi,
   Posko pusat dikabari lewat email (staf pimpinan/pusdalops/koordalops + EMAIL_TO). */
import {siapPush, kirimKe, catatHasil, mati} from "./push.js";
import {emailAktif, kirimEmail} from "./ews.js";
import {esc} from "./ews_email.js";
import {PROV} from "./instansi.js";
import {sha} from "./worker.js";
import {labelBencana} from "./tugas_bencana.js";

const MAKS_PENERIMA = 40, MAKS_AKUN = 30, MENIT = 6e4, JAM = 36e5, BACKOFF_MNT = [1, 5, 15, 60], MAKS_COBA = 5, ASAL = "https://centurisk97.id";
const tanpaTabel = e => /no such (table|column): ?(main\.)?(kabar_terkirim|kabar_ulang|push_langganan|alarm_himawari|staf|instansi_akun)/i.test(String(e?.message || e));
const cakupanDari = a => { try { const c = JSON.parse(a.cakupan); return Array.isArray(c) ? c : []; } catch (e) { return []; } };   // cakupan rusak = tak mencakup apa pun, bukan menggagalkan putaran
const dalam = (a, prov, kab) => a.tingkat === "kab" ? prov === a.prov && String(kab).toLowerCase() === String(a.kab).toLowerCase() : cakupanDari(a).includes(prov);
export const tempat = (prov, kab, kec) => [kec, kab, PROV[prov]?.[1]].filter(Boolean).join(", ");

/* satu penerima, saluran yang diminta (Set "push"/"email") -> {ada, push, email, gagal: [saluran yang gagal]}.
   Push berhasil bila minimal satu perangkat menjawab 2xx atau semua langganan sudah mati (404/410, dibuang); jaringan/5xx/429 pada semua perangkat = gagal. Email gagal bila Resend menolak. */
async function kirimSatu(env, p, pesan, kanal, kini) {
  const o = {ada: false, push: 0, email: 0, gagal: []}, pushOn = siapPush(env) && kanal.has("push"), suratOn = emailAktif(env) && kanal.has("email");
  let subs = [];
  if (pushOn && p.akun) try { subs = (await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_langganan WHERE akun_id = ?").bind(p.akun).all()).results; } catch (e) { if (!tanpaTabel(e)) throw e; }
  const surel = suratOn && p.email ? p.email : null;
  if (!subs.length && !surel) return o;
  o.ada = true;
  if (subs.length) try {
    const hasil = await kirimKe(env, subs, {judul: pesan.judul, isi: pesan.isi, tag: "pb-kabar", url: pesan.url || "/instansi"}, "k" + String(p.akun).slice(0, 20), kini), baik = hasil.filter(h => h.status >= 200 && h.status < 300).length;
    o.push = baik; if (!baik && !hasil.every(h => mati(h.status))) o.gagal.push("push");
    const st = catatHasil(env, hasil, kini); if (st.length) await env.DB.batch(st);
  } catch (e) { console.error("kabar push", e?.message); o.gagal.push("push"); }
  if (surel) try {
    await kirimEmail(env, surel, {subject: pesan.judul, html: htmlKabar(pesan), text: `${pesan.judul}\n${pesan.isi}\n${ASAL}${pesan.url || "/instansi"}`}); o.email = 1;
  } catch (e) { console.error("kabar email", e?.message); o.gagal.push("email"); }
  return o;
}
const htmlKabar = pesan => `<p style="font:700 16px Arial,sans-serif;margin:0 0 8px">${esc(pesan.judul)}</p><p style="font:14px/1.5 Arial,sans-serif;margin:0 0 12px">${esc(pesan.isi)}</p><p style="font:14px Arial,sans-serif;margin:0"><a href="${esc(ASAL + (pesan.url || "/instansi"))}">Buka Centurisk97</a></p>`;
const adaTerkirim = async (env, kunci, penerima) => !!await env.DB.prepare("SELECT 1 x FROM kabar_terkirim WHERE kunci = ? AND penerima = ?").bind(kunci, penerima).first();
const selesai = (env, kunci, penerima, kini) => env.DB.prepare("INSERT OR IGNORE INTO kabar_terkirim (kunci, penerima, waktu) VALUES (?, ?, ?)").bind(kunci, penerima, kini);

/* pesan = {judul, isi, url}; penerima = [{id (kunci dedupe), akun?, email?}]. Kembali {push, email, tanpa_saluran, ulang} atau {lewat: alasan}.
   Urutan: sudah terkirim/antre ulang? lewati -> kirim -> BARU catat kabar_terkirim bila semua saluran berhasil; yang gagal masuk kabar_ulang (cron mencoba lagi, ulangiKabar).
   ponytail: dua pemanggil serentak untuk kunci+penerima yang sama bisa sama-sama mengirim (tak ada kunci sebelum kirim); kabar kita dipicu satu cron/satu permintaan per kejadian. */
export async function kabarkan(env, kunci, penerima, pesan, kini = Date.now()) {
  const o = {push: 0, email: 0, tanpa_saluran: 0, ulang: 0}, k = kunci.slice(0, 80), sudah = new Set();
  try {
    for (const p of penerima.slice(0, MAKS_PENERIMA)) {
      if (sudah.has(p.id)) continue; sudah.add(p.id);
      const pid = p.id.slice(0, 120);
      if (await adaTerkirim(env, k, pid)) continue;
      try { if (await env.DB.prepare("SELECT 1 x FROM kabar_ulang WHERE kunci = ? AND penerima = ?").bind(k, pid).first()) continue; } catch (e) { if (!tanpaTabel(e)) throw e; }
      const psn = {...pesan, ...(p.ganti || {})};   // penerima boleh punya url/isi sendiri (darurat: instansi ke /instansi, Posko pusat ke Meja Pantau)
      const r = await kirimSatu(env, p, psn, new Set(["push", "email"]), kini);
      if (!r.ada) { o.tanpa_saluran++; continue; }
      o.push += r.push; o.email += r.email;
      if (!r.gagal.length) { await selesai(env, k, pid, kini).run(); continue; }
      try {
        await env.DB.prepare("INSERT OR REPLACE INTO kabar_ulang (kunci, penerima, akun, email, pesan, kanal, percobaan, berikut, dibuat) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)")
          .bind(k, pid, p.akun || null, p.email || null, JSON.stringify(psn).slice(0, 4000), r.gagal.join(","), kini + BACKOFF_MNT[0] * MENIT, kini).run(); o.ulang++;
      } catch (e) { if (!tanpaTabel(e)) throw e; console.error("kabar gagal terkirim dan antrean ulang (0045) belum ada:", pid); }
    }
  } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
  return o;
}

/* cron menit: coba lagi kabar yang gagal (jatuh tempo), maks 8 penerima per putaran (subrequest akun Free). Berhasil -> kabar_terkirim + hapus antrean; gagal -> jeda lebih panjang; MAKS_COBA habis -> menyerah (dicatat, antrean dihapus). */
export async function ulangiKabar(env, kini = Date.now()) {
  const o = {coba: 0, terkirim: 0, menyerah: 0};
  try {
    const rows = (await env.DB.prepare("SELECT kunci, penerima, akun, email, pesan, kanal, percobaan FROM kabar_ulang WHERE berikut <= ? ORDER BY berikut LIMIT 8").bind(kini).all()).results;
    for (const r of rows) {
      o.coba++;
      const hapus = env.DB.prepare("DELETE FROM kabar_ulang WHERE kunci = ? AND penerima = ?").bind(r.kunci, r.penerima);
      if (await adaTerkirim(env, r.kunci, r.penerima)) { await hapus.run(); continue; }
      let pesan; try { pesan = JSON.parse(r.pesan); } catch (e) { await hapus.run(); continue; }
      if (pesan.kadaluarsa && kini > pesan.kadaluarsa) { await hapus.run(); o.kedaluwarsa = (o.kedaluwarsa || 0) + 1; continue; }   // kabar darurat basi: tidak dikirim berjam-jam kemudian
      const h = await kirimSatu(env, {id: r.penerima, akun: r.akun, email: r.email}, pesan, new Set(r.kanal.split(",")), kini);
      if (!h.ada) { await hapus.run(); continue; }   // saluran sudah tidak ada (langganan mati, email dimatikan): tak ada yang bisa dikirim
      if (!h.gagal.length) { await env.DB.batch([selesai(env, r.kunci, r.penerima, kini), hapus]); o.terkirim++; continue; }
      if (r.percobaan + 1 > MAKS_COBA) { await hapus.run(); o.menyerah++; console.error("kabar menyerah setelah", r.percobaan, "percobaan:", r.kunci, r.penerima); continue; }
      await env.DB.prepare("UPDATE kabar_ulang SET percobaan = ?, kanal = ?, berikut = ? WHERE kunci = ? AND penerima = ?")
        .bind(r.percobaan + 1, h.gagal.join(","), kini + BACKOFF_MNT[Math.min(r.percobaan, BACKOFF_MNT.length - 1)] * MENIT, r.kunci, r.penerima).run();
    }
  } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0045 belum diterapkan"}; throw e; }
  return o;
}

/* akun instansi aktif yang wilayahnya memuat (prov, kab) */
const semuaAkun = async env => (await env.DB.prepare("SELECT id, email, tingkat, prov, kab, cakupan FROM instansi_akun WHERE status = 'aktif' AND dummy = 0 LIMIT 500").all()).results;
const jadiPenerima = a => ({id: "akun:" + a.id, akun: a.id, email: a.email});
/* Posko pusat: staf pimpinan/pusdalops/koordalops (email) + EMAIL_TO. Tanpa push (lihat ponytail di atas). */
export async function penerimaPosko(env) {
  const hasil = new Map();
  const tambah = e => { const k = String(e || "").trim().toLowerCase(); if (k) hasil.set("email:" + k, {id: "email:" + k, email: String(e).trim()}); };
  try { for (const r of (await env.DB.prepare("SELECT email FROM staf WHERE status = 'aktif' AND dummy = 0 AND email IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(peran) WHERE value IN ('pimpinan', 'pusdalops', 'koordalops')) LIMIT 100").all()).results) tambah(r.email); }
  catch (e) { if (!/no such table: staf/i.test(String(e?.message || e))) throw e; }
  for (const e of String(env.EMAIL_TO || "").split(",")) tambah(e);
  return [...hasil.values()];
}

/* darurat regu: pemilik penugasan + Posko pusat. p = baris penugasan dari dariToken (id, tugas_id, akun_id, prov, kab, kec). TANPA nama orang: hanya instansi (instansi_akun.wilayah), wilayah, jenis, tautan Meja Pantau.
   Kunci kabar per jendela 5 menit PER PENUGASAN: panggilan berulang satu tautan = satu kabar per jendela, dan tautan lain di tugas yang sama tidak pernah ikut diredam (kabar pertama tiap penugasan selalu terkirim).
   Batas per tautan (5 per 10 menit, 429) ada di rute darurat (src/penugasan.js). */
export async function kabarDarurat(env, p, jenis, label, kini = Date.now()) {
  if (p.dummy) return {lewat: "penugasan dummy: tidak ada kabar nyata"};
  const akun = await env.DB.prepare("SELECT id, email, wilayah FROM instansi_akun WHERE id = ?").bind(p.akun_id).first();
  const pukul = new Date(kini + 7 * JAM).toISOString().slice(11, 16), dasar = `Satu regu dari ${akun?.wilayah || "instansi"} di ${tempat(p.prov, p.kab, p.kec)} melaporkan keadaan darurat (${label}) pukul ${pukul} WIB. Hubungi komandan regu sekarang; `;
  const penerima = [...(akun ? [{id: "akun:" + akun.id, akun: akun.id, email: akun.email, ganti: {url: "/instansi", isi: dasar + "posisi terakhir tampil di kotak DARURAT pada Tugas api."}}] : []),
    ...(await penerimaPosko(env)).map(x => ({...x, ganti: {url: "/admin/pantau", isi: dasar + "posisi terakhir ada di Meja Pantau."}}))];
  return kabarkan(env, `darurat:${p.id}:${Math.floor(kini / (5 * MENIT))}`, penerima, {judul: `DARURAT regu: ${label}`, isi: dasar, url: "/admin/pantau", kadaluarsa: kini + 15 * MENIT}, kini);
}
/* tugas level 3 baru -> akun wilayahnya. tugas = [{id, prov, kab, kec}]. Satu kabar ringkas per akun per putaran (kunci = sidik kumpulan tugasnya), maks 30 akun.
   bencana (src/tugas_bencana.js) menentukan kata; karhutla tetap kalimat aslinya. */
export async function kabarLevel3(env, tugas, kini = Date.now(), bencana = "karhutla") {
  if (!tugas.length) return {};
  const L = labelBencana(bencana), api = bencana === "karhutla";
  const A = await semuaAkun(env), per = new Map();
  for (const t of tugas.slice(0, 50)) for (const a of A) if (dalam(a, t.prov, t.kab)) (per.get(a.id) || per.set(a.id, {a, ts: []}).get(a.id)).ts.push(t);
  const o = {akun: 0, push: 0, email: 0};
  for (const {a, ts} of [...per.values()].slice(0, MAKS_AKUN)) {
    const kunci = "l3:" + (await sha(ts.map(t => t.id).sort().join(","))).slice(0, 40), t0 = ts[0];
    const r = await kabarkan(env, kunci, [jadiPenerima(a)], {judul: api ? (ts.length > 1 ? `${ts.length} api level 3 baru di wilayah Anda` : `Api level 3 baru di ${tempat(t0.prov, t0.kab, t0.kec)}`) : (ts.length > 1 ? `${ts.length} tugas ${L.nama.toLowerCase()} tingkat tinggi baru di wilayah Anda` : `${L.sebut} tingkat tinggi di ${tempat(t0.prov, t0.kab, t0.kec)}`),
      isi: api ? `Cluster api level 3 baru terdeteksi (${ts.map(t => tempat(t.prov, t.kab, t.kec)).slice(0, 3).join("; ")}). Buka Tugas api untuk konfirmasi lapangan dalam 6 jam.`
        : `Tugas ${L.nama.toLowerCase()} baru (${ts.map(t => tempat(t.prov, t.kab, t.kec)).slice(0, 3).join("; ")}). Buka Tugas untuk konfirmasi lapangan dalam 6 jam.`, url: "/instansi"}, kini);
    o.akun++; o.push += r.push || 0; o.email += r.email || 0;
  }
  return o;
}

/* retensi: kunci kabar 30 hari */
export async function bersihkanKabar(env, kini = Date.now()) {
  try {
    try { await env.DB.prepare("DELETE FROM kabar_ulang WHERE dibuat <= ?").bind(kini - 2 * 24 * JAM).run(); } catch (e) { if (!tanpaTabel(e)) throw e; }
    return (await env.DB.prepare("DELETE FROM kabar_terkirim WHERE waktu <= ?").bind(kini - 30 * 24 * JAM).run()).meta.changes;
  }
  catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
}
