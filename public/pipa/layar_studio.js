/* SIPPA: layar Simulator keputusan /pipa/studio (PRD §9.5, §1.3 U10; DS §3.9, §3.10, §4.9). Kontrak router: pasang(akar, konteks) dan lepas().
   Mesin pemilik (studio_mesin.js, KarhutlaEngine) dipakai apa adanya; layar ini hanya memanggil, membandingkan, dan menampilkan. Logika murni di atas
   (diuji tanpa DOM), DOM dan jaringan di bawah. Monte Carlo berjalan di Web Worker studio_pekerja.js; tanpa Worker jatuh ke nanti() dengan pita.
   Butuh global public/inti: nanti, fmt (dimuat cangkang atau app.js). Skema 32 dimensi dan 36 parameter dari studio_skema.js. Tidak ada data di berkas ini:
   skenario tersimpan lewat /api/sippa/skenario. Setiap angka berpil keyakinan dan bersumber; manfaat bawaan 0 berpil asumsi kebijakan. */
import {KONST} from "./hitung.js";
import {SKEMA, NUMERIK, KELOMPOK} from "./studio_skema.js";
import {BATAS_ALAT} from "./batas.js";
import {memuat, galat, kosong, waktu} from "./keadaan.js";
import {angkaId, bolehSkenario} from "./layar_hitung.js";
import {bukaDialog, tutupDialog, kirimPost, jalurApi} from "./layar_kit.js";

export {KELOMPOK};
export const JUDUL = "Simulator keputusan";
export const PITA_HP = "Simulator dirancang untuk laptop. Di ponsel hanya tab Bandingkan semua dan Ringkasan yang tampil.";
export const PITA_LAMBAT = "Simulasi lambat di peramban ini: Monte Carlo berjalan di utas utama dan bisa menahan layar sebentar.";
export const TAB = [["bandingkan", "Bandingkan semua"], ["ringkasan", "Ringkasan"], ["hidraulika", "Hidraulika"], ["biaya", "Biaya & BOQ"], ["risiko", "Risiko & gerbang"], ["simulasi", "Simulasi & sensitivitas"], ["matriks", "Matriks 100 pilihan"], ["batas", "Batas alat"]];
export const TAB_HP = ["bandingkan", "ringkasan"];
const VERSI_STUDIO = "2";   // ?v= mesin dan pekerja: naikkan bila studio_mesin.js atau studio_pekerja.js berubah
const MAKS_BYTE = 32768, MAKS_PEMBANDING = 6, MAKS_TUKANG = 12;
const NAMA_PRESET = {S0: "Kit SIPPA relay", S0B: "Kit relay dan modul banjir", S1: "Portable", S2: "Semi-permanen", S3: "Backbone permanen"};
const JUDUL_PIL = {"estimasi-model": "Estimasi model", "asumsi-kebijakan": "Asumsi kebijakan", menunggu: "Menunggu", hipotesis: "Hipotesis"};
const VONIS = {"NO-GO": "nogo", "HOLD / VALIDASI": "hold", KONDISIONAL: "kondisional"};

/* ---------- format ---------- */
const tampil = n => typeof fmt === "function" ? fmt(n) : n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const nf3 = new Intl.NumberFormat("id-ID", {maximumFractionDigits: 3});
const angkaP = v => v == null || Number.isNaN(+v) ? "–" : Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? tampil(v) : nf3.format(v);
const desimal = x => String(x).replace(".", ",");
const lolos = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
/* teks konstanta mesin (bukan data pengguna) di dalam simpul teks HTML: cukup & dan <, tanda lebih dari tetap terbaca */
const lolosTeks = s => String(s ?? "").replace(/[&<]/g, c => c === "&" ? "&amp;" : "&lt;");
const ada = x => typeof x === "number" && Number.isFinite(x);
export function rp(v) {
  if (!ada(v)) return "–";
  const a = Math.abs(v), t = v < 0 ? "-" : "";
  if (a >= 1e12) return `${t}Rp${tampil(a / 1e12)} triliun`;
  if (a >= 1e9) return `${t}Rp${tampil(a / 1e9)} miliar`;
  if (a >= 1e6) return `${t}Rp${tampil(a / 1e6)} juta`;
  return `${t}Rp${tampil(Math.round(a))}`;
}
const pil = (kunci, teks = JUDUL_PIL[kunci]) => `<span class="sp-yakin ${kunci}">${lolos(teks)}</span>`;
export function kelasVonis(d) { const k = VONIS[d]; if (!k) throw new Error(`kelasVonis: keputusan "${d}" tidak dikenal; hanya NO-GO, HOLD / VALIDASI, KONDISIONAL`); return k; }
const pilVonis = d => `<span class="sp-vonis ${kelasVonis(d)}">${lolos(d)}</span>`;

/* ---------- mesin ---------- */
export const pesanMesinGagal = () => "Mesin Studio tidak termuat (berkas studio_mesin.js). Muat ulang halaman; bila berulang, hubungi pengelola.";
const mesin = () => { const M = globalThis.KarhutlaEngine; if (!M) throw new Error(pesanMesinGagal()); return M; };
export function nilaiHasil(state, konst = KONST) { const M = mesin(), h = M.assess(state); return M.gerbangSippa(h.s, h, konst); }
export function ringkasSkema() {
  const h = mesin().hitungSkema(SKEMA);
  return {dimensi: h.dimensi, pilihan: h.pilihan, parameter: NUMERIK.length, teks: `${h.dimensi} dimensi, ${h.pilihan} pilihan, ${NUMERIK.length} parameter numerik`};
}
const DEF_NUM = new Map(NUMERIK.map(n => [n.key, n])), DEF_DIM = new Map(SKEMA.map(d => [d.key, d]));
const KUNCI_KEUANGAN = NUMERIK.filter(n => n.group === "Anggaran & horizon").map(n => n.key);

/* ---------- keadaan ---------- */
export const MANFAAT_BAWAAN = {regu: {aktif: false, hari: 0, tarif: 3000000}, heli: {aktif: false, n: 0}, banjir: {aktif: false, jam: 0, tarif: 0},
  irigasi: {aktif: false, ha: 0, nilai: 0, syarat: [false, false, false]}};
