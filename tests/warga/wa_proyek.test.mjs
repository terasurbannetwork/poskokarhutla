/* Bot Laporan WA BL-02 (src/wa_proyek.js + bagian Bot Laporan WA di src/hak.js): worker.js utuh di workerd, D1 dan R2 lokal sungguhan.
   Dibuktikan: kunci mesin (T18 lewat gerbang D1 terpisah), buka/ambil proyek P-DDMMYY-NN, tabel transisi ALUR (T9), versi append-only dan balik vN (T8),
   ambang pola Q12, daftar nomor K14 dan himpunan terdaftar (A1), detak, biaya, daftar staf tanpa isian/bahan/wa_sha.
   Jalankan: node --test tests/warga/wa_proyek.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {berantai, siapkan, ADMIN} from "./_bnpb.mjs";
import {badanPanjang} from "./_bantu.mjs";
import "../../src/worker.js";   // worker.js dulu: modul rute saling impor dengannya
import {cekUkuranVersi, BL_JENIS} from "../../src/wa_proyek.js";

const uji = berantai();
const U = await siapkan("uji-wa-proyek", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, mf, DB} = U;
const MESIN = {authorization: "Bearer mesin-rahasia"};
const sha = s => createHash("sha256").update(s).digest("hex");
const A = sha("garam|6281200000001"), B = sha("garam|6281200000002"), C = sha("garam|6281200000003");
const hari = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), HARI = hari();
const AWAL = `P-${HARI.slice(8, 10)}${HARI.slice(5, 7)}${HARI.slice(2, 4)}-`;
const m = (metode, j, b) => api(metode, j, b, MESIN);
const PPTX = s => new Uint8Array([0x50, 0x4b, 3, 4, ...new TextEncoder().encode(s)]), PDF = s => new TextEncoder().encode("%PDF-1.7 " + s);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
async function versi(o, h = MESIN) {
  const f = new FormData();
  for (const k of ["proyek", "n", "wa_sha", "instruksi", "peringatan"]) if (o[k] !== undefined) f.set(k, String(o[k]));
  if (o.isian !== undefined) f.set("isian", new Blob([typeof o.isian === "string" ? o.isian : JSON.stringify(o.isian)], {type: "application/json"}), "isian.json");
  if (o.ubah !== undefined) f.set("ubah", new Blob([JSON.stringify(o.ubah)], {type: "application/json"}), "ubah.json");
  if (o.pptx !== null) f.set("pptx", new Blob([o.pptx ?? PPTX("deck")]), "Laporan Harian 18 Nov.pptx");
  if (o.pdf) f.set("pdf", new Blob([o.pdf]), "x.pdf");
  for (const [k, v] of o.lain ?? []) f.append(k, new Blob([v]), k + ".png");
  const {body, headers} = await badanPanjang(f, h);
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/proyek/versi", {method: "POST", headers, body});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return {s: r.status, j, t};
}
const pasang = (id, status, v = 1, wa = A) => DB.prepare("INSERT INTO bl_proyek (id, wa_sha, jenis, tanggal, status, versi, dibuat, diubah) VALUES (?, ?, 'harian', ?, ?, ?, 1, ?)").bind(id, wa, HARI, status, v, Date.now()).run();

uji("bl rute: tanpa kunci mesin 403, staf tanpa sesi 401", async () => {
  const rute = [["POST", "/api/wa/proyek"], ["POST", "/api/wa/proyek/status"], ["POST", "/api/wa/proyek/versi"], ["GET", "/api/wa/proyek/versi?id=P-010126-01"], ["POST", "/api/wa/proyek/pola"],
    ["GET", "/api/wa/proyek/pola?jenis=harian"], ["GET", "/api/wa/terdaftar"], ["POST", "/api/wa/daftar"], ["POST", "/api/wa/detak"], ["GET", "/api/wa/biaya"], ["POST", "/api/wa/biaya"], ["POST", "/api/wa/biaya/rinci"]];
  for (const [mt, j] of rute) for (const h of [{}, ADMIN, {authorization: "Bearer salah"}, {authorization: "mesin-rahasia"}]) {
    const r = await api(mt, j, mt === "POST" ? {wa_sha: A} : undefined, h); assert.equal(r.s, 403, `${mt} ${j} ${JSON.stringify(h)}`);
  }
  assert.equal((await api("GET", "/api/wa/proyek/daftar")).s, 401);
  assert.equal((await api("GET", "/api/wa/proyek/daftar", undefined, MESIN)).s, 401, "kunci mesin bukan sesi staf");
  assert.equal(await U.n("bl_proyek"), 0);
});

uji("bl proyek: buka atau ambil per nomor, jenis, tanggal; kode P-DDMMYY-NN; bahan tanpa ganda", async () => {
  const a = await m("POST", "/api/wa/proyek", {wa_sha: A, jenis: "harian", tanggal: HARI, bahan: [{wa_id: "41", jenis_bahan: "bmkg_pagi"}, {wa_id: "42"}]});
  assert.equal(a.s, 200, a.t); assert.equal(a.j.proyek.id, AWAL + "01"); assert.equal(a.j.baru, true); assert.equal(a.j.proyek.status, "terbuka"); assert.equal(a.j.bahan_baru, 2);
  const b = await m("POST", "/api/wa/proyek", {wa_sha: A, jenis: "harian", tanggal: HARI, bahan: [{wa_id: "41", jenis_bahan: "bmkg_pagi"}, {wa_id: "43", jenis_bahan: "satgas"}]});
  assert.equal(b.j.proyek.id, AWAL + "01"); assert.equal(b.j.baru, false); assert.equal(b.j.bahan_baru, 1, "wa_id 41 ganda diabaikan");
  assert.deepEqual(b.j.bahan.map(x => x.wa_id).sort(), ["41", "42", "43"]);
  assert.equal((await m("POST", "/api/wa/proyek", {wa_sha: A, jenis: "penanganan", tanggal: HARI})).j.proyek.id, AWAL + "02", "jenis lain = proyek lain");
  assert.equal((await m("POST", "/api/wa/proyek", {wa_sha: B, jenis: "harian", tanggal: HARI})).j.proyek.id, AWAL + "03", "nomor lain = proyek lain (Q6)");
  assert.equal((await m("POST", "/api/wa/proyek", {wa_sha: A, jenis: "banjir_sepekan", tanggal: HARI})).j.proyek.id, AWAL + "04", "paparan banjir sepekan (K42) = jenis sah");
  for (const salah of [{wa_sha: "6281200000001"}, {wa_sha: A.toUpperCase()}, {jenis: "kekeringan"}, {jenis: "../x"}, {tanggal: "2026-02-31"}, {tanggal: "2020-01-01"}, {bahan: [{wa_id: "a b"}]}, {bahan: [{wa_id: "1", jenis_bahan: "BMKG"}]}, {bahan: Array(51).fill({wa_id: "1"})}])
    assert.equal((await m("POST", "/api/wa/proyek", {wa_sha: A, jenis: "harian", tanggal: HARI, ...salah})).s, 400, JSON.stringify(salah).slice(0, 60));
  const g = await m("POST", "/api/wa/proyek", {id: AWAL + "01", wa_sha: A}); assert.equal(g.s, 200); assert.equal(g.j.bahan.length, 3);
  assert.equal((await m("POST", "/api/wa/proyek", {id: AWAL + "01", wa_sha: B})).s, 404, "proyek orang lain = 404");
  assert.equal((await m("POST", "/api/wa/proyek", {id: "P-010101-77"})).s, 404);
  assert.equal((await m("POST", "/api/wa/proyek", {id: "P-1"})).s, 400);
  /* proyek final tidak dibuka lagi: buka ulang membuat proyek baru */
  await DB.prepare("UPDATE bl_proyek SET status = 'final', versi = 1 WHERE id = ?").bind(AWAL + "03").run();
  const baru = await m("POST", "/api/wa/proyek", {wa_sha: B, jenis: "harian", tanggal: HARI});
  assert.equal(baru.j.proyek.id, AWAL + "05", "nomor 04 sudah dipakai proyek banjir_sepekan di atas"); assert.equal(baru.j.baru, true);
});

