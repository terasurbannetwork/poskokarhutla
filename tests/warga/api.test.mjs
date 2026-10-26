/* Lapisan rute: src/worker.js dijalankan di workerd (Miniflare) dengan D1 lokal sungguhan yang diberi migrasi apa adanya.
   Tidak ada mock klien DB. ASSETS dilayani dari berkas repo (plus satu fixture titik24), FIRMS dari fixture CSV.
   Jalankan: npm i && node --test tests/warga/api.test.mjs */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, mkdtempSync, cpSync, mkdirSync, copyFileSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {Miniflare} from "miniflare";
import {AKAR, migrasi, pecah} from "./_bantu.mjs";
import REG from "../../src/bencana.generated.js";

const JAM = 3600e3, KINI = Date.now();
const TITIK24 = {acuan: new Date(KINI - JAM).toISOString(), laci: ["K0001"], titik: [[-2.0, 113.0, 0], [-2.3, 113.4, -1]]};
const tgl = t => new Date(t).toISOString().slice(0, 10), jm = t => new Date(t).toISOString().slice(11, 16).replace(":", "");
const t1 = KINI - 2 * JAM, t2 = KINI - 5 * JAM, lama = KINI - 50 * JAM;
const KEP_V = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight";
const KEP_M = "latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight";
const CSV = {
  VIIRS_SNPP_NRT: [KEP_V,
    `-2.1234,113.5678,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,h,2.0NRT,290,12.3,D`,
    `-2.1234,113.5678,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,h,2.0NRT,290,12.3,D`,      // kembar persis -> 1
    `-2.1300,113.5700,330,0.4,0.4,${tgl(t2)},${jm(t2)},N,VIIRS,l,2.0NRT,290,1.1,N`,
    `abc,113.5,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,n,2.0NRT,290,3,D`,                 // lat rusak
    `-2.2,113.5,330,0.4,0.4,${tgl(t1)},,N,VIIRS,n,2.0NRT,290,3,D`,                          // jam kosong
    `-2.2,113.5,330,0.4,0.4,2026/10/01,0100,N,VIIRS,n,2.0NRT,290,3,D`,                     // tanggal salah format
    `20.5,113.5,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,n,2.0NRT,290,3,D`,                // di luar kotak Indonesia
    `-2.2,113.5,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,n,2.0NRT`,                        // kolom kurang
    `-2.2,113.5,330,0.4,0.4,${tgl(lama)},${jm(lama)},N,VIIRS,n,2.0NRT,290,3,D`,            // > 24 jam: dilewati
    `-5.5,108.0,330,0.4,0.4,${tgl(t1)},${jm(t1)},N,VIIRS,n,2.0NRT,290,3,D`,                // Laut Jawa: bukan wilayah
  ].join("\n"),
  MODIS_NRT: [KEP_M,
    `-2.14,113.58,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,25,6.1NRT,290,20,D`,
    `-2.15,113.59,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,50,6.1NRT,290,20,D`,
    `-2.16,113.60,320,1,1,${tgl(t1)},${jm(t1)},Terra,MODIS,85,6.1NRT,290,20,D`,
  ].join("\n"),
  VIIRS_NOAA20_NRT: "Invalid MAP_KEY.",          // sensor gagal: sisanya tetap dipakai
  VIIRS_NOAA21_NRT: KEP_V,
};

let mf, DB;
const ASET_UJI = {};   // jalur -> isi (null = 404); menimpa berkas repo untuk uji /api/status
const aset = async req => {
  const p = decodeURIComponent(new URL(req.url).pathname);
  if (p === "/data/titik24.json") return Response.json(TITIK24);
  if (p in ASET_UJI) return ASET_UJI[p] == null ? new Response("tidak ada", {status: 404}) : new Response(ASET_UJI[p]);
  const f = path.join(AKAR, "public", p.endsWith("/") ? p + "index.html" : p);
  return existsSync(f) && f.startsWith(path.join(AKAR, "public")) ? new Response(readFileSync(f)) : new Response("tidak ada", {status: 404});
};
const firms = async req => {
  const u = new URL(req.url);
  if (u.hostname !== "firms.modaps.eosdis.nasa.gov") return new Response("diblok di uji", {status: 599});
  const s = u.pathname.split("/")[5];
  return new Response(CSV[s] ?? "", {status: s in CSV ? 200 : 400});
};
const opsi = (ikat = {}) => ({modules: true, scriptPath: path.join(AKAR, "src/worker.js"), modulesRoot: AKAR, modulesRules: [{type: "ESModule", include: ["**/*.js"]}], compatibilityDate: "2024-09-23",
  d1Databases: {DB: "uji-warga"}, bindings: {IP_SALT: "garam-uji", ADMIN_TOKEN: "rahasia-admin, token-moderator-2", FIRMS_MAP_KEY: "kunci-uji", ...ikat},
  serviceBindings: {ASSETS: aset}, outboundService: firms, cache: false});   // cache tepi diuji terpisah di tepi.test.mjs

before(async () => {
  mf = new Miniflare(opsi());
  DB = await mf.getD1Database("DB");
  await DB.batch(pecah(migrasi()).map(s => DB.prepare(s)));
});
after(() => mf?.dispose());

/* berhenti di galat pertama: setelah satu uji gagal, sisanya GAGAL tanpa dijalankan (tidak pernah lolos diam-diam) */
let rusak = null;
const uji = (nama, fn) => test(nama, async () => {
  if (rusak) throw new Error(`tidak dijalankan: "${rusak}" gagal lebih dulu`);
  try { await fn(); } catch (e) { rusak = nama; throw e; }
});

let ipN = 0;
const ipBaru = () => `10.0.${Math.floor(++ipN / 250)}.${ipN % 250}`;
const panggil = async (metode, jalur, body, ip = "10.9.9.9", h = {}) => {
  const r = await mf.dispatchFetch("http://warga.lokal" + jalur, {method: metode, headers: {"cf-connecting-ip": ip, "content-type": "application/json", ...h},
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body)});
  const teks = await r.text(); let j = null; try { j = JSON.parse(teks); } catch (e) {}
  return {status: r.status, j, teks, h: r.headers};
};
const kirim = (o, ip = ipBaru()) => panggil("POST", "/api/warga", {bahaya: "umum", lat: -2.5, lon: 113.9, ...o}, ip);
const jumlahBaris = async () => (await DB.prepare("SELECT count(*) n FROM laporan").first()).n;
let geser = 0;
const titikBaru = () => ({lat: -3 + (++geser % 90) * 0.05, lon: 110 + Math.floor(geser / 90) * 0.05});   // >= 5 km antar titik

uji("situs statis tetap dilayani lewat ASSETS", async () => {
  const r = await panggil("GET", "/informasi_jenis.js");
  assert.equal(r.status, 200, `GET /informasi_jenis.js = ${r.status}`);
  assert.match(r.teks, /export const JENIS/);
});

uji("situs Centurisk97 (*.workers.dev): semua halaman Tentang dialihkan ke peta; situs lain tetap melayaninya", async () => {
  const buka = (asal, j) => mf.dispatchFetch(asal + j, {redirect: "manual", headers: {"cf-connecting-ip": ipBaru()}});
  for (const [j, ke] of [["/tentang", "/"], ["/tentang-halaman", "/"], ["/banjir/tentang", "/banjir/peta"], ["/gempa/tentang/", "/gempa/peta"], ["/kekeringan/tentang", "/kekeringan/peta"]]) {
    const r = await buka("https://contoh.workers.dev", j); await r.text();
    assert.equal(r.status, 302, `situs w GET ${j} = ${r.status}`); assert.equal(new URL(r.headers.get("location")).pathname, ke, `situs w ${j} -> ${ke}`);
  }
  for (const j of ["/tentang", "/banjir/tentang"]) { const r = await buka("http://warga.lokal", j); await r.text(); assert.equal(r.status, 200, `situs lain GET ${j} = ${r.status}`); }
  const r = await buka("https://contoh.workers.dev", "/banjir/peta"); await r.text(); assert.equal(r.status, 200, "peta situs w tetap 200");
});

