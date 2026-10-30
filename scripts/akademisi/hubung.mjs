#!/usr/bin/env node
/* Penghubung entitas Direktori Jaringan Kebencanaan (permintaan pemilik 30 Okt 2026: "semua data terhubung bila ada koneksinya";
   contoh: pakar beranggota IABI muncul di profil IABI, orang yang bekerja di ITB muncul di profil ITB).

   node scripts/akademisi/hubung.mjs <folder data> <folder keluaran>

   Masukan (di luar repo, karena repo publik): lembaga.json, kampus.json, induk.json (pakar), afiliasi.json, tokoh.json, inovasi.json,
   sistem_data.json, pendanaan.json, lembaga_3w.json, jurnal.json, buku.json, redaksi.json, peneliti_muda.json, hibah_riset.json,
   penghargaan.json, csr.json, donatur_kejadian.json, kalaksa.json, sensor.json, aset_riset.json, dokumen.json, berita.json, pakar_ekstra.json (paten).
   Berkas yang tidak ada dilewati. Keluaran: graf.json {simpul, sisi} dan salinan berkas dengan *_id terisi (lembaga_id, pembuat[].lembaga_id, ...).

   Pencocokan nama sengaja ketat: nama lengkap ternormalkan, singkatan unik (minimal 3 huruf), atau alias tertulis. Nama yang cocok ke dua
   entitas atau lebih tidak ditautkan (lebih baik tidak terhubung daripada salah terhubung). */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const BUANG = /\b(pt|tbk|persero|cv|the|of|dan|and|yayasan|perkumpulan|lembaga|badan|indonesia|republik|ri)\b/g;
export const norm = s => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\(.*?\)/g, " ")
  .replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const inti = s => norm(s).replace(BUANG, " ").replace(/\s+/g, " ").trim();
const singkat = s => { const m = String(s ?? "").match(/\(([A-Z][A-Za-z0-9\-]{2,})\)/); return m ? m[1].toLowerCase() : null; };

/* alias kampus/lembaga berbahasa Inggris yang lazim di OpenAlex, ORCID, dan IATI */
export const ALIAS = {"world bank": "Bank Dunia Indonesia", "the world bank": "Bank Dunia Indonesia", "international bank for reconstruction and development": "Bank Dunia Indonesia", "asian development bank": "ADB Indonesia Resident Mission", "japan international cooperation agency": "JICA Indonesia", "ministry of foreign affairs in japan": "JICA Indonesia", "united nations development programme": "UNDP Indonesia", "world health organization": "WHO Indonesia", "united nations population fund": "UNFPA Indonesia", "united nations children s fund": "UNICEF Indonesia", "korea international cooperation agency": "KOICA Indonesia", "uk foreign commonwealth development office": "Kedutaan Besar Inggris di Indonesia", "australia aid": "Kedutaan Besar Australia dan DFAT", "department of foreign affairs and trade": "Kedutaan Besar Australia dan DFAT", "federal ministry for economic cooperation and development": "GIZ Indonesia", "deutsche gesellschaft fur internationale zusammenarbeit": "GIZ Indonesia", "ministry of public works and housing": "Kementerian Pekerjaan Umum dan Perumahan Rakyat", "national development planning agency": "Kementerian PPN/Bappenas", "fiscal policy agency ministry of finance": "Badan Kebijakan Fiskal, Kementerian Keuangan", "ministry of finance": "Kementerian Keuangan", "coordinating ministry of economic affairs": "Kementerian Koordinator Bidang Perekonomian", "pt pln persero": "PT PLN (Persero)", "bandung institute of technology": "Institut Teknologi Bandung", "institute of technology bandung": "Institut Teknologi Bandung",
  "gadjah mada university": "Universitas Gadjah Mada", "university of indonesia": "Universitas Indonesia", "bogor agricultural university": "Institut Pertanian Bogor",
  "ipb university": "Institut Pertanian Bogor", "sepuluh nopember institute of technology": "Institut Teknologi Sepuluh Nopember", "national research and innovation agency": "Badan Riset dan Inovasi Nasional",
  "brin": "Badan Riset dan Inovasi Nasional", "lipi": "Badan Riset dan Inovasi Nasional", "bppt": "Badan Riset dan Inovasi Nasional", "lapan": "Badan Riset dan Inovasi Nasional",
  "syiah kuala university": "Universitas Syiah Kuala", "hasanuddin university": "Universitas Hasanuddin", "diponegoro university": "Universitas Diponegoro", "andalas university": "Universitas Andalas",
  "brawijaya university": "Universitas Brawijaya", "airlangga university": "Universitas Airlangga", "padjadjaran university": "Universitas Padjadjaran", "the institution of engineers indonesia": "Persatuan Insinyur Indonesia",
  "world bank": "Bank Dunia", "institute of electrical and electronics engineers": "IEEE", "ieee": "IEEE",
  "persatuan insinyur indonesia pii": "Persatuan Insinyur Indonesia", "badan meteorologi klimatologi dan geofisika": "Badan Meteorologi, Klimatologi, dan Geofisika", "the world bank": "Bank Dunia", "asian development bank": "ADB Indonesia Resident Mission", "adb": "ADB Indonesia Resident Mission", "united nations children s fund": "UNICEF"};

