/* Fungsi murni layar /ai (public/ai/ai.js): render pesan aman, hitung kata, validasi formulir agen, format sumber, paging, pratinjau.
   Tanpa DOM, tanpa jaringan. Jalan: node --test tests/ai/ */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mdKeHtml, esc, hitungKata, labelSuhu, validasiAgen, formatSumber, fmtTanggal, namaAlat, halaman, pratinjau, saring, avatarSah, visibilitasSah, aksiGalat, PESAN_TOLAK, infoPembuat, fmtAngka} from "../../public/ai/ai.js";

const AKAR = new URL("../../", import.meta.url);

test("mdKeHtml menolak XSS: tag, atribut, dan skrip keluar sebagai teks", () => {
  const serang = ['<img src=x onerror="alert(1)">', "<script>alert(1)</script>", "**<svg onload=alert(1)>**", "| a | <b>x</b> |\n|---|---|\n| <iframe> | 1 |", "- <a href=javascript:alert(1)>klik</a>", "`<img>`"];
  for (const s of serang) {
    const h = mdKeHtml(s);
    for (const [tag] of h.matchAll(/<[^>]*>/g))
      assert.match(tag, /^<\/?(p|br|strong|code|ul|ol|li|table|thead|tbody|tr|th|td)>$|^<div class="ai-tabel">$|^<\/div>$/, `tag di luar daftar putih dari "${s}": ${tag}`);
  }
  assert.match(mdKeHtml("<script>"), /&lt;script&gt;/);
  assert.match(mdKeHtml('"kutip"'), /&quot;kutip&quot;/);
});

test("mdKeHtml: tebal, daftar, tabel, dan paragraf", () => {
  assert.equal(mdKeHtml("Ada **412** titik"), "<p>Ada <strong>412</strong> titik</p>");
  assert.equal(mdKeHtml("- satu\n- dua"), "<ul><li>satu</li><li>dua</li></ul>");
  assert.equal(mdKeHtml("1. a\n2. b"), "<ol><li>a</li><li>b</li></ol>");
  const t = mdKeHtml("Ringkas:\n| Provinsi | Titik |\n|---|---:|\n| Riau | 1.204 |\n| Jambi | 87 |");
  assert.match(t, /^<p>Ringkas:<\/p><div class="ai-tabel"><table><thead><tr><th>Provinsi<\/th><th>Titik<\/th><\/tr><\/thead>/);
  assert.match(t, /<tr><td>Riau<\/td><td>1\.204<\/td><\/tr><tr><td>Jambi<\/td><td>87<\/td><\/tr><\/tbody>/);
  assert.equal(mdKeHtml("baris satu\nbaris dua\n\npara dua"), "<p>baris satu<br>baris dua</p><p>para dua</p>");
  assert.equal(mdKeHtml(""), "");
  assert.equal(mdKeHtml(null), "");
});

