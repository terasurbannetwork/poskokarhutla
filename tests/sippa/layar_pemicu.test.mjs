/* SP-043: logika murni layar Pemicu /pipa/pemicu (PRD §9.4.4, DS §4.4, DT §5.4): tingkat, basi, ringkasan, kit terdekat, deret 7 hari, HTML tanpa DOM.
   Rute data (/api/sippa/data/pemicu, SP-029) belum ada di worker: layar dibangun terhadap kontrak DT §3.1.6 dan dijaga fixture di sini. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

(0, eval)(readFileSync(new URL("../../public/inti/format.js", import.meta.url), "utf8").replace(/^"use strict";?/, "") + ";globalThis.fmt=fmt;globalThis.esc=esc;globalThis.jamWIB=jamWIB;");

const P = await import("../../public/pipa/layar_pemicu.js");
const {tingkatPemicu} = await import("../../public/pipa/hitung.js");
const NYATA = JSON.parse(readFileSync(new URL("../../data/sippa/keluaran/pemicu.json", import.meta.url), "utf8"));

const baris = (kab, tingkat, o = {}) => ({prov: "62", kab, tingkat, wilayah_iklim: "kalbar_kalteng", musim: "SON 2026", anom_pct: -29.5, anom_p10: -45.6, anom_p90: -13.3, hari_ps50: 4, titik_panas_zona_ab: 0, alasan: ["a"], ...o});
const SEGAR = {dibuat: "2026-10-25T07:00+07:00", ansambel_dibuat: "2026-10-25T02:00+07:00", titik24_acuan: "2026-10-25T05:00:00+00:00", basi: {ansambel: false, titik24: false}};
const KINI = Date.parse("2026-10-25T08:00+07:00");

test("tingkatJelajah: ambang bawaan sama dengan tingkatPemicu pada T1 sampai T4 dan sebelas masukan sapuan", () => {
  const T = [[-29.5, 4, 0, false, false], [-29.5, 4, 2, false, false], [-29.5, 4, 2, true, false], [-12, 7, 5, false, false]];
  for (const [anom_pct, hari_ps50, titik_ab, basi_ansambel, basi_titik] of T) {
    const x = {anom_pct, hari_ps50, titik_ab, basi_ansambel, basi_titik};
    assert.equal(P.tingkatJelajah(x, P.AMBANG_BAWAAN), tingkatPemicu(x));
  }
  for (let a = -40; a <= 0; a += 5) for (let h = 0; h <= 7; h++) for (const t of [0, 1, 3]) {
    const x = {anom_pct: a, hari_ps50: h, titik_ab: t, basi_ansambel: false, basi_titik: false};
    assert.equal(P.tingkatJelajah(x, P.AMBANG_BAWAAN), tingkatPemicu(x), `a=${a} h=${h} t=${t}`);
  }
  assert.equal(P.tingkatJelajah({anom_pct: null, hari_ps50: 7, titik_ab: 9}, P.AMBANG_BAWAAN), "NORMAL");
});

test("tingkatJelajah: ambang digeser memindahkan tingkat tepat di tepi, tanpa mengubah ambang bawaan", () => {
  const x = {anom_pct: -12, hari_ps50: 4, titik_ab: 2, basi_ansambel: false, basi_titik: false};
  assert.equal(P.tingkatJelajah(x, P.AMBANG_BAWAAN), "NORMAL");
  assert.equal(P.tingkatJelajah(x, {...P.AMBANG_BAWAAN, siaga_anom_pct: -12}), "GELAR");
  assert.equal(P.tingkatJelajah(x, {siaga_anom_pct: -12, pra_hari: 5, gelar_titik: 1}), "SIAGA");
  assert.equal(P.tingkatJelajah(x, {siaga_anom_pct: -12, pra_hari: 4, gelar_titik: 3}), "PRA-POSISI");
  assert.equal(P.tingkatJelajah({...x, basi_ansambel: true}, {...P.AMBANG_BAWAAN, siaga_anom_pct: -12}), "SIAGA", "basi ansambel menahan di SIAGA walau ambang longgar");
  assert.deepEqual(P.AMBANG_BAWAAN, {siaga_anom_pct: -20, pra_hari: 3, gelar_titik: 1});
});

test("basiAnsambel: bendera berkas atau umur lebih dari 36 jam; tepat 36 jam belum basi", () => {
  assert.equal(P.basiAnsambel(SEGAR, KINI), false);
  assert.equal(P.basiAnsambel({...SEGAR, basi: {ansambel: true, titik24: false}}, KINI), true, "bendera server menang");
  assert.equal(P.basiAnsambel(SEGAR, Date.parse("2026-10-26T14:00+07:00")), false, "tepat 36 jam");
  assert.equal(P.basiAnsambel(SEGAR, Date.parse("2026-10-26T14:01+07:00")), true);
  assert.equal(P.basiAnsambel({...SEGAR, ansambel_dibuat: null}, KINI), true, "tanpa waktu dibuat = basi, bukan segar diam-diam");
  assert.equal(P.basiTitik(SEGAR, KINI), false);
  assert.equal(P.basiTitik({...SEGAR, basi: {ansambel: false, titik24: true}}, KINI), true);
});

test("tingkatTampil: ansambel basi memadamkan PRA-POSISI dan GELAR menjadi tanda strip bersebab; SIAGA tetap tampil", () => {
  assert.deepEqual(P.tingkatTampil("PRA-POSISI", false), {kunci: "PRA-POSISI", teks: "PRA-POSISI", basi: false});
  assert.deepEqual(P.tingkatTampil("GELAR", true), {kunci: "basi", teks: "–, data ansambel basi", basi: true});
  assert.deepEqual(P.tingkatTampil("PRA-POSISI", true), {kunci: "basi", teks: "–, data ansambel basi", basi: true});
  assert.deepEqual(P.tingkatTampil("SIAGA", true), {kunci: "SIAGA", teks: "SIAGA", basi: true});
  assert.deepEqual(P.tingkatTampil("NORMAL", true), {kunci: "NORMAL", teks: "NORMAL", basi: false});
});

test("ringkasPemicu: kalimat judul memuat jumlah per tingkat dan prakiraan wilayah dengan angka koma", () => {
  const b = [baris("A", "PRA-POSISI"), baris("B", "PRA-POSISI"), ...["C", "D", "E", "F", "G"].map(k => baris(k, "SIAGA"))];
  assert.equal(P.ringkasPemicu(b, false), "2 kabupaten di PRA-POSISI, 5 di SIAGA; prakiraan Kalbar-Kalteng SON 2026 -29,5% dari normal");
  assert.equal(P.ringkasPemicu([baris("A", "GELAR"), baris("B", "PRA-POSISI")], false), "1 kabupaten di GELAR, 1 di PRA-POSISI; prakiraan Kalbar-Kalteng SON 2026 -29,5% dari normal");
  assert.equal(P.ringkasPemicu(b.slice(2), true), "5 kabupaten di SIAGA, PRA-POSISI dan GELAR tidak dihitung karena data ansambel basi; prakiraan Kalbar-Kalteng SON 2026 -29,5% dari normal");
  assert.equal(P.ringkasPemicu([baris("A", "NORMAL", {anom_pct: -3})], false), "Semua 1 kabupaten NORMAL; prakiraan Kalbar-Kalteng SON 2026 -3% dari normal");
  assert.equal(P.ringkasPemicu([], false), "Belum ada kabupaten dengan kompleks zona A atau B di provinsi ini");
});

test("ringkasPemicu: dua wilayah iklim ditulis keduanya; anomali kosong tidak ditulis angka", () => {
  const t = P.ringkasPemicu([baris("A", "SIAGA"), baris("B", "SIAGA", {wilayah_iklim: "sumatera_selatan", anom_pct: -21})], false);
  assert.match(t, /Kalbar-Kalteng SON 2026 -29,5% dari normal/);
  assert.match(t, /Sumatera-Selatan SON 2026 -21% dari normal/);
  assert.ok(!/null|NaN|undefined/.test(P.ringkasPemicu([baris("A", "NORMAL", {anom_pct: null, musim: null})], false)));
});

test("jarakKm dan kitTerdekat: haversine, kit hilang dan pensiun dan tanpa titik dilewati, yang terdekat menang", () => {
  assert.ok(Math.abs(P.jarakKm(-2.2, 113.9, -2.2, 114.9) - 111.2 * Math.cos(2.2 * Math.PI / 180)) < 0.6);
  assert.equal(P.jarakKm(-2, 113, -2, 113), 0);
  const kits = [{id: "a", kode: "SIPPA-001", status: "hilang", lat: -2.2, lon: 113.9}, {id: "b", kode: "SIPPA-002", status: "gudang", lat: -2.4, lon: 114.0}, {id: "c", kode: "SIPPA-003", status: "depot", lat: -2.9, lon: 114.5},
    {id: "d", kode: "SIPPA-004", status: "gudang", lat: null, lon: null}, {id: "e", kode: "SIPPA-005", status: "pensiun", lat: -2.2, lon: 113.9}];
  const t = P.kitTerdekat(kits, -2.2, 113.9);
  assert.equal(t.kit.kode, "SIPPA-002");
  assert.ok(t.km > 20 && t.km < 40, `jarak ${t.km}`);
  assert.equal(P.kitTerdekat(kits, -2.2, 113.9, k => k.status === "depot").kit.kode, "SIPPA-003");
  assert.equal(P.kitTerdekat([], -2.2, 113.9), null);
  assert.equal(P.kitTerdekat(kits, null, null), null, "tanpa titik kabupaten tidak menebak");
});

test("pusatKab: rerata kompleks zona A dan B versi konservatif per kabupaten, zona lain tidak ikut", () => {
  const k = (id, kab, lat, lon, z) => ({id, prov: "62", kab, lat, lon, zona_k: z});
  const m = P.pusatKab([k("K1", "X", -2, 113, "A"), k("K2", "X", -4, 115, "B"), k("K3", "X", -50, 50, "D"), k("K4", "Y", -1, 112, "C")]);
  assert.deepEqual([...m.keys()], ["62|X"]);
  const x = m.get("62|X");
  assert.equal(x.lat, -3); assert.equal(x.lon, 114); assert.equal(x.titik.length, 2);
});

test("seriPs: sel 0,5 derajat yang memuat kompleks dengan hari P >= 0,5 terbanyak; hariPs sama dengan hari_ps50 pemicu.py", () => {
  const sel = (lat, lon, ps) => ({lat, lon, ps});
  const grid = [sel(-2.25, 113.25, [0.6, 0.5, 0.9, 0.7, 0.1, 0, 0]), sel(-2.25, 113.75, [0.9, 0.9, 0.1, 0.1, 0, 0, 0]), sel(5, 5, [1, 1, 1, 1, 1, 1, 1])];
  const s = P.seriPs(grid, [[-2.1, 113.4], [-2.2, 113.6]]);
  assert.deepEqual(s, [0.6, 0.5, 0.9, 0.7, 0.1, 0, 0]);
  assert.equal(P.hariPs(s), 4);
  assert.equal(P.seriPs(grid, [[-2.1, 112.9]]), null, "luar semua sel = tanpa deret, bukan nol");
  assert.equal(P.seriPs(grid, [[-2.0, 113.5]])?.length, 7, "tepat 0,25 derajat dari pusat sel masuk (jendela ketat seperti pemicu.py)");
  assert.equal(P.hariPs(null), null);
});

test("seriPs: data nyata pemicu.json cocok dengan deret fwi_ansambel.json untuk tiap kabupaten (hari_ps50 sama)", () => {
  const kk = JSON.parse(readFileSync(new URL("../../data/sippa/keluaran/kelayakan_kompleks.json", import.meta.url), "utf8"));
  const ans = JSON.parse(readFileSync(new URL("../../public/data/fwi_ansambel.json", import.meta.url), "utf8"));
  const pusat = P.pusatKab(kk.kompleks);
  let cocok = 0;
  for (const b of NYATA.baris) {
    const s = P.seriPs(ans.grid, pusat.get(`${b.prov}|${b.kab}`).titik);
    assert.equal(P.hariPs(s), b.hari_ps50, `${b.kab}: hari P >= 0,5 dari deret ${P.hariPs(s)} bukan ${b.hari_ps50} di pemicu.json`);
    cocok++;
  }
  assert.ok(cocok >= 10, `hanya ${cocok} kabupaten dicocokkan`);
});

test("kitUntukRencana: hanya kit gudang tanpa gerak terbuka, terdekat, dan hanya untuk peran tulis", () => {
  const kits = [{id: "a", kode: "SIPPA-001", status: "gudang", lat: -2.3, lon: 114, gerak_buka: {ke_status: "depot"}}, {id: "b", kode: "SIPPA-002", status: "depot", lat: -2.3, lon: 114},
    {id: "c", kode: "SIPPA-003", status: "gudang", lat: -3, lon: 114.5}, {id: "d", kode: "SIPPA-004", status: "gudang", lat: -9, lon: 100}];
  assert.equal(P.kitUntukRencana(kits, -2.2, 113.9, "W").kit.kode, "SIPPA-003");
  assert.equal(P.kitUntukRencana(kits, -2.2, 113.9, "M").kit.kode, "SIPPA-003");
  assert.equal(P.kitUntukRencana(kits, -2.2, 113.9, "B"), null, "peran baca tidak diberi tombol");
  assert.equal(P.kitUntukRencana([kits[0], kits[1]], -2.2, 113.9, "W"), null);
});

const KIT = [{id: "0123456789abcdef", kode: "SIPPA-001", status: "gudang", lat: -2.5, lon: 114, lokasi: "Palangka <b>Raya</b>", gerak_buka: null}, {id: "fedcba9876543210", kode: "SIPPA-002", status: "depot", lat: -3, lon: 114.2, lokasi: "Pulang Pisau", gerak_buka: null}];
const PUSAT = new Map([["62|Pulang Pisau", {lat: -2.8, lon: 114.1, titik: [[-2.8, 114.1]]}]]);

test("barisModel: tingkat tampil, kit terdekat, depot, dan tombol rencana hanya di PRA-POSISI atau GELAR untuk peran tulis", () => {
  const b = [baris("Pulang Pisau", "PRA-POSISI"), baris("Kapuas", "SIAGA")];
  const m = P.barisModel({baris: b, basi: {ansambel: false, titik24: false}, ...SEGAR}, {pusat: PUSAT, kits: KIT, peran: "W", kini: KINI});
  assert.equal(m[0].tampil.teks, "PRA-POSISI");
  assert.equal(m[0].kit.kit.kode, "SIPPA-002", "terdekat dari pusat kabupaten");
  assert.equal(m[0].depot.kit.kode, "SIPPA-002");
  assert.equal(m[0].rencana.kit.kode, "SIPPA-001", "hanya kit gudang yang bisa dijadwalkan ke depot");
  assert.equal(m[1].rencana, null, "SIAGA tidak diberi tombol");
  assert.equal(m[1].kit, null, "kabupaten tanpa pusat tidak menebak jarak");
  const baca = P.barisModel({baris: b, ...SEGAR}, {pusat: PUSAT, kits: KIT, peran: "B", kini: KINI});
  assert.equal(baca[0].rencana, null);
});

test("barisModel: ansambel basi memadamkan tingkat dan hari P; jelajah menghitung ulang dengan ambang yang digeser", () => {
  const d = {baris: [baris("Pulang Pisau", "SIAGA", {hari_ps50: 6, titik_panas_zona_ab: 2})], ...SEGAR, basi: {ansambel: true, titik24: false}};
  const m = P.barisModel(d, {pusat: PUSAT, kits: KIT, peran: "W", kini: KINI});
  assert.equal(m[0].tampil.kunci, "SIAGA"); assert.equal(m[0].tampil.basi, true);
  assert.equal(m[0].hari, null, "hari P dari ansambel basi tidak ditampilkan sebagai angka");
  const segar = {...d, basi: {ansambel: false, titik24: false}};
  assert.equal(P.barisModel(segar, {pusat: PUSAT, kits: KIT, peran: "W", kini: KINI, ambang: {...P.AMBANG_BAWAAN, pra_hari: 7}})[0].tampil.kunci, "SIAGA", "ambang hari 7 menahan di SIAGA");
  assert.equal(P.barisModel(segar, {pusat: PUSAT, kits: KIT, peran: "W", kini: KINI, ambang: P.AMBANG_BAWAAN})[0].tampil.kunci, "GELAR");
  assert.equal(P.barisModel({...segar, baris: [baris("Pulang Pisau", "NORMAL", {anom_pct: -10, hari_ps50: 6, titik_panas_zona_ab: 2})]}, {pusat: PUSAT, kits: KIT, peran: "W", kini: KINI, ambang: {...P.AMBANG_BAWAAN, siaga_anom_pct: -5}})[0].tampil.kunci, "GELAR");
});

test("urutTingkat dan saring: GELAR di atas, nama kabupaten sebagai pemutus; chip menyaring satu tingkat", () => {
  const m = P.barisModel({baris: [baris("Z", "NORMAL", {anom_pct: -1}), baris("B", "SIAGA"), baris("A", "SIAGA"), baris("Q", "GELAR")], ...SEGAR}, {pusat: new Map(), kits: [], peran: "B", kini: KINI, ambang: {siaga_anom_pct: -20, pra_hari: 9, gelar_titik: 1}});
  const u = P.urutTingkat(m).map(x => `${x.tampil.kunci}:${x.b.kab}`);
  assert.deepEqual(u, ["SIAGA:A", "SIAGA:B", "SIAGA:Q", "NORMAL:Z"], "pra_hari 9 menahan semua di SIAGA; urut tingkat lalu nama");
  assert.deepEqual(P.saring(m, "SIAGA").length, 3);
  assert.deepEqual(P.saring(m, "semua").length, 4);
});

test("grafikPs: tujuh titik, garis ambang 0,5, judul tiap titik dalam persen, sumbu tanggal; deret kosong berkalimat", () => {
  const hari = ["2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18", "2026-10-19", "2026-10-20"];
  const s = P.grafikPs([0.6, 0.5, 0.9, 0.7, 0.1, 0, 0.25], hari, "Pulang Pisau");
  assert.equal((s.match(/class="sp-titik"/g) || []).length, 7);
  assert.match(s, /class="sp-ambang"/); assert.match(s, /ambang 0,5/);
  assert.match(s, /<title>14 Okt: 60%<\/title>/); assert.match(s, /<title>20 Okt: 25%<\/title>/);
  assert.match(s, /aria-label="Peluang FWI 14 atau lebih, 7 hari, Pulang Pisau/);
  assert.ok(!/NaN|undefined|null/.test(s));
  assert.ok(!P.grafikPs([0.6, 0.5, 0.9, 0.7, 0.1, 0, 0.25], hari, "<img src=x>").includes("<img"), "nama kabupaten di-escape");
  assert.match(P.grafikPs(null, hari, "X"), /ad-kosong/);
});

test("barisHtml: teks data di-escape, tingkat berteks (bukan warna saja), basi tertulis, tombol rencana hanya bila ada kit", () => {
  const d = {baris: [baris("Pulang <img src=x onerror=1>", "PRA-POSISI")], ...SEGAR};
  const m = P.barisModel(d, {pusat: new Map([["62|Pulang <img src=x onerror=1>", {lat: -2.8, lon: 114.1, titik: []}]]), kits: KIT, peran: "W", kini: KINI});
  const h = P.barisHtml(m, {pilih: null, peran: "W"});
  assert.ok(!h.includes("<img") && !h.includes("<b>Raya"), "markup dari data lolos");
  assert.match(h, /Palangka &lt;b&gt;Raya&lt;\/b&gt;|Pulang Pisau/);
  assert.match(h, /PRA-POSISI/); assert.match(h, /data-rencana="0"/); assert.match(h, /Buat rencana pra-posisi/);
  assert.match(h, /-29,5%/); assert.match(h, /\(p10 -45,6%, p90 -13,3%\)/);
  const baca = P.barisHtml(P.barisModel(d, {pusat: new Map(), kits: KIT, peran: "B", kini: KINI}), {pilih: null, peran: "B"});
  assert.ok(!/Buat rencana/.test(baca), "peran baca tanpa tombol");
  const basi = P.barisHtml(P.barisModel({baris: [baris("A", "SIAGA")], ...SEGAR, basi: {ansambel: true, titik24: true}}, {pusat: new Map(), kits: [], peran: "W", kini: KINI}), {pilih: null, peran: "W"});
  assert.match(basi, /–, data ansambel basi/); assert.match(basi, /data titik basi|basi/);
  assert.ok(!/Buat rencana/.test(basi));
});

test("barisHtml: tiap sel punya data-label untuk kartu ponsel, kosong berkalimat, kabupaten pilihan ber-aria-pressed", () => {
  const m = P.barisModel({baris: [baris("A", "SIAGA"), baris("B", "NORMAL", {anom_pct: -2})], ...SEGAR}, {pusat: new Map(), kits: [], peran: "W", kini: KINI});
  const h = P.barisHtml(m, {pilih: "62|A", peran: "W"});
  for (const l of ["Kabupaten", "Tingkat", "Anomali hujan p50", "Hari P(FWI ≥ 14) ≥ 0,5", "Titik panas 24 jam zona A/B", "Kit terdekat", "Depot"]) assert.ok(h.includes(`data-label="${l}"`), `label ${l}`);
  assert.match(h, /data-kab="62\|A"[^>]*aria-pressed="true"/); assert.match(h, /data-kab="62\|B"[^>]*aria-pressed="false"/);
  assert.match(P.barisHtml([], {pilih: null, peran: "W"}), /ad-kosong/);
});

test("rencanaBerjalan: kit dengan gerak terbuka ke depot terdaftar dengan ETA, tombol tiba hanya peran tulis, teks di-escape", () => {
  const kits = [{id: "0123456789abcdef", kode: "SIPPA-001", status: "gudang", lokasi: "x", gerak_buka: {ke_status: "depot", eta_jam: 6.5, waktu: Date.parse("2026-10-25T01:00:00Z")}}, {id: "fedcba9876543210", kode: "SIPPA-<2>", status: "gudang", gerak_buka: null}];
  const h = P.rencanaBerjalan(kits, "W");
  assert.match(h, /SIPPA-001/); assert.match(h, /ETA 6,5 jam/); assert.match(h, /data-tiba-kit="0123456789abcdef"/); assert.ok(!h.includes("SIPPA-<2>"));
  assert.ok(!/data-tiba-kit/.test(P.rencanaBerjalan(kits, "B")));
  assert.equal(P.rencanaBerjalan([kits[1]], "W"), "");
});

test("sumberPemicu: menyebut tiap sumber dengan waktunya dan label asumsi kebijakan belum diuji balik", () => {
  const s = P.sumberPemicu(SEGAR);
  for (const k of ["iklim_outlook", "fwi_ansambel", "titik24", "VIIRS"]) assert.ok(s.includes(k), k);
  assert.match(s, /^Sumber: /);
});

test("layar:pemicu: kolom, pil keyakinan, dan teks kosong tertulis lewat pembangun murni tanpa DOM", () => {
  const h = P.kepalaTabel();
  for (const k of ["Kabupaten", "Tingkat", "Anomali hujan p50", "Titik panas 24 jam zona A/B", "Kit terdekat", "Depot"]) assert.ok(h.includes(k));
  assert.ok(P.TINDAKAN.SIAGA.includes("latihan G6") && P.TINDAKAN["PRA-POSISI"].includes("depot depan"));
  assert.ok(Object.values(P.TINDAKAN).every(t => !/[—·]/.test(t)));
});
