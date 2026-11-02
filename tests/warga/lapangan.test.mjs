/* Modul Lapangan tahap A (src/lapangan.js + src/lapangan_panel.js, migrasi 0095) di worker utuh (Miniflare) dan D1 lokal sungguhan, tanpa mock.
   Dijaga: konst publik, akses kode pribadi (tanpa/salah/orang lain/relawan), persetujuan dan pencabutan wajah, dummy hanya Super Admin,
   panel menolak petugas/gerbang/peran lain, impor (pratinjau tidak menulis, nip ganda, wa/email salah, batas baris), daftar tanpa data mentah, tautan. */
import assert from "node:assert/strict";
import "../../src/worker.js";
import {siapkan, berantai, ADMIN, MOD2, GERBANG, sha256} from "./_bnpb.mjs";
import {VERSI_SETUJU} from "../../src/lapangan_konst.js";

const U = await siapkan("uji-lapangan", {r2: true}), uji = berantai();
const PB = {"x-pb": "1"};
const A = (m, j, b, h = ADMIN) => U.api(m, j, b, {...h, ...PB});
const K = (kode, h = {}) => ({"x-kode": kode, ...h});
const TOK = "e".repeat(64), TOK_LAIN = "f".repeat(64);
const STAF = peran => ({cookie: "sesi_staf=" + peran, ...PB});
const NIP_STAF = "198001012005011001";
for (const [id, un, tok, peran, nip] of [["a1a1a1a1a1a1a1a1", "pimpinana", TOK, '["pimpinan"]', NIP_STAF], ["a2a2a2a2a2a2a2a2", "verifa", TOK_LAIN, '["verifikator"]', "2000200020002"]])
  await U.DB.batch([U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES (?, ?, ?, ?, 'Unit', ?, ?, ?, '[]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`).bind(id, un, "Nama " + un, nip, un + "@b.id", "6281200000" + id.slice(1, 2), peran),
    U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, ?, 1, ?)").bind(sha256(TOK === tok ? tok : tok), id, Date.now() + 3600e3)]);
const PIMPINAN = STAF(TOK), VERIF = STAF(TOK_LAIN);
const n = (t, w) => U.n(t, w);
const CSV = baris => "nama,nip,unit,jabatan,wa,email,prov,kab\n" + baris.join("\n");
const impor = (mode, csv, h = ADMIN) => A("POST", "/api/petugas/panel/impor", {mode, csv}, h);

uji("konst: publik, tanpa rahasia, ambang dan versi persetujuan sesuai ALGORITMA", async () => {
  const r = await U.api("GET", "/api/petugas/konst");
  assert.equal(r.s, 200); assert.match(r.h.get("cache-control"), /max-age=3600/);
  for (const k of ["ambang", "radius_bawaan_m", "tambah_akurasi_maks_m", "batas_jam_hp_detik", "luring", "nonce"]) assert.ok(!(k in r.j), k);
  assert.ok(!("antispoofMin" in r.j.mutu) && r.j.mutu.skorDeteksiMin, "mutu per frame terbuka, antispoof tidak");
  assert.equal(r.j.versi_setuju, VERSI_SETUJU); assert.deepEqual(r.j.gps, {sampel: 3, jedaMs: 1000});
  assert.ok(!/secret|token|salt|kode_sha/i.test(r.t));
});

uji("konst: enum logbook (kegiatan, kendala, kebutuhan) sama dengan kunci klien public/petugas/logbook_murni.js", async () => {
  const K2 = await import("../../public/petugas/logbook_murni.js"), r = await U.api("GET", "/api/petugas/konst");
  const kunci = d => d.map(x => x.k);
  /* klien kini hanya menyimpan LABEL; kunci datang dari konst. Tiap kunci server punya label, dan tabel label tidak memuat kunci yang tidak ada di server. */
  assert.deepEqual(r.j.kegiatan, kunci(K2.LABEL_KEGIATAN)); assert.deepEqual(r.j.kendala, kunci(K2.LABEL_KENDALA)); assert.deepEqual(r.j.kebutuhan, kunci(K2.LABEL_KEBUTUHAN));
  assert.deepEqual(K2.KEGIATAN(r.j).map(x => x.k), r.j.kegiatan);
});

uji("header halaman petugas: permissions-policy kamera boleh; panel saja dapat peta (worker blob, openfreemap); /petugas tidak dilonggarkan; berkas statis dialihkan", async () => {
  const ambil = j => U.mf.dispatchFetch("http://bnpb.lokal" + j, {redirect: "manual"});
  const p = await ambil("/petugas"), pn = await ambil("/petugas/panel");
  for (const r of [p, pn]) { assert.equal(r.status, 200); assert.equal(r.headers.get("permissions-policy"), "camera=(self), geolocation=(self), microphone=()"); assert.equal(r.headers.get("referrer-policy"), "no-referrer"); await r.arrayBuffer(); }
  const cp = p.headers.get("content-security-policy"), cn = pn.headers.get("content-security-policy");
  assert.ok(!/openfreemap|blob:.*worker|worker-src/.test(cp), "/petugas tanpa izin peta"); assert.match(cp, /connect-src 'self';/); assert.match(cp, /script-src 'self' 'wasm-unsafe-eval';/, "WASM MiniFASNet (onnxruntime-web)"); assert.ok(!/unsafe-eval'[^;]*;.*unsafe-eval/.test(cp) && !/(?<!wasm-)unsafe-eval/.test(cp), "bukan unsafe-eval penuh");
  assert.match(cn, /connect-src 'self' https:\/\/tiles\.openfreemap\.org;/); assert.match(cn, /worker-src blob:/); assert.match(cn, /child-src blob:/); assert.match(cn, /script-src 'self';/); assert.ok(!/wasm-unsafe-eval/.test(cn), "panel tanpa WASM");
  for (const [dari, ke] of [["/petugas/index.html", "/petugas"], ["/petugas/panel.html", "/petugas/panel"]]) { const r = await ambil(dari); assert.equal(r.status, 301, dari); assert.equal(new URL(r.headers.get("location"), "http://x").pathname, ke); }
});

uji("impor: tanpa Super Admin ditolak (tamu, moderator, gerbang, staf pimpinan), tanpa x-pb ditolak", async () => {
  const c = CSV(["Budi Santoso,198501012010011002,Pusdalops,Analis,081234567801,budi@bnpb.go.id,31,Jakarta"]);
  for (const h of [{}, MOD2, GERBANG, PIMPINAN, VERIF]) assert.equal((await impor("simpan", c, h)).s, 403, JSON.stringify(h));
  assert.equal((await U.api("POST", "/api/petugas/panel/impor", {mode: "simpan", csv: c}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal(await n("orang"), 0);
});

uji("impor: pratinjau melaporkan baru/ditolak dan TIDAK menulis", async () => {
  const c = CSV([
    "Budi Santoso,198501012010011002,Pusdalops,Analis,0812-3456-7801,budi@bnpb.go.id,31,Jakarta",
    "Sari Dewi,199001012015012003,Direktorat,Staf,081234567802,,,",
    "Dobel Nip,198501012010011002,Unit,Staf,,,,",
    "Nip Pendek,12345,Unit,Staf,,,,",
    "Wa Salah,199101012015012004,Unit,Staf,12345,,,",
    "Email Salah,199201012015012005,Unit,Staf,,bukan-email,,",
    "Prov Salah,199301012015012006,Unit,Staf,,,6x,",
    `${"N".repeat(121)},199401012015012007,Unit,Staf,,,,`,
    ",199501012015012008,Unit,Staf,,,,",
  ]);
  const r = await impor("pratinjau", c);
  assert.equal(r.s, 200, r.t);
  assert.deepEqual([r.j.baru, r.j.berubah, r.j.sama], [2, 0, 0]);
  const alasan = Object.fromEntries(r.j.ditolak.map(x => [x.baris, x.alasan]));
  assert.deepEqual(Object.keys(alasan).map(Number), [4, 5, 6, 7, 8, 9, 10]);
  assert.match(alasan[4], /nip ganda/); assert.match(alasan[5], /18 angka/); assert.match(alasan[6], /wa/); assert.match(alasan[7], /email/); assert.match(alasan[8], /prov/); assert.match(alasan[9], /nama/); assert.match(alasan[10], /nama/);
  assert.equal(r.j.contoh.length, 2); assert.ok(!/62812|budi@bnpb/.test(r.t), "contoh tanpa wa/email mentah");
  assert.equal(await n("orang"), 0); assert.equal(await n("wa_antre"), 0);
});

uji("impor: kepala/kolom/batas ditolak", async () => {
  for (const [b, s] of [[{mode: "pratinjau", csv: "unit\nx"}, 400], [{mode: "pratinjau", csv: "nama,nip,liar\nA B,198501012010011002,x"}, 400], [{mode: "pratinjau", csv: "nama,nip\n"}, 400],
    [{mode: "kirim", csv: "nama,nip\nA B,1"}, 400], [{mode: "simpan"}, 400]]) assert.equal((await A("POST", "/api/petugas/panel/impor", b)).s, s, JSON.stringify(b).slice(0, 60));
  const besar = CSV(Array.from({length: 5001}, (_, i) => `Orang ${i},${String(1e17 + i)},U,J,,,,`));
  assert.equal((await impor("pratinjau", besar)).s, 413);
  assert.equal(await n("orang"), 0);
});

uji("impor: simpan membuat orang (terhubung staf bila nip sama), ulang = sama, ubah = berubah, kode_sha terisi", async () => {
  const c = CSV(["Budi Santoso,198501012010011002,Pusdalops,Analis,081234567801,budi@bnpb.go.id,31,Jakarta", `Staf Pimpinan,${NIP_STAF},Pimpinan,Direktur,,,,`]);
  const r = await impor("simpan", c); assert.equal(r.s, 200, r.t);
  assert.deepEqual([r.j.baru, r.j.berubah, r.j.sama, r.j.ditolak.length], [2, 0, 0, 0]);
  assert.equal(await n("orang", "jenis = 'pegawai' AND kode_sha IS NOT NULL AND length(kode_sha) = 64 AND dummy = 0"), 2);
  assert.equal((await U.DB.prepare("SELECT staf_id FROM orang WHERE nip = ?").bind(NIP_STAF).first()).staf_id, "a1a1a1a1a1a1a1a1");
  assert.equal((await U.DB.prepare("SELECT staf_id FROM orang WHERE nip = '198501012010011002'").first()).staf_id, null);
  assert.equal((await U.DB.prepare("SELECT wa FROM orang WHERE nip = '198501012010011002'").first()).wa, "6281234567801", "wa dinormalkan");
  const lagi = await impor("simpan", c); assert.deepEqual([lagi.j.baru, lagi.j.berubah, lagi.j.sama], [0, 0, 2]);
  const ubah = await impor("simpan", c.replace("Analis", "Kepala Seksi")); assert.deepEqual([ubah.j.baru, ubah.j.berubah, ubah.j.sama], [0, 1, 1]);
  assert.equal((await U.DB.prepare("SELECT jabatan FROM orang WHERE nip = '198501012010011002'").first()).jabatan, "Kepala Seksi");
  assert.equal(await n("orang"), 2);
});

uji("daftar orang: hanya pimpinan/koordalops/moderator; tanpa wa, email, kode, vektor; cari, jenis, halaman", async () => {
  for (const h of [{}, GERBANG, VERIF]) assert.equal((await U.api("GET", "/api/petugas/panel/orang", undefined, h)).s, 403, JSON.stringify(h));
  assert.equal((await U.api("GET", "/api/petugas/panel/orang", undefined, {"x-kode": "a".repeat(26)})).s, 403, "kode petugas bukan hak panel");
  await impor("simpan", CSV(Array.from({length: 60}, (_, i) => `Pegawai ${String(i).padStart(2, "0")},${"19900000000000" + String(1000 + i)},Unit Seksi ${i},Staf,08129990${String(1000 + i)},,,`)));
  for (const h of [ADMIN, MOD2, PIMPINAN]) assert.equal((await U.api("GET", "/api/petugas/panel/orang", undefined, h)).s, 200, JSON.stringify(h));
  const r = await U.api("GET", "/api/petugas/panel/orang", undefined, PIMPINAN);
  assert.equal(r.j.total, 62); assert.equal(r.j.ukuran_halaman, 50); assert.equal(r.j.baris.length, 50);
  assert.deepEqual(Object.keys(r.j.baris[0]).sort(), ["ada_wa", "id", "jabatan", "jenis", "nama", "nip", "unit", "wajah_status"]);
  assert.ok(!/08129990|6281234567801|budi@|kode_sha|vektor/.test(r.t), "wa/email/kode/vektor mentah tidak boleh muncul");
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?halaman=2", undefined, PIMPINAN)).j.baris.length, 12);
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?cari=Pegawai%2007", undefined, PIMPINAN)).j.total, 1);
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?cari=%25", undefined, PIMPINAN)).j.total, 0, "% di cari bukan wildcard");
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?jenis=relawan", undefined, PIMPINAN)).j.total, 0);
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?jenis=liar", undefined, PIMPINAN)).s, 400);
});

let KODE_BUDI, ID_BUDI;
uji("tautan: hanya panel dan x-pb, id tak ada 404; kode baru bekerja, pesan masuk wa_antre, kode lama mati", async () => {
  ID_BUDI = (await U.DB.prepare("SELECT id FROM orang WHERE nip = '198501012010011002'").first()).id;
  assert.equal((await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, VERIF)).s, 403);
  assert.equal((await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, {})).s, 403);
  assert.equal((await U.api("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal((await A("POST", "/api/petugas/panel/tautan/0000000000000000", {}, PIMPINAN)).s, 404);
  const p0 = await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, PIMPINAN); assert.equal(p0.s, 200, p0.t);
  assert.equal(p0.j.antre, true); assert.ok(!("tautan" in p0.j) && !/[0-9a-f]{26}/.test(p0.t), "staf pimpinan tidak menerima kode");
  assert.equal(await n("wa_antre"), 1, "tetap diantrekan ke WA orangnya");
  const a = await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, ADMIN); assert.equal(a.s, 200, a.t);
  assert.equal(a.j.antre, true); assert.match(a.j.tautan, /^https:\/\/centurisk97\.id\/petugas#k=[0-9a-f]{26}$/);
  const kode1 = a.j.tautan.split("#k=")[1];
  const q = await U.DB.prepare("SELECT tujuan, pesan, jenis, status, rujukan FROM wa_antre").all();
  assert.equal(q.results.length, 1); assert.equal(q.results[0].tujuan, "6281234567801"); assert.equal(q.results[0].status, "antre");
  assert.equal(q.results[0].pesan, `Tautan Lapangan BNPB untuk Budi Santoso: ${a.j.tautan}`); assert.equal(q.results[0].rujukan, ID_BUDI);
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(kode1))).s, 200);
  const b = await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, ADMIN); KODE_BUDI = b.j.tautan.split("#k=")[1];
  assert.notEqual(KODE_BUDI, kode1);
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(kode1))).s, 401, "kode lama tidak berlaku");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(KODE_BUDI))).s, 200);
  assert.equal(await n("wa_antre"), 1, "pesan lama dengan kode mati dibuang");
  const tanpaWa = (await U.DB.prepare("SELECT id FROM orang WHERE nip = ?").bind(NIP_STAF).first()).id;
  const c = await A("POST", `/api/petugas/panel/tautan/${tanpaWa}`, {}, ADMIN); assert.equal(c.j.antre, false); assert.ok(c.j.tautan);
  assert.equal(await n("wa_antre"), 1);
  const tw = await A("POST", `/api/petugas/panel/tautan/${tanpaWa}`, {}, PIMPINAN);
  assert.equal(tw.s, 409); assert.match(tw.j.error || tw.t, /WA kosong; minta admin menyalin tautan/);
});

