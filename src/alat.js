/* Panel pemantauan alat (EWS) banjir dan gunung api, EW-04 (data/kajian-bnpb/ews: KEPUTUSAN D2-D6, D9, Q2 dijawab 25 Nov 2026; ALGORITMA G1-G5; DESAIN-TEKNIS bagian Rute).
   GET /api/alat/pos?bencana=<id>: pos bentuk D2 dari sumber di registri kemampuan.alat (public/bencana.json), + ringkas (G3) + gagal [sumber].
   GET /api/alat/seri?pos=<sumber:id>&jam=1..24[&kunci=<besaran>]: titik [waktu ms, nilai|null] satu pos.
   Adapter: sensor (D1 sensor_alat/sensor_baca, 0089 + 0176), sihka (baris cuaca_sumber 'sihka_status' yang sudah dibangun src/sihka.js; satu baris baca), pvmbg (aset gunungapi_status.json).
   Sumber pihak ketiga tanpa izin tertulis (MHEWS, Banda Aceh, geodashboard) TIDAK ada di sini (Q1, EW-06/07).
   Hak (Q2): publik boleh melihat bacaan sensor sendiri, koordinat alat dibulatkan 0,01 derajat (KEAMANAN-PRIVASI) dan desa tidak keluar; staf pusdalops/koordalops/pimpinan
   mendapat koordinat penuh + desa, tanpa cache. Jawaban publik lewat cache tepi 60 detik (kuota baca D1). Tingkat, basi, ringkasan, urutan dari public/inti/pantau_alat.js (satu definisi).
   Sumber gagal = masuk `gagal`, tidak pernah 0 pos; pos basi = tingkat tanpa_data, nilai terakhir tetap (D4). Tidak memicu peringatan apa pun (D6). */
import {json, gagal, cacheTepi} from "./worker.js";
import {lajuIP} from "./bnpb.js";
import {stafPeran} from "./staf.js";
import {SQL_RIWAYAT} from "./sihka.js";
import REGISTRY from "./bencana.generated.js";
import {tingkat, basi, ringkasan, urut, INTERVAL} from "../public/inti/pantau_alat.js";

const PERAN = ["pusdalops", "koordalops", "pimpinan"], JAM = 3600e3, CACHE_DETIK = 60, MAKS_ALAT = 500, MAKS_TITIK = 1500;
const RE_POS = /^(sensor|sihka|pvmbg):([A-Za-z0-9_.-]{1,40})$/, RE_KUNCI = /^[a-z][a-z0-9_]{0,23}$/;
/* satuan hanya dibaca dari akhiran kunci nilai alat (tinggi_cm, getar_mms); akhiran lain = null, tanpa tebakan */
const AKHIRAN = {cm: "cm", mm: "mm", m: "m", mms: "mm/s", hz: "Hz", c: "°C", pct: "%"};
const satuanKunci = k => AKHIRAN[String(k).split("_").pop()] ?? null;
/* SIHKA ditarik tiap jam (src/sihka.js perbaruiSihka), jadi interval seri SIHKA 1 jam */
const INTERVAL_SIHKA = JAM;
/* status SIHKA yang membuat status resmi tidak sah (sama dengan resmi() di public/banjir/pos_air.js); "lama" ditangani basi() */
const TANPA_RESMI = new Set(["lama", "macet", "bukan_tinggi", "data_bolong"]);
const LEVEL_PVMBG = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"};
const bulat = (x, publik) => typeof x !== "number" ? null : publik ? Math.round(x * 100) / 100 : x;
const angka = v => typeof v === "number" && Number.isFinite(v) ? v : null;
const urai = (t, awal) => { try { const o = JSON.parse(t); return o && typeof o === "object" && !Array.isArray(o) ? o : awal; } catch (e) { return awal; } };
const alatBencana = id => REGISTRY.bencana.find(b => b.id === id && b.status !== "mati")?.kemampuan?.alat ?? null;
/* besaran utama: kunci berambang pertama yang terukur, lalu kunci nilai pertama */
const utamaDari = (ambang, nilai) => Object.keys(ambang || {}).find(k => typeof nilai?.[k] === "number") ?? Object.keys(nilai || {})[0] ?? Object.keys(ambang || {})[0] ?? null;

