/* Peta Situs PS-01: registri src/peta_situs.js lawan halaman nyata (mode LAPORAN untuk yatim/hantu, gerbang keras ada di PS-02/PS-11)
   dan uji menuUntuk per peran (RENCANA-UJI U2). Jalankan: node --test tests/warga/peta_situs.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join} from "node:path";
import {HTML_RUTE, PUBLIK_TANPA_SESI, BNPB_BERSIH, bolehHalaman} from "../../src/worker.js";
import {HALAMAN_STAF, bolehStaf, SEMUA_PERAN} from "../../src/admin_halaman.js";
import {HALAMAN, PINTU, GRUP, menuUntuk} from "../../src/peta_situs.js";

import {AKAR, norm, nyata, tab} from "../agen/fixtures/peta_situs_nyata.mjs";
const RUTE = new Set(HALAMAN.map(e => norm(e.rute.split("?")[0])));

test("laporan: yatim (halaman nyata tanpa entri) dan hantu (entri tanpa halaman nyata)", () => {
  const yatim = [...nyata].filter(r => !RUTE.has(r)).sort();
  const hantu = [...RUTE].filter(r => !nyata.has(r) && !tab(r) && !/:id$/.test(r)).sort();
  console.log(`entri=${HALAMAN.length} nyata=${nyata.size} yatim=${yatim.length} hantu=${hantu.length}`, {yatim, hantu});
  for (const p of Object.keys(PINTU)) console.log(p, HALAMAN.filter(e => e.pintu === p).length);
  assert.deepEqual({yatim, hantu}, {yatim: [], hantu: []});
});

test("bentuk entri: rute unik, pintu dan grup sah, akses sah, hak = kunci HALAMAN_STAF, nama tanpa huruf kapital semua dan tanpa titik tengah", () => {
  const unik = new Set();
  for (const e of HALAMAN) {
    assert.ok(!unik.has(e.rute), "ganda " + e.rute); unik.add(e.rute);
    assert.ok(PINTU[e.pintu], e.rute); assert.ok(GRUP[e.pintu].some(g => g.id === e.grup), `${e.rute}: grup ${e.grup} tak ada di ${e.pintu}`);
    assert.ok(["tamu", "sesi", "token", "kode"].includes(e.akses), e.rute);
    assert.ok(e.hak === null || Object.hasOwn(HALAMAN_STAF, e.hak), `${e.rute}: hak ${e.hak}`);
    assert.ok(e.induk === null || RUTE.has(norm(e.induk)), `${e.rute}: induk ${e.induk} tak tercatat`);
    assert.ok(e.nama && !/·/.test(e.nama) && (e.nama.length <= 5 || e.nama !== e.nama.toUpperCase()), e.nama);
  }
});

test("akses tamu sama persis dengan kunci PUBLIK_TANPA_SESI", () => {
  const tamu = HALAMAN.filter(e => e.akses === "tamu").map(e => e.rute).sort(), kunci = [...PUBLIK_TANPA_SESI.keys()].sort();
  assert.deepEqual(tamu, kunci);
});

/* U2: menuUntuk */
const rute = m => m.flatMap(p => p.grup.flatMap(g => g.butir.map(e => e.rute)));
const pintu = m => m.map(p => p.pintu);
const staf = (peran, terkunci = true) => menuUntuk({jenis: "staf", peran}, bolehStaf, terkunci);

test("U2: tamu hanya pintu Publik dan tanpa butir token", () => {
  const m = menuUntuk(null, bolehStaf);
  assert.deepEqual(pintu(m), ["publik"]);
  assert.ok(rute(m).includes("/lapor") && rute(m).includes("/masuk") && !rute(m).includes("/lapor/s") && !rute(m).includes("/bantu"));
});
test("U2: admin melihat semua pintu dan semua butir non-token", () => {
  const m = menuUntuk({jenis: "admin", peran: []}, bolehStaf);
  assert.deepEqual(pintu(m), Object.keys(PINTU));
  assert.equal(new Set(rute(m)).size, HALAMAN.filter(e => e.akses !== "token" && !e.token).length);
});
test("U2: butir ber-hak mengikuti bolehStaf per peran staf", () => {
  for (const peran of SEMUA_PERAN) {
    const r = new Set(rute(staf([peran], false)));   // host tak terkunci: hanya hak yang bicara
    for (const e of HALAMAN.filter(e => e.pintu === "staf" && e.hak && e.akses !== "token")) assert.equal(r.has(e.rute), bolehStaf(e.hak, [peran]), `${peran} ${e.rute}`);
    assert.ok(!r.has("/admin/akun"), peran + " tidak boleh melihat grup pengaturan tanpa hak");
    assert.ok(r.has("/bnpb/dalops"), peran);
  }
  assert.ok(rute(staf(["pusdalops"], false)).includes("/admin/instansi") && !rute(staf(["tmc"], false)).includes("/admin/instansi"));
  assert.ok(rute(staf(["tmc"], false)).includes("/admin/omc") && !rute(staf(["verifikator"], false)).includes("/admin/omc"));
});
test("U2: akun direktori saja hanya melihat Direktori di pintu Staf", () => {
  const m = staf(["direktori"]);
  assert.deepEqual(rute(m.filter(p => p.pintu === "staf")), ["/direktori"]);
  assert.deepEqual(pintu(m), ["publik", "staf"]);
});
test("U2: instansi, petugas, kemitraan hanya melihat pintunya dan Publik", () => {
  for (const [jenis, p] of [["instansi", "instansi"], ["petugas", "petugas"], ["kemitraan", "kampus"]]) {
    const m = menuUntuk({jenis, peran: []}, bolehStaf);
    assert.deepEqual(pintu(m), ["publik", p]);
    assert.ok(!rute(m).includes("/bnpb/dalops"));
  }
});
test("U2: pemirsa dan jenis tak dikenal seperti tamu", () => {
  assert.deepEqual(pintu(menuUntuk({jenis: "pemirsa", peran: []}, bolehStaf)), ["publik"]);
});

