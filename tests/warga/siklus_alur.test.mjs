/* Siklus Bencana G3: alur ujung ke ujung F1 sampai F4 (SK-080, UJ-F4-11). Ingest, kejadian, fase tanggap, Jitupasna, baris (idempoten), hitung, final, R3P, setuju PM,
   ditetapkan_resmi, kegiatan terhubung pemulihan. Tiap langkah menambah TEPAT SATU baris sk_jejak, dan tiap tabel dibaca langsung dari D1 (bukan dari jawaban rute).
   worker.js utuh di Miniflare + D1 sungguhan. Jalankan: node --test tests/warga/siklus_alur.test.mjs */
import {test as uji} from "node:test";
import assert from "node:assert/strict";
import {mulai, id16} from "./_siklus.mjs";

const U = await mulai("uji-sk-alur", {r2: false});
const {DB, api, GET, POST, n} = U;
const [PD, KO, PM] = [await U.staf("Pd Alur", ["pusdalops"]), await U.staf("Ko Alur", ["koordalops"]), await U.staf("Pm Alur", ["pimpinan"])];
const BP = await U.bp(), J = 1e6, TOK = {authorization: "Bearer token-pipa-uji"};
const satu = (sql, ...b) => DB.prepare(sql).bind(...b).first();
const jejak = async () => n("sk_jejak");

