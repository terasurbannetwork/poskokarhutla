/* Pengingat (C2): cron harian membuat ANTREAN pengingat dari data modul lain; admin yang melihat lalu menekan "Kirim email ringkas" (Resend ke EMAIL_TO).
   TIDAK ada kiriman otomatis keluar (pola antrean Posko). Skema: migrations/0028_pengingat.sql. Rancangan: docs/bnpb/RENCANA-SEMPURNA-12-JAM.md C2.
   Aturan dedup: satu baris per (jenis, sumber_id, keadaan). `keadaan` = keadaan sumber saat terdeteksi (mis. 'diminta', 'segera_habis:2026-12-01'). Hal yang sama
   tidak berulang tiap hari; baris baru lahir HANYA bila keadaan sumber berubah (MoU segera_habis -> habis, perjanjian diperpanjang lalu habis lagi, rehab pindah tahap).
   Bila kondisinya hilang (logistik sudah disetujui, stok diisi), barisnya ikut dihapus, jadi antrean tidak memuat hal basi dan kambuhnya hal yang sama muncul lagi.
   Isi pengingat: judul/angka/wilayah saja; tidak ada nama, WA, atau email relawan maupun petugas. */
import {json, gagal, acak, bacaBody, normalWA} from "./worker.js";
import {modOK, superOK, esc, wib, kirimEmail} from "./posko.js";
import {laju} from "./bnpb.js";
import {halamanAdmin, emailSiap} from "./statistik.js";
import {halamanBnpb} from "./admin_halaman.js";
import {statusMou} from "./relawan.js";
import {AMBANG, statusEfektif, tandaBahaya} from "./meja_spek.js";
import {PROV} from "./alun.js";

const JAM = 3600e3, HARI = 24 * JAM, BATAS_BACA = 5000, MAKS_KIRIM = 50, RE_ID = /^[0-9a-f]{16}$/;
export const SEGERA_HARI = 60, SEGERA_LALU_HARI = 30;
export const JENIS = {
  mou_relawan: "MoU relawan hampir habis", pks_riset: "PKS riset hampir habis", logistik_lambat: "Logistik belum disetujui", dsp_spj: "DSP belum SPJ",
  renkon: "Rencana kontinjensi", rehab_macet: "Rehab-rekon macet", stok_rendah: "Stok gudang menipis", bantuan_terbuka: "Butuh bantuan belum ditangani",
  prioritas_dampak: "Prioritas dampak: kirim ke BPBD"};
export const DAFTAR_JENIS = Object.keys(JENIS);
export const STATUS = ["baru", "dikirim", "selesai", "abaikan"];
const tolakMod = () => gagal(403, "hanya untuk moderator ke atas (bukan akun gerbang situs)");
const tabelBelum = f => async (...a) => {
  try { return await f(...a); }
  catch (e) { if (/no such table/i.test(String(e?.message || e))) return gagal(503, "pengingat belum diaktifkan (migrasi 0028_pengingat belum diterapkan)"); throw e; }
};