/* alias Inggris hasil panen ROR dan Wikidata (30 Okt 2026), nama resmi Indonesia di kanan */
Object.assign(ALIAS, {"university of brawijaya": "Universitas Brawijaya", "state university of padang": "Universitas Negeri Padang", "state university of malang": "Universitas Negeri Malang", "university of palangka raya": "Universitas Palangka Raya", "university of bengkulu": "Universitas Bengkulu", "muhammadiyah university of yogyakarta": "Universitas Muhammadiyah Yogyakarta", "sebelas maret university": "Universitas Sebelas Maret", "tadulako university": "Universitas Tadulako", "tanjungpura university": "Universitas Tanjungpura", "parahyangan catholic university": "Universitas Katolik Parahyangan", "sriwijaya university": "Universitas Sriwijaya", "riau university": "Universitas Riau", "lambung mangkurat university": "Universitas Lambung Mangkurat", "jambi university": "Universitas Jambi", "udayana university": "Universitas Udayana", "yogyakarta state university": "Universitas Negeri Yogyakarta", "university of mataram": "Universitas Mataram", "state polytechnic of malang": "Politeknik Negeri Malang", "state university of makassar": "Universitas Negeri Makassar", "ministry of energy and mineral resources": "Kementerian Energi dan Sumber Daya Mineral", "ganesha university of education": "Universitas Pendidikan Ganesha", "sam ratulangi university": "Universitas Sam Ratulangi", "islamic university of riau": "Universitas Islam Riau", "jenderal soedirman university": "Universitas Jenderal Soedirman", "lampung university": "Universitas Lampung", "state university of jakarta": "Universitas Negeri Jakarta", "sumatera institute of technology": "Institut Teknologi Sumatera", "syarif hidayatullah state islamic university jakarta": "Universitas Islam Negeri Syarif Hidayatullah Jakarta", "cenderawasih university": "Universitas Cenderawasih", "university of pattimura": "Universitas Pattimura", "sultan agung islamic university": "Universitas Islam Sultan Agung", "state university of medan": "Universitas Negeri Medan", "petra christian university": "Universitas Kristen Petra", "state university of semarang": "Universitas Negeri Semarang", "trisakti university": "Universitas Trisakti", "bandung islamic university": "Universitas Islam Bandung", "mulawarman university": "Universitas Mulawarman", "bakrie university": "Universitas Bakrie", "university of nusa cendana": "Universitas Nusa Cendana", "atma jaya university yogyakarta": "Universitas Atma Jaya Yogyakarta", "state university of gorontalo": "Universitas Negeri Gorontalo", "samudra university": "Universitas Samudra", "jakarta state polytechnic": "Politeknik Negeri Jakarta", "lhokseumawe state polytechnic": "Politeknik Negeri Lhokseumawe", "university of darunnajah": "Universitas Darunnajah", "west sulawesi university": "Universitas Sulawesi Barat", "sultan ageng tirtayasa university": "Universitas Sultan Ageng Tirtayasa", "payakumbuh state agricultural polytechnic": "Politeknik Pertanian Negeri Payakumbuh", "akprind university": "Universitas AKPRIND Indonesia", "university al azhar indonesia": "Universitas Al-Azhar Indonesia", "warmadewa university": "Universitas Warmadewa", "malikussaleh university": "Universitas Malikussaleh", "raden fatah state islamic university palembang": "Universitas Islam Negeri Raden Fatah Palembang", "jenderal achmad yani university": "Universitas Jenderal Achmad Yani", "ketapang state polytechnic": "Politeknik Negeri Ketapang", "university of nahdlatul ulama surabaya": "Universitas Nahdlatul Ulama Surabaya", "university of bangka belitung": "Universitas Bangka Belitung", "medan state polytechnic": "Politeknik Negeri Medan", "widyatama university": "Universitas Widyatama", "samarinda state agricultural polytechnic": "Politeknik Pertanian Negeri Samarinda", "muhammadiyah university of magelang": "Universitas Muhammadiyah Magelang", "university of muhammadiyah lamongan": "Universitas Muhammadiyah Lamongan", "alma ata university": "Universitas Alma Ata", "state institute of islamic studies langsa": "Institut Agama Islam Negeri Langsa", "university of pembangunan nasional veteran jawa timur": "Universitas Pembangunan Nasional Veteran Jawa Timur", "maranatha christian university": "Universitas Kristen Maranatha", "indonesian muslim university of makassar": "Universitas Muslim Indonesia", "pradita university": "Universitas Pradita", "state polytechnic of padang": "Politeknik Negeri Padang", "informatics and business institute darmajaya": "Institut Informatika Dan Bisnis Darmajaya", "kupang state polytechnic": "Politeknik Negeri Kupang", "university of jakarta international": "Universitas Jakarta Internasional", "indraprasta pgri university": "Universitas Indraprasta PGRI", "university of muhammadiyah mataram": "Universitas Muhammadiyah Mataram", "del institute of technology": "Institut Teknologi Del", "podomoro university": "Universitas Agung Podomoro", "batanghari university": "Universitas Batanghari", "university of nias": "Universitas Nias", "widya mandala catholic university": "Universitas Katolik Widya Mandala Surabaya", "surabaya shipbuilding state polytechnic": "Politeknik Perkapalan Negeri Surabaya", "william booth health science college": "STIKes William Booth Surabaya", "bali tourism polytechnic": "Politeknik Pariwisata Bali", "sambas state polytechnic": "Politeknik Negeri Sambas", "hamzanwadi university": "Universitas Hamzanwadi", "mercu buana university of yogyakarta": "Universitas Mercu Buana Yogyakarta", "narotama university": "Universitas Narotama", "td pardede institute of science and technology": "Institut Sains dan Teknologi TD Pardede", "health polytechnic of the ministry of health manado": "Poltekkes Kemenkes Manado", "catur sakti college of informatics and computer management": "STMIK Catur Sakti Kendari", "mataram state islamic university": "Universitas Islam Negeri Mataram", "tjut nyak dhien university": "Universitas Tjut Nyak Dhien", "madura state polytechnic": "Politeknik Negeri Madura", "peradaban university": "Universitas Peradaban", "raharja university": "Universitas Raharja", "muhammadiyah university of jambi": "Universitas Muhammadiyah Jambi"});

