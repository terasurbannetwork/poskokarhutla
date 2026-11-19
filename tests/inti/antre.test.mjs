/* Antrean bersama public/inti/antre.js (KP-09): inti murni, penyimpanan memori, jam palsu, tanpa jaringan. node --test tests/inti/antre.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import "../../public/inti/antre.js";

const {PbAntre} = globalThis;
let n = 0;
const jam = {t: 1e9};
const buat = (kirim, o = {}) => PbAntre.saluran("s" + ++n, {kirim, simpan: PbAntre.memori(), sekarang: () => jam.t, rand: () => 0.5, langsung: false, pemicu: false, ...o});
const ok = {s: 200, j: {}};

test("urut terlama dulu, klien_id ikut, header dibaca saat kirim dan tak tersimpan", async () => {
  const lihat = []; let kode = "A";
  const s = buat(async (b, h) => { lihat.push([b.map(x => x.a), h["x-kode"]]); return ok; }, {header: () => ({"x-kode": kode})});
  const i1 = await s.tambah({a: 1}); jam.t++; await s.tambah({a: 2}); kode = "B";
  assert.ok(i1 && (await s.daftar()).every(x => !JSON.stringify(x).includes("x-kode")));
  await s.kirimSekarang();
  assert.deepEqual(lihat, [[[1], "B"], [[2], "B"]]);
  assert.equal(await s.menunggu(), 0);
});

test("T5: 503 berhenti, jeda 60 dtk x 2^(n-1) dalam +-20%, butir tetap, urutan terjaga", async () => {
  let panggil = 0; const s = buat(async () => { panggil++; return {s: 503, j: {}}; }, {rand: () => 0});
  await s.tambah({a: 1}); jam.t++; await s.tambah({a: 2});
  await s.kirimSekarang();
  assert.equal(panggil, 1);
  const j1 = s.tundaSampai - jam.t; assert.ok(j1 >= 60000 * 0.8 - 1 && j1 <= 60000 * 1.2 + 1, "jeda 1 = " + j1);
  await s.kirimSekarang(); await s.kirimSekarang();
  assert.equal(panggil, 3);
  assert.ok(s.tundaSampai - jam.t >= 240000 * 0.8 - 1 && s.tundaSampai - jam.t <= 240000 * 1.2 + 1);
  assert.equal(await s.menunggu(), 2);
  for (let i = 0; i < 12; i++) await s.kirimSekarang();
  assert.ok(s.tundaSampai - jam.t <= 1800000 * 1.2 + 1, "plafon 30 menit");
  assert.equal(PbAntre.jeda(1, 0), 48000); assert.equal(PbAntre.jeda(1, 1), 72000);
});

test("pemicu otomatis menghormati jeda, tombol kirim sekarang tidak", async () => {
  let panggil = 0; const s = buat(async () => { panggil++; return panggil < 3 ? {s: 0, j: {}} : ok; });
  await s.tambah({a: 1}); await s.kirimSekarang();
  assert.equal(panggil, 1); jam.t += 1000;
  await s.kirimSekarang(); assert.equal(panggil, 2);
  jam.t += 3600000; await s.kirimSekarang(); assert.equal(panggil, 3); assert.equal(await s.menunggu(), 0);
});

test("T5: 422 ditolak, ditahan dengan alasan, butir berikutnya tetap jalan", async () => {
  const s = buat(async b => b[0].a === 1 ? {s: 422, j: {galat: "tanggal salah"}} : ok);
  await s.tambah({a: 1}); jam.t++; await s.tambah({a: 2});
  await s.kirimSekarang();
  const d = await s.daftar();
  assert.equal(d.length, 1); assert.equal(d[0].status, "ditolak"); assert.equal(d[0].alasan, "tanggal salah");
  await s.kirimSekarang(); assert.equal((await s.daftar()).length, 1, "ditolak tak dikirim ulang");
  await s.buang(d[0].klien_id); assert.equal(await s.menunggu(), 0);
});

test("409 dengan keadaan: ditandai berubah, tak dikirim ulang; 409 tanpa keadaan = ditolak", async () => {
  let panggil = 0; const s = buat(async () => { panggil++; return {s: 409, j: {keadaan: "sudah ditutup"}}; });
  await s.tambah({a: 1}); await s.kirimSekarang(); await s.kirimSekarang();
  const [x] = await s.daftar(); assert.equal(x.status, "berubah"); assert.equal(panggil, 1);
  assert.equal(PbAntre.kelas(409, {}), "tolak");
});

test("401/403: berhenti, butir tetap, sinyal masuk ulang, tanpa backoff", async () => {
  const sinyal = []; const s = buat(async () => ({s: 401, j: {}}), {masukUlang: c => sinyal.push(c)});
  await s.tambah({a: 1}); await s.kirimSekarang();
  assert.deepEqual(sinyal, [401]); assert.equal(s.perluMasuk, true); assert.equal(await s.menunggu(), 1); assert.equal(s.tundaSampai, 0);
  assert.equal((await s.daftar())[0].status, "menunggu");
});

test("T5: 413 pada gugus membelah dua dan semua terkirim; batas gugus menyusut", async () => {
  const ukuran = []; const s = buat(async b => { ukuran.push(b.length); return b.length > 2 ? {s: 413, j: {}} : ok; }, {batch: 4});
  for (let i = 0; i < 4; i++) { jam.t++; await s.tambah({a: i}); }
  await s.kirimSekarang();
  assert.deepEqual(ukuran, [4, 2, 2]); assert.equal(await s.menunggu(), 0);
  for (let i = 0; i < 4; i++) { jam.t++; await s.tambah({a: i}); }
  ukuran.length = 0; await s.kirimSekarang(); assert.deepEqual(ukuran, [2, 2]);
});

test("batch: gugus sesuai batas, butir beracun dibelah sampai ketemu dan ditolak sendiri", async () => {
  const s = buat(async b => b.some(x => x.a === 2) ? {s: 400, j: {galat: "rusak"}} : ok, {batch: 4});
  for (let i = 0; i < 4; i++) { jam.t++; await s.tambah({a: i}); }
  await s.kirimSekarang();
  const d = await s.daftar(); assert.equal(d.length, 1); assert.equal(d[0].data.a, 2); assert.equal(d[0].status, "ditolak");
});

test("masuk ulang dicegah: dua kirimSekarang bersamaan = satu proses", async () => {
  let panggil = 0, buka; const gerbang = new Promise(r => { buka = r; });
  const s = buat(async () => { panggil++; await gerbang; return ok; });
  await s.tambah({a: 1});
  const p1 = s.kirimSekarang(), p2 = s.kirimSekarang(); assert.equal(p1, p2);
  buka(); await p1; assert.equal(panggil, 1);
});

test("umur: butir lewat umurMs dibuang (juga blobnya), yang baru tetap", async () => {
  const s = buat(async () => ({s: 503, j: {}}), {umurMs: 1000});
  await s.tambah({a: 1}); jam.t += 500; await s.tambah({a: 2}); jam.t += 600;
  const d = await s.daftar(); assert.deepEqual(d.map(x => x.data.a), [2]);
});

test("foto dua tahap: unggah dulu, media_id disimpan, blob dikosongkan, baru butir dikirim", async () => {
  const urut = []; const orig = globalThis.fetch;
  globalThis.fetch = async (u, i) => { urut.push(u); return {status: 200, json: async () => ({media_id: "M1"})}; };
  try {
    const s = buat(async b => { urut.push(b[0].media_id); return ok; }, {media: {url: "/m"}});
    const id = await s.tambah({a: 1}, new Blob(["x"], {type: "image/jpeg"}));
    await s.kirimSekarang(); assert.deepEqual(urut, ["/m", "M1"]); assert.equal(id.length, 24);
  } finally { globalThis.fetch = orig; }
});

test("foto: unggah 503 menahan butir tanpa mengirimnya", async () => {
  const orig = globalThis.fetch; let terkirim = 0;
  globalThis.fetch = async () => ({status: 503, json: async () => ({})});
  try {
    const s = buat(async () => { terkirim++; return ok; }, {media: {url: "/m"}});
    await s.tambah({a: 1}, new Blob(["x"])); await s.kirimSekarang();
    assert.equal(terkirim, 0); assert.equal(await s.menunggu(), 1); assert.ok(s.tundaSampai > jam.t);
  } finally { globalThis.fetch = orig; }
});

test("media.unggah milik saluran (video bersambung Lapor K61): gagal sekali ditahan, lalu media_id dari pengunggah dipakai", async () => {
  const lihat = []; let gagal = true;
  const s = buat(async b => { lihat.push(b[0].media_id); return ok; }, {media: {unggah: async (blob, x) => { lihat.push(`unggah ${await blob.text()} ${x.data.a}`);
    if (gagal) { gagal = false; return {s: 0, j: {}}; } return {s: 200, j: {media_id: "U9"}}; }}});
  await s.tambah({a: 7}, new Blob(["vid"]));
  await s.kirimSekarang(); assert.equal(await s.menunggu(), 1, "putus: butir dan blob tetap");
  jam.t = s.tundaSampai + 1; await s.kirimSekarang();
  assert.deepEqual(lihat, ["unggah vid 7", "unggah vid 7", "U9"]); assert.equal(await s.menunggu(), 0);
});

/* ---- T7 ---- */
const lama = (isi, gagalHapus) => { const st = {hapus: 0}; return {st, semua: async () => isi, hapus: async () => { if (gagalHapus) throw new Error("x"); st.hapus++; }}; };
const petakan = r => ({klien_id: r.id, data: r.d, dibuat: r.t});

