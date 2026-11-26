/* Uji fungsi murni layar Peluang semai (public/operasi_semai_murni.js): DMS, jam setempat, urutan kota, kalimat kosong, ringkasan teks.
   Masukan di sini potongan bentuk semai.json menurut DESAIN-TEKNIS semai-awan §3 (bukan data layar). SA-11, SA-12. */
import test from "node:test";
import assert from "node:assert/strict";
const mod = await import("../../public/operasi_semai_murni.js");
const M = globalThis.OpsSemaiMurni || mod.default;

const data = {dibuat: "2026-11-14T09:00:00Z", putaran: {model: "ECMWF IFS", res: 0.1, init: "2026-11-14T00:00:00Z", lisensi: "CC BY 4.0"},
  cluster: [{id: "K0001", frp24: 336}, {id: "K0002", frp24: 442}], alasan_kosong: null,
  zona: [{huruf: "A", lat: -1.4, lon: 115.3, skor: 0.74, jendela: ["2026-11-15T06:00Z", "2026-11-15T09:00Z"], zona_waktu: "WIB", prov: "Kalimantan Tengah", base: {id: "PKY", nama: "Tjilik Riwut", menit: 35, km: 176}}],
  asap: {lintas: {negara: "TL", jam: "2026-11-15T09:00Z", tiba_jam: 24, kota: "Dili"}, kota: [{nama: "Parepare", tiba_jam: 3, tingkat: "tinggi"}]}};

test("DMS dan koordinat", () => {
  assert.equal(M.dms(-1.4, 115.3), `1°24'00" LS 115°18'00" BT`);
  assert.equal(M.dms(5.5, 95.25), `5°30'00" LU 95°15'00" BT`);
  assert.equal(M.salinKoordinat(-1.4, 115.3), "-1.400, 115.300");
  assert.equal(M.desimal(-1.4, 115.3), "-1,400, 115,300");
});

test("jam setempat dan jendela terbang", () => {
  assert.equal(M.jendela(data.zona[0]), "13.00 sampai 16.00 WIB");
  assert.equal(M.jendela({jendela: ["2026-11-15T03:00Z", "2026-11-15T06:00Z"], zona_waktu: "WITA"}), "11.00 sampai 14.00 WITA");
  assert.equal(M.hariJam("2026-11-14T09:00:00Z"), "Sab 14 Nov, 16.00 WIB");
  assert.equal(M.fmt(6231), "6.231");
  assert.equal(M.fmt(0.74, 2), "0,74");
  assert.equal(M.fmt(null), "–");
  assert.equal(M.plusJam(data, 18), 9);
});

test("urutan kota: tiba lebih dulu, lalu sudah berasap menurut tingkat, paling banyak 8", () => {
  const kota = [{nama: "S1", tingkat: "rendah", status: "sudah berasap"}, {nama: "T9", tiba_jam: 9, tingkat: "sedang"}, {nama: "S2", tingkat: "tinggi", tiba_jam: 0},
    {nama: "T3", tiba_jam: 3, tingkat: "rendah"}, ...Array.from({length: 8}, (_, i) => ({nama: `X${i}`, tingkat: "rendah", tiba_jam: 0}))];
  const u = M.urutKota(kota);
  assert.deepEqual(u.tiba.map(k => k.nama), ["T3", "T9"]);
  assert.equal(u.sudah[0].nama, "S2");
  assert.equal(u.tiba.length + u.sudah.length, 8);
  assert.equal(u.sisa, kota.length - 8);
});

test("baris asal kota", () => {
  assert.equal(M.barisAsal({asal: {cluster: "K0013", kab: "Kupang", km: 42}, arah: "dari tenggara", angin: {dari: "timur", kmj: 18}, lama_jam: 7}), "dari cluster #13 Kupang, 42 km di tenggara, angin 18 km/j, 7 jam berasap");
  assert.equal(M.barisAsal({}), "");
});

