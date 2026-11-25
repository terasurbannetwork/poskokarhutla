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
  /* satu pintu (KEPUTUSAN-MASUK K16): /instansi mengalihkan tamu ke /admin/masuk?ke=/instansi, form itu mengembalikan ke /instansi */
  await tab.buka(base + "/instansi", {tunggu: "#email"});
  await ketik("#email", a.username); await ketik("#sandi", SANDI); await tab.klik(".ad-tombol-masuk");
  try { await tab.tungguFungsi("location.pathname === '/instansi' && ['vVerif', 'vUtama', 'vGanti', 'vProfil', 'vDaftarPic'].some(v => document.getElementById(v) && !document.getElementById(v).hidden)", 8000); }
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

/* ---------- UP-33..38 di peramban (RENCANA-UJI L-6, L-7, L-8 dan layar kelola PIC): papan aktivasi, meja, kartu Respons, kelola PIC, buku kontak ---------- */
const TANGKAP = process.env.TANGKAP_LAYAR;   // folder tangkapan layar (di luar repo); kosong = tanpa tangkapan
const foto = async nama => { if (!TANGKAP) return; const {mkdirSync, writeFileSync} = await import("node:fs"); mkdirSync(TANGKAP, {recursive: true});
  writeFileSync(path.join(TANGKAP, nama + ".png"), Buffer.from((await tab.kirim("Page.captureScreenshot", {format: "png"})).data, "base64")); };
const sesiAdmin = async () => { const isi = `${Date.now() + 6 * 36e5}.${sha256("rahasia-admin").slice(0, 12)}`, sesi = `${isi}.${createHmac("sha256", "kunci-sesi-uji").update(isi).digest("hex")}`;
  await tab.kirim("Network.clearBrowserCookies"); await tab.cookie(base, "sesi_admin", sesi); };