uji("tautan bersih (/peta, /k/K0001, /sim/K0001) disajikan index.html; path lain tidak ikut", async () => {
  /* merek tidak lagi ditulis ulang per alamat (semua berkas sudah "Centurisk97"), jadi isinya sama persis dengan berkas */
  const idx = readFileSync(path.join(AKAR, "public/index.html"), "utf8");
  for (const j of ["/peta", "/kompleks/", "/k/K0001", "/sim/K0123", "/prioritas"]) {
    const r = await panggil("GET", j);
    assert.equal(r.status, 200, `GET ${j} = ${r.status}`);
    assert.equal(r.teks, idx, `GET ${j} bukan index.html`);
  }
  for (const j of ["/petaku", "/k/abc", "/api/wargaX", "/peta/x"]) assert.notEqual((await panggil("GET", j)).teks, idx, `GET ${j} tidak boleh jadi index.html`);
});

uji("/banjir/k/B0007 disajikan index.html banjir; /banjir/k/X1 dan /banjir/sim/B0007 404", async () => {
  const bj = (await panggil("GET", "/banjir/")).teks;
  assert.equal((await panggil("GET", "/banjir/k/B0007")).teks, bj, "kejadian banjir = index banjir");
  for (const j of ["/banjir/k/X1", "/banjir/sim/B0007"]) assert.equal((await panggil("GET", j)).status, 404, j);
});

uji("laporan sah tersimpan dan muncul di daftar tanpa kontak, hash, atau token", async () => {
  const r = await kirim({jenis: "minta", sub: "makanan", jumlah: 40, teks: "Butuh nasi untuk 40 orang #wargabantuwarga", kontak: "0812-3456-7890", ...titikBaru()});
  assert.equal(r.status, 201, `POST minta = ${r.status}: ${r.teks}`);
  assert.match(r.j.token, /^[0-9a-f]{32}$/);
  const d = await panggil("GET", "/api/warga?jam=24");
  const f = d.j.features.find(x => x.id === r.j.id);
  assert.ok(f, `laporan ${r.j.id} tidak ada di daftar (${d.j.features.length} fitur)`);
  assert.equal(f.properties.kontak, true, "penanda ada kontak harus true");
  for (const bocor of ["81234567890", "6281234567890", "ip_hash", "token_hash", r.j.token, '"wa"'])
    assert.ok(!d.teks.includes(bocor), `daftar GET membocorkan '${bocor}'`);
  const rinci = await panggil("GET", `/api/warga/${r.j.id}`);
  assert.equal(rinci.status, 200);
  assert.ok(!rinci.teks.includes("81234567890"), "rincian GET membocorkan nomor WA");
  assert.equal(f.properties.teks, "Butuh nasi untuk 40 orang #wargabantuwarga", "tagar harus tetap utuh");
});

uji("masukan salah DITOLAK dan tidak menulis apa pun", async () => {
  const n0 = await jumlahBaris(), ip = ipBaru();
  const kasus = [
    [{jenis: "gempa", sub: "x"}, 400, "jenis di luar enum"],
    [{jenis: "listrik", sub: "habis"}, 400, "sub milik jenis lain"],
    [{jenis: "api", sub: "kecil", bahaya: "banjir"}, 400, "jenis karhutla di bahaya banjir"],
    [{jenis: "listrik", sub: "padam", bahaya: "bukan_bahaya"}, 400, "bahaya di luar enum"],
    [{jenis: "listrik", sub: "padam", lat: 10, lon: 113}, 400, "lat 10 di luar Indonesia"],
    [{jenis: "listrik", sub: "padam", lat: -2, lon: 150}, 400, "lon 150 di luar Indonesia"],
    [{jenis: "listrik", sub: "padam", lat: "abc"}, 400, "lat bukan angka"],
    [{jenis: "listrik", sub: "padam", teks: "x".repeat(281)}, 400, "teks 281 karakter"],
    [{jenis: "listrik", sub: "padam", teks: "dasar bangsat semua"}, 400, "kata kasar"],
    [{jenis: "listrik", sub: "padam", teks: "aaaaaaaaaaaa"}, 400, "karakter berulang"],
    [{jenis: "listrik", sub: "padam", detail: {warna: "merah"}}, 400, "isian tak dikenal"],
    [{jenis: "bbm", sub: "habis", detail: {bahan: ["avtur"]}}, 400, "nilai multi di luar enum"],
    [{jenis: "air_padam", sub: "embung", bahaya: "karhutla"}, 400, "air_padam tanpa status wajib"],
    [{jenis: "listrik", sub: "padam", jumlah: 5}, 400, "jumlah pada listrik"],
    [{jenis: "minta", sub: "air", jumlah: 0}, 400, "jumlah 0"],
    [{jenis: "listrik", sub: "padam", kontak: "081234567890"}, 400, "kontak pada jenis non-bantuan"],
    [{jenis: "minta", sub: "air", kontak: "12345"}, 400, "nomor WA tidak sah"],
    [{jenis: "info", sub: "umum", teks: "hai"}, 400, "pesan < 5 karakter"],
  ];
  for (const [o, st, sebab] of kasus) {
    const r = await kirim(o, ip);
    assert.equal(r.status, st, `${sebab}: diharapkan ${st}, diterima ${r.status} (${r.teks})`);
  }
  for (const [body, sebab] of [["{rusak", "body bukan JSON"], ["[1]", "body array"], [JSON.stringify({jenis: "info", teks: "x".repeat(5000)}), "body > 4096 byte"]]) {
    const r = await panggil("POST", "/api/warga", body, ip);
    assert.equal(r.status, 400, `${sebab}: ${r.status}`);
  }
  assert.equal((await panggil("GET", "/api/warga?jam=999")).status, 400, "jam=999 harus ditolak");
  assert.equal((await panggil("GET", "/api/warga?jenis=gempa")).status, 400, "filter jenis tak dikenal harus ditolak");
  assert.equal((await panggil("GET", "/api/warga?bbox=1,2,3")).status, 400, "bbox 3 angka harus ditolak");
  assert.equal(await jumlahBaris(), n0, `masukan salah menulis ${(await jumlahBaris()) - n0} baris`);
});

