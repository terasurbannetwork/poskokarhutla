/* Catatan sortie OMC (src/omc.js, migrations/0033_omc.sql, public/admin/omc.*) di workerd (Miniflare) dengan D1 lokal sungguhan, migrasi apa adanya (TEST.md: tanpa mock).
   Dibuktikan: skema idempoten dan CHECK/trigger menahan; hak (staf tmc dan moderator menulis; peran lain, akun gerbang situs, tanpa x-pb ditolak); validasi poligon;
   rute publik berbentuk TETAP tanpa pengisi/catatan/dummy/baris terhapus; hapus lunak; sortieHari untuk laporan harian; pengait Meja Pantau omcTanpaHasil; dummy per DUMMY.md;
   503 sopan tanpa 0033; layar tanpa kata "berhasil"/"efektif".
   Jalankan: node --test tests/warga/omc.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import path from "node:path";
import {AKAR, pecah} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN, MOD2, GERBANG} from "./_bnpb.mjs";
import "../../src/worker.js";   // worker dulu: modul saling impor (siklus)
import {cekPoligon, cekSortie, sortieHari, butirOmcTanpaHasil, sortieDenganHasil, BAHAN} from "../../src/omc.js";
import {PROV} from "../../src/instansi.js";

const JAM = 3600e3, HARI = 24 * JAM, PB = {"x-pb": "1", origin: "http://bnpb.lokal"};
const uji = berantai();
const U = await siapkan("uji-omc");
const {DB, api, n} = U;
const teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
let ipN = 0;
const ipBaru = () => ({"cf-connecting-ip": `192.0.2.${++ipN % 250}`});
let nipN = 0;
const bikin = async (nama, peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama, nip: `19970${++nipN}0012005`, unit: "Pusdalops BNPB", email: `o${nipN}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN); assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, ipBaru()); assert.equal(m.s, 200, m.t);
  const cookie = m.h.get("set-cookie").split(";")[0]; assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {h: {cookie}, hp: {cookie, ...PB}};
};
const wib = t => new Date(t + 7 * JAM).toISOString().slice(0, 10);
const kemarin = wib(Date.now() - HARI), tigaHari = wib(Date.now() - 3 * HARI);
const BODI = (o = {}) => ({tanggal: kemarin, pesawat: "PK-SNL", jam_mulai: "05:10", jam_selesai: "06:40", bahan: "dry_ice", kg: 800, ketinggian_kaki: 10000, sasaran_kab: ["62|Kota Palangkaraya"], catatan: "catatan internal rahasia", ...o});
const POLI = [[113.8, -2.3], [114.0, -2.3], [114.0, -2.1], [113.8, -2.1], [113.8, -2.3]];
const tulis = (h, b, id) => api("POST", id ? "/api/omc/sortie/" + id : "/api/omc/sortie", b, h);
const publik = (q = "") => api("GET", "/api/omc/sortie" + q);
const KUNCI_PUBLIK = ["bahan", "id", "ketinggian_kaki", "kg", "lintas", "mulai", "operasi_id", "pesawat", "prov", "sasaran_kab", "sasaran_poligon", "selesai"];

let tmc, tmcKalteng, pusdalops, pimpinan;

/* ---------------- skema ---------------- */
uji("migrasi 0033 idempoten; CHECK dan trigger menahan bahan liar, kg nol, jam terbalik, lebih dari 12 jam, tanpa sasaran, prov kosong, hapus keras nyata, hidup lagi", async () => {
  const sql = teks("migrations/0033_omc.sql");
  for (const s of pecah(sql)) await DB.prepare(s).run();   // dijalankan ulang di atas skema yang sudah ada
  const op = "a".repeat(16), kini = Date.now(), id = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, "0")).join("");
  const dasar = {id: id(), operasi_id: null, tanggal: "2026-10-20", pesawat: "PK-X1", mulai: null, selesai: null, bahan: "nacl", kg: 100, ketinggian_kaki: null, sasaran_kab: '["62|Seruyan"]', sasaran_poligon: null,
    lintas_provinsi: 0, prov: '["62"]', catatan: null, pengisi: "t", dibuat: kini, diubah: kini, dummy: 0};
  const sisip = o => { const k = Object.keys(o); return DB.prepare(`INSERT INTO omc_sortie (${k.join(", ")}) VALUES (${k.map(() => "?").join(", ")})`).bind(...Object.values(o)).run(); };
  await DB.prepare("INSERT INTO omc_operasi (id, nama, dibuat, pengisi, dummy) VALUES (?, 'Uji', ?, 't', 0)").bind(op, kini).run();
  for (const [nama, o] of [["bahan liar", {bahan: "garam"}], ["kg nol", {kg: 0}], ["kg di atas 20000", {kg: 20001}], ["selesai sebelum mulai", {mulai: 2e12, selesai: 1e12}], ["lebih dari 12 jam", {mulai: 1e12, selesai: 1e12 + 12 * JAM + 1}],
    ["tanpa sasaran", {sasaran_kab: "[]"}], ["prov kosong", {prov: "[]"}], ["prov lebih dari 6", {prov: '["11","12","13","14","15","16","17"]'}], ["tanggal rusak", {tanggal: "20-10-2026"}], ["pesawat 1 huruf", {pesawat: "P"}],
    ["ketinggian di atas 60000", {ketinggian_kaki: 60001}], ["sasaran bukan larik", {sasaran_kab: '{"a":1}'}], ["poligon bukan json", {sasaran_poligon: "{bukan"}], ["id pendek", {id: "abc"}], ["dummy 2", {dummy: 2}]])
    await assert.rejects(sisip({...dasar, id: id(), ...o}), nama);
  await sisip({...dasar, id: id(), sasaran_kab: "[]", sasaran_poligon: JSON.stringify({type: "Polygon", coordinates: [POLI]})});   // poligon saja tanpa kab sah
  await sisip(dasar);
  await assert.rejects(DB.prepare("DELETE FROM omc_sortie WHERE id = ?").bind(dasar.id).run(), /tidak dihapus keras/, "sortie nyata tidak dihapus keras");
  await assert.rejects(DB.prepare("DELETE FROM omc_operasi WHERE id = ?").bind(op).run(), /tidak dihapus/);
  await DB.prepare("UPDATE omc_sortie SET dihapus = ? WHERE id = ?").bind(kini, dasar.id).run();
  await assert.rejects(DB.prepare("UPDATE omc_sortie SET dihapus = NULL WHERE id = ?").bind(dasar.id).run(), /tidak dihidupkan lagi/);
  const d = id(); await sisip({...dasar, id: d, dummy: 1}); await DB.prepare("DELETE FROM omc_sortie WHERE id = ?").bind(d).run();   // dummy boleh dihapus keras
  await assert.rejects(DB.prepare("INSERT INTO omc_sortie (id, operasi_id, tanggal, pesawat, bahan, kg, sasaran_kab, prov, pengisi, dibuat, diubah) VALUES (?, ?, '2026-10-20', 'PK-X2', 'nacl', 1, '[\"62|Seruyan\"]', '[\"62\"]', 't', 1, 1)").bind(id(), "b".repeat(16)).run(), /FOREIGN KEY/i, "operasi harus ada");
});
uji("daftar bahan di klien dan server sama; PROV klien sama dengan server; layar tanpa kata terlarang atau titik tengah", async () => {
  const cek = (cocok, nama) => assert.ok(cocok, nama), klien = teks("public/admin/omc.js");
  assert.deepEqual(Object.keys(BAHAN), ["nacl", "dry_ice"]); cek(/const BAHAN = \{nacl: "NaCl", dry_ice: "Dry ice"\}/.test(klien), "BAHAN klien");
  /* nama provinsi klien datang dari satu tabel bersama (public/instansi_wilayah.js), bukan salinan di halaman */
  cek(/const PROV = window\.Wilayah\.PROV;/.test(klien), "omc.js memakai tabel bersama");
  const pk = JSON.parse(teks("public/instansi_wilayah.js").match(/const PROV = (\{[^}]+\});/)[1]); assert.deepEqual(pk, Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v[1]])), "PROV klien sama dengan server");
  const sql = teks("migrations/0033_omc.sql"); assert.deepEqual([...sql.match(/bahan IN \(([^)]+)\)/)[1].matchAll(/'(\w+)'/g)].map(m => m[1]), Object.keys(BAHAN), "CHECK bahan sama");
  for (const f of ["public/admin/omc.js", "public/admin/omc.css", "src/omc.js", "migrations/0033_omc.sql"]) {
    const t = teks(f); assert.ok(!t.includes(" · "), `${f}: tanpa pemisah titik tengah`); assert.ok(!/berhasil|efektif/i.test(t), `${f}: tanpa kata berhasil atau efektif (kesesuaian bukan sebab-akibat)`);
  }
  assert.match(klien, /Kesesuaian waktu dan lokasi perubahan dengan sortie belum membuktikan sebab-akibat\./, "footer tetap");
  assert.match(klien, /Evaluasi belum tersedia, arsip pembanding sedang dikumpulkan\./, "state berkas belum ada");
  assert.ok(!/<style|\sonclick=|innerHTML/.test(klien), "CSP admin: tanpa gaya inline atau innerHTML");
  assert.equal((await api("GET", "/admin/omc", undefined, ADMIN)).s, 200, "kerangka halaman"); assert.match((await api("GET", "/admin/omc", undefined, ADMIN)).t, /\/admin\/omc\.js/);
});

