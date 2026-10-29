/* Pengenal jenis laporan harian yang masuk lewat WA (pemilik 29 Okt 2026). MURNI: hanya membaca kepala teks/nama berkas untuk tahu
   laporan MANA yang sudah tiba. TIDAK PERNAH membaca angka (aturan pemilik 29 Okt 2026: hotspot, firespot, luas terbakar, luas belum padam
   hanya dari sistem sendiri, bukan dari kiriman WA). */
export const JENIS_LAPORAN = [
  {kunci: "rekap_koordalops_24", label: "Rekap Koordalops 24 jam", wajib: true},
  {kunci: "rekap_koordalops_12", label: "Rekap Koordalops 12 jam", wajib: false},
  {kunci: "laphar_pdf", label: "Laphar PDF", wajib: true},
  {kunci: "karhutla_mensesneg", label: "Karhutla Mensesneg", wajib: true},
  {kunci: "satgas", label: "Satgas pemadaman", wajib: true},
  {kunci: "bmkg_pagi", label: "BMKG pagi", wajib: true},
  {kunci: "bmkg_malam", label: "BMKG malam", wajib: false},
  {kunci: "pvmbg_pagi", label: "PVMBG pagi", wajib: true},
  {kunci: "pvmbg_malam", label: "PVMBG malam", wajib: false},
  {kunci: "gelar_armada", label: "Gelar armada", wajib: false},
  {kunci: "dry_ice_omc", label: "Dry ice OMC", wajib: false},
  {kunci: "hujan_omc", label: "Hujan pasca OMC", wajib: false},
  {kunci: "bpbd_kejadian", label: "Kejadian BPBD", wajib: false},
];

export function kenali(teks, namaBerkas) {
  if (/Laporan Harian Dit\.? ?Koordalops/i.test(namaBerkas || "")) return "laphar_pdf";
  const t = String(teks ?? "").toLowerCase().replace(/[*_]/g, "").replace(/\s+/g, " ").trim();
  if (/^laporan harian dit\.? ?koordalops/.test(t)) return "laphar_pdf";
  const malam = () => /selamat malam|pukul 19\.00/.test(t);
  if (t.includes("laporan upaya pemadaman karhutla oleh satgas")) return "satgas";
  if (t.includes("laporan karhutla") || t.includes("laporan penanganan karhutla di enam provinsi prioritas")) return "karhutla_mensesneg";
  const kepala = t.match(/hasil pemantauan dit\.? koordalops bnpb tanggal[^:]{0,120}/);
  if (kepala) {
    // ujung rentang = jam terakhir di KALIMAT KEPALA saja; badan teks bisa memuat "pukul 17.00" (bahan asli 25 Okt 2026)
    const jam = [...kepala[0].matchAll(/(?:pkl|pukul)\.? ?(\d{1,2})[.:]00/g)].pop();
    return jam?.[1] === "19" ? "rekap_koordalops_12" : jam?.[1] === "7" || jam?.[1] === "07" ? "rekap_koordalops_24" : null;
  }
  if (t.includes("laporan meteorologi dan klimatologi (bmkg)")) return malam() ? "bmkg_malam" : "bmkg_pagi";
  if (t.includes("aktivitas gunung api") && t.includes("pvmbg")) return malam() ? "pvmbg_malam" : "pvmbg_pagi";
  if (t.includes("gelar pesawat dan helikopter")) return "gelar_armada";
  if (t.includes("penggunaan dry ice")) return "dry_ice_omc";
  if (t.includes("pemantauan hujan pasca pelaksanaan operasi modifikasi cuaca")) return "hujan_omc";
  if (t.includes("perkembangan kejadian") && t.includes("bpbd")) return "bpbd_kejadian";
  return null;
}
