/* Gerbang penghubung entitas direktori: nama ditautkan hanya bila jelas, ambigu dibiarkan lepas, dan sisi lintas berkas benar-benar terbentuk. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {indeks, cari, hubung, strategis} from "../../scripts/akademisi/hubung.mjs";

const ORG = [{id: "L:iabi", nama: "Ikatan Ahli Kebencanaan Indonesia", singkatan: "IABI"}, {id: "K:Institut Teknologi Bandung", nama: "Institut Teknologi Bandung"},
  {id: "L:pmi-a", nama: "PMI Kota A", singkatan: "PMI"}, {id: "L:pmi-b", nama: "PMI Kota B", singkatan: "PMI"}];

test("nama lengkap, singkatan unik, alias Inggris, dan nama di dalam teks ditautkan", () => {
  const p = indeks(ORG);
  assert.equal(cari(p, "Ikatan Ahli Kebencanaan Indonesia (IABI)"), "L:iabi");
  assert.equal(cari(p, "IABI"), "L:iabi");
  assert.equal(cari(p, "Bandung Institute of Technology"), "K:Institut Teknologi Bandung");
  assert.equal(cari(p, "Pusat Mitigasi Bencana, Institut Teknologi Bandung"), "K:Institut Teknologi Bandung");
});

test("singkatan ambigu dan nama asing tidak ditautkan", () => {
  const p = indeks(ORG);
  assert.equal(cari(p, "PMI"), null);
  assert.equal(cari(p, "Universitas Antah Berantah"), null);
  assert.equal(cari(p, ""), null);
});

test("graf menautkan pakar ke kampus dan ke asosiasi, tokoh dan pembuat inovasi ke lembaga", () => {
  const D = {lembaga: [{id: "iabi", nama: "Ikatan Ahli Kebencanaan Indonesia", singkatan: "IABI"}, {id: "brin", nama: "Badan Riset dan Inovasi Nasional", singkatan: "BRIN"}],
    kampus: {"Institut Teknologi Bandung": {}}, induk: {orang: [["A1", "Pakar Satu", "Institut Teknologi Bandung"]]},
    afiliasi: {A1: [{nama_lembaga: "IABI", peran: "anggota", sumber_url: "https://orcid.org/x"}]},
    tokoh: [{id: "t1", nama: "Tokoh Satu", lembaga: "Badan Riset dan Inovasi Nasional"}],
    inovasi: [{id: "i1", nama: "Alat", pembuat: [{nama: "BPPT (kini BRIN)"}]}]};
  const g = hubung(D), ada = (a, b, r) => g.sisi.some(s => s[0] === a && s[1] === b && s[2] === r);
  assert.ok(ada("P:A1", "K:Institut Teknologi Bandung", "bekerja di"));
  assert.ok(ada("P:A1", "L:iabi", "anggota"));
  assert.ok(ada("T:t1", "L:brin", "berperan di"));
  assert.ok(ada("L:brin", "I:i1", "membuat"));
  assert.equal(D.afiliasi.A1[0].lembaga_id, "iabi");
  assert.equal(D.inovasi[0].pembuat[0].lembaga_id, "brin");
});

test("cabang bersinggkatan sama: induk dipilih; organisasi asing dibuatkan simpul sendiri", () => {
  const D = {lembaga: [{id: "bmkg", nama: "Badan Meteorologi, Klimatologi, dan Geofisika", singkatan: "BMKG"}, {id: "sta1", nama: "Stasiun Meteorologi X", singkatan: "BMKG", induk: "bmkg"}],
    induk: {orang: [["A2", "Pakar Dua", "Kampus Tak Ada"]]}, afiliasi: {A2: [{nama_lembaga: "American Geophysical Union", peran: "anggota"}]},
    tokoh: [{id: "t2", nama: "Tokoh Dua", lembaga: "BMKG"}]};
  const g = hubung(D);
  assert.ok(g.sisi.some(s => s[0] === "T:t2" && s[1] === "L:bmkg"));
  assert.ok(g.sisi.some(s => s[0] === "P:A2" && s[1].startsWith("G:") && g.simpul[s[1]].j === "organisasi"));
});

test("afiliasi yang sama dengan kampus utama (nama Inggris) dibuang", () => {
  const D = {kampus: {"Universitas Gadjah Mada": {}}, induk: {orang: [["A3", "Pakar Tiga", "Universitas Gadjah Mada"]]},
    afiliasi: {A3: [{nama_lembaga: "Gadjah Mada University"}, {nama_lembaga: "American Geophysical Union"}]}};
  hubung(D);
  assert.deepEqual(D.afiliasi.A3.map(x => x.nama_lembaga), ["American Geophysical Union"]);
});

test("tokoh yang juga pakar ditautkan sebagai orang yang sama", () => {
  const D = {induk: {orang: [["A9", "Eko Teguh Paripurno", "UPN"]]}, tokoh: [{id: "eko", nama: "Dr. Eko Teguh Paripurno"}]};
  const g = hubung(D);
  assert.equal(D.tokoh[0].pakar_id, "A9");
  assert.ok(g.sisi.some(s => s[0] === "T:eko" && s[1] === "P:A9" && s[2] === "orang yang sama"));
});

test("partner strategis: organisasi dengan banyak pakar dan dana mendapat bintang beralasan", () => {
  const orang = Array.from({length: 30}, (_, i) => ["A" + i, "Pakar " + i, i < 25 ? "Kampus Besar" : "Kampus Kecil"]);
  const D = {lembaga: [{id: "wb", nama: "Bank Dunia"}, {id: "kecil", nama: "Lembaga Kecil"}], kampus: {"Kampus Besar": {}, "Kampus Kecil": {}},
    induk: {orang}, pendanaan: [{id: "p1", nama: "Proyek", pemberi: "Bank Dunia", nilai_usd: 160e6, jenis_entri: "proyek"}, {id: "p2", nama: "Proyek 2", pemberi: "Bank Dunia", nilai_usd: 50e6}]};
  const g = hubung(D), st = strategis(g, D);
  assert.ok(st["K:Kampus Besar"].skor > st["K:Kampus Kecil"].skor);
  assert.ok(st["L:wb"].alasan.some(a => a.includes("Mendanai 2 proyek")));
  assert.ok(!st["L:kecil"]);
});

test("pakar berinisial cocok dengan tokoh bernama lengkap", () => {
  const D = {induk: [["A1", "D. H. Natawidjaja", "BRIN", []], ["A2", "D. Natawidjaja", "BRIN", []]], tokoh: [{id: "dhn", nama: "Danny Hilman Natawidjaja"}, {id: "x", nama: "Dewi Natawidjaja"}]};
  const g = hubung(D);
  assert.ok(g.sisi.some(s => s[0] === "T:dhn" && s[1] === "P:A1" && s[2] === "orang yang sama"));
  assert.ok(!g.sisi.some(s => s[0] === "T:x" && s[2] === "orang yang sama"));
});

test("pakar diaspora tersambung ke institusinya", () => {
  const D = {lembaga: [{id: "uc", nama: "Universitas Contoh Raya", kategori: "kampus"}], diaspora: [{id: "mb", nama: "Mizan Bisri", openalex_id: "A7", institusi: "Universitas Contoh Raya"}]};
  const g = hubung(D);
  assert.ok(g.sisi.some(s => s[0] === "P:A7" && s[1] === "L:uc" && s[2] === "bekerja di"));
});

test("BNPB tidak pernah jadi partner strategis", () => {
  const g = {simpul: {"L:bnpb": {j: "lembaga", n: "Badan Nasional Penanggulangan Bencana"}, "L:x": {j: "lembaga", n: "Lembaga X"}}, sisi: []};
  for (let i = 0; i < 40; i++) { g.simpul["P:" + i] = {j: "pakar", n: "p" + i}; g.sisi.push(["P:" + i, "L:bnpb", "bekerja di"], ["P:" + i, "L:x", "bekerja di"]); }
  const st = strategis(g, {});
  assert.ok(!st["L:bnpb"]);
});

test("BPBD dan BPBA (di bawah koordinasi BNPB) tidak pernah jadi partner strategis", () => {
  const g = {simpul: {"L:bpbd-jatim": {j: "lembaga", n: "BPBD Provinsi Jawa Timur"}, "L:bpba": {j: "lembaga", n: "Badan Penanggulangan Bencana Aceh (BPBA)"}, "L:x": {j: "lembaga", n: "Lembaga X"}}, sisi: []};
  for (let i = 0; i < 40; i++) { g.simpul["P:" + i] = {j: "pakar", n: "p" + i}; for (const o of ["L:bpbd-jatim", "L:bpba", "L:x"]) g.sisi.push(["P:" + i, o, "bekerja di"]); }
  const st = strategis(g, {});
  assert.ok(!st["L:bpbd-jatim"] && !st["L:bpba"]);
});

/* panen data publik 30 Okt 2026: paten, alias ROR/Wikidata, penyambung ke berkas R2 */
test("paten menautkan pakar penemu dan kampus pemegang; alias Inggris hasil panen dikenali", async () => {
  const D = {kampus: {"Universitas Lambung Mangkurat": {}, "Universitas Brawijaya": {}}, induk: {orang: [["A9", "Pakar Paten", "Universitas Lambung Mangkurat"]]},
    pakar_ekstra: {A9: {paten: [{nomor: "S1", judul: "Alat pantau gambut", pemegang: "LPPM Universitas Lambung Mangkurat", sumber_url: "https://pdki-indonesia.dgip.go.id/x"}]}}};
  const g = hubung(D), ada = (a, b, r) => g.sisi.some(s => s[0] === a && s[1] === b && s[2] === r);
  assert.ok(ada("P:A9", "N:S1", "menemukan"));
  assert.ok(ada("K:Universitas Lambung Mangkurat", "N:S1", "memegang paten"));
  assert.equal(g.simpul["N:S1"].j, "paten");
  assert.equal(cari(indeks([{id: "K:Universitas Brawijaya", nama: "Universitas Brawijaya"}]), "University of Brawijaya"), "K:Universitas Brawijaya");
});

