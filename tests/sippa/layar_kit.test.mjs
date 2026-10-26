/* SP-012: logika murni layar Kit (mesin keadaan DT §6.2, kehilangan musim, QR, validasi tugaskan, HTML tanpa DOM).
   Rute /api/sippa/* adalah kerja SP-008: di sini hanya kontrak DT yang dicek lewat fetch tiruan. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/* global klasik public/inti: dimuat dari berkas nyata, bukan ditiru */
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const K = await import("../../public/pipa/layar_kit.js");
const STATUS = ["gudang", "depot", "gelar", "banjir", "servis", "hilang", "pensiun"];

/* ---------- mesin keadaan ---------- */
test("ALASAN_TRANSISI: gabungan pasangan (tanpa koreksi) sama dengan daftar CHECK sippa_gerak di migrasi 0056", () => {
  const sql = readFileSync(new URL("../../migrations/0056_sippa_inti.sql", import.meta.url), "utf8");
  const blok = /CHECK \(dari_status \|\| '>' \|\| ke_status IN \(([^)]*)\)\)/.exec(sql);
  assert.ok(blok, "daftar CHECK pasangan tidak ditemukan di 0056");
  const cek = [...blok[1].matchAll(/'([a-z]+>[a-z]+)'/g)].map(m => m[1]).sort();
  const js = [...new Set(Object.entries(K.ALASAN_TRANSISI).filter(([a]) => a !== "koreksi").flatMap(([, p]) => p))].sort();
  assert.equal(cek.length, 26, "CHECK 0056 memuat 26 pasangan");
  assert.deepEqual(js, cek, "pasangan di JS dan CHECK harus sama");
  assert.deepEqual([...K.PASANGAN_SAH].sort(), cek);
});

/* DT §6.2 ditulis ulang sebagai tabel baris, bukan dari kode: sumber kebenaran uji. W = staf tulis, M = moderator. */
const DT = [
  ["pra_posisi", ["gudang>depot", "banjir>depot"], "W"],
  ["gelar", ["gudang>gelar", "depot>gelar", "banjir>gelar"], "W"],
  ["bongkar", ["gelar>depot"], "W"],
  ["kembali", ["depot>gudang", "gelar>gudang", "banjir>gudang", "servis>gudang"], "W"],
  ["pindah_banjir", ["gudang>banjir", "depot>banjir", "gelar>banjir"], "W"],
  ["servis", ["gudang>servis", "depot>servis", "gelar>servis", "banjir>servis"], "W"],
  ["hilang", ["gudang>hilang", "depot>hilang", "gelar>hilang", "banjir>hilang", "servis>hilang"], "M"],
  ["ditemukan", ["hilang>gudang"], "M"],
  ["pensiun", ["gudang>pensiun", "servis>pensiun", "hilang>pensiun"], "M"],
];
test("alasanBoleh: 49 pasangan status x peran persis tabel DT §6.2; hilang, ditemukan, pensiun, koreksi hanya moderator", () => {
  let sah = 0;
  for (const dari of STATUS) for (const ke of STATUS) {
    const p = `${dari}>${ke}`;
    const w = DT.filter(([, ps, h]) => h === "W" && ps.includes(p)).map(([a]) => a);
    const sahPasangan = DT.some(([, ps]) => ps.includes(p));
    const m = DT.filter(([, ps]) => ps.includes(p)).map(([a]) => a).concat(sahPasangan ? ["koreksi"] : []);
    assert.deepEqual(K.alasanBoleh(dari, ke, "W").sort(), w.sort(), `W ${p}`);
    assert.deepEqual(K.alasanBoleh(dari, ke, "M").sort(), m.sort(), `M ${p}`);
    assert.deepEqual(K.alasanBoleh(dari, ke, "B"), [], `B (baca) tidak boleh apa pun ${p}`);
    if (sahPasangan) sah++;
  }
  assert.equal(sah, 26);
});

