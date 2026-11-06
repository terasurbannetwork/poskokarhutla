// RU-006: kasus acuan fungsi murni Jam Aturan (RU §2.1, ALGORITMA §3.2).
// Sisi Python dan acuan.json menyusul di RU-016; berkas ini hanya sisi JS.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ATURAN, aturan, nilai, periksa, tenggat } from "../../public/inti/jam_aturan.js";

const h = (k, m) => tenggat(k, m).hasil;

test("tanggal_bulan_berikut: selalu bulan berikutnya, tahun berganti", () => {
  assert.equal(h("dsp_laporan_perkembangan", "2026-01-20"), "2026-02-05");
  assert.equal(h("dsp_laporan_perkembangan", "2026-01-05"), "2026-02-05"); // bukan hari itu juga
  assert.equal(h("dsp_laporan_perkembangan", "2026-12-10"), "2027-01-05");
  assert.equal(h("dsp_laporan_perkembangan", "2026-12-31"), "2027-01-05");
  assert.equal(h("dsp_laporan_perkembangan", "2026-01-03"), "2026-02-05"); // mulai sebelum tgl 5 tetap bulan berikutnya (uji mutasi RU-006)
});

test("bulan: tanggal sama, dipangkas ke akhir bulan", () => {
  assert.equal(h("dsp_spj", "2026-01-15"), "2026-04-15");
  assert.equal(h("dsp_spj", "2026-05-31"), "2026-08-31");
  assert.equal(h("dsp_spj", "2025-11-30"), "2026-02-28");
  assert.equal(h("renkon_reviu", "2025-08-31"), "2026-02-28"); // 31 Agustus + 6 bulan
  assert.equal(h("renkon_reviu", "2025-07-31"), "2026-01-31");
  assert.equal(h("renkon_reviu", "2026-04-30"), "2026-10-30");
  assert.equal(h("dsp_spj", "2026-01-14T17:30:00Z"), "2026-04-15"); // 15 Jan WIB
});

test("tahun: 12 x N bulan, pangkas 29 Februari", () => {
  assert.equal(h("renkon_berlaku", "2024-03-01"), "2027-03-01");
  assert.equal(h("renkon_berlaku", "2024-02-29"), "2027-02-28");
  assert.equal(h("destana_penilaian", "2023-10-01"), "2026-10-01");
});

test("jam: dari cap waktu WIB, bukan tanggal", () => {
  assert.equal(h("kaji_awal", "2026-11-05T08:00:00+07:00"), "2026-11-06T08:00:00+07:00");
  assert.equal(h("kaji_awal", "2026-12-31T23:30:00+07:00"), "2027-01-01T23:30:00+07:00");
  assert.equal(h("kaji_awal", "2026-11-05T00:00:00+07:00"), "2026-11-06T00:00:00+07:00"); // tengah malam WIB
  assert.equal(h("kaji_awal", "2026-11-05T17:30:00Z"), "2026-11-07T00:30:00+07:00"); // 6 Nov 00.30 WIB + 24 jam
  assert.equal(h("kaji_lanjutan", "2026-11-05T08:00:00+07:00"), "2026-11-08T08:00:00+07:00");
});

test("masukan kosong atau tidak sah memberi null dan alasan, bukan 1970", () => {
  for (const m of [null, undefined, "", "bukan", "2026-02-30", "2026-13-01", "2026-04-31", "2027-02-29", 0, 1e12]) {
    const r = tenggat("dsp_spj", m);
    assert.equal(r.hasil, null, `mulai=${m}`);
    assert.ok(r.alasan, `alasan kosong untuk ${m}`);
  }
  assert.equal(tenggat("kaji_awal", "2026-11-05").hasil, null); // jam butuh cap waktu
  assert.equal(tenggat("kaji_awal", "2026-11-05T08:00:00").hasil, null); // tanpa zona
  assert.equal(tenggat("tidak_ada", "2026-11-05").hasil, null);
  assert.equal(tenggat("renkon_segera_hari", "2026-11-05").hasil, null); // satuan hari belum didukung
});

test("hasil membawa tanda asumsi dari entri", () => {
  assert.equal(tenggat("dsp_spj", "2026-01-15").asumsi, false);
});

