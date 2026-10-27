/* SIPPA: rincian aset /pipa/aset/:id (PRD §9.4.12, DS §4.18, keputusan 56, SP-095) dan bahan bersama layar Air tanah dan Akses (layar_air.js, layar_akses.js).
   Kontrak router: pasang(akar, konteks) dan lepas(). Logika murni (label, tanggal id-ID, validasi form aset, pil mutu air, lini masa, kartu angka) di atas dan diuji tanpa DOM;
   DOM dan jaringan di bawah. Validasi atribut per kelas dan jadwal dari pelihara.js (satu-satunya tempat aturan Q10 dan interval). Tanpa toFixed; semua teks data lewat esc.
   Butuh global public/inti: fmt, esc, jamWIB, nanti. */
import {KELAS, KELAS_ASET, jadwal, cekAset} from "./pelihara.js";
import {peranKlien, kirimPost, bukaDialog, tutupDialog} from "./layar_kit.js";
import {cekInspeksiStaf, badanInspeksi, formInspeksiHtml, SKOR_KATA, TEKS_STATUS as TEKS_JADWAL} from "./layar_pelihara.js";
import {memuat, galat} from "./keadaan.js";
import {tanggalHtml, pasangTanggal} from "./tanggal.js";

const HARI = 864e5;
export const ID16 = /^[0-9a-f]{16}$/;
export const SUMBER_ASET = [["bnpb_dsp", "BNPB (DSP)"], ["bpbd", "BPBD"], ["pu_bina_marga", "Kementerian PU, Bina Marga"], ["pu_cipta_karya", "Kementerian PU, Cipta Karya"], ["pu_sda", "Kementerian PU, SDA"],
  ["badan_geologi", "Badan Geologi"], ["tniad", "TNI AD"], ["polri", "Polri"], ["pemda", "Pemerintah daerah"], ["desa", "Pemerintah desa"], ["pdam", "PDAM"], ["lain", "Lainnya"]];
export const KEYAKINAN_ASET = ["resmi", "terverifikasi", "asumsi-kebijakan"];
export const STATUS_ASET = [["rencana", "Rencana"], ["berfungsi", "Berfungsi"], ["rusak", "Rusak"], ["diserahkan", "Diserahkan"], ["diganti_permanen", "Diganti permanen"], ["nonaktif", "Nonaktif"]];
export const ZONA_KONSERVASI = [["belum", "Belum ditetapkan", "titik"], ["aman", "Aman", "polos"], ["rawan", "Rawan", "garis"], ["kritis", "Kritis", "silang"], ["rusak", "Rusak", "padat"]];
export const NAMA_KELAS_ASET = {sumur_bor: "Sumur bor", pompa_sumur: "Pompa sumur", pipa_sementara: "Pipa sementara", tandon_hidran: "Tandon dan hidran", pipa_koridor: "Pipa koridor", jembatan_darurat: "Jembatan darurat", jembatan_permanen: "Jembatan permanen"};
export const TEKS_STATUS_ASET = Object.fromEntries(STATUS_ASET), TEKS_SUMBER = Object.fromEntries(SUMBER_ASET), TEKS_ZONA = Object.fromEntries(ZONA_KONSERVASI.map(([k, n]) => [k, n]));
export const JENIS_DARURAT = [["bailey", "Bailey"], ["rangka_baja", "Rangka baja"], ["lain", "Lainnya"]];
export const TEKS_INSPEKSI = {pra_gelar: "Pra-gelar", pasca_gelar: "Pasca-gelar", berkala: "Berkala", pra_musim: "Pra-musim", tahunan: "Tahunan", pasca_bencana: "Pasca-bencana", servis: "Servis", uji_tekanan: "Uji tekanan", mutu_air: "Uji mutu air", serah_terima: "Serah terima"};

