/* Layar akun BPBD dengan profil PIC di peramban nyata (paket data/kajian-bnpb/profil-bpbd/, PF-03, RENCANA-UJI L-1, L-2, L-5): Chrome headless lewat CDP
   (tests/bnpb/_peramban.mjs) melawan worker utuh di Miniflare. Tanpa Chrome seluruh berkas DILEWATI dengan pesan. Jalankan: node --test tests/warga/profil_layar.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import path from "node:path";
import {createHmac} from "node:crypto";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah, JPEG_SAH} from "./_bantu.mjs";
import {PROFIL_KUNCI, sha256, profilAktif} from "./_profil.mjs";
import {cariChrome, bukaPeramban} from "../bnpb/_peramban.mjs";
import "../../src/worker.js";

const CHROME = cariChrome();
const TIPE = {".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml"};
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname), f = path.join(AKAR, "public", p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) && !p.endsWith("/") ? new Response(readFileSync(f), {headers: {"content-type": TIPE[path.extname(f)] || "application/octet-stream"}}) : new Response("tidak ada", {status: 404});
};
const SANDI = "SandiUji23456789";
let mf, DB, base, br, tab, ak = 0;
before(async () => {
  if (!CHROME) return;
  mf = new Miniflare({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
    cf: {country: "ID", colo: "CGK"}, d1Databases: {DB: "uji-profil-layar"}, r2Buckets: {MEDIA: "uji-profil-layar"}, port: 0, host: "127.0.0.1",
    bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin", SUPER_ADMIN: sha256("rahasia-admin").slice(0, 12), SESI_KUNCI: "kunci-sesi-uji", PROFIL_KUNCI}, serviceBindings: {ASSETS: aset}, outboundService: () => new Response("diblok di uji", {status: 599}), cache: false});
  base = (await mf.ready).origin; DB = await mf.getD1Database("DB"); await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
  br = await bukaPeramban(CHROME); tab = await br.tab();
});
after(async () => { await tab?.tutup?.(); await br?.tutup?.(); await mf?.dispose(); });
const uji = (nama, fn) => test(nama, {skip: CHROME ? false : "tanpa Chrome (CHROME_BIN): layar dilewati"}, fn);
const akun = async ({status = "aktif", prov = "13", wajibGanti = 0} = {}) => {
  const id = (++ak).toString(16).padStart(16, "c"), username = `pemprovlayar${ak}`, garam = "g".repeat(32);
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, garam, sandi_sha, status, wajib_ganti, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, dibuat)
    VALUES (?, ?, 'pemprov', 'prov', 'Provinsi Sumatera Barat', ?, ?, ?, ?, ?, ?, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'b@x.go.id', '6281234567890', 1, 1, 1, 1, 1)`)
    .bind(id, username, "k" + ak, JSON.stringify([prov]), garam, sha256(garam + SANDI), status, wajibGanti).run();
  return {id, username};
};
const ketik = (sel, v) => tab.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.value = ${JSON.stringify(v)}; e.dispatchEvent(new Event("input", {bubbles: true})); return true; })()`);
const masuk = async a => {
  await tab.kirim("Network.clearBrowserCookies");
  await tab.buka(base + "/instansi", {tunggu: "#fMasuk"});
  await ketik("#mUser", a.username); await ketik("#mSandi", SANDI); await tab.klik("#mKirim");
  try { await tab.tungguFungsi("document.querySelector('#vMasuk').hidden", 8000); }
  catch (e) { throw new Error(`login tidak berpindah layar: ${(await tab.teks()).slice(0, 300)} | galat: ${(await tab.galat()).join(" ; ")}`); }
};

uji("L-2 BPBD aktif: masuk akun lalu kisi pilih profil (foto, nama, jabatan), klik profil, dialog PIN, masuk, kepala kerja dengan ganti profil", async () => {
  const a = await akun(), p1 = await profilAktif(DB, a.id, {nama: "Rina Putri", jabatan: "Kepala Bidang"}), p2 = await profilAktif(DB, a.id, {baru: true, nama: "Budi Santoso", jabatan: "Operator"});
  await DB.prepare("DELETE FROM instansi_sesi_profil").run();
  const R2 = await mf.getR2Bucket("MEDIA"); for (const p of [p1, p2]) await R2.put(`instansi/profil/${a.id}/${p.id}`, JPEG_SAH, {httpMetadata: {contentType: "image/jpeg"}});   // foto profil nyata supaya gambar termuat
  await tab.ukuran(1200, 800); await masuk(a);
  await tab.tunggu("#vProfil .pf-sel");
  assert.equal(await tab.eval("document.querySelectorAll('#vProfil .pf-sel').length"), 2);
  const teks = await tab.eval("document.querySelector('#vProfil').innerText");
  assert.match(teks, /Pilih profil/); assert.match(teks, /Rina Putri/); assert.match(teks, /Kepala Bidang/); assert.ok(!/198001|@bpbd|62812/.test(teks), "kisi tanpa NIP, email, HP");
  assert.equal(await tab.eval("getComputedStyle(document.querySelector('.pf-sel .pf-nama')).textTransform"), "none");
  assert.equal(await tab.eval("document.querySelector('.pf-sel').getAttribute('aria-label').startsWith('Pilih profil')"), true);
  await tab.eval("document.querySelector('.pf-sel').click()");
  await tab.tunggu("dialog.pf-dlg[open]");
  assert.equal(await tab.eval("document.querySelectorAll('dialog.pf-dlg .pf-pin input').length"), 6);
  assert.equal(await tab.eval("document.querySelector('#pfOk').disabled"), true, "tombol Masuk menunggu enam angka");
  /* PIN salah: pesan plain, kotak dikosongkan */
  const isiPin = pin => tab.eval(`(() => { const k = [...document.querySelectorAll('dialog.pf-dlg .pf-pin input')]; ${JSON.stringify(pin)}.split('').forEach((d, i) => { k[i].value = d; k[i].dispatchEvent(new Event('input', {bubbles: true})); }); return true; })()`);
  await isiPin("100234"); await tab.klik("#pfOk"); await tab.tungguFungsi("/belum cocok/.test(document.querySelector('#pfDlgPesan').textContent)");
  assert.equal(await tab.eval("document.querySelector('#pfDlgPesan').className.includes('galat')"), true);
  await isiPin(p1.pin); await tab.klik("#pfOk");
  await tab.tungguFungsi("!document.querySelector('#profilKepala').hidden");
  assert.match(await tab.eval("document.querySelector('#profilKepala').innerText"), /Rina Putri/);
  assert.equal(await tab.eval("document.querySelector('dialog.pf-dlg').open"), false);
  assert.equal(await tab.eval("document.querySelector('#vUtama').hidden"), false, "layar kerja tampil");
  const sisa = (await tab.galat()).filter(x => !/401|403|404|favicon/.test(x)); assert.deepEqual(sisa, [], "tanpa galat konsol atau CSP");
  /* ganti profil kembali ke kisi dan wajib PIN lagi */
  await tab.eval("document.querySelector('#profilKepala [data-ganti]').click()"); await tab.tungguFungsi("document.querySelector('#vUtama').hidden && !document.querySelector('#vProfil').hidden");
  assert.equal(await tab.eval("document.querySelectorAll('#vProfil .pf-sel').length"), 2);
  void p2;
});

