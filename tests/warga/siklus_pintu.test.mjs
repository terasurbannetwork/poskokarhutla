/* Siklus Bencana F6 dan F7 (SK-096, SK-098, SK-099): rute masa depan, pintu, registri, alat MCP kejadian_resmi. UJ-F6-04 (bagian rute), UJ-F7-01 sampai UJ-F7-04.
   worker.js utuh di Miniflare + D1 + R2 sungguhan. Jalankan: node --test tests/warga/siklus_pintu.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16, ASET} from "./_siklus.mjs";

const U = await mulai("uji-sk-pintu");
const {DB, GET, POST, n, kej, api, ip} = U;
// layar yang "hidup" = berkasnya ada di aset; paparan, kaji, gladi sengaja belum ada
for (const f of ["kejadian.js", "pulih.js", "renkon.js", "masadepan.js", "registri.js"]) ASET["/siklus/" + f] = "export const x = 1;";
const [PD, KO, PM] = [await U.staf("Pd Uji", ["pusdalops"]), await U.staf("Ko Uji", ["koordalops"]), await U.staf("Pm Uji", ["pimpinan"])];
const BP = await U.bp(), BP2 = await U.bp({kab: "Garut"}), {SA, TAMU} = U;
const satu = (sql, ...b) => DB.prepare(sql).bind(...b).first();
const geser = (t, d) => new Date(Date.parse(t + "T00:00:00Z") + d * 864e5).toISOString().slice(0, 10);
const HARI = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
const R2 = () => U.mf.getR2Bucket("MEDIA");

const tanggap = async (nama, mulaiTg, kab4 = "3201") => {
  const id = await kej(KO, {nama, mulai: geser(mulaiTg, -1), kab4});
  assert.equal((await POST(PD, `/kejadian/${id}/fase`, {ke: "terverifikasi"})).s, 200);
  const r = await POST(KO, `/kejadian/${id}/fase`, {ke: "tanggap", tanggap_mulai: mulaiTg}); assert.equal(r.s, 200, r.t);
  return id;
};
const K1 = await tanggap("Banjir Bogor hari kedua", geser(HARI, -1));   // hari ke-2
const K2 = await tanggap("Banjir Bogor lama", geser(HARI, -78));         // R3P sisa 12 hari
{
  const t = Date.now(), hitung = '{"yakin":"asumsi-kebijakan"}', jp = id16();
  await DB.prepare("INSERT INTO sk_jitupasna (id, kejadian_id, prov, kab4, status, hitung, dibuat, diubah, oleh) VALUES (?, ?, '32', '3201', 'final', ?, ?, ?, 'staf:uji')").bind(jp, K2, hitung, t, t).run();
  await DB.prepare("INSERT INTO sk_r3p (id, jitupasna_id, kejadian_id, tanggap_mulai, dibuat, diubah, oleh) VALUES (?, ?, ?, ?, ?, ?, 'staf:uji')").bind(id16(), jp, K2, geser(HARI, -78), t, t).run();
  // renkon berlaku sisa 40 hari: tgl_sah 36 bulan sebelum berlaku_sampai
  await DB.prepare("INSERT INTO sk_renkon (id, judul, bencana, prov, kab4, status, tgl_sah, berlaku_sampai, no_penetapan, dibuat, diubah, oleh) VALUES (?, 'Renkon banjir Bogor', 'banjir', '32', '3201', 'berlaku', ?, ?, 'SK 1/2023', ?, ?, 'staf:uji')").bind(id16(), geser(HARI, -900), geser(HARI, 40), t, t).run();
}
const pintu = async (a) => { const r = await GET(a, "/pintu"); assert.equal(r.s, 200, r.t); return r.j; };
const kode = j => j.kartu.map(k => k.kode);

uji("UJ-F7-01: urutan prioritas untuk KO: kejadian (terbaru dulu), R3P sisa 12 hari, renkon segera_habis sisa 40 hari, F6", async () => {
  const j = await pintu(KO);
  assert.equal(j.peran, "KO"); assert.deepEqual(kode(j), ["kejadian", "kejadian", "r3p", "renkon", "registri", "masadepan"]);
  assert.deepEqual(j.kartu.filter(k => k.kode === "kejadian").map(k => [k.href, k.hari_ke]), [[`/siklus/kejadian/${K1}`, 2], [`/siklus/kejadian/${K2}`, 79]]);
  assert.equal(j.kartu.find(k => k.kode === "r3p").urgensi, 12); assert.equal(j.kartu.find(k => k.kode === "renkon").urgensi, 40); assert.equal(j.kartu.find(k => k.kode === "renkon").status, "segera_habis");
  assert.equal(j.kartu.at(-1).yakin, "hipotesis"); assert.match(j.kartu.at(-1).nama, /bukan ramalan kejadian/);
  assert.deepEqual(j.fase_aktif, ["tanggap", "pascabencana", "kesiapsiagaan", "pengurangan_risiko"]);
  assert.ok(j.kartu.every((k, i, a) => i === 0 || a[i - 1].kelas <= k.kelas), "kelas naik");
});

uji("UJ-F7-02: kartu ke layar yang belum hidup tidak tampil; PD dan PM satu pintu menurut peran; registri hanya PD KO PM SA", async () => {
  const j = await pintu(KO); for (const k of ["paparan", "kaji", "gladi"]) assert.ok(!j.kartu.some(x => x.layar === k), `${k} belum hidup`);
  assert.ok(j.kartu.every(k => ["kejadian", "pulih", "renkon", "masadepan", "registri", "publik", "masadepan_publik"].includes(k.layar)));
  for (const [a, p] of [[PD, "PD"], [PM, "PM"], [SA, "SA"]]) { const x = await pintu(a); assert.equal(x.peran, p); assert.ok(kode(x).includes("registri"), p); }
  assert.ok(kode(await pintu(KO)).includes("registri"));
  const bp = await pintu(BP); assert.equal(bp.peran, "BP"); assert.ok(!kode(bp).includes("registri")); assert.ok(!bp.kartu.some(k => k.kode === "gladi"));
  const dasar = (await GET(PM, "/pintu")).h.get("cache-control"); assert.match(dasar, /private/); assert.match(dasar, /no-store/);
});

uji("UJ-F7-02: tamu hanya kartu publik: ringkasan resmi yang dipublikasikan lalu F6 berpil hipotesis; tanpa R3P, renkon, nama, atau data staf", async () => {
  let w = await pintu(TAMU); assert.equal(w.peran, "WG"); assert.deepEqual(kode(w), ["masadepan_publik"], "belum ada ringkasan resmi");
  const pub = await POST(KO, `/kejadian/${K1}/publik`, {publik: true, ringkasan: "Banjir di Kabupaten Bogor, warga mengungsi ke balai desa, bantuan sedang disalurkan."}); assert.equal(pub.s, 200, pub.t);
  w = await pintu(TAMU); assert.deepEqual(kode(w), ["kejadian_publik", "masadepan_publik"]); assert.deepEqual(w.fase_aktif, ["pengurangan_risiko"]);
  assert.equal(w.kartu[0].publik, true); assert.equal(w.kartu[0].href, `/siklus/kejadian/${K1}`); assert.equal(w.kartu[1].yakin, "hipotesis");
  assert.doesNotMatch(JSON.stringify(w), /r3p|renkon|oleh|staf:|dummy|hari_ke/i);
  assert.deepEqual(kode(await pintu({...TAMU, h: {...TAMU.h, cookie: "sesi_staf=palsu"}})), ["kejadian_publik", "masadepan_publik"], "sesi palsu = tamu, bukan galat");
});

uji("UJ-F7-02: BP hanya wilayahnya: kabupaten lain tidak melihat kejadian, R3P, atau renkon Bogor", async () => {
  const bp = await pintu(BP); assert.deepEqual(kode(bp), ["kejadian", "kejadian", "r3p", "renkon", "masadepan"]);
  const lain = await pintu(BP2); assert.deepEqual(kode(lain), ["masadepan"]); assert.deepEqual(lain.fase_aktif, ["pengurangan_risiko"]);
  assert.ok(!JSON.stringify(bp).includes('"oleh"'));
});

uji("UJ-F7-03 dan F7-06: peringatan PDNA menjelang akhir darurat: BNPB 14 hari, BPBD 7 hari; kueri pintu memakai indeks, tanpa tulis", async () => {
  await DB.prepare("UPDATE sk_kejadian SET tanggap_akhir = ? WHERE id = ?").bind(geser(HARI, 10), K1).run();
  let ko = await pintu(KO), bp = await pintu(BP);
  assert.deepEqual(ko.peringatan.map(p => [p.jenis, p.kejadian_id, p.sisa_hari]), [["pdna", K1, 10]], "BNPB: 10 <= 14 hari");
  assert.equal(bp.peringatan.length, 0, "BPBD: 10 > 7 hari belum"); assert.ok(kode(ko).includes("pdna"));
  await DB.prepare("UPDATE sk_kejadian SET tanggap_akhir = ? WHERE id = ?").bind(geser(HARI, 5), K1).run();
  bp = await pintu(BP); assert.equal(bp.peringatan[0].sisa_hari, 5);
  await DB.prepare("UPDATE sk_kejadian SET tanggap_akhir = ? WHERE id = ?").bind(geser(HARI, 40), K1).run();
  assert.equal((await pintu(KO)).peringatan.length, 0, "jauh dari akhir: tidak ada");
  const jejak = await n("sk_jejak"); await pintu(KO); assert.equal(await n("sk_jejak"), jejak, "pintu tidak menulis");
});

uji("UJ-F6-04: masa depan: tamu mendapat ringkasan publik saja; staf per provinsi dari R2; BP kabupaten wilayahnya; contoh hanya SA; menunggu bila belum dibangun", async () => {
  const t = await GET(TAMU, "/masadepan"); assert.equal(t.s, 200); assert.deepEqual(t.j, {v: 1}, "ringkasan publik dari aset");
  assert.deepEqual((await GET(TAMU, "/masadepan?prov=32")).j, {v: 1}, "tamu tidak dapat berkas provinsi");
  assert.equal((await GET(KO, "/masadepan?prov=32")).s, 404); assert.match((await GET(KO, "/masadepan?prov=32")).t, /menunggu/);
  await (await R2()).put("siklus/saji/masa_depan/32.json", JSON.stringify({v: 1, jenis: "masa_depan", yakin: "hipotesis", kab: {3201: {x: 1}}}));
  await (await R2()).put("siklus/saji/masa_depan/tumbuh_32.json", JSON.stringify({v: 1, jenis: "tumbuh"}));
  const k = await GET(KO, "/masadepan?prov=32"); assert.equal(k.s, 200); assert.equal(k.j.yakin, "hipotesis"); assert.match(k.h.get("content-type"), /json/);
  assert.equal((await GET(PM, "/masadepan?prov=32&jenis=tumbuh")).j.jenis, "tumbuh");
  assert.deepEqual((await GET(KO, "/masadepan")).j, {v: 1}, "tanpa prov: ringkasan");
  assert.equal((await GET(BP, "/masadepan?prov=32")).s, 404, "BP wajib menyebut kab4"); assert.equal((await GET(BP, "/masadepan?prov=32&kab4=3201")).s, 200);
  assert.equal((await GET(BP2, "/masadepan?prov=32&kab4=3201")).s, 404, "kabupaten lain"); assert.equal((await GET(BP, "/masadepan?prov=33&kab4=3201")).s, 404, "kab4 bukan provinsi itu");
  for (const q of ["prov=3", "prov=32&kab4=9999", "prov=32&jenis=lain", "contoh=1"]) assert.equal((await GET(KO, "/masadepan?" + q)).s, 400, q);
  assert.equal((await GET(KO, "/masadepan?prov=99&contoh=1")).s, 403, "contoh bukan SA"); assert.equal((await GET(PM, "/masadepan?prov=99&contoh=1")).s, 403); assert.equal((await GET(TAMU, "/masadepan?prov=99&contoh=1")).t.includes("hipotesis"), false);
  assert.equal((await GET(SA, "/masadepan?prov=99&contoh=1")).s, 404, "berkas contoh belum ada");
  await (await R2()).put("siklus/saji/_dummy/masadepan/99.json", JSON.stringify({dummy: true, yakin: "hipotesis"}));
  const c = await GET(SA, "/masadepan?prov=99&contoh=1"); assert.equal(c.s, 200); assert.equal(c.j.dummy, true);
  assert.equal((await GET(SA, "/masadepan?prov=32&contoh=1")).s, 404, "contoh tidak pernah jatuh ke berkas nyata");
});

uji("UJ-F7-02: registri sumber hanya PD KO PM SA; belum dibangun menunggu; BP 403; tamu 401", async () => {
  for (const a of [PD, KO, PM, SA]) assert.equal((await GET(a, "/registri")).s, 404);
  await (await R2()).put("siklus/saji/registri.json", JSON.stringify({v: 1, sumber: [{id: "dibi"}]}));
  for (const a of [PD, KO, PM, SA]) { const r = await GET(a, "/registri"); assert.equal(r.s, 200); assert.equal(r.j.sumber[0].id, "dibi"); }
  assert.equal((await GET(BP, "/registri")).s, 403); assert.equal((await GET(TAMU, "/registri")).s, 401);
});

const mcp = (metode, params) => api("POST", "/mcp", {jsonrpc: "2.0", id: 1, method: metode, params}, ip());
const panggil = async (args) => { const r = await mcp("tools/call", {name: "kejadian_resmi", arguments: args}); assert.equal(r.s, 200, r.t); return r.j.result; };

uji("UJ-F7-04: alat MCP kejadian_resmi: publik tanpa kunci, hanya ringkasan resmi yang dipublikasikan, berlabel keyakinan, tanpa paparan atau korban", async () => {
  assert.ok((await mcp("tools/list")).j.result.tools.some(t => t.name === "kejadian_resmi"), "terdaftar tanpa kunci");
  const dua = await tanggap("Banjir Cianjur tidak publik", geser(HARI, -2), "3203");   // tidak dipublikasikan
  await DB.prepare("UPDATE sk_kejadian SET publik = 1, ringkasan_publik = 'contoh dummy', dummy = 1 WHERE id = ?").bind(dua).run();
  const l = await panggil({}); assert.equal(l.isError, undefined); const j = JSON.parse(l.content[0].text);
  assert.deepEqual(j.kejadian.map(k => k.id), [K1], "hanya publik = 1 dan bukan dummy"); assert.equal(j.kejadian[0].label_keyakinan, "terverifikasi"); assert.equal(j.kejadian[0].wilayah, "Bogor");
  assert.deepEqual(Object.keys(j.kejadian[0]).sort(), ["diperbarui", "fase", "id", "jenis", "kab4", "label_keyakinan", "mulai", "ringkasan", "wilayah"]);
  assert.match(j.catatan, /label_keyakinan/); assert.doesNotMatch(l.content[0].text, /"(dampak|korban_nama|oleh|paparan|sumber|kandidat)"|staf:/i);
  const satuId = JSON.parse((await panggil({id: K1})).content[0].text); assert.equal(satuId.kejadian[0].id, K1);
  for (const id of [K2, dua, "KJ-2026-ZZZZZZZZ"]) { const r = await panggil({id}); assert.equal(r.isError, true, id); assert.match(r.content[0].text, /belum dipublikasikan/); }
  for (const a of [{id: "bukan-id"}, {prov: "32"}, {kab4: "3201"}, {limit: 0}, {limit: 99}]) assert.equal((await panggil(a)).isError, true, JSON.stringify(a));
  assert.equal(await n("sk_jejak", "obyek = 'paparan'"), 0, "alat tidak membuka paparan rinci");
});
