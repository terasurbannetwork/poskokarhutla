/* Kelengkapan isian meja "Data kejadian dan dampak" (Juklak 7/2023 Lampiran I; aturan di data/kajian-bnpb/juklak/DATA-DAMPAK.md bagian "Aturan kelengkapan").
   Fungsi murni tanpa DOM, tanpa impor: dipakai peramban (meter hidup di formulir) dan Worker (src/meja.js) dengan hasil yang sama.
   Masukan: `kolom` = daftar kolom meja (spekPublik), `data` = isian catatan ditambah kec dan desa dari wilayah catatan.
   Kolom membawa: bagian, inti (wajib untuk verifikasi), opsional (tidak dihitung), bila (butir hanya berlaku bila salah satu kolom induk > 0), nihil (kolom ya "tidak ada" milik satu bagian).
   Aturan: angka 0 TERJAWAB (kosong = belum didata). Bagian dengan pilihan nihil dipilih: semua butirnya terjawab dan isian di bagian itu ditolak. */

export const BAGIAN = {
  kejadian: "Kejadian", kebutuhan: "Kebutuhan", manusia: "Akibat terhadap manusia", sosek: "Kerusakan sosial ekonomi",
  prasarana: "Kerusakan prasarana dan sarana vital", rumah: "Kerusakan rumah", layanan: "Kerusakan pelayanan dasar", aset: "Aset dan layanan penanganan",
};
/* bagian yang cukup terjawab SATU butir atau dinyatakan tidak ada (nihil) agar inti lengkap */
export const BAGIAN_MINIMAL_SATU = ["kebutuhan", "sosek", "prasarana", "layanan", "aset"];

const ada = v => v !== undefined && v !== null && v !== "";
const nihilDari = (kolom, data) => new Set(kolom.filter(c => c.nihil && data[c.nama] === true).map(c => c.bagian));
const butirKolom = kolom => kolom.filter(c => !c.nihil && !c.opsional);

/* daftar butir yang BERLAKU untuk data ini: {nama, label, bagian, inti, terjawab} */
export function butir(kolom, data = {}) {
  const nihil = nihilDari(kolom, data);
  return butirKolom(kolom)
    .filter(c => !c.bila || c.bila.some(n => Number(data[n]) > 0) || ada(data[c.nama]))   // taksiran berlaku bila induknya ada kerusakan (atau sudah terlanjur diisi)
    .map(c => ({nama: c.nama, label: c.label, bagian: c.bagian, inti: !!c.inti, terjawab: ada(data[c.nama]) || nihil.has(c.bagian)}));
}

/* {persen, inti_lengkap, kurang_inti: [{nama, label}], kurang_rinci: [{nama, label}]} */
export function kelengkapan(kolom, data = {}) {
  const b = butir(kolom, data), nihil = nihilDari(kolom, data);
  const kurangInti = b.filter(x => x.inti && !x.terjawab).map(({nama, label}) => ({nama, label}));
  for (const g of BAGIAN_MINIMAL_SATU) {
    if (nihil.has(g) || !kolom.some(c => c.bagian === g && !c.nihil && !c.opsional)) continue;
    if (!b.some(x => x.bagian === g && ada(data[x.nama]))) kurangInti.push({nama: "bagian_" + g, label: `${BAGIAN[g]}: isi paling tidak satu butir, atau pilih tidak ada`});
  }
  const kurangRinci = b.filter(x => !x.inti && !x.terjawab).map(({nama, label}) => ({nama, label}));
  const terjawab = b.filter(x => x.terjawab).length;
  return {persen: b.length ? Math.round(100 * terjawab / b.length) : 0, inti_lengkap: kurangInti.length === 0, kurang_inti: kurangInti, kurang_rinci: kurangRinci};
}

/* kalimat untuk pesan galat verifikasi: menyebut butir yang kurang */
export const pesanKurang = (hasil, maks = 12) => {
  const n = hasil.kurang_inti.map(x => x.label), tampil = n.slice(0, maks).join("; ");
  return `data inti belum lengkap (${n.length} butir): ${tampil}${n.length > maks ? `; dan ${n.length - maks} lainnya` : ""}`;
};

/* isian di bagian yang dinyatakan nihil harus kosong. Kembalikan teks galat atau "". */
export function bentrokNihil(kolom, data = {}) {
  for (const g of nihilDari(kolom, data)) {
    const isi = kolom.find(c => c.bagian === g && !c.nihil && ada(data[c.nama]));
    if (isi) return `${BAGIAN[g]} dinyatakan tidak ada, tetapi "${isi.label}" terisi; kosongkan isiannya atau batalkan pilihan tidak ada`;
  }
  return "";
}

/* teks tagihan per kabupaten untuk pesan WhatsApp/surel admin: butir kosong paling sering, kata-kata biasa (tanpa titik tengah) */
export function teksTagihan({kab, kejadian, persen, kosong = [], belum = 0}) {
  const F = new Intl.NumberFormat("id-ID").format;
  const butir = kosong.slice(0, 8).map(x => `${x.label} (${F(x.jumlah)} kejadian)`).join(", ");
  return [`Yth. Pengelola data bencana BPBD ${kab}.`,
    `Berdasarkan Juklak BNPB 7/2023, data kejadian dan dampak bencana perlu lengkap. Saat ini ada ${F(kejadian)} kejadian dengan kelengkapan rata-rata ${F(persen)} persen.`,
    butir ? `Butir yang paling sering belum diisi: ${butir}.` : "Semua butir inti sudah terisi.",
    belum ? `Ada ${F(belum)} kejadian darurat yang belum dimutakhirkan lebih dari 1 hari; selama keadaan darurat data dinamis disampaikan paling sedikit satu hari sekali.` : "",
    "Mohon dilengkapi lewat Meja Kerja. Angka 0 diisi bila memang tidak ada, atau pilih tidak ada pada bagian yang kosong. Terima kasih."].filter(Boolean).join("\n");
}
