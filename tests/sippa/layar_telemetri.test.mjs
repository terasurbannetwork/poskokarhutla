/* SP-051: logika murni layar Telemetri (tag P&ID, seri 24 jam, grafik garis, tabel perangkat, alarm, form daftar). DOM tidak disentuh.
   Rute /api/sippa/telemetri, perangkat, alarm adalah kerja SP-050: kontrak DT 4.3 dipegang lewat fetch tiruan. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

/* global klasik public/inti: dimuat dari berkas nyata, bukan ditiru */
(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const T = await import("../../public/pipa/layar_telemetri.js");
const baca = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const J = 3600e3, KINI = Date.UTC(2026, 9, 28, 3, 15);   // 28 Okt 2026 10.15 WIB
const ID = "0123456789abcdef";

/* ---------- tag identik dengan dokumen ---------- */
test("TAG_PID: tag sama persis dengan daftar PRD 9.11 dan lolos GLOB serta panjang skema 0058", () => {
  const prd = baca("data/kajian-bnpb/pipa/PRD.md");
  const baris = prd.split("\n").find(l => l.startsWith("| `sippa_perangkat`"));
  assert.ok(baris, "baris sippa_perangkat tidak ditemukan di PRD 9.11");
  const dokumen = [...(/`tag` \(([^)]*)\)/.exec(baris)[1]).matchAll(/[A-Z]+-\d{3}(?: s\.d\. T-\d{3})?/g)].flatMap(m => {
    if (m[0].includes("s.d.")) { const [a, b] = m[0].split(" s.d. "); const [p, n1] = a.split("-"), n2 = b.split("-")[1]; return Array.from({length: n2 - n1 + 1}, (_, i) => `${p}-${+n1 + i}`); }
    return [m[0]];
  });
  const kit = Object.keys(T.TAG_PID).filter(t => t !== "U-102");   // U-102 = gateway (BOM 6.1), bukan sensor di 9.11
  assert.deepEqual([...kit].sort(), [...new Set(dokumen)].sort(), `${kit.length} tag di kode, ${dokumen.length} di PRD`);
  for (const t of Object.keys(T.TAG_PID)) { assert.match(t, /^[A-Z]+-[0-9]+$/); assert.ok(t.length <= 12, t); }
});