/* ---------------- hak ---------------- */
uji("hak: tmc dan moderator menulis; pusdalops, pimpinan (baca saja), akun gerbang situs, tanpa sesi, dan tanpa x-pb ditolak", async () => {
  tmc = await bikin("Contoh TMC", ["tmc"]); tmcKalteng = await bikin("TMC Kalteng", ["tmc"], ["62"]); pusdalops = await bikin("Pusdalops", ["pusdalops"]); pimpinan = await bikin("Pimpinan", ["pimpinan"]);
  assert.equal((await tulis(tmc.hp, BODI())).s, 201);
  assert.equal((await tulis(ADMIN, BODI({pesawat: "CASA A-2107"}))).s, 201, "admin ADMIN_TOKEN");
  assert.equal((await tulis(MOD2, BODI({pesawat: "CASA A-2117"}))).s, 201, "moderator kedua");
  for (const [nama, h] of [["pusdalops", pusdalops.hp], ["pimpinan", pimpinan.hp], ["gerbang situs", GERBANG], ["tanpa sesi", {}], ["tmc tanpa x-pb", tmc.h]]) {
    const r = await tulis(h, BODI()); assert.equal(r.s, 403, `${nama}: ${r.t.slice(0, 100)}`);
  }
  assert.equal((await api("POST", "/api/omc/operasi", {nama: "Operasi tolak"}, pusdalops.hp)).s, 403);
  const a = await api("GET", "/api/omc/admin", undefined, tmc.h); assert.equal(a.s, 200); assert.equal(a.j.boleh_tulis, true); assert.equal(a.j.super, false);
  const p = await api("GET", "/api/omc/admin", undefined, pimpinan.h); assert.equal(p.s, 200); assert.equal(p.j.boleh_tulis, false, "pimpinan membaca saja");
  for (const [nama, h] of [["pusdalops", pusdalops.h], ["gerbang situs", GERBANG], ["tanpa sesi", {}]]) assert.equal((await api("GET", "/api/omc/admin", undefined, h)).s, 403, `baca ${nama}`);
  const ad = await api("GET", "/api/omc/admin", undefined, ADMIN); assert.equal(ad.j.super, true);
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "isi"}, tmc.hp)).s, 403, "dummy bukan untuk staf");
  assert.ok(!JSON.stringify(a.j).includes("pengisi"), "pengisi tidak keluar dari API");
  assert.equal(await n("omc_sortie", "pesawat = 'PK-SNL'"), 1, "yang ditolak tidak tersimpan");
});
uji("wilayah staf: tmc berwilayah Kalteng hanya menulis dan melihat provinsinya", async () => {
  const k = await tulis(tmcKalteng.hp, BODI({sasaran_kab: ["61|Ketapang"], pesawat: "PK-SCH"})); assert.equal(k.s, 403, "provinsi di luar wilayah");
  const ok = await tulis(tmcKalteng.hp, BODI({pesawat: "PK-KAL"})); assert.equal(ok.s, 201, ok.t);
  const kb = await tulis(ADMIN, BODI({sasaran_kab: ["61|Ketapang"], pesawat: "PK-KB"})); assert.equal(kb.s, 201);
  const lihat = await api("GET", "/api/omc/admin", undefined, tmcKalteng.h), nama = lihat.j.sortie.map(s => s.pesawat);
  assert.ok(nama.includes("PK-KAL") && !nama.includes("PK-KB"), "sortie Kalbar tidak terlihat");
  assert.equal((await tulis(tmcKalteng.hp, {aksi: "hapus"}, kb.j.id)).s, 404, "sortie Kalbar tidak bisa dihapus staf Kalteng");
  assert.equal((await tulis(tmcKalteng.hp, {aksi: "ubah", sasaran_kab: ["61|Ketapang"]}, ok.j.id)).s, 403, "memindahkan keluar wilayah ditolak");
});

