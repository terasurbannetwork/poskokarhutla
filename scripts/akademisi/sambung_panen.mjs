#!/usr/bin/env node
/* Menyambungkan hasil panen data publik (30 Okt 2026) ke berkas R2 Direktori Jaringan Kebencanaan.

   node scripts/akademisi/sambung_panen.mjs <folder panen> <folder data R2 kini> <folder keluaran>

   Repo publik: skrip ini hanya mengolah, datanya tetap di luar repo. Yang dilakukan:
   - gabung ke berkas lama (lembaga, hibah_riset, pendanaan): entri baru ditambah, entri lama tidak pernah ditimpa;
   - berkas baru per entitas: wilayah_daya (APBD, IKD/IRB, fasilitas kritis, jalan, jembatan, SPAB), lembaga_ekstra (izin, badan hukum,
     daftar hitam LKPP, ROR, Wikidata), pakar_ekstra (paten, ORCID), kejadian_ekstra (aktivasi satelit, dokumen pascabencana,
     ReliefWeb, HDX, OCHA FTS).
   Pencocokan nama sengaja ketat (lebih baik tidak tersambung daripada salah sambung), sama dengan hubung.mjs. */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {norm, indeks, cari} from "./hubung.mjs";

const larik = d => Array.isArray(d) ? d : d && typeof d === "object" ? (Object.values(d).find(Array.isArray) || []) : [];
/* kunci kab sama dengan kunciKab di layar: "Kota X" beda dengan "Kabupaten X" */
export const kunciKab = n => { n = String(n || "").replace(/^kota\s+adm(inistrasi|\.)?\s+/i, "Kota "); return (/^kota\b/i.test(n) ? "K:" : "") + norm(n.replace(/^(kabupaten|kab\.?|kota|administrasi)\s+/i, "")).replace(/ /g, ""); };   // "Labuhan Batu" = "Labuhanbatu"
const kk = (prov, kab) => String(prov) + "|" + kunciKab(kab);

export function wilayahDaya(P) {
  const kab = {}, prov = {}, ke = (prov0, kab0) => { const k = kk(prov0, kab0); return kab[k] ||= {prov: String(prov0), kab: kab0}; }, pv = p => prov[String(p)] ||= {};
  /* APBD: BTT, belanja BPBD, total belanja, pendapatan, per tahun; baris tanpa kab = pemprov */
  for (const r of larik(P.anggaran_pemda)) { if (!r.prov || r.nilai_rp == null) continue; const o = r.kab ? ke(r.prov, r.kab) : pv(r.prov);
    ((o.apbd ||= {})[r.tahun] ||= {})[r.pos + (r.jenis_angka === "realisasi" ? " realisasi" : "")] = r.nilai_rp; /* anggaran dan realisasi terpisah */ o.apbd_sumber ||= r.sumber_url; }
  for (const r of larik(P.dana_desa_bencana)) if (r.kab && r.prov && r.nilai_rp != null && /pagu/i.test(r.pos)) { const o = ke(r.prov, r.kab); (o.dana_desa ||= {})[r.tahun] = r.nilai_rp; }
  for (const r of larik(P.kinerja_pemda)) { if (!r.prov || r.nilai == null) continue; const o = /provinsi/i.test(r.indikator) || !r.kab ? pv(r.prov) : ke(r.prov, r.kab);
    (o.kinerja ||= []).push({indikator: r.indikator, nilai: r.nilai, kelas: r.kelas || null, tahun: r.tahun, sumber_url: r.sumber_url}); }
  /* fasilitas kritis: hitungan per jenis; RS juga jumlah tempat tidur */
  const fk = P.fasilitas_kritis, ci = c => fk.kolom.indexOf(c);
  if (fk?.baris) for (const b of fk.baris) { const p = b[ci("prov")], k = b[ci("kab")], j = b[ci("jenis")]; if (!p || !j) continue;
    const t = [pv(p), k ? ke(p, k) : null].filter(Boolean);
    for (const o of t) { const f = o.fasilitas ||= {}; f[j] = (f[j] || 0) + 1; if (j === "rs" && Number(b[ci("kapasitas")]) > 0) f.rs_tt = (f.rs_tt || 0) + Number(b[ci("kapasitas")]); } }
  /* jalan, jembatan, SPAB: per provinsi */
  const jl = P.jalan_kondisi || {}, namaKe = {};
  for (const s of ["nasional_per_provinsi_2025", "provinsi_per_provinsi_2025"]) for (const r of larik(jl[s])) { namaKe[norm(r.provinsi)] = r.kd_prov;
    (pv(r.kd_prov).jalan ||= {})[r.status] = {baik_pct: r.baik_pct, sedang_pct: r.sedang_pct, rusak_ringan_pct: r.rusak_ringan_pct, rusak_berat_pct: r.rusak_berat_pct, total_km: r.total_km, tahun: r.tahun, sumber_url: r.sumber_url}; }
  for (const r of larik(P.jembatan?.per_provinsi)) pv(r.kd_prov).jembatan = {jumlah: r.jumlah_total, kondisi: r.jumlah_menurut_kondisi, tahun: r.tahun, sumber_url: P.jembatan.sumber_url};
  for (const r of larik(P.spab?.rekap)) { const k = namaKe[norm(r.prov_nama)]; if (k) pv(k).spab = {total: r.total_satuan, melapor: r.melapor_emonev, persen: r.persen, tahun: r.tahun, sumber_url: r.sumber_url}; }
  /* baris yang hanya punya fasilitas (kode provinsi lama di sumber, mis. Kepri, Kaltara, Papua) dilebur ke baris APBD dengan kab sama bila unik */
  const perKab = new Map(); for (const [k, o] of Object.entries(kab)) if (o.apbd) { const n = k.split("|")[1]; perKab.set(n, perKab.has(n) ? null : o); }
  for (const [k, o] of Object.entries(kab)) if (!o.apbd) { const t = perKab.get(k.split("|")[1]); if (t) { t.fasilitas ||= o.fasilitas; t.kinerja ||= o.kinerja; delete kab[k]; } }
  return {diperbarui: new Date().toISOString().slice(0, 10), prov, kab: Object.values(kab)};
}

