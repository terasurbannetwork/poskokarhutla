#!/usr/bin/env node
/* Validasi, bersihkan, dan gabungkan hasil panen direktori lembaga (docs/bnpb/lembaga/PRD.md §4, tiket L00 + L20).
   Data lembaga TIDAK masuk repo: berkas masukan dan keluaran ada di luar repo, hasilnya diunggah ke R2 akademisi/lembaga.json.

   node scripts/akademisi/lembaga_gabung.mjs --keluar <hasil.json> <panen1.json> <panen2.json> ...

   Aturan inti: kontak (telepon, wa, email, alamat, pimpinan, izin) tanpa entri `sumber` ber-URL dibuang, bukan dipercaya.
   Lokasi yang kosong diisi dari kantor BPBD kab/provinsi yang sama (public/data/bpbd.json), ditandai lokasi_sumber "kota"/"provinsi". */
import {readFileSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

export const KATEGORI = new Set(["kerelawanan", "tanggap-ormas", "donasi", "pemerintah", "jejaring", "internasional", "mitra-internasional", "keagamaan", "dunia-usaha", "komunikasi", "profesi", "kesehatan", "riset", "penerbit", "inovasi", "lsm"]);
export const SKALA = new Set(["nasional", "provinsi", "kabkota", "internasional"]);
export const BIDANG = new Set(["tanggap darurat", "SAR", "logistik", "kesehatan", "psikososial", "air dan sanitasi", "hunian", "pangan", "pendidikan", "perlindungan", "rehab-rekon",
  "PRB dan kesiapsiagaan", "pendanaan", "komunikasi", "data dan pemetaan", "riset"]);
export const RUMPUN = new Set(["gempa", "tsunami", "gunung api", "banjir", "longsor", "karhutla", "kekeringan", "cuaca ekstrem", "pesisir", "iklim"]);
export const PROV = {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kepulauan Bangka Belitung",
  21: "Kepulauan Riau", 31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat",
  53: "Nusa Tenggara Timur", 61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara",
  72: "Sulawesi Tengah", 73: "Sulawesi Selatan", 74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua", 92: "Papua Barat",
  93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua Barat Daya"};
export const JKT_KOTA = {"jakarta pusat": [-6.1865, 106.8341], "jakarta selatan": [-6.2615, 106.8106], "jakarta timur": [-6.2250, 106.9004], "jakarta barat": [-6.1674, 106.7637], "jakarta utara": [-6.1384, 106.8636]};
const FIELD = ["id", "nama", "singkatan", "kategori", "sub", "skala", "induk", "prov", "kab", "alamat", "lat", "lon", "lokasi_sumber", "web", "email", "telepon", "pusdalops", "wa", "medsos",
  "pimpinan", "bidang", "rumpun", "izin", "mitra_bnpb", "alias", "negara", "sensor", "inovasi_produk", "logo", "catatan", "potensi_bantuan", "linkedin", "badan_hukum", "didirikan", "sdm", "kapasitas", "jaringan", "sumber", "diperiksa", "status_situs"];
const KONTAK = ["telepon", "wa", "email", "alamat", "pimpinan", "izin"];
/* URL aman untuk href: http(s) saja, tanpa kutip atau kurung sudut, disimpan dalam bentuk ter-encode */
export const urlAman = v => { const s = String(v ?? "").trim(); if (!s || /["'<>\s]/.test(s)) return null;
  try { const u = new URL(s); return u.protocol === "http:" || u.protocol === "https:" ? u.href : null; } catch { return null; } };
const URL_OK = { test: v => !!urlAman(v) }, EMAIL_OK = /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i;
const sapu = s => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const provDariNama = (() => { const m = new Map(Object.entries(PROV).map(([k, v]) => [sapu(v), k])); m.set("diy", "34"); m.set("yogyakarta", "34"); m.set("jakarta", "31"); m.set("bangka belitung", "19");
  return v => m.get(sapu(v).replace(/^provinsi /, "")) || null; })();

/* telepon -> E.164 Indonesia, atau nomor layanan pendek (112, 115, 1500xxx); selain itu null */
export function telp(x) {
  let s = String(x ?? "").replace(/\(0\)/g, "").replace(/[^\d+]/g, "");
  if (/^\d{3,7}$/.test(s) && !s.startsWith("0")) return s;
  if (s.startsWith("+")) s = s.slice(1); else if (s.startsWith("0")) s = "62" + s.slice(1);
  if (!s.startsWith("62")) return null;
  return /^62\d{6,13}$/.test(s) ? "+" + s : null;
}
const uniq = a => [...new Set(a)];
const larik = v => Array.isArray(v) ? v : v == null || v === "" ? [] : [v];

/* satu objek panen -> {ok, l (bersih), buang:[alasan butir yang dibuang]}; ok=false bila objeknya sendiri tidak sah */
export function bersihkan(x) {
  const buang = [];
  if (!x || typeof x !== "object" || !String(x.nama || "").trim()) return {ok: false, alasan: "tanpa nama"};
  if (!KATEGORI.has(x.kategori)) return {ok: false, alasan: `kategori "${x.kategori}"`};
  const l = Object.fromEntries(FIELD.filter(k => k in x).map(k => [k, x[k]]));
  l.nama = String(x.nama).trim().replace(/\s+/g, " ");
  l.id = String(x.id || sapu(l.nama).replace(/ /g, "-")).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  l.skala = SKALA.has(x.skala) ? x.skala : x.prov ? "provinsi" : "nasional";
  const p = x.prov == null || x.prov === "" ? null : String(x.prov).padStart(2, "0");
  l.prov = p && PROV[p] ? p : p ? provDariNama(x.prov) : null;
  if (p && !l.prov) buang.push(`prov "${x.prov}"`);
  l.sumber = larik(x.sumber).filter(s => s && URL_OK.test(String(s.url || "").trim())).map(s => ({butir: String(s.butir || ""), url: urlAman(s.url), diperiksa: s.diperiksa || x.diperiksa || null}));
  const adaSumber = b => l.sumber.some(s => s.butir === b) || (b === "wa" && l.sumber.some(s => s.butir === "telepon"));
  l.web = urlAman(x.web);
  l.email = uniq(larik(x.email).map(e => String(e).trim().toLowerCase()).filter(e => EMAIL_OK.test(e)));
  l.telepon = uniq(larik(x.telepon).map(telp).filter(Boolean));
  l.pusdalops = adaSumber("telepon") ? uniq(larik(x.pusdalops).map(telp).filter(Boolean)) : [];
  l.wa = uniq(larik(x.wa).map(telp).filter(t => t && t.startsWith("+628")));
  for (const b of KONTAK) {
    const kosong = b === "pimpinan" || b === "izin" ? !x[b] : b === "alamat" ? !String(x.alamat || "").trim() : !l[b].length;
    if (kosong) { if (b === "pimpinan" || b === "izin" || b === "alamat") l[b] = b === "alamat" ? null : x[b] || null; continue; }
    const sah = adaSumber(b) || (b === "pimpinan" && URL_OK.test(String(x.pimpinan?.sumber_url || ""))) || (b === "izin" && URL_OK.test(String(x.izin?.sumber_url || "")));
    if (!sah) { buang.push(`${b} tanpa sumber`); l[b] = b === "pimpinan" || b === "izin" || b === "alamat" ? null : []; }
    else if ((b === "pimpinan" || b === "izin") && l[b]?.sumber_url) l[b] = {...l[b], sumber_url: urlAman(l[b].sumber_url)};
  }
  l.bidang = uniq(larik(x.bidang).filter(b => BIDANG.has(b)));
  l.rumpun = uniq(larik(x.rumpun).filter(r => RUMPUN.has(r)));
  l.alias = uniq(larik(x.alias).map(String).filter(Boolean));
  if (!(Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.lat >= -12 && x.lat <= 7 && x.lon >= 94 && x.lon <= 142)) { l.lat = null; l.lon = null; l.lokasi_sumber = null; }
  return {ok: true, l, buang};
}

/* gabungkan dua catatan lembaga yang sama: larik di-union, nilai tunggal ambil yang terisi */
function satukan(a, b) {
  const c = {...a};
  for (const [k, v] of Object.entries(b)) { if (!FIELD.includes(k)) continue;
    if (Array.isArray(v)) c[k] = k === "sumber" ? [...new Map([...(a.sumber || []), ...v].map(s => [s.butir + "|" + s.url, s])).values()] : uniq([...(a[k] || []), ...v]);
    else if (c[k] == null || c[k] === "") c[k] = v;
  }
  return c;
}
const hostDari = u => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };

/* "Seberapa yakin kita" 0..1: porsi sumber laman resmi (45%), kelengkapan kontak/pimpinan/alamat/lokasi (35%), kesegaran periksa (20%).
   Resmi = host sumber sama dengan situs lembaga, atau domain pemerintah/kampus (.go.id, .ac.id, .mil.id); selain itu pihak ketiga. */
export function yakin(l, kini = new Date()) {
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
  const hw = l.web ? host(l.web) : "", src = (l.sumber || []).map(x => host(x.url)).filter(Boolean);
  const resmi = h => (hw && (h === hw || h.endsWith("." + hw) || hw.endsWith("." + h))) || /\.(go|ac|mil)\.id$/.test(h);
  const pr = src.length ? src.filter(resmi).length / src.length : 0;
  const isi = [l.telepon?.length || l.wa?.length || l.email?.length, l.pimpinan, l.alamat, l.lokasi_sumber === "alamat" || l.lokasi_sumber === "kota"];
  const lengkap = isi.filter(Boolean).length / isi.length;
  const hari = l.diperiksa ? (kini - new Date(l.diperiksa)) / 864e5 : 999, segar = hari <= 180 ? 1 : hari <= 365 ? 0.5 : 0;
  const skor = Math.round((0.45 * pr + 0.35 * lengkap + 0.2 * segar) * 100) / 100;
  const alasan = [src.length ? `${Math.round(pr * 100)} persen sumber berasal dari laman resmi lembaga atau pemerintah` : "belum ada sumber yang tercatat",
    `kelengkapan ${isi.filter(Boolean).length} dari 4 butir (kontak, pimpinan, alamat, lokasi)`, l.diperiksa ? `diperiksa ${l.diperiksa}` : "tanggal periksa tidak ada"];
  return {skor, label: skor >= 0.75 ? "tinggi" : skor >= 0.5 ? "sedang" : "rendah", alasan};
}

export function gabung(daftar, bpbd = [], kini = new Date()) {
  const per = new Map(), kunciNama = new Map(), laporan = {masuk: 0, ditolak: [], dibuang: 0};
  for (const x of daftar) {
    laporan.masuk++;
    const r = bersihkan(x);
    if (!r.ok) { laporan.ditolak.push(`${x?.id || x?.nama || "?"}: ${r.alasan}`); continue; }
    laporan.dibuang += r.buang.length;
    const l = r.l, kn = sapu(String(l.nama).replace(/\(.*?\)/g, " ")) + "|" + (l.prov || ""), kh = l.web ? hostDari(l.web) + "|" + sapu(l.nama) : null;
    const lama = per.get(l.id) ? l.id : kunciNama.get(kn) || (kh && kunciNama.get(kh));
    if (lama) per.set(lama, satukan(per.get(lama), l));
    else { let id = l.id, i = 2; while (per.has(id)) id = `${l.id}-${i++}`; l.id = id; per.set(id, l); kunciNama.set(kn, id); if (kh) kunciNama.set(kh, id); }
  }
  /* lokasi kosong -> kantor BPBD kab (kota) lalu BPBD provinsi; nasional/internasional tanpa prov dibiarkan */
  const kab = new Map(), prov = new Map();
  for (const b of bpbd) { if (!Number.isFinite(b.lat)) continue;
    if (/PROVINSI/i.test(b.nama)) prov.set(b.prov, [b.lat, b.lon]); else kab.set(b.prov + "|" + sapu(b.kab).replace(/^(kabupaten|kota) /, ""), [b.lat, b.lon]); }
  { const jum = new Map(); for (const b of bpbd) if (Number.isFinite(b.lat) && !prov.has(b.prov)) { const j = jum.get(b.prov) || [0, 0, 0]; jum.set(b.prov, [j[0] + b.lat, j[1] + b.lon, j[2] + 1]); }
    for (const [p, [a, o, n]] of jum) prov.set(p, [a / n, o / n]); }   // provinsi tanpa kantor BPBD provinsi di GIS: rata-rata kantor kab/kotanya
  /* bpbd.json tidak memuat DKI: titik tengah lima kota administrasi Jakarta (perkiraan pusat kota) */
  for (const [n, ll] of Object.entries(JKT_KOTA)) if (!kab.has("31|" + n)) kab.set("31|" + n, ll);
  if (!prov.has("31")) prov.set("31", JKT_KOTA["jakarta pusat"]);
  const kabNama = [...kab].map(([k, ll]) => [k.split("|")[1], k.split("|")[0], ll]).filter(([n]) => n.length > 4).sort((a, b) => b[0].length - a[0].length);
  for (const l of per.values()) {
    if (Number.isFinite(l.lat)) { l.lokasi_sumber ||= "alamat"; continue; }
    const k = l.kab && kab.get(l.prov + "|" + sapu(l.kab).replace(/^(kabupaten|kota|kab) /, "")), p = l.prov && prov.get(l.prov);
    if (k) [l.lat, l.lon, l.lokasi_sumber] = [...k, "kota"]; else if (p) [l.lat, l.lon, l.lokasi_sumber] = [...p, "provinsi"];
    else if (l.alamat) {   // kantor nasional tanpa prov: nama kab/kota terpanjang yang tertulis di alamatnya ("Jakarta" saja = DKI)
      const a = " " + sapu(l.alamat) + " ";
      /* alamat Jakarta: hanya cocokkan kab/kota DKI. Tanpa ini "Kuningan" (Setiabudi), "Medan Merdeka", "Jati Padang" terbaca Kab. Kuningan, Kota Medan, Kota Padang */
      const hit = kabNama.find(([n, p]) => (!/ jakarta /.test(a) || p === "31") && a.includes(" " + n + " "));
      if (hit) { [l.lat, l.lon] = hit[2]; l.prov ||= hit[1]; l.lokasi_sumber = "kota"; }
      else if (/ jakarta /.test(a) && prov.get("31")) { [l.lat, l.lon] = prov.get("31"); l.prov ||= "31"; l.lokasi_sumber = "provinsi"; }
    }
  }
  for (const l of per.values()) l.yakin = yakin(l, kini);
  const hasil = [...per.values()].sort((a, b) => a.kategori.localeCompare(b.kategori) || (a.prov || "").localeCompare(b.prov || "") || a.nama.localeCompare(b.nama, "id"));
  for (const l of hasil) if (l.induk && !per.has(l.induk)) l.induk = null;
  laporan.keluar = hasil.length;
  laporan.berkontak = hasil.filter(l => l.telepon.length || l.wa.length || l.email.length).length;
  laporan.per_kategori = Object.fromEntries([...KATEGORI].map(k => [k, hasil.filter(l => l.kategori === k).length]));
  laporan.prov_dengan_pemerintah_bertelepon = new Set(hasil.filter(l => l.kategori === "pemerintah" && l.prov && l.telepon.length).map(l => l.prov)).size;
  laporan.tanpa_lokasi = hasil.filter(l => !Number.isFinite(l.lat)).length;
  return {hasil, laporan};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), i = a.indexOf("--keluar");
  if (i < 0 || !a[i + 1]) { console.error("pakai: --keluar <hasil.json> <panen...json>"); process.exit(2); }
  const keluar = a[i + 1], masuk = a.filter((_, j) => j !== i && j !== i + 1);
  const daftar = masuk.flatMap(f => { const d = JSON.parse(readFileSync(f, "utf8")); return Array.isArray(d) ? d : d.lembaga || []; });
  const bpbd = JSON.parse(readFileSync(new URL("../../public/data/bpbd.json", import.meta.url), "utf8")).kantor || [];
  const {hasil, laporan} = gabung(daftar, bpbd);
  writeFileSync(keluar, JSON.stringify(hasil));
  console.log(JSON.stringify({...laporan, ditolak: laporan.ditolak.slice(0, 30), ditolak_n: laporan.ditolak.length}, null, 1));
}