/* ALUR "Status proyek", ditulis ulang di sini dari dokumen (bukan diimpor dari src) supaya uji tidak menyalin galat kode */
const BOLEH = {terbuka: ["bertanya", "membangun", "batal", "kedaluwarsa"], bertanya: ["terbuka", "membangun", "batal", "kedaluwarsa"],
  membangun: ["draf", "terbuka", "bertanya", "batal", "kedaluwarsa"], draf: ["membangun", "final", "batal", "kedaluwarsa"], final: ["ditutup"], ditutup: [], batal: [], kedaluwarsa: []};
const STATUS = Object.keys(BOLEH);
uji("T9 transisi status: semua pasangan sesuai ALUR, di luar tabel 409, syarat versi", async () => {
  let i = 0;
  for (const dari of STATUS) for (const ke of STATUS) {
    const id = `P-010125-${String(++i).padStart(2, "0")}`; await pasang(id, dari, 1);
    const r = await m("POST", "/api/wa/proyek/status", {id, ke}), ok = BOLEH[dari].includes(ke) && !(dari === "membangun" && ["terbuka", "bertanya"].includes(ke));
    assert.equal(r.s, ok ? 200 : 409, `${dari} -> ${ke}: ${r.t}`);
    assert.equal((await DB.prepare("SELECT status FROM bl_proyek WHERE id = ?").bind(id).first()).status, ok ? ke : dari);
  }
  /* versi 0: draf dan final ditolak; membangun mundur ke terbuka/bertanya boleh */
  await pasang("P-020125-01", "membangun", 0); await pasang("P-020125-02", "membangun", 0); await pasang("P-020125-03", "membangun", 0);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-020125-01", ke: "draf"})).s, 409);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-020125-02", ke: "terbuka"})).s, 200);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-020125-03", ke: "bertanya"})).s, 200);
  /* ditutup ke draf (contoh RENCANA-UJI T9) ditolak; drive_url hanya saat ditutup dan hanya Drive Google */
  await pasang("P-030125-01", "final", 2);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "ditutup", drive_url: "https://contoh.id/x"})).s, 400);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "final", drive_url: "https://drive.google.com/drive/folders/abc"})).s, 400);
  const t = await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "ditutup", drive_url: "https://drive.google.com/drive/folders/abc"});
  assert.equal(t.s, 200, t.t); assert.equal(t.j.proyek.drive_url, "https://drive.google.com/drive/folders/abc"); assert.equal(t.j.proyek.dari, "final");
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "draf"})).s, 409);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "selesai"})).s, 400);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-099999-01", ke: "batal"})).s, 404);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id: "P-030125-01", ke: "ditutup", wa_sha: B})).s, 404, "pemegang lain");
});