test("kalimat kosong per alasan", () => {
  assert.equal(M.kalimatKosong("tidak_ada_api_besar", {ambang_mw: 40}), "Tidak ada cluster api di atas 40 MW, belum perlu semai.");
  assert.equal(M.kalimatKosong("tidak_ada_awan", data), "Tidak ada awan layak semai yang hanyut ke api dalam 24 jam ke depan.");
  assert.equal(M.kalimatKosong("tanpa_prakiraan", data), "Prakiraan belum tersedia. Putaran terakhir: 14 Nov 00z.");
  assert.match(M.kalimatKosong("tanpa_prakiraan", {}), /belum ada/);
});

test("ringkasan Pos komando: susunan ALGORITMA §11 dan kalimat batas", () => {
  const t = M.ringkasan(data);
  assert.match(t, /^Peluang semai, Sab 14 Nov, 16\.00 WIB \(ECMWF 00z\)/);
  assert.match(t, /Api: 2 cluster besar, 778 MW/);
  assert.match(t, /Asap: menyeberang ke Timor-Leste sekitar 24 jam lagi; tiba \+3 jam di Parepare/);
  assert.match(t, /- A Kalimantan Tengah, -1,400 115,300, 13\.00 sampai 16\.00 WIB, skor 0,74, dari Tjilik Riwut \(PKY\) sekitar 35 menit/);
  assert.match(t, /Usulan mesin, bukan prakiraan resmi\. Konfirmasi tiap operasi dengan BMKG\.$/);
});

test("ringkasan tanpa zona dan tanpa berkas memakai kalimat jujur", () => {
  assert.match(M.ringkasan({...data, zona: [], alasan_kosong: "tidak_ada_awan"}), /Tidak ada awan layak semai/);
  const tanpa = M.ringkasan(null);
  assert.match(tanpa, /prakiraan belum tersedia/);
  assert.match(tanpa, /Usulan mesin, bukan prakiraan resmi/);
});

test("tidak ada klaim terlarang di keluaran", () => {
  const semua = [M.ringkasan(data), M.ringkasan(null), M.ringkasan({...data, zona: []}), ...["tidak_ada_api_besar", "tidak_ada_awan", "tanpa_prakiraan"].map(a => M.kalimatKosong(a, data)), M.asapKalimat(data), M.asapKalimat({...data, asap: {kota: []}}), M.asapKalimat({})].join("\n");
  assert.doesNotMatch(semua, /akan hujan|pasti|memadamkan/i);
});