const tanpaGulirDatar = async () => { const l = await tab.lebihLebar(); assert.ok(l.sw <= l.iw, `gulir mendatar ${l.sw} > ${l.iw}`); };
const bersih = async () => assert.deepEqual((await tab.galat()).filter(x => !/400|401|403|404|409|favicon/.test(x)), [], "tanpa galat konsol");
const HARI = 864e5, MENIT = 6e4;
const PADANG = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.71", kab: "Kota Padang", kecKode: "13.71.01", desa: "Padang Barat"};
let nl = 0;
async function laporan(wilayah, {masuk = Date.now() - 2 * 36e5, status = "baru"} = {}) {
  const nomor = `LA-26112${nl % 10}-${String(10 + ++nl)}`, kerja = {tingkat: "bpbd", isian: {lokasi: {nilai: {lat: -0.9, lon: 100.35, wilayah}}, jenis: {nilai: "banjir"}}, transkrip: []};
  await DB.batch([DB.prepare(`INSERT INTO lapor_sesi (id, wa, status, tingkat, jenis, kab, lat, lon, nomor, token_sha, terkirim, kerja, ringkas, rev, dibuat, diubah) VALUES (?, ?, 'terkirim', 'bpbd', 'banjir', ?, -0.9, 100.35, ?, ?, ?, ?, ?, 0, ?, ?)`)
    .bind("s" + nomor, "628120066" + String(nl).padStart(4, "0"), wilayah.kabKode, nomor, sha256(nomor), masuk, JSON.stringify(kerja), JSON.stringify({wilayah}), masuk, masuk),
    DB.prepare("INSERT INTO lapor_tiket (nomor, sesi, status, diubah) VALUES (?, ?, ?, ?)").bind(nomor, "s" + nomor, status, masuk)]);
  return nomor;
}
const akunKab = async (kab, prov = "13", jenis = "pemkot") => {   // akun BPBD tingkat kab/kota yang bisa dipakai masuk lewat layar
  const id = (++ak).toString(16).padStart(16, "c"), username = `pemkablayar${ak}`, garam = "g".repeat(32);
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, wajib_ganti, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, diputus, dibuat)
    VALUES (?, ?, ?, 'kab', ?, ?, ?, ?, ?, ?, ?, 'aktif', 0, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'b@x.go.id', '6281234567890', 1, 1, 1, 1, 1)`)
    .bind(id, username, jenis, `Pemerintah ${kab}`, `${prov}|${kab}`, JSON.stringify([prov]), prov, kab, garam, sha256(garam + SANDI)).run();
  return {id, username};
};

uji("L-6 papan aktivasi: kolom PIC, status, menunggu admin BNPB, terakhir masuk; kirim ulang tanpa kontak memberi teks salin; tanpa galat dan tanpa gulir mendatar di 1440 dan 375", async () => {
  const kabs = Object.keys(JSON.parse(readFileSync(path.join(AKAR, "public/banjir/data/pusat_kec.json"), "utf8"))).filter(k => k.startsWith("62|")).map(k => k.split("|")[1]).sort(), kab = kabs[0];
  const id = (++ak).toString(16).padStart(16, "d"), kini = Date.now();
  await DB.prepare(`INSERT INTO instansi_akun (id, username, jenis, tingkat, wilayah, kunci_wilayah, cakupan, prov, kab, garam, sandi_sha, status, wajib_ganti, nama, nip, jabatan, unit, email, wa, surat, kartu, dikirim, dibuat)
    VALUES (?, ?, 'pemkab', 'kab', ?, ?, ?, '62', ?, ?, ?, 'menunggu', 0, 'Budi', '198001012005011001', 'Kepala', 'BPBD', 'b@x.go.id', '6281234567890', 1, 1, 1, ?)`).bind(id, "papanlayar" + ak, "BPBD " + kab, `62|${kab}`, JSON.stringify(["62"]), kab, "g".repeat(32), "0".repeat(64), kini).run();
  for (let i = 1; i <= 3; i++) await DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, pin_garam, pin_sha, status, terakhir_masuk, dibuat, diubah) VALUES (?, ?, ?, 'Analis', ?, ?, ?, 1, ?, ?, 'menunggu', ?, ?, ?)`)
    .bind(`${ak}${i}`.padStart(16, "9"), id, `Petugas Papan ${i}`, `1990010${i}`, `e${i}@x.id`, `62899123456${i}`, "b".repeat(16), "b".repeat(64), kini - i * 36e5, kini, kini).run();
  for (const lebar of [1440, 375]) {
    await sesiAdmin(); await tab.ukuran(lebar, 900); await tab.buka(base + "/admin/aktivasi", {tunggu: "tr[data-kunci]"});
    const kunci = `62|${kab}`;
    await tab.tungguFungsi(`!!document.querySelector('tr[data-kunci="${kunci}"]')`);
    const baris = await tab.eval(`document.querySelector('tr[data-kunci="${kunci}"]').innerText`);
    assert.match(baris, /0 dari 3/); assert.match(baris, /ada yang menunggu/); assert.match(baris, /Menunggu admin BNPB/); assert.match(baris, /Tidak ada dalam 120 hari|lalu|baru saja|jam|menit/);
    const kepala = await tab.eval("[...document.querySelectorAll('thead th')].map(t => t.textContent).join('|')");
    for (const k of ["PIC", "Terakhir masuk", "Status"]) assert.ok(kepala.includes(k), k);
    await tab.eval(`document.querySelector('tr[data-kunci="${kunci}"] [data-rinci]').click()`); await tab.tunggu(".av-rinci [data-salin]");
    assert.match(await tab.eval("document.querySelector('.av-rinci').innerText"), /Petugas Papan 1/);
    if (lebar === 1440) {   // server membatasi kirim ulang satu per jam per akun (UP-34): sekali saja
      await tab.eval("document.querySelector('.av-rinci [data-salin]').click()");
      try { await tab.tungguFungsi("!!document.querySelector('.av-rinci .av-salin') || /disalin/.test(document.querySelector('.av-rinci .av-ulang').innerText)"); }
      catch (e) { throw new Error(`${e.message} | ${await tab.eval("document.querySelector('.av-rinci .av-ulang')?.outerHTML")} | ${(await tab.galat()).join(' ; ')}`); }
    }
    assert.ok(!await tab.eval("/NIP|198001/.test(document.querySelector('.av-rinci').innerText)"), "rincian tanpa NIP");
    await tab.eval("document.querySelector('.av-rinci').scrollIntoView()");
    await foto(`papan-aktivasi-${lebar}`); await tanpaGulirDatar(); await bersih();
  }
});