test("invarian 200 masukan acak berbenih: >= peristiwa, monoton, deterministik, tanggal ada", () => {
  const SEED = 20261105;
  let s = SEED;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const tgl = () => {
    const y = 2020 + Math.floor(rnd() * 10), m = 1 + Math.floor(rnd() * 12), d = 1 + Math.floor(rnd() * 31);
    const x = new Date(Date.UTC(y, m - 1, d));
    return x.toISOString().slice(0, 10); // dibulatkan ke tanggal yang ada
  };
  const tanggalAda = (t) => new Date(t + "T00:00:00Z").toISOString().slice(0, 10) === t;
  const kunci = ["dsp_laporan_perkembangan", "dsp_spj", "renkon_berlaku", "renkon_reviu", "destana_penilaian"];
  for (let i = 0; i < 200; i++) {
    const k = kunci[i % kunci.length], a = tgl(), b = tgl();
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    const tl = h(k, lo), th = h(k, hi);
    const pesan = `kunci=${k} lo=${lo} hi=${hi} tl=${tl} th=${th} benih=${SEED}`;
    assert.ok(tl > lo, "tenggat harus sesudah peristiwa: " + pesan);
    assert.ok(tl <= th, "tidak monoton: " + pesan);
    assert.equal(h(k, lo), tl, "tidak deterministik: " + pesan);
    assert.ok(tanggalAda(tl) && tanggalAda(th), "tanggal tidak ada: " + pesan);
  }
});

test("berkas: kunci meja lengkap, asumsi bercatatan, pasal bersitasi", () => {
  for (const k of ["kaji_awal", "kaji_lanjutan", "dsp_laporan_perkembangan", "dsp_spj", "renkon_berlaku", "renkon_reviu", "destana_penilaian"]) {
    const e = aturan(k);
    assert.equal(e.asumsi, false, k);
    assert.ok(e.acuan && e.letak && e.kutipan, `${k} tanpa acuan/letak/kutipan`);
  }
  for (const k of ["logistik_setuju_jam", "renkon_segera_hari", "destana_pasif_bulan", "rehab_macet_hari"]) {
    const e = aturan(k);
    assert.equal(e.asumsi, true, k);
    assert.ok(e.catatan, `${k} asumsi tanpa catatan`);
  }
  assert.equal(nilai("renkon_berlaku"), 3);
  assert.equal(nilai("dsp_laporan_perkembangan"), 5);
  assert.throws(() => nilai("tidak_ada"), /tidak dikenal/);
});

test("ATURAN literal di JS sama dengan kembar jam_aturan.json", () => {
  const json = JSON.parse(readFileSync(new URL("../../public/inti/jam_aturan.json", import.meta.url), "utf8"));
  assert.equal(ATURAN.length, json.length, `jumlah entri JS=${ATURAN.length} JSON=${json.length}`);
  json.forEach((e, i) => {
    const j = ATURAN[i];
    for (const k of new Set([...Object.keys(e), ...Object.keys(j ?? {})])) {
      assert.deepEqual(j?.[k], e[k], `entri ${i} (${e.kunci}) kunci "${k}" beda: JS=${JSON.stringify(j?.[k])} JSON=${JSON.stringify(e[k])}`);
    }
  });
});

test("periksa() menolak satuan asing, asumsi tanpa catatan, kunci kembar, tanpa pasal", () => {
  const dasar = { kunci: "x", jenis: "tenggat", nilai: 1, satuan: "hari", asumsi: true, catatan: "c" };
  assert.doesNotThrow(() => periksa([dasar]));
  assert.throws(() => periksa([{ ...dasar, satuan: "minggu" }]), /satuan "minggu"/);
  assert.throws(() => periksa([{ ...dasar, catatan: undefined }]), /tanpa catatan/);
  assert.throws(() => periksa([dasar, dasar]), /kembar/);
  assert.throws(() => periksa([{ ...dasar, asumsi: false }]), /tanpa acuan/);
  assert.throws(() => periksa([{ ...dasar, asumsi: false, acuan: "perban-4-2020", letak: "Pasal 21 ayat (1)" }]), /kutipan/); // acuan ada, kutipan tidak (uji mutasi RU-006)
  assert.ok(ATURAN.length >= 11);
});