export function lembagaEkstra(P, lembaga) {
  const L = {}, ke = id => L[id] ||= {}, ada = new Set(lembaga.map(l => l.id));
  for (const r of larik(P.izin_cocok)) if (ada.has(r.lembaga_id)) { const o = ke(r.lembaga_id); o.izin = [...new Set([...(o.izin || []), ...r.bendera.filter(b => !/badan hukum/.test(b))])]; o.izin_dasar = r.dasar; }
  /* SK izin zakat: dicocokkan ketat ke nama lembaga */
  const pz = indeks(lembaga.map(l => ({id: l.id, nama: l.nama, singkatan: l.singkatan, alias: l.alias})));
  for (const z of larik(P.izin_zakat)) { const id = cari(pz, z.nama); if (id) (ke(id).sk ||= []).push({nomor: z.sk_nomor, berlaku_sampai: z.berlaku_sampai, pemberi: z.pemberi_izin, status: z.status, sumber_url: z.sumber_url}); }
  /* label izin juga dari status SK (BMH misalnya berizin di SIMZAT walau laman cocoknya hanya menyebut badan hukum); SK berizin didahulukan */
  for (const o of Object.values(L)) if (o.sk) { o.sk.sort((a, b) => (b.status === "berizin") - (a.status === "berizin"));
    o.izin = [...new Set([...(o.izin || []), ...o.sk.map(z => z.status === "berizin" ? (z.berlaku_sampai && z.berlaku_sampai < new Date().toISOString().slice(0, 10) ? "izin laz berakhir" : "laz berizin") : /baznas/i.test(z.status) ? "laz direkomendasikan baznas" : null).filter(Boolean)])]; }
  for (const r of larik(P.badan_hukum)) if (ada.has(r.lembaga_id) && r.sk_kemenkumham) ke(r.lembaga_id).badan_hukum = {sk: r.sk_kemenkumham, sumber_url: r.sumber_url, catatan: "tertulis di laman lembaga, belum dicek ke AHU"};
  for (const r of larik(P.izin_pub)) if (ada.has(r.lembaga_id)) ke(r.lembaga_id).pub = {nomor: r.nomor_izin, status: r.status};
  for (const r of larik(P.daftar_hitam_cocok)) { const id = r.cocok_ke === "lembaga" ? r.id : "penyedia-" + norm(r.nama).replace(/ /g, "-"); if (!ada.has(id)) continue;
    const sk = r.dasar.replace(/^nama ternormalkan ketat;\s*/, "").split(/(?<=\((?:aktif|berakhir)\)),\s*/).filter(x => /\((aktif|berakhir)\)/.test(x)), aktif = sk.filter(x => /\(aktif\)/.test(x)), th = sk.flatMap(x => x.match(/(?<!\d)20\d\d(?!\d)/g) || []).map(Number).sort();
    if (!sk.length) continue;
    ke(id).daftar_hitam = {aktif: aktif.length > 0, kali: sk.length, sk_aktif: aktif.map(x => x.replace(/\s*\(aktif\)$/, "")), tahun: th.length ? [th[0], th.at(-1)] : null, catatan: "dicocokkan dari nama penyedia di daftar hitam LKPP, belum dicek NPWP"}; }
  for (const r of larik(P.ror_kampus?.cocok)) if (r.entitas_id?.startsWith("L:") && ada.has(r.entitas_id.slice(2))) ke(r.entitas_id.slice(2)).ror = r.ror_id;
  for (const r of larik(P.wikidata_lembaga?.lembaga_kampus)) if (r.entitas_id?.startsWith("L:") && ada.has(r.entitas_id.slice(2))) ke(r.entitas_id.slice(2)).wikidata = r.qid;
  /* kampus berkunci nama (K:<nama>) */
  const K = {}; for (const r of larik(P.ror_kampus?.cocok)) if (r.entitas_id?.startsWith("K:")) (K[r.entitas_id.slice(2)] ||= {}).ror = r.ror_id;
  for (const r of larik(P.wikidata_lembaga?.lembaga_kampus)) if (r.entitas_id?.startsWith("K:")) (K[r.entitas_id.slice(2)] ||= {}).wikidata = r.qid;
  return {lembaga: L, kampus: K};
}