uji("wa_antre: cron membuang dikirim/gagal > 24 jam dan antre > 72 jam, yang baru tetap", async () => {
  const {bersihkanLapangan} = await import("../../src/lapangan.js");
  const kini = Date.now(), H = 3600e3;
  const ins = (id, st, dibuat, dikirim) => U.DB.prepare("INSERT INTO wa_antre (id, tujuan, pesan, jenis, status, dibuat, dikirim) VALUES (?, '6281200000000', 'x', 'tes', ?, ?, ?)").bind(id.padEnd(16, "0"), st, dibuat, dikirim ?? null);
  await U.DB.batch([ins("a1", "dikirim", kini - 30 * H, kini - 30 * H), ins("a2", "gagal", kini - 30 * H), ins("a3", "dikirim", kini - 2 * H, kini - H), ins("a4", "antre", kini - 80 * H), ins("a5", "antre", kini - 50 * H)]);
  await bersihkanLapangan({DB: U.DB}, kini);
  assert.deepEqual((await U.DB.prepare("SELECT id FROM wa_antre WHERE id LIKE 'a_00%' ORDER BY id").all()).results.map(x => x.id.slice(0, 2)), ["a3", "a5"]);
  await U.DB.prepare("DELETE FROM wa_antre WHERE id LIKE 'a_00%'").run();
});

