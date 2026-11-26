// RU-006: kasus acuan fungsi murni Jam Aturan (RU §2.1, ALGORITMA §3.2).
// RU-016: kembar Python scripts/bnpb/unit/aturan.py, kasus sama di tests/bnpb/fixtures/unit/acuan.json.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ATURAN, SATUAN, aturan, hariKerja, nilai, periksa, standar, tenggat, neraca, neracaBarang, kebutuhanDasar, rekap, selisih, stokPenyangga, prRisiko, rumah, estimasiRb, AMBANG_SELISIH, MIN_PEMBANDING } from "../../public/inti/jam_aturan.js";

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
  assert.equal(tenggat("renkon_segera_hari", "2026-11-05").hasil, null); // ambang, bukan tenggat (RU-015)
  assert.equal(tenggat("std_beras_kg", "2026-11-05").hasil, null); // standar, bukan tenggat
  assert.equal(tenggat("stok_minimal_jam", "2026-11-05T08:00:00+07:00").hasil, null); // satuan jam tapi jenis standar
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
  const kunci = ["dsp_laporan_perkembangan", "dsp_spj", "renkon_berlaku", "renkon_reviu", "destana_penilaian",
    "dsp_laporan_kejadian", "laporan_pelatihan", "tlhp", "pengaduan_berkadar"]; // + hari, hari_kerja (RU-015)
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

// ---- RU-015: hari, hari_kerja, standar, kunci ALGORITMA 3.1 ----

test("hari: tanggal WIB + N hari kalender (dsp_laporan_kejadian, RU 2.1)", () => {
  assert.equal(h("dsp_laporan_kejadian", "2026-11-02"), "2026-11-05"); // laporan 5 Nov tepat waktu, 6 Nov terlambat 1 hari
  assert.equal(h("dsp_laporan_kejadian", "2026-12-30"), "2027-01-02"); // tahun berganti
  assert.equal(h("dsp_laporan_kejadian", "2026-11-02T18:00:00Z"), "2026-11-06"); // 3 Nov 01.00 WIB + 3
  assert.equal(h("r3p", "2026-08-07"), "2026-11-05");
  assert.equal(h("tlhp", "2026-01-01"), "2026-03-02");
});

test("hari_kerja: lewat akhir pekan; hasil berlabel asumsi selama libur kosong", () => {
  assert.equal(h("laporan_pelatihan", "2026-11-06"), "2026-11-17"); // Jumat + 7 hari kerja = Selasa (RU 2.1)
  assert.equal(h("pengaduan_tak_berkadar", "2026-11-06"), "2026-11-27"); // 15 hari kerja
  assert.equal(tenggat("laporan_pelatihan", "2026-11-06").asumsi, true);
  assert.equal(hariKerja("2026-11-07", 1, []), "2026-11-09"); // mulai Sabtu: Senin
  assert.equal(hariKerja("2026-11-06", 0, []), "2026-11-06");
});

test("hari_kerja: libur nasional tidak dihitung (daftar libur kasus uji, bukan data nyata)", () => {
  assert.equal(hariKerja("2026-11-06", 7, []), "2026-11-17");
  assert.equal(hariKerja("2026-11-06", 7, ["2026-11-10"]), "2026-11-18"); // Selasa libur, mundur sehari
  assert.equal(hariKerja("2026-11-06", 1, ["2026-11-09", "2026-11-10"]), "2026-11-11"); // dua libur beruntun
  assert.equal(hariKerja("2026-11-06", 1, ["2026-11-07"]), "2026-11-09"); // libur di Sabtu tak mengubah apa pun
});

test("libur_nasional dan kalender_tanpa_libur konsisten, berlabel asumsi", () => {
  const libur = aturan("libur_nasional");
  assert.equal(libur.asumsi, true);
  assert.ok(Array.isArray(libur.nilai) && libur.nilai.every((t) => /^\d{4}-\d{2}-\d{2}$/.test(t)));
  assert.equal(aturan("kalender_tanpa_libur").nilai, libur.nilai.length === 0, "kalender_tanpa_libur harus benar tepat bila libur_nasional kosong");
});

test("standar(): takaran std_*/stok_*, menolak tenggat dan ambang", () => {
  assert.deepEqual(standar("std_beras_kg"), { nilai: 0.4, satuan: "kg_orang_hari", asumsi: false });
  assert.deepEqual(standar("std_air_bersih_l").awal, { nilai: 7, hari: 3 });
  assert.equal(standar("std_air_bersih_l").nilai, 15);
  assert.equal(standar("std_jamban_jiwa").nilai, 20);
  assert.equal(standar("stok_minimal_jam").nilai, 72);
  assert.equal(standar("stok_jiwa_per_paket").nilai, 4);
  assert.throws(() => standar("dsp_spj"), /bukan standar/);
  assert.throws(() => standar("rehab_macet_hari"), /bukan standar/);
  assert.throws(() => standar("tidak_ada"), /tidak dikenal/);
});

