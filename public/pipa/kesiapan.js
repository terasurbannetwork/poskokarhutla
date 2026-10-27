/* SIPPA: kesiapan kit dan titik panas (keputusan 61: SP-104 kit siap gelar per depot, SP-105 kit terdekat, SP-107 lampu titik panas, SP-111 citra SWIR, SP-112 riwayat kompleks).
   Fungsi murni tanpa DOM; hanya pembangun HTML yang memakai global public/inti (fmt, esc, jamWIB). Tidak ada data di berkas ini.
   Batas data yang diakui di teks: koordinat kit boleh kosong, buku BBM boleh kosong ("BBM belum tercatat"), waktu tempuh dari model akses prioritas.json (estimasi model). */
import {laikGelar} from "./pelihara.js";
import {durasiLog} from "./hitung.js";
import {barisKoreksi} from "./layar_log.js";

/* ---------- SP-104 kit siap gelar ---------- */
export const BBM_PER_POMPA_L = 20;   // asumsi kebijakan: 20 liter per pompa per hari (teks regu pilot, teks.py KIT)
const KARHUTLA = ["gambut", "mineral"], DI_DEPOT = ["gudang", "depot"];

/* saldo bensin kit dari buku BBM: terima dan kembali menambah, keluar mengurangi; koreksi tidak punya arah di buku, jadi diabaikan. Tanpa baris bensin = null. */
export function saldoBbm(bbm) {
  const b = (bbm || []).filter(x => x.jenis === "bensin");
  if (!b.length) return null;
  return b.reduce((s, x) => s + (x.aksi === "keluar" ? -x.liter : x.aksi === "koreksi" ? 0 : x.liter), 0);
}
/* kebutuhan satu hari: jumlah pompa dari BOM (kode P-...), minimal satu */
export const perluBbm = komp => BBM_PER_POMPA_L * Math.max(1, (komp || []).filter(c => /^P-/.test(c.kode_bom)).reduce((s, c) => s + (c.jumlah || 0), 0));

/* rinci = {komponen, bbm} dari rincian kit, atau null bila belum dimuat. siap hanya bila ketiganya true: BBM belum tercatat = belum siap. */
export function kesiapanKit(kit, rinci) {
  const ditempat = DI_DEPOT.includes(kit.status) && KARHUTLA.includes(kit.jenis);
  const lengkap = kit.komponen_kurang == null ? null : kit.komponen_kurang === 0;
  const laik = rinci ? laikGelar(rinci.komponen, []).laik : null;
  const saldo = rinci ? saldoBbm(rinci.bbm) : null, perlu = rinci ? perluBbm(rinci.komponen) : null;
  const bbm = saldo == null ? null : saldo >= perlu;
  return {ditempat, laik, lengkap, bbm, saldo, perlu, siap: ditempat && laik === true && lengkap === true && bbm === true};
}

/* satu baris per depot (lokasi kit) untuk kit karhutla di gudang atau depot depan */
export function ringkasDepot(kits, rincian = {}) {
  const grup = new Map();
  for (const k of kits || []) {
    const s = kesiapanKit(k, rincian[k.id] ?? null);
    if (!s.ditempat) continue;
    const nama = k.lokasi || "Lokasi belum dicatat", g = grup.get(nama) ?? {depot: nama, n: 0, siap: 0, laik: 0, lengkap: 0, bbmCukup: 0, bbmBelum: 0};
    g.n++; if (s.siap) g.siap++; if (s.laik) g.laik++; if (s.lengkap) g.lengkap++; if (s.bbm) g.bbmCukup++; if (s.bbm == null) g.bbmBelum++;
    grup.set(nama, g);
  }
  return [...grup.values()].sort((a, b) => b.siap - a.siap || a.depot.localeCompare(b.depot));
}

export const MAKS_RINCIAN = 12;
const calonRincian = kits => (kits || []).filter(k => kesiapanKit(k, null).ditempat && /^[0-9a-f]{16}$/.test(k.id));
/* jumlah kit di depot yang rinciannya tidak dimuat (di atas MAKS_RINCIAN) */
export const kitTerpotong = kits => Math.max(0, calonRincian(kits).length - MAKS_RINCIAN);

