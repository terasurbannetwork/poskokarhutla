/* Salinan beku hitungGugus sebelum aturan satu desa (lapor-kejadian LK-01), dari src/lapor_gugus.js commit sebelum LK-01.
   Hanya untuk uji emas tests/lapor/gugus_desa.test.mjs: keluaran baru harus identik untuk masukan tanpa desa sama di luar jendela lama dan tanpa rantai di atas 72 jam.
   Jangan disunting. */
import {GUGUS_ATURAN} from "../../../src/lapor_gugus.js";
const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const tglWIB = ms => { const d = new Date(ms + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCFullYear()).slice(2)}`; };
export function hitungGugus(laporan) {
  const sah = laporan.filter(l => GUGUS_ATURAN[l.jenis] && l.status !== "tidak_valid" && Number.isFinite(l.t));
  const induk = new Map(sah.map(l => [l.nomor, l.nomor])), akar = n => { while (induk.get(n) !== n) { induk.set(n, induk.get(induk.get(n))); n = induk.get(n); } return n; };
  const dekat = (a, b) => {
    const A = GUGUS_ATURAN[a.jenis]; if (a.jenis !== b.jenis || Math.abs(a.t - b.t) > A.jam * 3600e3) return false;
    if (A.mode === "luas") return !!a.kab && a.kab === b.kab;
    if (a.lat != null && b.lat != null && km(a.lat, a.lon, b.lat, b.lon) <= A.km) return true;
    return !!a.desa && a.desa === b.desa;   // lokasi tingkat desa tanpa titik tetap cocok bila desanya sama
  };
  for (let i = 0; i < sah.length; i++) for (let j = i + 1; j < sah.length; j++) if (dekat(sah[i], sah[j])) induk.set(akar(sah[i].nomor), akar(sah[j].nomor));
  const kumpul = new Map(); for (const l of sah) { const k = akar(l.nomor); kumpul.set(k, [...(kumpul.get(k) || []), l]); }
  // dua laporan dari satu nomor tidak mendirikan gugus (A9 langkah 4)
  const jadi = [...kumpul.values()].filter(xs => new Set(xs.map(x => x.wa)).size >= 2).map(xs => {
    const titik = xs.filter(x => x.lat != null), pusat = titik.length ? {lat: median(titik.map(x => x.lat)), lon: median(titik.map(x => x.lon))} : null;
    const nPelapor = new Set(xs.map(x => x.wa)).size, fotoBeda = new Set(xs.filter(x => x.fotoSah).map(x => x.wa)).size;
    return {anggota: xs.sort((a, b) => a.t - b.t).map(x => x.nomor), jenis: xs[0].jenis, n_laporan: xs.length, n_pelapor: nPelapor, pusat,
      radius_km: pusat ? Math.max(0.3, ...titik.map(x => km(pusat.lat, pusat.lon, x.lat, x.lon))) : null, mulai: Math.min(...xs.map(x => x.t)), akhir: Math.max(...xs.map(x => x.t)),
      label: nPelapor >= 3 || fotoBeda >= 2 ? "gugus kuat" : "gugus"};   // kata "terverifikasi" tidak dipakai
  }).sort((a, b) => a.mulai - b.mulai);
  const urut = new Map(); for (const g of jadi) { const d = tglWIB(g.mulai), n = (urut.get(d) || 0) + 1; urut.set(d, n); g.kode = `GL-${d}-${String(n).padStart(2, "0")}`; }
  return {gugus: jadi, per: Object.fromEntries(jadi.flatMap(g => g.anggota.map(n => [n, g.kode])))};
}