uji("UJ-F4-11: dari ingest sampai kegiatan terhubung pemulihan, satu jejak per langkah", async () => {
  let j0 = await jejak(), langkah = 0;
  const satuJejak = async nama => { const j = await jejak(); assert.equal(j - j0, 1, `langkah ${++langkah} (${nama}) harus menambah tepat satu baris jejak, bukan ${j - j0}`); j0 = j; };

  // 1. ingest: DIBI -> kejadian baru KJ- deterministik
  const ing = await api("POST", "/api/siklus/ingest/kejadian", {keputusan: [{sumber: "dibi", kode: "dibi|3201|2026-03-02", aksi: "baru", jenis: "banjir", kab4: "3201", mulai: "2026-03-02", nama: "Banjir Kabupaten Bogor", diambil: 1_780_000_000_000,
    dampak: {meninggal: {n: 3, y: "resmi", t: "2026"}}}]}, TOK); assert.equal(ing.s, 200, ing.t); assert.equal(ing.j.baru, 1);
  const KID = "KJ-2026-9A2WGN3G"; assert.equal((await satu("SELECT fase FROM sk_kejadian WHERE id = ?", KID)).fase, "terdeteksi"); await satuJejak("ingest");

  // 2-3. fase: PD verifikasi, KO tanggap
  assert.equal((await POST(PD, `/kejadian/${KID}/fase`, {ke: "terverifikasi"})).s, 200); await satuJejak("terverifikasi");
  assert.equal((await POST(KO, `/kejadian/${KID}/fase`, {ke: "tanggap", tanggap_mulai: "2026-03-02"})).s, 200); await satuJejak("tanggap");
  assert.equal((await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3202"})).s, 400, "kab4 di luar kejadian"); assert.equal(await jejak(), j0, "yang ditolak tidak menulis jejak");

  // 4. harga (asumsi-kebijakan, dokumen wajib), lalu Jitupasna
  for (const [tingkat, harga_rp] of [["hancur", 300 * J], ["rb", 100 * J], ["rs", 50 * J], ["rr", 20 * J]]) {
    assert.equal((await POST(PD, "/harga", {sektor: "perumahan", tingkat, satuan: "unit", harga_rp, tahun: 2026, dokumen: "HSBGN 2026 contoh"})).s, 201); await satuJejak("harga " + tingkat);
  }
  const jp = (await POST(KO, "/pulih", {kejadian_id: KID, kab4: "3201", tim_sk: "SK Tim PDNA 12/2026"})).j.id; await satuJejak("Jitupasna dibuka");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "pengumpulan"})).s, 200); await satuJejak("pengumpulan");

  // 5. baris oleh BP wilayahnya, idempoten
  const baris = [{jenis: "rusak", sektor: "perumahan", tingkat: "rb", unit: 10, klien_id: "alur-baris-01"}, {jenis: "rusak", sektor: "perumahan", tingkat: "rs", unit: 20, klien_id: "alur-baris-02"},
    {jenis: "rusak", sektor: "perumahan", tingkat: "rr", unit: 30, klien_id: "alur-baris-03"}, {jenis: "rugi", sektor: "perumahan", komponen: "sewa_hunian", arus_rp: 1 * J, bulan: 6, klien_id: "alur-baris-04"}];
  const b1 = await POST(BP, `/pulih/${jp}/baris`, {baris}); assert.deepEqual(b1.j, {diterima: 4, duplikat: 0}); await satuJejak("baris");
  const b2 = await POST(BP, `/pulih/${jp}/baris`, {baris}); assert.deepEqual(b2.j, {diterima: 0, duplikat: 4}); await satuJejak("baris ulang (idempoten)");
  assert.equal(await n("sk_jitupasna_baris", `jitupasna_id = '${jp}'`), 4, "kirim dua kali, empat baris");

  // 6. hitung memakai mesin produksi; final
  const h = await POST(PD, `/pulih/${jp}/hitung`, {tahun_harga: 2026}); assert.equal(h.s, 200, h.t); await satuJejak("hitung");
  assert.equal(h.j.hitung.kerusakan.total, 2600 * J); assert.equal(h.j.hitung.total, 2606 * J, "kerusakan 2.600 jt + kerugian 6 jt"); assert.equal(h.j.hitung.yakin, "asumsi-kebijakan");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "ditinjau"})).s, 200); await satuJejak("ditinjau");
  assert.equal((await POST(KO, `/pulih/${jp}/status`, {ke: "final"})).s, 200); await satuJejak("final");
  assert.equal((await satu("SELECT status FROM sk_jitupasna WHERE id = ?", jp)).status, "final");

  // 7. R3P: draf, kegiatan terhubung pemulihan nyata, diusulkan, setuju PM, ditetapkan_resmi, berjalan
  const r = (await POST(KO, "/r3p", {jitupasna_id: jp})).j.id; await satuJejak("R3P draf");
  const pem = id16(); await DB.prepare("INSERT INTO pemulihan (id, jenis, prov, kab, target, realisasi, satuan, status, dibuat, diubah) VALUES (?, 'huntara', '32', 'Bogor', 120, 30, 'unit', 'berjalan', 1, ?)").bind(pem, Date.now()).run();
  const kg = await POST(KO, `/r3p/${r}/kegiatan`, {sektor: "permukiman", nama: "Huntara Bogor", target: 120, satuan: "unit", nilai_rp: 900 * J, tautan_jenis: "pemulihan", tautan_id: pem}); assert.equal(kg.s, 201, kg.t); await satuJejak("kegiatan");
  assert.equal((await POST(KO, `/r3p/${r}/status`, {ke: "diusulkan"})).s, 200); await satuJejak("diusulkan");
  assert.equal((await POST(KO, `/r3p/${r}/setuju`, {})).s, 403, "KO tidak menyetujui"); assert.equal(await jejak(), j0);
  assert.equal((await POST(PM, `/r3p/${r}/setuju`, {})).s, 200); await satuJejak("setuju PM");
  assert.equal((await POST(KO, `/kejadian/${KID}/fase`, {ke: "transisi", tanggap_akhir: "2026-03-20"})).s, 200); await satuJejak("transisi");
  assert.equal((await POST(KO, `/kejadian/${KID}/fase`, {ke: "pemulihan"})).s, 200, "R3P diusulkan atau lebih sudah tertaut"); await satuJejak("pemulihan");
  assert.equal((await POST(KO, `/r3p/${r}/status`, {ke: "ditetapkan_resmi", no_keputusan: "SK Bupati 45/2026", tgl_keputusan: "2026-04-01", penandatangan: "Bupati Bogor"})).s, 200); await satuJejak("ditetapkan_resmi");
  assert.equal((await POST(KO, `/r3p/${r}/status`, {ke: "berjalan"})).s, 200); await satuJejak("berjalan");

  // akhir: dibaca langsung dari D1 dan dari rute
  const R = await satu("SELECT status, total_rp, disetujui_oleh, no_keputusan, tanggap_mulai, jitupasna_id, kejadian_id FROM sk_r3p WHERE id = ?", r);
  assert.deepEqual([R.status, R.total_rp, R.no_keputusan, R.tanggap_mulai, R.jitupasna_id, R.kejadian_id], ["berjalan", 900 * J, "SK Bupati 45/2026", "2026-03-02", jp, KID]); assert.match(R.disetujui_oleh, /^staf:/);
  const K = await satu("SELECT tautan_jenis, tautan_id, nilai_rp FROM sk_r3p_kegiatan WHERE r3p_id = ?", r); assert.deepEqual([K.tautan_jenis, K.tautan_id, K.nilai_rp], ["pemulihan", pem, 900 * J]);
  const d = await GET(PD, `/r3p/${r}`); assert.equal(d.s, 200); assert.equal(d.j.catatan, "salinan data, dokumen resmi di luar sistem"); assert.equal(d.j.kemajuan.kegiatan[0].persen, 25, "30 dari 120 unit pada pemulihan yang ditautkan");
  assert.equal((await satu("SELECT fase FROM sk_kejadian WHERE id = ?", KID)).fase, "pemulihan");
  assert.deepEqual((await GET(KO, `/kejadian/${KID}`)).j.pulih_ids, [jp]);
  assert.equal(await n("sk_jejak", "oleh LIKE 'sistem:%'"), 1, "hanya ingest bertindak sebagai sistem");
});
