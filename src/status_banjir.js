/* Status banjir per kecamatan dari aset publik /banjir/data/status.json (pipeline scripts/banjir): dipakai push 3-jam (push.js) dan uji lapangan banjir (uji_banjir.js).
   Bentuk: {hari: [YYYY-MM-DD x N], kec: {"prov|kab|kec": {b: [level hari ke-0, ke-1, ...]}}}; level 0 Aman, 1 Waspada, 2 Siaga, 3 Awas. Murni baca; tanpa data pribadi. */
export const NAMA_STATUS = ["Aman", "Waspada", "Siaga", "Awas"];
const HARI = 864e5, RE_TGL = /^\d{4}-\d\d-\d\d$/;
const wibTgl = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
/* null bila berkas hilang, rusak, atau hari ke-0 lebih dari `umurMaks` hari dari sekarang (WIB): kiriman dari data basi lebih buruk daripada tidak mengirim */
export async function bacaStatusBanjir(env, kini, umurMaks = 2) {
  let d;
  try { const r = await env.ASSETS.fetch(new Request("https://aset.lokal/banjir/data/status.json")); if (!r.ok) { r.body?.cancel(); return null; } d = await r.json(); } catch (e) { return null; }
  if (!d || !Array.isArray(d.hari) || !RE_TGL.test(d.hari[0]) || !d.kec || typeof d.kec !== "object" || Array.isArray(d.kec)) return null;
  if (Math.abs(Date.parse(wibTgl(kini)) - Date.parse(d.hari[0])) > umurMaks * HARI) return null;
  return {hari: d.hari[0], kec: d.kec};
}
export const levelKec = v => Array.isArray(v?.b) && Number.isInteger(v.b[0]) && v.b[0] >= 0 && v.b[0] <= 3 ? v.b[0] : null;
