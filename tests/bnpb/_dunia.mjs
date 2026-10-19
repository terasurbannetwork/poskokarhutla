/* Dunia uji layar: worker utuh di workerd (Miniflare, listen ke port lokal acak) + D1 terisi dummy lewat endpoint Super Admin + kode pribadi nyata. */
import {createHmac} from "node:crypto";
import {Miniflare} from "miniflare";
import path from "node:path";
import {existsSync, readFileSync} from "node:fs";
import {AKAR, migrasi, pecah} from "../warga/_bantu.mjs";
import {ADMIN, sha256} from "../warga/_bnpb.mjs";

const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
export async function buatDunia() {
  const mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}],
    compatibilityDate: "2024-09-23", cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-layar"}, r2Buckets: {MEDIA: "media-layar"}, port: 0, host: "127.0.0.1",
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, moderator-dua", AKUN_SITUS: "gerbang@x:sandi", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji"},
    serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok di uji", {status: 599}), cache: false});
  const base = (await mf.ready).origin;
  const DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  const api = async (metode, j, body, h = ADMIN) => {
    const r = await fetch(base + j, {method: metode, headers: {...h, ...(body ? {"content-type": "application/json"} : {})}, body: body ? JSON.stringify(body) : undefined, redirect: "manual"});
    const t = await r.text(); let x = null; try { x = JSON.parse(t); } catch (e) {}
    return {s: r.status, j: x, t, h: r.headers};
  };
  /* urutan penting: dummy Alun-alun ikut menyisipkan baris Meja (logistik), sehingga dummy Meja yang diisi SESUDAH Alun-alun dijawab 409 (temuan, dilaporkan ke warga-api).
     Tiap modul diisi sendiri-sendiri: modul yang dummy-nya rusak melapor galatnya (uji halamannya gagal dengan sebab itu), modul lain tetap jalan */
  const galatIsi = {}, kode = {};
  for (const m of ["meja", "relawan", "riset", "alun", "pengingat"]) { const r = await api("POST", `/api/${m}/dummy`, {aksi: "isi"}); if (r.s >= 300) galatIsi[m] = `POST /api/${m}/dummy ${r.s} ${r.t.slice(0, 160)}`; }
  /* kode pribadi nyata (kode dummy tidak bisa dipakai masuk): petugas Meja, relawan, koordinator kampus */
  const pt = await api("POST", "/api/meja/petugas", {nama: "Petugas Uji", prov: "64", kab: "Kutai Kartanegara", meja: ["kaji_cepat", "logistik", "gudang"]});
  kode.meja = pt.j?.kode; if (!kode.meja) galatIsi.meja_kode = `POST /api/meja/petugas ${pt.s} ${pt.t.slice(0, 160)}`;
  const rl = await api("POST", "/api/relawan/daftar", {nama: "Relawan Uji", wa: "081234567890", email: "uji@contoh.id", prov: "64", kab: "Samarinda", jalur: "umum", keahlian: ["medis"], hari_per_minggu: 3, maks_hari: 30,
    luar_provinsi: true, darurat_nama: "Keluarga Uji", darurat_wa: "081298765432", setuju: true}, {});
  kode.relawan = rl.j?.kode; if (!kode.relawan) galatIsi.relawan_kode = `POST /api/relawan/daftar ${rl.s} ${rl.t.slice(0, 160)}`;
  const kp = (await api("GET", "/api/relawan/admin/institusi")).j?.institusi?.find(i => i.perjanjian?.length);
  const kb = kp && await api("POST", "/api/relawan/admin/institusi/" + kp.id, {aksi: "kode_baru"});
  kode.kampus = kb?.j?.kode; if (!kode.kampus) galatIsi.kampus_kode = `kode_baru institusi (kampus) ${kb?.s} ${kb?.t?.slice(0, 160)}`;
  /* kode mitra riset nyata (kode dummy tidak bisa dipakai masuk): mitra baru pada institusi yang sudah ada */
  const mt = kp && await api("POST", "/api/riset/admin/mitra", {institusi_id: kp.id, unit: "Unit Uji"});
  kode.mitra = mt?.j?.kode; if (!kode.mitra) galatIsi.riset_mitra_kode = `POST /api/riset/admin/mitra ${mt?.s} ${mt?.t?.slice(0, 160)}`;
  /* arsip sitrep lewat cron sungguhan: 00:05 UTC hari ini (= 07:05 WIB) memicu arsipkanSitrep, yang menulis ke R2 MEDIA */
  const d0 = new Date(); const tglArsip = d0.toISOString().slice(0, 10);
  try { await (await mf.getWorker()).scheduled({cron: "* * * * *", scheduledTime: Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), d0.getUTCDate(), 0, 5)}); } catch (e) { galatIsi.sitrep_arsip = "cron arsip: " + e.message; }
  const ds = await api("GET", "/api/sitrep/arsip/daftar", null, {});
  if (!ds.j?.tgl?.includes(tglArsip)) galatIsi.sitrep_arsip = `arsip ${tglArsip} tidak ada di R2 sesudah cron: ${ds.t.slice(0, 160)}`;
  /* cookie sesi admin = Super Admin (token rahasia-admin): format "exp.mod.hmac" milik src/statistik.js, ditandatangani SESI_KUNCI uji */
  const isi = `${Date.now() + 6 * 3600e3}.${sha256("rahasia-admin").slice(0, 12)}`, sesi = `${isi}.${createHmac("sha256", "kunci-sesi-uji").update(isi).digest("hex")}`;
  return {mf, base, sesi, tglArsip, DB, api, kode, galatIsi, tutup: () => mf.dispose()};
}
