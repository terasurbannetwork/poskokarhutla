/* Layar Kabar selamat (LA-81), halaman tautan, dan Orang dicari di meja (LA-82): fungsi murni public/lapor/selamat_murni.js, gerbang teks (D126),
   dan pemasangan berkas. Jalankan: node --test tests/lapor/layar_selamat.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {tokenDariJalur, tautanWa, pesanBagikan, badanKabar, badanCari, namaPanggilSah, namaDicariSah, nomorSah, nomor62, waktuWib, aksiCari, labelCari, teksGalat, LABEL_STATUS, TIDAK_BERLAKU} from "../../public/lapor/selamat_murni.js";

const baca = p => fs.readFileSync(new URL(`../../public/lapor/${p}`, import.meta.url), "utf8");
const TOKEN = "a".repeat(64);
const BERKAS = ["selamat.js", "selamat.css", "selamat_murni.js", "meja_cari.js", "s/index.html", "s/s.js", "s/s.css"];

test("gerbang teks D126: kata aman tidak ada di berkas layar fitur ini, tanpa titik tengah, tanpa huruf kapital penuh di teks", () => {
  for (const b of BERKAS) {
    const t = baca(b);
    assert.ok(!/\baman\b/i.test(t), `${b}: kata "aman" dilarang`);
    assert.ok(!t.includes("·"), `${b}: titik tengah dilarang`);
    assert.ok(!/text-transform\s*:\s*uppercase/.test(t), `${b}: tanpa huruf kapital penuh`);
  }
  const idx = baca("index.html"), dari = idx.indexOf("sl-pita"), ke = idx.indexOf("</button>", dari);
  assert.ok(!/\baman\b/i.test(idx.slice(dari, ke)), "kartu beranda tanpa kata aman");
  for (const [k, v] of Object.entries(LABEL_STATUS)) assert.ok(!/\baman\b/i.test(v), k);
});
test("gerbang warna: tanpa literal warna di css fitur ini", () => {
  for (const b of ["selamat.css", "s/s.css"]) assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i.test(baca(b)), `${b}: warna hanya token`);
});
test("status hanya dua, label persis permintaan pemilik", () => {
  assert.deepEqual(LABEL_STATUS, {selamat: "Selamat", butuh_bantuan: "Selamat, butuh bantuan"});
});
test("token dari jalur: path asli, berkas statis dengan ?t=, selain itu kosong", () => {
  assert.equal(tokenDariJalur(`/lapor/s/${TOKEN}`), TOKEN);
  assert.equal(tokenDariJalur(`/lapor/s/${TOKEN}/`), TOKEN);
  assert.equal(tokenDariJalur("/lapor/s/index.html", `?t=${TOKEN}`), TOKEN);
  assert.equal(tokenDariJalur("/lapor/s/index.html", ""), "");
  assert.equal(tokenDariJalur("/lapor/s/abc"), "");
  assert.equal(tokenDariJalur("/lapor/s/<script>alert(1)</script>"), "");
});
test("Bagikan ke WA memakai tautan utuh origin + tautan, teks disandikan", () => {
  const u = tautanWa("https://centurisk97.id/", `/lapor/s/${TOKEN}`, "Budi & Ani", "selamat");
  assert.ok(u.startsWith("https://wa.me/?text="));
  const teks = decodeURIComponent(u.slice("https://wa.me/?text=".length));
  assert.ok(teks.includes(`https://centurisk97.id/lapor/s/${TOKEN}`) && teks.includes("Budi & Ani"));
  assert.ok(!/\baman\b/i.test(pesanBagikan("Budi", "butuh_bantuan", "https://x.id/lapor/s/t")));
  assert.match(pesanBagikan("Budi", "butuh_bantuan", "https://x.id/lapor/s/t"), /selamat, butuh bantuan/);
});
test("nama panggilan: tanpa nomor telepon, nama dicari minimal dua huruf", () => {
  assert.ok(namaPanggilSah("Budi")); assert.ok(!namaPanggilSah("")); assert.ok(!namaPanggilSah("081234567890")); assert.ok(!namaPanggilSah("x".repeat(41)));
  assert.ok(namaDicariSah("Si")); assert.ok(!namaDicariSah("S"));
});
test("badan kirim: kolom kosong tidak ikut, nomor dicari dinormalkan ke 62", () => {
  assert.deepEqual(badanKabar({nama: " Budi ", status: "selamat", kab: "32.01"}), {nama_panggil: "Budi", status: "selamat", kab: "32.01"});
  const b = badanCari({nama: "Ani", kab: "32.01", ciri: "", lokasi: "Pasar", waktu: "", nomorDicari: "0812 0000 0099", hubungan: "Keluarga"});
  assert.deepEqual(b, {nama_dicari: "Ani", kab: "32.01", lokasi_terakhir: "Pasar", hubungan: "Keluarga", nomor_dicari: "6281200000099"});
  assert.deepEqual(badanCari({nama: "Ani", kab: "32.01"}), {nama_dicari: "Ani", kab: "32.01"});
  assert.ok(nomorSah("0812 0000 0011") && !nomorSah("12345") && nomor62("0812-0000-0011") === "6281200000011");
});
test("waktu WIB format Indonesia dari ms, detik, dan ISO", () => {
  const ms = Date.UTC(2026, 10, 24, 7, 5);   // 14.05 WIB
  for (const t of [ms, ms / 1000, new Date(ms).toISOString()]) { const w = waktuWib(t); assert.match(w, /^24 November 2026, 14[.:]05 WIB$/); }
  assert.equal(waktuWib(null), ""); assert.equal(waktuWib("bukan tanggal"), "");
});
test("aksi meja: semua status selain yang sekarang, tutup bisa dibuka lagi", () => {
  assert.deepEqual(aksiCari("buka").map(x => x[0]), ["ditemukan_selamat", "ditemukan_meninggal", "ke_sar", "tutup"]);
  const dariTutup = aksiCari("tutup"); assert.deepEqual(dariTutup[0], ["buka", "Buka lagi"]); assert.ok(!dariTutup.some(x => x[0] === "tutup"));
  assert.equal(labelCari("ke_sar"), "Diteruskan ke tim SAR");
});
test("pesan galat polos: 401 menyuruh minta kode, 404 seragam", () => {
  assert.match(teksGalat(401), /kode/); assert.match(teksGalat(0), /sinyal/); assert.match(teksGalat(429, "", 30), /30 detik/);
  assert.equal(TIDAK_BERLAKU, "Tautan ini tidak ditemukan atau sudah tidak berlaku.");
});
test("pemasangan: kartu beranda memicu dialog, halaman tautan noindex, meja memuat meja_cari", () => {
  const idx = baca("index.html");
  assert.match(idx, /data-buka-selamat/); assert.match(idx, /selamat\.js\?v=\d+/); assert.match(idx, /selamat\.css\?v=\d+/);
  const s = baca("s/index.html"); assert.match(s, /name="robots" content="noindex/); assert.match(s, /no-referrer/);
  assert.match(baca("meja.js"), /from "\.\/meja_cari\.js"/); assert.match(baca("meja.js"), /Orang dicari/);
  assert.ok(!/innerHTML/.test(baca("s/s.js")) && !/innerHTML/.test(baca("meja_cari.js")) && !/innerHTML/.test(baca("selamat.js")), "teks dari server lewat textContent");
});