test("TAG_PID: jenis dan satuan tiap tag ada di daftar CHECK skema 0058 (DT 3.4)", () => {
  const dt = baca("data/kajian-bnpb/pipa/DESAIN-TEKNIS.md").split("CREATE TABLE IF NOT EXISTS sippa_perangkat")[1];
  const daftar = re => [...new RegExp(re).exec(dt)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  const jenis = daftar(/jenis TEXT NOT NULL CHECK \(jenis IN \(([^)]*)\)/.source), satuan = daftar(/satuan TEXT NOT NULL CHECK \(satuan IN \(([^)]*)\)/.source);
  assert.deepEqual([...Object.keys(T.JENIS)].sort(), [...jenis].sort(), "jenis di JENIS sama dengan CHECK");
  assert.deepEqual([...T.SATUAN].sort(), [...satuan].sort(), "satuan di SATUAN sama dengan CHECK");
  for (const [t, d] of Object.entries(T.TAG_PID)) { assert.ok(jenis.includes(d.jenis), `${t} jenis ${d.jenis}`); assert.ok(satuan.includes(d.satuan), `${t} satuan ${d.satuan}`); }
});

test("KODE_ALARM: delapan kode sama dengan CHECK sippa_alarm, tiap kode berlabel tanpa kode mentah", () => {
  const dt = baca("data/kajian-bnpb/pipa/DESAIN-TEKNIS.md").split("CREATE TABLE IF NOT EXISTS sippa_alarm")[1];
  const cek = [...(/kode TEXT NOT NULL CHECK \(kode IN \(([^)]*)\)/.exec(dt)[1]).matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
  assert.deepEqual(Object.keys(T.KODE_ALARM).sort(), cek);
  for (const l of Object.values(T.KODE_ALARM)) assert.doesNotMatch(l, /_/, l);
});

/* ---------- mutu ---------- */
test("pilMutu: 0 baik, 1 diragukan, 2 di luar rentang, selain itu strip; selalu berteks (bukan warna saja)", () => {
  assert.match(T.pilMutu(0), />baik</); assert.match(T.pilMutu(1), />diragukan</); assert.match(T.pilMutu(2), />di luar rentang</);
  assert.equal(T.pilMutu(null), "–"); assert.equal(T.pilMutu(7), "–");
});

/* ---------- waktu ---------- */
test("lalu: dari baru saja sampai hari, tanpa angka negatif bila jam perangkat di depan", () => {
  assert.equal(T.lalu(KINI - 20e3, KINI), "baru saja"); assert.equal(T.lalu(KINI - 2 * 60e3, KINI), "2 menit lalu");
  assert.equal(T.lalu(KINI - 5 * J, KINI), "5 jam lalu"); assert.equal(T.lalu(KINI - 72 * J, KINI), "3 hari lalu");
  assert.equal(T.lalu(KINI + 4 * 60e3, KINI), "baru saja"); assert.equal(T.lalu(null, KINI), "belum pernah");
});

/* ---------- seri 24 jam ---------- */
const titik = (menit, v, m = 0) => [KINI - menit * 60e3, v, m];

test("jendelaSeri: hanya 24 jam terakhir, urut waktu; titik lebih dari 5 menit di depan dibuang; bukan larik dibuang tanpa melempar", () => {
  const s = T.jendelaSeri([titik(10, 2), titik(25 * 60, 9), titik(30, 1), [KINI + 6 * 60e3, 5, 0], titik(1430, 4)], KINI);
  assert.deepEqual(s.map(p => p[1]), [4, 1, 2]);
  assert.deepEqual(T.jendelaSeri(null, KINI), []); assert.deepEqual(T.jendelaSeri([["x"], titik(5, "a")], KINI), []);
});

test("bucketSeri: paling banyak n titik, rerata dan mutu terburuk per keranjang, waktu naik", () => {
  const mentah = Array.from({length: 1440}, (_, i) => titik(1440 - i, i % 2 ? 2 : 4, i === 700 ? 2 : 0));
  const b = T.bucketSeri(mentah, KINI, 288);
  assert.ok(b.length <= 288, `${b.length} titik`); assert.ok(b.length >= 280);
  assert.ok(b.every((p, i) => i === 0 || p.t > b[i - 1].t), "waktu naik");
  assert.equal(Math.max(...b.map(p => p.mutu)), 2); assert.ok(b.every(p => p.v >= 2 && p.v <= 4));
  assert.deepEqual(T.bucketSeri([], KINI), []);
});

test("ringkasPerJam: 24 baris, n dan min maks rerata per jam, n_mutu2 dihitung; jam tanpa bacaan n 0 dengan min null (bukan 0)", () => {
  const r = T.ringkasPerJam([titik(10, 4), titik(20, 6, 2), titik(130, 1)], KINI);
  assert.equal(r.length, 24);
  const akhir = r[23]; assert.equal(akhir.n, 2); assert.equal(akhir.min, 4); assert.equal(akhir.maks, 6); assert.equal(akhir.rerata, 5); assert.equal(akhir.n_mutu2, 1);
  assert.equal(r[0].n, 0); assert.equal(r[0].min, null); assert.equal(r[0].rerata, null);
  assert.equal(r.reduce((s, x) => s + x.n, 0), 3);
});

/* ---------- grafik ---------- */
const seri = Array.from({length: 120}, (_, i) => titik((120 - i) * 10, 4 + Math.sin(i / 8) * 2, i === 60 ? 2 : i === 30 ? 1 : 0));

test("grafikGaris: satu path garis, garis acuan berlabel di ujung kanan dan masuk rentang Y, penanda mutu, role img berjudul", () => {
  const svg = T.grafikGaris(seri, {kini: KINI, satuan: "bar", judul: "PT-102, 24 jam", acuan: [{y: 12.1, label: "tekanan lebih 12,1 bar"}, {y: 0, label: "batas sah min 0 bar"}]});
  assert.match(svg, /^<svg class="sp-grafik"[^>]*role="img"/); assert.match(svg, /<title>PT-102, 24 jam<\/title>/);
  assert.match(svg, /<path class="sp-garis"[^>]*d="M/); assert.equal((svg.match(/class="sp-ambang putus"/g) || []).length, 2);
  assert.match(svg, /tekanan lebih 12,1 bar/); assert.match(svg, /batas sah min 0 bar/);
  assert.equal((svg.match(/class="sp-titik meleset"/g) || []).length, 1, "satu titik di luar rentang (berongga)");
  assert.equal((svg.match(/class="sp-titik"/g) || []).length, 1, "satu titik diragukan (berisi)");
  assert.doesNotMatch(svg, /NaN|undefined|Infinity/);
});

test("grafikGaris: celah lebih dari 30 menit memutus garis jadi dua path; satu titik terpencil digambar sebagai titik; nilai rata tidak NaN", () => {
  const dua = T.grafikGaris([titik(300, 1), titik(295, 2), titik(100, 3), titik(95, 2)], {kini: KINI, satuan: "bar", judul: "x"});
  assert.equal((dua.match(/<path class="sp-garis"/g) || []).length, 2);
  const satu = T.grafikGaris([titik(300, 1), titik(100, 3), titik(95, 2)], {kini: KINI, satuan: "bar", judul: "x"});
  assert.equal((satu.match(/<path class="sp-garis"/g) || []).length, 1); assert.match(satu, /class="sp-tunggal"/);
  const rata = T.grafikGaris([titik(30, 5), titik(20, 5), titik(10, 5)], {kini: KINI, satuan: "bar", judul: "x"});
  assert.doesNotMatch(rata, /NaN|Infinity/);
});

test("grafikGaris: judul dan label acuan dari data di-escape", () => {
  const svg = T.grafikGaris(seri, {kini: KINI, satuan: "bar", judul: '<img src=x onerror=alert(1)>', acuan: [{y: 5, label: '"><script>x</script>'}]});
  assert.doesNotMatch(svg, /<img|<script/); assert.match(svg, /&lt;img/);
});

test("tabelSeriHtml: 24 baris jam, jam tanpa bacaan berstrip, bukan nol", () => {
  const h = T.tabelSeriHtml(T.ringkasPerJam([titik(10, 4.8)], KINI), "bar");
  assert.equal((h.match(/<tr>/g) || []).length, 25); assert.match(h, /4,8 bar/); assert.match(h, /data-label="Rata-rata">–</);
  assert.doesNotMatch(h, />0 bar</);
});

/* ---------- tabel perangkat ---------- */
const P = {id: ID, kit_id: "fedcba9876543210", kit_kode: "SIPPA-001", tag: "PT-102", jenis: "tekanan", satuan: "bar", aktif: 1, terakhir: KINI - 2 * 60e3, nilai_terakhir: 4.8, mutu_terakhir: 0};

test("barisPerangkatHtml: tag, kit, jenis, terakhir terlihat, nilai id-ID dengan satuan, mutu berteks, aktif", () => {
  const h = T.barisPerangkatHtml(P, {kini: KINI, dipilih: false});
  for (const s of ["PT-102", "SIPPA-001", "Tekanan", "2 menit lalu", "4,8 bar", ">baik<", ">aktif<"]) assert.ok(h.includes(s), `tidak memuat ${s}`);
  assert.match(h, /data-pilih="0123456789abcdef"[^>]*aria-pressed="false"/);
  assert.match(T.barisPerangkatHtml(P, {kini: KINI, dipilih: true}), /aria-pressed="true"/);
});

test("barisPerangkatHtml: perangkat belum pernah kirim berstrip dan 'belum pernah', dicabut berlabel; teks dari data di-escape", () => {
  const h = T.barisPerangkatHtml({...P, terakhir: null, nilai_terakhir: null, mutu_terakhir: null, aktif: 0, tag: "<b>x</b>", kit_kode: "<i>"}, {kini: KINI});
  assert.match(h, /belum pernah/); assert.match(h, />dicabut</); assert.doesNotMatch(h, /<b>x|<i>/); assert.doesNotMatch(h, /undefined|null|NaN/);
});

test("urutPerangkat: aktif dulu, lalu kit, lalu tag; tidak mengubah larik asal", () => {
  const a = [{...P, id: "1", tag: "T-101", aktif: 0}, {...P, id: "2", tag: "PT-102"}, {...P, id: "3", tag: "FT-101"}];
  assert.deepEqual(T.urutPerangkat(a).map(x => x.tag), ["FT-101", "PT-102", "T-101"]); assert.equal(a[0].id, "1");
});

test("pilihAwal: perangkat aktif yang terakhir terlihat; bila tak ada yang pernah kirim, yang pertama; kosong null", () => {
  assert.equal(T.pilihAwal([{id: "a", aktif: 1, terakhir: 5}, {id: "b", aktif: 1, terakhir: 9}, {id: "c", aktif: 0, terakhir: 99}]), "b");
  assert.equal(T.pilihAwal([{id: "a", aktif: 1, terakhir: null}, {id: "b", aktif: 1, terakhir: null}]), "a");
  assert.equal(T.pilihAwal([]), null);
});

/* ---------- alarm ---------- */
const A = {id: "aaaaaaaaaaaaaaaa", perangkat_id: ID, kit_id: P.kit_id, kode: "tekanan_lebih", nilai: 12.1, ambang: 11.1, mulai: KINI - 3 * J, ditutup: null, ditutup_oleh: null};

test("alarmHtml: alarm aktif memuat kode berlabel, tag, nilai dan ambang bersatuan, 'sejak', tombol Tutup hanya untuk peran W dan M", () => {
  const per = new Map([[ID, P]]);
  const w = T.alarmHtml([A], per, {peran: "W", kini: KINI, aktif: true});
  for (const s of ["Tekanan lebih", "PT-102", "12,1 bar", "11,1 bar", "sejak"]) assert.ok(w.includes(s), s);
  assert.match(w, /data-tutup="aaaaaaaaaaaaaaaa"/); assert.match(T.alarmHtml([A], per, {peran: "M", kini: KINI, aktif: true}), /data-tutup/);
  assert.doesNotMatch(T.alarmHtml([A], per, {peran: "B", kini: KINI, aktif: true}), /data-tutup/);
  assert.doesNotMatch(w, /tekanan_lebih/);
});

test("alarmHtml: riwayat memuat waktu tutup dan siapa; kosong berkalimat; alarm yatim (perangkat tak dikenal) tetap tampil tanpa melempar", () => {
  const per = new Map([[ID, P]]);
  const r = T.alarmHtml([{...A, ditutup: KINI - J, ditutup_oleh: "perangkat:" + ID}], per, {peran: "W", kini: KINI, aktif: false});
  assert.match(r, /ditutup/); assert.doesNotMatch(r, /data-tutup/);
  assert.match(T.alarmHtml([], per, {peran: "W", kini: KINI, aktif: true}), /Tidak ada alarm aktif/);
  assert.match(T.alarmHtml([], per, {peran: "W", kini: KINI, aktif: false}), /Belum ada riwayat alarm/);
  assert.doesNotMatch(T.alarmHtml([{...A, perangkat_id: "ffffffffffffffff", nilai: null, ambang: null}], per, {peran: "W", kini: KINI, aktif: true}), /undefined|null|NaN/);
});

test("alarmHtml: kode tak dikenal dan teks dari data di-escape", () => {
  const h = T.alarmHtml([{...A, kode: "<script>"}], new Map([[ID, {...P, tag: "<b>"}]]), {peran: "W", kini: KINI, aktif: true});
  assert.doesNotMatch(h, /<script>|<b>/);
});

test("acuanDariAlarm: ambang alarm terbuka perangkat itu jadi garis acuan berlabel; yang tertutup atau tanpa ambang tidak", () => {
  const a = T.acuanDariAlarm([A, {...A, id: "b", ditutup: 1}, {...A, id: "c", ambang: null}, {...A, id: "d", perangkat_id: "lain"}], ID, "bar");
  assert.equal(a.length, 1); assert.equal(a[0].y, 11.1); assert.match(a[0].label, /ambang alarm tekanan lebih 11,1 bar/);
});

test("acuanDariSah: batas sah min dan maks dari pendaftaran perangkat; nol sah tidak dianggap kosong", () => {
  const a = T.acuanDariSah({min_sah: 0, maks_sah: 16}, "bar");
  assert.deepEqual(a.map(x => x.y), [0, 16]); assert.match(a[0].label, /batas sah min 0 bar/);
  assert.deepEqual(T.acuanDariSah({min_sah: null, maks_sah: null}, "bar"), []);
});

/* ---------- form daftar perangkat ---------- */
const F = {kit_id: ID, tag: "PT-102", interval_s: "60"};

test("cekPerangkat: isian sah lolos; tiap pelanggaran ditolak dengan medan dan alasan yang bisa ditindaklanjuti", () => {
  assert.deepEqual(T.cekPerangkat(F), []);
  const alasan = f => T.cekPerangkat({...F, ...f}).map(g => g.medan);
  assert.deepEqual(alasan({kit_id: "x"}), ["kit_id"]); assert.deepEqual(alasan({kit_id: ""}), ["kit_id"]);
  assert.deepEqual(alasan({tag: "PT-999"}), ["tag"]); assert.deepEqual(alasan({tag: ""}), ["tag"]);
  assert.deepEqual(alasan({interval_s: "5"}), ["interval_s"]); assert.deepEqual(alasan({interval_s: "3601"}), ["interval_s"]); assert.deepEqual(alasan({interval_s: "60,5"}), ["interval_s"]);
  assert.deepEqual(alasan({min_sah: "5", maks_sah: "5"}), ["maks_sah"]); assert.deepEqual(alasan({min_sah: "abc"}), ["min_sah"]);
  assert.deepEqual(alasan({tag_datar: "T03 50cm"}), ["tag_datar"]); assert.deepEqual(alasan({tag_datar: "A".repeat(21)}), ["tag_datar"]);
  assert.deepEqual(alasan({tag: "T-103", kedalaman_cm: "75"}), ["kedalaman_cm"]);
  for (const g of T.cekPerangkat({...F, tag: "PT-999"})) assert.ok(g.alasan.length > 25 && /\.$/.test(g.alasan), g.alasan);
});

test("cekPerangkat: kedalaman hanya dihitung untuk suhu gambut; di tag lain diabaikan; interval kosong memakai bawaan", () => {
  assert.deepEqual(T.cekPerangkat({kit_id: ID, tag: "T-103", kedalaman_cm: "50"}), []);
  assert.deepEqual(T.cekPerangkat({kit_id: ID, tag: "PT-102", kedalaman_cm: "75"}).map(g => g.medan), []);
});

test("badanPerangkat: jenis dan satuan diturunkan dari tag (bukan dari isian), angka jadi Number, kosong dibuang, gateway selalu bertoken", () => {
  assert.deepEqual(T.badanPerangkat({...F, min_sah: "0", maks_sah: "16", jenis: "debit", satuan: "m"}), {kit_id: ID, tag: "PT-102", jenis: "tekanan", satuan: "bar", interval_s: 60, min_sah: 0, maks_sah: 16, beri_token: false});
  const g = T.badanPerangkat({kit_id: ID, tag: "U-102", interval_s: ""});
  assert.equal(g.jenis, "gateway"); assert.equal(g.beri_token, true); assert.equal(g.interval_s, 60); assert.ok(!("min_sah" in g));
  assert.equal(T.badanPerangkat({...F, beri_token: true}).beri_token, true);
  const s = T.badanPerangkat({kit_id: ID, tag: "T-103", kedalaman_cm: "50", tag_datar: " T03_50cm_C "});
  assert.equal(s.kedalaman_cm, 50); assert.equal(s.tag_datar, "T03_50cm_C");
  assert.ok(!("kedalaman_cm" in T.badanPerangkat({...F, kedalaman_cm: "50"})));
});

test("peranKlien: moderator dari data-mod atau data-super, W dari data-tulis, selain itu B", () => {
  assert.equal(T.peranKlien({mod: "1"}), "M"); assert.equal(T.peranKlien({super: "1"}), "M"); assert.equal(T.peranKlien({tulis: "1"}), "W"); assert.equal(T.peranKlien({}), "B"); assert.equal(T.peranKlien(undefined), "B");
});

test("tokenHtml: token 64 heks tampil sekali dengan peringatan dan tanpa sisa di atribut selain kolom readonly; token liar ditolak", () => {
  const tok = "ab".repeat(32);
  const h = T.tokenHtml(tok);
  assert.match(h, /tidak bisa ditampilkan lagi/); assert.ok(h.includes(tok)); assert.equal(h.split(tok).length - 1, 1, "token hanya sekali di HTML");
  assert.throws(() => T.tokenHtml("<script>"), /token tidak sah/); assert.throws(() => T.tokenHtml("ab".repeat(31)), /token tidak sah/);
});

/* ---------- jaringan: kontrak DT 4.3 lewat fetch tiruan ---------- */
test("jalurSeri: perangkat wajib 16 heks sebelum fetch; sejak = 24 jam sebelum kini; harian tidak dipakai di layar ini", () => {
  assert.equal(T.jalurSeri(ID, KINI), `/api/sippa/telemetri?perangkat=${ID}&sejak=${KINI - 24 * J}`);
  assert.throws(() => T.jalurSeri("../x", KINI), /id tidak sah/);
});

test("jalurTutup: id alarm 16 heks; selain itu ditolak sebelum fetch", () => {
  assert.equal(T.jalurTutup(A.id), `/api/sippa/alarm-tutup/${A.id}`); assert.throws(() => T.jalurTutup("1"), /id tidak sah/);
});