uji("L-1 BPBD baru: layar daftar PIC dengan pemberitahuan data pribadi dan persetujuan; PIC tersimpan sebagai kartu draf; atur PIN menuntut foto lebih dulu", async () => {
  const a = await akun({status: "belum_klaim"});
  await tab.ukuran(1200, 800); await masuk(a);
  await tab.tunggu("#vDaftarPic #pfBaru");
  const awal = await tab.eval("document.querySelector('#vDaftarPic').innerText");
  assert.match(awal, /Daftarkan PIC/); assert.match(awal, /Pemberitahuan data pribadi/); assert.match(awal, /Baru ada 0/);
  assert.equal(await tab.eval("document.querySelector('#vUtama').hidden && document.querySelector('#vVerif').hidden"), true, "akun BPBD tidak memakai formulir verifikasi lama");
  /* tanpa persetujuan: ditolak server dengan kalimat polos */
  for (const [k, v] of [["nama", "Sari Dewi"], ["jabatan", "Analis"], ["nip", "198505052010012002"], ["email", "sari@bpbd.go.id"], ["wa", "081234567899"]]) await ketik(`#pfBaru [name=${k}]`, v);
  await tab.eval("document.querySelector('#pfBaru form').requestSubmit()"); await tab.tungguFungsi("/persetujuan/.test(document.querySelector('#pfBaru [data-pesan]').textContent)");
  await tab.eval("document.querySelector('#pfBaru [name=setuju]').click()"); await tab.eval("document.querySelector('#pfBaru form').requestSubmit()");
  await tab.tungguFungsi("document.querySelectorAll('#vDaftarPic .pf-kartu[data-id]').length === 1");
  const kartu = await tab.eval("document.querySelector('#vDaftarPic .pf-kartu[data-id]').innerText");
  assert.match(kartu, /PIC 1/); assert.match(kartu, /kurang foto dan PIN/); assert.match(kartu, /Atur PIN/);
  assert.equal(await tab.eval("!!document.querySelector('#vDaftarPic [data-foto=\"kamera\"]') && !!document.querySelector('#vDaftarPic [data-foto=\"galeri\"]')"), true, "foto dari kamera atau galeri");
  assert.equal(await tab.eval("document.querySelector('#vDaftarPic [data-kamera]').getAttribute('capture')"), "user");
  await tab.eval("document.querySelector('#vDaftarPic [data-atur]').click()"); await tab.tungguFungsi("/foto dulu/.test(document.querySelector('#vDaftarPic .pf-kartu[data-id] [data-pesan]').textContent)");
  assert.equal(await tab.eval("document.querySelector('#pfKirim')?.disabled"), true, "kirim menunggu 3 PIC lengkap");
  assert.equal((await DB.prepare("SELECT count(*) n FROM instansi_profil WHERE akun_id = ?").bind(a.id).first()).n, 1);
  assert.deepEqual((await tab.galat()).filter(x => !/400|401|403|404|409|favicon/.test(x)), []);
});