/* ---------------- pendeteksi: tiap fungsi mengembalikan [{jenis, sumber_id, keadaan, judul, rincian, prov, kab}] atau null (tabel sumber belum ada / terpotong) ---------------- */
const tgl = t => new Date(t + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "long", year: "numeric"});
async function perjanjian(env, kini, dummy) {
  const rows = (await env.DB.prepare(`SELECT p.id, p.jenis_perjanjian, p.nomor, p.mulai, p.berakhir, i.nama, i.prov FROM institusi_perjanjian p JOIN institusi i ON i.id = p.institusi_id
    WHERE p.dummy = ?1 AND p.berakhir <= ?2 AND p.berakhir >= ?3 AND NOT EXISTS (SELECT 1 FROM institusi_perjanjian q WHERE q.institusi_id = p.institusi_id AND q.jenis_perjanjian = p.jenis_perjanjian AND q.berakhir > p.berakhir)
    LIMIT ${BATAS_BACA}`).bind(dummy, wib(kini + SEGERA_HARI * HARI), wib(kini - SEGERA_LALU_HARI * HARI)).all()).results;
  if (rows.length >= BATAS_BACA) return null;
  return rows.flatMap(p => {
    const m = statusMou(p, kini); if (m.status !== "segera_habis" && m.status !== "habis") return [];
    const mou = p.jenis_perjanjian === "mou_relawan";
    return [{jenis: mou ? "mou_relawan" : "pks_riset", sumber_id: p.id, keadaan: `${m.status}:${p.berakhir}`,
      judul: `${mou ? "MoU relawan" : "PKS riset"} ${p.nama} ${m.status === "habis" ? "sudah berakhir" : "segera berakhir"} (${tgl(p.berakhir)})`, rincian: `Nomor ${p.nomor}`, prov: p.prov, kab: null}];
  });
}
/* meja kerja: aturan ambang dari tandaBahaya/statusEfektif (meja_spek.js), tidak diulang di sini */
async function meja(env, kini, dummy) {
  const rows = (await env.DB.prepare(`SELECT id, meja, prov, kab, status, data, dibuat, stok FROM meja_catatan WHERE dummy = ?
    AND ((meja = 'logistik' AND status = 'diminta') OR (meja = 'dsp' AND status = 'cair') OR meja IN ('renkon', 'gudang') OR (meja = 'rehab' AND status IN ('jitupasna', 'usulan', 'disetujui', 'cair', 'dibangun'))) LIMIT ${BATAS_BACA}`).bind(dummy).all()).results;
  if (rows.length >= BATAS_BACA) return null;
  const out = [];
  for (const r of rows) {
    const d = JSON.parse(r.data), rec = {status: r.status, data: r.stok == null ? d : {...d, stok: r.stok}, dibuat: r.dibuat}, tanda = tandaBahaya(r.meja, rec, kini), w = {sumber_id: r.id, prov: r.prov, kab: r.kab};
    if (r.meja === "logistik" && tanda.includes("belum_disetujui"))
      out.push({...w, jenis: "logistik_lambat", keadaan: "diminta", judul: `Logistik ${String(d.barang).replace(/_/g, " ")} diminta lebih dari ${AMBANG.logistik_setuju_jam} jam belum disetujui`, rincian: `${d.jumlah_diminta} ${d.satuan} untuk ${d.posko}`});
    else if (r.meja === "dsp" && tanda.includes("spj_terlambat"))
      out.push({...w, jenis: "dsp_spj", keadaan: `cair:${d.tgl_cair}`, judul: `DSP cair ${tgl(d.tgl_cair)} belum SPJ lebih dari ${AMBANG.dsp_spj_hari} hari`, rincian: `Permohonan ${d.nomor_permohonan}, ${d.kejadian}`});
    else if (r.meja === "renkon") {
      const se = statusEfektif("renkon", rec, kini);
      if (se === "segera_habis" || se === "kedaluwarsa")
        out.push({...w, jenis: "renkon", keadaan: `${se}:${d.berlaku_sampai}`, judul: `Rencana kontinjensi ${d.judul} ${se === "kedaluwarsa" ? "sudah kedaluwarsa" : "segera habis"} (${tgl(d.berlaku_sampai)})`, rincian: `Bencana ${String(d.bencana).replace(/_/g, " ")}`});
    } else if (r.meja === "rehab" && tanda.includes("macet"))
      out.push({...w, jenis: "rehab_macet", keadaan: `macet:${r.status}`, judul: `Rehab-rekon macet di tahap ${r.status} lebih dari ${AMBANG.rehab_macet_hari} hari`, rincian: `${(d.rumah_rb || 0) + (d.rumah_rs || 0) + (d.rumah_rr || 0)} rumah diusulkan`});
    else if (r.meja === "gudang" && tanda.includes("stok_rendah"))
      out.push({...w, jenis: "stok_rendah", keadaan: "menipis", judul: `Stok ${String(d.barang).replace(/_/g, " ")} di ${d.gudang} sama dengan atau di bawah ambang`, rincian: `Sisa ${rec.data.stok} ${d.satuan}, ambang ${d.ambang_min}`});
  }
  return out;
}
async function bantuan(env, kini, dummy) {
  const rows = (await env.DB.prepare(`SELECT id, judul, prov, kab FROM alun_utas WHERE bantuan = 'terbuka' AND moderasi <> 'tersembunyi' AND dummy = ? AND dibuat < ? LIMIT ${BATAS_BACA}`).bind(dummy, kini - HARI).all()).results;
  if (rows.length >= BATAS_BACA) return null;
  return rows.map(u => ({jenis: "bantuan_terbuka", sumber_id: u.id, keadaan: "terbuka", judul: `Butuh bantuan terbuka lebih dari 24 jam: ${u.judul}`, rincian: null, prov: u.prov, kab: u.kab}));
}
/* F2 prioritas dampak: satu baris per kecamatan dari public/banjir/data/risiko_prioritas.json (agregat publik: wilayah, kelas, bahaya, jiwa, BPBD; tanpa data pribadi).
   keadaan = kelas saja (BUKAN tanggal data: tanggal akan membuat baris baru tiap hari); naik kelas = baris baru, tanggal data di muatan ikut diperbarui selama masih 'baru'.
   JSON hilang/404/usang/rusak = null (jenis dilewati, antrean tidak dipangkas). */