export function pakarEkstra(P, induk0) {
  const induk = Array.isArray(induk0) ? induk0 : induk0?.orang || [], X = {}, ke = id => X[id] ||= {}, ada = new Set(larik(induk).map(o => o[0]));
  const paten = new Map(larik(P.paten).map(p => [p.nomor_permohonan, p]));
  for (const c of larik(P.paten_cocok)) for (const i of c.inventor || []) if (ada.has(i.pakar_id)) { const p = paten.get(c.nomor_permohonan); if (!p) continue;
    (ke(i.pakar_id).paten ||= []).push({judul: p.judul, nomor: p.nomor_paten || p.nomor_permohonan, jenis: p.jenis, status: p.status, tanggal: p.tanggal_diberi || p.tanggal_permohonan, pemegang: (p.pemegang || []).map(x => x.pemegang || x).join(", "), sumber_url: p.sumber_url}); }
  for (const o of larik(P.orcid_pakar?.cocok)) if (ada.has(o.pakar_id)) ke(o.pakar_id).orcid = o.orcid;
  return X;
}

export function kejadianEkstra(P, kejadian) {
  const X = {}, ada = new Set(larik(kejadian).map(k => k.id)), ke = id => X[id] ||= {};
  for (const a of larik(P.aktivasi_satelit)) if (ada.has(a.kejadian_id)) (ke(a.kejadian_id).satelit ||= []).push({mekanisme: a.mekanisme, tanggal: a.tanggal, peminta: a.peminta, url: a.url || a.sumber_url});
  for (const d of larik(P.dokumen_pascabencana)) if (ada.has(d.kejadian_id)) (ke(d.kejadian_id).dokumen ||= []).push({judul: d.judul, jenis: d.jenis, tahun: d.tahun || null, url: d.url || d.sumber_url});
  const glide = {};
  for (const r of larik(P.reliefweb_kejadian?.kejadian)) if (ada.has(r.kejadian_id)) { glide[r.glide] = r.kejadian_id;
    ke(r.kejadian_id).reliefweb = {nama: r.nama, laporan: r.jumlah_laporan, pelapor: (r.sumber_pelapor || []).slice(0, 5).map(s => s.nama), url: r.url}; }
  for (const h of larik(P.reliefweb_kejadian?.hdx)) if (ada.has(h.kejadian_id)) (ke(h.kejadian_id).hdx ||= []).push({judul: h.judul, organisasi: h.organisasi, url: h.url});
  for (const f of larik(P.fts_kejadian)) { const id = glide[f.glide_id]; if (!id) continue; const t = f.total_usd || {};
    ke(id).fts = {total_usd: (t.paid || 0) + (t.commitment || 0), donor: (f.donor || []).slice(0, 5).map(d => ({nama: d.nama, usd: d.usd})), url: f.sumber_url}; }
  return X;
}