/* indeks nama -> entitas; kunci yang menunjuk >1 entitas ditandai ambigu */
export function indeks(entitas) {
  const peta = new Map(), tambah = (k, id) => { if (!k || k.length < 3) return; const s = peta.get(k) || new Set(); s.add(id); peta.set(k, s); };
  for (const e of entitas) {
    for (const n of [e.nama, e.badan_hukum, ...(e.alias || [])]) { tambah(norm(n), e.id); tambah(inti(n), e.id); }
    for (const s of [e.singkatan, singkat(e.nama)]) if (s && /^[A-Za-z0-9\-]{3,}$/.test(s)) tambah(s.toLowerCase(), e.id);
  }
  return peta;
}
export function cari(peta, nama, akar = new Set()) {
  if (!nama) return null;
  const a = ALIAS[norm(nama)], calon = [norm(a || nama), inti(a || nama), singkat(nama)].filter(Boolean);
  for (const k of calon) { const s = peta.get(k); if (!s) continue; if (s.size === 1) return [...s][0];
    const r = [...s].filter(id => akar.has(id)); if (r.length === 1) return r[0]; }   // "BMKG" cocok ke pusat dan ratusan stasiun: pilih akar (tanpa induk)
  /* nama panjang di dalam teks ("Pusat Studi Bencana, Universitas Gadjah Mada") -> entitas dengan nama terpanjang yang termuat utuh */
  const t = " " + norm(a || nama) + " "; let best = null, len = 0, ganda = false;
  for (const [k, s] of peta) if (k.length >= 12 && k.length >= len && t.includes(" " + k + " ") && s.size === 1) { const id = [...s][0];
    if (k.length > len) { best = id; len = k.length; ganda = false; } else if (best !== id) ganda = true; }
  return ganda ? null : best;
}

