#!/usr/bin/env node
/* Impor lokal Inventori LogPal: membaca folder JSON dokumen gudang (satu berkas per gudang) dan menulis SQL ke LUAR repo.
   DATA GUDANG ASLI TIDAK BOLEH MASUK REPO (repo publik): skrip menolak folder masuk atau berkas keluaran di dalam repo.
   Pakai:  node scripts/logpal/impor.mjs <folder-seed> <keluaran.sql> [--kebutuhan kebutuhan.csv] [--statis <folder gudang.csv usulan.csv rute.csv wilayah.csv teks.json matriks.json kecamatan.csv terdampak.csv>] [--bantuan bantuan.csv]
   --bantuan: bantuan peralatan dan logistik per BPBD per tahun (kolom provinsi,wilayah,tingkat,tahun,barang,jumlah,satuan,belum_usulkan,catatan) -> logpal_bantuan (migrasi 0115). BUKAN stok gudang. Folder seed boleh kosong. INSERT OR REPLACE dengan id deterministik: aman diulang.
   Lalu pemilik menjalankan sendiri:  npx wrangler d1 execute <DB> --remote --file <keluaran.sql>   (sesudah migrasi 0112 dan 0113)
   Bentuk dokumen: {nama, pemilik: "BNPB"|"BPBD", provinsi, kab (opsional, gudang kab/kota dipasangkan ke akun pemkab/pemkot), kapasitas_ton, items: [{id, barang, kategori, item_standar, prioritas, kelompok, satuan, jumlah, baik, rusak, kedaluwarsa, sumber_dana, per, sumber, catatan, ...kolom aset opsional}]}.
   Kode provinsi dari public/data/logpal/provinsi.csv (publik); koordinat gudang dari src/logpal_statis.js (bukan aset publik). id gudang dan barang deterministik (sha256 kode + id asal), jadi SQL aman dijalankan ulang:
   INSERT OR IGNORE. Gudang BPBD tanpa kab dipasangkan ke akun pemprov aktif provinsinya; dijalankan ulang sesudah akun dibuat, pasangan yang masih kosong terisi. */
