import test from "node:test";
import assert from "node:assert/strict";
import {bacaKoordinat, teksKoordinat, titikGeo, jejakGeo, tepiPeta, angkaStrip, fotoAman, putusanTinjau, dtLokalKeMs, rapikanTugas, labelStatusPeta, warnaStatusPeta, ringkasAnggota, WARNA_LAIN} from "../../public/petugas/panel_murni.js";

test("bacaKoordinat: koma desimal Indonesia, titik desimal, dua bilangan saja", () => {
  assert.deepEqual(bacaKoordinat("-0,05793 116,42250"), {lat: -0.05793, lon: 116.4225});
  assert.deepEqual(bacaKoordinat("-0.05793, 116.42250"), {lat: -0.05793, lon: 116.4225});
  assert.deepEqual(bacaKoordinat("  3 , 98  "), {lat: 3, lon: 98});
  for (const salah of ["", null, "abc", "1", "1 2 3", "91 100", "10 181", "-91 0"]) assert.equal(bacaKoordinat(salah), null, String(salah));
  assert.equal(teksKoordinat(-0.057934, 116.4225), "-0.05793, 116.42250");
});

test("titikGeo: koordinat sah saja, saringan hadir dan status, properti seragam", () => {
  const t = [{orang: "o1", nama: "Ani", tugas: "T1", lat: -0.05, lon: 116.4, status: "lolos", waktu: 1700000000000}, {orang: "o2", nama: "Budi", lat: 1, lon: 2, status: "tinjau"}, {orang: "o3", lat: 9, lon: 999, status: "sah"}, {orang: "o4", lat: null, lon: null, status: "sah"}, {orang: "o5", lat: "x", lon: 3}, {orang: "o6", lat: 5, lon: 6, status: "sah"}];
  const semua = titikGeo(t);
  assert.deepEqual(semua.features.map(f => f.properties.orang), ["o1", "o2", "o6"]);
  assert.deepEqual(semua.features[0].geometry.coordinates, [116.4, -0.05]);
  assert.equal(semua.features[0].properties.warna, warnaStatusPeta("lolos"));
  assert.deepEqual(titikGeo(t, "hadir").features.map(f => f.properties.orang), ["o1", "o6"]);
  assert.deepEqual(titikGeo(t, "tinjau").features.map(f => f.properties.orang), ["o2"]);
  assert.deepEqual(titikGeo(undefined).features, []);
  assert.equal(warnaStatusPeta("__proto__"), WARNA_LAIN); assert.equal(labelStatusPeta("constructor"), "Belum jelas");
});

test("jejakGeo: titik datar dikelompokkan per orang dan diurut waktu; larik titik; satu titik tidak jadi garis", () => {
  const datar = [{orang: "a", lat: 1, lon: 1, waktu: 30}, {orang: "a", lat: 1, lon: 3, waktu: 10}, {orang: "a", lat: 1, lon: 2, waktu: 20}, {orang: "b", lat: 5, lon: 5, waktu: 1}];
  const g = jejakGeo(datar);
  assert.equal(g.features.length, 1);
  assert.deepEqual(g.features[0].geometry.coordinates, [[3, 1], [2, 1], [1, 1]]);
  const larik = jejakGeo([{orang: "c", titik: [[1, 2], {lat: 3, lon: 4}, [999, 1]]}]);
  assert.deepEqual(larik.features[0].geometry.coordinates, [[2, 1], [4, 3]]);
  assert.deepEqual(jejakGeo(null).features, []);
});

test("tepiPeta: pembatas titik dan garis, null bila kosong", () => {
  const t = titikGeo([{lat: 1, lon: 10, status: "lolos"}, {lat: -3, lon: 20, status: "sah"}]), j = jejakGeo([{orang: "a", titik: [[5, 5], [6, 30]]}]);
  assert.deepEqual(tepiPeta(t, j), [5, -3, 30, 6]);
  assert.equal(tepiPeta(titikGeo([])), null);
});

test("angkaStrip: angka non-negatif bulat, nilai aneh jadi 0", () => {
  assert.deepEqual(angkaStrip({hadir: "12", belum_absen: 3.9, belum_logbook: -4, tinjau: "x"}), {hadir: 12, belum_absen: 3, belum_logbook: 0, tinjau: 0});
  assert.deepEqual(angkaStrip(null), {hadir: 0, belum_absen: 0, belum_logbook: 0, tinjau: 0});
});

test("fotoAman: hanya rute foto sendiri", () => {
  assert.equal(fotoAman("/api/petugas/foto/abc123"), "/api/petugas/foto/abc123");
  assert.equal(fotoAman("/api/petugas/foto/acuan_9-x?u=1"), "/api/petugas/foto/acuan_9-x?u=1");
  for (const u of ["https://evil.example/x.jpg", "//evil.example/api/petugas/foto/a", "/api/petugas/foto/../../x", "/api/petugas/foto/", "javascript:alert(1)", "/api/petugas/foto/a\"onerror=1", null, 5]) assert.equal(fotoAman(u), null, String(u));
});