const SQL_SENSOR = `SELECT a.id, a.jenis, a.kab, a.desa, a.lat, a.lon, a.ambang, b.waktu, b.nilai, b.baterai FROM sensor_alat a
  LEFT JOIN sensor_baca b ON b.alat_id = a.id AND b.waktu = (SELECT max(waktu) FROM sensor_baca WHERE alat_id = a.id)
  WHERE a.aktif = 1 AND a.jenis <> 'gateway' AND a.jenis IN (SELECT value FROM json_each(?1)) ORDER BY a.id LIMIT ${MAKS_ALAT}`;

const ADAPTER = {
  async sensor(env, {jenis, publik}) {
    const rows = (await env.DB.prepare(SQL_SENSOR).bind(JSON.stringify(jenis)).all()).results;
    return rows.map(r => {
      const ambang = urai(r.ambang, {}), nilai = r.waktu == null ? null : urai(r.nilai, null), utama = utamaDari(ambang, nilai);
      return {id: "sensor:" + r.id, sumber: "sensor", jenis: r.jenis, nama: r.id, lat: bulat(r.lat, publik), lon: bulat(r.lon, publik), kab: r.kab ?? null,
        ...(publik ? {} : {desa: r.desa ?? null}), nilai, utama, satuan: utama ? satuanKunci(utama) : null, waktu: r.waktu ?? null,
        ambang: Object.keys(ambang).length ? ambang : null, alat: {baterai: angka(r.baterai), suhu: angka(nilai?.suhu_c)}};
    });
  },
  async sihka(env) {
    const isi = (await env.DB.prepare("SELECT isi FROM cuaca_sumber WHERE kunci = 'sihka_status'").first())?.isi;
    if (!isi) throw new Error("sihka_status belum terisi");
    const d = JSON.parse(isi);
    if (!Array.isArray(d?.pos)) throw new Error("sihka_status tanpa daftar pos");
    return d.pos.filter(p => p && typeof p.id === "string").map(p => ({id: "sihka:" + p.id, sumber: "sihka", jenis: "tma", nama: p.nama ?? p.id, lat: angka(p.lat), lon: angka(p.lon), kab: null,
      nilai: {tinggi: angka(p.v)}, utama: "tinggi", satuan: p.satuan === "centimeter" ? "cm" : p.satuan ?? null, waktu: typeof p.t === "number" ? p.t * 1000 : null,
      ambang: p.ambang ?? null, status: p.status ?? null, status_resmi: TANPA_RESMI.has(p.status) ? null : p.status_resmi ?? null, pengelola: p.pengelola ?? null, alat: {baterai: null, suhu: null}}));
  },
  async pvmbg(env) {
    const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/gunungapi_status.json"), {signal: AbortSignal.timeout(5000)});
    if (!r.ok) throw new Error("gunungapi_status.json " + r.status);
    const d = await r.json(), waktu = Date.parse(d?.dibuat);
    if (!Array.isArray(d?.gunung)) throw new Error("gunungapi_status.json tanpa daftar gunung");
    return d.gunung.filter(g => g && typeof g.nama === "string").map(g => ({id: "pvmbg:" + String(g.kode || g.nama).replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, 40), sumber: "pvmbg", jenis: "level",
      nama: g.nama, lat: angka(g.lat), lon: angka(g.lon), kab: null, nilai: {level: angka(g.level)}, utama: "level", satuan: null, waktu: Number.isFinite(waktu) ? waktu : null,
      ambang: null, status_resmi: LEVEL_PVMBG[g.level] ?? null, pengelola: d.sumber ?? null, alat: {baterai: null, suhu: null}}));
  },
};

/* jalur staf HANYA lewat cookie sesi_staf (stafPeran); x-admin-token/Bearer tidak membuka koordinat penuh di rute publik ini.
   Tanpa cookie sesi_staf: tanpa query sesi. Kunci cache publik dibangun dari parameter yang sudah divalidasi saja (kueri acak tidak menembus cache). */
const stafDari = async (env, req) => /(?:^|;\s*)sesi_staf=/.test(req.headers.get("cookie") || "") && !!(await stafPeran(env, req, PERAN));
const bagi = async (env, req, ctx, kunci, buat) => await stafDari(env, req) ? buat(false) : cacheTepi(new Request(kunci), ctx, CACHE_DETIK, () => buat(true));
const LAJU = [[JAM, 600]];

