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

const larik = d => Array.isArray(d) ? d : d && typeof d === "object" ? (Array.isArray(d.baris) ? d.baris : Object.values(d).find(a => Array.isArray(a) && a.some(x => x && typeof x === "object")) || []) : [];   /* "baris" didahulukan; larik nama kolom (skema) dilewati */
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
  /* gelombang 31 Okt: skor IRBI per jenis bencana (InaRISK), PSC 119, damkar per kab */
  for (const r of larik(P.inarisk_bahaya)) if (r.prov && r.kab && r.jenis && r.indeks != null) (ke(r.prov, r.kab).bahaya ||= []).push({jenis: r.jenis, indeks: r.indeks, kelas: r.kelas || null, sumber_url: r.sumber_url});
  for (const r of larik(P.psc119)) if ((r.prov || r.kode_prov) && r.kab) ke(r.kode_prov || r.prov, r.kab).psc119 = {telepon: [].concat(r.telepon || [], r.wa || []), status: r.status || null, sumber_url: r.sumber_url};
  for (const r of larik(P.damkar)) if ((r.prov || r.kode_prov) && r.kab) ke(r.kode_prov || r.prov, r.kab).damkar = {pos: r.pos_damkar ?? null, armada: r.armada ?? null, personel: r.personel ?? null, tahun: r.tahun || null, sumber_url: r.sumber_url};
  /* gelombang 3 (31 Okt): Indeks Ketahanan Pangan Bapanas (edisi 2024 didahulukan: 2025-2026 tidak jelas terukur atau proyeksi), masjid dan musala SIMAS, hibah RR, kerentanan BPS, titik darurat OSM */
  for (const r of larik(P.ikp)) { const kp = r.kode_prov || r.prov; if (!kp || !r.kab || r.skor == null) continue; const o = ke(String(kp).slice(0, 2), r.kab);
    if (!o.ikp || (r.tahun === 2024 && o.ikp.tahun !== 2024)) o.ikp = {skor: r.skor, peringkat: r.peringkat ?? null, kelompok: r.kelompok_prioritas ?? null, tahun: r.tahun, sumber_url: r.sumber_url}; }
  for (const r of larik(P.rumah_ibadah)) { const kp = r.kode_prov || r.prov; if (kp && r.kab) ke(String(kp).slice(0, 2), r.kab).ibadah = {masjid: r.masjid ?? null, musala: r.musala ?? null, sumber_url: r.sumber_url}; }
  for (const r of larik(P.kerentanan_bps)) if (r.prov && r.kab && r.nilai != null) ((ke(String(r.prov), r.kab).bps ||= {})[r.indikator] = {nilai: r.nilai, satuan: r.satuan || null, tahun: r.tahun || null, sumber_url: r.sumber_url});
  const od = P.osm_darurat; if (od?.baris) { const ci = c => od.kolom.indexOf(c); for (const b of od.baris) { const kp = b[ci("prov")], kb = b[ci("kab")], j = b[ci("jenis")]; if (!kp || !j) continue;
    for (const o of [pv(kp), kb ? ke(kp, kb) : null].filter(Boolean)) { const t = o.darurat ||= {}; t[j] = (t[j] || 0) + 1; } } }
  /* ponytail: sirene tsunami belum disambung: sumbernya campuran rekap 2018, daftar kota 2024, dan rekap kab 2026 tanpa koordinat, dijumlah akan dobel */
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
  /* gelombang 31 Okt: armada kantor SAR (nama kantor dicocokkan ketat) dan dana kebencanaan lembaga filantropi dari laporan tahunannya */
  for (const a of larik(P.armada_sar)) { const id = cari(pz, a.kantor_sar); if (id) (ke(id).armada ||= []).push({jenis: a.jenis, nama: a.nama_unit || null, kelas: a.kelas || null, jumlah: a.jumlah ?? null, tahun: a.tahun || null, sumber_url: a.sumber_url}); }
  for (const d of larik(P.dana_filantropi)) { const id = ada.has(d.lembaga_id) ? d.lembaga_id : null; if (id) (ke(id).dana ||= []).push({tahun: d.tahun, total: d.total_dihimpun ?? null, bencana_dihimpun: d.dana_kemanusiaan_bencana_dihimpun ?? null,
    bencana_disalurkan: d.dana_bencana_disalurkan ?? null, penerima: d.penerima_manfaat_bencana ?? null, jenis_angka: d.jenis_angka || null, opini: d.opini || null, sumber_url: d.sumber_url}); }
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
  for (const g of larik(P.gdacs_kejadian)) if (ada.has(g.kejadian_id) && g.alertlevel) ke(g.kejadian_id).gdacs = {level: g.alertlevel, skor: g.alertscore ?? null, severitas: g.severitas || null, url: g.url};
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
  /* perusahaan logistik yang hanya bernama (tanpa alamat atau kontak) tidak dimasukkan: baris tanpa isi */
  for (const f of ["komunikasi_darurat", "logistik_usaha"]) for (const l of larik(P[f])) if (l?.id && l.nama && !l.memperkaya_rujukan && (f !== "logistik_usaha" || l.alamat || [].concat(l.telepon || [], l.email || []).length)) tambah({...l});
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
  rumpun: r.rumpun || [], kata_kunci: r.kata_kunci || [], bidang: r.bidang || null, syarat_pemohon: [].concat(r.syarat_pemohon || []), url: r.url, sumber: [{url: r.sumber_url}], diperiksa: r.diperiksa}));