export function kesiapanHtml(depot, terpotong = 0) {
  if (!depot.length) return `<p class="ad-kosong">Belum ada kit gambut atau mineral di gudang atau depot depan.</p>`;
  const total = depot.reduce((s, d) => ({n: s.n + d.n, siap: s.siap + d.siap}), {n: 0, siap: 0});
  return `<p class="sp-siap-judul"><b class="num">${esc(fmt(total.siap))}</b> dari ${esc(fmt(total.n))} kit siap gelar</p>
    <ul class="sp-siap">${depot.map(d => `<li><b>${esc(d.depot)}</b><span class="sp-siap-n num">${esc(fmt(d.siap))} dari ${esc(fmt(d.n))} siap</span>
      <small>laik ${esc(fmt(d.laik))}, lengkap ${esc(fmt(d.lengkap))}, BBM cukup ${esc(fmt(d.bbmCukup))}${d.bbmBelum ? `, BBM belum tercatat ${esc(fmt(d.bbmBelum))}` : ""}</small></li>`).join("")}</ul>
    <p class="ad-catat">Siap = laik (tidak ada komponen K1 sampai K3 rusak berat atau hilang), lengkap (tanpa komponen hilang), dan bensin tercatat sedikitnya ${esc(fmt(BBM_PER_POMPA_L))} liter per pompa (asumsi kebijakan). BBM belum tercatat dihitung belum siap.</p>${terpotong > 0 ? `<p class="ad-catat">Rincian ${esc(fmt(MAKS_RINCIAN))} kit pertama; ${esc(fmt(terpotong))} kit lain belum dihitung siap.</p>` : ""}`;
}

/* muat rincian kit yang ada di depot, paling banyak maks; yang gagal dimuat tidak masuk (laik dan BBM jadi tak diketahui, bukan karangan) */
export async function muatRincian(ambil, kits, sinyal, maks = MAKS_RINCIAN) {
  const calon = calonRincian(kits).slice(0, maks);
  const hasil = await Promise.allSettled(calon.map(k => ambil(`/api/sippa/kit/${k.id}`, sinyal)));
  return Object.fromEntries(calon.map((k, i) => [k.id, hasil[i].status === "fulfilled" ? {komponen: hasil[i].value.komponen || [], bbm: hasil[i].value.bbm || []} : null]).filter(([, v]) => v));
}

/* ---------- SP-105 dan SP-107 lampu titik panas ---------- */
export const LAMPU = {
  hijau: {huruf: "H", teks: "Hijau: ada kit siap dan kompleks terjangkau darat"},
  kuning: {huruf: "K", teks: "Kuning: terjangkau darat, tidak ada kit siap di provinsi"},
  merah: {huruf: "M", teks: "Merah: tidak terjangkau darat (jalan kaki lebih dari 5 km)"},
  abu: {huruf: "?", teks: "Abu-abu: tanpa kompleks dalam 2 km atau akses belum diketahui"},
};
export const RADIUS_KOMPLEKS_KM = 2;