uji("impor: awalan rumus (= + - @ tab) di nama/unit/jabatan ditolak", async () => {
  const hasil = await impor("pratinjau", CSV(["=HYPERLINK(1),198501012010019001,Unit,Jabatan,,,31,", "Ani,198501012010019002,+cmd,Jabatan,,,31,", "Ani,198501012010019003,Unit,@x,,,31,", "-Ani,198501012010019004,Unit,J,,,31,", "Ani Biasa,198501012010019005,Unit-A,J-1,,,31,"]));
  assert.equal(hasil.s, 200, hasil.t); assert.equal(hasil.j.ditolak.length, 4); assert.equal(hasil.j.baru, 1);
  assert.ok(hasil.j.ditolak.every(d => /rumus/.test(d.alasan)));
});

uji("staf berwilayah: daftar dan tautan hanya orang di provinsinya", async () => {
  const TOKW = "d".repeat(64);
  await U.DB.batch([U.DB.prepare(`INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, dibuat, dibuat_oleh, dummy)
    VALUES ('a3a3a3a3a3a3a3a3', 'wilayahx', 'Nama w', '3000300030003', 'Unit', 'w@b.id', '62812000009', '["pimpinan"]', '["99"]', 'gggggggggggggggggggggggggggggggg', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 0, 1, 'tes', 0)`),
    U.DB.prepare("INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa) VALUES (?, 'a3a3a3a3a3a3a3a3', 1, ?)").bind(sha256(TOKW), Date.now() + 3600e3)]);
  const W = STAF(TOKW);
  assert.ok((await U.api("GET", "/api/petugas/panel/orang", undefined, PIMPINAN)).j.total > 0);
  assert.equal((await U.api("GET", "/api/petugas/panel/orang", undefined, W)).j.total, 0, "wilayah 99 tidak punya orang");
  assert.equal((await A("POST", `/api/petugas/panel/tautan/${ID_BUDI}`, {}, W)).s, 404, "orang di luar wilayah");
});

