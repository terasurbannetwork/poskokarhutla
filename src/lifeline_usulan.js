/* Usulan Lifeline (LF-04; data/kajian-bnpb/lifeline/ALGORITMA.md bagian 2). MURNI: tanpa D1, tanpa jam. Mesin hanya MENGUSULKAN; status resmi ditetapkan staf (D3).
   Semua ambang di bawah HIPOTESIS (Q3) sampai dikalibrasi dengan status resmi. IODA dan lampu malam tidak pernah dipakai (D6, D7).
   Bentuk isyarat (dibangun pembaca di hak.js, semua angka >= 0): {layanan, warga: {total, n: {sub: pelapor}, pulih, t}, logbook: {n, t}, meja: {n, t}, titik: {terbuka, tidak, basi, t}}
   Hasil: {warna, alasan, isyarat: [{sumber, kode, jumlah, waktu, label}]}; isyarat = bukti yang memicu warna (atau kosong bila abu). */
export const LAYANAN = ["listrik", "sinyal", "air", "jalan", "bbm", "faskes", "pangan", "pengungsian"];
export const WARNA = ["hijau", "kuning", "merah", "abu"];
export const LABEL_KAB = "isyarat kab, tidak khusus kejadian";   // D9, ALGORITMA 3b

/* Bukti yang sah: hanya pasangan sumber dan kode yang dihasilkan usulan(); lfBersihBukti di hak.js menolak selain ini. Uji menjaga kesamaannya. */
export const BUKTI_SAH = {
  lapor_warga: ["listrik:padam", "listrik:gangguan", "listrik:hidup", "sinyal:tidak_ada", "sinyal:gangguan", "sinyal:lancar", "bbm:habis", "bbm:gangguan", "bbm:tersedia", "akses:putus_tertimbun", "akses:gangguan", "sehat:faskes_penuh"],
  logbook: ["kendala:listrik", "kendala:sinyal", "kendala:akses", "kebutuhan:air_bersih"],
  meja_dampak: ["listrik_unit", "telekom_unit", "air_unit", "spbu_unit", "jalan_jembatan", "faskes_rusak"],
  meja_pengungsi: ["air:tidak", "air:ada", "pangan:tidak", "pangan:ada", "titik:basi", "titik:segar"],
};

/* HIPOTESIS (Q3) */
export const MIN_PELAPOR_MERAH = 5, MIN_PELAPOR_KUNING = 3, MIN_PELAPOR_PULIH = 3, MIN_PELAPOR_JALAN_MERAH = 3, SEPARUH = 0.5, TITIK_BASI_HARI = 3;
/* Lapor Warga: jenis dan sub yang dibaca per layanan. gangguan = sub yang menghitung, baik = sub pemulihan (ALGORITMA 2, 3). bbm menggabung jenis bbm dan elpiji. */
export const WARGA = {
  listrik: {jenis: ["listrik"], buruk: "padam", gangguan: ["padam"], baik: "hidup"},
  sinyal: {jenis: ["sinyal"], buruk: "tidak_ada", gangguan: ["tidak_ada", "lemah"], baik: "lancar"},
  bbm: {jenis: ["bbm", "elpiji"], buruk: "habis", gangguan: ["terbatas", "habis"], baik: "tersedia"},
  jalan: {jenis: ["akses"], gangguan: ["tergenang", "putus", "tertimbun"]},
  faskes: {jenis: ["sehat"], gangguan: ["faskes_penuh"]},
};

const A = (i, k) => i?.warga?.n?.[k] ?? 0, tot = i => i?.warga?.total ?? 0;
const bukti = (sumber, kode, jumlah, waktu) => ({sumber, kode, jumlah, waktu: waktu ?? null, label: LABEL_KAB});
const hasil = (warna, alasan, isyarat = []) => ({warna, alasan: warna === "abu" ? alasan : `${alasan} (ambang hipotesis)`, isyarat});
const ABU = hasil("abu", "tidak ada isyarat");
const lb = (i, kode) => i?.logbook?.n > 0 ? bukti("logbook", kode, i.logbook.n, i.logbook.t) : null;
const mj = (i, kode) => i?.meja?.n > 0 ? bukti("meja_dampak", kode, i.meja.n, i.meja.t) : null;
const wg = (i, kode, jumlah) => bukti("lapor_warga", kode, jumlah, i?.warga?.t);
const tt = (i, kode, jumlah) => bukti("meja_pengungsi", kode, jumlah, i?.titik?.t);
const ada = (...b) => b.filter(Boolean);

/* listrik, sinyal, bbm berbentuk sama: merah = lebih dari separuh pelapor melaporkan 'buruk' (min 5 pelapor); kuning = gangguan >= 3 pelapor atau logbook atau meja;
   hijau = >= 3 pelapor 'baik' sesudah gangguan terakhir. Kuning menang atas hijau bila ada logbook atau meja; hijau menang atas kuning dari warga saja (pulih lebih baru). */
