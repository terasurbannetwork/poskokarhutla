import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {existsSync, readFileSync, statSync} from "node:fs";
import {fmtAngka, fmtPersen, rentangTulis, urutKab, kabAwal, lahanGabung, urlAset, citraKab, kartuRingkas, kartuTabel, kartuLahan, kartuMetode} from "../../public/banjir/genangan_kejadian.js";

test("genangan_terbit.py uji lulus (tanpa jaringan)", () => {
  const r = spawnSync("python3", ["scripts/banjir/genangan_terbit.py", "uji"], {encoding: "utf8"});
  assert.equal(r.status, 0, r.stderr);
});

const sah = (kab4, baru, extra = {}) => ({kab: `K${kab4}`, kab4, sah: true, status: "ok", lintasan: "2025-11-28T23:11:47Z", cakupan_pct: 40, luas: {baru_ha: baru, persen_teramati: 9.3}, ...extra});
const tak = (kab4, alasan) => ({kab: `T${kab4}`, kab4, sah: false, status: "ok", alasan});
const KEJ = {kj: "KJ-UJI-X", versi: 3, mulai: "2025-11-26", catatan: "Penduduk di area genangan, bukan korban.", atribusi: ["Copernicus GFM"], ambang: {cakupan_pct_min: 10, zona_bawah: 0.5},
  ringkas: {kab_sah: 2, kab_semua: 3, luas_baru_ha: 150.5, rentang: [3, 9], kab_rentang: 1, lintasan_terakhir: "2025-12-04", status_model: "hipotesis"},
  kab: [tak("1101", "sinyal lemah"), sah("1103", 50, {penduduk: {worldpop: {bawah: 3, atas: 9}}, lahan: {"40": {ha: 90, nama: "Pertanian (termasuk sawah)"}, "50": {ha: 0.05, nama: "Terbangun"}}}), sah("1108", 100.5)]};

test("format: di bawah 0,1 ditulis kurang dari 0,1, bukan 0", () => {
  assert.equal(fmtAngka(0.04), "kurang dari 0,1");
  assert.equal(fmtPersen(0.04), "kurang dari 0,1");
  assert.equal(fmtAngka(0), "0");   // nol hanya bila memang dihitung nol
  assert.equal(fmtAngka(null), null);
  assert.equal(fmtAngka(12345), "12,3 rb");
  assert.equal(rentangTulis({bawah: 3, atas: 9}), "3 sampai 9");
  assert.equal(rentangTulis({bawah: 9, atas: 3}), null);   // dua ujung, urut
  assert.equal(rentangTulis({bawah: 3}), null);
});

test("urut: sah menurut luas, tak sah di bawah tanpa angka apa pun", () => {
  const u = urutKab(KEJ.kab);
  assert.deepEqual(u.map(x => x.kab4), ["1108", "1103", "1101"]);
  assert.equal(u[2].baru, null); assert.equal(u[2].teks, "sinyal lemah");
  assert.equal(kabAwal(KEJ.kab), "1108");
  assert.equal(kabAwal([]), null);
});

test("lahan hanya dari kab sah; kelas 0 ha tidak ada", () => {
  const l = lahanGabung([...KEJ.kab, tak("1109", "x")].map(k => k.kab4 === "1109" ? {...k, lahan: {"40": {ha: 999, nama: "x"}}} : k));
  assert.deepEqual(l.kelas.map(e => e.kode), ["40", "50"]);
  assert.equal(l.kelas[0].ha, 90);
  assert.equal(lahanGabung([{sah: true, lahan: {"10": {ha: 0}}}]).kelas.length, 0);
});

test("url aset: nama berkas dan id kejadian dari daftar izin saja", () => {
  assert.equal(urlAset(KEJ, "1103_sel.geojson"), "/banjir/data/genangan_kejadian/KJ-UJI-X/v3/1103_sel.geojson");
  for (const n of ["../x.png", "1103_radar_pra.png/../a", "abcd_sel.geojson", "1103_foo.png", undefined]) assert.equal(urlAset(KEJ, n), null, String(n));
  assert.equal(urlAset({...KEJ, kj: "../x"}, "1103_sel.geojson"), null);
});

test("citra: pasangan lengkap atau alasan, tertutup awan dikenali", () => {
  const k = {citra: {radar_pra: {berkas: "1103_radar_pra.png", tanggal: "2025-11-10T23:11:03Z"}, radar_pasca: {berkas: "1103_radar_pasca.png", tanggal: "2025-11-28T23:11:47Z"}, asli_pra: {status: "tertutup awan"}, asli_pasca: {berkas: "1103_asli_pasca.png"}}};
  assert.ok(citraKab(KEJ, k, "radar").sebelum.src.endsWith("v3/1103_radar_pra.png"));
  assert.equal(citraKab(KEJ, k, "asli").alasan, "tertutup awan");
  assert.equal(citraKab(KEJ, k, "swir").alasan, "belum ada citra yang memenuhi syarat");
});