test("esc meng-escape kelima karakter HTML", () => {
  assert.equal(esc(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
});

test("hitungKata: spasi ganda, baris baru, dan kosong", () => {
  assert.equal(hitungKata("  satu   dua\ntiga\t empat "), 4);
  assert.equal(hitungKata(""), 0);
  assert.equal(hitungKata(undefined), 0);
});

const SAH = {nama: "Analis titik panas", avatar: "otak", suhu: 0.3, instruksi: "Jawab pertanyaan titik panas memakai alat data dan sebut sumber serta tanggalnya selalu.", deskripsi: "", visibilitas: "unit", alat: ["titik_panas"], alih_manusia: false};

test("validasiAgen menerima isian sah", () => {
  assert.deepEqual(validasiAgen(SAH), {ok: true, galat: {}});
  assert.equal(validasiAgen({...SAH, suhu: 0}).ok, true, "suhu 0 sah");
  assert.equal(validasiAgen({...SAH, suhu: 2}).ok, true, "suhu 2 sah");
});

test("validasiAgen MENOLAK isian salah, dengan pesan yang menyebut angkanya", () => {
  const g = (ubah) => validasiAgen({...SAH, ...ubah}).galat;
  assert.ok(g({nama: "  "}).nama);
  assert.ok(g({nama: "x".repeat(81)}).nama);
  assert.ok(g({avatar: "gambar"}).avatar);
  assert.ok(g({suhu: 2.1}).suhu); assert.ok(g({suhu: -0.1}).suhu); assert.ok(g({suhu: ""}).suhu); assert.ok(g({suhu: "abc"}).suhu);
  assert.equal(g({instruksi: ""}).instruksi, "Instruksi sistem wajib diisi.");
  assert.equal(g({instruksi: "satu dua tiga empat lima enam tujuh delapan sembilan"}).instruksi, "Instruksi minimal 10 kata, sekarang 9 kata.");
  assert.ok(g({visibilitas: "publik"}).visibilitas, "publik belum ada di langkah 1");
  assert.ok(g({alat: "titik_panas"}).alat);
  assert.equal(validasiAgen({}).ok, false);
});

test("labelSuhu: batas Fokus, Seimbang, Kreatif", () => {
  assert.deepEqual([0, 0.3, 0.6, 0.7, 1.3, 1.4, 2].map(labelSuhu), ["Fokus", "Fokus", "Fokus", "Seimbang", "Seimbang", "Kreatif", "Kreatif"]);
});

test("formatSumber: kutipan berkas menyebut nama berkas dan tanggal unggah", () => {
  assert.equal(formatSumber({berkas: "Prosedur Pos", ringkas: "laporan sebelum 16.00 WIB", tanggal: "2026-11-05"}), "Berkas Prosedur Pos: laporan sebelum 16.00 WIB, diunggah 5 Nov 2026");
});

test("formatSumber: alat, ringkas, tanggal format Indonesia", () => {
  assert.equal(formatSumber({alat: "titik_panas", ringkas: "412 titik", tanggal: "2026-11-04"}), "Titik panas: 412 titik, 4 Nov 2026");
  assert.equal(formatSumber({alat: "status_wilayah", tanggal: "2026-11-04T06:05:00Z"}), "Status wilayah, 4 Nov 2026 13.05 WIB");
  assert.equal(formatSumber({alat: "cuaca"}), "Cuaca, tanggal data tidak disebut");
  assert.equal(fmtTanggal("2026-01-31"), "31 Jan 2026");
  assert.equal(fmtTanggal("2026-12-31T17:30:00Z"), "1 Jan 2027 00.30 WIB", "pergantian hari di WIB");
  assert.equal(fmtTanggal("bukan tanggal"), "bukan tanggal");
  assert.equal(namaAlat("hukum-bnpb"), "Hukum bnpb");
});

test("halaman: 10 per halaman, dijepit ke rentang sah", () => {
  const d = Array.from({length: 23}, (_, i) => i);
  assert.deepEqual(halaman(d, 1).isi, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(halaman(d, 3), {isi: [20, 21, 22], halaman: 3, total: 3});
  assert.equal(halaman(d, 9).halaman, 3);
  assert.equal(halaman(d, 0).halaman, 1);
  assert.deepEqual(halaman([], 1), {isi: [], halaman: 1, total: 1});
});

test("saring tanpa beda huruf besar, di beberapa kunci", () => {
  const d = [{nama: "Analis Banjir", deskripsi: ""}, {nama: "Hukum", deskripsi: "Peraturan BNPB"}];
  assert.deepEqual(saring(d, "bnpb", ["nama", "deskripsi"]).map(x => x.nama), ["Hukum"]);
  assert.equal(saring(d, "  ", ["nama"]).length, 2);
});

test("pratinjau menyebut alat, gaya, dan alih ke petugas", () => {
  assert.match(pratinjau({}), /Tulis instruksi/);
  const p = pratinjau({...SAH, alat: ["a", "b"], alih_manusia: true});
  assert.match(p, /^Analis titik panas akan bekerja dengan arahan: Jawab pertanyaan/);
  assert.match(p, /2 alat/); assert.match(p, /fokus/); assert.match(p, /operator/);
  assert.match(pratinjau({...SAH, alat: []}), /tidak memakai alat/);
});

test("berkas layar /ai: tanpa titik tengah, tanpa nama lama situs, tanpa innerHTML dari teks mentah", () => {
  for (const f of ["public/ai/index.html", "public/ai/ai.js", "public/ai/ai.css"]) {
    const s = readFileSync(new URL(f, AKAR), "utf8");
    assert.doesNotMatch(s, /·|&middot;/, `${f} memuat titik tengah`);
    assert.doesNotMatch(s, /Pantau Bencana/i, `${f} memuat nama lama situs`);
  }
  const js = readFileSync(new URL("public/ai/ai.js", AKAR), "utf8");
  const tulis = [...js.matchAll(/innerHTML\s*=\s*([^;\n]+)/g)].map(m => m[1].trim());
  for (const t of tulis) assert.match(t, /^(mdKeHtml\(|svg\(|v$)/, `innerHTML diisi dari sumber yang tidak di-escape: ${t}`);
  for (const [, t] of js.matchAll(/\bhtml:\s*([^,}]+)/g)) assert.match(t.trim(), /^svg\(/, `atribut html helper diisi bukan dari svg(): ${t}`);
});

test("avatar dan visibilitas hanya kunci milik sendiri, bukan warisan prototipe", () => {
  for (const v of ["toString", "__proto__", "constructor", "hasOwnProperty"]) {
    assert.equal(avatarSah(v), false, v); assert.equal(visibilitasSah(v), false, v);
    assert.ok(validasiAgen({...SAH, avatar: v}).galat.avatar, `avatar "${v}" harus ditolak`);
    assert.ok(validasiAgen({...SAH, visibilitas: v}).galat.visibilitas, `visibilitas "${v}" harus ditolak`);
  }
  assert.equal(avatarSah("otak"), true); assert.equal(visibilitasSah("semua"), true); assert.equal(avatarSah(null), false);
});

test("aksiGalat: 401 dialihkan sekali per sesi, sesudahnya atau 403 hanya pesan", () => {
  assert.equal(aksiGalat(401, false), "masuk");
  assert.equal(aksiGalat(401, true), "tolak", "401 kedua tidak boleh memantul ke halaman masuk lagi");
  assert.equal(aksiGalat(403, false), "tolak");
  assert.equal(aksiGalat(500, false), "galat");
  assert.equal(PESAN_TOLAK, "Akun ini tidak punya akses ke Asisten AI");
});

test("infoPembuat hanya untuk agen milik staf lain", () => {
  assert.equal(infoPembuat({milik_saya: false, pemilik_nama: "Budi", unit: "BPBD Riau"}), "Dibuat oleh Budi, BPBD Riau");
  assert.equal(infoPembuat({milik_saya: false, pemilik_nama: "Budi"}), "Dibuat oleh Budi");
  assert.equal(infoPembuat({milik_saya: true, pemilik_nama: "Saya"}), null);
  assert.equal(infoPembuat({milik_saya: false}), null);
  assert.equal(infoPembuat(null), null);
});

test("fmtAngka format Indonesia", () => {
  assert.equal(fmtAngka(1234.56), "1.234,6");
  assert.equal(fmtAngka(1234.56, 0), "1.235");
  assert.equal(fmtAngka(0.3), "0,3");
});

test("ai.js tanpa confirm() yang memblokir dan tanpa operator in untuk kunci dari data", () => {
  const js = readFileSync(new URL("public/ai/ai.js", AKAR), "utf8");
  assert.doesNotMatch(js, /\bconfirm\(/, "pakai tanya() berbasis <dialog>");
  assert.doesNotMatch(js, /\sin (AVATAR|VISIBILITAS)\b/, "pakai Object.hasOwn lewat avatarSah/visibilitasSah");
});
