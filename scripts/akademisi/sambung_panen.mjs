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

/* dataset Satu Data dianggap kebencanaan hanya bila judulnya jelas menyebut bencana, jenis bencana, atau upaya penanggulangannya */
const SD_YA = /bencana|banjir|longsor|gempa|tsunami|kebakaran|karhutla|erupsi|gunung ?api|kekeringan|tanggap darurat|kesiapsiagaan|abrasi|puting beliung|cuaca ekstrem|peringatan dini|damkar/i;
const SD_TIDAK = /pegawai|\basn\b|\bpns\b|\bkib\b|sakip|lkpj|emisi|\bgrk\b|perubahan iklim|korupsi|pmks|unjuk rasa|pertikaian|sekretariat dprd/i;
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
  /* gelombang 4 (1 Nov): Indeks Desa Membangun 2024 (Kemendesa) dirangkum per kab; capaian SPM urusan Trantibumlinmas (Kemendagri; publik tidak
     memisahkan sub-urusan bencana, jadi hanya ditampilkan dan tidak masuk skor kesiapan); dataset kebencanaan pemda di Satu Data Indonesia */
  for (const r of larik(P.indeks_desa)) if (r.prov && r.kab && r.skor_rata != null) ke(r.prov, r.kab).idm = {tahun: r.tahun, n_desa: r.n_desa, skor: r.skor_rata, ekologi: r.ekologi_rata ?? null, status: r.status || {}, sumber_url: r.sumber_url};
  for (const r of larik(P.spm_bencana)) if (r.prov && r.kab && r.capaian_persen != null) { const o = ke(r.prov, r.kab); if (!o.spm || r.tahun > o.spm.tahun) o.spm = {tahun: r.tahun, capaian: r.capaian_persen, sumber_url: r.sumber_url}; }
  for (const r of larik(P.dataset_satudata).filter(r => r.prov && r.kab && SD_YA.test(r.judul) && !SD_TIDAK.test(r.judul)).sort((a, b) => (b.tahun_terakhir || 0) - (a.tahun_terakhir || 0))) {
    const t = ke(r.prov, r.kab).satudata ||= {n: 0, contoh: []}; t.n++; if (t.contoh.length < 5) t.contoh.push({judul: r.judul, penerbit: r.publisher && !/^(tahunan|bulanan|harian|mingguan|triwulan|semester|insidental)/i.test(r.publisher) ? r.publisher : null, url: r.sumber_url}); }
  /* dokumen perencanaan kebencanaan per kab: rencana kontinjensi (tabel BNPB 2005-2020) dan perda penanggulangan bencana (peraturan.go.id) */
  /* BPS WebAPI per kab (panen 1 Nov 2026): kesiapan desa dari tabel Potensi Desa (tahun berbeda per kab, cakupan sebagian) dan penduduk lansia/balita; tautan WebAPI butuh kunci, jadi yang disimpan hanya domain dan nomor tabel BPS; tidak masuk skor kesiapan karena cakupannya belum menyeluruh */
  const PODES = ["desa_peringatan_dini", "desa_peringatan_tsunami", "desa_rambu_jalur_evakuasi", "desa_perlengkapan_keselamatan", "desa_mitigasi_sungai_tanggul", "jumlah_desa"];
  for (const r of larik(P.podes_kesiapan)) { if (!/^\d{4}$/.test(String(r.kode_kab || "")) || !r.nama) continue; const v = Object.fromEntries(PODES.filter(f => Number.isFinite(r[f])).map(f => [f, r[f]]));
    const dt = r.desa_terdampak && typeof r.desa_terdampak === "object" ? Object.fromEntries(Object.entries(r.desa_terdampak).filter(([, n]) => Number.isFinite(n) && n > 0)) : null;
    if (!Object.keys(v).length && !(dt && Object.keys(dt).length)) continue;
    ke(String(r.kode_kab).slice(0, 2), r.nama).podes = {...v, terdampak: dt && Object.keys(dt).length ? dt : null, tahun: r.tahun || null, tahun_terdampak: r.tahun_terdampak || r.tahun || null, bps: {domain: r.domain || null, tabel: r.var_id ?? null}}; }
  for (const r of larik(P.penduduk_rentan)) { if (!/^\d{4}$/.test(String(r.kode_kab || "")) || !r.nama || !Number.isFinite(r.penduduk_total)) continue;
    ke(String(r.kode_kab).slice(0, 2), r.nama).rentan = {lansia: Number.isFinite(r.lansia_65plus) ? r.lansia_65plus : null, balita: Number.isFinite(r.balita_0_4) ? r.balita_0_4 : null, total: r.penduduk_total, tahun: r.tahun || null, ribuan: /ribu/i.test(r.catatan || ""), bps: {domain: r.domain || null, tabel: r.var_id ?? null}}; }
  for (const r of larik(P.dokumen_prb)) if (r.prov && r.kab && r.judul) (ke(r.prov, r.kab).dokumen_prb ||= []).push({jenis: r.jenis, judul: String(r.judul).replace(/\s*\(kolom sumber:.*\)\s*$/, ""), tahun: r.tahun || null, sumber_url: r.sumber_url});
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

export function lembagaEkstra(P, lembaga, kampus = null, induk = null) {
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
  /* penulis artikel kebencanaan di jurnal GARUDA per kampus (afiliasi memuat nama kampus, kampus terpanjang menang) yang belum ada di direktori pakar: calon pakar, delapan teratas */
  if (kampus && P.garuda_penulis) { const kn = Object.keys(kampus).map(k => [k, norm(k)]).filter(([, n]) => n.length >= 8).sort((a, b) => b[1].length - a[1].length), nama = new Set(larik(induk?.orang || induk).map(o => norm(o[1] || "")));
    for (const g0 of larik(P.garuda_penulis)) { const g = {...g0, nama: /,/.test(g0.nama || "") ? g0.nama.split(",").map(x => x.trim()).reverse().join(" ") : g0.nama}; if (!g.nama || !g.afiliasi || nama.has(norm(g.nama))) continue; const af = norm(g.afiliasi), m = kn.find(([, n]) => af.includes(n)); if (!m) continue;
      ((K[m[0]] ||= {}).garuda ||= []).push({nama: g.nama, afiliasi: g.afiliasi, artikel: g.jumlah_artikel_kebencanaan || null, contoh: larik(g.judul_contoh)[0] || null}); }
    for (const v of Object.values(K)) if (v.garuda) v.garuda = v.garuda.sort((a, b) => (b.artikel || 0) - (a.artikel || 0)).slice(0, 8); }
  return {lembaga: L, kampus: K};
}

