/* Laporan harian per bencana: ADAPTOR spek untuk banjir, gempa, gunungapi, cuaca, kekeringan, udara + registri SPEK semua bencana (termasuk karhutla). Modul ES murni, tanpa DOM dan tanpa D1.
   Karhutla TIDAK diubah: SPEK.karhutla hanya membungkus fungsi public/laporan_karhutla_spek.js apa adanya (tabel lk_*). Bencana lain memakai bentuk bagian yang sama
   (nasional, provinsi, tiga hari, perlu perhatian, prakiraan, sumber, kesimpulan) yang dibangun dari laporan.json v1 (docs/multi-bencana/LAPORAN-HARIAN.md) ditambah kiriman provinsi
   (tabel lkb_*, migrasi 0048). ATURAN: angka HANYA dari laporan.json atau kiriman provinsi yang disetujui; data kosong = bagian dihilangkan (null), bukan nol.
   Pakai: const SB = await import("/laporan_bencana_spek.js"); SB.spek("banjir").agregasi({...}). Worker: import dari ../public/laporan_bencana_spek.js.
   ponytail: satu isian provinsi generik untuk semua bahaya (ringkasan, dampak jiwa, upaya, hambatan, catatan); isian khusus per bahaya (mis. jumlah rumah rusak) menyusul bila diminta. */
import * as K from "./laporan_karhutla_spek.js";
import {teksWA as teksWAKarhutla, tglPanjang} from "./laporan_karhutla_wa.js";
import {teksWABencana} from "./laporan_bencana_wa.js";