uji("halaman /petugas dan /petugas/panel: CSP ketat dan no-referrer", async () => {
  for (const j of ["/petugas", "/petugas/panel"]) {
    const r = await U.api("GET", j, undefined, ADMIN);
    assert.equal(r.s, 200, j); assert.equal(r.h.get("referrer-policy"), "no-referrer");
    const c = r.h.get("content-security-policy");
    assert.match(c, j === "/petugas" ? /default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src/ : /default-src 'self'; script-src 'self'; style-src 'self' https:\/\/fonts\.googleapis\.com;/); assert.match(c, /frame-ancestors 'none'/); assert.ok(!/unsafe-inline/.test(c));
  }
});

uji("saya: tanpa kode 401, kode salah 401 (bukan 403), kode orang lain melihat dirinya sendiri; tanpa data rahasia", async () => {
  assert.equal((await U.api("GET", "/api/petugas/saya")).s, 401, "tanpa header x-kode");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, {"x-kode-regu": "0".repeat(26)})).s, 401, "kode regu bukan kode petugas");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K("0".repeat(26)))).s, 401);
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K("kode-bukan-hex"))).s, 401);
  const r = await U.api("GET", "/api/petugas/saya", undefined, K(KODE_BUDI));
  assert.equal(r.s, 200); assert.equal(r.h.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(r.j.orang).sort(), ["id", "jabatan", "jenis", "kab", "nama", "prov", "setuju_versi", "unit", "wajah_status"]);
  assert.equal(r.j.orang.nama, "Budi Santoso"); assert.equal(r.j.orang.wajah_status, "belum"); assert.equal(r.j.orang.setuju_versi, null);
  assert.equal(r.j.setuju.versi, VERSI_SETUJU); assert.match(r.j.setuju.teks, /\n\n/); assert.deepEqual(r.j.tugas, []);
  assert.deepEqual(r.j.hari_ini, {absen_masuk: null, absen_pulang: null, logbook: null});
  assert.ok(!/62812|kode_sha|\bnip\b|"vektor"|"wa"|"email"/.test(JSON.stringify({...r.j, setuju: null})), "profil tanpa wa/email/nip/kode/vektor");
  const lain = (await A("POST", `/api/petugas/panel/tautan/${(await U.DB.prepare("SELECT id FROM orang WHERE nama = 'Pegawai 01'").first()).id}`, {}, ADMIN)).j.tautan.split("#k=")[1];
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(lain))).j.orang.nama, "Pegawai 01");
});

