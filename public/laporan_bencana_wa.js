/* Teks WA otomatis dari SNAPSHOT laporan harian bencana selain karhutla (banjir, gempa, gunungapi, cuaca, kekeringan, udara). Modul ES murni dan deterministik:
   hanya angka dari snapshot (laporan.json v1 dan kiriman provinsi), tidak ada angka diketik. Simbol WA sama dengan laporan_karhutla_wa.js: *tebal*, _miring_, "> " kutipan, "* " butir.
   Angka kunci ditulis lebih dulu dan tebal; tiap bagian menyebut sumbernya. Bagian tanpa data DIHILANGKAN (tidak ditulis nol); pantauan otomatis yang tidak mencakup tanggal data ditulis apa adanya.
   Tidak ada kiriman otomatis: teks disalin atau ditekan manusia. */
import {tglPanjang, hariPanjang} from "./laporan_karhutla_wa.js";

const nn = v => typeof v === "number" && Number.isFinite(v);
const fmt = (n, d = 0) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d, minimumFractionDigits: d});
const B = t => `*${t}*`, I = t => `_${t}_`, H1 = t => `***${t}***`, H2 = t => `**${t}**`;
const kapital = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
const ubahTeks = u => u?.teks ? ", " + u.teks : "";
const namaSumber = s => (s.sumber || []).map(x => x.nama).filter(Boolean).join(", ") || "laporan harian otomatis";
const DAMPAK = [["meninggal", "meninggal"], ["hilang", "hilang"], ["luka", "luka"], ["mengungsi", "mengungsi"], ["terdampak", "jiwa terdampak"]];
const kalimat = t => { t = String(t).trim(); return /[.!?]$/.test(t) ? t : t + "."; };
const SUMBER_PROV = "laporan Pemerintah Provinsi, diverifikasi Pusdalops BNPB";

export function laporanBencana(s) {
  const L = [B(`LAPORAN HARIAN ${String(s.nama_bencana).toUpperCase()}`), I(hariPanjang(s.tanggal_laporan) + (s.ralat ? `, Ralat-${s.ralat}` : "")), ""];
  const mk = new Map((s.metrik || []).map(m => [m.k, m])), baris = (v, m) => `${B(`${fmt(v, m.desimal)} ${m.satuan}`.trim())} (${m.label})`;
  L.push(H1("A. SITUASI NASIONAL"), "");
  if (s.nasional) {
    L.push(H2("1. Pantauan otomatis"), `Data ${tglPanjang(s.tanggal_data)}${s.otomatis?.berjalan ? ", hari berjalan dan belum final" : ""}:`);
    for (const m of s.nasional) L.push(`* ${baris(m.nilai, m)}${ubahTeks(m.ubah)}`);
    L.push(I(`Sumber: ${namaSumber(s)}`), "");
    if (s.tiga_hari) {
      const u = s.nasional.find(m => m.utama) ?? s.nasional[0];
      L.push(H2("2. Tiga hari terakhir"), `${u.label}:`, ...s.tiga_hari.map(h => `* ${tglPanjang(h.tanggal_data)}: ${B(`${fmt(h.nilai, u.desimal)} ${u.satuan}`.trim())}`), I(`Sumber: ${namaSumber(s)}`), "");
    }
  } else L.push(`Pantauan otomatis untuk ${tglPanjang(s.tanggal_data)} belum ada data${s.data_otomatis ? ` (${s.data_otomatis.alasan}${s.data_otomatis.hari_lengkap ? `, hari lengkap terakhir ${tglPanjang(s.data_otomatis.hari_lengkap)}` : ""})` : ""}.`, "");
  if (s.dampak_provinsi) {
    const d = s.dampak_provinsi;
    L.push(H2(`${s.nasional ? (s.tiga_hari ? 3 : 2) : 1}. Dampak menurut laporan provinsi`), "* " + DAMPAK.filter(([k]) => nn(d[k])).map(([k, l], i) => i ? `${fmt(d[k])} ${l}` : `${B(`${fmt(d[k])} ${l}`)}`).join(", ") + `, dari ${fmt(d.provinsi)} provinsi yang melaporkan`, I(`Sumber: ${SUMBER_PROV}`), "");
  }
  if (s.provinsi.length) {
    L.push(H1("B. PROVINSI"), "");
    s.provinsi.forEach((p, i) => {
      L.push(H2(`${i + 1}. ${p.nama}`));
      const ms = Object.entries(p.metrik || {}).filter(([k]) => mk.has(k)).map(([k, v]) => baris(v, mk.get(k)));
      if (ms.length) L.push(`> Pantauan otomatis ${tglPanjang(s.tanggal_data)}: ${ms.join("; ")}. ${I(`Sumber: ${namaSumber(s)}`)}`);
      const x = p.kiriman, akhir = p.lanjut_tanpa ? ` ${I(`(data terakhir ${p.data_terakhir ? tglPanjang(p.data_terakhir) : "tidak ada"}; ${p.lanjut_tanpa.alasan})`)}` : "";
      if (!x) L.push(`> belum ada laporan provinsi.${akhir}`);
      else {
        if (x.ringkasan) L.push(`> Situasi: ${kalimat(x.ringkasan)}`);
        const dm = DAMPAK.filter(([k]) => nn(x.dampak?.[k])).map(([k, l], j) => j ? `${fmt(x.dampak[k])} ${l}` : B(`${fmt(x.dampak[k])} ${l}`));
        if (dm.length) L.push(`> Dampak: ${dm.join(", ")}.`);
        if (x.upaya) L.push(`> Upaya: ${kalimat(x.upaya)}`);
        if (x.hambatan) L.push(`> Hambatan: ${kalimat(x.hambatan)}`);
        if (x.catatan) L.push(`> Catatan: ${kalimat(x.catatan)}`);
        L.push(`> ${I(`Sumber: ${SUMBER_PROV}`)}${akhir}`);
      }
      L.push("");
    });
  }
  if (s.sorot) {
    L.push(H1("C. PERLU PERHATIAN"), "", ...s.sorot.map(o => `* ${B(kapital(o.tingkat))}: ${kalimat(o.judul)}`), I(`Sumber: ${namaSumber(s)}`), "");
  }
  if (s.prakiraan) {
    const p = s.prakiraan;
    L.push(H1("D. PRAKIRAAN"), "", `${kalimat(p.judul)} Hari ${p.hari.map(tglPanjang).join(", ")}.`, ...p.baris.slice(0, 5).map(b => `* ${b.label}: ${b.nilai.map(v => nn(v) ? fmt(v, 2) : "belum ada data").join("; ")}${b.satuan ? " " + b.satuan : ""}`), I(`Sumber: ${namaSumber(s)}`), "");
  }
  for (const p of s.pengecualian) L.push(I(`Catatan: ${p.label}, data terakhir ${p.data_terakhir ? tglPanjang(p.data_terakhir) : "tidak ada"} (${p.alasan})`));
  L.push(H1("KESIMPULAN"), "", ...s.kesimpulan.map(t => `* ${t}`));
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
export const teksWABencana = laporanBencana;