async function pos(env, req, url, kini, ctx) {
  const bencana = url.searchParams.get("bencana") || "", alat = /^[a-z_]{1,30}$/.test(bencana) ? alatBencana(bencana) : null;
  if (!alat) return gagal(400, "bencana tidak dikenal atau tanpa panel alat");
  return bagi(env, req, ctx, `${url.origin}/api/alat/pos?bencana=${bencana}`, async publik => {
    const lj = await lajuIP(env, req, "alat_pos", LAJU, kini); if (lj) return lj;
    const hasil = await Promise.all(alat.sumber.map(async s => {
      try { return [s, await ADAPTER[s](env, {jenis: alat.jenis, publik})]; } catch (e) { console.error("alat " + s, e?.message); return [s, null]; }
    }));
    const daftar = hasil.flatMap(([, p]) => p || []), gagalSumber = hasil.filter(([, p]) => !p).map(([s]) => s);
    const keluar = urut(daftar, kini).map(p => ({...p, tingkat: tingkat(p, kini)?.kode ?? null, basi: basi(p, kini)}));
    return json({bencana, dibuat: kini, pos: keluar, ringkas: ringkasan(daftar, kini, {gagal: gagalSumber}), gagal: gagalSumber});
  });
}

async function seri(env, req, url, kini, ctx) {
  const m = (url.searchParams.get("pos") || "").match(RE_POS), jamT = url.searchParams.get("jam") ?? "24", kunci = url.searchParams.get("kunci");
  if (!m) return gagal(400, "pos harus <sumber>:<id>");
  if (!/^\d{1,2}$/.test(jamT) || +jamT < 1 || +jamT > 24) return gagal(400, "jam 1 sampai 24");
  if (kunci != null && !RE_KUNCI.test(kunci)) return gagal(400, "kunci besaran tidak sah");
  if (m[1] === "pvmbg") return gagal(404, "seri belum tersedia untuk sumber ini");
  const dari = kini - +jamT * JAM;
  return bagi(env, req, ctx, `${url.origin}/api/alat/seri?jam=${+jamT}${kunci != null ? "&kunci=" + kunci : ""}&pos=${m[1]}:${encodeURIComponent(m[2])}`, async () => {
    const lj = await lajuIP(env, req, "alat_seri", LAJU, kini); if (lj) return lj;
    if (m[1] === "sensor") {
      const a = await env.DB.prepare("SELECT id, jenis, ambang FROM sensor_alat WHERE id = ? AND aktif = 1 AND jenis <> 'gateway'").bind(m[2]).first();
      if (!a) return gagal(404, "pos tidak dikenal");
      const rows = (await env.DB.prepare(`SELECT waktu, nilai FROM sensor_baca WHERE alat_id = ? AND waktu > ? AND waktu <= ? ORDER BY waktu DESC LIMIT ${MAKS_TITIK}`).bind(a.id, dari, kini + 10 * 6e4).all()).results.reverse();   // terbaru menang bila > MAKS_TITIK
      const ambang = urai(a.ambang, {}), nilai = rows.map(r => urai(r.nilai, {})), k = kunci ?? utamaDari(ambang, nilai.at(-1));
      return json({pos: "sensor:" + a.id, sumber: "sensor", jenis: a.jenis, kunci: k, satuan: k ? satuanKunci(k) : null, interval: INTERVAL[a.jenis] ?? null,
        ambang: k && Object.hasOwn(ambang, k) ? ambang[k] : null, titik: rows.map((r, i) => [r.waktu, angka(nilai[i][k])]), dibuat: kini});
    }
    if (kunci != null && kunci !== "tinggi") return gagal(400, "pos SIHKA hanya punya besaran tinggi");
    const isi = (await env.DB.prepare(SQL_RIWAYAT).bind(m[2], Math.floor(kini / 1000), kini).first())?.isi;
    if (!isi) return gagal(404, "pos tidak dikenal");
    const d = JSON.parse(isi), titik = (d.t || []).map((t, i) => [t * 1000, angka(d.v?.[i])]).filter(t => t[0] > dari);
    return json({pos: "sihka:" + d.id, sumber: "sihka", jenis: "tma", kunci: "tinggi", satuan: d.satuan === "centimeter" ? "cm" : d.satuan ?? null, interval: INTERVAL_SIHKA, ambang: null, titik, dibuat: kini});
  });
}

export const RUTE_ALAT = {
  "GET /api/alat/pos": (env, req, url, kini, ctx) => pos(env, req, url, kini, ctx),
  "GET /api/alat/seri": (env, req, url, kini, ctx) => seri(env, req, url, kini, ctx),
};
