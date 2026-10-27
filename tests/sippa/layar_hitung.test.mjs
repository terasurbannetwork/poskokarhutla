/* SP-033: logika murni layar Hitung (RU §2.3 H1-H6): batas masukan, query tautan, vonis, kartu angka, grafik. DOM tidak disentuh. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {hidraulika, KONST, KELAS_POMPA} from "../../public/pipa/hitung.js";
import * as L from "../../public/pipa/layar_hitung.js";

const ACUAN = JSON.parse(readFileSync(new URL("./fixtures/acuan.json", import.meta.url), "utf8"));
const SUMBER = readFileSync(new URL("../../public/pipa/layar_hitung.js", import.meta.url), "utf8");
const bawaan = () => L.nilaiBawaan();
const hitung = n => hidraulika(L.keHidraulika(n));
const angka = L.MEDAN.filter(m => m.jenis === "angka");

test("nilaiBawaan: debit 300 L/min, 8 lance, debit pemakai lain 0 dan hasilnya KONDISIONAL", () => {
  const n = bawaan();
  assert.equal(n.q_lpm, 300); assert.equal(n.n_lance, 8); assert.equal(n.serap_lain_lpm, 0);
  assert.equal(L.ringkasVonis(hitung(n), n).kata, "KONDISIONAL");
});

test("H1: masukan K1 = NO-GO merah dengan pesan H-TEKANAN berangka id-ID", () => {
  const k = ACUAN.find(x => x.id === "H1");
  const n = {...bawaan(), ...k.masukan, od_mm: 160, pompa: null};
  const r = L.ringkasVonis(hitung(n), n);
  assert.equal(r.kata, "NO-GO"); assert.equal(r.kelas, "nogo");
  assert.match(r.gerbang[0].pesan, /^Tekanan 12,5 bar melewati batas kerja 11,1 bar/);
  assert.equal(r.gerbang[0].kode, "H-TEKANAN"); assert.equal(r.gerbang[0].tingkat, "keras");
});

test("kasus ajar: 600 L/min dengan 8 lance = NO-GO H-SERAP dan pesan menyebut debit dan serapan", () => {
  const n = {...bawaan(), q_lpm: 600};
  const r = L.ringkasVonis(hitung(n), n);
  assert.equal(r.kata, "NO-GO");
  assert.ok(r.gerbang.some(g => g.kode === "H-SERAP" && /600 L\/min tidak terserap 8 lance \(paling banyak 320 L\/min\)/.test(g.pesan)));
});

test("ringkasVonis: HOLD dan KONDISIONAL tanpa hambatan memakai kalimat PRD; tidak pernah GO", () => {
  const h = {...bawaan(), pompa: null, sisa_bar: 1.5};
  const r = L.ringkasVonis(hitung(h), h);
  assert.equal(r.kata, "HOLD"); assert.equal(r.kelas, "hold");
  const b = bawaan(), s = L.ringkasVonis(hitung(b), b);
  assert.equal(s.kata, "KONDISIONAL");
  assert.match(s.alasan, /KONDISIONAL tetap butuh uji lapangan \(G2, G3\)/);
  for (const n of [b, h, {...b, q_lpm: 3000}]) assert.notEqual(L.ringkasVonis(hitung(n), n).kata, "GO");
});

test("H2: kedalaman 5,1 ditolak dengan pesan PRD dan 5 m diterima; hasil tidak dihitung dari nilai tertolak", () => {
  const m = L.MEDAN.find(x => x.k === "dalam_m");
  assert.equal(m.maks, KONST.dalam_maks_m);
  assert.deepEqual(L.cekMedan(m, "5,1"), {galat: "Injeksi lebih dari 5 m tidak termasuk SIPPA (keputusan 50)"});
  assert.deepEqual(L.cekMedan(m, "5"), {nilai: 5});
  const t = L.terapkan({dalam_m: "5,1", q_lpm: "400"}, bawaan());
  assert.equal(t.nilai.dalam_m, 1.5, "nilai tertolak tidak menimpa nilai sah terakhir");
  assert.equal(t.nilai.q_lpm, 400);
  assert.match(t.galat.dalam_m, /keputusan 50/);
  assert.deepEqual(t.lama, ["dalam_m"]);
});

test("H3: kedalaman 3 sampai 5 m = pil lengan uji; di bawah 3 m tidak", () => {
  for (const d of [3, 4, 5]) { const n = {...bawaan(), dalam_m: d}; assert.equal(L.ringkasVonis(hitung(n), n).lengan_uji, true, `${d} m`); }
  for (const d of [0, 1.5, 2.9]) { const n = {...bawaan(), dalam_m: d}; assert.equal(L.ringkasVonis(hitung(n), n).lengan_uji, false, `${d} m`); }
});

test("H4: tiap medan angka ditolak di bawah rentang, di atas rentang, bukan angka, dan kosong pada medan wajib", () => {
  assert.ok(angka.length >= 20, `hanya ${angka.length} medan angka`);
  for (const m of angka) {
    if (m.min > 0 || m.k === "dalam_m" || m.k === "dz_m") { const bawah = m.k === "dalam_m" ? "-0,1" : String(m.min - 1).replace(".", ","); assert.ok(L.cekMedan(m, bawah).galat, `${m.k} di bawah rentang lolos`); }
    assert.ok(L.cekMedan(m, String(m.maks + 1)).galat, `${m.k} di atas rentang lolos`);
    assert.match(L.cekMedan(m, "abc").galat, /harus berupa angka/, `${m.k} bukan angka lolos`);
    const kosong = L.cekMedan(m, "  ");
    if (m.opsional) assert.deepEqual(kosong, {nilai: null}, `${m.k} opsional kosong`); else assert.match(kosong.galat, /wajib diisi/, `${m.k} wajib kosong lolos`);
    assert.equal(L.cekMedan(m, String(m.min)).nilai, m.min, `${m.k} batas bawah ditolak`); assert.equal(L.cekMedan(m, String(m.maks)).nilai, m.maks, `${m.k} batas atas ditolak`);
  }
});

test("H4: pesan rentang memuat angka id-ID, satuan, dan rentangnya", () => {
  assert.equal(L.cekMedan(L.MEDAN.find(x => x.k === "q_lpm"), "3500").galat, "Debit 3.500 L/min di luar rentang 50–3.000 L/min");
  assert.equal(L.cekMedan(L.MEDAN.find(x => x.k === "n_lance"), "2,5").galat, "Jumlah lance aktif harus bilangan bulat");
});

test("H4: rentang di klien sama dengan fungsi murni: batas bawah dan atas tiap medan tidak membuat hidraulika melempar", () => {
  for (const m of angka) for (const v of [m.min, m.maks]) {
    const n = {...bawaan(), [m.k]: v};
    if (m.k === "hari" || m.k === "qeko_ls" || m.k === "stok_m3") n.q95_ls = 10;
    assert.doesNotThrow(() => hitung(n), `${m.k} = ${v}`);
  }
});

test("angkaId: koma desimal, titik ribuan, dan yang meragukan ditolak", () => {
  assert.equal(L.angkaId("1.000"), 1000); assert.equal(L.angkaId("1.234,5"), 1234.5); assert.equal(L.angkaId("0,65"), 0.65);
  assert.equal(L.angkaId("0.65"), 0.65); assert.equal(L.angkaId("-2"), -2);
  for (const x of ["", "abc", "1,2,3", "1e3", "12abc", "Infinity", "1..2"]) assert.ok(Number.isNaN(L.angkaId(x)), x);
});

test("H5: round-trip query memulihkan semua masukan dan hasil identik", () => {
  const n = {...bawaan(), bahan: "hdpe", od_mm: 200, sdr: 17, L_m: 2345.5, q_lpm: 450, dz_m: -3.5, K: 7, dalam_m: 4, id_datasheet_mm: 98, q95_ls: 12, qeko_ls: 2, stok_m3: 500, hari: 20,
    pompa: "tekanan_tinggi", n_pompa: 2, perimeter_aktif: true, kompleks: "K0042", dz_sumber: "dsm"};
  const q = L.keQuery(n);
  assert.deepEqual(L.dariQuery("?" + q).nilai, n);
  assert.deepEqual(hitung(L.dariQuery(q).nilai), hitung(n));
  assert.deepEqual(L.dariQuery("").nilai, bawaan());
});

test("H5: query liar dibuang per medan, bukan seluruhnya; kedalaman 6 m di tautan tidak pernah dihitung", () => {
  const r = L.dariQuery("?q_lpm=500&dalam_m=6&bahan=baja&pompa=tidak_ada&n_lance=abc&kompleks=<script>");
  assert.equal(r.nilai.q_lpm, 500); assert.equal(r.nilai.dalam_m, 1.5); assert.equal(r.nilai.bahan, "layflat");
  assert.equal(r.nilai.pompa, "ve1500"); assert.equal(r.nilai.n_lance, 8); assert.equal(r.nilai.kompleks, null);
  assert.deepEqual(Object.keys(r.galat).sort(), ["dalam_m", "n_lance"]);
});

test("P7: masukanKompleks mengisi L = jarak air x 1,2 dan dz = -(beda elevasi) dengan catatan DSM; di luar rentang dijepit dan dilaporkan", () => {
  const k = {id: "K0001", air_km_semua: 1.49, beda_air_m: -12.5};
  const r = L.masukanKompleks(k);
  assert.equal(r.kompleks, "K0001"); assert.equal(r.dz_sumber, "dsm");
  assert.ok(Math.abs(r.L_m - 1.49 * 1000 * KONST.liku_trase) < 1e-9); assert.equal(r.dz_m, 12.5);
  const jauh = L.masukanKompleks({id: "K0002", air_km_semua: 16, beda_air_m: -80});
  assert.equal(jauh.L_m, 5000); assert.equal(jauh.dz_m, 50); assert.ok(jauh.dijepit.includes("L_m") && jauh.dijepit.includes("dz_m"));
  assert.equal(L.masukanKompleks({id: "K0003", air_km_semua: null, beda_air_m: null}).L_m, undefined, "tanpa jarak air tidak mengarang L");
  const n = {...bawaan(), ...L.masukanKompleks(k)};
  assert.ok(hitung(n).gerbang.some(g => g.kode === "H-DSM"));
});

test("kartuAngka: sembilan angka PRD dengan id-ID, satuan, dan pil keyakinan; tekanan lewat batas bertanda lewat", () => {
  const n = bawaan(), a = L.kartuAngka(hitung(n), n);
  assert.deepEqual(a.map(x => x.k), ["p_pompa", "p_ujung", "tdh", "v", "kw", "bbm", "co2", "isi", "tiba"]);
  assert.equal(a.find(x => x.k === "p_pompa").nilai, "4,2 bar");
  assert.equal(a.find(x => x.k === "p_ujung").nilai, "8,8 bar");
  assert.equal(a.find(x => x.k === "tiba").nilai, "24 menit");
  for (const x of a) { assert.ok(x.yakin, x.k); assert.ok(x.sumber, x.k); }
  const k = ACUAN.find(y => y.id === "H1"), m = {...bawaan(), ...k.masukan, od_mm: 160, pompa: null};
  assert.equal(L.kartuAngka(hitung(m), m).find(x => x.k === "p_pompa").nada, "lewat");
});

test("svgTekanan: garis per 50 m, batas dan 2 bar berlabel, tabel .sr; teks data di-escape", () => {
  const n = bawaan(), h = hitung(n), s = L.svgTekanan(h, n);
  assert.match(s, /^<svg class="sp-grafik"/); assert.match(s, /batas 10,6 bar/); assert.match(s, /2 bar/);
  assert.equal((s.match(/<circle/g) || []).length, h.profil.length);
  assert.match(s, /role="img"/); assert.match(s, /<title/); assert.match(s, /<desc/);
  assert.doesNotMatch(s, /NaN|undefined|Infinity/);
});

test("svgHeadloss: enam diameter pada debit terpilih, satu batang per diameter, nilai id-ID", () => {
  const n = {...bawaan(), q_lpm: 300}, s = L.svgHeadloss(n);
  for (const d of ["DN65", "DN100", "DN150", "OD110", "OD160", "OD200"]) assert.ok(s.includes(d), d);
  assert.equal((s.match(/class="sp-batang/g) || []).length, 6);
  assert.doesNotMatch(s, /NaN|undefined|Infinity/);
  const kecil = L.headlossPerDiameter(n);
  assert.ok(kecil.find(x => x.n === "DN65").hf > kecil.find(x => x.n === "DN150").hf, "diameter lebih kecil = head loss lebih besar");
});

test("headlossPerDiameter: nilai DN100 sama dengan hidraulika() untuk trase 1 km dan C masukan", () => {
  const n = {...bawaan(), L_m: 1000, id_datasheet_mm: null, K: 0}, h = hidraulika({...L.keHidraulika(n), dn_mm: 100, K: 0, L_m: 1000});
  const d = L.headlossPerDiameter(n).find(x => x.n === "DN100");
  assert.ok(Math.abs(d.hf - h.hf_m) < 1e-9, `${d.hf} vs ${h.hf_m}`);
});

test("keHidraulika: layflat memakai DN, HDPE memakai OD; neraca air hanya bila Q95 diisi", () => {
  const a = L.keHidraulika({...bawaan(), bahan: "hdpe", od_mm: 160});
  assert.equal(a.bahan, "hdpe"); assert.equal(a.od_mm, 160);
  assert.equal(L.keHidraulika(bawaan()).sumber, null);
  const b = L.keHidraulika({...bawaan(), q95_ls: 8});
  assert.deepEqual(b.sumber, {q95_ls: 8, qeko_ls: 0, stok_m3: 0, hari: 30, evap_m3_hari: 0});
});

test("eksporAcuan: masukan dan hasil dalam bentuk kasus acuan.json, tanpa jejak tampilan", () => {
  const n = bawaan(), h = hitung(n), e = L.eksporAcuan(n, h);
  assert.equal(e.fungsi, "hidraulika"); assert.deepEqual(e.masukan, L.keHidraulika(n));
  for (const k of ["id_mm", "tdh_m", "p_pompa_bar", "p_ujung_bar", "vonis"]) assert.ok(k in e.harap, k);
  assert.equal(e.harap.vonis, h.vonis); assert.ok(Array.isArray(e.harap.gerbang));
  assert.equal(hidraulika(e.masukan).vonis, e.harap.vonis);
});

test("bolehSkenario dan bolehEkspor: skenario menunggu SP-035; ekspor hanya Admin", () => {
  assert.equal(L.bolehEkspor("M"), true); assert.equal(L.bolehEkspor("W"), false); assert.equal(L.bolehEkspor("B"), false);
  assert.equal(L.bolehSkenario("W", false).aktif, false);
  assert.match(L.bolehSkenario("W", false).alasan, /belum tersedia/i);
  assert.equal(L.bolehSkenario("W", true).aktif, true); assert.equal(L.bolehSkenario("B", true).aktif, false);
});

test("H6: grafik digambar lewat nanti(), tidak langsung di handler input; tanpa fetch tanpa abort", () => {
  assert.match(SUMBER, /nanti\(/);
  const pasang = SUMBER.slice(SUMBER.indexOf("export async function pasang"));
  assert.match(pasang, /AbortController/);
  assert.match(pasang, /svgTekanan\([^)]*\)[\s\S]{0,400}/);
  const handler = /function saatMasukan\(e\) \{([\s\S]*?)\n  \}/.exec(pasang);
  assert.ok(handler, "handler input tidak ditemukan");
  assert.doesNotMatch(handler[1], /svgTekanan|svgHeadloss/, "grafik digambar sinkron di handler input");
});

test("pilIsian: ID asumsi bila datasheet kosong, DSM dari kompleks, lengan uji dari 3 m", () => {
  const n = bawaan(), h = hitung(n);
  assert.match(L.pilIsian(n, h).id_datasheet_mm.teks, /^ID = 0,96 x DN$/);
  assert.equal(L.pilIsian({...n, id_datasheet_mm: 98}, h).id_datasheet_mm, undefined);
  assert.equal(L.pilIsian({...n, bahan: "hdpe"}, h).id_datasheet_mm, undefined);
  assert.equal(L.pilIsian({...n, dz_sumber: "dsm"}, h).dz_m.kelas, "estimasi-model");
  assert.equal(L.pilIsian({...n, dalam_m: 3}, h).dalam_m.teks, "Lengan uji"); assert.equal(L.pilIsian({...n, dalam_m: 2.9}, h).dalam_m, undefined);
});

test("teks tampil: tanpa em dash, tanpa kata terbukti, tanpa toFixed", () => {
  assert.doesNotMatch(SUMBER, /[—·]|terbukti|toFixed\(/);
});

test("tabelProfil: satu baris per titik profil, angka id-ID, tanpa NaN", () => {
  const n = bawaan(), h = hitung(n), t = L.tabelProfil(h);
  assert.equal((t.match(/<tr>/g) || []).length, h.profil.length + 1, "kepala + satu baris per titik");
  assert.match(t, /<td class="n">1\.000<\/td>/); assert.doesNotMatch(t, /NaN|undefined/);
});
