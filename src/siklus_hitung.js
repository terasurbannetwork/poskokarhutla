/* Siklus Bencana bagian F1: fungsi murni, tanpa D1 dan tanpa jaringan (ALGORITMA F1.2, F1.5, F1.7, F1.8). Dipakai rute (src/siklus_kejadian.js).
   Bagian F4 (Jitupasna, R3P) dan F5 (renkon) ditambah tiket gelombangnya, di berkas ini. Kembaran JS di peramban: public/siklus/hitung.js (tiket layar). */

export const BASI_HARI = 3, PENGAMAN_ALIAS = 32;
export const ALFABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford base32: tanpa I, L, O, U
export const RE_KJ = /^KJ-\d{4}-[0-9A-HJKMNP-TV-Z]{8}$/;
export const FASE = ["terdeteksi", "terverifikasi", "tanggap", "transisi", "pemulihan", "selesai"];   // urutan hidup (ALUR 2.1)

/* ID = "KJ-" + tahun(tgl_mulai) + "-" + 8 simbol dari 40 bit pertama SHA-256(kunci). Tabrakan: n >= 2 menghash ulang `kunci|n`, panjang tetap 16.
   kunci = jenis_utama|kab_utama|tgl_mulai_iso; tahun diambil dari kolom ketiganya. */
export async function idKejadian(kunci, n = 1) {
  const [, , tgl] = String(kunci).split("|");
  if (!/^\d{4}-\d\d-\d\d$/.test(tgl ?? "")) throw new Error("kunci pendiri harus jenis|kab|YYYY-MM-DD");
  if (!Number.isInteger(n) || n < 1) throw new Error("n harus bilangan bulat >= 1");
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(n > 1 ? `${kunci}|${n}` : kunci)));
  let v = 0n; for (let i = 0; i < 5; i++) v = (v << 8n) | BigInt(d[i]);
  let kode = ""; for (let i = 0; i < 8; i++) kode += ALFABET[Number((v >> BigInt(35 - 5 * i)) & 31n)];
  return `KJ-${tgl.slice(0, 4)}-${kode}`;
}
/* kunci pendiri: jenis (satu atau lebih) diurut naik lalu digabung "+"; kab_utama = kode kab4 Kemendagri terkecil */
export const kunciPendiri = (jenis, kab4, mulai) => `${[].concat(jenis).sort().join("+")}|${[].concat(kab4).sort()[0]}|${mulai}`;

/* ID bebas pertama: cobaAda(id) mengembalikan (Promise<)boolean) apakah ID sudah dipakai (D1, termasuk dibatalkan/digabung). Dibatasi 50 percobaan. */
export async function idBebas(kunci, cobaAda) {
  for (let n = 1; n <= 50; n++) { const id = await idKejadian(kunci, n); if (!(await cobaAda(id))) return id; }
  throw new Error("tidak menemukan ID bebas setelah 50 percobaan");
}

/* Angka berdampingan (F1.7): nilai = {sumber: angka|null}. Tanpa total dan tanpa rata-rata; null bukan nol. */
export function selisihAntarsumber(nilai) {
  const ada = Object.entries(nilai ?? {}).filter(([, v]) => typeof v === "number" && Number.isFinite(v));
  const n = ada.length;
  if (n < 2) return {n, selisih: null, arah: null, persen: null};
  const maks = ada.reduce((a, b) => (b[1] > a[1] ? b : a)), min = ada.reduce((a, b) => (b[1] < a[1] ? b : a));
  const selisih = maks[1] - min[1];
  return {n, selisih, arah: {maks: maks[0], min: min[0]}, persen: maks[1] > 0 ? (selisih * 100) / maks[1] : null};
}
/* satu metrik per kunci: dampak per sumber `{sumber: {metrik: {n, y, t}}}` -> {metrik: selisihAntarsumber(...)}; hanya metrik yang dilaporkan sumber mana pun */
export function selisihDampak(perSumber) {
  const metrik = new Set(); for (const d of Object.values(perSumber ?? {})) for (const k of Object.keys(d ?? {})) metrik.add(k);
  return [...metrik].sort().map(m => ({metrik: m, ...selisihAntarsumber(Object.fromEntries(Object.entries(perSumber).map(([s, d]) => [s, d?.[m]?.n ?? null])))}));
}

