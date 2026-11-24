/* LJ-16: bagian layar meja dampak untuk catatan milik berkas Data lanjutan BPBD (kunci sistem lapor_* di data catatan).
   Fungsi murni, tanpa DOM: dipakai meja.js dan diuji di tests/bnpb/meja_lapor.test.mjs. Server (src/meja.js) yang memutuskan; layar hanya menampilkan. */
const ada = v => v != null && v !== "";
const lab = (kolom, n) => kolom.find(k => k.nama === n)?.label || n;
/* kolom yang angka ketikannya beda dari daftar: dua angka berdampingan. null = belum didata (tidak pernah 0). */
export const bedaLapor = (data, kolom) => !data?.lapor_berkas ? [] : (Array.isArray(data.lapor_beda) ? data.lapor_beda : []).filter(n => ada(data.lapor_daftar?.[n]))
  .map(n => ({nama: n, label: lab(kolom, n), ketik: ada(data[n]) ? data[n] : null, daftar: data.lapor_daftar[n]}));
export const dariDaftar = (data, nama) => !!data?.lapor_berkas && data.lapor_sumber?.[nama] === "daftar";
/* rekap baru yang menunggu diterima: [{label, nilai}] (nihil = nilai "tidak ada"); null bila tidak ada */
export const rekapBaru = (data, kolom) => {
  const r = data?.lapor_berkas && data.lapor_rekap_baru; if (!r) return null;
  const nilai = Object.entries(r.nilai || {}).filter(([, v]) => ada(v)).map(([n, v]) => ({nama: n, label: lab(kolom, n), nilai: v}));
  const nihil = (r.nihil || []).map(n => ({nama: n, label: lab(kolom, n), nilai: null}));
  return {waktu: r.waktu ?? null, butir: [...nilai, ...nihil]};
};
/* isi data untuk "ubah" tanpa kunci sistem dan wilayah: server menolak kunci yang bukan kolom */
export const dataUbah = (data, kolom) => { const o = {}; for (const k of kolom) if (k.tipe !== "wilayah" && k.tipe !== "gudang" && ada(data?.[k.nama])) o[k.nama] = data[k.nama]; return o; };