/* ---------------- validasi ---------------- */
uji("validasi poligon: Polygon dalam BBOX Indonesia, tertutup, maksimal 500 titik, dibangun ulang tanpa properti liar", async () => {
  assert.deepEqual(cekPoligon(null), {v: null});
  const ok = cekPoligon({type: "Feature", properties: {x: "<script>"}, geometry: {type: "Polygon", coordinates: [POLI]}}); assert.ok(ok.v && !ok.v.includes("script") && JSON.parse(ok.v).type === "Polygon", "Feature dibuka, properti dibuang");
  for (const [nama, p, g] of [["bukan Polygon", {type: "Point", coordinates: [113, -2]}, /Polygon/], ["tak tertutup", {type: "Polygon", coordinates: [POLI.slice(0, 4)]}, /tertutup/], ["3 titik", {type: "Polygon", coordinates: [POLI.slice(0, 3)]}, /4 titik/],
    ["di luar Indonesia", {type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}, /Indonesia/], ["lintang di laut Kutub", {type: "Polygon", coordinates: [[[113, 80], [114, 80], [114, 81], [113, 81], [113, 80]]]}, /Indonesia/],
    ["titik 3 dimensi", {type: "Polygon", coordinates: [POLI.map(x => [...x, 5])]}, /bujur, lintang/], ["NaN", {type: "Polygon", coordinates: [[[113, -2], [114, -2], [114, "x"], [113, -2]]]}, /Indonesia|titik/],
    ["4 cincin", {type: "Polygon", coordinates: [POLI, POLI, POLI, POLI]}, /cincin/], ["tanpa koordinat", {type: "Polygon"}, /Polygon/]]) assert.match(cekPoligon(p).g ?? "", g, nama);
  const besar = n => ({type: "Polygon", coordinates: [[...Array.from({length: n - 1}, (_, i) => [113 + (i % 50) * .001, -2 + Math.floor(i / 50) * .001]), [113, -2]]]});
  assert.ok(cekPoligon(besar(500)).v, "500 titik masih sah"); assert.match(cekPoligon(besar(501)).g, /500 titik/);
  assert.ok(cekPoligon(besar(500)).v.length <= 20480, "500 titik muat 20 KB");
  const r = await tulis(tmc.hp, BODI({sasaran_kab: [], prov: ["62"], sasaran_poligon: {type: "Polygon", coordinates: [POLI]}, pesawat: "PK-POLI"})); assert.equal(r.s, 201, r.t);
  assert.equal((await tulis(tmc.hp, BODI({sasaran_kab: [], prov: ["62"], sasaran_poligon: {type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]]}}))).s, 400);
  assert.equal((await tulis(tmc.hp, BODI({sasaran_kab: [], sasaran_poligon: {type: "Polygon", coordinates: [POLI]}}))).s, 400, "poligon saja wajib menyebut prov");
  const s = await DB.prepare("SELECT sasaran_poligon, prov, lintas_provinsi FROM omc_sortie WHERE id = ?").bind(r.j.id).first(); assert.deepEqual(JSON.parse(s.sasaran_poligon).coordinates[0][0], [113.8, -2.3]); assert.equal(s.prov, '["62"]');
});
uji("validasi sortie: tanggal, jam, bahan, kg, kab, ganda, lintas provinsi otomatis, lewat tengah malam, jam tidak diketahui tetap sah", async () => {
  const kini = Date.now(), G = (o, k = {}) => cekSortie({...BODI(), ...o}, kini).g ?? "";
  assert.match(G({pesawat: "P"}), /pesawat/); assert.match(G({tanggal: "20/10/2026"}), /tanggal/); assert.match(G({tanggal: wib(kini + 10 * HARI)}), /setahun/); assert.match(G({tanggal: "2020-01-01"}), /setahun/);
  assert.match(G({jam_mulai: "25:00"}), /jam mulai/); assert.match(G({bahan: "garam"}), /bahan/); assert.match(G({kg: 0}), /kg/); assert.match(G({kg: "banyak"}), /kg/); assert.match(G({kg: 20001}), /kg/);
  assert.match(G({ketinggian_kaki: -1}), /ketinggian/); assert.match(G({ketinggian_kaki: 1.5}), /ketinggian/);
  assert.match(G({sasaran_kab: ["Kotim"]}), /kodeprov/); assert.match(G({sasaran_kab: ["99|Mars"]}), /kodeprov/); assert.match(G({sasaran_kab: ["62|A|B"]}), /kodeprov/); assert.match(G({sasaran_kab: ["62|Seruyan", "62|Seruyan"]}), /ganda/);
  assert.match(G({sasaran_kab: Array.from({length: 21}, (_, i) => "62|Kab " + i)}), /maksimal 20/); assert.match(G({sasaran_kab: []}), /sasaran wajib/); assert.match(G({jam_mulai: "00:00", jam_selesai: "13:00"}), /12 jam/);
  assert.match(G({catatan: "x".repeat(501)}), /catatan/); assert.match(G({operasi_id: "zzz"}), /operasi_id/); assert.match(G({sasaran_kab: ["62|Seruyan"], prov: ["99"]}), /prov/);
  const lintas = cekSortie({...BODI(), sasaran_kab: ["62|Seruyan", "61|Ketapang"]}, kini).v; assert.deepEqual(lintas.prov, ["62", "61"]); assert.equal(lintas.lintas, true);
  const malam = cekSortie({...BODI(), jam_mulai: "23:30", jam_selesai: "00:45"}, kini).v; assert.equal(malam.selesai - malam.mulai, 75 * 60e3, "lewat tengah malam: selesai keesokan hari");
  const tak = cekSortie({...BODI(), jam_mulai: null, jam_selesai: "", ketinggian_kaki: null}, kini).v; assert.equal(tak.mulai, null); assert.equal(tak.selesai, null); assert.equal(tak.ketinggian_kaki, null);
  assert.equal(cekSortie({...BODI(), jam_mulai: "05:10"}, kini).v.mulai, Date.parse(`${kemarin}T05:10:00+07:00`), "jam WIB menjadi epoch UTC");
  assert.equal((await tulis(tmc.hp, BODI({kg: -5}))).s, 400); assert.equal((await tulis(tmc.hp, BODI({operasi_id: "c".repeat(16)}))).s, 400, "operasi tak ada");
  const lintasApi = await tulis(tmc.hp, BODI({sasaran_kab: ["62|Seruyan", "61|Ketapang"], pesawat: "PK-LINTAS"})); assert.equal(lintasApi.s, 201);
  const p = (await publik()).j.sortie.find(s => s.id === lintasApi.j.id); assert.equal(p.lintas, true); assert.deepEqual(p.prov, ["62", "61"]);
  const tanpaJam = await tulis(tmc.hp, BODI({jam_mulai: null, jam_selesai: null, ketinggian_kaki: null, pesawat: "PK-TANPAJAM"})); assert.equal(tanpaJam.s, 201, tanpaJam.t);
  const q = (await publik()).j.sortie.find(s => s.id === tanpaJam.j.id); assert.equal(q.mulai, null); assert.equal(q.selesai, null); assert.equal(q.ketinggian_kaki, null);
});