uji("Lapor Warga multi-bahaya: tiap bencana registry menerima jenisnya, tersimpan, dan tampil; bahaya/jenis salah 400", async () => {
  const kasus = [["gempa", "guncang", "kuat"], ["gempa", "rusak_gedung", "retak"], ["gempa", "tsunami_tanda", "surut"], ["tsunami", "tsunami_tanda", "ombak"],
    ["gunungapi", "abu", "tebal"], ["gunungapi", "lahar", "sungai"], ["gunungapi", "gemuruh", "dentuman"],
    ["cuaca", "pohon_tumbang", "jalan"], ["cuaca", "atap_rusak", "sebagian"], ["cuaca", "puting_beliung", "terlihat"], ["cuaca", "hujan_es", "besar"],
    ["udara", "asap_tebal", "tebal"], ["udara", "sesak_napas", "sesak"], ["udara", "jarak_pandang", "p500"],
    ["kekeringan", "sumur_kering", "kering"], ["kekeringan", "gagal_panen", "sebagian"], ["kekeringan", "antre_air", "antre"], ["kekeringan", "listrik", "padam"]];
  const dikenal = new Set(REG.bencana.flatMap(b => b.lapor_bahaya));
  for (const [bahaya, jenis, sub] of kasus) {
    assert.ok(dikenal.has(bahaya), `${bahaya} tidak ada di lapor_bahaya registry`);
    const r = await kirim({jenis, sub, bahaya, ...titikBaru()});
    assert.equal(r.status, 201, `${bahaya}/${jenis}:${sub} = ${r.status} ${r.teks}`);
    const baris = await DB.prepare("SELECT bahaya, jenis, sub FROM laporan WHERE id = ?").bind(r.j.id).first();
    assert.deepEqual({...baris}, {bahaya, jenis, sub}, "baris D1 harus persis yang dikirim");
  }
  const d = await panggil("GET", "/api/warga?bahaya=kekeringan&jenis=antre_air");
  assert.equal(d.status, 200); assert.ok(d.j.features.some(f => f.properties.jenis === "antre_air" && f.properties.bahaya === "kekeringan"), "laporan kekeringan harus muncul di daftar");
  assert.equal((await panggil("GET", "/api/warga?bahaya=bukan_bahaya")).status, 400, "filter bahaya tak dikenal harus ditolak");
  const n0 = await jumlahBaris();
  for (const [o, sebab] of [[{jenis: "guncang", sub: "kuat", bahaya: "cuaca"}, "jenis gempa di bahaya cuaca"], [{jenis: "hujan_es", sub: "besar", bahaya: "gempa"}, "jenis cuaca di bahaya gempa"],
    [{jenis: "guncang", sub: "kuat", bahaya: "umum"}, "jenis gempa di bahaya umum"], [{jenis: "guncang", sub: "meluap", bahaya: "gempa"}, "sub milik jenis lain"],
    [{jenis: "abu", sub: "tebal", bahaya: "bukan_bahaya"}, "bahaya tak dikenal"], [{jenis: "sumur_kering", sub: "kering", bahaya: "karhutla"}, "jenis kekeringan di karhutla"]]) {
    const r = await kirim({...o, ...titikBaru()}); assert.equal(r.status, 400, `${sebab}: ${r.status} ${r.teks}`);
  }
  assert.equal(await jumlahBaris(), n0, "penolakan tidak boleh menulis baris");
});

uji("D1 dengan CHECK lama (tanpa 0020) + POST bahaya baru = 503 berpesan, tanpa baris", async () => {
  const mf3 = new Miniflare({...opsi(), d1Databases: {DB: "uji-skema-lama"}});
  try {
    const D3 = await mf3.getD1Database("DB");
    const lama = (await import("node:fs")).readdirSync(path.join(AKAR, "migrations")).filter(f => f.endsWith(".sql") && f < "0020").sort()
      .map(f => readFileSync(path.join(AKAR, "migrations", f), "utf8")).join("\n");
    await D3.batch(pecah(lama).map(s => D3.prepare(s)));
    const r = await mf3.dispatchFetch("http://warga.lokal/api/warga", {method: "POST", headers: {"content-type": "application/json", origin: "http://warga.lokal", "cf-connecting-ip": ipBaru()},
      body: JSON.stringify({jenis: "guncang", sub: "kuat", bahaya: "gempa", lat: -2.5, lon: 113.9})});
    const j = await r.json();
    assert.equal(r.status, 503, JSON.stringify(j)); assert.match(j.galat, /Coba lagi/); assert.doesNotMatch(j.galat, /D1|skema|migrasi|CHECK/, "detail internal tidak bocor ke publik");
    assert.equal((await D3.prepare("SELECT count(*) n FROM laporan").first()).n, 0, "tidak boleh ada baris");
  } finally { await mf3.dispose(); }
});

uji("tautan dan nomor HP dibuang dari teks publik", async () => {
  const r = await kirim({jenis: "info", sub: "umum", teks: "Info cek www.promo-spam.com atau https://x.co/a lalu hubungi 0812 3456 7890 #banjir", ...titikBaru()});
  assert.equal(r.status, 201, r.teks);
  const t = (await DB.prepare("SELECT teks FROM laporan WHERE id = ?").bind(r.j.id).first()).teks;
  for (const s of ["promo-spam", "x.co", "3456", "0812"]) assert.ok(!t.includes(s), `teks tersimpan masih memuat '${s}': ${t}`);
  assert.match(t, /#banjir/);
});

uji("batas laju: 10 laporan per jam per IP, IP lain tidak terdampak", async () => {
  const ip = ipBaru();
  for (let i = 1; i <= 10; i++) { const r = await kirim({jenis: "info", sub: "umum", teks: "pesan ke " + i, ...titikBaru()}, ip); assert.equal(r.status, 201, `laporan ke-${i} ditolak ${r.status}: ${r.teks}`); }
  const r11 = await kirim({jenis: "info", sub: "umum", teks: "pesan ke 11", ...titikBaru()}, ip);
  assert.equal(r11.status, 429, `laporan ke-11 dalam sejam harus 429, diterima ${r11.status}`);
  assert.ok(Number(r11.h.get("retry-after")) > 0, "429 harus membawa retry-after");
  const lain = await kirim({jenis: "info", sub: "umum", teks: "dari IP lain", ...titikBaru()});
  assert.equal(lain.status, 201, `IP lain ikut terblokir: ${lain.status}`);
  const mentah = await DB.prepare("SELECT count(*) n FROM jejak WHERE ip_hash LIKE '%10.0.%'").first();
  assert.equal(mentah.n, 0, "IP mentah tersimpan di jejak");
});

uji("laporan kembar dari IP sama di titik sama dalam 30 menit ditolak 409", async () => {
  const ip = ipBaru(), p = titikBaru();
  assert.equal((await kirim({jenis: "akses", sub: "putus", ...p}, ip)).status, 201);
  const r = await kirim({jenis: "akses", sub: "putus", lat: p.lat + 0.0005, lon: p.lon}, ip);
  assert.equal(r.status, 409, `kembar ~55 m harus 409, diterima ${r.status}`);
});

uji("kontak hanya lewat endpoint terpisah, dibatasi 5/jam, hilang setelah 72 jam", async () => {
  const r = await kirim({jenis: "tawar", sub: "air", teks: "Ada 100 galon air", kontak: "+62 813-1111-2222", ...titikBaru()});
  assert.equal(r.status, 201, r.teks);
  const ip = ipBaru();
  const k = await panggil("POST", `/api/warga/${r.j.id}/kontak`, {}, ip);
  assert.equal(k.status, 200, k.teks);
  assert.equal(k.j.wa, "6281311112222", "nomor harus dinormalkan ke 62…");
  for (let i = 2; i <= 5; i++) assert.equal((await panggil("POST", `/api/warga/${r.j.id}/kontak`, {}, ip)).status, 200, `buka kontak ke-${i}`);
  const k6 = await panggil("POST", `/api/warga/${r.j.id}/kontak`, {}, ip);
  assert.equal(k6.status, 429, `buka kontak ke-6 dalam sejam harus 429, diterima ${k6.status}`);
  await DB.prepare("UPDATE kontak SET dibuat = ? WHERE laporan_id = ?").bind(KINI - 73 * JAM, r.j.id).run();
  const k7 = await panggil("POST", `/api/warga/${r.j.id}/kontak`, {}, ipBaru());
  assert.equal(k7.status, 404, `kontak umur 73 jam masih dibuka (${k7.status})`);
  const d = await panggil("GET", `/api/warga/${r.j.id}`);
  assert.equal(d.j.properties.kontak, false, "penanda kontak harus false setelah 72 jam");
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  assert.equal((await DB.prepare("SELECT count(*) n FROM kontak WHERE laporan_id = ?").bind(r.j.id).first()).n, 0, "cron tidak menghapus kontak umur 73 jam");
});

uji("konfirmasi: satu suara per IP, bisa diganti, nilai salah ditolak", async () => {
  const r = await kirim({jenis: "sinyal", sub: "lemah", ...titikBaru()});
  const a = ipBaru(), b = ipBaru();
  await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "benar"}, a);
  await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "benar"}, a);
  const x = await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "salah"}, b);
  assert.deepEqual([x.j.benar, x.j.salah], [1, 1], `dua IP (satu dobel) harus 1 benar 1 salah, diterima ${x.teks}`);
  const y = await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "benar"}, b);
  assert.deepEqual([y.j.benar, y.j.salah], [2, 0], `IP b mengganti suara, diterima ${y.teks}`);
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "mungkin"}, b)).status, 400);
  assert.equal((await panggil("POST", "/api/warga/0000000000000000/konfirmasi", {nilai: "benar"}, b)).status, 404);
});