uji("T8 versi append-only: n berurutan, n lama 409, balik v2 = versi baru, v2 tidak berubah, berkas terbaca", async () => {
  const id = AWAL + "01";
  await m("POST", "/api/wa/proyek/status", {id, ke: "membangun"});
  assert.equal((await versi({proyek: id, n: 1, pptx: PPTX("v1")})).s, 400, "v1 tanpa isian");
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}, pptx: null})).s, 400, "tanpa pptx");
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}, pptx: new TextEncoder().encode("bukan zip")})).s, 400);
  assert.equal((await versi({proyek: id, n: 1, isian: "{rusak"})).s, 400);
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}, lain: [["pratinjau-1", new Uint8Array([1, 2])]]})).s, 400, "png palsu");
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}, lain: [["sisipan", PNG]]})).s, 400, "medan asing");
  assert.equal((await versi({proyek: id, n: 2, isian: {a: 1}})).s, 400, "melompat");
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}, wa_sha: B})).s, 404, "pemegang lain");
  assert.equal((await versi({proyek: id, n: 1, isian: {a: 1}}, {})).s, 403);
  const v1 = await versi({proyek: id, n: 1, isian: {medan: [{medan: "sorti", nilai: 14}]}, pptx: PPTX("v1"), pdf: PDF("v1"), instruksi: "buat harian", lain: [["pratinjau-1", PNG], ["pratinjau-2", PNG]]});
  assert.equal(v1.s, 200, v1.t); assert.deepEqual(v1.j.berkas.sort(), ["Laporan Harian 18 Nov.pdf", "Laporan Harian 18 Nov.pptx", "isian.json", "pratinjau-1.png", "pratinjau-2.png"]);
  assert.equal((await m("POST", "/api/wa/proyek/status", {id, ke: "draf"})).s, 200);
  const ulang = await versi({proyek: id, n: 1, isian: {lain: 1}, pptx: PPTX("timpa")}); assert.equal(ulang.s, 409, "v1 tidak bisa ditimpa");
  await m("POST", "/api/wa/proyek/status", {id, ke: "membangun"});
  assert.equal((await versi({proyek: id, n: 2, pptx: PPTX("v2")})).s, 400, "revisi tanpa ubah");
  const ubah2 = [{op: "ganti_teks", slide: 2, shape: "s2_judul", teks_lama: "A", teks_baru: "B"}];
  assert.equal((await versi({proyek: id, n: 2, ubah: ubah2, pptx: PPTX("v2"), pdf: PDF("v2"), instruksi: "judul jadi B"})).s, 200);
  const sebelum = await m("GET", `/api/wa/proyek/versi?id=${id}&n=2`);
  /* balik v2: mesin membuat v3 dengan isi v2; rute hanya menambah */
  const v3 = await versi({proyek: id, n: 3, ubah: sebelum.j.ubah, pptx: PPTX("v2"), pdf: PDF("v2"), instruksi: "balik v2"}); assert.equal(v3.s, 200, v3.t);
  const sesudah = await m("GET", `/api/wa/proyek/versi?id=${id}&n=2`);
  assert.deepEqual(sesudah.j.versi, sebelum.j.versi, "baris v2 tidak berubah"); assert.deepEqual(sesudah.j.ubah, ubah2);
  const l = await m("GET", `/api/wa/proyek/versi?id=${id}`); assert.deepEqual(l.j.versi.map(v => v.n), [1, 2, 3]); assert.equal(l.j.proyek.versi, 3);
  assert.equal(l.j.versi[2].instruksi, "balik v2"); assert.equal(l.j.versi[0].ubah_r2, null);
  const d1 = await m("GET", `/api/wa/proyek/versi?id=${id}&n=1`);
  assert.deepEqual(d1.j.isian, {medan: [{medan: "sorti", nilai: 14}]}); assert.equal(d1.j.berkas.length, 5);
  const unduh = await mf.dispatchFetch(`http://bnpb.lokal/api/wa/proyek/versi?id=${id}&n=1&berkas=${encodeURIComponent("Laporan Harian 18 Nov.pptx")}`, {headers: MESIN});
  assert.equal(unduh.status, 200); assert.equal(new TextDecoder().decode(new Uint8Array(await unduh.arrayBuffer()).slice(4)), "v1", "v1 tetap isi aslinya");
  assert.equal(unduh.headers.get("cache-control"), "private, no-store");
  assert.equal((await m("GET", `/api/wa/proyek/versi?id=${id}&n=1&berkas=../../x`)).s, 404);
  assert.equal((await m("GET", `/api/wa/proyek/versi?id=${id}&n=9`)).s, 404);
  assert.equal((await m("GET", `/api/wa/proyek/versi?id=${id}&n=0`)).s, 400);
  /* proyek final: versi baru ditolak */
  await m("POST", "/api/wa/proyek/status", {id, ke: "draf"}); await m("POST", "/api/wa/proyek/status", {id, ke: "final"});
  assert.equal((await versi({proyek: id, n: 4, ubah: [], pptx: PPTX("v4")})).s, 409);
  assert.equal(await U.n("bl_versi", `proyek_id = '${id}'`), 3);
});