test("tidak ada huruf kapital semua di teks layar", async () => {
  const {readFileSync} = await import("node:fs"), js = readFileSync(new URL("../../public/operasi_semai.js", import.meta.url), "utf8"), css = readFileSync(new URL("../../public/operasi_semai.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /text-transform\s*:\s*uppercase/);
  assert.doesNotMatch(css, /font-size\s*:[^;}]*\dpx/, "ukuran huruf harus rem");
  assert.doesNotMatch(js, />[A-Z]{4,}</);
});

test("SB-08 hash tujuan: bawaan karhutla, #semai/banjir ke banjir, bolak-balik", () => {
  for (const h of ["", "#semai", "#semai/", "#semai/karhutla", "#lain", undefined]) assert.equal(M.tujuanDariHash(h), "karhutla", String(h));
  assert.equal(M.tujuanDariHash("#semai/banjir"), "banjir");
  assert.equal(M.tujuanDariHash("#semai/banjir/"), "banjir");
  assert.equal(M.hashTujuan("banjir"), "#semai/banjir");
  assert.equal(M.hashTujuan("karhutla"), "#semai");
  for (const t of ["karhutla", "banjir"]) assert.equal(M.tujuanDariHash(M.hashTujuan(t)), t);
});

test("SB-08 saklar: banjir menyembunyikan api dan asap, karhutla tidak berubah", () => {
  const tampak = {api: true, awan: true, asap: true, pengarah: true, anginAsap: true, zona: true, kota: true};
  assert.deepEqual(M.tampakLapis("karhutla", tampak), {api: true, asap: true, anginAsap: true, kotaAsap: true, zonaKarhutla: true, sasaran: false, awan: true, pengarah: true});
  const b = M.tampakLapis("banjir", tampak);
  assert.deepEqual([b.api, b.asap, b.anginAsap, b.kotaAsap, b.zonaKarhutla], [false, false, false, false, false]);
  assert.deepEqual([b.sasaran, b.awan, b.pengarah], [true, true, true]);
  assert.equal(M.tampakLapis("banjir", {...tampak, zona: false}).sasaran, false);
});

test("SB-08 muat malas: semai_banjir.json diambil sekali", async () => {
  let n = 0; const muat = M.malas(async () => { n++; return {zona: []}; });
  assert.equal(n, 0, "belum dipanggil sebelum saklar dipilih");
  const [a, b] = await Promise.all([muat(), muat()]); await muat();
  assert.equal(n, 1); assert.equal(a, b);
});

test("SB-08 layar: memuat semai_banjir.json dari BAWAH yang sama dan tanpa warna literal baru di CSS", async () => {
  const {readFileSync} = await import("node:fs"), js = readFileSync(new URL("../../public/operasi_semai.js", import.meta.url), "utf8"), css = readFileSync(new URL("../../public/operasi_semai.css", import.meta.url), "utf8");
  assert.match(js, /BAWAH \+ "semai_banjir\.json"/);
  assert.match(js, /BAWAH \+ "semai\.json"/);
  const baru = css.slice(css.indexOf("/* SB-08"));
  assert.doesNotMatch(baru, /#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i);
});

test("SA-22 dialog target: ketinggian, bahan, jumlah; muatan kosong tidak 0", () => {
  const z = {ketinggian: {kaki: 4000}, bahan: {usul: "NaCl"}, jumlah: {sortie: 1, muatan: "muatan armada belum diisi"}};
  assert.match(M.ketinggianTeks(z), /4\.000 kaki/);
  assert.equal(M.bahanTeks(z), "NaCl");
  assert.equal(M.jumlahTeks(z), "1 sortie, muatan armada belum diisi");
  assert.equal(M.jumlahTeks({}), "belum tersedia");
});

test("SA-22 KML/GPX: altitude dari ketinggian semai, bukan 0 palsu", async () => {
  await import("../../public/renlap_omc.js");
  const R = globalThis.RenlapOmcMurni;
  assert.equal(R.mSemai({ketinggian: {kaki: 4000}}), 1219);
  assert.equal(R.mSemai({ketinggian: {kaki: null}}), null);
  const {readFileSync} = await import("node:fs"), src = readFileSync(new URL("../../public/renlap_omc.js", import.meta.url), "utf8");
  assert.ok(!/\$\{c\.lat\},0</.test(src) && !/lat\},0 /.test(src), "tidak ada altitude 0 tertulis");
  assert.match(src, /clampToGround/);
});

test("SA-22 KML/GPX: base di tanah, deskripsi dasar awan, XML seimbang", async () => {
  await import("../../public/renlap_omc.js");
  const R = globalThis.RenlapOmcMurni, cp = (k, la) => ({kode: k, nama: k, lat: la, lon: 110});
  const z = {id: "2026112512-A", huruf: "A", ketinggian: {kaki: 4000}, rute: {cp: [cp("B", 1), cp("P1", 2), cp("P2", 3), cp("B", 1)]}};
  const seimbang = x => { const st = []; for (const [, tutup, nm, sendiri] of x.matchAll(/<(\/?)([A-Za-z]+)[^>]*?(\/?)>/g)) { if (sendiri) continue; if (tutup) { if (st.pop() !== nm) return false; } else st.push(nm); } return !st.length; };
  const kml = R.bangunBerkas(z, "kml"), gpx = R.bangunBerkas(z, "gpx");
  assert.ok(seimbang(kml.replace(/<\?xml.*?\?>/, "")) && seimbang(gpx.replace(/<\?xml.*?\?>/, "")));
  assert.match(kml, /dasar awan perkiraan model, bukan ketinggian terbang/); assert.match(gpx, /<desc>Ketinggian = dasar awan perkiraan model/);
  assert.match(kml, /<coordinates>110,1 110,2<\/coordinates>/);            // berangkat: base tanpa altitude
  assert.match(kml, /<coordinates>110,2,1219 110,3,1219<\/coordinates>/);  // terbang absolute
  assert.match(kml, /<coordinates>110,3 110,1<\/coordinates>/);            // kembali ke base
  assert.ok(!/<ele>/.test(gpx.split("<rte>")[1].split("</rtept>")[0]) && (gpx.match(/<ele>1219<\/ele>/g) || []).length === 4);
  const tanpa = R.bangunBerkas({...z, ketinggian: {kaki: null}}, "kml");
  assert.ok(!/,0[ <]|absolute/.test(tanpa) && /clampToGround/.test(tanpa));
});

test("SA-23 mulai dari target: daftar, zona dari baris, target tanpa baris", () => {
  const kolom = ["lat", "lon", "langkah", "Q", "D", "T", "cape", "air", "rh", "geser", "naik", "g", "bhy"], b = (la, lo, Q, D, T, g = 1, bhy = 0) => [la, lo, 12, Q, D, T, 0, 0, 0, 0, 0, g, bhy];
  const d = {kandidat_target: {kolom, catatan: "x", param_skor: {bobot: {q: 0.45, d: 0.4, t: 0.15}, zona_skor_min: 0.35, zona_jarak_min_km: 40, zona_maks: 5}, target: {
    "62|Kotawaringin": {nama: "Kotawaringin", prov: "Kalteng", n_cluster: 2, frp24: 300, baris: [b(-2, 112, 0.8, 0.8, 0.8), b(-2, 112, 0.5, 0.5, 0.5), b(-2.1, 112.1, 0.7, 0.7, 0.7), b(-3, 113, 0.8, 0.8, 0.8, 1, 1), b(-4, 114, 0.9, 0.9, 0.9, 0), b(-5, 115, 0.9, 0, 0.9)]},
    "62|Kosong": {nama: "Kosong", prov: "Kalteng", n_cluster: 1, frp24: 50, baris: []},
    "62|Rendah": {nama: "Rendah", prov: "Kalteng", n_cluster: 1, frp24: 400, baris: [b(-6, 110, 0.2, 0.2, 0.2)]}}}};
  assert.deepEqual(M.targetDaftar(d).map(t => t.nama), ["Rendah", "Kotawaringin", "Kosong"]);   // urut daya api turun
  assert.deepEqual(M.targetDaftar({}), []);
  const r = M.zonaTarget(d, "62|Kotawaringin");
  assert.equal(r.zona.length, 1);                       // sel terbaik per koordinat, sel 15 km sebelah dibuang NMS, bahaya/gerbang gagal/D nol dibuang
  assert.equal(r.zona[0].huruf, "T1"); assert.equal(r.zona[0].lat, -2); assert.equal(r.zona[0].skor, 0.8);
  assert.equal(M.zonaTarget(d, "62|Kosong").alasan, "tanpa_baris");
  // param_skor dari data dipakai: ambang naik, jarak turun, dan bobot berubah mengubah hasil
  const ubah = p => ({kandidat_target: {...d.kandidat_target, param_skor: {...d.kandidat_target.param_skor, ...p}}});
  assert.equal(M.zonaTarget(ubah({zona_skor_min: 0.9}), "62|Kotawaringin").zona.length, 0);
  assert.equal(M.zonaTarget(ubah({zona_jarak_min_km: 5}), "62|Kotawaringin").zona.length, 2);
  assert.equal(M.zonaTarget(ubah({zona_maks: 1}), "62|Kotawaringin").zona.length, 1);
  const qSaja = M.zonaTarget(ubah({bobot: {q: 0.2, d: 0.2, t: 0.6}, zona_skor_min: 0.1}), "62|Rendah");
  assert.equal(qSaja.zona.length, 1); assert.ok(Math.abs(qSaja.zona[0].skor - 0.2) < 1e-9);
  // tanpa param_skor: kosong beralasan, tanpa cadangan konstanta
  const lama = {kandidat_target: {kolom, target: d.kandidat_target.target}};
  assert.deepEqual(M.zonaTarget(lama, "62|Kotawaringin"), {zona: [], alasan: "tanpa_param"});
  assert.equal(M.kosongTarget("tanpa_param"), "Parameter skor belum tersedia di data putaran ini.");
  assert.equal(M.zonaTarget(d, "62|Rendah").alasan, "tanpa_zona");
  assert.equal(M.zonaTarget(d, "99|x").alasan, "target_tak_ada");
  assert.equal(M.zonaTarget({}, "x").zona.length, 0);
  assert.ok(M.kosongTarget("tanpa_baris").length && !/akan hujan|aman/.test(M.kosongTarget("tanpa_zona")));
});
