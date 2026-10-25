/* Paket skenario-geologi: skenario terburuk yang masuk akal untuk gempa megathrust, tsunami, dan gunung api, per kab/kota.
   Menjalankan mesin platform APA ADANYA di node (pola scripts/gunungapi/cek_merapi2010.mjs dan scripts/gempa/kalibrasi_kerusakan.mjs):
     gempa   public/gempa/guncangan.js + kerusakan.js + tsunami.js (skenario dari public/gempa/sim.js DIKENAL)
     gunung  public/gunungapi/sim_lahar.js + sim_tanggap.js (Merapi setara 2010) dan overlay KRB PVMBG (paparan_geo.json x pop/<id>.json)
   Korban jiwa TIDAK diambil dari satu angka model: rentang = paparan skenario x rasio historis kejadian analog (paparan analog dihitung
   lewat mesin yang sama), disandingkan pita kerusakan.js [rendah, tengah, tinggi] (galat LOO tercatat ±5,3 kali).
   Jalankan:  node data/kajian-bnpb/bangun/skenario-geologi.mjs      (butuh jaringan sekali untuk ubin DEM terrarium; disimpan di data/raw/terrarium)
   Keluaran:  data/kajian-bnpb/data/skenario-geologi/*  lalu self-check assert; keluar non-nol bila invarian rusak. */
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const AKAR = fileURLToPath(new URL("../../../", import.meta.url)), P = AKAR + "public/", MENTAH = AKAR + "data/kajian-bnpb/riset/mentah/";
const OUT = AKAR + "data/kajian-bnpb/data/skenario-geologi/", TERRA = AKAR + "data/raw/terrarium/";
const baca = f => JSON.parse(fs.readFileSync(f, "utf8"));
const RAD = Math.PI / 180, bulat = (v, n = 0) => v == null ? null : Math.round(v * 10 ** n) / 10 ** n;
const hav = (la1, lo1, la2, lo2) => { const a = Math.sin((la2 - la1) * RAD / 2) ** 2 + Math.cos(la1 * RAD) * Math.cos(la2 * RAD) * Math.sin((lo2 - lo1) * RAD / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(a)); };
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const jumlah = (a, f = x => x) => a.reduce((s, x) => s + f(x), 0);

/* ================================================================ wilayah: 514 kab/kota, poligon, kecamatan */
const KOTA = baca(AKAR + "scripts/udara/kota.json"), PROVNAMA = baca(P + "data/meta.json").provinsi;
const KAB = KOTA.baris.map(r => ({ kode: r[0], prov: r[2], kab: r[6], nama: r[1] }));
const PULAU = p => ({ 1: "Sumatra", 2: "Sumatra", 3: "Jawa", 5: "Bali-Nusa Tenggara", 6: "Kalimantan", 7: "Sulawesi", 8: "Maluku", 9: "Papua" })[p[0]];
const ALIAS = { "75|Pahuwato": "75|Pohuwato" }; /* ejaan peta kecamatan vs Kemendagri */
const kodeDari = new Map(KAB.map(k => [k.prov + "|" + k.kab, k.kode]));
const kodeKab = (prov, kab) => kodeDari.get(ALIAS[prov + "|" + kab] || prov + "|" + kab) || null;
const KABK = new Map(KAB.map(k => [k.kode, k]));
const kecKode = k => { const [p, kb] = k.split("|"); return kodeKab(p, kb); };

const POLI = [], IDX = new Map(), SEL = 0.5;
for (const f of fs.readdirSync(P + "geo/kabupaten")) {
  if (!/^\d\d\.json$/.test(f)) continue;
  for (const ft of baca(P + "geo/kabupaten/" + f).features) {
    const kode = kodeKab(f.slice(0, 2), ft.properties.kab); assert.ok(kode, "poligon tanpa kode: " + ft.properties.kab);
    for (const p of ft.geometry.type === "Polygon" ? [ft.geometry.coordinates] : ft.geometry.coordinates) {
      const xs = p[0].map(c => c[0]), ys = p[0].map(c => c[1]), b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], i = POLI.push({ kode, b, p }) - 1;
      for (let x = Math.floor(b[0] / SEL); x <= Math.floor(b[2] / SEL); x++) for (let y = Math.floor(b[1] / SEL); y <= Math.floor(b[3] / SEL); y++) { const k = x + "," + y; (IDX.get(k) || IDX.set(k, []).get(k)).push(i); }
    }
  }
}
function dalamCincin(rings, x, y) { let a = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) a = !a; } return a; }
const kabPIP = (lat, lon) => { for (const i of IDX.get(Math.floor(lon / SEL) + "," + Math.floor(lat / SEL)) || []) { const q = POLI[i]; if (lon >= q.b[0] && lon <= q.b[2] && lat >= q.b[1] && lat <= q.b[3] && dalamCincin(q.p, lon, lat)) return q.kode; } return null; };

/* ================================================================ mesin gempa & tsunami (vm, sama dengan kalibrasi_kerusakan.mjs) */
const cx = { console, Math, JSON }; vm.createContext(cx);
for (const b of ["gempa/tsunami.js", "gempa/guncangan.js", "gempa/kerusakan.js"]) vm.runInContext(fs.readFileSync(P + b, "utf8"), cx);
const T = cx.Tsunami, K = cx.GempaKerusakan, MODEL = baca(P + "gempa/data/model_guncangan.json"), KAL = baca(P + "gempa/data/kalibrasi_kerusakan.json");
const PUSAT = baca(P + "banjir/data/pusat_kec.json"), PENDF = baca(P + "data/penduduk.json"), PEND = PENDF.kec;
const ctx = { M: cx.GempaGuncangan.pasang(MODEL), Tsunami: T, model: MODEL, pusat: PUSAT, pend: PEND,
  vs30: cx.GempaGuncangan.vs30Grid(baca(P + "gempa/data/vs30.json"), new Uint8Array(fs.readFileSync(P + "gempa/data/vs30.bin")), MODEL.vs30_baku || 400) };
K.atur(KAL);
const G = T.dariBuffer(baca(P + "gempa/data/batimetri.json"), new Uint8Array(fs.readFileSync(P + "gempa/data/batimetri.bin")).buffer);
const cariKec = T.pencariKec(PUSAT, 30), kabTitik = (la, lo) => kabPIP(la, lo) || (k => k && kecKode(k))(cariKec(la, lo));
const SESAR = baca(P + "gempa/data/sesar.geojson");
const JIWA_PER_RUMAH = +fs.readFileSync(P + "gempa/kerusakan.js", "utf8").match(/JIWA_PER_RUMAH = ([\d.]+)/)[1];
const SIMJS = fs.readFileSync(P + "gempa/sim.js", "utf8");
const DIKENAL = ["jawa", "mentawai", "sumba"].map(id => new Function("return " + SIMJS.match(new RegExp(`\\{id: "${id}"[^\\n]*?\\}(?=,\\n)`))[0])());

/* ================================================================ parameter kebijakan & sumber angka */
const PB = baca(P + "banjir/data/param_banjir.json").param;
const STIM = { rb: PB.stimulan_rumah_rb[0] / 1e6, rs: PB.stimulan_rumah_rs[0] / 1e6, rr: PB.stimulan_rumah_rr[0] / 1e6 };       /* 60/30/15 jt */
const STIM_LAMA = { rb: PB.stimulan_rumah_rb[1] / 1e6, rs: PB.stimulan_rumah_rs[1] / 1e6, rr: PB.stimulan_rumah_rr[1] / 1e6 }; /* 50/25/10 jt */
const rupiah = (rb, rs, rr, s = STIM) => rb * s.rb + rs * s.rs + rr * s.rr; /* juta rupiah */
const SISA_HIDUP = [25, 35, 45], HARI = [7, 30, 90];
/* Nankai 2025 (JST Science Japan, merangkum Cabinet Office): kematian tsunami 215.000 bila 20% evakuasi segera, 94.000 bila 70% */
const NANKAI = { e20: 215000, e70: 94000 }, fEvak = e => (NANKAI.e20 - (NANKAI.e20 - NANKAI.e70) * (e - 0.2) / 0.5) / NANKAI.e20;
const EVAK = [0.2, 0.5, 0.7];

/* DIBI (Superset dasbor publik, ditarik 23 Okt 2026, riset A §4): baris per kab per kejadian */
const DIBI = baca(MENTAH + "dibi_baris.json"); DIBI["2025"] = baca(MENTAH + "dibi_2025.json");
const tglUTC = r => new Date(r.dt).toISOString().slice(0, 10);
function dibi(tahun, uji) { const b = DIBI[tahun].filter(uji), s = k => jumlah(b, r => r[k] || 0);
  return { baris: b.map(r => `${r.kabupaten} (${r.provinsi}) ${r.meninggal} meninggal`), meninggal: s("meninggal"), hilang: s("hilang"), mengungsi: s("mengungsi"), rb: s("rumah_rusak_berat"), rs: s("rumah_rusak_sedang"), rr: s("rumah_rusak_ringan"), kab: b }; }
const FACT = baca(P + "gempa/data/factsheet_gempa.json"), fakta = tgl => FACT.kasus.find(k => k.tanggal === tgl);
const RIW = baca(P + "gempa/data/riwayat_m5.json").baris, usgs = (awal, mMin) => { const r = RIW.find(b => b[0].startsWith(awal) && b[4] >= mMin); assert.ok(r, "katalog USGS: " + awal); return { lat: r[1], lon: r[2], dalam: r[3], m: r[4], waktu: r[0] }; };

/* ================================================================ skenario megathrust: bentuk() sama dengan sim.js */
const km2 = (la1, lo1, la2, lo2) => { const x = (lo2 - lo1) * RAD * 6371 * Math.cos((la1 + la2) / 2 * RAD), y = (la2 - la1) * RAD * 6371; return Math.hypot(x, y); };
const azimut = (a, b) => (Math.atan2((b[0] - a[0]) * Math.cos((a[1] + b[1]) / 2 * RAD), b[1] - a[1]) / RAD + 360) % 360;
const geser = (lat, lon, az, km) => [lat + km * Math.cos(az * RAD) / 111.19, lon + km * Math.sin(az * RAD) / (111.19 * Math.cos(lat * RAD))];
const panjang = g => g.slice(1).reduce((s, p, i) => s + km2(g[i][1], g[i][0], p[1], p[0]), 0);
const diGaris = (g, f) => { let sisa = panjang(g) * f;
  for (let i = 0; i < g.length - 1; i++) { const d = km2(g[i][1], g[i][0], g[i + 1][1], g[i + 1][0]);
    if (sisa <= d || i === g.length - 2) { const u = d ? Math.min(1, sisa / d) : 0; return { lat: g[i][1] + u * (g[i + 1][1] - g[i][1]), lon: g[i][0] + u * (g[i + 1][0] - g[i][0]), strike: azimut(g[i], g[i + 1]) }; }
    sisa -= d; } };
function bentuk(src) {
  const garis = SESAR.features[src.parit[0]].geometry.coordinates; let p = null;
  for (let f = 0; f <= 1; f += .01) { const q = diGaris(garis, f); if (!p || Math.abs(q.lon - src.parit[1]) < Math.abs(p.lon - src.parit[1])) p = q; }
  const r0 = T.rupture({ lat: p.lat, lon: p.lon, m: src.m, jenis: "subduksi", strike: p.strike });
  const sisi = [90, -90].map(d => { const q = geser(p.lat, p.lon, p.strike + d, 150); return [d, T.nilai(G, q[0], q[1]) ?? -9999]; }).sort((a, b) => b[1] - a[1])[0][0];
  const c = geser(p.lat, p.lon, p.strike + sisi, r0.Wh / 2), sk = { id: src.id, n: src.n, lat: c[0], lon: c[1], m: src.m, dalam: src.dalam, jenis: "subduksi", strike: p.strike, parit: [p.lat, p.lon] };
  sk.r = T.rupture(sk); return sk;
}
/* strike analog = azimut segmen palung subduksi terdekat di sesar.geojson (bukan dari ingatan) */
function strikePalung(lat, lon) { let b = null;
  SESAR.features.forEach(f => { if (f.properties.jenis !== "subduksi") return; const g = f.geometry.coordinates;
    for (let i = 0; i < g.length - 1; i++) { const k = Math.cos(lat * RAD), ax = (g[i][0] - lon) * k, ay = g[i][1] - lat, bx = (g[i + 1][0] - lon) * k, by = g[i + 1][1] - lat, dx = bx - ax, dy = by - ay;
      const t = dx || dy ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy))) : 0, d = Math.hypot(ax + t * dx, ay + t * dy) * 111.19;
      if (!b || d < b.km) b = { km: d, strike: azimut(g[i], g[i + 1]) }; } });
  return b; }