export const ada = v => v != null && String(v).trim() !== "";
const angka = v => ada(v) ? Number(String(v).trim().replace(",", ".")) : NaN;
export const tglId = ms => ms == null || !Number.isFinite(ms) ? "–" : new Date(ms).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"});
/* tanggal tanpa jam ("2026-08-13") dibaca sebagai tanggal kalender, tanpa geser zona; nilai bukan tanggal = strip */
export const tglKalender = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? "")); if (!m) return "–"; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "short", year: "numeric"}); };
/* koordinat derajat desimal: empat angka di belakang koma (sekitar 10 m); fmt() membulatkan ke satu desimal dan tidak cocok untuk lintang dan bujur */
export const koord = v => typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("id-ID", {maximumFractionDigits: 4}) : "–";
export const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(tglId(ms))}</time>`;
export const pilYakin = (teks, kelas, judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
export const td = (label, isi, kelas = "") => `<td${kelas ? ` class="${kelas}"` : ""} data-label="${label}">${isi}</td>`;
export const namaProv = k => (typeof Wilayah !== "undefined" && Wilayah.PROV?.[k]) || (k == null ? "–" : String(k));

/* ---------- mutu air: kata, bukan warna saja. E. coli 0 = lolos uji itu saja (bukan klaim layak minum menyeluruh); lebih dari 0 = tidak laik minum ---------- */
export function statusMutu(m) {
  if (!m || m.e_coli_cfu == null) return {kelas: "belum", teks: "belum diuji mutu"};
  return m.e_coli_cfu === 0 ? {kelas: "lolos", teks: "lolos uji E. coli"} : {kelas: "gagal", teks: "tidak laik minum"};
}
export const pilMutuHtml = m => { const s = statusMutu(m); return `<span class="sp-mutu ${s.kelas}">${esc(s.teks)}</span>`; };

/* ---------- jadwal dan kartu angka rincian ---------- */
export function jadwalAset(aset, inspeksi, kini) {
  const kelas = KELAS_ASET[aset.kelas]; if (!kelas) return {terakhir: null, skor: null, jatuh_tempo: null, status: "belum_pernah", hariSejak: null};
  const t = (inspeksi || []).reduce((a, i) => !a || i.waktu > a.waktu ? i : a, null), j = jadwal({kelas}, t?.waktu ?? null, null, kini);
  return {terakhir: t?.waktu ?? null, skor: t?.skor ?? null, jatuh_tempo: j.jatuh_tempo, status: j.status, hariSejak: t ? Math.floor((kini - t.waktu) / HARI) : null};
}
export function kartuAngkaHtml(j) {
  const sel = (label, isi, sub = "") => `<div class="sp-angka"><span class="sp-angka-k">${esc(label)}</span><b class="num">${isi}</b>${sub ? `<small>${esc(sub)}</small>` : ""}</div>`;
  return `<div class="sp-angka-baris">${sel("Skor terakhir", j.skor == null ? "–" : esc(fmt(j.skor)), j.skor == null ? "belum ada inspeksi" : SKOR_KATA[j.skor] ?? "")}`
    + `${sel("Hari sejak inspeksi", j.hariSejak == null ? "–" : esc(fmt(j.hariSejak)))}${sel("Jatuh tempo", j.jatuh_tempo == null ? "–" : esc(tglId(j.jatuh_tempo)), TEKS_JADWAL[j.status] ?? "")}</div>`;
}
export function kepalaAsetHtml(a) {
  const lokasi = [a.kab, namaProv(a.prov)].filter(x => x && x !== "–").join(", ");
  return `<header class="sp-aset-kepala"><h1 class="sp-judul"><span class="sp-kit-kode">${esc(a.kode)}</span> ${esc(a.nama)}</h1><div class="sp-pil-baris"><span class="sp-status ${esc(a.status)}">${esc(TEKS_STATUS_ASET[a.status] ?? a.status)}</span>`
    + `${pilYakin(a.keyakinan ?? "asumsi-kebijakan", a.keyakinan ?? "asumsi-kebijakan")}</div>`
    + `<p class="ad-catat">${esc(NAMA_KELAS_ASET[a.kelas] ?? a.kelas)} (kelas ${esc(KELAS_ASET[a.kelas] ?? "–")}). ${esc(lokasi || "Lokasi belum dicatat")}. Pemilik aset: ${esc(a.pemilik_aset)}. Pemelihara: ${esc(a.pemelihara ?? KELAS[KELAS_ASET[a.kelas]]?.pemelihara_t1 ?? "–")}. Sumber: ${esc(TEKS_SUMBER[a.sumber] ?? a.sumber)}${a.rujukan ? `, rujukan ${esc(a.rujukan)}` : ""}.</p></header>`;
}

/* ---------- lini masa tambah-saja (DS §3.13) ---------- */
function hasilTeks(i) {
  const h = i.hasil && typeof i.hasil === "object" ? i.hasil : {}, b = [];
  if (h.e_coli_cfu != null) b.push(`E. coli ${fmt(h.e_coli_cfu)} CFU per 100 ml`);
  if (h.tekanan_bar != null) b.push(`tekanan ${fmt(h.tekanan_bar)} bar`);
  return b.join(", ");
}
export function liniMasaHtml(inspeksi, jenis = null) {
  const daftar = (inspeksi || []).filter(i => jenis == null || i.jenis === jenis).sort((a, b) => b.waktu - a.waktu);
  if (!daftar.length) return `<p class="ad-kosong">${jenis === "mutu_air" ? "Belum ada uji mutu air tercatat." : jenis === "serah_terima" ? "Belum ada serah terima tercatat." : "Belum ada inspeksi tercatat."}</p>`;
  return `<ol class="sp-lini">${daftar.map(i => `<li><span class="sp-lini-titik" aria-hidden="true"></span><div><b>${esc(TEKS_INSPEKSI[i.jenis] ?? i.jenis)}</b> ${waktuTag(i.waktu)}`
    + `<span class="sp-sub">Skor ${esc(fmt(i.skor))}, ${esc(SKOR_KATA[i.skor] ?? "")}${hasilTeks(i) ? `; ${esc(hasilTeks(i))}` : ""}${i.jenis === "mutu_air" ? ` ${pilMutuHtml({e_coli_cfu: i.hasil?.e_coli_cfu ?? null})}` : ""}</span>`
    + `${i.temuan ? `<span class="sp-sub">${esc(i.temuan)}</span>` : ""}</div></li>`).join("")}</ol>`;
}
export function petaKecilHtml(a) {
  const ada_ = typeof a.lat === "number" && typeof a.lon === "number";
  return ada_ ? `<p>Koordinat ${esc(koord(a.lat))}, ${esc(koord(a.lon))} (derajat desimal).</p><p class="ad-catat">Peta dasar tidak dimuat di layar ini; buka koordinat di peta luar bila perlu.</p><a class="ad-tombol" rel="noopener noreferrer" target="_blank" href="https://www.openstreetmap.org/?mlat=${esc(a.lat)}&amp;mlon=${esc(a.lon)}#map=14/${esc(a.lat)}/${esc(a.lon)}">Buka di OpenStreetMap</a>`
    : `<p class="ad-kosong">Koordinat belum dicatat untuk aset ini.</p>`;
}
export const TAB_ASET = [["inspeksi", "Inspeksi"], ["mutu", "Mutu air"], ["serah", "Serah terima"], ["peta", "Peta"]];
export const tabUntuk = a => TAB_ASET.filter(([k]) => k !== "mutu" || a.kelas === "sumur_bor");
export function isiTab(k, a, inspeksi) {
  if (k === "mutu") return liniMasaHtml(inspeksi, "mutu_air");
  if (k === "serah") return liniMasaHtml(inspeksi, "serah_terima") + (a.atribut?.serah_terima ? `<p>Serah terima: ${esc(a.atribut.serah_terima)}${a.atribut.pengelola ? `, pengelola ${esc(a.atribut.pengelola)}` : ""}.</p>` : "");
  if (k === "peta") return petaKecilHtml(a);
  return liniMasaHtml(inspeksi);
}

/* ================= form aset (Catat sumur, Catat jembatan, Ubah status, Catat uji mutu) ================= */
const opsi = (daftar, pilih = "") => daftar.map(([k, n]) => `<option value="${esc(k)}"${k === pilih ? " selected" : ""}>${esc(n)}</option>`).join("");
const lab = (teks, isi, kunci) => `<label>${esc(teks)} ${isi}<span class="sp-galat-medan" id="g-${kunci}" role="alert"></span></label>`;
const masuk = (nama, atribut = "") => `<input name="${nama}" autocomplete="off" aria-describedby="g-${nama}" ${atribut}>`;
const bagianDasar = () => lab("Nama", masuk("nama", 'maxlength="120"'), "nama") + lab("Pemilik aset", masuk("pemilik_aset", 'maxlength="120"'), "pemilik_aset")
  + lab("Sumber data", `<select name="sumber" aria-describedby="g-sumber">${opsi(SUMBER_ASET, "lain")}</select>`, "sumber") + lab("Keyakinan", `<select name="keyakinan">${opsi(KEYAKINAN_ASET.map(k => [k, k]), "terverifikasi")}</select>`, "keyakinan")
  + lab("Kabupaten atau kota", masuk("kab", 'maxlength="60"'), "kab") + lab("Rujukan sumber (nomor surat atau tautan)", masuk("rujukan", 'maxlength="300"'), "rujukan");
export function formSumurHtml() {
  return `<form class="sp-form sp-form-aset" novalidate>${bagianDasar()}${lab("Kejadian bencana", masuk("kejadian", 'maxlength="120"'), "kejadian")}`
    + lab("Kedalaman, m", masuk("kedalaman_m", 'inputmode="decimal"'), "kedalaman_m") + lab("Debit, L per detik", masuk("debit_lps", 'inputmode="decimal"'), "debit_lps")
    + lab("Kode CAT", masuk("cat_kode", 'maxlength="120"'), "cat_kode") + lab("Zona konservasi", `<select name="zona_konservasi" aria-describedby="g-zona_konservasi">${opsi(ZONA_KONSERVASI.map(([k, n]) => [k, n]), "belum")}</select>`, "zona_konservasi")
    + `<label data-g="rekomendasi_bg" hidden>Nomor rekomendasi teknis Badan Geologi <span class="sp-wajib">wajib di zona kritis atau rusak</span>${masuk("rekomendasi_bg", 'maxlength="120"')}<span class="sp-galat-medan" id="g-rekomendasi_bg" role="alert"></span></label>`
    + lab("Pengelola", masuk("pengelola", 'maxlength="120"'), "pengelola") + lab("Latitude", masuk("lat", 'inputmode="decimal"'), "lat") + lab("Longitude", masuk("lon", 'inputmode="decimal"'), "lon")
    + `<div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan sumur</button></div></form>`;
}
export function formJembatanHtml() {
  return `<form class="sp-form sp-form-aset" novalidate>${lab("Kelas", `<select name="kelas">${opsi([["jembatan_darurat", "Jembatan darurat"], ["jembatan_permanen", "Jembatan permanen dipantau"]], "jembatan_darurat")}</select>`, "kelas")}${bagianDasar()}`
    + `<label data-g="darurat">Jenis darurat<select name="jenis_darurat">${opsi(JENIS_DARURAT)}</select></label><label data-g="permanen" hidden>Jenis konstruksi${masuk("jenis_permanen", 'maxlength="120"')}<span class="sp-galat-medan" id="g-jenis_permanen" role="alert"></span></label>`
    + lab("Bentang, m", masuk("bentang_m", 'inputmode="decimal"'), "bentang_m") + `<label data-g="darurat">Beban rencana, ton${masuk("beban_ton", 'inputmode="decimal"')}<span class="sp-galat-medan" id="g-beban_ton" role="alert"></span></label>`
    + lab("Program", masuk("program", 'maxlength="120"'), "program") + `<label data-g="darurat">Rencana ganti permanen${tanggalHtml({nama: "rencana_ganti", label: "Rencana ganti permanen", atribut: 'aria-describedby="g-rencana_ganti"'})}<span class="sp-galat-medan" id="g-rencana_ganti" role="alert"></span></label>`
    + `<div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan jembatan</button></div></form>`;
}
export function formMutuHtml(sumur) {
  const skor = SKOR_KATA.map((k, i) => `<label class="sp-skor-pil"><input type="radio" name="skor" value="${i}"><span>${esc(k)}</span></label>`).join("");
  return `<form class="sp-form sp-form-aset" novalidate><label>Sumur <select name="sasaran_id">${sumur.map(s => `<option value="${esc(s.id)}">${esc(s.kode)} ${esc(s.nama)}</option>`).join("")}</select></label>`
    + `<fieldset class="sp-skor"><legend>Kondisi sumur saat diuji</legend><div class="sp-skor-baris" role="radiogroup" aria-label="Kondisi">${skor}</div></fieldset>`
    + `<label>E. coli, CFU per 100 ml <input name="e_coli_cfu" inputmode="decimal" autocomplete="off"></label><label>Temuan <textarea name="temuan" rows="3" maxlength="1000"></textarea></label>`
    + `<div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan uji mutu</button></div></form>`;
}
export function formStatusHtml(a) {
  return `<form class="sp-form sp-form-aset" novalidate><label>Status <select name="status">${opsi(STATUS_ASET, a.status)}</select></label><label>Pemelihara <input name="pemelihara" maxlength="120" autocomplete="off" value="${esc(a.pemelihara ?? "")}"></label>`
    + `<label>Rujukan sumber <input name="rujukan" maxlength="300" autocomplete="off" value="${esc(a.rujukan ?? "")}"></label><div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama sp-besar">Simpan perubahan</button></div></form>`;
}

