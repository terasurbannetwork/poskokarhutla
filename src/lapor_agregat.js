/* Data terbuka agregat Lapor Bencana (KEPUTUSAN-LAPOR-AI K62, D91-D93). Fungsi murni: server lokal sekarang, pipeline harian ke R2 nanti (LA-64).
   Baris = (kab/kota, jenis, minggu ISO WIB). Tanpa nomor tiket, desa, koordinat, teks, foto, nama, atau nomor WA.
   Sel dengan kurang dari BATAS_SEL pelapor berbeda ditulis "<3" dan rinciannya dikosongkan supaya pelapor di kab sepi tidak bisa ditebak (Q52).
   Selisih dengan data resmi (D92) baru terisi sesudah laporan ditempel ke Buku Besar (LA-25): sampai itu "belum tersedia", tidak pernah nol. */

export const BATAS_SEL = 3;
export const KOLOM = [
  ["minggu", "Minggu ISO (WIB), mis. 2026-W47"], ["prov_kode", "Kode provinsi Kemendagri"], ["provinsi", "Nama provinsi"], ["kab_kode", "Kode kab/kota Kemendagri"],
  ["kab_kota", "Nama kab/kota"], ["jenis", "Jenis bencana yang dilaporkan warga"], ["laporan", "Jumlah laporan terkirim"], ["pelapor", "Jumlah nomor pelapor berbeda"],
  ["berfoto_sah", "Laporan dengan foto atau video berlokasi GPS atau metadata"], ["tidak_valid", "Laporan yang dinilai petugas tidak dapat ditindaklanjuti"],
  ["median_menit_lapor", "Median menit dari waktu kejadian sampai laporan terkirim (hanya laporan dengan waktu kejadian)"],
  ["selisih_resmi_menit", "Median menit laporan warga pertama lebih awal (+) atau lebih lambat (-) dari catatan resmi pertama kejadian yang sama"],
];

const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2); };
export function mingguIso(ms) { // minggu ISO 8601 pada tanggal WIB
  const d = new Date(ms + 7 * 3600e3), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const hari = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - hari);
  const awal = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)), n = Math.ceil(((t - awal) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(n).padStart(2, "0")}`;
}

/* laporan: [{provKode, prov, kabKode, kab, jenis, kejadian (ms|null), terkirim (ms), wa, fotoSah, status}]. Tanpa kabKode tidak dihitung. */
export function agregat(laporan) {
  const grup = new Map();
  for (const l of laporan) {
    if (!l.kabKode || !l.terkirim || !l.jenis) continue;
    const k = `${mingguIso(l.kejadian ?? l.terkirim)}|${l.kabKode}|${l.jenis}`;
    if (!grup.has(k)) grup.set(k, {minggu: k.split("|")[0], prov_kode: l.provKode, provinsi: l.prov, kab_kode: l.kabKode, kab_kota: l.kab, jenis: l.jenis, xs: []});
    grup.get(k).xs.push(l);
  }
  return [...grup.values()].sort((a, b) => a.minggu.localeCompare(b.minggu) || a.kab_kode.localeCompare(b.kab_kode) || a.jenis.localeCompare(b.jenis)).map(({xs, ...g}) => {
    const pelapor = new Set(xs.map(x => x.wa)).size;
    if (pelapor < BATAS_SEL) return {...g, laporan: `<${BATAS_SEL}`, pelapor: `<${BATAS_SEL}`, berfoto_sah: null, tidak_valid: null, median_menit_lapor: null, selisih_resmi_menit: "belum tersedia"};
    const jeda = xs.filter(x => x.kejadian != null && x.terkirim >= x.kejadian).map(x => (x.terkirim - x.kejadian) / 6e4);
    return {...g, laporan: xs.length, pelapor, berfoto_sah: xs.filter(x => x.fotoSah).length, tidak_valid: xs.filter(x => x.status === "tidak_valid").length,
      median_menit_lapor: median(jeda), selisih_resmi_menit: "belum tersedia"};
  });
}

export function keCsv(baris) {
  const sel = v => v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
  return [KOLOM.map(([k]) => k).join(","), ...baris.map(b => KOLOM.map(([k]) => sel(b[k])).join(","))].join("\n") + "\n";
}