/* Skor kesiapan daerah dan kesenjangan (permintaan pemilik 31 Okt 2026), rumus terbuka. Dasar: kab/kota di indeks risiko kecamatan
   (public/banjir/data/risiko_kecamatan.json; risiko = rata-rata kecamatan, penduduk = jumlah kecamatan). Komponen kesiapan, masing-masing
   persentil di antara kab/kota yang punya nilainya:
     fiskal  = anggaran BTT tahun terbaru per jiwa (DJPK);
     faskes  = rata-rata persentil tempat tidur RS per 10.000 jiwa dan puskesmas per 100.000 jiwa;
     lembaga = lembaga direktori berkantor di kab/kota itu per 100.000 jiwa (tanpa penerbit dan penyedia e-Katalog);
     pakar   = pakar direktori di provinsinya per 1 juta jiwa provinsi (tingkat provinsi, belum per kab).
   Skor = 100 x rata-rata komponen yang tersedia, minimal 3 komponen. Kesenjangan = persentil risiko dikurangi persentil kesiapan (x100).
   Kebutuhan = rata-rata persentil kerentanan warga (31 Okt): kemiskinan, tanpa air minum layak, tanpa sanitasi layak, IPM rendah (BPS; lansia
   dan disabilitas per kab belum terbuka tanpa kunci API), dan kerawanan pangan (100 dikurangi skor IKP Bapanas). Beban = rata-rata persentil risiko dan kebutuhan
   (kebutuhan hilang = risiko saja). Kesenjangan = persentil beban dikurangi persentil kesiapan (x100).
   Kuadran memakai median: beban tinggi dan kesiapan rendah = prioritas. Kelas BPBD tidak dipakai: 352 dari 354 BPBD belum terisi.
   ponytail: bobot sama rata; ubah bila pemilik ingin menekankan komponen tertentu. */