test("putusanTinjau: sah tanpa catatan boleh; tolak wajib catatan; putusan asing ditolak", () => {
  assert.deepEqual(putusanTinjau("sah", ""), {ok: true, galat: "", badan: {putus: "sah", catatan: ""}});
  assert.equal(putusanTinjau("tolak", "  ").ok, false);
  assert.match(putusanTinjau("tolak", "ab").galat, /Catatan wajib/);
  assert.deepEqual(putusanTinjau("tolak", "  wajah   berbeda ").badan, {putus: "tolak", catatan: "wajah berbeda"});
  assert.equal(putusanTinjau("tolak", "x".repeat(900)).badan.catatan.length, 300);
  for (const p of ["", "lolos", "__proto__", undefined]) assert.equal(putusanTinjau(p, "catatan").ok, false);
});

const tugasDasar = (o = {}) => ({judul: "Patroli Kenohan", bencana: "karhutla", koordinat: "-0,05793 116,42250", radius_m: "", wilayah_teks: "Kec. Kenohan", renlap_url: "", mulai: "2026-11-02T08:00", selesai: "2026-11-02T17:00", anggota: ["o1", "o2", "o1"], ...o});

test("dtLokalKeMs: format datetime-local saja", () => {
  assert.ok(Number.isFinite(dtLokalKeMs("2026-11-02T08:00")));
  for (const s of ["", "2026-11-02", "2026-11-02 08:00", null, "besok"]) assert.ok(Number.isNaN(dtLokalKeMs(s)), String(s));
});

test("rapikanTugas: sah, radius kosong tidak dikirim, anggota unik", () => {
  const r = rapikanTugas(tugasDasar());
  assert.equal(r.ok, true);
  assert.deepEqual(r.badan.anggota, ["o1", "o2"]); assert.equal("radius_m" in r.badan, false); assert.equal("renlap_url" in r.badan, false);
  assert.equal(r.badan.lat, -0.05793); assert.equal(r.badan.lon, 116.4225); assert.ok(r.badan.selesai > r.badan.mulai);
  assert.equal(rapikanTugas(tugasDasar({radius_m: "300", renlap_url: "https://renlap.example/x"})).badan.radius_m, 300);
});

test("rapikanTugas ditolak: judul, bencana, titik, radius, waktu, anggota, tautan", () => {
  const g = o => rapikanTugas(tugasDasar(o)).galat;
  assert.ok(g({judul: "ab"}).judul); assert.ok(g({bencana: "gempa"}).bencana); assert.ok(g({bencana: "__proto__"}).bencana); assert.ok(g({koordinat: "x"}).koordinat);
  assert.ok(g({radius_m: "10"}).radius_m); assert.ok(g({radius_m: "1e3"}).radius_m); assert.ok(g({radius_m: "99999"}).radius_m);
  assert.ok(g({mulai: ""}).mulai); assert.ok(g({selesai: "2026-11-02T07:00"}).selesai);
  assert.ok(g({anggota: []}).anggota); assert.ok(g({anggota: [5, ""]}).anggota);
  assert.ok(g({renlap_url: "http://x.id"}).renlap_url); assert.ok(g({renlap_url: "javascript:alert(1)"}).renlap_url);
  assert.equal(rapikanTugas(tugasDasar({judul: "ab"})).badan, null);
});

test("ringkasAnggota: larik objek server {id,nama,peran} -> jumlah dan nama, ketua dulu; bentuk lama tetap terbaca", () => {
  const a = [{id: "1", nama: "Budi", peran: "anggota"}, {id: "2", nama: "Ani", peran: "ketua"}, {id: "3", nama: "Cici", peran: "anggota"}];
  assert.deepEqual(ringkasAnggota(a), {jumlah: 3, nama: "Ani (ketua), Budi, Cici"});
  assert.equal(ringkasAnggota(a, 2).nama, "Ani (ketua), Budi, +1");
  assert.deepEqual(ringkasAnggota([]), {jumlah: 0, nama: ""});
  assert.deepEqual(ringkasAnggota(5), {jumlah: 5, nama: ""});
  assert.deepEqual(ringkasAnggota(null), {jumlah: 0, nama: ""}); assert.deepEqual(ringkasAnggota(undefined), {jumlah: 0, nama: ""});
  assert.equal(ringkasAnggota([null, {id: "x"}, {nama: "<b>", peran: "anggota"}]).nama, "<b>", "esc dilakukan di layar, bukan di sini");
});

test("jejakGeo: bentuk ringkas server titik [[lat,lon],...] menjadi GeoJSON [lon,lat] dengan urutan titik dipertahankan", () => {
  const g = jejakGeo([{orang: "o1", nama: "Ani", titik: [[-0.05, 116.4], [-0.06, 116.5], [-0.07, 116.6]]}]);
  assert.deepEqual(g.features[0].geometry.coordinates, [[116.4, -0.05], [116.5, -0.06], [116.6, -0.07]]);
  assert.equal(g.features[0].properties.orang, "o1");
});