uji("setuju: butuh kode dan x-pb, versi dan tipe divalidasi, setuju tercatat, cabut menghapus vektor dan menandai dihapus", async () => {
  const b = (o, h = K(KODE_BUDI, PB)) => U.api("POST", "/api/petugas/setuju", o, h);
  assert.equal((await b({versi: VERSI_SETUJU, setuju: true}, PB)).s, 401, "tanpa kode");
  assert.equal((await b({versi: VERSI_SETUJU, setuju: true}, K("0".repeat(26), PB))).s, 401, "kode salah");
  assert.equal((await b({versi: VERSI_SETUJU, setuju: true}, K(KODE_BUDI))).s, 403, "tanpa x-pb");
  assert.equal((await b({versi: "1999-01-01", setuju: true})).s, 400);
  for (const s of ["true", 1, null, undefined]) assert.equal((await b({versi: VERSI_SETUJU, setuju: s})).s, 400, String(s));
  assert.equal(await n("orang_setuju"), 0);
  const ok = await b({versi: VERSI_SETUJU, setuju: true}); assert.deepEqual(ok.j, {ok: true, setuju_versi: VERSI_SETUJU});
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(KODE_BUDI))).j.orang.setuju_versi, VERSI_SETUJU);
  /* anggap wajah sudah didaftarkan (LP-011 menyusul) lalu cabut */
  await U.DB.batch([U.DB.prepare("UPDATE orang SET wajah_status = 'terdaftar', wajah_versi = 'x' WHERE id = ?").bind(ID_BUDI),
    U.DB.prepare("INSERT INTO orang_wajah (orang_id, arah, vektor, versi, dibuat) VALUES (?, 'depan', 'AACAPwAAAAA=', 'x', 1)").bind(ID_BUDI)]);
  const cabut = await b({versi: VERSI_SETUJU, setuju: false}); assert.deepEqual(cabut.j, {ok: true, setuju_versi: null});
  assert.equal(await n("orang_wajah", `orang_id = '${ID_BUDI}'`), 0);
  const s = await U.api("GET", "/api/petugas/saya", undefined, K(KODE_BUDI));
  assert.equal(s.j.orang.wajah_status, "dihapus"); assert.equal(s.j.orang.setuju_versi, null);
  assert.equal(await n("orang_setuju", `orang_id = '${ID_BUDI}'`), 2, "riwayat persetujuan dan pencabutan tersimpan");
  /* orang yang belum pernah mendaftar wajah tetap 'belum' saat mencabut */
  const lain = (await A("POST", `/api/petugas/panel/tautan/${(await U.DB.prepare("SELECT id FROM orang WHERE nama = 'Pegawai 02'").first()).id}`, {}, ADMIN)).j.tautan.split("#k=")[1];
  await b({versi: VERSI_SETUJU, setuju: false}, K(lain, PB));
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(lain))).j.orang.wajah_status, "belum");
});

