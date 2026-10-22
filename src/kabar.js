/* Kabar seketika (docs/bnpb/RENCANA-LANJUT.md §1.5): push + email SEKARANG untuk darurat regu, tugas level 3 baru, dan alarm Himawari,
   tanpa menunggu ringkasan 3 jam (src/push.js). Satu kejadian satu kabar per penerima: baris (kunci, penerima) di kabar_terkirim (0043)
   dicatat DULU dengan INSERT OR IGNORE, kabar hanya dikirim bila baris itu baru. Penerima tanpa saluran yang sedang hidup (tanpa langganan push
   dan email mati) tidak dicatat, jadi tidak "habis" sebelum saluran dipasang. Email lewat Resend (src/ews.js), tetap mati selama pengirim @resend.dev.
   Isi hanya wilayah dan jenis kejadian: tanpa nama orang dan nomor telepon. Migrasi 0043/0040 belum diterapkan = dilewati rapi.
   ponytail: maks 40 penerima per kejadian (batas subrequest akun Free); push ke staf/admin belum ada karena langganan push hanya milik akun instansi,
   Posko pusat dikabari lewat email (staf pimpinan/pusdalops/koordalops + EMAIL_TO). */
import {siapPush, kirimKe, catatHasil} from "./push.js";
import {emailAktif, kirimEmail} from "./ews.js";
import {esc} from "./ews_email.js";
import {PROV} from "./instansi.js";
import {sha} from "./worker.js";

const MAKS_PENERIMA = 40, MAKS_AKUN = 30, JAM = 36e5, ASAL = "https://centurisk97.id";
const tanpaTabel = e => /no such (table|column): ?(main\.)?(kabar_terkirim|push_langganan|alarm_himawari|staf|instansi_akun)/i.test(String(e?.message || e));
const dalam = (a, prov, kab) => a.tingkat === "kab" ? prov === a.prov && String(kab).toLowerCase() === String(a.kab).toLowerCase() : JSON.parse(a.cakupan).includes(prov);
export const tempat = (prov, kab, kec) => [kec, kab, PROV[prov]?.[1]].filter(Boolean).join(", ");

/* pesan = {judul, isi, url}; penerima = [{id (kunci dedupe), akun?, email?}]. Kembali {push, email, lewat} atau {lewat: alasan}. */
export async function kabarkan(env, kunci, penerima, pesan, kini = Date.now()) {
  const o = {push: 0, email: 0, tanpa_saluran: 0}, pushOn = siapPush(env), suratOn = emailAktif(env), subjek = pesan.judul, isi = `${pesan.isi}\n${ASAL}${pesan.url || "/instansi"}`;
  const html = `<p style="font:700 16px Arial,sans-serif;margin:0 0 8px">${esc(pesan.judul)}</p><p style="font:14px/1.5 Arial,sans-serif;margin:0 0 12px">${esc(pesan.isi)}</p><p style="font:14px Arial,sans-serif;margin:0"><a href="${esc(ASAL + (pesan.url || "/instansi"))}">Buka Pantau Bencana</a></p>`;
  const sudah = new Set();
  try {
    for (const p of penerima.slice(0, MAKS_PENERIMA)) {
      if (sudah.has(p.id)) continue; sudah.add(p.id);
      let subs = [];
      if (pushOn && p.akun) try { subs = (await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_langganan WHERE akun_id = ?").bind(p.akun).all()).results; } catch (e) { if (!tanpaTabel(e)) throw e; }
      const surel = suratOn && p.email ? p.email : null;
      if (!subs.length && !surel) { o.tanpa_saluran++; continue; }
      const klaim = await env.DB.prepare("INSERT OR IGNORE INTO kabar_terkirim (kunci, penerima, waktu) VALUES (?, ?, ?)").bind(kunci.slice(0, 80), p.id.slice(0, 120), kini).run();
      if (!klaim.meta.changes) continue;
      if (subs.length) try {
        const hasil = await kirimKe(env, subs, {judul: pesan.judul, isi: pesan.isi, tag: "pb-kabar", url: pesan.url || "/instansi"}, "k" + String(p.akun).slice(0, 20), kini);
        o.push += hasil.filter(h => h.status >= 200 && h.status < 300).length;
        const st = catatHasil(env, hasil, kini); if (st.length) await env.DB.batch(st);
      } catch (e) { console.error("kabar push", e?.message); }
      if (surel) try { await kirimEmail(env, surel, {subject: subjek, html, text: `${pesan.judul}\n${isi}`}); o.email++; } catch (e) { console.error("kabar email", e?.message); }
    }
  } catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
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

/* darurat regu: pemilik penugasan + Posko pusat. p = baris penugasan dari dariToken (id, akun_id, nama, prov, kab, kec). */
export async function kabarDarurat(env, p, jenis, label, kini = Date.now()) {
  const akun = await env.DB.prepare("SELECT id, email FROM instansi_akun WHERE id = ?").bind(p.akun_id).first();
  const penerima = [...(akun ? [{id: "akun:" + akun.id, akun: akun.id, email: akun.email}] : []), ...await penerimaPosko(env)];
  return kabarkan(env, `darurat:${p.id}:${kini}`, penerima, {judul: `DARURAT regu: ${label}`, isi: `Regu ${p.nama} melaporkan keadaan darurat (${label}) di ${tempat(p.prov, p.kab, p.kec)}. Hubungi regu dan komandan sekarang; posisi terakhir ada di Meja Pantau.`, url: "/instansi"}, kini);
}
/* tugas level 3 baru -> akun wilayahnya. tugas = [{id, prov, kab, kec}]. Satu kabar ringkas per akun per putaran (kunci = sidik kumpulan tugasnya), maks 30 akun. */
export async function kabarLevel3(env, tugas, kini = Date.now()) {
  if (!tugas.length) return {};
  const A = await semuaAkun(env), per = new Map();
  for (const t of tugas.slice(0, 50)) for (const a of A) if (dalam(a, t.prov, t.kab)) (per.get(a.id) || per.set(a.id, {a, ts: []}).get(a.id)).ts.push(t);
  const o = {akun: 0, push: 0, email: 0};
  for (const {a, ts} of [...per.values()].slice(0, MAKS_AKUN)) {
    const kunci = "l3:" + (await sha(ts.map(t => t.id).sort().join(","))).slice(0, 40), t0 = ts[0];
    const r = await kabarkan(env, kunci, [jadiPenerima(a)], {judul: ts.length > 1 ? `${ts.length} api level 3 baru di wilayah Anda` : `Api level 3 baru di ${tempat(t0.prov, t0.kab, t0.kec)}`,
      isi: `Kompleks api level 3 baru terdeteksi (${ts.map(t => tempat(t.prov, t.kab, t.kec)).slice(0, 3).join("; ")}). Buka Tugas api untuk konfirmasi lapangan dalam 6 jam.`, url: "/instansi"}, kini);
    o.akun++; o.push += r.push || 0; o.email += r.email || 0;
  }
  return o;
}

/* retensi: kunci kabar 30 hari */
export async function bersihkanKabar(env, kini = Date.now()) {
  try { return (await env.DB.prepare("DELETE FROM kabar_terkirim WHERE waktu <= ?").bind(kini - 30 * 24 * JAM).run()).meta.changes; }
  catch (e) { if (tanpaTabel(e)) return {lewat: "migrasi 0043 belum diterapkan"}; throw e; }
}
