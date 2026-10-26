/* SP-010: enam keadaan standar (PRD §9.2.1, DS §3.0) dengan DOM tiruan minimal: kalimat hanya dari keadaan.js, bentuk dan ARIA terkunci. */
import test from "node:test";
import assert from "node:assert/strict";

class Simpul {
  constructor(tag) { this.tag = tag; this.attr = {}; this.anak = []; this.pendengar = {}; this._teks = ""; this.className = ""; }
  setAttribute(k, v) { this.attr[k] = String(v); }
  getAttribute(k) { return this.attr[k] ?? null; }
  append(...a) { this.anak.push(...a); }
  addEventListener(j, f) { (this.pendengar[j] ||= []).push(f); }
  click() { (this.pendengar.click || []).forEach(f => f({})); }
  set textContent(t) { this._teks = String(t); this.anak = []; }
  get textContent() { return this._teks + this.anak.map(a => typeof a === "string" ? a : a.textContent).join(""); }
  semua(f, hasil = []) { if (f(this)) hasil.push(this); this.anak.forEach(a => a.semua && a.semua(f, hasil)); return hasil; }
}
globalThis.document = {createElement: t => new Simpul(t)};
const K = await import("../../public/pipa/keadaan.js");
const tanpaDilarang = t => assert.doesNotMatch(t, /[—·]/, `em dash atau titik tengah di teks: ${t}`);

test("memuat: kerangka abu aria-busy tanpa teks pemintal", () => {
  const e = K.memuat();
  assert.match(e.className, /sp-kerangka/); assert.equal(e.getAttribute("aria-busy"), "true");
});

test("kosong: kalimat apa yang kosong dan cara mengisinya, di .ad-kosong", () => {
  const e = K.kosong("Belum ada log gelar. Log masuk dari form lapangan.");
  assert.match(e.className, /ad-kosong/); assert.equal(e.textContent, "Belum ada log gelar. Log masuk dari form lapangan.");
});

test("galat: 403 dan 503 punya kalimat tetap, kode HTTP tampil, tombol Coba lagi memanggil ulang", () => {
  let n = 0;
  const g403 = K.galat(403, "", () => n++);
  assert.equal(g403.getAttribute("role"), "alert"); assert.match(g403.className, /ad-galat/);
  assert.match(g403.textContent, /Akunmu tidak punya akses ke data ini/); assert.match(g403.textContent, /403/);
  const tombol = g403.semua(x => x.tag === "button")[0];
  assert.equal(tombol.textContent, "Coba lagi"); tombol.click(); assert.equal(n, 1);
  assert.match(K.galat(503, "x", () => {}).textContent, /Migrasi SIPPA belum diterapkan di basis data/);
  const lain = K.galat(500, "Basis data sibuk", () => {});
  assert.match(lain.textContent, /Basis data sibuk/); assert.match(lain.textContent, /500/);
  [g403, lain].forEach(e => tanpaDilarang(e.textContent));
});

test("galat: status 0 (jaringan) tidak menulis kode HTTP 0", () => {
  const e = K.galat(0, "", () => {});
  assert.doesNotMatch(e.textContent, /\b0\b/); assert.match(e.textContent, /Coba lagi/);
});

test("galat: tanpa fungsi ulang tidak ada tombol (tidak ada tombol mati yang menipu)", () => {
  assert.equal(K.galat(500, "x").semua(x => x.tag === "button").length, 0);
});

test("luring: pita kuning dengan waktu data terakhir, role status", () => {
  const e = K.luring(Date.UTC(2026, 9, 25, 9, 30));
  assert.match(e.className, /ad-spanduk/); assert.match(e.textContent, /^Luring\. Menampilkan data terakhir per .+WIB\.$/);
  assert.equal(e.getAttribute("role"), "status");
  assert.match(K.luring(null).textContent, /^Luring\. Belum ada data tersimpan\.$/);
});

test("basi: pil asumsi-kebijakan 'basi, per <tanggal>'", () => {
  const e = K.basi(Date.UTC(2026, 9, 20, 0, 0));
  assert.match(e.className, /sp-yakin/); assert.match(e.className, /asumsi-kebijakan/); assert.match(e.textContent, /^basi, per .+/);
  assert.match(e.textContent, /^basi, per 20 Okt 2026$/, "tanggal lengkap dengan tahun, tanpa jam");
});

test("galat: kode HTTP tidak diulang bila pesan sudah memuatnya", () => {
  assert.equal((K.galat(500, "HTTP 500", () => {}).textContent.match(/500/g) || []).length, 1);
});

test("menunggu: tanda kosong, pil menunggu, dan alasan satu baris", () => {
  const e = K.menunggu("Harga heli belum diisi pemilik");
  assert.match(e.textContent, /–/); assert.match(e.textContent, /Menunggu/); assert.match(e.textContent, /Harga heli belum diisi pemilik/);
  assert.equal(e.semua(x => /sp-yakin/.test(x.className) && /menunggu/.test(x.className)).length, 1);
});

test("keadaan.js menyisipkan teks lewat textContent, bukan innerHTML", async () => {
  const {readFileSync} = await import("node:fs");
  assert.doesNotMatch(readFileSync(new URL("../../public/pipa/keadaan.js", import.meta.url), "utf8"), /innerHTML|insertAdjacentHTML/);
});