const {Baca, tanggalData, kodeDariSumber, namaProv} = K;
const nn = v => typeof v === "number" && Number.isFinite(v);
const id = (x, d = 0) => nn(x) ? Number(x).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d}) : "tidak ada data";
const potong = (t, n) => { t = String(t ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const MAKS_PRIORITAS = 6;
/* waktu ISO berzona (berkas laporan.json) -> "21 Okt 2026, 04.41 WIB"; tak terbaca = null. Satu-satunya pemformat waktu untuk WA, slide, dan paparan. */
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function waktuWIB(iso) {
  const d = new Date(iso); if (typeof iso !== "string" || Number.isNaN(d.getTime())) return null;
  const w = new Date(d.getTime() + 7 * 36e5), p2 = x => String(x).padStart(2, "0");
  return `${w.getUTCDate()} ${BLN[w.getUTCMonth()]} ${w.getUTCFullYear()}, ${p2(w.getUTCHours())}.${p2(w.getUTCMinutes())} WIB`;
}
/* label metrik dalam kalimat: huruf kecil kecuali singkatan (FWI, PM2,5, SPI, KHG, M, NaCl) */
export const labelKalimat = l => String(l).split(" ").map(w => /[A-Z0-9]/.test(w.slice(1)) || (w.length === 1 && /[A-Z]/.test(w)) ? w : w.toLowerCase()).join(" ");
/* desimal nilai prakiraan menurut datanya sendiri (maksimal 2): peluang 0,12 tetap dua, curah hujan bulat tetap bulat */
const desimalData = a => Math.min(2, Math.max(0, ...a.filter(nn).map(v => { const t = String(v); return t.includes(".") ? t.split(".")[1].length : 0; })));
export const DAMPAK = {meninggal: "meninggal", hilang: "hilang", luka: "luka", mengungsi: "mengungsi", terdampak: "jiwa terdampak"};   // semua dalam jiwa

/* ================================================================ isian provinsi (satu bentuk untuk semua bahaya) */
export function normalisasi(sumber, masuk, tanggal_laporan, kirim = false) {
  if (!kodeDariSumber(sumber)) return {isi: null, galat: [{jalur: "sumber", pesan: "laporan bencana hanya menerima sumber prov:<kode>"}]};
  const galat = [], b = Baca(galat, kirim), o = b.obj(masuk, "isi"), d = b.obj(o.dampak, "dampak");
  const isi = {tanggal_data: tanggalData(tanggal_laporan)};
  isi.ringkasan = b.teks(o.ringkasan, "ringkasan", 300, {wajib: true});
  isi.dampak = {};
  for (const k of Object.keys(DAMPAK)) { const v = b.bulat(d[k], "dampak." + k, {maks: 1e8}); if (v != null) isi.dampak[k] = v; }
  for (const k of Object.keys(d)) if (!Object.hasOwn(DAMPAK, k)) b.g("dampak." + k, "isian dampak tidak dikenal");
  isi.upaya = b.teks(o.upaya, "upaya", 500); isi.hambatan = b.teks(o.hambatan, "hambatan", 500); isi.catatan = b.teks(o.catatan, "catatan", 500);
  return {isi, galat};
}
export function cek(sumber, isi) {
  const c = [], d = isi.dampak ?? {}, korban = (d.meninggal ?? 0) + (d.hilang ?? 0) + (d.luka ?? 0);
  if (d.terdampak != null && korban > d.terdampak) c.push({t: "merah", k: "terdampak_kurang_dari_korban", j: "dampak.terdampak", p: `Jiwa terdampak ${id(d.terdampak)} lebih kecil dari jumlah korban ${id(korban)} (meninggal, hilang, luka)`});
  if (d.terdampak != null && (d.mengungsi ?? 0) > d.terdampak) c.push({t: "merah", k: "mengungsi_lebih_dari_terdampak", j: "dampak.mengungsi", p: `Pengungsi ${id(d.mengungsi)} lebih besar dari jiwa terdampak ${id(d.terdampak)}`});
  if (d.meninggal > 0 && !isi.catatan) c.push({t: "kuning", k: "meninggal_tanpa_catatan", j: "catatan", p: `Korban meninggal ${id(d.meninggal)} jiwa tanpa catatan lokasi atau penyebab`, dijelaskan: false});
  return c;
}
const NAMA_ISIAN = {ringkasan: "Ringkasan situasi", upaya: "Upaya", hambatan: "Hambatan", catatan: "Catatan", meninggal: "Korban meninggal", hilang: "Korban hilang", luka: "Korban luka", mengungsi: "Pengungsi", terdampak: "Jiwa terdampak"};
export const galatManusia = g => { const k = String(g?.jalur ?? "").split(".").pop(); return NAMA_ISIAN[k] ? `${NAMA_ISIAN[k]}: ${g.pesan}` : K.galatManusia(g); };
export const kurangMinimal = (sumber, masuk, tanggal_laporan) => normalisasi(sumber, masuk, tanggal_laporan, true).galat.map(galatManusia);
export const sumberWajib = prioritas => prioritas.map(k => "prov:" + k);
export function statusHari({status, prioritas, kiriman}) {
  if (status === "dikunci" || status === "dikunci_pengecualian") return status;
  return sumberWajib(prioritas).every(s => ["terkirim", "disetujui"].includes(kiriman[s]?.status)) ? "lengkap" : "belum_lengkap";
}

/* ================================================================ dari laporan.json v1 */
/* provinsi yang wajib mengirim laporan = yang paling banyak pada metrik utama di tanggal data (hanya nilai > 0, maksimal 6); tanpa data hari itu: kosong */
export function pilihPrioritas(L, td, maks = MAKS_PRIORITAS) {
  const i = Array.isArray(L?.hari) ? L.hari.indexOf(td) : -1; if (i < 0 || !Array.isArray(L.metrik) || !L.metrik.length) return [];
  const u = L.metrik.find(m => m.utama) || L.metrik[0];
  return Object.entries(L.prov || {}).map(([k, p]) => [k, p?.[u.k]?.[i]]).filter(([k, v]) => /^\d{2}$/.test(k) && nn(v) && v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, maks).map(x => x[0]);
}
/* perubahan terhadap hari sebelumnya. Persen hanya untuk cacah bulat (desimal 0): besaran berskala log atau berdesimal (magnitudo, curah hujan) memakai selisih nilai, bukan persen (presisi palsu).
   teks = kalimat jadi, satu-satunya sumber untuk WA, slide, dan kesimpulan. */
function ubahDari(a, b, desimal = 0) {
  if (!nn(a) || !nn(b)) return null;
  const f = x => id(x, desimal);
  if (a === b) return {arah: "tetap", persen: 0, dari: b, teks: "sama dengan hari sebelumnya"};
  const arah = a > b ? "naik" : "turun";
  if (b === 0) return {arah, persen: null, dari: 0, teks: `${arah} dari nol`};
  if (desimal > 0) return {arah, persen: null, dari: b, teks: `${arah} dari ${f(b)} pada hari sebelumnya`};
  const persen = Math.round(Math.abs(a - b) / Math.abs(b) * 100);
  return {arah, persen, dari: b, teks: `${arah} ${f(persen)} persen dari hari sebelumnya`};
}
/* null bila laporan.json tidak sah atau tidak mencakup tanggal data. Satu pembangun untuk snapshot (agregasi) DAN paparan (/paparan?bencana=). */
export function dariLaporan(L, td) {
  if (!L || L.v !== 1 || !Array.isArray(L.hari) || !Array.isArray(L.metrik) || !L.metrik.length) return null;
  const i = L.hari.indexOf(td); if (i < 0) return null;
  const nilai = (o, k, j) => { const v = o?.[k]?.[j]; return nn(v) ? v : null; };
  const metrik = L.metrik.map(m => ({k: m.k, label: String(m.label), satuan: String(m.satuan ?? ""), desimal: m.desimal | 0, utama: !!m.utama, arah: m.arah ?? "netral", agregat: m.agregat ?? null, judul: labelKalimat(m.label)}));
  if (!metrik.some(m => m.utama)) metrik[0].utama = true;
  const utama = metrik.find(m => m.utama);
  const nasional = metrik.map(m => ({...m, nilai: nilai(L.nasional, m.k, i), kemarin: i > 0 ? nilai(L.nasional, m.k, i - 1) : null})).filter(m => m.nilai != null).map(m => ({...m, ubah: ubahDari(m.nilai, m.kemarin, m.desimal)}));
  const tiga = []; for (let j = Math.max(0, i - 2); j <= i; j++) { const v = nilai(L.nasional, utama.k, j); if (v != null) tiga.push({tanggal_data: L.hari[j], nilai: v}); }
  const prov = {};
  for (const [kode, p] of Object.entries(L.prov || {})) if (/^\d{2}$/.test(kode)) {
    const m = {}; for (const x of metrik) { const v = nilai(p, x.k, i); if (v != null) m[x.k] = v; }
    prov[kode] = {nama: String(p?.nama ?? kode), metrik: m};
  }
  const pr = L.prakiraan;
  return {
    tanggal_data: td, indeks: i, judul: String(L.judul ?? ""), metrik, utama: utama.k,
    nasional: nasional.length ? nasional : null,
    tiga_hari: tiga.length >= 2 ? tiga : null,
    prov,
    sorot: Array.isArray(L.sorot) && L.sorot.length ? L.sorot.slice(0, 8).map(s => ({tingkat: s.tingkat, judul: potong(s.judul, 160), teks: potong(s.teks, 300), prov: /^\d{2}$/.test(s.prov ?? "") ? s.prov : null})) : null,
    prakiraan: pr && Array.isArray(pr.hari) && Array.isArray(pr.baris) && pr.baris.length ? {judul: potong(pr.judul, 160), hari: pr.hari.slice(0, 7), baris: pr.baris.slice(0, 8).map(b => ({label: potong(b.label, 60), prov: b.prov ?? null, nilai: Array.isArray(b.nilai) ? b.nilai.slice(0, 7) : [], desimal: desimalData(Array.isArray(b.nilai) ? b.nilai.slice(0, 7) : []), satuan: b.satuan ?? ""}))} : null,
    tambahan: Array.isArray(L.tambahan) && L.tambahan.length ? L.tambahan.slice(0, 3).map(t => ({id: t.id, judul: potong(t.judul, 120), kolom: (t.kolom || []).slice(0, 8), baris: (t.baris || []).slice(0, 10), catatan: t.catatan ? potong(t.catatan, 200) : null})) : null,
    sumber: (Array.isArray(L.sumber) ? L.sumber : []).slice(0, 8).map(s => ({nama: potong(s.nama, 120), url: typeof s.url === "string" ? s.url : null, catatan: s.catatan ? potong(s.catatan, 160) : null})),
    otomatis: {dibuat: L.dibuat ?? null, cutoff: L.cutoff ?? null, dibuat_teks: waktuWIB(L.dibuat), cutoff_teks: waktuWIB(L.cutoff), hari_lengkap: L.hari_lengkap ?? null, berjalan: !!L.hari_lengkap && td > L.hari_lengkap},
  };
}

const deBeku = b => b.nasional || b.metrik || b.sorot || b.prakiraan || b.tambahan ? {judul: b.judul, metrik: b.metrik, nasional: b.nasional, tiga_hari: b.tiga_hari, sorot: b.sorot, prakiraan: b.prakiraan, tambahan: b.tambahan, sumber: b.sumber ?? [], otomatis: b.otomatis,
  prov: Object.fromEntries((b.provinsi ?? []).map(p => [p.kode, {nama: p.nama, metrik: p.metrik ?? {}}]))} : null;

/* ================================================================ AGREGASI SNAPSHOT (satu fungsi, dipakai kunci DAN ralat)
   masuk: {bencana, tanggal_laporan, prioritas, pengecualian: [{sumber, alasan}], kiriman: {sumber: {isi, data_terakhir?}}, laporan: laporan.json v1 atau null, ralat, alasan, dikunci_oleh, dikunci_pada} */
export function agregasi(masuk) {
  const {bencana, tanggal_laporan, prioritas, pengecualian = [], kiriman = {}, laporan = null} = masuk;
  const meta = K.BENCANA[bencana], td = tanggalData(tanggal_laporan), tanpa = new Map(pengecualian.map(p => [p.sumber, p]));
  /* ralat: bagian otomatis dibaca dari snapshot sebelumnya (masuk.beku), BUKAN dari berkas hari ini, supaya angka otomatis tidak bergeser diam-diam */
  const dl = masuk.beku ? deBeku(masuk.beku) : dariLaporan(laporan, td);
  const kodeKiriman = Object.keys(kiriman).map(kodeDariSumber).filter(Boolean), semua = [...prioritas, ...kodeKiriman.filter(k => !prioritas.includes(k)).sort()];
  const provinsi = semua.map(kode => {
    const sumber = "prov:" + kode, x = kiriman[sumber], isi = x?.isi ?? null;
    return {kode, nama: dl?.prov[kode]?.nama ?? namaProv(kode), wajib: prioritas.includes(kode), sumber, ada: !!isi, data_terakhir: x?.data_terakhir ?? null,
      lanjut_tanpa: tanpa.has(sumber) ? {alasan: tanpa.get(sumber).alasan, data_terakhir: x?.data_terakhir ?? null} : null,
      metrik: dl?.prov[kode]?.metrik ?? {}, kiriman: isi ? {ringkasan: isi.ringkasan ?? null, dampak: isi.dampak ?? {}, upaya: isi.upaya ?? null, hambatan: isi.hambatan ?? null, catatan: isi.catatan ?? null} : null};
  });
  const dampak = {provinsi: 0}; for (const p of provinsi) if (p.kiriman) { let ada = false; for (const k of Object.keys(DAMPAK)) { const v = p.kiriman.dampak[k]; if (nn(v)) { dampak[k] = (dampak[k] ?? 0) + v; ada = true; } } if (ada) dampak.provinsi++; }
  const snap = {
    skema: 1, bencana, nama_bencana: meta.nama, judul: dl?.judul || meta.judul, tanggal_laporan, tanggal_data: td, ralat: masuk.ralat ?? 0, alasan_ralat: masuk.alasan ?? null,
    status: pengecualian.length ? "dikunci_pengecualian" : "dikunci", dikunci_oleh: masuk.dikunci_oleh ?? null, dikunci_pada: masuk.dikunci_pada ?? null,
    pengecualian: pengecualian.map(p => ({sumber: p.sumber, label: namaProv(kodeDariSumber(p.sumber) ?? ""), alasan: p.alasan, data_terakhir: kiriman[p.sumber]?.data_terakhir ?? null})),
    prioritas, metrik: dl?.metrik ?? null, nasional: dl?.nasional ?? null, tiga_hari: dl?.tiga_hari ?? null, provinsi, dampak_provinsi: dampak.provinsi ? dampak : null,
    sorot: dl?.sorot ?? null, prakiraan: dl?.prakiraan ?? null, tambahan: dl?.tambahan ?? null, sumber: dl?.sumber ?? [], otomatis: dl?.otomatis ?? null,
    data_otomatis: masuk.beku ? masuk.beku.data_otomatis ?? null : dl ? null : {alasan: laporan ? `berkas otomatis tidak mencakup ${tglPanjang(td)}` : "berkas otomatis tidak terbaca", hari_lengkap: laporan?.hari_lengkap ?? null},
  };
  snap.kesimpulan = kesimpulan(snap);
  return snap;
}
const KATA_SORT = {awas: 3, siaga: 2, waspada: 1, info: 0};
export function kesimpulan(s) {
  const k = [], n = s.nasional?.find(m => m.utama) ?? s.nasional?.[0];
  if (n) {
    const u = n.ubah ? ", " + n.ubah.teks : "";
    k.push(`Data ${tglPanjang(s.tanggal_data)}: ${id(n.nilai, n.desimal)} ${n.satuan} (${n.label})${u}.`);
  } else if (s.data_otomatis) k.push(`Pantauan otomatis ${s.nama_bencana.toLowerCase()} untuk ${tglPanjang(s.tanggal_data)} tidak tersedia (${s.data_otomatis.alasan}${s.data_otomatis.hari_lengkap ? `, hari lengkap terakhir ${tglPanjang(s.data_otomatis.hari_lengkap)}` : ""}).`);
  const wajib = s.provinsi.filter(p => p.wajib), terisi = wajib.filter(p => p.ada).length;
  if (wajib.length) k.push(`${terisi} dari ${wajib.length} provinsi yang wajib mengirim laporan sudah mengirim.`);
  const tertinggi = [...(s.sorot ?? [])].sort((a, b) => (KATA_SORT[b.tingkat] ?? 0) - (KATA_SORT[a.tingkat] ?? 0))[0];
  if (tertinggi) k.push(`Perlu perhatian (${tertinggi.tingkat}): ${tertinggi.judul}.`);
  if (s.dampak_provinsi) { const d = s.dampak_provinsi, t = Object.keys(DAMPAK).filter(x => nn(d[x])).map(x => `${id(d[x])} ${DAMPAK[x]}`).join(", "); k.push(`Dampak menurut laporan provinsi (${d.provinsi} provinsi): ${t}.`); }
  for (const p of s.pengecualian) k.push(`${p.label}: data terakhir ${p.data_terakhir ? tglPanjang(p.data_terakhir) : "tidak ada"}, dikunci tanpa kiriman terbaru (${p.alasan}).`);
  return k;
}

/* ================================================================ registri */
const hazard = b => ({
  id: b, ...K.BENCANA[b], karhutla: false, tabel: "lkb", normalisasi, cek, kurangMinimal, galatManusia, sumberWajib, statusHari, kodeDariSumber,
  agregasi: m => agregasi({...m, bencana: b}), bedaSnapshot: K.bedaSnapshot, teksWA: s => ({laporan: teksWABencana(s)}),
  labelSumber: s => namaProv(kodeDariSumber(s) ?? s),
});
export const SPEK = {
  karhutla: {id: "karhutla", ...K.BENCANA.karhutla, karhutla: true, tabel: "lk", normalisasi: K.normalisasi, cek: K.cek, kurangMinimal: K.kurangMinimal, galatManusia: K.galatManusia, sumberWajib: K.sumberWajib, statusHari: K.statusHari,
    kodeDariSumber, agregasi: K.agregasi, bedaSnapshot: K.bedaSnapshot, teksWA: teksWAKarhutla, labelSumber: K.labelSumber},
  ...Object.fromEntries(K.DAFTAR_BENCANA.filter(b => b !== "karhutla").map(b => [b, hazard(b)])),
};
export const spek = b => Object.hasOwn(SPEK, b) ? SPEK[b] : null;