const dalam = (lo, la, g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).some(poly => { let d = false; const r = poly[0];
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) d = !d; } return d; });
export const provDariTitik = (geo, lo, la) => { const f = (geo.features || []).find(f => dalam(lo, la, f.geometry)); return f ? String(f.properties.kode) : null; };

/* entri lembaga baru: Pos SAR, markas PMI kab, LPBI NU, forum PRB, tim respons (EMT/USAR/DVI), penyedia e-Katalog barang bencana */
export function lembagaBaru(P, lembaga) {
  const ada = new Set(lembaga.map(l => l.id)), baru = [];
  const pz = indeks(lembaga.map(l => ({id: l.id, nama: l.nama, singkatan: l.singkatan, alias: l.alias}))), akar = new Set(lembaga.filter(l => !l.induk).map(l => l.id));
  const tambah = l => { if (!l?.id || ada.has(l.id)) return; ada.add(l.id); if (l.induk && !ada.has(l.induk) && !baru.some(b => b.id === l.induk)) delete l.induk; baru.push(l); };
  /* induk Pos SAR di panen hanya tebakan jarak (situs Basarnas tidak menyebutnya): dibuang; provinsi kosong diisi dari titik di dalam batas BIG */
  for (const f of ["pos_sar", "pmi_kab", "lpbi_nu", "forum_prb_baru"]) for (const l0 of larik(P[f])) { const l = {...l0, sub: l0.sub || {pos_sar: "SAR", pmi_kab: "palang merah", lpbi_nu: "ormas keagamaan"}[f]};
    if (f === "pos_sar") { delete l.induk; delete l.induk_basis; }
    if (!l.prov && Number.isFinite(l.lat) && P.geo_provinsi) l.prov = provDariTitik(P.geo_provinsi, l.lon, l.lat);
    tambah(l); }
  for (const t of larik(P.tim_respons?.tim)) { const induk = cari(pz, String(t.lembaga_induk).split(/[,;/]/)[0], akar);
    tambah({id: t.id, nama: t.nama, kategori: t.jenis === "EMT" ? "kesehatan" : "pemerintah", sub: t.jenis, skala: "nasional", induk: induk || undefined, prov: t.prov || null,
      bidang: [t.tipe, t.kapasitas].filter(Boolean), sumber: [{url: t.sumber_url, butir: "status"}], diperiksa: t.diperiksa, catatan: t.status}); }
  /* kab e-Katalog ditulis kapital ("KAB BEKASI", "KOTA ADM. JAKARTA SELATAN"): dirapikan, provinsi dicari dari daftar kab APBD (bila unik) */
  const judul = t => String(t).toLowerCase().replace(/\b[a-z]/g, h => h.toUpperCase()), provKab = new Map();
  for (const r of larik(P.anggaran_pemda)) if (r.kab) { const k = kunciKab(r.kab); provKab.set(k, provKab.has(k) && provKab.get(k)?.[0] !== r.prov ? null : [r.prov, r.kab]); }
  const rapiKab = k => { if (!k) return [null, null]; const n = judul(String(k).replace(/^kab\.?\s+/i, "Kabupaten ").replace(/^kota\s+adm(inistrasi|\.)?\s+/i, "Kota ")), t = provKab.get(kunciKab(n)); return t ? [t[0], t[1]] : [/^Kota Jakarta/.test(n) ? "31" : null, n]; };   /* DKI tidak punya APBD kota */
  for (const v of larik(P.katalog_penyedia)) { const [pv, kb] = v.prov ? [v.prov, v.kab] : rapiKab(v.kab); tambah({id: "penyedia-" + norm(v.nama).replace(/ /g, "-"), nama: v.nama, kategori: "dunia-usaha", sub: "penyedia e-Katalog", skala: "kabkota", prov: pv, kab: kb,
    bidang: v.kategori, web: v.url, sumber: [{url: v.url, butir: "produk"}], catatan: `${v.jumlah_produk} produk barang bencana di e-Katalog LKPP`}); }
  return baru;
}

