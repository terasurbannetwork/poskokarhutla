import test from "node:test";
import assert from "node:assert/strict";
import {KONST_PUBLIK as K} from "../../src/lapangan_konst.js";
import {KEGIATAN, KENDALA, KEBUTUHAN, kondisiUntuk, pilihan, LABEL_KEGIATAN, LABEL_KENDALA, LABEL_KEBUTUHAN, LABEL_KONDISI, BATAS, potongTeks, rapikanLogbook, sudahTerkunci, metaFoto} from "../../public/petugas/logbook_murni.js";

const dasar = (o = {}) => ({tugas_id: "t1", tanggal: "2026-11-02", kegiatan: "pemadaman", uraian: "Memadamkan api di blok C bersama regu dua.", hasil: "Api padam 80 persen", kendala: ["air_jauh"], kebutuhan: ["bbm", "selang_pompa"],
  kondisi: {kondisi_api: "bara", tebal_gambut_cm: "120", jarak_air_m: "350", akses: "motor"}, nFoto: 2, ...o});

test("rapikanLogbook karhutla: isian sah menjadi badan POST dengan angka bulat", () => {
  const r = rapikanLogbook(dasar(), "karhutla", K);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data.kondisi, {kondisi_api: "bara", tebal_gambut_cm: 120, jarak_air_m: 350, akses: "motor"});
  assert.deepEqual(r.data.kendala, ["air_jauh"]);
  assert.equal(r.data.tugas_id, "t1"); assert.equal(r.data.tanggal, "2026-11-02");
  assert.equal("nFoto" in r.data, false);
});

test("rapikanLogbook banjir: kolom karhutla diabaikan, tinggi genangan wajib", () => {
  const r = rapikanLogbook(dasar({kondisi: {tinggi_genangan_cm: 45, hujan_lokal: "ringan", kondisi_api: "menyala"}}), "banjir", K);
  assert.equal(r.ok, true); assert.deepEqual(r.data.kondisi, {tinggi_genangan_cm: 45, hujan_lokal: "ringan"});
  const t = rapikanLogbook(dasar({kondisi: {hujan_lokal: "tidak"}}), "banjir", K);
  assert.equal(t.ok, false); assert.match(t.galat.tinggi_genangan_cm, /wajib/);
});

test("rapikanLogbook ditolak: kegiatan kosong, di luar daftar, atau __proto__", () => {
  for (const k of [undefined, "", "tidur", "__proto__", 5]) assert.ok(rapikanLogbook(dasar({kegiatan: k}), "karhutla", K).galat.kegiatan, String(k));
});

test("rapikanLogbook ditolak: uraian terlalu pendek; uraian panjang dipotong, bukan ditolak", () => {
  assert.match(rapikanLogbook(dasar({uraian: "   pendek  "}), "karhutla", K).galat.uraian, /minimal 10/);
  const r = rapikanLogbook(dasar({uraian: "a".repeat(5000), hasil: "b".repeat(5000)}), "karhutla", K);
  assert.equal(r.data.uraian.length, BATAS.uraianMaks); assert.equal(r.data.hasil.length, BATAS.hasilMaks);
});

test("rapikanLogbook ditolak: pilihan kendala dan kebutuhan di luar daftar; duplikat dibuang", () => {
  assert.ok(rapikanLogbook(dasar({kendala: ["air_jauh", "ngantuk"]}), "karhutla", K).galat.kendala);
  assert.ok(rapikanLogbook(dasar({kebutuhan: ["__proto__"]}), "karhutla", K).galat.kebutuhan);
  assert.deepEqual(rapikanLogbook(dasar({kendala: ["cuaca", "cuaca"]}), "karhutla", K).data.kendala, ["cuaca"]);
  assert.deepEqual(rapikanLogbook(dasar({kendala: "cuaca"}), "karhutla", K).data.kendala, [], "bukan larik = kosong");
});