test("tanpa akses hilang: butir menuUntuk menutup GRUP_STAF (disaring bolehStaf); yang ditolak gerbang Worker dicatat sebagai tautan mati lama", () => {
  /* daftar tulisan tangan terakhir di src/admin_halaman.js sebelum PS-04 (BNPB/SUB dan GRUP_STAF "Ruang kerja"), dibekukan di sini sebagai acuan "tanpa akses hilang" */
  const sub = ["pimpinan", "relawan", "alun", "riset", "meja", "pengingat", "gakkum", "pantau", "instansi", "aktivasi", "inventaris", "korban", "laporan-karhutla", "omc", "laporan", "kinerja", "pendataan"];
  const kerja = ["posko", "pipa", "command-center", "ai"];
  const RUTE_LAMA = {pipa: "/pipa", "command-center": "/command-center", ai: "/ai"};
  const mati = {};
  for (const peran of SEMUA_PERAN) {
    const baru = new Set(rute(staf([peran])));
    for (const k of [...sub, ...kerja].filter(k => bolehStaf(k, [peran]))) {
      const r = RUTE_LAMA[k] || "/admin/" + k;
      if (!bolehHalaman(r, {jenis: "staf", peran: [peran]}, true)) { (mati[peran] ||= []).push(r); continue; }   // Worker menolak: bukan tautan yang sah
      assert.ok(baru.has(r), `${peran} kehilangan ${r}`);
    }
  }
  // tautan lama yang ditolak gerbang centurisk97.id (dikunci agar perubahan tak diam-diam): /ai untuk semua peran yang HALAMAN_STAF.ai
  for (const [peran, daftar] of Object.entries(mati)) assert.deepEqual(daftar, ["/ai"], peran);
  assert.ok(Object.keys(mati).length > 0);
});
test("juga: /lapor/meja tampil di pintu instansi (grup kerja) tanpa entri kedua; di host terkunci Worker menolaknya, jadi hilang", () => {
  assert.equal(HALAMAN.filter(e => e.rute === "/lapor/meja").length, 1);
  const i = menuUntuk({jenis: "instansi", peran: []}, bolehStaf, false).find(p => p.pintu === "instansi");
  assert.ok(i.grup.find(g => g.id === "kerja").butir.some(e => e.rute === "/lapor/meja"));
  assert.ok(!rute(menuUntuk({jenis: "instansi", peran: []}, bolehStaf, true)).includes("/lapor/meja"));
  assert.ok(rute(staf(["pusdalops"], false)).includes("/lapor/meja"));
  assert.ok(!rute(menuUntuk({jenis: "petugas", peran: []}, bolehStaf, false)).includes("/lapor/meja"));
  assert.ok(rute(menuUntuk({jenis: "admin", peran: []}, bolehStaf)).includes("/lapor/meja"));
});
test("tanpa tautan yang ditolak Worker: tiap butir /admin/* untuk staf lolos gerbang halamannya", () => {
  const GERBANG_SENDIRI = new Set(["drone"]);   // /admin/drone: sesi staf mana pun (src/drone.js konteks); tanpa kunci HALAMAN_STAF
  const adminSaja = HALAMAN.filter(e => e.admin).map(e => e.rute);
  assert.ok(adminSaja.length >= 15);
  for (const peran of [...SEMUA_PERAN, "kemitraan"]) {
    for (const e of menuUntuk({jenis: "staf", peran: [peran]}, bolehStaf).flatMap(p => p.grup.flatMap(g => g.butir)).filter(e => e.rute.startsWith("/admin/"))) {
      const k = e.rute.slice(7);
      assert.ok(!e.admin, `${peran}: ${e.rute} admin saja tapi tampil`);
      if (Object.hasOwn(HALAMAN_STAF, k)) assert.ok(bolehStaf(k, [peran]), `${peran}: ${e.rute} ditolak bolehStaf`);
      else if (e.peran) assert.ok(e.peran.includes(peran), `${peran}: ${e.rute} ditolak gerbang sendiri`);
      else assert.ok(GERBANG_SENDIRI.has(k), `${peran}: ${e.rute} tanpa gerbang staf yang dikenal`);
    }
  }
  assert.ok(!rute(menuUntuk({jenis: "staf", peran: ["pimpinan"]}, bolehStaf)).includes("/admin/pengingat"));
  assert.ok(rute(menuUntuk({jenis: "admin", peran: []}, bolehStaf)).includes("/admin/pengingat"));
  assert.ok(rute(staf(["pusdalops"])).includes("/admin/segel") && !rute(staf(["tmc"])).includes("/admin/segel"));
});
test("daftar admin saja cocok dengan sumber Worker: halaman bolehStaf=null dan Super Admin", () => {
  for (const [f, k] of [["worker", "statistik"], ["worker", "pesan"], ["worker", "kontak"], ["staf", "akun"], ["bnpb", "gakkum"], ["bnpb", "pimpinan"], ["alun", "alun"], ["meja", "meja"], ["pengingat", "pengingat"], ["riset", "riset"], ["relawan", "relawan"]]) {
    const baris = readFileSync(join(AKAR, "src", f + ".js"), "utf8").split("\n").find(l => l.includes(`"GET /admin/${k}"`));
    assert.ok(baris && !/HALAMAN_STAF|Object\.keys\(PERAN\)|PERAN_/.test(baris), `${k} punya daftar peran di Worker`);
    assert.ok(HALAMAN.find(e => e.rute === "/admin/" + k).admin, k);
  }
});