/* hibah baru: ditambah bila judul+tahun belum ada; radar dana jadi skema pendanaan bertenggat */
export const hibahBaru = (lama, baru) => { const k = h => norm(h.judul) + "|" + h.tahun, s = new Set(lama.map(k)); return baru.filter(h => !s.has(k(h)) && s.add(k(h))); };
export const radarSkema = (radar, ada) => larik(radar).filter(r => !ada.has("radar-" + r.id)).map(r => ({id: "radar-" + r.id, jenis_entri: "skema", nama: r.judul, pemberi: r.pemberi, lembaga_id: null,
  jenis: /riset|research/i.test(r.judul + " " + (r.bidang || "")) ? "dana riset" : /iklim|climate|adaptasi|ekosistem/i.test(r.judul) ? "dana iklim" : "hibah multilateral",
  sasaran: [].concat(r.syarat_pemohon || []), nilai: r.nilai_maks ?? null, mata_uang: r.mata_uang || null, tenggat: r.tenggat || null, siklus: r.siklus || null, status: "dibuka",
  rumpun: r.rumpun || [], url: r.url, sumber: [{url: r.sumber_url}], diperiksa: r.diperiksa}));

/* pemutakhiran bulanan (panen_publik.py): daftar hitam LKPP mentah dicocokkan ketat ke nama lembaga (termasuk penyedia e-Katalog); nama yang
   cocok ke dua lembaga atau lebih dilewati. Hasilnya berbentuk sama dengan daftar_hitam_cocok panen pertama. */