const tolak = (g, medan, alasan) => g.push({medan, alasan});
const teksPanjang = (g, medan, v, min, maks, nama, wajib) => { const t = String(v ?? "").trim(); if (!t) { if (wajib) tolak(g, medan, `${nama} wajib diisi. Isi lalu simpan lagi.`); return; } if (t.length < min || t.length > maks) tolak(g, medan, `${nama} harus ${fmt(min)} sampai ${fmt(maks)} huruf. Perbaiki lalu simpan lagi.`); };
const LABEL_MEDAN = {kedalaman_m: "Kedalaman", debit_lps: "Debit", cat_kode: "Kode CAT", zona_konservasi: "Zona konservasi", rekomendasi_bg: "Nomor rekomendasi teknis Badan Geologi", pengelola: "Pengelola", jenis: "Jenis", bentang_m: "Bentang", beban_ton: "Beban rencana", program: "Program"};
const kapital = t => t.charAt(0).toUpperCase() + t.slice(1);
/* dari isian ke objek atribut per kelas; hanya medan terisi masuk (cekAset menolak medan wajib yang kosong); isian bukan angka tetap string supaya cekAset menolaknya */
export function atributDari(kelas, f) {
  const a = {}, t = k => ada(f[k]) ? String(f[k]).trim() : undefined;
  const num = k => { if (!ada(f[k])) return; const n = angka(f[k]); a[k] = Number.isNaN(n) ? String(f[k]).trim() : n; };
  const teks = k => { if (t(k) !== undefined) a[k] = t(k); };
  if (kelas === "sumur_bor") { num("kedalaman_m"); num("debit_lps"); for (const k of ["cat_kode", "zona_konservasi", "rekomendasi_bg", "pengelola"]) teks(k); }
  if (kelas === "jembatan_darurat") { a.jenis = f.jenis_darurat; num("bentang_m"); num("beban_ton"); teks("program"); }
  if (kelas === "jembatan_permanen") { if (t("jenis_permanen") !== undefined) a.jenis = t("jenis_permanen"); num("bentang_m"); teks("program"); }
  return a;
}
/* cek form sumur dan jembatan: aturan dasar sama dengan MEDAN_ASET server, atribut lewat cekAset (Q10: zona kritis atau rusak wajib rekomendasi_bg).
   Hasil {galat:[{medan, alasan}], badan}; medan = nama isian di form supaya fokus dan pesan menempel di isian itu */