uji("L-7 meja: profil BPBD mengambil laporan dan label Ditangani muncul; staf BNPB melihat kartu PIC bernomor tersamar lalu Tampilkan nomor membuka nomor penuh", async () => {
  const a = await akunKab("Kota Padang"), p1 = await profilAktif(DB, a.id, {nama: "Rina Putri", jabatan: "Kepala Bidang"}), nomor = await laporan(PADANG);
  await DB.prepare("DELETE FROM instansi_sesi_profil").run();
  const pic = await DB.prepare("SELECT wa FROM instansi_profil WHERE id = ?").bind(p1.id).first();
  await tab.ukuran(1440, 900); await masuk(a); await tab.tunggu("#vProfil .pf-sel");
  await tab.eval("document.querySelector('.pf-sel').click()"); await tab.tunggu("dialog.pf-dlg[open]");
  await tab.eval(`(() => { const k = [...document.querySelectorAll('dialog.pf-dlg .pf-pin input')]; "${p1.pin}".split('').forEach((d, i) => { k[i].value = d; k[i].dispatchEvent(new Event('input', {bubbles: true})); }); })()`);
  await tab.klik("#pfOk"); await tab.tungguFungsi("!document.querySelector('#profilKepala').hidden");
  try { await tab.buka(base + "/lapor/meja#daftar", {tunggu: `[aria-label="Buka ${nomor}"]`, ms: 8000}); } catch (e) { throw new Error(`${e.message} | ${(await tab.teks()).replace(/\s+/g, " ").slice(0, 500)} | ${(await tab.galat()).join(" ; ").slice(-900)}`); }
  await tab.klik(`[aria-label="Buka ${nomor}"]`); await tab.tungguFungsi("[...document.querySelectorAll('#rinci button')].some(b => /Saya yang menangani/.test(b.textContent))");
  assert.equal(await tab.eval("/PIC BPBD setempat/.test(document.querySelector('#rinci').innerText)"), false, "BPBD tanpa kartu PIC");
  await tab.klikTeks("#rinci button", "Saya yang menangani");
  await tab.tungguFungsi("/Ditangani: Rina Putri, Kepala Bidang BPBD/.test(document.querySelector('#rinci').innerText)");
  assert.equal(await tab.eval("[...document.querySelectorAll('#rinci button')].some(b => /Saya yang menangani/.test(b.textContent))"), false, "tombol hilang sesudah diambil");
  await foto("meja-bpbd-ditangani"); await bersih();
  /* staf BNPB: kartu PIC tersamar */
  await sesiAdmin(); await tab.buka(base + "/lapor/meja#daftar", {tunggu: `[aria-label="Buka ${nomor}"]`});
  await tab.klik(`[aria-label="Buka ${nomor}"]`); await tab.tunggu("#rinci .mj-pic-baris");
  const teks = await tab.eval("document.querySelector('#rinci .mj-pic').innerText");
  assert.match(teks, /Rina Putri/); assert.ok(!teks.includes(pic.wa), "nomor tersamar"); assert.match(teks, /Ditangani|Tampilkan nomor/);
  assert.match(await tab.eval("document.querySelector('#rinci').innerText"), /Ditangani: Rina Putri/);
  await tab.eval("document.querySelector('#rinci .mj-pic-baris button').click()");
  await tab.tungguFungsi(`document.querySelector('#rinci .mj-pic').innerText.includes("+${pic.wa}")`);
  await foto("meja-bnpb-pic"); await bersih();
  /* 375 */
  await tab.ukuran(375, 800); await tab.buka(base + "/lapor/meja#daftar", {tunggu: `[aria-label="Buka ${nomor}"]`}); await tab.klik(`[aria-label="Buka ${nomor}"]`); await tab.tunggu("#rinci .mj-pic-baris");
  await foto("meja-bnpb-pic-375"); await tanpaGulirDatar();
});

uji("L-8 kartu Respons di pimpinan: BPBD dengan 5 laporan berangka jam dan menit, BPBD dengan kurang dari 5 laporan 'belum cukup data', tanpa nama PIC dan nomor", async () => {
  const kini = Date.now(), t0 = kini - 10 * HARI, SOLOK = {provKode: "13", prov: "Sumatera Barat", kabKode: "13.72", kab: "Kota Solok", kecKode: "13.72.01", desa: "Tanah Garam"}, AGAM = {...SOLOK, kabKode: "13.73", kab: "Kabupaten Agam"};
  await akunKab("Kabupaten Agam"); const a = await akunKab("Kota Solok"), b = await profilAktif(DB, a.id, {nama: "Sari Pimpinan"});
  for (let i = 0; i < 5; i++) { const n = await laporan(SOLOK, {masuk: t0 + i * 1000});
    await DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, profil_id, jenis, rute, objek) VALUES (?, ?, ?, 'meja', ?, ?)").bind(t0 + i * 1000 + (90 + i * 5) * MENIT, a.id, b.id, `POST /api/lapor/meja/${n}/lihat`, n).run(); }
  for (let i = 0; i < 2; i++) await laporan(AGAM, {masuk: t0 + i * 1000});
  for (const lebar of [1440, 375]) {
    await sesiAdmin(); await tab.ukuran(lebar, 900); await tab.buka(base + "/admin/pimpinan", {tunggu: "#app"});
    await tab.tungguFungsi("/Respons laporan warga/.test(document.body.innerText) && /belum cukup data|Belum ada laporan|belum diaktifkan/.test(document.body.innerText)", 15000);
    const kartu = await tab.eval(`(() => { const h = [...document.querySelectorAll('h2, h3')].find(x => /Respons laporan warga/.test(x.textContent)); return (h.closest('section, article, .ex') || h.parentElement).innerText; })()`);
    assert.match(kartu, /Kota Solok/); assert.match(kartu, /1 jam 40 menit/, "median 100 menit jadi 1 jam 40 menit"); assert.match(kartu, /Agam[\s\S]*belum cukup data/);
    assert.ok(!/Sari Pimpinan|62812/.test(kartu), "tanpa nama PIC dan nomor");
    await foto(`pimpinan-respons-${lebar}`); await tanpaGulirDatar(); await bersih();
  }
});

