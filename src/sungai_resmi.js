/* Sumber tinggi muka air berambang RESMI di samping SIHKA: DSDA DKI (HTML ASP.NET, ShowPopup per baris tabel) dan SIPANTAU Kota Tangerang (JSON). Dipanen
   perbaruiResmi tiap jam dari cron SIHKA. Hasilnya MASUK tabel SIHKA yang sama (sihka_pos, sihka_baca; id 'd:<kode>' / 't:<uuid>') ditambah metadata di sungai_meta (0066),
   jadi dasar persentil, status lama/macet/riwayat_kurang, riwayat 24 jam, dan retensi ikut tanpa jalur kedua. Gagal-lunak: tiap sumber berdiri sendiri, galatnya dicatat di
   cuaca_sumber ('sungai_dsda' / 'sungai_tng') dan tidak menyentuh bacaan lama. CPU 10 ms: SIPANTAU JSON ~34 KB (JSON.parse), DSDA ~190 KB dibaca per baris tabel lewat indexOf dan satu
   regex per potongan <= 4 KB (bukan regex atas seluruh halaman); tulisan D1 satu teks JSON kecil yang diurai json_each. Koordinat TIDAK pernah dikarang: pos tanpa koordinat sah dilewati. */
export const DSDA = "https://poskobanjir.dsdadki.web.id/", SIPANTAU = "https://api.dpuprkotang.info/nuxt/posduga";
const UA = "pantaubencana-sihka/1.0 (+https://centurisk97.id; pemantauan banjir nonkomersial)", MAKS_BYTE = 2e6, TIMEOUT_MS = 8000;
const PENGELOLA = {
  "DSDA DKI": "Dinas Sumber Daya Air Provinsi DKI Jakarta (Posko Banjir DSDA DKI)",
  "SIPANTAU Kota Tangerang": "Dinas Pekerjaan Umum dan Penataan Ruang Kota Tangerang (SIPANTAU)"};
const BULAN = {Jan: 0, Feb: 1, Mar: 2, Apr: 3, Mei: 4, Jun: 5, Jul: 6, Agu: 7, Sep: 8, Okt: 9, Nov: 10, Des: 11};
const DALAM_INDONESIA = (lon, lat) => Number.isFinite(lon) && Number.isFinite(lat) && lon >= 94 && lon <= 142 && lat >= -12 && lat <= 7;