export function cekFormAset(kelas, f, prov) {
  const g = [];
  if (!Object.hasOwn(NAMA_KELAS_ASET, kelas)) { tolak(g, "kelas", "Kelas aset tidak dikenal."); return {galat: g, badan: null}; }
  teksPanjang(g, "nama", f.nama, 2, 120, "Nama", true); teksPanjang(g, "pemilik_aset", f.pemilik_aset, 3, 120, "Pemilik aset", true);
  teksPanjang(g, "kab", f.kab, 1, 60, "Kabupaten", false); teksPanjang(g, "rujukan", f.rujukan, 1, 300, "Rujukan", false); teksPanjang(g, "kejadian", f.kejadian, 1, 120, "Kejadian", false);
  if (!SUMBER_ASET.some(([k]) => k === f.sumber)) tolak(g, "sumber", "Pilih sumber data dari daftar.");
  if (!KEYAKINAN_ASET.includes(f.keyakinan)) tolak(g, "keyakinan", "Pilih keyakinan dari daftar.");
  if (!/^\d{2}$/.test(String(prov ?? ""))) tolak(g, "nama", "Pilih provinsi di bilah konteks sebelum mencatat aset.");
  for (const [m, min, maks, nama] of [["lat", -11.5, 6.5, "Latitude"], ["lon", 94.5, 141.5, "Longitude"]]) if (ada(f[m])) { const n = angka(f[m]); if (!(n >= min && n <= maks)) tolak(g, m, `${nama} harus angka antara ${fmt(min)} dan ${fmt(maks)} (kotak Indonesia).`); }
  if (ada(f.lat) !== ada(f.lon)) tolak(g, ada(f.lat) ? "lon" : "lat", "Isi latitude dan longitude bersama, atau kosongkan keduanya.");
  const atribut = atributDari(kelas, f);
  for (const x of cekAset(kelas, atribut)) {
    const label = LABEL_MEDAN[x.medan] ?? x.medan, medan = x.medan === "jenis" ? (kelas === "jembatan_darurat" ? "jenis_darurat" : "jenis_permanen") : x.medan;
    tolak(g, medan, x.medan === "rekomendasi_bg" && x.pesan !== "wajib diisi" ? `${kapital(x.pesan)}.` : `${label} ${x.pesan === "wajib diisi" ? "wajib diisi" : x.pesan}.`);
  }
  /* BNPB tidak menyunting kondisi jembatan milik pihak lain tanpa rujukan sumber pemilik (PRD §9.4.11) */
  if (kelas.startsWith("jembatan") && f.sumber !== "bnpb_dsp" && !ada(f.rujukan)) tolak(g, "rujukan", "Jembatan milik pihak lain wajib bersumber: isi rujukan dari pemilik aset.");
  let rencana = null;
  if (kelas === "jembatan_darurat" && ada(f.rencana_ganti)) { rencana = Date.parse(`${f.rencana_ganti}T00:00:00+07:00`); if (!Number.isFinite(rencana) || rencana <= 0) tolak(g, "rencana_ganti", "Rencana ganti harus tanggal yang nyata."); }
  if (g.length) return {galat: g, badan: null};
  const b = {kelas, prov, nama: String(f.nama).trim(), pemilik_aset: String(f.pemilik_aset).trim(), sumber: f.sumber, keyakinan: f.keyakinan, atribut, status: "rencana"};
  for (const k of ["kab", "kejadian", "rujukan"]) if (ada(f[k])) b[k] = String(f[k]).trim();
  if (ada(f.lat)) { b.lat = angka(f.lat); b.lon = angka(f.lon); }
  if (rencana != null) b.rencana_ganti = rencana;
  return {galat: g, badan: b};
}
/* uji mutu: jenis mutu_air untuk aset kelas sumur; E. coli wajib angka 0 atau lebih (aturan server dan cekInspeksiStaf) */
export function cekFormMutu(sumur, f) {
  const s = sumur.find(x => x.id === f.sasaran_id);
  if (!s) return {galat: [{medan: "sasaran_id", alasan: "Pilih sumur dari daftar."}], badan: null};
  const row = {sasaran: "aset", id: s.id, kelas: KELAS_ASET[s.kelas], kode: s.kode, nama: s.nama}, nilai = {jenis: "mutu_air", skor: f.skor, e_coli_cfu: f.e_coli_cfu, temuan: f.temuan, tindakan: "tidak_ada"};
  const g = cekInspeksiStaf(row, nilai);
  return g.length ? {galat: g, badan: null} : {galat: [], badan: badanInspeksi(row, nilai)};
}
export function cekFormStatus(f) {
  const g = [];
  if (!STATUS_ASET.some(([k]) => k === f.status)) tolak(g, "status", "Pilih status dari daftar.");
  teksPanjang(g, "pemelihara", f.pemelihara, 3, 120, "Pemelihara", false); teksPanjang(g, "rujukan", f.rujukan, 1, 300, "Rujukan", false);
  return {galat: g, badan: g.length ? null : {status: f.status, pemelihara: ada(f.pemelihara) ? String(f.pemelihara).trim() : null, rujukan: ada(f.rujukan) ? String(f.rujukan).trim() : null}};
}