/* ================================================================ guncangan, kerusakan, luas per kab */
const kelasMmi = v => Math.min(12, Math.max(1, Math.round(v)));
function guncang(sk, jg) {
  const r = sk.r ?? T.rupture(sk), win = ctx.M.jendelaKm(sk.m, sk.dalam, jg) + Math.max(r.L, r.Wh) / 2, sebar = K.sebaran(ctx, sk, r, jg, win);
  const e7 = [0, 0, 0]; for (const c of sebar) { const pt = K.pita(c.pg, jg, sk.m); if (ctx.M.pgaKeMmi(pt[0]) >= 6.5) e7[0] += c.p; if (c.v >= 6.5) e7[1] += c.p; if (ctx.M.pgaKeMmi(pt[2]) >= 6.5) e7[2] += c.p; }
  return { r, win, sebar, e7 };
}
const okup = null; /* tanpa jam = okupansi rata-rata harian 0,85 (kerusakan.js), sama dengan layar */

function gempaKab(sk) {
  const jg = sk.dalam >= 50 ? "intraslab" : "antarmuka", g = guncang(sk, jg), per = new Map(), nas = K.taksir(g.sebar, jg, sk.m, okup);
  const kab = k => per.get(k) || per.set(k, { kec: [], mmi: new Array(13).fill(0), e7: [0, 0, 0], mmiMaks: 0, luas6: 0, luas7: 0, sekolah: 0, faskes: 0 }).get(k);
  for (const c of g.sebar) { const kode = kecKode(c.k); if (!kode) { assert.equal(c.p, 0, "kecamatan berpenduduk tanpa kab: " + c.k); continue; }
    const o = kab(kode), pt = K.pita(c.pg, jg, sk.m); o.kec.push(c); o.mmi[kelasMmi(c.v)] += c.p; o.mmiMaks = Math.max(o.mmiMaks, c.v);
    if (ctx.M.pgaKeMmi(pt[0]) >= 6.5) o.e7[0] += c.p; if (c.v >= 6.5) o.e7[1] += c.p; if (ctx.M.pgaKeMmi(pt[2]) >= 6.5) o.e7[2] += c.p; }
  for (const o of per.values()) o.k = K.taksir(o.kec, jg, sk.m, okup);
  /* luas MMI >= VI / VII: kisi 0,02 derajat, sel darat = pusat sel di dalam poligon kab */
  const w = MODEL.param.wells_coppersmith94, lw4 = Math.pow(10, w.a + w.b * sk.m) / 4, d = 0.02, dLa = g.win / 111.19, dLo = g.win / (111.19 * Math.cos(sk.lat * RAD));
  for (let la = sk.lat - dLa; la <= sk.lat + dLa; la += d) for (let lo = sk.lon - dLo; lo <= sk.lon + dLo; lo += d) {
    const v = ctx.M.pgaKeMmi(ctx.M.pga(sk.m, T.jarakRupture(g.r, la, lo) + lw4, sk.dalam, jg, ctx.vs30(la, lo))); if (v < 5.5) continue;
    const kode = kabPIP(la, lo); if (!kode) continue; const a = (d * 111.19) ** 2 * Math.cos(la * RAD), o = kab(kode); o.luas6 += a; if (v >= 6.5) o.luas7 += a; }
  /* sekolah (Dapodik/EMIS) dan faskes (OSM) di MMI >= VII: data hanya untuk provinsi yang tercakup */
  for (const [x, y, t] of FASIL) { if (Math.abs(x - sk.lat) > dLa || Math.abs(y - sk.lon) > dLo) continue;
    const v = ctx.M.pgaKeMmi(ctx.M.pga(sk.m, T.jarakRupture(g.r, x, y) + lw4, sk.dalam, jg, ctx.vs30(x, y))); if (v < 6.5) continue;
    const kode = kabTitik(x, y); if (kode) kab(kode)[t]++; }
  return { sk, jg, g, per, nas };
}
const SEK = baca(P + "data/sekolah.json"), FAS = baca(P + "data/fasilitas.json"), sc = SEK.kolom;
const FASIL = [...SEK.baris.filter(b => b[sc.indexOf("lat")] != null).map(b => [b[sc.indexOf("lat")], b[sc.indexOf("lon")], "sekolah"]), ...FAS.filter(f => f.t === "rs" || f.t === "faskes").map(f => [f.lat, f.lon, "faskes"])];
const PROV_SEK = new Set(SEK.baris.map(b => b[sc.indexOf("prov")])), PROV_FAS = new Set(FAS.filter(f => f.t !== "sekolah").map(f => f.prov));

/* ================================================================ tsunami: waktu tiba per kab + proksi paparan pesisir rendah (aturan sim.js) */
const AMAN = T.SISI_AMAN / T.KALIBRASI, SEL_KM = G.d * 111.19;
function tsunami(sk) {
  const wt = T.waktuTiba(G, sk.lat, sk.lon, sk.m, { dalam: sk.dalam, jenis: "subduksi", strike: sk.strike, maksMenit: 180, pusat: PUSAT }); assert.ok(wt, "tsunami tidak layak: " + sk.id);
  const per = new Map(), kab = k => per.get(k) || per.set(k, { tiba: Infinity, hlo: 0, hhi: 0, sel: 0, sel30: 0, sel30a: 0, p180: 0, p30: 0, tak: 0, kec30: 0 }).get(k);
  for (const p of wt.pantai) { if (!p.kab) continue; const kode = kodeKab(p.prov, p.kab); if (!kode) continue; const o = kab(kode);
    o.tiba = Math.min(o.tiba, p.menit); o.hlo = Math.max(o.hlo, p.tinggi_lo); o.hhi = Math.max(o.hhi, p.tinggi_hi); o.sel++; if (p.menit < 30) o.sel30++; if (p.menit * AMAN < 30) o.sel30a++; }
  const tibaDi = (la, lo) => { const j0 = Math.round((la - G.lat0) / G.d), i0 = Math.round((lo - G.lon0) / G.d); let t = Infinity;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const j = j0 + a, i = i0 + b; if (j >= 0 && i >= 0 && j < G.ny && i < G.nx) t = Math.min(t, wt.menit[j * G.nx + i]); } return t * AMAN; };
  for (const [k, [la, lo]] of Object.entries(PUSAT)) {
    if (Math.abs(la - sk.lat) > 12 || Math.abs(lo - sk.lon) > 14) continue; const z = T.nilai(G, la, lo); if (z == null || z > 10) continue;
    const tb = tibaDi(la, lo); if (tb > 180) continue; let b = null;
    for (const p of wt.pantai) { if (Math.abs(p.lat - la) > .15 || Math.abs(p.lon - lo) > .15) continue; if (!b || p.tinggi_hi > b.tinggi_hi) b = p; }
    if (!b || b.tinggi_hi < .5) continue; const kode = kecKode(k), jiwa = PEND[k] || 0; if (!kode) continue; const o = kab(kode);
    const tuju = T.tempatTinggi(G, la, lo, 20, 40), sempat = tuju ? tuju.km * 1.3 / 4 * 60 < tb : false;
    o.p180 += jiwa; if (tb <= 30) { o.p30 += jiwa; o.kec30++; } if (!sempat) o.tak += jiwa; }
  return { wt, per };
}

/* ================================================================ analog: rasio historis, paparan analog lewat mesin yang sama */
const D = {
  lombok5: dibi("2018", r => r.jenis_bencana === "Gempabumi" && tglUTC(r) === "2018-08-05"),
  mamuju: dibi("2021", r => r.jenis_bencana === "Gempabumi" && tglUTC(r) === "2021-01-15"),
  pasaman: dibi("2022", r => r.jenis_bencana === "Gempabumi" && tglUTC(r) === "2022-02-25"),
  cianjur: dibi("2022", r => r.jenis_bencana === "Gempabumi" && tglUTC(r) === "2022-11-21"),
  mentawai: dibi("2010", r => r.jenis_bencana === "Tsunami" && r.kabupaten === "Kepulauan Mentawai"),
  merapi: dibi("2010", r => r.jenis_bencana === "Erupsi Gunung Api" && tglUTC(r) === "2010-10-26"),
  semeru: dibi("2021", r => r.jenis_bencana === "Erupsi Gunung Api" && tglUTC(r) === "2021-12-04"),
  lombokSeri: dibi("2018", r => r.jenis_bencana === "Gempabumi" && r.provinsi === "Nusa Tenggara Barat" && tglUTC(r) >= "2018-07-28" && tglUTC(r) <= "2018-08-31"),
  sulteng: dibi("2018", r => r.jenis_bencana === "Gempa Bumi dan Tsunami"),
};
assert.match(FACT.catatan, /jumlah 665/, "factsheet: rincian Pangandaran 665 hilang dari catatan");
const evKal = id => [...KAL.kejadian, KAL.di_luar_sampel].find(e => e.id === id);
const ANALOG_GEMPA = [
  { id: "yogya-2006", ev: evKal("yogya-2006"), meninggal: fakta("2006-05-27").meninggal, sumber: "factsheet_gempa.json (USGS usp000ej1c, dicocokkan 19 Okt 2026)", label: "terverifikasi", versi_lain: "±5.700 (Bappenas, riset A §4.4); 5.716/5.737 (sekunder)" },
  { id: "lombok-5agt-2018", ev: evKal("lombok-5agt"), meninggal: D.lombok5.meninggal, sumber: "DIBI baris 5 Agu 2018 (riset/mentah/dibi_baris.json)", label: "resmi", versi_lain: `563 (USGS, factsheet); 560 (BNPB, kalibrasi_kerusakan.json); seri Jul-Agu DIBI 564` },
  { id: "mamuju-majene-2021", ev: evKal("mamuju-2021"), meninggal: D.mamuju.meninggal, sumber: "DIBI baris 15 Jan 2021", label: "resmi", versi_lain: "105 (Basarnas via Antara, factsheet); 107 (USGS)" },
  { id: "pasaman-2022", ev: evKal("pasaman-2022"), meninggal: D.pasaman.meninggal, sumber: "DIBI baris 25 Feb 2022", label: "resmi", versi_lain: "25 (kalibrasi_kerusakan.json, dari ingatan)" },
  { id: "cianjur-2022", ev: evKal("cianjur-2022"), meninggal: D.cianjur.meninggal, sumber: "DIBI baris 21 Nov 2022", label: "resmi", versi_lain: "600 (kalibrasi); RENSTRA 602" },
  { id: "padang-2009", ev: evKal("padang-2009"), meninggal: fakta("2009-09-30").meninggal, sumber: "factsheet_gempa.json (USGS usp000h237)", label: "terverifikasi", versi_lain: "1.115 (kalibrasi_kerusakan.json)" },
];
for (const a of ANALOG_GEMPA) { const g = guncang(a.ev, a.ev.jg || "kerak"); a.e7 = g.e7; a.rasio = a.meninggal / g.e7[1]; }
const RG = ANALOG_GEMPA.map(a => a.rasio), RASIO_GEMPA = [Math.min(...RG), median(RG), Math.max(...RG)];