/* ---------------- rute publik ---------------- */
uji("GET /api/omc/sortie: bentuk TETAP, tanpa pengisi, catatan, dummy, atau baris terhapus; sejak disaring; cache tepi 5 menit", async () => {
  const r = await publik(); assert.equal(r.s, 200); assert.deepEqual(Object.keys(r.j).sort(), ["dibuat", "sortie"]); assert.ok(!Number.isNaN(Date.parse(r.j.dibuat)));
  assert.match(r.h.get("cache-control"), /public, max-age=300/);
  assert.ok(r.j.sortie.length >= 4);
  for (const s of r.j.sortie) {
    assert.deepEqual(Object.keys(s).sort(), KUNCI_PUBLIK, "kunci tetap"); assert.match(s.id, /^[0-9a-f]{16}$/);
    assert.ok(typeof s.pesawat === "string" && ["nacl", "dry_ice"].includes(s.bahan) && s.kg > 0 && Array.isArray(s.sasaran_kab) && Array.isArray(s.prov) && typeof s.lintas === "boolean");
    assert.ok(s.mulai === null || !Number.isNaN(Date.parse(s.mulai)));
  }
  assert.ok(!r.t.includes("rahasia") && !r.t.includes("catatan") && !r.t.includes("pengisi") && !r.t.includes("dummy"), "tanpa data internal");
  const sat = r.j.sortie.find(s => s.pesawat === "PK-SNL"); assert.equal(sat.mulai, new Date(Date.parse(`${kemarin}T05:10:00+07:00`)).toISOString()); assert.equal(sat.selesai, new Date(Date.parse(`${kemarin}T06:40:00+07:00`)).toISOString());
  assert.deepEqual(sat.sasaran_kab, ["62|Kota Palangkaraya"]); assert.equal(sat.sasaran_poligon, null); assert.equal(sat.kg, 800); assert.equal(sat.ketinggian_kaki, 10000); assert.equal(sat.operasi_id, null); assert.equal(sat.lintas, false);
  const pol = r.j.sortie.find(s => s.pesawat === "PK-POLI"); assert.equal(pol.sasaran_poligon.type, "Polygon");
  /* sejak */
  const lama = await tulis(ADMIN, BODI({tanggal: wib(Date.now() - 60 * HARI), pesawat: "PK-LAMA"})); assert.equal(lama.s, 201);
});
uji("GET /api/omc/sortie: ?sejak menyaring tanggal, format salah 400, baris dummy dan terhapus tidak pernah keluar", async () => {
  const semua = (await publik()).j.sortie.map(s => s.pesawat);
  assert.ok(semua.includes("PK-LAMA"), "60 hari lalu masuk jendela bawaan 90 hari");
  const sejak = (await publik("?sejak=" + wib(Date.now() - 5 * HARI))).j.sortie.map(s => s.pesawat); assert.ok(!sejak.includes("PK-LAMA") && sejak.includes("PK-SNL"), "sejak 5 hari lalu");
  const besok = (await publik("?sejak=" + wib(Date.now() + 5 * HARI))).j.sortie; assert.deepEqual(besok, []);
  for (const buruk of ["?sejak=kemarin", "?sejak=2026-13-45", "?sejak=2026-10-2"]) assert.equal((await publik(buruk)).s, 400, buruk);
  const dum = "d".repeat(16), kini = Date.now();
  await DB.prepare("INSERT INTO omc_sortie (id, tanggal, pesawat, bahan, kg, sasaran_kab, prov, pengisi, dibuat, diubah, dummy) VALUES (?, ?, 'PK-DUMMYBOCOR', 'nacl', 5, '[\"62|Seruyan\"]', '[\"62\"]', 'x', ?, ?, 1)").bind(dum, kemarin, kini, kini).run();
  const mati = await tulis(tmc.hp, BODI({pesawat: "PK-MATI"})); await tulis(tmc.hp, {aksi: "hapus"}, mati.j.id);
  const nama = (await publik()).j.sortie.map(s => s.pesawat); assert.ok(!nama.includes("PK-DUMMYBOCOR") && !nama.includes("PK-MATI"));
  await DB.prepare("DELETE FROM omc_sortie WHERE id = ?").bind(dum).run();
});