/* Alias (F1.5): ambil(id) -> {fase, ke} | null (Promise boleh). Ikuti `ke` sampai fase bukan digabung. Lebih dari 32 langkah, putaran, atau mata rantai hilang = gagal keras. */
export async function resolusiAlias(id, ambil) {
  const lihat = new Set();
  let sekarang = id;
  for (let i = 0; i <= PENGAMAN_ALIAS; i++) {
    const b = await ambil(sekarang);
    if (!b) throw new Error(`alias putus di ${sekarang}`);
    if (b.fase !== "digabung") return sekarang;
    if (lihat.has(sekarang)) throw new Error(`alias berputar di ${sekarang}`);
    lihat.add(sekarang);
    if (!b.ke) throw new Error(`${sekarang} digabung tanpa ke`);
    sekarang = b.ke;
  }
  throw new Error(`rantai alias lebih dari ${PENGAMAN_ALIAS} langkah dari ${id}`);
}

/* Basi (F1.8): hanya tampilan, fase tidak berubah. Tanggal YYYY-MM-DD. */
export const hariAntara = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);
export const basi = (terakhir, hariIni, batas = BASI_HARI) => hariAntara(terakhir, hariIni) > batas;

/* Fase sah (cermin trigger sk_kejadian_fase, migrations/0120): maju/mundur satu langkah, terdeteksi -> dibatalkan, fase hidup mana pun -> digabung */
export function faseSah(dari, ke) {
  const i = FASE.indexOf(dari), j = FASE.indexOf(ke);
  if (i >= 0 && ke === "digabung") return true;
  if (dari === "terdeteksi" && ke === "dibatalkan") return true;
  return i >= 0 && j >= 0 && Math.abs(i - j) === 1;
}

/* k-anonim publik (KEAMANAN 2.6): angka korban atau terdampak di bawah 5 ditulis "di bawah 5"; null tetap null ("tidak ada") */
export const angkaPublik = n => n == null ? null : n < 5 ? "di bawah 5" : n;

/* ================================================================ F4 Jitupasna ke R3P (ALGORITMA F4.1 sampai F4.8). Fungsi murni; label harga selalu asumsi-kebijakan (U4, U8); kosong = "menunggu", bukan 0. */
export const TINGKAT_F4 = ["hancur", "rb", "rs", "rr"];   // urut harga turun (monoton: h_hancur >= h_rb >= h_rs >= h_rr)
export const TINGKAT_RUMAH = {berat: "rb", sedang: "rs", ringan: "rr"};   // rumah_rusak.tingkat ke F4 (tanpa tabel kedua)
export const MENUNGGU = "menunggu";

/* F4.1: p > 70 RB; 30 <= p <= 70 RS; p < 30 RR. Di luar 0..100 atau bukan angka = null. */
export const klasifikasiTingkat = p => typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 100 ? null : p > 70 ? "rb" : p >= 30 ? "rs" : "rr";

/* F4.2: h = h_ref x (IKK_k / IKK_ref) x (IHPB_t1 / IHPB_t0). Indeks tidak diberikan sama sekali = tanpa penyesuaian (faktor 1);
   separuh pasangan, nol atau minus, atau melintasi patahan dasar IHPB = "menunggu". */
export function hargaTerindeks({href, ikkK = null, ikkRef = null, ihpb1 = null, ihpb0 = null, patahan = false}) {
  if (typeof href !== "number" || !(href > 0)) return {nilai: null, status: MENUNGGU, alasan: "harga dasar kosong"};
  const pasang = (a, b, nama) => { if (a == null && b == null) return 1; if (!(a > 0) || !(b > 0)) throw new Error(nama); return a / b; };
  if (patahan) return {nilai: null, status: MENUNGGU, alasan: "seri IHPB melintasi patahan dasar"};
  try { const faktor = pasang(ikkK, ikkRef, "pasangan IKK tidak lengkap") * pasang(ihpb1, ihpb0, "pasangan IHPB tidak lengkap"); return {nilai: href * faktor, status: "asumsi-kebijakan", faktor}; }
  catch (e) { return {nilai: null, status: MENUNGGU, alasan: e.message}; }
}

/* F4.3: V_s = jumlah_t (n x h). baris: [{sektor, tingkat, unit}]; harga(sektor, tingkat) -> angka|null. Sektor yang memakai tingkat tanpa harga = menunggu (bukan 0);
   total null bila ada sektor menunggu. Monoton dilaporkan, tidak diperbaiki. */