uji("3 aduan dari 3 IP menyembunyikan laporan dari daftar, rincian, dan konfirmasi", async () => {
  const r = await kirim({jenis: "info", sub: "umum", teks: "Pesan palsu yang diadukan", ...titikBaru()});
  const a = ipBaru();
  for (let i = 0; i < 3; i++) await panggil("POST", `/api/warga/${r.j.id}/lapor`, {nilai: "palsu"}, a);
  assert.equal((await DB.prepare("SELECT disembunyikan FROM laporan WHERE id = ?").bind(r.j.id).first()).disembunyikan, 0, "satu IP mengadu 3x tidak boleh menyembunyikan");
  await panggil("POST", `/api/warga/${r.j.id}/lapor`, {nilai: "spam"}, ipBaru());
  const z = await panggil("POST", `/api/warga/${r.j.id}/lapor`, {nilai: "kasar"}, ipBaru());
  assert.equal(z.j.disembunyikan, true, `aduan ke-3 dari IP berbeda harus menyembunyikan: ${z.teks}`);
  const d = await panggil("GET", "/api/warga");
  assert.ok(!d.j.features.some(f => f.id === r.j.id), "laporan tersembunyi masih ada di daftar");
  assert.equal((await panggil("GET", `/api/warga/${r.j.id}`)).status, 404);
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/konfirmasi`, {nilai: "benar"}, ipBaru())).status, 404);
});

uji("laporan lanjutan: durasi padam dihitung dari waktu tersimpan, induk tak sah ditolak", async () => {
  const p = titikBaru();
  const a = await kirim({jenis: "listrik", sub: "padam", ...p});
  const b = await kirim({jenis: "listrik", sub: "padam", lat: p.lat + 0.0005, lon: p.lon});     // ~55 m, IP lain: tersambung otomatis
  assert.equal(b.j.induk, a.j.id, `laporan ≤150 m berjenis sama harus tersambung ke ${a.j.id}, diterima induk=${b.j.induk}`);
  assert.equal(b.j.durasi_buruk, null, "padam -> padam tidak punya durasi");
  // geser waktu tersimpan: padam pertama 108 jam lalu, kedua 50 jam lalu
  await DB.batch([DB.prepare("UPDATE laporan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(KINI - 108 * JAM, KINI - 84 * JAM, a.j.id),
                  DB.prepare("UPDATE laporan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(KINI - 50 * JAM, KINI + JAM, b.j.id)]);
  const c = await kirim({jenis: "listrik", sub: "hidup", induk: b.j.id, teks: "Sudah hidup", lat: 0, lon: 120});
  assert.equal(c.status, 201, c.teks);
  const row = await DB.prepare("SELECT c.dibuat AS dc, a.dibuat AS da, c.durasi_buruk, c.lat, c.induk FROM laporan c, laporan a WHERE c.id = ? AND a.id = ?").bind(c.j.id, a.j.id).first();
  assert.equal(row.durasi_buruk, row.dc - row.da, `durasi ${row.durasi_buruk} ms ≠ selisih waktu tersimpan ${row.dc - row.da} ms (padam pertama)`);
  assert.ok(Math.abs(row.durasi_buruk / JAM - 108) < 0.1, `durasi ${row.durasi_buruk / JAM} jam, harus ≈108`);
  const ib = await DB.prepare("SELECT lat, lon FROM laporan WHERE id = ?").bind(b.j.id).first();
  const ic = await DB.prepare("SELECT lat, lon FROM laporan WHERE id = ?").bind(c.j.id).first();
  assert.deepEqual([ic.lat, ic.lon], [ib.lat, ib.lon], `laporan lanjutan harus memakai koordinat induknya ${b.j.id} (${ib.lat},${ib.lon}), bukan kiriman (0,120)`);
  const d = await panggil("GET", "/api/warga?jenis=listrik");
  const ids = d.j.features.map(f => f.id);
  assert.ok(ids.includes(c.j.id) && !ids.includes(b.j.id), `daftar harus hanya menampilkan status terbaru (${c.j.id}), diterima ${ids}`);
  const rinci = await panggil("GET", `/api/warga/${c.j.id}`);
  assert.deepEqual(rinci.j.properties.riwayat.map(x => x.id), [b.j.id, a.j.id], "riwayat harus urut induk -> leluhur");
  assert.equal((await kirim({jenis: "listrik", sub: "hidup", induk: "ffffffffffffffff"})).status, 404, "induk tidak ada harus 404");
  assert.equal((await kirim({jenis: "sinyal", sub: "lancar", induk: c.j.id})).status, 400, "induk beda jenis harus 400");
  assert.equal((await kirim({jenis: "minta", sub: "air", induk: c.j.id})).status, 400, "jenis tanpa lanjutan harus 400");
  await DB.prepare("UPDATE laporan SET disembunyikan = 1 WHERE id = ?").bind(c.j.id).run();
  assert.equal((await kirim({jenis: "listrik", sub: "padam", induk: c.j.id})).status, 404, "induk tersembunyi harus 404");
});

uji("tandai selesai butuh token pelapor; laporan selesai hilang dan kontaknya dihapus", async () => {
  const r = await kirim({jenis: "minta", sub: "obat", kontak: "081299998888", ...titikBaru()});
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/selesai`, {token: "0".repeat(32)}, ipBaru())).status, 403, "token salah harus 403");
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/selesai`, {token: r.j.token}, ipBaru())).status, 200);
  assert.ok(!(await panggil("GET", "/api/warga")).j.features.some(f => f.id === r.j.id), "laporan selesai masih di daftar");
  assert.equal((await DB.prepare("SELECT count(*) n FROM kontak WHERE laporan_id = ?").bind(r.j.id).first()).n, 0, "kontak laporan selesai belum dihapus");
});

uji("kedaluwarsa: hilang dari daftar saat lewat, dihapus cron setelah 7 hari", async () => {
  const r = await kirim({jenis: "bbm", sub: "habis", detail: {bahan: ["solar"]}, ...titikBaru()});
  const k = await DB.prepare("SELECT dibuat, kedaluwarsa FROM laporan WHERE id = ?").bind(r.j.id).first();
  assert.equal(k.kedaluwarsa - k.dibuat, 24 * JAM, `umur BBM ${(k.kedaluwarsa - k.dibuat) / JAM} jam, harus 24`);
  const api = await kirim({jenis: "api", sub: "kecil", bahaya: "karhutla", ...titikBaru()});
  const ka = await DB.prepare("SELECT dibuat, kedaluwarsa FROM laporan WHERE id = ?").bind(api.j.id).first();
  assert.equal(ka.kedaluwarsa - ka.dibuat, 12 * JAM, "umur api harus 12 jam");
  await DB.prepare("UPDATE laporan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(KINI - 25 * JAM, KINI - JAM, r.j.id).run();
  assert.ok(!(await panggil("GET", "/api/warga")).j.features.some(f => f.id === r.j.id), "laporan kedaluwarsa masih di daftar");
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan WHERE id = ?").bind(r.j.id).first()).n, 1, "lewat 1 jam belum boleh dihapus (riwayat 7 hari)");
  await DB.prepare("UPDATE laporan SET dibuat = ?, kedaluwarsa = ? WHERE id = ?").bind(KINI - 9 * 24 * JAM, KINI - 8 * 24 * JAM, r.j.id).run();
  await DB.prepare("INSERT INTO jejak VALUES (?, 'lapor', ?)").bind("b".repeat(64), KINI - 3 * 24 * JAM).run();
  await (await mf.getWorker()).scheduled({cron: "17 * * * *"});
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan WHERE id = ?").bind(r.j.id).first()).n, 0, "laporan kedaluwarsa 8 hari belum dihapus cron");
  assert.equal((await DB.prepare("SELECT count(*) n FROM jejak WHERE waktu < ?").bind(KINI - 2 * 24 * JAM).first()).n, 0, "jejak > 2 hari belum dihapus cron");
});

uji("api dekat titik panas 24 jam diberi lencana + id kompleks; jauh tidak; satwa dibulatkan", async () => {
  const dekat = await kirim({jenis: "api", sub: "besar", bahaya: "karhutla", lat: -2.0, lon: 113.012});   // ~1,3 km
  assert.equal(dekat.status, 201, dekat.teks);
  assert.deepEqual([dekat.j.titik_panas, dekat.j.laci], [true, "K0001"], `api 1,3 km dari titik K0001: ${dekat.teks}`);
  const jauh = await kirim({jenis: "api", sub: "besar", bahaya: "karhutla", lat: -2.0, lon: 113.05});      // ~5,5 km
  assert.equal(jauh.j.titik_panas, false, `api 5,5 km tidak boleh berlencana: ${jauh.teks}`);
  const s = await kirim({jenis: "satwa", sub: "orangutan", bahaya: "karhutla", lat: -2.34567, lon: 113.98765});
  const row = await DB.prepare("SELECT lat, lon FROM laporan WHERE id = ?").bind(s.j.id).first();
  assert.deepEqual([row.lat, row.lon], [-2.35, 113.99], "koordinat satwa harus dibulatkan 0,01°");
});

const ADM = {"x-admin-token": "rahasia-admin"}, ADM2 = {"x-admin-token": "token-moderator-2"};
const audit = async id => (await DB.prepare("SELECT moderator, aksi, jumlah, alasan FROM audit_moderasi WHERE laporan_id = ? ORDER BY id").bind(id).all()).results;
uji("admin: tanpa token ditolak; hapus = soft-delete tercatat di audit, bisa dipulihkan", async () => {
  const r = await kirim({jenis: "minta", sub: "air", teks: "untuk diuji admin", kontak: "081277776666", ...titikBaru()});
  assert.equal((await panggil("GET", "/api/warga/admin")).status, 403);
  assert.equal((await panggil("GET", "/api/warga/admin", undefined, "1.1.1.1", {"x-admin-token": "salah"})).status, 403);
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/admin`, {aksi: "hapus"}, "1.1.1.1", {"x-admin-token": "salah"})).status, 403);
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/admin`, {aksi: "hapus"}, "1.1.1.1", {"x-admin-token": "rahasia-admin,token-moderator-2"})).status, 403, "daftar token utuh bukan token sah");
  assert.equal((await audit(r.j.id)).length, 0, "aksi yang ditolak tidak boleh tercatat");
  const L = await panggil("GET", "/api/warga/admin?tersembunyi=1", undefined, "1.1.1.1", ADM);
  assert.equal(L.status, 200); assert.ok(L.j.some(x => x.disembunyikan === 1), "daftar admin harus memuat laporan tersembunyi");
  assert.ok(!L.teks.includes("6281"), "daftar admin pun tidak memuat nomor WA");
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/admin`, {aksi: "terbangkan"}, "1.1.1.1", ADM)).status, 400);
  const h = await panggil("POST", `/api/warga/${r.j.id}/admin`, {aksi: "hapus", alasan: "uji"}, "1.1.1.1", ADM2);
  assert.equal(h.status, 200, h.teks);
  const row = await DB.prepare("SELECT disembunyikan FROM laporan WHERE id = ?").bind(r.j.id).first();
  assert.equal(row?.disembunyikan, 1, `hapus harus soft-delete (baris tetap, disembunyikan=1), diterima ${JSON.stringify(row)}`);
  assert.equal((await DB.prepare("SELECT count(*) n FROM kontak WHERE laporan_id = ?").bind(r.j.id).first()).n, 0, "hapus harus langsung membuang kontak WA");
  assert.equal((await panggil("GET", `/api/warga/${r.j.id}`)).status, 404, "laporan terhapus masih tampil di rincian");
  assert.equal((await panggil("POST", `/api/warga/${r.j.id}/admin`, {aksi: "tampilkan"}, "1.1.1.1", ADM)).status, 200);
  assert.equal((await panggil("GET", `/api/warga/${r.j.id}`)).status, 200, "tampilkan harus memulihkan laporan yang dihapus");
  const A = await audit(r.j.id), sha12 = async t => Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t))).toString("hex").slice(0, 12);
  assert.deepEqual(A.map(x => [x.aksi, x.moderator, x.alasan]), [["hapus", await sha12("token-moderator-2"), "uji"], ["tampilkan", await sha12("rahasia-admin"), ""]],
    `audit harus mencatat aksi + 12 karakter hash token moderator masing-masing: ${JSON.stringify(A)}`);
  assert.ok(!JSON.stringify(A).includes("rahasia-admin"), "token mentah tidak boleh tersimpan di audit");
  const G = await panggil("GET", "/api/warga/admin?audit=1", undefined, "1.1.1.1", ADM);
  assert.equal(G.status, 200); assert.ok(G.j.some(x => x.laporan_id === r.j.id && x.aksi === "hapus"), "GET admin?audit=1 harus memuat jejak");
});

