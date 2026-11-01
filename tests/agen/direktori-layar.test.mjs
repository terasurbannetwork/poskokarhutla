/* Uji layar /direktori di peramban nyata (Chrome headless, tests/bnpb/_peramban.mjs): tiap tab utama terbuka tanpa pengecualian JS,
   kartu atau panel benar-benar tergambar, Wilayah menampilkan kesiapan berlabel hasil uji balik, dan lebar ponsel tidak menggulung ke samping.
   Data: pakar sintetis di berkas ini + data contoh halaman sendiri (dataContoh, sama dengan tombol dummy). Data direktori asli tidak boleh
   masuk repo publik ini, jadi tidak ada fixture dari R2. Tanpa Chrome = dilewati dengan pesan jelas. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname, join, normalize} from "node:path";
import {fileURLToPath} from "node:url";
import {bukaPeramban, cariChrome} from "../bnpb/_peramban.mjs";

const PUB = fileURLToPath(new URL("../../public/", import.meta.url));
const MIME = {".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp"};
const RUMPUN = ["banjir", "longsor", "gempa", "karhutla"];
const INDUK = {diperbarui: "2026-10-31", sumber: "uji", rumpun: RUMPUN,
  orang: Array.from({length: 24}, (_, i) => [`A${9000 + i}`, `Pakar Uji ${i + 1}`, i % 2 ? "Universitas Contoh Timur" : "Institut Contoh Barat", [RUMPUN[i % 4]], 10 + i, 50 + i, 900 + i * 10, "", ["Topik uji"], "", "", "", "", "", ""])};
const KAMPUS = {"Universitas Contoh Timur": {prov: "53"}, "Institut Contoh Barat": {prov: "32"}};
/* kesiapan satu kab NTT, dengan hasil uji balik belum lulus: layar wajib berlabel Hipotesis */
const WILAYAH = {diperbarui: "2026-10-31", prov: {"53": {lab: [{nama: "Lab Uji Tanah", uji: "Uji geser langsung", bidang: "tanah", lokasi: "Kupang", sumber_url: "https://elsa.brin.go.id/x"}]}}, kab: [{prov: "53", kab: "Kabupaten Kupang", fasilitas: {rs: 2, rs_tt: 150, puskesmas: 20}, podes: {desa_peringatan_dini: 12, jumlah_desa: 177, terdampak: {banjir: 30}, tahun: 2021}, rentan: {lansia: 20000, balita: 35000, total: 400000, tahun: 2025}, pdrb: {tahun: 2024, adhb_rp: 9e12, per_kapita_rp: 2.5e7, porsi: {A: 30, F: 15, G: 20}}, bangunan: {n: 150000, luas_ha: 900}, lahan: {awal: 2000, akhir: 2023, kelas: {hutan_alam: {awal_ha: 2000, akhir_ha: 1500}, sawah: {awal_ha: 100, akhir_ha: 120}}}, ikd: {tahun: 2025, nilai: 0.55, kelas: "sedang"}, logbook: {dari: 2015, per_jenis: {banjir: 40, longsor: 12}, rusak: 300, terendam: 5000, akhir: [{tanggal: "2026-02-03", jenis: "banjir", rusak: 3, terendam: 120, desa: 4}]}}],
  kesiapan: {jumlah: 1, baris: {"53|kupang": {prov: "53", kab: "Kabupaten Kupang", nama_rk: "Kupang", skor: 30, risiko: 40, kesenjangan: 35, kuadran: "prioritas", peringkat: 1, peringkat_prov: 1, jumlah_prov: 1,
    komp: {fiskal: 20, faskes: 30, lembaga: 10, pakar: 60}, kebutuhan: 80, butuh: {miskin: 90, pangan: 70}, nilai: {}}},
    uji: {dari: 2015, sampai: 2025, n: 474, lulus: false, lolos: [], ukuran: {mati: "meninggal", dampak: "terdampak", rusak: "rusak"},
      korelasi: {skor: {mati: {r: -0.017, t: -0.4}, dampak: {r: -0.01, t: -0.2}, rusak: {r: -0.016, t: -0.3}}, kesenjangan: {mati: {r: 0.1, t: 2.2}, dampak: {r: 0.05, t: 1.1}, rusak: {r: 0.147, t: 3.2}}},
      kuadran: {prioritas: {n: 136, mati: 0.096, rusak: 2.06}, aman: {n: 123, mati: 0.058, rusak: 1.3}}},
    uji_logbook: {dari: 2015, sampai: 2026, n: 491, lulus: true, lolos: ["dampak"], ukuran: {dampak: "rumah rusak per kejadian", rusak: "rumah rusak berat per kejadian"},
      korelasi: {skor: {dampak: {r: -0.177, t: -4}, rusak: {r: -0.076, t: -1.7}}, kesenjangan: {dampak: {r: 0.08, t: 1.9}, rusak: {r: 0.13, t: 3}}},
      per_jenis: {cuaca: {n: 368, dampak: {r: -0.325, t: -6.6}, rusak: {r: -0.075, t: -1.4}, lolos: ["dampak"], teruji: true}, banjir: {n: 458, dampak: {r: 0.015, t: 0.3}, rusak: {r: 0.015, t: 0.3}, lolos: [], teruji: false}}}}};
