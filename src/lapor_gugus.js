/* Gugus laporan Lapor Bencana (TIKET LA-24, KEPUTUSAN D27-D30, ALGORITMA A9). Fungsi murni tanpa D1: dipakai server tinjau lokal
   (scripts/lapor/lokal.mjs) dan nanti rute Worker /api/lapor/meja. Ambang = tabel HIPOTESIS A9 (Q18, disetujui sebagai bawaan K52).
   Gugus = laporan berjenis sama yang berdekatan waktu dan tempat dari paling sedikit dua nomor pelapor berbeda; angka dampak TIDAK dijumlah (D28).
   ponytail: pasangan dicari O(n²) per jenis; cukup untuk ribuan laporan aktif di meja. Ganti ke indeks (jenis, waktu) di D1 saat F1. */

export const GUGUS_ATURAN = {
  banjir: {mode: "lokal", km: 3, jam: 6}, longsor: {mode: "lokal", km: 3, jam: 6}, kebakaran_gedung: {mode: "lokal", km: 3, jam: 6},
  cuaca: {mode: "lokal", km: 5, jam: 6}, karhutla: {mode: "lokal", km: 5, jam: 12},
  gempa: {mode: "luas", jam: 12}, erupsi: {mode: "luas", jam: 12}, tsunami: {mode: "luas", jam: 12},
  // kekeringan, abrasi: berlangsung berhari-hari, tidak dihitung sampai Q18 dijawab
};

const km = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const median = xs => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const tglWIB = ms => { const d = new Date(ms + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCFullYear()).slice(2)}`; };

/* laporan: [{nomor, jenis, lat, lon, kab, desa, t (ms waktu kejadian), wa, fotoSah (bool), status}]
   hasil: {gugus: [{kode, label, anggota: [nomor], n_laporan, n_pelapor, pusat: {lat, lon}, radius_km, mulai, akhir}], per: {nomor: kode}} */
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

/* ---------- kejadian yang sama, ditawarkan saat melapor (KEPUTUSAN K66, D103-D107, ALGORITMA A9) ----------
   laporan: [{nomor, jenis, subjenis, wilayah: {kode, kec}, ref (ms: waktu kejadian atau kirim, yang lebih baru), status, n (jumlah warga di kejadiannya, 1 bila belum), kejadian (kode KJ atau null), waktu: {nilai, ms}|null}]
   Kecamatan sama (kode desa berawalan kode kecamatan), status bukan tidak_valid/selesai, dalam jendela jenisnya (GUGUS_ATURAN.jam; jenis tanpa aturan 72 jam).
   Paling banyak 3, satu per jenis, terbaru dulu. Tanpa nama, nomor WA, atau isi laporan di hasil (D104). */
export const JENDELA_JENIS_JAM = 72, MAKS_KANDIDAT = 3;
export function kandidatKejadian(laporan, {kecKode, kini}) {
  if (!kecKode) return [];
  const per = new Map();
  for (const l of laporan) {
    if (!l.jenis || !String(l.wilayah?.kode || "").startsWith(kecKode) || ["tidak_valid", "selesai"].includes(l.status) || !Number.isFinite(l.ref)) continue;
    if (kini - l.ref > (GUGUS_ATURAN[l.jenis]?.jam ?? JENDELA_JENIS_JAM) * 3600e3) continue;
    if (!per.has(l.jenis) || l.ref > per.get(l.jenis).ref) per.set(l.jenis, l);
  }
  return [...per.values()].sort((a, b) => b.ref - a.ref).slice(0, MAKS_KANDIDAT);
}
/* KJ-ddmmyy-NN dari tanggal WIB laporan induk */
export const tglKejadian = tglWIB;
export const kodeKejadian = (ms, n) => `KJ-${tglWIB(ms)}-${String(n).padStart(2, "0")}`;
export const RE_KJ = /^KJ-\d{6}-\d{2,3}$/;