const R2 = await mf.getR2Bucket("MEDIA");
const kunciR2 = async awal => (await R2.list({prefix: awal, limit: 100})).objects.map(o => o.key).sort();
uji("versi atomik: batch D1 gagal membersihkan berkas, ulang n sama berhasil; dua n sama bersamaan satu menang tanpa sisa", async () => {
  const id = "P-050125-01"; await pasang(id, "membangun", 0);
  /* pemenang balapan yang sudah menulis baris v1 (proyek.versi masih 0): INSERT kalah PK -> 409 dan berkas percobaan ini dihapus */
  await DB.prepare("INSERT INTO bl_versi (proyek_id, n, dibuat) VALUES (?, 1, 1)").bind(id).run();
  const kalah = await versi({proyek: id, n: 1, isian: {a: 1}, pdf: PDF("x"), lain: [["pratinjau-1", PNG]]});
  assert.equal(kalah.s, 409, kalah.t); assert.deepEqual(await kunciR2(`bot-laporan/${id}/`), [], "tanpa sisa berkas");
  await DB.prepare("DELETE FROM bl_versi WHERE proyek_id = ?").bind(id).run();
  const ulang = await versi({proyek: id, n: 1, isian: {a: 2}, pdf: PDF("y"), lain: [["pratinjau-1", PNG]]}); assert.equal(ulang.s, 200, ulang.t);
  const row = await DB.prepare("SELECT pptx_r2, isian_r2, pdf_r2 FROM bl_versi WHERE proyek_id = ? AND n = 1").bind(id).first();
  const dasar = row.pptx_r2.slice(0, row.pptx_r2.lastIndexOf("/") + 1);
  assert.match(dasar, new RegExp(`^bot-laporan/${id}/v1-[0-9a-f]{8}/$`));
  assert.deepEqual(await kunciR2(`bot-laporan/${id}/`), [row.isian_r2, row.pdf_r2, row.pptx_r2, dasar + "pratinjau-1.png"].sort());
  assert.deepEqual((await m("GET", `/api/wa/proyek/versi?id=${id}&n=1`)).j.isian, {a: 2}, "GET membaca kunci dari baris");
  /* bersamaan */
  const id2 = "P-050125-02"; await pasang(id2, "membangun", 0);
  const hasil = await Promise.all([1, 2, 3].map(i => versi({proyek: id2, n: 1, isian: {i}, pptx: PPTX("p" + i)})));
  assert.deepEqual(hasil.map(h => h.s).sort(), [200, 409, 409], hasil.map(h => h.t).join(" | "));
  const r2 = await DB.prepare("SELECT pptx_r2, isian_r2 FROM bl_versi WHERE proyek_id = ?").bind(id2).all();
  assert.equal(r2.results.length, 1);
  assert.deepEqual(await kunciR2(`bot-laporan/${id2}/`), [r2.results[0].isian_r2, r2.results[0].pptx_r2].sort(), "hanya berkas pemenang");
  assert.equal((await DB.prepare("SELECT versi FROM bl_proyek WHERE id = ?").bind(id2).first()).versi, 1);
});

