/* KP-08: nomor GLIDE sebagai sk_kejadian_sumber (sumber 'glide') dan pengingat K8. worker.js utuh di Miniflare + D1.
   Jalankan: node --test tests/warga/siklus_glide.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai} from "./_siklus.mjs";
import {glideSah, tanpaGlide} from "../../src/siklus_kejadian.js";

const U = await mulai("uji-sk-glide");
const {DB, GET, POST, kej} = U;
const PD = await U.staf("Pd Glide", ["pusdalops"]), KO = await U.staf("Ko Glide", ["koordalops"]), PM = await U.staf("Pm Glide", ["pimpinan"]);
const tanggap = async (id) => { assert.equal((await POST(KO, `/kejadian/${id}/fase`, {ke: "terverifikasi"})).s, 200); assert.equal((await POST(KO, `/kejadian/${id}/fase`, {ke: "tanggap", tanggap_mulai: "2026-03-03"})).s, 200); };

uji("glideSah: bentuk ketat, huruf kecil dinormalkan, selebihnya ditolak", () => {
  assert.equal(glideSah("EQ-2018-000155-IDN"), "EQ-2018-000155-IDN");
  assert.equal(glideSah(" fl-2026-000012-idn "), "FL-2026-000012-IDN");
  for (const x of ["EQ-2018-155-IDN", "E-2018-000155-IDN", "EQ-18-000155-IDN", "EQ-2018-000155-ID", "EQ-2018-000155-IDNX", "EQ2018000155IDN", "", null, 5, "EQ-2018-000155-IDN; DROP"]) assert.throws(() => glideSah(x), {galat: /GLIDE/});
});
uji("tanpaGlide: tanggap tanpa glide masuk, tanggap dengan glide dan tanpa tanggap keluar", () => {
  const k = [{id: "a", tanggap_mulai: "2026-03-03"}, {id: "b", tanggap_mulai: "2026-03-03"}, {id: "c", tanggap_mulai: null}];
  assert.deepEqual(tanpaGlide(k, {a: [{sumber: "dibi"}], b: [{sumber: "glide"}], c: []}).map(x => x.id), ["a"]);
});
uji("POST glide: simpan, terbaca di detail, idempoten, nomor lain 409, peran dan masukan liar ditolak", async () => {
  const id = await kej(KO, {nama: "Gempa glide", jenis: "gempa", kab4: "3201"});
  assert.equal((await POST(PD, `/kejadian/${id}/glide`, {glide: "EQ-2018-00155-IDN"})).s, 400);
  assert.equal((await POST(PM, `/kejadian/${id}/glide`, {glide: "EQ-2018-000155-IDN"})).s, 403, "PM tidak menulis");
  const r = await POST(PD, `/kejadian/${id}/glide`, {glide: "eq-2018-000155-idn"}); assert.equal(r.s, 201, r.t); assert.equal(r.j.glide, "EQ-2018-000155-IDN");
  const d = await GET(PM, `/kejadian/${id}`); assert.equal(d.s, 200);
  assert.ok(d.j.sumber.some(s => s.sumber === "glide" && s.kode === "EQ-2018-000155-IDN" && s.status === "terpasang"));
  assert.equal((await POST(PD, `/kejadian/${id}/glide`, {glide: "EQ-2018-000155-IDN"})).j.sudah_ada, true);
  assert.equal((await POST(PD, `/kejadian/${id}/glide`, {glide: "EQ-2018-000156-IDN"})).s, 409);
  const lain = await kej(KO, {nama: "Gempa lain", jenis: "gempa", kab4: "3202", mulai: "2026-05-05"});
  assert.equal((await POST(PD, `/kejadian/${lain}/glide`, {glide: "EQ-2018-000155-IDN"})).s, 409, "nomor dipakai kejadian lain");
  assert.equal((await DB.prepare("SELECT count(*) n FROM sk_jejak WHERE obyek_id = ? AND aksi = 'glide'").bind(id).first()).n, 1);
});
uji("pengingat: kejadian tanggap tanpa GLIDE masuk, yang bernomor dan yang belum tanggap tidak", async () => {
  const a = await kej(KO, {nama: "Banjir tanpa glide", kab4: "3203", mulai: "2026-06-01"}), b = await kej(KO, {nama: "Banjir bernomor", kab4: "3204", mulai: "2026-06-02"}), c = await kej(KO, {nama: "Banjir belum tanggap", kab4: "3205", mulai: "2026-06-03"});
  await tanggap(a); await tanggap(b);
  assert.equal((await POST(PD, `/kejadian/${b}/glide`, {glide: "FL-2026-000012-IDN"})).s, 201);
  const r = await GET(PD, "/glide/pengingat"); assert.equal(r.s, 200, r.t);
  const ids = r.j.baris.map(x => x.id); assert.ok(ids.includes(a)); assert.ok(!ids.includes(b)); assert.ok(!ids.includes(c));
  assert.equal((await GET(PM, "/glide/pengingat")).s, 403);
});