/* ---------------- hapus lunak dan ubah ---------------- */
uji("hapus lunak: baris tetap di D1, hilang dari publik dan admin, tidak bisa dihapus dua kali, diubah, atau dihapus keras", async () => {
  const c = await tulis(tmc.hp, BODI({pesawat: "PK-SOFT", catatan: "jangan hilang"})), id = c.j.id; assert.equal(c.s, 201);
  const sebelum = await n("omc_sortie");
  assert.equal((await tulis(tmc.hp, {aksi: "hapus"}, id)).s, 200);
  assert.equal(await n("omc_sortie"), sebelum, "baris tetap ada");
  const baris = await DB.prepare("SELECT dihapus, catatan FROM omc_sortie WHERE id = ?").bind(id).first(); assert.ok(baris.dihapus > 0 && baris.catatan === "jangan hilang");
  assert.ok(!(await publik()).j.sortie.some(s => s.id === id)); assert.ok(!(await api("GET", "/api/omc/admin", undefined, ADMIN)).j.sortie.some(s => s.id === id));
  assert.equal((await tulis(tmc.hp, {aksi: "hapus"}, id)).s, 404, "dua kali"); assert.equal((await tulis(tmc.hp, {aksi: "ubah", kg: 5}, id)).s, 404, "ubah yang terhapus");
  assert.equal((await tulis(tmc.hp, {aksi: "hapus"}, "e".repeat(16))).s, 404, "tak ada"); assert.equal((await tulis(tmc.hp, {aksi: "bakar"}, (await tulis(tmc.hp, BODI({pesawat: "PK-AKSI"}))).j.id)).s, 400, "aksi liar");
  await assert.rejects(DB.prepare("DELETE FROM omc_sortie WHERE id = ?").bind(id).run(), /tidak dihapus keras/);
});
uji("ubah sebagian: kolom yang tidak dikirim tetap; jam diubah ke WIB yang benar; poligon dan kab bisa dikosongkan satu per satu", async () => {
  const c = await tulis(tmc.hp, BODI({pesawat: "PK-UBAH", sasaran_kab: ["62|Seruyan"], sasaran_poligon: {type: "Polygon", coordinates: [POLI]}})), id = c.j.id; assert.equal(c.s, 201);
  const u1 = await tulis(tmc.hp, {aksi: "ubah", kg: 950}, id); assert.equal(u1.s, 200, u1.t);
  const a = (await publik()).j.sortie.find(s => s.id === id); assert.equal(a.kg, 950); assert.equal(a.pesawat, "PK-UBAH"); assert.deepEqual(a.sasaran_kab, ["62|Seruyan"]); assert.ok(a.sasaran_poligon); assert.equal(a.mulai, new Date(Date.parse(`${kemarin}T05:10:00+07:00`)).toISOString());
  assert.equal((await tulis(tmc.hp, {aksi: "ubah", sasaran_poligon: null}, id)).s, 200); assert.equal((await publik()).j.sortie.find(s => s.id === id).sasaran_poligon, null);
  assert.equal((await tulis(tmc.hp, {aksi: "ubah", sasaran_kab: []}, id)).s, 400, "tanpa kab dan tanpa poligon ditolak");
  assert.equal((await tulis(tmc.hp, {aksi: "ubah", jam_mulai: null, jam_selesai: null}, id)).s, 200); const t = (await publik()).j.sortie.find(s => s.id === id); assert.equal(t.mulai, null); assert.equal(t.selesai, null);
  assert.equal((await tulis(tmc.hp, {aksi: "ubah", bahan: "garam"}, id)).s, 400);
  const op = await api("POST", "/api/omc/operasi", {nama: "OMC Kalteng Uji", provinsi: "62", mulai: kemarin, selesai: kemarin}, tmc.hp); assert.equal(op.s, 201, op.t);
  assert.equal((await tulis(tmc.hp, {aksi: "ubah", operasi_id: op.j.id}, id)).s, 200); assert.equal((await publik()).j.sortie.find(s => s.id === id).operasi_id, op.j.id);
  const ad = (await api("GET", "/api/omc/admin", undefined, tmc.h)).j; assert.ok(ad.operasi.some(o => o.id === op.j.id && o.nama === "OMC Kalteng Uji" && o.provinsi === "62"));
  for (const [nama, b] of [["nama pendek", {nama: "x"}], ["provinsi liar", {nama: "Operasi X", provinsi: "99"}], ["tanggal rusak", {nama: "Operasi X", mulai: "kemarin"}], ["selesai sebelum mulai", {nama: "Operasi X", mulai: "2026-10-20", selesai: "2026-10-19"}]])
    assert.equal((await api("POST", "/api/omc/operasi", b, tmc.hp)).s, 400, nama);
  assert.equal((await api("POST", "/api/omc/operasi", {nama: "Operasi Kalbar", provinsi: "61"}, tmcKalteng.hp)).s, 403, "staf Kalteng tidak membuat operasi Kalbar");
});