uji("kelola PIC: draf PIC kedua dan form tambah tetap ada sesudah PIC pertama disimpan; 'Muat lebih lama' di log menambah baris tanpa menghapus yang lama", async () => {
  const a = await akunKab("Kota Pariaman"), kini = Date.now(), pin = "482915", garam = "k".repeat(16), {hmacPin} = await import("./_profil.mjs");
  await DB.prepare("UPDATE instansi_akun SET status = 'aktif' WHERE id = ?").bind(a.id).run();
  const dua = [];
  for (let i = 1; i <= 1; i++) { const id = `${ak}${i}`.padStart(16, "7"); dua.push(id);   // satu aktif + dua draf = 3 dari maks 4: form tambah masih ada

    await DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, pin_garam, pin_sha, status, dibuat, diubah) VALUES (?, ?, ?, 'Analis', '19850505201001200' || ?, ?, ?, 1, ?, ?, 'aktif', ?, ?)`)
      .bind(id, a.id, `Kelola ${i}`, i, `k${i}@bpbd.go.id`, `6281299900${i}${i}`, garam, hmacPin(PROFIL_KUNCI, id, garam, pin), kini + i, kini + i).run(); }
  /* PIC aktif dibuat lewat sisipan; dua draf lewat sisipan juga (belum ber-PIN) */
  const draf = [];
  for (let i = 3; i <= 4; i++) { const id = `${ak}${i}`.padStart(16, "7"); draf.push(id);
    await DB.prepare(`INSERT INTO instansi_profil (id, akun_id, nama, jabatan, nip, email, wa, foto, status, dibuat, diubah) VALUES (?, ?, ?, 'Analis', '19850505201001200' || ?, ?, ?, 1, 'draf', ?, ?)`).bind(id, a.id, `Draf ${i}`, i, `d${i}@bpbd.go.id`, `6281288800${i}${i}`, kini + i, kini + i).run(); }
  for (let i = 0; i < 60; i++) await DB.prepare("INSERT INTO instansi_profil_log (waktu, akun_id, profil_id, jenis, rute, objek) VALUES (?, ?, ?, 'meja', ?, ?)").bind(kini - i * 1000, a.id, dua[0], "POST /api/lapor/meja/LA-1/lihat", "LA-1").run();
  await DB.prepare("DELETE FROM instansi_sesi_profil").run();
  await tab.ukuran(1200, 900); await masuk(a); await tab.tunggu("#vProfil .pf-sel");
  await tab.eval("document.querySelector('.pf-sel').click()"); await tab.tunggu("dialog.pf-dlg[open]");
  await tab.eval(`(() => { const k = [...document.querySelectorAll('dialog.pf-dlg .pf-pin input')]; "${pin}".split('').forEach((d, i) => { k[i].value = d; k[i].dispatchEvent(new Event('input', {bubbles: true})); }); })()`);
  await tab.klik("#pfOk"); await tab.tungguFungsi("!document.querySelector('#profilKepala').hidden");
  /* log: muat lebih lama */
  await tab.klik("#profilKepala [data-log]"); await tab.tunggu("#pfLogLagi");
  const sebelum = await tab.eval("document.querySelectorAll('#pfLog tbody tr').length"); await tab.klik("#pfLogLagi");
  await tab.tungguFungsi(`document.querySelectorAll('#pfLog tbody tr').length > ${sebelum}`);
  assert.ok(await tab.eval("document.querySelectorAll('#pfLog tbody tr').length") > sebelum, "baris lama tetap, baris baru bertambah");
  await foto("log-lembaga");
  /* kelola PIC dengan draf tersisa */
  await tab.eval("document.querySelector('#profilKepala [data-ganti]').click()"); await tab.tunggu("#pfTambah"); await tab.klik("#pfTambah"); await tab.tunggu("#pfBaru");
  await tab.tungguFungsi(`document.querySelectorAll('#vDaftarPic .pf-kartu[data-id]').length >= 2 || document.querySelectorAll('.pf-kartu[data-id]').length >= 2`);
  const kartu = async id => tab.eval(`!!document.querySelector('.pf-kartu[data-id="${id}"]')`);
  assert.equal(await tab.eval("document.querySelectorAll('.pf-kartu[data-id]').length"), 3);
  /* ubah draf 4 (belum tersimpan) dan isi form tambah, simpan draf 3: draf 4 dan form tambah tetap */
  await ketik(`.pf-kartu[data-id="${draf[1]}"] [name=nama]`, "Draf Kedua Diedit"); await ketik("#pfBaru [name=nama]", "Calon PIC"); await ketik(`.pf-kartu[data-id="${draf[0]}"] [name=nama]`, "Draf Pertama Disimpan");
  for (const k of ["nip", "email", "wa"]) assert.ok(await tab.eval(`document.querySelector('.pf-kartu[data-id="${draf[0]}"] [name=${k}]').value`), `K14: ${k} draf terisi dari server, tidak perlu diketik ulang`);
  for (const [k, v] of [["nip", "198505052010012003"], ["email", "d3@bpbd.go.id"], ["wa", "081288800033"]]) await ketik(`.pf-kartu[data-id="${draf[0]}"] [name=${k}]`, v);
  await tab.eval(`document.querySelector('.pf-kartu[data-id="${draf[0]}"] form').requestSubmit()`);
  for (let i = 0; i < 40 && (await DB.prepare("SELECT nama FROM instansi_profil WHERE id = ?").bind(draf[0]).first()).nama !== "Draf Pertama Disimpan"; i++) await new Promise(r => setTimeout(r, 100));
  assert.equal((await DB.prepare("SELECT nama FROM instansi_profil WHERE id = ?").bind(draf[0]).first()).nama, "Draf Pertama Disimpan");
  await tab.tungguFungsi(`document.querySelector('.pf-kartu[data-id="${draf[0]}"] [name=nama]')?.value === "Draf Pertama Disimpan"`);   // layar digambar ulang dari server
  assert.equal(await tab.eval(`document.querySelector('.pf-kartu[data-id="${draf[1]}"] [name=nama]').value`), "Draf Kedua Diedit", "draf PIC lain tidak hilang");
  assert.equal(await tab.eval("document.querySelector('#pfBaru [name=nama]').value"), "Calon PIC", "form tambah tidak hilang");
  assert.ok(await kartu(draf[0]));
  await foto("kelola-pic"); await bersih();
});

uji("L-8 buku kontak: kartu PIC bernomor tersamar; rute galat menampilkan 'PIC belum bisa dimuat.'", async () => {
  const a = await akunKab("Kota Payakumbuh"); await profilAktif(DB, a.id, {nama: "Kontak Pic", jabatan: "Kasi"});
  const wa = (await DB.prepare("SELECT wa FROM instansi_profil WHERE akun_id = ?").bind(a.id).first()).wa;
  for (const lebar of [1440, 375]) {
    await sesiAdmin(); await tab.ukuran(lebar, 900); await tab.buka(base + "/admin/kontak", {tunggu: "select[aria-label='Provinsi PIC']"});
    await tab.pilih("select[aria-label='Provinsi PIC']", "13"); await ketik("input[aria-label='Kabupaten atau kota']", "Kota Payakumbuh"); await tab.klikTeks("button", "^Tampilkan PIC$");
    await tab.tungguFungsi("/Kontak Pic/.test(document.body.innerText)");
    const teks = await tab.eval("document.body.innerText"); assert.ok(!teks.includes(wa), "nomor penuh tidak tampil"); assert.match(teks, /x{3,}\d{4}/);
    await foto(`kontak-pic-${lebar}`); await tanpaGulirDatar(); await bersih();
  }
  /* rute galat: cegat fetch ke /api/kontak/admin/pic dengan 500 */
  await tab.eval(`(() => { const asli = window.fetch; window.fetch = (u, o) => String(u).includes("/api/kontak/admin/pic") ? Promise.resolve(new Response("{}", {status: 500})) : asli(u, o); })()`);
  await tab.klikTeks("button", "^Tampilkan PIC$"); await tab.tungguFungsi("/PIC belum bisa dimuat\\./.test(document.body.innerText)");
});