uji("hapus_pengirim wajib konfirmasi jumlah; tanpa itu tidak mengubah apa pun", async () => {
  const ip = ipBaru(), a = await kirim({jenis: "info", sub: "umum", teks: "spam satu", ...titikBaru()}, ip), b = await kirim({jenis: "info", sub: "umum", teks: "spam dua", ...titikBaru()}, ip);
  const lain = await kirim({jenis: "info", sub: "umum", teks: "warga lain", ...titikBaru()});
  const tanpa = await panggil("POST", `/api/warga/${a.j.id}/admin`, {aksi: "hapus_pengirim"}, "1.1.1.1", ADM);
  assert.equal(tanpa.status, 409, `tanpa konfirmasi harus 409, diterima ${tanpa.status}: ${tanpa.teks}`);
  assert.equal(tanpa.j.perlu_konfirmasi, 2, "409 harus menyebut jumlah laporan yang akan kena");
  assert.deepEqual(tanpa.j.contoh.map(x => x.id).sort(), [a.j.id, b.j.id].sort());
  const salah = await panggil("POST", `/api/warga/${a.j.id}/admin`, {aksi: "hapus_pengirim", konfirmasi: 5}, "1.1.1.1", ADM);
  assert.equal(salah.status, 409, "konfirmasi dengan jumlah yang tidak cocok harus ditolak");
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan WHERE id IN (?, ?) AND disembunyikan = 1").bind(a.j.id, b.j.id).first()).n, 0, "tanpa konfirmasi sah tidak boleh ada yang disembunyikan");
  assert.equal((await audit(a.j.id)).length, 0, "percobaan tanpa konfirmasi tidak boleh tercatat sebagai aksi");
  const ok = await panggil("POST", `/api/warga/${a.j.id}/admin`, {aksi: "hapus_pengirim", konfirmasi: 2}, "1.1.1.1", ADM);
  assert.equal(ok.status, 200, ok.teks); assert.equal(ok.j.terhapus, 2);
  assert.equal((await DB.prepare("SELECT count(*) n FROM laporan WHERE id IN (?, ?) AND disembunyikan = 1").bind(a.j.id, b.j.id).first()).n, 2, "kedua laporan pengirim harus tersembunyi (soft-delete)");
  assert.equal((await panggil("GET", `/api/warga/${lain.j.id}`)).status, 200, "laporan pengirim lain ikut terhapus");
  assert.deepEqual((await audit(a.j.id)).map(x => [x.aksi, x.jumlah]), [["hapus_pengirim", 2]]);
});