/* GET dengan batas byte (dibaca bertahap, dibatalkan > 2 MB), tanpa redirect; periksa(teks) melempar bila bentuknya salah */
export async function tarikTeks(url, periksa) {
  const r = await fetch(url, {headers: {"user-agent": UA, accept: "application/json, text/html"}, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual"});
  if (r.status !== 200) { r.body?.cancel(); throw new Error(`HTTP ${r.status}`); }
  if (+r.headers.get("content-length") > MAKS_BYTE) { r.body?.cancel(); throw new Error("badan terlalu besar"); }
  const rd = r.body.getReader(), bagian = []; let n = 0;
  for (;;) {
    const {done, value} = await rd.read(); if (done) break;
    n += value.byteLength; if (n > MAKS_BYTE) { await rd.cancel(); throw new Error("badan terlalu besar"); }
    bagian.push(value);
  }
  const buf = new Uint8Array(n); let o = 0; for (const b of bagian) { buf.set(b, o); o += b.byteLength; }
  const t = new TextDecoder().decode(buf); periksa(t); return t;
}

const wib = (y, m, d, h, mi) => Math.floor(Date.UTC(y, m, d, h - 7, mi) / 1000);   // WIB (UTC+7) -> detik epoch
const angka = x => (x === null || x === "" || x === undefined || !Number.isFinite(+x)) ? null : +x;
const RESMI = s => /^(Normal|Siaga [123])$/.test(s) ? s : null;

/* SIPANTAU: lokasi[] (ambang, bacaan terakhir) + lokasi_map[] (koordinat). Ambang Siaga 3/2/1 = minimum_3/2/1 (cm; <= 0 = tidak ada). status_resmi MENGIKUTI TEKS sumber, bukan tafsiran kita:
   "Normal" = Normal, "Awas" = Siaga 1, "Siaga" = Siaga <angka siaga> (2 atau 3); sumber memberi angka 4 atau 3 juga untuk "Normal", jadi angkanya saja tidak dipakai. */
export function uraiSipantau(teks) {
  const d = JSON.parse(teks).data, koor = new Map();
  for (const f of d.lokasi_map || []) { const c = f?.geometry?.coordinates; if (f?.data?.id && c) koor.set(f.data.id, [+c[0], +c[1]]); }
  const out = [];
  for (const o of d.lokasi || []) {
    const id = typeof o.id === "string" ? o.id : "", c = koor.get(id), r = o.sensor_record_latest;
    if (!id || id.length > 37 || !c || !DALAM_INDONESIA(c[0], c[1])) continue;
    const s = angka(r?.siaga), tk = r?.siaga_status, am = x => (angka(x) > 0 ? +x : null), m = /^(\d{1,2}) (\w{3}) (\d{4}) (\d{2}):(\d{2})/.exec(r?.tanggal || "");
    out.push({id: "t:" + id, nama: String(o.nama || id), sumber: "SIPANTAU Kota Tangerang", lon: c[0], lat: c[1],
      a3: am(o.minimum_3), a2: am(o.minimum_2), a1: am(o.minimum_1),
      resmi: RESMI(tk) ?? (tk === "Awas" ? "Siaga 1" : tk === "Siaga" && (s === 2 || s === 3) ? "Siaga " + s : null),
      jenis: null, v: angka(r?.ketinggian_air), t: m && m[2] in BULAN ? wib(+m[3], BULAN[m[2]], +m[1], +m[4], +m[5]) : null});
  }
  return out;
}

/* DSDA DKI: onclick="ShowPopup(nama, tinggi_mm, siaga1, siaga2, siaga3, 'lat,lng,nama,tinggi,Status : X,id', daerah)"; mm -> cm; ambang 5000/5000/5000 = placeholder = null;
   tanggal dd/mm/yyyy dan jam hh:mm (WIB) di sel baris yang sama. */
const POPUP = /ShowPopup\(&#39;(.*?)&#39;,&#39;(-?[\d.]+)&#39;,&#39;(-?[\d.]+)&#39;,&#39;(-?[\d.]+)&#39;,&#39;(-?[\d.]+)&#39;,&#39;(.*?)&#39;,/, TGL = />(\d\d)\/(\d\d)\/(\d{4})<\/span>/, JAM = />(\d\d):(\d\d)<\/span>/;
export function uraiDsda(teks) {
  const out = []; let i = teks.indexOf("GridListPintuAir_DXDataRow");
  while (i >= 0) {
    const j = teks.indexOf("GridListPintuAir_DXDataRow", i + 20), p = teks.slice(i, Math.min(j < 0 ? teks.length : j, i + 4000)), a = POPUP.exec(p); i = j;
    if (!a) continue;
    const k = a[6].split(","), lat = +k[0], lon = +k[1], kode = k[k.length - 1].trim(), st = /Status : ([^,]+)/.exec(a[6]);
    if (!/^\d{1,8}$/.test(kode) || !DALAM_INDONESIA(lon, lat)) continue;
    const amb = x => (+x === 5000 ? null : +x / 10), tg = TGL.exec(p), jm = JAM.exec(p);
    const m = tg && jm ? wib(+tg[3], +tg[2] - 1, +tg[1], +jm[1], +jm[2]) : null;
    const nama = a[1].replace(/&amp;/g, "&");
    out.push({id: "d:" + kode, nama, sumber: "DSDA DKI", lon, lat, a3: amb(a[5]), a2: amb(a[4]), a1: amb(a[3]), resmi: RESMI(st?.[1].trim()),
      jenis: /pompa/i.test(nama) ? "pompa" : null, v: +a[2] / 10, t: m});
  }
  return out;
}

const SQL_POS = `INSERT INTO sihka_pos (pos, nama, satuan, tz, dilihat)
  SELECT json_extract(j.value,'$.id'), substr(json_extract(j.value,'$.nama'), 1, 80), 'cm', 'Asia/Jakarta', ?2 FROM json_each(?1) j WHERE true LIMIT 500
  ON CONFLICT(pos) DO UPDATE SET nama = excluded.nama, satuan = 'cm', dilihat = excluded.dilihat`;
const SQL_META = `INSERT INTO sungai_meta (pos, sumber, pengelola, lon, lat, a3, a2, a1, resmi, jenis, diperbarui)
  SELECT json_extract(j.value,'$.id'), json_extract(j.value,'$.sumber'), json_extract(j.value,'$.pengelola'), json_extract(j.value,'$.lon'), json_extract(j.value,'$.lat'),
    json_extract(j.value,'$.a3'), json_extract(j.value,'$.a2'), json_extract(j.value,'$.a1'), json_extract(j.value,'$.resmi'), json_extract(j.value,'$.jenis'), ?2 FROM json_each(?1) j WHERE true LIMIT 500
  ON CONFLICT(pos) DO UPDATE SET sumber = excluded.sumber, pengelola = excluded.pengelola, lon = excluded.lon, lat = excluded.lat, a3 = excluded.a3, a2 = excluded.a2, a1 = excluded.a1,
    resmi = excluded.resmi, jenis = excluded.jenis, diperbarui = excluded.diperbarui`;
/* bacaan: nilai numerik |v| < 1e5, tidak lebih dari 10 menit di masa depan, tidak lebih tua dari 180 hari (retensi); bacaan lama tetap masuk supaya pos yang berhenti melapor jadi 'lama' */
const SQL_BACA = `INSERT OR IGNORE INTO sihka_baca (pos, t, v)
  SELECT json_extract(j.value,'$.id'), json_extract(j.value,'$.t'), json_extract(j.value,'$.v') FROM json_each(?1) j
  WHERE typeof(json_extract(j.value,'$.t')) = 'integer' AND typeof(json_extract(j.value,'$.v')) IN ('integer','real') AND abs(json_extract(j.value,'$.v')) < 1e5
    AND json_extract(j.value,'$.t') <= ?2 + 600 AND json_extract(j.value,'$.t') > ?2 - 180*86400 LIMIT 500`;
const SQL_CATAT = "INSERT INTO cuaca_sumber (kunci, isi, dibuat) VALUES (?1, ?2, ?3) ON CONFLICT(kunci) DO UPDATE SET isi = excluded.isi, dibuat = excluded.dibuat";

async function simpan(env, daftar, detik) {
  const teks = JSON.stringify(daftar.map(p => ({...p, pengelola: PENGELOLA[p.sumber]})));
  await env.DB.batch([env.DB.prepare(SQL_POS).bind(teks, detik), env.DB.prepare(SQL_META).bind(teks, detik), env.DB.prepare(SQL_BACA).bind(teks, detik)]);
}

/* satu sumber: tarik, urai, simpan, catat. Tidak pernah melempar. */
async function satu(env, kunci, url, periksa, urai, kini) {
  try {
    const daftar = urai(await tarikTeks(url, periksa));
    if (!daftar.length) throw new Error("tak ada pos terbaca");
    await simpan(env, daftar, Math.floor(kini / 1000));
    await env.DB.prepare(SQL_CATAT).bind(kunci, JSON.stringify({ok: kini, pos: daftar.length, galat: null}), kini).run();
    return {pos: daftar.length};
  } catch (e) {
    await env.DB.prepare("UPDATE cuaca_sumber SET isi = json_set(coalesce(isi, '{}'), '$.galat', ?) WHERE kunci = ?").bind(String(e.message).slice(0, 200), kunci).run().catch(() => {});
    await env.DB.prepare("INSERT OR IGNORE INTO cuaca_sumber (kunci, isi, dibuat) VALUES (?1, ?2, ?3)").bind(kunci, JSON.stringify({ok: null, galat: String(e.message).slice(0, 200)}), kini).run().catch(() => {});
    return {galat: e.message};
  }
}

export async function perbaruiResmi(env, kini = Date.now()) {
  const bentuk = (re, apa) => t => { if (!re.test(t)) throw new Error("bukan " + apa); };
  const [dsda, tng] = [
    await satu(env, "sungai_dsda", DSDA, bentuk(/GridListPintuAir_DXDataRow/, "halaman posko banjir"), uraiDsda, kini),
    await satu(env, "sungai_tng", SIPANTAU, bentuk(/^\s*\{[\s\S]*"lokasi_map"/, "JSON posduga"), uraiSipantau, kini)];
  return {dsda, tng};
}