function tigaWarna(i, {buruk, gangguan, baik}, kodeLb, kodeMj, merah = (nBuruk, total) => total >= MIN_PELAPOR_MERAH && nBuruk / total > SEPARUH) {
  const k = `${i.layanan}`, n = gangguan.reduce((s, g) => s + A(i, g), 0), nBuruk = A(i, buruk);
  if (merah(nBuruk, tot(i))) return hasil("merah", `${nBuruk} dari ${tot(i)} pelapor melaporkan ${buruk.replace("_", " ")}`, [wg(i, `${k}:${buruk}`, nBuruk)]);
  const pulih = (i.warga?.pulih ?? 0) >= MIN_PELAPOR_PULIH, dariLb = ada(lb(i, kodeLb), mj(i, kodeMj));
  if (dariLb.length) return hasil("kuning", "ada kendala di logbook atau kerusakan di meja dampak", dariLb);
  if (n >= MIN_PELAPOR_KUNING && !pulih) return hasil("kuning", `${n} pelapor melaporkan gangguan`, [wg(i, `${k}:gangguan`, n)]);
  if (pulih) return hasil("hijau", `${i.warga.pulih} pelapor melaporkan ${baik} sesudah gangguan terakhir`, [wg(i, `${k}:${baik}`, i.warga.pulih)]);
  return ABU;
}
/* air dan pangan dari titik pengungsian terbuka (meja pengungsi): merah bila > separuh titik tidak punya, kuning bila >= 1; hijau bila semua ada */
function dariTitik(i, kode, ekstra) {
  const {terbuka = 0, tidak = 0} = i.titik ?? {};
  if (terbuka && tidak / terbuka > SEPARUH) return hasil("merah", `${tidak} dari ${terbuka} titik terbuka tidak punya ${kode}`, [tt(i, `${kode}:tidak`, tidak)]);
  const lain = ada(...ekstra);
  if (tidak >= 1 || lain.length) return hasil("kuning", tidak ? `${tidak} dari ${terbuka} titik terbuka tidak punya ${kode}` : "ada kendala di logbook atau kerusakan di meja dampak", [...(tidak ? [tt(i, `${kode}:tidak`, tidak)] : []), ...lain]);
  if (i.titik?.basi > 0) return hasil("abu", `${i.titik.basi} dari ${terbuka} titik terbuka belum diperbarui lebih dari ${TITIK_BASI_HARI} hari, tidak cukup segar untuk hijau`);
  return terbuka ? hasil("hijau", `semua ${terbuka} titik terbuka punya ${kode} dan diperbarui dalam ${TITIK_BASI_HARI} hari`, [tt(i, `${kode}:ada`, terbuka)]) : ABU;
}

export function usulan(i) {
  switch (i?.layanan) {
    case "listrik": return tigaWarna(i, WARGA.listrik, "kendala:listrik", "listrik_unit");
    case "sinyal": return tigaWarna(i, WARGA.sinyal, "kendala:sinyal", "telekom_unit");
    case "bbm": return tigaWarna({...i, logbook: null}, WARGA.bbm, "", "spbu_unit", nHabis => nHabis >= MIN_PELAPOR_MERAH);   // ALGORITMA: habis >= 5 pelapor, angka mutlak
    case "air": return dariTitik(i, "air", [lb(i, "kebutuhan:air_bersih"), mj(i, "air_unit")]);
    case "pangan": return dariTitik(i, "pangan", []);
    case "jalan": {   // hijau tidak pernah diusulkan otomatis (T12)
      const putus = A(i, "putus") + A(i, "tertimbun"), n = putus + A(i, "tergenang");
      if (putus >= MIN_PELAPOR_JALAN_MERAH) return hasil("merah", `${putus} pelapor melaporkan akses putus atau tertimbun`, [wg(i, "akses:putus_tertimbun", putus)]);
      const b = ada(n >= MIN_PELAPOR_KUNING && wg(i, "akses:gangguan", n), lb(i, "kendala:akses"), mj(i, "jalan_jembatan"));
      return b.length ? hasil("kuning", "akses terganggu menurut warga, logbook, atau meja dampak", b) : ABU;
    }
    case "faskes": {   // merah dan hijau tidak pernah diusulkan otomatis (T12)
      const n = A(i, "faskes_penuh"), b = ada(n >= MIN_PELAPOR_KUNING && wg(i, "sehat:faskes_penuh", n), mj(i, "faskes_rusak"));
      return b.length ? hasil("kuning", "faskes penuh menurut warga atau rusak menurut meja dampak", b) : ABU;
    }
    case "pengungsian": {
      const {terbuka = 0, basi = 0} = i.titik ?? {};
      if (terbuka && basi / terbuka >= SEPARUH) return hasil("merah", `${basi} dari ${terbuka} titik terbuka belum diperbarui lebih dari ${TITIK_BASI_HARI} hari`, [tt(i, "titik:basi", basi)]);
      if (basi >= 1) return hasil("kuning", `${basi} dari ${terbuka} titik terbuka belum diperbarui lebih dari ${TITIK_BASI_HARI} hari`, [tt(i, "titik:basi", basi)]);
      return terbuka ? hasil("hijau", `semua ${terbuka} titik terbuka diperbarui dalam ${TITIK_BASI_HARI} hari`, [tt(i, "titik:segar", terbuka)]) : ABU;
    }
    default: return ABU;
  }
}