/* ---------------- laporan harian ---------------- */
uji("sortieHari: bentuk isian omc.sortie laporan karhutla, jam tidak diketahui null, dummy hanya bila diminta, tanpa tabel []", async () => {
  const S = await sortieHari({DB}, kemarin), snl = S.find(s => s.registrasi === "PK-SNL");
  assert.deepEqual(snl, {jenis: "omc", registrasi: "PK-SNL", jam_mulai: "05:10", bahan: "dry_ice", kg: 800, sasaran: ["Kota Palangkaraya"], provs: ["62"], lintas: false, ketinggian_ft: 10000});
  const tj = S.find(s => s.registrasi === "PK-TANPAJAM"); assert.equal(tj.jam_mulai, null); assert.equal(tj.ketinggian_ft, null);
  assert.equal(S.find(s => s.registrasi === "PK-LINTAS").lintas, true); assert.deepEqual(S.find(s => s.registrasi === "PK-LINTAS").sasaran, ["Seruyan", "Ketapang"]);
  assert.ok(!S.some(s => ["PK-MATI", "PK-SOFT"].includes(s.registrasi)), "terhapus tidak ikut");
  assert.deepEqual(await sortieHari({DB}, "2001-01-01"), []); assert.deepEqual(await sortieHari({DB}, "bukan tanggal"), []);
  /* bentuknya diterima normalisasiOmc laporan (spek klien) */
  const {normalisasiOmc} = await import("../../public/laporan_karhutla_spek.js"); const nm = normalisasiOmc({sortie: S, hasil: []}, {tanggal_laporan: wib(Date.now())}, false);
  assert.equal(nm.isi.sortie.length, S.length); assert.equal(nm.isi.sortie.find(s => s.registrasi === "PK-SNL").kg, 800); assert.equal(nm.galat.length, 0, JSON.stringify(nm.galat));
  assert.deepEqual(await sortieHari({DB: {prepare: () => { throw new Error("no such table: omc_sortie"); }}}, kemarin), []);
});

/* ---------------- Meja Pantau ---------------- */
uji("pengait omcTanpaHasil: sortie lebih dari 24 jam tanpa episode jadi butir peran tmc; ada episode di omc_hasil.json atau masih baru: tidak ada", async () => {
  const lama = await tulis(tmc.hp, BODI({tanggal: tigaHari, pesawat: "PK-PANTAU", jam_mulai: "05:00", jam_selesai: "06:00"})); assert.equal(lama.s, 201);
  const tjam = await tulis(tmc.hp, BODI({tanggal: tigaHari, pesawat: "PK-PANTAUTJ", jam_mulai: null, jam_selesai: null})); assert.equal(tjam.s, 201);
  const baru = await tulis(tmc.hp, BODI({tanggal: wib(Date.now()), pesawat: "PK-BARU", jam_mulai: null, jam_selesai: null})); assert.equal(baru.s, 201);
  const ps = await api("GET", "/api/pantau", undefined, tmc.h); assert.equal(ps.s, 200, ps.t);
  const B = ps.j.butir.filter(b => b.jenis === "omc_tanpa_hasil"), ids = B.map(b => b.id);
  assert.ok(ids.includes("omc:" + lama.j.id) && ids.includes("omc:" + tjam.j.id), "dua sortie tiga hari lalu");
  assert.ok(!ids.includes("omc:" + baru.j.id), "sortie hari ini tanpa jam: belum lewat 24 jam");
  const b = B.find(x => x.id === "omc:" + lama.j.id); assert.match(b.judul, /PK-PANTAU tanggal .* belum ada hasil evaluasi/); assert.ok(b.terlambat && b.prov === "62" && b.tautan === "/admin/omc", JSON.stringify(b));
  assert.equal(ps.j.butir.filter(x => x.jenis === "omc_tanpa_hasil").every(x => !x.dummy), true);
  const pd = await api("GET", "/api/pantau", undefined, pusdalops.h); assert.equal(pd.s, 200); assert.ok(!pd.j.butir.some(x => x.jenis === "omc_tanpa_hasil"), "pusdalops tidak menangani OMC");
  const tk = await api("GET", "/api/pantau", undefined, tmcKalteng.h); assert.ok(tk.j.butir.some(x => x.id === "omc:" + lama.j.id), "wilayah Kalteng");
  /* aset omc_hasil.json: episode yang memuat id sortie menghapus butirnya */
  const aset = isi => ({ASSETS: {fetch: async () => isi == null ? new Response("tidak ada", {status: 404}) : new Response(JSON.stringify(isi))}, DB});
  const kini = Date.now(), ada = (await butirOmcTanpaHasil(aset(null), kini, false)).map(x => x.id);
  assert.ok(ada.includes("omc:" + lama.j.id), "berkas belum ada: semua yang lewat 24 jam");
  const dgn = (await butirOmcTanpaHasil(aset({episode: [{id: "ep-1", sortie_ids: [lama.j.id], metrik: []}]}), kini, false)).map(x => x.id); assert.ok(!dgn.includes("omc:" + lama.j.id) && dgn.includes("omc:" + tjam.j.id));
  assert.deepEqual([...await sortieDenganHasil({ASSETS: {fetch: async () => new Response("{rusak")}})], [], "berkas rusak = kosong, tidak melempar");
  assert.deepEqual([...await sortieDenganHasil(aset({episode: [{sortie_ids: ["a", "b"]}, {}]}))], ["a", "b"]);
  await tulis(tmc.hp, {aksi: "hapus"}, lama.j.id); const sesudah = (await api("GET", "/api/pantau", undefined, tmc.h)).j.butir.map(x => x.id); assert.ok(!sesudah.includes("omc:" + lama.j.id), "sortie terhapus: butir hilang sendiri");
});