test("kunci ALGORITMA 3.1 lengkap; asumsi wajib bertanda, bersitasi wajib berpasal", () => {
  const bersitasi = ["kaji_mulai", "trc_bergerak", "kaji_awal", "kaji_lanjutan", "dsp_laporan_kejadian", "dsp_laporan_perkembangan", "dsp_spj", "r3p",
    "renkon_berlaku", "renkon_reviu", "destana_penilaian", "destana_evaluasi", "ews_evaluasi", "ews_rapat_platform", "pengungsi_mutakhir",
    "klaster_logistik_mutakhir", "hibah_rr_lapor", "tlhp", "pengaduan_berkadar", "pengaduan_tak_berkadar", "laporan_pelatihan", "jf_jp_tahun",
    "rpbd_monev", "stok_minimal_jam", "stok_pr_umum", "stok_pr_khusus", "stok_jiwa_per_paket", "std_beras_kg", "std_air_minum_l", "std_air_bersih_l",
    "std_hunian_m2", "std_jamban_jiwa", "std_sabun_kg", "std_sampah_kk"];
  const asumsi = ["masa_status_kab", "masa_status_prov", "masa_status_nas", "renkon_segera_hari", "logistik_setuju_jam", "destana_pasif_bulan",
    "rehab_macet_hari", "hibah_logpal_lapor", "hibah_kedaluwarsa_hari", "ikd_ambang_kelas", "ews_radius_sirine_km", "evakuasi_jarak_km",
    "pr_risiko_rentang", "jam_dekat_hari", "sk_gabung_hari", "r3p_layak_rumah", "tarif_stimulan_juta", "kalender_tanpa_libur"];
  for (const k of bersitasi) { const e = aturan(k); assert.equal(e.asumsi, false, k); assert.ok(e.acuan && e.letak && e.kutipan, `${k} tanpa pasal`); }
  for (const k of asumsi) { const e = aturan(k); assert.equal(e.asumsi, true, k); assert.ok(e.catatan, `${k} asumsi tanpa catatan`); }
  for (const k of ["masa_status_kab", "masa_status_prov", "masa_status_nas"]) assert.match(aturan(k).catatan, /non-JDIH/);
  assert.deepEqual(nilai("ikd_ambang_kelas"), [0.4, 0.8]);
  assert.equal(nilai("ews_radius_sirine_km"), 2);
  assert.deepEqual(tenggat("masa_status_nas", "2025-11-30"), { hasil: "2026-02-28", alasan: null, asumsi: true });
  assert.equal(tenggat("hibah_logpal_lapor", "2025-11-30").hasil, "2026-11-30"); // RU 2.1
});

// ---- RU-016: uji kembar JS lawan Python atas acuan.json ----

const ACUAN = JSON.parse(readFileSync(new URL("./fixtures/unit/acuan.json", import.meta.url), "utf8"));
const PY = new URL("../../scripts/bnpb/unit/aturan.py", import.meta.url).pathname;
const py = (...a) => JSON.parse(execFileSync("python3", ["-I", PY, ...a], { encoding: "utf8" }));

test("acuan.json: minimal 20 kasus Jam Aturan, id unik", () => {
  const id = ACUAN.jam_aturan.map((k) => k.id);
  assert.ok(id.length >= 20, `baru ${id.length} kasus`);
  assert.equal(new Set(id).size, id.length);
});

for (const k of ACUAN.jam_aturan) {
  test(`kembar ${k.id} ${k.kunci} ${JSON.stringify(k.mulai)}: JS = harapan = Python`, () => {
    const js = tenggat(k.kunci, k.mulai);
    for (const [kk, v] of Object.entries(k.harap)) assert.deepEqual(js[kk], v, `JS ${kk}`);
    if (js.hasil === null) assert.ok(js.alasan, "hasil kosong tanpa alasan");
    assert.deepEqual(py("--kembar", k.id), js, "Python beda dengan JS");
  });
}

// Python dan JS (capSah di jam_aturan.js) sama-sama menolak tanggal/jam yang tidak ada di dalam cap waktu.
for (const k of ACUAN.jam_aturan_beda_js) {
  test(`kembar ${k.id} ${k.kunci} ${k.mulai}: tanggal tidak ada di cap waktu ditolak`, () => {
    assert.equal(tenggat(k.kunci, k.mulai).hasil, k.harap.hasil);
  });
}

test("SATUAN Python sama dengan JS", () => {
  assert.deepEqual(py("--satuan"), SATUAN);
});

// ---- RU-029: MB-5 neraca kebutuhan, JS lawan harapan lawan Python neraca.py ----