const ANALOG_TS = [
  { id: "mentawai-2010", q: usgs("2010-10-25", 7.5), meninggal: D.mentawai.meninggal, hilang: D.mentawai.hilang, sumber: "DIBI 2010 Tsunami Kepulauan Mentawai; parameter gempa: katalog USGS riwayat_m5.json", label: "resmi", versi_lain: "445 (USGS, factsheet)" },
  { id: "pangandaran-2006", q: usgs("2006-07-17", 7.5), meninggal: 665, hilang: null, sumber: "factsheet_gempa.json catatan: rincian USGS per kabupaten dijumlah 665 (usp000ensm); parameter: riwayat_m5.json", label: "terverifikasi", versi_lain: "668 (angka lama, tidak ditemukan sumbernya)" },
];
for (const a of ANALOG_TS) { const s = strikePalung(a.q.lat, a.q.lon); a.strike = s.strike; const t = tsunami({ id: a.id, ...a.q, strike: s.strike });
  a.p30 = jumlah([...t.per.values()], o => o.p30); a.rasio = a.meninggal / a.p30; }
const RT = ANALOG_TS.map(a => a.rasio), RASIO_TS = [Math.min(...RT), Math.sqrt(RT[0] * RT[1]), Math.max(...RT)];

/* gunung api: rasio per jiwa KRB III (paparan.json 2026) */
const PAP = baca(P + "gunungapi/data/paparan.json"), GUNG = new Map(PAP.gunung.map(g => [g.id, g]));
const ANALOG_GA = [
  { id: "merapi-2010", gunung: "merapi", d: D.merapi, sumber: "DIBI 26 Okt 2010 (Sleman, Magelang, Klaten, Boyolali)", label: "resmi", versi_lain: "347 / 354 (sekunder, riset A); 367 (catatan cek_merapi2010.mjs)" },
  { id: "semeru-2021", gunung: "semeru", d: D.semeru, sumber: "DIBI 4 Des 2021 Lumajang", label: "resmi", versi_lain: "64 meninggal + 9 hilang" },
];
for (const a of ANALOG_GA) { const k3 = GUNG.get(a.gunung).zona.III.penduduk;
  a.krb3 = k3; a.r = { korban: a.d.meninggal / k3, rb: a.d.rb / k3, rs: a.d.rs / k3, rr: a.d.rr / k3, ungsi: a.d.mengungsi / k3 }; }
const rgGA = k => { const v = ANALOG_GA.map(a => a.r[k]); return [Math.min(...v), Math.max(...v)]; };

/* ================================================================ jalankan tiga skenario megathrust */
const SKEN = DIKENAL.map(src => { const sk = bentuk(src), g = gempaKab(sk), t = tsunami(sk); return { src, sk, g, t }; });
/* kepekaan kepatuhan bangunan: porsi stok tembok tanpa tulangan dipindah ke beton/tembok terkekang (KELAS kerusakan.js) */
const VARIAN_BANGUNAN = [["dasar (40/30/30)", [0.40, 0.30, 0.30]], ["kepatuhan naik (20/50/30)", [0.20, 0.50, 0.30]], ["kepatuhan penuh (0/70/30)", [0.00, 0.70, 0.30]]];
const asli = K.KELAS.map(k => k.bagian);
for (const s of SKEN) s.bangunan = VARIAN_BANGUNAN.map(([n, b]) => { K.KELAS.forEach((k, i) => k.bagian = b[i]); const q = K.taksir(s.g.g.sebar, s.g.jg, s.sk.m, okup); return { n, b, jiwa: q.jiwa[1], rb: q.rb[1], rs: q.rs[1] }; });
K.KELAS.forEach((k, i) => k.bagian = asli[i]);