const SITUS = "https://centurisk97.id", RE_TGL = /^\d{4}-\d\d-\d\d$/;
const hash16 = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).slice(0, 8)].map(x => x.toString(16).padStart(2, "0")).join("");
async function prioritas(env, kini, dummy) {
  let d;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/risiko_prioritas.json")); if (!r.ok) { r.body?.cancel(); return null; } d = await r.json(); } catch (e) { return null; }
  if (!d || d.usang === true || !Array.isArray(d.kec) || !RE_TGL.test(d.hari) || d.kec.length >= BATAS_BACA) return null;
  const out = [], sah = d.kec.filter(k => k && typeof k.kec === "string" && typeof k.kab === "string" && typeof k.kelas_nama === "string" && Number.isInteger(k.kelas));
  /* dummy: 6 kecamatan teratas dari JSON nyata; nomor Pusdalops fiktif kecuali untuk BPBD kecamatan pertama (ujian "tanpa nomor") */
  const pakai = dummy ? sah.slice(0, 6) : sah, tanpa = dummy ? String(pakai[0]?.bpbd?.nama) : null;
  for (const k of pakai) {
    const b = k.bpbd || {}, nama = String(b.nama || "").slice(0, 60), wa = dummy ? (nama === tanpa ? null : "6281200000000") : normalWA(b.pusdalops);
    const jiwa = Number.isFinite(k.pend) ? Math.round(k.pend) : 0, bahaya = String(k.utama_nama || "").slice(0, 30), kelas = k.kelas_nama.slice(0, 20);
    const kec = k.kec.slice(0, 60), kab = k.kab.slice(0, 60), sekab = b.sekab === true;
    out.push({jenis: "prioritas_dampak", sumber_id: await hash16(`${dummy ? "dummy|" : ""}${k.prov}|${k.kab}|${k.kec}`), keadaan: `k${k.kelas}`,
      judul: `Kec. ${kec}, ${kab}: ${kelas}, ${bahaya}, ±${jiwa.toLocaleString("id-ID")} jiwa`,
      rincian: `${nama ? `BPBD ${nama}${!sekab && Number.isFinite(b.km) ? `, terdekat ${b.km} km` : ""}` : "BPBD tujuan belum ada"}; ${k.perubahan === "naik" && k.dari_kelas ? `naik dari ${k.dari_kelas}` : String(k.perubahan || "tetap")}`,
      prov: /^\d{2}$/.test(String(k.prov)) ? String(k.prov) : null, kab: kab.length >= 2 ? kab : null, segar: true,
      muatan: JSON.stringify({kec, kab, kelas, bahaya, jiwa, bpbd: nama, wa, hari: d.hari})});
  }
  return out;
}
const TIAP = [[["mou_relawan", "pks_riset"], perjanjian], [["logistik_lambat", "dsp_spj", "renkon", "rehab_macet", "stok_rendah"], meja], [["bantuan_terbuka"], bantuan], [["prioritas_dampak"], prioritas]];

