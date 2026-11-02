import test from "node:test";
import assert from "node:assert/strict";
import {rapikanPanggil, ringkasPanggil, urlEkspor, urlDaftarPanggil, queryOrang, barisOrang, keahlianOrang, badanKeahlian, teksTanggalPelatihan, ringkasProfil, rapikanKit, kitTugas, daftarKeahlian, keahlianItem} from "../../public/petugas/panggil_murni.js";

const sah = {tugas_id: "t1", keahlian: ["drone", "pompa"], prov: " Kalimantan  Timur ", kab: "", kuota: "5", batas_jam: "12", pesan: "  Butuh operator drone besok pagi  "};

test("rapikanPanggil: badan persis kontrak, kab kosong tidak dikirim, spasi dirapikan", () => {
  const r = rapikanPanggil(sah);
  assert.equal(r.ok, true);
  assert.deepEqual(r.badan, {tugas_id: "t1", keahlian: ["drone", "pompa"], prov: "Kalimantan Timur", kuota: 5, batas_jam: 12, pesan: "Butuh operator drone besok pagi"});
  assert.equal(rapikanPanggil({...sah, kab: "Kutai"}).badan.kab, "Kutai");
});

test("rapikanPanggil: tiap kolom salah dilaporkan, kunci keahlian berbahaya ditolak", () => {
  const g = f => rapikanPanggil({...sah, ...f}).galat;
  assert.ok(g({tugas_id: ""}).tugas_id); assert.ok(g({keahlian: []}).keahlian); assert.ok(g({keahlian: ["__proto__x"]}).keahlian);
  assert.ok(g({keahlian: ["Drone"]}).keahlian); assert.ok(g({keahlian: [1]}).keahlian);
  assert.ok(g({prov: " "}).prov);
  for (const k of ["0", "-1", "1.5", "abc", "", "501"]) assert.ok(g({kuota: k}).kuota, k);
  for (const j of ["0", "169", "x"]) assert.ok(g({batas_jam: j}).batas_jam, j);
  assert.ok(g({pesan: "ab"}).pesan);
  assert.equal(rapikanPanggil(null).ok, false);
  assert.equal(rapikanPanggil({...sah, keahlian: ["drone", "drone"]}).badan.keahlian.length, 1);
});

test("ringkasPanggil: angka aman, status dikenal saja, sisa jam", () => {
  const kini = 1_000_000;
  const r = ringkasPanggil({id: "p1", kuota: 5, siap: 2, tidak: "1", antre: -3, status: "buka", batas: kini + 90 * 60e3}, kini);
  assert.deepEqual([r.kuota, r.siap, r.tidak, r.antre, r.kurang, r.sisaJam, r.label, r.kelas], [5, 2, 1, 0, 3, 2, "Buka", "hijau"]);
  assert.equal(ringkasPanggil({status: "__proto__"}).label, "Belum jelas");
  assert.equal(ringkasPanggil({status: "constructor"}).kelas, "abu");
  assert.equal(ringkasPanggil({batas: kini - 1}, kini).sisaJam, null);
  assert.equal(ringkasPanggil({siap: 9, kuota: 5}).kurang, 0);
  assert.equal(ringkasPanggil(null).kuota, 0);
});

test("url: ekspor dikodekan, kosong null; query orang membawa keahlian sah saja", () => {
  assert.equal(urlEkspor("t 1&x"), "/api/petugas/panel/ekspor.csv?tugas_id=t%201%26x");
  assert.equal(urlEkspor(""), null);
  assert.equal(urlDaftarPanggil("a/b"), "/api/petugas/panel/panggil?tugas_id=a%2Fb");
  assert.equal(queryOrang({cari: "ani", keahlian: "drone"}), "cari=ani&jenis=&halaman=1&keahlian=drone");
  assert.equal(queryOrang({keahlian: "a&b=c"}), "cari=&jenis=&halaman=1");
});