/* berdiri sendiri (bukan berantai, tanpa keadaan D1): penjaga ukuran diuji langsung dengan content-length besar dan body kecil, tanpa mengirim 35 MB lewat soket
   (server menjawab 413 sebelum klien selesai kirim = ECONNRESET di Windows); kabel rute dibuktikan lewat 411 dengan body mengalir tanpa content-length */
uji("versi: peringatan dan instruksi berbaris banyak diterima, kendali lain tetap 400 (insiden 18 Nov 2026)", async () => {
  await pasang(AWAL + "60", "membangun", 0);
  const r = await versi({proyek: AWAL + "60", n: 1, wa_sha: A, instruksi: "buat\r\nsaja", peringatan: "Firespot dihitung langsung dari FIRMS.\nIsian diabaikan generator: x", isian: {a: 1}, pdf: PDF("p")});
  assert.equal(r.s, 200, r.t);
  const v = await DB.prepare("SELECT instruksi, peringatan FROM bl_versi WHERE proyek_id = ? AND n = 1").bind(AWAL + "60").first();
  assert.equal(v.peringatan, "Firespot dihitung langsung dari FIRMS.\nIsian diabaikan generator: x"); assert.equal(v.instruksi, "buat\nsaja");
  assert.equal((await versi({proyek: AWAL + "60", n: 2, wa_sha: A, peringatan: "a\u0000b", isian: {a: 1}})).s, 400, "NUL tetap ditolak");
});

test("versi: kiriman lebih dari 35 MB ditolak 413 dari content-length", async () => {
  const rq = cl => new Request("http://bnpb.lokal/api/wa/proyek/versi", {method: "POST", headers: cl == null ? {} : {"content-length": cl}, body: "x"});
  for (const [cl, s] of [[String(35 * 1024 * 1024 + 1), 413], ["999999999999", 413], [String(35 * 1024 * 1024), null], ["1", null], [null, 411], ["-1", 411], ["1e9", 411]]) {
    const r = cekUkuranVersi(rq(cl)); assert.equal(r?.status ?? null, s, String(cl));
  }
  const tanpa = await mf.dispatchFetch("http://bnpb.lokal/api/wa/proyek/versi", {method: "POST", headers: {...MESIN, "content-type": "multipart/form-data; boundary=x"},
    body: new ReadableStream({start(c) { c.enqueue(new TextEncoder().encode("--x--\r\n")); c.close(); }}), duplex: "half"});
  assert.equal(tanpa.status, 411, "rute memakai penjaga: tanpa content-length");
});