export function pakarEkstra(P, induk0) {
  const induk = Array.isArray(induk0) ? induk0 : induk0?.orang || [], X = {}, ke = id => X[id] ||= {}, ada = new Set(larik(induk).map(o => o[0]));
  const paten = new Map(larik(P.paten).map(p => [p.nomor_permohonan, p]));
  for (const c of larik(P.paten_cocok)) for (const i of c.inventor || []) if (ada.has(i.pakar_id)) { const p = paten.get(c.nomor_permohonan); if (!p) continue;
    (ke(i.pakar_id).paten ||= []).push({judul: p.judul, nomor: p.nomor_paten || p.nomor_permohonan, jenis: p.jenis, status: p.status, tanggal: p.tanggal_diberi || p.tanggal_permohonan, pemegang: (p.pemegang || []).map(x => x.pemegang || x).join(", "), sumber_url: p.sumber_url}); }
  for (const o of larik(P.orcid_pakar?.cocok)) if (ada.has(o.pakar_id)) ke(o.pakar_id).orcid = o.orcid;
  /* dataset terbuka kebencanaan (Zenodo dan repositori data lain) yang pembuatnya pakar direktori; dicocokkan lewat ORCID saja */
  const orc = new Map(); for (const o of larik(induk)) if (o[7]) orc.set(String(o[7]).replace(/^https?:\/\/orcid\.org\//, ""), o[0]); for (const [id, v] of Object.entries(X)) if (v.orcid) orc.set(v.orcid, id);
  for (const d of larik(P.dataset_terbuka)) { const sudah = new Set(); for (const p of larik(d.pembuat)) { const id = p.orcid && orc.get(p.orcid); if (!id || sudah.has(id)) continue; sudah.add(id);
    (ke(id).dataset ||= []).push({judul: d.judul, repositori: d.repositori || null, tahun: d.tahun || null, url: d.doi ? "https://doi.org/" + d.doi : d.url || null}); } }
  /* penyandang dana karya pakar (OpenAlex grants, berasal dari Crossref Funder Registry; pakar dicocokkan lewat id OpenAlex): enam pemberi teratas per pakar */
  const dn = {}; for (const r of larik(P.pendanaan_pakar)) { if (!ada.has(r.pakar_id) || !r.funder) continue; const m = (dn[r.pakar_id] ||= {}), f = m[r.funder] ||= {nama: r.funder, ror: r.funder_ror || null, karya: new Set(), tahun: 0, contoh: null};
    f.karya.add(r.karya_doi || r.karya_judul); if ((r.tahun || 0) >= f.tahun) { f.tahun = r.tahun || 0; f.contoh = {judul: r.karya_judul, url: r.sumber_url}; } }
  /* bidang keahlian kebencanaan per pakar (topik OpenAlex): daftar izin ketat, ekologi umum, kesehatan, keuangan, dan pendidikan dibuang; api dan gambut tetap */
  const TOPIK_YA = /disaster|flood|earthquake|seism|tsunami|landslide|volcan|peat|fire|drought|coastal (and marine dynamics|management)|hydrolog|stormwater|erosion|cyclone|emergency management|climate variability/i,
    TOPIK_TIDAK = /ecosystem|plant|species|agricultur|health|education|cardiac|financial|portfolio|insurance|supply chain|statistic|mental|tall buildings/i;
  for (const t of larik(P.topik_pakar)) if (ada.has(t.pakar_id)) { const a = larik(t.topik).filter(x => TOPIK_YA.test(x.nama) && (!TOPIK_TIDAK.test(x.nama) || /fire|peat/i.test(x.nama))).slice(0, 5).map(x => ({nama: x.nama, karya: x.karya ?? null}));
    if (a.length) ke(t.pakar_id).topik = a; }
  /* rekan penulis yang juga ada di direktori (karya kebencanaan bersama 2015 ke atas, OpenAlex): delapan teratas per pakar */
  const rk = {}; for (const r of larik(P.rekan_pakar)) if (r.a !== r.b && ada.has(r.a) && ada.has(r.b)) { (rk[r.a] ||= []).push([r.b, r]); (rk[r.b] ||= []).push([r.a, r]); }
  for (const [id, a] of Object.entries(rk)) ke(id).rekan = a.sort((x, y) => y[1].karya - x[1].karya || (y[1].tahun_akhir || 0) - (x[1].tahun_akhir || 0)).slice(0, 8)
    .map(([b, r]) => ({id: b, karya: r.karya, tahun: r.tahun_akhir || null, contoh: r.contoh_judul ? {judul: r.contoh_judul, url: r.sumber_url || null} : null}));
  for (const [id, m] of Object.entries(dn)) ke(id).dana = Object.values(m).map(f => ({nama: f.nama, ror: f.ror, karya: f.karya.size, tahun: f.tahun || null, contoh: f.contoh})).sort((a, b) => b.karya - a.karya || b.tahun - a.tahun).slice(0, 6);
  return X;
}

const JENIS_EMDAT = {banjir: ["Flood"], "banjir bandang": ["Flood", "Mass movement (wet)"], longsor: ["Mass movement (wet)", "Mass movement (dry)"], gempa: ["Earthquake"], tsunami: ["Earthquake"], "gunung api": ["Volcanic activity"],
  erupsi: ["Volcanic activity"], karhutla: ["Wildfire"], kekeringan: ["Drought"], "cuaca ekstrem": ["Storm"], siklon: ["Storm"], hidrometeorologi: ["Flood", "Storm", "Mass movement (wet)"]};
/* usulan tim pakar per kejadian besar: rumpun dan topik OpenAlex sesuai jenis bencana (wajib salah satu), kampus di provinsi terdampak, pernah meneliti kejadian itu, h-index (dibatasi 40);
   lalu dipilih bertahap, pakar yang pernah menulis bersama anggota terpilih mendapat tambahan. Peneliti asing (indeks 15 bernilai "asing", sama dengan layar) dan tanpa afiliasi dilewati; diaspora Indonesia tetap boleh. Usulan otomatis, bukan penugasan. */
const JENIS_RUMPUN = {gempa: ["gempa", "geologi"], tsunami: ["tsunami", "gempa", "pesisir"], banjir: ["banjir", "hidrometeorologi"], "banjir bandang": ["banjir", "longsor"], longsor: ["longsor", "geologi"], "gunung api": ["gunung api", "geologi"],
  karhutla: ["karhutla"], kekeringan: ["kekeringan", "iklim"], hidrometeorologi: ["hidrometeorologi", "banjir", "longsor"], pesisir: ["pesisir"]};
const JENIS_TOPIK = {gempa: /earthquake|seism/i, tsunami: /tsunami/i, banjir: /flood|stormwater|hydrolog/i, "banjir bandang": /flood|landslide/i, longsor: /landslide/i, "gunung api": /volcan/i, karhutla: /fire|peat/i, kekeringan: /drought/i,
  hidrometeorologi: /flood|landslide|cyclone|hydrolog/i, pesisir: /coastal|erosion/i};
export function timPakar(kejadian, induk0, kampus = {}, P = {}, ukuran = 8) {
  const orang = larik(induk0?.orang || induk0).filter(o => o && o[15] !== "asing" && o[2] && !/belum diketahui/i.test(o[2])), tp = new Map(larik(P.topik_pakar).map(t => [t.pakar_id, larik(t.topik)])), rk = new Map();
  for (const r of larik(P.rekan_pakar)) { (rk.get(r.a) || rk.set(r.a, new Set()).get(r.a)).add(r.b); (rk.get(r.b) || rk.set(r.b, new Set()).get(r.b)).add(r.a); }
  const X = {};
  for (const k of larik(kejadian)) { const jr = JENIS_RUMPUN[k.jenis] || [k.jenis], jt = JENIS_TOPIK[k.jenis], pv = new Set(larik(k.prov).map(String)), tulis = new Set(larik(k.riset?.works).flatMap(w => larik(w.pakar)));
    const cal = [];
    for (const o of orang) { const rm = larik(o[3]).filter(r => jr.includes(r)), tpk = jt ? (tp.get(o[0]) || []).filter(t => jt.test(t.nama || "")).map(t => t.nama) : [];
      if (!rm.length && !tpk.length) continue; let sk = 0; const al = [];
      if (rm.length) { sk += 3; al.push("rumpun " + rm.join(" dan ")); } if (tpk.length) { sk += 2; al.push("keahlian " + tpk[0]); }
      if (pv.has(String(kampus[o[2]]?.prov || ""))) { sk += 2; al.push("kampus di provinsi terdampak"); } if (tulis.has(o[0])) { sk += 3; al.push("pernah meneliti kejadian ini"); }
      sk += Math.min(Number(o[4]) || 0, 40) / 10; cal.push({id: o[0], sk, al}); }
    const kol = cal.sort((a, b) => b.sk - a.sk).slice(0, 200), pilih = [];
    while (pilih.length < ukuran && kol.length) { let iB = 0, vB = -1, rB = null;
      kol.forEach((c, i) => { const r = pilih.find(p => rk.get(c.id)?.has(p.id)), v = c.sk + (r ? 1 : 0); if (v > vB) { vB = v; iB = i; rB = r; } });
      const c = kol.splice(iB, 1)[0]; pilih.push({id: c.id, skor: Math.round(vB * 10) / 10, alasan: rB ? [...c.al, "pernah menulis bersama anggota usulan lain"] : c.al}); }
    if (pilih.length) X[k.id] = pilih; }
  return X;
}
/* kesenjangan bantuan per provinsi: aksi bantuan tercatat dibanding kejadian dan terdampak DIBI sejak tahun dari; deskriptif, bias cakupan sumber (lembaga besar dan media nasional) */
export function ringkasBantuanProv(aksi, dibi, dari = 2019) {
  const X = {}, kol = c => larik(dibi?.kolom).indexOf(c), ke = p => X[p] ||= {prov: p, aksi: 0, pemberi: new Set(), total_rp: 0, kejadian: 0, terdampak: 0, meninggal: 0};
  for (const a of larik(aksi)) if (/^\d{2}$/.test(String(a.prov || ""))) { const x = ke(String(a.prov)); x.aksi++; x.pemberi.add(a.kunci); x.total_rp += a.nilai_rp || 0; }
  for (const r of larik(dibi?.baris)) { const th = r[kol("tahun")]; if (th < dari) continue; const x = ke(String(r[kol("kab")]).slice(0, 2)); x.kejadian += r[kol("kejadian")] || 0; x.terdampak += r[kol("terdampak")] || 0; x.meninggal += r[kol("meninggal_hilang")] || 0; }
  return Object.values(X).filter(x => x.kejadian || x.aksi).map(x => ({...x, pemberi: x.pemberi.size, per100: x.kejadian ? Math.round(x.aksi / x.kejadian * 1000) / 10 : null})).sort((a, b) => b.terdampak - a.terdampak);
}
/* donasi bencana dari berita dan laman lembaga (panen 1 Nov 2026): satu baris per aksi (uang, barang, peralatan, layanan), digabung per pemberi untuk peringkat.
   Nilai rupiah hanya yang tertulis di sumber; ACT dan kasus KPK dibuang; aksi ganda (pemberi, kejadian atau lokasi, nilai sama dalam 7 hari) disatukan. */
const DONASI_ACT = /aksi cepat tanggap|^ACT\b/i, DONASI_KORUPSI = /\bkpk\b|korupsi/i;
export function donasiBencana(rows, lembaga = [], kejadian = []) {
  const lb = new Map(larik(lembaga).map(x => [x.id, x])), kj = new Set(larik(kejadian).map(k => k.id)), out = [], lihat = new Map();
  const tgl = t => Date.parse(String(t || "").slice(0, 10)) || 0;
  for (const r of larik(rows).slice().sort((a, b) => tgl(a.tanggal) - tgl(b.tanggal))) {
    const nama = String(r.donor_nama || "").trim(), l = r.lembaga_id && lb.get(r.lembaga_id);
    if (!nama && !l) continue; if (DONASI_ACT.test(nama) || DONASI_KORUPSI.test(r.judul || "")) continue;
    const kunci = l ? "L:" + l.id : r.kampus ? "K:" + r.kampus : "T:" + norm(nama), sasaran = (r.kejadian_id && kj.has(r.kejadian_id) ? r.kejadian_id : "") || norm(r.kab || r.prov || r.penerima_teks || "");
    const nv = Number(r.nilai_rp), nilai = r.nilai_rp != null && r.nilai_rp !== "" && Number.isFinite(nv) && nv > 0 ? nv : null, kg = kunci + "|" + sasaran + "|" + (nilai || larik(r.bentuk).slice().sort().join("+") + "|" + norm(r.barang || "")), ganda = lihat.get(kg);
    if (ganda && Math.abs(tgl(r.tanggal) - tgl(ganda.tanggal)) <= 7 * 864e5) { if (r.sumber_url && r.sumber_url !== ganda.sumber_url) (ganda.url_lain ||= []).push(r.sumber_url); continue; }
    const x = {kunci, nama: l ? l.nama : r.kampus || nama, lembaga_id: l ? l.id : null, kampus: r.kampus || null, jenis: r.donor_jenis || null, bentuk: larik(r.bentuk).filter(b => /^(uang|barang|peralatan|layanan)$/.test(b)),
      nilai_rp: nilai, barang: r.barang || null, penerima: r.penerima_teks || null, prov: r.prov || null, kab: r.kab || null, kejadian_id: r.kejadian_id && kj.has(r.kejadian_id) ? r.kejadian_id : null,
      jenis_bencana: r.jenis_bencana || null, tanggal: r.tanggal ? String(r.tanggal).slice(0, 10) : null, judul: r.judul || null, sumber_url: r.sumber_url || null};
    lihat.set(kg, x); out.push(x); }
  const per = new Map();
  for (const x of out) { const d = per.get(x.kunci) || per.set(x.kunci, {kunci: x.kunci, nama: x.nama, lembaga_id: x.lembaga_id, kampus: x.kampus, jenis: x.jenis, aksi: 0, total_rp: 0, aksi_rp: 0, bentuk: {}, kejadian: new Set(), prov: new Set(), terakhir: null}).get(x.kunci);
    d.aksi++; if (x.nilai_rp) { d.total_rp += x.nilai_rp; d.aksi_rp++; } x.bentuk.forEach(b => { d.bentuk[b] = (d.bentuk[b] || 0) + 1; }); if (x.kejadian_id) d.kejadian.add(x.kejadian_id); if (x.prov) d.prov.add(String(x.prov));
    if (!d.terakhir || (x.tanggal || "") > d.terakhir) d.terakhir = x.tanggal; d.jenis ||= x.jenis; }
  const pemberi = [...per.values()].map(d => ({...d, kejadian: [...d.kejadian], prov: [...d.prov].sort()})).sort((a, b) => b.aksi - a.aksi || b.total_rp - a.total_rp);
  return {pemberi, aksi: out.sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || ""))};
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
  /* nomor GLIDE (glidenumber.net, satu kandidat per kejadian) dan catatan EM-DAT (CRED/UCLouvain): dicocokkan lewat GLIDE, lalu jenis dan tanggal 0 sampai 14 hari bila tepat satu */
  for (const g of larik(P.glide_cocok)) if (ada.has(g.kejadian_id) && g.glide) { ke(g.kejadian_id).glide = g.glide; glide[g.glide] ??= g.kejadian_id; }
  /* GLIDE EM-DAT tanpa akhiran negara (FL-2025-000217), glidenumber.net dengan akhiran (-IDN): kunci disamakan. Satu catatan EM-DAT hanya untuk satu kejadian; jalur GLIDE didahulukan */
  const gk = g => String(g || "").replace(/-[A-Z]{3}$/, ""), em = larik(P.emdat_idn).filter(r => r.kelompok === "alam"), emG = new Map(em.filter(r => r.glide).map(r => [gk(r.glide), r])), kej = larik(kejadian), dapat = {}, pakai = new Set();
  for (const k of kej) { const r = X[k.id]?.glide && emG.get(gk(X[k.id].glide)); if (r && !pakai.has(r.disno)) { dapat[k.id] = r; pakai.add(r.disno); } }
  for (const k of kej) { if (dapat[k.id] || !k.tanggal) continue; const j = JENIS_EMDAT[k.jenis] || [], c = em.filter(e => j.includes(e.jenis) && e.tanggal_pasti && e.mulai && Math.abs(Date.parse(e.mulai) - Date.parse(k.tanggal)) / 864e5 <= 14);
    if (c.length === 1 && !pakai.has(c[0].disno)) { dapat[k.id] = c[0]; pakai.add(c[0].disno); } }
  for (const k of kej) { const r = dapat[k.id];
    if (r) ke(k.id).emdat = {disno: r.disno, meninggal: r.meninggal ?? null, terdampak: r.terdampak ?? null, kerugian_ribu_usd: r.kerugian_ribu_usd ?? null, kerugian_ribu_usd_riil: r.kerugian_ribu_usd_riil ?? null,
      bantuan_ribu_usd: r.bantuan_ribu_usd ?? null, url: "https://public.emdat.be/"}; }
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

/* uji balik skor kesiapan lawan dampak nyata DIBI: kalau skor benar mengukur kesiapan, kab/kota berskor rendah mestinya menanggung korban dan kerusakan
   per kejadian lebih besar. Dampak per kejadian (bukan jumlah kejadian) supaya frekuensi bahaya tidak ikut terhitung; karhutla dan kekeringan dikecualikan
   (korbannya tidak tercatat sebanding per kejadian). Spearman, kab/kota dengan paling sedikit 3 kejadian. Lulus = skor berkorelasi negatif (r <= -0,1)
   dan nyata (|t| >= 2) dengan paling sedikit satu ukuran dampak; tidak lulus = layar memberi label hipotesis.
   Batas: skor memakai data kapasitas sekarang, dampak dari tahun lalu; itu menguji kecocokan, bukan ramalan. */
export function ujiKesiapan(baris, dibi, namaKab, dari = 2015, opsi = {}) {
  const kol = c => dibi.kolom.indexOf(c), key = {}; for (const [kode, nama] of Object.entries(namaKab)) key[kode] = kode.slice(0, 2) + "|" + kunciKab(String(nama).replace(/^Kab\. Administrasi /, "Kab. ").replace(/\bKep\. /, "Kepulauan ").replace(/ dan /, " "));
  const agg = {}; let sampai = dari;
  for (const r of dibi.baris || []) { const th = r[kol("tahun")], j = r[kol("jenis")], k = key[r[kol("kab")]]; if (th < dari || (!opsi.jenis && (j === "karhutla" || j === "kekeringan")) || !k || !baris[k]) continue;
    sampai = Math.max(sampai, th); const a = agg[k] ||= {kej: 0, mati: 0, dampak: 0, rusak: 0};
    a.kej += r[kol("kejadian")] || 0; a.mati += r[kol("meninggal_hilang")] || 0; a.dampak += (r[kol("terdampak")] || 0) + (r[kol("mengungsi")] || 0); a.rusak += r[kol("rumah_rusak_berat")] || 0; }
  const ks = Object.keys(agg).filter(k => agg[k].kej >= 3 && baris[k].skor != null && baris[k].kesenjangan != null);
  const rank = x => { const o = x.map((v, i) => i).sort((a, b) => x[a] - x[b]), r = []; for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && x[o[j + 1]] === x[o[i]]) j++; for (let t = i; t <= j; t++) r[o[t]] = (i + j) / 2; i = j + 1; } return r; };
  const sp = (a, b) => { const ra = rank(a), rb = rank(b), n = a.length, m = (n - 1) / 2; let c = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { c += (ra[i] - m) * (rb[i] - m); va += (ra[i] - m) ** 2; vb += (rb[i] - m) ** 2; }
    const r = va && vb ? c / Math.sqrt(va * vb) : 0; return {r: Math.round(r * 1000) / 1000, t: Math.round(r * Math.sqrt((n - 2) / Math.max(1e-9, 1 - r * r)) * 10) / 10}; };
  const UK = {mati: "meninggal dan hilang per kejadian", dampak: "terdampak dan mengungsi per kejadian", rusak: "rumah rusak berat per kejadian"};
  const y = u => ks.map(k => agg[k][u] / agg[k].kej), korelasi = {};
  for (const x of ["skor", "kesenjangan"]) korelasi[x] = Object.fromEntries(Object.keys(UK).map(u => [u, sp(ks.map(k => baris[k][x]), y(u))]));
  const med = a => { a = [...a].sort((p, q) => p - q); return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : null; };
  const kuadran = Object.fromEntries(["prioritas", "siaga", "perkuat", "aman"].map(q => { const g = ks.filter(k => baris[k].kuadran === q);
    return [q, {n: g.length, mati: Math.round(med(g.map(k => agg[k].mati / agg[k].kej)) * 1000) / 1000, rusak: Math.round(med(g.map(k => agg[k].rusak / agg[k].kej)) * 100) / 100}]; }));
  const lolos = Object.keys(UK).filter(u => korelasi.skor[u].r <= -0.1 && korelasi.skor[u].t <= -2), lulus = ks.length >= 100 && lolos.length > 0;
  /* per jenis (n >= 100): ambang lebih ketat t <= -3 karena banyak uji sekaligus (sekitar 7 jenis x 3 ukuran, setara koreksi Bonferroni) */
  const per_jenis = {}; if (!opsi.jenis) for (const j of [...new Set((dibi.baris || []).map(r => r[kol("jenis")]))]) {
    const u = ujiKesiapan(baris, {...dibi, baris: dibi.baris.filter(r => r[kol("jenis")] === j)}, namaKab, dari, {jenis: j}); if (u.n < 100) continue;
    per_jenis[j] = {n: u.n, ...u.korelasi.skor, teruji: Object.values(u.korelasi.skor).some(v => v.r <= -0.1 && v.t <= -3)}; }
  return {dari, sampai, n: ks.length, ukuran: UK, korelasi, kuadran, lulus, lolos, per_jenis, sumber_url: "https://dibi.bnpb.go.id"};
}

