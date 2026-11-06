/* Kemitraan Kampus KM-C03: masalah, kunjungan, jawaban, koreksi (src/kemitraan_masalah.js, src/kemitraan_hitung.js) di atas worker utuh (Miniflare), D1 lokal dan aset public/ sungguhan (TEST.md).
   Dijaga: ALUR_MASALAH identik dengan trigger km_masalah_alur (semua 72 pasangan dicoba ke D1); skor_bpbd/Jaccard/token sesuai ALG §3.4-§3.5 dan kamus.json;
   POST masalah: BP kab lain 403, kode tim_pendataan 403, AG/KK/PM/tamu ditolak, uraian 49 huruf 400, bahaya liar 400; BP tidak membaca masalah (KP §1: T saja); hak status/ambil/kunjungan hanya ST;
   jawaban: larik dengan satu butir salah ditolak SELURUHNYA (termasuk auto_id yang tak ada di profil: tidak ada masalah setengah jadi), kirim ulang tidak menambah baris (klien_id), BP di luar tim 403,
   BP tidak boleh mengirim auto_id dan tidak memajukan status masalah; konfirmasi hanya lewat ST; koreksi diputuskan sekali; laju: ajukan 60/jam, jawaban 300 permintaan dan 2000 butir/jam, koreksi 60/jam;
   BP melihat kunjungan/koreksi timnya saja (disaring sebelum LIMIT); pengaju dan kode_id tidak bocor ke PM/KK; teks bebas dibersihkan dari nomor HP dan tautan; hal/per liar 400.
   Jalankan: node --test tests/warga/kemitraan_masalah.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {siapkan, berantai, ADMIN, MOD2} from "./_bnpb.mjs";
import {AKAR, badanPanjang} from "./_bantu.mjs";
import {ALUR_MASALAH} from "../../src/kemitraan_masalah.js";
import {skorBpbd, jaccard, tokenTeks} from "../../src/kemitraan_hitung.js";
import "../../src/worker.js";

const U = await siapkan("uji-km-masalah", {r2: true}), uji = berantai();
const SAMA = {origin: "http://bnpb.lokal"}, PB = {"x-pb": "1"}, ST = {...MOD2, ...SAMA}, SA = {...ADMIN, ...SAMA};
let ipN = 0; const ip = () => ({"cf-connecting-ip": `10.8.${Math.floor(++ipN / 250)}.${ipN % 250}`});
const A = (m, j, b, h = {}) => U.api(m, j, b, {...ip(), ...h});
const baca = p => JSON.parse(readFileSync(`${AKAR}/${p}`, "utf8"));
const PDF = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\n"), ...Array(300).fill(65)]);
const URAIAN = "Genangan banjir sungai berulang tiap musim hujan dan merendam permukiman, penyebab lokalnya belum pernah dipetakan oleh siapa pun.";
const masalahOK = (o = {}) => ({bahaya: "banjir", aspek: "A1", judul: "Banjir berulang di sepanjang sungai", uraian: URAIAN, ...o});
const n = (t, w) => U.n(t, w);

/* ---------------- akun-akun uji ---------------- */
async function kodeBP(kab4 = "6211", st = ST) {
  const r = await A("POST", "/api/kemitraan/bpbd-kode", {kab4, nama: "Petugas BPBD Uji", berlaku_hari: 30}, st); assert.equal(r.s, 201, r.t);
  return {"x-kode": r.j.kode, ...SAMA};
}
let nStaf = 0;
async function stafBaru(peran) {
  const r = await A("POST", "/api/staf/admin/buat", {nama: "Staf Uji", nip: `1983${++nStaf}0012005`, unit: "Direktorat Uji", email: `pm${nStaf}@bnpb.go.id`, wa: "081234567890", peran, wilayah: []}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await A("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await A("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie, ...PB, ...SAMA};
}
async function kirimForm(jalur, data, bytes) {
  const f = new FormData(); f.append("data", JSON.stringify(data)); f.append("surat", new File([bytes], "surat.pdf", {type: "application/pdf"}));
  const {body, headers} = await badanPanjang(f);
  return U.mf.dispatchFetch("http://bnpb.lokal" + jalur, {method: "POST", headers: {...headers, ...ip()}, body});
}
async function kunciKK() {   // kampus aktif + KK bersandi, lewat rute sungguhan
  const d = {nama: "Universitas Masalah Uji Raya", singkatan: "UMU", jenis: "ptn", prov: "62", pic_nama: "Koordinator", pic_jabatan: "Dosen", pic_email: "kk-masalah@kampus.ac.id", pic_wa: "081270019999", setuju: true};
  assert.equal((await kirimForm("/api/kemitraan/daftar/kampus", d, PDF)).status, 201);
  const id = (await U.DB.prepare("SELECT id FROM institusi WHERE nama = ?").bind(d.nama).first()).id;
  const s = await A("POST", `/api/kemitraan/kampus/${id}`, {aksi: "setujui", peran: "mitra"}, ST); assert.equal(s.s, 200, s.t);
  assert.equal((await A("POST", "/api/kemitraan/atur-sandi", {token: s.j.token, sandi: "sandi-masalah-uji"}, SAMA)).s, 200);
  const m = await A("POST", "/api/kemitraan/masuk", {email: d.pic_email, sandi: "sandi-masalah-uji"}, SAMA); assert.equal(m.s, 200, m.t);
  return {cookie: m.h.get("set-cookie").split(";")[0], "x-km": "1", ...SAMA};
}

/* ---------------- fungsi murni ---------------- */
uji("hitung skorBpbd: ALG §3.4 (S_auto null = 0.5) dan kelas §3.2 (P1 bila S >= 0.70 atau H >= 0.80 dan K >= 0.60)", () => {
  const nol = {U: 0, C: 0, R: 0, J: 0}, tiga = {U: 3, C: 3, R: 3, J: 3};
  assert.deepEqual(skorBpbd(nol, null), {skor: 0.25, kelas: "P3"}, "tanpa S_auto dipakai 0.5");
  assert.deepEqual(skorBpbd(tiga, 0.4), {skor: 0.7, kelas: "P1"}, "tepat 0.70 = P1");
  assert.deepEqual(skorBpbd({U: 3, C: 3, R: 0, J: 0}, 0.5), {skor: 0.5, kelas: "P2"}, "tepat 0.50 = P2");
  assert.deepEqual(skorBpbd({U: 3, C: 3, R: 0, J: 0}, 0.4998), {skor: 0.4999, kelas: "P3"}, "0.4999 = P3");
  assert.deepEqual(skorBpbd({U: 3, C: 2, R: 1, J: 2}, 0.5575), {skor: 0.6121, kelas: "P2"}, "8/12 x 0.5 + 0.5575 x 0.5, 4 desimal");
  assert.equal(skorBpbd(nol, 0.2, {H: 0.85, K: 0.6}).kelas, "P1", "H >= 0.80 dan K >= 0.60 mengangkat ke P1 walau skor kecil");
  assert.equal(skorBpbd(nol, 0.2, {H: 0.85, K: 0.59}).kelas, "P3", "K 0.59 tidak cukup");
  assert.equal(skorBpbd(nol, 0.2, {H: 0.85, K: null}).kelas, "P3", "K null tidak mengangkat");
});
uji("hitung jaccard dan tokenTeks: himpunan, kosong 0, kata henti dan akhiran sama dengan kamus.json (paritas teks.py)", () => {
  assert.equal(jaccard(["a", "b"], ["b", "c"]), 0.3333); assert.equal(jaccard(["a", "a", "b"], ["b", "a"]), 1); assert.equal(jaccard([], []), 0); assert.equal(jaccard(["a"], ["b"]), 0);
  const k = baca("scripts/kemitraan/kamus.json"), akhiran = [...k.stem].sort((a, b) => b.length - a.length);   // sort stabil: terpanjang dulu, seperti teks.py
  const ref = w => { for (const a of akhiran) if (w.endsWith(a) && w.length - a.length >= 3) return w.slice(0, -a.length); return w; };
  for (const w of k.henti) assert.deepEqual(tokenTeks(w), [], `kata henti "${w}" harus dibuang`);
  const contoh = ["banjirs", "genangan", "pemetaannya", "memetakan", "flooding", "mitigated", "sungai", "desa", "rumahan"];
  assert.deepEqual(tokenTeks(contoh.join(" ")), contoh.map(ref));
  assert.deepEqual(tokenTeks("Banjir, dan Longsor di Desa X!"), ["banjir", "longsor", "desa"], "huruf kecil, tanda baca dan 1 huruf dibuang");
});
uji("ALUR_MASALAH sama persis dengan trigger km_masalah_alur: 72 pasangan status dicoba ke D1", async () => {
  const S = ["diajukan", "ditelaah", "tervalidasi", "digabung", "ditolak", "dicocokkan", "diambil", "berjalan", "selesai"];
  let i = 0;
  for (const a of S) for (const b of S) {
    if (a === b) continue;
    const id = (0x1000 + ++i).toString(16).padStart(16, "0");
    await U.DB.prepare("INSERT INTO km_masalah (id, kab4, prov, bahaya, aspek, sumber, judul, status, induk_id, pengaju, dibuat, diubah) VALUES (?, '6211', '62', 'banjir', 'A1', 'bpbd', 'Judul paritas', ?, '00000000000000aa', 'uji', 1, 1)").bind(id, a).run();
    let boleh = true; try { await U.DB.prepare("UPDATE km_masalah SET status = ? WHERE id = ?").bind(b, id).run(); } catch (e) { boleh = false; assert.match(String(e.message), /km_masalah_alur/, `${a}>${b} ditolak oleh hal lain`); }
    assert.equal(ALUR_MASALAH.has(`${a}>${b}`), boleh, `${a}>${b}: JS ${ALUR_MASALAH.has(`${a}>${b}`)} tetapi trigger ${boleh}`);
  }
  assert.equal(ALUR_MASALAH.size, 13);
  await U.DB.prepare("DELETE FROM km_masalah").run();
});

/* ---------------- ajukan masalah ---------------- */
let BP, BP2, PM, KK;
uji("POST masalah: BP kabnya 201 (sumber bpbd, diajukan, jejak ditulis); BP kab lain, AG/kode asing, KK, PM, tamu DITOLAK; masukan liar 400 tanpa baris", async () => {
  BP = await kodeBP("6211"); BP2 = await kodeBP("6212"); PM = await stafBaru(["pimpinan"]); KK = await kunciKK();
  const ok = await A("POST", "/api/kemitraan/masalah", masalahOK({kebutuhan: ["kajian", "tenaga"], dampak: "Rumah terendam", pernah: "Normalisasi sungai 2022"}), BP);
  assert.equal(ok.s, 201, ok.t); assert.match(ok.j.id, /^[0-9a-f]{16}$/);
  const r = await U.DB.prepare("SELECT * FROM km_masalah WHERE id = ?").bind(ok.j.id).first();
  assert.deepEqual([r.sumber, r.status, r.kab4, r.prov, r.bahaya, r.aspek], ["bpbd", "diajukan", "6211", "62", "banjir", "A1"]); assert.equal(r.kebutuhan, '["kajian","tenaga"]'); assert.match(r.pengaju, /^bp:/);
  assert.equal(await n("km_jejak", `tabel = 'km_masalah' AND baris = '${ok.j.id}' AND aksi = 'ajukan'`), 1);
  const ada = await n("km_masalah");
  const tolak = [
    ["BP kab lain", BP, masalahOK({kab4: "6212"}), 403], ["BP lain kab", BP2, masalahOK({kab4: "6211"}), 403],
    ["kode asing", {"x-kode": "a".repeat(26), ...SAMA}, masalahOK(), 403], ["KK", KK, masalahOK({kab4: "6211"}), 403], ["PM", PM, masalahOK({kab4: "6211"}), 403], ["tamu", SAMA, masalahOK({kab4: "6211"}), 401],
    ["uraian 49 huruf", BP, masalahOK({uraian: "x".repeat(49)}), 400], ["uraian tanpa", BP, masalahOK({uraian: undefined}), 400], ["uraian 2001", BP, masalahOK({uraian: "x".repeat(2001)}), 400],
    ["bahaya liar", BP, masalahOK({bahaya: "meteor"}), 400], ["aspek liar", BP, masalahOK({aspek: "A11"}), 400], ["judul 4 huruf", BP, masalahOK({judul: "abcd"}), 400], ["judul 121", BP, masalahOK({judul: "j".repeat(121)}), 400],
    ["kebutuhan liar", BP, masalahOK({kebutuhan: ["sihir"]}), 400], ["kebutuhan ganda", BP, masalahOK({kebutuhan: ["kajian", "kajian"]}), 400], ["dampak 1001", BP, masalahOK({dampak: "d".repeat(1001)}), 400],
    ["ST tanpa kab4", ST, masalahOK(), 400], ["ST kab4 liar", ST, masalahOK({kab4: "62AB"}), 400], ["ST kab4 tak dikenal", ST, masalahOK({kab4: "9999"}), 400], ["ST sumber otomatis", ST, masalahOK({kab4: "6211", sumber: "otomatis"}), 400]];
  for (const [nama, h, b, s] of tolak) assert.equal((await A("POST", "/api/kemitraan/masalah", b, h)).s, s, nama);
  assert.equal(await n("km_masalah"), ada, "penolakan tidak boleh menulis baris");
  const st = await A("POST", "/api/kemitraan/masalah", masalahOK({kab4: "6212", judul: "Longsor tebing jalan desa", bahaya: "longsor"}), ST); assert.equal(st.s, 201, st.t);
  assert.equal((await U.DB.prepare("SELECT sumber s FROM km_masalah WHERE id = ?").bind(st.j.id).first()).s, "unit");
});
uji("GET masalah: ST, PM, KK membaca; BP TIDAK membaca (KP §1: T saja); pengaju hanya untuk staf; tamu 401; filter dan hal/per liar 400; paginasi", async () => {
  const semua = await A("GET", "/api/kemitraan/masalah", undefined, ST); assert.equal(semua.s, 200, semua.t); assert.equal(semua.j.total, 2);
  assert.ok(semua.j.masalah.every(m => Array.isArray(m.kebutuhan) || m.kebutuhan === null) && !("dummy" in semua.j.masalah[0]));
  assert.ok(semua.j.masalah.every(m => m.pengaju), "staf melihat pengaju");
  for (const [nama, h] of [["PM", PM], ["KK", KK]]) { const r = await A("GET", "/api/kemitraan/masalah", undefined, h); assert.equal(r.j?.total, 2, nama); assert.ok(r.j.masalah.every(m => !("pengaju" in m)), nama + " tanpa pengaju"); }
  for (const q of ["", "?kab4=6211", "?kab4=6212"]) assert.equal((await A("GET", "/api/kemitraan/masalah" + q, undefined, BP)).s, 403, "BP tidak membaca masalah " + q);
  assert.equal((await A("GET", "/api/kemitraan/masalah", undefined, SAMA)).s, 401);
  for (const q of ["status=terbang", "b=meteor", "a=A99", "kelas=P9", "sumber=gaib", "kab4=62AB", "prov=6"]) assert.equal((await A("GET", `/api/kemitraan/masalah?${q}`, undefined, ST)).s, 400, q);
  for (const q of ["hal=1e400", "hal=10001", "hal=0", "hal=1.5", "hal=abc", "per=1.5", "per=0", "per=1e400"]) assert.equal((await A("GET", `/api/kemitraan/masalah?${q}`, undefined, ST)).s, 400, q);
  assert.equal((await A("GET", "/api/kemitraan/masalah?hal=10000", undefined, ST)).s, 200, "batas atas hal sah");
  assert.equal((await A("GET", "/api/kemitraan/masalah?b=longsor&status=diajukan", undefined, ST)).j.total, 1);
  const hal = await A("GET", "/api/kemitraan/masalah?per=1&hal=2", undefined, ST); assert.equal(hal.j.masalah.length, 1); assert.equal(hal.j.total, 2);
});

/* ---------------- status, nilai, gabung ---------------- */
let M1, M2, M3;
uji("POST masalah/:id/status: hanya ST; ALUR_MASALAH dijaga (409); tervalidasi wajib nilai U,C,R,J 0-3 dan skor dihitung dari profil daerah; tolak wajib alasan; jejak ditulis", async () => {
  const id = async (judul, o = {}) => (await A("POST", "/api/kemitraan/masalah", masalahOK({judul, ...o}), BP)).j.id;
  M1 = (await U.DB.prepare("SELECT id FROM km_masalah WHERE kab4 = '6211'").first()).id; M2 = await id("Banjir sungai berulang tiap musim hujan"); M3 = await id("Gempa bumi merusak bangunan sekolah", {bahaya: "gempa", aspek: "A3"});
  const S = (mid, b, h = ST) => A("POST", `/api/kemitraan/masalah/${mid}/status`, b, h);
  for (const [nama, h, s] of [["BP", BP, 403], ["PM", PM, 403], ["KK", KK, 403], ["tamu", SAMA, 401]]) assert.equal((await S(M1, {ke: "ditelaah"}, h)).s, s, nama);
  assert.equal((await S(M1, {ke: "selesai"})).s, 400, "selesai bukan urusan rute ini"); assert.equal((await S(M1, {ke: "dicocokkan"})).s, 400); assert.equal((await S(M1, {})).s, 400);
  assert.equal((await S("0123456789abcdef", {ke: "ditelaah"})).s, 404);
  assert.equal((await S(M1, {ke: "ditelaah"})).s, 200);
  assert.equal((await S(M1, {ke: "ditelaah"})).s, 409, "ditelaah>ditelaah"); assert.equal((await S(M3, {ke: "tervalidasi", nilai: {U: 1, C: 1, R: 1, J: 1}})).s, 200);
  for (const nilai of [undefined, {U: 3, C: 3, R: 3}, {U: 4, C: 0, R: 0, J: 0}, {U: -1, C: 0, R: 0, J: 0}, {U: 1.5, C: 0, R: 0, J: 0}, {U: "3", C: 0, R: 0, J: 0}, {U: 1, C: 1, R: 1, J: 1, X: 1}, [3, 3, 3, 3]])
    assert.equal((await S(M1, {ke: "tervalidasi", nilai})).s, 400, JSON.stringify(nilai));
  assert.equal((await S(M1, {ke: "ditolak", nilai: {U: 1, C: 1, R: 1, J: 1}, alasan: "alasan cukup"})).s, 400, "nilai hanya untuk tervalidasi");
  const v = await S(M1, {ke: "tervalidasi", nilai: {U: 3, C: 2, R: 1, J: 2}}); assert.equal(v.s, 200, v.t);
  const pr = baca("public/data/kemitraan/daerah/6211.json").masalah_skor.banjir, wajar = skorBpbd({U: 3, C: 2, R: 1, J: 2}, pr.skor, {H: pr.H, K: pr.K});
  assert.deepEqual([v.j.skor, v.j.kelas], [wajar.skor, wajar.kelas]); assert.equal(v.j.skor, 0.6121, "profil 6211 banjir S_auto 0.5575");
  const r = await U.DB.prepare("SELECT status, skor, kelas, nilai FROM km_masalah WHERE id = ?").bind(M1).first(); assert.deepEqual([r.status, r.skor, r.kelas, r.nilai], ["tervalidasi", 0.6121, "P2", '{"U":3,"C":2,"R":1,"J":2}']);
  assert.equal((await S(M1, {ke: "ditelaah"})).s, 409, "tervalidasi>ditelaah tidak sah");
  assert.equal((await S(M2, {ke: "ditolak"})).s, 400, "tolak tanpa alasan"); assert.equal((await S(M2, {ke: "ditolak", alasan: "abc"})).s, 400, "alasan 3 huruf");
  assert.equal((await S(M2, {ke: "ditolak", alasan: "Duplikat laporan lama"})).s, 200); assert.equal((await S(M2, {ke: "ditelaah"})).s, 200, "ditolak>ditelaah boleh");
  assert.equal(await n("km_jejak", `tabel = 'km_masalah' AND baris = '${M1}' AND aksi = 'status'`), 2);
  const j = await U.DB.prepare("SELECT dari, ke FROM km_jejak WHERE baris = ? AND aksi = 'status' ORDER BY id DESC").bind(M1).first(); assert.deepEqual([j.dari, j.ke], ["ditelaah", "tervalidasi"]);
});
uji("saran gabung dan penggabungan: Jaccard >= 0.5 sekategori; induk harus sekategori, hidup, bukan diri sendiri; digabung tanpa induk 400", async () => {
  const sar = await A("GET", `/api/kemitraan/masalah/${M2}/saran-gabung`, undefined, ST); assert.equal(sar.s, 200, sar.t);
  assert.deepEqual(sar.j.saran.map(s => s.id), [M1], "hanya sekategori dengan kemiripan >= 0.5 (M3 gempa tidak)"); assert.ok(sar.j.saran[0].jaccard >= 0.5);
  for (const [nama, h] of [["BP", BP], ["PM", PM], ["KK", KK]]) assert.equal((await A("GET", `/api/kemitraan/masalah/${M2}/saran-gabung`, undefined, h)).s, 403, nama);
  const G = (mid, b) => A("POST", `/api/kemitraan/masalah/${mid}/status`, {ke: "digabung", ...b}, ST);
  assert.equal((await G(M2, {})).s, 400, "tanpa induk"); assert.equal((await G(M2, {induk_id: "xyz"})).s, 400); assert.equal((await G(M2, {induk_id: M2})).s, 400, "diri sendiri");
  assert.equal((await G(M2, {induk_id: M3})).s, 409, "beda kategori"); assert.equal((await G(M2, {induk_id: "0123456789abcdef"})).s, 404);
  assert.equal((await G(M2, {induk_id: M1})).s, 200); const r = await U.DB.prepare("SELECT status, induk_id FROM km_masalah WHERE id = ?").bind(M2).first(); assert.deepEqual([r.status, r.induk_id], ["digabung", M1]);
  const M4 = (await A("POST", "/api/kemitraan/masalah", masalahOK({judul: "Banjir sungai berulang tiap musim hujan lagi"}), BP)).j.id;
  assert.equal((await G(M4, {induk_id: M2})).s, 409, "induk yang sudah digabung ditolak");
  assert.equal((await A("POST", `/api/kemitraan/masalah/${M4}/status`, {ke: "ditelaah", induk_id: M1}, ST)).s, 400, "induk_id hanya untuk digabung");
});

/* ---------------- ambil masalah otomatis ---------------- */
uji("POST masalah/ambil: ST saja; membekukan bukti dari profil daerah; kedua kali 409; auto_id liar 400, tak ada di profil 404", async () => {
  const auto = baca("public/data/kemitraan/daerah/6211.json").masalah.find(m => m.auto_id === "auto-6211-banjir-A1");
  const P = (b, h = ST) => A("POST", "/api/kemitraan/masalah/ambil", b, h);
  for (const [nama, h, s] of [["BP", BP, 403], ["PM", PM, 403], ["KK", KK, 403], ["tamu", SAMA, 401]]) assert.equal((await P({auto_id: "auto-6211-banjir-A1"}, h)).s, s, nama);
  for (const a of ["auto-6211-banjir", "auto-62AB-banjir-A1", "../etc", 7, undefined]) assert.equal((await P({auto_id: a})).s, 400, String(a));
  assert.equal((await P({auto_id: "auto-6211-banjir-A7"})).s, 404, "bukan masalah di profil"); assert.equal((await P({auto_id: "auto-9999-banjir-A1"})).s, 404, "profil tak ada");
  assert.equal(await n("km_masalah", "sumber = 'otomatis'"), 0);
  const r = await P({auto_id: "auto-6211-banjir-A1"}); assert.equal(r.s, 201, r.t);
  const b = await U.DB.prepare("SELECT * FROM km_masalah WHERE id = ?").bind(r.j.id).first();
  assert.deepEqual([b.sumber, b.status, b.auto_id, b.kab4, b.prov, b.bahaya, b.aspek, b.judul, b.skor, b.kelas], ["otomatis", "ditelaah", "auto-6211-banjir-A1", "6211", "62", "banjir", "A1", auto.judul, auto.skor, auto.kelas]);
  assert.deepEqual(JSON.parse(b.bukti), auto.bukti, "bukti = salinan beku isi profil");
  assert.equal((await P({auto_id: "auto-6211-banjir-A1"})).s, 409); assert.equal(await n("km_masalah", "auto_id = 'auto-6211-banjir-A1'"), 1);
  assert.equal(await n("km_jejak", `baris = '${r.j.id}' AND aksi = 'ambil'`), 1);
  /* aspek hanya A1..A10: A11 dan A0 ditolak format, A10 sah format (tak ada di profil = 404) */
  assert.equal((await P({auto_id: "auto-6211-banjir-A11"})).s, 400, "A11"); assert.equal((await P({auto_id: "auto-6211-banjir-A0"})).s, 400, "A0"); assert.equal((await P({auto_id: "auto-6211-banjir-A10"})).s, 404, "A10 sah format");
});

/* ---------------- kunjungan ---------------- */
let K, TIM, TIM_LAIN;
const kunj = (o = {}) => ({kab4: "6211", tanggal: "2026-11-20", narasumber: ["bpbd", "kades"], tim: [{nama: "Petugas Staf"}, {nama: "Dosen Lapangan", lapangan: true}], ...o});
uji("POST kunjungan: hanya ST; tim non-staf mendapat kode tim_pendataan (tampil sekali, hanya sha di D1); masukan liar 400; status rencana>berjalan>selesai, lompat 409", async () => {
  for (const [nama, h, s] of [["BP", BP, 403], ["PM", PM, 403], ["KK", KK, 403], ["tamu", SAMA, 401]]) assert.equal((await A("POST", "/api/kemitraan/kunjungan", kunj(), h)).s, s, nama);
  const buruk = [{tanggal: "2026-02-30"}, {tanggal: "20-11-2026"}, {narasumber: []}, {narasumber: ["bpbd", "bpbd"]}, {narasumber: ["tuhan"]}, {kab4: "62AB"}, {kab4: "9999"}, {tim: []}, {tim: Array.from({length: 13}, (_, i) => ({nama: "Orang " + i}))}, {tim: [{nama: "x"}]}, {tim: ["Budi"]}];
  for (const o of buruk) assert.equal((await A("POST", "/api/kemitraan/kunjungan", kunj(o), ST)).s, 400, JSON.stringify(o).slice(0, 60));
  assert.equal(await n("km_kunjungan"), 0); assert.equal(await n("km_bpbd_kode", "jenis = 'tim_pendataan'"), 0);
  const r = await A("POST", "/api/kemitraan/kunjungan", kunj(), ST); assert.equal(r.s, 201, r.t); K = r.j.id;
  assert.equal(r.j.tim_kode.length, 1); TIM = {"x-kode": r.j.tim_kode[0].kode, ...SAMA}; assert.match(r.j.tim_kode[0].kode, /^[0-9a-f]{26}$/); assert.match(r.j.tim_kode[0].tautan, /\/kemitraan\/saya#k=/);
  const kd = await U.DB.prepare("SELECT * FROM km_bpbd_kode WHERE jenis = 'tim_pendataan'").first(); assert.ok(!JSON.stringify(kd).includes(r.j.tim_kode[0].kode), "kode mentah tidak disimpan"); assert.equal(kd.kab4, "6211");
  assert.ok(kd.berlaku - Date.now() < 14 * 86400e3 + 5000 && kd.berlaku - Date.now() > 13 * 86400e3);
  const tersimpan = JSON.parse((await U.DB.prepare("SELECT tim FROM km_kunjungan WHERE id = ?").bind(K).first()).tim); assert.deepEqual(tersimpan.map(t => [t.nama, !!t.kode_id]), [["Petugas Staf", false], ["Dosen Lapangan", true]]);
  const lain = await A("POST", "/api/kemitraan/kunjungan", kunj({kab4: "6212", tim: [{nama: "Tim Lain", lapangan: true}]}), ST); assert.equal(lain.s, 201); TIM_LAIN = {"x-kode": lain.j.tim_kode[0].kode, ...SAMA};
  const S = (b, h = ST) => A("POST", `/api/kemitraan/kunjungan/${K}/status`, b, h);
  for (const [nama, h, s] of [["BP", TIM, 403], ["PM", PM, 403], ["tamu", SAMA, 401]]) assert.equal((await S({ke: "berjalan"}, h)).s, s, nama);
  assert.equal((await S({ke: "selesai"})).s, 409, "rencana>selesai"); assert.equal((await S({ke: "rencana"})).s, 400); assert.equal((await A("POST", "/api/kemitraan/kunjungan/0123456789abcdef/status", {ke: "berjalan"}, ST)).s, 404);
  const jwb = await A("POST", `/api/kemitraan/kunjungan/${K}/jawaban`, {jawaban: [{klien_id: "klien-0001", narasumber: "bpbd", templat_id: "1u-03", teks: "Sungai meluap"}]}, TIM); assert.equal(jwb.s, 409, "belum dimulai");
  assert.equal(await n("km_jawaban"), 0);
});
uji("GET kunjungan: ST dan PM semua; BP hanya yang timnya memuat kodenya (kunjungan lain dan kode BPBD biasa tidak); kode_id tidak bocor ke selain staf", async () => {
  const st = await A("GET", "/api/kemitraan/kunjungan", undefined, ST); assert.equal(st.j.kunjungan.length, 2); assert.equal(st.j.total, 2);
  const pm = await A("GET", "/api/kemitraan/kunjungan", undefined, PM); assert.equal(pm.j.kunjungan.length, 2); assert.ok(!pm.t.includes("kode_id"), "PM tanpa kode_id");
  const t = await A("GET", "/api/kemitraan/kunjungan", undefined, TIM); assert.deepEqual(t.j.kunjungan.map(k => k.id), [K]); assert.ok(!JSON.stringify(t.j).includes("kode_id")); assert.equal(t.j.total, 1);
  assert.equal((await A("GET", "/api/kemitraan/kunjungan", undefined, BP)).j.kunjungan.length, 0, "BPBD biasa bukan anggota tim");
  assert.equal((await A("GET", "/api/kemitraan/kunjungan?kab4=6212", undefined, TIM)).s, 403); assert.equal((await A("GET", "/api/kemitraan/kunjungan", undefined, KK)).s, 403);
  assert.equal((await A("GET", "/api/kemitraan/kunjungan?status=x", undefined, ST)).s, 400); assert.equal((await A("GET", "/api/kemitraan/kunjungan", undefined, SAMA)).s, 401);
  assert.equal((await A("GET", "/api/kemitraan/kunjungan?hal=1e400", undefined, ST)).s, 400, "hal=1e400");
  assert.equal((await A("POST", `/api/kemitraan/kunjungan/${K}/status`, {ke: "berjalan"}, ST)).s, 200);
});
uji("GET kunjungan BP: tim disaring di SQL SEBELUM LIMIT (kunjungan BP di halaman 2 tetap muncul), total benar", async () => {
  const kid = JSON.parse((await U.DB.prepare("SELECT tim FROM km_kunjungan WHERE id = ?").bind(K).first()).tim).find(t => t.kode_id).kode_id;
  const ins = (id, tgl, tim) => U.DB.prepare("INSERT INTO km_kunjungan (id, kab4, tanggal, tim, narasumber, status, dibuat, diubah, oleh) VALUES (?, '6211', ?, ?, '[\"bpbd\"]', 'selesai', 1, 1, 'uji')").bind(id, tgl, tim).run();
  const lain = '[{"nama":"Orang Lain","kode_id":null}]', milik = `[{"nama":"Dosen","kode_id":"${kid}"}]`;
  for (let i = 1; i <= 5; i++) await ins("aaaa00000000000" + i, `2027-01-0${i}`, lain);   // lebih baru, bukan milik BP: akan memenuhi halaman 1 bila disaring sesudah LIMIT
  await ins("bbbb000000000001", "2026-10-01", milik); await ins("bbbb000000000002", "2026-10-02", milik);
  const ids = []; let total = 0;
  for (const hal of [1, 2, 3, 4]) { const r = await A("GET", `/api/kemitraan/kunjungan?per=1&hal=${hal}`, undefined, TIM); assert.equal(r.s, 200, r.t); ids.push(...r.j.kunjungan.map(k => k.id)); total = r.j.total; }
  assert.deepEqual(ids, [K, "bbbb000000000002", "bbbb000000000001"], "urut tanggal turun; halaman 4 kosong"); assert.equal(total, 3);
  await U.DB.prepare("DELETE FROM km_kunjungan WHERE id LIKE 'aaaa%' OR id LIKE 'bbbb%'").run();
});

/* ---------------- jawaban ---------------- */
let AUTO_M;
const J = (i, o = {}) => ({klien_id: `klien-${String(i).padStart(4, "0")}`, narasumber: "bpbd", templat_id: "1u-03", teks: "Sungai meluap tiap Januari", ...o});
const KIRIM = (b, h = TIM, kid = K) => A("POST", `/api/kemitraan/kunjungan/${kid}/jawaban`, b, h);
uji("jawaban: idempoten per klien_id (kirim ulang tidak menambah baris); satu butir salah menolak SELURUH larik; batas 100; BP di luar tim, PM, KK, tamu DITOLAK", async () => {
  const tiga = [J(1), J(2, {templat_id: "1u-04", pilihan: "ya"}), J(3, {narasumber: "kades", angka: 12.5, teks: undefined})];
  const a = await KIRIM({jawaban: tiga}); assert.equal(a.s, 200, a.t); assert.deepEqual([a.j.diterima, a.j.duplikat], [3, 0]); assert.equal(await n("km_jawaban"), 3);
  const b = await KIRIM({jawaban: tiga}); assert.deepEqual([b.j.diterima, b.j.duplikat], [0, 3]); assert.equal(await n("km_jawaban"), 3, "kirim ulang larik sama tetap 3 baris");
  const c = await KIRIM({jawaban: [J(3), J(4)]}); assert.deepEqual([c.j.diterima, c.j.duplikat], [1, 1]); assert.equal(await n("km_jawaban"), 4);
  const ubah = await KIRIM({jawaban: [J(1, {teks: "ISI BEDA"})]}); assert.equal(ubah.j.duplikat, 1); assert.equal((await U.DB.prepare("SELECT teks FROM km_jawaban WHERE klien_id = 'klien-0001'").first()).teks, "Sungai meluap tiap Januari", "klien_id sama tidak menimpa");
  const sebelum = await n("km_jawaban");
  const salah = [["pilihan liar", J(9, {pilihan: "mungkin"})], ["narasumber liar", J(9, {narasumber: "dukun"})], ["klien_id pendek", J(9, {klien_id: "abc"})], ["klien_id spasi", J(9, {klien_id: "klien 0009 x"})], ["kosong", {klien_id: "klien-0009", narasumber: "bpbd", templat_id: "1u-03"}],
    ["teks 3001", J(9, {teks: "x".repeat(3001)})], ["angka teks", J(9, {angka: "12"})], ["angka NaN", J(9, {angka: null, teks: null})], ["masalah_id liar", J(9, {masalah_id: "xyz"})], ["auto_id liar", J(9, {auto_id: "bebas"})], ["templat kosong", J(9, {templat_id: ""})], ["bukan objek", "teks"]];
  for (const [nama, j] of salah) { const r = await KIRIM({jawaban: [J(10), j]}); assert.equal(r.s, 400, nama); }
  assert.equal(await n("km_jawaban"), sebelum, "butir benar di samping butir salah juga TIDAK tersimpan");
  assert.equal((await KIRIM({jawaban: []})).s, 400); assert.equal((await KIRIM({})).s, 400); assert.equal((await KIRIM({jawaban: Array.from({length: 101}, (_, i) => J(200 + i))})).s, 400, "101 butir");
  assert.equal((await KIRIM({jawaban: Array.from({length: 100}, (_, i) => J(300 + i))})).j.diterima, 100, "tepat 100 butir diterima");
  assert.equal((await KIRIM({jawaban: [J(1)]}, BP)).s, 403, "BPBD biasa bukan tim"); assert.equal((await KIRIM({jawaban: [J(1)]}, TIM_LAIN)).s, 403, "tim kunjungan lain");
  for (const [nama, h, s] of [["PM", PM, 403], ["KK", KK, 403], ["tamu", SAMA, 401], ["kode asing", {"x-kode": "b".repeat(26), ...SAMA}, 403]]) assert.equal((await KIRIM({jawaban: [J(1)]}, h)).s, s, nama);
  assert.equal((await KIRIM({jawaban: [J(1)]}, ST, "0123456789abcdef")).s, 404);
  assert.equal(await n("km_jejak", `tabel = 'km_kunjungan' AND baris = '${K}' AND aksi = 'jawaban'`), 3, "jejak hanya untuk kiriman yang menambah baris");
});
uji("jawaban merujuk masalah: masalah_id harus sekabupaten; auto_id hanya dari ST (BP 400); konfirmasi hanya lewat ST, jawaban BP terlambat tidak mengubah status", async () => {
  const KS = (b, kid = K) => KIRIM(b, ST, kid);
  const lain = (await A("POST", "/api/kemitraan/masalah", masalahOK({kab4: "6212", judul: "Masalah kabupaten lain"}), ST)).j.id;
  assert.equal((await KIRIM({jawaban: [J(20, {masalah_id: lain})]})).s, 400, "masalah kab lain");
  assert.equal((await KIRIM({jawaban: [J(20, {masalah_id: "0123456789abcdef"})]})).s, 400, "masalah tak ada");
  assert.equal((await KS({jawaban: [J(20, {auto_id: "auto-6212-banjir-A1"})]})).s, 400, "auto_id kab lain");
  assert.equal((await KS({jawaban: [J(20, {masalah_id: M1, auto_id: "auto-6211-karhutla-A2"})]})).s, 400, "auto_id tak cocok masalah_id");
  const sebelum = await n("km_masalah");
  const ditelaah = async id => U.DB.prepare("UPDATE km_masalah SET status = 'ditelaah' WHERE id = ?").bind(id).run();
  const MA = (await A("POST", "/api/kemitraan/masalah", masalahOK({judul: "Banjir untuk konfirmasi ya"}), BP)).j.id, MB = (await A("POST", "/api/kemitraan/masalah", masalahOK({judul: "Banjir untuk konfirmasi tidak"}), BP)).j.id, MC = (await A("POST", "/api/kemitraan/masalah", masalahOK({judul: "Banjir jawaban non konfirmasi"}), BP)).j.id;
  for (const id of [MA, MB, MC]) await ditelaah(id);
  const r = await KS({jawaban: [J(21, {auto_id: "auto-6211-banjir-A2", templat_id: "1u-03", teks: "Ada"}), J(22, {auto_id: "auto-6211-banjir-A2", templat_id: "1u-04", teks: "Ada lagi"}),
    J(23, {masalah_id: MA, templat_id: "1u-01", pilihan: "ya", teks: null}), J(24, {masalah_id: MB, templat_id: "1u-01", pilihan: "tidak", teks: null}), J(25, {masalah_id: MC, templat_id: "1u-03", pilihan: "ya", teks: null})]});
  assert.equal(r.s, 200, r.t); assert.equal(await n("km_masalah"), sebelum + 3 + 1, "tepat satu masalah otomatis baru (dua jawaban, satu auto_id)");
  AUTO_M = (await U.DB.prepare("SELECT id, status, sumber FROM km_masalah WHERE auto_id = 'auto-6211-banjir-A2'").first()); assert.deepEqual([AUTO_M.status, AUTO_M.sumber], ["ditelaah", "otomatis"]);
  assert.equal(await n("km_jawaban", `masalah_id = '${AUTO_M.id}'`), 2, "jawaban ber-auto_id tertaut ke masalah yang diambil");
  const st = id => U.DB.prepare("SELECT status s FROM km_masalah WHERE id = ?").bind(id).first().then(x => x.s);
  assert.deepEqual([await st(MA), await st(MB), await st(MC)], ["ditelaah", "ditelaah", "ditelaah"], "belum selesai: belum ada yang naik");
  const sel = await A("POST", `/api/kemitraan/kunjungan/${K}/status`, {ke: "selesai"}, ST); assert.equal(sel.s, 200, sel.t); assert.deepEqual(sel.j.tervalidasi, [MA]);
  assert.deepEqual([await st(MA), await st(MB), await st(MC)], ["tervalidasi", "ditelaah", "ditelaah"], "ya di pertanyaan konfirmasi naik; tidak dan non-konfirmasi tidak");
  assert.equal(await st(M3), "tervalidasi"); assert.equal(await st(AUTO_M.id), "ditelaah");
  assert.equal(await n("km_jejak", `baris = '${MA}' AND aksi = 'status' AND ke = 'tervalidasi'`), 1);
  /* kiriman BP terlambat (antrean luring) sesudah selesai: tersimpan, TIDAK mengubah status; kiriman ST terlambat boleh mengonfirmasi */
  const telat = await KIRIM({jawaban: [J(26, {masalah_id: MB, templat_id: "1u-02", pilihan: "sebagian", teks: null})]}); assert.equal(telat.s, 200, telat.t); assert.deepEqual(telat.j.tervalidasi, []); assert.equal(await st(MB), "ditelaah", "BP tidak memajukan status");
  assert.equal(await n("km_jawaban", "klien_id = 'klien-0026'"), 1, "jawaban BP terlambat tetap tersimpan");
  const telatST = await KS({jawaban: [J(28, {masalah_id: MB, templat_id: "1u-02", pilihan: "sebagian", teks: null})]}); assert.equal(telatST.s, 200, telatST.t); assert.deepEqual(telatST.j.tervalidasi, [MB]); assert.equal(await st(MB), "tervalidasi");
  const batal = await A("POST", "/api/kemitraan/kunjungan", kunj(), ST), B = batal.j.id; assert.equal((await A("POST", `/api/kemitraan/kunjungan/${B}/status`, {ke: "batal"}, ST)).s, 200);
  assert.equal((await KS({jawaban: [J(27)]}, B)).s, 409, "kunjungan batal tidak menerima jawaban"); assert.equal((await A("POST", `/api/kemitraan/kunjungan/${B}/status`, {ke: "berjalan"}, ST)).s, 409, "batal final");
});
uji("BP: kode tim_pendataan tidak mengajukan masalah; BP tidak mengirim auto_id; auto_id tak ada di profil menolak SELURUH kiriman (tanpa masalah setengah jadi); teks bebas dibersihkan", async () => {
  const masalah = await n("km_masalah"), jawaban = await n("km_jawaban");
  assert.equal((await A("POST", "/api/kemitraan/masalah", masalahOK({kab4: "6211"}), TIM)).s, 403, "tim_pendataan tidak mengajukan masalah");
  const bp = await KIRIM({jawaban: [J(50, {auto_id: "auto-6211-karhutla-A2"})]}); assert.equal(bp.s, 400, bp.t);
  assert.equal(await n("km_masalah"), masalah); assert.equal(await n("km_jawaban"), jawaban, "BP + auto_id: tidak ada yang ditulis");
  const sebagian = await KIRIM({jawaban: [J(51, {auto_id: "auto-6211-banjir-A9"}), J(52, {auto_id: "auto-6211-banjir-A7"})]}, ST);   // A9 ada di profil, A7 tidak
  assert.equal(sebagian.s, 400, sebagian.t); assert.equal(await n("km_masalah"), masalah, "A9 yang valid TIDAK boleh sempat diambil"); assert.equal(await n("km_jawaban"), jawaban);
  const kotor = await A("POST", "/api/kemitraan/masalah", masalahOK({uraian: URAIAN + " Hubungi 081234567890 atau buka http://contoh.example/laporan sekarang"}), BP); assert.equal(kotor.s, 201, kotor.t);
  const u = (await U.DB.prepare("SELECT uraian FROM km_masalah WHERE id = ?").bind(kotor.j.id).first()).uraian;
  assert.ok(u.includes("[nomor dihapus]") && u.includes("[tautan dihapus]") && !u.includes("081234567890") && !u.includes("contoh.example"), u);
  assert.equal((await KIRIM({jawaban: [J(53, {teks: "Telepon 081234567891 atau https://situs.example/x"})]})).s, 200);
  const t = (await U.DB.prepare("SELECT teks FROM km_jawaban WHERE klien_id = 'klien-0053'").first()).teks; assert.ok(t.includes("[nomor dihapus]") && t.includes("[tautan dihapus]") && !t.includes("081234567891"), t);
  assert.equal((await A("POST", "/api/kemitraan/masalah", masalahOK({uraian: "spam " + "!".repeat(20) + URAIAN}), BP)).s, 400, "karakter berulang (spam) ditolak");
});

/* ---------------- koreksi ---------------- */
uji("koreksi: BP-tim lewat kunjungannya (kab dari kunjungan); BP tanpa kunjungan 400, di luar tim 403; ST diputuskan sekali (409), peran lain 403; masukan liar 400", async () => {
  const K1 = (b, h = TIM) => A("POST", "/api/kemitraan/koreksi", b, h), dasar = {jalur: "penduduk.total", lama: "1.234", baru: "1.500", sumber: "Data Dukcapil kab 2026"};
  const ok = await K1({...dasar, kunjungan_id: K}); assert.equal(ok.s, 201, ok.t);
  const r = await U.DB.prepare("SELECT * FROM km_koreksi WHERE id = ?").bind(ok.j.id).first(); assert.deepEqual([r.kab4, r.status, r.kunjungan_id, r.jalur], ["6211", "menunggu", K, "penduduk.total"]); assert.equal(await n("km_jejak", `tabel = 'km_koreksi' AND baris = '${ok.j.id}' AND aksi = 'ajukan'`), 1);
  const ada = await n("km_koreksi");
  const tolak = [["tanpa kunjungan_id", TIM, dasar, 400], ["BPBD biasa di luar tim", BP, {...dasar, kunjungan_id: K}, 403], ["tim kunjungan lain", TIM_LAIN, {...dasar, kunjungan_id: K}, 403], ["KK", KK, {...dasar, kab4: "6211"}, 403], ["PM", PM, {...dasar, kab4: "6211"}, 403], ["tamu", SAMA, {...dasar, kab4: "6211"}, 401],
    ["kab4 beda dari kunjungan", ST, {...dasar, kunjungan_id: K, kab4: "6212"}, 400], ["ST tanpa kab4", ST, dasar, 400], ["jalur spasi", ST, {...dasar, kab4: "6211", jalur: "a b"}, 400], ["jalur pendek", ST, {...dasar, kab4: "6211", jalur: "ab"}, 400], ["baru kosong", ST, {...dasar, kab4: "6211", baru: ""}, 400],
    ["baru 201", ST, {...dasar, kab4: "6211", baru: "9".repeat(201)}, 400], ["sumber 2 huruf", ST, {...dasar, kab4: "6211", sumber: "ab"}, 400], ["kunjungan tak ada", ST, {...dasar, kunjungan_id: "0123456789abcdef"}, 404], ["kunjungan_id liar", ST, {...dasar, kunjungan_id: "zz"}, 400]];
  for (const [nama, h, b, s] of tolak) assert.equal((await K1(b, h)).s, s, nama);
  assert.equal(await n("km_koreksi"), ada, "penolakan tidak menulis baris");
  const st = await K1({...dasar, kab4: "6211", jalur: "sosek.miskin_pct"}, ST); assert.equal(st.s, 201, st.t);
  const P = (id, b, h = ST) => A("POST", `/api/kemitraan/koreksi/${id}`, b, h);
  for (const [nama, h, s] of [["BP", TIM, 403], ["PM", PM, 403], ["KK", KK, 403], ["tamu", SAMA, 401]]) assert.equal((await P(ok.j.id, {aksi: "terima"}, h)).s, s, nama);
  assert.equal((await P(ok.j.id, {aksi: "setuju"})).s, 400); assert.equal((await P("0123456789abcdef", {aksi: "terima"})).s, 404);
  assert.equal((await P(ok.j.id, {aksi: "terima"})).s, 200); assert.equal((await P(ok.j.id, {aksi: "tolak"})).s, 409, "sudah diputuskan"); assert.equal((await P(st.j.id, {aksi: "tolak"})).s, 200);
  assert.deepEqual((await U.DB.prepare("SELECT status FROM km_koreksi ORDER BY dibuat, id").all()).results.map(x => x.status).sort(), ["diterima", "ditolak"]);
  assert.equal(await n("km_jejak", `tabel = 'km_koreksi' AND aksi = 'putus'`), 2);
  assert.equal((await A("GET", "/api/kemitraan/koreksi?status=diterima", undefined, ST)).j.koreksi.length, 1); assert.equal((await A("GET", "/api/kemitraan/koreksi?status=x", undefined, ST)).s, 400);
  assert.equal((await A("GET", "/api/kemitraan/koreksi", undefined, ST)).j.koreksi.length, 2);
  assert.deepEqual((await A("GET", "/api/kemitraan/koreksi", undefined, TIM)).j.koreksi.map(x => x.id), [ok.j.id], "BP: hanya koreksi pada kunjungan timnya, bukan koreksi ST kabupaten yang sama");
  assert.equal((await A("GET", "/api/kemitraan/koreksi?kab4=6212", undefined, TIM)).s, 403); assert.equal((await A("GET", "/api/kemitraan/koreksi", undefined, TIM_LAIN)).j.koreksi.length, 0);
  assert.equal((await A("GET", "/api/kemitraan/koreksi", undefined, KK)).s, 403); assert.equal((await A("GET", "/api/kemitraan/koreksi", undefined, SAMA)).s, 401);
  assert.equal((await A("GET", "/api/kemitraan/koreksi?hal=1e400", undefined, ST)).s, 400, "hal=1e400"); assert.equal((await A("GET", "/api/kemitraan/kampus?hal=1e400", undefined, ST)).s, 400, "daftar kampus memakai halaman() yang sama");
});

/* ---------------- laju dan metode ---------------- */
async function timBaru(nama) {   // kunjungan berjalan dengan satu kode tim baru: pemegang kode baru = kuota laju baru
  const r = await A("POST", "/api/kemitraan/kunjungan", kunj({tim: [{nama, lapangan: true}]}), ST); assert.equal(r.s, 201, r.t);
  assert.equal((await A("POST", `/api/kemitraan/kunjungan/${r.j.id}/status`, {ke: "berjalan"}, ST)).s, 200);
  return {id: r.j.id, h: {"x-kode": r.j.tim_kode[0].kode, ...SAMA}};
}
uji("laju jawaban: 2000 butir per jam per pemegang (kiriman ke-21 x 100 butir = 429) dan 300 permintaan per jam (ke-301 = 429); pemegang lain tidak terkena", async () => {
  const a = await timBaru("Tim Kuota Baris"), seratus = Array.from({length: 100}, (_, i) => J(i));
  for (let i = 0; i < 20; i++) assert.equal((await KIRIM({jawaban: seratus}, a.h, a.id)).s, 200, "kiriman ke-" + (i + 1));
  const r = await KIRIM({jawaban: seratus}, a.h, a.id); assert.equal(r.s, 429, r.t); assert.ok(r.h.get("retry-after"));
  assert.equal(await n("km_jawaban", `kunjungan_id = '${a.id}'`), 100, "kiriman ulang yang sama hanya 100 baris, tetapi tiap butir tetap memakai kuota");
  assert.equal((await KIRIM({jawaban: [J(1)]}, a.h, a.id)).s, 429, "kuota habis juga untuk 1 butir");
  const b = await timBaru("Tim Kuota Permintaan");
  for (let i = 0; i < 300; i++) { const x = await KIRIM({jawaban: [J(1)]}, b.h, b.id); if (x.s !== 200) assert.fail(`permintaan ke-${i + 1}: ${x.s} ${x.t}`); }
  const y = await KIRIM({jawaban: [J(1)]}, b.h, b.id); assert.equal(y.s, 429, y.t); assert.ok(y.h.get("retry-after"));
  const c = await timBaru("Tim Lain Lagi"); assert.equal((await KIRIM({jawaban: [J(1)]}, c.h, c.id)).s, 200, "pemegang lain tidak terkena");
});
uji("laju koreksi: 60 per jam per pemegang kode, ke-61 = 429 tanpa baris baru", async () => {
  const a = await timBaru("Tim Koreksi"), kor = i => A("POST", "/api/kemitraan/koreksi", {kunjungan_id: a.id, jalur: `profil.angka_${i}`, baru: "100", sumber: "Catatan lapangan tim"}, a.h);
  for (let i = 0; i < 60; i++) { const x = await kor(i); if (x.s !== 201) assert.fail(`koreksi ke-${i + 1}: ${x.s} ${x.t}`); }
  const antre = await n("km_koreksi", `kunjungan_id = '${a.id}'`), r = await kor(61); assert.equal(r.s, 429, r.t); assert.ok(r.h.get("retry-after"));
  assert.equal(antre, 60); assert.equal(await n("km_koreksi", `kunjungan_id = '${a.id}'`), 60, "ke-61 tidak menulis baris");
});
uji("laju: ajukan masalah 60 per jam per pemegang kode, ke-61 = 429 (pemegang lain tidak terkena); rute tak dikenal 405 dengan allow", async () => {
  const boros = await kodeBP("6211"), lain = await kodeBP("6211");
  for (let i = 0; i < 60; i++) assert.equal((await A("POST", "/api/kemitraan/masalah", masalahOK({judul: `Banjir ke-${i} di desa`}), boros)).s, 201, "ke-" + i);
  const r = await A("POST", "/api/kemitraan/masalah", masalahOK(), boros); assert.equal(r.s, 429, r.t); assert.ok(r.h.get("retry-after"));
  assert.equal((await A("POST", "/api/kemitraan/masalah", masalahOK(), lain)).s, 201, "pemegang kode lain tidak terkena");
  const d = await A("DELETE", "/api/kemitraan/masalah", undefined, ST); assert.equal(d.s, 405); assert.match(d.h.get("allow"), /GET/);
  assert.equal((await A("GET", "/api/kemitraan/masalah/ambil", undefined, ST)).s, 405, "ambil hanya POST");
  assert.equal((await A("POST", "/api/kemitraan/masalah", masalahOK({kab4: "6211"}), {...ST, origin: "http://jahat.example"})).s, 403, "origin asing (CSRF)");
});

/* ---------------- CSP Turnstile hanya di /kemitraan/daftar ---------------- */
uji("CSP halaman: /kemitraan/daftar mengizinkan challenges.cloudflare.com (script-src dan frame-src) bila TURNSTILE_SITEKEY diset; halaman kemitraan lain dan tanpa sitekey TIDAK", async () => {
  const T = await siapkan("uji-km-csp", {ikat: {TURNSTILE_SITEKEY: "1x00000000000000000000AA"}}), CF = "https://challenges.cloudflare.com";
  const csp = async (u, jalur) => (await u.mf.dispatchFetch("http://bnpb.lokal" + jalur, {headers: ip()})).headers.get("content-security-policy");
  const d = await csp(T, "/kemitraan/daftar"), dir = (c, nama) => c.split(";").map(s => s.trim()).find(s => s.startsWith(nama + " ")) || "";
  assert.ok(dir(d, "script-src").includes(CF), "script-src daftar: " + d); assert.ok(dir(d, "frame-src").includes(CF), "frame-src daftar: " + d);
  for (const j of ["/kemitraan/masuk", "/kemitraan/saya", "/kemitraan/sertifikat/0123456789abcdef", "/kemitraan"]) { const c = await csp(T, j); assert.ok(c && !c.includes(CF), `${j} tidak boleh memuat Turnstile: ${c}`); }
  const tanpa = await csp(U, "/kemitraan/daftar"); assert.ok(tanpa && !tanpa.includes(CF), "tanpa sitekey CSP ketat: " + tanpa);
});

/* ---------------- perbaikan pengulas: koreksi dibersihkan, templat_id resmi ---------------- */
uji("koreksi: nomor HP dan tautan di lama/baru/sumber dibuang sebelum disimpan; sumber yang tinggal pendek setelah dibersihkan ditolak", async () => {
  const a = await timBaru("Tim Bersih Koreksi");
  const ok = await A("POST", "/api/kemitraan/koreksi", {kunjungan_id: a.id, jalur: "penduduk.total", lama: "hubungi 081234567890", baru: "1.500 (lihat http://contoh.example/x)", sumber: "Dukcapil kab, telp 081234567891 atau https://situs.example/y"}, a.h);
  assert.equal(ok.s, 201, ok.t);
  const r = await U.DB.prepare("SELECT lama, baru, sumber FROM km_koreksi WHERE id = ?").bind(ok.j.id).first(), semua = JSON.stringify(r);
  assert.ok(r.lama.includes("[nomor dihapus]") && r.baru.includes("[tautan dihapus]") && r.sumber.includes("[nomor dihapus]") && r.sumber.includes("[tautan dihapus]"), semua);
  assert.ok(!/0812345678|contoh\.example|situs\.example/.test(semua), "tidak ada nomor/tautan asli tersimpan: " + semua);
  const sebelum = await n("km_koreksi");
  assert.equal((await A("POST", "/api/kemitraan/koreksi", {kunjungan_id: a.id, jalur: "penduduk.total", baru: "100", sumber: "kasar bangsat"}, a.h)).s, 400, "kata kasar ditolak");
  assert.equal(await n("km_koreksi"), sebelum);
});
uji("jawaban: templat_id yang bukan pertanyaan resmi (pertanyaan.json) ditolak 400 untuk ST maupun BP, tanpa baris; id resmi diterima", async () => {
  const a = await timBaru("Tim Templat"), sebelum = await n("km_jawaban");
  for (const [nama, h] of [["BP", a.h], ["ST", ST]]) for (const t of ["zz-99", "1u-99", "../x", "1u-01 ", "UMUM"])
    assert.equal((await KIRIM({jawaban: [J(70, {templat_id: t})]}, h, a.id)).s, 400, `${nama} templat_id "${t}"`);
  assert.equal((await KIRIM({jawaban: [J(71), J(72, {templat_id: "tidak-ada"})]}, a.h, a.id)).s, 400, "satu templat liar menolak seluruh larik");
  assert.equal(await n("km_jawaban"), sebelum, "tidak ada yang tersimpan");
  assert.equal((await KIRIM({jawaban: [J(73, {templat_id: "1u-05"})]}, a.h, a.id)).s, 200, "id resmi non-konfirmasi diterima");
});
