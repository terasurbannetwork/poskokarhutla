/* Kemitraan Kampus: fungsi murni worker (DESAIN-TEKNIS §5.1). Tanpa D1, tanpa jaringan. Kasus acuan: tests/kemitraan/fixtures/acuan.json (kunci status_perjanjian = RENCANA-UJI A13).
   Fungsi lain (skor, cocok, urut panggil) menyusul per tiket (KM-D06 dst.). */
const HARI = 86400e3, SEGERA_HARI = 60;
const wib = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
const selisihHari = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / HARI);

/* Status arsip perjanjian dari tanggal berakhirnya. berakhir 'YYYY-MM-DD' atau null; kini = 'YYYY-MM-DD' atau ms epoch (dibaca sebagai hari WIB).
   null -> belum (belum ada perjanjian bertanggal); sisa <= 60 hari (termasuk hari ini) -> segera_habis; lewat -> habis; selain itu aktif. */
export function statusPerjanjian(berakhir, kini = Date.now()) {
  if (!berakhir) return "belum";
  const h = typeof kini === "number" ? wib(kini) : kini, sisa = selisihHari(h, berakhir);
  return sisa < 0 ? "habis" : sisa <= SEGERA_HARI ? "segera_habis" : "aktif";
}