export function jarakKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
}
export function kompleksTerdekat(lat, lon, kompleks, maks = RADIUS_KOMPLEKS_KM) {
  let m = null;
  const dl = maks / 111 + 0.001, dn = dl / Math.max(0.05, Math.cos(lat * Math.PI / 180));   // prafilter kotak: haversine hanya untuk kandidat
  for (const k of kompleks || []) { if (k.lat == null || k.lon == null || Math.abs(k.lat - lat) > dl || Math.abs(k.lon - lon) > dn) continue; const d = jarakKm(lat, lon, k.lat, k.lon); if (d <= maks && (!m || d < m.km)) m = {k, km: d}; }
  return m;
}
/* konteks lampu: kompleks provinsi, baris prioritas.json, kit provinsi dengan rincian (untuk siap) */
export function buatKonteks(kompleks, prioritas, kits, rincian) {
  const pri = new Map((prioritas?.kompleks || []).map(r => [r.id, r]));
  const siap = (kits || []).filter(k => kesiapanKit(k, rincian?.[k.id] ?? null).siap);
  return {kompleks, pri, siap, berkoor: siap.filter(k => k.lat != null && k.lon != null)};   // disaring sekali, bukan per titik
}
/* darat dari prioritas.json bila kompleks ada di sana; selain itu dari model akses kelayakan (jam_tiba terisi = terjangkau); selain itu tidak diketahui */
export function lampuTitik(lat, lon, ctx) {
  const t = kompleksTerdekat(lat, lon, ctx.kompleks);
  if (!t) return {lampu: "abu", alasan: "Tidak ada kompleks dalam 2 km."};
  const p = ctx.pri.get(t.k.id), darat = p ? p.darat : t.k.jam_tiba != null ? true : null;
  const dasar = {kompleks: t.k.id, kmKompleks: t.km, menit: p?.menit ?? null, dari: p?.dari ?? null, nKitSiap: ctx.siap.length};
  let berkoor = null;
  for (const k of ctx.berkoor ?? ctx.siap.filter(x => x.lat != null && x.lon != null)) { const km = jarakKm(lat, lon, k.lat, k.lon); if (!berkoor || km < berkoor.km) berkoor = {kode: k.kode, lokasi: k.lokasi, km}; }
  const kit = {...dasar, kitTerdekat: berkoor};
  if (darat == null) return {lampu: "abu", alasan: `Kompleks ${t.k.id}: akses belum diketahui.`, ...kit};
  if (darat === false) return {lampu: "merah", alasan: `Kompleks ${t.k.id} tidak terjangkau darat.`, ...kit};
  return {lampu: ctx.siap.length ? "hijau" : "kuning", alasan: `Kompleks ${t.k.id} terjangkau darat${p ? "" : " (model akses kelayakan)"}.`, ...kit};
}
/* teks pop-up titik: kit terdekat tanpa koordinat dinyatakan terus terang, waktu tempuh adalah estimasi model dari posko ke kompleks */
export function teksTitik(l) {
  const kit = l.nKitSiap === undefined ? "" : l.kitTerdekat ? `Kit siap terdekat ${l.kitTerdekat.kode}${l.kitTerdekat.lokasi ? ` (${l.kitTerdekat.lokasi})` : ""}, ${fmt(l.kitTerdekat.km)} km garis lurus.`
    : l.nKitSiap ? `${fmt(l.nKitSiap)} kit siap di provinsi; koordinat kit belum dicatat, jarak tidak dihitung.` : "Tidak ada kit siap di provinsi.";
  const waktu = l.menit != null ? ` Waktu tempuh dari ${l.dari ?? "posko terdekat"} ke kompleks ${fmt(l.menit)} menit (estimasi model).` : "";
  return `${l.alasan} ${kit}${waktu}`.trim();
}
/* properti datar fitur peta -> bentuk lampuTitik (dibentuk saat klik, bukan JSON per fitur) */
export const titikDariProps = p => ({lampu: p.lampu, alasan: p.alasan, nKitSiap: p.nKitSiap, menit: p.menit ?? null, dari: p.dari ?? null, kitTerdekat: p.kitKode ? {kode: p.kitKode, lokasi: p.kitLokasi, km: p.kitKm} : null});
export const propsTitik = l => { const p = {lampu: l.lampu, huruf: LAMPU[l.lampu].huruf, alasan: l.alasan}; if (l.kompleks) p.kompleks = l.kompleks; if (l.nKitSiap !== undefined) p.nKitSiap = l.nKitSiap; if (l.menit != null) p.menit = l.menit; if (l.dari) p.dari = l.dari;
  if (l.kitTerdekat) { p.kitKode = l.kitTerdekat.kode; p.kitKm = l.kitTerdekat.km; if (l.kitTerdekat.lokasi) p.kitLokasi = l.kitTerdekat.lokasi; } return p; };
