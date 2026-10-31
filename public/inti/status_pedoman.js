/* Fungsi murni status darurat menurut Pedoman Penetapan Status Keadaan Darurat Bencana (BNPB 2016): dipakai /semua/darurat.js dan profil_wilayah.js.
   Tanpa DOM, tanpa fetch: uji di tests/agen/status-pedoman.test.mjs. */
export const SUMBER_PEDOMAN = "Pedoman Penetapan Status Keadaan Darurat Bencana BNPB 2016";
export const TEKS_LEWAT = "Lewat masa pedoman (maks 14 hari kab, 1 bulan prov), perlu SK perpanjangan";
export const berlaku = (k, h) => !!k.mulai && k.mulai <= h && (!k.berakhir || k.berakhir >= h);
/* "11.12" atau "1112" -> "1112" */
export const kode4 = s => String(s ?? "").replace(/\D/g, "");
export const sisaHari = (k, h) => k.berakhir && berlaku(k, h) ? Math.round((new Date(k.berakhir + "T12:00:00Z") - new Date(h + "T12:00:00Z")) / 864e5) : null;
/* SK yang berlaku pada hari h untuk kab (kode4): SK kabupaten, lalu SK provinsi induknya; urut tanggal berakhir */
export function skBerlaku(sk, kode, h) {
  const kd = kode4(kode), pr = kd.slice(0, 2);
  return (Array.isArray(sk) ? sk : []).filter(k => berlaku(k, h) && (k.skala === "provinsi" || !k.kab_kode ? kode4(k.prov_kode) === pr : kode4(k.kab_kode) === kd))
    .sort((a, b) => (a.skala === "provinsi") - (b.skala === "provinsi") || String(a.berakhir || "9999").localeCompare(String(b.berakhir || "9999")));
}
const SIAGA = ["Kaji cepat", "Aktivasi sistem komando dan rencana operasi dari rencana kontinjensi", "Evakuasi warga yang terancam", "Pemenuhan kebutuhan dasar", "Perlindungan kelompok rentan", "Pengendalian sumber ancaman"];
export const TINDAKAN = {
  "Siaga Darurat": SIAGA,
  "Tanggap Darurat": [...SIAGA, "Penyelamatan korban dan pengungsi", "Perbaikan prasarana vital"],
  "Transisi Darurat ke Pemulihan": ["Kaji cepat", "Sistem komando tetap aktif", "Pemenuhan kebutuhan dasar", "Perlindungan kelompok rentan", "Pengendalian sumber ancaman", "Perbaikan prasarana vital", "Perbaikan awal sosial ekonomi"]
};
export const HAL_TINDAKAN = "hal. 8-9";
/* daftar tindakan untuk status (kunci tak dikenal = daftar kosong) */
export const tindakan = status => TINDAKAN[status] || [];
export const TENGGAT = ["Rapat koordinasi paling lambat 24 jam setelah hasil kaji cepat", "SK ditetapkan paling lambat 24 jam setelah rekomendasi rapat koordinasi"];
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const bagi = t => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(t ?? "")); return m ? [+m[1], +m[2] - 1, +m[3]] : null; };
/* "2026-10-12" -> "12 Okt 2026"; bukan tanggal = "" */
export const tglID = t => { const b = bagi(t); return b ? `${b[2]} ${BLN[b[1]]} ${b[0]}` : ""; };
/* tanggal ISO di dalam teks bebas diganti tanggal Indonesia (tak ada ISO tampil di layar) */
export const rapiTanggal = t => String(t ?? "").replace(/\d{4}-\d{2}-\d{2}/g, m => tglID(m) || m);
/* "12 sampai 19 Okt 2026"; "" bila salah satu ujung tak ada */
export function rentang(a, b) {
  const x = bagi(a), y = bagi(b); if (!x || !y) return "";
  if (a.slice(0, 10) === b.slice(0, 10)) return tglID(a);
  return x[0] === y[0] && x[1] === y[1] ? `${x[2]} sampai ${tglID(b)}` : x[0] === y[0] ? `${x[2]} ${BLN[x[1]]} sampai ${tglID(b)}` : `${tglID(a)} sampai ${tglID(b)}`;
}
/* "Saran status hari ini" hanya bila sinyal_sampai = hari WIB; selain itu rentang sinyal */
export function labelSaran(S, h) {
  const r = rentang(S?.sinyal_dari, S?.sinyal_sampai);
  return S?.sinyal_sampai && String(S.sinyal_sampai).slice(0, 10) === h ? "Saran status hari ini" : r ? `Saran status (sinyal ${r})` : "Saran status";
}
/* hitung saran untuk judul: entri basi tidak dihitung; hipotesis dipisah. baris = [{kd, hipotesis, basi}] */
export function hitungSaran(baris) {
  const b = baris.filter(x => !x.basi), h = b.filter(x => x.hipotesis), t = b.filter(x => !x.hipotesis);
  const kab = a => new Set(a.map(x => x.kd)).size;
  return {tanpa: t.length, hip: h.length, kabTanpa: kab(t), kabHip: kab(h), basi: baris.length - b.length};
}
export function judulSaran(c, fmt) {
  const p = [];
  if (c.tanpa) p.push(`${fmt(c.tanpa)} saran tanpa hipotesis di ${fmt(c.kabTanpa)} kab/kota`);
  if (c.hip) p.push(`${fmt(c.hip)} hipotesis kekeringan di ${fmt(c.kabHip)} kab/kota`);
  return p.join(" dan ");
}
/* kalimat bila tak ada SK berlaku; tahun dari status_darurat.json, h = tanggal WIB ISO, tg = format tanggal layar */
export function kalimatTanpaSK(nama, tahun, h, tg) {
  const t = Array.isArray(tahun) && tahun.length ? tahun.at(-1) : null, ini = +String(h).slice(0, 4);
  return `Tidak ada SK${t ? ` di data BNPB ${t}` : " di data BNPB"} yang berlaku untuk ${nama} pada ${tg(h)}.${t && ini > t ? ` Data ${ini} belum masuk.` : ""}`;
}
/* kalimat ringkas satu baris dari akar "ringkas" status_darurat.json; null bila tak ada */
export function kalimatRingkas(r, fmt) {
  if (!r || r.kab_total == null) return null;
  const jeda = r.jeda_median_hari == null ? "" : `, jeda median ${fmt(r.jeda_median_hari)} hari${r.jeda_n != null ? ` dari ${fmt(r.jeda_n)} SK yang punya pasangan kejadian DIBI` : " dari kejadian ke SK"}`;
  return `${fmt(r.kab_lewat_batas)} dari ${fmt(r.kab_total)} SK kabupaten/kota lewat batas 14 hari, ${fmt(r.prov_lewat_batas)} dari ${fmt(r.prov_total)} SK provinsi lewat batas 1 bulan${jeda}`;
}