test("staf tanpa peran (kosong atau tak ada) tidak mendapat pintu staf", () => {
  for (const sesi of [{jenis: "staf", peran: []}, {jenis: "staf"}]) for (const t of [true, false]) assert.deepEqual(pintu(menuUntuk(sesi, bolehStaf, t)), ["publik"]);
});
test("semua butir menuUntuk lolos bolehHalaman, tiap peran dan jenis sesi, host terkunci dan tidak", () => {
  const sesiSemua = [...[...SEMUA_PERAN, "irtama", "unit", "kemitraan"].map(p => ({jenis: "staf", peran: [p]})), ...["admin", "instansi", "petugas", "kemitraan", "pemirsa"].map(jenis => ({jenis, peran: []})), null];
  for (const sesi of sesiSemua) for (const terkunci of [true, false]) {
    for (const r of rute(menuUntuk(sesi, bolehStaf, terkunci))) assert.ok(bolehHalaman(r, sesi, terkunci), `${JSON.stringify(sesi)} terkunci=${terkunci}: ${r}`);
  }
});
test("laporan: jumlah butir staf per peran di host terkunci", () => {
  const jml = {};
  for (const p of [...SEMUA_PERAN, "irtama", "unit", "kemitraan"]) jml[p] = rute(staf([p]).filter(x => x.pintu === "staf")).length;
  console.log("butir staf terkunci", jml);
  assert.ok(jml.operator_cc > jml.verifikator && jml.pusdalops > jml.verifikator);
});
test("bolehHalaman: cermin gerbang (uji-lapangan, direktori, Pusdalops, modul sebelum gerbang)", () => {
  const S = peran => ({jenis: "staf", peran});
  assert.equal(bolehHalaman("/bnpb/dalops", S(["tmc"]), true), false);
  assert.equal(bolehHalaman("/bnpb/dalops", S(["pusdalops"]), true), true);
  assert.equal(bolehHalaman("/bnpb/dalops", S(["tmc"]), false), true);
  assert.equal(bolehHalaman("/direktori", S(["direktori"]), true), true);
  assert.equal(bolehHalaman("/risiko", S(["pusdalops"]), true), false);
  assert.equal(bolehHalaman("/risiko", S(["operator_cc"]), true), true);
  assert.equal(bolehHalaman("/uji-lapangan", S(["operator_cc"]), false), false);
  assert.equal(bolehHalaman("/uji-lapangan", {jenis: "pemirsa", tab: []}, true), true);
  assert.equal(bolehHalaman("/kemitraan/buku", null, true), true);
  assert.equal(bolehHalaman("/lapor", null, true), true);
  assert.equal(bolehHalaman("/semua", null, true), false);
  assert.equal(bolehHalaman("/admin/akun?x=1", null, true), true);   // /admin/* menjaga dirinya sendiri
});