test("rapikanLogbook ditolak: kondisi api wajib dan harus dari daftar", () => {
  assert.match(rapikanLogbook(dasar({kondisi: {}}), "karhutla", K).galat.kondisi_api, /wajib/);
  assert.ok(rapikanLogbook(dasar({kondisi: {kondisi_api: "meledak"}}), "karhutla", K).galat.kondisi_api);
  assert.ok(rapikanLogbook(dasar({kondisi: {kondisi_api: "padam", akses: "helikopter"}}), "karhutla", K).galat.akses);
});

test("rapikanLogbook ditolak: angka di luar rentang, desimal, negatif, huruf", () => {
  const coba = (k, v) => rapikanLogbook(dasar({kondisi: {kondisi_api: "padam", [k]: v}}), "karhutla", K).galat[k];
  assert.ok(coba("tebal_gambut_cm", "1501")); assert.ok(coba("tebal_gambut_cm", "12,5")); assert.ok(coba("tebal_gambut_cm", "-1")); assert.ok(coba("jarak_air_m", "10001")); assert.ok(coba("jarak_air_m", "dekat")); assert.ok(coba("jarak_air_m", 1.5));
  assert.equal(coba("tebal_gambut_cm", "1500"), undefined); assert.equal(coba("tebal_gambut_cm", "0"), undefined); assert.equal(coba("jarak_air_m", ""), undefined);
  const b = rapikanLogbook(dasar({kondisi: {tinggi_genangan_cm: "501"}}), "banjir", K); assert.ok(b.galat.tinggi_genangan_cm);
});

test("rapikanLogbook ditolak: foto kurang dari 1 atau lebih dari 6, tugas dan tanggal tidak sah", () => {
  assert.match(rapikanLogbook(dasar({nFoto: 0}), "karhutla", K).galat.foto, /minimal satu/);
  assert.match(rapikanLogbook(dasar({nFoto: 7}), "karhutla", K).galat.foto, /6/);
  assert.equal(rapikanLogbook(dasar({nFoto: 6}), "karhutla", K).ok, true);
  assert.ok(rapikanLogbook(dasar({tugas_id: ""}), "karhutla", K).galat.tugas_id);
  for (const t of ["2026-1-2", "02-11-2026", "", undefined]) assert.ok(rapikanLogbook(dasar({tanggal: t}), "karhutla", K).galat.tanggal, String(t));
  assert.equal(rapikanLogbook(null, "karhutla", K).ok, false);
});

test("rapikanLogbook: bencana tanpa kolom kondisi tidak menuntut kondisi", () => {
  assert.deepEqual(kondisiUntuk("gempa", K), []); assert.deepEqual(kondisiUntuk("__proto__", K), []);
  assert.equal(rapikanLogbook(dasar({kondisi: {}}), "gempa", K).ok, true);
});

test("potongTeks: rapikan ujung, tidak memutus pasangan surrogate", () => {
  assert.equal(potongTeks("  halo  ", 10), "halo"); assert.equal(potongTeks(null, 5), "");
  assert.equal(potongTeks("ab😀cd", 3), "ab");   // 😀 = dua unit; jangan sisakan setengah
  assert.equal(potongTeks("a\r\nb", 9), "a\nb");
});

test("sudahTerkunci: terkunci setelah 23.59 hari tanggalnya menurut offset perangkat", () => {
  const w = (iso) => Date.parse(iso);
  assert.equal(sudahTerkunci("2026-11-02", w("2026-11-02T16:59:59Z"), 420), false);   // 23.59.59 WIB
  assert.equal(sudahTerkunci("2026-11-02", w("2026-11-02T17:00:00Z"), 420), true);    // 00.00 WIB 3 Nov
  assert.equal(sudahTerkunci("2026-11-03", w("2026-11-02T17:00:00Z"), 420), false);
});

test("metaFoto: lokasi dibulatkan, tanpa GPS jadi null", () => {
  assert.deepEqual(metaFoto({lat: -0.05, lon: 116.4, akurasi: 8.6}, 1700000000000.4), {lat: -0.05, lon: 116.4, akurasi: 9, waktu: 1700000000000});
  assert.deepEqual(metaFoto(null, 5), {lat: null, lon: null, akurasi: null, waktu: 5});
});

