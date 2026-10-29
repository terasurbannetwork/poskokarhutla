/* Akun pemirsa: orang yang hanya boleh MELIHAT tab tertentu situs Centurisk97 (mis. hanya Berita). Skema: migrations/0036_pemirsa.sql. Aturan pemilik (22 Okt 2026):
   - Dibuat HANYA oleh Super Admin di /admin/akun: cukup nama + tab. Sandi acak 16 huruf tampil SEKALI (mesin sandi akun staf, src/staf.js);
     sejak 26 Okt Super Admin boleh mengisi sandi awal sendiri saat buat/reset (cekSandiAwal).
   - Masuk lewat form /admin/masuk yang sama (dicoba sesudah akun admin gagal). Sesi = cookie sesi_pemirsa (hanya hash di D1), 30 hari.
   - Gerbang centurisk97.id (src/worker.js): halaman yang bukan tab miliknya dialihkan ke tab pertamanya; layaniHTML menulis data-pemirsa-tab di <html>
     dan public/index.html menyembunyikan tab lain. Berkas data JSON tetap aset statis (keputusan pemilik): pembatas tampilan, bukan pengaman data. */
import {json, gagal, acak, sha, bacaBody} from "./worker.js";
import {tx, superOK} from "./posko.js";
import {sandiBaru} from "./staf.js";

const HARI = 24 * 3600e3, SESI_UMUR = 30 * HARI, COOKIE = "sesi_pemirsa";
/* daftar tetap: sama dengan trigger pemirsa_tab_sah di 0036 dan tab menu atas public/index.html (dijaga pemirsa.test.mjs) */
export const TAB = {peta: "Peta", insight: "Insight", berita: "Berita", tren: "Tren", dampak: "Dampak", sim: "Simulasi", monitor: "Monitor", foto: "Foto"};
const SESI = new WeakMap();   // permintaan -> baris pemirsa (gerbang dan layaniHTML membaca sekali)

