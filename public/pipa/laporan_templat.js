/* SIPPA: empat templat laporan sisa (PRD §9.10, SP-044): kejadian, mingguan, musim, skenario, dan penyaring bahan bersama (dummy dan wilayah).
   Fungsi murni: tanpa DOM, tanpa jaringan, tanpa jam sendiri (waktu datang dari opsi.per). Keluaran sama bentuknya dengan isiLaporan di laporan_isi.js (blok judul, paragraf,
   tabel, angka, pil, foto) sehingga pratinjau dan PDF yang sama merendernya. Templat pilot tetap di laporan_isi.js (isiLaporan, JENIS_SIAP) dan tidak disentuh di sini.
   Butuh global public/inti: fmt, jamWIB. Teks blok adalah teks polos; pelolosan markup dilakukan perender HTML. */
import {durasiLog, kuantil, nKecil, co2} from "./hitung.js";
import {JENIS_LAPORAN, ASET_GAMBAR} from "./laporan_isi.js";
import {BATAS_ALAT} from "./batas.js";

export const JENIS_TEMPLAT = ["kejadian", "mingguan", "musim", "skenario"];
const ZONA = {timeZone: "Asia/Jakarta"}, HARI = 864e5;
const SUMBER = {log: "log gelar lapangan (sippa_log_gelar)", probe: "probe suhu gambut (sippa_probe)", gerak: "gerak kit (sippa_gerak)", komp: "komponen kit (sippa_komponen)", alarm: "alarm telemetri (sippa_alarm)",
  tugas: "penugasan regu (sippa_tugas)", ab: "petak A/B (sippa_petak), hipotesis", skenario: "skenario Studio tersimpan (sippa_skenario)", rentang: "rentang yang dipilih staf", gerbang: "status gerbang yang diisi staf", batas: "Batas pemakaian alat (G22, G23)"};
export const GERBANG = ["G0", "G1", "G2", "G3", "G4", "G5", "G6"];
export const TEKS_ALASAN = {pra_posisi: "Pra-posisi", gelar: "Gelar", bongkar: "Bongkar", pindah_banjir: "Pindah ke banjir", kembali: "Kembali ke gudang", servis: "Servis", hilang: "Hilang", ditemukan: "Ditemukan", pensiun: "Pensiun", koreksi: "Koreksi"};
export const TEKS_ALARM = {hisap_rendah: "Hisap rendah", debit_rendah: "Debit rendah", dry_run: "Pompa kering", tekanan_lebih: "Tekanan berlebih", belum_dingin: "Belum dingin", co_tinggi: "CO tinggi", bbm_rendah: "BBM rendah", diam: "Perangkat diam"};