const jepit = (v, a, b, awal) => { const n = Number(v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : awal; };
export function bersihkanManfaat(x) {
  const m = structuredClone(MANFAAT_BAWAAN);
  if (!x || typeof x !== "object" || Array.isArray(x)) return m;
  const sw = o => !!(o && o.aktif === true);
  if (x.regu) { m.regu = {aktif: sw(x.regu), hari: jepit(x.regu.hari, 0, 1e5, 0), tarif: jepit(x.regu.tarif, 2250000, 3750000, 3000000)}; }
  if (x.heli) { m.heli = {aktif: sw(x.heli), n: jepit(x.heli.n, 0, 1e4, 0)}; }
  if (x.banjir) { m.banjir = {aktif: sw(x.banjir), jam: jepit(x.banjir.jam, 0, 1e4, 0), tarif: jepit(x.banjir.tarif, 0, 1e8, 0)}; }
  if (x.irigasi) { const s = Array.isArray(x.irigasi.syarat) ? x.irigasi.syarat : []; m.irigasi = {aktif: sw(x.irigasi), ha: jepit(x.irigasi.ha, 0, 1e5, 0), nilai: jepit(x.irigasi.nilai, 0, 1e9, 0), syarat: [0, 1, 2].map(i => s[i] === true)}; }
  return m;
}
const POLA_ID = /^[A-Z0-9]{2,12}$/;
function bersihkanSippa(x) {
  const o = {n_lance: jepit(x.n_lance, 0, 24, 8), dalam_m: jepit(x.dalam_m, 0, 100, 0), koridor: jepit(x.koridor, 1, 100, 1)};
  o.pinjam = (Array.isArray(x.pinjam) ? x.pinjam : []).filter(i => typeof i === "string" && POLA_ID.test(i)).slice(0, 10);
  o.tambah = (Array.isArray(x.tambah) ? x.tambah : []).filter(e => e && typeof e === "object" && POLA_ID.test(String(e.id)) && Number(e.q) > 0 && Number(e.price) >= 0 && Number.isFinite(Number(e.q)) && Number.isFinite(Number(e.price)))
    .slice(0, 10).map(e => ({id: e.id, q: Math.min(1e6, Number(e.q)), price: Math.min(1e11, Number(e.price)), ...(typeof e.why === "string" ? {why: e.why.slice(0, 200)} : {}), ...(typeof e.name === "string" ? {name: e.name.slice(0, 80)} : {})}));
  return o;
}
/* keadaan dari sumber luar (impor, D1, tautan): hanya kunci mesin, bertipe dan berentang sah; selebihnya jatuh ke bawaan */
export function bersihkan(x) {
  const d = mesin().defaultState();
  if (!x || typeof x !== "object" || Array.isArray(x)) return d;
  const o = {...d};
  for (const k of Object.keys(d)) {
    if (!Object.prototype.hasOwnProperty.call(x, k)) continue;
    const v = x[k], num = DEF_NUM.get(k), dim = DEF_DIM.get(k);
    if (typeof d[k] === "number") { if (Number.isFinite(Number(v)) && v !== "" && v !== null) o[k] = num ? Math.min(num.max, Math.max(num.min, Number(v))) : Number(v); }
    else if (typeof d[k] === "boolean") { if (v === true || v === "true") o[k] = true; else if (v === false || v === "false") o[k] = false; }
    else if (typeof v === "string" && (dim ? dim.options.some(p => p.value === v) : v.length <= 40)) o[k] = v;
  }
  if (x.sippa && typeof x.sippa === "object" && !Array.isArray(x.sippa)) o.sippa = bersihkanSippa(x.sippa);
  if (x.manfaat && typeof x.manfaat === "object") o.manfaat = bersihkanManfaat(x.manfaat);
  return o;
}
/* aturan sebab-akibat pemilik (setValue di Karhutla_Decision_Dashboard): strategi mengisi pipa dan pompa, lokasi mengisi akses, sumur mengembalikan izin ke menunggu */
export function ubahNilai(s, k, v) {
  const M = mesin(), n = {...s};
  if (k === "hasBooster") v = v === true || v === "true"; else if (DEF_NUM.has(k)) v = Number(v);
  n[k] = v;
  if (k === "strategy") {
    delete n.sippa;   // blok kit SIPPA hanya untuk preset S0 dan S0B
    const p = M.BASES.find(z => z.id === v);
    if (p) {
      Object.assign(n, {networkLength: p.main, branchLength: p.branches, crew: p.crewBase});
      if (v === "portable") Object.assign(n, {pipe: "layflat", pump: "gas", pumpCount: 2, alignment: "surface"});
      if (v === "semi") Object.assign(n, {pipe: "hybrid", pump: "diesel", pumpCount: 1, alignment: "protected"});
      if (v === "backbone") Object.assign(n, {pipe: "hdpe", pump: "diesel", pumpCount: 2, alignment: "buried"});
    }
  }
  if (k === "site") { const p = {road: {access: "road", peatDepth: "mid", flood: "low"}, kanal: {access: "mixed", peatDepth: "deep", flood: "seasonal"}, dome: {access: "remote", peatDepth: "deep", flood: "seasonal"}, remote: {access: "remote", peatDepth: "deep", flood: "high"}}[v]; if (p) Object.assign(n, p); }
  if (k === "waterSource" && v === "well") n.waterRights = "pending";
  return n;
}
export function stateAwal(kode) {
  const M = mesin();
  if (kode === "S0" || kode === "S0B") return M.presetSippa(kode);
  const i = ["S1", "S2", "S3"].indexOf(kode);
  if (i < 0) throw new Error(`stateAwal: kode ${kode} tidak dikenal (S0, S0B, S1, S2, S3)`);
  return M.compare(M.defaultState())[i].s;
}

/* ---------- manfaat dan keuangan: bawaan 0, tiap sumber berpil asumsi kebijakan ---------- */
export function manfaatTahunan(m, hasil) {
  const M = mesin(), h = {...MANFAAT_BAWAAN, ...m};
  const heli = M.HELI.nilai == null ? null : (h.heli.aktif ? h.heli.n * M.HELI.nilai : 0);   // harga BNPB menunggu: tidak pernah dikarang
  return {
    dasar: M.N(hasil.s.annualAvoidedLoss),
    regu: h.regu.aktif ? h.regu.hari * h.regu.tarif : 0,
    heli,
    banjir: h.banjir.aktif && hasil.s.floodUse === "pump" ? h.banjir.jam * h.banjir.tarif : 0,
    irigasi: h.irigasi.aktif && h.irigasi.syarat.every(Boolean) ? h.irigasi.ha * h.irigasi.nilai : 0,
  };
}
/* rumus mesin pemilik (assess): (B - OPEX) x faktor anuitas - CAPEX; BCR = B x faktor / (CAPEX + OPEX x faktor) */
export function keuangan(fin, B) {
  if (B === null) return {npv: null, bcr: null};
  const penyebut = fin.capex + fin.opex * fin.annuityFactor;
  return {npv: (B - fin.opex) * fin.annuityFactor - fin.capex, bcr: penyebut ? B * fin.annuityFactor / penyebut : null};
}

/* ---------- kolom dan matriks Bandingkan semua ---------- */
export function susunKolom(state, tersimpan = [], konst = KONST) {
  const M = mesin(), keu = Object.fromEntries(KUNCI_KEUANGAN.filter(k => state[k] !== undefined).map(k => [k, state[k]]));
  const manfaat = state.manfaat || MANFAAT_BAWAAN;
  const dasar = state.sippa ? {...M.defaultState(), ...keu} : (({sippa, manfaat: _, ...r}) => r)(state);
  const kol = [];
  for (const k of ["S0", "S0B"]) { const st = {...M.presetSippa(k), ...keu}; kol.push({kode: k, nama: NAMA_PRESET[k], asal: "preset", hasil: M.gerbangSippa(st, M.assess(st), konst), manfaat}); }
  M.compare({...M.defaultState(), ...dasar}).forEach((h, i) => { const kode = ["S1", "S2", "S3"][i]; kol.push({kode, nama: NAMA_PRESET[kode], asal: "preset", hasil: M.gerbangSippa(h.s, h, konst), manfaat, ditutup: kode !== "S1"}); });
  tersimpan.slice(0, MAKS_PEMBANDING).forEach((t, i) => { const st = bersihkan(t.state); kol.push({kode: `U${i + 1}`, nama: t.nama, id: t.id, asal: "tersimpan", hasil: nilaiHasil(st, konst), manfaat: st.manfaat || MANFAAT_BAWAAN}); });
  return kol;
}

const SUMBER_MESIN = "mesin Karhutla Decision Studio v1.0 dan gerbang SIPPA";
const lihatMc = c => c.mc ? c.mc : null;
const hit = h => ({keras: h.hard.length, syarat: h.conditional.length, catatan: h.soft.length});
const jam = v => ada(v) ? `${tampil(v)} jam` : "–";
const nilaiNpv = (c, mt, tambah) => { const B = tambah(mt); return B === null ? null : keuangan(c.hasil.fin, B); };
const DEF_BARIS = [
  {k: "vonis", label: "Status keputusan", yakin: "estimasi-model", sumber: "gerbang mesin Studio dan gerbang SIPPA; satu hambatan keras sudah NO-GO", teks: c => c.hasil.decision, html: c => pilVonis(c.hasil.decision)},
  {k: "hambatan", label: "Hambatan keras, bersyarat, catatan", yakin: "estimasi-model", sumber: "daftar hambatan mesin Studio ditambah H-SERAP, H-DALAM, H-AIR, jaringan_permanen", teks: c => { const x = hit(c.hasil); return `${x.keras}/${x.syarat}/${x.catatan}`; },
    html: c => { const x = hit(c.hasil); return `<span class="sp-hit keras" title="Hambatan keras">${x.keras} keras</span><span class="sp-hit syarat" title="Hambatan bersyarat">${x.syarat} syarat</span><span class="sp-hit catatan" title="Catatan">${x.catatan} catatan</span>`; }},
  {k: "capex", label: "CAPEX dengan kontingensi", arah: "min", yakin: "estimasi-model", sumber: "BoQ mesin dikali pengali harga, ditambah kontingensi", ambil: c => c.hasil.fin.capex, fmt: rp},
  {k: "opex", label: "OPEX per tahun", arah: "min", yakin: "estimasi-model", sumber: "energi, upah, servis, patroli, telemetri, proteksi, logistik, latihan, udara", ambil: c => c.hasil.fin.opex, fmt: rp},
  {k: "tco", label: (k) => `TCO ${tampil(k[0].hasil.fin.horizon)} tahun nominal`, arah: "min", yakin: "estimasi-model", sumber: "CAPEX ditambah OPEX dikali periode, tanpa diskonto", ambil: c => c.hasil.fin.tco, fmt: rp},
  {k: "tco_diskon", label: (k) => `TCO terdiskonto ${tampil(k[0].hasil.fin.discountRate * 100)}%`, arah: "min", yakin: "estimasi-model", sumber: "CAPEX ditambah OPEX dikali faktor anuitas pada diskonto isian", ambil: c => c.hasil.fin.capex + c.hasil.fin.opex * c.hasil.fin.annuityFactor, fmt: rp},
  {k: "impas", label: "Manfaat impas per tahun", arah: "min", yakin: "estimasi-model", sumber: "OPEX ditambah CAPEX dibagi faktor anuitas", ambil: c => c.hasil.fin.breakevenAnnual, fmt: rp},
  {k: "npv0", label: (k, mt) => mt.every(m => m.dasar === 0) ? "NPV, manfaat 0" : "NPV, manfaat terverifikasi isian", arah: "maks", yakin: "estimasi-model", sumber: "manfaat bawaan 0; rumus mesin (B dikurangi OPEX) x faktor anuitas dikurangi CAPEX", ambil: (c, mt) => keuangan(c.hasil.fin, mt.dasar).npv, fmt: rp},
  {k: "bcr0", label: (k, mt) => mt.every(m => m.dasar === 0) ? "BCR, manfaat 0" : "BCR, manfaat terverifikasi isian", arah: "maks", yakin: "estimasi-model", sumber: "manfaat bawaan 0; BCR 0 berarti belum ada manfaat yang diisi", ambil: (c, mt) => keuangan(c.hasil.fin, mt.dasar).bcr, fmt: tampil},
  {k: "npv_regu", label: "NPV, regu konvensional terhindar", arah: "maks", yakin: "asumsi-kebijakan", sumber: "selisih regu-hari per tahun x Rp2,25 sampai 3,75 juta per regu-hari (KD §4.3), dari isian Manfaat", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu)?.npv, fmt: rp},
  {k: "bcr_regu", label: "BCR, regu konvensional terhindar", arah: "maks", yakin: "asumsi-kebijakan", sumber: "sama dengan baris NPV regu", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu)?.bcr, fmt: tampil},
  {k: "npv_heli", label: "NPV, heli-hari terhindar", yakin: "menunggu", sumber: "harga heli per jam menunggu angka BNPB (slot sippa.heli.biaya_jam); pembanding resmi > Rp200 juta per sorti satu jam (BNPB, September 2023), tidak dicampur ke TCO", menunggu: true,
    ambil: (c, mt) => nilaiNpv(c, mt, m => m.heli === null ? null : m.dasar + m.heli)?.npv, fmt: rp},
  {k: "bcr_heli", label: "BCR, heli-hari terhindar", yakin: "menunggu", sumber: "sama dengan baris NPV heli", menunggu: true, ambil: (c, mt) => nilaiNpv(c, mt, m => m.heli === null ? null : m.dasar + m.heli)?.bcr, fmt: tampil},
  {k: "npv_banjir", label: "NPV + banjir (keputusan 7)", arah: "maks", yakin: "asumsi-kebijakan", sumber: "jam pompa banjir per musim x tarif sewa pompa setara (slot sippa.banjir.sewa_jam, asumsi); hanya skenario berpompa banjir terpisah", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu + m.banjir)?.npv, fmt: rp},
  {k: "bcr_banjir", label: "BCR + banjir (keputusan 7)", arah: "maks", yakin: "asumsi-kebijakan", sumber: "sama dengan baris NPV banjir", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu + m.banjir)?.bcr, fmt: tampil},
  {k: "npv_irigasi", label: "NPV + banjir + irigasi (keputusan 8)", arah: "maks", yakin: "asumsi-kebijakan", sumber: "luas x nilai per ha (slot sippa.irigasi.nilai_ha, asumsi); nol bila tiga syarat keras irigasi (PRD §5.7) tidak dicentang", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu + m.banjir + m.irigasi)?.npv, fmt: rp},
  {k: "bcr_irigasi", label: "BCR + banjir + irigasi (keputusan 8)", arah: "maks", yakin: "asumsi-kebijakan", sumber: "sama dengan baris NPV irigasi", ambil: (c, mt) => nilaiNpv(c, mt, m => m.dasar + m.regu + m.banjir + m.irigasi)?.bcr, fmt: tampil},
  {k: "mc", label: "Monte Carlo TCO P10, P50, P90", arah: "min", yakin: "estimasi-model", sumber: "800 sampel berbenih dari hash keadaan; rentang asumsi, bukan distribusi biaya empiris", ambil: c => lihatMc(c)?.mid ?? null, fmt: rp,
    html: c => { const m = lihatMc(c); return m ? `<span class="sp-mc">P10 ${rp(m.low)}</span><span class="sp-mc">P50 ${rp(m.mid)}</span><span class="sp-mc">P90 ${rp(m.high)}</span>` : null; }},
  {k: "tekanan", label: "Tekanan pompa", arah: "min", yakin: "estimasi-model", sumber: "Hazen-Williams mesin Studio, C 135 untuk HDPE dan 120 untuk layflat", ambil: c => c.hasil.hyd.pressBar, fmt: v => `${tampil(v)} bar`},
  {k: "daya", label: "Daya poros", arah: "min", yakin: "estimasi-model", sumber: "P = rho g Q TDH / efisiensi pompa isian", ambil: c => c.hasil.hyd.shaftKw, fmt: v => `${tampil(v)} kW`},
  {k: "jam_gelar", label: "Jam gelar", arah: "min", yakin: "estimasi-model", sumber: "panjang trase dibagi laju pasang regu, ditambah jalur cabang", ambil: c => c.hasil.hyd.installHours, fmt: jam},
  {k: "waktu_siap", label: "Waktu siap sesudah kejadian", arah: "min", yakin: "estimasi-model", sumber: "jam gelar kejadian ditambah jam kirim sesuai akses dan logistik", ambil: c => c.hasil.hyd.readyHours, fmt: jam},
  {k: "risiko", label: "Risiko screening", arah: "min", yakin: "estimasi-model", sumber: "20 per hambatan keras, 6 per bersyarat, 2 per catatan, ditambah akses terpencil dan pengamanan; skala 0 sampai 100", ambil: c => c.hasil.riskRisk, fmt: v => `${tampil(v)} dari 100`},
  {k: "kesiapan", label: "Kesiapan (ketersediaan ilustratif)", arah: "maks", yakin: "asumsi-kebijakan", sumber: "dasar 97% dikurangi pemeliharaan, cadangan pompa, akses, banjir; ilustratif, bukan estimasi statistik teruji", ambil: c => c.hasil.reliab * 100, fmt: v => `${tampil(v)}%`},
  {k: "co2", label: "CO2 BBM per tahun", arah: "min", yakin: "estimasi-model", sumber: "pembakaran BBM saja, 2,68 kg per liter solar dan 2,31 kg per liter bensin; tanpa gambut dan siklus hidup", ambil: c => c.hasil.fin.operationalEmissionsKg / 1000, fmt: v => `${tampil(v)} ton CO2`},
  {k: "biaya_ha_studio", label: "Biaya per ha padam terverifikasi (versi Studio: OPEX saja)", arah: "min", yakin: "estimasi-model", sumber: "OPEX dibagi luas padam terverifikasi per tahun dari isian; kosong bila luas belum diisi", ambil: c => c.hasil.fin.costVerifiedHa, fmt: rp},
  {k: "biaya_ha_kd", label: "Biaya per ha padam terverifikasi (versi KD: CAPEX teramortisasi ikut, G09)", arah: "min", yakin: "estimasi-model", sumber: "CAPEX dibagi faktor anuitas ditambah OPEX, dibagi luas padam terverifikasi per tahun", ambil: c => c.hasil.s.verifiedHaAnnual > 0 ? (c.hasil.fin.capex / c.hasil.fin.annuityFactor + c.hasil.fin.opex) / c.hasil.s.verifiedHaAnnual : null, fmt: rp},
];
export function barisMatriks(kolom) {
  const mt = kolom.map(c => manfaatTahunan(c.manfaat || MANFAAT_BAWAAN, c.hasil)), layak = kolom.map(c => c.hasil.decision !== "NO-GO");
  return DEF_BARIS.map(d => {
    const label = typeof d.label === "function" ? d.label(kolom, mt) : d.label;
    const nilai = d.ambil ? kolom.map((c, i) => { const v = d.ambil(c, mt[i]); return ada(v) ? v : null; }) : kolom.map(() => null);
    let terbaik = null;
    if (d.arah && layak.filter(Boolean).length >= 2) {
      const v = nilai.filter((x, i) => layak[i] && x !== null);
      if (v.length >= 2 && Math.min(...v) !== Math.max(...v)) terbaik = d.arah === "min" ? Math.min(...v) : Math.max(...v);
    }
    const sel = kolom.map((c, i) => {
      const x = nilai[i], html = d.html ? d.html(c) : null;
      const teks = d.teks ? d.teks(c) : x === null ? "–" : d.fmt(x);
      return {teks, html, nilai: x, terbaik: terbaik !== null && layak[i] && x === terbaik, menunggu: !!d.menunggu && x === null};
    });
    return {k: d.k, label, yakin: d.yakin, sumber: d.sumber, sel};
  });
}