const gempaSumber = jam => DB.prepare("INSERT INTO gempa_sumber (kunci, etag, isi, dibuat) VALUES ('autogempa', NULL, '{}', ?) ON CONFLICT(kunci) DO UPDATE SET dibuat = excluded.dibuat").bind(KINI - jam * JAM).run();
const hapusGempaSumber = () => DB.prepare("DELETE FROM gempa_sumber").run();
const cuacaSumber = (jam, DBx = DB) => DBx.prepare("INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES ('nowcast', '{}', ?) ON CONFLICT(kunci) DO UPDATE SET dibuat = excluded.dibuat").bind(KINI - jam * JAM).run();
/* registry 19 Okt 2026: lima bencana baru punya sumber_status berita_<id> (/banjir/data/berita_<id>.json, ambang 30 jam), aktif ikut 503 */
const beritaSegar = () => Object.fromEntries(["gempa", "cuaca", "udara", "gunungapi", "kekeringan"].map(n => [`/banjir/data/berita_${n}.json`, metaUji(2)]));
const metaUji = jam => JSON.stringify({dibuat: new Date(KINI - jam * JAM).toISOString().slice(0, 16) + "+00:00", isi: "x".repeat(5000)});
uji("status: 200 bila semua sumber segar, 503 menyebut sumber yang basi atau hilang", async () => {
  Object.assign(ASET_UJI, {...beritaSegar(), "/data/kekeringan_meta.json": metaUji(2), "/udara/data/prakiraan.json": metaUji(2), "/banjir/data/gunungapi_status.json": metaUji(2), "/data/meta.json": metaUji(2), "/data/presiden/semua.json": metaUji(2), "/banjir/data/meta.json": metaUji(20), "/data/berita.json": metaUji(5), "/data/dampak.json": metaUji(100), "/banjir/data/cuaca_meta.json": metaUji(3)});
  await gempaSumber(0.1); await cuacaSumber(0.5);
  try {
    let r = await panggil("GET", "/api/status");
    assert.equal(r.status, 200, `semua segar (dampak tidak punya ambang) harus 200: ${r.teks}`);
    assert.ok("cuaca" in r.j.sumber && "cuaca_nowcast" in r.j.sumber && !("cuaca_nowcast" in r.j.uji), "cuaca (aktif) masuk sumber, bukan uji");
    assert.equal(r.j.sumber.cuaca_nowcast.ambang_jam, 2); assert.equal(r.j.sumber.cuaca_nowcast.umur_jam, 0.5); assert.equal(r.j.sumber.cuaca.ambang_jam, 30, "cuaca_meta kini berambang 30 jam di registry"); assert.equal(r.j.sumber.cuaca.umur_jam, 3);
    await cuacaSumber(2.5);
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503, `cuaca_nowcast 2,5 jam (> 2) harus 503: ${r.teks}`); assert.deepEqual(r.j.basi, ["cuaca_nowcast"]);
    await DB.prepare("DELETE FROM cuaca_sumber").run();
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503); assert.deepEqual(r.j.basi, ["cuaca_nowcast"]); assert.equal(r.j.sumber.cuaca_nowcast.umur_jam, null, "belum pernah ada data = basi");
    await cuacaSumber(0.5);
    r = await panggil("GET", "/api/status"); assert.equal(r.status, 200, r.teks);
    assert.equal(r.j.ok, true); assert.equal(r.j.sumber.titik.umur_jam, 2); assert.equal(r.j.sumber.dampak.umur_jam, 100);
    assert.equal(r.h.get("cache-control"), "public, max-age=60", "status 200 boleh disimpan cache tepi 60 dtk");
    ASET_UJI["/data/meta.json"] = metaUji(9);
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503, `titik 9 jam (> 8) harus 503: ${r.teks}`); assert.deepEqual(r.j.basi, ["titik"]);
    ASET_UJI["/data/meta.json"] = metaUji(2); ASET_UJI["/data/presiden/semua.json"] = metaUji(9);   // panel /presiden: sumber status sendiri, ambang 8 jam (registry 22 Okt)
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503, `presiden 9 jam (> 8) harus 503: ${r.teks}`); assert.deepEqual(r.j.basi, ["presiden"]); assert.equal(r.j.sumber.presiden.ambang_jam, 8);
    ASET_UJI["/data/presiden/semua.json"] = metaUji(2);
    ASET_UJI["/data/meta.json"] = metaUji(7.9); ASET_UJI["/data/berita.json"] = null;
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503); assert.deepEqual(r.j.basi, ["berita"], `berita hilang (aktif) harus basi: ${r.teks}`);
    assert.equal(r.j.sumber.berita.umur_jam, null);
    ASET_UJI["/data/berita.json"] = '{"judul":"tanpa dibuat"}';
    assert.ok((await panggil("GET", "/api/status")).j.basi.includes("berita"), "berkas tanpa 'dibuat' harus dianggap basi");
    ASET_UJI["/data/berita.json"] = metaUji(5);
    for (const [nama, jalur] of [["kekeringan", "/data/kekeringan_meta.json"], ["kualitas", "/udara/data/prakiraan.json"]]) {
      ASET_UJI[jalur] = metaUji(31);   // ambang 30 jam, bencana aktif
      r = await panggil("GET", "/api/status");
      assert.equal(r.status, 503, `${nama} 31 jam (> 30, aktif) harus 503: ${r.teks}`); assert.deepEqual(r.j.basi, [nama]);
      assert.ok(nama in r.j.sumber && !(nama in r.j.uji), `${nama} aktif masuk sumber, bukan uji`);
      ASET_UJI[jalur] = null;
      r = await panggil("GET", "/api/status");
      assert.equal(r.status, 503); assert.deepEqual(r.j.basi, [nama], `${nama} hilang harus basi`);
      ASET_UJI[jalur] = metaUji(2);
    }
    ASET_UJI["/banjir/data/gunungapi_status.json"] = null;   // gunungapi kini berambang 30 jam (registry 19 Okt): hilang = basi = 503
    r = await panggil("GET", "/api/status");
    assert.equal(r.status, 503); assert.deepEqual(r.j.basi, ["gunungapi"]); assert.equal(r.j.sumber.gunungapi.ambang_jam, 30);
    ASET_UJI["/banjir/data/gunungapi_status.json"] = metaUji(2);
    for (const n of ["gempa", "cuaca", "udara", "gunungapi", "kekeringan"]) {   // berita_<id>: aktif, ambang 30 jam
      ASET_UJI[`/banjir/data/berita_${n}.json`] = metaUji(31);
      r = await panggil("GET", "/api/status");
      assert.equal(r.status, 503, `berita_${n} 31 jam harus 503`); assert.deepEqual(r.j.basi, [`berita_${n}`]);
      ASET_UJI[`/banjir/data/berita_${n}.json`] = metaUji(2);
    }
    assert.equal((await panggil("GET", "/api/status")).status, 200);
  } finally { for (const k of Object.keys(ASET_UJI)) delete ASET_UJI[k]; await hapusGempaSumber(); await DB.prepare("DELETE FROM cuaca_sumber").run(); }
});

