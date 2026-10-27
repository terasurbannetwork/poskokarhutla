/* SP-031: logika murni layar Ringkas /pipa (PRD §9.4.1, DS §4.1): empat kartu Insight + gerak terakhir + alarm, tiap kartu memuat sendiri.
   Pembangun kartu mengembalikan spesifikasi (ey, judul, isi, sumber) tanpa DOM; rute /api/sippa/* disimulasi lewat data tiruan, kontrak DT §4.3.
   Data nyata data/sippa/keluaran/{zona,pemicu}.json dipakai sebagai masukan supaya angka judul = angka berkas (A188, A469). */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const R = await import("../../public/pipa/layar_ringkas.js");
const nyata = n => JSON.parse(readFileSync(new URL(`../../data/sippa/keluaran/${n}.json`, import.meta.url), "utf8"));
const teks = h => h.replace(/<[^>]*>/g, "");   // judul tanpa markup, seperti aria-label kartu tautan
const J = 3600e3, T0 = Date.UTC(2026, 9, 25, 3, 0);

/* ---------- Kit ---------- */
const kit = (kode, status, extra = {}) => ({id: "0123456789abcdef", kode, jenis: "gambut", status, diubah: T0, ...extra});

test("ringkasKit: siap = di gudang, lapangan = depot + gelar + banjir, hilang terpisah; servis dan pensiun tidak masuk ketiganya", () => {
  const r = R.ringkasKit([kit("SIPPA-001", "gudang"), kit("SIPPA-002", "gudang"), kit("SIPPA-003", "gudang"), kit("SIPPA-004", "gelar"), kit("SIPPA-005", "servis"), kit("SIPPA-006", "pensiun")]);
  assert.deepEqual([r.siap, r.lapangan, r.hilang, r.servis, r.total], [3, 1, 0, 1, 6]);
  assert.equal(R.ringkasKit([kit("a", "depot"), kit("b", "banjir"), kit("c", "hilang")]).lapangan, 2);
});

