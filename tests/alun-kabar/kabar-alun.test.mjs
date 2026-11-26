import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {gabung, saring, teksKartu} from "../../public/lapor/alun_kabar.js";
import {kejadian, warga, kabar, WIB} from "./fixtures/kabar.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const baca = p => readFileSync(ROOT + p, "utf8");
const SEKARANG = WIB("2026-11-25T10:00");

test("N1 klaster satu kab, jenis, dan tanggal menempel; angka warga tetap di pita warga", () => {
  const r = gabung(kabar(), [warga()]);
  assert.equal(r.length, 1, "Klaster cocok harus menempel, bukan jadi kartu baru. Akibatnya kejadian dobel. Periksa gabung() di public/lapor/alun_kabar.js.");
  assert.equal(r[0].warga.length, 1);
  assert.equal(r[0].resmi.angka.mengungsi, null, "Angka warga bocor ke angka resmi. Angka antarsumber tidak boleh bercampur (D3).");
});

test("N2 kab beda tidak menempel: jadi kejadian 'Belum ada laporan resmi'", () => {
  const r = gabung(kabar(), [warga({lokasi: {kab: "Lain", provKode: "11"}})]);
  assert.equal(r.length, 2, "Klaster beda kab ikut menempel. Akibatnya angka warga tampil di bawah kab yang salah.");
  const lepas = r.find(x => !x.resmi);
  assert.equal(lepas.statusLabel, "Belum ada laporan resmi");
  assert.equal(lepas.warga.length, 1);
});

test("N2b jenis beda tidak menempel", () => {
  assert.equal(gabung(kabar(), [warga({jenisId: "longsor"})]).length, 2, "Jenis berbeda menempel ke kejadian lain. Cocokkan jenis di gabung().");
});

test("N3 waktu bukan berawalan YYYY-MM-DD atau null tidak menempel", () => {
  for (const waktu of ["kemarin", null, ""]) {
    assert.equal(gabung(kabar(), [warga({waktu})])[0].warga.length, 0, `waktu=${JSON.stringify(waktu)} menempel. Tanggal tak terbaca tidak boleh dicocokkan.`);
  }
});

test("N3b tanggal di luar jendela (terlalu awal dari mulai) tidak menempel", () => {
  assert.equal(gabung(kabar(), [warga({waktu: "2026-11-10 08.00"})])[0].warga.length, 0, "Klaster sebelum jendela mulai menempel. Jendela: mulai minus 1 hari sampai hari berkas.");
});

test("N4 klaster cocok dua kejadian menempel pada mulai terdekat", () => {
  const kb = kabar([kejadian(), kejadian({id: "b2", mulai: "2026-11-24"})]);
  const r = gabung(kb, [warga({waktu: "2026-11-24 08.00"})]);
  assert.equal(r.find(x => x.id === "b2").warga.length, 1, "Klaster tidak menempel ke mulai terdekat.");
  assert.equal(r.find(x => x.id !== "b2").warga.length, 0);
});

test("N5 angka resmi dan warga tampil terpisah, tidak pernah dijumlah", () => {
  const t = teksKartu(gabung(kabar(), [warga({dampak: {mengungsi: 40}})])[0], SEKARANG);
  assert.equal(t.resmi.angka[0].teks, "2.659");
  assert.equal(t.warga.baris[0].angka[0].teks, "40");
  const semua = JSON.stringify(t);
  assert.ok(!semua.includes("2.699") && !semua.includes("2699"), "Ada angka hasil jumlah 2659+40. Angka antarsumber tidak boleh dijumlah (D3).");
});

test("N6 usang per kejadian (lewat 48 jam) memakai cutoff_terakhir, bukan cutoff berkas", () => {
  const x = gabung(kabar(), [])[0];
  assert.match(teksKartu(x, WIB("2026-11-25T17:00")).resmi.kesegaran, /cut-off 25 Nov 2026 07\.00 WIB/);
  const lama = gabung(kabar([kejadian({cutoff_terakhir: "2026-11-23T07:00+07:00", lap_terakhir: "2026-11-23"})]), [])[0];
  const t = teksKartu(lama, SEKARANG);
  assert.equal(t.resmi.usang, true, "Kejadian lewat 48 jam tidak ditandai usang. Hitung dari cutoff_terakhir tiap kejadian.");
  assert.match(t.resmi.kesegaran, /^Laporan resmi terakhir 23 Nov 2026/);
});

test("N7 kabar null: gabung tanpa galat, hanya klaster warga", () => {
  const r = gabung(null, [warga()]);
  assert.equal(r.length, 1);
  assert.equal(r[0].resmi, null);
  assert.deepEqual(gabung(null, []), []);
});

test("N8 URL berita non-http(s) tidak ditautkan; http(s) boleh", () => {
  const x = gabung(kabar([kejadian({berita: [
    {judul: "a", media: "m", tgl: "2026-11-24", url: "javascript:alert(1)"},
    {judul: "b", media: "m", tgl: "2026-11-24", url: "data:text/html,x"},
    {judul: "c", media: "m", tgl: "2026-11-24", url: "https://contoh.id/x"}]})]), [])[0];
  const b = teksKartu(x, SEKARANG).berita.baris;
  assert.equal(b[0].url, null, "javascript: lolos jadi tautan. Itu celah XSS; urlOk() harus menolak.");
  assert.equal(b[1].url, null);
  assert.equal(b[2].url, "https://contoh.id/x");
});