/* ---------------- temuan security-reviewer ---------------- */
uji("staf berwilayah menulis hanya bila SEMUA provinsi di wilayahnya; poligon diturunkan dari titiknya; operasi disaring; operasi dummy ditolak", async () => {
  const kini = Date.now();
  assert.equal((await tulis(tmcKalteng.hp, BODI({sasaran_kab: ["61|Ketapang"], prov: ["62"], pesawat: "PK-AKAL"}))).s, 403, "kab Kalbar + prov Kalteng");
  assert.equal((await tulis(tmcKalteng.hp, BODI({sasaran_kab: ["62|Seruyan", "61|Ketapang"], pesawat: "PK-LINTAS2"}))).s, 403, "lintas ke luar wilayah");
  const kb = {type: "Polygon", coordinates: [[[109.2, -0.1], [109.4, -0.1], [109.4, 0.1], [109.2, 0.1], [109.2, -0.1]]]};
  assert.equal((await tulis(tmcKalteng.hp, BODI({sasaran_kab: [], prov: ["62"], sasaran_poligon: kb, pesawat: "PK-POLKB"}))).s, 403, "poligon di Kalbar, prov klien Kalteng");
  const ok = await tulis(tmcKalteng.hp, BODI({sasaran_kab: [], prov: ["62"], sasaran_poligon: {type: "Polygon", coordinates: [POLI]}, pesawat: "PK-POLKT"})); assert.equal(ok.s, 201, ok.t);
  const adm = await tulis(ADMIN, BODI({sasaran_kab: [], prov: ["62"], sasaran_poligon: kb, pesawat: "PK-POLADM"})); assert.equal(adm.s, 201, adm.t);
  assert.deepEqual((await publik()).j.sortie.find(s => s.id === adm.j.id).prov, ["61"], "prov dari titik poligon, bukan dari klien");
  assert.equal((await tulis(tmcKalteng.hp, {aksi: "hapus"}, adm.j.id)).s, 404, "di luar wilayah");
  const lintas = await tulis(ADMIN, BODI({sasaran_kab: ["62|Seruyan", "61|Ketapang"], pesawat: "PK-LINTAS3"})); assert.equal(lintas.s, 201);
  assert.equal((await tulis(tmcKalteng.hp, {aksi: "hapus"}, lintas.j.id)).s, 403, "beririsan tapi tidak seluruhnya di wilayahnya: baca boleh, tulis tidak");
  assert.ok((await api("GET", "/api/omc/admin", undefined, tmcKalteng.h)).j.sortie.some(x => x.id === lintas.j.id), "baca cukup beririsan");
  /* operasi disaring menurut wilayah; operasi dummy tak bisa dipakai sortie nyata */
  const opKb = await api("POST", "/api/omc/operasi", {nama: "OMC Kalbar Uji", provinsi: "61"}, ADMIN), opMulti = await api("POST", "/api/omc/operasi", {nama: "OMC Multi Uji"}, ADMIN);
  const nama = (await api("GET", "/api/omc/admin", undefined, tmcKalteng.h)).j.operasi.map(o => o.nama); assert.ok(!nama.includes("OMC Kalbar Uji") && nama.includes("OMC Multi Uji"));
  assert.ok((await api("GET", "/api/omc/admin", undefined, ADMIN)).j.operasi.some(o => o.id === opKb.j.id));
  const dop = "f".repeat(16); await DB.prepare("INSERT INTO omc_operasi (id, nama, dibuat, pengisi, dummy) VALUES (?, '[DUMMY] op', ?, 'x', 1)").bind(dop, kini).run();
  assert.equal((await tulis(ADMIN, BODI({operasi_id: dop, pesawat: "PK-OPDUM"}))).s, 400, "admin pun tidak menempelkan sortie nyata ke operasi dummy");
  await DB.prepare("DELETE FROM omc_operasi WHERE id = ?").bind(dop).run();
  /* publik: sejak dijepit 400 hari */
  const lamaId = "9".repeat(16), tgl = wib(kini - 500 * HARI), dekat = "8".repeat(16), tgl2 = wib(kini - 399 * HARI);
  for (const [i, t] of [[lamaId, tgl], [dekat, tgl2]]) await DB.prepare("INSERT INTO omc_sortie (id, tanggal, pesawat, bahan, kg, sasaran_kab, prov, pengisi, dibuat, diubah, dummy) VALUES (?, ?, 'PK-TUA', 'nacl', 5, '[\"62|Seruyan\"]', '[\"62\"]', 'x', ?, ?, 0)").bind(i, t, kini, kini).run();
  const ids = (await publik("?sejak=2000-01-01")).j.sortie.map(x => x.id); assert.ok(!ids.includes(lamaId) && ids.includes(dekat), "sejak=2000 dijepit ke 400 hari");
  /* Meja Pantau: hanya 30 hari terakhir */
  const aset = {ASSETS: {fetch: async () => new Response("x", {status: 404})}, DB};
  const b = (await butirOmcTanpaHasil(aset, kini, false)).map(x => x.id); assert.ok(!b.includes("omc:" + dekat), "sortie 399 hari lalu bukan butir"); 
});