test("daftar pilihan: kunci dari konst server, urutan konst, berlabel dan berikon", () => {
  for (const [f, kunci] of [[KEGIATAN, K.kegiatan], [KENDALA, K.kendala], [KEBUTUHAN, K.kebutuhan]]) {
    const d = f(K); assert.deepEqual(d.map(x => x.k), kunci); assert.ok(d.every(x => x.label && x.ikon));
  }
  for (const [tabel, kunci] of [[LABEL_KEGIATAN, K.kegiatan], [LABEL_KENDALA, K.kendala], [LABEL_KEBUTUHAN, K.kebutuhan]]) assert.deepEqual(tabel.map(x => x.k).sort(), [...kunci].sort(), "tabel label sama dengan kunci server");
});

test("pilihan: kunci baru dari server tampil berlabel dari kunci; kunci non-teks dibuang; kunci lama yang dicabut server hilang", () => {
  assert.deepEqual(pilihan(["patroli", "tanggul_jebol", 5, ""], LABEL_KEGIATAN).map(x => [x.k, x.label]), [["patroli", "Patroli"], ["tanggul_jebol", "Tanggul jebol"]]);
  assert.deepEqual(pilihan(undefined, LABEL_KEGIATAN), []);
  const k2 = {...K, kegiatan: ["patroli"]};
  assert.equal(rapikanLogbook(dasar({kegiatan: "pemadaman"}), "karhutla", k2).galat.kegiatan, "Pilih jenis kegiatan");
  const k3 = {...K, kegiatan: [...K.kegiatan, "tanggul_jebol"]};
  assert.equal(rapikanLogbook(dasar({kegiatan: "tanggul_jebol"}), "karhutla", k3).ok, true);
});

test("kondisiUntuk: kolom, opsi, dan rentang dari konst; kolom tak dikenal konst dibuang", () => {
  const kar = kondisiUntuk("karhutla", K), ban = kondisiUntuk("banjir", K);
  assert.deepEqual(kar.map(f => f.k), ["kondisi_api", "tebal_gambut_cm", "jarak_air_m", "akses"]);
  assert.deepEqual(ban.map(f => f.k), ["tinggi_genangan_cm", "hujan_lokal"]);
  assert.deepEqual(kar[0].opsi.map(o => o.k), K.kondisi.enum.kondisi_api); assert.ok(kar[0].opsi.every(o => o.label && o.ikon));
  assert.deepEqual(kar[3].opsi.map(o => o.k), K.kondisi.enum.akses); assert.deepEqual(ban[1].opsi.map(o => o.k), K.kondisi.enum.hujan_lokal);
  assert.deepEqual([kar[1].min, kar[1].maks], K.kondisi.angka.tebal_gambut_cm);
  const sempit = {...K, kondisi: {enum: {kondisi_api: ["menyala"]}, angka: {tebal_gambut_cm: [0, 100]}}};
  assert.deepEqual(kondisiUntuk("karhutla", sempit).map(f => f.k), ["kondisi_api", "tebal_gambut_cm"]);
  assert.ok(rapikanLogbook(dasar({kondisi: {kondisi_api: "bara"}}), "karhutla", sempit).galat.kondisi_api, "opsi di luar konst ditolak");
  assert.ok(rapikanLogbook(dasar({kondisi: {kondisi_api: "menyala", tebal_gambut_cm: 101}}), "karhutla", sempit).galat.tebal_gambut_cm);
  assert.deepEqual(kondisiUntuk("karhutla", undefined), []);
});

test("LABEL_KONDISI: tiap kolom pilih punya label dan ikon untuk semua enum server", () => {
  for (const [b, kol] of Object.entries(LABEL_KONDISI)) for (const f of kol.filter(x => x.jenis === "pilih")) assert.deepEqual(f.opsi.map(o => o.k).sort(), [...K.kondisi.enum[f.k]].sort(), `${b}.${f.k}`);
});