test("N9 kosong tidak pernah jadi 0: angka null/0 dan dampak warga nol", () => {
  const t = teksKartu(gabung(kabar(), [warga({dampak: {mengungsi: 0, luka: 0, hilang: 0}})])[0], SEKARANG);
  assert.equal(t.resmi.angka[1].nilai, null);
  assert.equal(t.resmi.angka[1].teks, "belum ada data", "Angka resmi kosong tampil sebagai angka. Kosong harus 'belum ada data'.");
  assert.equal(t.warga.baris[0].angka.length, 0, "Dampak warga 0 tampil sebagai angka 0.");
  assert.equal(t.warga.baris[0].kosongAngka, "Belum ada angka dampak");
  const kosong = teksKartu(gabung(kabar(), [])[0], SEKARANG);
  assert.equal(kosong.warga.kosong, "Belum ada laporan warga");
  assert.equal(kosong.warga.baris.length, 0);
});

test("N9b medsos: 'Belum tersambung', tanpa angka", () => {
  const m = teksKartu(gabung(kabar(), [])[0], SEKARANG).medsos;
  assert.equal(m.teks, "Belum tersambung");
  assert.ok(!/\d/.test(JSON.stringify(m)), "Pita media sosial memuat angka padahal belum tersambung (Q1). Hapus angka itu.");
  assert.deepEqual(saring(gabung(kabar(), [warga()]), {sumber: "medsos"}), [], "Saringan medsos mengembalikan kartu padahal tak ada data medsos.");
});

test("N10 Q2 dijawab terbit (26 Nov 2026): data/alun/ tidak ditahan .assetsignore atau .gitignore", () => {
  const baris = t => t.split("\n").map(s => s.trim());
  assert.ok(!baris(baca("public/.assetsignore")).includes("data/alun/"), "public/.assetsignore memuat 'data/alun/'. Pemilik sudah memutuskan kabar resmi terbit (K5); hapus barisnya.");
  assert.ok(!baris(baca(".gitignore")).some(s => s === "public/data/alun/" || s === "data/alun/"), ".gitignore memuat 'public/data/alun/'. Pemilik sudah memutuskan kabar resmi terbit (K5); hapus barisnya.");
});

test("N11 keluaran teksKartu: tanpa titik tengah, tanpa 'aman', tanpa kunci terlarang", () => {
  const kej = kejadian({berita: [{judul: "Kami aman @redaksi", media: "m", tgl: "2026-11-24", url: "https://a.id"}]});
  const semua = [gabung(kabar([kej]), [warga()])[0], gabung(null, [warga()])[0], gabung(kabar([kejadian({status: "selesai", selesai_lama: true})]), [])[0]];
  for (const x of semua) {
    const t = teksKartu(x, SEKARANG);
    // judul berita adalah teks pihak lain; pindai hanya string buatan kita
    const dibuat = JSON.stringify({...t, berita: {...t.berita, baris: []}});
    assert.ok(!/ · |·/.test(dibuat), "Titik tengah muncul sebagai pemisah. Pakai koma atau kalimat biasa (aturan pemilik).");
    assert.ok(!/\baman\b/i.test(dibuat), "Kata 'aman' muncul di teks buatan kita. Kita tidak pernah menyatakan aman.");
    assert.ok(!/@\w/.test(dibuat), "Pola @akun muncul di teks buatan kita.");
    for (const k of ["teks_asli", "tangani", "perhatian"]) assert.ok(!(`"${k}"` in t) && !dibuat.includes(`"${k}":`), `Kunci terlarang '${k}' ada di keluaran.`);
  }
});

test("N12 selesai_lama tersembunyi bawaan, muncul di saringan Selesai", () => {
  const r = gabung(kabar([kejadian({status: "selesai", selesai_lama: true})]), []);
  assert.equal(saring(r, {}).length, 0, "Kejadian selesai_lama tampil di bawaan. Daftar jadi penuh kejadian lama.");
  assert.equal(saring(r, {selesai: true}).length, 1, "Saringan Selesai tidak memuat selesai_lama.");
  const aktif = gabung(kabar(), []);
  assert.equal(saring(aktif, {}).length, 1);
  assert.equal(saring(aktif, {selesai: true}).length, 0);
});

test("kontrak statis lapor.js: impor alun_kabar, kabar.json diambil dengan jatuh ke null, tautan hanya bila url ada", () => {
  const js = baca("public/lapor/lapor.js");
  assert.match(js, /from "\/lapor\/alun_kabar\.js/, "lapor.js tidak mengimpor alun_kabar.js. Tab Alun-alun kehilangan pita resmi.");
  assert.match(js, /\/data\/alun\/kabar\.json[\s\S]{0,200}\.catch\(\(\) => null\)/, "Pengambilan kabar.json tak jatuh ke null saat gagal. Tab Alun-alun bisa galat bila berkas belum ada (N7).");
  assert.match(js, /b\.url \? Object\.assign\(el\("a"/, "Tautan berita tidak lagi bersyarat pada b.url. URL ditolak harus tampil sebagai teks.");
  assert.ok(!/innerHTML\s*=[^;\n]*(judul|berita|\.url)/.test(js), "Judul/URL berita masuk innerHTML. Pakai el()/textContent.");
});