/* ---------------- dummy ---------------- */
uji("dummy per DUMMY.md: hanya Super Admin; sortie nyata 20 Okt 2026 dengan jam tidak diketahui null; semua bahan dan jam terisi; tersembunyi dari publik dan staf nyata; hapus tuntas", async () => {
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "isi"}, MOD2)).s, 403, "moderator biasa bukan Super Admin"); assert.equal((await api("POST", "/api/omc/dummy", {aksi: "isi"}, GERBANG)).s, 403);
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "bakar"}, ADMIN)).s, 400);
  const nyata = await n("omc_sortie", "dummy = 0");
  const nyata20 = (await sortieHari({DB}, "2026-10-20")).length;
  const r = await api("POST", "/api/omc/dummy", {aksi: "isi"}, ADMIN); assert.equal(r.s, 201, r.t); assert.deepEqual([r.j.operasi, r.j.sortie], [3, 8]);
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "isi"}, ADMIN)).s, 409, "dua kali ditolak");
  const D = await DB.prepare("SELECT * FROM omc_sortie WHERE dummy = 1 ORDER BY pesawat, kg").all().then(x => x.results);
  assert.equal(D.length, 8); assert.ok(D.every(s => s.tanggal === "2026-10-20" && s.dihapus === null));
  assert.deepEqual(D.map(s => s.pesawat).sort(), ["CASA A-2107", "CASA A-2107", "CASA A-2107", "CASA A-2117", "PK-SCH", "PK-SNL", "PK-SNL", "PK-SNL"]);
  const per = (p, f) => D.filter(s => s.pesawat === p && f(s)); assert.equal(per("PK-SCH", s => s.bahan === "nacl" && s.kg === 1000 && s.ketinggian_kaki === 10000 && s.prov === '["61"]').length, 1);
  assert.deepEqual(D.filter(s => s.pesawat === "PK-SNL").map(s => [s.bahan, s.kg]).sort(), [["dry_ice", 1000], ["dry_ice", 500], ["nacl", 800]].sort()); assert.ok(D.filter(s => s.pesawat === "CASA A-2107").every(s => s.bahan === "dry_ice" && s.kg === 800));
  const sum = D.find(s => s.pesawat === "CASA A-2117"); assert.equal(sum.kg, 800); assert.equal(sum.ketinggian_kaki, 5000); assert.equal(sum.mulai, Date.parse("2026-10-20T11:29:00+07:00")); assert.equal(sum.selesai, Date.parse("2026-10-20T13:04:00+07:00")); assert.equal(sum.sasaran_kab, '["16|Kota Palembang"]');
  assert.ok(D.filter(s => s.pesawat !== "CASA A-2117").every(s => s.mulai === null && s.selesai === null), "jam yang tidak disebut: NULL, bukan karangan");
  assert.ok(D.some(s => s.bahan === "nacl") && D.some(s => s.bahan === "dry_ice") && D.some(s => JSON.parse(s.sasaran_kab).length > 1) && new Set(D.map(s => s.prov)).size === 3, "semua bahan, sasaran majemuk, tiga provinsi");
  assert.ok(D.every(s => s.operasi_id), "tiap sortie dummy punya operasi");
  /* tersembunyi dari publik dan staf nyata; terlihat admin dan butir pantau dummy */
  assert.ok(!(await publik()).j.sortie.some(s => D.some(d => d.id === s.id))); assert.equal((await api("GET", "/api/omc/admin", undefined, tmc.h)).j.sortie.filter(s => s.dummy).length, 0, "staf nyata tidak melihat dummy");
  const ad = (await api("GET", "/api/omc/admin", undefined, ADMIN)).j; assert.equal(ad.sortie.filter(s => s.dummy).length, 8); assert.equal(ad.operasi.filter(o => o.dummy).length, 3);
  assert.equal((await tulis(tmc.hp, {aksi: "hapus"}, D[0].id)).s, 404, "staf nyata tidak menyentuh dummy");
  assert.equal((await sortieHari({DB}, "2026-10-20")).length, nyata20, "laporan nyata tanpa dummy"); assert.equal((await sortieHari({DB}, "2026-10-20", true)).length, nyata20 + 8);
  const kemudian = Date.parse("2026-10-23T00:00:00Z"), aset = {ASSETS: {fetch: async () => new Response("x", {status: 404})}, DB};
  assert.equal((await butirOmcTanpaHasil(aset, kemudian, true)).filter(b => b.dummy).length, 8, "pelaku dummy: delapan butir"); assert.equal((await butirOmcTanpaHasil(aset, kemudian, false)).filter(b => b.dummy).length, 0);
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "hapus"}, MOD2)).s, 403);
  const h = await api("POST", "/api/omc/dummy", {aksi: "hapus"}, ADMIN); assert.equal(h.s, 200); assert.deepEqual([h.j.sortie, h.j.operasi], [8, 3]);
  assert.equal(await n("omc_sortie", "dummy = 1"), 0); assert.equal(await n("omc_operasi", "dummy = 1"), 0); assert.equal(await n("omc_sortie", "dummy = 0"), nyata, "data nyata tidak tersentuh");
  assert.equal((await api("POST", "/api/omc/dummy", {aksi: "isi"}, ADMIN)).s, 201, "isi lagi sesudah hapus"); await api("POST", "/api/omc/dummy", {aksi: "hapus"}, ADMIN);
});

/* ---------------- tanpa migrasi 0033 ---------------- */
uji("503 sopan bila 0033 belum diterapkan; kerangka halaman, Meja Pantau, dan laporan harian tetap jalan", async () => {
  const V = await siapkan("uji-omc-503");
  for (const t of ["omc_sortie", "omc_operasi"]) await V.DB.prepare(`DROP TABLE ${t}`).run();
  const st = await V.api("POST", "/api/staf/admin/buat", {nama: "TMC 503", nip: "199988800120", unit: "BNPB", email: "t503@bnpb.go.id", wa: "081234567891", peran: ["tmc"], wilayah: []}, ADMIN); assert.equal(st.s, 201);
  const m = await V.api("POST", "/api/staf/masuk", {username: st.j.username, sandi: st.j.sandi}, ipBaru()), cookie = m.h.get("set-cookie").split(";")[0]; await V.api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB});
  for (const [met, j, b, h] of [["GET", "/api/omc/sortie", undefined, {}], ["GET", "/api/omc/admin", undefined, ADMIN], ["GET", "/api/omc/admin", undefined, {cookie}], ["POST", "/api/omc/sortie", BODI(), {cookie, ...PB}], ["POST", "/api/omc/sortie", BODI(), ADMIN],
    ["POST", "/api/omc/sortie/" + "a".repeat(16), {aksi: "hapus"}, ADMIN], ["POST", "/api/omc/operasi", {nama: "Operasi X"}, ADMIN], ["POST", "/api/omc/dummy", {aksi: "isi"}, ADMIN], ["POST", "/api/omc/dummy", {aksi: "hapus"}, ADMIN]]) {
    const r = await V.api(met, j, b, h); assert.equal(r.s, 503, `${met} ${j}: ${r.t.slice(0, 120)}`); assert.match(r.j.galat, /0033/);
  }
  assert.equal((await V.api("GET", "/admin/omc", undefined, ADMIN)).s, 200, "kerangka halaman tidak butuh tabel");
  const pa = await V.api("GET", "/api/pantau", undefined, ADMIN); assert.equal(pa.s, 200); assert.ok("omc_tanpa_hasil" in pa.j.jenis && !pa.j.butir.some(b => b.jenis === "omc_tanpa_hasil"), "Meja Pantau tetap jalan");
  assert.deepEqual(await sortieHari({DB: V.DB}, kemarin), []);
});