/* tesis, disertasi, dan skripsi kebencanaan dari repositori kampus (OAI-PMH): saringan judul ketat, karena kata "kekeringan" atau "banjir" juga muncul
   di judul agronomi dan teknik biasa; nama kampus repositori dicocokkan ke kampus direktori lewat indeks dan alias hubung.mjs */
const TESIS_YA = /bencana|banjir|longsor|gempa|tsunami|erupsi|gunung ?api|lahar|kebakaran hutan|kebakaran lahan|karhutla|kesiapsiagaan|evakuasi|tanggap darurat|pengungsi|huntara|abrasi|banjir rob|genangan rob|likuefaksi|mitigasi (bencana|banjir|longsor|gempa|tsunami|struktural|non ?struktural)|rawan (bencana|banjir|longsor|gempa|tsunami|kebakaran|erupsi|kekeringan)|zona rawan|kerawanan bencana|disaster|flood|landslide|earthquake|volcan|wildfire|evacuat|tsunami|natural hazard|multi-?hazard|seismic hazard|geohazard|hazard (map|assessment|zon)/i;
const TESIS_TIDAK = /cekaman|tanaman|varietas|benih|drought stress|salinitas|kultur|ternak|kekeringan fisiologis|perencanaan struktur|perancangan struktur|portal (beton|terbuka)|srpmk|sni 1726|covid|pandemi|buku teks|negara transit|pencari suaka|imigran|unhcr|moral hazard|proportional hazard|hazard ratio|kredit|perbankan|nasabah|saham|keselamatan dan kesehatan kerja|\bk3\b|hirarc|hiradc/i;
export function tesisKampus(rows, kampus) {
  const pk = indeks(Object.keys(kampus || {}).map(n => ({id: n, nama: n, alias: kampus[n]?.alias}))), out = {}, lihat = new Set();
  for (const r of larik(rows)) { if (!r.judul || !TESIS_YA.test(r.judul) || TESIS_TIDAK.test(r.judul)) continue; const k = cari(pk, r.kampus); if (!k) continue;
    const judul = String(r.judul).replace(/\s+/g, " ").trim(), kunci = k + "|" + norm(judul) + "|" + norm(r.penulis || "") + "|" + (r.tahun || ""); if (lihat.has(kunci)) continue; lihat.add(kunci);   /* repositori bisa mengulang satu karya puluhan kali */
    (out[k] ||= []).push({judul, penulis: r.penulis || null, tahun: r.tahun || null, jenjang: r.jenjang || null, rumpun: r.rumpun || [], url: r.url}); }
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
/* Sentinel Asia: aktivasi untuk Indonesia ditautkan ke kejadian besar bila tepat satu kejadian cocok jenisnya, berselang 0 sampai 14 hari,
   dan (bila provinsi aktivasi diketahui) provinsinya sama; keluarannya berbentuk sama dengan aktivasi_satelit supaya kejadianEkstra memakainya */
const JENIS_SA = [[/flood/i, ["banjir", "hidrometeorologi"]], [/volcan/i, ["gunung api"]], [/earthquake/i, ["gempa", "tsunami"]], [/tsunami/i, ["tsunami", "gempa"]], [/landslide/i, ["longsor"]], [/fire/i, ["karhutla"]], [/storm|cyclone/i, ["hidrometeorologi"]]];
export function sentinelAsia(sa, kejadian, lama) {
  const ada = new Set(larik(lama).map(a => a.id)), baru = [];
  for (const r of larik(sa)) { const id = "sa-" + r.id; if (ada.has(id) || !r.tanggal) continue; const j = JENIS_SA.filter(([re]) => re.test(r["jenis bencana"] || r.jenis || "")).flatMap(x => x[1]);
    const k = larik(kejadian).filter(k => j.includes(k.jenis) && k.tanggal && (!r.prov || [].concat(k.prov || []).map(String).includes(String(r.prov))) && (Date.parse(r.tanggal) - Date.parse(k.tanggal)) / 864e5 >= 0 && (Date.parse(r.tanggal) - Date.parse(k.tanggal)) / 864e5 <= 14);
    baru.push({id, kejadian: r.kejadian, kejadian_id: k.length === 1 ? k[0].id : null, tanggal: r.tanggal, jenis_bencana: r["jenis bencana"] || null, mekanisme: "Sentinel Asia", kode: r.glide || null, peminta: r.peminta || null,
      url: r.sumber_url, sumber_url: r.sumber_url, diperiksa: new Date().toISOString().slice(0, 10)}); }
  return baru;
}
/* proyek riset UKRI: hanya yang judulnya kebencanaan DAN menyebut Indonesia di judul atau bermitra organisasi Indonesia; masuk hibah_riset (pemberi luar negeri) */
const RISET_BENCANA = /disaster|flood|earthquake|tsunami|volcan|landslide|wildfire|peat ?fires?|\bhaze\b|hazard|humanitarian|drought|eruption|magma|bencana/i;
const TEMPAT_ID = /indonesia|\bjava\b|sumatra|sulawesi|kalimantan|borneo|lombok|\bbali\b|aceh|papua(?! new guinea)|jakarta|merapi|sinabung|padang|krakatau|sunda strait|mentawai|\bpalu\b/i;
export const hibahUkri = rows => { const lihat = new Set(); return larik(rows).filter(r => RISET_BENCANA.test(r.judul) && (TEMPAT_ID.test(r.judul) || r.kecocokan_indonesia === "organisasi") && !lihat.has(norm(r.judul)) && lihat.add(norm(r.judul)))
  .map(r => ({skema: `UKRI ${r.pemandu_dana || ""}`.trim(), pemberi: "UKRI (Inggris)", tahun: r.mulai ? Number(String(r.mulai).slice(0, 4)) : null, judul: r.judul, ketua: larik(r.peneliti)[0] || null, pakar_id: null,
    institusi: r.pemimpin_org || null, mitra: larik(r.mitra_indonesia), nilai: null, sumber_url: r.sumber_url})); };
/* proyek kebencanaan internasional (Bank Dunia, ADB, JICA, IATI) menjadi entri proyek di pendanaan; proyek yang sudah ada (id, nama, atau nilai
   dari pemberi yang sama) dilewati. IATI tidak membawa kurs USD, jadi nilainya disimpan dalam EUR dari IATI dan tidak ikut total USD. */
const PEMBERI_P = {"World Bank": ["Bank Dunia", "bank-dunia-indonesia"], "Asian Development Bank": ["ADB", "adb-indonesia-resident-mission"], "Japan International Cooperation Agency (JICA)": ["JICA", "jica-indonesia"]};
const RUMPUN_P = [["banjir", /flood|banjir/i], ["gempa", /earthquake|gempa|seism/i], ["tsunami", /tsunami/i], ["gunung api", /volcan|merapi|eruption/i], ["longsor", /landslide|longsor/i], ["karhutla", /fire|peat|haze/i], ["kekeringan", /drought|el ni/i]];
const PROYEK_YA = /\bdisaster|\bDRR\b|\bDRM\b|sinabung|palu|lombok operation|flood|earthquake|tsunami|volcan|landslide|\bfires?\b|\bhaze\b|drought|cyclone|hazard|humanitarian|relief|appeal|reconstruct|rekompak|preparedness|early warning|anticipatory|evacuat|bencana|banjir|gempa|merapi|seroja|sinabung/i;
const PROYEK_LUAR = /\bglobal\b|worldwide|regional|asean|asia[- ]pacific|aha centre/i;
/* provinsi dari nama tempat di judul bila sumber tidak mencatat lokasi (kebanyakan aktivitas IATI); hanya nama yang tidak ambigu */
const PROV_TEKS = [["11", /\baceh\b|meulaboh|\bpidie\b/i], ["13", /west sumatra|sumatera barat|\bpadang\b(?! bai)|mentawai|\bagam\b/i], ["72", /central sulawesi|sulawesi tengah|\bpalu\b|donggala|\bsigi\b/i], ["52", /lombok|\bntb\b|nusa tenggara barat|west nusa tenggara/i],
  ["53", /seroja|east nusa tenggara|nusa tenggara timur|\bntt\b|kupang|flores/i], ["34", /yogyakarta|merapi|bantul/i], ["36", /selat sunda|sunda strait|banten|pandeglang/i], ["76", /mamuju|majene|sulawesi barat|west sulawesi/i],
  ["32", /cianjur|west java|jawa barat/i], ["12", /sinabung|\bkaro\b|north sumatra|sumatera utara/i], ["35", /semeru|lumajang|east java|jawa timur/i], ["91", /manokwari|west papua|papua barat/i], ["33", /central java|jawa tengah|banjarnegara/i], ["94", /sentani|jayapura/i], ["31", /jakarta|ciliwung/i]];
export function proyekBaru(rows, pendanaan, w3 = []) {
  const nid = x => String(x || "").toLowerCase().replace(/^(iati|wb|adb|jica)-/, "").replace(/[^a-z0-9]+/g, "-"), ada = larik(pendanaan).filter(x => x.jenis_entri === "proyek");
  const id0 = [...ada.map(x => nid(x.id)), ...larik(w3).map(x => nid(x.id))], idSet = new Set(id0), nm = new Set([...ada.map(x => norm(x.pemberi) + "|" + norm(x.nama)), ...larik(w3).map(x => norm(x.donor) + "|" + norm(x.judul))]);
  const nl = ada.filter(x => x.nilai_usd).map(x => [x.pemberi, x.nilai_usd, x.tahun]), out = [];
  /* id anak IATI (induk-101, induk-0001) dianggap sama dengan induknya supaya nilainya tidak terhitung dua kali */
  const sudah = i => idSet.has(i) || id0.some(a => a.length >= 8 && (i.startsWith(a + "-") || a.startsWith(i + "-")));
  for (const r of larik(rows)) { const tema = larik(r.tema).join(" ");
    if (!(PROYEK_YA.test(r.judul) || (/bencana|disaster/i.test(tema) && /\b(response|recovery|emergency|rehabilit|resilien)/i.test(r.judul)))) continue;
    if (PROYEK_LUAR.test(r.judul) && !/indonesia/i.test(r.judul) && !larik(r.lokasi).length) continue;   /* proyek global atau regional, bukan proyek di Indonesia */
    const [pb, lb] = PEMBERI_P[r.pemberi] || [r.pemberi, null], pre = {"Bank Dunia": "wb-", ADB: "adb-", JICA: "jica-"}[pb] || "iati-", id = pre + nid(r.id);
    const judul = String(r.judul).replace(/\s*[（(][^)）]*[^\x00-\x7f][^)）]*[)）]/g, "").replace(/^indonesia:\s*/i, "").trim(), k = norm(pb) + "|" + norm(judul);
    const th = r.mulai ? Number(String(r.mulai).slice(0, 4)) : null;
    if (sudah(nid(r.id)) || larik(r.id_iati).some(i => sudah(nid(i))) || nm.has(k) || (r.nilai_usd && nl.some(([p, v, t]) => p === pb && v === r.nilai_usd && (!t || !th || Math.abs(t - th) <= 1)))) continue;
    idSet.add(nid(r.id)); id0.push(nid(r.id)); nm.add(k);
    /* provinsi: lokasi sumber, kecuali Jakarta yang di IATI sering berarti kantor pusat; ditambah nama tempat di judul */
    const pj = PROV_TEKS.filter(([, re]) => re.test(judul)).map(x => x[0]), lk = larik(r.lokasi).map(l => l.prov).filter(p => p && (p !== "31" || pj.includes("31")));
    const eur = r.nilai_usd ? null : r.nilai_eur ?? null;
    out.push({id, jenis_entri: "proyek", nama: judul, pemberi: pb, lembaga_id: lb, jenis: /loan|pinjaman/i.test(r.judul) ? "pinjaman" : /grant|hibah|trust fund/i.test(r.judul) ? "hibah" : null,
      sasaran: [], nilai: r.nilai_usd ?? eur, mata_uang: r.nilai_usd ? "USD" : eur ? "EUR" : null, nilai_usd: r.nilai_usd ?? null, tahun: th, selesai: r.selesai ? Number(String(r.selesai).slice(0, 4)) : null,
      status: r.status || null, penerima: larik(r.pelaksana).join(", ") || null, pelaksana: larik(r.pelaksana), prov: [...new Set([...lk, ...pj])], rumpun: RUMPUN_P.filter(([, re]) => re.test(judul)).map(x => x[0]),
      syarat: "", cara: "", tenggat: "", kontak: {email: [], telepon: []}, url: r.sumber_url, sumber: [{butir: "web", url: r.sumber_url, diperiksa: new Date().toISOString().slice(0, 10)}]}); }
  return out;
}
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
    "ikp", "rumah_ibadah", "kerentanan_bps", "osm_darurat", "tesis_kebencanaan",
    "indeks_desa", "spm_bencana", "dataset_satudata", "aktivasi_sentinel_asia", "mitra_riset_luar", "proyek_internasional", "pendanaan_pakar", "dokumen_prb", "topik_pakar", "rekan_pakar", "glide_cocok", "emdat_idn", "garuda_penulis", "dataset_terbuka", "podes_kesiapan", "penduduk_rentan", "donasi_berita", "donasi_lembaga"].map(f => [f, baca(dp, f)]));
  P.geo_provinsi = JSON.parse(readFileSync(new URL("../../public/geo/provinsi.json", import.meta.url), "utf8"));
  const R = Object.fromEntries(["lembaga", "induk", "kejadian", "hibah_riset", "pendanaan", "kampus", "lembaga_3w"].map(f => [f, baca(dr, f)]));
  mkdirSync(out, {recursive: true});
  const tulis = (f, d) => { writeFileSync(join(out, f + ".json"), JSON.stringify(d)); return f; };
  const lbLama = larik(R.lembaga), lbBaru = lembagaBaru(P, lbLama), lbSemua = [...lbLama, ...lbBaru];
  tulis("lembaga", Array.isArray(R.lembaga) ? lbSemua : {...R.lembaga, lembaga: lbSemua});
  const hb = hibahBaru(larik(R.hibah_riset), [...larik(P.hibah_riset_baru), ...hibahUkri(P.mitra_riset_luar)]); tulis("hibah_riset", Array.isArray(R.hibah_riset) || !R.hibah_riset ? [...larik(R.hibah_riset), ...hb] : {...R.hibah_riset, [Object.keys(R.hibah_riset).find(k => Array.isArray(R.hibah_riset[k]))]: [...larik(R.hibah_riset), ...hb]});
  /* entri radar- milik penyambung: disegarkan dari radar_dana (status "ditutup" dari tugas mingguan dipertahankan) */
  const rsSemua = radarSkema(P.radar_dana, new Set()), rsPeta = new Map(rsSemua.map(x => [x.id, x]));
  if (P.proyek_internasional) { const pb = proyekBaru(P.proyek_internasional, R.pendanaan, R.lembaga_3w); if (pb.length) R.pendanaan = Array.isArray(R.pendanaan) ? [...R.pendanaan, ...pb] : {...R.pendanaan, pendanaan: [...larik(R.pendanaan), ...pb]}; console.log("proyek_baru", pb.length); }
  const pd = larik(R.pendanaan).map(x => rsPeta.has(x.id) ? {...rsPeta.get(x.id), status: x.status === "ditutup" ? "ditutup" : rsPeta.get(x.id).status} : x), rs = rsSemua.filter(x => !larik(R.pendanaan).some(y => y.id === x.id)); tulis("pendanaan", Array.isArray(R.pendanaan) ? [...pd, ...rs] : {...R.pendanaan, pendanaan: [...pd, ...rs]});
  /* hasil panen ulang bulanan disimpan kembali ke <keluar>/panen supaya bulan depan menjadi dasar */
  mkdirSync(join(out, "panen"), {recursive: true}); const simpanPanen = (f, d) => writeFileSync(join(out, "panen", f + ".json"), JSON.stringify(d));
  if (P.daftar_hitam_mentah) { P.daftar_hitam_cocok = daftarHitamCocok(P.daftar_hitam_mentah, lbSemua); simpanPanen("daftar_hitam_cocok", P.daftar_hitam_cocok); }
  const sb = P.cems_idn ? satelitCems(P.cems_idn, R.kejadian?.kejadian || R.kejadian, P.aktivasi_satelit) : [];
  if (sb.length) { P.aktivasi_satelit = [...larik(P.aktivasi_satelit), ...sb]; simpanPanen("aktivasi_satelit", P.aktivasi_satelit); }
  const sa = P.aktivasi_sentinel_asia ? sentinelAsia(P.aktivasi_sentinel_asia, R.kejadian?.kejadian || R.kejadian, P.aktivasi_satelit) : [];
  if (sa.length) { P.aktivasi_satelit = [...larik(P.aktivasi_satelit), ...sa]; simpanPanen("aktivasi_satelit", P.aktivasi_satelit); }
  const wd = wilayahDaya(P), le = lembagaEkstra(P, lbSemua, R.kampus, R.induk), pe = pakarEkstra(P, R.induk), ke = kejadianEkstra(P, R.kejadian?.kejadian || R.kejadian);
  for (const [id, t] of Object.entries(timPakar(R.kejadian?.kejadian || R.kejadian, R.induk, R.kampus || {}, P))) (ke[id] ||= {}).tim = t;
  wd.kesiapan = kesiapanDaerah(wd, JSON.parse(readFileSync(new URL("../../public/banjir/data/risiko_kecamatan.json", import.meta.url), "utf8")), R.induk, R.kampus, lbSemua);
  const hvc = JSON.parse(readFileSync(new URL("../../public/data/bnpb/risiko_hvc.json", import.meta.url), "utf8")).kab;
  wd.kesiapan.uji = ujiKesiapan(wd.kesiapan.baris, JSON.parse(readFileSync(new URL("../../public/data/bnpb/dibi_kab_tahun.json", import.meta.url), "utf8")), Object.fromEntries(Object.entries(hvc).map(([k, v]) => [k, v.nama])));
  tulis("wilayah_daya", wd);
  const ts = P.tesis_kebencanaan ? tesisKampus(P.tesis_kebencanaan, R.kampus) : {}; if (Object.keys(ts).length) tulis("tesis", ts);   /* hasil kosong tidak ditulis, jadi tidak menimpa R2 */ tulis("lembaga_ekstra", le); tulis("pakar_ekstra", pe); tulis("kejadian_ekstra", ke);
  /* donasi kosong tidak ditulis, jadi tidak menimpa R2 */
  const dibiK = JSON.parse(readFileSync(new URL("../../public/data/bnpb/dibi_kab_tahun.json", import.meta.url), "utf8"));
  const dn = donasiBencana([...larik(P.donasi_berita), ...larik(P.donasi_lembaga)], lbSemua, R.kejadian?.kejadian || R.kejadian); if (dn.aksi.length) tulis("donasi_bencana", {diperbarui: new Date().toISOString().slice(0, 10), ...dn, prov: ringkasBantuanProv(dn.aksi, dibiK), prov_dari: 2019});
  console.log(JSON.stringify({lembaga_baru: lbBaru.length, hibah_baru: hb.length, skema_radar: rs.length, wilayah_kab: wd.kab.length, wilayah_prov: Object.keys(wd.prov).length,
    lembaga_ekstra: Object.keys(le.lembaga).length, kampus_ekstra: Object.keys(le.kampus).length, daftar_hitam: Object.values(le.lembaga).filter(x => x.daftar_hitam).length,
    pakar_paten: Object.values(pe).filter(x => x.paten).length, pakar_orcid: Object.values(pe).filter(x => x.orcid).length,
    kejadian_ekstra: Object.keys(ke).length, satelit_baru: sb.length}, null, 1));
}