const formRelawan = {nama: "Relawan Lapangan", wa: "081277700001", email: "rl@contoh.id", prov: "62", kab: "Pulang Pisau", jalur: "umum", keahlian: ["medis"], hari_per_minggu: 3, maks_hari: 30, luar_provinsi: false, gol_darah: "O+", darurat_nama: "Ibu", darurat_wa: "081388800001", setuju: true};
uji("relawan: kode relawan ditolak sebelum diverifikasi, saat diverifikasi baris orang dibuat, kode yang sama dipakai; tautan memutar kode relawan", async () => {
  const d = await U.api("POST", "/api/relawan/daftar", formRelawan, {"cf-connecting-ip": "10.7.0.1"}); assert.equal(d.s, 201, d.t);
  const rid = (await U.DB.prepare("SELECT id FROM relawan WHERE nama = 'Relawan Lapangan'").first()).id;
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(d.j.kode))).s, 401, "belum diverifikasi");
  assert.equal(await n("orang", "jenis = 'relawan'"), 0);
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${rid}`, {aksi: "verifikasi"})).s, 200);
  assert.equal(await n("orang", `jenis = 'relawan' AND relawan_id = '${rid}'`), 1, "kait verifikasi membuat baris orang");
  const r = await U.api("GET", "/api/petugas/saya", undefined, K(d.j.kode));
  assert.equal(r.s, 200, r.t); assert.equal(r.j.orang.jenis, "relawan"); assert.equal(r.j.orang.nama, "Relawan Lapangan");
  assert.equal(await n("orang", `relawan_id = '${rid}'`), 1, "tidak menggandakan");
  const oid = r.j.orang.id;
  const t = await A("POST", `/api/petugas/panel/tautan/${oid}`, {}, ADMIN); assert.equal(t.j.antre, true);
  const baru = t.j.tautan.split("#k=")[1];
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(d.j.kode))).s, 401, "kode relawan lama mati");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(baru))).j.orang.id, oid);
  assert.equal((await U.api("GET", "/api/relawan/saya", undefined, K(baru))).s, 200, "satu kode untuk /relawan dan /lapangan");
  assert.equal((await U.api("GET", "/api/petugas/panel/orang?jenis=relawan", undefined, PIMPINAN)).j.total, 1);
  /* relawan yang kemudian dinonaktifkan kehilangan akses lapangan */
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${rid}`, {aksi: "nonaktifkan", alasan: "uji nonaktif"})).s, 200);
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(baru))).s, 401);
});

