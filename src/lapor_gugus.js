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

/* aturan satu desa dan batas rantai (lapor-kejadian A1, K85, D2, D3; konstanta HIPOTESIS menunggu data F0, bawaan Q1, Q2, Q3):
   dua laporan jenis lokal di kode desa yang sama tersambung bila selisih waktunya paling lama JENDELA_DESA_JAM, walau di luar jendela jenis;
   komponen yang lebih panjang dari RANTAI_MAKS_JAM dipotong di celah waktu terbesar. Kekeringan dan abrasi tetap tidak dihitung (Q3). */
export const JENDELA_DESA_JAM = 24, RANTAI_MAKS_JAM = 72;

/* laporan: [{nomor, jenis, lat, lon, kab, desa, t (ms waktu kejadian), wa, fotoSah (bool), status}]
   hasil: {gugus: [{kode, label, anggota: [nomor], n_laporan, n_pelapor, pusat: {lat, lon}, radius_km, mulai, akhir, satu_desa}], per: {nomor: kode}}
   satu_desa = gugus ini hanya tersambung karena aturan satu desa (tanpa sambungan itu anggotanya terpecah): chip "satu desa" di meja (DESIGN-SYSTEM 3). */
export function hitungGugus(laporan) {
  const sah = laporan.filter(l => GUGUS_ATURAN[l.jenis] && l.status !== "tidak_valid" && Number.isFinite(l.t));
  const uf = () => { const induk = new Map(sah.map(l => [l.nomor, l.nomor])), akar = n => { while (induk.get(n) !== n) { induk.set(n, induk.get(induk.get(n))); n = induk.get(n); } return n; };
    return {akar, satukan: (a, b) => induk.set(akar(a), akar(b))}; };
  const dekat = (a, b) => {   // aturan lama A9, tidak berubah
    const A = GUGUS_ATURAN[a.jenis]; if (a.jenis !== b.jenis || Math.abs(a.t - b.t) > A.jam * 3600e3) return false;
    if (A.mode === "luas") return !!a.kab && a.kab === b.kab;
    if (a.lat != null && b.lat != null && km(a.lat, a.lon, b.lat, b.lon) <= A.km) return true;
    return !!a.desa && a.desa === b.desa;   // lokasi tingkat desa tanpa titik tetap cocok bila desanya sama
  };
  const satuDesa = (a, b) => a.jenis === b.jenis && GUGUS_ATURAN[a.jenis].mode === "lokal" && !!a.desa && a.desa === b.desa && Math.abs(a.t - b.t) <= JENDELA_DESA_JAM * 3600e3;
  const semua = uf(), lama = uf();
  for (let i = 0; i < sah.length; i++) for (let j = i + 1; j < sah.length; j++) {
    const a = sah[i], b = sah[j];
    if (dekat(a, b)) { semua.satukan(a.nomor, b.nomor); lama.satukan(a.nomor, b.nomor); } else if (satuDesa(a, b)) semua.satukan(a.nomor, b.nomor);
  }
  const kumpul = new Map(); for (const l of sah) { const k = semua.akar(l.nomor); kumpul.set(k, [...(kumpul.get(k) || []), l]); }
  // rantai (A1 butir 3): komponen lebih panjang dari RANTAI_MAKS_JAM dipotong di celah waktu terbesar, berulang sampai semua potongan pendek
  const potong = xs => { const u = [...xs].sort((a, b) => a.t - b.t); if (u.at(-1).t - u[0].t <= RANTAI_MAKS_JAM * 3600e3) return [u];
    let c = 1; for (let i = 2; i < u.length; i++) if (u[i].t - u[i - 1].t > u[c].t - u[c - 1].t) c = i; return [...potong(u.slice(0, c)), ...potong(u.slice(c))]; };
  // dua laporan dari satu nomor tidak mendirikan gugus (A9 langkah 4)
  const jadi = [...kumpul.values()].flatMap(potong).filter(xs => new Set(xs.map(x => x.wa)).size >= 2).map(xs => {
    const titik = xs.filter(x => x.lat != null), pusat = titik.length ? {lat: median(titik.map(x => x.lat)), lon: median(titik.map(x => x.lon))} : null;
    const nPelapor = new Set(xs.map(x => x.wa)).size, fotoBeda = new Set(xs.filter(x => x.fotoSah).map(x => x.wa)).size;
    return {anggota: xs.map(x => x.nomor), jenis: xs[0].jenis, n_laporan: xs.length, n_pelapor: nPelapor, pusat,
      radius_km: pusat ? Math.max(0.3, ...titik.map(x => km(pusat.lat, pusat.lon, x.lat, x.lon))) : null, mulai: Math.min(...xs.map(x => x.t)), akhir: Math.max(...xs.map(x => x.t)),
      label: nPelapor >= 3 || fotoBeda >= 2 ? "gugus kuat" : "gugus",   // kata "terverifikasi" tidak dipakai
      satu_desa: new Set(xs.map(x => lama.akar(x.nomor))).size > 1};
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