test("barisOrang dan keahlianOrang menerima dua bentuk dan membuang sampah", () => {
  assert.deepEqual(barisOrang({baris: [1]}), [1]); assert.deepEqual(barisOrang({orang: [2]}), [2]); assert.deepEqual(barisOrang(null), []);
  assert.deepEqual(keahlianOrang({keahlian: ["drone", "X Y", 3, "pompa"]}), ["drone", "pompa"]); assert.deepEqual(keahlianOrang({}), []);
});

test("badanKeahlian: bukti opsional dan dipotong, kunci tidak sah null", () => {
  assert.deepEqual(badanKeahlian("o1", "drone"), {orang_id: "o1", keahlian: "drone"});
  assert.equal(badanKeahlian("o1", "drone", "  Sertifikat   RPL ").bukti, "Sertifikat RPL");
  assert.equal(badanKeahlian("o1", "drone", "x".repeat(500)).bukti.length, 200);
  assert.equal(badanKeahlian("", "drone"), null); assert.equal(badanKeahlian("o1", "Drone!"), null);
});

test("daftarKeahlian dan keahlianItem: kunci baru tampil berlabel", () => {
  assert.equal(keahlianItem("drone").label, "Drone"); assert.equal(keahlianItem("las_listrik").label, "Las listrik");
  const d = daftarKeahlian(["drone", "las_listrik", "BAD", "las_listrik"]);
  assert.equal(d.filter(x => x.k === "drone").length, 1); assert.equal(d.at(-1).k, "las_listrik"); assert.ok(!d.some(x => x.k === "BAD"));
});

test("teksTanggalPelatihan: ISO, ms epoch, teks bebas", () => {
  assert.equal(teksTanggalPelatihan("2026-05-03"), "3 Mei 2026");
  assert.equal(teksTanggalPelatihan("2026-12-31T10:00:00Z"), "31 Desember 2026");
  assert.equal(teksTanggalPelatihan(String(Date.UTC(2026, 10, 2))), "2 November 2026");
  assert.equal(teksTanggalPelatihan("2026-13-01"), "2026-13-01"); assert.equal(teksTanggalPelatihan(null), "");
});

test("ringkasProfil: pelatihan terbaru dulu, nama kosong dibuang, keahlian berlabel", () => {
  const p = ringkasProfil({pelatihan: [{nama: "Dasar", tanggal: "2025-01-10"}, {nama: " ", tanggal: "2026-01-01"}, {nama: "Lanjut", tanggal: "2026-03-05"}, null], keahlian: ["drone", "drone", "BAD"]});
  assert.deepEqual(p.pelatihan, [{nama: "Lanjut", tanggal: "5 Maret 2026"}, {nama: "Dasar", tanggal: "10 Januari 2025"}]);
  assert.deepEqual(p.keahlian.map(x => x.label), ["Drone"]); assert.equal(p.ada, true);
  assert.equal(ringkasProfil({}).ada, false); assert.equal(ringkasProfil(null).ada, false);
});

test("rapikanKit: hanya kit_tugas, jumlah bawaan 1, jumlah salah ditolak, id luar diabaikan", () => {
  const saya = {kit_tugas: [{id: 7, nama: "Pompa"}, {id: "k2", nama: "Selang"}, {id: null, nama: "x"}, {id: 9, nama: " "}]};
  assert.equal(kitTugas(saya).length, 2);
  assert.deepEqual(rapikanKit({7: "", k2: "3", 99: "5"}, saya), {ok: true, galat: {}, kit: [{kit_id: 7, jumlah: 1}, {kit_id: "k2", jumlah: 3}]});
  assert.deepEqual(rapikanKit({}, saya).kit, []);
  for (const v of ["0", "-1", "1.5", "abc", "1000"]) assert.equal(rapikanKit({7: v}, saya).ok, false, v);
  assert.deepEqual(rapikanKit({__proto__: {7: "2"}}, saya).kit, []);
  assert.deepEqual(rapikanKit({7: "2"}, {}), {ok: true, galat: {}, kit: []});
});