export function kesiapanDaerah(wd, rk, induk0, kampus, lembaga) {
  const kol = c => rk.kolom.indexOf(c), K = new Map();
  for (const r of rk.kec || []) { const k = String(r[kol("prov")]) + "|" + kunciKab(r[kol("kab")]); const o = K.get(k) || K.set(k, {prov: String(r[kol("prov")]), kab: r[kol("kab")], rs: [], pend: 0}).get(k);
    if (r[kol("risiko")] != null) o.rs.push(r[kol("risiko")]); o.pend += r[kol("pend")] || 0; }
  const W = new Map(larik(wd.kab).map(r => [r.prov + "|" + kunciKab(r.kab), r]));
  const nLb = new Map(); for (const l of lembaga) if (l.kab && l.prov && l.kategori !== "penerbit" && l.sub !== "penyedia e-Katalog") { const k = String(l.prov) + "|" + kunciKab(l.kab); nLb.set(k, (nLb.get(k) || 0) + 1); }
  const induk = Array.isArray(induk0) ? induk0 : induk0?.orang || [], nPk = {}; for (const o of induk) { const p = kampus?.[o[2]]?.prov; if (p) nPk[p] = (nPk[p] || 0) + 1; }
  const pendProv = {}; for (const o of K.values()) pendProv[o.prov] = (pendProv[o.prov] || 0) + o.pend;
  const baris = [...K].map(([k, o]) => { const w = W.get(k) || {}, th = Object.keys(w.apbd || {}).sort().reverse().find(t => w.apbd[t].BTT != null), f = w.fasilitas || {}, pend = o.pend || null;
    const bps = w.bps || {}, cari1 = re => { const k = Object.keys(bps).find(x => re.test(x)); return k ? Number(bps[k].nilai) : null; }, inv = v => v == null || !Number.isFinite(v) ? null : 100 - v;
    const butuh = {miskin: cari1(/penduduk miskin|\bP0\b/i), lansia: cari1(/lansia|60/i), disabilitas: cari1(/disabil/i), air: inv(cari1(/akses air minum layak/i)), sanitasi: inv(cari1(/akses sanitasi layak/i)),
      ipm: inv(cari1(/^IPM$|indeks pembangunan manusia/i)), pangan: w.ikp?.skor != null ? 100 - w.ikp.skor : null};   /* hunian layak baru 37 kab (NTT, Lampung): tidak dipakai supaya kab lain tidak tertimbang beda */
    return {k, prov: o.prov, kab: w.kab || o.kab, pend, butuh, risiko: o.rs.length ? o.rs.reduce((a, b) => a + b, 0) / o.rs.length : null,
      v: {fiskal: th && pend ? w.apbd[th].BTT / pend : null, tt: f.rs_tt && pend ? f.rs_tt / pend * 1e4 : null, pkm: f.puskesmas && pend ? f.puskesmas / pend * 1e5 : null,
        lembaga: pend ? (nLb.get(k) || 0) / pend * 1e5 : null, pakar: pendProv[o.prov] ? (nPk[o.prov] || 0) / pendProv[o.prov] * 1e6 : null}}; });
  /* persentil peringkat tengah: nilai kembar mendapat posisi rata-ratanya */
  const pctl = v => x => x == null || !v.length ? null : (v.filter(t => t < x).length + v.filter(t => t === x).length / 2) / v.length;
  const pers = key => pctl(baris.map(b => b.v[key]).filter(x => x != null));
  const P = Object.fromEntries(["fiskal", "tt", "pkm", "lembaga", "pakar"].map(k => [k, pers(k)])), rata = a => { a = a.filter(x => x != null); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
  for (const b of baris) { const fk = rata([P.tt(b.v.tt), P.pkm(b.v.pkm)]); b.komp = {fiskal: P.fiskal(b.v.fiskal), faskes: fk, lembaga: P.lembaga(b.v.lembaga), pakar: P.pakar(b.v.pakar)};
    const a = Object.values(b.komp).filter(x => x != null); b.skor = a.length >= 3 ? Math.round(rata(a) * 100) : null; }
  const PB = Object.fromEntries(["miskin", "lansia", "disabilitas", "air", "sanitasi", "ipm", "pangan"].map(k => [k, pctl(baris.map(b => b.butuh[k]).filter(x => x != null && Number.isFinite(x)))]));
  for (const b of baris) { const a = Object.entries(b.butuh).map(([k, v]) => v == null || !Number.isFinite(v) ? null : PB[k](v)); b.kebutuhan = rata(a); b.butuhP = Object.fromEntries(Object.keys(b.butuh).map((k, i) => [k, a[i]])); }
  const pR0 = pctl(baris.map(b => b.risiko).filter(x => x != null));
  for (const b of baris) { const r = pR0(b.risiko); b.beban = r == null ? null : b.kebutuhan == null ? r : (r + b.kebutuhan) / 2; }
  const pR = pctl(baris.map(b => b.beban).filter(x => x != null)), pS = pctl(baris.map(b => b.skor).filter(x => x != null));
  const ada = baris.filter(b => b.skor != null).sort((a, b) => b.skor - a.skor); ada.forEach((b, i) => { b.peringkat = i + 1; });
  const hasil = {}; for (const b of baris) { const r = pR(b.beban), q = pS(b.skor), dalamProv = ada.filter(x => x.prov === b.prov);
    hasil[b.k] = {prov: b.prov, kab: b.kab, nama_rk: K.get(b.k).kab, skor: b.skor, risiko: b.risiko == null ? null : Math.round(b.risiko * 10) / 10, kesenjangan: r == null || q == null ? null : Math.round((r - q) * 100),
      kuadran: r == null || q == null ? null : (r >= 0.5 ? (q < 0.5 ? "prioritas" : "siaga") : (q < 0.5 ? "perkuat" : "aman")),
      peringkat: b.peringkat || null, peringkat_prov: b.peringkat ? dalamProv.indexOf(b) + 1 : null, jumlah_prov: dalamProv.length,
      komp: Object.fromEntries(Object.entries(b.komp).map(([k, v]) => [k, v == null ? null : Math.round(v * 100)])),
      kebutuhan: b.kebutuhan == null ? null : Math.round(b.kebutuhan * 100), butuh: Object.fromEntries(Object.entries(b.butuhP).filter(([, v]) => v != null).map(([k, v]) => [k, Math.round(v * 100)])),
      nilai: {btt_per_jiwa: b.v.fiskal == null ? null : Math.round(b.v.fiskal), tt_per_10rb: b.v.tt == null ? null : Math.round(b.v.tt * 10) / 10, puskesmas_per_100rb: b.v.pkm == null ? null : Math.round(b.v.pkm * 10) / 10,
        lembaga_per_100rb: b.v.lembaga == null ? null : Math.round(b.v.lembaga * 10) / 10, pakar_prov_per_1jt: b.v.pakar == null ? null : Math.round(b.v.pakar * 10) / 10}}; }
  return {jumlah: ada.length, hari_risiko: rk.hari || null, baris: hasil};
}

/* tesis, disertasi, dan skripsi kebencanaan dari repositori kampus (OAI-PMH): saringan judul ketat, karena kata "kekeringan" atau "banjir" juga muncul
   di judul agronomi dan teknik biasa; nama kampus repositori dicocokkan ke kampus direktori lewat indeks dan alias hubung.mjs */
const TESIS_YA = /bencana|banjir|longsor|gempa|tsunami|erupsi|gunung ?api|lahar|kebakaran hutan|karhutla|mitigasi|kesiapsiagaan|evakuasi|tanggap darurat|pengungsi|rawan|abrasi|\brob\b|disaster|flood|landslide|earthquake|volcan|wildfire|evacuat|hazard/i;
const TESIS_TIDAK = /cekaman|tanaman|varietas|benih|drought stress|salinitas|kultur|ternak|kekeringan fisiologis/i;
export function tesisKampus(rows, kampus) {
  const pk = indeks(Object.keys(kampus || {}).map(n => ({id: n, nama: n, alias: kampus[n]?.alias}))), out = {};
  for (const r of larik(rows)) { if (!r.judul || !TESIS_YA.test(r.judul) || TESIS_TIDAK.test(r.judul)) continue; const k = cari(pk, r.kampus); if (!k) continue;
    (out[k] ||= []).push({judul: r.judul, penulis: r.penulis || null, tahun: r.tahun || null, jenjang: r.jenjang || null, rumpun: r.rumpun || [], url: r.url}); }
  for (const k of Object.keys(out)) out[k].sort((a, b) => (b.tahun || 0) - (a.tahun || 0));
  return out;
}

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
    "pos_sar", "pmi_kab", "lpbi_nu", "forum_prb_baru", "tim_respons", "katalog_penyedia", "hibah_riset_baru", "radar_dana", "daftar_hitam_mentah", "cems_idn",
    "inarisk_bahaya", "gdacs_kejadian", "psc119", "damkar", "komunikasi_darurat", "logistik_usaha", "armada_sar", "dana_filantropi",
    "ikp", "rumah_ibadah", "kerentanan_bps", "osm_darurat", "tesis_kebencanaan"].map(f => [f, baca(dp, f)]));
  P.geo_provinsi = JSON.parse(readFileSync(new URL("../../public/geo/provinsi.json", import.meta.url), "utf8"));
  const R = Object.fromEntries(["lembaga", "induk", "kejadian", "hibah_riset", "pendanaan", "kampus"].map(f => [f, baca(dr, f)]));
  mkdirSync(out, {recursive: true});
  const tulis = (f, d) => { writeFileSync(join(out, f + ".json"), JSON.stringify(d)); return f; };
  const lbLama = larik(R.lembaga), lbBaru = lembagaBaru(P, lbLama), lbSemua = [...lbLama, ...lbBaru];
  tulis("lembaga", Array.isArray(R.lembaga) ? lbSemua : {...R.lembaga, lembaga: lbSemua});
  const hb = hibahBaru(larik(R.hibah_riset), larik(P.hibah_riset_baru)); tulis("hibah_riset", Array.isArray(R.hibah_riset) || !R.hibah_riset ? [...larik(R.hibah_riset), ...hb] : {...R.hibah_riset, [Object.keys(R.hibah_riset).find(k => Array.isArray(R.hibah_riset[k]))]: [...larik(R.hibah_riset), ...hb]});
  /* entri radar- milik penyambung: disegarkan dari radar_dana (status "ditutup" dari tugas mingguan dipertahankan) */
  const rsSemua = radarSkema(P.radar_dana, new Set()), rsPeta = new Map(rsSemua.map(x => [x.id, x]));
  const pd = larik(R.pendanaan).map(x => rsPeta.has(x.id) ? {...rsPeta.get(x.id), status: x.status === "ditutup" ? "ditutup" : rsPeta.get(x.id).status} : x), rs = rsSemua.filter(x => !larik(R.pendanaan).some(y => y.id === x.id)); tulis("pendanaan", Array.isArray(R.pendanaan) ? [...pd, ...rs] : {...R.pendanaan, pendanaan: [...pd, ...rs]});
  /* hasil panen ulang bulanan disimpan kembali ke <keluar>/panen supaya bulan depan menjadi dasar */
  mkdirSync(join(out, "panen"), {recursive: true}); const simpanPanen = (f, d) => writeFileSync(join(out, "panen", f + ".json"), JSON.stringify(d));
  if (P.daftar_hitam_mentah) { P.daftar_hitam_cocok = daftarHitamCocok(P.daftar_hitam_mentah, lbSemua); simpanPanen("daftar_hitam_cocok", P.daftar_hitam_cocok); }
  const sb = P.cems_idn ? satelitCems(P.cems_idn, R.kejadian?.kejadian || R.kejadian, P.aktivasi_satelit) : [];
  if (sb.length) { P.aktivasi_satelit = [...larik(P.aktivasi_satelit), ...sb]; simpanPanen("aktivasi_satelit", P.aktivasi_satelit); }
  const wd = wilayahDaya(P), le = lembagaEkstra(P, lbSemua), pe = pakarEkstra(P, R.induk), ke = kejadianEkstra(P, R.kejadian?.kejadian || R.kejadian);
  wd.kesiapan = kesiapanDaerah(wd, JSON.parse(readFileSync(new URL("../../public/banjir/data/risiko_kecamatan.json", import.meta.url), "utf8")), R.induk, R.kampus, lbSemua);
  tulis("wilayah_daya", wd);
  const ts = P.tesis_kebencanaan ? tesisKampus(P.tesis_kebencanaan, R.kampus) : {}; if (Object.keys(ts).length) tulis("tesis", ts);   /* hasil kosong tidak ditulis, jadi tidak menimpa R2 */ tulis("lembaga_ekstra", le); tulis("pakar_ekstra", pe); tulis("kejadian_ekstra", ke);
  console.log(JSON.stringify({lembaga_baru: lbBaru.length, hibah_baru: hb.length, skema_radar: rs.length, wilayah_kab: wd.kab.length, wilayah_prov: Object.keys(wd.prov).length,
    lembaga_ekstra: Object.keys(le.lembaga).length, kampus_ekstra: Object.keys(le.kampus).length, daftar_hitam: Object.values(le.lembaga).filter(x => x.daftar_hitam).length,
    pakar_paten: Object.values(pe).filter(x => x.paten).length, pakar_orcid: Object.values(pe).filter(x => x.orcid).length,
    kejadian_ekstra: Object.keys(ke).length, satelit_baru: sb.length}, null, 1));
}