test("kartuKit: judul persis wireframe DS §4.1, per = diubah terbaru, tiga baris kit prioritas (hilang dan gelar dulu)", () => {
  const kits = [kit("SIPPA-001", "gudang"), kit("SIPPA-002", "gudang", {diubah: T0 + J}), kit("SIPPA-003", "gudang"), kit("SIPPA-004", "gelar"), kit("SIPPA-005", "hilang")];
  const k = R.kartuKit({kit: kits, kehilangan: {musim_pct: 2.5}});
  assert.equal(teks(k.judul), "Kit: 3 siap di gudang, 1 di lapangan, 1 hilang");
  assert.equal(k.ey, "Kit"); assert.equal(k.tautan, "/pipa/kit"); assert.equal(k.per, T0 + J);
  assert.deepEqual([...k.isi.matchAll(/data-kode="([^"]+)"/g)].map(m => m[1]), ["SIPPA-005", "SIPPA-004", "SIPPA-001"]);
  assert.match(k.isi, /2,5% komponen musim ini hilang/);
  assert.match(k.sumber, /^inventaris SIPPA D1/);
});

test("kartuKit: tanpa kit = kalimat kosong dengan cara mengisi; teks data di-escape", () => {
  const k = R.kartuKit({kit: []});
  assert.equal(k.judul, "Belum ada kit terdaftar."); assert.match(k.isi, /ad-kosong/);
  const x = R.kartuKit({kit: [kit('<img src=x onerror=alert(1)>', "gudang")]});
  assert.doesNotMatch(x.isi, /<img/); assert.match(x.isi, /&lt;img/);
});

/* ---------- Pemicu ---------- */
test("kartuPemicu dari pemicu.json nyata: judul menyebut tingkat tertinggi dan jumlah kabupaten, pil basi dan asumsi kebijakan tampil", () => {
  const p = nyata("pemicu"), n = p.baris.filter(b => b.prov === "62" && b.tingkat === "SIAGA").length;
  const k = R.kartuPemicu(p, "62");
  assert.equal(teks(k.judul), `Pemicu: ${n} kabupaten di level SIAGA`);
  assert.match(k.isi, /ansambel basi/); assert.match(k.isi, /titik panas basi/); assert.match(k.isi, /Asumsi kebijakan/);
  assert.match(k.isi, /belum diuji balik/);
  assert.equal(k.per, Date.parse(p.dibuat));
});

test("kartuPemicu: tingkat tertinggi menang (GELAR > PRA-POSISI > SIAGA > NORMAL); provinsi lain tidak ikut; tiga kabupaten teratas", () => {
  const baris = [["A", "NORMAL"], ["B", "PRA-POSISI"], ["C", "PRA-POSISI"], ["D", "SIAGA"], ["E", "SIAGA"], ["F", "GELAR"]].map(([kab, tingkat]) => ({prov: "62", kab, tingkat, alasan: []}));
  baris.push({prov: "61", kab: "Luar", tingkat: "GELAR", alasan: []});
  const k = R.kartuPemicu({dibuat: "2026-10-26T10:47+07:00", basi: {}, baris}, "62");
  assert.equal(teks(k.judul), "Pemicu: 1 kabupaten di level GELAR");
  assert.deepEqual([...k.isi.matchAll(/data-kab="([^"]+)"/g)].map(m => m[1]), ["F", "B", "C"]);
  assert.doesNotMatch(k.isi, /ansambel basi/);
});

test("kartuPemicu: semua NORMAL dan provinsi tanpa baris punya kalimat sendiri, bukan angka nol yang menyesatkan", () => {
  const n = R.kartuPemicu({dibuat: "2026-10-26T10:47+07:00", basi: {}, baris: [{prov: "62", kab: "A", tingkat: "NORMAL", alasan: []}]}, "62");
  assert.equal(teks(n.judul), "Pemicu: 1 kabupaten, semuanya di level NORMAL");
  const k = R.kartuPemicu({dibuat: "2026-10-26T10:47+07:00", basi: {}, baris: []}, "99");
  assert.equal(k.judul, "Belum ada kabupaten terpantau di provinsi ini."); assert.match(k.isi, /ad-kosong/);
});

test("kartuPemicu: nama kabupaten dan alasan dari data di-escape", () => {
  const k = R.kartuPemicu({dibuat: "2026-10-26T10:47+07:00", basi: {}, baris: [{prov: "62", kab: '"><script>x</script>', tingkat: "SIAGA", alasan: []}]}, "62");
  assert.doesNotMatch(k.isi, /<script>/);
});

/* ---------- Pilot ---------- */
const log = (id, jamTibaAir, extra = {}) => ({id, jenis: "karhutla", kelas_medan: "I", t_tiba: T0, t_mulai_gelar: T0 + 0.5 * J, t_air_mengalir: T0 + jamTibaAir * J, panjang_m: 800, n_orang: 6, jam_klien_meleset: 0, ...extra});

test("kartuPilot: sesi gelar karhutla aktif, p50 tiba sampai air mengalir (kuantil tipe 7), n kecil berpil, dummy dan koreksi tidak dihitung", () => {
  const k = R.kartuPilot([log("a", 2.8), log("b", 3.4), log("c", 4), log("d", 9, {dummy: 1}), log("e", 7, {koreksi_dari: "c", t_air_mengalir: T0 + 5 * J}), log("f", 1, {jenis: "banjir"})]);
  assert.equal(teks(k.judul), "Pilot: 3 sesi gelar, p50 tiba sampai air mengalir 3,4 jam (n kecil)");
  assert.match(k.isi, /n kecil/); assert.match(k.isi, /tidak dipakai untuk vonis G4/);
  assert.equal(k.per, T0);
});

test("kartuPilot: n di atas 4 menghilangkan pil n kecil dan kata (n kecil) di judul; log kosong = kalimat kosong", () => {
  const k = R.kartuPilot([1, 2, 3, 4, 5].map(i => log("x" + i, i)));
  assert.equal(teks(k.judul), "Pilot: 5 sesi gelar, p50 tiba sampai air mengalir 3 jam"); assert.doesNotMatch(k.isi, /n kecil/);
  const kosong = R.kartuPilot([]);
  assert.equal(kosong.judul, "Belum ada log gelar."); assert.match(kosong.isi, /ad-kosong/); assert.match(kosong.isi, /\/pipa\/lapangan/);
});

test("kartuPilot: sesi tanpa waktu air mengalir dihitung sesi tetapi tidak masuk p50; semuanya tanpa = p50 menunggu, bukan 0", () => {
  const k = R.kartuPilot([log("a", 2), log("b", 0, {t_air_mengalir: null})]);
  assert.match(teks(k.judul), /^Pilot: 2 sesi gelar, p50 tiba sampai air mengalir 2 jam \(n kecil\)$/);
  const m = R.kartuPilot([log("b", 0, {t_air_mengalir: null})]);
  assert.equal(teks(m.judul), "Pilot: 1 sesi gelar, p50 menunggu ulangan dengan waktu air mengalir");
});

test("kartuPilot: titik per sesi bergaris ambang G3 per kelas, teks judul titik di-escape", () => {
  const k = R.kartuPilot([log("a", 2.5), log("b", 9, {kelas_medan: "II"})]);
  assert.match(k.isi, /<svg[^>]*role="img"/); assert.equal((k.isi.match(/<circle/g) || []).length, 2); assert.match(k.isi, /Ambang G3 Kelas I p50 4 jam/);
});

/* ---------- Zona ---------- */
test("kartuZona dari zona.json nyata: judul memakai A188 (kendala.json) dan A469 (semua jalan OSM), tiga versi dalam batang, pola dan huruf A-D wajib", () => {
  const z = nyata("zona"), k = R.kartuZona(z, "62", "Kalimantan Tengah");
  assert.equal(teks(k.judul), "Zona A Kalimantan Tengah: 188 kompleks (versi kendala.json), 469 (semua jalan OSM)");
  for (const h of ["A", "B", "C", "D"]) assert.match(k.isi, new RegExp(`<text[^>]*class="sp-zona-huruf"[^>]*>${h}<`), `huruf ${h}`);
  for (const pola of ["zona-pola-A", "zona-pola-B", "zona-pola-C", "zona-pola-D"]) assert.match(k.isi, new RegExp(pola), pola);
  assert.match(k.isi, /Konservatif/); assert.match(k.isi, /Jalan utama OSM/); assert.match(k.isi, /Optimistis/);
  assert.match(k.isi, /Terverifikasi/); assert.match(k.isi, /menunggu/);
  assert.match(k.sumber, /OSM|OpenStreetMap/); assert.equal(k.per, Date.parse("2026-10-25"));
  assert.match(k.isi, /A188 B418 C89 D170/);   // tabel sr-only: angka sama dengan zona.json, tidak dihitung ulang
});

test("kartuZona: baris provinsi dipilih (kab null), provinsi tanpa baris = kalimat kosong; ambang zona dari berkas", () => {
  const z = nyata("zona");
  assert.equal(R.kartuZona(z, "99", "X").judul, "Belum ada data zona untuk provinsi ini.");
  assert.match(R.kartuZona(z, "62", "Kalimantan Tengah").isi, /2,5 km/);
});

/* ---------- gerak terakhir dan alarm ---------- */
test("kartuGerak: paling banyak 10 baris, terbaru di atas, alasan dari TEKS_ALASAN, tautan Lihat semua gerak; kosong berkalimat", () => {
  const rows = Array.from({length: 12}, (_, i) => ({id: String(i), kit_kode: `SIPPA-${i}`, dari_status: "gudang", ke_status: "depot", alasan: "pra_posisi", waktu: T0 + i * J, pengangkut: "bpbd"}));
  const k = R.kartuGerak(rows);
  assert.equal((k.isi.match(/<tr>/g) || []).length - 1, 10);   // minus baris kepala
  assert.ok(k.isi.indexOf("SIPPA-11") < k.isi.indexOf("SIPPA-2"));
  assert.match(k.isi, /Pra-posisi ke depot/); assert.match(k.isi, /Lihat semua gerak/); assert.match(k.isi, /data-label="Waktu"/);
  assert.equal(R.kartuGerak([]).judul, "Belum ada gerak kit.");
});

test("kartuGerak: teks data di-escape", () => {
  const k = R.kartuGerak([{id: "1", kit_kode: "<b>x</b>", dari_status: "gudang", ke_status: "depot", alasan: "pra_posisi", waktu: T0}]);
  assert.doesNotMatch(k.isi, /<b>x/);
});

test("kartuAlarm: jumlah alarm aktif, label kode berkata, kosong = Tidak ada alarm aktif.", () => {
  const k = R.kartuAlarm([{id: "1", kode: "tekanan_lebih", kit_kode: "SIPPA-001", nilai: 11.4, ambang: 11.1, mulai: T0}, {id: "2", kode: "diam", mulai: T0}]);
  assert.equal(teks(k.judul), "Telemetri: 2 alarm aktif"); assert.match(k.isi, /Tekanan lebih/); assert.match(k.isi, /11,4/);
  assert.equal(R.kartuAlarm([]).judul, "Tidak ada alarm aktif.");
  assert.match(k.isi, /11,4 bar \(ambang 11,1 bar\)/);
  const u = (kode, nilai, ambang, satuan) => R.kartuAlarm([{kode, nilai, ambang, mulai: T0, ...(satuan ? {satuan} : {})}]).isi;
  assert.match(u("co_tinggi", 40, 35), /40 ppm \(ambang 35 ppm\)/);
  assert.match(u("belum_dingin", 55, 50), /55 °C/);
  assert.match(u("bbm_rendah", 15, 20), /15 %/);
  assert.match(u("debit_rendah", 3, 20), /3 L\/min/);
  assert.match(u("hisap_rendah", 1, 2, "kPa"), /1 kPa/);   // satuan dari payload menang
});

/* ---------- kartu memuat sendiri ---------- */
test("isolasi: satu pemuat yang galat tidak menghentikan pemuat lain; galat membawa status, yang lain tetap selesai", async () => {
  const g = Object.assign(new Error("Akunmu tidak punya akses"), {status: 403});
  const hasil = await R.isolasi({kit: async () => "KIT", pemicu: async () => { throw g; }, zona: async () => "ZONA"});
  assert.deepEqual(hasil.kit, {ok: "KIT"}); assert.deepEqual(hasil.zona, {ok: "ZONA"});
  assert.equal(hasil.pemicu.galat, g); assert.equal(hasil.pemicu.galat.status, 403);
});

test("isolasi: pembatalan (AbortError) dilaporkan sebagai batal, bukan galat yang ditampilkan", async () => {
  const a = Object.assign(new Error("batal"), {name: "AbortError"});
  const hasil = await R.isolasi({x: async () => { throw a; }});
  assert.equal(hasil.x.batal, true);
});

/* ---------- kontrak jaringan: data lewat sesi, satu jalur per kartu ---------- */
test("JALUR: tiap kartu punya jalur API sendiri dari DT §4.3 (data/zona, data/pemicu, kit, log, ringkas, alarm)", () => {
  assert.deepEqual(R.JALUR, {kit: "/api/sippa/kit", pemicu: "/api/sippa/data/pemicu", pilot: "/api/sippa/log", zona: "/api/sippa/data/zona", gerak: "/api/sippa/ringkas", alarm: "/api/sippa/alarm?aktif=1"});
});

test("tautan kartu: Kit, Pemicu, Pilot, Zona menuju layarnya (PRD §9.4.1: kartu = tautan)", () => {
  assert.deepEqual(R.TAUTAN, {kit: "/pipa/kit", pemicu: "/pipa/pemicu", pilot: "/pipa/log", zona: "/pipa/peta"});
});

test("tidak ada angka dihitung ulang dari data mentah selain pencacahan: tidak ada pemanggilan hidraulika atau zona() di layar Ringkas", () => {
  const t = readFileSync(new URL("../../public/pipa/layar_ringkas.js", import.meta.url), "utf8");
  assert.doesNotMatch(t, /hidraulika\(|\bzona\(|saranSarana\(|toFixed\(/);
});
