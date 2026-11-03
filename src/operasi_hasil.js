/* Monitoring operasi udara (migrations/0106_operasi_monitor.sql): hasil tiap aksi dinilai dari titik panas FIRMS, foto grup satgas diindeks lalu dipasangkan ke aksi.
   TIDAK mengimpor worker.js: dipanggil src/titik.js (cron FIRMS) dan src/wa.js, jadi tak boleh membuat siklus impor.
   Padam = tak ada titik panas <= 1 km dalam 24 jam sesudah waktu aksi. Hanya putaran FIRMS terakhir yang disimpan, jadi penilaian BERTAHAP: tiap putaran 3 jam memeriksa aksi 48 jam terakhir.
   ponytail: tak menunggu keterlambatan NRT FIRMS (<= 3 jam) sebelum menyatakan padam; naikkan jendela ke 27 jam bila ada padam yang menyala lagi. */
import {registrasi, uraiStempel} from "./operasi_wa.js";
import {jarakKm} from "./operasi_nilai.js";

const JAM = 36e5, KM_PADAM = 1, JENDELA_NILAI = 24 * JAM, MAKS_OCR = 700e3, MAKS_NILAI = 200;
export const GUNA_PERAN = {wb: "wb", omc: "omc", patroli: "patroli", patroli_wb: "patroli"};
const OPERASIONAL = new Set(["wb", "omc", "patroli"]);
/* misi gerak (atau peran armada bila misi kosong) -> guna aksi; mobilisasi/demobilisasi/ferry bukan aksi (null) */
export const gunaAksi = (misi, peran) => { const m = String(misi ?? "").toLowerCase(); return OPERASIONAL.has(m) ? m : m ? null : GUNA_PERAN[peran] ?? null; };
const hariWib = ms => new Date(ms + 7 * JAM).toISOString().slice(0, 10);
const tanpaTabel = e => /no such table: op_/i.test(String(e?.message || e));

/* putaran FIRMS (isi titik_terbaru) -> [{lat, lon, t}] */
export const titikDariPutaran = isi => { const acuan = Date.parse(isi.acuan); return (isi.baris || []).map(b => ({lat: b[0], lon: b[1], t: acuan + b[2] * JAM})); };

/* titik: [{lat, lon, t}] dari putaran FIRMS yang baru masuk. Aksi wb berkoordinat, waktu 48 jam terakhir, belum final: masih_api bila ada titik <= 1 km dalam [t0, t0+24 jam]; padam bila 24 jam sudah lewat tanpa titik. */
export async function nilaiAksi(env, titik, kini) {
  let baris; try {
    baris = (await env.DB.prepare(`SELECT g.id, g.jam_utc, g.lat, g.lon, g.misi, a.peran FROM op_gerak g LEFT JOIN op_armada a ON a.registrasi = g.registrasi LEFT JOIN op_gerak_hasil h ON h.gerak_id = g.id
      WHERE g.jenis = 'berangkat' AND g.jam_utc >= ?1 AND g.jam_utc <= ?2 AND g.lat IS NOT NULL AND h.hasil IS NULL ORDER BY g.jam_utc LIMIT ${MAKS_NILAI}`).bind(kini - 48 * JAM, kini).all()).results;
  } catch (e) { if (tanpaTabel(e)) return null; throw e; }
  const st = []; let padam = 0, masih = 0;
  for (const g of baris.filter(g => gunaAksi(g.misi, g.peran) === "wb")) {
    const t1 = g.jam_utc + JENDELA_NILAI;
    const n = titik.filter(p => p.t >= g.jam_utc && p.t <= t1 && Math.abs(p.lat - g.lat) < 0.02 && Math.abs(p.lon - g.lon) < 0.02 && jarakKm(p.lat, p.lon, g.lat, g.lon) <= KM_PADAM).length;
    if (!n && kini < t1) continue;   // masih menunggu
    st.push(env.DB.prepare("INSERT INTO op_gerak_hasil (gerak_id, hasil, dicek, titik_dekat) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (gerak_id) DO UPDATE SET hasil = ?2, dicek = ?3, titik_dekat = ?4").bind(g.id, n ? "masih_api" : "padam", kini, n));
    n ? masih++ : padam++;
  }
  if (st.length) await env.DB.batch(st);
  return {diperiksa: baris.length, padam, masih_api: masih};
}

