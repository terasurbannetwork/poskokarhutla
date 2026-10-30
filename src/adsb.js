/* Posisi pesawat terbuka per jam (migrasi 0079 adsb_posisi). Sumber: adsb.fi open data v3, nonkomersial, 1 permintaan/detik.
   Data posisi pesawat: adsb.fi (https://adsb.fi). Cron: menit ADSB_MENIT dari dispatcher "* * * * *" (tanpa jadwal baru). Kill switch env.ADSB="mati". */
const JAM = 3600e3, HARI = 24 * JAM, WIB = 7 * JAM;
export const ADSB_MENIT = 46, SIMPAN_HARI = 90, JAM_PANGKAS_UTC = 5, BATAS_BARIS = 500, JEDA_MS = 1100, ALT_MAKS_FT = 10000;
export const LINGKARAN = [   // [wilayah, lat, lon, nm]
  ["riau-jambi", -0.5, 102.0, 250], ["sumsel", -3.0, 104.5, 200], ["kalbar", -0.3, 110.8, 250], ["kalteng", -2.3, 113.9, 250],
  ["kalsel", -3.3, 115.3, 150], ["kaltim", 0.0, 116.5, 250], ["papsel", -7.5, 139.5, 250]];
const tidur = ms => new Promise(r => setTimeout(r, ms));
const HELI = /^(R22|R44|R66|EC\d|AS\d|B06|B407|B412|B429|H\d|S76|S92|S61|MI\d|KA\d|A109|A119|A139|A189|AW\d|BK17|B505|CH\d|UH\d)/i;

export const adalahHeli = a => a.category === "A7" || HELI.test(a.t || "");
/* saring: posisi sah; helikopter selalu; selain itu hanya yang rendah (<= 10.000 kaki atau di darat): penerbangan tinggi tak berguna untuk karhutla */
export function saring(ac, wilayah) {
  const out = [];
  for (const a of ac || []) {
    if (!/^[0-9a-f]{6}$/i.test(a.hex || "") || !Number.isFinite(a.lat) || !Number.isFinite(a.lon)) continue;
    const heli = adalahHeli(a) ? 1 : 0, alt = a.alt_baro === "ground" ? 0 : Number.isFinite(a.alt_baro) ? Math.round(a.alt_baro) : null;
    if (!heli && alt !== null && alt > ALT_MAKS_FT) continue;
    out.push({hex: a.hex.toLowerCase(), wilayah, lat: a.lat, lon: a.lon, alt, gs: Number.isFinite(a.gs) ? a.gs : null, heli, flight: (a.flight || "").trim().slice(0, 8) || null, tipe: (a.t || "").slice(0, 8) || null});
  }
  return out;
}
/* gabung: satu baris per hex (pertama menang, helikopter mengalahkan), helikopter dulu, maksimum BATAS_BARIS */
export function gabung(daftar) {
  const per = new Map();
  for (const p of daftar.flat()) if (!per.has(p.hex) || (p.heli && !per.get(p.hex).heli)) per.set(p.hex, p);
  return [...per.values()].sort((a, b) => b.heli - a.heli).slice(0, BATAS_BARIS);
}

export async function panenAdsb(env, kini = Date.now(), {jeda = JEDA_MS} = {}) {
  if (env.ADSB === "mati") return {lewat: "mati"};
  const menit = Math.floor(kini / JAM) * JAM, hasil = [], galat = [];
  for (let i = 0; i < LINGKARAN.length; i++) {
    const [w, lat, lon, nm] = LINGKARAN[i];
    if (i) await tidur(jeda);
    try {
      const r = await fetch(`https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${nm}`, {headers: {accept: "application/json"}});
      if (r.status === 429) { galat.push(w + ":429"); break; }   // dibatasi: berhenti, jangan menekan sumber
      if (!r.ok) { galat.push(`${w}:${r.status}`); continue; }
      hasil.push(saring((await r.json()).ac, w));
    } catch (e) { galat.push(w + ":" + String(e?.message || e).slice(0, 40)); }
  }
  const baris = gabung(hasil);
  if (baris.length) {
    const sql = "INSERT OR IGNORE INTO adsb_posisi (hex, menit, wilayah, lat, lon, alt, gs, heli, flight, tipe) VALUES (?,?,?,?,?,?,?,?,?,?)";
    await env.DB.batch(baris.map(p => env.DB.prepare(sql).bind(p.hex, menit, p.wilayah, p.lat, p.lon, p.alt, p.gs, p.heli, p.flight, p.tipe)));
  }
  return {baris: baris.length, heli: baris.filter(p => p.heli).length, galat};
}

/* ringkas per tanggal WIB: (wilayah, hex) -> jam WIB hadir + n_jam */
export async function ringkasHarian(env, tanggal) {   // tanggal "YYYY-MM-DD" WIB
  const awal = Date.parse(tanggal + "T00:00:00Z") - WIB;
  const {results} = await env.DB.prepare("SELECT hex, wilayah, MAX(heli) heli, MAX(tipe) tipe, group_concat(menit) jam FROM adsb_posisi WHERE menit >= ? AND menit < ? GROUP BY wilayah, hex ORDER BY heli DESC, hex").bind(awal, awal + HARI).all();
  return results.map(r => { const j = r.jam.split(",").map(m => new Date(+m + WIB).getUTCHours()).sort((a, b) => a - b); return {tanggal, wilayah: r.wilayah, hex: r.hex, heli: r.heli, tipe: r.tipe, jam: j, n_jam: j.length}; });
}

export async function bersihkanAdsb(env, kini = Date.now(), {paksa = false} = {}) {
  if (!paksa && new Date(kini).getUTCHours() !== JAM_PANGKAS_UTC) return {lewat: "bukan jamnya"};
  const r = await env.DB.prepare("DELETE FROM adsb_posisi WHERE menit < ?").bind(kini - SIMPAN_HARI * HARI).run();
  return {dihapus: r.meta?.changes ?? 0};
}
