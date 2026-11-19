/* Hak meja Lapor Bencana per akun (KEPUTUSAN-LAPOR-AI K63, D94-D98). Fungsi murni: dipakai server lokal sekarang dan rute Worker /api/lapor/meja* nanti.
   BNPB (admin, staf Q12) melihat semua. BPBD masuk dengan akun lembaga pemda yang sudah ada (Ruang Instansi jenis pemkab, pemkot, pemprov,
   termasuk anggota undangan /masuk): tingkat kab melihat kab/kota itu, tingkat provinsi semua kab/kota di provinsinya. Wilayah dibaca dari
   kode wilayah laporan (hasil GPS atau desa terpilih), bukan dari isian pelapor. */

export const JENIS_LEMBAGA_BPBD = new Set(["pemkab", "pemkot", "pemprov"]);   // Q53: semua anggota akun pemda; Q54: polres, kodim belum

/* akun: {bnpb: true} untuk sesi admin/staf, atau akun lembaga {jenis, tingkat, prov, kab (kode "31.75"), wilayah (nama), nama anggota}.
   Hasil null = tidak berhak membuka meja. */
export function cakupanMeja(akun) {
  if (!akun) return null;
  if (akun.bnpb) return {jenis: "bnpb", label: "BNPB", pelaku: akun.nama || "Admin BNPB"};
  if (!JENIS_LEMBAGA_BPBD.has(akun.jenis) || akun.status && akun.status !== "aktif") return null;
  const prov = String(akun.prov || "").slice(0, 2);
  if (!/^\d{2}$/.test(prov)) return null;
  if (akun.tingkat === "prov") return {jenis: "bpbd", tingkat: "prov", prov, kab: null, label: `BPBD ${akun.wilayah || `Provinsi ${prov}`}`, pelaku: `BPBD ${akun.wilayah || prov}${akun.nama ? `, ${akun.nama}` : ""}`};
  const kab = String(akun.kab || "");
  if (!/^\d{2}\.\d{2}$/.test(kab) || !kab.startsWith(prov)) return null;
  return {jenis: "bpbd", tingkat: "kab", prov, kab, label: `BPBD ${akun.wilayah || kab}`, pelaku: `BPBD ${akun.wilayah || kab}${akun.nama ? `, ${akun.nama}` : ""}`};
}

/* wilayah laporan: {provKode, kabKode} dari isian lokasi. Laporan tanpa wilayah hanya untuk BNPB. */
export function dalamWilayah(c, w) {
  if (!c) return false;
  if (c.jenis === "bnpb") return true;
  if (!w?.provKode) return false;
  return c.tingkat === "prov" ? w.provKode === c.prov : w.kabKode === c.kab;
}

/* aksi meja: lihat, balas, status, bukti, bukti-publik. BPBD tidak membuka kembali tiket Selesai atau Tidak valid (D96). */
const AKSI_BPBD = new Set(["lihat", "balas", "status", "bukti", "bukti-publik"]);
export function bolehAksi(c, aksi, dari = null, ke = null) {
  if (!c) return false;
  if (c.jenis === "bnpb") return true;
  if (!AKSI_BPBD.has(aksi)) return false;
  if (aksi === "status" && ["selesai", "tidak_valid"].includes(dari)) return false;
  return true;
}
/* daftar tujuan status yang ditawarkan ke akun ini */
export const pindahUntuk = (c, dari, semua) => (semua || []).filter(ke => bolehAksi(c, "status", dari, ke));