uji("dummy: hanya Super Admin dan x-pb; isi 3 orang beragam, kode pertama bekerja; hapus membersihkan semuanya", async () => {
  for (const h of [{}, MOD2, GERBANG, PIMPINAN]) { assert.equal((await A("POST", "/api/petugas/dummy", {}, h)).s, 403, JSON.stringify(h)); assert.equal((await A("DELETE", "/api/petugas/dummy", undefined, h)).s, 403, JSON.stringify(h)); }
  assert.equal((await U.api("POST", "/api/petugas/dummy", {}, ADMIN)).s, 403, "tanpa x-pb");
  assert.equal(await n("orang", "dummy = 1"), 0);
  const r = await A("POST", "/api/petugas/dummy", {}); assert.equal(r.s, 201, r.t);
  assert.equal(r.j.n, 3); assert.match(r.j.kode, /^[0-9a-f]{26}$/);
  assert.deepEqual((await U.DB.prepare("SELECT jenis, wajah_status FROM orang WHERE dummy = 1 ORDER BY nama").all()).results.map(x => x.jenis + ":" + x.wajah_status).sort(), ["pegawai:belum", "pegawai:terdaftar", "relawan:dihapus"]);
  assert.equal(await n("orang_wajah"), 5 + 0, "hanya yang terdaftar punya vektor dummy");
  const s = await U.api("GET", "/api/petugas/saya", undefined, K(r.j.kode)); assert.equal(s.s, 200); assert.equal(s.j.orang.wajah_status, "terdaftar"); assert.equal(s.j.orang.setuju_versi, VERSI_SETUJU);
  assert.ok(!s.t.includes("AACAPw"), "vektor tidak keluar");
  const lagi = await A("POST", "/api/petugas/dummy", {}); assert.equal(await n("orang", "dummy = 1"), 3, "isi ulang tidak menggandakan");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(r.j.kode))).s, 401, "kode dummy lama diganti");
  assert.equal((await U.api("GET", "/api/petugas/saya", undefined, K(lagi.j.kode))).s, 200);
  const nyata = await n("orang", "dummy = 0");
  const h = await A("DELETE", "/api/petugas/dummy"); assert.deepEqual(h.j, {ok: true, n: 3});
  assert.equal(await n("orang", "dummy = 1"), 0); assert.equal(await n("orang_wajah", `orang_id NOT IN (SELECT id FROM orang)`), 0); assert.equal(await n("orang_setuju", `orang_id NOT IN (SELECT id FROM orang)`), 0);
  assert.equal(await n("orang", "dummy = 0"), nyata, "data asli tidak tersentuh");
  assert.deepEqual((await A("DELETE", "/api/petugas/dummy")).j, {ok: true, n: 0});
});