uji("pola: ambang 3 kejadian dalam 14 hari dari 2 proyek, sekali diusulkan, putusan pemilik", async () => {
  const L = {slide_judul: "Ringkasan", operasi: "ganti_teks", ringkas: "judul lebih pendek"};
  const pl = (proyek, n, label = L) => m("POST", "/api/wa/proyek/pola", {proyek, n, label: [label]});
  const p1 = AWAL + "01";   // harian, versi 3
  for (const n of [1, 2, 3]) { const r = await pl(p1, n); assert.equal(r.s, 200, r.t); assert.deepEqual(r.j.ambang, [], "satu proyek saja tidak cukup"); }
  assert.equal((await pl(p1, 3)).j.pola[0].hitung, 3, "proyek+versi sama tidak dihitung dua kali");
  await pasang("P-040125-01", "draf", 1, B);
  const r = await pl("P-040125-01", 1, {...L, ringkas: "  Judul  LEBIH pendek "});   // ringkas sama sesudah dinormalkan = pola sama
  assert.equal(r.j.ambang.length, 1); assert.equal(r.j.ambang[0].status, "diusulkan"); assert.equal(r.j.ambang[0].hitung, 4); assert.equal(r.j.ambang[0].contoh.length, 4);
  const id = r.j.ambang[0].id; assert.match(id, /^pl-[0-9a-f]{24}$/);
  await pasang("P-040125-02", "draf", 1, C);
  assert.deepEqual((await pl("P-040125-02", 1, {...L, id})).j.ambang, [], "sudah diusulkan, tidak diusulkan lagi");
  assert.equal((await pl(p1, 9)).s, 400, "n melebihi versi");
  assert.equal((await m("POST", "/api/wa/proyek/pola", {proyek: p1, n: 1, label: [{...L, operasi: "Ganti Teks"}]})).s, 400);
  assert.equal((await m("POST", "/api/wa/proyek/pola", {proyek: p1, n: 1, label: [{...L, jenis: "penanganan"}]})).s, 400);
  assert.equal((await m("POST", "/api/wa/proyek/pola", {proyek: p1, n: 1, label: []})).s, 400);
  assert.equal((await m("POST", "/api/wa/proyek/pola", {id, putusan: "setuju"})).s, 400);
  const a = await m("POST", "/api/wa/proyek/pola", {id, putusan: "aturan"}); assert.equal(a.s, 200); assert.equal(a.j.pola.status, "aturan");
  assert.equal((await m("POST", "/api/wa/proyek/pola", {id, putusan: "ditolak"})).s, 409, "putusan hanya atas usulan");
  const g = await m("GET", "/api/wa/proyek/pola?jenis=harian"); assert.deepEqual(g.j.pola.map(x => [x.id, x.status]), [[id, "aturan"]]);
  assert.equal((await m("GET", "/api/wa/proyek/pola?jenis=x")).s, 400);
  /* ditolak: kejadian tetap dihitung tapi tidak diusulkan lagi selama 30 hari */
  const L2 = {slide_judul: "Peta", operasi: "catatan", ringkas: "tambah sumber peta"};
  await pl(p1, 1, L2); await pl(p1, 2, L2); const u = await pl("P-040125-01", 1, L2); assert.equal(u.j.ambang.length, 1);
  assert.equal((await m("POST", "/api/wa/proyek/pola", {id: u.j.ambang[0].id, putusan: "ditolak"})).j.pola.status, "ditolak");
  const t = await pl("P-040125-02", 1, L2); assert.deepEqual(t.j.ambang, []); assert.equal(t.j.pola[0].status, "ditolak"); assert.equal(t.j.pola[0].hitung, 4);
});

