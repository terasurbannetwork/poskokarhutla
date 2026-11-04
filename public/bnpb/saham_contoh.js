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

/* ---- contoh bagian "Konsesi dan saham": bentuk kontrak GET /api/saham/konsesi, nama dan angka karangan ---- */
const SENIN0 = Date.UTC(2026, 0, 5);
const acak = s => { let x = s; return () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296; };
const mingguan = (seed, banyak, puncak) => { const r = acak(seed); return Array.from({length: banyak}, (_, i) => ({minggu: new Date(SENIN0 + (44 - banyak + i) * 7 * 864e5).toISOString().slice(0, 10), titik: Math.round(r() * r() * puncak * (i % 11 === 7 ? 3 : 1))})); };
const jumlah = (m, n) => m.slice(-n).reduce((s, x) => s + x.titik, 0);
const emiten = (kode, nama, bursa, grup, hubungan, dasar, konsesi, seed, banyak, puncak) => { const m = mingguan(seed, banyak, puncak); return {kode, nama, bursa, grup, hubungan, dasar, konsesi, titik: {total: jumlah(m, 99), d7: jumlah(m, 1), d30: jumlah(m, 4)}, mingguan: m}; };
export const KONSESI = {
  ok: true, dibuat: "2026-11-04T01:00:00Z", periode: {dari: "2026-01-01", sampai: "2026-11-04"},
  sumber: ["Titik panas FIRMS (contoh)", "Peta konsesi (contoh)", "Kepemilikan grup (contoh)"], catatan: "Data contoh untuk menilai tata letak; semua nama, luas, dan titik karangan.",
  emiten: [
    emiten("AAAA", "Contoh Perkasa Tbk", "IDX", "Grup Contoh Satu", "langsung", "Anak usaha memegang HGU sawit", {jumlah: 12, luas_ha: 184500}, 11, 44, 40),
    emiten("BBBB", "Contoh Makmur Tbk", "IDX", "Grup Contoh Dua", "langsung", "Konsesi HTI atas nama anak usaha", {jumlah: 5, luas_ha: 96200}, 23, 44, 25),
    emiten("CCCC", "Contoh Lestari Tbk", "IDX", "Grup Contoh Satu", "rantai_pasok", "Pabrik pengolah, deret titik grup bersama dengan AAAA", {jumlah: 12, luas_ha: 184500}, 11, 44, 40),
    emiten("DDDD", "Contoh Asia Ltd", "SGX", "Grup Contoh Empat", "induk", "Induk di luar negeri", {jumlah: 2, luas_ha: 30300}, 41, 44, 9),
    emiten("EEEE", "Contoh Baru Tbk", "IDX", "Grup Contoh Lima", "langsung", "Baru tercatat; riwayat titik pendek", {jumlah: 1, luas_ha: 8800}, 53, 5, 6),
  ],
  grup_tanpa_emiten: [{grup: "Grup Contoh Enam", alasan: "Tertutup, tidak tercatat di bursa", titik: {total: 410, d7: 3, d30: 52}}, {grup: "Grup Contoh Tujuh", alasan: "Kepemilikan belum teridentifikasi", titik: {total: 75, d7: 0, d30: 4}}],
};
/* deret harga 1 tahun sintetis (hari kerja) bentuk /grafik: {dari,sampai,sesi,deret:[{t,harga,buka,tertinggi,terendah}]} */
export const grafikSintetis = kode => {
  const r = acak([...kode].reduce((s, c) => s * 31 + c.charCodeAt(0), 7)); let p = 1000 + r() * 4000; const deret = [];
  for (let d = Date.UTC(2025, 10, 5); d <= Date.UTC(2026, 10, 4); d += 864e5) { const w = new Date(d).getUTCDay(); if (w === 0 || w === 6) continue; const buka = p; p = Math.max(50, Math.round(p * (1 + (r() - 0.5) * 0.04))); deret.push({t: new Date(d).toISOString().slice(0, 10) + "T16:00:00+07:00", harga: p, buka: Math.round(buka), tertinggi: Math.max(p, Math.round(buka)), terendah: Math.min(p, Math.round(buka))}); }
  return {dari: deret[0].t.slice(0, 10), sampai: "2026-11-04", sesi: "contoh", deret};
};
export const infoSintetis = kode => { const d = grafikSintetis(kode).deret, a = d.at(-1).harga, b = d.at(-2).harga; return {nama: kode, kode, harga: a, perubahan: a - b, perubahan_persen: (a / b - 1) * 100, volume: 1000000}; };