uji("status: hanya sumber bencana aktif menentukan 503 (semua bencana kini aktif, `uji` kosong)", async () => {
  Object.assign(ASET_UJI, {...beritaSegar(), "/data/meta.json": metaUji(2), "/data/presiden/semua.json": metaUji(2), "/banjir/data/meta.json": metaUji(20), "/data/kekeringan_meta.json": metaUji(2), "/udara/data/prakiraan.json": metaUji(2), "/banjir/data/gunungapi_status.json": metaUji(2), "/data/berita.json": metaUji(5), "/data/dampak.json": metaUji(100), "/banjir/data/cuaca_meta.json": metaUji(3)});
  await gempaSumber(0.1); await cuacaSumber(0.5);
  try {
    const r = await panggil("GET", "/api/status");
    assert.equal(r.status, 200, `uji basi/hilang harus tetap 200: ${r.teks}`); assert.equal(r.j.ok, true); assert.deepEqual(r.j.basi, []);
    assert.deepEqual(r.j.uji, {}, "tidak ada bencana tahap uji");
    for (const n of ["cuaca", "cuaca_nowcast", "kekeringan", "kualitas", "gunungapi"]) assert.ok(n in r.j.sumber && !(n in r.j.uji), `${n} aktif masuk sumber, bukan uji`);
    assert.ok("gempa_terbaru" in r.j.sumber && !("gempa_terbaru" in r.j.uji), "gempa aktif masuk `sumber`, bukan `uji`");
    assert.equal(r.j.sumber.banjir.umur_jam, 20, "banjir aktif (16 Okt) masuk `sumber`");
    ASET_UJI["/banjir/data/meta.json"] = metaUji(31);   // banjir aktif basi = 503
    const b = await panggil("GET", "/api/status");
    assert.equal(b.status, 503); assert.deepEqual(b.j.basi, ["banjir"]);
    ASET_UJI["/banjir/data/meta.json"] = metaUji(20); ASET_UJI["/data/meta.json"] = metaUji(9);   // sumber aktif basi tetap 503 walau uji ikut basi
    const s = await panggil("GET", "/api/status");
    assert.equal(s.status, 503); assert.deepEqual(s.j.basi, ["titik"]);
    ASET_UJI["/data/meta.json"] = metaUji(2);
    await gempaSumber(0.6);   // gempa_terbaru aktif, ambang 0,5 jam
    const g = await panggil("GET", "/api/status");
    assert.equal(g.status, 503, `gempa_terbaru 0,6 jam (> 0,5) harus 503: ${g.teks}`); assert.deepEqual(g.j.basi, ["gempa_terbaru"]);
    await hapusGempaSumber();   // belum pernah ada data = basi juga
    const h = await panggil("GET", "/api/status");
    assert.equal(h.status, 503); assert.deepEqual(h.j.basi, ["gempa_terbaru"]); assert.equal(h.j.sumber.gempa_terbaru.umur_jam, null);
  } finally { for (const k of Object.keys(ASET_UJI)) delete ASET_UJI[k]; await hapusGempaSumber(); await DB.prepare("DELETE FROM cuaca_sumber").run(); }
});

/* registry salinan: satu bencana (cuaca) diturunkan ke `uji`. Worker kedua dibangun dari salinan src/ dengan bencana.generated.js ditimpa,
   karena SUMBER_UJI dibaca saat modul dimuat. Aturan: uji basi/hilang = 200 + dilaporkan di `uji`; aktif basi = 503. */
uji("status: sumber tahap uji (registry salinan dengan cuaca `uji`) basi/hilang tidak pernah 503; aktif basi tetap 503", async () => {
  const B = structuredClone(REG); B.bencana.find(b => b.id === "cuaca").status = "uji";
  const tmp = mkdtempSync(path.join(tmpdir(), "uji-registry-"));
  cpSync(path.join(AKAR, "src"), path.join(tmp, "src"), {recursive: true});
  mkdirSync(path.join(tmp, "public")); for (const f of ["informasi_jenis.js", "ews_tindakan.js", "laporan_karhutla_spek.js", "laporan_karhutla_wa.js", "laporan_bencana_spek.js", "laporan_bencana_wa.js"]) copyFileSync(path.join(AKAR, "public", f), path.join(tmp, "public", f));
  mkdirSync(path.join(tmp, "public/pipa")); copyFileSync(path.join(AKAR, "public/pipa/formulir.js"), path.join(tmp, "public/pipa/formulir.js"));   // src/sippa.js mengimpor formulir.js langsung (ADR-03)
  mkdirSync(path.join(tmp, "public/bnpb")); copyFileSync(path.join(AKAR, "public/bnpb/pendataan_spek.js"), path.join(tmp, "public/bnpb/pendataan_spek.js"));   // src/pendataan.js mengimpor spek bersama langsung
  writeFileSync(path.join(tmp, "src/bencana.generated.js"), `export default ${JSON.stringify(B)};\n`);
  const mf2 = new Miniflare({...opsi(), scriptPath: path.join(tmp, "src/worker.js"), modulesRoot: tmp, d1Databases: {DB: "uji-registry"}});
  try {
    const D2 = await mf2.getD1Database("DB"); await D2.batch(pecah(migrasi()).map(s => D2.prepare(s)));
    const st = async () => { const r = await mf2.dispatchFetch("http://warga.lokal/api/status"); return {status: r.status, j: await r.json()}; };
    Object.assign(ASET_UJI, {...beritaSegar(), "/data/kekeringan_meta.json": metaUji(2), "/udara/data/prakiraan.json": metaUji(2), "/banjir/data/gunungapi_status.json": metaUji(2), "/data/meta.json": metaUji(2), "/data/presiden/semua.json": metaUji(2), "/banjir/data/meta.json": metaUji(20), "/data/berita.json": metaUji(5), "/data/dampak.json": metaUji(100)});
    await D2.prepare("INSERT INTO gempa_sumber (kunci, etag, isi, dibuat) VALUES ('autogempa', NULL, '{}', ?)").bind(KINI - 0.1 * JAM).run();
    let r = await st();   // tabel cuaca_sumber kosong = cuaca_nowcast (uji) hilang
    assert.equal(r.status, 200, `uji hilang harus tetap 200: ${JSON.stringify(r.j)}`); assert.equal(r.j.ok, true); assert.deepEqual(r.j.basi, []);
    assert.equal(r.j.uji.cuaca_nowcast.umur_jam, null); assert.equal(r.j.uji.cuaca_nowcast.basi, true, "dilaporkan basi tetapi informatif");
    assert.ok("cuaca" in r.j.uji && !("cuaca_nowcast" in r.j.sumber) && !("cuaca" in r.j.sumber), "uji tidak masuk `sumber` (yang menentukan ok)");
    await cuacaSumber(5, D2);   // basi (> 2 jam), tetap 200
    r = await st(); assert.equal(r.status, 200); assert.equal(r.j.uji.cuaca_nowcast.basi, true); assert.equal(r.j.uji.cuaca_nowcast.umur_jam, 5);
    await cuacaSumber(0.5, D2);
    r = await st(); assert.equal(r.status, 200); assert.equal(r.j.uji.cuaca_nowcast.basi, false);
    ASET_UJI["/data/meta.json"] = metaUji(9);   // sumber aktif basi = 503 walau uji ada
    r = await st(); assert.equal(r.status, 503); assert.deepEqual(r.j.basi, ["titik"]); assert.ok("cuaca_nowcast" in r.j.uji);
  } finally { for (const k of Object.keys(ASET_UJI)) delete ASET_UJI[k]; await mf2.dispose(); rmSync(tmp, {recursive: true, force: true}); }
});