/* ---------- DOM bersama (dipakai tiga layar) ---------- */
export const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
export const pergi = jalur => { history.pushState(null, "", jalur + location.search); dispatchEvent(new PopStateEvent("popstate")); };
const kotakGalat = daftar => { const e = el("div", "ad-galat"); e.setAttribute("role", "alert"); const ul = el("ul"); daftar.forEach(g => ul.append(el("li", "", g))); e.append(ul); return e; };
/* galat per medan menempel di isian (aria-describedby), ringkasan di slot, fokus ke isian pertama yang salah */
export function tampilGalatForm(f, slot, galat_) {
  f.querySelectorAll("[aria-invalid]").forEach(x => x.removeAttribute("aria-invalid")); f.querySelectorAll(".sp-galat-medan").forEach(x => { x.textContent = ""; });
  for (const g of galat_) { const i = f.elements[g.medan]; i?.setAttribute("aria-invalid", "true"); const s = f.querySelector(`#g-${g.medan}`); if (s) s.textContent = g.alasan; }
  slot.replaceChildren(kotakGalat(galat_.map(g => g.alasan))); f.elements[galat_[0].medan]?.focus?.();
}
/* bukaFormKirim: dialog + submit; tombol mati seketika (INP) sebelum jaringan; sukses = tutup, pesan, muat ulang lewat panggilan balik */
export function bukaFormKirim({html, judul, cek, url, selesai, sesuaikan, sesudah, konteks}) {
  const w = el("div"); w.innerHTML = html;
  const f = w.firstElementChild, slot = f.querySelector(".sp-galat-slot"), tombol = f.querySelector("button[type=submit]");
  const d = bukaDialog(judul, f); d.classList.add("sp-lembar-dlg");
  if (sesuaikan) { f.addEventListener("change", () => sesuaikan(f)); sesuaikan(f); }
  f.addEventListener("submit", async e => {
    e.preventDefault(); if (tombol.disabled) return;
    const nilai = Object.fromEntries([...new FormData(f)].map(([k, v]) => [k, typeof v === "string" ? v : ""])), hasil = cek(nilai);
    if (hasil.galat.length) { tampilGalatForm(f, slot, hasil.galat); return; }
    tombol.disabled = true; tombol.setAttribute("aria-busy", "true"); slot.replaceChildren();
    try { await kirimPost(typeof url === "function" ? url(nilai) : url, hasil.badan); tutupDialog(); konteks.pesan?.(selesai); await sesudah?.(); }
    catch (er) { slot.replaceChildren(kotakGalat([er.message])); tombol.disabled = false; tombol.removeAttribute("aria-busy"); }
  });
  return d;
}
/* rekomendasi_bg hanya muncul di zona kritis atau rusak; bagian darurat atau permanen menyesuaikan kelas */
export function sesuaikanForm(f) {
  const z = f.elements.zona_konservasi?.value; const g = f.querySelector('[data-g="rekomendasi_bg"]'); if (g) g.hidden = !(z === "kritis" || z === "rusak");
  const k = f.elements.kelas?.value; if (k) { f.querySelectorAll('[data-g="darurat"]').forEach(x => { x.hidden = k !== "jembatan_darurat"; }); f.querySelectorAll('[data-g="permanen"]').forEach(x => { x.hidden = k !== "jembatan_permanen"; }); }
}
export function muatGaya() {
  return new Promise(ok => {
    if (document.querySelector('link[data-sp="aset"]')) return ok();
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/pipa/layar_aset.css?v=1"; l.dataset.sp = "aset";
    l.onload = l.onerror = () => ok(); document.head.append(l); setTimeout(ok, 1500);
  });
}