uji("daftar nomor: menunggu, setuju, tolak; terdaftar hanya setuju; setuju tidak turun oleh daftar ulang", async () => {
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: A, status: "menunggu"})).s, 400, "menunggu wajib nama dan instansi");
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: "6281200000001", status: "menunggu", nama: "Ani", instansi: "BPBD Riau"})).s, 400, "nomor mentah ditolak");
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: A, status: "aktif"})).s, 400);
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: A, status: "menunggu", nama: "A\u0007ni", instansi: "BPBD Riau"})).s, 400, "karakter kendali");
  const a = await m("POST", "/api/wa/daftar", {wa_sha: A, status: "menunggu", nama: "Ani", instansi: "BPBD Riau"}); assert.equal(a.s, 200); assert.equal(a.j.status, "menunggu");
  await m("POST", "/api/wa/daftar", {wa_sha: B, status: "menunggu", nama: "Budi", instansi: "BPBD Jambi"});
  assert.deepEqual((await m("GET", "/api/wa/terdaftar")).j.wa_sha, [], "menunggu belum terdaftar");
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: A, status: "setuju"})).j.nama, "Ani", "setuju tanpa nama mempertahankan nama");
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: B, status: "tolak"})).j.status, "tolak");
  const c = await m("POST", "/api/wa/daftar", {wa_sha: C, status: "setuju"}); assert.equal(c.j.status, "setuju"); assert.equal(c.j.nama, null);
  assert.deepEqual((await m("GET", "/api/wa/terdaftar")).j.wa_sha, [A, C].sort());
  const ulang = await m("POST", "/api/wa/daftar", {wa_sha: A, status: "menunggu", nama: "Ani Lain", instansi: "BPBD Lain"});
  assert.equal(ulang.j.status, "setuju"); assert.equal(ulang.j.berubah, false); assert.equal(ulang.j.nama, "Ani");
  const lagi = await m("POST", "/api/wa/daftar", {wa_sha: B, status: "menunggu", nama: "Budi", instansi: "BPBD Jambi"});
  assert.equal(lagi.j.status, "tolak", "ditolak kurang dari 30 hari tetap tolak"); assert.equal(lagi.j.diam, true); assert.equal(lagi.j.berubah, false);
  assert.ok(lagi.j.tolak_sampai > Date.now() + 29 * 864e5);
  assert.equal((await m("POST", "/api/wa/daftar", {wa_sha: B, status: "tolak"})).j.status, "tolak");
  const t0 = (await DB.prepare("SELECT dibuat FROM bl_daftar WHERE wa_sha = ?").bind(B).first()).dibuat;
  assert.ok(Date.now() - t0 < 60e3, "tolak ulang tidak memperpanjang jendela, dibuat = putusan tolak pertama");
  await DB.prepare("UPDATE bl_daftar SET dibuat = dibuat - 31 * 86400000 WHERE wa_sha = ?").bind(B).run();
  const sesudah = await m("POST", "/api/wa/daftar", {wa_sha: B, status: "menunggu", nama: "Budi", instansi: "BPBD Jambi"});
  assert.equal(sesudah.j.status, "menunggu", "sesudah 30 hari boleh mendaftar lagi"); assert.equal(sesudah.j.diam, undefined);
});

uji("detak dan biaya: sebelumnya dikembalikan, biaya ditambah bukan ditimpa", async () => {
  const d = await m("POST", "/api/wa/detak", {mesin: "gateway"}); assert.equal(d.s, 200); assert.equal(d.j.sebelumnya, null);
  const e = await m("POST", "/api/wa/detak", {mesin: "gateway"}); assert.equal(e.j.sebelumnya, d.j.terakhir);
  assert.equal((await m("POST", "/api/wa/detak", {mesin: "Gate Way"})).s, 400);
  assert.equal((await m("GET", "/api/wa/biaya?tanggal=2026-11-18")).j.usd_mikro, 0);
  assert.equal((await m("POST", "/api/wa/biaya", {tanggal: "2026-11-18", usd_mikro: 1250000})).j.usd_mikro, 1250000);
  assert.equal((await m("POST", "/api/wa/biaya", {tanggal: "2026-11-18", usd_mikro: 250000})).j.usd_mikro, 1500000);
  assert.equal((await m("GET", "/api/wa/biaya?tanggal=2026-11-18")).j.usd_mikro, 1500000);
  for (const u of [0, -5, 1.5, "10", 6e7]) assert.equal((await m("POST", "/api/wa/biaya", {tanggal: "2026-11-18", usd_mikro: u})).s, 400, String(u));
  assert.equal((await m("GET", "/api/wa/biaya?tanggal=x")).s, 400);
});