test("kartu: kepala = nama seksi, tanpa kata terlarang, tanpa titik tengah, tanpa 0 untuk kab tak sah", () => {
  const html = [kartuRingkas(KEJ), kartuTabel(KEJ.kab), kartuLahan(KEJ.kab), kartuMetode(KEJ)].join("\n");
  const teks = html.replace(/<[^>]+>/g, " ");
  assert.deepEqual([...html.matchAll(/<h3>([^<]*)<\/h3>/g)].map(m => m[1]), ["Ringkasan", "Per kabupaten", "Lahan tergenang", "Metode"]);
  assert.ok(!html.includes("hl\""), "tanpa angka sorot di kepala");
  for (const kata of [/\baman\b/i, /\bsurut\b/i, /terdampak/i, /·/, /tidak banjir/i]) assert.ok(!kata.test(teks), String(kata));
  assert.ok(html.includes("perkiraan radar") && html.includes("hipotesis"));
  const barisTak = html.match(/<tr data-kab4="1101".*?<\/tr>/s)[0];
  assert.ok(barisTak.includes("sinyal lemah") && !/class="n"/.test(barisTak), "kab tak sah: alasan saja");
  assert.ok(kartuLahan(KEJ.kab).includes("kurang dari 0,1"), "kelas kecil tetap tertulis ada");
  assert.ok(!kartuRingkas({...KEJ, ringkas: {...KEJ.ringkas, rentang: null}}).includes(" sampai "), "tanpa rentang tidak ada angka karangan");
});

test("kartu: teks asing di data tidak lolos sebagai HTML", () => {
  const jahat = {...KEJ, kab: [sah("1103", 5, {kab: '<img src=x onerror=alert(1)>'})], atribusi: ["<script>x</script>"]};
  const html = kartuTabel(jahat.kab) + kartuMetode(jahat);
  assert.ok(!html.includes("<img src=x") && !html.includes("<script>x"));
});

test("tanpa teks null atau undefined walau data kosong", () => {
  const kosong = {kj: "KJ-UJI-X", versi: 1, ringkas: {rentang: [3, 9]}, kab: [sah("1103", 5, {cakupan_pct: undefined, luas: {baru_ha: 5}, penduduk: {worldpop: {bawah: 1, atas: 2}}})]};
  const html = [kartuRingkas(kosong), kartuRingkas({kj: "KJ-UJI-X"}), kartuTabel(kosong.kab), kartuLahan(kosong.kab), kartuMetode(kosong)].join(" ").replace(/<[^>]+>/g, " ");
  assert.ok(!/\b(null|undefined|NaN)\b/.test(html), html.match(/.{20}\b(null|undefined|NaN)\b.{20}/)?.[0]);
  assert.ok(html.includes("belum dihitung"));
});

test("rentang terbalik atau satu ujung tidak jadi sel kosong", () => {
  for (const wp of [{bawah: 9, atas: 3}, {bawah: 3}, {atas: 3}, {bawah: "3", atas: "9"}]) {
    const b = urutKab([sah("1103", 5, {penduduk: {worldpop: wp}})])[0];
    assert.equal(b.pend, null);
    assert.ok(kartuTabel([sah("1103", 5, {penduduk: {worldpop: wp}})]).includes("belum tersedia"));
  }
  assert.ok(urutKab([sah("1103", 5, {penduduk: {worldpop: {bawah: 3, atas: 9}}})])[0].pend);
  assert.ok(!kartuRingkas({...KEJ, ringkas: {...KEJ.ringkas, rentang: [9, 3]}}).includes("9 sampai 3"));
});

const J = "public/banjir/data/genangan_kejadian.json";
test("genangan_kejadian.json publik: invarian bila ada", {skip: !existsSync(J)}, () => {
  const d = JSON.parse(readFileSync(J, "utf8")), terlarang = new Set(["kec", "sidik_masukan", "jiwa_kab_sah", "total", "jumlah_gabungan", "rata", "bangunan", "nik", "hp", "email", "akun"]);
  const jalan = (x, f) => { if (Array.isArray(x)) x.forEach(v => jalan(v, f)); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) { f(k, v); jalan(v, f); } };
  jalan(d, k => assert.ok(!terlarang.has(k), `kunci terlarang ${k}`));
  assert.equal(d.yakin, "estimasi-model");
  for (const k of d.kejadian) {
    assert.ok(k.ringkas.status_model !== "teruji" || k.ringkas.vonis === "lulus", "tanpa vonis lulus harus berpil hipotesis");
    assert.equal(k.ringkas.kab_sah, k.kab.filter(x => x.sah).length);
    for (const x of k.kab) {
      if (!x.sah) { assert.ok(!("luas" in x || "lahan" in x || "penduduk" in x || "sel" in x), `${x.kab4}: kab tak sah membawa angka`); assert.ok(x.alasan, `${x.kab4}: tanpa alasan`); continue; }
      assert.ok(x.luas.baru_ha >= 0);
      for (const r of Object.values(x.penduduk ?? {})) assert.ok(Number.isFinite(r.bawah) && Number.isFinite(r.atas) && r.bawah <= r.atas, `${x.kab4}: rentang bukan dua ujung`);
    }
    if (k.ringkas.rentang) assert.ok(k.ringkas.rentang[0] <= k.ringkas.rentang[1]);
    if (!k.kab.some(x => x.penduduk)) assert.ok(!k.atribusi.some(a => /Open Buildings/.test(a)), "atribusi Open Buildings hanya bila penduduk tampil");
    let total = 0;
    for (const x of k.kab) for (const n of [x.sel, ...Object.values(x.citra ?? {}).map(c => c.berkas)].filter(Boolean)) {
      const p = `public/banjir/data/genangan_kejadian/${k.kj}/v${k.versi}/${n}`, b = statSync(p).size;
      assert.ok(b <= (n.endsWith(".png") ? 120_000 : 300_000), `${n}: ${b} byte melebihi anggaran K5`);
      total += b;
    }
    assert.ok(total <= 12_000_000, `${k.kj}: aset ${total} byte melebihi 12 MB`);
  }
});
