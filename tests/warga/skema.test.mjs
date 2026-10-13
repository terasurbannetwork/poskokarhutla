/* Lapisan constraint + trigger: SQL migrasi dijalankan apa adanya di SQLite sungguhan (node:sqlite, tanpa npm).
   Tiap uji dibungkus BEGIN … ROLLBACK oleh runner (bukan oleh uji), jadi uji yang lupa membersihkan tidak menular.
   Jalankan: node --test tests/warga/skema.test.mjs */
import {test} from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {migrasi} from "./_bantu.mjs";
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