test("penyambung panen: kab Kota beda Kabupaten, lembaga lama tidak ditimpa, daftar hitam aktif terbaca, hibah tidak dobel", async () => {
  const S = await import("../../scripts/akademisi/sambung_panen.mjs");
  assert.notEqual(S.kunciKab("Kota Bogor"), S.kunciKab("Kabupaten Bogor"));
  assert.equal(S.kunciKab("Kabupaten Labuhan Batu"), S.kunciKab("Labuhanbatu"));
  const P = {anggaran_pemda: [{prov: "32", kab: "Kabupaten Bogor", tahun: 2025, pos: "BTT", nilai_rp: 5e10}, {prov: "32", kab: "Kota Bogor", tahun: 2025, pos: "BTT", nilai_rp: 1e10}],
    fasilitas_kritis: {kolom: ["id", "jenis", "nama", "lat", "lon", "prov", "kab", "kapasitas"], baris: [["r1", "rs", "RS A", 0, 0, "32", "Bogor", 100], ["r2", "rs", "RS B", 0, 0, "32", "Kota Bogor", 50]]}};
  const w = S.wilayahDaya(P), kb = w.kab.find(k => k.kab === "Kabupaten Bogor"), kt = w.kab.find(k => k.kab === "Kota Bogor");
  assert.equal(kb.apbd[2025].BTT, 5e10); assert.equal(kb.fasilitas.rs_tt, 100); assert.equal(kt.fasilitas.rs_tt, 50); assert.equal(w.prov["32"].fasilitas.rs, 2);
  const lama = [{id: "pos-sar-x", nama: "Pos SAR Lama"}], baru = S.lembagaBaru({pos_sar: [{id: "pos-sar-x", nama: "Pos SAR Baru"}, {id: "pos-sar-y", nama: "Pos SAR Y", induk: "tidak-ada"}]}, lama);
  assert.deepEqual(baru.map(l => l.id), ["pos-sar-y"]); assert.equal(baru[0].induk, undefined);
  const le = S.lembagaEkstra({daftar_hitam_cocok: [{nama: "Refa Tech Solutions", cocok_ke: "katalog_penyedia", dasar: "nama ternormalkan ketat; 000.3/0560/III/2026 (aktif)"}]}, [{id: "penyedia-refa-tech-solutions", nama: "Refa Tech Solutions"}]);
  assert.equal(le.lembaga["penyedia-refa-tech-solutions"].daftar_hitam.aktif, true);
  assert.equal(S.hibahBaru([{judul: "Riset A", tahun: 2024}], [{judul: "riset a", tahun: 2024}, {judul: "Riset B", tahun: 2024}]).length, 1);
});