/* Workers AI membaca stempel di foto. Gagal/tak ada AI/foto terlalu besar = null (foto tetap disimpan). ponytail: array byte besar memakan CPU, batas 700 KB; pindahkan ke cron bila foto resmi lebih besar. */
export async function bacaStempel(env, bytes) {
  if (typeof env.AI?.run !== "function" || bytes.length > MAKS_OCR) return null;
  try {
    const r = await Promise.race([env.AI.run("@cf/llava-hf/llava-1.5-7b-hf", {image: [...bytes], max_tokens: 200,
      prompt: "Transcribe exactly the white text overlay (date, time, GPS coordinates, aircraft registration) printed on this photo. Output only the text."}),
      new Promise((_, no) => setTimeout(() => no(new Error("batas waktu OCR")), 20000))]);
    const teks = typeof r === "string" ? r : r?.description ?? r?.response ?? "";
    return String(teks).slice(0, 600) || null;
  } catch (e) { console.error("operasi_foto ocr", String(e?.message || e).slice(0, 120)); return null; }
}

/* foto grup: indeks di op_foto (berkas R2 sudah disimpan pemanggil di wa_masuk). Galat tabel (0106 belum ada) dilempar ke pemanggil yang menelannya. */
export async function simpanFoto(env, {waId, bytes, diterima, teks}) {
  const armada = (await env.DB.prepare("SELECT registrasi FROM op_armada").all()).results.map(r => r.registrasi);
  const stempel = bytes ? await bacaStempel(env, bytes) : null, s = uraiStempel(stempel, {armada, diterima});
  const reg = s.registrasi ?? (teks ? registrasi(teks, armada) : null);
  const r = await env.DB.prepare("INSERT OR IGNORE INTO op_foto (wa_id, diterima, tanggal, registrasi, jam_utc, lat, lon, stempel) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
    .bind(waId, diterima, hariWib(s.jam_utc ?? diterima), reg, s.jam_utc, s.lat, s.lon, stempel).run();
  await lengkapi(env, diterima);
  return {id: r.meta.last_row_id, registrasi: reg, jam_utc: s.jam_utc, lat: s.lat, lon: s.lon};
}

const segmen = s => String(s ?? "").split(",")[0].toLowerCase().replace(/\s+/g, " ").trim();
/* melengkapi aksi 3 hari terakhir: (1) foto tak berpasangan -> aksi berangkat registrasi sama dalam +-3 jam; koordinat aksi yang kosong diambil dari foto;
   (2) aksi yang masih tanpa koordinat -> temuan hari yang sama dengan nama lokasi (segmen pertama) sama. Aman dipanggil berulang. */
export async function lengkapi(env, kini) {
  const sejak = hariWib(kini - 3 * 864e5), Q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then(r => r.results), st = [];
  const [foto, gerak] = await Promise.all([
    Q("SELECT id, registrasi, coalesce(jam_utc, diterima) jam, lat, lon FROM op_foto WHERE gerak_id IS NULL AND registrasi IS NOT NULL AND tanggal >= ?", sejak),
    Q("SELECT id, tanggal, registrasi, jam_utc, lat, lon, lokasi FROM op_gerak WHERE jenis = 'berangkat' AND jam_utc IS NOT NULL AND tanggal >= ? ORDER BY jam_utc LIMIT 1000", sejak)]);
  const ambilKoordinat = (g, lat, lon, sumber) => {
    g.lat = lat; g.lon = lon;
    st.push(env.DB.prepare("UPDATE op_gerak SET lat = ?2, lon = ?3 WHERE id = ?1").bind(g.id, lat, lon),
      env.DB.prepare("INSERT INTO op_gerak_hasil (gerak_id, sumber_lokasi) VALUES (?1, ?2) ON CONFLICT (gerak_id) DO UPDATE SET sumber_lokasi = ?2").bind(g.id, sumber));
  };
  for (const f of foto) {
    let g = null; for (const c of gerak) if (c.registrasi === f.registrasi && Math.abs(c.jam_utc - f.jam) <= 3 * JAM && (!g || Math.abs(c.jam_utc - f.jam) < Math.abs(g.jam_utc - f.jam))) g = c;
    if (!g) continue;
    st.push(env.DB.prepare("UPDATE op_foto SET gerak_id = ?2 WHERE id = ?1").bind(f.id, g.id));
    if (g.lat == null && f.lat != null) ambilKoordinat(g, f.lat, f.lon, "foto");
  }
  const tanpa = gerak.filter(g => g.lat == null && g.lokasi);
  if (tanpa.length) {
    const tem = await Q("SELECT tanggal, lat, lon, lokasi FROM op_temuan WHERE tanggal >= ? AND lokasi IS NOT NULL", sejak);
    for (const g of tanpa) { const k = segmen(g.lokasi), t = k.length >= 4 && tem.find(x => x.tanggal === g.tanggal && segmen(x.lokasi) === k); if (t) ambilKoordinat(g, t.lat, t.lon, "temuan"); }
  }
  if (st.length) await env.DB.batch(st);
  return st.length;
}