test("T7: pindahDari menjaga klien_id, lalu menghapus basis lama sesudah semua tertulis", async () => {
  const s = buat(async () => ok), L = lama([{id: "a1", d: {x: 1}, t: jam.t + 5}, {id: "a2", d: {x: 2}, t: jam.t + 6}]);
  assert.equal(await PbAntre.pindahDari({petakan, ke: s, lama: L}), 2);
  assert.deepEqual((await s.daftar()).map(x => x.klien_id), ["a1", "a2"]); assert.equal(L.st.hapus, 1);
  await s.kirimSekarang(); assert.equal(await s.menunggu(), 0);
});

test("T7: gagal di tengah (tulis atau baca ulang) = basis lama utuh", async () => {
  const dasar = PbAntre.memori(); let tulis = 0;
  const simpan = {...dasar, taruh: async x => { if (++tulis === 2) throw new Error("penuh"); return dasar.taruh(x); }};
  const s = PbAntre.saluran("pindah", {kirim: async () => ok, simpan, sekarang: () => jam.t, langsung: false, pemicu: false}), L = lama([{id: "a1", d: {}, t: jam.t + 1}, {id: "a2", d: {}, t: jam.t + 2}]);
  await assert.rejects(PbAntre.pindahDari({petakan, ke: s, lama: L}), /penuh/); assert.equal(L.st.hapus, 0);
  const diam = {...dasar, taruh: async () => {}};   // menulis tanpa benar-benar menyimpan
  const s2 = PbAntre.saluran("pindah2", {kirim: async () => ok, simpan: diam, sekarang: () => jam.t, langsung: false, pemicu: false});
  await assert.rejects(PbAntre.pindahDari({petakan, ke: s2, lama: L}), /belum tertulis/); assert.equal(L.st.hapus, 0);
});

