/* Orang hilang publik, bagian layar (OH-04, OH-05, OH-07 sampai OH-11) di Chrome nyata: server stub menyajikan public/ apa adanya dan menjawab rute /api/lapor/hilang*
   dengan bentuk keluaran src/orang_hilang.js. Memeriksa: daftar publik (kartu dewasa dan anak, foto, muat lagi, saringan, 404 = "Belum ada profil"), satu profil bertoken,
   formulir informasi (x-pb, 401 lalu 200), kartu langkah obrolan (kejadian, izin dua tombol sama besar, wali), panel Laporan saya (cabut, perpanjang),
   foto publik turunan tanpa metadata, dan meja petugas (pratinjau, panel Hanya petugas, syarat, aksi). 1440 dan 390 px, tanpa galat konsol dan gulir mendatar.
   Tanpa Chrome: dilewati. Jalan: node --test tests/lapor/hilang_layar.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync, existsSync, statSync} from "node:fs";
import {writeFileSync} from "node:fs";
import path from "node:path";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";
import {petaSitus} from "../bnpb/_peta.mjs";
import {periksaFotoPublik} from "../../src/orang_hilang_foto_publik.js";

const AKAR = path.resolve(new URL("../..", import.meta.url).pathname), PUB = path.join(AKAR, "public"), CHROME = cariChrome();
const CSP = readFileSync(path.join(AKAR, "src/bnpb.js"), "utf8").match(/export const CSP = "([^"]+)"/)[1];
const TIPE = {".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/json"};
const bukanSisi = g => !/favicon\.ico|fonts\.g(oogleapis|static)\.com|ERR_(INTERNET|NAME|CONNECTION)|status of (401|404|409)/.test(g);
const TOKEN = "a1".repeat(16), TOKEN2 = "b2".repeat(16), FOTO = "c3".repeat(16);
const JPEG_1PX = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");

const dewasa = (id, nama) => ({id, nama, panggilan: nama.split(" ")[0], foto: [`/api/lapor/hilang/foto/${FOTO}`], umur: "20 sampai 24", kelamin: "Perempuan", tinggi: "160 sampai 169", pakaian: "kaus merah dan celana jeans", ciri: null,
  lokasi: "Cugenang, Kab. Cianjur", waktu: "2026-11-21", kejadian: {jenis: "gempa", kab: "Kab. Cianjur", mulai: "2026-11-21"}});
const anak = id => ({id, nama: "A. B.", panggilan: null, umur: "anak", pakaian: "baju biru", lokasi: "belum diketahui", waktu: "2026-11-21", kejadian: {jenis: "banjir", kab: "Kab. Cianjur", mulai: "2026-11-20"}});
const BARIS_MEJA = {id: "0123456789abcdef", kelas: "dewasa", dibuat: Date.now(), prioritas: true, pratinjau: {...dewasa(null, "Siti Rahma"), id: null, foto: [`/api/lapor/hilang/foto/${"e5".repeat(16)}`]},
  privat: {tampil: false, nomor_pelapor: "6281234567890", nomor_terverifikasi: false, nomor_dicari: "6281200000000", hubungan: "Kakak", lokasi_terakhir: "Dekat masjid Dusun 2", ciri_laporan: "tahi lalat di pipi"},
  kejadian: {terisi: true, dikonfirmasi: false, usulan: [{id: "f".repeat(16), jenis: "gempa", mulai: "2026-11-21", aktif: true}]}, anak: null, telepon: null, info_terbuka: 0,
  syarat_belum: ["kejadian_belum_dikonfirmasi", "telepon_belum_dicatat", "bendera_mati"], saran_cocok: [{id: "t1", alasan: {kab: true, waktu: true, kelamin: true, umur: true, pakaian: null}, hari: 2}], berakhir_masa_hari: 30};

function stub(mode) {
  const catat = [], jawab = (s, c, o) => { s.writeHead(c, {"content-type": "application/json"}); s.end(JSON.stringify(o)); };
  const srv = http.createServer((q, s) => {
    const u = new URL(q.url, "http://x"), p = decodeURIComponent(u.pathname), bagian = [];
    q.on("data", d => bagian.push(d)); q.on("end", () => {
      const badan = Buffer.concat(bagian);
      if (q.method !== "GET") catat.push({m: q.method, p, q: u.search, h: q.headers, badan});
      if (p === "/api/peta-situs") return jawab(s, 200, petaSitus());
      if (p === "/data/desa_cari.json") return jawab(s, 200, {kab: {"32.03": "Cianjur", "11.01": "Aceh Selatan"}, baris: []});
      if (p === "/api/lapor/hilang" && q.method === "GET") {
        if (mode.mati) return jawab(s, 404, {galat: "Halaman ini belum dibuka."});
        catat.push({m: "GET", p, q: u.search});
        return u.searchParams.get("kursor") ? jawab(s, 200, {profil: [dewasa(TOKEN2, "Dewi Lestari")], kursor: null}) : jawab(s, 200, {profil: [dewasa(TOKEN, "Siti Rahma"), anak("d4".repeat(16))], kursor: "KUR"});
      }
      if (p === `/api/lapor/hilang/${TOKEN}`) return mode.mati ? jawab(s, 404, {galat: "tidak ada"}) : jawab(s, 200, {profil: dewasa(TOKEN, "Siti Rahma")});
      if (p === `/api/lapor/hilang/foto/${"e5".repeat(16)}`) return jawab(s, 404, {galat: "tidak ada"});   // foto sebelum tayang tidak dilayani (fotoGet)
      if (p.startsWith("/api/lapor/hilang/foto/")) { s.writeHead(200, {"content-type": "image/jpeg"}); return s.end(JPEG_1PX); }
      if (p.startsWith("/api/lapor/hilang/") && q.method === "GET" && p !== "/api/lapor/hilang/saya") return jawab(s, 404, {galat: "tidak ada"});
      if (p === "/api/lapor/hilang/info") return mode.info401 ? jawab(s, 401, {galat: "Masuk dulu dengan kode WhatsApp."}) : jawab(s, 200, {diterima: true, rujukan: "Bila ada orang yang dalam bahaya sekarang, hubungi 112 dan kepolisian terdekat."});
      if (p === "/api/lapor/hilang/saya/cabut") return jawab(s, 200, {id: "x", status: "turun"});
      if (p === "/api/lapor/hilang/saya/perpanjang") return jawab(s, 200, {id: "x", status: "menunggu"});
      if (p === "/api/lapor/hilang/saya/foto") return jawab(s, 200, {id: FOTO, jumlah: 1});
      if (p === "/api/lapor/meja/hilang") return jawab(s, 200, {akun: {jenis: "bnpb", label: "BNPB"}, baris: [BARIS_MEJA],
        temu: [{id: "t1", kondisi: "bingung", ucapan: null, bersama: "petugas", ciri: "perempuan sekitar 22 tahun", lokasi_teks: "Desa Cugenang, Kec. Cugenang", waktu_temu: Date.now() - 864e5, foto_boleh: false, status: "menunggu", nomor_penemu: "6281999999999", nomor_terverifikasi: true}]});
      if (p === "/api/lapor/meja/hilang/info") return jawab(s, 200, {akun: {jenis: "bnpb", label: "BNPB"}, kursor: null, info: [{id: "1".repeat(16), jenis: "orang_ini", pesan: "Saya baik baik saja", tingkat: null, status: "baru", dibuat: Date.now(),
        nomor_pemberi: null, profil: {id: BARIS_MEJA.id, token: TOKEN, kelas: "dewasa", status: "tayang", kab: "Kab. Cianjur", dilaporkan_ambang: true}}]});
      if (/^\/api\/lapor\/meja\/hilang\/[0-9a-f]{16}\/aksi$/.test(p)) return jawab(s, 200, {id: "x"});
      if (p.startsWith("/api/")) return jawab(s, 404, {galat: "belum"});
      if (p === "/__uji/chat.html") { s.writeHead(200, {"content-type": TIPE[".html"], "content-security-policy": CSP}); return s.end('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/inti/tema.css"><link rel="stylesheet" href="/lapor/hilang.css"><body><main id="wadah"></main><script type="module" src="/__uji/chat.js"></script>'); }
      if (p === "/__uji/chat.js") { s.writeHead(200, {"content-type": TIPE[".js"], "content-security-policy": CSP}); return s.end(CHAT_JS); }
      const peta = /^\/lapor\/hilang\/?$/.test(p) ? "/lapor/hilang.html" : /^\/lapor\/h\/[0-9a-f]{32}\/?$/.test(p) ? "/lapor/h/index.html" : p === "/lapor/meja" ? "/lapor/meja.html" : p;
      const f = path.join(PUB, peta.endsWith("/") ? `${peta}index.html` : peta);
      if (!f.startsWith(PUB) || !existsSync(f) || !statSync(f).isFile()) { s.writeHead(404); return s.end(); }
      s.writeHead(200, {"content-type": TIPE[path.extname(f)] || "application/octet-stream", "content-security-policy": CSP}); s.end(readFileSync(f));
    });
  });
  return {srv, catat};
}
/* harness obrolan: kartu() meniru lapor.js (mengganti isi wadah), kirim() dicatat */
const CHAT_JS = `import {kartuOh, panelSaya, tombol112, kartuTemuTerkirim} from "/lapor/hilang_chat.js";
import {kecilkanFoto} from "/lapor/hilang_kartu.js";
const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const ikon = id => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("aria-hidden", "true"); return s; };
const wadah = document.getElementById("wadah"), dikirim = [];
const kartu = (kunci, judul) => { const k = el("section", "lp-langkah"), kp = el("div", "lp-langkah-kepala", judul), isi = el("div", "lp-langkah-isi"); k.append(kp, isi); wadah.replaceChildren(k); return isi; };
const c = {kartu, el, ikon, kirim: o => dikirim.push(o)};
window.__oh = {dikirim, kartuOh: j => kartuOh(j, c), t112: j => { const a = tombol112(j, c); if (a) wadah.prepend(a); return !!a; }, terkirim: () => kartuTemuTerkirim(c, () => dikirim.push({baru: 1})),
  panel: (p, segar) => { wadah.replaceChildren(panelSaya(c, p, () => dikirim.push({segar: p.id}))); },
  async kecil(lebar, tinggi) {
    const cv = document.createElement("canvas"); cv.width = lebar; cv.height = tinggi; const x = cv.getContext("2d");
    for (let i = 0; i < 400; i++) { x.fillStyle = "rgb(" + (i * 7 % 255) + "," + (i * 13 % 255) + "," + (i * 29 % 255) + ")"; x.fillRect(Math.random() * lebar, Math.random() * tinggi, 80, 80); }
    const b = await new Promise(ok => cv.toBlob(ok, "image/jpeg", 0.95)), a = new Uint8Array(await b.arrayBuffer());
    const ex = new TextEncoder().encode("Exif\\0\\0" + "GPS-RAHASIA-".repeat(8)), seg = new Uint8Array(4 + ex.length); seg.set([0xff, 0xe1, (ex.length + 2) >> 8, (ex.length + 2) & 255]); seg.set(ex, 4);
    const g = new Uint8Array(a.length + seg.length); g.set(a.subarray(0, 2)); g.set(seg, 2); g.set(a.subarray(2), 2 + seg.length);
    return new File([g], "foto.jpg", {type: "image/jpeg"});
  },
  async unggah(sel) { const f = await window.__oh.kecil(2400, 1800), dt = new DataTransfer(); dt.items.add(f); const m = wadah.querySelector(sel); m.files = dt.files; m.dispatchEvent(new Event("change", {bubbles: true})); },
};
window.__siap = true;`;

