// SP-007: daftar medan form lapangan. Batas dibaca dari migrations/0056_sippa_inti.sql (bukan disalin),
// jadi uji ini merah begitu medan dan CHECK D1 berselisih (RU §6.2).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const SQL = readFileSync(new URL("../../migrations/0056_sippa_inti.sql", import.meta.url), "utf8");
const SUMBER = readFileSync(new URL("../../public/pipa/formulir.js", import.meta.url), "utf8");
const F = await import("../../public/pipa/formulir.js");
const { MEDAN, DIISI_SERVER, JENIS_TABEL, URUTAN_WAKTU, cekButir, FORMULIR_VERSI } = F;

// ---- pembaca SQL minimal: tabel -> kolom -> batas ----
function bagiAtas(s) {
  const out = []; let d = 0, q = false, cur = "";
  for (const c of s) {
    if (c === "'") q = !q;
    if (!q && c === "(") d++;
    if (!q && c === ")") d--;
    if (!q && d === 0 && c === ",") { out.push(cur); cur = ""; } else cur += c;
  }
  if (cur.trim()) out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
function tabel(nama) {
  const bersih = SQL.replace(/--[^\n]*/g, "");
  const m = bersih.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${nama} \\(([\\s\\S]*?)\\n\\);`));
  assert.ok(m, `tabel ${nama} tidak ditemukan di 0056`);
  const kol = {};
  for (const butir of bagiAtas(m[1])) {
    if (/^(CHECK|PRIMARY|UNIQUE|FOREIGN)\b/i.test(butir)) continue;
    const [, n, tipe] = butir.match(/^(\w+)\s+(TEXT|INTEGER|REAL)/);
    const adaDefault = /\bDEFAULT\b/i.test(butir);
    const wajib = /\bNOT NULL\b|PRIMARY KEY/i.test(butir) && !adaDefault;
    const b = { tipe, wajib };
    let r;
    if ((r = butir.match(new RegExp(`\\b${n} BETWEEN (-?[\\d.]+) AND (-?[\\d.]+)`)))) { b.min = +r[1]; b.maks = +r[2]; }
    if ((r = butir.match(new RegExp(`\\b${n} <= (-?[\\d.]+)`)))) b.maks = +r[1];
    if ((r = butir.match(new RegExp(`\\b${n} > (-?[\\d.]+)`)))) { b.min = +r[1]; b.minEksklusif = true; }
    if ((r = butir.match(new RegExp(`\\b${n} IN \\(([^)]*)\\)`)))) {
      b.pilihan = r[1].split(",").map(x => x.trim()).map(x => /^'/.test(x) ? x.slice(1, -1) : +x);
    }
    if ((r = butir.match(new RegExp(`length\\(${n}\\) BETWEEN (\\d+) AND (\\d+)`)))) { b.lenMin = +r[1]; b.lenMaks = +r[2]; }
    if ((r = butir.match(new RegExp(`length\\(${n}\\) <= (\\d+)`)))) b.lenMaks = +r[1];
    if ((r = butir.match(new RegExp(`length\\(${n}\\) IN \\(([\\d, ]+)\\)`)))) b.panjang = r[1].split(",").map(Number).sort((a, c) => a - c);
    else {
      const eq = [...butir.matchAll(new RegExp(`length\\(${n}\\) = (\\d+)`, "g"))].map(x => +x[1]);
      if (eq.length) b.panjang = eq.sort((a, c) => a - c);
    }
    kol[n] = b;
  }
  return kol;
}
const TABEL = Object.fromEntries(Object.entries(JENIS_TABEL).map(([jenis, nama]) => [jenis, tabel(nama)]));
const STATUS_KIT = tabel("sippa_kit").status.pilihan;
const BANDING = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test("versi formulir ada dan bulat positif", () => {
  assert.ok(Number.isInteger(FORMULIR_VERSI) && FORMULIR_VERSI >= 1, `FORMULIR_VERSI=${FORMULIR_VERSI}`);
});

test("MEDAN memuat empat jenis butir tepat: log, probe, bbm, gerak", () => {
  assert.deepEqual(Object.keys(MEDAN).sort(), ["bbm", "gerak", "log", "probe"]);
});

for (const jenis of ["log", "probe", "bbm", "gerak"]) {
  test(`${jenis}: medan + diisi server = semua kolom ${JENIS_TABEL[jenis]} (tidak ada kolom terlupa atau karangan)`, () => {
    const sql = Object.keys(TABEL[jenis]).sort();
    const kita = [...Object.keys(MEDAN[jenis]), ...DIISI_SERVER[jenis]].sort();
    assert.deepEqual(kita, sql, `kolom SQL ${sql.length} vs formulir ${kita.length}`);
    assert.equal(new Set(kita).size, kita.length, "satu kolom tidak boleh di dua daftar");
  });

  test(`${jenis}: tiap medan punya bentuk {nama,label,tipe,min,maks,pilihan,wajib} dan label`, () => {
    for (const [nama, m] of Object.entries(MEDAN[jenis])) {
      assert.equal(m.nama, nama, `nama medan ${nama}`);
      assert.ok(typeof m.label === "string" && m.label.length >= 3, `label ${jenis}.${nama}`);
      assert.ok(["teks", "angka", "bulat", "waktu", "pilihan", "bool", "json"].includes(m.tipe), `tipe ${jenis}.${nama}=${m.tipe}`);
      assert.equal(typeof m.wajib, "boolean", `wajib ${jenis}.${nama}`);
      for (const k of ["min", "maks", "pilihan"]) assert.ok(k in m, `${jenis}.${nama} tanpa kunci ${k}`);
    }
  });

  test(`${jenis}: wajib = NOT NULL tanpa DEFAULT di SQL`, () => {
    for (const [nama, m] of Object.entries(MEDAN[jenis])) {
      assert.equal(m.wajib, TABEL[jenis][nama].wajib, `${jenis}.${nama}: formulir wajib=${m.wajib}, SQL wajib=${TABEL[jenis][nama].wajib}`);
    }
  });

  test(`${jenis}: batas tiap medan sama dengan CHECK 0056`, () => {
    for (const [nama, m] of Object.entries(MEDAN[jenis])) {
      const s = TABEL[jenis][nama];
      const ctx = `${jenis}.${nama}`;
      const teks = ["teks", "json"].includes(m.tipe) || (m.tipe === "pilihan" && typeof (m.pilihan || [])[0] === "string");
      const sqlTeks = s.tipe === "TEXT";
      assert.equal(sqlTeks, teks, `${ctx}: tipe SQL ${s.tipe} vs formulir ${m.tipe}`);
      if (s.tipe === "REAL") assert.equal(m.tipe, "angka", `${ctx}: REAL harus angka`);
      if (m.tipe === "bool") assert.deepEqual(s.pilihan, [0, 1], `${ctx}: bool harus IN (0,1) di SQL`);
      if (s.pilihan && m.tipe !== "bool") {
        const harap = nama === "dari_status" || nama === "ke_status" ? STATUS_KIT : s.pilihan;
        assert.deepEqual(m.pilihan, harap, `${ctx}: pilihan`);
      }
      if (nama === "dari_status" || nama === "ke_status") assert.deepEqual(m.pilihan, STATUS_KIT, `${ctx}: pilihan = status sippa_kit`);
      if (!s.pilihan && !["dari_status", "ke_status"].includes(nama)) assert.equal(m.pilihan, null, `${ctx}: pilihan harus null`);
      if (teks) {
        assert.equal(m.min ?? null, s.lenMin ?? null, `${ctx}: panjang min (SQL ${s.lenMin ?? "-"}, formulir ${m.min ?? "-"})`);
        assert.equal(m.maks ?? null, s.lenMaks ?? null, `${ctx}: panjang maks (SQL ${s.lenMaks ?? "-"}, formulir ${m.maks ?? "-"})`);
        assert.deepEqual(m.panjang ?? null, s.panjang ?? null, `${ctx}: panjang tepat`);
      } else if (m.tipe !== "bool" && m.tipe !== "pilihan") {
        assert.equal(m.min ?? null, s.min ?? null, `${ctx}: min (SQL ${s.min ?? "-"}, formulir ${m.min ?? "-"})`);
        assert.equal(m.maks ?? null, s.maks ?? null, `${ctx}: maks (SQL ${s.maks ?? "-"}, formulir ${m.maks ?? "-"})`);
        assert.equal(!!m.minEksklusif, !!s.minEksklusif, `${ctx}: min eksklusif`);
      }
    }
  });
}

test("urutan waktu log = pasangan di trigger sippa_log_urut (dibaca dari SQL)", () => {
  const trig = SQL.match(/CREATE TRIGGER IF NOT EXISTS sippa_log_urut[\s\S]*?BEGIN/)[0];
  const sql = [...trig.matchAll(/NEW\.(t_\w+) < NEW\.(t_\w+)\)/g)].map(m => `${m[2]}<=${m[1]}`).sort();
  const kita = URUTAN_WAKTU.map(([awal, akhir]) => `${awal}<=${akhir}`).sort();
  assert.ok(sql.length >= 10, `pasangan SQL terbaca ${sql.length}`);
  assert.deepEqual(kita, sql);
});

test("tahap probe: tujuh tahap termasuk 'sesudah' (keputusan 53)", () => {
  assert.deepEqual(MEDAN.probe.tahap.pilihan, ["sebelum", "sesudah", "24j", "72j", "7h", "30h", "90h"]);
});

test("kedalaman probe: 10/30/50/100 dan 150-500 hanya lengan_dalam; > 500 cm tidak ada di daftar", () => {
  assert.deepEqual(MEDAN.probe.kedalaman_cm.pilihan, [10, 30, 50, 100, 150, 300, 400, 500]);
  assert.ok(Math.max(...MEDAN.probe.kedalaman_cm.pilihan) <= 500);
  assert.ok(!MEDAN.probe.kedalaman_cm.pilihan.some(k => k > 500));
  assert.deepEqual(F.KEDALAMAN_CM.biasa, [10, 30, 50, 100]);
  assert.deepEqual(F.KEDALAMAN_CM.lengan_dalam, [150, 300, 400, 500]);
});

test("batas kedalaman tidak jadi konstanta kedua: tidak ada 5 m atau 500 cm sebagai literal batas di formulir.js", () => {
  // 500 hanya boleh muncul sebagai anggota daftar CHECK; batasnya diturunkan dari hitung.js bila ada (SP-010)
  assert.ok(!/dalam_maks|\b5\s*\*\s*100\b|> ?500\b|<= ?500\b/.test(SUMBER.replace(/\/\/[^\n]*/g, "")), "literal batas 500 ditemukan");
});

test("kedalaman probe selaras KONST.dalam_maks_m bila hitung.js sudah ada", { skip: !existsSync(new URL("../../public/pipa/hitung.js", import.meta.url)) }, async () => {
  const { KONST } = await import("../../public/pipa/hitung.js");
  assert.equal(Math.max(...MEDAN.probe.kedalaman_cm.pilihan), KONST.dalam_maks_m * 100);
});

test("formulir.js tanpa DOM dan tanpa global peramban", () => {
  const kode = SUMBER.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  for (const kata of ["document", "window", "localStorage", "sessionStorage", "navigator", "indexedDB", "fetch(", "location", "toFixed("]) {
    assert.ok(!kode.includes(kata), `formulir.js memakai ${kata}`);
  }
  assert.ok(!/\bimport\b[^;]*['"]\.\.?\/(inti|admin)/.test(kode), "tidak mengimpor modul public/inti");
});

test("teks antarmuka: tanpa em dash, tanpa titik tengah, tanpa 'terbukti'", () => {
  assert.ok(!SUMBER.includes("—"), "em dash");
  assert.ok(!SUMBER.includes("·"), "titik tengah");
  assert.ok(!/terbukti/i.test(SUMBER), "kata terbukti");
});

test("tidak ada src/sippa_formulir.js (ADR-03)", () => {
  assert.equal(existsSync(new URL("../../src/sippa_formulir.js", import.meta.url)), false);
});

// ---- perilaku cekButir ----
const ok = (jenis, butir, opsi) => { const h = cekButir(jenis, butir, opsi); assert.equal(h.ok, true, JSON.stringify(h.galat)); };
const tolak = (jenis, butir, medan, opsi) => {
  const h = cekButir(jenis, butir, opsi);
  assert.equal(h.ok, false, `harus ditolak: ${medan}`);
  assert.ok(h.galat.some(g => g.medan === medan), `galat harus menyebut ${medan}, dapat ${JSON.stringify(h.galat)}`);
  for (const g of h.galat) assert.ok(typeof g.pesan === "string" && g.pesan.length > 5, "pesan galat");
  return h;
};
const LOG = { id: "0f8fad5b-d9cb-469f-a165-70867728950e", jenis: "karhutla", waktu_klien: 1761000000000 };
const PROBE = { id: "0f8fad5b-d9cb-469f-a165-70867728950e", titik: "T1", tahap: "sebelum", kedalaman_cm: 50, suhu_c: 38.5, waktu: 1761000000000 };

test("log minimal sah diterima", () => ok("log", LOG));

test("log: bukan objek, jenis butir asing, dan medan asing ditolak", () => {
  assert.equal(cekButir("log", null).ok, false);
  assert.equal(cekButir("log", []).ok, false);
  assert.equal(cekButir("nyasar", LOG).ok, false);
  tolak("log", { ...LOG, kolom_gaib: 1 }, "kolom_gaib");
});

test("log: medan wajib kosong ditolak", () => {
  for (const k of ["id", "jenis", "waktu_klien"]) {
    const { [k]: _, ...sisa } = LOG;
    tolak("log", sisa, k);
  }
});

test("log: tiap batas angka ditolak di luar rentang, diterima di tepi", () => {
  const kasus = [["panjang_m", 0, 5000], ["n_orang", 1, 300], ["jam_pompa", 0, 720], ["bbm_l", 0, 20000], ["air_m3", 0, 1000000],
    ["p_ujung_bar", 0, 25], ["p_ujung_menit", 0, 1440], ["bocor_henti_menit", 0, 1440], ["lat", -11.5, 6.5], ["lon", 94.5, 141.5]];
  for (const [k, lo, hi] of kasus) {
    ok("log", { ...LOG, [k]: lo }); ok("log", { ...LOG, [k]: hi });
    tolak("log", { ...LOG, [k]: lo - 0.5 - Math.abs(lo) * 0.01 }, k);
    tolak("log", { ...LOG, [k]: hi + 1 }, k);
    tolak("log", { ...LOG, [k]: "abc" }, k);
  }
});

test("log: p_ujung_bar 25,5 ditolak dengan pesan yang menyebut rentang", () => {
  const h = tolak("log", { ...LOG, p_ujung_bar: 25.5 }, "p_ujung_bar");
  assert.match(h.galat[0].pesan, /25/);
});

test("log: medan vonis pilot keputusan 53 (sumber tekanan, kecelakaan, air sampai lance)", () => {
  ok("log", { ...LOG, petak_id: "P-A1", air_sampai_lance: 1, p_ujung_bar: 2.4, p_ujung_menit: 35, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 0 });
  tolak("log", { ...LOG, p_ujung_sumber: "tebakan" }, "p_ujung_sumber");
  tolak("log", { ...LOG, kecelakaan: 2 }, "kecelakaan");
  tolak("log", { ...LOG, air_sampai_lance: "ya" }, "air_sampai_lance");
  tolak("log", { ...LOG, petak_id: "ab" }, "petak_id");
  tolak("log", { ...LOG, petak_id: "x".repeat(41) }, "petak_id");
});

test("log: jenis, kelas medan, panjang id, jumlah orang pecahan", () => {
  tolak("log", { ...LOG, jenis: "gempa" }, "jenis");
  tolak("log", { ...LOG, kelas_medan: "IV" }, "kelas_medan");
  tolak("log", { ...LOG, id: "pendek" }, "id");
  ok("log", { ...LOG, id: "0123456789abcdef" });
  tolak("log", { ...LOG, n_orang: 2.5 }, "n_orang");
  tolak("log", { ...LOG, catatan: "x".repeat(1001) }, "catatan");
  tolak("log", { ...LOG, kecelakaan: null, p_ujung_bar: Infinity }, "p_ujung_bar");
});

test("log: konfigurasi harus JSON sah dan <= 4096 karakter", () => {
  ok("log", { ...LOG, konfigurasi: JSON.stringify({ n_lance: 8 }) });
  tolak("log", { ...LOG, konfigurasi: "{rusak" }, "konfigurasi");
  tolak("log", { ...LOG, konfigurasi: JSON.stringify({ x: "y".repeat(4100) }) }, "konfigurasi");
});

test("log: urutan waktu terbalik ditolak, sama dengan trigger", () => {
  const t = 1761000000000;
  ok("log", { ...LOG, t_tiba: t, t_mulai_gelar: t + 1, t_air_mengalir: t + 2, t_selesai: t + 3, t_bongkar_selesai: t + 4 });
  tolak("log", { ...LOG, t_tiba: t + 5, t_mulai_gelar: t }, "t_mulai_gelar");
  tolak("log", { ...LOG, t_tiba: t + 5, t_bongkar_selesai: t }, "t_bongkar_selesai");
  tolak("log", { ...LOG, t_air_mengalir: t + 5, t_mulai_injeksi: t }, "t_mulai_injeksi");
  // injeksi dan selesai tidak dibandingkan oleh trigger: harus diterima
  ok("log", { ...LOG, t_mulai_injeksi: t + 9, t_selesai: t + 1 });
});

test("log: banjir_m3 hanya pada jenis banjir", () => {
  ok("log", { ...LOG, jenis: "banjir", banjir_m3: 1200 });
  tolak("log", { ...LOG, jenis: "karhutla", banjir_m3: 1200 }, "banjir_m3");
  tolak("log", { ...LOG, jenis: "latihan", banjir_m3: 0 }, "banjir_m3");
  tolak("log", { ...LOG, jenis: "banjir", banjir_m3: 1e7 + 1 }, "banjir_m3");
});

test("probe minimal sah diterima; tahap sesudah diterima", () => {
  ok("probe", PROBE);
  ok("probe", { ...PROBE, tahap: "sesudah" });
  for (const tahap of ["24j", "72j", "7h", "30h", "90h"]) ok("probe", { ...PROBE, tahap });
  tolak("probe", { ...PROBE, tahap: "1j" }, "tahap");
});

test("probe: suhu 1000 derajat dan -11 ditolak, tepi diterima", () => {
  ok("probe", { ...PROBE, suhu_c: 900 }); ok("probe", { ...PROBE, suhu_c: -10 });
  tolak("probe", { ...PROBE, suhu_c: 1000 }, "suhu_c");
  tolak("probe", { ...PROBE, suhu_c: -10.1 }, "suhu_c");
  tolak("probe", { ...PROBE, suhu_c: "panas" }, "suhu_c");
});

test("probe: kedalaman 150-500 cm hanya bila tugas lengan_dalam = 1 (F6)", () => {
  for (const k of [150, 300, 400, 500]) {
    tolak("probe", { ...PROBE, kedalaman_cm: k }, "kedalaman_cm");
    tolak("probe", { ...PROBE, kedalaman_cm: k }, "kedalaman_cm", { lengan_dalam: 0 });
    ok("probe", { ...PROBE, kedalaman_cm: k }, { lengan_dalam: 1 });
  }
  for (const k of [10, 30, 50, 100]) ok("probe", { ...PROBE, kedalaman_cm: k }, { lengan_dalam: 0 });
});

test("probe: kedalaman di luar daftar ditolak walau lengan_dalam = 1 (600 cm, 5,1 m, 20 cm)", () => {
  for (const k of [600, 510, 501, 20, 0, -10, 99.5, "50"]) tolak("probe", { ...PROBE, kedalaman_cm: k }, "kedalaman_cm", { lengan_dalam: 1 });
});

test("probe: titik kosong, titik terlalu panjang, petak terlalu pendek ditolak", () => {
  tolak("probe", { ...PROBE, titik: "" }, "titik");
  tolak("probe", { ...PROBE, titik: "x".repeat(21) }, "titik");
  tolak("probe", { ...PROBE, petak_id: "ab" }, "petak_id");
  ok("probe", { ...PROBE, petak_id: "P-A1", log_id: "0123456789abcdef" });
});

const BBM = { id: "0123456789abcdef", waktu: 1761000000000, jenis: "solar", aksi: "terima", liter: 20 };
test("bbm: sah diterima, liter 0 dan 20001 ditolak, jenis dan aksi asing ditolak", () => {
  ok("bbm", BBM); ok("bbm", { ...BBM, liter: 20000 }); ok("bbm", { ...BBM, liter: 0.5 });
  tolak("bbm", { ...BBM, liter: 0 }, "liter");
  tolak("bbm", { ...BBM, liter: -1 }, "liter");
  tolak("bbm", { ...BBM, liter: 20001 }, "liter");
  tolak("bbm", { ...BBM, jenis: "avtur" }, "jenis");
  tolak("bbm", { ...BBM, aksi: "curi" }, "aksi");
  tolak("bbm", { ...BBM, tiket: "x".repeat(41) }, "tiket");
});

const GERAK = { id: "0123456789abcdef", dari_status: "gudang", ke_status: "gelar", alasan: "gelar", waktu: 1761000000000, tiba: 1761000000000 };
test("gerak: sah diterima; status liar, alasan liar, pengangkut liar ditolak", () => {
  ok("gerak", GERAK);
  tolak("gerak", { ...GERAK, ke_status: "terbang" }, "ke_status");
  tolak("gerak", { ...GERAK, dari_status: "terbang" }, "dari_status");
  tolak("gerak", { ...GERAK, alasan: "iseng" }, "alasan");
  tolak("gerak", { ...GERAK, pengangkut: "ojek" }, "pengangkut");
  for (const k of ["id", "dari_status", "ke_status", "alasan", "waktu"]) {
    const { [k]: _, ...sisa } = GERAK;
    tolak("gerak", sisa, k);
  }
});

test("gerak: eta 721 jam, lat di luar Indonesia, prov bukan 2 karakter ditolak", () => {
  ok("gerak", { ...GERAK, eta_jam: 720, prov: "62", lat: -2.2, lon: 113.9 });
  tolak("gerak", { ...GERAK, eta_jam: 721 }, "eta_jam");
  tolak("gerak", { ...GERAK, lat: 40 }, "lat");
  tolak("gerak", { ...GERAK, prov: "621" }, "prov");
});

test("gerak: bukan rencana wajib punya tiba (CHECK tabel); rencana boleh tanpa tiba", () => {
  const { tiba: _, ...tanpaTiba } = GERAK;
  tolak("gerak", tanpaTiba, "tiba");
  tolak("gerak", { ...tanpaTiba, rencana: 0 }, "tiba");
  ok("gerak", { ...tanpaTiba, rencana: 1 });
});

test("nilai kosong (null) pada medan opsional diterima, pada medan wajib ditolak", () => {
  ok("log", { ...LOG, panjang_m: null, catatan: null, p_ujung_sumber: null });
  tolak("log", { ...LOG, jenis: null }, "jenis");
});

test("cekButir mengumpulkan semua galat, bukan berhenti di yang pertama", () => {
  const h = cekButir("log", { ...LOG, n_orang: 0, bbm_l: -1, jam_pompa: 9999 });
  assert.equal(h.ok, false);
  assert.deepEqual(h.galat.map(g => g.medan).sort(), ["bbm_l", "jam_pompa", "n_orang"]);
});

/* SP-094: butir inspeksi operator (keputusan 56). Bukan bagian MEDAN (tidak punya tabel butir sendiri: ia masuk sippa_inspeksi lewat
   butirInspeksi di src/sippa.js), jadi MEDAN tetap empat jenis; cekButir mengenalinya lewat cekInspeksiLapangan. */
const INSP = { id: "0123456789abcdef", jenis: "pra_gelar", sasaran_jenis: "komponen", sasaran_id: "0123456789abcdef", skor: 0, waktu_klien: 1761000000000 };
test("cekInspeksiLapangan: butir minimal sah diterima lewat cekButir; MEDAN tetap empat jenis tanpa inspeksi", () => {
  ok("inspeksi", INSP); ok("inspeksi", { ...INSP, jenis: "pasca_gelar", sasaran_jenis: "kit", skor: 3, jam_operasi: 12.5, temuan: "selang bocor", tindakan: "perbaiki" });
  assert.deepEqual(Object.keys(MEDAN).sort(), ["bbm", "gerak", "log", "probe"]);
  assert.equal(typeof F.cekInspeksiLapangan, "function");
});

test("cekInspeksiLapangan: yang salah DITOLAK per medan (jenis staf, sasaran aset, skor 4, id sasaran liar, tindakan liar, temuan panjang, jam negatif, medan liar)", () => {
  tolak("inspeksi", { ...INSP, jenis: "berkala" }, "jenis");          // hanya staf
  tolak("inspeksi", { ...INSP, jenis: "mutu_air" }, "jenis");
  tolak("inspeksi", { ...INSP, sasaran_jenis: "aset" }, "sasaran_jenis");
  tolak("inspeksi", { ...INSP, sasaran_id: "xyz" }, "sasaran_id");
  tolak("inspeksi", { ...INSP, skor: 4 }, "skor"); tolak("inspeksi", { ...INSP, skor: -1 }, "skor"); tolak("inspeksi", { ...INSP, skor: 1.5 }, "skor"); tolak("inspeksi", { ...INSP, skor: "0" }, "skor");
  tolak("inspeksi", { ...INSP, tindakan: "bakar" }, "tindakan");
  tolak("inspeksi", { ...INSP, temuan: "x".repeat(1001) }, "temuan");
  tolak("inspeksi", { ...INSP, jam_operasi: -1 }, "jam_operasi"); tolak("inspeksi", { ...INSP, jam_operasi: 100001 }, "jam_operasi");
  tolak("inspeksi", { ...INSP, kit_id: "0123456789abcdef" }, "kit_id");   // kit tugas ditentukan server
  for (const k of ["id", "jenis", "sasaran_jenis", "sasaran_id", "skor"]) { const { [k]: _, ...sisa } = INSP; tolak("inspeksi", sisa, k); }
  assert.equal(cekButir("inspeksi", null).ok, false); assert.equal(cekButir("inspeksi", []).ok, false);
});

test("INSPEKSI_LAPANGAN: tindakan sama dengan CHECK sippa_inspeksi di 0059; jenis operator = JENIS_LAPANGAN di src/sippa.js", () => {
  const sql = readFileSync(new URL("../../migrations/0059_sippa_aset_pelihara.sql", import.meta.url), "utf8");
  const cek = /tindakan IN \(([^)]*)\)/.exec(sql); assert.ok(cek, "CHECK tindakan tidak ditemukan di 0059");
  assert.deepEqual([...F.INSPEKSI_LAPANGAN.tindakan].sort(), [...cek[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort());
  const kode = readFileSync(new URL("../../src/sippa.js", import.meta.url), "utf8"), jl = /JENIS_LAPANGAN = \[([^\]]*)\]/.exec(kode);
  assert.ok(jl, "JENIS_LAPANGAN tidak ditemukan"); assert.deepEqual([...F.INSPEKSI_LAPANGAN.jenis].sort(), [...jl[1].matchAll(/"([a-z_]+)"/g)].map(m => m[1]).sort());
});