/* Partner strategis (permintaan pemilik 30 Okt 2026): skor transparan dari graf + data, bukan penilaian subjektif.
   Komponen per organisasi (lembaga L:, kampus K:, organisasi G:): orang (pakar/tokoh yang bekerja/anggota), dana (nilai USD proyek yang diberi),
   aset (sistem, inovasi, aset riset, jurnal), cabang, rekam jejak (potensi_bantuan, penghargaan), jangkauan (jumlah tetangga unik non-berita).
   Tiap komponen diubah ke persentil (0..1) di antara organisasi, lalu dijumlah berbobot. Bintang: 60 skor tertinggi + 3 teratas tiap kategori lembaga,
   asal skor ≥ 0,35 dan minimal dua komponen bernilai. ponytail: bobot tetap di sini; ubah bila pemilik ingin menekankan komponen lain. */
export function strategis(g, D) {
  /* BNPB pemakai direktori, dan BPBD/BPBA di bawah koordinasinya: keduanya bukan mitra, tidak pernah diberi bintang */
  const DIRI = /^badan nasional penanggulangan bencana\b|\bbnpb\b|^badan penanggulangan bencana\b|\bbpbd\b|\bbpba\b/i;
  const org = Object.entries(g.simpul).filter(([id, s]) => (s.j === "lembaga" || s.j === "kampus" || s.j === "organisasi") && !DIRI.test(String(s.n || s.nama || "").trim())).map(([id]) => id);
  const m = Object.fromEntries(org.map(id => [id, {orang: 0, dana: 0, aset: 0, cabang: 0, jejak: 0, jangkau: new Set(), proyek: 0}]));
  const usd = {}; for (const d of larik(D.pendanaan?.pendanaan || D.pendanaan)) usd["D:" + d.id] = Number(d.nilai_usd) || 0;
  for (const p of larik(D.lembaga_3w)) usd["J:" + p.id] = Number(p.nilai_usd) || 0;
  for (const [a, b, r] of g.sisi) {
    if (r !== "muncul bersama di berita") { if (m[a]) m[a].jangkau.add(b); if (m[b]) m[b].jangkau.add(a); }
    if (m[b] && /^(P|T):/.test(a) && /bekerja di|anggota|pengurus|ketua|penasihat|tim ahli|berperan di|kepala pelaksana|lainnya/.test(r)) m[b].orang++;
    if (m[a] && (r === "mendanai" || r === "memberi")) { m[a].dana += usd[b] || 0; m[a].proyek++; }
    if (m[a] && (r === "memiliki" || r === "membuat" || r === "menerbitkan")) m[a].aset++;
    if (m[b] && r === "cabang dari") m[b].cabang++;
    if (m[b] && r === "memberi penghargaan") m[b].jejak++;
  }
  for (const l of larik(D.lembaga)) { const x = m["L:" + l.id]; if (x) x.jejak += (l.potensi_bantuan || []).length + (l.mitra_bnpb ? 2 : 0); }
  const KOMP = {orang: 0.2, dana: 0.2, aset: 0.15, cabang: 0.15, jejak: 0.15, jangkau: 0.15};
  const nilai = (x, k) => k === "jangkau" ? x.jangkau.size : x[k];
  const pers = {}; for (const k of Object.keys(KOMP)) { const v = org.map(id => nilai(m[id], k)).filter(n => n > 0).sort((a, b) => a - b);
    pers[k] = n => n > 0 ? (v.filter(t => t <= n).length / v.length) : 0; }
  const fmt = n => n >= 1e9 ? "US$ " + (n / 1e9).toFixed(1).replace(".", ",") + " miliar" : n >= 1e6 ? "US$ " + Math.round(n / 1e6) + " juta" : "US$ " + Math.round(n).toLocaleString("id-ID");
  const hasil = {};
  for (const id of org) { const x = m[id]; let skor = 0, aktif = 0;
    for (const [k, w] of Object.entries(KOMP)) { const p = pers[k](nilai(x, k)); skor += w * p; if (p > 0) aktif++; }
    const alasan = [x.orang && `${x.orang.toLocaleString("id-ID")} pakar dan tokoh terhubung`, x.proyek && `Mendanai ${x.proyek} proyek${x.dana ? " senilai " + fmt(x.dana) : ""}`,
      x.aset && `Memiliki atau membuat ${x.aset} sistem, inovasi, aset riset, atau jurnal`, x.cabang && `Induk dari ${x.cabang} cabang`, x.jejak && `${x.jejak} rekam jejak bantuan, penghargaan, atau kemitraan`,
      x.jangkau.size >= 10 && `Terhubung dengan ${x.jangkau.size} simpul lain`].filter(Boolean);
    hasil[id] = {skor: Math.round(skor * 1000) / 1000, aktif, alasan}; }
  const urut = org.filter(id => hasil[id].aktif >= 2 && hasil[id].skor >= 0.35).sort((a, b) => hasil[b].skor - hasil[a].skor);
  const bintang = new Set(urut.slice(0, 60));
  const kat = {}; for (const l of larik(D.lembaga)) kat["L:" + l.id] = l.kategori; for (const id of org) if (id.startsWith("K:")) kat[id] = "kampus";
  const perKat = {}; for (const id of urut) { const k = kat[id] || "organisasi"; perKat[k] = (perKat[k] || 0) + 1; if (perKat[k] <= 3) bintang.add(id); }
  urut.forEach((id, i) => { hasil[id].peringkat = i + 1; });
  for (const id of bintang) { hasil[id].bintang = true; g.simpul[id].bintang = true; }
  return Object.fromEntries(Object.entries(hasil).filter(([, v]) => v.skor > 0));
}

