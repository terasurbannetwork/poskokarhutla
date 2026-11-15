/* Delapan klaster PB nasional (Keputusan Kepala BNPB 173/2014), satu daftar tunggal (TW-01, KEPUTUSAN-TIGA-W D3).
   ES module tanpa DOM: diimpor Worker dan peramban. `kata` = sumber regex (huruf awal kata, tanpa pembatas), dipakai analisa
   keahlian di public/fungsi_direktori.js. `nama` = label tampilan; kunci tidak boleh berubah (dipakai data tersimpan). */
export const KLASTER_PB = [
  { kunci: "kesehatan", nama: "Kesehatan", kata: ["health", "hospital", "medical", "disease", "nutrition", "mental", "psycholog", "kesehatan", "rumah sakit", "puskesmas", "gizi", "epidemi", "pandemi", "covid", "dengue", "malaria"] },
  { kunci: "sar", nama: "Pencarian dan penyelamatan", kata: ["search and rescue", "rescue", "pencarian dan pertolongan", "penyelamatan", "basarnas"] },
  { kunci: "logistik", nama: "Logistik", kata: ["logistic", "supply chain", "distribution", "stockpil", "logistik", "rantai pasok"] },
  { kunci: "pengungsian", nama: "Pengungsian dan perlindungan", kata: ["shelter", "displace", "refugee", "evacuat", "gender", "child protection", "disabilit", "pengungsi", "evakuasi", "perlindungan", "kelompok rentan"] },
  { kunci: "pendidikan", nama: "Pendidikan", kata: ["school", "education", "student", "teacher", "curricul", "sekolah", "pendidikan", "siswa", "guru", "kurikulum"] },
  { kunci: "sarpras", nama: "Sarana dan prasarana", kata: ["infrastructur", "(?<!capacity )buildings?\\b", "bridges?\\b", "roads?\\b", "structural", "retrofit", "construction", "dam\\b", "levee", "bangunan", "jembatan", "jalan", "struktur", "bendungan", "tanggul", "konstruksi"] },
  { kunci: "ekonomi", nama: "Ekonomi", kata: ["econom", "livelihood", "poverty", "insurance", "disaster financ", "risk financ", "economic loss", "ekonomi", "mata pencaharian", "kemiskinan", "asuransi", "pembiayaan", "kerugian"] },
  { kunci: "pemulihan", nama: "Pemulihan dini", kata: ["recover", "reconstruct", "rehabilitat", "build back better", "pemulihan", "rehabilitasi", "rekonstruksi"] },
];
/* Jembatan ke skrip klasik (fungsi_direktori.js) di peramban saja; Worker tidak tercemar. */
if (typeof document !== "undefined") globalThis.KLASTER_PB = KLASTER_PB;
