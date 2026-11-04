/* Isian contoh tombol dummy /bnpb/saham (Super Admin): bentuk kontrak Worker, angka karangan untuk menilai tata letak. Tidak memanggil API. */
const hari = i => new Date(Date.UTC(2026, 10, 4) - (29 - i) * 864e5).toISOString().slice(0, 10);
const harga = i => Math.round((6200 + i * 11 + Math.sin(i / 2.5) * 140) / 25) * 25;
export const CONTOH = {
  hasil: [{pair_id: "dummy-1", kode: "AAAA", nama: "Contoh Perkasa Tbk", bursa: "IDX"}, {pair_id: "dummy-2", kode: "BBBB", nama: "Contoh Makmur Tbk", bursa: "IDX"}],
  info: {name: "Contoh Perkasa Tbk", symbol: "AAAA", exchange: "IDX", sector: "Keuangan", last: 6475, change: 75, change_percent: 1.17, volume: 48210500},
  grafik: Array.from({length: 30}, (_, i) => ({date: hari(i), close: harga(i)})),
  transaksi: Array.from({length: 50}, (_, i) => ({waktu: `09:${String(59 - (i % 60)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`, harga: 6450 + (i % 5) * 25, lot: 10 + (i * 37) % 400, sisi: i % 3 ? "Beli" : "Jual"})),
  dividen: {ringkas: {annualized_payout: 280, dividend_yield: 4.32, five_year_dividend_growth: 6.5, next_dividend_date: "2027-03-18", payout_ratio: 45.2},
    riwayat: [{tanggal: "2026-03-20", nilai: 140, jenis: "Final", bayar: "2026-04-10", yield: 2.2}, {tanggal: "2025-09-12", nilai: 140, jenis: "Interim", bayar: "2025-10-03", yield: 2.1}, {tanggal: "2025-03-21", nilai: 125, jenis: "Final", bayar: "2025-04-11", yield: 2.0}]},
};