/* ---------- impor, ekspor, simpan ---------- */
export function impor(teks) {
  const ukuran = new TextEncoder().encode(String(teks ?? "")).length;
  if (ukuran > MAKS_BYTE) return {galat: `Berkas ${tampil(Math.round(ukuran / 1024))} KB melewati batas 32 KB. Impor berkas ekspor Studio, bukan berkas lain.`};
  let j;
  try { j = JSON.parse(teks); } catch { return {galat: "Berkas bukan JSON yang sah. Impor berkas hasil Ekspor JSON Studio."}; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return {galat: "Isi berkas harus objek JSON hasil ekspor Studio."};
  return {state: bersihkan(j.keadaan ?? j.assumptions ?? j.state ?? j)};
}
export const ringkasSimpan = h => ({vonis: h.decision, capex: h.fin.capex, tco: h.fin.tco, keras: h.hard.length});
export function ekspor(state, hasil, kini = new Date()) {
  return {format: "sippa-studio-1", dibuat: kini.toISOString(), keadaan: bersihkan(state), ringkas: ringkasSimpan(hasil), boq: hasil.boq.map(x => ({id: x.id, nama: x.name, jumlah: x.q, harga: x.price, total: x.total, dasar: x.origin}))};
}
export function cekNama(n) {
  const nama = String(n ?? "").trim().replace(/\s+/g, " ");
  return nama.length >= 3 && nama.length <= 80 ? {nama} : {galat: "Nama skenario harus 3 sampai 80 huruf."};
}
export function badanSimpan(nama, state, hasil) { return {nama, versi_mesin: "studio-1", state: bersihkan(state), ringkas: ringkasSimpan(hasil)}; }

/* ---------- CSV ---------- */
export const csvBaris = r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
export function boqCsv(h) {
  const f = N => N, pf = h.s.priceFactor;
  return "﻿" + [csvBaris(["ID", "Komponen", "Kuantitas", "Harga satuan Rp", "Jumlah Rp", "Dasar estimasi"]), ...h.boq.map(x => csvBaris([x.id, x.name, f(x.q), x.price * pf, x.total, x.origin]))].join("\r\n");
}
export function matriks100(state, konst = KONST) {
  const dasar = nilaiHasil(state, konst), rows = [];
  for (const d of SKEMA) for (const o of d.options) {
    const h = nilaiHasil({...state, [d.key]: d.key === "hasBooster" ? o.value === "true" : o.value}, konst);
    rows.push({kunci: d.key, dimensi: d.label, nilai: o.value, pilihan: o.label, plus: o.pro, minus: o.con, aktif: String(state[d.key] ?? mesin().defaultState()[d.key]) === o.value, status: h.decision,
      capex: h.fin.capex, tco: h.fin.tco, dCapex: h.fin.capex - dasar.fin.capex, dTco: h.fin.tco - dasar.fin.tco, tdh: h.hyd.tdh, opex: h.fin.opex});
  }
  return rows;
}
export function matriksCsv(rows) {
  return "﻿" + [csvBaris(["Dimensi", "Pilihan", "Kelebihan", "Kekurangan", "Status", "CAPEX Rp", "TCO Rp", "ΔCAPEX vs aktif Rp", "ΔTCO vs aktif Rp", "TDH m", "OPEX Rp/th"]),
    ...rows.map(r => csvBaris([r.dimensi, r.pilihan, r.plus, r.minus, r.status, r.capex, r.tco, r.dCapex, r.dTco, r.tdh, r.opex]))].join("\r\n");
}

/* ---------- kepekaan (tornado): enam variabel utama pemilik, satu per satu naik dan turun ---------- */
const KEPEKAAN = [["od", "Diameter pipa", 40, 1, "mm"], ["flowLPM", "Target debit", 500, 1, "L/menit"], ["elevation", "Naik turun elevasi", 10, -25, "m"], ["waterQ", "Debit sumber", 20, 0, "L/s"], ["networkLength", "Panjang trase", 500, 1, "m"], ["waterPerHa", "Kebutuhan air per ha", 200, 1, "m3/ha"]];
export function kepekaan(state, konst = KONST) {
  const dasar = nilaiHasil(state, konst), ringkas = (h, nilai) => ({nilai, tco: h.fin.tco, capex: h.fin.capex, tdh: h.hyd.tdh, decision: h.decision});
  return KEPEKAAN.map(([k, label, langkah, min, unit]) => {
    const v = Number(state[k] ?? mesin().defaultState()[k]), lo = Math.max(min, v - langkah), hi = v + langkah;
    return {k, label, unit, langkah, min, dasar: v, lo: ringkas(nilaiHasil({...state, [k]: lo}, konst), lo), hi: ringkas(nilaiHasil({...state, [k]: hi}, konst), hi), tcoDasar: dasar.fin.tco};
  }).sort((a, b) => Math.abs(b.hi.tco - b.lo.tco) - Math.abs(a.hi.tco - a.lo.tco));
}

/* ---------- kontrol masukan ---------- */
export function cekNumerik(d, teks) {
  const s = String(teks ?? "").trim();
  if (!s) return {galat: `${d.label} wajib diisi.`};
  const v = angkaId(s);
  if (Number.isNaN(v)) return {galat: `${d.label} harus berupa angka. Contoh: 1.250 atau 0,7.`};
  if (v < d.min || v > d.max) return {galat: `${angkaP(v)} di luar rentang ${angkaP(d.min)}–${angkaP(d.max)} ${d.unit}. Isi nilai di dalam rentang.`};
  return {nilai: v};
}
const nilaiTeks = (d, v) => d.unit.startsWith("Rp") ? `Rp${tampil(v)}${d.unit.slice(2)}` : d.unit === "%" ? `${angkaP(v)}%` : `${angkaP(v)} ${d.unit}`;
const rentangTeks = d => `${angkaP(d.min)}–${angkaP(d.max)} ${d.unit}`;
const adaSeg = d => d.options.length <= 3 && d.options.reduce((a, o) => a + o.label.length, 0) <= 30;
const nilaiDim = (s, k) => String(s[k]);

function dimHtml(d, s) {
  const v = nilaiDim(s, d.key), id = `st-d-${d.key}`, o = d.options.find(x => x.value === v) || d.options[0];
  const kontrol = adaSeg(d)
    ? `<span class="sp-lab" id="${id}-l">${lolos(d.label)}</span><div class="ad-seg" role="radiogroup" aria-labelledby="${id}-l">${d.options.map(p => `<button type="button" role="radio" aria-checked="${String(p.value === v)}" tabindex="${p.value === v ? 0 : -1}" data-opsi="${lolos(p.value)}">${lolos(p.label)}</button>`).join("")}</div>`
    : `<label class="sp-lab" for="${id}">${lolos(d.label)}</label><select id="${id}" data-cantik="1">${d.options.map(p => `<option value="${lolos(p.value)}"${p.value === v ? " selected" : ""}>${lolos(p.label)}</option>`).join("")}</select>`;
  return `<div class="sp-isian sp-dim" data-dim="${lolos(d.key)}">${kontrol}<small class="sp-bantu">${lolos(d.metric)}. ${lolos(d.help)}</small><small class="sp-pm" data-pm><span class="sp-plus"><b>Kelebihan:</b> ${lolos(o.pro)}</span> <span class="sp-minus"><b>Kekurangan:</b> ${lolos(o.con)}</span></small></div>`;
}
function numHtml(d, s) {
  const v = s[d.key], id = `st-n-${d.key}`;
  return `<div class="sp-isian sp-num" data-num="${lolos(d.key)}"><div class="sp-lab-baris"><label for="${id}">${lolos(d.label)}</label><output class="sp-nilai" for="${id} st-s-${d.key}" data-nilai>${lolos(nilaiTeks(d, v))}</output></div>
    <input type="range" class="sp-slider" id="st-s-${d.key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}" aria-label="${lolos(d.label)}, penggeser" aria-valuetext="${lolos(nilaiTeks(d, v))}">
    <span class="sp-kotak"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" class="ada-satuan" value="${lolos(desimal(v))}" aria-describedby="${id}-b ${id}-g"><span class="sp-satuan">${lolos(d.unit)}</span></span>
    <small class="sp-bantu" id="${id}-b">Rentang ${lolos(rentangTeks(d))}. ${lolos(d.help)}</small><small class="sp-galat-isian" id="${id}-g" hidden></small></div>`;
}
function kitHtml(sp) {
  const f = (k, label, min, max, bantu) => `<div class="sp-isian"><div class="sp-lab-baris"><label for="st-k-${k}">${label}</label></div><span class="sp-kotak"><input id="st-k-${k}" type="number" inputmode="decimal" data-sippa="${k}" min="${min}" max="${max}" step="1" value="${sp[k]}" aria-describedby="st-k-${k}-b"></span><small class="sp-bantu" id="st-k-${k}-b">${bantu}</small></div>`;
  return `<section class="sp-kit-sippa" aria-labelledby="st-kit-j"><h3 class="sp-sub-judul" id="st-kit-j">Kit SIPPA ${pil("hipotesis", "Lengan uji bila 3 m ke atas")}</h3>
    ${f("n_lance", "Jumlah lance", 1, 24, "Serapan tetap 40 L/min per lance; debit di atasnya tidak terserap (H-SERAP).")}
    ${f("dalam_m", "Kedalaman injeksi (m)", 0, KONST.dalam_maks_m, `Paling dalam ${KONST.dalam_maks_m} m (keputusan 50); lebih dari itu di luar SIPPA.`)}</section>`;
}
const PETUNJUK_MANFAAT = {
  regu: "selisih regu-hari per tahun x tarif per regu-hari (Rp2,25 sampai 3,75 juta, KD §4.3)",
  heli: "heli-hari x harga per jam; harga menunggu angka BNPB (slot sippa.heli.biaya_jam)",
  banjir: "jam pompa banjir per musim x tarif sewa pompa setara per jam (slot sippa.banjir.sewa_jam); hanya skenario berpompa banjir terpisah",
  irigasi: "luas x nilai per ha (slot sippa.irigasi.nilai_ha); nol otomatis bila salah satu syarat keras tidak dicentang (PRD §5.7)",
};
const SYARAT_IRIGASI = ["Tidak menurunkan muka air gambut", "Tidak menambah drainase gambut", "Air dari sumber lain di luar kubah gambut, bukan air pemadaman atau kanal gambut"];
function manfaatHtml(m) {
  const sw = (k, judul, isi, mati = false) => `<div class="sp-man" data-man="${k}"><label class="sp-sakelar"><input type="checkbox" role="switch" data-man-aktif="${k}"${m[k].aktif ? " checked" : ""}${mati ? " disabled" : ""}><span>${judul}</span></label>
    <small class="sp-bantu">${lolos(PETUNJUK_MANFAAT[k])}</small>${isi}</div>`;
  const kotak = (jalur, label, v, satuan) => `<label class="sp-man-isi"><span>${label}</span><span class="sp-kotak"><input type="text" inputmode="decimal" autocomplete="off" data-man-isi="${jalur}" value="${lolos(desimal(v))}" class="ada-satuan"><span class="sp-satuan">${satuan}</span></span></label>`;
  return `<fieldset class="sp-manfaat"><legend class="sp-sub-judul">Manfaat ${pil("asumsi-kebijakan", "Bawaan 0")}</legend>
    <p class="sp-bantu">NPV dan BCR hanya berarti bila manfaat diisi dengan sumber yang bisa ditelusuri. Tiap sumber di bawah mati sampai dinyalakan.</p>
    ${sw("regu", "Regu konvensional terhindar", `${kotak("regu.hari", "Selisih regu-hari per tahun", m.regu.hari, "hari")}${kotak("regu.tarif", "Tarif per regu-hari", m.regu.tarif, "Rp")}`)}
    ${sw("heli", `Heli-hari terhindar ${pil("menunggu")}`, `<p class="sp-bantu sp-pembanding-heli">Pembanding resmi: ${lolosTeks(globalThis.KarhutlaEngine?.HELI.pembanding ?? "> Rp200 juta per sorti satu jam (BNPB, September 2023)")}. Tidak dicampur ke TCO sampai angka BNPB diserahkan.</p>`, true)}
    ${sw("banjir", "Pemakaian banjir", `${kotak("banjir.jam", "Jam pompa banjir per musim", m.banjir.jam, "jam")}${kotak("banjir.tarif", "Tarif sewa per jam", m.banjir.tarif, "Rp")}`)}
    ${sw("irigasi", "Irigasi musim peralihan", `${kotak("irigasi.ha", "Luas irigasi", m.irigasi.ha, "ha")}${kotak("irigasi.nilai", "Nilai per ha", m.irigasi.nilai, "Rp")}
      <div class="sp-syarat" role="group" aria-label="Syarat keras irigasi">${SYARAT_IRIGASI.map((t, i) => `<label class="sp-sakelar sp-syarat-isi"><input type="checkbox" data-man-syarat="${i}"${m.irigasi.syarat[i] ? " checked" : ""}><span>${lolos(t)}</span></label>`).join("")}</div>`)}</fieldset>`;
}
export function kontrolHtml(state) {
  const m = state.manfaat || MANFAAT_BAWAAN;
  return `${state.sippa ? kitHtml(state.sippa) : ""}${KELOMPOK.map((g, i) => {
    const dims = SKEMA.filter(d => d.group === g), nums = NUMERIK.filter(d => d.group === g);
    return `<details class="sp-kel sp-lipat" data-grup="${i}"${i === 0 ? " open" : ""}><summary><span class="ad-ey">${lolos(g)}</span><small>${dims.length + nums.length} pengaturan</small></summary><div class="sp-kel-isi">${dims.map(d => dimHtml(d, state)).join("")}${nums.map(d => numHtml(d, state)).join("")}${g === "Anggaran & horizon" ? manfaatHtml(m) : ""}</div></details>`;
  }).join("")}`;
}

/* ---------- grafik SVG ---------- */
const sumbuTeks = (x, y, t, jangkar = "start", kelas = "sp-teks") => `<text class="${kelas}" x="${x}" y="${y}" text-anchor="${jangkar}">${lolos(t)}</text>`;
function svgBatangH(baris, {id, judul, desk, fmtNilai = rp}) {
  const rh = 30, kiri = 168, kanan = 128, W = 720, H = baris.length * rh + 6, maks = Math.max(1, ...baris.map(b => b.nilai));
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="${id}-j ${id}-d"><title id="${id}-j">${lolos(judul)}</title><desc id="${id}-d">${lolos(desk)}</desc>`;
  baris.forEach((b, i) => {
    const y = i * rh + 3, w = Math.max(2, b.nilai / maks * (W - kiri - kanan));
    s += `<g>${sumbuTeks(kiri - 8, y + rh / 2 + 3, b.label, "end", "sp-teks sp-kuat")}<rect class="sp-batang ${b.kelas || "dipakai"}" x="${kiri}" y="${y + 5}" width="${w}" height="${rh - 12}" rx="4"><title>${lolos(b.label)}: ${lolos(fmtNilai(b.nilai))}</title></rect>${sumbuTeks(kiri + w + 8, y + rh / 2 + 3, fmtNilai(b.nilai), "start", "sp-teks sp-kuat")}</g>`;
  });
  return s + "</svg>";
}
function svgRentangMc(mc, tco) {
  const W = 720, H = 156, kiri = 24, kanan = 24, lo = Math.min(mc.low, tco) * 0.97, hi = Math.max(mc.high, tco) * 1.03, X = v => kiri + (W - kiri - kanan) * (v - lo) / (hi - lo);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="st-mc-j st-mc-d"><title id="st-mc-j">Rentang TCO Monte Carlo, ${tampil(mc.samples)} sampel</title>`;
  s += `<desc id="st-mc-d">P10 ${lolos(rp(mc.low))}, median ${lolos(rp(mc.mid))}, P90 ${lolos(rp(mc.high))}; TCO deterministik ${lolos(rp(tco))}.</desc>`;
  s += `<line class="sp-sumbu" x1="${kiri}" x2="${W - kanan}" y1="64" y2="64"/><rect class="sp-pita-ci" x="${X(mc.low)}" y="42" width="${Math.max(2, X(mc.high) - X(mc.low))}" height="44" rx="6"><title>P10 sampai P90</title></rect>`;
  s += `<line class="sp-median" x1="${X(mc.mid)}" x2="${X(mc.mid)}" y1="36" y2="92"/><line class="sp-tco" x1="${X(tco)}" x2="${X(tco)}" y1="30" y2="98"/>`;
  s += sumbuTeks(X(mc.low), 22, `P10 ${rp(mc.low)}`, "start", "sp-teks sp-kuat") + sumbuTeks(X(mc.high), 22, `P90 ${rp(mc.high)}`, "end", "sp-teks sp-kuat");
  s += sumbuTeks(X(mc.mid), 112, `P50 ${rp(mc.mid)}`, "middle", "sp-teks sp-kuat") + sumbuTeks(X(tco), 146, `deterministik ${rp(tco)}`, X(tco) < W / 2 ? "start" : "end");
  return s + "</svg>";
}
function svgTornado(kp) {
  const W = 720, rh = 38, kiri = 200, kanan = 24, tengah = kiri + (W - kiri - kanan) / 2, setengah = (W - kiri - kanan) / 2 - 70, H = kp.length * rh + 8;
  const dev = Math.max(1, ...kp.flatMap(x => [Math.abs(x.lo.tco - x.tcoDasar), Math.abs(x.hi.tco - x.tcoDasar)])), X = (t, dasar) => tengah + (t - dasar) / dev * setengah;
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="st-tn-j st-tn-d"><title id="st-tn-j">Kepekaan TCO terhadap enam variabel utama</title><desc id="st-tn-d">${lolos(kp.map(x => `${x.label} ${angkaP(x.lo.nilai)} sampai ${angkaP(x.hi.nilai)} ${x.unit}: TCO ${rp(x.lo.tco)} sampai ${rp(x.hi.tco)}`).join("; "))}.</desc>`;
  kp.forEach((x, i) => {
    const y = i * rh + 4, a = X(x.lo.tco, x.tcoDasar), b = X(x.hi.tco, x.tcoDasar);
    s += `<g>${sumbuTeks(kiri - 10, y + 15, x.label, "end", "sp-teks sp-kuat")}${sumbuTeks(kiri - 10, y + 29, `${angkaP(x.lo.nilai)}–${angkaP(x.hi.nilai)} ${x.unit}`, "end")}`;
    s += `<rect class="sp-tn-rendah" x="${Math.min(tengah, a)}" y="${y + 6}" width="${Math.max(2, Math.abs(a - tengah))}" height="22" rx="3"><title>${lolos(x.label)} ${lolos(angkaP(x.lo.nilai))} ${lolos(x.unit)}: TCO ${lolos(rp(x.lo.tco))}</title></rect>`;
    s += `<rect class="sp-tn-tinggi" x="${Math.min(tengah, b)}" y="${y + 6}" width="${Math.max(2, Math.abs(b - tengah))}" height="22" rx="3"><title>${lolos(x.label)} ${lolos(angkaP(x.hi.nilai))} ${lolos(x.unit)}: TCO ${lolos(rp(x.hi.tco))}</title></rect>`;
    s += sumbuTeks(Math.min(a, b) - 6, y + 22, rp(Math.min(x.lo.tco, x.hi.tco)), "end") + sumbuTeks(Math.max(a, b) + 6, y + 22, rp(Math.max(x.lo.tco, x.hi.tco)), "start") + "</g>";
  });
  return s + `<line class="sp-tn-dasar" x1="${tengah}" x2="${tengah}" y1="0" y2="${H}"/></svg>`;
}
const IKON_VONIS = {
  nogo: '<path d="m15 9-6 6"/><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z"/><path d="m9 9 6 6"/>',
  hold: '<circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/>',
  kondisional: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
};
const svgVonis = k => `<svg class="sp-ikon sp-ikon-vonis" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON_VONIS[k]}</svg>`;

/* ---------- tab: pembangun HTML ---------- */
const sumber = t => `<p class="ad-catat sp-sumber">Sumber: ${t}</p>`;
const kartuEx = (ey, judul, isi, kaki = "") => `<article class="ex"><header class="ex-hd"><span class="ex-ey">${lolos(ey)}</span><div class="ex-jd"><h3>${lolos(judul)}</h3></div></header><div class="ex-bd">${isi}</div>${kaki ? `<footer class="ex-ft"><em>${kaki}</em></footer>` : ""}</article>`;
const MANFAAT_TEKS = "manfaat bawaan 0, tiap sumber manfaat berpil asumsi kebijakan";

function kepalaKolom(c) {
  const nogo = c.hasil.decision === "NO-GO", x = hit(c.hasil);
  return `<th scope="col" class="sp-kol${nogo ? " sp-kol-nogo" : ""}" data-kode="${lolos(c.kode)}"><b class="sp-kode">${lolos(c.kode)}</b><span class="sp-nama">${lolos(c.nama)}</span>${pilVonis(c.hasil.decision)}
    <span class="sp-hit-baris"><span class="sp-hit keras" title="Hambatan keras">${x.keras} keras</span><span class="sp-hit syarat" title="Hambatan bersyarat">${x.syarat} syarat</span><span class="sp-hit catatan" title="Catatan">${x.catatan} catatan</span></span>
    ${c.ditutup ? `<span class="sp-status putus sp-tutup">ditutup</span>` : ""}${nogo ? `<small class="sp-alasan">${lolos(c.hasil.hard[0])}</small>` : ""}</th>`;
}
function selHtml(x) {
  const isi = x.html ?? (x.menunggu ? `–${pil("menunggu")}` : lolos(x.teks));
  return `<td class="n${x.terbaik ? " sp-terbaik" : ""}">${isi}${x.terbaik ? '<span class="sr">terbaik</span>' : ""}</td>`;
}
const BARIS_KARTU = ["capex", "tco", "npv0", "bcr0", "tekanan", "jam_gelar"];
export function tabBandingkanHtml(baris, kolom) {
  const tabel = `<div class="ad-tabel-wadah sp-studio-tabel"><table class="ad-tabel sp-tabel-studio"><caption class="sr">Perbandingan skenario S0, S0B, S1, S2, S3 dan skenario tersimpan</caption>
    <thead><tr><th scope="col" class="sp-sudut">Ukuran</th>${kolom.map(kepalaKolom).join("")}</tr></thead>
    <tbody>${baris.map(r => `<tr data-k="${r.k}"><th scope="row"><span class="sp-ukuran">${lolos(r.label)}</span>${pil(r.yakin)}</th>${r.sel.map(selHtml).join("")}</tr>`).join("")}</tbody></table></div>`;
  const kartu = `<div class="sp-kartu-skenario">${kolom.map((c, i) => {
    const nogo = c.hasil.decision === "NO-GO", keras = c.hasil.hard;
    return `<article class="sp-skenario${nogo ? " sp-kol-nogo" : ""}" aria-labelledby="sk-${lolos(c.kode)}"><header class="sp-skenario-kepala"><b class="sp-kode" id="sk-${lolos(c.kode)}">${lolos(c.kode)}</b><span class="sp-nama">${lolos(c.nama)}</span>${pilVonis(c.hasil.decision)}${c.ditutup ? '<span class="sp-status putus sp-tutup">ditutup</span>' : ""}</header>
      <dl class="sp-skenario-angka">${BARIS_KARTU.map(k => { const r = baris.find(b => b.k === k); return `<div><dt>${lolos(r.label)}</dt><dd>${selHtml(r.sel[i]).replace(/^<td[^>]*>|<\/td>$/g, "")}</dd></div>`; }).join("")}</dl>
      ${keras.length ? `<ul class="sp-skenario-keras" aria-label="Hambatan keras">${keras.slice(0, 3).map(t => `<li>${lolos(t)}</li>`).join("")}${keras.length > 3 ? `<li class="ad-redup">dan ${tampil(keras.length - 3)} hambatan keras lain</li>` : ""}</ul>` : '<p class="sp-skenario-keras">Hambatan keras: tidak ada</p>'}
      <button type="button" class="ad-tombol" data-rincian="${lolos(c.kode)}">Rincian</button></article>`;
  }).join("")}</div>`;
  return `${tabel}${kartu}${sumber(`${SUMBER_MESIN}; ${MANFAAT_TEKS} ${pil("asumsi-kebijakan", "Asumsi kebijakan")}. S1 sampai S3 memakai kondisi lokasi dan anggaran keadaanmu; S0 dan S0B preset kit SIPPA dengan anggaran yang sama. S2 dan S3 jaringan pipa tetap, ditutup (keputusan 60); angkanya hanya pembanding. Biaya heli per jam menunggu angka BNPB (slot sippa.heli.biaya_jam), pembanding resmi > Rp200 juta per sorti satu jam (BNPB, September 2023). Baris tanpa kolom berbingkai berarti belum ada pembeda di antara kolom yang bukan NO-GO.`)}`;
}
export function rincianKolomHtml(baris, kolom, i) {
  return `<dl class="sp-rincian">${baris.map(r => `<div><dt>${lolos(r.label)}</dt><dd>${selHtml(r.sel[i]).replace(/^<td[^>]*>|<\/td>$/g, "")}</dd></div>`).join("")}</dl>${kolom[i].hasil.hard.length ? `<h4 class="sp-sub-judul">Hambatan keras</h4><ul class="sp-daftar-risiko">${kolom[i].hasil.hard.map(t => `<li>${lolos(t)}</li>`).join("")}</ul>` : ""}`;
}

function kartuVonis(h) {
  const k = kelasVonis(h.decision), utama = h.hard[0] || h.conditional[0], lain = h.hard.length + h.conditional.length - 1;
  const alasan = !utama ? "Tidak ada hambatan keras atau bersyarat. KONDISIONAL tetap butuh uji lapangan (G2, G3)." : lain > 0 ? `${utama} Ada ${tampil(lain)} hambatan lain.` : utama;
  return `<section class="sp-vonis-kartu ${k}" aria-labelledby="st-vonis-kata"><div class="sp-vonis-ikon">${svgVonis(k)}</div><div class="sp-vonis-isi"><p class="sp-vonis-kata" id="st-vonis-kata">${lolos(h.decision)}</p><p class="sp-vonis-alasan">${lolos(alasan)}</p>
    <div class="sp-pil-baris">${pil("estimasi-model")}<span class="sp-yakin hipotesis">Tidak ada vonis GO</span></div></div></section>`;
}
const angkaKartu = (label, nilai, banding, yakin, sumberT, nada = "") => `<div class="sp-angka${nada ? " " + nada : ""}"><dt><span class="ad-ey">${lolos(label)}</span>${pil(yakin)}</dt><dd><b>${lolos(nilai)}</b><small>${lolos(banding)}</small><small class="sp-sumber">${lolos(sumberT)}</small></dd></div>`;
export function tabRingkasanHtml(h) {
  const f = h.fin, y = h.hyd, em = "estimasi-model";
  const angka = [
    angkaKartu("CAPEX", rp(f.capex), `langsung ${rp(f.direct)} ditambah kontingensi ${rp(f.contingency)}`, em, "BoQ mesin x pengali harga"),
    angkaKartu("OPEX per tahun", rp(f.opex), `energi ${rp(f.energyAnnual)}, upah ${rp(f.wageAnnual)}`, em, "komponen OPEX mesin Studio"),
    angkaKartu(`TCO ${tampil(f.horizon)} tahun`, rp(f.tco), `terdiskonto ${rp(f.capex + f.opex * f.annuityFactor)}`, em, "CAPEX + OPEX x periode"),
    angkaKartu("Tekanan pompa", `${tampil(y.pressBar)} bar`, `TDH ${tampil(y.tdh)} m, kecepatan ${tampil(y.vel)} m/s`, em, "Hazen-Williams mesin Studio", y.pressBar > y.nominalPN * y.tempDerate * 0.88 ? "lewat" : ""),
    angkaKartu("Daya poros", `${tampil(y.shaftKw)} kW`, `${tampil(y.hp)} HP; rating pompa ${y.pumpRatingOK ? "cukup" : "kurang"}`, em, "P = rho g Q TDH / efisiensi", y.pumpRatingOK ? "" : "lewat"),
    angkaKartu("Manfaat impas per tahun", rp(f.breakevenAnnual), `NPV ${rp(f.npv)} pada manfaat ${rp(f.annualBenefit)}`, em, "OPEX + CAPEX / faktor anuitas"),
    angkaKartu("Waktu siap", jam(y.readyHours), `jam gelar ${jam(y.installHours)}, ${tampil(y.installedMPerHour)} m/jam`, em, "laju pasang regu dan jarak kirim"),
    angkaKartu("Skor berbobot", `${tampil(h.score)} dari 100`, `risiko screening ${tampil(h.riskRisk)} dari 100; tidak meluluskan NO-GO`, "asumsi-kebijakan", "bobot isian di Anggaran & horizon"),
  ].join("");
  const bar = svgBatangH([{label: "Biaya langsung", nilai: f.direct}, {label: "Kontingensi", nilai: f.contingency}, {label: "OPEX per tahun", nilai: f.opex, kelas: "sp-lain"}, {label: `TCO ${tampil(f.horizon)} tahun`, nilai: f.tco, kelas: "sp-lain"}],
    {id: "st-rb", judul: "Biaya keadaan aktif", desk: `CAPEX ${rp(f.capex)}, OPEX ${rp(f.opex)} per tahun, TCO ${rp(f.tco)}.`});
  const dep = `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-dep"><caption class="sr">Jejak sebab dan akibat</caption><thead><tr><th scope="col">Dari</th><th scope="col">Menghasilkan</th><th scope="col">Dampak saat ini</th></tr></thead><tbody>${h.dependencies.map(d => `<tr><td data-label="Dari">${lolos(d.from)}</td><td data-label="Menghasilkan">${lolos(d.out)}</td><td data-label="Dampak saat ini">${lolos(d.impact)}</td></tr>`).join("")}</tbody></table></div>`;
  return `${kartuVonis(h)}<dl class="sp-angka-kisi">${angka}</dl>${kartuEx("Biaya", "Biaya keadaan aktif", `<div class="sp-grafik-isi">${bar}</div>`, `Sumber: ${SUMBER_MESIN}; ${pil("estimasi-model")}`)}<h3 class="sp-sub-judul">Jejak sebab dan akibat</h3>${dep}${sumber(`${SUMBER_MESIN}; keputusan screening pra-FEED, bukan pembuktian. ${MANFAAT_TEKS}.`)}`;
}
export function tabHidraulikaHtml(h) {
  const y = h.hyd, em = "estimasi-model";
  const baris = [
    ["Debit pompa", `${tampil(y.flow * 60000)} L/menit`, "target debit isian"], ["Diameter dalam", `${tampil(y.di * 1000)} mm`, "dari OD, SDR, dan jenis pipa"], ["Kecepatan", `${tampil(y.vel)} m/s`, "waspada di atas 3 m/s (water hammer)"],
    ["Head loss pipa", `${tampil(y.hf)} m`, "Hazen-Williams, C 135 HDPE dan 120 layflat"], ["Head loss minor", `${tampil(y.hm)} m`, "jumlah K minor isian"], ["Beda elevasi", `${tampil(y.staticH)} m`, "intake ke ujung"],
    ["Tekanan sisa ujung", `${tampil(y.endpoint)} m`, "tekanan aplikator isian dalam meter head"], ["TDH", `${tampil(y.tdh)} m`, "ditambah 3,5 m untuk intake dan filter"], ["Tekanan pompa", `${tampil(y.pressBar)} bar`, `batas screening 88% x PN${tampil(y.nominalPN)} x derating suhu ${angkaP(y.tempDerate)}`],
    ["Daya poros", `${tampil(y.shaftKw)} kW (${tampil(y.hp)} HP)`, "efisiensi pompa isian"], ["Sumber setelah cadangan ekologi", `${tampil(y.availableLPMin)} L/menit`, y.waterOK ? "cukup untuk debit operasi" : "kurang dari debit operasi"],
    ["Waktu pemompaan untuk volume sasaran", jam(y.waterHours), "volume sasaran dibagi debit"], ["Laju pasang", `${tampil(y.installedMPerHour)} m/jam`, "produktivitas regu, akses, dan gambut"], ["Jam instalasi", `${jam(y.installHours)} (${tampil(y.installDays)} hari kerja)`, "trase dan cabang"], ["Waktu siap", jam(y.readyHours), "gelar kejadian ditambah kirim"],
  ];
  const komp = svgBatangH([{label: "Beda elevasi", nilai: Math.max(0, y.staticH)}, {label: "Head loss pipa", nilai: y.hf}, {label: "Head loss minor", nilai: y.hm}, {label: "Tekanan sisa ujung", nilai: y.endpoint}, {label: "Intake dan filter", nilai: 3.5}],
    {id: "st-hd", judul: "Komponen TDH, m", desk: `TDH ${tampil(y.tdh)} m: elevasi ${tampil(y.staticH)}, pipa ${tampil(y.hf)}, minor ${tampil(y.hm)}, sisa ${tampil(y.endpoint)}, intake 3,5.`, fmtNilai: v => `${tampil(v)} m`});
  return `${kartuEx("Hidraulika", `TDH ${tampil(y.tdh)} m, ${tampil(y.pressBar)} bar`, `<div class="sp-grafik-isi">${komp}</div>`, `Sumber: ${SUMBER_MESIN}; ${pil(em)}`)}
    <div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-hid"><caption class="sr">Hasil hidraulika mesin Studio</caption><thead><tr><th scope="col">Ukuran</th><th scope="col">Nilai</th><th scope="col">Dasar</th></tr></thead><tbody>${baris.map(([a, b, c]) => `<tr><td data-label="Ukuran">${lolos(a)}</td><td class="n" data-label="Nilai">${lolos(b)}</td><td data-label="Dasar">${lolos(c)}</td></tr>`).join("")}</tbody></table></div>
    ${sumber(`hidraulika mesin Studio (aliran tunak satu trunk), ${pil(em)}. Angkanya boleh berbeda dari layar Hitung karena koefisien dan allowance hisap berbeda; penjelasannya di <a href="/pipa/data?tab=batas">Data dan metode</a>.`)}`;
}
export function tabelBoqHtml(h, cari) {
  const q = String(cari ?? "").trim().toLowerCase(), pf = h.s.priceFactor;
  const rows = h.boq.filter(x => !q || `${x.id} ${x.name} ${x.origin}`.toLowerCase().includes(q));
  if (!rows.length) return `<p class="ad-kosong">Tidak ada komponen yang cocok dengan "${lolos(cari)}". Hapus sebagian kata cari.</p>`;
  return `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-boq"><caption class="sr">Daftar kuantitas dan biaya komponen</caption><thead><tr><th scope="col">ID</th><th scope="col">Komponen</th><th scope="col">Jumlah</th><th scope="col">Harga satuan</th><th scope="col">Total</th><th scope="col">Dasar estimasi</th></tr></thead>
    <tbody>${rows.map(x => `<tr><td data-label="ID"><code>${lolos(x.id)}</code></td><td data-label="Komponen">${lolos(x.name)}</td><td class="n" data-label="Jumlah">${tampil(x.q)}</td><td class="n" data-label="Harga satuan">${rp(x.price * pf)}</td><td class="n" data-label="Total">${rp(x.total)}</td><td data-label="Dasar estimasi">${lolos(x.origin)}</td></tr>`).join("")}</tbody></table></div><p class="ad-catat">${tampil(rows.length)} dari ${tampil(h.boq.length)} komponen.</p>`;
}
export function tabBiayaHtml(h, cari = "") {
  const f = h.fin;
  const opex = svgBatangH([["Energi dan BBM", f.energyAnnual], ["Upah operasi", f.wageAnnual], ["Servis dan suku cadang", f.serviceAnnual], ["Patroli dan drone", f.patrolling], ["Telemetri", f.monitor], ["Proteksi aset", f.protection], ["Logistik", f.logistics], ["Latihan", f.drill], ["Dukungan udara", f.airAnnual]]
    .map(([label, nilai]) => ({label, nilai})).sort((a, b) => b.nilai - a.nilai), {id: "st-ox", judul: "OPEX per tahun menurut komponen", desk: `OPEX ${rp(f.opex)} per tahun; energi ${rp(f.energyAnnual)}, upah ${rp(f.wageAnnual)}.`});
  return `${kartuEx("Biaya", `OPEX ${rp(f.opex)} per tahun`, `<div class="sp-grafik-isi">${opex}</div>`, `Sumber: ${SUMBER_MESIN}; ${pil("estimasi-model")}. Dukungan udara hanya koordinasi sampai harga heli BNPB masuk ${pil("menunggu")}`)}
    <div class="sp-boq-kepala"><h3 class="sp-sub-judul">Daftar kuantitas dan biaya (BoQ)</h3><label class="sp-cari"><span class="sr">Cari komponen</span><input type="search" id="st-cari" aria-controls="st-boq" placeholder="Cari komponen atau dasar" value="${lolos(cari)}" autocomplete="off"></label><button type="button" class="ad-tombol" data-aksi="boq">BOQ CSV</button></div>
    <div id="st-boq" aria-live="polite">${tabelBoqHtml(h, cari)}</div>${sumber(`BoQ mesin Studio; harga dari pemasok terdahulu dan asumsi engineering, bukan harga pasar atau penawaran tender, ${pil("estimasi-model")}.`)}`;
}
const daftarRisiko = (judul, ul, kelas, kosongT) => `<section class="sp-risiko ${kelas}"><h3 class="sp-sub-judul">${judul} <span class="sp-yakin estimasi-model">${tampil(ul.length)}</span></h3>${ul.length ? `<ul class="sp-daftar-risiko">${ul.map(t => `<li>${lolos(t)}</li>`).join("")}</ul>` : `<p class="ad-kosong">${kosongT}</p>`}</section>`;
export function tabRisikoHtml(h) {
  const p = h.profileScores;
  const profil = svgBatangH([["Biaya modal", p.capital], ["Keselamatan dan izin", p.safety], ["Operasi dan akses", p.ops], ["Konservasi gambut", p.ecology], ["Efektivitas hipotesis", p.effectiveness]].map(([label, nilai]) => ({label, nilai})),
    {id: "st-pf", judul: "Skor profil, 0 sampai 100", desk: `Biaya modal ${tampil(p.capital)}, keselamatan ${tampil(p.safety)}, operasi ${tampil(p.ops)}, konservasi ${tampil(p.ecology)}, efektivitas ${tampil(p.effectiveness)}.`, fmtNilai: v => tampil(v)});
  return `${kartuVonis(h)}<div class="sp-risiko-kisi">${daftarRisiko("Hambatan keras (NO-GO / STOP WORK)", h.hard, "keras", "Tidak ada hambatan keras. Aturan ini tidak boleh dihapus hanya untuk menaikkan skor.")}${daftarRisiko("Hambatan bersyarat (HOLD / VALIDASI)", h.conditional, "syarat", "Tidak ada hambatan bersyarat.")}${daftarRisiko("Catatan", h.soft, "catatan", "Tidak ada catatan.")}</div>
    ${kartuEx("Skor", `Skor berbobot ${tampil(h.score)} dari 100, tidak meluluskan NO-GO`, `<div class="sp-grafik-isi">${profil}</div>`, `Sumber: ${SUMBER_MESIN}; bobot isian ${pil("asumsi-kebijakan")}; ${pil("hipotesis", "Efektivitas: hipotesis")}`)}
    ${sumber(`gerbang mesin Studio (88% x PN x derating suhu, panas dan termoplastik, ujung HDPE di bara, daya poros, air bersih, izin air, hak lahan, lingkungan, rewetting saja saat api aktif) ditambah gerbang SIPPA (H-SERAP, H-DALAM, H-AIR 1,5 kali, jaringan_permanen); gerbang hanya menambah hambatan. ${pil("estimasi-model")}`)}`;
}
export function tabSimulasiHtml(h, mc, kp, opsi = {}) {
  const f = h.fin;
  const mcIsi = mc ? `<div class="sp-grafik-isi${opsi.basi ? " sp-redup" : ""}">${svgRentangMc(mc, f.tco)}</div><dl class="sp-stat-mc"><div><dt>P10</dt><dd>${rp(mc.low)}</dd></div><div><dt>P50</dt><dd>${rp(mc.mid)}</dd></div><div><dt>P90</dt><dd>${rp(mc.high)}</dd></div><div><dt>Deterministik</dt><dd>${rp(f.tco)}</dd></div></dl>${opsi.basi ? '<p class="ad-catat" role="status">Menghitung 800 sampel Monte Carlo. Nilai lama tampil redup sampai hasil baru datang.</p>' : ""}`
    : `<div class="sp-kerangka sp-kerangka-mc" aria-busy="true"></div><p class="ad-catat" role="status">Menghitung 800 sampel Monte Carlo.</p>`;
  const tabel = `<details class="sp-tabel-data"><summary>Lihat kepekaan sebagai tabel</summary><div><table class="ad-tabel"><caption class="sr">Kepekaan enam variabel utama</caption><thead><tr><th scope="col">Variabel</th><th scope="col">Nilai bawah</th><th scope="col">TCO bawah</th><th scope="col">Nilai atas</th><th scope="col">TCO atas</th><th scope="col">Vonis di sisi atas</th></tr></thead>
    <tbody>${kp.map(x => `<tr><td>${lolos(x.label)}</td><td class="n">${angkaP(x.lo.nilai)} ${lolos(x.unit)}</td><td class="n">${rp(x.lo.tco)}</td><td class="n">${angkaP(x.hi.nilai)} ${lolos(x.unit)}</td><td class="n">${rp(x.hi.tco)}</td><td>${pilVonis(x.hi.decision)}</td></tr>`).join("")}</tbody></table></div></details>`;
  return `<div class="sp-simulasi">${kartuEx("Monte Carlo", `TCO ${tampil(f.horizon)} tahun, rentang P10 sampai P90`, mcIsi, `Sumber: drawRiskMC mesin Studio, 800 sampel berbenih dari hash keadaan; ${pil("estimasi-model")}. Rentang asumsi, bukan distribusi biaya empiris. Mesin hanya mengembalikan tiga kuantil, jadi yang tampil pita P10 sampai P90, bukan histogram`)}
    ${kartuEx("Kepekaan", "Kepekaan TCO terhadap enam variabel utama", `<p class="sp-legenda"><i class="sp-sw rendah"></i>nilai bawah <i class="sp-sw tinggi"></i>nilai atas</p><div class="sp-grafik-isi">${svgTornado(kp)}</div>${tabel}`, `Sumber: ${SUMBER_MESIN}; tiap variabel dinaikkan dan diturunkan satu langkah sementara yang lain tetap; ${pil("estimasi-model")}`)}</div>`;
}
export function tabMatriksHtml(rows) {
  return `<div class="sp-boq-kepala"><h3 class="sp-sub-judul">Matriks 100 pilihan</h3><button type="button" class="ad-tombol" data-aksi="matriks">Matriks 100 opsi CSV</button></div>
    <div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-matriks"><caption class="sr">Dampak tiap pilihan terhadap status, CAPEX, dan TCO dibanding keadaan aktif</caption><thead><tr><th scope="col">Dimensi</th><th scope="col">Pilihan</th><th scope="col">Status</th><th scope="col">CAPEX</th><th scope="col">Selisih CAPEX</th><th scope="col">TCO</th><th scope="col">Selisih TCO</th><th scope="col">TDH</th><th scope="col">OPEX per tahun</th></tr></thead>
    <tbody>${rows.map(r => `<tr${r.aktif ? ' class="sp-aktif"' : ""}><td data-label="Dimensi">${lolos(r.dimensi)}</td><td data-label="Pilihan"><b>${lolos(r.pilihan)}</b>${r.aktif ? ' <span class="sp-yakin hipotesis sp-aktif-pil">aktif</span>' : ""}<small class="sp-sub">${lolos(r.plus)}; ${lolos(r.minus)}</small></td><td data-label="Status">${pilVonis(r.status)}</td><td class="n" data-label="CAPEX">${rp(r.capex)}</td><td class="n" data-label="Selisih CAPEX">${r.dCapex > 0 ? "+" : ""}${rp(r.dCapex)}</td><td class="n" data-label="TCO">${rp(r.tco)}</td><td class="n" data-label="Selisih TCO">${r.dTco > 0 ? "+" : ""}${rp(r.dTco)}</td><td class="n" data-label="TDH">${tampil(r.tdh)} m</td><td class="n" data-label="OPEX per tahun">${rp(r.opex)}</td></tr>`).join("")}</tbody></table></div>
    ${sumber(`${SUMBER_MESIN}; tiap baris mengganti satu pilihan dan menahan yang lain, ${pil("estimasi-model")}. Pilihan aktif bertanda dan selisihnya nol.`)}`;
}
export function tabBatasHtml() {
  const heli = globalThis.KarhutlaEngine?.HELI;
  return `<ol class="sp-batas">${BATAS_ALAT.map(p => `<li>${lolos(p)}</li>`).join("")}</ol>
    <div class="sp-heli-kartu"><h3 class="sp-sub-judul">Biaya helikopter per jam</h3><p class="sp-menunggu"><b>–</b>${pil("menunggu")}<small>Harga menunggu angka BNPB (slot sippa.heli.biaya_jam). Belum masuk TCO.</small></p>
    <p class="sp-bantu">Pembanding resmi: ${lolosTeks(heli ? heli.pembanding : "> Rp200 juta per sorti satu jam (BNPB, September 2023)")}. Ditampilkan berdampingan, tidak dicampur ke angka mesin.</p></div>
    ${sumber("batas.js (PRD §9.4.8), keputusan 34 dan 50, slot T-A")}`;
}

