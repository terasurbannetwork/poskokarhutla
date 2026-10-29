/* SIPPA: isi Laporan PDF sebagai blok terstruktur (PRD §9.10, DS §3.18, DT §6.4). Fungsi murni: tanpa DOM, tanpa jaringan, tanpa jam sendiri
   (waktu data selalu datang dari pemanggil lewat opsi.per). Dipakai layar Laporan (pratinjau, PDF) dan SP-044 (empat templat lain).
   Templat pertama: pilot. Vonis "dapat dipakai" (tujuh butir keputusan 53) dan vonis "lebih baik" dipisah; hasil pilot tidak pernah memberi vonis G4.
   Butuh global public/inti: fmt, jamWIB. Teks blok adalah teks polos; pelolosan markup dilakukan perender HTML (laporan_pdf.js pratinjauHtml). */
import {vonisPilot, durasiLog} from "./hitung.js";

export const JENIS_LAPORAN = [["pilot", "Pilot"], ["kejadian", "Kejadian"], ["mingguan", "Mingguan"], ["musim", "Musim"], ["skenario", "Skenario"]];
export const JENIS_SIAP = ["pilot"];
/* satu-satunya aset gambar PDF: logo BNPB (keputusan 50); berkas yang sama dengan laporan_karhutla_deck.js */
export const ASET_GAMBAR = ["/img/lembaga/sumber-bnpb.png"];
const SUMBER = {log: "log gelar lapangan (sippa_log_gelar)", probe: "probe suhu gambut (sippa_probe)", komp: "inspeksi komponen kembali (sippa_komponen)", vonis: "sippa_log_gelar, sippa_probe, sippa_komponen; keputusan 53", rentang: "rentang yang dipilih staf"};
const MAKS_FOTO = 6;
const ZONA = {timeZone: "Asia/Jakarta"};