/* ---- T8 ---- */
test("T8: saluran rahasia tak menyentuh localStorage walau IndexedDB gagal; saluran biasa jatuh ke localStorage", async () => {
  const tulis = []; const ls = {getItem: () => null, setItem: (k, v) => tulis.push([k, v])};
  globalThis.indexedDB = {open: () => { const r = {}; queueMicrotask(() => r.onerror?.()); return r; }};
  globalThis.localStorage = ls;
  try {
    const r = PbAntre.saluran("wajah", {kirim: async () => ok, rahasia: true, langsung: false, pemicu: false});
    const id = await r.tambah({vektor: [0.1, 0.2]});
    assert.deepEqual(tulis, []); assert.equal((await r.daftar())[0].klien_id, id);
    assert.equal(r.rahasia, true);
    const b = PbAntre.saluran("biasa", {kirim: async () => ok, langsung: false, pemicu: false});
    await b.tambah({a: 1}); assert.equal(tulis.length, 1); assert.ok(!tulis[0][1].includes("vektor"));
  } finally { delete globalThis.indexedDB; delete globalThis.localStorage; }
});

test("rahasia: umur bawaan 36 jam", async () => {
  const r = PbAntre.saluran("w2", {kirim: async () => ok, rahasia: true, simpan: PbAntre.memori(), sekarang: () => jam.t, langsung: false, pemicu: false});
  await r.tambah({v: 1}); jam.t += 35 * 3600000; assert.equal((await r.daftar()).length, 1);
  jam.t += 2 * 3600000; assert.equal((await r.daftar()).length, 0);
});

test("kelas status", () => {
  const k = PbAntre.kelas;
  assert.deepEqual([k(200), k(0), k(408), k(429), k(500), k(403), k(404), k(409, {keadaan: "x"})], ["ok", "ulang", "ulang", "ulang", "ulang", "masuk", "tolak", "berubah"]);
});

/* ---- perbaikan tinjauan ---- */
test("jeda: plafon 30 menit berlaku sesudah jitter", () => {
  assert.equal(PbAntre.jeda(20, 1), 1800000); assert.equal(PbAntre.jeda(20, 0), 1800000);
});

