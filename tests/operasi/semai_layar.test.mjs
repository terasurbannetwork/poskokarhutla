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