/* Cron harian (idempoten: dua kali jalan = tidak ada baris baru). dummy=1 membaca sumber dummy untuk tombol 🧪. */
export async function buatPengingat(env, kini = Date.now(), {dummy = 0, hanya = null} = {}) {
  const hari = wib(kini), baru = [], utuh = [], per = Object.fromEntries(DAFTAR_JENIS.map(j => [j, 0]));
  for (const [jenis, f] of TIAP) {
    if (hanya && !jenis.some(j => hanya.includes(j))) continue;
    let r;
    try { r = await f(env, kini, dummy); } catch (e) { if (/no such table/i.test(String(e?.message || e))) continue; throw e; }   // modul sumber belum dimigrasi: lewati
    if (!r) continue;   // terpotong BATAS_BACA: jangan memangkas antrean dari daftar yang tidak lengkap
    utuh.push(...jenis); baru.push(...r);
  }
  let dibuat = 0;
  for (let i = 0; i < baru.length; i += 50) {
    const rs = await env.DB.batch(baru.slice(i, i + 50).map(p => env.DB.prepare(`INSERT OR IGNORE INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, rincian, prov, kab, dibuat, dummy, muatan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(acak(8), p.jenis, p.sumber_id, p.keadaan, hari, p.judul.slice(0, 160), p.rincian?.slice(0, 300) ?? null, p.prov ?? null, p.kab ?? null, kini, dummy, p.muatan ?? null)));
    for (const [k, x] of rs.entries()) if (x.meta.changes) { dibuat++; per[baru[i + k].jenis]++; }
  }
  /* baris prioritas yang masih 'baru' ikut data terbaru (tanggal data, jiwa, BPBD/nomor); yang sudah dikirim/selesai tidak diubah */
  const segar = baru.filter(p => p.segar);
  for (let i = 0; i < segar.length; i += 50) await env.DB.batch(segar.slice(i, i + 50).map(p => env.DB.prepare(`UPDATE pengingat SET judul = ?, rincian = ?, muatan = ? WHERE jenis = ? AND sumber_id = ? AND keadaan = ? AND dummy = ? AND status = 'baru' AND muatan IS NOT ?3`)
    .bind(p.judul.slice(0, 160), p.rincian?.slice(0, 300) ?? null, p.muatan, p.jenis, p.sumber_id, p.keadaan, dummy)));
  /* kondisi sudah hilang -> baris basi dihapus (hanya untuk jenis yang daftarnya lengkap) */
  const ada = JSON.stringify(baru.map(p => `${p.jenis}|${p.sumber_id}|${p.keadaan}`));
  const hapus = utuh.length ? (await env.DB.prepare(`DELETE FROM pengingat WHERE dummy = ?1 AND jenis IN (SELECT value FROM json_each(?2)) AND NOT (jenis = 'prioritas_dampak' AND status IN ('dikirim', 'selesai')) AND (jenis || '|' || sumber_id || '|' || keadaan) NOT IN (SELECT value FROM json_each(?3))`)
    .bind(dummy, JSON.stringify(utuh), ada).run()).meta.changes : 0;
  return {tanggal: hari, dibuat, dihapus: hapus, per_jenis: per};
}

/* Cron prioritas (jam 00/06/12/18 UTC menit 55, sesudah titik.yml menerbitkan risiko_prioritas.json): hanya jenis ini; idempoten. */
export const buatPengingatPrioritas = (env, kini = Date.now()) => buatPengingat(env, kini, {hanya: ["prioritas_dampak"]});

/* Kelompok per BPBD tujuan untuk layar admin. Tautan wa.me hanya bila nomor Pusdalops sah (normalWA dipakai saat deteksi); membuka WhatsApp di perangkat admin, tidak mengirim apa pun.
   Teks = wilayah, kelas, bahaya, jiwa, tanggal data, tautan /risiko: agregat publik, tanpa data pribadi. */
const MAKS_TEKS = 25;
export function kelompokPrioritas(rows) {
  const per = new Map();
  for (const r of rows) {
    if (r.jenis !== "prioritas_dampak" || r.status !== "baru" || !r.muatan) continue;
    let m; try { m = JSON.parse(r.muatan); } catch (e) { continue; }
    const k = `${m.bpbd}|${m.wa || ""}`; if (!per.has(k)) per.set(k, {bpbd: m.bpbd || "", wa: m.wa || null, baris: []});
    per.get(k).baris.push({id: r.id, m});
  }
  return [...per.values()].map(g => {
    const hari = g.baris.map(b => b.m.hari).sort().at(-1), jiwa = g.baris.reduce((a, b) => a + (b.m.jiwa || 0), 0);
    const teks = [`Prioritas dampak, data risiko ${tgl(hari)}`, `Kepada BPBD ${g.bpbd || "tujuan"}${g.wa ? " (Pusdalops)" : ""}: kecamatan berikut berisiko tinggi dengan bahaya harian aktif.`,
      ...g.baris.slice(0, MAKS_TEKS).map((b, i) => `${i + 1}. Kec. ${b.m.kec}, ${b.m.kab}: ${b.m.kelas}, ${b.m.bahaya}, ±${(b.m.jiwa || 0).toLocaleString("id-ID")} jiwa`),
      ...(g.baris.length > MAKS_TEKS ? [`dan ${g.baris.length - MAKS_TEKS} kecamatan lain`] : []), `Rincian: ${SITUS}/risiko`].join("\n");
    return {bpbd: g.bpbd, wa: g.wa, tautan: g.wa ? `https://wa.me/${g.wa}?text=${encodeURIComponent(teks)}` : null, teks, ids: g.baris.map(b => b.id), kecamatan: g.baris.length, jiwa};
  }).sort((a, b) => b.jiwa - a.jiwa);
}

/* ---------------- admin ---------------- */
async function daftar(env, req, url) {
  if (!await modOK(env, req)) return tolakMod();
  const d = url.searchParams.get("dummy") === "1";
  const rows = (await env.DB.prepare(`SELECT id, jenis, tanggal, judul, rincian, prov, kab, status, dikirim_pada, dibuat, dummy, muatan FROM pengingat ${d ? "" : "WHERE dummy = 0"}
    ORDER BY (status IN ('baru', 'dikirim')) DESC, dibuat DESC, id LIMIT 1000`).all()).results;
  const hitung = Object.fromEntries(DAFTAR_JENIS.map(j => [j, rows.filter(r => r.jenis === j && (r.status === "baru" || r.status === "dikirim")).length]));
  return json({pengingat: rows.map(({muatan: _, ...r}) => ({...r, dummy: !!r.dummy, prov_nama: PROV[r.prov] || null})), kelompok_prioritas: kelompokPrioritas(rows), per_jenis: hitung, jenis: JENIS, status: STATUS, email_siap: emailSiap(env)});
}
async function periksa(env, req, kini) {
  if (!await modOK(env, req)) return tolakMod();
  return json({ok: true, ...await buatPengingat(env, kini)});
}
/* satu email gabungan; isi = judul, rincian, wilayah. Tanpa data pribadi. */
export function susunEmail(rows, kini = Date.now(), asal = "") {
  /* bantuan_terbuka: judul utas warga tidak ikut ke email (bisa memuat kata-kata warga); cukup jenis, umur, wilayah, dan tautan admin */
  rows = rows.map(r => r.jenis !== "bantuan_terbuka" ? r : {...r, judul: `Utas butuh bantuan terbuka ${r.dibuat ? Math.max(1, Math.floor((kini - r.dibuat) / HARI)) + " hari" : "lebih dari 24 jam"}`, rincian: `Lihat di ${asal}/admin/pengingat`});
  const per = DAFTAR_JENIS.map(j => [j, rows.filter(r => r.jenis === j)]).filter(([, a]) => a.length), w = r => [r.kab, PROV[r.prov]].filter(Boolean).join(", ");
  const teks = per.map(([j, a]) => `${JENIS[j]} (${a.length})\n` + a.map(r => `- ${r.judul}${r.rincian ? ` | ${r.rincian}` : ""}${w(r) ? ` | ${w(r)}` : ""}`).join("\n")).join("\n\n");
  const FONT = "font:14px/1.55 Arial,sans-serif;color:#1d2733";
  const html = `<div style="${FONT}"><p>Ringkasan pengingat Ruang Koordinasi (${rows.length}):</p>` + per.map(([j, a]) => `<h3 style="margin:14px 0 4px;font:700 15px Arial,sans-serif">${esc(JENIS[j])} (${a.length})</h3><ul style="margin:0;padding-left:18px">` +
    a.map(r => `<li>${esc(r.judul)}${r.rincian ? ` <span style="color:#5b6773">| ${esc(r.rincian)}</span>` : ""}${w(r) ? ` <span style="color:#5b6773">| ${esc(w(r))}</span>` : ""}</li>`).join("") + "</ul>").join("") + "</div>";
  return {subject: `[Centurisk97] ${rows.length} pengingat Ruang Koordinasi`, teks: `Ringkasan pengingat Ruang Koordinasi (${rows.length}):\n\n${teks}`, html};
}
async function kirim(env, req, kini) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const ids = b.o.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > MAKS_KIRIM || !ids.every(x => typeof x === "string" && RE_ID.test(x))) return gagal(400, `ids: 1-${MAKS_KIRIM} id pengingat (16 hex)`);
  if (!emailSiap(env)) return gagal(503, "email belum siap: EMAIL_API_KEY, EMAIL_FROM, dan EMAIL_TO (Resend) belum diset");
  const rows = (await env.DB.prepare("SELECT id, jenis, judul, rincian, prov, kab, status, dibuat FROM pengingat WHERE id IN (SELECT value FROM json_each(?)) AND dummy = 0 AND status IN ('baru', 'dikirim') ORDER BY dibuat, id").bind(JSON.stringify(ids)).all()).results;
  if (!rows.length) return gagal(409, "tidak ada pengingat terpilih yang masih terbuka (data contoh dummy tidak dikirim)");
  const l = await laju(env, mod, "pengingat.kirim", [[JAM, 10]], kini); if (l) return l;   // per moderator, 10 email per jam
  const ke = env.EMAIL_TO.split(",").map(s => s.trim()).filter(Boolean);
  try { await kirimEmail(env, ke, susunEmail(rows, kini, new URL(req.url).origin)); }
  catch (e) { console.error("pengingat email", e?.message); return gagal(502, "email gagal terkirim (" + String(e?.message || e).slice(0, 120) + "); status tidak diubah"); }
  await env.DB.prepare("UPDATE pengingat SET status = 'dikirim', dikirim_pada = ?, oleh = ? WHERE id IN (SELECT value FROM json_each(?)) AND status IN ('baru', 'dikirim')").bind(kini, mod, JSON.stringify(rows.map(r => r.id))).run();   // ditandai SESUDAH terkirim
  return json({ok: true, terkirim: rows.length, ke: ke.length});
}
/* admin sudah menekan tautan wa.me di perangkatnya: tandai kelompoknya terkirim (hanya prioritas_dampak yang masih 'baru'); tidak ada kiriman dari server */
async function dikirimWA(env, req, kini) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  const ids = b.o.ids;
  if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(x => typeof x === "string" && RE_ID.test(x))) return gagal(400, "ids: 1-500 id pengingat (16 hex)");
  const r = await env.DB.prepare("UPDATE pengingat SET status = 'dikirim', dikirim_pada = ?, oleh = ? WHERE id IN (SELECT value FROM json_each(?)) AND jenis = 'prioritas_dampak' AND status = 'baru'").bind(kini, mod, JSON.stringify(ids)).run();
  return r.meta.changes ? json({ok: true, ditandai: r.meta.changes}) : gagal(409, "tidak ada pengingat prioritas dampak yang masih baru di antara id itu");
}
const AKSI = {selesai: "selesai", abaikan: "abaikan", buka: "baru"};
async function ubah(env, req, id) {
  const mod = await modOK(env, req); if (!mod) return tolakMod();
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.aksi !== "string" || !Object.hasOwn(AKSI, b.o.aksi)) return gagal(400, "aksi harus " + Object.keys(AKSI).join(", "));
  const r = await env.DB.prepare("UPDATE pengingat SET status = ?, oleh = ? WHERE id = ?").bind(AKSI[b.o.aksi], mod, id).run();
  return r.meta.changes ? json({ok: true, id, status: AKSI[b.o.aksi]}) : gagal(404, "pengingat tidak ada");
}