/* ---------- Monte Carlo: pekerja, dengan cadangan utas utama ---------- */
export function buatMc({Pekerja = globalThis.Worker, url = `/pipa/studio_pekerja.js?v=${VERSI_STUDIO}`, mesin: ambilMesin = mesin, tunda = f => nanti(f)} = {}) {
  let nomor = 0, w = null, tertunda = null;
  const api = {lambat: false, hitung, tutup};
  const lokal = (daftar, no) => new Promise(ok => tunda(() => {
    if (no !== nomor) return ok(null);
    const M = ambilMesin();
    ok(Object.fromEntries(daftar.map(d => [d.kode, M.drawRiskMC(d.state)])));
  }));
  const jatuh = () => {
    api.lambat = true;
    if (w) { try { w.terminate(); } catch { /* pekerja sudah mati */ } w = null; }
    if (tertunda) { const t = tertunda; tertunda = null; lokal(t.daftar, t.no).then(t.ok); }
  };
  try {
    if (typeof Pekerja !== "function") throw new Error("tanpa Web Worker");
    w = new Pekerja(url);
    w.onmessage = e => {
      const d = e.data;
      if (!tertunda || !d || d.id !== tertunda.no) return;   // jawaban untuk permintaan yang sudah diganti
      if (d.galat) return jatuh();
      const t = tertunda; tertunda = null;
      t.ok(Object.fromEntries(d.hasil.map(x => [x.kode, x.mc])));
    };
    w.onerror = jatuh;
  } catch { api.lambat = true; w = null; }
  function hitung(daftar) {
    const no = ++nomor;
    if (tertunda) { tertunda.ok(null); tertunda = null; }
    if (!w) return lokal(daftar, no);
    return new Promise(ok => { tertunda = {no, daftar, ok}; try { w.postMessage({id: no, daftar}); } catch { jatuh(); } });
  }
  function tutup() { if (w) { try { w.terminate(); } catch { /* sudah mati */ } w = null; } if (tertunda) { tertunda.ok(null); tertunda = null; } }
  return api;
}