import {readFileSync, readdirSync, writeFileSync, realpathSync, existsSync} from "node:fs";
import {createHash} from "node:crypto";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sha16 = s => createHash("sha256").update(s).digest("hex").slice(0, 16);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const q = v => v == null || v === "" ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/'/g, "''") + "'";
/* seperti teks tetapi baris baru dipertahankan (isi CSV) */
const teksBaris = v => "'" + String(v ?? "").replace(/\r/g, "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/'/g, "''") + "'";
const teks = v => "'" + String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/'/g, "''") + "'";

export const BATAS_POTONG = 90000, MAKS_POTONGAN = 60;   // karakter isi dan byte pernyataan (setelah escape) per potongan; CHECK migrasi 0113 sama
const NAMA_BIASA = ["gudang", "usulan", "rute", "jangkauan", "teks"], NAMA_POTONG = ["matriks", "kecamatan", "terdampak"];
/* isi -> potongan berurutan; ukuran dihitung pada teks SQL (kutip ganda, UTF-8), tidak memotong pasangan surrogate */
export function potongTeks(isi, maks = BATAS_POTONG) {
  const hasil = [], bersih = String(isi).replace(/\r/g, "");
  const ukur = t => Buffer.byteLength(teksBaris(t));
  for (let i = 0; i < bersih.length;) {
    let j = Math.min(i + maks, bersih.length);
    for (let u; j - i > 1 && (u = ukur(bersih.slice(i, j))) > maks;) j -= Math.max(1, u - maks);   // kurangi tepat sebesar kelebihan byte (kutip pembungkus, escape)
    if (j < bersih.length && /[\ud800-\udbff]/.test(bersih[j - 1])) j--;
    hasil.push(bersih.slice(i, j)); i = j;
  }
  return hasil;
}

export function uraiCsv(t) {
  const R = []; let r = [], c = "", dq = false;
  for (let i = 0; i < t.length; i++) {
    const h = t[i];
    if (dq) { if (h === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else dq = false; } else c += h; }
    else if (h === '"') dq = true; else if (h === ",") { r.push(c); c = ""; } else if (h === "\n") { r.push(c.replace(/\r$/, "")); R.push(r); r = []; c = ""; } else c += h;
  }
  if (c || r.length) { r.push(c); R.push(r); }
  const k = R.shift().map(s => s.replace(/^﻿/, ""));
  return R.filter(a => a.length > 1 || a[0]).map(a => Object.fromEntries(k.map((x, i) => [x, a[i]])));
}
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const ANGKA = ["tahun", "nilai", "rr", "rb", "harga"];
const TEKS = ["kode_barang", "nup", "merek", "seri", "cara", "label", "batch", "lokasi", "dokumen"];

/* dokumen: [{berkas, d}] -> teks SQL. Melempar galat jelas bila data tidak sah (lebih baik gagal di sini daripada ditolak CHECK di D1). */
export function bangunSql({dokumen, provinsi, gudang, kebutuhan = [], kini = Date.now(), kelompok, batas = {}, rumus = () => false, statis = {}}) {
  const kode = new Map(provinsi.map(p => [p.provinsi, p.kode])), titik = new Map(gudang.map(g => [norm(g.gudang), g]));
  const sql = ["-- Impor Inventori LogPal (dibangkitkan scripts/logpal/impor.mjs). Jalankan sesudah migrasi 0112. INSERT OR IGNORE: aman diulang.", "-- BERKAS INI BERISI DATA GUDANG ASLI: jangan commit, jangan taruh di repo."];
  const dipakai = new Set();
  for (const {berkas, d} of dokumen) {
    if (!d || typeof d.nama !== "string" || !["BNPB", "BPBD"].includes(d.pemilik) || !Array.isArray(d.items)) throw new Error(`${berkas}: bukan dokumen gudang (nama, pemilik BNPB/BPBD, items)`);
    const prov = kode.get(d.provinsi); if (!prov) throw new Error(`${berkas}: provinsi "${d.provinsi}" tidak ada di provinsi.csv`);
    if (d.kab != null && (typeof d.kab !== "string" || d.kab.length < 2 || d.kab.length > 60)) throw new Error(`${berkas}: kab harus 2 sampai 60 karakter`);
    const kd = slug(d.nama); if (dipakai.has(kd)) throw new Error(`${berkas}: nama gudang "${d.nama}" kembar`); dipakai.add(kd);
    const gid = sha16("gudang:" + kd), t = titik.get(norm(d.nama));
    sql.push(`INSERT OR IGNORE INTO logpal_gudang (id, kode, akun_id, nama, pemilik, prov, provinsi, kab, kapasitas_ton, lon, lat, dibuat, diubah, dummy) VALUES (${q(gid)}, ${q(kd)}, NULL, ${q(d.nama)}, ${q(d.pemilik)}, ${q(prov)}, ${q(d.provinsi)}, ${q(d.kab)}, ${q(d.kapasitas_ton)}, ${q(t ? +t.lon : null)}, ${q(t ? +t.lat : null)}, ${kini}, ${kini}, 0);`);
    const lihat = new Set();
    for (const x of d.items) {
      const a = `${berkas} item ${x.id}`;
      if (typeof x.id !== "string" || lihat.has(x.id)) throw new Error(`${a}: id kosong atau kembar`); lihat.add(x.id);
      if (typeof x.barang !== "string" || x.barang.trim().length < 2 || x.barang.length > 200) throw new Error(`${a}: nama barang`);
      if (!kelompok.includes(x.kelompok)) throw new Error(`${a}: kelompok "${x.kelompok}" tidak dikenal`);
      const j = x.jumlah, b = x.baik ?? j, r = x.rusak ?? 0;
      for (const [k, v] of [["jumlah", j], ["baik", b], ["rusak", r]]) if (!Number.isInteger(v) || v < 0) throw new Error(`${a}: ${k} harus bilangan bulat >= 0`);
      if (b + r > j) throw new Error(`${a}: baik + rusak melebihi jumlah`);
      const ked = x.kedaluwarsa ?? ""; if (ked !== "" && !/^\d{4}-[01]\d-[0-3]\d$/.test(ked)) throw new Error(`${a}: kedaluwarsa "${ked}"`);
      const pr = String(x.prioritas ?? ""); if (!["", "1", "2"].includes(pr)) throw new Error(`${a}: prioritas "${pr}"`);
      for (const k of ANGKA) if (x[k] != null && x[k] !== "" && !Number.isFinite(+x[k])) throw new Error(`${a}: ${k} bukan angka`);
      for (const [k, m] of Object.entries(batas)) { const v = x[k]; if (v != null && (typeof v !== "string" || v.length > m || rumus(v.trim()))) throw new Error(`${a}: ${k} melebihi ${m} karakter atau diawali = + - @`); }
      if (rumus(x.barang.trim())) throw new Error(`${a}: nama barang diawali = + - @`);
      if (String(x.per ?? "").length > 40) throw new Error(`${a}: per melebihi 40 karakter`);
      const kol = {barang: x.barang.trim(), kategori: x.kategori || "Lainnya", item_standar: x.item_standar ?? "", prioritas: pr, kelompok: x.kelompok, satuan: x.satuan ?? "", jumlah: j, baik: b, rusak: r, kedaluwarsa: ked,
        sumber_dana: x.sumber_dana ?? "", per: x.per ?? "", sumber: x.sumber ?? "", catatan: x.catatan ?? ""};
      for (const k of TEKS) kol[k] = x[k] ?? "";
      for (const k of ANGKA) kol[k] = x[k] == null || x[k] === "" ? null : +x[k];
      const nama = Object.keys(kol), isi = nama.map(k => typeof kol[k] === "number" || kol[k] === null ? q(kol[k]) : teks(kol[k]));
      sql.push(`INSERT OR IGNORE INTO logpal_barang (id, gudang_id, ${nama.join(", ")}, dibuat, diubah, dummy) VALUES (${q(sha16(kd + ":" + x.id))}, ${q(gid)}, ${isi.join(", ")}, ${kini}, ${kini}, 0);`);
    }
    const akun = d.kab ? `a.jenis IN ('pemkab', 'pemkot') AND a.tingkat = 'kab' AND a.prov = ${q(prov)} AND lower(a.kab) = lower(${q(d.kab)})` : `a.jenis = 'pemprov' AND a.cakupan = '["${prov}"]'`;
    if (d.pemilik === "BPBD") sql.push(`UPDATE logpal_gudang SET akun_id = (SELECT a.id FROM instansi_akun a WHERE ${akun} AND a.status = 'aktif' AND a.dummy = 0 LIMIT 1) WHERE id = ${q(gid)} AND akun_id IS NULL;`);
  }
  for (const k of kebutuhan) {
    /* kolom ke-6 sampai ke-9 CSV sumber = stok gudang pembanding A, teksnya, stok pembanding B, teksnya (nama kolom sumber tidak dipakai) */
    const [ka, kat, kb, kbt] = Object.keys(k).slice(5, 9);
    const n = Number(k.no), dj = Number(k.diajukan);
    if (!Number.isInteger(n) || !Number.isInteger(dj) || dj < 0) throw new Error(`kebutuhan ${k.no}: no dan diajukan harus bilangan bulat`);
    sql.push(`INSERT OR IGNORE INTO logpal_kebutuhan (no, wilayah, kebutuhan, diajukan, satuan, stok_a, stok_a_teks, stok_b, stok_b_teks, setara, status_tetap, dummy) VALUES (${n}, ${teks(k.wilayah)}, ${teks(k.kebutuhan)}, ${dj}, ${teks(k.satuan)}, ${Math.max(0, Math.trunc(+k[ka] || 0))}, ${teks(k[kat])}, ${Math.max(0, Math.trunc(+k[kb] || 0))}, ${teks(k[kbt])}, ${k.setara === "0" ? 0 : 1}, ${teks(k.status_tetap)}, 0);`);
  }
  for (const [nama, isi] of Object.entries(statis)) {
    if (![...NAMA_BIASA, ...NAMA_POTONG].includes(nama) || typeof isi !== "string" || !isi.trim()) throw new Error(`statis ${nama}: nama tidak dikenal atau isi kosong`);
    if (NAMA_POTONG.includes(nama) && potongTeks(isi).length > MAKS_POTONGAN) throw new Error(`statis ${nama}: ${potongTeks(isi).length} potongan melebihi ${MAKS_POTONGAN} (CHECK urut 0..59 di migrasi 0113)`);
    if (NAMA_POTONG.includes(nama)) {   // besar: potongan <= 90 KB per pernyataan (batas D1 100 KB), potongan lama nama itu dihapus dulu; sesudah migrasi 0113
      sql.push(`DELETE FROM logpal_statis_potong WHERE nama = ${q(nama)};`);
      potongTeks(isi).forEach((p, i) => sql.push(`INSERT INTO logpal_statis_potong (nama, urut, isi, diubah) VALUES (${q(nama)}, ${i}, ${teksBaris(p)}, ${kini});`));
      continue;
    }
    sql.push(`INSERT OR REPLACE INTO logpal_statis (nama, isi, diubah) VALUES (${q(nama)}, ${teksBaris(isi)}, ${kini});`);
  }
  return sql.join("\n") + "\n";
}

/* bantuan peralatan dan logistik (tab Bantuan): baris CSV -> SQL logpal_bantuan. Melempar galat jelas bila tidak sah; kunci (prov, wilayah, tahun, barang) kembar ditolak karena OR REPLACE diam-diam membuang salah satunya. */
export const KOLOM_BANTUAN = ["provinsi", "wilayah", "tingkat", "tahun", "barang", "jumlah", "satuan", "belum_usulkan", "catatan"];
export function bangunSqlBantuan({baris, provinsi, kini = Date.now(), rumus = () => false}) {
  const kode = new Map(provinsi.map(p => [p.provinsi, p.kode])), lihat = new Set();
  const sql = ["-- Impor bantuan peralatan dan logistik LogPal (dibangkitkan scripts/logpal/impor.mjs --bantuan). Jalankan sesudah migrasi 0115. INSERT OR REPLACE dengan id deterministik: aman diulang.", "-- BERKAS INI BERISI DATA ASLI: jangan commit, jangan taruh di repo."];
  if (!baris.length) throw new Error("bantuan: CSV tanpa baris data");
  for (const kk of KOLOM_BANTUAN) if (!(kk in baris[0])) throw new Error(`bantuan: kolom "${kk}" tidak ada di CSV`);
  baris.forEach((r, i) => {
    const a = `bantuan baris ${i + 2}`, tk = r.tingkat, th = Number(r.tahun), j = Number(r.jumlah), bu = r.belum_usulkan;
    const prov = kode.get(r.provinsi); if (!prov) throw new Error(`${a}: provinsi "${r.provinsi}" tidak ada di provinsi.csv`);
    if (!["prov", "kab"].includes(tk)) throw new Error(`${a}: tingkat harus prov atau kab`);
    if (!Number.isInteger(th) || th < 2000 || th > 2100 || !/^\d{4}$/.test(r.tahun)) throw new Error(`${a}: tahun tidak sah`);
    if (!/^\d+$/.test(r.jumlah) || !Number.isSafeInteger(j) || j < 1 || j > 1e8) throw new Error(`${a}: jumlah harus bilangan bulat positif`);
    if (!["0", "1"].includes(bu)) throw new Error(`${a}: belum_usulkan harus 0 atau 1`);
    for (const [k, min, maks] of [["wilayah", 2, 100], ["barang", 2, 100], ["satuan", 0, 30], ["catatan", 0, 300]]) {
      const v = (r[k] ?? "").trim(); if (v.length < min || v.length > maks) throw new Error(`${a}: ${k} harus ${min} sampai ${maks} karakter`);
      if (rumus(v)) throw new Error(`${a}: ${k} diawali = + - @`);
    }
    const w = r.wilayah.trim(), b = r.barang.trim(), kunci = [prov, w, th, b].join("|");
    if (lihat.has(kunci)) throw new Error(`${a}: kunci (provinsi, wilayah, tahun, barang) kembar`); lihat.add(kunci);
    sql.push(`INSERT OR REPLACE INTO logpal_bantuan (id, prov, provinsi, tingkat, wilayah, tahun, barang, jumlah, satuan, belum_usulkan, catatan, dibuat, dummy) VALUES (${q(sha16(kunci))}, ${q(prov)}, ${teks(r.provinsi)}, ${q(tk)}, ${teks(w)}, ${th}, ${teks(b)}, ${j}, ${teks((r.satuan ?? "").trim())}, ${bu}, ${teks((r.catatan ?? "").trim())}, ${kini}, 0);`);
  });
  return sql.join("\n") + "\n";
}

/* berkas statis dari folder di luar repo: gudang.csv, usulan.csv, rute.csv, wilayah.csv (jam dan nama gudang per kab/kota jadi `jangkauan`), teks.json (catatan dan label). Kode 93 dan 96 (Papua) dibetulkan. */
export function susunStatis(dir) {
  const baca = f => existsSync(path.join(dir, f)) ? readFileSync(path.join(dir, f), "utf8").replace(/\r/g, "") : null, hasil = {};
  const tukar = t => t.replace(/^96,Papua Selatan,/gm, "93,Papua Selatan,").replace(/^93,Papua Barat Daya,/gm, "96,Papua Barat Daya,").replace(/(Papua Selatan",BPBD,)96,/g, "$193,");
  for (const n of ["gudang", "usulan", "rute"]) { const t = baca(n + ".csv"); if (t) hasil[n] = n === "gudang" ? tukar(t) : t; }
  const w = baca("wilayah.csv");
  if (w) {
    const kol = ["provinsi", "kab", "gudang_bnpb", "jam_bnpb", "gudang_semua", "jam_semua"], esc = v => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    hasil.jangkauan = kol.join(",") + "\n" + uraiCsv(w).map(r => kol.map(k => esc(r[k] ?? "")).join(",")).join("\n") + "\n";
  }
  const t = baca("teks.json"); if (t) { JSON.parse(t); hasil.teks = t; }
  const m = baca("matriks.json"); if (m) { JSON.parse(m); hasil.matriks = m; }   // besar: jadi potongan di logpal_statis_potong
  for (const n of ["kecamatan", "terdampak"]) { const c = baca(n + ".csv"); if (c) hasil[n] = c; }
  return hasil;
}

/* galat bila jalur ada di dalam repo (lewat realpath supaya symlink tidak menipu) */
export function diLuarRepo(jalur) {
  const nyata = existsSync(jalur) ? realpathSync(jalur) : path.join(realpathSync(path.dirname(path.resolve(jalur))), path.basename(jalur));
  const rel = path.relative(realpathSync(AKAR), nyata);
  return rel.startsWith("..") || path.isAbsolute(rel);
}

async function utama(argv) {
  const pos = [], opsi = {};
  for (let i = 0; i < argv.length; i++) { if (argv[i] === "--kebutuhan" || argv[i] === "--statis" || argv[i] === "--bantuan") opsi[argv[i].slice(2)] = argv[++i]; else pos.push(argv[i]); }
  const [folder, keluar] = pos;
  if (!folder || !keluar) { console.error("pakai: node scripts/logpal/impor.mjs <folder-seed> <keluaran.sql> [--kebutuhan kebutuhan.csv] [--statis <folder csv>] [--bantuan bantuan.csv]"); return 2; }
  for (const j of [folder, keluar, ...Object.values(opsi)]) if (!j || !diLuarRepo(j)) { console.error(`DITOLAK: ${j} ada di dalam repo atau kosong; data gudang asli harus tetap di luar repo (repo publik).`); return 3; }
  await import("../../src/worker.js");   // worker dulu: modul saling impor (siklus)
  const {KELOMPOK, TEKS_B, rumus} = await import("../../src/logpal.js");
  const dokumen = readdirSync(folder).filter(f => f.endsWith(".json")).sort().map(f => ({berkas: f, d: JSON.parse(readFileSync(path.join(folder, f), "utf8"))}));
  const statis = opsi.statis ? susunStatis(opsi.statis) : {};
  const dir = path.join(AKAR, "public/data/logpal");
  const sql = bangunSql({dokumen, provinsi: uraiCsv(readFileSync(path.join(dir, "provinsi.csv"), "utf8")), gudang: statis.gudang ? uraiCsv(statis.gudang) : [],
    kebutuhan: opsi.kebutuhan ? uraiCsv(readFileSync(opsi.kebutuhan, "utf8")) : [], kelompok: KELOMPOK, batas: TEKS_B, rumus, statis});
  let sqlAkhir = sql;
  if (opsi.bantuan) {
    const baris = uraiCsv(readFileSync(opsi.bantuan, "utf8"));
    sqlAkhir += bangunSqlBantuan({baris, provinsi: uraiCsv(readFileSync(path.join(dir, "provinsi.csv"), "utf8")), rumus});
    console.log(`${baris.length} baris bantuan`);
  }
  writeFileSync(keluar, sqlAkhir, {mode: 0o600});
  console.log(`${dokumen.length} gudang, ${dokumen.reduce((a, x) => a + x.d.items.length, 0)} barang, statis: ${Object.keys(statis).join(", ") || "tidak ada"} -> ${keluar}`);
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await utama(process.argv.slice(2)));