/* ================= layar rincian aset ================= */
let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

export async function pasang(akar, konteks) {
  pasangTanggal();
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset), tulis = peran === "W" || peran === "M", id = konteks.id;
  await muatGaya();
  const st = {d: null, tab: "inspeksi", kini: 0};
  akar.innerHTML = `<div id="sp-aset-isi"></div>`;
  const isi = akar.querySelector("#sp-aset-isi");
  if (!ID16.test(String(id ?? ""))) { isi.replaceChildren(galat(404, "Aset tidak ditemukan.")); return; }

  const kembali = a => a.kelas === "sumur_bor" || a.kelas === "pompa_sumur" ? ["/pipa/air", "Air tanah"] : a.kelas.startsWith("jembatan") ? ["/pipa/akses", "Akses"] : ["/pipa/pelihara", "Pemeliharaan"];
  const gambarTab = () => {
    if (sinyal.aborted || !st.d) return;
    const p = isi.querySelector("#sp-aset-panel"); if (p) p.innerHTML = isiTab(st.tab, st.d.aset, st.d.inspeksi);
  };
  const gambar = () => {
    if (sinyal.aborted || !st.d) return;
    const {aset, inspeksi} = st.d, j = jadwalAset(aset, inspeksi, st.kini), [href, nama] = kembali(aset), tab = tabUntuk(aset);
    if (!tab.some(([k]) => k === st.tab)) st.tab = "inspeksi";
    konteks.setPer?.(st.kini);
    document.title = `${aset.kode} | SIPPA | Centurisk97`;
    isi.innerHTML = `<p class="sp-kembali"><a class="sp-kit-kode" data-kembali href="${esc(href)}">Kembali ke ${esc(nama)}</a></p>${kepalaAsetHtml(aset)}${kartuAngkaHtml(j)}`
      + `<div class="ad-tabs" role="tablist" aria-label="Rincian aset">${tab.map(([k, n]) => `<button type="button" role="tab" id="sp-tab-${k}" data-tab="${k}" aria-selected="${k === st.tab}" aria-controls="sp-aset-panel" tabindex="${k === st.tab ? 0 : -1}">${esc(n)}</button>`).join("")}</div>`
      + `<section id="sp-aset-panel" class="sp-aset-panel" role="tabpanel" aria-labelledby="sp-tab-${st.tab}" tabindex="0">${isiTab(st.tab, aset, inspeksi)}</section>`
      + `<p class="ad-catat sp-sumber">Sumber: SIPPA D1 (sippa_aset, sippa_inspeksi), per ${esc(jamWIB(st.kini))}</p>`
      + (tulis ? `<div class="sp-aksi"><button type="button" class="ad-tombol" data-catat>Catat inspeksi</button><button type="button" class="ad-tombol" data-status>Ubah status</button></div>` : "");
  };
  let acMuat = null;
  const muat = async (senyap = false) => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    if (!senyap) isi.replaceChildren(memuat());
    try { const d = await konteks.ambil(`/api/sippa/aset/${id}`, ac.signal); if (ac.signal.aborted) return; st.d = d; st.kini = Date.now(); gambar(); }
    catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status === 404 ? "Aset tidak ditemukan di wilayahmu." : e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", () => muat())); }
  };
  const dialogInspeksi = () => {
    const a = st.d.aset, row = {sasaran: "aset", id: a.id, kelas: KELAS_ASET[a.kelas], kode: a.kode, nama: a.nama};
    bukaFormKirim({html: formInspeksiHtml(row), judul: `Catat inspeksi ${a.kode}`, url: "/api/sippa/inspeksi", konteks, selesai: "Inspeksi tersimpan.", sesudah: () => muat(true),
      cek: n => { const g = cekInspeksiStaf(row, n); return g.length ? {galat: g, badan: null} : {galat: [], badan: badanInspeksi(row, n)}; },
      sesuaikan: f => { for (const j of ["mutu_air", "uji_tekanan"]) { const x = f.querySelector(`[data-g="${j}"]`); if (x) x.hidden = f.elements.jenis.value !== j; } }});
  };
  akar.addEventListener("click", e => {
    const t = e.target, tb = t.closest("[data-tab]");
    if (tb) { st.tab = tb.dataset.tab; tb.parentElement.querySelectorAll("[data-tab]").forEach(b => { const on = b === tb; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }); isi.querySelector("#sp-aset-panel")?.setAttribute("aria-labelledby", `sp-tab-${st.tab}`); nanti(gambarTab); return; }
    if (t.closest("[data-catat]") && st.d) { dialogInspeksi(); return; }
    if (t.closest("[data-status]") && st.d) { bukaFormKirim({html: formStatusHtml(st.d.aset), judul: `Ubah status ${st.d.aset.kode}`, url: `/api/sippa/aset/${id}`, konteks, selesai: "Perubahan tersimpan.", sesudah: () => muat(true), cek: cekFormStatus}); return; }
    const k = t.closest("a[data-kembali]"); if (k && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(k.pathname); }
  }, {signal: sinyal});
  akar.addEventListener("keydown", e => {
    const tb = e.target.closest?.("[data-tab]"); if (!tb || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    const bs = [...tb.parentElement.querySelectorAll("[data-tab]")], n = bs[(bs.indexOf(tb) + (e.key === "ArrowRight" ? 1 : bs.length - 1)) % bs.length]; e.preventDefault(); n.focus(); n.click();
  }, {signal: sinyal});
  await muat();
}