const namaUsaha = n => norm(n).replace(/\b(pt|cv|tbk|persero|ud|fa|koperasi)\b/g, " ").replace(/\s+/g, " ").trim();
export function daftarHitamCocok(mentah, lembaga, kini = new Date().toISOString().slice(0, 10)) {
  const peta = new Map(); for (const l of lembaga) { const k = namaUsaha(l.nama); if (k.length >= 6) peta.set(k, peta.has(k) ? null : l.id); }
  const g = new Map(); for (const x of larik(mentah)) { if (!/^(PUBLISHED|EXPIRED)$/.test(x.status)) continue; const id = peta.get(namaUsaha(x.nama)); if (!id) continue;
    (g.get(id) || g.set(id, {nama: x.nama, cocok_ke: "lembaga", id, sk: []}).get(id)).sk.push(`${x.sk} (${x.status === "PUBLISHED" && !(x.berakhir && x.berakhir < kini) ? "aktif" : "berakhir"})`); }
  return [...g.values()].map(({sk, ...r}) => ({...r, dasar: "nama ternormalkan ketat; " + sk.join(", ")}));
}
/* aktivasi Copernicus EMS baru untuk Indonesia: ditautkan ke kejadian direktori bila jenis sepadan dan tanggal aktivasi 0 sampai 14 hari setelah kejadian */
const JENIS_CEMS = {flood: ["banjir", "hidrometeorologi"], earthquake: ["gempa", "tsunami"], volcan: ["gunung api"], mass: ["longsor"], fire: ["karhutla"], storm: ["hidrometeorologi"]};
export function satelitCems(cems, kejadian, lama) {
  const ada = new Set(larik(lama).map(a => a.kode).filter(Boolean)), baru = [];
  for (const c of larik(cems)) { if (ada.has(c.code)) continue; const t = String(c.activationTime || "").slice(0, 10), j = JENIS_CEMS[c.category?.slug] || [];
    const k = larik(kejadian).filter(k => j.includes(k.jenis) && k.tanggal && (Date.parse(t) - Date.parse(k.tanggal)) / 864e5 >= 0 && (Date.parse(t) - Date.parse(k.tanggal)) / 864e5 <= 14);
    baru.push({id: "cems-" + c.code.toLowerCase(), kejadian: c.name, kejadian_id: k.length === 1 ? k[0].id : null, tanggal: t, jenis_bencana: c.category?.name || null, mekanisme: "CEMS", kode: c.code, peminta: null,
      url: `https://mapping.emergency.copernicus.eu/activations/${c.code}/`, sumber_url: "https://mapping.emergency.copernicus.eu/activations/api/activations/", diperiksa: new Date().toISOString().slice(0, 10)}); }
  return baru;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dp, dr, out] = process.argv.slice(2);
  if (!dp || !dr || !out) { console.error("pakai: sambung_panen.mjs <folder panen> <folder data R2 kini> <folder keluaran>"); process.exit(2); }
  const baca = (d, f) => existsSync(join(d, f + ".json")) ? JSON.parse(readFileSync(join(d, f + ".json"), "utf8")) : null;
  const P = Object.fromEntries(["anggaran_pemda", "dana_desa_bencana", "kinerja_pemda", "fasilitas_kritis", "jalan_kondisi", "jembatan", "spab", "izin_cocok", "izin_zakat", "badan_hukum", "izin_pub",
    "daftar_hitam_cocok", "ror_kampus", "wikidata_lembaga", "paten", "paten_cocok", "orcid_pakar", "aktivasi_satelit", "dokumen_pascabencana", "reliefweb_kejadian", "fts_kejadian",
    "pos_sar", "pmi_kab", "lpbi_nu", "forum_prb_baru", "tim_respons", "katalog_penyedia", "hibah_riset_baru", "radar_dana", "daftar_hitam_mentah", "cems_idn"].map(f => [f, baca(dp, f)]));
  P.geo_provinsi = JSON.parse(readFileSync(new URL("../../public/geo/provinsi.json", import.meta.url), "utf8"));
  const R = Object.fromEntries(["lembaga", "induk", "kejadian", "hibah_riset", "pendanaan"].map(f => [f, baca(dr, f)]));
  mkdirSync(out, {recursive: true});
  const tulis = (f, d) => { writeFileSync(join(out, f + ".json"), JSON.stringify(d)); return f; };
  const lbLama = larik(R.lembaga), lbBaru = lembagaBaru(P, lbLama), lbSemua = [...lbLama, ...lbBaru];
  tulis("lembaga", Array.isArray(R.lembaga) ? lbSemua : {...R.lembaga, lembaga: lbSemua});
  const hb = hibahBaru(larik(R.hibah_riset), larik(P.hibah_riset_baru)); tulis("hibah_riset", Array.isArray(R.hibah_riset) || !R.hibah_riset ? [...larik(R.hibah_riset), ...hb] : {...R.hibah_riset, [Object.keys(R.hibah_riset).find(k => Array.isArray(R.hibah_riset[k]))]: [...larik(R.hibah_riset), ...hb]});
  const pd = larik(R.pendanaan), rs = radarSkema(P.radar_dana, new Set(pd.map(x => x.id))); tulis("pendanaan", Array.isArray(R.pendanaan) ? [...pd, ...rs] : {...R.pendanaan, pendanaan: [...pd, ...rs]});
  /* hasil panen ulang bulanan disimpan kembali ke <keluar>/panen supaya bulan depan menjadi dasar */
  mkdirSync(join(out, "panen"), {recursive: true}); const simpanPanen = (f, d) => writeFileSync(join(out, "panen", f + ".json"), JSON.stringify(d));
  if (P.daftar_hitam_mentah) { P.daftar_hitam_cocok = daftarHitamCocok(P.daftar_hitam_mentah, lbSemua); simpanPanen("daftar_hitam_cocok", P.daftar_hitam_cocok); }
  const sb = P.cems_idn ? satelitCems(P.cems_idn, R.kejadian?.kejadian || R.kejadian, P.aktivasi_satelit) : [];
  if (sb.length) { P.aktivasi_satelit = [...larik(P.aktivasi_satelit), ...sb]; simpanPanen("aktivasi_satelit", P.aktivasi_satelit); }
  const wd = wilayahDaya(P), le = lembagaEkstra(P, lbSemua), pe = pakarEkstra(P, R.induk), ke = kejadianEkstra(P, R.kejadian?.kejadian || R.kejadian);
  tulis("wilayah_daya", wd); tulis("lembaga_ekstra", le); tulis("pakar_ekstra", pe); tulis("kejadian_ekstra", ke);
  console.log(JSON.stringify({lembaga_baru: lbBaru.length, hibah_baru: hb.length, skema_radar: rs.length, wilayah_kab: wd.kab.length, wilayah_prov: Object.keys(wd.prov).length,
    lembaga_ekstra: Object.keys(le.lembaga).length, kampus_ekstra: Object.keys(le.kampus).length, daftar_hitam: Object.values(le.lembaga).filter(x => x.daftar_hitam).length,
    pakar_paten: Object.values(pe).filter(x => x.paten).length, pakar_orcid: Object.values(pe).filter(x => x.orcid).length,
    kejadian_ekstra: Object.keys(ke).length, satelit_baru: sb.length}, null, 1));
}