export const popupTitik = l => `<div class="sp-pop"><div class="sp-pop-kepala"><b tabindex="-1">Titik panas</b><span>${esc(LAMPU[l.lampu].huruf)}</span></div><p>${esc(LAMPU[l.lampu].teks)}</p><p class="ad-catat">${esc(teksTitik(l))}</p></div>`;
export const legendaLampuHtml = () => `<b class="sp-leg-judul">Lampu titik panas (huruf dan warna)</b>
  <ul class="sp-leg-lampu">${Object.entries(LAMPU).map(([k, v]) => `<li><i class="sp-lampu sp-lampu-${k}">${esc(v.huruf)}</i>${esc(v.teks)}</li>`).join("")}</ul>
  <p class="sp-leg-sumber">Kit siap dihitung per provinsi; kit tanpa koordinat tidak punya jarak.</p>`;

/* ---------- SP-111 citra SWIR ---------- */
const empat = v => new Intl.NumberFormat("en-US", {minimumFractionDigits: 4, maximumFractionDigits: 4, useGrouping: false}).format(v);
export function tautanSwir(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return `https://browser.dataspace.copernicus.eu/?zoom=14&lat=${empat(lat)}&lng=${empat(lon)}&themeId=DEFAULT-THEME&datasetId=S2_L2A_CDAS&layerId=6-SWIR&date=latest`;
}
export function swirHtml(lat, lon) {
  const t = tautanSwir(lat, lon);
  return t ? `<p class="sp-swir"><a href="${esc(t)}" target="_blank" rel="noopener noreferrer">Lihat citra satelit SWIR terbaru</a><small class="ad-catat">Bara dan api tampak oranye terang; perlu akun Copernicus gratis.</small></p>` : "";
}

/* ---------- SP-112 riwayat kompleks ---------- */
/* log: baris /api/sippa/log (boleh belum dikoreksi). Hasil: gelar karhutla di kompleks ini, terbaru dulu, dengan waktu tiba sampai air mengalir bila tercatat. */
export function riwayatGelar(kompleksId, log) {
  return barisKoreksi(log || []).filter(l => l.kompleks_id === kompleksId && l.jenis === "karhutla")
    .map(l => ({waktu: l.t_tiba ?? l.waktu_klien, kit: l.kit_kode ?? null, kelas: l.kelas_medan ?? null, tibaAir: durasiLog(l).tiba_air, lance: l.air_sampai_lance === 1 ? true : l.air_sampai_lance === 0 ? false : null, kecelakaan: l.kecelakaan === 1}))
    .sort((a, b) => b.waktu - a.waktu);
}
const tgl = ms => new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
const hasilGelar = g => [g.tibaAir == null ? "waktu air mengalir belum tercatat" : `air mengalir ${fmt(g.tibaAir)} jam setelah tiba`, g.lance === true ? "air sampai di lance" : g.lance === false ? "air tidak sampai di lance" : "", g.kecelakaan ? "ada kecelakaan" : ""].filter(Boolean).join(", ");
/* log === null: gagal dimuat; array: dimuat */
export function riwayatHtml(k, log) {
  const bakar = k.terbakar_n_2km == null ? "tidak tercatat" : `${fmt(k.terbakar_n_2km)} tahun dalam 2 km${k.terbakar_akhir ? `, terakhir ${k.terbakar_akhir}` : ""}`;
  const gelar = log === null ? `<p class="ad-catat">Riwayat gelar tidak bisa dimuat.</p>` : (() => {
    const r = riwayatGelar(k.id, log);
    return r.length ? `<ul class="sp-daftar">${r.map(g => `<li><b>${esc(tgl(g.waktu))}</b>${g.kit ? ` ${esc(g.kit)}` : ""}${g.kelas ? `, kelas ${esc(g.kelas)}` : ""}: ${esc(hasilGelar(g))}</li>`).join("")}</ul>` : `<p class="ad-catat">Belum pernah digelar SIPPA di kompleks ini.</p>`;
  })();
  return `<div class="sp-riwayat"><h3 class="sp-saran-judul">Riwayat kompleks</h3><p>Terbakar (MCD64A1): ${esc(bakar)}.</p>${gelar}</div>`;
}
/* satu baris ringkas untuk pop-up */
export function riwayatSingkat(kompleksId, log) {
  if (log == null) return null;
  const r = riwayatGelar(kompleksId, log);
  return r.length ? `${fmt(r.length)} kali, terakhir ${tgl(r[0].waktu)}` : "belum pernah";
}