const NERACA_PY = new URL("../../scripts/bnpb/unit/neraca.py", import.meta.url).pathname;
const pyNeraca = (id) => JSON.parse(execFileSync("python3", ["-I", NERACA_PY, "--kembar", id], { encoding: "utf8" }));
const JS_FUNGSI = {
  neraca: (m) => neraca(m.butuh, m.ada),
  kebutuhan: (m) => kebutuhanDasar(m.jiwa, m.hari_sejak_buka, m.kk),
  rekap: (m) => rekap(m.tempat, m.tanggal),
  selisih: (m) => selisih(m.pusat, m.daerah),
  stok_penyangga: (m) => stokPenyangga(m.jp, m.pr, m.balita),
  pr_risiko: (m) => prRisiko(m.terpapar_tinggi, m.jp),
  rumah: (m) => rumah(m.lapor, m.verif),
  estimasi_rb: (m) => estimasiRb(m.lapor_rb, m.rasio_pembanding),
};
const dekat = (a, b, jalur, rel) => {
  if (b !== null && typeof b === "object") {
    for (const [k, v] of Object.entries(b)) dekat(a?.[k], v, `${jalur}.${k}`, rel);
  } else if (typeof b === "number" && typeof a === "number") {
    assert.ok(Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${jalur}: ${a} harap ${b}`);
  } else assert.deepEqual(a, b, jalur);
};

test("acuan.json neraca: kasus S, K, R lengkap, id unik", () => {
  const id = ACUAN.neraca.map((k) => k.id);
  assert.equal(new Set(id).size, id.length);
  for (const x of ["S1", "S11", "K1", "K5b", "R1", "R4b"]) assert.ok(id.includes(x), x);
  for (const k of ACUAN.neraca) assert.ok(JS_FUNGSI[k.fungsi], `fungsi ${k.fungsi} tanpa kembar JS`);
});

for (const k of ACUAN.neraca) {
  test(`kembar neraca ${k.id} ${k.fungsi}: JS = harapan = Python`, () => {
    const js = JS_FUNGSI[k.fungsi](k.masukan);
    dekat(js, k.harap, `JS ${k.id}`, 1e-5); // harapan dibulatkan di acuan.json
    dekat(js, pyNeraca(k.id), `JS/Python ${k.id}`, 1e-9);
    dekat(pyNeraca(k.id), js, `Python/JS ${k.id}`, 1e-9);
    assert.deepEqual(Object.keys(js).sort(), Object.keys(pyNeraca(k.id)).sort(), "kunci hasil beda");
    assert.ok(!JSON.stringify(js).includes("aman"), "kata terlarang");
  });
}

test("neraca JS: kosong null bukan 0, masukan negatif atau bukan angka ditolak", () => {
  const nb = neracaBarang({ beras_kg: 6000, air_minum_l: 37500 }, { beras_kg: 4500 });
  assert.equal(nb.beras_kg.status, "kurang");
  assert.equal(nb.air_minum_l.status, "belum_dilaporkan");
  assert.equal(nb.air_minum_l.celah, null);
  for (const salah of [-1, "500000", NaN, Infinity, true, undefined]) assert.throws(() => stokPenyangga(salah, 1), /harus/);
  assert.throws(() => stokPenyangga(0, 1));
  assert.throws(() => neraca(10, -1));
  assert.throws(() => neraca(10, "4"));
  assert.throws(() => kebutuhanDasar(10, 0, 0)); // kk 0, jiwa > 0
  assert.throws(() => kebutuhanDasar(10.5, 0, 3));
  assert.throws(() => kebutuhanDasar(10, -1, 3));
  assert.equal(kebutuhanDasar(1, 2, 1).air_bersih_l, 7); // hari ke-3
  assert.equal(kebutuhanDasar(1, 3, 1).air_bersih_l, 15); // hari ke-4
  const r = rumah({ RB: 0, RS: 5 }, { RB: 0 });
  assert.equal(r.susut_rb, null);
  assert.equal(r.beban_lapor_juta, null);
  assert.equal(r.kemajuan, null);
  assert.throws(() => rekap([], "2026-02-30"), /bukan tanggal/);
});

test("invarian PLP-1 JS: PR 4% = 4 x PR 1%", () => {
  for (const jp of [1, 17, 500000, 1057750, 12345678]) {
    const a = stokPenyangga(jp, 1, Math.floor(jp / 10)), b = stokPenyangga(jp, 4, Math.floor(jp / 10));
    for (const [k, v] of Object.entries(a)) if (k !== "pr" && k !== "hari") assert.ok(Math.abs(b[k] - 4 * v) <= 1e-9 * Math.max(1, b[k]), `${jp} ${k}`);
  }
});

test("konstanta ambang JS sama dengan neraca.py", () => {
  const src = readFileSync(NERACA_PY, "utf8");
  assert.equal(+/^AMBANG_SELISIH = ([\d.]+)/m.exec(src)[1], AMBANG_SELISIH);
  assert.equal(+/^MIN_PEMBANDING = (\d+)/m.exec(src)[1], MIN_PEMBANDING);
  for (const l of ["LABEL_SELISIH", "LABEL_PR_RISIKO"]) {
    const t = new RegExp(`^${l} = "([^"]+)"`, "m").exec(src)[1];
    const js = l === "LABEL_SELISIH" ? selisih(1, 2).label : prRisiko(1, 1).label;
    assert.equal(js, t, l);
  }
});