uji("L-5 lebar ponsel 375 px: kisi profil dan dialog PIN terbaca, tanpa gulir mendatar", async () => {
  const a = await akun({prov: "14"}); await profilAktif(DB, a.id, {nama: "Rina Putri Wulandari Panjang Sekali Namanya"}); await profilAktif(DB, a.id, {baru: true, nama: "Budi"});
  await tab.ukuran(375, 700); await masuk(a); await tab.tunggu("#vProfil .pf-sel");
  const l = await tab.lebihLebar(); assert.ok(l.sw <= l.iw, `gulir mendatar ${l.sw} > ${l.iw}`);
  await tab.eval("document.querySelector('.pf-sel').click()"); await tab.tunggu("dialog.pf-dlg[open]");
  const dl = await tab.eval("(() => { const r = document.querySelector('dialog.pf-dlg').getBoundingClientRect(); return {kiri: r.left, kanan: r.right, lebar: innerWidth}; })()");
  assert.ok(dl.kiri >= 0 && dl.kanan <= dl.lebar, "dialog muat di layar");
  assert.ok(await tab.eval("[...document.querySelectorAll('dialog.pf-dlg .pf-pin input')].every(i => i.getBoundingClientRect().width >= 36 && i.getBoundingClientRect().height >= 44)"), "kotak PIN cukup besar");
  assert.ok(await tab.eval("[...document.querySelectorAll('dialog.pf-dlg button')].every(b => b.getBoundingClientRect().height >= 40)"), "tombol cukup besar");
});

uji("L-7 admin: akun BPBD menunggu menampilkan tiga profil PIC dengan data tersamar, tombol Tampilkan, lalu Setujui mengaktifkan akun dan profil", async () => {
  const a = await akun({status: "menunggu", prov: "15"}), kini = Date.now(), pin = "482915", garam = "h".repeat(16), {hmacPin} = await import("./_profil.mjs");
  for (let i = 1; i <= 3; i++) {
    const id = `${i}`.repeat(16);
    await DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, pin_garam, pin_sha, status, dibuat, diubah) VALUES (?, ?, ?, 'Analis', ?, ?, ?, 1, ?, ?, 'menunggu', ?, ?)`)
      .bind(id, a.id, `Petugas Admin ${i}`, `19850505201001200${i}`, `admin${i}@bpbd.go.id`, `62812345678${i}${i}`, garam, hmacPin(PROFIL_KUNCI, id, garam, pin), kini + i, kini + i).run();
  }
  const isi = `${Date.now() + 6 * 36e5}.${sha256("rahasia-admin").slice(0, 12)}`, sesi = `${isi}.${createHmac("sha256", "kunci-sesi-uji").update(isi).digest("hex")}`;
  await tab.kirim("Network.clearBrowserCookies"); await tab.ukuran(1300, 900); await tab.cookie(base, "sesi_admin", sesi);
  await tab.buka(base + "/admin/instansi#validasi", {tunggu: ".ai-kartu"});
  try { await tab.tunggu(`[data-profil-akun="${a.id}"] tr[data-pic]`, 6000); }
  catch (e) { throw new Error(`${e.message} | halaman: ${(await tab.teks()).replace(/\s+/g, " ").slice(0, 400)} | galat: ${(await tab.galat()).join(" ; ").slice(0, 400)}`); }
  assert.equal(await tab.eval(`document.querySelectorAll('[data-profil-akun="${a.id}"] tr[data-pic]').length`), 3);
  const teks = await tab.eval(`document.querySelector('[data-profil-akun="${a.id}"]').innerText`);
  assert.match(teks, /Profil PIC/); assert.match(teks, /Petugas Admin 1/); assert.ok(!/admin1@bpbd|198505052010012001|6281234567811/.test(teks), "NIP, email, HP tersamar");
  assert.match(teks, /••/);
  await tab.eval(`document.querySelector('[data-profil-akun="${a.id}"] [data-pf="tampil"]').click()`);
  assert.match(await tab.eval(`document.querySelector('[data-profil-akun="${a.id}"]').innerText`), /admin1@bpbd\.go\.id/);
  assert.equal(await tab.eval("/tugas api|Pantau Bencana/i.test(document.body.innerText)"), false);
  await tab.eval(`document.querySelector('.ai-kartu[data-id="${a.id}"] [data-akun="setuju"]').click()`);
  await tab.tungguFungsi(`!document.querySelector('.ai-kartu[data-id="${a.id}"]')`);
  assert.equal((await DB.prepare("SELECT status FROM instansi_akun WHERE id = ?").bind(a.id).first()).status, "aktif");
  assert.equal((await DB.prepare("SELECT count(*) n FROM instansi_profil WHERE akun_id = ? AND status = 'aktif'").bind(a.id).first()).n, 3);
  assert.deepEqual((await tab.galat()).filter(x => !/400|401|403|404|409|favicon/.test(x)), []);
});
