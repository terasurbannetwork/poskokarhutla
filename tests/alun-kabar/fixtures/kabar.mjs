// Fixture kecil Kabar Alun-alun, dibangun di sini: public/data/alun/kabar.json tidak dilacak git (Q2).
export const kejadian = (o = {}) => ({
  id: "banjir|11|Kota X|2026-11-19", jenis: "banjir", kab: "Kota X", prov: "11", kab_kode: "11|Kota X", titik: {lat: 1, lon: 2},
  status: "berjalan", mulai: "2026-11-19", lap_terakhir: "2026-11-25", cutoff_terakhir: "2026-11-25T07:00+07:00", selesai_lama: false,
  angka: {kk: 2659, mengungsi: null, rumah_dampak: 0}, berita: [{judul: "Banjir Kota X", media: "Media Y", tgl: "2026-11-24", url: "javascript:alert(1)"}], n_berita: 1, ...o,
});
export const warga = (o = {}) => ({
  id: 1, jenisId: "banjir", jenis: "Banjir", lokasi: {kab: "Kota X", provKode: "11"}, waktu: "2026-11-20 10.00",
  dampak: {mengungsi: 40, luka: 0}, status: "selesai", statusLabel: "Selesai", ...o,
});
export const kabar = (kej = [kejadian()]) => ({hari: "2026-11-25", kejadian: kej});
export const WIB = s => Date.parse(`${s}+07:00`);