const tabelBelum = e => /no such table: pemirsa/i.test(String(e?.message || e));
const baca = s => { try { return JSON.parse(s); } catch (e) { return []; } };
const KOLOM = "id, username, nama, tab, status, dibuat, dibuat_oleh, diputus";
const bentuk = r => r && {...r, tab: baca(r.tab)};
export const cookiePemirsa = (nilai, umur) => `${COOKIE}=${nilai}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${umur}`;
const tokenDari = req => (req.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`))?.[1] ?? null;

/* sesi pemirsa aktif atau null. Tanpa cookie: tanpa query. Tabel 0036 belum ada: null (situs tak terganggu). */
export async function pemirsaSesi(env, req, kini = Date.now()) {
  if (SESI.has(req)) return SESI.get(req);
  const t = tokenDari(req); let p = null;
  if (t) try {
    p = bentuk(await env.DB.prepare(`SELECT p.id, p.nama, p.tab FROM pemirsa_sesi x JOIN pemirsa p ON p.id = x.pemirsa_id WHERE x.token_sha = ? AND x.kedaluwarsa > ? AND p.status = 'aktif'`)
      .bind(await sha(t), kini).first());
  } catch (e) { if (!tabelBelum(e)) throw e; }
  SESI.set(req, p);
  return p;
}
/* murni: halaman yang dibuka pemirsa -> null (boleh) atau alamat tab pertamanya. /kompleks bagian dari Insight; /sim/K0001 = tab sim.
   Banjir ikut tab yang sama (pemilik 28 Okt 2026): /banjir/ = peta, /banjir/<tab> = tab itu, selain itu ke /banjir/<tab pertama>. */
export function arahPemirsa(p, pathname) {
  const s = pathname.split("/"), banjir = s[1] === "banjir";
  const seg = (banjir ? s[2] || "peta" : s[1]) || "", tab = seg === "kompleks" ? "insight" : seg;
  /* Monitor tidak punya tab di /banjir/: pemirsa ber-tab monitor melihat banjir lewat /monitor?bencana=banjir (migrasi 0077) */
  const pb = banjir ? p.tab.find(x => x !== "monitor") : p.tab[0], ke = pb ? (banjir ? "/banjir/" : "/") + pb : "/monitor?bencana=banjir";
  if (banjir && tab === "monitor") return p.tab.includes("monitor") ? "/monitor?bencana=banjir" : ke;
  return p.tab.includes(tab) ? null : ke;
}

/* dipanggil form /admin/masuk sesudah akun admin gagal: {token, tab} atau null. Batas laju: cekLaju per IP di form masuk. */
export async function masukPemirsa(env, username, sandi, kini) {
  let a;
  try { a = /^[a-z0-9]{5,60}$/.test(username) ? await env.DB.prepare("SELECT id, garam, sandi_sha, status, tab FROM pemirsa WHERE username = ?").bind(username).first() : null; }
  catch (e) { if (tabelBelum(e)) return null; throw e; }
  const cek = await sha((a?.garam ?? "0".repeat(32)) + sandi);   // hash tetap dihitung untuk username tak dikenal
  if (!a || a.status !== "aktif" || cek !== a.sandi_sha) return null;
  const token = acak(32);
  await env.DB.batch([env.DB.prepare("INSERT INTO pemirsa_sesi (token_sha, pemirsa_id, dibuat, kedaluwarsa) VALUES (?, ?, ?, ?)").bind(await sha(token), a.id, kini, kini + SESI_UMUR),
    env.DB.prepare("DELETE FROM pemirsa_sesi WHERE pemirsa_id = ? AND kedaluwarsa <= ?").bind(a.id, kini)]);
  return {token, tab: baca(a.tab), umur: SESI_UMUR / 1000};
}
export async function hapusSesiPemirsa(env, req) {
  const t = tokenDari(req); if (!t) return;
  try { await env.DB.prepare("DELETE FROM pemirsa_sesi WHERE token_sha = ?").bind(await sha(t)).run(); } catch (e) { if (!tabelBelum(e)) throw e; }
}

/* ================================================================ pengelolaan oleh Super Admin */
const tolakSuper = () => gagal(403, "akun pemirsa hanya dikelola Super Admin");
const slug = s => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/* murni: larik tab dari isian -> larik atau null */
export const cekTab = v => Array.isArray(v) && v.length >= 1 && v.length <= 7 && v.every(x => typeof x === "string" && Object.hasOwn(TAB, x)) && new Set(v).size === v.length ? v : null;
/* murni: sandi awal pilihan Super Admin (opsional; kosong = acak). 8 sampai 64 karakter, tanpa spasi di ujung (form masuk tidak memangkas sandi). */
export const cekSandiAwal = v => v == null || v === "" ? {v: undefined} : typeof v === "string" && v.length >= 8 && v.length <= 64 && v === v.trim() ? {v}
  : {g: "sandi awal 8 sampai 64 karakter, tanpa spasi di awal atau akhir; kosongkan untuk sandi acak"};
async function buat(env, req, kini) {
  const mod = await superOK(env, req); if (!mod) return tolakSuper();
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const nama = tx(b.o.nama, 100), tab = cekTab(b.o.tab);
  if (!nama || nama.length < 2) return gagal(400, "nama wajib diisi, 2 sampai 100 karakter");
  if (!tab) return gagal(400, `pilih minimal satu tab dari: ${Object.keys(TAB).join(", ")}`);
  const sa = cekSandiAwal(b.o.sandi); if (sa.g) return gagal(400, sa.g);
  const s = await sandiBaru(sa.v), id = acak(8), dasar = "lihat" + (slug(nama.split(/\s+/)[0]) || "tamu").slice(0, 16);
  for (let i = 0; i < 5; i++) {
    const username = dasar + String(Math.floor(Math.random() * 900) + 100);
    try {
      await env.DB.prepare(`INSERT INTO pemirsa (id, username, nama, tab, garam, sandi_sha, dibuat, dibuat_oleh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, username, nama, JSON.stringify(tab), s.garam, s.sandi_sha, kini, mod).run();
      return json({pemirsa: bentuk(await env.DB.prepare(`SELECT ${KOLOM} FROM pemirsa WHERE id = ?`).bind(id).first()), username, sandi: s.sandi}, 201);   // sandi tampil sekali
    } catch (e) { if (!/UNIQUE constraint failed: pemirsa\.username/i.test(String(e?.message || e))) throw e; }
  }
  return gagal(409, "username bentrok berulang; coba lagi");
}
async function daftar(env, req) {
  if (!await superOK(env, req)) return tolakSuper();
  return json({pemirsa: (await env.DB.prepare(`SELECT ${KOLOM} FROM pemirsa ORDER BY status, nama LIMIT 500`).all()).results.map(bentuk), tab: TAB});
}
async function ubah(env, req, id, kini) {
  if (!await superOK(env, req)) return tolakSuper();
  const b = await bacaBody(req, 1024); if (b.galat) return gagal(b.status || 400, b.galat);
  const p = await env.DB.prepare("SELECT status FROM pemirsa WHERE id = ?").bind(id).first(); if (!p) return gagal(404, "akun pemirsa tidak ada");
  if (p.status === "dicabut") return gagal(409, "akun pemirsa sudah dicabut; buat akun baru");
  const cabutSesi = env.DB.prepare("DELETE FROM pemirsa_sesi WHERE pemirsa_id = ?").bind(id);
  if (b.o.aksi === "cabut") {
    await env.DB.batch([env.DB.prepare("UPDATE pemirsa SET status = 'dicabut', diputus = ? WHERE id = ?").bind(kini, id), cabutSesi]);
    return json({id, status: "dicabut"});
  }
  if (b.o.aksi === "reset") {
    const sa = cekSandiAwal(b.o.sandi); if (sa.g) return gagal(400, sa.g);
    const n = await sandiBaru(sa.v);
    await env.DB.batch([env.DB.prepare("UPDATE pemirsa SET garam = ?, sandi_sha = ? WHERE id = ?").bind(n.garam, n.sandi_sha, id), cabutSesi]);
    return json({id, sandi: n.sandi});   // tampil sekali
  }
  if (b.o.aksi === "ubah") {
    const tab = cekTab(b.o.tab); if (!tab) return gagal(400, `pilih minimal satu tab dari: ${Object.keys(TAB).join(", ")}`);
    await env.DB.prepare("UPDATE pemirsa SET tab = ? WHERE id = ?").bind(JSON.stringify(tab), id).run();   // sesi yang hidup ikut berubah: tab dibaca ulang tiap permintaan
    return json({id, tab});
  }
  return gagal(400, "aksi harus cabut/reset/ubah");
}

/* retensi (cron menit 17): sesi kedaluwarsa */
export async function bersihkanPemirsa(env, kini = Date.now()) {
  try { return {sesi: (await env.DB.prepare("DELETE FROM pemirsa_sesi WHERE kedaluwarsa <= ?").bind(kini).run()).meta.changes}; }
  catch (e) { if (tabelBelum(e)) return {lewat: "migrasi 0036 belum diterapkan"}; throw e; }
}
const bungkus = f => async (...a) => { try { return await f(...a); } catch (e) { if (tabelBelum(e)) return gagal(503, "akun pemirsa belum diaktifkan (migrasi 0036_pemirsa belum diterapkan)"); throw e; } };
export const RUTE_PEMIRSA = {
  "POST /api/pemirsa/admin/buat": bungkus((env, req, url, kini) => buat(env, req, kini)),
  "GET /api/pemirsa/admin/daftar": bungkus((env, req) => daftar(env, req)),
  "POST /api/pemirsa/admin/:id": bungkus((env, req, url, kini, ctx, id) => ubah(env, req, id, kini)),
};