uji("POST dari origin lain ditolak", async () => {
  const r = await panggil("POST", "/api/warga", {jenis: "info", sub: "umum", teks: "dari situs lain"}, ipBaru(), {origin: "https://jahat.example"});
  assert.equal(r.status, 403, `origin lain = ${r.status}`);
});

uji("tanpa IP_SALT semua penulisan ditolak 503 (tidak pernah hash tanpa garam)", async () => {
  const m2 = new Miniflare(opsi({IP_SALT: ""}));
  try {
    const r = await m2.dispatchFetch("http://warga.lokal/api/warga", {method: "POST", body: JSON.stringify({jenis: "info", sub: "umum", teks: "tanpa garam"})});
    assert.equal(r.status, 503, `tanpa IP_SALT = ${r.status}`);
  } finally { await m2.dispose(); }
});

uji("titik panas 3 jam: CSV rusak dibuang, keyakinan dikodekan, kembar dihapus, laut dibuang", async () => {
  assert.equal((await panggil("GET", "/api/titik")).status, 404, "sebelum cron pertama /api/titik harus 404");
  // produksi hanya punya jadwal "* * * * *" (batas 5 cron akun Free): titik dipilih di menit 15 jam UTC kelipatan 3
  const w = await mf.getWorker(), jam = (h, m) => Date.UTC(2026, 9, 16, h, m);
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(0, 14)});
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(1, 15)});
  assert.equal((await panggil("GET", "/api/titik")).status, 404, "menit 14, atau menit 15 di jam bukan kelipatan 3, tidak boleh menarik FIRMS");
  await w.scheduled({cron: "* * * * *", scheduledTime: jam(3, 15)});
  const r = await panggil("GET", "/api/titik");
  assert.equal(r.status, 200, r.teks);
  assert.match(r.h.get("cache-control"), /max-age=600/);
  const B = r.j.baris, kol = r.j.kolom;
  assert.deepEqual(kol, ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"], "kolom harus sama dengan hotspot.json");
  // sah: 2 VIIRS SNPP (1 kembar dibuang) + 3 MODIS = 5. Rusak/luar kotak/laut/lama tidak masuk.
  assert.equal(B.length, 5, `jumlah titik ${B.length}, harus 5: ${JSON.stringify(B)}`);
  const kc = Object.fromEntries(B.filter(b => b[3] === "M").map(b => [b[0], b[5]]));
  assert.deepEqual(kc, {"-2.14": 0, "-2.15": 1, "-2.16": 2}, "MODIS 25/50/85 harus 0/1/2 (ambang BRIN 30/80)");
  assert.deepEqual(B.filter(b => b[3] === "N").map(b => b[5]).sort(), [0, 2], "VIIRS l/h harus 0/2");
  assert.ok(B.every(b => r.j.wilayah[b[6]]?.startsWith("62|")), `titik Kalteng harus berwilayah 62|…: ${r.j.wilayah}`);
  assert.ok(!B.some(b => b[0] === -5.5), "titik Laut Jawa harus dibuang");
  assert.equal(Math.max(...B.map(b => b[2])), 0, "titik terbaru harus jam 0 terhadap acuan");
  assert.ok(r.j.galat.some(g => g.includes("VIIRS_NOAA20_NRT")), "galat sensor gagal harus dicatat");
  for (let i = 0; i < 9; i++) await (await mf.getWorker()).scheduled({cron: "15 */3 * * *"});
  assert.equal((await DB.prepare("SELECT count(*) n FROM titik_terbaru").first()).n, 8, "hanya 8 putaran terakhir disimpan");
});

uji("GET /cuaca/simulasi menyajikan public/cuaca/simulasi.html, /udara/simulasi index.html udara, /cuaca/peta index.html cuaca (registry `halaman`)", async () => {
  const baca = f => readFileSync(path.join(AKAR, "public", f), "utf8"), judul = t => t.match(/<title>[^<]*<\/title>/)?.[0];
  const sim = await panggil("GET", "/cuaca/simulasi");
  assert.equal(sim.status, 200); assert.equal(judul(sim.teks), judul(baca("cuaca/simulasi.html")), "judul halaman simulasi cuaca");
  assert.ok(sim.teks.length > 1000 && sim.teks.includes("sim_layar.js"), "isi simulasi.html, bukan index.html");
  assert.equal(judul((await panggil("GET", "/cuaca/peta")).teks), judul(baca("cuaca/index.html")));
  assert.equal(judul((await panggil("GET", "/udara/simulasi")).teks), judul(baca("udara/index.html")));
});

/* PROGRAM-15-JAM blok E: jeda satelit lewat -> data terbit, dari meta.json (dibuat - data_terakhir); tanpa ambang, tidak pernah 503 */
uji("status: jeda satelit dari meta.json, tanpa ambang dan tanpa data_terakhir tidak dilaporkan", async () => {
  const lama = ASET_UJI["/data/meta.json"], iso = jam => new Date(KINI - jam * JAM).toISOString();
  try {
    ASET_UJI["/data/meta.json"] = JSON.stringify({dibuat: iso(1), data_terakhir: iso(3.5), isi: "x".repeat(2000)});
    let r = await panggil("GET", "/api/status");
    assert.equal(r.j.sumber.jeda_satelit?.umur_jam, 2.5, r.teks);
    assert.equal(r.j.sumber.jeda_satelit.ambang_jam, null);
    assert.ok(!r.j.basi.includes("jeda_satelit"), "jeda tanpa ambang tidak boleh membuat 503");
    ASET_UJI["/data/meta.json"] = JSON.stringify({dibuat: iso(1)});
    r = await panggil("GET", "/api/status");
    assert.ok(!("jeda_satelit" in r.j.sumber), "tanpa data_terakhir: tidak ada angka, bukan nol");
  } finally { if (lama === undefined) delete ASET_UJI["/data/meta.json"]; else ASET_UJI["/data/meta.json"] = lama; }
});