const tgl = ms => ms == null ? "–" : new Date(ms).toLocaleDateString("id-ID", {...ZONA, day: "numeric", month: "short", year: "numeric"});
const tglKode = ms => new Date(ms).toLocaleDateString("en-CA", ZONA).replaceAll("-", "");
const jamTeks = ms => ms == null ? "–" : jamWIB(ms);
const bulanTahun = ms => new Date(ms).toLocaleDateString("id-ID", {...ZONA, month: "long", year: "numeric"});
const jam = h => h == null ? "–" : `${fmt(Math.round(h * 10) / 10)} jam`;
const num = (v, satuan = "") => typeof v === "number" && Number.isFinite(v) ? `${fmt(v)}${satuan ? " " + satuan : ""}` : "–";
const jumlah = (xs, k) => { const v = xs.map(x => x[k]).filter(n => typeof n === "number" && Number.isFinite(n)); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
const urut = (a, b) => String(a).localeCompare(String(b));
const terhitung = v => v === 1 || v === true;

/* ================= penyaring bahan: SATU pintu untuk semua templat (dan templat pilot lewat layar_laporan.bahanPilot) =================
   Aturan: baris dummy tidak pernah masuk laporan nyata; log berpenerus koreksi dibuang; wilayah ketat (prov log, atau prov kit bila log tanpa prov; tanpa keduanya = tidak dipakai);
   baris anak (probe, gerak, alarm) yang induknya terbuang ikut terbuang; jendela waktu dipakai bila diberikan. */
export function milikProv(l, prov) { return !prov || l.prov === prov || (l.prov == null && l.kit_prov === prov); }
export function saringBahan(b = {}, {prov = null, sejak = null, sampai = null} = {}) {
  const hidup = r => !terhitung(r?.dummy);
  const dalamWaktu = (ms, lebar = true) => ms == null ? lebar : (sejak == null || ms >= sejak) && (sampai == null || ms <= sampai);
  const semua = (b.log || []).filter(hidup), dikoreksi = new Set(semua.map(l => l.koreksi_dari).filter(Boolean));
  const log = semua.filter(l => !dikoreksi.has(l.id) && milikProv(l, prov) && dalamWaktu(l.t_tiba));
  const idLog = new Set(log.map(l => l.id)), tugasBuang = new Set(), logBuang = new Set();
  for (const l of (b.log || [])) if (!idLog.has(l.id)) { logBuang.add(l.id); if (l.tugas_id) tugasBuang.add(l.tugas_id); }
  for (const l of log) tugasBuang.delete(l.tugas_id);
  const kitProv = new Map((b.kit || []).map(k => [k.id, k.prov]));
  const anak = r => hidup(r) && !(r.log_id && logBuang.has(r.log_id)) && !(r.tugas_id && tugasBuang.has(r.tugas_id));
  const kitDalam = r => !prov || r.prov === prov || (r.prov == null && (r.kit_prov ?? kitProv.get(r.kit_id)) === prov);
  return {log,
    probe: (b.probe || []).filter(anak),
    gerak: (b.gerak || []).filter(r => anak(r) && kitDalam(r) && dalamWaktu(r.waktu, false)),
    alarm: (b.alarm || []).filter(r => hidup(r) && kitDalam(r) && (r.mulai == null || sampai == null || r.mulai <= sampai) && (r.ditutup == null || sejak == null || r.ditutup >= sejak)),
    tugas: (b.tugas || []).filter(r => hidup(r) && (!prov || r.prov === prov)),
    komponen: (b.komponen || []).filter(hidup),
    bbm: (b.bbm || []).filter(r => hidup(r) && dalamWaktu(r.waktu, false))};
}

/* ================= perakit blok bersama ================= */
function perakit(per) {
  const waktu = `per ${jamWIB(per)}`, blok = [];
  return {blok, waktu,
    judul: (teks, tingkat = 2) => blok.push({tipe: "judul", tingkat, teks}),
    par: (teks, sumber) => blok.push(sumber ? {tipe: "paragraf", teks, sumber, waktu} : {tipe: "paragraf", teks}),
    tabel: (judulTabel, kepala, baris, sumber, kanan = [], bobot = null) => blok.push({tipe: "tabel", judul: judulTabel, kepala, baris, kanan, bobot, sumber, waktu}),
    angka: (label, nilai, satuan, sumber, keyakinan = "terverifikasi") => blok.push({tipe: "angka", label, nilai, satuan, sumber, waktu, keyakinan}),
    pil: (teks, kelas) => blok.push({tipe: "pil", teks, kelas})};
}
const KEYAKINAN_DATA = "terverifikasi";
function bungkus(jenis, per, opsi, blok) {
  const prov = opsi.prov ? String(opsi.prov) : null, namaProv = opsi.provNama || (prov ? `provinsi ${prov}` : "Nasional"), label = JENIS_LAPORAN.find(([k]) => k === jenis)[1];
  return {judul: `Laporan ${label} SIPPA ${namaProv}`, nama_berkas: `sippa-${jenis}-${prov || "nasional"}-${tglKode(per)}.pdf`, subjudul: `Laporan ${label.toLowerCase()}`, bulan: bulanTahun(per), blok,
    kaki: `Dibuat otomatis dari data SIPPA per ${jamWIB(per)}. Bukan dokumen resmi sebelum ditandatangani pejabat berwenang.`, aset: [...ASET_GAMBAR], tanda_tangan: ["Mengetahui,", "Jabatan:", "Nama:", "NIP:", "Tanggal:"]};
}
const tabelProbe = probe => {
  const per = new Map();
  for (const r of probe) { if (!per.has(r.petak_id)) per.set(r.petak_id, {titik: new Set(), n: 0, tahap: {sebelum: [], sesudah: [], "24j": []}}); const p = per.get(r.petak_id); p.titik.add(r.titik); p.n++; if (typeof r.suhu_c === "number" && p.tahap[r.tahap]) p.tahap[r.tahap].push(r.suhu_c); }
  const rer = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null, s = (p, t) => p.tahap[t].length ? `${fmt(rer(p.tahap[t]))} °C` : "–";
  return [...per.entries()].sort((a, b) => urut(a[0], b[0])).map(([id, p]) => [String(id ?? "–"), fmt(p.titik.size), s(p, "sebelum"), s(p, "sesudah"), s(p, "24j"), fmt(p.n)]);
};

/* ================= kejadian: satu sesi gelar ================= */
function kejadian(d, per) {
  const l = d.log, a = perakit(per), dur = durasiLog(l), tugas = d.tugas || null;
  a.par(`Kejadian di ${l.kab ?? tugas?.kab ?? "kabupaten tak tercatat"}, ${tgl(l.t_tiba)}.`, SUMBER.log);
  a.pil(`data per ${jamWIB(per)}`, KEYAKINAN_DATA);
  a.angka("Tiba sampai air mengalir", jam(dur.tiba_air), "", SUMBER.log); a.angka("Panjang gelar", num(l.panjang_m), "m", SUMBER.log); a.angka("Air terpompa", num(l.air_m3), "m3", SUMBER.log); a.angka("BBM terpakai", num(l.bbm_l), "L", SUMBER.log);
  a.judul("1. Lokasi dan pelaksana");
  a.tabel("Lokasi dan pelaksana", ["Butir", "Isi"], [["Kabupaten", String(l.kab ?? tugas?.kab ?? "–")], ["Kompleks", String(l.kompleks_id ?? tugas?.kompleks_id ?? "–")], ["Kit", String(l.kit_kode ?? l.kit_id ?? "–")], ["Regu", String(l.nama_regu ?? tugas?.nama_regu ?? "–")],
    ["Kelas medan", String(l.kelas_medan ?? "–")], ["Jenis", String(l.jenis ?? "–")], ["Jumlah orang", num(l.n_orang)]], SUMBER.log, [], [3, 7]);
  a.judul("2. Garis waktu tahap");
  const T = [["Tiba", l.t_tiba], ["Mulai gelar", l.t_mulai_gelar], ["Air mengalir", l.t_air_mengalir], ["Mulai injeksi", l.t_mulai_injeksi], ["Selesai", l.t_selesai], ["Bongkar selesai", l.t_bongkar_selesai]];
  let sebelum = null;
  a.tabel("Garis waktu tahap", ["Tahap", "Waktu (WIB)", "Sejak tahap sebelumnya"], T.map(([n, t]) => { const r = [n, jamTeks(t), t != null && sebelum != null ? jam((t - sebelum) / 36e5) : "–"]; if (t != null) sebelum = t; return r; }), SUMBER.log, [], [3, 5, 4]);
  a.judul("3. Angka sesi");
  const ada = l.bbm_jenis === "bensin" || l.bbm_jenis === "solar", kg = ada && typeof l.bbm_l === "number" ? co2(l.bbm_l, l.bbm_jenis) : null;
  a.tabel("Angka sesi", ["Besaran", "Nilai", "Satuan"], [["Jam pompa", num(l.jam_pompa), "jam"], ["Air terpompa", num(l.air_m3), "m3"], ["BBM terpakai", num(l.bbm_l), "L"], ["CO2 dari BBM", kg == null ? "–" : fmt(kg), "kg"], ["Tekanan ujung", num(l.p_ujung_bar), "bar"], ["Kecelakaan", num(l.kecelakaan), "kejadian"]], SUMBER.log, [1]);
  if (kg == null) a.par("CO2 BBM tidak dihitung karena jenis BBM (bensin atau solar) tidak tercatat di log ini.", SUMBER.log);
  a.judul("4. Probe suhu");
  const probe = (d.probe || []);
  if (!probe.length) a.par("Belum ada pembacaan probe tercatat untuk kejadian ini."); else a.tabel("Probe per petak, rerata semua titik dan kedalaman", ["Petak", "Titik", "Sebelum", "Sesudah", "24 jam", "Bacaan"], tabelProbe(probe), SUMBER.probe, [1, 2, 3, 4, 5]);
  a.judul("5. Foto");
  const foto = (d.foto || []).filter(f => /^[0-9a-f]{16}$/.test(String(f.id))).slice(0, 6);
  if (!foto.length) a.par("Belum ada foto dipilih untuk laporan ini.");
  for (const f of foto) a.blok.push({tipe: "foto", id: f.id, keterangan: `${jamTeks(f.waktu)}, ${f.regu ?? "regu tak tercatat"}, ${f.kit ?? "kit tak tercatat"}`});
  return a.blok;
}

/* ================= mingguan: tujuh hari ================= */
export function ringkasPerKit(log, tugas = []) {
  const kab = new Map(tugas.map(t => [t.id, t.kab])), per = new Map();
  for (const l of log) {
    const k = `${l.kit_kode ?? l.kit_id ?? "–"}|${l.kab ?? kab.get(l.tugas_id) ?? "tidak tercatat"}`, p = per.get(k) ?? {kit: l.kit_kode ?? l.kit_id ?? "–", kab: l.kab ?? kab.get(l.tugas_id) ?? "tidak tercatat", sesi: 0, pompa: 0, banjir: 0, bbm: 0};
    p.sesi++; p.pompa += l.jam_pompa || 0; p.banjir += l.banjir_m3 || 0; p.bbm += l.bbm_l || 0; per.set(k, p);
  }
  return [...per.values()].sort((a, b) => urut(a.kit, b.kit) || urut(a.kab, b.kab));
}
export function kehilangan(komponen) {
  const per = new Map();
  for (const c of komponen) { const k = c.kit_kode ?? c.kit_id ?? "–", p = per.get(k) ?? {kit: k, n: 0, hilang: 0}; p.n++; if (c.kondisi === "hilang") p.hilang++; per.set(k, p); }
  return [...per.values()].sort((a, b) => urut(a.kit, b.kit));
}
export const tugasAktif = (tugas, kini) => tugas.filter(t => !t.dicabut && (t.mulai == null || t.mulai <= kini) && (t.berakhir == null || t.berakhir > kini));
function mingguan(d, per, rentang) {
  const a = perakit(per), log = d.log || [], gerak = [...(d.gerak || [])].sort((x, y) => x.waktu - y.waktu), rk = ringkasPerKit(log, d.tugas || []), kh = kehilangan(d.komponen || []), alarm = d.alarm || [];
  const aktif = tugasAktif(d.tugas || [], rentang.sampai ?? per);
  a.par(`Minggu ${tgl(rentang.dari)} sampai ${tgl(rentang.sampai)}.`, SUMBER.rentang); a.pil(`data per ${jamWIB(per)}`, KEYAKINAN_DATA);
  a.angka("Gerak kit", fmt(gerak.length), "gerak", SUMBER.gerak); a.angka("Jam pompa", num(jumlah(log, "jam_pompa")), "jam", SUMBER.log); a.angka("Air banjir terpompa", num(jumlah(log, "banjir_m3")), "m3", SUMBER.log); a.angka("Alarm telemetri", fmt(alarm.length), "alarm", SUMBER.alarm);
  a.judul("1. Gerak kit");
  if (!gerak.length) a.par("Tidak ada gerak kit tercatat dalam rentang ini."); else a.tabel("Gerak kit", ["Waktu", "Kit", "Dari", "Ke", "Alasan", "Kabupaten"], gerak.map(g => [jamTeks(g.waktu), String(g.kit_kode ?? g.kit_id ?? "–"), String(g.dari_status ?? "–"), String(g.ke_status ?? "–"), TEKS_ALASAN[g.alasan] ?? String(g.alasan ?? "–"), String(g.kab ?? "–")]), SUMBER.gerak);
  a.judul("2. Jam pompa dan air banjir per kit dan kabupaten");
  if (!rk.length) a.par("Belum ada sesi gelar atau pemakaian banjir tercatat dalam rentang ini."); else a.tabel("Pemakaian per kit dan kabupaten", ["Kit", "Kabupaten", "Sesi", "Jam pompa", "Air banjir (m3)", "BBM (L)"], rk.map(p => [p.kit, p.kab, fmt(p.sesi), fmt(p.pompa), fmt(p.banjir), fmt(p.bbm)]), SUMBER.log, [2, 3, 4, 5]);
  a.judul("3. BBM");
  const bbmLog = jumlah(log, "bbm_l"), bbmCatat = jumlah((d.bbm || []).filter(b => b.aksi === "isi" || b.aksi == null), "liter");
  a.tabel("BBM", ["Sumber catatan", "Liter"], [["Log gelar", num(bbmLog)], ["Catatan pengisian BBM", num(bbmCatat)]], SUMBER.log, [1]);
  a.judul("4. Kehilangan komponen");
  if (!kh.length) a.par("Belum ada komponen kit tercatat."); else a.tabel("Kehilangan komponen per kit", ["Kit", "Komponen", "Hilang", "Persen hilang"], kh.map(k => [k.kit, fmt(k.n), fmt(k.hilang), `${fmt(Math.round(k.hilang / k.n * 1000) / 10)}%`]), SUMBER.komp, [1, 2, 3]);
  a.judul("5. Alarm telemetri");
  if (!alarm.length) a.par("Tidak ada alarm telemetri dalam rentang ini."); else a.tabel("Alarm telemetri", ["Mulai", "Kit", "Tag", "Jenis", "Nilai", "Ditutup"], alarm.map(x => [jamTeks(x.mulai), String(x.kit_kode ?? x.kit_id ?? "–"), String(x.tag ?? "–"), TEKS_ALARM[x.kode] ?? String(x.kode), num(x.nilai), x.ditutup == null ? "masih aktif" : jamTeks(x.ditutup)]), SUMBER.alarm);
  a.judul("6. Tugas aktif");
  if (!aktif.length) a.par("Tidak ada penugasan regu yang aktif pada akhir rentang."); else a.tabel("Tugas aktif", ["Regu", "Kit", "Kabupaten", "Mulai", "Berakhir"], aktif.map(t => [String(t.nama_regu ?? "–"), String(t.kit_kode ?? t.kit_id ?? "–"), String(t.kab ?? "–"), jamTeks(t.mulai), t.berakhir == null ? "tanpa batas" : jamTeks(t.berakhir)]), SUMBER.tugas);
  return a.blok;
}

/* ================= musim: satu musim per provinsi ================= */
export function perKelas(log) {
  const k = {};
  for (const l of log) { const n = l.kelas_medan ?? "tanpa kelas"; (k[n] ??= []).push(durasiLog(l).tiba_air); }
  return Object.keys(k).sort(urut).map(n => { const ys = k[n].filter(x => x != null); return {kelas: n, sesi: k[n].length, n: ys.length, p50: kuantil(ys, .5), p90: kuantil(ys, .9), kecil: nKecil(ys.length)}; });
}
/* U9 pemakaian ganda: kit yang bekerja di karhutla DAN di banjir dalam musim yang sama */
export function pemakaianGanda(log) {
  const kar = new Set(), ban = new Set();
  for (const l of log) { const k = l.kit_kode ?? l.kit_id; if (k == null) continue; if (l.jenis === "banjir" || (l.banjir_m3 || 0) > 0) ban.add(k); if (l.jenis !== "banjir" && l.jenis !== "latihan") kar.add(k); }
  const ganda = [...kar].filter(k => ban.has(k)).sort(urut);
  return {ganda, karhutla: kar.size, banjir: ban.size};
}
function musim(d, per, rentang) {
  const a = perakit(per), log = d.log || [], nyata = log.filter(l => l.jenis !== "latihan"), latihan = log.filter(l => l.jenis === "latihan"), kls = perKelas(nyata), g = pemakaianGanda(log), kh = kehilangan(d.komponen || []);
  const hilang = kh.reduce((s, k) => s + k.hilang, 0), total = kh.reduce((s, k) => s + k.n, 0), ab = d.ab || [];
  a.par(`Musim ${tgl(rentang.dari)} sampai ${tgl(rentang.sampai)}.`, SUMBER.rentang); a.pil(`data per ${jamWIB(per)}`, KEYAKINAN_DATA);
  a.angka("Sesi gelar nyata", fmt(nyata.length), "sesi", SUMBER.log); a.angka("Latihan G6", fmt(latihan.length), "sesi", SUMBER.log); a.angka("Kit dipakai ganda karhutla dan banjir", fmt(g.ganda.length), "kit", SUMBER.log); a.angka("Komponen hilang", total ? `${fmt(Math.round(hilang / total * 1000) / 10)}%` : "–", "", SUMBER.komp);
  a.judul("1. Jumlah gelar per kelas medan");
  if (!kls.length) a.par("Belum ada sesi gelar nyata dalam musim ini."); else { a.tabel("Gelar per kelas medan", ["Kelas", "Sesi", "Dengan waktu lengkap", "P50 tiba-air", "P90 tiba-air", "Catatan"], kls.map(k => [k.kelas, fmt(k.sesi), fmt(k.n), jam(k.p50), jam(k.p90), k.kecil ? "n kecil" : ""]), SUMBER.log, [1, 2, 3, 4]); a.par("Kelas dengan n kecil (kurang dari 5 ulangan) tidak dipakai menyimpulkan ambang.", SUMBER.log); }
  a.judul("2. Perbandingan A/B per lengan");
  a.pil("hipotesis", "hipotesis");
  if (!ab.length) a.par("Belum ada petak A/B pada musim ini."); else a.tabel("Ringkasan A/B per lengan", ["Lengan", "Petak", "Vonis G4", "Keterangan"], ab.map(x => [String(x.nama), fmt(x.n), String(x.vonis ?? "tidak divonis, data pilot"), String(x.keterangan ?? "")]), SUMBER.ab);
  a.judul("3. Pemakaian ganda banjir (U9)");
  a.par(g.ganda.length ? `Kit yang dipakai di karhutla dan banjir pada musim ini: ${g.ganda.join(", ")} (${fmt(g.ganda.length)} dari ${fmt(g.karhutla)} kit yang dipakai di karhutla).` : `Tidak ada kit yang tercatat dipakai di karhutla dan banjir sekaligus (${fmt(g.karhutla)} kit dipakai di karhutla).`, SUMBER.log);
  a.judul("4. Kehilangan komponen (U8)");
  if (!kh.length) a.par("Belum ada komponen kit tercatat."); else a.tabel("Kehilangan per kit", ["Kit", "Komponen", "Hilang", "Persen hilang"], kh.map(k => [k.kit, fmt(k.n), fmt(k.hilang), `${fmt(Math.round(k.hilang / k.n * 1000) / 10)}%`]), SUMBER.komp, [1, 2, 3]);
  a.judul("5. Latihan (G6)");
  a.par(`${fmt(latihan.length)} sesi latihan tercatat, terpisah dari sesi nyata.`, SUMBER.log);
  a.judul("6. Pelajaran");
  const pel = (d.pelajaran || []).filter(x => typeof x === "string" && x.trim());
  if (!pel.length) a.par("Belum ada pelajaran dicatat."); for (const p of pel) a.par(p, "catatan pelajaran yang diisi staf");
  a.judul("7. Status gerbang G0 sampai G6");
  const st = new Map((d.gerbang || []).map(x => [x.kode, x]));
  a.tabel("Status gerbang", ["Gerbang", "Status", "Catatan"], GERBANG.map(k => [k, String(st.get(k)?.status ?? "belum dinilai"), String(st.get(k)?.catatan ?? "")]), SUMBER.gerbang);
  return a.blok;
}

/* ================= skenario Studio ================= */
function skenario(d, per) {
  const a = perakit(per), sk = d.skenario || [];
  a.par(`${fmt(sk.length)} skenario Studio dibandingkan.`, SUMBER.skenario); a.pil("hipotesis, bukan bukti efektivitas", "hipotesis");
  a.judul("1. Matriks banding");
  if (!sk.length) a.par("Belum ada skenario dipilih."); else a.tabel("Matriks banding skenario", ["Skenario", "Vonis", "CAPEX (Rp)", "TCO (Rp)", "Hambatan keras"], sk.map(s => [String(s.nama), String(s.ringkas?.vonis ?? "–"), num(s.ringkas?.capex), num(s.ringkas?.tco), num(s.ringkas?.keras)]), SUMBER.skenario, [2, 3, 4]);
  a.judul("2. Gerbang");
  a.par(sk.length ? "Vonis hanya NO-GO, HOLD, atau KONDISIONAL; satu gerbang keras cukup membuat NO-GO, berapa pun skor dan biayanya." : "Belum ada skenario, belum ada gerbang yang dinilai.", SUMBER.skenario);
  a.judul("3. BOQ ringkas");
  const boq = sk.filter(s => Array.isArray(s.boq) && s.boq.length);
  if (!boq.length) a.par("BOQ belum tersimpan di skenario yang dipilih; buka skenario di Studio lalu simpan ulang."); for (const s of boq) a.tabel(`BOQ ${s.nama}`, ["Item", "Jumlah", "Total (Rp)"], s.boq.slice(0, 15).map(x => [String(x.nama), num(x.jumlah), num(x.total)]), SUMBER.skenario, [1, 2]);
  a.judul("4. NPV dan BCR tiga skenario manfaat");
  a.par("Manfaat bawaan 0 di semua skenario, sehingga NPV dan BCR hanya berarti bila manfaat diisi sendiri dengan sumber yang bisa ditelusuri.", SUMBER.batas);
  a.judul("5. Monte Carlo");
  const mc = sk.filter(s => s.mc && typeof s.mc.p50 === "number");
  if (!mc.length) a.par("Hasil Monte Carlo belum tersimpan di skenario yang dipilih."); else a.tabel("Monte Carlo TCO (Rp)", ["Skenario", "P10", "P50", "P90"], mc.map(s => [String(s.nama), num(s.mc.p10), num(s.mc.p50), num(s.mc.p90)]), SUMBER.skenario, [1, 2, 3]);
  a.judul("6. Batas pemakaian alat");
  for (const t of BATAS_ALAT) a.par(t, SUMBER.batas);
  return a.blok;
}

/* ================= pintu masuk ================= */
/* isiTemplat(jenis, data, {per, prov, provNama, rentang:{dari, sampai}}); data harus sudah lewat saringBahan (pemanggil: layar_laporan) */
export function isiTemplat(jenis, data, opsi = {}) {
  if (!JENIS_TEMPLAT.includes(jenis)) throw new RangeError("jenis templat tidak dikenal");
  const per = opsi.per; if (typeof per !== "number" || !Number.isFinite(per)) throw new RangeError("per wajib berupa waktu dalam milidetik");
  const rentang = opsi.rentang || {dari: per - 7 * HARI, sampai: per};
  if (jenis === "kejadian" && !(data?.log && typeof data.log === "object")) throw new RangeError("kejadian wajib membawa satu sesi gelar (data.log)");
  const blok = jenis === "kejadian" ? kejadian(data, per) : jenis === "mingguan" ? mingguan(data || {}, per, rentang) : jenis === "musim" ? musim(data || {}, per, rentang) : skenario(data || {}, per);
  return bungkus(jenis, per, opsi, blok);
}