export function nilaiKerusakan(baris, harga) {
  const per = {};
  for (const b of baris) {
    if (!b.unit && b.unit !== 0) continue;
    const s = per[b.sektor] ??= {nilai: 0, menunggu: false, unit: {}};
    s.unit[b.tingkat] = (s.unit[b.tingkat] ?? 0) + b.unit;
    if (b.unit === 0) continue;
    const h = harga(b.sektor, b.tingkat);
    if (typeof h !== "number") s.menunggu = true; else s.nilai += b.unit * h;
  }
  for (const [sektor, s] of Object.entries(per)) {
    const hs = TINGKAT_F4.map(t => [t, harga(sektor, t)]).filter(([, h]) => typeof h === "number"), langgar = [];
    for (let i = 1; i < hs.length; i++) if (hs[i][1] > hs[i - 1][1]) langgar.push(`${hs[i][0]} > ${hs[i - 1][0]}`);
    s.monoton = {ok: langgar.length === 0, langgar};
    const hancur = harga(sektor, "hancur");   // kewajaran: V_s tidak melebihi semua unit dihargai hancur; tanpa harga hancur tidak dinilai
    s.wajar = s.menunggu || typeof hancur !== "number" ? null : s.nilai <= Object.values(s.unit).reduce((a, n) => a + n, 0) * hancur;
    if (s.menunggu) s.nilai = null;
  }
  const semua = Object.values(per);
  return {per, total: semua.some(s => s.menunggu) ? null : semua.reduce((a, s) => a + s.nilai, 0), menunggu: semua.some(s => s.menunggu)};
}

/* F4.4: L_s = jumlah_c (arus x bulan); baris jenis rugi: [{sektor, komponen, arus_rp, bulan}]. Baris tanpa arus_rp atau bulan tidak dijumlah (bukan 0 diam-diam):
   dihitung per sektor di `dibuang` dan menandai hasil `menunggu: true`. */
export function nilaiKerugian(baris) {
  const per = {}, dibuang = {};
  for (const b of baris) { if (typeof b.arus_rp !== "number" || typeof b.bulan !== "number") { dibuang[b.sektor] = (dibuang[b.sektor] ?? 0) + 1; continue; } per[b.sektor] = (per[b.sektor] ?? 0) + b.arus_rp * b.bulan; }
  return {per, total: Object.keys(per).length ? Object.values(per).reduce((a, n) => a + n, 0) : null, dibuang, menunggu: Object.keys(dibuang).length > 0};
}

/* F4.5: pemetaan subsektor Jitupasna ke lima sektor Perban 5/2017 Pasal 8 ayat (2); tafsir bawaan menurut nama subsektor R3 1.2, menunggu U10 */
export const SEKTOR_R3P = ["permukiman", "infrastruktur", "ekonomi", "sosial", "lintas_sektor"];
export const PETA_SEKTOR = {perumahan: "permukiman", jalan_jembatan: "infrastruktur", telekomunikasi: "infrastruktur", air_sanitasi: "infrastruktur",
  pertanian: "ekonomi", perikanan: "ekonomi", ikm: "ekonomi", perdagangan: "ekonomi", pariwisata: "ekonomi", kesehatan: "sosial", pendidikan: "sosial", agama: "sosial", sosial_budaya: "sosial",
  lingkungan: "lintas_sektor", sarana_pemerintahan: "lintas_sektor", keuangan_perbankan: "lintas_sektor", ketertiban_keamanan: "lintas_sektor"};
/* nilai: {subsektor: V_s angka|null} (kerusakan saja, tanpa kerugian: ALG F4.5). Sektor tanpa satu pun angka = null (bukan 0); `menunggu` mendaftar sektor tanpa angka
   dan sektor yang sebagian subsektornya null. Invarian: lima sektor + belum_terpeta (yang berangka) = total; total null bila tak satu pun berangka. */
export function petaLimaSektor(nilai) {
  const kunci = [...SEKTOR_R3P, "belum_terpeta"], r = Object.fromEntries(kunci.map(k => [k, null])), sebagian = new Set();
  for (const [s, v] of Object.entries(nilai)) {
    const k = Object.hasOwn(PETA_SEKTOR, s) ? PETA_SEKTOR[s] : "belum_terpeta";
    if (typeof v === "number") r[k] = (r[k] ?? 0) + v; else sebagian.add(k);
  }
  const ada = kunci.filter(k => r[k] !== null), menunggu = SEKTOR_R3P.filter(k => r[k] === null || sebagian.has(k));
  return {...r, total: ada.length ? ada.reduce((a, k) => a + r[k], 0) : null, menunggu};
}