uji("relawan cabut diri: salinan orang, wajah, persetujuan dan antrean WA ikut hilang", async () => {
  const d = await U.api("POST", "/api/relawan/daftar", {...formRelawan, nama: "Relawan Cabut", wa: "081299990001", email: "cabut@x.id"}, {"cf-connecting-ip": "10.7.0.9"}); assert.equal(d.s, 201, d.t);
  const rid = (await U.DB.prepare("SELECT id FROM relawan WHERE nama = 'Relawan Cabut'").first()).id;
  assert.equal((await U.adm("POST", `/api/relawan/admin/relawan/${rid}`, {aksi: "verifikasi"})).s, 200);
  const oid = (await U.DB.prepare("SELECT id FROM orang WHERE relawan_id = ?").bind(rid).first()).id;
  const t = await A("POST", `/api/petugas/panel/tautan/${oid}`, {}, ADMIN); const kode = t.j.tautan.split("#k=")[1];
  assert.equal((await A("POST", "/api/petugas/setuju", {versi: VERSI_SETUJU, setuju: true}, K(kode))).s, 200);
  assert.equal(await n("wa_antre", `rujukan = '${oid}'`), 1);
  const c = await U.api("POST", "/api/relawan/saya", {aksi: "cabut", konfirmasi: "HAPUS"}, K(kode)); assert.equal(c.s, 200, c.t);
  assert.equal(await n("orang", `relawan_id = '${rid}'`), 0); assert.equal(await n("orang_setuju", `orang_id = '${oid}'`), 0); assert.equal(await n("wa_antre", `rujukan = '${oid}'`), 0);
});