/* ---------------- dummy (DUMMY.md): pengingat lahir dari sumber dummy modul lain lewat buatPengingat yang sama dengan cron ---------------- */
async function dummy(env, req, kini) {
  if (!await superOK(env, req)) return gagal(403, "dummy hanya untuk Super Admin (secret SUPER_ADMIN berisi awalan akun)");
  const b = await bacaBody(req); if (b.galat) return gagal(b.status || 400, b.galat);
  if (b.o.aksi === "hapus") return json({ok: true, pengingat: (await env.DB.prepare("DELETE FROM pengingat WHERE dummy = 1").run()).meta.changes});
  if (b.o.aksi !== "isi") return gagal(400, "aksi harus isi/hapus");
  if ((await env.DB.prepare("SELECT count(*) n FROM pengingat WHERE dummy = 1").first()).n) return gagal(409, "data dummy sudah ada; hapus dulu dengan 🧹");
  const r = await buatPengingat(env, kini, {dummy: 1}), kosong = DAFTAR_JENIS.filter(j => !r.per_jenis[j]);
  if (!r.dibuat) return gagal(409, "belum ada data dummy sumber: isi dulu 🧪 di Relawan, Riset, Meja Kerja, dan Alun-alun");
  return json({ok: true, pengingat: r.dibuat, per_jenis: r.per_jenis, kosong}, 201);
}

const T = tabelBelum;
export const RUTE_PENGINGAT = {
  "GET /admin/pengingat": (env, req, url, kini) => halamanAdmin(env, req, kini, halamanBnpb("pengingat")),
  "GET /api/pengingat/admin": T((env, req, url) => daftar(env, req, url)),
  "POST /api/pengingat/admin/periksa": T((env, req, url, kini) => periksa(env, req, kini)),
  "POST /api/pengingat/admin/kirim": T((env, req, url, kini) => kirim(env, req, kini)),
  "POST /api/pengingat/admin/dikirim-wa": T((env, req, url, kini) => dikirimWA(env, req, kini)),
  "POST /api/pengingat/admin/:id": T((env, req, url, kini, ctx, id) => ubah(env, req, id)),
  "POST /api/pengingat/dummy": T((env, req, url, kini) => dummy(env, req, kini)),
};