/* tiga penanda (Kotak 1 hal. 41): hitung ganda (komponen kerugian sama di dua sektor atau lebih), cakupan (sektor R3P tanpa isian), kewajaran (monoton atau V_s > semua unit hancur) */
export function tigaPenanda({kerusakan, barisRugi, sektorTerisi}) {
  const per = new Map(); for (const b of barisRugi) { const k = String(b.komponen); (per.get(k) ?? per.set(k, new Set()).get(k)).add(b.sektor); }
  const ganda = [...per].filter(([, s]) => s.size > 1).map(([komponen, s]) => ({komponen, sektor: [...s].sort()}));
  const terisi = new Set([...sektorTerisi].map(s => PETA_SEKTOR[s] ?? "belum_terpeta"));
  const kosong = SEKTOR_R3P.filter(s => !terisi.has(s));
  const wajar = Object.entries(kerusakan.per).filter(([, s]) => s.wajar === false || !s.monoton.ok).map(([sektor]) => sektor);
  return {hitung_ganda: ganda, kosong, tidak_wajar: wajar};
}

/* F4.6: stimulan 60/30/15 juta (asumsi-kebijakan, U8: sumber sekunder; 50/25/10 dan 80 juta tidak dipakai); DTH Rp600.000 x 3 bulan per KK (Juklak DTH 1/2023) */
export const TARIF_STIMULAN = {rb: 60e6, rs: 30e6, rr: 15e6}, DTH_RP = 600000, DTH_BULAN = 3;
export const stimulan = ({rb, rs, rr}) => [rb, rs, rr].every(n => typeof n === "number") ? {nilai: rb * TARIF_STIMULAN.rb + rs * TARIF_STIMULAN.rs + rr * TARIF_STIMULAN.rr, yakin: "asumsi-kebijakan"} : {nilai: null, yakin: MENUNGGU};
export const dth = kk => typeof kk === "number" ? {nilai: kk * DTH_RP * DTH_BULAN, yakin: "resmi"} : {nilai: null, yakin: MENUNGGU};

/* F4.7: sisa_90 = 90 - hari berlalu sejak tanggap darurat dimulai (<= 0: lewat batas, bukan penolakan); PDNA BNPB = akhir darurat - 14 hari, BPBD = - 7 hari */
export const sisa90 = (tanggapMulai, hariIni) => { if (!tanggapMulai) return {berlalu: null, sisa: null, lewat: null}; const berlalu = hariAntara(tanggapMulai, hariIni); return {berlalu, sisa: 90 - berlalu, lewat: 90 - berlalu <= 0}; };
const geserTgl = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export const pdna = akhirDarurat => akhirDarurat ? {bnpb: geserTgl(akhirDarurat, -14), bpbd: geserTgl(akhirDarurat, -7)} : {bnpb: null, bpbd: null};

/* F4.8: persen per kegiatan = realisasi / target x 100 (target kosong atau 0 = menunggu; realisasi > target anomali, tampil maks 100);
   total tertimbang nilai hanya bila semua nilai terisi dan satuan sama; selain itu "menunggu". */
export function persenRealisasi(kegiatan) {
  const per = kegiatan.map(k => {
    if (!(k.target > 0) || typeof k.realisasi !== "number") return {id: k.id, persen: null, status: MENUNGGU};
    const mentah = k.realisasi / k.target * 100;
    return {id: k.id, persen: Math.min(mentah, 100), anomali: mentah > 100, status: "terukur"};
  });
  const lengkap = kegiatan.length > 0 && kegiatan.every((k, i) => typeof k.nilai === "number" && per[i].persen != null);
  const bobot = lengkap ? kegiatan.reduce((a, k) => a + k.nilai, 0) : 0;
  return {per, total: lengkap && bobot > 0 ? kegiatan.reduce((a, k, i) => a + k.nilai * per[i].persen / 100, 0) / bobot * 100 : null, yakin: "asumsi-kebijakan"};
}
/* macet: tahap sama lebih dari batas hari (rehab_macet_hari = 60, jam_aturan.json, asumsi) sejak masuk tahap; dibaca saat halaman dibuka */
export const macet = (masukTahap, hariIni, batas = 60) => !!masukTahap && hariAntara(masukTahap, hariIni) > batas;