test("opsiGerak: pensiun terminal tanpa pilihan; staf tulis tidak ditawari hilang, pensiun, ditemukan, koreksi", () => {
  assert.deepEqual(K.opsiGerak("pensiun", "M"), []);
  const w = K.opsiGerak("gudang", "W").map(o => o.alasan);
  for (const dilarang of ["hilang", "pensiun", "ditemukan", "koreksi"]) assert.ok(!w.includes(dilarang), `W ditawari ${dilarang}`);
  assert.deepEqual([...new Set(w)].sort(), ["gelar", "pindah_banjir", "pra_posisi", "servis"]);
  const m = K.opsiGerak("hilang", "M").map(o => `${o.alasan}:${o.ke_status}`).sort();
  assert.deepEqual(m, ["ditemukan:gudang", "koreksi:gudang", "koreksi:pensiun", "pensiun:pensiun"]);
});

test("opsiGerak: rencana hanya untuk pra_posisi gudang>depot dan pindah_banjir; pindah_banjir mewajibkan pengangkut dan permintaan", () => {
  const o = (d, a, ke) => K.opsiGerak(d, "W").find(x => x.alasan === a && x.ke_status === ke);
  assert.equal(o("gudang", "pra_posisi", "depot").rencana, true);
  assert.equal(o("gudang", "gelar", "gelar").rencana, false);
  assert.deepEqual(o("gudang", "pindah_banjir", "banjir").wajib, ["pengangkut", "permintaan_dari"]);
});

