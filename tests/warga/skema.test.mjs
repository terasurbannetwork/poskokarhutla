/* Lapisan constraint + trigger: SQL migrasi dijalankan apa adanya di SQLite sungguhan (node:sqlite, tanpa npm).
   Tiap uji dibungkus BEGIN … ROLLBACK oleh runner (bukan oleh uji), jadi uji yang lupa membersihkan tidak menular.
   Jalankan: node --test tests/warga/skema.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {migrasi, AKAR} from "./_bantu.mjs";
import {readFileSync, readdirSync} from "node:fs";
import {JENIS, BAHAYA} from "../../public/informasi_jenis.js";

const db = new DatabaseSync(":memory:");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(migrasi());

/* berhenti di galat pertama: setelah satu uji gagal, sisanya GAGAL tanpa dijalankan (tidak pernah lolos diam-diam) */
let rusak = null;
const uji = (nama, fn) => test(nama, () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  db.exec("BEGIN");
  try { fn(); } catch (e) { rusak = nama; throw e; } finally { db.exec("ROLLBACK"); }
});
const H = "a".repeat(64), T0 = 1_760_000_000_000, JAM = 3600e3;
let n = 0;
function lapor(o = {}) {
  const r = {id: "id" + String(++n).padStart(8, "0"), jenis: "listrik", sub: "padam", bahaya: "umum", lat: -2.5, lon: 113.9, teks: "", detail: "{}",
    jumlah: null, dibuat: T0, kedaluwarsa: T0 + 24 * JAM, induk: null, durasi_buruk: null, ip_hash: H, token_hash: H, ...o};
  db.prepare(`INSERT INTO laporan (id, jenis, sub, bahaya, lat, lon, teks, detail, jumlah, dibuat, kedaluwarsa, induk, durasi_buruk, ip_hash, token_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(r.id, r.jenis, r.sub, r.bahaya, r.lat, r.lon, r.teks, r.detail, r.jumlah, r.dibuat, r.kedaluwarsa, r.induk, r.durasi_buruk, r.ip_hash, r.token_hash);
  return r.id;
}
const isianSah = j => j === "air_padam" ? JSON.stringify({status: "ada"}) : "{}";
const bahayaSah = j => JENIS[j].bahaya ? JENIS[j].bahaya[0] : "umum";
const ditolak = (fn, sebab) => assert.throws(fn, /constraint|kontak hanya|FOREIGN KEY/i, `harus DITOLAK database: ${sebab}`);

uji("tiap pasangan jenis:sub di katalog diterima CHECK", () => {
  let ok = 0;
  for (const [j, d] of Object.entries(JENIS)) for (const s of Object.keys(d.sub)) {
    try { lapor({jenis: j, sub: s, bahaya: bahayaSah(j), detail: isianSah(j), lat: -2.5, lon: 113.9}); ok++; }
    catch (e) { assert.fail(`${j}:${s} ada di public/informasi_jenis.js tapi ditolak migrasi (${e.message}); perbarui CHECK di migrations/0001_warga.sql`); }
  }
  assert.ok(ok >= 70, `hanya ${ok} pasangan diuji, katalog terlalu kecil?`);
});

uji("tiap pasangan silang jenis:sub yang tidak ada di katalog ditolak", () => {
  const semuaSub = new Set(Object.values(JENIS).flatMap(d => Object.keys(d.sub)));
  let ditolakN = 0;
  for (const [j, d] of Object.entries(JENIS)) for (const s of semuaSub) {
    if (s in d.sub) continue;
    assert.throws(() => lapor({jenis: j, sub: s, bahaya: bahayaSah(j), detail: isianSah(j)}), /CHECK constraint/,
      `${j}:${s} tidak ada di katalog tapi DITERIMA migrasi; CHECK jenis||':'||sub lebih longgar dari public/informasi_jenis.js`);
    ditolakN++;
  }
  assert.ok(ditolakN > 500, `cuma ${ditolakN} pasangan silang diuji`);
  ditolak(() => lapor({jenis: "listrikk", sub: "padam"}), "jenis tidak dikenal");
});

uji("jenis khusus hanya di bahayanya, jenis umum di semua bahaya", () => {
  for (const [j, d] of Object.entries(JENIS)) for (const b of Object.keys(BAHAYA)) {
    const boleh = !d.bahaya || d.bahaya.includes(b), s = Object.keys(d.sub)[0];
    if (boleh) lapor({jenis: j, sub: s, bahaya: b, detail: isianSah(j)});
    else assert.throws(() => lapor({jenis: j, sub: s, bahaya: b, detail: isianSah(j)}), /CHECK constraint/, `${j} di bahaya ${b} harus ditolak (katalog: ${d.bahaya})`);
  }
  ditolak(() => lapor({bahaya: "gempa"}), "bahaya di luar enum");
});

uji("koordinat, teks, detail, jumlah, waktu: nilai salah ditolak", () => {
  ditolak(() => lapor({lat: 7.0}), "lat 7.0 > 6.5 (di luar Indonesia)");
  ditolak(() => lapor({lat: -12}), "lat -12 < -11.5");
  ditolak(() => lapor({lon: 94.4}), "lon 94.4 < 94.5");
  ditolak(() => lapor({lon: 142}), "lon 142 > 141.5");
  ditolak(() => lapor({teks: "x".repeat(281)}), "teks 281 > 280 karakter");
  lapor({teks: "x".repeat(280)});
  ditolak(() => lapor({detail: "{rusak"}), "detail bukan JSON");
  ditolak(() => lapor({detail: "[1,2]"}), "detail array, harus objek");
  ditolak(() => lapor({detail: JSON.stringify({a: "x".repeat(400)})}), "detail > 400 byte");
  ditolak(() => lapor({jenis: "minta", sub: "air", jumlah: 0}), "jumlah 0 < 1");
  ditolak(() => lapor({jenis: "minta", sub: "air", jumlah: 100001}), "jumlah 100001 > 100000");
  ditolak(() => lapor({jumlah: 5}), "jumlah pada jenis listrik (tidak punya isian jumlah)");
  ditolak(() => lapor({kedaluwarsa: T0}), "kedaluwarsa = dibuat");
  ditolak(() => lapor({kedaluwarsa: T0 + 7 * 24 * JAM + 1}), "kedaluwarsa > 7 hari");
  ditolak(() => lapor({jenis: "air_padam", sub: "embung", bahaya: "karhutla"}), "air_padam tanpa status");
  ditolak(() => lapor({jenis: "air_padam", sub: "embung", bahaya: "karhutla", detail: '{"status":"banjir"}'}), "air_padam status di luar enum");
  ditolak(() => lapor({ip_hash: "abc"}), "ip_hash bukan SHA-256 hex (64)");
  ditolak(() => lapor({id: "x"}), "id terlalu pendek");
});

uji("lokasi satwa wajib dibulatkan ~1 km", () => {
  ditolak(() => lapor({jenis: "satwa", sub: "orangutan", bahaya: "karhutla", lat: -2.12345, lon: 113.9}), "satwa lat 5 desimal");
  lapor({jenis: "satwa", sub: "orangutan", bahaya: "karhutla", lat: -2.12, lon: 113.91});
});

uji("induk dan durasi: rujukan harus ada, durasi tetap tersimpan walau induk dihapus", () => {
  ditolak(() => lapor({induk: "tidakada00000000"}), "induk ke laporan yang tidak ada (FK)");
  ditolak(() => lapor({durasi_buruk: -1, induk: null}), "durasi_buruk negatif");
  const p = lapor();
  lapor({induk: p, sub: "hidup", durasi_buruk: 5 * JAM});
  ditolak(() => lapor({id: "diri00000001", induk: "diri00000001"}), "induk ke diri sendiri");
  db.prepare("DELETE FROM laporan WHERE id = ?").run(p);
  assert.equal(db.prepare("SELECT count(*) n FROM laporan WHERE induk = ?").get(p).n, 0, "anak harus kehilangan induk (ON DELETE SET NULL)");
});

uji("kontak hanya untuk jenis bantuan, format 628…, ikut terhapus bersama laporan", () => {
  const k = db.prepare("INSERT INTO kontak (laporan_id, wa, dibuat) VALUES (?, ?, ?)");
  const l = lapor();
  assert.throws(() => k.run(l, "6281234567890", T0), /kontak hanya untuk laporan bantuan/, "kontak pada laporan listrik harus ditolak trigger");
  const m = lapor({jenis: "minta", sub: "makanan", jumlah: 12});
  ditolak(() => k.run(m, "081234567890", T0), "wa berawalan 0 (harus dinormalkan 62)");
  ditolak(() => k.run(m, "62812abc4567", T0), "wa berisi huruf");
  ditolak(() => k.run(m, "628123", T0), "wa terlalu pendek");
  k.run(m, "6281234567890", T0);
  db.prepare("DELETE FROM laporan WHERE id = ?").run(m);
  assert.equal(db.prepare("SELECT count(*) n FROM kontak").get().n, 0, "kontak harus terhapus CASCADE bersama laporannya");
});

uji("suara: hitungan dijaga trigger, 3 aduan menyembunyikan, satu suara per IP", () => {
  const l = lapor(), s = db.prepare("INSERT INTO suara (laporan_id, ip_hash, kelompok, nilai, waktu) VALUES (?, ?, ?, ?, ?) ON CONFLICT (laporan_id, ip_hash, kelompok) DO UPDATE SET nilai = excluded.nilai");
  const ip = i => String(i).repeat(64).slice(0, 64), baca = () => db.prepare("SELECT benar, salah, aduan, disembunyikan FROM laporan WHERE id = ?").get(l);
  s.run(l, ip(1), "konfirmasi", "benar", T0); s.run(l, ip(2), "konfirmasi", "benar", T0); s.run(l, ip(3), "konfirmasi", "salah", T0);
  assert.deepEqual({...baca()}, {benar: 2, salah: 1, aduan: 0, disembunyikan: 0});
  s.run(l, ip(3), "konfirmasi", "benar", T0);
  assert.deepEqual({...baca()}, {benar: 3, salah: 0, aduan: 0, disembunyikan: 0}, "ganti suara salah->benar harus menggeser hitungan");
  s.run(l, ip(1), "aduan", "spam", T0); s.run(l, ip(1), "aduan", "palsu", T0); s.run(l, ip(2), "aduan", "spam", T0);
  assert.equal(baca().disembunyikan, 0, "2 IP mengadu (satu IP dua kali) belum boleh menyembunyikan");
  assert.equal(baca().aduan, 2);
  s.run(l, ip(4), "aduan", "kasar", T0);
  assert.equal(baca().disembunyikan, 1, `3 aduan dari 3 IP harus menyembunyikan, aduan=${baca().aduan}`);
  db.prepare("DELETE FROM suara WHERE laporan_id = ? AND kelompok = 'aduan'").run(l);
  db.prepare("DELETE FROM suara WHERE laporan_id = ? AND ip_hash = ?").run(l, ip(1));
  assert.deepEqual({...baca()}, {benar: 2, salah: 0, aduan: 0, disembunyikan: 1}, "hapus suara harus menurunkan hitungan; status sembunyi hanya dibuka admin");
  ditolak(() => s.run(l, ip(5), "konfirmasi", "mungkin", T0), "nilai konfirmasi di luar benar/salah");
  ditolak(() => s.run(l, ip(5), "aduan", "benar", T0), "nilai aduan di luar enum");
  ditolak(() => s.run(l, ip(5), "suka", "benar", T0), "kelompok di luar enum");
  ditolak(() => s.run("tidakada00000000", ip(5), "konfirmasi", "benar", T0), "suara untuk laporan yang tidak ada (FK)");
});

uji("jejak dan titik_terbaru: enum dan JSON dijaga", () => {
  ditolak(() => db.prepare("INSERT INTO jejak VALUES (?, ?, ?)").run(H, "unduh", T0), "aksi jejak di luar enum");
  ditolak(() => db.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").run(T0, "{}"), "titik_terbaru tanpa baris[]");
  db.prepare("INSERT INTO titik_terbaru (dibuat, isi) VALUES (?, ?)").run(T0, '{"baris":[]}');
});

uji("audit moderasi hanya bisa ditambah: enum/format dijaga, ubah & hapus ditolak", () => {
  const ins = (o = {}) => { const r = {waktu: T0, moderator: "0123456789ab", aksi: "hapus", laporan_id: "id00000001", jumlah: 1, alasan: "", ...o};
    db.prepare("INSERT INTO audit_moderasi (waktu, moderator, aksi, laporan_id, jumlah, alasan) VALUES (?, ?, ?, ?, ?, ?)").run(r.waktu, r.moderator, r.aksi, r.laporan_id, r.jumlah, r.alasan); };
  ins(); ins({aksi: "hapus_pengirim", jumlah: 4});
  ditolak(() => ins({aksi: "musnahkan"}), "aksi audit di luar enum");
  ditolak(() => ins({moderator: "rahasia-admin"}), "moderator bukan 12 hex (token mentah)");
  ditolak(() => ins({moderator: "0123456789AB"}), "moderator huruf besar");
  ditolak(() => ins({jumlah: -1}), "jumlah negatif");
  ditolak(() => ins({alasan: "x".repeat(201)}), "alasan > 200 karakter");
  assert.throws(() => db.prepare("UPDATE audit_moderasi SET aksi = 'tampilkan'").run(), /tidak boleh diubah/, "audit harus tidak bisa diubah");
  assert.throws(() => db.prepare("DELETE FROM audit_moderasi").run(), /tidak boleh dihapus/, "audit harus tidak bisa dihapus");
  assert.equal(db.prepare("SELECT count(*) n FROM audit_moderasi").get().n, 2);
});

uji("statistik: stat_hari, laju, stat_tamu, stat_garam, stat_ip menolak nilai salah", () => {
  const S = JSON.stringify(Array(144).fill(0)), M = JSON.stringify(Array(1440).fill(0));
  const hari = (o = {}) => { const r = {tgl: "2026-10-14", hal: "karhutla", orang: 0, sampel: 1, slot: S, menit: M, dim: '{"_n":{}}', kini: "[]", ...o};
    db.prepare("INSERT INTO stat_hari (tgl, hal, orang, sampel, slot, menit, dim, kini) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(r.tgl, r.hal, r.orang, r.sampel, r.slot, r.menit, r.dim, r.kini); };
  hari(); hari({hal: "publik"}); hari({hal: "sistem"});
  ditolak(() => hari({tgl: "14-10-2026", hal: "banjir"}), "tanggal bukan YYYY-MM-DD");
  ditolak(() => hari({hal: "lain"}), "halaman di luar enum");
  ditolak(() => hari({tgl: "2026-10-13", slot: JSON.stringify(Array(143).fill(0))}), "slot bukan 144");
  ditolak(() => hari({tgl: "2026-10-13", menit: "[1,2"}), "menit bukan JSON");
  ditolak(() => hari({tgl: "2026-10-13", dim: "{}"}), "dim tanpa _n");
  ditolak(() => hari({tgl: "2026-10-13", kini: "{}"}), "kini bukan larik");
  ditolak(() => hari({tgl: "2026-10-13", orang: -1}), "orang negatif");
  ditolak(() => hari({tgl: "2026-10-13", sampel: 0}), "sampel 0");
  assert.throws(() => hari(), /UNIQUE|PRIMARY|constraint/i, "satu baris per (tgl, hal)");
  ditolak(() => db.prepare("INSERT INTO laju VALUES (?, ?, ?)").run(H, "lapor", T0), "aksi laju di luar enum");
  ditolak(() => db.prepare("INSERT INTO stat_tamu VALUES (?, ?)").run("2026-10-14", "10.0.0.1"), "sidik tamu bukan 16 hex (mis. IP mentah)");
  ditolak(() => db.prepare("INSERT INTO stat_garam VALUES (?, ?)").run("2026-10-14", "pendek"), "garam bukan 64 hex");
  ditolak(() => db.prepare("INSERT INTO stat_ip VALUES (?, ?, ?)").run("openai", "{}", T0), "cidr bukan larik");
});

uji("pesan: email, kategori, panjang, dan status dijaga database", () => {
  const ins = (o = {}) => { const r = {id: "0123456789abcdef", email: "a@b.id", kategori: "masukan", isi: "sepuluh karakter", status: "baru", ...o};
    db.prepare("INSERT INTO pesan (id, dibuat, diubah, email, kategori, isi, status, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(r.id, T0, T0, r.email, r.kategori, r.isi, r.status, H); };
  ins();
  ditolak(() => ins({id: "1123456789abcdef", email: "tanpa-at"}), "email tanpa @");
  ditolak(() => ins({id: "2123456789abcdef", email: "a b@c.id"}), "email berspasi");
  ditolak(() => ins({id: "3123456789abcdef", kategori: "spam"}), "kategori di luar enum");
  ditolak(() => ins({id: "4123456789abcdef", isi: "pendek"}), "isi < 10");
  ditolak(() => ins({id: "5123456789abcdef", isi: "x".repeat(2001)}), "isi > 2000");
  ditolak(() => ins({id: "6123456789abcdef", status: "dihapus"}), "status di luar enum");
  ditolak(() => ins({id: "bukan-hex"}), "id bukan 16 hex");
});

/* 0006 dijalankan di atas basis data yang sudah berisi (seperti produksi yang sudah menerapkan 0004/0005), bukan basis data kosong */
uji("migrasi 0006: stat_hari dibangun ulang, data utuh, CHECK halaman diperlebar", () => {
  const berkas = readdirSync(AKAR + "/migrations").filter(f => f.endsWith(".sql")).sort(), i = berkas.indexOf("0006_statistik_halaman.sql");
  assert.ok(i > 0, "0006_statistik_halaman.sql tidak ada");
  const lama = new DatabaseSync(":memory:"), baca = f => readFileSync(AKAR + "/migrations/" + f, "utf8");
  for (const f of berkas.slice(0, i)) lama.exec(baca(f));
  const S = JSON.stringify(Array(144).fill(0)), M = JSON.stringify(Array(1440).fill(0)), D = '{"_n":{"tab":1},"tab":{"peta":[3,0]}}';
  const isi = lama.prepare("INSERT INTO stat_hari (tgl, hal, kiriman, orang, tampilan, sampel, slot, menit, dim, kini) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  isi.run("2026-10-14", "karhutla", 5, 4.5, 12, 0.5, S, M, D, "[]"); isi.run("2026-10-14", "publik", 1, 1, 7, 1, S, M, '{"_n":{}}', "[[1,\"ab\",\"/\"]]");
  ditolak(() => isi.run("2026-10-14", "tentang", 0, 0, 0, 1, S, M, D, "[]"), "sebelum 0006 'tentang' ditolak (pembanding)");
  const sebelum = lama.prepare("SELECT * FROM stat_hari ORDER BY hal").all();
  lama.exec(baca(berkas[i]));
  assert.deepEqual(lama.prepare("SELECT * FROM stat_hari ORDER BY hal").all(), sebelum, "semua baris & kolom harus utuh setelah dibangun ulang");
  for (const h of ["tentang", "privasi", "statistik"]) isi.run("2026-10-14", h, 1, 1, 1, 1, S, M, D, "[]");
  ditolak(() => isi.run("2026-10-15", "lain", 0, 0, 0, 1, S, M, D, "[]"), "halaman di luar enum tetap ditolak");
  ditolak(() => isi.run("2026-10-15", "karhutla", 0, 0, 0, 1, S, M, "{}", "[]"), "dim tanpa _n tetap ditolak");
  assert.deepEqual(lama.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'stat_hari%' AND type = 'table'").all().map(r => r.name), ["stat_hari"], "tabel sementara harus hilang");
});

/* 0017 dijalankan di atas stat_hari yang sudah berisi (produksi), bukan basis data kosong */
uji("migrasi 0017: stat_hari menerima id bencana baru, data lama utuh, enum tetap dijaga, idempoten", () => {
  const berkas = readdirSync(AKAR + "/migrations").filter(f => f.endsWith(".sql")).sort(), i = berkas.indexOf("0017_statistik_bencana.sql");
  assert.ok(i > 0, "0017_statistik_bencana.sql tidak ada");
  const db = new DatabaseSync(":memory:"), baca = f => readFileSync(AKAR + "/migrations/" + f, "utf8");
  for (const f of berkas.slice(0, i)) db.exec(baca(f));
  const S = JSON.stringify(Array(144).fill(0)), M = JSON.stringify(Array(1440).fill(0)), D = '{"_n":{"tab":1},"tab":{"peta":[3,0]}}';
  const isi = db.prepare("INSERT INTO stat_hari (tgl, hal, kiriman, orang, tampilan, sampel, slot, menit, dim, kini) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  isi.run("2026-10-14", "karhutla", 5, 4.5, 12, 0.5, S, M, D, "[]"); isi.run("2026-10-14", "publik", 1, 1, 7, 1, S, M, '{"_n":{}}', "[[1,\"ab\",\"/\"]]");
  ditolak(() => isi.run("2026-10-14", "gempa", 0, 0, 0, 1, S, M, D, "[]"), "sebelum 0017 'gempa' ditolak (pembanding)");
  const sebelum = db.prepare("SELECT * FROM stat_hari ORDER BY hal").all();
  db.exec(baca(berkas[i]));
  assert.deepEqual(db.prepare("SELECT * FROM stat_hari ORDER BY hal").all(), sebelum, "semua baris & kolom harus utuh");
  for (const h of ["gempa", "cuaca", "udara", "gunungapi", "kekeringan", "sistem", "tentang"]) isi.run("2026-10-15", h, 1, 1, 1, 1, S, M, D, "[]");
  for (const h of ["", "Gempa", "tsunami", "lain"]) ditolak(() => isi.run("2026-10-16", h, 0, 0, 0, 1, S, M, D, "[]"), `halaman '${h}' di luar enum tetap ditolak`);
  ditolak(() => isi.run("2026-10-16", "karhutla", 0, 0, 0, 1, S, M, "{}", "[]"), "dim tanpa _n tetap ditolak");
  db.exec(baca(berkas[i]));   // dijalankan ulang di atas data: tidak melempar, data tetap
  assert.equal(db.prepare("SELECT count(*) n FROM stat_hari").get().n, 2 + 7);
  assert.deepEqual(db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'stat_hari%' AND type = 'table'").all().map(r => r.name), ["stat_hari"], "tabel sementara harus hilang");
});