test("pindahDari: hanya nama basis lama yang dikenal; pb-antre dan lainnya ditolak sebelum menyentuh apa pun", async () => {
  const s = buat(async () => ok);
  for (const db of ["pb-antre", "sembarang", undefined]) await assert.rejects(PbAntre.pindahDari({db, store: "x", petakan, ke: s}), /tidak dikenal/);
  const L = lama([{id: "z", d: {}, t: jam.t}]);
  assert.equal(await PbAntre.pindahDari({db: "lp-antre", petakan, ke: s, lama: L}), 1);
});

test("pindahDari: saluran tujuan di penyimpanan cadangan = ditolak, basis lama utuh; butir kedaluwarsa tak dimasukkan", async () => {
  globalThis.indexedDB = {open: () => { const r = {}; queueMicrotask(() => r.onerror?.()); return r; }};
  globalThis.localStorage = {getItem: () => null, setItem() {}};
  try {
    const c = PbAntre.saluran("cad", {kirim: async () => ok, langsung: false, pemicu: false}), L = lama([{id: "a", d: {}, t: jam.t}]);
    await assert.rejects(PbAntre.pindahDari({db: "pb_lacak", petakan, ke: c, lama: L}), /cadangan/); assert.equal(L.st.hapus, 0);
  } finally { delete globalThis.indexedDB; delete globalThis.localStorage; }
  const s = buat(async () => ok, {umurMs: 1000}), L2 = lama([{id: "tua", d: {}, t: jam.t - 5000}, {id: "baru", d: {}, t: jam.t}]);
  assert.equal(await PbAntre.pindahDari({db: "pb_lacak", petakan, ke: s, lama: L2}), 1);
  assert.deepEqual((await s.daftar()).map(x => x.klien_id), ["baru"]); assert.equal(L2.st.hapus, 1);
});

test("alasan server dipotong 200 karakter dan selalu teks; blob dibuang saat ditolak (unggah dan kirim)", async () => {
  const s = buat(async () => ({s: 422, j: {galat: {obj: "x".repeat(500)}}}));
  await s.tambah({a: 1}); await s.kirimSekarang();
  const [x] = await s.daftar(); assert.equal(typeof x.alasan, "string"); assert.ok(x.alasan.length <= 200);
  const orig = globalThis.fetch; globalThis.fetch = async () => ({status: 413, json: async () => ({galat: "kebesaran"})});
  try {
    const st = PbAntre.memori(), m = buat(async () => ok, {media: {url: "/m"}, simpan: st});
    const id = await m.tambah({a: 1}, new Blob(["x"])); await m.kirimSekarang();
    assert.equal((await m.daftar())[0].status, "ditolak"); assert.equal(await st.ambilBlob(id), undefined);
  } finally { globalThis.fetch = orig; }
});

test("data berisi kunci rahasia ditolak dengan galat jelas (tanpa peduli huruf besar)", async () => {
  const s = buat(async () => ok);
  for (const k of ["x-kode", "X-Lacak", "kode", "Sesi", "session", "token", "Authorization"]) await assert.rejects(s.tambah({[k]: "r"}), /kunci rahasia/);
  assert.equal(await s.menunggu(), 0); await s.tambah({kode_pos: "1"}); assert.equal(await s.menunggu(), 1);
});

test("pembersihan umur satu kali tulis (localStorage) dan kirimSekarang memberi kabar hanya bila isi berubah", async () => {
  const tulis = []; globalThis.indexedDB = {open: () => { const r = {}; queueMicrotask(() => r.onerror?.()); return r; }};
  let isi = "{}"; globalThis.localStorage = {getItem: () => isi, setItem: (k, v) => { isi = v; tulis.push(v); }};
  try {
    const s = PbAntre.saluran("ls", {kirim: async () => ({s: 503, j: {}}), umurMs: 1000, sekarang: () => jam.t, langsung: false, pemicu: false});
    for (let i = 0; i < 5; i++) await s.masukkan({data: {a: i}});
    jam.t += 2000; tulis.length = 0; assert.deepEqual(await s.daftar(), []); assert.equal(tulis.length, 1);
  } finally { delete globalThis.indexedDB; delete globalThis.localStorage; }
  let kabar = 0; const off = PbAntre.dengar(() => kabar++);
  const t = buat(async () => ({s: 503, j: {}})); await t.tambah({a: 1}); kabar = 0;
  await t.kirimSekarang(); assert.equal(kabar, 0, "503 tak mengubah isi");
  const u = buat(async () => ok); await u.tambah({a: 1}); kabar = 0; await u.kirimSekarang(); assert.ok(kabar >= 1); off();
});