test("cekGerak: yang salah DITOLAK dengan medan dan alasan; yang benar lolos", () => {
  const kit = {status: "gudang"}, ada = (g, medan) => g.some(x => x.medan === medan);
  assert.deepEqual(K.cekGerak(kit, {alasan: "gelar", ke_status: "gelar"}, "W"), []);
  assert.ok(ada(K.cekGerak(kit, {alasan: "hilang", ke_status: "hilang", catatan: "hilang di lokasi"}, "W"), "alasan"), "W tidak boleh hilang");
  assert.ok(ada(K.cekGerak(kit, {alasan: "hilang", ke_status: "hilang"}, "M"), "catatan"), "hilang wajib catatan");
  assert.deepEqual(K.cekGerak(kit, {alasan: "hilang", ke_status: "hilang", catatan: "tidak ditemukan saat cek gudang"}, "M"), []);
  assert.ok(ada(K.cekGerak(kit, {alasan: "bongkar", ke_status: "gelar"}, "W"), "alasan"), "pasangan tidak sah");
  assert.ok(ada(K.cekGerak(kit, {alasan: "pindah_banjir", ke_status: "banjir"}, "W"), "pengangkut"));
  assert.ok(ada(K.cekGerak(kit, {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp"}, "W"), "permintaan_dari"));
  assert.deepEqual(K.cekGerak(kit, {alasan: "pindah_banjir", ke_status: "banjir", pengangkut: "yontp", permintaan_dari: "BPBD Kapuas", rencana: 1, eta_jam: 9}, "W"), []);
  assert.ok(ada(K.cekGerak(kit, {alasan: "gelar", ke_status: "gelar", rencana: 1}, "W"), "rencana"), "gelar tidak boleh terencana");
  assert.ok(ada(K.cekGerak(kit, {alasan: "gelar", ke_status: "gelar", eta_jam: 721}, "W"), "eta_jam"), "eta 721 > 720");
  assert.ok(ada(K.cekGerak(kit, {alasan: "gelar", ke_status: "gelar", eta_jam: -1}, "W"), "eta_jam"));
  assert.ok(ada(K.cekGerak(kit, {alasan: "gelar", ke_status: "gelar", catatan: "x".repeat(501)}, "W"), "catatan"));
  assert.ok(ada(K.cekGerak(kit, {alasan: "pra_posisi", ke_status: "depot", pengangkut: "mobil"}, "W"), "pengangkut"));
});

test("peranKlien: moderator dari data-mod atau data-super, penulis dari data-tulis, selain itu baca saja", () => {
  assert.equal(K.peranKlien({mod: "1"}), "M"); assert.equal(K.peranKlien({super: "1", tulis: "1"}), "M");
  assert.equal(K.peranKlien({tulis: "1", mod: "0"}), "W"); assert.equal(K.peranKlien({tulis: "0"}), "B"); assert.equal(K.peranKlien({}), "B");
});

/* ---------- kehilangan ---------- */
const komp = (n, hilang, extra = {}) => Array.from({length: n}, (_, i) => ({id: "k" + i, kondisi: i < hilang ? "hilang" : "baik", musim_awal: 1, ...extra}));
test("persenKehilangan: satu dari 40 komponen = 2,5 persen (RU T4); musim_awal 0 tidak masuk penyebut; kosong = null", () => {
  assert.equal(K.persenKehilangan(komp(40, 1)), 2.5);
  assert.equal(K.persenKehilangan([...komp(40, 1), ...komp(10, 10, {musim_awal: 0})]), 2.5);
  assert.equal(K.persenKehilangan(komp(40, 0)), 0);
  assert.equal(K.persenKehilangan([]), null);
  assert.equal(K.persenKehilangan(komp(4, 1)), 25);
});
test("tingkatKehilangan: ambang 5 persen (U8) dan 20 persen (K-15), tepat di ambang sudah melampaui", () => {
  assert.equal(K.tingkatKehilangan(2.5), "normal"); assert.equal(K.tingkatKehilangan(4.94), "normal");
  assert.equal(K.tingkatKehilangan(5), "u8"); assert.equal(K.tingkatKehilangan(19.9), "u8");
  assert.equal(K.tingkatKehilangan(20), "k15"); assert.equal(K.tingkatKehilangan(null), "normal");
});
test("komponenKurang: hanya yang berkondisi hilang", () => {
  assert.equal(K.komponenKurang([{kondisi: "hilang"}, {kondisi: "baik"}, {kondisi: "rusak_berat"}]), 1);
});

/* ---------- kartu judul daftar ---------- */
test("ringkasKit: jumlah kit per status dan lokasi, persen kehilangan lewat fmt id-ID (koma desimal)", () => {
  const kits = [{status: "gudang", lokasi: "Palangka Raya"}, {status: "gudang", lokasi: "Palangka Raya"}, {status: "banjir", lokasi: "Kapuas"}];
  assert.equal(K.ringkasKit(kits, 1.2), "3 kit: 2 di gudang Palangka Raya, 1 di banjir Kapuas; kehilangan komponen musim ini 1,2%");
  assert.equal(K.ringkasKit([], null), "Belum ada kit terdaftar");
  assert.match(K.ringkasKit([{status: "servis", lokasi: null}], null), /^1 kit: 1 di servis$/);
});

/* ---------- QR (RU T5) ---------- */
test("labelKit dan labelBin: SIPPA:<kode> dan SIPPA:<kode>:<BOM>; kode liar ditolak, kode penugasan tidak pernah bisa masuk", () => {
  assert.equal(K.labelKit("SIPPA-001"), "SIPPA:SIPPA-001");
  assert.equal(K.labelBin("SIPPA-001", "P-01"), "SIPPA:SIPPA-001:P-01");
  for (const buruk of ["SIPPA-1", "SIPPA-0011", "sippa-001", "SIPPA-001:x", "", null, undefined, {kode: "SIPPA-001"}, "0123456789abcdef0123456789"]) assert.throws(() => K.labelKit(buruk), /kode kit/, String(buruk));
  for (const buruk of ["p-01", "P01", "P-01:x", "", "../x", "A".repeat(13) + "-1"]) assert.throws(() => K.labelBin("SIPPA-001", buruk), /kode BOM/, buruk);
});
test("parseQR: terima label kit, label bin, dan ketikan manual; tolak tautan penugasan dan kode 26 heks", () => {
  assert.deepEqual(K.parseQR("SIPPA:SIPPA-012"), {kode: "SIPPA-012", bom: null});
  assert.deepEqual(K.parseQR("  SIPPA:SIPPA-012:P-01 "), {kode: "SIPPA-012", bom: "P-01"});
  assert.deepEqual(K.parseQR("sippa-012"), {kode: "SIPPA-012", bom: null});
  for (const buruk of ["https://x/pipa/lapangan#k=0123456789abcdef0123456789", "0123456789abcdef0123456789", "SIPPA:", "SIPPA:SIPPA-12", "", null, "SIPPA:SIPPA-001:p-01"]) assert.equal(K.parseQR(buruk), null, String(buruk));
});
test("tautanTugas: /pipa/lapangan#k=<kode 26 heks>; selain 26 heks ditolak", () => {
  const kode = "0123456789abcdef0123456789";
  assert.equal(K.tautanTugas(kode), "/pipa/lapangan#k=" + kode);
  for (const buruk of ["", "abc", kode + "0", kode.toUpperCase(), "g123456789abcdef0123456789", null]) assert.throws(() => K.tautanTugas(buruk), /kode penugasan/, String(buruk));
});
test("qrSvg: zona tenang 4 modul, latar putih, role img dengan aria-label ter-escape", () => {
  const n = 5, gelap = (r, c) => (r + c) % 2 === 0;
  const svg = K.qrSvg({getModuleCount: () => n, isDark: gelap}, 'QR kit "SIPPA-001"<x>');
  assert.match(svg, /viewBox="0 0 13 13"/, "5 + 2 x 4 zona tenang");
  assert.match(svg, /<rect width="13" height="13" class="sp-qr-latar"\/>/);
  assert.match(svg, /role="img" aria-label="QR kit &quot;SIPPA-001&quot;&lt;x&gt;"/);
  assert.equal((/ d="([^"]*)"/.exec(svg)[1].match(/M/g) || []).length, 13, "13 modul gelap pada papan 5x5 berselang-seling");
  assert.doesNotMatch(svg, /style=/, "CSP style-src self: tanpa gaya sebaris");
});

/* ---------- form tugaskan ---------- */
const tugasOk = {nama_regu: "Regu Bukit Batu", unsur: "manggala_agni", prov: "62", kab: "Palangka Raya", berlaku_hari: 7};
test("cekTugas: isian sah lolos; tiap pelanggaran ditolak per medan", () => {
  assert.deepEqual(K.cekTugas(tugasOk), []);
  const medan = f => K.cekTugas({...tugasOk, ...f}).map(g => g.medan);
  assert.deepEqual(medan({berlaku_hari: 31}), ["berlaku_hari"], "maks 30 hari");
  assert.deepEqual(medan({berlaku_hari: 0}), ["berlaku_hari"]);
  assert.deepEqual(medan({berlaku_hari: 1.5}), ["berlaku_hari"]);
  assert.deepEqual(medan({nama_regu: "A"}), ["nama_regu"]);
  assert.deepEqual(medan({nama_regu: "x".repeat(81)}), ["nama_regu"]);
  assert.deepEqual(medan({unsur: "swasta"}), ["unsur"]);
  assert.deepEqual(medan({prov: "6"}), ["prov"]); assert.deepEqual(medan({prov: "ab"}), ["prov"]);
  assert.deepEqual(medan({kab: "x"}), ["kab"]);
  assert.deepEqual(medan({kompleks_id: "Z9"}), ["kompleks_id"]);
  assert.deepEqual(medan({kompleks_id: "K123"}), []);
});
test("badanTugas: hanya medan kontrak DT; berlaku_hari dan kit_id ikut, medan liar dibuang", () => {
  const b = K.badanTugas({...tugasOk, kit_id: "0123456789abcdef", liar: 1, kompleks_id: "", lengan_dalam: "1"});
  assert.deepEqual(Object.keys(b).sort(), ["berlaku_hari", "kab", "kit_id", "lengan_dalam", "nama_regu", "prov", "unsur"]);
  assert.equal(b.lengan_dalam, 1);
});

/* ---------- HTML (tanpa DOM) ---------- */
const kit = {id: "0123456789abcdef", kode: "SIPPA-001", jenis: "gambut", status: "banjir", lokasi: "Kapuas", prov: "62", pemilik_asal: "BMN BNPB", diubah: 1761370800000, komponen_kurang: 1, jam_pompa_musim: 46, banjir_m3_musim: 1240, gerak_buka: null};
test("barisKitHtml: kode, status sebagai kata di pil, pemilik asal; teks dari data selalu di-escape", () => {
  const h = K.barisKitHtml({...kit, kode: "SIPPA-001", lokasi: '<img src=x onerror=alert(1)>', pemilik_asal: 'Manggala "Agni"'});
  assert.match(h, /href="\/pipa\/kit\/0123456789abcdef"/);
  assert.match(h, /class="sp-status banjir"[^>]*>[^<]*banjir/);
  assert.doesNotMatch(h, /<img/); assert.match(h, /&lt;img/); assert.match(h, /Manggala &quot;Agni&quot;/);
  assert.match(h, /1 kurang/);
});
test("barisKitHtml: gerak terencana terbuka ditandai pil putus 'menuju'", () => {
  assert.match(K.barisKitHtml({...kit, gerak_buka: {ke_status: "banjir", eta_jam: 9, waktu: 1}}), /sp-status[^>]*putus[^>]*>[^<]*menuju banjir/);
});
test("tombol gerak: staf tulis tidak ditawari Tandai hilang; moderator ditawari; pensiun tanpa tombol sama sekali", () => {
  assert.doesNotMatch(K.tombolGerakHtml({...kit, status: "gudang"}, "W"), /hilang|pensiun/i);
  assert.match(K.tombolGerakHtml({...kit, status: "gudang"}, "M"), /Tandai hilang/);
  assert.match(K.tombolGerakHtml({...kit, status: "hilang"}, "M"), /Tandai ditemukan/);
  assert.equal(K.tombolGerakHtml({...kit, status: "pensiun"}, "M"), "");
  assert.equal(K.tombolGerakHtml({...kit, status: "gudang"}, "B"), "");
});
const gerak = (x = {}) => ({id: "g1", dari_status: "gudang", ke_status: "banjir", alasan: "pindah_banjir", rencana: 1, eta_jam: 9, tiba: null, pengangkut: "yontp", waktu: 1761292200000, oleh: "staf:3", ...x});
test("tabGerakHtml: Konfirmasi tiba hanya untuk gerak terencana belum tiba dan peran tulis; kosong punya kalimat DS", () => {
  assert.match(K.tabGerakHtml([gerak()], kit, "W"), /Konfirmasi tiba/);
  assert.doesNotMatch(K.tabGerakHtml([gerak()], kit, "B"), /Konfirmasi tiba/);
  assert.doesNotMatch(K.tabGerakHtml([gerak({tiba: 1761320000000})], kit, "W"), /Konfirmasi tiba/);
  assert.match(K.tabGerakHtml([], kit, "W"), /Kit ini belum pernah bergerak sejak dibuat\./);
  assert.match(K.tabGerakHtml([gerak({tiba: 1761322800000})], kit, "W"), /aria-label="Riwayat gerak kit SIPPA-001"/);
  assert.match(K.tabGerakHtml([gerak({tiba: 1761322800000})], kit, "W"), /8 jam 30 menit|8 jam 30/, "durasi tiba dikurangi waktu lewat fmt.durasi");
});
test("tabKomponenHtml: persen kehilangan dengan ambang; Cek komponen hanya peran tulis; kolom pemilik asal tampil bila beda", () => {
  const k = [{id: "a", kode_bom: "P-01", nama: "Pompa trash kelas 2 inci atau setara", jumlah: 1, satuan: "unit", nomor_seri: null, kondisi: "baik", dicek: 1761300000000, musim_awal: 1, pemilik_asal: "Manggala Agni"}];
  const h = K.tabKomponenHtml(k, "W");
  assert.match(h, /Cek komponen/); assert.doesNotMatch(K.tabKomponenHtml(k, "B"), /Cek komponen/);
  assert.match(h, /Manggala Agni/); assert.match(h, /Kelas kinerja|Nama/);
  assert.match(K.tabKomponenHtml(komp(40, 1).map((x, i) => ({...x, kode_bom: "P-" + i, nama: "n" + i, jumlah: 1, satuan: "unit"})), "W"), /2,5%/);
});
test("tabTugasHtml: tanpa kode atau hash penugasan; Cabut hanya yang aktif dan peran tulis", () => {
  const t = [{id: "t1", nama_regu: "Regu A", unsur: "bpbd", prov: "62", kab: "Kapuas", mulai: 1761292200000, berakhir: 1761292200000 + 7 * 864e5, dicabut: null, kode_sha: "f".repeat(64), kode: "0123456789abcdef0123456789"},
    {id: "t2", nama_regu: "Regu B", unsur: "yontp", prov: "62", kab: "Kapuas", mulai: 1, berakhir: 2, dicabut: 1}];
  const h = K.tabTugasHtml(t, "W", 1761292200000 + 864e5);
  assert.doesNotMatch(h, /ffffffff|0123456789abcdef0123456789/);
  assert.equal((h.match(/Cabut tugas/g) || []).length, 1);
  assert.match(h, /Tugaskan/); assert.doesNotMatch(K.tabTugasHtml(t, "B", 1761292200000), /Tugaskan|Cabut tugas/);
});

/* ---------- kontrak jaringan (rute SP-008 ditiru) ---------- */
test("kirimPost: JSON dengan x-pb 1 ke jalur aksi-sebelum-id; 4xx/409 menjadi galat dengan pesan server, bukan sukses diam", async () => {
  const dipanggil = [];
  globalThis.fetch = async (url, o) => { dipanggil.push([url, o]); return url.includes("tiba") ? {ok: false, status: 409, json: async () => ({galat: "status kit sudah berubah"})} : {ok: true, status: 201, json: async () => ({gerak: {id: "g"}, kit: {}})}; };
  const j = await K.kirimPost("/api/sippa/gerak/0123456789abcdef", {alasan: "gelar", ke_status: "gelar"});
  assert.deepEqual(j.gerak, {id: "g"});
  assert.equal(dipanggil[0][1].method, "POST"); assert.equal(dipanggil[0][1].headers["x-pb"], "1"); assert.equal(dipanggil[0][1].headers["content-type"], "application/json");
  assert.equal(dipanggil[0][1].credentials, "same-origin"); assert.deepEqual(JSON.parse(dipanggil[0][1].body), {alasan: "gelar", ke_status: "gelar"});
  await assert.rejects(K.kirimPost("/api/sippa/tiba/0123456789abcdef", {}), e => e.status === 409 && /status kit sudah berubah/.test(e.message));
  globalThis.fetch = async () => { throw new TypeError("gagal"); };
  await assert.rejects(K.kirimPost("/api/sippa/tugas", {}), e => e.status === 0 && /terhubung/.test(e.message));
});
test("jalurKit: id wajib 16 heks sebelum masuk jalur API", () => {
  assert.equal(K.jalurApi("gerak", "0123456789abcdef"), "/api/sippa/gerak/0123456789abcdef");
  for (const buruk of ["../x", "0123456789ABCDEF", "abc", "0123456789abcdef/../x"]) assert.throws(() => K.jalurApi("gerak", buruk), /id/, buruk);
});

/* ---------- gerbang sumber (SP-014 menyusul; ini penjaga lokal) ---------- */
const sumber = readFileSync(new URL("../../public/pipa/layar_kit.js", import.meta.url), "utf8");
test("sumber layar_kit.js: kode penugasan tidak disimpan klien, tanpa toFixed, CDN, em dash, titik tengah, kata terbukti", () => {
  for (const [pola, nama] of [[/localStorage|sessionStorage|indexedDB|document\.cookie/, "penyimpanan klien"], [/toFixed\(/, "toFixed"], [/https?:\/\//, "URL luar"], [/—/, "em dash"], [/·/, "titik tengah"], [/terbukti/i, "terbukti"], [/location\.hash\s*=|pushState\([^)]*kode/, "kode ke alamat"]])
    assert.doesNotMatch(sumber, pola, nama);
});
test("sumber layar_kit.js: kontrak router pasang dan lepas, formGerak diekspor untuk SP-043", () => {
  assert.equal(typeof K.pasang, "function"); assert.equal(typeof K.lepas, "function"); assert.equal(typeof K.formGerak, "function");
});

test("ringkasPakai, kepalaKitHtml, tabPemakaianHtml, tabBbmHtml: jumlah benar, kosong berkalimat, teks data di-escape", () => {
  const pakai = [{jam_pompa: 10, banjir_m3: 500, jenis: "banjir", t_tiba: 1761292200000}, {jam_pompa: 2.5, banjir_m3: null, jenis: "<b>x</b>", t_tiba: null}];
  const bbm = [{aksi: "keluar", liter: 100, waktu: 1, jenis: "bensin", oleh: "staf:1"}, {aksi: "kembali", liter: 30, waktu: 2, jenis: "bensin", oleh: "staf:1"}, {aksi: "keluar", liter: 50, waktu: 3, jenis: "solar", oleh: "<i>"}];
  assert.deepEqual(K.ringkasPakai(pakai, bbm), {jam: 12.5, banjir: 500, bbmKeluar: 150});
  assert.deepEqual(K.ringkasPakai([], []), {jam: 0, banjir: 0, bbmKeluar: 0});
  const kepala = K.kepalaKitHtml({...kit, kode: "SIPPA-001", pemilik_asal: "<script>x</script>"}, K.ringkasPakai(pakai, bbm), komp(5, 2));
  assert.doesNotMatch(kepala, /<script>/); assert.match(kepala, /12,5 jam/); assert.match(kepala, /<dd class="num">2<\/dd>/, "dua komponen kurang"); assert.match(kepala, /data-cetak/);
  assert.doesNotMatch(K.tabPemakaianHtml(pakai), /<b>x/); assert.match(K.tabPemakaianHtml([]), /Belum ada sesi/);
  assert.doesNotMatch(K.tabBbmHtml(bbm), /<i>/); assert.match(K.tabBbmHtml([]), /hanya bisa ditambah/);
});

test("INP layar Kit: tombol cek/simpan diberi aria-busy sebelum kerja, gambar tab satu antrean, muat per panggilan batal, kamera berpenjaga", () => {
  assert.match(sumber, /sibukkan\(cek\)[^]*jadwalkanTab\(\)/, "Cek komponen dan Batal: aria-busy dulu, gambar sesudahnya");
  assert.match(sumber, /sibukkan\(simpan\)/, "Simpan hasil cek menonaktifkan tombol sebelum POST");
  assert.match(sumber, /if \(simpan\.disabled\) return/, "klik ganda Simpan diblokir");
  assert.match(sumber, /simpan\.disabled = false/, "tombol Simpan hidup lagi bila POST gagal");
  assert.doesNotMatch(sumber, /nanti\(gambarTab\)/, "gambarTab hanya lewat jadwalkanTab");
  assert.match(sumber, /muatCtrl\?\.abort\(\)/, "muat membatalkan muat sebelumnya");
  assert.match(sumber, /getAttribute\("aria-busy"\) === "true"\) return/, "cetak punya penjaga masuk ulang");
  assert.match(sumber, /let sibuk = false/, "deteksi kamera satu per satu");
  assert.match(sumber, /#sp-pindai"\)\?\.hidden !== false/, "kamera dimatikan bila panel sudah ditutup selama menunggu izin");
});

test("tingkatKehilangan membandingkan nilai yang tampil: 10 dari 201 (4,975 menjadi 5%) bukan lagi 'di bawah ambang'", () => {
  const p = K.persenKehilangan(komp(201, 10));
  assert.equal(fmt(p), "5", "yang tampil 5");
  assert.equal(K.tingkatKehilangan(p), "u8");
  assert.equal(K.tingkatKehilangan(4.94), "normal"); assert.equal(K.tingkatKehilangan(19.96), "k15");
  const h = K.tabKomponenHtml(komp(201, 10).map((x, i) => ({...x, kode_bom: "P-" + i, nama: "n", jumlah: 1, satuan: "unit"})), "W");
  assert.match(h, /5%/); assert.match(h, /mencapai ambang U8/); assert.doesNotMatch(h, /di bawah ambang/);
});

test("layar:kit: tiap tabel dan blok statistik memuat 'Sumber: inventaris SIPPA, per <waktu>'; tanpa teks undefined atau null", () => {
  const per = 1761370800000, kosongKit = {id: "0123456789abcdef", kode: "SIPPA-001", jenis: "gambut", status: "gudang"};
  const semua = [K.tabKomponenHtml([{id: "a", kode_bom: "P-01", nama: "n", jumlah: 1, satuan: "unit", kondisi: "baik"}], "W", {per}), K.tabGerakHtml([gerak({tiba: 1761322800000})], kit, "W", per),
    K.tabPemakaianHtml([{jenis: "banjir", t_tiba: 1}], per), K.tabBbmHtml([{waktu: 1, jenis: "solar", aksi: "keluar", liter: 5, oleh: "staf:1"}], per),
    K.tabTugasHtml([{id: "t", nama_regu: "R1", unsur: "bpbd", mulai: 1, berakhir: per * 2, dicabut: null}], "W", per, per), K.kepalaKitHtml(kosongKit, K.ringkasPakai([], []), [], per), K.barisKitHtml(kosongKit)];
  for (const h of semua.slice(0, 6)) assert.match(h, /Sumber: inventaris SIPPA, per \d/, h.slice(0, 60));
  assert.match(K.kepalaKitHtml(kosongKit, K.ringkasPakai([], []), [], per), /sp-yakin terverifikasi/, "blok statistik berpil keyakinan");
  for (const h of semua) assert.doesNotMatch(h, /undefined|null|NaN/);
});

test("status tugas pakai kelas status netral, bukan pil keyakinan; gerak terencana berpil 'rencana, ETA n jam' tanpa pil terencana", () => {
  const t = [{id: "t1", nama_regu: "A", unsur: "bpbd", mulai: 1, berakhir: 100, dicabut: null}, {id: "t2", nama_regu: "B", unsur: "bpbd", mulai: 1, berakhir: 1e15, dicabut: 5}, {id: "t3", nama_regu: "C", unsur: "bpbd", mulai: 1, berakhir: 1e15, dicabut: null}];
  const h = K.tabTugasHtml(t, "W", 1000);
  assert.match(h, /sp-status kedaluwarsa/); assert.match(h, /sp-status dicabut/); assert.match(h, /sp-status aktif/); assert.doesNotMatch(h, /sp-yakin/);
  const g = K.tabGerakHtml([gerak()], kit, "W");
  assert.match(g, /sp-status banjir putus">rencana, ETA 9 jam</); assert.doesNotMatch(g, /terencana/);
});

test("pesan galat form memuat cara memperbaiki; label status di galat memakai nama, bukan kunci", () => {
  const pesan = K.cekGerak({status: "gudang"}, {alasan: "bongkar", ke_status: "gelar"}, "W")[0].alasan;
  assert.match(pesan, /Pilih gerak lain/); assert.match(pesan, /gudang ke digelar/);
  for (const g of [...K.cekTugas({}), ...K.cekGerak({status: "gudang"}, {alasan: "gelar", ke_status: "gelar", eta_jam: 999}, "W")]) assert.match(g.alasan, /\. [A-Z]/, `tanpa saran perbaikan: ${g.alasan}`);
});

test("buatQR dengan pustaka vendor asli: label kit menjadi matriks QR sah (versi 2 = 25 modul), pustaka belum dimuat = galat jelas", () => {
  assert.throws(() => K.buatQR("SIPPA:SIPPA-001", "x"), /pustaka QR/);
  (0, eval)(readFileSync(new URL("../../public/vendor/qrcode/qrcode.min.js", import.meta.url), "utf8") + ";globalThis.qrcode=qrcode;");
  const svg = K.buatQR(K.labelKit("SIPPA-001"), "QR kit SIPPA-001");
  assert.match(svg, /viewBox="0 0 33 33"/, "25 modul + 2 x 4 zona tenang");
  assert.ok((/ d="([^"]*)"/.exec(svg)[1].match(/M/g) || []).length > 150, "modul gelap terisi");
  delete globalThis.qrcode;
});