let data = {wilayah_daya: WILAYAH};

let server, asal, P, T;
const tanpaChrome = !cariChrome();
if (tanpaChrome) test("uji layar direktori DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN)"}, () => {});
else {
  before(async () => {
    server = createServer(async (q, r) => {
      const u = decodeURIComponent(q.url.split("?")[0]), json = d => { r.writeHead(d ? 200 : 404, {"content-type": "application/json"}); r.end(d ? JSON.stringify(d) : "{}"); };
      if (u === "/api/akademisi") return json(INDUK);
      if (u === "/api/akademisi/kampus") return json(KAMPUS);
      if (u.startsWith("/api/akademisi/data/")) return json(data[u.slice(20)]);
      if (u.startsWith("/api/")) return json(null);
      const f = normalize(join(PUB, u === "/" || u === "/direktori" ? "akademisi.html" : u));
      if (!f.startsWith(PUB)) { r.writeHead(403); return r.end(); }
      try { const b = await readFile(f); r.writeHead(200, {"content-type": MIME[extname(f)] || "application/octet-stream"}); r.end(b); } catch (e) { r.writeHead(404); r.end(); }
    });
    await new Promise(ok => server.listen(0, "127.0.0.1", ok)); asal = `http://127.0.0.1:${server.address().port}`;
    P = await bukaPeramban(); T = await P.tab(); await T.ukuran(1280, 900);
    /* data contoh dari halaman sendiri, lalu disajikan sebagai /api/akademisi/data/<nama> */
    await T.buka(asal + "/akademisi.html", {tunggu: "article"});
    data = {...JSON.parse(await T.eval("JSON.stringify(window.__akContoh())")), wilayah_daya: WILAYAH};
  });
  after(async () => { await T?.tutup(); await P?.tutup(); server?.close(); });

  /* galat yang wajar di server uji: aset di luar halaman (logo, peta dasar, data situs lain) boleh 404; pengecualian JS dan konsol error tidak */
  /* WebGL: Chrome headless tanpa GPU tidak bisa membuat konteks peta MapLibre; itu batas lingkungan uji, bukan galat halaman */
  const galatJs = () => T.galat().filter(g => !/^log\(network\)/.test(g) && !/Failed to load resource/.test(g) && !/WebGL context/.test(g));

  test("tab Pakar: kartu pakar tergambar tanpa galat JS", async () => {
    await T.buka(asal + "/akademisi.html?tampil=pakar", {tunggu: "#akS"});
    await T.klik('#akS [data-v=""]');   /* saringan bawaan SINTA; pakar sintetis tidak ber-SINTA */
    await T.tungguFungsi(`/Pakar Uji 1\\b/.test(document.body.innerText)`);
    assert.deepEqual(galatJs(), []);
  });

  for (const [tampil, cek] of [["lembaga&sub=daftar", /BPBD Provinsi Riau/], ["inovasi", null], ["sistem_data", null], ["pendanaan", null], ["pustaka", null], ["berita", null]]) {
    test(`tab ${tampil}: terbuka dan tergambar tanpa galat JS`, async () => {
      await T.buka(`${asal}/akademisi.html?tampil=${tampil}`, {tunggu: ".ak-panel, article"});
      await T.tungguFungsi(`document.querySelectorAll("article, .ak-panel").length > 0`);
      if (cek) await T.tungguFungsi(`${cek}.test(document.body.innerText)`);
      assert.deepEqual(galatJs(), [], `galat di tab ${tampil}`);
    });
  }

  test("Wilayah NTT: kesiapan dan peta kesenjangan berlabel Hipotesis selama uji balik belum lulus", async () => {
    await T.buka(`${asal}/akademisi.html?tampil=wilayah&wilayah=53`, {tunggu: ".ak-ks-uji"});
    /* tiap kartu kesiapan memuat dua paragraf uji: DIBI (harus Hipotesis selama belum lulus) lalu logbook Pusdalops (labelnya sendiri) */
    const t = await T.eval(`[...document.querySelectorAll(".ak-ks-uji")].filter(e => !/logbook Pusdalops/.test(e.innerText)).map(e => e.innerText).join(" | ")`);
    assert.match(t, /^Hipotesis\b/); assert.match(t, /474 kab\/kota/); assert.doesNotMatch(t, /Teruji/);
    await T.buka(`${asal}/akademisi.html?tampil=wilayah&wilayah=53&kab=Kabupaten%20Kupang`, {tunggu: ".ak-ks-uji"});
    await T.tungguFungsi(`/Kesiapan desa dan penduduk rentan/i.test(document.body.innerText)`);
    const k = await T.eval(`document.body.innerText`); assert.match(k, /12 desa/); assert.match(k, /20\.000/); assert.match(k, /Banjir 30 desa/);
    assert.match(k, /Teruji sebagian Uji kedua dengan logbook Pusdalops[\s\S]*cuaca ekstrem \(rumah rusak per kejadian, r \u22120,33\), tidak untuk banjir/); assert.match(k, /Riwayat kejadian menurut logbook Pusdalops/i); assert.match(k, /5\.000/);
    await T.tungguFungsi(`/Temuan riset di provinsi ini/i.test(document.body.innerText)`);
    assert.match(await T.eval(`document.body.innerText`), /PREDIKSI[\s\S]*ambang hujan 3 hari: 80 mm[\s\S]*TEKNOLOGI DAN INOVASI[\s\S]*Sensor kemiringan/i);
    for (const j of [/Ekonomi daerah/i, /Rp 9 triliun/, /Paparan bangunan dan tutupan lahan/i, /150\.000/, /Indeks Ketahanan Daerah resmi BNPB/i, /Uji geser langsung/]) assert.match(k, j);
    assert.deepEqual(galatJs(), []);
  });

  test("lembar kampus: kotak cari menyaring daftar pakar kampus itu", async () => {
    data.lembaga_ekstra = {...(data.lembaga_ekstra || {}), kampus: {"Universitas Contoh Timur": {ror: "https://ror.org/0abc", garuda: [{nama: "Calon Garuda Satu", artikel: 4, contoh: "Mitigasi banjir"}]}}};
    await T.buka(asal + "/akademisi.html?tampil=kampus", {tunggu: '[data-kp="Universitas Contoh Timur"]'});
    await T.klik('[data-kp="Universitas Contoh Timur"]');
    await T.tungguFungsi(`!!document.getElementById("akKpQ")`);
    await T.eval(`(() => { const i = document.getElementById("akKpQ"); i.value = "pakar uji 12"; i.dispatchEvent(new Event("input", {bubbles: true})); })()`);
    await T.tungguFungsi(`document.querySelectorAll("#akTopPk li").length === 1`);
    assert.match(await T.eval(`document.getElementById("akTopPk").innerText`), /Pakar Uji 12\b/);
    assert.equal(await T.eval(`document.getElementById("akKpN").textContent`), "1");
    await T.tungguFungsi(`/Calon Garuda Satu/.test(document.getElementById("akSheet").innerText)`);
    await T.tungguFungsi(`/Identitas kampus[\\s\\S]*ROR/i.test(document.getElementById("akSheet").innerText)`);
    assert.deepEqual(galatJs(), []);
  });

  test("dialog pakar: bidang keahlian dan rekan penulis tampil, nama rekan membuka profilnya", async () => {
    data.pakar_ekstra = {A9000: {topik: [{nama: "Flood Risk Assessment and Management", karya: 7}], rekan: [{id: "A9001", karya: 3, tahun: 2025}], jabatan: {sekarang: {organisasi: "Universitas Uji", negara: "ID", mulai: "2019-01"}, riwayat: [{organisasi: "Lembaga Lama", peran: "Peneliti", mulai: "2010", selesai: "2018"}], sumber_url: "https://orcid.org/0000-0000-0000-0000"}}};
    await T.buka(asal + "/akademisi.html?pakar=A9000", {tunggu: ".ak-rekan-p"});
    assert.match(await T.eval(`document.querySelector(".ak-topik-p").innerText`), /Flood Risk Assessment/);
    assert.match(await T.eval(`document.querySelector(".ak-jabatan-p").innerText`), /Universitas Uji[\s\S]*sejak 2019[\s\S]*Lembaga Lama[\s\S]*2010 sampai 2018/);
    await T.eval(`document.querySelector('.ak-rekan-p [data-buka="A9001"]').click()`);
    await T.tungguFungsi(`/Pakar Uji 2\\b/.test(document.getElementById("akLembar").innerText)`);
    assert.deepEqual(galatJs(), []);
  });

  test("tab Donasi: peringkat pemberi, saring bentuk, rincian ke mana dan untuk apa", async () => {
    await T.buka(`${asal}/akademisi.html?tampil=donasi`, {tunggu: "#akDnL"});
    await T.tungguFungsi(`/1\\. LAZ Berizin Contoh A/.test(document.getElementById("akDnL").innerText)`);
    await T.eval(`document.querySelector('#akDnL [data-dn="L:laz-a"]').click()`);
    await T.tungguFungsi(`!document.querySelector('[data-rinci="L:laz-a"]').hidden`);
    assert.match(await T.eval(`document.querySelector('[data-rinci="L:laz-a"]').innerText`), /Rp 750 juta/);
    assert.match(await T.eval(`document.querySelector(".ak-dnprov").innerText`), /Jawa Barat[\s\S]*8\.246\.258/);
    assert.equal(await T.eval(`document.querySelectorAll(".ak-dnprov tr.ak-dn-kurang").length`), 1);
    const isi = await T.eval(`document.getElementById("akv-donasi").innerText`);
    assert.match(isi, /CHF 5 juta diminta/); assert.match(isi, /BAZNAS Contoh[\s\S]*Rp 200 miliar/);
    await T.eval(`document.querySelector('#akDnB [data-v="peralatan"]').click()`);
    await T.tungguFungsi(`/^1 pemberi$/.test(document.getElementById("akDnJd").textContent) && /PT Contoh Peduli/.test(document.getElementById("akDnL").innerText)`);
    assert.deepEqual(galatJs(), []);
  });

  test("kategori lembaga di layar lebar: tepat dua baris", async () => {
    await T.buka(`${asal}/akademisi.html?tampil=lembaga&sub=daftar`, {tunggu: "#akLC button"});
    const baris = await T.eval(`new Set([...document.querySelectorAll("#akLC button")].map(b => Math.round(b.getBoundingClientRect().top))).size`);
    assert.ok(baris <= 2, `kategori lembaga ${baris} baris`);
  });

  test("lebar ponsel 390 px: Pakar dan Wilayah tidak menggulung ke samping", async () => {
    await T.ukuran(390, 844);
    for (const u of ["?tampil=pakar", "?tampil=wilayah&wilayah=53"]) {
      await T.buka(asal + "/akademisi.html" + u, {tunggu: "article, .ak-panel"});
      const {sw, iw} = await T.lebihLebar(); assert.ok(sw <= iw + 1, `${u}: lebar halaman ${sw} > layar ${iw}`);
    }
    await T.ukuran(1280, 900);
  });
}