/* ================================================================ Merapi setara 2010 (cek_merapi2010.mjs) */
const muat = f => { const m = { exports: {} }; new Function("module", "self", fs.readFileSync(P + "gunungapi/" + f, "utf8"))(m, undefined); return m.exports; };
const L = muat("sim_lahar.js"), TG = muat("sim_tanggap.js");
async function ubin(z, x, y) { const f = `${TERRA}${z}/${x}/${y}.png`;
  if (!fs.existsSync(f)) { const r = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`); assert.ok(r.ok, "ubin terrarium " + r.status);
    fs.mkdirSync(`${TERRA}${z}/${x}`, { recursive: true }); fs.writeFileSync(f, Buffer.from(await r.arrayBuffer())); }
  return (await sharp(fs.readFileSync(f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data; }
const MER = { lat: -7.542, lon: 110.442, Z: 12, JU: 5 };
async function merapi() {
  const { lat, lon, Z, JU } = MER, n = JU * 256, [gx, gy] = L.llKePx(Z, lon, lat), tx0 = Math.floor(gx / 256) - 2, ty0 = Math.floor(gy / 256) - 2, rgba = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) { rgba[i * 4] = 128; rgba[i * 4 + 3] = 255; }
  for (let j = 0; j < JU; j++) for (let i = 0; i < JU; i++) { const data = await ubin(Z, tx0 + i, ty0 + j);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const o = ((j * 256 + y) * n + i * 256 + x) * 4, q = (y * 256 + x) * 4; rgba[o] = data[q]; rgba[o + 1] = data[q + 1]; rgba[o + 2] = data[q + 2]; } }
  const dem = L.elevasi(rgba, n * n), pop = baca(P + "gunungapi/data/pop/merapi.json"), pusat = [gx - tx0 * 256, gy - ty0 * 256];
  const ll = (x, y) => L.pxKeLL(Z, tx0 * 256 + x + .5, ty0 * 256 + y + .5), hasil = {};
  for (const hl of [0.15, 0.18]) {
    const r = L.simulasi({ dem, n, m: n, z: Z, lat, pusat, V: 1e7, hl }), u = TG.paparanUnit(pop, r, ll, n, (r.dx / 1000) ** 2, 1);
    const per = new Map(), kab = k => per.get(k) || per.set(k, { jiwa: 0, luas: 0, luasPdc: 0, r20: 0, sekolah: 0, faskes: 0 }).get(k);
    for (const x of u) if (x.frak > 0) kab(kabTitik(x.lat, x.lon)).jiwa += x.jiwa * x.frak;
    const sel = new Set([...r.pdc.idx, ...r.lahar.idx]), pdc = new Set(r.pdc.idx), ha = r.dx ** 2 / 1e4;
    for (const v of sel) { const [lo, la] = ll(v % n, (v / n) | 0), k = kabPIP(la, lo); if (!k) continue; kab(k).luas += ha; if (pdc.has(v)) kab(k).luasPdc += ha; }
    for (const [la, lo, j] of pop.piksel) if (hav(lat, lon, la, lo) <= 20) kab(kabTitik(la, lo)).r20 += j;
    const g = GUNG.get("merapi"); for (const t of ["sekolah", "faskes"]) for (const f of g[t]) { const [fx, fy] = L.llKePx(Z, f.lon, f.lat), x = Math.floor(fx - tx0 * 256), y = Math.floor(fy - ty0 * 256); if (sel.has(y * n + x)) kab(kabTitik(f.lat, f.lon))[t]++; }
    hasil[hl] = { r: r.ringkas, per, terpapar: jumlah(u, x => x.jiwa * x.frak), luas_ha: sel.size * ha };
  }
  return hasil;
}
const MERAPI = await merapi();

/* ================================================================ KRB PVMBG per kab, 30 gunung: aturan scripts/gunungapi/paparan.py (pilih_krb, R_CARI 20 km, pusat piksel di zona)
   di atas berkas mentah yang sama (poligon KRB utuh + piksel WorldPop tak dibulatkan), jadi jumlah per gunung = paparan.json. paparan_geo.json diperhalus: tidak dipakai. */
const KRB_RAW = AKAR + "data/raw/gunungapi/krb.geojson", PIX_RAW = AKAR + "data/raw/gunungapi/pop_piksel.json";
assert.ok(fs.existsSync(KRB_RAW) && fs.existsSync(PIX_RAW), "butuh data/raw/gunungapi/{krb.geojson,pop_piksel.json} (diunduh python3 scripts/gunungapi/paparan.py)");
const FKRB = baca(KRB_RAW).features, PIX = baca(PIX_RAW), STATUS = new Map(baca(P + "banjir/data/gunungapi_status.json").gunung.map(g => [g.nama, g]));
const polys = gm => (gm.type === "Polygon" ? [gm.coordinates] : gm.coordinates).map(p => { const xs = p[0].map(c => c[0]), ys = p[0].map(c => c[1]); return { b: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], p }; });
const dalamQ = (q, lo, la) => lo >= q.b[0] && lo <= q.b[2] && la >= q.b[1] && la <= q.b[3] && dalamCincin(q.p, lo, la);
const ZONA = ["III", "II", "I"], LCODE = { "0703": "III", "0702": "II", "0701": "I", "0603": "III", "0602": "II", "0601": "I" };
const ALIAS_KRB = { ililewotolok: ["lewotolo"], lewotobilakilaki: ["lewotobilakilaki", "lewotobilakilakidanperempuan"] }, kunciNama = n => n.toLowerCase().replace(/[^a-z]/g, "");
function pilihKrb(g) { /* = paparan.py pilih_krb: nama (<= 30 km dari puncak), lalu poligon yang memuat puncak; ada poligon 07xx -> abaikan lingkaran 06xx */
  const ok = new Set(ALIAS_KRB[kunciNama(g.nama)] || [kunciNama(g.nama)]);
  let t = FKRB.filter(f => ok.has(kunciNama(f.properties.namobj)) && LCODE[f.properties.lcode] && polys(f.geometry).some(q => q.p[0].filter((_, i) => i % 3 === 0).some(c => hav(g.lat, g.lon, c[1], c[0]) <= 30)));
  if (!t.length) t = FKRB.filter(f => LCODE[f.properties.lcode] && polys(f.geometry).some(q => dalamQ(q, g.lon, g.lat)));
  if (t.some(f => f.properties.lcode.startsWith("07"))) t = t.filter(f => f.properties.lcode.startsWith("07"));
  const zon = {}; for (const f of t) (zon[LCODE[f.properties.lcode]] ||= []).push(...polys(f.geometry)); return zon; }
const KRB = PAP.gunung.map(g => {
  const puncak = STATUS.get(g.nama); assert.ok(puncak, "puncak tak dikenal: " + g.nama);
  const zon = pilihKrb({ nama: g.nama, lat: puncak.lat, lon: puncak.lon }), zonaTitik = (lo, la) => ZONA.find(z => (zon[z] || []).some(q => dalamQ(q, lo, la))) || null;
  const per = new Map(), kab = k => per.get(k) || per.set(k, { III: 0, II: 0, I: 0, lIII: 0, lII: 0, lI: 0, sIII: 0, sII: 0, fIII: 0, fII: 0 }).get(k);
  for (const [la, lo, j] of PIX[g.id] || []) { if (hav(puncak.lat, puncak.lon, la, lo) > 20) continue; const z = zonaTitik(lo, la); if (z) kab(kabTitik(la, lo))[z] += j; }
  const semua = Object.values(zon).flat();
  if (semua.length) { const b = [Math.min(...semua.map(q => q.b[0])), Math.min(...semua.map(q => q.b[1])), Math.max(...semua.map(q => q.b[2])), Math.max(...semua.map(q => q.b[3]))], s = 0.0045;
    for (let la = b[1] + s / 2; la < b[3]; la += s) for (let lo = b[0] + s / 2; lo < b[2]; lo += s) { const z = zonaTitik(lo, la); if (!z) continue; const k = kabPIP(la, lo); if (k) kab(k)["l" + z] += (s * 111.19) ** 2 * Math.cos(la * RAD) * 100; } }
  for (const [t, c] of [["sekolah", "s"], ["faskes", "f"]]) for (const f of g[t]) if (f.zona === "III" || f.zona === "II") kab(kabTitik(f.lat, f.lon))[c + f.zona]++;
  const selisih = Object.fromEntries(ZONA.map(z => [z, jumlah([...per.values()], o => o[z]) - g.zona[z].penduduk]));
  return { g, per, selisih };
});

/* ================================================================ tulis keluaran */
fs.mkdirSync(OUT, { recursive: true });
const SEMUA_ANGKA = [];
function csv(nama, kolom, baris) {
  const esc = v => { if (v == null) return ""; if (typeof v === "number") { assert.ok(Number.isFinite(v), `${nama}: angka tak hingga/NaN`); SEMUA_ANGKA.push(v); return String(v); } const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  fs.writeFileSync(OUT + nama, [kolom.join(","), ...baris.map(b => kolom.map(k => esc(b[k])).join(","))].join("\n") + "\n"); return baris.length; }
const json = (nama, o) => fs.writeFileSync(OUT + nama, JSON.stringify(o, (k, v) => { if (typeof v === "number") assert.ok(Number.isFinite(v), `${nama}.${k}: NaN`); return v; }, 1) + "\n");
const dasarKab = k => ({ kode: k.kode, prov: k.prov, provinsi: PROVNAMA[k.prov], pulau: PULAU(k.prov), kab: k.nama });
const PEND_KAB = new Map(); for (const [k, v] of Object.entries(PEND)) { const c = kecKode(k); assert.ok(c || !v, "penduduk tanpa kab: " + k); if (c) PEND_KAB.set(c, (PEND_KAB.get(c) || 0) + v); }
const tri = (a, f = 0) => a.map(v => bulat(v, f));

/* --- gempa_kab.csv */
const KG = ["kode", "prov", "provinsi", "pulau", "kab", "skenario", "penduduk_kab", "mmi_maks", "jiwa_mmi_2_3", "jiwa_mmi_4", "jiwa_mmi_5", "jiwa_mmi_6", "jiwa_mmi_7", "jiwa_mmi_8", "jiwa_mmi_9plus",
  "jiwa_mmi7plus_rendah", "jiwa_mmi7plus_tengah", "jiwa_mmi7plus_tinggi", "luas_mmi6plus_km2", "luas_mmi7plus_km2", "rumah_dalam_jendela",
  "rb_rendah", "rb_tengah", "rb_tinggi", "rs_rendah", "rs_tengah", "rs_tinggi", "rr_rendah", "rr_tengah", "rr_tinggi",
  "korban_mesin_rendah", "korban_mesin_tengah", "korban_mesin_tinggi", "korban_analog_rendah", "korban_analog_tengah", "korban_analog_tinggi",
  "pengungsi", "hari_mengungsi_7", "hari_mengungsi_30", "hari_mengungsi_90", "kerugian_stimulan_rp_juta_rendah", "kerugian_stimulan_rp_juta_tengah", "kerugian_stimulan_rp_juta_tinggi",
  "yll_rendah", "yll_tengah", "yll_tinggi", "sekolah_mmi7plus", "faskes_mmi7plus"];
const barisG = [];
const analogKorban = e7 => [e7[0] * RASIO_GEMPA[0], e7[1] * RASIO_GEMPA[1], e7[2] * RASIO_GEMPA[2]];
for (const s of SKEN) for (const k of KAB) {
  const o = s.g.per.get(k.kode), z = [0, 0, 0], q = o ? o.k : { rb: z, rs: z, rr: z, jiwa: z, rumah: 0 }, m = o ? o.mmi : new Array(13).fill(0), e7 = o ? o.e7 : z, ka = analogKorban(e7), ungsi = (q.rb[1] + q.rs[1]) * JIWA_PER_RUMAH;
  barisG.push({ ...dasarKab(k), skenario: s.src.id, penduduk_kab: Math.round(PEND_KAB.get(k.kode) || 0), mmi_maks: o ? bulat(o.mmiMaks, 1) : null,
    jiwa_mmi_2_3: Math.round(m[2] + m[3]), jiwa_mmi_4: Math.round(m[4]), jiwa_mmi_5: Math.round(m[5]), jiwa_mmi_6: Math.round(m[6]), jiwa_mmi_7: Math.round(m[7]), jiwa_mmi_8: Math.round(m[8]), jiwa_mmi_9plus: Math.round(jumlah(m.slice(9))),
    jiwa_mmi7plus_rendah: Math.round(e7[0]), jiwa_mmi7plus_tengah: Math.round(e7[1]), jiwa_mmi7plus_tinggi: Math.round(e7[2]), luas_mmi6plus_km2: bulat(o?.luas6 || 0), luas_mmi7plus_km2: bulat(o?.luas7 || 0),
    rumah_dalam_jendela: Math.round(q.rumah), rb_rendah: Math.round(q.rb[0]), rb_tengah: Math.round(q.rb[1]), rb_tinggi: Math.round(q.rb[2]), rs_rendah: Math.round(Math.min(...q.rs)), rs_tengah: Math.round(q.rs[1]), rs_tinggi: Math.round(Math.max(...q.rs)),
    rr_rendah: Math.round(Math.min(...q.rr)), rr_tengah: Math.round(q.rr[1]), rr_tinggi: Math.round(Math.max(...q.rr)), korban_mesin_rendah: bulat(q.jiwa[0], 1), korban_mesin_tengah: bulat(q.jiwa[1], 1), korban_mesin_tinggi: bulat(q.jiwa[2], 1),
    korban_analog_rendah: bulat(ka[0], 1), korban_analog_tengah: bulat(ka[1], 1), korban_analog_tinggi: bulat(ka[2], 1), pengungsi: Math.round(ungsi),
    hari_mengungsi_7: Math.round(ungsi * 7), hari_mengungsi_30: Math.round(ungsi * 30), hari_mengungsi_90: Math.round(ungsi * 90),
    kerugian_stimulan_rp_juta_rendah: Math.round(rupiah(q.rb[0], Math.min(...q.rs), Math.min(...q.rr))), kerugian_stimulan_rp_juta_tengah: Math.round(rupiah(q.rb[1], q.rs[1], q.rr[1])), kerugian_stimulan_rp_juta_tinggi: Math.round(rupiah(q.rb[2], Math.max(...q.rs), Math.max(...q.rr))),
    yll_rendah: Math.round(ka[0] * SISA_HIDUP[0]), yll_tengah: Math.round(ka[1] * SISA_HIDUP[1]), yll_tinggi: Math.round(ka[2] * SISA_HIDUP[2]),
    sekolah_mmi7plus: PROV_SEK.has(k.prov) ? (o?.sekolah || 0) : null, faskes_mmi7plus: PROV_FAS.has(k.prov) ? (o?.faskes || 0) : null });
}
csv("gempa_kab.csv", KG, barisG);

/* --- tsunami_kab.csv */
const KT = ["kode", "prov", "provinsi", "pulau", "kab", "skenario", "tercapai_180_menit", "tiba_menit", "tiba_menit_sisi_aman", "tinggi_indikatif_lo_m", "tinggi_indikatif_hi_m", "sel_pantai", "panjang_pantai_km",
  "panjang_pantai_lt30_km", "panjang_pantai_lt30_sisi_aman_km", "jiwa_pesisir_rendah_180", "jiwa_pesisir_rendah_lt30", "jiwa_tak_sempat_jalan_kaki",
  "korban_e20_rendah", "korban_e20_tengah", "korban_e20_tinggi", "korban_e50_rendah", "korban_e50_tengah", "korban_e50_tinggi", "korban_e70_rendah", "korban_e70_tengah", "korban_e70_tinggi", "yll_e20_tengah"];
const barisT = [];
for (const s of SKEN) for (const k of KAB) {
  const o = s.t.per.get(k.kode), ada = !!o && o.sel > 0, b = { ...dasarKab(k), skenario: s.src.id, tercapai_180_menit: ada ? 1 : 0 };
  Object.assign(b, { tiba_menit: ada ? bulat(o.tiba, 1) : null, tiba_menit_sisi_aman: ada ? bulat(o.tiba * AMAN, 1) : null, tinggi_indikatif_lo_m: ada ? o.hlo : null, tinggi_indikatif_hi_m: ada ? o.hhi : null,
    sel_pantai: o?.sel || 0, panjang_pantai_km: bulat((o?.sel || 0) * SEL_KM), panjang_pantai_lt30_km: bulat((o?.sel30 || 0) * SEL_KM), panjang_pantai_lt30_sisi_aman_km: bulat((o?.sel30a || 0) * SEL_KM),
    jiwa_pesisir_rendah_180: Math.round(o?.p180 || 0), jiwa_pesisir_rendah_lt30: Math.round(o?.p30 || 0), jiwa_tak_sempat_jalan_kaki: Math.round(o?.tak || 0) });
  for (const e of EVAK) RASIO_TS.forEach((r, i) => b[`korban_e${Math.round(e * 100)}_${["rendah", "tengah", "tinggi"][i]}`] = bulat((o?.p30 || 0) * r * fEvak(e), 1));
  b.yll_e20_tengah = Math.round((o?.p30 || 0) * RASIO_TS[1] * SISA_HIDUP[1]);
  barisT.push(b);
}
csv("tsunami_kab.csv", KT, barisT);

/* --- merapi2010_kab.csv */
const M15 = MERAPI[0.15], M18 = MERAPI[0.18], dibiMer = new Map();
for (const r of D.merapi.kab) { const pk = Object.keys(PROVNAMA).find(p => PROVNAMA[p].replace(/^DI /, "Daerah Istimewa ") === r.provinsi || PROVNAMA[p] === r.provinsi); const c = kodeKab(pk, r.kabupaten); assert.ok(c, "DIBI Merapi: " + r.kabupaten); dibiMer.set(c, r); }
const KMER = ["kode", "prov", "provinsi", "pulau", "kab", "jiwa_sapuan_tanpa_evakuasi", "jiwa_sapuan_hl018", "luas_sapuan_ha", "luas_awan_panas_ha", "rumah_di_sapuan_batas_atas", "sekolah_di_sapuan", "faskes_di_sapuan",
  "pengungsi_radius20km", "korban_analog_rendah", "korban_analog_tinggi", "rb_analog", "rs_analog", "rr_analog", "kerugian_stimulan_rp_juta", "hari_mengungsi_7", "hari_mengungsi_30", "hari_mengungsi_90", "yll_rendah", "yll_tinggi",
  "dibi2010_meninggal", "dibi2010_mengungsi", "dibi2010_rb", "dibi2010_rs", "dibi2010_rr"];
const KORBAN_MER = [347, D.merapi.meninggal]; /* rentang versi sumber kejadian 2010: 347 (sekunder) s.d. DIBI 386 */
const barisM = [];
for (const [kode, o] of M15.per) { if (!kode) continue; const k = KABK.get(kode), sh = o.jiwa / M15.terpapar, d = dibiMer.get(kode), o18 = M18.per.get(kode);
  const rb = D.merapi.rb * sh, rs = D.merapi.rs * sh, rr = D.merapi.rr * sh;
  barisM.push({ ...dasarKab(k), jiwa_sapuan_tanpa_evakuasi: Math.round(o.jiwa), jiwa_sapuan_hl018: Math.round(o18?.jiwa || 0), luas_sapuan_ha: bulat(o.luas), luas_awan_panas_ha: bulat(o.luasPdc), rumah_di_sapuan_batas_atas: Math.round(o.jiwa / JIWA_PER_RUMAH),
    sekolah_di_sapuan: o.sekolah, faskes_di_sapuan: o.faskes, pengungsi_radius20km: Math.round(o.r20), korban_analog_rendah: bulat(KORBAN_MER[0] * sh, 1), korban_analog_tinggi: bulat(KORBAN_MER[1] * sh, 1),
    rb_analog: bulat(rb, 1), rs_analog: bulat(rs, 1), rr_analog: bulat(rr, 1), kerugian_stimulan_rp_juta: Math.round(rupiah(rb, rs, rr)),
    hari_mengungsi_7: Math.round(o.r20 * 7), hari_mengungsi_30: Math.round(o.r20 * 30), hari_mengungsi_90: Math.round(o.r20 * 90), yll_rendah: Math.round(KORBAN_MER[0] * sh * SISA_HIDUP[0]), yll_tinggi: Math.round(KORBAN_MER[1] * sh * SISA_HIDUP[2]),
    dibi2010_meninggal: d?.meninggal ?? null, dibi2010_mengungsi: d?.mengungsi ?? null, dibi2010_rb: d?.rumah_rusak_berat ?? null, dibi2010_rs: d?.rumah_rusak_sedang ?? null, dibi2010_rr: d?.rumah_rusak_ringan ?? null }); }
barisM.sort((a, b) => b.jiwa_sapuan_tanpa_evakuasi - a.jiwa_sapuan_tanpa_evakuasi || b.pengungsi_radius20km - a.pengungsi_radius20km);
csv("merapi2010_kab.csv", KMER, barisM);

/* --- gunungapi_krb_kab.csv */
const KK = ["gunung_id", "gunung", "zona_sumber", "kode", "prov", "provinsi", "pulau", "kab", "jiwa_krb3", "jiwa_krb2", "jiwa_krb1", "luas_krb3_ha", "luas_krb2_ha", "luas_krb1_ha", "sekolah_krb3", "sekolah_krb2", "faskes_krb3", "faskes_krb2",
  "rumah_krb3", "korban_analog_rendah", "korban_analog_tinggi", "rb_analog_rendah", "rb_analog_tinggi", "pengungsi_analog_rendah", "pengungsi_analog_tinggi", "kerugian_stimulan_rp_juta_rendah", "kerugian_stimulan_rp_juta_tinggi",
  "hari_mengungsi_30_rendah", "hari_mengungsi_30_tinggi", "yll_rendah", "yll_tinggi"];
const barisK = [], rK = rgGA("korban"), rRB = rgGA("rb"), rRS = rgGA("rs"), rRR = rgGA("rr"), rU = rgGA("ungsi");
for (const { g, per } of KRB) for (const [kode, o] of per) {
  if (!kode || !(o.III + o.II + o.I + o.lIII + o.lII + o.lI + o.sIII + o.sII + o.fIII + o.fII > 0)) continue; const k = KABK.get(kode), j3 = o.III;
  barisK.push({ gunung_id: g.id, gunung: g.nama, zona_sumber: g.zona_sumber, ...dasarKab(k), jiwa_krb3: Math.round(o.III), jiwa_krb2: Math.round(o.II), jiwa_krb1: Math.round(o.I),
    luas_krb3_ha: bulat(o.lIII), luas_krb2_ha: bulat(o.lII), luas_krb1_ha: bulat(o.lI), sekolah_krb3: o.sIII, sekolah_krb2: o.sII, faskes_krb3: o.fIII, faskes_krb2: o.fII, rumah_krb3: Math.round(j3 / JIWA_PER_RUMAH),
    korban_analog_rendah: bulat(j3 * rK[0], 1), korban_analog_tinggi: bulat(j3 * rK[1], 1), rb_analog_rendah: bulat(j3 * rRB[0], 1), rb_analog_tinggi: bulat(j3 * rRB[1], 1),
    pengungsi_analog_rendah: Math.round(j3 * rU[0]), pengungsi_analog_tinggi: Math.round(j3 * rU[1]),
    kerugian_stimulan_rp_juta_rendah: Math.round(rupiah(j3 * rRB[0], j3 * rRS[0], j3 * rRR[0])), kerugian_stimulan_rp_juta_tinggi: Math.round(rupiah(j3 * rRB[1], j3 * rRS[1], j3 * rRR[1])),
    hari_mengungsi_30_rendah: Math.round(j3 * rU[0] * 30), hari_mengungsi_30_tinggi: Math.round(j3 * rU[1] * 30), yll_rendah: Math.round(j3 * rK[0] * SISA_HIDUP[0]), yll_tinggi: Math.round(j3 * rK[1] * SISA_HIDUP[2]) });
}
csv("gunungapi_krb_kab.csv", KK, barisK);

/* --- analog.csv */
const KA = ["kelompok", "id", "kejadian", "meninggal", "hilang", "sumber", "label", "versi_lain", "paparan_model", "arti_paparan", "rasio_meninggal_per_terpapar", "dipakai_untuk"];
const barisA = [
  ...ANALOG_GEMPA.map(a => ({ kelompok: "guncangan gempa", id: a.id, kejadian: `${a.ev.nama} M${a.ev.m}`, meninggal: a.meninggal, hilang: null, sumber: a.sumber, label: a.label, versi_lain: a.versi_lain,
    paparan_model: Math.round(a.e7[1]), arti_paparan: "jiwa di kecamatan MMI >= VII (mesin guncangan.js, WorldPop 2026, geometri kalibrasi_kerusakan.json)", rasio_meninggal_per_terpapar: bulat(a.rasio, 6), dipakai_untuk: "korban_analog gempa_kab.csv" })),
  ...ANALOG_TS.map(a => ({ kelompok: "tsunami", id: a.id, kejadian: `${a.id} M${a.q.m} (${a.q.waktu} UTC, strike palung ${bulat(a.strike, 1)})`, meninggal: a.meninggal, hilang: a.hilang, sumber: a.sumber, label: a.label, versi_lain: a.versi_lain,
    paparan_model: Math.round(a.p30), arti_paparan: "jiwa kecamatan pesisir rendah (pusat <= 10 m ETOPO, tinggi indikatif atas >= 0,5 m) dengan tiba sisi aman <= 30 menit (mesin tsunami.js)", rasio_meninggal_per_terpapar: bulat(a.rasio, 6), dipakai_untuk: "korban tsunami_kab.csv (evakuasi segera 20%)" })),
  ...ANALOG_GA.map(a => ({ kelompok: "gunung api", id: a.id, kejadian: a.id, meninggal: a.d.meninggal, hilang: a.d.hilang, sumber: a.sumber, label: a.label, versi_lain: a.versi_lain,
    paparan_model: a.krb3, arti_paparan: "jiwa KRB III PVMBG 2018 (paparan.json, WorldPop 2026)", rasio_meninggal_per_terpapar: bulat(a.r.korban, 6), dipakai_untuk: `korban/rumah/pengungsi gunungapi_krb_kab.csv (RB ${a.d.rb}, RS ${a.d.rs}, RR ${a.d.rr}, mengungsi ${a.d.mengungsi})` })),
];
csv("analog.csv", KA, barisA);

/* --- pembanding_pdna.csv: stimulan batas bawah dari rumah rusak DIBI vs angka kerugian kejadian nyata */
const PDNA = [
  { kejadian: "Gempa Cianjur 21 Nov 2022", d: D.cianjur, angka_rp_juta: 4e6, angka_teks: "kerugian ±Rp4 triliun (perkiraan kasar Bupati)", sumber_angka: "https://www.medcom.id/nasional/daerah/0k8a5y9K-bupati-cianjur-sebut-kerugian-akibat-gempa-rp4-triliun (riset C §3.3)", label_angka: "terverifikasi (sekunder: media)" },
  { kejadian: "Gempa Lombok Jul-Agu 2018", d: D.lombokSeri, angka_rp_juta: 12.1e6, angka_teks: "kerusakan Rp10,1 T + kerugian Rp2 T (BNPB ke DPR 10 Sep 2018)", sumber_angka: "https://en.tempo.co/amp/921532/lombok-needs-rp8-6tn-for-rehabilitation-bnpb (riset C §3.3)", label_angka: "terverifikasi (sekunder: media)" },
  { kejadian: "Gempa, tsunami, likuefaksi Sulteng 28 Sep 2018", d: D.sulteng, angka_rp_juta: 13.82e6, angka_teks: "kerugian & kerusakan Rp13,82 T (data sementara Okt 2018)", sumber_angka: "https://bnpb.go.id/berita/loss-and-damage-of-disaster-in-central-sulawesi-reach-1382-trillion-rupiah (riset C §3.3)", label_angka: "resmi (angka sementara)" },
  { kejadian: "Erupsi Merapi Okt-Nov 2010", d: D.merapi, angka_rp_juta: null, angka_teks: "PDNA/R3P tidak ditemukan di riset", sumber_angka: null, label_angka: null },
];
const KP = ["kejadian", "meninggal_dibi", "rb_dibi", "rs_dibi", "rr_dibi", "stimulan_60_30_15_rp_juta", "stimulan_skema_lama_50_25_10_rp_juta", "angka_kerugian_rp_juta", "angka_teks", "sumber_angka", "label_angka", "rasio_angka_per_stimulan", "pengungsi_dibi", "pengungsi_dari_rumah_rb_rs_x3_9"];
csv("pembanding_pdna.csv", KP, PDNA.map(x => { const st = rupiah(x.d.rb, x.d.rs, x.d.rr); return { kejadian: x.kejadian, meninggal_dibi: x.d.meninggal, rb_dibi: x.d.rb, rs_dibi: x.d.rs, rr_dibi: x.d.rr, stimulan_60_30_15_rp_juta: Math.round(st),
  stimulan_skema_lama_50_25_10_rp_juta: Math.round(rupiah(x.d.rb, x.d.rs, x.d.rr, STIM_LAMA)), angka_kerugian_rp_juta: x.angka_rp_juta, angka_teks: x.angka_teks, sumber_angka: x.sumber_angka, label_angka: x.label_angka,
  rasio_angka_per_stimulan: x.angka_rp_juta ? bulat(x.angka_rp_juta / st, 2) : null, pengungsi_dibi: x.d.mengungsi, pengungsi_dari_rumah_rb_rs_x3_9: Math.round((x.d.rb + x.d.rs) * JIWA_PER_RUMAH) }; }));

/* --- ringkasan nasional per skenario (tabel kerusakan pola Nankai) */
const nas = (s, f) => jumlah(barisG.filter(b => b.skenario === s.src.id), f), nasT = (s, f) => jumlah(barisT.filter(b => b.skenario === s.src.id), f);
const KR = ["skenario", "butir", "rendah", "tengah", "tinggi", "satuan", "label", "catatan"];
const barisR = [];
const R = (skenario, butir, v, satuan, label, catatan) => barisR.push({ skenario, butir, rendah: v[0], tengah: v[1], tinggi: v[2], satuan, label, catatan });
for (const s of SKEN) { const id = s.src.id, q = s.g.nas, e7 = s.g.g.e7, ka = analogKorban(e7), ts = RASIO_TS.map(r => nasT(s, b => b.jiwa_pesisir_rendah_lt30) * r);
  R(id, "magnitudo / kedalaman / strike", [null, `M${s.sk.m} / ${s.sk.dalam} km / ${bulat(s.sk.strike, 1)}°`, null], "-", "asumsi-kebijakan", "public/gempa/sim.js DIKENAL; jejak PuSGeN 2017 menurut komentar sim.js, magnitudo tidak bersumber per baris (audit 21 Okt)");
  R(id, "jiwa terpapar MMI >= VI", [null, Math.round(nas(s, b => b.jiwa_mmi_6 + b.jiwa_mmi_7 + b.jiwa_mmi_8 + b.jiwa_mmi_9plus)), null], "jiwa", "estimasi-model", "guncangan.js belum diuji (model_guncangan.json kinerja_uji belum_diuji)");
  R(id, "jiwa terpapar MMI >= VII", tri(e7), "jiwa", "estimasi-model", "rendah/tinggi = guncangan satu tau antar-kejadian lebih lemah/kuat");
  R(id, "luas MMI >= VI", [null, Math.round(nas(s, b => b.luas_mmi6plus_km2)), null], "km2", "estimasi-model", "kisi 0,02 derajat, daratan dalam poligon kab");
  R(id, "rumah rusak berat", tri(q.rb), "unit", "estimasi-model", "rumah = jiwa/3,9 (bukan data bangunan); pita kerusakan.js");
  R(id, "rumah rusak sedang", [Math.round(Math.min(...q.rs)), Math.round(q.rs[1]), Math.round(Math.max(...q.rs))], "unit", "estimasi-model", "");
  R(id, "rumah rusak ringan", [Math.round(Math.min(...q.rr)), Math.round(q.rr[1]), Math.round(Math.max(...q.rr))], "unit", "estimasi-model", "");
  R(id, "korban jiwa guncangan, pita mesin", tri(q.jiwa), "jiwa", "estimasi-model", `kerusakan.js; galat LOO x${KAL.faktor_loo} (kalibrasi 8 gempa kerak, korban ditulis dari ingatan); okupansi 0,85`);
  R(id, "korban jiwa guncangan, rasio analog", tri(ka), "jiwa", "estimasi-model", "jiwa MMI>=VII x rasio analog [min x pita rendah, median x tengah, maks x pita tinggi]; analog.csv");
  R(id, "korban jiwa tsunami (evakuasi segera 20%)", tri(ts), "jiwa", "estimasi-model", "proksi jiwa pesisir rendah tiba <= 30 menit x rasio Mentawai 2010/Pangandaran 2006; BUKAN genangan");
  for (const e of [0.5, 0.7]) R(id, `korban jiwa tsunami (evakuasi segera ${Math.round(e * 100)}%)`, tri(ts.map(v => v * fEvak(e))), "jiwa", "asumsi-kebijakan", `skala Nankai 2025 (215.000 pada 20%, 94.000 pada 70%; linear) = x${bulat(fEvak(e), 3)}`);
  R(id, "pengungsi (penghuni RB + RS)", [null, Math.round((q.rb[1] + q.rs[1]) * JIWA_PER_RUMAH), null], "jiwa", "asumsi-kebijakan", "(RB+RS) x 3,9; cek Cianjur 2022: lihat pembanding_pdna.csv");
  R(id, "jiwa evakuasi tsunami (pesisir rendah, tiba <= 30 menit)", [null, Math.round(nasT(s, b => b.jiwa_pesisir_rendah_lt30)), null], "jiwa", "estimasi-model", "batas atas, seluruh penduduk kecamatan");
  R(id, "panjang pantai tiba < 30 menit", [Math.round(nasT(s, b => b.panjang_pantai_lt30_km)), null, Math.round(nasT(s, b => b.panjang_pantai_lt30_sisi_aman_km))], "km", "estimasi-model", "rendah = waktu tampilan (x0,85), tinggi = sisi aman (x0,61); proksi jumlah sel pantai ETOPO 3' x 5,6 km");
  R(id, "kerugian materiil batas bawah (stimulan rumah)", [Math.round(rupiah(q.rb[0], Math.min(...q.rs), Math.min(...q.rr))), Math.round(rupiah(q.rb[1], q.rs[1], q.rr[1])), Math.round(rupiah(q.rb[2], Math.max(...q.rs), Math.max(...q.rr)))], "juta Rp", "asumsi-kebijakan", "Rp60/30/15 jt per rumah RB/RS/RR (param_banjir.json); bukan kerugian ekonomi penuh");
  R(id, "kerugian materiil batas bawah, skema lama 50/25/10", [null, Math.round(rupiah(q.rb[1], q.rs[1], q.rr[1], STIM_LAMA)), null], "juta Rp", "asumsi-kebijakan", "skema Lombok 2018/Sulbar 2021");
  R(id, "tahun hidup hilang (YLL), guncangan analog", [Math.round(ka[0] * SISA_HIDUP[0]), Math.round(ka[1] * SISA_HIDUP[1]), Math.round(ka[2] * SISA_HIDUP[2])], "tahun", "asumsi-kebijakan", "korban x sisa harapan hidup 25/35/45 tahun");
  R(id, "hari-mengungsi (guncangan)", HARI.map(h => Math.round((q.rb[1] + q.rs[1]) * JIWA_PER_RUMAH * h)), "jiwa-hari", "asumsi-kebijakan", "pengungsi x 7 / 30 / 90 hari");
  R(id, "tsunami: kab/kota tercapai <= 180 menit", [null, nasT(s, b => b.tercapai_180_menit), null], "kab/kota", "estimasi-model", "");
  R(id, "tsunami: tinggi indikatif maksimum di pantai", [null, Math.max(...barisT.filter(b => b.skenario === id && b.tercapai_180_menit).map(b => b.tinggi_indikatif_hi_m)), null], "m", "estimasi-model", "Abe 1995 x2 (batas atas rentang), bukan run-up");
}
R("merapi2010", "jiwa di area sapuan awan panas + lahar tanpa evakuasi (H/L 0,15)", [null, Math.round(M15.terpapar), null], "jiwa", "estimasi-model", `awan panas ${bulat(M15.r.pdc_km, 1)} km, lahar ${bulat(M15.r.lahar_km, 1)} km; H/L 0,18: ${Math.round(M18.terpapar)} jiwa`);
R("merapi2010", "luas sapuan", [null, Math.round(M15.luas_ha), null], "ha", "estimasi-model", "gabungan sel DEM awan panas + lahar");
R("merapi2010", "korban jiwa (pola evakuasi 2010)", [KORBAN_MER[0], null, KORBAN_MER[1]], "jiwa", "resmi", "kejadian 2010: 347 (sekunder) s.d. 386 (DIBI); dibagi ke kab menurut porsi sapuan");
R("merapi2010", "pengungsi (radius 20 km seperti 2010)", [null, Math.round(jumlah(barisM, b => b.pengungsi_radius20km)), null], "jiwa", "estimasi-model", `DIBI 2010 mengungsi ${D.merapi.mengungsi}`);
for (const [n, v] of [["berat", D.merapi.rb], ["sedang", D.merapi.rs], ["ringan", D.merapi.rr]]) R("merapi2010", `rumah rusak ${n} (analog 2010)`, [null, v, null], "unit", "resmi", "DIBI 26 Okt 2010; batas atas model = rumah di sapuan (merapi2010_kab.csv)");
R("merapi2010", "kerugian materiil batas bawah (stimulan)", [null, Math.round(rupiah(D.merapi.rb, D.merapi.rs, D.merapi.rr)), null], "juta Rp", "asumsi-kebijakan", "rumah DIBI 2010 x Rp60/30/15 jt");
R("merapi2010", "tahun hidup hilang (YLL)", [Math.round(KORBAN_MER[0] * SISA_HIDUP[0]), Math.round((KORBAN_MER[0] + KORBAN_MER[1]) / 2 * SISA_HIDUP[1]), Math.round(KORBAN_MER[1] * SISA_HIDUP[2])], "tahun", "asumsi-kebijakan", "korban x 25/35/45 tahun");
for (const z of ZONA) R("krb-30-gunung", `jiwa KRB ${z} (jumlah 30 gunung, piksel <= 20 km)`, [null, Math.round(jumlah(KRB, x => jumlah([...x.per.values()], o => o[z]))), null], "jiwa", "resmi", "zona KRB PVMBG 2018 x WorldPop 2026; = paparan.json");
R("krb-30-gunung", "korban jiwa erupsi besar pola historis", [Math.round(jumlah(barisK, b => b.korban_analog_rendah)), null, Math.round(jumlah(barisK, b => b.korban_analog_tinggi))], "jiwa", "estimasi-model", "jiwa KRB III x rasio Semeru 2021 / Merapi 2010; bila SEMUA gunung erupsi besar (bukan satu kejadian)");
R("krb-30-gunung", "rumah rusak berat pola historis", [Math.round(jumlah(barisK, b => b.rb_analog_rendah)), null, Math.round(jumlah(barisK, b => b.rb_analog_tinggi))], "unit", "estimasi-model", "jiwa KRB III x RB/jiwa KRB III Merapi 2010 & Semeru 2021");
R("krb-30-gunung", "pengungsi pola historis", [Math.round(jumlah(barisK, b => b.pengungsi_analog_rendah)), null, Math.round(jumlah(barisK, b => b.pengungsi_analog_tinggi))], "jiwa", "estimasi-model", "jiwa KRB III x mengungsi/jiwa KRB III (Semeru 1,1x; Merapi 13x)");
csv("ringkasan.csv", KR, barisR);

/* --- kepekaan.csv */
const KS = ["skenario", "tuas", "nilai_tuas", "korban_rendah", "korban_tengah", "korban_tinggi", "rb_tengah", "faktor_terhadap_dasar", "dasar_angka", "label"];
const barisS = [];
for (const s of SKEN) { const id = s.src.id, ts = RASIO_TS.map(r => nasT(s, b => b.jiwa_pesisir_rendah_lt30) * r), ka = analogKorban(s.g.g.e7);
  for (const e of EVAK) barisS.push({ skenario: id, tuas: "porsi evakuasi segera (tsunami)", nilai_tuas: `${Math.round(e * 100)}%`, korban_rendah: bulat(ts[0] * fEvak(e), 1), korban_tengah: bulat(ts[1] * fEvak(e), 1), korban_tinggi: bulat(ts[2] * fEvak(e), 1), rb_tengah: null,
    faktor_terhadap_dasar: bulat(fEvak(e), 4), dasar_angka: "Nankai 2025: 215.000 (20%) -> 94.000 (70%), linear di antaranya; rasio analog dianggap setara 20%", label: "asumsi-kebijakan" });
  const d0 = s.bangunan[0];
  for (const v of s.bangunan) { const f = d0.jiwa > 0 ? v.jiwa / d0.jiwa : 1;
    barisS.push({ skenario: id, tuas: "kepatuhan bangunan (porsi tembok tanpa tulangan / beton-terkekang / kayu)", nilai_tuas: v.n, korban_rendah: bulat(ka[0] * f, 1), korban_tengah: bulat(ka[1] * f, 1), korban_tinggi: bulat(ka[2] * f, 1), rb_tengah: Math.round(v.rb),
      faktor_terhadap_dasar: bulat(f, 4), dasar_angka: `korban mesin tengah ${bulat(v.jiwa, 1)} vs dasar ${bulat(d0.jiwa, 1)}; faktor diterapkan ke korban analog guncangan`, label: "estimasi-model" }); }
  barisS.push({ skenario: id, tuas: "jam kejadian (okupansi rumah)", nilai_tuas: "malam (0,99) vs rata-rata (0,85)", korban_rendah: bulat(ka[0] * 0.99 / 0.85, 1), korban_tengah: bulat(ka[1] * 0.99 / 0.85, 1), korban_tinggi: bulat(ka[2] * 0.99 / 0.85, 1), rb_tengah: null,
    faktor_terhadap_dasar: bulat(0.99 / 0.85, 4), dasar_angka: "okupansi HAZUS di kerusakan.js; korban mesin linear terhadap okupansi", label: "asumsi-kebijakan" }); }
csv("kepekaan.csv", KS, barisS);

/* --- pembanding_resmi.csv */
const maxProv = (id, provs) => Math.max(0, ...barisT.filter(b => b.skenario === id && provs.includes(b.prov) && b.tercapai_180_menit).map(b => b.tinggi_indikatif_hi_m));
const ksT = baca(MENTAH + "ks_tsunami.json").summary, ksG = baca(MENTAH + "ks_gempabumi.json").summary, ksV = baca(MENTAH + "ks_letusan-gunungapi.json").summary;
const KB = ["butir", "angka_resmi_atau_literatur", "sumber", "label", "angka_platform", "arti_angka_platform", "dipakai_sebagai_utama"];
const krbJml = jumlah(PAP.gunung, g => g.zona.III.penduduk + g.zona.II.penduduk + g.zona.I.penduduk);
const PR = [
  { butir: "Penduduk terpapar bahaya tsunami (nasional)", angka_resmi_atau_literatur: `${ksT.terpapar} (jiwa_terpapar ${ksT.jiwa_terpapar})`, sumber: "KRB 2022-2026 via API-KRB kajian-summary/tsunami (riset/mentah/ks_tsunami.json; RENAS 2025-2029 Tabel 2.x, riset A §1.4)", label: "resmi",
    angka_platform: SKEN.map(s => `${s.src.id} ${Math.round(nasT(s, b => b.jiwa_pesisir_rendah_lt30))}`).join("; "), arti_angka_platform: "jiwa kecamatan pesisir rendah tiba <= 30 menit per skenario (proksi, bukan genangan)", dipakai_sebagai_utama: "resmi" },
  { butir: "Penduduk terpapar bahaya gempa (nasional)", angka_resmi_atau_literatur: String(ksG.terpapar), sumber: "KRB 2022-2026 (ks_gempabumi.json)", label: "resmi",
    angka_platform: SKEN.map(s => `${s.src.id} MMI>=VI ${Math.round(nas(s, b => b.jiwa_mmi_6 + b.jiwa_mmi_7 + b.jiwa_mmi_8 + b.jiwa_mmi_9plus))}`).join("; "), arti_angka_platform: "per skenario tunggal, bukan bahaya probabilistik", dipakai_sebagai_utama: "resmi" },
  { butir: "Penduduk terpapar bahaya letusan gunung api (nasional)", angka_resmi_atau_literatur: String(ksV.terpapar), sumber: "KRB 2022-2026 (ks_letusan-gunungapi.json)", label: "resmi",
    angka_platform: String(krbJml), arti_angka_platform: "jumlah KRB III+II+I 30 gunung (paparan.json, dalam 20 km)", dipakai_sebagai_utama: "resmi" },
  { butir: "Mmaks megathrust Jawa", angka_resmi_atau_literatur: "9,1 (Peta Gempa 2024); PuSGeN 2017: tabel tidak dibuka", sumber: "tektonesiana.org; katadata; CNBC (riset A §6)", label: "terverifikasi (sekunder)",
    angka_platform: "8,5", arti_angka_platform: "skenario sim.js; lebih kecil dari Mmaks 2024", dipakai_sebagai_utama: "resmi untuk Mmaks; platform hanya ilustrasi" },
  { butir: "Mmaks megathrust Mentawai/Enggano", angka_resmi_atau_literatur: "8,9 (Peta Gempa 2024)", sumber: "riset A §6 (sekunder)", label: "terverifikasi (sekunder)", angka_platform: "8,8", arti_angka_platform: "skenario sim.js", dipakai_sebagai_utama: "resmi untuk Mmaks" },
  { butir: "Mmaks megathrust selatan Bali-Sumba", angka_resmi_atau_literatur: "tidak ditemukan di riset", sumber: "-", label: "-", angka_platform: "8,3", arti_angka_platform: "skenario sim.js, tanpa rujukan per baris", dipakai_sebagai_utama: "platform (ilustrasi), tandai belum bersumber" },
  { butir: "Jumlah segmen megathrust", angka_resmi_atau_literatur: "13 (RPJMN/Renstra, PuSGeN 2017) / 14 (Peta Gempa 2024) / 15 (GeoServer InaRISK) / 16 (sumber lain 2017)", sumber: "riset A §6, §8", label: "resmi/sekunder, bertentangan", angka_platform: "3 skenario", arti_angka_platform: "hanya tiga segmen dijalankan", dipakai_sebagai_utama: "resmi" },
  { butir: "Tinggi tsunami terburuk selatan Jawa Barat", angka_resmi_atau_literatur: "~20 m (dua segmen pecah bersamaan)", sumber: "Widiyantoro dkk. 2020, Sci. Rep. 10:15274 (ITB/BMKG; abstrak, riset A §6)", label: "terverifikasi (sekunder: abstrak)",
    angka_platform: String(maxProv("jawa", ["32", "36"])), arti_angka_platform: "tinggi indikatif atas (Abe 1995 x2) di pantai Jabar/Banten, skenario jawa M8,5", dipakai_sebagai_utama: "literatur" },
  { butir: "Tinggi tsunami terburuk selatan Jawa Timur", angka_resmi_atau_literatur: "~12 m; rata-rata maksimum 4,5 m sepanjang pantai selatan Jawa", sumber: "Widiyantoro dkk. 2020 (abstrak)", label: "terverifikasi (sekunder: abstrak)",
    angka_platform: String(maxProv("jawa", ["35"])), arti_angka_platform: "tinggi indikatif atas di pantai Jatim, skenario jawa", dipakai_sebagai_utama: "literatur" },
  { butir: "Tinggi tsunami Sumatra paling selatan / Ujung Kulon", angka_resmi_atau_literatur: "hingga 34 m", sumber: "Supendi dkk. 2022, Nat. Hazards (riset A §6)", label: "terverifikasi (sekunder)",
    angka_platform: String(Math.max(maxProv("jawa", ["18", "36"]), maxProv("mentawai", ["18", "36"]))), arti_angka_platform: "tinggi indikatif atas Lampung/Banten, skenario jawa & mentawai", dipakai_sebagai_utama: "literatur" },
  { butir: "Genangan tsunami skenario", angka_resmi_atau_literatur: "layer Inun_7_8_Mw ... Inun_9_0_Mw dan INA_Megathrust di GeoServer InaRISK", sumber: "docs/multi-bencana/SUMBER-BNPB.md (riset A §6), cakupan belum dicek", label: "resmi (keberadaan layer)", angka_platform: "-", arti_angka_platform: "platform TIDAK menghitung genangan", dipakai_sebagai_utama: "resmi" },
  { butir: "Korban jiwa Merapi 2010", angka_resmi_atau_literatur: `${D.merapi.meninggal} (DIBI) / 347 / 354`, sumber: "DIBI; riset A §4.4", label: "resmi", angka_platform: String(Math.round(M15.terpapar)), arti_angka_platform: "jiwa di sapuan model tanpa evakuasi (bukan korban)", dipakai_sebagai_utama: "resmi" },
];
csv("pembanding_resmi.csv", KB, PR);

/* --- peta_kab.json (gabung ke public/geo/kabupaten/<prov>.json lewat prov + kab -> kode) dan jejak.geojson */
const peta = {};
const isi = (kode, jalur, v) => { const k = KABK.get(kode); const o = peta[kode] || (peta[kode] = { prov: k.prov, kab: k.kab, nama: k.nama, pulau: PULAU(k.prov) }); let t = o; for (const j of jalur.slice(0, -1)) t = t[j] || (t[j] = {}); t[jalur.at(-1)] = v; };
for (const b of barisG) if (b.mmi_maks != null) isi(b.kode, ["gempa", b.skenario], { mmi_maks: b.mmi_maks, jiwa_mmi7plus: b.jiwa_mmi7plus_tengah, korban_analog: [b.korban_analog_rendah, b.korban_analog_tengah, b.korban_analog_tinggi], rb: b.rb_tengah });
for (const b of barisT) if (b.tercapai_180_menit) isi(b.kode, ["tsunami", b.skenario], { tiba_menit: b.tiba_menit, tiba_menit_sisi_aman: b.tiba_menit_sisi_aman, tinggi_hi_m: b.tinggi_indikatif_hi_m, jiwa_pesisir_rendah_lt30: b.jiwa_pesisir_rendah_lt30 });
for (const b of barisM) isi(b.kode, ["merapi2010"], { jiwa_sapuan: b.jiwa_sapuan_tanpa_evakuasi, pengungsi_radius20km: b.pengungsi_radius20km, luas_sapuan_ha: b.luas_sapuan_ha });
for (const b of barisK) { const o = (peta[b.kode]?.krb) || { jiwa_krb3: 0, jiwa_krb2: 0, jiwa_krb1: 0, gunung: [] }; o.jiwa_krb3 += b.jiwa_krb3; o.jiwa_krb2 += b.jiwa_krb2; o.jiwa_krb1 += b.jiwa_krb1; if (!o.gunung.includes(b.gunung_id)) o.gunung.push(b.gunung_id); isi(b.kode, ["krb"], o); }
json("peta_kab.json", { dibuat: new Date().toISOString().slice(0, 10), arti: "per kode kab/kota Kemendagri 4 digit; gabungkan ke public/geo/kabupaten/<prov>.json lewat (prov, kab). Angka sama dengan CSV paket ini.", kab: peta });
const fitur = [];
for (const s of SKEN) { const r = s.sk.r, sr = r.strike * RAD, u = [Math.sin(sr), Math.cos(sr)], v = [Math.cos(sr), -Math.sin(sr)];
  fitur.push({ type: "Feature", properties: { jenis: "bidang patahan", skenario: s.src.id, m: s.sk.m, L_km: bulat(r.L), lebar_km: bulat(r.Wh), slip_m: bulat(r.slip, 1) }, geometry: { type: "Polygon", coordinates: [[[1, 1], [1, -1], [-1, -1], [-1, 1], [1, 1]].map(([a, b]) => {
    const x = a * r.L / 2 * u[0] + b * r.Wh / 2 * v[0], y = a * r.L / 2 * u[1] + b * r.Wh / 2 * v[1]; return [bulat(s.sk.lon + x / (111.19 * Math.cos(s.sk.lat * RAD)), 4), bulat(s.sk.lat + y / 111.19, 4)]; })] } });
  for (const p of s.t.wt.pantai) if (p.menit * AMAN <= 30) fitur.push({ type: "Feature", properties: { jenis: "pantai tiba <= 30 menit (sisi aman)", skenario: s.src.id, kode: p.kab ? kodeKab(p.prov, p.kab) : null, tiba_menit: p.menit, tiba_menit_sisi_aman: bulat(p.menit * AMAN, 1), tinggi_lo_m: p.tinggi_lo, tinggi_hi_m: p.tinggi_hi }, geometry: { type: "Point", coordinates: [p.lon, p.lat] } }); }
json("jejak.geojson", { type: "FeatureCollection", features: fitur });

/* --- skenario.json: definisi, asumsi, analog, kamus kolom, hasil self-check */
const SUMBER_MESIN = "Pantau Bencana: public/gempa/{guncangan,kerusakan,tsunami}.js; public/gunungapi/{sim_lahar,sim_tanggap}.js";
const kamus = {
  "jiwa_mmi_*": ["estimasi-model", "public/data/penduduk.json kec (WorldPop R2025A 2026) x MMI guncangan.js (BSSA14/Zhao06 + Worden 2012, Vs30 kemiringan DEM)"],
  "jiwa_mmi7plus_rendah/tinggi": ["estimasi-model", "PGA digeser satu tau antar-kejadian (kerusakan.js pita)"], "luas_mmi*_km2": ["estimasi-model", "kisi 0,02 derajat, sel di dalam poligon public/geo/kabupaten"],
  "rumah_dalam_jendela, rb_*, rs_*, rr_*": ["estimasi-model", "rumah = jiwa/3,9 (kerusakan.js JIWA_PER_RUMAH, bukan data bangunan); kurva HAZUS pre-code + kalib 3,0586; pita [rendah,tengah,tinggi]"],
  "korban_mesin_*": ["estimasi-model", `kerusakan.js taksir; galat LOO x${KAL.faktor_loo}; audit 21 Okt: tidak layak untuk gempa nyata`],
  "korban_analog_*": ["estimasi-model", "jiwa MMI>=VII x rasio meninggal/terpapar analog (analog.csv): rendah = min x pita rendah, tengah = median x tengah, tinggi = maks x pita tinggi"],
  "pengungsi (gempa)": ["asumsi-kebijakan", "(RB+RS tengah) x 3,9"], "hari_mengungsi_*": ["asumsi-kebijakan", "pengungsi x 7/30/90 hari"],
  "kerugian_stimulan_rp_juta_*": ["asumsi-kebijakan", "RB x 60 + RS x 30 + RR x 15 juta (param_banjir.json stimulan_rumah_*, Cianjur 2022 kemenkopmk.go.id/node/3416); batas bawah biaya rehab rumah"],
  "yll_*": ["asumsi-kebijakan", "korban x sisa harapan hidup 25/35/45 tahun"], "sekolah_mmi7plus, faskes_mmi7plus": ["terverifikasi", "sekolah.json (Dapodik/EMIS) dan fasilitas.json (OSM) hanya 9 provinsi; kosong = tidak tercakup"],
  "tiba_menit": ["estimasi-model", "tsunami.js Dijkstra gelombang panjang x0,85 (waktu tampilan)"], "tiba_menit_sisi_aman": ["estimasi-model", "waktu mentah x0,61 (SISI_AMAN, dipakai evakuasi)"],
  "tinggi_indikatif_*": ["estimasi-model", "Abe 1995 + koreksi Green, rentang 0,5-2 Hr; bukan run-up/genangan"], "panjang_pantai_*": ["estimasi-model", "jumlah sel pantai ETOPO 3' x 5,56 km (proksi)"],
  "jiwa_pesisir_rendah_*": ["estimasi-model", "penduduk kecamatan dengan pusat di sel ETOPO <= 10 m dan pantai terdekat tinggi atas >= 0,5 m (aturan sim.js); batas atas, bukan genangan"],
  "jiwa_tak_sempat_jalan_kaki": ["estimasi-model", "jalan kaki 4 km/jam, jarak lurus x1,3 ke tanah >= 20 m (Tsunami.tempatTinggi) lebih lama dari tiba sisi aman"],
  "korban_e20/e50/e70_*": ["estimasi-model + asumsi-kebijakan", "jiwa_pesisir_rendah_lt30 x rasio tsunami analog [min, rerata geometrik, maks] x faktor Nankai"],
  "jiwa_sapuan_*": ["estimasi-model", "sim_lahar.js V 10 jt m3, H/L 0,15 (0,18 pembanding) x WorldPop 1 km bobot luas"], "pengungsi_radius20km": ["asumsi-kebijakan", "penduduk <= 20 km dari puncak (radius 2010)"],
  "dibi2010_*": ["resmi", "DIBI 26 Okt 2010"], "jiwa_krb*": ["resmi (zona) x terverifikasi (penduduk)", "KRB PVMBG 2018 (paparan_geo.json, poligon diperhalus) x pop/<id>.json, piksel <= 20 km dari puncak (aturan paparan.py)"],
  "luas_krb*_ha": ["resmi", "sampel 0,0045 derajat di poligon KRB, tanpa batas 20 km"], "*_analog_* (gunung)": ["estimasi-model", "jiwa KRB III x rasio Semeru 2021 / Merapi 2010 (analog.csv)"],
};
json("skenario.json", {
  paket: "skenario-geologi", dibuat: new Date().toISOString().slice(0, 10), skrip: "data/kajian-bnpb/bangun/skenario-geologi.mjs", mesin: SUMBER_MESIN,
  prinsip: "Angka utama kajian = resmi (KRB 2022-2026, KRB PVMBG, DIBI). Hasil mesin platform = ilustrasi berlabel, selalu rentang. Tidak ada genangan tsunami.",
  skenario: [...SKEN.map(s => ({ id: s.src.id, nama: s.src.n, jenis: "megathrust (antarmuka)", m: s.sk.m, dalam_km: s.sk.dalam, strike: bulat(s.sk.strike, 2), pusat_bidang: [bulat(s.sk.lat, 4), bulat(s.sk.lon, 4)], titik_palung: s.sk.parit.map(v => bulat(v, 4)),
      panjang_km: bulat(s.sk.r.L, 1), lebar_proyeksi_km: bulat(s.sk.r.Wh, 1), slip_m: bulat(s.sk.r.slip, 2), jendela_km: bulat(s.g.g.win, 1), sumber_parameter: "public/gempa/sim.js DIKENAL (jejak dari peta PuSGeN 2017/literatur menurut komentar berkas; magnitudo tidak bersumber per baris)", okupansi: 0.85,
      kepatuhan_bangunan: s.bangunan.map(v => ({ varian: v.n, korban_mesin_tengah: bulat(v.jiwa, 1), rb_tengah: Math.round(v.rb) })) })),
    { id: "merapi2010", nama: "Erupsi Merapi setara 2010", V_m3: 1e7, hl: 0.15, hl_pembanding: 0.18, puncak: [MER.lat, MER.lon], awan_panas_km: bulat(M15.r.pdc_km, 1), lahar_km: bulat(M15.r.lahar_km, 1), sumber_parameter: "scripts/gunungapi/cek_merapi2010.mjs" },
    { id: "krb-30-gunung", nama: "Paparan KRB PVMBG 30 gunung (paparan.json)", catatan: "paparan, bukan skenario erupsi; korban/rumah/pengungsi dari rasio Semeru 2021 dan Merapi 2010 per jiwa KRB III" },
    { id: "sesar-darat", nama: "Gempa sesar darat dekat kota besar (Mmaks PuSGeN 2017)", dibuat: false, alasan: "Tabel Mmaks PuSGeN 2017 tidak bisa dibuktikan sesi ini: PDF buku (luk.tsipil.ugm.ac.id, 37,6 MB) melebihi batas baca dan tidak diunduh tanpa izin; pencarian hanya menemukan Lembang M6,8 dari siaran pers BMKG tanpa menyebut PuSGeN. sim.js punya Lembang 6,8 / Cimandiri 6,9 / Opak 6,6 tanpa sumber per baris (audit 21 Okt)." }],
  asumsi: { jiwa_per_rumah: JIWA_PER_RUMAH, stimulan_juta: STIM, stimulan_skema_lama_juta: STIM_LAMA, sisa_harapan_hidup_tahun: SISA_HIDUP, hari_mengungsi: HARI, okupansi_tanpa_jam: 0.85,
    nankai: { ...NANKAI, sumber: "https://sj.jst.go.jp/stories/2025/s0519-01p.html (riset C §1.1, sekunder)", faktor: Object.fromEntries(EVAK.map(e => [e, bulat(fEvak(e), 4)])), catatan: "50% = interpolasi linear (asumsi)" },
    sisa_harapan_hidup_dasar: "Asumsi kebijakan. BPS 2024: UHH laki-laki 70,32 / perempuan 74,21 (ringkasan pencarian bps.go.id, tabel tidak terbuka langsung); umur rata-rata korban tidak tersedia, dipakai sisa 35 tahun (25-45)." },
  rasio_analog: { guncangan: { min: RASIO_GEMPA[0], median: RASIO_GEMPA[1], maks: RASIO_GEMPA[2] }, tsunami: { min: RASIO_TS[0], rerata_geometrik: RASIO_TS[1], maks: RASIO_TS[2] },
    gunung_krb3: Object.fromEntries(["korban", "rb", "rs", "rr", "ungsi"].map(k => [k, rgGA(k)])) },
  kamus_kolom: Object.fromEntries(Object.entries(kamus).map(([k, [label, sumber]]) => [k, { label, sumber }])),
  krb_selisih_terhadap_paparan_json: Object.fromEntries(KRB.map(x => [x.g.id, x.selisih])),
});

/* ================================================================ self-check */
assert.equal(KAB.length, 514, "kab/kota harus 514");
assert.equal(KAB.filter(k => +k.prov >= 31 && +k.prov <= 36).length, 119, "kab/kota Jawa harus 119");
assert.equal(new Set(POLI.map(q => q.kode)).size, 514, "tiap kab punya poligon");
const totPend = jumlah([...PEND_KAB.values()]), totKec = jumlah(Object.values(PEND));
assert.ok(Math.abs(totPend - totKec) < 1, "penduduk kab = jumlah kecamatan");
assert.ok(Math.abs(totKec - (PENDF.total - PENDF.di_luar_poligon)) < 10, `penduduk kec ${totKec} vs total-di_luar ${PENDF.total - PENDF.di_luar_poligon}`);
for (const s of SKEN) {
  for (const f of [barisG, barisT]) assert.equal(f.filter(b => b.skenario === s.src.id).length, 514, "514 baris per skenario");
  assert.equal(s.src.m, { jawa: 8.5, mentawai: 8.8, sumba: 8.3 }[s.src.id], "magnitudo skenario harus sesuai sim.js");
  const kecTot = jumlah(s.g.g.sebar, c => c.p), kabTot = jumlah([...s.g.per.values()], o => jumlah(o.mmi));
  assert.ok(Math.abs(kecTot - kabTot) < 1e-6 * Math.max(1, kecTot), `${s.src.id}: jiwa per kab != per kec`);
  for (const n of ["rb", "rs", "rr", "jiwa"]) { const a = jumlah([...s.g.per.values()], o => o.k[n][1]), b = s.g.nas[n][1]; assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, b), `${s.src.id}: ${n} tengah kab ${a} != nasional ${b}`); }
  assert.ok(Math.abs(jumlah([...s.g.per.values()], o => o.e7[1]) - s.g.g.e7[1]) < 1e-6 * Math.max(1, s.g.g.e7[1]), "E7 kab = nasional");
  assert.ok(s.t.per.size > 0 && nasT(s, b => b.tercapai_180_menit) > 0, "tsunami mencapai pantai");
  assert.ok(s.bangunan[1].jiwa <= s.bangunan[0].jiwa && s.bangunan[2].jiwa <= s.bangunan[1].jiwa, "kepatuhan naik tidak boleh menambah korban");
}
for (const r of [...RASIO_GEMPA, ...RASIO_TS]) assert.ok(Number.isFinite(r) && r > 0, "rasio analog harus positif");
assert.ok(fEvak(0.2) === 1 && Math.abs(fEvak(0.7) - NANKAI.e70 / NANKAI.e20) < 1e-12, "faktor Nankai");
assert.equal(D.merapi.meninggal, 386, "DIBI Merapi 2010 = 386 (riset A §4.4)");
assert.equal(D.cianjur.meninggal, 602, "DIBI Cianjur = 602");
assert.equal(D.mentawai.meninggal, 447, "DIBI Mentawai 2010 = 447");
assert.equal(D.sulteng.meninggal, 4141, "DIBI Sulteng 2018 baris = 4.141 (riset A: 4.140)");
assert.ok(Math.abs(M15.terpapar - 89707) / 89707 < 0.02, `Merapi H/L 0,15 terpapar ${M15.terpapar} harus ~89.707 (cek_merapi2010.mjs, sim.js:355)`);
assert.ok(Math.abs(jumlah([...M15.per.values()], o => o.jiwa) - M15.terpapar) < 1, "Merapi jiwa kab = total");
for (const x of KRB) for (const z of ZONA) { const ref = x.g.zona[z].penduduk, sel = x.selisih[z];
  assert.ok(Math.abs(sel) <= 1, `KRB ${x.g.id} zona ${z}: jumlah per kab ${Math.round(ref + sel)} != paparan.json ${ref}`); }
for (const b of [...barisG, ...barisT, ...barisK, ...barisM]) assert.ok(KABK.has(b.kode), "kode kab tak dikenal");
assert.ok(SEMUA_ANGKA.length > 1e4 && SEMUA_ANGKA.every(Number.isFinite), "tidak ada NaN");
const maks = (a, f) => a.reduce((m, x) => Math.max(m, Math.abs(f(x))), 0);
console.log("skenario:", SKEN.map(s => `${s.src.id} M${s.sk.m}: MMI>=VII ${Math.round(s.g.g.e7[1])} jiwa, korban analog ${tri(analogKorban(s.g.g.e7)).join("/")}, mesin ${tri(s.g.nas.jiwa).join("/")}, tsunami<=30mnt ${Math.round(nasT(s, b => b.jiwa_pesisir_rendah_lt30))} jiwa`).join("\n          "));
console.log("rasio analog guncangan", RASIO_GEMPA.map(v => bulat(v * 100, 4) + "%").join(" / "), "| tsunami", RASIO_TS.map(v => bulat(v * 100, 4) + "%").join(" / "));
console.log("Merapi 2010: terpapar", Math.round(M15.terpapar), "| KRB selisih maks", Math.round(maks(KRB, x => maks(ZONA, z => x.selisih[z]))), "jiwa");
console.log("self-check hijau");