/* penjelajah segmen JPEG: penanda yang ada dan ukuran dari SOF */
function segmen(b) {
  const ada = new Set(); let i = 2, w = 0, h = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break; const m = b[i + 1]; if (m === 0xd9) break;
    if (m === 0xda) { ada.add(m); break; }
    ada.add(m); const len = b.readUInt16BE(i + 2);
    if ((m >= 0xc0 && m <= 0xcf) && ![0xc4, 0xc8, 0xcc].includes(m)) { h = b.readUInt16BE(i + 5); w = b.readUInt16BE(i + 7); }
    i += 2 + len;
  }
  return {ada, w, h};
}

async function jalan(mode, fn) {
  const {srv, catat} = stub(mode);
  await new Promise(ok => srv.listen(0, "127.0.0.1", ok));
  const asal = `http://127.0.0.1:${srv.address().port}`, br = await bukaPeramban(), t = await br.tab();
  try { await fn({t, asal, catat}); } finally { await br.tutup?.(); srv.close(); }
}
/* OH_SS=<folder>: simpan tangkapan layar tiap keadaan untuk ditinjau mata (tidak mengubah hasil uji) */
const foto = async (t, nama) => { if (!process.env.OH_SS) return; const r = await t.kirim("Page.captureScreenshot", {format: "png"}); writeFileSync(path.join(process.env.OH_SS, `${nama}.png`), Buffer.from(r.data, "base64")); };
const cek = async (t, w) => {
  const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar ${sw} > ${iw} @${w}`);
  assert.deepEqual(t.galat().filter(bukanSisi), [], `konsol @${w}`);
  assert.equal(await t.eval("/\\b(NaN|undefined|null)\\b|·/.test(document.querySelector('main').innerText)"), false, "teks mentah bocor");
};

test("daftar publik: kartu dewasa dan anak, muat lagi, saringan, formulir informasi", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({info401: true}, async ({t, asal, catat}) => {
    for (const [w, hh] of [[1440, 900], [390, 844]]) {
      await t.ukuran(w, hh);
      await t.buka(`${asal}/lapor/hilang`, {tunggu: ".oh-profil"});
      await foto(t, `daftar-${w}`);
      assert.equal(await t.eval("document.querySelectorAll('.oh-profil').length"), 2);
      assert.equal(await t.eval("document.querySelectorAll('.oh-profil img').length"), 1, "foto hanya dewasa");
      assert.ok((await t.eval("document.querySelector('.oh-profil.anak .oh-foto').innerText")).includes("Foto tidak ditampilkan"));
      assert.equal(await t.eval("document.querySelector('.oh-profil img').draggable"), false);
      assert.match(await t.eval("document.querySelector('.oh-profil').innerText"), /Masih dicari/);
      assert.match(await t.eval("document.querySelector('.oh-terlihat').innerText"), /Terakhir terlihat di Cugenang, Kab\. Cianjur, 21 Nov 2026/);
      assert.equal(await t.eval("document.querySelector('meta[name=robots]').content"), "noindex, nofollow");
      assert.equal(await t.eval("getComputedStyle(document.querySelector('.oh-profil h2')).fontSize !== ''"), true);
      assert.equal(await t.eval("!document.querySelector('.oh-profil').innerText.match(/[0-9]{9,}/)"), true, "tidak ada nomor telepon di kartu");
      await t.klik("#lagi"); await t.tungguFungsi("document.querySelectorAll('.oh-profil').length === 3");
      assert.equal(await t.eval("document.getElementById('lagi').hidden"), true, "kursor habis");
      const {sw, iw} = await t.lebihLebar(); assert.ok(sw <= iw, `gulir mendatar @${w}`);
    }
    // saringan umur dan kab
    await t.ukuran(1440, 900);
    await t.eval("(() => { const e = document.getElementById('qUmur'); e.value = '23'; e.dispatchEvent(new Event('input', {bubbles: true})); return true; })()");
    await t.tungguFungsi(`document.querySelectorAll('.oh-profil').length === 2`);
    assert.ok(catat.some(c => c.m === "GET" && c.q.includes("umur=23")), "umur dikirim ke server");
    await t.eval("(() => { const e = document.getElementById('qKab'); e.value = 'Cianjur'; e.dispatchEvent(new Event('input', {bubbles: true})); return true; })()");
    await t.tungguFungsi("document.querySelectorAll('#dKab option').length === 2");
    await new Promise(r => setTimeout(r, 600));
    assert.ok(catat.some(c => c.m === "GET" && c.q.includes("kab=32.03")), "kode kab dikirim ke server");
    // formulir informasi: perlu sesi (401) lalu 200
    await t.klik(".oh-info"); await t.tungguFungsi("!!document.querySelector('dialog[open]')");
    assert.equal(await t.eval("document.querySelector('dialog[open]').getAttribute('aria-labelledby') === document.querySelector('dialog[open] h1').id"), true);
    await t.eval("(() => { const a = document.querySelector('dialog[open] textarea'); a.value = 'Dilihat di posko Cugenang tadi pagi'; return true; })()");
    await t.klik("dialog[open] button[type=submit]"); await t.tungguFungsi("/masuk dulu/i.test(document.querySelector('dialog[open] .oh-pesan').innerText)");
    assert.equal(await t.eval("document.querySelector('dialog[open] .oh-pesan a').getAttribute('href')"), "/masuk");
    const p = catat.find(c => c.p === "/api/lapor/hilang/info");
    assert.equal(p.h["x-pb"], "1"); assert.deepEqual(JSON.parse(p.badan), {jenis: "informasi", token: TOKEN, pesan: "Dilihat di posko Cugenang tadi pagi"});
    assert.deepEqual(t.galat().filter(bukanSisi), []);
  });
  await jalan({}, async ({t, asal, catat}) => {
    await t.ukuran(390, 844); await t.buka(`${asal}/lapor/hilang`, {tunggu: ".oh-profil"});
    await t.klik(".oh-bukan-saya"); await t.tungguFungsi("!!document.querySelector('dialog[open]')");
    await t.klik("dialog[open] button[type=submit]"); await t.tungguFungsi("/sudah diterima/.test(document.querySelector('dialog[open]').innerText)");
    assert.match(await t.eval("document.querySelector('dialog[open]').innerText"), /hubungi 112/);
    const p = catat.filter(c => c.p === "/api/lapor/hilang/info").at(-1); assert.equal(JSON.parse(p.badan).jenis, "orang_ini");
  });
});

test("bendera mati: 404 menjadi 'Belum ada profil yang ditampilkan' tanpa galat; satu profil bertoken", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({mati: true}, async ({t, asal}) => {
    await t.ukuran(390, 844);
    await t.buka(`${asal}/lapor/hilang`, {tunggu: ".oh-kosong"});
    assert.match(await t.teks(), /Belum ada profil yang ditampilkan/); await cek(t, 390);
    await t.buka(`${asal}/lapor/h/${TOKEN}`, {tunggu: ".oh-kosong"});
    assert.match(await t.teks(), /Profil ini tidak tampil/); await cek(t, 390);
  });
  await jalan({}, async ({t, asal}) => {
    for (const w of [1440, 390]) {
      await t.ukuran(w, 900); await t.buka(`${asal}/lapor/h/${TOKEN}`, {tunggu: ".oh-profil"});
      assert.match(await t.teks(), /Siti Rahma/); assert.equal(await t.eval("document.querySelector('meta[name=robots]').content"), "noindex, nofollow");
      assert.equal(await t.eval("document.querySelectorAll('meta[property^=\"og:\"]').length"), 0, "tanpa gambar pratinjau berfoto");
      await cek(t, w);
    }
  });
});

test("kartu langkah obrolan: kejadian, izin dua tombol sama besar, wali, 112, terima kasih temu", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({}, async ({t, asal}) => {
    for (const w of [1440, 390]) {
      await t.ukuran(w, 900); await t.buka(`${asal}/__uji/chat.html`); await t.tungguFungsi("window.__siap === true");
      await t.eval(`(() => { window.__oh.kartuOh({status: "cari_kejadian", balasan: "*Hilang karena kejadian apa?*\\nPilih kejadian di Kab. Cianjur yang paling sesuai.", inti: "*Hilang karena kejadian apa?*\\nPilih kejadian di Kab. Cianjur yang paling sesuai.",
        pilihan: ["Gempa bumi, 21 Nov 2026", "<img src=x onerror=alert(1)>, 1 Nov 2026", "Bencana lain yang belum terdaftar", "Bukan karena bencana"], ket: ["Kejadian yang tercatat di wilayah ini", "", "Petugas yang memeriksa kaitannya", "Laporan ini tidak dibuat"]}); return true; })()`);
      await foto(t, `kejadian-${w}`);
      assert.equal(await t.eval("document.querySelectorAll('.oh-kej input[type=radio]').length"), 4);
      assert.equal(await t.eval("document.querySelectorAll('.oh-chat img').length"), 0, "data mesin hanya teks");
      assert.equal(await t.eval("document.querySelector('.lp-utama').disabled"), true, "Lanjut menunggu pilihan");
      await t.eval("document.querySelectorAll('.oh-kej input')[0].click()");
      assert.equal(await t.eval("document.querySelector('.lp-utama').disabled"), false);
      await t.klik(".lp-utama");
      assert.deepEqual(await t.eval("window.__oh.dikirim"), [{teks: "1", tampil: "Gempa bumi, 21 Nov 2026"}]);
      await t.eval(`(() => { window.__oh.dikirim.length = 0; window.__oh.kartuOh({status: "cari_kejadian", inti: "*Hilang karena kejadian apa?*\\nPilih.", pilihan: ["Bencana lain yang belum terdaftar", "Bukan karena bencana"], ket: ["", ""]}); return true; })()`);
      assert.match(await t.teks(), /Belum ada kejadian tercatat di wilayah ini/);
      // izin menampilkan: dua tombol sama bentuk, sama bobot
      await t.eval(`(() => { window.__oh.kartuOh({status: "cari_setuju", inti: "*Izin menampilkan di halaman Orang hilang*\\nPetugas BNPB atau BPBD memeriksa dulu; tidak ada yang tampil otomatis.\\nSaya menyetujui bahwa nama ditampilkan.", pilihan: ["Saya setuju", "Saya tidak setuju"], ket: ["", ""]}); return true; })()`);
      await foto(t, `setuju-${w}`);
      const [a, b] = await t.eval(`[...document.querySelectorAll('.oh-setuju-aksi button')].map(x => { const r = x.getBoundingClientRect(), s = getComputedStyle(x); return [Math.round(r.width), Math.round(r.height), s.backgroundColor, s.color, s.borderColor, s.fontWeight, x.textContent]; })`);
      assert.deepEqual(a.slice(0, 6), b.slice(0, 6), "Setuju dan Tidak setuju sama besar dan sama gaya"); assert.deepEqual([a[6], b[6]], ["Saya setuju", "Saya tidak setuju"]);
      assert.ok(!/rgb\(2\d\d, \d{1,2}, \d{1,2}\)/.test(b[2]), "Tidak setuju bukan tombol bahaya");
      await t.eval("document.querySelectorAll('.oh-setuju-aksi button')[1].click()");
      assert.deepEqual(await t.eval("window.__oh.dikirim"), [{teks: "2", tampil: "Saya tidak setuju"}]);
      assert.equal(await t.eval("[...document.querySelectorAll('.oh-setuju-aksi button')].every(x => x.disabled)"), true, "klik ganda tertahan");
      await t.eval(`(() => { window.__oh.dikirim.length = 0; window.__oh.kartuOh({status: "cari_wali", inti: "*Anda wali anak ini?*\\nUmur di bawah 18 tahun atau belum diketahui.", pilihan: ["Ya, saya orang tua atau wali sah", "Bukan, saya bukan wali"], ket: ["", ""]}); return true; })()`);
      await t.eval("document.querySelectorAll('.oh-setuju-aksi button')[0].click()");
      assert.deepEqual(await t.eval("window.__oh.dikirim"), [{teks: "1", tampil: "Ya, saya orang tua atau wali sah"}]);
      assert.equal(await t.eval("window.__oh.t112({status: 'temu_ucapan', balasan: '*Hubungi 112 sekarang*\\nOrang yang tidak sadar'})"), true);
      assert.equal(await t.eval("document.querySelector('.oh-112').getAttribute('href')"), "tel:112");
      assert.equal(await t.eval("window.__oh.t112({status: 'temu_ucapan', balasan: 'Apa yang ia ucapkan?'})"), false);
      await t.eval("window.__oh.terkirim()"); assert.match(await t.teks(), /tidak akan tampil di halaman publik tanpa izinnya/);
      await foto(t, `profil-${w}`); await cek(t, w);
    }
  });
});

test("Laporan saya: cabut dengan konfirmasi, perpanjang, foto publik turunan tanpa metadata", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({}, async ({t, asal, catat}) => {
    await t.ukuran(390, 844); await t.buka(`${asal}/__uji/chat.html`); await t.tungguFungsi("window.__siap === true");
    await t.eval(`window.__oh.panel({id: "0123456789abcdef", status: "tayang", label: "Tampil di publik", alasan: null, berakhir: Date.UTC(2026, 11, 20), bisa_cabut: true, bisa_perpanjang: false})`);
    assert.match(await t.teks(), /Profil tampil sampai 20 Des 2026|Profil tampil sampai 21 Des 2026/);
    await t.klikTeks(".oh-saya button", "^Cabut persetujuan$"); await t.tungguFungsi("!!document.querySelector('dialog[open]')");
    assert.equal(await t.eval("document.activeElement.textContent"), "Batal", "tombol aman berfokus lebih dulu");
    await t.klikTeks("dialog[open] button", "^Batal$"); await t.tungguFungsi("!document.querySelector('dialog') && [...document.querySelectorAll('.oh-saya button')].every(b => !b.disabled)"); assert.equal(catat.filter(c => c.p.endsWith("/cabut")).length, 0);
    await t.klikTeks(".oh-saya button", "^Cabut persetujuan$"); await t.tungguFungsi("!!document.querySelector('dialog[open]')");
    await t.klikTeks("dialog[open] button", "^Cabut persetujuan$"); await t.tungguFungsi("window.__oh.dikirim.length === 1");
    const c = catat.find(x => x.p === "/api/lapor/hilang/saya/cabut"); assert.equal(c.h["x-pb"], "1"); assert.deepEqual(JSON.parse(c.badan), {id: "0123456789abcdef"});
    assert.match(await t.teks(), /Persetujuan dicabut/);
    await t.eval(`window.__oh.panel({id: "0123456789abcdef", status: "turun", label: "Tidak tampil lagi", alasan: "Masa tayang berakhir", berakhir: null, bisa_cabut: false, bisa_perpanjang: true})`);
    await t.klikTeks(".oh-saya button", "^Perpanjang profil$"); await t.tungguFungsi("/Permintaan diterima/.test(document.body.innerText)");
    assert.ok(catat.some(x => x.p === "/api/lapor/hilang/saya/perpanjang"));
    // foto publik: kecilkan di kanvas ke 800 px JPEG, tanpa EXIF
    await t.eval(`window.__oh.panel({id: "0123456789abcdef", status: "menunggu", label: "Menunggu tinjauan petugas", alasan: null, berakhir: null, bisa_cabut: true, bisa_perpanjang: false})`);
    assert.match(await t.teks(), /dikirim ke penyedia model kecerdasan buatan di luar negeri/);
    await t.eval("window.__oh.unggah('input[type=file]')"); await t.tungguFungsi("/1 dari 3 foto publik terkirim/.test(document.body.innerText)", 20000);
    const f = catat.find(x => x.p === "/api/lapor/hilang/saya/foto"); assert.equal(f.h["x-pb"], "1"); assert.equal(f.h["content-type"], "image/jpeg"); assert.match(f.q, /^\?id=0123456789abcdef$/);
    assert.ok(f.badan.length <= 300 * 1024, `foto ${f.badan.length} byte lewat 300 KB`);
    const {ada, w, h} = segmen(f.badan);
    assert.ok(Math.max(w, h) <= 800 && Math.max(w, h) > 400, `sisi panjang ${w}x${h}`);
    for (const m of [0xe1, 0xe2, 0xed, 0xfe]) assert.ok(!ada.has(m), `penanda 0x${m.toString(16)} (EXIF, XMP, profil warna, IPTC, komentar) tidak boleh ada`);
    assert.ok(!f.badan.includes("GPS-RAHASIA"), "isi EXIF asli tidak ikut");
    assert.equal(periksaFotoPublik(new Uint8Array(f.badan)).galat, undefined, "penjaga Worker menerima turunan ini");
    await cek(t, 390);
  });
});

test("meja petugas: pratinjau persis publik, panel Hanya petugas, syarat tayang, aksi, antrean informasi", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({}, async ({t, asal, catat}) => {
    for (const w of [1440, 390]) {
      await t.ukuran(w, 900);
      // halaman meja penuh butuh banyak data; modulnya dimuat lewat harness yang sama dan dibuka langsung
      await t.buka(`${asal}/__uji/chat.html`); await t.tungguFungsi("window.__siap === true");
      await t.eval(`import("/lapor/meja_hilang.js").then(m => { window.__meja = m; return m.bukaHilangPublik(); })`);
      await t.tungguFungsi("!!document.querySelector('.oh-meja-kartu')");
      await foto(t, `meja-${w}`);
      const teks = await t.eval("document.querySelector('.oh-meja-kartu').innerText");
      assert.match(teks, /Hanya petugas, tidak tampil di publik/); assert.match(teks, /\+6281234567890/); assert.match(teks, /hanya diketik, belum terverifikasi/);
      assert.match(teks, /Kejadian belum dikonfirmasi petugas/); assert.match(teks, /Halaman publik belum dibuka/); assert.match(teks, /Mungkin mirip dengan laporan penemuan/); assert.match(teks, /Ini bukan kepastian/);
      assert.equal(await t.eval("document.querySelector('.oh-meja-kartu > .oh-profil .oh-info') === null"), true, "pratinjau tanpa tombol publik");
      assert.equal(await t.eval("[...document.querySelectorAll('.oh-meja-kartu button')].find(b => b.textContent === 'Tayang').disabled"), true, "Tayang tertahan selama syarat belum terpenuhi");
      await t.tungguFungsi("document.querySelector('.oh-meja-kartu .oh-foto.kosong') !== null");   // foto belum tayang: keterangan, bukan gambar rusak
      await t.eval("(() => { const b = [...document.querySelectorAll('.oh-meja-kartu button')].find(x => x.textContent === 'Konfirmasi kejadian'); b.click(); return true; })()");
      await new Promise(r => setTimeout(r, 500));
      const a = catat.find(x => /\/aksi$/.test(x.p)); assert.equal(a.h["x-pb"], "1"); assert.equal(JSON.parse(a.badan).aksi, "konfirmasi_kejadian");
      // Minta perbaikan tanpa catatan tidak dikirim
      const sebelum = catat.filter(x => /\/aksi$/.test(x.p)).length;
      await t.eval("(() => { [...document.querySelectorAll('.oh-meja-kartu button')].find(x => x.textContent === 'Minta perbaikan').click(); return true; })()");
      assert.match(await t.eval("document.querySelector('.oh-meja-kartu .oh-pesan').textContent"), /Tulis catatan singkat untuk pelapor/);
      assert.equal(catat.filter(x => /\/aksi$/.test(x.p)).length, sebelum);
      // antrean informasi
      await t.klikTeks(".mj-chip-j", "Informasi masuk"); await t.tungguFungsi("/Mengaku orang ini/.test(document.querySelector('dialog.mj-oh').innerText)");
      assert.match(await t.eval("document.querySelector('dialog.mj-oh').innerText"), /Turun sementara: dilaporkan beberapa pihak/);
      await t.eval("(() => { [...document.querySelectorAll('dialog.mj-oh button')].find(x => x.textContent === 'Tandai selesai').click(); return true; })()");
      await new Promise(r => setTimeout(r, 500));
      const b = catat.filter(x => /\/aksi$/.test(x.p)).at(-1); assert.deepEqual(JSON.parse(b.badan), {aksi: "selesai_info", info: "1".repeat(16)});
      await t.eval("document.querySelector('dialog.mj-oh').close()");
    }
  });
});

test("/lapor memuat modul orang hilang tanpa pengecualian; tombol Saya menemukan seseorang ada", {skip: CHROME ? false : "Chrome tidak ada"}, async () => {
  await jalan({}, async ({t, asal}) => {
    for (const w of [1440, 390]) {
      await t.ukuran(w, 900); await t.buka(`${asal}/lapor/`, {tunggu: "[data-aksi=temu]"});
      assert.equal(await t.eval("document.querySelector('[data-aksi=temu]').textContent.trim()"), "Saya menemukan seseorang");
      assert.deepEqual(t.galat().filter(g => /pengecualian|SyntaxError|import/i.test(g)), [], `modul @${w}`);
      assert.equal(await t.eval("typeof document.querySelector('link[href*=\"hilang.css\"]')"), "object");
    }
  });
});
