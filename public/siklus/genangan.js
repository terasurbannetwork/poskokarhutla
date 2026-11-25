/* Genangan radar di Kaji Cepat banjir_gfm (GS-11): fungsi murni, tanpa DOM dan tanpa jaringan, supaya bisa diuji di Node (tests/siklus/genangan_*.test.mjs).
   Aturan data/kajian-bnpb/genangan-satelit: tak teramati = teks alasan, bukan 0; rentang selalu dua ujung; antarsumber tidak dijumlah; tanpa kata aman, surut, terdampak. */
const bil = x => typeof x === "number" && Number.isFinite(x);
const N0 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 0}), N1 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 1});

/* ha atau jiwa: 1 desimal di bawah 100, bulat di atas 100, "rb" di atas 10.000; bukan angka = null (pemanggil menulis alasan) */
export const fmtAngka = n => !bil(n) ? null : n > 0 && n < 0.1 ? "kurang dari 0,1" : Math.abs(n) >= 1e4 ? `${N1.format(n / 1e3)} rb` : Math.abs(n) >= 100 ? N0.format(n) : N1.format(n);
/* persen kelas kecil tidak dibulatkan ke 0: yang ada tetap tertulis ada */
export const fmtPersenKelas = n => !bil(n) ? null : n > 0 && n < 0.1 ? "kurang dari 0,1" : N1.format(n);
export const fmtPersen = n => bil(n) ? `${N1.format(n)} persen` : null;
export const tglUtc = t => /^\d{4}-\d\d-\d\d/.test(t ?? "") ? new Date(t.slice(0, 10) + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : null;

/* rentang [bawah, atas] sah bila dua angka dan bawah <= atas */
export const rentangDari = o => bil(o?.bawah) && bil(o?.atas) && o.bawah <= o.atas ? [o.bawah, o.atas] : null;
export const rentangTulis = r => Array.isArray(r) && r.length === 2 && r.every(bil) && r[0] <= r[1] ? `${fmtAngka(r[0])} sampai ${fmtAngka(r[1])}` : null;

/* alasan teknis pipeline menjadi kalimat polos; teks yang tidak dikenal tidak diteruskan mentah */
export const alasanKab = a => /bangunan|grid|terkunci/i.test(a ?? "") ? "data bangunan belum tersedia untuk provinsi ini" : /tidak punya angka/i.test(a ?? "") ? "sumber tidak punya angka untuk kabupaten ini" : "belum dihitung";
export const alasanRentang = a => /bangunan/i.test(a ?? "") ? "data bangunan untuk kab sah belum tersedia" : "belum dihitung";

/* alasan satu kab tak sah, berurutan dari yang paling spesifik */
export function alasanTakSah(k) {
  if (k?.status === "tanpa_lintasan") return "belum ada lintasan";
  if (k?.status === "tanpa_pra") return "tidak ada citra pembanding sebelum kejadian";
  if (k?.status === "tanpa_cakupan") return "tidak teramati cukup";
  if (/sinyal/i.test(k?.alasan ?? "")) return "sinyal lemah";
  return bil(k?.cakupan_pct) ? `tidak teramati cukup (cakupan ${fmtPersen(k.cakupan_pct)})` : "tidak teramati cukup";
}

/* satu baris tabel; kab tak sah tidak membawa angka luas atau penduduk apa pun */
export function barisKab(k) {
  const sah = k?.sah === true && bil(k?.luas?.baru_ha), wp = k?.penduduk?.worldpop;
  const r = {kab4: String(k?.kab4 ?? ""), nama: k?.kab ?? String(k?.kab4 ?? ""), sah, lintasan: tglUtc(k?.lintasan), pra: tglUtc(k?.pra)};
  if (!sah) return {...r, baru: null, teramati: null, persenDari: null, pend: null, teks: alasanTakSah(k)};
  const pend = wp?.tersedia ? rentangDari(wp) : null;
  return {...r, baru: k.luas.baru_ha, teramati: bil(k.cakupan_pct) ? k.cakupan_pct : null, persenDari: bil(k.luas.persen_teramati) ? k.luas.persen_teramati : null,
    pend, pendAlasan: pend ? null : (wp?.alasan ?? "belum dihitung"), kisiKasar: k.kisi_kasar === true, teks: null};
}
/* urut: sah menurut tergenang baru (besar ke kecil), lalu tak sah menurut nama; tidak mengubah masukan */
export function urutKab(kab) {
  return (Array.isArray(kab) ? kab : []).map(barisKab).sort((a, b) => (b.sah - a.sah) || (a.sah ? b.baru - a.baru : a.nama.localeCompare(b.nama, "id")) || a.kab4.localeCompare(b.kab4));
}

/* kelas lahan dijumlah hanya dari kab sah (satu sumber, WorldCover); kelas kosong tidak keluar; persen dari jumlah kelas yang ada */
export function lahanGabung(kab) {
  const per = new Map(); let ada = 0, tanpa = 0;
  for (const k of Array.isArray(kab) ? kab : []) {
    if (k?.sah !== true) continue;
    if (!k.lahan || typeof k.lahan !== "object") { tanpa++; continue; }
    ada++;
    for (const [kode, v] of Object.entries(k.lahan)) if (bil(v?.ha) && v.ha > 0) { const e = per.get(kode) ?? {kode, nama: v.nama ?? `Kelas ${kode}`, ha: 0}; e.ha += v.ha; per.set(kode, e); }
  }
  const jml = [...per.values()].reduce((a, e) => a + e.ha, 0);
  const kelas = [...per.values()].sort((a, b) => b.ha - a.ha).map(e => ({...e, ha: e.ha, persen: jml > 0 ? e.ha / jml * 100 : null}));
  return {kelas, kabAda: ada, kabTanpa: tanpa, terbaca: kelas.length > 0};
}

/* ringkasan kartu: tiga angka dari ringkas D1; tanpa rentang = alasan, tidak pernah 0 */
export function ringkasKartu(ringkas) {
  const r = ringkas ?? {}, rentang = Array.isArray(r.rentang) && r.rentang.length === 2 && r.rentang.every(bil) ? r.rentang : null;
  return {luas: fmtAngka(r.luas_baru_ha), rentang, alasanRentang: rentang ? null : (r.alasan_rentang ?? "belum dihitung"),
    kabSah: bil(r.kab_sah) ? r.kab_sah : null, kabSemua: bil(r.kab_semua) ? r.kab_semua : null, lintasan: tglUtc(r.lintasan_terakhir), vonis: r.vonis ?? "menunggu",
    hipotesis: (r.status_model ?? "hipotesis") !== "teruji"};
}

/* citra satu kab dan satu jenis: pasangan {sebelum, sesudah} atau {alasan}; tanpa berkas pada salah satu sisi = alasan */
export const JENIS_CITRA = [["radar", "Radar", "gelombang"], ["asli", "Warna asli", "mata"], ["swir", "Semu SWIR", "jampasir"]];
export function citraKab(kab, jenis, sid) {
  const c = kab?.citra, pra = c?.[`${jenis}_pra`], pas = c?.[`${jenis}_pasca`];
  const url = b => `/api/siklus/kaji/${sid}/berkas/${b}`;
  if (pra?.berkas && pas?.berkas) return {sebelum: {src: url(pra.berkas), tgl: tglUtc(pra.tanggal) ?? "tanggal tidak tertulis"}, sesudah: {src: url(pas.berkas), tgl: tglUtc(pas.tanggal) ?? "tanggal tidak tertulis"}};
  const awan = [pra, pas].some(x => /awan/i.test(x?.status ?? ""));
  return {alasan: awan ? "tertutup awan" : "belum ada citra yang memenuhi syarat"};
}

/* kab yang dipilih awal: sah pertama menurut urutan tabel, bila tidak ada kab pertama */
export const kabAwal = kab => { const u = urutKab(kab); return (u.find(x => x.sah) ?? u[0])?.kab4 ?? null; };
export const polaSel = (sid, kab4) => /^\d{4}$/.test(String(kab4)) && /^[0-9a-f]{16}$/.test(String(sid)) ? `/api/siklus/kaji/${sid}/berkas/${kab4}_sel.geojson` : null;