/* ================= tampilan (DOM) ================= */
let ctrl = null, hentikan = [];
export function lepas() { ctrl?.abort(); ctrl = null; hentikan.forEach(f => f()); hentikan = []; tutupDialog(); }
const peranSaya = () => { const d = document.body?.dataset; return d && (d.mod === "1" || d.super === "1") ? "M" : d && d.tulis === "1" ? "W" : "B"; };
const buat = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };

function muatGaya() {
  const satu = (id, href) => new Promise(ok => {
    if (document.querySelector(`link[data-sp="${id}"]`)) return ok();
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.dataset.sp = id; l.onload = l.onerror = () => ok();
    document.head.append(l); setTimeout(ok, 1500);
  });
  return Promise.all([satu("hitung", "/pipa/layar_hitung.css?v=1"), satu("studio", `/pipa/layar_studio.css?v=${VERSI_STUDIO}`)]);
}
function muatMesin() {
  if (globalThis.KarhutlaEngine) return Promise.resolve();
  return new Promise((ok, gagal) => {
    const s = document.createElement("script");
    s.src = `/pipa/studio_mesin.js?v=${VERSI_STUDIO}`; s.onload = ok; s.onerror = () => gagal(new Error(pesanMesinGagal()));
    document.head.append(s);
  });
}
const unduh = (nama, teks, mime) => {
  const u = URL.createObjectURL(new Blob([teks], {type: mime})), a = document.createElement("a");
  a.href = u; a.download = nama; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
};

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranSaya(), boleh = bolehSkenario(peran, true);
  akar.replaceChildren(memuat());
  await muatGaya();
  if (sinyal.aborted) return;
  try { await muatMesin(); mesin(); }
  catch (e) { if (!sinyal.aborted) akar.replaceChildren(galat(0, e.message, () => pasang(akar, konteks))); return; }
  if (sinyal.aborted) return;

  const st = {state: stateAwal("S0"), preset: "S0", tab: "bandingkan", daftar: null, daftarGalat: null, tandai: [], cacheState: new Map(), kolom: [], hasil: null, cari: "", mcCache: new Map(), mcTerakhir: new Map(), memo: {}};
  const mc = buatMc();
  hentikan.push(() => mc.tutup());
  const ponsel = () => matchMedia("(max-width: 767px)").matches;

  akar.innerHTML = `<div class="sp-judul-baris"><h1 class="sp-judul">${JUDUL}</h1><div class="sp-aksi-judul"><button type="button" class="ad-tombol sp-hanya-hp" data-aksi="atur" aria-controls="st-kiri" aria-expanded="false">Atur skenario</button></div></div>
    <p class="ad-spanduk sp-pita-hp" role="note">${lolos(PITA_HP)}</p><p class="ad-spanduk sp-pita-lambat" role="status" ${mc.lambat ? "" : "hidden"}>${lolos(PITA_LAMBAT)}</p>
    <p class="sp-info-aksi" role="status" data-info></p><p class="sr" aria-live="polite" data-umum></p>
    <div class="sp-studio"><aside class="sp-studio-kiri" id="st-kiri" aria-label="Pengaturan skenario">
      <div class="sp-kiri-kepala"><div class="sp-kiri-baris"><span class="ad-ey" id="st-preset-l">Preset</span><button type="button" class="ad-tombol sp-hanya-hp" data-aksi="tutup-kiri">Selesai</button></div>
        <div class="ad-seg sp-preset" role="radiogroup" aria-labelledby="st-preset-l">${Object.keys(NAMA_PRESET).map(k => `<button type="button" role="radio" aria-checked="${String(k === st.preset)}" tabindex="${k === st.preset ? 0 : -1}" data-preset="${k}" title="${lolos(NAMA_PRESET[k])}">${k}</button>`).join("")}</div>
        <div class="sp-kiri-baris"><small class="sp-bantu" data-skema></small><button type="button" class="ad-tombol" data-aksi="atur-ulang">Atur ulang</button></div></div>
      <div class="sp-kiri-isi" data-kontrol></div>
      <section class="sp-pembanding" aria-labelledby="st-pb-j"><h3 class="sp-sub-judul" id="st-pb-j">Pembanding tersimpan</h3><div data-pembanding></div></section>
      <div class="sp-kiri-kaki"><button type="button" class="ad-tombol utama" data-aksi="simpan" ${boleh.aktif ? "" : "disabled"} title="${lolos(boleh.alasan)}">Simpan skenario</button>
        <button type="button" class="ad-tombol" data-aksi="impor">Impor JSON</button><button type="button" class="ad-tombol" data-aksi="ekspor">Ekspor JSON</button><button type="button" class="ad-tombol" data-aksi="boq">BOQ CSV</button>
        <button type="button" class="ad-tombol" data-aksi="cetak" disabled title="Templat laporan Skenario menyusul bersama laporan PDF">Cetak</button>
        ${boleh.aktif ? "" : `<small class="sp-bantu sp-kaki-alasan">${lolos(boleh.alasan)}</small>`}<input type="file" accept="application/json,.json" hidden data-berkas></div></aside>
      <section class="sp-studio-kanan" aria-label="Hasil"><div class="ad-tabs sp-tabs" role="tablist" aria-label="Hasil simulator">${TAB.map(([k, n]) => `<button type="button" role="tab" id="st-tab-${k}" data-tab="${k}" aria-selected="${String(k === st.tab)}" aria-controls="st-panel" tabindex="${k === st.tab ? 0 : -1}"${TAB_HP.includes(k) ? "" : ' class="sp-tab-laptop"'}>${lolos(n)}</button>`).join("")}</div>
        <div id="st-panel" class="sp-panel" role="tabpanel" aria-labelledby="st-tab-${st.tab}" tabindex="0"></div></section></div>`;

  const q = s => akar.querySelector(s), semua = s => [...akar.querySelectorAll(s)];
  const info = q("[data-info]"), umum = q("[data-umum]"), panel = q("#st-panel"), kontrol = q("[data-kontrol]");
  q("[data-skema]").textContent = ringkasSkema().teks;
  let jamInfo = 0;
  const kabari = t => { info.textContent = t; clearTimeout(jamInfo); jamInfo = setTimeout(() => { info.textContent = ""; }, 5000); };
  hentikan.push(() => clearTimeout(jamInfo));
  const kunciState = s => JSON.stringify(s);

  /* ----- sinkron kontrol dengan keadaan (sesudah preset, impor, atau aturan sebab-akibat) ----- */
  function sinkronKontrol(penuh) {
    if (penuh) kontrol.innerHTML = kontrolHtml(st.state);
    const s = st.state, m = s.manfaat || MANFAAT_BAWAAN;
    for (const e of semua("[data-dim]")) {
      const d = DEF_DIM.get(e.dataset.dim), v = nilaiDim(s, d.key), o = d.options.find(x => x.value === v) || d.options[0];
      const sel = e.querySelector("select"); if (sel) sel.value = v;
      e.querySelectorAll("[data-opsi]").forEach(b => { const on = b.dataset.opsi === v; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
      e.querySelector("[data-pm]").innerHTML = `<span class="sp-plus"><b>Kelebihan:</b> ${lolos(o.pro)}</span> <span class="sp-minus"><b>Kekurangan:</b> ${lolos(o.con)}</span>`;
    }
    for (const e of semua("[data-num]")) {
      const d = DEF_NUM.get(e.dataset.num), v = s[d.key], teks = nilaiTeks(d, v);
      e.querySelector("[type=range]").value = v; e.querySelector("[type=range]").setAttribute("aria-valuetext", teks);
      e.querySelector("[type=text]").value = desimal(v); e.querySelector("[data-nilai]").textContent = teks;
      e.querySelector(".sp-galat-isian").hidden = true; e.querySelector("[type=text]").removeAttribute("aria-invalid");
    }
    for (const i of semua("[data-sippa]")) if (s.sippa) i.value = s.sippa[i.dataset.sippa];
    semua("[data-man-aktif]").forEach(i => { i.checked = m[i.dataset.manAktif].aktif; });
    semua("[data-man-isi]").forEach(i => { const [a, b] = i.dataset.manIsi.split("."); i.value = desimal(m[a][b]); });
    semua("[data-man-syarat]").forEach(i => { i.checked = m.irigasi.syarat[Number(i.dataset.manSyarat)]; });
    semua("[data-preset]").forEach(b => { const on = b.dataset.preset === st.preset; b.setAttribute("aria-checked", String(on)); b.tabIndex = on || (!st.preset && b.dataset.preset === "S0") ? 0 : -1; });
  }

  /* ----- hitung dan gambar: sesudah frame tercat, hanya keadaan terakhir (peleburan) ----- */
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; segarkan(); }); };
  function segarkan() {
    if (sinyal.aborted) return;
    const lama = st.hasil?.decision;
    st.hasil = nilaiHasil(st.state);
    if (lama && lama !== st.hasil.decision) umum.textContent = `Vonis berubah menjadi ${st.hasil.decision}: ${st.hasil.hard[0] || st.hasil.conditional[0] || "tanpa hambatan"}`;
    gambarPanel(); mintaMc();
  }
  const tersimpanKolom = () => st.tandai.map(id => st.cacheState.get(id)).filter(Boolean);
  function gambarPanel() {
    if (sinyal.aborted) return;
    const h = st.hasil, k = st.tab;
    panel.setAttribute("aria-labelledby", `st-tab-${k}`);
    if (k === "bandingkan") {
      const kunci = kunciState(st.state) + st.tandai.join(",") + st.cacheState.size;
      if (st.kolomKunci !== kunci) { st.kolom = susunKolom(st.state, tersimpanKolom()); st.kolomKunci = kunci; }
      for (const c of st.kolom) c.mc = st.mcCache.get(kunciState(c.hasil.s)) || st.mcTerakhir.get(c.kode);
      panel.innerHTML = tabBandingkanHtml(barisMatriks(st.kolom), st.kolom);
      panel.classList.toggle("sp-menghitung", st.kolom.some(c => !st.mcCache.has(kunciState(c.hasil.s))));
    } else if (k === "ringkasan") panel.innerHTML = tabRingkasanHtml(h);
    else if (k === "hidraulika") panel.innerHTML = tabHidraulikaHtml(h);
    else if (k === "biaya") panel.innerHTML = tabBiayaHtml(h, st.cari);
    else if (k === "risiko") panel.innerHTML = tabRisikoHtml(h);
    else if (k === "simulasi") {
      const key = kunciState(st.state);
      if (st.memo.kp?.key !== key) st.memo.kp = {key, nilai: kepekaan(st.state)};
      const ada = st.mcCache.get(key);
      panel.innerHTML = tabSimulasiHtml(h, ada || st.mcTerakhir.get("kini") || null, st.memo.kp.nilai, {basi: !ada});
    } else if (k === "matriks") {
      const key = kunciState(st.state);
      if (st.memo.m100?.key !== key) st.memo.m100 = {key, nilai: matriks100(st.state)};
      panel.innerHTML = tabMatriksHtml(st.memo.m100.nilai);
    } else panel.innerHTML = tabBatasHtml();
  }
  function simpanMc(kode, state, hasilMc) { st.mcCache.set(kunciState(state), hasilMc); st.mcTerakhir.set(kode, hasilMc); if (st.mcCache.size > 60) st.mcCache.delete(st.mcCache.keys().next().value); }
  async function mintaMc() {
    let daftar = [];
    if (st.tab === "bandingkan") daftar = st.kolom.filter(c => !st.mcCache.has(kunciState(c.hasil.s))).map(c => ({kode: c.kode, state: c.hasil.s}));
    else if (st.tab === "simulasi" && !st.mcCache.has(kunciState(st.state))) daftar = [{kode: "kini", state: st.hasil.s}];
    if (!daftar.length) return;
    const tab = st.tab, r = await mc.hitung(daftar.slice(0, MAKS_TUKANG));
    if (!r || sinyal.aborted) return;
    daftar.forEach(d => { if (r[d.kode]) simpanMc(d.kode, d.state, r[d.kode]); });
    q(".sp-pita-lambat").hidden = !mc.lambat;
    if (tab === st.tab) gambarPanel();
  }

  /* ----- masukan: seketika di handler (gema, aria), hitung sesudah frame ----- */
  const setNilai = (k, v) => { st.state = ubahNilai(st.state, k, v); st.preset = null; };
  const tulisGalat = (e, pesan) => { const g = e.querySelector(".sp-galat-isian"), i = e.querySelector("[type=text]"); g.hidden = !pesan; g.textContent = pesan || ""; i.setAttribute("aria-invalid", String(!!pesan)); };
  kontrol.addEventListener("input", e => {
    const t = e.target, num = t.closest("[data-num]");
    if (num) {
      const d = DEF_NUM.get(num.dataset.num), slider = num.querySelector("[type=range]"), kotak = num.querySelector("[type=text]"), out = num.querySelector("[data-nilai]");
      let v;
      if (t === slider) { v = Number(slider.value); kotak.value = desimal(v); tulisGalat(num, ""); }
      else { const r = cekNumerik(d, kotak.value); tulisGalat(num, r.galat); if (r.galat) return; v = r.nilai; slider.value = v; }
      const teks = nilaiTeks(d, v); out.textContent = teks; slider.setAttribute("aria-valuetext", teks);
      setNilai(d.key, v); semua("[data-preset]").forEach(b => b.setAttribute("aria-checked", "false")); jadwalkan();
    } else if (t.dataset.sippa) {
      const v = Number(t.value); if (!Number.isFinite(v)) return;
      const lo = Number(t.min), hi = Number(t.max); if (v < lo || v > hi) return;
      st.state = {...st.state, sippa: {...st.state.sippa, [t.dataset.sippa]: v}}; st.preset = null; jadwalkan();
    } else if (t.dataset.manIsi) {
      const [a, b] = t.dataset.manIsi.split("."), v = angkaId(t.value);
      if (Number.isNaN(v) || v < 0) { t.setAttribute("aria-invalid", "true"); return; }
      t.removeAttribute("aria-invalid");
      const m = bersihkanManfaat({...(st.state.manfaat || MANFAAT_BAWAAN), [a]: {...(st.state.manfaat || MANFAAT_BAWAAN)[a], [b]: v}});
      st.state = {...st.state, manfaat: m}; jadwalkan();
    }
  }, {signal: sinyal});
  kontrol.addEventListener("change", e => {
    const t = e.target;
    if (t.matches("select") && t.closest("[data-dim]")) { setNilai(t.closest("[data-dim]").dataset.dim, t.value); semua("[data-preset]").forEach(b => b.setAttribute("aria-checked", "false")); nanti(() => { sinkronKontrol(); jadwalkan(); }); }
    else if (t.dataset.manAktif) { st.state = {...st.state, manfaat: bersihkanManfaat({...(st.state.manfaat || MANFAAT_BAWAAN), [t.dataset.manAktif]: {...(st.state.manfaat || MANFAAT_BAWAAN)[t.dataset.manAktif], aktif: t.checked}})}; jadwalkan(); }
    else if (t.dataset.manSyarat !== undefined) {
      const m = st.state.manfaat || MANFAAT_BAWAAN, s = [...m.irigasi.syarat]; s[Number(t.dataset.manSyarat)] = t.checked;
      st.state = {...st.state, manfaat: bersihkanManfaat({...m, irigasi: {...m.irigasi, syarat: s}})}; jadwalkan();
    }
  }, {signal: sinyal});
  const pilihOpsi = b => {
    const e = b.closest("[data-dim]"), grup = b.parentElement;
    grup.querySelectorAll("button").forEach(x => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; });
    setNilai(e.dataset.dim, b.dataset.opsi); semua("[data-preset]").forEach(x => x.setAttribute("aria-checked", "false"));
    nanti(() => { sinkronKontrol(); jadwalkan(); });
  };
  kontrol.addEventListener("click", e => { const b = e.target.closest("[data-opsi]"); if (b && b.getAttribute("aria-checked") !== "true") pilihOpsi(b); }, {signal: sinyal});
  const panah = (e, selektor, aksi) => {
    const b = e.target.closest(selektor);
    if (!b || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const bs = [...b.parentElement.querySelectorAll(selektor)], i = bs.indexOf(b), n = bs[(i + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length];
    e.preventDefault(); n.focus(); aksi(n);
  };
  kontrol.addEventListener("keydown", e => panah(e, "[data-opsi]", pilihOpsi), {signal: sinyal});

  /* ----- preset ----- */
  const pilihPreset = b => {
    const k = b.dataset.preset;
    semua("[data-preset]").forEach(x => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.tabIndex = on ? 0 : -1; });
    st.preset = k;
    nanti(() => { st.state = {...stateAwal(k), ...(st.state.manfaat ? {manfaat: st.state.manfaat} : {})}; sinkronKontrol(true); segarkan(); kabari(`Preset ${k}, ${NAMA_PRESET[k]}, dimuat. Isian lain kembali ke nilai preset.`); });
  };
  q(".sp-preset").addEventListener("click", e => { const b = e.target.closest("[data-preset]"); if (b && b.getAttribute("aria-checked") !== "true") pilihPreset(b); }, {signal: sinyal});
  q(".sp-preset").addEventListener("keydown", e => panah(e, "[data-preset]", pilihPreset), {signal: sinyal});

  /* ----- tab ----- */
  const pilihTab = (k, fokus) => {
    if (k === st.tab) return;
    st.tab = k; semua("[role=tab]").forEach(t => { const on = t.dataset.tab === k; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && fokus) t.focus(); });
    panel.setAttribute("aria-labelledby", `st-tab-${k}`);
    nanti(() => { gambarPanel(); mintaMc(); });
  };
  const urutTab = () => TAB.map(([k]) => k).filter(k => !ponsel() || TAB_HP.includes(k));
  q(".sp-tabs").addEventListener("click", e => { const t = e.target.closest("[data-tab]"); if (t) pilihTab(t.dataset.tab, false); }, {signal: sinyal});
  q(".sp-tabs").addEventListener("keydown", e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const t = e.target.closest("[role=tab]"); if (!t) return;
    const u = urutTab(), i = u.indexOf(t.dataset.tab); e.preventDefault(); pilihTab(u[(i + (e.key === "ArrowRight" ? 1 : u.length - 1)) % u.length], true);
  }, {signal: sinyal});
  const jagaTabHp = () => { if (ponsel() && !TAB_HP.includes(st.tab)) pilihTab("bandingkan", false); };
  addEventListener("resize", jagaTabHp, {signal: sinyal}); jagaTabHp();

  /* ----- kotak cari BOQ: gema seketika, saring sesudah jeda 150 ms lewat nanti ----- */
  let jamCari = 0;
  panel.addEventListener("input", e => {
    if (e.target.id !== "st-cari") return;
    st.cari = e.target.value; clearTimeout(jamCari);
    jamCari = setTimeout(() => nanti(() => { const h = q("#st-boq"); if (h && st.tab === "biaya") h.innerHTML = tabelBoqHtml(st.hasil, st.cari); }), 150);
  }, {signal: sinyal});
  hentikan.push(() => clearTimeout(jamCari));

  /* ----- konfirmasi dan dialog ----- */
  function konfirmasi(judul, isi, tombol, lakukan) {
    const f = buat("div", "sp-form"), p = buat("p", "", isi), baris = buat("div", "sp-aksi"), batal = buat("button", "ad-tombol", "Batal"), ya = buat("button", "ad-tombol bahaya", tombol);
    batal.type = ya.type = "button"; baris.append(batal, ya); f.append(p, baris);
    const d = bukaDialog(judul, f);
    batal.addEventListener("click", () => d.close()); ya.addEventListener("click", () => { d.close(); lakukan(); });
  }

  /* ----- skenario tersimpan ----- */
  const slotPb = q("[data-pembanding]");
  function gambarPembanding() {
    if (sinyal.aborted) return;
    if (st.daftarGalat) { slotPb.replaceChildren(galat(st.daftarGalat.status ?? 0, st.daftarGalat.message, muatDaftar)); return; }
    if (!st.daftar) { slotPb.replaceChildren(memuat()); return; }
    if (!st.daftar.length) { slotPb.replaceChildren(kosong("Belum ada skenario tersimpan. Simpan keadaan ini supaya bisa dibandingkan di tab Bandingkan semua.")); return; }
    const penuh = st.tandai.length >= MAKS_PEMBANDING;
    slotPb.innerHTML = `<ul class="sp-pembanding-daftar">${/* aman: x.id dan x.ringkas hanya dibaca untuk logika, semua teks ke HTML lewat lolos */ st.daftar.map(x => {
      const on = st.tandai.includes(x.id), v = x.ringkas?.vonis;
      return `<li><label class="sp-sakelar sp-pb-isi"><input type="checkbox" data-tersimpan="${lolos(x.id)}"${on ? " checked" : ""}${!on && penuh ? " disabled" : ""}><span>${lolos(x.nama)}${v && VONIS[v] ? ` ${pilVonis(v)}` : ""}<small class="sp-bantu">${lolos(waktu(x.waktu))}${x.dummy ? ", data contoh" : ""}</small></span></label>
        <span class="sp-pb-aksi"><button type="button" class="ad-tombol" data-muat="${lolos(x.id)}" aria-label="Muat skenario ${lolos(x.nama)} ke penyunting">Muat</button>${boleh.aktif ? `<button type="button" class="ad-tombol bahaya" data-hapus="${lolos(x.id)}" aria-label="Hapus skenario ${lolos(x.nama)}">Hapus</button>` : ""}</span></li>`;
    }).join("")}</ul>${penuh ? `<p class="sp-bantu">Paling banyak ${MAKS_PEMBANDING} skenario tersimpan dibandingkan sekaligus.</p>` : ""}`;
  }
  async function muatDaftar() {
    st.daftarGalat = null; st.daftar = null; gambarPembanding();
    try { st.daftar = (await konteks.ambil("/api/sippa/skenario", sinyal)).skenario || []; }
    catch (e) { if (e.name === "AbortError" || sinyal.aborted) return; st.daftarGalat = e; }
    st.tandai = st.tandai.filter(id => st.daftar?.some(x => x.id === id));
    gambarPembanding();
  }
  async function ambilState(id) {
    if (st.cacheState.has(id)) return st.cacheState.get(id);
    const d = (await konteks.ambil(`/api/sippa/skenario?id=${encodeURIComponent(id)}`, sinyal)).skenario?.[0];
    if (!d) throw new Error("Skenario tidak ada lagi.");
    const x = {id, nama: d.nama, state: d.state}; st.cacheState.set(id, x); return x;
  }
  slotPb.addEventListener("change", async e => {
    const c = e.target.closest("[data-tersimpan]"); if (!c) return;
    const id = c.dataset.tersimpan;
    if (!c.checked) { st.tandai = st.tandai.filter(x => x !== id); nanti(gambarPembanding); jadwalkan(); return; }
    if (st.tandai.length >= MAKS_PEMBANDING) { c.checked = false; return; }
    st.tandai.push(id); c.disabled = true;
    try { await ambilState(id); } catch (err) { if (sinyal.aborted || err.name === "AbortError") return; st.tandai = st.tandai.filter(x => x !== id); kabari(`Skenario tidak bisa dimuat: ${err.message}`); }
    nanti(gambarPembanding); jadwalkan();
  }, {signal: sinyal});
  slotPb.addEventListener("click", async e => {
    const m = e.target.closest("[data-muat]"), h = e.target.closest("[data-hapus]");
    if (m) {
      m.disabled = true; m.textContent = "Memuat";
      try { const x = await ambilState(m.dataset.muat); st.state = bersihkan(x.state); st.preset = null; sinkronKontrol(true); jadwalkan(); kabari(`Skenario ${x.nama} dimuat ke penyunting.`); }
      catch (err) { if (!sinyal.aborted && err.name !== "AbortError") kabari(`Skenario tidak bisa dimuat: ${err.message}`); }
      finally { m.disabled = false; m.textContent = "Muat"; }
    } else if (h) {
      const x = st.daftar.find(z => z.id === h.dataset.hapus);
      konfirmasi(`Hapus skenario ${x.nama}?`, "Skenario tidak tampil lagi di pembanding. Pembuat atau moderator yang boleh menghapus.", "Hapus skenario", async () => {
        try { await kirimPost(jalurApi("skenario-hapus", x.id), {}); st.tandai = st.tandai.filter(i => i !== x.id); kabari(`Skenario ${x.nama} dihapus.`); await muatDaftar(); jadwalkan(); }
        catch (err) { kabari(err.message); }
      });
    }
  }, {signal: sinyal});

  /* ----- aksi: atur (lembar HP), simpan, impor, ekspor, CSV, atur ulang, rincian ----- */
  const studio = q(".sp-studio"), tombolAtur = q('[data-aksi="atur"]');
  const lembar = buka => { studio.classList.toggle("buka", buka); tombolAtur.setAttribute("aria-expanded", String(buka)); if (buka) q(".sp-kiri-kepala .sp-preset [aria-checked=true], .sp-kiri-kepala .sp-preset button")?.focus(); else tombolAtur.focus(); };
  document.addEventListener("keydown", e => { if (e.key === "Escape" && studio.classList.contains("buka")) lembar(false); }, {signal: sinyal});
  function dialogSimpan() {
    const f = buat("form", "sp-form"); f.noValidate = true;
    f.innerHTML = `<label>Nama skenario<input name="nama" maxlength="80" autocomplete="off" required aria-describedby="st-nama-b st-nama-g"></label><small class="sp-bantu" id="st-nama-b">3 sampai 80 huruf. Yang disimpan: semua isian, manfaat, dan ringkasan vonis (${lolos(st.hasil.decision)}).</small><small class="sp-galat-isian" id="st-nama-g" hidden></small><div class="sp-aksi"><button type="button" class="ad-tombol" data-batal>Batal</button><button type="submit" class="ad-tombol utama">Simpan skenario</button></div>`;
    const d = bukaDialog("Simpan skenario", f), g = f.querySelector("#st-nama-g"), kirim = f.querySelector("[type=submit]");
    f.querySelector("[data-batal]").addEventListener("click", () => d.close());
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      const r = cekNama(f.nama.value); g.hidden = !r.galat; g.textContent = r.galat || ""; if (r.galat) { f.nama.setAttribute("aria-invalid", "true"); f.nama.focus(); return; }
      const badan = badanSimpan(r.nama, st.state, st.hasil);
      if (new TextEncoder().encode(JSON.stringify(badan.state)).length > MAKS_BYTE) { g.hidden = false; g.textContent = "Keadaan melebihi 32 KB dan tidak bisa disimpan. Kurangi item tambahan kit."; return; }
      kirim.disabled = true; kirim.textContent = "Menyimpan";
      try {
        const j = await kirimPost("/api/sippa/skenario", badan);
        d.close(); st.cacheState.set(j.id, {id: j.id, nama: r.nama, state: badan.state}); kabari(`Skenario ${r.nama} tersimpan.`);
        await muatDaftar();
        if (st.daftar?.some(x => x.id === j.id) && st.tandai.length < MAKS_PEMBANDING) { st.tandai.push(j.id); gambarPembanding(); jadwalkan(); }
      } catch (err) { kirim.disabled = false; kirim.textContent = "Simpan skenario"; g.hidden = false; g.textContent = err.message; }
    });
  }
  const berkas = q("[data-berkas]");
  berkas.addEventListener("change", async () => {
    const f = berkas.files[0]; berkas.value = ""; if (!f) return;
    if (f.size > MAKS_BYTE) { kabari(`Berkas ${tampil(Math.round(f.size / 1024))} KB melewati batas 32 KB. Impor berkas ekspor Studio.`); return; }
    const r = impor(await f.text());
    if (r.galat) { kabari(r.galat); return; }
    st.state = r.state; st.preset = null; sinkronKontrol(true); jadwalkan(); kabari(`Keadaan diimpor dari ${f.name}. Hasil dihitung ulang.`);
  }, {signal: sinyal});
  akar.addEventListener("click", e => {
    const b = e.target.closest("[data-aksi],[data-rincian]");
    if (!b || b.disabled) return;
    if (b.dataset.rincian) {
      const i = st.kolom.findIndex(c => c.kode === b.dataset.rincian); if (i < 0) return;
      const w = buat("div", "sp-rincian-wadah"); w.innerHTML = rincianKolomHtml(barisMatriks(st.kolom), st.kolom, i); bukaDialog(`Rincian ${st.kolom[i].kode}, ${st.kolom[i].nama}`, w); return;
    }
    const a = b.dataset.aksi;
    if (a === "atur") lembar(true);
    else if (a === "tutup-kiri") lembar(false);
    else if (a === "simpan") dialogSimpan();
    else if (a === "impor") berkas.click();
    else if (a === "ekspor") { unduh("studio-skenario.json", JSON.stringify(ekspor(st.state, st.hasil), null, 2), "application/json"); kabari("Keadaan diekspor sebagai studio-skenario.json."); }
    else if (a === "boq") { unduh("boq-studio.csv", boqCsv(st.hasil), "text/csv;charset=utf-8"); kabari("BOQ diunduh sebagai boq-studio.csv."); }
    else if (a === "matriks") nanti(() => { unduh("matriks-100-pilihan.csv", matriksCsv(st.memo.m100?.nilai || matriks100(st.state)), "text/csv;charset=utf-8"); kabari("Matriks 100 pilihan diunduh."); });
    else if (a === "atur-ulang") konfirmasi("Atur ulang semua pilihan?", "Semua isian kembali ke contoh Kalimantan Tengah (S0, kit SIPPA relay) dan manfaat kembali 0.", "Atur ulang", () => { st.state = stateAwal("S0"); st.preset = "S0"; sinkronKontrol(true); segarkan(); kabari("Semua isian diatur ulang ke preset S0."); });
  }, {signal: sinyal});

  /* ----- vonis dan kontrol menempel di bawah bilah konteks ----- */
  const ukurAtas = () => { const b = document.querySelector(".sp-konteks"); akar.style.setProperty("--sp-atas", `calc(var(--top) + ${b ? b.offsetHeight : 0}px)`); };
  ukurAtas(); addEventListener("resize", ukurAtas, {signal: sinyal});

  sinkronKontrol(true);
  st.hasil = nilaiHasil(st.state);
  gambarPanel(); mintaMc();
  muatDaftar();
}