const baca = (dir, f) => { const p = join(dir, f); if (!existsSync(p)) return null; const d = JSON.parse(readFileSync(p, "utf8")); return d; };
const larik = d => Array.isArray(d) ? d : d && typeof d === "object" ? (d.lembaga || d.orang || d.tokoh || d.koreksi || []) : [];

export function hubung(D) {
  const simpul = {}, sisi = [], kunci = new Set();
  const node = (id, j, n, logo) => { if (!simpul[id]) simpul[id] = logo ? {j, n, logo} : {j, n}; };
  const tepi = (a, b, r, s) => { if (!a || !b || a === b) return; const k = a + "|" + b + "|" + r; if (kunci.has(k)) return; kunci.add(k); sisi.push(s ? [a, b, r, s] : [a, b, r]); };

  /* entitas organisasi: lembaga + kampus (kampus.json berkunci nama) */
  const kampusNorm0 = new Map(Object.keys(D.kampus || {}).map(n => [norm(n), "K:" + n]));
  const org = larik(D.lembaga).filter(l => !kampusNorm0.has(norm(l.nama))).map(l => ({id: "L:" + l.id, nama: l.nama, singkatan: l.singkatan, alias: l.alias, badan_hukum: l.badan_hukum, logo: l.logo}));
  for (const [nama, k] of Object.entries(D.kampus || {})) org.push({id: "K:" + nama, nama, alias: k?.alias});
  org.forEach(o => node(o.id, o.id[0] === "K" ? "kampus" : "lembaga", o.nama, o.logo));
  const akar = new Set(larik(D.lembaga).filter(l => !l.induk).map(l => "L:" + l.id));
  const peta = indeks(org), lid = id => id && id.startsWith("L:") ? id.slice(2) : null;
  const ke = n => cari(peta, n, akar);
  /* organisasi yang belum ada di direktori dibuatkan simpul sendiri (G:) supaya anggotanya tetap terkumpul dan terhubung */
  const keAtauBaru = n => { const t = ke(n); if (t || !n || norm(n).length < 3) return t; const a = ALIAS[norm(n)], id = "G:" + inti(a || n);
    node(id, "organisasi", a || String(n).trim()); return id; };

  for (const l of larik(D.lembaga)) { if (l.induk) tepi("L:" + l.id, "L:" + l.induk, "cabang dari");
    for (const j of l.jaringan || []) tepi("L:" + l.id, j.ke_id ? "L:" + j.ke_id : ke(j.ke_nama), j.relasi, j.sumber_url); }
  for (const o of larik(D.induk)) { const p = "P:" + o[0]; node(p, "pakar", o[1]); tepi(p, D.kampus?.[o[2]] ? "K:" + o[2] : ke(o[2]), "bekerja di"); }
  const kampusPakar = new Map(larik(D.induk).map(o => [o[0], D.kampus?.[o[2]] ? "K:" + o[2] : ke(o[2])]));
  /* afiliasi yang ternyata kampus utama pakar itu sendiri (mis. "Gadjah Mada University" = UGM) dibuang dari data, bukan ditampilkan dobel */
  for (const [pid, a] of Object.entries(D.afiliasi || {})) D.afiliasi[pid] = a.filter(x => { const t = ke(x.nama_lembaga); return !(t && t === kampusPakar.get(pid)); });
  for (const [pid, a] of Object.entries(D.afiliasi || {})) for (const x of a) { const t = keAtauBaru(x.nama_lembaga); if (t) { x.lembaga_id = lid(t); tepi("P:" + pid, t, x.peran || "anggota", x.sumber_url); } }
  /* tokoh yang juga pakar (nama tanpa gelar sama persis dan unik) = satu orang: pakar_id diisi, sisi "orang yang sama" */
  const gelar = n => norm(String(n).replace(/\b(prof|dr|ir|drs|dra|st|mt|msc|m sc|phd|ph d|sp|mm|ma|m si|msi|s si|ssi|h|hj)\b\.?/gi, " "));
  const pakarNama = new Map(); for (const o of larik(D.induk)) { const k = gelar(o[1]); pakarNama.set(k, pakarNama.has(k) ? null : o[0]); }
  /* minimal dua inisial; nama pakar berinisial ("D. H. Natawidjaja") cocok dengan nama lengkap tokoh ("Danny Hilman Natawidjaja") bila inisial + nama belakang sama dan unik */
  const inisial = n => { const a = String(n).split(" ").filter(Boolean); return a.length < 2 ? "" : a.slice(0, -1).map(w => w[0]).join(" ") + " " + a.at(-1); };
  const pakarInisial = new Map(); for (const o of larik(D.induk)) { const a = norm(o[1]).split(" ").filter(Boolean); if (a.length < 3 || !a.slice(0, -1).every(w => w.length === 1)) continue; const k = a.join(" "); pakarInisial.set(k, pakarInisial.has(k) ? null : o[0]); }
  for (const t of larik(D.tokoh)) { const pid = t.pakar_id || pakarNama.get(gelar(t.nama)) || pakarInisial.get(inisial(gelar(t.nama))); if (pid) { t.pakar_id = pid; tepi("T:" + t.id, "P:" + pid, "orang yang sama"); } }
  for (const t of larik(D.tokoh)) { const id = "T:" + t.id; node(id, "tokoh", t.nama, t.foto_url); const o = keAtauBaru(t.lembaga); if (o) { t.lembaga_id = lid(o); tepi(id, o, "berperan di"); } }
  /* pakar diaspora: satu simpul per orang (id OpenAlex bila ada), tersambung ke institusinya di luar negeri, mis. World Bank */
  for (const x of larik(D.diaspora)) { const id = x.openalex_id ? "P:" + x.openalex_id : "D:" + x.id; node(id, "pakar", x.nama, x.foto_url); const o = keAtauBaru(x.institusi); if (o) tepi(id, o, "bekerja di"); }
  for (const k of larik(D.kalaksa)) { const id = "T:kalaksa-" + k.bpbd_id; node(id, "tokoh", k.nama, k.foto_url); tepi(id, "L:" + k.bpbd_id, "kepala pelaksana", k.sumber_url); }
  for (const i of larik(D.inovasi)) { const id = "I:" + i.id; node(id, "inovasi", i.nama);
    for (const p of i.pembuat || []) { const o = p.lembaga_id ? "L:" + p.lembaga_id : keAtauBaru(p.nama); if (o) { p.lembaga_id = p.lembaga_id || lid(o); tepi(o, id, "membuat"); } } }
  for (const s of larik(D.sistem_data)) { const id = "S:" + s.id; node(id, "sistem", s.nama); const o = s.lembaga_id ? "L:" + s.lembaga_id : keAtauBaru(s.pemilik); if (o) { s.lembaga_id = s.lembaga_id || lid(o); tepi(o, id, "memiliki"); } }
  for (const d of larik(D.pendanaan?.pendanaan || D.pendanaan)) { const id = "D:" + d.id; node(id, "dana", d.nama);
    const o = d.lembaga_id ? "L:" + d.lembaga_id : keAtauBaru(d.pemberi); if (o) { d.lembaga_id = d.lembaga_id || lid(o); tepi(o, id, "memberi"); }
    for (const p of [].concat(d.pelaksana || [], d.penerima || [])) { const t = ke(p); if (t) tepi(id, t, "dilaksanakan oleh"); } }
  for (const p of larik(D.lembaga_3w)) { const id = "J:" + p.id; node(id, "proyek", p.judul); const o = keAtauBaru(p.donor); if (o) { p.donor_id = lid(o); tepi(o, id, "mendanai"); }
    for (const x of String(p.pelaksana || "").split(/;\s*/)) { const t = ke(x); if (t) tepi(id, t, "dilaksanakan oleh"); } }
  for (const j of larik(D.jurnal)) { const o = keAtauBaru(j.penerbit); if (o) { const id = "U:" + (j.issn?.[0] || norm(j.nama)); node(id, "jurnal", j.nama); tepi(o, id, "menerbitkan"); } }
  for (const r of larik(D.redaksi)) { const id = "U:" + (r.issn || norm(r.jurnal)); node(id, "jurnal", r.jurnal); if (r.pakar_id) tepi("P:" + r.pakar_id, id, r.peran || "dewan redaksi", r.sumber_url); }
  for (const b of larik(D.buku)) { const id = "B:" + b.id; node(id, "buku", b.judul);
    for (const a of b.penulis || []) { if (a.pakar_id) tepi("P:" + a.pakar_id, id, "menulis"); else if (a.tokoh_id) tepi("T:" + a.tokoh_id, id, "menulis"); else { const o = ke(a.nama); if (o) tepi(o, id, "menulis"); } } }
  for (const m of larik(D.peneliti_muda)) if (m.pembimbing_pakar_id) { const id = "M:" + norm(m.nama + " " + m.judul).slice(0, 60); node(id, "peneliti muda", m.nama); tepi("P:" + m.pembimbing_pakar_id, id, "membimbing"); const o = ke(m.kampus); if (o) tepi(id, o, "studi di"); }
  for (const h of larik(D.hibah_riset)) { const o = ke(h.institusi); if (h.pakar_id) tepi(keAtauBaru(h.pemberi), "P:" + h.pakar_id, "mendanai riset", h.sumber_url); if (o && h.pakar_id) tepi("P:" + h.pakar_id, o, "bekerja di"); }
  /* paten (DJKI, 30 Okt 2026): pakar penemu dan kampus/lembaga pemegang; status permohonan tetap tertulis di simpulnya */
  for (const [pid, x] of Object.entries(D.pakar_ekstra || {})) for (const p of x.paten || []) { if (!p.nomor) continue; const id = "N:" + p.nomor; node(id, "paten", p.judul); tepi("P:" + pid, id, "menemukan", p.sumber_url);
    for (const h of String(p.pemegang || "").split(/,\s*/)) { const o = ke(h.replace(/^(lppm|lembaga penelitian dan pengabdian (kepada )?masyarakat)\s+/i, "")); if (o) tepi(o, id, "memegang paten", p.sumber_url); } }
  for (const g of larik(D.penghargaan)) { const t = g.entitas_id ? (g.jenis_penerima === "orang" ? "T:" + g.entitas_id : "L:" + g.entitas_id) : ke(g.penerima); if (t) tepi(keAtauBaru(g.pemberi), t, "memberi penghargaan", g.sumber_url); }
  for (const c of larik(D.csr)) { const o = c.lembaga_id ? "L:" + c.lembaga_id : keAtauBaru(c.perusahaan); if (o) { c.lembaga_id = c.lembaga_id || lid(o); for (const m of [].concat(c.mitra || [])) { const t = ke(m); if (t) tepi(o, t, "bermitra CSR", c.sumber_url); } } }
  for (const d of larik(D.donatur_kejadian)) { const o = d.lembaga_id ? "L:" + d.lembaga_id : keAtauBaru(d.donatur), t = ke(d.penerima); if (o) d.lembaga_id = d.lembaga_id || lid(o); if (o && t) tepi(o, t, "menyalurkan bantuan", d.sumber_url); }
  for (const a of larik(D.aset_riset)) { const o = keAtauBaru(a.pemilik); if (o) { const id = "A:" + a.id; node(id, "aset", a.nama); tepi(o, id, "memiliki"); } }
  for (const d of larik(D.dokumen)) if (d.lembaga_id) { const id = "O:" + d.id; node(id, "dokumen", d.judul); tepi("L:" + d.lembaga_id, id, "menerbitkan"); }
  for (const b of larik(D.berita)) for (const e of b.entitas || []) for (const f of b.entitas || []) if (e.id < f.id) {
    const pre = x => ({lembaga: "L:", tokoh: "T:", pakar: "P:", inovasi: "I:"}[x.jenis] || "") + x.id; tepi(pre(e), pre(f), "muncul bersama di berita", b.url); }
  /* lembaga yang sebenarnya kampus itu sendiri (nama tanpa kurung sama dengan nama kampus) dilebur ke simpul kampus */
  const kampusNorm = new Map(Object.keys(D.kampus || {}).map(n => [norm(n), "K:" + n]));
  const lebur = new Map(); for (const l of larik(D.lembaga)) { const k = kampusNorm.get(norm(l.nama)); if (k) lebur.set("L:" + l.id, k); }
  if (lebur.size) { for (const sx of sisi) { if (lebur.has(sx[0])) sx[0] = lebur.get(sx[0]); if (lebur.has(sx[1])) sx[1] = lebur.get(sx[1]); }
    for (const [l, k] of lebur) { if (simpul[l]?.logo && simpul[k] && !simpul[k].logo) simpul[k].logo = simpul[l].logo; delete simpul[l]; } }
  /* buang sisi ke simpul yang tidak ada (mis. pemberi penghargaan tidak dikenal) */
  const ok = sisi.filter(([a, b]) => simpul[a] && simpul[b]);
  return {simpul, sisi: ok};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [dir, keluar] = process.argv.slice(2);
  if (!dir || !keluar) { console.error("pakai: hubung.mjs <folder data> <folder keluaran>"); process.exit(2); }
  const F = ["lembaga", "kampus", "induk", "afiliasi", "tokoh", "kalaksa", "inovasi", "sistem_data", "pendanaan", "lembaga_3w", "jurnal", "redaksi", "buku", "peneliti_muda",
    "hibah_riset", "penghargaan", "csr", "donatur_kejadian", "aset_riset", "dokumen", "berita", "diaspora", "logo_org", "pakar_ekstra"];
  const D = Object.fromEntries(F.map(f => [f, baca(dir, f + ".json")]));
  const g = hubung(D);
  /* logo organisasi hasil panen Wikimedia (logo_org.json: simpul_id -> {logo}); hanya mengisi simpul yang belum berlogo */
  for (const [k, v] of Object.entries(D.logo_org || {})) if (g.simpul[k] && !g.simpul[k].logo && /^https:\/\/commons\.wikimedia\.org\//.test(v?.logo || "")) g.simpul[k].logo = v.logo;
  mkdirSync(keluar, {recursive: true});
  const st = strategis(g, D);
  writeFileSync(join(keluar, "strategis.json"), JSON.stringify(st));
  writeFileSync(join(keluar, "graf.json"), JSON.stringify(g));
  for (const f of ["afiliasi", "tokoh", "inovasi", "sistem_data", "pendanaan", "lembaga_3w", "csr", "donatur_kejadian"]) if (D[f]) writeFileSync(join(keluar, f + ".json"), JSON.stringify(D[f]));
  const per = {}; for (const [, , r] of g.sisi) per[r] = (per[r] || 0) + 1;
  const jenis = {}; for (const s of Object.values(g.simpul)) jenis[s.j] = (jenis[s.j] || 0) + 1;
  console.log(JSON.stringify({simpul: Object.keys(g.simpul).length, sisi: g.sisi.length, per_jenis_simpul: jenis, per_relasi: per}, null, 1));
}