/* ================================================================ F5 Renkon Hidup dan Gladi (ALGORITMA F5.1 sampai F5.5). Fungsi murni; stok dan personel dibaca, tidak disalin. Tanpa data = "menunggu", bukan 0. */
const bulanAkhir = (t, n) => {   // tambah n bulan, hari dipangkas ke akhir bulan (2024-02-29 + 36 bulan = 2027-02-28)
  const [y, m, d] = t.split("-").map(Number), tot = y * 12 + (m - 1) + n, yy = Math.floor(tot / 12), mm = tot % 12;
  const akhir = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${String(yy).padStart(4, "0")}-${String(mm + 1).padStart(2, "0")}-${String(Math.min(d, akhir)).padStart(2, "0")}`;
};
export const tambahBulan = bulanAkhir;
const bulat = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/* F5.1 kebutuhan dasar Perka 7/2008 dari J jiwa, h hari, KK keluarga (isian; tempat sampah menunggu bila kosong). Hanya USULAN asumsi, tidak menimpa isian staf. */
export function kebutuhanDasar({jiwa, hari, kk = null}) {
  const ok = Number.isInteger(jiwa) && jiwa >= 0 && Number.isInteger(hari) && hari >= 1;
  if (!ok) return {status: MENUNGGU, alasan: "jiwa dan hari belum diisi", yakin: MENUNGGU};
  const J = jiwa, h = hari, bln = Math.ceil(h / 30), p = (nilai, satuan) => ({nilai, satuan});
  return {status: "usulan", yakin: "estimasi-model", jiwa: J, hari: h,
    komponen: {penampungan: p(3 * J, "m2"), beras: p(bulat(0.4 * J * h), "kg"), makan: p(2 * J * h, "porsi"), energi: p(2100, "kkal per orang per hari"),
      air_bersih: p(J * (7 * Math.min(h, 3) + 15 * Math.max(h - 3, 0)), "liter"), air_minum: p(bulat(2.5 * J * h), "liter"), jamban: p(Math.ceil(J / 20), "unit"),
      tempat_sampah: Number.isInteger(kk) && kk >= 0 ? p(Math.ceil(kk / 10), "unit") : {nilai: null, satuan: "unit", status: MENUNGGU},
      sabun_mandi: p(bulat(0.25 * J * bln), "kg"), sabun_cuci: p(bulat(0.2 * J * bln), "kg")},
    sphere: {penampungan: p(bulat(3.5 * J), "m2"), air_bersih: p(15 * J * h, "liter"), yakin: "hipotesis", catatan: "pembanding Sphere 2018, tidak menggantikan Perka 7/2008"}};
}

/* F5.2 kesenjangan stok: hanya komponen yang berpadanan dengan barang LogPal (beras, air mineral). stok = {baik, rusak, belum, satuan} dari kondisi di gudang wilayah, atau null (tak tercatat). */
export const PADANAN = {beras: {satuan: "kg", pola: /beras/i}, air_minum: {satuan: "liter", pola: /air\s*(mineral|minum)/i}};
export function kesenjanganItem(nama, k, stok, padanan = Object.hasOwn(PADANAN, nama)) {
  if (!padanan) return {nama, status: "tidak punya padanan", gap: null, surplus: null, yakin: "estimasi-model"};
  if (!stok || !Number.isFinite(stok.baik)) return {nama, status: "stok belum tercatat", gap: null, surplus: null, yakin: "estimasi-model"};
  if (stok.satuan !== k.satuan) return {nama, status: "satuan beda, menunggu", gap: null, surplus: null, satuan_stok: stok.satuan, yakin: "estimasi-model"};
  const K = k.nilai, S = stok.baik;
  return {nama, status: "dihitung", kebutuhan: K, stok_baik: S, gap: Math.max(0, K - S), surplus: Math.max(0, S - K), rusak: stok.rusak ?? 0, belum_dinilai: stok.belum ?? 0, satuan: k.satuan, yakin: "estimasi-model"};   // kebutuhan = rumus Perka 7/2008 atas asumsi jiwa dan hari: estimasi, bukan angka resmi
}
export const kesenjanganPersonel = (target, siap) => typeof target !== "number" || !(target > 0) ? {status: "target menunggu", target: null, siap: siap ?? null, gap: null, yakin: "asumsi-kebijakan"}
  : typeof siap !== "number" ? {status: "personel belum tercatat", target, siap: null, gap: null, yakin: "asumsi-kebijakan"} : {status: "dihitung", target, siap, gap: Math.max(0, target - siap), yakin: "asumsi-kebijakan"};   // target isian staf: asumsi kebijakan

/* F5.3 kesegaran: berlaku_sampai = tgl_sah + 36 bulan (Perban 2/2023 Pasal 21 ayat 1); reviu jatuh 6 bulan sesudah yang terbaru dari tgl_sah dan reviu_terakhir (ayat 2). */
export function kesegaran({tgl_sah, reviu_terakhir = null, berlaku_sampai = null, hariIni, segeraHari = 90}) {
  if (!tgl_sah) return {status: MENUNGGU, berlaku_sampai: null, sisa: null, reviu_jatuh: null};
  const sampai = berlaku_sampai ?? tambahBulan(tgl_sah, 36), sisa = hariAntara(hariIni, sampai);
  const acuan = reviu_terakhir && reviu_terakhir > tgl_sah ? reviu_terakhir : tgl_sah, jatuh = tambahBulan(acuan, 6);
  const status = sisa < 0 ? "kedaluwarsa" : sisa <= segeraHari ? "segera_habis" : jatuh < hariIni ? "perlu_reviu" : "berlaku";
  return {status, berlaku_sampai: sampai, sisa, reviu_jatuh: jatuh};
}

/* F5.4 skor kesiapan gladi: rerata komponen tersedia (0..1) x 100, "n dari 4 komponen"; kurang dari 2 komponen = menunggu. */
export function skorGladi({kesegaran: seg = null, barang = [], personel = null, rekomendasi = null}) {
  const k1 = seg == null || seg === MENUNGGU ? null : seg === "kedaluwarsa" ? 0 : 1;
  const ada = barang.filter(b => b.status === "dihitung" && b.kebutuhan > 0), k2 = ada.length ? ada.reduce((a, b) => a + Math.min(1, b.stok_baik / b.kebutuhan), 0) / ada.length : null;
  const k3 = personel && personel.status === "dihitung" ? Math.min(1, personel.siap / personel.target) : null;
  const k4 = Array.isArray(rekomendasi) && rekomendasi.length ? rekomendasi.filter(r => r && r.tertaut).length / rekomendasi.length : null;
  const komp = {k1, k2, k3, k4}, tersedia = Object.values(komp).filter(v => v != null);
  if (tersedia.length < 2) return {skor: null, status: MENUNGGU, komponen: komp, tersedia: tersedia.length, label: `${tersedia.length} dari 4 komponen`, yakin: "asumsi-kebijakan"};
  return {skor: bulat(tersedia.reduce((a, v) => a + v, 0) / tersedia.length * 100), status: "dihitung", komponen: komp, tersedia: tersedia.length, label: `${tersedia.length} dari 4 komponen`, yakin: "asumsi-kebijakan"};
}

/* F5.5 pemutaran ulang: entri [{waktu (ms), sumber, metrik, nilai}] urut waktu, lalu sumber, lalu metrik; T_i = (waktu_i - waktu_pertama) jam / c. Nilai diinjeksikan apa adanya. */
export function putarUlang(entri, c = 1) {
  if (typeof c !== "number" || !Number.isFinite(c) || c < 1) throw new Error("percepatan harus angka >= 1");
  const e = entri.filter(x => Number.isFinite(x.waktu) && typeof x.nilai === "number").sort((a, b) => a.waktu - b.waktu || String(a.sumber).localeCompare(b.sumber) || String(a.metrik).localeCompare(b.metrik));
  if (!e.length) return {langkah: [], percepatan: c, yakin: "terverifikasi", label: "Model sederhana, bukan prakiraan"};
  const t0 = e[0].waktu;
  return {langkah: e.map(x => ({t_jam: bulat((x.waktu - t0) / 36e5 / c, 4), sumber: x.sumber, metrik: x.metrik, nilai: x.nilai})), percepatan: c, yakin: "terverifikasi", label: "Model sederhana, bukan prakiraan"};
}
