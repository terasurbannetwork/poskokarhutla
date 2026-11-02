/* OP-5: metrik efektivitas Operasi Lapangan (spek 2026-11-02-operasi-lapangan.md bagian 7). FUNGSI MURNI, tanpa D1 dan tanpa impor worker:
   dipanggil src/operasi_udara.js (GET /api/operasi/nilai) dan diuji langsung. Tiap metrik = {nilai, n, jumlah, catatan?, alasan?}.
   nilai = pecahan 0..1 (M7: median menit); n = penyebut/kejadian; n < 5 -> nilai null, catatan "data kurang". M5, M8, M9, M10: null, alasan "data belum tersedia".
   Jarak 1 km = haversine. Pilihan sendiri: renlap per (tanggal, base) = versi pagi bila ada, selain itu malam; temuan tanpa jam_utc tidak masuk M7;
   temuan clear tanpa jam memakai akhir hari WIB sebagai awal jendela M4. */
export const KM = 1, NM_KM = 1.852, JELAJAH_NM = 120, MIN_N = 5, JAM = 3600e3;
const NULL_DATA = {nilai: null, n: 0, jumlah: 0, alasan: "data belum tersedia"};
const rad = x => x * Math.PI / 180;
export const jarakKm = (a, b, c, d) => { const h = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const dekat = (p, q, km = KM) => Math.abs(p.lat - q.lat) < 0.2 && jarakKm(p.lat, p.lon, q.lat, q.lon) <= km;
const bulat = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const akhirHari = t => Date.parse(`${t}T00:00:00+07:00`) + 24 * JAM;
/* bungkus: n < MIN_N -> nilai null (kejadian tetap dilaporkan di n dan jumlah) */
const rasio = (jumlah, n, extra = {}) => n < MIN_N ? {nilai: null, n, jumlah, catatan: "data kurang", ...extra} : {nilai: bulat(jumlah / n), n, jumlah, ...extra};
const tidakBerlaku = alasan => ({nilai: null, n: 0, jumlah: 0, alasan});

/* satu kelompok. g = {regs: Set|null (null = semua), targets: [..]|null (null = tak berlaku)}; D = bahan global (lihat hitungNilai) */
function kelompok(g, D) {
  const ada = r => !g.regs || g.regs.has(r);
  const tem = D.temuan.filter(t => ada(t.registrasi));
  const m = {};
  // M1 ketepatan target
  m.M1 = rasio(tem.filter(t => t.status !== "clear").length, tem.length);
  // M2 kepatuhan renlap, M3 temuan di luar renlap
  if (g.targets) {
    const dikunjungi = g.targets.filter(t => D.temuan.some(x => x.tanggal === t.tanggal && dekat(x, t)));
    m.M2 = rasio(dikunjungi.length, g.targets.length);
  } else m.M2 = tidakBerlaku("target renlap milik base, bukan registrasi");
  const dinilai = tem.filter(t => D.tanggalRenlap.has(t.tanggal));
  m.M3 = rasio(dinilai.filter(t => !D.targetPerTgl.get(t.tanggal).some(r => dekat(t, r))).length, dinilai.length, {keterangan: "jumlah = temuan di luar semua target renlap hari itu; hanya hari yang punya renlap"});
  // M4 padam bertahan
  const clear = tem.filter(t => t.status === "clear");
  if (!D.titik) m.M4 = {nilai: null, n: 0, jumlah: 0, alasan: "titik panas sistem tidak terbaca", tak_dinilai: clear.length};
  else {
    let n = 0, bertahan = 0;
    for (const t of clear) {
      const t0 = Number.isFinite(t.jam_utc) ? t.jam_utc : akhirHari(t.tanggal), t1 = t0 + 48 * JAM;
      if (D.titik.awal > t0 || D.titik.akhir < t1) continue;   // jendela 48 jam tidak tertutup data titik panas
      n++; if (!D.titik.titik.some(p => p.t >= t0 && p.t <= t1 && dekat(p, t))) bertahan++;
    }
    m.M4 = rasio(bertahan, n, {tak_dinilai: clear.length - n, ...n === 0 ? {alasan: "jendela 48 jam titik panas belum tertutup data"} : {}});
  }
  m.M5 = NULL_DATA;
  // M6 utilisasi: pesawat-hari siap/operasi/siaga yang punya gerak berangkat
  const sta = D.status.filter(s => ada(s.registrasi) && ["siap", "operasi", "siaga"].includes(s.status));
  m.M6 = rasio(sta.filter(s => D.berangkat.has(`${s.tanggal}|${s.registrasi}`)).length, sta.length);
  // M7 waktu respons: temuan berasap (berjam) -> gerak berangkat WB <= 1 km atau rujukan = registrasi patroli, menit
  const menit = []; let tanpa = 0;
  for (const t of tem.filter(t => t.status === "berasap" && Number.isFinite(t.jam_utc))) {
    const c = D.wb.filter(w => w.jam_utc >= t.jam_utc && w.jam_utc - t.jam_utc <= 24 * JAM && (w.rujukan === t.registrasi || (w.lat != null && dekat(w, t))));
    if (c.length) menit.push((Math.min(...c.map(w => w.jam_utc)) - t.jam_utc) / 60e3); else tanpa++;
  }
  m.M7 = menit.length < MIN_N ? {nilai: null, n: menit.length, jumlah: menit.length, catatan: "data kurang", tanpa_respons: tanpa}
    : {nilai: bulat(median(menit), 1), n: menit.length, jumlah: menit.length, satuan: "menit (median)", tanpa_respons: tanpa};
  m.M8 = NULL_DATA; m.M9 = NULL_DATA; m.M10 = NULL_DATA;
  // M11 heli WB siaga tanpa tugas: armada wb siaga/siap, hari ada temuan berasap <= 120 Nm dari basenya, tanpa gerak berangkat
  let n11 = 0, nganggur = 0;
  for (const a of D.armada.filter(a => ada(a.registrasi) && /wb/.test(a.peran) && D.base.get(a.base_id))) {
    const b = D.base.get(a.base_id);
    for (const [tgl, daftar] of D.berasapPerTgl) {
      if (!daftar.some(t => jarakKm(b.lat, b.lon, t.lat, t.lon) <= JELAJAH_NM * NM_KM)) continue;
      const s = D.statusMap.get(`${tgl}|${a.registrasi}`); if (s !== "siaga" && s !== "siap") continue;
      n11++; if (!D.berangkat.has(`${tgl}|${a.registrasi}`)) nganggur++;
    }
  }
  m.M11 = rasio(nganggur, n11, {keterangan: "jumlah = armada-hari siaga/siap tanpa gerak berangkat; n = armada-hari siaga/siap pada hari ada temuan berasap <= 120 Nm dari base"});
  return m;
}

/* masukan: {base:[op_base], armada:[op_armada], status:[op_armada_status], gerak:[op_gerak], temuan:[op_temuan], renlap:[{id,tanggal,versi,base_id}], target:[{renlap_id,lat,lon,jenis}],
   titik: null | {awal, akhir, titik:[{lat,lon,t}]} (ms epoch)} */
export function hitungNilai({base, armada, status, gerak, temuan, renlap, target, titik = null}) {
  const pilih = new Map();   // (tanggal|base) -> renlap terpilih: pagi mengalahkan malam
  for (const r of renlap) { const k = `${r.tanggal}|${r.base_id}`, a = pilih.get(k); if (!a || (r.versi === "pagi" && a.versi !== "pagi")) pilih.set(k, r); }
  const ren = new Map([...pilih.values()].map(r => [r.id, r]));
  const targets = target.filter(t => ren.has(t.renlap_id)).map(t => ({...t, tanggal: ren.get(t.renlap_id).tanggal, base_id: ren.get(t.renlap_id).base_id}));
  const targetPerTgl = new Map(); for (const t of targets) (targetPerTgl.get(t.tanggal) ?? targetPerTgl.set(t.tanggal, []).get(t.tanggal)).push(t);
  const berasapPerTgl = new Map(); for (const t of temuan) if (t.status === "berasap") (berasapPerTgl.get(t.tanggal) ?? berasapPerTgl.set(t.tanggal, []).get(t.tanggal)).push(t);
  const peran = new Map(armada.map(a => [a.registrasi, a.peran]));
  const D = {temuan, status, armada, base: new Map(base.map(b => [b.id, b])), titik, targetPerTgl, berasapPerTgl, tanggalRenlap: new Set(targetPerTgl.keys()),
    berangkat: new Set(gerak.filter(g => g.jenis === "berangkat").map(g => `${g.tanggal}|${g.registrasi}`)),
    wb: gerak.filter(g => g.jenis === "berangkat" && Number.isFinite(g.jam_utc) && /wb/.test(peran.get(g.registrasi) || "")),
    statusMap: new Map(status.map(s => [`${s.tanggal}|${s.registrasi}`, s.status]))};
  const regsBase = id => new Set(armada.filter(a => a.base_id === id).map(a => a.registrasi));
  const out = {semua: kelompok({regs: null, targets}, D), provinsi: {}, base: {}, registrasi: {}};
  for (const p of [...new Set(base.map(b => b.prov))].sort()) {
    const ids = base.filter(b => b.prov === p).map(b => b.id);
    out.provinsi[p] = kelompok({regs: new Set(ids.flatMap(i => [...regsBase(i)])), targets: targets.filter(t => ids.includes(t.base_id))}, D);
  }
  for (const b of base) out.base[b.id] = kelompok({regs: regsBase(b.id), targets: targets.filter(t => t.base_id === b.id)}, D);
  const aktif = new Set([...temuan.map(t => t.registrasi), ...gerak.map(g => g.registrasi), ...status.map(s => s.registrasi)]);
  for (const r of [...aktif].sort()) out.registrasi[r] = kelompok({regs: new Set([r]), targets: null}, D);
  return out;
}