const tglPendek = ms => ms == null ? "–" : new Date(ms).toLocaleDateString("id-ID", {...ZONA, day: "numeric", month: "short", year: "numeric"});
const tglKode = ms => new Date(ms).toLocaleDateString("en-CA", ZONA).replaceAll("-", "");
const bulanTahun = ms => new Date(ms).toLocaleDateString("id-ID", {...ZONA, month: "long", year: "numeric"});
const persen = r => r == null ? "–" : `${fmt(r * 100)}%`;
const durasiJam = h => h == null ? "–" : fmt.durasi(h * 36e5);
const rerata = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const jumlah = (log, k) => { const v = log.map(l => l[k]).filter(x => typeof x === "number" && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

/* nilai butir keputusan 53 untuk dibaca manusia; butir tanpa data = tanda strip, bukan nol */
function nilaiButir(b) {
  if (b.lulus === null && b.no !== 5) return "–";
  const n = b.nilai;
  switch (b.no) {
    case 1: return n ? `${fmt(n.sesi)} sesi di ${fmt(n.petak)} petak` : "–";
    case 2: return n == null ? "–" : `${durasiJam(n)} (terbaik)`;
    case 3: return n ? `${fmt(n.bar)} bar selama ${fmt(n.menit)} menit${n.sumber ? `, ${n.sumber}` : ""}` : "–";
    case 5: return persen(n) + (b.petak_tanpa_probe?.length ? `; petak tanpa probe: ${b.petak_tanpa_probe.join(", ")}` : "");
    case 6: return n ? `${fmt(n.kecelakaan)} kecelakaan; henti karena bocor lebih dari 30 menit: ${n.henti_lebih_30 ? "ya" : "tidak"}` : "–";
    case 7: return persen(n);
    default: return "–";
  }
}
const statusButir = lulus => lulus === true ? "Lulus" : lulus === false ? "Tidak lulus" : "Belum diputus";

function tabelProbe(probe) {
  const per = new Map();
  for (const r of probe) { if (!per.has(r.petak_id)) per.set(r.petak_id, {titik: new Set(), n: 0, tahap: {sebelum: [], sesudah: [], "24j": []}}); const p = per.get(r.petak_id); p.titik.add(r.titik); p.n++; if (typeof r.suhu_c === "number" && p.tahap[r.tahap]) p.tahap[r.tahap].push(r.suhu_c); }
  return [...per.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(([id, p]) => {
    const s = t => p.tahap[t].length ? `${fmt(rerata(p.tahap[t]))} °C` : "–";
    return [String(id), fmt(p.titik.size), s("sebelum"), s("sesudah"), s("24j"), fmt(p.n)];
  });
}

function pilotBlok(data, per) {
  const log = data.log || [], probe = data.probe || [], komp = data.komponen_kembali || [];
  const waktu = `per ${jamWIB(per)}`, v = vonisPilot({log, probe, komponen_kembali: komp});
  const lulus = v.butir.filter(b => b.lulus === true).length;
  const tibaAir = log.map(l => durasiLog(l).tiba_air).filter(x => x != null);
  const rentang = data.rentang || {dari: log.reduce((m, l) => l.t_tiba != null && (m == null || l.t_tiba < m) ? l.t_tiba : m, null), sampai: log.reduce((m, l) => l.t_tiba != null && (m == null || l.t_tiba > m) ? l.t_tiba : m, null)};
  const blok = [];
  const judul = (teks, tingkat = 2) => blok.push({tipe: "judul", tingkat, teks});
  const par = (teks, sumber) => blok.push(sumber ? {tipe: "paragraf", teks, sumber, waktu} : {tipe: "paragraf", teks});
  const tabel = (judulTabel, kepala, baris, sumber, kanan = [], bobot = null) => blok.push({tipe: "tabel", judul: judulTabel, kepala, baris, kanan, bobot, sumber, waktu});

  par(`Pilot Oktober 2026, ${tglPendek(rentang.dari)} sampai ${tglPendek(rentang.sampai)}.`, SUMBER.rentang);
  blok.push({tipe: "pil", teks: "pilot, n kecil", kelas: "asumsi-kebijakan"}, {tipe: "pil", teks: `data per ${jamWIB(per)}`, kelas: "terverifikasi"});

  /* kotak ringkasan halaman 1: tiga sampai lima temuan berangka */
  blok.push({tipe: "angka", label: "Sesi gelar tercatat", nilai: fmt(log.length), satuan: "sesi", sumber: SUMBER.log, waktu, keyakinan: "terverifikasi"},
    {tipe: "angka", label: "Tiba sampai air mengalir, terbaik", nilai: tibaAir.length ? durasiJam(Math.min(...tibaAir)) : "–", satuan: "", sumber: SUMBER.log, waktu, keyakinan: "terverifikasi"},
    {tipe: "angka", label: "Butir keputusan 53 yang lulus", nilai: `${fmt(lulus)} dari ${fmt(v.butir.length)}`, satuan: "butir", sumber: SUMBER.vonis, waktu, keyakinan: "asumsi-kebijakan"},
    {tipe: "angka", label: "Kelengkapan probe", nilai: persen(v.butir[4].nilai), satuan: "", sumber: SUMBER.probe, waktu, keyakinan: "terverifikasi"});

  judul("1. Dapat dipakai: tujuh butir keputusan 53");
  par(`Vonis dapat dipakai: ${v.vonis}. ${v.gagal.length ? `Butir yang belum lulus atau belum diputus: ${v.gagal.join(", ")}.` : "Semua butir lulus."} Vonis ini hanya menjawab apakah kit dapat dipakai, bukan apakah kit lebih baik dari cara konvensional.`, SUMBER.vonis);
  tabel("Tujuh butir keputusan 53", ["No", "Butir", "Nilai", "Status"], v.butir.map(b => [String(b.no), b.alasan, nilaiButir(b), statusButir(b.lulus)]), SUMBER.vonis, [], [1, 7, 4, 2.2]);

  judul("2. Lebih baik dari konvensional");
  par("Lebih baik dari konvensional: belum dapat diputus (n < 8 per lengan). Hasil pilot tidak dipakai untuk vonis G4; perbandingan lengan menunggu uji A/B.", SUMBER.vonis);

  judul("3. Sesi gelar dan durasi per tahap");
  if (!log.length) par("Belum ada sesi gelar tercatat dalam rentang ini.");
  else tabel("Sesi gelar", ["Tanggal", "Kit", "Regu", "Kelas", "Tiba-air", "Gelar", "Bongkar", "Panjang"],
    log.map(l => { const d = durasiLog(l); return [tglPendek(l.t_tiba), String(l.kit_kode ?? l.kit_id ?? "–"), String(l.nama_regu ?? "–"), String(l.kelas_medan ?? "–"), durasiJam(d.tiba_air), durasiJam(d.gelar), durasiJam(d.bongkar), l.panjang_m == null ? "–" : `${fmt(l.panjang_m)} m`]; }), SUMBER.log, [4, 5, 6, 7]);

  judul("4. Probe suhu sebelum, sesudah, dan 24 jam per petak");
  if (!probe.length) par("Belum ada pembacaan probe tercatat.");
  else tabel("Probe per petak, rerata semua titik dan kedalaman", ["Petak", "Titik", "Sebelum", "Sesudah", "24 jam", "Bacaan"], tabelProbe(probe), SUMBER.probe, [1, 2, 3, 4, 5]);

  judul("5. Air dan BBM");
  const air = jumlah(log, "air_m3"), bbm = jumlah(log, "bbm_l"), pompa = jumlah(log, "jam_pompa");
  tabel("Air, BBM, dan jam pompa", ["Besaran", "Jumlah", "Satuan"], [["Air terpompa", fmt(air), "m3"], ["BBM terpakai", fmt(bbm), "L"], ["Jam pompa", fmt(pompa), "jam"]], SUMBER.log, [1]);

  judul("6. Foto terpilih");
  const foto = (data.foto || []).filter(f => /^[0-9a-f]{16}$/.test(String(f.id))).slice(0, MAKS_FOTO);
  if (!foto.length) par("Belum ada foto dipilih untuk laporan ini.");
  for (const f of foto) blok.push({tipe: "foto", id: f.id, keterangan: `${jamWIB(f.waktu)}, ${f.regu ?? "regu tak tercatat"}, ${f.kit ?? "kit tak tercatat"}`});

  judul("7. Kendala");
  const kendala = (data.kendala || []).filter(k => typeof k === "string" && k.trim());
  if (!kendala.length) par("Belum ada kendala dicatat.");
  for (const k of kendala) par(k, "catatan kendala yang diisi staf");

  judul("8. Keputusan yang diminta");
  par("Keputusan yang diminta dari pimpinan: lanjutkan atau tidak penggunaan kit untuk operasi banjir. Dasarnya vonis dapat dipakai di atas; vonis lebih baik dari konvensional belum bisa dijadikan dasar.");

  return blok;
}

/* isiLaporan(jenis, data, {per, prov, provNama}) -> {judul, nama_berkas, blok, kaki, bulan, subjudul, aset, tanda_tangan} (DT §6.4) */
export function isiLaporan(jenis, data, opsi = {}) {
  if (!JENIS_LAPORAN.some(([k]) => k === jenis)) throw new RangeError("jenis laporan tidak dikenal");
  if (!JENIS_SIAP.includes(jenis)) throw new RangeError(`templat ${jenis} belum tersedia di versi ini`);
  const per = opsi.per;
  if (typeof per !== "number" || !Number.isFinite(per)) throw new RangeError("per wajib berupa waktu dalam milidetik");
  const prov = opsi.prov ? String(opsi.prov) : null, namaProv = opsi.provNama || (prov ? `provinsi ${prov}` : "Nasional");
  const label = JENIS_LAPORAN.find(([k]) => k === jenis)[1];
  const blok = pilotBlok(data || {}, per);
  return {judul: `Laporan ${label} SIPPA ${namaProv}`, nama_berkas: `sippa-${jenis}-${prov || "nasional"}-${tglKode(per)}.pdf`, subjudul: `Laporan ${label.toLowerCase()}`, bulan: bulanTahun(per),
    blok, kaki: `Dibuat otomatis dari data SIPPA per ${jamWIB(per)}. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang.`, aset: [...ASET_GAMBAR],
    tanda_tangan: ["Mengetahui,", "Jabatan:", "Nama:", "NIP:", "Tanggal:"]};
}