uji("pemantau biaya /admin/biaya-bot: rinci mesin ke R2, ringkas admin saja dengan harian D1", async () => {
  assert.equal((await api("GET", "/api/wa/biaya/ringkas")).s, 401, "tanpa sesi admin");
  assert.equal((await m("GET", "/api/wa/biaya/ringkas")).s, 401, "kunci mesin bukan admin");
  const kosong = await api("GET", "/api/wa/biaya/ringkas", undefined, ADMIN); assert.equal(kosong.s, 200, kosong.t); assert.equal(kosong.j.rinci, null, "mesin belum mengirim");
  await m("POST", "/api/wa/biaya", {usd_mikro: 2500000});
  const sah = {bulan: {"2026-11": 42.77}, kegiatan: {"2026-11": {laporan: 37.29, rapikan: 0.06}}, proyek: {"P-191126-06": {usd: 27.2, waktu: Date.now() - 1000}}};
  const k = await m("POST", "/api/wa/biaya/rinci", sah); assert.equal(k.s, 200, k.t);
  for (const salah of [{...sah, bulan: {"2026-13": 1}}, {...sah, bulan: {"2026-11": -1}}, {...sah, bulan: {"2026-11": "1"}}, {...sah, kegiatan: {"2026-11": {"Laporan!": 1}}},
    {...sah, proyek: {"6281200000001": {usd: 1, waktu: 1}}}, {...sah, proyek: {"P-191126-06": {usd: 1, waktu: 1.5}}}, {...sah, bulan: []}, {...sah, proyek: Object.fromEntries(Array.from({length: 201}, (_, i) => [`P-191126-${String(i % 100).padStart(2, "0")}${i >= 100 ? "x" : ""}`, {usd: 1, waktu: 1}]))}])
    assert.equal((await m("POST", "/api/wa/biaya/rinci", salah)).s, 400, JSON.stringify(salah).slice(0, 80));
  for (const salah of [{...sah, kegiatan: {"2026-11": {laporan: "1"}}}, {...sah, bulan: {"2026-11": 1e6 + 1}}])
    assert.equal((await m("POST", "/api/wa/biaya/rinci", salah)).s, 400, JSON.stringify(salah).slice(0, 80));
  assert.equal((await m("POST", "/api/wa/biaya/rinci", {...sah, isi: "x".repeat(70000)})).s, 413, "badan lewat 64 KB ditolak");
  const r = await api("GET", "/api/wa/biaya/ringkas", undefined, ADMIN); assert.equal(r.s, 200, r.t);
  assert.deepEqual(r.j.rinci.kegiatan, sah.kegiatan); assert.equal(r.j.rinci.proyek["P-191126-06"].usd, 27.2); assert.ok(r.j.rinci.diperbarui > 0);
  assert.equal(r.j.hari_ini, HARI); assert.ok(r.j.harian.some(x => x.tanggal === HARI && x.usd_mikro >= 2500000), "harian dari D1 bl_biaya");
  assert.ok(r.j.harian.every(x => x.tanggal >= r.j.dari), "hanya 90 hari terakhir");
  assert.ok(!JSON.stringify(r.j).includes("wa_sha"));
});

uji("daftar staf /pelaporan: sesi staf saja, tanpa isian, bahan, wa_sha; nama pemegang dari daftar setuju", async () => {
  const TOK = "e".repeat(64), TOK_LUAR = "f".repeat(64);
  for (const [id, un, tok, peran] of [["f1f1f1f1f1f1f1f1", "pusdalopsb", TOK, '["pusdalops"]'], ["f2f2f2f2f2f2f2f2", "kampusb", TOK_LUAR, '["kemitraan"]']])
    await DB.batch([DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
      VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, "2000" + id.slice(1, 2) + "000", un + "@b.id", "6281200000" + id.slice(1, 2), peran),
      DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha(tok), id, Date.now() + 3600e3)]);
  assert.equal((await api("GET", "/api/wa/proyek/daftar", undefined, {cookie: "sesi_staf=" + TOK_LUAR})).s, 403, "peran lain");
  const r = await api("GET", "/api/wa/proyek/daftar", undefined, {cookie: "sesi_staf=" + TOK}); assert.equal(r.s, 200, r.t);
  assert.equal((await api("GET", "/api/wa/proyek/daftar", undefined, ADMIN)).s, 200, "admin boleh");
  for (const s of [A, B, C, "isian", "bahan", "wa_sha", "bot-laporan/"]) assert.ok(!r.t.includes(s), `bocor: ${s.slice(0, 12)}`);
  assert.ok(r.j.proyek.length >= 4);
  for (const p of r.j.proyek) assert.deepEqual(Object.keys(p).sort(), ["dibuat", "diubah", "drive_url", "id", "jenis", "pemegang", "status", "tanggal", "versi"]);
  const p1 = r.j.proyek.find(p => p.id === AWAL + "01"); assert.equal(p1.pemegang, "Ani"); assert.equal(p1.status, "final"); assert.equal(p1.versi, 3);
  assert.equal(r.j.proyek.find(p => p.id === AWAL + "03").pemegang, "Pemakai terdaftar", "nomor tanpa daftar setuju");
  assert.deepEqual(r.j.detak.map(d => d.mesin), ["gateway"]);
  assert.equal(r.h.get("cache-control"), "no-store");
});

test("jenis proyek bot: laporan khusus gempa sah (K46)", () => {
  assert.ok(BL_JENIS.includes("gempa"), "gempa ada di BL_JENIS");
  assert.ok(!BL_JENIS.includes("kekeringan"), "kekeringan belum punya generator bot");
});
